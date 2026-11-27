import React, { useState, useEffect, useMemo, useRef } from 'react';
import { KineticModalShell } from '../ui/kinetic/KineticModalShell';
import {
  Search,
  Home,
  Users,
  Calendar,
  ShoppingBag,
  CreditCard,
  History,
  Settings,
  Sparkles,
  Sun,
  Moon,
  ArrowRight,
  User,
  Package,
  FileText,
  Clock,
  Layers,
  GraduationCap,
  DoorOpen,
  X,
  Command,
  ShieldCheck,
  BarChart2,
  Kanban,
  Radio,
  Wallet,
  Activity,
  Truck,
  Boxes,
  Building2,
  LayoutDashboard,
  Globe,
  Layout,
} from 'lucide-react';
import {
  ActiveScreen,
  selectCurrentBusinessFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentEduStudentsFromState,
  selectCurrentFreelanceClientsFromState,
  selectCurrentFreelanceInvoicesFromState,
  selectCurrentMembersFromState,
  selectCurrentProductsFromState,
  selectCurrentRentalBookingsFromState,
  selectCurrentRentalRentersFromState,
  selectTerminologyFromState,
  shallowEqualObjects,
  useAtriumActions,
  useAtriumSelector,
} from '../../services/store';
import { t } from '../../utils/i18n';
import { localizeStatus } from '../../utils/rules';
import { normalizeBusinessCategory } from '../../utils/staffRules';
import { canAccessRoute } from '../../utils/routePermissions';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setScreen, setTheme, setLanguage, setDensity, openFastSwitch, openOnboarding, selectMember } = useAtriumActions();
  const {
    activeScreen,
    currentBusiness,
    theme,
    density,
    terminology,
    members,
    products,
    freelanceClients,
    freelanceInvoices,
    rentalRenters,
    rentalBookings,
    eduStudents,
    eduCohorts,
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
    currentBusinessId,
    rbacPermissions,
    language,
  } = useAtriumSelector(
    (s) => ({
      activeScreen: s.activeScreen,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBusinessId: s.currentBusinessId,
      rbacPermissions: s.rbacPermissions,
      theme: s.theme,
      density: s.density || 'default',
      terminology: selectTerminologyFromState(s),
      members: selectCurrentMembersFromState(s),
      products: selectCurrentProductsFromState(s),
      freelanceClients: selectCurrentFreelanceClientsFromState(s),
      freelanceInvoices: selectCurrentFreelanceInvoicesFromState(s),
      rentalRenters: selectCurrentRentalRentersFromState(s),
      rentalBookings: selectCurrentRentalBookingsFromState(s),
      eduStudents: selectCurrentEduStudentsFromState(s),
      eduCohorts: selectCurrentEduCohortsFromState(s),
      currentUser: s.currentUser,
      activePmRole: s.activePmRole || 'direction',
      activeGarageRole: s.activeGarageRole || 'gerant',
      activeRealEstateRole: s.activeRealEstateRole || 'direction',
      activeManufacturingRole: s.activeManufacturingRole || 'gerant',
      activeLegalRole: s.activeLegalRole || 'avocat_associe',
      activeLogisticsRole: s.activeLogisticsRole || 'gerant',
      activeContractorRole: s.activeContractorRole || 'gerant',
      activeAgriRole: s.activeAgriRole || 'gerant',
      activeMembershipRole: s.activeMembershipRole || 'owner',
      activeAppointmentRole: s.activeAppointmentRole || 'owner',
      activePosRole: s.activePosRole || 'owner',
      activeEducationRole: s.activeEducationRole || 'owner',
      language: s.language,
    }),
    shallowEqualObjects
  );

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setIsBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const category = normalizeBusinessCategory(currentBusiness?.category);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [];
    const rbacMatrix = (rbacPermissions || []).filter(
      (r) => r.businessId === currentBusinessId && !r.deletedAt
    );
    const permState = {
      currentUser,
      businessId: currentBusinessId,
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
      rbacMatrix,
    };

    const navCategoryLabel = language === 'ar' ? 'التنقل' : language === 'fr' ? 'Navigation' : 'Navigation';
    const actionCategoryLabel = language === 'ar' ? 'إجراءات' : language === 'fr' ? 'Actions' : 'Actions';
    const dashboardLabel = language === 'ar' ? 'لوحة القيادة' : language === 'fr' ? 'Tableau de bord' : 'Dashboard';

    // 1. Navigation items — Global Home (Salle d'accueil) entry first
    list.push({
      id: 'nav-home',
      title: t('nav_home', language),
      subtitle: currentBusiness?.name,
      category: navCategoryLabel,
      icon: <Home size={15} />,
      onSelect: () => {
        setScreen('home');
        onClose();
      },
    });

    const canAccessHistoryScreen = canAccessRoute(category, permState, 'history');

    if (category === 'project_milestone') {
      const pmNavItems: Array<{ id: ActiveScreen; label: string; role: string; icon: React.ReactNode }> = [
        // Direction
        { id: 'pm_dir_dashboard', label: t('pm_screen_dir_dashboard', language), role: t('pm_role_direction_name', language), icon: <LayoutDashboard size={15} /> },
        { id: 'pm_dir_new_project', label: t('pm_screen_dir_new_project', language), role: t('pm_role_direction_name', language), icon: <FileText size={15} /> },
        { id: 'pm_dir_approvals', label: t('pm_screen_dir_approvals', language), role: t('pm_role_direction_name', language), icon: <ShieldCheck size={15} /> },
        { id: 'pm_dir_reports', label: t('pm_screen_dir_reports', language), role: t('pm_role_direction_name', language), icon: <BarChart2 size={15} /> },
        ...(canAccessHistoryScreen
          ? [{ id: 'history' as ActiveScreen, label: t('nav_history', language), role: t('pm_role_direction_name', language), icon: <History size={15} /> }]
          : []),
        // Chef de Projet
        { id: 'pm_cp_projects', label: t('pm_screen_cp_projects', language), role: t('pm_role_chef_projet_name', language), icon: <Kanban size={15} /> },
        { id: 'pm_cp_catalog', label: t('pm_screen_cp_catalog', language), role: t('pm_role_chef_projet_name', language), icon: <ShoppingBag size={15} /> },
        { id: 'pm_cp_orders', label: t('pm_screen_cp_orders', language), role: t('pm_role_chef_projet_name', language), icon: <Sparkles size={15} /> },
        { id: 'pm_cp_files', label: t('pm_screen_cp_deliverables', language), role: t('pm_role_chef_projet_name', language), icon: <FileText size={15} /> },
        { id: 'pm_cp_expenses', label: t('pm_screen_cp_expenses', language), role: t('pm_role_chef_projet_name', language), icon: <Wallet size={15} /> },
        // Créa
        { id: 'pm_crea_kanban', label: t('pm_screen_crea_kanban', language), role: t('pm_role_crea_name', language), icon: <Layers size={15} /> },
        { id: 'pm_crea_production', label: t('pm_screen_crea_production', language), role: t('pm_role_crea_name', language), icon: <Sparkles size={15} /> },
        { id: 'pm_crea_upload', label: t('pm_screen_crea_upload', language), role: t('pm_role_crea_name', language), icon: <FileText size={15} /> },
        { id: 'pm_crea_briefs', label: t('pm_screen_crea_briefs', language), role: t('pm_role_crea_name', language), icon: <FileText size={15} /> },
        // Superviseur
        { id: 'pm_sup_missions', label: t('pm_screen_sup_missions', language), role: t('pm_role_superviseur_name', language), icon: <Radio size={15} /> },
        { id: 'pm_sup_attendance', label: t('pm_screen_sup_attendance', language), role: t('pm_role_superviseur_name', language), icon: <Clock size={15} /> },
        { id: 'pm_sup_staffing', label: t('pm_screen_sup_staffing', language), role: t('pm_role_superviseur_name', language), icon: <Users size={15} /> },
        { id: 'pm_sup_expenses', label: t('pm_screen_sup_expenses', language), role: t('pm_role_superviseur_name', language), icon: <Wallet size={15} /> },
        // RH
        { id: 'pm_rh_talents', label: t('pm_screen_rh_talents', language), role: t('pm_role_rh_name', language), icon: <Users size={15} /> },
        { id: 'pm_rh_dossier', label: t('pm_screen_rh_dossier', language), role: t('pm_role_rh_name', language), icon: <FileText size={15} /> },
        { id: 'pm_rh_portal', label: t('pm_screen_rh_portal', language), role: t('pm_role_rh_name', language), icon: <GraduationCap size={15} /> },
        { id: 'pm_rh_walkin', label: t('pm_screen_rh_walkin', language), role: t('pm_role_rh_name', language), icon: <DoorOpen size={15} /> },
        // Compta
        { id: 'pm_compta_payroll', label: t('pm_screen_compta_payroll', language), role: t('pm_role_compta_name', language), icon: <Wallet size={15} /> },
        { id: 'pm_compta_ccp', label: t('pm_screen_compta_ccp', language), role: t('pm_role_compta_name', language), icon: <FileText size={15} /> },
        { id: 'pm_compta_expenses', label: t('pm_screen_compta_expenses', language), role: t('pm_role_compta_name', language), icon: <ShieldCheck size={15} /> },
        { id: 'pm_compta_stock', label: t('pm_screen_compta_stock', language), role: t('pm_role_compta_name', language), icon: <ShoppingBag size={15} /> },
        // Settings
        { id: 'settings', label: t('nav_settings', language), role: language === 'ar' ? 'النظام' : language === 'fr' ? 'Système' : 'System', icon: <Settings size={15} /> },
      ];

      pmNavItems
        .filter((nav) => canAccessRoute(category, permState, nav.id))
        .forEach((nav) => {
          list.push({
            id: `nav-${nav.id}`,
            title: nav.label,
            subtitle: nav.role,
            category: navCategoryLabel,
            icon: nav.icon,
            onSelect: () => {
              setScreen(nav.id);
              onClose();
            },
          });
        });
    } else if (category === 'trading_commercial') {
      const tradingNav: Array<{ id: ActiveScreen; label: string; icon: React.ReactNode }> = [
        { id: 'trading_dashboard', label: dashboardLabel, icon: <LayoutDashboard size={15} /> },
        { id: 'trading_sales', label: t('nav_trading_sales', language), icon: <FileText size={15} /> },
        { id: 'trading_purchases', label: t('nav_trading_purchases', language), icon: <Truck size={15} /> },
        { id: 'trading_inventory', label: t('nav_trading_inventory', language), icon: <Boxes size={15} /> },
        { id: 'trading_directory', label: t('nav_trading_directory', language), icon: <Building2 size={15} /> },
        { id: 'trading_catalog', label: t('nav_trading_catalog', language), icon: <ShoppingBag size={15} /> },
        { id: 'trading_finance', label: t('nav_trading_finance', language), icon: <CreditCard size={15} /> },
        ...(canAccessHistoryScreen ? [{ id: 'history' as ActiveScreen, label: t('nav_history', language), icon: <History size={15} /> }] : []),
        { id: 'settings', label: t('nav_settings', language), icon: <Settings size={15} /> },
      ];

      tradingNav
        .filter((nav) => canAccessRoute(category, permState, nav.id))
        .forEach((nav) => {
          list.push({
            id: `nav-${nav.id}`,
            title: nav.label,
            category: navCategoryLabel,
            icon: nav.icon,
            onSelect: () => {
              setScreen(nav.id);
              onClose();
            },
          });
        });
    } else {
      const navItems: Array<{ id: ActiveScreen; label: string; icon: React.ReactNode }> = [
        { id: 'dashboard', label: dashboardLabel, icon: <LayoutDashboard size={15} /> },
        { id: 'members', label: `${terminology.members}`, icon: <Users size={15} /> },
        { id: 'scheduler', label: `${terminology.scheduler}`, icon: <Calendar size={15} /> },
        { id: 'shop', label: `${terminology.shop}`, icon: <ShoppingBag size={15} /> },
        { id: 'registrations', label: `${terminology.registration}`, icon: <FileText size={15} /> },
        { id: 'finance', label: t('nav_finance', language), icon: <CreditCard size={15} /> },
        ...(canAccessHistoryScreen ? [{ id: 'history' as ActiveScreen, label: t('nav_history', language), icon: <History size={15} /> }] : []),
        { id: 'settings', label: t('nav_settings', language), icon: <Settings size={15} /> },
      ];

      navItems
        .filter((nav) => canAccessRoute(category, permState, nav.id))
        .forEach((nav) => {
          list.push({
            id: `nav-${nav.id}`,
            title: nav.label,
            category: navCategoryLabel,
            icon: nav.icon,
            onSelect: () => {
              setScreen(nav.id);
              onClose();
            },
          });
        });
    }

    // Unified Staff Screen Navigation
    if (canAccessRoute(category, permState, 'staff')) {
      list.push({
        id: 'nav-staff',
        title: language === 'ar' ? 'الفريق' : language === 'en' ? 'Staff' : 'Équipe',
        subtitle: language === 'ar' ? 'الموظفون والحضور' : language === 'en' ? 'Team & Shifts' : 'Équipe & Pointage',
        category: navCategoryLabel,
        icon: <Users size={15} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
        onSelect: () => {
          setScreen('staff');
          onClose();
        },
      });
    }

    // Unified BI & Cross-Vertical Reports Navigation
    if (canAccessRoute(category, permState, 'bi_reports')) {
      list.push({
        id: 'nav-bi-reports',
        title: t('phase2_bi_nav', language),
        subtitle: t('phase2_bi_title', language),
        category: navCategoryLabel,
        icon: <BarChart2 size={15} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
        onSelect: () => {
          setScreen('bi_reports');
          onClose();
        },
      });
    }

    if (!canAccessRoute(category, permState, 'settings') && canAccessRoute(category, permState, 'preferences')) {
      list.push({
        id: 'nav-preferences',
        title: t('nav_preferences', language),
        subtitle: t('topbar_language_switch_desc', language),
        category: navCategoryLabel,
        icon: <Settings size={15} />,
        onSelect: () => {
          setScreen('preferences');
          onClose();
        },
      });
    }

    // 2. Action items
    list.push({
      id: 'action-facility',
      title: t('fast_switch_title', language),
      subtitle: t('fast_switch_subtitle', language),
      category: actionCategoryLabel,
      icon: <Layers size={15} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
      onSelect: () => {
        openFastSwitch();
        onClose();
      },
    });

    list.push({
      id: 'action-theme',
      title: theme === 'dark'
        ? (language === 'ar' ? 'الوضع النهاري' : language === 'fr' ? 'Mode clair' : 'Light Mode')
        : (language === 'ar' ? 'الوضع الليلي' : language === 'fr' ? 'Mode sombre' : 'Dark Mode'),
      category: actionCategoryLabel,
      icon: theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />,
      onSelect: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        onClose();
      },
    });

    list.push({
      id: 'action-lang-fr',
      title: 'Français (FR)',
      subtitle: t('topbar_language_switch_desc', language),
      category: actionCategoryLabel,
      icon: <Globe size={15} />,
      onSelect: () => {
        setLanguage('fr', false);
        onClose();
      },
    });

    list.push({
      id: 'action-lang-en',
      title: 'English (EN)',
      subtitle: t('topbar_language_switch_desc', language),
      category: actionCategoryLabel,
      icon: <Globe size={15} />,
      onSelect: () => {
        setLanguage('en', false);
        onClose();
      },
    });

    list.push({
      id: 'action-lang-ar',
      title: 'العربية (AR)',
      subtitle: t('topbar_language_switch_desc', language),
      category: actionCategoryLabel,
      icon: <Globe size={15} />,
      onSelect: () => {
        setLanguage('ar', false);
        onClose();
      },
    });

    list.push({
      id: 'action-density',
      title: t('topbar_density_menu', language),
      subtitle: t('topbar_density_toggle_desc', language),
      category: actionCategoryLabel,
      icon: <Layout size={15} />,
      onSelect: () => {
        setDensity(density === 'compact' ? 'default' : 'compact');
        onClose();
      },
    });

    list.push({
      id: 'action-wizard',
      title: t('onboarding_title', language),
      subtitle: t('onboarding_subtitle', language),
      category: actionCategoryLabel,
      icon: <Sparkles size={15} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
      onSelect: () => {
        openOnboarding();
        onClose();
      },
    });


    // 3. CRM Records depending on vertical (filtered by target route authorization)
    const canSeeMembers = canAccessRoute(category, permState, 'members');
    const canSeeShop = canAccessRoute(category, permState, 'shop');

    if (category === 'education_cohort') {
      if (canSeeMembers) {
        eduStudents.slice(0, 15).forEach((st) => {
          list.push({
            id: `student-${st.id}`,
            title: st.fullName,
            subtitle: `Student • ${st.guardianPhone || st.email || 'Enrolled'}`,
            category: 'Records',
            icon: <GraduationCap size={15} className="text-emerald-500" />,
            onSelect: () => {
              setScreen('members');
              onClose();
            },
          });
        });
      }
      if (canSeeShop) {
        eduCohorts.slice(0, 5).forEach((co) => {
          list.push({
            id: `cohort-${co.id}`,
            title: co.name,
            subtitle: `Cohort • ${co.classroomName || 'Classroom'}`,
            category: 'Records',
            icon: <Calendar size={15} className="text-blue-500" />,
            onSelect: () => {
              setScreen('shop');
              onClose();
            },
          });
        });
      }
    } else if (category === 'freelance_solo') {
      if (canSeeMembers) {
        freelanceClients.slice(0, 15).forEach((cl) => {
          list.push({
            id: `client-${cl.id}`,
            title: cl.name,
            subtitle: `Client • ${cl.company || cl.email || ''}`,
            category: 'Records',
            icon: <User size={15} className="text-purple-500" />,
            onSelect: () => {
              setScreen('members');
              onClose();
            },
          });
        });
      }
      if (canSeeShop) {
        freelanceInvoices.slice(0, 5).forEach((inv) => {
          list.push({
            id: `invoice-${inv.id}`,
            title: `Invoice ${inv.invoiceNumber}`,
            subtitle: `${inv.clientName} • ${inv.currency} ${inv.totalAmount.toLocaleString()} (${inv.status})`,
            category: 'Records',
            icon: <FileText size={15} className="text-emerald-500" />,
            onSelect: () => {
              setScreen('shop');
              onClose();
            },
          });
        });
      }
    } else if (category === 'rental_booking') {
      if (canSeeMembers) {
        rentalRenters.slice(0, 10).forEach((ren) => {
          list.push({
            id: `renter-${ren.id}`,
            title: ren.fullName,
            subtitle: `Renter • ${ren.phone || ren.companyName || ''}`,
            category: 'Records',
            icon: <DoorOpen size={15} className="text-amber-500" />,
            onSelect: () => {
              setScreen('members');
              onClose();
            },
          });
        });
      }
    } else {
      if (canSeeMembers) {
        members.slice(0, 15).forEach((mem) => {
          list.push({
            id: `mem-${mem.id}`,
            title: mem.fullName,
            subtitle: `${localizeStatus(mem.status, language)} • ${mem.phoneNumber || mem.email || ''}`,
            category: 'Records',
            icon: <User size={15} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
            onSelect: () => {
              selectMember(mem.id);
              setScreen('members');
              onClose();
            },
          });
        });
      }

      if (canSeeShop) {
        products.slice(0, 10).forEach((prod) => {
          list.push({
            id: `prod-${prod.id}`,
            title: prod.name,
            subtitle: `${language === 'ar' ? 'منتج' : language === 'fr' ? 'Article' : 'Product'} • ${prod.price} ${language === 'ar' ? 'د.ج' : 'DA'} • ${language === 'ar' ? 'المخزون' : language === 'fr' ? 'Stock' : 'Stock'}: ${prod.stockQuantity}`,
            category: 'Records',
            icon: <Package size={15} className="text-blue-500" />,
            onSelect: () => {
              setScreen('shop');
              onClose();
            },
          });
        });
      }
    }

    return list;
  }, [
    terminology,
    category,
    theme,
    members,
    products,
    freelanceClients,
    freelanceInvoices,
    rentalRenters,
    eduStudents,
    eduCohorts,
    language,
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
    currentBusinessId,
    rbacPermissions,
  ]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items.slice(0, 12);
    }
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      alignment="top"
      zIndexClass="z-[9995]"
      scrimClassName="bg-black/60"
      ariaLabel={language === 'ar' ? 'لوحة الأوامر' : language === 'fr' ? 'Palette de commandes' : 'Command Palette'}
    >
      <div
        data-sq="panel"
        className="w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Kinetic Search Input Bar */}
        <div
          className={`p-[var(--s4,16px)] border-b transition-colors flex items-center gap-[var(--s3,12px)] ${
            isFocused
              ? 'border-[#d4522f]/40 bg-[#FDF4F0]/40 dark:bg-[#2B2825]/60'
              : 'border-[var(--atr-divider)] bg-transparent'
          }`}
        >
          <div
            className={`w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-full flex items-center justify-center shrink-0 transition-transform ${
              isBusy ? 'scale-110 text-[var(--text-1,#17130F)] dark:text-white' : 'text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
            }`}
          >
            <Search size={16} strokeWidth={isBusy ? 2 : 1.5} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              setSelectedIndex(0);
              setIsBusy(true);
              if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
              busyTimerRef.current = setTimeout(() => setIsBusy(false), 240);
            }}
            placeholder={t('cmd_palette_placeholder', language)}
            className="w-full bg-transparent t-body text-[var(--text-1,#17130F)] dark:text-white placeholder:text-[var(--text-3,#766C62)] dark:placeholder:text-[var(--text-dark-2,#A99E92)] focus:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-[var(--s1,4px)] rounded-full text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] hover:text-[var(--text-1,#17130F)] dark:hover:text-white transition-colors"
              title={language === 'ar' ? 'مسح البحث' : language === 'fr' ? 'Effacer la recherche' : 'Clear query'}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-[var(--s1,4px)] rounded-full text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] hover:text-[var(--text-1,#17130F)] dark:hover:text-white transition-colors cursor-pointer"
            title={language === 'ar' ? 'إغلاق (Esc)' : language === 'fr' ? 'Fermer (Esc)' : 'Close (Esc)'}
          >
            <span className="t-small h-[var(--badge-h,22px)] px-[var(--badge-px,6px)] inline-flex items-center rounded-[var(--r-check,6px)] bg-[#EFE9E2] dark:bg-[#2B2825] tabular-nums">Esc</span>
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-[var(--s2,8px)] flex flex-col gap-[var(--s1,4px)]">
          {filteredItems.length === 0 ? (
            <div className="py-[var(--s8,48px)] text-center t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">
              {t('cmd_palette_no_results', language)} {query && `"${query}"`}.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  data-sq="row"
                  className={`w-full flex items-center justify-between p-[var(--row-inset,12px)] text-start transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FDF4F0] dark:bg-[#2B2825] text-[var(--text-1,#17130F)] dark:text-white scale-[1.01]'
                      : 'text-[var(--text-2,#5A5047)] dark:text-white/80 hover:bg-[#FAF7F4] dark:hover:bg-[#22201E]'
                  }`}
                >
                  <div className="flex items-center gap-[var(--av-to-text,12px)] min-w-0">
                    <div
                      data-sq="tile"
                      data-sq-border="none"
                      className={`w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                          : 'bg-[#EFE9E2] dark:bg-[#22201E] text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex flex-col gap-[var(--name-sub-gap,2px)]">
                      <div className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-[var(--s2,8px)] shrink-0">
                    <span className="t-small h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">
                      {item.category === 'Navigation'
                        ? (language === 'ar' ? 'تنقل' : language === 'fr' ? 'Navigation' : 'Navigation')
                        : item.category === 'Action'
                        ? (language === 'ar' ? 'إجراء' : language === 'fr' ? 'Action' : 'Action')
                        : item.category === 'Appearance'
                        ? (language === 'ar' ? 'المظهر' : language === 'fr' ? 'Apparence' : 'Appearance')
                        : item.category === 'Records'
                        ? (language === 'ar' ? 'السجلات' : language === 'fr' ? 'Fiches' : 'Records')
                        : item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hidden sm:block rtl:rotate-180" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="p-[var(--s3,12px)] bg-[#F5F1EC] dark:bg-[#22201E] border-t border-[var(--atr-divider)] flex items-center justify-between t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">
          <div className="flex items-center gap-[var(--s3,12px)]">
            <span className="flex items-center gap-[var(--s1,4px)]">
              <kbd className="h-[var(--badge-h,22px)] px-[var(--badge-px,6px)] inline-flex items-center bg-white dark:bg-[#2B2825] rounded-[var(--r-check,6px)] t-small tabular-nums text-[var(--text-1,#17130F)] dark:text-white shadow-2xs">
                ↑↓
              </kbd>
              {language === 'ar' ? 'تنقل' : language === 'fr' ? 'Naviguer' : 'Navigate'}
            </span>
            <span className="flex items-center gap-[var(--s1,4px)]">
              <kbd className="h-[var(--badge-h,22px)] px-[var(--badge-px,6px)] inline-flex items-center bg-white dark:bg-[#2B2825] rounded-[var(--r-check,6px)] t-small tabular-nums text-[var(--text-1,#17130F)] dark:text-white shadow-2xs">
                ↵
              </kbd>
              {language === 'ar' ? 'اختيار' : language === 'fr' ? 'Sélectionner' : 'Select'}
            </span>
            <span className="flex items-center gap-[var(--s1,4px)]">
              <kbd className="h-[var(--badge-h,22px)] px-[var(--badge-px,6px)] inline-flex items-center bg-white dark:bg-[#2B2825] rounded-[var(--r-check,6px)] t-small tabular-nums text-[var(--text-1,#17130F)] dark:text-white shadow-2xs">
                Esc
              </kbd>
              {language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close'}
            </span>
          </div>

          <div className="flex items-center gap-[var(--s1,4px)] t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
            <Command size={16} strokeWidth={1.5} />
            <span>Atrium</span>
          </div>
        </div>
        </div>
    </KineticModalShell>
  );
};
