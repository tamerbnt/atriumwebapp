# Master Strategic Blueprint — End-to-End Category Features & Operational User Flows
**Application**: Atrium ERP & CRM  
**Architectural Contract**: Quadruple Traceability (`account_id`, `business_id`, `branch_id`, `staff_id`), Offline-First IndexedDB Cache, Tri-Lingual (EN / FR / AR RTL with Cairo font), Multi-Currency (`DZD`, `EUR`, `USD`).  
**UI/UX Standard**: Modal Dialogs with Multi-Step Wizards, Quick-Action Toolbars, Smart Multi-Criteria Filter Bars, Tabular Figures, Dense Data Grids.  
**Status**: Comprehensive Specification (Zero Code — Pure Operational & Architectural Blueprint)  

---

## 1. Universal Design System & UX Standards

Every category adheres to the following unified UI/UX principles:

### A. Quick-Action Toolbars & Smart Filter Bar
- **Top Quick-Action Toolbar**: Persistent high-contrast action buttons (`+ New Record`, `Print / Export`, `Batch Status Change`, `Search (Ctrl+K / /)`).
- **Smart Filter Chips**: Instant multi-criteria filtering by Date Range (Today, This Week, This Month, Custom), Branch / Facility, Status badges, and assigned Staff.
- **Search Bar**: Debounced instant search across full text (ID, customer name, phone, VIN, document code).

### B. Modal Dialogs with Multi-Step Wizards
- High-volume data creation and editing use modal wizards with progressive disclosure (e.g., Step 1: Client/Party -> Step 2: Items/Services -> Step 3: Logistics/Schedule -> Step 4: Payment & Review).
- Keyboard shortcuts supported (`Enter` to advance, `Esc` to cancel, `Ctrl+Enter` to submit).

### C. Tri-Lingual & RTL Layout Engine
- Full layout flipping via `dir="rtl"` in Arabic mode with the Cairo font family.
- Numerals and monetary amounts format according to locale while maintaining tabular figures (`tabular-nums font-mono`).
- Standardized status badges with trilingual translations (`Draft / Brouillon / مسودة`, `Active / Actif / نشط`, `Completed / Terminé / مكتمل`, `Cancelled / Annulé / ملغى`).

### D. Security & Data Flow Contract
- **Quadruple Traceability**: Every table, mutation, and log strictly records `account_id`, `business_id`, `branch_id`, and `staff_id`.
- **Row-Level Security (RLS)**: Enforced at the Supabase/PostgreSQL layer.
- **Offline-First Delta Sync**: All CRUD mutations save optimistically to IndexedDB with uuid-v4 IDs and sync to Supabase with idempotent upserts upon reconnection.

---

## 2. Exhaustive Category Specifications (One-by-One)

---

### Category 1: Universal Rental, Hospitality & Asset Booking (`rental_booking` — FacilityType: 14)
*Scope: Lodging/Hotels (Rooms), Vehicle Rental (Cars/Vans/Bikes), Event Spaces & Halls, Equipment/Tools.*

#### End-to-End Feature Catalog
1. **Resource & Unit Catalog (CRUD)**:
   - Create, edit, archive rental units with flexible profiles: *Lodging/Room* (floor, bed type, AC), *Vehicle/Fleet* (VIN, plate, model, transmission, fuel), *Venue/Space* (surface m², capacity), *Tool/Equipment* (serial, calibration).
   - Dynamic pricing rules: hourly, daily, weekend surcharge, seasonal high/low rates, monthly discounts.
   - Bulk status manager: `Available`, `Booked`, `InUse`, `Turnover/Cleaning`, `Maintenance/OOS`.
2. **Interactive Schedule & Timeline Grid**:
   - Visual 30-day Gantt timeline with drag-and-drop booking reallocation.
   - Resource collision prevention (guarantees zero double-booking).
   - One-click quick-booking directly from calendar slot.
3. **Reservations & Booking Ledger (CRUD)**:
   - Client intake with ID/Passport scan and driver license verification.
   - Configurable security deposits (cash, check hold, credit pre-auth).
   - Add-on amenities & packages (breakfast, extra driver, projector, insurance waiver).
4. **Digital Inspection & Condition Sheet**:
   - Step-by-step intake/return inspection wizard with interactive 2D damage diagram marker.
   - Odometer reading, fuel gauge fraction (1/8 to 8/8), key checklist.
   - Camera photo upload for dent/scratch evidence with timestamp.
5. **Night Audit & Daily Operations**:
   - Automated room/unit charge posting at midnight cut-off.
   - Daily police guest report generation (*Fiche de police / Renseignement voyageur*).
   - Housekeeping turnover queue with housekeeper assignment.
