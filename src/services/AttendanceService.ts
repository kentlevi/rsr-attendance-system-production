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
  type QueryConstraint
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
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

  private listeners: (() => void)[] = [];

  constructor() {
    this.subscribeToRecentLogs();
  }

  private subscribeToRecentLogs(days = LIVE_ATTENDANCE_WINDOW_DAYS) {
    const startDate = getISODateDaysAgo(days);
    const recentLogsQuery = query(
      collection(db, this.collectionPath),
      where('date', '>=', startDate),
    );

    onSnapshot(recentLogsQuery, (snapshot) => {
      this.logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as AttendanceLog));
      this.notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionPath);
    });
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

  async loadRecentLogs(days = LIVE_ATTENDANCE_WINDOW_DAYS): Promise<AttendanceLogModel[]> {
    const startDate = getISODateDaysAgo(days);

    return this.loadLogsByDateRange(startDate);
  }

  async loadLogsByDateRange(fromDate: string, toDate?: string): Promise<AttendanceLogModel[]> {
    try {
      const constraints: QueryConstraint[] = [where('date', '>=', fromDate)];
      if (toDate) constraints.push(where('date', '<=', toDate));

      const logsQuery = query(collection(db, this.collectionPath), ...constraints);
      const querySnapshot = await getDocs(logsQuery);
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

  async refreshLogsByDates(dates: string[]): Promise<AttendanceLogModel[]> {
    const uniqueDates = Array.from(new Set(dates.filter(Boolean)));
    if (uniqueDates.length === 0) return this.getAllLogs();

    try {
      const refreshedLogs: AttendanceLog[] = [];

      for (const date of uniqueDates) {
        const q = query(collection(db, this.collectionPath), where('date', '==', date));
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
      handleFirestoreError(e, OperationType.LIST, `${this.collectionPath}/date-refresh`);
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
      await addDoc(collection(db, this.collectionPath), log);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateLog(id: string, data: Partial<AttendanceLog>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, data);
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
