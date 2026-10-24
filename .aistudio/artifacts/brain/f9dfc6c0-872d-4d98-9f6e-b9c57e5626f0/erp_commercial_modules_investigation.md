# Architectural Investigation: B2B Commercial Management, Supply Chain & Multi-Depot Stock Modules

An in-depth analysis of the 4 interface screenshots from traditional European and North African ERPs (*Odoo, Sage 100 Commerciale, Dolibarr, WinFirme, ClicFacture*), evaluating their business purpose, document lifecycle, Algerian legal compliance, and strategic fit within Atrium ERP & CRM.

---

## 1. What Are These Screens? (The "Gestion Commerciale" Paradigm)

The 4 screenshots depict the cornerstone of **Classic French/North African "Gestion Commerciale" (Trading & Wholesale ERP)**. Unlike retail POS systems that sell directly to walk-in consumers with immediate payment, B2B wholesale and distribution operate on a multi-stage **document cycle with deferred invoicing, physical delivery tracking, supplier procurement, and multi-depot stock controls**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               THE CLASSICAL B2B COMMERCIAL FLOW                                  │
├─────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│           CYCLE VENTES (Sales & Clients)        │          CYCLE ACHATS (Procurement & Vendors)  │
├─────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ 1. Devis (Proforma Quote)                       │ 1. Fournisseur (Vendor Profile / NIF / RC)     │
│ 2. Bon de Commande Client (Sales Order)         │ 2. Bon de Commande (Purchase Order - PO)       │
│ 3. Bon de Livraison - BL (Delivery / Dispatch)  │ 3. Bon de Réception - BR (Inward Warehouse)    │
│ 4. Service Fait (Proof of Work / PV Réception)  │ 4. Bon de Retour Fournisseur (Vendor RMA)      │
│ 5. Facture de Vente (Tax Invoice)               │ 5. Facture Fournisseur (Vendor Bill / AP)      │
│ 6. Factures Récurrentes (Retainers / Contracts) │ 6. Factures Avoir Fournisseur (Vendor Credit)  │
│ 7. Bon de Retour Client (Customer RMA)          │                                                │
│ 8. Facture d'Avoir (Credit Memo / Refund)       │                                                │
└─────────────────────────────────────────────────┴────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      GESTION DES STOCKS & RÉFÉRENTIEL (Inventory & Catalog)                      │
├─────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│ • Bons d'entrée (Stock-in / Opening / Restock)  │ • Produits (Physical Stock with Cost & Retail) │
│ • Bons de sortie (Stock-out / Scrap / Internal) │ • Services (Intangible / Billable hourly/flat) │
│ • Lieux de stockage (Multi-Warehouse / Dépôts)  │ • Catégories & Familles de produits            │
│ • Bons de transfert (Inter-Depot Movement)       │ • Produits archivés (Soft-deleted / Historic)  │
└─────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 2. Screenshot-by-Screenshot Deep Dive

