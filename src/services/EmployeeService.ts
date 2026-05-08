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
import { Employee, EmployeeModel } from "../models/Employee";
import { calculateLeaveReplenishment } from "../lib/LeaveReplenishmentRules";

class EmployeeService {
  private employees: Employee[] = [];
  private collectionPath = "employees";
  private replenishmentTimer: number | null = null;

  private listeners: (() => void)[] = [];

  constructor() {
    this.subscribeToEmployees();
  }

  private subscribeToEmployees() {
    onSnapshot(collection(db, this.collectionPath), (snapshot) => {
      this.employees = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Employee));
      this.notifyListeners();
      void this.processLeaveReplenishment();
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
    const emp = this.employees.find((e) => e.id === id);
    return emp ? new EmployeeModel(emp) : null;
  }

  async getEmployeeById(id: string): Promise<EmployeeModel | null> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return new EmployeeModel({ ...docSnap.data(), id: docSnap.id } as Employee);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `${this.collectionPath}/${id}`);
    }
    return null;
  }

  async addEmployee(employee: Omit<Employee, "id">): Promise<void> {
    try {
      await addDoc(collection(db, this.collectionPath), employee);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await deleteDoc(docRef);
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
