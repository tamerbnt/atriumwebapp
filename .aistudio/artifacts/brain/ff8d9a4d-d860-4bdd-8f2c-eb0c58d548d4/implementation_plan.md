# Master UI/UX Standardization Plan: Universal Data Collection & Kinetic Hover Template

A unified architectural and visual standardization plan elevating all entity rosters, catalogs, directories, and registries across all 16 verticals in Atrium ERP & CRM to match the **Membership Clients Screen (`MembershipMembersView.tsx`)** gold standard. Delivers the dual List/Grid view toggle, the 6-button kinetic hover fan-arc effect on cards, dynamic hover action nodes on list rows, domain-tailored contextual action buttons, and the interactive 390px inline side inspector panel on selection.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following three core architectural decisions have been confirmed and form the foundation of this master rollout:

- **Confirmed Decision 1: Scope of Grid/List Dual Toggle & Hover Fan-Arc**: All primary entity rosters, directories, catalogs, and physical asset screens across all 16 categories will adopt the full dual List/Grid toggle with the animated 6-button hover fan-arc effect.
- **Confirmed Decision 2: Contextual Domain Actions on Hover**: Rather than generic actions, each entity type receives custom domain actions tailored to its operational workflow (e.g., *Prescribe / Vitals* for Medical Patients, *Diagnose / New OR* for Garage Vehicles, *Irrigate / Soil Test* for Agriculture Parcels, *Pleading / Docket* for Legal Matters, *Dispatch / Collect COD* for Logistics Shipments, *BOQ / Daily Log* for Construction Sites).
- **Confirmed Decision 3: 390px Inline Side Inspector Panel**: Entity screens adopt the 390px inline side inspector drawer on row or card selection, displaying detailed tabbed dossiers, quick actions, contact records, and metadata without navigation context loss.
- **Decision on Specialized Views**: Pure transactional execution interfaces (e.g., *Cash Register POS terminal*, *Barcode Scanner camera intake*, *Weekly Timetable collision matrix*, *Hall availability Gantt timeline*) remain focused on their specialized interaction mechanics while their companion roster/inventory screens adopt the gold standard.

---

## 1. Overview & Core Concept

### What It Does
The client roster screen in the Membership vertical (`MembershipMembersView.tsx`) represents the pinnacle of Atrium's desktop design system:
1. **Two-Column / Pod Tray Workspace**: A unified container with an elevated filter tray, Seek expanding search, filter pills, batch selection banners, and a responsive toggle between List and Grid layouts.
2. **Kinetic Hover Fan-Arc Physics**: When hovering over any card in Grid view, 6 contextual action buttons burst into an orbital arc around the top-right corner of the card with staggered spring delays (0ms to 150ms), giving instant 1-click access to domain operations.
3. **Smart List Row Hover Actions**: When hovering over any row in List view, standard and domain actions (View, Edit, Pin, Status Toggle, Delete, plus custom triggers) appear smoothly on the right edge alongside an overflow Kebab menu.
4. **390px Inline Side Inspector Drawer**: Clicking any row or card slides open a 390px detail drawer on the right edge of the content canvas, maintaining the user's filtered list in view while displaying tabbed dossiers, histories, notes, and direct action triggers.
5. **Universal Multi-Tenant & Facility Switcher**: Integrated branch dropdowns, batch deletion/status toggles, and live demo-data healing.

This plan systematically brings every primary roster, catalog, directory, and registry across all 16 categories up to this exact 100% standard.

---

## 2. User Experience & Visual Design

### The 6-Button Orbital Fan-Arc Physics
On desktop viewports, hovering over any card in Grid view triggers the kinetic fan arc. The buttons are positioned along an orbital arc with negative offsets relative to the card's top-right corner:

```
        (-18, -44) [3. Domain Primary]
  (-50, -38) [2. Edit]         (16, -34) [4. Status / Freeze]
(-72, -18) [1. View]                   (38, -6) [5. Pin to Top]
    ┌───────────────────────────┐           (44, 28) [6. Delete / Danger]
    │       GRID CARD           │
    │   [Avatar / Image 80px]   │
    │   Entity Title (Bold)     │
    │   Role / Category Pill    │
    │   Metrics Strip           │
    └───────────────────────────┘
```

- **Staggered Delays**:
  - Button 0 (View): 0ms enter delay, 125ms exit delay
  - Button 1 (Edit): 30ms enter delay, 100ms exit delay
  - Button 2 (Contextual Domain Action): 60ms enter delay, 75ms exit delay
  - Button 3 (Status / Freeze / Toggle): 90ms enter delay, 50ms exit delay
  - Button 4 (Pin to Top): 120ms enter delay, 25ms exit delay
  - Button 5 (Delete / Destructive): 150ms enter delay, 0ms exit delay
