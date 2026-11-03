# Architectural Revision: Guaranteed Parity Kinetic Live Filter Switcher Across All Vertical Dashboards and Categories

A comprehensive, mathematically validated architectural specification guaranteeing 100% behavioral, visual, and physical parity with the live segmented controls from the Atrium reference specification (`Atrium.dc.html` / `assets/958e1ff6e708ff628a7137264616b673.js`), rolled out across **all 16 business categories** for both Dashboard analytical period filters and operational data collection status bars.

---

## User Review & Confirmed Critical Decisions

> [!IMPORTANT]
> ### Confirmed Architecture & Experience Decisions
> Based on interactive user alignment:
> 1. **Dual Deployment Across Dashboards & Collections**: The kinetic live segmented switcher will replace all static filter bars on both **Vertical Dashboards** (period filters: Today, 7D, 30D, Year/Season) and **Operational Collections** (status tabs: All, Active, Pending, Completed, etc.) across all 16 categories.
> 2. **Integrated Real-Time Count Badges**: Numeric item counts (e.g., `Actifs 18`, `En attente 4`) are embedded directly into individual segments and participate in real-time `color-mix` interpolation, transitioning smoothly between dark charcoal/slate and crisp white as the terracotta blob sweeps underneath.
> 3. **Adaptive Height Geometry**: 
>    - **Dashboard Analytical Switchers**: Standard **34px** (`--atr-h: 34px`) for generous cursor tracking and visual prominence alongside KPI trays.
>    - **Collection & Table Toolbars**: Sleek **30px** (`--atr-h: 30px`) for high-density enterprise data rows without crowding search bars or action buttons.
> 4. **Identical Dual-Spring Physics & Asymmetric Elasticity**: Exact analytical closed-form harmonic springs ($k_{\text{lead}} = 420$, $k_{\text{trail}} = 200$, damping ratio $\zeta = 1/\phi \approx 0.618$) preventing discrete step jumps and giving the terracotta selector an authentic fluid rubber stretch.

---

## 1. Overview & Core Concept

### What It Does
Replaces all legacy, static filter buttons and hardcoded status chips across the entire platform with an enterprise-grade, spring-authoritative `LiveSegmentedControl` engine. Whether toggling between clinical triage stages in a polyclinic, site progress logs in a BTP construction cockpit, or financial revenue periods on an executive dashboard, the user experiences continuous, fluid, physics-driven feedback with zero layout reflow.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHYSICAL SPRING DYNAMICS                        │
│                                                                        │
│    Advancing Direction (Left to Right):                                │
│    Leading Edge (Right): k=420 (Stiff, Shoots Ahead)                   │
│    Trailing Edge (Left): k=200 (Soft, Stretches Fluidly)               │
│                                                                        │
│   [ Tous 48 ] ───────────────► [ En cours 12 ] ─────── [ Terminés 36 ] │
│   ┌─────────────────────────────┐                                      │
│   │ Terracotta Elastic Blob     │                                      │
│   └─────────────────────────────┘                                      │
│                                                                        │
│   Real-time Color Coverage:                                            │
│   color-mix(in srgb, var(--atr-onacc) cov%, var(--atr-ink))            │
└────────────────────────────────────────────────────────────────────────┘
```

### Key User Flows & Interactions
1. **At-a-Glance Density**: The switcher is rendered inside an elevated `#F8F9FA` or card container. Inactive segments display legible charcoal text and quiet count pills; the active segment is hugged by the Hermès terracotta blob (`#D4522F`).
2. **Kinetic Selection**: Clicking or tapping any segment releases the dual-spring oscillator. The leading boundary instantly surges toward the target boundary while the trailing edge pulls behind with viscoelastic drag, creating an organic squeeze-and-stretch sensation.
3. **Typography & Badge Cross-Fading**: As the blob passes under each glyph and number, letter colors cross-fade at 60fps via hardware-accelerated CSS `clip-path: inset(...)` and CSS `color-mix`.
4. **Keyboard Navigation & RTL Support**: Full keyboard accessibility (`ArrowLeft`, `ArrowRight`, `Home`, `End`) with direction-aware spring kinetics that automatically mirror in Arabic RTL mode.

---

## 2. Mathematical Parity & Physics Specification

### Closed-Form Harmonic Equations
The motion engine uses the exact closed-form solution of a damped harmonic oscillator:
$$x(t) = e^{-\zeta \omega_0 t} \left(c_1 \cos(\omega_d t) + c_2 \sin(\omega_d t)\right) + x_{\text{target}}$$

Where:
- $\omega_0 = \sqrt{k}$ (undamped natural frequency)
- $\omega_d = \omega_0 \sqrt{1 - \zeta^2}$ (damped frequency)
- $\zeta = \frac{\sqrt{5} - 1}{2} \approx 0.6180339887$ (Golden Ratio Conjugate damping ratio)

### Asymmetric Directional Constants
- **Advancing ($i_{\text{next}} > i_{\text{curr}}$)**:
  - Leading Edge ($R$): $k = 420$ (shoots forward)
  - Trailing Edge ($L$): $k = 200$ (stretches behind)
