# Master Architectural Specification & Implementation Plan: Universal Atrium Live Controls Integration (Revision 2)

Comprehensive engineering plan to adopt the **Atrium Live Controls** design system across all 16 business verticals, the TopBar navigation, filters, modal actions, and settings in Atrium ERP & CRM. It establishes 100% behavioral, visual, and mathematical parity with the reference HTML implementation while enforcing the brand accent **`#d4522f`**, guaranteeing zero memory leaks, and delivering smooth 60fps responsiveness through frame-rate governance.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following non-negotiable requirements and user-confirmed choices govern this implementation:
>
> 1. **Brand Accent Color Enforced (`#d4522f`)**:
>    - Primary Accent (`--atr-acc`): **`#d4522f`** (Light) / **`#e8643f`** (Dark).
>    - Accent Surface Highlight (`--atr-hl`): `rgba(212, 82, 47, 0.12)` (Light) / `rgba(232, 100, 63, 0.18)` (Dark).
>    - Accent Text & Border (`--atr-acc-text`): `#b03b1b` (Light) / `#ee7452` (Dark).
>    - Accent Quick Ripple (`--atr-accq`): `#e8643f` (Light) / `#f28a69` (Dark).
>    - Switch Body (`--atr-sw-body`): `#d4522f`.
> 2. **100% Behavioral Parity with Reference HTML**:
>    - **Button (`Vt` / `AtriumButton`)**: Cursor-origin circular liquid ripple expanding from pointer click coordinates $(p_x, p_y)$, magnetic translation nudging on hover (`bx`, `by`), press compression scale ($s_x: 1.03, s_y: 0.945$), and $0.28\text{s}$ click hold before settling.
>    - **Segmented Control (`In`)**: Asymmetric dual-springs ($R.k=420, L.k=200$ when advancing; $L.k=420, R.k=200$ when retreating) delivering genuine liquid stretch between tabs, with real-time `color-mix(in srgb, var(--atr-onacc) X%, var(--atr-ink))` dynamic text contrast blending.
>    - **Select & Menu Popovers (`ko` / `Jo`)**: Viewport collision detection (`am()`) with flip up/down, curtain clip-path reveal, spring chevron rotation ($0^\circ \to 180^\circ$), velocity-elongating magnetic highlight pill (`height += |v| * 0.03`), and 600ms buffer typeahead search.
>    - **Liquid Switch (`$o`)**: Fluid track with $\pm 60^\circ$ angular kick on toggle (`rot.kick(on ? 60 : -60)`), horizontal knob velocity squashing/stretching (`1 + |v| * 0.336`), and interactive pointer dragging across threshold.
>    - **Icon Button & Badge (`qi` / `lm`)**: Angular $360^\circ$ rotational spin on click (`kick="spin"`), pop-scale animation (`scale(1.35) -> 1.0`) on badge increment, and glowing status dot (`Ko`).
> 3. **Rollout Scope**: **Full Unified Rollout** across all 16 business verticals (Gym, Salon, Retail POS, Agency, Venue Rentals, Education, Freelance, Trading, Medical, Auto Garage, Real Estate, Manufacturing, Legal, Logistics, Construction, and Agriculture) and the global TopBar.
> 4. **Standard 34px Height**: Baseline height `--atr-h: 34px` with proportional squircle corner radius `--r: calc(var(--h) * 0.147) \approx 5.0px`.
> 5. **Zero Performance Leakage & Memory Defense**: Single global `requestAnimationFrame` loop with `WeakMap` object caching, event delegation on passive document listeners, automatic `isConnected` teardown on unmount, and clean `ResizeObserver` lifecycle management.

---

## 1. Overview & Core Concept

### What It Delivers
A complete modernization of Atrium's interactive controls, replacing static buttons, generic select dropdowns, standard segmented pills, and basic toggles with the tactile **Atrium Live Controls**:
- **Liquid Ripple Squircle Buttons (`LiveButton` / upgraded `AtriumButton`)**: Cursor-origin expanding clip-path ripples with magnetic displacement and press compression.
- **Elastic Asymmetric Segmented Controls (`LiveSegmentedControl`)**: Dual-spring tensioned background indicator with direction-dependent stiffness and dynamic `color-mix` contrast transitions.
- **Kinetic Portal Select (`LiveSelect`) & Action Menu (`LiveDropdownMenu`)**: Viewport-aware portal popover with smooth clip-path curtain entry and a velocity-elongating magnetic highlight pill.
- **Fluid Liquid Toggle Switch (`LiveSwitch`)**: Dual-pool clip-path toggle with $\pm 60^\circ$ rotational kick on the track and inertial horizontal knob squash/stretch.
- **Kinetic Icon Button (`LiveIconButton`)**: Squircle icon button with dynamic pop-scale notification badges and $360^\circ$ angular spring spin kicks.

---

## 2. Mathematical Physics & Behavioral Specification

