# Comprehensive Audit & Architecture Overhaul: NCH Market Activator

Detailed audit and implementation plan to bring the **Project & Milestone (`project_milestone`)** vertical into **exact 1:1 alignment** with the official 13-page **NCH Market Activator** platform specification.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on the 13-page presentation analysis and confirmed user requirements:
> - **Strict Presentation Alignment**: Layouts, widgets, tables, terminology, and visual hierarchy across all 6 roles will mirror the 13-page slide deck.
> - **Exact Role-Specific Sidebars**: Each role's sidebar menu items and bottom user badge will match the presentation slides:
>   - **Direction (`Mme D. — DG`)**: `Tableau de bord`, `Cahiers des charges`, `Projets`, `Validations paie`, `Rapports`, `Paramètres`
>   - **Chef de Projet (`K. Yacine — CDP`)**: `Mes projets`, `Commander`, `Suivi commandes`, `Fichiers reçus`, `Achats`
>   - **Créa (`S. Meriem — DA`)**: `Demandes`, `Production`, `Livrables`, `Cahiers des charges`
>   - **Superviseur (`R. Sofiane — SUP`)**: `Mes missions`, `Équipes`, `Pointage`, `Notes`
>   - **Ressources Humaines**: `Vivier & Talents`, `Dossier 360°`, `Pré-inscription en ligne`, `Création directe agence`
>   - **Comptabilité (`F. Nassima — CPT`)**: `Paies`, `CCP générés`, `Dépenses`, `Stock`
> - **Automated Indirect Stock (Slide 11)**: Field purchases declared by supervisors or project managers will automatically generate a coded stock asset (`NCH-A-00xxx`) with a live lifecycle timeline (`Acheté & codé` $\rightarrow$ `Affecté` $\rightarrow$ `Retour stock` $\rightarrow$ `En stock`).
> - **Unbroken 7-Step Value Chain (Slide 2)**: Guaranteed real-time state synchronization connecting Direction, Créa, Chef de Projet, Superviseur, and Comptabilité without duplicate entry.

---

## 1. Audit: Current App State vs. Presentation Specification

### A. The 7-Step End-to-End Data Pipeline (Slide 2)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE 7-STEP VALUE CHAIN (Slide 02)                                  │
│                                                                                                 │
│  [1. Cahier des charges] ──► [2. KV / Brief PDF] ──► [3. Projet validé] ──► [4. Commandes]     │
│       (Direction)                 (Créa)                  (Client)              (Chef de projet)│
│                                                                                        │        │
│  [7. Paie & CCP]        ◄── [6. Terrain & pointage] ◄── [5. Production fichiers] ◄─────┘        │
│   (Direction + Compta)            (Superviseur)                 (Créa)                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Step | Spec in Presentation | Current App Status | Audit Finding & Required Action |
| :--- | :--- | :--- | :--- |
| **1. Cahier des charges** | Direction injects client brief with deadline (`Client: Ooredoo · Échéance: 20/07`) and clicks `Envoyer à la Créa`. | Generic project form exists, but does not render the dedicated "Injection de cahier des charges" card widget. | **Action**: Add the fast injection card widget to Direction Dashboard with one-click push to Créa. |
| **2. KV / Brief PDF** | Créa receives the injected brief in Column 1 (`Reçues`) of the Production Kanban with a `BRIEF` badge. | Briefs and print orders are partially mixed; no distinct `BRIEF` vs `KV` badge workflow. | **Action**: Support distinct task types (`BRIEF`, `KV`, `PRINT`) with source origin tag (Direction / CDP). |
| **3. Projet Validé** | Validated campaign unlocks the project in Chef de Projet space. | Projects are visible in PM portfolio, but lack client sign-off transition status. | **Action**: Ensure validated projects immediately unlock ordering in Chef de Projet. |
| **4. Commandes Produits** | Chef de Projet browses 6 visual print products (Roll-up, Kakemono, Flyer A5, PLV carton, T-shirt, Stand parapluie), builds cart in right drawer, and clicks `Envoyer à la Créa →`. | Catalog exists, but cart drawer needs exact visual match with itemized count, project tag, and red CTA. | **Action**: Replicate Slide 6 layout with 6-product grid and right-hand "Ma commande" drawer. |
| **5. Production Fichiers** | Créa moves order to `En production`, attaches BAT proof (`BAT_rollup_ooredoo.pdf · 24,8 Mo · HD · CMJN`), and clicks `Renvoyer au chef de projet`. | Uploader exists, but requires Slide 7 right-hand "Livrable prêt" inspection card and return dispatch. | **Action**: Build the dedicated "Livrable prêt" inspector card and return dispatch to CDP. |
| **6. Terrain & Pointage** | Superviseur selects Mission n°142, reviews team attendance, assigns shift ratings (★), and clicks `Clôturer le pointage →`. | Table exists, but lacks exact Slide 8 layout: split table with arrival time, status pill, star rating, and "Composer son équipe" right panel. | **Action**: Restructure Superviseur workspace to match Slide 8 (table + right staffing drawer with filter buttons). |
| **7. Paie & CCP** | **Double-lock pipeline**: Superviseur closes $\rightarrow$ Direction validates $\rightarrow$ Comptabilité generates merged CCP PDF $\rightarrow$ Versé. | CCP slips exist, but need the exact yellow/white visual Algérie Poste SFP 01 check on the right and 1-click batch generation. | **Action**: Match Slide 10 layout: Paies table on left with "Validée DG" badges + big red button + authentic SFP 01 slip on right. |

