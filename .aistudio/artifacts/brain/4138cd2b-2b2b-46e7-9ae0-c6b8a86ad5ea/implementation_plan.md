# Universal Skeleton Loading & Layout Fidelity Plan across All 16 Categories

A comprehensive architectural and implementation plan to overhaul and align skeleton loaders across the entire Atrium ERP & CRM platform, resolving structural layout mismatches on dashboard/home screens and eliminating partial skeleton leakage on list/grid views featuring top 3-card KPI trays.

***

## User Review & Confirmed Decisions

> [!IMPORTANT]
> Based on your confirmed choices in Phase 1, this plan implements:
> 1. **Full-Page Skeletons for List & Grid Screens**: Every collection view will replace the entire page layout—including page header, facility selector, primary action buttons, the elevated 3-card KPI pod tray, and the table/grid—with a synchronous structural skeleton wireframe.
> 2. **Exact Archetype Layout Fidelity for Dashboards**: Rather than using a generic 4-box grid and bar chart, each of the 16 category dashboards receives a dedicated structural skeleton that mirrors its exact live physical layout (e.g. Left Dark Espresso turnstile/timer/occupancy pods, 6-chair salon grids, POS split velocity charts, medical triage queues, and weighbridge desks).
> 3. **Instant Cache-First Navigation (SWR)**: Navigating between tabs with existing cached data renders immediately with zero skeleton flicker; skeletons are reserved for cold starts and developer testing via the **Freeze Skeleton** (`networkMode === 'force_skeleton'`) network simulator.

- **Confirmed Decision 1**: Full-page skeleton replacing header, 3-card KPI tray, and collection table/grid together.
- **Confirmed Decision 2**: Exact archetype layout matching each category's unique pods, workstation grids, and charts.
- **Confirmed Decision 3**: Show cached data instantly and refresh quietly in background.

***

## 1. Executive Summary & Root Cause Analysis

### The Current Deficiencies

1. **Missing 3-Card Skeletons on List/Grid Views**:
   - Across over 40 collection screens (e.g., `AppointmentClientsView`, `RealEstatePropertiesView`, `VenueBookingsView`, `TradingSalesView`, `MedicalPatientsView`, `EducationStudentsView`, `PosInventoryView`, `LogisticsShipmentsView`, `ContractorSitesView`, `AgricultureParcelsView`), the parent view renders live HTML for the page header and the top `#F8F9FA` elevated pod tray containing 3 KPI metric cards.
   - Only the nested `UniversalDataCollection` component toggles its internal table/grid into a skeleton.
   - Consequently, during cold loading or when testing in **Freeze Skeleton** mode, users see a live page header with live buttons and 3 empty/zeroed metric cards (`0 Clientes`, `0.00 DA`, `0 bière`) hovering awkwardly above a shimmering table.

2. **Dashboard Structural Layout Mismatch**:
   - Currently, 15 out of 16 category dashboards (all except Gym Membership) use a generic fallback: `SkeletonKpiGrid(4)` plus a generic `SkeletonChart(280)` and an arbitrary pulsing box.
   - This clashes directly with the authentic desktop layout of each vertical:
     - **Salon Dashboard**: Has a 6-chair salon workstation grid (Fauteuils 1–6) + 3 KPI cards + Tips carousel + Live Prestations Feed.
     - **POS Dashboard**: Has a Left Dark Espresso hero card for daily cash & average ticket + 3 KPI cards + Tips carousel + Hourly velocity histogram + Recent sales ledger.
     - **Education Dashboard**: Has a Left Dark Espresso Attendance/Roll Call pod + 3 KPI cards + Tips carousel + Hourly attendance histogram + Admissions & finance feed.
     - **Medical Dashboard**: Has a Doctor agenda slot matrix + Queue triage radar + 3 Clinical KPI cards + Waiting Room summary.
     - **Garage Dashboard**: Has an active repair bay matrix + 3 Garage KPI cards + OR in-progress feed.
     - **Real Estate Dashboard**: Has a Cadastre & Mandate radar + 3 Property KPI cards + Lease arrears ledger.
     - **Manufacturing Dashboard**: Has Machine OEE touch tiles + 3 Production KPI cards + OF production queue.
     - **Legal & Notary Dashboard**: Has CPCA legal deadline countdown + 3 Legal KPI cards + Hearing docket.
     - **Logistics Dashboard**: Has Transit parcels radar + 3 Delivery KPI cards + Manifest ledger.
     - **Contractor / BTP Dashboard**: Has Chantier physical progress + 3 BTP KPI cards + Décomptes provisoires.
     - **Agriculture Dashboard**: Has Parcel irrigation & DAR radar + 3 Farm KPI cards + Milk/weighbridge log.
     - **Freelance Dashboard**: Has Pomodoro timer pod + 3 Solo KPI cards + Deliverables summary.
     - **Venue Dashboard**: Has Space occupancy pod + 3 Rental KPI cards + Gantt timeline preview.
     - **Trading Dashboard**: Has B2B 4-hub grid + 3 Commercial KPI cards + Sales/Purchases ledger.
     - **Project Direction Dashboard**: Has 6-role agency radar + 3 Project KPI cards + Approval gates.
     - **Analytics Screen**: Has 4 BI metric pods + Multi-series margin/revenue chart + Category breakdown.