6. **Financial Settlement & Deposits**:
   - Consolidated master folio (rental charges, extra services, damages, taxes).
   - Deposit release or damage/fine deduction reconciliation.
   - Printable contracts (*Contrat de location*) in EN/FR/AR with QR validation.

#### End-to-End Operational User Flow
```
[Stage 1: Ingestion & Reservation]
  Customer walks in or calls -> Staff opens "New Booking Wizard" -> Selects dates -> Filter by Resource Category (Car/Room/Venue) -> System displays available units -> Pick unit -> Attach/Create Client -> Calculate total + deposit -> Print Booking Confirmation.
               │
               ▼
[Stage 2: Check-In & Departure Handover]
  Customer arrives on date -> Staff launches "Check-In Wizard" -> Verify ID & Driving License -> Collect Security Deposit -> Open "Digital Condition Inspection Sheet" -> Record starting odometer/fuel or room amenity check -> Customer signs digital touch canvas -> Generate "Contrat de Location" -> Unit status moves to 'InUse'.
               │
               ▼
[Stage 3: Active Operations & Incidentals]
  During rental period -> Additional charges logged (room service, extra hours, late fee) -> Auto-posted to customer folio.
               │
               ▼
[Stage 4: Return & Check-Out Inspection]
  Customer returns unit -> Staff opens "Return Wizard" -> Record return odometer/fuel -> Compare against Departure Inspection -> Mark any new damages -> Calculate fuel penalty or extra mileage if applicable -> Unit status switches to 'Turnover/Cleaning' -> Auto-assigns cleaning staff.
               │
               ▼
[Stage 5: Final Settlement & Deposit Release]
  Staff opens Master Folio -> Review final balance -> Deduct penalties from deposit -> Refund remaining deposit to customer -> Issue fiscal receipt / invoice -> Archive contract -> Unit cleaned & marked 'Available'.
```

---

### Category 2: Universal Healthcare & Medical Clinics (`medical_clinic` — FacilityType: 18)
*Scope: Solo doctors, specialists, dental practices, ophthalmology, physiotherapy, polyclinics, and diagnostic care centers.*

#### End-to-End Feature Catalog
1. **Patient Master Directory & Electronic Health Record (EHR) (CRUD)**:
   - Full patient dossier: National ID/NIN, blood group, emergency contact, family history, chronic illnesses, critical allergy alert badges.
   - Document & media vault: Upload lab test results, imaging, X-rays, ultrasound scans.
   - Complete visit timeline with past consultations, diagnoses, and prescribed treatments.
2. **Reception & Triage Digital Queue**:
   - Live waiting room queue counter with priority triage levels (Urgent, Scheduled, Walk-in).
   - Vital signs intake recording: Blood pressure, temperature, heart rate, respiratory rate, weight, height, BMI auto-calc, blood glucose.
   - Dynamic room assignment (assigns waiting patient to available doctor/examination room).
3. **Clinical Consultation Workstation**:
   - Structured examination notes: Chief complaint, history of present illness, physical exam, differential diagnosis, ICD-10 coding.
   - Specialized care act logging (injections, sutures, dental care acts, eye acuity tests, dressing changes).
   - Private clinical notes toggle (confidential doctor-only field).
4. **Digital Prescriptions & Ordonnances Engine**:
   - Comprehensive medication database with dosage forms, strength, and posology templates (e.g., "1 tab 3x/day for 7 days after meals").
   - Drug interaction and allergy contraindication warning banner.
   - One-click generation of printable trilingual prescription (*Ordonnance*) with doctor header, stamp, signature box, and QR verification hash.
   - Medical certificates (Sick leave *Arrêt de travail*, fitness certificate, medical referral letters).
5. **Doctor & Staff Scheduling**:
   - Multi-practitioner appointment calendar with color-coded slots and shift rosters.
   - Patient appointment reminders (SMS/WhatsApp).
6. **Clinical Billing & Health Insurance Ledger**:
   - Consultation fee calculation + individual care act billings.
   - Social security / Mutual insurance claims processing (*Bordereaux CNAS / CASNOS / Chifa / Mutuelles*).
   - Patient co-pay calculation, daily consultation cash register tally.

