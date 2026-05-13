import React, { useState } from 'react';
import { Eye, EyeOff, User, WifiOff } from 'lucide-react';
import { PageLayout } from './layout/PageLayout';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '../context/ToastContext';
import { Button } from './common/Button';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { cacheAdminCredential, verifyCachedAdminCredential } from '../lib/offlineCache';

interface AdminLoginProps {
  onNavigate: (view: 'welcome' | 'employee' | 'admin' | 'adminLogin' | 'timeclock') => void;
}

export default function AdminLogin({ onNavigate }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { showToast } = useToast();
  const isOnline = useOnlineStatus();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setLoginError("Please enter both email and password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    const emailToUse = email.trim();

    // ---- Offline login path ----
    if (!isOnline) {
      try {
        const cached = await verifyCachedAdminCredential(emailToUse, password);
        if (!cached) {
          setLoginError("Offline login failed. Use credentials you have logged in with online before.");
          setIsLoggingIn(false);
          return;
        }
        sessionStorage.setItem("rsr_admin_login_id", cached.username);
        sessionStorage.setItem("rsr_admin_offline_session", "1");
        showToast("Logged in (offline mode). Changes will sync when online.", "warning");
        onNavigate('admin');
      } catch (err) {
        console.error('Offline login error', err);
        setLoginError("Offline login failed.");
      } finally {
        setIsLoggingIn(false);
      }
      return;
    }

    let firebasePassword = password;
    if (firebasePassword.length < 6) {
      firebasePassword = firebasePassword.padEnd(6, '0');
    }

    try {
      try {
        await signInWithEmailAndPassword(auth, emailToUse, firebasePassword);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            // We can no longer assume "admin" or "assistant" based on a toggle.
            // If they are logging in for the first time, we check if they used the default emails.
            let usernameToUse = "";
            let defaultFirebasePass = "";
            if (emailToUse === "admin@rsrengineering.com" || emailToUse === "admin@rsr.com") {
                usernameToUse = "admin";
                defaultFirebasePass = "admin".padEnd(6, '0');
            } else if (emailToUse === "hr@rsrengineering.com" || emailToUse === "hr@rsr.com") {
                usernameToUse = "assistant";
                defaultFirebasePass = "assistant".padEnd(6, '0');
            }

            if (usernameToUse && password.trim() !== (usernameToUse === "assistant" ? "assistant" : "admin")) {
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
            } else if (usernameToUse) {
                // They typed the default password. Let's try to create if it doesn't exist.
                try {
                    const { createUserWithEmailAndPassword } = await import('firebase/auth');
                    await createUserWithEmailAndPassword(auth, emailToUse, firebasePassword);
                } catch (createErr: any) {
                    throw new Error("Invalid credentials");
                }
            } else {
                // Not a default email, and login failed. Just throw.
                throw new Error("Invalid credentials");
            }
        } else {
          throw err;
        }
      }
      
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      // Look up the admin account by email
      const q = query(collection(db, "adminAccounts"), where("email", "==", emailToUse));
      const querySnapshot = await getDocs(q);
      
      let usernameToUse = "";
      let isAssistant = false;
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        usernameToUse = doc.id;
        isAssistant = doc.data().role === "Assistant";
        
        // Save login id to session so Dashboard knows who logged in
        sessionStorage.setItem("rsr_admin_login_id", usernameToUse);
      } else {
        // Fallback for first time initialization if the document doesn't exist yet but auth succeeded
        if (emailToUse === "admin@rsrengineering.com" || emailToUse === "admin@rsr.com") {
            usernameToUse = "admin";
            isAssistant = false;
        } else if (emailToUse === "hr@rsrengineering.com" || emailToUse === "hr@rsr.com") {
            usernameToUse = "assistant";
            isAssistant = true;
        } else {
            // Should not happen unless admin is created without firestore document
            usernameToUse = "admin"; 
        }
        sessionStorage.setItem("rsr_admin_login_id", usernameToUse);
        
        const { adminAccountService } = await import('../services/AdminAccountService');
        await adminAccountService.getAccount(usernameToUse, {
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
      }

      // Cache credentials for future offline logins (fire-and-forget; non-blocking)
      cacheAdminCredential({
        email: emailToUse,
        username: usernameToUse,
        password: password.trim(),
        role: isAssistant ? 'Assistant' : 'Administrator',
      }).catch((err) => console.warn('Failed to cache admin credentials:', err));
      sessionStorage.removeItem("rsr_admin_offline_session");

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
          {!isOnline && (
            <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-medium">
              <WifiOff size={14} />
              <span>Offline mode — using cached credentials</span>
            </div>
          )}
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="block text-[16px] font-medium text-text-primary">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLoginError("");
              }}
              placeholder="Enter admin email"
              className={`control-field h-12 px-4 ${
                loginError ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-border"
              }`}
              autoFocus
            />
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
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-0 w-8 h-8 min-w-0 rounded-full"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </Button>
            </div>
            {loginError && (
              <p className="text-[14px] font-medium text-red-600">
                {loginError}
              </p>
            )}
          </div>

          <Button 
            type="submit"
            isLoading={isLoggingIn}
            fullWidth
            className="mt-2"
          >
            Login
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
