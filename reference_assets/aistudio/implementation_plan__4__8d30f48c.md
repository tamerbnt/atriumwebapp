# Flexible Multi-Pod Home Architecture & Kinetic Daily Historique

Replaces the rigid two-column Home layout across all 16 business categories and their role variants with a four-tier flexible pod system inside Atrium's existing shell. The new structure pairs a Sandstone Hero Dashboard pod and Lavender Priority pod at the top, a three-column Operational pod below, a full-width Live Daily Historique pod powered by the membership kinetic row and spring motion engine with context-adaptive filters, and a reusable five-slot Configuration placeholder pod at the base.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> All four structural and interaction choices below were confirmed during Phase 1 clarification and govern the architecture in this plan.

- **Confirmed Decision 1 — Live Daily Historique Placement**: Positioned as a **dedicated full-width pod directly above the bottom Configuration row** (Row 3 of 4), giving daily chronological activity larger visual breathing room than standard preview cards.
- **Confirmed Decision 2 — Row 1 Pod Pairing**: Uses **two separate side-by-side pods** preserving Atrium's two-tone identity—Warm Sandstone for the Hero Dashboard pod on the left and Lavender-Linen for the Featured Priority pod on the right.
- **Confirmed Decision 3 — Kinetic Historique Row Interaction**: Uses the **membership kinetic row pattern and damped spring engine** supporting both a **spring-animated expandable accordion drawer** (revealing rich event details and deep-links) and a **hover quick-action fan** (direct module navigation and contextual actions).
- **Confirmed Decision 4 — Configuration Placeholder Scope**: Implemented as a **reusable five-slot placeholder pod visible only to owner, direction, and manager roles** (automatically hidden on staff, kiosk, and restricted floor roles) until real onboarding rules are wired later.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the Home reception hall from a viewport-locked vertical split (`Pulse` column beside a `2×2` directory) into a natural scrolling, four-row bento pod architecture that surfaces immediate urgency, live daily events, and role-appropriate workspaces across all 16 industry verticals.
- **Target Audience & Personas**:
  - **Owners, Directors & Managers**: Gain an executive command surface combining one-click Dashboard access, top priority items, three operational workspace previews, a filterable real-time daily activity stream, and an onboarding readiness row.
  - **Front-Desk, Field & Floor Staff**: Retain immediate kiosk/terminal launch in Row 1, scoped operational modules in Row 2, and role-filtered daily activity in the Live Historique pod without clutter from administrative configuration steps.
- **Key Value**: Eliminates cramped `2×2` quadrants and inconsistent grid layouts across categories, turns passive "History" cards into an actionable live daily feed with kinetic spring responsiveness, and adapts automatically to every business category, active role, theme, and LTR/RTL language.

---

## 2. User Experience & Visual Design

### Layout Rhythm & Pod Hierarchy

