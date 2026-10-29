# Revised Master Implementation Plan: Real Estate Brokerage & Property Management (Algeria)

**Category 11**: Real Estate & Property Brokerage (*Agence Immobilière & Gestion Locative*)  
**Design Standard**: Strict Atrium Design System Compliance (Reusing Existing Resources & Tokens Only)  
**Workspace Architecture**: **Unified Single-Workspace Cockpit** (No UI Role Separation)  
**Target Market**: Algeria (DZD Currency, French / Arabic RTL, Décrets exécutifs 09-18 & 08-243, Art. 317 Code du Timbre)

---

## User Review & Critical Adjustments

> [!IMPORTANT]
> The following two architectural directives from the user have been permanently integrated:
> 1. **Zero UI Separation Between Roles**: The interface is unified into a single, cohesive agency workspace. All screens (Mandates, Properties, Leases, Visits, Inspections, Finance) are directly accessible from the primary sidebar navigation. There are no segregated role workspaces, hidden tabs, or restrictive role switchers.
> 2. **Strict Reuse of Existing Atrium UI Resources**: No new design paradigms, colors, or external components are introduced. The entire vertical is built exclusively with Atrium's existing design tokens:
>    - **Primary Button**: `AtriumButton` in brand terracotta (`#C4785A`, satin ceramic finish, 1px fine bevel edge highlight, ambient glow).
>    - **Container Architecture**: Elevated Pod Trays in `#F8F9FA` (`dark:bg-[#141416]`) with single-elevation depth.
>    - **Card & Table Surfaces**: Pure white `#FFFFFF` (`dark:bg-[#18181B]`), subtle borders `#E9EEF0` (`dark:border-[#27272A]`), and Dark Espresso anchors (`#1F1D1B`).
>    - **Search & Filter Controls**: Kinetic expanding `Seek` search lens, `FilterCapsules` segmented tabs, `LabelInput`, and `LabelSelect`.
>    - **Collection Layouts**: `UniversalDataCollection<T>` with standard List View, Grid View, 390px side inspector drawer, and kebab action menus.

---

## 1. Unified Navigation & Screen Architecture

