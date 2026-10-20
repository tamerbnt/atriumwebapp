# Full Tri-Lingual Localization & RTL Architecture (Arabic, French, English)

Comprehensive plan to complete the localization of Atrium ERP & CRM across all 7 vertical suites, application modals, kinetic controls, notifications, and bidirectional RTL layouts with zero feature loss.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on the initial assessment and your requirements:

- **Vertical Screen Coverage**: All vertical suites (**Education & Academy**, **Freelancer & Solo Practice**, **Venue & Rentals**, and **Project & Milestone / NCH Activator**) will be localized in full into English, French, and Arabic.
- **NCH Activator Trilingual Support**: The Project & Milestone vertical will be converted from hardcoded French into full tri-lingual capability, allowing seamless on-the-fly toggling between French (agency standard), Algerian Arabic, and English.
- **Realistic Bilingual Algerian Seed Data**: Demo records (e.g. member names, course titles, service items) will retain authentic Algerian multilingual character (mix of French and Arabic commercial designations) so the application feels immediately production-ready.
- **Bidirectional RTL Mirroring**: Arabic mode (`dir="rtl"`) will enforce proper typography with the Cairo font family, mirrored table headers, directional chevrons, and input padding.

---

## 1. Overview & Core Concept

Atrium is a multi-tenant business OS tailored for North African and international commercial environments. The goal of this implementation is to elevate the platform from a partially localized prototype (where core screens were translated but vertical extensions remained hardcoded) into a cohesive, production-grade tri-lingual experience.

### Key Value
- **Zero Language Gaps**: Every navigation label, table column header, status badge, action button, validation tooltip, and notification banner will dynamically react to the active language (`en`, `fr`, `ar`).
- **Seamless Cultural & Ergonomic Fit**: Algerian business workflows naturally blend French and Arabic. The UI will support both fluent Arabic with proper RTL typography and standardized French commercial terminology.
- **Type-Safe Dictionary Architecture**: Strict TypeScript key checking will ensure that missing translations in French or Arabic are flagged at compile time, eliminating undefined text or runtime crashes.

---

## 2. User Experience & Visual Design

### Typography & Bi-Directionality (LTR vs RTL)
- **English & French (`ltr`)**: Clean, modern display and tabular layout powered by **Inter**, with crisp tabular numerals (`tabular-nums`) for currency (DZD, EUR, USD) and timestamps.
- **Arabic (`rtl`)**: Automatically switches the document font to **Cairo** (`[dir="rtl"] { font-family: 'Cairo', sans-serif; }`), providing legibility for Arabic glyphs, diacritics, and commercial phrasing.
- **Kinetic Icon & Layout Mirroring**:
  - Chevron navigation (`ChevronRight` vs `ChevronLeft`) automatically inverts direction based on `isRtl`.
  - Floating badges, search lenses (`Seek`), and notched label inputs (`LabelInput`) maintain precise padding on the inline-start axis.
  - Dropdowns and popovers pivot from the appropriate anchor corner (`right-0` vs `left-0`).

### Layout & Component Styling Patterns
```
┌────────────────────────────────────────────────────────────────────────┐
│ TopBar [Search lens] [Theme Toggle] [🌐 Language: العربية 🇩🇿 ▼]       │
├─────────────┬──────────────────────────────────────────────────────────┤
│ Sidebar     │ Active Vertical Viewport (e.g., Education / Cohorts)     │
│             │                                                          │
│ [Dashboard] │  ┌────────────────────────────────────────────────────┐  │
│ [Timetable] │  │ 🎓 لوحة تحكم الأكاديمية (Academy Pulse)            │  │
│ [Students]  │  ├────────────────────────────────────────────────────┤  │
│ [Cohorts]   │  │ إجمالي الطلاب: 142 | الحصص النشطة: 12             │  │
│ [Finance]   │  │ [بحث عن دفعة...]   [+ إضافة فوج جديد]              │  │
│             │  └────────────────────────────────────────────────────┘  │
└─────────────┴──────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

### 1. Dictionary Architecture (`src/utils/i18n.ts`)
- **Chosen Approach**: Consolidate vertical translations into domain-scoped blocks within the master dictionary (`src/utils/i18n.ts`) sharing the typed `TranslationKey` definition, backed by `useTranslation()`.
- **Why**: Keeps bundles zero-request (no asynchronous network waterfall for JSON translation chunks), maintains instant switching with zero flicker, and leverages TypeScript's `typeof TRANSLATIONS_EN` to enforce 100% parity across `TRANSLATIONS_FR` and `TRANSLATIONS_AR`.
- **Alternative Considered**: Multiple nested JSON files per module. Rejected because async chunk loading causes text layout shifts during language switches.

### 2. Form Notched Labels (`LabelInput` & `LabelSelect`)
- **Chosen Approach**: Ensure all floating label notches and clear buttons account for `dir="rtl"`.
- **Why**: Notched inputs with floating border labels can clip Arabic text or calculate incorrect notch cutouts if border inline-start coordinates are not RTL-aware.

### 3. Toast Notifications & System Alerts
- **Chosen Approach**: Standardize `addToast` calls to accept translation keys or localized strings generated via `t()`, ensuring checkout success, low-stock alerts, and approval notices appear in the user's selected language.

---

## 4. Technical Architecture & Data Strategy

### System Component & Localization Hierarchy

```
                    ┌─────────────────────────┐
                    │   Browser / OS Locale   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    Atrium Store State   │
                    │   language: 'en'|'fr'|'ar│
                    │   isLanguageAuto: bool  │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