***

## 2. Technical Architecture & Component Specifications

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Atrium ERP Viewport Canvas                                │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Network & Cache State (store.ts)                         │  │
│  │    • networkMode: 'online' | 'slow_3g' | 'offline' | 'force_skeleton'                 │  │
│  │    • isSyncing: boolean                                                               │  │
│  │    • cachedEntities: Member[] | Appointment[] | Sale[] | Order[] | Parcel[]           │  │
│  └──────────────────────────────────────────┬────────────────────────────────────────────┘  │
│                                             │                                               │
│                                             ▼                                               │
│                         ┌───────────────────────────────────────┐                           │
│                         │          useSkeletonLoading           │                           │
│                         │  • 180ms delay threshold (no flicker) │                           │
│                         │  • hasCachedData check (instant SWR)  │                           │
│                         │  • force_skeleton dev override        │                           │
│                         └───────────────────┬───────────────────┘                           │
│                                             │                                               │
│                      ┌──────────────────────┴──────────────────────┐                        │
│                      ▼                                             ▼                        │
│       ┌──────────────────────────────┐              ┌──────────────────────────────┐        │
│       │   Category Dashboard Screen  │              │    List & Grid Screen        │        │
│       │   (e.g. PosDashboardView)    │              │   (e.g. AppointmentClients)  │        │
│       └──────────────┬───────────────┘              └──────────────┬───────────────┘        │
│                      │                                             │                        │
│                      ▼                                             ▼                        │
│       ┌──────────────────────────────┐              ┌──────────────────────────────┐        │
│       │   Dedicated Archetype        │              │   SkeletonCollectionScreen   │        │
│       │   Dashboard Skeleton         │              │   • SkeletonPageHeader       │        │
│       │   • SkeletonDashboardPos     │              │   • 3-Card Elevated Pod Tray │        │
│       │   • SkeletonDashboardSalon   │              │   • SkeletonTable / CardGrid │        │
│       │   • SkeletonDashboardEdu     │              └──────────────────────────────┘        │
│       │   • (All 16 Verticals)       │                                                      │
│       └──────────────────────────────┘                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Contracts in `src/components/ui/skeleton/StructuralSkeletons.tsx`

#### 1. Universal Collection Skeleton with Top 3-Card Tray
```typescript
export interface SkeletonCollectionScreenProps {
  kpiCount?: number;             // Default 3 cards matching #F8F9FA pod tray
  kpiLayout?: string;            // 'grid-cols-1 md:grid-cols-3'
  columns?: SkeletonColumnDef[]; // Column dimensions and flex widths
  viewMode?: 'list' | 'grid';    // Matches current viewMode
  hasFacility?: boolean;         // Shows branch switcher skeleton
  hasActionBtn?: boolean;        // Shows terracotta CTA button
  actionBtnWidth?: number;       // Custom width
  isOffline?: boolean;
  isTimedOut?: boolean;
  onRetry?: () => Promise<void> | void;
}
```

