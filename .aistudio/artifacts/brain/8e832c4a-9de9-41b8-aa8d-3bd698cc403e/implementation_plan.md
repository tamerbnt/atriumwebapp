# Universal Skeleton Loading System & Network Resilience Architecture (Production Specification)

A production-ready skeleton loading framework and cloud offline-resilience architecture for Atrium ERP, engineered to handle all edge cases across every screen, modal, and operational category (Gym & Fitness, Salon & Beauty, Restaurant & Retail POS, Education & Academy, Wholesale B2B, Services, Real Estate, Automotive, Medical, Legal, and Manufacturing).

***

## User Review & Critical Decisions

> [!IMPORTANT]
> This revised plan incorporates comprehensive edge-case handling for enterprise production environments, resolving real-world challenges such as skeleton flicker on fast connections, stale-while-revalidate background sync, form mutation state preservation, network flapping, accessibility compliance, and layout shift.

- **Confirmed Decision 1 (Aesthetic & Polish)**: Subtle neutral gray base (`neutral-200/neutral-800`) with soft directional ambient wave. Strict anti-slop zero-pill discipline and compliance with `prefers-reduced-motion` (switches to static low-contrast tint for motion-sensitive users).
- **Confirmed Decision 2 (Stale-While-Revalidate vs Cold Start)**: Skeletons are reserved for cold starts (empty local cache). For returning screens with existing cache, cached data renders immediately with an unobtrusive background sync indicator ("Refreshing..."), eliminating redundant skeleton flashes.
- **Confirmed Decision 3 (Graceful Cloud Timeout & Retry)**: 3.5s watchdog timeout. If cloud data is unresolved or connection drops, skeletons smoothly settle into local cached data with an inline, non-blocking retry banner.
- **Confirmed Decision 4 (Interactive Dev Controls)**: Multi-state network simulator in the TopBar (`Online`, `Slow 3G [3s Delay]`, `Offline / Network Failure`, `Cold Start Skeleton Freeze`, and `Flapping Connection`).

***

## 1. Overview & Core Concept

### What It Delivers
A battle-tested loading and resilience architecture that provides visual continuity, zero layout shifts, and uninterrupted operations under any cloud network condition. Whether an operator is using high-speed fiber or intermittent 3G/4G on a tablet, the interface provides predictable, accessible, and responsive feedback.

### The 10 Production Edge Cases Handled

| Edge Case | Failure Mode (Without This Architecture) | Production Solution in This Architecture |
| :--- | :--- | :--- |
| **1. Flash of Skeleton (Flicker)** | Cloud responds in 50–150ms; skeleton renders for 1 frame, causing eye strain and flickering. | **180ms Debounce Threshold**: If cloud data resolves within 180ms, no skeleton is shown. If skeleton appears, a **300ms minimum display floor** prevents sub-frame flickers. |
| **2. Stale-While-Revalidate (SWR)** | Switching tabs repeatedly replaces visible operational data with jarring full-page skeletons. | **Cache-First Hydration**: If valid cached records exist in `store.ts`, render them instantly. Display a quiet inline sync indicator (`Refreshing...`) while checking cloud. |
| **3. Form Save vs Initial Load in Modals** | Slow connection during modal form submit replaces user input fields with skeleton boxes, destroying user state. | **Distinct State Machine**: `isInitialLoading` renders structural skeleton; `isSubmitting` keeps user inputs visible in read-only state with an action button spinner and timeout abort. |
| **4. Layout Shift (CLS)** | Skeletons don't match responsive breakpoints; mobile hides columns but skeletons render all columns, blowing out viewport width. | **Responsive Geometry Matching**: Skeletons inherit the exact column visibility classes (`hidden md:table-cell`, `flex: 2.2`, `minWidth`) and max row limits (6–8 rows). |
| **5. Independent Widget Loading** | A slow table blocks KPI stat pods that already arrived; entire page is locked. | **Granular Container Skeletons**: KPI pods, filter bars, and data collections have decoupled loading states. Completed widgets render while pending ones shimmer. |
| **6. Network Flapping & Reconnect Storms** | Intermittent Wi-Fi triggers hundreds of reconnect requests per second, thrashing Supabase/API. | **Debounced Event Listeners & Exponential Backoff**: Offline-to-online transitions debounce for 600ms; manual retry button enforces a 2s cooldown with loading spinner. |
| **7. Keyboard & Modal Focus Traps** | Focus trap breaks or focuses inaccessible skeleton placeholders while modal loads. | **Modal Skeleton A11y Contract**: Modal wrapper maintains focus on the Close button (`X`) or dialog root; skeleton content is `aria-hidden="true"`, preventing tab trapping. |
| **8. Accessibility (a11y) & Screen Readers** | Screen readers announce unhelpful empty divs or repeatedly announce pulsing elements. | **Live Region Announcements**: Outer container marked `role="status"` and `aria-busy="true"` with a single screen-reader announcement (`<span className="sr-only">Loading operational records...</span>`). |
| **9. Prefers Reduced Motion** | Users with vestibular disorders suffer disorientation from continuous shimmer pulses. | **CSS `@media (prefers-reduced-motion: reduce)`**: Shimmer gradient and pulse animations are automatically disabled in favor of a static subtle tint. |
| **10. Memory Leaks on Fast Route Unmount** | User navigates away while a 3.5s timeout or cloud fetch is active; console errors trigger. | **AbortController & Cleanup**: All timers and cloud promises are tied to React `useEffect` abort signals, cleanly terminating on component unmount. |

