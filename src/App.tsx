import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useAtriumSelector,
  useAtriumStoreLifecycle,
  selectCurrentBusinessFromState,
  setSystemDefaultLanguageAction,
  openOnboardingAction,
  closeOnboardingAction,
  closeFastSwitchAction,
  closeDesktopUpgradeModalAction,
  toggleTopBarCollapsedAction,
  setTopBarCollapsedAction,
  loginWithPinAction,
  logoutAction,
  atriumActions,
  shallowEqualObjects,
} from './services/store';
import { Member } from './types/index';
import { AppShell } from '@/atrium/core';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
const LoginScreen = React.lazy(() =>
  import('./components/auth/LoginScreen').then((m) => ({ default: m.LoginScreen }))
);
import { ScreenSuspenseFallback } from './components/ui/skeleton/ScreenSuspenseFallback';
import { ScreenFocusProvider } from './components/ui/kinetic/ScreenFocusContext';
import { AccessRestrictedView } from './components/common/AccessRestrictedView';
import {
  canAccessRoute,
  getEffectivePermissionContext,
  recordRouteAccessDenied,
  resolveSemanticRoute,
  type RolePermissionState,
} from './utils/routePermissions';
import { getEffectiveUserRole, normalizeBusinessCategory } from './utils/staffRules';
import {
  createDefaultSecurityPolicy,
  evaluateSessionIdleTimeout,
  isSensitiveVerticalScreen,
} from './utils/rbacEngine';

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
const MemberModal = React.lazy(() =>
  import('./components/modals/MemberModal').then((m) => ({ default: m.MemberModal }))
);
const LeadModal = React.lazy(() =>
  import('./components/modals/LeadModal').then((m) => ({ default: m.LeadModal }))
);
const DesktopUpgradeModal = React.lazy(() =>
  import('./components/modals/DesktopUpgradeModal').then((m) => ({ default: m.DesktopUpgradeModal }))
);
const ConcurrencyConflictModal = React.lazy(() =>
  import('./components/modals/ConcurrencyConflictModal').then((m) => ({
    default: m.ConcurrencyConflictModal,
  }))
);

// All 116 Screens lazy-loaded with Category Chunk Partitioning
import {
  SettingsScreen,
  CategoryHomeView,
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
  ProjectHistoryView,
  FreelanceHistoryView,
  VenueHistoryView,
  EducationHistoryView,
  TradingHistoryView,
  MedicalHistoryView,
  AutoGarageHistoryView,
  RealEstateHistoryView,
  ManufacturingHistoryView,
  LegalHistoryView,
  LogisticsHistoryView,
  ContractorHistoryView,
  AgricultureHistoryView,
  BiAnalyticsWorkspace,
} from './components/screens/lazyScreens';
import { ToastStack } from './components/ui/ToastStack';
import { ScrollJumpPill } from './components/ui/ScrollJumpPill';
const AtriumIntroOverlay = React.lazy(() =>
  import('./components/ui/AtriumIntroOverlay').then((m) => ({ default: m.AtriumIntroOverlay }))
);
import { AppleOverscrollProvider } from './components/common/AppleOverscrollProvider';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from './utils/useTranslation';
import {
  applyFacilityAccentCssVars,
  redoLatestForBranch,
  undoLatestForBranch,
} from './services/undoEngine';