- **Elevation**: On hover, the active card z-index elevates to `z-50` with an ambient glow (`box-shadow: 0 16px 32px rgba(196,120,90,0.14)`) so orbiting buttons never clip behind adjacent cards.

### Contextual Domain Action Matrix
Each entity type features tailored hover and drawer actions matching its professional workflow:

| Entity Type | Screen | Button 2 (Domain Action 1) | Button 3 (Domain Action 2 / Status) | Inspector Drawer Tabs |
|---|---|---|---|---|
| **Gym Member** | `MembershipMembersView` | Pay / Renew Plan | Freeze / Suspend Access | Attendance, Sales, Bookings, Notes |
| **Salon Client** | `AppointmentClientsView` | Book Treatment | VIP / Pin | Formulas, Past Visits, Retail Spend |
| **Venue Renter** | `VenueRentersView` | Book Hall / Space | Caution Escrow Status | Booking Ledger, Security Deposits, Contracts |
| **Rental Space** | `VenueInventoryView` | Reserve Unit | Maintenance Block | Occupancy Calendar, Asset Inventory, Pricing |
| **Student** | `EducationStudentsView` | Enroll / Pay Tuition | Academic Probation / Hold | Gradebook, Attendance 360°, Guardians |
| **Cohort** | `EducationCohortsView` | View Timetable | Archive Cohort | Enrolled Students, Syllabus, Faculty |
| **Freelance Client** | `FreelanceClientsView` | New Proposal / Invoice | Client Retainer Status | Active Projects, Unbilled Time, Invoices |
| **Deliverable** | `FreelanceDeliverablesView` | Start Stopwatch Timer | Move to Review / Done | Specs, Time Entries, Revisions |
| **B2B Account** | `TradingDirectoryView` | Create Devis / BC | Credit Limit Lock | Fiscal Info (NIF/NIS), Orders, Ledger |
| **Trading Article** | `TradingCatalogView` | Stock Movement / BL | Price Tier Adjust | Batch Numbers, Warehouses, Price Tiers |
| **Medical Patient** | `MedicalPatientsView` | Consult / Prescribe | Chifa Verified / Urgence | Medical History, Allergies, Ordonnances, Vitals |
| **Auto Vehicle** | `AutoGarageVehiclesView` | Open Work Order (OR) | Roadworthy / Inspection | Service History, OEM Parts Used, Mileage Logs |
| **Garage Part** | `AutoGaragePartsView` | Stock Adjustment | Reorder Alert | Compatibility, Suppliers, Movement Log |
| **Real Estate Property**| `RealEstatePropertiesView`| Create Lease Agreement| Occupancy Status | Units / Floorplan, Tenants, Inspection Reports |
| **Tenant / Lease** | `RealEstateLeasesView` | Log Rent Payment | Lease Renewal / Notice | Payment History, Security Deposit, Co-signers |
| **Production Order** | `ManufacturingOrdersView`| Start Batch / Step | Quality Check (QC) | BOM Breakdown, Materials Issued, Routing |
| **Legal Matter** | `LegalMattersView` | Add Court Hearing | Trust Escrow Ledger | Pleadings, Evidence Vault, Billing Hours |
| **Courier Shipment** | `LogisticsShipmentsView` | Dispatch / Run Sheet | COD Collected Toggle | Tracking Milestones, Proof of Delivery, Barcode |
| **Construction Site** | `ContractorSitesView` | Site Daily Log | BOQ Progress Claim | Subcontractors, Materials, Weather/Safety |
| **Farm Parcel** | `AgricultureParcelsView` | Log Agronomic Cycle | Irrigation / Soil Test | Crop History, Yields, Chemical/Bio Treatments |
| **Livestock Animal** | `AgricultureLivestockView`| Vet Check / Vaccine | Quarantine / Active | Pedigree, Milk/Meat Yields, Breeding Log |

### 390px Inline Side Inspector Drawer
When any row or card is clicked:
- The content canvas flexes to accommodate the drawer (`w-[390px] shrink-0`) without hiding the underlying collection.
- The drawer includes:
  - Sticky header with entity avatar, name, status badge, and close button `(X)`.
  - Quick action toolbar (`Edit`, `Call`, `Email`, `Delete`, `Print`).
  - Segmented tab switcher (Overview, Activity History, Linked Documents, Internal Notes).
  - Rich scrollable content area with tabular figures and editable notes with auto-save.
  - Smooth slide-in transition (`transform: translateX(0)`) with backdrop escape handling.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular Inset vs. Monolithic Rebuild**:
  - *Chosen Approach*: Standardize all roster and catalog screens onto the tested `UniversalDataCollection<T>` engine rather than rewriting individual bespoke grid and table components.
  - *Why*: Guarantees 100% uniform keyboard navigation, sorting physics, batch selection checkboxes, CSV exports, and hover arc behavior across all 16 verticals with zero design drift.