#### 2. Dedicated Dashboard Skeletons (16 Vertical Archetypes)
1. `SkeletonDashboardGym`: Turnstile Espresso Pod + 3 KPI cards + Tips Carousel + Live Passage Feed.
2. `SkeletonDashboardSalon`: 6-chair workstation grid / Left Hero Pod + 3 KPI cards + Tips Carousel + Live Prestations Feed.
3. `SkeletonDashboardPos`: Left Dark Espresso CA/Ticket Pod + 3 KPI cards + Tips Carousel + Hourly Velocity Histogram + Recent Sales Ledger.
4. `SkeletonDashboardEducation`: Left Dark Espresso Attendance/Roll Call Pod + 3 KPI cards + Tips Carousel + Hourly Attendance Histogram + Admissions & Finance Feed.
5. `SkeletonDashboardTrading`: 4 B2B Trade Hub Cards + 3 KPI pods + Commercial Orders Ledger + Stock Alerts.
6. `SkeletonDashboardMedical`: Queue & Triage Radar + 3 Clinical KPI pods + Doctor Agenda Slot Matrix + Waiting Room TV Summary.
7. `SkeletonDashboardGarage`: Bay Repair Matrix + 3 Garage KPI pods + Active OR List + Predictive Mileage Log.
8. `SkeletonDashboardRealEstate`: Cadastre & Mandate Radar + 3 Property KPI pods + Active Leases & Arrears Ledger.
9. `SkeletonDashboardManufacturing`: Machine OEE Workstation Grid + 3 Production KPI pods + OF Queue.
10. `SkeletonDashboardLegal`: CPCA Urgent Deadline Radar + 3 Legal KPI pods + Hearing Docket Ledger.
11. `SkeletonDashboardLogistics`: Transit Parcel Radar + 3 Delivery KPI pods + Manifest Ledger.
12. `SkeletonDashboardContractor`: Chantier Physical Progress Pod + 3 BTP KPI pods + Décomptes Provisoires.
13. `SkeletonDashboardAgriculture`: Parcel Irrigation & DAR Radar + 3 Farm KPI pods + Milk Tank / Weighbridge Log.
14. `SkeletonDashboardFreelance`: Pomodoro Timer Pod + 3 Solo KPI pods + Time Tracking Chart + Deliverables Matrix.
15. `SkeletonDashboardVenue`: Space Occupancy Pod + 3 Rental KPI pods + Gantt Timeline Preview + Bookings Ledger.
16. `SkeletonDashboardProject`: 6-Role Agency Radar + 3 Project KPI pods + Approval Gate Summary.
17. `SkeletonAnalytics`: 4 BI KPI pods + Multi-series Margin/Revenue Chart + Category Breakdown.

***

## 3. Screen-by-Screen Implementation Scope

### Group A: All 16 Category Dashboard Screens
Upgrade each dashboard view to return its layout-matched dedicated skeleton:
1. `MembershipDashboardView.tsx` → `SkeletonDashboardGym`
2. `AppointmentDashboardView.tsx` → `SkeletonDashboardSalon`
3. `PosDashboardView.tsx` → `SkeletonDashboardPos`
4. `EducationDashboardView.tsx` → `SkeletonDashboardEducation`
5. `TradingDashboardView.tsx` → `SkeletonDashboardTrading`
6. `MedicalDashboardView.tsx` → `SkeletonDashboardMedical`
7. `AutoGarageDashboardView.tsx` → `SkeletonDashboardGarage`
8. `RealEstateDashboardView.tsx` → `SkeletonDashboardRealEstate`
9. `ManufacturingDashboardView.tsx` → `SkeletonDashboardManufacturing`
10. `LegalDashboardView.tsx` → `SkeletonDashboardLegal`
11. `LogisticsDashboardView.tsx` → `SkeletonDashboardLogistics`
12. `ContractorDashboardView.tsx` → `SkeletonDashboardContractor`
13. `AgricultureDashboardView.tsx` → `SkeletonDashboardAgriculture`
14. `FreelanceDashboardView.tsx` → `SkeletonDashboardFreelance`
15. `VenueDashboardView.tsx` → `SkeletonDashboardVenue`
16. `ProjectDirectionView.tsx` → `SkeletonDashboardProject`
17. `AnalyticsScreen.tsx` → `SkeletonAnalytics`

