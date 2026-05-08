import { create } from 'zustand';
import { collection, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Employee, EmployeeModel } from '../models/Employee';

interface EmployeeState {
  employees: EmployeeModel[];
  isLoading: boolean;
  error: string | null;
  subscribeToEmployees: () => () => void;
  getEmployeeById: (id: string) => Promise<EmployeeModel | null>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  isLoading: true,
  error: null,

  subscribeToEmployees: () => {
    set({ isLoading: true });
    const unsubscribe = onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        const employees = snapshot.docs.map(doc => new EmployeeModel({
          ...doc.data(),
          id: doc.id
        } as Employee));
        set({ employees, isLoading: false, error: null });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'employees');
        set({ error: error.message, isLoading: false });
      }
    );
    return unsubscribe;
  },

  getEmployeeById: async (id) => {
    try {
      const docSnap = await getDoc(doc(db, 'employees', id));
      if (docSnap.exists()) {
        return new EmployeeModel({ ...docSnap.data(), id: docSnap.id } as Employee);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `employees/${id}`);
    }
    return null;
  },

  addEmployee: async (employee) => {
    try {
      await addDoc(collection(db, 'employees'), employee);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'employees');
    }
  },

  updateEmployee: async (id, data) => {
    try {
      await updateDoc(doc(db, 'employees', id), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `employees/${id}`);
    }
  },

  deleteEmployee: async (id) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `employees/${id}`);
    }
  }
}));