Every component reproduces the exact mathematical formulas from the reference bundle:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ COMPONENT BEHAVIORAL MATRIX (Exact Parity with HTML Reference)                        │
├───────────────────┬───────────────────────────────┬────────────────────────────────────┤
│ Component         │ Spring Physics Configuration │ Interactive Micro-Behaviors        │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ Button (Vt)       │ x, y: k=260, z=0.8            │ • Tracks cursor relative (px, py)  │
│                   │ r: k=90, z=0.7                │ • Hover: clip-path: circle(r at xy)│
│                   │ sx, sy: k=360, z=0.618        │ • Press: scale(1.03, 0.945) squeeze│
│                   │ bx, by: k=230, z=0.618        │ • Click: 0.28s hold before settle  │
│                   │                               │ • Tones: accent, outline, soft, ok │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ Segmented Control │ Advancing: R.k=420, L.k=200   │ • Dual-spring asymmetric tension   │
│ (In)              │ Retreating: L.k=420, R.k=200  │ • Leading edge leads, trail elon-  │
│                   │ z=0.618 (Golden Ratio)        │   gates, creating liquid stretch   │
│                   │                               │ • Text color-mix contrast blend    │
│                   │                               │ • Full keyboard arrows + RTL       │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ Dropdown Select   │ lv (reveal): k=90, z=0.618    │ • Portal container to body         │
│ & Menu (ko / Jo)  │ hy (hover Y): k=420, z=0.55   │ • am() collision flip up/down      │
│                   │ hh (height): k=300, z=0.7     │ • Chevron rotates 0° to 180°       │
│                   │ ho (opacity): k=300, z=1.0    │ • Hover pill stretches on velocity │
│                   │                               │ • 600ms typeahead buffer           │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ Liquid Switch     │ L (pool left): k=200, z=0.618 │ • Track tube: height * 0.82        │
│ ($o)              │ R (pool right): k=420, z=0.618│ • rot.kick(±60°) track impulse     │
│                   │ rot (kick): k=140, z=0.5      │ • Knob squash: 1 + |v| * 0.336     │
│                   │ sc (press): k=360, z=0.618    │ • Interactive pointer drag gesture │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ Icon Button &     │ Badge pop: k=420, z=0.35      │ • Badge pops scale on increment    │
│ Badge (qi / lm)   │ Icon spin: k=60, z=0.7        │ • kick="spin" rotates icon 360°    │
│                   │                               │ • Status dot: --atr-ok emerald     │
└───────────────────┴───────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Design Tokens & Palette (Enforcing `#d4522f`)

The CSS variable suite will be injected into `src/index.css`, replacing legacy orange/terracotta references with the clean, sophisticated `#d4522f` tokens:

```css
:root, [data-theme="light"], [data-atrium-theme="light"] {
  --atr-bg: #f7f4f1;
  --atr-card: #ffffff;
  --atr-soft: #ede6e0;
  --atr-line: #e4dcd5;
  --atr-ink: #0a0a0a;
  --atr-mut: #6b645e;
  --atr-acc: #d4522f;          /* Enforced Brand Accent */
  --atr-onacc: #0a0a0a;
  --atr-accq: #e8643f;
  --atr-acc-text: #b03b1b;
  --atr-hl: rgba(212, 82, 47, 0.12);
  --atr-ok: #096b40;
  --atr-okbg: rgba(11, 122, 74, 0.12);
  --atr-okq: rgba(11, 122, 74, 0.22);
  --atr-danger: #c0283d;
  --atr-sw-body: #d4522f;
  --atr-sw-liquid: #f4ede6;
  --atr-sw-knob: #0a0a0a;
  --atr-shadow-pop: 0 14px 34px rgba(0, 0, 0, 0.22);
  --atr-h: 34px;
  --atr-radius-k: 0.147;
}

[data-theme="dark"], .dark, [data-atrium-theme="dark"] {
  --atr-bg: #1c1b1a;
  --atr-card: #262422;
  --atr-soft: #2d2b29;
  --atr-line: #3a3734;
  --atr-ink: #f2ece6;
  --atr-mut: #a79f97;
  --atr-acc: #e8643f;          /* Dark Terracotta Glow */
  --atr-onacc: #0a0a0a;
  --atr-accq: #f28a69;
  --atr-acc-text: #ee7452;
  --atr-hl: rgba(232, 100, 63, 0.18);
  --atr-ok: #5be3a3;
  --atr-okbg: rgba(91, 227, 163, 0.12);
  --atr-okq: rgba(91, 227, 163, 0.24);
  --atr-danger: #ff7a8a;
  --atr-sw-body: #d4522f;
  --atr-sw-liquid: #f4ede6;
  --atr-sw-knob: #0a0a0a;
  --atr-shadow-pop: 0 14px 34px rgba(0, 0, 0, 0.50);
  --atr-h: 34px;
  --atr-radius-k: 0.147;
}
```

---

## 4. Technical Architecture & Component Hierarchy

