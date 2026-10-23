# Multi-Vertical Rollout Plan: Bookings, Reservations & Appointment Sessions

Standardize booking, reservation, and appointment session collections across Atrium ERP & CRM using `UniversalDataCollection<T>`, providing dual-view capability (visual cards & high-density tables), quick status transitions (Check-in, Check-out, In-Chair, Completed), pinning, sorting, and batch actions.

---

## 1. Scope & Target Components

### A. Venue & Space Bookings (`VenueBookingsView.tsx`)
- **Entity**: `RentalBooking`
- **Current State**: Static HTML table with manual status tabs and separate action buttons.
- **Target Architecture**:
  - Replace static `<table>` with `UniversalDataCollection<RentalBooking>`.
  - **Dual View Modes**:
    - **List Mode**: High-density operational ledger showing Event & Renter, Space Unit, Date Window, Financials & Balance Due, Security Caution, Status, and Actions.
    - **Grid Mode**: Visual booking cards displaying space badges, client info, time window, caution status, and financial progress bar.
  - **Quick Status Transitions**:
    - One-click Check-in / Check-out (`checkInBooking`, `checkOutBooking`).
    - Quick status cycle between Tentative, Confirmed, CheckedIn, Completed.
  - **Custom Action Arc**:
    - Quick Check-in/Check-out trigger (`CheckCircle2` / `ShieldCheck`).
    - Print Booking Agreement / Receipt (`Printer`).
    - Edit Booking Modal (`Edit2`).
    - Pin to top (`Pin`).
    - Delete with confirmation (`Trash2`).
  - **Multi-Column Sorting**: Event/Purpose, Renter Name, Date Window, Total Amount, Balance Due, Status.
  - **Multi-Select**: Multi-selection state (`selectedBookingIds`) with batch actions.

### B. Appointment Sessions & Salon Schedule (`AppointmentScheduleView.tsx`)
- **Entity**: `Appointment`
- **Current State**: Contains a multi-stylist column timeline board (`columns`), a basic list view (`list`), and a services catalog view (`catalog`). The list view lacks sorting, pinning, and card view switching.
- **Target Architecture**:
  - Enhance `viewMode === 'list'` with `UniversalDataCollection<Appointment>`.
  - Preserves the Column Schedule Gantt board (`viewMode === 'columns'`) as the default calendar view.
  - In `list` mode, provide both table and card views for appointments:
    - **Columns**: Time & Duration, Client & Phone, Service & Category, Stylist / Staff Member, Price, Status.
    - **Cards**: Rich appointment cards with client initials avatar, service details, price tag, and quick checkout button.
  - **Quick Workflow Actions**:
    - One-click Checkout (`handleOneClickCheckout`).
    - Status toggle to `InChair` (active service) or `Completed`.
    - Edit Appointment Modal (`handleOpenEditModal`).
    - Pin high-priority appointments to the top of the day's queue.
  - **Multi-Column Sorting**: Time, Client Name, Stylist, Service, Price, Status.

---

## 2. Key Architecture & Design Principles

1. **Anti-Slop & Zero-Pill Discipline**:
   - Status indicators utilize semantic, restrained badges (emerald for completed/confirmed, amber for tentative/in-chair, neutral for cancelled).
   - Numerical figures (amounts, durations, attendee counts, guest limits) formatted with `tabular-nums` and font-mono where appropriate.
2. **Zero Functional Loss**:
   - Preserves all existing modal flows: `BookingModal`, `VenueCloudSyncModal`, `AppointmentModal`, and receipt printing dialogs.
   - Retains facility/branch switching, date pickers, seek bars, and summary metric KPI headers.
3. **Trilingual & RTL Continuity**:
   - Retains full English, French, and Arabic RTL alignment and localized labels.

---

## 3. Implementation Steps

1. **Venue Bookings (`VenueBookingsView.tsx`)**:
   - Import `UniversalDataCollection, ColumnDefinition` from `'../../ui/collection'`.
   - Add state: `selectedBookingIds`, `pinnedBookingIds`, `bookingSortBy`, `bookingSortDir`.
   - Define `sortedBookings` with pinned items floating to the top.
   - Define `bookingColumns` (Event & Renter, Space Unit, Date Window, Financials, Caution Guarantee, Status).
   - Define `renderCard` for grid view.
   - Wire `customActions` for Quick Check-in/Check-out and Print Agreement.
   - Replace lines 139–285 with `<UniversalDataCollection<RentalBooking> ... />`.

2. **Appointment Sessions (`AppointmentScheduleView.tsx`)**:
   - Import `UniversalDataCollection, ColumnDefinition` from `'../../ui/collection'` and `Pin` from `'lucide-react'`.
   - Add state: `selectedAptIds`, `pinnedAptIds`, `aptSortBy`, `aptSortDir`.
   - Define `sortedAppointments` and `appointmentColumns`.
   - Replace the basic list view in `viewMode === 'list'` with `<UniversalDataCollection<Appointment> ... />`.
   - Wire one-click checkout, `InChair` status toggle, and edit modal.

3. **Verification**:
   - Run `lint_applet` (`tsc --noEmit`) to verify clean type checking.
   - Run `compile_applet` to confirm Vite production bundle compilation.
   - Run `run_command` with `npm test` to ensure all 12 test suites in `rules.test.ts` pass without regressions.