### Group B: All List/Grid Collection Screens (with Top 3 Cards)
Add full-page skeleton handling with `SkeletonCollectionScreen` (with `kpiCount={3}`) to replace the entire outer layout during cold loading and freeze skeleton mode:
1. **Salon**: `AppointmentClientsView.tsx`, `AppointmentServicesView.tsx`, `AppointmentHistoryView.tsx`
2. **Membership**: `MembershipMembersView.tsx`, `MembershipRegistrationsView.tsx`, `MembershipHistoryView.tsx`
3. **POS**: `PosInventoryView.tsx`, `PosOrdersView.tsx`, `PosHistoryView.tsx`
4. **Education**: `EducationStudentsView.tsx`, `EducationCohortsView.tsx`, `EducationAttendanceView.tsx`
5. **Freelance**: `FreelanceClientsView.tsx`, `FreelanceInvoicesView.tsx`, `FreelanceProposalsView.tsx`
6. **Venue**: `VenueBookingsView.tsx`, `VenueRentersView.tsx`, `VenueInventoryView.tsx`
7. **Trading**: `TradingSalesView.tsx`, `TradingPurchasesView.tsx`, `TradingInventoryView.tsx`, `TradingDirectoryView.tsx`
8. **Medical**: `MedicalPatientsView.tsx`, `MedicalPrescriptionsView.tsx`, `MedicalCertificatesView.tsx`
9. **Auto Garage**: `AutoGarageOrdersView.tsx`, `AutoGarageVehiclesView.tsx`, `AutoGaragePartsView.tsx`
10. **Real Estate**: `RealEstatePropertiesView.tsx`, `RealEstateMandatesView.tsx`, `RealEstateLeasesView.tsx`, `RealEstateInspectionsView.tsx`
11. **Manufacturing**: `ManufacturingOrdersView.tsx`, `ManufacturingBomView.tsx`, `ManufacturingMaterialsView.tsx`
12. **Legal**: `LegalMattersView.tsx`, `LegalHearingsView.tsx`
13. **Logistics**: `LogisticsShipmentsView.tsx`, `LogisticsManifestsView.tsx`
14. **Contractor / BTP**: `ContractorSitesView.tsx`, `ContractorBoqView.tsx`, `ContractorDailyLogsView.tsx`
15. **Agriculture**: `AgricultureParcelsView.tsx`, `AgricultureCyclesView.tsx`, `AgricultureLivestockView.tsx`, `AgricultureHarvestView.tsx`

***

## 4. Execution Slices & Verification Plan

### Slice 1: Structural Skeleton Primitives Expansion (`StructuralSkeletons.tsx`)
- Implement `SkeletonDashboardSalon`, `SkeletonDashboardPos`, `SkeletonDashboardEducation`, `SkeletonDashboardTrading`, `SkeletonDashboardMedical`, `SkeletonDashboardGarage`, `SkeletonDashboardRealEstate`, `SkeletonDashboardManufacturing`, `SkeletonDashboardLegal`, `SkeletonDashboardLogistics`, `SkeletonDashboardContractor`, `SkeletonDashboardAgriculture`, `SkeletonDashboardFreelance`, `SkeletonDashboardVenue`, `SkeletonDashboardProject`, and `SkeletonAnalytics`.
- Refine `SkeletonCollectionScreen` to accurately accept custom 3-card titles and column configurations.

### Slice 2: Dashboard Screens Integration
- Update all 16 category dashboards to import and return their matching archetype skeleton when `showSkeleton && (data.length === 0 || networkMode === 'force_skeleton')`.

### Slice 3: List & Grid Collection Screens Integration
- Update the list/grid screens across all 16 verticals to wrap the entire view (header, 3-card KPI tray, and collection table/grid) in `SkeletonCollectionScreen`.

### Slice 4: Verification & Automated Testing
- Verify that toggling **Freeze Skeleton** in the TopBar displays the exact, pixel-perfect wireframe across every single screen.
- Verify that standard navigation between screens with cached data remains instant with zero flash.
- Run `npm test` across all 65 test suites to verify zero regressions.
- Run `npm run lint` and `compile_applet` for full TypeScript and bundle integrity.
