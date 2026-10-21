# Master Tri-Lingual Localization & Settings Screen Remediation Plan

Comprehensive audit and implementation architecture for full tri-lingual parity (French, Arabic, English) across all application screens, modals, POS receipts, and settings diagnostics in Atrium ERP & CRM.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the interactive interview:
> - **Technical Settings & Diagnostics**: Full localization across all cards (database schema, WebSocket broadcast listeners, local encrypted storage engine, and tenant quotas) in Arabic, French, and English rather than leaving them in raw English.
> - **POS Customer Receipts & Financial Summaries**: Bilingual format with Algerian Dinar (`د.ج / DZD`) and Arabic headers for customer receipts, slips, and financial exports.

- **Confirmed Decision 1**: All 27 hardcoded text nodes and section titles in `SettingsScreen.tsx` will be wired to `t('...')` keys in `src/utils/i18n.ts`.
- **Confirmed Decision 2**: Thermal customer receipts in `ShopScreen.tsx` and billing ledgers in `EducationFinanceView.tsx` will render in a professional bilingual Maghrebi format (`المجموع الفرعي / SOUS-TOTAL`, `الخصم / REMISE`, `المجموع المدفوع / TOTAL PAYÉ`, `طريقة الدفع / MODE DE PAIEMENT`).
- **Confirmed Decision 3**: Cloud sync badges, onboarding steps, and remaining modal text across all 7 business verticals will achieve 100% dictionary completeness with zero raw English leaks in French and Arabic sessions.

---

## 1. Overview & Core Concept

Atrium ERP & CRM is designed as a pan-Maghrebi, multi-vertical business operating system supporting French, Modern Standard Arabic (with North African business context), and English. 

While the dictionary in `src/utils/i18n.ts` already houses over 2,650 fully balanced translation keys, several screens—most notably `SettingsScreen.tsx`—bypassed the dictionary and rendered hardcoded English JSX strings. Furthermore, thermal POS receipts and cloud diagnostics lacked localized rendering when switching to Arabic or French.

This plan establishes 100% localization parity across the entire application, eliminating all remaining hardcoded strings, ensuring bidirectional layout integrity, and providing seamless language switching.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Settings Screen Localization**:
   - When switching to Arabic (`ar`), the entire Settings view reflects authentic Algerian administrative vocabulary (`الفروع والمرافق الفعلية`, `إدارة التراخيص وصلاحيات الاستخدام`, `قاعدة بيانات سوبابيس السحابية والمزامنة الحية`, `مركز النسخ الاحتياطي واستعادة البيانات`).
   - When switching to French (`fr`), the interface renders standard commercial French (`Succursales et installations physiques`, `Droit de licence actif`, `Base de données cloud Supabase`, `Centre de sauvegarde et reprise d'activité`).
   - In English (`en`), the clean spatial typography remains sharp and responsive.

2. **Bilingual Thermal POS Receipt Flow**:
   - Upon completing a checkout or printing a receipt from `ShopScreen.tsx`, the printed docket dynamically adapts:
     - In Arabic sessions: renders dual Arabic/French line headers with `د.ج` currency and Western Arabic numerals (standard in Algeria).
     - In French sessions: standard French commercial receipt format (`TTC`, `Espèces`, `BaridiMob / Carte Dahabia`).
     - In English sessions: standard English POS receipt format.

3. **TopBar & Global Navigation**:
   - Connection badges (`Cloud Synced`, `Offline Fallback`, `Hybrid / Local`) and the facility switch dropdown reflect the active language without any English leaks.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full Localization of Settings Technical Cards**
  - *Chosen Approach*: Translate technical concepts into natural French and Arabic terms (e.g. `عزل المستأجرين RLS متعدد المنشآت`, `مستمع البث الحي عبر WebSockets`, `محرك التخزين المحلي المشفر`) while keeping standard database engine names (PostgreSQL, Supabase, LocalStorage v2) as clear technical monikers.
  - *Why*: Delivers an authentic enterprise product feel for Arabic-speaking business owners without confusing developers.
  - *Alternatives Considered*: Leaving all database cards in English (rejected by user preference).

- **Decision 2: Bilingual Customer Receipts in Arabic Mode**
  - *Chosen Approach*: Display customer receipts with dual Arabic/French labels alongside Algerian Dinar (`د.ج / DZD`).
  - *Why*: Matches real-world Algerian commercial regulations (Code de Commerce and tax requirements) where retail dockets and invoices are commonly bilingual.

- **Decision 3: Zero-Overhead Component-Level Translation**
  - *Chosen Approach*: Hook existing pre-translated keys in `src/utils/i18n.ts` directly into `SettingsScreen.tsx` and augment dictionary for any remaining elements.
  - *Why*: Minimizes bundle size, preserves instantaneous reactivity without async translation latency, and ensures offline capability.

