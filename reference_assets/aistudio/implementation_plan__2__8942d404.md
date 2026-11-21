# Continuous 60% Squircle & Concentric Corner Radius System

Unifies every container, card, table, modal, drawer, and interactive control in Atrium onto a single continuous 60% squircle corner system with strict concentric nesting—while guaranteeing zero visual regressions, identical branded component behavior, zero performance degradation across all 116 screens, and sharper visual polish.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Pod Padding vs. Exact `28 − 12 = 16` Concentricity**
> In Phase 1, you asked us to adhere strictly to your original instructions and explain why keeping existing padding was initially recommended:
> - **Why keeping current padding was recommended**: Your original prompt stated *"Do not change colors, spacing, typography, layout or content."* Currently, dashboard and home pods use `16px–24px` padding (`20px–24px` on analytics pods, `16px–20px` on home pods). Keeping that padding leaves all spacing and layout metrics untouched, and under your Concentricity Rule (`gap >= 24px` allows decoupling), a `28px` pod (`--r-panel`) enclosing a `16px` card (`--r-card`) is decoupled on `24px`-padded desktop pods—though `16px–20px` padded pods would yield `28 − 16 = 12px` rather than `16px`.
> - **Adhering to your full token specification**: To adhere strictly to `--r-panel: 28px` (padding `12px`) → `--r-card: 16px` (`28 - 12 = 16`), pod inner padding is standardized to `12px` wherever cards nest directly inside a `28px` `--r-panel` pod so `inner = outer - gap` holds mathematically across all viewports.

- **Confirmed Decision 1 (Main Shell Frame)**: Apply `--r-app: 40px` to the main application content frame (decoupled from `28px` panels at `24px` outer spacing), while keeping the dark navigation sidebar as a `68px`-wide capsule (`34px` radius) housing concentric `44px` circular nav items (`12px` padding).
- **Confirmed Decision 2 (Physics & Liquid Controls)**: Apply 60% squircle geometry to **all** mapped controls—including regular/Atrium buttons, `LiquidButton` (Export/Create/Confirm/Continue), `Seek` expanding search, and `LiveSegmentedControl` / `Segmented` filter tracks & thumbs—with 100% behavioral parity.
- **Confirmed Decision 3 (Full Rollout Scope)**: Roll out across all screens, modals, drawers, empty states, tables, charts, settings, and auth/onboarding views across all 15 business verticals.

---

## 1. Overview & Core Concept

- **What It Does**: Establishes a single-source CSS radius token system (`--sq-smooth: 0.6`, `--r-app` through `--r-empty`) backed by a high-speed 60% squircle path engine (`clip-path: path(...)`, crisp SVG perimeter borders, and selective elevation), while preserving native `9999px` / `50%` capsules and circles where specified.
- **Zero-Regression Guarantee**: Directly eliminates all six failure modes from the previous attempt (vanished filter blobs, black active tab text, flooded dark-brown outline buttons, 90° borders from Tailwind overrides, square `box-shadow` halos, and detached hover slivers).
- **Performance & UX Guarantee**: Designed specifically for Atrium's scale (116 screens, dense kinetic lists, and live spring physics) so scrolling, filtering, hovering, and list-to-grid morphing stay locked at 60/120fps—and look even cleaner at 300% zoom, in Dark mode, and in RTL Arabic.

---

## 2. User Experience & Visual Design

### Eliminating Every Previous Visual Failure

