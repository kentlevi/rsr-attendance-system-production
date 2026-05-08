import React, { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';

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
      <header className="h-[84px] bg-transparent border-b border-[#E2E8F0]/50 relative z-50 shrink-0">
        <div className="w-full max-w-[1200px] mx-auto h-full flex items-center justify-between px-6 md:px-8">
          <button
            type="button"
            className="flex flex-col gap-1 cursor-pointer w-64 shrink-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-lg"
            onClick={onLogoClick || (() => onNavigate('welcome'))}
            aria-label="Go to dashboard"
          >
            <span className="text-[28px] font-bold text-[#1a1a1a] tracking-tight leading-[0.9] uppercase">RSR</span>
            <span className="text-[16px] font-medium text-[#1a1a1a] tracking-[0.15em] uppercase">Engineering</span>
          </button>

          {/* Center Title (optional, used in TimeClock) */}
          <div className="flex-1 flex justify-center px-4 min-w-0">
            {title}
          </div>

          <div className="w-64 flex justify-end shrink-0">
            {headerRight ? (
              headerRight
            ) : showMenu ? (
              <button 
                onClick={onMenuClick || (() => onNavigate('welcome'))}
                className="btn-icon rounded-full text-[#1a1a1a]"
              >
                <Menu size={24} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        </div>
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
