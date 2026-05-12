import React, { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';

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

          <div className="flex justify-end shrink-0">
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

      {/* Main Content */}
      <main className={cn("flex-1 flex flex-col relative z-20 overflow-y-auto overflow-x-hidden", showMenu && "stable-scrollbar", className)}>
        <div className="w-full max-w-[1200px] mx-auto flex-1 flex flex-col gap-10 px-6 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
