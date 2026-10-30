# Production Implementation Specification: Category 15 — Construction, General Contracting & BTP (Algeria)

> **Platform**: Atrium ERP & CRM  
> **Vertical Category**: Construction, General Contracting & BTP (`contractor_btp` / Category 15)  
> **Target Market**: Algerian General Contractors (*Sociétés de Réalisation BTPH / Entreprises Générales de Bâtiment*) executing both state procurement tenders (*Marchés Publics*) under Décret 15-247 and private commercial/residential builds.  
> **Deployment Context**: Dual environment — Field staff on mobile Android/iOS smartphones over 3G/4G with offline tolerance; Office staff (Gérant, Métreur, Comptable) on high-density desktop workspaces.  
> **Tri-Lingual Commitment**: 100% native coverage across French (primary technical/administrative standard), Modern Standard Arabic with North African business terminology (official legal standard with full RTL mirroring), and English.  
> **Traceability Standard**: Quadruple Traceability enforced on every record: `{ account_id, business_id, branch_id, staff_id }`.

---

## Workspace Role-Based UI Architecture (RBAC)

To eliminate operational friction and adhere strictly to construction separation-of-concerns, Atrium BTP enforces **Role-Based UI Isolation**. Every role accesses **only** the screens, actions, and data relevant to their daily workflow.

