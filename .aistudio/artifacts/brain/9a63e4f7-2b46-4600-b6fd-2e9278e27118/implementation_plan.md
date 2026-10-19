# Comprehensive Multi-Screen Role Architecture — NCH Market Activator

Detailed implementation plan for the **Project & Milestone (`ProjectMilestone`)** category in Atrium ERP & CRM, expanding from high-level role hubs into **21 distinct, dedicated screens** organized under a **dynamic role-driven sidebar navigation** with **toggleable mobile device viewports** and **double-lock financial controls**.

---

## User Review & Confirmed Architectural Directives

> [!IMPORTANT]
> The following user preferences were confirmed during clarification:
> - **Dynamic Role Sidebar**: When a user selects any of the 6 roles (`Direction`, `Chef de Projet`, `Créa`, `Superviseur`, `RH`, `Comptabilité`), the sidebar automatically switches its navigation items to display all specific sub-screens belonging exclusively to that role.
> - **Toggleable Mobile Viewports**: On-site field roll call (`/superviseur/attendance`) and the public candidate self-registration portal (`/cvs/create`) feature an instant toggle between a realistic smartphone frame (390px width with status bar and touch interactions) and a fluid full-width layout.
> - **Preserve Existing Architecture**: Fully leverage the Supabase PostgreSQL schema (`supabase_project_milestone.sql`), TypeScript services (`projectMilestoneService.ts`), and pre-seeded Algerian activation agency data.
> - **Zero Placeholder Policy**: Every screen must have complete, production-grade interactive functionality, real calculations, double-lock state transitions, and Algerian Dinar/CCP formatting.

---

## Complete Role-by-Role Screen Breakdown (21 Dedicated Screens)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [NCH Market Activator]  ·  Role Switcher: [Direction ▾] [Chef Projet] [Créa] [Superviseur] [RH] [Compta] │
├─────────────────┬──────────────────────────────────────────────────────────────────────────────────────┤
│ DYNAMIC SIDEBAR │ ACTIVE ROLE WORKSPACE                                                                │
│ (Updates per    │                                                                                      │
│ active role)    │ Each role features its own separate screens with full permissions, data flow,        │
│                 │ modals, export capabilities, and responsive adaptations.                            │
└─────────────────┴──────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 👑 ROLE 1: DIRECTION (General Management & Executive Leadership)

1. **Screen 1.1: Executive Command Center (`/direction/dashboard`)**
   - **Metrics Ribbon**: 4 live KPIs (`CA du mois` in DZD with MoM %, Active Field Activations count, Talent Pool Vetted Capacity, Pending Payroll Approvals count).
   - **Turnover & Volume Chart**: 12-month interactive mission volume and revenue trends.
   - **Fast-Approval Widget (`Validation Express des Paies`)**: One-click approval of supervisor-closed attendance batches with gross payout preview.
   - **Live Agency Audit Feed (`Flux d'Activité en Direct`)**: Real-time event log (attendance closures, BAT uploads, CCP slip prints, expense receipts).

2. **Screen 1.2: Project Intake & Terms of Reference (`/direction/projects/new`)**
   - **Client Context**: Client picker (Ooredoo, Danone, Unilever, Cevital) or create brand.
   - **Terms & Scope (`Cahier des charges`)**: Strategic scope, deliverables, and targets.
   - **Financial Thresholds**: Budget cap in DZD, maximum allowable field expenses, and target gross margin (%).
   - **Milestone Deadlines**: Kickoff, Key Visual deadline, Print deadline, Execution dates.
   - **Leadership Assignment**: Project Manager (`Chef de Projet`) and Lead Creative Designer select.
   - **Instant Dispatch**: Triggers automatic creation of project milestones and notifies downstream teams.

3. **Screen 1.3: Financial Governance & Disbursement Approvals (`/direction/approvals`)**
   - **Dual-Key Split Ledger**: Tabs for **Field Expenses (`Achats de terrain`)** and **Staff Payroll (`Paies du personnel`)**.
   - **High-Res Receipt Inspector**: Zoom, pan, and rotate controls for merchant tickets and invoices.
   - **Action Controls**: `Approuver` (authorizes release), `Rejeter avec motif` (rejection reason dialog), `Mettre en attente`.
   - **Reconciliation Export**: Filtered CSV / Excel export for external accounting audits.

---

### 💼 ROLE 2: CHEF DE PROJET (Project Manager)

4. **Screen 2.1: Project Portfolio & Milestone Tracker (`/chef-projet/projects`)**
   - **Portfolio Grid**: Status cards (`En cadrage`, `Créa en cours`, `Prêt pour impression`, `En exécution terrain`, `Clôturé`).
   - **Milestones Timeline**: Interactive phase progression (Brief $\rightarrow$ KV $\rightarrow$ BAT $\rightarrow$ Staffing $\rightarrow$ Field Execution $\rightarrow$ Billing).
   - **Financial Health Bar**: Live budget cap vs committed costs vs actual field expenses.
   - **Project Detail Drill-Down**: Quick access to assigned supervisors, print orders, and deliverable packets.

