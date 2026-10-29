# Automotive Garage & Fleet Repair (Algeria) — Implementation Specification

## System Context & Design System Alignment
This specification defines the production implementation architecture for **Category 10: Automotive Garage & Fleet Repair** within Atrium ERP & CRM. It translates the approved research features into engineering blueprints without adding unapproved dependencies, with **strict Role-Based UI Separation** between workshop personas.

### Existing Reused Resources & Tokens
- **Design Tokens**: 
  - Primary Accent: Terracotta `#C4785A` (`--color-accent`), Hover `#b3684a`, Dim `rgba(196, 120, 90, 0.15)`.
  - Outer Canvas: Light `#E8ECEF` / Dark `#0C0C0E`.
  - Pod Tray / Group: Light `#F8F9FA` / Dark `#141416`, border `#EDF1F3` / `#232328`.
  - Dark Espresso Hero Anchor: `#1F1D1B`.
  - Card Surface: Pure `#FFFFFF` / Dark `#18181B`.
  - Typography: `Inter` for UI, `Cairo` for Arabic RTL, `font-mono tabular-nums` for numeric, DZD financial, and VIN data.
- **Shared UI Components Reused**:
  - `AtriumButton`: Squircle luxury ceramic terracotta button (`#C4785A`) with 1px fine bevel edge and ambient glow.
  - `UniversalDataCollection<T>`: Dual List/Grid toggle, search seek lens, kebab action menu, and 390px slide-over inspector drawer.
  - `Seek`: Kinetic expanding search bar with keyboard shortcut (`/`, `Cmd+K`).
  - `LabelInput`: Floating notched kinetic text, numeric, date, and time inputs.
  - `LabelSelect`: Floating notched kinetic dropdown select with auto-search for 6+ items.
  - `StatusBadge` & `StatTile`: Unified status indicators and top KPI summary tiles.
  - `Modal` & `ConfirmDialog`: Standardized backdrop-blur dialogs.
- **Quadruple Traceability Contract**: Every database record and TypeScript model carries:
  `{ accountId: string; businessId: string; branchId: string; staffId: string; }`
- **Target Localization**: Algeria (Currency `DZD`, bilingual French & Modern Standard Arabic, RTL layout alignment, offline resiliency for ADSL/4G interruptions).

---

# SECTION 0: ROLE-BASED UI SEPARATION (RBAC ARCHITECTURE)

In an Algerian commercial garage, physical roles have radically different ergonomic environments and data sensitivities:
- The **Mechanic** works under a vehicle with oily gloves and needs big touch buttons, diagnostic codes, and zero financial clutter.
- The **Service Advisor** sits at the front desk greeting clients, taking photos, and collecting signatures.
- The **Magasinier** operates in the spare parts depot managing bin locations and vendor delivery trucks.
- The **Cashier** handles daily cash, fiscal stamps, and official tax invoices.
- The **Owner / Gérant** oversees high-level margins, staff productivity, and credit limits.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ROLE-BASED UI WORKSPACE ADAPTATION                              │
│                                                                                        │
│  [TopBar Role Switcher / Fast Switcher PIN]                                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────────────┐  │
│  │ Gérant       │ Réception    │ Atelier      │ Magasin      │ Caisse               │  │
│  │ (Executive)  │ (Front Desk) │ (Shop Floor) │ (Warehouse)  │ (Billing Desk)       │  │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────────┬───────────┘  │
│         │              │              │              │                  │              │
│         ▼              ▼              ▼              ▼                  ▼              │
│  ┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌──────────────────────┐  │
│  │Executive    ││Gate Intake  ││Bay Kanban   ││Parts Queue  ││Cash Drawer Session   │  │
│  │Dashboard    ││360 Walk     ││Lift Timers  ││Bin Locations││Facture DGI (19%+Stamp)│ │
│  │Gross Margin ││Damage Map   ││OBD-II Codes ││Low-Stock PO ││Fleet Relevé Mensuel  │  │
│  │Audit Logs   ││WhatsApp DVI ││Checklist QC ││BL Match     ││Z de Caisse Closure   │  │
│  └─────────────┘└─────────────┘└─────────────┘└─────────────┘└──────────────────────┘  │
│  [Visible: ALL] [Cost: HIDDEN][Prices: HIDDEN][Client: HIDDEN][Mechanics: HIDDEN]      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. The 5 Dedicated Workspaces & Sidebar Navigation Trees

#### Workspace A: Gérant / Direction (General Manager & Owner)
- **Primary Goal**: Executive supervision, commercial credit limits, and workshop profitability.
- **Dedicated Sidebar Navigation**:
  1. `dashboard`: **Pulse Atelier & Rentabilité** (Revenue, Margin split on labor vs. parts, Bay Occupancy %, Tech billable hours, Fleet receivables).
  2. `scheduler`: **Registre Global des Réparations (OR)** (Master view of all work orders, stages, and SLA flags).
  3. `members`: **Parc Véhicules & Flottes B2B** (Customer accounts, fleet contract SLAs, credit ceilings).
  4. `shop`: **Valorisation Stock & Fournisseurs** (Inventory valuation, purchase ledger, markup settings).
  5. `finance`: **Facturation Fiscale & Trésorerie** (DGI Invoices, Cash registers, Bank accounts, CCP reconciliation).
  6. `settings`: **Configuration & Droits d'Accès** (Staff PINs, labor hourly rates, DGI tax numbers).
