import { create } from 'zustand';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AttendanceLog, AttendanceLogModel } from '../models/AttendanceLog';

const LIVE_ATTENDANCE_WINDOW_DAYS = 31;

const getISODateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

interface AttendanceState {
  logs: AttendanceLogModel[];
  isLoading: boolean;
  error: string | null;
  subscribeToLogs: () => () => void;
  addLog: (log: Omit<AttendanceLog, 'id'>) => Promise<void>;
  updateLog: (id: string, data: Partial<AttendanceLog>) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  logs: [],
  isLoading: true,
  error: null,

  subscribeToLogs: () => {
    set({ isLoading: true });
    const startDate = getISODateDaysAgo(LIVE_ATTENDANCE_WINDOW_DAYS);
    const unsubscribe = onSnapshot(
      query(collection(db, 'attendance'), where('date', '>=', startDate)),
      (snapshot) => {
        const logs = snapshot.docs.map(doc => new AttendanceLogModel({
          ...doc.data(),
          id: doc.id
        } as AttendanceLog));
        set({ logs, isLoading: false, error: null });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
        set({ error: error.message, isLoading: false });
      }
    );
    return unsubscribe;
  },

  addLog: async (log) => {
    try {
      await addDoc(collection(db, 'attendance'), log);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'attendance');
    }
  },

  updateLog: async (id, data) => {
    try {
      await updateDoc(doc(db, 'attendance', id), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `attendance/${id}`);
    }
  }
}));