Instead of fragmenting the UI across different employee logins or roles, the agency operates as a unified collaborative cockpit with 6 dedicated sidebar-docked screens:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 UNIFIED SIDEBAR NAVIGATION (CAT 11)                             │
├──────────────────────────┬─────────────────────────────┬────────────────────────────────────────┤
│ SCREEN IDENTIFIER        │ DISPLAY TITLE (FR / AR)     │ PRIMARY OPERATIONAL PURPOSE            │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ realestate_dashboard     │ Tableau de Bord Immobilier  │ Agency KPI Pulse, Expiring Mandates,   │
│                          │ لوحة القيادة العقارية        │ Arrears Radar, Monthly Volume          │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ realestate_properties    │ Parc Immobilier & Titres    │ Property Catalog, Cadastral Passports, │
│                          │ العقارات والسندات العقارية   │ Photos, Title Strength Badges          │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ realestate_mandates      │ Registre des Mandats (09-18)│ Legal Mandate Register, Sequential IDs,│
│                          │ سجل الوكالات الرسمي          │ Commissions, Expiration & Renewals     │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ realestate_leases        │ Gestion Locative & Baux     │ Active Leases, Cash Desk Quittances,   │
│                          │ إدارة الإيجار والوصولات      │ Timbre Fiscal (Art. 317), Arrears      │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ realestate_inspections   │ Visites & États des Lieux   │ Mobile Bon de Visite (Touch Signature),│
│                          │ المعاينات ومحاضر الجرد       │ Check-in/Check-out Inspections, Meters │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ realestate_finance       │ Notaire & Comptabilité      │ Notary Simulator (Décret 08-243), DGI  │
│                          │ حسابات الموثق والضرائب      │ Taxes, Agency Commissions, Cash Drawer │
└──────────────────────────┴─────────────────────────────┴────────────────────────────────────────┘
```

---

## 2. Core Feature Specifications (Unified Cockpit)

### FEATURE 1: Registre des Mandats Conforme Décret 09-18
* **Purpose**: Maintains the legally mandated, chronologically numbered register of all brokerage agreements.
* **UI Layout**:
  * Rendered inside an elevated Pod Tray (`bg-[#F8F9FA] dark:bg-[#141416] p-6 rounded-[28px]`).
  * Uses `UniversalDataCollection` with dual List/Grid toggle, `Seek` search lens, and status filter capsules (`Tous`, `Actifs`, `Expirant sous 15j`, `Clôturés`).
  * Action trigger: Primary `AtriumButton` (`+ Nouveau Mandat`).
* **Modal**: `MandateModal.tsx` built with `LabelInput` and `LabelSelect`.
  * Pre-fills property and owner CNI.
  * Calculates Decree 09-18 commission tranches (3% $\le 1\text{M}$, 2% $\le 5\text{M}$, 1% $> 5\text{M}$ DA) or negotiated flat percentage.
  * Assigns automatic sequential ID: `MND-2026-HYD-000142`.

### FEATURE 2: Parc Immobilier & Passeport Cadastral
* **Purpose**: Manages the property inventory with rigorous legal title verification before marketing.
* **UI Layout**:
  * `RealEstatePropertiesView.tsx` with single-elevation cards.
  * Title Strength indicator using unboxed clean typographic metadata with subtle dot separators:
    * `Acte Notarié · Livret Foncier · Négatif Conforme` (🟢 100/100)
    * `Bien dans l'Indivision · Fridha Validée` (🟡 70/100)
    * `Papier Timbré / Coutume · Enquête Foncière Requise` (🔴 30/100)
  * Clicking any property opens the 390px side inspector drawer displaying high-res photos, cadastral section/ilot numbers, owner phone, and 1-click actions.

### FEATURE 3: Bon de Visite Mobile avec Signature Tactile & Horodatage GPS
* **Purpose**: Provides legally enforceable proof of property mediation to stop buyers and sellers from bypassing the agency.
* **UI Component**: `BonDeVisiteModal.tsx`.
  * Pure HTML5 canvas element styled to match Atrium's clean modal aesthetic.
  * Allows smooth finger/stylus signature on smartphones and tablets.
  * Captures browser geolocation coordinates ($Lat, Long$) and network timestamp.
  * 1-click generation of bilingual PDF and WhatsApp dispatch to client.

### FEATURE 4: Gestion Locative, Baux & Quittances avec Timbre Fiscal Gradué
* **Purpose**: Automates monthly rent roll collection and prints official receipts with legal fiscal stamps.
* **UI Layout**:
  * `RealEstateLeasesView.tsx` with top Arrears Radar metric tiles.
  * Direct cash desk button: `Encaisser Loyer` triggers `QuittanceModal.tsx`.
* **Fiscal Stamp Engine (*Art. 317 Code du Timbre*)**:
  * Automatically calculates stamp duty on cash payments:
    * $\le 500\text{ DA}$: Exonéré
    * $501 - 3,000\text{ DA}$: $20\text{ DA}$
    * $3,001 - 5,000\text{ DA}$: $30\text{ DA}$
    * $5,001 - 10,000\text{ DA}$: $50\text{ DA}$
    * $10,001 - 20,000\text{ DA}$: $100\text{ DA}$
    * $20,001 - 50,000\text{ DA}$: $200\text{ DA}$
    * $50,001 - 100,000\text{ DA}$: $400\text{ DA}$
    * $> 100,000\text{ DA}$: $1\%$ du montant total en espèces.
  * Generates clean, printable A5/thermal quittance with agency stamp area and payment voucher.

### FEATURE 5: Moteur de Rapprochement Acquéreur-Bien (Smart Matching)
* **Purpose**: Instantly scores and matches new property listings with qualified buyer demands.
* **UI Component**: Integrated directly into the property side drawer and candidate list.
  * Displays match percentage score ($S \in [0, 100]\%$) based on budget, commune, property type, and surface area.
  * 1-click WhatsApp button to send property presentation sheets to matched buyers.

### FEATURE 6: Notaire, Frais d'Enregistrement & Simulateur Décret 08-243
* **Purpose**: Delivers transparent buyer acquisition cost projections and structures the Notary Closing Pack.
* **UI Layout**:
  * `RealEstateFinanceView.tsx` with the **Simulateur de Frais d'Acquisition Notariés**:
    * Computes *Droits d'Enregistrement* ($2.5\%$ or $5\%$).
    * Computes *Taxe de Publicité Foncière* ($1\%$).
    * Computes official *Émoluments Notaire* (*Décret 08-243*: $3\%$, $2\%$, $1\% + \text{TVA } 19\%$).
    * Computes estimated *Débours et Timbres* ($25,000\text{ DZD}$).
  * Printable closing financial statement for clients.

---

## 3. Strict UI Design System Rules (No New Elements)

1. **Zero-Pill Discipline**: Metadata (rooms, surface m², wilaya, legal status) must never be enclosed in multi-colored candy pills. Use clean, unboxed text separated by middle dots (`·`) or slashes (`/`).
2. **Elevated Pod Trays**: Every screen content is framed by Atrium's elevated pod container:
   ```tsx
   <div className="bg-[#F8F9FA] dark:bg-[#141416] p-6 rounded-[28px] border border-[#E9EEF0] dark:border-[#232328]">
     {/* Screen Header with Seek and Action Nodes */}
     {/* UniversalDataCollection or Data Tables */}
   </div>
   ```
3. **Buttons**: Exclusively use `AtriumButton`:
   ```tsx
   <AtriumButton variant="primary" icon={Plus} onClick={handleNewMandate}>
     Nouveau Mandat
   </AtriumButton>
   ```
4. **Form Controls**: All inputs must use kinetic notched `LabelInput` and `LabelSelect` with terracotta focus rings and floating labels.
5. **Search**: Dedicated `Seek` component with expanding lens animation and `⌘K` command palette integration.

---

## 4. Technical Architecture & File Layout

```
src/
├── types/
│   └── index.ts                                # RealEstateProperty, Lease, Mandate, Quittance, Inspection
├── utils/
│   └── realEstateRules.ts                      # Pure calculation engines (Décret 09-18, 08-243, Art. 317)
│   └── realEstateRules.test.ts                 # Automated node:test suites (100% coverage)
├── components/
│   └── screens/
│       └── realestate/
│           ├── realEstateData.ts               # Seed data & reactive local hooks
│           ├── RealEstateDashboardView.tsx     # KPI pulse, arrears radar, expiring mandates
│           ├── RealEstatePropertiesView.tsx    # Property inventory & cadastral title strength
│           ├── RealEstateMandatesView.tsx      # Décret 09-18 Official Mandate Register
│           ├── RealEstateLeasesView.tsx        # Rent roll, arrears triage, quittances
│           ├── RealEstateInspectionsView.tsx   # Mobile visit records, check-in/out inspections
│           ├── RealEstateFinanceView.tsx       # Notary simulator, DGI taxes, commission splits
│           ├── RealEstatePropertyModal.tsx     # 4-step property intake & cadastral title
│           ├── RealEstateLeaseModal.tsx        # Lease contract wizard & payment cycles
│           ├── MandateModal.tsx                # Official mandate creation & extension addendum
│           ├── BonDeVisiteModal.tsx            # Touchscreen signature & GPS verification
│           ├── QuittanceModal.tsx              # Cash desk receipt with Art. 317 stamp duty
│           └── NotarySimulatorModal.tsx        # Décret 08-243 pre-closing cost calculator
```

---

## 5. Phased Build Order (Thin Vertical Slices)

* **Slice 1: Core Types & Calculation Engine**
  * Update `src/types/index.ts` with comprehensive real estate models (`RealEstateMandate`, `RentalQuittanceRecord`, `BonDeVisiteRecord`, `CadastralPassportData`).
  * Create `src/utils/realEstateRules.ts` with pure functions for Décret 09-18 commission tranches, Article 317 stamp duties, and Décret 08-243 notary fees.
  * Add unit tests in `src/utils/realEstateRules.test.ts` and verify with `npm test`.

* **Slice 2: Mandates Register (Décret 09-18) & Seed Data**
  * Enrich `realEstateData.ts` with authentic Algerian property and mandate datasets.
  * Build `RealEstateMandatesView.tsx` using `UniversalDataCollection` and `MandateModal.tsx`.
  * Wire into `Sidebar.tsx` and `App.tsx`.

* **Slice 3: Mobile Touchscreen Bon de Visite & Anti-Poaching Shield**
  * Create `BonDeVisiteModal.tsx` with HTML5 `<canvas>` touch signature, GPS capture, and instant bilingual PDF/WhatsApp generation.
  * Integrate into `RealEstateInspectionsView.tsx` and property card action buttons.

* **Slice 4: Rental Roll, Baux & Quittances with Timbre Fiscal**
  * Upgrade `RealEstateLeasesView.tsx` with Arrears Radar metric cards.
  * Build `QuittanceModal.tsx` calculating progressive cash stamp duties (*Art. 317*).

* **Slice 5: Property Passport & Notary Closing Simulator**
  * Upgrade `RealEstatePropertyModal.tsx` with cadastral title checks (*Acte*, *Livret*, *Fridha*).
  * Build `NotarySimulatorModal.tsx` and integrate into `RealEstateFinanceView.tsx`.

* **Slice 6: Full Verification & Polish**
  * Verify trilingual labels (French & Arabic RTL).
  * Run `compile_applet` and `lint_applet` to certify 0 errors.

---

## Definition of Done (DoD)

1. **Zero UI Separation Between Roles**: All operational features accessible seamlessly in a unified single-workspace cockpit.
2. **Design System Parity**: 100% adherence to Atrium's `#F8F9FA` pod trays, `#C4785A` terracotta buttons, `UniversalDataCollection`, `Seek` lens, and `LabelInput`/`LabelSelect`. Zero foreign styling.
3. **Algerian Legal Compliance**: Décret 09-18 mandate sequential numbering, Art. 317 cash stamp duty, and Décret 08-243 notary closing cost formulas thoroughly implemented and unit-tested.
4. **Quadruple Traceability**: All data models adhere to `{ accountId, businessId, branchId, staffId }`.
5. **Clean Verification**: Passes `tsc --noEmit`, `npm test`, and Vite production build with zero warnings or dead clicks.