- **Security Scope**: Full Read/Write/Override access across all modules.

#### Workspace B: Réception & Accueil / Service Advisor (Front Counter)
- **Primary Goal**: Fast client check-in, photographic condition proof, quote generation, and vehicle handover.
- **Dedicated Sidebar Navigation**:
  1. `dashboard`: **File d'Attente & Entrées du Jour** (Live vehicles waiting for check-in, promises for today).
  2. `scheduler`: **Fiches d'Entrée & Walkaround 360° (OR)** (Create new repair orders, damage canvas, fuel/mileage log).
  3. `members`: **Clients & Véhicules** (Customer phone directory, vehicle history, previous repairs).
  4. `finance`: **Devis & Validations WhatsApp** (Itemized quote drafting, 1-tap WhatsApp estimate links).
  5. `shop`: **Véhicules Prêts & Bons de Sortie** (Vehicle handover checklist, key return).
- **Security Scope**:
  - `Can`: Create/Edit vehicle records, record damage photos, issue quotes, print gate passes.
  - `Cannot`: View spare parts wholesale buying prices, view technician salary/commission calculations, delete invoices, or override fleet credit limits without manager PIN.

#### Workspace C: Chef d'Atelier & Mécaniciens (Shop Floor / Bays)
- **Primary Goal**: Rapid diagnosis, lift dispatch, repair execution, parts requisitions, and quality sign-off.
- **Dedicated Sidebar Navigation**:
  1. `dashboard`: **Tableau des Ponts & Élévateurs (Kanban)** (Lifts 1-4, Pit, Electric bay status with drag-and-drop).
  2. `scheduler`: **Mes Travaux du Jour** (Assigned repair orders, technical instructions, symptom notes).
  3. `members`: **Diagnostic OBD & Codes DTC** (Searchable DTC vault, sensor specs, wiring diagrams).
  4. `shop`: **Demandes de Pièces (Requisitions)** (Submit parts needs to warehouse, check availability).
  5. `finance`: **Contrôle Qualité & Essai Routier** (12-point post-repair release checklist).
- **Security Scope**:
  - `Can`: Update repair order stages (`Diagnostic` $\rightarrow$ `InRepair` $\rightarrow$ `QC`), submit parts requisitions, log actual labor hours, check off QC tasks.
  - `Cannot`: **Zero Financial Data Visible** (Customer invoice prices, parts retail markup, customer credit status, and daily revenue are completely hidden to avoid distraction and wage comparison disputes).

#### Workspace D: Magasinier / Pièces de Rechange (Warehouse & Depot)
- **Primary Goal**: Stock integrity, parts allocation to bays, supplier purchase orders, and inventory audits.
- **Dedicated Sidebar Navigation**:
  1. `dashboard`: **File d'Attente des Pièces Atelier** (Incoming parts requests from active bays, ready for issue).
  2. `shop`: **Catalogue & Bacs de Stock** (SKU, OEM references, physical bin location *Rayon/Bac*, stock levels).
  3. `scheduler`: **Réapprovisionnement & Commandes Fournisseurs** (Low-stock reorder triggers, purchase orders for Bab Ezzouar).
  4. `finance`: **Réception Marchandises & Bons de Livraison (BL)** (Reconcile supplier delivery notes against POs).
  5. `members`: **Historique & Mouvements de Stock** (Traceability of every bolt and oil drum issued).
- **Security Scope**:
  - `Can`: Requisition parts to work orders, update stock balances, receive vendor BLs, manage bin coordinates.
  - `Cannot`: View or edit customer personal data, modify vehicle damage records, or close financial cash sessions.

#### Workspace E: Caisse & Facturation / Cashier-Accountant (Billing Desk)
- **Primary Goal**: Payment collection, DGI fiscal compliance, corporate fleet statements, and till closure.
- **Dedicated Sidebar Navigation**:
  1. `dashboard`: **Point d'Encaissement & Caisse** (Active register session, cash drawer balance, counter tickets).
  2. `finance`: **Factures DGI & Bons de Caisse** (Generate official invoices with 19% TVA & legal fiscal stamp).
  3. `members`: **Comptes Flottes B2B & Relevés Mensuels** (Corporate accounts, aging receivables, monthly consolidated statements).
  4. `scheduler`: **Véhicules Réparés en Attente de Paiement** (Queue of cars ready for financial release).
  5. `shop`: **Clôture Journalière (Z de Caisse)** (End-of-day register reconciliation, cash vs. CIB vs. Cheque).
- **Security Scope**:
  - `Can`: Process payments, issue invoices, print official receipts, perform till closures.
  - `Cannot`: Alter technician diagnostic notes, modify vehicle mechanical hours, or delete damage walkaround photos.

---

### 2. Fast Role Switcher & Security Guardrails
- **Location**: TopBar integration with current staff avatar and active role pill.
- **Mechanism**:
  - Tapping the role capsule opens `FastSwitchModal` with PIN authorization (`CurrentUser.pinCode`).
  - Switching roles updates `activeGarageRole` in `useAtriumStore`.
  - Sidebar and active screen immediately refresh without page reload.
