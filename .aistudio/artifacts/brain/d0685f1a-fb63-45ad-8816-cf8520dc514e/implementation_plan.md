# Unified Table Headers, Bulk Selection Engine & Tri-View Calendar Architecture Plan

Comprehensive architectural overhaul across Atrium ERP & CRM to:
1. Wrap table column headers in a crisp white floating card container directly on the elevated grey pod, with interactive sort/filter arrows on every column.
2. Fix and standardize multi-row bulk selection across all screens, backed by a persistent floating bottom pill toolbar with category-specific secondary actions and safe batch deletion.
3. Integrate a 3rd Calendar icon (`[List] [Grid] [Calendar]`) into the collection view toggle on Schedule, Timetable, Booking, and Agenda screens, completely removing redundant top tab switchers.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user during the Phase 1 clarification interview:
> - **Header Posture**: Column headers must be wrapped in a dedicated white floating card container (`bg-white rounded-[12px] border border-neutral-200/90 shadow-xs`) on the grey pod, with sort arrows on **every** column and active sorting enabled.
> - **Bulk Action Placement**: Multi-row bulk actions will appear as a sleek **floating bottom pill toolbar** centered above the content (`fixed bottom-6 left-1/2 -translate-x-1/2`), featuring selected item counts, category-specific secondary actions, and batch deletion.
> - **Calendar Switcher Integration**: The 3rd Calendar icon will be added to the row view mode switcher specifically on **Schedule, Timetable, Booking, and Agenda screens**, replacing and removing the clumsy segmented tabs from the top of those screens.

---

## 1. Overview & Core Concept

### What It Does
- **Crisp Floating Header Cards**: Wraps the column header bar in an elegant white card container (`bg-white dark:bg-[#18181B] rounded-[12px] border border-neutral-200/90 shadow-xs`) that floats directly above the row cards in the grey pod tray. Every single column header displays interactive sort arrows (`⇅`, `↑`, `↓`) that instantly sort data by that property.
- **Universal Multi-Select & Floating Bulk Bar**: Upgrades `UniversalDataCollection` to manage selection state internally with bidirectional sync, ensuring multi-select checkboxes always work out of the box across all 16 verticals. When one or more rows are selected, a sleek floating bottom pill bar slides into view with a counter, a category-tailored primary action (e.g. VIP promotion, status update, export), and a destructive batch delete action.
- **Tri-Mode View Switcher (`[List] [Grid] [Calendar]`)**: Extends the view mode toggle in `UniversalDataCollection` to support an optional 3rd Calendar icon. Screens that feature calendar, schedule, or timeline views (`AppointmentScheduleView`, `MembershipSchedulerView`, `VenueTimelineView`, `EducationTimetableView`, `MedicalAgendaView`) will surface this 3rd icon, allowing seamless switching directly from the collection toolbar and eliminating cluttered top-level tabs.

---

## 2. User Experience & Visual Design

### 1. White Column Header Card with 100% Column Sorting
- **Header Geometry**:
  `w-full bg-white dark:bg-[#18181B] border border-neutral-200/90 dark:border-neutral-800 rounded-[12px] px-4 py-2.5 mb-2 flex items-center shadow-xs`
- **Universal Sort Arrows**:
  Every column header button displays a sort arrow badge (`ArrowUpDown`, `ArrowUp`, `ArrowDown`).
  - Unsorted: Subtle neutral sort arrow badge (`text-neutral-400`).
  - Active Ascending/Descending: Highlighted brand terracotta arrow (`text-[#C4785A]`).
  - Clicking any column toggles sort order instantly (`asc` ↔ `desc`).

### 2. Floating Bottom Bulk Toolbar
- **Position & Motion**: Centered at `fixed bottom-6 left-1/2 -translate-x-1/2 z-40`, rendering with a subtle spring slide-up animation (`motion/react` or CSS `animate-in slide-in-from-bottom-4`).
- **Dark Obsidian Aesthetics**: `bg-neutral-900/95 dark:bg-neutral-850/95 backdrop-blur-md text-white rounded-2xl px-5 py-3 shadow-2xl border border-neutral-800 flex items-center gap-4`.
- **Three-Zone Action Layout**:
  1. *Selection Counter*: Terracotta count badge (`w-6 h-6 rounded-full bg-[#C4785A] text-white text-xs font-bold`) + clear label.
  2. *Category Secondary Action*:
     - **Salon / Clients**: `Promouvoir VIP` / `Marquer régulier`
     - **Fitness Members**: `Renouveler / Statut` / `Exporter CSV`
     - **POS / Retail**: `Ajuster Stock / Catégorie`
     - **B2B Trading / Commercial**: `Valider / Clôturer`
     - **Auto Garage**: `Changer Statut Atelier`
     - **Logistics**: `Assigner Livreur / Expédier`
  3. *Batch Delete Action*: Red destructive button (`bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5`) with confirmation safety.

### 3. Integrated Calendar Control (`[List] [Grid] [Calendar]`)
- **Control Pill**:
  `bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-xl border border-neutral-200/50 flex items-center gap-0.5`
- **Icon Trio**:
  - `List` (☰) → Activates multi-column list view.
  - `LayoutGrid` (⊞) → Activates responsive card grid view.
  - `Calendar` (📅) → Activates timetable/agenda/timeline view.
- **Top Bar De-cluttering**: Removes redundant segmented switchers from the top metric areas of `AppointmentScheduleView`, `MembershipSchedulerView`, and `VenueTimelineView`.

---

