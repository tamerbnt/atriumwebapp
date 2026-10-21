# Project & Milestone (Agency 6-Roles) — Complete Localization & Polish Overhaul

A comprehensive audit and implementation plan to eliminate raw `pm_...` screen key leaks, localize all 6 agency departments and their 21 dedicated sub-screens, and achieve genuine 100% tri-lingual parity (French, Modern Standard Arabic, English) with authentic Algerian commercial and advertising agency terminology.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed with the user during the planning interview:
> - **Agency Department Nomenclature**: Full authentic Algerian advertising agency department designations across all 3 languages:
>   - **FR**: *Direction Générale* (DG), *Chef de Projet* (CDP), *Studio Créa* (CR), *Superviseur Terrain* (SUP), *Ressources Humaines & Casting* (RH), *Comptabilité & Paie* (CPT).
>   - **AR**: *الإدارة العامة*, *مدير المشاريع*, *أستوديو الإبداع والتصميم*, *المشرف الميداني*, *الموارد البشرية والكاستينغ*, *المحاسبة والأجور*.
>   - **EN**: *Executive Management*, *Project Manager*, *Creative Studio*, *Field Supervisor*, *HR & Talent Casting*, *Accounting & Payroll*.
> - **Execution Scope**: Full simultaneous overhaul across all 6 role screens, the TopBar breadcrumbs engine, and the Dock Sidebar.
> - **Numeric & Metric Display**: Standard Western numerals with the Algerian Dinar currency symbol (`DA` in FR/EN, `د.ج` in AR) to maintain crisp, high-density tabular alignment.

---

## 1. Overview & Root Cause Analysis

### The "Raw `pm_...`" Display Defect
In `src/components/layout/TopBar.tsx`, the breadcrumb resolution dictionary `pmScreenTitles` only contained a subset of 20 hardcoded French strings. Six active screen identifiers were completely missing from the mapping:
1. `pm_dir_projects` (Agency Projects portfolio)
2. `pm_dir_reports` (Direction margin & performance reports)
3. `pm_cp_orders` (Print & POS collateral supplier orders)
4. `pm_cp_files` (Press-ready BAT validation files)
5. `pm_crea_production` (Creative Kanban pipeline)
6. `pm_crea_briefs` (Creative specifications and briefs)

Whenever a user navigated to any of these views, the TopBar breadcrumb fell back to `{ screen: activeScreen }`, printing raw technical IDs like **`pm_dir_reports`** or **`pm_crea_production`** into the top navigation bar. Furthermore, the existing titles were hardcoded French without any Arabic or English translations.

### Incomplete Screen Localization
While the high-level navigation was partially translated, an exhaustive audit revealed that the internal screen bodies contain dozens of hardcoded French strings:
- **`ProjectChefProjetView.tsx`**: Hardcoded cart strings ("Le panier est vide.", "Imputation :", "Total Commande :"), BAT uploader tags, and expense audit table headers.
- **`ProjectCreaView.tsx`**: Hardcoded status badges ("En attente création", "Ordre reçu", "Bords 3mm", "Fonds perdus 3mm inclus · Prêt pour flashage"), format tags, and security disclaimer text.
- **`ProjectSuperviseurView.tsx`**: Hardcoded roll call pill labels ("Présents", "Retard", "Absents"), schedule headers, and staffing filters.
- **`ProjectRhView.tsx`**: Hardcoded gender labels, notes, export headers, and an environment-violating `window.alert()` call.
- **`ProjectDirectionView.tsx`**: Hardcoded month abbreviations in the bar chart (Fév, Avr, Mai, Juin, Juil), new project form placeholders, and approval buttons.
- **`ProjectComptaView.tsx`**: Hardcoded table status tags ("Validée DG", "En attente DG"), asset lifecycle timeline stages, and modal triggers.

---

## 2. User Experience & Visual Design

### A. Dynamic Tri-Lingual Breadcrumb & Role Engine
- When switching agency roles in `Sidebar.tsx`, the active role badge and department name dynamically update in the user's selected language.
- The TopBar breadcrumb dynamically renders:
  `[Home Icon] / [Localized Role Name] / [Localized Sub-Screen Name]`
  with zero raw string leaks and full RTL reversal in Arabic mode.

### B. Departmental Workstation Consistency
Each of the 6 roles maintains its visual identity with 100% localized copy:
1. **Direction Générale (DG)**: Executive cockpit KPIs, monthly mission activity charts, cahier des charges injection drawer, double-lock approval center.
2. **Chef de Projet (CDP)**: Print & collateral catalog (Rollups, Kakemonos, Flyers), purchase declaration with indirect stock traceability, BAT proof approvals.
3. **Studio Créa (CR)**: 4-column production Kanban (Briefs Reçus → En Cours → Épreuve BAT → Prêt à Flasher), 3mm bleed indicator tags, asset upload dropzones.
4. **Superviseur Terrain (SUP)**: Live supermarket (GMS) activation schedule, 1-click mobile promoter attendance roll call (Present / Late / Absent), staffing filter drawer, field taxi/catering expense vouchers.
5. **Ressources Humaines & Casting (RH)**: 58 Wilayas talent pool with biometric portrait cards, CCP account key validator, talent dossier drawer, walk-in candidate intake form.
6. **Comptabilité & Paie (CPT)**: Slide 10 automated payroll hub, Algérie Poste CCP SFP 01 postal remittance check generator with legal amounts in words (French & Arabic), expense receipt scanner with NIF checks, equipment lifecycle tracker.

