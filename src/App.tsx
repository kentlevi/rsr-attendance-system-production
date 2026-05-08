import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import EmployeePortal from './components/EmployeePortal';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import TimeClock from './components/TimeClock';
import { ToastProvider } from './context/ToastContext';
import { syncService } from './services/SyncService';
import { employeeService } from './services/EmployeeService';

type AppView = 'welcome' | 'employee' | 'admin' | 'adminLogin' | 'timeclock';
const SESSION_ROLE_KEY = 'rsr_active_role';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window === 'undefined') return 'welcome';
    const activeRole = sessionStorage.getItem(SESSION_ROLE_KEY);
    if (activeRole === 'admin') return 'admin';
    if (activeRole === 'employee') return 'employee';
    return 'welcome';
  });

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
      if (activeRole === 'admin') {
        setCurrentView('admin');
        return;
      }
      if (activeRole === 'employee') {
        setCurrentView('employee');
        return;
      }
    }

    if (view === 'admin') {
      sessionStorage.setItem(SESSION_ROLE_KEY, 'admin');
    }

    setCurrentView(view);
  };

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
