# Full-Page Structural Skeleton Loading & Layout Fidelity Plan [COMPLETED]

## Executive Summary & Root Cause Analysis

Following a comprehensive audit of all 16 industry verticals in Atrium ERP & CRM (verified against `Screenshot_69.png` and screen implementations), we identified three primary deficiencies in the current loading and skeleton architecture:

1. **Partial Screen Skeleton Leakage in Collection Views**:
   - In screens using `UniversalDataCollection` (such as `MembershipSchedulerView`, `MembershipMembersView`, `AppointmentClientsView`, etc.), skeleton wireframes only render inside the collection table or grid.
   - The surrounding parent view shell—including the page header title, subtitle, facility selector dropdown, primary CTA buttons (`+ schedule_new_session`), and the entire top KPI metric pod tray (showing raw zeros like `0 sessions`, `0 bookings`, `12:00 - 18:30`)—remains live and exposed.
   - This creates a broken user experience during initial sync or when using **Freeze Skeleton** mode (`networkMode === 'force_skeleton'`).

2. **Structural Layout Mismatch Across Archetypes**:
   - The existing `StructuralSkeletons.tsx` only offers generic primitives (`SkeletonKpiGrid` with 4 generic boxes, `SkeletonChart` with a generic bar graph, and `SkeletonTable`).
   - Many operational screens have completely different physical layouts that do not resemble a generic table or 4-box grid:
     - **Gym & Membership Dashboard**: Features an elevated Dark Espresso (`#1F1D1B`) turnstile live occupancy pod, a 3-tile KPI grid, an onboarding carousel, and a live check-in feed (not a single large chart).
     - **POS Register**: 65% Catalog product tile grid on the left and 35% Cashier order ticket / payment receipt on the right.
     - **Timeline & Scheduler**: Multi-column stylist/resource schedule with date pickers and hourly time-slot blocks (`MembershipSchedulerView` in timeline mode, `AppointmentScheduleView`, `EducationTimetableView`, `VenueTimelineView`).
     - **Kanban Pipelines**: 4-column swimlanes for deliverables, admissions funnels, and order dispatching (`FreelanceDeliverablesView`, `EducationAdmissionsView`).
     - **Financial & Cashier Desks**: Multi-source financial summaries with payment distribution bars and accounting ledgers.

3. **Untranslated Key Leaks**:
   - In `MembershipSchedulerView.tsx`, the primary button displays `+ schedule_new_session` because `schedule_new_session` is missing from `src/utils/i18n.ts` (the dictionary defines `schedule_add_session`).

---

## Architecture & Design Specifications

### 1. Dedicated Screen Archetype Skeletons (`StructuralSkeletons.tsx`)

We will expand `src/components/ui/skeleton/StructuralSkeletons.tsx` to introduce 7 high-fidelity structural screen templates:

1. **`SkeletonPageHeader`**:
   - Squircle icon placeholder (`w-10 h-10 rounded-2xl`).
   - Title (`h-7 w-48`) and subtitle (`h-4 w-72`).
   - View switcher pill skeleton (`w-48 h-10 rounded-2xl`).
   - Facility selector pill skeleton (`w-36 h-10 rounded-xl`).
   - Primary action button skeleton in terracotta tone (`w-40 h-10 rounded-xl`).

2. **`SkeletonSchedulerView` (Matching `MembershipSchedulerView` & Session Rosters)**:
   - Full `SkeletonPageHeader`.
   - Elevated Pod Tray (`#F8F9FA` / dark `#1F1D1B`) containing:
     - Header text wireframes (`h-5 w-64`).
     - 3 specialized metric cards matching the 3-column layout (Sessions count, Total booked athletes, Peak floor occupancy time badge).
   - Full-width table skeleton with search bar, day filter capsules, and multi-column row placeholders.

3. **`SkeletonDashboardGym` (Matching `MembershipDashboardView`)**:
   - Top Bar breadcrumb and facility selector.
   - Dark Espresso `#1F1D1B` Pod on the left (turnstile gauge circle, live people inside counter, manual check-in button).
   - 3-tile KPI pod tray for active memberships, expiring accounts, and daily revenue.
   - Right-side onboarding tips carousel skeleton with progress steps.
   - Activity log feed skeleton with tab capsules and passage/sale event rows.

4. **`SkeletonPosRegister` (Matching `PosRegisterView`)**:
   - Two-column split layout:
     - Left column (65%): Category filter pill row + 8-tile POS product grid with product images, title bars, and price badges.
     - Right column (35%): Cashier ticket receipt container with order item lines, tax calculations, payment method buttons (Cash, Card, Dahabia), and large checkout button.

