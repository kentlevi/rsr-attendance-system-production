import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  deleteField,
  updateDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { AttendanceLog, AttendanceLogModel } from '../models/AttendanceLog';

export class AttendanceService {
  private logs: AttendanceLog[] = [];
  private collectionPath = "attendance";

  private listeners: (() => void)[] = [];

  constructor() {
    this.subscribeToLogs();
  }

  private subscribeToLogs() {
    onSnapshot(collection(db, this.collectionPath), (snapshot) => {
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
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionPath));
      this.logs = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as AttendanceLog));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, this.collectionPath);
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
