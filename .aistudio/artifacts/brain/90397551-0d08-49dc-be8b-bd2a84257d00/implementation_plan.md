# Master Architecture & Implementation Plan: Atrium AppShell, Kinetic Sidebar & Auto-Hide TopBar with Sigana Typography

Integrate the official Atrium UI v3 **`AppShell`** and **`Sidebar`** motion system, incorporating the user's verified configuration choices:
1. **Sidebar Expansion**: Controlled by the kinetic terracotta handle (`edge`), clicking on the logo, or pressing `Esc` / clicking outside to fold back. One spring writes `--open` per frame, smoothly driving panel clip-path, pill stretch, and staggered text reveal with **zero page layout reflow**.
2. **Top Bar**: Fixed by default with an on-demand smooth scroll auto-hide toggle in settings/top bar. When active, scrolling down 48px smoothly slides the bar up and transitions the main card upward using a 2-transform spring write (zero per-frame layout recalculations). Restoring occurs on scrolling up 24px, hovering the 6px top edge, pressing Tab, or clicking the keyboard-accessible floating notch.
3. **Typography & Brand Identity**: Extraction and installation of the official **`Sigana Condensed`** native weight font (`fe38a9cce492388916733ccdfde72ee3.otf`) from `Sigana_v2__native_weight-html_52a7d343.zip`, paired with the exact golden-ratio geometric **`AtriumLogo`** mark.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been aligned with your preferences:
> - **Sidebar Expansion Trigger**: Click on the orange circular handle or click on the top logo lockup (with `expandOn="click"`). Esc and outside clicks reverse the spring smoothly with no layout reflow.
> - **Top Bar Initial Mode**: Fixed top bar initially (`autoHide={false}` / controlled by store state), with a dedicated toggle switch so you can enable the kinetic 48px auto-hide on demand.
> - **Brand Emblem Lockup**: Rendered using the official golden-ratio `AtriumLogo` (mark variant) combined with the authentic `Sigana Condensed` display wordmark (`ATRIUM`), matching the official Sigana v2 design sheet.

---

## 1. Overview & Core Concept

### What It Does
Replaces the bespoke CSS fixed sidebar and translated header with Atrium's unified, high-performance **`AppShell` + `Sidebar`** composite from the UI library (`src/atrium/components/Shell/`).

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                 APPSHELL                                  │
│  ┌──────────┬──────────────────────────────────────────────────────────┐  │
│  │          │ TOPBAR: [Breadcrumbs]      [Tools & Switcher]  [Profile] │  │
│  │          │ (rides transform -p·H on hide; 0 frames at rest)         │  │
│  │ SIDEBAR  ├──────────────────────────────────────────────────────────┤  │
│  │ RAIL     │                                                          │  │
│  │ (60px)   │ PAGE CARD (Scroll Container, --atr-r-card: 24px)         │  │
│  │          │                                                          │  │
│  │ Overlay  │  • Inner active route content (16 verticals)             │  │
│  │ Panel    │  • Smooth single-card scroll viewport                    │  │
│  │ (236px)  │  • Floating ScrollJumpPill bottom-anchored               │  │
│  │          │                                                          │  │
│  └──────────┴──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Performance & Motion Guarantees
- **Sidebar Rail (`--atr-rail: 60px`)**: The narrow icon rail is the **only element occupying grid layout space**. When expanded (`--atr-rail-open: 236px`), it draws an overlay clipped panel directly over the page canvas. The page width never shifts, icons remain fixed, and zero layout thrashing occurs.
- **Single Spring CSS Custom Property (`--open`)**: One spring animates from `0` to `1` (reaching ~`1.085` at the soft 8.5% overshoot). The clip path, active background pill stretch, staggered row text transitions (`calc((var(--open) - 0.28 - var(--i)*0.035)*2.4)`), and circular handle transform all derive directly in hardware-accelerated CSS.
- **Top Bar 2-Transform Spring (`BarBody`)**: On scroll down past 48px, the grid row flips once and the card/bar transforms cancel the visual jump, riding a smooth spring `p`. Per frame: exactly 2 transform writes, zero layout reads.
- **Zero Cost at Rest**: When the sidebar and top bar settle, `BarBody.onSleep()` drops transforms, scheduling unschedules from the centralized `requestAnimationFrame` loop, and the browser runs at **0 frames at rest**.