- **Permission Guardrail Component**:
  ```tsx
  <RoleGuard allowedRoles={['gerant', 'caisse']} fallback={<PermissionDeniedNotice />}>
    <DgiTaxInvoiceSettings />
  </RoleGuard>
  ```
- **Manager Override PIN**: When an advisor encounters a blocked fleet order (exceeded credit limit), an inline modal allows the Gérant to enter their 4-digit PIN to authorize a one-time override with permanent audit trail logging.

---

# SECTION 1: DETAILED FEATURE SPECIFICATIONS

---

## FEATURE 1: Digital Vehicle Intake & Contradictory Damage Walkaround (Ordre de Réparation - OR)

### 1. PURPOSE
- **Persona**: Service Advisor / Réceptionnaire d'Atelier (Amine).
- **Pain Point**: Customers disputing pre-existing body dents, missing spare wheels, or fuel levels upon vehicle collection, costing garages 30,000–50,000 DZD monthly in unearned repairs.
- **Outcome**: A legally defensible 60-second digital intake that captures vehicle identification, 360° photographic damage markers, fuel/mileage logs, and a client signature on glass.

### 2. BUSINESS LOGIC
- **Rules & Defaults**:
  - Order Numbering: Monotonic format `OR-{YYYY}-{BRANCH_CODE}-{0001}` (e.g., `OR-2026-ALG-0142`). Never resets mid-year.
  - Fuel Level: Fixed 5-stage discretized scale (`0% Empty`, `25% Quarter`, `50% Half`, `75% Three-Quarters`, `100% Full`). Default: `50%`.
  - Odometer Entry: Current mileage must be $\ge$ the vehicle's last recorded service mileage. If lower, system blocks submission unless flagged as `Compteur Remplacé / Remis à Zéro` with manager authorization.
  - Mandatory Damage Inspection: At least 4 directional quadrants must be marked or verified (`Front`, `Rear`, `Left Side`, `Right Side`). If vehicle is excessively dirty, user must toggle `Véhicule Sale / Examen Carrosserie Réservé`.
- **State Machine**:
  ```
  [Draft / Gate Intake] 
          │ (Advisor & Client Sign)
          ▼
     [Intake Signed] ──► Generates PDF Receipt / WhatsApp Summary
          │ (Bay Assigned)
          ▼
    [Diagnostic In Progress]
  ```
- **Permissions**:
  - `View`: All authenticated staff.
  - `Create / Edit`: Service Advisor, Workshop Manager, Owner.
  - `Delete / Void`: Owner only (requires written audit log reason).
- **Calculations & Worked Example**:
  - *Intake Estimate*: Initial estimated quote = Estimated Diagnostic Labor (e.g., 1.5h $\times$ 2,500 DZD = 3,750 DZD) + Base Consumables Fee (500 DZD) = `4,250 DZD HT`.

