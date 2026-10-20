# Salon, Spa & Appointment Vertical — Comprehensive Tri-Lingual Localization Plan (FR / AR / EN)

Complete architectural localization blueprint for the **Salon, Spa & Beauty vertical** (`appointment_service`) in Atrium ERP & CRM. This plan establishes native tri-lingual fluency across French, Modern Standard Arabic (with North African / Algerian salon parlance), and English, covering all dedicated screens, shared vertical workflows, modals, kinetic toasts, and preset service catalog items.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and linguistic choices were confirmed during Phase 1 interactive interview and govern this implementation:

- **Confirmed Decision 1 (Linguistic Persona)**: Algerian and Maghrebi French and Arabic salon terminology (e.g. *Salon de coiffure & beauté*, *Fauteuil / Au fauteuil*, *Prestation*, *Brushing*, *Soin lissage*, *صالون حلاقة وتجميل*, *على الكرسي*, *جلسة عناية*, *مصفف شعر*, *سشوار*, *بالياج*).
- **Confirmed Decision 2 (Vertical Scope)**: Full salon suite end-to-end, including `StylistScheduleView`, `DashboardScreen` (chair workstations & pillar chart), `MembersScreen` / `MemberModal` (clients & treatment history), `ShopScreen` (beauty store & treatment checkout), `FinanceStaffScreen` (stylist payroll & commissions), `HistoryScreen` (appointment audit log), and `RegistrationsScreen` / `LeadModal` (appointment inquiries).
- **Confirmed Decision 3 (Preset Catalog Localization)**: Preset salon treatments, durations, descriptions, and categories dynamically localize according to the active language while preserving data IDs and pricing.

---

## 1. Overview & Core Concept

### What It Does
Empowers salon managers, master stylists, nail technicians, and front-desk receptionists to seamlessly operate their salon in their preferred native language—French, Arabic, or English—with immediate bidirectional (RTL/LTR) layout adaptation, culturally accurate terminology, and localized Algerian currency and date conventions.

### Target Audience & Persona
- **Salon Owners & Head Stylists**: Review chair occupancy, daily salon revenue, and stylist commissions in French or Arabic.
- **Receptionists / Front Desk**: Rapidly book appointments, assign chairs, manage walk-in queues, and execute 1-click checkouts without cognitive friction.
- **Stylists & Technicians**: Consult daily appointment rosters and update in-chair progress on desktop tablets or POS terminals.

### Key Value Delivered
- **Zero Hardcoded Strings**: 100% of UI elements, filters, headers, tooltips, and action buttons powered by the centralized `t()` dictionary.
- **Bidirectional Grace (RTL/LTR)**: Natural reading flow for Arabic users (`dir="rtl"`) with mirrored icons, aligned tabular numbers, and Cairo typography.
- **Dynamic Service Catalog**: Salon services and categories display in the user's active language while maintaining unified backend state.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Stylist Roster & Day Booking**:
   - The user opens the **Booking Calendar** (`StylistScheduleView`).
   - The date header, navigation controls ("Today", "Prev Day", "Next Day"), and KPI summary cards ("Total Bookings", "In Chair", "Completed", "Today's Est. Revenue") render in the active language.
   - Stylist columns display localized chair status indicators (`En prestation` / `على الكرسي` / `In Chair`, `Confirmé` / `مؤكد` / `Confirmed`).
   - Clicking a free time slot opens `AppointmentModal` pre-populated with localized field labels and service names.

2. **Walk-in Intake & Chair Seating**:
   - Receptionist toggles between "Registered Client" and "Walk-in Intake" (`Mode d'accueil client` / `طريقة استقبال العميل`).
   - Seating a client triggers the kinetic toast notification: *"Client assis au fauteuil — Prestation démarrée avec Sarah"* or *"تم إجلاس العميل على الكرسي — بدأت الجلسة مع سارة"*.

3. **1-Click Checkout & POS Transfer**:
   - From the schedule or dashboard chair card, receptionist clicks **1-Click Checkout** (`Encaissement 1-Clic` / `إنهاء ودفع فوري`).
   - A sale record is registered, the appointment status transitions to `Completed`, and an Algerian Dinar receipt toast appears with printable action.

### Visual Identity & Theme
- **Color Palette**: Terracotta Brand Accent (`#C4785A`), Amber Warm Glow for Active Chairs (`#D97706` / `rgba(217, 119, 6, 0.15)`), Emerald for Completed Services (`#10B981`), and Obsidian Canvas (`#18181B`).
- **Typography**: `Inter` for English/French UI, paired with `Cairo` for Arabic prose and labels; tabular numbers (`tabular-nums`) for prices and appointment times.
- **Spatial Composition**: Detached Apple Spatial floating canvas with 20px card radii, subtle hairline borders, and zero decorative clutter.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Unified i18n Key Registry vs. Inline Conditionals
- **Chosen Approach**: Centralize all salon strings into `src/utils/i18n.ts` under standard prefixed namespaces (`salon_*`, `apt_*`, `chair_*`).
- **Why**: Eliminates scattered ternary expressions (`language === 'ar' ? ... : ...`), guarantees full coverage across all 3 languages, and facilitates automated test validation.
- **Alternatives Considered**: Inline ternaries in component JSX (rejected: causes code bloat, fragile maintenance, and missing fallback edge cases).