1. **Header Zone (Preserved Shell)**: Personalized greeting (`Barlow Condensed` 700 LTR / `Cairo` 700 RTL), category & active role subtitle, Quick Actions dropdown menu, and primary Dashboard CTA.
2. **Row 1 — Asymmetric Hero & Priority Pods (`40/60` split on desktop, stacked on mobile)**:
   - **Left Pod (Sandstone Surface)**: Houses one full-height Dark Espresso **Hero Dashboard Card** clickable to open the vertical's Dashboard (or `HomeKioskCard` for dedicated front-desk/operator kiosk roles). Displays an `AUJOURD'HUI / TODAY` eyebrow + formatted date, a state-driven headline summarizing urgency or primary workload, a concise contextual subtitle, and a bottom hairline strip with **three tabular mini-counters**.
   - **Right Pod (Lavender-Linen Surface)**: Houses the **Featured Priority Card**—the single highest-urgency queue for that category and role (e.g., expiring renewals, in-chair/booked appointments, waiting triage queue, pending approvals, or active repair orders), sorted by deadline or severity.
3. **Row 2 — Operational Modules Pod (Full Width)**:
   - Standard Atrium pod wrapping an adaptive **3-column grid** (`1/3 + 1/3 + 1/3` on desktop) for the three core operational preview cards. Automatically switches to `2` or `1` column for restricted staff roles that expose fewer modules so zero orphan spaces appear.
4. **Row 3 — Live Daily Historique Pod (Full Width, Larger Scale)**:
   - Visually prominent full-width pod summarizing everything that happened across the current day for the active branch, category, and role.
   - **Pod Header & Adaptive Filter Bar**: Displays title, live daily event counter, a quick search/time-scope control, and segmented **event-type filter buttons** dynamically derived from the active business context (e.g., *All · Check-ins · Sales · Registrations · Sessions* in Clubs; *All · Triage · Appointments · Prescriptions · Chifa* in Clinics; *All · Scans · Manifests · COD* in Logistics).
   - **Kinetic Event Rows**: Built on Atrium's membership kinetic row design and damped harmonic spring engine:
     - **Resting State**: Deterministic color-coded initials/type avatar, event title, unboxed `·`-separated metadata (actor, category/module, branch), tabular timestamp and monetary/quantity metric, and semantic status badge.
     - **Hover State**: Reveals a crisp **hover action fan** (jump to source module, filter similar events, or inspect record) within a sub-200ms compositor response budget.
     - **Expanded State**: Clicking a row triggers the **spring-physics accordion drawer** (`stiffness` / `damping` rAF loop respecting `prefers-reduced-motion`) showing multi-column event context (notes, linked entity, staff/payment details) and direct action buttons.
     - **Empty & Filtered States**: Clean kinetic empty-state prompt when no activity matches the selected filter or day, with a one-click filter reset or primary action button.
5. **Row 4 — Configuration Placeholder Pod (Full Width, Owner/Manager Only)**:
   - Standard Atrium pod featuring title, `0/5` progress indicator, a slim progress bar track in the header's trailing slot, and a **5-column grid** (`1` to `5` numbered step tiles with dashed number badges, concise step titles, descriptions, and placeholder action controls).

### Visual Identity, Typography & Accessibility

- **Surface & Elevation Discipline**: Reuses Atrium's existing `--pod-pad`, `--pod-gap`, `--card-pad`, `--card-gap`, and squircle panel tokens (`data-sq="panel"` / `data-sq="card"`), preserving single-level card elevation and complete light/dark token pairs.
- **Typographic Precision**: Enforces `tabular-nums` on all Hero mini-counters, timestamps, counts, and financial values; uses clean inline `·` separators for secondary metadata rather than dense pill clusters; and preserves bold `700` display headings (`t-page`) and RTL directional mirroring (`dir="rtl"`, flipped directional arrows).
- **Natural Vertical Flow**: Removes desktop fixed-height clipping (`lg:h-full` / `min-h-0` viewport lock on Home) so all four pod rows breathe naturally and scroll smoothly inside the main application shell across `1440px`, `768px`, and `320px` viewports.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Multi-Row Pod Primitives Across All 16 Verticals**
  - *Chosen Approach*: Replace the two-column pod container and inconsistent `2×2` / inline grids with shared `HomeHeroRow`, `HomeOperationalRow`, `HomeLiveHistoryPod`, and `HomeSetupPlaceholderPod` primitives consumed by every category view.
  - *Why*: Eliminates the current layout split where half the categories use `HomeCardsGrid` and the other half use ad-hoc grid divs (and fixes Agriculture's inverted orientation), guaranteeing consistent spacing, skeletons, and responsive behavior everywhere.
  - *Alternatives Considered*: Refactoring only Membership first and leaving the remaining 15 verticals on the legacy split, which would fragment navigation rhythm across business switches.

- **Decision 2: Context-Adaptive Daily Event Feed Derived from Live Store Slices**
  - *Chosen Approach*: Introduce a category- and role-aware daily activity aggregator that normalizes today's records (check-ins, sales, invoices, appointments, leads, sessions, workflows, dispatches, field logs, etc.) into a unified chronological feed with role-scoped visibility and category-specific filter tabs.
  - *Why*: Delivers immediate, truthful live daily visibility across all 16 verticals without inventing mock activity or requiring backend schema migrations, while automatically hiding restricted financial or admin events from staff/floor roles.
  - *Alternatives Considered*: Showing a static placeholder list or a generic raw audit log, which lacks domain terminology and role-level filtering.

- **Decision 3: Lightweight Kinetic Row Engine Reuse for Home Feed**
  - *Chosen Approach*: Reuse the membership spring physics curve (`createSpring` / `stepSpring` / `isSpringCalm`) and kinetic row anatomy (`KineticRowFan` + expandable detail drawer) inside a dedicated Home feed row component optimized for mixed daily event types rather than heavy multi-select bulk table state.
  - *Why*: Preserves the exact tactile feel and visual language of the Membership rows while avoiding bulk-selection checkboxes and full-page table overhead inside the Home bento canvas.
  - *Alternatives Considered*: Embedding full multi-column data collection tables on the Home screen, which would overwhelm the dashboard-entry layout.

- **Decision 4: Viewport Flow Over Fixed-Height Compression**
  - *Chosen Approach*: Allow the Home canvas to scroll vertically using `min-h-full` just like Analytics Dashboards.
  - *Why*: Four purposeful pod rows—including an expandable kinetic activity feed and a 5-step configuration row—cannot fit cleanly inside a single `900px` viewport without collapsing row heights or clipping content.
  - *Alternatives Considered*: Shrinking cards into fixed-height internal scroll boxes, which breaks visual hierarchy and causes nested-scroll friction.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          App Shell & Scroll Frame                         │
│                    (min-h-full natural vertical flow)                     │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                HomeShell                                  │
│    Greeting Header · Role Context · Quick Actions Menu · Dashboard CTA    │
└───────┬───────────────────────┬───────────────────────┬───────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────────────┐
│    Row 1 Pods     │   │    Row 2 Pod      │   │        Row 3 Pod          │
│ (40/60 Split)     │   │ (Full Width)      │   │  (Full Width, Larger)     │
│                   │   │                   │   │                           │
│ • Sandstone Pod:  │   │ • Standard Pod:   │   │ • Live Daily Historique   │
│   Big Hero Card   │   │   Adaptive 3-Col  │   │   - Context Filter Tabs   │
│   (-> Dashboard)  │   │   Operational     │   │   - Search & Reset        │
│   + 3 Counters    │   │   Preview Cards   │   │   - Kinetic Event Rows    │
│   (or Kiosk Card) │   │   (3 / 2 / 1 col) │   │     (Hover Fan + Spring   │
│                   │   │                   │   │      Accordion Drawer)    │
│ • Lavender Pod:   │   └───────────────────┘   └─────────────┬─────────────┘
│   Featured        │                                         │
│   Priority List   │                                         ▼
└───────────────────┘                           ┌───────────────────────────┐
                                                │        Row 4 Pod          │
                                                │  (Owner / Manager Only)   │
                                                │                           │
                                                │ • Configuration           │
                                                │   Placeholder (0/5 + Bar) │
                                                │ • 5-Column Step Grid      │
                                                └───────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│              Store & Category/Role Activity Adapter Layer                 │
│  Reads active business, branch, role, and domain slices -> builds:        │
│  1. Hero urgency summary + 3 counters + Dashboard target                  │
│  2. Priority queue & 3 operational preview configs                        │
│  3. Unified chronological TodayEvent[] + context filter options           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Context Mapping

- **Unified Daily Event Schema (`HomeDailyActivityItem`)**: Each adapter normalizes today's domain records into a consistent structure containing: `id`, `categoryKey` (for filter tabs, e.g., `checkin`, `sale`, `registration`, `schedule`, `clinical`, `dispatch`, `finance`, `production`), `categoryLabel`, `title`, `subtitle`, `timestamp` (HH:mm + sortable ISO time), `metricPrimary` (amount, count, or duration), `statusLabel` + semantic tone, `actorOrBranch`, `targetScreen` (+ optional sub-screen), and structured `detailFields` for the spring-expanded drawer.
- **Category & Role Adapters (All 16 Verticals)**:
  - **Core Service (Membership, Salon, POS, Education)**: Owner views combine daily attendance/check-ins, sales/tickets, new registrations/admissions, and today's sessions/appointments; Staff/Kiosk views scope events to front-desk/chair/register/classroom actions and hide Row 4 Configuration.
  - **Core Business (Agency/PM, Venue, Freelance, Trading)**: Direction/Owner views aggregate approvals, deliveries/bookings, time logs/invoices, and commercial sales/purchase docs; PM sub-roles filter strictly to their role's domain slices (e.g., Creative BATs, Field Attendance, Payroll/CCP).
  - **Clinical & Workshop (Medical, Garage, Real Estate, Manufacturing)**: Normalizes triage/consultations/Chifa claims, repair orders/parts movements, visits/inspections/quittances, and work orders/material issues/QC verdicts—strictly filtered by active role (Technician, Parts Clerk, Quality Inspector, Negotiator, etc.).
  - **Field & Advisory (Legal, Logistics, Contractor, Agriculture)**: Normalizes court deadlines/hearings/receipts, parcel scans/manifests/COD settlements, daily site logs/concrete pours/DGP progress, and crop treatments/milking yields/weighbridge tickets—all oriented identically with Hero-Left and Priority-Right in Row 1.
- **Configuration Placeholder Config (`HomeSetupPlaceholderConfig`)**: Accepts `title`, `subtitle`, `completedCount`, `totalCount` (default `5`), and optional `steps` array; defaults to a clean 5-slot placeholder preview gated behind owner/direction/manager role flags.

### Interactive Component & State Mapping

- **Hero Card & Bottom Counters**: Clicking the Hero Card routes directly to the category's primary analytics Dashboard (or active kiosk/workstation for floor roles); optional counter click callbacks jump directly to the corresponding module screen.
- **Row 1 & Row 2 Cards**: Preserve existing row-level and header NE-arrow navigation handlers (`setScreenAction` + `setActivePmSubScreenAction` for Agency sub-screens) and empty-state action callbacks (`onAddMember`, `onAddLead`, etc.).
- **Live Daily Historique Controls**:
  - Clicking a segmented filter tab or typing in the inline search filters `HomeDailyActivityItem[]` synchronously in memory with live count updates and a visible reset action when empty.
  - Hovering a row exposes the kinetic action fan (`Open Module`, `Pin/Highlight`, or `Quick Details`) without shifting layout.
  - Clicking a row toggles `expandedEventIds` (supporting single or multi-expand), driving the rAF spring height & drawer opacity transition (`kineticPhysics`) with immediate collapse fallback when `prefers-reduced-motion` is enabled.
- **Loading Skeleton Parity**: `SkeletonHomeView` updates to mirror Row 1 (`40/60` Sandstone + Lavender pods), Row 2 (`3` equal card blocks), Row 3 (full-width Historique pod with filter bar + kinetic row placeholders), and Row 4 (5-column setup strip) across all 16 categories.
