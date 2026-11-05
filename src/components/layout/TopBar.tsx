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
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { formatDuration } from '../../utils/rules';
import { Seek } from '../ui/Seek';
import { useTranslation } from '../../utils/useTranslation';
import { NotificationDropdown } from './NotificationDropdown';
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
    isTopBarAutoHide,
    toggleTopBarAutoHide,
  } = useAtriumStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);
  const [topBarSearch, setTopBarSearch] = useState('');

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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
            className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
            className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              <Home size={13} className="text-[#d4522f]" />
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
                className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Home size={12} />
                <span>{homeLabel}</span>
              </button>
              <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600" />
              <button
                type="button"
                onClick={() => selectMember(null)}
                className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              className="text-neutral-400 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
      className="w-full h-full flex items-center justify-between gap-3 shrink-0 select-none"
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
                className="font-bold text-neutral-900 dark:text-white font-mono tabular-nums hover:text-[#d4522f] transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 hover:text-[#d4522f] transition-colors cursor-pointer"
              title={t('topbar_tt_open_timer', language)}
            >
              <Clock size={13} className="text-[#d4522f]" />
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
                id: 'autohide',
                label: isTopBarAutoHide
                  ? (language === 'ar' ? 'تعطيل الإخفاء التلقائي للشريط' : language === 'fr' ? 'Désactiver masquage auto' : 'Disable Top Bar Auto-hide')
                  : (language === 'ar' ? 'تفعيل الإخفاء التلقائي عند التمرير' : language === 'fr' ? 'Activer masquage auto' : 'Enable Top Bar Auto-hide'),
                description: isTopBarAutoHide ? 'Top bar is floating / auto-hiding' : 'Top bar stays permanently visible',
                icon: <ChevronUp size={15} />,
                onSelect: () => toggleTopBarAutoHide(),
              },
              {
                id: 'fullscreen',
                label: isFullscreen
                  ? (language === 'ar' ? 'إنهاء وضع ملء الشاشة' : language === 'fr' ? 'Quitter le mode plein écran' : 'Exit Fullscreen')
                  : (language === 'ar' ? 'وضع ملء الشاشة' : language === 'fr' ? 'Mode plein écran' : 'Full Screen Mode'),
                description: isFullscreen
                  ? (language === 'ar' ? 'الرجوع إلى العرض العادي' : 'Return to standard window')
                  : (language === 'ar' ? 'توسيع واجهة النظام على كامل الشاشة' : 'Expand workspace to full display'),
                icon: isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />,
                onSelect: () => toggleFullscreen(),
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

    </header>
  );
};