┌──────────────────┐                           ┌──────────────────┐
│ document element │                           │ useTranslation() │
│  dir: 'ltr'|'rtl'│                           │  t(key, fallback)│
│  lang: en|fr|ar  │                           │  isRtl, language │
└──────────────────┘                           └─────────┬────────┘
                                                         │
         ┌───────────────────┬───────────────────┬───────┴───────────┬───────────────────┐
         ▼                   ▼                   ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Education Suite │ │ Freelance Suite │ │   Venue Suite   │ │ Project (NCH)   │ │ Kinetic Inputs  │
│ (9 Screens &    │ │ (8 Screens &    │ │ (8 Screens &    │ │ (8 Screens &    │ │ & ToastStack    │
│  Modals)        │ │  Modals)        │ │  Modals)        │ │  Modals)        │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Phased Implementation Breakdown

#### Phase 1: Dictionary Expansion (`src/utils/i18n.ts`)
- Add structured translation keys for:
  - **Education vertical**: `edu_kpi_*`, `edu_timetable_*`, `edu_students_*`, `edu_cohorts_*`, `edu_admissions_*`, `edu_attendance_*`, `edu_finance_*`, `edu_cert_*`.
  - **Freelance vertical**: `free_kpi_*`, `free_clients_*`, `free_kanban_*`, `free_timer_*`, `free_invoice_*`, `free_proposals_*`, `free_finance_*`.
  - **Venue & Rentals vertical**: `venue_kpi_*`, `venue_timeline_*`, `venue_bookings_*`, `venue_equipment_*`, `venue_renters_*`, `venue_finance_*`.
  - **Project & Agency / NCH Activator**: `pm_dir_*`, `pm_cp_*`, `pm_crea_*`, `pm_sup_*`, `pm_rh_*`, `pm_compta_*`, `pm_ccp_*`.
  - **Kinetic UI & Common States**: search placeholders, pagination, empty states, and toast messages.
- Populate full translations for French (`TRANSLATIONS_FR`) and Arabic (`TRANSLATIONS_AR`).

#### Phase 2: Education & Academy Suite Migration
- Integrate `useTranslation()` across:
  - `EducationDashboardView.tsx`, `EducationTimetableView.tsx`, `EducationStudentsView.tsx`
  - `EducationCohortsView.tsx`, `EducationAdmissionsView.tsx`, `EducationAttendanceView.tsx`
  - `EducationFinanceView.tsx`, `CertificateModal.tsx`, `RollCallModal.tsx`

#### Phase 3: Freelancers & Solo Practice Suite Migration
- Integrate `useTranslation()` across:
  - `FreelanceDashboardView.tsx`, `FreelanceClientsView.tsx`, `FreelanceDeliverablesView.tsx`
  - `FreelanceTimeTrackerView.tsx`, `FreelanceInvoicesView.tsx`, `FreelanceProposalsView.tsx`
  - `FreelanceFinanceView.tsx`, `InvoicePreviewModal.tsx`

#### Phase 4: Venue & Rental Suite Migration
- Integrate `useTranslation()` across:
  - `VenueDashboardView.tsx`, `VenueTimelineView.tsx`, `VenueBookingsView.tsx`
  - `VenueInventoryView.tsx`, `VenueRentersView.tsx`, `VenueFinanceView.tsx`
  - `BookingModal.tsx`, `VenueCloudSyncModal.tsx`

#### Phase 5: Project & Milestone (NCH Activator) Suite Migration
- Refactor the 8 role views and modals from hardcoded French to dynamic `t()` calls:
  - `ProjectDirectionView.tsx`, `ProjectChefProjetView.tsx`, `ProjectCreaView.tsx`
  - `ProjectSuperviseurView.tsx`, `ProjectRhView.tsx`, `ProjectComptaView.tsx`
  - `CcpSlipModal.tsx`, `MobilePhoneSimulator.tsx`

#### Phase 6: Kinetic Controls, ToastStack & RTL Layout Verification
- Mirror table alignments and chevron directions for Arabic.
- Audit input components (`LabelInput`, `LabelSelect`, `Seek`) for RTL padding and notch positioning.
- Run type-checking (`tsc --noEmit`), unit tests (`npm test`), and compilation build (`compile_applet`).
