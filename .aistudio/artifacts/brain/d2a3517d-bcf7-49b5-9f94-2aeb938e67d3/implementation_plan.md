# Production Implementation Specification: Category Agriculture & Élevage Laitier (Algeria)

A comprehensive, production-grade implementation specification for Category 17 (Mixed Commercial Farming, Field Crops, Horticulture & Dairy Herd Management in Algeria) within Atrium OS.

---

> [!IMPORTANT]
> **Approved Architectural Principles & Constraints**:
> 1. **Role-Based UI Separation (RBAC)**: Enforced via TopBar Role Switcher with PIN security (`0000` default) and hard screen-locked sidebars across 4 operational personas:
>    - **Gérant / Exploitant Agricole**: Full macro overview, BADR credit files, farm financial P&L, global settings.
>    - **Chef de Culture & Parcelles**: Parcels, crop cycles, chemical treatments, phytosanitary DAR safety lockouts, field worker pointage.
>    - **Zootechnicien / Chef d'Élevage**: Dairy herd census, daily morning/evening milking sessions, cooling tank hygiene, veterinary antibiotic milk withholding lockouts, ONIL monthly subsidy dossiers.
>    - **Magasinier & Caisse Marché de Gros**: Pont-bascule weighbridge, input inventory (CMUP), diesel depot meters, wholesale cash cashier with Article 317 timbre fiscal.
> 2. **Dairy Cattle & Milk Tank Specialization**: Native modeling of individual cow ear tags (boucles d'identification), daily milking parlor logs, bulk tank cooling, and the official 12 DZD/L ONIL state milk subsidy.
> 3. **Design System Tokens**: Elevated `#F8F9FA` pod trays, `#1F1D1B` Dark Espresso anchor cards, `#C4785A` Brand Terracotta buttons with satin bevel, UniversalDataCollection (List/Grid/Drawer), Seek expanding search lens, kinetic LabelInput & LabelSelect, tabular numerals (`font-mono tabular-nums`).
> 4. **Trilingual RTL Parity**: Complete synchronization across French, Modern Standard Arabic (RTL), and English.
> 5. **Quadruple Traceability**: Every entity strictly enforces `{ accountId, businessId, branchId, staffId }`.

---

# FEATURE 1: Dynamic Parcel Register & Concession Passport (Cadastre, Sol & Irrigation)

### 1. PURPOSE
Enables the **Exploitant Agricole** and **Chef de Culture** to maintain an audit-proof, cadastral land passport for every cultivated parcel—linking state concession deeds (Loi 10-03), soil pedology, and ANRH-metered irrigation sources to prevent land ownership disputes and eliminate BADR loan rejection.

### 2. BUSINESS LOGIC
- **Cadastral Identification Rules**: Every agricultural parcel belongs to either:
  1. *Concession Domaniale (Loi 10-03)*: Requires Acte de Concession Notarié, Numéro de Section Cadastrale, Numéro d'Îlot, and 40-year lease expiration date.
  2. *Propriété Privée (Melk)*: Requires Livret Foncier number and Acte de Propriété.
  3. *Location / Fermage Privé*: Requires Contrat de Location Agricole and lease termination date.
- **Irrigation Capacity & ANRH Borehole Quotas**: Each parcel is mapped to an authorized water source: *Borehole (Forage)*, *Dam/Oued Gravity Canal*, or *Dry-farming (Bour)*. For boreholes, the ANRH annual quota in cubic meters ($m^3$) is allocated across linked parcels. If scheduled watering exceeds $85\%$ of the borehole quota, an amber warning triggers.
- **Surface Area Validation**: Total cultivated surface area across all sub-plots ($\sum \text{Surface}_{\text{plots}}$) cannot exceed the registered total cadastral surface of the parcel title.
- **State Machine**:
  - `En Repos (Jachère / Fallow)`: Parcel unplanted; organic matter restitution. Can transition to `Préparation du Sol`.
  - `Préparation du Sol`: Deep plowing (labour), subsoiling, organic manuring. Can transition to `Ensemencée / Plantée`.
  - `En Végétation (Growing)`: Active vegetative development under irrigation and fertilizing. Can transition to `En Récolte`.
  - `En Récolte (Harvesting)`: Active picking or combine harvesting. Can transition to `En Repos` upon final stubble clearance.
  - `Sinistre / Gel / Sirocco`: Frozen state triggered by force majeure (hail, heatwave, flood).
- **Permissions Matrix**:
  - *Gérant*: View, Create, Edit, Delete, Override cadastral bounds.
  - *Chef de Culture*: View, Edit soil logs, Change parcel state.
  - *Zootechnicien / Magasinier*: Read-only (restricted to parcel names for grazing or fertilizer dispatch).
- **Worked Numerical Calculation (Soil Water Deficit & Irrigation Run-Time)**:
  - Surface: $12.5\text{ ha}$ (Orangeraie Thomson).
  - Drip Emitter Flow: $4.0\text{ L/h}$ per tree at $400\text{ trees/ha} = 1,600\text{ L/ha/h} = 1.6\text{ m}^3\text{/ha/h}$.
  - Daily Evapotranspiration Deficit ($ET_c$): $5.2\text{ mm/day} = 52\text{ m}^3\text{/ha/day}$.
  - Daily Parcel Water Requirement: $12.5\text{ ha} \times 52\text{ m}^3\text{/ha} = 650\text{ m}^3\text{/day}$.
  - Borehole Pump Delivery Rate: $65\text{ m}^3\text{/h}$.
  - Required Irrigation Run-Time: $650\text{ m}^3 \div 65\text{ m}^3\text{/h} = \mathbf{10.0\text{ hours}}$.
  - ANRH Quota Consumption Check: $650\text{ m}^3$ deducted from annual allocation ($120,000\text{ m}^3$ balance $\rightarrow 119,350\text{ m}^3$).

### 3. DATA MODEL
```typescript
export type AgriTenureType = 'concession_loi_10_03' | 'propriete_melk' | 'fermage_location';
export type AgriIrrigationType = 'drip' | 'pivot' | 'sprinkler' | 'gravity' | 'rainfed_bour';
export type AgriParcelStatus = 'fallow' | 'preparation' | 'growing' | 'harvesting' | 'frozen_damage';

export interface AgriParcel {
  id: string; // "parc_01"
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  name: string; // "Verger Nord - Orangers Thomson"
  code: string; // "P-01"
  tenureType: AgriTenureType;
  cadastralSection?: string; // "Section 04, Îlot 12"
  cadastralDeedRef?: string; // "Acte Notarié N° 1048/2012"
  surfaceHectares: number; // 14.50
  soilType: string; // "Argilo-limoneux profond"
  soilPh?: number; // 7.8
  soilOrganicMatterPct?: number; // 2.1%
  irrigationType: AgriIrrigationType;
  waterSourceId?: string; // "borehole_anrh_01"
  waterMeterReadingM3?: number;
  currentCropName?: string; // "Orangers Navel"
  plantingDate?: string; // "2023-10-15"
  expectedHarvestDate?: string; // "2026-11-25"
  gpsPolygonCoordinates?: Array<{ lat: number; lng: number }>; // GeoJSON boundary
  status: AgriParcelStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. CODE ARCHITECTURE
- **Files**:
  - `src/components/screens/agriculture/AgricultureParcelsView.tsx` (UniversalDataCollection table/grid + summary KPIs).
  - `src/components/screens/agriculture/AgricultureParcelModal.tsx` (Add/Edit parcel wizard with cadastral inputs).
  - `src/components/screens/agriculture/ParcelDrawerInspector.tsx` (Slide-over drawer with soil passport, GPS mini-map, and linked cycles).
  - `src/utils/agriRules.ts` (Pure math: `calculateIrrigationRunTime`, `validateCadastralBounds`, `checkAnrhQuota`).
- **State Management**:
  - Global `agriParcels` array in `useAtriumStore`, persisted to `localStorage` with offline IndexedDB mirror.
- **Offline Behavior**:
  - Full local read/write on mobile devices. Created parcels receive temp IDs (`temp_parc_uuid`); synced via timestamp reconciliation upon reconnecting.

### 5. UX FLOW AND ENHANCEMENTS
- **Fewest-Clicks Path**: Click `"Nouvelle Parcelle"` ($N$) $\rightarrow$ Enter Name, Hectares, Irrigation mode $\rightarrow$ Press Enter/Submit. Done in 3 fields (< 8 seconds).
- **Speed Features**: Keyboard shortcut `Cmd/Ctrl + P` opens parcel selector. Autocomplete for Algerian soil types and wilaya cadastral formats.
- **Microcopy**:
  - *French*: "Registre Parcellaire & Concessions Foncières", "Ajouter une Parcelle", "Quota Forage ANRH dépassé".
  - *Arabic*: "سجل الأراضي والامتيازات الفلاحية", "إضافة قطعة أرض", "تم تجاوز حصة بئر المياه".
  - *English*: "Cadastral Parcel Register", "Add Agricultural Parcel", "ANRH Borehole Quota Exceeded".
- **Delight Improvement**: **Cadastral Water Budget Dial**: An interactive SVG gauge on each parcel card showing remaining ANRH borehole allowance versus summer crop evapotranspiration, giving farm owners instant visual peace of mind before the heatwave hits.

### 6. EDGE CASES AND FAILURE HANDLING
- **Invalid Input**: Surface area entered as $\le 0$ or $> 5000\text{ ha}$. *Handling*: Form rejects with *"La superficie doit être comprise entre 0.1 ha et 5000 ha"*.
- **Concurrency**: Two agronomists change current crop simultaneously. *Handling*: Last-write-wins on attributes with explicit change notification in audit log.
- **Time/Timezone**: Local Africa/Algiers (UTC+1). Seasonal planting dates stored in standard ISO string (`YYYY-MM-DD`).
- **Data Integrity**: User attempts to delete a parcel with active crop cycles or pending chemical treatments. *Handling*: Soft-delete prevented with error *"Impossible de supprimer une parcelle ayant un cycle de culture actif"*.

### 7. ACCEPTANCE CRITERIA AND TESTS
- **Scenario**: Register a 15-hectare parcel under Loi 10-03.
  - *Given* an authenticated Gérant on the Parcels screen,
  - *When* they enter "Plaine Ouest", 15.0 ha, Concession Loi 10-03, Section 02, and save,
  - *Then* the parcel appears in the UniversalDataCollection grid with an active "Fallow" status badge, and total farm arable surface increments by 15.0 ha.
- **Unit Test**: `validateCadastralBounds(parcels, maxLeaseHa)` returns `false` if total parcel sum exceeds the concession deed.

### 8. RISKS AND OPEN QUESTIONS
- [ASSUMPTION]: Most commercial Algerian farms have formal cadastral section and îlot references from their ONTA concession deed.
- [VERIFY]: Check whether private land rentals (fermage) require the landlord's Carte Fellah number for DSA registration.

---

# FEATURE 2: Crop Cycle & Phytosanitary Safety Engine (Semis-to-Harvest & DAR Lockout)

### 2.1 PURPOSE
Allows the **Chef de Culture** and **Exploitant** to govern complete crop cycles from tillage to final harvest, with an automated chemical safety lockout based on the INPV **Délai Avant Récolte (DAR)** that strictly prevents the picking and sale of chemically contaminated crops.

### 2.2 BUSINESS LOGIC
- **Cycle Lifecycle State Machine**:
  - `Planifié (Planned)`: Budget, seed variety, target surface established.
  - `Semis / Plantation (Sown)`: Certified seed lot issued from warehouse, planting density ($kg/ha$ or plants/ha) logged.
  - `Croissance & Entretien (Vegetative)`: Irrigation, fertilizer top-dressing (fertigation), weeding.
  - `Traitement Phyto (Spraying Locked)`: Insecticide or fungicide applied; **safety countdown triggered**.
  - `Prêt pour Récolte (Ready for Harvest)`: DAR timer has reached zero.
  - `Clôturé (Harvest Closed)`: Actual yield reconciled against projected yield.
- **INPV Phytosanitary DAR Lockout Algorithm**:
  - Upon logging any phytosanitary spray (e.g. Fongicide Mancozèbe, Insecticide Deltaméthrine), the agronomist must enter the homologated commercial product, chemical lot, and official INPV DAR (in days).
  - Minimum Allowed Harvest Date:
    $$\text{Date}_{\text{HarvestAllowed}} = \text{Date}_{\text{Application}} + \text{DAR}_{\text{days}}$$
  - **Lockout Rule**: If $\text{Date}_{\text{Today}} < \text{Date}_{\text{HarvestAllowed}}$, the system physically disables the "Créer Bon de Récolte" button for that parcel and displays a bold amber warning counter: *"X jours restants de rémanence chimique obligatoire"*.
- **Permissions**:
  - *Chef de Culture*: Logs applications, inputs, and soil work.
  - *Gérant*: Can view and approve emergency harvest overrides with mandatory justification note.
  - *Magasinier*: Reads product stock deductions.
  - *Zootechnicien*: Blocked.
- **Worked Numerical Example (Potato Cycle Fungicide Treatment)**:
  - Parcel: P-02 (Pomme de terre Spunta, 8.0 ha).
  - Application Date: 2026-05-10 at 08:00.
  - Product: Ridomil Gold (Métalaxyl-M + Mancozèbe).
  - INPV Homologated DAR: **14 days**.
  - $\text{Date}_{\text{HarvestAllowed}} = 2026\text{-}05\text{-}10 + 14\text{ days} = \mathbf{2026\text{-}05\text{-}24}$.
  - On 2026-05-18 (Day 8), a harvester attempts to create a harvest lot:
    $$\text{Diff} = 2026\text{-}05\text{-}24 - 2026\text{-}05\text{-}18 = \mathbf{6\text{ days remaining}} \rightarrow \textbf{ACTION LOCKED}.$$

### 2.3 DATA MODEL
```typescript
export type AgriCyclePhase = 'planned' | 'sowing' | 'vegetative' | 'treatment_locked' | 'ready_harvest' | 'closed';

export interface AgriCropCycle {
  id: string; // "cycle_2026_potato_01"
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  parcelId: string;
  cropName: string; // "Pomme de Terre"
  variety: string; // "Spunta"
  campaignYear: number; // 2026
  surfaceAllocatedHa: number; // 8.0
  seedLotNumber?: string; // "CCLS-SEM-2025-992"
  seedQuantityKg?: number; // 20000 kg
  sowingDate: string; // "2026-01-20"
  projectedHarvestDate: string; // "2026-05-28"
  projectedYieldQtx: number; // 2800 quintaux (350 qtx/ha)
  actualYieldQtx?: number;
  currentPhase: AgriCyclePhase;
  activeDarLockoutUntil?: string; // ISO date if treatment active
  activePestWarning?: string;
  totalInputCostDzd: number; // 1,450,000 DZD
  totalLaborCostDzd: number; // 680,000 DZD
  totalMachineryCostDzd: number; // 320,000 DZD
  createdAt: string;
  updatedAt: string;
}

export interface AgriTreatmentLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  parcelId: string;
  cropCycleId: string;
  treatmentDate: string; // "2026-05-10"
  commercialProductName: string; // "Ridomil Gold"
  activeIngredient: string; // "Métalaxyl-M"
  targetPestDisease: string; // "Mildiou de la pomme de terre"
  dosagePerHa: string; // "2.5 kg/ha"
  totalQuantityUsed: number; // 20 kg
  darDays: number; // 14
  harvestAllowedDate: string; // "2026-05-24"
  operatorStaffId: string;
  safetyGearConfirmed: boolean;
  notes?: string;
  createdAt: string;
}
```

### 2.4 CODE ARCHITECTURE
- **Files**:
  - `src/components/screens/agriculture/AgricultureCyclesView.tsx` (Crop cycles list, timeline progress bars, DAR indicator).
  - `src/components/screens/agriculture/AgriTreatmentModal.tsx` (Chemical application logging wizard with DAR calculator).
  - `src/utils/agriPhytoRules.ts` (DAR countdown math, pesticide validation, cost-per-hectare roll-up).
- **State**:
  - `cropCycles` and `treatmentLogs` arrays stored in store.
  - Live computed selector: `isParcelHarvestable(parcelId, currentDate)`.

### 2.5 UX FLOW AND ENHANCEMENTS
- **Fewest-Clicks Path**: Click `"Nouveau Traitement"` $\rightarrow$ Select Cycle $\rightarrow$ Pick Product (prefills dosage & DAR automatically from catalog) $\rightarrow$ Save. 3 clicks.
- **Speed Features**: Homologated product dropdown preloaded with standard Algerian INPV registered products (Cuprocol, Ridomil, Karate Zeon, Score, Roundup).
- **Microcopy**:
  - *French*: "Délai Avant Récolte (DAR)", "Parcelle Verrouillée Chimiquement", "Traitement Phyto Enregistré".
  - *Arabic*: "فترة الأمان قبل الجني (DAR)", "الحقل مغلق كيميائياً لأسباب صحية", "تم تسجيل المعالجة النباتية".
  - *English*: "Pre-Harvest Interval (PHI/DAR)", "Parcel Chemically Locked", "Phytosanitary Logged".
- **Delight Feature**: **Live Antidote & Re-Entry Clock**: A countdown clock indicating both the worker re-entry delay (Délai de Ré-entrée - 24h) and harvest delay, with a 1-click WhatsApp emergency toxicological summary for the foreman.

### 2.6 EDGE CASES AND FAILURE HANDLING
- **Invalid Input**: Negative or zero DAR days on a toxic organophosphate chemical. *Handling*: System rejects with *"Le DAR doit être supérieur ou égal à 1 jour pour les produits chimiques homologués"*.
- **Consecutive Sprayings**: A second spray applied 5 days after the first with a longer DAR. *Handling*: System takes $\max(\text{Date}_1 + \text{DAR}_1, \text{Date}_2 + \text{DAR}_2)$ to ensure safety window never shrinks.
- **Accidental Early Harvest Click**: Harvester clicks generate ticket on locked parcel. *Handling*: Modal blocked with red badge: *"Action refusée: Récolte interdite pendant le DAR"*.

### 2.7 ACCEPTANCE CRITERIA AND TESTS
- **Scenario**: Apply chemical with 7-day DAR on Day 1.
  - *Given* an active crop cycle on Parcel P-01,
  - *When* a treatment with 7 days DAR is logged on May 1st,
  - *Then* the cycle status changes to `treatment_locked` and harvest button is disabled until May 8th at 00:00:00.
- **Unit Test**: `evaluateDarSafety(treatmentDate, darDays, testDate)` returns `{ isLocked: true, daysRemaining: 3 }`.

### 2.8 RISKS AND OPEN QUESTIONS
- [ASSUMPTION]: Farmers maintain written or mental records of product DAR from container labels.
- [VERIFY]: Check if organic biostimulants (e.g. amino acids, seaweed extracts) can be marked as DAR = 0 days without triggering safety warnings.

---

# FEATURE 3: Offline Mobile Field Worker Pointage & Piecework Muster (PWA)

### 3.1 PURPOSE
Allows the **Chef de Culture** to roll-call seasonal field hands and track crate/sack piecework directly in the field on low-cost Android phones with zero 3G/4G coverage, eliminating end-of-day wage disputes and labor phantom hours.

### 3.2 BUSINESS LOGIC
- **Labor Modes Supported**:
  1. *Journalier (Daily Day-Wage)*: Fixed daily rate (e.g. 1,800 to 2,500 DZD per day). Requires check-in time and check-out time.
  2. *À la Tâche / Rendement (Piecework)*: Paid strictly per harvested unit (e.g. 35 DZD per 20kg orange crate, 50 DZD per potato sack).
  3. *Permanent (Salarié Mensuel)*: Tractor operators and mechanics on fixed monthly salary (CNAS registered).
- **Muster Pointage Rules**:
  - Each seasonal worker receives a daily badge or temporary ID (`T-01` to `T-50`).
  - The supervisor taps `+` on the worker row each time a filled crate is loaded onto the tractor trailer.
  - At muster close, total worker crates must equal the trailer count $\pm 2\%$.
- **Offline Sync & De-duplication**:
  - Pointages are signed with supervisor device ID and local hardware timestamp.
  - When syncing back to the farm server, if two supervisors submitted counts for the same worker on the same date, records are merged by summing discrete crate increments.
- **Permissions**:
  - *Chef de Culture*: Enters muster attendance and crate tallies.
  - *Gérant*: Views daily payroll liability, approves and pays cash vouchers.
  - *Zootechnicien / Magasinier*: Blocked from crop pointage.
- **Worked Numerical Calculation (Orange Harvest Day Muster)**:
  - 30 Seasonal Pickers (Tâcherons) harvesting Thomson Oranges.
  - Rate: $40\text{ DZD}$ per $20\text{ kg}$ wooden crate.
  - Worker T-07 logs: $62\text{ crates}$ harvested in 8 hours.
  - Worker T-07 Daily Earnings: $62 \times 40\text{ DZD} = \mathbf{2,480\text{ DZD}}$.
  - Team Total (30 workers): $1,650\text{ crates} = 33,000\text{ kg} = 330\text{ quintaux}$.
  - Total Daily Field Wage Accrual: $1,650 \times 40\text{ DZD} = \mathbf{66,000\text{ DZD}}$.
  - Trailer Check: 3 trailers of 550 crates each loaded $= 1,650\text{ crates}$ ($\mathbf{0\%\text{ discrepancy}}$).

### 3.3 DATA MODEL
```typescript
export type AgriWorkerType = 'seasonal_piecework' | 'seasonal_daily' | 'permanent_salary';