### TopBar Role Switcher & Security Guard
A dedicated TopBar role switcher allows testing and operational handoff between the 5 personas, secured with PIN validation for executive privileges:
1. **Gérant / Direction Générale** (`gerant`): Executive oversight, contract approvals, bank cautions, financial treasury.
2. **Conducteur de Travaux** (`conducteur`): Multi-site operations, milestone Gantt, technical CTC liaison, subcontractor validation.
3. **Chef de Chantier** (`chef_chantier`): Field mobile cockpit, worker muster (*pointage*), daily site diary, ready-mix pour slips, equipment hours.
4. **Métreur / Chargé d'Études** (`metreur`): BOQ/DQE sub-lot studio, monthly contradictory attachments, price revision formulas.
5. **Comptable Chantier & RAF** (`comptable`): Décomptes Provisoires, CACOBATPH weather compensation dossiers, supplier 3-way match, site petty cash.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BTP ROLE-BASED SCREEN VISIBILITY MATRIX                             │
├───────────────────────────────────┬──────────┬────────────┬───────────────┬──────────┬────────────────┤
│ Screen / View Identifier          │ Gérant   │ Conducteur │ Chef Chantier │ Métreur  │ Comptable RAF  │
├───────────────────────────────────┼──────────┼────────────┼───────────────┼──────────┼────────────────┤
│ 1. contractor_gerant_dashboard    │   YES    │    ---     │      ---      │   ---    │      ---       │
│ 2. contractor_gerant_sites        │   YES    │    ---     │      ---      │   ---    │      ---       │
│ 3. contractor_gerant_os           │   YES    │    ---     │      ---      │   ---    │      ---       │
│ 4. contractor_gerant_treasury     │   YES    │    ---     │      ---      │   ---    │      ---       │
├───────────────────────────────────┼──────────┼────────────┼───────────────┼──────────┼────────────────┤
│ 5. contractor_cond_dashboard      │   ---    │    YES     │      ---      │   ---    │      ---       │
│ 6. contractor_cond_sites          │   ---    │    YES     │      ---      │   ---    │      ---       │
│ 7. contractor_cond_boq            │   ---    │    YES     │      ---      │   ---    │      ---       │
│ 8. contractor_cond_ctc            │   ---    │    YES     │      ---      │   ---    │      ---       │
│ 9. contractor_cond_subcontractors │   ---    │    YES     │      ---      │   ---    │      ---       │
├───────────────────────────────────┼──────────┼────────────┼───────────────┼──────────┼────────────────┤
│ 10. contractor_chef_dashboard     │   ---    │    ---     │      YES      │   ---    │      ---       │
│ 11. contractor_chef_pointage      │   ---    │    ---     │      YES      │   ---    │      ---       │
│ 12. contractor_chef_journal       │   ---    │    ---     │      YES      │   ---    │      ---       │
│ 13. contractor_chef_receipts      │   ---    │    ---     │      YES      │   ---    │      ---       │
│ 14. contractor_chef_equipment     │   ---    │    ---     │      YES      │   ---    │      ---       │
├───────────────────────────────────┼──────────┼────────────┼───────────────┼──────────┼────────────────┤
│ 15. contractor_metreur_dashboard  │   ---    │    ---     │      ---      │   YES    │      ---       │
│ 16. contractor_metreur_boq        │   ---    │    ---     │      ---      │   YES    │      ---       │
│ 17. contractor_metreur_attach     │   ---    │    ---     │      ---      │   YES    │      ---       │
│ 18. contractor_metreur_revisions  │   ---    │    ---     │      ---      │   YES    │      ---       │
├───────────────────────────────────┼──────────┼────────────┼───────────────┼──────────┼────────────────┤
│ 19. contractor_compta_dashboard   │   ---    │    ---     │      ---      │   ---    │      YES       │
│ 20. contractor_compta_decomptes   │   ---    │    ---     │      ---      │   ---    │      YES       │
│ 21. contractor_compta_cacobatph   │   ---    │    ---     │      ---      │   ---    │      YES       │
│ 22. contractor_compta_purchases   │   ---    │    ---     │      ---      │   ---    │      YES       │
│ 23. contractor_compta_caisse      │   ---    │    ---     │      ---      │   ---    │      YES       │
└───────────────────────────────────┴──────────┴────────────┴───────────────┴──────────┴────────────────┘
```

---

# Feature Specifications (Must-Have & Key Should-Have)

---

## Feature 1: Décret 15-247 Décompte Provisoire & Facturation Engine (MUST)

### 1. PURPOSE
Enables the **Comptable Chantier** and **Gérant** to calculate, generate, and track cumulative monthly progress billings (*Décomptes Provisoires*) strictly compliant with Algerian Public Procurement Law (*Décret Présidentiel 15-247*), eliminating rejected Trésor Public files and unlocking prompt payment mandates.

### 2. BUSINESS LOGIC
- **Cumulative Principle (Art. 93-94)**: Every décompte is strictly cumulative. 
  $$\text{Current Period Gross HT} = \text{Cumulative Gross Executed to Date HT} - \text{Cumulative Previously Certified Gross HT}$$
- **Retenue de Garantie (Art. 99)**:
  - Exactly **5.00%** deducted from Current Period Gross HT.
  - *Bank Caution Exemption*: If an authorized bank guarantee (*Caution Bancaire de substitution*) is registered with active validity, the cash withholding is 0 DZD.
- **Remboursement d'Avance (Art. 109-114)**:
  - If an *Avance Forfaitaire* (typically 15% of initial contract) was received, each monthly décompte deducts an amortization rate (default 15% or 20% of period gross) until the advance balance reaches exactly 0 DZD.
- **Pénalités de Retard (Art. 116)**:
  - Daily penalty: $\text{Contract Amount HT} / 1000$ per day of unjustified delay.
  - **Statutory Ceiling**: Total accumulated penalties can **never exceed 10.00%** of total contract value. Any excess is legally uncollectible.
- **TVA Application**:
  - Commercial / Civil Infrastructure / General BTP: **19.00%**.
  - Social Housing (AADL, LPP, Logements Sociaux): **9.00%** [VERIFY eligibility decree].
  - Calculation base: Calculated on Net HT or Gross HT as stipulated by contract specifications (*Cahier des Charges*); default is Gross HT.
- **State Machine**:
  ```
  [Brouillon] ──(Soumettre Contradictoire)──> [En Attente Visa BET]
       │                                              │
       │ (Rejet/Ajustement)                           │ (Visa Favorable BET)
       v                                              v
  [Brouillon Rejeté] <────────────────────── [En Attente Visa Maître d'Ouvrage]
                                                      │
                                                      │ (Signature & Mandatement)
                                                      v
                                             [Mandaté Trésor Public]
                                                      │
                                                      │ (Virement Banque BNA/CPA)
                                                      v
                                                   [Encaissé]
  ```
- **Permissions**:
  - Create/Edit Draft: `comptable`, `metreur`
  - Submit to Client: `gerant`, `comptable`
  - Record Bank Caution Substitution: `gerant` (requires official bank guarantee reference)
  - Mark Encaissé (Payment Received): `comptable`, `gerant`
- **Worked Numeric Example**:
  - Contract: Construction of 60 Public Housing Units in Blida (*Marché N° 2026/04*).
  - Total Contract Amount HT: 150,000,000 DZD.
  - Initial Avance Forfaitaire (15%): 22,500,000 DZD.
  - Previous Cumulative Certified Work (Décomptes 1 to 3): 45,000,000 DZD.
  - New Month Cumulative Attachement (Décompte 4): 65,000,000 DZD.
  - Calculations:
    1. *Gross Period Work HT*: $65,000,000 - 45,000,000 = 20,000,000\text{ DZD}$.
    2. *Retenue de Garantie (5%)*: $20,000,000 \times 0.05 = 1,000,000\text{ DZD}$ (No bank caution registered).
    3. *Avance Forfaitaire Amortization (15%)*: $20,000,000 \times 0.15 = 3,000,000\text{ DZD}$.
    4. *Delay Penalties*: 0 days late = 0 DZD.
    5. *Net Period Work HT*: $20,000,000 - 1,000,000 - 3,000,000 = 16,000,000\text{ DZD}$.
    6. *TVA (9% Social Housing)*: $20,000,000 \times 0.09 = 1,800,000\text{ DZD}$.
    7. *Montant Net à Mandater (Total TTC à Payer)*: $16,000,000 + 1,800,000 = \mathbf{17,800,000\text{ DZD}}$.

### 3. DATA MODEL
```typescript
export type DecompteStatus = 'draft' | 'submitted_bet' | 'approved_client' | 'mandated' | 'paid';

export interface BtpDecompteProvisoire {
  id: string;
  account_id: string;
  business_id: string;
  branch_id: string;
  staff_id: string;
  
  site_id: string;
  decompte_number: number; // e.g. 4 for Décompte N° 4
  period_start_date: string;
  period_end_date: string;
  submission_date: string;
  
  // Amounts (DZD)
  cumulative_previous_gross_ht_dzd: number;
  current_period_gross_ht_dzd: number;
  cumulative_gross_ht_dzd: number;
  
  // Deductions
  retention_guarantee_percent: number; // Default 5.0
  retention_guarantee_dzd: number;
  has_bank_caution_replacement: boolean;
  bank_caution_reference?: string;
  bank_caution_issuer?: string; // e.g. 'BNA', 'BEA', 'CPA'
  
  advance_amortization_rate_percent: number; // e.g. 15.0
  advance_amortization_dzd: number;
  remaining_advance_balance_dzd: number;
  
  delay_penalties_days: number;
  delay_penalties_dzd: number;
  is_delay_penalty_capped: boolean;
  
  net_ht_dzd: number;
  vat_rate_percent: number; // 19 or 9
  vat_amount_dzd: number;
  net_payable_ttc_dzd: number;
  
  status: DecompteStatus;
  tresor_mandat_number?: string;
  payment_receipt_date?: string;
  created_at: string;
  updated_at: string;
}
```
- Relationships: Foreign key to `BtpSiteProject (site_id)`, audited by `staff_id`.
- Queries: `SELECT * FROM btp_decomptes WHERE site_id = ? ORDER BY decompte_number DESC`.

### 4. CODE ARCHITECTURE
- Files:
  - Model & Logic: `/src/utils/contractorRules.ts` (contains `calculateDecompteProvisoire`, `calculateDelayPenalties`)
  - Screen View: `/src/components/screens/contractor/ContractorBillingView.tsx`
  - Modal: `/src/components/screens/contractor/ContractorDecompteModal.tsx`
- State: Managed in Zustand store (`useAtriumStore`) with persistence to localStorage and Supabase `btp_decomptes` table.
- Offline behavior: Draft décomptes are editable locally; submission locks records until server sync.

### 5. UX FLOW & DELIGHT
- **Flow**: From `ContractorBillingView`, clicking `"Nouveau Décompte"` auto-fetches the previous cumulative certified total, pre-populates unbilled completed attachments from the DQE, and runs all statutory deductions with instant tabular summary.
- **Print Consideration**: 1-click legal printout formatted to official Algerian Trésor Public standards (*Bordereau de Décompte Provisoire CCAG*) with legal French and Arabic header, signature blocks for Entrepreneur, Ingénieur BET, and Maître d'Ouvrage.
- **Delight Feature**: **Interactive Delay Penalty Radar & Bank Caution Shield**. Shows exactly how much cash was liberated by the bank guarantee and dynamically flags any risk of approaching the 10% statutory penalty ceiling.

---

## Feature 2: DQE (Détail Quantitatif et Estimatif) & Sub-Lot BPU Studio (MUST)

### 1. PURPOSE
Enables the **Métreur** and **Conducteur de Travaux** to import, track, and measure project sub-lots (*Gros-Œuvre, Maçonnerie, Électricité, Plomberie, Revêtements*) against agreed unit prices and contractual quantities, preventing unapproved volume overruns.

### 2. BUSINESS LOGIC
- **Item Hierarchy**: 
  - `Lot` (e.g. Lot 01: Terrassments, Lot 02: Gros-Œuvre, Lot 03: VRD)
  - `Sous-Détail / Article` (e.g. 02.04: Béton armé pour poteaux et poutres dosé à 350 kg/m³)
- **Metrics**:
  - $\text{Montant Prévu HT} = \text{Quantité Marché} \times \text{Prix Unitaire BPU}$
  - $\text{Montant Réalisé HT} = \text{Quantité Exécutée} \times \text{Prix Unitaire BPU}$
  - $\text{Taux d'Avancement Physique (\%)} = (\text{Quantité Exécutée} / \text{Quantité Marché}) \times 100$
- **Variance Warning Threshold**:
  - When $\text{Quantité Exécutée} > \text{Quantité Marché}$, the system automatically highlights the row in amber (if within 10% contractual tolerance) or red (if $>10\%$, requiring an official *Avenant* before certification).
- **Permissions**:
  - Upload/Modify Initial BPU: `metreur`, `gerant` (locked after site commencement)
  - Update Executed Quantities: `metreur`, `conducteur`
  - Create Avenant (Amendments): `gerant`

### 3. DATA MODEL
```typescript
export interface BtpBoqItem {
  id: string;
  account_id: string;
  business_id: string;
  branch_id: string;
  staff_id: string;
  
  site_id: string;
  lot_code: string; // e.g. '01', '02'
  lot_name: string; // e.g. 'Gros Œuvre & Fondations'
  item_code: string; // e.g. '02.03'
  description_fr: string;
  description_ar: string;
  unit: 'M3' | 'M2' | 'ML' | 'KG' | 'TON' | 'U' | 'ENS';
  contract_quantity: number;
  unit_price_dzd: number;
  total_contract_amount_ht_dzd: number;
  
  executed_quantity_to_date: number;
  executed_amount_ht_dzd: number;
  completion_percent: number;
  
  has_overrun: boolean;
  avenant_id?: string;
  created_at: string;
}
```

### 4. CODE ARCHITECTURE
- Files:
  - View: `/src/components/screens/contractor/ContractorBoqView.tsx`
  - Component: `/src/components/ui/collection/UniversalDataCollection.tsx` (using dense tabular spreadsheet view)
- Microcopy:
  - FR: *"Articles du Marché", "Avancement Physique", "Quantité Prévue", "Prix Unitaire"*
  - AR: *"بنود الصفقة", "نسبة الإنجاز الفعلي", "الكمية المبرمجة", "سعر الوحدة"*
  - EN: *"Contract Items", "Physical Progress", "Planned Qty", "Unit Price"*

---

## Feature 3: Mobile Field Pointage & Digital Site Diary (MUST)

### 1. PURPOSE
Enables the **Chef de Chantier** on-site via smartphone to record daily worker attendance by trade (*Pointage journalier*), log bad-weather stoppages with meteorological conditions, and track equipment hours, eradicating phantom payroll and securing proof for contractual claims.

### 2. BUSINESS LOGIC
- **Muster Timing**: Morning muster opened at 06:45; midday muster at 12:45.
- **Worker Categorization**:
  - Salaried (*Permanent Entreprise* - declared CNAS)
  - Trade Subcontractor (*Tâcheron / Sous-traitant*)
  - Daily Worker (*Journalier de Chantier*)
- **Weather Stoppage Rules**:
  - Weather types: `Sunny`, `Rain`, `HeavyRain`, `SandStorm`, `ExtremeHeat` ($\ge 44^\circ\text{C}$), `Frost`.
  - Stoppage Hours: If stoppage $\ge 4.0\text{ hours}$ and backed by an *ONM Bulletin*, the system auto-tags the day as `CACOBATPH_ELIGIBLE`.
- **Permissions**:
  - Create/Submit Site Log: `chef_chantier`
  - Validate / Sign Off: `conducteur`

### 3. DATA MODEL
```typescript
export interface BtpDailyLog {
  id: string;
  account_id: string;
  business_id: string;
  branch_id: string;
  staff_id: string;
  
  site_id: string;
  log_date: string;
  weather_condition: 'Sunny' | 'Rain' | 'HeavyRain' | 'SandStorm' | 'ExtremeHeat' | 'Frost';
  temperature_celsius: number;
  work_stoppage_hours: number;
  cacobatph_eligible: boolean;
  onm_bulletin_reference?: string;
  
  headcount_masons: number;
  headcount_carpenters: number;
  headcount_ironworkers: number;
  headcount_laborers: number;
  headcount_operators: number;
  total_workers_present: number;
  
  tasks_executed_summary: string;
  incidents_or_delays: string;
  visitors: string; // e.g. 'Contrôleur CTC M. Boualem, Ingénieur BET'
  supervisor_signature_name: string;
  status: 'draft' | 'submitted' | 'approved_conducteur';
  created_at: string;
}
```

### 4. UX FLOW & DELIGHT
- **Mobile Tap-to-Muster**: The Chef de Chantier taps quick counter steppers for each trade category in $<30\text{ seconds}$ without typing.
- **Delight Feature**: **1-Click WhatsApp Site Summary Generator**. Generates a clean French/Arabic summary with weather, headcount, and progress formatted for instant dispatch to the Gérant's executive group chat.

---

## Feature 4: Legal Administrative Order (Ordres de Service - OS) Tracker (MUST)

### 1. PURPOSE
Enables the **Gérant** and **Conducteur de Travaux** to register, monitor, and enforce legal *Ordres de Service* (OS de commencement, arrêt, reprise, travaux supplémentaires), mathematically locking the legal contract clock against unjustified liquidated delay penalties.

### 2. BUSINESS LOGIC
- **Types of OS**:
  - `OS_COMMENCEMENT`: Triggers initial contractual duration (e.g. 18 months).
  - `OS_ARRET`: Freezes contractual delay counter. Days spent under OS d'Arrêt **do not consume contractual time**.
  - `OS_REPRISE`: Unfreezes the clock; shifts the statutory contractual completion date by the exact number of suspended days.
  - `OS_TRAVAUX_SUP`: Extends contractual duration if approved with additional delay allocation.
- **Contractual Calculation Formula**:
  $$\text{Revised Completion Date} = \text{Initial Contract End Date} + \sum \text{Suspension Days (OS d'Arrêt à OS de Reprise)} + \text{Approved Extension Days}$$

### 3. DATA MODEL
```typescript
export type OsType = 'OS_COMMENCEMENT' | 'OS_ARRET' | 'OS_REPRISE' | 'OS_MODIF_TECH' | 'OS_TRAVAUX_SUP';

export interface BtpAdministrativeOrder {
  id: string;
  account_id: string;
  business_id: string;
  branch_id: string;
  staff_id: string;
  
  site_id: string;
  os_number: string; // e.g. 'OS N° 03/2026'
  os_type: OsType;
  issue_date: string;
  notification_date: string;
  effective_date: string;
  reason: string;
  contractual_days_impact: number; // Positive for extension, 0 for regular
  document_pdf_path?: string;
  is_signed_with_reserves: boolean;
  reserves_text?: string;
  created_at: string;
}
```

---

## Feature 5: Concrete Quality & CTC Crushing Vault (MUST)

### 1. PURPOSE
Enables the **Conducteur de Travaux** and **Chef de Chantier** to record ready-mix pour slips (*BPE*), track cylinder/cube specimen batches, and log laboratory compression test breaks at 7 and 28 days pursuant to Algerian standard CBA 93 / Eurocode 2, locking formwork removal (*décoffrage*) if structural strength is unverified.

### 2. BUSINESS LOGIC
- **Target Strengths ($f_{c28}$)**:
  - B20 (Gros béton / Fondations légères): $20\text{ MPa}$
  - B25 (Béton armé standard poteaux/poutres/dalles): $25\text{ MPa}$
  - B30 (Ouvrages d'art / Éléments précontraints): $30\text{ MPa}$
- **7-Day Threshold Rule**:
  - Compressive strength at 7 days must reach $\ge 70\%$ of target $f_{c28}$ (e.g. $\ge 17.5\text{ MPa}$ for B25).
  - If $<70\%$: Triggers `WARNING` — maintenance of shoring required (*maintien des étais*).
  - If $<60\%$: Triggers `CRITICAL_LOCK` — formwork stripping prohibited, immediate notification to CTC.
- **28-Day Acceptance Rule**:
  - Must reach $\ge 100\%$ of target $f_{c28}$. If compliant, generates the official CTC Compliance Dossier sheet.

### 3. DATA MODEL
```typescript
export interface BtpConcretePour {
  id: string;
  account_id: string;
  business_id: string;
  branch_id: string;
  staff_id: string;
  
  site_id: string;
  pour_date: string;
  structural_element: string; // e.g. 'Poteaux R+2 Bloc B'
  concrete_grade: 'B20' | 'B25' | 'B30' | 'B35';
  supplier_batching_plant: string;
  delivery_slip_number: string;
  volume_poured_m3: number;
  slump_cone_cm: number; // Affaissement au cône d'Abrams (e.g. 7 cm)
  specimens_cast_count: number; // Standard 6 specimens (3 for 7d, 3 for 28d)
  
  // 7-day test
  test_7d_date?: string;
  strength_7d_mpa?: number;
  status_7d: 'PENDING' | 'CONFORMING' | 'WARNING' | 'CRITICAL_FAIL';
  
  // 28-day test
  test_28d_date?: string;
  strength_28d_mpa?: number;
  status_28d: 'PENDING' | 'CONFORMING' | 'CRITICAL_FAIL';
  
  ctc_visa_reference?: string;
  created_at: string;
}
```

---

## Feature 6: Heavy Machinery Fleet & Gasoil Consumption Tracker (SHOULD)

### 1. PURPOSE
Enables the **Magasinier** and **Chef de Chantier** to track equipment operating hours and correlate them against fuel deliveries, flagging abnormal liters-per-hour consumption to stop diesel siphoning and theft.

### 2. BUSINESS LOGIC
- **Theoretical Consumption Baselines**:
  - Tower Crane (*Grue à tour*): $12 - 18\text{ kWh/day}$ (or diesel generator equivalent)
  - Hydraulic Excavator (*Pelle 20T*): $14 - 20\text{ Liters/Hour}$
  - Backhoe Loader (*Rétrochargeuse 4CX*): $7 - 10\text{ Liters/Hour}$
  - Dump Truck (*Camion benne 15T*): $25 - 35\text{ Liters/100 km}$
- **Anomaly Detection**: If $\text{Actual Consumption} > 1.25 \times \text{Theoretical Threshold}$, the system flags an immediate fuel shrinkage alert (*Alerte Surconsommation / Suspicion de coulage*).

---

## Feature 7: CACOBATPH 48h Bad-Weather Dossier Wizard (SHOULD)

### 1. PURPOSE
Enables the **Comptable Chantier** to bundle recorded bad-weather stoppages from the site diary, cross-reference them with official ONM meteorological bulletin numbers, and generate the statutory CACOBATPH compensation claim within the non-negotiable **48-hour** legal window.

### 2. BUSINESS LOGIC
- **Filing Window**: Countdown timer starts at stoppage start time; displays remaining hours/minutes until 48h deadline expires.
- **Dossier Bundle**: Worker list (Full Name, N° Sécurité Sociale, Trade), Stoppage Hours, Site Location Wilaya, and ONM Certificate Reference.

---

## Feature 8: Subcontractor Attachement & Piecework Ledger (SHOULD)

### 1. PURPOSE
Enables the **Conducteur de Travaux** to certify physical work completed by specialized trade subcontractors (*tâcherons et sous-traitants*), track contractual 5% retainage, and issue validated payment mandates to accounting.

---

## Feature 9: Site Petty Cash (*Caisse de Chantier*) & Art. 317 Timbre Duty (SHOULD)

### 1. PURPOSE
Enables the **Chef de Chantier** and **Comptable** to manage local site cash disbursements (emergency hardware, sand quarry payments, local guard fees) with automated graduated fiscal stamp tax (*Article 317*) and voucher archiving.

---

# Systematic Edge Cases & Failure Handling (Across all 9 Categories)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEMATIC FAILURE MODE & EDGE CASE MATRIX                                │
├──────────────────────────┬─────────────────────────────────────┬───────────────────────────────────────┤
│ Failure Category         │ Specific Concrete Trigger Condition │ System Behavior & User Feedback       │
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 1. Invalid / Missing     │ Negative volume in DQE or zero unit │ Rejects submission; highlights red;   │
│    Input & Boundaries    │ price on public contract item       │ "Erreur: Le prix unitaire doit être >0│
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 2. Concurrency           │ Two users edit same Décompte or log │ Optimistic lock with version token;   │
│                          │ simultaneously on web and mobile    │ "Enregistrement modifié par un tiers" │
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 3. Time & Drift          │ Pointage muster submitted with      │ Compares with server NTP timestamp;   │
│                          │ tampered local device clock         │ uses server time for legal audit trail│
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 4. Money & Rounding      │ Cumulative millimeter or DZD centime│ Rounds to integer DZD at line item    │
│                          │ rounding errors over 12 months      │ level; ensures Sum(Lines) == Total DZD│
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 5. Permissions Shift     │ Worker downgraded from Conducteur to│ Revokes active write token; displays  │
│                          │ Chef mid-session during BOQ edit    │ "Droits modifiés. Mode lecture seule" │
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 6. Connectivity          │ Remote site loss of 4G for 5 days   │ Local IndexedDB queue; auto-retries   │
│                          │ during daily muster and pour logs   │ with exponential backoff on reconnect │
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 7. Data Integrity        │ Attempt to delete site project with │ Hard foreign key block: "Suppression  │
│                          │ existing certified décomptes or logs│ impossible: Décomptes légaux associés"│
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 8. Legal & Privacy       │ ANPDP compliance: Worker requests   │ Anonymizes worker personal identity   │
│                          │ erasure of national ID              │ while retaining anonymous site hours  │
├──────────────────────────┼─────────────────────────────────────┼───────────────────────────────────────┤
│ 9. Human Error           │ Concrete pour logged under wrong    │ Requires Conducteur approval with     │
│                          │ building block or wrong date        │ formal audit rectification note       │
└──────────────────────────┴─────────────────────────────────────┴───────────────────────────────────────┘
```

---

# Acceptance Criteria & Comprehensive Test Suite

### 1. Décompte Provisoire Engine Test Suite (`contractorRules.test.ts`)
```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  calculateDecompteProvisoire, 
  calculateDelayPenalties, 
  validateConcreteStrength,
  validateCacobatphWeatherStoppage 
} from './contractorRules';

describe('BTP Algerian Rules & Regulations', () => {
  test('computes Décompte Provisoire with 5% Retenue and 15% Avance correctly', () => {
    const result = calculateDecompteProvisoire({
      grossAmountCurrentHtDzd: 20000000,
      cumulativePreviousGrossHtDzd: 45000000,
      retentionPercent: 5,
      hasBankCautionReplacement: false,
      advanceReimbursementRate: 0.15,
      vatRatePercent: 9,
    });
    
    assert.strictEqual(result.retentionGuaranteeDzd, 1000000);
    assert.strictEqual(result.advanceReimbursementDzd, 3000000);
    assert.strictEqual(result.netHtDzd, 16000000);
    assert.strictEqual(result.vatAmountDzd, 1800000);
    assert.strictEqual(result.netPayableDzd, 17800000);
  });

  test('waives 5% cash retention when valid Bank Caution is active', () => {
    const result = calculateDecompteProvisoire({
      grossAmountCurrentHtDzd: 10000000,
      cumulativePreviousGrossHtDzd: 0,
      retentionPercent: 5,
      hasBankCautionReplacement: true, // Caution BNA
    });
    assert.strictEqual(result.retentionGuaranteeDzd, 0);
  });

  test('strictly caps delay penalties at 10% statutory ceiling (Art. 116)', () => {
    const contractAmount = 50000000; // 50M DZD
    const daysLate = 120; // Massive delay
    const penalties = calculateDelayPenalties(contractAmount, daysLate);
    
    // Theoretical = (50,000,000 / 1000) * 120 = 6,000,000 DZD (12%)
    // Capped at 10% = 5,000,000 DZD
    assert.strictEqual(penalties.isCapped, true);
    assert.strictEqual(penalties.cappedPenaltiesDzd, 5000000);
  });

  test('enforces concrete 7-day de-shoring block if strength is below 70%', () => {
    const testResult = validateConcreteStrength(14.0, 25.0, 7); // 14 MPa on B25 (56%)
    assert.strictEqual(testResult.isConforming, false);
    assert.strictEqual(testResult.alertLevel, 'CRITICAL');
  });

  test('validates CACOBATPH weather compensation eligibility (>=4 hours + ONM)', () => {
    const eligible = validateCacobatphWeatherStoppage(5, 'HeavyRain', 14, true);
    assert.strictEqual(eligible.isEligibleForCacobatph, true);

    const missingBulletin = validateCacobatphWeatherStoppage(5, 'HeavyRain', 14, false);
    assert.strictEqual(missingBulletin.isEligibleForCacobatph, false);
  });
});
```

---

# Cross-Feature Checks & Shared Architecture

1. **Integration with Core Financial Engine**:
   - The *Décomptes Provisoires* flow seamlessly into Atrium's central general ledger and accounts receivable radar, recording Trésor Public receivables and bank caution contingent liabilities.
2. **Integration with Project Documents & PDF Generation**:
   - Uses Atrium's standard high-fidelity print modal system for SFP-01 postal slips, Décomptes, and CACOBATPH dossiers.
3. **Integration with Notification Center**:
   - Alerts from CTC crushing test failures and Bank Caution 30-day expirations feed directly into the TopBar notification bell with unread counters and high-priority action badges.

---

# Self-Review: 10 Weakest Points in Spec & Engineering Fixes

| # | Potential Weak Point | Engineering Fix & Resolution in Spec |
|---|---|---|
| 1 | Mobile offline conflict if two foremen edit pointage on the same site. | Enforces strict master assignment: each site has exactly 1 primary Chef de Chantier. Secondary supervisors have read-only view. |
| 2 | High inflation in cement and steel prices distorting fixed-price contracts. | Integrated the official ministerial parametric formula (*Révision des Prix*) into the Métreur studio. |
| 3 | Bank Caution validity dates drifting past delayed project completion. | Added an automated 60d/30d/15d expiry countdown that reverts to cash retention if not renewed. |
| 4 | Delay penalties exceeding legal limits in manual calculations. | Hard-coded the statutory 10% cap with mathematical bounds in `contractorRules.ts`. |
| 5 | CACOBATPH claims rejected for missing ONM weather certificates. | Blocked dossier generation until an official ONM bulletin reference number is entered. |
| 6 | Premature formwork stripping causing concrete structural cracks. | Implemented automated 7-day strength lockouts with red alert banners for the Conducteur de Travaux. |
| 7 | Diesel theft disguised as high machine idling. | Correlated machine hour-meters with fuel delivery receipts, flagging any burn rate $>1.25\times$ baseline. |
| 8 | Complex public procurement terminology confusing private developers. | Made terminology adaptive: toggles between Public (*Marchés Publics / Décomptes*) and Private (*Situations de Travaux*). |
| 9 | Unreliable 3G/4G coverage in southern oilfield or desert road projects. | Engineered 100% offline-first IndexedDB persistence with automatic delta sync. |
| 10 | Loss of 10-year décennale documentation. | Built a permanent digital compliance vault for all batch pour slips, crushing tests, and CTC approvals. |

---

# Phased Build Order (Thin Vertical Slice Architecture)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PHASED ENGINEERING BUILD ORDER                                       │
├─────────┬──────────────────────────────────────┬───────────────────────────────────────────────────────┤
│ Slice   │ Focus Module                         │ Deliverable & Verification Scope                      │
├─────────┼──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Slice 1 │ Role-Based UI & Navigation Dock      │ 5 Personas in TopBar; role-filtered sidebars; RBAC    │
│ Slice 2 │ Décomptes Provisoires & Cautions     │ Full Décret 15-247 engine; 5% Retenue; Legal printouts│
│ Slice 3 │ DQE & BPU Sub-Lot Studio             │ Hierarchical BOQ; progress tracking; overrun warnings │
│ Slice 4 │ Mobile Pointage & Site Diary         │ Offline muster; weather logs; ONM/CACOBATPH dossier   │
│ Slice 5 │ Concrete Quality & CTC Vault         │ 7d/28d compression logs; de-shoring lockout rules     │
│ Slice 6 │ Fleet & Site Petty Cash              │ Gasoil tracking; Art. 317 Timbre fiscal cash box      │
└─────────┴──────────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

# Definition of Done (DoD) for Category 15

1. **Role-Based Isolation**: Every role sees only their authorized screens; switching roles updates the sidebar navigation instantaneously.
2. **Tri-Lingual Parity**: 100% of labels, tooltips, buttons, modals, and legal printouts render flawlessly in French, Modern Standard Arabic (RTL), and English.
3. **Regulatory Precision**: Décret 15-247 formulas, 5% Retenue de Garantie, 10% penalty caps, CACOBATPH intempéries rules, and Article 317 timbre fiscal verified by unit tests.
4. **Quadruple Traceability**: All BTP records carry `{ account_id, business_id, branch_id, staff_id }`.
5. **No Dead Buttons**: Every action button, modal trigger, tab filter, and export button is backed by a working event handler.
6. **Code Quality**: Strict TypeScript passing (`npm run lint`), successful compilation (`compile_applet`), and all unit tests green.