### 3. DATA MODEL
```typescript
export interface DamageMarker {
  id: string;
  view: 'front' | 'rear' | 'left' | 'right' | 'roof' | 'glass';
  xPercent: number; // 0 to 100 on schematic canvas
  yPercent: number;
  damageType: 'scratch' | 'dent' | 'crack' | 'missing_part' | 'paint_chip';
  severity: 'minor' | 'moderate' | 'severe';
  photoUrl?: string;
  notes?: string;
}

export interface VehicleIntakeRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string; // Service Advisor ID
  orderNumber: string;
  vehicleId: string;
  clientId: string;
  intakeTimestamp: string;
  odometerKm: number;
  isOdometerTamperedOrReplaced: boolean;
  fuelLevel: '0' | '25' | '50' | '75' | '100';
  accessoriesPresent: {
    spareWheel: boolean;
    jackAndToolKit: boolean;
    registrationCardDocument: boolean;
    radioHeadUnit: boolean;
    wheelLockKey: boolean;
  };
  isVehicleDirty: boolean;
  damageMarkers: DamageMarker[];
  clientSignatureSvg?: string;
  signedAt?: string;
  status: 'draft' | 'signed' | 'dispatched';
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `/src/components/screens/garage/AutoIntakeWalkaroundModal.tsx` (replaces basic `AutoOrderModal.tsx` intake form).
- **State**: Local form state during walkaround; committed to `useGarageData` store upon client signature.
- **Pure Functions**:
  - `validateOdometer(prevKm: number, currentKm: number, isReplaced: boolean): { isValid: boolean; error?: string }`
  - `generateOrderNumber(branchCode: string, seqNumber: number, year: number): string`
- **Offline Behavior**: Stores signature SVG vector points and damage marker JSON in browser LocalStorage (`atrium_pending_intakes_v1`). Auto-syncs when online.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Intake Path**:
  1. Open modal via `Alt+N` or primary `AtriumButton` "Nouvelle Entrée Atelier".
  2. Scan or select license plate from `LabelSelect` (auto-fills client, brand, and last mileage).
  3. Tap vehicle schematic SVG where damage exists (opens 1-tap selector: Rayure, Bosse, Fissure).
  4. Slide fuel slider, tap "Prêt pour Signature".
  5. Customer signs on screen $\rightarrow$ Click `AtriumButton` "Valider l'Entrée".
- **Microcopy**:
  - FR: *"Fiche d'Entrée Contradictoire & Ordre de Réparation"* / *"Véhicule sale : inspection visuelle sous réserve du lavage"* / *"Signature client requise avant prise en charge"*
  - AR: *"استمارة استلام المركبة وأمر التصليح"* / *"المركبة غير نظيفة: الفحص خاضع لشرط الغسيل"* / *"توقيع الزبون إلزامي قبل الدخول"*
- **Delight Feature**: Interactive SVG car blueprint where clicking places numbered circular terracotta damage pins with instant camera snap integration.

### 6. EDGE CASES & DEFENSIVE HANDLING
- **Invalid Input**: Negative odometer $\rightarrow$ Red error outline on `LabelInput`, submit disabled.
- **Concurrency**: Two advisors opening the same intake $\rightarrow$ Timestamp-based UUID conflict check; second submission prompts to merge.
- **Time/Clock**: Local device clock skewed $\rightarrow$ Compares with server timestamp header; warns if device clock is $>15$ mins off.
- **Connectivity**: Network drops mid-walkaround $\rightarrow$ Stores locally with green `Enregistré localement (Mode Hors-Ligne)` badge.
- **Human Error**: Wrong client selected $\rightarrow$ Service Advisor can reassign vehicle to correct client before status reaches `InRepair`.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Given** a vehicle with last recorded mileage of 85,000 km, **When** advisor enters 82,000 km without checking `Compteur Remplacé`, **Then** the form rejects submission with *"Le kilométrage ne peut être inférieur au dernier relevé"*.
- **Given** 3 damage pins marked on SVG canvas, **When** "Imprimer OR" is clicked, **Then** a printable A4 French/Arabic intake slip renders with the visual damage map and signature.

---

## FEATURE 2: Interactive Multi-Bay Dispatch & Work Order Lifecycle Engine

### 1. PURPOSE
- **Persona**: Workshop Lead / Chef d'Atelier (Khaled) & Mechanics.
- **Pain Point**: Hydraulic lifts clogged with disassembled cars waiting for customer approvals or delayed parts, causing technician downtime.
- **Outcome**: A visual Bay Kanban & Timeline board that balances technician workloads, monitors lift occupancy, and tracks repair phase transitions.

### 2. BUSINESS LOGIC
- **Bay Categories & Limits**:
  - `Lift 2-Post` (Heavy mechanics, gearbox, engine drop: max capacity 3.5T to 4.5T).
  - `Lift 4-Post` (Wheel alignment, oil changes, undercarriage inspection).
  - `Pit / Fosse` (Rapid oil servicing, commercial van chassis).
  - `Electrical & Diagnostic Bay` (Scanner, battery test, wiring harnesses).
- **State Machine**:
  ```
  [Intake Signed] ──► [Diagnostic] ──► [Devis / Estimate Sent] 
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       ▼ (Client Approves)                           ▼ (Client Rejects)
             [Approved / In Repair]                             [Cancelled / Released]
                       │
                       ├─► [Waiting for Parts] (Bay status freed or flagged)
                       │
                       ▼
             [Quality Inspection & Test Drive] 
                       │
                       ▼
             [Ready for Delivery] ──► [Delivered & Billed]
  ```
- **Permissions**:
  - Workshop Lead and Owner can move cards between all stages.
  - Technicians can only update cards assigned to their specific bay and move them from `In Repair` to `Testing / QC`.

### 3. DATA MODEL
```typescript
export interface WorkshopBay {
  id: string;
  branchId: string;
  bayNumber: number;
  name: string; // e.g. "Pont 1 - 2 Colonnes (4T)"
  bayType: 'lift_2post' | 'lift_4post' | 'pit' | 'diagnostic_electric' | 'wash_prep';
  isOccupied: boolean;
  activeOrderId?: string;
}