export interface AgriWorker {
  id: string; // "wrk_01"
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  fullName: string; // "Mohamed Belkacem"
  ninOrIdCard?: string; // Carte Nationale
  phone?: string;
  workerType: AgriWorkerType;
  defaultDailyRateDzd: number; // 2000 DZD
  defaultPieceRateDzd: number; // 40 DZD / crate
  active: boolean;
  createdAt: string;
}

export interface AgriDailyPointage {
  id: string; // "pnt_2026_05_12_wrk01"
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  workerId: string;
  parcelId: string;
  date: string; // "YYYY-MM-DD"
  checkInTime?: string; // "06:30"
  checkOutTime?: string; // "17:00"
  cratesCollected: number; // 62
  calculatedWageDzd: number; // 2480 DZD
  cashAdvancePaidDzd: number; // 500 DZD
  netDueDzd: number; // 1980 DZD
  isPaid: boolean;
  paidAt?: string;
  paymentReceiptRef?: string;
  supervisorStaffId: string;
  syncStatus: 'synced' | 'pending_local';
  createdAt: string;
}
```

### 3.4 CODE ARCHITECTURE
- **Files**:
  - `src/components/screens/agriculture/AgriPointageView.tsx` (Mobile-optimized rapid muster counter).
  - `src/components/screens/agriculture/WorkerModal.tsx` (Fast worker creation modal).
  - `src/utils/agriPayrollRules.ts` (Wage computation, piecework aggregation).
- **Storage**:
  - Full offline PWA support via Service Worker + IndexedDB queue.

### 3.5 UX FLOW AND ENHANCEMENTS
- **Fewest-Clicks Path**: Open Pointage $\rightarrow$ Tap large `+5` or `+1` button next to worker's photo/name as crates arrive. Haptic vibration feedback on tap.
- **Speed Features**: Large $48\text{px}$ touch targets optimized for dirt/sweat on tablet screen; "Marquer Tous Présents" button for morning muster.
- **Microcopy**:
  - *French*: "Pointage des Ouvriers & Tâcherons", "Total Caisses", "Clôturer le Pointage du Jour".
  - *Arabic*: "تسجيل حضور العمال وجني الصناديق", "مجموع الصناديق", "إغلاق حساب اليومية".
  - *English*: "Field Worker & Crate Muster", "Total Crates", "Close Daily Payroll".
- **Delight Feature**: **Audio Tally Beep**: Emits a distinct clean tone per crate logged via Web Audio API so the supervisor does not even need to look down while inspecting loaded trailers.

### 3.6 EDGE CASES AND FAILURE HANDLING
- **Offline / Dead Zone**: 100% of attendance and crate taps recorded in IndexedDB; auto-synced with visual cloud badge when returning to hangar.
- **Worker Swaps Badge**: Two workers claim the same ID. *Handling*: Supervisor can rename worker inline and transfer crate counts without losing history.
- **Partial Cash Advance (Avance sur Salaire)**: Worker asks for 1,000 DZD at noon. *Handling*: Logged as `cashAdvancePaidDzd`, automatically deducted from evening net pay.

### 3.7 ACCEPTANCE CRITERIA AND TESTS
- **Scenario**: 50 crates logged for pieceworker at 40 DZD with 500 DZD advance.
  - *Given* a pieceworker at 40 DZD/crate,
  - *When* 50 crates are recorded and 500 DZD advance is registered,
  - *Then* `calculatedWageDzd` is 2,000 DZD and `netDueDzd` is 1,500 DZD.

### 3.8 RISKS AND OPEN QUESTIONS
- [ASSUMPTION]: Seasonal workers are paid at the end of the day or weekly in cash.
- [VERIFY]: Check local labor inspection tolerances for informal seasonal harvest contracts in agricultural communes.

---

# FEATURE 4: Dairy Cattle Herd & Milk Tank Engine (RFID, Traite & Subvention ONIL)

### 4.1 PURPOSE
Allows the **Zootechnicien / Chef d'Élevage** and **Exploitant** to monitor individual dairy cattle genealogy, daily morning/evening milk production, enforce veterinary antibiotic withholding safety, and automatically generate the certified **Bordereau ONIL (12 DZD/L)** for monthly state milk subsidy collection.

### 4.2 BUSINESS LOGIC
- **Bovine Identification (Numéro de Boucle)**: Every cow carries a mandatory 10-digit ear tag conforming to the Algerian DSV standard: `DZ - [Wilaya Code] - [Unique ID]` (e.g. `DZ-16-10482`).
- **Milking Sessions (Traite Bi-Quotidienne)**:
  - Session 1: Matin (05:00 - 07:00).
  - Session 2: Soir (16:30 - 18:30).
  - Bulk Tank Storage: Tank temperature monitored ($+3.5^\circ\text{C}$ to $+4.0^\circ\text{C}$).
- **Veterinary Antibiotic Milk Withholding Lockout (Délai d'Attente Lait)**:
  - If a cow receives mastitis intramammary treatment or systemic penicillin, the zootechnician enters the drug and withholding period (standard 72 to 96 hours).
  - **Lockout Action**: The cow's milk is strictly flagged as "Non-Conforme / Rejetée". Her individual liters cannot be added to the bulk tank destined for dairy collection (Giplait / Private Laiterie).
- **ONIL Monthly Subsidy Calculation Engine**:
  - State Subsidy Rate: **12.00 DZD** per liter of conforming raw cow milk delivered to approved dairies.
  - Requires: Delivery date, receipt number, certified dairy name, fat content (Matière Grasse $\ge 34\text{ g/L}$), density ($\ge 1.028$), and veterinary stamp.
- **Permissions**:
  - *Zootechnicien*: Full herd access, logs milkings, logs veterinary acts.
  - *Gérant*: Full access, signs official ONIL delivery slips, collects subsidy payouts.
  - *Chef de Culture / Magasinier*: Blocked from veterinary records.
- **Worked Numerical Calculation (ONIL Milk Delivery & Payout)**:
  - 45 Lactating Montbéliarde / Prim'Holstein Cows.
  - Average Yield: $22.0\text{ Liters/cow/day} = 990\text{ L/day}$.
  - Monthly Production (30 days): $29,700\text{ Liters}$.
  - Withholding Deduction (3 cows under antibiotic treatment for 4 days): $3 \times 4 \times 22\text{ L} = 264\text{ L (Dumped)}$.
  - Net Conforming Milk Delivered to Dairy: $29,700 - 264 = \mathbf{29,436\text{ Liters}}$.
  - Dairy Purchase Price: $65.00\text{ DZD/L}$.
  - Direct Dairy Revenue: $29,436 \times 65 = \mathbf{1,913,340\text{ DZD}}$.
  - State ONIL Subsidy ($12\text{ DZD/L}$): $29,436 \times 12 = \mathbf{353,232\text{ DZD}}$.
  - **Total Monthly Farm Dairy Gross Income**: $1,913,340 + 353,232 = \mathbf{2,266,572\text{ DZD}}$.

### 4.3 DATA MODEL
```typescript
export type BovineBreed = 'holstein' | 'montbeliarde' | 'fleckvieh' | 'brune_atlas' | 'croisee';
export type CowReproStatus = 'heifer' | 'lactating' | 'dry' | 'pregnant' | 'quarantine_sick' | 'culled';

