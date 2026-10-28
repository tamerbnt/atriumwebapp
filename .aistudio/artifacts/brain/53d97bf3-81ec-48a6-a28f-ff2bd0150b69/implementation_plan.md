# Master Desktop Design System Audit & Alignment Plan: 100% Pod Tray & Domain-Context Toolbar Parity

A comprehensive architectural overhaul to resolve container nesting deficiencies across all 31 non-adhering screens. This plan brings every category to 100% adherence with the **Master Desktop Design System Standard** while enforcing **strict domain-context specialization** for all filters, segmented capsules, and view toggles.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Revisions & Constraints**:
> - **Domain-Context Integrity for Toggles & Filters**: The structural *pattern* (elevated `#F8F9FA` pod tray, `Seek` kinetic search, segmented capsules, and `AtriumButton`) is standardized across all screens, but **every toggle and filter strictly preserves its own business domain context**. Under no circumstances will generic membership filters (Active/Expiring/Archived) be replicated onto non-membership screens.
> - **Side Drawer Architecture**: In screens featuring inline drawers (e.g., Medical Queue, Pro-Shop, Auto Repair Orders), both the primary data collection and the 390px side inspector drawer are enclosed **together inside the single elevated gray Pod Tray** (`#F8F9FA`), ensuring crisp visual contrast and preventing white-on-white blurring.
> - **Execution Schedule**: Unified, systematic sweep across all 31 non-adhering screens.

---

## 1. Overview & Core Concept

