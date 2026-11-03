# Production-Grade Architectural Specification: Category-Dedicated Executive Dashboards Across All 16 Verticals (Revision 2)

This specification defines the complete production implementation blueprint for dedicated, context-grounded executive dashboards across all 16 business verticals in Atrium ERP & CRM. It integrates the desktop application's signature two-column pod visual layout (Screenshots 90, 91, and 92), enforces 100% tri-lingual parity (French, Modern Standard Arabic with RTL support, and English), leverages Atrium's native design system tokens (`AtriumButton`, `#F8F9FA` pod trays, `#1F1D1B` Dark Espresso anchors, and `tabular-nums`), retires the standalone `AnalyticsScreen`, and locks access strictly to business Owners and operational leads.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following non-negotiable requirements are locked into this plan:
>
> 1. **Unified Screen Naming**: Standardized to **"Dashboard"** across all 16 verticals (localized to "Tableau de bord" in French and "لوحة القيادة" in Arabic).
> 2. **Complete Tri-Lingual Support (FR / AR / EN)**: 100% of headers, KPI labels, chart legends, tooltips, Guardian alert messages, and shortcut buttons are localized across all 3 languages, featuring native Arabic typography with the `Cairo` typeface and automatic RTL spatial flipping.
> 3. **Native Design System & Resource Alignment**: Strict adherence to Atrium's desktop UI library:
>    - `AtriumButton` with brand terracotta (`#C4785A`), luxury satin finish, and 1px fine bevel edge.
>    - `#F8F9FA` elevated pod trays (`border: 1px solid #EDF1F3`, `rounded-[24px]`).
>    - Inset pure white cards (`#FFFFFF`, `border: 1px solid #E9EEF0`, `rounded-[18px]`).
>    - `#1F1D1B` Dark Espresso Anchor cards with warm amber/terracotta glowing progress rings.
>    - Full-page SWR skeleton wireframes (`StructuralSkeletons.tsx`) and `OfflineRetryBanner`.
> 4. **Decommissioning Global `AnalyticsScreen.tsx`**: The generic global analytics screen is retired; every vertical owns its native business intelligence.
> 5. **Strict RBAC Enforcement**: Screen access is locked to Owners and high-level operational leads. Front-line staff (cashiers, mechanics, stylists, laborers) are automatically routed to their execution workbenches.

---

## 1. Design System Tokens & Two-Column Spatial Math

