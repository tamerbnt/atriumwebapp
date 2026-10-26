# Master Desktop Design System Alignment Plan: Pod Trays, Dark Espresso Anchors & Universal Collections

A unified design modernization plan to align all 16 business categories in Atrium ERP & CRM with the authentic desktop WPF aesthetic specified in `gymhome_staffhome_screen_spec_1abe7731.md`, `Screenshot_29` (GymHome), and `Screenshot_30` (Staff Management). This plan establishes exact spacing, color tokens, two-column dashboard pod layouts, and standardized UniversalDataCollection list/grid screens, executing category by category starting with **Category 14: Venue and Event Rentals**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed User Architectural Decisions:**
> 1. **Rollout Priority**: We will execute the alignment plan **category by category**, starting immediately with **Category 14: Venue & Event Rentals** (all 6 screens: VenueDashboardView, VenueRentersView, VenueBookingsView, VenueInventoryView, VenueTimelineView, VenueFinanceView).
> 2. **List & Grid Screens**: Every screen displaying collections will strictly adhere to the `Screenshot_30` Staff Management architecture using `UniversalDataCollection` inside an elevated Pod Tray (`#F8F9FA`, `rounded-[24px]`), preceded by an elevated 3-card KPI Tray with a Dark Espresso anchor card.
> 3. **Home / Dashboard Screens**: Every category home screen will standardize on the `Screenshot_29` GymHome layout: a ~38% / ~62% two-column pod canvas featuring a Summary Tray with occupancy histogram, dual compact KPI tiles, an Atrium Tips card, an Activity Tray with sparkline cards (including the Dark Espresso `#1F1D1B` anchor card), and a Recent Activity feed with capsule filter pills.

---

## 1. Overview & Core Concept

### What It Delivers
This system-wide design upgrade elevates Atrium from a standard web SaaS interface into a tactile, spatial desktop workstation inspired by the native WPF desktop app:
- **Outer Rounded Workspace**: Every screen is encased in an outer panel (`rounded-[28px]`, `bg-white dark:bg-[#18181B]`, `border border-[#E9EEF0] dark:border-neutral-800`, `p-6 lg:p-8`) floating gracefully over the window backdrop (`#E8ECEF`).
- **Pod Tray Architecture (`SurfaceBgElevated`)**: Content sections are organized into elevated soft trays (`#F8F9FA` in light mode, `#141416` in dark mode, `rounded-[24px]`, `p-5`, `border border-[#EDF1F3]`). Inside each pod tray, floating pure white cards (`#FFFFFF`, `rounded-[18px]`) house metrics, sparklines, and tables.
- **The Anchor Dark Espresso Card (`#1F1D1B`)**: An intentional high-contrast dark card (`#1F1D1B` background, `#E7E5E4` typography, `#3D2817` amber badge with `#FB923C` text) anchored in both the KPI strip and the Activity Pod. This breaks visual monotony and creates an immediate focal anchor.
- **Standardized List/Grid Engine**: All directory and catalog screens across all verticals share identical toolbar ergonomics: Left title + count badge, expanding kinetic `Seek` search lens, status filter capsules (`All`, `Active`, `Expiring`), dropdown filter, Export CSV, and unified List/Grid toggles.

### Target Audience & Operational Context
Algerian and international facility managers, commercial directors, venue organizers, educators, and enterprise administrators who spend hours managing high-volume data daily and require maximum visual calm, clear spatial hierarchy, and zero clutter.

---

## 2. User Experience & Visual Design System

### 2.1 Design Tokens & Spacing Math

