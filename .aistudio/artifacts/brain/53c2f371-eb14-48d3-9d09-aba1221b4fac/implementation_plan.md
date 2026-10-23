# Implementation Plan - Category 7: Salon, Spa & Beauty Appointment Services Standardization

## Status Overview: Category Standardization Progress
- ✅ **Category 1: Membership & Fitness (`membership_session`)** — 100% Standardized
- ✅ **Category 2: Venue & Coworking Rentals (`rental_booking`)** — 100% Standardized
- ✅ **Category 3: Education & Training Cohorts (`education_cohort`)** — 100% Standardized
- ✅ **Category 4: Freelance & Solo Work (`freelance_solo`)** — 100% Standardized
- ✅ **Category 5: Project & Milestone Agency — 6 Roles (`project_milestone`)** — 100% Standardized
- ✅ **Category 6: POS, Restaurant & Retail Inventory (`pos_inventory`)** — 100% Standardized
- 🔄 **Category 7: Salon, Spa & Beauty Care (`appointment_service`)** — **NEXT & FINAL CATEGORY**

---

## 1. Overview & Core Concept — Category 7 (Salon, Spa & Beauty Care)

- **What It Does**: Standardizes the Salon, Spa & Beauty Care vertical (`appointment_service` / FacilityType 5) across all 6 core screens, replacing legacy gym proxies with dedicated desktop-grade workspaces.
- **Target Audience / Persona**: Salon managers, hair stylists, estheticians, barbers, and spa receptionists in Algeria (El Biar, Sidi Yahia, Oran, Constantine) managing client treatment cards, chair/station bookings, stylist commission splits, and retail product add-ons.
- **Key Value**: Delivers complete operational autonomy from gym/membership paradigms:
  1. **Salon Executive Dashboard (`AppointmentDashboardView`)**: Today's bookings count, chair occupancy rate, service revenue, average ticket value, stylist productivity rankings, and walk-in queue.
  2. **Salon Clients & Treatment Records (`AppointmentClientsView`)**: Full `UniversalDataCollection<Member>` client cards with hair/skin diagnostic tags (Color formula, Hair texture, Allergies), preferred stylist, visit frequency, lifetime spend, and 1-click booking.
  3. **Service & Treatment Menu Catalog (`AppointmentServicesView`)**: `UniversalDataCollection<SalonService>` for cuts, styling, balayage, keratine treatments, facials, and massage with duration (mins), pricing (DZD), and product usage.
  4. **Chair & Stylist Appointment Scheduler (`AppointmentScheduleView`)**: Multi-chair timeline view and `UniversalDataCollection<Appointment>` list/card modes with instant status progression (Booked ➔ Confirmed ➔ In-Chair ➔ Completed ➔ Paid).
  5. **Salon Finance & Stylist Commissions (`AppointmentFinanceView`)**: Daily cash register, service revenue vs retail product sales, tip ledger, and automated stylist commission calculator (% split).
  6. **Treatment History & Audit Log (`AppointmentHistoryView`)**: `UniversalDataCollection<Appointment>` completed session history with stylist notes, formula records, and receipt reprint.
  7. **Mock Data Resilience (`resetSalonMockData()`)**: 1-click demo recharge with authentic Algerian salon data (Salon Didouche / Sidi Yahia, luxury hair spa treatments, stylist staff roster, and realistic appointment ledger).

---

## 2. Technical Architecture & Component Mapping

| Sub-Screen | Current State | Target Desktop-Grade Implementation |
| :--- | :--- | :--- |
| **Dashboard** (`AppointmentDashboardView`) | Gym proxy (`MembershipDashboardView`) | Dedicated Salon Dashboard: Chair occupancy, stylist performance, today's schedule pulse, quick walk-in, and recent service sales. |
| **Clients** (`AppointmentClientsView`) | Gym proxy (`MembershipMembersView`) | `UniversalDataCollection<Member>` with diagnostic tags, preferred stylist, VIP tiers, formula notes modal, and quick book. |
| **Services Menu** (`AppointmentServicesView`) | POS proxy (`PosRegisterView`) | `UniversalDataCollection<SalonService>` with category tabs (Coiffure, Soins, Esthétique, Barbe), duration, price, and commission rate. |
| **Schedule / Agenda** (`AppointmentScheduleView`) | Partial table | Enhanced `UniversalDataCollection<Appointment>` with stylist filter, chair view toggle, quick status updater, and checkout modal. |
| **Finance & Commissions** (`AppointmentFinanceView`) | Gym proxy (`MembershipFinanceView`) | Stylist commission calculator, daily register reconciliation, BaridiMob/CIB breakdown, and service vs product revenue split. |
| **History & Archive** (`AppointmentHistoryView`) | Gym proxy (`MembershipHistoryView`) | `UniversalDataCollection<Appointment>` complete treatment ledger with formula logs, client notes, and receipt reprint. |

---

## 3. Store & Data Layer Enhancements (`store.ts`)
- Add `resetSalonMockData()`: Restores full Algerian salon seed data (hair treatments, facial spa, nail bar, stylist appointments, client notes).
- Add `batchDeleteAppointments`, `batchUpdateAppointmentStatus`, `batchDeleteServices`.
- Expose helpers through `useAtriumStore()`.

---

## 4. Verification Protocol
- `lint_applet` (`tsc --noEmit`) ➔ 0 errors.
- `npm test` ➔ 12/12 unit tests passing.
- `compile_applet` ➔ Clean production build.