export interface WorkshopWorkOrder {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  orderNumber: string;
  vehiclePlate: string;
  vehicleModel: string;
  clientName: string;
  clientPhone: string;
  assignedBayId?: string;
  assignedTechnicianId?: string;
  technicianName: string;
  status: 'Intake' | 'Diagnostic' | 'WaitingApproval' | 'WaitingParts' | 'InRepair' | 'Testing' | 'Ready' | 'Delivered';
  stageEnteredAt: string;
  estimatedLaborHours: number;
  actualLaborHours: number;
  hourlyLaborRateDzd: number; // default 2,500 DZD
  diagnosticNotes: string;
  technicianChecklist: Array<{ item: string; done: boolean; notes?: string }>;
}
```

### 4. CODE ARCHITECTURE
- **Component**: Enhances `/src/components/screens/garage/AutoGarageOrdersView.tsx` with a dual view toggle:
  - Mode A: Bay Kanban Board (Columns: *Diagnostic, En Attente Pièces, En Réparation, Contrôle Qualité, Prêt*).
  - Mode B: `UniversalDataCollection` table view with sorting, batch selection, and search.
- **Pure Functions**:
  - `calculateBayOccupancyRate(bays: WorkshopBay[]): number`
  - `calculateLaborTotal(hours: number, hourlyRate: number): number`

### 5. UX FLOW & ENHANCEMENTS
- **Flow**: Drag a work order card onto "Pont 2" $\rightarrow$ Modal prompts to assign mechanic from `LabelSelect` $\rightarrow$ Card updates with color badge and live elapsed repair timer.
- **Speed Feature**: 1-click status increment button directly on the Kanban card without opening full modal.
- **Microcopy**:
  - FR: *"Pont d'Élévation 1"* / *"En attente de validation client"* / *"Temps passé : 2h 15m"*
  - AR: *"جسر الرفع 1"* / *"في انتظار موافقة الزبون"* / *"الوقت المستغرق: 2 سا 15 د"*

### 6. EDGE CASES & DEFENSIVE HANDLING
- **Bay Conflict**: Dragging a car to an already occupied bay $\rightarrow$ Triggers confirmation modal: *"Pont 1 déjà occupé par 16-118-2045. Déplacer vers la cour d'attente ?"*
- **Exceeded Estimate**: Actual technician hours exceed estimated hours by $>20\%$ $\rightarrow$ Amber warning icon rendered on card with tooltip alerting the Workshop Lead.

---

## FEATURE 3: Real-Time Spare Parts Inventory & Work Order Depletion

### 1. PURPOSE
- **Persona**: Parts Manager / Magasinier (Mustapha) & Garage Owner (Karim).
- **Pain Point**: 10–15% of high-value parts and bulk lubricants slip through undocumented or unbilled to client invoices.
- **Outcome**: Automated parts deduction linked to active work order IDs, physical bin tracking, and reorder alerts.

### 2. BUSINESS LOGIC
- **Rules & Formulas**:
  - Stock Allocation Rule: Parts can only be requisitioned from the warehouse by selecting an active Work Order (`OR-XXXX`).
  - Unit Support: Discretized integer units for hardware (filtres, plaquettes) and fractional decimal units for bulk fluids (huile moteur en litres, liquide de refroidissement).
  - Pricing Calculation:
    $$\text{Prix Vente HT} = \text{Prix Achat HT} \times (1 + \text{Marge \%})$$
    Default markup: Fast-moving filters +35%, synthetic lubricants +25%, heavy mechanical kits +20%.
  - Automatic Minimum Stock Alert: Triggered when `stockQuantity <= minThreshold`.

### 3. DATA MODEL
```typescript
export interface SparePartItem {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  sku: string; // e.g. "FLT-OIL-RN-01"
  oemReference: string; // e.g. "152085758R"
  name: string;
  brand: string; // e.g. "Purflux", "Mann Filter", "Motul", "Total"
  category: 'Filtration' | 'Freinage' | 'Suspension' | 'Moteur' | 'Électrique' | 'Huiles & Fluides';
  binLocation: string; // e.g. "Rayon B - Bac 04"
  stockQuantity: number;
  minThreshold: number;
  unit: 'piece' | 'litre' | 'jeu' | 'kit';
  buyingPriceDzd: number;
  sellingPriceDzd: number;
  tvaRate: number; // 19% standard in Algeria
  supplierName: string;
  compatibilityList: string[]; // e.g. ["Clio 4 1.5 dCi", "Megane 3", "Duster dCi"]
}

