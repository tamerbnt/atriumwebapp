# Apple-Inspired Border & Surface Edge System

Upgrade the border, hairline, specular highlight, and elevation hierarchy across every business category, screen, pod, card, row, modal, drawer, and structural input following Apple interface guidance—strictly isolating branded buttons, preserving all corner radii and layouts, leaving every animation and behavior untouched, and maintaining zero performance overhead.

### User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed design choices remain locked in, strengthened with explicit guardrails ensuring zero impact on branded buttons, zero alteration to layout geometry or motion springs, and strict 60fps/120fps scrolling performance.

- **Confirmed Decision 1 — Outer Pods & Section Containers**: Framed against the main panel using an **ultra-faint translucent hairline** (`5%` warm ink in Light Mode, `6%` pure white in Dark Mode) so grouped trays separate naturally by surface tone without wireframe fences.
- **Confirmed Decision 2 — Dark Mode & Obsidian Surfaces**: Use a **top-lit white specular gradient** (`14%` white along the top rim fading smoothly to `4%` white along the bottom rim) across dark-mode pods, dark-mode cards, obsidian KPI showcase cards, and dark popovers/drawers.
- **Confirmed Decision 3 — Light Mode White Cards & List Rows**: Use a **6% warm-ink translucent hairline** combined with a lightweight **dual contact shadow** on stationary/grid cards—eliminating heavy opaque outlines while keeping dense scrolling rows crisp and fast.
- **Confirmed Decision 4 — Hover & Selection Feedback**: Hover shifts **elevation shadow depth and warm surface tone** cleanly without thickening or darkening border lines; active, selected, and keyboard `:focus-visible` states display a crisp **accent ring** (`1.5px–2px`) in place of the resting hairline.
- **Confirmed Guardrail — Isolation & Performance**: Branded buttons (liquid pills, primary accent CTAs, icon action buttons), spring animations, corner radii, component dimensions, and interactive logic remain 100% untouched.

---

### 1. Overview & Core Concept

- **What It Does**: Replaces flat, opaque, thermally inconsistent borders (`#E6DED6`, `#33302D`, `#27272A`, and ad-hoc neutral Tailwind gray borders) with an Apple-calibrated translucent edge and directional light hierarchy governed centrally by design tokens and the existing SVG squircle stroke overlay.
- **Target Audience & Context**: Every role and operator workspace across all 16 business categories (Home Bento screens, Dashboards, Operational Lists, Grids, Kanban boards, Billing Ledgers, Kiosks, Modals, Slide-In Drawers, and Settings) in Light Mode, Dark Mode, Compact density, and RTL Arabic.
- **Key Value**: Removes heavy "cards boxed inside boxed pods" visual noise, gives dark surfaces authentic top-lit anodized depth, keeps scrolling lists ultra-smooth at full frame rate, and guarantees visual unity without breaking a single button, layout metric, or interaction.

---

### 2. User Experience & Visual Design

- **Apple Surface & Border Hierarchy (5 Distinct Tiers)**:
  - **Tier 1 — Grouped Pods & Bento Trays**: Recessed surfaces (`#F3EDE7` light / `#141312` dark) bounded by an ultra-faint hairline (`rgba(23, 19, 15, 0.05)` light; subtle `rgba(255, 255, 255, 0.06)` or soft top-lit gradient in dark) so the tray visually recedes behind the cards inside it.
  - **Tier 2 — Elevated Cards & Grid Tiles**: Clean white (`#FFFFFF`) or elevated dark obsidian (`#1C1B1A` / `#1F1D1B`) cards carrying a `6%` warm-ink hairline in Light Mode (plus dual contact + ambient elevation) and a top-lit white specular rim (`14%` top → `4%` bottom) in Dark Mode.
  - **Tier 3 — Dark Obsidian Accent Cards on Light Mode & Overlays**: Showcase dark KPI cards, dark Home Bento tiles, floating popovers, modals, and slide-in drawers use the top-lit white specular gradient (`16%` top → `5%` bottom) paired with deep ambient drop elevation so they stand out crisply over bright or dark backdrops.
  - **Tier 4 — Dense List & Table Rows**: Crisp white or dark row islands separated by a `6%` warm-ink hairline (Light) or subtle translucent white rim (Dark) with **zero heavy filter shadows** on scrolling items—preserving crystal-clear scannability at 60fps–120fps.
  - **Tier 5 — Form Inputs, Search Bars & Neutral Outline Controls**: Slightly firmer tactile hairline (`9%` warm ink light / `11%` top-lit white dark) so interactive fields and segmented bars stay crisp and clearly clickable.

