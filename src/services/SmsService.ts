import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy,
  getDocs
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../lib/firebase";

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
  private collectionPath = "sms_logs";

  subscribe(callback: (logs: SmsLog[]) => void) {
    const q = query(collection(db, this.collectionPath), orderBy("sentAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as SmsLog));
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionPath);
    });
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