export default function App() {
  useAtriumStoreLifecycle();

  // ── Grouped selectors: 30 individual subscriptions → 3 (P0 perf fix) ──────
  // Each group uses shallowEqualObjects so a render fires only when a value
  // in that group actually changes (not on every notify() call).

  // Group 1: Shell / routing state — changes on nav, theme, auth, layout prefs
  const {
    currentBusiness,
    currentBusinessId,
    currentBranchId,
    activeScreen,
    theme,
    density,
    language,
    isLanguageAuto,
    isAuthenticated,
    isTopBarCollapsed,
    isTopBarAutoHide,
    isListPodExpanded,
  } = useAtriumSelector(
    (s) => ({
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
      activeScreen: s.activeScreen,
      theme: s.theme,
      density: s.density || 'default',
      language: s.language,
      isLanguageAuto: s.isLanguageAuto,
      isAuthenticated: s.isAuthenticated,
      isTopBarCollapsed: s.isTopBarCollapsed || false,
      isTopBarAutoHide: s.isTopBarAutoHide ?? false,
      isListPodExpanded: s.isListPodExpanded,
    }),
    shallowEqualObjects
  );

  // Group 2: Modal / overlay state — fires only on open/close events
  const {
    isOnboardingOpen,
    isFastSwitchOpen,
    isDesktopUpgradeModalOpen,
    desktopUpgradeReason,
    hasConcurrencyConflicts,
  } = useAtriumSelector(
    (s) => ({
      isOnboardingOpen: s.isOnboardingOpen,
      isFastSwitchOpen: s.isFastSwitchOpen,
      isDesktopUpgradeModalOpen: s.isDesktopUpgradeModalOpen,
      desktopUpgradeReason: s.desktopUpgradeReason,
      hasConcurrencyConflicts: (s.concurrencyConflicts?.length || 0) > 0,
    }),
    shallowEqualObjects
  );

  // Group 3: Role & operator context — changes only on facility or operator switch
  const {
    accountId,
    currentUser,
    activeGarageRole,
    activeLegalRole,
    activeLogisticsRole,
    activeContractorRole,
    activeRealEstateRole,
    activeManufacturingRole,
    activeAgriRole,
    activePmRole,
    activeMembershipRole,
    activeAppointmentRole,
    activePosRole,
    activeEducationRole,
    rbacPermissions,
    securityPolicyByBusiness,
    sessionLockState,
  } = useAtriumSelector(
    (s) => ({
      accountId: s.account?.id || null,
      currentUser: s.currentUser,
      activeGarageRole: s.activeGarageRole,
      activeLegalRole: s.activeLegalRole,
      activeLogisticsRole: s.activeLogisticsRole,
      activeContractorRole: s.activeContractorRole,
      activeRealEstateRole: s.activeRealEstateRole,
      activeManufacturingRole: s.activeManufacturingRole,
      activeAgriRole: s.activeAgriRole,
      activePmRole: s.activePmRole,
      activeMembershipRole: s.activeMembershipRole,
      activeAppointmentRole: s.activeAppointmentRole,
      activePosRole: s.activePosRole,
      activeEducationRole: s.activeEducationRole,
      rbacPermissions: s.rbacPermissions,
      securityPolicyByBusiness: s.securityPolicyByBusiness,
      sessionLockState: s.sessionLockState,
    }),
    shallowEqualObjects
  );
  const setSystemDefaultLanguage = setSystemDefaultLanguageAction;
  const openOnboarding = openOnboardingAction;
  const closeOnboarding = closeOnboardingAction;
  const closeFastSwitch = closeFastSwitchAction;
  const closeDesktopUpgradeModal = closeDesktopUpgradeModalAction;
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
      } catch { }
      setIsIntroActive(true);
    };
    document.addEventListener('atrium:introcomplete', handleIntroComplete);
    window.addEventListener('atrium:replayintro', handleReplayIntro);
    return () => {
      document.removeEventListener('atrium:introcomplete', handleIntroComplete);
      window.removeEventListener('atrium:replayintro', handleReplayIntro);
    };
  }, []);

  // Start on onboarding for first-time visitors until completed or explicitly skipped
  const [showPowerOnboarding, setShowPowerOnboarding] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return true;
    }
    try {
      return localStorage.getItem('atrium_has_onboarded_v1') !== 'true';
    } catch {
      return true;
    }
  });

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [hasActivatedMemberModal, setHasActivatedMemberModal] = useState(false);
  const [activatedModals, setActivatedModals] = useState({
    cmd: false,
    voucher: false,
    lead: false,
    fastSwitch: false,
    desktopUpgrade: false,
    concurrency: false,
  });
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [memberPrefillName, setMemberPrefillName] = useState<string>('');
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setActivatedModals((prev) => {
      const next = {
        cmd: prev.cmd || isCommandPaletteOpen,
        voucher: prev.voucher || isVoucherModalOpen,
        lead: prev.lead || isLeadModalOpen,
        fastSwitch: prev.fastSwitch || isFastSwitchOpen,
        desktopUpgrade: prev.desktopUpgrade || isDesktopUpgradeModalOpen,
        concurrency: prev.concurrency || hasConcurrencyConflicts,
      };
      if (
        next.cmd === prev.cmd &&
        next.voucher === prev.voucher &&
        next.lead === prev.lead &&
        next.fastSwitch === prev.fastSwitch &&
        next.desktopUpgrade === prev.desktopUpgrade &&
        next.concurrency === prev.concurrency
      ) {
        return prev;
      }
      return next;
    });
  }, [
    isCommandPaletteOpen,
    isVoucherModalOpen,
    isLeadModalOpen,
    isFastSwitchOpen,
    isDesktopUpgradeModalOpen,
    hasConcurrencyConflicts,
  ]);

  // Global keyboard shortcuts (Ctrl+K, Cmd+K, Ctrl+Z/Cmd+Z, '/')
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const isEditingInput =
        Boolean(targetEl) &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetEl!.tagName) ||
          targetEl!.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'z' &&
        !isEditingInput
      ) {
        e.preventDefault();
        void undoLatestForBranch(currentBusinessId, currentBranchId);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'z' &&
        !isEditingInput
      ) {
        e.preventDefault();
        void redoLatestForBranch(currentBusinessId, currentBranchId);
      } else if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleTopBarCollapsed();
      } else if (e.key === 'Escape' && isTopBarCollapsed) {
        setTopBarCollapsed(false);
      } else if (e.key === '/' && !isEditingInput) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isTopBarCollapsed,
    isTopBarAutoHide,
    toggleTopBarCollapsed,
    setTopBarCollapsed,
    currentBusinessId,
    currentBranchId,
  ]);

  // Sync theme, density, facility accent & RTL on boot
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-atrium-theme', theme);
    document.documentElement.setAttribute('data-density', density);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    applyFacilityAccentCssVars(currentBusiness?.category, theme);
  }, [theme, density, language, currentBusiness?.category]);

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

  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const handleToggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((prev) => !prev);
  }, []);

  const memberModalOriginRef = useRef<HTMLElement | null>(null);
  const businessCategoryRef = useRef(currentBusiness?.category);
  businessCategoryRef.current = currentBusiness?.category;
  const activeScreenRef = useRef(activeScreen);
  activeScreenRef.current = activeScreen;

  const handleOpenAddMember = useCallback((originOrEvent?: any, prefillName?: string) => {
    const originEl =
      originOrEvent && typeof originOrEvent === 'object' && 'currentTarget' in originOrEvent
        ? (originOrEvent.currentTarget as HTMLElement | null)
        : (originOrEvent as HTMLElement | null | undefined);
    const resolvedOrigin =
      originEl ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null);
    memberModalOriginRef.current = resolvedOrigin;
    setMemberToEdit(null);
    setMemberPrefillName(prefillName || '');
    setHasActivatedMemberModal(true);
    setIsMemberModalOpen(true);
  }, []);

  const handleOpenEditMember = useCallback((member: Member, originEl?: HTMLElement | null) => {
    const resolvedOrigin =
      originEl ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null);
    memberModalOriginRef.current = resolvedOrigin;
    setMemberToEdit(member);
    setMemberPrefillName('');
    setHasActivatedMemberModal(true);
    setIsMemberModalOpen(true);
  }, []);

  const handleCloseMemberModal = useCallback(() => {
    setIsMemberModalOpen(false);
    setMemberToEdit(null);
    setMemberPrefillName('');
  }, []);

  const handleOpenVoucherModal = useCallback(() => setIsVoucherModalOpen(true), []);
  const handleCloseVoucherModal = useCallback(() => setIsVoucherModalOpen(false), []);
  const handleOpenLeadModal = useCallback(() => setIsLeadModalOpen(true), []);
  const handleCloseLeadModal = useCallback(() => setIsLeadModalOpen(false), []);
  const handleOpenCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const handleCloseCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

  const canonicalCategory = useMemo(
    () => normalizeBusinessCategory(currentBusiness?.category),
    [currentBusiness?.category]
  );

  const currentRbacMatrix = useMemo(
    () =>
      (rbacPermissions || []).filter(
        (r) => r.businessId === currentBusinessId && !r.deletedAt
      ),
    [rbacPermissions, currentBusinessId]
  );

  const currentSecurityPolicy = useMemo(
    () =>
      securityPolicyByBusiness?.[currentBusinessId] ||
      createDefaultSecurityPolicy({
        accountId: accountId || '',
        businessId: currentBusinessId || '',
      }),
    [securityPolicyByBusiness, accountId, currentBusinessId]
  );

  const permissionState = useMemo<RolePermissionState>(
    () => ({
      currentUser,
      accountId,
      businessId: currentBusinessId,
      branchId: currentBranchId,
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
      rbacMatrix: currentRbacMatrix,
    }),
    [
      currentUser,
      accountId,
      currentBusinessId,
      currentBranchId,
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
      currentRbacMatrix,
    ]
  );

  const permissionCtx = useMemo(
    () => getEffectivePermissionContext(canonicalCategory, permissionState),
    [canonicalCategory, permissionState]
  );

  const effectiveRole = useMemo(
    () => getEffectiveUserRole(canonicalCategory, permissionState),
    [canonicalCategory, permissionState]
  );

  const resolvedScreen = useMemo(
    () => resolveSemanticRoute(canonicalCategory, permissionState, activeScreen),
    [canonicalCategory, permissionState, activeScreen]
  );

  const isRouteAllowed = useMemo(
    () =>
      canAccessRoute(canonicalCategory, permissionState, activeScreen, {
        isDev: import.meta.env.DEV,
      }),
    [canonicalCategory, permissionState, activeScreen]
  );

  useEffect(() => {
    if (!isAuthenticated || isRouteAllowed) return;
    void recordRouteAccessDenied({
      attemptedScreen: activeScreen,
      category: canonicalCategory,
      state: permissionState,
      reason: 'ROUTE_GUARD_DENIED',
    });
  }, [isAuthenticated, isRouteAllowed, activeScreen, canonicalCategory, permissionState]);

  // Sensitive vertical read audit log (Medical Clinic & Legal Accounting)
  useEffect(() => {
    if (!isAuthenticated || !isRouteAllowed) return;
    if (!isSensitiveVerticalScreen(canonicalCategory, resolvedScreen)) return;
    atriumActions.recordSensitiveDataRead({
      category: canonicalCategory,
      screen: resolvedScreen,
    });
  }, [isAuthenticated, isRouteAllowed, canonicalCategory, resolvedScreen, currentBusinessId, currentUser?.id]);

  // Idle session timeout auto-lock
  useEffect(() => {
    if (!isAuthenticated || sessionLockState?.isLocked) return;
    let lastTouchMs = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastTouchMs >= 5000) {
        lastTouchMs = now;
        atriumActions.touchSessionActivity();
      }
    };
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    const intervalId = window.setInterval(() => {
      const check = evaluateSessionIdleTimeout(
        sessionLockState?.lastActivityAtMs ?? lastTouchMs,
        currentSecurityPolicy.sessionTimeoutMinutes,
        Date.now(),
        currentSecurityPolicy.requirePinOnIdle
      );
      if (check.shouldLock) {
        atriumActions.lockActiveSession('idle_timeout');
      }
    }, 10_000);

    return () => {
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.clearInterval(intervalId);
    };
  }, [
    isAuthenticated,
    sessionLockState?.isLocked,
    sessionLockState?.lastActivityAtMs,
    currentSecurityPolicy.sessionTimeoutMinutes,
    currentSecurityPolicy.requirePinOnIdle,
  ]);

  const isFreelance = canonicalCategory === 'freelance_solo';
  const isProjectMilestone = canonicalCategory === 'project_milestone';

  const isFocusEligibleScreen = React.useMemo(() => {
    if (!isRouteAllowed) return false;
    if (
      resolvedScreen === 'home' ||
      resolvedScreen === 'chart_catalog' ||
      resolvedScreen === 'settings' ||
      resolvedScreen === 'preferences' ||
      resolvedScreen === 'pm_dir_dashboard' ||
      resolvedScreen === 'trading_dashboard'
    ) {
      return false;
    }
    if (resolvedScreen === 'dashboard') {
      return (
        activeMembershipRole === 'staff' ||
        activeAppointmentRole === 'staff' ||
        activePosRole === 'staff' ||
        activeEducationRole === 'staff' ||
        activeGarageRole === 'mecanicien' ||
        activeGarageRole === 'magasinier' ||
        activeManufacturingRole === 'operateur' ||
        activeLegalRole === 'secretaire_caisse' ||
        activeLogisticsRole === 'hub_sorter' ||
        activeLogisticsRole === 'stop_desk_agent' ||
        activeContractorRole === 'chef_chantier'
      );
    }
    return true;
  }, [
    isRouteAllowed,
    resolvedScreen,
    activeMembershipRole,
    activeAppointmentRole,
    activePosRole,
    activeEducationRole,
    activeGarageRole,
    activeManufacturingRole,
    activeLegalRole,
    activeLogisticsRole,
    activeContractorRole,
  ]);

  const renderRestrictedFallback = () => (
    <AccessRestrictedView
      attemptedScreen={activeScreen}
      category={canonicalCategory}
      effectiveRole={effectiveRole}
    />
  );

  const renderActiveScreen = () => {
    if (import.meta.env.DEV && resolvedScreen === 'chart_catalog') {
      return <DashboardCatalogScreen />;
    }

    if (!isRouteAllowed) {
      return renderRestrictedFallback();
    }

    if (resolvedScreen === 'preferences') {
      return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} preferencesOnly />;
    }

    if (resolvedScreen === 'settings') {
      return (
        <SettingsScreen
          onOpenVoucherModal={handleOpenVoucherModal}
          preferencesOnly={!permissionCtx.isExecutive}
        />
      );
    }

    if (resolvedScreen === 'bi_reports') {
      return <BiAnalyticsWorkspace />;
    }

    if (resolvedScreen === 'staff') {
      const cat = canonicalCategory;
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

    if (resolvedScreen === 'home') {
      return (
        <CategoryHomeView
          onAddMember={handleOpenAddMember}
          onOpenVoucherModal={handleOpenVoucherModal}
          onAddLead={handleOpenLeadModal}
        />
      );
    }

    if (isProjectMilestone) {
      switch (resolvedScreen) {
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
          return activePmRole === 'direction' ? (
            <ProjectHistoryView />
          ) : (
            renderRestrictedFallback()
          );
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
        default:
          return renderRestrictedFallback();
      }
    }

    if (isFreelance) {
      switch (resolvedScreen) {
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
          return <FreelanceHistoryView />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
        default:
          return renderRestrictedFallback();
      }
    }

    const isRental = canonicalCategory === 'rental_booking';
    if (isRental) {
      switch (resolvedScreen) {
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
          return <VenueHistoryView />;
        case 'analytics':
          return <VenueDashboardView />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
        default:
          return renderRestrictedFallback();
      }
    }

    const isEducation = canonicalCategory === 'education_cohort';
    if (isEducation) {
      if (activeEducationRole === 'staff') {
        switch (resolvedScreen) {
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
          default:
            return renderRestrictedFallback();
        }
      }

      switch (resolvedScreen) {
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
          return <EducationHistoryView />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
        default:
          return renderRestrictedFallback();
      }
    }

    const isTrading = canonicalCategory === 'trading_commercial';
    if (isTrading) {
      switch (resolvedScreen) {
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
        case 'history':
          return <TradingHistoryView />;
        case 'analytics':
          return <TradingDashboardView />;
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
        default:
          return renderRestrictedFallback();
      }
    }

    if (canonicalCategory === 'medical_clinic') {
      if (activeScreen === 'settings') {
        return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
      }
      switch (resolvedScreen) {
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
        case 'history':
          return <MedicalHistoryView />;
        default:
          return renderRestrictedFallback();
      }
    }

    if (canonicalCategory === 'auto_garage') {
      if (activeScreen === 'settings') {
        return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
      }
      if (activeGarageRole === 'mecanicien') {
        switch (resolvedScreen) {
          case 'dashboard':
          case 'scheduler':
          case 'registrations':
            return <AutoGarageOrdersView />;
          case 'members':
            return <AutoGarageVehiclesView />;
          case 'shop':
            return <AutoGaragePartsView />;
          default:
            return renderRestrictedFallback();
        }
      }
      if (activeGarageRole === 'magasinier') {
        switch (resolvedScreen) {
          case 'dashboard':
          case 'shop':
            return <AutoGaragePartsView />;
          case 'scheduler':
          case 'registrations':
            return <AutoGarageOrdersView />;
          default:
            return renderRestrictedFallback();
        }
      }
      switch (resolvedScreen) {
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
        case 'history':
          return activeGarageRole === 'reception' || activeGarageRole === 'caisse' ? (
            renderRestrictedFallback()
          ) : (
            <AutoGarageHistoryView />
          );
        default:
          return renderRestrictedFallback();
      }
    }

    if (canonicalCategory === 'real_estate') {
      if (activeScreen === 'settings') {
        if (activeRealEstateRole !== 'direction') {
          return renderRestrictedFallback();
        }
        return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
      }

      // Role-specific screen permission guards
      if (activeRealEstateRole === 'negociateur') {
        if (resolvedScreen === 'scheduler' || resolvedScreen === 'finance') {
          return renderRestrictedFallback();
        }
      } else if (activeRealEstateRole === 'gestionnaire_locatif') {
        if (resolvedScreen === 'realestate_mandates' || resolvedScreen === 'shop') {
          return renderRestrictedFallback();
        }
      } else if (activeRealEstateRole === 'notaire_compta') {
        if (resolvedScreen === 'registrations' || resolvedScreen === 'members') {
          return renderRestrictedFallback();
        }
      }

      switch (resolvedScreen) {
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
        case 'history':
          return activeRealEstateRole !== 'direction' ? (
            renderRestrictedFallback()
          ) : (
            <RealEstateHistoryView />
          );
        default:
          return renderRestrictedFallback();
      }
    }

    if (canonicalCategory === 'manufacturing_production') {
      if (activeScreen === 'settings') {
        if (activeManufacturingRole !== 'gerant') {
          return renderRestrictedFallback();
        }
        return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
      }

      // Role-specific screen permission guards & specialized routing
      if (activeManufacturingRole === 'operateur') {
        switch (resolvedScreen) {
          case 'dashboard':
            return <ManufacturingWorkstationView />;
          case 'scheduler':
          case 'registrations':
            return <ManufacturingOrdersView />;
          default:
            return renderRestrictedFallback();
        }
      }

      if (activeManufacturingRole === 'magasinier') {
        switch (resolvedScreen) {
          case 'dashboard':
            return <ManufacturingDashboardView />;
          case 'shop':
          case 'members':
          case 'finance':
            return <ManufacturingMaterialsView />;
          default:
            return renderRestrictedFallback();
        }
      }

      if (activeManufacturingRole === 'qualite') {
        switch (resolvedScreen) {
          case 'dashboard':
            return <ManufacturingDashboardView />;
          case 'scheduler':
          case 'registrations':
            return <ManufacturingOrdersView />;
          case 'finance':
            return <ManufacturingQcView />;
          default:
            return renderRestrictedFallback();
        }
      }

      if (activeManufacturingRole === 'chef_atelier') {
        switch (resolvedScreen) {
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
            return renderRestrictedFallback();
        }
      }

      // Default: Gérant (Full access)
      switch (resolvedScreen) {
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
        case 'history':
          return <ManufacturingHistoryView />;
        default:
          return renderRestrictedFallback();
      }
    }

    if (canonicalCategory === 'legal_accounting') {
      if (activeLegalRole === 'secretaire_caisse') {
        switch (resolvedScreen) {
          case 'dashboard':
          case 'finance':
            return <LegalTrustView />;
          case 'members':
            return <LegalMattersView />;
          case 'scheduler':
            return <LegalHearingsView />;
          case 'registrations':
            return <LegalVaultView />;
          default:
            return renderRestrictedFallback();
        }
      }
      switch (resolvedScreen) {
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
        case 'history':
          return <LegalHistoryView />;
        default:
          return renderRestrictedFallback();
      }
    }

    if (canonicalCategory === 'logistics_delivery') {
      if (activeLogisticsRole === 'hub_sorter') {
        switch (resolvedScreen) {
          case 'dashboard':
          case 'registrations':
            return <LogisticsScannerView />;
          case 'members':
            return <LogisticsShipmentsView />;
          case 'scheduler':
            return <LogisticsManifestsView />;
          default:
            return renderRestrictedFallback();
        }
      }
      if (activeLogisticsRole === 'stop_desk_agent') {
        switch (resolvedScreen) {
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
            return renderRestrictedFallback();
        }
      }
      switch (resolvedScreen) {
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
        case 'history':
          return activeLogisticsRole === 'dispatcher' ? (
            renderRestrictedFallback()
          ) : (
            <LogisticsHistoryView />
          );
        default:
          return renderRestrictedFallback();
      }
    }

    if (canonicalCategory === 'construction_contractor') {
      if (activeScreen === 'settings') {
        return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
      }
      if (activeContractorRole === 'chef_chantier') {
        switch (resolvedScreen) {
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
            return renderRestrictedFallback();
        }
      }
      switch (resolvedScreen) {
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
        case 'history':
          return activeContractorRole === 'gerant' ? (
            <ContractorHistoryView />
          ) : (
            renderRestrictedFallback()
          );
        default:
          return renderRestrictedFallback();
      }
    }

    if (canonicalCategory === 'agriculture_farming') {
      if (activeScreen === 'settings') {
        if (activeAgriRole !== 'gerant') {
          return renderRestrictedFallback();
        }
        return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
      }

      // Role-specific screen permission guards & specialized routing
      if (activeAgriRole === 'chef_culture') {
        switch (resolvedScreen) {
          case 'members':
            return <AgricultureParcelsView />;
          case 'scheduler':
            return <AgricultureCyclesView />;
          case 'shop':
            return <AgricultureHarvestView />;
          default:
            return renderRestrictedFallback();
        }
      }

      if (activeAgriRole === 'zootechnicien') {
        switch (resolvedScreen) {
          case 'registrations':
            return <AgricultureLivestockView />;
          default:
            return renderRestrictedFallback();
        }
      }

      if (activeAgriRole === 'magasinier') {
        switch (resolvedScreen) {
          case 'finance':
            return <AgricultureWholesaleView />;
          case 'shop':
            return <AgricultureHarvestView />;
          default:
            return renderRestrictedFallback();
        }
      }

      // Default: Gérant / Exploitant Agricole (Full macro access)
      switch (resolvedScreen) {
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
        case 'history':
          return <AgricultureHistoryView />;
        default:
          return renderRestrictedFallback();
      }
    }

    const isMembership = canonicalCategory === 'membership_session';
    if (isMembership) {
      if (activeMembershipRole === 'staff') {
        switch (resolvedScreen) {
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
            return <MembershipRegistrationsView onAddLead={handleOpenLeadModal} />;
          default:
            return renderRestrictedFallback();
        }
      }

      switch (resolvedScreen) {
        case 'dashboard':
          return (
            <MembershipDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={handleOpenVoucherModal}
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
          return <MembershipRegistrationsView onAddLead={handleOpenLeadModal} />;
        case 'shop':
          return <MembershipShopView />;
        case 'scheduler':
          return <MembershipSchedulerView />;
        case 'finance':
          return <MembershipFinanceView />;
        case 'history':
          return <MembershipHistoryView />;
        case 'analytics':
          return (
            <MembershipDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={handleOpenVoucherModal}
            />
          );
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
        default:
          return renderRestrictedFallback();
      }
    }

    const isAppointment = canonicalCategory === 'appointment_service';
    if (isAppointment) {
      if (activeAppointmentRole === 'staff') {
        switch (resolvedScreen) {
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
          default:
            return renderRestrictedFallback();
        }
      }

      switch (resolvedScreen) {
        case 'dashboard':
          return (
            <AppointmentDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={handleOpenVoucherModal}
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
              onOpenVoucherModal={handleOpenVoucherModal}
            />
          );
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
        default:
          return renderRestrictedFallback();
      }
    }

    const isPOS = canonicalCategory === 'pos_inventory';
    if (isPOS) {
      if (activePosRole === 'staff') {
        switch (resolvedScreen) {
          case 'dashboard':
          case 'shop':
            return <PosRegisterView initialTab="register" />;
          case 'scheduler':
            return <PosInventoryView />;
          case 'registrations':
          case 'members':
            return <PosOrdersView />;
          default:
            return renderRestrictedFallback();
        }
      }

      switch (resolvedScreen) {
        case 'dashboard':
          return (
            <PosDashboardView
              onAddMember={handleOpenAddMember}
              onOpenVoucherModal={handleOpenVoucherModal}
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
              onOpenVoucherModal={handleOpenVoucherModal}
            />
          );
        case 'settings':
          return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
        default:
          return renderRestrictedFallback();
      }
    }

    switch (resolvedScreen) {
      case 'dashboard':
        return (
          <MembershipDashboardView
            onAddMember={handleOpenAddMember}
            onOpenVoucherModal={handleOpenVoucherModal}
          />
        );
      case 'analytics':
        return (
          <MembershipDashboardView
            onAddMember={handleOpenAddMember}
            onOpenVoucherModal={handleOpenVoucherModal}
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
        return <MembershipRegistrationsView onAddLead={handleOpenLeadModal} />;
      case 'shop':
        return <MembershipShopView />;
      case 'scheduler':
        return <MembershipSchedulerView />;
      case 'finance':
        return <MembershipFinanceView />;
      case 'history':
        return <MembershipHistoryView />;
      case 'settings':
        return <SettingsScreen onOpenVoucherModal={handleOpenVoucherModal} />;
      default:
        return renderRestrictedFallback();
    }
  };

  const renderedActiveScreen = useMemo(() => {
    return renderActiveScreen();
  }, [
    resolvedScreen,
    canonicalCategory,
    currentBusiness?.id,
    currentBranchId,
    isRouteAllowed,
    permissionCtx.isExecutive,
    effectiveRole,
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
    handleOpenAddMember,
    handleOpenEditMember,
    handleOpenVoucherModal,
    handleOpenLeadModal,
  ]);

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

  const handleSwitchAccountFromOnboarding = () => {
    logoutAction();
    setShowPowerOnboarding(false);
    closeOnboarding();
  };

  return (
    <AppleOverscrollProvider>
      {/* Self-contained 5-second Atrium Confluence Intro Overlay mounted once at app start above all other content */}
      {isIntroActive && (
        <React.Suspense fallback={null}>
          <AtriumIntroOverlay forcePlay={true} onComplete={() => setIsIntroActive(false)} />
        </React.Suspense>
      )}

      {showPowerOnboarding || isOnboardingOpen ? (
        <React.Suspense fallback={<div className="min-h-screen w-screen bg-[#121110]" />}>
          <PowerOnboardingScreen
            onComplete={handleCompleteOrSkipOnboarding}
            onSkipToDashboard={handleCompleteOrSkipOnboarding}
            onSwitchAccount={handleSwitchAccountFromOnboarding}
          />
        </React.Suspense>
      ) : !isAuthenticated ? (
        <div className="min-h-screen w-screen bg-[#121110]">
          <React.Suspense fallback={<ScreenSuspenseFallback />}>
            <LoginScreen onStartOnboarding={openOnboarding} />
          </React.Suspense>
        </div>
      ) : (
        <div className="h-screen w-screen overflow-hidden bg-[var(--color-window-bg)]">
          <AppShell
            autoHide={isTopBarAutoHide}
            barHidden={isTopBarCollapsed}
            onBarHiddenChange={(hidden) => {
              setTopBarCollapsed(hidden);
            }}
            defaultSidebarOpen={false}
            sidebar={
              <Sidebar
                onOpenVoucherModal={handleOpenVoucherModal}
                isOpenMobile={isMobileSidebarOpen}
                onCloseMobile={handleCloseMobileSidebar}
              />
            }
            topbar={
              <TopBar
                onOpenVoucherModal={handleOpenVoucherModal}
                onToggleMobileMenu={handleToggleMobileSidebar}
                onOpenCommandPalette={handleOpenCommandPalette}
              />
            }
            floatingOverlay={
              activeScreen !== 'home' ? (
                <ScrollJumpPill targetContainerId="main-content-scroll" />
              ) : undefined
            }
          >
            {/* Small rounded shape button at top of screen to restore header when collapsed */}
            {isTopBarCollapsed && (
              <button
                type="button"
                onClick={() => setTopBarCollapsed(false)}
                className="fixed top-[var(--s2)] left-1/2 -translate-x-1/2 z-50 h-[var(--btn-sm-h,32px)] flex items-center gap-[var(--btn-sm-gap,6px)] px-[var(--btn-sm-px,12px)] rounded-full bg-white dark:bg-[#262422] border-0 text-[var(--text-1)] dark:text-white t-btn shadow-[0_8px_24px_rgba(23,19,15,0.12)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.10)] hover:shadow-[0_10px_28px_rgba(23,19,15,0.16)] hover:text-[var(--brand-text)] dark:hover:text-[var(--brand-on-dark)] transition-[transform,color,box-shadow] duration-200 cursor-pointer group select-none"
                title={t('topbar_focus_restore', "Afficher l'en-tête")}
                aria-label={t('topbar_focus_restore', "Afficher l'en-tête")}
              >
                <ChevronDown size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] group-hover:translate-y-0.5 transition-transform" />
                <span>{t('topbar_focus_restore', "Afficher l'en-tête")}</span>
              </button>
            )}

            <div
              data-list-pod-root={isFocusEligibleScreen ? 'true' : undefined}
              data-list-pod-expanded={
                isFocusEligibleScreen && isListPodExpanded ? 'true' : 'false'
              }
              className={
                activeScreen === 'home'
                  ? 'relative w-full min-h-full lg:h-full flex flex-col p-[var(--container-pad)]'
                  : 'relative w-full min-h-full flex flex-col p-[var(--container-pad)]'
              }
            >
              <ScreenFocusProvider eligible={isFocusEligibleScreen}>
                <React.Suspense
                  fallback={
                    <ScreenSuspenseFallback
                      category={currentBusiness?.category}
                      screen={activeScreen}
                    />
                  }
                >
                  {renderedActiveScreen}
                </React.Suspense>
              </ScreenFocusProvider>
            </div>
          </AppShell>
        </div>
      )
      }

      {/* Global Modals - Loaded On-Demand via React.Suspense & retained for smooth close springs */}
      {(activatedModals.cmd || isCommandPaletteOpen) && (
        <React.Suspense fallback={null}>
          <CommandPaletteModal
            isOpen={isCommandPaletteOpen}
            onClose={handleCloseCommandPalette}
          />
        </React.Suspense>
      )}

      {(activatedModals.voucher || isVoucherModalOpen) && (
        <React.Suspense fallback={null}>
          <VoucherModal
            isOpen={isVoucherModalOpen}
            onClose={handleCloseVoucherModal}
          />
        </React.Suspense>
      )}

      {(hasActivatedMemberModal || isMemberModalOpen) && (
        <React.Suspense fallback={null}>
          <MemberModal
            isOpen={isMemberModalOpen}
            onClose={handleCloseMemberModal}
            memberToEdit={memberToEdit}
            prefillName={memberPrefillName}
            useKineticSpring={
              currentBusiness?.category === 'membership_session' && activeScreen === 'members'
            }
            originElement={memberModalOriginRef.current}
          />
        </React.Suspense>
      )}

      {(activatedModals.lead || isLeadModalOpen) && (
        <React.Suspense fallback={null}>
          <LeadModal
            isOpen={isLeadModalOpen}
            onClose={handleCloseLeadModal}
          />
        </React.Suspense>
      )}

      {/* Section 11 Fast Switch Modal */}
      {(activatedModals.fastSwitch || isFastSwitchOpen) && (
        <React.Suspense fallback={null}>
          <FastSwitchModal
            isOpen={isFastSwitchOpen}
            onClose={closeFastSwitch}
            onOpenOnboarding={() => setShowPowerOnboarding(true)}
          />
        </React.Suspense>
      )}

      {/* Free Web to Desktop Lifetime Upgrade Modal */}
      {(activatedModals.desktopUpgrade || isDesktopUpgradeModalOpen) && (
        <React.Suspense fallback={null}>
          <DesktopUpgradeModal
            isOpen={isDesktopUpgradeModalOpen}
            onClose={closeDesktopUpgradeModal}
            onOpenVoucherModal={handleOpenVoucherModal}
            reason={desktopUpgradeReason}
          />
        </React.Suspense>
      )}

      {/* Optimistic Concurrency Conflict Resolution Modal */}
      {(activatedModals.concurrency || hasConcurrencyConflicts) && (
        <React.Suspense fallback={null}>
          <ConcurrencyConflictModal />
        </React.Suspense>
      )}

      {/* Kinetic Category-Dedicated ToastStack */}
      <ToastStack />
    </AppleOverscrollProvider>
  );
}
