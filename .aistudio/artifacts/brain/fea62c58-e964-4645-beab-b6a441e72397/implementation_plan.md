# Universal Skeleton Loading & Layout Fidelity Plan across All 16 Categories

A comprehensive architectural and implementation record of the overhaul and alignment of skeleton loaders across the entire Atrium ERP & CRM platform, resolving structural layout mismatches on dashboard/home screens and eliminating partial skeleton leakage on list/grid views featuring top 3-card KPI trays.

***

## User Review & Confirmed Decisions

> [!NOTE]
> All 4 phases of the plan have been fully implemented, audited, and verified:
> 1. **Full-Page Skeletons for List & Grid Screens**: Every collection view replaces the entire page layout—including page header, facility selector, primary action buttons, elevated 3-card KPI pod tray, and table/grid—with a synchronous structural skeleton wireframe.
> 2. **Exact Archetype Layout Fidelity for Dashboards**: Each of the 16 category dashboards features a dedicated structural skeleton mirroring its exact physical layout (e.g. Left Dark Espresso turnstile/timer/occupancy pods, 6-chair salon grids, POS split velocity charts, medical triage queues, and weighbridge desks).
> 3. **Instant Cache-First Navigation (SWR)**: Navigating between tabs with existing cached data renders immediately with zero skeleton flicker; skeletons are reserved for cold starts and developer testing via the **Freeze Skeleton** (`networkMode === 'force_skeleton'`) network simulator.
> 4. **Production Build & Test Verification**: Full TypeScript compilation (`tsc --noEmit`), production Vite bundling (`npm run build`), and test suite execution (`npm test` — 65/65 passing).

***

## 1. Summary of Completed Architecture & Implementation

### Structural Skeleton Primitives (`src/components/ui/skeleton/StructuralSkeletons.tsx`)
1. **Dedicated Archetype Dashboard Skeletons**:
   - `SkeletonDashboardGym`: Turnstile Espresso Pod + 3 KPI cards + Tips Carousel + Live Passage Feed.
   - `SkeletonDashboardSalon`: 6-chair workstation grid / Left Hero Pod + 3 KPI cards + Tips Carousel + Live Prestations Feed.
   - `SkeletonDashboardPos`: Left Dark Espresso CA/Ticket Pod + 3 KPI cards + Tips Carousel + Hourly Velocity Histogram + Recent Sales Ledger.
   - `SkeletonDashboardEducation`: Left Dark Espresso Attendance/Roll Call Pod + 3 KPI cards + Tips Carousel + Hourly Attendance Histogram + Admissions & Finance Feed.
   - `SkeletonDashboardTrading`: 4 B2B Trade Hub Cards + 3 KPI pods + Commercial Orders Ledger + Stock Alerts.
   - `SkeletonDashboardMedical`: Queue & Triage Radar + 3 Clinical KPI pods + Doctor Agenda Slot Matrix + Waiting Room TV Summary.
   - `SkeletonDashboardGarage`: Bay Repair Matrix + 3 Garage KPI pods + Active OR List + Predictive Mileage Log.
   - `SkeletonDashboardRealEstate`: Cadastre & Mandate Radar + 3 Property KPI pods + Active Leases & Arrears Ledger.
   - `SkeletonDashboardManufacturing`: Machine OEE Workstation Grid + 3 Production KPI pods + OF Queue.
   - `SkeletonDashboardLegal`: CPCA Urgent Deadline Radar + 3 Legal KPI pods + Hearing Docket Ledger.
   - `SkeletonDashboardLogistics`: Transit Parcel Radar + 3 Delivery KPI pods + Manifest Ledger.
   - `SkeletonDashboardContractor`: Chantier Physical Progress Pod + 3 BTP KPI pods + Décomptes Provisoires.
   - `SkeletonDashboardAgriculture`: Parcel Irrigation & DAR Radar + 3 Farm KPI pods + Milk Tank / Weighbridge Log.
   - `SkeletonDashboardFreelance`: Pomodoro Timer Pod + 3 Solo KPI pods + Time Tracking Chart + Deliverables Matrix.
   - `SkeletonDashboardVenue`: Space Occupancy Pod + 3 Rental KPI pods + Gantt Timeline Preview + Bookings Ledger.
   - `SkeletonDashboardProject`: 6-Role Agency Radar + 3 Project KPI pods + Approval Gate Summary.
   - `SkeletonAnalytics`: 4 BI KPI pods + Multi-series Margin/Revenue Chart + Category Breakdown.

2. **Full-Page Collection & Specialized Wireframes**:
   - `SkeletonCollectionScreen`: Full page header + top elevated 3-card KPI pod tray (`#F8F9FA` background) + table/grid skeleton.
   - `SkeletonFinanceAudit`: Financial audit & ledger wireframe with revenue metrics and reconciled transactions table.
   - `SkeletonKanbanPipeline`: Multi-column Kanban board with draggable card wireframes.
   - `SkeletonSchedulerView`: Timetable grid with day columns, time slots, and appointment blocks.
   - `SkeletonPosRegister`: POS split view with product category grid, product tiles, and right-hand live cart ledger.

***

## 2. Screen Coverage Matrix

