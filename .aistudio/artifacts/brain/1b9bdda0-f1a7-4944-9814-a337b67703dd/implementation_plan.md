# Master Implementation Specification: Light Manufacturing & Workshop Production (Algeria)

**Category 12**: Light Manufacturing, Workshop Production & Assembly (*Atelier de Fabrication, Façonnage & Production Industrielle PME - Algérie*)  
**Design System**: Atrium Canonical Desktop Pod Architecture (`#F8F9FA` trays, `#1F1D1B` Dark Espresso anchors, `#C4785A` Terracotta `AtriumButton`, `UniversalDataCollection`, `Seek`, `LabelInput`, `LabelSelect`)  
**Traceability Mandate**: Every record upholds the Quadruple Standard `{ accountId, businessId, branchId, staffId }`  
**Market & Legal Context**: Algeria (DZD currency, French / Arabic RTL, Décret exécutif 05-468, Loi 04-02, Loi 88-07, Code du Timbre Art. 317, G50, IANOR, ONML)  
**Security & Access Architecture**: Strict Role-Based UI Separation (RBAC) across 5 dedicated roles with TopBar dev switcher and screen-locked sidebar navigation

---

## Workspace Role Separation & Navigation Matrix

To guarantee strict separation of concerns, each role accesses **only** their authorized screens:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MANUFACTURING ROLE-BASED ACCESS CONTROL                                │
├───────────────────────┬────────┬───────────────────────────────┬───────────────────────────────────────┤
│ ROLE KEY              │ ICON   │ OPERATIONAL PROFILE           │ AUTHORIZED SCREENS IN SIDEBAR         │
├───────────────────────┼────────┼───────────────────────────────┼───────────────────────────────────────┤
│ gerant                │ 👔     │ Direction & Gérant            │ • Tableau de Bord Usine & Marges      │
│                       │        │ مدير المصنع                    │ • Ordres de Fabrication (OF)          │
│                       │        │                               │ • Nomenclatures & Gammes (BOM)        │
│                       │        │                               │ • Matières Premières & Stocks         │
│                       │        │                               │ • Contrôle Qualité & Non-Conformités  │
│                       │        │                               │ • Facturation DGI & Coûts de Revient  │
│                       │        │                               │ • Paramètres de l'Usine               │
├───────────────────────┼────────┼───────────────────────────────┼───────────────────────────────────────┤
│ chef_atelier          │ 🏭     │ Chef d'Atelier & Méthodes     │ • Tableau de Bord Atelier & Goulots   │
│                       │        │ رئيس الورشة                   │ • Ordres de Fabrication (OF Kanban)   │
│                       │        │                               │ • Nomenclatures & Gammes (BOM)        │
│                       │        │                               │ • Bons de Sortie Matières             │
│                       │        │                               │ • Fiches de Contrôle Qualité          │
│                       │        │                               │ (Hidden: Facturation, Marges, Settings│
├───────────────────────┼────────┼───────────────────────────────┼───────────────────────────────────────┤
│ operateur             │ ⏱️     │ Opérateur Machine (Tablette)  │ • Terminal Poste de Travail (Touch)   │
│                       │        │ مشغل الآلة                    │ • Mes Tâches & Bons de Travail du Jour│
│                       │        │                               │ (Locked kiosk view: only active timer,│
│                       │        │                               │  spec sheet, scrap log & call button) │
├───────────────────────┼────────┼───────────────────────────────┼───────────────────────────────────────┤
│ magasinier            │ 📦     │ Magasinier & Stocks           │ • Magasin Matières & Emplacements     │
│                       │        │ أمين المخزن                   │ • Bons de Réception Fournisseur (BR)  │
│                       │        │                               │ • Bons de Sortie Atelier (Décret 05)  │
│                       │        │                               │ • Bons de Livraison Produits Finis(BL)│
│                       │        │                               │ (Hidden: Finances, BOM edit, Marges)  │
├───────────────────────┼────────┼───────────────────────────────┼───────────────────────────────────────┤
│ qualite               │ 🛡️     │ Responsable Qualité / Métrolog│ • Registre Contrôle Qualité & Tests   │
│                       │        │ مراقب الجودة                  │ • Lots en Quarantaine & Dérogations   │
│                       │        │                               │ • Étalonnage Instruments (ONML)       │
│                       │        │                               │ (Hidden: Création OF, Stocks, Factures│
└───────────────────────┴────────┴───────────────────────────────┴───────────────────────────────────────┘
```

---

# SECTION I: DETAILED FEATURE SPECIFICATIONS

---

## FEATURE 1: Multi-Mode Bill of Materials (BOM) & Recipe Studio (*Nomenclatures & Recettes Multi-Niveaux*)

### 1. PURPOSE
Allows the **Chef d'Atelier** and **Gérant** to eliminate arbitrary price quoting and scrap underestimation by modeling exact material recipes, multi-level sub-assemblies, machine runtimes, and planned scrap allowances per product variant.

### 2. BUSINESS LOGIC
* **Costing Formula (Coût de Revient Théorique)**:
  $$\text{Coût Matière Total} = \sum_{i=1}^n \left( Q_i \times (1 + S_i) \times PMP_i \right)$$
  Where:
  - $Q_i$ = Net component quantity required.
  - $S_i$ = Planned technical scrap allowance percentage (e.g. $0.05$ for $5\%$ drop loss in sheet cutting).
  - $PMP_i$ = Weighted Average Unit Cost (*Prix Moyen Pondéré*) of raw material component $i$ in DZD.
* **Labor & Machine Overhead (Taux Horaire Poste)**:
  $$\text{Coût Opérationnel} = \sum_{j=1}^m \left( T_j \times (\text{Taux Opérateur}_j + \text{Taux Machine}_j) \right)$$
  Where $T_j$ is operation duration in hours.
* **State Machine**:
  `Draft` $\xrightarrow{\text{Chef Atelier}}$ `UnderReview` $\xrightarrow{\text{Gérant}}$ `Active` $\xrightarrow{\text{Gérant/Chef}}$ `Archived` (Replaced by new version).
* **Worked Numeric Example**:
  Producing 1 unit of *Porte Blindée 2100x900mm*:
  - Tôle d'Acier Électrozinguée 15/10e: $2.4\text{ m}^2 \times (1 + 0.08\text{ scrap}) \times 4,200\text{ DZD/m}^2 = 10,886.40\text{ DZD}$.
  - Serrure 5 Points Haute Sécurité: $1\text{ pce} \times 18,500\text{ DZD} = 18,500.00\text{ DZD}$.
  - Peinture Époxy Poudrée: $1.2\text{ kg} \times 1,400\text{ DZD/kg} = 1,680.00\text{ DZD}$.
  - Découpe Laser (0.4h @ 6,000 DZD/h machine): $2,400.00\text{ DZD}$.
  - Pliage & Soudure (1.5h @ 1,200 DZD/h ouvrier + 800 machine): $3,000.00\text{ DZD}$.
  - Total Coût de Revient HT = $36,466.40\text{ DZD}$. Recommended Sales Price ($\ge 35\%$ margin) = $56,102.15\text{ DZD}$ HT.

### 3. DATA MODEL
```typescript
export interface ManufacturingBomComponent {
  id: string;
  rawProductId: string;
  rawProductName: string;
  rawProductSku: string;
  quantity: number;
  unit: 'kg' | 'm' | 'm2' | 'm3' | 'liter' | 'piece' | 'sheet' | 'roll';
  scrapAllowancePercent: number; // e.g. 5 for 5%
  unitCostDzd: number; // Snapshot of current PMP
  subTotalCostDzd: number;
  isSubAssembly?: boolean;
  subBomId?: string; // Foreign key for multi-level nesting
}

export interface ManufacturingRoutingStep {
  id: string;
  stepNumber: number;
  workCenterId: string;
  workCenterName: string;
  operationName: string;
  setupTimeMinutes: number;
  runTimePerUnitMinutes: number;
  operatorRateDzdPerHour: number;
  machineRateDzdPerHour: number;
  requiredSkillLevel: string;
  safetyPpeNotes?: string; // Loi 88-07 mandatory gear
}

export interface ManufacturingBom {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  bomCode: string; // e.g. "BOM-MET-0042"
  version: number; // e.g. 1, 2
  finishedProductId: string;
  finishedProductName: string;
  finishedProductSku: string;
  archetype: 'Discrete' | 'CustomJob' | 'BatchProcess' | 'TextileApparel';
  batchYield: number; // standard batch size
  unit: string;
  status: 'Draft' | 'UnderReview' | 'Active' | 'Archived';
  components: ManufacturingBomComponent[];
  routingSteps: ManufacturingRoutingStep[];
  totalMaterialCostDzd: number;
  totalLaborMachineCostDzd: number;
  totalCostOfProductionDzd: number;
  suggestedSalePriceDzd: number;
  targetMarginPercent: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. CODE ARCHITECTURE
* **File Location**:
  - `src/components/screens/manufacturing/ManufacturingBomView.tsx` (Main BOM library with UniversalDataCollection)
  - `src/components/screens/manufacturing/ManufacturingBomModal.tsx` (Multi-step creation wizard)
  - `src/utils/manufacturingRules.ts` (Pure math functions: `calculateBomUnitCost`, `computeScrapYield`, `expandSubBoms`)
* **State Management**:
  - Local state in `ManufacturingBomView` for filters (`archetype`, `status`) and drawer selection.
  - Persistent store in `useManufacturingData` hook (`localStorage` cache synced with Supabase `mfg_boms` table).
* **Pure Function Signature**:
  ```typescript
  export function calculateBomCost(
    components: ManufacturingBomComponent[],
    routing: ManufacturingRoutingStep[],
    batchYield: number
  ): { materialCost: number; laborCost: number; unitCostDzd: number };
  ```

### 5. UX FLOW & DELIGHT
* **User Flow**:
  1. Chef d'Atelier clicks `AtriumButton` (`+ Nouvelle Nomenclature`).
  2. Modal opens with 3-tab layout: *1. Identifiants & Produit*, *2. Recette Matières (BOM)*, *3. Gamme Opératoire (Postes)*.
  3. Adding raw components features instant auto-complete with live PMP and stock availability alerts.
  4. Live bottom tray computes Gross Margin in real time as quantities or scrap percentages change.
* **Competitor-Beating Delight**: **Visual BOM Cost Anatomy Bar**: A segmented SVG bar graph right inside the drawer showing the exact % breakdown: Steel ($42\%$) vs. Hardware ($34\%$) vs. Machine Power ($12\%$) vs. Direct Labor ($12\%$). One click to export a bilingual client technical sheet in French and Arabic.
* **Microcopy (FR / AR)**:
  - Button: `Créer la Nomenclature` / `إنشاء بطاقة المكونات`
  - Scrap label: `Marge de Chute / Rebut (%)` / `نسبة الفاقد / الهالك (%)`
  - Empty state: `Aucune nomenclature définie pour cette catégorie.` / `لم يتم تسجيل أي بطاقة مكونات لهذه الفئة.`

### 6. EDGE CASES & FAILURE HANDLING
* **Invalid Input**: Negative quantity or scrap $> 100\% \rightarrow$ Input rejects immediately with red terracotta halo: *"Le taux de chute doit être compris entre 0% et 50%."*
* **Concurrency**: Two supervisors editing BOM v1 simultaneously $\rightarrow$ Last commit creates auto-incremented revision `v1.1` with visual diff badge instead of overwriting.
* **Time**: Daylight savings / clock drift $\rightarrow$ All timestamps in ISO UTC (`toISOString()`).
* **Money**: Fractional dinars $\rightarrow$ Rounded to 2 decimals using standard bankers' rounding (`Math.round((val + Number.EPSILON) * 100) / 100`).
* **Permissions**: Operator tries to view BOM margins $\rightarrow$ Financial costs hidden; operator sees only component quantities and technical drawings.
* **Connectivity**: Offline during BOM edit $\rightarrow$ Draft autosaved to `localStorage.atrium_bom_draft` every 15 seconds.
* **Data Integrity**: Deleting a raw material component referenced by 3 active BOMs $\rightarrow$ Action blocked with modal list of dependent BOMs requiring replacement first.
* **Legal**: Deleted BOMs $\rightarrow$ Soft-deleted (`Archived`), preserving traceability for historical orders.
* **Human Error**: Wrong finished product selected $\rightarrow$ 1-click "Changer de produit cible" clears components only after explicit confirmation dialog.

### 7. ACCEPTANCE CRITERIA
* **Given** a BOM with 3 raw components costing 10,000 DZD and 5% scrap,
* **When** the supervisor enters 2.0 hours of machining @ 2,500 DZD/h for a batch yield of 5 units,
* **Then** the unit production cost must compute to exactly $(10,500 + 5,000) / 5 = 3,100.00\text{ DZD}$.

---

## FEATURE 2: Work Order Execution Engine (*Ordres de Fabrication - OF*)

### 1. PURPOSE
Allows the **Chef d'Atelier** and **Gérant** to schedule, track, and close production runs with sequential numbering, preventing lost orders, stockouts, and untracked late deliveries.

### 2. BUSINESS LOGIC
* **State Machine**:
  `Draft` $\xrightarrow{\text{Assign BOM}}$ `Planned` $\xrightarrow{\text{Reserve Stock}}$ `Released` $\xrightarrow{\text{First Machine Start}}$ `InProduction` $\xrightarrow{\text{All Operations Done}}$ `QC_Pending` $\xrightarrow{\text{QC Pass}}$ `Completed` $\xrightarrow{\text{Close}}$ `Archived`.
  *(Alternative branch: `Cancelled` if client revokes order; unallocates reserved raw stock).*
* **Automatic Lot Generator**:
  $$\text{Lot Number} = \text{LOT-} + \text{YYYY} + \text{MM} + \text{-} + \text{Seq (001...)}$$
  E.g. `LOT-202610-0089`.
* **Worked Numeric Example**:
  Client confirms order for 500 units of *Boîte Carton Pliable 350g*:
  - Scheduled Launch: 29 Oct 2026. Due Date: 04 Nov 2026.
  - Raw material reservation triggered immediately: 185 sheets of *Carton Gris 70x100cm*.
  - Work order number assigned: `OF-2026-00341`.

### 3. DATA MODEL
```typescript
export type ManufacturingOrderStatus = 
  | 'Draft' 
  | 'Planned' 
  | 'Released' 
  | 'InProduction' 
  | 'QC_Pending' 
  | 'Completed' 
  | 'Cancelled';

export interface ManufacturingOrder {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  orderNumber: string; // "OF-2026-00341"
  batchLotNumber: string; // "LOT-202610-0089"
  bomId: string;
  bomCode: string;
  productName: string;
  targetQuantity: number;
  actualQuantityProduced: number;
  scrapQuantity: number;
  scrapReasonCode?: string;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  status: ManufacturingOrderStatus;
  assignedWorkCenterIds: string[];
  totalMaterialCostDzd: number;
  totalLaborCostDzd: number;
  totalCostDzd: number;
  clientOrderId?: string;
  clientName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. CODE ARCHITECTURE
* **File Location**:
  - `src/components/screens/manufacturing/ManufacturingOrdersView.tsx` (Kanban + UniversalDataCollection dual view)
  - `src/components/screens/manufacturing/ManufacturingOrderModal.tsx` (Creation & launch wizard)
* **Pure Utility**: `validateStockAvailabilityForOf(bom, targetQuantity, stockInventory)`: returns `{ canFulfill: boolean; missingComponents: Array<{ name: string; required: number; available: number }> }`.

### 5. UX FLOW & DELIGHT
* **User Flow**:
  1. Chef d'Atelier views OF List or Kanban pipeline.
  2. Clicking `+ Nouvel Ordre (OF)` opens modal; selects BOM from dropdown with thumbnail; types desired quantity.
  3. Instant stock validation bar lights up: 🟢 *Tous les composants sont disponibles en stock* or 🔴 *Manque 14.5 kg de Polypropylène*.
  4. Clicking `Lancer la Production` moves OF directly into operator tablet queues.
* **Delight**: **1-Click Thermal Route Sheet (Fiche Suiveuse OF)**: Generates a crisp A5 printable routing sheet with bold QR/Barcode, station check boxes, and safety gear icons for physical attachment to the shop-floor pallet.

---

## FEATURE 3: Shop-Floor Tablet Touch Terminal with Timers (*Terminal Opérateur Poste*)

### 1. PURPOSE
Allows **Machine Operators** and **Machinists** to record exact machine runtimes, setup times, and scrap quantities without paper clutter or manual end-of-week estimates.

### 2. BUSINESS LOGIC
* **Touch Kiosk Discipline**:
  - High-contrast, large touch targets ($\ge 56\text{px}$).
  - Numeric keypad inputs for glove-wearing operators.
  - Three primary states: `STANDBY (Arrêt / Prêt)`, `RUNNING (En Cours)`, `PAUSED (Pause / Panne / Outillage)`.
* **Efficiency & Scrap Formula**:
  $$\text{Rendement Poste (\%)} = \frac{\text{Quantité Conforme}}{\text{Quantité Totale Traitée}} \times 100$$
* **Loi 88-07 Safety Acknowledgment Gate**: Before the timer can start, a 1-tap safety confirmation checkbox appears: *"J'ai vérifié les carters de protection et porte mes EPI obligatoires."*

### 3. DATA MODEL
```typescript
export interface WorkstationSessionLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string; // Operator ID
  operatorName: string;
  workCenterId: string;
  workCenterName: string;
  orderId: string;
  orderNumber: string;
  stepNumber: number;
  operationName: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  pauseDurationSeconds: number;
  pauseReason?: 'ToolingChange' | 'Breakdown' | 'ShiftChange' | 'MaterialWait';
  goodQuantity: number;
  scrapQuantity: number;
  scrapReason?: 'SetupPiece' | 'DimensionError' | 'BurntMaterial' | 'Cracked';
  status: 'Active' | 'Paused' | 'Submitted';
  createdAt: string;
}
```

### 4. CODE ARCHITECTURE
* **File Location**:
  - `src/components/screens/manufacturing/ManufacturingWorkstationView.tsx` (Dedicated touchscreen kiosk mode)
  - `src/components/screens/manufacturing/WorkstationTimerCard.tsx` (Isolated reactive timer component)
* **Offline Mechanics**: Timer uses persistent epoch start `sessionStorage.getItem('mfg_timer_start')`. Even if browser refreshes or tablet goes to sleep, timer resumes accurately.

### 5. UX FLOW & DELIGHT
* **User Flow**:
  1. Operator approaches tablet mounted at workstation; taps their name/photo or scans badge barcode.
  2. Active OFs assigned to their station appear in clean, high-contrast cards.
  3. Taps `Démarrer le Poste`. Giant 48px monospace timer begins counting.
  4. On completion, taps `Terminer le Lot`. A high-contrast numpad asks: *Pièces Bonnes? [246]* - *Chutes? [4]*.
* **Delight**: **Emergency Help Andon Cord (Bouton d'Appel Chef d'Atelier)**: A dedicated prominent amber button that instantly sends a high-priority kinetic audio chime and top-screen notification to the Chef d'Atelier's phone/dashboard with station name and issue type.

---

## FEATURE 4: Raw Materials Inventory & Legal Transfer Slips (*Décret 05-468*)

### 1. PURPOSE
Allows the **Magasinier** and **Comptable** to control raw material stocks, execute FIFO/CMUP valuation, and print legally enforceable Algerian exit and delivery vouchers (*Bons de Sortie, BR, BL*).

### 2. BUSINESS LOGIC
* **Valuation Model (CMUP après chaque entrée)**:
  $$\text{Nouveau PMP} = \frac{(\text{Stock Existant} \times \text{Ancien PMP}) + (\text{Quantité Entrante} \times \text{Prix d'Achat HT})}{\text{Stock Existant} + \text{Quantité Entrante}}$$
* **Décret exécutif n° 05-468 Compliance**:
  Every material exit from warehouse to production floor MUST generate a numbered **Bon de Sortie Magasin (BSM)** showing:
  - BSM sequential ID: `BSM-2026-00124`.
  - Date & hour of dispatch.
  - Target OF and receiving operator signature area.
  - Raw material lot number and warehouse bin location.

### 3. DATA MODEL
```typescript
export interface RawMaterialStockItem {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  sku: string; // e.g. "RAW-ALU-02"
  name: string;
  category: 'Metals' | 'Plastics' | 'Chemicals' | 'Wood' | 'Textiles' | 'Hardware' | 'Packaging';
  currentStock: number;
  allocatedStock: number; // Reserved for active OFs
  availableStock: number; // current - allocated
  reorderThreshold: number;
  unit: string;
  unitCostPmpDzd: number;
  totalValuationDzd: number;
  warehouseLocation: string; // "Allée A - Rack 03"
  supplierLotNumber?: string;
  onmlCertificateRef?: string; // Weigh scale certificate
  createdAt: string;
}

export interface MaterialTransferVoucher {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  voucherNumber: string; // "BSM-2026-00421"
  voucherType: 'BonDeSortie' | 'BonDeReception' | 'BonDeTransfert';
  orderId?: string;
  orderNumber?: string;
  recipientStaffName: string;
  transferDate: string;
  items: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    unitCostDzd: number;
    lotNumber?: string;
  }>;
  totalValueDzd: number;
  notes?: string;
}
```

### 4. CODE ARCHITECTURE
* **File Location**:
  - `src/components/screens/manufacturing/ManufacturingMaterialsView.tsx` (Pod tray with UniversalDataCollection)
  - `src/components/screens/manufacturing/MaterialVoucherModal.tsx` (Creation & A4 print generator)

---

## FEATURE 5: Quality Control (QC) Gates & Quarantine (*Contrôle Qualité & Non-Conformité*)

### 1. PURPOSE
Allows the **Responsable Qualité** to inspect intermediate and final batches, enforce IANOR conformity, and quarantine defective parts before they reach customer delivery trucks.

### 2. BUSINESS LOGIC
* **Gate Enforcement**: Finished goods cannot be received in the sales warehouse without a digital signature on the **Fiche de Contrôle Qualité**.
* **Quarantine Split**:
  - Conforming units $\rightarrow$ Dispatched to Finished Goods inventory.
  - Defective units $\rightarrow$ Routed to `Zone de Quarantaine / Rebuts`. Cost charged directly to scrap variance ledger.

### 3. DATA MODEL
```typescript
export interface QualityInspectionRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  inspectionNumber: string; // "QC-2026-00084"
  orderId: string;
  orderNumber: string;
  batchLotNumber: string;
  productName: string;
  sampleSize: number;
  inspectedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  verdict: 'Accepted' | 'AcceptedWithDerogation' | 'Quarantined' | 'Scrapped';
  checkpoints: Array<{
    parameter: string; // "Épaisseur tôle (mm)", "Résistance soudure"
    nominalValue: string;
    tolerance: string;
    measuredValue: string;
    passed: boolean;
  }>;
  inspectorName: string;
  inspectionDate: string;
  certificateOfConformityGenerated: boolean;
  notes?: string;
}
```

---

## FEATURE 6: Machine Maintenance & Subcontracting Outwork (Should Features)

### 1. PURPOSE
Allows the **Chef d'Atelier** to schedule preventative machine servicing (preventing sudden factory stops) and manage outsourced processes (*façonnage externe* like thermal coating or laser cutting) with strict material reconciliation.

### 2. BUSINESS LOGIC
* **Maintenance Trigger**:
  $$\text{Heures de Fonctionnement Cumulées} \ge \text{Seuil d'Entretien (ex: 200h)}$$
  Triggers automatic warning tile on supervisor dashboard.
* **Subcontracting Slip**: Records outgoing raw pieces sent to external partner, expected return date, and unit processing cost HT.

---

# SECTION II: CROSS-FEATURE CHECKS & SELF-REVIEW

## A. Cross-Feature Checks & Data Flow
1. **BOM to OF to Stock Flow**: Creating an OF reserves stock in `RawMaterialStockItem.allocatedStock`. Launching the OF creates a Décret 05-468 `BonDeSortie` deducting physical stock. Completing the OF updates Finished Goods.
2. **Shop Floor to QC**: Finishing all workstation operations sets OF status to `QC_Pending`. QC verdict automatically unlocks the `Bon de Livraison` generation.
3. **Traceability Inheritance**: Client Delivery Note (BL) inherits `batchLotNumber`, which traces back to raw material supplier lots.

## B. Self-Review: 10 Weakest Points & How They Are Fixed in This Spec
1. *Weakness*: Relying on cloud internet in remote industrial zones.  
   *Fix*: Standalone local-first cache with full offline kiosk timer resilience in `sessionStorage` and epoch subtraction.
2. *Weakness*: Operators with dirty hands or safety gloves cannot click small desktop buttons.  
   *Fix*: Kiosk touch mode with $\ge 56\text{px}$ touch targets and oversized numeric numpads.
3. *Weakness*: Scrap theft disguised as cutting waste.  
   *Fix*: Mandatory comparison between planned BOM scrap % and actual logged scrap weight, with automated variance alerts.
4. *Weakness*: Algerian tax audit risk for untracked material movements.  
   *Fix*: Hardcoded compliance with Décret exécutif n° 05-468 (official numbered exit and transfer vouchers).
5. *Weakness*: Complex multi-level BOMs overwhelming small workshops.  
   *Fix*: Support for both simple single-level recipes and nested sub-assembly BOMs through optional `subBomId`.
6. *Weakness*: Currency conversion and DGI invoicing mismatch.  
   *Fix*: Strict Algerian Dinar (DZD) formatting with Article 317 timbre fiscal logic (cash vs. bank transfers).
7. *Weakness*: Mixing role privileges leading to accidental data deletion by machine operators.  
   *Fix*: Strict Role-Based Access Control (RBAC) across 5 distinct profiles with screen-locked sidebars.
8. *Weakness*: Lost machine calibration leading to out-of-tolerance parts.  
   *Fix*: ONML calibration tracking directly in the Quality Control and Raw Material weigh-in module.
9. *Weakness*: Lack of Arabic terminology in Algerian workshops.  
   *Fix*: 100% bilingual French / Arabic RTL microcopy across all forms, buttons, and printable production slips.
10. *Weakness*: Unrealistic theoretical standard costs.  
    *Fix*: Real-time FIFO and Weighted Average Unit Cost (CMUP) recalculated upon every supplier intake.

---

## C. Thin Vertical Slice Build Order

* **Slice 1: Foundation Types, State & Seed Data**
  - Add `ManufacturingRole` to `src/types/index.ts` (`gerant`, `chef_atelier`, `operateur`, `magasinier`, `qualite`).
  - Add `activeManufacturingRole` and `setActiveManufacturingRole` to `src/services/store.ts`.
  - Enrich `src/components/screens/manufacturing/manufacturingData.ts` with authentic Algerian manufacturing datasets (discrete metal, plastic injection, carpentry).
  - Create `src/utils/manufacturingRules.ts` and automated unit tests `src/utils/manufacturingRules.test.ts`.

* **Slice 2: TopBar Role Switcher & Role-Scoped Navigation**
  - Mount the interactive role switcher pill capsule in `TopBar.tsx` for Category 12.
  - Implement role-adaptive `dockNavItems` in `Sidebar.tsx` and screen guards in `App.tsx`.

* **Slice 3: Multi-Mode BOM Studio & Work Order Engine**
  - Upgrade `ManufacturingBomView.tsx` with UniversalDataCollection, list/grid toggle, and cost anatomy drawer.
  - Upgrade `ManufacturingOrdersView.tsx` with dual Kanban / List view and `ManufacturingOrderModal.tsx`.

* **Slice 4: Shop-Floor Tablet Touch Kiosk & Timers**
  - Build `ManufacturingWorkstationView.tsx` with high-contrast touch cards, live operation timer, and numpad scrap logger.

* **Slice 5: Raw Materials Stock, Transfer Slips & Quality Control**
  - Upgrade `ManufacturingMaterialsView.tsx` with Décret 05-468 voucher generator (*Bon de Sortie*).
  - Upgrade `ManufacturingQcView.tsx` with inspection gate and quarantine management.

* **Slice 6: Verification & Polish**
  - Run `npm test`, `lint_applet`, and `compile_applet` to certify 0 errors.

---

## D. Definition of Done (DoD)

1. **Role Separation**: All 5 manufacturing roles have distinct, screen-locked sidebar navigations and instant switching via the TopBar capsule.
2. **Design Parity**: Built 100% with Atrium's `#F8F9FA` pod trays, `#C4785A` terracotta buttons, `UniversalDataCollection`, `Seek`, and kinetic `LabelInput`/`LabelSelect`. Zero external libraries.
3. **Algerian Legal Compliance**: Décret 05-468 vouchers, Art. 317 stamp duty, and DGI NIF/NIS/RC/AI formatting fully implemented and tested.
4. **Calculations Verified**: PMP / CMUP, scrap yield, and routing hour formulas pass 100% of automated unit test suites.
5. **Clean Verification**: Passes `tsc --noEmit`, `npm test`, and Vite production build with zero warnings.