export interface RequisitionedPartLine {
  id: string;
  orderId: string;
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  unitCostDzd: number;
  unitPriceDzd: number;
  totalPriceDzd: number;
  issuedAt: string;
  issuedByStaffId: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `/src/components/screens/garage/AutoGaragePartsView.tsx` (standardized with `UniversalDataCollection`).
- **Modal**: Requisition Drawer in Work Order details to add parts from parts inventory with instant quantity increment/decrement.
- **Pure Functions**:
  - `deductStock(currentStock: number, qtyToDeduct: number): number`
  - `calculatePartsMarkup(buyingPrice: number, markupPercent: number): number`

### 5. UX FLOW & ENHANCEMENTS
- **Flow**: Magasinier opens "Requisition Pièces" inside Order $\rightarrow$ Types SKU or OEM ref in `Seek` bar $\rightarrow$ Clicks "+ Ajouter" $\rightarrow$ Stock immediately decrements in warehouse list and appends to customer order draft.
- **Speed Feature**: Barcode/QR input auto-detect in `Seek` search field.
- **Microcopy**:
  - FR: *"Stock disponible : 14 unités (Emplacement : Rayon A-02)"* / *"Alerte réapprovisionnement : seuil critique atteint"*
  - AR: *"المخزون المتوفر: 14 قطعة (الموقع: الرف A-02)"* / *"تنبيه إعادة التموين: تم الوصول للحد الأدنى"*

### 6. EDGE CASES & DEFENSIVE HANDLING
- **Insufficient Stock**: Technician requests 5L of 5W30 but only 3L remain $\rightarrow$ System prevents checkout, displays popup: *"Stock insuffisant (3L dispos). Passer un Achat Comptoir d'urgence ?"*
- **Returned Part**: Customer didn't need brake discs $\rightarrow$ 1-click "Réintégrer au stock" button restores inventory balance and voids the invoice line.

---

## FEATURE 4: Algerian Dual Compliant Invoicing Engine (Facture DGI vs. Bon de Caisse)

### 1. PURPOSE
- **Persona**: Cashier / Accountant (Nadia) & Garage Owner (Karim).
- **Pain Point**: Navigating between formal corporate accounts requiring NIF/NIS/TVA invoices with legal stamps and retail cash customers wanting quick receipts.
- **Outcome**: A dual-mode financial billing engine that generates either an official DGI-compliant invoice with statutory *timbre fiscal* or a simplified counter cash receipt.

### 2. BUSINESS LOGIC
- **Rules & Tax Formulas**:
  - **Prestation / Main d'œuvre**: Taxed at standard Algerian VAT rate: $19\% \text{ TVA}$.
  - **Pièces de Rechange**: Taxed at standard Algerian VAT rate: $19\% \text{ TVA}$.
  - **Timbre Fiscal (Article 317 du Code du Timbre)**: Applied strictly when payment method is `Espèces` (Cash).
    $$\text{Droit de Timbre} = 1\% \text{ du Total TTC, arrondi aux tranches légales DGI}$$
    *(Exemption rule: Non applicable aux paiements par Chèque, Virement bancaire ou Carte CIB/Dahabia).*
  - **Total Net à Payer**:
    $$\text{Total HT} = \text{Main d'œuvre HT} + \text{Pièces HT} - \text{Remise}$$
    $$\text{TVA (19\%)} = \text{Total HT} \times 0.19$$
    $$\text{Total TTC} = \text{Total HT} + \text{TVA}$$
    $$\text{Net à Payer (Espèces)} = \text{Total TTC} + \text{Timbre Fiscal}$$
- **Worked Numeric Example**:
  - Labor: 2.0 hrs $\times$ 2,500 DZD = `5,000 DZD HT`
  - Parts: Brake pads (4,500 DZD) + Discs (11,000 DZD) = `15,500 DZD HT`
  - Total HT: $5,000 + 15,500 = \mathbf{20,500\text{ DZD}}$
  - TVA (19%): $20,500 \times 0.19 = \mathbf{3,895\text{ DZD}}$
  - Total TTC: $20,500 + 3,895 = \mathbf{24,395\text{ DZD}}$
  - Payment Mode: `Espèces (Cash)`
  - Timbre Fiscal (1% capped/stepped): $\approx \mathbf{244\text{ DZD}}$ [VERIFY specific DGI Loi de Finances cap]
  - **Net à Payer**: $\mathbf{24,639\text{ DZD}}$

### 3. DATA MODEL
```typescript
export interface GarageInvoice {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  invoiceNumber: string; // e.g. "FAC-2026-00389"
  repairOrderId: string;
  clientId: string;
  clientType: 'individual' | 'corporate_fleet';
  clientLegal: {
    name: string;
    address: string;
    nif?: string; // 15 digits
    nis?: string;
    rcNumber?: string;
    articleImposition?: string;
  };
  billingType: 'facture_dgi' | 'bon_caisse';
  paymentMethod: 'especes' | 'cib_dahabia' | 'cheque' | 'virement';
  laborTotalHt: number;
  partsTotalHt: number;
  discountHt: number;
  subtotalHt: number;
  tvaRate: number; // 19.0
  tvaAmount: number;
  totalTtc: number;
  timbreFiscalAmount: number;
  netToPayDzd: number;
  amountInWordsFr: string;
  amountInWordsAr: string;
  issuedAt: string;
  isPaid: boolean;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `/src/components/screens/garage/AutoGarageBillingView.tsx`.
- **Print Template**: Dedicated printable A4/A5 layout with bilingual headers, Algerian legal footer (NIF, NIS, RC, AI, Capital Social), and DGI fiscal stamp block.
- **Pure Functions**:
  - `computeAlgerianTimbreFiscal(totalTtc: number, paymentMethod: string): number`
  - `convertDzdToWords(amount: number, lang: 'fr' | 'ar'): string`

### 5. UX FLOW & ENHANCEMENTS
- **Flow**: From completed work order $\rightarrow$ Click `AtriumButton` "Facturer" $\rightarrow$ Toggle between `Facture Fiscale` and `Bon de Caisse` $\rightarrow$ Select payment mode $\rightarrow$ Instant auto-calculation of Timbre $\rightarrow$ 1-click Print.
- **Microcopy**:
  - FR: *"Droit de Timbre Fiscal (Paiement Espèces)"* / *"Arrêté la présente facture à la somme de..."*
  - AR: *"حقوق الطابع الجبائي (دفع نقداً)"* / *"أوقفت هذه الفاتورة عند مبلغ..."*

### 6. EDGE CASES & DEFENSIVE HANDLING
- **Missing Corporate NIF**: Selecting `Facture Fiscale` for a corporate client without NIF $\rightarrow$ System displays inline validation warning: *"Le NIF (15 chiffres) est obligatoire pour les factures B2B"*.
- **Exempt Customer**: Diplomatic or AAPI investment entity $\rightarrow$ Toggle `Exonération TVA` zeroes out 19% TVA and requires input of exemption certificate number.

---

## FEATURE 5: B2B Corporate Fleet Contract & Consolidated Statement Manager

### 1. PURPOSE
- **Persona**: Corporate Fleet Logistics Manager (Farid) & Garage Owner (Karim).
- **Pain Point**: Tracking maintenance across 20–80 commercial vans with separate paper receipts leads to lost vouchers, overdue payments, and fleet operational paralysis.
- **Outcome**: A unified fleet registry grouping vehicles under a single corporate umbrella, monitoring credit ceilings, and generating monthly consolidated invoices with mileage logs.

### 2. BUSINESS LOGIC
- **Rules & Governance**:
  - Corporate Account Entity: B2B parent company holds a designated credit ceiling (e.g. 500,000 DZD) and payment terms (e.g., 30 jours fin de mois).
  - SLA Labor Rate Discount: Corporate contracts can define negotiated hourly labor rates (e.g. 2,000 DZD/hr instead of standard 2,500 DZD/hr).
  - Credit Limit Breach: When outstanding unpaid fleet balance $> \text{creditLimit}$, new repair orders require General Manager PIN authorization.

### 3. DATA MODEL
```typescript
export interface CorporateFleetAccount {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  companyName: string;
  tradeName: string;
  contactPerson: string;
  phone: string;
  email: string;
  nif: string;
  nis: string;
  rcNumber: string;
  articleImposition: string;
  creditLimitDzd: number;
  currentOutstandingDzd: number;
  paymentTermsDays: number; // e.g. 30, 45
  negotiatedHourlyRateDzd: number;
  partsDiscountPercent: number;
  activeVehicleCount: number;
  contractActive: boolean;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: Dedicated Fleet Sub-view within `/src/components/screens/garage/AutoGarageVehiclesView.tsx` with filter by `Compte Flotte`.
- **State**: Integrated in `useGarageData` store.

### 5. UX FLOW & ENHANCEMENTS
- **Flow**: Select corporate fleet from dropdown $\rightarrow$ View list of all registered utility vans $\rightarrow$ Filter by "Entretien Recommandé" $\rightarrow$ Click `AtriumButton` "Générer Relevé Mensuel" $\rightarrow$ Exports consolidated PDF statement with all work orders and signed delivery slips.

---

## FEATURE 6: WhatsApp & SMS Digital Vehicle Inspection (DVI) & Remote Approval

### 1. PURPOSE
- **Persona**: Service Advisor (Amine) & Vehicle Owner.
- **Pain Point**: Delays in reaching car owners by phone for repair authorization leave vehicles blocking shop lifts for hours.
- **Outcome**: 1-click generation of a secure WhatsApp link containing inspection photos, itemized quote breakdown, and digital approve/reject buttons.

### 2. BUSINESS LOGIC
- Deep-linked WhatsApp message using Algerian phone formatting (`+213` conversion from `05/06/07`).
- Auto-generates clean bilingual summary text with breakdown of parts, labor, and promised completion time.

---

## FEATURE 7: Predictive Mileage & Preventive Maintenance Reminder Engine

### 1. PURPOSE
- **Persona**: Workshop Owner (Karim) & Vehicle Owner.
- **Pain Point**: Customers forgetting their regular oil change (*vidange*) or timing belt replacement (*courroie de distribution*), losing recurring revenue to roadside lube shops.
- **Outcome**: Algorithm that estimates current odometer reading based on daily average usage and triggers automated maintenance reminder badges and SMS alerts.

### 2. BUSINESS LOGIC
- **Formula**:
  $$\text{Kilométrage Estimé} = \text{Dernier Relevé Km} + (\text{Jours Écoulés} \times \text{Km Quotidien Moyen})$$
  Default daily average: 40 km/day for retail sedans; 120 km/day for commercial fleet delivery vans.
- **Service Thresholds**:
  - Vidange Huile Moteur: Every 10,000 km (or 12 months).
  - Kit de Distribution: Every 60,000 km (or 4 years).
  - Plaquettes de Frein: Every 25,000 km.

---

## FEATURE 8: OBD-II Diagnostic Fault Code Vault & Quality Inspection Checklist

### 1. PURPOSE
- **Persona**: Mechanic / Diagnostic Tech (Khaled).
- **Pain Point**: Inconsistent diagnostics across mechanics and incomplete post-repair road checks leading to customer comebacks.
- **Outcome**: A searchable DTC database (P0xxx, P1xxx) with built-in symptom notes and a mandatory 12-point quality release checklist before vehicle handover.

---

# SECTION 2: CROSS-MODULE DATA FLOW & REVIEWS

### A. CROSS-FEATURE CHECKS
1. **Parts Requisition vs. Invoice Consistency**: Line items on customer bills cannot be manually edited independently of warehouse records. If a part price is discounted, the system preserves the cost of goods sold (COGS) to maintain accurate gross profit reporting.
2. **Fleet Contract Hourly Rate Auto-Application**: When a work order is initialized for a vehicle belonging to a corporate fleet, the system automatically overrides the default 2,500 DZD hourly rate with the negotiated fleet contract rate (e.g. 2,000 DZD).
3. **Intake Damage Sync with Delivery**: When a car is marked `ReadyForPickup`, the cashier's screen displays the intake damage photo summary so the advisor can confirm vehicle condition with the owner upon key return.

---

### B. SELF-REVIEW: 10 WEAK POINTS IDENTIFIED & RESOLVED
1. **Weakness**: Unreliable 3G/4G connectivity in industrial garage zones could crash photo uploads.
   - *Fix*: Client-side image compression down to 1200px before local Base64 storage, with background queue sync.
2. **Weakness**: Complex SVG car canvas may be difficult to tap on grease-stained mechanic mobile devices.
   - *Fix*: Touch target pads expanded to $\ge 44\text{px}$, paired with quick radio buttons for standard quadrants.
3. **Weakness**: Risk of mechanics hoarding parts by creating fake repair orders.
   - *Fix*: Only Service Advisors and Managers can generate Order Numbers; warehouse staff cannot issue parts to unverified orders.
4. **Weakness**: Timbre fiscal rules changing in Algerian Loi de Finances.
   - *Fix*: Encapsulated timbre calculation in a dedicated configurable utility with verified bracket constants.
5. **Weakness**: Accidental double-booking of bays.
   - *Fix*: Bay state model enforces atomic occupancy lock.
6. **Weakness**: Language barriers between French technical automotive terms and Arabic-speaking mechanics.
   - *Fix*: Bilingual dictionary pairing French mechanical names (*Kit d'embrayage*) with everyday Algerian Arabic terminology (*طقم دبرياج / لومبرياج*).
7. **Weakness**: Customer picking up car without paying while service advisor is away from the desk.
   - *Fix*: Status `Delivered` cannot be toggled unless Cashier confirms payment in `AutoGarageBillingView`.
8. **Weakness**: Odometer rollbacks on used cars corrupting preventive maintenance predictions.
   - *Fix*: System flags any mileage entry lower than previous records as an anomaly requiring manager sign-off.
9. **Weakness**: Discrepancies between bulk liquid purchase (208L drum) and car dispensing (4.5L).
   - *Fix*: Support for decimal quantities with 2 decimal places in stock management.
10. **Weakness**: Data loss during browser tab closure.
    - *Fix*: Auto-persists form drafts to browser LocalStorage on every keystroke.

---

### C. SHIPPABLE BUILD ORDER (INCREMENTAL SLICES)

1. **Slice 1: Store & Multi-Role Navigation Architecture**:
   - Add `activeGarageRole` (`'gerant' | 'reception' | 'mecanicien' | 'magasinier' | 'caisse'`) to `useAtriumStore`.
   - Update `Sidebar.tsx` to dynamically render the 5 role-specific workspaces.
   - Add TopBar role fast-switcher capsule.
2. **Slice 2: Data Models & Realistic Algerian Seed Expansion (`garageData.ts`)**:
   - Establish full TypeScript interfaces upholding `{ accountId, businessId, branchId, staffId }`.
   - Seed 25+ vehicles (passenger & commercial fleets), 35+ spare parts, workshop bays, and active repair orders.
3. **Slice 3: Visual Intake Walkaround & OR Creation (`AutoIntakeWalkaroundModal.tsx`)**:
   - Implement the interactive car blueprint damage marker picker, fuel gauge, and odometer rules.
4. **Slice 4: Workshop Bay Dispatch Kanban & Mechanic Board (`AutoGarageOrdersView.tsx`)**:
   - Deliver drag-and-drop bay dispatch board, technician assignment, and live work order stage transitions.
5. **Slice 5: Warehouse Parts Depot & Reorder Engine (`AutoGaragePartsView.tsx`)**:
   - Standardize with `UniversalDataCollection`, bin locations, low-stock alerts, and work order requisition.
6. **Slice 6: Dual DGI Invoicing, Timbre Fiscal & Fleet Statements (`AutoGarageBillingView.tsx`)**:
   - Implement official bilingual Facture DGI with 19% TVA, legal cash *timbre fiscal*, and printable receipts.
7. **Slice 7: Vehicle Registry & Fleet SLA Radar (`AutoGarageVehiclesView.tsx`)**:
   - Complete 390px vehicle inspector drawer, predictive oil change calculation, and corporate fleet grouping.

---

### D. DEFINITION OF DONE FOR CATEGORY 10
- [ ] Explicit Role-Based UI Separation functional across all 5 roles (`Gérant`, `Réception`, `Atelier`, `Magasin`, `Caisse`) with dynamic sidebar adaptation.
- [ ] All 5 dedicated screens render using Atrium design tokens (`#C4785A` AtriumButton, `Seek`, `UniversalDataCollection`, `LabelInput`, `LabelSelect`).
- [ ] Every record strictly adheres to the Quadruple Traceability Standard.
- [ ] Full bilingual parity (French & Arabic RTL) with authentic Algerian automotive terminology.
- [ ] Zero unhandled NaN values or currency formatting errors in DZD financial calculations.
- [ ] Works completely offline with cached local storage and graceful reconnect.
- [ ] 100% clean compilation (`compile_applet`) and zero TypeScript errors (`lint_applet`).
