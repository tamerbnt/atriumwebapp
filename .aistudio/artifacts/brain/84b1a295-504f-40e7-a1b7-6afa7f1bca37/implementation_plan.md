# Exhaustive Layout Standardization Plan: Single-Elevation Canvas Across All Categories

Removes the redundant nested white card wrapper (`rounded-[28px] border border-[#E9EEF0] p-6 lg:p-8 shadow-xs`) across all remaining screen views that were pending from the previous run. Enforces 100% single-elevation canvas parity with `AnalyticsScreen` ("Business Intelligence & Margins") across all 16 platform categories.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Execution Mode**: Confirmed synchronous execution across all remaining 45 screen views in a single verified pass (avoiding asynchronous background task termination).
> - **Pod Tray Retention**: Inner light-grey grouping surfaces (`bg-[#F8F9FA] rounded-[24px] border border-[#EDF1F3]`) are preserved exactly as seen in Business Intelligence & Margins, maintaining clean data density and hierarchy within the outer white window canvas.
> - **Modal Exemption**: Popup overlay dialogs (`BookingModal`, `VenueCloudSyncModal`, and modal dialog cards with `fixed inset-0`) intentionally retain their floating card container styling.

- **Confirmed Decision 1**: Process all remaining 45 screens synchronously in a single deterministic pass. (COMPLETED)
- **Confirmed Decision 2**: Keep inner pod trays styled identically to Business Intelligence & Margins. (COMPLETED)

---

## Status: 100% Completed Across All 16 Verticals

All 45 remaining screen views (Membership, POS, Project/Agency, Real Estate, Trading, Venue, Manufacturing, and Medical) have been synchronously migrated to the single-elevation canvas architecture. There are now zero screen views with redundant outer card wrappers (`rounded-[28px] border border-[#E9EEF0]`). The single-elevation container in `App.tsx` cleanly hosts every screen directly, matching the exact spatial layout of `AnalyticsScreen` ("Business Intelligence & Margins"). Build, TypeScript typecheck, and 14/14 automated tests fully pass.

---

## 1. Overview & Root Cause Analysis

- **Investigation Finding**: During the initial execution, the background task was interrupted before reaching the remaining categories. As a result, 45 screen views in **Membership** (History, Finance, Scheduler, Shop, Registrations), **POS**, **Project/Agency**, **Real Estate**, **Trading**, **Venue**, **Manufacturing**, and **Medical** still contain the nested `<div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] ...">` wrapper.
- **The Visual Issue**: Because `App.tsx` already wraps active screens in a primary desktop canvas (`rounded-[32px] border border-[#E9EEF0] p-6 sm:p-8`), screens containing this inner card produce a nested white layout with double borders ("line of separation that feels like two layouts") and double padding.
- **Target Golden State**: Every screen view root becomes `<div className="space-y-6 animate-in fade-in duration-200">` (or `<div className="space-y-6 animate-in fade-in duration-200 relative">`), seating controls, filters, and pod trays directly inside the `App.tsx` canvas, exactly like `AnalyticsScreen`.

---

## 2. Architecture & Visual Hierarchy

