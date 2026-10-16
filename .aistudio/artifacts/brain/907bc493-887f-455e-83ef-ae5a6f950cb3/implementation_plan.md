# Desktop Canvas & Soft Card Styling Alignment

Elevate the entire Atrium ERP interface to match the user's desktop application design (`Screenshot_880.png` and `Screenshot_881.png`): wrapping all screen viewports in a pure white floating island container (`rounded-[32px]`), softening card borders and corners, providing light grey group backdrops (`#F8F9FA`), and tuning text contrast for high legibility.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design choices were confirmed by the user during the initial clarification:

- **Confirmed Decision 1**: Apply the pure white rounded island canvas container (`rounded-[32px]`, `bg-white`, soft subtle border, generous interior padding) across **all application screens** (Dashboard, Members, Registrations, Shop, Scheduler, Finance/Staff, History, and Settings).
- **Confirmed Decision 2**: Replace dark, sharp, and high-contrast card borders with **soft subtle borders (`border-[#E9EEF0]`, `rounded-[20px]`)** nested inside light-grey grouping cards (`#F8F9FA`, `rounded-[26px]`) exactly mirroring the desktop layout in `Screenshot_880.png` and `Screenshot_881.png`.
- **Contrast & Legibility Rule**: Enforce high contrast typography: deep obsidian text (`#18181B` / `#09090B`) on white surfaces, crisp muted secondary text (`#64748B` / `#52525B`), and dedicated high-contrast labels on dark accent tiles (`#18181B` cards).

---

## 1. Overview & Core Concept

- **What It Does**: Unifies the layout architecture by encapsulating every active screen inside a spacious, detached white canvas island container with rounded corners (`rounded-[32px]`), floating comfortably on top of the soft-grey window background (`#E8ECEF`). Restyles all nested components—stat tiles, section wrappers, tables, filters, and modals—to adopt the soft-bordered, rounded aesthetic demonstrated in the desktop app screenshots.
- **Target Audience / Persona**: Facility managers, gym owners, studio directors, and front-desk staff operating the Atrium ERP on desktop and tablet monitors who require clean visual ergonomics without eye strain or visual noise.
- **Key Value**: Delivers seamless visual parity with the native desktop app, eliminating harsh dark edges, jarring border contrasts, and uncontained screen edges.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Navigating Between Screens**: As the user toggles between Dashboard, Members, POS Shop, etc., each view smoothly loads inside the unified, rounded white island card, keeping the floating dock sidebar and pill topbar cleanly detached.
2. **Reviewing Facility Metrics (Dashboard)**: The user scans the "Summary" and "Activity" sections inside soft-grey rounded card enclosures (`bg-[#F8F9FA] border border-[#EDF1F3] rounded-[26px]`), where individual metric cards float as clean white tiles with soft subtle borders (`border-[#E9EEF0] rounded-[20px]`).
3. **Inspecting Tables & Data Rows (Members, POS, History)**: Data rows render as distinct rounded white cards with soft dividers, comfortable row padding, crisp avatar tags, and smooth hover states.

### Visual Identity & Theme
```
┌────────────────────────────────────────────────────────────────────────┐
│ WINDOW BACKGROUND: #E8ECEF (Soft Neutral Desktop Canvas)               │
│                                                                        │
│  ┌───────────┐  ┌───────────────────────────────────────────────────┐  │
│  │ DOCK      │  │ TOPBAR: bg-white rounded-[26px] px-6 py-3.5        │  │
│  │ SIDEBAR   │  └───────────────────────────────────────────────────┘  │
│  │           │                                                         │
│  │ Obsidian  │  ┌───────────────────────────────────────────────────┐  │
│  │ #18181B   │  │ MAIN SCREEN CANVAS CONTAINER                      │  │
│  │           │  │ bg-white rounded-[32px] p-8 border border-white/80 │  │
│  │ rounded-  │  │                                                   │  │
│  │ [32px]    │  │  Screen Header (Title, Subtitle, Facility, CTA)   │  │
│  │           │  │  ┌─────────────────────────────────────────────┐  │  │
│  │           │  │  │ SECTION GROUP CONTAINER                     │  │  │
│  │           │  │  │ bg-[#F8F9FA] rounded-[26px] p-5             │  │  │
│  │           │  │  │ ┌──────────────┐ ┌──────────────┐           │  │  │
│  │           │  │  │ │ White Tile   │ │ Obsidian Tile│           │  │  │
│  │           │  │  │ │ r-[20px]     │ │ r-[20px]     │           │  │  │
│  │           │  │  │ └──────────────┘ └──────────────┘           │  │  │
│  │           │  │  └─────────────────────────────────────────────┘  │  │
│  └───────────┘  └───────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Aesthetic Direction**: Apple Spatial / Native macOS Desktop ERP. Soft pill geometry, detached floating islands, balanced micro-radii, warm terracotta accent (`#C4785A`).
- **Color Palette & Contrast Tokens**:
  - `Window Canvas`: `#E8ECEF` (light) / `#0C0C0E` (dark)
  - `Screen Island Container`: `#FFFFFF` (light) / `#18181B` (dark) with `rounded-[32px]`
  - `Section Group Backdrop`: `#F8F9FA` (light) / `#202024` (dark) with `rounded-[26px]`
  - `Card Surfaces`: `#FFFFFF` with `border border-[#E9EEF0]` (soft, non-sharp)
  - `Obsidian Contrast Card`: `#18181B` with white/terracotta typography and glow
  - `Brand Accent`: `#C4785A` (Terracotta) for buttons, active tabs, and primary action pills
  - `Text Primary`: `#18181B` (light) / `#FAFAFA` (dark) — WCAG AA compliant 4.5:1+ contrast
  - `Text Secondary`: `#64748B` / `#71717A`
