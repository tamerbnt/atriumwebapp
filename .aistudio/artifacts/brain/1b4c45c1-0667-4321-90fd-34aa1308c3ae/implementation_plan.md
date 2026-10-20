# Atrium ERP & CRM — Comprehensive Tri-Lingual Localization Master Plan (FR / AR / EN)

Complete codebase audit and phased localization blueprint across all seven business verticals, administrative workflows, and shared system screens in Atrium ERP, with immediate priority given to the **Venue & Rental Spaces vertical**, followed by **Agency & Project Milestone** (with full Algerian administrative Arabic), **Education & Academy**, **Freelance Solo**, **POS Inventory**, and **Membership & Fitness**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during the requirements alignment phase and govern this implementation plan:
> - **Vertical Priority Sequence**: We begin immediately with the **Venue and Rental Spaces vertical** (Category 14), achieving 100% tri-lingual completion across all 8 venue screens/modals before proceeding to subsequent verticals.
> - **Agency Vertical Administrative Adaptation**: Official Algerian postal and commercial instruments (including **Bordereau Algérie Poste CCP SFP 01**, **Bon à Tirer - BAT**, and **Marchés Publics / Devis d'Activation**) will receive authentic, legally aligned tri-lingual formatting with official Algerian administrative Arabic terminology (e.g. الجمهورية الجزائرية الديمقراطية الشعبية / بريد الجزائر · العمليات المالية SFP 01).
> - **Execution Strategy**: Implemented vertical-by-vertical in dedicated, verified phases to ensure zero regressions, complete dictionary symmetry across English, French, and Arabic, and rigorous RTL validation.

---

## 1. Overview & Core Concept

Atrium is a multi-tenant, offline-first ERP and CRM built for 7 distinct industry verticals operating across Algeria and international markets. The platform requires native, fluid support for three operating languages:
- **French (FR)**: Default commercial and administrative language across Algerian enterprises and North African commerce.
- **Arabic (AR - DZ)**: Native Algerian Arabic with full bidirectional Right-to-Left (RTL) mirror layout, proper typography, and official administrative lexicon.
- **English (EN - US)**: International baseline for global export, tech operations, and cross-border billing.

### Current Overall Localization Status:
| Vertical / Domain | Category ID | Current Status | Primary Missing Scope |
| :--- | :--- | :--- | :--- |
| **Salon, Spa & Beauty** | Cat 5 (`appointment_service`) | **~98% Completed** | Verified complete (schedule, chairs, modals, CRM). |
| **Venue & Rental Spaces** | Cat 14 (`rental_booking`) | **~15% Partial** | **Priority 1**: Timeline, booking modal, deposits, catalog, contracts. |
| **Agency & Project Milestone** | Cat 13 (`project_milestone`) | **~20% Partial** | **Priority 2**: 6 roles, CCP SFP 01 postal slip, BAT proofs, mobile simulator. |
| **Education & Academy** | Cat 15 (`education_cohort`) | **~35% Partial** | **Priority 3**: Timetable, roll call modal, certificates, tuition billing. |
| **Freelance & Solo Studio** | Cat 16 (`freelance_solo`) | **~75% Substantial** | **Priority 4**: Invoice modal, stopwatch dialogs, proposal delete cascades. |
| **POS & Retail Inventory** | Cat 6 (`pos_inventory`) | **~60% Substantial** | **Priority 5**: Thermal 80mm receipts, refund dialogs, barcode modals. |
| **Gym & Membership Fitness** | Cat 1 (`membership_session`) | **~80% Substantial** | **Priority 6**: Turnstile access toasts, RFID modals, acquisition tags. |
| **Core Layout & System Modals** | Global | **~85% Substantial** | Command palette, OAuth guide modal, desktop licensing modal. |

---

## 2. Comprehensive Codebase Audit: Files, Positions & Deficits

### Category 14: Venue, Rentals & Event Spaces (`rental_booking`) — [PRIORITY 1]
- **`src/components/screens/venue/VenueDashboardView.tsx`**
  - *Position*: Root dashboard for space rental operations (`activeScreen === 'dashboard'`).
  - *Missing*: KPI labels (`Today's Booked Volume`, `Space hire + equipment add-ons`, `active deposits held`, `in-use`), live room status cards (`Reserve Space`, `View Timeline`, `Until HH:MM`, `Available for booking today`, rate `/h`), schedule arrival rows, and empty state prompts.
- **`src/components/screens/venue/VenueTimelineView.tsx`**
  - *Position*: Visual Gantt space occupancy and calendar scheduler (`activeScreen === 'scheduler'`).
  - *Missing*: Date navigation buttons, room resource column headers, timeline slot hover tooltips, quick booking drawer, booking status tags (`CheckedIn`, `Confirmed`, `Maintenance`), turnover buffer time notices.
- **`src/components/screens/venue/VenueBookingsView.tsx`**
  - *Position*: Contracts, reservations, and check-in pipeline (`activeScreen === 'registrations'` & `history`).
  - *Missing*: Completely lacks `useTranslation` / `t()`. All table headers (`Reservation #`, `Renter`, `Hall/Room`, `Date & Time`, `Caution / Deposit`, `Total Amount`, `Status`), filter tags, check-in/check-out button triggers, and printable contract view.
- **`src/components/screens/venue/VenueInventoryView.tsx`**
  - *Position*: Add-on equipment and technical asset catalog (`activeScreen === 'shop'`).
  - *Missing*: AV systems, sound, lighting, stage, projector catalog cards, hourly/daily pricing rate toggles, stock counts, damaged/maintenance equipment statuses, and rental add-on action buttons.
- **`src/components/screens/venue/VenueRentersView.tsx`**
  - *Position*: Organizers, corporate accounts, and private event host CRM (`activeScreen === 'members'`).
  - *Missing*: Client roster headers, company identification numbers (NIF/NIS), organizer contact cards, lifetime booking totals, caution deposit history drawer, and event history log.
- **`src/components/screens/venue/VenueFinanceView.tsx`**
  - *Position*: Escrow ledger, security caution deposit releases, and revenue tracking (`activeScreen === 'finance'`).
  - *Missing*: Security deposit status filters (`Held in Escrow`, `Released`, `Deducted for Damages`), refund receipts, cash vs wire breakdown, and financial summary charts.
- **`src/components/screens/venue/BookingModal.tsx`**
  - *Position*: Multi-step modal for reserving spaces, calculating deposits, and selecting equipment add-ons (`src/components/screens/venue/BookingModal.tsx`).
  - *Missing*: Form sections, unit selectors, date/time pickers, attendee count validations, security deposit (Caution) rules, add-on checkboxes, price calculation breakdowns, and submit confirmation toasts.
- **`src/components/screens/venue/VenueCloudSyncModal.tsx`**
  - *Position*: Supabase live inspection modal for rental bookings and units.
  - *Missing*: Cloud sync status descriptions, table names, row count indicators, and close buttons.

---

### Category 13: Project Milestone & Agency (NCH Activator 6 Roles) — [PRIORITY 2]
- **`src/components/screens/project/ProjectDirectionView.tsx`**
  - *Position*: Executive agency dashboard, client contract approval, project charter creation.
  - *Missing*: Strategic KPI cards, client approvals workflow, budget commitment graphs, milestone double-lock validation, and project specification modals.
- **`src/components/screens/project/ProjectChefProjetView.tsx`**
  - *Position*: Project manager portfolio, print catalog, orders, and press-ready BAT deliverables.
  - *Missing*: Print specifications (`Grammage`, `Format`, `Pelliculage`, `Tirage`), BAT status tracking (`En attente BAT`, `BAT Validé Client`, `Rejeté`), supplier order tracking, and delivery receipts.
- **`src/components/screens/project/ProjectCreaView.tsx`**
  - *Position*: Creative studio Kanban, key visual production, asset delivery.
  - *Missing*: Briefing cards, asset upload dropzones, file format tags (`PSD`, `AI`, `PDF HD`, `MP4`), production deadlines, and review feedback threads.
- **`src/components/screens/project/ProjectSuperviseurView.tsx`**
  - *Position*: Field activations, team staffing, mobile GPS roll call, field petty cash.
  - *Missing*: GMS supermarket activation points, animator check-in logs, field attendance statuses (`Présent`, `Retard`, `Remplacement`), and on-site transport/catering expense logs.
- **`src/components/screens/project/ProjectRhView.tsx`**
  - *Position*: 58 Wilayas talent pool, model casting, contract dossier, and intake portal.
  - *Missing*: Wilaya dropdowns (16 Alger, 31 Oran, 25 Constantine, etc.), talent profiles, biometric photos, national ID card fields (NIN), casting categories (`Hôtesse`, `Animateur Commercial`, `Superviseur Wilaya`), and onboarding wizard.
- **`src/components/screens/project/ProjectComptaView.tsx`**
  - *Position*: Payroll audit, legal Algérie Poste CCP SFP 01 generation, expense receipts, asset inventory.
  - *Missing*: 1,014 lines of hardcoded French and English! Lacks `t()` imports. Missing double-lock approval badges, animator payment ledgers, CCP batch generation buttons, expense audit checks, and QR code verification.
- **`src/components/screens/project/CcpSlipModal.tsx`**
  - *Position*: Official legal Algérie Poste SFP 01 postal remittance check generator (`src/components/screens/project/CcpSlipModal.tsx`).
  - *Missing*: Official administrative Arabic header (`الجمهورية الجزائرية الديمقراطية الشعبية / وزارة البريد والمواصلات السلكية واللاسلكية / بريد الجزائر · العمليات المالية SFP 01`), amount in words converter in Arabic/French (`ثمانية عشر ألف دينار جزائري ولا سنتيم`), postal center stamp boxes, check key (`Clé CCP`), and recipient signature areas.
- **`src/components/screens/project/MobilePhoneSimulator.tsx`**
  - *Position*: On-site field smartphone simulator for promoter GPS check-in.
  - *Missing*: Mobile UI screen titles, camera permission prompts, GPS coordinate labels, selfie check-in confirmation, and sync buttons.

---

### Category 15: Education & Training Academy (`education_cohort`) — [PRIORITY 3]
- **`src/components/screens/education/EducationDashboardView.tsx`**
  - *Position*: Academy overview (`activeScreen === 'dashboard'`).
  - *Missing*: Attention radar cards (`Attendance < 85%`, `Overdue tuition`), facility fast-switch dropdown, session quick-action cards, and attendance progress meters.
- **`src/components/screens/education/EducationTimetableView.tsx`**
  - *Position*: Weekly class timetable and room occupancy (`activeScreen === 'scheduler'`).
  - *Missing*: Class slot cards, classroom designations (`Lab 1`, `Amphi A`, `Studio 3`), instructor availability badges, and class reschedule actions.
- **`src/components/screens/education/EducationStudentsView.tsx`**
  - *Position*: Student directory, matricules, and enrollment files (`activeScreen === 'members'`).
  - *Missing*: Student academic 360° drawer, attendance history timeline, guardian contact information, student ID card generator, and matricule search filters.
- **`src/components/screens/education/EducationCohortsView.tsx`**
  - *Position*: Academic programs, cohorts, and curricula (`activeScreen === 'shop'`).
  - *Missing*: Program duration units (`Weeks`, `Months`, `Hours`), syllabus modules, cohort capacity meters, graduation eligibility indicators, and new cohort modal.
- **`src/components/screens/education/EducationAdmissionsView.tsx`**
  - *Position*: Admissions funnel, prospective students, interviews (`activeScreen === 'registrations'`).
  - *Missing*: Lead stage columns (`Inquiry`, `Application`, `Interview`, `Accepted`, `Enrolled`), test score inputs, intake source tracking, and enrollment conversion triggers.
- **`src/components/screens/education/EducationAttendanceView.tsx`**
  - *Position*: Roll call attendance matrix and absence records (`activeScreen === 'analytics'`).
  - *Missing*: Attendance matrix grid headers, status toggles (`Present`, `Absent`, `Late`, `Excused`), student absence warning letters, and monthly attendance percentage calculations.
- **`src/components/screens/education/EducationFinanceView.tsx`**
  - *Position*: Tuition installments, balances, and payment vouchers (`activeScreen === 'finance'`).
  - *Missing*: Installment schedules (`Tranche 1`, `Tranche 2`, `Tranche 3`), receipt generation, payment method split, and debt recovery alerts.
- **`src/components/screens/education/RollCallModal.tsx` & `CertificateModal.tsx`**
  - *Position*: Daily roll call recorder and official graduation certificate generator.
  - *Missing*: Full tri-lingual diploma/certificate wording (Ministry reference, program title, honors distinction: `Excellent / Très Bien / ممتاز`), and roll call confirmation toasts.

---

### Category 16: Freelance & Solo Studio (`freelance_solo`) — [PRIORITY 4]
- **`src/components/screens/freelance/FreelanceDeliverablesView.tsx`**: Scope creep alerts, sprint task modals, tag filters.
- **`src/components/screens/freelance/FreelanceTimeTrackerView.tsx`**: Manual log modal, Pomodoro sound alert labels, timer discard confirmations.
- **`src/components/screens/freelance/FreelanceInvoicesView.tsx` & `InvoicePreviewModal.tsx`**: Official bilingual invoice templates (SEPA / BaridiMob / Swift), reverse charge VAT notices, tax ID numbers.
- **`src/components/screens/freelance/FreelanceProposalsView.tsx`**: Proposal conversion modals, milestone pricing lines, expiry warning badges.
- **`src/components/screens/freelance/FreelanceFinanceView.tsx`**: Auto-entrepreneur tax reserve simulator, deductible expense categories.

---

### Category 6 & Category 1: POS Inventory & Gym Membership — [PRIORITY 5 & 6]
- **`src/components/screens/ShopScreen.tsx`**: Thermal 80mm receipt preview, split payment drawer (Cash + BaridiMob + Card), barcode scanner errors.
- **`src/components/screens/HistoryScreen.tsx`**: Refund dialogs, cashier shift ledger, receipt reprint modals.
- **`src/components/modals/MemberModal.tsx` & `LeadModal.tsx`**: Membership plan dropdowns, biometric tags, intake survey channels.

---

### Global & Shared System Modals — [PRIORITY 7]
- **`src/components/modals/DesktopUpgradeModal.tsx`**: Enterprise licensing perks, Windows/macOS download cards.
- **`src/components/modals/CommandPaletteModal.tsx`**: Global shortcut search actions, navigation jump items.
- **`src/components/modals/VoucherModal.tsx`**: License redemption error codes and lifetime demo presets.
- **`src/components/auth/PowerOnboardingScreen.tsx`**: Vertical industry selector cards, currency/wilaya setup.

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Unified Tri-Lingual Store & State                    │
│                        (src/services/store.ts)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────┐
│       i18n Localization Engine       │  │       RTL & Theme Engine      │
│         (src/utils/i18n.ts)          │  │       (src/index.css & App)   │
├──────────────────────────────────────┤  ├───────────────────────────────┤
│ • TRANSLATIONS_EN (Base Dictionary)  │  │ • document.dir = 'rtl'/'ltr'  │
│ • TRANSLATIONS_FR (French Symmetry)  │  │ • Tailwind rtl:* variants     │
│ • TRANSLATIONS_AR (Arabic Symmetry)  │  │ • Font: Inter & Cairo Arabic  │
│ • t(key, lang, params) Interpolator  │  │ • Algerian DZD Currency Rule  │
│ • formatMoney / localizeStatus       │  │ • Auto System Locale Detect   │
└──────────────────┬───────────────────┘  └───────────────┬───────────────┘
                   │                                      │
                   └──────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┴───────────────────────────┐
          ▼                                                       ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────┐
│    Priority 1: Venue & Rentals       │  │  Priority 2: Agency & Project │
│         (Category 14)                │  │         (Category 13)         │
├──────────────────────────────────────┤  ├───────────────────────────────┤
│ • VenueDashboardView                 │  │ • ProjectDirectionView        │
│ • VenueTimelineView                  │  │ • ProjectChefProjetView       │
│ • VenueBookingsView                  │  │ • ProjectCreaView             │
│ • VenueInventoryView                 │  │ • ProjectSuperviseurView      │
│ • VenueRentersView                   │  │ • ProjectRhView               │
│ • VenueFinanceView                   │  │ • ProjectComptaView           │
│ • BookingModal                       │  │ • CcpSlipModal (SFP 01)       │
│ • VenueCloudSyncModal                │  │ • MobilePhoneSimulator        │
└──────────────────────────────────────┘  └───────────────────────────────┘
```

### Key Technical Principles:
1. **Strict Key Symmetry**: Every key added to `TRANSLATIONS_EN` in `src/utils/i18n.ts` must have an exact 1:1 typed counterpart in `TRANSLATIONS_FR` and `TRANSLATIONS_AR`. TypeScript ensures compile-time safety via `typeof TRANSLATIONS_EN`.
2. **Variable Interpolation**: Complex strings with parameters (e.g. `{renter}`, `{hours}`, `{amount}`, `{unit}`) use the dynamic `t(key, lang, { param: value })` engine.
3. **Algerian Currency & Administrative Precision**: All monetary values use `formatMoney` or `formatCurrencyAmount` with localized symbols (`DZD` in EN/FR, `د.ج` in Arabic). Official forms match Algerian post and banking standards.
4. **Native RTL Support**: When language is set to `ar`, all flex/grid layouts flip naturally with zero hardcoded directional styling, utilizing logical properties and `rtl:` Tailwind classes.

---

## 4. Phased Implementation Roadmap

### Phase 1: Venue and Rental Spaces Vertical (Cat 14) — [CURRENT FOCUS]
- **Step 1.1**: Expand `src/utils/i18n.ts` with ~120 comprehensive keys for Venue & Rentals (`venue_*`, `rental_*`, `caution_*`, `addon_*`, `space_*`) across EN, FR, and AR.
- **Step 1.2**: Localize `src/components/screens/venue/VenueDashboardView.tsx` (KPIs, room cards, quick reservation drawer, arrival schedule).
- **Step 1.3**: Localize `src/components/screens/venue/VenueTimelineView.tsx` (Gantt timetable, room filters, slot interactions).
- **Step 1.4**: Localize `src/components/screens/venue/VenueBookingsView.tsx` (Booking pipeline, status filters, printable contract).
- **Step 1.5**: Localize `src/components/screens/venue/VenueInventoryView.tsx` (Add-on equipment, technical gear, rental rates).
- **Step 1.6**: Localize `src/components/screens/venue/VenueRentersView.tsx` (Renter CRM, corporate profiles, spend ledger).
- **Step 1.7**: Localize `src/components/screens/venue/VenueFinanceView.tsx` (Caution escrow ledger, refund processing).
- **Step 1.8**: Localize `src/components/screens/venue/BookingModal.tsx` & `VenueCloudSyncModal.tsx` (Multi-step booking form, deposit calculations).
- **Step 1.9**: Localize toast notifications in `src/services/store.ts` for rental check-in, checkout, and cancellation events.
- **Step 1.10**: Verify compilation and test Arabic RTL layout and French phrasing across all venue views.

### Phase 2: Agency & Project Milestone (Cat 13) — [NEXT FOCUS]
- **Step 2.1**: Expand dictionary for 6 agency roles, press BAT proofing, and official Algerian postal administration terms.
- **Step 2.2**: Localize `CcpSlipModal.tsx` with authentic Algerian administrative Arabic and French postal headers (SFP 01).
- **Step 2.3**: Localize `ProjectComptaView.tsx` (double-lock payroll validation, animator ledger, expense audits).
- **Step 2.4**: Localize `ProjectDirectionView.tsx`, `ProjectChefProjetView.tsx`, `ProjectCreaView.tsx`, `ProjectSuperviseurView.tsx`, `ProjectRhView.tsx`, and `MobilePhoneSimulator.tsx`.

### Phase 3: Education & Training Academy (Cat 15)
- Localize all 9 views and modals (`EducationDashboardView`, `Timetable`, `Students`, `Cohorts`, `Admissions`, `Attendance`, `Finance`, `RollCallModal`, `CertificateModal`).

### Phase 4: Freelance Solo (Cat 16)
- Complete residual localization in `InvoicePreviewModal.tsx`, time tracking modals, and proposal delete cascades.

### Phase 5: POS Inventory & Gym Membership (Cat 6 & Cat 1)
- Localize thermal receipt layouts, refund workflows, and turnstile check-in modals.

### Phase 6: Global Modals & Final System Audit
- Localize `DesktopUpgradeModal`, `CommandPaletteModal`, and perform global tri-lingual lint and build verification.
