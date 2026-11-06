# Atrium ERP Performance Overhaul & Vertical Code-Splitting Architecture

Comprehensive plan to eliminate the monolithic 7.2MB un-split JavaScript bundle, optimize initial load times across all 16 business verticals, and implement zero-layout-shift Suspense boundaries backed by category-tailored structural skeletons.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The performance audit verified that 116 screens and 15+ heavy modals are statically bundled into a single 7,221 kB minified file. The decisions below were confirmed in Phase 1 and govern this overhaul:

- **Chunking Strategy**: Per-vertical bundling (`category-[name]`). Each of the 16 business verticals (Medical, Contractor, Auto Garage, Agriculture, Logistics, Legal, etc.) compiles into its own dedicated chunk. An operator logging into a Gym or Dental Clinic will never download code for agricultural weighbridges, BTP décomptes, or auto repair bays.
- **Loading State UX**: React `<Suspense>` boundaries paired directly with Atrium's pre-existing `StructuralSkeletons` component. Transitioning to an uncached category renders the exact geometric layout (Dark Espresso pods, triage queues, time slot columns) with zero Cumulative Layout Shift (CLS).
- **Modals & Print Engines**: On-demand lazy loading. Heavy statutory printable engines (`AlgeriePosteSfp01Modal`, `ContractorDecomptePrintModal`, `AgriWeighbridgePrintModal`, `PayslipPrintModal`, `DesktopUpgradeModal`, `CommandPaletteModal`) will only be fetched when explicitly triggered by user clicks.

---

## 1. Overview & Core Concept

- **Problem**: Every visitor downloads 116 full-featured screens, all 16 vertical domain calculation engines, and numerous printable document composers on initial page load, consuming 7.2 MB uncompressed (~1.5 MB gzipped). On 3G/4G or mobile tablets, this causes 2–4+ seconds of CPU parse latency and thread freezing.
- **Solution**: High-performance vertical-level code splitting via `React.lazy()` and Vite Rollup `manualChunks`, combined with permanent vendor caching and on-demand modal loading.
- **Target Audience**: All Atrium operators across all 16 verticals (Gym managers, Clinic receptionists, Garage technicians, BTP site engineers, Warehouse clerks), especially those on mobile devices, tablets, and variable cellular connections.
- **Key Value**:
  - Initial JS bundle drops from **~7,220 kB** to **~380–480 kB** (a **~93% reduction**).
  - Initial gzipped payload drops from **~1,487 kB** to **~100–140 kB**.
  - 1-line changes in one vertical (e.g. Legal Vault) will no longer invalidate cached assets for other verticals (e.g. POS or Gym).

---

## 2. User Experience & Visual Design

- **Seamless Route Transition**:
  - Navigating to a screen within the currently loaded vertical is instant (0ms delay, fully client-side).
  - When switching to a newly selected business vertical or cold-starting an unvisited category, React `<Suspense>` mounts `StructuralSkeletons` matching the target screen's exact pod layout (e.g., the 3-KPI elevated tray, Dark Espresso anchor, and data table headers).
  - The skeleton maintains exact margins and paddings, ensuring zero page jump when the chunk arrives.
- **Zero-Flicker Fast-Network Experience**:
  - The existing `useSkeletonLoading` debouncing floor ensures that fast chunk deliveries (<180ms) transition smoothly without visual flash.
- **Modal Responsiveness**:
  - Clicking a print action (e.g., "Imprimer Décompte" or "Bordereau ONIL") renders the modal with a light frosted backdrop while the ~15–30 kB modal chunk loads in parallel, then smoothly spring-fades in.

---

## 3. Key Product Decisions & Trade-Offs

- **Vertical-Level Chunks vs. Granular Per-Screen Chunks**:
  - *Chosen*: Grouping by business vertical (16 category chunks + vendor chunks).
  - *Rationale*: A user working in a specific vertical (e.g. Medical Clinic) regularly navigates between Patients, Agenda, Queue, and Billing. If every single screen were its own chunk, the user would experience repeated network fetches on every navigation tab click. By downloading the vertical bundle once, navigation between all screens in that vertical becomes instantaneous.