export interface AgriDairyCow {
  id: string; // "cow_01"
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  earTagNumber: string; // "DZ-16-10482"
  nameOrNumber: string; // "La Blanche"
  breed: BovineBreed;
  birthDate: string;
  reproStatus: CowReproStatus;
  lactationNumber: number; // 3
  lastCalvingDate?: string; // "2025-11-14"
  dailyAvgLiters: number; // 24.5
  isInWithholdingLockout: boolean;
  withholdingLockoutUntil?: string; // ISO Date
  withholdingReason?: string;
  motherTag?: string;
  sireCode?: string;
  rfidChipId?: string;
  notes?: string;
  createdAt: string;
}

export interface AgriMilkingRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  sessionDate: string; // "YYYY-MM-DD"
  sessionPeriod: 'morning' | 'evening';
  totalTankLiters: number; // 480
  rejectedWithholdingLiters: number; // 22
  conformingLiters: number; // 458
  tankTemperatureCelsius: number; // 3.8
  destinationDairy: string; // "Laiterie Giplait Draa Ben Khedda"
  dairyDeliverySlipNo?: string; // "BL-GIP-9921"
  fatContentMg?: number; // 35.2
  density?: number; // 1.030
  onilSubsidyRateDzd: number; // 12.0
  onilTotalSubsidyDzd: number; // 458 * 12 = 5496 DZD
  operatorStaffId: string;
  createdAt: string;
}
```

### 4.4 CODE ARCHITECTURE
- **Files**:
  - `src/components/screens/agriculture/AgricultureLivestockView.tsx` (Herd list, milking parlour logs, ONIL exporter).
  - `src/components/screens/agriculture/BovinePassportDrawer.tsx` (Individual cow card: lactation history, inseminations, health treatments).
  - `src/components/screens/agriculture/OnilBordereauPrintModal.tsx` (Printable official ONIL monthly subsidy declaration with statutory layout).
  - `src/utils/agriDairyRules.ts` (Subsidy calculations, lactation curve projection, somatic cell risk).
- **State**:
  - `dairyHerd` and `milkingRecords` arrays in store with real-time summary computations.

### 4.5 UX FLOW AND ENHANCEMENTS
- **Fewest-Clicks Path**: Click `"Enregistrer Session de Traite"` $\rightarrow$ Type Tank Liters $\rightarrow$ Verify temperature check $\rightarrow$ Save. 2 clicks.
- **Speed Features**: Visual cow grid with color-coded badges: Green (Milking), Blue (Dry/Tarissement), Red (Antibiotic Withholding Lockout).
- **Microcopy**:
  - *French*: "Cheptel Bovin Laitier & Traite", "Subvention de l'État ONIL (12 DA/L)", "Interdiction de Traite - Présence d'Antibiotiques".
  - *Arabic*: "قطيع الأبقار الحلوب وحلب الحليب", "دعم الدولة للحليب الطازج (12 دج/لتر)", "حظر تسليم الحليب - بقايا مضادات حيوية".
  - *English*: "Dairy Cattle & Milking Parlor", "State ONIL Milk Subsidy (12 DZD/L)", "Milking Lockout - Antibiotic Residue".
- **Delight Feature**: **1-Click Official ONIL Subsidy Dossier**: Generates the exact multi-table PDF/Print layout required by the DSA and ONIL, with ear tags, delivery receipts, and certified bank RIP details, saving the owner 2 days of manual paperwork per month.

### 4.6 EDGE CASES AND FAILURE HANDLING
- **Bulk Tank Temperature Spike**: Tank temperature logged $> 6^\circ\text{C}$ (cooling compressor failure). *Handling*: Critical alert displayed: *"Alerte Température Tank (>4°C): Risque d'acidification du lait"*.
- **Accidental Inclusion of Treated Cow**: Zootechnician enters liters for a locked cow. *Handling*: Liters automatically diverted to `rejectedWithholdingLiters`, excluded from ONIL subsidy total.
- **Lost Ear Tag**: Ear tag lost in field. *Handling*: Cow marked with "Boucle Perdue", generates DSV re-tagging replacement request.

### 4.7 ACCEPTANCE CRITERIA AND TESTS
- **Scenario**: Monthly ONIL delivery bordereau calculation.
  - *Given* 10,000 L delivered to Giplait with 200 L rejected for antibiotics,
  - *When* generating the ONIL dossier,
  - *Then* the subsidized volume is strictly 9,800 L and subsidy amount is $9,800 \times 12 = 117,600\text{ DZD}$.
- **Unit Test**: `computeOnilSubsidy(liters, rejectedLiters, rate)` outputs exact net DZD.

### 4.8 RISKS AND OPEN QUESTIONS
- [ASSUMPTION]: Dairy farm has a refrigerated bulk cooling tank (4°C) with regular truck pickup by an approved laiterie.
- [VERIFY]: Check if private dairies pay premiums for fat content ($MG > 36\text{ g/L}$) in addition to the standard ONIL base rate.

---

# FEATURE 5: Farm Gate Wholesale & Weighbridge Desk (Pont-Bascule & Art. 317)

### 5.1 PURPOSE
Allows the **Magasinier & Caisse Marché de Gros** and **Exploitant** to weigh outbound trucks on the farm weighbridge (pont-bascule), deduct vehicle and crate tare, issue legal Algerian delivery slips (BL), and collect wholesale cash payments with compliant **Article 317 Timbre Fiscal Gradué**.

### 5.2 BUSINESS LOGIC
- **Two-Step Weighbridge Weighing (Double Pesée Pont-Bascule)**:
  - *Pesée 1 (Poids Brut / Gross)*: Truck loaded with produce drives onto weighbridge platform.
  - *Pesée 2 (Tare Véhicule / Empty Truck)*: Truck weighed empty after offloading or weighed prior to field loading.
  - *Crate Tare Deduction (Tare Caisses)*: Number of crates $\times$ unit crate weight (e.g. $1.8\text{ kg}$ per plastic crate).
  - Net Commercial Weight:
    $$\text{Poids Net Marchand} = \text{Poids Brut} - \text{Tare Véhicule} - (\text{Nombre de Caisses} \times \text{Tare Unitaire})$$
- **Article 317 Timbre Fiscal Gradué Calculation (Cash Only)**:
  - As per the Algerian General Tax Code, cash payments at farm gate or wholesale are subject to the graduated stamp tax:
    - Payments $\le 5,000\text{ DZD}$: $0\text{ DZD}$
    - $> 5,000$ to $10,000\text{ DZD}$: $50\text{ DZD}$
    - $> 10,000$ to $20,000\text{ DZD}$: $100\text{ DZD}$
    - $> 20,000$ to $50,000\text{ DZD}$: $200\text{ DZD}$
    - $> 50,000$ to $100,000\text{ DZD}$: $400\text{ DZD}$
    - $> 100,000\text{ DZD}$: $1\%$ of amount, capped at a maximum of **2,500 DZD**.
  - Cheque, Virement Bancaire, and BaridiMob are **exempt** from Article 317 timbre duty.
- **Permissions**:
  - *Magasinier*: Creates tickets, logs weights, prints BL.
  - *Gérant*: Receives cash, voids transactions, authorizes price discounts.
  - *Chef de Culture / Zootechnicien*: Blocked.
- **Worked Numerical Calculation (Wholesale Potato Truck Dispatch)**:
  - Product: Pomme de Terre Spunta (Grade 1).
  - Gross Weight (Poids Brut): $18,450\text{ kg}$.
  - Truck Tare (Tare Camionnette Isuzu): $4,200\text{ kg}$.
  - 500 Plastic Crates at $1.8\text{ kg} = 900\text{ kg}$.
  - Net Commercial Weight: $18,450 - 4,200 - 900 = \mathbf{13,350\text{ kg}} = \mathbf{133.50\text{ Quintaux}}$.
  - Agreed Wholesale Price: $65.00\text{ DZD/kg} = 6,500\text{ DZD/Quintal}$.
  - Produce Total: $13,350\text{ kg} \times 65\text{ DZD} = \mathbf{867,750\text{ DZD}}$.
  - Payment Method: **Espèces (Cash)** at farm gate.
  - Article 317 Timbre Duty: $1\%$ of $867,750 = 8,677.50\text{ DZD} \rightarrow \textbf{Capped at statutory } \mathbf{2,500\text{ DZD}}$.
  - **Total Net Cash Collected from Mandataire**: $867,750 + 2,500 = \mathbf{870,250\text{ DZD}}$.

### 5.3 DATA MODEL
```typescript
export type AgriSalePaymentMethod = 'cash' | 'baridimob' | 'bank_transfer' | 'check' | 'credit_mandataire';

