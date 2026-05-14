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
import { UndertimeRequest, UndertimeRequestModel } from '../models/UndertimeRequest';

export class UndertimeService {
  private requests: UndertimeRequest[] = [];
  private collectionPath = "undertime";
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
      } as UndertimeRequest));
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

  getAllRequests(): UndertimeRequestModel[] {
    return this.requests.map(r => new UndertimeRequestModel(r));
  }

  async addRequest(request: Omit<UndertimeRequest, 'id'>): Promise<void> {
    assertWritable("submitting an undertime request");
    try {
      await addDoc(collection(db, this.collectionPath), request);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateRequest(id: string, data: Partial<UndertimeRequest>): Promise<void> {
    assertWritable("updating an undertime request");
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }
}

export const undertimeService = new UndertimeService();