#### End-to-End Operational User Flow
```
[Stage 1: Patient Reception & Triage]
  Patient arrives -> Receptionist searches national ID/phone or creates new patient record -> System displays allergy/chronic alert banner -> Patient added to "Waiting Queue" with triage urgency level -> Nurse measures vitals (BP, Temp, Weight) -> System auto-updates patient card in doctor's live queue.
               │
               ▼
[Stage 2: Clinical Consultation]
  Doctor clicks "Call Next Patient" -> Patient enters consultation room -> Doctor reviews past medical history on EHR panel -> Records clinical examination findings -> Inputs diagnosis code.
               │
               ▼
[Stage 3: Prescription & Care Acts]
  Doctor clicks "Compose Ordonnance" -> Selects medications from catalog with preset dosages -> System cross-checks allergies -> Doctor adds required lab/imaging tests -> Adds medical leave days if needed -> Prints official stamped Ordonnance with QR code -> Consultation marked 'Completed'.
               │
               ▼
[Stage 4: Care Delivery / Follow-up]
  If nurse intervention needed (dressing, injection) -> Patient moves to Treatment Room -> Nurse marks act executed -> Adds consumables used.
               │
               ▼
[Stage 5: Billing & Insurance Settlement]
  Patient returns to reception desk -> Receptionist opens Billing Drawer -> System totals consultation fee + care acts -> Applies insurance coverage rate (CNAS/Chifa) -> Calculates patient out-of-pocket co-pay -> Cash/Card payment collected -> Official medical receipt printed -> Patient discharged.
```

---

### Category 3: Automotive Repair, Garages & Fleet Maintenance (`auto_garage` — FacilityType: 19)
*Scope: Mechanical workshops, auto body & paint, tire service, electrical diagnostics, oil change, and fleet service centers.*

#### End-to-End Feature Catalog
1. **Vehicle Fleet & Chassis Registry (CRUD)**:
   - Vehicle directory indexed by VIN (Chassis) and License Plate (*Matricule*).
   - Vehicle profile: Make, model, generation, engine code, fuel type, gearbox, owner link.
   - Complete historical service log (every past repair, mileage progression, replaced parts).
2. **Work Orders & Repair Tickets (Ordres de Réparation — OR)**:
   - Intake checklist: Current odometer, fuel level, customer-reported issues, intake inspection diagram (pinpoints existing dents, scratches, cracked glass).
   - Status progression: `Intake`, `Diagnostic`, `Estimate/Devis`, `CustomerApproved`, `InRepair`, `Testing`, `Ready`, `Delivered`.
3. **Diagnostic & Labor Flat-Rate Engine**:
   - Technician assignment per job card.
   - Flat-rate standard repair hours vs technician actual time-clock logging.
   - Diagnostic notes and OBD-II scanner error code logging.
4. **Spare Parts & Consumables Inventory**:
   - Multi-depot parts catalog with OEM part numbers and aftermarket cross-references.
   - Bin location tracking in garage workshop depot.
   - Instant stock deduction when parts are added to an active work order.
   - Profit margin calculator (Cost price vs selling price markup).
5. **Estimates (Devis) & Commercial Approval**:
   - Two-phase approval: Diagnostic estimate sent to vehicle owner (SMS/WhatsApp link) -> Owner approves -> Work begins.
   - Supplement management: If technician discovers unexpected damage during disassembly, generates an amendment estimate.
6. **Invoicing, Warranty & Gate Pass**:
   - Final invoice consolidating parts, labor, environmental disposal fee, and VAT.
   - Printable Repair Guarantee Certificate (*Certificat de Garantie*).
   - Digital Gate Pass (*Bon de Sortie Véhicule*) ensuring vehicle cannot exit without settled invoice.

#### End-to-End Operational User Flow
```
[Stage 1: Vehicle Reception & Intake Inspection]
  Vehicle arrives at workshop -> Service advisor enters License Plate/VIN -> Pulls up vehicle history or registers new vehicle -> Records customer complaints -> Walks around vehicle with tablet: records mileage, fuel gauge, marks body scratch diagram -> Generates signed "Ordre de Réparation (OR)" -> Key tagged with barcode.
               │
               ▼
[Stage 2: Diagnosis & Devis Preparation]
  Vehicle moved to inspection bay -> Technician diagnoses problem, enters required spare parts + labor hours into job card -> System compiles "Devis de Réparation" -> Advisor sends estimate to customer -> Customer approves via digital signature or SMS confirmation.
               │
               ▼
[Stage 3: Parts Requisition & Workshop Repair]
  Status moves to 'InRepair' -> Parts requisition sent to workshop stock depot -> Warehouse staff releases parts -> Stock auto-deducted at PAMP cost -> Technician clocks into task -> Performs mechanical work -> Tests vehicle.
               │
               ▼
[Stage 4: Quality Control & Road Test]
  Workshop foreman performs QC inspection -> Marks checklist (fluids topped, wheel nuts torqued, error codes cleared) -> Road test logged -> Status updated to 'Ready for Pickup' -> Automated notification sent to customer.
               │
               ▼
[Stage 5: Settlement, Invoicing & Delivery]
  Customer arrives -> Advisor reviews itemized invoice (parts breakdown + labor hours) -> Payment collected at cashier (cash/card/bank transfer) -> Warranty certificate and invoice printed -> System generates "Bon de Sortie" -> Vehicle keys released to owner.
```

