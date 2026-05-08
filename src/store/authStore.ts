import { create } from 'zustand';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  init: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  isLoading: true,

  init: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Basic check for admin (we can expand this with custom claims or Firestore role check later if needed)
      const isAdmin = user !== null; // In this app context, if you are signed in to Firebase Auth, you are an admin
      
      set({ 
        user, 
        isAdmin,
        isLoading: false 
      });
    });

    return unsubscribe;
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await firebaseSignOut(auth);
      set({ user: null, isAdmin: false, isLoading: false });
    } catch (error) {
      console.error("Sign out error", error);
      set({ isLoading: false });
    }
  }
}));
