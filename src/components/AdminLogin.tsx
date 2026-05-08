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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Wait for authStore to update and role to be assigned.
      showToast("Login successful!", "success");
      // The auth observer in App.tsx or similar usually handles routing,
      // but we navigate to admin here safely.
      onNavigate('admin');
    } catch (error: any) {
      console.error(error);
      setLoginError("Invalid credentials. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <PageLayout onNavigate={onNavigate as any} className="items-center justify-start py-12 px-6">
      <div className="w-full max-w-[420px] mx-auto bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 border border-border/60 flex flex-col gap-8">
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
          <p className="text-[16px] text-text-secondary">Sign in with your administrative account.</p>
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
              placeholder="Enter your email"
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
                placeholder="Enter your password"
                className={`control-field h-12 px-4 pr-12 ${
                  loginError ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-border"
                }`}
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
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
