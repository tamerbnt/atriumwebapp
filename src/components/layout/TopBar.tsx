import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Rocket,
  Menu as MenuIcon,
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
  ChevronUp,
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
  Settings,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { formatDuration } from '../../utils/rules';
import { ContractorRole, LegalRole, LogisticsRole, ManufacturingRole, PMRole, RealEstateRole, SupportedLanguage, AgriRole, StandardRole } from '../../types/index';
import { Seek } from '../ui/Seek';
import { useTranslation } from '../../utils/useTranslation';
import { NotificationDropdown } from './NotificationDropdown';
import { PinVerificationModal } from '../modals/PinVerificationModal';
import { Menu, MenuTriggerProps } from '@/atrium';
import { LiveButton, LiveIconButton, LivePopoverPanel, popoverClasses } from '../ui/live';

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
    unreadNotificationCount,
    networkMode,
    setNetworkMode,
    toggleTopBarCollapsed,
    isTopBarCollapsed,
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
  } = useAtriumStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);
  const [topBarSearch, setTopBarSearch] = useState('');

  const [agriPinTargetRole, setAgriPinTargetRole] = useState<AgriRole | null>(null);
  const [agriPinInput, setAgriPinInput] = useState('');
  const [agriPinError, setAgriPinError] = useState(false);
  const [pendingPinAction, setPendingPinAction] = useState<{
    categoryName: string;
    onSuccess: () => void;
  } | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const networkMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  // Exclusive toggle handlers: opening one closes all other dropdowns
  const toggleUserMenu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUserMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setNetworkMenuOpen(false);
        setNotificationsOpen(false);
      }
      return next;
    });
  };

  const toggleNetworkMenu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNetworkMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
      return next;
    });
  };

  const toggleNotifications = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotificationsOpen((prev) => {
      const next = !prev;
      if (next) {
        setUserMenuOpen(false);
        setNetworkMenuOpen(false);
      }
      return next;
    });
  };

  // Auto-close any open dropdown when clicking or touching anywhere outside, or when pressing Escape
  useEffect(() => {
    const isAnyOpen = userMenuOpen || networkMenuOpen || notificationsOpen;
    if (!isAnyOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        const popover = document.querySelector('.i[role="menu"]');
        if (!popover || !popover.contains(target)) {
          setUserMenuOpen(false);
        }
      }

      if (networkMenuOpen && networkMenuRef.current && !networkMenuRef.current.contains(target)) {
        setNetworkMenuOpen(false);
      }

      if (notificationsOpen && notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        const notifPortal = document.querySelector('[role="dialog"][aria-label="Notifications"]');
        if (!notifPortal || !notifPortal.contains(target)) {
          setNotificationsOpen(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setNetworkMenuOpen(false);
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen, networkMenuOpen, notificationsOpen]);

  // Close dropdowns upon screen navigation
  useEffect(() => {
    setUserMenuOpen(false);
    setNetworkMenuOpen(false);
    setNotificationsOpen(false);
  }, [activeScreen]);

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
      case 'staff':
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
              {language === 'ar' ? 'فريق العمل' : language === 'en' ? 'Staff' : 'Équipe'}
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
      className="relative z-30 h-[54px] w-full px-4 sm:px-5 rounded-[27px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 shadow-2xs"
    >
      {/* Left: Mobile Toggle & Working Interactive Breadcrumbs & Facility Capsule */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          aria-label="Toggle mobile navigation menu"
        >
          <MenuIcon size={17} />
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


        {/* Focus Mode / Collapse Header Button */}
        <LiveIconButton
          icon={<ChevronUp size={16} />}
          tone="soft"
          onClick={toggleTopBarCollapsed}
          className="hidden sm:inline-flex !w-8 !h-8 !rounded-full text-neutral-500 dark:text-neutral-400"
          title={t('topbar_focus_hide', "Mode Plein Écran / Masquer l'en-tête (Cmd+\\)")}
          aria-label="Collapse header"
        />



        {/* Sync / Refresh Button */}
        <LiveIconButton
          icon={<RotateCw size={14} className={isSyncing ? 'animate-spin' : ''} />}
          kick="spin"
          tone="soft"
          onClick={() => syncWithSupabase()}
          title={
            isSupabaseConfigured
              ? language === 'ar'
                ? 'مزامنة مع سحابة سوبابيس'
                : language === 'fr'
                ? 'Synchroniser avec Supabase Cloud'
                : 'Sync with Supabase Cloud'
              : language === 'ar'
              ? 'تحديث الحالة'
              : language === 'fr'
              ? "Actualiser l'état"
              : 'Refresh State'
          }
          aria-label="Refresh and sync"
        />

        {/* TopBar Notification Bell & Center Trigger */}
        <div ref={notificationMenuRef} className="relative">
          <LiveIconButton
            icon={<Bell size={15} />}
            badge={unreadNotificationCount > 0 ? (unreadNotificationCount > 9 ? '9+' : unreadNotificationCount) : null}
            tone={notificationsOpen ? 'accent' : 'soft'}
            onClick={toggleNotifications}
            title={language === 'ar' ? 'مركز الإشعارات والتنبيهات' : language === 'fr' ? 'Centre de notifications' : 'Notifications & Alerts'}
            aria-label="Open notifications menu"
            className="!w-8 !h-8 !rounded-full"
          />

          <NotificationDropdown
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>

        {/* User Identity Menu using Atrium Menu with liquid blooming panel */}
        <div className="relative">
          <Menu
            placement="bottom-end"
            aria-label="Account menu"
            header={
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#d4522f] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="truncate block leading-snug">{currentUser.fullName}</b>
                  <small className="truncate block opacity-75">{currentUser.email}</small>
                  <div className="mt-0.5">
                    <span className="inline-block text-[10px] font-semibold text-[#d4522f] capitalize">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>
            }
            items={[
              {
                id: 'lock',
                label: language === 'ar' ? 'قفل الجهاز / تبديل الموظف' : language === 'fr' ? "Verrouiller / Changer d'agent" : 'Lock Terminal / Switch Staff',
                description: language === 'ar' ? 'التبديل الفوري برمز PIN السريع' : 'Fast PIN operator switch',
                icon: <Lock size={15} />,
                onSelect: () => openFastSwitch(),
              },
              {
                id: 'wizard',
                label: language === 'ar' ? 'معالج إعداد النشاط التجاري' : 'Business Onboarding Wizard',
                description: 'Launch initial setup guide',
                icon: <Sparkles size={15} />,
                onSelect: () => openOnboarding(),
              },
              {
                id: 'voucher',
                label: language === 'ar' ? 'تفعيل قسيمة الترخيص الدائم' : 'Redeem Lifetime Voucher',
                description: 'Prepaid lifetime license activation',
                icon: <Rocket size={15} />,
                onSelect: () => onOpenVoucherModal?.(),
              },
              {
                id: 'settings',
                label: t('settings_title', language),
                description: language === 'ar' ? 'إعدادات النظام والسمات والمظهر' : language === 'fr' ? 'Préférences, thème & apparence' : 'Preferences, theme & appearance',
                icon: <Settings size={15} />,
                onSelect: () => setScreen('settings'),
              },
              { type: 'separator' },
              {
                id: 'logout',
                label: language === 'ar' ? 'تسجيل الخروج' : language === 'fr' ? 'Se déconnecter' : 'Sign Out',
                description: currentUser.email,
                icon: <LogOut size={15} />,
                danger: true,
                onSelect: () => logout(),
              },
            ]}
            trigger={(props: MenuTriggerProps, { open }: { open: boolean }) => (
              <LiveButton
                {...props}
                tone="soft"
                className={`!rounded-full !pl-1.5 !pr-2.5 !py-1 !h-[34px] !max-h-[34px] border cursor-pointer select-none ${
                  open
                    ? '!border-neutral-400 dark:!border-neutral-500 shadow-xs'
                    : 'border-neutral-200/80 dark:border-neutral-700/70'
                }`}
                aria-label={`Operator: ${currentUser.fullName} (${currentUser.role})`}
              >
                <div className="w-6 h-6 rounded-full bg-[#d4522f] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left rtl:text-right min-w-0">
                  <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 leading-tight truncate max-w-[110px]">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                </div>
                <ChevronDown
                  size={12}
                  className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </LiveButton>
            )}
          />
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