| Previous Visual Failure | Root Cause in Earlier Attempt | Guaranteed Prevention Strategy |
|---|---|---|
| Missing orange sliding blob & unreadable black active filter text | Solid `::after` fill painted above the sliding `.s` blob; zeroing `border-radius` broke blob radius measurement | Isolate track stacking (`isolation: isolate`), keep background/border strictly behind `.s` (`z-index: -1`), and read `--r-thumb: 9px` directly from CSS tokens |
| Sharp 90° rectangular borders on pods, workspace cards, and *Actions rapides* | Tailwind `!border-*` and `hover:border-*` utilities overrode transparent borders while `border-radius` was `0` | Force CSS `border-color: transparent` whenever squircle geometry is active; draw the crisp 1px border (including hover color transitions) via a dedicated SVG `<path stroke>` overlay |
| *Actions rapides* outline button flooded dark brown + bleeding circle | Solid-filled `::before` showed through the transparent outline fill and collided with `overflow: hidden` + `.lq` liquid ripple | Never use solid-filled `::before` behind `::after` on buttons; keep `overflow: hidden` clipped to the squircle outer `clip-path`, render outline/soft borders via SVG `fill="none"` stroke, and keep `.lq` undisturbed |
| Square shadow boxes around KPI cards | `box-shadow` ignores `clip-path` and traces the `border-radius: 0` rectangle | Suppress `box-shadow` on all squircled elements; apply `filter: drop-shadow(...)` only on an unclipped parent elevation wrapper for elevated surfaces |
| Detached corner slivers on home anchor/preview cards | Global `<button>` liquid injection (`data-atr-lq`) collided with pseudo-element clipping layers | Keep outer squircle clipping cleanly separated from inner liquid/wave overlays so no sliver ever escapes |
| Broken or missing dashed borders on empty states | Solid `::before` `clip-path` cannot render dashed strokes | Render dashed `--r-empty: 12px` borders using SVG `<path stroke-dasharray="..." />` |

### Concentric Radius & Shape Token Map

- **Squircle Tokens (`--sq-smooth: 0.6`, exact Figma 60% smoothing construction)**:
  - `--r-app: 40px` — Main application content shell (decoupled from `28px` panels at `24px` spacing)
  - `--r-panel: 28px` — Pods holding cards (e.g., *Revenus et rétention*, *Pouls & Raccourcis*, *Espaces du Club*, modals), `12px` padding
  - `--r-card: 16px` — Cards inside a panel (`28 - 12 = 16`: KPI, chart, workspace preview, dark anchor/kiosk cards)
  - `--r-table: 20px` — Table/collection container card, `8px` padding
  - `--r-row: 12px` — Table row hover/selected state and kinetic rows (`20 - 8 = 12`)
  - `--r-ctl: 12px` — Standard `40px` controls (primary/secondary/outline buttons, *Exporter*, *Ajouter*, *Filtres*, *Actions rapides*, search field, inputs, segmented filter & view-toggle container with `3px` padding)
  - `--r-ctl-sm: 10px` — Compact `32px` buttons (empty-state actions, compact controls)
  - `--r-thumb: 9px` — Segmented filter thumb & view-toggle thumb (`12 - 3 = 9`)
  - `--r-tile: 12px` — `40px` icon tiles (~30% of side)
  - `--r-tile-lg: 15px` — `48px` page-header icon tiles
  - `--r-check: 6px` — `20px` checkboxes
  - `--r-empty: 12px` — Dashed empty-state boxes
- **Plain Capsule / Circle Tokens (`border-radius: 9999px` / `50%`, zero smoothing)**:
  - Status badges and pills (`height: 24px`), count badges, top-bar breadcrumb/search/user/catalog chips (`height: 40px` / `32–34px`), circular icon buttons, avatars, arrow circle buttons, sidebar capsule (`68px` wide, `34px` radius, `44px` circular nav items with `12px` padding), and progress bars.

### Preserved Branded Behavior & UX Improvements

- **100% Behavioral Parity Across Branded Controls**:
  - *Buttons (`AtriumButton` / `LiveButton`)*: Pointer-origin circular liquid flood, directional lean, squash-and-stretch press, click hold, and tone contrast behave identically.
  - *Liquid Showpiece (`LiquidButton`)*: All 6 modes (*Scan*, *Import*, *Export*, *Confirm*, *Continue*, *Create*), 32-node surface wave, falling drops, pouring necks, weighted checkmark pen, and idle corner twitch run identically inside the SVG—upgraded from rounded `<rect>` to a true 60% squircle SVG `<path>`.
  - *Segmented Filters (`LiveSegmentedControl` / `Segmented`)*: Dual-spring asymmetric blob stretch (`k=420` leading / `k=200` trailing), live `color-mix` text inversion, RTL arrow navigation, and badge counts work identically.
  - *Expanding Search (`Seek`)*: Smooth single-object width expansion (`40px ↔ 240px`) with frame-synced squircle path updates so corners stay silky during motion.
  - *Kinetic Lists & Popovers*: List-to-grid row morphing, hover action fans, slide-over drawers, and curtain-bloom dropdown menus preserve every spring curve and timing.