Every vertical dashboard follows the proven 2-column layout demonstrated in Screenshots 90, 91, and 92:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD HEADER: Title ("Dashboard") · Branch Switcher · Demo Data Seeder · Export Dropdown    │
├─────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│  POD 1: REAL-TIME OPERATIONAL FLOW (Left, ~42%) │  POD 2: ASSET & BASE DEVELOPMENT (Right, ~58%) │
│  - Elevated #F8F9FA Tray (rounded-[24px])       │  - Elevated #F8F9FA Tray (rounded-[24px])      │
│  - Time Toggle (Today / Yesterday / Month)      │  - Period Selector (< November 2026 >)         │
│  - Dual-Metric Inset Card (1px vertical divider)│  - 3-Card KPI Strip:                           │
│  - 24-Hour Velocity / Hourly Occupancy Curve    │    * Metric A (White Card, Green Badge)        │
│  - Daily Target Pacing Progress Bar             │    * Metric B (White Card, Amber Badge)        │
│                                                 │    * Metric C (Dark Espresso #1F1D1B Card)     │
│                                                 │  - 4-Week Periodic Histogram (Pill Bars)       │
├─────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│  POD 3: FINANCIAL TRAJECTORY (Left, ~42%)       │  POD 4: DOMAIN GUARDIAN & INTELLIGENCE (~58%)  │
│  - Elevated #F8F9FA Tray (rounded-[24px])       │  - Elevated #F8F9FA Tray (rounded-[24px])      │
│  - Financial Period Navigator (< Month >)       │  - Acquisition / Segmentation Donut Chart      │
│  - 3 P&L Metric Counters (Profit, Gross, Cost)  │  - Distribution / Frequency Bar Histogram      │
│  - 30-Day Smooth SVG Area Cash Trajectory Curve │  - #1F1D1B Dark Espresso Guardian Card:        │
│  - 4 Critical Domain KPIs with Status Badges    │    * Circular SVG Progress Ring Gauge          │
│    (2x2 Grid with % delta & semantic chips)     │    * Real-time Algorithmic Status & Switch     │
│                                                 │  - Operational Shortcuts & Report Actions      │
│                                                 │    (Terracotta Primary CTA + Secondary Links)  │
└─────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

### Exact CSS & Token Specifications
| Element | Light Theme | Dark Theme | Border & Radius |
| :--- | :--- | :--- | :--- |
| **Outer Canvas** | `#FFFFFF` | `#18181B` | `rounded-[32px]` inner container |
| **Pod Trays** | `#F8F9FA` | `#1C1C20` | `border: 1px solid #EDF1F3`, `rounded-[24px]`, `p-5` |
| **Inset White Cards** | `#FFFFFF` | `#18181B` | `border: 1px solid #E9EEF0`, `rounded-[18px]`, `p-4` |
| **Espresso Anchor** | `#1F1D1B` | `#0E0E10` | `border: 1px solid #27272A`, `rounded-[18px]`, text white |
| **Primary Button** | `#C4785A` (Terracotta) | `#C4785A` | `rounded-xl`, luxury satin finish, 1px highlight |
| **Histogram Bars** | Active: `#C4785A`, Muted: `#E8DFD8` | Dark Muted: `#2A2A30` | `rounded-full`, group hover opacity transitions |
| **Typography** | `Inter` (EN/FR) / `Cairo` (AR) | `tabular-nums font-mono` for all numeric values and currencies |

---

## 2. Tri-Lingual Localization Architecture (FR / AR RTL / EN)

Every dashboard element must be 100% localized. Below is the structural dictionary matrix governing the universal pod titles and operational controls:

| Screen Element | French (FR) | Modern Standard Arabic (AR - RTL) | English (EN) |
| :--- | :--- | :--- | :--- |
| **Screen Title** | Tableau de bord | لوحة القيادة | Dashboard |
| **Screen Subtitle** | Activité opérationnelle et indicateurs en temps réel | النشاط التشغيلي ومؤشرات الأداء اللحظية | Real-time operational activity and metrics |
| **Branch Switcher** | Établissement principal | الفرع الرئيسي | Main Facility |
| **Mock Data Button** | Recharger Données Démo | إعادة شحن بيانات تجريبية | Seed Demo Data |
| **Export Button** | Exporter Rapport | تصدير التقرير | Export Report |
| **Pod 1 Header** | Flux Opérationnel en Direct | التدفق التشغيلي المباشر | Live Operational Flow |
| **Pod 2 Header** | Développement & Utilisation | نمو القاعدة والاستخدام | Base & Asset Development |
| **Pod 3 Header** | Tendance Financière & Rentabilité | الاتجاه المالي والربحية | Financial Trajectory & P&L |
| **Pod 4 Header** | Intelligence & Moteur Gardien | الذكاء ومحرك الحماية | Domain Intelligence & Guardian |
| **Today / Yesterday** | Aujourd'hui / Hier | اليوم / الأمس | Today / Yesterday |
| **This Month** | Ce Mois-ci | هذا الشهر | This Month |
| **Net Profit** | Bénéfice Net | صافي الأرباح | Net Profit |
| **Gross Revenue** | Chiffre d'Affaires | إجمالي الإيرادات | Gross Revenue |
| **Operating Expenses** | Charges & Dépenses | المصاريف التشغيلية | Operating Expenses |

---

## 3. Strict Role-Based Access Control (RBAC) Permission Matrix

Dashboards expose sensitive financial, margin, and personnel data. The following matrix dictates screen visibility across all 16 verticals:

| Category | Permitted Roles (Can Access Dashboard) | Blocked Front-Line Roles (Redirected to Task View) |
| :--- | :--- | :--- |
| **1. Gym & Fitness** | `Owner`, `Manager` | `Staff` (Redirected to Turnstile Kiosk / Front Desk) |
| **2. Salon & Spa** | `Owner`, `Lead Stylist` | `Stylist`, `Apprentice` (Redirected to Chair Station) |
| **3. POS & Retail** | `Owner`, `Store Manager` | `Cashier`, `Waiter` (Redirected to POS Register) |
| **4. Agency / PM** | `Direction`, `Chef de Projet`, `Compta` | `Crea`, `Superviseur`, `Talent` (Redirected to Studio / Muster) |
| **5. Venue Rentals** | `Owner`, `Booking Manager` | `Setup Crew`, `Maintenance` (Redirected to Calendar) |
| **6. Education** | `Owner`, `Academic Director` | `Teacher`, `Proctor` (Redirected to Roll Call Kiosk) |
| **7. Freelance** | `Sole Owner` | N/A (Single-User Workspace) |
| **8. B2B Trading** | `Owner`, `Commercial Director` | `Warehouse Picker`, `Cashier` (Redirected to Shipping/Invoicing) |
| **9. Medical Clinic** | `Owner`, `Médecin Chef` | `Nurse`, `Medical Secretary` (Redirected to Queue Kiosk) |
| **10. Auto Garage** | `Gérant`, `Service Advisor`, `Chef d'Atelier` | `Mécanicien`, `Magasinier` (Redirected to Repair Bay Kanban) |
| **11. Real Estate** | `Direction`, `Notaire & Compta` | `Négociateur`, `Gestionnaire Locatif` (Redirected to Mandates) |
| **12. Manufacturing** | `Gérant`, `Chef d'Atelier`, `Contrôleur Qualité`| `Opérateur Machine` (Redirected to Rugged Tablet Terminal) |
| **13. Legal & Notary** | `Avocat Associé`, `Notaire Titulaire`, `Expert-Comptable` | `Clerc de Notaire`, `Secrétaire Caisse` (Redirected to Formalités) |
| **14. Logistics & COD**| `Gérant`, `Dispatcher Hub` | `Chauffeur Livreur`, `Agent Tri` (Redirected to Scanner View) |
| **15. Construction BTP**| `Gérant`, `Conducteur de Travaux`, `Métreur` | `Chef de Chantier`, `Ouvrier` (Redirected to Journal de Chantier) |
| **16. Agriculture** | `Gérant`, `Chef de Culture`, `Zootechnicien` | `Tâcheron`, `Ouvrier Agricole` (Redirected to Field Pointage) |

---

## 4. Deep Feature Research & Metrics Specifications for All 16 Verticals

---

### Category 1: Membership, Gym & Fitness (`membership_session`)
- **Core Purpose**: Monitor gym floor capacity in real time, forecast member renewals, prevent membership churn, and maximize pro-shop ancillary spend.
- **Formulas & Mathematical Logic**:
  - $\text{Turnover Today} = \sum \text{Member Renewals} + \sum \text{POS Pro-Shop Sales}$
  - $\text{Churn Rate} = \frac{\text{Members Expired in Last 30d}}{\text{Active Members at Start of Month}} \times 100$
  - $\text{Peak Occupancy Rate} = \frac{\max(\text{Hourly Turnstile Headcount})}{\text{Facility Fire-Code Capacity}} \times 100$
- **Pod Layout (Screenshots 90, 91, 92 Reference)**:
  - **Pod 1 (Top-Left)**: *People Inside & Live Turnstiles* — Live occupancy (e.g. 38 / 100), daily total entries (142 entries), 24h hourly occupancy curve, daily revenue target progress bar.
  - **Pod 2 (Top-Right)**: *Member Development* — Active Members (2,450), Pending Dossiers (14), Dark Espresso `#1F1D1B` Card: **Expiring Soon Alert** (42 members $<14\text{d}$), 4-week active members bar chart.
  - **Pod 3 (Bottom-Left)**: *Revenue & P&L Trend* — Net profit today, gross receipts, expenses, 30-day cash curve, 4 KPIs (Churn Rate 2.4%, Peak Occupancy 88%, PT Coaching Conversion 18%, Trial Conversion 84%).
  - **Pod 4 (Bottom-Right)**: *Retention Guardian & Channels* — Member acquisition donut (Walk-in 45%, Instagram 35%, Referrals 20%), 7-day visit frequency histogram, Dark Espresso **Retention Guardian** with circular member health ring (94%), shortcuts (`Paie / Salaires`, `Historique Recettes`, `Historique Flux`).

---

### Category 2: Salon, Spa & Appointment Services (`appointment_service`)
- **Core Purpose**: Optimize chair and treatment cabin utilization, eliminate client no-shows, monitor stylist commission splits, and drive retail beauty product cross-selling.
- **Formulas & Mathematical Logic**:
  - $\text{Chair Utilization Rate} = \frac{\sum \text{Completed Appointment Minutes}}{\text{Total Available Chair Operating Minutes}} \times 100$
  - $\text{No-Show Rate} = \frac{\text{No-Show Appointments}}{\text{Total Scheduled Appointments}} \times 100$
  - $\text{Retail Attachment Rate} = \frac{\text{Appointments with Retail Product Purchase}}{\text{Total Appointments}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Chair Utilization & Today's Schedule* — Active chairs occupied (6 / 8 Chairs), upcoming appointments today (24 booked), 8-hour daily appointment timeline curve, daily revenue target pacing bar.
  - **Pod 2 (Top-Right)**: *Client Roster & Booking Pace* — Total VIP clients (680), first-time visitors (8), Dark Espresso `#1F1D1B` Card: **Inactive At-Risk Clients ($>45\text{d}$)** (34 clients), 4-week appointment volume histogram.
  - **Pod 3 (Bottom-Left)**: *Service Revenue & Commission P&L* — Net salon profit, gross ticket revenue, stylist commission liabilities (40% split), 30-day revenue curve, 4 KPIs (Chair Utilization 82%, No-Show Rate 3.1%, Retail Attachment 28%, Rebooking Rate 64%).
  - **Pod 4 (Bottom-Right)**: *Stylist Yield & Care Guardian* — Revenue by service category donut (Coloration/Balayage 48%, Coupe/Coiffure 26%, Soins/Spa 18%, Onglerie 8%), client visit interval histogram, Dark Espresso **Re-engagement Guardian** with re-booking readiness gauge (88%), shortcuts (`Commissions Coiffeurs`, `Caisse Journalière`, `Clôture Z`).

---

### Category 3: Restaurant, Cafe & Retail POS (`pos_inventory`)
- **Core Purpose**: Monitor dining room table turnover, control Food & Beverage COGS, minimize kitchen ticket preparation delays, and reconcile cash drawer balances against Article 317 stamp duties.
- **Formulas & Mathematical Logic**:
  - $\text{Food Cost \%} = \frac{\text{Raw Ingredient Costs}}{\text{Food Revenue}} \times 100$
  - $\text{Table Turnover Rate} = \frac{\text{Total Diners Served}}{\text{Total Restaurant Seat Capacity}}$
  - $\text{Art. 317 Timbre Fiscal} = \text{Graduated stamp duty on all Cash receipts} \ge 500\text{ DZD}$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Dining Room & Register Velocity* — Active tables occupied (18 / 24 Tables), pending kitchen tickets (6 orders), hourly order throughput curve (11:00 to 23:00), daily sales target progress bar.
  - **Pod 2 (Top-Right)**: *Ticket Performance & Stock Alerts* — Total covers served today (142), average ticket value (2,850 DZD), Dark Espresso `#1F1D1B` Card: **Critical Low-Stock Ingredients** (5 items $< \text{reorder level}$), 4-week sales volume bar chart.
  - **Pod 3 (Bottom-Left)**: *Daily Cash & Margin Trajectory* — Net profit today, gross sales, raw food costs, 30-day cash curve, 4 KPIs (Food Cost 29.4%, Table Turn 3.2x, Void/Discount Rate 1.2%, Timbre Fiscal Total 1,420 DZD).
  - **Pod 4 (Bottom-Right)**: *Menu Profitability & POS Guardian* — Revenue mix donut (Main Courses 52%, Beverages 24%, Desserts 14%, Appetizers 10%), sales by meal period histogram (Lunch vs Dinner), Dark Espresso **Margin Guardian** with theoretical vs actual variance ring (96%), shortcuts (`Clôture Caisse Z`, `Inventaire Cuisine`, `Bons d'Achat`).

---

### Category 4: Creative Advertising Agency & Project Milestones (`project_milestone`)
- **Core Purpose**: Track marketing campaign deliverable velocity, defend creative gross margins against scope creep, manage field promoter muster, and automate Algérie Poste CCP (SFP 01) payroll.
- **Formulas & Mathematical Logic**:
  - $\text{Agency Gross Margin \%} = \frac{\text{Client Billing} - (\text{Field Expenses} + \text{Print Production} + \text{Talent Payroll})}{\text{Client Billing}} \times 100$
  - $\text{Creative Burn Rate} = \frac{\text{Creative Hours Logged}}{\text{Budgeted KV Hours}}$
  - $\text{Field Muster Rate} = \frac{\text{Animators Clocked In On-Site}}{\text{Planned Field Staff}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Campaign Velocity & Field Muster* — Live activations operating today (8 events), field promoters deployed (46 staff), milestone progress curve, project expense cap burn meter.
  - **Pod 2 (Top-Right)**: *Client Campaign Portfolio* — Active agency projects (12), briefs in framing (4), Dark Espresso `#1F1D1B` Card: **Critical Deadlines at Risk ($<48\text{h}$)** (3 Key Visuals), 4-week milestone delivery histogram.
  - **Pod 3 (Bottom-Left)**: *Project P&L & Cash Flow* — Gross agency margin, billings collected, production/freelance disbursements, 30-day cash curve, 4 KPIs (Gross Margin 44.2%, BAT Approval Cycles 1.4, Field Muster Rate 98%, CCP SFP 01 Clearance 100%).
  - **Pod 4 (Bottom-Right)**: *Activation Channels & Scope Guardian* — Billings by channel donut (GMS In-Store 40%, Roadshows 30%, Digital KV 20%, Mall Expos 10%), campaign duration distribution histogram, Dark Espresso **Scope Creep Guardian** with margin defense health ring (92%), shortcuts (`Bordereau CCP SFP 01`, `Validation BAT`, `Journal de Bord`).

---

### Category 5: Venues, Event Halls & Space Rentals (`rental_booking`)
- **Core Purpose**: Maximize space rental yield per square meter, manage security deposit (caution) escrow, streamline turnaround cleaning, and ensure 100% signed legal contracts.
- **Formulas & Mathematical Logic**:
  - $\text{RevPAH} = \frac{\text{Total Rental Revenue}}{\text{Total Rentable Space Hours Available}}$
  - $\text{Caution Forfeiture Rate} = \frac{\text{Deducted Damage Deposits}}{\text{Total Deposits Released}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Hall & Room Utilization* — Active halls occupied (4 / 6 Spaces), attendees on site (320 guests), 24h event schedule timeline bar, monthly rental revenue pacing bar.
  - **Pod 2 (Top-Right)**: *Booking Pace & Pipeline* — Confirmed reservations (28), tentative holds (6), Dark Espresso `#1F1D1B` Card: **Escrow Caution Deposits Held** (1,250,000 DZD), 4-week rental nights histogram.
  - **Pod 3 (Bottom-Left)**: *Rental P&L & Caution Balances* — Net venue profit, gross billings, cleaning/utility overhead, 30-day revenue curve, 4 KPIs (Space Occupancy 78%, RevPAH Yield 4,200 DZD/h, Contract Signoff 100%, Caution Retention 3.8%).
  - **Pod 4 (Bottom-Right)**: *Space Distribution & Turnaround Guardian* — Revenue by space type donut (Salle des Fêtes 55%, Coworking 20%, Studio Photo 15%, Matériel 10%), booking duration distribution histogram, Dark Espresso **Turnaround Guardian** with room cleaning readiness gauge (95%), shortcuts (`Restitution Caution`, `Contrats de Location`, `Planning Espaces`).

---

### Category 6: Academy, Tutoring & Higher Education (`education_cohort`)
- **Core Purpose**: Monitor campus attendance, eliminate student dropouts, track installment tuition aging, and issue tamper-proof verifiable certificates.
- **Formulas & Mathematical Logic**:
  - $\text{Cohort Fill Rate} = \frac{\text{Enrolled Students}}{\text{Classroom Seat Capacity}} \times 100$
  - $\text{Tuition Collection Rate} = \frac{\text{Tuition Fees Paid}}{\text{Total Agreed Tuition Billed}} \times 100$
  - $\text{Attendance Compliance} = \frac{\sum \text{Present Student Sessions}}{\sum \text{Scheduled Student Sessions}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Campus Presence & Timetable* — Students present in classrooms right now (184 students), active cohorts in session (8 classes), daily timetable curve (08:00 to 20:00), monthly tuition collection pacing bar.
  - **Pod 2 (Top-Right)**: *Enrollment Pipeline & Student Base* — Active students (420), admission inquiries (32), Dark Espresso `#1F1D1B` Card: **Overdue Tuition Installments** (28 accounts, 480,000 DZD), 4-week enrollment growth histogram.
  - **Pod 3 (Bottom-Left)**: *Tuition Revenue & Educational P&L* — Net tuition receipts, instructor payroll liabilities, facility expenses, 30-day cash curve, 4 KPIs (Average Attendance 92.4%, Cohort Fill Rate 86%, Tuition Arrears 6.2%, Student Exam Pass Rate 89%).
  - **Pod 4 (Bottom-Right)**: *Academic Programs & Dropout Guardian* — Students by program donut (Languages 38%, Tech Coding 32%, Academic Bac 20%, Vocational 10%), student grade distribution histogram, Dark Espresso **Dropout Guardian** with attendance alert risk radar (91%), shortcuts (`Feuille d'Émargement`, `Émission Diplômes`, `Reçus d'Inscription`).

---

### Category 7: Freelancers, Solo Consultants & Creatives (`freelance_solo`)
- **Core Purpose**: Track billable hours in real time, prevent unbilled work leakage, maintain multi-currency tax reserves (DZD, EUR, USD), and monitor client payment terms.
- **Formulas & Mathematical Logic**:
  - $\text{Effective Hourly Rate} = \frac{\text{Total Invoiced Revenue}}{\text{Total Hours Logged (Billable + Non-Billable)}}$
  - $\text{Realization Rate} = \frac{\text{Billable Hours Logged}}{\text{Total Working Hours}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Time Tracker & Daily Capacity* — Billable hours logged today (5.8h / 7.0h), active stopwatch timer status, 7-day daily billable hours curve, monthly revenue pacing bar.
  - **Pod 2 (Top-Right)**: *Client Retainers & Active Projects* — Active clients (8), open deliverables (14), Dark Espresso `#1F1D1B` Card: **Unbilled Work Accrued** (32.5h · 245,000 DZD), 4-week billable hours histogram.
  - **Pod 3 (Bottom-Left)**: *Financial Realization & Income P&L* — Invoiced receipts, business software expenses, statutory tax reserve (20%), 30-day revenue curve, 4 KPIs (Effective Hourly Rate 8,500 DZD/h, Realization Rate 82%, Outstanding Invoices 3, Proposal Win Rate 75%).
  - **Pod 4 (Bottom-Right)**: *Client Concentration & Scope Guardian* — Revenue by client donut (Concentration index), invoice payment latency histogram, Dark Espresso **Scope Creep Guardian** with deliverable budget overrun warning gauge (94%), shortcuts (`Générer Facture`, `Nouveau Devis`, `Exporter Relevé d'Heures`).

---

### Category 8: B2B Trading, Wholesale Distribution & Commerce (`trading_commercial`)
- **Core Purpose**: Oversee warehouse inventory valuation, expedite delivery notes (Bons de Livraison), enforce client credit limits, and collect Article 317 timbre fiscal on cash wholesale payments.
- **Formulas & Mathematical Logic**:
  - $\text{Gross Commercial Margin} = \text{Revenue HT} - \text{Purchase Cost HT}$
  - $\text{Days Sales Outstanding (DSO)} = \frac{\text{Trade Receivables}}{\text{Total Credit Sales}} \times 365$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Fulfillment & Dispatch Flow* — Orders prepared today (42 orders), pending delivery notes (12 BLs), hourly warehouse shipping curve, monthly commercial turnover target bar.
  - **Pod 2 (Top-Right)**: *Client Balances & Credit Aging* — Active B2B clients (180), pending commercial quotes (15 Devis), Dark Espresso `#1F1D1B` Card: **Overdue Client Receivables ($>30\text{d}$)** (1,850,000 DZD), 4-week sales volume bar chart.
  - **Pod 3 (Bottom-Left)**: *Commercial Margin & Fiscal Trajectory* — Gross margin, net revenue HT, TVA & Timbre fiscal liabilities, 30-day revenue curve, 4 KPIs (Gross Margin 24.8%, Days Sales Outstanding 34d, Average Order Value 145,000 DZD, Stock Turn Days 22d).
  - **Pod 4 (Bottom-Right)**: *Product Family Mix & Credit Guardian* — Revenue by product family donut, customer credit term distribution histogram, Dark Espresso **Credit Limit Guardian** with client default risk monitor (90%), shortcuts (`Nouveau Bon de Livraison`, `Facturation Groupée`, `Transfert Inter-Dépôts`).

---

### Category 9: Medical Polyclinic, Cabinet & Healthcare (`medical_clinic`)
- **Core Purpose**: Manage waiting room triage queues, calculate physician fee commission splits, monitor CNAS/CASNOS Tiers-Payant claims, and prevent drug contraindications.
- **Formulas & Mathematical Logic**:
  - $\text{Average Patient Wait Time} = \frac{\sum (\text{Consultation Start Time} - \text{Patient Check-In Time})}{\text{Total Patients Seen}}$
  - $\text{Tiers-Payant Pending Balance} = \sum \text{CNAS/CASNOS Claims Billed} - \sum \text{Reimbursements Received}$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Waiting Room & Patient Flow* — Patients waiting right now (14 patients), consultations completed today (38 acts), hourly patient throughput curve, daily clinic receipts target progress bar.
  - **Pod 2 (Top-Right)**: *Patient Base & Doctor Roster* — Registered patient files (3,400), appointments scheduled this week (160), Dark Espresso `#1F1D1B` Card: **CNAS 30-Day Sick Leave Regulatory Audit** (4 files approaching statutory limit), 4-week patient consultation volume histogram.
  - **Pod 3 (Bottom-Left)**: *Clinic P&L & Tiers-Payant Cash* — Net clinic profit, doctor fee payouts, medical consumable replenishment costs, 30-day cash curve, 4 KPIs (Average Wait Time 18 min, Tiers-Payant Pending 620,000 DZD, Patient Follow-Up Rate 78%, Consumable Cost/Act 650 DZD).
  - **Pod 4 (Bottom-Right)**: *Medical Specialties & Safety Guardian* — Acts by specialty donut (Médecine Générale 45%, Pédiatrie 25%, Gynécologie 18%, Cardiologie 12%), patient age group distribution histogram, Dark Espresso **Prescription Safety Guardian** with drug interaction and allergy lockout ring (99%), shortcuts (`Nouvelle Ordonnance`, `Arrêt de Travail CNAS`, `Clôture Caisse Médicale`).

---

### Category 10: Auto Repair Garage, Body Shop & Fleet Maintenance (`auto_garage`)
- **Core Purpose**: Monitor vehicle lift occupancy, track mechanics' labor efficiency, accelerate spare parts requisition turnaround, and ensure Article 317 stamp compliance on cash repair invoices.
- **Formulas & Mathematical Logic**:
  - $\text{Bay Productivity Rate} = \frac{\text{Billed Labor Hours}}{\text{Clocked Mechanic Working Hours}} \times 100$
  - $\text{Parts Gross Margin} = \frac{\text{Parts Selling Price} - \text{Parts Purchase Price}}{\text{Parts Selling Price}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Repair Bays & Lift Workload* — Active bays occupied (7 / 8 Lifts), vehicles checked in today (12 cars), hourly repair order velocity curve, daily workshop turnover target bar.
  - **Pod 2 (Top-Right)**: *Vehicle Workload & Estimates* — Work orders in progress (18), pending quotes (6 Devis), Dark Espresso `#1F1D1B` Card: **Vehicles Blocked Awaiting Parts** (4 vehicles), 4-week repair order volume bar chart.
  - **Pod 3 (Bottom-Left)**: *Workshop P&L & Parts Margin* — Net garage profit, labor turnover, spare parts margin, 30-day revenue curve, 4 KPIs (Lift Utilization 87.5%, Labor Efficiency 94%, Parts Gross Margin 32%, Average Repair Ticket 48,000 DZD).
  - **Pod 4 (Bottom-Right)**: *Repair Category Mix & Fleet Guardian* — Work orders by type donut (Mécanique Lourde 40%, Vidange/Entretien 30%, Tôlerie/Peinture 20%, Électricité 10%), vehicle mileage distribution histogram, Dark Espresso **Fleet Service Guardian** with preventive maintenance interval radar (93%), shortcuts (`Nouvel Ordre Réparation`, `Devis WhatsApp`, `Sortie Pièces Magasin`).

---

### Category 11: Real Estate Brokerage, Rental Management & Syndic (`real_estate`)
- **Core Purpose**: Track mandate acquisition (Décret 09-18), accelerate days on market, enforce rental quittance stamp duty (Art. 317), and simulate notary deed fees (Décret 08-243).
- **Formulas & Mathematical Logic**:
  - $\text{Average Days on Market (DOM)} = \frac{\sum (\text{Closing Date} - \text{Listing Date})}{\text{Total Properties Sold/Leased}}$
  - $\text{Rental Collection Rate} = \frac{\text{Rents Collected}}{\text{Total Rents Due in Managed Portfolio}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Field Visits & Agency Activity* — Property visits scheduled today (8 visits), signed Bon de Visite forms (6), weekly client tour activity curve, monthly commission target bar.
  - **Pod 2 (Top-Right)**: *Property Portfolio & Mandates* — Active property listings (64), new mandates this month (12), Dark Espresso `#1F1D1B` Card: **Rental Arrears Overdue ($>45\text{d}$)** (8 tenants, 680,000 DZD), 4-week mandate acquisition histogram.
  - **Pod 3 (Bottom-Left)**: *Agency Commissions & Quittance P&L* — Net broker commission income, gross transaction volume, landlord payouts, 30-day cash curve, 4 KPIs (Exclusive Mandate Rate 42%, Average Days on Market 38d, Rental Collection Rate 96.2%, Notary Closing Success 92%).
  - **Pod 4 (Bottom-Right)**: *Property Category Mix & Legal Guardian* — Portfolio mix donut (Appartements 50%, Villas 25%, Locaux Commerciaux 15%, Terrains 10%), lease tenure distribution histogram, Dark Espresso **Mandate Legal Guardian** with Décret 09-18 compliance validity monitor (97%), shortcuts (`Nouveau Mandat`, `Quittance de Loyer`, `Simulateur Notaire`).

---

### Category 12: Light Manufacturing, Production & Workshop BOM (`manufacturing_production`)
- **Core Purpose**: Maximize Overall Equipment Effectiveness (OEE / TRS), track scrap rejection rates, manage multi-level Bill of Materials (BOM) consumption, and comply with Décret 05-468 material transfers.
- **Formulas & Mathematical Logic**:
  - $\text{OEE / TRS \%} = \text{Availability} \times \text{Performance} \times \text{Quality} \times 100$
  - $\text{Scrap Rate} = \frac{\text{Defective / Rejected Pieces}}{\text{Total Pieces Produced}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Workshop Floor & Machine Centers* — Active machines running (5 / 6 Stations), finished units produced today (1,450 pcs), hourly production throughput curve, daily production quota progress bar.
  - **Pod 2 (Top-Right)**: *Work Orders & Raw Materials* — Active production orders (OF) (8), scheduled runs (4), Dark Espresso `#1F1D1B` Card: **Critical Raw Material Shortage** (2 raw alloys $< \text{safety threshold}$), 4-week production output histogram.
  - **Pod 3 (Bottom-Left)**: *Manufacturing P&L & Cost Accounting* — Net production value, direct operator wages, raw material consumption, 30-day manufacturing value curve, 4 KPIs (OEE / TRS 84.5%, Scrap Rejection Rate 1.8%, BOM Cost Variance 2.1%, On-Time Delivery 96%).
  - **Pod 4 (Bottom-Right)**: *Product Line Mix & Quality Guardian* — Output by product line donut, machine downtime causes histogram, Dark Espresso **Quality Control Guardian** with scrap tolerance quarantine ring (98%), shortcuts (`Nouvel Ordre Fabrication`, `Bon de Sortie Matière`, `Déclaration Rebut`).

---

### Category 13: Law Firms, Notary Studies & Accounting Firms (`legal_accounting`)
- **Core Purpose**: Monitor procedural court deadlines (CPCA), reconcile fiduciary escrow balances (séquestre notarial), track attorney realization rates, and manage SCF Class 7 accounting ledgers.
- **Formulas & Mathematical Logic**:
  - $\text{Realization Rate} = \frac{\text{Billed Fee Hours}}{\text{Recorded Billable Work-in-Progress (WIP)}}$
  - $\text{Deadline Compliance Rate} = \frac{\text{Filings Submitted Before CPCA Cutoff}}{\text{Total Statutory Deadlines}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Court Hearing Roll & Calendar* — Court hearings scheduled today (6 hearings), procedural deadlines due, weekly hearing workload curve, monthly billing target progress bar.
  - **Pod 2 (Top-Right)**: *Active Matters & Retainers* — Open litigation matters (74), corporate advisory contracts (28), Dark Espresso `#1F1D1B` Card: **Urgent CPCA Statutory Deadlines ($<72\text{h}$)** (3 appeals due), 4-week case intake bar chart.
  - **Pod 3 (Bottom-Left)**: *Firm Fees & Escrow P&L* — Net partner fees, operating overhead, client trust accounts (séquestre), 30-day billings curve, 4 KPIs (Hearing Resolution Rate 78%, Deadline Accuracy 100%, WIP Recovery Rate 88%, Art. 317 Timbre Compliance 100%).
  - **Pod 4 (Bottom-Right)**: *Jurisdiction Distribution & Trust Guardian* — Matters by jurisdiction donut (Tribunal Civil 42%, Cour d'Appel 28%, Étude Notariale 20%, Conseil d'État 10%), matter age distribution histogram, Dark Espresso **Fiduciary Escrow Guardian** with trust reconciliation balance ring (99%), shortcuts (`Nouvelle Affaire`, `Répertoire Notaire`, `Calendrier CPCA`).

---

### Category 14: Logistics, Courier Express & COD Delivery (`logistics_delivery`)
- **Core Purpose**: Monitor Cash-on-Delivery (COD) cash collections, minimize return-to-origin (RTO / Retour) parcel rates, optimize 58-Wilaya linehaul transit, and automate driver discharge settlements.
- **Formulas & Mathematical Logic**:
  - $\text{First-Attempt Delivery Rate} = \frac{\text{Parcels Delivered on 1st Attempt}}{\text{Total Dispatched Parcels}} \times 100$
  - $\text{Return-to-Origin (RTO) Rate} = \frac{\text{Parcels Returned to Merchant}}{\text{Total Ingested Parcels}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Dispatch & Route Execution* — Couriers on delivery rounds right now (22 drivers), parcels in transit (840 colis), hourly delivery completion curve, daily dispatch target pacing bar.
  - **Pod 2 (Top-Right)**: *Parcel Network & Agency Volume* — Shipments in network (2,100), parcels at stop-desk agencies (340), Dark Espresso `#1F1D1B` Card: **Undelivered / Returned Parcels (RTO)** (48 parcels), 4-week parcel shipping histogram.
  - **Pod 3 (Bottom-Left)**: *COD Cash Vault & Logistics P&L* — Total COD cash collected today (3,450,000 DZD), courier commissions payable, net shipping margins, 30-day parcel volume curve, 4 KPIs (First-Attempt Success 84.2%, Return Rate 6.4%, Driver Remittance Speed 1.2d, Average Transit Time 1.8d).
  - **Pod 4 (Bottom-Right)**: *Wilaya Zone Performance & Delivery Guardian* — Shipments by zone donut (Alger Centre 45%, Nord 30%, Hauts-Plateaux 15%, Sud 10%), delivery failure reason code histogram, Dark Espresso **COD Vault Guardian** with driver cash reconciliation clearance ring (94%), shortcuts (`Créer Manifeste LVR`, `Scanner Sac-Navette`, `Clôture Caisse Chauffeur`).

---

### Category 15: General Contracting, BTP & Construction Sites (`construction_contractor`)
- **Core Purpose**: Oversee construction progress billing (Décomptes Provisoires Décret 15-247), safeguard 5% Retenue de Garantie escrow, monitor site workforce attendance, and track concrete crushing test compliance.
- **Formulas & Mathematical Logic**:
  - $\text{Décompte Net to Pay} = \text{Realized Works HT} - (5\% \text{ Retenue de Garantie} + \text{Avance Amortization} + \text{Penalties})$
  - $\text{DQE Cost Variance} = \frac{\text{Realized Sub-Lot Cost} - \text{Budgeted DQE Amount}}{\text{Budgeted DQE Amount}} \times 100$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Site Progress & Workforce Muster* — Workers active on chantiers today (148 laborers), heavy machinery operational (14 units), weekly milestone pacing curve, monthly progress billing certification bar.
  - **Pod 2 (Top-Right)**: *Chantier Portfolio & BOQ Lots* — Active construction sites (4), active sub-lots (24), Dark Espresso `#1F1D1B` Card: **5% Retenue de Garantie Escrow** (8,450,000 DZD), 4-week works progress volume bar chart.
  - **Pod 3 (Bottom-Left)**: *Contractor P&L & Décomptes Cash* — Certified progress payments received, subcontractor payouts, site material purchases, 30-day cash curve, 4 KPIs (Budget Variance -2.4%, Workforce Muster Rate 96%, Concrete Crushing Compliance 100%, Delay Penalty Exposure 0 DZD).
  - **Pod 4 (Bottom-Right)**: *Chantier Cost Mix & Safety Guardian* — Expenditure by trade lot donut (Gros Œuvre 55%, VRD 20%, Électricité/Plomberie 15%, Finitions 10%), weather stoppage days histogram, Dark Espresso **Contractual Clock Guardian** with CACOBATPH delay defense radar (98%), shortcuts (`Nouveau Décompte Provisoire`, `Journal de Chantier`, `Saisie Attachement Sous-Traitant`).

---

### Category 16: Agriculture, Concession Farming & Dairy Livestock (`agriculture_farming`)
- **Core Purpose**: Monitor daily dairy milk production, enforce phytosanitary safety remanence lockouts (INPV DAR), manage seasonal harvester piecework muster, and audit ONIL 12 DZD/L subsidy bordereaux.
- **Formulas & Mathematical Logic**:
  - $\text{ONIL Milk Subsidy} = \text{Eligible Delivery Liters} \times 12\text{ DZD/L}$
  - $\text{Piecework Harvest Wage} = \text{Harvested Crates/Quintals} \times \text{Agreed Unit Piece Rate}$
- **Pod Layout**:
  - **Pod 1 (Top-Left)**: *Live Farm Gate & Weighbridge Flow* — Harvest weighed today at weighbridge (24.5 tons), wholesale crates dispatched (420 crates), daily harvest/milking throughput curve, monthly sales target progress bar.
  - **Pod 2 (Top-Right)**: *Cultivated Land & Dairy Herd* — Total cultivated land (85 Hectares), active milking dairy cows (64 cows), Dark Espresso `#1F1D1B` Card: **Phytosanitary DAR Harvest Lockout** (Parcel B4 locked until Nov 12), 4-week agricultural output histogram.
  - **Pod 3 (Bottom-Left)**: *Farm P&L & ONIL Subsidies* — Net wholesale farm receipts, seasonal piecework wages, fertilizer/irrigation costs, 30-day cash curve, 4 KPIs (Average Milk Yield 26.5 L/Cow, Crop Yield 48 Qx/Ha, ONIL Subsidy Accrued 342,000 DZD, ANRH Water Quota Used 68%).
  - **Pod 4 (Bottom-Right)**: *Crop Acreage & Milk Safety Guardian* — Land allocation by crop family donut (Céréales 40%, Maraîchage 30%, Arboriculture 20%, Fourrage 10%), milk fat/protein quality histogram, Dark Espresso **Antibiotic Safety Guardian** with zero-contamination withholding ring (100%), shortcuts (`Ticket Pont-Bascule`, `Séance Traite du Soir`, `Pointage Tâcherons`).

---

## 5. Implementation Phasing & Build Order

- **Phase 1: Shared Pod Primitives & RBAC Guard**:
  - Implement reusable SVG graphics in a shared component (`src/components/common/dashboard/`): `PodCanvas`, `MetricPillHistogram`, `SmoothAreaSparkline`, and `ProgressRingGauge`.
  - Add RBAC redirection checks in `App.tsx` and `Sidebar.tsx` to automatically route non-authorized staff roles to their respective workbenches.
- **Phase 2: Deprecate `AnalyticsScreen.tsx`**:
  - Decommission `AnalyticsScreen.tsx`, updating all navigation links and store actions to target the active vertical's native `Dashboard`.
- **Phase 3: Core High-Velocity Dashboards Upgrade**:
  - Modernize Categories 1 to 6 (`membership_session`, `appointment_service`, `pos_inventory`, `project_milestone`, `rental_booking`, `education_cohort`) to 100% fidelity with the two-column pod layout and Screenshot 90-92 tokens.
- **Phase 4: Industrial & Specialized Verticals Upgrade**:
  - Modernize Categories 7 to 16 (`freelance_solo`, `trading_commercial`, `medical_clinic`, `auto_garage`, `real_estate`, `manufacturing_production`, `legal_accounting`, `logistics_delivery`, `construction_contractor`, `agriculture_farming`).
- **Phase 5: Localization & Strict TypeScript Verification**:
  - Verify complete tri-lingual microcopy in `src/utils/i18n.ts` (French, Arabic RTL, English).
  - Run `npm test` (all 82 tests passing), `lint_applet`, and `compile_applet`.
