import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  onSnapshot
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../lib/firebase";

export interface IncidentReport {
  id: string;
  data: {
    employeeId: string;
    type: 'Infraction' | 'Accident' | 'Merit' | 'Other';
    date: string;
    title: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High';
    acknowledged: boolean;
    acknowledgedAt?: string;
    createdBy: string;
    createdAt: string;
  }
}

class IncidentService {
  private incidents: IncidentReport[] = [];
  private collectionPath = "incidents";
  private unsubscribe: (() => void) | null = null;
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

    const constraints: any[] = [];
    if (!isAdmin && employeeId) {
       constraints.push(query(collection(db, this.collectionPath), require("firebase/firestore").where('employeeId', '==', employeeId)));
    } else {
       constraints.push(query(collection(db, this.collectionPath)));
    }

    this.unsubscribe = onSnapshot(constraints[0], (snapshot: any) => {
      this.incidents = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        data: doc.data() as any
      }));
      this.notifyListeners();
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionPath);
    });
  }

  public stopSubscription() {
     if (this.unsubscribe) {
         this.unsubscribe();
         this.unsubscribe = null;
     }
  }

  getAll() {
    return this.incidents;
  }

  getIncidentsForEmployee(employeeId: string) {
    return this.incidents.filter(i => i.data.employeeId === employeeId);
  }

  getUnacknowledgedIncidents(employeeId: string) {
    return this.getIncidentsForEmployee(employeeId).filter(i => !i.data.acknowledged);
  }

  async add(data: Omit<IncidentReport['data'], 'id'>) {
    try {
      const docRef = await addDoc(collection(db, this.collectionPath), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, this.collectionPath);
      throw error;
    }
  }

  async acknowledgeIncident(id: string) {
    try {
      await updateDoc(doc(db, this.collectionPath, id), {
        acknowledged: true,
        acknowledgedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.collectionPath}/${id}`);
      throw error;
    }
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}

export const incidentService = new IncidentService();