- **Vendor Splitting Strategy**:
  - *Chosen*: 4 distinct vendor chunks (`vendor-react`, `vendor-motion`, `vendor-icons`, `vendor-supabase`).
  - *Rationale*: React, Motion, and Lucide icons rarely change between applet feature deployments. By extracting them into separate chunks, browser HTTP cache stores them permanently across deployments.

---

## 4. Technical Architecture & Data Strategy

### System & Chunk Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INITIAL LOAD BUNDLE                             │
│                  Total Target: ~380 kB – 480 kB                        │
├──────────────────┬──────────────────┬─────────────────┬────────────────┤
│  entry: App.tsx  │  vendor-react    │  vendor-motion  │  vendor-icons  │
│  (Shell, Auth,   │  (react, dom)    │  (motion)       │  (lucide)      │
│   TopBar, Nav)   │  ~160 kB         │  ~85 kB         │  ~55 kB        │
└─────────┬────────┴─────────┬────────┴────────┬────────┴────────┬───────┘
          │                  │                 │                 │
          ▼                  ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    REACT SUSPENSE ROUTING BOUNDARY                     │
│           fallback: <StructuralSkeletons category={...} />             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ Dynamic import() on-demand
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               ON-DEMAND VERTICAL CHUNKS (~80–180 kB each)              │
├─────────────────────┬────────────────────┬─────────────────────────────┤
│ category-membership │ category-medical   │ category-contractor         │
│ category-appointment│ category-garage    │ category-agriculture        │
│ category-pos        │ category-realestate│ category-logistics          │
│ category-education  │ category-trading   │ category-legal              │
│ category-project    │ category-venue     │ category-manufacturing      │
│ category-freelance  │                    │                             │
└─────────────────────┴────────────────────┴─────────────────────────────┘
                                    │
                                    │ Triggered on click only
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LAZY ON-DEMAND MODALS & PRINT COMPOSERS                  │
├─────────────────────┬────────────────────┬─────────────────────────────┤
│ SFP01Modal (~22 kB) │ DecompteModal (~28)│ WeighbridgeModal (~20 kB)   │
│ DesktopUpgradeModal │ CommandPaletteModal│ OrdonnanceStudioModal (~26) │
└─────────────────────┴────────────────────┴─────────────────────────────┘
```

### Implementation Steps

1. **`vite.config.ts` Rollup Configuration**:
   - Add `build.rollupOptions.output.manualChunks` function:
     - Group `node_modules` into `vendor-react`, `vendor-motion`, `vendor-icons`, and `vendor-supabase`.
     - Group `/components/screens/{vertical}/*` into `category-{vertical}` chunks.
     - Group `/components/modals/*` and print modals into `async-modals`.
   - Set sensible chunk size limits (`chunkSizeWarningLimit: 600`).

2. **Modular Dynamic Screen Registry (`src/components/screens/registry.ts`)**:
   - Export lazy components for all 16 verticals using `React.lazy(() => import(...))`.
   - Ensure clean default/named export bridges.

3. **`src/App.tsx` Integration & Suspense Wiring**:
   - Replace all 116 static screen imports with lazy-loaded components from the registry.
   - Wrap the main `<main id="main-content-scroll">` view switcher in:
     ```tsx
     <React.Suspense fallback={<StructuralSkeletons category={currentBusiness.category} screen={activeScreen} />}>
       {renderActiveScreen()}
     </React.Suspense>
     ```
   - Wrap heavy modals (`CommandPaletteModal`, `DesktopUpgradeModal`, `VoucherModal`, `FastSwitchModal`, etc.) in conditional `<React.Suspense fallback={null}>` wrappers so their code is never downloaded until the modal opens.

4. **Verification & Metric Benchmarking**:
   - Run `npm run build` and inspect the generated chunks table.
   - Verify initial `index.js` drops below 500 kB.
   - Run full unit tests (`npm test` and `npm run test:atrium`) to confirm zero regressions.
   - Co-execute `compile_applet` and `lint_applet`.
