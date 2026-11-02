# Full Production Blueprint: Category-Dedicated Staff Workspaces & Core Foundation

An exhaustive, production-grade architectural specification for deploying **dedicated workforce management cockpits** across all 16 business categories in Atrium ERP & CRM, powered by Atrium's existing design system (`UniversalDataCollection`, `AtriumButton`, `LabelInput`, `LabelSelect`, `Seek`, `StatTile`, `Modal`, `ConfirmDialog`) and enforcing **100% trilingual parity** across French, Modern Standard Arabic (RTL with Cairo typography), and English.

This plan eliminates all screen duplication and navigation clutter (such as the redundant generic staff injection in Agency and the tangled Gym Finance/Staff view) while giving every category a specialized workforce view that preserves its domain-specific operational capabilities.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been revised and locked into this production plan based on your guidance:

- **100% Reuse of Existing Atrium UI/UX Design System**: Zero new or foreign design patterns. Every staff workspace is built strictly with:
  - **`AtriumButton`**: Hermès warm terracotta (`#C4785A`) with ambient glow, satin ceramic finish, and 1px fine bevel edge highlight.
  - **`#F8F9FA` Elevated Pod Trays**: Subdued grey grouping surface housing the 3-KPI operational pulse.
  - **`#1F1D1B` Dark Espresso Anchor Card**: High-contrast dark pod displaying real-time daily shift muster, active headcount, and payroll telemetry.
  - **`UniversalDataCollection<StaffMember>`**: Dual List/Grid switcher, floating white card row headers with functional sort/filter arrows, floating bottom pill toolbar for bulk operations, and 390px slide-over inspector drawer.
  - **Kinetic `Seek`**: Expanding search lens with keyboard shortcuts and instant filtering.
  - **Kinetic `LabelInput` & `LabelSelect`**: Floating notch labels with terracotta focus rings for all modals.
- **Trilingual Parity Across All 3 Languages (FR / AR / EN)**:
  - **French (Default)**: Official Algerian commercial and administrative terminology (e.g., *Équipe, Pointage du jour, Rôle métier, Décret exécutif, CACOBATPH, Ordre des Médecins*).
  - **Arabic (RTL)**: Full Modern Standard Arabic localization with proper Algerian business context, native typography via `font-cairo`, and flipped layout orientations (`dir="rtl"`).
  - **English**: Clean international ERP terminology (*Staff, Daily Attendance, Shift Muster, Role, Payroll*).
- **Deduplication & Clean Separation**:
  - **Agency (`project_milestone`)**: Employs its native `ProjectRhView` (`pm_rh_talents` / Talents & RH) as the official workforce hub. The artificial generic staff item injected into `Sidebar.tsx` for `project_milestone` is completely removed.
  - **Membership (`membership_session`)**: Separates financial ledger accounting from staff management. `MembershipFinanceView` is strictly dedicated to subscription sales, daily register revenue, and cash drawer closures. A dedicated `MembershipStaffView` manages gym coaches, trainers, RFID turnstiles, and shift rosters.
  - **Salon (`appointment_service`)**: `AppointmentFinanceView` manages salon accounting, while `AppointmentStaffView` manages stylists, chair assignments, and commission payouts.
  - **All other categories**: Receive their dedicated category staff view mapped to a single, consistent **"Équipe" / "Staff"** item positioned right before Settings.

---

## 1. Overview & Core Concept

