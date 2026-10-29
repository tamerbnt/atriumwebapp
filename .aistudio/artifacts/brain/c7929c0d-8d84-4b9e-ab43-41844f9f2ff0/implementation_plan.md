# Universal Polyclinic & Healthcare OS (Category 9) — Master Architecture Plan (Revision 4)

## Executive Summary
This master plan specifies a universal, 100% production-ready clinical architecture for Atrium's **Medical Clinic & Polyclinic category (Category 9)**. Engineered to serve any medical institution—including **polyclinics, multidisciplinary medical centers, group practices, specialized outpatient clinics, and private day centers**—the platform eliminates single-specialty biases while outperforming global competitors like **Doctolib Pro, AthenaHealth, and Medesk**.

It natively integrates universal clinical workflows, multi-practitioner coordination, the **Doctor Ordonnance Personalization Studio**, and the **Algerian Social Security framework (CNAS, CASNOS, Carte Chifa, DZD)**. Every feature is specified down to its underlying business logic, state machines, and fail-safe edge cases.

Visual execution strictly follows Atrium’s existing design system: **elevated `#F8F9FA` pod trays**, **Dark Espresso `#1F1D1B` summary anchor**, **`AtriumButton` in brand terracotta (`#C4785A`)**, **`Seek` expanding search lens**, **`UniversalDataCollection` dual List/Grid architecture with 390px side inspector drawer**, and **kinetic notched `LabelSelect` & `LabelInput` controls**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The platform is built around universal clinical institutions, removing niche-specific dental charting in favor of deep multi-specialty medical governance.

- **Universal Institutional Scope**: Designed for all medical disciplines (Médecine Générale, Médecine Interne, Cardiologie, Pédiatrie, Pneumologie, Gynécologie, Neurologie, Gastro-entérologie, Radiologie). Dental-specific odontogram charting is removed to maintain a unified, institution-wide clinical standard.
- **Doctor Ordonnance Personalization Studio**: Custom physician letterheads, paper format toggle (**A5 standard half-sheet vs A4 full-sheet**), **Pre-printed Paper Mode** (suppresses headers/footers for physical stationery), digital cachet/stamp, and SHA-256 verification QR code.
- **Tier 1 (Core Bedrock)**: Patient demographic directory, sequential walk-in queue, SOAP consultation logging, multi-line medication prescribing, and direct consultation fee collection.
- **Tier 2 (Most Wanted & Daily Needed)**: Multi-practitioner polyclinic roster & cabinet allocation, interactive time-slot appointment calendar, 360° EHR patient drawer with longitudinal vitals history, allergy & contraindication warnings, printable official Algerian ordonnance layout with QR code, and Algerian Chifa/CNAS/CASNOS social security calculation with ticket modérateur.
- **Tier 3 (Advanced & Premium Polyclinic Advantage)**: Live fullscreen Waiting Room TV monitor mode with audio chime & cabinet routing, diagnostic laboratory & radiology imaging vault with abnormal biomarker alerts, legal medical certificate generator (Arrêt de travail conforme, aptitude sportive, ITT), doctor commission split settlements, and clinic consumable supply auto-depletion.

---

## 1. Feature Specifications: Logic & Edge Case Matrix

