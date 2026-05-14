import React, { ReactNode, useEffect, useState } from 'react';
import { Menu, WifiOff, CloudUpload, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { syncService } from '../../services/SyncService';
import { useAuthStore } from '../../store/authStore';

interface PageLayoutProps {
  children: ReactNode;
  onNavigate: (view: 'welcome') => void;
  title?: ReactNode; // Optional center title (like time on TimeClock)
  showMenu?: boolean;
  onMenuClick?: () => void;
  onLogoClick?: () => void;
  headerRight?: ReactNode;
  className?: string; // added to main content
}

export function PageLayout({ 
  children, 
  onNavigate, 
  title, 
  showMenu = true,
  onMenuClick,
  onLogoClick,
  headerRight,
  className
}: PageLayoutProps) {
  const isOnline = useOnlineStatus();
  const isOfflineAdmin = useAuthStore((s) => s.isOfflineAdmin);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const summary = await syncService.getAggregatedSyncSummary();
        if (active) setPendingCount(summary.totalOpen);
      } catch {
        // ignore
      }
    };
    refresh();
    const interval = window.setInterval(refresh, 10_000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col relative overflow-hidden font-sans">
      {/* Top Right Decoration */}
      <div className="absolute -top-[25%] -right-[15%] w-[800px] h-[800px] rounded-full bg-[#F4F7F6]/50 pointer-events-none flex items-center justify-center">
        <div 
          className="absolute inset-0 pointer-events-none opacity-20" 
          style={{
            backgroundImage: 'radial-gradient(circle, #94A3B8 2px, transparent 2px)',
            backgroundSize: '20px 20px',
            maskImage: 'radial-gradient(circle at center, black 40%, transparent 65%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 65%)'
          }}
        ></div>
      </div>

      {/* Bottom Left Decoration */}
      <div className="absolute -bottom-[25%] -left-[15%] w-[800px] h-[800px] rounded-full bg-[#F4F7F6]/50 pointer-events-none flex items-center justify-center">
        <div 
          className="absolute inset-0 pointer-events-none opacity-20" 
          style={{
            backgroundImage: 'radial-gradient(circle, #94A3B8 2px, transparent 2px)',
            backgroundSize: '20px 20px',
            maskImage: 'radial-gradient(circle at center, black 40%, transparent 65%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 65%)'
          }}
        ></div>
      </div>

      {/* Header */}
      <header className="h-auto py-4 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]/50 sticky top-0 z-50 shrink-0">
        <div className="w-full max-w-[1200px] mx-auto flex flex-row items-center justify-between px-4 md:px-8 gap-4">
          <div className="flex items-center shrink-0 relative">
            <Button
              variant="ghost"
              className="flex flex-col gap-1 cursor-pointer shrink-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-lg p-0 h-auto hover:bg-transparent"
              onClick={onLogoClick || (() => onNavigate('welcome'))}
              aria-label="Go to dashboard"
            >
              <span className="text-[20px] sm:text-[28px] font-bold text-[#1a1a1a] tracking-tight leading-[0.9] uppercase">RSR</span>
              <span className="text-[12px] sm:text-[16px] font-medium text-[#1a1a1a] tracking-[0.15em] uppercase">Engineering</span>
            </Button>
          </div>

          {/* Center Title (Desktop) */}
          <div className="hidden sm:flex flex-1 justify-center px-4 min-w-0">
            {title}
          </div>

          <div className="flex justify-end shrink-0 items-center gap-2">
            {!isOnline && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[12px] sm:text-[13px] font-medium"
                title="You are offline. Changes will sync when connection returns."
              >
                <WifiOff size={14} />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[12px] sm:text-[13px] font-medium"
                title={`${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting to sync (punches, uploads, notifications).`}
              >
                <CloudUpload size={14} />
                <span>{pendingCount}<span className="hidden sm:inline"> pending</span></span>
              </div>
            )}
            {headerRight ? (
              headerRight
            ) : showMenu ? (
              <Button 
                variant="ghost"
                onClick={onMenuClick || (() => onNavigate('welcome'))}
                className="btn-icon rounded-full text-[#1a1a1a] p-0 h-11 w-11"
              >
                <Menu size={24} strokeWidth={1.5} />
              </Button>
            ) : null}
          </div>
        </div>

        {/* Center Title (Mobile) */}
        {title && (
          <div className="sm:hidden w-full px-4 pt-4 pb-2 mt-2 border-t border-[#E2E8F0]/30 animate-in fade-in slide-in-from-top-2">
            {title}
          </div>
        )}
      </header>

      {/* Offline read-only admin banner — full-width strip under the header so it's
          visible on every page without the admin missing it. Editing buttons still
          render, but the underlying service mutations short-circuit and surface a
          warning toast (see lib/readOnlyMode.ts). */}
      {isOfflineAdmin && (
        <div className="relative z-30 bg-amber-50 border-b border-amber-200 text-amber-900">
          <div className="w-full max-w-[1200px] mx-auto flex items-center gap-2 px-4 sm:px-6 md:px-8 py-2 text-[13px] sm:text-[14px]">
            <Lock size={16} className="flex-shrink-0" />
            <span className="font-medium">
              Offline admin — read-only mode. Changes can't be saved until you reconnect.
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {/* Page padding is centralised here so mobile spacing is identical across all
          screens. Page components should NOT pass `px-*` / `py-*` via className —
          override only flex / alignment / gap if needed. */}
      <main className={cn("flex-1 flex flex-col relative z-20 overflow-y-auto overflow-x-hidden", showMenu && "stable-scrollbar", className)}>
        <div className="w-full max-w-[1200px] mx-auto flex-1 flex flex-col gap-6 sm:gap-10 px-2 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