***

## 2. User Experience & Visual Design

### Lifecycle State Machine

```
                              [Screen / Route Navigation]
                                           │
                       ┌───────────────────┴───────────────────┐
                       ▼                                       ▼
            [Has Local Cached Data]                 [Empty Local Cache (Cold)]
                       │                                       │
                       ▼                                       ▼
          ┌───────────────────────────┐           ┌─────────────────────────────┐
          │  Instant Cached View      │           │  Start 180ms Delay Timer    │
          │  + Quiet Header Sync Dot  │           └──────────────┬──────────────┘
          └────────────┬──────────────┘                          │
                       │                        ┌────────────────┴────────────────┐
                       ▼                        ▼                                 ▼
              [Cloud Sync Completes]     [Data < 180ms]                   [Data > 180ms]
                       │                        │                                 │
                       ▼                        ▼                                 ▼
             [Silent Data Update]      [Direct Render (No Flicker)]     ┌───────────────────────┐
                                                                        │ Render Skeleton       │
                                                                        │ (Min 300ms Floor)     │
                                                                        └───────────┬───────────┘
                                                                                    │
                                                    ┌───────────────────────────────┴──────────────────────────────┐
                                                    ▼                                                              ▼
                                        [Cloud Data Arrives < 3.5s]                                    [Timeout reached / Offline]
                                                    │                                                              │
                                                    ▼                                                              ▼
                                       ┌─────────────────────────────┐                                ┌─────────────────────────────┐
                                       │ Smooth Cross-Fade to Live   │                                │ Transition to Local Cache   │
                                       │ (150ms opacity settle)      │                                │ + Top Inline Retry Banner   │
                                       └─────────────────────────────┘                                └──────────────┬──────────────┘
                                                                                                                     │
                                                                                                            [Click "Retry Sync"]
                                                                                                                     │
                                                                                                                     ▼
                                                                                                      ┌─────────────────────────────┐
                                                                                                      │ In-Flight Spin (2s Lockout) │
                                                                                                      └─────────────────────────────┘
```

### Visual Specifications
- **Base Surface**: Light: `bg-neutral-100 dark:bg-neutral-800/70` with soft contrast borders `border-neutral-200/50 dark:border-neutral-700/50`.
- **Shimmer Wave**: Clean linear sweep `bg-gradient-to-r from-transparent via-white/40 dark:via-neutral-700/40 to-transparent animate-shimmer`.
- **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, animation pauses and displays static `bg-neutral-200/80 dark:bg-neutral-800/80`.
- **Inline Retry Banner**: Unboxed amber hairline bar (`border-y border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 px-4 py-2 flex items-center justify-between`) featuring:
  - Status text: *"Offline / Cloud delayed · Using cached data · Last synced: [Time]"*
  - Interactive Action: *"Retry Sync"* button with 1-click debounce protection and inline spinner.

***

## 3. Key Product Decisions & Trade-Offs

### Decision 1: SWR Cache-First Rendering over Universal Cold Skeleton
- **Chosen Approach**: If local store contains cached records for a view, render cached records immediately upon view mount, with a top-right quiet status indicator. Only show skeletons when cache is empty (cold start) or user explicitly clicks "Hard Refresh".
- **Why**: Modern ERP users navigate between tabs (e.g. POS Register -> POS Inventory -> POS Register) multiple times per hour. Showing a skeleton every single time the user clicks a tab makes the application feel slow, even when data is already available in memory.
- **Alternatives Considered**: Forcing a 500ms skeleton on every navigation (rejected as poor UX).

### Decision 2: 180ms Debounce + 300ms Minimum Display Floor
- **Chosen Approach**: Implement a custom `useSkeletonLoading` hook that delays showing the skeleton for 180ms. If data loads within that window, zero skeleton is rendered. If data takes longer, the skeleton is shown and guaranteed to remain visible for at least 300ms before fading out.
- **Why**: Completely eliminates the jarring 20ms "flicker" common in naive skeleton implementations on fast local or cloud networks.

