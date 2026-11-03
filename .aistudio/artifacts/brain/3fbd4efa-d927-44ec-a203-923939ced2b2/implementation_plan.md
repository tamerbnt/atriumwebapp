# Atrium UI Component Library Integration & Control Audit

Integrate the official Atrium UI component library (`atrium-ui.zip`) into this enterprise management platform (Vite + React 19 + TypeScript SPA), audit and group every control in the codebase, wire tokens, themes, and physics animations, and migrate action controls across all views while preserving navigation pills and card containers.

> [!IMPORTANT]
> **User Review & Confirmed Critical Decisions**
> 1. **Vite SPA Runtime Integration**: As confirmed, Atrium tokens (`@/atrium/styles/tokens.css`) and the `data-atrium-theme` attribute are integrated into `src/index.css`, `src/main.tsx`, and `index.html` (synchronizing with the existing theme store).
> 2. **Phased Rollout Scope**: As confirmed, we present the full codebase control audit and classification upfront, then execute the migration across the core views and shared modals in an orderly batch, beginning with the Dashboard Header.
> 3. **Unit Test Runner**: Vitest will be configured in `package.json` with a dedicated test command to execute and pass all unit tests in `src/atrium/__tests__/` alongside the existing regression suite.
> 4. **Radius Token Location**: The base button radius token is `--atr-r-btn` defined in `src/atrium/styles/tokens.css`. Component styles strictly reference `--atr-r-btn`, `--atr-h`, and Atrium tone tokens without hardcoded border-radius overrides.

---

### Codebase Control Audit & Role Classification

Below is the comprehensive audit of all interactive elements across the platform, grouped strictly by rule:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ATRIUM CONTROL CLASSIFICATION                         │
├───────────────────────────────┬─────────────────────────────┬───────────────┤
│ 1. ACTIONS (Atrium Shape)     │ 2. NAV / FILTERS (Pills)    │ 3. CONTAINERS │
│ • Primary / Secondary Buttons │ • Segmented Period Filters  │ • Modal Shells│
│ • Export, Import, Scan        │ • Category / Tag Pills      │ • Data Cards  │
│ • Confirm, Save, Submit       │ • Date / Branch Selectors   │ • Drawers     │
│ • Icon Actions & Toggles      │ • Search Inputs & Avatars   │ • Sidebars    │
└───────────────────────────────┴─────────────────────────────┴───────────────┘
```

#### Group 1: ACTIONS (Migrated to Atrium Components)
These controls trigger business logic, mutations, long-running processes, or state toggles:
- **Dashboard Header**:
  - `dash-header-export-btn` (Export report) $\rightarrow$ `<LiquidButton kind="export" />`
  - Demo Data Seed trigger (`AtriumButton` outline) $\rightarrow$ `<Button tone="outline" size="sm">`
- **Global / TopBar & Header Controls**:
  - Dark/Light Theme Switch $\rightarrow$ `<Toggle />`
  - Language Selection & Quick Actions $\rightarrow$ `<Button tone="soft">` & `<IconButton>`
- **Shared Modals (CashClosure, PinVerification, StaffModal, LeadModal, MemberModal)**:
  - Submit / Validate / Encaisser $\rightarrow$ `<LiquidButton kind="confirm" />`
  - Annuler / Fermer $\rightarrow$ `<Button tone="outline" size="sm">`
  - Modal Icon Actions (Print, Export receipt) $\rightarrow$ `<IconButton>` / `<LiquidButton kind="export">`
- **14 Vertical Screen Views (Agriculture, BTP, Legal, Logistics, Manufacturing, Medical, Gym, POS, Agency, Real Estate, Trading, Venue, Education, Salon)**:
  - Primary Creation Actions ("Nouveau Dossier", "Créer Devis", "Nouvelle Récolte", "Lancer OF") $\rightarrow$ `<LiquidButton kind="create" />` or `<Button tone="accent">`
  - Document & Report Exports (PDF, CSV, ONIL, CACOBATPH, SFP-01) $\rightarrow$ `<LiquidButton kind="export">`
  - Barcode Scanners & Kiosks ("Scanner Code-barres", "Appeler Patient", "Pointer") $\rightarrow$ `<LiquidButton kind="scan">` or `<Button tone="accent">`
  - Inline Table Action Icons (Edit, Delete, Archive, Status toggles) $\rightarrow$ `<IconButton>` & `<Toggle />`

#### Group 2: NAVIGATION & FILTERS (Preserved Current Pill / Circle Shape)
These controls navigate between views, filter data collections, or select temporal ranges:
- **Period Pickers**: "Aujourd'hui", "7J", "30J", "Année" segmented pills (`LiveSegmentedControl`).
- **Tab Bars & Sub-Navigations**: View switchers, sub-module pills (e.g., "Général", "Historique", "Pièces Jointes").
- **Branch / Facility Selectors**: Branch switcher pill dropdowns in header.
- **Search Boxes & Chips**: Universal data search bar, active filter tag chips.
- **User Avatars & Profile Badges**: Circular avatars and initials capsules.

#### Group 3: CONTAINERS (Preserved Outer Geometry)
Structural surfaces that must NOT have their layout or corners modified:
- Left Sidebar navigation layout and collapsed track.
- TopBar layout frame and positioning.
- Data metric pods, analytical charts, dark espresso cards, and guardian cards.
- Modal backdrops, drawer panels, and table card envelopes.

---

### 1. Overview & Core Concept

- **What It Does**: Integrates the official `atrium-ui` library (`src/atrium/`) featuring fluid spring-based micro-interactions, liquid canvas shaders, and cohesive design tokens into the existing React 19 application.
- **Architecture**: A modular component hierarchy where Action elements inherit Atrium's physics engine (`src/atrium/motion/`) and token system (`tokens.css`), while retaining the application's enterprise UX density and responsive layouts.
- **Key Value**: Delivers tangible physical response on every user click, tactile feedback on asynchronous mutations, and seamless light/dark visual coherence.

---

### 2. User Experience & Visual Design

- **Aesthetic Direction**: High-density Swiss-editorial corporate minimalism with warm espresso accents (`#C4785A` / `--atr-acc`), subtle hairline borders (`--atr-bdr`), and organic spring responses.
- **Color Palette & Tokens**:
  - `--atr-acc`: Signature warm terracotta accent (`#C4785A`).
  - `--atr-bg-sub`: Subdued control background.
  - `--atr-bdr`: Crisp 1px hairline border tone.
  - `--atr-r-btn`: Universal button radius token (6px–8px precision curve).
  - Theme switching via `data-atrium-theme="light" | "dark"` attached to `<html>`.
