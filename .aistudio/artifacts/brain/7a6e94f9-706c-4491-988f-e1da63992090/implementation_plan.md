# Appointment & Service Category (`appointment_service`) Implementation Plan

Build out the full **Appointment & Service Category** (Salon, Spa & Clinic archetype) within Atrium ERP & CRM, featuring a multi-stylist daily booking sheet, service catalog management, and strict data isolation across shared screens (Clients, Beauty Store, History, Staff, and Appointment Intake).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices were confirmed from your feedback:
> - **Daily Scheduling View**: Multi-stylist column schedule organized by practitioner and timeline (09:00–20:00).
> - **Service Structure**: Service catalog with itemized treatments, standard durations (30, 45, 60, 90, 120 mins), prices, and stylist assignments.
> - **Intake Workflow**: Unified support for both scheduled advance bookings and rapid walk-in client intake directly at the front desk.

---

## 1. Overview & Core Concept

### What It Delivers
The **Appointment & Service Category** adapts Atrium into an executive salon, spa, and clinic management system. While sharing the core modules (Members/Clients, Shop, History, Registrations, Finance & Staff), all data remains strictly partitioned to the appointment facility (`branch_salon_hydra`), and domain terminology dynamically adapts (e.g., *Members* $\to$ *Clients*, *Plans* $\to$ *Service Packages*, *Scheduler* $\to$ *Stylist Schedule*).

### Target Operations
- Hair Salons, Spas & Wellness Centers
- Aesthetic & Dermatology Clinics
- Barbershops & Nail Studios

### Key Value
- **Zero Data Leakage**: Clients, treatments, retail inventory, and staff rosters remain completely independent between Gym facilities and Salon locations.
- **Intuitive Booking Sheet**: Front desk staff can view all working stylists side-by-side, spot chair availability in seconds, book walk-ins, and track appointments through status stages: *Confirmed* $\to$ *In Chair* $\to$ *Completed* $\to$ *Checkout*.

---

## 2. User Experience & Visual Design

### 2.1 Multi-Stylist Booking Sheet (`SchedulerScreen`)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Salon Booking Calendar              [Date: Today, Oct 16]   [+ New Appointment]       │
├─────────┬───────────────────┬───────────────────┬───────────────────┬──────────────────┤
│  Time   │ Sarah (Colorist)  │ Leila (Master)    │ Yasmine (Nails)   │ Amina (Facials)  │
├─────────┼───────────────────┼───────────────────┼───────────────────┼──────────────────┤
│ 09:00   │ [Celia Amrani   ] │                   │ [Ines M.        ] │                  │
│ 09:30   │ [Balayage (90m) ] │ [Meriem B.      ] │ [Manicure (45m) ] │ [Available]      │
│ 10:00   │ [In Chair • 18k ] │ [Blowout (45m)  ] │                   │                  │
├─────────┼───────────────────┼───────────────────┼───────────────────┼──────────────────┤
│ 11:00   │ [Available]       │ [Lydia K.       ] │ [Available]       │ [Nour H.       ] │
│ 11:30   │                   │ [Bridal Trial   ] │                   │ [HydraFacial   ] │
└─────────┴───────────────────┴───────────────────┴───────────────────┴──────────────────┘
```

- **Top Bar**: Facility switcher (instant toggle to "Atrium Salon & Spa"), Date navigation (Today, Prev, Next), Stylist filter, and "+ Book Appointment" action.
- **Practitioner Columns**: Distinct column per active stylist on duty with photo/avatar, specialty badge (Colorist, Stylist, Esthetician), and chair count.
- **Interactive Appointment Cards**:
  - Color-coded by status (*Confirmed*: Indigo, *In Chair*: Amber, *Completed*: Emerald, *Cancelled*: Rose).
  - Shows client name, service title, duration pill, and price in DZD.
  - Clicking opens the **Appointment Action Modal** (mark arrived, start service, reassign stylist, or send directly to POS for payment).

### 2.2 Shared Screens with Scoped Salon Data
1. **Clients Screen (`MembersScreen` in salon mode)**:
   - Terminology adapts to **Clients**.
   - Table columns: Client Name & Contact, Active Service Package (e.g. "VIP Hair & Spa Package", "Royal Bridal Suite"), Last Visit, Total Spent, and Status.
   - 390px slide-in detail panel shows treatment history, stylist notes, and preferred formula notes.
2. **Beauty Store (`ShopScreen` in salon mode)**:
   - Displays professional retail haircare and skincare (Argan Hair Serum, Keratin Repair Shampoo, Botanical Oils, Styling Pomades).
   - Instant POS checkout with option to assign commission/credit to the servicing stylist.
3. **Appointment Intake (`RegistrationsScreen` in salon mode)**:
   - Tracks incoming appointment booking requests submitted online or via phone/WhatsApp.
   - One-click "Approve & Place on Stylist Schedule" action.
4. **Operations History (`HistoryScreen` in salon mode)**:
   - Filterable stream of salon check-ins, service completions, retail sales, and cancellations.
5. **Staff Directory (`FinanceStaffScreen` in salon mode)**:
   - Displays stylists, technicians, and receptionists with commission tier, station assignment, and daily booking count.

---

## 3. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Atrium Store (useAtriumStore)                   │
│  - currentBusinessId: 'biz_02' (appointment_service)                   │
│  - currentBranchId: 'branch_salon_hydra'                               │
│  - appointments[]: scoped by facilityId == 'branch_salon_hydra'        │
│  - servicesCatalog[]: hair, facial, bridal, nail treatments            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│ StylistSchedule   │      │ AppointmentModal  │      │ ServiceCatalog    │
│ - Column per staff│      │ - Select client   │      │ - Hair treatments │
│ - Time slot blocks│      │ - Pick treatment  │      │ - Spa & wellness  │
│ - Status pills    │      │ - Set time & staff│      │ - Pricing & mins  │
└───────────────────┘      └───────────────────┘      └───────────────────┘
```

