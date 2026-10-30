# Master Production Implementation Specification: Category Logistics, Couriers & Delivery (Algeria)

This specification defines the complete end-to-end production architecture, business logic, data models, state machines, and role-based UI separation for **Category 14: Logistics, Couriers & Delivery** within Atrium OS.

---

## Architectural Context & Shared Core Foundations

### 1. Quadruple Traceability Contract
Every database entity, transit manifest, parcel scan, and financial transaction strictly inherits the Atrium multi-tenant governance contract:
```typescript
{
  accountId: string;  // Root organization / enterprise license
  businessId: string; // Legal operating entity (SARL / EURL Express Courier)
  branchId: string;   // Physical Sorting Hub, Regional Depot, or Stop-Desk Branch
  staffId: string;    // Active user creating, updating, or scanning the record
}
```

### 2. Role-Based UI Separation (RBAC Workspaces)
To eliminate clutter, the platform delivers **4 distinct operational workspaces** via the TopBar role switcher:
1. **Gérant / Direction (`gerant`)**: Global 58-wilaya KPI pulse, commercial tariff grids, merchant debt & escrow balance, Algérie Poste CCP batch approvals, fleet vehicle P&L, and ARPCE compliance audits.
2. **Régulateur / Dispatcher (`dispatcher`)**: Real-time line-haul manifests, morning driver bag allocation, live route status, delivery exception resolution, and address hold triage.
3. **Agent de Tri / Magasinier Hub (`hub_sorter`)**: High-speed ruggedized barcode terminal, bulk merchant intake, wilaya sac-navette bagging, security tamper-seal tagging, and returned parcel intake.
4. **Agent Stop-Desk / Guichetier (`stop_desk_agent`)**: Shelf location inventory, SMS OTP customer handover, National Identity (CNI) verification, and daily cash drawer closure.

### 3. Design System Alignment & Token Discipline
- **Surfaces**: Outer canvas `#E8ECEF`, elevated pod tray `#F8F9FA`, card surface `#FFFFFF` (dark mode `#18181B`).
- **Dark Espresso Hero Card**: `#1F1D1B` with warm cream typography and subtle gold/copper borders.
- **Brand Accent**: Hermès luxury warm terracotta (`#C4785A`, hover `#B3684A`, ambient glow `rgba(196,120,90,0.18)`).
- **Kinetic Controls**: Notched hopping `LabelInput`, auto-searching `LabelSelect`, kinetic `Seek` expanding search lens, and `UniversalDataCollection` (List / Grid / 390px Inspector Drawer).
- **Trilingual Parity**: 100% native support for French (primary administrative), Modern Standard Arabic (with Algerian Darija terms, RTL layout), and English.

---

# Feature Specifications

---

## FEATURE 1: 58-Wilaya Hierarchical Address Matrix & Cascading Zonal Tariffs

### 1. PURPOSE
Enables the **Dispatcher** and **Merchant** to eliminate address ambiguity, prevent routing failures, and dynamically calculate legally compliant delivery rates across all 58 Algerian wilayas and 1,541 communes.

### 2. BUSINESS LOGIC
- **Zonal Classification**:
  - `Zone 1 (Local / Alger Centre)`: Wilaya 16 (Base: 400 DZD Stop-Desk / 600 DZD Home).
  - `Zone 2 (Proche / Mitidja)`: Wilayas 09, 35, 42 (Base: 450 DZD Stop-Desk / 700 DZD Home).
  - `Zone 3 (Nord & Côtiers)`: Wilayas 15, 26, 31, 25, 19, 21, 23, etc. (Base: 500 DZD Stop-Desk / 850 DZD Home).
  - `Zone 4 (Hauts-Plateaux & Intérieur)`: Wilayas 05, 17, 14, 28, 43, etc. (Base: 650 DZD Stop-Desk / 1,050 DZD Home).
  - `Zone 5 (Sud & Oasis)`: Wilayas 30, 47, 03, 39, 49, etc. (Base: 850 DZD Stop-Desk / 1,350 DZD Home).
  - `Zone 6 (Grand Sud & Frontaliers)`: Wilayas 11, 33, 53, 54, 55, 56, 57, 58 (Base: 1,100 DZD Stop-Desk / 1,750 DZD Home).
