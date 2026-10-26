# Master Desktop Design System Alignment Plan: Expansion Across All Remaining Categories

A comprehensive, multi-phase plan to systematically align all remaining 12 platform verticals with the **Master Desktop Design System Standard** established in **Category 14 (Venue & Event Rentals)** and recently verified in **Category 6 (Retail POS)**, **Category 7 (Salon & Beauty)**, and **B2B Trading & Commercial**.

---

## User Review & Critical Confirmation

> [!IMPORTANT]
> **Scope Confirmation**: This plan covers the **12 remaining platform categories** (totaling 67 modular screens) to achieve 100% design system uniformity across the entire Atrium platform.
>
> - **Gold Standard Benchmark**: Category 14 (Venue & Event Rentals)
> - **Already Aligned (4 Categories / 26 Screens)**:
>   1. Category 14: Universal Rentals & Venue (`rental_booking`) — *Benchmark Reference*
>   2. Category 17: B2B Trading & Commercial (`trading_commercial`) — *Aligned*
>   3. Category 6: Retail POS & Restaurant (`pos_inventory`) — *Aligned*
>   4. Category 7: Salon Appointments & Beauty Services (`appointment_service`) — *Aligned*
> - **Target of This Plan (12 Remaining Categories / 67 Screens)**:
>   - **Phase 1 (Core Service & Project Verticals)**:
>     - Category 1: Gym & Fitness (`membership_session`) — 7 screens
>     - Category 13: Projects & Agency (`project_milestone`) — 6 screens
>     - Category 15: Education & Academy (`education_cohort`) — 7 screens
>     - Category 16: Freelancers & Solo Studio (`freelance_solo`) — 7 screens
>   - **Phase 2 (Specialized Clinical, Field & Automotive Operations)**:
>     - Category 18: Medical Clinic & Healthcare (`medical_clinic`) — 5 screens
>     - Category 19: Automotive Repair, Garages & Fleet (`auto_garage`) — 5 screens
>     - Category 20: Real Estate Brokerage & Property Leases (`real_estate`) — 5 screens
>     - Category 21: Light Manufacturing & Production BOM (`manufacturing_production`) — 5 screens
>   - **Phase 3 (Heavy Commercial, BTP, Logistics & Primary Sector)**:
>     - Category 22: Law Firms & Accounting Cabinets (`legal_accounting`) — 5 screens
>     - Category 23: Couriers, Parcel Dispatch & COD Logistics (`logistics_delivery`) — 5 screens
>     - Category 24: BTP, General Contracting & Progress Billings (`construction_contractor`) — 5 screens
>     - Category 25: Agro-Business, Crop Parcels & Livestock (`agriculture_farming`) — 6 screens

---

## 1. The 5 Non-Negotiable Design System Laws

