# Atrium ERP & CRM — Comprehensive Tri-Lingual Localization Master Plan (FR / AR / EN)

> **Document Status**: Priority 1 (Venue & Rental Spaces) **100% COMPLETED** · Ready to execute Priority 2 (Agency & Project Milestone)  
> **Target Languages**: French (`fr` — default commercial/Algerian business), Modern Standard Arabic (`ar` — RTL with official Algerian administrative lexicon), English (`en` — US international baseline)  
> **Active Target Phase**: Phase 2 — **Agency & Project Milestone Vertical (Cat 13)**

---

## 1. Executive Summary & Progress Milestone

### Priority 1: Venue & Rental Spaces (Category 14) is 100% Completed!
All seven core operational screens, modals, and store notifications in the Venue and Rental Spaces vertical have been completely localized across French, Algerian Arabic, and English:
1. **`src/components/screens/venue/VenueDashboardView.tsx`**: Operational KPIs, live room occupancy cards, reservation status tags, and arrival schedules.
2. **`src/components/screens/venue/VenueTimelineView.tsx`**: Visual Gantt timetable, room resource columns, slot hover tooltips, and reservation inspector modal.
3. **`src/components/screens/venue/VenueBookingsView.tsx`**: Reservation pipeline table, balance due calculations, cancellation confirmation, and printable rental voucher passes.
4. **`src/components/screens/venue/VenueInventoryView.tsx`**: Rentable space/unit catalog, add-on technical equipment, surface m² formatting, and rates.
5. **`src/components/screens/venue/VenueRentersView.tsx`**: Renter CRM directory, corporate vs. private account tags, national ID records, spend ledger, and quick booking triggers.
6. **`src/components/screens/venue/VenueFinanceView.tsx`**: Caution escrow ledger, deposit filters, status badges, damage deduction modal, and settlement actions.
7. **`src/components/screens/venue/BookingModal.tsx`**: Multi-step booking form (Space & Date Selection, Renter & Event Details, Add-on Equipment & Services, Security Deposit & Financial Settlement), form validation toasts, and agreement signing.
8. **`src/services/store.ts` (Rental Events)**: Real-time kinetic notifications for Guest Check-in, Space Handover & Checkout, Caution Release, and Caution Damage Deduction fully tri-lingual.
9. **`src/utils/i18n.ts` & `src/utils/useTranslation.ts`**: Upgraded with template variable interpolation (`{var}`) and flexible polymorphic overload signatures.

---

## 2. Updated Vertical Localization Status Matrix

| Vertical / Domain | Category ID | Initial Status | Current Status | Current Progress Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Salon, Spa & Beauty** | Cat 5 (`appointment_service`) | ~98% Completed | **100% Completed** | Stylist schedule, workstations, client CRM, beauty register, services catalog, and modals. |
| **Venue & Rental Spaces** | Cat 14 (`rental_booking`) | ~15% Partial | **100% Completed** | **Phase 1 Complete**: All 7 screens and modals localized with full RTL mirror support, DZD currency formatting, and tri-lingual toasts. |
| **Agency & Project Milestone** | Cat 13 (`project_milestone`) | ~20% Partial | **~35% In Progress** | **Priority 2 (ACTIVE FOCUS)**: Official Algérie Poste CCP SFP 01 slip generator with legal number-to-words in French & Arabic (`algerianPtt.ts`), 58 Wilayas database. Ready for full string localization across all 6 agency roles. |
| **Education & Academy** | Cat 15 (`education_cohort`) | ~35% Partial | **~50% In Progress** | **Priority 3 queued**: Navigation and `EducationDashboardView` integrated with `useTranslation`. Next: `RollCallModal`, `CertificateModal`, student 360° drawer, and tuition payment views. |
| **Freelance & Solo Studio** | Cat 16 (`freelance_solo`) | ~75% Substantial | **~85% Substantial** | **Priority 4 queued**: Client CRM, deliverables Kanban, stopwatch tracker, proposals, tax simulator, invoices hub. |
| **POS & Retail Inventory** | Cat 6 (`pos_inventory`) | ~60% Substantial | **~65% Substantial** | **Priority 5 queued**: Store register, catalog, barcode search inputs, checkout flow. |
| **Gym & Fitness Membership** | Cat 1 (`membership_session`) | ~80% Substantial | **~85% Substantial** | **Priority 6 queued**: Members directory, pulse dashboard, turnstile logs, intake modals, DZD payment methods. |
| **Core Layout & System Modals** | Global | ~85% Substantial | **~90% Substantial** | TopBar, Sidebar, ToastStack, PowerOnboarding, DesktopUpgradeModal. |

---

## 3. Immediate Target: Priority 2 — Agency & Project Milestone (Cat 13)

### Scope of Agency Roles & Deliverables:
1. **`src/components/screens/project/ProjectComptaView.tsx`**:
   - Double-lock payroll approval (Direction + Compta).
   - Animator payment ledger across 58 wilayas.
   - Algérie Poste CCP SFP 01 batch generator triggers.
   - Scanned expense receipt audit and coded equipment inventory.
2. **`src/components/screens/project/ProjectDirectionView.tsx`**:
   - Executive dashboard, project charter creation, client contract approval, budget commitment graphs.
3. **`src/components/screens/project/ProjectChefProjetView.tsx`**:
   - Project manager portfolio, print catalog (Grammage, Pelliculage, Tirage), BAT tracking (`En attente BAT`, `BAT Validé Client`), supplier orders.
4. **`src/components/screens/project/ProjectCreaView.tsx`**:
   - Creative studio Kanban, key visual briefs, asset format upload tags (`PSD`, `AI`, `PDF HD`, `MP4`).
5. **`src/components/screens/project/ProjectSuperviseurView.tsx`**:
   - Field activations, supermarket promoter GPS roll call, petty cash transport/catering logs.
6. **`src/components/screens/project/ProjectRhView.tsx`**:
   - 58 Wilayas talent pool, biometric casting profiles, national ID records (NIN).
7. **`src/components/screens/project/MobilePhoneSimulator.tsx`**:
   - On-site promoter smartphone simulator interface for GPS check-in and selfie attendance.

---

## 4. Verification & Validation Protocol

- **Linter Check**: `tsc --noEmit` must pass with 0 errors.
- **Test Suite**: `npm test` runs 11/11 passing tests for Algerian postal checks, voucher tiers, money formatting, and category mapper.
- **Compilation**: `compile_applet` confirms zero build issues.
- **RTL & Typography**: Dynamic CSS direction switches cleanly between `ltr` and `rtl` with native Arabic Cairo typography when selecting Arabic (`ar`).