| WPF Token | Web CSS / Tailwind Equivalent | Hex Value (Light) | Hex Value (Dark) | Purpose |
|---|---|---|---|---|
| `WindowBackground` | `bg-[var(--color-window-bg)]` | `#E8ECEF` | `#0C0C0E` | Outer canvas backdrop |
| `CardBackgroundBrush` | `bg-white dark:bg-[#18181B]` | `#FFFFFF` | `#18181B` | Outer workspace & inset cards |
| `SurfaceBgElevated` | `bg-[#F8F9FA] dark:bg-[#141416]` | `#F8F9FA` | `#141416` | Pod Trays (outer card containers) |
| `SurfaceBgDim` | `hover:bg-[#F1F3F5] dark:hover:bg-[#1C1C20]` | `#F1F3F5` | `#1C1C20` | Hover states on table rows & cards |
| `CardBorderBrush` | `border-[#E9EEF0] dark:border-[#27272A]` | `#E9EEF0` | `#27272A` | 1px borders on cards and pods |
| `BorderSubtle` | `border-[#EDF1F3] dark:border-[#1F1F23]` | `#EDF1F3` | `#1F1F23` | Pod Tray outer boundary border |
| `FacilityAccentBrush` | `bg-[#C4785A]` / `text-[#C4785A]` | `#C4785A` | `#C4785A` | Primary Brand Terracotta |
| `FacilityAccentDim` | `bg-[#C4785A]/10` / `bg-[#FCEEE8]` | `#FCEEE8` | `rgba(196,120,90,0.15)` | Icon wells, active pills, badges |
| `DarkEspressoCard` | `bg-[#1F1D1B]` | `#1F1D1B` | `#1F1D1B` | High-contrast anchor metric card |
| `DarkEspressoBadge` | `bg-[#3D2817] text-[#FB923C]` | `#3D2817` / `#FB923C` | `#3D2817` / `#FB923C` | Anchor card trend pill |

### 2.2 Corner Radii Hierarchy
To preserve nested visual geometry ($r_{\text{inner}} = r_{\text{outer}} - \text{padding}$):
- **Outer Workspace Panel**: `rounded-[28px]`
- **Pod Tray Container**: `rounded-[24px]`
- **Floating Inset Cards / Stat Tiles**: `rounded-[18px]`
- **Table Column Headers & Row Cards**: `rounded-[12px]`
- **Icon Wells**: `rounded-[10px]` or `rounded-[8px]`
- **Capsule Pills & Buttons**: `rounded-full` or `rounded-[14px]`

---

