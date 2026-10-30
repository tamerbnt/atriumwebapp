# Master Implementation Specification: Legal Cabinet, Notary Study & Accounting Firm in Algeria (Atrium OS)

This document establishes the exhaustive production engineering and UX architecture for Category **Legal Cabinet, Notary Study & Accounting Firm** in Algeria (`legal_cabinet_notary_accounting`). 

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Strict Role-Based UI Separation (RBAC)**:
> In accordance with user requirements and strict professional ethics (Loi 13-07 Art. 10, Loi 06-02 Art. 21, and Loi 10-01 Art. 24), this vertical enforces **total UI separation between roles**. No persona can access or view another profession's confidential operational workspace. 
> 
> Navigation is strictly partitioned across 4 distinct workspaces:
> 1. **Avocat / Litigator Workspace** (`avocat_associe`): Focused strictly on contentious matters (*Contentieux*), court hearings (*Rôle d'audience*), statutory CPCA appeals, and client retainers. Cannot view the Notary Deed Register or Company Audits.
> 2. **Notaire / Study Workspace** (`notaire_titulaire`): Focused strictly on the official register (*Répertoire des actes*), client escrow accounts (*Comptes de séquestre*), cadastral conveyance stages, and Décret 08-243 tariffs. Cannot access litigation files.
> 3. **Expert-Comptable / Audit Workspace** (`expert_comptable`): Focused on the SCF double-entry general ledger, monthly G50 tele-declarations, balance sheets (*Bilan/TCR*), and audit working papers.
> 4. **Secrétaire & Caisse Hub** (`secretaire_caisse`): The shared front-desk cockpit managing client intake, physical mail/bailiff receipts, cash payments with Article 317 stamp duties, and daily cash drawer closure. Cannot edit deeds or post general ledger journals.
> 
> Switcher: Controlled via the top navigation bar with quick PIN authentication.

---

## 0. Design System & Algerian Platform Tokens

All screens strictly adhere to Atrium's desktop-first design tokens:
- **Brand Terracotta Accent**: `#C4785A` (`var(--color-accent)`), hover `#B3684A`, light `#FDF4F0`.
- **Canvas & Surface Posture**: `#E8ECEF` outer window canvas, `#F8F9FA` elevated pod tray container, `#FFFFFF` card/stage background. Single-elevation depth (no nested cards inside cards).
- **Dark Obsidian Dock & Anchors**: `#1F1D1B` / `#18181B` for dark status banners and sidebar dock.
- **Form System**: Kinetic notched `LabelInput` (with floating notch label) and `LabelSelect` (notched select with search for $\ge 6$ options).
- **Collection Pattern**: `UniversalDataCollection<T>` with dual List/Grid toggle, `Seek` expanding search lens, segmented filter capsules, and 390px sliding inspector drawer.
- **Typography**: Display headlines in `Plus Jakarta Sans`, body text in `Public Sans` / `Inter`, Arabic RTL in `Cairo`, data telemetry/timestamps/money strictly in `font-mono tabular-nums`.
- **Zero-Pill Discipline**: Informational metadata (dates, reference numbers, chamber names) rendered as clean, unboxed text separated by `·` or `/`. No candy badge sandwiches.
- **Language Architecture**: 100% tri-lingual parity (French `fr`, Modern Standard Arabic `ar` with native RTL layout, and English `en`).

---

## 1. Feature 1 (MUST): Automated CPCA Procedural Deadline Engine

### 1. PURPOSE
Provides practicing attorneys with a zero-fault statutory countdown engine that calculates exact appeal, opposition, and cassation expiry dates under the Algerian Code of Civil and Administrative Procedure (CPCA - Loi n° 08-09), preventing catastrophic malpractice liability and disbarment.

### 2. BUSINESS LOGIC
- **Trigger**: Receipt of a judicial bailiff formal notification (*Procès-verbal de signification d'un jugement / arrêt*).
- **Statutory Rules & Formulas**:
  - *Base Appeal Delay (Appel civil/commercial/social - CPCA Art. 336)*: Exactly **30 calendar days**, starting the day *after* notification date ($T+1$).
  - *Opposition to Default Judgment (CPCA Art. 329)*: **10 calendar days**, starting $T+1$.
  - *Cassation Petition (Pourvoi en cassation - CPCA Art. 568)*: **2 months**, starting $T+1$.
  - *Urgent Summary Injunctions (Référé - CPCA Art. 305)*: **15 calendar days**.
  - *Distance Extensions (CPCA Art. 404)*:
    - Party domiciled in Southern Wilayas (Adrar, Tamanrasset, Illizi, Tindouf, Béchar, Ouargla, Djanet, In Salah, In Guezzam, Bordj Badji Mokhtar): **+15 calendar days**.
    - Party domiciled abroad (Europe, Americas, etc.): **+2 months** (60 calendar days).
  - *Weekend & Public Holiday Carryover (CPCA Art. 405)*:
    - If the terminal expiration day falls on a Friday (*Vendredi*), Saturday (*Samedi*), or an official Algerian statutory holiday (1er Janvier, 5 Juillet, 1er Novembre, 1er Mai, Aïd El Fitr, Aïd El Adha, Mawlid Ennabaoui, 1er Moharram, Achoura), the deadline is automatically extended to the first subsequent business day (*Dimanche*) at **16:30** (court registry closing time).
- **Worked Numeric Example**:
  - Notification Date: Thursday, April 9, 2026.
  - Step 1: Clock starts Friday, April 10, 2026 ($T+1$).
  - Step 2: Base 30 days ends on Saturday, May 9, 2026.
  - Step 3: May 9 is a Saturday (non-working judicial day under Algerian law).
  - Step 4: Art. 405 rule triggers $\rightarrow$ Deadline rolls over to **Sunday, May 10, 2026 at 16:30**.
  - Step 5: If client resides in Tamanrasset, +15 days added: May 10 + 15 days = Monday, May 25, 2026 at 16:30.
- **State Machine**:
  - States: `draft` $\rightarrow$ `running` $\rightarrow$ `approaching_warning` ($\le 5$ days) $\rightarrow$ `critical_alert` ($\le 48$ hours) $\rightarrow$ `filed_satisfied` OR `expired_forfeited`.
  - Transitions:
    - `running` $\rightarrow$ `filed_satisfied`: Triggered by Avocat or Collaborateur entering the court registry receipt number (*Numéro de dépôt de la requête d'appel au greffe*).
    - `running` $\rightarrow$ `expired_forfeited`: Automatic system transition if terminal deadline passes without a filed receipt number.
- **Permissions**:
  - View: `avocat_associe`, `avocate_collaboratrice`.
  - Create/Edit: `avocat_associe`, `avocate_collaboratrice`.
  - Delete/Archive: Only `avocat_associe` with written confirmation.
  - Locked out: `notaire_titulaire`, `expert_comptable`, `secretaire_caisse`.

### 3. DATA MODEL
```typescript
export type CPCARecourseType = 
  | 'appel_civil' 
  | 'appel_commercial' 
  | 'appel_social' 
  | 'opposition' 
  | 'pourvoi_cassation' 
  | 'appel_refere';

export type CPCADeadlineStatus = 
  | 'running' 
  | 'approaching' // <= 5 days
  | 'critical'    // <= 48 hours
  | 'filed'       // Appeal lodged at Greffe
  | 'forfeited';   // Expired without filing

export interface CPCADeadline {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  matterId: string;               // Foreign Key -> LegalMatter
  caseNumber: string;             // Court case reference (e.g. 26/01482)
  courtJurisdiction: string;      // e.g. Tribunal de Sidi M'Hamed / Cour d'Alger
  chamber: string;                // e.g. Chambre Commerciale / Section Sociale
  recourseType: CPCARecourseType;
  notificationDate: string;       // ISO date (PV de signification)
  bailiffName: string;            // Huissier de justice instrumentaire
  domicileCategory: 'local' | 'grand_sud' | 'abroad';
  statutoryBaseDays: number;      // e.g. 30
  distanceExtensionDays: number;  // 0, 15, or 60
  holidayCarryoverDays: number;   // Calculated dynamically
  terminalExpiryDate: string;     // ISO timestamp strictly factoring Art. 405
  status: CPCADeadlineStatus;
  appealFilingReceipt?: {
    filingDate: string;
    greffeRegistrationNumber: string;
    greffierName: string;
    receiptScanUrl?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `/src/components/screens/legal/LegalHearingsView.tsx` (extended with CPCA Deadline Radar).
- **Pure Function**: `/src/utils/legalRules.ts` $\rightarrow$ `calculateCPCADeadline(notificationDate, recourseType, domicileCategory)`.
- **State Storage**: Zustand store (`useAtriumStore`) with offline sync to Supabase table `legal_cpca_deadlines`.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: Click `+ Nouveau PV de Signification` $\rightarrow$ Select Case from Seek autocomplete $\rightarrow$ Pick Notification Date $\rightarrow$ Select Recourse Type $\rightarrow$ Click "Calculer et Armer le Délai". 3 clicks.
- **Screen States**:
  - Empty: "Aucun délai de recours en cours. Vos dossiers sont à jour."
  - Critical ($\le 48$h): Amber pulsing border, dark espresso warning tile, and SMS dispatch trigger.
- **Microcopy**:
  - FR: *"Délai d'appel légal (Art. 336 CPCA) - Expiration le Dimanche 10 Mai 2026 à 16:30 (Prorogé selon Art. 405)"*
  - AR: *"أجل الاستئناف القانوني (المادة 336 ق.إ.م.إ) - ينتهي الأحد 10 ماي 2026 على 16:30 (ممدد طبقاً للمادة 405)"*
- **Delight**: Dynamic Algerian Court Registry Countdown Clock: counts down in hours, minutes, and seconds relative to **16:30** of the final court day.

### 6. EDGE CASES & FAILURE MODES (9 Categories)
1. *Invalid Input*: Notification date set in the future. Blocked immediately with warning: *"La date de signification ne peut être postérieure à la date d'aujourd'hui"*.
2. *Concurrency*: Two lawyers edit the filing receipt simultaneously. Optimistic locking with last-write-wins on receipt metadata, but status transition to `filed` is idempotent.
3. *Time / Timezone*: User device traveling to France (UTC+2 vs DZ UTC+1). The deadline calculation strictly locks calculations to `Africa/Algiers` (UTC+1).
4. *Money*: N/A (procedural calculation).
5. *Permissions*: A notary clerk tries to view the litigation deadline radar. Screen redirects to unauthorized 403 screen.
6. *Connectivity*: App is offline when bailiff arrives. Calculation runs 100% locally in browser memory and syncs when reconnected.
7. *Data Integrity*: Case deleted while having an active running deadline. Cascading delete is strictly prohibited; the matter cannot be deleted until deadlines are archived.
8. *Legal/Privacy*: Full immutable audit log of who created and modified the deadline date.
9. *Human Error*: Lawyer selected "Local" instead of "Grand Sud". Clicking "Modifier la Wilaya de Domicile" recalculates the deadline and logs the reason.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Notification served on a Wednesday before Eid El Fitr.
  - *Given* a 30-day appeal notification on April 1, 2026,
  - *When* the 30th day falls on Friday, May 1 (Labor Day) and Saturday is May 2,
  - *Then* the system must set the terminal date to Sunday, May 3, 2026 at 16:30.
- **Unit Tests**:
  - `calculateCPCADeadline('2026-04-09', 'appel_civil', 'local')` $\rightarrow$ Expiry: `2026-05-10T16:30:00+01:00`.
  - `calculateCPCADeadline('2026-04-09', 'appel_civil', 'grand_sud')` $\rightarrow$ Expiry: `2026-05-25T16:30:00+01:00`.

### 8. RISKS & OPEN QUESTIONS
- *[VERIFY]*: Verify whether the local Cour d'Appel in specific southern wilayas closes at 16:00 during Ramadan.

---

## 2. Feature 2 (MUST): Notarial Sequential Register (*Répertoire*) & Décret 08-243 Tariff Engine

### 1. PURPOSE
Enables the Notary Principal to generate tamper-proof sequential authentic act numbers (*Numéro au Répertoire*) and compute mandatory progressive statutory notary tariffs under Décret exécutif n° 08-243.

### 2. BUSINESS LOGIC
- **Rules & Tariff Schedule (Décret 08-243 Art. 4)**:
  - Real estate sales (*Ventes immobilières*), donations, and property exchanges calculate fees across 5 statutory progressive tranches:
    $$\text{Tranche 1 (0 to 500,000 DZD)}: 3.0\%$$
    $$\text{Tranche 2 (500,001 to 1,000,000 DZD)}: 2.0\%$$
    $$\text{Tranche 3 (1,000,001 to 5,000,000 DZD)}: 1.0\%$$
    $$\text{Tranche 4 (5,000,001 to 10,000,000 DZD)}: 0.75\%$$
    $$\text{Tranche 5 (Above 10,000,000 DZD)}: 0.5\%$$
  - Fixed acts: Real estate lease (*Bail*) 5,000 DZD, Marriage contract (*Contrat de mariage*) 4,000 DZD, General Power of Attorney (*Procuration générale*) 2,500 DZD.
  - VAT (*TVA Notariale*): Exactly **19%** applied to total notary fees.
  - Land Registry & Tax Registration (*Enregistrement & Publicité Foncière*): 2.5% registration tax + 1.0% conservation tax calculated as separate fiduciary disbursements (*Débours*).
- **Worked Numeric Example**:
  - Property Sale Value: **12,000,000 DZD** (1.2 Milliards Centimes).
  - Tranche 1: $500,000 \times 3.0\% = 15,000\text{ DZD}$.
  - Tranche 2: $500,000 \times 2.0\% = 10,000\text{ DZD}$.
  - Tranche 3: $4,000,000 \times 1.0\% = 40,000\text{ DZD}$.
  - Tranche 4: $5,000,000 \times 0.75\% = 37,500\text{ DZD}$.
  - Tranche 5: $2,000,000 \times 0.5\% = 10,000\text{ DZD}$.
  - Total Honoraires HT: $15,000 + 10,000 + 40,000 + 37,500 + 10,000 = \mathbf{112,500\text{ DZD}}$.
  - TVA (19%): $112,500 \times 0.19 = \mathbf{21,375\text{ DZD}}$.
  - Total Notary Fees TTC: **133,875 DZD**.
  - Plus Publicité Foncière Débours (3.5%): $420,000\text{ DZD}$.
  - Total Client Provision Required: **553,875 DZD**.
- **Sequential Numbering Invariant**:
  - Year/Index format: `YYYY/XXXXX` (e.g. `2026/00341`).
  - Gaps are legally forbidden by Loi 06-02 Art. 28. If an act is cancelled, it is marked as `annule_au_repertoire` but retains its row.
- **Permissions**:
  - View: `notaire_titulaire`, `clerc_notaire`.
  - Number Generation & Final Signature: Only `notaire_titulaire`.
  - Locked out: `avocat_associe`, `expert_comptable`.

### 3. DATA MODEL
```typescript
export interface NotaryDeed {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  repertoireNumber: string;         // e.g. "2026/00341"
  repertoireIndex: number;          // 341 (monotonic sequence)
  actType: 'vente_immobiliere' | 'donation' | 'bail_commercial' | 'fredha' | 'statuts_societe' | 'procuration';
  transactionValueDzd: number;      // e.g. 12000000
  parties: {
    vendorName: string;
    vendorNin: string;
    purchaserName: string;
    purchaserNin: string;
  };
  cadastralReference: {
    wilaya: string;
    commune: string;
    section: string;
    ilot: string;
    lotNumber: string;
    livretFoncierNumber?: string;
  };
  financials: {
    honorairesHt: number;           // 112500
    tvaAmount: number;              // 21375 (19%)
    droitsEnregistrement: number;   // 300000 (2.5%)
    droitsPublicite: number;        // 120000 (1.0%)
    totalProvisionDueDzd: number;   // 553875
  };
  status: 'draft' | 'minute_signed' | 'enregistre_impots' | 'publie_conservation' | 'annule_au_repertoire';
  signedAt?: string;
  registrationReference?: string;
  conservationVolume?: string;
  conservationNumber?: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `/src/components/screens/legal/LegalMattersView.tsx` (switched into Notary Repertoire mode).
- **Pure Function**: `/src/utils/notaryTariff.ts` $\rightarrow$ `calculateNotaryDecret08243(actType, transactionValue)`.
- **State Storage**: Zustand store + atomic sequence lock.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: In Notary Workspace $\rightarrow$ Click `+ Nouvel Acte au Répertoire` $\rightarrow$ Enter Transaction Amount (e.g. 12,000,000) $\rightarrow$ Instantly view Décret 08-243 fee breakdown $\rightarrow$ Enter Parties $\rightarrow$ Sign & Generate Act Number.
- **Screen States**: Clean high-density register table with sticky header and volume/publication search.
- **Microcopy**:
  - FR: *"Barème légal officiel Décret 08-243 appliqué (5 tranches progressives)"*
  - AR: *"التعريفة الرسمية المطبقة للمرسوم التنفيذي 08-243 (5 شرائح تصاعدية)"*
- **Delight**: Real-time DZD Centimes Converter: Displays amounts in Algerian Dinars and colloquially in *Milliards & Millions de Centimes* to eliminate client signing confusion.

### 6. EDGE CASES & FAILURE MODES (9 Categories)
1. *Invalid Input*: Transaction amount is negative or zero on sale deed. Form refuses submission.
2. *Concurrency*: Two clerks open the "New Act" drawer. The sequence number is **only reserved upon clicking "Signer la Minute"**, preventing abandoned number gaps.
3. *Time*: End of calendar year (Dec 31 23:59). Sequence rolls over to `2027/00001` automatically.
4. *Money*: Rounding fractional dinars: Always rounded to nearest whole Dinar using standard accounting rounding.
5. *Permissions*: Clerk clicks "Annuler l'acte". Requires Notary Principal PIN override.
6. *Connectivity*: If offline, new numbers are allocated from an offline-reserved pre-allocated block (e.g. 10 numbers reserved per authorized workstation).
7. *Data Integrity*: Repertoire row cannot be physically deleted; only marked `annule_au_repertoire`.
8. *Legal/Privacy*: Strict compliance with Loi 06-02; minute scans are encrypted with AES-256.
9. *Human Error*: Incorrect property lot entered. Correctable by a formal rectifying addendum (*Acte rectificatif*) cross-referenced to the initial act.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Calculation of notary fees on a 12,000,000 DZD sale.
  - *Given* an act type `vente_immobiliere` and value `12000000`,
  - *When* `calculateNotaryDecret08243` is called,
  - *Then* `honorairesHt` must equal `112500` and `tvaAmount` must equal `21375`.
- **Unit Tests**:
  - `calculateNotaryDecret08243('vente_immobiliere', 500000)` $\rightarrow$ `15000` HT.
  - `calculateNotaryDecret08243('procuration', 0)` $\rightarrow$ `2500` HT.

### 8. RISKS & OPEN QUESTIONS
- *[VERIFY]*: Confirm whether local conservation foncière in Algiers charges flat stamp fees per additional page of the authentic minute.

---

## 3. Feature 3 (MUST): Double-Lock Fiduciary & Escrow Vault (*Compte Séquestre / CARPA*)

### 1. PURPOSE
Provides notaries and law firm partners with a segregated client fiduciary ledger that prevents unlawful commingling of trust funds, enforcing a double-lock cryptographic release mechanism that requires proof of cadastral publication before escrow disbursement.

### 2. BUSINESS LOGIC
- **Fiduciary Separation Rule**: Client funds held in escrow (*Dépôts de garantie, Prix de vente sous séquestre, Indemnités judiciaires*) are held in dedicated sub-accounts.
- **Double-Lock Payout Criteria**:
  - Lock 1: Proof of Land Registry publication uploaded (Volume and Number registered at the *Conservation Foncière*).
  - Lock 2: Mandatory Principal PIN verification.
- **Sub-Ledger Solvency Invariant**: $\text{Solde Disponible par Dossier} \ge \text{Montant du Déblocage}$. Under no circumstances can client A's funds be used to cover client B's deficit.
- **Worked Numeric Example**:
  - Escrow Account: Dossier Vente D-2026-112.
  - Deposit Received from Buyer: 8,500,000 DZD.
  - Mortgage Payoff Disbursed: 3,200,000 DZD.
  - Balance in Escrow: 5,300,000 DZD.
  - Vendor demands payout of 5,300,000 DZD.
  - System checks: Has Conservation Volume been recorded? YES (`Vol. 412, No. 18`).
  - Notary enters PIN $\rightarrow$ Payout slip generated for 5,300,000 DZD; Escrow balance reaches 0.00 DZD.

### 3. DATA MODEL
```typescript
export interface EscrowAccount {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  matterId: string;
  matterReference: string;
  clientName: string;
  totalDepositedDzd: number;
  totalDisbursedDzd: number;
  currentBalanceDzd: number;
  isLocked: boolean;
  lockReason?: string;
  cadastralClearanceProof?: {
    volume: string;
    number: string;
    recordedAt: string;
    documentScanUrl: string;
  };
  transactions: EscrowTransaction[];
}

export interface EscrowTransaction {
  id: string;
  escrowAccountId: string;
  date: string;
  type: 'deposit_received' | 'tax_disbursement' | 'seller_final_payout' | 'reimbursement';
  amountDzd: number;
  paymentMode: 'virement_bancaire' | 'cheque_de_banque' | 'tresor_public';
  bankReference: string;
  authorizedByStaffId: string;
  auditHash: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `/src/components/screens/legal/LegalTrustView.tsx`.
- **Pure Function**: `/src/utils/fiduciaryRules.ts` $\rightarrow$ `canReleaseEscrow(account, payoutAmount, pinCode)`.
- **State Storage**: Zustand store with strict balance assertion triggers.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: In Trust Vault $\rightarrow$ Locate Dossier $\rightarrow$ Click "Débloquer les Fonds" $\rightarrow$ If unlocked: Enter Bank Details $\rightarrow$ Enter PIN $\rightarrow$ Instant Bank Transfer Slip (*Ordre de virement séquestre*) printed.
- **Screen States**: Visual padlock indicator (Red = Locked pending Cadastre; Green = Unlocked ready for settlement).
- **Delight**: Automatic Algerian Bank Wire Letter Generator: generates official formatted letters for BNA/BEA/CPA bank managers with legal wording.

### 6. EDGE CASES & FAILURE MODES (9 Categories)
1. *Invalid Input*: Attempt to disburse 10,000 DZD more than the deposited amount. Blocked: *"Solde séquestre insuffisant"*.
2. *Concurrency*: Simultaneous withdrawal requests. Handled via serial database transaction locks.
3. *Time*: Funds held in escrow for $> 12$ months without movement. Triggers statutory abandoned property alert under Algerian financial regulations.
4. *Money*: Bank transfer fees: Deducted strictly from operational fees, never from client escrow capital.
5. *Permissions*: Associate attempts to authorize payout. Action disabled; only Partner or Notary Principal can authorize.
6. *Connectivity*: Offline mode allows *drafting* a payout order, but *execution* requires online cryptographic signing.
7. *Data Integrity*: Ledger transactions are append-only. No deletion or editing allowed.
8. *Legal/Privacy*: Strict compliance with anti-money laundering (*Loi 05-01 relative à la prévention et à la lutte contre le blanchiment d'argent*).
9. *Human Error*: Wrong bank account entered. System enforces Algerian 20-digit RIB checksum validation (*Clé RIB*).

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Release of escrow without Cadastral reference.
  - *Given* an escrow account with balance 5,000,000 DZD and `cadastralClearanceProof: null`,
  - *When* payout is attempted,
  - *Then* the system must return `status: false` and error *"En attente du Volume et Numéro de publication foncière"*.

### 8. RISKS & OPEN QUESTIONS
- *[VERIFY]*: Confirm whether local Bar associations in Oran and Constantine require CARPA transit for all commercial litigation settlements exceeding 1,000,000 DZD.

---

## 4. Feature 4 (MUST): SCF Double-Entry General Ledger & Trial Balance

### 1. PURPOSE
Enables chartered accountants (*Experts-Comptables*) and bookkeepers to maintain compliant double-entry accounts under the Algerian Financial Accounting System (SCF - Loi n° 07-11), ensuring strict mathematical equilibrium ($\sum\text{Debit} = \sum\text{Credit}$) and seamless generation of the official DGI balance sheet and trial balance.

### 2. BUSINESS LOGIC
- **7-Class Algerian Standard Chart of Accounts**:
  - Class 1: Capitaux (101 Capital social, 120 Résultat de l'exercice)
  - Class 2: Immobilisations (215 Matériel et outillage, 218 Matériel de bureau)
  - Class 3: Stocks (31 Matières premières, 37 Marchandises)
  - Class 4: Comptes de Tiers (401 Fournisseurs, 411 Clients, 445 TVA, 447 Impôts et taxes DGI)
  - Class 5: Comptes Financiers (512 Banque, 53 Caisse)
  - Class 6: Comptes de Charges (60 Achats, 63 Charges de personnel CNAS/Salaires, 64 Impôts et taxes)
  - Class 7: Comptes de Produits (70 Ventes et prestations d'honoraires, 75 Autres produits)
- **Mathematical Invariant**: Every journal entry (*Écriture comptable*) must satisfy:
  $$\sum \text{Débit} - \sum \text{Crédit} = 0.00\text{ DZD}$$
- **Worked Numeric Example (Legal Fee Billing Entry)**:
  - Client billed for corporate legal audit: 200,000 DZD HT.
  - TVA 19%: 38,000 DZD.
  - Total Facturé TTC: 238,000 DZD.
  - Entry Breakdown:
    - Débit: `411000 - Clients Divers` = **238,000 DZD**
    - Crédit: `706000 - Prestations de Services Juridiques` = **200,000 DZD**
    - Crédit: `445700 - TVA Collectée (19%)` = **38,000 DZD**
    - Delta = $(238,000) - (200,000 + 38,000) = 0.00\text{ DZD}$ $\rightarrow$ Validated and posted to General Ledger.

### 3. DATA MODEL
```typescript
export interface SCFJournalEntry {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  entryNumber: string;              // e.g. "EC-2026-00892"
  journalCode: 'VE' | 'AC' | 'BQ' | 'CA' | 'OD'; // Ventes, Achats, Banque, Caisse, Opérations Diverses
  date: string;                     // YYYY-MM-DD
  pieceJustificativeRef: string;    // Invoice #, Check #, Court Fee Receipt #
  libelle: string;                  // Description
  lines: SCFJournalLine[];
  totalDebitDzd: number;
  totalCreditDzd: number;
  isBalanced: boolean;
  status: 'draft' | 'validated' | 'closed_period';
}

export interface SCFJournalLine {
  id: string;
  accountNumber: string;            // e.g. "411000", "706000"
  accountLabel: string;
  debitDzd: number;
  creditDzd: number;
  tiersId?: string;                 // FK -> Client or Supplier
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `/src/components/screens/legal/LegalDashboardView.tsx` (switched into Accounting General Ledger mode).
- **Pure Function**: `/src/utils/scfAccounting.ts` $\rightarrow$ `validateAndPostSCFEntry(entry)`.
- **State Storage**: Local state during journal drafting; validated entries committed to persistent store.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: Press `N` $\rightarrow$ Select Journal (e.g. `VE`) $\rightarrow$ Type Account `411` (auto-completes `Clients`) $\rightarrow$ Enter Amount $\rightarrow$ Tab to next line $\rightarrow$ Press `*` to automatically balance the transaction $\rightarrow$ Enter.
- **Screen States**: Clean, dense spreadsheet grid matching classic PC Compta ergonomics with modern typography and dark espresso headers.
- **Delight**: Single-Key Auto-Balancing: Pressing `*` or `Space` in the opposite column automatically computes and inputs the exact balancing figure.

### 6. EDGE CASES & FAILURE MODES (9 Categories)
1. *Invalid Input*: Account number does not exist in the 7-class SCF chart. System alerts and prompts to create auxiliary account (*Compte auxiliaire*).
2. *Concurrency*: Two accountants post entries to the same journal. Sequence IDs generated monotonically.
3. *Time*: Postings to a fiscal year that has been officially closed (*Exercice clôturé*). Blocked with message: *"Exercice comptable clôturé. Écriture interdite."*
4. *Money*: Decimal rounding discrepancies: Strict $0.00$ tolerance; entries cannot be posted with even 1 centime imbalance.
5. *Permissions*: Law associate attempts to view firm's general ledger. Access denied.
6. *Connectivity*: Full offline entry support; entries stored in IndexedDB and validated locally before sync.
7. *Data Integrity*: Validated entries cannot be edited or deleted; they must be reversed via an official corrective entry (*Extourne comptable*).
8. *Legal/Privacy*: Complies with Loi 07-11 requiring retention of accounting journals for 10 years.
9. *Human Error*: Debit and credit inverted. One-click "Inverser les Colonnes" button available before posting.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Entry validation with 10 DZD delta.
  - *Given* an entry with Debit = 10,000 and Credit = 9,990,
  - *When* `validateAndPostSCFEntry` is executed,
  - *Then* it must reject posting, set `isBalanced: false`, and return delta `+10 DZD`.

### 8. RISKS & OPEN QUESTIONS
- *[VERIFY]*: Verify whether the client prefers automatic auxiliary numbering (e.g. `4110001` for Client 1) or alphabetic codes.

---

## 5. Feature 5 (MUST): Article 317 Stamp Duty & Cash Drawer Closure Engine

### 1. PURPOSE
Enables the firm receptionist and cashier to issue legally compliant cash receipts with progressive fiscal stamp duties (*Article 317 du Code du Timbre*) and execute verified end-of-day cash drawer closures (*Arrêté journalier de caisse*).

### 2. BUSINESS LOGIC
- **Statutory Stamp Schedule (Article 317 Code du Timbre)**:
  - Applicable **exclusively to cash payments** (*Espèces*).
  - Transactions $\le 500\text{ DZD}$: Exempt ($0\text{ DZD}$).
  - $501$ to $3,000\text{ DZD}$: $20\text{ DZD}$.
  - $3,001$ to $10,000\text{ DZD}$: $50\text{ DZD}$.
  - $10,001$ to $50,000\text{ DZD}$: $100\text{ DZD}$.
  - $50,001$ to $100,000\text{ DZD}$: $200\text{ DZD}$.
  - Above $100,000\text{ DZD}$: Exactly **1.0%** capped at **2,500 DZD**.
- **Exemptions**: Bank checks (*Chèques de banque*), Wire transfers (*Virements*), and BaridiMob / Dahabia electronic transfers are legally exempt from stamp duty.
- **End-of-Day Closure Invariant**:
  $$\text{Solde Théorique} = \text{Fond Initial} + \sum \text{Encaissements Espèces} - \sum \text{Décaissements Débours}$$
  $$\text{Écart de Caisse} = \text{Comptage Réel} - \text{Solde Théorique}$$
- **Permissions**:
  - Daily Cashier Operations: `secretaire_caisse`.
  - Closing Validation & Variance Approval: `avocat_associe` or `notaire_titulaire`.

### 3. DATA MODEL
```typescript
export interface CashReceipt {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  receiptNumber: string;            // e.g. "RC-2026-00412"
  clientName: string;
  matterId: string;
  totalHtDzd: number;
  tvaDzd: number;
  paymentMethod: 'especes' | 'cheque' | 'virement' | 'baridimob';
  timbreFiscalDzd: number;          // Calculated via Art. 317
  netCollectedDzd: number;          // Total TTC + Timbre
  createdAt: string;
}

export interface DailyCashClosure {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  closureDate: string;              // YYYY-MM-DD
  openingFloatDzd: number;
  totalCashReceivedDzd: number;
  totalCashDisbursedDzd: number;
  theoreticalCashDzd: number;
  actualPhysicalCashCountedDzd: number;
  discrepancyDzd: number;           // Actual - Theoretical
  totalTimbreAccruedDzd: number;
  supervisorApprovalStaffId?: string;
  status: 'open' | 'balanced' | 'variance_flagged';
}
```

### 4. CODE ARCHITECTURE
- **Component File**: Dedicated modal `/src/components/modals/CashClosureModal.tsx` + Caisse tab in `/src/components/screens/legal/LegalVaultView.tsx`.
- **Pure Function**: `/src/utils/algerianFiscalStamp.ts` $\rightarrow$ `calculateArticle317Stamp(amount, paymentMethod)`.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: Click "Encaisser Espèces" $\rightarrow$ Enter Amount $\rightarrow$ Stamp duty calculated in real time $\rightarrow$ Click "Imprimer Reçu Fiscal". 2 clicks.
- **End-of-Day Closure**: Enter physical cash denominations ($2000, 1000, 500, 200, 100$) $\rightarrow$ Atrium computes total $\rightarrow$ Displays discrepancy in red/green $\rightarrow$ Generates signed PV de caisse.
- **Delight**: Automatic Bill Counter Denomination Breakdown: visual Algerian currency note calculator (billets de 2000 DA, 1000 DA, 500 DA).

### 6. EDGE CASES & FAILURE MODES (9 Categories)
1. *Invalid Input*: Negative banknote count entered. Form blocks value $< 0$.
2. *Concurrency*: Two payments recorded simultaneously from reception desks. Handled gracefully.
3. *Time*: Cash closure executed after midnight. System binds closure to the operational business date.
4. *Money*: Cash discrepancy of $> 500$ DZD requires mandatory written explanation before closure.
5. *Permissions*: Cashier cannot close the cash drawer without manager sign-off if there is a discrepancy.
6. *Connectivity*: Receipts can be issued offline; serial numbers are queued and synced upon reconnect.
7. *Data Integrity*: Cash receipts cannot be deleted once printed. Reversals require a formal refund voucher.
8. *Legal/Privacy*: Complies with DGI requirements for cash transaction transparency.
9. *Human Error*: Cashier entered 20,000 instead of 2,000 DZD. Voiding requires supervisor PIN.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Cash payment of 150,000 DZD.
  - *Given* amount = 150,000 and method = 'especes',
  - *When* `calculateArticle317Stamp` is executed,
  - *Then* stamp duty must equal `1500 DZD` (1%).
- **Scenario**: Cash payment of 350,000 DZD.
  - *When* `calculateArticle317Stamp` is executed,
  - *Then* stamp duty must equal `2500 DZD` (statutory ceiling).
- **Scenario**: Check payment of 500,000 DZD.
  - *When* `calculateArticle317Stamp` is executed,
  - *Then* stamp duty must equal `0 DZD` (exempt).

### 8. RISKS & OPEN QUESTIONS
- *[VERIFY]*: Confirm whether recent 2025/2026 Loi de Finances updated the 2,500 DZD ceiling for liberal professions.

---

## 6. Feature 6 (MUST): Bilingual Arabic/French Matter CRM & Entity Vault

### 1. PURPOSE
Provides a unified, secure database of clients, corporate entities, opposing parties, judges, and courts, capturing dual-language Arabic and French identities to guarantee that court documents comply with CPCA Article 8 (Arabic mandate) while corporate agreements remain accessible in French.

### 2. BUSINESS LOGIC
- **Dual-Name Invariant**: Every client or opposing party record involved in litigation or notarial authentic deeds must possess:
  - Latin/French Name (e.g., `Société El Bahdja SARL`)
  - Official Arabic Judicial Name (e.g., `شركة البهجة ذ.م.م`)
  - National Identification Number (*NIN - 18 chiffres*) for natural persons, or National Tax Identification Number (*NIF - 15 chiffres*) and Commercial Registry (*RC*) for legal entities.
- **Automatic Phonetic Transliteration**: If a clerk types only the French name, Atrium's native Arabic legal transliteration assistant suggests the standardized Arabic judicial equivalent.
- **Permissions**:
  - Full Access: `avocat_associe`, `notaire_titulaire`.
  - Operational Entry: `avocate_collaboratrice`, `clerc_notaire`, `secretaire_caisse`.
  - Financial View Only: `expert_comptable`.

### 3. DATA MODEL
```typescript
export interface LegalClientEntity {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  clientType: 'personne_physique' | 'personne_morale';
  nameFr: string;
  nameAr: string;
  ninOrNif: string;                 // 18 digits (NIN) or 15 digits (NIF)
  commercialRegistryNumber?: string;// e.g. 16/00-1234567B22
  phone: string;
  email?: string;
  addressFr: string;
  addressAr: string;
  wilaya: string;
  matterCount: number;
  totalBilledDzd: number;
  totalPaidDzd: number;
  outstandingBalanceDzd: number;
  createdAt: string;
  updatedAt: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `/src/components/screens/legal/LegalMattersView.tsx` + `/src/components/modals/LegalMatterModal.tsx`.
- **UI Architecture**: Standard `UniversalDataCollection<LegalClientEntity>` with Seek search and 390px sliding inspector drawer.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: Press `/` to open Seek $\rightarrow$ Type 3 letters of client name (in Arabic or French) $\rightarrow$ Press Enter $\rightarrow$ Complete 360° matter drawer opens with active cases, hearing dates, and escrow balances.
- **Screen States**: Dual-view toggle: List View (compact data grid with tabular figures) and Grid View (entity cards).
- **Delight**: Automatic Algerian Wilaya & Court Auto-Resolver: Typing "Bab El Oued" automatically assigns the jurisdiction to Tribunal de Bab El Oued, Cour d'Alger.

### 6. EDGE CASES & FAILURE MODES (9 Categories)
1. *Invalid Input*: NIN is not 18 digits. System warns: *"Le Numéro d'Identification National (NIN) doit comporter exactement 18 chiffres."*
2. *Concurrency*: Simultaneous edits to client contact information resolved cleanly.
3. *Time*: N/A.
4. *Money*: Displays outstanding balances in tabular figures with `DZD` badge.
5. *Permissions*: Front-desk staff can edit contact info, but cannot alter fee retainer contracts.
6. *Connectivity*: Client database cached locally in browser for full offline access.
7. *Data Integrity*: Cannot delete a client who has active matters or positive escrow balances.
8. *Legal/Privacy*: Strict compliance with Loi 18-07 on personal data protection; exportable GDPR/ANPDP format.
9. *Human Error*: Accidental duplicate client created. System provides a 1-click "Fusionner les Fiches Clients" tool.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Creating an entity with only French name for a court matter.
  - *Given* a new matter in Tribunal de Sidi M'Hamed,
  - *When* the user submits without an Arabic name,
  - *Then* the system blocks submission with error: *"Le nom en langue arabe est obligatoire pour les dossiers judiciaires (Art. 8 CPCA)"*.

### 8. RISKS & OPEN QUESTIONS
- *[ASSUMPTION]*: Standard Algerian National Identification Numbers (NIN) always follow the 18-digit format from biometric cards.

---

## 7. Cross-Feature Checks & Data Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CROSS-FEATURE DATA LIFECYCLE                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Receptionist Intake (Feature 6: Client CRM) ──> Creates Entity with NIN/NIF                   │
│                                │                                                                 │
│         ┌──────────────────────┴──────────────────────┐                                          │
│         ▼                                             ▼                                          │
│ 2. Litigation (Feature 1: CPCA Engine)      3. Notary Deed (Feature 2: Décret 08-243)            │
│    • Bailiff Notification Logged               • Transaction Value Entered                       │
│    • Statutory Countdown Armed                 • Sequential Act Number Reserved                  │
│         │                                             │                                          │
│         ▼                                             ▼                                          │
│ 4. Client Retainer / Fee Invoiced           5. Escrow Funds Deposited (Feature 3: Trust Vault)   │
│         │                                             │ (Double-lock until Cadastre published)   │
│         └──────────────────────┬──────────────────────┘                                          │
│                                ▼                                                                 │
│ 6. Cash Payment Received (Feature 5: Cashier & Art. 317 Fiscal Stamp)                            │
│                                │                                                                 │
│                                ▼                                                                 │
│ 7. Accounting Entry Posted (Feature 4: SCF 7-Class Double-Entry Ledger)                          │
│    • Debit 53 (Caisse) / Credit 706 (Honoraires) / Credit 445 (TVA) / Credit 447 (Timbre)        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Shared Components to Reuse:
- `UniversalDataCollection<T>`: Reused across Matters, Hearings, Repertoire, Escrow Accounts, and General Ledger.
- `AtriumButton`: Reused for all primary terracotta (`#C4785A`) action points.
- `Seek`: Reused across top-level search and in-table live filtering.
- `LabelInput` & `LabelSelect`: Reused across all form inputs and modals.
- `ConfirmDialog`: Reused for sensitive financial and deletion operations.
- `ToastStack`: TopBar notification bell integrated with transient auto-dismissing pills.

---

## 8. Self-Review: 10 Weakest Points in the Initial Plan & Solutions

1. **Weak Point 1: Siloed Profession Confusion**
   - *Risk*: A lawyer could get confused by notary deed forms, or an accountant by court hearing rolls.
   - *Fix*: Implemented strict Role-Based UI Separation. The TopBar displays an active Workspace Indicator with quick-switch PIN locks, completely hiding irrelevant sidebars and screens.

2. **Weak Point 2: Naive Calendar Math on Court Delays**
   - *Risk*: Adding simple "+30 days" without accounting for Algerian Friday/Saturday weekends and religious holidays causes malpractice.
   - *Fix*: Built the statutory CPCA Art. 405 rule into the core pure utility, automatically carrying deadlines forward to Sunday at 16:30.

3. **Weak Point 3: Premature Escrow Release Vulnerability**
   - *Risk*: A clerk could disburse funds to a seller before the Land Registry formalizes the transfer.
   - *Fix*: Created the Double-Lock mechanism: release buttons are hard-disabled until the official *Volume et Numéro de publication foncière* is registered.

4. **Weak Point 4: Unregulated Notary Pricing**
   - *Risk*: Users entering arbitrary fees violating Algerian law.
   - *Fix*: Embedded the official progressive 5-tranche bracket of Décret exécutif n° 08-243 directly into the calculation engine.

5. **Weak Point 5: Illegal Stamp Duty Over-collection**
   - *Risk*: Charging 1% without the statutory cap, or applying stamp duty to bank transfers.
   - *Fix*: Strictly constrained Article 317 stamp duties to cash payments only and enforced the legal cap.

6. **Weak Point 6: Arabic Court Filing Rejection**
   - *Risk*: Generating French court submissions that get dismissed by judges under CPCA Article 8.
   - *Fix*: Made Arabic entity and petition names mandatory for all litigation files, complete with instant transliteration tools.

7. **Weak Point 7: Out-of-Balance Accounting Journals**
   - *Risk*: Saving corrupted or unbalanced entries into the general ledger.
   - *Fix*: Enforced strict atomic validation: saving is physically blocked unless $\sum\text{Debit} - \sum\text{Credit} = 0.00$.

8. **Weak Point 8: Loss of Deed Sequential Integrity on Cancel**
   - *Risk*: Deleting a cancelled deed creates an illegal gap in the official *Répertoire des Actes*.
   - *Fix*: Banned physical deletions; cancelled deeds are flagged `annule_au_repertoire` while preserving their permanent monotonic sequence index.

9. **Weak Point 9: Offline Data Loss During Power Outages**
   - *Risk*: Frequent electricity/internet cuts in Algeria wiping out an in-progress deed or trial balance.
   - *Fix*: Configured automatic draft serialization into browser local storage every 5 seconds.

10. **Weak Point 10: Mixed Language Display Glitches in RTL Mode**
    - *Risk*: Alphanumeric case numbers (e.g. `2026/01482-A`) reversing characters when rendered in Arabic RTL mode.
    - *Fix*: Applied `dir="ltr"` and `tabular-nums` CSS classes explicitly to all legal case numbers and currency values.

---

## 9. Phased Vertical Slice Build Order

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PHASED BUILD ROADMAP                                           │
├─────────────────┬──────────────────────────────────────────┬─────────────────────────────────────┤
│ PHASE           │ SCOPE & DELIVERABLES                     │ VERIFICATION MILESTONE              │
├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────┤
│ Slice 1 (Core)  │ Quadruple Traceability Data Models       │ Unit test suite passing (rules.test)│
│                 │ Pure Utility Calculations (CPCA, Décret) │                                     │
├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────┤
│ Slice 2 (UI)    │ Role Switcher & Screen Navigation        │ Role-specific workspace rendering   │
│                 │ UniversalDataCollection Data Views       │ Seek search & filter capsules       │
├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────┤
│ Slice 3 (Engines│ CPCA Procedural Countdown Radar          │ Date carryover unit tests pass      │
│                 │ Notary Repertoire & Décret 08-243        │ Progressive fee calculation passes  │
├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────┤
│ Slice 4 (Vaults)│ Double-Lock Escrow Vault & PIN Release   │ Payout lock unit tests pass         │
│                 │ Article 317 Stamp & Cashier Drawer       │ Cash closure denomination counter   │
├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────┤
│ Slice 5 (Compta)│ SCF 7-Class General Ledger Grid          │ Debit=Credit balance assertion pass │
│                 │ Tri-Lingual Localization & Print Layouts │ FR/AR RTL/EN visual audit clean     │
└─────────────────┴──────────────────────────────────────────┴─────────────────────────────────────┘
```

---

## 10. Definition of Done (DoD)

A vertical slice or complete category is defined as **DONE** only when:
1. **Compilation & Strict Typing**: `npm run build` and `tsc --noEmit` pass with zero errors.
2. **Automated Unit Tests**: All pure functions (`calculateCPCADeadline`, `calculateNotaryDecret08243`, `calculateArticle317Stamp`, `validateAndPostSCFEntry`) pass with $100\%$ assertion coverage.
3. **Traceability Contract**: Every record upholds the Quadruple Traceability contract: `{ accountId, businessId, branchId, staffId }`.
4. **Role Isolation Verified**: Navigating as `avocat_associe` physically prevents viewing the notary register; navigating as `notaire_titulaire` physically prevents viewing litigation cases.
5. **Tri-Lingual RTL Parity**: Every label, modal, error message, and table header is 100% translated in French, Arabic, and English, with proper bidirectional alignment (`dir="rtl"` in Arabic).
6. **Zero Dead Controls**: Every button, tab, and drawer trigger has a complete working handler; no static placeholders or mock popups.
7. **Offline Resilience**: Creating or editing records works smoothly without an internet connection, storing state locally and syncing reliably.