- **Concrete UX Polish Improvements**:
  - *Unified Focus Rings*: Keyboard `focus-visible` rings trace the squircle contour cleanly instead of showing mismatched rectangular outlines.
  - *Crisper Hairline Borders in Dark Mode & High DPI*: `vector-effect="non-scaling-stroke"` SVG borders avoid sub-pixel corner fuzziness and seam gaps at 300% zoom.
  - *Instant Theme & Locale Transitions*: Theme switches (Light/Dark) and font swaps (French/English/Arabic `Cairo`) update border strokes via CSS custom properties (`currentColor` / `var(--...)`) with zero path recomputation needed for color/hover changes.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Non-Invasive SVG Border Ring + `clip-path: path(...)` Instead of Solid `::before` Behind `::after`**
  - *Chosen Approach*: Clip element surfaces with `clip-path: path(...)` and render 1px solid or dashed borders using an ultra-lightweight `pointer-events: none` SVG stroke layer (or negative-`z-index` isolated fill only on opaque non-button containers), while setting CSS `border-color: transparent` and `box-shadow: none`.
  - *Why*: Completely prevents border-color bleed on transparent outline buttons, blocks Tailwind `!border-*` / `hover:border-*` overrides from drawing 90° rectangles, supports dashed empty states, and keeps hover/active changes strictly CSS-variable driven (never recomputing geometry on hover).
  - *Alternatives Considered*: Solid `::before` (`inset: -1px`) behind `::after` (caused flooded buttons, hidden filter blobs, and rectangular border artifacts) and CSS `corner-shape` (unsupported outside Chromium and uses `superellipse(2)` rather than 60% smoothing).

- **Decision 2 — Performance-Budgeted Singleton Observer, Read/Write Batching & Path Cache**
  - *Chosen Approach*: Route all squircle sizing through **one shared `ResizeObserver`**, a **batched read-then-write `requestAnimationFrame` scheduler**, and an **in-memory path string memoization cache** keyed by `(roundedWidth, roundedHeight, radius, smoothing)`.
  - *Why*: Atrium renders dense collections (50+ kinetic rows, 19+ chart cards, dozens of checkboxes and tiles). Naive per-element `ResizeObserver` instances and interleaved DOM reads/writes cause severe layout thrash; batching + caching reduces repeated trigonometry to a single O(1) map lookup and prevents redundant style writes when pixel dimensions haven't changed.

- **Decision 3 — Selective `filter: drop-shadow` Only on Elevated Surfaces**
  - *Chosen Approach*: Apply `filter: drop-shadow(...)` exclusively on an unclipped outer wrapper for surfaces that actually carry elevation (modals, popover menus, floating bulk bar, and elevated cards), and **omit** `filter: drop-shadow` from static pods, buttons at rest, kinetic rows, tiles, checkboxes, and the full-viewport `AppShell` container.
  - *Why*: Unbounded `filter: drop-shadow` on large or scrolling GPU layers forces expensive offscreen render passes and hurts scroll/animation FPS. Selective application gives squircle-accurate shadows where depth matters while keeping scrolling and kinetic animations effortless.

- **Decision 4 — Native In-SVG & Isolated-Stacking Integration for Animated Primitives**
  - *Chosen Approach*: Keep `LiquidButton` squircled inside its own `<svg>` vessel, `LiveSegmentedControl`/`Segmented` squircled on an isolated track behind the `.s` spring blob, and `Seek` synced smoothly during width transitions—never overriding `Panel` curtain `clip-path: inset(...)` or `KineticRow` transform springs.
  - *Why*: Preserves 100% of Atrium's signature motion choreography without frame lag or visual clipping glitches.

---

## 4. Technical Architecture & Performance Strategy

