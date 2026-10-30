# Dual-Role (Owner / Staff) RBAC & Operational Workspaces Specification
## Categories: Gym & Fitness, Salon & Beauty, Restaurant & Retail POS, Education & Academy

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Core Decisions & Constraints Confirmed:**
> 1. **Role Model**: Exactly two roles per category: **Owner** (unrestricted 360° oversight, finances, analytics, pricing, settings) and **Staff** (high-cadence operational kiosks, zero visibility into margins, salaries, P&L, or system configs).
> 2. **Authentication & Escalation**: TopBar segmented pill switcher with instant Staff downgrade and 4-digit PIN gate (`1234` default, stored in local state/storage) to escalate to Owner.
> 3. **Algerian Localization & Offline Readiness**: Full bilingual French/Arabic support (`dir="rtl"` in Arabic), local currency DZD with tabular numeric rendering, cash fiscal stamp (Article 317 CID) compliance, and offline-first queue persistence.
> 4. **Quadruple Traceability Contract**: Every transaction, booking, check-in, and pointage strictly records `{ accountId, businessId, branchId, staffId }`.

---

# SYSTEM-WIDE ARCHITECTURE & REUSABLE FOUNDATIONS

### Reused Shared Core Modules
Before introducing new code, the implementation strictly reuses:
- **`AtriumButton`**: Standard primary, secondary, outline, and destructive button states with icon support.
- **`UniversalDataCollection`**: Data grid and list views with multi-column sorting, row pin/select, drawer inspector, and bulk actions.
- **`Seek`**: Global search input with instant keyboard trigger (`/` and `Ctrl+K`).
- **`LabelInput` & `FilterSelect`**: Consistent form input and filter capsule components.
- **`rules.ts` & `algerianPtt.ts`**: `formatMoney()`, `calculateArt317Timbre()`, `validateVoucherCode()`, `checkQuota()`.
- **TopBar & Sidebar Rail**: Dock navigation structure, breadcrumb builder, and mobile drawer.

### New Core Additions
- **`PinVerificationModal`**: Shared 4-digit numeric keypad dialog with shake animation on invalid entry and auto-submit on 4th digit.
- **`StandardRole` type**: Unified `'owner' | 'staff'` contract per category.
- **Fast Operational Workspaces**:
  - `GymFrontDeskKiosk.tsx` (Membership check-in, barcode scan, walk-in passes)
  - `SalonQuickChairKiosk.tsx` (Daily chair timeline, workstation queue, fast ticket checkout)
  - `PosRegisterView.tsx` (Enhanced Staff mode with cost/margin data masking)
  - `AcademyRollCallKiosk.tsx` (One-tap presence roll-call, session notes, timetable)

---

# FEATURE 1: DUAL-ROLE GYM & FITNESS WORKSPACE (`membership_session`)

### 1. PURPOSE
Enables gym reception staff to verify memberships, execute barcode check-ins, and sell walk-in passes in under 3 seconds at peak hours, while completely preventing staff from accessing monthly recurring revenue, member churn analytics, coach payroll, and subscription pricing settings.

### 2. BUSINESS LOGIC
- **Access Rule Matrix**:
  - `Active` membership $\rightarrow$ Granted (Green chime audio feedback).
  - `Expiring` ($\le 5$ days remaining) $\rightarrow$ Granted with alert banner (Amber visual badge).
  - `Expired` / `Unpaid` / `Frozen` $\rightarrow$ Access Denied (Red lockout modal, requires renewal or unfreeze).
  - `Session Pack` $\rightarrow$ Automatically decrements remaining session counter by 1.
- **Walk-In Pass Pricing**:
  - Fixed standard rate (e.g., 500 DZD/entry). If cash is chosen and exceeds 5,000 DZD (e.g., group ticket), Article 317 fiscal stamp is evaluated.