### What It Does
Resolves the visual hierarchy breakdown where table rows and cards float naked on the white outer canvas (`bg-white rounded-[28px]`). Every operational screen is elevated into the canonical two-pod architecture:
1. **Top Pod Tray**: Header icon + title + canonical 3-card metrics grid (`h-[124px]` fixed height, with Card 3 as the Dark Espresso Anchor `#1F1D1B`).
2. **Bottom Workstation Pod Tray**: Unified `#F8F9FA` container holding the domain-tailored toolbar controls, the `UniversalDataCollection` table/card matrix, and any active 390px side inspector drawers.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ OUTER WORKSPACE CANVAS (bg-white dark:bg-[#18181B] rounded-[28px] border-[#E9EEF0])     │
│                                                                                        │
│ ┌─ ROW 0: TOP HEADER STRIP ──────────────────────────────────────────────────────────┐ │
│ │ [Icon + Screen Title + Description]           [Branch Dropdown] [Primary Action CTA]│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌─ ROW 1: TOP KPI POD TRAY (bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5)───┐ │
│ │ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────────────┐ │ │
│ │ │ Card 1 (White)   │  │ Card 2 (White)   │  │ Card 3 (Dark Espresso #1F1D1B)       │ │ │
│ │ │ Metric 1 (124px) │  │ Metric 2 (124px) │  │ Anchor + Sparkline + Amber Pill      │ │ │
│ │ └──────────────────┘  └──────────────────┘  └──────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌─ ROW 2: BOTTOM WORKSTATION POD TRAY (bg-[#F8F9FA] rounded-[24px] p-5) ─────────────┐ │
│ │ ┌─ DOMAIN-SPECIFIC TOOLBAR ROW ────────────────────────────────────────────────────┐ │ │
│ │ │ [Icon + Title + Count]  [Seek] [Domain Context Filter Capsules] [Export] [Toggles] │ │
│ │ └──────────────────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                                      │ │
│ │ ┌─ COLLECTION & WORKSPACE AREA ───────────────┐ ┌─ 390px SIDE INSPECTOR DRAWER ────┐ │ │
│ │ │ ┌─────────────────────────────────────────┐ │ │ ┌──────────────────────────────┐ │ │ │
│ │ │ │ White Row / Card (rounded-[16px])       │ │ │ │ Header & Tabs (Domain Specs) │ │ │ │
│ │ │ ├─────────────────────────────────────────┤ │ │ │ Tab Content / Domain Details │ │ │ │
│ │ │ │ White Row / Card (rounded-[16px])       │ │ │ │ Domain Action Nodes          │ │ │ │
│ │ │ └─────────────────────────────────────────┘ │ │ └──────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────────┘ └──────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen-by-Screen Domain Context & Filter Specification

Below is the definitive catalog of all 31 screens, specifying the exact **domain-native filters and toggles** each screen will retain and polish:

### Category 1: Gym & Fitness Membership
1. **`MembershipShopView.tsx` (Pro-Shop & Nutrition)**:
   - *Domain Filter Capsules*: Product categories (`Tous`, `Protéines & BCAA`, `Créatine & Boosters`, `Textile & Shakers`, `Snacks & Barres`).
   - *Secondary Filter*: Stock alerts (`Tous`, `En Stock`, `Stock Faible < 5`, `Rupture`).
   - *Workspace Toggle*: `Panier d'Encaissement` vs. `Fiche Détail Produit`.
   - *Remediation*: Wrap product catalog, toolbar, and POS checkout cart inside the bottom `#F8F9FA` pod tray.

### Category 18: Medical Clinic & Healthcare
2. **`MedicalQueueView.tsx` (File d'Attente & Triage)**:
   - *Domain Filter Capsules*: Triage clinical status (`Tous`, `En Attente`, `En Examen`, `Terminé`).
   - *Perspective Toggle*: `Registre & Cards` vs. `File Visuelle` (visual queue board).
   - *Remediation*: Wrap toolbar, queue collection, and 390px medical inspector drawer into the single bottom `#F8F9FA` pod tray.
3. **`MedicalPrescriptionsView.tsx` (Ordonnances & Posologie)**:
   - *Domain Filter Capsules*: Prescription validity (`Toutes`, `En Cours`, `Renouvelées`, `Archivées`).
   - *Type Filter*: Prescription category (`Ordonnance Médicale`, `Bilan Biologique`, `Imagerie / Radio`).
   - *Remediation*: Enclose prescriptions list, search, and action nodes in the bottom pod tray.
4. **`MedicalBillingView.tsx` (Facturation Médicale & Actes)**:
   - *Domain Filter Capsules*: Payment & coverage status (`Tous`, `Réglé`, `Tiers Payant CNAS`, `En Attente`).
   - *Remediation*: Wrap consultation fees ledger and reimbursement summaries in the bottom pod tray.

### Category 19: Automotive Repair, Garages & Fleet
5. **`AutoGarageOrdersView.tsx` (Ordres de Réparation)**:
   - *Domain Filter Capsules*: Workshop OR workflow (`Tous`, `Diagnostic`, `En Réparation`, `Attente Pièces`, `Prêt à Livrer`).
   - *Remediation*: Wrap repair orders collection and vehicle repair side drawer in the bottom pod tray.
6. **`AutoGaragePartsView.tsx` (Magasin Pièces de Rechange)**:
   - *Domain Filter Capsules*: Parts family (`Toutes`, `Freinage`, `Filtration`, `Suspension`, `Moteur`, `Électrique`).
   - *Stock Filter*: (`Tous`, `En Stock`, `Réapprovisionner`).
   - *Remediation*: Wrap spare parts catalog and reorder actions in the bottom pod tray.
7. **`AutoGarageBillingView.tsx` (Factures & Situations Atelier)**:
   - *Domain Filter Capsules*: Payment status (`Toutes`, `Réglées`, `Factures Client`, `Devis Validés`, `En Litige`).
   - *Remediation*: Wrap repair billing ledger in the bottom pod tray.

### Category 24: BTP, General Contracting & Progress Billings
8. **`ContractorSitesView.tsx` (Chantiers & Ouvrages)**:
   - *Domain Filter Capsules*: Site operational status (`Tous`, `En Préparation`, `Gros Œuvre`, `Second Œuvre`, `Livré`).
   - *Wilaya Selector*: Algerian site locations (`Alger`, `Oran`, `Blida`, `Sétif`, etc.).
   - *Remediation*: Wrap site cards, progress tracking, and site directory in the bottom pod tray.
9. **`ContractorBoqView.tsx` (Devis Quantitatif Estimatif - DQE/BOQ)**:
   - *Domain Filter Capsules*: Construction trade (`Tous`, `Terrassement`, `Béton Armé`, `Maçonnerie`, `Plomberie/Élec`, `Finitions`).
   - *Remediation*: Wrap detail BOQ line items and unit price analysis in the bottom pod tray.
10. **`ContractorDailyLogsView.tsx` (Journaux de Chantier)**:
    - *Domain Filter Capsules*: Site event type (`Tous`, `Rapport Journalier`, `Intempéries/Pluie`, `Arrêt Chantier`, `Contrôle CTC`).
    - *Remediation*: Wrap site diary logs, workforce counters, and machinery tracking in the bottom pod tray.
11. **`ContractorBillingView.tsx` (Situations de Travaux & Décomptes)**:
    - *Domain Filter Capsules*: Progress billing status (`Toutes`, `Validées`, `En Attente Approbation`, `Retenue de Garantie (10%)`).
    - *Remediation*: Wrap official BTP progress situations ledger in the bottom pod tray.

### Category 25: Agro-Business, Crop Parcels & Livestock
12. **`AgricultureParcelsView.tsx` (Parcelles Agricoles & Terres)**:
    - *Domain Filter Capsules*: Land utilization (`Toutes`, `Céréales`, `Maraîchage`, `Arboriculture`, `En Jachère`).
    - *Irrigation Filter*: (`Tous`, `Goutte-à-Goutte`, `Pivot Central`, `Pluvial`).
    - *Remediation*: Wrap parcel registry and soil classifications in the bottom pod tray.
13. **`AgricultureCyclesView.tsx` (Cycles Biologiques & Cultures)**:
    - *Domain Filter Capsules*: Phenological phase (`Tous`, `Semis`, `Levée`, `Floraison`, `Maturation`, `Récolte Imminente`).
    - *Remediation*: Wrap crop cycles timeline and input tracking in the bottom pod tray.
14. **`AgricultureLivestockView.tsx` (Cheptel & Suivi Vétérinaire)**:
    - *Domain Filter Capsules*: Animal species (`Tous`, `Bovins Laitiers`, `Ovins / Moutons`, `Caprins`).
    - *Health Status Filter*: (`Tous`, `Vacciné`, `Quarantaine`, `Gestation`).
    - *Remediation*: Wrap livestock ear-tag registry and health cards in the bottom pod tray.
15. **`AgricultureHarvestView.tsx` (Récoltes & Stockage Silos)**:
    - *Domain Filter Capsules*: Harvest quality grade (`Toutes`, `Extra / Premier Choix`, `Industriel`, `Stockage Froid`).
    - *Remediation*: Wrap silo storage allocations and quintal logs in the bottom pod tray.
16. **`AgricultureWholesaleView.tsx` (Ventes Marché de Gros)**:
    - *Domain Filter Capsules*: Sale status (`Toutes`, `Bons de Sortie`, `Enlevé / Livré`, `Règlements Mandataire`).
    - *Remediation*: Wrap wholesale produce slips and buyer ledgers in the bottom pod tray.

### Category 22: Law Firms & Accounting Cabinets
17. **`LegalHearingsView.tsx` (Rôle d'Audience & Audiencier)**:
    - *Domain Filter Capsules*: Court jurisdiction (`Toutes`, `Cour Suprême`, `Cour d'Appel`, `Tribunal Administratif`, `Tribunal de Commerce`, `Référés`).
    - *Status Filter*: (`Toutes`, `Audience Prochaine`, `Plaidoiries`, `Délibéré`, `Jugement Prononcé`).
    - *Remediation*: Wrap audience hearings roll and court agenda in the bottom pod tray.
18. **`LegalTrustView.tsx` (Compte CARPA & Séquestres)**:
    - *Domain Filter Capsules*: Escrow transaction type (`Tous`, `Consignations`, `Frais de Justice`, `Honoraires Débloqués`, `Séquestres Actifs`).
    - *Remediation*: Wrap fiduciary trust ledger and CARPA statements in the bottom pod tray.
19. **`LegalVaultView.tsx` (Archives & Actes Notariés)**:
    - *Domain Filter Capsules*: Document classification (`Tous`, `Actes Authentiques`, `Statuts Société`, `Minutes Notariées`, `Titres Fonciers`).
    - *Remediation*: Wrap legal deed repository and vault check-out records in the bottom pod tray.

### Category 23: Couriers, Parcel Dispatch & COD Logistics
20. **`LogisticsScannerView.tsx` (Scanner & Réception Colis)**:
    - *Domain Filter Capsules*: Scan checkpoint (`Tous`, `Réception Hub`, `Mise en Tournée`, `Retour Hub / Échec`).
    - *Remediation*: Wrap rapid barcode scanner workstation and recent scan batch in the bottom pod tray.
21. **`LogisticsManifestsView.tsx` (Feuilles de Route & Manifestes)**:
    - *Domain Filter Capsules*: Inter-Wilaya route status (`Tous`, `En Chargement`, `En Transit`, `Arrivé Hub Destination`).
    - *Remediation*: Wrap truck manifests and cargo consignment list in the bottom pod tray.
22. **`LogisticsCodView.tsx` (Recouvrement COD & Encaissements)**:
    - *Domain Filter Capsules*: Cash status (`Tous`, `Encaissé Chauffeur`, `Versé au Coffre`, `Reversé au Marchand`, `Litige Colis`).
    - *Remediation*: Wrap courier COD closeouts and merchant payout tables in the bottom pod tray.

### Category 21: Light Manufacturing & Production BOM
23. **`ManufacturingBomView.tsx` (Nomenclatures & Formules BOM)**:
    - *Domain Filter Capsules*: Product line (`Toutes`, `Produits Finis`, `Semi-Finis`, `Formules Actives`, `En Révision`).
    - *Remediation*: Wrap multi-tier bill of materials workstation in the bottom pod tray.
24. **`ManufacturingMaterialsView.tsx` (Matières Premières & Lots)**:
    - *Domain Filter Capsules*: Material stock status (`Tous`, `Disponible`, `Sous Seuil Alerte`, `En Rupture`, `Lots en Quarantaine`).
    - *Remediation*: Wrap raw materials stock bins and supplier references in the bottom pod tray.
25. **`ManufacturingQcView.tsx` (Contrôle Qualité & Rebuts)**:
    - *Domain Filter Capsules*: Inspection verdict (`Tous`, `Conforme 100%`, `Rejeté / Déclassé`, `Dérogation`).
    - *Remediation*: Wrap quality control batch tests and scrap analysis in the bottom pod tray.

### Category 20: Real Estate Brokerage & Property Leases
26. **`RealEstateLeasesView.tsx` (Contrats de Bail & Locataires)**:
    - *Domain Filter Capsules*: Lease contract status (`Tous`, `Baux Actifs`, `Renouvellement < 30j`, `Résiliés`, `Litige Caution`).
    - *Remediation*: Wrap lease contract registry and tenant CRM in the bottom pod tray.
27. **`RealEstateInspectionsView.tsx` (États des Lieux & Sinistres)**:
    - *Domain Filter Capsules*: Inspection nature (`Tous`, `État Entrant`, `État Sortant`, `Constat Sinistre / Travaux`).
    - *Remediation*: Wrap property inspection reports and photo damage logs in the bottom pod tray.
28. **`RealEstateFinanceView.tsx` (Quittances & Règlements Propriétaires)**:
    - *Domain Filter Capsules*: Settlement type (`Tous`, `Loyers Encaissés`, `Commissions Agence`, `Reversements Propriétaires`, `Impayés`).
    - *Remediation*: Wrap rent collection ledger and owner remittance statements in the bottom pod tray.

### Category 15: Education & Academy
29. **`EducationTimetableView.tsx` (Emploi du Temps & Salles)**:
    - *Domain Filter Capsules*: Room/Classroom filter (`Toutes`, `Amphi A`, `Salle Informatique`, `Labo Sciences`, `Atelier Design`).
    - *Cycle Filter*: Cohorts (`Tous`, `Licence 1`, `Master Pro`, `Formation Continue`).
    - *Remediation*: Wrap conflict-free room grid and timetable calendar in the bottom pod tray.

### Category 13: Projects & Agency
30. **`ProjectChefProjetView.tsx` (Pilotage Sprints & Livrables)**:
    - *Domain Filter Capsules*: Deliverable review stage (`Tous`, `Cahier des Charges`, `En Production Créa`, `Validation BAT`, `Livré`).
    - *Remediation*: Wrap project sprint matrix and task delivery backlog in the bottom pod tray.
31. **`ProjectDirectionView.tsx` (Pipeline Affaires & Direction)**:
    - *Domain Filter Capsules*: Account status (`Tous`, `Retainers Annuels`, `Projets en Cours`, `Appels d'Offres`, `Clôturés`).
    - *Remediation*: Wrap master agency portfolio and client governance in the bottom pod tray.

### Category 7: Salon Appointments & Beauty Services
32. **`AppointmentClientsView.tsx` (Clients Salon & Fiches Beauté)**:
    - *Top Metrics Canonical Grid Refactor*: Consolidate existing 4-card metric grid into canonical 3-card grid (`h-[124px]`) featuring Card 3 Dark Espresso Anchor `#1F1D1B`.

---

## 3. Systematic Execution Protocol

For each screen:
1. **Preserve Domain Specifics**: Extract and verify the screen's specific filter values, states, and toggle handlers.
2. **Elevate to Bottom Pod Tray**:
   - Wrap the entire bottom section (toolbar + `UniversalDataCollection` + side drawer) in:
     `bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs`
3. **Format Toolbar**:
   - Left: Icon + Title + Count Badge
   - Right: Kinetic `Seek` search box (`shutSize={36}`, `openWidth={220}`) + Domain-Specific Filter Capsules (with `#FCEEE8` active state and terracotta text) + View Mode toggles + Secondary `AtriumButton`.
4. **Enclose Side Drawer**:
   - Ensure that whenever a 390px side inspector drawer opens, it sits *inside* the `#F8F9FA` container beside the collection table, providing crisp surface elevation.
5. **Verify**:
   - Run `lint_applet` (`tsc --noEmit`) and `compile_applet`.
   - Run unit test suite (`npm test`).