- **What It Does**: Provides every business vertical in Atrium with a dedicated, production-grade workforce screen that shares a common, battle-tested operational core (attendance pointage, RFID/QR/PIN credentials, status lifecycles, and RBAC security) while maintaining full fidelity with each vertical's specialized field operations.
- **Target Personas & Permissions (RBAC)**:
  - **Owner (Gérant / Direction / Associé)**: Master administrative authority. Onboards staff, sets salaries and CCP/bank details, configures contracts, and performs lifecycle transitions (Freeze, Leave, Termination, Delete).
  - **Operational Team Leads** (*Conducteur de Travaux, Chef d'Atelier, Chef de Culture, Dispatcher Hub, Médecin Chef, Associé*): Operational team authority. Can view muster rosters, execute attendance pointage, and assign workstations/bays/parcels. Sensitive commercial payroll amounts are masked.
  - **Staff Operators** (*Coach, Coiffeur, Caissier, Mécanicien, Ouvrier, Livreur, Infirmier*): Pointage & Shift access. Clocks in/out via RFID/QR scan or 4-digit PIN code. In simple dual-role categories (Gym, Salon, Retail, Education, Freelance), regular staff are locked out of the administrative staff screen.
- **Key Value**: Eradicates confusing screen duplications, removes generic fallbacks, and gives operators an authentic, category-tailored human resources environment.

---

## 2. User Experience & Visual Design

### A. Screen Composition & Layout Architecture

Every category staff view renders inside Atrium's standard single-elevation white canvas (`bg-white rounded-[32px] p-6 lg:p-8`) with permanent rounded borders and inner scrolling (`#main-content-scroll`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TopBar Breadcrumb: [Catégorie] / Équipe (فريق العمل / Staff)                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Elevated #F8F9FA Pod Tray (3-KPI Pulse + #1F1D1B Dark Espresso Anchor)                 │
│ ┌──────────────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌─────────────┐ │
│ │ #1F1D1B Dark Espresso    │ │ Effectif Actif   │ │ Pointage du Jour │ │Masse Salar. │ │
│ │ 14 Collaborateurs        │ │ 12 En poste      │ │ 86% Présents     │ │560 000 DZD  │ │
│ │ 2 En congé · 0 Suspendu  │ │ CDI: 9 · CDD: 5  │ │ 1 En retard      │ │Proch. le 28 │ │
│ └──────────────────────────┘ └──────────────────┘ └──────────────────┘ └─────────────┘ │
│                                                                                        │
│ Workforce Control Bar:                                                                 │
│ ┌──────────────────────────────────────────────┐ ┌───────────────┐ ┌─────────────────┐ │
│ │ [⚡ Pointer Présence (RFID/PIN/Manuel)]       │ │ [🔍 Seek...]  │ │ [+ Nouveau]     │ │
│ └──────────────────────────────────────────────┘ └───────────────┘ └─────────────────┘ │
│                                                                                        │
│ UniversalDataCollection (List View & Grid View Switcher)                               │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [Photo/Avatar] Nom & Prénom · Rôle · Statut · Tél · Spécialité/Affectation · [⋮]  │ │
│ │ 🟢 Dr. Mourad B. · Médecin Chef · Actif · 0550123456 · Ordonnance CNAS · [⋮]       │ │
│ │ 🟢 Yacine K. · Chef d'Atelier BTP · Actif · 0661234567 · Chantier Bab Ezzouar · [⋮]│ │
│ │ 🟡 Samia L. · Styliste Senior · En Congé · 0770987654 · Fauteuil #02 · [⋮]         │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ Floating Bottom Pill Toolbar (Appears upon row selection for bulk operations)          │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 2 Sélectionnés │ [⚡ Pointer Présents] [🏖️ Mettre en Congé] [🔒 Geler] [🗑️ Supprimer]│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### B. UniversalDataCollection Integration
- **Row Headers**: Encased in a floating white card container on the grey pod with functional sort/filter arrows on every column.
- **Bulk Action Pill**: Standardized floating bottom pill container offering contextual secondary actions (bulk pointage check-in, bulk leave assignment, bulk freeze, and delete).
- **Dual View Modes**: Seamless toggle between dense Table List View and tactile Grid Cards.
- **Zero-Pill Metadata Discipline**: Clean, unboxed text hierarchy with semantic status indicators (🟢 Actif, 🟡 En Congé, 🔴 Suspendu, ⚪ Terminé).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Dedicated Category Staff Views vs. Single Monolithic Universal View
- **Chosen Approach**: Build dedicated view files (`MembershipStaffView`, `AppointmentStaffView`, `ContractorStaffView`, `MedicalStaffView`, etc.) that each import and render a shared foundational core (`StaffHeaderTray`, `StaffActionToolbar`, `useStaffFoundation`).
- **Why**: Allows each vertical to maintain its distinct domain logic, specialized columns (e.g. lift bays for garages, CACOBATPH for BTP, ordonnance authority for clinics), and tailored modal inputs without spaghetti `if (category === '...')` blocks inside one bloated 2,000-line file.
- **Trade-off**: Requires multiple modular view files, but ensures clean separation of concerns, high maintainability, and zero risk of cross-vertical regressions.

### Decision 2: Deduplication of Agency (Project RH) and Gym Finance
- **Chosen Approach**:
  - In **Project & Agency**, make `ProjectRhView` the exclusive HR screen. Remove the duplicate generic `staff` injection from `Sidebar.tsx`.
  - In **Membership**, strip duplicated staff tables and modals out of `MembershipFinanceView` so it functions purely as the Gym Financial Accounting & Caisse desk. Mount `MembershipStaffView` as the dedicated Gym Staff & Coaches view under "Équipe".
- **Why**: Eliminates operator confusion caused by having two separate screens managing the same employees with conflicting states.

### Decision 3: Trilingual Naming & Positioning Standard
- **Chosen Approach**: The sidebar item is consistently titled **"Équipe"** in French, **"Staff"** in English, and **"فريق العمل"** in Arabic, placed uniformly right above "Paramètres" (Settings) in all categories.
- **Why**: Muscle memory consistency for users operating across multiple branches or multi-vertical accounts.

---

## 4. Technical Architecture & Data Strategy

### A. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    Atrium Store                                         │
│  - staff: StaffMember[]                                                                 │
│  - currentBusiness, currentBranch, currentUser                                          │
│  - punchStaffAttendance, addStaff, updateStaff, deleteStaff, batchUpdateStaff           │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          Shared Staff Foundation Core                                   │
│                        (src/components/common/staff/)                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ • useStaffFoundation: Filtering by branch, search query, status, pointage, RBAC checks  │
│ • StaffHeaderTray: Pod tray + #1F1D1B Dark Espresso anchor + 3-KPI pulse               │
│ • StaffActionToolbar: RFID/PIN rapid pointage button, Seek search lens, filter pills    │
│ • StaffInspectorDrawer: 390px slide-over dossier with domain-specific metadata slot     │
│ • StaffModal: Tier 1 Universal credentials + dynamic Tier 2 category fields            │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
┌──────────────────────────────────────────────┐ ┌────────────────────────────────────────┐
│     Dedicated Category Views (15 Views)      │ │   Agency Native Integration (Cat 13)   │
├──────────────────────────────────────────────┤ ├────────────────────────────────────────┤
│ • MembershipStaffView (Coaches, RFID turn)   │ │ ProjectRhView (Talents CRM & Dossiers) │
│ • AppointmentStaffView (Stylists, chairs)    │ │   - Native 4-tab workflow:             │
│ • PosStaffView (Cashiers, till registers)    │ │     * Talents Pool                     │
│ • EducationStaffView (Teachers, cohorts)     │ │     * Dossier Administratif            │
│ • AutoGarageStaffView (Mechanics, lift bays) │ │     * Portal Recrutement               │
│ • MedicalStaffView (Doctors, Ordre, CNAS)    │ │     * Walk-in Onboarding               │
│ • ContractorStaffView (Site crew, CACOBATPH) │ │   - Dedicated SFP 01 CCP Slips         │
│ • LogisticsStaffView (Couriers, licenses)    │ └────────────────────────────────────────┘
│ • ManufacturingStaffView (Machinists, CNC)   │
│ • AgricultureStaffView (Tacherons, milkers)  │
│ • LegalStaffView (Lawyers, sworn clerks)     │
│ • RealEstateStaffView (Agents, carte pro)    │
│ • TradingStaffView (Commercial reps, depots) │
│ • VenueStaffView (Stage crew, hall coords)   │
│ • FreelanceStaffView (Solo collaborators)    │
└──────────────────────────────────────────────┘
```

### B. Category-Specific Domain Fields Matrix

| Category | Component | Specialized Operational Properties & Badges |
|---|---|---|
| **Gym & Fitness** | `MembershipStaffView` | Turnstile RFID Card ID, Fitness disciplines (CrossFit, Yoga, Boxing), Assigned class schedule slots, Commission rate on personal training. |
| **Salon & Spa** | `AppointmentStaffView` | Assigned styling chair #, Specialty (Colorist, Barber, Esthetics), Commission % on services & retail products. |
| **POS & Retail** | `PosStaffView` | Assigned POS register / terminal ID, Authorized max cash float in DZD, Shift cash drawer closure authority. |
| **Education** | `EducationStaffView` | Teaching discipline, Assigned cohorts/rooms, Official student roll-call & certificate signature clearance. |
| **Auto Garage** | `AutoGarageStaffView` | Assigned lift bay #, Technical specialty (Heavy Mechanical, Electronic Diagnostic, Paint/Body), Diagnostic tool clearance. |
| **Medical Clinic** | `MedicalStaffView` | N° Ordre des Médecins / Dentistes, Medical specialty, CNAS ordonnance prescription authority, Digital cachet signature. |
| **Contractor / BTP** | `ContractorStaffView` | N° Carte CACOBATPH (chômage intempéries), Assigned chantier / lot BTP, SST & work-at-height safety certifications. |
| **Logistics** | `LogisticsStaffView` | Permis de conduire category (B, C1, C, EC), Assigned delivery vehicle matricule, Delivery wilayas/zones, Commission vs Salaried contract. |
| **Manufacturing** | `ManufacturingStaffView` | Assigned machine/workstation (CNC, Press, Assembly line), Décret 05-468 machine safety clearance, QC inspector clearance. |
| **Agriculture** | `AgricultureStaffView` | Assigned parcel concession, Milking parlor station (Herringbone slot), INPV phytosanitary handling license. |
| **Legal & Notary** | `LegalStaffView` | N° Inscription au Barreau / Chambre des Notaires, Sworn clerk minutes authorization, Escrow vault signing clearance. |
| **Real Estate** | `RealEstateStaffView` | N° Attestation collaborateur habilité (Décret 09-18), Exclusive sales mandate and lease signing authority. |
| **Trading & B2B** | `TradingStaffView` | Commercial sales territory, Assigned warehouse depot, Max commercial discount authorization ceiling. |
| **Venue Rentals** | `VenueStaffView` | Assigned venue hall, Event coordination badge, Technical stage / AV sound clearance. |
| **Freelance** | `FreelanceStaffView` | Subcontractor billing type (Hourly, Daily, Milestone Deliverable), NDA status, Specialized craft tag. |

### C. Trilingual Parity Dictionary (Sample Keys)

| Key | French (FR) | Arabic (AR - RTL) | English (EN) |
|---|---|---|---|
| `nav_staff` | Équipe | فريق العمل | Staff |
| `staff_headcount_active` | Collaborateurs Actifs | الموظفون النشطون | Active Headcount |
| `staff_attendance_rate` | Pointage du Jour | نسبة الحضور اليومي | Today's Attendance |
| `staff_monthly_payroll` | Masse Salariale Mensuelle | كتلة الأجور الشهرية | Monthly Payroll |
| `staff_pointage_scan` | Scanner Badge / Code PIN | مسح بطاقة أو رمز PIN | Scan Badge / PIN Code |
| `staff_btn_new` | Nouveau Collaborateur | إضافة موظف جديد | Add Staff Member |
| `staff_status_active` | En poste | في الخدمة | Active |
| `staff_status_leave` | En congé | في عطلة | On Leave |
| `staff_status_frozen` | Suspendu | موقوف مؤقتاً | Suspended |
| `staff_status_terminated` | Fin de contrat | نهاية العقد | Terminated |
| `staff_cacobatph_no` | N° Immatriculation CACOBATPH | رقم التسجيل في كاكوباتف | CACOBATPH Reg. Number |
| `staff_doctor_order_no` | N° Ordre des Médecins | رقم التسجيل في عمادة الأطباء | Medical Council Reg. No |
| `staff_driving_license` | Catégorie Permis | صنف رخصة السياقة | Driver's License Class |

---

## 5. Phased Implementation Steps

### Phase 1: Shared Staff Foundation Architecture (`src/components/common/staff/`)
1. Create `src/components/common/staff/useStaffFoundation.ts`:
   - Unified hook providing filtered staff by active branch, search queries, status filters, sorting, RFID/PIN pointage execution, and RBAC visibility checks.
2. Create `src/components/common/staff/StaffHeaderTray.tsx`:
   - Reusable `#F8F9FA` pod tray with `#1F1D1B` Dark Espresso anchor tile and 3-KPI pulse cards.
3. Create `src/components/common/staff/StaffActionToolbar.tsx`:
   - Rapid pointage modal trigger, kinetic `Seek` search bar, filter capsules, and terracotta `AtriumButton`.
4. Ensure `StaffModal.tsx` and `StaffInspectorDrawer.tsx` support dynamic category-specific slots.

### Phase 2: Category-Dedicated Staff Views
1. Implement dedicated views across the 15 categories under `src/components/screens/<category>/`:
   - `MembershipStaffView.tsx` (Gym & Fitness)
   - `AppointmentStaffView.tsx` (Salon & Spa)
   - `PosStaffView.tsx` (POS & Retail)
   - `EducationStaffView.tsx` (Education & Academy)
   - `AutoGarageStaffView.tsx` (Auto Garage)
   - `MedicalStaffView.tsx` (Medical Clinic)
   - `ContractorStaffView.tsx` (Construction / BTP)
   - `LogisticsStaffView.tsx` (Logistics & Delivery)
   - `ManufacturingStaffView.tsx` (Light Manufacturing)
   - `AgricultureStaffView.tsx` (Agriculture & Livestock)
   - `LegalStaffView.tsx` (Legal & Notary)
   - `RealEstateStaffView.tsx` (Real Estate)
   - `TradingStaffView.tsx` (Trading & Wholesale)
   - `VenueStaffView.tsx` (Venue Rentals)
   - `FreelanceStaffView.tsx` (Freelance & Solo)
2. Each view imports the shared foundation, configures domain-specific column definitions, injects specialized drawer metadata, and renders category-relevant KPI labels.

### Phase 3: Deduplication & Navigation Cleansing
1. **`Sidebar.tsx`**:
   - Remove the blanket dynamic injection block (lines 1794–1810) that was injecting duplicate `staff` items into `project_milestone`.
   - In `project_milestone`, ensure the RH role navigates to its native `pm_rh_talents`, and Direction/Superviseur can access team/talents without duplicate generic entries.
   - For all other categories, place a single, clean `staff` dock item labeled **"Équipe"** (FR) / **"Staff"** (EN) / **"فريق العمل"** (AR) right before "Settings".
2. **`App.tsx`**:
   - In `renderActiveScreen()`, route `activeScreen === 'staff'` to the matching dedicated category view.
   - For `isProjectMilestone`, route directly to `<ProjectRhView initialTab="talents" />`.
3. **`MembershipFinanceView.tsx`**:
   - Remove duplicated staff management logic, duplicate `addStaff` state, and duplicate employee tables.
   - Reclaim `MembershipFinanceView` strictly for membership sales revenue, subscription plan analytics, and cash closure history.
4. **Clean up**: Delete the deprecated `UniversalStaffView.tsx`.

### Phase 4: Trilingual Localization & Test Verification
1. Verify dictionary entries in `src/utils/i18n.ts` across French, Arabic (RTL), and English.
2. Run `compile_applet` and `lint_applet` to ensure zero compilation or type errors.
3. Run `npm test` to verify all 82 unit tests and RBAC authorization suites pass with 100% success.
