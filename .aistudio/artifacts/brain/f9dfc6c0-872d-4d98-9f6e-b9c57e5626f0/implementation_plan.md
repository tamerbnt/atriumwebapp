# Master Implementation Plan — Streamlined B2B Commercial Management (Category 8)

A refined, UX-first architectural specification for integrating B2B Commercial Trade & Supply Chain into Atrium ERP & CRM. Resolves the competitor "menu-bloat" antipattern (fragmented 20+ screen sidebars) by consolidating operations into **4 focused operational hubs with progressive disclosure, logical tabs, modal-based creation workflows, and complete tri-lingual localization (FR / AR / EN)**.

---

## 1. UX Constitution: Fixing Competitor Antipatterns

The competitor screenshots exhibit common ERP design flaws:
- **Navigation Bloat**: 22 separate menu items (separate links for *Devis, Factures, Factures Récurrentes, Bons de Livraison, Bons de Retour, Factures Avoir, Fournisseurs, Commandes, Réceptions, etc.*).
- **Cognitive Overload**: Huge, intimidating forms with 30+ visible inputs upfront regardless of whether the user needs advanced tax retentions or fiscal stamps.
- **Scattered Actions**: No clear primary call-to-action per screen.

### Atrium's High-Order UX Principles:
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               ATRIUM UX & CONSOLIDATION PRINCIPLES                               │
├───────────────────────────────┬──────────────────────────────────┬───────────────────────────────┤
│ Competitor Flaw               │ Atrium Design Architecture       │ User Benefit                  │
├───────────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
│ 22 fragmented sidebar items   │ 4 Unified Operational Hubs       │ Ultra-clean sidebar dock;     │
│                               │ with logical tabs                │ zero cognitive navigation tax.│
├───────────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
│ Full-page monolithic forms    │ Focused Creation Modals with     │ Fast 3-step creation; zero    │
│ with 30+ visible inputs       │ Progressive Disclosure           │ clutter for standard orders.  │
├───────────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
│ Cluttered calculations        │ Single primary CTA per view;     │ Clear operational purpose;    │
│ everywhere                    │ Advanced options collapsed       │ clean visual math.            │
├───────────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
│ Monolingual / French only     │ Native Tri-Lingual (FR / AR / EN)│ Full Maghrebi Arabic RTL,     │
│                               │ with Algerian fiscal presets     │ legal terms, English fallback.│
└───────────────────────────────┴──────────────────────────────────┴───────────────────────────────┘
```

---

## 2. The 4 Consolidated Operational Hubs

Instead of 20+ disjointed sidebar destinations, Category 8 (`trading_commercial` / "Négoce & Distribution") condenses the entire commercial lifecycle into **4 streamlined views** alongside the Pulse Dashboard and Finance:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CATEGORY 8 NAVIGATION ARCHITECTURE                                │
├──────────────────────────┬───────────────────────────────────────────────────────────────────────┤
│ Screen                   │ Consolidated Sub-Tabs & Logical Purpose                               │
├──────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ 1. `trading_dashboard`   │ Commercial Pulse: CA, En-cours clients, BL à facturer, Échéances.     │
│ 2. `trading_sales`       │ Cycle Ventes: Tabs [ Tous | Devis | Bons de Livraison | Factures ]    │
│ 3. `trading_purchases`   │ Cycle Achats: Tabs [ Commandes Fournisseur (PO) | Réceptions (BR) ]   │
│ 4. `trading_inventory`   │ Stocks & Dépôts: Tabs [ État des Stocks | Mouvements & Bons ]         │
│ 5. `trading_directory`   │ Répertoire B2B: Toggle [ Clients B2B | Fournisseurs ]                 │
│ 6. `trading_catalog`     │ Articles & Services: Toggle [ Produits (Stock) | Services (Sans stock)]│
│ 7. `trading_finance`     │ Règlements & Balance: Balance Âgée, Encaissements, Décaissements.    │
└──────────────────────────┴───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Screen-by-Screen Specifications & Progressive Disclosure

### 1. `TradingSalesView.tsx` (Unified Sales Hub)
- **One Primary Action**: Top-right Terracotta button `+ Nouveau Document` (opens modal with quick doc type choice: Devis, BL, or Facture).
- **Logical Tab Switcher**:
  - `Tous les documents` (Full audit trail with document type badge).
  - `Devis / Proformas` (Quotes awaiting customer approval).
  - `Bons de Livraison (BL)` (Dispatched physical orders awaiting final billing).
  - `Factures de Vente` (Validated financial tax invoices).
  - `Avoirs & Retours` (Credit notes and customer RMA returns).
- **Status Filter Capsules**: `Tous`, `Brouillon`, `Validé`, `Livré`, `Payé`, `En retard`.
- **Inline Row Actions**:
  - 1-click **Convertir en BL** (on Devis).
  - 1-click **Générer Facture** (on BL).
  - 1-click **Imprimer A4** (PDF print with authentic Algerian fiscal stamp and legal words).

---

### 2. `TradingPurchasesView.tsx` (Unified Procurement Hub)
- **One Primary Action**: `+ Nouvelle Commande Fournisseur` (opens PO creation modal).
- **Logical Tab Switcher**:
  - `Commandes d'Achat (PO)`: Sent to suppliers, tracking delivery dates.
  - `Bons de Réception (BR)`: Dock verification checking received vs. ordered quantities with 1-click stock increment.
  - `Factures Fournisseurs`: Vendor accounts payable with due dates.
