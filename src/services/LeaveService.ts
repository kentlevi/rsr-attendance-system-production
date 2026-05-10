import { 
  collection, 
  onSnapshot, 
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  type QueryConstraint,
  Unsubscribe
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { LeaveRequest, LeaveRequestModel } from '../models/LeaveRequest';

export class LeaveService {
  private requests: LeaveRequest[] = [];
  private collectionPath = "leaves";
  private unsubscribe: Unsubscribe | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    // Eager subscription removed. Must call initializeForUser manually.
  }

  public initializeForUser(isAdmin: boolean, employeeId?: string) {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (!isAdmin && !employeeId) {
      return;
    }

    const constraints: QueryConstraint[] = [];
    if (!isAdmin && employeeId) {
       constraints.push(where('employeeId', '==', employeeId));
    }

    const logsQuery = query(collection(db, this.collectionPath), ...constraints);

    this.unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      this.requests = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as LeaveRequest));
      this.notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionPath);
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

  getAllRequests(): LeaveRequestModel[] {
    return this.requests.map(r => new LeaveRequestModel(r));
  }

  getRequestsByEmployee(employeeId: string): LeaveRequestModel[] {
    return this.requests.filter(r => r.employeeId === employeeId).map(r => new LeaveRequestModel(r));
  }

  async addRequest(request: Omit<LeaveRequest, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, this.collectionPath), request);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateRequest(id: string, data: Partial<LeaveRequest>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }
}

export const leaveService = new LeaveService();