- **Decision 2: Preserving Domain-Specific Dashboards & Specialized Screens**:
  - *Chosen Approach*: Keep specialized functional screens (POS Register with keypad/cart, Barcode scanner camera feed, Stylist multi-column schedule grid, Attendance roll call matrix) in their dedicated interactive formats, while ensuring all data catalogs and registries feeding them use the master template.
- **Decision 3: Zero-Lag Hover Arc**:
  - *Chosen Approach*: The hover arc is pure GPU-accelerated CSS transforms (`transform: translate3d(...) scale(...)`) without heavy JavaScript layout measurements. Staggered transition delays are baked into the coordinate constants.

---

## 4. Master Screen-by-Screen Audit Inventory

The table below audits every single screen across all 16 categories of Atrium ERP & CRM, classifying each into:
- **[100% Identical]**: Already matches the reference template (UniversalDataCollection + List/Grid toggle + Hover Fan Arc + 390px Side Inspector + Batch Actions).
- **[Missing 1 Thing]**: Uses UniversalDataCollection with List/Grid toggle, but missing the 390px inline side inspector drawer.
- **[Missing 2 Things]**: Uses UniversalDataCollection in list mode only; missing Grid view card hover fan-arc and 390px side inspector.
- **[Needs Full Migration]**: Uses legacy bespoke card grids or HTML tables; needs complete transition to `UniversalDataCollection<T>` with dual toggle, hover fan arc, and 390px inspector drawer.
- **[Specialized / N/A]**: Operational execution tool or KPI dashboard (e.g., POS register, live scanner, Gantt timeline).

### Category 1: Membership & Gym (`membership/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Members / Clients Roster | `MembershipMembersView.tsx` | Roster | **100% Identical Reference Gold Standard** (Reference Template) |
| Registrations Pipeline | `MembershipRegistrationsView.tsx` | Pipeline | **Missing 2 Things**: Has UniversalDataCollection in list mode; needs Grid view cards with hover fan arc and 390px lead inspector drawer. |
| POS & Pro Shop | `MembershipShopView.tsx` | Catalog | **Needs Full Migration**: Bespoke product cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Add to Cart, Restock, Edit, Barcode], and 390px product inspector. |
| Class Timetable / Scheduler | `MembershipSchedulerView.tsx` | Schedule | **Missing 2 Things**: Classes tab uses UniversalDataCollection; needs class card hover fan arc and 390px class roster inspector. |
| Finance & Payroll | `MembershipFinanceView.tsx` | Finance | **Missing 2 Things**: Uses UniversalDataCollection list; needs grid cards with hover fan arc and 390px transaction inspector. |
| History / Turnstile Logs | `MembershipHistoryView.tsx` | Logs | **Missing 1 Thing**: Uses UniversalDataCollection list; needs 390px member audit drawer on row click. |
| Gym Dashboard | `MembershipDashboardView.tsx` | Dashboard | **Specialized / N/A**: KPI pulse and quick check-in terminal. |

### Category 2: Education & Academy (`education/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Students 360° CRM | `EducationStudentsView.tsx` | Roster | **Missing 1 Thing**: Has UniversalDataCollection, List/Grid toggle, and 390px drawer; needs 6-button hover fan-arc refinement with contextual parent/tuition actions on cards. |
| Cohorts & Programs | `EducationCohortsView.tsx` | Directory | **Missing 2 Things**: Uses UniversalDataCollection list; needs Grid cards with hover fan arc [Roster, Timetable, Edit, Archive] and 390px cohort inspector. |
| Admissions Funnel | `EducationAdmissionsView.tsx` | Pipeline | **Missing 2 Things**: Uses UniversalDataCollection for list mode; needs Grid cards with hover fan arc and 390px applicant inspector drawer. |
| Attendance & Gradebook | `EducationAttendanceView.tsx` | Matrix | **Specialized**: Matrix roll-call grid; needs 390px session inspector drawer on student click. |
| Class Timetable | `EducationTimetableView.tsx` | Calendar | **Specialized / N/A**: Multi-room conflict-free schedule grid. |
| Tuition & Aging AR | `EducationFinanceView.tsx` | Finance | **Missing 2 Things**: Uses UniversalDataCollection list; needs installment cards with hover fan arc and 390px tuition ledger inspector. |
| Academy Dashboard | `EducationDashboardView.tsx` | Dashboard | **Specialized / N/A**: Academic KPI pulse dashboard. |

