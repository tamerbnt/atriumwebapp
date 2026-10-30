# Master Production Implementation Specification: Category Construction & BTP Contracting (Algeria)
*Bâtiment, Travaux Publics, Hydraulique & Génie Civil (BTPH)*
**Target Category ID:** `construction_contractor` (`FacilityType: 24`)  
**Applicable Legal Framework:** Décret Présidentiel n° 15-247 (Marchés Publics), CCAG Travaux, Ordonnance 75-58 (Responsabilité Décennale & CTC), Décret Exécutif n° 97-47 (CACOBATPH Intempéries & ONM), Code des Impôts Directs (CIDTA).

---

## Strategic Context & System Architecture

### 1. Architectural Foundations
- **Stack:** React 18, TypeScript (strict mode), Tailwind CSS 4 (`@import "tailwindcss";`), Lucide React icons.
- **Visual Design Tokens:** Strict Atrium Desktop Canvas styling:
  - Surface Background: Outer frame `#E8ECEF`, dark mode `#121212`.
  - Inset Pod Trays: `#F8F9FA`, dark mode `#1E1E1E`.
  - Deep Espresso / Slate Anchors: `#1F1D1B`, `#2A2725`.
  - Warm Terracotta / Safety Orange Accents: `#C4785A` primary, `#D97706` amber alert, `#2563EB` civil blue.
  - Border Grids: `#EDF1F3` light, `#2E2E2E` dark.
- **Quadruple Traceability Standard:** Every persistent domain record carries:
  `{ accountId: string; businessId: string; branchId: string; staffId: string; }`
- **Strict Role-Based UI Separation (RBAC):**
  The top bar switcher and sidebar dynamically adapt across 4 operational roles:
  1. `gerant` (Directeur Général / Gérant BTP — Global Sites, Cashflow, Bank Cautions, Marchés Publics P&L).
  2. `conducteur_travaux` (Project Engineer / Site Manager — Schedules, CTC, Subcontractors, OS Registry).
  3. `chef_chantier` (On-site Foreman — Daily Journal de Chantier, Workforce Muster, Concrete Pours, Material Slips).
  4. `daf_metreur` (Quantity Surveyor & Financial Controller — DQE/BPU, Attachements, Décomptes Provisoires, Trésor Mandatements).
- **Trilingual Localization:** 100% parity across French (`fr`), Arabic (`ar` with native RTL layout flipping), and English (`en`).
- **Offline Resiliency:** Field data entry (Journal de Chantier, concrete delivery slips, attendance) operates offline-first via browser cache and re-syncs automatically.

---

## Feature 1: DQE / BPU Contract Matrix & Cumulative Realization Engine