export interface AgriWeighbridgeTicket {
  id: string; // "wgt_2026_05_1001"
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  ticketNumber: string; // "PB-2026-0042"
  buyerName: string; // "Mandataire Bougara - Marché Eucalyptus"
  truckPlate: string; // "04128-116-16"
  driverName?: string;
  cropCycleId: string;
  produceName: string; // "Pomme de Terre Spunta"
  grossWeightKg: number; // 18450
  truckTareKg: number; // 4200
  crateCount: number; // 500
  crateUnitTareKg: number; // 1.8
  totalCrateTareKg: number; // 900
  netWeightKg: number; // 13350
  netWeightQuintaux: number; // 133.50
  unitPricePerKgDzd: number; // 65.0
  subtotalProduceDzd: number; // 867750
  paymentMethod: AgriSalePaymentMethod;
  timbreFiscalDzd: number; // 2500
  totalAmountDzd: number; // 870250
  paidAmountDzd: number;
  remainingDueDzd: number;
  printReceiptCount: number;
  createdAt: string;
}
```

### 5.4 CODE ARCHITECTURE
- **Files**:
  - `src/components/screens/agriculture/AgricultureWholesaleView.tsx` (Weighbridge desk, wholesale ledger, cash drawer register).
  - `src/components/screens/agriculture/WeighbridgeTicketModal.tsx` (Gross/Tare weight calculator and cashier modal).
  - `src/components/screens/agriculture/AgriWeighbridgePrintModal.tsx` (Official bilingual French/Arabic A5 delivery voucher & scale ticket).
  - `src/utils/agriWeighbridgeRules.ts` (Double pesée math, Art. 317 timbre calculation).

### 5.5 UX FLOW AND ENHANCEMENTS
- **Fewest-Clicks Path**: Click `"Nouvelle Pesée"` $\rightarrow$ Type Plate, Gross Weight, Tare Weight $\rightarrow$ System computes Net Quintaux and Stamp automatically $\rightarrow$ Click `"Imprimer Bon de Pesée"` ($P$).
- **Microcopy**:
  - *French*: "Pont-Bascule & Expéditions Marché de Gros", "Poids Net Marchand", "Timbre Fiscal Art. 317 (Plafonné à 2 500 DA)".
  - *Arabic*: "جسر الوزن والشحن لأسواق الجملة", "الوزن الصافي التجاري", "قسيمة الطابع المالي (المحددة بـ 2500 دج)".
  - *English*: "Weighbridge & Wholesale Dispatch", "Net Commercial Weight", "Fiscal Stamp Duty (Cap 2,500 DZD)".
- **Delight Feature**: **Live Truck Scale Visualizer**: An animated axle weight diagram showing the Isuzu/Sonacome truck on the platform with instant green verification when weights balance and tare calculations are sound.

### 5.6 EDGE CASES AND FAILURE HANDLING
- **Negative Net Weight**: Gross weight entered smaller than tare. *Handling*: Form rejects with *"Le poids brut doit être supérieur à la tare du véhicule"*.
- **Cheque Payment**: Buyer pays by cheque. *Handling*: `timbreFiscalDzd` is automatically set to $0\text{ DZD}$.
- **Credit Balance for Mandataire**: Wholesale middleman pays 500,000 DZD and leaves 370,250 DZD on credit. *Handling*: Logged as `remainingDueDzd`, tracked in Wholesale Directory with aging arrears radar.

### 5.7 ACCEPTANCE CRITERIA AND TESTS
- **Scenario**: Gross 10,000 kg, Tare 3,000 kg, 200 crates at 2.0 kg.
  - *Given* gross 10,000 kg and tare 3,000 kg,
  - *When* deducting 400 kg crate tare,
  - *Then* net weight is exactly 6,600 kg (66.00 Quintaux).
- **Unit Test**: `calculateArt317Timbre(867750, 'cash')` returns exactly `2500`.

### 5.8 RISKS AND OPEN QUESTIONS
- [ASSUMPTION]: Farms have an on-site mechanical or electronic weighbridge, or use the certified communal municipal bridge.
- [VERIFY]: Check if wholesale mandataires accept computerized A5 thermal tickets in lieu of traditional hand-written carbon carnet books.

---

# CROSS-FEATURE ARCHITECTURE & DATA FLOW

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              AGRICULTURE VERTICAL DATA FLOW & INTERCONNECTIONS                         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    [ FEATURE 1: Cadastral Parcels ]
                   │
                   ▼ (Allocates Surface Ha & Water Source)
    [ FEATURE 2: Crop Cycles & Phytosanitary ]
         │                               │
         │ (Pre-Harvest Interval DAR)     │ (Yield Projections)
         ▼                               ▼
    [ SAFETY LOCKOUT ENGINE ]     [ FEATURE 5: Weighbridge & Wholesale ]
         │ (Unlocks on DAR = 0)          ▲
         ▼                               │ (Produce Net Tonnage)
    [ FEATURE 3: Field Worker Pointage ]─┘
         │ (Piecework Crates Tally)
         ▼
    [ DAILY CASH PAYROLL ]

    [ FEATURE 4: Dairy Herd & Milking ] ──▶ [ Bulk Cooling Tank ] ──▶ [ Monthly ONIL 12 DA/L Dossier ]
         ▲
         │ (Antibiotic Withholding Lockout protects Bulk Tank)
    [ VETERINARY HEALTH CARD ]
```

