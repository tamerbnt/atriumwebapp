# Production-Ready Apple Rubber-Band Overscroll Engine

Architect and deploy a production-grade, 100% automated Apple rubber-band overscroll physics engine across Atrium OS. This architecture guarantees that **every scrollable container—both present and future—automatically inherits native Apple spring overscroll mechanics** without requiring manual component wrapping on every new screen.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> This revised plan establishes a **Three-Tier Universal Architecture** ensuring zero manual overhead for future development while providing micro-precision controls for specialized screens:
> 1. **Automated Global Interceptor**: Automatically detects any scrollable container in the DOM and binds Apple rubber-band physics. Future screens and lists require zero extra code.
> 2. **Hardware-Accelerated 120Hz Pipeline**: Uses CSS GPU transforms (`translate3d`) with spring-mass-damper physics run on `requestAnimationFrame`, maintaining 60fps/120fps ProMotion performance with zero layout reflows.
> 3. **Conflict-Free Gesture Safety**: Seamlessly coexists with Kanban card dragging, modal backdrops, and text selection using intelligent boundary detection.

- **Automated Future-Proofing**: A centralized provider (`AppleOverscrollProvider`) listens globally at the root layout and attaches to all scrollable elements dynamically via MutationObserver and delegated passive event listeners.
- **Physics Fidelity**: Exact Apple WebKit rational drag resistance formula ($b = \frac{x \cdot c \cdot d}{d + c \cdot x}$, $c = 0.55$) with an underdamped harmonic return spring ($\zeta = 0.85$, $k = 380$).
- **Selective Opt-Out**: Includes an escape hatch (`data-no-rubber-band`) for specialized drag-and-drop surfaces (e.g., Kanban boards or canvas sliders).

---

## 1. Overview & Core Concept

### What It Delivers
Every scroll area in Atrium OS—from the main viewport to dense data tables, modal dialogs, horizontal category strips, and Step 6's 160+ business catalog—behaves identically to iOS/macOS `UIScrollView`. When reaching the edge of content:
1. Dragging or scrolling further produces mechanical elastic resistance.
2. Releasing the gesture triggers a smooth damped harmonic spring bounce that settles into resting position.
3. Mid-bounce interaction preserves velocity with continuous physical momentum.

### Why Automated Global Interception?
In a large application with 16 distinct vertical industries (POS, Clinic, BTP, Salon, Education, Real Estate, Garage, Legal, Agriculture, etc.) and numerous nested sub-views, manually wrapping every container with a custom component is error-prone. The **Automated Global Interceptor** monitors the DOM tree dynamically, automatically applying the physics to:
- Any element with `overflow-y: auto`, `overflow-y: scroll`, `overflow-x: auto`, or `overflow-x: scroll`.
- Any dynamically loaded route, modal, popover, or third-party data grid.
- All future views created by developers without needing to import or configure anything.

---

## 2. Three-Tier Architectural Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Atrium OS Application Root                      │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  TIER 1: <AppleOverscrollProvider> (Universal Automatic Hook)   │   │
│   │  • Global delegated event listener for 'wheel' and 'touch'     │   │
│   │  • Detects nearest scroll container & checks boundary limits   │   │
│   │  • In-bounds: 100% native browser compositor scrolling         │   │
│   │  • At boundary: Engages Apple asymptotic resistance math       │   │
│   │  • On release: Executes 120Hz damped harmonic spring loop      │   │
│   │                                                                │   │
│   │  ──► APPLIES AUTOMATICALLY TO ALL CURRENT & FUTURE SCREENS! ◄──│   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                │                                       │
│          ┌─────────────────────┴──────────────────────┐                │
│          ▼                                            ▼                │
│  ┌───────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ TIER 2: Dedicated Component   │  │ TIER 3: Custom Hook            │ │
│  │ <AppleOverscrollContainer />  │  │ useAppleOverscroll(ref)        │ │
│  │ For fine-grained custom axis  │  │ For custom virtualized tables, │ │
│  │ (e.g. Step 6 Onboarding Tabs) │  │ canvas or complex SVG layouts  │ │
│  └───────────────────────────────┘  └────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Automated Global Engine (`AppleOverscrollProvider`)
- Mounted once in `src/App.tsx`.
- Intercepts boundary scroll events across the entire DOM tree.
- When an element reaches $scrollTop = 0$ and the user pulls downwards, or reaches $scrollTop = \text{scrollHeight} - \text{clientHeight}$ and pulls upwards, it transforms the target container's first child using GPU-accelerated `translate3d(0, y, 0)`.
- Restores resting state immediately via spring decay when momentum or touch ends.

### Tier 2: Explicit Container (`<AppleOverscrollContainer />`)
- Available in `src/components/common/AppleOverscrollContainer.tsx` for complex custom components that require custom axis settings (`horizontal`, `vertical`, `both`) or specific drag gestures.

