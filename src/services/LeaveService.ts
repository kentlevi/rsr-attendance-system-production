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
import { db, OperationType, handleFirestoreError, logFirestoreError } from '../lib/firebase';
import { assertWritable } from '../lib/readOnlyMode';
import { LeaveRequest, LeaveRequestModel } from '../models/LeaveRequest';
import { notificationService } from './NotificationService';
import { employeeService } from './EmployeeService';

export class LeaveService {
  private requests: LeaveRequest[] = [];
  private collectionPath = "leaves";
  private unsubscribe: Unsubscribe | null = null;
  private listeners: (() => void)[] = [];
  private hasRetried = false;

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
      const retry = this.hasRetried ? undefined : () => {
        this.hasRetried = true;
        this.initializeForUser(isAdmin, employeeId);
      };
      logFirestoreError(error, OperationType.LIST, this.collectionPath, retry);
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
    assertWritable("filing a leave request");
    try {
      await addDoc(collection(db, this.collectionPath), request);
      
      // Notify via Telegram
      const emp = employeeService.getEmployeeByIdSync(request.employeeId);
      const empName = emp?.data.name || 'An employee';
      await notificationService.sendTelegramNotification(
        `<b>📝 New Leave Request</b>\n\n` +
        `<b>Employee:</b> ${empName}\n` +
        `<b>Type:</b> ${request.type}\n` +
        `<b>Period:</b> ${request.startDate} to ${request.endDate}\n` +
        `<b>Reason:</b> ${request.reason}`
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateRequest(id: string, data: Partial<LeaveRequest>): Promise<void> {
    assertWritable("approving / rejecting a leave request");
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }
}

export const leaveService = new LeaveService();