### System & Performance Pipeline

```
┌───────────────────────────────────────────────────────────────────────────┐
│                 Single-Source Radius & Smoothing Tokens                   │
│  --sq-smooth: 0.6 │ --r-app: 40 │ --r-panel: 28 │ --r-card: 16            │
│  --r-table: 20    │ --r-row: 12 │ --r-ctl: 12   │ --r-ctl-sm: 10          │
│  --r-thumb: 9     │ --r-tile:12 │ --r-tile-lg:15│ --r-check: 6 │ empty:12 │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│           Fast Squircle Geometry Engine + LRU Path Cache                  │
│  • Key: `${w}x${h}x${r}x${s}` -> O(1) reuse across identical rows/cards   │
│  • Figma 60% math: budget B=min(w,h)/2, p=min((1+s)*r,B), cubic+arc       │
│  • Skips 0x0 / hidden nodes & no-op integer dimension repeats             │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        ▼                                                         ▼
┌─────────────────────────────────────────┐ ┌───────────────────────────────┐
│  Batched Frame Scheduler (Zero Thrash)  │ │  Animated Primitive Adapters  │
│  1. Singleton ResizeObserver +          │ │  • LiquidButton: In-SVG path  │
│     document.fonts.ready trigger        │ │  • Segmented: isolation +     │
│  2. Phase A (Read all w/h together)     │ │    z-index:-1 track, --r-thumb│
│  3. Phase B (Write clip-path + SVG d    │ │  • Atrium/LiveButton: outer   │
│     + clear fallback border-radius: 0)  │ │    clip + SVG stroke, .lq safe│
│  4. Hover/theme swaps touch CSS vars    │ │  • Seek: rAF-synced transition│
│     only (zero JS math on hover/scroll) │ │  • Capsules/Circles: untouched│
└─────────────────────────────────────────┘ └───────────────────────────────┘
```

### Rollout & Verification Strategy

- **Phase A — Token Normalization & Cached Squircle Engine**:
  - Introduce the `--sq-smooth` and `--r-*` token set globally, build the pure 60% squircle path generator with dimension-keyed memoization, singleton `ResizeObserver`, `document.fonts.ready` resync, and batched read/write frame loop.
  - Unit-test the math kernel (corner budgets, arc continuity, extreme aspect ratios, cache hits) and verify zero layout thrash.
- **Phase B — Shell, Pods, Cards, Tables & Empty States**:
  - Migrate the main `AppShell` (`--r-app: 40px`) and `Sidebar` (`68px` capsule / `34px` radius / `44px` circular items / `12px` padding), then migrate Pods (`--r-panel: 28px`, `12px` card-grid padding), Cards (`--r-card: 16px`), Tables (`--r-table: 20px`, `8px` padding) & Rows (`--r-row: 12px`), Checkboxes (`--r-check: 6px`), Icon Tiles (`--r-tile: 12px` / `--r-tile-lg: 15px`), Empty States (`--r-empty: 12px` dashed SVG border), Modals, and Drawers.
  - Ensure every squircled node clears `box-shadow` and native `border-color`, using unclipped wrapper `filter: drop-shadow` strictly on elevated layers.
- **Phase C — Branded Physics & Filter Controls**:
  - Migrate `AtriumButton` / `LiveButton` / toolbar buttons (`--r-ctl: 12px`, `--r-ctl-sm: 10px`), `LiveSegmentedControl` & `Segmented` (`--r-ctl: 12px` track / `--r-thumb: 9px` blob), `LiquidButton` (in-SVG squircle vessel), `Seek` (smoothly synced `--r-ctl: 12px`), and `Menu` / `PopoverPanel` while verifying frame-for-frame behavioral parity.
- **Phase D — Full-App Sweep & Performance/Visual Audit**:
  - Eliminate all remaining hard-coded pixel radii across all 15 business verticals, Settings, Kiosks, and Auth/Onboarding screens.
  - Verify at 300% zoom, Light/Dark themes, LTR/RTL locales, hover/press/disabled/loading states, and scroll/filter frame times, followed by `compile_applet`, `lint_applet`, and Vitest checks.
