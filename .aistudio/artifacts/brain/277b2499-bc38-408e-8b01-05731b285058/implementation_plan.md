# Multi-Vertical Screen Deconstruction & Category Normalization Plan

This plan details the architectural refactoring to organize Atrium's remaining business verticals (`membership_session`, `appointment_service`, and `pos_inventory`) into dedicated, modular view directories matching the existing patterns of `venue/`, `education/`, `freelance/`, and `project/`, eliminating screen duplication, and updating onboarding terminology.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during interactive clarification and shape this plan:
>
> - **Directory Naming**: The new screen folders in `src/components/screens/` will be strictly named `membership/`, `appointment/`, and `pos/`, establishing consistent domain-aligned folder nomenclature across all 7 categories.
> - **Screen Decomposition Strategy**: The monolithic shared screens (`DashboardScreen`, `MembersScreen`, `ShopScreen`, `SchedulerScreen`) will be deconstructed into dedicated, tailored views for each vertical rather than maintaining large conditional files with nested if/else statements.
> - **POS Architecture**: Rather than mapping multiple navigation tabs (`registrations`, `scheduler`, `shop`) to a single duplicated shop view, the POS vertical will be separated into dedicated screens: `PosDashboardView`, `PosRegisterView` (cashier checkout & quick cart), `PosInventoryView` (stock tracking & SKU catalog), and `PosOrdersView` (order history, parked tickets & Z-reports).
> - **Onboarding Terminology**: Update category labels in onboarding flows from "Gym & Fitness" to "Membership", and from "Salon & Beauty" to "Appointment".

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Creates modular view directories for the 3 legacy-shared verticals (`membership/`, `appointment/`, `pos/`), matching the clean architecture of `education/`, `freelance/`, `venue/`, and `project/`.
  2. Separates vertical-specific concerns:
     - **Membership**: Member passes, RFID turnstiles, lead funnels, class timetables, pro shop supplements.
     - **Appointment**: Stylist workstations, client treatment history, multi-chair scheduler, service packs.
     - **POS & Retail**: Fast cashier register, barcode scanner, inventory & SKU reorder radar, parked orders & receipts.
  3. Eliminates all duplicated routing fallbacks in `src/App.tsx`.
  4. Renames category display titles in both onboarding wizards (`PowerOnboardingScreen` and `OnboardingWizard`) to "Membership" and "Appointment".
- **Target Audience**: Multi-vertical business operators switching between gym facilities, beauty salons, and retail POS registers with zero cognitive friction.
- **Key Value**: 100% modular screen parity across all 7 verticals, cleaner code maintainability, faster rendering, and clear domain separation.

---

### 2. User Experience & Visual Design

Following the **SaaS & Enterprise Dashboard** guidelines (`frontend_design/references/3_saas_dashboard.md`):

- **Consistent Navigation Topology**:
  Each vertical provides an identical top-level experience (Dashboard, Core CRM, Operational Workspace, Financials, and History), while every screen renders domain-native terminology:
  - *Membership*: Members, RFID Check-ins, Class Schedule, Pro Shop, Subscriptions.
  - *Appointment*: Clients, Stylist Chairs, Workstations, Treatment Packs, Commissions.
  - *POS & Retail*: Cash Register, Inventory & SKUs, Parked Tickets, Drawer Balance, Z-Reports.
- **Zero-Pill Discipline & High-Density UI**:
  - Clean unboxed metadata separated by subtle typographic dots (`·`).
  - Monospace tabular numbers (`font-mono tabular-nums`) for currency (DZD), SKU counts, and timestamps.
  - Terracotta brand accent highlights (`#C4785A`) across floating inputs and action buttons.
