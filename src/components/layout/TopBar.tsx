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
      ? t('nav_home', language)
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
      ? (language === 'ar' ? 'العيادة' : language === 'fr' ? 'Clinique' : 'Clinic')
      : cat === 'auto_garage'
      ? (language === 'ar' ? 'الورشة' : language === 'fr' ? 'Garage' : 'Garage')
      : cat === 'real_estate'
      ? (language === 'ar' ? 'العقارات' : language === 'fr' ? 'Immobilier' : 'Real Estate')
      : cat === 'manufacturing_production'
      ? (language === 'ar' ? 'المصنع' : language === 'fr' ? 'Usine' : 'Factory')
      : cat === 'legal_accounting'
      ? (language === 'ar' ? 'المكتب' : language === 'fr' ? 'Cabinet' : 'Practice')
      : cat === 'logistics_delivery'
      ? (language === 'ar' ? 'التوصيل' : language === 'fr' ? 'Livraison' : 'Logistics')
      : cat === 'construction_contractor'
      ? (language === 'ar' ? 'المشاريع' : language === 'fr' ? 'Chantiers' : 'Projects')
      : cat === 'agriculture_farming'
      ? (language === 'ar' ? 'المزرعة' : language === 'fr' ? 'Domaine' : 'Farm')
      : t('nav_home', language);

    // Dedicated settings breadcrumb
    if (activeScreen === 'settings') {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setScreen(isProjectMilestone ? 'pm_dir_dashboard' : 'dashboard')}
            className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Home size={12} />
            <span>{homeLabel}</span>
          </button>
          <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
          <span className="text-black dark:text-white font-semibold">
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
            className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Home size={12} />
            <span>{homeLabel}</span>
          </button>
          <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
          <span className="text-black/70 dark:text-white/75 font-medium">{resolved.role}</span>
          <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
          <span className="text-black dark:text-white font-semibold">{resolved.screen}</span>
        </nav>
      );
    }

    switch (activeScreen) {
      case 'dashboard':
      case 'trading_dashboard':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {isFreelance
                ? t('topbar_solo_timetracker_crumb', language)
                : isRental
                ? (language === 'ar' ? 'الإشغال' : language === 'fr' ? 'Occupation' : 'Occupancy')
                : isEducation
                ? t('nav_edu_attendance', language)
                : t('nav_analytics', language)}
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
                className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Home size={12} />
                <span>{homeLabel}</span>
              </button>
              <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
              <button
                type="button"
                onClick={() => selectMember(null)}
                className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors cursor-pointer"
              >
                {isFreelance ? t('topbar_solo_clients_crumb', language) : terminology.members}
              </button>
              <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
              <span className="text-black dark:text-white font-semibold truncate max-w-[130px] sm:max-w-[200px]">
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {isFreelance ? t('topbar_solo_clients_crumb', language) : terminology.members}
            </span>
          </nav>
        );
      case 'registrations':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {isFreelance
                ? t('topbar_solo_proposals_crumb', language)
                : isPOS
                ? (language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Commandes' : 'Orders')
                : terminology.registration}
            </span>
          </nav>
        );
      case 'shop':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {isFreelance
                ? t('topbar_solo_invoices_crumb', language)
                : terminology.shop}
            </span>
          </nav>
        );
      case 'scheduler':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {isFreelance
                ? t('topbar_solo_deliverables_crumb', language)
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
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {language === 'ar' ? 'المواعيد' : language === 'fr' ? 'Agenda' : 'Agenda'}
            </span>
          </nav>
        );
      case 'finance':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {isFreelance
                ? t('topbar_solo_finance_crumb', language)
                : t('nav_finance', language)}
            </span>
          </nav>
        );
      case 'history':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {isFreelance
                ? t('topbar_solo_history_crumb', language)
                : t('nav_history', language)}
            </span>
          </nav>
        );
      case 'staff':
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home size={12} />
              <span>{homeLabel}</span>
            </button>
            <ChevronRight size={13} className="text-black/35 dark:text-white/35" />
            <span className="text-black dark:text-white font-semibold">
              {language === 'ar' ? 'الفريق' : language === 'fr' ? 'Équipe' : 'Staff'}
            </span>
          </nav>
        );
      default: {
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="text-black/65 dark:text-white/70 hover:text-[#d4522f] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-black/80 dark:text-white/85 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
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
                className="font-bold text-black dark:text-white font-mono tabular-nums hover:text-[#d4522f] transition-colors cursor-pointer"
                title={t('topbar_tt_view_timer', language)}
              >
                {formatDuration(activeTimer.elapsedSeconds)}
              </button>
              <span className="text-[11px] text-black/70 dark:text-white/75 max-w-[120px] truncate hidden sm:inline">
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
              className="flex items-center gap-1.5 text-[11px] font-semibold text-black/80 dark:text-white/85 hover:text-[#d4522f] transition-colors cursor-pointer"
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
            placeholder={language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...'}
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
          className="hidden sm:inline-flex !w-8 !h-8 !rounded-full text-black/65 dark:text-white/70"
          title={language === 'ar' ? 'طي الشريط' : language === 'fr' ? 'Réduire' : 'Collapse'}
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
                ? 'مزامنة'
                : language === 'fr'
                ? 'Synchroniser'
                : 'Sync'
              : language === 'ar'
              ? 'تحديث'
              : language === 'fr'
              ? 'Actualiser'
              : 'Refresh'
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
            title={language === 'ar' ? 'الإشعارات' : language === 'fr' ? 'Notifications' : 'Notifications'}
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
                label: language === 'ar' ? 'تبديل المستخدم' : language === 'fr' ? 'Changer Agent' : 'Switch Staff',
                description: language === 'ar' ? 'دخول سريع بالرمز' : language === 'fr' ? 'Accès rapide PIN' : 'Quick PIN switch',
                icon: <Lock size={15} />,
                onSelect: () => openFastSwitch(),
              },
              {
                id: 'wizard',
                label: language === 'ar' ? 'إعداد النشاط' : language === 'fr' ? 'Assistant Début' : 'Setup Wizard',
                description: language === 'ar' ? 'تخصيص النشاط' : language === 'fr' ? 'Configuration' : 'Setup guide',
                icon: <Sparkles size={15} />,
                onSelect: () => openOnboarding(),
              },
              {
                id: 'voucher',
                label: language === 'ar' ? 'تفعيل قسيمة' : language === 'fr' ? 'Code Licence' : 'Redeem Key',
                description: language === 'ar' ? 'ترخيص دائم' : language === 'fr' ? 'Licence à vie' : 'Lifetime key',
                icon: <Rocket size={15} />,
                onSelect: () => onOpenVoucherModal?.(),
              },
              {
                id: 'autohide',
                label: isTopBarAutoHide
                  ? (language === 'ar' ? 'إظهار الشريط' : language === 'fr' ? 'Fixer barre' : 'Pin Bar')
                  : (language === 'ar' ? 'إخفاء تلقائي' : language === 'fr' ? 'Masquage auto' : 'Auto-hide'),
                description: isTopBarAutoHide
                  ? (language === 'ar' ? 'شريط عائم' : language === 'fr' ? 'Barre flottante' : 'Floating bar')
                  : (language === 'ar' ? 'شريط ثابت' : language === 'fr' ? 'Toujours visible' : 'Always visible'),
                icon: <ChevronUp size={15} />,
                onSelect: () => toggleTopBarAutoHide(),
              },
              {
                id: 'fullscreen',
                label: isFullscreen
                  ? (language === 'ar' ? 'تصغير' : language === 'fr' ? 'Réduire' : 'Exit Full')
                  : (language === 'ar' ? 'ملء الشاشة' : language === 'fr' ? 'Plein écran' : 'Fullscreen'),
                description: isFullscreen
                  ? (language === 'ar' ? 'نافذة عادية' : language === 'fr' ? 'Fenêtre normale' : 'Standard view')
                  : (language === 'ar' ? 'توسيع العرض' : language === 'fr' ? 'Affichage complet' : 'Full display'),
                icon: isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />,
                onSelect: () => toggleFullscreen(),
              },
              {
                id: 'settings',
                label: t('settings_title', language),
                description: language === 'ar' ? 'التفضيلات والمظهر' : language === 'fr' ? 'Préférences' : 'Preferences',
                icon: <Settings size={15} />,
                onSelect: () => setScreen('settings'),
              },
              { type: 'separator' },
              {
                id: 'logout',
                label: language === 'ar' ? 'خروج' : language === 'fr' ? 'Déconnexion' : 'Sign Out',
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
                  <span className="font-semibold text-xs text-black dark:text-white leading-tight truncate max-w-[110px]">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                </div>
                <ChevronDown
                  size={12}
                  className={`text-black/55 dark:text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </LiveButton>
            )}
          />
        </div>
      </div>

    </header>
  );
};