### Category 3: Venue & Event Rentals (`venue/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Renters & Organizers CRM | `VenueRentersView.tsx` | Directory | **Missing 1 Thing**: Uses UniversalDataCollection with List/Grid toggle; needs 390px inline side inspector drawer and 6-button hover fan arc on cards. |
| Spaces & Units Inventory | `VenueInventoryView.tsx` | Asset Catalog | **Missing 2 Things**: Uses UniversalDataCollection; needs Grid cards with hover fan arc [Book, Maintenance, Pricing, Edit] and 390px unit inspector drawer. |
| Bookings Master Ledger | `VenueBookingsView.tsx` | Roster | **Missing 2 Things**: Uses UniversalDataCollection; needs Grid cards with hover fan arc [Check-In, Caution, Contract, Edit] and 390px booking inspector drawer. |
| Hall Availability Timeline | `VenueTimelineView.tsx` | Gantt | **Specialized / N/A**: Interactive room occupancy Gantt timeline. |
| Caution Escrows & Finance | `VenueFinanceView.tsx` | Finance | **Needs Full Migration**: Bespoke escrow tables; needs UniversalDataCollection with caution escrow inspector drawer. |
| Venue Dashboard | `VenueDashboardView.tsx` | Dashboard | **Specialized / N/A**: Event pulse and revenue metrics. |

### Category 4: Freelancers & Solo Studio (`freelance/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Freelance Clients Directory | `FreelanceClientsView.tsx` | Directory | **Missing 1 Thing**: Uses UniversalDataCollection, List/Grid toggle; needs 390px inline client inspector drawer and 6-button hover fan arc on cards. |
| Deliverables & Tasks | `FreelanceDeliverablesView.tsx` | Pipeline | **Missing 2 Things**: Uses UniversalDataCollection with Kanban/List; needs Grid cards with hover fan arc [Log Time, Mark Done, Edit, Bill] and 390px deliverable inspector drawer. |
| Time Tracker & Timesheet | `FreelanceTimeTrackerView.tsx` | Log / Tool | **Missing 1 Thing**: Uses UniversalDataCollection for time logs; needs 390px time entry inspector drawer. |
| Invoices & Retainers | `FreelanceInvoicesView.tsx` | Roster | **Missing 2 Things**: Uses UniversalDataCollection list; needs Grid cards with hover fan arc [Send, Mark Paid, Void, Print] and 390px invoice inspector drawer with live preview. |
| Project Proposals | `FreelanceProposalsView.tsx` | Roster | **Missing 2 Things**: Uses UniversalDataCollection list; needs Grid cards with hover fan arc [Accept, Convert, Edit, PDF] and 390px proposal inspector. |
| Retainers & Taxes | `FreelanceFinanceView.tsx` | Finance | **Specialized / N/A**: Tax reserve calculation and retainer summaries. |
| Studio Dashboard | `FreelanceDashboardView.tsx` | Dashboard | **Specialized / N/A**: Solo earnings and deliverable burndown pulse. |

### Category 5: Salon, Spa & Appointments (`appointment/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Salon Clients Directory | `AppointmentClientsView.tsx` | Directory | **Missing 1 Thing**: Uses UniversalDataCollection with List/Grid toggle; needs 390px salon client inspector drawer (hair formulas, allergy notes) and 6-button hover fan arc. |
| Services Menu & Catalog | `AppointmentServicesView.tsx` | Catalog | **Missing 2 Things**: Uses UniversalDataCollection list; needs Grid cards with hover fan arc [Book Service, Duration, Edit, Delete] and 390px service inspector drawer. |
| Stylist Schedule Columns | `AppointmentScheduleView.tsx` | Schedule | **Specialized**: Multi-chair workstation grid; appointment list drawer already integrated. |
| Stylist Commissions & Payouts | `AppointmentFinanceView.tsx` | Finance | **Missing 2 Things**: Uses UniversalDataCollection for payouts; needs 390px commission breakdown inspector drawer. |
| Appointment History Logs | `AppointmentHistoryView.tsx` | Logs | **Missing 1 Thing**: Uses UniversalDataCollection list; needs 390px appointment audit drawer. |
| Salon Dashboard | `AppointmentDashboardView.tsx` | Dashboard | **Specialized / N/A**: Chair occupancy and daily bookings pulse. |

