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
  BarChart2,
  ClipboardList,
  History,
  ShoppingBag,
  Calendar,
  Wallet,
  FileText,
  Kanban,
  DoorOpen,
  ShieldCheck,
  GraduationCap,
  Award,
  BookOpen,
  Boxes,
  Receipt,
  Truck,
  Stethoscope,
  Wrench,
  Car,
  Factory,
  Scale,
  HardHat,
  Sprout,
  Package,
  Key,
  FileCheck,
  CheckCircle2,
  Landmark,
  Building,
  User,
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
    setActivePmRole,
    setActivePmSubScreen,
    activeGarageRole,
    activeRealEstateRole,
    activeManufacturingRole,
    activeLegalRole,
    activeLogisticsRole,
    activeContractorRole,
    activeAgriRole,
    activePosRole,
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

  type BreadcrumbIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

  interface BreadcrumbNode {
    id: string;
    label: string;
    icon?: BreadcrumbIcon;
    onClick?: () => void;
    isHome?: boolean;
  }

  const renderBreadcrumbTrail = (nodes: BreadcrumbNode[]) => {
    return (
      <nav
        aria-label="Breadcrumb"
        className="inline-flex items-center gap-0.5 sm:gap-1 h-[34px] px-1.5 rounded-full bg-[#F3EDE7]/85 dark:bg-neutral-800/80 border border-[#E6DED6]/90 dark:border-neutral-700/65 shadow-2xs max-w-full min-w-0"
      >
        {nodes.map((node, idx) => {
          const isLast = idx === nodes.length - 1;
          const CurrentIcon = node.icon || (node.isHome ? Home : Layers);
          return (
            <React.Fragment key={node.id}>
              {idx > 0 && (
                <ChevronRight
                  size={12}
                  strokeWidth={2.2}
                  aria-hidden="true"
                  className="text-black/32 dark:text-white/35 shrink-0 rtl:rotate-180"
                />
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="inline-flex items-center gap-1.5 h-[24px] text-[12px] font-semibold text-black dark:text-white min-w-0 pl-1 pr-2 rtl:pl-2 rtl:pr-1"
                >
                  <span
                    aria-hidden="true"
                    className="w-4.5 h-4.5 rounded-full bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] dark:text-[#FB923C] flex items-center justify-center shrink-0"
                  >
                    <CurrentIcon size={11} strokeWidth={2.3} />
                  </span>
                  <span className="truncate max-w-[150px] sm:max-w-[230px]">{node.label}</span>
                </span>
              ) : (
                <button
                  type="button"
                  data-no-liquid="true"
                  onClick={node.onClick}
                  className="inline-flex items-center gap-1.5 h-[24px] px-2 rounded-full text-[12px] font-medium text-black/62 dark:text-white/68 hover:text-[#d4522f] dark:hover:text-[#FB923C] hover:bg-white/85 dark:hover:bg-neutral-700/75 active:scale-[0.98] transition-all duration-150 cursor-pointer min-w-0 shrink-0"
                >
                  {node.isHome && <Home size={12} strokeWidth={2.1} className="shrink-0 opacity-85" />}
                  <span className="truncate max-w-[110px] sm:max-w-[160px]">{node.label}</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  };

  const getBreadcrumb = () => {
    const cat = currentBusiness?.category;
    const isAr = language === 'ar';
    const isFr = language === 'fr';
    const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isFr ? fr : en);

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
      ? l3('العيادة', 'Clinique', 'Clinic')
      : cat === 'auto_garage'
      ? l3('الورشة', 'Garage', 'Garage')
      : cat === 'real_estate'
      ? l3('العقارات', 'Immobilier', 'Real Estate')
      : cat === 'manufacturing_production'
      ? l3('المصنع', 'Usine', 'Factory')
      : cat === 'legal_accounting'
      ? l3('المكتب', 'Cabinet', 'Practice')
      : cat === 'logistics_delivery'
      ? l3('التوصيل', 'Livraison', 'Logistics')
      : cat === 'construction_contractor'
      ? l3('المشاريع', 'Chantiers', 'Projects')
      : cat === 'agriculture_farming'
      ? l3('المزرعة', 'Domaine', 'Farm')
      : t('nav_home', language);

    const homeTarget: 'pm_dir_dashboard' | 'trading_dashboard' | 'shop' | 'dashboard' =
      isProjectMilestone || activeScreen.startsWith('pm_')
        ? 'pm_dir_dashboard'
        : isTrading || activeScreen.startsWith('trading_')
        ? 'trading_dashboard'
        : isPOS && activePosRole === 'staff'
        ? 'shop'
        : 'dashboard';

    const goHome = () => {
      if (selectedMember) selectMember(null);
      if (isProjectMilestone || activeScreen.startsWith('pm_')) {
        setActivePmRole('direction');
        setActivePmSubScreen('dashboard');
      }
      setScreen(homeTarget);
    };

    const homeNode: BreadcrumbNode = {
      id: 'home',
      label: homeLabel,
      icon: Home,
      isHome: true,
      onClick: goHome,
    };

    // Settings
    if (activeScreen === 'settings') {
      return renderBreadcrumbTrail([
        homeNode,
        { id: 'settings', label: t('nav_settings', language), icon: Settings },
      ]);
    }

    // Staff screen
    if (activeScreen === 'staff') {
      return renderBreadcrumbTrail([
        homeNode,
        { id: 'staff', label: l3('الفريق', 'Équipe', 'Staff'), icon: Users },
      ]);
    }

    // Project & Milestone category / PM screens
    if (isProjectMilestone || activeScreen.startsWith('pm_')) {
      const pmRoleLandings: Record<string, { role: 'direction' | 'chef_projet' | 'crea' | 'superviseur' | 'rh' | 'compta'; screen: 'pm_dir_dashboard' | 'pm_cp_projects' | 'pm_crea_kanban' | 'pm_sup_missions' | 'pm_rh_talents' | 'pm_compta_payroll'; sub: string }> = {
        direction: { role: 'direction', screen: 'pm_dir_dashboard', sub: 'dashboard' },
        chef_projet: { role: 'chef_projet', screen: 'pm_cp_projects', sub: 'portfolio' },
        crea: { role: 'crea', screen: 'pm_crea_kanban', sub: 'demandes' },
        superviseur: { role: 'superviseur', screen: 'pm_sup_missions', sub: 'missions' },
        rh: { role: 'rh', screen: 'pm_rh_talents', sub: 'talents' },
        compta: { role: 'compta', screen: 'pm_compta_payroll', sub: 'payroll' },
      };

      const pmScreenTitles: Record<string, { roleKey: keyof typeof pmRoleLandings; role: string; screen: string; icon: BreadcrumbIcon }> = {
        pm_dir_dashboard: { roleKey: 'direction', role: t('pm_role_direction_name'), screen: t('pm_screen_dir_dashboard'), icon: TrendingUp },
        pm_dir_new_project: { roleKey: 'direction', role: t('pm_role_direction_name'), screen: t('pm_screen_dir_new_project'), icon: FileText },
        pm_dir_projects: { roleKey: 'direction', role: t('pm_role_direction_name'), screen: t('pm_screen_dir_projects'), icon: Kanban },
        pm_dir_approvals: { roleKey: 'direction', role: t('pm_role_direction_name'), screen: t('pm_screen_dir_approvals'), icon: ShieldCheck },
        pm_dir_reports: { roleKey: 'direction', role: t('pm_role_direction_name'), screen: t('pm_screen_dir_reports'), icon: BarChart2 },
        pm_cp_projects: { roleKey: 'chef_projet', role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_projects'), icon: Kanban },
        pm_cp_catalog: { roleKey: 'chef_projet', role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_catalog'), icon: ShoppingBag },
        pm_cp_orders: { roleKey: 'chef_projet', role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_orders'), icon: Sparkles },
        pm_cp_files: { roleKey: 'chef_projet', role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_deliverables'), icon: FileText },
        pm_cp_deliverables: { roleKey: 'chef_projet', role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_deliverables'), icon: FileText },
        pm_cp_expenses: { roleKey: 'chef_projet', role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_expenses'), icon: Wallet },
        pm_crea_kanban: { roleKey: 'crea', role: t('pm_role_crea_name'), screen: t('pm_screen_crea_kanban'), icon: Layers },
        pm_crea_production: { roleKey: 'crea', role: t('pm_role_crea_name'), screen: t('pm_screen_crea_production'), icon: Sparkles },
        pm_crea_upload: { roleKey: 'crea', role: t('pm_role_crea_name'), screen: t('pm_screen_crea_upload'), icon: FileText },
        pm_crea_briefs: { roleKey: 'crea', role: t('pm_role_crea_name'), screen: t('pm_screen_crea_briefs'), icon: FileText },
        pm_sup_missions: { roleKey: 'superviseur', role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_missions'), icon: Radio },
        pm_sup_attendance: { roleKey: 'superviseur', role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_attendance'), icon: Clock },
        pm_sup_staffing: { roleKey: 'superviseur', role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_staffing'), icon: Users },
        pm_sup_expenses: { roleKey: 'superviseur', role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_expenses'), icon: FileText },
        pm_rh_talents: { roleKey: 'rh', role: t('pm_role_rh_name'), screen: t('pm_screen_rh_talents'), icon: Users },
        pm_rh_dossier: { roleKey: 'rh', role: t('pm_role_rh_name'), screen: t('pm_screen_rh_dossier'), icon: FileText },
        pm_rh_portal: { roleKey: 'rh', role: t('pm_role_rh_name'), screen: t('pm_screen_rh_portal'), icon: GraduationCap },
        pm_rh_walkin: { roleKey: 'rh', role: t('pm_role_rh_name'), screen: t('pm_screen_rh_walkin'), icon: DoorOpen },
        pm_compta_payroll: { roleKey: 'compta', role: t('pm_role_compta_name'), screen: t('pm_screen_compta_payroll'), icon: Wallet },
        pm_compta_ccp: { roleKey: 'compta', role: t('pm_role_compta_name'), screen: t('pm_screen_compta_ccp'), icon: CreditCard },
        pm_compta_expenses: { roleKey: 'compta', role: t('pm_role_compta_name'), screen: t('pm_screen_compta_expenses'), icon: Receipt },
        pm_compta_stock: { roleKey: 'compta', role: t('pm_role_compta_name'), screen: t('pm_screen_compta_stock'), icon: Boxes },
        dashboard: { roleKey: 'direction', role: t('pm_role_direction_name'), screen: t('pm_screen_dir_dashboard'), icon: TrendingUp },
        scheduler: { roleKey: 'chef_projet', role: t('pm_role_chef_projet_name'), screen: t('pm_screen_cp_projects'), icon: Kanban },
        registrations: { roleKey: 'crea', role: t('pm_role_crea_name'), screen: t('pm_screen_crea_kanban'), icon: Layers },
        analytics: { roleKey: 'superviseur', role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_missions'), icon: Radio },
        members: { roleKey: 'rh', role: t('pm_role_rh_name'), screen: t('pm_screen_rh_talents'), icon: Users },
        finance: { roleKey: 'compta', role: t('pm_role_compta_name'), screen: t('pm_screen_compta_payroll'), icon: Wallet },
        shop: { roleKey: 'compta', role: t('pm_role_compta_name'), screen: t('pm_screen_compta_stock'), icon: Boxes },
        history: { roleKey: 'superviseur', role: t('pm_role_superviseur_name'), screen: t('pm_screen_sup_attendance'), icon: Clock },
      };

      const fallbackRoleKey: keyof typeof pmRoleLandings =
        activePmRole === 'chef_projet' ||
        activePmRole === 'crea' ||
        activePmRole === 'superviseur' ||
        activePmRole === 'rh' ||
        activePmRole === 'compta'
          ? activePmRole
          : 'direction';

      const resolved = pmScreenTitles[activeScreen] || {
        roleKey: fallbackRoleKey,
        role:
          fallbackRoleKey === 'direction'
            ? t('pm_role_direction_name')
            : fallbackRoleKey === 'chef_projet'
            ? t('pm_role_chef_projet_name')
            : fallbackRoleKey === 'crea'
            ? t('pm_role_crea_name')
            : fallbackRoleKey === 'superviseur'
            ? t('pm_role_superviseur_name')
            : fallbackRoleKey === 'rh'
            ? t('pm_role_rh_name')
            : t('pm_role_compta_name'),
        screen:
          fallbackRoleKey === 'direction'
            ? t('pm_screen_dir_dashboard')
            : fallbackRoleKey === 'chef_projet'
            ? t('pm_screen_cp_projects')
            : fallbackRoleKey === 'crea'
            ? t('pm_screen_crea_kanban')
            : fallbackRoleKey === 'superviseur'
            ? t('pm_screen_sup_missions')
            : fallbackRoleKey === 'rh'
            ? t('pm_screen_rh_talents')
            : t('pm_screen_compta_payroll'),
        icon:
          fallbackRoleKey === 'direction'
            ? TrendingUp
            : fallbackRoleKey === 'chef_projet'
            ? Kanban
            : fallbackRoleKey === 'crea'
            ? Layers
            : fallbackRoleKey === 'superviseur'
            ? Radio
            : fallbackRoleKey === 'rh'
            ? Users
            : Wallet,
      };

      const landing = pmRoleLandings[resolved.roleKey];
      return renderBreadcrumbTrail([
        homeNode,
        {
          id: `pm-role-${resolved.roleKey}`,
          label: resolved.role,
          onClick: () => {
            setActivePmRole(landing.role);
            setActivePmSubScreen(landing.sub);
            setScreen(landing.screen);
          },
        },
        { id: `pm-screen-${activeScreen}`, label: resolved.screen, icon: resolved.icon },
      ]);
    }

    // Home / Dashboard root screen
    if (activeScreen === 'dashboard' || activeScreen === 'trading_dashboard') {
      return renderBreadcrumbTrail([homeNode]);
    }

    // Dedicated Trading screens
    const tradingNodes: Record<string, { label: string; icon: BreadcrumbIcon }> = {
      trading_sales: { label: t('nav_trading_sales', language), icon: FileText },
      trading_purchases: { label: t('nav_trading_purchases', language), icon: Truck },
      trading_inventory: { label: t('nav_trading_inventory', language), icon: Boxes },
      trading_directory: { label: t('nav_trading_directory', language), icon: Building2 },
      trading_catalog: { label: t('nav_trading_catalog', language), icon: ShoppingBag },
      trading_finance: { label: t('nav_trading_finance', language), icon: Wallet },
    };
    if (tradingNodes[activeScreen]) {
      return renderBreadcrumbTrail([
        homeNode,
        {
          id: activeScreen,
          label: tradingNodes[activeScreen].label,
          icon: tradingNodes[activeScreen].icon,
        },
      ]);
    }

    // Real Estate Mandates screen
    if (activeScreen === 'realestate_mandates') {
      return renderBreadcrumbTrail([
        homeNode,
        {
          id: 'realestate_mandates',
          label:
            activeRealEstateRole === 'notaire_compta'
              ? l3('العمولات', 'Honoraires', 'Fees')
              : l3('الوكالات', 'Mandats', 'Mandates'),
          icon: FileText,
        },
      ]);
    }

    // Resolve category & role-specific label + icon for shared screen IDs
    const resolveSharedScreenMeta = (): { label: string; icon: BreadcrumbIcon } | null => {
      if (cat === 'medical_clinic') {
        switch (activeScreen) {
          case 'scheduler': return { label: l3('الانتظار', 'Attente', 'Queue'), icon: Clock };
          case 'agenda': return { label: l3('المواعيد', 'Agenda', 'Agenda'), icon: Calendar };
          case 'members': return { label: l3('المرضى', 'Patients', 'Patients'), icon: Users };
          case 'shop': return { label: l3('الوصفات', 'Ordonnances', 'Prescriptions'), icon: Stethoscope };
          case 'registrations': return { label: l3('الشهادات', 'Certificats', 'Certificates'), icon: FileText };
          case 'finance': return { label: t('nav_finance', language), icon: CreditCard };
          default: return null;
        }
      }
      if (cat === 'auto_garage') {
        if (activeScreen === 'scheduler') {
          if (activeGarageRole === 'reception') return { label: l3('الاستقبال', 'Réception', 'Intake'), icon: Wrench };
          if (activeGarageRole === 'mecanicien') return { label: l3('الأرصفة', 'Ponts', 'Bays'), icon: Wrench };
          if (activeGarageRole === 'magasinier') return { label: l3('المشتريات', 'Commandes', 'Purchases'), icon: Truck };
          if (activeGarageRole === 'caisse') return { label: l3('للدفع', 'À Régler', 'To Pay'), icon: CheckCircle2 };
          return { label: l3('الإصلاحات', 'Réparations', 'Repairs'), icon: Wrench };
        }
        if (activeScreen === 'members') {
          if (activeGarageRole === 'mecanicien') return { label: l3('الفحص', 'Diagnostic', 'Diagnostics'), icon: Car };
          if (activeGarageRole === 'caisse') return { label: l3('الأساطيل', 'Flottes', 'Fleets'), icon: Building2 };
          return { label: l3('المركبات', 'Véhicules', 'Vehicles'), icon: Car };
        }
        if (activeScreen === 'shop') {
          if (activeGarageRole === 'reception') return { label: l3('التسليم', 'Sorties', 'Handover'), icon: Key };
          if (activeGarageRole === 'mecanicien') return { label: l3('الطلبات', 'Demandes', 'Requests'), icon: Boxes };
          return { label: l3('قطع الغيار', 'Pièces', 'Parts'), icon: Boxes };
        }
        if (activeScreen === 'finance') {
          if (activeGarageRole === 'reception') return { label: l3('العروض', 'Devis', 'Quotes'), icon: FileText };
          if (activeGarageRole === 'magasinier') return { label: l3('الاستلام', 'Réceptions', 'Deliveries'), icon: FileCheck };
          return { label: t('nav_finance', language), icon: Wallet };
        }
      }
      if (cat === 'real_estate') {
        switch (activeScreen) {
          case 'members': return { label: l3('العقارات', 'Biens', 'Properties'), icon: Building2 };
          case 'scheduler': return { label: l3('العقود', 'Contrats', 'Leases'), icon: Key };
          case 'registrations':
            return {
              label:
                activeRealEstateRole === 'gestionnaire_locatif'
                  ? l3('المعاينة', 'Inspections', 'Inspections')
                  : l3('الزيارات', 'Visites', 'Visits'),
              icon: FileCheck,
            };
          case 'finance':
            return activeRealEstateRole === 'notaire_compta'
              ? { label: l3('الحسابات', 'Comptes', 'Closing'), icon: Scale }
              : { label: l3('الوصولات', 'Quittances', 'Receipts'), icon: Receipt };
          default: return null;
        }
      }
      if (cat === 'manufacturing_production') {
        if (activeScreen === 'scheduler') {
          if (activeManufacturingRole === 'operateur') return { label: l3('مهامي', 'Mes Tâches', 'My Tasks'), icon: Factory };
          if (activeManufacturingRole === 'qualite') return { label: l3('المعايرة', 'Mesures', 'Calibration'), icon: Scale };
          return { label: l3('التصنيع', 'Production', 'Orders'), icon: Factory };
        }
        if (activeScreen === 'shop') {
          return {
            label:
              activeManufacturingRole === 'magasinier'
                ? l3('المخرجات', 'Sorties', 'Issues')
                : l3('الوصفات', 'Recettes', 'Recipes'),
            icon: Layers,
          };
        }
        if (activeScreen === 'members') {
          return {
            label:
              activeManufacturingRole === 'magasinier'
                ? l3('المخزن', 'Magasin', 'Depot')
                : l3('المواد', 'Matières', 'Materials'),
            icon: Boxes,
          };
        }
        if (activeScreen === 'finance') {
          if (activeManufacturingRole === 'magasinier') return { label: l3('التحويلات', 'Mouvements', 'Transfers'), icon: Receipt };
          if (activeManufacturingRole === 'qualite') return { label: l3('الجودة', 'Contrôle', 'Quality'), icon: ShieldCheck };
          return { label: l3('الجودة', 'Qualité', 'Quality'), icon: ShieldCheck };
        }
      }
      if (cat === 'legal_accounting') {
        if (activeLegalRole === 'notaire_titulaire') {
          switch (activeScreen) {
            case 'members': return { label: l3('العقود', 'Actes', 'Deeds'), icon: BookOpen };
            case 'scheduler': return { label: l3('الشهر العقاري', 'Foncier', 'Registry'), icon: Landmark };
            case 'registrations': return { label: l3('الأرشيف', 'Archives', 'Archives'), icon: ShieldCheck };
            case 'finance': return { label: l3('الودائع', 'Dépôts', 'Escrow'), icon: Lock };
          }
        } else if (activeLegalRole === 'expert_comptable') {
          switch (activeScreen) {
            case 'members': return { label: l3('الشركات', 'Mandats', 'Clients'), icon: Briefcase };
            case 'scheduler': return { label: l3('المواعيد', 'Échéances', 'Tax Dates'), icon: Calendar };
            case 'registrations': return { label: l3('التدقيق', 'Audit', 'Audit'), icon: FileText };
            case 'finance': return { label: l3('المحاسبة', 'Comptabilité', 'Ledger'), icon: Scale };
          }
        } else if (activeLegalRole === 'secretaire_caisse') {
          switch (activeScreen) {
            case 'members': return { label: l3('العملاء', 'Clients', 'Clients'), icon: Users };
            case 'scheduler': return { label: l3('التبليغ', 'Courrier', 'Service Log'), icon: Calendar };
            case 'registrations': return { label: l3('الإيداع', 'Dépôts', 'Filing'), icon: FileText };
            case 'finance': return { label: l3('الصندوق', 'Caisse', 'Cashier'), icon: CreditCard };
          }
        } else {
          switch (activeScreen) {
            case 'members': return { label: l3('القضايا', 'Dossiers', 'Cases'), icon: Briefcase };
            case 'scheduler': return { label: l3('الجلسات', 'Audiences', 'Hearings'), icon: Calendar };
            case 'registrations': return { label: l3('المستندات', 'Documents', 'Vault'), icon: FileText };
            case 'finance': return { label: l3('الأتعاب', 'Honoraires', 'Fees'), icon: Scale };
          }
        }
      }
      if (cat === 'logistics_delivery') {
        if (activeScreen === 'members') {
          return {
            label:
              activeLogisticsRole === 'stop_desk_agent'
                ? l3('الاستلام', 'Guichet', 'Counter')
                : l3('الطرود', 'Colis', 'Parcels'),
            icon: Package,
          };
        }
        if (activeScreen === 'scheduler') {
          return {
            label:
              activeLogisticsRole === 'hub_sorter'
                ? l3('الشحن', 'Chargement', 'Loading')
                : l3('المسارات', 'Tournées', 'Runs'),
            icon: Truck,
          };
        }
        if (activeScreen === 'registrations') {
          return {
            label:
              activeLogisticsRole === 'stop_desk_agent'
                ? l3('الرفوف', 'Rayons', 'Shelving')
                : l3('الماسح', 'Scanner', 'Scanner'),
            icon: Boxes,
          };
        }
        if (activeScreen === 'finance') {
          return {
            label:
              activeLogisticsRole === 'stop_desk_agent'
                ? l3('الصندوق', 'Caisse', 'Cashier')
                : l3('التحصيل', 'Encaissements', 'Payouts'),
            icon: CreditCard,
          };
        }
      }
      if (cat === 'construction_contractor') {
        if (activeContractorRole === 'gerant') {
          switch (activeScreen) {
            case 'members': return { label: l3('المشاريع', 'Projets', 'Projects'), icon: Building };
            case 'scheduler': return { label: l3('الآجال', 'Délais', 'Deadlines'), icon: Clock };
            case 'finance': return { label: l3('الخزينة', 'Trésorerie', 'Treasury'), icon: Landmark };
          }
        } else if (activeContractorRole === 'conducteur' || activeContractorRole === 'conducteur_travaux') {
          switch (activeScreen) {
            case 'members': return { label: l3('الورشات', 'Chantiers', 'Sites'), icon: HardHat };
            case 'shop': return { label: l3('الكميات', 'Devis', 'Quantities'), icon: ClipboardList };
            case 'scheduler': return { label: l3('المختبر', 'Laboratoire', 'Lab'), icon: CheckCircle2 };
            case 'finance': return { label: l3('المناولون', 'Sous-traitants', 'Subcontractors'), icon: Users };
          }
        } else if (activeContractorRole === 'chef_chantier') {
          switch (activeScreen) {
            case 'scheduler': return { label: l3('الحضور', 'Pointage', 'Attendance'), icon: Users };
            case 'members': return { label: l3('اليومية', 'Journal', 'Site Log'), icon: FileText };
            case 'shop': return { label: l3('الخرسانة', 'Béton', 'Concrete'), icon: Truck };
            case 'finance': return { label: l3('المعدات', 'Engins', 'Equipment'), icon: Scale };
          }
        } else if (activeContractorRole === 'metreur' || activeContractorRole === 'daf_metreur') {
          switch (activeScreen) {
            case 'shop': return { label: l3('الأسعار', 'Devis', 'Estimates'), icon: ClipboardList };
            case 'scheduler': return { label: l3('الكشوف', 'Situations', 'Statements'), icon: FileCheck };
            case 'finance': return { label: l3('المراجعة', 'Révision', 'Revisions'), icon: Layers };
          }
        } else {
          switch (activeScreen) {
            case 'finance': return { label: l3('الفواتير', 'Décomptes', 'Billings'), icon: FileText };
            case 'scheduler': return { label: l3('التعويضات', 'Intempéries', 'Weather Claims'), icon: Cloud };
            case 'shop': return { label: l3('الموردون', 'Fournisseurs', 'Suppliers'), icon: CreditCard };
            case 'members': return { label: l3('الصندوق', 'Caisse', 'Petty Cash'), icon: Receipt };
          }
        }
      }
      if (cat === 'agriculture_farming') {
        switch (activeScreen) {
          case 'members': return { label: l3('القطع', 'Parcelles', 'Parcels'), icon: Sprout };
          case 'scheduler': return { label: l3('المحاصيل', 'Cultures', 'Crops'), icon: Calendar };
          case 'shop':
            return {
              label:
                activeAgriRole === 'magasinier'
                  ? l3('الحصاد', 'Récoltes', 'Harvest')
                  : l3('العمال', 'Pointage', 'Workers'),
              icon: Scale,
            };
          case 'registrations': return { label: l3('المواشي', 'Cheptel', 'Livestock'), icon: Layers };
          case 'finance': return { label: l3('الميزان', 'Bascule', 'Weighbridge'), icon: Wallet };
          default: return null;
        }
      }
      if (isPOS) {
        switch (activeScreen) {
          case 'shop': return { label: l3('الصندوق', 'Caisse', 'Register'), icon: ShoppingBag };
          case 'scheduler': return { label: l3('المخزون', 'Stock', 'Inventory'), icon: Boxes };
          case 'registrations': return { label: l3('الطلبات', 'Commandes', 'Orders'), icon: ClipboardList };
          case 'history': return { label: t('nav_pos_ledger', language), icon: History };
          case 'finance': return { label: t('nav_finance', language), icon: Wallet };
          default: return null;
        }
      }
      if (isEducation) {
        switch (activeScreen) {
          case 'scheduler': return { label: terminology.scheduler, icon: Calendar };
          case 'members': return { label: terminology.members, icon: Users };
          case 'shop': return { label: terminology.plan, icon: GraduationCap };
          case 'registrations': return { label: terminology.registration, icon: ClipboardList };
          case 'analytics': return { label: t('nav_edu_attendance', language), icon: Award };
          case 'finance': return { label: t('nav_finance', language), icon: Wallet };
          default: return null;
        }
      }
      if (isRental) {
        switch (activeScreen) {
          case 'analytics': return { label: l3('الإشغال', 'Occupation', 'Occupancy'), icon: BarChart2 };
          case 'scheduler': return { label: terminology.scheduler, icon: Calendar };
          case 'registrations': return { label: terminology.registration, icon: ClipboardList };
          case 'shop': return { label: terminology.shop, icon: DoorOpen };
          case 'members': return { label: terminology.members, icon: Users };
          case 'finance': return { label: t('nav_finance', language), icon: ShieldCheck };
          default: return null;
        }
      }
      if (isFreelance) {
        switch (activeScreen) {
          case 'analytics': return { label: t('topbar_solo_timetracker_crumb', language), icon: Clock };
          case 'members': return { label: t('topbar_solo_clients_crumb', language), icon: Users };
          case 'registrations': return { label: t('topbar_solo_proposals_crumb', language), icon: ClipboardList };
          case 'shop': return { label: t('topbar_solo_invoices_crumb', language), icon: FileText };
          case 'scheduler': return { label: t('topbar_solo_deliverables_crumb', language), icon: Kanban };
          case 'finance': return { label: t('topbar_solo_finance_crumb', language), icon: Wallet };
          case 'history': return { label: t('topbar_solo_history_crumb', language), icon: History };
          default: return null;
        }
      }

      switch (activeScreen) {
        case 'analytics': return { label: t('nav_analytics', language), icon: BarChart2 };
        case 'members': return { label: terminology.members, icon: Users };
        case 'registrations': return { label: terminology.registration, icon: ClipboardList };
        case 'shop': return { label: terminology.shop, icon: ShoppingBag };
        case 'scheduler': return { label: terminology.scheduler, icon: Calendar };
        case 'agenda': return { label: l3('المواعيد', 'Agenda', 'Agenda'), icon: Calendar };
        case 'finance': return { label: t('nav_finance', language), icon: Wallet };
        case 'history': return { label: t('nav_history', language), icon: History };
        default: return null;
      }
    };

    const currentMeta = resolveSharedScreenMeta();
    if (!currentMeta) {
      return renderBreadcrumbTrail([homeNode]);
    }

    if (activeScreen === 'members' && selectedMember) {
      return renderBreadcrumbTrail([
        homeNode,
        {
          id: 'members',
          label: currentMeta.label,
          icon: currentMeta.icon,
          onClick: () => selectMember(null),
        },
        {
          id: `member-${selectedMember.id}`,
          label: selectedMember.fullName,
          icon: User,
        },
      ]);
    }

    return renderBreadcrumbTrail([
      homeNode,
      { id: activeScreen, label: currentMeta.label, icon: currentMeta.icon },
    ]);
  };

  return (
    <header
      className="w-full h-full flex items-center justify-between gap-3 shrink-0 select-none"
    >
      {/* Left: Mobile Toggle & Working Interactive Breadcrumbs */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          data-no-liquid="true"
          onClick={onToggleMobileMenu}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-black/80 dark:text-white/85 hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 cursor-pointer shrink-0"
          aria-label="Toggle mobile navigation menu"
        >
          <MenuIcon size={17} />
        </button>

        <div className="min-w-0 flex items-center">
          {getBreadcrumb()}
        </div>
      </div>



      {/* Center: Live Floating Stopwatch Pill */}
      {!isProjectMilestone && (activeTimer.isRunning || currentBusiness.category === 'freelance_solo') && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F3EDE7]/90 dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/70 text-xs shadow-2xs">
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
          className="!w-8 !h-8 !rounded-full"
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
                    ? '!border-[#D4C8BC] dark:!border-neutral-500 shadow-xs'
                    : 'border-[#E6DED6] dark:border-neutral-700/70'
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
