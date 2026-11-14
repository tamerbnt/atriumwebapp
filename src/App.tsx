import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useAtriumSelector,
  selectCurrentBusinessFromState,
  setSystemDefaultLanguageAction,
  openOnboardingAction,
  closeOnboardingAction,
  closeFastSwitchAction,
  closeDesktopUpgradeModalAction,
  toggleTopBarCollapsedAction,
  setTopBarCollapsedAction,
  loginWithPinAction,
} from './services/store';
import { Member } from './types/index';
import { AppShell } from '@/atrium';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { LoginScreen } from './components/auth/LoginScreen';
import { ScreenSuspenseFallback } from './components/ui/skeleton/ScreenSuspenseFallback';

// Lazy-loaded Onboarding & Global Modals (loaded on-demand only when open)
const PowerOnboardingScreen = React.lazy(() =>
  import('./components/auth/PowerOnboardingScreen').then((m) => ({ default: m.PowerOnboardingScreen }))
);
const FastSwitchModal = React.lazy(() =>
  import('./components/auth/FastSwitchModal').then((m) => ({ default: m.FastSwitchModal }))
);
const CommandPaletteModal = React.lazy(() =>
  import('./components/modals/CommandPaletteModal').then((m) => ({ default: m.CommandPaletteModal }))
);
const VoucherModal = React.lazy(() =>
  import('./components/modals/VoucherModal').then((m) => ({ default: m.VoucherModal }))
);
import { MemberModal } from './components/modals/MemberModal';
import { triggerKineticMemberModal } from './components/modals/memberModalMotion';
const LeadModal = React.lazy(() =>
  import('./components/modals/LeadModal').then((m) => ({ default: m.LeadModal }))
);
const DesktopUpgradeModal = React.lazy(() =>
  import('./components/modals/DesktopUpgradeModal').then((m) => ({ default: m.DesktopUpgradeModal }))
);

// All 116 Screens lazy-loaded with Category Chunk Partitioning
import {
  SettingsScreen,
  DashboardCatalogScreen,
  FreelanceDashboardView,
  FreelanceClientsView,
  FreelanceDeliverablesView,
  FreelanceTimeTrackerView,
  FreelanceInvoicesView,
  FreelanceProposalsView,
  FreelanceFinanceView,
  VenueDashboardView,
  VenueTimelineView,
  VenueBookingsView,
  VenueInventoryView,
  VenueRentersView,
  VenueFinanceView,
  EducationDashboardView,
  EducationTimetableView,
  EducationStudentsView,
  EducationCohortsView,
  EducationAdmissionsView,
  EducationAttendanceView,
  EducationFinanceView,
  ProjectDirectionView,
  ProjectChefProjetView,
  ProjectCreaView,
  ProjectSuperviseurView,
  ProjectRhView,
  ProjectComptaView,
  MembershipDashboardView,
  MembershipMembersView,
  MembershipRegistrationsView,
  MembershipShopView,
  MembershipSchedulerView,
  MembershipFinanceView,
  MembershipHistoryView,
  AppointmentDashboardView,
  AppointmentClientsView,
  AppointmentScheduleView,
  AppointmentServicesView,
  AppointmentFinanceView,
  AppointmentHistoryView,
  GymFrontDeskKiosk,
  SalonQuickChairKiosk,
  AcademyRollCallKiosk,
  PosDashboardView,
  PosRegisterView,
  PosInventoryView,
  PosOrdersView,
  PosFinanceView,
  PosHistoryView,
  TradingDashboardView,
  TradingSalesView,
  TradingPurchasesView,
  TradingInventoryView,
  TradingDirectoryView,
  TradingCatalogView,
  TradingFinanceView,
  MedicalDashboardView,
  MedicalQueueView,
  MedicalAgendaView,
  MedicalPatientsView,
  MedicalPrescriptionsView,
  MedicalBillingView,
  MedicalCertificatesView,
  AutoGarageDashboardView,
  AutoGarageOrdersView,
  AutoGarageVehiclesView,
  AutoGaragePartsView,
  AutoGarageBillingView,
  RealEstateDashboardView,
  RealEstateMandatesView,
  RealEstatePropertiesView,
  RealEstateLeasesView,
  RealEstateInspectionsView,
  RealEstateFinanceView,
  ManufacturingDashboardView,
  ManufacturingOrdersView,
  ManufacturingBomView,
  ManufacturingMaterialsView,
  ManufacturingQcView,
  ManufacturingWorkstationView,
  LegalDashboardView,
  LegalMattersView,
  LegalHearingsView,
  LegalVaultView,
  LegalTrustView,
  LogisticsDashboardView,
  LogisticsShipmentsView,
  LogisticsManifestsView,
  LogisticsScannerView,
  LogisticsCodView,
  ContractorDashboardView,
  ContractorSitesView,
  ContractorBoqView,
  ContractorDailyLogsView,
  ContractorBillingView,
  AgricultureDashboardView,
  AgricultureParcelsView,
  AgricultureCyclesView,
  AgricultureHarvestView,
  AgricultureLivestockView,
  AgricultureWholesaleView,
  MembershipStaffView,
  AppointmentStaffView,
  PosStaffView,
  EducationStaffView,
  AutoGarageStaffView,
  MedicalStaffView,
  ContractorStaffView,
  LogisticsStaffView,
  ManufacturingStaffView,
  AgricultureStaffView,
  LegalStaffView,
  RealEstateStaffView,
  TradingStaffView,
  VenueStaffView,
  FreelanceStaffView,
} from './components/screens/lazyScreens';
import { ToastStack } from './components/ui/ToastStack';
import { ScrollJumpPill } from './components/ui/ScrollJumpPill';
import { AtriumIntroOverlay } from './components/ui/AtriumIntroOverlay';
import { AppleOverscrollProvider } from './components/common/AppleOverscrollProvider';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from './utils/useTranslation';

