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

### ⏳ Category 2: Education & Academy Category (Next Up)
- **`EducationStudentsView.tsx`**: Student directory with cohorts filter, batch graduation/enrollment, pinning, and CSV export.
- **`EducationCohortsView.tsx`**: Course cohorts catalog with batch capacity and status actions.
- **`EducationAdmissionsView.tsx`**: Admission applications table with batch approve/decline and CSV export.
- **`EducationAttendanceView.tsx`**: Attendance sessions and student roll-call records.

---

### ⏳ Category 3: Freelance & Solo Category
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
- `compile_applet`: Passed.
- `tsc --noEmit`: Passed with 0 errors.
- `npm test`: All 12/12 unit and architecture tests passed.
