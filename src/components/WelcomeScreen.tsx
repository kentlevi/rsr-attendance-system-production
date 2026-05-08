import React, { useState, useEffect } from 'react';
import { Clock, UserCog, Settings, ArrowRight } from 'lucide-react';
import { PageLayout } from './layout/PageLayout';

interface WelcomeScreenProps {
  onNavigate: (view: 'welcome' | 'employee' | 'admin' | 'adminLogin' | 'timeclock') => void;
}

export default function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  const [loading, setLoading] = useState(!sessionStorage.getItem('rsr_app_loaded'));
  const [progress, setProgress] = useState(sessionStorage.getItem('rsr_app_loaded') ? 100 : 0);

  useEffect(() => {
    if (sessionStorage.getItem('rsr_app_loaded')) {
      return;
    }
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 8));
    }, 100);
    
    // Simulate loading completion
    const timer = setTimeout(() => {
      setLoading(false);
      sessionStorage.setItem('rsr_app_loaded', 'true');
    }, 1500);
    
    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-start gap-8 pt-[20vh] bg-background z-50">
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl font-bold text-[#1a1a1a] tracking-tight leading-none uppercase">RSR</span>
          <span className="text-xs font-medium text-primary tracking-[0.2em] uppercase">Engineering</span>
        </div>
        <div className="w-48 h-1.5 bg-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-100 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout onNavigate={onNavigate as any} showMenu={false} className="items-center justify-start">
      <div className="text-center flex flex-col gap-2">
        <h1 className="text-[40px] font-bold text-text-primary leading-tight">
          Welcome!
        </h1>
        <p className="text-text-secondary text-lg">
          Please select an option to continue
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1200px] w-full mx-auto z-10 relative">
        
        {/* Time Clock */}
        <div 
          onClick={() => onNavigate('timeclock')}
          className="group cursor-pointer rounded-[28px] border border-border bg-white pt-12 pb-10 px-8 flex flex-col items-center justify-between gap-8 text-center transition-all duration-300 hover:bg-gradient-to-b hover:from-primary hover:to-primary-dark hover:border-transparent"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-[100px] h-[100px] rounded-full bg-primary-light flex items-center justify-center transition-colors duration-300 group-hover:bg-white/20">
              <Clock size={44} className="text-primary transition-colors duration-300 group-hover:text-white" strokeWidth={1.75} />
            </div>
            <h3 className="text-[24px] font-medium text-text-primary transition-colors duration-300 group-hover:text-white tracking-tight">Time Clock</h3>
            <div className="w-8 h-1 rounded-full bg-primary transition-colors duration-300 group-hover:bg-white/50"></div>
            <p className="text-text-secondary text-[16px] leading-[1.6] transition-colors duration-300 group-hover:text-white/90">
              Record attendance and manage your work hours
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border/80 flex items-center justify-center transition-all duration-300 group-hover:border-transparent">
            <ArrowRight size={22} className="text-primary" strokeWidth={2.5} />
          </div>
        </div>

        {/* Employee Portal */}
        <div 
          onClick={() => onNavigate('employee')}
          className="group cursor-pointer rounded-[28px] border border-border bg-white pt-12 pb-10 px-8 flex flex-col items-center justify-between gap-8 text-center transition-all duration-300 hover:bg-gradient-to-b hover:from-primary hover:to-primary-dark hover:border-transparent"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-[100px] h-[100px] rounded-full bg-primary-light flex items-center justify-center transition-colors duration-300 group-hover:bg-white/20">
              <UserCog size={44} className="text-primary transition-colors duration-300 group-hover:text-white" strokeWidth={1.75} />
            </div>
            <h3 className="text-[24px] font-medium text-text-primary transition-colors duration-300 group-hover:text-white tracking-tight">Employee Portal</h3>
            <div className="w-8 h-1 rounded-full bg-primary transition-colors duration-300 group-hover:bg-white/50"></div>
            <p className="text-text-secondary text-[16px] leading-[1.6] transition-colors duration-300 group-hover:text-white/90">
              Access your profile, leaves, timesheet and more
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border/80 flex items-center justify-center transition-all duration-300 group-hover:border-transparent">
            <ArrowRight size={22} className="text-primary" strokeWidth={2.5} />
          </div>
        </div>

        {/* Management */}
        <div 
          onClick={() => onNavigate('adminLogin')}
          className="group cursor-pointer rounded-[28px] border border-border bg-white pt-12 pb-10 px-8 flex flex-col items-center justify-between gap-8 text-center transition-all duration-300 hover:bg-gradient-to-b hover:from-primary hover:to-primary-dark hover:border-transparent"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-[100px] h-[100px] rounded-full bg-primary-light flex items-center justify-center transition-colors duration-300 group-hover:bg-white/20">
              <Settings size={44} className="text-primary transition-colors duration-300 group-hover:text-white" strokeWidth={1.75} />
            </div>
            <h3 className="text-[24px] font-medium text-text-primary transition-colors duration-300 group-hover:text-white tracking-tight">Management</h3>
            <div className="w-8 h-1 rounded-full bg-primary transition-colors duration-300 group-hover:bg-white/50"></div>
            <p className="text-text-secondary text-[16px] leading-[1.6] transition-colors duration-300 group-hover:text-white/90">
              Manage employees, attendance and system settings
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border/80 flex items-center justify-center transition-all duration-300 group-hover:border-transparent">
            <ArrowRight size={22} className="text-primary" strokeWidth={2.5} />
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