---

### Category 4: Real Estate Brokerage & Property Lease Management (`real_estate` — FacilityType: 20)
*Scope: Real estate agencies, rental property managers, commercial leasing, and compound management.*

#### End-to-End Feature Catalog
1. **Property Portfolio & Unit Registry (CRUD)**:
   - Detailed property listing: Residential, commercial, office, land, industrial warehouse.
   - Unit specs: Surface m², rooms, floor, elevator, parking spaces, furnishings, amenities.
   - Photos, floor plans, legal deed references (*Acte de propriété, Livret foncier*).
   - Listing modes: For Rent, For Sale, Under Mandate, Archived.
2. **Tenants & Owners CRM**:
   - Property owner files: Bank details for rent disbursement, mandate contract dates, commission rates.
   - Tenant dossiers: Identity verification, employment letters, pay slips, guarantor documents.
3. **Lease Contracts & Rent Roll Engine**:
   - Lease contract creation (*Contrat de bail*): Start/end dates, monthly rent, payment periodicity (monthly, quarterly, annual), security deposit held.
   - Automated rent roll generation on the 1st of every month.
   - Instant printable Rent Receipts (*Quittances de loyer*) with unique sequential numbering and fiscal stamping.
4. **Property Inspections (État des Lieux)**:
   - Digital room-by-room check-in and check-out inspection checklist (walls, plumbing, electricity, locks, windows, appliances).
   - Meter readings intake (electricity, gas, water meters).
   - Photo attachment and digital signatures of landlord and tenant.
5. **Maintenance & Repairs Dispatch**:
   - Tenant maintenance ticket portal.
   - Vendor assignment (plumbers, electricians, painters) with quote validation.
   - Expense attribution toggle (Chargeable to Landlord, Chargeable to Tenant, or Agency overhead).
6. **Owner Payouts & Agency Commissions**:
   - Automated agency commission deduction (e.g., 1 month rent or 8% monthly fee).
   - Landlord payout disbursement statements (*Relevé de gestion propriétaire*) with bank transfer slips.

#### End-to-End Operational User Flow
```
[Stage 1: Mandate & Property Listing]
  Property owner approaches agency -> Agent creates Owner Profile -> Creates Property Listing with photos, surface, price -> Generates "Mandat de Gestion / Mandat de Vente" -> Property marked 'Available'.
               │
               ▼
[Stage 2: Prospect Visit & Tenant Qualification]
  Prospective tenant visits property -> Submits application -> Agent uploads tenant dossier (ID, income proof, guarantor) -> Landlord approves tenant -> Agent prepares Lease Contract.
               │
               ▼
[Stage 3: Lease Signing & État des Lieux]
  Agent, landlord, and tenant meet -> Execute "État des Lieux d'Entrée" with meter readings and room photos -> Sign "Contrat de Bail" -> Tenant pays initial rent + security deposit + agency commission -> Keys handed over -> Property marked 'Rented'.
               │
               ▼
[Stage 4: Recurring Rent Collection & Quittances]
  Each billing cycle -> System generates Rent Notice (*Avis d'échéance*) -> Tenant pays rent -> System generates stamped "Quittance de Loyer" -> Updates tenant ledger to 'Paid'.
               │
               ▼
[Stage 5: Landlord Settlement & Reporting]
  Monthly reconciliation -> System deducts agency commission and approved maintenance costs from collected rents -> Generates Landlord Financial Statement (*Compte de Gestion*) -> Issues bank transfer to landlord.
```

---

### Category 5: Light Manufacturing, Production & Workshop BOM (`manufacturing_production` — FacilityType: 21)
*Scope: Artisanal workshops, furniture, metal fabrication, food/bakery processing, plastic/textile assembly, and custom fabrication.*

#### End-to-End Feature Catalog
1. **Bill of Materials / Product Recipes (BOM / Nomenclature) (CRUD)**:
   - Multi-level BOM hierarchy: Finished good -> Sub-assemblies -> Raw materials & packaging.
   - Standard batch size, unit consumption coefficients, expected scrap/wastage percentage.
   - Standard labor routing (machine setup minutes, labor runtime minutes per workstation).
2. **Production Work Orders (Ordres de Fabrication — OF)**:
   - Work order generator linked to customer orders or stock replenishments.
   - Batch/Lot code allocation, scheduled start date, deadline date.
   - Production phases: `Draft`, `Scheduled`, `MaterialsIssued`, `InProduction`, `QualityInspection`, `Completed`.
3. **Raw Materials Allocation & Stock Issue**:
   - Automated material reservation check (prevents scheduling if raw components are missing).
   - Instant raw material stock issue vouchers (*Bon de Sortie Matière Première*) deducting inventory at PAMP.
   - By-product and recyclable scrap tracking.
