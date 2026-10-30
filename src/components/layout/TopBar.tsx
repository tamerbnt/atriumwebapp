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
import { ContractorRole, LegalRole, LogisticsRole, ManufacturingRole, PMRole, RealEstateRole, SupportedLanguage, AgriRole, StandardRole } from '../../types/index';
import { Seek } from '../ui/Seek';
import { useTranslation } from '../../utils/useTranslation';
import { BackendDiagnosticPanel } from '../BackendDiagnosticPanel';
import { NotificationDropdown } from './NotificationDropdown';
import { PinVerificationModal } from '../modals/PinVerificationModal';

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
    activeGarageRole,
    setActiveGarageRole,
    activeRealEstateRole,
    setActiveRealEstateRole,
    activeManufacturingRole,
    setActiveManufacturingRole,
    activeLegalRole,
    setActiveLegalRole,
    activeLogisticsRole,
    setActiveLogisticsRole,
    activeContractorRole,
    setActiveContractorRole,
    activeAgriRole,
    setActiveAgriRole,
    activeMembershipRole,
    setActiveMembershipRole,
    activeAppointmentRole,
    setActiveAppointmentRole,
    activePosRole,
    setActivePosRole,
    activeEducationRole,
    setActiveEducationRole,
    unreadNotificationCount,
    networkMode,
    setNetworkMode,
  } = useAtriumStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);
  const [topBarSearch, setTopBarSearch] = useState('');
  const [isDiagnosticPanelOpen, setIsDiagnosticPanelOpen] = useState(false);
  const [agriPinTargetRole, setAgriPinTargetRole] = useState<AgriRole | null>(null);
  const [agriPinInput, setAgriPinInput] = useState('');
  const [agriPinError, setAgriPinError] = useState(false);
  const [pendingPinAction, setPendingPinAction] = useState<{
    categoryName: string;
    onSuccess: () => void;
  } | null>(null);

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

      {/* Automotive Garage Role Switcher */}
      {currentBusiness?.category === 'auto_garage' && (
        <div className="hidden lg:flex items-center gap-1 p-1 bg-neutral-100/90 dark:bg-neutral-800/90 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            { id: 'gerant', label: language === 'ar' ? 'المدير' : 'Gérant', icon: '👔', desc: 'Direction & Marges' },
            { id: 'reception', label: language === 'ar' ? 'الاستقبال' : 'Réception', icon: '📋', desc: 'Entrées & Devis' },
            { id: 'mecanicien', label: language === 'ar' ? 'الميكانيك' : 'Atelier', icon: '🔧', desc: 'Ponts & Diagnostics' },
            { id: 'magasinier', label: language === 'ar' ? 'المخزن' : 'Magasin', icon: '📦', desc: 'Pièces & Bacs' },
            { id: 'caisse', label: language === 'ar' ? 'الصندوق' : 'Caisse', icon: '💳', desc: 'Factures DGI & Règlements' },
          ].map((r) => {
            const isActive = activeGarageRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveGarageRole(r.id as any)}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Real Estate Operational Role Switcher (Development Phase) */}
      {currentBusiness?.category === 'real_estate' && (
        <div className="hidden lg:flex items-center gap-1 p-1 bg-neutral-100/90 dark:bg-neutral-800/90 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'direction' as RealEstateRole,
              label: language === 'ar' ? 'الإدارة' : 'Direction',
              icon: '👔',
              desc: language === 'ar' ? 'إدارة الوكالة، جميع الشاشات والإعدادات' : 'Direction, Toutes les vues & Paramètres',
            },
            {
              id: 'negociateur' as RealEstateRole,
              label: language === 'ar' ? 'مستشار عقاري' : 'Négociateur',
              icon: '🤝',
              desc: language === 'ar' ? 'سجل الوكالات، العقارات ووصولات المعاينة' : 'Mandats 09-18, Biens & Bons de Visite GPS',
            },
            {
              id: 'gestionnaire_locatif' as RealEstateRole,
              label: language === 'ar' ? 'إدارة الإيجار' : 'Gestion Locative',
              icon: '🔑',
              desc: language === 'ar' ? 'عقود الإيجار، وصولات الدفع وحالة الأماكن' : 'Baux, Quittances Art. 317 & États des Lieux',
            },
            {
              id: 'notaire_compta' as RealEstateRole,
              label: language === 'ar' ? 'الموثق والمحاسبة' : 'Notaire & Compta',
              icon: '⚖️',
              desc: language === 'ar' ? 'حسابات الموثق، الضرائب ومستحقات الملاك' : 'Frais Notaire 08-243, DGI & Trésorerie',
            },
          ].map((r) => {
            const isActive = activeRealEstateRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRealEstateRole(r.id)}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Light Manufacturing Operational Role Switcher (Development Phase) */}
      {currentBusiness?.category === 'manufacturing_production' && (
        <div className="hidden lg:flex items-center gap-1 p-1 bg-neutral-100/90 dark:bg-neutral-800/90 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'gerant' as ManufacturingRole,
              label: language === 'ar' ? 'الإدارة' : 'Direction',
              icon: '👔',
              desc: language === 'ar' ? 'إدارة المصنع، هوامش الربح والفوترة' : 'Direction Usine, Marges & DGI',
            },
            {
              id: 'chef_atelier' as ManufacturingRole,
              label: language === 'ar' ? 'رئيس الورشة' : 'Chef Atelier',
              icon: '🏭',
              desc: language === 'ar' ? 'أوامر التصنيع، بطاقات المكونات والإنتاج' : 'Méthodes, OFs, BOM & Lancement',
            },
            {
              id: 'operateur' as ManufacturingRole,
              label: language === 'ar' ? 'مشغل الآلة' : 'Opérateur',
              icon: '⏱️',
              desc: language === 'ar' ? 'شاشة اللمس اللوحية، توقيت المهام وتصريح القطع' : 'Terminal Tablette Kiosk & Chrono',
            },
            {
              id: 'magasinier' as ManufacturingRole,
              label: language === 'ar' ? 'أمين المخزن' : 'Magasinier',
              icon: '📦',
              desc: language === 'ar' ? 'المواد الأولية، وصولات الاستلام والخروج' : 'Matières, BSM Décret 05 & Stocks',
            },
            {
              id: 'qualite' as ManufacturingRole,
              label: language === 'ar' ? 'مراقب الجودة' : 'Qualité',
              icon: '🛡️',
              desc: language === 'ar' ? 'سجل مراقبة الجودة، الحجر الصحي وإجراءات IANOR' : 'Contrôle Qualité, Tests & Quarantaine',
            },
          ].map((r) => {
            const isActive = activeManufacturingRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveManufacturingRole(r.id)}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category 13: Legal Cabinet, Notary Study & Accounting Firm — Dedicated Operational Role Switcher */}
      {currentBusiness?.category === 'legal_accounting' && (
        <div className="hidden lg:flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'avocat_associe' as LegalRole,
              label: language === 'ar' ? 'المحامي الشريك' : 'Avocat Associé',
              icon: '⚖️',
              desc: language === 'ar' ? 'إدارة القضايا، الجلسات، مواعيد الاستئناف والعرائض' : 'Contentieux, Audiences, Délais CPCA & Requêtes',
            },
            {
              id: 'notaire_titulaire' as LegalRole,
              label: language === 'ar' ? 'الموثق المسؤول' : 'Notaire Titulaire',
              icon: '📜',
              desc: language === 'ar' ? 'سجل العقود الرسمية، تعريفة 08-243 والودائع' : 'Répertoire des Actes, Décret 08-243 & Séquestre',
            },
            {
              id: 'expert_comptable' as LegalRole,
              label: language === 'ar' ? 'خبير المحاسبة' : 'Expert-Comptable',
              icon: '📊',
              desc: language === 'ar' ? 'دفتر الأستاذ SCF، ميزان المراجعة والتصريح الجبائي G50' : 'Grand Livre SCF, Bilan/TCR, G50 & Audit',
            },
            {
              id: 'secretaire_caisse' as LegalRole,
              label: language === 'ar' ? 'أمانة الصندوق والضبط' : 'Secrétaire & Caisse',
              icon: '💼',
              desc: language === 'ar' ? 'استقبال الموكلين، الصندوق، طابع المادة 317 ومحضر الإغلاق' : 'Accueil, Caisse Art. 317, Reçus & Clôture',
            },
          ].map((r) => {
            const isActive = activeLegalRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveLegalRole(r.id)}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category 14: Logistics, Couriers & Parcel Dispatch — Dedicated Operational Role Switcher */}
      {currentBusiness?.category === 'logistics_delivery' && (
        <div className="hidden lg:flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'gerant' as LogisticsRole,
              label: language === 'ar' ? 'المدير العام' : 'Gérant',
              icon: '👔',
              desc: language === 'ar' ? 'مؤشرات 58 ولاية، شبكة الأسعار ومستحقات التجار وCCP' : 'Direction, Tarifs 58 Wilayas, Bilan COD & Règlements CCP',
            },
            {
              id: 'dispatcher' as LogisticsRole,
              label: language === 'ar' ? 'الموزع / Régulateur' : 'Régulateur',
              icon: '📡',
              desc: language === 'ar' ? 'إسناد الرحلات للسائقين، بيانات الشحن LVR وإدارة الإخفاقات' : 'Tournées Livreurs, Manifestes LVR Décret 05-468 & Échecs',
            },
            {
              id: 'hub_sorter' as LogisticsRole,
              label: language === 'ar' ? 'عامل الفرز' : 'Agent de Tri',
              icon: '📦',
              desc: language === 'ar' ? 'المسح السريع، أكياس الشحن Sacs-Navette والختم الأمني' : 'Scanner Haute Cadence, Sacs-Navette & Scellés de Sécurité',
            },
            {
              id: 'stop_desk_agent' as LogisticsRole,
              label: language === 'ar' ? 'مكتب الاستلام' : 'Stop-Desk',
              icon: '🏢',
              desc: language === 'ar' ? 'تسليم الطرود برمز OTP، بطاقة الهوية CNI وصندوق اليومية' : 'Rayonnage, Retrait OTP, Vérification CNI & Caisse',
            },
          ].map((r) => {
            const isActive = activeLogisticsRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveLogisticsRole(r.id)}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category 15: Construction, General Contracting & BTP — Dedicated Operational Role Switcher */}
      {currentBusiness?.category === 'construction_contractor' && (
        <div className="hidden lg:flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'gerant' as ContractorRole,
              label: language === 'ar' ? 'المدير العام' : language === 'fr' ? 'Gérant' : 'Director',
              icon: '👔',
              desc:
                language === 'ar'
                  ? 'الصفقات العمومية، الكفالات المصرفية وأوامر الخدمة OS'
                  : 'Marchés Publics, Cautions Bancaires & Ordres de Service (OS)',
            },
            {
              id: 'conducteur' as ContractorRole,
              label: language === 'ar' ? 'مدير الأشغال' : language === 'fr' ? 'Conducteur' : 'Site Ops',
              icon: '📐',
              desc:
                language === 'ar'
                  ? 'متابعة الورشات، مخطط جانت، اختبارات CTC والتعاقد من الباطن'
                  : 'Multi-Chantiers, Planning Gantt, Laboratoire CTC & Sous-Traitance',
            },
            {
              id: 'chef_chantier' as ContractorRole,
              label: language === 'ar' ? 'رئيس الورشة' : language === 'fr' ? 'Chef Chantier' : 'Foreman',
              icon: '🦺',
              desc:
                language === 'ar'
                  ? 'تسجيل الحضور اليومي، دفتر الورشة، وصولات الخرسانة BPE والوقود'
                  : 'Pointage Journalier, Journal de Chantier, Bons BPE & Gasoil',
            },
            {
              id: 'metreur' as ContractorRole,
              label: language === 'ar' ? 'مهندس القياس' : language === 'fr' ? 'Métreur' : 'Estimator',
              icon: '📊',
              desc:
                language === 'ar'
                  ? 'الكشف الكمي والتقديري DQE/BPU، الكشوف التناقضية ومراجعة الأسعار'
                  : 'DQE, Bordereau BPU, Attachements Contradictoires & Révision des Prix',
            },
            {
              id: 'comptable' as ContractorRole,
              label: language === 'ar' ? 'المحاسب المالي' : language === 'fr' ? 'Comptable BTP' : 'Accountant',
              icon: '📑',
              desc:
                language === 'ar'
                  ? 'الكشوف المؤقتة المرسوم 15-247، ملف تعويض CACOBATPH 48h وصندوق الورشة'
                  : 'Décomptes Provisoires Décret 15-247, Dossier CACOBATPH 48h & Caisse Art. 317',
            },
          ].map((r) => {
            const isActive =
              activeContractorRole === r.id ||
              (r.id === 'conducteur' && activeContractorRole === 'conducteur_travaux') ||
              (r.id === 'metreur' && activeContractorRole === 'daf_metreur');
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveContractorRole(r.id)}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category 17: Agriculture & Livestock Farming — Dedicated Operational Role Switcher with PIN */}
      {currentBusiness?.category === 'agriculture_farming' && (
        <div className="hidden lg:flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'gerant' as AgriRole,
              label: language === 'ar' ? 'المدير / الفلاح' : language === 'fr' ? 'Gérant' : 'Farm Director',
              icon: '👔',
              desc:
                language === 'ar'
                  ? 'الإدارة العامة، قروض بدر BADR الرفيق، المالية والامتيازات الفلاحية'
                  : 'Direction Générale, Crédit BADR R\'FIG, Finances & Concessions',
            },
            {
              id: 'chef_culture' as AgriRole,
              label: language === 'ar' ? 'مسؤول الزراعة' : language === 'fr' ? 'Chef Culture' : 'Crop Lead',
              icon: '🌱',
              desc:
                language === 'ar'
                  ? 'القطع الفلاحية، السجل الزراعي، الأمان الكيميائي DAR وحضور العمال'
                  : 'Parcelles, Cycles Culturaux, Sécurité DAR & Pointage Harvesters',
            },
            {
              id: 'zootechnicien' as AgriRole,
              label: language === 'ar' ? 'مسؤول الأبقار والحليب' : language === 'fr' ? 'Zootechnicien' : 'Dairy Lead',
              icon: '🐄',
              desc:
                language === 'ar'
                  ? 'قطيع الأبقار الحلوب، الحلب اليومي، خزان التبريد ودعم أونيل 12 دج/لتر'
                  : 'Cheptel Laitier, Traite Matin/Soir, Tank & Dossier ONIL 12 DA/L',
            },
            {
              id: 'magasinier' as AgriRole,
              label: language === 'ar' ? 'أمين المخزن والميزان' : language === 'fr' ? 'Magasinier Caisse' : 'Weigh Desk',
              icon: '⚖️',
              desc:
                language === 'ar'
                  ? 'جسر الوزن، أسواق الجملة، وصولات الشحن وصندوق طابع المادة 317'
                  : 'Pont-Bascule, Expéditions Gros, Bons de Pesée & Caisse Art. 317',
            },
          ].map((r) => {
            const isActive = activeAgriRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (isActive) return;
                  if (r.id === 'gerant') {
                    setAgriPinTargetRole(r.id);
                    setAgriPinInput('');
                    setAgriPinError(false);
                  } else {
                    setActiveAgriRole(r.id);
                    showToast({
                      type: 'success',
                      title: language === 'ar' ? `تم تفعيل دور: ${r.label}` : `Espace activé : ${r.label}`,
                      message: r.desc,
                    });
                  }
                }}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category: Gym & Fitness (membership_session) — Dual Role Switcher */}
      {currentBusiness?.category === 'membership_session' && (
        <div className="hidden lg:flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'owner' as StandardRole,
              label: language === 'ar' ? 'المدير العام' : language === 'fr' ? 'Gérant Salle' : 'Owner',
              icon: '👔',
              desc: language === 'ar' ? 'الاشتراكات، الأرباح، والمالية' : 'Gestion complète, abonnements & P&L',
            },
            {
              id: 'staff' as StandardRole,
              label: language === 'ar' ? 'الاستقبال والمسح' : language === 'fr' ? 'Accueil & Scan' : 'Staff Desk',
              icon: '⚡',
              desc: language === 'ar' ? 'مكتب التحقق من الدخول، مسح الباركود، والتذاكر اليومية' : 'Pointage rapide, scan code-barres & pass séance',
            },
          ].map((r) => {
            const isActive = activeMembershipRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (isActive) return;
                  if (r.id === 'owner') {
                    setPendingPinAction({
                      categoryName: language === 'ar' ? 'قاعة اللياقة البدنية' : 'Salle de Sport',
                      onSuccess: () => {
                        setActiveMembershipRole('owner');
                        showToast({
                          type: 'success',
                          title: language === 'ar' ? 'تم تفعيل صلاحيات المدير' : 'Mode Gérant Activé',
                          message: language === 'ar' ? 'تم فتح جميع الشاشات والتقارير المالية' : 'Accès déverrouillé aux finances et paramètres.',
                        });
                      },
                    });
                  } else {
                    setActiveMembershipRole('staff');
                    showToast({
                      type: 'info',
                      title: language === 'ar' ? 'تم تفعيل وضع الاستقبال السريع' : 'Kiosk Accueil Activé',
                      message: language === 'ar' ? 'واجهة مخصصة للمسح السريع وتسجيل الدخول' : 'Espace optimisé pour la vérification des accès.',
                    });
                  }
                }}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category: Salon & Beauty (appointment_service) — Dual Role Switcher */}
      {currentBusiness?.category === 'appointment_service' && (
        <div className="hidden lg:flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'owner' as StandardRole,
              label: language === 'ar' ? 'المدير العام' : language === 'fr' ? 'Gérant Salon' : 'Owner',
              icon: '👔',
              desc: language === 'ar' ? 'المالية، عمولات الحلاقين، والإعدادات' : 'Finances, commissions & catalogue prestations',
            },
            {
              id: 'staff' as StandardRole,
              label: language === 'ar' ? 'كشك الصالون' : language === 'fr' ? 'Fauteuils Express' : 'Staff Chair',
              icon: '✂️',
              desc: language === 'ar' ? 'محطات العمل، ترتيب الزبائن، والتحصيل السريع' : 'File du jour, suivi des postes & encaissement rapide',
            },
          ].map((r) => {
            const isActive = activeAppointmentRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (isActive) return;
                  if (r.id === 'owner') {
                    setPendingPinAction({
                      categoryName: language === 'ar' ? 'صالون التجميل' : 'Salon & Beauté',
                      onSuccess: () => {
                        setActiveAppointmentRole('owner');
                        showToast({
                          type: 'success',
                          title: language === 'ar' ? 'تم تفعيل صلاحيات المدير' : 'Mode Gérant Activé',
                          message: language === 'ar' ? 'تم فتح المالية وعمولات الفريق' : 'Accès aux commissions et bilan salon.',
                        });
                      },
                    });
                  } else {
                    setActiveAppointmentRole('staff');
                    showToast({
                      type: 'info',
                      title: language === 'ar' ? 'تم تفعيل كشك العمليات' : 'Kiosk Fauteuils Activé',
                      message: language === 'ar' ? 'واجهة سريعة لمتابعة الزبائن ومحطات العمل' : 'Espace optimisé pour le déroulement des prestations.',
                    });
                  }
                }}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category: Restaurant & Retail POS (pos_inventory) — Dual Role Switcher */}
      {currentBusiness?.category === 'pos_inventory' && (
        <div className="hidden lg:flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'owner' as StandardRole,
              label: language === 'ar' ? 'المدير العام' : language === 'fr' ? 'Gérant Caisse' : 'Owner',
              icon: '👔',
              desc: language === 'ar' ? 'هوامش الربح، أسعار التكلفة، وإدارة المخزون' : 'Haut niveau, marges & PMP masqués pour l\'équipe',
            },
            {
              id: 'staff' as StandardRole,
              label: language === 'ar' ? 'كاشير نقطة البيع' : language === 'fr' ? 'Caisse Express' : 'Cashier',
              icon: '🛒',
              desc: language === 'ar' ? 'واجهة بيع سريعة مع إخفاء هوامش وتكلفة المنتجات' : 'Caisse tactile haute vitesse avec masquage des marges',
            },
          ].map((r) => {
            const isActive = activePosRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (isActive) return;
                  if (r.id === 'owner') {
                    setPendingPinAction({
                      categoryName: language === 'ar' ? 'نقطة البيع والتجزئة' : 'Caisse & Commerce',
                      onSuccess: () => {
                        setActivePosRole('owner');
                        showToast({
                          type: 'success',
                          title: language === 'ar' ? 'تم تفعيل صلاحيات المدير' : 'Mode Gérant Activé',
                          message: language === 'ar' ? 'إظهار هوامش الربح وأسعار التكلفة' : 'Marges et PMP déverrouillés.',
                        });
                      },
                    });
                  } else {
                    setActivePosRole('staff');
                    showToast({
                      type: 'info',
                      title: language === 'ar' ? 'تم تفعيل وضع الكاشير' : 'Mode Caisse Rapide Activé',
                      message: language === 'ar' ? 'واجهة بيع سريعة بدون معلومات التكلفة' : 'Informations de rentabilité masquées pour l\'équipe.',
                    });
                  }
                }}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category: Education & Academy (education_cohort) — Dual Role Switcher */}
      {currentBusiness?.category === 'education_cohort' && (
        <div className="hidden lg:flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
          {[
            {
              id: 'owner' as StandardRole,
              label: language === 'ar' ? 'إدارة الأكاديمية' : language === 'fr' ? 'Direction' : 'Owner',
              icon: '👔',
              desc: language === 'ar' ? 'ديون الدراسة، تحصيل الرسوم، والتقارير' : 'Comptabilité scolarité, impayés & pilotage académique',
            },
            {
              id: 'staff' as StandardRole,
              label: language === 'ar' ? 'أستاذ / منسق' : language === 'fr' ? 'Appel Express' : 'Instructor',
              icon: '📝',
              desc: language === 'ar' ? 'تسجيل الحضور السريع بلمسة واحدة بدون كشف الديون' : 'Kiosk de pointage rapide en 1 clic sans données financières',
            },
          ].map((r) => {
            const isActive = activeEducationRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (isActive) return;
                  if (r.id === 'owner') {
                    setPendingPinAction({
                      categoryName: language === 'ar' ? 'الأكاديمية والتعليم' : 'Académie & Formation',
                      onSuccess: () => {
                        setActiveEducationRole('owner');
                        showToast({
                          type: 'success',
                          title: language === 'ar' ? 'تم تفعيل صلاحيات الإدارة' : 'Mode Direction Activé',
                          message: language === 'ar' ? 'تم فتح كشوف المستحقات والتقارير' : 'Accès aux créances et bilan financier scolarité.',
                        });
                      },
                    });
                  } else {
                    setActiveEducationRole('staff');
                    showToast({
                      type: 'info',
                      title: language === 'ar' ? 'تم تفعيل وضع الأستاذ والمنسق' : 'Kiosk Appel Activé',
                      message: language === 'ar' ? 'تسجيل الحضور الفوري للدروس' : 'Pointage rapide des présences sans données financières.',
                    });
                  }
                }}
                title={r.desc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
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

        {/* Network & Skeleton Loading Simulation Control */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNetworkMenuOpen(!networkMenuOpen)}
            title="Simulate Network Condition & Skeleton Loading"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                networkMode === 'online'
                  ? 'bg-emerald-500'
                  : networkMode === 'slow_3g'
                  ? 'bg-amber-500 animate-pulse'
                  : networkMode === 'offline'
                  ? 'bg-rose-500'
                  : 'bg-purple-500 animate-pulse'
              }`}
            />
            <span className="capitalize font-mono text-[10px]">
              {networkMode === 'online'
                ? 'Online'
                : networkMode === 'slow_3g'
                ? 'Slow 3G'
                : networkMode === 'offline'
                ? 'Offline'
                : 'Freeze Skel'}
            </span>
            <ChevronDown size={10} className="text-neutral-400" />
          </button>

          {networkMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800/80 font-semibold text-neutral-500 dark:text-neutral-400 text-[10px] uppercase tracking-wider">
                Network & Loading Test
              </div>
              {[
                { id: 'online', label: 'Online (Live Data)', desc: 'Normal network conditions' },
                { id: 'slow_3g', label: 'Slow 3G (3s Delay)', desc: 'Tests skeleton & timeout fallback' },
                { id: 'offline', label: 'Offline Mode', desc: 'Tests cached fallback & retry banner' },
                { id: 'force_skeleton', label: 'Freeze Skeleton', desc: 'Inspect skeleton wireframes' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setNetworkMode(opt.id as any);
                    setNetworkMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex flex-col hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer ${
                    networkMode === opt.id ? 'bg-[#C4785A]/10 text-[#C4785A] font-semibold' : 'text-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt.label}</span>
                    {networkMode === opt.id && <Check size={13} className="text-[#C4785A]" />}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-normal">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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

      {/* Agriculture PIN Verification Modal */}
      {agriPinTargetRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center mx-auto mb-3 text-xl">
              <Lock size={22} />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
              {language === 'ar' ? 'رمز الأمان لمكتب المدير الفلاحي' : 'Code PIN Direction Agricole'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              {language === 'ar'
                ? 'أدخل رمز PIN لتفعيل صلاحيات المدير المالي والبنكي (الافتراضي: 0000)'
                : 'Veuillez saisir votre code PIN pour accéder aux dossiers financiers & BADR (Défaut: 0000)'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (agriPinInput === '0000' || agriPinInput === '1234') {
                  setActiveAgriRole(agriPinTargetRole);
                  setAgriPinTargetRole(null);
                  showToast({
                    type: 'success',
                    title: language === 'ar' ? 'تم تأكيد الرمز بنجاح' : 'Code PIN Validé',
                    message: language === 'ar' ? 'مرحباً بك في لوحة تحكم المدير الفلاحي' : 'Accès Direction Agricole déverrouillé.',
                  });
                } else {
                  setAgriPinError(true);
                }
              }}
              className="space-y-4"
            >
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={agriPinInput}
                onChange={(e) => {
                  setAgriPinInput(e.target.value);
                  setAgriPinError(false);
                }}
                placeholder="••••"
                className={`w-36 mx-auto text-center tracking-widest text-2xl font-mono py-2 px-3 border rounded-xl bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#C4785A] ${
                  agriPinError ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-neutral-300 dark:border-neutral-700'
                }`}
              />

              {agriPinError && (
                <p className="text-xs text-rose-500 font-medium">
                  {language === 'ar' ? 'الرمز غير صحيح (الرمز الافتراضي: 0000)' : 'Code PIN incorrect (par défaut: 0000)'}
                </p>
              )}

              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setAgriPinTargetRole(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white shadow-xs cursor-pointer"
                >
                  {language === 'ar' ? 'تأكيد ودخول' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BackendDiagnosticPanel
        isOpen={isDiagnosticPanelOpen}
        onClose={() => setIsDiagnosticPanelOpen(false)}
      />

      {/* Generic Dual-Role PIN Verification Modal */}
      <PinVerificationModal
        isOpen={!!pendingPinAction}
        onClose={() => setPendingPinAction(null)}
        onSuccess={() => {
          if (pendingPinAction) {
            pendingPinAction.onSuccess();
            setPendingPinAction(null);
          }
        }}
        title={
          language === 'ar'
            ? `رمز الأمان: ${pendingPinAction?.categoryName || 'المدير العام'}`
            : language === 'fr'
            ? `Code PIN Gérant — ${pendingPinAction?.categoryName || 'Direction'}`
            : `Owner PIN — ${pendingPinAction?.categoryName || 'Management'}`
        }
      />
    </header>
  );
};
