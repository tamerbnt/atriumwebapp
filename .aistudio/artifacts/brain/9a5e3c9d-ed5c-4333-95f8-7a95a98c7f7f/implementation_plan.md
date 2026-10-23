# Implementation Plan - Category-by-Category Standardization

Standardize each business category across Atrium ERP to deliver the exact unified, high-productivity experience established in the Membership category (`ClientsView` & `StaffView` in `MembershipMembersView`).

## User Review Required
> Critical items requiring user attention: None. All modifications are additive and maintain full backwards compatibility with existing state, stores, modals, and workflows.

---

## Rollout Progress & Status

### ✅ Category 1: Venue Rental Category (Completed)
- **`VenueRentersView.tsx`**:
  - Full `UniversalDataCollection<RentalRenter>` integration with cards and list view modes.
  - Multi-column sorting (`renter`, `bookings`, `spent`).
  - Row pinning with visual indicator and persistent top ordering.
  - Multi-select checkbox batch selection with a floating action bar (Selected count, Deselect, Batch Delete).
  - Facility branch switcher pill (`Atrium 1 ▾`) in header.
  - UTF-8 CSV Export with localized headers in Arabic, French, and English.
- **`VenueInventoryView.tsx`**:
  - Full `UniversalDataCollection<RentableUnit>` integration.
  - Multi-unit batch selection with Batch Set Status (`Mark Available`, `Maintenance`), Deselect, and Batch Delete.
  - Facility branch switcher dropdown in header.
  - UTF-8 CSV Export of unit catalog and specifications.
  - Quick booking modal trigger and unit status toggle pills.
- **`VenueBookingsView.tsx`**:
  - Full `UniversalDataCollection<RentalBooking>` integration.
  - Batch selection with Bulk Check-in, Deselect, and Bulk Cancellation.
  - Facility branch switcher dropdown in header.
  - UTF-8 CSV Export of booking manifests.
  - Dual view toggle between Unit Timeline Matrix and Universal Cards/List in `VenueTimelineView`.

---

### ✅ Category 2: Education & Academy Category (Completed)
- **Rich Algerian Academy Mock Presets (`seedData.ts`)**:
  - 20 realistic Algerian students across BAC Maths, Adult learners, and High School, with RFID codes (`RF-9901`..`RF-9920`), guardians, and attendance rates.
  - 8 distinct course cohorts (`cohort_01`..`cohort_08`) spanning German Goethe B1/B2, Full-Stack React & Node, Accelerated BAC Math & Physics, UI/UX Design, Data Science & Python.
  - 20 enrollments across Paid, Partial, and Overdue statuses with tuition fee installments.
  - 8 scheduled classroom sessions with timestamps and instructors.
  - 15 attendance check-in records.
  - 9 cohort grades with weights, scores, and teacher remarks.
  - 14 admission pipeline leads across all stages (`Inquiry`, `PlacementTest`, `TrialClass`, `Admitted`, `Enrolled`, `Declined`).
- **Store & Auto-Healing (`store.ts`)**:
  - Added `resetEduMockData()` for 1-click re-seeding and automatic empty store recovery.
  - Added `updateEduAdmissionLead()` and `deleteEduAdmissionLead()`.
- **`EducationStudentsView.tsx`**:
  - Full `UniversalDataCollection<EduStudent>` with List and Grid view modes.
  - Multi-select batch action toolbar (Batch Graduate, Batch Suspend, Batch Delete).
  - Row pinning (`pinnedIds`), facility switcher pill (`Atrium 1 ▾`), CSV Export, Demo Data button.
  - 100% preservation of the 4-tab 360° Student Slide-over Drawer (Overview, Academic Performance, Attendance History, Tuition & Invoices).
- **`EducationCohortsView.tsx`**:
  - Full `UniversalDataCollection<EduCohort>` with List and Grid view modes.
  - Multi-select batch action toolbar (Batch Start Cohorts, Batch Mark Completed, Batch Delete).
  - Row pinning, facility switcher pill, CSV Export, Demo Data recharge button.
  - 100% preservation of Cohort 360° Drawer with live syllabus milestone check toggles and roster.
- **`EducationAdmissionsView.tsx`**:
  - Dual-view toggle: Kanban pipeline board + `UniversalDataCollection<EduAdmissionLead>` list & cards.
  - Multi-select batch actions (Batch Move to Trial Class, Batch Move to Admitted, Batch Delete).
  - Facility switcher pill, CSV export, Demo Data button, Lead-to-Student conversion modal.
- **`EducationAttendanceView.tsx`**:
  - `UniversalDataCollection<EduStudent>` for attendance roll-call with List & Grid views.
  - Multi-select batch actions (Batch Mark Present, Batch Mark Late, Batch Mark Absent).
  - Gradebook tab with assessment columns, weighted averages, and Record Grade modal.
  - Facility switcher pill, CSV export for Attendance and Gradebook, Demo Data button, RollCallModal integration.
- **`EducationDashboardView.tsx`**:
  - Header facility switcher, 1-click Demo Data recharge button, auto-healing `useEffect`.

---

### ⏳ Category 3: Freelance & Solo Category (Next Up)
- **`FreelanceClientsView.tsx`**: Client directory with project revenue metrics and pinning.
- **`FreelanceDeliverablesView.tsx`**: Deliverables & task matrix.
- **`FreelanceProposalsView.tsx`**: Quotes & proposals registry.
- **`FreelanceInvoicesView.tsx`**: Invoice ledger with batch send/payment recording.

---

### ⏳ Category 4: Membership Category Remaining Screens
- **`MembershipRegistrationsView.tsx`**: Convert lead registry to `UniversalDataCollection` with batch lead status update and CSV export.

---

### ⏳ Category 5: Project Milestone Multi-Role Dashboards
- Standardize Direction, Chef de Projet, Créa, Superviseur, RH, and Compta data tables with `UniversalDataCollection`.

---

## Verification Results
- `compile_applet`: Passed with 0 errors.
- `lint_applet` (`tsc --noEmit`): Passed with 0 errors.