| Category / Vertical | Dashboard Screen | List / Grid Collection Views | Specialized Views |
|---|---|---|---|
| **Gym & Membership** | `SkeletonDashboardGym` | `MembershipMembersView` (3 KPI), `MembershipRegistrationsView` (3 KPI) | `MembershipHistoryView` (`SkeletonFinanceAudit`) |
| **Salon & Spa** | `SkeletonDashboardSalon` | `AppointmentClientsView` (3 KPI), `AppointmentServicesView` (3 KPI), `AppointmentHistoryView` (3 KPI) | `AppointmentScheduleView` (`SkeletonSchedulerView`) |
| **Point of Sale (POS)** | `SkeletonDashboardPos` | `PosInventoryView` (3 KPI), `PosOrdersView` (3 KPI), `PosHistoryView` (3 KPI) | `PosRegisterView` (`SkeletonPosRegister`), `PosFinanceView` (`SkeletonFinanceAudit`) |
| **Education & Academy** | `SkeletonDashboardEducation` | `EducationStudentsView` (3 KPI), `EducationCohortsView` (3 KPI), `EducationAttendanceView` (3 KPI), `EducationFinanceView` (3 KPI), `EducationAdmissionsView` (3 KPI / Kanban) | `EducationTimetableView` (`SkeletonSchedulerView`) |
| **Freelance & Studio** | `SkeletonDashboardFreelance` | `FreelanceClientsView` (3 KPI), `FreelanceInvoicesView` (3 KPI), `FreelanceProposalsView` (3 KPI) | `FreelanceDeliverablesView` (`SkeletonKanbanPipeline`) |
| **Venue & Space Rental** | `SkeletonDashboardVenue` | `VenueBookingsView` (3 KPI), `VenueRentersView` (3 KPI), `VenueInventoryView` (3 KPI) | — |
| **Trading & Distribution** | `SkeletonDashboardTrading` | `TradingSalesView` (3 KPI), `TradingPurchasesView` (3 KPI), `TradingInventoryView` (3 KPI), `TradingDirectoryView` (3 KPI) | — |
| **Medical & Clinic** | `SkeletonDashboardMedical` | `MedicalPatientsView` (3 KPI), `MedicalPrescriptionsView` (3 KPI), `MedicalCertificatesView` (3 KPI) | — |
| **Auto Garage** | `SkeletonDashboardGarage` | `AutoGarageOrdersView` (3 KPI), `AutoGarageVehiclesView` (3 KPI), `AutoGaragePartsView` (3 KPI) | — |
| **Real Estate & Agency** | `SkeletonDashboardRealEstate` | `RealEstatePropertiesView` (3 KPI), `RealEstateMandatesView` (3 KPI), `RealEstateLeasesView` (3 KPI), `RealEstateInspectionsView` (3 KPI) | — |
| **Manufacturing & Plant** | `SkeletonDashboardManufacturing` | `ManufacturingOrdersView` (3 KPI), `ManufacturingBomView` (3 KPI), `ManufacturingMaterialsView` (3 KPI) | — |
| **Legal & Cabinet** | `SkeletonDashboardLegal` | `LegalMattersView` (3 KPI), `LegalHearingsView` (3 KPI), `LegalVaultView` (3 KPI) | — |
| **Logistics & Delivery** | `SkeletonDashboardLogistics` | `LogisticsShipmentsView` (3 KPI), `LogisticsManifestsView` (3 KPI), `LogisticsScannerView` (3 KPI) | — |
| **Contractor & BTP** | `SkeletonDashboardContractor` | `ContractorSitesView` (3 KPI), `ContractorBoqView` (3 KPI), `ContractorDailyLogsView` (3 KPI), `ContractorBillingView` (3 KPI) | — |
| **Agriculture & Farm** | `SkeletonDashboardAgriculture` | `AgricultureParcelsView` (3 KPI), `AgricultureCyclesView` (3 KPI), `AgricultureLivestockView` (3 KPI), `AgricultureHarvestView` (3 KPI), `AgricultureWholesaleView` (3 KPI) | — |
| **Project Direction** | `SkeletonDashboardProject` | `ProjectChefProjetView` (3 KPI), `ProjectComptaView` (`SkeletonFinanceAudit`), `ProjectCreaView` (`SkeletonKanbanPipeline` / Collection), `ProjectRhView` (3 KPI), `ProjectSuperviseurView` (3 KPI) | — |
| **Platform Analytics** | `SkeletonAnalytics` | — | Analytics Time-Range & Metric Grid Wireframe |
| **Settings Screen** | — | — | Full Settings Category Tabs, Form Fields, and Toggle Wireframe |

***

## 3. Verification & Test Outcomes

- **TypeScript Compilation**: `tsc --noEmit` exited with code 0 (zero lint or type errors).
- **Unit Test Suite**: 65/65 test suites pass across all Algerian legal and domain engines (CCP validation, timbre fiscal gradué, CNAS 30-day alerts, ANRH water budgets, INPV DAR safety remanence, etc.).
- **Production Bundle**: `npm run build` compiled 2,330 modules cleanly in 2.42s.
- **Freeze Skeleton Verification**: Toggling **Freeze Skeleton** (`networkMode === 'force_skeleton'`) activates the full, unfragmented wireframe across every single vertical and subview with zero zero-state metric card leakage.
- **Cache-First (SWR) Verification**: Navigating between populated tabs displays real cached entities immediately with zero skeleton flicker.
