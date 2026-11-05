# Universal Interactive Dashboard Overhaul Across All 16 Categories (Revised)

Modernize Atrium ERP & CRM category dashboards by introducing context-adaptive date filters for every individual card, high-precision interactive cursor crosshairs and floating tooltip cards to all charts, removing the top-level monolithic date filter, standardizing the export button to 40px height, and removing redundant operational shortcut buttons across all 16 vertical dashboards.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX decisions are incorporated based on your revision guidance:

- **Revised Decision (Context-Adaptive Date Filters)**:
  - **Hourly / Activity Curves (`HourlyCurveChart`)**: Equipped with daily switchers tailored to intraday rhythms: **Aujourd'hui / Today**, **Hier / Yesterday**, **Avant-hier / Day Before (-48h)**, and **Moyenne 7J / 7D Avg**.
  - **Revenue & Cash Velocity (`MonthlyAreaChart`)**: Equipped with monthly/quarterly switchers tailored to financial accounting: **Ce mois / This Month**, **Mois dernier / Last Month**, **Trimestre / Quarter (90J)**, and **Année / Full Year**.
  - **Volume & Workstation Histograms (`PillBarHistogram`)**: Equipped with operational interval switchers: **Cette semaine / Week**, **Ce mois / Month**, **Trimestre / Quarter**, and **Année / Year**.
  - **Categorical Breakdown Donut (`DonutChart`)**: Equipped with slice interval switchers: **Ce mois / This Month**, **Année / YTD**, and **Global / All Time**.
- **Confirmed Decision (Interactive Crosshair & Tooltips)**: Interactive hover crosshairs with a floating glass tooltip card displaying exact data values, timestamps, and contextual units on cursor move across all 4 chart engines.
- **Confirmed Decision (Header Export Button Height)**: Standardized the dashboard export button to 40px height (`h-10` / `size="md"`), matching primary action buttons across all views.
- **Confirmed Decision (Operational Shortcuts Removal)**: Removed the 3 buttons under "Raccourcis Opérationnels & Rapports" across all 16 category dashboard screens, allowing the Guardian health card to expand gracefully into the available space without card nesting.

---

## 1. Overview & Core Concept