- **Retreating ($i_{\text{next}} < i_{\text{curr}}$)**:
  - Leading Edge ($L$): $k = 420$ (shoots backward)
  - Trailing Edge ($R$): $k = 200$ (stretches behind)

### Real-Time Overlap Coverage Equation
$$\text{cov}_i = \text{clamp}\left(\frac{\min(R_{\text{edge}}, g_i[1]) - \max(L_{\text{edge}}, g_i[0])}{g_i[1] - g_i[0]}, 0, 1\right)$$
$$\text{color}_i = \text{color-mix}\left(\text{in srgb}, \text{var}(--\text{atr-onacc}) \, (\text{cov}_i \times 100)\%, \text{var}(--\text{atr-ink})\right)$$

---

## 3. Enhanced Component Architecture

### `LiveSegmentedControl` Model & Props
```typescript
export interface SegmentedOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
  'aria-label'?: string;
}

export interface LiveSegmentedControlProps {
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  size?: 'sm' | 'md' | number; // sm = 30px (collections), md = 34px (dashboards)
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}
```

### DOM Structure & Integrated Count Badge
```html
<div class="d !rounded-full" data-atr-size="sm" role="radiogroup" aria-label="Status Filter">
  <!-- Spring Elastic Blob -->
  <div class="s !rounded-full" aria-hidden="true" style="clip-path: inset(0 ... 0 ... round 15px);"></div>
  
  <!-- Interactive Options with Synchronized Badges -->
  <button class="e !rounded-full" role="radio" aria-checked="true">
    <span>Tous</span>
    <span class="atr-badge ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums">48</span>
  </button>
  <button class="e !rounded-full" role="radio" aria-checked="false">
    <span>En cours</span>
    <span class="atr-badge ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums">12</span>
  </button>
</div>
```

### Badge Cross-Fade Styling in `index.css`
```css
.d .e .atr-badge {
  background-color: rgba(0, 0, 0, 0.06);
  color: inherit;
  transition: background-color 150ms ease;
}
.d .e[aria-checked="true"] .atr-badge {
  background-color: rgba(255, 255, 255, 0.22);
  color: var(--atr-onacc);
}
[data-theme="dark"] .d .e .atr-badge {
  background-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .d .e[aria-checked="true"] .atr-badge {
  background-color: rgba(0, 0, 0, 0.25);
  color: var(--atr-onacc);
}
```

---

## 4. Comprehensive 16-Category Rollout Matrix

Every single category receives the kinetic switcher on its **Executive Dashboard** and **Core Operational Collection Views**:

