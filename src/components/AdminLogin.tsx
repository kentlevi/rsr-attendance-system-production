import React, { useState } from 'react';
import { Eye, EyeOff, User } from 'lucide-react';
import { PageLayout } from './layout/PageLayout';
import { adminAccountService, AdminAccountRecord } from '../services/AdminAccountService';

interface AdminLoginProps {
  onNavigate: (view: 'welcome' | 'employee' | 'admin' | 'adminLogin' | 'timeclock') => void;
}

const ADMIN_ACCOUNTS = {
  admin: {
    fullName: "Admin User",
    username: "admin",
    email: "admin@rsrengineering.com",
    department: "Administration",
    mobile: "+63 917 123 4567",
    position: "System Administrator",
    gender: "Male",
    dateRegistered: "January 5, 2024",
    address: "RSR Engineering Office, Cebu City, Philippines",
    lastLogin: "May 10, 2024 08:45 AM",
    timezone: "(GMT+08:00) Asia/Manila",
    role: "Administrator",
    avatar: "https://i.pravatar.cc/150?img=11",
  },
  assistant: {
    fullName: "Assistant User",
    username: "assistant",
    email: "assistant@rsrengineering.com",
    department: "Administration",
    mobile: "+63 917 765 4321",
    position: "Administrative Assistant",
    gender: "Female",
    dateRegistered: "January 5, 2024",
    address: "RSR Engineering Office, Cebu City, Philippines",
    lastLogin: "May 10, 2024 08:45 AM",
    timezone: "(GMT+08:00) Asia/Manila",
    role: "Assistant",
    avatar: "https://i.pravatar.cc/150?img=47",
  },
};

const LOGIN_MODES = {
  admin: {
    title: "Admin access",
    helper: "Enter your admin credentials to continue.",
    password: "admin",
    switchLabel: "Assistant Login",
    switchTargetLabel: "Assistant access",
    account: ADMIN_ACCOUNTS.admin,
  },
  assistant: {
    title: "Assistant access",
    helper: "Enter your assistant credentials to continue.",
    password: "assistant",
    switchLabel: "Admin Login",
    switchTargetLabel: "Admin access",
    account: ADMIN_ACCOUNTS.assistant,
  },
};

export default function AdminLogin({ onNavigate }: AdminLoginProps) {
  const [loginMode, setLoginMode] = useState<keyof typeof LOGIN_MODES>('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const activeLogin = LOGIN_MODES[loginMode];

  const completeLogin = (loginId: keyof typeof LOGIN_MODES, account: typeof ADMIN_ACCOUNTS.admin) => {
    sessionStorage.setItem('rsr_active_role', 'admin');
    sessionStorage.setItem('rsr_admin_login_id', loginId);
    sessionStorage.setItem('rsr_admin_account', JSON.stringify(account));
    onNavigate('admin');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const account = await adminAccountService.getAccount(loginMode, {
        ...activeLogin.account,
        password: activeLogin.password,
      } as AdminAccountRecord);

      if (password.trim() === account.password) {
        const { password: _password, ...sessionAccount } = account;
        setLoginError("");
        completeLogin(loginMode, sessionAccount);
        return;
      }

      setLoginError("Invalid password. Please try again.");
    } catch (error) {
      console.error(error);
      setLoginError("Unable to verify login. Check Firebase connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const toggleLoginMode = () => {
    setLoginMode((mode) => (mode === 'admin' ? 'assistant' : 'admin'));
    setPassword('');
    setLoginError('');
    setShowPassword(false);
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
          <h1 className="text-[28px] font-bold text-text-primary">{activeLogin.title}</h1>
          <p className="text-[16px] text-text-secondary">{activeLogin.helper}</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
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
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "Checking" : "Login"}
          </button>
        </form>

        <div className="flex flex-col pt-6 border-t border-border/60 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3">
            <span className="text-[14px] font-medium text-text-muted">OR</span>
          </div>
          
          <button 
            type="button"
            onClick={toggleLoginMode}
            className="btn-secondary w-full text-primary"
          >
            <User size={18} strokeWidth={2.5} />
            {activeLogin.switchLabel}
          </button>
          <p className="pt-3 text-center text-[13px] font-medium text-text-muted">
            Switch to {activeLogin.switchTargetLabel}
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
