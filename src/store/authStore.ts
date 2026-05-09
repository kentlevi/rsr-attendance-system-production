import { create } from 'zustand';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

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
                // If checking by email or standard login, default to admin if not specified
                isAdmin = true; 
            }
        } catch(e) {
            isAdmin = true;
        }
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
      await firebaseSignOut(auth);
      set({ user: null, isAdmin: false, isEmployee: false, isLoading: false });
    } catch (error) {
      console.error("Sign out error", error);
      set({ isLoading: false });
    }
  }
}));