- **State Machine for Member Check-In**:
  - `IDLE_SCAN` $\rightarrow$ Barcode scanned or name typed $\rightarrow$ `MEMBER_RESOLVED`
  - If valid: `MEMBER_RESOLVED` $\rightarrow$ Click Check-In / Auto-Checkin $\rightarrow$ `CHECKED_IN` (Session logged, access gate signal emitted, return to `IDLE_SCAN` after 2s).
  - If invalid/expired: `MEMBER_RESOLVED` $\rightarrow$ `ACCESS_DENIED` $\rightarrow$ Quick Renewal trigger (Staff allowed to accept renewal payment, Owner allowed to override/discount).
- **Permissions**:
  - *Staff*: View member names, photo, status, expiration date, remaining sessions. Create check-in log, sell walk-in pass, record renewal payment at fixed catalog price.
  - *Owner*: View and edit all membership plan prices, coach commissions, total cash collected, churn rate, refund subscriptions, delete records.
- **Worked Numeric Example**:
  - Member Karim has a 10-session pack purchased for 4,000 DZD.
  - Remaining sessions: 3.
  - Staff scans barcode `MBR-10482`.
  - System verifies: Status is `Active`, remaining sessions = $3 > 0$.
  - Staff clicks "Valider l'Accès" (or scans barcode).
  - New remaining sessions: $3 - 1 = 2$.
  - Check-in record created with `{ accountId, businessId, branchId, staffId: 'staff_frontdesk_01', timestamp }`.

### 3. DATA MODEL
```typescript
export interface MemberCheckInLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  memberId: string;
  memberName: string;
  planId: string;
  planName: string;
  timestamp: string;
  accessStatus: 'Granted' | 'Warning_Expiring' | 'Denied_Expired' | 'Denied_Frozen';
  remainingSessionsBefore?: number;
  remainingSessionsAfter?: number;
  checkInMethod: 'barcode_scanner' | 'manual_click' | 'nfc_card';
}

export interface WalkInTicket {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  ticketNumber: string; // e.g. "WI-2026-0041"
  clientName: string;
  phone?: string;
  amountDzd: number;
  paymentMethod: 'cash' | 'baridimob' | 'cib';
  timbreFiscalDzd: number;
  issuedAt: string;
}
```
- **Relationships**: `MemberCheckInLog.memberId` $\rightarrow$ `Member.id`.
- **UI Queries**: Filter logs by `date = today`, filter members by `status = Active` or `barcode = input`.

### 4. CODE ARCHITECTURE
- **Component File**: `src/components/screens/membership/GymFrontDeskKiosk.tsx`
- **State**:
  - `barcodeBuffer`: string (clears on Enter key).
  - `activeResolvedMember`: Member | null.
  - `recentCheckIns`: MemberCheckInLog[] (last 10 entries shown in live feed).
  - `soundEnabled`: boolean (default true, Web Audio API synth chimes).
- **Pure Functions**:
  - `evaluateAccessPermission(member: Member, todayDateStr: string): { status: 'Granted' | 'Warning' | 'Denied'; reason: string; daysRemaining: number }`
  - `decrementSessionCount(currentSessions: number): number`
- **Offline Behavior**: Logs stored in `localStorage('atrium_gym_checkins_offline')`. Automatically uploaded when network reconnects.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: Front-desk worker points scanner at member card $\rightarrow$ Barcode fires `Enter` $\rightarrow$ Member card slides in with green flash and chime $\rightarrow$ Access logged automatically $\rightarrow$ Cursor resets to scan input. **Total clicks: 0.**
- **Screen States**:
  - *Idle*: Big glowing search/scan box with shortcut hint `[Appuyez sur / pour rechercher]`.
  - *Granted*: Emerald banner with member picture, remaining days/sessions.
  - *Blocked*: Crimson banner showing exact reason (e.g. "Abonnement expiré depuis 4 jours").
- **Delight Feature**: Audio chime synthesizer using HTML5 Web Audio API (no external MP3 asset dependency) producing a crisp ascending dual-tone for access granted and low buzz for access blocked.