---

# SELF-REVIEW: 10 WEAKEST POINTS & CORRECTIONS

1. **Weak Point 1**: *Risk of accidental harvest of chemically treated crops if internet is down.*
   * **Fix**: Built an offline-first DAR lock that runs 100% locally in JavaScript/browser IndexedDB using device hardware clock; does not require cloud ping to enforce safety lockout.
2. **Weak Point 2**: *Piecework tally could be forged by a rogue supervisor adding phantom crates.*
   * **Fix**: Mandatory end-of-day reconciliation: Total crates logged across workers must balance within $\pm 2\%$ of the weighbridge net produce weight.
3. **Weak Point 3**: *Cow ear tag typing errors during fast milking sessions.*
   * **Fix**: Large digit numpad with quick-select cards and RFID tag scanning support.
4. **Weak Point 4**: *ANRH water extraction quotas not accounting for rainfall.*
   * **Fix**: Added optional rainfall offset field that discounts natural rain precipitation from the borehole quota draw.
5. **Weak Point 5**: *Overly complicated UI for seasonal farm foremen who struggle with technology.*
   * **Fix**: Specialized "Muster Mode" with giant $48\text{px}$ touch targets, haptic feedback, audio confirmation beeps, and full Arabic RTL language support.
6. **Weak Point 6**: *Article 317 stamp duty calculation applying to non-cash sales.*
   * **Fix**: Hardcoded fiscal logic ensuring bank transfers, BaridiMob, and cheques explicitly produce $0\text{ DZD}$ stamp duty.
