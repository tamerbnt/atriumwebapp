// Dedicated Lazy Screen Registry with Category-Level Code Splitting
import React from 'react';

function lazyNamed<P = any>(
  importFn: () => Promise<any>,
  name: string
): React.ComponentType<P> {
  return React.lazy(() =>
    importFn().then((m: any) => {
      const component = m[name] || m.default;
      if (!component) {
        throw new Error(`Failed to resolve component '${name}' from dynamic import.`);
      }
      return { default: component };
    })
  ) as unknown as React.ComponentType<P>;
}

export const SettingsScreen = lazyNamed<any>(() => import('./SettingsScreen'), 'SettingsScreen');
export const FreelanceDashboardView = lazyNamed<any>(() => import('./freelance/FreelanceDashboardView'), 'FreelanceDashboardView');
export const FreelanceClientsView = lazyNamed<any>(() => import('./freelance/FreelanceClientsView'), 'FreelanceClientsView');
export const FreelanceDeliverablesView = lazyNamed<any>(() => import('./freelance/FreelanceDeliverablesView'), 'FreelanceDeliverablesView');
export const FreelanceTimeTrackerView = lazyNamed<any>(() => import('./freelance/FreelanceTimeTrackerView'), 'FreelanceTimeTrackerView');
export const FreelanceInvoicesView = lazyNamed<any>(() => import('./freelance/FreelanceInvoicesView'), 'FreelanceInvoicesView');
export const FreelanceProposalsView = lazyNamed<any>(() => import('./freelance/FreelanceProposalsView'), 'FreelanceProposalsView');
export const FreelanceFinanceView = lazyNamed<any>(() => import('./freelance/FreelanceFinanceView'), 'FreelanceFinanceView');
export const VenueDashboardView = lazyNamed<any>(() => import('./venue/VenueDashboardView'), 'VenueDashboardView');
export const VenueTimelineView = lazyNamed<any>(() => import('./venue/VenueTimelineView'), 'VenueTimelineView');
export const VenueBookingsView = lazyNamed<any>(() => import('./venue/VenueBookingsView'), 'VenueBookingsView');
export const VenueInventoryView = lazyNamed<any>(() => import('./venue/VenueInventoryView'), 'VenueInventoryView');
export const VenueRentersView = lazyNamed<any>(() => import('./venue/VenueRentersView'), 'VenueRentersView');
export const VenueFinanceView = lazyNamed<any>(() => import('./venue/VenueFinanceView'), 'VenueFinanceView');
export const EducationDashboardView = lazyNamed<any>(() => import('./education/EducationDashboardView'), 'EducationDashboardView');
export const EducationTimetableView = lazyNamed<any>(() => import('./education/EducationTimetableView'), 'EducationTimetableView');
export const EducationStudentsView = lazyNamed<any>(() => import('./education/EducationStudentsView'), 'EducationStudentsView');
export const EducationCohortsView = lazyNamed<any>(() => import('./education/EducationCohortsView'), 'EducationCohortsView');
export const EducationAdmissionsView = lazyNamed<any>(() => import('./education/EducationAdmissionsView'), 'EducationAdmissionsView');
export const EducationAttendanceView = lazyNamed<any>(() => import('./education/EducationAttendanceView'), 'EducationAttendanceView');
export const EducationFinanceView = lazyNamed<any>(() => import('./education/EducationFinanceView'), 'EducationFinanceView');
export const ProjectDirectionView = lazyNamed<any>(() => import('./project/ProjectDirectionView'), 'ProjectDirectionView');
export const ProjectChefProjetView = lazyNamed<any>(() => import('./project/ProjectChefProjetView'), 'ProjectChefProjetView');
export const ProjectCreaView = lazyNamed<any>(() => import('./project/ProjectCreaView'), 'ProjectCreaView');
export const ProjectSuperviseurView = lazyNamed<any>(() => import('./project/ProjectSuperviseurView'), 'ProjectSuperviseurView');
export const ProjectRhView = lazyNamed<any>(() => import('./project/ProjectRhView'), 'ProjectRhView');
export const ProjectComptaView = lazyNamed<any>(() => import('./project/ProjectComptaView'), 'ProjectComptaView');
export const MembershipDashboardView = lazyNamed<any>(() => import('./membership/MembershipDashboardView'), 'MembershipDashboardView');
export const MembershipMembersView = lazyNamed<any>(() => import('./membership/MembershipMembersView'), 'MembershipMembersView');
export const MembershipRegistrationsView = lazyNamed<any>(() => import('./membership/MembershipRegistrationsView'), 'MembershipRegistrationsView');
export const MembershipShopView = lazyNamed<any>(() => import('./membership/MembershipShopView'), 'MembershipShopView');
export const MembershipSchedulerView = lazyNamed<any>(() => import('./membership/MembershipSchedulerView'), 'MembershipSchedulerView');
export const MembershipFinanceView = lazyNamed<any>(() => import('./membership/MembershipFinanceView'), 'MembershipFinanceView');
export const MembershipHistoryView = lazyNamed<any>(() => import('./membership/MembershipHistoryView'), 'MembershipHistoryView');
export const AppointmentDashboardView = lazyNamed<any>(() => import('./appointment/AppointmentDashboardView'), 'AppointmentDashboardView');
export const AppointmentClientsView = lazyNamed<any>(() => import('./appointment/AppointmentClientsView'), 'AppointmentClientsView');
export const AppointmentScheduleView = lazyNamed<any>(() => import('./appointment/AppointmentScheduleView'), 'AppointmentScheduleView');
export const AppointmentServicesView = lazyNamed<any>(() => import('./appointment/AppointmentServicesView'), 'AppointmentServicesView');
export const AppointmentFinanceView = lazyNamed<any>(() => import('./appointment/AppointmentFinanceView'), 'AppointmentFinanceView');
export const AppointmentHistoryView = lazyNamed<any>(() => import('./appointment/AppointmentHistoryView'), 'AppointmentHistoryView');
export const GymFrontDeskKiosk = lazyNamed<any>(() => import('./membership/GymFrontDeskKiosk'), 'GymFrontDeskKiosk');
export const SalonQuickChairKiosk = lazyNamed<any>(() => import('./appointment/SalonQuickChairKiosk'), 'SalonQuickChairKiosk');
export const AcademyRollCallKiosk = lazyNamed<any>(() => import('./education/AcademyRollCallKiosk'), 'AcademyRollCallKiosk');
export const PosDashboardView = lazyNamed<any>(() => import('./pos/PosDashboardView'), 'PosDashboardView');
export const PosRegisterView = lazyNamed<any>(() => import('./pos/PosRegisterView'), 'PosRegisterView');
export const PosInventoryView = lazyNamed<any>(() => import('./pos/PosInventoryView'), 'PosInventoryView');
export const PosOrdersView = lazyNamed<any>(() => import('./pos/PosOrdersView'), 'PosOrdersView');
export const PosFinanceView = lazyNamed<any>(() => import('./pos/PosFinanceView'), 'PosFinanceView');
export const PosHistoryView = lazyNamed<any>(() => import('./pos/PosHistoryView'), 'PosHistoryView');
export const TradingDashboardView = lazyNamed<any>(() => import('./trading/TradingDashboardView'), 'TradingDashboardView');
export const TradingSalesView = lazyNamed<any>(() => import('./trading/TradingSalesView'), 'TradingSalesView');
export const TradingPurchasesView = lazyNamed<any>(() => import('./trading/TradingPurchasesView'), 'TradingPurchasesView');
export const TradingInventoryView = lazyNamed<any>(() => import('./trading/TradingInventoryView'), 'TradingInventoryView');
export const TradingDirectoryView = lazyNamed<any>(() => import('./trading/TradingDirectoryView'), 'TradingDirectoryView');
export const TradingCatalogView = lazyNamed<any>(() => import('./trading/TradingCatalogView'), 'TradingCatalogView');
export const TradingFinanceView = lazyNamed<any>(() => import('./trading/TradingFinanceView'), 'TradingFinanceView');
export const MedicalDashboardView = lazyNamed<any>(() => import('./medical/MedicalDashboardView'), 'MedicalDashboardView');
export const MedicalQueueView = lazyNamed<any>(() => import('./medical/MedicalQueueView'), 'MedicalQueueView');
export const MedicalAgendaView = lazyNamed<any>(() => import('./medical/MedicalAgendaView'), 'MedicalAgendaView');
export const MedicalPatientsView = lazyNamed<any>(() => import('./medical/MedicalPatientsView'), 'MedicalPatientsView');
export const MedicalPrescriptionsView = lazyNamed<any>(() => import('./medical/MedicalPrescriptionsView'), 'MedicalPrescriptionsView');
export const MedicalBillingView = lazyNamed<any>(() => import('./medical/MedicalBillingView'), 'MedicalBillingView');
export const MedicalCertificatesView = lazyNamed<any>(() => import('./medical/MedicalCertificatesView'), 'MedicalCertificatesView');
export const AutoGarageDashboardView = lazyNamed<any>(() => import('./garage/AutoGarageDashboardView'), 'AutoGarageDashboardView');
export const AutoGarageOrdersView = lazyNamed<any>(() => import('./garage/AutoGarageOrdersView'), 'AutoGarageOrdersView');
export const AutoGarageVehiclesView = lazyNamed<any>(() => import('./garage/AutoGarageVehiclesView'), 'AutoGarageVehiclesView');
export const AutoGaragePartsView = lazyNamed<any>(() => import('./garage/AutoGaragePartsView'), 'AutoGaragePartsView');
export const AutoGarageBillingView = lazyNamed<any>(() => import('./garage/AutoGarageBillingView'), 'AutoGarageBillingView');
export const RealEstateDashboardView = lazyNamed<any>(() => import('./realestate/RealEstateDashboardView'), 'RealEstateDashboardView');
export const RealEstateMandatesView = lazyNamed<any>(() => import('./realestate/RealEstateMandatesView'), 'RealEstateMandatesView');
export const RealEstatePropertiesView = lazyNamed<any>(() => import('./realestate/RealEstatePropertiesView'), 'RealEstatePropertiesView');
export const RealEstateLeasesView = lazyNamed<any>(() => import('./realestate/RealEstateLeasesView'), 'RealEstateLeasesView');
export const RealEstateInspectionsView = lazyNamed<any>(() => import('./realestate/RealEstateInspectionsView'), 'RealEstateInspectionsView');
export const RealEstateFinanceView = lazyNamed<any>(() => import('./realestate/RealEstateFinanceView'), 'RealEstateFinanceView');
export const ManufacturingDashboardView = lazyNamed<any>(() => import('./manufacturing/ManufacturingDashboardView'), 'ManufacturingDashboardView');
export const ManufacturingOrdersView = lazyNamed<any>(() => import('./manufacturing/ManufacturingOrdersView'), 'ManufacturingOrdersView');
export const ManufacturingBomView = lazyNamed<any>(() => import('./manufacturing/ManufacturingBomView'), 'ManufacturingBomView');
export const ManufacturingMaterialsView = lazyNamed<any>(() => import('./manufacturing/ManufacturingMaterialsView'), 'ManufacturingMaterialsView');
export const ManufacturingQcView = lazyNamed<any>(() => import('./manufacturing/ManufacturingQcView'), 'ManufacturingQcView');
export const ManufacturingWorkstationView = lazyNamed<any>(() => import('./manufacturing/ManufacturingWorkstationView'), 'ManufacturingWorkstationView');
export const LegalDashboardView = lazyNamed<any>(() => import('./legal/LegalDashboardView'), 'LegalDashboardView');
export const LegalMattersView = lazyNamed<any>(() => import('./legal/LegalMattersView'), 'LegalMattersView');
export const LegalHearingsView = lazyNamed<any>(() => import('./legal/LegalHearingsView'), 'LegalHearingsView');
export const LegalVaultView = lazyNamed<any>(() => import('./legal/LegalVaultView'), 'LegalVaultView');
export const LegalTrustView = lazyNamed<any>(() => import('./legal/LegalTrustView'), 'LegalTrustView');
export const LogisticsDashboardView = lazyNamed<any>(() => import('./logistics/LogisticsDashboardView'), 'LogisticsDashboardView');
export const LogisticsShipmentsView = lazyNamed<any>(() => import('./logistics/LogisticsShipmentsView'), 'LogisticsShipmentsView');
export const LogisticsManifestsView = lazyNamed<any>(() => import('./logistics/LogisticsManifestsView'), 'LogisticsManifestsView');
export const LogisticsScannerView = lazyNamed<any>(() => import('./logistics/LogisticsScannerView'), 'LogisticsScannerView');
export const LogisticsCodView = lazyNamed<any>(() => import('./logistics/LogisticsCodView'), 'LogisticsCodView');
export const ContractorDashboardView = lazyNamed<any>(() => import('./contractor/ContractorDashboardView'), 'ContractorDashboardView');
export const ContractorSitesView = lazyNamed<any>(() => import('./contractor/ContractorSitesView'), 'ContractorSitesView');
export const ContractorBoqView = lazyNamed<any>(() => import('./contractor/ContractorBoqView'), 'ContractorBoqView');
export const ContractorDailyLogsView = lazyNamed<any>(() => import('./contractor/ContractorDailyLogsView'), 'ContractorDailyLogsView');
export const ContractorBillingView = lazyNamed<any>(() => import('./contractor/ContractorBillingView'), 'ContractorBillingView');
export const AgricultureDashboardView = lazyNamed<any>(() => import('./agriculture/AgricultureDashboardView'), 'AgricultureDashboardView');
export const AgricultureParcelsView = lazyNamed<any>(() => import('./agriculture/AgricultureParcelsView'), 'AgricultureParcelsView');
export const AgricultureCyclesView = lazyNamed<any>(() => import('./agriculture/AgricultureCyclesView'), 'AgricultureCyclesView');
export const AgricultureHarvestView = lazyNamed<any>(() => import('./agriculture/AgricultureHarvestView'), 'AgricultureHarvestView');
export const AgricultureLivestockView = lazyNamed<any>(() => import('./agriculture/AgricultureLivestockView'), 'AgricultureLivestockView');
export const AgricultureWholesaleView = lazyNamed<any>(() => import('./agriculture/AgricultureWholesaleView'), 'AgricultureWholesaleView');
export const MembershipStaffView = lazyNamed<any>(() => import('./membership/MembershipStaffView'), 'MembershipStaffView');
export const AppointmentStaffView = lazyNamed<any>(() => import('./appointment/AppointmentStaffView'), 'AppointmentStaffView');
export const PosStaffView = lazyNamed<any>(() => import('./pos/PosStaffView'), 'PosStaffView');
export const EducationStaffView = lazyNamed<any>(() => import('./education/EducationStaffView'), 'EducationStaffView');
export const AutoGarageStaffView = lazyNamed<any>(() => import('./garage/AutoGarageStaffView'), 'AutoGarageStaffView');
export const MedicalStaffView = lazyNamed<any>(() => import('./medical/MedicalStaffView'), 'MedicalStaffView');
export const ContractorStaffView = lazyNamed<any>(() => import('./contractor/ContractorStaffView'), 'ContractorStaffView');
export const LogisticsStaffView = lazyNamed<any>(() => import('./logistics/LogisticsStaffView'), 'LogisticsStaffView');
export const ManufacturingStaffView = lazyNamed<any>(() => import('./manufacturing/ManufacturingStaffView'), 'ManufacturingStaffView');
export const AgricultureStaffView = lazyNamed<any>(() => import('./agriculture/AgricultureStaffView'), 'AgricultureStaffView');
export const LegalStaffView = lazyNamed<any>(() => import('./legal/LegalStaffView'), 'LegalStaffView');
export const RealEstateStaffView = lazyNamed<any>(() => import('./realestate/RealEstateStaffView'), 'RealEstateStaffView');
export const TradingStaffView = lazyNamed<any>(() => import('./trading/TradingStaffView'), 'TradingStaffView');
export const VenueStaffView = lazyNamed<any>(() => import('./venue/VenueStaffView'), 'VenueStaffView');
export const FreelanceStaffView = lazyNamed<any>(() => import('./freelance/FreelanceStaffView'), 'FreelanceStaffView');