- **Weight Thresholds & Overage Formula**:
  - Base weight allowance: $W_{\text{base}} = 5.0\text{ kg}$.
  - Weight overage rate: $R_{\text{over}} = 60\text{ DZD per additional kg}$ (Zones 1–4) or $120\text{ DZD/kg}$ (Zones 5–6).
  - Volumetric weight check (IATA standard adapted for road freight):
    $$\text{VolWeight} = \frac{\text{Length (cm)} \times \text{Width (cm)} \times \text{Height (cm)}}{5000}$$
    $$\text{BillableWeight} = \max(\text{ActualWeight}, \text{VolWeight})$$
- **Article 317 Timbre Fiscal (Stamp Duty) Rule**:
  - Applied automatically to Cash-on-Delivery (COD) cash payments:
    - $\le 500\text{ DZD}$: 0 DZD
    - $501\text{ to }3,000\text{ DZD}$: 20 DZD
    - $3,001\text{ to }10,000\text{ DZD}$: 30 DZD
    - $10,001\text{ to }20,000\text{ DZD}$: 40 DZD
    - $20,001\text{ to }50,000\text{ DZD}$: 50 DZD
    - $> 50,000\text{ DZD}$: $1\%$ capped at $2,500\text{ DZD}$ [VERIFY: Finance Law 2024 ceiling update].
- **State Machine**:
  - `AddressDraft` $\rightarrow$ `CommuneValidated` (System matches commune to official Postal Code) $\rightarrow$ `TariffLocked`.
- **Worked Numeric Example**:
  - Merchant ships a package to **In Salah (Wilaya 57)**, home delivery.
  - Actual weight: $7.4\text{ kg}$. Dimensions: $30 \times 25 \times 20\text{ cm} \rightarrow \text{VolWeight} = 3.0\text{ kg}$.
  - Billable weight: $\max(7.4, 3.0) = 7.4\text{ kg} \rightarrow 3\text{ kg overage}$ (rounded up).
  - Base fee (Zone 6 Home): $1,750\text{ DZD}$.
  - Weight surcharge: $3\text{ kg} \times 120\text{ DZD} = 360\text{ DZD}$.
  - Declared COD amount: $12,500\text{ DZD}$.
  - Article 317 Timbre Fiscal: $40\text{ DZD}$.
  - **Total Delivery Price**: $1,750 + 360 = 2,110\text{ DZD}$. Cash payable by customer at door: $12,500 + 40 = 12,540\text{ DZD}$.

### 3. DATA MODEL
```typescript
export type WilayaZone = 'Zone1_Local' | 'Zone2_Proche' | 'Zone3_Nord' | 'Zone4_Plateaux' | 'Zone5_Sud' | 'Zone6_GrandSud';

export interface AlgerianCommune {
  code: string; // e.g. "16024"
  nameFr: string; // e.g. "Kouba"
  nameAr: string; // e.g. "القبة"
  postalCode: string; // e.g. "16050"
  wilayaCode: number; // 1 to 58
  wilayaNameFr: string;
  wilayaNameAr: string;
  zone: WilayaZone;
  hasStopDesk: boolean;
  homeDeliveryActive: boolean;
}

export interface TariffRule {
  id: string;
  accountId: string;
  businessId: string;
  zone: WilayaZone;
  homeBasePriceDzd: number;
  stopDeskBasePriceDzd: number;
  baseWeightKg: number; // Default 5.0
  overweightPerKgDzd: number;
  fragileHandlingSurchargeDzd: number;
  insuranceRatePercent: number; // Default 1.0%
}
```

### 4. CODE ARCHITECTURE
- **Files**:
  - `/src/utils/algerianWilayas.ts`: Pure database and helper functions for 58 Wilayas & Communes.
  - `/src/components/screens/logistics/WilayaTariffModal.tsx`: Grid editor for pricing rules.