### 1. Doctor Ordonnance Personalization Studio
- **Core Business Logic**:
  - Each physician maintains an independent configuration profile stored in local state and synchronized with persistent storage.
  - Controls: Doctor Full Name, Medical Specialty (e.g., *Cardiologue & Maladies Vasculaires*), Academic Titles (*Ancien Interne des Hôpitaux*), Ordre des Médecins registration number (*N° d'Inscription*), cabinet phone, emergency mobile, and clinic address.
  - **Format Engine**: Instant switch between **Format A5** ($148 \times 210\,\text{mm}$ — standard Algerian medical ordonnance) and **Format A4** ($210 \times 297\,\text{mm}$).
  - **Dual-Print Engine**:
    - *Mode Digital Complet*: Prints the full digital letterhead, logo, borders, doctor credentials, medication table, and footer.
    - *Mode Papier Pré-imprimé*: Uses explicit CSS print margins (`@media print { @page { margin-top: 55mm; margin-bottom: 25mm; } }`) to suppress the digital header, logo, and footer, printing **only** the patient name, age, date, and medication posology lines aligned with physical clinic stationery.
  - **Visual Customization**: 5 clinic accent colors (Clinical Emerald `#0D9488`, Navy `#1E3A8A`, Burgundy `#831843`, Obsidian `#18181B`, Terracotta `#C4785A`), background caduceus watermark toggle (4% opacity), and custom consultation hours in footer.
- **Edge Cases & Failure Handling**:
  - *Multi-Page Overflow*: When a prescription exceeds 6 medications on A5 paper, the print engine automatically paginates into "Page 1/2" and "Page 2/2", repeating the patient identity kicker while suppressing the footer on page 1.
  - *Missing Doctor Credentials*: Form validation prevents activation if doctor name or Ordre number is blank, displaying a clear contextual validation alert.
  - *No Custom Config Present*: Gracefully falls back to clinic default letterhead without crashing.

---

### 2. Multi-Practitioner Polyclinic & Cabinet Routing
- **Core Business Logic**:
  - Universal practitioners assigned across medical departments: Médecine Générale, Cardiologie, Pédiatrie, Gynécologie, Neurologie, Gastro-entérologie, Radiologie.
  - Each doctor is assigned a physical room (*Cabinet 1, Cabinet 2, Salle de Soins*), an Ordre license, contact info, and an honorarium split percentage (e.g., 70% Doctor / 30% Clinic).
  - Global practitioner filter in TopBar and views allows viewing polyclinic aggregated activity or drilling into an individual practitioner’s queue and schedule.
- **Edge Cases & Failure Handling**:
  - *Doctor Reassignment Mid-Shift*: Reassigning a doctor to a different cabinet updates the live queue and waiting room TV instantly without breaking open consultations.
  - *Unassigned Walk-In Patient*: Reception can triage a patient to "Next Available Generalist" (`Médecine Générale - Premier Disponible`), which auto-dispatches based on lowest queue count.

---

### 3. Multi-Doctor Time-Slot Agenda & Conflict-Free Booking
- **Core Business Logic**:
  - Time-grid calendar (08:00 to 18:00) with selectable intervals: **15 min**, **30 min**, and **45 min**.
  - Status pipeline: `Booked` (Planifié) ➔ `Arrived` (Arrivé / En attente) ➔ `InRoom` (En consultation) ➔ `Completed` (Terminé) ➔ `Cancelled` / `NoShow` (Absent).
  - Slot Conflict Engine: Blocks scheduling if the target practitioner already has an active or overlapping appointment in the selected time window.
- **Edge Cases & Failure Handling**:
  - *Double-Booking Emergency Bypass*: Reception can check an explicit *"Sur-réservation d'urgence"* checkbox with mandatory reason note to allow intentional overlapping slots for emergency triage.
  - *Late Arrival / Shift Overrun*: If a consultation runs long, appointments are highlighted with a gentle amber tag `Retard estimé: 15 min` based on queue drift.

---

### 4. Fullscreen Waiting Room TV Display Mode
- **Core Business Logic**:
  - Dedicated zero-sidebar, high-contrast display designed for waiting room wall-mounted screens.
  - Shows current active ticket call: `TICKET A-104 ➔ CABINET 2 (Dr. Benali - Cardiologie)`.
  - Next 4 upcoming tickets in queue with patient initials and assigned practitioner.
  - **Zero-Dependency Acoustic Chime**: Uses the browser's native **Web Audio API** (`AudioContext`) to synthesize a crisp two-tone medical chime ($587.33\,\text{Hz}$ D5 $\rightarrow$ $880\,\text{Hz}$ A5) with an exponential decay envelope. Requires **zero external MP3/audio files**, guaranteeing 100% offline reliability.
  - Running clinic announcements ticker: hygiene guidance, vaccination campaigns, and emergency numbers.
- **Edge Cases & Failure Handling**:
  - *Browser Autoplay Restrictions*: If user interaction is required before audio can play, displays an elegant top banner: *"Cliquer pour activer le carillon sonore de la salle d'attente"*, which initializes the audio context seamlessly.
  - *Rapid Successive Calls*: Audio queuing ensures tones do not overlap or glitch if multiple doctors call patients within seconds of each other.
  - *Emergency Alarm*: Flash banner `URGENCE MÉDICALE EN COURS` pauses regular ticket calling to alert waiting patients.

---

### 5. Clinical EHR 360° with Slide-Over Drawer (`UniversalDataCollection`)
- **Core Business Logic**:
  - Standardized `UniversalDataCollection` table/grid with instant search lens (`Seek`), filtering by Blood Group, ALD status, and gender.
  - 390px slide-over inspector drawer with 4 universal clinical tabs:
    1. *Historique Clinique*: Chronological visit history with diagnostic notes and attending doctor.
    2. *Constantes & Biométrie*: Interactive SVG trend curves for Systolic & Diastolic Blood Pressure (with shaded normal range 120/80 mmHg band) and Glycemia over time. Automated BMI calculation ($\text{Weight} / \text{Height}^2$) with categorized risk (Sous-poids, Normal, Surpoids, Obésité). Oxygen Saturation ($SpO_2$) and Heart Rate tracking.
    3. *Laboratoire & Imagerie*: Attached biological reports and radiology scans with abnormal flag highlights.
    4. *Documents Émis*: Issued ordonnances, certificates, and invoices with 1-click reprint.
- **Edge Cases & Failure Handling**:
  - *Inverted Blood Pressure Input*: Validation alerts if systolic pressure is entered lower than diastolic pressure ($P_{\text{sys}} \le P_{\text{dia}}$).
  - *Zero Patient History*: Displays clean clinical empty state: *"Aucune consultation antérieure. Cliquer sur Nouvelle Consultation pour initialiser le dossier médical"*.

---

### 6. Allergy Safety & Drug Contraindication Engine
- **Core Business Logic**:
  - Cross-references prescribed drug brand names and DCIs against the patient's recorded allergies in real time.
  - Pre-mapped medical safety cross-index:
    - *Pénicilline / Bêta-lactamines* $\longleftrightarrow$ Amoxicilline, Augmentin, Clamoxyl, Ampicilline, Céphalosporines.
    - *Aspirine / AINS* $\longleftrightarrow$ Aspégic, Kardégic, Ibuprofène, Kétoprofène, Voltarène, Diclofénac.
    - *Sulfamides* $\longleftrightarrow$ Bactrim, Cotrimoxazole, Sulfaméthoxazole.
  - Displays a high-visibility crimson warning card in the prescription composer if a conflict is detected.
- **Edge Cases & Failure Handling**:
  - *Physician Justified Override*: The doctor can override the warning by checking *"Bénéfice thérapeutique supérieur / Allergie douteuse"* and typing a mandatory clinical justification note.
  - *No Known Allergies*: Patient profile defaults to `Aucune allergie connue (NKA)`, prompting for confirmation on first clinical intake.

---

### 7. Diagnostic Lab & Radiology Imaging Vault
- **Core Business Logic**:
  - Structured biological panel input covering:
    - *Hématologie (NFS)*: Globules Rouges, Hémoglobine, Plaquettes, Leucocytes.
    - *Biochimie*: Glycémie à jeun, Urée, Créatinine (avec clairance estimée), Bilan Lipidique (Cholestérol total, HDL, LDL, Triglycérides).
    - *Inflammatoire*: CRP (Protéine C-Réactive).
  - Reference range engine automatically flags values as **Normal (Green)**, **Élevé (Red)**, or **Bas (Blue)** based on standard physiological intervals.
  - Imaging records (Radiographie, Échographie, Scanner TDM) with clinical report text, diagnostic conclusion, and simulated image viewer with zoom.
- **Edge Cases & Failure Handling**:
  - *Qualitative Lab Results*: Gracefully handles text and non-numeric assays (e.g. Serology: "Négatif" / "Positif", Groupage sanguin: "O Rhésus Positif").
  - *Extreme Panic Values*: Values exceeding critical physiological limits (e.g. Glycemia $> 4.0\,\text{g/L}$ or Hemoglobin $< 7.0\,\text{g/dL}$) trigger a prominent clinical alert badge `VALEUR CRITIQUE`.

---

### 8. Official Legal Medical Certificates Engine
- **Core Business Logic**:
  - Formatted legal certificates complying with Algerian labor and public health regulations:
    1. *Certificat d'Arrêt de Travail (CNAS)*: Formulates legal work leave with start date, end date, automatically calculated duration in calendar days, and explicit resumption date (*Date de reprise effective*).
    2. *Certificat d'Aptitude Physique & Bonne Santé*: For sporting activities, school registration, and employment clearance.
    3. *Certificat Médical Descriptif Initial*: Medico-legal certificate describing traumatic injuries with formal calculation of Incapacité Totale de Travail (**ITT en jours**).
    4. *Lettre d'Orientation Confrère*: Formal medical referral letter detailing patient history, exam findings, and specialist question.
  - Generated documents feature an anti-falsification cryptographic SHA-256 hash and scannable verification QR code.
- **Edge Cases & Failure Handling**:
  - *Date Validation*: Blocks invalid dates (e.g., end date preceding start date). Warns if sick leave exceeds 30 consecutive days (requiring social security medical commission review).
  - *Reprise Date Calculation*: If an employee is on sick leave through Thursday, resumption automatically handles the Sunday work week in Algeria.

---

### 9. Algerian Social Security (CNAS / CASNOS / Chifa) & Tiers-Payant
- **Core Business Logic**:
  - Chifa card identification: 10 or 12 digit Social Security Number + 2-digit control key.
  - Tiers-Payant split calculation:
    - **Régime Général (80% Prise en Charge)**: CNAS pays 80% of the convention fee; Patient pays 20% copay (*Ticket Modérateur*).
    - **Régime ALD / Chronique (100% Exonération)**: Patient pays 0 DZD copay; 100% of the convention fee is claimed from CNAS.
  - Official Algerian nomenclature (NGAP):
    - Code `C`: Consultation Omnipraticien (Generalist)
    - Code `CS`: Consultation Spécialiste
    - Code `K`: Acte Technique / Petite Chirurgie
    - Code `KE`: Échographie / Imagerie
  - **Bordereau de Télétransmission Chifa**: Monthly consolidated statement listing all insured patient acts, matricules, cotations, and total amount due from CNAS agency.
- **Edge Cases & Failure Handling**:
  - *Uninsured / Private Pay Patients*: Single toggle for non-insured patients sets Chifa share to 0 DZD and routes 100% of the fee to patient payment without generating unnecessary CNAS claim slips.
  - *Rejected Chifa Claim*: Administrative status tracking (`Soumis`, `Validé`, `Rejeté`) with resubmission reason tracking.

---

### 10. Practitioner Commission Splits & Secretary Daily Cash Close
- **Core Business Logic**:
  - Configurable split percentage per doctor (e.g. 70% Practitioner / 30% Clinic).
  - Automatically calculates net physician remuneration across consultations, medical acts, and ultrasound/ECG diagnostic procedures.
  - **Feuille de Caisse Journalière (Reception Daily Cash Close)**:
    - Reconciliation of cash payments, electronic payments (BaridiMob / Carte Dahabia), and deferred Chifa claim slips.
    - End-of-shift declaration: Input actual cash counted in drawer vs. expected calculated cash, highlighting any discrepancy (*Écart de caisse*).
- **Edge Cases & Failure Handling**:
  - *Refunds & Annulled Consultations*: When a consultation is cancelled or refunded, the practitioner commission and clinic revenue adjust symmetrically with an audit log trail.
  - *Consumables Deduction*: Option to subtract physical consumable costs from gross act revenue before applying doctor split.

---

### 11. Clinic Consumables Auto-Depletion
- **Core Business Logic**:
  - Stock tracking of medical supplies: sterile gloves, disposable syringes (2.5ml, 5ml), suture threads, antiseptics, ECG electrodes, bandages, ultrasound gel.
  - Medical acts link to required consumables (e.g., *Infiltration articulaire* automatically deducts 1 syringe, 1 sterile glove pair, 1 vial, 2 alcohol wipes).
- **Edge Cases & Failure Handling**:
  - *Stock Depletion*: Warns the physician/nurse when critical supplies reach minimum reorder threshold, without hard-blocking patient care.

---

## 2. Competitive Superiority Matrix

| Feature Dimension | Doctolib Pro | AthenaHealth | Medesk | Atrium Medical OS (Cat 9) |
|---|:---:|:---:|:---:|:---:|
| **Multi-Doctor Polyclinic Scheduling** | Full (Web) | Full (Web) | Full | **Full with Cabinet Allocation & Triage** |
| **Ordonnance Personalization Studio** | Fixed Template | Limited | Medium | **Full A4/A5, Digital Stamp, Pre-printed Paper Mode** |
| **Algerian CNAS / Chifa / CASNOS** | ❌ None | ❌ None | ❌ None | **Native (80%/100% ALD, Bordereau, NGAP)** |
| **Allergy & Drug Safety Warnings** | VIDAL (Paid) | Epocrates | Basic | **Built-in Real-time Allergy Cross-checker** |
| **Waiting Room TV Monitor Display** | ❌ None | ❌ None | Basic | **Dedicated Zero-Nav Kiosk with Chime & Routing** |
| **Diagnostic Lab & Radiology Vault** | External | HL7 Link | Basic | **Integrated Normal Ranges & Abnormal Flagging** |
| **Legal Certificates (Arrêt, ITT)** | Basic French | US-only | Basic | **CNAS-conforme, Aptitude, Medico-legal ITT** |
| **Doctor Commission & Cash Closure** | ❌ None | High Add-on | Separate | **Integrated Physician Payout & Secretary Cash Sheet** |
| **Single-Elevation Desktop UI** | Sluggish | Dense Legacy | Generic | **Pristine Pod Trays (#F8F9FA) & Terracotta Glow** |

---

## 3. Visual Design Tokens & UI Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DESKTOP ATRIUM SYSTEM TOKENS                              │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Outer Canvas Container        │ #E8ECEF window background with detached floating edges │
│ Pod Trays (Grouping Canvas)   │ bg-[#F8F9FA] dark:bg-neutral-800/40, rounded-[24px],   │
│                               │ border border-[#EDF1F3] dark:border-neutral-800/60     │
│ Inner Cards                   │ bg-white dark:bg-neutral-800, rounded-[20px],          │
│                               │ border border-[#E9EEF0] dark:border-neutral-700/60     │
│ Dark Anchor Card              │ bg-[#1F1D1B] border border-neutral-800 text-white      │
│ Brand Action Buttons          │ AtriumButton variant="primary" (Terracotta #C4785A)    │
│ Secondary / Ghost Controls    │ AtriumButton variant="secondary" / variant="ghost"     │
│ Search Input                  │ Expanding kinetic Seek component with search lens      │
│ Select Dropdowns              │ Notched kinetic LabelSelect with floating label notch  │
│ Tables & Collections          │ UniversalDataCollection with dual List/Grid & Drawer   │
│ Numeric & Biometric Values    │ font-mono tabular-nums (e.g. 120/80 mmHg, 3,000 DZD)   │
│ Metadata Display              │ Quiet unboxed text with middots (·) — NO pill badges    │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 4. Screen-by-Screen Layout & UX Flows

### Screen 1: Clinic Pulse (`MedicalDashboardView.tsx`)
- **Top Header**: HeartPulse icon, title (*Centre Médical & Polyclinique*), facility badge, quick-action buttons (*Nouveau Patient*, *Nouvelle Consultation*, *Écran Salle d'Attente*).
- **Canonical Top Pod Tray (3 Cards)**:
  - Card 1: *File d'Attente Active* (Waiting count, in consultation count).
  - Card 2: *Consultations Clôturées* (Today's completed count, active EHR files).
  - Card 3: *Dark Espresso Anchor* (*Recettes & Tiers-Payant* — Total DZD, Chifa share vs Cash copay).
- **Two-Column Lower Workspace**:
  - *Left Column (60%)*: Today's live consultation stream with doctor assignment, room badge, and triage urgency indicator.
  - *Right Column (40%)*: Active practitioner roster with real-time status (In Consultation / Available / Break), current patient, and room number.

### Screen 2: Triage & Queue Management (`MedicalQueueView.tsx`)
- **Top Bar**: Search with `Seek`, Filter by Doctor, Filter by Urgency (Normal, Prioritaire, Urgence).
- **Queue Pipeline Columns or List**:
  - Phase 1: *Accueil & Salle d'Attente* (waiting time in minutes, ticket number e.g. `T-102`).
  - Phase 2: *Poste de Triage / Infirmerie* (vitals recorded by triage nurse).
  - Phase 3: *En Consultation Médecin* (active doctor and cabinet room).
  - Phase 4: *Sortie & Règlements* (ready for billing & prescription dispatch).
- **Waiting Room TV Display Mode**: Accessible via 1-click modal button, expanding into full-screen zero-sidebar kiosk view with ticket voice/tone announcement simulator.

### Screen 3: Multi-Doctor Agenda (`MedicalAgendaView.tsx`)
- **Top Controls**: Date picker (Today, Tomorrow, Week), Practitioner selector tabs with doctor badge colors, and slot interval selector (15m, 30m, 45m).
- **Column Time Grid**: Synchronized vertical timeline (08:00 - 18:00) with practitioner columns.
- **Interactive Booking**: Clicking any open slot opens `MedicalAppointmentModal` with auto-filled doctor, time, and patient selector.

### Screen 4: Dossiers Patients EHR 360° (`MedicalPatientsView.tsx`)
- **Container**: `UniversalDataCollection` with List View and Grid View, Seek search, blood group filter, and chronic ALD filter.
- **360° Patient Slide-Over Inspector Drawer**:
  - *Header*: Avatar, Full Name, Age/DOB, Blood Group, Chifa Card status, Allergy alert banner.
  - *Tab 1: Historique Clinique*: Chronological timeline of visits, diagnoses, and attending physicians.
  - *Tab 2: Constantes & Biométrie*: Interactive trend graphs of Blood Pressure (Systolic & Diastolic), Glycemia, and SpO2 over time.
  - *Tab 3: Laboratoire & Imagerie*: Attached lab blood panels and ultrasound/X-ray reports with abnormal value badges.
  - *Tab 4: Documents Émis*: Issued prescriptions and legal certificates with 1-click print.

### Screen 5: Ordonnances & Actes de Soins (`MedicalPrescriptionsView.tsx`)
- **Top Controls**: Active filter tabs (*Toutes*, *Signées*, *En cours*), Seek search, **Personaliser Ordonnance** button, *Rédiger Ordonnance* button.
- **Doctor Ordonnance Personalization Modal (`MedicalOrdonnancePersonalizerModal.tsx`)**:
  - Live interactive preview of the prescription document updating in real time as the doctor toggles settings.
  - Controls for doctor credentials, specialty, phone numbers, paper format (A5 vs A4), print mode (Digital Complete vs Pre-printed Paper), accent color, and custom consultation hours footer.
- **Prescription Composer Modal (`MedicalPrescriptionModal.tsx`)**:
  - Patient selector with **real-time Allergy Contraindication Checker**.
  - Structured posology lines: DCI / Medication name, dosage form (comprimé, sirop, injectable), dosage, frequency, and duration.
  - Printable Algerian ordonnance layout adopting the doctor's active personalized template.
- **Nomenclature Actes de Soins (NGAP)**: Secondary tab displaying standard medical acts with codification (`C`, `CS`, `K`, `KE`), fee, and linked consumables.

### Screen 6: Certificats Médicaux (`MedicalCertificatesView.tsx`)
- **Certificate Templates**:
  1. *Arrêt de Travail (CNAS)*: Start date, end date, duration, resumption date, medical reason.
  2. *Aptitude Physique / Bonne Santé*: Sports license, employment aptitude, driving license.
  3. *Certificat Descriptif de Blessures*: Medico-legal trauma description with ITT days count.
  4. *Lettre d'Orientation*: Formal doctor-to-doctor referral letter.
- **Print & Verification Engine**: Clean printable A4 layout with cryptographic hash and physician signature block.

### Screen 7: Facturation, Chifa & Honoraires (`MedicalBillingView.tsx`)
- **Top KPI Cards**: Total Facturé, Prise en charge Chifa (Tiers-Payant), Ticket Modérateur Encaissé, Honoraires Praticiens.
- **Four Operational Tabs**:
  - *Tab 1: Factures & Tiers-Payant*: Patient invoices with 80%/100% Chifa splits and payment status.
  - *Tab 2: Bordereau CNAS*: Consolidated monthly submission report for social security reimbursement.
  - *Tab 3: Honoraires Médecins*: Physician payout breakdown based on agreed commission percentage.
  - *Tab 4: Clôture de Caisse*: Secretary daily cash drawer count and payment reconciliation.

---

## 5. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MEDICAL VERTICAL ARCHITECTURE                             │
│                                                                                        │
│  ┌───────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────┐ │
│  │    Sidebar Dock       │  │  TopBar & Global Search │  │   Notifications Center   │ │
│  │ (Clinic Pulse, Queue, │  │   (Patient Seek, Doctor │  │ (Contraindication alert, │ │
│  │  Agenda, EHR, Presc., │  │    Active Switcher)     │  │  Triage priority, CNAS)  │ │
│  │  Certifs, Chifa Fin)  │  │                         │  │                          │ │
│  └───────────┬───────────┘  └────────────┬────────────┘  └─────────────┬────────────┘ │
└──────────────┼───────────────────────────┼─────────────────────────────┼──────────────┘
               ▼                           ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ACTIVE WORKSPACE VIEWPORT                                 │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ MedicalDashboardView.tsx (Pulse, 3-card pod tray, live queue, doctor status)     │  │
│  │ MedicalQueueView.tsx (Triage board, urgency stages, Waiting Room TV modal)       │  │
│  │ MedicalAgendaView.tsx (Multi-doctor column schedule, time slots, slot booking)   │  │
│  │ MedicalPatientsView.tsx (UniversalDataCollection, 360° EHR Drawer, Vitals Trend)│  │
│  │ MedicalPrescriptionsView.tsx (Allergy contraindication checker, Ordonnance modal)│  │
│  │ MedicalCertificatesView.tsx (Official legal certificates: Arrêt, Aptitude, ITT) │  │
│  │ MedicalBillingView.tsx (Chifa claims, CNAS bordereau, doctor splits, cash close) │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SHARED REUSABLE MODALS                               │
│  ┌───────────────────────────────┐ ┌────────────────────────────────────────────────┐  │
│  │ MedicalPatientModal.tsx       │ │ MedicalConsultationModal.tsx (SOAP notes)      │  │
│  ├───────────────────────────────┤ ├────────────────────────────────────────────────┤  │
│  │ MedicalPrescriptionModal.tsx  │ │ MedicalCertificateModal.tsx                    │  │
│  ├───────────────────────────────┤ ├────────────────────────────────────────────────┤  │
│  │ MedicalAppointmentModal.tsx   │ │ MedicalWaitingRoomTvModal.tsx (Fullscreen TV)  │  │
│  ├───────────────────────────────┤ ├────────────────────────────────────────────────┤  │
│  │ MedicalOrdonnancePersonalizer │ │ MedicalLabViewerModal.tsx (Diagnostic Vault)   │  │
│  └───────────────────────────────┘ └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DATA & STATE LAYER                                   │
│  medicalData.ts:                                                                       │
│  - INITIAL_PRACTITIONERS (Doctors across core medical departments with rooms)          │
│  - INITIAL_PATIENTS (Detailed patients with Chifa numbers, blood groups, allergies)    │
│  - INITIAL_CONSULTATIONS (SOAP notes, vitals history, triage status, doctor ID)        │
│  - INITIAL_PRESCRIPTIONS (structured posology lines, QR hash, doctor credentials)      │
│  - INITIAL_ORDONNANCE_CONFIGS (Personalized letterheads, paper format, print mode)    │
│  - INITIAL_LAB_RECORDS (NFS, Glycémie, Bilan Rénal with reference intervals)          │
│  - INITIAL_CERTIFICATES (Arrêt de travail, Aptitude, ITT with legal signatures)        │
│  - Quadruple Traceability Standard: { accountId, businessId, branchId, staffId }       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Phased Execution Roadmap (For Future Approval)

### Phase 1: Universal Medical Data Models & Personalization Schema
- Update `src/types/index.ts` with complete universal medical schemas (Practitioners, Biometrics, Lab panels, Certificates, Chifa claims, and `DoctorOrdonnanceConfig`).
- Enrich `src/components/screens/medical/medicalData.ts` with authentic polyclinic seed data: 5 doctors across general and specialist departments, 12 detailed patients with longitudinal vitals history, sample lab reports, certificates, and personalized doctor ordonnance templates.
- Ensure 100% Quadruple Traceability compliance (`accountId`, `businessId`, `branchId`, `staffId`).

### Phase 2: Navigation & Multi-Doctor Agenda Engine
- Update `Sidebar.tsx` navigation items for `medical_clinic` with authentic bilingual French/Arabic labels:
  - *Clinic Pulse* (`dashboard`)
  - *Triage & Queue* (`scheduler`)
  - *Agenda Médecins* (`agenda`)
  - *Dossiers Patients EHR 360°* (`members`)
  - *Ordonnances & Actes* (`shop`)
  - *Certificats Médicaux* (`registrations`)
  - *Facturation & Chifa* (`finance`)
- Build `MedicalAgendaView.tsx` with practitioner columns, 15/30/45 min slot toggles, and click-to-book appointment modal.

### Phase 3: Waiting Room TV Display Mode & Triage Polish
- Enhance `MedicalQueueView.tsx` with triage nurse inputs (Priority: Normal, ALD, Urgence).
- Implement `MedicalWaitingRoomTvModal.tsx`: high-contrast television display with live ticket calling, room routing, zero-dependency Web Audio API synthetic chime, and clinic notices.

### Phase 4: 360° EHR Drawer, Biometric Curves & Diagnostic Vault
- Upgrade `MedicalPatientsView.tsx` with the comprehensive slide-over drawer:
  - Longitudinal consultation timeline.
  - SVG blood pressure and glycemia trend charts.
  - Diagnostic lab & radiology vault with abnormal biomarker highlights.

### Phase 5: Ordonnance Personalization Studio, Allergy Checker & Medical Certificates
- Build `MedicalOrdonnancePersonalizerModal.tsx` allowing physicians to customize letterhead, paper size (A5/A4), accent theme, digital stamp, and toggle "Pre-printed Paper Mode".
- Upgrade `MedicalPrescriptionsView.tsx` with real-time allergy conflict validation and print preview adopting the active doctor's personalized template.
- Implement `MedicalCertificatesView.tsx` with official templates: *Arrêt de Travail CNAS*, *Aptitude Sportive*, *Certificat Descriptif ITT*, and *Lettre d'Orientation Confrère*.

### Phase 6: Chifa Tiers-Payant, Doctor Splits & Financial Close
- Re-architect `MedicalBillingView.tsx`:
  - Chifa claims list with 80% standard vs. 100% ALD splits.
  - Exportable/printable monthly CNAS télétransmission bordereau.
  - Doctor commission split calculator and payout statement.
  - Secretary daily cash-drawer closure reconciliation.
- Full verification with `lint_applet`, `compile_applet`, and unit tests.
