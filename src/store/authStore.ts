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
import { setReadOnlyOffline } from '../lib/readOnlyMode';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isEmployee: boolean;
  isOfflineAdmin: boolean;
  isLoading: boolean;
  init: () => () => void;
  setOfflineAdmin: (active: boolean) => void;
  signOut: () => Promise<void>;
}

const OFFLINE_ADMIN_KEY = 'rsr_admin_offline_session';

const hasOfflineAdminSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(OFFLINE_ADMIN_KEY) === '1';
  } catch {
    return false;
  }
};

// Sync the module-level read-only flag with any pre-existing offline session
// (e.g. user reloaded the page while offline).
setReadOnlyOffline(hasOfflineAdminSession());

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: hasOfflineAdminSession(),
  isEmployee: false,
  isOfflineAdmin: hasOfflineAdminSession(),
  isLoading: true,

  setOfflineAdmin: (active: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        if (active) sessionStorage.setItem(OFFLINE_ADMIN_KEY, '1');
        else sessionStorage.removeItem(OFFLINE_ADMIN_KEY);
      } catch {
        // ignore
      }
    }
    // Service mutations check this flag to short-circuit before issuing
    // doomed Firestore writes.
    setReadOnlyOffline(active);
    // When activating: flip isAdmin true so the App's navigation guard accepts /admin.
    // When deactivating: leave isAdmin alone — Firebase Auth's onAuthStateChanged
    // is the source of truth in the online path and will set it independently.
    set((state) => ({
      isOfflineAdmin: active,
      isAdmin: active ? true : state.isAdmin,
      isLoading: false,
    }));
  },

  init: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If we already authenticated offline via cached credentials, don't let a
      // null Firebase Auth state knock us back to the login screen. The offline
      // session is the source of truth until the user explicitly signs out.
      const offlineActive = hasOfflineAdminSession();
      let isAdmin = offlineActive;
      let isEmployee = false;

      if (user) {
        try {
            const idTokenResult = await user.getIdTokenResult();
            const isAdminEmail = user.email === 'admin@rsr.com' ||
                                user.email === 'hr@rsr.com' ||
                                user.email === 'admin@rsrengineering.com' ||
                                user.email === 'hr@rsrengineering.com';

            let employeeId: string | undefined;

            if (idTokenResult.claims.role === 'admin' || isAdminEmail) {
                isAdmin = true;
            } else if (idTokenResult.claims.role === 'employee') {
                isEmployee = true;
            } else if (user.email) {
                // Look up the user's email in the employees collection. This makes any
                // registered employee able to sign in via the employee portal regardless
                // of email domain (e.g. gmail.com), without needing a backend to set
                // Firebase Auth custom claims.
                try {
                    const empModel = await employeeService.getEmployeeByEmail(user.email);
                    if (empModel) {
                        isEmployee = true;
                        employeeId = empModel.data.id;
                    }
                } catch (lookupErr) {
                    console.warn('Employee lookup by email failed; treating user as unauthenticated.', lookupErr);
                }
            }

            // Only subscribe to data the user is authorized for. For users that are
            // neither admin nor employee we stop all subscriptions so we don't trigger
            // permission-denied storms.
            if (isAdmin || isEmployee) {
                const scopeId = employeeId || user.uid;
                attendanceService.initializeForUser(isAdmin, scopeId);
                leaveService.initializeForUser(isAdmin, scopeId);
                employeeService.initializeForUser(isAdmin, scopeId);
                incidentService.initializeForUser(isAdmin, scopeId);
                settingsService.initializeForUser(isAdmin, scopeId);
                notificationService.initializeForUser(isAdmin, scopeId);
                smsService.initializeForUser(isAdmin);
                allowanceService.initializeForUser(isAdmin, scopeId);
                undertimeService.initializeForUser(isAdmin, scopeId);

                if (isAdmin) {
                   facialRecognitionService.initializeForAdmin();
                } else {
                   facialRecognitionService.stopSubscription();
                }
            } else {
                console.warn('Signed-in user is neither admin nor a registered employee. Skipping subscriptions.', user.email);
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
      
      const stillOffline = offlineActive && !user;
      setReadOnlyOffline(stillOffline);
      set({
        user,
        isAdmin,
        isEmployee,
        isOfflineAdmin: stillOffline,
        isLoading: false,
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
      if (typeof window !== 'undefined') {
        try { sessionStorage.removeItem(OFFLINE_ADMIN_KEY); } catch { /* ignore */ }
      }
      setReadOnlyOffline(false);
      set({ user: null, isAdmin: false, isEmployee: false, isOfflineAdmin: false, isLoading: false });
    } catch (error) {
      console.error("Sign out error", error);
      set({ isLoading: false });
    }
  }
}));
