import React, { useState } from 'react';
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

interface SidebarProps {
  onOpenVoucherModal: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenVoucherModal,
  isOpenMobile = false,
  onCloseMobile,
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
    language,
  } = useAtriumStore();
  const [isExpanded, setIsExpanded] = useState(false);
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
    // Dedicated POS & Inventory Architecture: Register is primary workstation
    dockNavItems = [
      {
        id: 'shop',
        icon: <ShoppingBag size={19} />,
        title: t('nav_pos_register', language) || 'Caisse Enregistreuse',
        label: language === 'ar' ? 'نقطة البيع' : language === 'fr' ? 'Caisse' : 'Register',
      },
      {
        id: 'scheduler',
        icon: <Boxes size={19} />,
        title: language === 'ar' ? 'المخزون والمنتجات' : language === 'fr' ? 'Stock & Inventaire' : 'Inventory & Stock',
        label: language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stock' : 'Inventory',
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: language === 'ar' ? 'الطلبات والتذاكر المعلقة' : language === 'fr' ? 'Commandes & Tickets' : 'Orders & Parked',
        label: language === 'ar' ? 'الطلبات' : language === 'fr' ? 'Commandes' : 'Orders',
      },
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: t('nav_pos_sales_pulse', language),
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
        title: t('nav_pos_finance', language),
        label: t('nav_finance', language),
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: t('nav_settings', language),
        label: t('nav_settings', language),
      },
    ];
  } else if (category === 'appointment_service') {
    // Dedicated Salon & Spa Architecture: Bookings & Clients are primary
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: t('nav_dashboard', language),
        label: t('nav_home', language),
      },
      {
        id: 'scheduler',
        icon: <Calendar size={19} />,
        title: t('nav_scheduler', language),
        label: terminology.scheduler,
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: t('nav_members', language),
        label: terminology.members,
      },
      {
        id: 'shop',
        icon: <ShoppingBag size={19} />,
        title: t('nav_shop', language),
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
  } else if (category === 'rental_booking') {
    // Dedicated Rentals, Venues & Space Bookings Architecture
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: t('nav_venue_dashboard', language),
        label: t('nav_home', language),
      },
      {
        id: 'scheduler',
        icon: <Calendar size={19} />,
        title: t('nav_venue_timeline', language),
        label: terminology.scheduler,
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: t('nav_venue_bookings', language),
        label: terminology.registration,
      },
      {
        id: 'shop',
        icon: <DoorOpen size={19} />,
        title: t('nav_venue_inventory', language),
        label: terminology.shop,
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: t('nav_venue_renters', language),
        label: terminology.members,
      },
      {
        id: 'finance',
        icon: <ShieldCheck size={19} />,
        title: t('nav_venue_finance', language),
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
    // Dedicated Education, Academy & Tutoring Architecture
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: t('nav_edu_dashboard', language),
        label: t('nav_home', language),
      },
      {
        id: 'scheduler',
        icon: <Calendar size={19} />,
        title: t('nav_edu_timetable', language),
        label: terminology.scheduler,
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: t('nav_edu_students', language),
        label: terminology.members,
      },
      {
        id: 'shop',
        icon: <GraduationCap size={19} />,
        title: t('nav_edu_cohorts', language),
        label: terminology.plan,
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: t('nav_edu_admissions', language),
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
        title: t('nav_edu_finance', language),
        label: t('nav_finance', language),
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: t('nav_settings', language),
        label: t('nav_settings', language),
      },
    ];
  } else if (category === 'trading_commercial') {
    // Dedicated Category 8: B2B Commercial Trading & Wholesale Architecture
    dockNavItems = [
      {
        id: 'trading_dashboard',
        icon: <Home size={19} />,
        title: t('nav_trading_dashboard', language),
        label: t('nav_home', language),
      },
      {
        id: 'trading_sales',
        icon: <FileText size={19} />,
        title: t('nav_trading_sales', language),
        label: language === 'ar' ? 'المبيعات' : language === 'fr' ? 'Ventes' : 'Sales',
      },
      {
        id: 'trading_purchases',
        icon: <Truck size={19} />,
        title: t('nav_trading_purchases', language),
        label: language === 'ar' ? 'المشتريات' : language === 'fr' ? 'Achats' : 'Purchases',
      },
      {
        id: 'trading_inventory',
        icon: <Boxes size={19} />,
        title: t('nav_trading_inventory', language),
        label: language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stocks' : 'Stock',
      },
      {
        id: 'trading_directory',
        icon: <Building2 size={19} />,
        title: t('nav_trading_directory', language),
        label: language === 'ar' ? 'الشركاء' : language === 'fr' ? 'Répertoire' : 'Directory',
      },
      {
        id: 'trading_catalog',
        icon: <ShoppingBag size={19} />,
        title: t('nav_trading_catalog', language),
        label: language === 'ar' ? 'المواد' : language === 'fr' ? 'Articles' : 'Catalog',
      },
      {
        id: 'trading_finance',
        icon: <Wallet size={19} />,
        title: t('nav_trading_finance', language),
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
    // Dedicated Category 9: Medical Clinic & Healthcare Architecture
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: language === 'ar' ? 'لوحة العيادة' : language === 'fr' ? 'Tableau Clinique' : 'Clinic Pulse',
        label: t('nav_home', language),
      },
      {
        id: 'scheduler',
        icon: <Clock size={19} />,
        title: language === 'ar' ? 'قائمة الانتظار والفرز' : language === 'fr' ? 'File d\'Attente & Triage' : 'Queue & Triage',
        label: language === 'ar' ? 'الانتظار' : language === 'fr' ? 'Triage' : 'Queue',
      },
      {
        id: 'agenda',
        icon: <Calendar size={19} />,
        title: language === 'ar' ? 'أجندة مواعيد الأطباء' : language === 'fr' ? 'Agenda Médecins' : 'Doctor Agenda',
        label: language === 'ar' ? 'الأجندة' : language === 'fr' ? 'Agenda' : 'Agenda',
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: language === 'ar' ? 'ملفات المرضى' : language === 'fr' ? 'Dossiers Patients (EHR)' : 'Patients (EHR)',
        label: language === 'ar' ? 'المرضى' : language === 'fr' ? 'Patients' : 'Patients',
      },
      {
        id: 'shop',
        icon: <Stethoscope size={19} />,
        title: language === 'ar' ? 'الوصفات الطبية والفحوصات' : language === 'fr' ? 'Ordonnances & Actes' : 'Prescriptions & Care',
        label: language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Ordonnances' : 'Prescriptions',
      },
      {
        id: 'registrations',
        icon: <FileText size={19} />,
        title: language === 'ar' ? 'الشهادات والوثائق الطبية' : language === 'fr' ? 'Certificats Médicaux' : 'Medical Certificates',
        label: language === 'ar' ? 'الشهادات' : language === 'fr' ? 'Certificats' : 'Certificates',
      },
      {
        id: 'finance',
        icon: <CreditCard size={19} />,
        title: language === 'ar' ? 'الفواتير والضمان الاجتماعي' : language === 'fr' ? 'Facturation & Chifa' : 'Billing & Insurance',
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
    // Dedicated Category 10: Auto Garage & Fleet Maintenance — Role-Adapted Navigation
    if (activeGarageRole === 'reception') {
      dockNavItems = [
        {
          id: 'scheduler',
          icon: <Wrench size={19} />,
          title: language === 'ar' ? 'استقبال المركبات وأمر التصليح' : language === 'fr' ? 'Entrées Atelier & OR (360°)' : 'Intake & Damage OR',
          label: language === 'ar' ? 'الاستقبال' : language === 'fr' ? 'Entrées OR' : 'Intake OR',
        },
        {
          id: 'members',
          icon: <Car size={19} />,
          title: language === 'ar' ? 'الزبائن والمركبات' : language === 'fr' ? 'Véhicules & Fiches Clients' : 'Vehicles & CRM',
          label: language === 'ar' ? 'المركبات' : language === 'fr' ? 'Véhicules' : 'Vehicles',
        },
        {
          id: 'finance',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'عروض الأسعار وموافقة واتساب' : language === 'fr' ? 'Devis & Approbations WhatsApp' : 'Quotes & WhatsApp',
          label: language === 'ar' ? 'التقديرات' : language === 'fr' ? 'Devis' : 'Quotes',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'قائمة انتظار الورشة' : language === 'fr' ? 'File d\'Attente Atelier' : 'Workshop Queue',
          label: t('nav_home', language),
        },
        {
          id: 'shop',
          icon: <Key size={19} />,
          title: language === 'ar' ? 'تسليم المفاتيح ورخصة الخروج' : language === 'fr' ? 'Véhicules Prêts & Bons de Sortie' : 'Handover & Exit Pass',
          label: language === 'ar' ? 'التسليم' : language === 'fr' ? 'Sorties' : 'Exits',
        },
      ];
    } else if (activeGarageRole === 'mecanicien') {
      dockNavItems = [
        {
          id: 'scheduler',
          icon: <Wrench size={19} />,
          title: language === 'ar' ? 'لوحة الجسور والرافعات' : language === 'fr' ? 'Tableau des Ponts & Baies (Kanban)' : 'Bay Kanban & Lifts',
          label: language === 'ar' ? 'الجسور' : language === 'fr' ? 'Ponts' : 'Bays',
        },
        {
          id: 'dashboard',
          icon: <Clock size={19} />,
          title: language === 'ar' ? 'مهام التصليح اليومية' : language === 'fr' ? 'Mes Réparations du Jour' : 'My Repair Tasks',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Car size={19} />,
          title: language === 'ar' ? 'فحص الأعطال OBD والتشخيص' : language === 'fr' ? 'Codes DTC & Valise OBD-II' : 'OBD-II Diagnostic DTC',
          label: language === 'ar' ? 'التشخيص' : language === 'fr' ? 'OBD DTC' : 'Diagnostics',
        },
        {
          id: 'shop',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'طلب قطع الغيار من المخزن' : language === 'fr' ? 'Demandes de Pièces Magasin' : 'Parts Requisitions',
          label: language === 'ar' ? 'طلب قطع' : language === 'fr' ? 'Demandes' : 'Requisitions',
        },
      ];
    } else if (activeGarageRole === 'magasinier') {
      dockNavItems = [
        {
          id: 'shop',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'المخزن والرفوف وقطع الغيار' : language === 'fr' ? 'Stock, Bacs & Références' : 'Parts Depot & Bins',
          label: language === 'ar' ? 'قطع الغيار' : language === 'fr' ? 'Pièces' : 'Parts',
        },
        {
          id: 'dashboard',
          icon: <ClipboardList size={19} />,
          title: language === 'ar' ? 'طلبات الصرف من الورشة' : language === 'fr' ? 'File des Demandes Atelier' : 'Requisition Queue',
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'طلبات التموين والموزعين' : language === 'fr' ? 'Commandes Fournisseurs (Bab Ezzouar)' : 'Supplier Orders (PO)',
          label: language === 'ar' ? 'الممونين' : language === 'fr' ? 'Commandes' : 'Purchases',
        },
        {
          id: 'finance',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'وصولات الاستلام ومطابقة البضاعة' : language === 'fr' ? 'Réception Marchandises & BL' : 'Deliveries & BL Check',
          label: language === 'ar' ? 'الاستلام' : language === 'fr' ? 'Réceptions' : 'Goods In',
        },
      ];
    } else if (activeGarageRole === 'caisse') {
      dockNavItems = [
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: language === 'ar' ? 'الصندوق والفواتير الجبائية' : language === 'fr' ? 'Factures DGI (19%+Timbre) & Caisse' : 'DGI Billing & Cash',
          label: t('nav_finance', language),
        },
        {
          id: 'dashboard',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'نقطة التحصيل والوصولات' : language === 'fr' ? 'Point d\'Encaissement & Bons' : 'Cashier Counter',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Building2 size={19} />,
          title: language === 'ar' ? 'حسابات أساطيل الشركات B2B' : language === 'fr' ? 'Comptes Flottes B2B & Relevés' : 'Fleet Accounts & AR',
          label: language === 'ar' ? 'الأساطيل' : language === 'fr' ? 'Flottes' : 'Fleets',
        },
        {
          id: 'scheduler',
          icon: <CheckCircle2 size={19} />,
          title: language === 'ar' ? 'مركبات منتهية بانتظار الدفع' : language === 'fr' ? 'Véhicules Réparés à Régler' : 'Pending Payment Queue',
          label: language === 'ar' ? 'الدفع' : language === 'fr' ? 'À Régler' : 'To Settle',
        },
      ];
    } else {
      // Default Gérant / Direction
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة أداء الورشة والهوامش' : language === 'fr' ? 'Tableau Atelier & Rentabilité' : 'Workshop Pulse & Margins',
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Wrench size={19} />,
          title: language === 'ar' ? 'أوامر التصليح وسير العمل' : language === 'fr' ? 'Registre des Réparations (OR)' : 'Work Orders (OR)',
          label: language === 'ar' ? 'التصليح' : language === 'fr' ? 'Ordres (OR)' : 'Orders',
        },
        {
          id: 'members',
          icon: <Car size={19} />,
          title: language === 'ar' ? 'المركبات وأساطيل B2B' : language === 'fr' ? 'Véhicules & Flottes d\'Entreprise' : 'Vehicles & Fleets',
          label: language === 'ar' ? 'المركبات' : language === 'fr' ? 'Véhicules' : 'Vehicles',
        },
        {
          id: 'shop',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'قطع الغيار وتقييم المخزون' : language === 'fr' ? 'Pièces & Valorisation Stock' : 'Parts & Stock Value',
          label: language === 'ar' ? 'قطع الغيار' : language === 'fr' ? 'Pièces' : 'Parts',
        },
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: language === 'ar' ? 'الفواتير والتحصيل والخزينة' : language === 'fr' ? 'Facturation DGI & Trésorerie' : 'Billing & Cash Flow',
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
    // Dedicated Category 11: Real Estate & Property Lease Management — Role-Adapted Navigation
    if (activeRealEstateRole === 'negociateur') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة نشاط المستشار العقاري' : language === 'fr' ? 'Mes Mandats & Activités' : 'Agent Pulse & Mandates',
          label: t('nav_home', language),
        },
        {
          id: 'realestate_mandates',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'سجل الوكالات والوساطة (09-18)' : language === 'fr' ? 'Registre des Mandats (09-18)' : 'Mandates Register (09-18)',
          label: language === 'ar' ? 'الوكالات' : language === 'fr' ? 'Mandats' : 'Mandates',
        },
        {
          id: 'members',
          icon: <Building2 size={19} />,
          title: language === 'ar' ? 'محفظة العقارات والسندات' : language === 'fr' ? 'Biens Immobiliers & Titres' : 'Properties & Titles',
          label: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
        },
        {
          id: 'registrations',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'وصولات الزيارة GPS وتوقيع الزبائن' : language === 'fr' ? 'Bons de Visite GPS & Signatures' : 'Visits GPS & Signatures',
          label: language === 'ar' ? 'الزيارات GPS' : language === 'fr' ? 'Visites GPS' : 'GPS Visits',
        },
      ];
    } else if (activeRealEstateRole === 'gestionnaire_locatif') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة تسيير الإيجارات والتحصيل' : language === 'fr' ? 'Tableau Gestion Locative & Impayés' : 'Rentals & Arrears Pulse',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Building2 size={19} />,
          title: language === 'ar' ? 'العقارات المخصصة للإيجار' : language === 'fr' ? 'Parc Locatif & Fiches Locataires' : 'Rental Units & Tenants',
          label: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
        },
        {
          id: 'scheduler',
          icon: <Key size={19} />,
          title: language === 'ar' ? 'عقود الكراء السكنية والتجارية' : language === 'fr' ? 'Baux & Contrats de Location' : 'Lease Contracts',
          label: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
        },
        {
          id: 'finance',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'وصولات الإيجار والطابع الجبائي 317' : language === 'fr' ? 'Quittances & Timbre Fiscal (Art. 317)' : 'Rent Receipts & Tax Stamp',
          label: language === 'ar' ? 'الوصولات' : language === 'fr' ? 'Quittances' : 'Receipts',
        },
        {
          id: 'registrations',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'محاضر معاينة الأماكن وقراءة العدادات' : language === 'fr' ? 'États des Lieux & Compteurs' : 'Check-In/Out & Meters',
          label: language === 'ar' ? 'المعاينة' : language === 'fr' ? 'États des Lieux' : 'Inspections',
        },
      ];
    } else if (activeRealEstateRole === 'notaire_compta') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'خزينة الوكالة والمستحقات الضريبية' : language === 'fr' ? 'Trésorerie Agence & Fiscalité' : 'Treasury & Tax Pulse',
          label: t('nav_home', language),
        },
        {
          id: 'finance',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'حسابات الموثق (08-243) ومستحقات الملاك' : language === 'fr' ? 'Frais Notaire (08-243) & Règlements' : 'Notary Closing (08-243) & Payouts',
          label: language === 'ar' ? 'الموثق والمالية' : language === 'fr' ? 'Notaire & Compta' : 'Notary & Finance',
        },
        {
          id: 'scheduler',
          icon: <Key size={19} />,
          title: language === 'ar' ? 'متابعة تدفقات الإيجار والأداء الجبائي' : language === 'fr' ? 'Flux Locatifs & Contrôle Timbre' : 'Rent Roll & Stamp Audit',
          label: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
        },
        {
          id: 'realestate_mandates',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'عمولات الوساطة ومطابقة المرسوم 09-18' : language === 'fr' ? 'Honoraires Mandats (Décret 09-18)' : 'Mandate Fees (09-18)',
          label: language === 'ar' ? 'العمولات' : language === 'fr' ? 'Honoraires' : 'Fees',
        },
      ];
    } else {
      // Direction / Gérant (Default: Complete Operational Access)
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة الوكالة العقارية' : language === 'fr' ? 'Tableau Agence' : 'Agency Pulse',
          label: t('nav_home', language),
        },
        {
          id: 'realestate_mandates',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'سجل الوكالات والوساطة (09-18)' : language === 'fr' ? 'Registre des Mandats (09-18)' : 'Mandates Register (09-18)',
          label: language === 'ar' ? 'الوكالات' : language === 'fr' ? 'Mandats' : 'Mandates',
        },
        {
          id: 'members',
          icon: <Building2 size={19} />,
          title: language === 'ar' ? 'محفظة العقارات والسندات' : language === 'fr' ? 'Biens Immobiliers & Titres' : 'Properties & Titles',
          label: language === 'ar' ? 'العقارات' : language === 'fr' ? 'Biens' : 'Properties',
        },
        {
          id: 'scheduler',
          icon: <Key size={19} />,
          title: language === 'ar' ? 'عقود الكراء' : language === 'fr' ? 'Baux & Contrats de Location' : 'Lease Contracts',
          label: language === 'ar' ? 'العقود' : language === 'fr' ? 'Contrats' : 'Leases',
        },
        {
          id: 'registrations',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'معاينة الأماكن ووصولات الزيارة GPS' : language === 'fr' ? 'États des Lieux & Bons de Visite' : 'Inspections & Visits',
          label: language === 'ar' ? 'الزيارات والمعاينة' : language === 'fr' ? 'Visites & EDLs' : 'Visits & EDLs',
        },
        {
          id: 'finance',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'الوصولات ومستحقات الملاك' : language === 'fr' ? 'Quittances & Règlements Propriétaires' : 'Rent Receipts & Payouts',
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
    // Dedicated Category 12: Light Manufacturing & Workshop Production — Role-Adapted Navigation
    if (activeManufacturingRole === 'chef_atelier') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة قيادة الورشة والأداء' : language === 'fr' ? 'Tableau Atelier & Goulots' : 'Workshop Pulse & Bottlenecks',
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Factory size={19} />,
          title: language === 'ar' ? 'أوامر التصنيع ومتابعة المراحل (OF)' : language === 'fr' ? 'Ordres de Fabrication (OF Kanban)' : 'Work Orders (OF Kanban)',
          label: language === 'ar' ? 'أوامر التصنيع' : language === 'fr' ? 'Ordres (OF)' : 'Orders',
        },
        {
          id: 'shop',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'قوائم المكونات والوصفات (BOM)' : language === 'fr' ? 'Nomenclatures & Recettes (BOM)' : 'Bill of Materials',
          label: language === 'ar' ? 'المكونات' : language === 'fr' ? 'Nomenclatures' : 'BOM',
        },
        {
          id: 'members',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'طلبات صرف المواد الأولية' : language === 'fr' ? 'Bons de Sortie Matières Atelier' : 'Material Requisitions',
          label: language === 'ar' ? 'صرف المواد' : language === 'fr' ? 'Sorties' : 'Issues',
        },
        {
          id: 'finance',
          icon: <ShieldCheck size={19} />,
          title: language === 'ar' ? 'متابعة الجودة ومحاضر عدم المطابقة' : language === 'fr' ? 'Fiches Qualité & Non-Conformités' : 'QC Sheets & Defects',
          label: language === 'ar' ? 'الجودة' : language === 'fr' ? 'Qualité' : 'Quality',
        },
      ];
    } else if (activeManufacturingRole === 'operateur') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'شاشة اللمس لمحطة العمل والميقاتية' : language === 'fr' ? 'Terminal Poste de Travail (Touch)' : 'Workstation Touch Kiosk',
          label: language === 'ar' ? 'المحطة' : language === 'fr' ? 'Mon Poste' : 'Station',
        },
        {
          id: 'scheduler',
          icon: <Factory size={19} />,
          title: language === 'ar' ? 'أوامر العمل والمهام المسندة لي اليوم' : language === 'fr' ? 'Mes Bons de Travail du Jour' : 'My Work Tasks',
          label: language === 'ar' ? 'مهامي' : language === 'fr' ? 'Mes Tâches' : 'My Tasks',
        },
      ];
    } else if (activeManufacturingRole === 'magasinier') {
      dockNavItems = [
        {
          id: 'members',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'مخزن المواد الأولية والمواقع' : language === 'fr' ? 'Magasin Matières & Emplacements' : 'Raw Materials Depot',
          label: language === 'ar' ? 'المخزن' : language === 'fr' ? 'Magasin' : 'Depot',
        },
        {
          id: 'shop',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'وصولات الخروج الرسمية (مرسوم 05-468)' : language === 'fr' ? 'Bons de Sortie Magasin (Décret 05)' : 'Issue Vouchers (BSM)',
          label: language === 'ar' ? 'وصولات الخروج' : language === 'fr' ? 'Bons de Sortie' : 'Exit Slips',
        },
        {
          id: 'finance',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'وصولات الاستلام والتسليم للزبائن' : language === 'fr' ? 'Réceptions (BR) & Livraisons (BL)' : 'Goods In & Out (BL)',
          label: language === 'ar' ? 'الاستلام والتسليم' : language === 'fr' ? 'BR & BL' : 'Transfers',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'حركة المخزون وإعادة الطلب' : language === 'fr' ? 'Tableau Mouvements de Stock' : 'Stock Movements',
          label: t('nav_home', language),
        },
      ];
    } else if (activeManufacturingRole === 'qualite') {
      dockNavItems = [
        {
          id: 'finance',
          icon: <ShieldCheck size={19} />,
          title: language === 'ar' ? 'سجل مراقبة الجودة وشهادات IANOR' : language === 'fr' ? 'Contrôle Qualité & Certificats IANOR' : 'QC Register & Tests',
          label: language === 'ar' ? 'مراقبة الجودة' : language === 'fr' ? 'Contrôle' : 'QC Tests',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'الدفعات في الحجر الصحي والتصنيف' : language === 'fr' ? 'Lots en Quarantaine & Rebuts' : 'Quarantine & Scrap',
          label: language === 'ar' ? 'الحجر الصحي' : language === 'fr' ? 'Quarantaine' : 'Quarantine',
        },
        {
          id: 'scheduler',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'متابعة معايرة الموازين والأجهزة (ONML)' : language === 'fr' ? 'Étalonnage Instruments (ONML)' : 'Metrology Calibration',
          label: language === 'ar' ? 'المعايرة' : language === 'fr' ? 'Métrologie' : 'Calibration',
        },
      ];
    } else {
      // Direction / Gérant (Default: Full Factory Oversight)
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة ورشة التصنيع والهوامش' : language === 'fr' ? 'Tableau Usine & Marges' : 'Plant Pulse & Margins',
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Factory size={19} />,
          title: language === 'ar' ? 'أوامر التصنيع وسير العمل (OF)' : language === 'fr' ? 'Ordres de Fabrication (OF)' : 'Work Orders (OF)',
          label: language === 'ar' ? 'أوامر التصنيع' : language === 'fr' ? 'Ordres (OF)' : 'Orders',
        },
        {
          id: 'shop',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'قوائم المكونات والتسعير (BOM)' : language === 'fr' ? 'Nomenclatures & Coûts (BOM)' : 'Bill of Materials',
          label: language === 'ar' ? 'المكونات' : language === 'fr' ? 'Nomenclatures' : 'BOM',
        },
        {
          id: 'members',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'المواد الأولية وتقييم المخزون' : language === 'fr' ? 'Matières Premières & Stocks' : 'Raw Materials',
          label: language === 'ar' ? 'المواد' : language === 'fr' ? 'Matières' : 'Materials',
        },
        {
          id: 'finance',
          icon: <ShieldCheck size={19} />,
          title: language === 'ar' ? 'مراقبة الجودة والتكاليف' : language === 'fr' ? 'Contrôle Qualité & Coûts' : 'QC & Costing',
          label: language === 'ar' ? 'الجودة' : language === 'fr' ? 'Qualité & Coûts' : 'QC & Costs',
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
    // Dedicated Category 13: Legal Cabinets & Accounting Firms — Strict Role Partition
    if (activeLegalRole === 'notaire_titulaire') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة تسيير مكتب التوثيق' : language === 'fr' ? 'Tableau Étude Notariale' : 'Notary Study Pulse',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <BookOpen size={19} />,
          title: language === 'ar' ? 'سجل العقود الرسمية (المرسوم 08-243)' : language === 'fr' ? 'Répertoire des Actes (Décret 08-243)' : 'Official Deed Register',
          label: language === 'ar' ? 'سجل العقود' : language === 'fr' ? 'Répertoire' : 'Deeds',
        },
        {
          id: 'scheduler',
          icon: <Landmark size={19} />,
          title: language === 'ar' ? 'متابعة الشهر العقاري والمحافظة العقارية' : language === 'fr' ? 'Conservation Foncière & Cadastre' : 'Cadastre & Registry',
          label: language === 'ar' ? 'المحافظة العقارية' : language === 'fr' ? 'Conservation' : 'Cadastre',
        },
        {
          id: 'registrations',
          icon: <ShieldCheck size={19} />,
          title: language === 'ar' ? 'حفظ الأصول والمستخرجات الرسمية' : language === 'fr' ? 'Conservation des Minutes' : 'Minute Archives',
          label: language === 'ar' ? 'الأصول' : language === 'fr' ? 'Minutes' : 'Minutes',
        },
        {
          id: 'finance',
          icon: <Lock size={19} />,
          title: language === 'ar' ? 'حساب الحراسة والودائع العقارية' : language === 'fr' ? 'Compte Séquestre Immobilier' : 'Escrow Vault',
          label: language === 'ar' ? 'الودائع' : language === 'fr' ? 'Séquestre' : 'Escrow',
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
          title: language === 'ar' ? 'لوحة مكتب الخبير المحاسب ومحافظ الحسابات' : language === 'fr' ? 'Tableau Cabinet d\'Expertise & Audit' : 'Audit Firm Pulse',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Briefcase size={19} />,
          title: language === 'ar' ? 'ملفات الزبائن والشركات الخاضعة للتدقيق' : language === 'fr' ? 'Dossiers Mandats & Entreprises' : 'Audit Mandates',
          label: language === 'ar' ? 'الشركات' : language === 'fr' ? 'Mandats' : 'Mandates',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: language === 'ar' ? 'رزنامة التصريحات الجبائية G50 وCNAS' : language === 'fr' ? 'Échéancier Fiscal G50 & CNAS' : 'Fiscal Calendar G50',
          label: language === 'ar' ? 'الرزنامة الجبائية' : language === 'fr' ? 'Échéancier G50' : 'Fiscal Dates',
        },
        {
          id: 'registrations',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'أوراق العمل وتقارير محافظ الحسابات' : language === 'fr' ? 'Dossiers de Travail & Rapports CAC' : 'Audit Working Papers',
          label: language === 'ar' ? 'أوراق العمل' : language === 'fr' ? 'Audit CAC' : 'Audit Papers',
        },
        {
          id: 'finance',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'دفتر الأستاذ وميزان المراجعة SCF' : language === 'fr' ? 'Grand Livre & Balance SCF' : 'SCF General Ledger',
          label: language === 'ar' ? 'المحاسبة SCF' : language === 'fr' ? 'Comptabilité' : 'SCF Ledger',
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
          title: language === 'ar' ? 'أمانة الضبط والاستقبال والبريد' : language === 'fr' ? 'Accueil & Formalités du Jour' : 'Front-Desk Hub',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: language === 'ar' ? 'دليل الموكلين والأطراف والمعرف الوطني NIN' : language === 'fr' ? 'Répertoire Clients & NIN/NIF' : 'Client Directory',
          label: language === 'ar' ? 'الموكلين' : language === 'fr' ? 'Clients' : 'Clients',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: language === 'ar' ? 'محاضر التبليغ القضائي والمحضرون القضائيون' : language === 'fr' ? 'Courrier & Huissiers du Jour' : 'Bailiff Log',
          label: language === 'ar' ? 'المحضرون' : language === 'fr' ? 'Huissiers' : 'Bailiffs',
        },
        {
          id: 'registrations',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'إيداع المستندات ووصولات الاستلام' : language === 'fr' ? 'Dépôt & Classement Pièces' : 'Incoming Docs',
          label: language === 'ar' ? 'الإيداع' : language === 'fr' ? 'Classement' : 'Filing',
        },
        {
          id: 'finance',
          icon: <CreditCard size={19} />,
          title: language === 'ar' ? 'الصندوق وطابع المادة 317 ومحضر الإغلاق' : language === 'fr' ? 'Caisse & Timbre Art. 317 (Arrêté)' : 'Cashier & Stamp 317',
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
      // Default: avocat_associe
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة قضايا المحاماة ورادار المواعيد' : language === 'fr' ? 'Tableau Contentieux & Délais' : 'Litigation Pulse',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Briefcase size={19} />,
          title: language === 'ar' ? 'ملفات القضايا والموكلين' : language === 'fr' ? 'Affaires & Dossiers Contentieux' : 'Case Matters',
          label: language === 'ar' ? 'القضايا' : language === 'fr' ? 'Dossiers' : 'Matters',
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: language === 'ar' ? 'جدول الجلسات ومواعيد الاستئناف CPCA' : language === 'fr' ? 'Audiences & Délais CPCA' : 'Court Hearings',
          label: language === 'ar' ? 'الجلسات' : language === 'fr' ? 'Audiences' : 'Hearings',
        },
        {
          id: 'registrations',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'خزينة المستندات والعرائض القضائية' : language === 'fr' ? 'Coffre-fort & Requêtes' : 'Legal Vault',
          label: language === 'ar' ? 'العرائض' : language === 'fr' ? 'Requêtes' : 'Vault',
        },
        {
          id: 'finance',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'حساب الحراسة CARPA وأتعاب المحاماة' : language === 'fr' ? 'Honoraires & Compte CARPA' : 'CARPA & Fees',
          label: language === 'ar' ? 'الأتعاب' : language === 'fr' ? 'Honoraires' : 'Fees & Trust',
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
    // Dedicated Category 14: Logistics, Couriers & Parcel Dispatch — Role-Adaptive Sidebars
    if (activeLogisticsRole === 'dispatcher') {
      dockNavItems = [
        {
          id: 'scheduler',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'مسارات التوصيل للسائقين' : language === 'fr' ? 'Tournées & Manifestes Chauffeurs' : 'Driver Runs',
          label: language === 'ar' ? 'المسارات' : language === 'fr' ? 'Tournées' : 'Runs',
        },
        {
          id: 'members',
          icon: <Package size={19} />,
          title: language === 'ar' ? 'الطرود قيد التوزيع وإدارة الإخفاقات' : language === 'fr' ? 'Colis en Transit & Échecs' : 'Shipments & Holds',
          label: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Shipments',
        },
        {
          id: 'registrations',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'ماسح الأرصفة والأكياس' : language === 'fr' ? 'Scanner Quai & Sacs' : 'Dock Scanner',
          label: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'رادار الرحلات والفرز' : language === 'fr' ? 'Tournées & Alertes Délais' : 'Fleet Radar',
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
          title: language === 'ar' ? 'ماسح الفرز السريع والأكياس' : language === 'fr' ? 'Scanner Express Quai & Sacs' : 'Hub Scanner',
          label: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
        },
        {
          id: 'members',
          icon: <Package size={19} />,
          title: language === 'ar' ? 'سجل الطرود والأكياس' : language === 'fr' ? 'Colis & Sacs-Navette' : 'Parcels & Bags',
          label: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Parcels',
        },
        {
          id: 'scheduler',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'تحميل الشاحنات والختم الأمني' : language === 'fr' ? 'Chargement Camions & Scellés' : 'Truck Loading',
          label: language === 'ar' ? 'الشحن' : language === 'fr' ? 'Chargement' : 'Loading',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'معدل المسح اليومي' : language === 'fr' ? 'Cadence Quai & Débit' : 'Throughput',
          label: t('nav_home', language),
        },
      ];
    } else if (activeLogisticsRole === 'stop_desk_agent') {
      dockNavItems = [
        {
          id: 'members',
          icon: <Package size={19} />,
          title: language === 'ar' ? 'تسليم الطرود بمكتب Stop-Desk (رمز OTP)' : language === 'fr' ? 'Retrait Guichet Stop-Desk (OTP/CNI)' : 'Counter Pickup',
          label: language === 'ar' ? 'الاستلام' : language === 'fr' ? 'Guichet' : 'Counter',
        },
        {
          id: 'finance',
          icon: <CreditCard size={19} />,
          title: language === 'ar' ? 'صندوق الدفع نقداً وطابع المادة 317' : language === 'fr' ? 'Caisse Guichet & Timbre 317' : 'Cash Drawer',
          label: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Cashier',
        },
        {
          id: 'registrations',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'استلام الطرود على الرفوف' : language === 'fr' ? 'Réception & Rayonnage' : 'Shelving Scan',
          label: language === 'ar' ? 'الرفوف' : language === 'fr' ? 'Rayonnage' : 'Shelving',
        },
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة المكتب والطرود المنتهية' : language === 'fr' ? 'Arrivages & Délais 7 Jours' : 'Desk Pulse',
          label: t('nav_home', language),
        },
      ];
    } else {
      // Default: gerant
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'مركز الفرز والتوزيع (58 ولاية)' : language === 'fr' ? 'Hub Logistique & Pulse 58' : 'Hub Pulse 58',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Package size={19} />,
          title: language === 'ar' ? 'الطرود والشحنات (AWB)' : language === 'fr' ? 'Colis & Expéditions (AWB)' : 'Shipments (AWB)',
          label: language === 'ar' ? 'الطرود' : language === 'fr' ? 'Colis' : 'Parcels',
        },
        {
          id: 'scheduler',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'مسارات التوصيل للسائقين' : language === 'fr' ? 'Feuilles de Route Chauffeurs' : 'Driver Manifests',
          label: language === 'ar' ? 'مسارات التوزيع' : language === 'fr' ? 'Tournées' : 'Runs',
        },
        {
          id: 'registrations',
          icon: <Boxes size={19} />,
          title: language === 'ar' ? 'ماسح الفرز والاستلام' : language === 'fr' ? 'Scanner & Réceptions Hub' : 'Hub Scanner',
          label: language === 'ar' ? 'الماسح' : language === 'fr' ? 'Scanner' : 'Scanner',
        },
        {
          id: 'finance',
          icon: <CreditCard size={19} />,
          title: language === 'ar' ? 'تحصيل COD ومستحقات التجار' : language === 'fr' ? 'Caisse COD & Règlements Marchands' : 'COD Cash & Settlements',
          label: language === 'ar' ? 'COD والتجار' : language === 'fr' ? 'COD & Marchands' : 'COD & Payouts',
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
    // Dedicated Category 15: Construction, General Contracting & BTP (Role-Based Isolation)
    if (activeContractorRole === 'gerant') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'لوحة القيادة والمؤشرات' : language === 'fr' ? 'Supervision Direction' : 'Executive Pulse',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <Building size={19} />,
          title: language === 'ar' ? 'محفظة الصفقات والمشاريع' : language === 'fr' ? 'Portefeuille Marchés' : 'Tenders & Sites',
          label: language === 'ar' ? 'الصفقات' : language === 'fr' ? 'Marchés' : 'Tenders',
        },
        {
          id: 'scheduler',
          icon: <Clock size={19} />,
          title: language === 'ar' ? 'أوامر الخدمة والآجال القانونية (OS)' : language === 'fr' ? 'Ordres de Service (OS) & Délais' : 'OS & Legal Clocks',
          label: language === 'ar' ? 'أوامر OS' : language === 'fr' ? 'Ordres OS' : 'OS Clock',
        },
        {
          id: 'finance',
          icon: <Landmark size={19} />,
          title: language === 'ar' ? 'الخزينة والكفالات المصرفية' : language === 'fr' ? 'Trésorerie & Cautions Bancaires' : 'Treasury & Cautions',
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
          title: language === 'ar' ? 'لوحة العمليات والتقدم الميداني' : language === 'fr' ? 'Supervision Opérations Chantiers' : 'Field Operations',
          label: t('nav_home', language),
        },
        {
          id: 'members',
          icon: <HardHat size={19} />,
          title: language === 'ar' ? 'متابعة الورشات ومخطط الإنجاز' : language === 'fr' ? 'Suivi Chantiers & Planning' : 'Sites & Planning',
          label: language === 'ar' ? 'الورشات' : language === 'fr' ? 'Chantiers' : 'Sites',
        },
        {
          id: 'shop',
          icon: <ClipboardList size={19} />,
          title: language === 'ar' ? 'متابعة الحصص والكشف DQE' : language === 'fr' ? 'Avancement Lots & DQE' : 'DQE Progress',
          label: language === 'ar' ? 'الكشف DQE' : language === 'fr' ? 'DQE' : 'DQE',
        },
        {
          id: 'scheduler',
          icon: <CheckCircle2 size={19} />,
          title: language === 'ar' ? 'مراقبة الخرسانة ومطابقة CTC' : language === 'fr' ? 'Laboratoire Béton & Visa CTC' : 'Concrete Lab & CTC',
          label: language === 'ar' ? 'مراقبة CTC' : language === 'fr' ? 'Laboratoire' : 'Lab & CTC',
        },
        {
          id: 'finance',
          icon: <Users size={19} />,
          title: language === 'ar' ? 'محاضر المقاولين من الباطن' : language === 'fr' ? 'Attachements Sous-Traitants' : 'Subcontractors',
          label: language === 'ar' ? 'المناولة' : language === 'fr' ? 'Sous-traitance' : 'Subcontract',
        },
      ];
    } else if (activeContractorRole === 'chef_chantier') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: language === 'ar' ? 'مركز قيادة رئيس الورشة' : language === 'fr' ? 'Poste de Commandement Terrain' : 'Site Field Post',
          label: t('nav_home', language),
        },
        {
          id: 'scheduler',
          icon: <Users size={19} />,
          title: language === 'ar' ? 'تسجيل الحضور اليومي للعمال' : language === 'fr' ? 'Pointage Journalier des Équipes' : 'Daily Worker Muster',
          label: language === 'ar' ? 'الحضور' : language === 'fr' ? 'Pointage' : 'Roll-Call',
        },
        {
          id: 'members',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'دفتر الورشة اليومي وسجل الطقس' : language === 'fr' ? 'Journal de Chantier & Météo' : 'Site Diary & Weather',
          label: language === 'ar' ? 'دفتر الورشة' : language === 'fr' ? 'Journal' : 'Site Diary',
        },
        {
          id: 'shop',
          icon: <Truck size={19} />,
          title: language === 'ar' ? 'وصولات صب الخرسانة الجاهزة BPE' : language === 'fr' ? 'Bons de Coulage Béton BPE' : 'Ready-Mix Pour Slips',
          label: language === 'ar' ? 'الخرسانة' : language === 'fr' ? 'Coulage BPE' : 'Pours',
        },
        {
          id: 'finance',
          icon: <Scale size={19} />,
          title: language === 'ar' ? 'ساعات العتاد ومتابعة الوقود' : language === 'fr' ? 'Heures Engins & Suivi Gasoil' : 'Equipment & Fuel',
          label: language === 'ar' ? 'العتاد والوقود' : language === 'fr' ? 'Engins & Fuel' : 'Machinery',
        },
      ];
    } else if (activeContractorRole === 'metreur' || activeContractorRole === 'daf_metreur') {
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <TrendingUp size={19} />,
          title: language === 'ar' ? 'مكتب الدراسات وتقدير التكاليف' : language === 'fr' ? 'Cockpit Études & Chiffrage' : 'Estimating Studio',
          label: t('nav_home', language),
        },
        {
          id: 'shop',
          icon: <ClipboardList size={19} />,
          title: language === 'ar' ? 'جدول الأسعار الأحادية BPU و DQE' : language === 'fr' ? 'Studio DQE & Bordereau BPU' : 'DQE & BPU Studio',
          label: language === 'ar' ? 'BPU / DQE' : language === 'fr' ? 'DQE / BPU' : 'BPU / DQE',
        },
        {
          id: 'scheduler',
          icon: <FileCheck size={19} />,
          title: language === 'ar' ? 'الكشوف التناقضية الشهرية' : language === 'fr' ? 'Attachements Contradictoires' : 'Monthly Attachments',
          label: language === 'ar' ? 'الكشوف' : language === 'fr' ? 'Attachements' : 'Attachments',
        },
        {
          id: 'finance',
          icon: <Layers size={19} />,
          title: language === 'ar' ? 'مراجعة الأسعار بالمعادلة الرسمية' : language === 'fr' ? 'Révision des Prix Paramétrique' : 'Price Revisions',
          label: language === 'ar' ? 'المراجعة' : language === 'fr' ? 'Révision Prix' : 'Revisions',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: t('nav_settings', language),
          label: t('nav_settings', language),
        },
      ];
    } else {
      // Comptable Chantier & RAF
      dockNavItems = [
        {
          id: 'dashboard',
          icon: <Wallet size={19} />,
          title: language === 'ar' ? 'لوحة المحاسبة والفوترة BTP' : language === 'fr' ? 'Tableau Facturation & Trésor' : 'Billing & Treasury',
          label: t('nav_home', language),
        },
        {
          id: 'finance',
          icon: <FileText size={19} />,
          title: language === 'ar' ? 'الكشوف المؤقتة المرسوم 15-247' : language === 'fr' ? 'Décomptes Provisoires Décret 15-247' : 'Progress Billings',
          label: language === 'ar' ? 'الكشوف' : language === 'fr' ? 'Décomptes' : 'Billings',
        },
        {
          id: 'scheduler',
          icon: <Cloud size={19} />,
          title: language === 'ar' ? 'ملف تعويض سوء الأحوال CACOBATPH' : language === 'fr' ? 'Dossier Intempéries CACOBATPH 48h' : 'CACOBATPH 48h',
          label: language === 'ar' ? 'CACOBATPH' : language === 'fr' ? 'CACOBATPH' : 'Weather Claim',
        },
        {
          id: 'shop',
          icon: <CreditCard size={19} />,
          title: language === 'ar' ? 'فواتير الموردين والشركاء' : language === 'fr' ? 'Achats & Factures Fournisseurs' : 'Supplier Invoices',
          label: language === 'ar' ? 'الموردين' : language === 'fr' ? 'Fournisseurs' : 'Suppliers',
        },
        {
          id: 'members',
          icon: <Receipt size={19} />,
          title: language === 'ar' ? 'صندوق الورشة وطابع المادة 317' : language === 'fr' ? 'Caisse de Chantier & Timbre Art. 317' : 'Site Petty Cash',
          label: language === 'ar' ? 'الصندوق' : language === 'fr' ? 'Caisse' : 'Petty Cash',
        },
      ];
    }
  } else if (category === 'agriculture_farming') {
    // Dedicated Category 16: Agriculture, Farm & Livestock Management
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: language === 'ar' ? 'لوحة المستثمرة الفلاحية' : language === 'fr' ? 'Tableau du Domaine' : 'Farm Pulse',
        label: t('nav_home', language),
      },
      {
        id: 'members',
        icon: <Sprout size={19} />,
        title: language === 'ar' ? 'القطع والبيوت البلاستيكية' : language === 'fr' ? 'Parcelles & Serres' : 'Parcels & Greenhouses',
        label: language === 'ar' ? 'القطع الفلاحية' : language === 'fr' ? 'Parcelles' : 'Parcels',
      },
      {
        id: 'scheduler',
        icon: <Calendar size={19} />,
        title: language === 'ar' ? 'سجل العمليات الفلاحية (DAR)' : language === 'fr' ? 'Journal Cultural & Délais DAR' : 'Crop Cycle & DAR',
        label: language === 'ar' ? 'العمليات' : language === 'fr' ? 'Opérations' : 'Cycles',
      },
      {
        id: 'shop',
        icon: <Scale size={19} />,
        title: language === 'ar' ? 'المحاصيل والوزن العمومي' : language === 'fr' ? 'Récoltes & Pesage Public' : 'Harvest & Scale',
        label: language === 'ar' ? 'المحاصيل' : language === 'fr' ? 'Récoltes' : 'Harvest',
      },
      {
        id: 'registrations',
        icon: <Layers size={19} />,
        title: language === 'ar' ? 'تربية المواشي والإنتاج' : language === 'fr' ? 'Cheptel & Registre d\'Élevage' : 'Livestock Herd',
        label: language === 'ar' ? 'المواشي' : language === 'fr' ? 'Cheptel' : 'Livestock',
      },
      {
        id: 'finance',
        icon: <Wallet size={19} />,
        title: language === 'ar' ? 'مبيعات سوق الجملة والسيولة' : language === 'fr' ? 'Ventes Mandataires de Gros' : 'Wholesale Sales',
        label: language === 'ar' ? 'المبيعات' : language === 'fr' ? 'Ventes' : 'Sales',
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: t('nav_settings', language),
        label: t('nav_settings', language),
      },
    ];
  } else {
    // Membership / Gym & Fitness Architecture
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: t('nav_dashboard', language),
        label: t('nav_home', language),
      },
      {
        id: 'analytics',
        icon: <BarChart2 size={19} />,
        title: t('nav_analytics', language),
        label: t('nav_analytics', language),
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

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Floating Slim Dock Rail / Expandable Sidebar */}
      <aside
        style={{
          backgroundColor: 'var(--color-dock-bg)',
          borderRadius: 'var(--radius-dock)',
        }}
        className={`my-3 ml-3 flex flex-col items-center justify-between py-4 select-none shrink-0 z-40 fixed inset-y-0 left-0 transition-all duration-300 lg:static lg:translate-x-0 ${
          isExpanded ? 'w-[190px] px-3' : 'w-[60px]'
        } ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Logo Emblem with Expand Indicator */}
        <div className="relative group w-full flex items-center justify-center">
          <div
            onClick={onOpenVoucherModal}
            className={`rounded-2xl bg-[#2A2624] flex items-center cursor-pointer hover:bg-[#342F2B] transition-all p-2 ${
              isExpanded ? 'w-full gap-2.5 px-3' : 'w-10 h-10 justify-center'
            }`}
            title="Atrium Business Platform"
          >
            {/* 5-cubes geometric logo emblem matching desktop */}
            <FiveCubesLogo size={22} cubeColor="#C4785A" />

            {isExpanded && (
              <span className="text-xs font-bold text-white tracking-wide truncate">
                ATRIUM
              </span>
            )}
          </div>

          {/* Tiny circular expand chevron overlapping right edge as seen on desktop */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            title={isExpanded ? 'Collapse Dock' : 'Expand Dock'}
            className="absolute -right-2 top-3 w-4 h-4 rounded-full bg-[#C4785A] text-white flex items-center justify-center shadow-xs cursor-pointer hover:scale-110 transition-transform"
          >
            {isExpanded ? (
              <ChevronLeft size={10} strokeWidth={3} />
            ) : (
              <ChevronRight size={10} strokeWidth={3} />
            )}
          </button>
        </div>

        {/* Role Switcher in Sidebar for NCH Market Activator */}
        {category === 'project_milestone' && (
          <div className="w-full mt-3 mb-2 pt-2.5 border-t border-white/10 relative">
            {isExpanded ? (
              <div className="space-y-1.5 px-0.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-1">
                  <span>{t('pm_role_active_label')}</span>
                  <span className="text-[#C4785A] font-mono">
                    {activePmRole === 'direction' ? t('pm_role_direction_abbr') : activePmRole === 'chef_projet' ? t('pm_role_chef_projet_abbr') : activePmRole === 'crea' ? t('pm_role_crea_abbr') : activePmRole === 'superviseur' ? t('pm_role_superviseur_abbr') : activePmRole === 'rh' ? t('pm_role_rh_abbr') : t('pm_role_compta_abbr')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'direction' as const, label: t('pm_role_direction_name'), badge: t('pm_role_direction_abbr'), screen: 'pm_dir_dashboard' as const, sub: 'dashboard' },
                    { id: 'chef_projet' as const, label: t('pm_role_chef_projet_name'), badge: t('pm_role_chef_projet_abbr'), screen: 'pm_cp_projects' as const, sub: 'portfolio' },
                    { id: 'crea' as const, label: t('pm_role_crea_name'), badge: t('pm_role_crea_abbr'), screen: 'pm_crea_kanban' as const, sub: 'demandes' },
                    { id: 'superviseur' as const, label: t('pm_role_superviseur_name'), badge: t('pm_role_superviseur_abbr'), screen: 'pm_sup_missions' as const, sub: 'missions' },
                    { id: 'rh' as const, label: t('pm_role_rh_name'), badge: t('pm_role_rh_abbr'), screen: 'pm_rh_talents' as const, sub: 'talents' },
                    { id: 'compta' as const, label: t('pm_role_compta_name'), badge: t('pm_role_compta_abbr'), screen: 'pm_compta_payroll' as const, sub: 'payroll' },
                  ].map((r) => {
                    const isRoleActive = activePmRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setActivePmRole(r.id);
                          setScreen(r.screen);
                          setActivePmSubScreen(r.sub);
                        }}
                        className={`py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer font-bold text-[10px] ${
                          isRoleActive
                            ? 'bg-[#C4785A] text-white shadow-xs scale-102 ring-1 ring-[#C4785A]/50'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                        }`}
                        title={r.label}
                      >
                        {r.badge}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    const roles: Array<{ id: typeof activePmRole; screen: ActiveScreen; sub: string }> = [
                      { id: 'direction', screen: 'pm_dir_dashboard', sub: 'dashboard' },
                      { id: 'chef_projet', screen: 'pm_cp_projects', sub: 'portfolio' },
                      { id: 'crea', screen: 'pm_crea_kanban', sub: 'demandes' },
                      { id: 'superviseur', screen: 'pm_sup_missions', sub: 'missions' },
                      { id: 'rh', screen: 'pm_rh_talents', sub: 'talents' },
                      { id: 'compta', screen: 'pm_compta_payroll', sub: 'payroll' },
                    ];
                    const currIdx = roles.findIndex((r) => r.id === activePmRole);
                    const next = roles[(currIdx + 1) % roles.length];
                    setActivePmRole(next.id);
                    setScreen(next.screen);
                    setActivePmSubScreen(next.sub);
                  }}
                  className="w-9 h-9 rounded-xl bg-[#C4785A]/20 border border-[#C4785A]/40 text-[#C4785A] hover:bg-[#C4785A] hover:text-white flex items-center justify-center font-bold text-[11px] transition-all cursor-pointer shadow-xs active:scale-95"
                  title={`${t('pm_role_active_label')}: ${activePmRole === 'direction' ? t('pm_role_direction_name') : activePmRole === 'chef_projet' ? t('pm_role_chef_projet_name') : activePmRole === 'crea' ? t('pm_role_crea_name') : activePmRole === 'superviseur' ? t('pm_role_superviseur_name') : activePmRole === 'rh' ? t('pm_role_rh_name') : t('pm_role_compta_name')}`}
                >
                  {activePmRole === 'direction' ? t('pm_role_direction_abbr') : activePmRole === 'chef_projet' ? t('pm_role_chef_projet_abbr') : activePmRole === 'crea' ? t('pm_role_crea_abbr') : activePmRole === 'superviseur' ? t('pm_role_superviseur_abbr') : activePmRole === 'rh' ? t('pm_role_rh_abbr') : t('pm_role_compta_abbr')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Center Vertical Dock Navigation */}
        <nav className="flex flex-col items-center gap-2.5 my-auto w-full">
          {dockNavItems.map((item, index) => {
            const isActive =
              activeScreen === item.id ||
              (item.id === 'trading_dashboard' && activeScreen === 'dashboard') ||
              (item.id === 'dashboard' && activeScreen === 'trading_dashboard');

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
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
                }}
                title={item.title}
                style={{
                  backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#A1A1AA',
                }}
                className={`rounded-2xl flex items-center transition-all cursor-pointer ${
                  isExpanded
                    ? 'w-full h-10 px-3 gap-3 justify-start text-xs font-medium'
                    : 'w-10 h-10 justify-center'
                } ${
                  isActive
                    ? 'shadow-md scale-102 font-bold'
                    : 'hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
                {isExpanded && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Role Badge for NCH Market Activator matching slide footers */}
        {category === 'project_milestone' && (
          <div className={`mt-2 pt-2 border-t border-white/10 w-full flex items-center ${isExpanded ? 'px-2 gap-2.5 justify-start' : 'justify-center'}`}>
            <div className="w-7 h-7 rounded-lg bg-[#C4785A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {activePmRole === 'direction' ? 'D' : activePmRole === 'chef_projet' ? 'Y' : activePmRole === 'crea' ? 'M' : activePmRole === 'superviseur' ? 'S' : activePmRole === 'rh' ? 'R' : 'N'}
            </div>
            {isExpanded && (
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[11px] font-bold text-white truncate leading-tight">
                  {activePmRole === 'direction' ? 'Mme D. — DG' : activePmRole === 'chef_projet' ? 'K. Yacine — CDP' : activePmRole === 'crea' ? 'S. Meriem — DA' : activePmRole === 'superviseur' ? 'R. Sofiane — SUP' : activePmRole === 'rh' ? 'N. Ryma — RH' : 'F. Nassima — CPT'}
                </span>
                <span className="text-[9px] text-[#A1A1AA] truncate">
                  NCH Platform
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Logo Script */}
        <div className="text-center pt-2">
          <span className="text-[9px] font-serif text-[#C4785A]/70 tracking-widest uppercase block select-none">
            {isExpanded ? 'NCH PLATFORM' : 'nch'}
          </span>
        </div>
      </aside>
    </>
  );
};