---

### B. Role-by-Role Feature & Layout Audit

#### 👑 Role 1: Direction (Slide 5)
- **Missing / Needs Rework**:
  1. **Top Metrics Strip**: Match exact slide labels: `CA DU MOIS (4,2 M DA · +12%)`, `MISSIONS ACTIVES (12 · +3)`, `ANIMATEURS (86)`, `PAIES À VALIDER (23 · !)`.
  2. **Missions par Mois Bar Chart**: Interactive bar chart comparing monthly activation volume across the year (Jan to Juil).
  3. **Fast Payroll Approval Widget**: Interactive table of pending staff paies with immediate red `Valider` button per line.
  4. **Cahier des Charges Quick Injection Card**: "Nouveau cahier des charges" card with client picker, deadline, and `Envoyer à la Créa` button.
  5. **Live Activity Stream**: Feed with role icons (€ Nassima generated CCP slips, S Sofiane closed roll call, C Meriem delivered BAT, P Yacine declared purchase).

#### 💼 Role 2: Chef de Projet (Slide 6)
- **Missing / Needs Rework**:
  1. **Breadcrumb & Switcher**: Header formatted as `Commander — Roadshow Ooredoo` with project selector.
  2. **6-Item Merchandising Grid**: Clean cards with product line-art / photos: Roll-up, Kakemono, Flyer A5, PLV carton, T-shirt brandé, Stand parapluie, each with `+ Ajouter`.
  3. **Right-Hand Cart Drawer ("Ma commande")**: Itemized breakdown with quantity, project badge, and prominent red button `Envoyer à la Créa →`.
  4. **"Le circuit fichier" Infographic**: 4-step workflow banner (1. Le CDP commande $\rightarrow$ 2. La Créa produit $\rightarrow$ 3. Retour au CDP $\rightarrow$ 4. Transmission).

#### 🎨 Role 3: Créa (Slide 7)
- **Missing / Needs Rework**:
  1. **3-Column Production Board**:
     - `Reçues (3)`: Categorized cards with `KV`, `BRIEF`, `PRINT` colored chips.
     - `En production (2)`: Active design tasks.
     - `Livrées (2)`: Completed and signed-off deliverables.
  2. **Right-Hand "Livrable Prêt" Panel**: Card displaying filename, file size, HD, and CMJN tags, with red action button `Renvoyer au chef de projet`.

#### 📱 Role 4: Superviseur (Slide 8)
- **Missing / Needs Rework**:
  1. **Mission Header**: `Mission n°142 · Animation GMS — Carrefour Bab Ezzouar · Lundi 06/07/2026 · 09h00 → 18h00 · 5 animateurs · Statut: En cours`.
  2. **Pointage du Jour Table**: Columns for `ANIMATEUR`, `ARRIVÉE`, `STATUT` (`Présent`, `Retard`, `Absente`), `NOTE MISSION` (Interactive 5-star rater), and `Noter` action button.
  3. **Lock Shift CTA**: Red button `Clôturer le pointage →` with notice *"Le pointage clôturé alimente automatiquement la paie"*.
  4. **"Composer son équipe" Right Panel**: Candidate filters (`Note ≥ 4★`, `Disponible`, `Permis B`), candidate list with star scores, and `Ajouter` button.