5. **`SkeletonCalendarTimeline` (Matching `AppointmentScheduleView`, `EducationTimetableView`, `VenueTimelineView`)**:
   - Top date navigation ribbon with previous/next chevrons, day chips, and stylist/room selector.
   - Resource column grid (4-6 columns representing stylists, rooms, or spaces).
   - Time-indexed slot matrix with staggered booked event card placeholders.

6. **`SkeletonKanbanPipeline` (Matching `FreelanceDeliverablesView`, `EducationAdmissionsView`, `TradingSalesView`)**:
   - Pipeline header with stage summary counters.
   - 4 vertical column swimlanes with column header pills and draggable card placeholders with avatars, progress bars, and due date badges.

7. **`SkeletonFinanceAudit` (Matching Financial & Transaction History Views)**:
   - Financial stat cards (Total Invoiced, Net Received, Pending Retainage, Cash in Register).
   - Split layout with cashflow breakdown chart skeleton on the left and recent transactions ledger on the right.

---

### 2. Full-Page Skeleton Hook Integration

Each operational view will follow a clean, standardized contract:

```typescript
const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
  isLoading: isSyncing || networkMode === 'force_skeleton',
  hasCachedData: items.length > 0,
});

if (showSkeleton && (items.length === 0 || networkMode === 'force_skeleton')) {
  return (
    <SkeletonSchedulerView
      isOffline={isOffline}
      isTimedOut={isTimedOut}
      onRetry={retryCloudSync}
    />
  );
}
```

This guarantees:
- **Zero Raw Layout Exposure**: Headers, KPI cards, and buttons never render in an empty zero state during cold starts or skeleton inspection.
- **100% Visual Parity**: The skeleton wireframe matches the exact shapes, paddings, rounded corners, and column counts of the live screen.
- **Freeze Skeleton Mode Reliability**: When toggling `Freeze Skel` in the TopBar, developers and auditors see the complete, pixel-perfect structural wireframe across every single screen.

---

### 3. Localization Fix

In `MembershipSchedulerView.tsx`:
- Replace `t('schedule_new_session', language)` with `t('schedule_add_session', language)`.
- Ensure all 3 languages (French: *Ajouter un créneau / Vacation*, Arabic: *إضافة حصة أو وردية عمل*, English: *Add New Session / Shift*) display correctly with zero fallback leaks.

---

## Phased Implementation Plan

### Phase 1: Structural Skeletons Expansion (`src/components/ui/skeleton/`)
- Add `SkeletonPageHeader` component with customizable title, buttons, and switcher presets.
- Add `SkeletonSchedulerView` matching `MembershipSchedulerView` and session roster screens.
- Add `SkeletonPosRegister` matching the POS split catalog and checkout ticket.
- Add `SkeletonCalendarTimeline` matching appointment chairs, timetables, and venue timelines.
- Add `SkeletonKanbanPipeline` matching freelance deliverables and admissions funnels.
- Add `SkeletonFinanceAudit` matching financial dashboards and cashier logs.
- Refactor `SkeletonDashboardGym` in `MembershipDashboardView` to reflect the actual Dark Espresso turnstile pod and carousel layout.

### Phase 2: Membership & Appointment Category Screen Alignment
- Upgrade `MembershipSchedulerView.tsx` to wrap the entire screen in `SkeletonSchedulerView`, fixing the partial skeleton bug and the `schedule_new_session` i18n key.
- Upgrade `MembershipMembersView.tsx` and `MembershipRegistrationsView.tsx` to full-page skeletons including their top registration pods.
- Upgrade `AppointmentScheduleView.tsx`, `AppointmentClientsView.tsx`, and `AppointmentServicesView.tsx`.

### Phase 3: POS, Education, Venue & Remaining Verticals
- Upgrade `PosRegisterView.tsx` with `SkeletonPosRegister`.
- Upgrade `EducationTimetableView.tsx`, `EducationAttendanceView.tsx`, and `VenueTimelineView.tsx` with `SkeletonCalendarTimeline`.
- Upgrade `FreelanceDeliverablesView.tsx` and `EducationAdmissionsView.tsx` with `SkeletonKanbanPipeline`.
- Upgrade financial views across all categories with `SkeletonFinanceAudit`.

### Phase 4: Verification & Regression Testing
- Verify full-screen rendering under normal conditions (`networkMode === 'online'`).
- Verify full-page wireframes in freeze mode (`networkMode === 'force_skeleton'`).
- Run `npm test` across all 65 test suites to ensure zero business logic regressions.
- Run `npm run lint` and `compile_applet` for strict TypeScript and bundle validation.