---

## 3. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TopBar.tsx & Sidebar.tsx                        │
│   • Full 6-Role Switcher (DG, CDP, CR, SUP, RH, CPT)                   │
│   • Complete 21-Screen Breadcrumb Resolution via t('pm_role_*')        │
│   • Zero raw 'pm_...' fallback leaks                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
┌───▼─────────────────────┐ ┌───────▼─────────────────────┐ ┌───────▼─────────────────────┐
│ ProjectDirectionView    │ │ ProjectChefProjetView       │ │ ProjectCreaView             │
│ • Executive KPIs        │ │ • Collateral Catalog        │ │ • Creative Kanban           │
│ • Specification Cadrage │ │ • Supplier Orders           │ │ • Technical BAT Upload      │
│ • Double-Lock Approvals │ │ • BAT Deliverables          │ │ • 3mm Bleed Proofing        │
│ • Performance Margins   │ │ • Purchase Declarations     │ │ • Master Cloud Archive      │
└───┬─────────────────────┘ └───────┬─────────────────────┘ └───────┬─────────────────────┘
    │                               │                               │
┌───▼─────────────────────┐ ┌───────▼─────────────────────┐ ┌───────▼─────────────────────┐
│ ProjectSuperviseurView  │ │ ProjectRhView               │ │ ProjectComptaView           │
│ • GMS Field Missions    │ │ • 58 Wilayas Talent Bank    │ │ • Slide 10 Payroll Hub      │
│ • Mobile Phone Check-in │ │ • 360° Candidate Dossier    │ │ • Algérie Poste SFP 01 Check│
│ • Field Staffing Roster │ │ • Public Portal & Walk-in   │ │ • Fiscal NIF Audit Scanner  │
│ • On-site Petty Cash    │ │ • Toast CCP Key Validation  │ │ • Indirect Stock Trace      │
└───┬─────────────────────┘ └───────┬─────────────────────┘ └───────┬─────────────────────┘
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    src/utils/i18n.ts (FR / AR / EN)                    │
│   • 120+ Dedicated Agency Keys with strict TypeScript symmetry         │
│   • Legal Algerian Postal Terms & Maghrebi Advertising Lexicon         │
│   • formatMoney with D.J / د.ج / DA tabular currency formatting        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps

### Phase 1: Translation Dictionary Expansion (`src/utils/i18n.ts`)
- Add complete sets of keys across `TRANSLATIONS_EN`, `TRANSLATIONS_FR`, and `TRANSLATIONS_AR` for:
  - All 6 department titles and short abbreviations (`pm_role_*`, `pm_role_*_badge`).
  - All 21 sub-screen names and descriptions (`pm_subscreen_*`).
  - Common agency statuses (En attente BAT, BAT Validé, Prêt pour flashage, Validée DG, etc.).
  - Table headers, filter capsules, chart labels, and modal validation messages.

### Phase 2: TopBar & Sidebar Breadcrumb Engine Refactoring
- Rewrite `pmScreenTitles` in `TopBar.tsx` to map every possible `activeScreen` directly to `t()` keys, with a clean fallback to the current department name if an unrecognized route occurs.
- Localize the role switcher in `Sidebar.tsx` ("Rôle Actif", role buttons, and compact tooltips).

### Phase 3: Screen-by-Screen Hardcoded Text Elimination
- **`ProjectChefProjetView.tsx`**: Localize cart drawer, collateral cards, order status badges, and purchase declaration form.
- **`ProjectCreaView.tsx`**: Localize Kanban column headers, file format tags, deadline warnings, and master archive security notes.
- **`ProjectSuperviseurView.tsx`**: Localize attendance counters (Present/Late/Absent), mission cards, shift closure modals, and expense categories.
- **`ProjectRhView.tsx`**: Replace `alert()` with `showToast()`, localize talent attributes (gender, driver license, vehicle, wilaya names, rating stars), and export CSV labels.
- **`ProjectDirectionView.tsx`**: Localize chart month labels, quick brief injection drawer, project creation form inputs, and rejection modals.
- **`ProjectComptaView.tsx`**: Localize individual payroll ledger status pills, SFP 01 slip fields, scanner drawer, and indirect stock history timeline steps.
- **`MobilePhoneSimulator.tsx`**: Localize mock camera overlay, GPS check-in button, and promoter selfie guidance.

### Phase 4: Verification & Quality Assurance
- Run `npm run lint` (`tsc --noEmit`) to verify 100% dictionary key parity.
- Run `npm test` to verify zero regression in Algerian PTT CCP validation and Dinar legal numbers-to-words.
- Run `compile_applet` to confirm a clean Vite production build.