- **Pure Functions**:
  - `computeShipmentTariff(weightKg, dimensions, zone, deliveryType, codAmount, tariffRule): TariffBreakdown`
  - `validateAlgerianPhone(phone: string): { valid: boolean; operator: 'Mobilis' | 'Djezzy' | 'Ooredoo' | 'Unknown'; normalized: string }`

### 5. UX FLOW & DELIGHT
- Cascading dynamic dropdowns: Selecting Wilaya automatically limits Commune choices.
- Instant keyboard search in Arabic or French ("31" or "Oran" or "وهران" instantly selects Wilaya 31).
- **Delight Feature**: Real-time Carrier Phone Operator Badge (Mobilis green, Djezzy red, Ooredoo purple) next to the phone input, alerting the dispatcher if a customer entered an invalid Algerian prefix (`05`, `06`, `07`).

### 6. EDGE CASES
- *Invalid Input*: Phone has 9 digits instead of 10. `validateAlgerianPhone` highlights field in red with message: *"Numéro algérien invalide (doit débuter par 05, 06 ou 07)"*.
- *Boundary Value*: Weight is exactly 5.000 kg $\rightarrow$ zero overage applied.
- *Connectivity*: Entire 58-wilaya and commune dataset is bundled locally in client memory; zero network latency on search.

---

## FEATURE 2: High-Speed Barcode Scanning & Sac-Navette Bagging Engine

### 1. PURPOSE
Enables the **Agent de Tri (Hub Sorter)** to scan up to 1,200 parcels per hour into destination transit bags without looking away from physical packages.

### 2. BUSINESS LOGIC
- **Scan Modes**:
  1. `IntakeMode`: Scans incoming parcels from merchant pickup, assigns tracking number if unlabelled, and verifies gross weight.
  2. `BaggingMode`: Links individual parcels into a sealed nylon transport bag (*Sac-Navette*).
  3. `UnbaggingMode`: Opens sealed bags at the destination hub, verifying that all contained items arrived intact.
- **Security Seal Interlock**: A bag cannot transition to `Sealed` status without entering a verified, unique 8-digit physical plastic seal number (*Numéro de Scellé de Sécurité*).
- **Audio Feedback**:
  - High chime (1200Hz, 100ms) on valid scan.
  - Double low buzz (220Hz, 400ms) with full-screen red flash on wrong destination or duplicate scan.
- **State Machine**:
  - Parcel: `IntakeHub` $\rightarrow$ `AssignedToBag` $\rightarrow$ `BagSealed` $\rightarrow$ `InLineHaul` $\rightarrow$ `ReceivedDestinationHub`.

### 3. DATA MODEL
```typescript
export interface TransportBag {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  bagCode: string; // e.g. "BAG-16-ORN-0042"
  originHubWilaya: number;
  destinationHubWilaya: number;
  securitySealNumber: string; // e.g. "SL-994821"
  shipmentIds: string[];
  totalItemCount: number;
  totalWeightKg: number;
  status: 'Open' | 'Sealed' | 'InTransit' | 'Received' | 'Discrepancy';
  sealedAt?: string;
  receivedAt?: string;
}
```

### 4. CODE ARCHITECTURE
- **Component**: `/src/components/screens/logistics/LogisticsScannerView.tsx`
- **Audio Utility**: Synthetic Web Audio API (`AudioContext`) sound generator requiring zero external mp3 assets.
- **Hardware Integration**: Standard HID barcode gun support with automated `<input autoFocus>` preservation and enter-key capture.

### 5. UX FLOW & DELIGHT
- Operator scans destination bag barcode $\rightarrow$ scans 20 consecutive packages $\rightarrow$ scans security seal barcode $\rightarrow$ bag automatically closes and prints manifest sticker.
- **Delight Feature**: Visual Box Tetris & Weight Dial: shows live total bag weight with an amber warning when bag approaches 25 kg (maximum safe manual handling weight).

