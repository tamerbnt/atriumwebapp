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
  - 100% preservation of the 4-tab 360° Student Slide-over Drawer.
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

### ✅ Category 3: Freelance & Solo Category (Completed)
- **`FreelanceClientsView.tsx`**:
  - Full `UniversalDataCollection<FreelanceClient>` integration with List view and Grid Cards modes.
  - Multi-column sorting (`client`, `projects`, `rate`, `revenue`).
  - Row pinning (`pinnedIds`) with kinetic top ordering and pin badge.
  - Multi-select checkbox batch selection with a floating action bar (Selected count, Deselect, Batch Set Retainer, Batch Set Project, Batch Delete).
  - Facility branch switcher pill (`Studio Main ▾`) in header.
  - Multi-lingual UTF-8 CSV Export (`\uFEFF`) with Algerian/international currency and contact columns.
  - 1-click Demo Data recharge button (`Sparkles` icon calling `resetFreelanceMockData`) and auto-healing `useEffect`.
  - 100% preservation of the 360° Client Slide-over Drawer (Deliverables, Invoices, Time Logs, Proposal History) and client creation modal.
- **`FreelanceDeliverablesView.tsx`**:
  - Dual-view toggle: 5-Stage Kanban Board (`Briefing`, `InProgress`, `ClientReview`, `Approved`, `Billed`) + `UniversalDataCollection<FlatDeliverableItem>` (List and Grid modes).
  - Multi-select batch actions toolbar (Batch Move to Stage, Batch Delete Deliverables).
  - Row pinning, facility switcher pill, UTF-8 CSV Export of deliverable backlog, 1-click Demo Data recharge button.
  - 100% preservation of 6-button corner fan, sprint timers, and deliverable creation modal.
- **`FreelanceProposalsView.tsx`**:
  - Full `UniversalDataCollection<FreelanceProposal>` integration with Grid and List views.
  - Multi-select batch actions (Batch Accept Proposals, Batch Decline, Batch Delete).
  - Row pinning, facility switcher pill, UTF-8 CSV Export, Demo Data recharge button.
  - 1-click "Convert to Project" action and proposal modals preserved.
- **`FreelanceInvoicesView.tsx`**:
  - Full `UniversalDataCollection<FreelanceInvoice>` integration with List and Grid views.
  - Multi-select batch actions (Batch Mark Paid, Batch Mark Sent, Batch Delete).
  - Row pinning, facility switcher pill, UTF-8 CSV Export, Demo Data recharge button.
  - 100% preservation of `InvoicePreviewModal` with Algerian bank BEA / BaridiMob coordinates and PDF print actions.
- **`FreelanceTimeTrackerView.tsx` ("Chronomètre & Journal des Heures")**:
  - Full `UniversalDataCollection<TimeLogEntry>` integration for the timesheet ledger (List view and Grid Cards modes).
  - Multi-select batch action toolbar (Selected counter, Deselect, Batch Bill Selected to Client invoices, Batch Delete Logs).
  - Row pinning (`pinnedLogIds`) with visual indicator, multi-column sorting (`date`, `client`, `duration`, `rate`, `status`).
  - Seek kinetic search, UTF-8 CSV Export (`\uFEFF`) of all logged hours with localized headers.
  - Header facility switcher dropdown (`Studio Main ▾`), 1-click Demo Data recharge button (`Sparkles`), and auto-healing `useEffect`.
  - 100% preservation of digital chronometer console, Pomodoro mode, manual time logging modal, edit modal, and delete confirmation.
- **`FreelanceFinanceView.tsx` ("Santé Financière & Provisions Fiscales")**:
  - Full `UniversalDataCollection<FreelanceExpense>` integration for operational overhead & subscriptions (List and Grid modes).
  - Multi-select batch action toolbar (Selected counter, Deselect, Batch Delete Expenses).
  - Row pinning (`pinnedExpenseIds`), multi-column sorting (`vendor`, `category`, `amount`, `date`, `deductible`).
  - Multi-currency cashflow inflows (EUR SEPA, USD Wire, DZD BaridiMob/CCP) and interactive flat tax rate reserve slider (0% to 35%).
  - Header facility switcher dropdown, 1-click Demo Data recharge button, auto-healing `useEffect`, and UTF-8 CSV Export.
  - Expense creation modal preserved.
- **`FreelanceDashboardView.tsx`**:
  - Header facility switcher dropdown, 1-click Demo Data recharge button, auto-healing `useEffect`, and hero KPI metrics.

---

### ✅ Category 4: Membership Category Remaining Screens (Completed)
- **`MembershipRegistrationsView.tsx`**:
  - Full `UniversalDataCollection<RegistrationLead>` integration with List view and Grid Cards modes.
  - Multi-select batch action toolbar (Selected counter, Deselect, Batch Approve & Convert, Batch Decline, Batch Delete).
  - Multi-column sorting (`applicant`, `source`, `plan`, `date`, `status`) and row pinning (`pinnedLeadIds`).
  - Facility switcher dropdown pill (`Atrium 1 ▾`), Seek kinetic search, UTF-8 CSV Export with localized headers.
  - 100% preservation of 360° Lead Inspector Slide-over Drawer, intake velocity KPI cards, and RFID-generating Member Conversion Modal.
  - Added `deleteLead` helper to store for single and batch deletion.

---

### ⏳ Category 5: Project Milestone Multi-Role Dashboards (Next Up)
- **`ProjectDirectionView.tsx`**: Portfolio executive overview, budget allocations, client billing, and milestone sign-offs.
- **`ProjectChefProjetView.tsx`**: Mission gantt/matrix, BAT tracking, print order progress, and team dispatch.
- **`ProjectCreaView.tsx`**: Deliverables board, BAT proofs, client revisions, and asset upload manifests.
- **`ProjectSuperviseurView.tsx`**: Field deployment check-ins, site attendance, spot verifications, and incident logs.
- **`ProjectRhView.tsx`**: Talent database, contract statuses, daily rate logs, and identity verifications.
- **`ProjectComptaView.tsx`**: Expense registry, CCP slips generator, fee disbursement batches, and cashflow reports.

---

## Verification Results
- `compile_applet`: Passed with 0 errors.
- `lint_applet` (`tsc --noEmit`): Passed with 0 errors.