### 2.3 Screen Paradigm 1: Category Home / Dashboard (GymHome Reference)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Outer Workspace Panel (bg-white, rounded-[28px], border, p-6 lg:p-8)                  │
│                                                                                        │
│ [Header Row]                                                                           │
│ Welcome back, Tamer!                          [Branch: Atrium 1 ▾] [+ Quick Actions]   │
│ Live overview of today's operations                                                    │
│                                                                                        │
│ ┌────────────────────────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │ Left Column (~38%)                 │ │ Right Column (~62%)                         │ │
│ │                                    │ │                                             │ │
│ │ ┌─ Summary Pod Tray (rounded-24)─┐ │ │ ┌─ Activity Pod Tray (rounded-24) ────────┐ │ │
│ │ │ Summary             [Daily ▾]  │ │ │ │ Activity     Track daily operational...   │ │ │
│ │ │ ┌─ Inset White Card ─────────┐ │ │ │ │ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │ │ │
│ │ │ │ Occupancy │ Daily Entries  │ │ │ │ │ │ Today    │ │ Active   │ │ Espresso    │ │ │ │
│ │ │ │ 0 / 100   │ 48 entrées     │ │ │ │ │ │ 0 DA     │ │ 2 Units  │ │ 0 Caution   │ │ │ │
│ │ │ │ ────────────────────────── │ │ │ │ │ │[Sparkline│ │[Sparkline│ │[Sparkline]  │ │ │ │
│ │ │ │ [Occupancy Histogram Bars] │ │ │ │ │ └──────────┘ └──────────┘ └─────────────┘ │ │ │
│ │ │ └────────────────────────────┘ │ │ │ └───────────────────────────────────────────┘ │ │
│ │ └────────────────────────────────┘ │ │                                             │ │
│ │                                    │ │ ┌─ Recent Activity Pod Tray (rounded-24)───┐ │ │
│ │ ┌─ Dual KPI Tiles ───────────────┐ │ │ │ Recent Activity  [Tous | Passages | Ventes] │ │
│ │ │[Moyenne Sem.]  [Obj. Mensuel]  │ │ │ │ ┌─ Column Headers Card (rounded-12) ────┐ │ │
│ │ │ 18,400 DA      │ 84.5%         │ │ │ │ │ Client │ Opération │ Statut │ Heure   │ │ │
│ │ └────────────────────────────────┘ │ │ │ └───────────────────────────────────────┘ │ │
│ │                                    │ │ │ ┌─ Activity RowCard (rounded-12) ───────┐ │ │
│ │ ┌─ Sleek Prompt Banner (Tips) ───┐ │ │ │ │ [Avatar] Event Title · Tag · Time     │ │ │
│ │ │ ASTUCE 1/5  Conseil Atrium     │ │ │ │ └───────────────────────────────────────┘ │ │
│ │ │ Description text...            │ │ │ │ [Empty State or List of RowCards]         │ │ │
│ │ │ [Action Button >]              │ │ │ └───────────────────────────────────────────┘ │ │
│ │ └────────────────────────────────┘ │ │                                             │ │
│ └────────────────────────────────────┘ └─────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Element Specifications for Category Home:
1. **Header**:
   - Greeting text: `text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white`
   - Subtitle: `text-xs lg:text-sm text-neutral-500 dark:text-neutral-400 mt-1`
   - Right controls:
     - Branch switcher pill: `h-10 px-4 rounded-xl bg-[#F4EFEA] border border-[#E8DFD8] flex items-center gap-2`
     - Quick Actions ToggleButton: `h-10 px-5 rounded-[14px] bg-[#C4785A] text-white font-bold flex items-center gap-2 hover:bg-[#b3684a]`
     - Floating Quick Actions menu with 4 colored icon-well action items (30x30px wells).
2. **Left Column (~38%)**:
   - **Summary Pod Tray**: `bg-[#F8F9FA] rounded-[24px] p-4 border border-[#EDF1F3]`
   - **Inset Card**: `bg-white rounded-[18px] p-4 border border-[#E9EEF0]`
     - Top metrics: 2-column split with hairline divider. Left: `People Inside` with accent icon well; Right: `Daily Entries` with green icon well.
     - Bottom histogram: 10 rounded capsule bars with accent/neutral fill tracking hourly occupancy.
   - **Dual KPI Tiles**: Equal width, 14px gap, `bg-[#F8F9FA] rounded-[18px] p-4`, trend badge + bold 22px metric.
   - **Atrium Tips Banner**: `bg-[#F8F9FA] rounded-[18px] p-4`, step indicator, carousel navigation, and full-width CTA.
3. **Right Column (~62%)**:
   - **Activity Pod Tray**: `bg-[#F8F9FA] rounded-[24px] p-4 border border-[#EDF1F3]`
     - 3 Cards: Revenue Today, Active Count, and **Dark Espresso Card** (`#1F1D1B`, `#E7E5E4` text, `#3D2817` amber badge, large bold value, sparkline background).
   - **Recent Activity Pod Tray**:
     - Filter pill group: bordered capsule housing segmented pills (`Tous` / `Passages` / `Ventes`).
     - Inset Column Headers Card (`bg-white rounded-[12px] px-4 py-2 text-xs font-semibold`).
     - Activity rows: `bg-white rounded-[12px] border border-[#E9EEF0] px-4 py-2.5 hover:bg-[#F8F9FA]` with avatar, text, status badge, and relative time.

---

### 2.4 Screen Paradigm 2: Standardized List & Grid Screens (StaffHome Reference)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Outer Workspace Panel (bg-white, rounded-[28px], border, p-6 lg:p-8)                  │
│                                                                                        │
│ [Header Row]                                                                           │
│ [Icon 44x44] Category Entity Title          [Branch: Atrium 1 ▾] [Secondary] [+ Add]   │
│ Manage records, lifecycle, and operations                                              │
│                                                                                        │
│ ┌─ Top Metrics Pod Tray (bg-[#F8F9FA], rounded-[24px], p-5, border) ─────────────────┐ │
│ │ Section Header: Capacity & Health Indicators                                         │
│ │ ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────────────────────┐ │
│ │ │ Inset White Card 1   │ │ Inset White Card 2   │ │ Dark Espresso Card (#1F1D1B)   │ │
│ │ │ Active Ratio [100%]  │ │ Cycle Volume [0 pend]│ │ Total Escrow / Revenue         │ │
│ │ │ 15 / 15 Total        │ │ 4 Active Bookings    │ │ 240,000 DZD                    │ │
│ │ └──────────────────────┘ └──────────────────────┘ └────────────────────────────────┘ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌─ Bottom Collection Pod Tray (bg-[#F8F9FA], rounded-[24px], p-5, border) ───────────┐ │
│ │ ┌─ Integrated Toolbar ─────────────────────────────────────────────────────────────┐ │
│ │ │ [Icon] Entity Directory [Count]    [Seek 🔍] [All 15|Active 12|Inactive 3]       │ │
│ │ │                                    [FilterSelect ▾] [Export CSV ▾] [☷ ☰] [⛶]     │ │
│ │ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ │                                                                                      │
│ │ ┌─ Sticky Column Headers Card (bg-white, rounded-[12px], border, px-4, py-2.5) ───┐ │
│ │ │ [ ] Name ↕                     Category / Role ↕      Contact ↕     Status ↕   ⋮ │ │
│ │ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ │                                                                                      │
│ │ ┌─ List View: Inset RowCards (bg-white, rounded-[12px], border, hover:bg-[#F8F9FA])┐ │
│ │ │ [ ] [Avatar] Primary Name · Sub  [Role Badge]          Phone / Email [Active •] ⋮ │ │
│ │ │ [ ] [Avatar] Primary Name · Sub  [Role Badge]          Phone / Email [Active •] ⋮ │ │
│ │ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ │                                                                                      │
│ │ ┌─ Grid View: Inset GridCards (bg-white, rounded-[18px], border, hover:shadow-md) ─┐ │
│ │ │ ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐│ │
│ │ │ │ [Avatar] Full Name     │  │ [Avatar] Full Name     │  │ [Avatar] Full Name     ││ │
│ │ │ │ Subtitle · Phone       │  │ Subtitle · Phone       │  │ Subtitle · Phone       ││ │
│ │ │ │ Status Pill · Balance  │  │ Status Pill · Balance  │  │ Status Pill · Balance  ││ │
│ │ │ └────────────────────────┘  └────────────────────────┘  └────────────────────────┘│ │
│ │ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ │                                                                                      │
│ │ [Footer: 15 enregistrements affichés]                                                │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Category-by-Category Phased Execution Roadmap

### Phase 1: Category 14 — Venue and Event Rentals (Immediate Priority)
- **1.1 VenueDashboardView**:
  - Encapsulate in Outer Workspace Panel (`rounded-[28px]`, `bg-white`).
  - Build two-column pod layout (~38% / ~62%).
  - Left column:
    - Summary Pod Tray (`#F8F9FA`) with Inset White Card: Occupied vs Available units count with accent/green icon wells + Occupancy timeline histogram.
    - Dual KPI tiles: Average Booking Duration & Monthly Venue Utilization Rate with trend badges.
    - Venue Tips / Checklist Card ("Conseils Palais & Gestion Salles").
  - Right column:
    - Activity Pod Tray with 3 cards: Booked Turnover Today (white card), Active In-Session Bookings (white card), and **Active Caution Escrow** (**Dark Espresso Card `#1F1D1B`**, amber badge, total held deposits in DZD).
    - Recent Activity Pod Tray: Filter pills (`Tous`, `Check-Ins`, `Règlements`), column headers card, and live feed of rental events.
  - Header with Quick Actions button & popover (Quick Book, New Renter, Check-In, Escrow Deposit).
- **1.2 VenueRentersView**:
  - Restructure with Top Metrics Pod Tray: Total Organizers, Corporate Ratio, and **Cumulative Spend** (**Dark Espresso Card `#1F1D1B`**).
  - Wrap directory in Bottom Collection Pod Tray (`#F8F9FA`, `rounded-[24px]`).
  - Integrate toolbar inside tray: Title + count badge, expanding `Seek` search, status capsules (`Tous`, `Actifs`, `Inactifs`), company filter, Export CSV, and List/Grid toggles.
  - Column headers card and row cards using `UniversalDataCollection`.
- **1.3 VenueBookingsView**:
  - Top Metrics Pod Tray: Confirmed Bookings, Checked-In In-Session, and **Pending Caution Escrow** (**Dark Espresso Card `#1F1D1B`**).
  - Bottom Collection Pod Tray with UniversalDataCollection: bookings list/grid with multi-select, date/unit filters, status badges, and action menus.
- **1.4 VenueInventoryView (Rentable Units & Spaces)**:
  - Top Metrics Pod Tray: Total Spaces, Available Capacity, and **Average Unit Rate** (**Dark Espresso Card `#1F1D1B`**).
  - Bottom Collection Pod Tray with UniversalDataCollection: spaces grid/list with amenities, capacity, rates, and quick booking triggers.
- **1.5 VenueTimelineView (Visual Gantt / Workstations)**:
  - Outer Workspace Panel with elevated scheduling pod tray, unit column filters, and timeline matrix.
- **1.6 VenueFinanceView (Escrow & Settlement)**:
  - Top Metrics Pod Tray: Total Invoiced, Collected Revenue, and **Held Caution Escrow** (**Dark Espresso Card `#1F1D1B`**).
  - Bottom Collection Pod Tray with UniversalDataCollection for deposits and invoices.

---

### Phase 2: Category 15 — Education, Academy & Tutoring
- **EducationDashboardView**: Two-column pod layout with Student Presence histogram, dual KPI tiles, Active Cohorts, Daily Admissions, and **Tuition Overdue Ledger** (**Dark Espresso Card `#1F1D1B`**).
- **EducationStudentsView & AdmissionsView**: Standardized Pod Tray with UniversalDataCollection, Seek search, status capsules, and List/Grid views.
- **EducationCohortsView & AttendanceView**: Elevated pod trays and standardized table cards.

---

### Phase 3: Category 16 — Freelance & Solo Studio
- **FreelanceDashboardView**: Two-column pod layout with Billable Hours histogram, dual KPI tiles, Unbilled Pipeline, and **Tax & Retainer Reserve** (**Dark Espresso Card `#1F1D1B`**).
- **FreelanceClientsView & DeliverablesView**: Standardized Pod Tray with UniversalDataCollection.

---

### Phase 4: Category 8 — B2B Trading & Commercial Management
- **TradingDashboardView**: Two-column pod layout with Sales turnover, Inventory movements, and **Fiscal Timbre & Retenue de Garantie** (**Dark Espresso Card `#1F1D1B`**).
- **TradingDirectoryView, SalesView & PurchasesView**: Standardized Pod Tray with UniversalDataCollection.

---

### Phase 5: Categories 6 & 7 — POS Retail & Salon Appointments
- **PosDashboardView & OrdersView**: Pod trays with drawer totals and Espresso cash register card.
- **AppointmentDashboardView & ClientsView**: Two-column pod layout with Chair workstation tracker and Espresso commission card.

---

### Phase 6: Expansion Verticals
- Project & Milestone (Agency 6-Roles)
- Auto Garage, Contractor, Medical, Logistics, Real Estate, Manufacturing, Agriculture.

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ App.tsx (Root Workspace Container: bg-[#E8ECEF] dark:bg-[#0C0C0E])     │
│  └── Sidebar.tsx (Always Dark Obsidian #18181B, rounded-[28px])        │
│  └── TopBar.tsx (Unified Search, Command Palette, Facility Switcher)   │
│  └── Main Content Area                                                 │
│       └── [Category Screen Component, e.g. VenueDashboardView]         │
│            └── Outer Workspace Panel (bg-white, rounded-[28px], p-6)   │
│                 ├── Screen Header (Greeting/Title, Branch, CTA Button) │
│                 ├── Pod Tray 1: Metrics / Summary (`#F8F9FA`, r-24)    │
│                 │    ├── Inset White Cards (`#FFFFFF`, r-18)           │
│                 │    └── Anchor Dark Espresso Card (`#1F1D1B`, r-18)   │
│                 └── Pod Tray 2: Collection / Feed (`#F8F9FA`, r-24)    │
│                      ├── Toolbar (Seek, FilterCapsules, Actions)       │
│                      └── UniversalDataCollection<T>                    │
│                           ├── Column Headers Card (`#FFFFFF`, r-12)    │
│                           └── CollectionListRow / GridCard (r-12/r-18) │
└────────────────────────────────────────────────────────────────────────┘
```

### Component State & Handler Map
- **Pod Tray Wrapper**: Reusable layout container with `bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs`.
- **StatTile & Inset Card**: `bg-white dark:bg-neutral-800 rounded-[18px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs`.
- **Dark Espresso Card**: `bg-[#1F1D1B] rounded-[18px] p-5 border border-neutral-800 text-white shadow-sm`.
- **Seek Integration**: Integrated seamlessly in the Collection Pod Tray toolbar (`shutSize={36}`, `openWidth={260}`).
- **UniversalDataCollection**: Renders both List View (`rounded-[12px]` white row cards with hover `SurfaceBgDim`) and Grid View (`rounded-[18px]` cards with action menus).

---

## Verification & Quality Gates
1. **Desktop Presence**: Full 1440px viewport integrity, no collapsed mobile card behavior.
2. **Color & Radius Discipline**: Strict adherence to `#F8F9FA` pod trays, `#FFFFFF` cards, `#1F1D1B` espresso card, `#C4785A` terracotta accents, and `28px / 24px / 18px / 12px` radii hierarchy.
3. **Interactive Completeness**: 100% working event handlers on quick actions, filter capsules, sorting arrows, modals, and row kebab menus.
4. **Tri-lingual Parity**: Seamless RTL mirroring for Arabic with Cairo font, and polished French/English typography.
5. **Compilation Verification**: Complete pass on `npm run lint` (`tsc --noEmit`), `compile_applet`, and existing unit test suites.