## 3. Technical Architecture & Component Mapping

### Visual Layout & Tri-View Workflow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│  Elevated Grey Pod Tray (bg-[#F8F9FA] rounded-[24px] p-5)              │
│                                                                        │
│  [Toolbar: Title · Count · Filter Tabs · Seek]  [List | Grid | Cal 📅] │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ White Column Header Card (bg-white rounded-[12px] border shadow) │  │
│  │ [☑]  Client ⇅   Diagnostic ⇅   Formule ⇅   Styliste ⇅   Total ⇅  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Floating White Row Card 1 (bg-white rounded-[10px] shadow-xs)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Floating White Row Card 2 (bg-white rounded-[10px] shadow-xs)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│          ┌──────────────────────────────────────────────────┐          │
│          │ Floating Bottom Bulk Action Pill (fixed bottom-6)│          │
│          │ [ 3 selected ]  [ Category Action ★ ]  [ Delete 🗑 ] │          │
│          └──────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps & File Modifications

### Step 1: Universal Component Layer (`UniversalDataCollection.tsx`)
1. **White Header Card**:
   - Restore white container wrapper around list column headers:
     `className="w-full bg-white dark:bg-[#18181B] border border-neutral-200/90 dark:border-neutral-800 rounded-[12px] px-4 py-2.5 mb-2 flex items-center shadow-xs"`
2. **Universal Sorting on All Columns**:
   - Default column `sortable` to `true` unless explicitly `sortable === false`.
   - Provide built-in fallback sorting by column accessor or key so clicking any header sorts without requiring custom parent sorting code.
3. **Resilient Selection State**:
   - Implement internal selection state (`const [internalSelectedIds, setInternalSelectedIds] = useState(new Set<string>())`) with synchronization to controlled `selectedIds` and `onSelectionChange`.
   - Ensure header "Select All" checkbox toggles between 0 and all filtered items correctly.
4. **Built-in Floating Bottom Bulk Toolbar**:
   - When `effectiveSelectedIds.size > 0`: render floating bottom bar with counter, custom secondary action, and batch delete.
5. **Calendar View Icon**:
   - Add `showCalendarToggle?: boolean` and `viewMode?: 'list' | 'grid' | 'calendar'`.
   - Render 3rd Calendar icon (`CalendarDays` / `Calendar`) in the toggle pill.
   - When clicked, trigger `onViewModeChange?.('calendar')`.

### Step 2: Screen-by-Screen Integration & Top Tab De-cluttering

#### 1. Appointment Vertical
- **`AppointmentClientsView.tsx`**: Wire `selectedIds={selectedClientIds}` and `onSelectionChange={setSelectedClientIds}`, enabling bulk VIP promotion and bulk deletion.
- **`AppointmentScheduleView.tsx`**:
  - Remove top segmented tab bar (`lines 465–491`).
  - Wire `showCalendarToggle={true}` and `viewMode={viewMode}` to `UniversalDataCollection`.
  - Seamlessly toggle between `list`, `grid`, and `calendar` (stylist chair columns).

#### 2. Membership & Fitness Vertical
- **`MembershipSchedulerView.tsx`**:
  - Remove top view mode switcher buttons (`lines 360–385`).
  - Wire `showCalendarToggle={true}` in `UniversalDataCollection`.
  - Switch between sessions list, grid cards, and weekly timetable matrix.
- **`MembershipMembersView.tsx`**: Ensure bulk selection and floating toolbar with batch renew/freeze and delete.

#### 3. Venue & Event Rentals Vertical
- **`VenueTimelineView.tsx`**:
  - Remove top tab switcher (`lines 180–205`).
  - Wire `showCalendarToggle={true}` so the user switches between timeline view and booking collections via the unified 3-button toggle.

#### 4. Education & Academy Vertical
- **`EducationTimetableView.tsx`**:
  - Wire `showCalendarToggle={true}` to switch between schedule calendar and room timetable cards.
- **`EducationStudentsView.tsx`**:
  - Wire bulk selection with batch cohort assignment and deletion.

#### 5. POS & Retail Vertical
- **`PosOrdersView.tsx`** & **`PosInventoryView.tsx`**:
  - Wire bulk selection for batch stock updates and deletion.

#### 6. B2B Trading & Commercial Vertical
- **`TradingSalesView.tsx`** & **`TradingDirectoryView.tsx`**:
  - Wire bulk selection for batch document status updates and deletion.

---

## 5. Verification & Testing Protocol

1. **Header & Sorting Verification**:
   - Verify every collection screen renders the white header card with sort arrows on all columns.
   - Click column headers (text, dates, numbers) to verify sorting toggles between ascending and descending.
2. **Bulk Selection Verification**:
   - Click individual row checkboxes and master "Select All" checkbox.
   - Confirm the floating bottom toolbar appears with the selected item count.
   - Test category-specific secondary action (e.g. "Promote VIP") and verify state updates.
   - Test bulk delete with confirmation and verify items are removed.
3. **Tri-View Calendar Verification**:
   - Navigate to `AppointmentScheduleView`, `MembershipSchedulerView`, and `VenueTimelineView`.
   - Verify top tab switcher is gone.
   - Verify view switcher has 3 icons: `[List] [Grid] [Calendar]`.
   - Click `Calendar` icon to verify instant switch to timetable/chair matrix/timeline.
4. **Compilation & Test Suite**:
   - Run `npm test` to verify all 65 automated test suites pass.
   - Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
   - Run `compile_applet` to ensure successful production build.