```
┌─────────────────────────── App.tsx Main Canvas (rounded-[32px], p-6 sm:p-8) ───────────────────────────┐
│                                                                                                         │
│  [Screen Header Row: Title, Branch Switcher, Primary Action Button]                                     │
│                                                                                                         │
│  [KPI Metric Tiles: 4x Cards (p-4 rounded-[20px] bg-white border border-[#E9EEF0])]                     │
│                                                                                                         │
│  ┌─────────────────────── Inner Pod Tray (p-5 rounded-[24px] bg-[#F8F9FA]) ──────────────────────────┐  │
│  │ [Seek SearchLens + Filter Capsules + Action Toolbar]                                              │  │
│  │ [UniversalDataCollection Data Rows / Interactive Grid Cards]                                      │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Targeted Screen Inventory (45 Files)

### Category Breakdown

1. **Membership Vertical (5 screens)**
   - `src/components/screens/membership/MembershipFinanceView.tsx`
   - `src/components/screens/membership/MembershipHistoryView.tsx`
   - `src/components/screens/membership/MembershipRegistrationsView.tsx`
   - `src/components/screens/membership/MembershipSchedulerView.tsx`
   - `src/components/screens/membership/MembershipShopView.tsx`

2. **POS & Retail Vertical (6 screens)**
   - `src/components/screens/pos/PosDashboardView.tsx`
   - `src/components/screens/pos/PosFinanceView.tsx`
   - `src/components/screens/pos/PosHistoryView.tsx`
   - `src/components/screens/pos/PosInventoryView.tsx`
   - `src/components/screens/pos/PosOrdersView.tsx`
   - `src/components/screens/pos/PosRegisterView.tsx`

3. **Project & Agency 6-Role Views (6 screens)**
   - `src/components/screens/project/ProjectChefProjetView.tsx`
   - `src/components/screens/project/ProjectComptaView.tsx`
   - `src/components/screens/project/ProjectCreaView.tsx`
   - `src/components/screens/project/ProjectDirectionView.tsx`
   - `src/components/screens/project/ProjectRhView.tsx`
   - `src/components/screens/project/ProjectSuperviseurView.tsx`

4. **Real Estate Vertical (5 screens)**
   - `src/components/screens/realestate/RealEstateDashboardView.tsx`
   - `src/components/screens/realestate/RealEstateFinanceView.tsx`
   - `src/components/screens/realestate/RealEstateInspectionsView.tsx`
   - `src/components/screens/realestate/RealEstateLeasesView.tsx`
   - `src/components/screens/realestate/RealEstatePropertiesView.tsx`

5. **B2B Trading & Commercial Vertical (7 screens)**
   - `src/components/screens/trading/TradingCatalogView.tsx`
   - `src/components/screens/trading/TradingDashboardView.tsx`
   - `src/components/screens/trading/TradingDirectoryView.tsx`
   - `src/components/screens/trading/TradingFinanceView.tsx`
   - `src/components/screens/trading/TradingInventoryView.tsx`
   - `src/components/screens/trading/TradingPurchasesView.tsx`
   - `src/components/screens/trading/TradingSalesView.tsx`

6. **Venue & Rental Vertical (6 screens)**
   - `src/components/screens/venue/VenueBookingsView.tsx`
   - `src/components/screens/venue/VenueDashboardView.tsx`
   - `src/components/screens/venue/VenueFinanceView.tsx`
   - `src/components/screens/venue/VenueInventoryView.tsx`
   - `src/components/screens/venue/VenueRentersView.tsx`
   - `src/components/screens/venue/VenueTimelineView.tsx`

7. **Manufacturing & Medical Verticals (10 screens)**
   - `src/components/screens/manufacturing/ManufacturingBomView.tsx`
   - `src/components/screens/manufacturing/ManufacturingDashboardView.tsx`
   - `src/components/screens/manufacturing/ManufacturingMaterialsView.tsx`
   - `src/components/screens/manufacturing/ManufacturingOrdersView.tsx`
   - `src/components/screens/manufacturing/ManufacturingQcView.tsx`
   - `src/components/screens/medical/MedicalBillingView.tsx`
   - `src/components/screens/medical/MedicalDashboardView.tsx`
   - `src/components/screens/medical/MedicalPatientsView.tsx`
   - `src/components/screens/medical/MedicalPrescriptionsView.tsx`
   - `src/components/screens/medical/MedicalQueueView.tsx`

---

## 4. Execution & Verification Workflow

1. **Synchronous File Transformation**:
   - Run a synchronous in-process Node script executing directly within the tool turn.
   - Strip all 4 variants of the redundant card wrapper in every affected file.
   - Convert outer containers into single-elevation `<div className="space-y-6 animate-in fade-in duration-200">` (or relative where inspector drawers require positioning).
2. **Deterministic Audit Check**:
   - Verify that zero screens contain `rounded-[28px] border border-[#E9EEF0]` outside of floating modal dialogs.
3. **Compilation & Quality Gate**:
   - Run `compile_applet` to ensure 100% build success.
   - Run `lint_applet` to verify zero TypeScript errors.
   - Run `npm test` to confirm all 14 unit test suites pass.
