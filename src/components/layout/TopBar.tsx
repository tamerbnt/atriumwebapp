import React from 'react';
import {
  Sun,
  Moon,
  RotateCw,
  Rocket,
  Minus,
  Square,
  X,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';

interface TopBarProps {
  onOpenVoucherModal: () => void;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenVoucherModal,
  onToggleMobileMenu,
}) => {
  const { activeScreen, theme, setTheme } = useAtriumStore();

  const getBreadcrumb = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            Home
          </span>
        );
      case 'members':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 font-medium">Home</span>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">Members</span>
          </div>
        );
      case 'registrations':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 font-medium">Home</span>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">Registrations</span>
          </div>
        );
      case 'shop':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 font-medium">Home</span>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">Shop & POS</span>
          </div>
        );
      default:
        return (
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 capitalize">
            {activeScreen}
          </span>
        );
    }
  };

  return (
    <header
      className="h-[52px] my-3 mr-3 ml-2 px-5 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-20"
    >
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 cursor-pointer"
        >
          <Menu size={17} />
        </button>
        {getBreadcrumb()}
      </div>

      {/* Right Controls matching Desktop */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Sun / Moon Theme Capsule */}
        <div
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="h-8 px-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center gap-2 cursor-pointer hover:bg-neutral-200/70 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          <Sun
            size={14}
            className={`${theme === 'light' ? 'text-amber-500 font-bold' : 'text-neutral-400'}`}
          />
          <Moon
            size={14}
            className={`${theme === 'dark' ? 'text-blue-400 font-bold' : 'text-neutral-400'}`}
          />
        </div>

        {/* Refresh Icon */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          title="Refresh Data"
          className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <RotateCw size={14} />
        </button>

        {/* Rocket / Launch Icon */}
        <button
          type="button"
          onClick={onOpenVoucherModal}
          title="Atrium Launch & License Center"
          className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-[#C4785A] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <Rocket size={14} />
        </button>

        {/* User Identity Stack */}
        <div
          onClick={onOpenVoucherModal}
          className="flex items-center gap-2.5 pl-2 cursor-pointer group"
          title="Logged in as Tamer (Owner)"
        >
          <div className="text-right leading-tight hidden sm:block">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block group-hover:text-[#C4785A] transition-colors">
              Tamer
            </span>
            <span className="text-[10px] text-neutral-400 block -mt-0.5">Owner</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#C4785A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            T
          </div>
        </div>

        {/* Native-style Window Controls Divider & Buttons */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
};
