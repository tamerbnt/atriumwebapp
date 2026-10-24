# Master Design Plan: Unified Navigation, Kinetic Form Controls, Terracotta Medical Button & Universal Expanding Seek Search

Deconstructs all 8 newly introduced expansion categories to eliminate redundant in-page tab strips in favor of single-source sidebar navigation, establishes a universal, app-wide glowing terracotta `AtriumButton` modeled directly on the medical category primary button, deploys the kinetic expanding `Seek` search bar across every vertical and data view, and standardizes all modal and intake forms on `LabelInput` and `LabelSelect`.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following refined decisions incorporate all feedback and define the application-wide standard:

- **Confirmed Decision 1 (Medical-Style Terracotta Button App-Wide)**: Adopt the exact tactile shape, padding, and layout of the Medical Category primary button (`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all`), changed strictly to our brand terracotta color (`#C4785A`, hover `#b06749`, white text) with ambient terracotta glow (`shadow-[0_2px_8px_rgba(196,120,90,0.28)] hover:shadow-[0_4px_16px_rgba(196,120,90,0.40)]` and `active:scale-[0.98]`). Package this into `AtriumButton.tsx` and deploy it across the **entire application** (replacing legacy pill `rounded-full` buttons across both new and old categories).
- **Confirmed Decision 2 (Universal Expanding Seek Search Bar App-Wide)**: Deploy the kinetic expanding `Seek` component—which starts as a compact circular search lens button and smoothly expands into an input field upon click—across the **entire application**, replacing all static input boxes and raw `<div className="relative"><Search />...</div>` elements in data tables, directories, and list filters.
- **Confirmed Decision 3 (Navigation Architecture & Tab Strips Removal)**: Completely eradicate in-screen tab navigation strips across all 8 expansion categories. Deconstruct each monolithic view into focused, dedicated sub-screen components (`...DashboardView`, `...DirectoryView`, `...OperationsView`, etc.) mapped 1:1 to the left dock navigation in `Sidebar.tsx` and routed directly via `App.tsx`.
- **Confirmed Decision 4 (Form Input & Dropdown Modernization)**: Replace all native `<input>` and `<select>` elements in modal intake dialogs and filter toolbars with Atrium's kinetic notched components: `LabelInput` (floating notched border labels), `LabelSelect` (searchable notched dropdowns), and `FilterSelect` (compact filtering).

---

## 1. Overview & Core Concept

### What It Delivers
Atrium ERP & CRM serves 16 business verticals. To provide a cohesive, desktop-grade operating environment, this plan implements three structural design pillars across the whole application:

1. **Zero Double Navigation**: Removes the redundant in-content tab strip from the 8 expansion categories (Medical, Auto Garage, Real Estate, Light Manufacturing, Legal Cabinet, Logistics Dispatch, Construction Contractor, Agriculture), breaking them down into dedicated single-responsibility screens driven purely by the sidebar dock.
2. **App-Wide Button System (`AtriumButton`)**: Encapsulates the squircle geometry, icon alignment, and tactile feedback loved in the Medical Category primary button, rendered in Atrium's signature terracotta (`#C4785A`) with ambient glow, replacing inconsistent pill-shaped buttons everywhere.
3. **App-Wide Expanding Search (`Seek`)**: Propagates the expanding search lens component (`src/components/ui/Seek.tsx`) across all data tables, member rosters, order lists, and inventories in both new and existing categories, creating a uniform, fluid search interaction model.
4. **Kinetic Form System**: Replaces browser-default inputs and dropdowns in modals with `LabelInput` and `LabelSelect`.

### Target Experience
A unified desktop workspace where every primary action feels identical in weight and feedback, search controls behave consistently with kinetic elegance, and navigation requires exactly one click from the global sidebar dock.

---

## 2. User Experience & Visual Design

### 1. Navigation Flow (Single Source of Truth)
- **Left Dock (`Sidebar.tsx`)**: The exclusive primary navigation controller. Clicking an item updates `activeScreen` in `useAtriumStore()`.
- **Stage Container (`App.tsx`)**: Instantly transitions to the targeted dedicated view without any nested in-content tab bar.
- **Header Breadcrumbs (`TopBar.tsx`)**: Displays `[Vertical Name] / [Screen Title]`.

### 2. The Medical-Style Terracotta Button System (`AtriumButton`)
Modeled directly after the medical intake primary action, styled with Atrium's terracotta palette:
- **Base Geometry**: Modern squircle with `rounded-xl` (12px–14px radius).
- **Padding & Typography**: `px-3.5 py-2 text-xs font-semibold tracking-normal` with `gap-1.5` between icon and label.
- **Colors & Surface**:
  - `primary`: Background `#C4785A`, hover `#b06749`, text `#FFFFFF`.
  - Ambient Glow: `shadow-[0_2px_8px_rgba(196,120,90,0.28)]` at rest, elevating to `shadow-[0_4px_16px_rgba(196,120,90,0.40)]` on hover.
  - Tactile Compression: `active:scale-[0.98]` with a 150ms cubic easing.
  - `secondary`: Neutral surface `bg-neutral-100 dark:bg-neutral-800` with subtle border `border-neutral-200 dark:border-neutral-700`, text `text-neutral-800 dark:text-neutral-200`.
  - `outline`: Border `border-[#C4785A]` with terracotta text and subtle hover fill.
  - `danger`: `bg-rose-600 hover:bg-rose-700 text-white shadow-[0_2px_8px_rgba(225,29,72,0.25)]`.

