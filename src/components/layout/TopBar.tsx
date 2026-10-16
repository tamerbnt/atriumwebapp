import React, { useState } from 'react';
import {
  Sun,
  Moon,
  RotateCw,
  Rocket,
  Menu,
  ChevronRight,
  Home,
  Lock,
  Sparkles,
  LogOut,
  Cloud,
  CloudOff,
  Database,
  Play,
  Pause,
  Square,
  Clock,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { formatDuration } from '../../utils/rules';

interface TopBarProps {
  onOpenVoucherModal: () => void;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenVoucherModal,
  onToggleMobileMenu,
}) => {
  const {
    activeScreen,
    setScreen,
    selectedMember,
    selectMember,
    theme,
    setTheme,
    currentUser,
    terminology,
    openFastSwitch,
    openOnboarding,
    logout,
    supabaseStatus,
    isSyncing,
    syncWithSupabase,
    isSupabaseConfigured,
    lastSyncedAt,
    currentBusiness,
    activeTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useAtriumStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getBreadcrumb = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Home size={13} className="text-[#C4785A]" />
              Home
            </span>
          </div>
        );
      case 'analytics':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>Home</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">Analytics</span>
          </nav>
        );
      case 'members':
        if (selectedMember) {
          return (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  selectMember(null);
                  setScreen('dashboard');
                }}
                className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Home size={12} />
                <span>Home</span>
              </button>
              <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
              <button
                type="button"
                onClick={() => selectMember(null)}
                className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors cursor-pointer"
              >
                {terminology.members}
              </button>
              <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
              <span className="text-neutral-900 dark:text-white font-semibold truncate max-w-[130px] sm:max-w-[200px]">
                {selectedMember.fullName}
              </span>
            </nav>
          );
        }
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>Home</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">{terminology.members}</span>
          </nav>
        );
      case 'registrations':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>Home</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">{terminology.registration} & Intake</span>
          </nav>
        );
      case 'shop':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>Home</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">{terminology.shop} & Products</span>
          </nav>
        );
      case 'scheduler':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>Home</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">{terminology.scheduler}</span>
          </nav>
        );
      case 'finance':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>Home</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">Finance & Staff</span>
          </nav>
        );
      case 'history':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>Home</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">Operations History</span>
          </nav>
        );
      case 'settings':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>Home</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">Settings & License</span>
          </nav>
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
      {/* Left: Mobile Toggle & Working Interactive Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          aria-label="Toggle mobile navigation menu"
        >
          <Menu size={17} />
        </button>
        {getBreadcrumb()}
      </div>

      {/* Center: Live Floating Stopwatch Pill */}
      {(activeTimer.isRunning || currentBusiness.category === 'freelance_solo') && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 text-xs shadow-2xs">
          {activeTimer.isRunning ? (
            <>
              <span className={`w-2 h-2 rounded-full ${activeTimer.isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <button
                type="button"
                onClick={() => setScreen('scheduler')}
                className="font-bold text-neutral-900 dark:text-white font-mono tabular-nums hover:text-[#C4785A] transition-colors cursor-pointer"
                title="View active deliverable and timer"
              >
                {formatDuration(activeTimer.elapsedSeconds)}
              </button>
              <span className="text-[11px] text-neutral-500 max-w-[120px] truncate hidden sm:inline">
                {activeTimer.clientName}
              </span>
              <div className="flex items-center gap-1 pl-1 border-l border-neutral-300 dark:border-neutral-700">
                {activeTimer.isPaused ? (
                  <button
                    type="button"
                    onClick={resumeTimer}
                    className="p-1 rounded-full text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950 cursor-pointer"
                    title="Resume timer"
                  >
                    <Play size={12} className="fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="p-1 rounded-full text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer"
                    title="Pause timer"
                  >
                    <Pause size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopTimer}
                  className="p-1 rounded-full text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer"
                  title="Stop and save log"
                >
                  <Square size={11} className="fill-current" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setScreen('scheduler')}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 hover:text-[#C4785A] transition-colors cursor-pointer"
              title="Open Focus Timer"
            >
              <Clock size={13} className="text-[#C4785A]" />
              <span>Start Timer</span>
            </button>
          )}
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Sun / Moon Theme Capsule */}
        <button
          type="button"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="h-8 px-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center gap-2 cursor-pointer hover:bg-neutral-200/70 dark:hover:bg-neutral-700/80 transition-colors"
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
        </button>

        {/* Supabase Cloud Connection Status Badge */}
        <div
          title={
            supabaseStatus === 'connected'
              ? `Connected to Supabase PostgreSQL & Realtime${lastSyncedAt ? ` (Synced: ${new Date(lastSyncedAt).toLocaleTimeString()})` : ''}`
              : supabaseStatus === 'connecting'
              ? 'Connecting to Supabase...'
              : supabaseStatus === 'offline'
              ? 'Offline mode — local changes will sync when connection is restored'
              : 'Local Storage / Demo Mode (Set VITE_SUPABASE_URL to connect live cloud)'
          }
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            supabaseStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
              : supabaseStatus === 'connecting'
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
              : supabaseStatus === 'offline'
              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
              : 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
          }`}
        >
          {supabaseStatus === 'connected' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Cloud size={12} />
              <span>Cloud Synced</span>
            </>
          ) : supabaseStatus === 'connecting' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <RotateCw size={12} className="animate-spin" />
              <span>Syncing...</span>
            </>
          ) : supabaseStatus === 'offline' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <CloudOff size={12} />
              <span>Offline</span>
            </>
          ) : (
            <>
              <Database size={12} className="text-[#C4785A]" />
              <span>Hybrid / Local</span>
            </>
          )}
        </div>

        {/* Sync / Refresh Button */}
        <button
          type="button"
          onClick={() => syncWithSupabase()}
          title={isSupabaseConfigured ? 'Sync with Supabase Cloud' : 'Refresh State'}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
            isSyncing ? 'animate-spin text-[#C4785A]' : ''
          }`}
        >
          <RotateCw size={14} />
        </button>

        {/* Rocket / Launch Icon */}
        <button
          type="button"
          onClick={onOpenVoucherModal}
          title="Atrium Launch & License Center"
          className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-[#C4785A] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <Rocket size={14} />
        </button>

        {/* User Identity Menu Button */}
        <div className="relative">
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-2 cursor-pointer group"
            title={`Operator: ${currentUser.fullName} (${currentUser.role})`}
          >
            <div className="text-right leading-tight hidden sm:block">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block group-hover:text-[#C4785A] transition-colors">
                {currentUser.fullName.split(' ')[0]}
              </span>
              <span className="text-[10px] text-neutral-400 block -mt-0.5">{currentUser.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#C4785A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser.fullName.charAt(0)}
            </div>
          </div>

          {/* User Profile Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#1E1B19] border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[9px] font-bold text-[#C4785A] bg-[#C4785A]/15 px-1.5 py-0.5 rounded-full uppercase">
                    {currentUser.role}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 block truncate">{currentUser.email}</span>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    openFastSwitch();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Lock size={14} className="text-[#C4785A]" />
                  <span>Lock Terminal / Switch Staff</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    openOnboarding();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-500" />
                  <span>New Business Onboarding Wizard</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenVoucherModal();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Rocket size={14} className="text-blue-500" />
                  <span>Redeem Lifetime License Voucher</span>
                </button>
              </div>

              <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer font-semibold"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