| # | Business Category | Dashboard Switcher (34px) | Collection Views Status Switcher (30px) |
|---|---|---|---|
| **1** | **Gym & Membership** | `MembershipDashboardView` (Aujourd'hui, 7J, 30J, Année) | `MembershipMembersView` (Tous, Actifs, À renouveler, Expirés, Suspendus)<br>`MembershipRegistrationsView` (Tous, En attente, Validés, Rejetés) |
| **2** | **Appointment, Salon & Spa** | `AppointmentDashboardView` (Aujourd'hui, Semaine, Mois) | `AppointmentScheduleView` (Tous, Confirmés, En attente, Annulés)<br>`AppointmentClientsView` (Tous, Fidèles, Nouveaux, Inactifs) |
| **3** | **Retail POS & Commerce** | `PosDashboardView` (Journée, Semaine, Mois, Année) | `PosOrdersView` (Toutes, Encaissées, En attente, Annulées)<br>`PosInventoryView` (Tous, En stock, Stock bas, Rupture) |
| **4** | **B2B Trading & Distribution** | `TradingDashboardView` (Aujourd'hui, Semaine, Mois, Trimestre) | `TradingSalesView` (Tous, Devis, Bons de Livraison, Factures)<br>`TradingPurchasesView` (Tous, Bons de Commande, BR, Factures) |
| **5** | **Medical Clinic & Polyclinic** | `MedicalDashboardView` (Aujourd'hui, Semaine, Mois) | `MedicalQueueView` (Tous, Salle d'attente, En consultation, Terminés)<br>`MedicalBillingView` (Tous, Carte Chifa, Espèces, Tiers-Payant) |
| **6** | **Auto Garage & Mechanics** | `AutoGarageDashboardView` (Aujourd'hui, Semaine, Mois) | `AutoGarageOrdersView` (Tous, Réceptionné, En atelier, Pièces en attente, Prêt)<br>`AutoGarageVehiclesView` (Tous, Au garage, Restitués) |
| **7** | **Real Estate & Property** | `RealEstateDashboardView` (Mois, Trimestre, Année) | `RealEstateMandatesView` (Tous, Exclusifs, Simples, Sous offre, Expirés)<br>`RealEstateLeasesView` (Tous, Actifs, Impayés, En renouvellement) |
| **8** | **Light Manufacturing & Workshop** | `ManufacturingDashboardView` (Poste jour, Semaine, Mois) | `ManufacturingOrdersView` (Tous, Planifiés, En fabrication, Contrôle QC, Terminés)<br>`ManufacturingMaterialsView` (Tous, Disponibles, Sous seuil, En commande) |
| **9** | **Project Management & Agency** | `ProjectDirectionView` (Semaine, Mois, Trimestre, Année) | `ProjectChefProjetView` (Tous, Brief, Production, Validation client, Facturé)<br>`ProjectCreaView` (Toutes, À faire, En cours, BAT validé) |
| **10** | **Venue & Event Rental Spaces** | `VenueDashboardView` (Aujourd'hui, Semaine, Mois, Saison) | `VenueBookingsView` (Toutes, Confirmées, Options, Clôturées, Annulées)<br>`VenueFinanceView` (Toutes, Cautions bloquées, Restituées, Déduites) |
| **11** | **Education Academy & Tutoring** | `EducationDashboardView` (Semaine, Mois, Trimestre, Année) | `EducationStudentsView` (Tous, Inscrits, Prospect, Suspendus, Diplômés)<br>`EducationAdmissionsView` (Tous, Dossiers reçus, Entretiens, Admis) |
| **12** | **Freelance & Solo Studio** | `FreelanceDashboardView` (Semaine, Mois, Trimestre, Année) | `FreelanceDeliverablesView` (Tous, En cours, Revue client, Livrés)<br>`FreelanceInvoicesView` (Toutes, Brouillon, Envoyées, Payées, En retard) |
| **13** | **Agriculture & Dairy Livestock** | `AgricultureDashboardView` (Journée, Semaine, Mois, Campagne) | `AgricultureParcelsView` (Toutes, Ensemencées, En traitement, Prêtes à récolter)<br>`AgricultureWholesaleView` (Tous, Pesées terminées, En attente de déchargement) |
| **14** | **Construction & Contracting BTP** | `ContractorDashboardView` (Semaine, Mois, Décompte, Global) | `ContractorSitesView` (Tous, En cours, Réception provisoire, Garantie décennale)<br>`ContractorBillingView` (Tous, Décomptes validés, En attente CTC, Payés) |
| **15** | **Logistics & COD Delivery** | `LogisticsDashboardView` (Aujourd'hui, 7J, 30J, Année) | `LogisticsShipmentsView` (Tous, Ramassés, En hub, En livraison, Livrés, Retournés)<br>`LogisticsCodView` (Tous, À encaisser, Encaissés livreurs, Reversés) |
| **16** | **Legal Cabinet & Notary Study** | `LegalDashboardView` (Mois, Trimestre, Année civile) | `LegalMattersView` (Tous, En instruction, En délibéré, Jugés, Archivés)<br>`LegalHearingsView` (Toutes, Audience du jour, À venir, Renvoyées) |

---

## 5. Technical Implementation Steps

### Step 1: Core Engine Enhancement (`LiveSegmentedControl.tsx` & `atriumSprings.ts`)
1. Extend `SegmentedOption` with `count?: number | string`.
2. Add support for `size="sm"` (30px) and `size="md"` (34px) with proper CSS variable mapping.
3. Update `SegmentedBlobController` to include `.atr-badge` elements in measuring geometry, ensuring badges do not cause text wrap or horizontal overflow.
4. Verify that `document.fonts.ready` and `ResizeObserver` re-measure whenever counts update dynamically (e.g., when a new lead is added or an order is invoiced).

### Step 2: Dashboard Period Switcher Integration (16 Views)
1. Add an active period state (`'today' | '7d' | '30d' | 'year'`) to each of the 16 dashboard views.
2. Embed the 34px `LiveSegmentedControl` in each dashboard header tray alongside KPI cards.
3. Wire period transitions to existing store query filters or dynamic metrics computation.

### Step 3: Operational Collections Switcher Integration (32+ Views)
1. Replace legacy button groups with the 30px `LiveSegmentedControl` in each category collection view.
2. Pass dynamic counts computed from current data (e.g. `items.filter(i => i.status === 'active').length`).
3. Ensure full trilingual parity (French, Arabic RTL, English) for all option labels and accessibility tags.

---

## 6. Pre-Flight Verification & Acceptance Criteria

1. **Exact Spring Physics**: Asymmetric stiffness ($420/200$) and golden-ratio damping ($\zeta = 0.618$) visually verified with no bouncing or discrete jumps.
2. **Dynamic Overlap Morphing**: Typography and count badge colors smoothly blend character-by-character from dark ink to white as the terracotta blob passes under them.
3. **Adaptive Geometry**: 34px height renders crisp on dashboards; 30px height fits seamlessly inside collection table toolbars without breaking grid alignment.
4. **All 16 Categories Verified**: Every category retains its domain-specific filters and metrics with zero regressions.
5. **Compilation & Tests**: Zero TypeScript errors (`lint_applet`), successful production build (`compile_applet`), and all 82 unit tests passing.