export default function App() {
  const currentBusiness = useAtriumSelector(selectCurrentBusinessFromState);
  const activeScreen = useAtriumSelector((s) => s.activeScreen);
  const theme = useAtriumSelector((s) => s.theme);
  const language = useAtriumSelector((s) => s.language);
  const isLanguageAuto = useAtriumSelector((s) => s.isLanguageAuto);
  const setSystemDefaultLanguage = setSystemDefaultLanguageAction;
  const isAuthenticated = useAtriumSelector((s) => s.isAuthenticated);
  const isOnboardingOpen = useAtriumSelector((s) => s.isOnboardingOpen);
  const isFastSwitchOpen = useAtriumSelector((s) => s.isFastSwitchOpen);
  const isDesktopUpgradeModalOpen = useAtriumSelector((s) => s.isDesktopUpgradeModalOpen);
  const desktopUpgradeReason = useAtriumSelector((s) => s.desktopUpgradeReason);
  const openOnboarding = openOnboardingAction;
  const closeOnboarding = closeOnboardingAction;
  const closeFastSwitch = closeFastSwitchAction;
  const closeDesktopUpgradeModal = closeDesktopUpgradeModalAction;
  const activeGarageRole = useAtriumSelector((s) => s.activeGarageRole);
  const activeLegalRole = useAtriumSelector((s) => s.activeLegalRole);
  const activeLogisticsRole = useAtriumSelector((s) => s.activeLogisticsRole);
  const activeContractorRole = useAtriumSelector((s) => s.activeContractorRole);
  const activeRealEstateRole = useAtriumSelector((s) => s.activeRealEstateRole);
  const activeManufacturingRole = useAtriumSelector((s) => s.activeManufacturingRole);
  const activeAgriRole = useAtriumSelector((s) => s.activeAgriRole);
  const activeMembershipRole = useAtriumSelector((s) => s.activeMembershipRole);
  const activeAppointmentRole = useAtriumSelector((s) => s.activeAppointmentRole);
  const activePosRole = useAtriumSelector((s) => s.activePosRole);
  const activeEducationRole = useAtriumSelector((s) => s.activeEducationRole);
  const isTopBarCollapsed = useAtriumSelector((s) => s.isTopBarCollapsed || false);
  const isTopBarAutoHide = useAtriumSelector((s) => s.isTopBarAutoHide ?? false);
  const toggleTopBarCollapsed = toggleTopBarCollapsedAction;
  const setTopBarCollapsed = setTopBarCollapsedAction;
  const loginWithPin = loginWithPinAction;

  const { t } = useTranslation();

  // User enters directly into the app workspace cleanly
  const [isIntroActive, setIsIntroActive] = useState<boolean>(false);

  // When intro animation finishes or replay is requested
  useEffect(() => {
    const handleIntroComplete = () => {
      setIsIntroActive(false);
    };
    const handleReplayIntro = () => {
      try {
        sessionStorage.removeItem('atrium-intro-seen');
      } catch {}
      setIsIntroActive(true);
    };
    document.addEventListener('atrium:introcomplete', handleIntroComplete);
    window.addEventListener('atrium:replayintro', handleReplayIntro);
    return () => {
      document.removeEventListener('atrium:introcomplete', handleIntroComplete);
      window.removeEventListener('atrium:replayintro', handleReplayIntro);
    };
  }, []);

  // Direct app entry without blocking onboarding overlay
  const [showPowerOnboarding, setShowPowerOnboarding] = useState<boolean>(false);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global keyboard shortcuts (Ctrl+K, Cmd+K, '/')
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleTopBarCollapsed();
      } else if (e.key === 'Escape' && isTopBarCollapsed) {
        setTopBarCollapsed(false);
      } else if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isTopBarCollapsed,
    isTopBarAutoHide, toggleTopBarCollapsed, setTopBarCollapsed]);

  // Sync theme & RTL on boot
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-atrium-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [theme, language]);

  // Natively follow system default language changes if auto mode is enabled
  useEffect(() => {
    const handleSystemLanguageChange = () => {
      if (isLanguageAuto) {
        setSystemDefaultLanguage();
      }
    };
    window.addEventListener('languagechange', handleSystemLanguageChange);
    return () => window.removeEventListener('languagechange', handleSystemLanguageChange);
  }, [isLanguageAuto, setSystemDefaultLanguage]);

  // Close mobile sidebar on screen change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeScreen]);

  const memberModalOriginRef = useRef<HTMLElement | null>(null);
  const businessCategoryRef = useRef(currentBusiness?.category);
  businessCategoryRef.current = currentBusiness?.category;
  const activeScreenRef = useRef(activeScreen);
  activeScreenRef.current = activeScreen;

  const handleOpenAddMember = useCallback((originEl?: HTMLElement | null) => {
    const resolvedOrigin =
      originEl ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null);
    if (
      businessCategoryRef.current === 'membership_session' &&
      activeScreenRef.current === 'members' &&
      triggerKineticMemberModal({ member: null, originElement: resolvedOrigin })
    ) {
      return;
    }
    memberModalOriginRef.current = resolvedOrigin;
    setMemberToEdit(null);
    setIsMemberModalOpen(true);
  }, []);

  const handleOpenEditMember = useCallback((member: Member, originEl?: HTMLElement | null) => {
    const resolvedOrigin =
      originEl ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null);
    if (
      businessCategoryRef.current === 'membership_session' &&
      activeScreenRef.current === 'members' &&
      triggerKineticMemberModal({ member, originElement: resolvedOrigin })
    ) {
      return;
    }
    memberModalOriginRef.current = resolvedOrigin;
    setMemberToEdit(member);
    setIsMemberModalOpen(true);
  }, []);

  const handleCloseMemberModal = useCallback(() => {
    setIsMemberModalOpen(false);
    setMemberToEdit(null);
  }, []);

  const isFreelance = currentBusiness?.category === 'freelance_solo';
  const isProjectMilestone = currentBusiness?.category === 'project_milestone';

  const renderActiveScreen = () => {
    if (import.meta.env.DEV && activeScreen === 'chart_catalog') {
      return <DashboardCatalogScreen />;
    }
    if (activeScreen === 'staff') {
      const cat = currentBusiness?.category;
      if (cat === 'project_milestone') return <ProjectRhView initialTab="talents" />;
      if (cat === 'freelance_solo') return <FreelanceStaffView />;
      if (cat === 'rental_booking') return <VenueStaffView />;
      if (cat === 'education_cohort') return <EducationStaffView />;
      if (cat === 'appointment_service') return <AppointmentStaffView />;
      if (cat === 'pos_inventory') return <PosStaffView />;
      if (cat === 'trading_commercial') return <TradingStaffView />;
      if (cat === 'medical_clinic') return <MedicalStaffView />;
      if (cat === 'auto_garage') return <AutoGarageStaffView />;
      if (cat === 'real_estate') return <RealEstateStaffView />;
      if (cat === 'manufacturing_production') return <ManufacturingStaffView />;
      if (cat === 'legal_accounting') return <LegalStaffView />;
      if (cat === 'logistics_delivery') return <LogisticsStaffView />;
      if (cat === 'construction_contractor') return <ContractorStaffView />;
      if (cat === 'agriculture_farming') return <AgricultureStaffView />;
      return <MembershipStaffView />;
    }

    if (isProjectMilestone) {
      switch (activeScreen) {
        // Role 1: Direction (4 screens)
        case 'pm_dir_dashboard':
          return <ProjectDirectionView initialTab="dashboard" />;
        case 'pm_dir_new_project':
          return <ProjectDirectionView initialTab="new_project" />;
        case 'pm_dir_projects':
          return <ProjectDirectionView initialTab="projects" />;
        case 'pm_dir_approvals':
          return <ProjectDirectionView initialTab="approvals" />;
        case 'pm_dir_reports':
          return <ProjectDirectionView initialTab="reports" />;

        // Role 2: Chef de Projet (5 screens)
        case 'pm_cp_projects':
          return <ProjectChefProjetView initialTab="portfolio" />;
        case 'pm_cp_catalog':
          return <ProjectChefProjetView initialTab="catalog" />;
        case 'pm_cp_orders':
          return <ProjectChefProjetView initialTab="orders" />;
        case 'pm_cp_files':
        case 'pm_cp_deliverables':
          return <ProjectChefProjetView initialTab="bat" />;
        case 'pm_cp_expenses':
          return <ProjectChefProjetView initialTab="expenses" />;

        // Role 3: Créa Studio (4 screens)
        case 'pm_crea_kanban':
          return <ProjectCreaView initialTab="kanban" />;
        case 'pm_crea_production':
          return <ProjectCreaView initialTab="production" />;
        case 'pm_crea_upload':
          return <ProjectCreaView initialTab="upload" />;
        case 'pm_crea_briefs':
          return <ProjectCreaView initialTab="briefs" />;

        // Role 4: Superviseur Terrain (4 screens)
        case 'pm_sup_missions':
          return <ProjectSuperviseurView initialTab="missions" />;
        case 'pm_sup_attendance':
          return <ProjectSuperviseurView initialTab="attendance" />;
        case 'pm_sup_staffing':
          return <ProjectSuperviseurView initialTab="staffing" />;
        case 'pm_sup_expenses':
          return <ProjectSuperviseurView initialTab="expense" />;

        // Role 5: Ressources Humaines (4 screens)
        case 'pm_rh_talents':
          return <ProjectRhView initialTab="talents" />;
        case 'pm_rh_dossier':
          return <ProjectRhView initialTab="dossier" />;
        case 'pm_rh_portal':
          return <ProjectRhView initialTab="portal" />;
        case 'pm_rh_walkin':
          return <ProjectRhView initialTab="walkin" />;

        // Role 6: Comptabilité & Finance (4 screens)
        case 'pm_compta_payroll':
          return <ProjectComptaView initialTab="payroll" />;
        case 'pm_compta_ccp':
          return <ProjectComptaView initialTab="ccp" />;
        case 'pm_compta_expenses':
          return <ProjectComptaView initialTab="expenses" />;
        case 'pm_compta_stock':
          return <ProjectComptaView initialTab="stock" />;

        // Standard Navigation Mappings
        case 'dashboard':
          return <ProjectDirectionView initialTab="dashboard" />;
        case 'scheduler':
          return <ProjectChefProjetView initialTab="portfolio" />;
        case 'registrations':
          return <ProjectCreaView initialTab="kanban" />;
        case 'analytics':
          return <ProjectSuperviseurView initialTab="missions" />;
        case 'members':
          return <ProjectRhView initialTab="talents" />;
        case 'finance':
        case 'shop':
          return <ProjectComptaView initialTab="payroll" />;
        case 'history':
          return <ProjectSuperviseurView initialTab="attendance" />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
        default:
          return <ProjectDirectionView initialTab="dashboard" />;
      }
    }

    if (isFreelance) {
      switch (activeScreen) {
        case 'dashboard':
          return <FreelanceDashboardView />;
        case 'analytics':
          return <FreelanceTimeTrackerView />;
        case 'members':
          return <FreelanceClientsView />;
        case 'registrations':
          return <FreelanceProposalsView />;
        case 'scheduler':
          return <FreelanceDeliverablesView />;
        case 'shop':
          return <FreelanceInvoicesView />;
        case 'finance':
          return <FreelanceFinanceView />;
        case 'history':
          return <FreelanceTimeTrackerView />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
        default:
          return <FreelanceDashboardView />;
      }
    }

    const isRental = currentBusiness?.category === 'rental_booking';
    if (isRental) {
      switch (activeScreen) {
        case 'dashboard':
          return <VenueDashboardView />;
        case 'scheduler':
          return <VenueTimelineView />;
        case 'registrations':
          return <VenueBookingsView />;
        case 'shop':
          return <VenueInventoryView />;
        case 'members':
          return <VenueRentersView />;
        case 'finance':
          return <VenueFinanceView />;
        case 'history':
          return <VenueBookingsView />;
        case 'analytics':
          return <VenueDashboardView />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
        default:
          return <VenueDashboardView />;
      }
    }

    const isEducation = currentBusiness?.category === 'education_cohort';
    if (isEducation) {
      if (activeEducationRole === 'staff') {
        switch (activeScreen) {
          case 'dashboard':
          case 'analytics':
            return <AcademyRollCallKiosk />;
          case 'scheduler':
            return <EducationTimetableView />;
          case 'members':
            return <EducationStudentsView />;
          case 'shop':
            return <EducationCohortsView />;
          case 'registrations':
            return <EducationAdmissionsView />;
          case 'finance':
          case 'settings':
          default:
            return <AcademyRollCallKiosk />;
        }
      }

      switch (activeScreen) {
        case 'dashboard':
          return <EducationDashboardView />;
        case 'scheduler':
          return <EducationTimetableView />;
        case 'members':
          return <EducationStudentsView />;
        case 'shop':
          return <EducationCohortsView />;
        case 'registrations':
          return <EducationAdmissionsView />;
        case 'analytics':
          return <EducationAttendanceView />;
        case 'finance':
          return <EducationFinanceView />;
        case 'history':
          return <EducationAttendanceView />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
        default:
          return <EducationDashboardView />;
      }
    }

    const isTrading = currentBusiness?.category === 'trading_commercial';
    if (isTrading) {
      switch (activeScreen) {
        case 'dashboard':
        case 'trading_dashboard':
          return <TradingDashboardView />;
        case 'trading_sales':
        case 'registrations':
          return <TradingSalesView />;
        case 'trading_purchases':
        case 'scheduler':
          return <TradingPurchasesView />;
        case 'trading_inventory':
        case 'shop':
          return <TradingInventoryView />;
        case 'trading_directory':
        case 'members':
          return <TradingDirectoryView />;
        case 'trading_catalog':
          return <TradingCatalogView />;
        case 'trading_finance':
        case 'finance':
          return <TradingFinanceView />;
        case 'analytics':
          return <TradingDashboardView />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
        default:
          return <TradingDashboardView />;
      }
    }

    if (currentBusiness?.category === 'medical_clinic') {
      if (activeScreen === 'settings') {
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }
      switch (activeScreen) {
        case 'dashboard':
          return <MedicalDashboardView />;
        case 'scheduler':
          return <MedicalQueueView />;
        case 'agenda':
          return <MedicalAgendaView />;
        case 'members':
          return <MedicalPatientsView />;
        case 'shop':
          return <MedicalPrescriptionsView />;
        case 'registrations':
          return <MedicalCertificatesView />;
        case 'finance':
          return <MedicalBillingView />;
        default:
          return <MedicalDashboardView />;
      }
    }

    if (currentBusiness?.category === 'auto_garage') {
      if (activeScreen === 'settings') {
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }
      if (activeGarageRole === 'mecanicien') {
        switch (activeScreen) {
          case 'dashboard':
          case 'scheduler':
          case 'registrations':
            return <AutoGarageOrdersView />;
          case 'members':
            return <AutoGarageVehiclesView />;
          case 'shop':
            return <AutoGaragePartsView />;
          default:
            return <AutoGarageOrdersView />;
        }
      }
      if (activeGarageRole === 'magasinier') {
        switch (activeScreen) {
          case 'dashboard':
          case 'shop':
            return <AutoGaragePartsView />;
          case 'scheduler':
          case 'registrations':
            return <AutoGarageOrdersView />;
          default:
            return <AutoGaragePartsView />;
        }
      }
      switch (activeScreen) {
        case 'dashboard':
          return <AutoGarageDashboardView />;
        case 'scheduler':
        case 'registrations':
          return <AutoGarageOrdersView />;
        case 'members':
          return <AutoGarageVehiclesView />;
        case 'shop':
          return <AutoGaragePartsView />;
        case 'finance':
          return <AutoGarageBillingView />;
        default:
          return <AutoGarageDashboardView />;
      }
    }

    if (currentBusiness?.category === 'real_estate') {
      if (activeScreen === 'settings') {
        if (activeRealEstateRole !== 'direction') {
          return <RealEstateDashboardView />;
        }
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }

      // Role-specific screen permission guards
      if (activeRealEstateRole === 'negociateur') {
        if (activeScreen === 'scheduler' || activeScreen === 'finance') {
          return <RealEstateDashboardView />;
        }
      } else if (activeRealEstateRole === 'gestionnaire_locatif') {
        if (activeScreen === 'realestate_mandates' || activeScreen === 'shop') {
          return <RealEstateDashboardView />;
        }
      } else if (activeRealEstateRole === 'notaire_compta') {
        if (activeScreen === 'registrations' || activeScreen === 'members') {
          return <RealEstateDashboardView />;
        }
      }

      switch (activeScreen) {
        case 'dashboard':
          return <RealEstateDashboardView />;
        case 'realestate_mandates':
        case 'shop':
          return <RealEstateMandatesView />;
        case 'members':
          return <RealEstatePropertiesView />;
        case 'scheduler':
          return <RealEstateLeasesView />;
        case 'registrations':
          return <RealEstateInspectionsView />;
        case 'finance':
          return <RealEstateFinanceView />;
        default:
          return <RealEstateDashboardView />;
      }
    }

    if (currentBusiness?.category === 'manufacturing_production') {
      if (activeScreen === 'settings') {
        if (activeManufacturingRole !== 'gerant') {
          return <ManufacturingDashboardView />;
        }
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }

      // Role-specific screen permission guards & specialized routing
      if (activeManufacturingRole === 'operateur') {
        switch (activeScreen) {
          case 'dashboard':
            return <ManufacturingWorkstationView />;
          case 'scheduler':
          case 'registrations':
            return <ManufacturingOrdersView />;
          default:
            return <ManufacturingWorkstationView />;
        }
      }

      if (activeManufacturingRole === 'magasinier') {
        switch (activeScreen) {
          case 'dashboard':
            return <ManufacturingDashboardView />;
          case 'shop':
          case 'members':
          case 'finance':
            return <ManufacturingMaterialsView />;
          default:
            return <ManufacturingDashboardView />;
        }
      }

      if (activeManufacturingRole === 'qualite') {
        switch (activeScreen) {
          case 'dashboard':
            return <ManufacturingDashboardView />;
          case 'scheduler':
          case 'registrations':
            return <ManufacturingOrdersView />;
          case 'finance':
            return <ManufacturingQcView />;
          default:
            return <ManufacturingDashboardView />;
        }
      }

      if (activeManufacturingRole === 'chef_atelier') {
        switch (activeScreen) {
          case 'dashboard':
            return <ManufacturingDashboardView />;
          case 'scheduler':
          case 'registrations':
            return <ManufacturingOrdersView />;
          case 'shop':
            return <ManufacturingBomView />;
          case 'members':
            return <ManufacturingMaterialsView />;
          case 'finance':
            return <ManufacturingQcView />;
          default:
            return <ManufacturingDashboardView />;
        }
      }

      // Default: Gérant (Full access)
      switch (activeScreen) {
        case 'dashboard':
          return <ManufacturingDashboardView />;
        case 'scheduler':
        case 'registrations':
          return <ManufacturingOrdersView />;
        case 'shop':
          return <ManufacturingBomView />;
        case 'members':
          return <ManufacturingMaterialsView />;
        case 'finance':
          return <ManufacturingQcView />;
        default:
          return <ManufacturingDashboardView />;
      }
    }

    if (currentBusiness?.category === 'legal_accounting') {
      if (activeScreen === 'settings') {
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }
      if (activeLegalRole === 'secretaire_caisse') {
        switch (activeScreen) {
          case 'dashboard':
          case 'finance':
            return <LegalTrustView />;
          case 'members':
            return <LegalMattersView />;
          case 'scheduler':
            return <LegalHearingsView />;
          default:
            return <LegalTrustView />;
        }
      }
      switch (activeScreen) {
        case 'dashboard':
          return <LegalDashboardView />;
        case 'members':
          return <LegalMattersView />;
        case 'scheduler':
          return <LegalHearingsView />;
        case 'registrations':
          return <LegalVaultView />;
        case 'finance':
          return <LegalTrustView />;
        default:
          return <LegalDashboardView />;
      }
    }

    if (currentBusiness?.category === 'logistics_delivery') {
      if (activeScreen === 'settings') {
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }
      if (activeLogisticsRole === 'hub_sorter' || activeLogisticsRole === 'stop_desk_agent') {
        switch (activeScreen) {
          case 'dashboard':
          case 'registrations':
            return <LogisticsScannerView />;
          case 'members':
            return <LogisticsShipmentsView />;
          case 'scheduler':
            return <LogisticsManifestsView />;
          case 'finance':
            return <LogisticsCodView />;
          default:
            return <LogisticsScannerView />;
        }
      }
      switch (activeScreen) {
        case 'dashboard':
          return <LogisticsDashboardView />;
        case 'members':
          return <LogisticsShipmentsView />;
        case 'scheduler':
          return <LogisticsManifestsView />;
        case 'registrations':
          return <LogisticsScannerView />;
        case 'finance':
          return <LogisticsCodView />;
        default:
          return <LogisticsDashboardView />;
      }
    }

    if (currentBusiness?.category === 'construction_contractor') {
      if (activeScreen === 'settings') {
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }
      if (activeContractorRole === 'chef_chantier') {
        switch (activeScreen) {
          case 'dashboard':
          case 'scheduler':
            return <ContractorDailyLogsView />;
          case 'members':
          case 'registrations':
            return <ContractorSitesView />;
          case 'shop':
            return <ContractorBoqView />;
          case 'finance':
            return <ContractorBillingView />;
          default:
            return <ContractorDailyLogsView />;
        }
      }
      switch (activeScreen) {
        case 'dashboard':
          return <ContractorDashboardView />;
        case 'members':
        case 'registrations':
          return <ContractorSitesView />;
        case 'shop':
          return <ContractorBoqView />;
        case 'scheduler':
          return <ContractorDailyLogsView />;
        case 'finance':
          return <ContractorBillingView />;
        default:
          return <ContractorDashboardView />;
      }
    }

    if (currentBusiness?.category === 'agriculture_farming') {
      if (activeScreen === 'settings') {
        if (activeAgriRole !== 'gerant') {
          return <AgricultureParcelsView />;
        }
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }

      // Role-specific screen permission guards & specialized routing
      if (activeAgriRole === 'chef_culture') {
        switch (activeScreen) {
          case 'members':
            return <AgricultureParcelsView />;
          case 'scheduler':
            return <AgricultureCyclesView />;
          case 'shop':
            return <AgricultureHarvestView />;
          default:
            return <AgricultureParcelsView />;
        }
      }

      if (activeAgriRole === 'zootechnicien') {
        switch (activeScreen) {
          case 'registrations':
            return <AgricultureLivestockView />;
          default:
            return <AgricultureLivestockView />;
        }
      }

      if (activeAgriRole === 'magasinier') {
        switch (activeScreen) {
          case 'finance':
            return <AgricultureWholesaleView />;
          case 'shop':
            return <AgricultureHarvestView />;
          default:
            return <AgricultureWholesaleView />;
        }
      }

      // Default: Gérant / Exploitant Agricole (Full macro access)
      switch (activeScreen) {
        case 'dashboard':
          return <AgricultureDashboardView />;
        case 'members':
          return <AgricultureParcelsView />;
        case 'scheduler':
          return <AgricultureCyclesView />;
        case 'shop':
          return <AgricultureHarvestView />;
        case 'registrations':
          return <AgricultureLivestockView />;
        case 'finance':
          return <AgricultureWholesaleView />;
        default:
          return <AgricultureDashboardView />;
      }
    }

    const isMembership = currentBusiness?.category === 'membership_session';
    if (isMembership) {
      if (activeMembershipRole === 'staff') {
        switch (activeScreen) {
          case 'dashboard':
            return <GymFrontDeskKiosk />;
          case 'members':
            return (
              <MembershipMembersView
                onAddMember={handleOpenAddMember}
                onEditMember={handleOpenEditMember}
              />
            );
          case 'registrations':
            return <MembershipRegistrationsView onAddLead={() => setIsLeadModalOpen(true)} />;
          case 'finance':
          case 'analytics':
          case 'settings':
          default:
            return <GymFrontDeskKiosk />;
        }
      }

      switch (activeScreen) {
        case 'dashboard':
          return (
            <MembershipDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
        case 'members':
          return (
            <MembershipMembersView
              onAddMember={handleOpenAddMember}
              onEditMember={handleOpenEditMember}
            />
          );
        case 'registrations':
          return <MembershipRegistrationsView onAddLead={() => setIsLeadModalOpen(true)} />;
        case 'shop':
          return <MembershipShopView />;
        case 'scheduler':
          return <MembershipSchedulerView />;
        case 'finance':
          return <MembershipStaffView />;
        case 'history':
          return <MembershipHistoryView />;
        case 'analytics':
          return (
            <MembershipDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
        default:
          return (
            <MembershipDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
      }
    }

    const isAppointment = currentBusiness?.category === 'appointment_service';
    if (isAppointment) {
      if (activeAppointmentRole === 'staff') {
        switch (activeScreen) {
          case 'dashboard':
            return <SalonQuickChairKiosk />;
          case 'scheduler':
            return <AppointmentScheduleView />;
          case 'members':
            return (
              <AppointmentClientsView
                onAddMember={handleOpenAddMember}
                onEditMember={handleOpenEditMember}
              />
            );
          case 'finance':
          case 'analytics':
          case 'settings':
          default:
            return <SalonQuickChairKiosk />;
        }
      }

      switch (activeScreen) {
        case 'dashboard':
          return (
            <AppointmentDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
        case 'members':
          return (
            <AppointmentClientsView
              onAddMember={handleOpenAddMember}
              onEditMember={handleOpenEditMember}
            />
          );
        case 'scheduler':
          return <AppointmentScheduleView />;
        case 'shop':
          return <AppointmentServicesView />;
        case 'finance':
          return <AppointmentFinanceView />;
        case 'history':
          return <AppointmentHistoryView />;
        case 'registrations':
          return <AppointmentScheduleView />;
        case 'analytics':
          return (
            <AppointmentDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
        default:
          return (
            <AppointmentDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
      }
    }

    const isPOS = currentBusiness?.category === 'pos_inventory';
    if (isPOS) {
      if (activePosRole === 'staff') {
        switch (activeScreen) {
          case 'dashboard':
          case 'shop':
            return <PosRegisterView initialTab="register" />;
          case 'scheduler':
            return <PosInventoryView />;
          case 'registrations':
          case 'members':
            return <PosOrdersView />;
          case 'finance':
          case 'history':
          case 'analytics':
          case 'settings':
          default:
            return <PosRegisterView initialTab="register" />;
        }
      }

      switch (activeScreen) {
        case 'dashboard':
          return (
            <PosDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
        case 'shop':
          return <PosRegisterView />;
        case 'scheduler':
          return <PosInventoryView />;
        case 'registrations':
          return <PosOrdersView />;
        case 'finance':
          return <PosFinanceView />;
        case 'history':
          return <PosHistoryView />;
        case 'members':
          return <PosOrdersView />;
        case 'analytics':
          return (
            <PosDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
        default:
          return (
            <PosDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            />
          );
      }
    }

    switch (activeScreen) {
      case 'dashboard':
        return (
          <MembershipDashboardView
            onAddMember={handleOpenAddMember}
            onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
          />
        );
      case 'analytics':
        return (
          <MembershipDashboardView
            onAddMember={handleOpenAddMember}
            onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
          />
        );
      case 'members':
        return (
          <MembershipMembersView
            onAddMember={handleOpenAddMember}
            onEditMember={handleOpenEditMember}
          />
        );
      case 'registrations':
        return <MembershipRegistrationsView onAddLead={() => setIsLeadModalOpen(true)} />;
      case 'shop':
        return <MembershipShopView />;
      case 'scheduler':
        return <MembershipSchedulerView />;
      case 'finance':
        return <MembershipFinanceView />;
      case 'history':
        return <MembershipHistoryView />;
      case 'settings':
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      default:
        return (
          <MembershipDashboardView
            onAddMember={handleOpenAddMember}
            onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
          />
        );
    }
  };

  const handleCompleteOrSkipOnboarding = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('atrium_has_onboarded_v1', 'true');
    }
    if (!isAuthenticated) {
      loginWithPin('1234');
    }
    setShowPowerOnboarding(false);
    closeOnboarding();
  };

  return (
    <AppleOverscrollProvider>
      {/* Self-contained 5-second Atrium Confluence Intro Overlay mounted once at app start above all other content */}
      {isIntroActive && (
        <AtriumIntroOverlay forcePlay={true} onComplete={() => setIsIntroActive(false)} />
      )}

      {showPowerOnboarding || isOnboardingOpen ? (
        <React.Suspense fallback={<div className="min-h-screen w-screen bg-[#121110]" />}>
          <PowerOnboardingScreen
            onComplete={handleCompleteOrSkipOnboarding}
            onSkipToDashboard={handleCompleteOrSkipOnboarding}
          />
        </React.Suspense>
      ) : !isAuthenticated ? (
        <div className="min-h-screen w-screen bg-[#121110]">
          <LoginScreen onStartOnboarding={openOnboarding} />
        </div>
      ) : (
        <div className="h-screen w-screen overflow-hidden bg-[var(--color-window-bg)]">
          <AppShell
            autoHide={isTopBarAutoHide}
            barHidden={isTopBarCollapsed}
            onBarHiddenChange={(hidden) => {
              setTopBarCollapsed(hidden);
            }}
            sidebarOpen={isSidebarOpen}
            onSidebarOpenChange={setIsSidebarOpen}
            sidebar={
              <Sidebar
                open={isSidebarOpen}
                onOpenChange={setIsSidebarOpen}
                onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
                isOpenMobile={isMobileSidebarOpen}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
              />
            }
            topbar={
              <TopBar
                onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
                onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              />
            }
            floatingOverlay={
              <ScrollJumpPill targetContainerId="main-content-scroll" />
            }
          >
            {/* Small rounded shape button at top of screen to restore header when collapsed */}
            {isTopBarCollapsed && (
              <button
                type="button"
                onClick={() => setTopBarCollapsed(false)}
                className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#18181B] border border-[#E6DED6] dark:border-neutral-700 text-black/85 dark:text-white text-xs font-medium shadow-sm hover:shadow-md hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all duration-200 cursor-pointer group select-none backdrop-blur-md"
                title={t('topbar_focus_restore', "Afficher l'en-tête")}
                aria-label={t('topbar_focus_restore', "Afficher l'en-tête")}
              >
                <ChevronDown size={14} className="text-[var(--color-accent)] group-hover:translate-y-0.5 transition-transform" />
                <span>{t('topbar_focus_restore', "Afficher l'en-tête")}</span>
              </button>
            )}

            <div className="relative w-full min-h-full flex flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8 pb-16 sm:pb-20">
              <React.Suspense
                fallback={
                  <ScreenSuspenseFallback
                    category={currentBusiness?.category}
                    screen={activeScreen}
                  />
                }
              >
                {renderActiveScreen()}
              </React.Suspense>
            </div>
          </AppShell>
        </div>
      )
    }

      {/* Global Modals - Loaded On-Demand via React.Suspense */}
      {isCommandPaletteOpen && (
        <React.Suspense fallback={null}>
          <CommandPaletteModal
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
          />
        </React.Suspense>
      )}

      {isVoucherModalOpen && (
        <React.Suspense fallback={null}>
          <VoucherModal
            isOpen={isVoucherModalOpen}
            onClose={() => setIsVoucherModalOpen(false)}
          />
        </React.Suspense>
      )}

      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={handleCloseMemberModal}
        memberToEdit={memberToEdit}
        useKineticSpring={
          currentBusiness?.category === 'membership_session' && activeScreen === 'members'
        }
        originElement={memberModalOriginRef.current}
      />

      {isLeadModalOpen && (
        <React.Suspense fallback={null}>
          <LeadModal
            isOpen={isLeadModalOpen}
            onClose={() => setIsLeadModalOpen(false)}
          />
        </React.Suspense>
      )}

      {/* Section 11 Fast Switch Modal */}
      {isFastSwitchOpen && (
        <React.Suspense fallback={null}>
          <FastSwitchModal
            isOpen={isFastSwitchOpen}
            onClose={closeFastSwitch}
            onOpenOnboarding={() => setShowPowerOnboarding(true)}
          />
        </React.Suspense>
      )}

      {/* Free Web to Desktop Lifetime Upgrade Modal */}
      {isDesktopUpgradeModalOpen && (
        <React.Suspense fallback={null}>
          <DesktopUpgradeModal
            isOpen={isDesktopUpgradeModalOpen}
            onClose={closeDesktopUpgradeModal}
            onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
            reason={desktopUpgradeReason}
          />
        </React.Suspense>
      )}

      {/* Kinetic Category-Dedicated ToastStack */}
      <ToastStack />
  </AppleOverscrollProvider>
);
}