4. **Shop Floor & Workstation Management**:
   - Visual workstation queue (e.g., Cutting, Welding, Assembly, Painting, Packaging).
   - Operator job clocking and labor time entry per production order.
   - Machine maintenance breakdown logging.
5. **Quality Control & Finished Goods Intake**:
   - QC inspection checklist on finished batch (dimensions, weight, visual defects, laboratory assay).
   - Segregation of accepted units vs rejected units (rework vs scrap).
   - Automatic finished goods intake voucher (*Bon d'Entrée Produit Fini*) stocking finished items into the warehouse.
6. **Cost Accounting & Variance Analysis**:
   - Actual unit production cost calculation (Raw Materials + Direct Labor + Machine Overhead).
   - Standard cost vs Actual cost variance analysis.

#### End-to-End Operational User Flow
```
[Stage 1: Production Planning & OF Creation]
  Sales order confirmed or warehouse reaches minimum stock threshold -> Production manager creates "Ordre de Fabrication (OF)" -> Selects Finished Product & BOM recipe -> Specifies batch quantity -> System calculates required raw materials.
               │
               ▼
[Stage 2: Material Check & Stock Requisition]
  System validates warehouse raw stock -> Generates "Bon de Sortie Matière" -> Warehouse releases raw ingredients/parts to factory floor -> Raw stock deducted from central inventory -> OF status moves to 'MaterialsIssued'.
               │
               ▼
[Stage 3: Shop Floor Execution & Workstation Routing]
  OF moves through shop floor stages: Station 1 (Cutting) -> Station 2 (Assembly) -> Station 3 (Finishing) -> Operators scan OF barcode at each station -> System tracks actual elapsed machine and labor hours.
               │
               ▼
[Stage 4: Quality Control & Batch Acceptance]
  Batch finishes final assembly -> Quality inspector performs QC checklist -> Records yield (e.g., 500 units produced: 495 passed, 5 rejected) -> Assigns Batch Lot Number and Expiration Date (if food/chemical) -> Signs QC acceptance certificate.
               │
               ▼
[Stage 5: Finished Goods Stocking & Cost Absorption]
  System creates "Bon d'Entrée Produit Fini" -> 495 units loaded into central distribution warehouse -> System aggregates total actual costs -> Calculates true unit cost price (PAMP) -> OF closed -> Inventory ready for B2B commercial sales.
```

---

### Category 6: Legal Cabinets, Notaries & Accounting Firms (`legal_accounting` — FacilityType: 22)
*Scope: Law firms (Avocats), notary offices, accounting & auditing cabinets, and tax consultants.*

#### End-to-End Feature Catalog
1. **Case Dockets & Matters Registry (CRUD)**:
   - Comprehensive matter dossier: Case number, court jurisdiction, presiding judge, case category (Commercial, Civil, Penal, Labor, Administrative, Real Estate Act).
   - Adverse party information and opposing legal counsel directory.
   - Milestone activity log (every pleading filed, client meeting, correspondence).
2. **Court Calendar & Statutory Deadlines**:
   - Hearing diary (*Calendrier des Audiences*) filtered by court jurisdiction and assigned lawyer.
   - Statutory countdown timer for limitation periods (*Délais de recours, d'appel, de cassation*).
   - Automatic reminders for document filing cut-offs.
3. **Confidential Document Vault**:
   - Structured folder hierarchy: Pleading briefs (*Conclusions*), evidentiary exhibits (*Pièces*), court orders (*Jugements, Arrêts*), notarized acts (*Actes authentiques*).
   - PDF watermarking and version control.
4. **Billable Time & Retainer Ledger**:
   - Active task timer tracking billable minutes per lawyer/associate.
   - Standardized flat-fee schedule (court attendance, contract drafting, act registration).
   - Client retainer account management (*Provisions sur honoraires*).
   - Out-of-pocket court disbursements tracking (*Débours, droits de timbre, frais d'huissier*).
5. **Trust Escrow Accounting (Compte Séquestre / Fonds Clients)**:
   - Segregated ledger for client trust funds (settlement awards, real estate escrow deposits, inheritance balances).
   - Strict separation preventing trust funds from commingling with firm operating revenue.
6. **Invoicing & Fee Statements**:
   - Detailed fee notes (*Notes d'honoraires*) itemizing hours, acts, and disbursements.
   - Trust-to-fee transfer reconciliation upon client sign-off.

#### End-to-End Operational User Flow
```
[Stage 1: Client Intake & Conflict Check]
  New client arrives -> Legal assistant enters client details and adverse party -> System performs automated conflict-of-interest check -> Creates "Dossier d'Affaire" -> Assigns lead attorney -> Generates engagement letter (*Convention d'honoraires*).
               │
               ▼
[Stage 2: Retainer Deposit & Docket Setup]
  Client pays initial retainer (*Provision*) -> Assistant records payment into client trust ledger -> Scans and organizes evidentiary documents in Document Vault -> Sets court filing deadline dates.
               │
               ▼
[Stage 3: Drafting & Court Proceedings]
  Attorneys draft pleadings (*Conclusions*) -> Clock billable hours -> Attend court hearings (*Audiences*) -> Record hearing outcome and next adjourned date in Court Calendar -> System sends automated case status update to client.
               │
               ▼
[Stage 4: Disbursement & Settlement Handling]
  Court fees and expert witness disbursements (*Débours*) paid from client fund -> If court awards damages or notary closes transaction -> Funds deposited into client escrow account (*Compte séquestre*).
               │
               ▼
[Stage 5: Final Fee Statement & Trust Disbursement]
  Matter concludes -> Attorney prepares finalized "Note d'Honoraires" -> Itemizes legal fees + reimbursed disbursements -> Retainer funds transferred to firm operating account -> Surplus escrow funds remitted to client with certified reconciliation report -> Case archived.
```

---

### Category 7: Logistics, Courier & Parcel Delivery Dispatch (`logistics_delivery` — FacilityType: 23)
*Scope: Courier companies, e-commerce last-mile delivery, express parcel transport, and distribution sorting hubs.*

#### End-to-End Feature Catalog
1. **Parcel Waybills & Airway Bills (AWB / Bordereau de Livraison) (CRUD)**:
   - Consignment creation: Sender details, recipient name, phone, address, Wilaya/Commune, parcel weight, dimensions, fragile flag.
   - Cash-on-Delivery (COD) amount to collect, shipping fee attribution (Prepaid by merchant vs Collect from recipient).
   - Printable thermal shipping labels (100x150mm) with Code128 / QR tracking barcodes.
2. **Dispatch Operations & Driver Manifests**:
   - Batch assignment of parcels to driver delivery runs based on geographical zones/Wilayas.
   - Printable Delivery Run Sheet (*Feuille de Route / Manifeste Chauffeur*) with recipient list and total COD expected.
   - Real-time parcel status progression: `ReceivedAtHub`, `Sorted`, `AssignedToDriver`, `OutForDelivery`, `Delivered`, `Postponed`, `Failed/Refused`, `ReturnedToHub`.
3. **Hub Barcode Scanning & Cross-Dock Sorting**:
   - Fast keyboard/scanner wedge barcode scanning for high-speed parcel sorting.
   - Inter-hub transfer manifests (*Bordereau de Transfert Inter-Centres*).
   - Return-to-Sender (RTS) quarantine holding area.
4. **Driver Mobile Handover & Delivery Sign-off**:
   - Recipient digital signature capture on delivery confirmation.
   - Proof-of-delivery (POD) photo capture (e.g. package handed to client at doorway).
   - Non-delivery reason codes (Customer unreachable, incorrect address, refused package, postponed).
5. **Cash-on-Delivery (COD) Reconciliation**:
   - End-of-day driver cash turn-in balancing (Cash collected vs delivered parcels reconciliation).
   - Discrepancy flagging for uncollected COD.
6. **Merchant Settlements & Payouts**:
   - Automated merchant settlement statements (*Règlement e-commerçant*): Total COD collected minus logistics delivery fees.
   - Bank transfer slips (CCP / Virement bancaire) export for bulk merchant payout.

#### End-to-End Operational User Flow
```
[Stage 1: Parcel Intake & Waybill Generation]
  E-commerce merchant drops parcels at hub or courier driver pickups batch -> Hub operator scans packages or imports CSV order file -> Prints AWB barcode thermal stickers -> Packages placed in Intake Staging Area.
               │
               ▼
[Stage 2: Hub Sorting & Transfer Dispatch]
  Hub sorting team scans parcels into destination Wilaya bins -> Parcels going to distant hubs loaded into inter-wilaya trucks with Transfer Manifest -> Local delivery parcels grouped into neighborhood delivery zones.
               │
               ▼
[Stage 3: Driver Manifest & Run Assignment]
  Dispatcher generates "Feuille de Route" -> Assigns 60 parcels to driver -> Driver scans each parcel onto van -> Verifies package count & expected COD total -> Status updates to 'OutForDelivery' -> Customer receives tracking SMS.
               │
               ▼
[Stage 4: Delivery Execution & POD Capture]
  Driver arrives at customer location -> Customer inspects parcel -> Driver collects COD cash -> Recipient signs on mobile screen / Driver takes delivery photo -> Status updates instantly to 'Delivered'. (If client unavailable: marks 'Postponed - Day 2').
               │
               ▼
[Stage 5: Driver Cash Turn-In & Merchant Payout]
  Driver returns to hub -> Cashier audits returned packages + counts cash collected -> Matches penny-for-penny with manifest -> Cash safely deposited in hub safe -> System prepares Merchant Settlement Sheet -> Transfers net COD funds to merchant's bank account -> Mission closed.
```

---

### Category 8: Construction, Field Contracting & BTP Trades (`construction_contractor` — FacilityType: 24)
*Scope: General building contractors, electrical, plumbing, HVAC, masonry, and civil engineering renovation firms.*

#### End-to-End Feature Catalog
1. **Construction Sites & Projects (Chantiers) (CRUD)**:
   - Project directory: Client, site location, supervising architect/engineer, start date, contract completion deadline.
   - Contractual value, budget ceiling, site supervisor (*Chef de chantier*) assignment.
   - Daily site logbook (*Journal de chantier*): Weather conditions, workforce headcount on site, equipment working hours, incidents.
2. **Bill of Quantities / Detailed Estimates (Devis Estimatif & Quantitatif - BOQ)**:
   - Hierarchical work breakdown structure (Earthworks, Structural Concrete, Masonry, Plumbing, Electrical, Painting).
   - Standard units of measure ($m^2, m^3, ml, kg, forfait$), planned quantity, agreed unit price.
   - Resource cost breakdown (Materials + Labor hours + Heavy machinery rental).
3. **Progress Verification & Attachements de Travaux**:
   - Periodic site survey of completed quantities measured jointly with client site engineer.
   - Cumulative percentage of completion calculation.
   - Generation of official signed Works Progress Certificates (*Attachements de Travaux*).
4. **Progress Billing & Decomptes (DGP / DGD)**:
   - Monthly Provisional Progress Invoices (*Décompte Général Provisoire - DGP*).
   - Contractual warranty retention deduction (typically 5% or 10% *Retenue de garantie BTP*).
   - Start-up advance repayment amortization (*Amortissement de l'avance de démarrage*).
   - Final statement of account (*Décompte Général Définitif - DGD*) upon project handover.
5. **Site Material Logistics & Heavy Equipment**:
   - Site material delivery notes (*Bons de livraison chantier*) tracking gravel, cement, rebar, pipes delivered to specific sites.
   - Heavy machinery daily operating logs (Excavators, cranes, dump trucks: runtime hours, fuel consumption).
6. **Subcontractor Management & Pay Applications**:
   - Subcontractor agreement contracts (*Contrats de sous-traitance*).
   - Subcontractor work progress validation before approving subcontractor invoices.

#### End-to-End Operational User Flow
```
[Stage 1: Contract Award & BOQ Setup]
  Company wins building contract -> Project manager creates Site Profile -> Imports Bill of Quantities (BOQ) with itemized unit prices -> Defines start date, target milestones, and contractual retention rate (e.g. 5%) -> Site supervisor assigned.
               │
               ▼
[Stage 2: Mobilization & Daily Site Operations]
  Machinery & materials dispatched to site -> Daily logs recorded: weather, workforce on site, equipment fuel -> Material delivery vouchers checked against purchase orders -> Work progress logged against BOQ items.
               │
               ▼
[Stage 3: Joint Measurement & Attachement Certification]
  End of month -> Site supervisor and client engineer inspect completed work -> Measure verified quantities -> Sign official "Attachement de Travaux" -> Attachement locked in Atrium system.
               │
               ▼
[Stage 4: Provisional Progress Invoicing (DGP)]
  Accountant generates "Décompte Général Provisoire (DGP)" from signed Attachement -> System calculates gross completed value -> Deducts 5% warranty retention -> Deducts contractual advance repayment fraction -> Adds applicable VAT -> Prints official stamped DGP invoice.
               │
               ▼
[Stage 5: Final Handover (Réception Provisoire & Décompte Définitif)]
  Site completion reached -> Client executes Provisional Handover (*Réception Provisoire*) -> 1-year warranty period begins -> At end of warranty period: Final Handover (*Réception Définitive*) signed -> Retained 5% warranty deposit released and paid to contractor -> Project fully closed.
```

---

### Category 9: Agriculture, Farm & Livestock Management (`agriculture_farming` — FacilityType: 25)
*Scope: Commercial crop farms, greenhouses, fruit orchards, olive groves, poultry farms, and dairy/cattle livestock.*

#### End-to-End Feature Catalog
1. **Farm Parcels & Greenhouse Mapping (CRUD)**:
   - Land parcel directory: Surface area (Hectares / Aren), soil classification, irrigation type (Drip, Sprinkler, Pivot, Rainfed), GPS coordinates polygon.
   - Greenhouse tunnel numbering and indoor microclimate logging.
2. **Crop Cycles & Cultural Operations**:
   - Crop cycle planning: Crop species, variety, sowing/planting date, target harvest date.
   - Farm activity journal: Soil plowing, weeding, pruning, irrigation hours, fertilizer application.
   - Phytosanitary treatment safety journal (Active chemical, dosage, mandatory pre-harvest withdrawal delay *Délai Avant Récolte - DAR*).
3. **Harvest Records & Yield Tracking**:
   - Daily harvest intake logs: Quantity picked (Crates, kilograms, tons), field labor team assignment.
   - Yield comparison analysis (Actual yield per hectare vs seasonal regional benchmark).
4. **Livestock Herd Management**:
   - Individual animal registry with official ear-tag ID, breed, sex, birth date, mother/father lineage.
   - Daily production logs (Liters of milk collected, egg trays produced).
   - Veterinary health book: Vaccinations, deworming, inseminations, veterinary medical treatments.
5. **Farm Inputs & Chemicals Inventory**:
   - Stock depot for seeds, fertilizers (NPK, urea), pesticides, and animal feed.
   - Safe chemical storage regulation tracking and expiration date alerts.
   - Instant stock deduction when agricultural inputs are applied to parcels.
6. **Weighbridge & Farm-Gate Commerce**:
   - Integration with weighbridge tickets (*Bons de pesage / Poids public*): Gross weight, tare weight, net weight calculation.
   - Bulk transport slips (*Bons de transport agricole*).
   - Sales ledger for transactions with agricultural cooperatives or wholesale market brokers (*Mandataires de gros*).

#### End-to-End Operational User Flow
```
[Stage 1: Parcel Preparation & Crop Cycle Launch]
  Farm manager creates Parcel Profile (e.g. "Parcel North - 12 Hectares") -> Launches new Crop Cycle ("Tomatoes - San Marzano") -> Inputs planting date and expected harvest period -> System schedules irrigation and fertilizer routines.
               │
               ▼
[Stage 2: Cultural Operations & Input Application]
  Agronomist schedules fertilizing & treatment -> System generates "Bon de Sortie Intrant" -> Warehouse issues NPK fertilizer -> System logs application date and warns staff of pre-harvest safety delay (DAR).
               │
               ▼
[Stage 3: Harvest Logging & Field Intake]
  Harvest begins -> Daily picking crews harvest crops -> Harvested crates weighed at field collection point -> Supervisor enters daily harvest slip (e.g. 8,500 kg picked) -> Allocates piece-rate wages to picking crew.
               │
               ▼
[Stage 4: Weighbridge & Transport Dispatch]
  Truck arrives for bulk dispatch -> Truck drives onto farm weighbridge: Gross weight recorded -> Truck loaded with produce -> Tare weight subtracted -> System calculates Net Produce Weight -> Generates signed "Bon de Pesage" and "Bon de Transport".
               │
               ▼
[Stage 5: Wholesale Broker Settlement & Accounting]
  Produce delivered to wholesale market broker (*Mandataire*) -> Broker issues sales liquidation slip -> Farm accountant enters broker sale voucher -> Deducts broker commission and packaging costs -> Net sales revenue recorded in Atrium treasury -> Parcel cycle profitability report generated.
```

---

## 3. Data Architecture & Quadruple Traceability Assurance

Across all 9 categories, the canonical PostgreSQL schema enforces:

```sql
-- Architectural Invariant: Every table implements the Quadruple Traceability contract
CREATE TABLE IF NOT EXISTS public.<category_table> (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    
    -- Category-specific attributes (JSONB + Typed Columns)
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    
    -- Timestamps & Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced'
);

-- Compound Index for Multi-Tenant Query Isolation
CREATE INDEX IF NOT EXISTS idx_<category_table>_composite 
ON public.<category_table>(business_id, branch_id, status);
```

---

## 4. UI Component Library Standard

When implementing views for these categories, UI screens must exclusively compose from our verified, high-performance UI patterns:
- **`HeaderBar`**: Sticky header with category breadcrumbs, business switcher, branch selector, and language selector.
- **`Toolbar`**: Dense horizontal strip with instant search input (`Ctrl+K`), quick filter dropdowns, active chip tags, and primary modal launch button.
- **`DataTable`**: Dense striped rows, sortable column headers, badge status indicators, tabular numbers, and row action meatballs menu.
- **`ModalWizard`**: Progressive disclosure multi-step dialog with animated step indicator, validation guards per step, keyboard navigation, and full Arabic RTL layout mirroring.
- **`PrintPreviewModal`**: Trilingual thermal 80mm/58mm and A4 document preview with instant browser print trigger and PDF download.