### Category 6: POS, Retail & Restaurant (`pos/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Products & Stock Catalog | `PosInventoryView.tsx` | Catalog | **Missing 2 Things**: Uses UniversalDataCollection list; needs Grid cards with hover fan arc [Quick Sale, Barcode, Stock Adjust, Price Edit] and 390px product inspector drawer. |
| Orders & Sales History | `PosOrdersView.tsx` | Roster | **Missing 2 Things**: Uses UniversalDataCollection list; needs Grid cards with hover fan arc [Reprint, Refund, View Receipt] and 390px order receipt inspector drawer. |
| Cash Register Terminal | `PosRegisterView.tsx` | Terminal | **Specialized / N/A**: Direct point-of-sale terminal with numeric keypad, scanning, and cart. |
| Z-Clôture & End of Day | `PosFinanceView.tsx` | Finance | **Specialized / N/A**: Cash drawer balancing and fiscal closure. |
| POS History Logs | `PosHistoryView.tsx` | Logs | **Missing 1 Thing**: Uses UniversalDataCollection list; needs 390px transaction audit drawer. |
| POS Dashboard | `PosDashboardView.tsx` | Dashboard | **Specialized / N/A**: Daily retail velocity and top sellers. |

### Category 7: Project & Agency Milestone (`project/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Talent Pool & Promoters | `ProjectRhView.tsx` | Directory | **Missing 1 Thing**: Uses UniversalDataCollection for talent roster; needs 390px talent inspector drawer (PTT CCP info, past missions) and card hover fan arc. |
| Agency Projects Portfolio | `ProjectDirectionView.tsx` | Roster | **Missing 2 Things**: Tab 1.2 uses UniversalDataCollection; needs Grid cards with hover fan arc and 390px project milestone inspector drawer. |
| POSM Catalog & Print Orders | `ProjectChefProjetView.tsx` | Catalog | **Missing 2 Things**: Uses UniversalDataCollection; needs POSM asset cards with hover fan arc and 390px collateral inspector drawer. |
| Creative Storyboards & BAT | `ProjectCreaView.tsx` | Catalog | **Missing 2 Things**: Uses UniversalDataCollection for BATs; needs creative card hover fan arc and 390px proof inspector drawer. |
| Field Missions & Pointage | `ProjectSuperviseurView.tsx`| Roster | **Missing 2 Things**: Uses UniversalDataCollection for missions; needs Grid cards with hover fan arc and 390px mission inspector drawer. |
| CCP Slips & Accounting | `ProjectComptaView.tsx` | Finance | **Missing 1 Thing**: Uses UniversalDataCollection for CCP slips; needs 390px SFP 01 postal slip inspector drawer. |

### Category 8: B2B Trading & Commercial Management (`trading/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| B2B Directory (Clients & Suppliers)| `TradingDirectoryView.tsx` | Directory | **Missing 1 Thing**: Uses UniversalDataCollection with tabs; needs 390px B2B corporate dossier inspector drawer (NIF/NIS/RC, credit limits) and card hover fan arc. |
| Wholesale Article Catalog | `TradingCatalogView.tsx` | Catalog | **Missing 2 Things**: Uses UniversalDataCollection list; needs Grid cards with hover fan arc [Add to Devis, Price Tiers, Stock Card] and 390px article inspector drawer. |
| Commercial Sales Documents | `TradingSalesView.tsx` | Roster | **Missing 2 Things**: Uses UniversalDataCollection; needs Grid cards with hover fan arc [Print BL/Facture, Convert to BL, Avoir] and 390px commercial doc inspector. |
| Procurement & Vendor Orders | `TradingPurchasesView.tsx` | Roster | **Missing 2 Things**: Uses UniversalDataCollection; needs Grid cards with hover fan arc [Receive BR, Match Invoice] and 390px purchase order inspector. |
| Multi-Depot Stock & Movements | `TradingInventoryView.tsx` | Inventory | **Missing 2 Things**: Uses UniversalDataCollection; needs depot/lot cards with hover fan arc and 390px stock card inspector. |
| Aging Receivables & Payables | `TradingFinanceView.tsx` | Finance | **Missing 1 Thing**: Uses UniversalDataCollection list; needs 390px commercial ledger inspector drawer. |
| Trading Dashboard | `TradingDashboardView.tsx` | Dashboard | **Specialized / N/A**: Commercial margins and order pipeline pulse. |

### Category 9: Clinic & Medical Practice (`medical/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Patients Directory & EHR | `MedicalPatientsView.tsx` | Roster | **Needs Full Migration**: Bespoke static card grid; needs UniversalDataCollection with List/Grid toggle, 6-button card hover fan arc [Consult, Prescribe, History, Emergency], and 390px patient EHR inspector drawer. *(High Priority)* |
| Prescriptions & Ordonnances | `MedicalPrescriptionsView.tsx` | Roster | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Print Ordonnance, Renew, Dose], and 390px prescription inspector. |
| Patient Triage Queue | `MedicalQueueView.tsx` | Queue | **Specialized**: Live triage board; needs 390px patient intake drawer on click. |
| Consultations & Billing | `MedicalBillingView.tsx` | Finance | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with 390px Chifa consultation inspector. |
| Medical Dashboard | `MedicalDashboardView.tsx` | Dashboard | **Specialized / N/A**: Daily clinic pulse and waiting room capacity. |