### 6. EDGE CASES
- *Double-Scan*: Operator scans the same parcel twice within 2 seconds. The scanner ignores the second scan, emits a gentle warning tone, and displays: *"Colis déjà enregistré dans ce sac"*.
- *Wrong Destination*: Scanning a package destined for Constantine (25) while packing an Oran (31) bag triggers an immediate screen freeze requiring the operator to hit `Escape` or scan a supervisor authorization card.

---

## FEATURE 3: Décret 05-468 Legal Road Transport Manifest (Lettre de Voiture Routière)

### 1. PURPOSE
Enables the **Dispatcher** and **Line-Haul Driver** to instantly generate official, QR-coded road transport manifests that protect long-haul freight trucks from heavy police and gendarmerie highway fines.

### 2. BUSINESS LOGIC
- **Legal Compliance (Décret exécutif n° 05-468)**:
  - Must state: Transporteur corporate details (RC, NIF, NIS, Transport License No), vehicle registration plate (*Matricule*), trailer plate if applicable, driver full name and National Identification Number (NIN).
  - Must enumerate: Wilaya of origin and destination, total number of sealed bags, total loose parcels, gross cargo weight, total COD monetary value declared, and security seal numbers.
- **Gendarmerie Verification QR Code**:
  - Encrypts a verifiable offline JSON payload: `{ manifestNo, date, plate, driverNIN, bagCount, sealList, digitalHash }`.
- **State Machine**:
  - `Draft` $\rightarrow$ `DriverSigned` $\rightarrow$ `Dispatched` $\rightarrow$ `ArrivedDestination` $\rightarrow$ `Archived`.

### 3. DATA MODEL
```typescript
export interface LineHaulManifest {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  manifestNumber: string; // "LVR-2026-00428"
  vehiclePlate: string; // "04128-119-16"
  driverName: string;
  driverPhone: string;
  driverNin: string; // Numéro d'Identification Nationale
  transportCardNumber: string;
  originHub: string;
  destinationHub: string;
  bagIds: string[];
  sealNumbers: string[];
  totalPackagesCount: number;
  totalGrossWeightKg: number;
  totalCodValueDzd: number;
  dispatchTime: string;
  estimatedArrivalTime: string;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Delayed';
  offlineQrHash: string;
}
```

### 4. UX FLOW & DELIGHT
- 1-Click "Imprimer Lettre de Voiture": Generates a pixel-perfect, bilingual French/Arabic legal A4 document ready for thermal or laser printing.
- **Delight Feature**: Direct SMS / WhatsApp Push to Driver: Sends an automated summary with a secure link to the digital manifest token that renders on mobile even without 4G connection.

---

## FEATURE 4: Double-Lock Cash-on-Delivery (COD) Vault & Courier Discharge Terminal

### 1. PURPOSE
Enables the **Hub Cashier** and **General Manager** to eliminate driver cash theft and uncollected debts by enforcing physical banknote counting and mutual digital discharge signatures before releasing couriers.

### 2. BUSINESS LOGIC
- **Double-Lock Formula**:
  $$\text{ExpectedCash} = \sum (\text{Delivered Shipments} \times \text{COD Amount}) + \text{Stamp Duty}$$
  $$\text{Discrepancy} = \text{ActualPhysicalCashTurnedIn} - \text{ExpectedCash}$$
- **Discharge Rules**:
  - If $\text{Discrepancy} = 0$: Courier receives `DischargedClean` certificate.
  - If $\text{Discrepancy} < 0$ (Shortage): Requires Courier acknowledgment. Courier balance is debited; system blocks assignment of high-value COD runs tomorrow.
  - If $\text{Discrepancy} > 0$ (Surplus): Logged as unallocated cashier surplus under scrutiny.
- **Banknote Denomination Counter**:
  - Tracks physical Algerian banknotes (2,000 DZD, 1,000 DZD, 500 DZD) and coins.
- **State Machine**:
  - Manifest: `PendingCashierIntake` $\rightarrow$ `CashCounted` $\rightarrow$ `SignedByBothParties` $\rightarrow$ `VaultSecured`.