### System Hierarchy Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ATRIUM APPLICATION SHELL                                     │
│                                                                                                │
│   ┌────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ TOPBAR NAVIGATION                                                                      │   │
│   │ • Brand Logo (Fo: full)  • Facility Select (ko)  • Refresh / Bell / Kiosk (qi with lm) │   │
│   │ • Fast Role Switcher (In)• Account / Session Menu (Jo with Header & Separator)         │   │
│   └────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                │                                               │
│   ┌────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ SCREEN VIEWS (All 16 Verticals: Gym, Salon, POS, Agency, Medical, BTP, Logistics...)   │   │
│   ├────────────────────────────────────────────────────────────────────────────────────────┤   │
│   │ • Action Toolbars: Primary Accent Buttons (Vt) & Secondary Outline Buttons (Vt)        │   │
│   │ • View Mode Switchers: List / Grid / Calendar Toggles (In)                            │   │
│   │ • Time Horizon Filters: Today / Yesterday / Month (In)                                 │   │
│   │ • Status & Period Dropdowns: FilterSelect & Domain Filters (ko)                        │   │
│   │ • Guardian Cards: Live Fluid Activation Switches ($o)                                  │   │
│   └────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                │                                               │
│   ┌────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ MODALS & OVERLAYS (MemberModal, LeadModal, OrderModal, CashClosureModal...)            │   │
│   ├────────────────────────────────────────────────────────────────────────────────────────┤   │
│   │ • Modal Primary Save / Submit (Vt: accent #d4522f, 34px)                               │   │
│   │ • Modal Secondary Cancel (Vt: soft, 34px)                                              │   │
│   │ • Dropdown Form Selects (ko with anchor width matching)                                │   │
│   │ • Boolean Setting Toggles ($o with interactive drag & rotational track kick)           │   │
│   └────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                │                                               │
│   ┌────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ CORE ENGINE & FOUNDATIONS                                                              │   │
│   │ • `src/utils/atriumSprings.ts`: Closed-form damped springs & global rAF governor       │   │
│   │ • `src/index.css`: Exact `--atr-*` design tokens, squircle math, and dark theme styles │   │
│   │ • `src/components/ui/live/`: Reusable, accessible, strongly typed components           │   │
│   └────────────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phased Implementation Roadmap

### Phase 1: Spring Engine & CSS Token Foundation
- Create `src/utils/atriumSprings.ts` containing the closed-form spring solver `k`, frame governor `Ci`, motion tier subscriber `Pt`, and controller classes (`Vo`, `Li`, `Gi`, `Zi`, `Qo`).
- Update `src/index.css` with the `--atr-*` token suite for light & dark themes using `#d4522f`, squircle radius math (`--atr-radius-k: 0.147`), and layout styles.
- Verify zero compilation errors.

### Phase 2: Live Component Suite Construction
- Build in `src/components/ui/live/`:
  - `LiveButton.tsx`: With cursor-origin liquid ripple, magnetic hover displacement, press compression, and tones (`accent`, `outline`, `soft`, `success`).
  - `LiveSegmentedControl.tsx`: With dual-spring asymmetric stretching blob and `color-mix` contrast transitions.
  - `LiveSelect.tsx`: With portal popover, viewport edge detection (`am`), floating stretched hover pill `Gi`, and rotating chevron.
  - `LiveDropdownMenu.tsx`: Action/account menu with headers, separators, and destructive items.
  - `LiveSwitch.tsx`: Fluid toggle with track rotational kick ($\pm 60^\circ$), knob velocity stretch, and interactive pointer drag.
  - `LiveIconButton.tsx`: With pop badge `lm`, status dot `Ko`, and `kick="spin"` animation.
- Bridge existing `src/components/ui/AtriumButton.tsx` so existing callers automatically inherit the liquid ripple and magnetic squeeze.

### Phase 3: Global Shell & TopBar Modernization
- Upgrade `src/components/layout/TopBar.tsx`:
  - Replace the user profile trigger with `LiveDropdownMenu` (with user name, email header, fast staff lock, and sign-out).
  - Replace facility selector with `LiveSelect`.
  - Replace notification bell and refresh buttons with `LiveIconButton` featuring live numeric badge pop animation (`lm`) and spin kick (`qi`).
  - Replace staff/role fast switchers with `LiveSegmentedControl`.

### Phase 4: Full App-Wide Surface Migration (All 16 Verticals)
- **Dashboard Views & Toolbars**: Replace time filters (Today / Yesterday / Month) and category toggles across all 16 category dashboards with `LiveSegmentedControl`.
- **Universal Collections (`UniversalDataCollection.tsx`)**:
  - Replace List / Grid / Calendar switcher with `LiveSegmentedControl`.
  - Replace bulk action buttons and search triggers with `LiveButton`.
- **Filters & Dropdowns**: Replace `FilterSelect` and domain status filters across views with `LiveSelect`.
- **Modals & Settings**: Replace all modal action buttons (Save, Cancel, Delete) and boolean preferences in `SettingsScreen.tsx` with `LiveButton` and `LiveSwitch`.

### Phase 5: Verification & Zero-Leakage Audit
- Run strict TypeScript typechecking (`tsc --noEmit`) to verify 0 errors.
- Run complete unit test suite (`npm test`) to guarantee all 82 domain tests pass without regression.
- Validate dev server build (`compile_applet`) and verify smooth 60fps interaction with zero memory leaks.