### Category 10: Auto Repair & Workshop (`garage/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Vehicle Fleet & Customer Cars | `AutoGarageVehiclesView.tsx` | Asset Catalog | **Needs Full Migration**: Bespoke cards; needs UniversalDataCollection with List/Grid toggle, 6-button card hover fan arc [New OR, History, Inspection, Edit], and 390px vehicle technical dossier inspector. *(High Priority)* |
| Work Orders (Ordres de Réparation)| `AutoGarageOrdersView.tsx` | Roster | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Assign Bay, Add Parts, Invoice], and 390px work order inspector. |
| Spare Parts & OEM Inventory | `AutoGaragePartsView.tsx` | Catalog | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Reorder, Restock, Edit], and 390px spare part inspector. |
| Garage Billing & Labor | `AutoGarageBillingView.tsx` | Finance | **Needs Full Migration**: Custom cards; needs UniversalDataCollection and 390px garage invoice inspector. |
| Garage Dashboard | `AutoGarageDashboardView.tsx` | Dashboard | **Specialized / N/A**: Workshop bay utilization and active jobs pulse. |

### Category 11: Real Estate & Property Management (`realestate/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Properties & Buildings Catalog | `RealEstatePropertiesView.tsx`| Asset Catalog | **Needs Full Migration**: Bespoke property cards; needs UniversalDataCollection with List/Grid toggle, 6-button hover fan arc [Create Lease, Schedule Visit, Edit, Archive], and 390px property inspector drawer with unit breakdown. *(High Priority)* |
| Tenants & Active Leases | `RealEstateLeasesView.tsx` | Roster | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Log Rent, Send Notice, Renew], and 390px lease agreement inspector. |
| Inspections & État des Lieux | `RealEstateInspectionsView.tsx`| Roster | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc, and 390px inspection inspector. |
| Rent Roll & Arrears | `RealEstateFinanceView.tsx` | Finance | **Needs Full Migration**: Custom cards; needs UniversalDataCollection and 390px rent roll inspector. |
| Real Estate Dashboard | `RealEstateDashboardView.tsx` | Dashboard | **Specialized / N/A**: Portfolio occupancy and rental income pulse. |

### Category 12: Light Manufacturing & Workshops (`manufacturing/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Production Orders (OF) | `ManufacturingOrdersView.tsx`| Roster | **Needs Full Migration**: Bespoke cards; needs UniversalDataCollection with List/Grid toggle, 6-button hover fan arc [Start Batch, QC Check, Edit, Requisition], and 390px production order inspector drawer. *(High Priority)* |
| Bills of Materials (BOM) | `ManufacturingBomView.tsx` | Catalog | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Explode BOM, Costing, Edit], and 390px BOM inspector drawer. |
| Raw Materials Stock | `ManufacturingMaterialsView.tsx`| Catalog | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Reorder, Count, Edit], and 390px raw material inspector. |
| Quality Control Inspections | `ManufacturingQcView.tsx` | Roster | **Needs Full Migration**: Custom cards; needs UniversalDataCollection and 390px QC batch inspector. |
| Factory Dashboard | `ManufacturingDashboardView.tsx`| Dashboard | **Specialized / N/A**: Factory throughput and machine line pulse. |

### Category 13: Law Firm & Legal Practice (`legal/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Legal Matters & Case Files | `LegalMattersView.tsx` | Roster | **Needs Full Migration**: Bespoke cards; needs UniversalDataCollection with List/Grid toggle, 6-button hover fan arc [Add Hearing, Upload Pleading, Log Trust, Edit], and 390px legal case file inspector drawer. *(High Priority)* |
| Document Vault & Contracts | `LegalVaultView.tsx` | Asset Catalog | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Download, Version, Verify], and 390px legal contract inspector. |
| Court Docket & Hearings | `LegalHearingsView.tsx` | Calendar | **Specialized**: Hearing schedule; needs 390px court docket inspector drawer on click. |
| Trust Accounts & Escrow | `LegalTrustView.tsx` | Finance | **Needs Full Migration**: Custom cards; needs UniversalDataCollection and 390px IOLTA trust ledger inspector. |
| Law Firm Dashboard | `LegalDashboardView.tsx` | Dashboard | **Specialized / N/A**: Case load and active litigation pulse. |