### 6. EDGE CASES & FAILURE HANDLING
- **Invalid Barcode**: Unrecognized code displays "Code barre inconnu", plays error buzzer, does not crash.
- **Double Scan within 30 seconds**: Prevents deducting two sessions if member double-taps card. Shows message: "Passage déjà validé il y a 12 secondes".
- **Clock Drift**: Check-in uses client ISO string but compares dates using day boundary strings (`YYYY-MM-DD`) to avoid timezone hour offsets.
- **Accidental Deletion**: Staff role has no delete button anywhere on screen.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Expired member scans card.
  - *Given* a member with `endDate = '2026-04-01'` and today is `'2026-05-01'`.
  - *When* staff scans barcode.
  - *Then* access state is `Denied_Expired`, turnstile remains locked, and renewal prompt appears.
- **Unit Tests**:
  - `evaluateAccessPermission` with active dates $\rightarrow$ `Granted`.
  - `evaluateAccessPermission` with 3 days left $\rightarrow$ `Warning`.
  - `evaluateAccessPermission` with frozen status $\rightarrow$ `Denied_Frozen`.

### 8. RISKS & OPEN QUESTIONS
- `[ASSUMPTION]`: Standard USB barcode scanners emulate keyboard input terminating with an `Enter` (KeyCode 13) event.
- `[VERIFY]`: Local regulations on keeping member check-in timestamp logs for commercial fitness centers under Algerian law.

---

# FEATURE 2: DUAL-ROLE SALON & BEAUTY WORKSPACE (`appointment_service`)

### 1. PURPOSE
Allows salon stylists and receptionists to view today's chair schedule, seat arriving clients, update workstation stages, and record payments in real time, while preventing staff from seeing overall salon monthly profit, owner earnings, and individual stylist commission rates.

### 2. BUSINESS LOGIC
- **Workstation Flow**:
  - Workstations: Coiffure Homme/Femme, Soins Visage, Manucure, Barbier.
  - Status progression: `Booked` $\rightarrow$ `Client_Arrived` $\rightarrow$ `In_Service` $\rightarrow$ `Completed` $\rightarrow$ `Paid`.
- **Stylist Commission Masking**:
  - Owner sees: Service price (e.g. 2,500 DZD), Salon share (1,500 DZD), Stylist commission (1,000 DZD at 40%).
  - Staff sees: Service title, duration (45 min), workstation, customer name, price to collect from client (2,500 DZD). No commission percentages or net salon split displayed.
- **Permissions**:
  - *Staff*: Book walk-in appointment, assign seat, toggle appointment progress, take payment, print receipt.
  - *Owner*: Edit commission percentages per stylist, view monthly salon net, configure services and prices, cancel bookings without penalty.
- **Worked Numeric Example**:
  - Client Amina books "Coloration + Brushing" = 6,000 DZD.
  - Stylist: Sarah (Commission rate 35% configured in Owner settings).
  - Staff views ticket total: 6,000 DZD. Staff collects 6,000 DZD cash.
  - Owner dashboard calculates: Stylist Commission = $6,000 \times 0.35 = 2,100\text{ DZD}$, Salon Net = $3,900\text{ DZD}$.
  - Staff ticket printout shows: Client: Amina, Service: Coloration + Brushing, Montant Réglé: 6,000 DZD. Stylist payout calculation is completely suppressed in staff mode.

