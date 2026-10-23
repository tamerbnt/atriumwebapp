# Multi-Vertical Rollout Plan: Client & Member Collections

A comprehensive architectural rollout plan for applying `UniversalDataCollection<T>` across all client and member screens in Atrium's 7 business verticals. Following the successful deployment and verification of the Staff reference implementation in `MembershipFinanceView.tsx`, this plan defines the integration patterns, custom action slots, and drawer preservation rules for the next phase.

Per instructions, **no application code is modified in this planning phase**.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Strategic Choices**:
> - **Prioritized Rollout Target**: Client and member collections across all verticals (`MembershipMembersView`, `AppointmentClientsView`, `VenueRentersView`, `EducationStudentsView`, `FreelanceClientsView`, `ProjectRhView`).
> - **Action Architecture**: 100% preservation of all existing drawer and modal trigger buttons (e.g. 360° slide-out client profile drawer, QR pass generator, attendance logs, subscription renewals, SMS reminders, and contract downloads).
> - **Execution Posture**: Plan ready for review and awaiting your upcoming document and signal before initiating any code edits.

---

### 1. Overview & Rollout Scope

The universal collection engine (`src/components/ui/collection/`) is verified and ready to be connected to the client/member entities across each vertical:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          UniversalDataCollection<T>                         │
│   (List View: 46px Action Strip | Grid View: 6-Button Corner-Fan Arc)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│ Gym Members      │          │ Salon Clients    │          │ Space Renters    │
│ (Membership)     │          │ (Appointment)    │          │ (Venue & Event)  │
│ • QR Check-in    │          │ • History Drawer │          │ • Lease Document │
│ • 360° CRM Drawer│          │ • Book Next Slot │          │ • Access Keycode │
└──────────────────┘          └──────────────────┘          └──────────────────┘
         │                             │                             │
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│ Academy Students │          │ Freelance Client │          │ Agency Talents   │
│ (Education)      │          │ (Contractors)    │          │ (Project RH)     │
│ • Cohort Badge   │          │ • Retainer Status│          │ • Skill Tags     │
│ • Attendance Log │          │ • Invoice Drawer │          │ • Mission Pay    │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

---

### 2. Vertical-by-Vertical Client & Member Integration Specification

#### A. Membership Vertical (`src/components/screens/membership/MembershipMembersView.tsx`)
- **Entity**: `Member` (Name, Plan, Check-in status, Expiry, Attendance frequency, Balance, QR code).
- **List View Columns**:
  - `Member Info`: Avatar (96px/initials), Name, Email pill with click-to-copy, Phone pill.
  - `Membership Tier`: Plan badge (Gold, Silver, Platinum), Monthly dues.
  - `Activity & Expiry`: Expiry date, Last check-in time (`font-mono tabular-nums`).
  - `Status`: Live pulsating dot (active green, frozen cyan, expired red).
- **Preserved Actions (Action Strip & Corner-Fan)**:
  1. *View Details (👁)*: Opens existing 360° Member Slide-Out Drawer.
  2. *Edit (✏)*: Opens Member Edit modal.
  3. *QR Check-in Pass (📱)*: Displays member QR pass for turnstile scanning.
  4. *Freeze/Renew (❄/🔄)*: Toggles membership pause or 30-day renewal.
  5. *Pin (📌)*: Pins VIP members to the top of the collection.
  6. *Delete (🗑)*: Context menu red item with confirmation dialog.

#### B. Appointment Vertical (`src/components/screens/appointment/AppointmentClientsView.tsx`)
- **Entity**: `Client` (Name, Preferred stylist, Last visit, Next appointment, Lifetime spend, Notes).
- **List View Columns**:
  - `Client Info`: Photo/Initials, Client Name, Contact pills.
  - `Preferred Stylist`: Assigned specialist badge.
  - `Visits & Revenue`: Total bookings counter, Lifetime spend (`tabular-nums`).
  - `Status`: Booking status indicator.
- **Preserved Actions**:
  1. *View Profile (👁)*: Opens Salon Client History & Formulas drawer.
  2. *Quick Book (📅)*: Schedules new appointment directly for client.
  3. *Send Reminder (💬)*: Triggers SMS / WhatsApp appointment confirmation.
  4. *Pin (📌)*: VIP client marking.
  5. *Delete (🗑)*: Archive client record.

#### C. Venue & Event Rental (`src/components/screens/venue/VenueRentersView.tsx`)
- **Entity**: `Renter` (Company/Individual, Hall/Room rented, Security deposit, Lease active dates, Keycode).
- **List View Columns**:
  - `Renter & Org`: Avatar, Organization name, Contact lead.
  - `Allocated Space`: Room / Hall identifier pill, capacity tier.
  - `Lease Window`: Check-in & Check-out date ranges (`tabular-nums`).
  - `Deposit State`: Cleared green vs. Pending amber.