- **Status Filter Capsules**: `Tous`, `Commandé`, `Reçu partiel`, `Réceptionné`, `Payé`.

---

### 3. `TradingInventoryView.tsx` (Stock & Multi-Depot Hub)
- **One Primary Action**: `+ Mouvement de Stock` (Modal with 3 simple options: Entrée, Sortie interne, or Transfert entre dépôts).
- **Depot Filter Dropdown**: Easily filter by `Tous les dépôts`, `Dépôt Principal Oued Smar`, `Magasin Didouche`, `Entrepôt Oran`.
- **Logical Tab Switcher**:
  - `État des Stocks`: Product name, SKU/Barcode, Depot, Quantity on hand, Reserved for BL, Available, Unit Cost (PAMP), Total Value.
  - `Bons d'Entrée & Sortie`: History of physical movements with signed vouchers and reason justifications.
  - `Lieux de Stockage`: Simple depot manager (address, manager, capacity).
- **Visual Alert**: Instant warning pill if any SKU is below safety threshold (`Rupture imminente`).

---

### 4. `TradingDirectoryView.tsx` (Unified B2B Partners Directory)
- **One Primary Action**: `+ Nouveau Partenaire` (opens `B2bEntityModal`).
- **Segmented Toggle at Top**:
  - `Clients B2B (Entreprises)`: Tracks customer credit limit, current unpaid balance (*En-cours*), and tax credentials.
  - `Fournisseurs (Fournisseurs & Prestataires)`: Tracks supplier payment terms, bank details, and active POs.
- **Client Detail Drawer (360° Inspector)**:
  - Clicking any partner opens an Apple Spatial slide-over drawer showing their legal NIF/NIS/RC, transaction history, total lifetime purchases, and unbilled BLs.

---

### 5. `TradingCatalogView.tsx` (Consolidated Items & Services)
- **One Primary Action**: `+ Nouvel Article` (Modal with instant type switch: `Produit Physique` vs `Prestation de Service`).
- **Logical Tabs**:
  - `Produits (Avec suivi de stock)`: Inventory items with purchase cost, retail price, margin %, and alert level.
  - `Services (Immatériels)`: Labor, transport, installation, design (invoiced freely without stock checks).
  - `Familles & Catégories`: Category taxonomy manager.
  - `Archives`: Soft-deleted / retired items hidden from creation pickers to keep active lists clean while preserving historical invoice links.

---

## 4. Modal-Based Document Creation with Progressive Disclosure

Instead of daunting full-page forms, document creation is performed via **`CommercialDocComposerModal.tsx`**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Modal: "Créer un Document Commercial"                                                      [X]  │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ÉTAPE 1: TYPE & DESTINATAIRE (Clean, minimal header)                                            │
│ • Type : [ Devis / Proforma ▼ ]  • Date : [ 24/10/2026 ]  • N° : [ DEV-2026-0042 ] (Auto)       │
│ • Client / Entreprise* : [ Sarl Maghreb Négoce (NIF: 001616012345678)                        ▼ ]│
│ • Délai de règlement : [ 30 jours fin de mois ▼ ]  • Devise : [ DZD (DA) ▼ ]                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ÉTAPE 2: ARTICLES & LIGNES                                                                      │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ #1 [ Câble Électrique U1000 R2V 3x2.5 ]  Qté: [ 500 ] m  PU HT: [ 180 DA ]  Total: 90,000 DA│ │
│ │ #2 [ Disjoncteur Modulaire 16A Schneider ] Qté: [ 24  ] u  PU HT: [ 850 DA ]  Total: 20,400 DA│ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ [ + Ajouter une ligne ]   [ + Sélectionner du stock ]   [ + Titre de section ]                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ▼ OPTIONS AVANCÉES & FISCALITÉ (COLLAPSIBLE / HIDDEN BY DEFAULT TO PREVENT CLUTTER)            │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ • Taux TVA global : [ 19% ▼ ]               [ ] Taux TVA personnalisé par ligne              │ │
│ │ • Remise générale : [ 5 ] %                 • Retenue de garantie (BTP) : [ 10 ] %           │ │
│ │ • Droit de timbre fiscal (Espèces) : [x]    • Afficher signature et cachet : [x]             │ │
│ │ • Note d'en-tête : [ ... ]                  • Conditions particulières en bas : [ ... ]      │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ RÉCAPITULATIF FINANCIER:                                                                        │
│ Total Brut HT: 110,400 DA  ·  Remise (5%): -5,520 DA  ·  TVA (19%): 19,927.20 DA              │
│ Retenue garantie (10%): -10,488 DA  ·  Net à Payer: 114,319.20 DZD                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Annuler ]                         [ Enregistrer Brouillon ]          [ Valider le Document → ]│
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Multi-Lingual Architecture (English, Arabic RTL, French)