### 3. DATA MODEL
```typescript
export interface CourierCashDischarge {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  cashierStaffId: string;
  courierStaffId: string;
  manifestId: string;
  dischargeNumber: string; // "DECH-2026-0891"
  deliveredCount: number;
  returnedCount: number;
  expectedCodDzd: number;
  actualCashTurnedInDzd: number;
  discrepancyDzd: number;
  banknotesCount: {
    note2000: number;
    note1000: number;
    note500: number;
    coins: number;
  };
  courierSignatureConfirmed: boolean;
  timestamp: string;
}
```

### 4. UX FLOW & DELIGHT
- Cashier enters counts for 2,000, 1,000, and 500 DZD notes. The total dynamically auto-sums in real-time with zero manual math errors.
- **Delight Feature**: 1-Click "Imprimer Bon de Décharge": Prints a split receipt (1 copy for driver wallet, 1 copy for vault stapler) containing the exact banknote breakdown and zero-balance clearance stamp.

---

## FEATURE 5: Stop-Desk OTP Pickup & CNI Identity Verification Desk

### 1. PURPOSE
Enables the **Stop-Desk Agent** to rapidly hand over packages to recipients, verify National Identity Cards (CNI/NIN), collect exact cash, and prevent fraudulent package claims.

### 2. BUSINESS LOGIC
- **Pickup Verification Hierarchy**:
  - Standard Pickup: Tracking Number + 4-digit SMS OTP.
  - Family Member / Third-Party Pickup: OTP + Third-party National Identity Card (CNI) number.
  - Lost OTP: Branch Manager PIN bypass with mandatory photo capture of physical CNI.
- **Storage Grace Period & Escalation**:
  - Days 1–5: Free storage at Stop-Desk.
  - Day 6: Automated warning SMS: *"Dernier délai de retrait avant retour à l'expéditeur"*.
  - Day 8: Automated transition to `ExpiredReturnToHub`.
- **State Machine**:
  - `ArrivedAtDesk` $\rightarrow$ `Shelved` $\rightarrow$ `CustomerNotified` $\rightarrow$ `DeliveredPaid` or `ExpiredReturn`.

### 3. DATA MODEL
```typescript
export interface StopDeskInventory {
  id: string;
  shipmentId: string;
  shelfCode: string; // e.g. "RACK-B-04"
  arrivedAt: string;
  otpCode: string;
  status: 'InRack' | 'Delivered' | 'ReturnScheduled';
  recipientIdType?: 'CNI_Biometrique' | 'Permis' | 'Passeport';
  recipientIdNumber?: string;
  deliveredTimestamp?: string;
}
```

### 4. UX FLOW & DELIGHT
- Shelf Quick-Locator: Scanning a customer's tracking code highlights the physical rack location in glowing green on screen: **"Étagère B - Rayon 3"**.
- **Delight Feature**: Web Speech Synthesizer: Announces customer name and package number over desk speaker when called from waiting line.

---

## FEATURE 6: Reverse Logistics, Return Reason-Code Engine & Merchant Escrow Hold

### 1. PURPOSE
Enables the **Dispatcher** and **Hub Sorter** to manage failed deliveries, categorize customer refusals with standardized proof, and prevent uncollected return inventory from accumulating in warehouses.