### 1. PURPOSE
- **Persona:** `daf_metreur` & `conducteur_travaux`.
- **Pain Point:** Contract amendments (*avenants*), missing billable line items, and unmonitored quantity overruns that get rejected by the project owner (*Maître d'Ouvrage*).
- **Outcome:** A unified hierarchical Bill of Quantities (*Détail Quantitatif et Estimatif - DQE*) and Unit Price Schedule (*Bordereau des Prix Unitaires - BPU*) tracking baseline contractual quantities, unit prices in DZD, and cumulative physical realization percentages in real time.

### 2. BUSINESS LOGIC
- **Lot / Sub-lot Breakdown Structure:** Standard Algerian BTP civil structure:
  - `LOT_01_GROS_OEUVRE` (Terrassements, Fondations, Béton Armé en Infrastructure & Superstructure).
  - `LOT_02_MACONNERIE_ENDUITS` (Brique creuse 10cm/15cm, Corps d'enduit mortier de ciment).
  - `LOT_03_ETANCHEITE` (Forme de pente, Multicouche bitumineuse, Protection gravillon).
  - `LOT_04_VRD` (Assainissement, Canalisations PVC/Béton, Bordures trottoir, Enrobé).
  - `LOT_05_SECOND_OEUVRE` (Menuiserie aluminium/bois, Revêtement sol monocouche/grès cérame, Peinture).
- **Quantity Tracking & Over-consumption Formula:**
  $$\text{Realized Percentage (\%)} = \frac{\sum \text{Executed Quantity}}{\text{Contract Baseline Quantity}} \times 100$$
  $$\text{Line Realized Amount (HT)} = \text{Executed Quantity} \times \text{Contract Unit Price}$$
- **Thresholds & Rules:**
  - $\le 100\%$: Normal billing on active contract.
  - $> 100\%$ without amendment: Hard warning flag `QUANTITE_DEPASSEE`. Quantities above 100% cannot be included in official *Décomptes Provisoires* unless covered by a certified *Avenant* (Executive Decree 15-247, Art. 135-139).
- **Permissions:**
  - `gerant` & `daf_metreur`: Full create, edit, import Excel/CSV, lock baseline.
  - `conducteur_travaux`: Propose new work items (*Prix Nouveau / Travaux Supplémentaires*), update execution quantities.
  - `chef_chantier`: View-only for items assigned to active site zone.

### 3. DATA MODEL
```typescript
export interface ContractorBoqItem {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  lotCode: string;          // e.g. "LOT_01_GROS_OEUVRE"
  lotTitle: string;         // e.g. "Gros Œuvre & Fondations"
  itemNumber: string;       // e.g. "01.04"
  designation: string;      // e.g. "Béton armé dosé à 350 kg/m3 pour poteaux et poutres"
  unit: 'm3' | 'm2' | 'ml' | 'kg' | 'tonne' | 'u' | 'forfait';
  contractQuantity: number;
  contractUnitPriceDzd: number;
  totalContractPriceHtDzd: number; // contractQuantity * contractUnitPriceDzd
  executedQuantity: number;
  executedAmountHtDzd: number;     // executedQuantity * contractUnitPriceDzd
  realizationPercent: number;      // (executedQuantity / contractQuantity) * 100
  isAdditionalWork: boolean;       // Travaux supplémentaires hors-bordereau
  avenantReference?: string;       // e.g. "Avenant N° 01"
  status: 'Draft' | 'Active' | 'Amended' | 'Completed';
  createdAt: string;
  updatedAt: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File:** `src/components/screens/contractor/ContractorBoqView.tsx`
- **Modal File:** `src/components/screens/contractor/ContractorBoqItemModal.tsx`
- **Pure Function Utility:**
  ```typescript
  export function calculateBoqTotals(items: ContractorBoqItem[]) {
    const totalContractHt = items.reduce((acc, it) => acc + it.totalContractPriceHtDzd, 0);
    const totalExecutedHt = items.reduce((acc, it) => acc + it.executedAmountHtDzd, 0);
    const overallProgress = totalContractHt > 0 ? (totalExecutedHt / totalContractHt) * 100 : 0;
    return { totalContractHt, totalExecutedHt, overallProgress };
  }
  ```

### 5. UX FLOW & DELIGHT
- **Fewest-Clicks Flow:** Filter by lot -> Inline edit of daily metric quantity -> Press Enter -> Row automatically re-calculates realized amount and triggers visual progress bar update.
- **Microcopy (FR/AR/EN):**
  - FR: *"Bordereau des Prix Unitaires & Quantitatif"* / *"Dépassement de quantité contractuelle"*
  - AR: *"جدول الأسعار الأحادية والكشف الكمي"* / *"تجاوز الكمية التعاقدية"*
  - EN: *"Bill of Quantities & Unit Rates"* / *"Contract quantity overrun"*
- **Delight Feature:** **1-Click Excel DQE Importer with Auto-Lot Parsing**. Automatically detects Arabic or French headers (`N° Article`, `Désignation`, `Unité`, `Quantité`, `Prix Unitaire`) and populates the tree with zero manual re-typing.

---

## Feature 2: Attachements Contradictoires & Décomptes Provisoires under Décret 15-247

### 1. PURPOSE
- **Persona:** `daf_metreur` & `gerant`.
- **Pain Point:** Months of billing delays and rejection by the Public Treasury (*Trésor Public*) due to incorrect retention guarantee deductions, flawed cumulative arithmetic, or uncertified measurements.
- **Outcome:** Automated generation of legal monthly progress billings (*Situations Mensuelles & Décomptes Provisoires*) strictly compliant with Articles 93–100 of Presidential Decree 15-247, featuring the statutory 5% *Retenue de Garantie*, advance repayments, and printable administrative mandatement packets.

### 2. BUSINESS LOGIC & FORMULAS
- **Legal Calculation Engine:**
  1. **Gross Cumulative Realization:**
     $$\text{Montant Brut Cumulé HT} = \sum (\text{Quantité Cumulée Validée} \times \text{Prix Unitaire Contractuel})$$
  2. **Net Period Execution (Current Month):**
     $$\text{Montant Brut du Mois HT} = \text{Montant Brut Cumulé HT} - \text{Montant Brut Cumulé Précédent HT}$$
  3. **Warranty Retention (Retenue de Garantie - RG 5%):**
     - If contract specifies *Caution Bancaire de Retenue de Garantie*: $\text{RG} = 0 \text{ DZD}$.
     - Otherwise:
       $$\text{Retenue de Garantie (5\%)} = \text{Montant Brut du Mois HT} \times 0.05$$
  4. **Contractual Advance Reimbursement (*Remboursement Avance Forfaitaire*):**
     - Under public contracts, a 15% initial cash advance is recovered by deducting an agreed percentage (usually 15% to 20%) from each monthly billing once realization exceeds 30%:
       $$\text{Amortissement Avance} = \text{Montant Brut du Mois HT} \times \text{Taux Amortissement (e.g. 15\%)}$$
  5. **Penalties Deductions (Pénalités de Retard):**
     - Deducted if contractual deadline is breached without an approved *OS d'Arrêt* (capped at 10% total contract value).
  6. **Taxation (TVA):**
     $$\text{Assiette TVA} = \text{Montant Brut du Mois HT} - \text{Retenue de Garantie (si hors taxe)}$$
     $$\text{TVA (19\% ou 9\%)} = \text{Montant Brut HT} \times \text{Taux TVA}$$
  7. **Net Payable to Contractor (*Net à Mandater*):**
     $$\text{Net à Mandater} = (\text{Montant Brut du Mois HT} - \text{RG (5\%)} - \text{Amort. Avance} - \text{Pénalités}) + \text{TVA}$$

- **Worked Numeric Example:**
  - Total Contract: 100,000,000 DZD HT.
  - Previous Cumulated Realized: 20,000,000 DZD HT (Décompte N° 01).
  - Current Cumulated Realized: 30,000,000 DZD HT (Décompte N° 02).
  - Gross Current Month HT: $30,000,000 - 20,000,000 = 10,000,000 \text{ DZD}$.
  - 5% Retenue de Garantie: $10,000,000 \times 0.05 = 500,000 \text{ DZD}$.
  - Amortissement Avance (15%): $10,000,000 \times 0.15 = 1,500,000 \text{ DZD}$.
  - Net HT Subtotal: $10,000,000 - 500,000 - 1,500,000 = 8,000,000 \text{ DZD}$.
  - TVA at 19% (on Gross HT): $10,000,000 \times 0.19 = 1,900,000 \text{ DZD}$.
  - **Net à Payer (Mandatement Trésor Public):** $8,000,000 + 1,900,000 = \mathbf{9,900,000 \text{ DZD}}$.
  - Retenue de Garantie added to frozen escrow: $+500,000 \text{ DZD}$ (Cumulative RG: $1,500,000 \text{ DZD}$).

### 3. DATA MODEL
```typescript
export interface ContractorDgp {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  dgpNumber: number;            // e.g. 2 for "Décompte Provisoire N° 02"
  monthPeriod: string;          // e.g. "2026-04"
  submissionDate: string;
  grossAmountCurrentDzd: number;
  cumulativeGrossDzd: number;
  retentionPercent: number;     // Standard 5%
  retentionAmountCurrentDzd: number;
  cumulativeRetentionDzd: number;
  hasBankCautionReplacement: boolean; // If true, RG deducted = 0 DZD
  bankCautionReference?: string;
  advanceReimbursementDzd: number;
  penaltiesDeductedDzd: number;
  vatRate: number;              // 19 or 9
  vatAmountDzd: number;
  netPayableDzd: number;
  status: 'Draft' | 'SubmittedToBET' | 'ApprovedByBET' | 'Mandated' | 'Cashed';
  tresorMandatReference?: string;
  cashedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File:** `src/components/screens/contractor/ContractorBillingView.tsx`
- **Printable Modal File:** `src/components/screens/contractor/ContractorDecomptePrintModal.tsx`
- **Pure Function Utility:** `src/utils/contractorRules.ts` -> `calculateDecompteProvisoire()`

### 5. UX FLOW & PRINTABLE ARTIFACT
- **User Flow:** Open Billing View -> Click *"Nouveau Décompte"* -> System automatically computes cumulative physical quantities from all approved *Attachements* -> User verifies advance repayment toggle -> Click *"Générer le Dossier de Mandatement"*.
- **Print Layout:** Formal 2-column administrative ledger conforming to Algerian Ministry of Finance templates, with dedicated stamp and signature zones for:
  1. *L'Entrepreneur (General Contractor)*
  2. *Le Maître d'Œuvre (Bureau d'Études / Architect)*
  3. *Le Maître d'Ouvrage (Client / DLEP / DTP)*
  4. *Le Contrôleur Financier / Comptable Assignataire (Trésor Public)*.

---

## Feature 3: Official Journal de Chantier with ONM Weather & CACOBATPH Intempéries Logs

### 1. PURPOSE
- **Persona:** `chef_chantier` & `conducteur_travaux`.
- **Pain Point:** Contractual disputes regarding work delays and rejection of bad-weather compensation claims by CACOBATPH due to lack of daily contemporaneous logs.
- **Outcome:** A compliant electronic *Journal de Chantier* recording daily temperature, rain/wind stoppages with ONM reference codes, workforce count, machinery hours, and concrete pour records with one-tap daily submission.

### 2. BUSINESS LOGIC
- **Mandatory Daily Fields (Algerian CCAG Standards):**
  - Weather condition (`Ensoleillé`, `Pluie / Averses`, `Vent de Sable / Sirocco`, `Neige / Verglas`, `Canicule Extrême > 44°C`).
  - Stoppage Classification:
    - `AUCUN_ARRET` (Normal operations).
    - `INTEMPERIES_CACOBATPH` (Bad weather stoppage qualifying for workers' fund compensation).
    - `ARRET_ADMINISTRATIF` (Missing client instructions / unapproved plans).
    - `ARRET_SECURITE` (Accident or structural hazard identified by CTC).
  - Daily Workforce Muster (*Pointage des effectifs présents*):
    - Encadrement (Ingénieurs, Topographes, Conducteurs).
    - Ouvriers Qualifiés (Ferrailleurs, Coffreurs, Maçons, Électriciens, Plombiers).
    - Manœuvres ordinaires (Day-laborers).
  - Material deliveries (Cement bulk, Ready-mix concrete $m^3$, Rebar steel tons, Aggregates $m^3$).
  - Official Visitors (CTC engineers, Labor Inspector *Inspecteur du Travail*, Architect).

### 3. DATA MODEL
```typescript
export interface ContractorDailyLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  logDate: string;             // YYYY-MM-DD
  weatherSummary: 'Sunny' | 'Rain' | 'HeavyRain' | 'SandStorm' | 'ExtremeHeat' | 'Frost';
  temperatureMinC: number;
  temperatureMaxC: number;
  hasWorkStoppage: boolean;
  stoppageReason?: 'IntemperiesRain' | 'IntemperiesHeat' | 'Administrative' | 'LackOfMaterial';
  stoppageHours: number;       // 0 - 8 hours
  cacobatphNoticeFiled: boolean;
  onmBulletinReference?: string; // e.g. "ONM-ALGER-2026-0314"
  workforceCount: number;
  workersPresent: {
    engineers: number;
    specializedCrafts: number; // Ferrailleurs, Maçons
    laborers: number;          // Manœuvres
  };
  equipmentActiveCount: number;
  equipmentNotes?: string;
  deliveredMaterialsSummary?: string;
  siteObservations?: string;
  ctcVisit: boolean;
  ctcInspectorName?: string;
  ctcObservationNotes?: string;
  isSignedByBet: boolean;
  signedByBetName?: string;
  createdAt: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File:** `src/components/screens/contractor/ContractorDailyLogsView.tsx`
- **Modal File:** `src/components/screens/contractor/ContractorJournalChantierModal.tsx`
- **Pure Function Utility:** `src/utils/contractorRules.ts` -> `validateCacobatphEligibility(stoppageHours, weatherCode, tempMax)`

### 5. UX FLOW & DELIGHT
- **Mobile-First Rapid Input:** Large touch targets designed for field use on construction sites with dusty screens.
- **Delight Feature:** **Automated Wilaya Weather Fetch**. System reads project wilaya (e.g., *16 - Alger*, *30 - Ouargla*, *31 - Oran*) and pre-fills the daily min/max temperatures and meteorological code, highlighting whether extreme summer heat (>44°C) or rainfall qualifies for statutory CACOBATPH stoppage.

---

## Feature 4: Ordres de Service (OS) Registry & Penalties Buffer

### 1. PURPOSE
- **Persona:** `conducteur_travaux` & `gerant`.
- **Pain Point:** Financial devastation from unfair liquidated delay penalties (*Pénalités de Retard*) caused by client delays, utility obstacles (*Réseaux Sonelgaz/SEAAL non déviés*), or unrecorded weather interruptions.
- **Outcome:** A legally binding register of *Ordres de Service* (Commencement, Suspension, Resumption) with automated contractual end-date recalculation and a live penalty liability meter.

### 2. BUSINESS LOGIC & FORMULAS
- **Contractual Timeline Calculation:**
  $$\text{Contractual Duration} = \text{Initial Delay in Months / Days}$$
  $$\text{Revised End Date} = \text{Initial End Date} + \sum (\text{Approved Suspension Days from OS d'Arrêt})$$
- **Statutory Delay Penalty Rule (Décret 15-247, Art. 116):**
  $$\text{Daily Penalty} = \frac{\text{Contract Total Amount HT}}{1000 \text{ or contract divisor}}$$
  $$\text{Maximum Penalty Cap} = 10\% \times \text{Contract Total Amount HT}$$
  *Under Algerian law, total accumulated delay penalties can never legally exceed 10% of the initial contract plus amendments.*

### 3. DATA MODEL
```typescript
export interface ContractorServiceOrder {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  osNumber: string;            // e.g. "OS N° 03/2026"
  osType: 'Commencement' | 'Suspension' | 'Resumption' | 'Modification';
  effectiveDate: string;
  notificationDate: string;
  reason: 'GeneralStart' | 'IntemperiesWeather' | 'ObstacleSonelgaz' | 'PaymentDelay' | 'DesignRevision';
  durationDaysGranted: number; // e.g. 21 days added to timeline
  issuerName: string;          // e.g. "Direction du Logement (DLEP)"
  issuerRepresentative: string;
  contractorSignedDate?: string;
  hasReservationLetter: boolean; // Réserves émises par l'entrepreneur
  reservationLetterRef?: string;
  status: 'Notified' | 'AcceptedWithReservations' | 'Executed';
  createdAt: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File:** Integrated within `ContractorDashboardView.tsx` and `ContractorSitesView.tsx`.
- **Modal File:** `src/components/screens/contractor/ContractorOsModal.tsx`.
- **Pure Function Utility:** `src/utils/contractorRules.ts` -> `calculateContractTimelineAndPenalties()`.

---

## Feature 5: Concrete Quality, Batch Slips & 7/28-Day CTC Crushing Tests

### 1. PURPOSE
- **Persona:** `conducteur_travaux` & `chef_chantier`.
- **Pain Point:** Inability to secure decennial insurance validation from CTC due to untracked concrete batch origins and missing 28-day crushing test certifications.
- **Outcome:** An interactive concrete pour register mapping batch supplier delivery tickets (*Bons de Toupie*), slump tests, test cylinders (*Éprouvettes*), and automated alerts when 7-day and 28-day crushing results are due from the soil/concrete laboratory (*Laboratoire d'essais LNHC/LTPO*).

### 2. BUSINESS LOGIC & THRESHOLDS
- **Compressive Strength Benchmarks (Algerian CBA 93 / Eurocode):**
  - Standard structural mix: $B25$ (Target characteristic strength $f_{c28} \ge 25 \text{ MPa}$).
  - 7-Day Crushing Rule: Concrete should reach $\ge 65\%$ to $70\%$ of 28-day strength:
    $$f_{c7} \ge 0.70 \times f_{c28} \approx 17.5 \text{ MPa for } B25$$
  - If 7-day strength is below 16 MPa, system raises an amber structural alert: `ALERTE_RESISTANCE_FAIBLE`.
  - If 28-day laboratory result $< 25 \text{ MPa}$, system raises a critical red alert: `NON_CONFORME_CTC` requiring core sampling (*Carottage*).

### 3. DATA MODEL
```typescript
export interface ConcretePourRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  pourDate: string;
  elementPoured: string;       // e.g. "Voiles & Poteaux R+2 - Bloc A"
  supplierName: string;        // e.g. "Béton Centre SARL"
  deliverySlipNumber: string;  // e.g. "BL-88291"
  volumePouredM3: number;
  concreteGrade: 'B15' | 'B20' | 'B25' | 'B30' | 'B35';
  slumpCm: number;             // Affaissement au cône d'Abrams (e.g. 12cm)
  ambientTemperatureC: number;
  testCylindersTaken: number;  // Standard 6 éprouvettes (3 for 7d, 3 for 28d)
  strength7DaysMpa?: number;
  strength28DaysMpa?: number;
  labCertificateNumber?: string;
  ctcClearanceObtained: boolean;
  status: 'CastPending7D' | 'Passed7D' | 'Passed28D' | 'NonConforming';
  createdAt: string;
}
```

---

## Feature 6: Subcontractor Agreements & Back-to-Back Retention Settlements

### 1. PURPOSE
- **Persona:** `daf_metreur` & `gerant`.
- **Pain Point:** Financial exposure when a subcontractor (*Sous-traitant*) demands full payment before structural validation or abandons the site leaving defects uncorrected.
- **Outcome:** Subcontract agreement tracker enforcing matching 5% or 10% *Retenue de Garantie* on subcontractors, milestone signoffs tied to client approval, and clearance certificates (*Quitus de chantier*).

### 2. BUSINESS LOGIC
- Subcontractor invoices (*Situations de Sous-traitance*) are held to a strict rule:
  $$\text{Net Subcontractor Payout} = \text{Claimed Amount} - (\text{Claimed Amount} \times \text{RG \% (5 to 10\%)}) - \text{Advance Deduction}$$
  The retention guarantee is released strictly after the primary contractor client issues the *PV de Réception Provisoire sans réserves*.

---

## 4-Role UI Separation (RBAC) Architecture

| Role ID | Visual Persona Title | Visible Navigation Screens | Restricted / Hidden Screens |
| :--- | :--- | :--- | :--- |
| `gerant` | 🏗️ **Gérant BTP (Directeur Général)** | Portfolio Dashboard, Sites & Marchés, Billing & Trésor, BPU / DQE, Daily Logs, Subcontractors, Financial Analytics | None (Full Operational & Financial Access) |
| `conducteur_travaux` | 📐 **Conducteur de Travaux (Ingénieur)** | Sites & Marchés, BoQ / DQE Execution, Service Orders (OS), Concrete Quality & CTC, Daily Logs | Billing & Trésor Public Mandatements (Hidden) |
| `chef_chantier` | 👷 **Chef de Chantier (Field Foreman)** | Site Daily Logs (Journal de Chantier), Concrete Pour Records, Material Slips | Billing, Financials, Contract Margins, Subcontractor Agreements (Hidden) |
| `daf_metreur` | 💼 **DAF & Métreur-Vérificateur** | Billing & Situations (Décomptes), BoQ / DQE Matrix, Subcontractor Settlements, Trésor Mandatements | Daily Safety Logs, Heavy Equipment Fuel Logs (Secondary) |

---

## Edge Cases & Failure Mode Matrix

```
+--------------------------+------------------------------------+---------------------------------------+---------------------------------------+
| Category                 | Trigger / Scenario                 | System Behavior                       | User-Visible Notification (FR/AR)     |
+--------------------------+------------------------------------+---------------------------------------+---------------------------------------+
| 1. Missing Input         | Missing DQE contract unit price or | Blocks calculation; highlights cell;  | "Prix unitaire contractuel obligatoire"|
|                          | zero quantity entered.             | disables "Générer Décompte".          | "سعر الوحدة التعاقدي إلزامي"         |
|                          |                                    |                                       |                                       |
| 2. Quantity Overrun      | Realized quantity exceeds 100% of  | Triggers "Avenant Requis" warning;   | "Attention : Dépassement de quantité  |
|                          | contractual baseline.              | prevents uncertified billing.         | contractuelle. Avenant requis."       |
|                          |                                    |                                       | "تنبيه: تجاوز الكمية التعاقدية. ملحق" |
|                          |                                    |                                       |                                       |
| 3. Double-Deduction Risk | User enters bank caution reference | Automatically zeros out the 5% cash   | "Caution bancaire active : déduction  |
|                          | and toggles cash retention.        | retention deduction to prevent fraud. | de 5% désactivée."                    |
|                          |                                    |                                       | "الكفالة البنكية مفعلة: إلغاء الخصم"  |
|                          |                                    |                                       |                                       |
| 4. CTC Strength Failure  | Concrete 28-day crushing test is   | Flags record red; generates non-      | "Alerte CTC : Résistance inférieure   |
|                          | below 25 MPa (< 250 bars).         | conformity incident; blocks payment.  | à 25 MPa. Carottage requis."          |
|                          |                                    |                                       | "تحذير: مقاومة الخرسانة غير مطابقة"   |
|                          |                                    |                                       |                                       |
| 5. Offline Connectivity  | Foreman logs site journal in       | Caches locally in IndexedDB; syncs    | "Mode Hors-ligne : Journal sauvegardé |
|                          | remote area with no 4G network.    | with server when network resumes.     | localement. Synchronisation en attente"|
|                          |                                    |                                       | "وضع عدم الاتصال: الحفظ محلياً"      |
|                          |                                    |                                       |                                       |
| 6. Delay Penalties Limit | Delay penalty calculation reaches  | Caps penalty at 10% pursuant to       | "Plafond légal atteint : les pénalités|
|                          | > 10% of total contract amount.    | Décret 15-247, Art. 116.              | sont plafonnées à 10% du marché."     |
|                          |                                    |                                       | "تم بلوغ الحد الأقصى القانوني للغرامات"|
+--------------------------+------------------------------------+---------------------------------------+---------------------------------------+
```

---

## Acceptance Criteria & Test Engine (`src/utils/contractorRules.test.ts`)

### Pure Function Unit Tests:
1. `calculateDecompteProvisoire`:
   - Given: Gross current realization 10,000,000 DZD, standard 5% RG, 0 advance, 19% TVA.
   - When: Evaluated through calculation engine.
   - Then: RG = 500,000 DZD, Net HT = 9,500,000 DZD, TVA = 1,900,000 DZD, Net Payable = 11,400,000 DZD.
2. `calculateDecompteProvisoireWithCaution`:
   - Given: Gross 10,000,000 DZD, `hasBankCautionReplacement = true`.
   - Then: RG = 0 DZD, Net HT = 10,000,000 DZD, Net Payable = 11,900,000 DZD.
3. `calculateDelayPenaltiesCapped`:
   - Given: Contract 50,000,000 DZD, 120 days late, daily rate = 50,000 DZD (total = 6,000,000 DZD).
   - Then: Penalties must be strictly capped at $10\% \times 50,000,000 = 5,000,000 \text{ DZD}$.
4. `calculateConcreteTheoreticalVolume`:
   - Given: Slab 20m $\times$ 10m $\times$ 0.20m with 5% normal waste factor.
   - Then: Theoretical = $40.00 \text{ m}^3$, Billable expected = $42.00 \text{ m}^3$.
5. `validateConcreteStrength28D`:
   - Given: Mix B25 with tested strength 22.4 MPa.
   - Then: Returns `isConforming: false`, triggers CTC carottage warning.
6. `validateCacobatphWeatherStoppage`:
   - Given: Rain stoppage 6 hours on a working day with ONM certificate.
   - Then: Eligible for bad-weather indemnity declaration.

---

## 4-Slice Phased Build Order

### Slice 1: Pure Domain Rules & Unit Test Suite
- Create `src/utils/contractorRules.ts` with mathematical and legal logic.
- Create `src/utils/contractorRules.test.ts` with comprehensive unit tests and integrate into `package.json` test script.

### Slice 2: Data Store & Types Extension
- Update `src/types/index.ts` with BTP entities (`ContractorProject`, `ContractorBoqItem`, `ContractorDgp`, `ContractorDailyLog`, `ContractorServiceOrder`, `ConcretePourRecord`).
- Update `src/services/store.ts` with `activeContractorRole` state and actions (`gerant`, `conducteur_travaux`, `chef_chantier`, `daf_metreur`).
- Enrich `src/components/screens/contractor/contractorData.ts` with 4 complete Algerian site datasets (Algiers, Oran, Blida, BBA).

### Slice 3: Role Switcher & Dynamic Navigation
- Update `TopBar.tsx` to display the 4-role switcher when `currentBusiness?.category === 'construction_contractor'`.
- Update `Sidebar.tsx` to adapt docking navigation per selected role.

### Slice 4: Domain Screens & Specialized Modals
- Upgrade `ContractorBillingView.tsx` with Décomptes Provisoires, Retenues de Garantie, and Subcontractors tabs.
- Upgrade `ContractorDailyLogsView.tsx` with ONM weather integration, CACOBATPH stoppage tracking, and workforce muster.
- Create `ContractorDecomptePrintModal.tsx` for printable Décret 15-247 billing dossiers.
- Create `ContractorJournalChantierModal.tsx` and `ContractorOsModal.tsx`.
- Final verification via `lint_applet`, `compile_applet`, and test execution.
