# Appointment & Service Category Implementation Plan (Atrium ERP & CRM)

Comprehensive architectural blueprint to complete the Appointment & Service category (`appointment_service`, e.g. Luxe Beauty Lounge & Spa) across all shared modules in Atrium ERP & CRM, ensuring strict data isolation per facility while providing seamless vertical switching and salon-tailored workflows.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1:
> - **Client Profile & Appointment History**: The shared Client slide-in inspector will display the client's past booking history and upcoming scheduled treatments alongside their service packages.
> - **Dashboard Adaptation**: When the active facility is an appointment vertical, the Dashboard will feature full salon operational metrics, including stylist chair statuses (`In Chair`, `Available`, `Scheduled`), today's bookings, and daily service revenue.
> - **POS Checkout Flow**: 1-click checkout from the scheduler chair or booking card that directly generates a completed sale in the salon's transaction ledger with stylist/practitioner attribution.

---

## 1. Overview & Core Concept

### What It Does
Atrium ERP & CRM supports 6 business verticals. The **Appointment & Service** category (`appointment_service`) empowers salons, spas, barbershops, and clinics with a multi-practitioner column schedule, time slot booking, chair workflow (`Confirmed` → `In Chair` → `Completed`), and service treatment catalogs. 

Crucially, **it shares the exact same core screens** as the Membership vertical (`Members/Clients`, `Registrations/Inquiries`, `POS Shop`, `Finance & Staff`, `History`, and `Dashboard`), but **data is strictly separated by `facilityId` / `branch_id`** and the UI dynamically adapts its terminology, metrics, filters, and actions.

### Target Audience & Persona
- **Salon Owners & Front Desk Managers**: Managing appointments, stylist columns, client check-ins, product retail sales, and staff payroll.
- **Stylists, Colorists, & Technicians**: Tracking their daily chair schedule, booked services, and client notes.

### Key Value
- **Zero Data Leakage**: Gym members and fitness classes never mingle with salon clients, beauty products, or stylist bookings.
- **Context-Aware Screens**: A single unified codebase adapts from Gym terminology ("Members", "Supplements", "Classes") to Salon terminology ("Clients", "Beauty Care", "Booking Calendar") smoothly.

---

## 2. User Experience & Visual Design

### Key User Flows

#### 1. Facility & Vertical Switching
- Selecting **Luxe Beauty Lounge & Spa (Hydra)** in the facility pill dropdown instantly switches `currentBusinessId` and `currentBranchId`.
- The sidebar immediately updates labels ("Clients", "Beauty Store", "Booking Calendar").
- All screens reload their scoped dataset for Hydra branch with zero page reload or flash.

#### 2. Booking Sheet & Chair Workflow (Scheduler)
- Accessing **Schedule** in Salon mode opens `StylistScheduleView`.
- Multi-column timeline displays active practitioners (Sarah Louati, Leila Mansouri, Yasmine Chergui, Amina Haddad).
- Clicking any open slot pre-fills `AppointmentModal` with time, practitioner, and date.
- Booking options allow selecting an existing client or rapid walk-in intake.
- When client arrives: clicking **"Start Treatment"** moves status to `In Chair` (highlighted in warm amber with a pulsing active badge).
- When treatment finishes: clicking **"Check Out"** executes a 1-click checkout, marking the booking `Completed` and posting a `Sale` to the salon POS history with stylist attribution.

#### 3. Shared Client Management (`MembersScreen`)
- Adapts header and table to **Clients** (`terminology.members`).
- Table displays client name, service package (e.g. `VIP Hair & Spa Package`, `Royal Bridal Haute Coiffure`), contact info, and status.
- Clicking a client opens the **390px Slide-in Inspector**:
  - Displays client contact details and active package.
  - **Appointment Ledger section**: Lists upcoming appointments and past treatments (e.g., "Balayage & Gloss Finish with Sarah Louati").
  - Quick action: "Book Next Treatment".

#### 4. Shared Intake & Inquiries (`RegistrationsScreen`)
- Adapts to **Inquiries & Consultation Requests**.
- Lists incoming web/walk-in leads for beauty services (e.g. wedding consultation, balayage inquiry).
- Conversion action converts an inquiry into an active Client with their chosen Service Package.

#### 5. Shared Beauty Store & POS (`ShopScreen`)
- Displays salon retail products (Kérastase oils, Olaplex treatments, argan hair serums, rose mists).
- Category filter offers **Hair Care**, **Skin Care**, **Nails**, **Retail**, and **Service Items** instead of gym supplements.
- Fast POS register calculates total and prints salon-branded receipt.

#### 6. Shared Finance & Staff (`FinanceStaffScreen`)
- Displays salon team with practitioner titles (**Master Stylist**, **Senior Colorist**, **Nail Artist**, **Esthetician**).
- Tracks monthly salary, payment days, and allowed module access.

#### 7. Salon-Tailored Dashboard (`DashboardScreen`)
- Replaces gym attendance counters with **Today's Bookings**, **Chairs In Service**, **Available Stylists**, and **Daily Salon Revenue**.
- Activity feed displays real recent appointments and product sales for the salon.
- Quick Actions button offers **"New Appointment / Walk-in"** and **"New Client Intake"**.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Shared Views vs. Split Screens**
  - *Chosen Approach*: Reuse `MembersScreen`, `RegistrationsScreen`, `ShopScreen`, `FinanceStaffScreen`, and `HistoryScreen` using dynamic category terminology, filter logic, and component slots rather than duplicating entire screen components.
  - *Why*: Eliminates code bloat, simplifies maintenance, and adheres to Atrium's clean DDD multi-vertical architecture.