#### 👥 Role 5: Ressources Humaines (Slide 9)
- **Missing / Needs Rework**:
  1. **Comprehensive 360° Candidate Dossier (Left)**:
     - Avatar initials, name, age, wilaya, roles, `Vivier actif` badge.
     - Verification indicators: `Permis B ✓`, `Véhicule ✓`, languages `AR · FR · EN`.
     - 3-score cluster: Note Superviseurs (4,6★), Note RH (4,4★), Note Consolidée (4,5★).
     - Banking badge: `N° CCP: 33 18 81 — clé 50`.
     - Missions count, points forts, points faibles, and recent mission history ledger.
  2. **Deux Portes d'Entrée (Right)**:
     - Portal 1: Public web pre-registration link (`nch-rh.com/cvs/create`) with new fields (Photo selfie, languages, self-assessment, CCP + clé).
     - Portal 2: 1-minute express in-person agency walk-in intake.

#### 💳 Role 6: Comptabilité & Finance (Slide 10)
- **Missing / Needs Rework**:
  1. **Paies — Juillet Ledger**: Animateur, Mission, Jours travaillés, Montant en DA, Statut (`Validée DG` green badge vs `En attente` orange badge).
  2. **1-Click Slip Generator Button**: Red button `⟳ Générer les CCP (3) → un PDF fusionné, prêt à imprimer`.
  3. **Official Algérie Poste SFP 01 Check Preview (Right)**: Authentic yellow and white postal receipt with account number, 2-digit key, amount in numbers, legal French number transcription, beneficiary name, and motif.

#### 📦 Achats & Stock Indirect (Slide 11)
- **Missing / Needs Rework**:
  1. **Terrain Purchase Declaration**: Form with product photo, attached receipt ticket (`facture_scan.jpg ✓ Scannée`), product title, price in DA, buyer, and linked project.
  2. **Automated Indirect Stock Lifecycle**: Every declared purchase automatically creates a tracked asset (`NCH-A-00147`) with a chronological timeline:
     - `12/03 Acheté & codé: Nappe comptoir — 8 400 DA`
     - `15/03 Affecté: Roadshow Ooredoo — Oran`
     - `02/04 Retour stock: État contrôlé : bon`
     - `10/05 Affecté: Salon SITEV — Alger`
     - `Auj. En stock: Disponible — état : bon`

---

## 2. Target Component & Visual Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ NCH MARKET ACTIVATOR TOP BAR: [Logo NCH]  ·  Role Tabs: [DG] [CDP] [Créa] [SUP] [RH] [Compta]          │
├─────────────────────┬──────────────────────────────────────────────────────────────────────────────────┤
│ ROLE-SPECIFIC       │ DEDICATED SLIDE WORKSPACE                                                        │
│ SIDEBAR             │                                                                                  │
│                     │ Direction: 4 KPI Cards + Chart + Fast Validation + Brief Injection + Feed       │
│ • Slide Menu Items  │ Chef Projet: 6-Product Catalog Grid + Sticky Cart Drawer ("Envoyer à la Créa") │
│ • Clean Typography  │ Créa: 3-Col Kanban (Reçues/En prod/Livrées) + "Livrable prêt" Inspector          │
│ • User Role Badge   │ Superviseur: Pointage Table (Arrivée/Statut/Note) + Right Team Builder Panel    │
│   (e.g. Mme D. - DG)│ RH: 360° Candidate Profile + "Deux portes d'entrée" (Online Link & Walk-in)     │
│                     │ Compta: Paies Table ("Validée DG") + Algérie Poste SFP 01 Check Preview Slip     │
│                     │ Achats & Stock: Expense Declaration Form + Automatic Indirect Stock Timeline     │
└─────────────────────┴──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Phases & Action Plan

### Phase 1: Sidebar & Navigation Alignment
- Update `src/components/layout/Sidebar.tsx` to render the exact menu items for each role as depicted in the slides.
- Add user identity badges in the sidebar footer (`Mme D. — DG`, `K. Yacine — CDP`, `S. Meriem — DA`, `R. Sofiane — SUP`, `F. Nassima — CPT`).