5. **Screen 2.2: Internal Promotional & Print Catalog (`/chef-projet/catalog`)**
   - **Visual Merchandise Grid**: High-res product cards with dimensional specs and material options:
     - Roll-up Banners (85x200 cm, Aluminium base, HD Vinyl)
     - Kakemonos (Metal grommets, heavy mesh)
     - Flyers A5 (135g Couché brillant, Recto/Verso)
     - POS Floor Displays (`PLV Carton`)
     - Branded T-Shirts & Polos (Silk-screen, size breakdowns S/M/L/XL)
     - Pop-Up / Umbrella Stands (3x3 curve)
     - Branded Hostess Counters / Podiums
   - **Order Cart Drawer (`Panier de Commande`)**: Live item summary, project selector, and one-click dispatch to Creative Kanban (`Transmettre à la Créa →`).

6. **Screen 2.3: Asset Delivery & BAT Approval Center (`/chef-projet/deliverables`)**
   - **Asset Gallery**: Deliverable cards with technical specification badges (HD 300 DPI, CMYK color space, 3mm bleed margin).
   - **High-Res Proof Inspector**: Vector/PDF previewer with detail zoom.
   - **Sign-Off Workflow**:
     - `Valider le BAT`: Sets status to print-ready and unlocks commercial printer dispatch.
     - `Demander Correction`: Visual annotation and revision notes pinned directly to the deliverable.
   - **Vendor Dispatch**: Generates secure download links for external commercial printing houses.

7. **Screen 2.4: Project Field Expenses Tracker (`/chef-projet/expenses`)**
   - **Ledger View**: Real-time log of petty cash and logistics purchases declared by supervisors.
   - **Threshold Safety Alert**: Warning banner when actual expenditures cross 85% of allocated field budget.
   - **Expense Logging**: Add direct project logistics expenses with receipt attachment.

---

### 🎨 ROLE 3: CRÉA (Creative & Graphic Design Studio)

8. **Screen 3.1: Creative Production Kanban (`/crea/kanban`)**
   - **3-Column Production Board**:
     1. `Briefs & Commandes Reçus`
     2. `En Cours de Création`
     3. `BAT Prêts / Validés`
   - **Priority & Type Badges**: `KEY VISUAL`, `PRINT ORDER`, `DIGITAL ASSET`, `PACKAGING`.
   - **Deadline Alerts**: Dynamic countdown chips (`Urgent < 24h`, `Dans 3 jours`, `En retard`).
   - **Card Detail Modal**: Full brief description, dimensions, client assets, and previous revision logs.

9. **Screen 3.2: Asset Uploader & Proof (BAT) Engine (`/crea/upload`)**
   - **Artwork Upload Studio**: Drag-and-drop file uploader with automated file inspection.
   - **Enforced Technical Validation**:
     - File format check (`.pdf`, `.ai`, `.psd`, `.tiff`).
     - Color space verification (`CMJN` mandatory for print assets).
     - DPI verification (`300 DPI` for print, `72 DPI` for screen).
     - Bleed margin confirmation (`Bords perdus de 3mm inclus`).
   - **Version Control & History**: Auto-incrementing (`v1` $\rightarrow$ `v2` $\rightarrow$ `v3`) with rollback diff viewer.
   - **Master Asset Vault**: Secure storage for heavy project source files (`.AI`, `.PSD`) while distributing lightweight watermarked proofs.

---

### 📱 ROLE 4: SUPERVISEUR (Field Operations Supervisor)

10. **Screen 4.1: Field Staffing & Team Builder Engine (`/superviseur/staffing`)**
    - **Smart Discovery Filter**: Filter talent pool by minimum star rating ($\ge 4.0\star$), availability for mission dates, `Permis B`, `Véhiculé`, Wilaya & Commune, and spoken languages.
    - **Talent Discovery Cards**: Photo, age, verified rating, reliability score (`12 missions · 0 absence`), and `Affecter à la Mission +` button.
    - **Crew Roster Drawer**: Live tracker showing slots filled (e.g. `4/6 Animateurs assignés`) with day rate calculations.
    - **Roster Confirmation**: Locks team selection and generates SMS/WhatsApp dispatch briefing cards.