### Key Data Entities
- **Appointment Model**:
  ```typescript
  interface Appointment {
    id: string;
    tenantId: string;
    facilityId: string;
    clientId: string;
    clientName: string;
    clientPhone: string;
    staffId: string;
    staffName: string;
    serviceId: string;
    serviceName: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    durationMinutes: number;
    price: number;
    status: 'Confirmed' | 'InChair' | 'Completed' | 'Cancelled' | 'NoShow';
    notes?: string;
  }
  ```
- **Service Catalog Model**:
  ```typescript
  interface ServiceItem {
    id: string;
    facilityId: string;
    name: string;
    category: 'Hair' | 'Nails' | 'Facial' | 'Massage' | 'Bridal' | 'Barber';
    durationMinutes: number;
    price: number;
    colorCode: string;
  }
  ```

---

## 4. Implementation Steps

1. **State & Seed Data Enhancement (`seedData.ts` & `store.ts`)**:
   - Seed rich salon appointment records for `branch_salon_hydra` across multiple stylists (Sarah, Leila, Yasmine, Amina).
   - Seed curated salon service treatments (Balayage, Keratin Treatment, Royal Bridal Package, Gel Manicure, HydraFacial).
   - Add appointment mutation handlers: `createAppointment`, `updateAppointmentStatus`, `rescheduleAppointment`, `cancelAppointment`.
2. **Multi-Stylist Calendar Component (`StylistScheduleView.tsx`)**:
   - Build daily column sheet rendering stylists horizontally and operating hours (09:00–20:00) vertically.
   - Interactive appointment blocks with time, client, service, and status pills.
   - Clicking an empty slot opens the quick booking modal with pre-selected stylist and time.
3. **Appointment Booking & Action Modal (`AppointmentModal.tsx`)**:
   - Supports selecting an existing client or rapid walk-in intake (Name, Phone).
   - Service dropdown with price and duration calculation.
   - Stylist assignment and date/time selector.
   - Action controls: "Start Service (In Chair)", "Mark Completed & Send to POS", "Cancel".
4. **Adaptive Integration (`SchedulerScreen.tsx`)**:
   - Automatically render `StylistScheduleView` when current business category is `appointment_service`.
   - Maintain the existing Class Timetable view when in `membership_session` (Gym) mode.
5. **Verify Data Isolation & Verification**:
   - Verify that switching from Gym (`branch_gym_main`) to Salon (`branch_salon_hydra`) immediately changes clients, retail products, staff, and appointments without overlap.
   - Run compilation and type verification.