### 3. The Universal Kinetic Expanding Search (`Seek`)
- **Idle State**: Compact circular action node (`shutSize: 38px` or `40px`) with an SVG search lens, perfectly aligned with table action toolbars.
- **Active / Expanded State**: Clicking the lens smoothly expands the container horizontally to `openWidth: 260px` (or full width in tight toolbars), slides the input field into view, automatically focuses the cursor, and reveals a clear (`X`) button when text is entered.
- **Interactive Nuance**: Click-outside auto-collapses if the field is empty; pressing `Escape` clears or collapses the field; typing triggers subtle busy micro-feedback.

### 4. Form Modals (`LabelInput` & `LabelSelect`)
- Notched border styling with floating labels that sit cleanly in the cutout border line.
- Terracotta outline highlight on focus (`focus-within:border-[#C4785A]`).
- Auto-search on select dropdowns with 6+ options, full keyboard navigation, and zero browser-native select rendering.

---

## 3. Technical Architecture & System Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ATRIUM ERP & CRM ENGINE                         │
│                                                                        │
│   ┌─────────────────────┐            ┌─────────────────────────────┐   │
│   │     Sidebar.tsx     │            │         TopBar.tsx          │   │
│   │   (Left Dock Nav)   │            │   (Breadcrumb + FastSwitch) │   │
│   └──────────┬──────────┘            └──────────────┬──────────────┘   │
│              │                                      │                  │
│              └─────────────────┬────────────────────┘                  │
│                                │ activeScreen                          │
│                                ▼                                       │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                           App.tsx                              │   │
│   │         (Central Router — Dedicated Screen Dispatcher)         │   │
│   └──────┬───────────────┬───────────────┬──────────────────┬──────┘   │
│          │               │               │                  │          │
│          ▼               ▼               ▼                  ▼          │
│     [Medical]       [Auto Garage]   [Real Estate]     [All Other]      │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    ┌─────────────┐   │
│   │DashboardView│ │DashboardView│ │DashboardView│    │Gym / Salon  │   │
│   │QueueView    │ │OrdersView   │ │PropertiesView│   │Venue / Edu  │   │
│   │PatientsView │ │VehiclesView │ │LeasesView   │    │POS / Solo   │   │
│   │RxView       │ │PartsView    │ │InspectView  │    │Trading / PM │   │
│   │BillingView  │ │BillingView  │ │FinanceView  │    │(Old & New)  │   │
│   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘    └──────┬──────┘   │
│          │               │               │                  │          │
│          └───────────────┼───────────────┴──────────────────┘          │
│                          ▼                                             │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                UNIVERSAL ATRIUM KINETIC UI SYSTEM              │   │
│   │                                                                │   │
│   │  • AtriumButton.tsx  ─ Medical squircle, Terracotta glow       │   │
│   │  • Seek.tsx          ─ Expanding kinetic search lens           │   │
│   │  • LabelInput.tsx    ─ Notched floating label text boxes       │   │
│   │  • LabelSelect.tsx   ─ Notched searchable select dropdowns     │   │
│   │  • FilterSelect.tsx  ─ Compact filter chips                    │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps & Rollout Strategy

### Step 1: Create `src/components/ui/AtriumButton.tsx`
Create the dedicated, universal button component embodying the exact Medical Category primary button anatomy in terracotta:
```tsx
export interface AtriumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}
```
- Primary variant defaults to:
  `bg-[#C4785A] hover:bg-[#b06749] text-white rounded-xl text-xs font-semibold shadow-[0_2px_8px_rgba(196,120,90,0.28)] hover:shadow-[0_4px_16px_rgba(196,120,90,0.40)] active:scale-[0.98] transition-all cursor-pointer`
- Export both `AtriumButton` and `Button` aliases for seamless integration.

### Step 2: Deconstruct the 8 Expansion Categories (Eliminating Double Navigation)
For each category, extract the monolithic file into dedicated sub-screens and remove the local `<div className="tabs">` bar:

1. **Medical Clinic (`src/components/screens/medical/`)**:
   - `MedicalDashboardView.tsx`
   - `MedicalQueueView.tsx`
   - `MedicalPatientsView.tsx` (equipped with `Seek` and `AtriumButton`)
   - `MedicalPrescriptionsView.tsx`
   - `MedicalBillingView.tsx`
   - Modals: `MedicalPatientModal.tsx`, `MedicalConsultationModal.tsx` (using `LabelInput` & `LabelSelect`)

2. **Auto Garage (`src/components/screens/garage/`)**:
   - `AutoGarageDashboardView.tsx`, `AutoGarageOrdersView.tsx`, `AutoGarageVehiclesView.tsx`, `AutoGaragePartsView.tsx`, `AutoGarageBillingView.tsx`