Every screen across every category must strictly adhere to these 5 architectural laws derived from the Category 14 gold standard:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE 5 DESKTOP DESIGN SYSTEM LAWS                                │
├──────────────────────┬──────────────────────┬───────────────────┬──────────────────────┤
│ 1. Outer Workspace   │ 2. Elevated Pod Tray │ 3. Canonical 3-   │ 4. Bottom Workstation│
│ Panel (rounded-[28px]│ (#F8F9FA container,  │ Card Top Grid     │ Pod Tray (Toolbar,   │
│ bg-white, border     │ rounded-[24px], p-5, │ Card 3: Dark      │ 72px table rows, or  │
│ #E9EEF0, no pb-16)   │ icon header & text)  │ Espresso (#1F1D1B)│ dense card matrix)   │
├──────────────────────┴──────────────────────┼───────────────────┴──────────────────────┤
│ 5. Navigation Purity & Zero Double-Nav                                                 │
│ View switchers (Grid/List/Matrix) strictly toggle perspectives on the current dataset. │
│ Never duplicate dedicated sidebar screen destinations inside local sub-tabs.           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Token & Layout Specifications

1. **Outer Workspace Shell**:
   - Container class: `bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs`
   - **Zero trailing padding**: Strictly eliminate `pb-16` or unbounded bottom padding on outer panels.
   - Screen header: Title + category badge + facility selector dropdown + quick action / demo seed button.

2. **Elevated Pod Tray Architecture**:
   - Container class: `bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4`
   - Top Pod Tray Header: Left icon + bold title + descriptive subtitle; Right view switcher or filter capsules.

3. **Strict 3-Card Top Metrics Grid (`h-[124px]`)**:
   - Grid layout: `grid grid-cols-1 sm:grid-cols-3 gap-4`
   - Fixed height: `h-[124px]` for perfect visual baseline.
   - **Card 1 & Card 2 (Pure White Cards)**:
     - `p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]`
     - Top: Metric label + status pill (`bg-emerald-50 text-emerald-600` or `bg-blue-50 text-blue-600`).
     - Bottom: High-contrast primary number with `tabular-nums` and font-mono.
   - **Card 3 (Dark Espresso Anchor Card)**:
     - `p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm`
     - Top: Label (`text-neutral-300`) + Amber badge (`bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[11px] font-semibold`).
     - Bottom: High-contrast monetary or operational anchor figure with optional SVG mini sparkline.
   - **Rule**: Absolutely no 4-card metric grids. 4-column metric layouts must be consolidated into the canonical 3-card structure.

4. **Bottom Universal Collection / Workstation Pod Tray**:
   - Container class: `bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs`
   - Integrated Toolbar Row: Icon + Title + Count Badge, Status Filter Pills, `Seek` Kinetic Search bar, CSV Export / Filter buttons.
   - Content: Standardized 72px table rows with action menus or dense card matrix (`rounded-[16px]` or `rounded-[20px]`).

5. **Loose Component Enclosure**:
   - All floating breakdown cards, tender distribution tiles, and secondary ledgers must be enclosed in their own dedicated elevated Pod Trays with header icons.

---

## 2. Category-by-Category Alignment Matrix & Execution Plan

### Phase 1: Core Service & Project Verticals (27 Screens)

#### 1. Category 1: Gym & Fitness Membership (`membership_session`) — 7 Screens
- **`MembershipDashboardView.tsx`**:
  - Refactor older dual-column layout to canonical Outer Workspace Panel (`rounded-[28px]`).
  - Top Metrics Pod Tray: Card 1 (Total Active Members), Card 2 (Today Turnstile Admissions), Card 3 Dark Espresso Anchor (Today Revenue & Subscription Vault).
  - Bottom Collection Pod: Member live presence roster & quick check-in workstation.
- **`MembershipMembersView.tsx`**:
  - Top Metrics Pod Tray: Card 1 (Active Subscriptions), Card 2 (Expiring Soon < 7 Days), Card 3 Dark Espresso Anchor (Membership AR & Unpaid Balances).
  - Bottom Pod: Directory table with RFID search, status pills, and 390px sliding inspector.
- **`MembershipRegistrationsView.tsx`**:
  - Top Metrics: Card 1 (New Lead Inquiries), Card 2 (Trial Sessions Scheduled), Card 3 Dark Espresso Anchor (Lead Pipeline Value).
  - Bottom Pod: Admissions Kanban & Intake table.
- **`MembershipSchedulerView.tsx`**:
  - Top Metrics: Card 1 (Scheduled Classes Today), Card 2 (Studio Capacity & Attendance %), Card 3 Dark Espresso Anchor (Instructor Payroll Hours).
  - Bottom Pod: Interactive class timetable & room scheduler.
- **`MembershipShopView.tsx`**:
  - Top Metrics: Card 1 (Supplements & Merchandise Sales), Card 2 (Low Stock Alerts), Card 3 Dark Espresso Anchor (Boutique Cash Register).
  - Bottom Pod: Supplements POS register & barcode lookup workstation.
- **`MembershipFinanceView.tsx`**:
  - Consolidate to canonical 3-card grid: Card 1 (Subscription Gross Collections), Card 2 (Coach Payroll Disbursed), Card 3 Dark Espresso Anchor (Net Operating Cash Flow).
  - Enclose tender breakdown into elevated Pod Tray.
- **`MembershipHistoryView.tsx`**:
  - Top Metrics: Card 1 (Turnstile Scans 24h), Card 2 (Sales Tickets), Card 3 Dark Espresso Anchor (Audit Compliance Score 100%).
  - Bottom Pod: Universal audit log table.

#### 2. Category 13: Projects & Agency (`project_milestone`) — 6 Screens
- **`ProjectDirectionView.tsx`**:
  - Top Metrics: Card 1 (Active Retainers & Projects), Card 2 (On-Time Milestones Rate), Card 3 Dark Espresso Anchor (Agency Total Billing Volume).
  - Bottom Pod: Project pipeline master portfolio.
- **`ProjectChefProjetView.tsx`**:
  - Top Metrics: Card 1 (In-Progress Sprints), Card 2 (Pending Deliverable Reviews), Card 3 Dark Espresso Anchor (Budget Burn Rate).
  - Bottom Pod: Milestone timeline & task matrix.
- **`ProjectCreaView.tsx`**:
  - Top Metrics: Card 1 (Creative Assets Queued), Card 2 (Client BAT Approvals), Card 3 Dark Espresso Anchor (Studio Time Valuation).
  - Bottom Pod: Asset proofs & deliverable cards.
- **`ProjectSuperviseurView.tsx`**:
  - Top Metrics: Card 1 (Field Site Audits), Card 2 (Incident Tickets), Card 3 Dark Espresso Anchor (Compliance SLA Rate).
  - Bottom Pod: QA supervisor inspection logs.
- **`ProjectRhView.tsx`**:
  - Top Metrics: Card 1 (Active Talent in 58 Wilayas), Card 2 (Contract Renewals Due), Card 3 Dark Espresso Anchor (Monthly Payroll Disbursed).
  - Bottom Pod: Talent directory & Wilaya map roster.
- **`ProjectComptaView.tsx`**:
  - Top Metrics: Card 1 (Invoices Issued), Card 2 (Outstanding Client AR), Card 3 Dark Espresso Anchor (PTT CCP SFP 01 Postal Liquidity).
  - Bottom Pod: Official Algerian billing ledger & CCP slip workstation.

#### 3. Category 15: Education & Academy (`education_cohort`) — 7 Screens
- **`EducationDashboardView.tsx`**:
  - Top Metrics: Card 1 (Enrolled Students), Card 2 (Active Cohorts & Classrooms), Card 3 Dark Espresso Anchor (Tuition Collections DZD).
  - Bottom Pod: Daily timetable & session dispatch pod.
- **`EducationStudentsView.tsx`**:
  - Top Metrics: Card 1 (Total Active Students), Card 2 (Attendance Rate %), Card 3 Dark Espresso Anchor (Tuition Balance Due).
  - Bottom Pod: Student roster directory & guardian CRM.
- **`EducationCohortsView.tsx`**:
  - Top Metrics: Card 1 (Running Cohorts), Card 2 (Seat Fill Rate), Card 3 Dark Espresso Anchor (Tuition Value per Cohort).
  - Bottom Pod: Cohort cards & course curriculum tables.
- **`EducationAdmissionsView.tsx`**:
  - Top Metrics: Card 1 (Placement Test Inquiries), Card 2 (Trial Lessons Booked), Card 3 Dark Espresso Anchor (Intake Pipeline Forecast).
  - Bottom Pod: Admissions pipeline kanban.
- **`EducationTimetableView.tsx`**:
  - Top Metrics: Card 1 (Class Sessions Today), Card 2 (Instructor Utilization %), Card 3 Dark Espresso Anchor (Room Conflict Alerts: 0).
  - Bottom Pod: Classroom assignment matrix & calendar.
- **`EducationAttendanceView.tsx`**:
  - Top Metrics: Card 1 (Present Students Today), Card 2 (Excused/Unexcused Absences), Card 3 Dark Espresso Anchor (Roll Call Compliance Rate).
  - Bottom Pod: Gradebook matrix & attendance roll call logs.
- **`EducationFinanceView.tsx`**:
  - Top Metrics: Card 1 (Tuition Invoiced), Card 2 (Overdue Installments), Card 3 Dark Espresso Anchor (Tuition Vault & PTT Settlements).
  - Bottom Pod: Student installment plan ledger.

#### 4. Category 16: Freelancers & Solo Studio (`freelance_solo`) — 7 Screens
- **`FreelanceDashboardView.tsx`**:
  - Top Metrics: Card 1 (Active Client Projects), Card 2 (Unbilled Billable Hours), Card 3 Dark Espresso Anchor (Monthly Net Earnings DZD).
  - Bottom Pod: Active focus tracker & urgent deliverables.
- **`FreelanceClientsView.tsx`**:
  - Top Metrics: Card 1 (Retainer Clients), Card 2 (Proposals Pending), Card 3 Dark Espresso Anchor (Average Client Lifetime Value).
  - Bottom Pod: Client CRM directory with invoice history.
- **`FreelanceDeliverablesView.tsx`**:
  - Top Metrics: Card 1 (Deliverables In Progress), Card 2 (Pending Client Sign-Off), Card 3 Dark Espresso Anchor (Completed Milestones Value).
  - Bottom Pod: Deliverables Kanban board.
- **`FreelanceTimeTrackerView.tsx`**:
  - Top Metrics: Card 1 (Tracked Hours This Week), Card 2 (Billable Ratio %), Card 3 Dark Espresso Anchor (Hourly Rate Realized).
  - Bottom Pod: Live stopwatch workstation & timesheet table.
- **`FreelanceInvoicesView.tsx`**:
  - Top Metrics: Card 1 (Paid Invoices MTD), Card 2 (Overdue Invoices), Card 3 Dark Espresso Anchor (Outstanding AR DZD).
  - Bottom Pod: Multilingual invoice table & generator.
- **`FreelanceProposalsView.tsx`**:
  - Top Metrics: Card 1 (Draft Proposals), Card 2 (Sent Devis Pipeline), Card 3 Dark Espresso Anchor (Won Contracts Value).
  - Bottom Pod: Proposals & scope estimate cards.
- **`FreelanceFinanceView.tsx`**:
  - Top Metrics: Card 1 (Gross Invoiced), Card 2 (Auto-Entrepreneur 5% Tax Reserve), Card 3 Dark Espresso Anchor (Take-Home Net Profit).
  - Bottom Pod: Tax reserve simulator & expense logs.

---

### Phase 2: Specialized Clinical, Field & Automotive Operations (20 Screens)

#### 5. Category 18: Medical Clinic & Healthcare (`medical_clinic`) — 5 Screens
- **`MedicalDashboardView.tsx`**:
  - Top Metrics: Card 1 (Consultations Today), Card 2 (Patients in Waiting Room), Card 3 Dark Espresso Anchor (Clinic Day Fees & Acts DZD).
  - Bottom Pod: Live consultation queue & triage table.
- **`MedicalPatientsView.tsx`**:
  - Top Metrics: Card 1 (Active Patient Files), Card 2 (Chronic Care Follow-ups), Card 3 Dark Espresso Anchor (Consultation History Total).
  - Bottom Pod: Medical records directory & CHU/clinic insurance tags.
- **`MedicalQueueView.tsx`**:
  - Top Metrics: Card 1 (Waiting Room Count), Card 2 (Average Wait Time), Card 3 Dark Espresso Anchor (Doctor Availability Status).
  - Bottom Pod: Patient queue workstation & room calling panel.
- **`MedicalPrescriptionsView.tsx`**:
  - Top Metrics: Card 1 (Prescriptions Issued), Card 2 (Controlled Substances Logged), Card 3 Dark Espresso Anchor (Regulatory Compliance 100%).
  - Bottom Pod: Ordonnance & posology slip archive.
- **`MedicalBillingView.tsx`**:
  - Top Metrics: Card 1 (Gross Consultations & Acts), Card 2 (CNAS / CASNOS Insurance Share), Card 3 Dark Espresso Anchor (Patient Direct Cash Vault).
  - Bottom Pod: Fee schedule & clinical receipts ledger.

#### 6. Category 19: Automotive Repair, Garages & Fleet (`auto_garage`) — 5 Screens
- **`AutoGarageDashboardView.tsx`**:
  - Top Metrics: Card 1 (Vehicles on Lifts / In Bays), Card 2 (Pending Diagnostics & Devis), Card 3 Dark Espresso Anchor (Work Order Billings DZD).
  - Bottom Pod: Workshop floor bay status & vehicle reception.
- **`AutoGarageVehiclesView.tsx`**:
  - Top Metrics: Card 1 (Registered Fleet / Client Cars), Card 2 (Scheduled Technical Inspections), Card 3 Dark Espresso Anchor (Service History Value).
  - Bottom Pod: Vehicle registry with VIN / matricule search.
- **`AutoGarageOrdersView.tsx`**:
  - Top Metrics: Card 1 (Open Repair Orders), Card 2 (Awaiting Spare Parts), Card 3 Dark Espresso Anchor (Repair Orders Invoiced Value).
  - Bottom Pod: OR repair order tracking table.
- **`AutoGaragePartsView.tsx`**:
  - Top Metrics: Card 1 (Stocked Spare Parts Count), Card 2 (Low Stock Reorder Alerts), Card 3 Dark Espresso Anchor (Inventory Valuation DZD).
  - Bottom Pod: Spare parts catalog & supplier reference workstation.
- **`AutoGarageBillingView.tsx`**:
  - Top Metrics: Card 1 (Labor Hours Billed), Card 2 (Parts Margins Realized), Card 3 Dark Espresso Anchor (Garage Net Operating Cash).
  - Bottom Pod: Repair invoices & payment tenders.

#### 7. Category 20: Real Estate Brokerage & Property Leases (`real_estate`) — 5 Screens
- **`RealEstateDashboardView.tsx`**:
  - Top Metrics: Card 1 (Managed Properties), Card 2 (Active Lease Occupancy %), Card 3 Dark Espresso Anchor (Monthly Rent Roll Collections).
  - Bottom Pod: Property portfolio radar & lease expirations.
- **`RealEstatePropertiesView.tsx`**:
  - Top Metrics: Card 1 (Available Units for Rent/Sale), Card 2 (Under Negotiation), Card 3 Dark Espresso Anchor (Portfolio Asset Valuation).
  - Bottom Pod: Property listings grid & building inventory.
- **`RealEstateLeasesView.tsx`**:
  - Top Metrics: Card 1 (Active Contracts), Card 2 (Renewals Due < 30 Days), Card 3 Dark Espresso Anchor (Security Deposits Held in Escrow).
  - Bottom Pod: Lease contract registry & tenant CRM.
- **`RealEstateInspectionsView.tsx`**:
  - Top Metrics: Card 1 (Entry/Exit Inspections Scheduled), Card 2 (Disputed Damage Claims), Card 3 Dark Espresso Anchor (Inspection Pass Rate).
  - Bottom Pod: State of repair (État des lieux) audit logs.
- **`RealEstateFinanceView.tsx`**:
  - Top Metrics: Card 1 (Gross Rent Invoiced), Card 2 (Agency Commission Fees), Card 3 Dark Espresso Anchor (Owner Disbursals Vault).
  - Bottom Pod: Rent collection receipts & landlord statements.

#### 8. Category 21: Light Manufacturing & Production BOM (`manufacturing_production`) — 5 Screens
- **`ManufacturingDashboardView.tsx`**:
  - Top Metrics: Card 1 (Active Work Orders), Card 2 (Machine Utilization %), Card 3 Dark Espresso Anchor (Finished Goods Production Value).
  - Bottom Pod: Production line queue & workshop floor radar.
- **`ManufacturingOrdersView.tsx`**:
  - Top Metrics: Card 1 (Production Runs Scheduled), Card 2 (Work In Progress Units), Card 3 Dark Espresso Anchor (Manufacturing Cost of Goods).
  - Bottom Pod: Work order dispatch & batch completion table.
- **`ManufacturingBomView.tsx`**:
  - Top Metrics: Card 1 (Defined Product BOMs), Card 2 (Multi-Tier Assemblies), Card 3 Dark Espresso Anchor (Target Unit Cost Variance).
  - Bottom Pod: Bill of Materials tree & ingredient workstation.
- **`ManufacturingMaterialsView.tsx`**:
  - Top Metrics: Card 1 (Raw Material SKUs), Card 2 (Safety Stock Breaches), Card 3 Dark Espresso Anchor (Raw Materials Stock Valuation).
  - Bottom Pod: Warehouse stock bin table & lot tracking.
- **`ManufacturingQcView.tsx`**:
  - Top Metrics: Card 1 (Quality Tests Performed), Card 2 (Rejection / Scrap Count), Card 3 Dark Espresso Anchor (First-Pass Yield %).
  - Bottom Pod: Quality assurance log & defect tracking.

---

### Phase 3: Heavy Commercial, BTP, Logistics & Primary Sector (20 Screens)

#### 9. Category 22: Law Firms & Accounting Cabinets (`legal_accounting`) — 5 Screens
- **`LegalDashboardView.tsx`**:
  - Top Metrics: Card 1 (Active Court Matters & Clients), Card 2 (Upcoming Hearing Deadlines), Card 3 Dark Espresso Anchor (Trust & Retainer Account Balance).
  - Bottom Pod: Urgent court docket & matter summary.
- **`LegalMattersView.tsx`**:
  - Top Metrics: Card 1 (Litigation Cases), Card 2 (Advisory & Corporate Files), Card 3 Dark Espresso Anchor (Total Matter Retainers).
  - Bottom Pod: Legal case files registry & opposing counsel CRM.
- **`LegalHearingsView.tsx`**:
  - Top Metrics: Card 1 (Audience Dates This Month), Card 2 (Pleading Delays Pending), Card 3 Dark Espresso Anchor (Tribunal Jurisdiction Coverage).
  - Bottom Pod: Court calendar & hearing outcomes.
- **`LegalTrustView.tsx`**:
  - Top Metrics: Card 1 (Client Escrow Deposits), Card 2 (Court Fee Advances Disbursed), Card 3 Dark Espresso Anchor (CARPA / Trust Account Balance).
  - Bottom Pod: Trust account ledger & reconciliation pod.
- **`LegalVaultView.tsx`**:
  - Top Metrics: Card 1 (Secured Legal Deeds), Card 2 (Notarized Original Contracts), Card 3 Dark Espresso Anchor (Vault Integrity 100%).
  - Bottom Pod: Legal vault document archive & check-out logs.

#### 10. Category 23: Couriers, Parcel Dispatch & COD Logistics (`logistics_delivery`) — 5 Screens
- **`LogisticsDashboardView.tsx`**:
  - Top Metrics: Card 1 (Parcels in Transit), Card 2 (Delivered Today), Card 3 Dark Espresso Anchor (Cash on Delivery (COD) Collected DZD).
  - Bottom Pod: Real-time parcel dispatch & courier assignment workstation.
- **`LogisticsShipmentsView.tsx`**:
  - Top Metrics: Card 1 (Total Shipments), Card 2 (Return to Sender (RTS) Rate), Card 3 Dark Espresso Anchor (Shipment Shipping Revenue).
  - Bottom Pod: Master tracking table with Wilaya hub filters.
- **`LogisticsScannerView.tsx`**:
  - Top Metrics: Card 1 (Parcels Scanned Today), Card 2 (Hub Transfer Handshakes), Card 3 Dark Espresso Anchor (Scanner Accuracy 100%).
  - Bottom Pod: Rapid barcode/QR scanner intake workstation.
- **`LogisticsManifestsView.tsx`**:
  - Top Metrics: Card 1 (Dispatched Truck Runs), Card 2 (Wilaya Inter-Hub Routes), Card 3 Dark Espresso Anchor (Freight Manifest Cargo Weight).
  - Bottom Pod: Dispatch manifests & driver road sheets.
- **`LogisticsCodView.tsx`**:
  - Top Metrics: Card 1 (COD Collected at Doorstep), Card 2 (Pending Driver Remittances), Card 3 Dark Espresso Anchor (Merchant COD Settlement Vault).
  - Bottom Pod: Driver cash closeout & merchant payout workstation.

#### 11. Category 24: BTP, General Contracting & Progress Billings (`construction_contractor`) — 5 Screens
- **`ContractorDashboardView.tsx`**:
  - Top Metrics: Card 1 (Active Construction Sites), Card 2 (Safety Incidents (Zero)), Card 3 Dark Espresso Anchor (Contract Progress Billing Volume DZD).
  - Bottom Pod: Active job site status & milestone progress.
- **`ContractorSitesView.tsx`**:
  - Top Metrics: Card 1 (Open Site Projects), Card 2 (Site Work In Progress (WIP)), Card 3 Dark Espresso Anchor (Total Contract Value).
  - Bottom Pod: Construction site registry with Wilaya location.
- **`ContractorBoqView.tsx`**:
  - Top Metrics: Card 1 (Bill of Quantities (BOQ) Line Items), Card 2 (Approved Unit Rates), Card 3 Dark Espresso Anchor (Total BOQ Estimate DZD).
  - Bottom Pod: Detail BOQ cost estimation table & margin analysis.
- **`ContractorDailyLogsView.tsx`**:
  - Top Metrics: Card 1 (Daily Site Logs Filed), Card 2 (Weather Delay Days), Card 3 Dark Espresso Anchor (On-Site Labor Hours Logged).
  - Bottom Pod: Site diary, weather conditions, equipment & subcontractor logs.
- **`ContractorBillingView.tsx`**:
  - Top Metrics: Card 1 (Progress Situations Approved), Card 2 (10% Retenue de Garantie Held), Card 3 Dark Espresso Anchor (Net Contractor Cash Received).
  - Bottom Pod: Official Algerian BTP Progress Billings (Situations de Travaux) ledger.

#### 12. Category 25: Agro-Business, Crop Parcels & Livestock (`agriculture_farming`) — 6 Screens
- **`AgricultureDashboardView.tsx`**:
  - Top Metrics: Card 1 (Cultivated Parcels (Hectares)), Card 2 (Active Biological Cycles), Card 3 Dark Espresso Anchor (Seasonal Crop Harvest Valuation).
  - Bottom Pod: Farm parcel map overview & operational alerts.
- **`AgricultureParcelsView.tsx`**:
  - Top Metrics: Card 1 (Total Registered Land Parcels), Card 2 (Irrigation Status %), Card 3 Dark Espresso Anchor (Hectare Asset Valuation).
  - Bottom Pod: Parcel registry with soil type & water rights.
- **`AgricultureCyclesView.tsx`**:
  - Top Metrics: Card 1 (Active Growing Cycles), Card 2 (Phonological Stage Milestones), Card 3 Dark Espresso Anchor (Cycle Input Costs (Seeds/Fertilizer)).
  - Bottom Pod: Crop planting and development timeline.
- **`AgricultureLivestockView.tsx`**:
  - Top Metrics: Card 1 (Head of Livestock (Bovin/Ovin)), Card 2 (Veterinary Vaccinations Up to Date), Card 3 Dark Espresso Anchor (Herd Market Valuation).
  - Bottom Pod: Animal ear-tag registry & health cards.
- **`AgricultureHarvestView.tsx`**:
  - Top Metrics: Card 1 (Harvest Yield (Quintals/Tons)), Card 2 (Cold Storage Capacity Utilized), Card 3 Dark Espresso Anchor (Harvest Value in Silos).
  - Bottom Pod: Yield logs & storage bin allocation.
- **`AgricultureWholesaleView.tsx`**:
  - Top Metrics: Card 1 (Wholesale Truckloads Sold), Card 2 (Produce Market (Marché de Gros) Orders), Card 3 Dark Espresso Anchor (Agro Gross Sales Vault).
  - Bottom Pod: Wholesale produce sales slips & merchant settlement table.

---

## 3. Systematic Execution Protocol

For each screen across each category:

1. **Outer Workspace Envelope**:
   - Wrap in `bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs`.
   - Remove any trailing `pb-16` or unbounded margins.
2. **Top Metrics Pod Tray**:
   - Wrap in `bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4`.
   - Render header with icon, title, and descriptive subtitle.
   - Render canonical 3-card grid (`grid-cols-1 sm:grid-cols-3 gap-4`, `h-[124px]`).
   - Implement Card 3 as the Dark Espresso Anchor Card (`#1F1D1B`, `#3D2817` amber badge `#FB923C`, sparkline, monetary total).
3. **Bottom Universal Collection / Workstation Pod Tray**:
   - Wrap in `bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs`.
   - Embed toolbar with title, item count badge, `Seek` input, filter pills, and actions.
   - Standardize table rows or item cards with `rounded-[16px]` or `rounded-[20px]`.
4. **Compile & Lint Verification**:
   - Validate with `tsc --noEmit` and `compile_applet` with zero regressions.