- **Strict Preservation of Branded Buttons, Radii & Layout**:
  - **Branded Buttons Untouched**: Liquid showpiece buttons (ink, cream, orange accent), primary filled CTAs (`#C9461F` / `#D4522F` / `#E8643F`), solid action icon buttons, empty-state action buttons, and liquid switch bodies retain their exact existing fills, liquid waves, stroke definitions, shadows, and press squish physics.
  - **Corner Radii & Spacing Unchanged**: Every `60%` continuous squircle radius token (`--r-app`, `--r-panel`, `--r-card`, `--r-table`, `--r-row`, `--r-ctl`, `--r-check`), padding, gap, and row height stays mathematically identical—zero reflow or pixel shift anywhere.
  - **Thermal Consistency**: Eliminates cool zinc/slate leaks (`#27272A`, `neutral-*`, `slate-*`) so every neutral edge stays strictly aligned with warm-ink (`23, 19, 15`) in Light Mode and pure white alpha (`255, 255, 255`) in Dark Mode.

- **Hover, Selection, Focus & Animation Safety**:
  - **Hover Transitions**: Stationary cards subtly warm their background tint and deepen elevation; scrolling rows subtly brighten/warm fill without mutating border width or triggering expensive filter animations.
  - **Selection & Keyboard Focus**: Active cards, checked rows, and `:focus-visible` controls switch cleanly to a `1.5px–2px` brand accent stroke and subtle accent fill tint (`6%–10%`) with zero layout jump.
  - **Motion Engine Isolation**: All spring transitions (sidebar glide, pod FLIP expansion/restore, kinetic row expansion/grid morph, search bar expand, dropdown/modal springs) run completely unchanged with zero extra work added inside animation frames.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Document-Shared SVG Gradient Sprite vs. Per-Element `<defs>` Gradients**
  - *Chosen Approach*: Mount a **single shared hidden SVG `<defs>` sprite** once at document root containing the static specular `<linearGradient>` definitions (dark card rim, dark pod rim, overlay rim), and reference them via CSS/SVG `url(#...)` only on surfaces opting into specular lighting.
  - *Why*: Injecting a unique `<linearGradient>` inside every card's SVG would duplicate hundreds of DOM nodes and gradient paint shaders across dashboards and lists. A single shared gradient sprite delivers true top-lit Apple specular rims across the whole app with **zero per-card DOM overhead**.
  - *Alternatives Considered*: Multiple stacked CSS `box-shadow` layers or nested `::before` pseudo-elements—rejected because CSS shadows get clipped by `60%` squircle `clip-path` masks and pseudo-elements interfere with liquid button ink ripples.

- **Decision 2 — Sub-Pixel Stroke Inset Precision (`0.6 × strokeWidth`) Without Layout Mutation**
  - *Chosen Approach*: Tune the SVG stroke path inset inside the squircle path generator by a tiny sub-pixel offset (`0.6 × strokeWidth`) so the stroke lies cleanly inside the `clip-path` mask edge, without modifying `clip-path` bounds or element box measurements.
  - *Why*: Eliminates sub-pixel anti-aliasing fringes along squircle corners and delivers sharp, optical hairline quality at both `1x` and Retina `2x` pixel ratios while keeping `measureBorderBox` dimensions 100% identical.