### 2. BUSINESS LOGIC
- **Standard Algerian Reason Codes (Codes d'Échec)**:
  - `REC_UNREACHABLE_1`: Client injoignable (Tentative 1 - Matin).
  - `REC_UNREACHABLE_2`: Client injoignable (Tentative 2 - Après-midi).
  - `REC_UNREACHABLE_3`: Client injoignable (Tentative 3 - Jour suivant) $\rightarrow$ triggers hold.
  - `REC_POSTPONED`: Rendez-vous reporté par le destinataire (max 3 jours).
  - `REC_WRONG_NUMBER`: Faux numéro de téléphone / Numéro erroné.
  - `REC_REFUSED_DEFECT`: Refusé pour non-conformité ou colis endommagé.
  - `REC_REFUSED_EXPENSIVE`: Refusé car prix contesté ou manque d'argent.
  - `REC_CANCELLED`: Commande annulée par le client avant passage.
- **Three-Attempt Auto-Return Protocol**:
  - A package cannot be marked as definitive return without logging at least 3 timestamped phone calls or 1 explicit customer refusal.
- **State Machine**:
  - `OutForDelivery` $\rightarrow$ `DeliveryFailedHold` $\rightarrow$ `ReturnToHub` $\rightarrow$ `ConsolidatedInReturnBag` $\rightarrow$ `ReturnedToMerchant`.

---

## FEATURE 7: Multi-Channel Merchant COD Remittance (Algérie Poste B1/SFP 01, BaridiMob & Bank Wire)

### 1. PURPOSE
Enables the **Gérant / Direction** to clear hundreds of merchant COD settlements in minutes via automated Algérie Poste CCP batch text files and BaridiMob transfer registers.

### 2. BUSINESS LOGIC
- **Remittance Settlement Formula**:
  $$\text{MerchantGrossPayout} = \sum \text{Collected COD for Delivered Orders}$$
  $$\text{Deductions} = \sum \text{Successful Shipping Fees} + \sum \text{Return Fees (Frais de retour)} + \text{Stamp Duties}$$
  $$\text{NetMerchantWire} = \text{MerchantGrossPayout} - \text{Deductions}$$
- **Algérie Poste SFP 01 / B1 File Generation**:
  - Formats data into the official fixed-width ASCII standard:
    `[Code Centre 20] [Compte CCP 10] [Clé 02] [Montant en Centimes 12] [Nom Commerçant 30]`
  - Validates Algérie Poste Key 97 algorithm prior to file generation:
    $$\text{Cle} = 97 - ((\text{CCP} \times 100) \pmod{97})$$
- **State Machine**:
  - `PendingCalculation` $\rightarrow$ `BatchCreated` $\rightarrow$ `ManagerApproved` $\rightarrow$ `BankFileExported` $\rightarrow$ `Settled`.

---

## FEATURE 8: Dynamic Driver Payroll & Hybrid Fleet Commission Engine

### 1. PURPOSE
Enables the **Gérant** to automatically calculate payouts for both salaried internal drivers (fixed wage + delivery bonuses) and freelance subcontractors (per-parcel commission minus withholding tax).

### 2. BUSINESS LOGIC
- **Salaried Driver Calculation**:
  $$\text{Pay} = \text{BaseSalary} + (\text{DeliveredHome} \times 50\text{ DZD}) + (\text{DeliveredDesk} \times 20\text{ DZD}) + \text{FuelAllowance}$$
- **Freelance Subcontractor (Auto-Entrepreneur) Calculation**:
  $$\text{GrossCommission} = (\text{DeliveredHome} \times 150\text{ DZD}) + (\text{DeliveredDesk} \times 70\text{ DZD})$$
  $$\text{WithholdingTax} = \text{GrossCommission} \times 5\% \quad \text{(Prestation de service impôt libératoire)}$$
  $$\text{NetPayout} = \text{GrossCommission} - \text{WithholdingTax} - \text{DriverCashDiscrepancies}$$

---

# Systematic Edge Cases & Failure Handling (Across All Must Features)

| Edge Case Category | Specific Trigger | Expected System Behavior | User-Visible Feedback | Audit Logging |
| :--- | :--- | :--- | :--- | :--- |
| **1. Invalid / Missing Input** | User creates parcel without recipient phone or with 8-digit phone. | Modal blocks submit button; highlights phone input in red border. | *"Numéro de téléphone requis (format algérien 10 chiffres: 05/06/07)"* | Logged as validation rejection. |
| **2. Concurrency** | Two dispatchers assign the same shipment to two different drivers simultaneously. | Optimistic locking on shipment record; second update rejects. | *"Conflit: Ce colis vient d'être assigné au chauffeur Karim. Actualisation..."* | Event: `ShipmentAssignmentCollision` |
| **3. Time & Weekend Drift** | Delivery deadline falls on Friday (national prayer day / rest day). | SLA calculation engine skips Friday and public holidays automatically. | *"Délai de livraison ajusté: Vendredi exclu du délai contractuel"* | System calendar log. |
| **4. Money & Stamp Ceilings** | COD cash amount exceeds 100,000 DZD. | Article 317 stamp duty capped at statutory ceiling (2,500 DZD). | *"Droit de timbre fiscal plafonné à 2 500 DZD (Art. 317)"* | Logged in Fiscal Ledger. |
| **5. Permissions & Security** | Hub Sorter attempts to access the Merchant COD Payout screen. | Screen routes to 403 Access Denied; TopBar displays red lock. | *"Accès restreint: Réservé à la Direction et aux Finances"* | Logged: `SecurityViolationAttempt` |
| **6. Connectivity & Offline** | Warehouse internet cuts out while sorter is scanning a 50-parcel bag. | System switches to IndexedDB offline queue; saves scans locally. | *"Mode hors-ligne actif: 14 scans mémorisés en attente de reconnexion"* | Offline sync ledger. |
| **7. Data Integrity** | Manager attempts to delete a merchant with unremitted COD balances. | Deletion blocked with cascading integrity check. | *"Suppression impossible: Ce commerçant possède 42 000 DZD de fonds non réglés"* | Integrity error log. |
| **8. Legal & Privacy (Loi 18-07)** | Customer requests deletion of delivery address after delivery completed. | Address is anonymized to Wilaya/Commune level; fiscal records retained. | *"Données personnelles anonymisées conformément à la Loi 18-07 ANPDP"* | ANPDP Compliance Log. |
| **9. Human Error** | Driver accidentally clicks "Delivered" on a parcel that was refused. | Driver has 5-minute undo window on app; cashier can revert upon physical intake. | *"Statut rétabli: Colis marqué en retour après confirmation caisse"* | Event: `ManualStatusReversal` |

---

# Acceptance Criteria & Pure Function Test Suite

### Acceptance Criteria (Given / When / Then)
```gherkin
Scenario: Courier turns in physical cash with a 1,000 DZD shortage
  Given Courier "Farid" completed manifest "MAN-041" with 10 delivered parcels totaling 85,000 DZD
  When the Hub Cashier enters actual banknotes totaling 84,000 DZD
  Then the system displays an amber discrepancy warning of -1,000 DZD
  And generates a "Billet de Décharge avec Manquant"
  And automatically debits 1,000 DZD from Farid's driver account
  And prohibits closing the manifest without Farid's signature acknowledgment
```

### Pure Function Unit Tests (`logisticsRules.test.ts`)
1. `computeShipmentTariff`:
   - Input: `{ weight: 7.2, zone: 'Zone3_Nord', deliveryType: 'HomeDelivery', cod: 8000 }`
   - Output: `{ base: 850, overage: 180, stampDuty: 30, total: 1060, customerTotal: 8030 }`
2. `computeAlgerianFiscalStamp`:
   - Input: `450 DZD` $\rightarrow$ `0 DZD`
   - Input: `2500 DZD` $\rightarrow$ `20 DZD`
   - Input: `7500 DZD` $\rightarrow$ `30 DZD`
   - Input: `15000 DZD` $\rightarrow$ `40 DZD`
   - Input: `35000 DZD` $\rightarrow$ `50 DZD`
   - Input: `120000 DZD` $\rightarrow$ `1200 DZD`
3. `calculateCcpKey`:
   - Input: `1000000` $\rightarrow$ Key `97 - ((1000000 * 100) % 97) = 33`
   - Verifies 100% mathematical validity for Algérie Poste SFP 01 slips.
4. `validateTransportManifestIntegrity`:
   - Input: Manifest with 5 bags totaling 140 packages; verifies sum of bag contents equals manifest total count.

---

# Cross-Feature Checks & Shared Module Reusability

- **Unified Navigation & Role Switching**: The TopBar role switcher uses Atrium's standardized role context, updating the active role across all views simultaneously.
- **Universal Data Collection**: The Shipments Hub uses `UniversalDataCollection` with dual List/Grid view, bulk selection, column pinning, and a 390px Inspector Drawer showing complete historical timeline events.
- **Search & Filter Synchronization**: The `Seek` expanding search lens integrates seamlessly with the 58-Wilaya filter capsules and status pills.

---

# Self-Review: 10 Critical Weaknesses & Structural Fixes

1. **Weakness**: What if an offline driver delivers a parcel, collects cash, and their phone battery dies?
   * *Fix*: Implemented physical Paper Delivery Manifest backup with mandatory customer counter-signature. Cashier enters delivery manually upon evening return.
2. **Weakness**: Algérie Poste CCP accounts reject transfers if the name does not match the official postal registry.
   * *Fix*: Added a mandatory CCP account verification test button that flags name/account discrepancies before exporting the SFP 01 batch.
3. **Weakness**: High-value parcels could be targeted for theft if contents are visible on thermal labels.
   * *Fix*: Enforced Loi 18-04 postal secrecy: labels only print tracking barcode, recipient initials, phone, and commune. Product descriptions are hidden from external view.
4. **Weakness**: Sorters might accidentally scan parcels into the wrong wilaya bag.
   * *Fix*: Integrated a loud, high-pitched error tone and screen freeze requiring operator acknowledgment before scanning can resume.
5. **Weakness**: What if a customer refuses to pay the 40 DZD stamp duty at the door?
   * *Fix*: Added a toggle in merchant settings allowing the shipper to absorb the stamp duty into their commercial fee, keeping the door price clean.
6. **Weakness**: Couriers in remote wilayas have poor 3G/4G coverage.
   * *Fix*: Manifest verification QR codes store an encrypted, self-contained offline token readable without an internet connection.
7. **Weakness**: Stop-desk shelves get cluttered with abandoned returns.
   * *Fix*: Automated 7-day expiration timer that moves unclaimed parcels to the return truck queue automatically.
8. **Weakness**: Subcontractor couriers may not have commercial registrations.
   * *Fix*: Integrated Auto-Entrepreneur card number validation with automatic 5% withholding tax tracking for G50 compliance.
9. **Weakness**: Weight scale fraud by merchants under-declaring package weights.
   * *Fix*: Integrated hub intake scales with automated weight discrepancy alerts that bill the merchant for shipping fee differences.
10. **Weakness**: Discrepancies between physical cash drawer and reported system balances.
    * *Fix*: Enforced double-blind cash closure requiring cashier to input banknote counts before system reveals the expected total.

---

# Build Order (Thin Vertical Slices)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PHASED BUILD ORDER                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Slice 1: Pure Domain Rules & 58-Wilaya Tax Matrix                                      │
│ - /src/utils/logisticsRules.ts & /src/utils/logisticsRules.test.ts                     │
│ - Tariff formulas, Article 317 stamp duty, CCP key algorithms (36 unit tests)          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Slice 2: Operational Data Layer & Mock Engine                                          │
│ - /src/components/screens/logistics/logisticsData.ts                                    │
│ - Quadruple traceability seeds, dynamic wilaya shipments, transport bags, and manifests │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Slice 3: Role-Adaptive UI & Screen Decomposition                                       │
│ - Dedicated screens for Gérant, Dispatcher, Sorter, and Stop-Desk                      │
│ - High-Speed Barcode Terminal with synthetic Web Audio API feedback                     │
│ - Décret 05-468 Printable Transport Manifest & Algérie Poste SFP 01 exporter            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Slice 4: Double-Lock Cash Vault & Stop-Desk Handover Terminal                          │
│ - Banknote denomination cashier modal and discrepancy discharge slips                  │
│ - Stop-Desk shelf inventory locator and OTP validation engine                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# Definition of Done

- [ ] All 8 features fully specified with zero ambiguous logic.
- [ ] Role-based UI cleanly separates Gérant, Dispatcher, Hub Sorter, and Stop-Desk views.
- [ ] 100% trilingual dictionary coverage across French, Modern Standard Arabic (RTL), and English.
- [ ] Pure calculation functions verified with automated tests in `logisticsRules.test.ts`.
- [ ] Zero code regressions; `compile_applet` and `lint_applet` pass cleanly.
