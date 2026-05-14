import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  type QueryConstraint,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { auth, db, OperationType, handleFirestoreError, logFirestoreError } from "../lib/firebase";
import { assertWritable } from "../lib/readOnlyMode";
import { Employee, EmployeeModel } from "../models/Employee";
import { calculateLeaveReplenishment } from "../lib/LeaveReplenishmentRules";

class EmployeeService {
  private employees: Employee[] = [];
  private collectionPath = "employees";
  private replenishmentTimer: number | null = null;
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
       constraints.push(where('id', '==', employeeId));
    }

    const logsQuery = query(collection(db, this.collectionPath), ...constraints);

    this.unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      this.employees = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Employee));
      this.notifyListeners();
      void this.processLeaveReplenishment();
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

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  // Returns currently cached employees immediately (useful for sync renders)
  getAllEmployeesSync(): EmployeeModel[] {
    return this.employees.map((e) => new EmployeeModel(e));
  }

  // Fetches from backend (now Firestore)
  async loadEmployees(): Promise<EmployeeModel[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionPath));
      this.employees = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Employee));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, this.collectionPath);
    }
    return this.getAllEmployeesSync();
  }

  getEmployeeByIdSync(id: string): EmployeeModel | null {
    // Prefer the canonical Firestore doc id over the human-readable `employeeId` field.
    // Two rows can share an `employeeId` value (we now block that on create, but legacy
    // data may already have duplicates) — doc id is unique by definition.
    const byDocId = this.employees.find((e) => e.id === id);
    const emp = byDocId ?? this.employees.find((e) => e.employeeId === id);
    return emp ? new EmployeeModel(emp) : null;
  }

  async getEmployeeByEmail(email: string): Promise<EmployeeModel | null> {
    try {
      const q = query(collection(db, this.collectionPath), where("email", "==", email.trim()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        return new EmployeeModel({ ...firstDoc.data(), id: firstDoc.id } as Employee);
      }
    } catch (e) {
      // Don't throw — this is called during auth bootstrap where a permission-denied
      // simply means "this user is not a recognized employee".
      logFirestoreError(e, OperationType.GET, `${this.collectionPath}/email/${email}`);
    }
    return null;
  }

  async getEmployeeById(id: string): Promise<EmployeeModel | null> {
    try {
      // 1. Try fetching by document ID
      const docRef = doc(db, this.collectionPath, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return new EmployeeModel({ ...docSnap.data(), id: docSnap.id } as Employee);
      }

      // 2. Try fetching by human-readable employeeId field
      const q = query(collection(db, this.collectionPath), where("employeeId", "==", id));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        return new EmployeeModel({ ...firstDoc.data(), id: firstDoc.id } as Employee);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `${this.collectionPath}/${id}`);
    }
    return null;
  }

  async addEmployee(employee: Employee): Promise<void> {
    assertWritable("adding an employee");
    try {
      if (employee.id) {
        await setDoc(doc(db, this.collectionPath, employee.id), employee);
      } else {
        const docRef = await addDoc(collection(db, this.collectionPath), employee);
        employee.id = docRef.id;
      }

      // Update local cache manually just in case subscription is slow
      this.employees = [...this.employees.filter(e => e.id !== employee.id), employee];
      this.notifyListeners();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
    assertWritable("editing an employee");
    try {
      await updateDoc(doc(db, this.collectionPath, id), data);

      // Update local cache manually
      const index = this.employees.findIndex(e => e.id === id);
      if (index !== -1) {
        this.employees[index] = { ...this.employees[index], ...data };
        this.notifyListeners();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    assertWritable("deleting an employee");
    try {
      await deleteDoc(doc(db, this.collectionPath, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${this.collectionPath}/${id}`);
    }
  }

  async processLeaveReplenishment(today = new Date().toISOString().slice(0, 10)): Promise<void> {
    for (const employee of this.employees) {
      const replenishment = calculateLeaveReplenishment(employee, today);
      if (!replenishment.shouldUpdate || !replenishment.update) continue;

      await this.updateEmployee(employee.id, replenishment.update);
    }
  }

  startLeaveReplenishmentScheduler(): void {
    this.stopLeaveReplenishmentScheduler();
    this.processLeaveReplenishment();

    const scheduleNextRun = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(now.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);
      const delay = nextMidnight.getTime() - now.getTime();

      this.replenishmentTimer = window.setTimeout(async () => {
        await this.processLeaveReplenishment();
        scheduleNextRun();
      }, delay);
    };

    scheduleNextRun();
  }

  stopLeaveReplenishmentScheduler(): void {
    if (this.replenishmentTimer) {
      clearTimeout(this.replenishmentTimer);
      this.replenishmentTimer = null;
    }
  }
}

// Singleton export
export const employeeService = new EmployeeService();
