import React, { useState } from 'react';
import { Sidebar as AtriumSidebar, AtriumLogo, SidebarItem } from '@/atrium';
import {
  Home,
  BarChart2,
  Users,
  ClipboardList,
  History,
  ShoppingBag,
  Calendar,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  FileText,
  Kanban,
  DoorOpen,
  ShieldCheck,
  GraduationCap,
  Award,
  BookOpen,
  TrendingUp,
  Sparkles,
  Radio,
  Layers,
  Boxes,
  CreditCard,
  Receipt,
  Truck,
  Building2,
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
  Briefcase,
  CheckCircle2,
  Lock,
  Landmark,
  Cloud,
  Building,
} from 'lucide-react';
import { useAtriumStore, ActiveScreen } from '../../services/store';
import { FiveCubesLogo } from '../auth/AtriumMonolith';
import { useTranslation } from '../../utils/useTranslation';
import { canAccessStaffScreen, getEffectiveUserRole } from '../../utils/staffRules';

interface SidebarProps {
  onOpenVoucherModal?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenVoucherModal,
  isOpenMobile = false,
  onCloseMobile,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}) => {
  const { t } = useTranslation();
  const {
    activeScreen,
    setScreen,
    terminology,
    currentBusiness,
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
    activeMembershipRole,
    activeAppointmentRole,
    activePosRole,
    activeEducationRole,
    currentUser,
    language,
  } = useAtriumStore();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = openProp !== undefined ? openProp : internalExpanded;
  const setIsExpanded = onOpenChangeProp || setInternalExpanded;
  const isRtl = language === 'ar';

  const category = currentBusiness?.category || 'pos_inventory';

  let dockNavItems: Array<{
    id: ActiveScreen;
    icon: React.ReactNode;
    title: string;
    label: string;
  }>;

  if (category === 'project_milestone') {
    if (activePmRole === 'direction') {
      dockNavItems = [
        {
          id: 'pm_dir_dashboard',
          icon: <TrendingUp size={19} />,
          title: t('nav_pm_dir_dashboard', language),
          label: t('nav_dashboard', language),
        },
        {
          id: 'pm_dir_new_project',
          icon: <FileText size={19} />,
          title: t('nav_pm_dir_specs', language),
          label: t('nav_pm_dir_specs', language),
        },
        {
          id: 'pm_dir_projects',
          icon: <Kanban size={19} />,
          title: t('nav_pm_dir_projects', language),
          label: t('nav_pm_dir_projects', language),
        },
        {
          id: 'pm_dir_approvals',
          icon: <ShieldCheck size={19} />,
          title: t('nav_pm_dir_approvals', language),
          label: t('nav_pm_dir_approvals', language),
        },
        {
          id: 'pm_dir_reports',
          icon: <BarChart2 size={19} />,
          title: t('nav_pm_dir_reports', language),
          label: t('nav_pm_dir_reports', language),
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    } else if (activePmRole === 'chef_projet') {
      dockNavItems = [
        {
          id: 'pm_cp_projects',
          icon: <Kanban size={19} />,
          title: t('nav_pm_cp_projects', language),
          label: t('nav_pm_cp_projects', language),
        },
        {
          id: 'pm_cp_catalog',
          icon: <ShoppingBag size={19} />,
          title: t('nav_pm_cp_catalog', language),
          label: t('nav_pm_cp_catalog', language),
        },
        {
          id: 'pm_cp_orders',
          icon: <Sparkles size={19} />,
          title: t('nav_pm_cp_orders', language),
          label: t('nav_pm_cp_orders', language),
        },
        {
          id: 'pm_cp_files',
          icon: <FileText size={19} />,
          title: t('nav_pm_cp_files', language),
          label: t('nav_pm_cp_files', language),
        },
        {
          id: 'pm_cp_expenses',
          icon: <Wallet size={19} />,
          title: t('nav_pm_cp_expenses', language),
          label: t('nav_pm_cp_expenses', language),
        },
      ];
    } else if (activePmRole === 'crea') {
      dockNavItems = [
        {
          id: 'pm_crea_kanban',
          icon: <Layers size={19} />,
          title: t('nav_pm_crea_kanban', language),
          label: t('nav_pm_crea_kanban', language),
        },
        {
          id: 'pm_crea_production',
          icon: <Sparkles size={19} />,
          title: t('nav_pm_crea_production', language),
          label: t('nav_pm_crea_production', language),
        },
        {
          id: 'pm_crea_upload',
          icon: <FileText size={19} />,
          title: t('nav_pm_crea_upload', language),
          label: t('nav_pm_crea_upload', language),
        },
        {
          id: 'pm_crea_briefs',
          icon: <FileText size={19} />,
          title: t('nav_pm_crea_briefs', language),
          label: t('nav_pm_crea_briefs', language),
        },
      ];
    } else if (activePmRole === 'superviseur') {
      dockNavItems = [
        {
          id: 'pm_sup_missions',
          icon: <Radio size={19} />,
          title: t('nav_pm_sup_missions', language),
          label: t('nav_pm_sup_missions', language),
        },
        {
          id: 'pm_sup_staffing',
          icon: <Users size={19} />,
          title: t('nav_pm_sup_staffing', language),
          label: t('nav_pm_sup_staffing', language),
        },
        {
          id: 'pm_sup_attendance',
          icon: <Clock size={19} />,
          title: t('nav_pm_sup_attendance', language),
          label: t('nav_pm_sup_attendance', language),
        },
        {
          id: 'pm_sup_expenses',
          icon: <FileText size={19} />,
          title: t('nav_pm_sup_expenses', language),
          label: t('nav_pm_sup_expenses', language),
        },
      ];
    } else if (activePmRole === 'rh') {
      dockNavItems = [
        {
          id: 'pm_rh_talents',
          icon: <Users size={19} />,
          title: t('nav_pm_rh_talents', language),
          label: t('nav_pm_rh_talents', language),
        },
        {
          id: 'pm_rh_dossier',
          icon: <FileText size={19} />,
          title: t('nav_pm_rh_dossier', language),
          label: t('nav_pm_rh_dossier', language),
        },
        {
          id: 'pm_rh_portal',
          icon: <GraduationCap size={19} />,
          title: t('nav_pm_rh_portal', language),
          label: t('nav_pm_rh_portal', language),
        },
        {
          id: 'pm_rh_walkin',
          icon: <DoorOpen size={19} />,
          title: t('nav_pm_rh_walkin', language),
          label: t('nav_pm_rh_walkin', language),
        },
      ];
    } else {
      // compta
      dockNavItems = [
        {
          id: 'pm_compta_payroll',
          icon: <Wallet size={19} />,
          title: t('nav_pm_compta_payroll', language),
          label: t('nav_pm_compta_payroll', language),
        },
        {
          id: 'pm_compta_ccp',
          icon: <CreditCard size={19} />,
          title: t('nav_pm_compta_ccp', language),
          label: t('nav_pm_compta_ccp', language),
        },
        {
          id: 'pm_compta_expenses',
          icon: <Receipt size={19} />,
          title: t('nav_pm_compta_expenses', language),
          label: t('nav_pm_compta_expenses', language),
        },
        {
          id: 'pm_compta_stock',
          icon: <Boxes size={19} />,
          title: t('nav_pm_compta_stock', language),
          label: t('nav_pm_compta_stock', language),
        },
      ];
    }
  } else if (category === 'freelance_solo') {
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: t('nav_solo_home', language),
        label: t('nav_home', language),
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: t('nav_solo_clients', language),
        label: terminology.members,
      },
      {
        id: 'scheduler',
        icon: <Kanban size={19} />,
        title: t('nav_solo_deliverables', language),
        label: terminology.scheduler,
      },
      {
        id: 'analytics',
        icon: <Clock size={19} />,
        title: t('nav_solo_timetracker', language),
        label: t('nav_solo_timetracker', language),
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: t('nav_solo_proposals', language),
        label: terminology.registration,
      },
      {
        id: 'shop',
        icon: <FileText size={19} />,
        title: t('nav_solo_invoices', language),
        label: terminology.shop,
      },
      {
        id: 'finance',
        icon: <Wallet size={19} />,
        title: t('nav_solo_finance', language),
        label: t('nav_finance', language),
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: t('nav_settings', language),
        label: t('nav_settings', language),
      },
    ];
  } else if (category === 'pos_inventory') {
    if (activePosRole === 'staff') {
      dockNavItems = [
        {
          id: 'shop',
          icon: <ShoppingBag size={19} />,
          title: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Register',
          label: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Register',
        },
        {
          id: 'registrations',
          icon: <ClipboardList size={19} />,
          title: language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Commandes' : 'Orders',
          label: language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Commandes' : 'Orders',
        },
        {
          id: 'scheduler',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stock' : 'Inventory',
          label: language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stock' : 'Inventory',
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'shop',
          icon: <ShoppingBag size={19} />,
          title: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Register',
          label: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Register',
        },
        {
          id: 'scheduler',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stock' : 'Inventory',
          label: language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stock' : 'Inventory',
        },
        {
          id: 'registrations',
          icon: <ClipboardList size={19} />,
          title: language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Commandes' : 'Orders',
          label: language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Commandes' : 'Orders',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'history',
          icon: <History size={19} />,
          title: t('nav_pos_ledger', language),
          label: t('nav_pos_ledger', language),
        },
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: t('nav_finance', language),
          label: t('nav_finance', language),
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else if (category === 'appointment_service') {
    if (activeAppointmentRole === 'staff') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'المحطات' : language === 'fr' ? 'Fauteuils' : 'Stations',
          label: language === 'ar' ? 'المحطات' : language === 'fr' ? 'Fauteuils' : 'Stations',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: terminology.scheduler,
          label: terminology.scheduler,
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: terminology.members,
          label: terminology.members,
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: terminology.scheduler,
          label: terminology.scheduler,
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: terminology.members,
          label: terminology.members,
        },
        {
          id: 'shop',
          icon: <ShoppingBag size={19} />,
          title: terminology.shop,
          label: terminology.shop,
        },
        {
          id: 'history',
          icon: <History size={19} />,
          title: t('nav_history', language),
          label: t('nav_history', language),
        },
        {
          id: 'analytics',
          icon: <BarChart2 size={19} />,
          title: t('nav_analytics', language),
          label: t('nav_analytics', language),
        },
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: t('nav_finance', language),
          label: t('nav_finance', language),
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else if (category === 'rental_booking') {
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: t('nav_home', language),
        label: t('nav_home', language),
      },
      {
        id: 'scheduler',
        icon: <Calendar size={19} />,
        title: terminology.scheduler,
        label: terminology.scheduler,
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: terminology.registration,
        label: terminology.registration,
      },
      {
        id: 'shop',
        icon: <DoorOpen size={19} />,
        title: terminology.shop,
        label: terminology.shop,
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: terminology.members,
        label: terminology.members,
      },
      {
        id: 'finance',
        icon: <ShieldCheck size={19} />,
        title: t('nav_finance', language),
        label: t('nav_finance', language),
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: t('nav_settings', language),
        label: t('nav_settings', language),
      },
    ];
  } else if (category === 'education_cohort') {
    if (activeEducationRole === 'staff') {
      dockNavItems = [
        {
          id: 'analytics',
          icon: <Award size={19} />,
          title: language === 'ar' ? 'الحضور' : language === 'fr' ? 'Appel' : 'Roll Call',
          label: language === 'ar' ? 'الحضور' : language === 'fr' ? 'Appel' : 'Roll Call',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: terminology.scheduler,
          label: terminology.scheduler,
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: terminology.members,
          label: terminology.members,
        },
        {
          id: 'shop',
          icon: <GraduationCap size={19} />,
          title: terminology.plan,
          label: terminology.plan,
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: terminology.scheduler,
          label: terminology.scheduler,
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: terminology.members,
          label: terminology.members,
        },
        {
          id: 'shop',
          icon: <GraduationCap size={19} />,
          title: terminology.plan,
          label: terminology.plan,
        },
        {
          id: 'registrations',
          icon: <ClipboardList size={19} />,
          title: terminology.registration,
          label: terminology.registration,
        },
        {
          id: 'analytics',
          icon: <Award size={19} />,
          title: t('nav_edu_attendance', language),
          label: t('nav_edu_attendance', language),
        },
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: t('nav_finance', language),
          label: t('nav_finance', language),
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else if (category === 'trading_commercial') {
    dockNavItems = [
      {
        id: 'trading_dashboard',
        icon: <Home size={19} />,
        title: t('nav_home', language),
        label: t('nav_home', language),
      },
      {
        id: 'trading_sales',
        icon: <FileText size={19} />,
        title: language === 'ar' ? 'المبيعات' : language === 'fr' ? 'Ventes' : 'Sales',
        label: language === 'ar' ? 'المبيعات' : language === 'fr' ? 'Ventes' : 'Sales',
      },
      {
        id: 'trading_purchases',
        icon: <Truck size={19} />,
        title: language === 'ar' ? 'المشتريات' : language === 'fr' ? 'Achats' : 'Purchases',
        label: language === 'ar' ? 'المشتريات' : language === 'fr' ? 'Achats' : 'Purchases',
      },
      {
        id: 'trading_inventory',
        icon: <Boxes size={19} />,
        title: language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stocks' : 'Stock',
        label: language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stocks' : 'Stock',
      },
      {
        id: 'trading_directory',
        icon: <Building2 size={19} />,
        title: language === 'ar' ? 'الشركاء' : language === 'fr' ? 'Contacts' : 'Directory',
        label: language === 'ar' ? 'الشركاء' : language === 'fr' ? 'Contacts' : 'Directory',
      },
      {
        id: 'trading_catalog',
        icon: <ShoppingBag size={19} />,
        title: language === 'ar' ? 'المنتجات' : language === 'fr' ? 'Articles' : 'Catalog',
        label: language === 'ar' ? 'المنتجات' : language === 'fr' ? 'Articles' : 'Catalog',
      },
      {
        id: 'trading_finance',
        icon: <Wallet size={19} />,
        title: t('nav_finance', language),
        label: t('nav_finance', language),
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: t('nav_settings', language),
        label: t('nav_settings', language),
      },
    ];
  } else if (category === 'medical_clinic') {
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: t('nav_home', language),
        label: t('nav_home', language),
      },
      {
        id: 'scheduler',
        icon: <Clock size={19} />,
        title: language === 'ar' ? 'الانتظار' : language === 'fr' ? 'Attente' : 'Queue',
        label: language === 'ar' ? 'الانتظار' : language === 'fr' ? 'Attente' : 'Queue',
      },
      {
        id: 'agenda',
        icon: <Calendar size={19} />,
        title: language === 'ar' ? 'المواعيد' : language === 'fr' ? 'Agenda' : 'Agenda',
        label: language === 'ar' ? 'المواعيد' : language === 'fr' ? 'Agenda' : 'Agenda',
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: language === 'ar' ? 'المرضى' : language === 'fr' ? 'Patients' : 'Patients',
        label: language === 'ar' ? 'المرضى' : language === 'fr' ? 'Patients' : 'Patients',
      },
      {
        id: 'shop',
        icon: <Stethoscope size={19} />,
        title: language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Ordonnances' : 'Prescriptions',
        label: language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Ordonnances' : 'Prescriptions',
      },
      {
        id: 'registrations',
        icon: <FileText size={19} />,
        title: language === 'ar' ? 'الشهادات' : language === 'fr' ? 'Certificats' : 'Certificates',
        label: language === 'ar' ? 'الشهادات' : language === 'fr' ? 'Certificats' : 'Certificates',
      },
      {
        id: 'finance',
        icon: <CreditCard size={19} />,
        title: t('nav_finance', language),
        label: t('nav_finance', language),
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: t('nav_settings', language),
        label: t('nav_settings', language),
      },
    ];
  } else if (category === 'auto_garage') {
    if (activeGarageRole === 'reception') {
      dockNavItems = [
        {
          id: 'scheduler',
          icon: <Wrench size={19} />,
          title: language === 'ar' ? 'الاستقبال' : language === 'fr' ? 'Réception' : 'Intake',
          label: language === 'ar' ? 'الاستقبال' : language === 'fr' ? 'Réception' : 'Intake',
        },
        {
          id: 'members',
          icon: <Car size={19} />,
          title: language === 'ar' ? 'المركبات' : language === 'fr' ? 'Véhicules' : 'Vehicles',
          label: language === 'ar' ? 'المركبات' : language === 'fr' ? 'Véhicules' : 'Vehicles',
        },
        {
          id: 'finance',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'العروض' : language === 'fr' ? 'Devis' : 'Quotes',
          label: language === 'ar' ? 'العروض' : language === 'fr' ? 'Devis' : 'Quotes',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'shop',
          icon: <Key size={19} />,
          title: language === 'ar' ? 'التسليم' : language === 'fr' ? 'Sorties' : 'Handover',
          label: language === 'ar' ? 'التسليم' : language === 'fr' ? 'Sorties' : 'Handover',
        },
      ];
    } else if (activeGarageRole === 'mecanicien') {
      dockNavItems = [
        {
          id: 'scheduler',
          icon: <Wrench size={19} />,
          title: language === 'ar' ? 'الأرصفة' : language === 'fr' ? 'Ponts' : 'Bays',
          label: language === 'ar' ? 'الأرصفة' : language === 'fr' ? 'Ponts' : 'Bays',
        },
        {
          id: 'dashboard',
          icon: <Clock size={19} />,
          title: language === 'ar' ? 'مهامي' : language === 'fr' ? 'Mes Tâches' : 'My Tasks',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Car size={19} />,
          title: language === 'ar' ? 'الفحص' : language === 'fr' ? 'Diagnostic' : 'Diagnostics',
          label: language === 'ar' ? 'الفحص' : language === 'fr' ? 'Diagnostic' : 'Diagnostics',
        },
        {
          id: 'shop',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Demandes' : 'Requests',
          label: language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Demandes' : 'Requests',
        },
      ];
    } else if (activeGarageRole === 'magasinier') {
      dockNavItems = [
        {
          id: 'shop',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'قطع الغيار' : language === 'fr' ? 'Pièces' : 'Parts',
          label: language === 'ar' ? 'قطع الغيار' : language === 'fr' ? 'Pièces' : 'Parts',
        },
        {
          id: 'dashboard',
          icon: <ClipboardList size={19} />,
          title: language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Demandes' : 'Requests',
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'المشتريات' : language === 'fr' ? 'Commandes' : 'Purchases',
          label: language === 'ar' ? 'المشتريات' : language === 'fr' ? 'Commandes' : 'Purchases',
        },
        {
          id: 'finance',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'الاستلام' : language === 'fr' ? 'Réceptions' : 'Deliveries',
          label: language === 'ar' ? 'الاستلام' : language === 'fr' ? 'Réceptions' : 'Deliveries',
        },
      ];
    } else if (activeGarageRole === 'caisse') {
      dockNavItems = [
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: t('nav_finance', language),
          label: t('nav_finance', language),
        },
        {
          id: 'dashboard',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Cashier',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Building2 size={19} />,
          title: language === 'ar' ? 'الأساطيل' : language === 'fr' ? 'Flottes' : 'Fleets',
          label: language === 'ar' ? 'الأساطيل' : language === 'fr' ? 'Flottes' : 'Fleets',
        },
        {
          id: 'scheduler',
          icon: <CheckCircle2 size={19} />,
          title: language === 'ar' ? 'للدفع' : language === 'fr' ? 'À Régler' : 'To Pay',
          label: language === 'ar' ? 'للدفع' : language === 'fr' ? 'À Régler' : 'To Pay',
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Wrench size={19} />,
          title: language === 'ar' ? 'الإصلاحات' : language === 'fr' ? 'Réparations' : 'Repairs',
          label: language === 'ar' ? 'الإصلاحات' : language === 'fr' ? 'Réparations' : 'Repairs',
        },
        {
          id: 'members',
          icon: <Car size={19} />,
          title: language === 'ar' ? 'المركبات' : language === 'fr' ? 'Véhicules' : 'Vehicles',
          label: language === 'ar' ? 'المركبات' : language === 'fr' ? 'Véhicules' : 'Vehicles',
        },
        {
          id: 'shop',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'قطع الغيار' : language === 'fr' ? 'Pièces' : 'Parts',
          label: language === 'ar' ? 'قطع الغيار' : language === 'fr' ? 'Pièces' : 'Parts',
        },
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: t('nav_finance', language),
          label: t('nav_finance', language),
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else if (category === 'real_estate') {
    if (activeRealEstateRole === 'negociateur') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'realestate_mandates',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'الوكالات' : language === 'fr' ? 'Mandats' : 'Mandates',
          label: language === 'ar' ? 'الوكالات' : language === 'fr' ? 'Mandats' : 'Mandates',
        },
        {
          id: 'members',
          icon: <Building2 size={19} />,
          title: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
          label: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
        },
        {
          id: 'registrations',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'الزيارات' : language === 'fr' ? 'Visites' : 'Visits',
          label: language === 'ar' ? 'الزيارات' : language === 'fr' ? 'Visites' : 'Visits',
        },
      ];
    } else if (activeRealEstateRole === 'gestionnaire_locatif') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Building2 size={19} />,
          title: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
          label: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
        },
        {
          id: 'scheduler',
          icon: <Key size={19} />,
          title: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
          label: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
        },
        {
          id: 'finance',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'الوصولات' : language === 'fr' ? 'Quittances' : 'Receipts',
          label: language === 'ar' ? 'الوصولات' : language === 'fr' ? 'Quittances' : 'Receipts',
        },
        {
          id: 'registrations',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'المعاينة' : language === 'fr' ? 'Inspections' : 'Inspections',
          label: language === 'ar' ? 'المعاينة' : language === 'fr' ? 'Inspections' : 'Inspections',
        },
      ];
    } else if (activeRealEstateRole === 'notaire_compta') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'finance',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'الحسابات' : language === 'fr' ? 'Comptes' : 'Closing',
          label: language === 'ar' ? 'الحسابات' : language === 'fr' ? 'Comptes' : 'Closing',
        },
        {
          id: 'scheduler',
          icon: <Key size={19} />,
          title: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
          label: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
        },
        {
          id: 'realestate_mandates',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'العمولات' : language === 'fr' ? 'Honoraires' : 'Fees',
          label: language === 'ar' ? 'العمولات' : language === 'fr' ? 'Honoraires' : 'Fees',
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'realestate_mandates',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'الوكالات' : language === 'fr' ? 'Mandats' : 'Mandates',
          label: language === 'ar' ? 'الوكالات' : language === 'fr' ? 'Mandats' : 'Mandates',
        },
        {
          id: 'members',
          icon: <Building2 size={19} />,
          title: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
          label: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
        },
        {
          id: 'scheduler',
          icon: <Key size={19} />,
          title: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
          label: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
        },
        {
          id: 'registrations',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'الزيارات' : language === 'fr' ? 'Visites' : 'Visits',
          label: language === 'ar' ? 'الزيارات' : language === 'fr' ? 'Visites' : 'Visits',
        },
        {
          id: 'finance',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'الوصولات' : language === 'fr' ? 'Quittances' : 'Receipts',
          label: language === 'ar' ? 'الوصولات' : language === 'fr' ? 'Quittances' : 'Receipts',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else if (category === 'manufacturing_production') {
    if (activeManufacturingRole === 'chef_atelier') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Factory size={19} />,
          title: language === 'ar' ? 'التصنيع' : language === 'fr' ? 'Production' : 'Orders',
          label: language === 'ar' ? 'التصنيع' : language === 'fr' ? 'Production' : 'Orders',
        },
        {
          id: 'shop',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Recettes' : 'Recipes',
          label: language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Recettes' : 'Recipes',
        },
        {
          id: 'members',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'المواد' : language === 'fr' ? 'Matières' : 'Materials',
          label: language === 'ar' ? 'المواد' : language === 'fr' ? 'Matières' : 'Materials',
        },
        {
          id: 'finance',
          icon: <ShieldCheck size={19} />,
          title: language === 'ar' ? 'الجودة' : language === 'fr' ? 'Qualité' : 'Quality',
          label: language === 'ar' ? 'الجودة' : language === 'fr' ? 'Qualité' : 'Quality',
        },
      ];
    } else if (activeManufacturingRole === 'operateur') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'المحطة' : language === 'fr' ? 'Poste' : 'Station',
          label: language === 'ar' ? 'المحطة' : language === 'fr' ? 'Poste' : 'Station',
        },
        {
          id: 'scheduler',
          icon: <Factory size={19} />,
          title: language === 'ar' ? 'مهامي' : language === 'fr' ? 'Mes Tâches' : 'My Tasks',
          label: language === 'ar' ? 'مهامي' : language === 'fr' ? 'Mes Tâches' : 'My Tasks',
        },
      ];
    } else if (activeManufacturingRole === 'magasinier') {
      dockNavItems = [
        {
          id: 'members',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'المخزن' : language === 'fr' ? 'Magasin' : 'Depot',
          label: language === 'ar' ? 'المخزن' : language === 'fr' ? 'Magasin' : 'Depot',
        },
        {
          id: 'shop',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'المخرجات' : language === 'fr' ? 'Sorties' : 'Issues',
          label: language === 'ar' ? 'المخرجات' : language === 'fr' ? 'Sorties' : 'Issues',
        },
        {
          id: 'finance',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'التحويلات' : language === 'fr' ? 'Mouvements' : 'Transfers',
          label: language === 'ar' ? 'التحويلات' : language === 'fr' ? 'Mouvements' : 'Transfers',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
      ];
    } else if (activeManufacturingRole === 'qualite') {
      dockNavItems = [
        {
          id: 'finance',
          icon: <ShieldCheck size={19} />,
          title: language === 'ar' ? 'الجودة' : language === 'fr' ? 'Contrôle' : 'Quality',
          label: language === 'ar' ? 'الجودة' : language === 'fr' ? 'Contrôle' : 'Quality',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'الحجر' : language === 'fr' ? 'Quarantaine' : 'Quarantine',
          label: language === 'ar' ? 'الحجر' : language === 'fr' ? 'Quarantaine' : 'Quarantine',
        },
        {
          id: 'scheduler',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'المعايرة' : language === 'fr' ? 'Mesures' : 'Calibration',
          label: language === 'ar' ? 'المعايرة' : language === 'fr' ? 'Mesures' : 'Calibration',
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Factory size={19} />,
          title: language === 'ar' ? 'التصنيع' : language === 'fr' ? 'Production' : 'Orders',
          label: language === 'ar' ? 'التصنيع' : language === 'fr' ? 'Production' : 'Orders',
        },
        {
          id: 'shop',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Recettes' : 'Recipes',
          label: language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Recettes' : 'Recipes',
        },
        {
          id: 'members',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'المواد' : language === 'fr' ? 'Matières' : 'Materials',
          label: language === 'ar' ? 'المواد' : language === 'fr' ? 'Matières' : 'Materials',
        },
        {
          id: 'finance',
          icon: <ShieldCheck size={19} />,
          title: language === 'ar' ? 'الجودة' : language === 'fr' ? 'Qualité' : 'Quality',
          label: language === 'ar' ? 'الجودة' : language === 'fr' ? 'Qualité' : 'Quality',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else if (category === 'legal_accounting') {
    if (activeLegalRole === 'notaire_titulaire') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <BookOpen size={19} />,
          title: language === 'ar' ? 'العقود' : language === 'fr' ? 'Actes' : 'Deeds',
          label: language === 'ar' ? 'العقود' : language === 'fr' ? 'Actes' : 'Deeds',
        },
        {
          id: 'scheduler',
          icon: <Landmark size={19} />,
          title: language === 'ar' ? 'الشهر العقاري' : language === 'fr' ? 'Foncier' : 'Registry',
          label: language === 'ar' ? 'الشهر العقاري' : language === 'fr' ? 'Foncier' : 'Registry',
        },
        {
          id: 'registrations',
          icon: <ShieldCheck size={19} />,
          title: language === 'ar' ? 'الأرشيف' : language === 'fr' ? 'Archives' : 'Archives',
          label: language === 'ar' ? 'الأرشيف' : language === 'fr' ? 'Archives' : 'Archives',
        },
        {
          id: 'finance',
          icon: <Lock size={19} />,
          title: language === 'ar' ? 'الودائع' : language === 'fr' ? 'Dépôts' : 'Escrow',
          label: language === 'ar' ? 'الودائع' : language === 'fr' ? 'Dépôts' : 'Escrow',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    } else if (activeLegalRole === 'expert_comptable') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Briefcase size={19} />,
          title: language === 'ar' ? 'الشركات' : language === 'fr' ? 'Mandats' : 'Clients',
          label: language === 'ar' ? 'الشركات' : language === 'fr' ? 'Mandats' : 'Clients',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: language === 'ar' ? 'المواعيد' : language === 'fr' ? 'Échéances' : 'Tax Dates',
          label: language === 'ar' ? 'المواعيد' : language === 'fr' ? 'Échéances' : 'Tax Dates',
        },
        {
          id: 'registrations',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'التدقيق' : language === 'fr' ? 'Audit' : 'Audit',
          label: language === 'ar' ? 'التدقيق' : language === 'fr' ? 'Audit' : 'Audit',
        },
        {
          id: 'finance',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'المحاسبة' : language === 'fr' ? 'Comptabilité' : 'Ledger',
          label: language === 'ar' ? 'المحاسبة' : language === 'fr' ? 'Comptabilité' : 'Ledger',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    } else if (activeLegalRole === 'secretaire_caisse') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: language === 'ar' ? 'العملاء' : language === 'fr' ? 'Clients' : 'Clients',
          label: language === 'ar' ? 'العملاء' : language === 'fr' ? 'Clients' : 'Clients',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: language === 'ar' ? 'التبليغ' : language === 'fr' ? 'Courrier' : 'Service Log',
          label: language === 'ar' ? 'التبليغ' : language === 'fr' ? 'Courrier' : 'Service Log',
        },
        {
          id: 'registrations',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'الإيداع' : language === 'fr' ? 'Dépôts' : 'Filing',
          label: language === 'ar' ? 'الإيداع' : language === 'fr' ? 'Dépôts' : 'Filing',
        },
        {
          id: 'finance',
          icon: <CreditCard size={19} />,
          title: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Cashier',
          label: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Cashier',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Briefcase size={19} />,
          title: language === 'ar' ? 'القضايا' : language === 'fr' ? 'Dossiers' : 'Cases',
          label: language === 'ar' ? 'القضايا' : language === 'fr' ? 'Dossiers' : 'Cases',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: language === 'ar' ? 'الجلسات' : language === 'fr' ? 'Audiences' : 'Hearings',
          label: language === 'ar' ? 'الجلسات' : language === 'fr' ? 'Audiences' : 'Hearings',
        },
        {
          id: 'registrations',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'المستندات' : language === 'fr' ? 'Documents' : 'Vault',
          label: language === 'ar' ? 'المستندات' : language === 'fr' ? 'Documents' : 'Vault',
        },
        {
          id: 'finance',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'الأتعاب' : language === 'fr' ? 'Honoraires' : 'Fees',
          label: language === 'ar' ? 'الأتعاب' : language === 'fr' ? 'Honoraires' : 'Fees',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else if (category === 'logistics_delivery') {
    if (activeLogisticsRole === 'dispatcher') {
      dockNavItems = [
        {
          id: 'scheduler',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'المسارات' : language === 'fr' ? 'Tournées' : 'Runs',
          label: language === 'ar' ? 'المسارات' : language === 'fr' ? 'Tournées' : 'Runs',
        },
        {
          id: 'members',
          icon: <Package size={19} />,
          title: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Parcels',
          label: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Parcels',
        },
        {
          id: 'registrations',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
          label: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    } else if (activeLogisticsRole === 'hub_sorter') {
      dockNavItems = [
        {
          id: 'registrations',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
          label: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
        },
        {
          id: 'members',
          icon: <Package size={19} />,
          title: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Parcels',
          label: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Parcels',
        },
        {
          id: 'scheduler',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'الشحن' : language === 'fr' ? 'Chargement' : 'Loading',
          label: language === 'ar' ? 'الشحن' : language === 'fr' ? 'Chargement' : 'Loading',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
      ];
    } else if (activeLogisticsRole === 'stop_desk_agent') {
      dockNavItems = [
        {
          id: 'members',
          icon: <Package size={19} />,
          title: language === 'ar' ? 'الاستلام' : language === 'fr' ? 'Guichet' : 'Counter',
          label: language === 'ar' ? 'الاستلام' : language === 'fr' ? 'Guichet' : 'Counter',
        },
        {
          id: 'finance',
          icon: <CreditCard size={19} />,
          title: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Cashier',
          label: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Cashier',
        },
        {
          id: 'registrations',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'الرفوف' : language === 'fr' ? 'Rayons' : 'Shelving',
          label: language === 'ar' ? 'الرفوف' : language === 'fr' ? 'Rayons' : 'Shelving',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Package size={19} />,
          title: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Parcels',
          label: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Parcels',
        },
        {
          id: 'scheduler',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'المسارات' : language === 'fr' ? 'Tournées' : 'Runs',
          label: language === 'ar' ? 'المسارات' : language === 'fr' ? 'Tournées' : 'Runs',
        },
        {
          id: 'registrations',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
          label: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
        },
        {
          id: 'finance',
          icon: <CreditCard size={19} />,
          title: language === 'ar' ? 'التحصيل' : language === 'fr' ? 'Encaissements' : 'Payouts',
          label: language === 'ar' ? 'التحصيل' : language === 'fr' ? 'Encaissements' : 'Payouts',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else if (category === 'construction_contractor') {
    if (activeContractorRole === 'gerant') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Building size={19} />,
          title: language === 'ar' ? 'المشاريع' : language === 'fr' ? 'Projets' : 'Projects',
          label: language === 'ar' ? 'المشاريع' : language === 'fr' ? 'Projets' : 'Projects',
        },
        {
          id: 'scheduler',
          icon: <Clock size={19} />,
          title: language === 'ar' ? 'الآجال' : language === 'fr' ? 'Délais' : 'Deadlines',
          label: language === 'ar' ? 'الآجال' : language === 'fr' ? 'Délais' : 'Deadlines',
        },
        {
          id: 'finance',
          icon: <Landmark size={19} />,
          title: language === 'ar' ? 'الخزينة' : language === 'fr' ? 'Trésorerie' : 'Treasury',
          label: language === 'ar' ? 'الخزينة' : language === 'fr' ? 'Trésorerie' : 'Treasury',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    } else if (activeContractorRole === 'conducteur' || activeContractorRole === 'conducteur_travaux') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <TrendingUp size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <HardHat size={19} />,
          title: language === 'ar' ? 'الورشات' : language === 'fr' ? 'Chantiers' : 'Sites',
          label: language === 'ar' ? 'الورشات' : language === 'fr' ? 'Chantiers' : 'Sites',
        },
        {
          id: 'shop',
          icon: <ClipboardList size={19} />,
          title: language === 'ar' ? 'الكميات' : language === 'fr' ? 'Devis' : 'Quantities',
          label: language === 'ar' ? 'الكميات' : language === 'fr' ? 'Devis' : 'Quantities',
        },
        {
          id: 'scheduler',
          icon: <CheckCircle2 size={19} />,
          title: language === 'ar' ? 'المختبر' : language === 'fr' ? 'Laboratoire' : 'Lab',
          label: language === 'ar' ? 'المختبر' : language === 'fr' ? 'Laboratoire' : 'Lab',
        },
        {
          id: 'finance',
          icon: <Users size={19} />,
          title: language === 'ar' ? 'المناولون' : language === 'fr' ? 'Sous-traitants' : 'Subcontractors',
          label: language === 'ar' ? 'المناولون' : language === 'fr' ? 'Sous-traitants' : 'Subcontractors',
        },
      ];
    } else if (activeContractorRole === 'chef_chantier') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Users size={19} />,
          title: language === 'ar' ? 'الحضور' : language === 'fr' ? 'Pointage' : 'Attendance',
          label: language === 'ar' ? 'الحضور' : language === 'fr' ? 'Pointage' : 'Attendance',
        },
        {
          id: 'members',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'اليومية' : language === 'fr' ? 'Journal' : 'Site Log',
          label: language === 'ar' ? 'اليومية' : language === 'fr' ? 'Journal' : 'Site Log',
        },
        {
          id: 'shop',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'الخرسانة' : language === 'fr' ? 'Béton' : 'Concrete',
          label: language === 'ar' ? 'الخرسانة' : language === 'fr' ? 'Béton' : 'Concrete',
        },
        {
          id: 'finance',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'المعدات' : language === 'fr' ? 'Engins' : 'Equipment',
          label: language === 'ar' ? 'المعدات' : language === 'fr' ? 'Engins' : 'Equipment',
        },
      ];
    } else if (activeContractorRole === 'metreur' || activeContractorRole === 'daf_metreur') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <TrendingUp size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'shop',
          icon: <ClipboardList size={19} />,
          title: language === 'ar' ? 'الأسعار' : language === 'fr' ? 'Devis' : 'Estimates',
          label: language === 'ar' ? 'الأسعار' : language === 'fr' ? 'Devis' : 'Estimates',
        },
        {
          id: 'scheduler',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'الكشوف' : language === 'fr' ? 'Situations' : 'Statements',
          label: language === 'ar' ? 'الكشوف' : language === 'fr' ? 'Situations' : 'Statements',
        },
        {
          id: 'finance',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'المراجعة' : language === 'fr' ? 'Révision' : 'Revisions',
          label: language === 'ar' ? 'المراجعة' : language === 'fr' ? 'Révision' : 'Revisions',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Wallet size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'finance',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'الفواتير' : language === 'fr' ? 'Décomptes' : 'Billings',
          label: language === 'ar' ? 'الفواتير' : language === 'fr' ? 'Décomptes' : 'Billings',
        },
        {
          id: 'scheduler',
          icon: <Cloud size={19} />,
          title: language === 'ar' ? 'التعويضات' : language === 'fr' ? 'Intempéries' : 'Weather Claims',
          label: language === 'ar' ? 'التعويضات' : language === 'fr' ? 'Intempéries' : 'Weather Claims',
        },
        {
          id: 'shop',
          icon: <CreditCard size={19} />,
          title: language === 'ar' ? 'الموردون' : language === 'fr' ? 'Fournisseurs' : 'Suppliers',
          label: language === 'ar' ? 'الموردون' : language === 'fr' ? 'Fournisseurs' : 'Suppliers',
        },
        {
          id: 'members',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Petty Cash',
          label: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Petty Cash',
        },
      ];
    }
  } else if (category === 'agriculture_farming') {
    if (activeAgriRole === 'chef_culture') {
      dockNavItems = [
        {
          id: 'members',
          icon: <Sprout size={19} />,
          title: language === 'ar' ? 'القطع' : language === 'fr' ? 'Parcelles' : 'Parcels',
          label: language === 'ar' ? 'القطع' : language === 'fr' ? 'Parcelles' : 'Parcels',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: language === 'ar' ? 'المحاصيل' : language === 'fr' ? 'Cultures' : 'Crops',
          label: language === 'ar' ? 'المحاصيل' : language === 'fr' ? 'Cultures' : 'Crops',
        },
        {
          id: 'shop',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'العمال' : language === 'fr' ? 'Pointage' : 'Workers',
          label: language === 'ar' ? 'العمال' : language === 'fr' ? 'Pointage' : 'Workers',
        },
      ];
    } else if (activeAgriRole === 'zootechnicien') {
      dockNavItems = [
        {
          id: 'registrations',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'المواشي' : language === 'fr' ? 'Cheptel' : 'Livestock',
          label: language === 'ar' ? 'المواشي' : language === 'fr' ? 'Cheptel' : 'Livestock',
        },
      ];
    } else if (activeAgriRole === 'magasinier') {
      dockNavItems = [
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: language === 'ar' ? 'الميزان' : language === 'fr' ? 'Bascule' : 'Weighbridge',
          label: language === 'ar' ? 'الميزان' : language === 'fr' ? 'Bascule' : 'Weighbridge',
        },
        {
          id: 'shop',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'الحصاد' : language === 'fr' ? 'Récoltes' : 'Harvest',
          label: language === 'ar' ? 'الحصاد' : language === 'fr' ? 'Récoltes' : 'Harvest',
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Sprout size={19} />,
          title: language === 'ar' ? 'القطع' : language === 'fr' ? 'Parcelles' : 'Parcels',
          label: language === 'ar' ? 'القطع' : language === 'fr' ? 'Parcelles' : 'Parcels',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: language === 'ar' ? 'المحاصيل' : language === 'fr' ? 'Cultures' : 'Crops',
          label: language === 'ar' ? 'المحاصيل' : language === 'fr' ? 'Cultures' : 'Crops',
        },
        {
          id: 'shop',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'العمال' : language === 'fr' ? 'Pointage' : 'Workers',
          label: language === 'ar' ? 'العمال' : language === 'fr' ? 'Pointage' : 'Workers',
        },
        {
          id: 'registrations',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'المواشي' : language === 'fr' ? 'Cheptel' : 'Livestock',
          label: language === 'ar' ? 'المواشي' : language === 'fr' ? 'Cheptel' : 'Livestock',
        },
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: language === 'ar' ? 'الميزان' : language === 'fr' ? 'Bascule' : 'Weighbridge',
          label: language === 'ar' ? 'الميزان' : language === 'fr' ? 'Bascule' : 'Weighbridge',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  } else {
    if (activeMembershipRole === 'staff') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'الاستقبال' : language === 'fr' ? 'Accueil' : 'Front Desk',
          label: language === 'ar' ? 'الاستقبال' : language === 'fr' ? 'Accueil' : 'Front Desk',
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: terminology.members,
          label: terminology.members,
        },
        {
          id: 'registrations',
          icon: <ClipboardList size={19} />,
          title: terminology.registration,
          label: terminology.registration,
        },
      ];
    } else {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: t('nav_home', language),
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: terminology.members,
          label: terminology.members,
        },
        {
          id: 'registrations',
          icon: <ClipboardList size={19} />,
          title: terminology.registration,
          label: terminology.registration,
        },
        {
          id: 'history',
          icon: <History size={19} />,
          title: t('nav_history', language),
          label: t('nav_history', language),
        },
        {
          id: 'shop',
          icon: <ShoppingBag size={19} />,
          title: terminology.shop,
          label: terminology.shop,
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: terminology.scheduler,
          label: terminology.scheduler,
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    }
  }

  // Unified Staff / Workforce Screen Injection Across All Categories
  const effectiveRole = getEffectiveUserRole(category, {
    currentUser,
    activePmRole,
    activeGarageRole,
    activeRealEstateRole,
    activeManufacturingRole,
    activeLegalRole,
    activeLogisticsRole,
    activeContractorRole,
    activeAgriRole,
    activeMembershipRole,
    activeAppointmentRole,
    activePosRole,
    activeEducationRole,
  });

  if (category !== 'project_milestone' && canAccessStaffScreen(category, effectiveRole)) {
    const hasStaffItem = dockNavItems.some((item) => item.id === 'staff');
    if (!hasStaffItem) {
      const staffNavItem = {
        id: 'staff' as ActiveScreen,
        icon: <Users size={19} />,
        title: language === 'ar' ? 'الفريق' : language === 'fr' ? 'Équipe' : 'Staff',
        label: language === 'ar' ? 'الفريق' : language === 'fr' ? 'Équipe' : 'Staff',
      };
      const settingsIndex = dockNavItems.findIndex((item) => item.id === 'settings');
      if (settingsIndex >= 0) {
        dockNavItems.splice(settingsIndex, 0, staffNavItem);
      } else {
        dockNavItems.push(staffNavItem);
      }
    }
  }

  
  const handleItemSelect = (id: string) => {
    const item = dockNavItems.find(it => it.id === id);
    if (!item) {
      setScreen(id as ActiveScreen);
      return;
    }
    setScreen(item.id);
    if (category === 'project_milestone') {
      if (item.id === 'pm_dir_dashboard' || item.id === 'dashboard') {
        setActivePmRole('direction');
        setActivePmSubScreen('dashboard');
      } else if (item.id === 'pm_dir_new_project') {
        setActivePmRole('direction');
        setActivePmSubScreen('new_project');
      } else if (item.id === 'pm_dir_projects') {
        setActivePmRole('direction');
        setActivePmSubScreen('dashboard');
      } else if (item.id === 'pm_dir_approvals') {
        setActivePmRole('direction');
        setActivePmSubScreen('approvals');
      } else if (item.id === 'pm_dir_reports') {
        setActivePmRole('direction');
        setActivePmSubScreen('reports');
      } else if (item.id === 'pm_cp_projects' || item.id === 'scheduler') {
        setActivePmRole('chef_projet');
        setActivePmSubScreen('portfolio');
      } else if (item.id === 'pm_cp_catalog') {
        setActivePmRole('chef_projet');
        setActivePmSubScreen('catalog');
      } else if (item.id === 'pm_cp_orders') {
        setActivePmRole('chef_projet');
        setActivePmSubScreen('orders');
      } else if (item.id === 'pm_cp_files' || item.id === 'pm_cp_deliverables') {
        setActivePmRole('chef_projet');
        setActivePmSubScreen('bat');
      } else if (item.id === 'pm_cp_expenses') {
        setActivePmRole('chef_projet');
        setActivePmSubScreen('expenses');
      } else if (item.id === 'pm_crea_kanban' || item.id === 'registrations') {
        setActivePmRole('crea');
        setActivePmSubScreen('demandes');
      } else if (item.id === 'pm_crea_production') {
        setActivePmRole('crea');
        setActivePmSubScreen('production');
      } else if (item.id === 'pm_crea_upload') {
        setActivePmRole('crea');
        setActivePmSubScreen('upload');
      } else if (item.id === 'pm_crea_briefs') {
        setActivePmRole('crea');
        setActivePmSubScreen('briefs');
      } else if (item.id === 'pm_sup_missions' || item.id === 'analytics') {
        setActivePmRole('superviseur');
        setActivePmSubScreen('missions');
      } else if (item.id === 'pm_sup_attendance') {
        setActivePmRole('superviseur');
        setActivePmSubScreen('attendance');
      } else if (item.id === 'pm_sup_staffing') {
        setActivePmRole('superviseur');
        setActivePmSubScreen('staffing');
      } else if (item.id === 'pm_sup_expenses') {
        setActivePmRole('superviseur');
        setActivePmSubScreen('expense');
      } else if (item.id === 'pm_rh_talents' || item.id === 'members') {
        setActivePmRole('rh');
        setActivePmSubScreen('talents');
      } else if (item.id === 'pm_rh_dossier') {
        setActivePmRole('rh');
        setActivePmSubScreen('dossier');
      } else if (item.id === 'pm_rh_portal') {
        setActivePmRole('rh');
        setActivePmSubScreen('portal');
      } else if (item.id === 'pm_rh_walkin') {
        setActivePmRole('rh');
        setActivePmSubScreen('walkin');
      } else if (item.id === 'pm_compta_payroll' || item.id === 'finance') {
        setActivePmRole('compta');
        setActivePmSubScreen('payroll');
      } else if (item.id === 'pm_compta_ccp') {
        setActivePmRole('compta');
        setActivePmSubScreen('ccp');
      } else if (item.id === 'pm_compta_expenses') {
        setActivePmRole('compta');
        setActivePmSubScreen('expenses');
      } else if (item.id === 'pm_compta_stock') {
        setActivePmRole('compta');
        setActivePmSubScreen('stock');
      }
    }
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarItems: SidebarItem[] = dockNavItems.map(item => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
  }));

  // Resolve current active item id
  let activeId: string = activeScreen;
  if (!sidebarItems.some(it => it.id === activeId)) {
    if (activeScreen === 'trading_dashboard' && sidebarItems.some(it => it.id === 'dashboard')) {
      activeId = 'dashboard';
    } else if (activeScreen === 'dashboard' && sidebarItems.some(it => it.id === 'trading_dashboard')) {
      activeId = 'trading_dashboard';
    } else if (activeScreen === 'dashboard' && sidebarItems.some(it => it.id.includes('dashboard'))) {
      activeId = sidebarItems.find(it => it.id.includes('dashboard'))!.id;
    } else if (category === 'project_milestone') {
      const match = sidebarItems.find(it => 
        it.id === activeScreen || 
        it.id.startsWith(`pm_${activePmRole}`) ||
        (activeScreen.includes('project') && it.id.includes('project'))
      );
      if (match) activeId = match.id;
    } else {
      const directMatch = sidebarItems.find(it => 
        activeScreen.startsWith(it.id) || it.id.startsWith(activeScreen)
      );
      if (directMatch) {
        activeId = directMatch.id;
      } else if (sidebarItems.length > 0 && (activeScreen === 'dashboard' || activeScreen.includes('dashboard'))) {
        activeId = sidebarItems[0].id;
      }
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Kinetic Spring-Driven Sidebar from Atrium UI */}
      <div className={"h-full select-none shrink-0 z-40 fixed inset-y-0 left-0 transition-transform lg:static lg:translate-x-0 " + (isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0")}>

        <AtriumSidebar
          items={sidebarItems}
          activeId={activeId}
          onSelect={handleItemSelect}
          open={isExpanded}
          onOpenChange={setIsExpanded}
          expandOn="click"
          brand={{
            mark: <AtriumLogo variant="mark" height={24} style={{ color: '#E8643F' }} />,
            title: 'ATRIUM',
          }}
          footer={
            category === 'project_milestone' ? (
              <div className="flex flex-col items-center gap-1 px-2">
                <div className="w-7 h-7 rounded-lg bg-[#d4522f] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {activePmRole === 'direction' ? 'D' : activePmRole === 'chef_projet' ? 'Y' : activePmRole === 'crea' ? 'M' : activePmRole === 'superviseur' ? 'S' : activePmRole === 'rh' ? 'R' : 'N'}
                </div>
                <span className="text-[9px] text-white/70 truncate tracking-wider uppercase font-semibold">
                  ATRIUM
                </span>
              </div>
            ) : (
              <span className="text-[9px] font-sans text-white/70 tracking-widest uppercase block select-none">
                ATRIUM
              </span>
            )
          }
        />
      </div>
    </>
  );
};