### Decision 3: Separation of Form Creation Loading vs Form Submission Loading
- **Chosen Approach**:
  - Modal Open (Initial): If reference data is loading, render `SkeletonModalForm`.
  - Modal Submit: If save request is in-flight, keep user-filled form visible, disable inputs, and change submit button into a loading state (`Saving...`) with a 10s cancellation watchdog.
- **Why**: Reverting an active form into a skeleton while saving destroys user trust (users fear their filled data was wiped).

***

## 4. Technical Architecture & Component Specifications

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           Network Resilience Layer                            │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     NetworkSimulationState (store.ts)                  │  │
│  │  - networkMode: 'online' | 'slow_3g' | 'offline' | 'force_skeleton'    │  │
│  │  - isCloudSyncing: boolean                                             │  │
│  │  - lastSyncedAt: string                                                │  │
│  │  - syncError: string | null                                            │  │
│  │  - retrySync: () => Promise<void>                                      │  │
│  └───────────────────────────────────┬────────────────────────────────────┘  │
│                                      │                                        │
│             ┌────────────────────────┴─────────────────────────┐              │
│             ▼                                                   ▼              │
│  ┌──────────────────────────────┐              ┌───────────────────────────┐  │
│  │   TopBar Dev Simulator       │              │    useSkeletonLoading     │  │
│  │   [Online · Slow · Offline]  │              │  - 180ms delay threshold  │  │
│  └──────────────────────────────┘              │  - 300ms minimum display  │  │
│                                                │  - 3.5s cloud timeout     │  │
│                                                └─────────────┬─────────────┘  │
└──────────────────────────────────────────────────────────────┼────────────────┘
                                                               │
                                                               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           UI Presentation Primitives                          │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Atomic Primitives: SkeletonBox · SkeletonText · SkeletonCircle          │  │
│  └───────────────────────────────────┬─────────────────────────────────────┘  │
│                                      │                                        │
│       ┌──────────────────────────────┼──────────────────────────────┐         │
│       ▼                              ▼                              ▼         │
│ ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────┐  │
│ │ SkeletonKpiGrid          │  │ UniversalDataCollection  │  │ Modal        │  │
│ │ (4-Card Metric Grid)     │  │ - SkeletonTable (rows)   │  │ (Skeleton-   │  │
│ │                          │  │ - SkeletonCardGrid       │  │  ModalForm)  │  │
│ └──────────────────────────┘  │ - OfflineRetryBanner     │  └──────────────┘  │
│                               └──────────────────────────┘                    │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                      Universal Application Coverage                           │
│                                                                               │
│ • Gym & Fitness: Members, Front Desk Kiosk, Scheduler, Subscriptions          │
│ • Salon & Beauty: Clients, Quick Chair Kiosk, Stylist Services, Payouts       │
│ • POS & Retail: Register, Inventory, Parked Orders, Cash Closure Modal        │
│ • Education & Academy: Students, Roll Call Kiosk, Cohorts, Admissions         │
│ • B2B & Wholesale Trading: Sales Docs, Purchases, Inventory, Directory        │
│ • Services, Venue, Medical, Legal, Garage, Real Estate, Manufacturing         │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Component & Hook Contracts

#### 1. `useSkeletonLoading` Hook (`src/hooks/useSkeletonLoading.ts`)
```typescript
interface UseSkeletonLoadingOptions {
  isLoading: boolean;
  delayMs?: number;        // Default: 180ms (avoids flicker on fast connections)
  minDisplayMs?: number;   // Default: 300ms (avoids sub-frame flashes)
  timeoutMs?: number;      // Default: 3500ms (graceful fallback trigger)
  hasCachedData?: boolean; // When true and offline, bypasses skeleton immediately
  onTimeout?: () => void;  // Callback when cloud watchdog fires
}

interface SkeletonLoadingResult {
  showSkeleton: boolean;   // Controlled flag to render skeleton
  isTimedOut: boolean;     // Whether cloud request exceeded watchdog threshold
  isOffline: boolean;      // Current online/offline connection status
}
```

#### 2. Atomic Skeletons (`src/components/ui/skeleton/SkeletonPrimitives.tsx`)
- `SkeletonBox`: Width, height, rounded radius, responsive classes, `aria-hidden="true"`.
- `SkeletonText`: Matches standard type scales (`xs`, `sm`, `base`, `lg`, `xl`).
- `SkeletonCircle`: Matches avatar and action button diameters (`w-8 h-8`, `w-10 h-10`).
- `SkeletonButton`: Preserves interactive button geometry without clickable handlers.