### Category 14: Last-Mile Delivery & Courier COD (`logistics/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Shipments & Parcels (Colis) | `LogisticsShipmentsView.tsx` | Roster | **Needs Full Migration**: Bespoke parcel cards; needs UniversalDataCollection with List/Grid toggle, 6-button hover fan arc [Print Label, Assign Courier, Update Status, Collect COD], and 390px shipment tracking inspector drawer. *(High Priority)* |
| Delivery Manifests (Bordereaux) | `LogisticsManifestsView.tsx` | Roster | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Print Run Sheet, Dispatch, Close], and 390px manifest inspector drawer. |
| Barcode Intake Station | `LogisticsScannerView.tsx` | Scanner | **Specialized / N/A**: Camera and hardware barcode scanner terminal. |
| COD Remittances & Cash | `LogisticsCodView.tsx` | Finance | **Needs Full Migration**: Custom cards; needs UniversalDataCollection and 390px COD remittance inspector. |
| Logistics Dashboard | `LogisticsDashboardView.tsx` | Dashboard | **Specialized / N/A**: Fleet in-transit and delivery success rate pulse. |

### Category 15: General Contractor & BTP Field Works (`contractor/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Construction Sites (Chantiers)| `ContractorSitesView.tsx` | Directory | **Needs Full Migration**: Bespoke site cards; needs UniversalDataCollection with List/Grid toggle, 6-button hover fan arc [Daily Log, View BOQ, Site Team, Edit], and 390px chantier inspector drawer. *(High Priority)* |
| Bill of Quantities (BOQ / BPU)| `ContractorBoqView.tsx` | Catalog | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle, hover fan arc [Measure, Subcontract, Edit], and 390px BOQ item inspector drawer. |
| Site Daily Logs (Rapports) | `ContractorDailyLogsView.tsx` | Logs | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle and 390px daily log inspector drawer. |
| Situations & Progress Billing | `ContractorBillingView.tsx` | Finance | **Needs Full Migration**: Custom cards; needs UniversalDataCollection and 390px situation inspector. |
| Contractor Dashboard | `ContractorDashboardView.tsx` | Dashboard | **Specialized / N/A**: Site milestones and subcontractor crew pulse. |

### Category 16: Agriculture & Agribusiness (`agriculture/`)
| Screen | File | Classification | Status & Requirements |
|---|---|---|---|
| Parcels & Orchards | `AgricultureParcelsView.tsx` | Asset Catalog | **Needs Full Migration**: Bespoke parcel cards; needs UniversalDataCollection with List/Grid toggle, 6-button hover fan arc [Log Cycle, Irrigation, Soil Test, Edit], and 390px agronomic inspector drawer. *(High Priority)* |
| Livestock & Herd Registry | `AgricultureLivestockView.tsx` | Roster | **Needs Full Migration**: Bespoke herd cards; needs UniversalDataCollection with List/Grid toggle, 6-button hover fan arc [Vet Check, Feed Log, Yield, Edit], and 390px livestock dossier inspector drawer. *(High Priority)* |
| Crop Cycles (Campagnes) | `AgricultureCyclesView.tsx` | Pipeline | **Needs Full Migration**: Custom cards; needs UniversalDataCollection with List/Grid toggle and 390px crop cycle inspector drawer. |
| Harvests & Silo Storage | `AgricultureHarvestView.tsx` | Inventory | **Needs Full Migration**: Custom cards; needs UniversalDataCollection and 390px silo inspector drawer. |
| Wholesale & Cooperative Deals | `AgricultureWholesaleView.tsx`| Roster | **Needs Full Migration**: Custom cards; needs UniversalDataCollection and 390px wholesale deal inspector. |
| Farm Dashboard | `AgricultureDashboardView.tsx` | Dashboard | **Specialized / N/A**: Weather, parcel moisture, and harvest yields pulse. |

---

