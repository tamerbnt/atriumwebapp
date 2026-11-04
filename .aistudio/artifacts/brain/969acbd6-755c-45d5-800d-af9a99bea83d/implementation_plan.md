# Single-Row Command Toolbar & Progressive Filter Architecture

Unify the toolbar in the **Adhérents (Membership)** screen into a disciplined, single-row command center inspired by enterprise leaders (Linear, Stripe, and Shopify). Eliminate awkward multi-row wrapping by displaying high-frequency controls upfront (Search and primary status tabs), moving secondary criteria into an on-demand **Floating Filter Popover** with active filter capsules, and consolidating utilities (View Switcher, CSV Export, Fullscreen) into a right-aligned cluster.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following layout and interaction decisions were confirmed during Phase 1 clarification:

- **Confirmed Decision 1 (Single-Row Toolbar Structure)**: All controls are arranged in a single horizontal row (`flex items-center justify-between gap-3 flex-nowrap`):
  - **Left / Center**: Search input (`Seek`) + streamlined quick status tabs + **"Filtres" (Filters)** button with dynamic badge counter.
  - **Right**: Compact utility group containing the View Switcher (`List` / `Grid`), CSV Export icon button, Fullscreen toggle, and quick actions.
- **Confirmed Decision 2 (Progressive Disclosure via Floating Popover)**: Advanced criteria—specifically the **Plan/Formule dropdown** (`Select`), expiration intervals, and suspended/archived statuses—are housed inside an authentic Atrium floating popover (`LiquidPanel`) that opens when clicking the "Filtres" button.
- **Confirmed Decision 3 (Active Filter Capsules)**: When any advanced filter is applied (e.g., Plan = "Gold Pro"), a removable Atrium squircle filter chip appears adjacent to the filter button with a quick clear (`✕`) affordance. A global "Réinitialiser" (Reset) action restores default views.
- **Confirmed Decision 4 (Integrated View Mode Switcher)**: The detached view toggle (`UniversalDataCollection` header) is consolidated directly into the right utility cluster on the master toolbar, saving vertical space and eliminating orphaned buttons.

---

## 1. Overview & Core Concept

- **What It Does**: Resolves the toolbar clutter and wrapping captured in user testing (where search, a wide 5-tab segmented control, plan dropdown, CSV button, and fullscreen icon fragmented across 2–3 rows). It establishes a progressive disclosure model where operators immediately see core states, while deeper filtering criteria are revealed on demand without layout breakage.
- **Target Audience / Persona**: Facility front-desk managers and membership administrators handling hundreds of accounts daily who need high-density, zero-jitter scanning and single-click access.
- **Key Value**: Delivers 100% single-row layout stability across viewport sizes, eliminates visual noise, and provides clean filter breadcrumbs when filtering data.

---

## 2. User Experience & Visual Design

### Proposed Single-Row Layout Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MEMBERS MASTER TABLE CONTAINER                                                                         │
│                                                                                                        │
│ ┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────────────────┐ │
│ │ ZONE 1: DISCOVERY & PRIMARY TABS             │  │ ZONE 2: INTEGRATED UTILITY GROUP                 │ │
│ │                                              │  │                                                  │ │
│ │ [🔍 Seek 40px]  [Tous (2) │ Actifs (2) │ ⚠️] │  │ [⚡ Filtres (1) ▾]  [▤ │ ⊞]  [📥 CSV]  [⛶ Expand]│ │
│ └──────────────────────────────────────────────┘  └──────────────────────────────────────────────────┘ │
│                                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ACTIVE FILTER CAPSULES (Only visible when advanced filters are active)                             │ │
│ │ [Formule: VIP 1 Mois  ✕]   [À renouveler: <14j  ✕]   [Effacer tous les filtres]                    │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ FLOATING FILTER POPOVER (Atrium LiquidPanel, triggers from [Filtres ▾])                            │ │
│ │ ┌────────────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ FILTRES AVANCÉS                                                         [Réinitialiser]        │ │ │
│ │ │                                                                                                │ │ │
│ │ │ Formule d'abonnement:                                                                          │ │ │
│ │ │ [Atrium Select: Toutes les formules ▾]                                                         │ │ │
│ │ │                                                                                                │ │ │
│ │ │ Statut du compte:                                                                              │ │ │
│ │ │ ( ) Tous   (•) Actifs   ( ) Expirant bientôt   ( ) Expirés   ( ) Suspendus                     │ │ │
│ │ │                                                                                                │ │ │
│ │ │ Trier par:                                                                                     │ │ │
│ │ │ [Nom d'adhérent ▾]   [Date d'échéance ▾]   [Solde ▾]                                           │ │ │
│ │ │                                                                                                │ │ │
│ │ │ [Appliquer les filtres (40px Atrium Button)]                                                   │ │ │
│ │ └────────────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                        │
│ DATA COLLECTION TABLE / GRID CARDS...                                                                  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Visual Styling & Theme Tokens

- **Control Height & Geometry**: Strict **40px standard squircle** (`--atr-h: 40px`, `r = 5.9px`) across all controls in the row (Seek input, segmented buttons, filter button, view switcher, export icon, fullscreen icon).
- **Streamlined Status Tabs**:
  - Main segmented strip retains the 3 primary operational views: **Tous** (All), **Actifs** (Active), and **À renouveler** (Expiring Soon).
  - Secondary historical filters (**Expirés**, **Suspendus/Archivés**) are accessible via the **Filtres** popover, keeping the primary tab strip under 320px width.
