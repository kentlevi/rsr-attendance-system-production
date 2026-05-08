import { 
  collection, 
  onSnapshot, 
  getDocs,
  addDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { UndertimeRequest, UndertimeRequestModel } from '../models/UndertimeRequest';

export class UndertimeService {
  private requests: UndertimeRequest[] = [];
  private collectionPath = "undertime";
  private listeners: (() => void)[] = [];

  constructor() {
    this.subscribeToRequests();
  }

  private subscribeToRequests() {
    onSnapshot(collection(db, this.collectionPath), (snapshot) => {
      this.requests = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as UndertimeRequest));
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

  getAllRequests(): UndertimeRequestModel[] {
    return this.requests.map(r => new UndertimeRequestModel(r));
  }

  async addRequest(request: Omit<UndertimeRequest, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, this.collectionPath), request);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateRequest(id: string, data: Partial<UndertimeRequest>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }
}

export const undertimeService = new UndertimeService();