## 5. Technical Architecture & Component Hierarchy

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           Screen Root Container                               │
│              (Pod Tray background #F8F9FA, border #EDF1F3, 24px)              │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                              Top Filter Tray                            │  │
│  │   [Seek Search Bar]  [Status Pills / Tabs]  [CSV Export]  [List | Grid] │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌──────────────────────────────────────────────────────┐  ┌────────────────┐ │
│  │            UniversalDataCollection<T>                │  │  390px Inline  │ │
│  │                                                      │  │ Side Inspector │ │
│  │  ┌────────────────────────────────────────────────┐  │  │     Drawer     │ │
│  │  │ If viewMode === 'list':                        │  │  │ (Selected Row/ │ │
│  │  │  CollectionListRow                             │  │  │   Card item)   │ │
│  │  │  - Checkbox + Pinned Icon + Columns            │  │  │                │ │
│  │  │  - Hover: View, Edit, Pin, Status, Delete,     │  │  │ - Header & Pic │ │
│  │  │           Domain Action, Kebab Overflow        │  │  │ - Quick CTAs   │ │
│  │  └────────────────────────────────────────────────┘  │  │ - Tab Switcher │ │
│  │                                                      │  │   · Overview   │ │
│  │  ┌────────────────────────────────────────────────┐  │  │   · History    │ │
│  │  │ If viewMode === 'grid':                        │  │  │   · Notes      │ │
│  │  │  CollectionGridCard                            │  │  │ - Editable     │ │
│  │  │  - 80px Avatar/Icon + Badges + Metrics         │  │  │   Notes area   │ │
│  │  │  - Hover Fan-Arc: 6 Orbital Buttons            │  │  │ - Close (X)    │ │
│  │  │    [View] [Edit] [DomainAction] [Status]       │  │  │                │ │
│  │  │    [Pin]  [Delete]                             │  │  │                │ │
│  │  └────────────────────────────────────────────────┘  │  │                │ │
│  └──────────────────────────────────────────────────────┘  └────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Phased Implementation Roadmap

To execute this large-scale upgrade with zero regressions, work will proceed in 4 focused batches:

### Phase 1: High-Priority Primary Entity Rosters in Expansion Categories
Migrate the primary human and asset rosters of the 8 expansion verticals to `UniversalDataCollection<T>` with full List/Grid toggle, 6-button hover fan arc, and 390px inline side inspector drawer:
1. `MedicalPatientsView.tsx` (Clinic EHR)
2. `AutoGarageVehiclesView.tsx` (Garage Fleet Registry)
3. `RealEstatePropertiesView.tsx` (Real Estate Units Catalog)
4. `ManufacturingOrdersView.tsx` (Factory Work Orders)
5. `LegalMattersView.tsx` (Law Firm Case Files)
6. `LogisticsShipmentsView.tsx` (Courier Parcels)
7. `ContractorSitesView.tsx` (Construction Chantiers)
8. `AgricultureParcelsView.tsx` & `AgricultureLivestockView.tsx` (Farm Parcels & Herds)

### Phase 2: Category Catalogs, Inventories & Directories
Migrate commercial, product, and asset inventory screens:
1. `MembershipShopView.tsx` (Pro Shop Catalog)
2. `AutoGaragePartsView.tsx` & `AutoGarageOrdersView.tsx` (Spare Parts & Work Orders)
3. `RealEstateLeasesView.tsx` & `RealEstateInspectionsView.tsx` (Leases & Inspections)
4. `ManufacturingBomView.tsx` & `ManufacturingMaterialsView.tsx` (BOMs & Raw Materials)
5. `LegalVaultView.tsx` (Contract Repository)
6. `LogisticsManifestsView.tsx` (Delivery Run Sheets)
7. `ContractorBoqView.tsx` (Bill of Quantities / BPU)
8. `AgricultureCyclesView.tsx` & `AgricultureHarvestView.tsx` (Cycles & Silos)

### Phase 3: Secondary Rosters & Missing Inspector Drawers in Core Categories
Equip the screens that already use `UniversalDataCollection` in list mode with the missing 390px side inspector drawer and the 6-button grid card hover fan arc:
1. `VenueRentersView.tsx`, `VenueInventoryView.tsx`, `VenueBookingsView.tsx`
2. `EducationStudentsView.tsx`, `EducationCohortsView.tsx`, `EducationAdmissionsView.tsx`
3. `FreelanceClientsView.tsx`, `FreelanceDeliverablesView.tsx`, `FreelanceInvoicesView.tsx`
4. `AppointmentClientsView.tsx`, `AppointmentServicesView.tsx`
5. `TradingDirectoryView.tsx`, `TradingCatalogView.tsx`, `TradingSalesView.tsx`, `TradingPurchasesView.tsx`
6. `ProjectRhView.tsx`, `ProjectDirectionView.tsx`, `ProjectChefProjetView.tsx`
7. `PosInventoryView.tsx`, `PosOrdersView.tsx`

### Phase 4: Financial Sub-Screens & Verification
1. Integrate 390px transaction/escrow inspector drawers in financial rosters (`VenueFinanceView`, `MedicalBillingView`, `AutoGarageBillingView`, `RealEstateFinanceView`, `ManufacturingQcView`, `LegalTrustView`, `LogisticsCodView`, `ContractorBillingView`, `AgricultureWholesaleView`).
2. Run full TypeScript checks (`tsc --noEmit`), Vite production build (`npm run build`), and test suite validation (13/13 passing).