### 3. DATA MODEL
```typescript
export interface SalonAppointmentStage {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  workstationId: string; // e.g. "chair_01"
  workstationName: string;
  stylistStaffId: string;
  stylistName: string;
  scheduledTime: string;
  durationMinutes: number;
  priceDzd: number;
  stage: 'Booked' | 'Arrived' | 'In_Progress' | 'Completed' | 'Paid';
  paymentMethod?: 'cash' | 'baridimob' | 'cib';
  isWalkIn: boolean;
  notes?: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `src/components/screens/appointment/SalonQuickChairKiosk.tsx`
- **State**:
  - `selectedWorkstationFilter`: string (`'all'` or workstation ID).
  - `quickBookingModalOpen`: boolean.
  - `activeCheckoutTicket`: SalonAppointmentStage | null.
- **Pure Functions**:
  - `calculateServiceEndTime(startTimeStr: string, durationMin: number): string`
  - `detectChairCollision(existingAppointments: SalonAppointmentStage[], newStart: string, durationMin: number, chairId: string): boolean`
- **Offline Behavior**: Real-time optimistic update of stage status, persisted in `localStorage('atrium_salon_daily_stages')`.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: Client walks into salon $\rightarrow$ Staff clicks on current hour in chair lane $\rightarrow$ Types client name and picks "Coupe Brushing" $\rightarrow$ Click "Confirmer". **Takes 3 clicks.**
- **Stage Progression Buttons**: Directly on each booking card in the timeline:
  `[Arrivé]` $\rightarrow$ `[Commencer]` $\rightarrow$ `[Terminer]` $\rightarrow$ `[Encaisser]`.
- **Delight Feature**: Visual Chair Occupancy Pill in the top strip showing real-time capacity (e.g. "Fauteuils occupés: 4/6 (67%)") with subtle pulsating ambient indicator.

### 6. EDGE CASES & FAILURE HANDLING
- **Overlapping Booking**: When staff attempts to book a workstation that is already occupied, system alerts: "Le fauteuil 'Coiffure 02' est déjà occupé jusqu'à 15h30" and suggests the nearest free chair.
- **Mid-Service Role Tampering**: If staff opens dev tools, commission metrics are not in the component DOM tree at all; data isolation is enforced at the data projection layer before rendering.
- **Partial Cash Payment**: If client pays 4,000 DZD of a 6,000 DZD service, balance due is logged and highlighted in Amber on client file.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Staff opens appointment module.
  - *Given* user is in `staff` role.
  - *When* appointment module loads.
  - *Then* `SalonQuickChairKiosk` is rendered, commission summary pod is absent, and Finance tab is hidden from the sidebar.
- **Unit Tests**:
  - `detectChairCollision` returns `true` for intersecting time windows on same workstation.
  - `detectChairCollision` returns `false` for same time window on different workstations.

### 8. RISKS & OPEN QUESTIONS
- `[ASSUMPTION]`: Salon appointments rarely exceed 4 hours for a single booking block.
- `[VERIFY]`: Standard practice for tipping (*pourboire*) handling in Algerian salons—kept separate from official service ticket totals.

---

# FEATURE 3: DUAL-ROLE RESTAURANT & RETAIL POS (`pos_inventory`)

### 1. PURPOSE
Empowers store cashiers and retail counter clerks to ring up products via barcode or touch categories, split cash/card payments, park active orders, and print receipts at maximum velocity, while strictly concealing wholesale cost prices (PMP), gross profit margins, supplier debts, and register cash-drawer discrepancies.

### 2. BUSINESS LOGIC
- **Cost & Margin Masking Rules**:
  - `costPrice`, `pmpDzd`, `marginPercent`, and `totalInventoryCost` fields are completely stripped from tables, product modals, and order drawers when `role === 'staff'`.
  - Cashier only sees: Retail Price (TTC), Stock Quantity, SKU, Barcode, Discount allowed (up to max configured cap, e.g. 10%).
- **Order Parking (`Mise en attente`)**:
  - Cashier can park current cart with 1 click when a customer forgets an item or takes time to pay.
  - Parked orders list displays customer name, time elapsed, item count, and total.
  - 1-click recall restores cart instantly.
- **Cash Change Calculation**:
  - Cashier inputs received banknotes (e.g., 2,000 DZD for a 1,450 DZD sale).
  - System calculates change: $2,000 - 1,450 = 550\text{ DZD}$ with breakdown in standard Algerian denominations (500 DA bill + 50 DA coin).
- **Permissions**:
  - *Staff*: Add products to cart, apply line discounts up to 10%, park/recall orders, process payment, print ticket.
  - *Owner*: View cost prices, set selling prices, create products, view daily Z-report, reconcile register drawer variance, apply 100% overrides.

### 3. DATA MODEL
```typescript
export interface PosCartLine {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPriceDzd: number;
  discountPercent: number;
  lineTotalDzd: number;
}