- **Preserved Actions**:
  1. *Contract & Terms (📄)*: Downloads or displays signed PDF agreement.
  2. *Digital Keycode (🔑)*: Generates door access PIN for smart locks.
  3. *Inspect Log (📋)*: Opens check-in/check-out condition checklist.

#### D. Education & Academy (`src/components/screens/education/EducationStudentsView.tsx`)
- **Entity**: `Student` (Name, Cohort/Class, Grade/Level, Attendance %, Guardian contact, Tuition state).
- **List View Columns**:
  - `Student Profile`: Avatar, Full name, Guardian phone pill.
  - `Enrolled Cohort`: Cohort badge, Instructor name.
  - `Attendance`: Attendance rate percentage with progress bar.
  - `Tuition`: Paid / Outstanding pill.
- **Preserved Actions**:
  1. *Report Card (🎓)*: View academic progress and rubric marks.
  2. *Mark Attendance (✓)*: Quick roll-call toggle.
  3. *Tuition Receipt (🧾)*: Opens payment receipt modal.

#### E. Freelance & Studio (`src/components/screens/freelance/FreelanceClientsView.tsx`)
- **Entity**: `FreelanceClient` (Company, Project pipeline, Retainer status, Total invoiced, Unpaid balance).
- **List View Columns**:
  - `Client Account`: Logo/Avatar, Company Name, POC.
  - `Active Deliverables`: Open milestone count, In-progress tasks.
  - `Financial Ledger`: Outstanding balance, Total billed (`tabular-nums`).
- **Preserved Actions**:
  1. *Client Dashboard (👁)*: Opens full client workspace drawer.
  2. *Create Invoice (💳)*: Generates new Stripe/bank invoice for client.
  3. *Log Hours (⏱)*: Quick time-tracking logger.

#### F. Project & Agency (`src/components/screens/project/ProjectRhView.tsx`)
- **Entity**: `Talent / Freelancer` (Name, Specialization, Daily rate, Mission status, Rating, Slip batches).
- **List View Columns**:
  - `Talent Profile`: Headshot, Name, Seniority level.
  - `Skills & Tags`: Primary capabilities.
  - `Rate & Missions`: Daily rate in EUR/USD, Active project assignments.
  - `Slip Status`: CCP payment status.
- **Preserved Actions**:
  1. *Talent Dossier (👁)*: Complete CV, portfolio links, and past missions.
  2. *Assign Mission (🎯)*: Direct project assignment modal.
  3. *Release Payment (💶)*: Approves CCP slip payout.

---

### 3. Component Architecture & State Preservation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Screen Controller (e.g. MembersScreen)                 │
│                                                                             │
│  State: items, selectedIds, searchQuery, filterTab, activeDrawerItem        │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    UniversalDataCollection<Member>                    │  │
│  │                                                                       │  │
│  │  • mode: 'list' | 'grid' (Synced to user preference / state)          │  │
│  │  • columns: Member column definitions                                 │  │
│  │  • customActions: [ { id: 'qr', onClick: openQrModal }, ... ]         │  │
│  │  • onViewDetails: (m) => setActiveDrawerMember(m)                     │  │
│  │  • onEdit: (m) => openEditModal(m)                                    │  │
│  │  • onTogglePin: (m) => handlePinMember(m.id)                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    360° Member Slide-Out Drawer                       │  │
│  │   (Rendered conditionally when activeDrawerMember !== null)           │  │
│  │   Preserves subscriptions, payments, attendance history, notes        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. Implementation Phasing Strategy (When Directed to Proceed)

1. **Step 1: Membership Members (`MembershipMembersView.tsx`)**:
   - Connect `UniversalDataCollection<Member>`.
   - Wire existing 360° slide-out drawer, QR pass modal, and filter tabs.
   - Verify both List View (46px expanding strip) and Grid View (corner-fan spray).
2. **Step 2: Salon Appointment Clients (`AppointmentClientsView.tsx`)**:
   - Connect `UniversalDataCollection<Client>`.
   - Wire client history modal, appointment booking trigger, and formula cards.
3. **Step 3: Venue Renters, Education Students, Freelance Clients, and Agency RH**:
   - Standardize remaining vertical member/client screens while retaining all unique business logic.
4. **Step 4: Quality Verification**:
   - Full build compilation (`compile_applet`), strict TypeScript check (`lint_applet`), and test execution (`npm test`).