- **Physical Feedback & Motion**:
  - Button depress depth with spring settling (`spring.ts`).
  - Asynchronous mutation transitions: `idle` $\rightarrow$ `busy` (morphing fluid loader) $\rightarrow$ `done` (organic check ring).
  - Export/Import progress ring driven by real mutation data states.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Component Unzipping & Path Alias**:
  - *Chosen Approach*: Extract `src/atrium/` directly from the archive into `/src/atrium/` and configure Vite path alias `@/atrium` $\rightarrow$ `/src/atrium`.
  - *Why*: Ensures 100% fidelity with the user's provided library structure without touching internal motion math.
- **Decision 2: Strict Control Separation**:
  - *Chosen Approach*: Apply Atrium components only to the ACTIONS group, strictly preserving NAVIGATION pills and CONTAINERS.
  - *Why*: Preserves established ergonomic muscle memory for filters and navigation while elevating all primary user actions.
- **Decision 3: Vitest Integration for Atrium Unit Tests**:
  - *Chosen Approach*: Configure `vitest` in devDependencies and add `"test:atrium": "vitest run src/atrium/__tests__"`.
  - *Why*: Allows `spring.test.ts`, `tokens.test.ts`, `position.test.ts`, and `showpiece.test.ts` to run natively with zero regressions.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        APP ARCHITECTURE & TOKENS                       │
├────────────────────────────────────────────────────────────────────────┤
│  <html data-atrium-theme="light|dark">                                 │
│    │                                                                   │
│    ├── src/atrium/styles/tokens.css (defines --atr-acc, --atr-r-btn)   │
│    │                                                                   │
│    ├── src/atrium/ (Components & Motion Engine)                        │
│    │    ├── Button, IconButton, Toggle, Select, Menu                   │
│    │    ├── LiquidButton, LiquidLoader, AtriumLogo                     │
│    │    └── motion/ (spring.ts, liquid.ts, wave.ts, loop.ts)           │
│    │                                                                   │
│    ├── src/components/ui/AtriumButton.tsx (unified bridge)             │
│    │                                                                   │
│    └── Business Screens (Dashboard, POS, Legal, Medical, Logistics)   │
│         └── Wired Handlers & Mutations (idle -> busy -> done)          │
└────────────────────────────────────────────────────────────────────────┘
```

#### Phased Execution Steps:
1. **Archive Extraction**: Unzip `/public/assets/aistudio/atrium-ui__2__fae0c7f0.zip` to a temporary directory and copy `src/atrium/` to `/src/atrium/`.
2. **Token & Theme Wiring**: Import tokens in `src/index.css` and bind `data-atrium-theme` in `src/main.tsx` and `src/services/store.ts`.
3. **Vitest Setup & Test Run**: Install vitest, copy unit tests from `src/atrium/__tests__/`, and verify test execution.
4. **Dashboard Header Migration**: Upgrade the export action to `<LiquidButton kind="export">` and demo data trigger to Atrium `<Button>`.
5. **Batch Action Control Migration**: Modernize buttons and switches across shared modals and the 14 vertical screens.
6. **Verification**: Run `npm run lint` (`tsc --noEmit`), `npm run build` (`vite build`), and the full test suite.