### Phase 2: Direction Command Workspace (Slide 5)
- Enhance `ProjectDirectionView.tsx`:
  - 4 exact KPI tiles (`CA du mois`, `Missions actives`, `Animateurs`, `Paies à valider`).
  - Monthly activation bar chart.
  - "Paies en attente de validation" table with 1-click `Valider` handlers that transition payroll items to `Validée DG`.
  - "Nouveau cahier des charges" card with direct dispatch to Créa Kanban.
  - "Activité récente" chronological event stream.

### Phase 3: Chef de Projet Ordering Hub (Slide 6)
- Enhance `ProjectChefProjetView.tsx`:
  - Header with project context switcher (`Commander — Roadshow Ooredoo`).
  - 6-item visual merchandise grid (Roll-up, Kakemono, Flyer A5, PLV carton, T-shirt, Stand parapluie).
  - Slide-out / sticky "Ma commande" drawer tracking itemized lines and project tag.
  - Red primary button `Envoyer à la Créa →` that pushes print orders directly into Créa's board.
  - "Le circuit fichier" 4-step workflow indicator.

### Phase 4: Créa Production Kanban (Slide 7)
- Enhance `ProjectCreaView.tsx`:
  - 3-column Kanban with `Reçues`, `En production`, and `Livrées`.
  - Colored chips for `KV`, `BRIEF`, `PRINT`.
  - Right-hand inspection panel for ready deliverables (`BAT_rollup_ooredoo.pdf · 24,8 Mo · HD · CMJN`).
  - Action button `Renvoyer au chef de projet` notifying CDP and making files downloadable.

### Phase 5: Superviseur Field Attendance & Team Builder (Slide 8)
- Enhance `ProjectSuperviseurView.tsx`:
  - Mission banner: `Mission n°142 — Animation GMS — Carrefour Bab Ezzouar`.
  - "Pointage du jour" table with arrival times, status badges (`Présent`, `Retard`, `Absente`), and star ratings.
  - Shift locking button `Clôturer le pointage →` that calculates hours and updates payroll.
  - "Composer son équipe" panel with candidate filters (`Note ≥ 4★`, `Disponible`, `Permis B`) and instant `Ajouter` action.

### Phase 6: RH Vivier 360° & Dual Entry (Slide 9)
- Enhance `ProjectRhView.tsx`:
  - Candidate 360° profile with consolidated scoring ($\text{Superviseurs } 4.6 + \text{RH } 4.4 \rightarrow 4.5$), CCP info, strengths/weaknesses, and document verification.
  - "Deux portes d'entrée" dual intake desk:
    - Online pre-registration link (`nch-rh.com/cvs/create`) with selfie photo and CCP fields.
    - Agency walk-in 1-minute express intake.

### Phase 7: Comptabilité & Official SFP 01 Generator (Slide 10)
- Enhance `ProjectComptaView.tsx`:
  - "Paies — Juillet" table with `Validée DG` status pills.
  - Red button `⟳ Générer les CCP (3) → un PDF fusionné, prêt à imprimer`.
  - Authentic visual Algérie Poste SFP 01 yellow/white slip preview with automated legal French & Arabic number transcription.

### Phase 8: Field Purchases & Automated Indirect Stock (Slide 11)
- Add the indirect stock automation to `src/services/store.ts` and UI views:
  - When an expense is declared from the field (e.g. Nappe comptoir brandée, 8 400 DA), an asset with code `NCH-A-00xxx` is automatically created in `pmEquipmentStock`.
  - Display the interactive timeline tracker (`Acheté & codé` $\rightarrow$ `Affecté` $\rightarrow$ `Retour stock` $\rightarrow$ `En stock`).

---

## 4. Verification & Testing Strategy

1. **End-to-End Pipeline Walkthrough**:
   - Create brief in Direction $\rightarrow$ see in Créa Kanban (`Reçues`).
   - Order roll-ups in Chef de Projet $\rightarrow$ see in Créa (`En production`).
   - Deliver BAT in Créa $\rightarrow$ verify return to Chef de Projet.
   - Clock in staff on Superviseur Mission n°142 $\rightarrow$ close roll call $\rightarrow$ verify appearance in Direction validation queue.
   - Click `Valider` in Direction $\rightarrow$ verify status changes to `Validée DG` in Comptabilité $\rightarrow$ click `Générer les CCP` and inspect official SFP 01 slip.
   - Declare purchase in Superviseur $\rightarrow$ verify automatic creation of coded asset in Stock with timeline.
2. **Build & Lint Verification**:
   - Run `compile_applet` and `lint_applet` to confirm error-free execution.
