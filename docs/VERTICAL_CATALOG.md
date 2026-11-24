# Atrium ERP & CRM — Complete Vertical Catalog & Source-Verified Truth Map

**Document Scope & Source-Truth Policy**:  
This document maps every business vertical (`BusinessCategory`), expected business trade (`FULL_16_VERTICAL_CATALOG`), screen, role view, interactive action, domain calculation rule, input/output document, TypeScript model, Supabase table/RPC, and `localStorage` persistence key that **actually exists in the live codebase**. All statements reflect observed source files only. Every toast-only stub, hardcoded baseline, client-only React state, unexposed hook/rule function, or routing/schema mismatch is explicitly flagged under **Truth Notes**.

---

## Table of Contents

- [1. Cross-Vertical Architecture Matrix](#1-cross-vertical-architecture-matrix)
  - [1.1 Storage & Sync Architecture (Group A vs. Group B)](#11-storage--sync-architecture-group-a-vs-group-b)
  - [1.2 Master 16-Vertical Matrix](#12-master-16-vertical-matrix)
  - [1.3 Complete 160-Trade Expected Business Catalog](#13-complete-160-trade-expected-business-catalog)
  - [1.4 Offline Queue, Delta Sync & Core `localStorage` Keys](#14-offline-queue-delta-sync--core-localstorage-keys)
- [2. Shared Cross-Vertical Modules](#2-shared-cross-vertical-modules)
  - [2.1 Home Hall (`CategoryHomeRouter`) & Front-Desk Kiosks](#21-home-hall-categoryhomerouter--front-desk-kiosks)
  - [2.2 Staff, Attendance & Algerian Payroll (`StandardStaffScreen`)](#22-staff-attendance--algerian-payroll-standardstaffscreen)
  - [2.3 History, Audit & Undo (`VerticalHistoryScaffold` & `undoEngine`)](#23-history-audit--undo-verticalhistoryscaffold--undoengine)
  - [2.4 Settings & Backup (`SettingsScreen`)](#24-settings--backup-settingsscreen)
  - [2.5 Global Modals & Overlays](#25-global-modals--overlays)
- [3. Per-Vertical Deep Dives (All 16 Verticals)](#3-per-vertical-deep-dives-all-16-verticals)
  - [3.1 `membership_session` — Membership / Gym & Fitness](#31-membership_session--membership--gym--fitness)
  - [3.2 `appointment_service` — Appointment / Salon & Beauty](#32-appointment_service--appointment--salon--beauty)
  - [3.3 `pos_inventory` — Restaurant & POS Retail](#33-pos_inventory--restaurant--pos-retail)
  - [3.4 `project_milestone` — Projects & Agency](#34-project_milestone--projects--agency)
  - [3.5 `rental_booking` — Rentals, Coworking & Venue](#35-rental_booking--rentals-coworking--venue)
  - [3.6 `education_cohort` — Education, Academy & Tutoring](#36-education_cohort--education-academy--tutoring)
  - [3.7 `freelance_solo` — Freelancers & Solo Practice](#37-freelance_solo--freelancers--solo-practice)
  - [3.8 `trading_commercial` — Commercial Trading & Wholesale](#38-trading_commercial--commercial-trading--wholesale)
  - [3.9 `medical_clinic` — Medical Clinic & Health Practice](#39-medical_clinic--medical-clinic--health-practice)
  - [3.10 `auto_garage` — Automotive Garage & Fleet Repair](#310-auto_garage--automotive-garage--fleet-repair)
  - [3.11 `real_estate` — Real Estate Agency & Brokerage](#311-real_estate--real-estate-agency--brokerage)
  - [3.12 `manufacturing_production` — Manufacturing & Workshop Production](#312-manufacturing_production--manufacturing--workshop-production)
  - [3.13 `legal_accounting` — Legal Cabinet, Notary & Accounting](#313-legal_accounting--legal-cabinet-notary--accounting)
  - [3.14 `logistics_delivery` — Logistics, Couriers & Delivery](#314-logistics_delivery--logistics-couriers--delivery)
  - [3.15 `construction_contractor` — Construction & BTP Contracting](#315-construction_contractor--construction--btp-contracting)
  - [3.16 `agriculture_farming` — Agri-Business & Livestock Farming](#316-agriculture_farming--agri-business--livestock-farming)

---

## 1. Cross-Vertical Architecture Matrix

### 1.1 Storage & Sync Architecture (Group A vs. Group B)

Atrium uses two distinct persistence architectures across its 16 verticals:

| Tier | Architecture | Verticals | Backing Persistence |
| :--- | :--- | :--- | :--- |
| **Group A (Core `store.ts` Slices)** | Centralized reactive state in `src/services/store.ts` backed by seed fixtures + targeted Supabase service calls / `syncCoordinator` offline queue | `membership_session`, `appointment_service`, `pos_inventory`, `project_milestone`, `rental_booking`, `education_cohort`, `freelance_solo`, `trading_commercial` | Dedicated Supabase tables per vertical (plus `store.ts` slice fallback; note some actions like `addMemberCheckIn` and `recordQuickAttendance` are local-only in `store.ts`) |
| **Group B (Isolated Domain Data Hooks)** | Component/domain React state initialized by `use*Data.ts` hooks under `src/components/screens/<vertical>/` importing `syncCoordinator` directly alongside Supabase service modules | `medical_clinic`, `auto_garage`, `real_estate`, `manufacturing_production`, `legal_accounting`, `logistics_delivery`, `construction_contractor`, `agriculture_farming` | Dedicated Supabase tables for most domains; **`agriculture_farming`** packs extended entities into `agri_*` tables using `__atrium_agri__:` JSON envelopes |

**Cross-Cutting Architecture Truth Notes**:
- **Router Fallbacks (`src/App.tsx`)**: Unmapped `ActiveScreen` values for most verticals fall back to the vertical's main dashboard. `Sidebar.tsx` determines which routes are exposed per active role.
- **Role Switchers**: Role-segmented verticals store active role state in `store.ts` (`activePmRole`, `activeMembershipRole`, `activeAppointmentRole`, `activePosRole`, `activeEducationRole`, `activeGarageRole`, `activeRealEstateRole`, `activeManufacturingRole`, `activeLegalRole`, `activeLogisticsRole`, `activeContractorRole`, `activeAgriRole`).

### 1.2 Master 16-Vertical Matrix

| # | `BusinessCategory` (`FacilityType`) | EN / FR Titles | Roles | Primary Domain Entities (TypeScript) | Default Fiscal (`businessConfig.ts`) | Dedicated Supabase Tables / Service |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `membership_session` (1) | **Membership** / *Membership* | `owner`, `staff` | `Member`, `MembershipPlan`, `RegistrationLead`, `ScheduleEvent`, `Product`, `MemberCheckInLog`, `WalkInTicket` | DZD, TVA `19%`, Timbre `true`, Form `SARL` | `gym_members`, `gym_plans`, `gym_registration_leads`, `gym_schedule_events`, `gym_check_ins`, `gym_walk_in_tickets` (`memberService.ts`) |
| **2** | `appointment_service` (5) | **Appointment** / *Salon & Beauté* | `owner`, `staff` | `Member` (Client), `ServiceItem`, `Appointment`, `StylistPayout`, `SalonWorkstation`, `SalonChairStation` | DZD, TVA `19%`, Timbre `true`, Form `PersonnePhysique` | `salon_appointments`, `salon_services`, `salon_stylist_payouts`, `salon_chair_stations`, `salon_workstations` (`appointmentService.ts`) |
| **3** | `pos_inventory` (6) | **Restaurant & POS Retail** / *Restaurant & Commerce POS* | `owner`, `staff` | `Product`, `Sale`, `ParkedOrder`, `StockMovement`, `ReceiptConfig`, `PurchaseDocument`, `B2bSupplier` | DZD, TVA `19%`, Timbre `true`, Form `SARL` | `pos_products`, `pos_sales`, `pos_parked_orders`, `pos_stock_movements`, `pos_receipt_configs` (`posService.ts`) + `trading_purchase_docs`, `trading_b2b_suppliers` |
| **4** | `project_milestone` (13) | **Projects & Agency** / *Projets & Agence* | `direction`, `chef_projet`, `crea`, `superviseur`, `rh`, `compta` | `PMClient`, `PMProject`, `PMMilestone`, `PMCollateralItem`, `PMPrintOrder`, `PMBatDeliverable`, `PMTalent`, `PMMission`, `PMMissionStaff`, `PMAttendance`, `PMExpense`, `PMPayrollBatch`, `PMCcpSlip`, `PMEquipmentStock` | DZD, TVA `19%`, Timbre `false`, Form `SARL` | `pm_staff`, `pm_clients`, `pm_projects`, `pm_milestones`, `pm_collateral_catalog`, `pm_print_orders`, `pm_bat_deliverables`, `pm_talents`, `pm_missions`, `pm_mission_staff`, `pm_attendances`, `pm_expenses`, `pm_payroll_batches`, `pm_ccp_slips`, `pm_equipment_stock` (`projectMilestoneService.ts`) |
| **5** | `rental_booking` (14) | **Rentals, Coworking & Venue** / *Locations, Coworking & Salles* | Standard (`owner` / staff via Workforce RBAC) | `RentableUnit`, `RentalBooking`, `RentalRenter`, `SecurityDepositRecord` | DZD, TVA `19%`, Timbre `true`, Form `SARL` | `rental_units`, `rental_renters`, `rental_bookings`, `rental_security_deposits` (`rentalService.ts`) |
| **6** | `education_cohort` (15) | **Education, Academy & Tutoring** / *Éducation, Académie & Formation* | `owner`, `staff` | `EduCourse`, `EduClassroom`, `EduCohort`, `EduStudent`, `EduEnrollment`, `EduSession`, `EduAttendance`, `EduGrade`, `EduCertificate`, `EduAdmissionLead`, `EduQuickAttendanceRecord` | DZD, TVA `0%`, Timbre `false`, Form `SARL` | `edu_courses`, `edu_classrooms`, `edu_cohorts`, `edu_students`, `edu_enrollments`, `edu_sessions`, `edu_attendance`, `edu_grades`, `edu_certificates`, `edu_admissions` (`educationService.ts`) |
| **7** | `freelance_solo` (16) | **Freelancers & Solo Practice** / *Freelances & Indépendants* | Solo | `FreelanceClient`, `FreelanceProject`, `FreelanceDeliverable`, `TimeLogEntry`, `FreelanceInvoice`, `FreelanceProposal`, `FreelanceExpense`, `ActiveTimerState` | DZD, TVA `0%`, Timbre `false`, Form `AutoEntrepreneur` (`IFU`) | `freelance_clients`, `freelance_projects`, `freelance_time_logs`, `freelance_invoices`, `freelance_proposals`, `freelance_expenses` (`freelanceService.ts`) |
| **8** | `trading_commercial` (17) | **Commercial Trading & Wholesale** / *Négoce & Vente en Gros* | Standard | `B2bClient`, `B2bSupplier`, `WarehouseDepot`, `CommercialDocument`, `PurchaseDocument`, `StockMovementVoucher`, `Product` | DZD, TVA `19%`, Timbre `true`, Form `SARL` | `trading_warehouses`, `trading_b2b_clients`, `trading_b2b_suppliers`, `trading_products`, `trading_commercial_docs`, `trading_purchase_docs`, `trading_stock_vouchers` (`tradingService.ts`) |
| **9** | `medical_clinic` (18) | **Medical Clinic & Health Practice** / *Clinique & Cabinet Médical* | Standard | `MedicalPractitioner`, `DoctorOrdonnanceConfig`, `MedicalPatient`, `MedicalConsultation`, `MedicalAppointmentSlot`, `MedicalPrescription`, `MedicalLabRecord`, `MedicalCertificateRecord`, `ChifaClaimRecord`, `ClinicConsumableItem`, `DailyCashClosure` | DZD, TVA `9%`, Timbre `false`, Form `Liberal` (`CNOM`) | `medical_staff`, `medical_departments`, `medical_patients`, `medical_appointments`, `medical_consultations`, `medical_consumables`, `medical_invoices` (`medicalService.ts`) |
| **10** | `auto_garage` (19) | **Automotive Garage & Fleet Repair** / *Garage & Réparation Auto* | `gerant`, `reception`, `mecanicien`, `magasinier`, `caisse` | `GarageVehicle`, `GarageWorkOrder`, `AutoPart` (+ bays, fleet contracts & garage invoices) | DZD, TVA `19%`, Timbre `true`, Form `EURL` | `garage_bays`, `garage_vehicles`, `garage_work_orders`, `garage_parts`, `garage_fleet_contracts`, `garage_invoices` (`garageService.ts`) |
| **11** | `real_estate` (20) | **Real Estate Agency & Brokerage** / *Agence Immobilière & Baux* | `direction`, `negociateur`, `gestionnaire_locatif`, `notaire_compta` | `RealEstateProperty`, `RealEstateMandate`, `RealEstateLease`, `RentalQuittanceRecord`, `BonDeVisiteRecord`, `RealEstateInspection`, `BuyerDemandProfile` | DZD, TVA `19%`, Timbre `true`, Form `SARL` | `re_properties`, `re_mandates`, `re_leases`, `re_rent_schedules`, `re_visits`, `re_inspections`, `re_leads` (`realEstateService.ts`) |
| **12** | `manufacturing_production` (21) | **Manufacturing & Workshop Production** / *Atelier & Fabrication* | `gerant`, `chef_atelier`, `operateur`, `magasinier`, `qualite` | `ManufacturingBom`, `ManufacturingOrder`, `WorkstationSessionLog`, `RawMaterialStockItem`, `MaterialTransferVoucher`, `QualityInspectionRecord` | DZD, TVA `19%`, Timbre `true`, Form `SARL` | `mfg_raw_materials`, `mfg_bom_recipes`, `mfg_bom_ingredients`, `mfg_orders`, `mfg_workstation_logs`, `mfg_qc_inspections`, `mfg_material_vouchers` (`manufacturingService.ts`) |
| **13** | `legal_accounting` (22) | **Legal Cabinet, Notary & Accounting** / *Cabinet Juridique & Comptabilité* | `avocat_associe`, `notaire_titulaire`, `expert_comptable`, `secretaire_caisse` | `LegalMatter`, `LegalHearing`, `CPCADeadline`, `NotaryDeed`, `EscrowAccount`, `SCFJournalEntry`, `CashReceipt`, `LegalClientEntity` | DZD, TVA `19%`, Timbre `true`, Form `Liberal` | `legal_clients`, `legal_matters`, `legal_hearings`, `legal_deadlines`, `legal_documents`, `legal_escrow_movements`, `legal_time_entries`, `legal_cash_receipts` (`legalService.ts`) |
| **14** | `logistics_delivery` (23) | **Logistics, Couriers & Delivery** / *Logistique, Coursiers & Colis* | `gerant`, `dispatcher`, `hub_sorter`, `stop_desk_agent` | `LogisticsShipment`, `TransportBag`, `LogisticsManifest`, `CourierCashDischarge`, `StopDeskInventoryItem`, `MerchantRemittanceBatch` | DZD, TVA `19%`, Timbre `true`, Form `SARL` | `logistics_parcels`, `logistics_courier_bags`, `logistics_fleet`, `logistics_discharges`, `logistics_remittances`, `logistics_wilaya_tariffs` (`logisticsService.ts`) |
| **15** | `construction_contractor` (24) | **Construction & BTP Contracting** / *Construction & Entreprise BTP* | `gerant`, `conducteur`, `chef_chantier`, `metreur`, `comptable` (aliases `conducteur_travaux`, `daf_metreur`) | `ContractorProject`, `ContractorBoqItem`, `ContractorDailyLog`, `ContractorDgp`, `ContractorServiceOrder`, `ConcretePourRecord`, `SubcontractorAgreement`, `EquipmentLogRecord`, `CaisseExpenseRecord` | DZD, TVA `9%`, Timbre `true`, Form `SARL` (`CACOBATPH`) | `btp_projects`, `btp_boq_items`, `btp_daily_logs`, `btp_decomptes`, `btp_subcontractors`, `btp_equipment`, `btp_materials` (`contractorService.ts`) |
| **16** | `agriculture_farming` (25) | **Agri-Business & Livestock Farming** / *Agriculture & Élevage* | `gerant`, `chef_culture`, `zootechnicien`, `magasinier` | `AgriParcel`, `AgriCropCycle`, `AgriTreatmentLog`, `AgriWorker`, `AgriDailyPointage`, `AgriDairyCow`, `AgriMilkingRecord`, `AgriWeighbridgeTicket` | DZD, TVA `0%`, Timbre `false`, Form `PersonnePhysique` | `agri_parcels`, `agri_crop_cycles`, `agri_treatments`, `agri_livestock`, `agri_milking_logs`, `agri_harvests`, `agri_staff`, `agri_sales` (`agricultureService.ts`) |

#### Shared Core Supabase Tables & RPCs (Cross-Vertical)
- **Tables (`CORE_SYNC_TABLES` + Auth/Audit/License)**: `accounts` (`authService.ts`), `businesses`, `branches`, `devices` (`tenantService.ts`), `business_configs`, `category_formules` (`configService.ts`), `staff`, `staff_attendance_logs`, `staff_salary_advances`, `staff_payroll_runs`, `staff_payroll_slips` (`staffService.ts`), `account_subscriptions` (`licenseService.ts`), `immutable_audit_logs` (`auditService.ts`). *(See each vertical's Section E for active `*Service.ts` tables plus companion tables registered in `CATEGORY_TABLE_MAP` in `src/lib/supabase/syncCoordinator.ts`.)*
- **Supabase RPCs**: `onboard_owner_account`, `get_tenant_facilities`, `create_business`, `create_branch` (`tenantService.ts`); `get_staff_profiles`, `verify_staff_pin`, `set_staff_pin`, `get_staff_for_sync` (`staffService.ts`); `redeem_license_voucher` (`licenseService.ts`); `get_audit_logs_page` (`auditService.ts`).

---

### 1.3 Complete 160-Trade Expected Business Catalog

Extracted verbatim from `FULL_16_VERTICAL_CATALOG` in `src/utils/businessMapping.ts` (10 trades per vertical = 160 total trades):

#### 1. `membership_session`
1. `trade_gym_fitness` — **Gym & Fitness Center** / *Salle de sport & Fitness* / قاعة رياضة ولياقة بدنية (Badge: `Memberships`)
2. `trade_crossfit` — **CrossFit Box** / *Box CrossFit* / نادي كروس فيت (Badge: `Sessions`)
3. `trade_tennis_padel` — **Tennis & Padel Club** / *Club de Tennis & Padel* / نادي تنس وبادل (Badge: `Courts`)
4. `trade_martial_arts` — **Martial Arts & Judo Dojo** / *Dojo Karaté & Judo* / فنون قتالية وكاراتيه (Badge: `Dojo`)
5. `trade_boxing_mma` — **Boxing & MMA Club** / *Club de Boxe & MMA* / نادي ملاكمة وMMA (Badge: `Boxing`)
6. `trade_yoga_pilates` — **Yoga & Pilates Studio** / *Studio Yoga & Pilates* / استوديو يوغا وبيلاطس (Badge: `Wellness`)
7. `trade_dance_school` — **Dance & Movement Studio** / *École de danse & Rythme* / مدرسة رقص وفنون حركية (Badge: `Dance`)
8. `trade_swimming_pool` — **Swimming Pool & Academy** / *Piscine & Académie de Natation* / مسبح وأكاديمية سباحة (Badge: `Pool`)
9. `trade_bodybuilding` — **Bodybuilding & Power Gym** / *Salle de Musculation & Force* / قاعة كمال أجسام وقوة بدنية (Badge: `Lifting`)
10. `trade_climbing` — **Climbing & Athletics Hub** / *Centre d’Athlétisme & Escalade* / مركز ألعاب قوى وتسلق (Badge: `Athletics`)

#### 2. `appointment_service`
1. `trade_barber` — **Men's Barbershop** / *Barbershop & Coiffure Homme* / صالون حلاقة رجالي وعناية (Badge: `Barber`)
2. `trade_hair_salon` — **Women's Hair Studio** / *Salon de Coiffure Femme* / صالون حلاقة نسائي (Badge: `Hair Studio`)
3. `trade_beauty_institute` — **Beauty Institute & Care** / *Institut de Beauté & Soins* / معهد تجميل وعناية بالبشرة (Badge: `Beauty`)
4. `trade_nail_bar` — **Nail Bar & Pedicure Studio** / *Onglerie & Nail Bar* / صالون أظافر ومانيكير (Badge: `Nail Bar`)
5. `trade_spa_hammam` — **Urban Spa & Bath House** / *Spa Urbain & Hammam Traditionnel* / حمام تقليدي وسبا استرخاء (Badge: `Spa`)
6. `trade_lash_bar` — **Lash & Brow Lounge** / *Bar à Cils & Sourcils* / صالون رموش وحواجب (Badge: `Lashes`)
7. `trade_tanning_studio` — **Tanning Studio** / *Centre de Bronzage* / مركز تسمير البشرة (Badge: `Tanning`)
8. `trade_tattoo_piercing` — **Tattoo & Piercing Parlor** / *Studio Tatouage & Piercing* / استوديو وشم وبيرسينغ (Badge: `Tattoo`)
9. `trade_massage_therapy` — **Massage Therapy Clinic** / *Massothérapie & Réflexologie* / تدليك علاجي واسترخاء (Badge: `Therapy`)
10. `trade_advanced_aesthetics` — **Advanced Aesthetics & Laser** / *Centre d’Esthétique Avancée* / مركز تجميل متخصص وليزر (Badge: `Aesthetics`)

#### 3. `pos_inventory`
1. `trade_traditional_restaurant` — **Traditional Restaurant** / *Restaurant Traditionnel & Gastro* / مطعم تقليدي وعصري (Badge: `Dining`)
2. `trade_pizzeria` — **Woodfire Pizzeria** / *Pizzeria au feu de bois* / مطعم بيتزا إيطالية (Badge: `Pizza`)
3. `trade_cafe_bistro` — **Specialty Café & Tea Lounge** / *Café & Salon de thé* / مقهى وقاعة شاي (Badge: `Café`)
4. `trade_bakery_pastry` — **Bakery & Fine Pastry** / *Pâtisserie & Boulangerie* / مخبزة وحلويات تقليدية وعصرية (Badge: `Bakery`)
5. `trade_fast_food` — **Fast-Food & Burger Joint** / *Fast-Food & Burger Bar* / وجبات سريعة وساندويتش (Badge: `Fast Food`)
6. `trade_superette_grocery` — **Supermarket & Fine Grocery** / *Supérette & Épicerie fine* / سوبر ماركت وبقالة (Badge: `Grocery`)
7. `trade_clothing_boutique` — **Fashion Apparel Boutique** / *Boutique de Prêt-à-Porter* / محل ملابس جاهزة وأزياء (Badge: `Fashion`)
8. `trade_shoes_leather` — **Shoes & Leather Goods** / *Magasin de Chaussures & Cuir* / محل أحذية وحقائب جلدية (Badge: `Footwear`)
9. `trade_perfumery_cosmetics` — **Perfumery & Beauty Shop** / *Parfumerie & Cosmétiques* / محل عطور ومستحضرات تجميل (Badge: `Cosmetics`)
10. `trade_optical_store` — **Optical & Eyewear Store** / *Magasin d’Optique & Lunetterie* / محل نظارات وبصريات (Badge: `Optics`)

#### 4. `project_milestone`
1. `trade_comm_agency` — **Creative Agency** / *Agence de Communication Globale* / وكالة إشهار واتصال متكاملة (Badge: `Campaigns`)
2. `trade_digital_marketing` — **Digital Marketing Firm** / *Agence de Marketing Digital* / وكالة تسويق رقمي وإعلانات (Badge: `Digital`)
3. `trade_graphic_studio` — **Graphic & Brand Studio** / *Studio de Création Graphique* / استوديو تصميم وهوية بصرية (Badge: `Branding`)
4. `trade_av_production` — **Audiovisual Production House** / *Maison de Production Audiovisuelle* / شركة إنتاج سمعي بصري وسينمائي (Badge: `Production`)
5. `trade_event_agency` — **Event Planning Agency** / *Agence Événementielle & Foires* / وكالة تنظيم فعاليات ومعارض (Badge: `Events`)
6. `trade_street_marketing` — **Field Activation & Promoters** / *Activation Terrain & Street Marketing* / تسويق ميداني وتنشيط مبيعات (Badge: `Field Promo`)
7. `trade_public_relations` — **Public Relations Agency** / *Agence de Relations Presse (RP)* / وكالة علاقات عامة وإعلام (Badge: `PR`)
8. `trade_software_agency` — **IT Services & Software House** / *Société de Services IT & Dev Web* / شركة برمجيات وخدمات معلوماتية (Badge: `Software`)
9. `trade_motion_3d` — **Motion Design & 3D Lab** / *Studio Motion Design & 3D* / استوديو موشن جرافيك وأنيميشن (Badge: `Motion 3D`)
10. `trade_brand_consulting` — **Brand Strategy Consultancy** / *Cabinet Conseil en Stratégie de Marque* / مكتب استشارات العلامات التجارية (Badge: `Strategy`)

#### 5. `rental_booking`
1. `trade_wedding_hall` — **Wedding & Event Banquet Hall** / *Salle des Fêtes & Mariage* / قاعة حفلات وأعراس (Badge: `Banquet`)
2. `trade_coworking_space` — **Coworking Hub & Shared Desks** / *Espace de Coworking & Bureaux* / مساحة عمل مشتركة ومكاتب (Badge: `Coworking`)
3. `trade_conference_hall` — **Conference & Seminar Hall** / *Salle de Conférence & Séminaires* / قاعة مؤتمرات وندوات (Badge: `Conference`)
4. `trade_photo_studio` — **Professional Photo Studio** / *Studio Photo Professionnel* / استوديو تصوير فوتوغرافي محترف (Badge: `Photo Studio`)
5. `trade_sound_studio` — **Sound Recording Studio** / *Studio d’Enregistrement Musical* / استوديو تسجيل صوتي وموسيقى (Badge: `Audio Studio`)
6. `trade_car_rental` — **Car Rental Agency** / *Agence de Location de Véhicules* / وكالة كراء وتأجير سيارات (Badge: `Car Rental`)
7. `trade_av_equipment_rental` — **AV & Sound Gear Rental** / *Location Matériel Audiovisuel & Sono* / كراء معدات صوتية وإضاءة (Badge: `Gear Rental`)
8. `trade_popup_store` — **Pop-Up Store & Gallery** / *Espace Pop-up & Galerie Éphémère* / مساحة تجارية مؤقتة ومعارض (Badge: `Pop-up`)
9. `trade_training_rooms` — **Equipped Training Room Rental** / *Location Salles de Formation* / تأجير قاعات تدريب مجهزة (Badge: `Training Room`)
10. `trade_event_furniture` — **Event Furniture & Decor Rental** / *Location Mobilier Événementiel* / كراء أثاث وديكور الحفلات (Badge: `Party Rentals`)

#### 6. `education_cohort`
1. `trade_private_school` — **Private K-12 Academy** / *École Privée Primaire & Collège* / مدرسة خاصة ابتدائية ومتوسطة (Badge: `School`)
2. `trade_language_academy` — **Language Learning Academy** / *Académie de Langues Étrangères* / معهد تعليم اللغات الحية (Badge: `Languages`)
3. `trade_vocational_center` — **Vocational Training Institute** / *Centre de Formation Professionnelle* / مركز تكوين مهني معتمد (Badge: `Vocational`)
4. `trade_coding_school` — **Coding & Tech Bootcamp** / *École de Code & Informatique* / مدرسة برمجة ومعلوماتية (Badge: `Tech Academy`)
5. `trade_tutoring_center` — **Tutoring & After-School Center** / *Centre de Soutien Scolaire* / مركز دروس دعم وتقوية (Badge: `Tutoring`)
6. `trade_driving_school` — **Certified Driving School** / *Auto-École Agréée* / مدرسة تعليم سياقة معتمدة (Badge: `Driving`)
7. `trade_music_academy` — **Music School & Conservatory** / *École de Musique & Conservatoire* / معهد موسيقى وعزف (Badge: `Music`)
8. `trade_art_school` — **Fine Arts & Drawing Studio** / *École d’Art & Dessin* / مدرسة رسم وفنون جميلة (Badge: `Fine Arts`)
9. `trade_kids_robotics` — **Kids STEM & Robotics Lab** / *Académie de Robotique & STEM* / أكاديمية روبوتيك وذكاء للأطفال (Badge: `Robotics`)
10. `trade_business_institute` — **Business Management Academy** / *Institut de Gestion & Management* / معهد إدارة وتسيير الأعمال (Badge: `Business School`)

#### 7. `freelance_solo`
1. `trade_solo_dev` — **Solo Full-Stack Developer** / *Développeur Web & Mobile Solo* / مبرمج مواقع وتطبيقات مستقل (Badge: `Solo Dev`)
2. `trade_solo_designer` — **Solo UI/UX Product Designer** / *Designer UI/UX & Produit Solo* / مصمم واجهات مستخدم مستقل (Badge: `UI/UX`)
3. `trade_solo_editor` — **Solo Video Editor & Motion** / *Monteur Vidéo & Motion Solo* / مونتير فيديو وموشن جرافيك حر (Badge: `Editor`)
4. `trade_solo_copywriter` — **Solo Copywriter & Content Lead** / *Rédacteur Web & Copywriter Solo* / كاتب محتوى وإعلانات مستقل (Badge: `Copywriting`)
5. `trade_solo_translator` — **Certified Freelance Translator** / *Traducteur Assermenté Indépendant* / مترجم محلف ومعتمد مستقل (Badge: `Translator`)
6. `trade_solo_seo_growth` — **Solo SEO & Growth Strategist** / *Consultant SEO & Growth Solo* / خبير سيو وتسويق مستقل (Badge: `SEO Specialist`)
7. `trade_solo_photographer` — **Solo Event & Brand Photographer** / *Photographe & Vidéaste Solo* / مصور فوتوغرافي وفيديو حر (Badge: `Photo Solo`)
8. `trade_solo_cm` — **Solo Social Media Manager** / *Community Manager Freelance* / مسير صفحات ومنصات تواصل حر (Badge: `Social Media`)
9. `trade_solo_illustrator` — **Digital Illustrator & 2D Artist** / *Illustrateur & Artiste Digital* / رسام وفنان رقمي مستقل (Badge: `Illustrator`)
10. `trade_solo_data_analyst` — **Solo Data & Analytics Analyst** / *Consultant Data & Analytics Solo* / محلل بيانات وإحصائيات مستقل (Badge: `Data Analyst`)

#### 8. `trading_commercial`
1. `trade_wholesale_food` — **Wholesale Food & Groceries** / *Grossiste Produits Agroalimentaires* / تجارة الجملة للمواد الغذائية العامة (Badge: `Food Wholesale`)
2. `trade_wholesale_building_mat` — **Building Materials Trading** / *Négoce de Matériaux de Construction* / تجارة مواد البناء والخرسانة بالجملة (Badge: `Building Supply`)
3. `trade_wholesale_hardware` — **Industrial Hardware Wholesale** / *Quincaillerie Industrielle en Gros* / خردوات صناعية ولوازم مهنية بالجملة (Badge: `Hardware Supply`)
4. `trade_wholesale_auto_parts` — **Auto Spare Parts Distributor** / *Distributeur Pièces Détachées Auto* / توزيع قطع غيار السيارات بالجملة (Badge: `Auto Parts`)
5. `trade_wholesale_electrical` — **Electrical Supplies Wholesaler** / *Grossiste Matériel Électrique & Éclairage* / تجارة التجهيزات الكهربائية والإنارة بالجملة (Badge: `Electrical Supply`)
6. `trade_import_export` — **Import-Export & Global Trading** / *Société d’Import-Export & Négoce B2B* / شركة استيراد وتصدير وتجارة دولية (Badge: `Import / Export`)
7. `trade_wholesale_packaging` — **Packaging & Box Supplies** / *Fournisseur d’Emballage & Carton* / توزيع مواد التغليف والكرتون بالجملة (Badge: `Packaging`)
8. `trade_wholesale_cosmetics` — **Cosmetics & Drugstore Wholesale** / *Grossiste en Cosmétiques & Droguerie* / تجارة مستحضرات التجميل ومواد التنظيف بالجملة (Badge: `Drugstore Supply`)
9. `trade_wholesale_wood_metals` — **Timber, Aluminum & Steel Trading** / *Négoce Bois, Profilés Aluminium & Inox* / تجارة الخشب والحديد والألمنيوم بالجملة (Badge: `Metals & Timber`)
10. `trade_beverage_depot` — **Beverages Distribution Depot** / *Dépôt de Distribution de Boissons* / مستودع توزيع المشروبات والمياه المعدنية (Badge: `Beverage Depot`)

#### 9. `medical_clinic`
1. `trade_general_practitioner` — **General Medical Practice** / *Cabinet Médical Généraliste* / عيادة طب عام وفحوصات (Badge: `General Doctor`)
2. `trade_dental_clinic` — **Dental & Implantology Clinic** / *Cabinet Dentaire & Implantologie* / عيادة طب وجراحة الأسنان (Badge: `Dental Clinic`)
3. `trade_pediatric_clinic` — **Pediatric Medical Practice** / *Cabinet de Pédiatrie* / عيادة متخصصة في طب الأطفال (Badge: `Pediatrics`)
4. `trade_physiotherapy` — **Physical Therapy & Rehab** / *Centre de Kinésithérapie & Rééducation* / مركز علاج فيزيائي وترويض طبي (Badge: `Physiotherapy`)
5. `trade_ophthalmology` — **Ophthalmology Clinic** / *Cabinet d’Ophtalmologie* / عيادة طب وجراحة العيون (Badge: `Eye Clinic`)
6. `trade_cardiology` — **Cardiology Medical Practice** / *Cabinet de Cardiologie* / عيادة أمراض القلب والأوعية (Badge: `Cardiology`)
7. `trade_radiology_center` — **Ultrasound & Radiology Lab** / *Centre d’Échographie & Radiologie* / مركز أشعة وتصوير طبي (Badge: `Radiology`)
8. `trade_dermatology` — **Dermatology Medical Office** / *Cabinet de Dermatologie* / عيادة أمراض جلدية وتجميل طبي (Badge: `Dermatology`)
9. `trade_gynecology` — **Obstetrics & Gynecology Clinic** / *Cabinet de Gynécologie & Obstétrique* / عيادة طب النساء والتوليد (Badge: `Gynecology`)
10. `trade_speech_therapy` — **Speech Therapy & Psychology** / *Cabinet d’Orthophonie & Psychologie* / عيادة نطق وتخاطب وعلاج نفسي (Badge: `Speech Therapy`)

#### 10. `auto_garage`
1. `trade_mechanical_garage` — **General Mechanical Garage** / *Garage de Mécanique Générale* / ورشة صيانة وميكانيك عامة للسيارات (Badge: `Mechanic`)
2. `trade_body_paint_shop` — **Auto Body & Paint Workshop** / *Atelier de Tôlerie & Peinture Auto* / ورشة سمكرة ودهان سيارات (Badge: `Body & Paint`)
3. `trade_electronic_diagnostic` — **Electronic Diagnostics & Scanner** / *Centre de Diagnostic Électronique Scanner* / مركز فحص وتشخيص إلكتروني بسكانر (Badge: `Diagnostics`)
4. `trade_oil_tire_center` — **Oil Change & Tire Center** / *Station de Vidange & Pneumatique* / مركز تغيير زيت وإطارات (Badge: `Tire & Lube`)
5. `trade_auto_electrical_ac` — **Auto Electrical & AC Service** / *Atelier Électricité & Climatisation Auto* / ورشة كهرباء وتكييف سيارات (Badge: `Auto Electric`)
6. `trade_vehicle_inspection` — **Vehicle Inspection Center** / *Centre de Contrôle Technique Agréé* / مركز مراقبة تقنية دورية للسيارات (Badge: `Inspection`)
7. `trade_wheel_alignment` — **Wheel Alignment & Suspension** / *Atelier Géométrie & Suspension* / موازنة عجلات ونظام تعليق (Badge: `Alignment`)
8. `trade_engine_machining` — **Engine Machining & Head Rebuild** / *Atelier d’Usinage Culasses & Moteurs* / مخرطة وميكانيك دقيقة لمحركات السيارات (Badge: `Machining`)
9. `trade_auto_detailing` — **Auto Detailing & Ceramic Coat** / *Centre de Detailing & Protection Céramique* / مركز غسيل وتلميع وحماية سيراميك (Badge: `Detailing`)
10. `trade_moto_repair` — **Motorcycle & Scooter Repair** / *Garage de Réparation Motos & Scooters* / ورشة صيانة دراجات نارية وسكوتر (Badge: `Moto Repair`)

#### 11. `real_estate`
1. `trade_real_estate_agency` — **Real Estate Brokerage & Sales** / *Agence Immobilière de Transaction* / وكالة عقارية للبيع والشراء والكراء (Badge: `Real Estate`)
2. `trade_property_developer` — **Residential Property Developer** / *Promoteur Immobilier Résidentiel* / مؤسسة ترقية عقارية وبناء سكني (Badge: `Development`)
3. `trade_rental_management` — **Rental Property Management** / *Cabinet de Gestion Locative* / مكتب تسيير وإيجار العقارات والأملاك (Badge: `Rental Mgmt`)
4. `trade_building_syndic` — **HOA & Building Syndic** / *Syndic de Copropriété Professionnel* / إدارة وتسيير الملكية المشتركة (Badge: `Syndic`)
5. `trade_property_valuation` — **Real Estate Valuation & Appraisal** / *Cabinet d’Expertise Foncière & Évaluation* / مكتب خبير عقاري ومعاينة أملاك (Badge: `Appraisal`)
6. `trade_commercial_real_estate` — **Commercial Real Estate Broker** / *Immobilier Commercial & Bureaux* / عقارات تجارية ومكاتب شركات (Badge: `Commercial RE`)
7. `trade_student_housing` — **Student Housing & Coliving** / *Gestion de Résidences Étudiantes & Colocation* / إدارة إقامات طلابية وسكن مشترك (Badge: `Coliving`)
8. `trade_asset_management` — **Property Asset Management** / *Cabinet d’Administration de Biens* / إدارة أصول وأملاك عقارية استثمارية (Badge: `Asset Mgmt`)
9. `trade_land_acquisition` — **Land & Lot Acquisition** / *Transaction de Terrains & Lots Foncier* / بيع وشراء الأراضي والعقارات الفلاحية (Badge: `Land Broker`)
10. `trade_vacation_rentals` — **Holiday & Vacation Rentals** / *Gestion de Résidences de Vacances* / إدارة إقامات سياحية وشقق موسمية (Badge: `Vacation`)

#### 12. `manufacturing_production`
1. `trade_apparel_textile` — **Apparel & Textile Workshop** / *Atelier de Confection Textile & Vêtements* / ورشة خياطة وصناعة ألبسة (Badge: `Textile`)
2. `trade_wood_furniture_workshop` — **Custom Furniture & Woodworking** / *Menuiserie Bois & Fabrication de Meubles* / ورشة نجارة خشب وصناعة أثاث (Badge: `Woodworking`)
3. `trade_aluminum_pvc` — **Aluminum & PVC Fabrication** / *Atelier Menuiserie Aluminium & PVC* / ورشة نجارة ألمنيوم وPVC (Badge: `Alu & PVC`)
4. `trade_metalworks_iron` — **Metalworks & Iron Craft Workshop** / *Ferronnerie & Serrurerie Métallique* / حدادة فنية وهياكل معدنية (Badge: `Metalworks`)
5. `trade_plastic_molding` — **Plastic Injection & Molding** / *Unité d’Injection & Plasturgie* / وحدة تشكيل وحقن البلاستيك (Badge: `Plastics`)
6. `trade_offset_print_press` — **Industrial Print Press & Packaging** / *Imprimerie Industrielle & Packaging* / مطبعة صناعية وتغليف كرتوني (Badge: `Print Press`)
7. `trade_upholstery_salon` — **Upholstery & Sofa Workshop** / *Atelier de Tapisserie & Salons Marocains* / ورشة تنجيد أثاث وصالونات عصرية (Badge: `Upholstery`)
8. `trade_marble_stone` — **Marble & Granite Stone Cutting** / *Marbrerie & Découpe de Pierres Naturelles* / ورشة رخام وقص حجارة طبيعية وغرانيت (Badge: `Marble Works`)
9. `trade_stainless_steel` — **Stainless Steel Commercial Kitchens** / *Fabrication Équipements Inox & Cuisines Pro* / تصنيع تجهيزات ستانلس ستيل ومطابخ (Badge: `Stainless Steel`)
10. `trade_cnc_laser_cutting` — **CNC Machining & Laser Cutting** / *Usinage CNC & Découpe Laser Industrielle* / خراطة وتفريز بالليزر وCNC (Badge: `CNC Laser`)

#### 13. `legal_accounting`
1. `trade_law_firm` — **Law Firm & Counsel** / *Cabinet d’Avocat à la Cour* / مكتب محاماة معتمد لدى المحاكم (Badge: `Law Firm`)
2. `trade_cpa_accounting_firm` — **Chartered Accounting & Audit Firm** / *Cabinet d’Expertise Comptable & Audit* / مكتب خبير محاسب ومحافظ حسابات (Badge: `Accounting`)
3. `trade_notary_office` — **Notary Public Office** / *Étude Notariale* / مكتب موثق معتمد (Badge: `Notary`)
4. `trade_tax_legal_consulting` — **Tax & Legal Advisory Practice** / *Cabinet de Conseil Juridique & Fiscal* / مكتب استشارات قانونية وجبائية (Badge: `Tax & Legal`)
5. `trade_statutory_audit` — **Statutory Auditing Practice** / *Commissariat aux Comptes Agréé* / محافظة حسابات ومراقبة مالية معتمدة (Badge: `Statutory Audit`)
6. `trade_bailiff_office` — **Judicial Bailiff Office** / *Étude d’Huissier de Justice* / مكتب محضر قضائي معتمد (Badge: `Bailiff`)
7. `trade_corporate_law` — **Corporate & Commercial Law Firm** / *Avocat d’Affaires & Droit des Sociétés* / محاماة شركات وأعمال تجارية (Badge: `Corporate Law`)
8. `trade_payroll_hr_advisory` — **Payroll & Social Security Advisory** / *Cabinet d’Externalisation Paie & Social* / مكتب تسيير الرواتب والموارد البشرية (Badge: `Payroll`)
9. `trade_commercial_arbitration` — **Arbitration & Commercial Mediation** / *Cabinet d’Arbitrage & Médiation Commerciale* / مكتب تحكيم ومصالحة تجارية (Badge: `Arbitration`)
10. `trade_financial_advisory` — **Financial Advisory & Valuation** / *Cabinet de Conseil Financier & Investissement* / مكتب استشارات مالية واستثمار (Badge: `Finance Advisory`)

#### 14. `logistics_delivery`
1. `trade_express_courier` — **Last-Mile Express Courier** / *Entreprise de Livraison Express à Domicile* / شركة توصيل سريع للمنازل والطرود (Badge: `Express Delivery`)
2. `trade_cod_parcel_network` — **National COD Parcel Delivery Network** / *Réseau Messagerie & Encaissement COD (58 Wilayas)* / شبكة نقل طرود مع الدفع عند الاستلام (Badge: `COD Network`)
3. `trade_freight_transport` — **Heavy Freight & Road Haulage** / *Transporteur Routier de Marchandises & Fret* / نقل بضائع بالشاحنات ونقل ثقيل (Badge: `Freight`)
4. `trade_moving_logistics` — **Moving, Relocation & Heavy Handling** / *Entreprise de Déménagement & Manutention* / شركة ترحيل ونقل أثاث للمنازل والشركات (Badge: `Moving`)
5. `trade_customs_forwarder` — **Freight Forwarding & Customs Broker** / *Société de Transitaire & Dédouanement* / مكتب عبور وتخليص جمركي وشحن دولي (Badge: `Customs`)
6. `trade_moto_couriers` — **Urban Moto Courier Fleet** / *Flotte de Coursiers Urbains à Moto* / أسطول دراجات نارية للتوصيل السريع (Badge: `Moto Fleet`)
7. `trade_cold_chain_transport` — **Refrigerated & Cold Chain Logistics** / *Transport Frigorifique & Chaîne du Froid* / نقل وتبريد المواد الغذائية والطبية (Badge: `Cold Chain`)
8. `trade_ecommerce_fulfillment` — **E-Commerce Warehousing & Fulfillment** / *Centre de Stockage & Fulfillment E-Commerce* / مركز تخزين وتغليف لطلبيات المتاجر (Badge: `Fulfillment`)
9. `trade_crossdock_hub` — **Cross-Docking & Distribution Hub** / *Plateforme de Groupage & Hub Logistique* / مركز تجميع وفرز لوجستي للشحنات (Badge: `Cross-Dock`)
10. `trade_heavy_towing` — **Vehicle Recovery & Heavy Towing** / *Société de Dépannage & Remorquage Lourd* / خدمات سحب وشحن المركبات والشاحنات (Badge: `Towing`)

#### 15. `construction_contractor`
1. `trade_general_building_contractor` — **General Building Contractor** / *Entreprise Générale de Bâtiment (BTP)* / مقاولة عامة للبناء والأشغال العامة (Badge: `Contractor`)
2. `trade_civil_works_paving` — **Civil Engineering, Earthworks & Paving** / *Travaux Publics, Terrassement & Voirie* / أشغال عمومية وتهيئة الطرق والحفر (Badge: `Civil Works`)
3. `trade_building_electrical` — **Commercial & Building Electrical** / *Électricité du Bâtiment & Tertiaire* / مقاولة كهرباء المباني والتجهيزات الصناعية (Badge: `Electrical`)
4. `trade_plumbing_hvac` — **Plumbing & HVAC Contractor** / *Plomberie, Chauffage Central & Climatisation* / سباكة وتدفئة مركزية وتكييف عمارات (Badge: `Plumbing / HVAC`)
5. `trade_finishing_drywall` — **Drywall, BA13 & Interior Finishing** / *Peinture, Plâtrerie & Faux-Plafonds (BA13)* / دهان عمارات وجبس وتهيئة داخلية BA13 (Badge: `Drywall`)
6. `trade_waterproofing_insulation` — **Roof Waterproofing & Insulation** / *Étanchéité Terrasses & Isolation Thermique* / عزل مائي وحراري للأسطح والمباني (Badge: `Insulation`)
7. `trade_steel_framing` — **Steel Framing & Industrial Sheds** / *Charpente Métallique & Hangars Industriels* / هياكل معدنية وبناء مستودعات وهناغر (Badge: `Steel Structure`)
8. `trade_tiling_flooring` — **Tiling, Flooring & Screed** / *Carrelage, Faïence & Chape de Sol* / تركيب سيراميك وبلاط ورخام الأرضيات (Badge: `Tiling`)
9. `trade_landscaping_earth` — **External Groundworks & Landscaping** / *Aménagement Extérieur & Espaces Verts* / تهيئة خارجية ومساحات خضراء وأرصفة (Badge: `Landscaping`)
10. `trade_demolition_site` — **Site Demolition & Debris Clearing** / *Démolition & Nettoyage de Chantiers* / هدم وتفكيك وتنظيف مخلفات البناء (Badge: `Demolition`)

#### 16. `agriculture_farming`
1. `trade_greenhouse_farming` — **Greenhouse & Vegetable Farming** / *Maraîchage sous Serres & Légumes* / زراعة خضروات وبيوت بلاستيكية (Badge: `Greenhouses`)
2. `trade_orchard_fruit` — **Fruit Orchards & Arboriculture** / *Arboriculture Fruitière & Vergers* / زراعة الأشجار المثمرة والحمضيات (Badge: `Orchard`)
3. `trade_poultry_farm` — **Poultry & Egg Production Farm** / *Ferme Avicole (Poulets de chair & Œufs)* / مدجنة وتربية دواجن ودجاج بياض (Badge: `Poultry`)
4. `trade_dairy_cattle` — **Dairy & Beef Cattle Ranch** / *Élevage Bovin Laitier & Engraissement* / تربية الأبقار وإنتاج الحليب وتسمين العجول (Badge: `Cattle Ranch`)
5. `trade_sheep_goat_farming` — **Sheep & Goat Farming** / *Élevage Ovin & Caprin (Moutons / Chèvres)* / تربية الأغنام والمواشي والماعز (Badge: `Sheep / Goats`)
6. `trade_cereal_farming` — **Cereal & Grain Crop Farming** / *Exploitation Céréalière (Blé dur, Orge)* / زراعة الحبوب والقمح والشعير (Badge: `Cereal Crops`)
7. `trade_olive_groves` — **Olive Groves & Olive Oil Mill** / *Exploitation Oléicole & Huilerie Traditionnelle* / زراعة الزيتون ومعصرة زيت زيتون (Badge: `Olive Groves`)
8. `trade_beekeeping` — **Apiculture & Honey Production** / *Apiculture & Production de Miel* / تربية النحل وإنتاج العسل الطبيعي (Badge: `Beekeeping`)
9. `trade_plant_nursery` — **Horticultural & Plant Nursery** / *Pépinière Horticole & Plants Maraîchers* / مشتلة نباتات وأشجار وشجيرات (Badge: `Plant Nursery`)
10. `trade_crop_packaging` — **Fruit & Vegetable Packing Station** / *Station de Conditionnement de Fruits & Légumes* / محطة فرز وتوضيب المحاصيل الفلاحية (Badge: `Packing Station`)

---

### 1.4 Offline Queue, Delta Sync & Core `localStorage` Keys

Verified from `src/lib/supabase/offlineQueue.ts`, `src/lib/supabase/syncCoordinator.ts`, `src/utils/algerianPayroll.ts`, and `src/services/store.ts`:

| `localStorage` Key | Purpose |
| :--- | :--- |
| `atrium_erp_desktop_v2` | Main `store.ts` persistent state snapshot (`STORAGE_KEY` in `store.ts`) |
| `atrium_has_onboarded_v1` | First-time onboarding completion flag (`App.tsx`) |
| `atrium_language` & `atrium_language_mode` | Active UI language (`en`/`fr`/`ar`) & `'auto'`/`'manual'` mode (`store.ts`, `i18n.ts`) |
| `atrium_density` & `atrium_list_pod_expanded` | UI density (`'default'`/`'compact'`) & list pod expansion preference (`store.ts`) |
| `atrium_app_state_v2` & `atrium_app_state_v1` | Legacy/backup keys cleared by `ErrorBoundary.tsx` recovery reset |
| `atrium_offline_mutation_queue_v1` | Offline mutation queue (`QUEUE_STORAGE_KEY` in `offlineQueue.ts`) storing pending inserts/updates/upserts/deletes for replay on reconnect |
| `atrium_client_device_id_v1` | Persistent client device UUID (`DEVICE_STORAGE_KEY` in `syncCoordinator.ts`) |
| `atrium_delta_sync_cursors_v1` | Per-table delta sync cursor timestamps (`CURSOR_STORAGE_KEY` in `syncCoordinator.ts`) |
| `atrium_staff_attendance_logs_v1` | Local punch logs & weekly attendance sheets (`algerianPayroll.ts`) |
| `atrium_staff_salary_advances_v1` | Salary advances (`Acomptes`) (`algerianPayroll.ts`) |
| `atrium_staff_payroll_runs_v1` | Approved/paid monthly payroll runs (`algerianPayroll.ts`) |
| `atrium_staff_payroll_slips_v1` | Individual employee payslip records (`algerianPayroll.ts`) |
| `atrium_staff_weekly_sheets_v1` | Weekly attendance sheets cache (`algerianPayroll.ts`) |
| `atrium_pos_receipt_config` | 80mm thermal receipt header/footer/VAT config (`PosRegisterView.tsx` / `store.ts`) |
| `atrium_pos_pinned_ids` | Pinned product IDs in `PosRegisterView` |

*(Plus `sessionStorage` key `atrium-intro-seen` in `App.tsx`. Vertical-specific Group B `localStorage` keys are listed inside each respective vertical section in Chapter 3.)*

---

## 2. Shared Cross-Vertical Modules

### 2.1 Home Hall (`CategoryHomeRouter`) & Front-Desk Kiosks

Always mounted as route `'home'` at index 0 of `Sidebar.tsx` across every vertical and role. `CategoryHomeRouter.tsx` (exporting `CategoryHomeView`) lazy-loads **16 dedicated per-vertical Home view components** organized across 4 files, backed by `homeActivityAdapters.ts` and shared `src/components/common/home/*` primitives (`HomeShell`, `HomeAnchorCard`, `HomeKioskCard`, `HomeLiveHistoryPod`, `HomeSetupPod`):

| Home File | Categories -> Dedicated Home View Component | Embedded Kiosks / Key Home Actions |
| :--- | :--- | :--- |
| **`CoreServiceHomeViews.tsx`** | `membership_session` -> `MembershipHomeView`<br>`appointment_service` -> `AppointmentHomeView`<br>`pos_inventory` -> `PosHomeView`<br>`education_cohort` -> `EducationHomeView` | `MembershipHomeView` embeds **`GymFrontDeskKiosk`** + `New Member` / `New Lead` / `Voucher` triggers; `AppointmentHomeView` embeds **`SalonQuickChairKiosk`** + `AppointmentModal` trigger; `EducationHomeView` embeds **`AcademyRollCallKiosk`**; `PosHomeView` provides register/stock KPIs & quick launch |
| **`CoreBusinessHomeViews.tsx`** | `project_milestone` -> `ProjectHomeView`<br>`rental_booking` -> `VenueHomeView`<br>`freelance_solo` -> `FreelanceHomeView`<br>`trading_commercial` -> `TradingHomeView` | Tailored daily activity feeds (`buildDailyActivityItems()`), category summary anchor cards, setup progress (`HomeSetupPod` linked to `SettingsScreen`), and operational deep-links |
| **`ClinicalWorkshopHomeViews.tsx`** | `medical_clinic` -> `MedicalHomeView`<br>`auto_garage` -> `AutoGarageHomeView`<br>`real_estate` -> `RealEstateHomeView`<br>`manufacturing_production` -> `ManufacturingHomeView` | Triage/bay/property/production KPIs, live activity pods, and quick screen jumps |
| **`FieldAdvisoryHomeViews.tsx`** | `legal_accounting` -> `LegalHomeView`<br>`logistics_delivery` -> `LogisticsHomeView`<br>`construction_contractor` -> `ContractorHomeView`<br>`agriculture_farming` -> `AgricultureHomeView` | Hearings/parcels/sites/harvest live summaries, setup checklist, and role-aware shortcuts |

#### Front-Desk Kiosks (3 Built-In Kiosks)
1. **`GymFrontDeskKiosk.tsx` (`membership_session`)**:
   - **Actions**: Live search by Name / Phone / RFID Card ID (`cardId`) with barcode/RFID scan listener (`Enter` key), one-click **Check-in** (`addMemberCheckIn`), **Quick Walk-in Day Pass** modal/inline form (`addWalkInTicket` generating `WI-YYYY-XXXX` ticket + timbre duty), RFID card pairing trigger.
   - **Data & Sync Truth Note**: `addWalkInTicket` syncs via `memberService.upsertWalkInTicket` (`gym_walk_in_tickets`), whereas `addMemberCheckIn` updates local `memberCheckIns` and registers an undo entry ONLY without calling `memberService.recordCheckIn` (`gym_check_ins`).
2. **`SalonQuickChairKiosk.tsx` (`appointment_service`)**:
   - **Actions**: Visual chair/station status board, assign waiting appointment or walk-in to a chair, start timer, complete service & checkout.
   - **Truth Note**: `SalonQuickChairKiosk` keeps its occupied chair assignments in **component-local React `useState`**, bypassing `store.ts`'s `updateSalonChairStation` (which does sync to `salon_chair_stations`).
3. **`AcademyRollCallKiosk.tsx` (`education_cohort`)**:
   - **Actions**: Quick cohort selector, today's sessions list, per-student `present` / `absent` / `late` / `excused` toggle buttons calling `recordQuickAttendance`.
   - **Truth Note**: `recordQuickAttendance` updates local `eduQuickAttendance` + undo stack ONLY; it performs zero Supabase persistence.

---

### 2.2 Staff, Attendance & Algerian Payroll (`StandardStaffScreen`)

Mounted at route `'staff'` for all verticals **except `project_milestone`** (which uses its dedicated `ProjectRhView` + `ProjectComptaView`), subject to `canAccessStaffScreen(category, effectiveRole)` in `src/utils/staffRules.ts`.

- **Screens / Sub-Views (`StandardStaffScreen.tsx` + `useStaffFoundation.ts`)**:
  1. **Directory (`directory`)**: Staff CRUD (`StaffModal.tsx` with basic info, lifecycle status `active`/`frozen`/`vacation`/`on_leave`/`terminated`, contract type `cdi`/`cdd`/`stage`/`vacataire`/`prestataire`, payment method `cash`/`ccp`/`bank_transfer`, CCP/RIP & Bank RIB, PIN code & RFID card ID, emergency medical fields, category-specific fields via `staffCategoryProperties` / top-level convenience fields), CSV Export (`atrium-staff-*.csv`), Slide-over Inspector (`StaffInspectorDrawer.tsx` / `KineticSlideOverInspector`) with `Profile`, `Performance`, `Attendance`, `Payroll & Advances` tabs + hold-to-delete.
  2. **Attendance (`StaffAttendanceSubView.tsx` + `QuickPointageModal.tsx`)**: Daily RFID/PIN/Manual Clock-In/Out punch log, weekly Saturday-to-Friday matrix (`Sam`–`Ven`), status toggles (`present`, `late`, `half_day`, `absent_justified`, `absent_unjustified`, `vacation`, `rest`), hours worked & overtime calculation.
  3. **Salary Advances (`SalaryAdvanceModal.tsx`)**: Issue `StaffSalaryAdvance` (`ADV-YYYY-XXXX` voucher) with amount (DZD), payment method (`cash`/`ccp`/`bank_transfer`), reason, status (`pending`/`deducted`/`waived`), automatic deduction during monthly payroll generation.
  4. **Algerian Statutory Payroll (`StaffPayrollSubView.tsx` + `algerianPayroll.ts` + `PayslipPrintModal.tsx`)**:
     - Monthly payroll run generator (`StaffPayrollRunRecord` + `StaffPayrollSlipRecord[]`):
     - Pro-rata base salary (`actualBaseSalary = baseSalary * workedDays / standardDays`) + taxable bonuses (`primesCotisables`) + coaching commission (`coachingCommission`) = `salaireBrutCotisable`.
     - **CNAS Salarial**: `9%` (`0.09 * salaireBrutCotisable`).
     - **CNAS Patronal**: `26%` (`0.26 * salaireBrutCotisable`).
     - **IRG (Algerian 2022 Finance Law Scale — `calculateAlgerianIrgTax`)**: Applied to `salaireBrutImposable` with statutory abatement (40% bounded 1,000–1,500 DZD/month; zero IRG below 30,000 DZD; progressive brackets above 30,000 DZD up to 35%).
     - Net to pay (`netAPayer`) = `salaireBrutImposable - irgTax + primesNonImposables - acomptesDeduits - autresRetenues`.
     - **Printable Output (`PayslipPrintModal.tsx`)**: Official French/Arabic *Bulletin de Paie* A4 print (`window.print()`) with employer fiscal metadata, CNAS breakdown, IRG calculation, advances deducted, and net payable.
  5. **Staff History (`StaffHistorySubView.tsx`)**: Embedded `EmbeddedUndoHistoryPanel` scoped to `staff`.

- **Shared Staff Truth Notes**:
  - **`staffRules.ts` Key Mismatch**: `canAccessStaffScreen()` in `src/utils/staffRules.ts` checks `'admin'` / `'director'` / `'gerant'` / `'owner'` across verticals, and in `construction_contractor` checks `conducteur_travaux` / `daf_metreur` while parts of `ContractorScreen` and `Sidebar.tsx` also handle `'conducteur'` / `'metreur'`.
  - **Local Storage vs. Cloud Persistence**: All `StaffAttendanceLogRecord`, `StaffWeeklyAttendance`, `StaffSalaryAdvance`, `StaffPayrollRunRecord`, and `StaffPayrollSlipRecord` entries generated in `algerianPayroll.ts` persist locally via `localStorage` (`atrium_staff_*_v1`), while `staffService.ts` exposes Supabase sync to `staff`, `staff_attendance_logs`, `staff_salary_advances`, `staff_payroll_runs`, `staff_payroll_slips` plus PIN/profile RPCs (`get_staff_profiles`, `verify_staff_pin`, `set_staff_pin`, `get_staff_for_sync`).

---

### 2.3 History, Audit & Undo (`VerticalHistoryScaffold` & `undoEngine`)

- **UI**: `VerticalHistoryScaffold.tsx` renders standardized dual-tab audit screens (Domain Ledger tab + **Annulations / Undo** tab embedding `EmbeddedUndoHistoryPanel.tsx`).
- **Engine (`src/services/undoEngine.ts`)**: Maintains an **in-memory** session stack (`UndoHistoryEntry[]`, capped at `MAX_UNDO_HISTORY_PER_BRANCH = 50` entries per branch) with `undo()`, optional `redo()`, `runUndoBatch()` coalescing, `registerUndoEntry()`, status (`available`, `undone`, `error`), `operationType` (`create`, `edit`, `status`, `delete`, `bulk`), filtered by `vertical`, `businessId`, `branchId`.
- **Toast Integration**: Undoable mutations dispatch 6-second toasts (`UNDO_TOAST_DURATION_MS = 6000`) with `hasUndo: true` and `onUndo` action hooks.

---

### 2.4 Settings & Backup (`SettingsScreen`)

Mounted at route `'settings'`. Implements 6 tabs (`SettingsTabId`):
1. **`preferences`**: Language (`en`/`fr`/`ar` RTL switching), Theme (`light`/`dark`), Density (`default`/`compact`), Hardware Keyboard/RFID Scanner bridge settings.
2. **`business_fiscal` (`SettingsBusinessFiscalTab.tsx`)**: `BusinessCategoryConfig` editor — Business Display Name, Address, Phone, Currency (`DZD`/`EUR`/`USD`), Default TVA (`0%`/`9%`/`19%`), Timbre Fiscal toggle, `FiscalProfile` (`nif`, `nis`, `rc`, `ai`, `ifu`, `legalForm`, `licenseNumber` with category-specific label e.g. CNOM/CACOBATPH/Barreau/ANRH, `wilayaCode`, `ccp`, `rib`), and all category-specific `CategorySpecificSettings` fields (16 tailored sections). Saves to `business_configs` via `configService.ts`.
3. **`formules` (`SettingsFormulesTab.tsx`)**: CRUD for reusable `CategoryFormule` presets (`membership_plan`, `salon_service`, `pos_combo`, `agency_retainer`, `venue_addon`, `tuition_installment`, `freelance_package`, `wholesale_tier`, `medical_act`, `garage_pack`, `realestate_commission`, `mfg_preset`, `legal_honoraire`, `courier_tier`, `btp_boq_rate`, `agri_piecework`) synced to `category_formules` via `configService.ts`.
4. **`branches_devices`**: Multi-branch (`Branch`) and POS/Terminal (`Device`) registry CRUD, active branch selector, plan quota enforcement (`maxBranches`, `maxDevices` from `SubscriptionPlan`).
5. **`license`**: Current `AccountSubscription` display (`Free Web`, `Free Trial`, `Starter`, `Pro`, `Enterprise`), feature limits, and `VoucherModal` trigger (`ATR-{TIER}-LIFE-{XXXX}-{XXXX}`).
6. **`cloud_backup`**: Full JSON Snapshot Export (`atrium-backup-*.json` covering store + domain data), JSON Restore/Import, Supabase Cloud Sync status & manual trigger (`syncCoordinator`), and Account reset tools.

---

### 2.5 Modals Directory (`src/components/modals/`)

1. **`CommandPaletteModal.tsx`**: Keyboard `Ctrl+K` / `Cmd+K` spotlight launcher for instant screen navigation, modal triggers, and record search.
2. **`VoucherModal.tsx`**: Redeems lifetime license vouchers (`LicenseVoucher` format `ATR-{TIER}-LIFE-{XXXX}-{XXXX}`) via `redeem_license_voucher`.
3. **`MemberModal.tsx`**: Shared create/edit modal for `Member` records (used across `membership_session` and `appointment_service` client tabs, plus Home quick-add).
4. **`LeadModal.tsx`**: Create/edit `RegistrationLead` prospects with plan interest & conversion workflow.
5. **`AppointmentModal.tsx`**: Create/edit `Appointment` in `appointment_service` with Registered vs Walk-in client toggle (see Section 3.2 Truth Note on Walk-in ID filtering).
6. **`StaffModal.tsx`**: Create/edit `StaffMember` records (`StandardStaffScreen` & `MembershipStaffView`).
7. **`PinVerificationModal.tsx`**: Staff PIN gate (`pinCode` / `verify_staff_pin` check; used in `AcademyRollCallKiosk.tsx`).
8. **`ConcurrencyConflictModal.tsx`**: Optimistic-locking conflict resolver comparing local vs server `version` payloads when `syncCoordinator` detects a `409`/stale row version.
9. **`DesktopUpgradeModal.tsx`**: Plan tier upgrade prompt when exceeding `SubscriptionPlan` limits (`maxBranches`, `maxDevices`, `maxStaff`, `sharedMembers`, `crossBranchReports`).
10. **`AuditLogViewerModal.tsx`**: Paginated immutable audit log viewer querying `immutable_audit_logs` via `get_audit_logs_page` RPC (`SettingsScreen.tsx`).
11. **`FeatureBlueprintModal.tsx`**: Interactive vertical feature-blueprint preview modal launched from `PowerOnboardingScreen.tsx`.
12. **`CashClosureModal.tsx`**, **`CpcaDeadlineModal.tsx`**, **`NotaryDeedModal.tsx`**: Specialized `legal_accounting` modals mounted in `LegalTrustView`, `LegalDashboardView` / `LegalHearingsView`, and `LegalMattersView`.
13. **`GoogleOAuthGuideModal.tsx`**: OAuth setup guide component present in `src/components/modals/` (currently unmounted in `App.tsx` / `SettingsScreen.tsx`).

### 2.6 Auth, Onboarding, Intro & Dev Diagnostics

- **`LoginScreen.tsx` (`src/components/auth/`)**: Email/password sign-in, quick role/PIN entry, and demo workspace launcher when `!isAuthenticated`.
- **`PowerOnboardingScreen.tsx` (`AtriumMonolith.tsx`, `OnboardingBackdrop.tsx`, `OnboardingShowcaseCard.tsx`, `FeatureBlueprintModal.tsx`)**: Multi-step facility provisioning wizard (`onboard_owner_account`, `create_business`, `create_branch`) allowing selection across all 16 `BusinessCategory` verticals and 160 `FULL_16_VERTICAL_CATALOG` trades, initial staff/branch setup, and fiscal defaults.
- **`FastSwitchModal.tsx`**: Quick branch/business switcher & staff PIN lock screen (`verify_staff_pin`).
- **`AtriumIntroOverlay.tsx` (`sessionStorage` key `atrium-intro-seen`)**: First-session splash overlay rendered in `App.tsx`.
- **`DashboardCatalogScreen.tsx` (route `'chart_catalog'`)**: Dev-only (`import.meta.env.DEV`) Bento chart gallery accessible via `App.tsx` for inspecting analytical chart widgets (`KpiSparkCard`, `AreaTrendChart`, `WaterfallChart`, `HourlyHeatmap`, `SquarifiedTreemap`, `RankedBarList`).

---

## 3. Per-Vertical Deep Dives (All 16 Verticals)
### 3.1 `membership_session` — Membership / Gym & Fitness

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Gym & Fitness Center (`trade_gym_fitness`), CrossFit Box (`trade_crossfit`), Tennis & Padel Club (`trade_tennis_padel`), Martial Arts & Judo Dojo (`trade_martial_arts`), Boxing & MMA Club (`trade_boxing_mma`), Yoga & Pilates Studio (`trade_yoga_pilates`), Dance & Movement Studio (`trade_dance_school`), Swimming Pool & Academy (`trade_swimming_pool`), Bodybuilding & Power Gym (`trade_bodybuilding`), Climbing & Athletics Hub (`trade_climbing`).
  - **Fiscal & Terminology Defaults (`businessConfig.ts` & `rules.ts`)**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'SARL'`. Terminology (`TERMINOLOGY_STORE.membership_session`): Members = `Members` / *Adhérents*, Plans = `Plans` / *Abonnements*, Registrations = `Leads & Trial` / *Inscriptions*, Shop = `Pro Shop` / *Boutique*, Scheduler = `Class Schedule` / *Planning*.

- **B. Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - **`owner` role**:
    - `'home'` -> `MembershipHomeView` (embeds `GymFrontDeskKiosk`)
    - `'dashboard'` / `'analytics'` -> `MembershipDashboardView`
    - `'members'` -> `MembershipMembersView`
    - `'registrations'` -> `MembershipRegistrationsView`
    - `'history'` -> `MembershipHistoryView`
    - `'shop'` -> `MembershipShopView`
    - `'scheduler'` -> `MembershipSchedulerView`
    - `'staff'` -> `MembershipStaffView` (wraps `StandardStaffScreen`)
    - `'settings'` -> `SettingsScreen`
  - **`staff` role** (`activeMembershipRole === 'staff'`):
    - `'home'` -> `MembershipHomeView`
    - `'dashboard'` (`Front Desk` / *Accueil*) -> `GymFrontDeskKiosk`
    - `'members'` -> `MembershipMembersView`
    - `'registrations'` -> `MembershipRegistrationsView`

- **C. Features & Interactive Actions per Screen**
  - **`GymFrontDeskKiosk.tsx` (Home & Staff Dashboard)**: Search by name/phone/RFID `cardId`, RFID Enter-key listener, instant member check-in (`addMemberCheckIn`), Quick Walk-in Day Pass (`addWalkInTicket` generating `WI-YYYY-XXXX` + timbre), RFID card pairing, printable day pass (`window.print()`).
  - **`MembershipDashboardView.tsx`**: 7 Bento analytical charts (`KpiSparkCard`, `KpiMetricInverseCard`, `AreaTrendChart`, `WaterfallChart`, `HourlyHeatmap`, `SquarifiedTreemap`, `RankedBarList`), quick triggers for New Member (`MemberModal`), Voucher (`VoucherModal`), and quick navigation.
  - **`MembershipMembersView.tsx`**: Status tabs (`All`, `Active`, `Expiring`, `Expired`, `Frozen`, `Suspended`), KPI filter pills, `KineticFilterModal` (branch/plan/status), List/Grid toggle, kinetic row fan actions, Bulk actions (Freeze, Reactivate, Delete), CSV export, and `MemberSlideOverInspector` (Overview, Profile, Attendance, Invoices, Actions tabs; blur-saved notes; spring hold-to-delete + keyboard fallback).
  - **`MembershipRegistrationsView.tsx`**: Prospect lead pipeline (`RegistrationLead`) + Walk-in ticket queue (`WalkInTicket`), Approve / Decline / Convert to `Member` (`convertLeadToMember`), `LeadModal` add/edit, CSV export.
  - **`MembershipSchedulerView.tsx`**: Weekly class schedule (`ScheduleEvent`) by day (`Mon`–`Sun`), class add/edit/delete, CSV export. **Stubs noted below**.
  - **`MembershipShopView.tsx`**: Pro Shop retail POS register (`Product` catalog search/category/stock filters, cart quantities & per-line discounts, `Cash`/`Card` checkout via `processSale`, pin favorites, CSV export, `SlideOver` product inspector).
  - **`MembershipHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` — Membership & Pro Shop sales/event audit ledger + `EmbeddedUndoHistoryPanel`, printable receipt (`window.print()`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `MemberModal` (Full Name, Phone, Email, Plan, Status, Join/Expiry Dates, RFID `cardId`, Balance Due, Notes), `LeadModal` (Prospect Name, Phone, Interested Plan, Trial Date, Source), Pro Shop Cart & Stock filter, Class `ScheduleEvent` form, Quick Walk-in Pass form.
  - **Outputs & Documents**:
    - CSV exports: `atrium-members-YYYY-MM-DD.csv` (`MembershipMembersView`), `atrium-leads-YYYY-MM-DD.csv` (`MembershipRegistrationsView`), `atrium-proshop-YYYY-MM-DD.csv` (`MembershipShopView`), `atrium-schedule-<day>.csv` (`MembershipSchedulerView`), `atrium-sales-audit-YYYY-MM-DD.csv` (`MembershipHistoryView`), plus unrouted `atrium-membership-finance-YYYY-MM-DD.csv` (`MembershipFinanceView`).
    - Print (`window.print()`): Day pass / Check-in slip (`GymFrontDeskKiosk`), Audit receipt (`MembershipHistoryView`), Clipboard copy (`MemberSlideOverInspector`).

- **E. Data Model & Persistence**
  - **TypeScript Types (`src/types/index.ts`)**: `Member`, `MembershipPlan`, `RegistrationLead`, `ScheduleEvent`, `MemberCheckInLog`, `WalkInTicket`, `Product`, `Sale`.
  - **Supabase (`memberService.ts`, `posService.ts`)**: `gym_members`, `gym_plans`, `gym_registration_leads`, `gym_schedule_events`, `gym_check_ins`, `gym_walk_in_tickets`, `pos_products`, `pos_sales`. *(`CATEGORY_TABLE_MAP` in `syncCoordinator.ts` also registers `gym_staff`, `gym_registrations`, `gym_products`, `gym_sales`, `gym_sale_items` for delta sync/realtime.)*

- **F. Truth Notes & Mismatches**
  - **Unreachable `MembershipFinanceView.tsx`**: In `App.tsx`, `case 'finance'` inside `isMembership` returns `<MembershipStaffView />` instead of `<MembershipFinanceView />`, and `Sidebar.tsx` omits `'finance'` for `membership_session` owners (`MembershipFinanceView` itself synthesizes payment rows from `members` rather than a dedicated payments table).
  - **Toast-Only Stubs**: Inside `MemberSlideOverInspector.tsx`, `"Collect balance"` (`Solde encaissé`), `"New"` invoice (`Nouvelle facture`), and `"New sale"` (`Nouvelle vente`) only call `showToast(...)`. Inside `MembershipSchedulerView.tsx`, `"Inscrire +1"`, `"Confirmer coach"`, and bulk `"Dupliquer semaine"` are toast-only stubs.
  - **Heuristic Session Progress**: `MemberSlideOverInspector` derives total sessions (`365` / `90` / `10` / `30`) heuristically by matching substrings in `planName`.
  - **Local-Only Check-In**: `addMemberCheckIn` in `store.ts` updates local `memberCheckIns` + undo stack without calling `memberService.recordCheckIn` (`gym_check_ins`), whereas `addWalkInTicket` syncs to `gym_walk_in_tickets`.
  - **Orphan Legacy Directory**: `src/components/screens/membership/components/` (`FloatingBulkBar`, `MemberRow`, `RowDetailIsland`, `RowFan`, `SlideInPanel`, `StatusTabs`) contains legacy modular primitives superseded by `MemberKineticRow` / `UniversalDataCollection`.

---

### 3.2 `appointment_service` — Appointment / Salon & Beauty

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Men's Barbershop (`trade_barber`), Women's Hair Studio (`trade_hair_salon`), Beauty Institute & Care (`trade_beauty_institute`), Nail Bar & Pedicure Studio (`trade_nail_bar`), Urban Spa & Bath House (`trade_spa_hammam`), Lash & Brow Lounge (`trade_lash_bar`), Tanning Studio (`trade_tanning_studio`), Tattoo & Piercing Parlor (`trade_tattoo_piercing`), Massage Therapy Clinic (`trade_massage_therapy`), Advanced Aesthetics & Laser (`trade_advanced_aesthetics`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'PersonnePhysique'`. Terminology: Members = `Clients` / *Clients*, Shop = `Services` / *Prestations*, Scheduler = `Calendar` / *Rendez-vous*.

- **B. Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - **`owner` role**: `'home'` (`AppointmentHomeView` + `SalonQuickChairKiosk`), `'dashboard'` / `'analytics'` (`AppointmentDashboardView`), `'scheduler'` / `'registrations'` (`AppointmentScheduleView`), `'members'` (`AppointmentClientsView`), `'shop'` (`AppointmentServicesView`), `'history'` (`AppointmentHistoryView`), `'finance'` (`AppointmentFinanceView`), `'staff'` (`AppointmentStaffView`), `'settings'` (`SettingsScreen`).
  - **`staff` role** (`activeAppointmentRole === 'staff'`): `'home'` (`AppointmentHomeView`), `'dashboard'` (`SalonQuickChairKiosk` — Stations), `'scheduler'` (`AppointmentScheduleView`), `'members'` (`AppointmentClientsView`).

- **C. Features & Interactive Actions per Screen**
  - **`SalonQuickChairKiosk.tsx` (Home & Staff Stations)**: Live chair/workstation occupancy board, assign appointment or walk-in to a chair, live elapsed timer, service completion & payment checkout modal, printable service ticket (`window.print()`).
  - **`AppointmentDashboardView.tsx`**: 7 Bento charts + quick triggers for `MemberModal` and `VoucherModal`.
  - **`AppointmentScheduleView.tsx`**: 3 view modes — **Calendar** (22 slots from `09:00` to `19:30` across active `staff`), **List**, and **Grid**; date navigator (`selectedDate`); `AppointmentModal` create/edit; one-click Cash checkout (`checkoutAppointment(id, 'Cash')`); `InChair` status transition; batch Confirm / Delete; CSV export.
  - **`AppointmentClientsView.tsx`**: Client cards & list, morpho-hair diagnostics (`segmentData.hairType`), **Color Formula Logger** (`segmentData.colorFormulas` timestamps, mixes, notes), allergy alerts, VIP bulk promotion, `MemberModal` edit, CSV export.
  - **`AppointmentServicesView.tsx`**: `ServiceItem` catalog CRUD (name, duration, category, price, material cost, stylist commission %, room/chair requirement), 3-tab inspector, margin calculator, one-click clipboard copy of tariff summary, CSV export.
  - **`AppointmentFinanceView.tsx`**: Payment method breakdown + Stylist commission ledger (`StylistPayout`: `Pending` -> `Approved` -> `Paid` via `BaridiMob` / `Cash`), CSV export, printable statement (`window.print()`).
  - **`AppointmentHistoryView.tsx`**: Appointment & checkout audit ledger + `EmbeddedUndoHistoryPanel`, 80mm thermal receipt print (`window.print()`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `AppointmentModal` (Client selection or Walk-in name/phone, Stylist, Service, Date/Time, Notes), `MemberModal` (Profile + hair/allergy/color formula metadata), `ServiceItem` form, Commission payout status actions.
  - **Outputs & Documents**:
    - CSV exports: `<t('salon_csv_filename')>_YYYY-MM-DD.csv` (`AppointmentScheduleView`), `atrium-salon-clients-YYYY-MM-DD.csv` (`AppointmentClientsView`), `atrium-salon-services-YYYY-MM-DD.csv` (`AppointmentServicesView`), `atrium-salon-commissions-YYYY-MM-DD.csv` (`AppointmentFinanceView`), `atrium-salon-history-YYYY-MM-DD.csv` (`AppointmentHistoryView`).
    - Print (`window.print()`): Chair ticket (`SalonQuickChairKiosk`), Commission summary (`AppointmentFinanceView`), 80mm Appointment receipt (`AppointmentHistoryView`).

- **E. Data Model & Persistence**
  - **TypeScript Types**: `Appointment`, `ServiceItem`, `StylistPayout`, `SalonWorkstation`, `SalonChairStation`, `Member` (with `segmentData.hairType`, `colorFormulas`, `allergies`).
  - **Supabase (`appointmentService.ts`)**: `salon_appointments`, `salon_services`, `salon_stylist_payouts`, `salon_chair_stations`, `salon_workstations` (+ `gym_members`). *(`CATEGORY_TABLE_MAP` in `syncCoordinator.ts` also registers `salon_staff`, `salon_clients`, `salon_products`, `salon_sales`, `salon_sale_items` for delta sync/realtime.)*

- **F. Truth Notes & Mismatches**
  - **Walk-In Client Visibility Mismatch**: `AppointmentClientsView` filters `members` by `m.id.startsWith('mem_salon_') || Boolean(m.segmentData?.hairType)`. Walk-in clients saved from `AppointmentModal` call `addMember` with a generic `mem_*` ID and without `segmentData.hairType`, so they do **not** appear in `AppointmentClientsView`.
  - **Row Book Action Prefill**: Clicking "Book" on a client row in `AppointmentClientsView` opens `AppointmentModal` with default prefill rather than preselecting that specific client.
  - **Hardcoded Baselines in `AppointmentFinanceView`**: `metrics` initializes `cash = 45000`, `baridiMob = 68000`, `cib = 29500` **before** summing `appointments.filter(a => a.isPaid)`.
  - **Hardcoded Tenant in `addServiceItem`**: `store.ts` sets `tenantId: 'acc_01'` on newly created `ServiceItem` records.
  - **Local Chair Board**: `SalonQuickChairKiosk` manages occupied chair state in component-local React `useState` instead of calling `updateSalonChairStation` (`salon_chair_stations`).
  - **Sidebar vs `App.tsx` Analytics**: `Sidebar.tsx` exposes `'analytics'` to salon owners, which `App.tsx` routes back to `AppointmentDashboardView`.

---

### 3.3 `pos_inventory` — Restaurant & POS Retail

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Traditional Restaurant (`trade_traditional_restaurant`), Woodfire Pizzeria (`trade_pizzeria`), Specialty Café & Tea Lounge (`trade_cafe_bistro`), Bakery & Fine Pastry (`trade_bakery_pastry`), Fast-Food & Burger Joint (`trade_fast_food`), Supermarket & Fine Grocery (`trade_superette_grocery`), Fashion Apparel Boutique (`trade_clothing_boutique`), Shoes & Leather Goods (`trade_shoes_leather`), Perfumery & Beauty Shop (`trade_perfumery_cosmetics`), Optical & Eyewear Store (`trade_optical_store`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'SARL'`. Terminology: Shop = `Register` / *Caisse*, Registrations = `Orders` / *Commandes*, Scheduler = `Inventory` / *Stock*, History = `Stock Ledger` / *Journal Stock*.

- **B. Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - **`owner` role**: `'home'` (`PosHomeView`), `'shop'` (`PosRegisterView`), `'scheduler'` (`PosInventoryView`), `'registrations'` / `'members'` (`PosOrdersView`), `'dashboard'` / `'analytics'` (`PosDashboardView`), `'history'` (`PosHistoryView`), `'finance'` (`PosFinanceView`), `'staff'` (`PosStaffView`), `'settings'` (`SettingsScreen`).
  - **`staff` role** (`activePosRole === 'staff'`): `'home'` (`PosHomeView`), `'shop'` / `'dashboard'` (`PosRegisterView`), `'registrations'` / `'members'` (`PosOrdersView`), `'scheduler'` (`PosInventoryView` — B2B purchases, cost HT, and margin badges hidden for `staff`).

- **C. Features & Interactive Actions per Screen**
  - **`PosRegisterView.tsx`**: Sub-tabs (`register`, `parked`, `receipt_settings`, `inventory`); barcode/SKU scan listener with Web Audio `playBeep()`; quick custom item entry (`custom_*`); per-line & cart discounts (fixed DZD or %); Single (`Cash` / `Card` / `MemberBalance`) & Split checkout (`Cash` / `Card` / `BankTransfer` / `Credit`); VAT breakdown toggle (`receiptConfig.showTaxBreakdown`); Hold/Park cart (`parkOrder`) & Resume (`resumeParkedOrder`); inline Stock Adjust (`Restock` / `Damage` / `Adjustment`) and Product CRUD modal; pin favorites (`atrium_pos_pinned_ids`); live 80mm receipt branding editor (`atrium_pos_receipt_config`) + post-checkout 80mm receipt print (`window.print()`); CSV export.
  - **`PosInventoryView.tsx`**: Multi-tab inventory & procurement console; Product CRUD; Manual Stock Adjustment; Batch Restock; B2B Supplier (`B2bEntityModal`) & Purchase Orders (`PO` -> `receivePurchaseDoc` -> `BR` with 19% TVA, owner-only); margin badges & cost HT hidden when `activePosRole === 'staff'`; printable stock/PO sheets (`window.print()`); CSV export.
  - **`PosOrdersView.tsx`**: Completed `sales` & `parked` tabs, search/payment/date filters, 80mm thermal receipt preview + `window.print()`, full/partial Refund Modal (`refundSale` restores stock qty + creates `Return` movement), CSV exports (`sales` and `parked`).
  - **`PosFinanceView.tsx`**: Cash Drawer reconciliation (`OpeningFloat` `15,000` + Cash Sales - Cash Payouts = Expected vs counted `actualCashInput` variance), Petty Cash expense CRUD with Undo, Z-Report 80mm Closure modal (`window.print()`), CSV export.
  - **`PosDashboardView.tsx`**: 7 Bento analytical charts + Open Register action.
  - **`PosHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`stockMovements` ledger + `EmbeddedUndoHistoryPanel`), printable reports (`window.print()`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: Barcode/SKU input, Custom POS Item form, Split Payment allocations, `ReceiptConfig` editor (header, footer, phone, NIF/RC, VAT toggle), Stock Adjustment form, Product Add/Edit modal, Supplier `B2bEntityModal` & `PO` creation, Refund reason/items, Petty Cash expense & Z-Report actual cash count.
  - **Outputs & Documents**:
    - CSV exports: `atrium-pos-catalog-YYYY-MM-DD.csv` (`PosRegisterView`), `atrium-pos-inventory-YYYY-MM-DD.csv` (`PosInventoryView`), `atrium-pos-sales-YYYY-MM-DD.csv` & `atrium-pos-parked-YYYY-MM-DD.csv` (`PosOrdersView`), `atrium-pos-expenses-YYYY-MM-DD.csv` (`PosFinanceView`), `atrium-stock-movements-YYYY-MM-DD.csv` (`PosHistoryView`).
    - Print (`window.print()`): 80mm Customer Receipt (`PosRegisterView`, `PosOrdersView`), 80mm Z-Report Cash Closure (`PosFinanceView`), Inventory / Purchase Receipt sheets (`PosInventoryView`), Audit Print (`PosHistoryView`).

- **E. Data Model & Persistence**
  - **TypeScript Types**: `Product`, `Sale`, `SaleItem`, `ParkedOrder`, `StockMovement`, `ReceiptConfig`, `PurchaseDocument`, `B2bSupplier`.
  - **Supabase (`posService.ts`, `tradingService.ts`)**: `pos_products`, `pos_sales`, `pos_parked_orders`, `pos_stock_movements`, `pos_receipt_configs`, `trading_purchase_docs`, `trading_b2b_suppliers`. *(`CATEGORY_TABLE_MAP` in `syncCoordinator.ts` also registers `pos_staff`, `pos_customers`, `pos_sale_items` for delta sync/realtime.)*
  - **`localStorage` Keys**: `atrium_pos_receipt_config`, `atrium_pos_pinned_ids`.

- **F. Truth Notes & Mismatches**
  - **Volatile Register Cash Drawer & Expenses**: In `PosFinanceView.tsx`, `expenses`, `openingFloat` (`15000`), and `actualCashInput` live exclusively in component-local React `useState` (not persisted to `localStorage` or Supabase; lost on unmount/reload).
  - **Return Movement Sync Gap**: `refundSale` syncs the updated `pos_sales` row via `syncCoordinator`, while generated `StockMovement` (`type: 'Return'`) rows remain in local store state without a dedicated `stock_movements` upsert call.
  - **Receipt Branding Static Sample**: The `receipt_settings` live preview renders static sample lines (`1x Espresso Beans 1kg 3,200 DA`, `2x French Croissant 960 DA`) rather than the active cart.
  - **Bulk Print Stub**: Bulk `"Imprimer reçus"` action in `PosOrdersView.tsx` (line 964) fires a `showToast(...)` stub instead of batch-printing receipts.

---

### 3.4 `project_milestone` — Projects & Agency

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Creative Agency (`trade_comm_agency`), Digital Marketing Firm (`trade_digital_marketing`), Graphic & Brand Studio (`trade_graphic_studio`), Audiovisual Production House (`trade_av_production`), Event Planning Agency (`trade_event_agency`), Field Activation & Promoters (`trade_street_marketing`), Public Relations Agency (`trade_public_relations`), IT Services & Software House (`trade_software_agency`), Motion Design & 3D Lab (`trade_motion_3d`), Brand Strategy Consultancy (`trade_brand_consulting`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: false`, `legalForm: 'SARL'`.

- **B. 6 Specialized Roles & 25+ Routes (`Sidebar.tsx` + `App.tsx`)**
  - **`direction` (`ProjectDirectionView.tsx`)**: `pm_dir_dashboard` (7 Bento charts), `pm_dir_new_project` (Brief creator), `pm_dir_projects` (Portfolio Governance), `pm_dir_approvals` (Payroll & Field Expense approvals), `pm_dir_reports` (Financial Audit), `history` (`ProjectHistoryView` — direction-only), `settings` (`SettingsScreen`).
  - **`chef_projet` (`ProjectChefProjetView.tsx`)**: `pm_cp_projects` (Budget burn), `pm_cp_catalog` (POSM/PLV catalog + Print Cart), `pm_cp_orders` (`PMPrintOrder` pipeline), `pm_cp_files` / `pm_cp_deliverables` (`PMBatDeliverable` proofing), `pm_cp_expenses` (Field expense declaration).
  - **`crea` (`ProjectCreaView.tsx`)**: `pm_crea_kanban` (Studio task Kanban), `pm_crea_production` (Print queue), `pm_crea_upload` (BAT pre-press upload gate), `pm_crea_briefs` (Client creative briefs).
  - **`superviseur` (`ProjectSuperviseurView.tsx`)**: `pm_sup_missions` (58-Wilaya missions), `pm_sup_staffing` (Wilaya + vehicle talent matcher), `pm_sup_attendance` (Field roll call & payroll batch lock), `pm_sup_expenses` (Urgency expense + `MobilePhoneSimulator` PWA).
  - **`rh` (`ProjectRhView.tsx`)**: `pm_rh_talents` (`PMTalent` directory, also mounted at `'staff'`), `pm_rh_dossier` (4-Pillar talent dossier), `pm_rh_portal` (`MobilePhoneSimulator` candidate portal), `pm_rh_walkin` (Agency walk-in registration).
  - **`compta` (`ProjectComptaView.tsx`)**: `pm_compta_payroll` (Disburse approved `PMPayrollBatch`), `pm_compta_ccp` (`PMCcpSlip` + `CcpSlipModal` Algérie Poste **SFP 01**), `pm_compta_expenses` (Fiscal expense audit & reimbursement), `pm_compta_stock` (`PMEquipmentStock` QR inventory).

- **C. Features & Interactive Actions per Screen**
  - **Direction**: Launch brief/project (`PMProject` + `PMMilestone[]` auto-dispatch to PM & Créa), `KineticSlideOverInspector` (Governance, Milestones, Budget Burn + hold-to-delete + directive notes), Approve/Reject `PMPayrollBatch` and `PMExpense` (with receipt lightbox), CSV exports.
  - **Chef de Projet**: POSM/PLV Catalog cart builder (`PMCollateralItem` -> `handleTransmitToCrea` generating `PMPrintOrder`), BAT proofing (`Approve` or `Revision Requested` with revision notes), Field purchase declaration, CSV export.
  - **Créa Studio**: Kanban status progression, Print order execution, **Pre-Press Upload Gate** (`disabled` unless `colorSpace === 'CMJN' && resolutionDpi >= 300 && hasBleedIncluded === true`), fullscreen HD BAT lightbox, CSV export.
  - **Superviseur Terrain**: 58-Wilaya mission tracker, wilaya/vehicle talent staffing matcher, `PMAttendance` mark (`Present` / `Late +15m` / `Absent`) + **Lock & Send Payroll Batch to Direction** (`PMPayrollBatch`), emergency expense declaration inside **`MobilePhoneSimulator`** (`390px` PWA shell), CSV export.
  - **RH**: `PMTalent` directory w/ composite score & wilaya filter, Suspend/Reactivate & notes w/ Undo, 4-Pillar Administrative Dossier, Candidate intake validating CCP account + clé via `validateCcpAccount()` (`algerianPtt.ts`), walk-in intake, CSV export.
  - **Comptabilité**: Pay approved payroll batches, generate/print official Algérie Poste **SFP 01** CCP mandate (`CcpSlipModal.tsx` calling `markPmCcpSlipPrinted`), audit/reimburse NIF-tagged `PMExpense` vouchers, toggle `PMEquipmentStock` QR status (`In Stock` / `Deployed` / `SAV`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: New Project/Brief wizard, POSM/PLV Print Cart & BAT revision notes, Pre-press specs (`colorSpace`, `resolutionDpi`, `hasBleedIncluded`), Field attendance punches & emergency expense forms, Candidate CCP/RIB & dossier forms, Equipment QR status updates.
  - **Outputs & Documents**:
    - **Algérie Poste SFP 01 Mandate (`CcpSlipModal.tsx`)**: Printable A4 CCP mandate (`window.print()`) with `numberToWordsFrench()` & `numberToWordsArabic()` amount-in-words (`algerianPtt.ts`), CCP/RIP key, DG Visa & signature boxes, official stamp frame.
    - CSV exports: `portefeuille_projets_nch_YYYY-MM-DD.csv`, `audit_direction_nch_YYYY-MM-DD.csv` (`ProjectDirectionView`), `commandes_print_YYYY-MM-DD.csv` (`ProjectChefProjetView`), `livrables_bat_crea_YYYY-MM-DD.csv` (`ProjectCreaView`), `missions_terrain_nch_YYYY-MM-DD.csv` (`ProjectSuperviseurView`), `repertoire_equipe_YYYY-MM-DD.csv` (`ProjectRhView`), `bordereaux_ccp_sfp01_YYYY-MM-DD.csv` (`ProjectComptaView`), `atrium-projects-history-YYYY-MM-DD.csv` (`ProjectHistoryView`).

- **E. Data Model & Persistence**
  - **TypeScript Types**: `PMClient`, `PMProject`, `PMMilestone`, `PMCollateralItem`, `PMPrintOrder`, `PMBatDeliverable`, `PMTalent`, `PMMission`, `PMMissionStaff`, `PMAttendance`, `PMExpense`, `PMPayrollBatch`, `PMCcpSlip`, `PMEquipmentStock`.
  - **Supabase (`projectMilestoneService.ts`)**: `pm_staff`, `pm_clients`, `pm_projects`, `pm_milestones`, `pm_collateral_catalog`, `pm_print_orders`, `pm_bat_deliverables`, `pm_talents`, `pm_missions`, `pm_mission_staff`, `pm_attendances`, `pm_expenses`, `pm_payroll_batches`, `pm_ccp_slips`, `pm_equipment_stock`. (`'home'` mounts `ProjectHomeView`.)

- **F. Truth Notes & Mismatches**
  - **Excluded from `StandardStaffScreen`**: `Sidebar.tsx` line 1906 explicitly excludes `project_milestone` from `StandardStaffScreen`, routing `'staff'` directly to `ProjectRhView` (`App.tsx` line 714).
  - **Hardcoded Financial Report Figures**: In `ProjectDirectionView`'s `pm_dir_reports` ("Audit Financier 2026"), headline KPIs (`58,4 M DA`, `31,4 %`, `48`, `98,2 %`) and client/expense breakdown bars are hardcoded display figures rather than dynamically aggregated from `pmProjects` / `pmExpenses`.
  - **Hardcoded Mission SLA Banner**: `ProjectSuperviseurView` displays hardcoded `98.6%` SLA and `58 WILAYAS LIVE`.
  - **Hardcoded Field Actors & Receipt/BAT Images**: `ProjectChefProjetView` & `ProjectSuperviseurView` hardcode declarant IDs/NIFs (`stf_pm_01`, `K. Yacine (CDP)`, `fiscalNif: '001916001234567'`) and Unsplash image URLs for receipt proofs; `ProjectCreaView` uses a hardcoded Unsplash `previewUrl` on pre-press BAT uploads.
  - **Fixed Intake Constants in `ProjectRhView`**: `gender`, `hasDriverLicense`, `isVehicleOwner`, and `desiredRoles` are initialized as fixed constants in the candidate/walk-in forms.

---

### 3.5 `rental_booking` — Rentals, Coworking & Venue

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Wedding & Event Banquet Hall (`trade_wedding_hall`), Coworking Hub & Shared Desks (`trade_coworking_space`), Conference & Seminar Hall (`trade_conference_hall`), Professional Photo Studio (`trade_photo_studio`), Sound Recording Studio (`trade_sound_studio`), Car Rental Agency (`trade_car_rental`), AV & Sound Gear Rental (`trade_av_equipment_rental`), Pop-Up Store & Gallery (`trade_popup_store`), Equipped Training Room Rental (`trade_training_rooms`), Event Furniture & Decor Rental (`trade_event_furniture`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'SARL'`. Terminology: Members = `Renters` / *Locataires*, Registrations = `Bookings` / *Réservations*, Shop = `Units & Venues` / *Salles & Espaces*, Scheduler = `Timeline` / *Calendrier*.

- **B. Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - Standard Workforce RBAC (`home` -> `VenueHomeView`, `dashboard` / `analytics` -> `VenueDashboardView`, `scheduler` -> `VenueTimelineView`, `registrations` -> `VenueBookingsView`, `shop` -> `VenueInventoryView`, `members` -> `VenueRentersView`, `finance` -> `VenueFinanceView`, `history` -> `VenueHistoryView`, `staff` -> `VenueStaffView`, `settings` -> `SettingsScreen`).
  - *Note*: `VenueCloudSyncModal.tsx` can be launched as an inline diagnostics/repair utility.

- **C. Features & Interactive Actions per Screen**
  - **`VenueDashboardView.tsx`**: 7 Bento charts + quick `BookingModal` launch + Venue Cloud Sync modal trigger.
  - **`VenueTimelineView.tsx`**: Date-driven hourly/resource timeline grid across `RentableUnit[]`, time-slot conflict & capacity visibility, quick booking trigger, CSV export.
  - **`VenueBookingsView.tsx`**: Reservation pipeline (`BookingModal.tsx` with hourly/daily pricing, `BookingAddon[]` extras, conflict checks, security deposit capture, `contractSigned` toggle), status transitions (`Pending` -> `Confirmed` -> `CheckedIn` -> `Completed` / `Cancelled`), balance collection, printable contract/booking summary (`window.print()`), pin favorites, bulk delete w/ Undo, CSV export.
  - **`VenueInventoryView.tsx`**: `RentableUnit` CRUD (capacity, hourly/daily rate, surface m², amenities, maintenance status), unit inspector, CSV export.
  - **`VenueRentersView.tsx`**: `RentalRenter` directory CRUD (individual or corporate, ID document, booking spend/history, VIP/blacklist status), CSV export.
  - **`VenueFinanceView.tsx`**: Security Deposit Escrow (`SecurityDepositRecord`: `Held` -> `Released` or `Deducted` with damage deduction amount & reason), CSV export.
  - **`VenueHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`rental_bookings` + `rental_security_deposits` ledger + `EmbeddedUndoHistoryPanel`), CSV export.
  - **`VenueCloudSyncModal.tsx`**: Live Supabase row-count check (`rental_units`, `rental_bookings`, `rental_renters`, `rental_security_deposits`), one-click bulk upload, test booking insert, and copyable SQL RLS/FK repair script.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `BookingModal` (Unit, Renter, Start/End DateTime, Attendees, Addons, Deposit, Paid Amount, Contract Signed, Notes), Unit CRUD form, Renter CRUD form, Deposit Deduction modal.
  - **Outputs & Documents**:
    - CSV exports: `atrium-venue-timeline-<selectedDate>.csv` (`VenueTimelineView`), `atrium-venue-bookings-YYYY-MM-DD.csv` (`VenueBookingsView`), `atrium-venue-spaces-YYYY-MM-DD.csv` (`VenueInventoryView`), `atrium-venue-renters-YYYY-MM-DD.csv` (`VenueRentersView`), `atrium_caution_escrow_YYYY-MM-DD.csv` (`VenueFinanceView`), `atrium-venue-history-YYYY-MM-DD.csv` (`VenueHistoryView`).
    - Print (`window.print()`): Booking & Reservation Receipt (`VenueBookingsView`).
    - SQL Repair Script clipboard copy (`VenueCloudSyncModal`).

- **E. Data Model & Persistence**
  - **TypeScript Types**: `RentableUnit`, `RentalBooking`, `BookingAddon`, `RentalRenter`, `SecurityDepositRecord`.
  - **Supabase (`rentalService.ts`)**: `rental_units`, `rental_renters`, `rental_bookings`, `rental_security_deposits`. *(`CATEGORY_TABLE_MAP` in `syncCoordinator.ts` also registers `rental_staff`, `rental_booking_addons`.)*

- **F. Truth Notes & Mismatches**
  - **Deposit Receipt Print Stub**: In `VenueFinanceView.tsx`, all `"Reçu Caution"` / `"Reçu"` buttons (row fan, detail actions, inspector) fire a `showToast` stub (`"Reçu de séquestre caution émis pour ..."`) rather than invoking `window.print()`.
  - **Cloud Sync Diagnostic Defaults**: `VenueCloudSyncModal.tsx` contains hardcoded test/seed UUID SQL (`El-Bahia Grand Ballroom & Events`) and hardcoded project ref display (`tzzncsbvezywtaknwind.supabase.co`).

---

### 3.6 `education_cohort` — Education, Academy & Tutoring

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Private K-12 Academy (`trade_private_school`), Language Learning Academy (`trade_language_academy`), Vocational Training Institute (`trade_vocational_center`), Coding & Tech Bootcamp (`trade_coding_school`), Tutoring & After-School Center (`trade_tutoring_center`), Certified Driving School (`trade_driving_school`), Music School & Conservatory (`trade_music_academy`), Fine Arts & Drawing Studio (`trade_art_school`), Kids STEM & Robotics Lab (`trade_kids_robotics`), Business Management Academy (`trade_business_institute`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 0`, `applyTimbreFiscal: false`, `legalForm: 'SARL'`. Terminology: Members = `Students` / *Apprenants*, Plans = `Cohorts` / *Cohortes*, Registrations = `Admissions` / *Inscriptions*, Scheduler = `Timetable` / *Emploi du temps*.

- **B. Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - **`owner` role**: `'home'` (`EducationHomeView` + `AcademyRollCallKiosk`), `'dashboard'` (`EducationDashboardView`), `'scheduler'` (`EducationTimetableView`), `'members'` (`EducationStudentsView`), `'shop'` (`EducationCohortsView`), `'registrations'` (`EducationAdmissionsView`), `'analytics'` (`EducationAttendanceView`), `'finance'` (`EducationFinanceView`), `'history'` (`EducationHistoryView`), `'staff'` (`EducationStaffView`), `'settings'` (`SettingsScreen`).
  - **`staff` role** (`activeEducationRole === 'staff'`): `'home'` (`EducationHomeView`), `'analytics'` / `'dashboard'` (`AcademyRollCallKiosk` — Roll Call), `'scheduler'` (`EducationTimetableView`), `'members'` (`EducationStudentsView`), `'shop'` (`EducationCohortsView`).

- **C. Features & Interactive Actions per Screen**
  - **`AcademyRollCallKiosk.tsx` (Home & Staff Roll Call)**: Select cohort/session for today, toggle per-student `present` / `absent` / `late` / `excused` (`recordQuickAttendance`).
  - **`EducationDashboardView.tsx`**: 7 Bento charts + cohort capacity & tuition analytics.
  - **`EducationTimetableView.tsx`**: Session calendar (`EduSession`) with classroom conflict detection, launch **`RollCallModal.tsx`** (`Present` / `Late` / `Absent` / `Excused` + one-click `Mark All Present` + arrival time/notes), bulk delete w/ Undo, CSV export.
  - **`EducationStudentsView.tsx`**: `EduStudent` directory CRUD (guardian name/phone, emergency contacts, enrollment status, cohort links, grades & attendance summaries), CSV export.
  - **`EducationCohortsView.tsx`**: `EduCourse`, `EduClassroom`, and `EduCohort` management (`EduCohortModal.tsx`: teacher, classroom, schedule days, max capacity, tuition fee), CSV export.
  - **`EducationAdmissionsView.tsx`**: `EduAdmissionLead` prospect pipeline (level/language/goal, contact, placement test status, Convert to enrolled student), pin toggle, CSV export.
  - **`EducationAttendanceView.tsx`**: Detailed cohort attendance matrix + **Gradebook (`EduGrade`)** score entry & honors calculation + **`CertificateModal.tsx`** diploma issuer (`EduCertificate`), CSV exports (`attendance` and `gradebook`).
  - **`EducationFinanceView.tsx`**: Student tuition (`EduEnrollment`: total fee, discounts, installment plan, paid amount, partial payment recording), printable tuition receipt (`window.print()`), CSV export.
  - **`EducationHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`edu_enrollments` / sessions / certificates + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `EduCohortModal`, `EduStudent` form, `EduAdmissionLead` form, `RollCallModal` attendance sheet, Gradebook exam scores, Tuition installment payment modal, `CertificateModal` graduation form.
  - **Outputs & Documents**:
    - **Printable Certificate / Diploma (`CertificateModal.tsx`)**: A4 certificate (`window.print()`) displaying student name, course/cohort, completion date, average score, honors mention, authorized signatory, and unique `verificationHash`.
    - **Tuition Receipt (`EducationFinanceView.tsx`)**: Printable payment receipt (`window.print()`).
    - CSV exports: `timetable-YYYY-MM-DD.csv` (`EducationTimetableView`), `students-roster-YYYY-MM-DD.csv` (`EducationStudentsView`), `cohorts-catalog-YYYY-MM-DD.csv` (`EducationCohortsView`), `admission-leads-YYYY-MM-DD.csv` (`EducationAdmissionsView`), `atrium_cohort_attendance_<cohort>_YYYY-MM-DD.csv` & `atrium_cohort_gradebook_<cohort>_YYYY-MM-DD.csv` (`EducationAttendanceView`), `scolarite_reglements_YYYY-MM-DD.csv` (`EducationFinanceView`), `atrium-education-history-YYYY-MM-DD.csv` (`EducationHistoryView`).

- **E. Data Model & Persistence**
  - **TypeScript Types**: `EduCourse`, `EduClassroom`, `EduCohort`, `EduStudent`, `EduEnrollment`, `EduSession`, `EduAttendance`, `EduGrade`, `EduCertificate`, `EduAdmissionLead`, `EduQuickAttendanceRecord`.
  - **Supabase (`educationService.ts`)**: `edu_courses`, `edu_classrooms`, `edu_cohorts`, `edu_students`, `edu_enrollments`, `edu_sessions`, `edu_attendance`, `edu_grades`, `edu_certificates`, `edu_admissions`. *(`CATEGORY_TABLE_MAP` in `syncCoordinator.ts` also registers `edu_staff`.)*

- **F. Truth Notes & Mismatches**
  - **Local-Only Quick Roll Call**: `AcademyRollCallKiosk` calls `recordQuickAttendance` in `store.ts`, which mutates local `eduQuickAttendance` + undo history only and does **not** persist to `edu_attendance` in Supabase (unlike `RollCallModal` inside `EducationTimetableView`).
  - **Print Attendance Sheet Stubs**: In `EducationTimetableView.tsx`, all 4 attendance sheet print actions (row fan `"Imprimer Liste"`, bulk `"Feuille d'émargement"`, inspector button, and quick action `"Imprimer"`) are **toast-only stubs** (`"Feuille d'émargement générée..."`) with no `window.print()` template.

---

### 3.7 `freelance_solo` — Freelancers & Solo Practice

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Solo Full-Stack Developer (`trade_solo_dev`), Solo UI/UX Product Designer (`trade_solo_designer`), Solo Video Editor & Motion (`trade_solo_editor`), Solo Copywriter & Content Lead (`trade_solo_copywriter`), Certified Freelance Translator (`trade_solo_translator`), Solo SEO & Growth Strategist (`trade_solo_seo_growth`), Solo Event & Brand Photographer (`trade_solo_photographer`), Solo Social Media Manager (`trade_solo_cm`), Digital Illustrator & 2D Artist (`trade_solo_illustrator`), Solo Data & Analytics Analyst (`trade_solo_data_analyst`).
  - **Fiscal Defaults**: `DZD` (supports multi-currency `DZD`/`EUR`/`USD` on proposals & invoices), `defaultTvaRate: 0`, `applyTimbreFiscal: false`, `legalForm: 'AutoEntrepreneur'` (`IFU` / *Carte Auto-Entrepreneur*).

- **B. Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - Solo workspace: `'home'` (`FreelanceHomeView`), `'dashboard'` (`FreelanceDashboardView`), `'members'` (`FreelanceClientsView`), `'scheduler'` (`FreelanceDeliverablesView`), `'analytics'` (`FreelanceTimeTrackerView`), `'registrations'` (`FreelanceProposalsView`), `'shop'` (`FreelanceInvoicesView`), `'finance'` (`FreelanceFinanceView`), `'history'` (`FreelanceHistoryView`), `'staff'` (`FreelanceStaffView`, if workforce enabled via `staffRules`), `'settings'` (`SettingsScreen`).

- **C. Features & Interactive Actions per Screen**
  - **`FreelanceDashboardView.tsx`**: 7 Bento charts (billable utilization, unbilled hours, multi-currency revenue, deliverables velocity).
  - **`FreelanceClientsView.tsx`**: `FreelanceClient` & `FreelanceProject` CRUD (contact, company, NIF/IFU, hourly rate, retainer budget, currency, portal share notes), pin favorites, CSV export.
  - **`FreelanceDeliverablesView.tsx`**: 5-stage Kanban (`Briefing` -> `InProgress` -> `ClientReview` -> `Approved` -> `Billed`) + list view of `FreelanceDeliverable` items, milestone due dates, pin favorites, CSV export.
  - **`FreelanceTimeTrackerView.tsx`**: Live persistent stopwatch (`ActiveTimerState`), **25-minute Pomodoro timer**, manual `TimeLogEntry` CRUD (project, task, duration, billable toggle, rate), one-click invoice conversion from unbilled hours, CSV export.
  - **`FreelanceProposalsView.tsx`**: `FreelanceProposal` creator (line items, multi-currency `DZD`/`EUR`/`USD`, scope), status transitions (`Draft` -> `Sent` -> `Accepted` -> `Declined`); **Accepting a proposal automatically creates a `FreelanceProject`**. CSV export.
  - **`FreelanceInvoicesView.tsx`**: `FreelanceInvoice` CRUD with 1-click import from unbilled `TimeLogEntry[]`, multi-currency formatting (`formatCurrencyAmount`), payment status (`Draft`/`Sent`/`Paid`/`Overdue`), **`InvoicePreviewModal.tsx`** A4 print (`window.print()`), CSV export.
  - **`FreelanceFinanceView.tsx`**: `FreelanceExpense` CRUD (category, amount, tax-deductible flag, receipt notes) + net profit & IFU/tax summary, CSV export.
  - **`FreelanceHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`freelance_invoices`, `time_logs`, `proposals`, `expenses` + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: Client & Project forms, Proposal builder, Deliverable task form, Live/Manual Time Log entries, Invoice builder (from unbilled time logs or custom lines), Expense form.
  - **Outputs & Documents**:
    - **Printable Multi-Currency Invoice (`InvoicePreviewModal.tsx`)**: A4 invoice (`window.print()`) supporting `DZD`/`EUR`/`USD`, Auto-Entrepreneur / IFU legal header, line items, and payment details.
    - CSV exports: `atrium_freelance_clients_YYYY-MM-DD.csv`, `atrium_freelance_deliverables_YYYY-MM-DD.csv`, `atrium-timesheet-YYYY-MM-DD.csv`, `atrium_freelance_proposals_YYYY-MM-DD.csv`, `atrium_freelance_invoices_YYYY-MM-DD.csv`, `atrium-expenses-YYYY-MM-DD.csv`, `atrium-freelance-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence**
  - **TypeScript Types**: `FreelanceClient`, `FreelanceProject`, `FreelanceDeliverable`, `TimeLogEntry`, `FreelanceInvoice`, `FreelanceProposal`, `FreelanceExpense`, `ActiveTimerState`.
  - **Supabase (`freelanceService.ts`)**: `freelance_clients`, `freelance_projects`, `freelance_time_logs`, `freelance_invoices`, `freelance_proposals`, `freelance_expenses`. *(`CATEGORY_TABLE_MAP` in `syncCoordinator.ts` also registers `freelance_staff`, `freelance_services`, `freelance_deliverables`, `freelance_active_timers`, `freelance_invoice_items`.)*

- **F. Truth Notes & Mismatches**
  - **Active Stopwatch State**: `ActiveTimerState` ticks locally in `store.ts` while completed logs save to `freelance_time_logs`.
  - **Conditional Staff Tab**: `Sidebar.tsx` injects `'staff'` only if `canAccessStaffScreen('freelance_solo', effectiveRole)` returns true.

---

### 3.8 `trading_commercial` — Commercial Trading & Wholesale

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Wholesale Food & Groceries (`trade_wholesale_food`), Building Materials Trading (`trade_wholesale_building_mat`), Industrial Hardware Wholesale (`trade_wholesale_hardware`), Auto Spare Parts Distributor (`trade_wholesale_auto_parts`), Electrical Supplies Wholesaler (`trade_wholesale_electrical`), Import-Export & Global Trading (`trade_import_export`), Packaging & Box Supplies (`trade_wholesale_packaging`), Cosmetics & Drugstore Wholesale (`trade_wholesale_cosmetics`), Timber, Aluminum & Steel Trading (`trade_wholesale_wood_metals`), Beverages Distribution Depot (`trade_beverage_depot`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'SARL'`.

- **B. Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - Standard Workforce RBAC: `'home'` (`TradingHomeView`), `'trading_dashboard'` / `'dashboard'` / `'analytics'` (`TradingDashboardView`), `'trading_sales'` / `'registrations'` (`TradingSalesView`), `'trading_purchases'` / `'scheduler'` (`TradingPurchasesView`), `'trading_inventory'` / `'shop'` (`TradingInventoryView`), `'trading_directory'` / `'members'` (`TradingDirectoryView`), `'trading_catalog'` (`TradingCatalogView`), `'trading_finance'` / `'finance'` (`TradingFinanceView`), `'history'` (`TradingHistoryView`), `'staff'` (`TradingStaffView`), `'settings'` (`SettingsScreen`).

- **C. Features & Interactive Actions per Screen**
  - **`TradingDashboardView.tsx`**: 7 Bento charts (B2B revenue, AR/AP exposure, depot stock value, margin waterfall).
  - **`TradingSalesView.tsx`**: Full Algerian B2B commercial cycle (`CommercialDocument`) via **`CommercialDocComposerModal.tsx`** — `Devis` -> `Bon de Commande` -> `Bon de Livraison (BL)` -> `Facture` -> `Avoir` -> `Retour`; per-line TVA (`0%`/`9%`/`19%`), **Art. 317 Timbre Fiscal** (`calculateArt317Timbre`) automatically applied on `Cash` settlement, Retenue de Garantie, partial/full payment recording, **`CommercialDocPrintModal.tsx`** A4 print (`window.print()`), CSV export.
  - **`TradingPurchasesView.tsx`**: Supplier cycle (`PurchaseDocument`: `PO` -> `BR` reception updating depot stock -> `Facture Fournisseur` -> `Avoir` / `Retour`), CSV export.
  - **`TradingInventoryView.tsx`**: Multi-depot stock view (`WarehouseDepot`) + **`StockMovementModal.tsx`** issuing `StockMovementVoucher` (`BE` *Bon d'Entrée*, `BS` *Bon de Sortie*, `BT` *Bon de Transfert* inter-depot), CSV exports (stock and vouchers).
  - **`TradingDirectoryView.tsx`**: `B2bClient` (credit limits, outstanding balance, NIF/NIS/RC/AI) & `B2bSupplier` (payable balance, payment terms) CRUD via **`B2bEntityModal.tsx`**, CSV exports (`atrium-b2b-clients-*.csv`, `atrium-b2b-suppliers-*.csv`).
  - **`TradingCatalogView.tsx`**: Wholesale `Product` SKU catalog CRUD (wholesale price, min stock, TVA rate, depot stock), CSV export.
  - **`TradingFinanceView.tsx`**: AR/AP aging buckets, client/supplier settlement allocation, treasury KPIs, CSV export.
  - **`TradingHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (sales, purchases & stock vouchers audit + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `CommercialDocComposerModal` (Partner, Document Type, Depot, Line Items, Discounts, TVA `0/9/19%`, Payment Method, Cash Timbre toggle, Retenue de Garantie), `StockMovementModal` (`BE`/`BS`/`BT`), `B2bEntityModal` (Client/Supplier fiscal identity: NIF, NIS, RC, AI), Catalog SKU form.
  - **Outputs & Documents**:
    - **A4 Commercial Document (`CommercialDocPrintModal.tsx`)**: Printable *Devis*, *Bon de Commande*, *Bon de Livraison*, *Facture*, *Avoir*, or *Retour* (`window.print()`) with Algerian NIF/NIS/RC/AI header/footer, TVA breakdown, Timbre Fiscal (on cash), Retenue de Garantie, and total in words.
    - CSV exports: `atrium-trading-sales-YYYY-MM-DD.csv`, `atrium-trading-purchases-YYYY-MM-DD.csv`, `atrium-trading-stock-YYYY-MM-DD.csv`, `atrium-trading-vouchers-YYYY-MM-DD.csv`, `atrium-b2b-clients-YYYY-MM-DD.csv`, `atrium-b2b-suppliers-YYYY-MM-DD.csv`, `atrium-trading-catalog-YYYY-MM-DD.csv`, `atrium-trading-finance-YYYY-MM-DD.csv`, `atrium-trading-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence**
  - **TypeScript Types**: `B2bClient`, `B2bSupplier`, `WarehouseDepot`, `CommercialDocument`, `PurchaseDocument`, `StockMovementVoucher`, `Product`.
  - **Supabase (`tradingService.ts`)**: `trading_warehouses`, `trading_b2b_clients`, `trading_b2b_suppliers`, `trading_products`, `trading_commercial_docs`, `trading_purchase_docs`, `trading_stock_vouchers`. *(`CATEGORY_TABLE_MAP` in `syncCoordinator.ts` also registers `trading_staff`, `trading_commercial_doc_items`, `trading_purchase_doc_items`, `trading_stock_voucher_items`.)*

- **F. Truth Notes & Mismatches**
  - **Bulk Selection Export Stub**: In `TradingSalesView.tsx` (line 681), `bulkSecondaryAction` ("Exporter Sélection") displays a `showToast` stub (`"${ids.size} pièces sélectionnées exportées."`) without generating a CSV/ZIP download; use the top toolbar CSV button (`atrium-trading-sales-*.csv`) for actual file export.

---

### 3.9 `medical_clinic` — Medical Clinic & Health Practice

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: General Medical Practice (`trade_general_practitioner`), Dental & Implantology Clinic (`trade_dental_clinic`), Pediatric Medical Practice (`trade_pediatric_clinic`), Physical Therapy & Rehab (`trade_physiotherapy`), Ophthalmology Clinic (`trade_ophthalmology`), Cardiology Medical Practice (`trade_cardiology`), Ultrasound & Radiology Lab (`trade_radiology_center`), Dermatology Medical Office (`trade_dermatology`), Obstetrics & Gynecology Clinic (`trade_gynecology`), Speech Therapy & Psychology (`trade_speech_therapy`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 9`, `applyTimbreFiscal: false`, `legalForm: 'Liberal'` (`CNOM`).

- **B. Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - Standard Workforce RBAC: `'home'` (`MedicalHomeView`), `'dashboard'` (`MedicalDashboardView`), `'scheduler'` (`MedicalQueueView`), `'agenda'` (`MedicalAgendaView`), `'members'` (`MedicalPatientsView`), `'shop'` (`MedicalPrescriptionsView`), `'registrations'` (`MedicalCertificatesView`), `'finance'` (`MedicalBillingView`), `'history'` (`MedicalHistoryView`), `'staff'` (`MedicalStaffView`), `'settings'` (`SettingsScreen`).

- **C. Features & Interactive Actions per Screen**
  - **`MedicalDashboardView.tsx`**: 7 Bento charts, live clinic KPIs, Waiting Room TV launcher (**`MedicalWaitingRoomTvModal.tsx`**), quick triggers for `MedicalPatientModal`, `MedicalAppointmentModal`, `MedicalConsultationModal`.
  - **`MedicalQueueView.tsx`**: Walk-in & scheduled patient triage board (`InWaitingQueue` -> `TriageNurse` -> `InConsultation` -> `Completed`), emergency priority flags (`atrium_medical_emergency_v2`), **Waiting Room TV display modal** (`MedicalWaitingRoomTvModal.tsx` showing anonymized ticket queue + Web Audio chime), CSV export.
  - **`MedicalAgendaView.tsx`**: Practitioner time-slot schedule (`MedicalAppointmentSlot`) by date & doctor (`MedicalPractitioner`), `MedicalAppointmentModal` CRUD, check-in to waiting queue, CSV export.
  - **`MedicalPatientsView.tsx`**: Electronic Health Record (EHR) (`MedicalPatientModal` with CNAS CHIFA card # & `80%`/`100% ALD` coverage, blood group, allergies, chronic conditions), **`BiometricVitalsPoint`** trend charts (BP, weight, temp, glycemia), **`MedicalLabRecord`** viewer (**`MedicalLabViewerModal.tsx`**), clinical consultation notes (`MedicalConsultationModal`), CSV export.
  - **`MedicalPrescriptionsView.tsx`**: `MedicalPrescription` builder (drug DCI, dosage, duration, chronic ALD renewal) + **`MedicalOrdonnancePersonalizerModal.tsx`** (`DoctorOrdonnanceConfig` studio for A4/A5 pre-printed letterhead offsets vs. full digital header + CNOM order number), printable ordonnance w/ QR verification (`window.print()`), NGAP nomenclature browser & CSV export, Prescriptions CSV export.
  - **`MedicalCertificatesView.tsx`**: Standardized Algerian medical certificates (`MedicalCertificateRecord`: *Arrêt de Travail*, *Certificat d'Aptitude*, *Certificat Médical Initial / ITT*, *Lettre d'Orientation Spécialiste*), printable certificate w/ QR hash (`window.print()`), CSV export.
  - **`MedicalBillingView.tsx`**: Consultation billing with NGAP act pricing & CNAS CHIFA *Tiers-Payant* split (`80%`/`100%`), **CNAS CHIFA *Bordereau*** generator (`ChifaClaimRecord`) & CSV export, `ClinicConsumableItem` medical stock tracker, **`DailyCashClosure`** end-of-day cash reconciliation, printable invoices/bordereaux/closures (`window.print()`), Billing CSV export.
  - **`MedicalHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`medical_consultations`, `prescriptions`, `certificates`, `chifa_claims` + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `MedicalPatientModal`, `MedicalAppointmentModal`, `MedicalConsultationModal` (vitals, diagnosis, NGAP act, prescription lines, lab requests), `MedicalOrdonnancePersonalizerModal`, Certificate form, CHIFA claim & Consumable stock forms, Daily Cash Closure form.
  - **Outputs & Documents**:
    - **Printable Ordonnance (`MedicalPrescriptionsView`)**: A4/A5 digital or preprinted-paper offset prescription (`window.print()`) with CNOM number & QR verification.
    - **Printable Medical Certificates (`MedicalCertificatesView`)**: *Arrêt de Travail*, *Aptitude*, *ITT*, *Orientation* (`window.print()`).
    - **Printable Invoice, CNAS Bordereau & Daily Cash Closure (`MedicalBillingView`)**: Multiple `window.print()` views.
    - **Waiting Room Queue TV Overlay (`MedicalWaitingRoomTvModal`)**.
    - CSV exports: `medical_queue_YYYY-MM-DD.csv`, `medical_agenda_<selectedDate>.csv`, `medical_patients_YYYY-MM-DD.csv`, `medical_prescriptions_YYYY-MM-DD.csv`, `nomenclature_ngap_YYYY-MM-DD.csv`, `medical_certificates_YYYY-MM-DD.csv`, `medical_billing_YYYY-MM-DD.csv`, `bordereau_cnas_YYYY-MM-DD.csv`, `atrium-medical-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence (`medicalData.ts` + `medicalService.ts`)**
  - **TypeScript Types**: `MedicalPractitioner`, `DoctorOrdonnanceConfig`, `MedicalPatient`, `BiometricVitalsPoint`, `MedicalConsultation`, `MedicalAppointmentSlot`, `MedicalPrescription`, `MedicalLabRecord`, `MedicalCertificateRecord`, `ChifaClaimRecord`, `ClinicConsumableItem`, `DailyCashClosure`.
  - **Supabase (`medicalService.ts` + `syncCoordinator` + `realtimeService`)**: `medical_staff` (`MedicalPractitioner`), `medical_departments` (`DoctorOrdonnanceConfig`), `medical_patients`, `medical_appointments`, `medical_consultations` (also stores serialized prescriptions, lab records & certificates), `medical_consumables`, `medical_invoices` (also stores CHIFA claims & cash closures).
  - **`localStorage` Keys**: `atrium_medical_practitioners_v2`, `atrium_medical_doctor_configs_v2`, `atrium_medical_patients_v2`, `atrium_medical_consultations_v2`, `atrium_medical_appointments_v2`, `atrium_medical_prescriptions_v2`, `atrium_medical_labs_v2`, `atrium_medical_certificates_v2`, `atrium_medical_chifa_v2`, `atrium_medical_consumables_v2`, `atrium_medical_cash_closures_v2`, `atrium_medical_emergency_v2`.

- **F. Truth Notes & Mismatches**
  - **Shared Backing Tables in `medicalService.ts`**: Rather than separate `medical_prescriptions`/`chifa_claims` tables, `medicalService.ts` packs consultations, prescriptions, labs, and certificates into `medical_consultations`, ordonnance layout configs into `medical_departments`, and CHIFA claims + daily cash closures into `medical_invoices.items`.

---

### 3.10 `auto_garage` — Automotive Garage & Fleet Repair

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: General Mechanical Garage (`trade_mechanical_garage`), Auto Body & Paint Workshop (`trade_body_paint_shop`), Electronic Diagnostics & Scanner (`trade_electronic_diagnostic`), Oil Change & Tire Center (`trade_oil_tire_center`), Auto Electrical & AC Service (`trade_auto_electrical_ac`), Vehicle Inspection Center (`trade_vehicle_inspection`), Wheel Alignment & Suspension (`trade_wheel_alignment`), Engine Machining & Head Rebuild (`trade_engine_machining`), Auto Detailing & Ceramic Coat (`trade_auto_detailing`), Motorcycle & Scooter Repair (`trade_moto_repair`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'EURL'`.

- **B. 5 Specialized Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - *All roles support `'home'` (`AutoGarageHomeView`).*
  - **`gerant`**: Full access (`home` `AutoGarageHomeView`, `dashboard` `AutoGarageDashboardView`, `scheduler` / `registrations` `AutoGarageOrdersView`, `members` `AutoGarageVehiclesView`, `shop` `AutoGaragePartsView`, `finance` `AutoGarageBillingView`, `history` `AutoGarageHistoryView`, `staff` `AutoGarageStaffView`, `settings` `SettingsScreen`).
  - **`reception`**: `scheduler` (Intake -> `AutoGarageOrdersView`), `members` (Vehicles), `finance` (Quotes), `dashboard`, `shop` (Handover -> `AutoGaragePartsView`). *(No `history` or `settings`.)*
  - **`mecanicien`**: `scheduler` / `registrations` (Bays -> `AutoGarageOrdersView`), `dashboard` (My Tasks -> `AutoGarageOrdersView`), `members` (Diagnostics -> `AutoGarageVehiclesView`), `shop` (Parts Requests -> `AutoGaragePartsView`).
  - **`magasinier`**: `shop` / `dashboard` (Parts -> `AutoGaragePartsView`), `scheduler` / `registrations` (Purchases -> `AutoGarageOrdersView`), `finance` (`AutoGaragePartsView` fallback; note `App.tsx` line 1011 redirects `finance` to `AutoGaragePartsView` default!).
  - **`caisse`**: `finance` (`AutoGarageBillingView`), `dashboard` (Cashier -> `AutoGarageDashboardView`), `members` (Fleets -> `AutoGarageVehiclesView`), `scheduler` (To Pay -> `AutoGarageOrdersView`). *(No `history`.)*

- **C. Features & Interactive Actions per Screen**
  - **`AutoGarageDashboardView.tsx`**: 7 Bento charts + active bay occupancy + workshop WIP valuation.
  - **`AutoGarageOrdersView.tsx`**: **`AutoOrderModal.tsx`** Repair Order (OR) intake with vehicle inspection **`damagesMap`**, lift/bay assignment (`assignBay` / `releaseBay`), technician assignment, parts & labor lines, workshop status progression (`Pending` -> `Diagnosed` -> `InProgress` -> `QualityCheck` -> `ReadyForPickup` -> `Delivered`), CSV export.
  - **`AutoGarageVehiclesView.tsx`**: **`AutoVehicleModal.tsx`** vehicle passport (Algerian license plate, 17-char VIN, mileage, engine code, fuel type), OBD-II DTC fault-code logger & service history, corporate Fleet account link, CSV export.
  - **`AutoGaragePartsView.tsx`**: `AutoPart` spare-parts warehouse CRUD (OEM reference, supplier, compatibility tags, bin location, min stock alert, purchase cost HT & margin, workshop parts allocation), CSV export.
  - **`AutoGarageBillingView.tsx`**: Customer Quotes (*Devis*) -> DGI-compliant Invoices (**19% TVA + Art. 317 Timbre Fiscal** on cash), Fleet corporate monthly statements, Cashier settlement & daily closure, printable A4 repair invoice / quote (`window.print()`), CSV exports (`factures_garage_*` and `caisse_garage_*`).
  - **`AutoGarageHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`garage_work_orders`, `garage_invoices`, `garage_parts` + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `AutoOrderModal` (Vehicle, Bay, Technician, Damage Checklist, Labor & Parts lines), `AutoVehicleModal` (Plate, VIN, Mileage, Owner/Fleet), Spare Parts form, OBD-II DTC codes, Invoice/Quote & Cash register settlement forms.
  - **Outputs & Documents**:
    - **Printable A4 Garage Invoice / Devis / Repair Order (`AutoGarageBillingView.tsx`)**: `window.print()` with 19% TVA, Timbre Fiscal, and vehicle/VIN metadata.
    - CSV exports: `ordres_reparation_YYYY-MM-DD.csv`, `parc_vehicules_YYYY-MM-DD.csv`, `magasin_pieces_YYYY-MM-DD.csv`, `factures_garage_YYYY-MM-DD.csv`, `caisse_garage_YYYY-MM-DD.csv`, `atrium-garage-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence (`garageData.ts` + `garageService.ts`)**
  - **TypeScript Types**: `GarageVehicle`, `GarageWorkOrder`, `AutoPart` (+ typed bay, fleet contract, and garage invoice records in `garageData.ts`).
  - **Supabase (`garageService.ts` + `syncCoordinator` + `realtimeService`)**: `garage_bays`, `garage_vehicles`, `garage_work_orders`, `garage_parts`, `garage_fleet_contracts`, `garage_invoices`. *(`CATEGORY_TABLE_MAP` also registers `garage_staff`, `garage_work_order_items`, `garage_part_requisitions`, `garage_suppliers`, `garage_purchase_orders`.)*
  - **`localStorage` Keys**: `atrium_garage_orders_v2`, `atrium_garage_vehicles_v2`, `atrium_garage_parts_v2`, `atrium_garage_bays_v2`, `atrium_garage_fleets_v2`, `atrium_garage_invoices_v2`.

- **F. Truth Notes & Mismatches**
  - **`magasinier` Finance Tab Redirect**: `Sidebar.tsx` renders `'finance'` ("Deliveries" / *Réceptions*) for `magasinier`, while `App.tsx` (lines 1011–1021) routes any screen other than `scheduler`/`registrations`/`shop`/`dashboard` back to `<AutoGaragePartsView />` rather than a dedicated deliveries screen.
  - **`caisse` / `reception` Role Restrictions**: `App.tsx` blocks `history` for `reception` and `caisse` (falling back to `AutoGarageDashboardView`).

---

### 3.11 `real_estate` — Real Estate Agency & Brokerage

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Real Estate Brokerage & Sales (`trade_real_estate_agency`), Residential Property Developer (`trade_property_developer`), Rental Property Management (`trade_rental_management`), HOA & Building Syndic (`trade_building_syndic`), Real Estate Valuation & Appraisal (`trade_property_valuation`), Commercial Real Estate Broker (`trade_commercial_real_estate`), Student Housing & Coliving (`trade_student_housing`), Property Asset Management (`trade_asset_management`), Land & Lot Acquisition (`trade_land_acquisition`), Holiday & Vacation Rentals (`trade_vacation_rentals`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'SARL'`.

- **B. 4 Specialized Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - *All roles support `'home'` (`RealEstateHomeView`).*
  - **`direction`**: Full access (`home` `RealEstateHomeView`, `dashboard` `RealEstateDashboardView`, `realestate_mandates` / `shop` `RealEstateMandatesView`, `members` `RealEstatePropertiesView`, `scheduler` `RealEstateLeasesView`, `registrations` `RealEstateInspectionsView`, `finance` `RealEstateFinanceView`, `history` `RealEstateHistoryView`, `staff` `RealEstateStaffView`, `settings` `SettingsScreen`).
  - **`negociateur`**: `dashboard`, `realestate_mandates`, `members` (Properties), `registrations` (Visits -> `RealEstateInspectionsView`). *(Blocked from `scheduler`, `finance`, `history`, `settings`.)*
  - **`gestionnaire_locatif`**: `dashboard`, `members` (Properties), `scheduler` (Leases), `finance` (Receipts), `registrations` (Inspections). *(Blocked from `realestate_mandates`, `shop`, `history`, `settings`.)*
  - **`notaire_compta`**: `dashboard`, `finance` (Closing), `scheduler` (Leases), `realestate_mandates` (Fees). *(Blocked from `registrations`, `members`, `history`, `settings`.)*

- **C. Features & Domain Rules (`realEstateRules.ts`)**
  - **`RealEstateDashboardView.tsx`**: 7 Bento charts + **`NotarySimulatorModal.tsx`** (Algerian **Décret 08-243** notary fee & registration tax calculator via `calculateNotaryClosingCosts`).
  - **`RealEstateMandatesView.tsx`**: **`MandateModal.tsx`** for **Décret Exécutif 09-18** compliant brokerage mandates (`Exclusif` / `Simple`), statutory commission tier calculator (`calculateMandateCommission`), printable mandate sheets (`window.print()`), CSV export.
  - **`RealEstatePropertiesView.tsx`**: **`RealEstatePropertyModal.tsx`** Algerian Cadastral Property Passport (`Livret Foncier`, `Acte_Notarie_Publie`, `Cession_OPGI_EPLF`, `Indivision`/`Fridha` title strength scorer `calculateTitleStrengthScore`) + **`BuyerDemandProfile`** smart matching (`calculateSmartMatchScore`), CSV export.
  - **`RealEstateLeasesView.tsx`**: **`RealEstateLeaseModal.tsx`** residential/commercial lease lifecycle (bailleur, locataire, monthly rent, caution, duration, Art. 317 timbre), CSV export.
  - **`RealEstateInspectionsView.tsx`**: Dual-mode view — **GPS-stamped *Bons de Visite* (`BonDeVisiteModal.tsx` with SVG touch signature pad)** and **Check-In / Check-Out *États des Lieux* (`RealEstateInspection` with EGW water/gas/electricity meter indexes)**, printable PV (`window.print()`), CSV exports (`etats_des_lieux_*`, `bons_de_visite_*`).
  - **`RealEstateFinanceView.tsx`**: **`QuittanceModal.tsx`** rent receipt generator (`RentalQuittanceRecord` with **Art. 317 Code du Timbre** `computeRentalTimbreFiscal`), owner net disbursement statement after agency management fee, `NotarySimulatorModal` closing cost sheet, printable quittances (`window.print()`), CSV export.
  - **`RealEstateHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (mandates, leases, inspections, quittances + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `MandateModal`, `RealEstatePropertyModal`, `RealEstateLeaseModal`, `BonDeVisiteModal` (with SVG signature & GPS coordinates), Inspection meter form, `QuittanceModal`, `NotarySimulatorModal` inputs.
  - **Outputs & Documents**:
    - **Mandate Document (`RealEstateMandatesView`)**, **PV État des Lieux / Bon de Visite (`RealEstateInspectionsView`)**, **Quittance de Loyer & Bordereau Bailleur (`RealEstateFinanceView` / `QuittanceModal`)**, **Simulation Notaire Décret 08-243 (`NotarySimulatorModal`)** — all printable via `window.print()`.
    - CSV exports: `mandats_decret_09_18_YYYY-MM-DD.csv`, `realestate_properties_YYYY-MM-DD.csv`, `baux_locatifs_YYYY-MM-DD.csv`, `etats_des_lieux_YYYY-MM-DD.csv`, `bons_de_visite_YYYY-MM-DD.csv`, `quittances_bailleurs_YYYY-MM-DD.csv`, `atrium-realestate-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence (`realEstateData.ts` + `realEstateService.ts`)**
  - **TypeScript Types**: `RealEstateProperty`, `RealEstateMandate`, `RealEstateLease`, `RentalQuittanceRecord`, `BonDeVisiteRecord`, `RealEstateInspection`, `BuyerDemandProfile`.
  - **Supabase (`realEstateService.ts` + `syncCoordinator` + `realtimeService`)**: `re_properties`, `re_mandates`, `re_leases`, `re_rent_schedules`, `re_visits`, `re_inspections`, `re_leads`. *(`CATEGORY_TABLE_MAP` also registers `re_staff`, `re_clients`, `re_owner_ledger`, `re_sales`.)*
  - **`localStorage` Keys**: `atrium_realestate_props_v2`, `atrium_realestate_mandates_v2`, `atrium_realestate_leases_v2`, `atrium_realestate_quittances_v2`, `atrium_realestate_visits_v2`, `atrium_realestate_inspections_v2`, `atrium_realestate_buyers_v2`.

- **F. Truth Notes & Mismatches**
  - **Toast-Only Validation & Share Stubs**: Inside `RealEstateInspectionsView.tsx`, `"Valider"` / `"Valider État"`, `"Partager PV"`, and `"Bon de visite GPS partagé"` trigger `showToast(...)` messages without mutating inspection validation fields or copying real URLs to the clipboard.

---

### 3.12 `manufacturing_production` — Manufacturing & Workshop Production

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Apparel & Textile Workshop (`trade_apparel_textile`), Custom Furniture & Woodworking (`trade_wood_furniture_workshop`), Aluminum & PVC Fabrication (`trade_aluminum_pvc`), Metalworks & Iron Craft Workshop (`trade_metalworks_iron`), Plastic Injection & Molding (`trade_plastic_molding`), Industrial Print Press & Packaging (`trade_offset_print_press`), Upholstery & Sofa Workshop (`trade_upholstery_salon`), Marble & Granite Stone Cutting (`trade_marble_stone`), Stainless Steel Commercial Kitchens (`trade_stainless_steel`), CNC Machining & Laser Cutting (`trade_cnc_laser_cutting`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'SARL'`.

- **B. 5 Specialized Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - *All roles support `'home'` (`ManufacturingHomeView`).*
  - **`gerant`**: Full access (`home` `ManufacturingHomeView`, `dashboard` `ManufacturingDashboardView`, `scheduler` / `registrations` `ManufacturingOrdersView`, `shop` `ManufacturingBomView`, `members` `ManufacturingMaterialsView`, `finance` `ManufacturingQcView`, `history` `ManufacturingHistoryView`, `staff` `ManufacturingStaffView`, `settings` `SettingsScreen`).
  - **`chef_atelier`**: `dashboard`, `scheduler` (Orders), `shop` (Recipes/BOM), `members` (Materials), `finance` (Quality). *(No `history`, `settings`.)*
  - **`operateur` (Kiosk Operator)**: `dashboard` (`ManufacturingWorkstationView` touch kiosk), `scheduler` / `registrations` (My Tasks -> `ManufacturingOrdersView`).
  - **`magasinier`**: `members` (Depot), `shop` (Issues), `finance` (Transfers) -> all 3 route to `ManufacturingMaterialsView`; `dashboard` (`ManufacturingDashboardView`).
  - **`qualite`**: `finance` (`ManufacturingQcView`), `dashboard` (Quarantine -> `ManufacturingDashboardView`), `scheduler` / `registrations` (Calibration -> `ManufacturingOrdersView`).

- **C. Features & Domain Rules (`manufacturingRules.ts`)**
  - **`ManufacturingDashboardView.tsx`**: 7 Bento charts + OEE efficiency (`calculateMachineEfficiencyOee`), scrap yield (`computeScrapYield`), WIP cost.
  - **`ManufacturingOrdersView.tsx`**: **`ManufacturingOrderModal.tsx`** Production Orders (`OF` — *Ordre de Fabrication*) linked to a `ManufacturingBom`; raw material availability pre-check (`validateStockAvailabilityForOf`); stage advancement (`Planned` -> `MaterialIssued` -> `InProgress` -> `QualityControl` -> `Completed`); printable OF traveler card (`window.print()`); CSV export.
  - **`ManufacturingWorkstationView.tsx` (Operator Touch Kiosk)**: Mandatory **Loi 88-07 PPE Safety Checklist** gate blocking timer start until all items checked; live cycle stopwatch; **Andon Emergency Alert** toggle; numeric keypad modal for reporting Good vs. Scrap output (`WorkstationSessionLog`).
  - **`ManufacturingBomView.tsx`**: Multi-step `ManufacturingBom` recipes (`ManufacturingRoutingStep` + raw ingredient ratios + labor/machine rates), dynamic unit cost breakdown (`calculateBomCost`), engineering instruction notes, CSV export.
  - **`ManufacturingMaterialsView.tsx`**: `RawMaterialStockItem` warehouse with **PMP / CMUP weighted-average valuation** (`calculateCmupWeightedAverage`) & ONML refs + **Décret 05-468 Material Transfer Vouchers (`MaterialTransferVoucher` `BSM` / `BS`)**, printable voucher (`window.print()`), CSV exports (`manufacturing_materials_*`, `manufacturing_vouchers_*`).
  - **`ManufacturingQcView.tsx`**: Batch `QualityInspectionRecord` (`Accepted` / `Quarantined` / `Scrapped`), batch release workflow, printable **ISO Conformity Certificate** (`window.print()`), CSV export.
  - **`ManufacturingHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`mfg_orders`, `mfg_material_vouchers`, `mfg_qc_inspections` + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `ManufacturingOrderModal`, BOM Recipe & Routing editor, PPE Loi 88-07 checklist & Numpad production output, Raw Material & BSM Transfer Voucher forms, QC inspection measurements.
  - **Outputs & Documents**:
    - **Printable OF Traveler (`ManufacturingOrdersView`)**, **Material Transfer Voucher (`ManufacturingMaterialsView`)**, **Quality Report & ISO Certificate of Conformity (`ManufacturingQcView`)** — via `window.print()`.
    - CSV exports: `manufacturing_orders_YYYY-MM-DD.csv`, `nomenclatures_bom_YYYY-MM-DD.csv`, `manufacturing_materials_YYYY-MM-DD.csv`, `manufacturing_vouchers_YYYY-MM-DD.csv`, `manufacturing_qc_YYYY-MM-DD.csv`, `atrium-manufacturing-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence (`manufacturingData.ts` + `manufacturingService.ts`)**
  - **TypeScript Types**: `ManufacturingBom`, `ManufacturingRoutingStep`, `ManufacturingOrder`, `WorkstationSessionLog`, `RawMaterialStockItem`, `MaterialTransferVoucher`, `QualityInspectionRecord`.
  - **Supabase (`manufacturingService.ts` + `syncCoordinator` + `realtimeService`)**: `mfg_raw_materials`, `mfg_bom_recipes`, `mfg_bom_ingredients`, `mfg_orders`, `mfg_workstation_logs`, `mfg_qc_inspections`, `mfg_material_vouchers`. *(`CATEGORY_TABLE_MAP` also registers `mfg_staff`, `mfg_workstations`, `mfg_batches`.)*
  - **`localStorage` Keys**: `atrium_mfg_boms`, `atrium_mfg_orders`, `atrium_mfg_raw_materials_v2`, `atrium_mfg_vouchers`, `atrium_mfg_qc_records`.

- **F. Truth Notes & Mismatches**
  - **Toast-Only Non-Conformity / Scrap Stub**: In `ManufacturingQcView.tsx` (lines 593 & 622), the `"Rebut"` (Scrap / Non-conformity) button on both the row fan and card actions only triggers a `showToast` (`"Fiche de non-conformité ouverte pour le lot ..."`) instead of recording a `QualityInspectionRecord` mutation; full QC status changes must go through the QC inspection/release flow.
  - **Client-Local Andon Alert**: `ManufacturingWorkstationView`'s Andon emergency button toggles local component state and shows an error toast rather than dispatching a persistent `mfg_*` notification row.

---

### 3.13 `legal_accounting` — Legal Cabinet, Notary & Accounting

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Law Firm & Counsel (`trade_law_firm`), Chartered Accounting & Audit Firm (`trade_cpa_accounting_firm`), Notary Public Office (`trade_notary_office`), Tax & Legal Advisory Practice (`trade_tax_legal_consulting`), Statutory Auditing Practice (`trade_statutory_audit`), Judicial Bailiff Office (`trade_bailiff_office`), Corporate & Commercial Law Firm (`trade_corporate_law`), Payroll & Social Security Advisory (`trade_payroll_hr_advisory`), Arbitration & Commercial Mediation (`trade_commercial_arbitration`), Financial Advisory & Valuation (`trade_financial_advisory`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'Liberal'`.

- **B. 4 Specialized Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - *All roles support `'home'` (`LegalHomeView`).*
  - **`avocat_associe`**: `home` (`LegalHomeView`), `dashboard` (`LegalDashboardView`), `members` (Cases -> `LegalMattersView`), `scheduler` (Hearings -> `LegalHearingsView`), `registrations` (Vault -> `LegalVaultView`), `finance` (Fees -> `LegalTrustView`), `history` (`LegalHistoryView`), `staff` (`LegalStaffView`), `settings` (`SettingsScreen`).
  - **`notaire_titulaire`**: `dashboard`, `members` (Deeds / *Actes* -> `LegalMattersView`), `scheduler` (Registry / *Foncier* -> `LegalHearingsView`), `registrations` (Archives -> `LegalVaultView`), `finance` (Escrow / *Dépôts* -> `LegalTrustView`), `history`, `staff`, `settings`.
  - **`expert_comptable`**: `dashboard`, `members` (Clients / *Mandats* -> `LegalMattersView`), `scheduler` (Tax Dates / *Échéances* -> `LegalHearingsView`), `registrations` (Audit -> `LegalVaultView`), `finance` (Ledger -> `LegalTrustView`), `history`, `staff`, `settings`.
  - **`secretaire_caisse`**: `dashboard` / `finance` (Cashier -> `LegalTrustView`), `members` (Clients -> `LegalMattersView`), `scheduler` (Service Log -> `LegalHearingsView`), `registrations` (Filing -> `LegalVaultView` — note `App.tsx` line 1185 routes `secretaire_caisse` screens outside `finance`/`members`/`scheduler` back to `LegalTrustView`), `settings`.

- **C. Features & Domain Rules (`legalRules.ts`)**
  - **`LegalDashboardView.tsx`**: 7 Bento charts + statutory deadline countdowns + trust/CARPA/escrow balances.
  - **`LegalMattersView.tsx`**: **`LegalMatterModal.tsx`** CRUD for `LegalMatter` (court docket #, jurisdiction, opposing party, retainer, CARPA balance), `NotaryDeed` (répertoire #, parties, declared value, registration/publication status), and `LegalClientEntity` (NIF/NIS/RC/AI, tax regime), CSV exports (`atrium-legal-matters.csv` and `atrium-notary-deeds.csv`).
  - **`LegalHearingsView.tsx`**: `LegalHearing` & statutory **`CPCADeadline`** calculator (`calculateCPCADeadline` handling Algerian Code de Procédure Civile et Administrative appeal/opposition/cassation days + `ALGERIAN_FIXED_HOLIDAYS` + `grand_sud` / `abroad` distance extensions) + G50 tax calendar, CSV export.
  - **`LegalVaultView.tsx`**: Evidence, notarized acts & audit exhibit vault (`atrium_legal_vault_v2` scoped per role/entity), status & confidentiality tagging, printable dossier cover/exhibit sheet (`window.print()`), CSV export (`atrium-legal-vault-<targetScope>.csv`).
  - **`LegalTrustView.tsx`**: Role-adaptive financial cockpit:
    - **Notary Escrow (`EscrowAccount`)**: Segregated buyer/seller séquestre deposits & release guard (`canReleaseEscrow`) + **Décret 08-243** notary fee schedule (`calculateNotaryDecret08243`) + colloquial centimes formatter (`formatCentimesColloquial`), printable escrow/deed statement (`window.print()`), CSV export (`atrium-notary-escrow.csv`).
    - **SCF Accounting Ledger (`SCFJournalEntry`)**: Journals (`VE`, `AC`, `BQ`, `CA`, `OD`) with double-entry debit = credit validator (`validateAndBalanceSCFEntry`), CSV export (`atrium-scf-ledger.csv`).
    - **Cashier Receipts (`CashReceipt`)**: Fee receipt issuing with **Art. 317 Timbre Fiscal** (`calculateArticle317Stamp`), printable receipt & daily cash closure (`window.print()`), CSV export (`atrium-cash-receipts.csv`).
    - **Law Firm CARPA Trust**: Client retainer & CARPA ledger + printable fee/CARPA slip (`window.print()`), CSV export (`atrium-carpa-trust.csv`).
  - **`LegalHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (matters, hearings, SCF & trust movements + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `LegalMatterModal`, Hearing & CPCA deadline inputs, Notary Deed valuation inputs, Escrow deposit/disbursement forms, SCF double-entry journal lines, Cash Receipt form, Vault document metadata.
  - **Outputs & Documents**:
    - **Prints (`window.print()`)**: Notary Escrow & Deed Closing sheets, SCF & Cash Receipt (Art. 317 timbre), Daily Cash Closure, Law Firm CARPA Trust Statement (`LegalTrustView.tsx`), Vault Document Dossier (`LegalVaultView.tsx`).
    - CSV exports: `atrium-legal-matters.csv`, `atrium-notary-deeds.csv`, `atrium-legal-hearings.csv`, `atrium-legal-vault-<targetScope>.csv`, `atrium-notary-escrow.csv`, `atrium-scf-ledger.csv`, `atrium-cash-receipts.csv`, `atrium-carpa-trust.csv`, `atrium-legal-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence (`legalData.ts` + `legalService.ts`)**
  - **TypeScript Types**: `LegalClientEntity`, `LegalMatter`, `LegalHearing`, `CPCADeadline`, `NotaryDeed`, `EscrowAccount`, `SCFJournalEntry`, `CashReceipt`.
  - **Supabase (`legalService.ts` + `syncCoordinator`)**: `legal_clients`, `legal_matters`, `legal_hearings`, `legal_deadlines`, `legal_documents`, `legal_escrow_movements`, `legal_time_entries`, `legal_cash_receipts`. *(`CATEGORY_TABLE_MAP` also registers `legal_staff`, `legal_disbursements`, `legal_invoices`.)*
  - **`localStorage` Keys**: `atrium_legal_entities`, `atrium_legal_matters`, `atrium_legal_hearings`, `atrium_legal_cpca_deadlines`, `atrium_legal_notary_deeds`, `atrium_legal_escrow_accounts`, `atrium_legal_scf_entries`, `atrium_legal_cash_receipts`, `atrium_legal_daily_closure`, `atrium_legal_vault_v2`.

- **F. Truth Notes & Mismatches**
  - **`secretaire_caisse` Vault Fallback**: `Sidebar.tsx` exposes `'registrations'` ("Filing" / *Dépôts*) to `secretaire_caisse`, but `App.tsx` (lines 1184–1195) routes any screen other than `members`/`scheduler`/`finance` back to `LegalTrustView` instead of `LegalVaultView`.
  - **Local Vault Storage**: `LegalVaultView.tsx` manages its own exhibit list in `atrium_legal_vault_v2` (`localStorage`) alongside `legal_documents` in `legalService.ts`.

---

### 3.14 `logistics_delivery` — Logistics, Couriers & Delivery

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Last-Mile Express Courier (`trade_express_courier`), National COD Parcel Delivery Network (`trade_cod_parcel_network`), Heavy Freight & Road Haulage (`trade_freight_transport`), Moving, Relocation & Heavy Handling (`trade_moving_logistics`), Freight Forwarding & Customs Broker (`trade_customs_forwarder`), Urban Moto Courier Fleet (`trade_moto_couriers`), Refrigerated & Cold Chain Logistics (`trade_cold_chain_transport`), E-Commerce Warehousing & Fulfillment (`trade_ecommerce_fulfillment`), Cross-Docking & Distribution Hub (`trade_crossdock_hub`), Vehicle Recovery & Heavy Towing (`trade_heavy_towing`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 19`, `applyTimbreFiscal: true`, `legalForm: 'SARL'`.

- **B. 4 Specialized Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - *All roles support `'home'` (`LogisticsHomeView`).*
  - **`gerant`**: Full access (`home` `LogisticsHomeView`, `dashboard` `LogisticsDashboardView`, `members` `LogisticsShipmentsView`, `scheduler` `LogisticsManifestsView`, `registrations` `LogisticsScannerView`, `finance` `LogisticsCodView`, `history` `LogisticsHistoryView`, `staff` `LogisticsStaffView`, `settings` `SettingsScreen`).
  - **`dispatcher`**: `scheduler` (Runs), `members` (Parcels), `registrations` (Scanner), `dashboard`, `settings`. *(Blocked from `finance`, `history`.)*
  - **`hub_sorter`**: `registrations` / `dashboard` (Scanner -> `LogisticsScannerView`), `members` (Parcels), `scheduler` (Loading -> `LogisticsManifestsView`).
  - **`stop_desk_agent`**: `members` (Counter -> `LogisticsShipmentsView`), `finance` (Cashier -> `LogisticsCodView`), `registrations` / `dashboard` (Shelving -> `LogisticsScannerView`).

- **C. Features & Domain Rules (`logisticsRules.ts`)**
  - **`LogisticsDashboardView.tsx`**: 7 Bento charts + 58-wilaya network COD & SLA metrics + **`WilayaTariffModal.tsx`** (customizable zone rates across `ALGIERS_CENTER`, `NORTH_METRO`, `HIGH_PLATEAUS`, `SOUTH_SAHARA`, `FAR_SOUTH`, stored in `atrium_logistics_tariffs_v1`).
  - **`LogisticsShipmentsView.tsx`**: **`LogisticsShipmentModal.tsx`** AWB parcel creation across all **58 Algerian Wilayas** (`ALGERIAN_WILAYAS`), Home vs StopDesk delivery mode, volumetric weight (`calculateVolumetricWeight`), auto tariff + **Art. 317 Timbre** calculation (`computeShipmentTariff` / `computeAlgerianFiscalStamp`), Algerian mobile phone validator (`validateAlgerianPhone`), **`StopDeskHandoverModal.tsx`** (OTP + CNI verification at counter), CSV export.
  - **`LogisticsManifestsView.tsx`**: Driver run dispatch (`LogisticsManifest` *Livraison* `LVR-*`, driver NIN, vehicle plate, assigned parcels, COD expected vs collected), **`TransportManifestPrintModal.tsx`** A4 driver waybill (`window.print()`), CSV export.
  - **`LogisticsScannerView.tsx`**: High-speed barcode/AWB scanner dock (`Enter`-key scan listener, live audio feedback, `TransportBag` sorting bags with security seal numbers `SL-*`, `StopDeskInventoryItem` rack/shelf placement), CSV export.
  - **`LogisticsCodView.tsx`**: **`CourierCashDischarge`** (*Décharge Chauffeur*) via **`CourierDischargeModal.tsx`** with physical Algerian banknote denomination counter (`computeCourierDischargeBalance` / `calculateDriverPayout` + `window.print()`), **`MerchantRemittanceBatch`** CRBT merchant payouts via **`AlgeriePosteSfp01Modal.tsx`** (CCP account key `calculateCcpKey` + SFP 01 lines `formatCcpSfp01Line`), printable receipts (`window.print()`), CSV export.
  - **`LogisticsHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`logistics_parcels`, `logistics_discharges`, `logistics_remittances` + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `LogisticsShipmentModal` (Sender/Merchant, Recipient, Phone, Wilaya 01–58, Mode Home/StopDesk, Weight/Dimensions, COD Amount), Barcode Scanner AWB & Security Seal inputs, `StopDeskHandoverModal` (OTP + CNI), `CourierDischargeModal` banknote quantities, `WilayaTariffModal` rate rules.
  - **Outputs & Documents**:
    - **Printable Driver Transport Manifest (`TransportManifestPrintModal.tsx`)** (`window.print()`).
    - **Printable Courier COD Cash Discharge (`CourierDischargeModal.tsx`)** (`window.print()`).
    - **Algérie Poste SFP 01 / BaridiMob CRBT Remittance Batch (`AlgeriePosteSfp01Modal.tsx` & `LogisticsCodView.tsx`)** (`window.print()`).
    - CSV exports: `logistics_shipments_YYYY-MM-DD.csv`, `manifestes_tournees_YYYY-MM-DD.csv`, `quai_tri_YYYY-MM-DD.csv`, `caisse_cod_YYYY-MM-DD.csv`, `atrium-logistics-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence (`logisticsData.ts` + `logisticsService.ts`)**
  - **TypeScript Types**: `LogisticsShipment`, `TransportBag`, `LogisticsManifest`, `CourierCashDischarge`, `StopDeskInventoryItem`, `MerchantRemittanceBatch`.
  - **Supabase (`logisticsService.ts` + `syncCoordinator` + `realtimeService`)**: `logistics_parcels`, `logistics_courier_bags`, `logistics_fleet`, `logistics_discharges`, `logistics_remittances`, `logistics_wilaya_tariffs`. *(`CATEGORY_TABLE_MAP` also registers `logistics_staff`, `logistics_drivers`, `logistics_merchants`, `logistics_parcel_events`, `logistics_tickets`.)*
  - **`localStorage` Keys**: `atrium_logistics_shipments_v2`, `atrium_logistics_bags_v2`, `atrium_logistics_manifests_v2`, `atrium_logistics_discharges_v2`, `atrium_logistics_remittances_v2`, `atrium_logistics_tariffs_v1`.

- **F. Truth Notes & Mismatches**
  - **`hub_sorter` & `stop_desk_agent` Finance/Dashboard Routing**: `App.tsx` (lines 1219–1233) falls back to `LogisticsScannerView` for any screen not explicitly matched (`dashboard` -> `LogisticsScannerView`, bypassing `LogisticsDashboardView` for those two roles).

---

### 3.15 `construction_contractor` — Construction & BTP Contracting

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: General Building Contractor (`trade_general_building_contractor`), Civil Engineering, Earthworks & Paving (`trade_civil_works_paving`), Commercial & Building Electrical (`trade_building_electrical`), Plumbing & HVAC Contractor (`trade_plumbing_hvac`), Drywall, BA13 & Interior Finishing (`trade_finishing_drywall`), Roof Waterproofing & Insulation (`trade_waterproofing_insulation`), Steel Framing & Industrial Sheds (`trade_steel_framing`), Tiling, Flooring & Screed (`trade_tiling_flooring`), External Groundworks & Landscaping (`trade_landscaping_earth`), Site Demolition & Debris Clearing (`trade_demolition_site`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 9`, `applyTimbreFiscal: true`, `legalForm: 'SARL'` (`CACOBATPH`).

- **B. 5 Specialized Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - *All roles support `'home'` (`ContractorHomeView`).*
  - **`gerant`**: `home` (`ContractorHomeView`), `dashboard` (`ContractorDashboardView`), `members` (Projects -> `ContractorSitesView`), `scheduler` (Deadlines -> `ContractorDailyLogsView`), `finance` (Treasury -> `ContractorBillingView`), `history` (`ContractorHistoryView`), `staff` (`ContractorStaffView`), `settings` (`SettingsScreen`).
  - **`conducteur` / `conducteur_travaux`**: `dashboard`, `members` (Sites -> `ContractorSitesView`), `shop` (Quantities -> `ContractorBoqView`), `scheduler` (Lab -> `ContractorDailyLogsView`), `finance` (Subcontractors -> `ContractorBillingView`).
  - **`chef_chantier`**: `dashboard` / `scheduler` (Attendance -> `ContractorDailyLogsView`), `members` / `registrations` (Site Log -> `ContractorSitesView`), `shop` (Concrete -> `ContractorBoqView`), `finance` (Equipment -> `ContractorBillingView`).
  - **`metreur` / `daf_metreur`**: `dashboard`, `shop` (Estimates -> `ContractorBoqView`), `scheduler` (Statements -> `ContractorDailyLogsView`), `finance` (Revisions -> `ContractorBillingView`), `settings` (`SettingsScreen`).
  - **`comptable`**: `dashboard`, `finance` (Billings -> `ContractorBillingView`), `scheduler` (Weather Claims -> `ContractorDailyLogsView`), `shop` (Suppliers -> `ContractorBoqView`), `members` (Petty Cash -> `ContractorSitesView`).

- **C. Features & Domain Rules (`contractorRules.ts`)**
  - **`ContractorDashboardView.tsx`**: 7 Bento charts + contract execution %, delay penalties (`calculateDelayPenalties`), retention escrow (`Retenue de Garantie`).
  - **`ContractorSitesView.tsx`**: **`ContractorProjectModal.tsx`** CRUD (`ContractorProject` market ref, Maitre d'Ouvrage, wilaya, ODS start, contract value, 5% retention rate), `ContractorServiceOrder` (`OS` stop/resume), `CaisseExpenseRecord` site petty cash, CSV export.
  - **`ContractorBoqView.tsx`**: Quantitative **BOQ / *Devis Quantitatif & Estimatif* (`ContractorBoqItem`)** with cumulative execution progress %, concrete volume calculator (`calculateConcreteTheoreticalVolume`), engineering notes, CSV export.
  - **`ContractorDailyLogsView.tsx`**: Daily site logs (`ContractorDailyLog` manpower & weather), **Concrete Lab QC (`ConcretePourRecord`: B15/B20/B25/B30/B35 7-day & 28-day MPa crushing tests via `validateConcreteStrength`)**, **Heavy Equipment Fuel Burn Tracker (`EquipmentLogRecord` with theft/anomaly detection `calculateFuelConsumptionAnomaly`)**, **`CacobatphDossierModal.tsx`** (48-hour bad-weather stoppage claim validated against ONM bulletin `validateCacobatphWeatherStoppage`), CSV exports (`journaux_chantier_*`, `parc_engins_gasoil_*`).
  - **`ContractorBillingView.tsx`**: **Situations & Décomptes Provisoires (`ContractorDgp`)** (`calculateDecompteProvisoire`: gross cumulative work, previous billed, advance recovery, **5% Retenue de Garantie**, 9%/19% TVA, Trésor Public mandat), **`ContractorDecomptePrintModal.tsx`** A4 print (`window.print()`), **`PriceRevisionModal.tsx`** Algerian contractual price revision formula (`calculatePriceRevisionCoeff` + `window.print()`), `SubcontractorAgreement` quitus/retainer tracker, CSV export.
  - **`ContractorHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`btp_projects`, `btp_decomptes`, `btp_daily_logs` + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `ContractorProjectModal`, BOQ line-item execution updates, Daily Log / Concrete Lab MPa / Equipment diesel L/hr forms, `CacobatphDossierModal` (ONM bulletin #), `ContractorDgp` billing run, `PriceRevisionModal` index inputs.
  - **Outputs & Documents**:
    - **Printable Décompte Provisoire (`ContractorDecomptePrintModal.tsx`)** (`window.print()`).
    - **Printable Price Revision Memo (`PriceRevisionModal.tsx`)** (`window.print()`).
    - **Printable CACOBATPH 48h Weather Stoppage Dossier (`CacobatphDossierModal.tsx`)** (`window.print()`).
    - CSV exports: `chantiers_btp_YYYY-MM-DD.csv`, `bordereau_boq_YYYY-MM-DD.csv`, `journaux_chantier_YYYY-MM-DD.csv`, `parc_engins_gasoil_YYYY-MM-DD.csv`, `decomptes_dgp_YYYY-MM-DD.csv`, `atrium-contractor-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence (`contractorData.ts` + `contractorService.ts`)**
  - **TypeScript Types**: `ContractorProject`, `ContractorBoqItem`, `ContractorDailyLog`, `ContractorDgp`, `ContractorServiceOrder`, `ConcretePourRecord`, `SubcontractorAgreement`, `EquipmentLogRecord`, `CaisseExpenseRecord`.
  - **Supabase (`contractorService.ts` + `syncCoordinator`)**: `btp_projects`, `btp_boq_items`, `btp_daily_logs` (also stores service orders & weather/concrete log data), `btp_decomptes`, `btp_subcontractors`, `btp_equipment`, `btp_materials`. *(`CATEGORY_TABLE_MAP` also registers `btp_staff`, `btp_subcontract_claims`, `btp_safety_incidents`, `btp_cacobatph_dossiers`.)*
  - **`localStorage` Keys**: `atrium_contractor_projects`, `atrium_contractor_boq`, `atrium_contractor_logs`, `atrium_contractor_dgps`, `atrium_contractor_os`, `atrium_contractor_concrete`, `atrium_contractor_subcontractors`, `atrium_contractor_equipment`.

- **F. Truth Notes & Mismatches**
  - **Role Key Aliasing (`staffRules.ts` vs `Sidebar.tsx`/`App.tsx`)**: `Sidebar.tsx` supports both `'conducteur'`/`'conducteur_travaux'` and `'metreur'`/`'daf_metreur'`; however `staffRules.ts`'s `canAccessStaffScreen()` explicitly lists `'gerant'`, `'conducteur_travaux'`, `'daf_metreur'` (meaning the short alias `'conducteur'` or `'metreur'` if stored directly would fail `canAccessStaffScreen` unless normalized).

---

### 3.16 `agriculture_farming` — Agri-Business & Livestock Farming

- **A. Expected Businesses & Defaults**
  - **10 Expected Trades (`FULL_16_VERTICAL_CATALOG`)**: Greenhouse & Vegetable Farming (`trade_greenhouse_farming`), Fruit Orchards & Arboriculture (`trade_orchard_fruit`), Poultry & Egg Production Farm (`trade_poultry_farm`), Dairy & Beef Cattle Ranch (`trade_dairy_cattle`), Sheep & Goat Farming (`trade_sheep_goat_farming`), Cereal & Grain Crop Farming (`trade_cereal_farming`), Olive Groves & Olive Oil Mill (`trade_olive_groves`), Apiculture & Honey Production (`trade_beekeeping`), Horticultural & Plant Nursery (`trade_plant_nursery`), Fruit & Vegetable Packing Station (`trade_crop_packaging`).
  - **Fiscal Defaults**: `DZD`, `defaultTvaRate: 0`, `applyTimbreFiscal: false`, `legalForm: 'PersonnePhysique'`.

- **B. 4 Specialized Roles & Screens (`Sidebar.tsx` + `App.tsx`)**
  - *All roles support `'home'` (`AgricultureHomeView`).*
  - **`gerant`**: Full access (`home` `AgricultureHomeView`, `dashboard` `AgricultureDashboardView`, `members` `AgricultureParcelsView`, `scheduler` `AgricultureCyclesView`, `shop` `AgricultureHarvestView`, `registrations` `AgricultureLivestockView`, `finance` `AgricultureWholesaleView`, `history` `AgricultureHistoryView`, `staff` `AgricultureStaffView`, `settings` `SettingsScreen`).
  - **`chef_culture`**: `members` (Parcels -> `AgricultureParcelsView`), `scheduler` (Crops -> `AgricultureCyclesView`), `shop` (Workers -> `AgricultureHarvestView`).
  - **`zootechnicien`**: `registrations` (Livestock -> `AgricultureLivestockView` — all routes fall back here for `zootechnicien`).
  - **`magasinier`**: `finance` (Weighbridge -> `AgricultureWholesaleView`), `shop` (Harvest -> `AgricultureHarvestView`).

- **C. Features & Domain Rules (`agriRules.ts`)**
  - **`AgricultureDashboardView.tsx`**: 7 Bento charts + ANRH water quota gauges + DAR lockout warnings + ONIL milk subsidy tracker.
  - **`AgricultureParcelsView.tsx`**: **`AgricultureParcelModal.tsx`** CRUD for `AgriParcel` (**Loi 10-03** land tenure: `Concession_Loi_10_03`, `Melk_Prive`, `Fermage`, **ANRH borehole water quota** M³ monitoring via `checkAnrhQuotaStatus`), CSV export.
  - **`AgricultureCyclesView.tsx`**: **`AgriCropCycleModal.tsx`** (`AgriCropCycle` lifecycle `planned` -> `sowing` -> `vegetative` -> `treatment_locked` -> `ready_harvest` -> `closed`) + **`AgriTreatmentModal.tsx`** (`AgriTreatmentLog` phytosanitary spraying with mandatory **DAR pre-harvest lockout** evaluation `evaluateDarSafety`), CSV exports (`cycles_cultures_*`, `traitements_phyto_*`).
  - **`AgricultureHarvestView.tsx`**: Harvest lot weighing + **`AgriWorker` & `AgriDailyPointage`** seasonal piecework wage calculator (`calculatePieceworkWage`: crates picked * unit rate or daily wage minus cash advances), CSV exports (`pesee_recolte_*`, `pointage_tacherons_*`).
  - **`AgricultureLivestockView.tsx`**: `AgriDairyCow` herd registry (`DZ-*` ear-tags, breed, lactation stage, **antibiotic milk-withholding lockout**) + **`AgriMilkingModal.tsx`** (`AgriMilkingRecord`: tank temperature check, conforming vs rejected liters, **12 DZD/L ONIL raw milk subsidy** via `computeOnilMilkSubsidy`), **`OnilBordereauPrintModal.tsx`** official ONIL subsidy claim print (`window.print()`), CSV exports (`cheptel_bovin_*`, `sessions_traite_lait_*`).
  - **`AgricultureWholesaleView.tsx`**: Wholesale auction (*Criée* / *Mandataire*) weighbridge (`AgriWeighbridgeTicket`: Gross kg - Truck Tare - Crate Tare = Net kg/quintaux via `calculateWeighbridgeNetWeight`, mandataire commission %, **Art. 317 Timbre** `calculateArt317Timbre`), **`AgriWeighbridgePrintModal.tsx`** weighbridge ticket print (`window.print()`), CSV export (`ventes_gros_criee_*`).
  - **`AgricultureHistoryView.tsx`**: Dual-tab `VerticalHistoryScaffold` (`agri_crop_cycles`, `agri_milking_logs`, `agri_sales` + `EmbeddedUndoHistoryPanel`), CSV export.

- **D. Inputs, Outputs & Documents**
  - **Inputs**: `AgricultureParcelModal`, `AgriCropCycleModal`, `AgriTreatmentModal` (DAR days), Piecework `AgriDailyPointage` crates & advances, `AgriMilkingModal` (liters, temp, antibiotic check), Weighbridge Gross/Tare inputs.
  - **Outputs & Documents**:
    - **Printable ONIL Milk Subsidy *Bordereau* (`OnilBordereauPrintModal.tsx`)** (`window.print()`).
    - **Printable Weighbridge Wholesale Ticket (`AgriWeighbridgePrintModal.tsx`)** (`window.print()`).
    - CSV exports: `parcelles_agricoles_YYYY-MM-DD.csv`, `cycles_cultures_YYYY-MM-DD.csv`, `traitements_phyto_YYYY-MM-DD.csv`, `pesee_recolte_YYYY-MM-DD.csv`, `pointage_tacherons_YYYY-MM-DD.csv`, `cheptel_bovin_YYYY-MM-DD.csv`, `sessions_traite_lait_YYYY-MM-DD.csv`, `ventes_gros_criee_YYYY-MM-DD.csv`, `atrium-agriculture-history-YYYY-MM-DD.csv`.

- **E. Data Model & Persistence (`agricultureData.ts` + `agricultureService.ts`)**
  - **TypeScript Types**: `AgriParcel`, `AgriCropCycle`, `AgriTreatmentLog`, `AgriWorker`, `AgriDailyPointage`, `AgriDairyCow`, `AgriMilkingRecord`, `AgriWeighbridgeTicket`.
  - **Supabase (`agricultureService.ts` + `syncCoordinator`)**: `agri_parcels`, `agri_crop_cycles`, `agri_treatments`, `agri_livestock`, `agri_milking_logs`, `agri_harvests`, `agri_staff`, `agri_sales`. *(`CATEGORY_TABLE_MAP` also registers `agri_cold_storage`, `agri_stock_items`.)*
  - **`localStorage` Keys**: `atrium_agri_parcels_v2`, `atrium_agri_cycles_v2`, `atrium_agri_treatments_v2`, `atrium_agri_workers_v2`, `atrium_agri_pointages_v2`, `atrium_agri_dairy_cows_v2`, `atrium_agri_milking_v2`, `atrium_agri_weighbridge_v2`.

- **F. Truth Notes & Mismatches**
  - **`__atrium_agri__:` Packed JSON Envelopes**: `agricultureService.ts` serializes extended domain fields (DAR dates, ANRH water quotas, piecework advances, antibiotic withholding lockouts, weighbridge crate tares) inside `__atrium_agri__:{...}` JSON strings packed into text columns (`notes` / `plain` fields) across the 8 `agri_*` Supabase tables via `packMeta()` / `unpackMeta()`.
  - **Non-Gérant Access**: `App.tsx` (lines 1300–1339) blocks `'settings'` and `'history'` for `chef_culture`, `zootechnicien`, and `magasinier`.
