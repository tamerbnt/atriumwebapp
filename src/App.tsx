import React, { useState, useEffect } from 'react';
import { useAtriumStore } from './services/store';
import { Member } from './types/index';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AnalyticsScreen } from './components/screens/AnalyticsScreen';
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
import { MembershipDashboardView } from './components/screens/membership/MembershipDashboardView';
import { MembershipMembersView } from './components/screens/membership/MembershipMembersView';
import { MembershipRegistrationsView } from './components/screens/membership/MembershipRegistrationsView';
import { MembershipShopView } from './components/screens/membership/MembershipShopView';
import { MembershipSchedulerView } from './components/screens/membership/MembershipSchedulerView';
import { MembershipFinanceView } from './components/screens/membership/MembershipFinanceView';
import { MembershipHistoryView } from './components/screens/membership/MembershipHistoryView';
import { AppointmentDashboardView } from './components/screens/appointment/AppointmentDashboardView';
import { AppointmentClientsView } from './components/screens/appointment/AppointmentClientsView';
import { AppointmentScheduleView } from './components/screens/appointment/AppointmentScheduleView';
import { AppointmentServicesView } from './components/screens/appointment/AppointmentServicesView';
import { AppointmentFinanceView } from './components/screens/appointment/AppointmentFinanceView';
import { AppointmentHistoryView } from './components/screens/appointment/AppointmentHistoryView';
import { PosDashboardView } from './components/screens/pos/PosDashboardView';
import { PosRegisterView } from './components/screens/pos/PosRegisterView';
import { PosInventoryView } from './components/screens/pos/PosInventoryView';
import { PosOrdersView } from './components/screens/pos/PosOrdersView';
import { PosFinanceView } from './components/screens/pos/PosFinanceView';
import { PosHistoryView } from './components/screens/pos/PosHistoryView';
import { TradingDashboardView } from './components/screens/trading/TradingDashboardView';
import { TradingSalesView } from './components/screens/trading/TradingSalesView';
import { TradingPurchasesView } from './components/screens/trading/TradingPurchasesView';
import { TradingInventoryView } from './components/screens/trading/TradingInventoryView';
import { TradingDirectoryView } from './components/screens/trading/TradingDirectoryView';
import { TradingCatalogView } from './components/screens/trading/TradingCatalogView';
import { TradingFinanceView } from './components/screens/trading/TradingFinanceView';
import { MedicalDashboardView } from './components/screens/medical/MedicalDashboardView';
import { MedicalQueueView } from './components/screens/medical/MedicalQueueView';
import { MedicalPatientsView } from './components/screens/medical/MedicalPatientsView';
import { MedicalPrescriptionsView } from './components/screens/medical/MedicalPrescriptionsView';
import { MedicalBillingView } from './components/screens/medical/MedicalBillingView';
import { MedicalCertificatesView } from './components/screens/medical/MedicalCertificatesView';

import { AutoGarageDashboardView } from './components/screens/garage/AutoGarageDashboardView';
import { AutoGarageOrdersView } from './components/screens/garage/AutoGarageOrdersView';
import { AutoGarageVehiclesView } from './components/screens/garage/AutoGarageVehiclesView';
import { AutoGaragePartsView } from './components/screens/garage/AutoGaragePartsView';
import { AutoGarageBillingView } from './components/screens/garage/AutoGarageBillingView';

import { RealEstateDashboardView } from './components/screens/realestate/RealEstateDashboardView';
import { RealEstatePropertiesView } from './components/screens/realestate/RealEstatePropertiesView';
import { RealEstateLeasesView } from './components/screens/realestate/RealEstateLeasesView';
import { RealEstateInspectionsView } from './components/screens/realestate/RealEstateInspectionsView';
import { RealEstateFinanceView } from './components/screens/realestate/RealEstateFinanceView';

import { ManufacturingDashboardView } from './components/screens/manufacturing/ManufacturingDashboardView';
import { ManufacturingOrdersView } from './components/screens/manufacturing/ManufacturingOrdersView';
import { ManufacturingBomView } from './components/screens/manufacturing/ManufacturingBomView';
import { ManufacturingMaterialsView } from './components/screens/manufacturing/ManufacturingMaterialsView';
import { ManufacturingQcView } from './components/screens/manufacturing/ManufacturingQcView';

import { LegalDashboardView } from './components/screens/legal/LegalDashboardView';
import { LegalMattersView } from './components/screens/legal/LegalMattersView';
import { LegalHearingsView } from './components/screens/legal/LegalHearingsView';
import { LegalVaultView } from './components/screens/legal/LegalVaultView';
import { LegalTrustView } from './components/screens/legal/LegalTrustView';

import { LogisticsDashboardView } from './components/screens/logistics/LogisticsDashboardView';
import { LogisticsShipmentsView } from './components/screens/logistics/LogisticsShipmentsView';
import { LogisticsManifestsView } from './components/screens/logistics/LogisticsManifestsView';
import { LogisticsScannerView } from './components/screens/logistics/LogisticsScannerView';
import { LogisticsCodView } from './components/screens/logistics/LogisticsCodView';

import { ContractorDashboardView } from './components/screens/contractor/ContractorDashboardView';
import { ContractorSitesView } from './components/screens/contractor/ContractorSitesView';
import { ContractorBoqView } from './components/screens/contractor/ContractorBoqView';
import { ContractorDailyLogsView } from './components/screens/contractor/ContractorDailyLogsView';
import { ContractorBillingView } from './components/screens/contractor/ContractorBillingView';

import { AgricultureDashboardView } from './components/screens/agriculture/AgricultureDashboardView';
import { AgricultureParcelsView } from './components/screens/agriculture/AgricultureParcelsView';
import { AgricultureCyclesView } from './components/screens/agriculture/AgricultureCyclesView';
import { AgricultureHarvestView } from './components/screens/agriculture/AgricultureHarvestView';
import { AgricultureLivestockView } from './components/screens/agriculture/AgricultureLivestockView';
import { AgricultureWholesaleView } from './components/screens/agriculture/AgricultureWholesaleView';
import { DesktopUpgradeModal } from './components/modals/DesktopUpgradeModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { ToastStack } from './components/ui/ToastStack';

export default function App() {
  const {
    currentBusiness,
    activeScreen,
    theme,
    language,
    isLanguageAuto,
    setSystemDefaultLanguage,
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
          return <AnalyticsScreen />;
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
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }
      switch (activeScreen) {
        case 'dashboard':
          return <RealEstateDashboardView />;
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
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }
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
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      }
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
          return <MembershipFinanceView />;
        case 'history':
          return <MembershipHistoryView />;
        case 'analytics':
          return <AnalyticsScreen />;
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
          return <AnalyticsScreen />;
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
          return <AnalyticsScreen />;
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
        return <AnalyticsScreen />;
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