11. **Screen 4.2: Mission Operations Hub (`/superviseur/missions`)**
    - **Segmented Mission Views**: `Missions du Jour` (active today) vs `Missions à Venir` (upcoming/completed).
    - **Mission Card**: Client brand, activation type (`GMS In-Store`, `Roadshow`, `Street Marketing`, `Sampling`, `Mall Expo`), venue address, Google Maps direct route link, daily operational hours.
    - **Fast Clock-In Action**: Direct one-tap jump to the mobile attendance roll-call screen.

12. **Screen 4.3: Real-Time Mobile Daily Clock-In (`/superviseur/attendance/[missionId]`)**
    - **Mobile Viewport Switcher**: Toggle between **Phone Frame View (390px iPhone/Android simulator)** and **Full-Screen Desktop Mode**.
    - **Touch-First Staff Rows**: Large fingertip-friendly check-in buttons with live device time stamping.
    - **Status Selector**:
      - `Présent` (Green)
      - `Retard` (Orange with minute selector: `+15m`, `+30m`, `+45m`)
      - `Absent` (Red)
      - `Remplaçant` (Blue with modal to select standby backup animator)
    - **Shift Rating**: 1 to 5 stars for daily on-site conduct and punctuality.
    - **Tamper-Proof Closure (`Clôturer le Pointage du Jour`)**: Locks the shift, calculates payable hours, and pushes batch to Direction & Accounting queues.

13. **Screen 4.4: Quick Field Expense Declaration (`/superviseur/expenses/new`)**
    - **On-Site Mobile Capture**: Camera snap or photo gallery receipt upload.
    - **Declaration Fields**: Title, amount in DZD, category (Transport, Catering, Materials, Emergency Logistics), linked mission.
    - **Real-Time Approval Tracker**: Live status pill (`En attente de validation DG`).

---

### 👥 ROLE 5: RESSOURCES HUMAINES (HR & Talent Management)

14. **Screen 5.1: Talent Pool Directory & Discovery Engine (`/rh/talents`)**
    - **58-Wilayas Data Grid**: Complete directory of registered animators, hostesses, and supervisors.
    - **Consolidated Scoring Engine**: Formula: $\text{Score} = (\text{Note RH Initial} + \sum \text{Notes Missions}) / (N + 1)$.
    - **Reliability Gauges**: Attendance percentage, completed activations, and absence warnings.
    - **Multi-Filter & Export**: Search by name, phone, national ID, wilaya, skills, and export filtered roster to Excel.

15. **Screen 5.2: Comprehensive Talent Dossier (`/rh/talents/[id]`)**
    - **4-Tab 360° Profile**:
      1. *Informations Générales & Compétences*: Portrait photo, age, wilaya, commune, driver's license, vehicle, languages, strengths.
      2. *Coordonnées Bancaires / CCP*: 10-digit CCP number and 2-digit key with validation checks.
      3. *Documents & Justificatifs*: National ID card (`CNI/Passeport`), Driver's License, CV, full-length casting photos with `Vérifié par RH` toggle stamp.
      4. *Historique des Missions & Évaluations*: Chronological mission ledger with supervisor ratings and feedback notes.
    - **Profile Status Management**: `Actif`, `En pause`, `Non retenu / Liste noire` (with internal HR justification).

16. **Screen 5.3A: Candidate Public Self-Registration Portal (`/cvs/create` or `/rejoindre`)**
    - **Public-Facing Mobile Web Form**: Designed for external candidate onboarding with mobile preview toggle.
    - **Intake Flow**: Personal info, 58-Wilaya selector, commune filter, driving status, desired roles, language proficiencies.
    - **Visual Casting Selfie**: Camera snap or portrait photo upload.
    - **CCP Verification**: Account number and key inputs with validation tips.
    - **Document Attachment**: CV and ID upload ($\le 5\text{MB}$).

17. **Screen 5.3B: Agency Direct Walk-in Intake Form (`/rh/talents/new`)**
    - **Express 1-Minute Intake**: Optimized for agency HR staff when candidates apply in-person at the office.
    - **Keyboard Tab-Optimized**: Rapid data entry with instant webcam capture integration.

---

### 💳 ROLE 6: COMPTABILITÉ & FINANCE (Accounting, Payroll & Stock)

18. **Screen 6.1: Automated Payroll Hub (`/compta/payroll`)**
    - **Lifecycle Funnel Pipeline**:
      $$\text{Pointé (Superviseur)} \;\longrightarrow\; \text{Validé (Direction)} \;\longrightarrow\; \text{CCP Généré (Comptable)} \;\longrightarrow\; \text{Payé } \checkmark$$
    - **Compensation Ledger**: Filterable by project, mission, month, and status.
    - **Payroll Details**: Animator name, photo, mission, worked days/shifts, agreed day rate in DZD, and gross amount payable in DZD.
    - **Double-Lock Verification Gate**: Disables slip generation for batches that have not yet received Direction approval.