All terminology, document labels, and receipts are 100% trilingual:

| French Term | Arabic Term (Modern Standard & Algerian Commercial) | English Equivalent |
|---|---|---|
| **Devis / Proforma** | **عرض أسعار / فاتورة شكلية** | Quotation / Proforma |
| **Bon de Commande (BC)** | **سند طلبية** | Purchase / Sales Order |
| **Bon de Livraison (BL)** | **وصل تسليم / إرسال** | Delivery Slip |
| **Bon de Réception (BR)** | **وصل استلام المخزن** | Goods Receipt Voucher |
| **Facture Fiscale** | **فاتورة رسمية** | Tax Invoice |
| **Facture d'Avoir** | **فاتورة دائنة / إشعار دائن** | Credit Note |
| **Bon de Retour** | **وصل إرجاع البضاعة** | Return Slip (RMA) |
| **Lieu de Stockage / Dépôt** | **مستودع / مخزن تخزين** | Warehouse / Storage Depot |
| **Fournisseur** | **مورّد** | Supplier / Vendor |
| **Client Entreprise** | **عميل تجاري (شركة)** | Corporate Client |
| **Droit de timbre fiscal** | **حقوق الطابع المالي** | Fiscal Stamp Duty |
| **Retenue de garantie** | **اقتطاع الضمان** | Guarantee Retention |
| **Net à payer** | **الصافي للدفع** | Net Payable |

Arabic RTL displays with **Cairo** font, flipped table layouts, and right-to-left numeral hierarchy.

---

## 6. Execution Roadmap

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PHASED ROLLOUT PLAN                                        │
├──────────────────────────┬─────────────────────────────┬─────────────────────────────────────────┤
│ PHASE 1: Data & Engine   │ PHASE 2: Consolidated Views │ PHASE 3: Modals, Print & Tests          │
│ • Types & Category 8 reg │ • TradingSalesView (Tabs)   │ • CommercialDocComposerModal            │
│ • Seed Maghreb Négoce    │ • TradingPurchasesView      │ • B2bEntityModal (Dual column)          │
│ • Doc conversion engine  │ • TradingInventoryView      │ • Legal A4 Print Templates (FR/AR/EN)   │
│ • Schema v2 persistence  │ • TradingDirectoryView      │ • Full unit tests & compilation         │
└──────────────────────────┴─────────────────────────────┴─────────────────────────────────────────┘
```

1. **Phase 1: State & Types**:
   - Register `'trading_commercial'` in `BusinessCategory` and `FacilityType`.
   - Add data structures (`b2bClients`, `b2bSuppliers`, `warehouses`, `commercialDocs`, `stockMovements`) to `AppState`.
   - Seed rich Algerian demo data (*Sarl Maghreb Négoce & Distribution*, Dépôt Oued Smar, 15 hardware items, 6 corporate accounts, 4 suppliers).
   - Implement conversion methods (`convertDevisToBl`, `convertBlToFacture`, `receiveSupplierOrder`, `issueCreditMemo`).

2. **Phase 2: Consolidated Screen Suite**:
   - Build `TradingDashboardView.tsx` (KPIs, unbilled BL alert, pending POs).
   - Build `TradingSalesView.tsx` with unified document tabs and 1-click status flow.
   - Build `TradingPurchasesView.tsx` with POs and dock receipts.
   - Build `TradingInventoryView.tsx` with depot dropdown and stock ledger.
   - Build `TradingDirectoryView.tsx` (Clients / Fournisseurs toggle with 360° inspector drawer).
   - Build `TradingCatalogView.tsx` (Products vs Services tabs).

3. **Phase 3: Interactive Modals, Fiscal Engine & Tri-Lingual Print**:
   - Implement `CommercialDocComposerModal.tsx` with collapsible advanced options.
   - Implement `B2bEntityModal.tsx` with dual-column corporate profile and primary contact card.
   - Build authentic printable A4 templates for Facture, BL, and BR with legal tax number-to-words in French and Arabic.
   - Add `Achats & Fournisseurs` tab in Category 6 POS for retail restocking.
   - Expand `i18n.ts` with complete commercial dictionary across English, Arabic, and French.
   - Run compilation and automated test suite.