### Decision 2: Dynamic Service Catalog Display
- **Chosen Approach**: Augment `ServiceItem` resolution with a helper `getLocalizedService(service, language)` that maps base service IDs to localized names and descriptions, while allowing custom user-created services to persist unchanged.
- **Why**: Preserves backward compatibility with existing appointment state while ensuring default presets (Balayage, Keratin, Blowout, HydraFacial) read natively in French and Arabic.
- **Alternatives Considered**: Duplicate service records per language in the database (rejected: causes synchronization bugs when changing prices).

### Decision 3: Notification Intelligence Localization
- **Chosen Approach**: Localize the `appointment_service` intelligence pool in `ToastStack.tsx` and dynamically resolve toast titles/messages in `store.ts` using the active language.
- **Why**: Ensures kinetic ambient toasts match the UI language without jarring English toast popups during Arabic or French sessions.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Atrium Core Shell                             │
│                  (Language: en | fr | ar  ·  Dir: ltr | rtl)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│   StylistScheduleView   │  │     DashboardScreen     │  │    AppointmentModal     │
│ - Date Navigator        │  │ - Chair Workstations    │  │ - Registered vs Walk-in │
│ - Stylist Columns       │  │ - Peak Booking Hours    │  │ - Service / Price       │
│ - Service Catalog Tab   │  │ - Salon KPI Tiles       │  │ - Status Flow Actions   │
│ - 1-Click Checkout      │  │ - In-Chair Fast Action  │  │ - Reschedule / Cancel   │
└────────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘
             │                            │                            │
             └────────────────────────────┼────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           Centralized i18n Engine                              │
│  src/utils/i18n.ts  ·  useTranslation()  ·  getLocalizedService()              │
│  - Namespaces: salon_*, apt_*, chair_*, toast_apt_*, staff_*, member_*         │
└─────────────────────────────────────────┬──────────────────────────────────────┘
                                          │
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                         Kinetic ToastStack System                              │
│  - Localized appointment_service pool (FR / AR / EN)                           │
│  - Real-time booking, seating, and checkout feedback                           │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Granular Key Inventory to Implement

| Namespace | Key Count | Target Screens & Components | Example French / Arabic Terms |
|---|---|---|---|
| `salon_*` | 32 keys | `StylistScheduleView`, `DashboardScreen` | *Fauteuils de coiffure*, *كراسي التصفيف*, *Occupation des fauteuils*, *نسبة إشغال الكراسي* |
| `apt_*` | 28 keys | `AppointmentModal`, `StylistScheduleView` | *Client au fauteuil*, *على الكرسي*, *Accueil client*, *طريقة استقبال العميل* |
| `srv_*` | 16 keys | Preset Service Catalog (`seedData.ts`) | *Balayage Signature*, *بالياج مميز*, *Soin Lissage Kératine*, *علاج الكيراتين المكثف* |
| `toast_apt_*` | 12 keys | Store actions & `ToastStack.tsx` | *Rendez-vous confirmé*, *تم تأكيد الموعد*, *Client assis*, *تم إجلاس العميل* |
| `shared_salon_*` | 18 keys | `MembersScreen`, `ShopScreen`, `StaffScreen` | *Fiche cliente*, *ملف العميل*, *Prestations & Soins*, *الخدمات والعلاجات*, *Coiffeur*, *مصفف شعر* |

---

## 5. Phased Implementation Roadmap

1. **Phase 1: i18n Dictionary Expansion (`src/utils/i18n.ts`)**:
   - Add all 100+ missing salon, appointment, chair, service, and toast keys across `TRANSLATIONS_EN`, `TRANSLATIONS_FR`, and `TRANSLATIONS_AR`.
   - Add catalog localization helper `getLocalizedService(service, lang)`.

2. **Phase 2: Stylist Schedule Overhaul (`StylistScheduleView.tsx`)**:
   - Integrate `useTranslation()` and replace all hardcoded English headers, view selectors, filters, date labels, and action badges.
   - Localize the Service Catalog view, duration tags, and CSV export column headers.

3. **Phase 3: Salon Dashboard & Chair Workstations (`DashboardScreen.tsx`)**:
   - Localize the live chair workstation cards ("Chair 1 • Sarah", "In Chair", "Available", "Booked").
   - Localize the peak booking hours chart headers and tooltips.
   - Localize salon KPI tiles ("Chair Utilization", "Daily Salon Sales", "Next Bookings Ahead").

4. **Phase 4: Appointment Modal & Intake Polish (`AppointmentModal.tsx`)**:
   - Standardize all modal titles, client intake toggles, validation errors, and status buttons.

5. **Phase 5: Store Toasts & Shared Salon Views (`store.ts`, `ToastStack.tsx`, `MembersScreen.tsx`, `FinanceStaffScreen.tsx`)**:
   - Localize real-time appointment event toasts dispatched by the store.
   - Localize the `appointment_service` intelligence notification pool in `ToastStack.tsx`.
   - Verify stylist role badges and commission labels across staff and client screens.

6. **Phase 6: Verification & Compilation**:
   - Run `lint_applet` (`tsc --noEmit`) and `compile_applet`.
   - Run unit test suite (`npm test`).
