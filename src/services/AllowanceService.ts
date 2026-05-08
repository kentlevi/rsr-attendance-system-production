import { 
  collection, 
  onSnapshot, 
  addDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { AllowanceRecord, AllowanceRecordModel } from '../models/AllowanceRecord';

export class AllowanceService {
  private records: AllowanceRecord[] = [];
  private collectionPath = "allowances";
  private listeners: (() => void)[] = [];

  constructor() {
    this.subscribeToRecords();
  }

  private subscribeToRecords() {
    onSnapshot(collection(db, this.collectionPath), (snapshot) => {
      this.records = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as AllowanceRecord));
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

  getAllRecords(): AllowanceRecordModel[] {
    return this.records.map(r => new AllowanceRecordModel(r));
  }

  async addRecord(record: Omit<AllowanceRecord, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, this.collectionPath), record);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateRecord(id: string, data: Partial<AllowanceRecord>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }
}

export const allowanceService = new AllowanceService();
