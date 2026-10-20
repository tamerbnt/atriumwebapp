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
} from 'lucide-react';
import { useAtriumStore, ActiveScreen } from '../../services/store';
import { FiveCubesLogo } from '../auth/AtriumMonolith';
import { t } from '../../utils/i18n';

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
  const {
    activeScreen,
    setScreen,
    terminology,
    currentBusiness,
    activePmRole,
    setActivePmRole,
    setActivePmSubScreen,
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
          title: 'Tableau de bord · Direction Générale',
          label: 'Tableau de bord',
        },
        {
          id: 'pm_dir_new_project',
          icon: <FileText size={19} />,
          title: 'Cahiers des charges · Injection & Cadrage',
          label: 'Cahiers des charges',
        },
        {
          id: 'pm_dir_projects',
          icon: <Kanban size={19} />,
          title: 'Projets · Vue globale agence',
          label: 'Projets',
        },
        {
          id: 'pm_dir_approvals',
          icon: <ShieldCheck size={19} />,
          title: 'Validations paie · Double-lock validation',
          label: 'Validations paie',
        },
        {
          id: 'pm_dir_reports',
          icon: <BarChart2 size={19} />,
          title: 'Rapports d\'activité et marges',
          label: 'Rapports',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: 'Paramètres agence',
          label: 'Paramètres',
        },
      ];
    } else if (activePmRole === 'chef_projet') {
      dockNavItems = [
        {
          id: 'pm_cp_projects',
          icon: <Kanban size={19} />,
          title: 'Mes projets · Portefeuille & Jalons',
          label: 'Mes projets',
        },
        {
          id: 'pm_cp_catalog',
          icon: <ShoppingBag size={19} />,
          title: 'Commander · Catalogue print & numérique',
          label: 'Commander',
        },
        {
          id: 'pm_cp_orders',
          icon: <Sparkles size={19} />,
          title: 'Suivi commandes & BAT Créa',
          label: 'Suivi commandes',
        },
        {
          id: 'pm_cp_files',
          icon: <FileText size={19} />,
          title: 'Fichiers reçus · BAT prêts pour impression',
          label: 'Fichiers reçus',
        },
        {
          id: 'pm_cp_expenses',
          icon: <Wallet size={19} />,
          title: 'Achats · Déclaration des achats projet',
          label: 'Achats',
        },
      ];
    } else if (activePmRole === 'crea') {
      dockNavItems = [
        {
          id: 'pm_crea_kanban',
          icon: <Layers size={19} />,
          title: 'Demandes & Briefs reçus',
          label: 'Demandes',
        },
        {
          id: 'pm_crea_production',
          icon: <Sparkles size={19} />,
          title: 'Production · Kanban de création',
          label: 'Production',
        },
        {
          id: 'pm_crea_upload',
          icon: <FileText size={19} />,
          title: 'Livrables · Upload BAT & Validateur',
          label: 'Livrables',
        },
        {
          id: 'pm_crea_briefs',
          icon: <FileText size={19} />,
          title: 'Cahiers des charges liés',
          label: 'Cahiers des charges',
        },
      ];
    } else if (activePmRole === 'superviseur') {
      dockNavItems = [
        {
          id: 'pm_sup_missions',
          icon: <Radio size={19} />,
          title: 'Mes missions · Activations terrain',
          label: 'Mes missions',
        },
        {
          id: 'pm_sup_staffing',
          icon: <Users size={19} />,
          title: 'Équipes · Composer son équipe',
          label: 'Équipes',
        },
        {
          id: 'pm_sup_attendance',
          icon: <Clock size={19} />,
          title: 'Pointage · Pointage du jour sur mobile',
          label: 'Pointage',
        },
        {
          id: 'pm_sup_expenses',
          icon: <FileText size={19} />,
          title: 'Notes & Frais terrain',
          label: 'Notes',
        },
      ];
    } else if (activePmRole === 'rh') {
      dockNavItems = [
        {
          id: 'pm_rh_talents',
          icon: <Users size={19} />,
          title: 'Vivier & Candidats 58 Wilayas',
          label: 'Vivier & Talents',
        },
        {
          id: 'pm_rh_dossier',
          icon: <FileText size={19} />,
          title: 'Dossier 360° & Fiche talent',
          label: 'Dossier 360°',
        },
        {
          id: 'pm_rh_portal',
          icon: <GraduationCap size={19} />,
          title: 'Pré-inscription en ligne (cvs/create)',
          label: 'Pré-inscription',
        },
        {
          id: 'pm_rh_walkin',
          icon: <DoorOpen size={19} />,
          title: 'Création directe agence (1 min)',
          label: 'Création agence',
        },
      ];
    } else {
      // compta
      dockNavItems = [
        {
          id: 'pm_compta_payroll',
          icon: <Wallet size={19} />,
          title: 'Paies · Validation & Montants terrain',
          label: 'Paies',
        },
        {
          id: 'pm_compta_ccp',
          icon: <CreditCard size={19} />,
          title: 'CCP générés · Formulaires SFP 01 en 1 clic',
          label: 'CCP générés',
        },
        {
          id: 'pm_compta_expenses',
          icon: <Receipt size={19} />,
          title: 'Dépenses & Justificatifs scannés',
          label: 'Dépenses',
        },
        {
          id: 'pm_compta_stock',
          icon: <Boxes size={19} />,
          title: 'Stock · Codé et tracé à vie (NCH-A-00xxx)',
          label: 'Stock',
        },
      ];
    }
  } else if (category === 'freelance_solo') {
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: 'Solo Command Dashboard',
        label: 'Home',
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: 'Clients CRM & 360° Inspector',
        label: 'Clients',
      },
      {
        id: 'scheduler',
        icon: <Kanban size={19} />,
        title: 'Deliverables & Deadlines Kanban',
        label: 'Deliverables',
      },
      {
        id: 'analytics',
        icon: <Clock size={19} />,
        title: 'Time Tracker & Pomodoro',
        label: 'Time Tracker',
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: 'Proposals & Inquiries',
        label: 'Proposals',
      },
      {
        id: 'shop',
        icon: <FileText size={19} />,
        title: 'Invoices & Billing Hub',
        label: 'Invoices',
      },
      {
        id: 'finance',
        icon: <Wallet size={19} />,
        title: 'Tax Reserves & Net Profit',
        label: 'Finance',
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: 'Settings & Workspace',
        label: 'Settings',
      },
    ];
  } else if (category === 'pos_inventory') {
    // Dedicated POS & Inventory Architecture: Register is primary workstation
    dockNavItems = [
      {
        id: 'shop',
        icon: <ShoppingBag size={19} />,
        title: 'POS Register & Inventory',
        label: 'Register & Stock',
      },
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: 'Register Sales Pulse & Overview',
        label: 'Home',
      },
      {
        id: 'history',
        icon: <History size={19} />,
        title: 'Sales Receipts & Cash Ledger',
        label: 'Sales Ledger',
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: 'Customer Directory & Accounts',
        label: 'Customers',
      },
      {
        id: 'analytics',
        icon: <BarChart2 size={19} />,
        title: 'Sales Velocity & Product Margins',
        label: 'Analytics',
      },
      {
        id: 'finance',
        icon: <Wallet size={19} />,
        title: 'Cash Flow & Staff Payroll',
        label: 'Finance',
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: 'Store Settings & Hardware',
        label: 'Settings',
      },
    ];
  } else if (category === 'appointment_service') {
    // Dedicated Salon & Spa Architecture: Bookings & Clients are primary
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: 'Salon Pulse Dashboard',
        label: 'Home',
      },
      {
        id: 'scheduler',
        icon: <Calendar size={19} />,
        title: 'Stylist & Treatment Calendar',
        label: 'Bookings',
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: 'Clients & Treatment History',
        label: 'Clients',
      },
      {
        id: 'shop',
        icon: <ShoppingBag size={19} />,
        title: 'Services & Beauty Products',
        label: 'Services',
      },
      {
        id: 'history',
        icon: <History size={19} />,
        title: 'Visits & Billing Ledger',
        label: 'History',
      },
      {
        id: 'analytics',
        icon: <BarChart2 size={19} />,
        title: 'Chair Utilization & Performance',
        label: 'Analytics',
      },
      {
        id: 'finance',
        icon: <Wallet size={19} />,
        title: 'Staff Commissions & Payroll',
        label: 'Finance',
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: 'Salon Settings & Locations',
        label: 'Settings',
      },
    ];
  } else if (category === 'rental_booking') {
    // Dedicated Rentals, Venues & Space Bookings Architecture
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: 'Venue & Space Operations Pulse',
        label: 'Home',
      },
      {
        id: 'scheduler',
        icon: <Calendar size={19} />,
        title: 'Occupancy Matrix & Timeline',
        label: 'Timeline',
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: 'Reservations & Event Inquiries',
        label: 'Reservations',
      },
      {
        id: 'shop',
        icon: <DoorOpen size={19} />,
        title: 'Spaces & Asset Inventory',
        label: 'Spaces & Units',
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: 'Renters & Client Directory',
        label: 'Renters',
      },
      {
        id: 'finance',
        icon: <ShieldCheck size={19} />,
        title: 'Caution Escrow & Rental Revenue',
        label: 'Caution & Revenue',
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: 'Venue Locations & Settings',
        label: 'Settings',
      },
    ];
  } else if (category === 'education_cohort') {
    // Dedicated Education, Academy & Tutoring Architecture
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: 'Academy Pulse Dashboard',
        label: 'Pulse',
      },
      {
        id: 'scheduler',
        icon: <Calendar size={19} />,
        title: 'Timetable & Classrooms Matrix',
        label: 'Timetable',
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: 'Students & Guardians CRM Directory',
        label: 'Students',
      },
      {
        id: 'shop',
        icon: <GraduationCap size={19} />,
        title: 'Cohorts, Courses & Syllabi Hub',
        label: 'Cohorts',
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: 'Admissions & Inquiries Funnel',
        label: 'Admissions',
      },
      {
        id: 'analytics',
        icon: <Award size={19} />,
        title: 'Roll Call Attendance & Gradebook Matrix',
        label: 'Attendance & Grades',
      },
      {
        id: 'finance',
        icon: <Wallet size={19} />,
        title: 'Tuition, Installments & Aging AR Radar',
        label: 'Tuition & Billing',
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: 'Academy Setup & Certificates',
        label: 'Settings',
      },
    ];
  } else {
    // Membership / Gym & Fitness Architecture
    dockNavItems = [
      {
        id: 'dashboard',
        icon: <Home size={19} />,
        title: 'Home Dashboard',
        label: 'Home',
      },
      {
        id: 'analytics',
        icon: <BarChart2 size={19} />,
        title: 'Facility Analytics',
        label: 'Analytics',
      },
      {
        id: 'members',
        icon: <Users size={19} />,
        title: `${terminology.members} Directory`,
        label: terminology.members,
      },
      {
        id: 'registrations',
        icon: <ClipboardList size={19} />,
        title: `${terminology.registration} & Intake`,
        label: terminology.registration,
      },
      {
        id: 'history',
        icon: <History size={19} />,
        title: 'Operations History',
        label: 'History',
      },
      {
        id: 'shop',
        icon: <ShoppingBag size={19} />,
        title: `${terminology.shop} & Products`,
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
        title: 'Finance & Staff',
        label: 'Finance',
      },
      {
        id: 'settings',
        icon: <Settings size={19} />,
        title: 'Settings & License',
        label: 'Settings',
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
                  <span>Rôle Actif</span>
                  <span className="text-[#C4785A] font-mono">
                    {activePmRole === 'direction' ? 'DG' : activePmRole === 'chef_projet' ? 'CDP' : activePmRole === 'crea' ? 'CR' : activePmRole === 'superviseur' ? 'SUP' : activePmRole === 'rh' ? 'RH' : 'CPT'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'direction' as const, label: 'Direction Générale', badge: 'DG', screen: 'pm_dir_dashboard' as const, sub: 'dashboard' },
                    { id: 'chef_projet' as const, label: 'Chef de Projet', badge: 'CDP', screen: 'pm_cp_projects' as const, sub: 'portfolio' },
                    { id: 'crea' as const, label: 'Studio Créa', badge: 'CR', screen: 'pm_crea_kanban' as const, sub: 'demandes' },
                    { id: 'superviseur' as const, label: 'Superviseur Terrain', badge: 'SUP', screen: 'pm_sup_missions' as const, sub: 'missions' },
                    { id: 'rh' as const, label: 'Ressources Humaines', badge: 'RH', screen: 'pm_rh_talents' as const, sub: 'talents' },
                    { id: 'compta' as const, label: 'Comptabilité & Paie', badge: 'CPT', screen: 'pm_compta_payroll' as const, sub: 'payroll' },
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
                  title={`Rôle: ${activePmRole} (Cliquer pour changer de rôle)`}
                >
                  {activePmRole === 'direction' ? 'DG' : activePmRole === 'chef_projet' ? 'CDP' : activePmRole === 'crea' ? 'CR' : activePmRole === 'superviseur' ? 'SUP' : activePmRole === 'rh' ? 'RH' : 'CPT'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Center Vertical Dock Navigation */}
        <nav className="flex flex-col items-center gap-2.5 my-auto w-full">
          {dockNavItems.map((item, index) => {
            const isActive = activeScreen === item.id;

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