- **Decision 2: 1-Click POS Checkout Integration**
  - *Chosen Approach*: When an appointment completes, `checkoutAppointment()` generates a corresponding `Sale` item in `state.sales` under `branch_salon_hydra` with item name, price, and stylist note.
  - *Why*: Guarantees instant synchronization between the scheduler and the financial ledger without requiring redundant cashier steps.
- **Decision 3: Walk-In Client Auto-Intake**
  - *Chosen Approach*: If an appointment is booked for a walk-in guest in `AppointmentModal`, an active `Member` entity is automatically created in the background.
  - *Why*: Ensures clients are immediately search-able across future appointments and the shared client directory.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Atrium Application Shell                        │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────────┐ │
│  │   Obsidian Sidebar   │  │              Top Navigation Bar              │ │
│  │ (Dynamic Navigation) │  │ (Facility Pill Switcher, Breadcrumb, User)   │ │
│  └──────────┬───────────┘  └──────────────────────┬───────────────────────┘ │
└─────────────┼─────────────────────────────────────┼─────────────────────────┘
              │                                     │
              ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          useAtriumStore (Zustand / Reactive)                │
│                                                                             │
│  State: currentBusinessId ("biz_salon") | currentBranchId ("branch_salon")  │
│                                                                             │
│  Scoped In-Memory Collections (filtered by currentBranchId):                │
│  ├── currentMembers       (Celia Amrani, Dounia Khelil...)                  │
│  ├── currentAppointments  (apt_01 to apt_09)                                │
│  ├── currentServices      (Balayage, Keratin, HydraFacial...)               │
│  ├── currentProducts      (Kérastase, Olaplex, Argan Serums...)             │
│  ├── currentStaff         (Sarah Louati, Leila Mansouri...)                 │
│  ├── currentSales         (Salon checkout & retail sales)                   │
│  ├── currentLeads         (Salon consultation inquiries)                    │
│  └── currentPlans         (VIP Hair & Spa, Royal Bridal...)                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────┐
│     Category-Dedicated        │               │       Shared Modules      │
│  ┌─────────────────────────┐  │               │ (Scoped Data + Dynamic UI)│
│  │   StylistScheduleView   │  │               │ ├── DashboardScreen       │
│  │ ├── Timeline Columns    │  │               │ ├── MembersScreen         │
│  │ ├── Chair Status Filter │  │               │ ├── RegistrationsScreen   │
│  │ ├── Service Menu Catalog│  │               │ ├── ShopScreen            │
│  │ └── AppointmentModal    │  │               │ ├── FinanceStaffScreen    │
│  └─────────────────────────┘  │               │ └── HistoryScreen         │
└───────────────────────────────┘               └───────────────────────────┘
```

### Entity Relationships & Isolation Map

| Entity | Scoping Key | Salon Implementation | Gym Implementation |
|---|---|---|---|
| **Member** | `facilityId` | Clients with hair/skin notes and service packages | Gym athletes with RFID badges and gym access plans |
| **Appointment** | `facilityId` | Stylist booking with service ID, chair status, time | N/A (Gym uses group `ScheduleEvent`) |
| **ServiceItem** | `facilityId` | Salon treatments (durations, pricing, categories) | Group class types (CrossFit, Pilates) |
| **Product** | `facilityId` | Hair oils, Olaplex, beauty cosmetics | Whey protein, shakers, lifting straps |
| **StaffMember**| `facilityId` | Senior Colorist, Master Stylist, Esthetician | Gym Manager, Fitness Coach, Front Desk Cashier |
| **Sale** | `facilityId` | Treatment checkouts & cosmetic retail purchases | Supplement sales & day passes |
| **RegistrationLead**| `facilityId`| Wedding & styling consultation requests | Gym membership inquiries |

### Implementation Phases

1. **Phase 1: Shared Screens Terminology & Context Harmonization**
   - Update `MembersScreen.tsx` to dynamically use `{terminology.members}` and `{terminology.memberSingle}`, remove hardcoded "Plan A1" badges and mock balances, and add an **Appointment Ledger section** in the 390px slide-in inspector showing client bookings.
   - Update `RegistrationsScreen.tsx` to dynamically display service package options when converting salon leads, and adapt table headers to consultation requests.
   - Update `ShopScreen.tsx` to dynamically swap category filters to beauty categories (`Hair Care`, `Skin Care`, `Nails`, `Retail`) when in appointment mode, and adapt receipt headers to the salon name.
   - Update `FinanceStaffScreen.tsx` to display stylist/practitioner badges and role ranks appropriate for salon staff.
   - Update `HistoryScreen.tsx` to highlight appointment checkout sales with stylist attribution.
   - Update `Sidebar.tsx` and `TopBar.tsx` to display dynamic category terminology.

2. **Phase 2: Salon Dashboard Adaptation (`DashboardScreen.tsx`)**
   - When `currentBusiness.category === 'appointment_service'`:
     - Render salon operational stat tiles: Today's Bookings, Active Stylists on Duty, In-Chair Treatments, and Today's Salon Revenue.
     - Render active chair status strip (showing which stylist is currently with a client).
     - Wire real recent activity stream from salon sales and appointments.
     - Add primary quick action button: "New Appointment / Walk-in".

3. **Phase 3: Stylist Scheduler & Booking Polish (`StylistScheduleView.tsx` & `AppointmentModal.tsx`)**
   - Verify seamless 1-click checkout from the chair card directly to POS sales history.
   - Verify walk-in client auto-intake creates a client in `members` scoped to `branch_salon_hydra`.
   - Ensure practitioner column counts and time slot math operate smoothly.

4. **Phase 4: Build Verification & End-to-End Walkthrough**
   - Verify clean TypeScript compilation (`tsc --noEmit`) and dev server compilation (`npm run build`).
   - Test seamless bidirectional switching between Atrium 1 (Gym) and Luxe Spa (Salon) across all 8 screens.
