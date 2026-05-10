import { create } from 'zustand';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { attendanceService } from '../services/AttendanceService';
import { leaveService } from '../services/LeaveService';
import { employeeService } from '../services/EmployeeService';
import { facialRecognitionService } from '../services/FacialRecognitionService';
import { incidentService } from '../services/IncidentService';
import { settingsService } from '../services/SettingsService';
import { notificationService } from '../services/NotificationService';
import { smsService } from '../services/SmsService';
import { allowanceService } from '../services/AllowanceService';
import { undertimeService } from '../services/UndertimeService';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isEmployee: boolean;
  isLoading: boolean;
  init: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  isEmployee: false,
  isLoading: true,

  init: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      let isAdmin = false;
      let isEmployee = false;

      if (user) {
        try {
            const idTokenResult = await user.getIdTokenResult();
            if (idTokenResult.claims.role === 'admin') {
                isAdmin = true;
            } else if (idTokenResult.claims.role === 'employee') {
                isEmployee = true;
            } else {
                isAdmin = false;
                isEmployee = false;
            }
            
            attendanceService.initializeForUser(isAdmin, user.uid);
            leaveService.initializeForUser(isAdmin, user.uid);
            employeeService.initializeForUser(isAdmin, user.uid);
            incidentService.initializeForUser(isAdmin, user.uid);
            settingsService.initializeForUser(isAdmin, user.uid);
            notificationService.initializeForUser(isAdmin, user.uid);
            smsService.initializeForUser(isAdmin);
            allowanceService.initializeForUser(isAdmin, user.uid);
            undertimeService.initializeForUser(isAdmin, user.uid);

            if (isAdmin) {
               facialRecognitionService.initializeForAdmin();
            } else {
               facialRecognitionService.stopSubscription();
            }
        } catch(e) {
            console.error("Failed to read token claims", e);
            isAdmin = false;
            attendanceService.stopSubscription();
            leaveService.stopSubscription();
            employeeService.stopSubscription();
            facialRecognitionService.stopSubscription();
            incidentService.stopSubscription();
            settingsService.stopSubscription();
            notificationService.stopSubscription();
            smsService.stopSubscription();
            allowanceService.stopSubscription();
            undertimeService.stopSubscription();
        }
      } else {
        attendanceService.stopSubscription();
        leaveService.stopSubscription();
        employeeService.stopSubscription();
        facialRecognitionService.stopSubscription();
        incidentService.stopSubscription();
        settingsService.stopSubscription();
        notificationService.stopSubscription();
        smsService.stopSubscription();
        allowanceService.stopSubscription();
        undertimeService.stopSubscription();
      }
      
      set({ 
        user, 
        isAdmin,
        isEmployee,
        isLoading: false 
      });
    });

    return unsubscribe;
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      attendanceService.stopSubscription();
      leaveService.stopSubscription();
      employeeService.stopSubscription();
      facialRecognitionService.stopSubscription();
      incidentService.stopSubscription();
      settingsService.stopSubscription();
      notificationService.stopSubscription();
      smsService.stopSubscription();
      allowanceService.stopSubscription();
      undertimeService.stopSubscription();
      await firebaseSignOut(auth);
      set({ user: null, isAdmin: false, isEmployee: false, isLoading: false });
    } catch (error) {
      console.error("Sign out error", error);
      set({ isLoading: false });
    }
  }
}));