### What It Does
Transforms static dashboard graphics into responsive, exploratory analytical instruments. Users can hover or drag across area curves, hourly curves, histograms, and donut segments to inspect granular metrics with precision crosshairs and floating cards. Each chart operates with its own domain-adapted timeframe filter, enabling natural operational comparisons (e.g., comparing today's hourly peak occupancy against yesterday, while concurrently viewing full-quarter revenue trajectories on the adjacent pod).

### Target Audience & Persona
Business owners, managing directors, and clinic/site superintendents across all 16 supported verticals (Gyms, Salons, Retail, Schools, Agencies, Clinics, Garages, Farms, Construction Sites, Legal Studies, etc.) who require immediate operational intelligence without menu clutter.

### Key Value
- **Zero Ambiguity**: Instant readout of any data point on hover with exact timestamps and currency values.
- **Domain-Accurate Cadence**: Intraday curves compare today with yesterday; financial curves compare this month with last month and full quarters.
- **Visual Cleanliness**: Eliminates redundant shortcut buttons that duplicated sidebar navigation, yielding a sleek, high-density executive cockpit.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Interactive Scrubbing on Curves**: Moving the cursor across `MonthlyAreaChart` or `HourlyCurveChart` displays a vertical dashed guide line following the pointer with zero latency, snapping to the nearest day/hour and illuminating the active vertex. A floating glass tooltip appears directly above the cursor with formatted timestamp, exact value (e.g. `48 200 DA`), and comparison indicator.
2. **Context-Adaptive Filter Switching**:
   - Clicking `Hier` on the hourly curve recalculates the hourly profile to show yesterday's traffic.
   - Clicking `Mois dernier` on the financial curve loads the prior month's 30-day cumulative trajectory.
   - Clicking `Trimestre` on the histogram aggregates weekly batches over 12 weeks.
3. **Histogram Bar Inspection**: Hovering over any bar in `PillBarHistogram` highlights the column with an accent glow and renders an anchored tooltip indicating the exact count, unit, and comparison percentage.
4. **Donut Segment Inspection**: Hovering over a donut arc in `DonutChart` smoothly increases its stroke radius, updates the center numeric summary to reflect the selected slice, and dims unselected segments for high contrast.
5. **Unified Export Header**: The top-right export button in `DashboardHeader` matches the 40px height and tactile spring physics of other screens' primary buttons.

### Visual Identity & Theme
- **Color Discipline**: Adheres strictly to the 60-30-10 distribution. Dominant white canvas `#FFFFFF` and neutral dark `#18181B` in dark mode, elevated `#F8F9FA` pod trays, and `#d4522f` brand terracotta highlights for active crosshair guides and hover accents.
- **Tooltips**: Sleek floating squircle cards (`bg-neutral-900/90 dark:bg-neutral-800/95 backdrop-blur-md text-white text-xs rounded-xl px-2.5 py-1.5 shadow-xl border border-neutral-700/60 pointer-events-none`).
- **Typography**: Tabular numerals (`font-mono tabular-nums`) for all tooltip values, axis ticks, and percentage deltas to prevent layout shifting.
- **Trilingual Parity**: Filter labels and tooltip text dynamically render across English, French, and Modern Standard Arabic (RTL with Cairo font).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Context-Adaptive Filter Intervals
- *Chosen Approach*: Implement distinct, domain-appropriate filter option sets for each chart type:
  - Hourly curves: `['today', 'yesterday', 'day_before', '7d_avg']` (Aujourd'hui, Hier, Avant-hier, Moyenne 7J)
  - Financial curves: `['this_month', 'last_month', 'quarter', 'year']` (Ce mois, Mois dernier, 90J / Trimestre, Année)
  - Histograms: `['week', 'month', 'quarter', 'year']` (Semaine, Mois, Trimestre, Année)
  - Donut charts: `['month', 'year', 'all']` (Ce mois, Année, Global)
- *Why*: Daily operations require comparing today with yesterday, while financial reviews require comparing months and quarters. A single static timeframe for all cards is unhelpful for operations.
- *Alternatives Considered*: Standard date pickers were rejected as they require multiple clicks and calendar popups; compact segmented pill tabs provide instant 1-click toggling.

### Decision 2: SVG Overlay Interactive Crosshair vs. Canvas Engine
- *Chosen Approach*: Pure React SVG event tracking with `onPointerMove`, `onPointerLeave`, and client rect projection.
- *Why*: SVG integrates seamlessly with responsive containers, preserves crisp vector lines on Retina displays, has zero bundle overhead, and avoids heavy third-party charting libraries.

### Decision 3: Removal of Operational Shortcuts Card
- *Chosen Approach*: Completely remove the 3-button "Raccourcis Opérationnels & Rapports" card across all 16 category dashboard screens, allowing the Guardian health card to occupy the natural container height.
- *Why*: The 3 buttons ("Paie / Salaires", "Historique Recettes", "Historique Flux") duplicated permanent links in the primary sidebar dock. Removing them eliminates visual noise and establishes single-elevation clarity.

---

## 4. Technical Architecture & Data Strategy

### System & Component Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Dashboard Header (Cleaned)                        │
│  [Icon + Title]                             [Facility Pill] [Export 40px]│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
      ┌────────────────────────────┴─────────────────────────────┐
      ▼                                                          ▼
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│     Left Pod: Activity & Trends │        │    Right Pod: Health & Margin   │
│                                 │        │                                 │
│ ┌─────────────────────────────┐ │        │ ┌─────────────────────────────┐ │
│ │ HourlyCurveChart            │ │        │ │ GuardianCard (Health Score) │ │
│ │  [Today·Yesterday·-48h·7d]  │ │        │ │  (Full height, expanded)    │ │
│ │  [Crosshair + Tooltip SVG]  │ │        │ └─────────────────────────────┘ │
│ └─────────────────────────────┘ │        │                                 │
│                                 │        │ ┌─────────────────────────────┐ │
│ ┌─────────────────────────────┐ │        │ │ DonutChart / Margins        │ │
│ │ MonthlyAreaChart            │ │        │ │  [Month·Year·Global]        │ │
│ │  [This Month·Last·90d·Year] │ │        │ │  [Interactive slice hover]  │ │
│ │  [Crosshair + Tooltip SVG]  │ │        │ └─────────────────────────────┘ │
│ └─────────────────────────────┘ │        │                                 │
│                                 │        │  (Raccourcis card removed)     │
└─────────────────────────────────┘        └─────────────────────────────────┘
```

### Component Upgrades Specification

1. **`src/components/common/dashboard/DashboardHeader.tsx`**:
   - Strip `LiveSegmentedControl` period filter block.
   - Adjust `LiquidButton` / export action to `size="md"` (`h-10` / 40px height) matching `AtriumButton`.
   - Update layout spacing to maintain clean alignment.

2. **`src/components/common/dashboard/HourlyCurveChart.tsx`**:
   - Add inline context-adaptive date filter:
     - Options: `Today` (Aujourd'hui / اليوم), `Yesterday` (Hier / أمس), `Day Before` (Avant-hier / أول أمس), `7D Avg` (Moyenne 7J / متوسط ٧ أيام).
   - Dynamic data generator/interpolation for each selected filter.
   - Pointer move listener calculating active index from normalized X coordinates.
   - Vertical dashed crosshair line (`stroke-dasharray="3,3"`, `stroke="#d4522f"`).
   - Floating tooltip squircle with timestamp, active value, and comparison tag.

3. **`src/components/common/dashboard/MonthlyAreaChart.tsx`**:
   - Add inline context-adaptive financial filter:
     - Options: `This Month` (Ce mois / هذا الشهر), `Last Month` (Mois dernier / الشهر السابق), `Quarter` (Trimestre 90J / ٣ أشهر), `Year` (Année / كامل السنة).
   - Dynamic dataset slicing and curve regeneration based on the active timeframe.
   - Interactive crosshair, active vertex dot animation, and floating date/currency tooltip (`DA`).

4. **`src/components/common/dashboard/PillBarHistogram.tsx`**:
   - Add inline context-adaptive cadence filter:
     - Options: `Week` (Semaine / أسبوعي), `Month` (Mois / شهري), `Quarter` (Trimestre / ربع سنوي), `Year` (Année / سنوي).
   - Hover state on individual bars with tooltip card displaying bar label, numeric value, and percentage share.

5. **`src/components/common/dashboard/DonutChart.tsx`**:
   - Add inline context-adaptive filter:
     - Options: `This Month` (Ce mois / هذا الشهر), `Year` (Année / السنة), `All Time` (Global / الإجمالي).
   - Interactive hover state expanding the hovered segment's `strokeWidth` and updating the center label to show the slice's share.

6. **All 16 Category Dashboard Views**:
   - Remove the `Raccourcis Opérationnels & Rapports` 3-button block.
   - Expand the Guardian card height to balance the right column.
   - Verticals:
     1. `MembershipDashboardView.tsx`
     2. `AppointmentDashboardView.tsx`
     3. `PosDashboardView.tsx`
     4. `EducationDashboardView.tsx`
     5. `FreelanceDashboardView.tsx`
     6. `VenueDashboardView.tsx`
     7. `ProjectDirectionView.tsx`
     8. `TradingDashboardView.tsx`
     9. `MedicalDashboardView.tsx`
     10. `AutoGarageDashboardView.tsx`
     11. `RealEstateDashboardView.tsx`
     12. `ManufacturingDashboardView.tsx`
     13. `LegalDashboardView.tsx`
     14. `LogisticsDashboardView.tsx`
     15. `ContractorDashboardView.tsx`
     16. `AgricultureDashboardView.tsx`

---

## 5. Verification & Rollout Strategy

1. **Unit Testing**: Run existing test suites (`npm test` and `npm run test:atrium`) to ensure zero regressions in business logic.
2. **Build & Type Checking**: Run `compile_applet` and `lint_applet` together to verify strict TypeScript adherence.
3. **Browser Verification**: Verify hover responsiveness, tooltip positioning at viewport boundaries, and smooth RTL layout mirroring in Arabic.
