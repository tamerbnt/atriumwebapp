import React, { useState, useEffect } from 'react';
import { useAtriumStore } from './services/store';
import { Member } from './types/index';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { AnalyticsScreen } from './components/screens/AnalyticsScreen';
import { MembersScreen } from './components/screens/MembersScreen';
import { RegistrationsScreen } from './components/screens/RegistrationsScreen';
import { ShopScreen } from './components/screens/ShopScreen';
import { SchedulerScreen } from './components/screens/SchedulerScreen';
import { FinanceStaffScreen } from './components/screens/FinanceStaffScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { VoucherModal } from './components/modals/VoucherModal';
import { MemberModal } from './components/modals/MemberModal';
import { LeadModal } from './components/modals/LeadModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { FastSwitchModal } from './components/auth/FastSwitchModal';
import { PowerOnboardingScreen } from './components/auth/PowerOnboardingScreen';
import { FreelanceDashboardView } from './components/screens/freelance/FreelanceDashboardView';
import { FreelanceClientsView } from './components/screens/freelance/FreelanceClientsView';
import { FreelanceDeliverablesView } from './components/screens/freelance/FreelanceDeliverablesView';
import { FreelanceTimeTrackerView } from './components/screens/freelance/FreelanceTimeTrackerView';
import { FreelanceInvoicesView } from './components/screens/freelance/FreelanceInvoicesView';
import { FreelanceProposalsView } from './components/screens/freelance/FreelanceProposalsView';
import { FreelanceFinanceView } from './components/screens/freelance/FreelanceFinanceView';
import { VenueDashboardView } from './components/screens/venue/VenueDashboardView';
import { VenueTimelineView } from './components/screens/venue/VenueTimelineView';
import { VenueBookingsView } from './components/screens/venue/VenueBookingsView';
import { VenueInventoryView } from './components/screens/venue/VenueInventoryView';
import { VenueRentersView } from './components/screens/venue/VenueRentersView';
import { VenueFinanceView } from './components/screens/venue/VenueFinanceView';
import { EducationDashboardView } from './components/screens/education/EducationDashboardView';
import { EducationTimetableView } from './components/screens/education/EducationTimetableView';
import { EducationStudentsView } from './components/screens/education/EducationStudentsView';
import { EducationCohortsView } from './components/screens/education/EducationCohortsView';
import { EducationAdmissionsView } from './components/screens/education/EducationAdmissionsView';
import { EducationAttendanceView } from './components/screens/education/EducationAttendanceView';
import { EducationFinanceView } from './components/screens/education/EducationFinanceView';
import { ProjectDirectionView } from './components/screens/project/ProjectDirectionView';
import { ProjectChefProjetView } from './components/screens/project/ProjectChefProjetView';
import { ProjectCreaView } from './components/screens/project/ProjectCreaView';
import { ProjectSuperviseurView } from './components/screens/project/ProjectSuperviseurView';
import { ProjectRhView } from './components/screens/project/ProjectRhView';
import { ProjectComptaView } from './components/screens/project/ProjectComptaView';
import { DesktopUpgradeModal } from './components/modals/DesktopUpgradeModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { ToastStack } from './components/ui/ToastStack';