- **Typography & Hierarchy**:
  - Page Titles: `text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900`
  - Section Headings: `text-sm font-bold text-neutral-800`
  - Stat Numbers: `text-2xl sm:text-3xl font-black font-mono tabular-nums text-neutral-900`
  - Sub-labels: `text-xs text-neutral-500 font-medium`

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Layout Wrapper vs Screen-by-Screen Wrapping**
  - *Chosen Approach*: Wrap the `<main>` viewport in `src/App.tsx` with a shared white canvas container element (`bg-white dark:bg-neutral-900 rounded-[32px] p-6 sm:p-8 min-h-[calc(100vh-120px)] shadow-xs border border-[#E4E9EC] dark:border-neutral-800`).
  - *Why*: Guarantees 100% visual consistency across all 8 screens without code duplication or margin clipping, while allowing individual screens to define their own sub-card layouts.
  - *Alternatives Considered*: Wrapping inside each screen component individually, which risks inconsistent corner radii and padding between screens.

- **Decision 2: Elimination of Sharp / Dark 1px Borders**
  - *Chosen Approach*: Replace hard `border-neutral-200` or `border-neutral-700` card borders with gentle hairline borders: `border border-[#E9EEF0]` in light mode and `border border-neutral-700/50` in dark mode. Set card radii to `rounded-[20px]` and group enclosures to `rounded-[26px]`.
  - *Why*: Recreates the soft, premium desktop look from `Screenshot_880` and `Screenshot_881`, removing the harsh industrial wireframe feel.

- **Decision 3: Grouped Sub-Card Architecture**
  - *Chosen Approach*: Structure dashboard metrics and table listings inside section groups (`bg-[#F8F9FA] rounded-[26px] p-5`), containing individual white stat cards and table rows.
  - *Why*: Directly reproduces the visual hierarchy in the screenshots where metric clusters have distinct card envelopes.

---

## 4. Technical Architecture & Component Mapping

### Component Tree
```
src/
├── App.tsx                        [Wraps active screen in rounded-[32px] white island canvas]
├── index.css                      [Defines refined border & surface variables]
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx             [Detached pill header with window controls & user avatar]
│   │   └── Sidebar.tsx            [Detached obsidian dock with rounded-[32px] capsule geometry]
│   ├── screens/
│   │   ├── DashboardScreen.tsx    [Soft rounded section containers + white metric cards + dark card]
│   │   ├── MembersScreen.tsx      [Soft section wrapper + member table card rows + search capsules]
│   │   ├── RegistrationsScreen.tsx[Leads pipeline with soft card geometry]
│   │   ├── ShopScreen.tsx         [POS catalog & cart with soft borders]
│   │   ├── SchedulerScreen.tsx    [Calendar & event cards with soft rounded borders]
│   │   ├── FinanceStaffScreen.tsx [Finance ledger & team cards]
│   │   ├── HistoryScreen.tsx      [Audit activity log]
│   │   └── SettingsScreen.tsx     [Account & facility configurations]
│   └── ui/
│       ├── StatTile.tsx           [White rounded tile with soft border & optional obsidian mode]
│       └── StatusBadge.tsx        [Soft rounded status badges]
```

### State & Event Mapping
- Theme transitions (`data-theme="light" | "dark"`) preserve the soft border contrast ratios in both modes.
- Responsive scaling: on smaller screens (`< 1024px`), container margins adjust gracefully (`px-3 py-3` outer, `p-5` inner) while preserving the rounded island appearance.
- All functional handlers (member editing, quick actions, POS transactions, leads approval) remain 100% wired and active.