- **Decision 3 — Fast Paint Rules for Scrolling Rows & Animated Layers (Performance Guardrail)**
  - *Chosen Approach*: Never apply multi-pass CSS `filter: drop-shadow(...)` to virtualized/scrolling list rows (`content-visibility: auto`), table cells, or spring-animated transform layers; keep dual contact shadows strictly on stationary cards, grid tiles, and floating overlays, and never animate `filter` or mutate DOM attributes watched by `MutationObserver` on hover.
  - *Why*: `filter: drop-shadow` on hundreds of scrolling or animating nodes forces offscreen GPU texture allocations and shader passes that degrade scroll smoothness. Separating fast hairline rendering (for rows and spring layers) from stationary card shadows guarantees butter-smooth 60fps/120fps scrolling and animations.

- **Decision 4 — Safe Opt-In Cascade + Targeted Sweep of Opaque Overrides**
  - *Chosen Approach*: Define all translucent, specular, and divider tokens centrally first, scope neutral outline defaults away from branded buttons (`data-atr-liquid`, accent/ink buttons, `LiquidButton`), and sweep hardcoded `#E6DED6`, `#33302D`, `#27272A`, and raw Tailwind gray borders across containers, cards, modals, and drawers while leaving intentional semantic badges/states (selected, error, warning, success) intact.
  - *Why*: Centralizing the system ensures automatic consistency for all screens, while explicitly guarding branded buttons and semantic status highlights prevents unintended side effects.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Performance-Isolated Layering**:

```
┌──────────────────────────────────────────────────────────────────────┐
│              Central Border, Specular & Elevation Tokens             │
│  Light (Warm-Ink Alpha Ramp)    │  Dark (Pure White Specular Ramp)   │
│  • Pod Hairline (5% / 6%)       │  • Top-Lit Rim Gradient (14% → 4%) │
│  • Card Hairline (6%)           │  • Overlay Rim Gradient (16% → 5%) │
│  • Input / Control Edge (9%)    │  • Native Hairline Dividers (8%)   │
└─────────────────┬───────────────────────────────┬────────────────────┘
                  │                               │
                  ▼                               ▼
┌─────────────────────────────────┐ ┌──────────────────────────────────┐
│   Root Shared SVG <defs> Sprite │ │  Branded Button & Motion Guard   │
│   • 1 static hidden <svg> once  │ │  • Liquid / Primary CTAs exempt  │
│   • Zero per-card <defs> nodes  │ │  • Spring bodies untouched       │
│   • Shared url(#...) paint refs │ │  • Zero border-width layout shift│
└─────────────────┬───────────────┘ └──────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Squircle SVG Overlay Engine                        │
│  • Clean stroke inset (0.6 × strokeWidth) inside clip-path boundary  │
│  • Paint-only hover/focus via CSS variables (0 Resize/Mutation loops)│
│  • Fast non-filter rendering on scrolling rows & kinetic motion pods │
│  • Lightweight card/overlay elevation strictly on stationary tiles   │
└─────────────────┬────────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│        Universal Sweep: All 16 Categories, Primitives & Screens      │
│  • Shell Frame, Pods, KPI Banners, Bento Home, Dashboards, Modals    │
│  • Rows, Cards, Drawers, Inputs, Dividers (excluding branded buttons)│
└──────────────────────────────────────────────────────────────────────┘
```

- **Performance & Non-Regression Guarantees**:
  - **Zero `MutationObserver` / `ResizeObserver` Churn**: Hover, focus, and theme switches change CSS variables or stroke paint references cleanly—never mutating layout geometry, `border-width`, or observed squircle attributes.
  - **Zero Extra Offscreen Passes on Scrolling Lists**: Rows with `content-visibility: auto` and kinetic spring-translated items stay strictly shadow-free (`filter: none`), rendering crisp squircle hairlines on the existing single `<path>` overlay.
  - **Zero Branded Button Interference**: Filled accent/ink/liquid buttons keep their exact existing stroke suppression (`data-sq-border="none"` or brand fill styling), liquid ink layers, and shadows untouched.
  - **Verification Scope**: Full `tsc --noEmit`, Vite production build, existing Atrium motion/layout/UI Vitest suites, plus targeted CSS/DOM verification ensuring zero broken layouts, preserved branded button rendering, and zero legacy theme-clashing border overrides across all categories.
