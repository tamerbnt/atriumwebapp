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
  Building2,
  ChevronDown,
  Check,
  Laptop,
  Plus,
  Search,
  TrendingUp,
  Layers,
  Radio,
  Users,
  CreditCard,
  Briefcase,
  Globe,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { formatDuration } from '../../utils/rules';
import { PMRole, SupportedLanguage } from '../../types/index';
import { Seek } from '../ui/Seek';
import { t } from '../../utils/i18n';

interface TopBarProps {
  onOpenVoucherModal: () => void;
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenVoucherModal,
  onToggleMobileMenu,
  onOpenCommandPalette,
}) => {
  const {
    activeScreen,
    setScreen,
    selectedMember,
    selectMember,
    theme,
    setTheme,
    language,
    isLanguageAuto,
    setLanguage,
    setSystemDefaultLanguage,
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
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    activeTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    openDesktopUpgradeModal,
    activePmRole,
    setActivePmRole,
  } = useAtriumStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [facilityDropdownOpen, setFacilityDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [topBarSearch, setTopBarSearch] = useState('');

  const isFreelance = currentBusiness?.category === 'freelance_solo';
  const isRental = currentBusiness?.category === 'rental_booking';
  const isEducation = currentBusiness?.category === 'education_cohort';
  const isPOS = currentBusiness?.category === 'pos_inventory';
  const isProjectMilestone = currentBusiness?.category === 'project_milestone';

  const getBreadcrumb = () => {
    const homeLabel = isProjectMilestone
      ? 'NCH Activator'
      : isFreelance
      ? t('nav_solo_home', language)
      : isRental
      ? t('nav_venue_dashboard', language)
      : isEducation
      ? t('nav_edu_dashboard', language)
      : isPOS
      ? t('nav_pos_register', language)
      : t('nav_home', language);

    switch (activeScreen) {
      case 'dashboard':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Home size={13} className="text-[#C4785A]" />
              {homeLabel}
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
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {isProjectMilestone
                ? 'Superviseur Terrain (Live Missions)'
                : isFreelance
                ? 'Time Tracker & Pomodoro'
                : isRental
                ? 'Occupancy Analytics'
                : isEducation
                ? 'Attendance & Grades'
                : 'Analytics'}
            </span>
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
                <span>{homeLabel}</span>
              </button>
              <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
              <button
                type="button"
                onClick={() => selectMember(null)}
                className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors cursor-pointer"
              >
                {isFreelance ? 'Clients' : isRental ? 'Renters' : isEducation ? 'Students' : isPOS ? 'Customers' : terminology.members}
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
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {isFreelance
                ? 'Clients & Retainers'
                : isRental
                ? 'Renters & Client Directory'
                : isEducation
                ? 'Students & Guardians CRM'
                : isPOS
                ? 'Customer Directory'
                : terminology.members}
            </span>
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
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {isFreelance
                ? 'Proposals & Inquiries'
                : isRental
                ? 'Reservations & Event Inquiries'
                : isEducation
                ? 'Admissions & Inquiries Funnel'
                : isPOS
                ? 'Sales & Receipts'
                : `${terminology.registration} & Intake`}
            </span>
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
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {isFreelance
                ? 'Invoices & Billing Hub'
                : isRental
                ? 'Spaces & Asset Inventory'
                : isEducation
                ? 'Cohorts & Programs Hub'
                : isPOS
                ? 'POS Register & Inventory'
                : `${terminology.shop} & Products`}
            </span>
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
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {isFreelance
                ? 'Deliverables & Deadlines'
                : isRental
                ? 'Occupancy Matrix & Timeline'
                : isEducation
                ? 'Conflict-Free Timetable & Rooms'
                : isPOS
                ? 'Store Shifts & Staff Roster'
                : terminology.scheduler}
            </span>
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
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {isFreelance
                ? 'Tax Reserves & Net Profit'
                : isRental
                ? 'Caution Escrow & Rental Revenue'
                : isEducation
                ? 'Tuition Billing & Aging AR'
                : 'Finance & Staff'}
            </span>
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
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {isFreelance
                ? 'Time Logs & Chronometer'
                : isEducation
                ? 'Roll Call & Attendance Log'
                : isRental
                ? 'Booking Logs & Audit Trail'
                : isPOS
                ? 'Register Journal & Sales'
                : 'Operations History'}
            </span>
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
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {isFreelance ? 'Workspace & Settings' : 'Settings & License'}
            </span>
          </nav>
        );
      case 'pm_dir_dashboard':
      case 'pm_dir_new_project':
      case 'pm_dir_approvals':
      case 'pm_cp_projects':
      case 'pm_cp_catalog':
      case 'pm_cp_deliverables':
      case 'pm_cp_expenses':
      case 'pm_crea_kanban':
      case 'pm_crea_upload':
      case 'pm_sup_missions':
      case 'pm_sup_attendance':
      case 'pm_sup_staffing':
      case 'pm_sup_expenses':
      case 'pm_rh_talents':
      case 'pm_rh_dossier':
      case 'pm_rh_portal':
      case 'pm_rh_walkin':
      case 'pm_compta_payroll':
      case 'pm_compta_ccp':
      case 'pm_compta_expenses':
      case 'pm_compta_stock': {
        const pmScreenTitles: Record<string, { role: string; screen: string }> = {
          pm_dir_dashboard: { role: 'Direction', screen: 'Command Center' },
          pm_dir_new_project: { role: 'Direction', screen: 'Cadrage & Cahier des Charges' },
          pm_dir_approvals: { role: 'Direction', screen: 'Double-Lock Approbations' },
          pm_cp_projects: { role: 'Chef de Projet', screen: 'Portefeuille & Jalons' },
          pm_cp_catalog: { role: 'Chef de Projet', screen: 'Catalogue Print & PLV' },
          pm_cp_deliverables: { role: 'Chef de Projet', screen: 'BAT & Livrables' },
          pm_cp_expenses: { role: 'Chef de Projet', screen: 'Budget & Dépenses' },
          pm_crea_kanban: { role: 'Studio Créa', screen: 'Kanban de Production' },
          pm_crea_upload: { role: 'Studio Créa', screen: 'Validateur BAT & Specs' },
          pm_sup_missions: { role: 'Superviseur', screen: 'Missions Terrain' },
          pm_sup_attendance: { role: 'Superviseur', screen: 'Pointage Mobile Direct' },
          pm_sup_staffing: { role: 'Superviseur', screen: 'Casting & Staffing' },
          pm_sup_expenses: { role: 'Superviseur', screen: 'Déclaration Dépense' },
          pm_rh_talents: { role: 'RH & Casting', screen: 'Vivier Talents (58 Wilayas)' },
          pm_rh_dossier: { role: 'RH & Casting', screen: 'Dossier Talent 360°' },
          pm_rh_portal: { role: 'RH & Casting', screen: 'Portail Candidat Public' },
          pm_rh_walkin: { role: 'RH & Casting', screen: 'Saisie Express Agence' },
          pm_compta_payroll: { role: 'Comptabilité', screen: 'Hub Paies Automatisé' },
          pm_compta_ccp: { role: 'Comptabilité', screen: 'Bordereaux CCP (SFP 01)' },
          pm_compta_expenses: { role: 'Comptabilité', screen: 'Audit Factures & NIF' },
          pm_compta_stock: { role: 'Comptabilité', screen: 'Stock Matériel & QR' },
        };
        const info = pmScreenTitles[activeScreen] || { role: 'Projets & Jalons', screen: activeScreen };
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-500 font-medium">{info.role}</span>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">{info.screen}</span>
          </nav>
        );
      }
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
      className="h-[52px] my-3 mr-3 ml-2 px-4 sm:px-5 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 shadow-2xs z-20"
    >
      {/* Left: Mobile Toggle & Working Interactive Breadcrumbs & Facility Capsule */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          aria-label="Toggle mobile navigation menu"
        >
          <Menu size={17} />
        </button>

        {/* Global Facility Switcher Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFacilityDropdownOpen(!facilityDropdownOpen)}
            className="h-8 px-2.5 rounded-full bg-[#F4EFEA] dark:bg-neutral-800 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-1.5 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-700/80 transition-colors shadow-2xs"
            title="Switch Facility or Business Vertical"
          >
            <Building2 size={13} className="text-[#C4785A]" />
            <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 max-w-[90px] sm:max-w-[130px] truncate">
              {currentBusiness?.name || 'Facility'}
            </span>
            <ChevronDown size={11} className={`text-neutral-500 transition-transform ${facilityDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {facilityDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#1E1B19] border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Switch Vertical / Facility
              </div>
              {businesses.map((biz) => {
                const isCurrent = biz.id === currentBusinessId;
                const matchingBranch = branches.find((b) => b.businessId === biz.id);
                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => {
                      switchBusiness(biz.id);
                      if (matchingBranch) switchBranch(matchingBranch.id);
                      setFacilityDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-bold'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 size={13} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                      <div className="truncate">
                        <div className="truncate font-medium">{biz.name}</div>
                        <div className="text-[10px] text-neutral-400 capitalize">{biz.category.replace('_', ' ')}</div>
                      </div>
                    </div>
                    {isCurrent && <Check size={14} />}
                  </button>
                );
              })}

              <div className="pt-1.5 mt-1 border-t border-neutral-100 dark:border-neutral-800 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setFacilityDropdownOpen(false);
                    openDesktopUpgradeModal('branch_limit');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between text-xs text-[#C4785A] hover:bg-[#FDF4F0] dark:hover:bg-neutral-800 font-semibold cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Plus size={13} />
                    <span>Add Facility or Branch</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                    Desktop
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="hidden sm:block">
          {getBreadcrumb()}
        </div>
      </div>



      {/* Center: Live Floating Stopwatch Pill */}
      {!isProjectMilestone && (activeTimer.isRunning || currentBusiness.category === 'freelance_solo') && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 text-xs shadow-2xs">
          {activeTimer.isRunning ? (
            <>
              <span className={`w-2 h-2 rounded-full ${activeTimer.isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <button
                type="button"
                onClick={() => setScreen(isFreelance ? 'analytics' : 'scheduler')}
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
              onClick={() => setScreen(isFreelance ? 'analytics' : 'scheduler')}
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
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Expanding Search Lens / Command Palette Trigger */}
        {onOpenCommandPalette && (
          <Seek
            value={topBarSearch}
            onChange={setTopBarSearch}
            placeholder="Search (Ctrl+K)..."
            openWidth={230}
            shutSize={34}
            onSearch={() => {
              onOpenCommandPalette();
            }}
          />
        )}

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

        {/* Language Selector Capsule (EN / FR / عربي) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLanguageDropdownOpen((prev) => !prev)}
            className="h-8 px-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200/70 dark:hover:bg-neutral-700/80 transition-colors text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs"
            title={t('topbar_language', language)}
          >
            <Globe size={13} className="text-[#C4785A]" />
            <span className="uppercase text-[11px] font-bold tracking-wider">
              {language === 'ar' ? 'عربي' : language === 'fr' ? 'FR' : 'EN'}
            </span>
            {isLanguageAuto && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={t('topbar_auto_detected', language)} />
            )}
            <ChevronDown size={12} className={`text-neutral-400 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {languageDropdownOpen && (
            <div
              className={`absolute top-full mt-1.5 z-50 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                language === 'ar' ? 'left-0' : 'right-0'
              }`}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {t('topbar_language', language)}
              </div>

              {/* System Default */}
              <button
                type="button"
                onClick={() => {
                  setSystemDefaultLanguage();
                  setLanguageDropdownOpen(false);
                  showToast({
                    type: 'info',
                    title: t('topbar_auto_detected', language),
                    message: t('settings_lang_changed_toast', language),
                  });
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  isLanguageAuto
                    ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🌐</span>
                  <span>{t('settings_system_default', language)}</span>
                </div>
                {isLanguageAuto && <Check size={13} className="text-[#C4785A]" />}
              </button>

              <div className="h-px bg-neutral-100 dark:bg-zinc-800 my-1" />

              {/* English */}
              <button
                type="button"
                onClick={() => {
                  setLanguage('en', false);
                  setLanguageDropdownOpen(false);
                  showToast({
                    type: 'success',
                    title: 'Language Updated',
                    message: 'Interface display language set to English.',
                  });
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  !isLanguageAuto && language === 'en'
                    ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🇺🇸</span>
                  <span>English</span>
                </div>
                {!isLanguageAuto && language === 'en' && <Check size={13} className="text-[#C4785A]" />}
              </button>

              {/* French */}
              <button
                type="button"
                onClick={() => {
                  setLanguage('fr', false);
                  setLanguageDropdownOpen(false);
                  showToast({
                    type: 'success',
                    title: 'Langue modifiée',
                    message: 'La langue d\'affichage est maintenant le Français.',
                  });
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  !isLanguageAuto && language === 'fr'
                    ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🇫🇷</span>
                  <span>Français</span>
                </div>
                {!isLanguageAuto && language === 'fr' && <Check size={13} className="text-[#C4785A]" />}
              </button>

              {/* Arabic */}
              <button
                type="button"
                onClick={() => {
                  setLanguage('ar', false);
                  setLanguageDropdownOpen(false);
                  showToast({
                    type: 'success',
                    title: 'تم تحديث اللغة',
                    message: 'تم تفعيل اللغة العربية والواجهة من اليمين إلى اليسار.',
                  });
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  !isLanguageAuto && language === 'ar'
                    ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🇩🇿</span>
                  <span>العربية (RTL)</span>
                </div>
                {!isLanguageAuto && language === 'ar' && <Check size={13} className="text-[#C4785A]" />}
              </button>
            </div>
          )}
        </div>

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
                  <Sparkles size={14} className="text-[#C4785A]" />
                  <div className="flex flex-col">
                    <span className="font-semibold">ATRIUM Monolith Cinema</span>
                    <span className="text-[10px] text-neutral-400">Replay Kinetic Typographic Intro</span>
                  </div>
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
