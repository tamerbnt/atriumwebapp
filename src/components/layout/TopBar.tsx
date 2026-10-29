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
  Activity,
  Bell,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { formatDuration } from '../../utils/rules';
import { PMRole, SupportedLanguage } from '../../types/index';
import { Seek } from '../ui/Seek';
import { useTranslation } from '../../utils/useTranslation';
import { BackendDiagnosticPanel } from '../BackendDiagnosticPanel';
import { NotificationDropdown } from './NotificationDropdown';

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
  const { t } = useTranslation();
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
    unreadNotificationCount,
  } = useAtriumStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [topBarSearch, setTopBarSearch] = useState('');
  const [isDiagnosticPanelOpen, setIsDiagnosticPanelOpen] = useState(false);

  const isFreelance = currentBusiness?.category === 'freelance_solo';
  const isRental = currentBusiness?.category === 'rental_booking';
  const isEducation = currentBusiness?.category === 'education_cohort';
  const isPOS = currentBusiness?.category === 'pos_inventory';
  const isProjectMilestone = currentBusiness?.category === 'project_milestone';
  const isTrading = currentBusiness?.category === 'trading_commercial';

  const getBreadcrumb = () => {
    const cat = currentBusiness?.category;
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
      : isTrading
      ? t('nav_trading_dashboard', language)
      : cat === 'medical_clinic'
      ? (language === 'ar' ? 'المركز الطبي' : language === 'fr' ? 'Cabinet Médical' : 'Medical Clinic')
      : cat === 'auto_garage'
      ? (language === 'ar' ? 'ورشة السيارات' : language === 'fr' ? 'Garage Automobile' : 'Auto Garage')
      : cat === 'real_estate'
      ? (language === 'ar' ? 'الوكالة العقارية' : language === 'fr' ? 'Gestion Immobilière' : 'Real Estate')
      : cat === 'manufacturing_production'
      ? (language === 'ar' ? 'المصنع والإنتاج' : language === 'fr' ? 'Manufacture & BOM' : 'Manufacturing')
      : cat === 'legal_accounting'
      ? (language === 'ar' ? 'مكتب المحاماة' : language === 'fr' ? 'Cabinet Juridique' : 'Legal Cabinet')
      : cat === 'logistics_delivery'
      ? (language === 'ar' ? 'اللوجستيك والتوصيل' : language === 'fr' ? 'Messagerie Express' : 'Logistics Dispatch')
      : cat === 'construction_contractor'
      ? (language === 'ar' ? 'إدارة المشاريع BTP' : language === 'fr' ? 'Chantiers BTP' : 'Contractor BTP')
      : cat === 'agriculture_farming'
      ? (language === 'ar' ? 'المستثمرة الفلاحية' : language === 'fr' ? 'Exploitation Agricole' : 'Agriculture & Farm')
      : t('nav_home', language);

    // Dedicated settings breadcrumb
    if (activeScreen === 'settings') {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setScreen(isProjectMilestone ? 'pm_dir_dashboard' : 'dashboard')}
            className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Home size={12} />
            <span>{homeLabel}</span>
          </button>
          <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
          <span className="text-neutral-900 dark:text-white font-semibold">
            {t('nav_settings', language)}
          </span>
        </nav>
      );
    }

    // If in Project & Milestone category or navigating a PM screen, render role & screen breadcrumb
    if (isProjectMilestone || activeScreen.startsWith('pm_')) {
      const pmScreenTitles: Record<string, { role: string; screen: string }> = {
        pm_dir_dashboard: { role: t('pm_role_direction_name'), screen: t('pm_screen_dir_dashboard') },
        pm_dir_new_project: { role: t('pm_role_direction_name'), screen: t('pm_screen_dir_new_project') },
        pm_dir_projects: { role: t('pm_role_direction_name'), screen: t('pm_screen_dir_projects') },
        pm_dir_approvals: { role: t('pm_role_direction_name'), screen: t('pm_screen_dir_approvals') },
        pm_dir_reports: { role: t('pm_role_direction_name'), screen: t('pm_screen_dir_reports') },
        pm_cp_projects: { role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_projects') },
        pm_cp_catalog: { role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_catalog') },
        pm_cp_orders: { role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_orders') },
        pm_cp_files: { role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_deliverables') },
        pm_cp_deliverables: { role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_deliverables') },
        pm_cp_expenses: { role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_expenses') },
        pm_crea_kanban: { role: t('pm_role_crea_name'), screen: t('pm_screen_crea_kanban') },
        pm_crea_production: { role: t('pm_role_crea_name'), screen: t('pm_screen_crea_production') },
        pm_crea_upload: { role: t('pm_role_crea_name'), screen: t('pm_screen_crea_upload') },
        pm_crea_briefs: { role: t('pm_role_crea_name'), screen: t('pm_screen_crea_briefs') },
        pm_sup_missions: { role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_missions') },
        pm_sup_attendance: { role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_attendance') },
        pm_sup_staffing: { role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_staffing') },
        pm_sup_expenses: { role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_expenses') },
        pm_rh_talents: { role: t('pm_role_rh_name'), screen: t('pm_screen_rh_talents') },
        pm_rh_dossier: { role: t('pm_role_rh_name'), screen: t('pm_screen_rh_dossier') },
        pm_rh_portal: { role: t('pm_role_rh_name'), screen: t('pm_screen_rh_portal') },
        pm_rh_walkin: { role: t('pm_role_rh_name'), screen: t('pm_screen_rh_walkin') },
        pm_compta_payroll: { role: t('pm_role_compta_name'), screen: t('pm_screen_compta_payroll') },
        pm_compta_ccp: { role: t('pm_role_compta_name'), screen: t('pm_screen_compta_ccp') },
        pm_compta_expenses: { role: t('pm_role_compta_name'), screen: t('pm_screen_compta_expenses') },
        pm_compta_stock: { role: t('pm_role_compta_name'), screen: t('pm_screen_compta_stock') },
        // Standard ID fallbacks for agency category
        dashboard: { role: t('pm_role_direction_name'), screen: t('pm_screen_dir_dashboard') },
        scheduler: { role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_projects') },
        registrations: { role: t('pm_role_crea_name'), screen: t('pm_screen_crea_kanban') },
        analytics: { role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_missions') },
        members: { role: t('pm_role_rh_name'), screen: t('pm_screen_rh_talents') },
        finance: { role: t('pm_role_compta_name'), screen: t('pm_screen_compta_payroll') },
        shop: { role: t('pm_role_compta_name'), screen: t('pm_screen_compta_stock') },
        history: { role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_attendance') },
      };

      const resolved = pmScreenTitles[activeScreen] || {
        role:
          activePmRole === 'direction'
            ? t('pm_role_direction_name')
            : activePmRole === 'chef_projet'
            ? t('pm_role_chef_projet_name')
            : activePmRole === 'crea'
            ? t('pm_role_crea_name')
            : activePmRole === 'superviseur'
            ? t('pm_role_superviseur_name')
            : activePmRole === 'rh'
            ? t('pm_role_rh_name')
            : t('pm_role_compta_name'),
        screen:
          activePmRole === 'direction'
            ? t('pm_screen_dir_dashboard')
            : activePmRole === 'chef_projet'
            ? t('pm_screen_cp_projects')
            : activePmRole === 'crea'
            ? t('pm_screen_crea_kanban')
            : activePmRole === 'superviseur'
            ? t('pm_screen_sup_missions')
            : activePmRole === 'rh'
            ? t('pm_screen_rh_talents')
            : t('pm_screen_compta_payroll'),
      };

      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setScreen('pm_dir_dashboard')}
            className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Home size={12} />
            <span>{homeLabel}</span>
          </button>
          <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
          <span className="text-neutral-500 font-medium">{resolved.role}</span>
          <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
          <span className="text-neutral-900 dark:text-white font-semibold">{resolved.screen}</span>
        </nav>
      );
    }

    switch (activeScreen) {
      case 'dashboard':
      case 'trading_dashboard':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Home size={13} className="text-[#C4785A]" />
              {homeLabel}
            </span>
          </div>
        );
      case 'trading_sales':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('trading_dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {t('nav_trading_sales', language)}
            </span>
          </nav>
        );
      case 'trading_purchases':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('trading_dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {t('nav_trading_purchases', language)}
            </span>
          </nav>
        );
      case 'trading_inventory':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('trading_dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {t('nav_trading_inventory', language)}
            </span>
          </nav>
        );
      case 'trading_directory':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('trading_dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {t('nav_trading_directory', language)}
            </span>
          </nav>
        );
      case 'trading_catalog':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('trading_dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {t('nav_trading_catalog', language)}
            </span>
          </nav>
        );
      case 'trading_finance':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('trading_dashboard')}
              className="text-neutral-400 hover:text-[#C4785A] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
            <span className="text-neutral-900 dark:text-white font-semibold">
              {t('nav_trading_finance', language)}
            </span>
          </nav>
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
              {isFreelance
                ? t('topbar_solo_timetracker_crumb', language)
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
                {isFreelance ? t('topbar_solo_clients_crumb', language) : isRental ? 'Renters' : isEducation ? 'Students' : isPOS ? 'Customers' : terminology.members}
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
                ? t('topbar_solo_clients_crumb', language)
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
                ? t('topbar_solo_proposals_crumb', language)
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
                ? t('topbar_solo_invoices_crumb', language)
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
                ? t('topbar_solo_deliverables_crumb', language)
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
      case 'agenda':
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
              {language === 'ar' ? 'أجندة مواعيد الأطباء' : language === 'fr' ? 'Agenda Médecins & Rendez-vous' : 'Doctor Agenda & Appointments'}
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
                ? t('topbar_solo_finance_crumb', language)
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
                ? t('topbar_solo_history_crumb', language)
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
      default: {
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
          </nav>
        );
      }
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

        <div>
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
                title={t('topbar_tt_view_timer', language)}
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
                    title={t('topbar_tt_resume_timer', language)}
                  >
                    <Play size={12} className="fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="p-1 rounded-full text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer"
                    title={t('topbar_tt_pause_timer', language)}
                  >
                    <Pause size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopTimer}
                  className="p-1 rounded-full text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer"
                  title={t('topbar_tt_stop_timer', language)}
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
              title={t('topbar_tt_open_timer', language)}
            >
              <Clock size={13} className="text-[#C4785A]" />
              <span>{t('topbar_btn_start_timer', language)}</span>
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



        {/* Supabase Cloud Connection Status Badge / Diagnostics Trigger */}
        <button
          type="button"
          onClick={() => setIsDiagnosticPanelOpen(true)}
          title={
            supabaseStatus === 'connected'
              ? (language === 'ar' ? `متصل بسوبابيس PostgreSQL والبث المباشر (انقر لفتح فحص CRUD)` : language === 'fr' ? `Connecté à Supabase PostgreSQL & temps réel (Cliquer pour ouvrir le diagnostic CRUD)` : `Connected to Supabase PostgreSQL & Realtime (Click for CRUD Diagnostics)`)
              : supabaseStatus === 'connecting'
              ? (language === 'ar' ? 'جارٍ الاتصال بسوبابيس...' : language === 'fr' ? 'Connexion à Supabase...' : 'Connecting to Supabase...')
              : supabaseStatus === 'offline'
              ? (language === 'ar' ? 'الوضع المحلي بدون إنترنت — انقر لتشغيل فحص CRUD' : language === 'fr' ? 'Mode hors-ligne — cliquer pour tester le CRUD' : 'Offline mode — click to run CRUD diagnostics')
              : (language === 'ar' ? 'وضع التخزين المحلي / التجريبي — انقر للفحص' : language === 'fr' ? 'Stockage local / Mode démo — cliquer pour tester' : 'Local Storage / Demo Mode — click for diagnostics')
          }
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer hover:shadow-xs ${
            supabaseStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
              : supabaseStatus === 'connecting'
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
              : supabaseStatus === 'offline'
              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
              : 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 hover:bg-neutral-200/60'
          }`}
        >
          {supabaseStatus === 'connected' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Cloud size={12} />
              <span>{t('topbar_cloud_synced', language)}</span>
            </>
          ) : supabaseStatus === 'connecting' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <RotateCw size={12} className="animate-spin" />
              <span>{t('topbar_syncing', language)}</span>
            </>
          ) : supabaseStatus === 'offline' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <CloudOff size={12} />
              <span>{t('topbar_offline', language)}</span>
            </>
          ) : (
            <>
              <Database size={12} className="text-[#C4785A]" />
              <span>{language === 'ar' ? 'محلي / هجين' : language === 'fr' ? 'Hybride / Local' : 'Hybrid / Local'}</span>
            </>
          )}
        </button>

        {/* Sync / Refresh Button */}
        <button
          type="button"
          onClick={() => syncWithSupabase()}
          title={isSupabaseConfigured ? (language === 'ar' ? 'مزامنة مع سحابة سوبابيس' : language === 'fr' ? 'Synchroniser avec Supabase Cloud' : 'Sync with Supabase Cloud') : (language === 'ar' ? 'تحديث الحالة' : language === 'fr' ? 'Actualiser l\'état' : 'Refresh State')}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
            isSyncing ? 'animate-spin text-[#C4785A]' : ''
          }`}
        >
          <RotateCw size={14} />
        </button>


        {/* TopBar Notification Bell & Center Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            title={language === 'ar' ? 'مركز الإشعارات والتنبيهات' : language === 'fr' ? 'Centre de notifications' : 'Notifications & Alerts'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer relative ${
              notificationsOpen
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            aria-label="Open notifications menu"
          >
            <Bell size={14} />
            {unreadNotificationCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#18181B] ${
                  notificationsOpen ? 'bg-white text-[#C4785A]' : 'bg-[#C4785A] text-white'
                }`}
              >
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>

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
                    setIsDiagnosticPanelOpen(true);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Activity size={14} className="text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {language === 'ar' ? 'فحص جاهزية الخادم وCRUD' : language === 'fr' ? 'Diagnostic CRUD & Serveur' : 'Backend & CRUD Diagnostics'}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {language === 'ar' ? 'اختبار العمليات الحية عبر الـ 7 أنشطة' : language === 'fr' ? 'Audit live des 7 métiers' : 'Live CRUD audit across all 7 verticals'}
                    </span>
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

      <BackendDiagnosticPanel
        isOpen={isDiagnosticPanelOpen}
        onClose={() => setIsDiagnosticPanelOpen(false)}
      />
    </header>
  );
};