7. **Weak Point 7**: *Truck tare changing due to fuel consumption on long haul trips.*
   * **Fix**: Supported both "Pre-load Weighing" (Tare first, then Gross) and "Post-load Return Weighing" (Gross first, then Tare).
8. **Weak Point 8**: *Subsidized fertilizer (Urea 46% / DAP) tracking missing from cycle costs.*
   * **Fix**: Integrated warehouse FIFO/CMUP input stock issuance that deducts fertilizer bags directly into cycle cost accounts.
9. **Weak Point 9**: *Milk cooling tank failure spoiling 1,000+ liters undetected.*
   * **Fix**: Added mandatory temperature check field during session close ($+3.5^\circ\text{C}$ to $+4.0^\circ\text{C}$) with immediate amber warning if $> 6^\circ\text{C}$.
10. **Weak Point 10**: *Role switching without security allowing foremen to view financial profits.*
    * **Fix**: PIN-protected TopBar Role Switcher with hard screen-level routing isolation.

---

# BUILD ORDER (Thin Vertical Slices)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PHASED IMPLEMENTATION PLAN                                           │
├─────────┬──────────────────────────────────────────┬───────────────────────────────────────────────────┤
│ Phase   │ Scope & Components Delivered             │ Shipped Milestone & Verification                  │
├─────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ Slice 1 │ Role-Based UI Architecture & Data Model  │ TopBar role switcher (Gérant, Chef Culture,      │
│         │ (Store updates, PIN security, mock seed) │ Zootechnicien, Magasinier), TypeScript types.     │
├─────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ Slice 2 │ Dynamic Parcel Register & GIS Passport   │ AgricultureParcelsView, AgricultureParcelModal,   │
│         │ (Loi 10-03, Cadastre, ANRH water quota)  │ ParcelDrawerInspector, soil and water math tests. │
├─────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ Slice 3 │ Crop Cycles & Phytosanitary DAR Lockout  │ AgricultureCyclesView, AgriTreatmentModal,        │
│         │ (INPV product catalog, DAR timer)        │ chemical safety lockout tests.                    │
├─────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ Slice 4 │ Dairy Cattle & Milk Tank (ONIL 12 DA/L)  │ AgricultureLivestockView, BovinePassportDrawer,   │
│         │ (Herd census, milking sessions, dossier) │ OnilBordereauPrintModal, milk withholding logic.  │
├─────────┼──────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ Slice 5 │ Weighbridge Desk & Article 317 Cashier   │ AgricultureWholesaleView, WeighbridgeTicketModal, │
│         │ (Double pesée, Art. 317 timbre, print)   │ AgriWeighbridgePrintModal, full RTL & unit tests. │
└─────────┴──────────────────────────────────────────┴───────────────────────────────────────────────────┘
```

---

# DEFINITION OF DONE FOR CATEGORY AGRICULTURE

1. **Role-Based Isolation**: Every role can only access their authorized screens; switching to Gérant requires PIN verification.
2. **Zero-Pill Compliance**: All metadata is styled as clean unboxed text with typographic separators; no candy-colored static badges.
3. **Tri-lingual Parity**: 100% of labels, tooltips, modals, and printables translate cleanly between French, Arabic (with correct RTL flow), and English.
4. **Quadruple Traceability**: 100% of parcel, cycle, livestock, treatment, and weighbridge records contain `{ accountId, businessId, branchId, staffId }`.
5. **Algorithmic Accuracy**:
   - INPV DAR chemical safety lockout triggers and blocks harvest creation.
   - ONIL 12 DZD/L subsidy calculated with antibiotic milk withholding deductions.
   - Article 317 timbre fiscal graduated calculation strictly matches statutory brackets with 2,500 DZD cap.
6. **Compilation & Quality**:
   - `compile_applet` succeeds with 0 errors.
   - `lint_applet` passes (`tsc --noEmit`).
   - Pure calculation test suite (`npm test`) passes with 100% assertion coverage.