19. **Screen 6.2: 1-Click Algerian Post (CCP SFP 01) Generator (`/compta/ccp-generator`)**
    - **Dual-Pane Printing Workspace**: Batch selector on the left, live official SFP 01 postal check preview on the right.
    - **Auto-Extracted Data**: Automatic population of beneficiary name, 10-digit CCP, and 2-digit key from verified talent profiles.
    - **Algerian Numbers-to-Words Engine (`Algorithme Nombre en Lettres`)**: Legal automatic transcription in French & Arabic:
      - *Example:* `14 000,00 DA` $\rightarrow$ *"Quatorze mille dinars algériens et zéro centimes"* / *"أربعة عشر ألف دينار جزائري و صفر سنتيم"*.
    - **Print-Ready Merged PDF**: Batch print button (`Imprimer le Lot SFP 01`) formatting 1, 2, or 3 slips per A4 sheet.
    - **Payment Disbursement Toggle**: Marks all processed slips as `Payé / Virement Émis`.

20. **Screen 6.3: Field Expense Audit & Receipt Ledger (`/compta/expenses`)**
    - **Dual-Pane Audit Desk**: Searchable expense queue on the left, interactive receipt scanner viewer (zoom, brightness, contrast, rotate) on the right.
    - **Tax & Legal Classification**: Categorization of expenses into petty cash tickets vs official fiscal invoices (`Factures avec NIF/NIS`).
    - **Budget Ledger Reconciliation**: Live deduction of verified amounts from the project's allocated field budget.

21. **Screen 6.4: Indirect Equipment & Collateral Stock Tracker (`/compta/stock`)**
    - **Asset Inventory**: Non-consumable agency equipment (Roll-up bases, umbrella stand structures, hostess counters, sound systems, branded vests).
    - **Auto-Inventory Creation**: Automatically creates an asset record (`NCH-EQ-00xxx`) when an expense tagged as "Equipment" is approved.
    - **Custody & Lifecycle**: Tracks acquisition date, cost, assigned mission, current custodian (e.g., Supervisor Sofiane), and return condition check-in.
    - **Label Generator**: Generates printable barcode and QR stickers for physical asset labeling.

---

## State Management & Component Architecture

### Dynamic Role Navigation (`src/components/layout/Sidebar.tsx`)
The sidebar navigation dynamically reads `activePmRole` from `useAtriumStore()` when `currentBusiness.category === 'project_milestone'`:
- **Direction**: Command Center, Project Intake, Financial Approvals.
- **Chef de Projet**: Project Portfolio, Print Catalog, BAT Deliverables, Project Expenses.
- **Créa**: Production Kanban, BAT Uploader & Validator.
- **Superviseur**: Team Builder & Staffing, Missions Hub, Mobile Roll Call, Field Expenses.
- **RH**: Talent Pool Directory, Talent Dossier, Public Candidate Portal, Walk-in Intake.
- **Comptabilité**: Payroll Hub, CCP SFP 01 Generator, Expense Audit, Equipment Stock.

### Active Screen Dispatch (`src/App.tsx`)
A unified screen router maps the sub-navigation items directly to their corresponding role screen components, while maintaining global breadcrumbs and the interactive TopBar role switcher.

### Shared Interactive Modals
- **CcpSlipModal**: Modal to preview and print individual or batch Algerian Post SFP 01 slips.
- **ReceiptZoomModal**: Zoomable lightbox modal for inspecting field expense tickets.
- **TalentDossierModal**: 360-degree inspection modal for talent details and documents.
- **MobileFrameWrapper**: Reusable wrapper component rendering a 390px mobile phone frame with status bar, notch, and full-screen toggle button.

---

## Verification & Execution Plan

1. **Component Scaffolding**: Ensure all 21 screens are modularized under `src/components/screens/project/` with clean typing and zero dead code.
2. **Dynamic Sidebar Synchronization**: Connect the dynamic sidebar navigation so clicking any sub-screen accurately renders the matching view and updates breadcrumbs.
3. **Mobile Frame Wrapper**: Provide smooth toggle between phone viewport and full desktop view on mobile-first screens.
4. **Complete Data Flow Verification**:
   - Create project in Direction $\rightarrow$ view in Chef de Projet.
   - Order roll-up in Catalog $\rightarrow$ see in Créa Kanban.
   - Upload BAT in Créa $\rightarrow$ approve in Chef de Projet.
   - Assemble team in Superviseur $\rightarrow$ clock in on mobile roll call $\rightarrow$ lock attendance.
   - Direction authorizes payroll $\rightarrow$ Comptabilité generates legal CCP SFP 01 slips with numbers-to-words.
5. **Compilation & Linting**: Run `compile_applet` and `lint_applet` to ensure pristine TypeScript build.
