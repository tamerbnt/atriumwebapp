# Production-Ready Unified Staff & Workforce Management Engine

An exhaustive, production-grade architectural specification for unifying the foundational workforce management system across all 16 business categories in Atrium ERP & CRM. Built strictly on Atrium's existing design system (`UniversalDataCollection`, `AtriumButton`, `LabelInput`, `LabelSelect`, `Modal`, `ConfirmDialog`, `StatTile`, `Seek`), enforcing vertical-specific operational properties, granular Role-Based Access Control (RBAC) visibility and creation permissions, trilingual parity (French, Arabic RTL, English), robust edge-case guards, multi-factor credential authentication, and 5-state lifecycle management.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters govern the implementation plan and incorporate all user feedback, confirmed choices, and role-based access rules:

- **Unified Navigation Naming**: The screen is strictly and concisely titled **"Équipe"** in French, **"Staff"** in English, and **"فريق العمل"** in Arabic across all 16 business categories in the sidebar and top navigation breadcrumbs.
- **Granular RBAC Visibility & Creation Permissions**:
  - **Simple Dual-Role Categories** (*Membership & Gym, Appointment & Salon, POS & Retail, Education & Academy, Freelance & Solo*): **ONLY the `Owner`** can see the **"Équipe"** screen, access payroll/contract records, and create/manage staff members. Regular `Staff` are completely locked out of this screen in the sidebar and URL routing.
  - **Multi-Role Operational Categories** (*BTP Construction, Project & Agency, Auto Garage, Logistics & Delivery, Light Manufacturing, Medical Polyclinic, Legal & Notary, Agriculture & Farming, Trading & Wholesale, Real Estate*): Access is granted to the **`Owner` (Gérant / Direction / Associé)** **AND any role with team management authority** (*Conducteur de Travaux, Chef d'Atelier, Chef de Projet, Superviseur Terrain, Dispatcher Hub, Chef de Culture, Médecin Chef, Associé / Notaire*). For non-owner team leads, sensitive commercial compensation records (bank RIB, net monthly salary) are masked while attendance muster, operational assignments, and category KPIs remain accessible.
- **Category-Specific Operational Properties**: In addition to universal personal and contract fields, the creation modal dynamically presents vertical-tailored operational badges (e.g., *Ordre des Médecins registration, CACOBATPH clearance, Permis de Conduire category, Machine workstation assignment, Traite parlor station, Mandat carte pro*).
- **Strict Reuse of Existing UI System**: Zero new or foreign UI components. The system utilizes:
  - `UniversalDataCollection<StaffMember>` (standard List View and Grid View, 3-KPI elevated `#F8F9FA` pod tray, 390px slide-over inspector drawer, bulk operations, kebab menus).
  - `AtriumButton` in brand terracotta (`#C4785A`) with ambient glow and bevel highlight.
  - `LabelInput` and `LabelSelect` with kinetic floating notch labels for all modal inputs.
  - `#1F1D1B` Dark Espresso anchor card for today's active shift muster and payroll telemetry.
- **Complete Trilingual Parity (FR / AR / EN)**: Full dictionary keys and bidirectional RTL support (`dir="rtl"` with Cairo typography) for every role title, legal contract type, validation toast, and drawer metric.
- **Multi-Factor Login Channels**: Team members can authenticate into Atrium via:
  1. Work Email & Password.
  2. Phone Number & Password.
  3. 4-Digit Fast-Switch PIN Code (configured by owner for rapid shared-terminal kiosk switching).

---

### 1. Overview & Core Concept

- **What It Does**: Provides an omni-vertical workforce cockpit that guarantees every business category—from single-chair beauty salons and neighborhood gyms to high-throughput polyclinics, multi-site BTP contractors, industrial factories, and dairy farms—shares an identical, battle-tested human resources architecture while strictly respecting domain-specific permissions and properties.
- **Target Personas & Permissions**:
  - *Business Owner / Gérant*: Unrestricted master access. Onboards staff, configures legal contracts, sets salary and payment channels, assigns category roles, and executes status changes (Freeze, Vacation, Termination, Delete).
  - *Team Lead / Operations Manager* (*Chef de Chantier, Conducteur, Chef d'Atelier, Dispatcher, Chef de Culture*): Operational management access. Can view team muster, clock staff in/out, reassign operational bays/workstations, and track category productivity. Sensitive executive salary data is masked.
  - *Staff Operator* (*Caissier, Mécanicien, Ouvrier, Livreur, Infirmier*): Pointage & Shift access. Clocks in/out via RFID/QR scan or PIN, logs into shared terminals, and tracks personal performance goals. Cannot access the workforce management screen in simple dual-role categories.
- **Key Value**: Replaces inconsistent, fragmented staff implementations with a unified, high-reliability workspace that adapts its domain vocabulary, legal recruitment types, and performance formulas to each vertical automatically.

---

### 2. Role-Based Access Control (RBAC) & Visibility Matrix

| Business Category | Dual-Role vs Multi-Role | Can View "Équipe" Screen? | Can Create / Edit Staff? | Can View Salary / CCP Data? |
| :--- | :--- | :--- | :--- | :--- |
| **Membership & Gym** | Dual-Role (Owner / Staff) | **Owner only** | **Owner only** | Owner only |
| **Appointment & Salon** | Dual-Role (Owner / Staff) | **Owner only** | **Owner only** | Owner only |
| **POS & Retail** | Dual-Role (Owner / Staff) | **Owner only** | **Owner only** | Owner only |
| **Education Academy** | Dual-Role (Owner / Staff) | **Owner only** | **Owner only** | Owner only |
| **Freelance & Solo** | Dual-Role (Owner / Staff) | **Owner only** | **Owner only** | Owner only |
| **Construction / BTP** | Multi-Role (5 Roles) | Owner, Conducteur, Chef de Chantier | Owner, Conducteur de Travaux | Owner, Comptable Chantier |
| **Project & Agency** | Multi-Role (6 Roles) | Direction, Chef de Projet, Superviseur | Direction, Chef de Projet | Direction, Compta |
| **Auto Garage** | Multi-Role (5 Roles) | Gérant, Réceptionnaire, Chef d'Atelier | Gérant, Chef d'Atelier | Gérant, Caisse/Facturation |
| **Logistics & Delivery** | Multi-Role (4 Roles) | Gérant, Dispatcher, Agent Stop-Desk | Gérant, Dispatcher Hub | Gérant |
| **Light Manufacturing** | Multi-Role (5 Roles) | Gérant, Chef d'Atelier | Gérant, Chef d'Atelier | Gérant |
| **Medical Polyclinic** | Multi-Role | Directeur Clinique, Médecin Chef, Major | Directeur Clinique, Médecin Chef | Directeur Clinique |
| **Legal & Firm** | Multi-Role | Avocat Associé, Gérant, Clerc Principal | Avocat Associé, Gérant | Avocat Associé |
| **Real Estate** | Multi-Role | Gérant Agence, Directeur Commercial | Gérant Agence, Directeur Commercial | Gérant Agence |
| **Agriculture & Farming**| Multi-Role (4 Roles) | Gérant, Chef de Culture, Zootechnicien | Gérant, Chef de Culture | Gérant |
| **Trading & Wholesale** | Multi-Role | Gérant, Responsable Commercial | Gérant, Responsable Commercial | Gérant |
| **Venue & Rentals** | Multi-Role | Gérant, Régisseur Général | Gérant, Régisseur Général | Gérant |

---

### 3. Category-Specific Operational Properties in `StaffModal`

When creating or editing a staff member, in addition to basic identity and compensation fields, the modal dynamically renders dedicated category properties:

1. **Medical Polyclinic**:
   - `orderRegistrationNumber`: N° d'inscription à l'Ordre des Médecins / Dentistes / Pharmaciens.
   - `medicalSpecialty`: Spécialité médicale (Médecine Générale, Pédiatrie, Cardiologie, Chirurgie Dentaire, Soins Infirmiers).
   - `canPrescribe`: Habilitation officielle à prescrire des ordonnances et délivrer des certificats CNAS.
   - `stampDigitalSeal`: Signature / Cachet numérique officiel pour ordonnances A5.
2. **Construction / BTP**:
   - `cacobatphCardNumber`: N° de carte d'immatriculation CACOBATPH (chômage intempéries & congés BTP).
   - `assignedChantierId`: Chantier / Lot BTP principal d'affectation.
   - `safetyCertifications`: Habilitation travail en hauteur, sécurité échafaudage, SST.
3. **Logistics & Delivery**:
   - `drivingLicenseCategory`: Catégorie du permis de conduire (`B`, `C1`, `C`, `D`, `EC`).
   - `assignedVehiclePlate`: Matricule du véhicule utilitaire / scooter attribué.
   - `deliveryZoneWilayas`: Wilayas et zones de livraison couvertes.
4. **Light Manufacturing & Workshop**:
   - `assignedWorkstationId`: Poste de travail CNC / Presse / Découpe / Assemblage principal.
   - `machineSafetyClearance`: Certification habilitation machines dangereuses (Décret 05-468).
   - `qualityInspectorClearance`: Habilitation validation contrôle qualité (QC) et quarantaine lot.
5. **Agriculture & Farming**:
   - `assignedParcelId`: Parcelle / Concession agricole affectée.
   - `milkingParlorStation`: Poste de traite attribué en salle de traite (Herringbone parlor).
   - `phytosanitaryLicense`: Certificat d'aptitude à la manipulation des produits phytosanitaires (INPV).
6. **Auto Garage**:
   - `assignedBayId`: Pont élévateur / Baie mécanique d'intervention attribuée.
   - `technicalSpecialty`: Spécialité (Mécanique lourde, Diagnostic électronique, Tôlerie/Peinture, Climatisation).
7. **Real Estate**:
   - `carteProfessionnelleNumber`: N° d'attestation collaborateur habilité (Décret 09-18).
   - `canSignMandates`: Autorisation de signature des mandats de vente et baux de location.
8. **Legal & Notary**:
   - `barAssociationNumber`: N° d'inscription au Barreau / Chambre des Notaires.
   - `swornClerkClearance`: Déclaration clerc assermenté avec habilitation aux minutes d'actes.
9. **Retail & Trading POS**:
   - `assignedRegisterId`: N° Caisse comptoir / Terminal POS attribué.
   - `maxCashFloatLimit`: Plafond de fond de caisse autorisé en DZD.
10. **Salon & Fitness**:
    - `assignedChairOrStudio`: Fauteuil coiffure / Salle de cours attribuée.
    - `serviceCommissionRate`: Pourcentage de commission sur prestations et vente de produits.

---

### 4. Screen Layout & UX Flows

#### A. Screen Composition

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TopBar Breadcrumb: [Catégorie] / Équipe                                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ #F8F9FA Elevated Pod Tray: 3-Metric Workforce Pulse + #1F1D1B Dark Espresso Anchor     │
│ ┌──────────────────────────┐  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐ │
│ │ Dark Espresso Anchor     │  │ Effectif Actif  │ │ Pointage du Jour│ │ Masse Salar. │ │
│ │ 12 Collaborateurs        │  │ 10 En poste     │ │ 83% Présents    │ │ 480 000 DZD  │ │
│ │ 2 En congé · 0 Gelé      │  │ CDI: 8 · CDD: 4 │ │ Retards: 1      │ │ Proch. le 28 │ │
│ └──────────────────────────┘  └─────────────────┘ └─────────────────┘ └──────────────┘ │
│                                                                                        │
│ Workforce Control Bar:                                                                 │
│ ┌──────────────────────────────────────────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │ [⚡ Scanner RFID / QR / NFC ou Code Manuel...]   │ │ [🔍 Seek...] │ │ [+ Nouveau]  ││
│ └──────────────────────────────────────────────────┘ └──────────────┘ └──────────────┘│
│                                                                                        │
│ UniversalDataCollection (List View & Grid View Switcher)                               │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [Photo/Avatar] Nom & Prénom · Rôle Métier · Statut · Tél · Pointage · KPI · [⋮ Actions]│
│ │ 🟢 Amine B. · Chef d'Atelier (BTP) · Actif · 0550123456 · Présent 08:02 · Score 96% │
│ │ 🟡 Sarah K. · Médecin Généraliste · En Congé · 0661234567 · Absent · Score 94%     │
│ │ 🔴 Karim M. · Chauffeur Livreur · Gelé · 0770987654 · Bloqué · Score 78%           │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### B. Creation & Editing Wizard (`StaffModal.tsx`)

The modal is built using Atrium's `Modal`, `LabelInput`, and `LabelSelect` components with progressive two-tier disclosure:

1. **Tier 1: Essential Identity & Operational Role** (Always Visible):
   - **Full Name**: `LabelInput` with user prefix icon.
   - **Email & Password**: Auto-generates secure initial password with quick copy-to-clipboard.
   - **Phone Number**: Algerian mobile format validation (`+213 (0) 5/6/7...`).
   - **Age & Gender**: Numeric age bounds (16 to 75) + Segmented Gender toggle (`Homme` / `Femme`).
   - **Physical Address**: City, Wilaya, and street address.
   - **Category-Adaptive Role**: Kinetic dropdown pre-populated with exact vertical roles.
   - **Badge Token (RFID / NFC / QR)**: Interactive input with a "⚡ Générer un token unique" button or direct USB card reader capture.
2. **Tier 2: Category-Specific Operational Badges** (Dynamically Adapts to Active Category):
   - Medical fields for clinic, CACOBATPH for BTP, Driving license for logistics, etc.
3. **Tier 3: Collapsible Regulatory, Medical & Compensation Details** (Accordion Expand, Owner-Only):
   - **Medical Emergency Dossier**: Emergency contact full name and phone; Blood group selector (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`); Known allergies and chronic conditions notes.
   - **Compensation & Payroll**: Monthly gross/net salary in Algerian Dinars (`DZD`); Statutory payout day of the month (slider/input from 1 to 31); Payment method toggle (`Espèces / Cash`, `Virement Postal CCP / BaridiMob`, `Virement Bancaire RIB`).
   - **Algerian CCP Details**: CCP Account Number (up to 10 digits) + Clé CCP (2 digits), strictly validated using Atrium's official `algerianPtt.ts` checksum algorithm.
   - **Legal Recruitment Contract**: `CDI` (Contrat à Durée Indéterminée), `CDD` (Contrat à Durée Déterminée), `Stage` (Convention de stage), `Vacataire` (Paiement à l'acte / vacation), `Prestataire / Sous-traitant` (Auto-entrepreneur / Facture B2B).
   - **Authentication Permissions**: 4-digit Quick Login PIN code (numerical validation `^[0-9]{4}$`); Toggle for Email login, Phone login, and PIN terminal switch.

#### C. Slide-Over 360° Inspector Drawer (`StaffInspectorDrawer.tsx`)

Clicking any staff member row slides out the standard 390px drawer:
- **Header**: High-resolution avatar, online presence dot, role badge, quick WhatsApp call and email actions.
- **Category Performance Radar**: Shows the staff member's core vertical metric with monthly visual trend bar and percentage against branch quota.
- **Attendance History (30 Days)**: Visual timeline of punch-ins, late arrivals, approved vacations, and muster logs.
- **Category Operational Assignment**: Current bay, machine, vehicle, parcel, or clinic room.
- **Regulatory & Administrative Card** (Visible if Owner or HR): Contract type, hire date, medical emergency dossier, and CCP account.
- **One-Click Lifecycle Action Buttons**:
  - `Geler le collaborateur` (Lockout account).
  - `Déclarer un congé` (Set vacation dates).
  - `Arrêter définitivement` (End contract).
  - `Générer reçu de paie / Bordereau CCP SFP 01`.

---

### 5. Production Edge Cases & Safeguards

| # | Edge Case Category | Specific Scenario | Production Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **1** | **Unauthorized Staff Direct Navigation** | In a dual-role category (e.g. Gym), a staff member manually types `/staff` or triggers command palette to visit `Équipe`. | RBAC router guard intercepts the transition, detects `role !== 'Owner'`, shows a polite access denied notification, and redirects to their permitted operational dashboard. |
| **2** | **Duplicate Credentials Collision** | User enters an email, phone number, or PIN code already assigned to another staff member in the same account/tenant. | Pre-commit validation check in store. If duplicate detected, highlights offending field with red notch error (`"Cette adresse email / ce code PIN est déjà attribué à un autre collaborateur"`). |
| **3** | **Sole Owner Lockout Guard** | The facility's only Owner or Agency Director is demoted to Staff, frozen, or deleted. | System strictly rejects the operation with an explicit error dialog: `"Impossible de modifier ou supprimer le seul Propriétaire actif de l'établissement. Désignez d'abord un autre administrateur."` |
| **4** | **Active Operations Lockout** | Owner attempts to delete or freeze a cashier with an open drawer, a doctor with patients in consultation, or a driver on an active delivery route. | Soft-check detects ongoing active sessions. If open records exist, deletion is blocked and user is prompted to close the cash drawer or transfer active tickets first. |
| **5** | **CCP Clé & Account Validation** | User enters an invalid Algerian CCP account number or mismatching 2-digit key. | Runs official algorithm from `src/utils/algerianPtt.ts`: `validateCcpAccount(ccp, key)`. Prevents financial settlement failures on SFP 01 postal slips before they occur. |
| **6** | **Calendar Month Payout Bounds** | Salary payment day set to 31st, but current month is February (28/29 days) or April (30 days). | Payroll calculation engine auto-clamps payout date to `Math.min(paymentDay, lastDayOfMonth(year, month))` so scheduled reminders and slips never skip months. |
| **7** | **Rapid RFID Scanner Debouncing** | Barcode / RFID scanner fires duplicate keystroke events within milliseconds. | Debounce filter (300ms window) on the scanner input prevents duplicate clock-in/out records. Successful punch plays a crisp positive audio-visual chime. |
| **8** | **Frozen Staff Terminal Interception** | A staff member whose account was marked `frozen` or `terminated` tries to clock in or log in via PIN/Email. | Fast-switch and Login modals immediately reject authentication with: `"Compte suspendu ou clôturé. Veuillez contacter la direction de l'établissement."` |
| **9** | **Language & RTL Bidirectional Layout** | User switches interface from French to Arabic RTL (`dir="rtl"`). | Every element (avatar, table columns, drawer slide-out, modal input notches, and action buttons) flips direction cleanly with Arabic Cairo font without layout clipping. |
| **10** | **Non-Owner Salary Redaction** | A Team Lead (e.g. Chef d'Atelier or Conducteur de Travaux) views the staff drawer. | Salary, payment method, CCP accounts, and financial contracts are automatically masked (`•••••• DZD`), preserving employee privacy. |

---

### 6. Technical Architecture & Data Strategy

#### System & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TopBar Navigation                               │
│        Breadcrumb: [Catégorie] / Équipe   │  Quick Search (Seek)       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│               UniversalStaffView (Container Shell)                     │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  Dark Espresso Pod    │  │  3-Metric Workforce KPI Pod Tray     │   │
│  │  Total Staff: 12      │  │  Clocked In: 10/12 (83%)             │   │
│  │  Active Rota: 8       │  │  Monthly Mass: 480 000 DZD           │   │
│  │  On Vacation: 2       │  │  Avg Performance Score: 94%          │   │
│  └───────────────────────┘  └──────────────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Workforce Action Toolbar                                        │  │
│  │  [RFID / QR Scanner Bar] [Search Staff] [Filter Role] [+ Staff]  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  UniversalDataCollection (List & Grid Modes)                     │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Staff Row: Avatar | Name | Role | Status | KPI | Actions  │  │  │
│  │  │ [🟢 Présent] Amine B. · Chef d'Atelier · Rendement: 96%    │  │  │
│  │  │ Action Arc: [Pointage] [Freeze] [Vacation] [Edit] [Delete]│  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
         │                                               │
         ▼                                               ▼
┌────────────────────────────────┐            ┌──────────────────────────┐
│  StaffModal (Wizard)           │            │  StaffInspectorDrawer    │
│  - Identity & Role Matrix      │            │  - Contact & WhatsApp    │
│  - Category-Specific Badges    │            │  - Category Performance  │
│  - RFID / NFC / QR Generator   │            │  - Attendance Log 30d    │
│  - Advanced Medical & Legal    │            │  - Operational Station   │
│  - Salary & CCP SFP 01 Details │            │  - Payroll Slip Archive  │
└────────────────────────────────┘            └──────────────────────────┘
```

#### TypeScript Data Model (`src/types/index.ts`)

```typescript
export type StaffLifecycleStatus = 'active' | 'frozen' | 'vacation' | 'terminated';

export type RecruitmentLegalType = 'cdi' | 'cdd' | 'stage' | 'vacataire' | 'prestataire';

export type StaffPaymentMethod = 'cash' | 'ccp' | 'bank_transfer';

export interface StaffPerformanceMetric {
  kpiLabel: string;
  kpiValue: string | number;
  kpiUnit: string;
  targetValue: number;
  scorePercentage: number;
  history30Days: number[];
}

export interface StaffCategoryProperties {
  // Medical
  orderRegistrationNumber?: string;
  medicalSpecialty?: string;
  canPrescribe?: boolean;
  // BTP / Construction
  cacobatphCardNumber?: string;
  assignedChantierId?: string;
  safetyCertifications?: string[];
  // Logistics
  drivingLicenseCategory?: string;
  assignedVehiclePlate?: string;
  deliveryZoneWilayas?: number[];
  // Manufacturing
  assignedWorkstationId?: string;
  machineSafetyClearance?: boolean;
  // Agriculture
  assignedParcelId?: string;
  milkingParlorStation?: string;
  // Auto Garage
  assignedBayId?: string;
  technicalSpecialty?: string;
  // Real Estate
  carteProfessionnelleNumber?: string;
  canSignMandates?: boolean;
  // Legal
  barAssociationNumber?: string;
  swornClerkClearance?: boolean;
  // POS & Retail
  assignedRegisterId?: string;
  maxCashFloatLimit?: number;
  // Salon & Gym
  assignedChairOrStudio?: string;
  serviceCommissionRate?: number;
}

export interface StaffMember {
  // Quadruple Traceability
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId?: string;

  // Basic Identity
  fullName: string;
  email: string;
  phoneNumber: string;
  age?: number;
  address?: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;

  // Role & Permissions
  role: string;
  roleCategory: BusinessCategory;
  roleRank: number; // 8=Owner, 4=Manager/Doctor/Director, 2=Supervisor/Cashier, 1=Staff/Operator
  allowedModules: string[];

  // Authentication & Security
  pinCode?: string; // 4-digit fast-switch PIN
  cardId?: string; // RFID, NFC, or QR token
  canLoginEmail: boolean;
  canLoginPhone: boolean;
  canLoginPin: boolean;

  // Lifecycle & Status
  status: StaffLifecycleStatus;
  isActive: boolean;
  isClockedInToday: boolean;
  lastClockInTime?: string;
  lastClockOutTime?: string;
  hireDate: string;
  terminationDate?: string;

  // Category-Specific Operational Properties
  categoryProperties?: StaffCategoryProperties;

  // Advanced: Medical & Emergency
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  medicalNotes?: string;

  // Advanced: Compensation & Compliance (Owner / HR Restricted)
  salary: number; // in DZD
  paymentDay: number; // 1-31
  paymentMethod: StaffPaymentMethod;
  ccpNumber?: string;
  ccpKey?: string;
  bankRib?: string;
  recruitmentType: RecruitmentLegalType;

  // Dynamic Performance
  performance?: StaffPerformanceMetric;
}
```

---

### 7. Trilingual Parity Dictionary (FR / AR RTL / EN)

| Key Identifier | Français (FR) | العربية (AR) | English (EN) |
| :--- | :--- | :--- | :--- |
| `nav_staff_team` | Équipe | فريق العمل | Staff |
| `btn_add_staff` | Nouveau Collaborateur | إضافة موظف جديد | Add Staff Member |
| `scanner_placeholder` | Scanner badge RFID / QR / NFC... | مسح بطاقة RFID أو رمز QR... | Scan RFID / QR / NFC badge... |
| `status_active` | Actif | نشط | Active |
| `status_frozen` | Gelé | معلّق | Frozen |
| `status_vacation` | En congé | في عطلة | On Vacation |
| `status_terminated` | Fin de contrat | نهاية الخدمة | Terminated |
| `btn_clock_in` | Pointer l'arrivée | تسجيل الحضور | Clock In |
| `btn_clock_out` | Pointer le départ | تسجيل الانصراف | Clock Out |
| `err_rbac_staff_denied`| Accès réservé à la direction | الدخول مقتصر على إدارة المؤسسة | Access restricted to management |
| `err_duplicate_pin` | Ce code PIN est déjà attribué | رمز PIN هذا مستخدم بالفعل | This PIN is already assigned |
| `err_duplicate_email` | Cette adresse email existe déjà | البريد الإلكتروني مسجل مسبقاً | Email is already registered |
| `err_sole_owner` | Impossible d'altérer le seul Propriétaire | لا يمكن تعطيل المالك الوحيد | Cannot alter the sole active Owner |
| `contract_cdi` | Contrat CDI (Indéterminé) | عقد عمل دائم (CDI) | Permanent Contract (CDI) |
| `contract_cdd` | Contrat CDD (Déterminé) | عقد محدد المدة (CDD) | Fixed-Term Contract (CDD) |
| `contract_intern` | Convention de Stage | اتفاقية تربص وتدريب | Internship Agreement |
| `contract_contractor`| Prestataire / Sous-traitant | متعاقد خارجي / مقاول ذاتي | Contractor / Freelancer |
| `tab_general` | Identité & Rôle | الهوية والدور | Identity & Role |
| `tab_category_props` | Spécificités Métier | الخصائص المهنية | Sector Properties |
| `tab_advanced` | Médical, Salaire & CCP | الملف الطبي، الراتب والبريد | Medical, Salary & CCP |
| `label_salary_dzd` | Salaire Mensuel (DZD) | الراتب الشهري (د.ج) | Monthly Salary (DZD) |
| `label_ccp_account` | N° Compte CCP & Clé | رقم حساب CCP والمفتاح | CCP Account & Key |
| `confirm_delete_staff`| Êtes-vous sûr de vouloir supprimer ce collaborateur ? | هل أنت متأكد من حذف هذا الموظف نهائياً؟ | Are you sure you want to delete this staff member? |

---

### 8. Implementation Slices & Execution Order

1. **Slice 1: Types & Central Store Hardening**:
   - Expand `StaffMember` and `StaffCategoryProperties` in `src/types/index.ts`.
   - Implement store actions in `src/services/store.ts`:
     - `createStaffMember(staff: Omit<StaffMember, 'id'>)`
     - `updateStaffMember(id: string, updates: Partial<StaffMember>)`
     - `freezeStaffMember(id: string)`
     - `vacationStaffMember(id: string, vacationUntil?: string)`
     - `terminateStaffMember(id: string)`
     - `deleteStaffMember(id: string)` (with sole-owner & active session safety guards)
     - `punchStaffAttendance(idOrCardToken: string)` (instant clock in/out with RFID debounce)
   - Seed rich Algerian demo staff records across all 16 business categories with real operational properties.
2. **Slice 2: Modal & Form System with Dynamic Category Properties**:
   - Create `src/components/modals/StaffModal.tsx` utilizing existing `LabelInput`, `LabelSelect`, and `Modal`.
   - Add Tier 2 dynamic sector badges (Medical specialty, CACOBATPH, Driver permit, Workstation).
   - Add Tier 3 progressive disclosure accordion for Medical, Salary/CCP, and Credentials.
   - Wire CCP check via `src/utils/algerianPtt.ts`.
3. **Slice 3: Drawer & Category Performance Telemetry**:
   - Create `src/components/common/StaffInspectorDrawer.tsx` with contact card, 30-day attendance trail, operational station badge, and category-calibrated performance radar.
   - Implement non-owner salary redaction filter.
4. **Slice 4: Universal Screen Component**:
   - Create `src/components/common/UniversalStaffView.tsx` with:
     - 3-KPI elevated `#F8F9FA` tray + `#1F1D1B` Dark Espresso anchor.
     - Top RFID / QR scanner action strip.
     - `UniversalDataCollection` table/grid views with hover action arcs.
5. **Slice 5: Navigation, RBAC Routing & Multi-Category Wiring**:
   - Update `src/components/layout/Sidebar.tsx` to mount the unified **"Équipe"** / **"Staff"** / **"فريق العمل"** view across all 16 categories, strictly checking category RBAC (Owner-only for dual-role categories; Owner + Team Lead for multi-role categories).
   - Update `src/App.tsx` router to render the staff workspace for each category.
   - Update `FastSwitchModal.tsx` and `LoginScreen.tsx` to support the staff PIN and phone authentication channels.
6. **Slice 6: Verification & Test Coverage**:
   - Add test suite covering:
     - Dual-role category staff lockout.
     - Multi-role category team lead access with salary redaction.
     - Duplicate email/PIN collision rejection.
     - Sole Owner deletion block.
     - CCP key validation via `algerianPtt.ts`.
     - Leap-year payout date clamping.
     - 5-state lifecycle transitions.
   - Run `lint_applet`, `compile_applet`, and verify zero build regressions.
