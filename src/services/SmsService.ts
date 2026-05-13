import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy,
  getDocs,
  Unsubscribe
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError, logFirestoreError } from "../lib/firebase";

export interface SmsLog {
  id: string;
  name: string;
  phone: string;
  preview: string;
  status: "Delivered" | "Failed" | "Pending";
  sentAt: string;
  employeeId?: string;
}

class SmsService {
  private logs: SmsLog[] = [];
  private collectionPath = "sms_logs";
  private unsubscribe: Unsubscribe | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    // Eager subscription removed. Must call initializeForUser manually.
  }

  public initializeForUser(isAdmin: boolean) {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (!isAdmin) {
      return; // SMS logs are admin-only
    }

    const q = query(collection(db, this.collectionPath), orderBy("sentAt", "desc"));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as SmsLog));
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

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  getAllLogsSync() {
    return this.logs;
  }

  async addLog(log: Omit<SmsLog, "id">) {
    try {
      await addDoc(collection(db, this.collectionPath), log);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async getAllLogs(): Promise<SmsLog[]> {
    try {
      const q = query(collection(db, this.collectionPath), orderBy("sentAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as SmsLog));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, this.collectionPath);
      return [];
    }
  }
}

export const smsService = new SmsService();