### Screenshot 20: Cycle Ventes (Sales & Revenue Flow)
In B2B commerce (distributors, wholesalers, contractors, equipment suppliers), sales rarely happen via cash register. They follow a formal administrative chain:
1. **Clients**: Dedicated B2B buyer profiles containing legal company identifiers (Raison sociale, NIF, NIS, RC, Article d'Imposition, credit limits, payment terms like 30/60 days).
2. **Devis (Estimates / Quotes)**: Commercial proposals with validity periods. When approved, they convert to orders or delivery slips.
3. **Factures (Invoices)**: Legal financial tax documents that bind payment and declare VAT.
4. **Factures Récurrentes (Recurring Invoices)**: Automatic recurring billing for maintenance contracts, retainers, and software licenses.
5. **Bons de Livraison (BL - Delivery Slips)**: **Crucial in Algerian & French commercial law**. The BL proves physical transfer of custody and property. Many businesses deliver goods with a BL and only issue a grouped invoice (*Facture récapitulative*) at the end of the month.
6. **Services Faits (Attestation of Completed Work)**: For service contractors, a signed *Procès-Verbal (PV) de réception* or *Bon de travaux* proving the client verified and accepted the work before invoicing.
7. **Factures Avoir (Credit Notes)**: Accounting corrections for returned goods, damaged items, or commercial rebates without modifying original locked invoices.
8. **Bons de retour (Return Slips / RMA)**: Documentation of returned merchandise returning into warehouse inventory.

### Screenshot 21: Achats (Procurement & Supplier Management)
Manages the company's expenses and supply chain:
1. **Fournisseurs (Vendors)**: Supplier directory with payment terms, bank RIB/CCP, contact persons, and negotiated purchase prices.
2. **Bons de Commande (Purchase Orders - PO)**: Internal requisitions sent to suppliers requesting goods.
3. **Bons de réception (Goods Receiving Slips - BR)**: Created at the loading dock when shipments arrive. Automatically reconciles delivered quantities against the Purchase Order.
4. **Bons de retour Fournisseur**: Documents rejected or defective materials sent back to the vendor.
5. **Factures Fournisseur (Vendor Bills)**: Payables registered against the matching Goods Receipt slip.
6. **Factures avoir Fournisseur**: Discounts or credits issued by the supplier.

### Screenshot 22: Stock (Warehousing & Movement Controls)
Enterprise warehouse operations require strict audit trails beyond simple quantity numbers:
1. **Bons d'entrée (Stock-In Vouchers)**: Traceable justification for inventory increases (supplier deliveries, initial counts, found inventory).
2. **Bons de sortie (Stock-Out Vouchers)**: Justification for inventory deductions outside of direct sales (spoilage, internal consumption, raw materials transferred to production, showroom samples).
3. **Lieux de stockage (Multi-Depots / Warehouses)**: Managing multiple physical storage points (e.g., *Dépôt Central Rouiba*, *Magasin Didouche*, *Camionnette Livraison 01*).

### Screenshot 23: Produits & Services (Universal Catalog)
1. **Produits (Goods)**: Items with physical stock, purchase cost (PAMP / FIFO), selling price, weight, barcode, and reorder levels.
2. **Services (Intangibles)**: Billable non-stock items (labor, delivery fee, design, consulting, installation). Billing a service generates revenue without reducing warehouse quantity.
3. **Catégories**: Multi-level classification for filtering and gross margin reports.
4. **Produits archivés**: Products discontinued or no longer sold. In a production ERP, you **never delete** a product that appeared on past invoices, because doing so breaks historical tax reports; you archive it.

---

## 3. How Does This Compare to Atrium's Current 7 Categories?

Atrium ERP is built as a **Multi-Vertical Operating System**, where each category has tailored workflows:

| Category | Operational Core | Does It Need Full "Gestion Commerciale"? |
|---|---|---|
| **1. Membership & Gym** (`membership_session`) | RFID access, recurring memberships, coaching. | Pro-Shop sells water/supplements via quick POS; full procurement is overkill. |
| **2. Venue & Spaces** (`rental_booking`) | Room timeline, cautioned bookings, hourly rates. | Quotes & security deposit receipts exist. Does not handle physical trading stock. |
| **3. Education & Cohorts** (`education_cohort`) | Cohorts, syllabi, student tuition installments. | Students pay tuition via tranches. No BL/BR needed. |
| **4. Freelance & Studio** (`freelance_solo`) | Time tracking, milestone deliverables, DZD/EUR invoices. | Has client invoices and proposals, but no physical goods or warehouse depots. |
| **5. Agency & Milestone** (`project_milestone`) | 6 agency roles, print orders, CCP slips, BAT proofs. | Already has tailored collateral orders and CCP postal vouchers tailored for media campaigns. |
| **6. POS, Retail & Food** (`pos_inventory`) | High-speed barcode scanning, cash drawer, daily shift reconciliation. | **Currently focused on B2C counter sales**. Lacks formal B2B procurement (PO/BR) and Delivery Slips (BL). |
| **7. Salon & Spa** (`appointment_service`) | Multi-chair schedule, stylist commissions, treatments. | Services + retail beauty products. Walk-in cash/card counter checkout. |

---

## 4. The Strategic Recommendation: How Should Atrium Incorporate This?

There are two viable architectural strategies:

### Option A: Create an 8th Dedicated Vertical — `trading_commercial` (Recommended)
**"Négoce, Distribution & Gestion Commerciale B2B"**
- **Target Audience**: Wholesalers (*Grossistes*), Import/Export companies, Industrial equipment vendors, Building materials (*Matériaux de construction*), Pharmaceutical distributors, B2B hardware suppliers.
- **Why it warrants its own category**:
  - These businesses **never use a fast POS counter** with coin shortcuts or chair schedules.
  - Their entire day consists of: Taking a client call → Issuing a Devis → Generating a Bon de Commande → Dispatching with a Bon de Livraison (BL) → Grouping into a Facture → Ordering from Fournisseurs with Bons de Commande → Receiving at the Dépôt with Bons de Réception.
  - Adding this as an autonomous 8th category preserves the clean, uncluttered UX of Atrium's existing 7 verticals while unlocking a massive market segment (Algerian and French commercial trading firms).

### Option B: Extend Category 6 (`pos_inventory`) with a "B2B / Wholesale Mode"
- Introduce a mode switcher inside Category 6: **"Mode Caisse / Retail"** (Current fast register) vs. **"Mode Négoce / B2B"** (Devis, BL, Fournisseurs, Bons d'entrée/sortie).
- **Pros**: Reuses existing product and sales structures.
- **Cons**: Can clutter the simple, fast retail interface designed for shops and cafes with complex B2B accounting forms.

### Option C: A Cross-Vertical "Supply & Purchasing" Sub-Engine
- Allow Fournisseurs (Suppliers) and Bons d'entrée (Stock receipts) to be accessed as a shared utility across Category 1 (Gym Pro-Shop), Category 6 (Retail POS), and Category 7 (Salon products).

---

## 5. Algerian Regulatory Context (Key Advantage for Atrium)

In Algeria, B2B commercial software must obey specific accounting and legal requirements:
1. **Mentions Obligatoires sur Factures**:
   - NIF (Numéro d'Identification Fiscale - 15 digits)
   - NIS (Numéro d'Identification Statistique)
   - RC (Registre de Commerce)
   - Article d'Imposition (AI)
2. **Droit de Timbre Fiscal**:
   - Cash transactions over 100 DA require legal fiscal stamp duty calculation (Timbre fiscal).
3. **Le Bon de Livraison (BL)**:
   - Mandatory during transport of merchandise to prevent seizure by trade inspectors (*Contrôle des prix et répression des fraudes*).
   - Goods transported without a stamped BL are legally considered contraband or fraudulent.
4. **Gestion Multi-Dépôts**:
   - Required by tax authorities when a business has separate storage sites (e.g. Siège social vs. Entrepôt logistique).

---

## 6. Summary Comparison Matrix

| Feature Module | In Atrium Today? | Where It Belongs | Priority Score |
|---|---|---|---|
| **Clients CRM with NIF/NIS/RC** | Partially (in Freelance & Agency) | Universal CRM / B2B Trading | ⭐⭐⭐⭐⭐ (Essential for B2B) |
| **Devis (Quotes / Proforma)** | Present in Freelance (`proposals`) | Extend to Commercial / Wholesale | ⭐⭐⭐⭐⭐ |
| **Bons de Livraison (BL)** | Absent (only receipts & invoices) | **Category 8 (Trading) or POS B2B** | ⭐⭐⭐⭐⭐ (Algerian market demand) |
| **Fournisseurs (Suppliers)** | Partially in POS restock | Dedicated Purchasing module | ⭐⭐⭐⭐ |
| **Bons de Réception / Commandes** | Absent | Category 8 (Trading) | ⭐⭐⭐⭐ |
| **Multi-Lieux de Stockage (Dépôts)**| Single branch inventory | Category 8 (Trading) / POS | ⭐⭐⭐ |
| **Services vs Produits separation** | Integrated in Salon & POS | Standardize across catalog | ⭐⭐⭐⭐ |
| **Factures Avoir (Credit Notes)** | Simulated in POS refunds | Formal credit memo with negative VAT | ⭐⭐⭐⭐ |