export default function App() {
  const {
    currentBusiness,
    activeScreen,
    theme,
    language,
    isAuthenticated,
    isOnboardingOpen,
    isFastSwitchOpen,
    isDesktopUpgradeModalOpen,
    desktopUpgradeReason,
    openOnboarding,
    closeOnboarding,
    closeFastSwitch,
    closeDesktopUpgradeModal,
  } = useAtriumStore();

  // Onboarding wizard plays on initial boot or when explicitly requested
  const [showPowerOnboarding, setShowPowerOnboarding] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('atrium_has_onboarded_v1') !== 'true';
    }
    return true;
  });

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global keyboard shortcuts (Ctrl+K, Cmd+K, '/')
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
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
  }, []);

  // Sync theme & RTL on boot
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
      const state = useAtriumStore.getState();
      if (state.isLanguageAuto) {
        state.setSystemDefaultLanguage();
      }
    };
    window.addEventListener('languagechange', handleSystemLanguageChange);
    return () => window.removeEventListener('languagechange', handleSystemLanguageChange);
  }, []);

  // Close mobile sidebar on screen change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeScreen]);

  const handleOpenAddMember = () => {
    setMemberToEdit(null);
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (member: Member) => {
    setMemberToEdit(member);
    setIsMemberModalOpen(true);
  };

  const isFreelance = currentBusiness?.category === 'freelance_solo';
  const isProjectMilestone = currentBusiness?.category === 'project_milestone';

  const renderActiveScreen = () => {
    if (isProjectMilestone) {
      switch (activeScreen) {
        // Role 1: Direction (4 screens)
        case 'pm_dir_dashboard':
          return <ProjectDirectionView initialTab="dashboard" />;
        case 'pm_dir_new_project':
          return <ProjectDirectionView initialTab="new_project" />;
        case 'pm_dir_projects':
          return <ProjectDirectionView initialTab="dashboard" />;
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

    const isPOS = currentBusiness?.category === 'pos_inventory';

    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen onAddMember={handleOpenAddMember} />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'members':
        return (
          <MembersScreen
            onAddMember={handleOpenAddMember}
            onEditMember={handleOpenEditMember}
          />
        );
      case 'registrations':
        return isPOS ? <ShopScreen /> : <RegistrationsScreen onAddLead={() => setIsLeadModalOpen(true)} />;
      case 'shop':
        return <ShopScreen />;
      case 'scheduler':
        return isPOS ? <ShopScreen /> : <SchedulerScreen />;
      case 'finance':
        return <FinanceStaffScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      default:
        return isPOS ? <ShopScreen /> : <DashboardScreen onAddMember={handleOpenAddMember} />;
    }
  };

  const handleCompleteOrSkipOnboarding = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('atrium_has_onboarded_v1', 'true');
    }
    setShowPowerOnboarding(false);
    closeOnboarding();
  };

  // Launch onboarding screen on first boot or when explicitly requested
  if (showPowerOnboarding || isOnboardingOpen) {
    return (
      <PowerOnboardingScreen
        onComplete={handleCompleteOrSkipOnboarding}
        onSkipToDashboard={handleCompleteOrSkipOnboarding}
      />
    );
  }

  // If user is not authenticated, render LoginScreen with Onboarding access
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-screen bg-[#121110]">
        <LoginScreen onStartOnboarding={openOnboarding} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-window-bg)]">
      {/* 288px Obsidian Sidebar with Mobile Drawer */}
      <Sidebar
        onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TopBar Header */}
        <TopBar
          onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Dynamic Screen Viewport wrapped in pure white desktop container */}
        <main className="flex-1 overflow-y-auto pr-3 pl-2 pb-3 min-w-0">
          <div className="bg-white dark:bg-[#18181B] rounded-[32px] p-6 sm:p-8 min-h-[calc(100vh-80px)] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
            {renderActiveScreen()}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
      />

      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setMemberToEdit(null);
        }}
        memberToEdit={memberToEdit}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
      />

      {/* Section 11 Fast Switch Modal */}
      <FastSwitchModal
        isOpen={isFastSwitchOpen}
        onClose={closeFastSwitch}
        onOpenOnboarding={() => setShowPowerOnboarding(true)}
      />

      {/* Free Web to Desktop Lifetime Upgrade Modal */}
      <DesktopUpgradeModal
        isOpen={isDesktopUpgradeModalOpen}
        onClose={closeDesktopUpgradeModal}
        onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
        reason={desktopUpgradeReason}
      />

      {/* Kinetic Category-Dedicated ToastStack */}
      <ToastStack />
    </div>
  );
}
