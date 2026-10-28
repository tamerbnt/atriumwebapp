# Atrium ERP — Universal Data Collection & Inspector Template Rollout

Comprehensive engineering and visual architecture plan to migrate all remaining operational, financial, and clinical screens across the Atrium ERP suite to the standard **Universal Data Collection** template (dual List/Grid toggle, desktop hover arc fan palette, and 390px contextual inline inspector drawer).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following design and product decisions have been confirmed through Phase 1 requirements analysis:
> - **Scope**: Upgrade all 17 primary operational and financial roster screens across all categories to the unified `UniversalDataCollection` template.
> - **Workflow Views**: Clinical triage queues (`MedicalQueueView`) and court hearing dockets (`LegalHearingsView`) will adopt a **hybrid view mode switcher** allowing instantaneous toggling between the dense collection roster and visual board/docket view.
> - **390px Side Inspector Content**: Contextual drawers will prioritize **entity summary fiches, instant financial reconciliations, and fast-action trigger tabs** (e.g., printable receipts, status transitions, Chifa telemetry).

---

## 1. Overview & Core Concept

### What It Delivers
The Atrium suite contains 93 distinct views. Currently, 61 views are standardized with `UniversalDataCollection`. This upgrade migrates the remaining **17 operational, clinical, and financial rosters** to match the flagship experience established in `MembershipMembersView` and `MedicalPatientsView`:
- **Dual Display Toggles**: Seamless client-side switching between dense tabular list rows and spacious visual card grids.
- **Arc Fan Hover Palette**: Instant 6-button radial action arc radiating upon row/card hover (View Details, Edit, Advance State, Pin, Quick Print/Pay, Delete).
- **390px Contextual Side Inspector**: Zero-navigation inline drawer opening on item selection with tabs for Fiche Details, Financial Breakdowns, and Operational Actions.
- **Enterprise Algerian Fiscal & Domain Grounding**: Support for Chifa health insurance copays, DZD currency formatting (`tabular-nums`), stamp duties, and wilaya-compliant receipts.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ATRIUM UNIFIED WORKSPACE CANVAS                                                        │
├──────────────────────────────────────────────────────┬─────────────────────────────────┤
│ MAIN DATA COLLECTION (Dual List / Grid)              │ 390px INLINE SIDE INSPECTOR     │
│ ┌──────────────────────────────────────────────────┐ │ ┌─────────────────────────────┐ │
│ │ Controls: Search · Status Tabs · [List|Grid]     │ │ │ Header: Title & Status Badge│ │
│ ├──────────────────────────────────────────────────┤ │ ├─────────────────────────────┤ │
│ │ List Row / Grid Card [Hover: Arc Action Fan ↺]   │ │ │ [Fiche] [Finance] [Actions] │ │
│ │  - Column 1: Entity Name & Code                  │ │ ├─────────────────────────────┤ │
│ │  - Column 2: Status / Triage Priority            │ │ │ · Item Metric Cards         │ │
│ │  - Column 3: Financial Figures (DZD)             │ │ │ · Calculation Ledger        │ │
│ │  - Column 4: Contextual Timestamps               │ │ │ · Direct Print / PDF Trigger│ │
│ │  - Column 5: Kebab Action Overflow               │ │ │ · Quick Note Auto-Save      │ │
│ └──────────────────────────────────────────────────┘ │ └─────────────────────────────┘ │
└──────────────────────────────────────────────────────┴─────────────────────────────────┘
```

---

## 2. Screen Audit & Status Matrix

### Group A: Flagship Reference Screens (Already 100% Standardized — 61 Screens)
- **Medical**: `MedicalPatientsView.tsx` (EHR Dossiers Patients)
- **Membership**: `MembershipMembersView.tsx`, `MembershipFinanceView.tsx`, `MembershipRegistrationsView.tsx`, `MembershipSchedulerView.tsx`, `MembershipHistoryView.tsx`
- **Trading**: `TradingCatalogView.tsx`, `TradingInventoryView.tsx`, `TradingSalesView.tsx`, `TradingPurchasesView.tsx`, `TradingDirectoryView.tsx`, `TradingFinanceView.tsx`
- **Manufacturing**: `ManufacturingOrdersView.tsx`, `ManufacturingMaterialsView.tsx`, `ManufacturingBomView.tsx`
- **Real Estate**: `RealEstatePropertiesView.tsx`, `RealEstateLeasesView.tsx`
- **Garage**: `AutoGarageVehiclesView.tsx`, `AutoGarageOrdersView.tsx`, `AutoGaragePartsView.tsx`
- **Legal**: `LegalMattersView.tsx`, `LegalVaultView.tsx`
- **Logistics**: `LogisticsShipmentsView.tsx`, `LogisticsManifestsView.tsx`
- **Agriculture**: `AgricultureParcelsView.tsx`, `AgricultureCyclesView.tsx`, `AgricultureLivestockView.tsx`, `AgricultureHarvestView.tsx`
- **Contractor**: `ContractorSitesView.tsx`, `ContractorBoqView.tsx`
- **Education**: `EducationStudentsView.tsx`, `EducationCohortsView.tsx`, `EducationAttendanceView.tsx`, `EducationAdmissionsView.tsx`, `EducationFinanceView.tsx`
- **Appointments**: `AppointmentScheduleView.tsx`, `AppointmentServicesView.tsx`, `AppointmentClientsView.tsx`, `AppointmentHistoryView.tsx`, `AppointmentFinanceView.tsx`
- **Freelance**: `FreelanceProjectsView.tsx`, `FreelanceDeliverablesView.tsx`, `FreelanceClientsView.tsx`, `FreelanceInvoicesView.tsx`, `FreelanceTimeTrackerView.tsx`, `FreelanceFinanceView.tsx`
- **POS**: `PosRegisterView.tsx`, `PosOrdersView.tsx`, `PosInventoryView.tsx`, `PosHistoryView.tsx`, `PosFinanceView.tsx`, `PosDashboardView.tsx`
- **Project Agency**: `ProjectChefProjetView.tsx`, `ProjectSuperviseurView.tsx`, `ProjectCreaView.tsx`, `ProjectComptaView.tsx`, `ProjectRhView.tsx`, `ProjectDirectionView.tsx`
- **Venue**: `VenueBookingsView.tsx`, `VenueRentersView.tsx`, `VenueInventoryView.tsx`

---

### Group B: The 17 Target Screens to Upgrade

| # | Screen File | Domain & Route | Current Status | Missing Features | Upgrade Plan |
|---|---|---|---|---|---|
| **1** | `MedicalQueueView.tsx` | Medical · File d'Attente & Triage | Custom waiting queue list | Missing UDC, missing arc hover, missing 390px drawer | Add Hybrid view toggle (Queue Cards vs UDC Table), Arc menu (Call Patient, Start Exam, Cancel), 390px Vitals & Triage Inspector |
| **2** | `MedicalBillingView.tsx` | Medical · Facturation & Chifa | Raw static table | Missing List/Grid toggle, missing arc hover, missing inspector | Implement UDC with dual view, Chifa tier calculation actions, 390px Invoice & Bordereau Inspector |
| **3** | `MedicalPrescriptionsView.tsx` | Medical · Ordonnances Médicales | Simple card list | Missing UDC, missing arc hover, missing inspector | Implement UDC, drug posology arc actions, 390px Prescription Print & QR Verification drawer |
| **4** | `ContractorBillingView.tsx` | Contractor · Décomptes DGP & Factures | Raw static table | Missing dual toggle, missing arc hover, missing inspector | Implement UDC, Situational certification arc actions, 390px DGP calculation & retentions drawer |
| **5** | `ContractorDailyLogsView.tsx` | Contractor · Journaux de Chantier | Card stack | Missing UDC, missing arc hover, missing inspector | Implement UDC with weather/workers columns, arc actions, 390px Equipment & Workforce inspector |
| **6** | `AgricultureWholesaleView.tsx` | Agriculture · Ventes Marché de Gros | Raw table | Missing dual toggle, missing arc hover, missing inspector | Implement UDC, Weighbridge slip actions, 390px Gross/Tare/Net Mandataire payout inspector |
| **7** | `AutoGarageBillingView.tsx` | Garage · Facturation & Devis | Raw table | Missing dual toggle, missing arc hover, missing inspector | Implement UDC, Devis validation arc actions, 390px Parts/Labor split & BaridiMob inspector |
| **8** | `LegalHearingsView.tsx` | Legal · Rôle des Audiences | Chronological text rows | Missing UDC, missing arc hover, missing inspector | Implement Hybrid toggle (Docket Board vs UDC Table), Hearing arc actions, 390px Chamber & Deliberation drawer |
| **9** | `LegalTrustView.tsx` | Legal · Compte CARPA & Séquestres | Raw table | Missing dual toggle, missing arc hover, missing inspector | Implement UDC, Escrow release arc actions, 390px Trust Audit & Retainer ledger drawer |
| **10** | `LogisticsCodView.tsx` | Logistics · Encaissements CRBT | Raw table | Missing dual toggle, missing arc hover, missing inspector | Implement UDC, Driver remittance arc actions, 390px CRBT Cash Reconciliation inspector |
| **11** | `ManufacturingQcView.tsx` | Manufacturing · Contrôle Qualité | Simple card list | Missing UDC, missing arc hover, missing inspector | Implement UDC, Inspection pass/fail arc actions, 390px Batch Conformity & Lab Report drawer |
| **12** | `MembershipShopView.tsx` | Membership · Boutique & Pro-Shop | Static product grid | Missing UDC, missing arc hover, missing inspector | Implement UDC with dual List/Grid, quick stock adjustment actions, 390px SKU margin & inventory drawer |
| **13** | `RealEstateFinanceView.tsx` | Real Estate · Quittances & Encaissements | Raw table | Missing dual toggle, missing arc hover, missing inspector | Implement UDC, Quittance print arc actions, 390px Tenant Rent Ledger & Penalty inspector |
| **14** | `RealEstateInspectionsView.tsx` | Real Estate · États des Lieux | Simple cards | Missing UDC, missing arc hover, missing inspector | Implement UDC, Photo discrepancy actions, 390px Room-by-room condition audit drawer |
| **15** | `VenueFinanceView.tsx` | Venue · Cautions & Règlements | Raw table | Missing dual toggle, missing arc hover, missing inspector | Implement UDC, Caution release arc actions, 390px Event Guarantee Balance inspector |
| **16** | `EducationTimetableView.tsx` | Education · Emplois du Temps | Matrix grid | Missing table collection toggle, missing inspector | Add Hybrid toggle (Weekly Timetable Matrix vs UDC Sessions Table), 390px Classroom & Syllabus inspector |
| **17** | `LogisticsScannerView.tsx` | Logistics · Colis & Réceptions | Camera scanner widget | Missing collection ledger, missing inspector | Embed recent scanned parcels UDC table below viewfinder with 390px Parcel Manifest inspector |

---

### Group C: Executive KPI Dashboards (Exempt by Design — 14 Screens)
- `MedicalDashboardView.tsx`, `ContractorDashboardView.tsx`, `AgricultureDashboardView.tsx`, `AutoGarageDashboardView.tsx`, `LegalDashboardView.tsx`, `LogisticsDashboardView.tsx`, `ManufacturingDashboardView.tsx`, `MembershipDashboardView.tsx`, `RealEstateDashboardView.tsx`, `TradingDashboardView.tsx`, `VenueDashboardView.tsx`, `EducationDashboardView.tsx`, `AppointmentDashboardView.tsx`, `FreelanceDashboardView.tsx`
- *Rationale*: These views are high-level analytical cockpits featuring KPI stat strips, revenue trend charts, and operational alerts, rather than single-entity roster registries.

---

## 3. Detailed Upgrade Specifications for Primary Screens

### 1. Medical Category Screens
- **`MedicalQueueView.tsx`**:
  - *Data Source*: `useMedicalData()` consultations queue (`MedicalConsultation[]`).
  - *Hybrid View Switcher*: Segmented toggle between **"File Visuelle"** (card triage boards) and **"Registre Tabulaire"** (`UniversalDataCollection`).
  - *Table Columns*: Triage Ticket #, Patient Name & Phone, Arrival Time & Wait Duration, Vitals (TA, Temp, BPM), Chief Complaint, Triage Status (Waiting, In Consultation, Completed, Cancelled).
  - *Hover Arc Actions*: 1. Appeler (Call), 2. Consulter (Start Exam), 3. Signes Vitaux (Vitals), 4. Ordonnance (Prescription), 5. Prioriser (Pin), 6. Sortie (Discharge).
  - *390px Inspector*: Patient fiche summary, vital signs gauge cards, consultation notes auto-save, and payment copay reminder.

- **`MedicalBillingView.tsx`**:
  - *Data Source*: Medical invoices and consultations ledger.
  - *Table Columns*: Facture #, Date, Patient, Total Honoraires DZD, Part Chifa / Tiers-Payant DZD, Reste à Charge Patient DZD, Statut Remboursement.
  - *Hover Arc Actions*: 1. Voir Facture, 2. Quittance Chifa, 3. Encaisser, 4. Bordereau, 5. Épingler, 6. Annuler.
  - *390px Inspector*: Financial summary card, breakdown of Chifa convention percentage, receipt generation button, and payment history.

- **`MedicalPrescriptionsView.tsx`**:
  - *Data Source*: Medical prescriptions and drug posology records.
  - *Table Columns*: Réf Ordonnance, Date, Patient, Médecin Prescripteur, Nombre de Médicaments, Durée Traitement, Statut Délivrance.
  - *Hover Arc Actions*: 1. Imprimer PDF, 2. Dupliquer, 3. Vérifier Posologie, 4. Code QR, 5. Épingler, 6. Archiver.
  - *390px Inspector*: List of prescribed medications with dosages, interactions alert checklist, and printable prescription preview.

---

### 2. Contractor & Real Estate Financial Screens
- **`ContractorBillingView.tsx`**:
  - *Columns*: Situation # (DGP), Chantier, Maître d'Ouvrage, Montant Cumulé HT DZD, Retenue de Garantie (5%), Net à Payer DZD, Statut Validation.
  - *Hover Arc Actions*: 1. Certificat de Paiement, 2. Modifier, 3. Valider Attachement, 4. Épingler, 5. Exporter CSV, 6. Supprimer.
  - *390px Inspector*: Contract total progress gauge, financial retention release timeline, and breakdown of billable site attachments.

- **`RealEstateFinanceView.tsx`**:
  - *Columns*: Quittance #, Bien Immobilier, Locataire, Mois Concerne, Loyer DZD, Charges DZD, Total Encaissé, Statut Règlement.
  - *Hover Arc Actions*: 1. Générer Quittance PDF, 2. Reçu de Paiement, 3. Relance SMS, 4. Épingler, 5. Historique, 6. Annuler.
  - *390px Inspector*: Annual rent collection progress bar, security deposit ledger, and tenant payment method.

---

### 3. Legal & Logistics Screens
- **`LegalHearingsView.tsx`**:
  - *Hybrid Switcher*: **"Rôle des Audiences"** (chronological docket grouping) vs **"Registre des Affaires"** (`UniversalDataCollection`).
  - *Columns*: Date Audience, Chambre / Tribunal, Dossier #, Intitulé Affaire, Avocat Postulant, Décision / Renvoi.
  - *Hover Arc Actions*: 1. Fiche Audience, 2. Reporter (Renvoi), 3. Plaider, 4. Délibéré, 5. Épingler, 6. Archiver.
  - *390px Inspector*: Hearing notes, adversary lawyer contact, judgment draft, and tribunal chamber details.

- **`LogisticsCodView.tsx`**:
  - *Columns*: Bordereau CRBT #, Chauffeur / Livreur, Colis Livrés, Montant Espèces Collecté DZD, Commission Transport, Net à Verser Client, Statut Versement.
  - *Hover Arc Actions*: 1. Bordereau de Caisse, 2. Valider Versement, 3. Clôturer, 4. Épingler, 5. Exporter CSV, 6. Litige.
  - *390px Inspector*: Cash audit balance, delivery manifest linkage, and discrepancy reconciliation.

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ UniversalDataCollection<T>                                             │
├────────────────────────────────────────────────────────────────────────┤
│ - items: T[] / data: T[]                                               │
│ - columns: ColumnDefinition<T>[] (key, header, renderCell, sortable)   │
│ - defaultViewMode: 'list' | 'grid'                                     │
│ - renderCard: (item: T, isSelected: boolean) => ReactNode              │
│ - onItemClick: (item: T) => void                                       │
│ - customActions: (item: T) => ActionButtonDef[] (Arc Fan 6-positions)  │
│ - selectedIds, onSelectionChange, pinnedIds, onPinToggle               │
│ - sortBy, sortDirection, onSortChange                                  │
└───────────────────┬────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Contextual 390px Inline Side Inspector                                 │
├────────────────────────────────────────────────────────────────────────┤
│ - Width: w-full lg:w-[390px] shrink-0                                  │
│ - Header: Entity ID, Title, Quick Actions, Close X                     │
│ - Tabs: [Fiche Principale] [Finance & Calculs] [Actions & Documents]  │
│ - Live State Sync: Mutates parent store on action or note change       │
│ - Micro-Animations: Slide-in-right, smooth tab transitions             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Execution Stages & Verification Plan — COMPLETED ✅

1. **Stage 1 (Medical Trio)**: Upgraded `MedicalQueueView`, `MedicalBillingView`, and `MedicalPrescriptionsView` with `UniversalDataCollection`, arc hover actions, and 390px contextual side inspector drawers. [COMPLETED]
2. **Stage 2 (Contractor & Agriculture)**: Upgraded `ContractorBillingView`, `ContractorDailyLogsView`, and `AgricultureWholesaleView` with situation certification, site log attachements, and mandataire payout inspectors. [COMPLETED]
3. **Stage 3 (Legal, Garage & Logistics)**: Upgraded `LegalHearingsView` (hybrid docket board/roster), `LegalTrustView` (CARPA escrow), `AutoGarageBillingView` (repair orders), and `LogisticsCodView` (CRBT reconciliation). [COMPLETED]
4. **Stage 4 (Manufacturing, Real Estate, Venue, Membership & Education)**: Upgraded `ManufacturingQcView` (batch QC), `RealEstateFinanceView` (lease rents), `RealEstateInspectionsView` (condition reports), `VenueFinanceView` (cautions/deposits), `MembershipShopView` (pro-shop catalogue & cart), `EducationTimetableView` (hybrid schedule matrix/roster), and `LogisticsScannerView` (express live scan + hub parcels ledger). [COMPLETED]
5. **Stage 5 (Verification & Polish)**:
   - Run `lint_applet` (`tsc --noEmit`): **PASSED (0 errors)**.
   - Run `compile_applet` (`npm run build`): **PASSED (Clean production build)**.
   - All 17 operational/financial screens now feature the dual List/Grid toggle, radial hover action palette, and 390px inline inspector drawer.