---

## 2. Typography & Brand Styling

### Sigana Condensed Font Integration
1. Extract `/assets/fe38a9cce492388916733ccdfde72ee3.otf` from `Sigana_v2__native_weight-html_52a7d343.zip` into `public/fonts/SiganaCondensed.otf`.
2. Register `@font-face` in `src/index.css`:
   ```css
   @font-face {
     font-family: 'Sigana Condensed';
     src: url('/fonts/SiganaCondensed.otf') format('opentype');
     font-display: swap;
   }
   ```
3. Set CSS token `--atr-font-brand: 'Sigana Condensed', 'Inter Tight', sans-serif;`.
4. Style the sidebar brand wordmark with exact letter tracking (`letter-spacing: 0.12em`), crisp uppercase geometry, and warm terracotta / cream tokens.

---

## 3. Technical Architecture & Integration Steps

### Step 1: Install Shell Components & Tokens into `src/atrium/`
- Extract `AppShell.tsx`, `AppShell.module.css`, `Sidebar.tsx`, `Sidebar.module.css`, and `shellBodies.ts` from `public/assets/aistudio/atrium-ui__3__10188223.zip` into `src/atrium/components/Shell/`.
- Update `src/atrium/index.ts` to export `Sidebar`, `SidebarProps`, `SidebarItem`, `AppShell`, `AppShellProps`.
- Update `src/atrium/styles/tokens.css` with the official shell tokens:
  - `--atr-r-card: 24px`
  - `--atr-rail: 60px`
  - `--atr-rail-open: 236px`
  - `--atr-bar-h: 52px`
  - `--atr-shell-gap: 12px`
  - `--atr-side: #151413`
  - `--atr-side-ink: #ece6e0`
  - `--atr-side-mut: #a39b93`
  - `--atr-side-hl: rgba(255, 255, 255, 0.07)`

### Step 2: Route & Vertical Navigation Mapping in `Sidebar`
- Refactor `src/components/layout/Sidebar.tsx` to wrap or utilize the kinetic `Sidebar` component:
  - Keep the full 16-vertical domain menu item resolution (`project_milestone`, `membership_session`, `pos_inventory`, `trading_commercial`, `medical_clinic`, `auto_garage`, `construction_contractor`, `agriculture_farming`, etc.).
  - Map items to `{ id, label, icon, badge }`.
  - Brand header with `AtriumLogo` (mark variant) + `Sigana Condensed` wordmark.
  - Clicking the logo opens the `VoucherModal` or toggles the sidebar expansion smoothly.
  - Support mobile drawer overlay while retaining desktop 60px rail layout physics.

### Step 3: TopBar Integration in `AppShell`
- Embed `TopBar` into `AppShell`'s `topbar` slot.
- Remove legacy wrapper margins and redundant fixed heights.
- Provide state control via `useAtriumStore` for `autoHide` (default `false` per user preference, with toggle support).
- Enable keyboard-accessible reveal button ("Show top bar") and top-edge 6px hover detection.

### Step 4: Page Content & Scroll Container Normalization
- Mount the active screen within `AppShell`'s children.
- Retain `AppleOverscrollProvider` and `ScrollJumpPill` targeting the unified card scroll container.
- Ensure modal dialogs (`CommandPaletteModal`, `MemberModal`, `VoucherModal`, `FastSwitchModal`, `DesktopUpgradeModal`, `ToastStack`) render at root level without clipping.

---

## 4. Verification & Testing Plan

1. **Automated Unit & Vitest Suites**:
   - Run `npm test` and `npm run test:atrium` to confirm all existing business logic, spring equations, and tokens tests pass.
2. **Build & Strict Typecheck**:
   - Run `compile_applet` and `lint_applet` (`tsc --noEmit`) to verify clean TypeScript compilation and module bundling.
3. **Motion & Layout Performance**:
   - Verify sidebar rail stays at `60px` and the page card does not shift or reflow when the panel expands to `236px`.
   - Verify `--open` animates with single-spring overshoot and returns to idle (0 frames).
   - Verify TopBar scroll auto-hide and top-edge hover-to-show transitions.
   - Verify Sigana Condensed renders cleanly on the wordmark in both light and dark themes.