3. **Real Estate (`src/components/screens/realestate/`)**:
   - `RealEstateDashboardView.tsx`, `RealEstatePropertiesView.tsx`, `RealEstateLeasesView.tsx`, `RealEstateInspectionsView.tsx`, `RealEstateFinanceView.tsx`

4. **Light Manufacturing (`src/components/screens/manufacturing/`)**:
   - `ManufacturingDashboardView.tsx`, `ManufacturingOrdersView.tsx`, `ManufacturingBomView.tsx`, `ManufacturingMaterialsView.tsx`, `ManufacturingQcView.tsx`

5. **Legal Cabinet (`src/components/screens/legal/`)**:
   - `LegalDashboardView.tsx`, `LegalMattersView.tsx`, `LegalHearingsView.tsx`, `LegalVaultView.tsx`, `LegalTrustView.tsx`

6. **Logistics Dispatch (`src/components/screens/logistics/`)**:
   - `LogisticsDashboardView.tsx`, `LogisticsShipmentsView.tsx`, `LogisticsManifestsView.tsx`, `LogisticsScannerView.tsx`, `LogisticsCodView.tsx`

7. **Construction Contractor (`src/components/screens/contractor/`)**:
   - `ContractorDashboardView.tsx`, `ContractorSitesView.tsx`, `ContractorDailyLogsView.tsx`, `ContractorSafetyView.tsx`, `ContractorBillingView.tsx`

8. **Agriculture & Farm (`src/components/screens/agriculture/`)**:
   - `AgricultureDashboardView.tsx`, `AgricultureParcelsView.tsx`, `AgricultureCropsView.tsx`, `AgricultureHarvestsView.tsx`, `AgricultureFinanceView.tsx`

### Step 3: Wire Router in `App.tsx` & Verify `Sidebar.tsx`
- Update `App.tsx` routing branches to render the dedicated screen corresponding to `activeScreen` for all 8 categories.
- Ensure all sidebar items link directly to the clean dedicated screens with zero nested sub-tab headers.

### Step 4: Universal `Seek` Integration Across the Entire App
Replace raw search inputs and static search wrappers with `<Seek ... />` across all views:
- **New Categories**: In all patient directories, repair orders, property portfolios, shipments, legal matters, parts catalogs.
- **Older Categories**:
  - `MembershipMembersView` & `MembershipSchedulerView`
  - `AppointmentClientsView` & `AppointmentScheduleView`
  - `VenueRentersView` & `VenueBookingsView`
  - `EducationStudentsView`, `EducationCohortsView`, `EducationAdmissionsView`
  - `PosOrdersView` & `PosInventoryView`
  - `FreelanceClientsView` & `FreelanceDeliverablesView`
  - `TradingSalesView`, `TradingPurchasesView`, `TradingInventoryView`, `TradingDirectoryView`

### Step 5: Universal `AtriumButton` Propagation Across the Entire App
Replace legacy buttons (e.g. `rounded-full`, unstyled `button`, or flat background styles) with `AtriumButton`:
- Primary action buttons in all category header bars ("Add Member", "New Appointment", "New Booking", "New Student", "New Order", "New Invoice", "New Project", "New Consultation", "New Vehicle", "New Property", etc.).
- Modal submission buttons ("Save", "Confirm", "Enroll", "Generate Receipt", "Print").
- Table action toolbars.

---

## 5. Verification Plan

### Automated Validation
1. `compile_applet`: Verify that the entire multi-screen application builds cleanly with Vite.
2. `lint_applet`: Verify zero TypeScript errors (`tsc --noEmit`) across all newly decomposed views and shared UI imports.
3. Unit tests: Run `npm test` (`tsx --test src/utils/rules.test.ts`) to ensure business logic and calculations are unaffected.

### Interactive Verification Scenarios
1. **Single-Source Navigation Verification**:
   - Switch between all 8 expansion verticals using FastSwitch or Onboarding.
   - Click each item in the left sidebar dock. Confirm that each screen loads cleanly and **no secondary in-page tab bar** is rendered anywhere in the content area.
2. **Medical Terracotta Button Aesthetic Verification**:
   - Inspect primary action buttons across new and old categories.
   - Confirm the squircle `rounded-xl` contour, rich terracotta `#C4785A` background, white text, and warm glowing drop shadow on hover.
3. **Expanding Seek Search Verification**:
   - Test the search lens across multiple categories (e.g. Medical Patients, Auto Repair Orders, Real Estate Properties, Gym Members, Trading Sales).
   - Confirm it starts as a compact icon button, expands smoothly on click, takes keyboard focus, filters rows dynamically, and collapses smoothly on click-outside.
4. **Form Modal Verification**:
   - Open intake modals in new categories (New Patient, New Vehicle, New Consultation, New Lease).
   - Confirm that fields display floating notched labels (`LabelInput`) and notched dropdowns (`LabelSelect`).
5. **Trilingual & Dark Mode Parity**:
   - Verify views in French, Arabic (RTL), and English.
   - Confirm RTL text alignments, button icon placements, and dark mode contrast tokens.