export interface ParkedPosTicket {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  ticketLabel: string; // e.g. "Client Comptoir #4"
  items: PosCartLine[];
  subtotalDzd: number;
  parkedAt: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `src/components/screens/pos/PosRegisterView.tsx` (Enhanced with Role-Aware Props)
- **State**:
  - `cart`: PosCartLine[].
  - `cashReceivedInput`: number.
  - `activeParkedTickets`: ParkedPosTicket[].
  - `selectedCategory`: string.
- **Pure Functions**:
  - `calculateCartTotals(items: PosCartLine[]): { subtotal: number; discount: number; total: number }`
  - `calculateChangeDue(totalDue: number, cashReceived: number): { changeDue: number; isSufficient: boolean }`
- **Offline Behavior**: All sales records queue in IndexedDB/localStorage and sync with Supabase when online.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: Cashier scans 2 items $\rightarrow$ Presses `F4` or taps `Espèces` $\rightarrow$ Presses `Entrée` (exact amount) $\rightarrow$ Receipt prints and drawer opens. **Completed in 2 keystrokes.**
- **Quick Denomination Buttons**: Instant payment tap buttons for standard Algerian banknotes: `+500`, `+1000`, `+2000` DA to speed up cash tenders.
- **Delight Feature**: Visual Change Breakdown pill showing exact coins and bills to return to customer, eliminating mental arithmetic errors during rush hours.

### 6. EDGE CASES & FAILURE HANDLING
- **Negative Stock Allowed Toggle**: If enabled by Owner, cashier can sell item even if stock is 0 (shows warning badge "Stock théorique: 0").
- **Cost Leakage Guard**: Server/client selector never sends `costPrice` to component props when active role is `staff`.
- **Double Click Payment**: Debounced submit handler prevents creating duplicate sales if cashier rapidly double-taps the pay button.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Cashier searches product catalog in staff mode.
  - *Given* active role is `staff`.
  - *When* searching or inspecting product.
  - *Then* cost price column and margin badges are absent from DOM and state.
- **Unit Tests**:
  - `calculateCartTotals` accurately computes discounts and line sums.
  - `calculateChangeDue` correctly flags insufficient payment when `cashReceived < totalDue`.

### 8. RISKS & OPEN QUESTIONS
- `[ASSUMPTION]`: Typical POS receipt printers use standard 80mm or 58mm thermal rolls.
- `[VERIFY]`: Legal requirements in Algeria for printing official Fiscal NIF/NIS and Article 317 stamp declaration on retail receipts over 5,000 DZD.

---

# FEATURE 4: DUAL-ROLE EDUCATION & ACADEMY WORKSPACE (`education_cohort`)

### 1. PURPOSE
Equips teachers, trainers, and academy desk staff to consult session timetables, conduct one-tap attendance roll-calls, and verify student room assignments, while completely shielding total tuition fees collected, student tuition payment debts (aging AR), teacher salary rates, and cohort profitability metrics.

### 2. BUSINESS LOGIC
- **Attendance Status Machine**:
  - Each student in the scheduled session has one of 4 statuses:
    - `Present` (P) — Default / Green
    - `Absent` (A) — Red
    - `Late` (R) — Amber (with arrival time notation)
    - `Excused` (E) — Blue (medical / certified note)
- **One-Tap Mark All Present**:
  - Teacher can tap "Tout Marquer Présent", then selectively toggle the 1 or 2 absent students with a single click.
- **Financial Tuition Masking**:
  - Student cards for Staff display: Full Name, Student ID, Enrolled Cohort, Group, Emergency Phone, Attendance Rate (%).
  - Student cards for Owner display: All the above + Total Tuition Fee (e.g. 45,000 DZD), Paid Amount (30,000 DZD), Outstanding Balance (15,000 DZD Overdue), Payment Receipts.
- **Permissions**:
  - *Staff*: Mark session roll-call, view timetable, search student contacts, add session pedagogy notes.
  - *Owner*: View tuition billing ledger, edit course pricing, assign teacher pay rates, graduate cohorts, issue certificates.

### 3. DATA MODEL
```typescript
export interface SessionRollCallRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  cohortId: string;
  cohortName: string;
  sessionId: string;
  sessionDate: string; // "YYYY-MM-DD"
  startTime: string;   // "10:00"
  endTime: string;     // "12:00"
  classroomName: string;
  teacherStaffId: string;
  teacherName: string;
  attendanceList: {
    studentId: string;
    studentName: string;
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    notes?: string;
  }[];
  isLocked: boolean;
  submittedAt?: string;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `src/components/screens/education/AcademyRollCallKiosk.tsx`
- **State**:
  - `activeSession`: EduSession | null.
  - `attendanceMap`: Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'>.
  - `sessionNotes`: string.
  - `isSubmitted`: boolean.
- **Pure Functions**:
  - `computeAttendanceStats(list: { status: string }[]): { total: number; present: number; absent: number; ratePercent: number }`
- **Offline Behavior**: Roll-call records saved locally and timestamped; synchronized immediately upon connection.

### 5. UX FLOW & ENHANCEMENTS
- **Fewest-Clicks Flow**: Instructor enters classroom $\rightarrow$ Opens tablet $\rightarrow$ Active session is pre-selected $\rightarrow$ Clicks "Tous Présents" $\rightarrow$ Taps on 1 absent student $\rightarrow$ Clicks "Valider l'Appel". **Completed in 3 taps.**
- **Visual Status Grid**: Large touch-friendly badges (min 44px) for rapid finger taps on tablets and smartphones.
- **Delight Feature**: Automatic instant SMS/WhatsApp notification trigger prompt for parents of absent students ("Notifier les parents des 2 absents en 1 clic").

### 6. EDGE CASES & FAILURE HANDLING
- **Locked Roll-Call**: Once submitted, roll-call is locked for Staff to prevent retroactive alteration. Owner PIN required to unlock and modify past attendance.
- **Unassigned Student**: Student walking into wrong room displays warning banner: "Étudiant inscrit dans le Groupe B (Salle 04)".
- **Teacher Replacement**: Substitute teacher can be picked from dropdown without altering historical cohort ownership.

### 7. ACCEPTANCE CRITERIA & TESTS
- **Scenario**: Instructor submits attendance.
  - *Given* session has 15 enrolled students.
  - *When* instructor marks 13 Present, 2 Absent and clicks Submit.
  - *Then* session roll-call record is generated with 86.7% presence rate and state locks against staff edits.
- **Unit Tests**:
  - `computeAttendanceStats` computes 100% when all are Present.
  - `computeAttendanceStats` computes correct percentage with rounded integer.

### 8. RISKS & OPEN QUESTIONS
- `[ASSUMPTION]`: Academies in Algeria typically track cohort sessions in 1.5h to 3h blocks.
- `[VERIFY]`: Student data privacy guidelines under Algerian Law 18-07 on personal data protection regarding sharing attendance notices with guardians.

---

# FEATURE 5: PIN-PROTECTED ESCALATION MODAL (`PinVerificationModal`)

### 1. PURPOSE
Provides a secure, fast, and tactile 4-digit PIN authentication interface when switching from Staff mode back to Owner mode, preventing unauthorized staff from peering into company finances while allowing owners to unlock the master console in 2 seconds.

### 2. BUSINESS LOGIC
- **Default PIN**: `1234` (stored in `localStorage` under `atrium_owner_pin`).
- **Validation Rules**:
  - Keypad accepts digits 0–9.
  - Auto-submits immediately upon entering the 4th digit (no manual "Submit" click required).
  - On Success: Plays soft chime, dismisses modal, updates store `activeRole = 'owner'`, and restores full navigation.
  - On Failure: Plays error buzz, triggers 400ms CSS shake animation, clears entered digits, and displays red error text "Code PIN incorrect".
  - Rate limiting: After 5 consecutive failed attempts, locks out entry for 30 seconds.

### 3. DATA MODEL
```typescript
export interface PinVerificationState {
  isOpen: boolean;
  targetCategory: BusinessCategory;
  enteredPin: string;
  hasError: boolean;
  failedAttempts: number;
  lockoutUntil?: number;
}
```

### 4. CODE ARCHITECTURE
- **Component File**: `src/components/modals/PinVerificationModal.tsx`
- **Reusability**: Shared across all 4 categories and compatible with TopBar role switcher.
- **DOM & Keyboard Handling**: Supports physical keyboard input (digits 0–9, Backspace, Escape) as well as on-screen touch keypad.

---

# CROSS-FEATURE AUDIT & SYSTEM INTEGRATION (SECTION A)

### A.1 Component Reuse Map
| Component / Module | Gym & Fitness | Salon & Beauty | POS & Retail | Education |
| :--- | :---: | :---: | :---: | :---: |
| `PinVerificationModal` | Reused | Reused | Reused | Reused |
| `TopBar` Segmented Switcher | Reused | Reused | Reused | Reused |
| `Sidebar` RBAC Filter | Reused | Reused | Reused | Reused |
| `App.tsx` Route Guard | Reused | Reused | Reused | Reused |
| `formatMoney` & DZD rules | Reused | Reused | Reused | Reused |
| `Article 317 Timbre` | Reused | Reused | Reused | Reused |

### A.2 Data Flow Architecture
```
[User Action in TopBar]
       │
       ▼
[Is Switching to Owner?] ──YES──► [Open PinVerificationModal]
       │                                   │ (PIN valid: 1234)
       NO (Switching to Staff)              ▼
       │                          [Set store.role = 'owner']
       ▼                                   │
[Set store.role = 'staff']                 ▼
       │                          [Sidebar displays 8 tabs]
       ▼                          [App.tsx allows all screens]
[Sidebar prunes to 3-4 tabs]
[App.tsx redirects to Kiosk]
[Data projection hides margins]
```

---

# SELF-REVIEW & VULNERABILITY AUDIT (SECTION B)

*Reviewing as a skeptical Algerian business owner and senior application security auditor:*

1. **Weakness 1: Hardcoded PIN in client memory.**
   - *Fix*: Default PIN `1234` is only initial seed. Store allows Owner to configure custom PIN in Settings, saved under salted hash in `localStorage`.
2. **Weakness 2: Staff refreshing page resets to default Owner mode.**
   - *Fix*: Persist active role per business category in `localStorage` (`atrium_role_<categoryId>`). On page reload, system initializes in the exact persisted role state.
3. **Weakness 3: Keyboard shortcuts bypassing navigation guard (e.g. pressing shortcut for Finance).**
   - *Fix*: Centralized route guard in `App.tsx` intercepts all screen renders; even if `activeScreen` is manipulated, `staff` role cannot render `finance` or `analytics`.
4. **Weakness 4: Barcode scanner typing into wrong input.**
   - *Fix*: Dedicated `window.addEventListener('keydown')` barcode buffer detector in Kiosks automatically captures scans even if input focus was lost.
5. **Weakness 5: Financial columns leaking in table exports.**
   - *Fix*: Table column definition filters out `costPrice` and `margin` at array construction time when `role === 'staff'`. Exporting CSV in staff role strictly exports visible columns only.
6. **Weakness 6: Double-click creating duplicate payments during slow network.**
   - *Fix*: Debounce all payment triggers with 1.5s lock state and loading spinner.
7. **Weakness 7: Stylist commission visible in receipt print.**
   - *Fix*: Salon receipt print template has strict conditional block `{isOwner && ...}` for commission splits; customer/staff receipt template only prints gross total paid.
8. **Weakness 8: Touch targets too small for grease/powder hands in gyms and salons.**
   - *Fix*: Kiosk action buttons enforce minimum dimensions of $48\text{px} \times 48\text{px}$ with high-contrast text.
9. **Weakness 9: Arabic RTL layout flipping barcode scanner input order.**
   - *Fix*: All barcode, phone, and price inputs are explicitly forced to `dir="ltr"` with monospace tabular styling.
10. **Weakness 10: Roll-call tampering by substitute staff.**
    - *Fix*: Submitted roll-call sessions lock with timestamp and `staffId` signature. Unlocking requires Owner PIN.

---

# BUILD ORDER & THIN VERTICAL SLICES (SECTION C)

### Slice 1: Core Role State & Security Gate (Shippable on its own)
- Extend `src/types/index.ts` with `StandardRole`.
- Add role state & PIN actions to `src/services/store.ts`.
- Build `PinVerificationModal.tsx` and integrate into `TopBar.tsx`.
- *Verification*: TopBar switches between Owner and Staff with working PIN verification across all 4 categories.

### Slice 2: Sidebar Filtering & Navigation Route Interceptors
- Update `Sidebar.tsx` to prune navigation items dynamically when in `staff` role.
- Update `App.tsx` to guard against direct access to `finance`, `analytics`, and `settings` for Staff.
- *Verification*: Switching to Staff immediately reduces dock to operational items; clicking blocked tabs safely redirects.

### Slice 3: Gym & Fitness Operational Kiosk (`membership_session`)
- Implement `GymFrontDeskKiosk.tsx` with live scan, status alerts, and walk-in pass sales.
- Mount Kiosk as default Staff dashboard in `App.tsx`.
- *Verification*: Full check-in cycle operates in 0-1 clicks; finance metrics hidden.

### Slice 4: Salon & Beauty Operational Kiosk (`appointment_service`)
- Implement `SalonQuickChairKiosk.tsx` with workstation timeline and quick checkout.
- Mask stylist commission payouts in staff mode.
- *Verification*: Stylist can progress chair status and checkout clients; owner splits hidden.

### Slice 5: POS Register Data Masking (`pos_inventory`)
- Enhance `PosRegisterView.tsx` with staff mode cost and margin masking.
- Verify parked order drawer and change calculator.
- *Verification*: Cashier rings up cart at top speed; zero visibility of cost price or gross margin.

### Slice 6: Education Academy Roll-Call Kiosk (`education_cohort`)
- Implement `AcademyRollCallKiosk.tsx` with one-tap attendance and session locking.
- Mask tuition billing balances in student directory for staff.
- *Verification*: Instructor completes roll-call in 3 taps; student tuition debt hidden.

### Slice 7: Automated Test Suite & Final Polish
- Add comprehensive unit tests in `src/utils/rules.test.ts`.
- Run `npm test`, `tsc --noEmit`, and `vite build`.

---

# DEFINITION OF DONE (SECTION D)

1. **Role Parity Across 4 Categories**: Gym, Salon, POS, and Education all support seamless Owner vs. Staff toggling with PIN verification.
2. **Zero Financial Leakage**: In Staff mode, no finance tab, no P&L figures, no cost prices, no supplier margins, and no commission splits are visible anywhere in the UI or DOM.
3. **High-Speed Operational Workspaces**: Every staff workspace allows completing the primary task (Check-in, Chair update, Sale, Roll-call) in $\le 3$ clicks/taps.
4. **Trilingual & RTL Pristine**: All labels, dialogs, buttons, and errors render fluently in French, Arabic (strict RTL layout), and English.
5. **Zero Linter or Type Errors**: `tsc --noEmit` completes with 0 errors.
6. **100% Automated Test Pass**: All existing and new test suites pass cleanly.
