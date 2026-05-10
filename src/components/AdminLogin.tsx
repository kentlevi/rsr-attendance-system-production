import React, { useState } from 'react';
import { Eye, EyeOff, User } from 'lucide-react';
import { PageLayout } from './layout/PageLayout';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '../context/ToastContext';

interface AdminLoginProps {
  onNavigate: (view: 'welcome' | 'employee' | 'admin' | 'adminLogin' | 'timeclock') => void;
}

export default function AdminLogin({ onNavigate }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [isAssistant, setIsAssistant] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    const emailToUse = isAssistant ? "hr@rsr.com" : "admin@rsr.com";
    const usernameToUse = isAssistant ? "assistant" : "admin";
    
    let firebasePassword = password;
    if (firebasePassword.length < 6) {
      firebasePassword = firebasePassword.padEnd(6, '0');
    }

    try {
      try {
        await signInWithEmailAndPassword(auth, emailToUse, firebasePassword);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            const defaultFirebasePass = usernameToUse.padEnd(6, '0');
            // Check if we can rescue the account because they typed their correct new password
            // but Firebase Auth is stuck on the default password.
            if (password.trim() !== (isAssistant ? "assistant" : "admin")) {
                try {
                    // Sign in with default password
                    await signInWithEmailAndPassword(auth, emailToUse, defaultFirebasePass);
                    // Now we are logged in! We can read adminAccounts to verify the password they typed.
                    const { adminAccountService } = await import('../services/AdminAccountService');
                    const account = await adminAccountService.getAccount(usernameToUse, null as any);
                    
                    if (account && password.trim() === account.password) {
                        // The password they typed IS correct according to Firestore!
                        // Let's fix Firebase Auth password.
                        const { updatePassword: updateFirebaseAuthPassword } = await import('firebase/auth');
                        if (auth.currentUser) {
                           await updateFirebaseAuthPassword(auth.currentUser, firebasePassword);
                        }
                    } else {
                        // Not correct in Firestore either. Sign out and throw.
                        await auth.signOut();
                        throw new Error("Invalid credentials");
                    }
                } catch (rescueErr) {
                    throw new Error("Invalid credentials");
                }
            } else {
                // They typed the default password. Let's try to create if it doesn't exist.
                try {
                    const { createUserWithEmailAndPassword } = await import('firebase/auth');
                    await createUserWithEmailAndPassword(auth, emailToUse, firebasePassword);
                } catch (createErr: any) {
                    throw new Error("Invalid credentials");
                }
            }
        } else {
          throw err;
        }
      }
      
      const { adminAccountService } = await import('../services/AdminAccountService');
      const account = await adminAccountService.getAccount(usernameToUse, {
        fullName: isAssistant ? "Assistant" : "Administrator",
        username: usernameToUse,
        email: emailToUse,
        department: "Administration",
        mobile: "",
        position: isAssistant ? "HR Assistant" : "System Administrator",
        gender: "Any",
        dateRegistered: new Date().toISOString(),
        address: "",
        lastLogin: "",
        timezone: "(GMT+08:00) Asia/Manila",
        role: isAssistant ? "Assistant" : "Administrator",
        avatar: "https://i.pravatar.cc/150",
        password: password.trim(),
      });

      showToast("Login successful!", "success");
      onNavigate('admin');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/operation-not-allowed') {
         setLoginError("Email/Password Auth is disabled! Please enable it in Firebase Console.");
      } else {
         setLoginError("Invalid credentials. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <PageLayout onNavigate={onNavigate as any} className="items-center justify-center sm:justify-start py-6 sm:py-12 px-4 sm:px-6">
      <div className="w-full max-w-[420px] mx-auto bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-10 border border-border/60 flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-[68px] h-[68px] rounded-full bg-[#E8F3EE] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#0B7A4B]">
              <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill="#E8F3EE" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="9.5" y="11.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="2" fill="white"/>
              <path d="M10 11.5V10C10 8.89543 10.8954 8 12 8C13.1046 8 14 8.89543 14 10V11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-[28px] font-bold text-text-primary">System Access</h1>
          <p className="text-[16px] text-text-secondary text-center">Sign in using your master password.</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex bg-slate-100 p-1.5 rounded-xl mb-2">
            <button
              type="button"
              onClick={() => { setIsAssistant(false); setLoginError(""); }}
              className={`flex-1 py-3 text-[15px] font-semibold rounded-lg transition-all ${
                !isAssistant ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Administrator
            </button>
            <button
              type="button"
              onClick={() => { setIsAssistant(true); setLoginError(""); }}
              className={`flex-1 py-3 text-[15px] font-semibold rounded-lg transition-all ${
                isAssistant ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Assistant
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-[16px] font-medium text-text-primary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder="Enter password"
                className={`control-field h-12 px-4 pr-12 ${
                  loginError ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-border"
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            {loginError && (
              <p className="text-[14px] font-medium text-red-600">
                {loginError}
              </p>
            )}
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoggingIn ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