#### 3. Structural Skeletons (`src/components/ui/skeleton/StructuralSkeletons.tsx`)
- `SkeletonKpiGrid`: Generates a 2-to-4 column responsive grid with metric and label skeletons.
- `SkeletonTable`: Reads `ColumnDefinition<T>[]` to clone exact flex widths and responsive hiding classes.
- `SkeletonCardGrid`: Renders 6 responsive grid cards matching `CollectionGridCard`.
- `SkeletonKioskGrid`: Renders oversized touch tiles for Front Desk, Quick Chair, and Roll Call kiosks.
- `SkeletonModalForm`: Renders 2-column or 1-column input fields with action button footer.
- `OfflineRetryBanner`: Non-blocking warning strip with last-synced timestamp and active retry trigger.

#### 4. Enhancements to `UniversalDataCollection.tsx`
- New props:
  - `isLoading?: boolean`
  - `isOfflineFallback?: boolean`
  - `lastSyncedAt?: string`
  - `onRetrySync?: () => void`
  - `skeletonRowCount?: number` (Default: 6)
- Automatically switches between `SkeletonTable` and `SkeletonCardGrid` based on current `viewMode`.

#### 5. Enhancements to `Modal.tsx`
- New props:
  - `isLoading?: boolean`
  - `loadingText?: string`
- Renders `SkeletonModalForm` when `isLoading` is true while keeping the close button active and accessible.

***

## 5. Phased Implementation Plan

1. **Phase 1: Resilience Hook & Skeleton Primitives**
   - Create `src/hooks/useSkeletonLoading.ts` implementing 180ms delay, 300ms minimum display floor, and 3.5s watchdog timeout with `AbortController` cleanup.
   - Create `src/components/ui/skeleton/SkeletonPrimitives.tsx` and `StructuralSkeletons.tsx` with responsive layout matching, `@media (prefers-reduced-motion: reduce)`, and WCAG AA accessibility attributes.

2. **Phase 2: Universal Component Integration**
   - Upgrade `src/components/ui/collection/UniversalDataCollection.tsx` with native skeleton support, matching column dimensions and active view mode.
   - Upgrade `src/components/ui/Modal.tsx` with `isLoading` skeleton form presentation and focus trap management.
   - Build `src/components/common/OfflineRetryBanner.tsx`.

3. **Phase 3: Store State Expansion & Dev Simulation Controls**
   - Add `networkMode` (`online`, `slow_3g`, `offline`, `force_skeleton`), timeout tracking, and debounced retry handlers to `src/services/store.ts`.
   - Add the Dev Network Simulation switcher to `src/components/layout/TopBar.tsx`.

4. **Phase 4: Universal Category Screens & Kiosks Rollout**
   - **Gym & Fitness**: `MembershipDashboardView`, `MembershipMembersView`, `MembershipRegistrationsView`, `MembershipShopView`, `GymFrontDeskKiosk`.
   - **Salon & Beauty**: `AppointmentDashboardView`, `AppointmentClientsView`, `AppointmentScheduleView`, `AppointmentServicesView`, `SalonQuickChairKiosk`.
   - **POS & Retail**: `PosDashboardView`, `PosRegisterView`, `PosInventoryView`, `PosOrdersView`, `PosFinanceView`.
   - **Education & Academy**: `EducationDashboardView`, `EducationStudentsView`, `EducationCohortsView`, `EducationAdmissionsView`, `AcademyRollCallKiosk`.
   - **B2B Trading & Wholesale**: `TradingDashboardView`, `TradingSalesView`, `TradingPurchasesView`, `TradingInventoryView`, `TradingDirectoryView`.
   - **Other Verticals & Screens**: Freelance, Venue, Project, Legal, Medical, Garage, Real Estate, Manufacturing, and Analytics.
   - **All 12 Modals**: `AppointmentModal`, `MemberModal`, `LeadModal`, `VoucherModal`, `CashClosureModal`, `PinVerificationModal`, `CpcaDeadlineModal`, `NotaryDeedModal`, `DesktopUpgradeModal`, `CommandPaletteModal`, `FeatureBlueprintModal`, `GoogleOAuthGuideModal`.

5. **Phase 5: Verification & Edge Case Testing**
   - Validate 180ms delay prevents flicker on instant resolution.
   - Validate 3.5s timeout smoothly reveals cached data with retry banner under offline/slow modes.
   - Validate responsive column hiding matches between skeleton and live table.
   - Validate `prefers-reduced-motion` suppresses animations.
   - Run full TypeScript compilation (`compile_applet`) and automated test suites.