- **Onboarding Alignment**:
  - Step 2 category cards cleanly present "Membership" with gym/club subtext, and "Appointment" with salon/spa/clinic subtext.
  - Real-time search chip suggestions reflect the new category naming.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full Decomposition vs. Wrapper Facades**
  - *Chosen Approach*: Full decomposition into distinct component files per vertical.
  - *Why*: The existing `DashboardScreen.tsx` (1,657 lines) and `ShopScreen.tsx` (2,764 lines) have become massive monoliths containing three different businesses inside them. Separating them into `membership/`, `appointment/`, and `pos/` isolates vertical state, simplifies future vertical-specific features, and matches the standard established by `education/` and `freelance/`.
  - *Alternatives Considered*: Retaining monolithic files with internal if/else blocks was rejected because it causes cross-vertical regressions and causes duplicated tab mappings in `App.tsx`.

- **Decision 2: Dedicated POS Navigation Tabs**
  - *Chosen Approach*: Map POS tabs to distinct, purposeful screens:
    - `dashboard` → `PosDashboardView` (gross sales, average basket, cashier summary)
    - `shop` → `PosRegisterView` (fast checkout, barcode scanner, cart, payment modal)
    - `scheduler` → `PosInventoryView` (stock movements, reorder levels, SKU catalog)
    - `registrations` → `PosOrdersView` (parked cart recall, transaction receipt audit, refund logs)
  - *Why*: Eliminates the frustrating UX where clicking 4 different sidebar items opened the exact same screen.

---

### 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│          Dynamic Category Router (Current Business Vertical)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
┌───▼─────────────────────┐   ┌─────▼───────────────────┐   ┌───────▼───────────────────┐
│       membership/       │   │       appointment/      │   │           pos/            │
├─────────────────────────┤   ├─────────────────────────┤   ├───────────────────────────┤
│ MembershipDashboardView │   │ AppointmentDashboard    │   │ PosDashboardView          │
│ MembershipMembersView   │   │ AppointmentClientsView  │   │ PosRegisterView (POS cart)│
│ MembershipRegistrations │   │ AppointmentScheduleView │   │ PosInventoryView (SKUs)   │
│ MembershipShopView      │   │ AppointmentServicesView │   │ PosOrdersView (Receipts)  │
│ MembershipSchedulerView │   │ AppointmentFinanceView  │   │ PosFinanceView (Z-Report) │
│ MembershipFinanceView   │   │ AppointmentHistoryView  │   │ PosHistoryView (Audit log)│
│ MembershipHistoryView   │   └─────────────────────────┘   └───────────────────────────┘
└─────────────────────────┘
```

#### Screen Mapping Reference

| Navigation Key | `membership/` View | `appointment/` View | `pos/` View |
| :--- | :--- | :--- | :--- |
| **`dashboard`** | `MembershipDashboardView` | `AppointmentDashboardView` | `PosDashboardView` |
| **`members`** | `MembershipMembersView` | `AppointmentClientsView` | `PosClientsView` |
| **`scheduler`** | `MembershipSchedulerView` | `AppointmentScheduleView` | `PosInventoryView` |
| **`registrations`**| `MembershipRegistrationsView` | `AppointmentServicesView` | `PosOrdersView` |
| **`shop`** | `MembershipShopView` | `AppointmentRetailView` | `PosRegisterView` |
| **`finance`** | `MembershipFinanceView` | `AppointmentFinanceView` | `PosFinanceView` |
| **`history`** | `MembershipHistoryView` | `AppointmentHistoryView` | `PosHistoryView` |

---

### 5. Implementation Sequence

1. **Category Directories & View Extraction**:
   - Create `src/components/screens/membership/` and extract dedicated gym & fitness views.
   - Create `src/components/screens/appointment/` and extract dedicated salon & spa views.
   - Create `src/components/screens/pos/` and extract dedicated retail & restaurant views.
2. **App Routing Normalization**:
   - Update `src/App.tsx` router to cleanly switch across all 7 vertical folder suites.
   - Remove duplicate screen mappings for POS.
3. **Onboarding & Category Terminology**:
   - Update `PowerOnboardingScreen.tsx` and `OnboardingWizard.tsx` category card labels ("Membership" and "Appointment").
   - Update `src/utils/businessMapping.ts` and `src/utils/i18n.ts` category title strings.
4. **Verification**:
   - Run `compile_applet` and `lint_applet` to ensure zero compilation or import errors.
   - Run unit test suite to guarantee 100% regression safety.