- **Filter Popover (`LiquidPanel`)**:
  - Anchored directly under the `[Filtres ▾]` button.
  - Surface: `var(--color-surface-bg)` with subtle 1px hairline border (`var(--color-border)`), soft elevation shadow, and backdrop refraction blur.
  - Interactive controls inside use Atrium `Select` and Atrium squircle radio/check pills.
- **Active Filter Chips**:
  - Rendered in a sleek sub-bar only when criteria are active.
  - Height: 28px (`size="sm"`), warm soft terracotta background tint, with a clear `✕` icon button.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Streamlined Quick Tabs vs. Everything-in-Popover**:
  - *Chosen Approach*: Keep the top 3 high-volume statuses (**Tous**, **Actifs**, **À renouveler**) on the visible segmented control, while relegating secondary and dimensional filters (Plan, Expiration date range, Suspended) to the popover.
  - *Why*: Daily front-desk operators switch between active members and expiring renewals dozens of times per hour; hiding those behind a modal click would increase friction. Relegating secondary statuses prevents the 700px+ width explosion that caused wrapping in the screenshot.
  - *Alternatives Considered*: Hiding all statuses inside a dropdown was rejected because quick tab switching is the core workflow in gym desks.
- **Decision 2: Dedicated Filter Popover over Drawer**:
  - *Chosen Approach*: Lightweight floating `LiquidPanel` popover rather than a full-height right-side drawer.
  - *Why*: Selecting a membership plan or toggling an archive filter takes 2 seconds; a full side drawer obscures half the screen and feels heavy for simple table filtering.
- **Decision 3: Unifying View Switcher with Master Toolbar**:
  - *Chosen Approach*: Relocate the `[List | Grid]` switcher into the right utility cluster alongside CSV Export and Fullscreen, disabling the redundant internal header in `UniversalDataCollection`.
  - *Why*: Eliminates the second detached row shown in the screenshot, ensuring the table header directly follows the command bar.

---

## 4. Technical Architecture & Implementation Steps

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MembershipMembersView.tsx                                                                        │
│                                                                                                  │
│  State Management:                                                                               │
│   ├── statusFilter: 'All' | 'Active' | 'Expiring' | 'Expired' | 'Archived'                       │
│   ├── planFilter: string ('All' | planId)                                                        │
│   ├── searchQuery: string                                                                        │
│   ├── viewMode: 'list' | 'grid'                                                                  │
│   └── isFilterPopoverOpen: boolean                                                               │
│                                                                                                  │
│  Components:                                                                                     │
│   ├── <Seek shutSize={40} openWidth={240} />                                                     │
│   ├── <LiveSegmentedControl size="md" options={[Tous, Actifs, À renouveler]} />                  │
│   ├── <AtriumButton variant="secondary" icon={<SlidersHorizontal />}> Filtres (n) </AtriumButton>│
│   │    └── <LiquidPanel> [Formule Select, Statut, Reset, Apply] </LiquidPanel>                   │
│   ├── Active Filter Chips Bar (Conditional on planFilter !== 'All' || status > 3)                │
│   └── Utility Cluster:                                                                           │
│        ├── <LiveSegmentedControl size="md" options={[List, Grid]} />                             │
│        ├── <AtriumButton variant="secondary" icon={<Download />} title="Export CSV" />          │
│        └── <AtriumButton variant="secondary" icon={<Maximize2 />} title="Fullscreen" />         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Execution Tasks (Planned for Approval)

1. **Toolbar Restructuring (`MembershipMembersView.tsx`)**:
   - Reorganize the table control bar with `flex items-center justify-between gap-3 flex-nowrap overflow-x-auto`.
   - Configure quick status tabs for core operating views (`Tous`, `Actifs`, `À renouveler`).
   - Add the `[Filtres]` trigger button displaying an active filter count pill when `planFilter !== 'All'` or advanced statuses are applied.
2. **Build Atrium Filter Popover Component**:
   - Utilize Atrium `LiquidPanel` (or popover portal) with squircle aesthetics.
   - House the Atrium `Select` for membership plans (`Filtrer par formule`).
   - Include extended status options (`Abonnements expirés`, `Comptes suspendus`) and a "Réinitialiser" (Clear all) button.
3. **Active Filter Capsules Strip**:
   - Add a subtle chip row directly beneath the toolbar that dynamically appears when non-default filters are active.
   - Each chip displays the criteria (e.g. `Formule: 3 Mois Pro`) with a single-click `✕` dismissal.
4. **Utility Cluster Consolidation**:
   - Integrate the `List | Grid` segmented view switcher directly into the right side of the toolbar.
   - Format CSV Export and Fullscreen buttons as cohesive 40px squircle icon buttons with localized tooltips.
   - Pass `showViewToggle={false}` to `UniversalDataCollection` to remove the orphan header.
5. **Verification**:
   - Verify layout responsiveness across desktop (1440px) and tablet/laptop widths (1024px) ensuring zero accidental row wraps.
   - Run `compile_applet` and `lint_applet` to confirm zero errors.
