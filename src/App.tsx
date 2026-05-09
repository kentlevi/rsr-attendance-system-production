import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import EmployeePortal from './components/EmployeePortal';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import TimeClock from './components/TimeClock';
import { ToastProvider } from './context/ToastContext';
import { syncService } from './services/SyncService';
import { employeeService } from './services/EmployeeService';
import { useAuthStore } from './store/authStore';

type AppView = 'welcome' | 'employee' | 'admin' | 'adminLogin' | 'timeclock';
const SESSION_ROLE_KEY = 'rsr_active_role';

export default function App() {
  const { isAdmin, init, isLoading } = useAuthStore();
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window === 'undefined') return 'welcome';
    const activeRole = sessionStorage.getItem(SESSION_ROLE_KEY);
    if (activeRole === 'employee') return 'employee';
    return 'welcome';
  });

  useEffect(() => {
    const unsubscribe = init();
    return () => unsubscribe();
  }, [init]);

  useEffect(() => {
    // Start automated background synchronization for offline punches (Phase 6)
    syncService.startAutoSync(60000); // 1 minute interval
    employeeService.startLeaveReplenishmentScheduler();
    return () => {
      syncService.stopAutoSync();
      employeeService.stopLeaveReplenishmentScheduler();
    };
  }, []);

  const handleNavigate = (view: AppView) => {
    const activeRole = sessionStorage.getItem(SESSION_ROLE_KEY);

    if (view === 'welcome') {
      if (isAdmin) {
        setCurrentView('admin');
        return;
      }
      if (activeRole === 'employee') {
        setCurrentView('employee');
        return;
      }
    }

    if (view === 'admin' && !isAdmin) {
      setCurrentView('adminLogin');
      return;
    }

    setCurrentView(view);
  };

  // If user is admin but wants to go to admin view, but is logged out at Firebase level
  if (currentView === 'admin' && !isLoading && !isAdmin) {
      setCurrentView('adminLogin');
  }

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-text-primary text-[16px]">
        {currentView === 'welcome' && <WelcomeScreen onNavigate={handleNavigate} />}
        {currentView === 'timeclock' && <TimeClock onNavigate={handleNavigate} />}
        {currentView === 'employee' && <EmployeePortal onNavigate={handleNavigate} />}
        {currentView === 'adminLogin' && <AdminLogin onNavigate={handleNavigate} />}
        {currentView === 'admin' && <AdminDashboard onNavigate={handleNavigate} />}
      </div>
    </ToastProvider>
  );
}
