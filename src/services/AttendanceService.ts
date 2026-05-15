import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteField,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type QueryConstraint,
  Unsubscribe
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, logFirestoreError, trackFirestoreUsage } from '../lib/firebase';
import { AttendanceLog, AttendanceLogModel } from '../models/AttendanceLog';

const LIVE_ATTENDANCE_WINDOW_DAYS = 31;

const toISODate = (date: Date): string => date.toISOString().slice(0, 10);

const getISODateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISODate(date);
};

export class AttendanceService {
  private logs: AttendanceLog[] = [];
  private collectionPath = "attendance";
  private unsubscribe: Unsubscribe | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    // Eager subscription removed. Must call initializeForUser manually.
  }

  public initializeForUser(isAdmin: boolean, employeeId?: string, days = LIVE_ATTENDANCE_WINDOW_DAYS) {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (!isAdmin && !employeeId) {
      return; // Not authenticated or invalid role setup
    }

    const startDate = getISODateDaysAgo(days);
    const constraints: QueryConstraint[] = [where('date', '>=', startDate)];
    
    // Normal employees can only read to their own logs
    if (!isAdmin && employeeId) {
       constraints.push(where('employeeId', '==', employeeId));
    }

    const recentLogsQuery = query(collection(db, this.collectionPath), ...constraints);

    this.unsubscribe = onSnapshot(recentLogsQuery, (snapshot) => {
      const count = typeof snapshot.docChanges === 'function' ? snapshot.docChanges().length : (snapshot.docs?.length || 1);
      trackFirestoreUsage(OperationType.LIST, count);
      this.logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as AttendanceLog));
      this.notifyListeners();
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, this.collectionPath);
    });
  }

  public stopSubscription() {
     if (this.unsubscribe) {
         this.unsubscribe();
         this.unsubscribe = null;
     }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  async loadAllLogs(): Promise<AttendanceLogModel[]> {
    return this.loadRecentLogs();
  }

  async loadRecentLogs(days = LIVE_ATTENDANCE_WINDOW_DAYS, isAdmin = true, employeeId?: string): Promise<AttendanceLogModel[]> {
    const startDate = getISODateDaysAgo(days);
    return this.loadLogsByDateRange(startDate, undefined, isAdmin, employeeId);
  }

  async loadLogsByDateRange(fromDate: string, toDate?: string, isAdmin = true, employeeId?: string): Promise<AttendanceLogModel[]> {
    try {
      const constraints: QueryConstraint[] = [where('date', '>=', fromDate)];
      if (toDate) constraints.push(where('date', '<=', toDate));
      
      if (!isAdmin && employeeId) {
        constraints.push(where('employeeId', '==', employeeId));
      }

      const logsQuery = query(collection(db, this.collectionPath), ...constraints);
      const querySnapshot = await getDocs(logsQuery);
      trackFirestoreUsage(OperationType.LIST, querySnapshot.size);
      this.logs = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as AttendanceLog));
      this.notifyListeners();
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, this.collectionPath);
    }
    return this.getAllLogs();
  }

  async refreshLogsByDates(dates: string[], isAdmin = true, employeeId?: string): Promise<AttendanceLogModel[]> {
    const uniqueDates = Array.from(new Set(dates.filter(Boolean)));
    if (uniqueDates.length === 0) return this.getAllLogs();

    try {
      const refreshedLogs: AttendanceLog[] = [];

      for (const date of uniqueDates) {
        const constraints: QueryConstraint[] = [where('date', '==', date)];
        if (!isAdmin && employeeId) constraints.push(where('employeeId', '==', employeeId));

        const q = query(collection(db, this.collectionPath), ...constraints);
        const querySnapshot = await getDocs(q);
        refreshedLogs.push(...querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as AttendanceLog)));
      }

      const refreshedIds = new Set(refreshedLogs.map((log) => log.id));
      const refreshedDateSet = new Set(uniqueDates);
      this.logs = [
        ...this.logs.filter((log) => !refreshedIds.has(log.id) && !refreshedDateSet.has(log.date)),
        ...refreshedLogs,
      ];
      this.notifyListeners();
    } catch (e) {
      // If unauthenticated or restricted, we might get a permission error during background sync
      // We log it but don't crash the sync process
      console.warn('AttendanceService: Could not refresh logs by dates (likely permission restriction)', e);
    }

    return this.getAllLogs();
  }

  getLogsByEmployeeId(employeeId: string): AttendanceLogModel[] {
    return this.logs.filter(l => l.employeeId === employeeId).map(l => new AttendanceLogModel(l));
  }

  getAllLogs(): AttendanceLogModel[] {
    return this.logs.map(l => new AttendanceLogModel(l));
  }

  async addLog(log: Omit<AttendanceLog, 'id'>): Promise<void> {
    try {
      // serverReceivedAt is stamped by Firestore so admins can detect clock drift
      // on the punching device (compare to the device-time `timestamp` field).
      // Cast keeps the typed model surface free of FieldValue.
      await addDoc(collection(db, this.collectionPath), {
        ...log,
        serverReceivedAt: serverTimestamp(),
      } as any);
      trackFirestoreUsage(OperationType.CREATE);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateLog(id: string, data: Partial<AttendanceLog>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, {
        ...data,
        serverReceivedAt: serverTimestamp(),
      } as any);
      trackFirestoreUsage(OperationType.UPDATE);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }

  async clearLogPhotos(
    id: string,
    fields: ("imageIn" | "imageOut")[] = ["imageIn", "imageOut"],
  ): Promise<void> {
    try {
      const updates = fields.reduce<Record<string, ReturnType<typeof deleteField>>>(
        (acc, field) => ({ ...acc, [field]: deleteField() }),
        {},
      );
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }
}

// Singleton export
export const attendanceService = new AttendanceService();