### Tier 3: Declarative React Hook (`useAppleOverscroll`)
- For virtualized lists or bespoke components needing direct programmatic access to spring values and overscroll offsets.

---

## 3. Production Hardening & Physics Mathematics

### 1. The Elastic Resistance Equation
When pulling past the content boundary by raw distance $x$:
$$b = \frac{x \cdot c \cdot d}{d + c \cdot x}$$
- $x$ = raw input displacement in pixels
- $d$ = dimension of scroll container (height for vertical, width for horizontal)
- $c = 0.55$ = Apple's constant of resistance
- Maximum displacement is safely clamped to $48\text{px}$ on desktop and $72\text{px}$ on touch to prevent content detachment.

### 2. Damped Harmonic Return Spring
When input ends with offset $y_0$ and velocity $v_0$, the recovery position $y(t)$ follows:
$$y(t) = e^{-\gamma t} \left( y_0 \cos(\omega_d t) + \frac{v_0 + \gamma y_0}{\omega_d} \sin(\omega_d t) \right)$$
- Damping ratio $\zeta = 0.85$ (underdamped: provides an imperceptible 1–2px micro-cushion before resting).
- Angular frequency $\omega_0 = 24\text{ rad/s}$.
- Executed on `requestAnimationFrame` and stopped as soon as $|y| < 0.2\text{px}$ and $|v| < 0.1\text{px/s}$.

### 3. Trackpad vs. Wheel vs. Touch Discrimination
- **Touch**: Directly tracks `touches[0].clientY` deltas with passive listener attachment.
- **Trackpad (Smooth continuous deltas)**: Responds fluidly to trackpad inertia with immediate spring decay when deltas cease.
- **Step Mouse Wheel (Discrete notches)**: Applies a smooth velocity pulse that springs back within 220ms rather than a jarring jump.
- **Reduced Motion**: If `window.matchMedia('(prefers-reduced-motion: reduce)')` is true, the translation distance is dampened to zero, maintaining accessibility standards.

---

## 4. Complete Application Scope Matrix

The engine will automatically govern all surfaces across Atrium OS:

| Domain / View | Scroll Surface | Physics Direction |
| :--- | :--- | :--- |
| **Global Viewport** | `App.tsx` main content wrapper | Vertical |
| **Onboarding Step 6** | 160+ Business Catalog Grid | Vertical |
| **Onboarding Step 6** | 16-Vertical Sector Tabs | Horizontal |
| **Onboarding General** | Referral grid, frustration tiles, plan tiers | Vertical |
| **POS & Retail** | Product grid, inventory tables, receipt drawer | Vertical & Horizontal |
| **Medical Clinic** | Patient waiting queue, consultations, agenda | Vertical |
| **Beauty & Salons** | Stylist appointment calendar, service packs | Vertical & Horizontal |
| **BTP Contracting** | BOQ item devis, milestone sheets | Vertical |
| **Auto Garage** | Vehicle intake list, repair orders, parts | Vertical |
| **Agri-Business** | Crop parcel tables, livestock registries | Vertical |
| **Manufacturing** | BOM tree, batch production checklists | Vertical |
| **All Modals** | Command Palette, Member Modal, Voucher Modal | Vertical |
| **Navigation** | Mobile sidebar drawer, notifications dropdown | Vertical |
| **Future Screens** | Any future screen added in `src/components/screens/` | **Automatic (Inherited)** |

---

## 5. Technical Implementation Steps

1. **Create Universal Physics Utility (`src/utils/applePhysics.ts`)**:
   - Pure mathematical functions: `calculateRubberBandOffset(rawDelta, dimension, constant)` and `createSpringSimulator({ stiffness, damping, mass })`.
2. **Build Global Provider (`src/components/common/AppleOverscrollProvider.tsx`)**:
   - Universal delegated event listener for `wheel` and `touchstart`/`touchmove`/`touchend`.
   - Traverses event target up to nearest scroll container.
   - Computes overscroll transform and drives spring return on `requestAnimationFrame`.
3. **Build Component & Hook Primitives**:
   - `src/components/common/AppleOverscrollContainer.tsx`: Standalone container for explicit scoping.
   - `src/hooks/useAppleOverscroll.ts`: Hook for targeted ref binding.
4. **Mount in `App.tsx`**:
   - Wrap the main application shell with `<AppleOverscrollProvider>`.
5. **Targeted Enhancement on Step 6**:
   - Verify smooth horizontal rubber banding on the 16-vertical sector tabs and vertical rubber banding on the 160+ trade grid.
6. **Verification & Quality Gate**:
   - Run compilation and TypeScript verification.
   - Test mouse wheel, trackpad, and touch swipe gestures at boundary edges.