---

## 4. Technical Architecture & System Audit

### System Localization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       useAtriumStore                        │
│             (language: 'ar' | 'fr' | 'en')                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │  src/utils/i18n.ts  │         │ documentElement.dir │
    │ (2,650+ keys: AR/FR)│         │     ('rtl'|'ltr')   │
    └──────────┬──────────┘         └──────────┬──────────┘
               │                               │
 ┌─────────────┼───────────────────────────────┼─────────────┐
 │             ▼                               ▼             │
 │  ┌──────────────────────┐       ┌──────────────────────┐  │
 │  │  SettingsScreen.tsx  │       │     ShopScreen       │  │
 │  │ - License Entitlement│       │ - Bilingual Receipts │  │
 │  │ - Supabase Cloud Card│       │ - POS Keypad & Cart  │  │
 │  │ - Data Backup Center │       └──────────────────────┘  │
 │  │ - Physical Branches  │       ┌──────────────────────┐  │
 │  │ - POS Terminals      │       │   Education Views    │  │
 │  └──────────────────────┘       │ - Attendance/Cohorts │  │
 │  ┌──────────────────────┐       │ - Ledger & AR Radar  │  │
 │  │ Auth & Onboarding    │       └──────────────────────┘  │
 │  │ - LoginScreen        │       ┌──────────────────────┐  │
 │  │ - OnboardingWizard   │       │   Venue & Modals     │  │
 │  │ - TopBar Badges      │       │ - CloudSync & Escrow │  │
 │  └──────────────────────┘       └──────────────────────┘  │
 └───────────────────────────────────────────────────────────┘
```

### Granular Audit of Target Files & Action Plan

| Component / File | Unlocalized Nodes | Specific Remediation Action |
| :--- | :---: | :--- |
| `src/components/screens/SettingsScreen.tsx` | 27 | Wire `settings_license_entitlement`, `settings_lifetime_badge`, `settings_trial_badge`, `settings_supabase_title`, `settings_branches_title`, `settings_terminals_title`, `settings_get_desktop`, `settings_redeem_voucher`, and translate data backup / live storage breakdown cards. |
| `src/components/screens/ShopScreen.tsx` | 7 | Localize thermal POS customer receipt (`CUSTOMER`, `SUBTOTAL`, `DISCOUNT`, `TOTAL PAID`, `METHOD`) into bilingual format (`د.ج / DZD`). |
| `src/components/layout/TopBar.tsx` | 11 | Localize cloud status badges (`Cloud Synced`, `Offline Fallback`, `Hybrid / Local`) and "Add Facility or Branch" action menu. |
| `src/components/auth/LoginScreen.tsx` | 13 | Localize "Remember this terminal", "Sign In to Atrium", "Security Credential", and fast-switch demo badges. |
| `src/components/auth/OnboardingWizard.tsx` | 13 | Localize wizard headers, stepper stage titles (`Owner`, `Category`, `Terminal`, `License`), and free trial vs prepaid voucher cards. |
| `src/components/auth/PowerOnboardingScreen.tsx` | 10 | Localize stepper navigation buttons ("Back", "Continue"), setup headings, and search suggestion badges. |
| `src/components/screens/education/EducationCohortsView.tsx` | 4 | Localize card metrics: "Instructor", "Classroom", "Tuition Fee", "Seats Filled". |
| `src/components/screens/education/EducationFinanceView.tsx` | 7 | Localize "Print Ledger", "Contracted Billed", "Paid / Balance", "Learner", and "Cohort / Course". |
| `src/components/screens/education/EducationStudentsView.tsx` | 2 | Localize "No Active Cohort" and guardian relationship "Adult / Self". |
| `src/components/screens/venue/VenueCloudSyncModal.tsx` | 7 | Localize category sync cards ("Rentable Spaces", "Reservations", "Renters & Clients", "Caution Escrow"). |

---

## 5. Execution Verification Steps

1. **Settings Screen Verification**: Switch between French, Arabic, and English to verify that all license banners, quota counts, Supabase diagnostics, and data recovery panels update instantly without raw English text.
2. **Thermal Receipt Verification**: Perform a test checkout in POS `ShopScreen.tsx` and click "Print Receipt" in Arabic mode to verify bilingual headers and proper DZD formatting.
3. **Onboarding & TopBar Verification**: Verify that TopBar cloud status tooltips and onboarding steps adhere strictly to the selected language.
4. **Compilation & Typecheck**: Run `npm test`, `lint_applet`, and `compile_applet` to ensure zero regressions.
