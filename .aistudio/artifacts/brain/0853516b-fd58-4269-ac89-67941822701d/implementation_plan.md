# Category-Dedicated Notification Engine & Kinetic ToastStack

Architectural specification and implementation plan for a category-aware notification engine across all 7 business verticals in Atrium ERP & CRM, powered by the interactive **ToastStack** (3-tier card stack with spring physics, hover fanning, auto-dismiss with hover pause, and contextual action buttons).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following directions were confirmed during interactive clarification:
> - **Screen Anchor**: Bottom-right floating dock (`fixed bottom-6 right-6 z-[99999]`) with responsive containment so it never overlaps primary workspace content.
> - **Event Sources**: Both real user operations (e.g. sales, roll calls, appointments, deposits, invoices) and periodic realistic background intelligence events (e.g. low stock alerts, attendance warnings, retainer thresholds, escrow turnaround alerts).
> - **Timing & Dismissal**: 6-second auto-dismiss per toast with hover-pause (the timer suspends whenever the pointer hovers over the stack or any toast).
> - **Contextual Actions**: Support for interactive quick action buttons (e.g. "View", "Print", "Undo", "Receipt", "Retry", "Extend") directly inside toast cards with active event dispatching.
> - **Visual Tones & Motion**: Adheres to the provided kinetic CSS specifications (`.tst`, `.tst-toast`, `.tst-icon`, `.tst-act`, `.tst-x`) with Framer Motion spring physics.

---

## 1. Overview & Core Concept

### What It Delivers
Every business vertical runs distinct operational workflows with specialized terminology, rules, and success criteria. The new notification engine provides:
1. **Vertical-Dedicated Event Intelligence**: Replacing generic notifications with rich, category-aware notifications reflecting the current active facility and operations.
2. **Kinetic 3-Tier Stack (`ToastStack`)**: The newest notification arrives in front, with two prior notifications resting cleanly behind as subtle stacked paper layers. Hovering over the stack fans out the items into an accessible interactive list.
3. **Contextual 1-Click Operations**: Direct inline actions on notifications (e.g., printing a receipt right after a sale, reviewing a student's gradebook after roll call, or checking an escrow deposit after reservation).

---

## 2. Category Notification Event Matrix

### 1. Membership & Fitness (`membership_fitness`)
| Event Trigger | Toast Kind | Title | Body | Inline Action |
|---|---|---|---|---|
| Member Check-In | `success` | Member Checked In | `[Name] (RFID-[ID]) access granted.` | View Profile |
| Session Deduction | `info` | Session Deducted | `1 credit deducted. [N] remaining.` | History |
| Low Sessions Alert | `warning` | Low Session Balance | `[Name] has only 1 session left.` | Renew Plan |
| Membership Expiry | `warning` | Plan Expiring Soon | `[Name]'s membership ends in 3 days.` | Extend |

### 2. Salon, Spa & Appointment Services (`appointment_service`)
| Event Trigger | Toast Kind | Title | Body | Inline Action |
|---|---|---|---|---|
| Appointment Booked | `success` | Booking Confirmed | `[Client] with [Stylist] at [Time].` | View Schedule |
| Status: In Chair | `info` | Client In Chair | `[Client] service started with [Staff].` | Service Timer |
| Salon Checkout to POS | `success` | Sent to Checkout | `[Service] sent to Register #1 ([Price] DZD).` | Pay Register |
| Walk-in Intake | `info` | Walk-in Seated | `[Client] added to rapid intake queue.` | View Queue |

### 3. POS, Retail & Inventory (`pos_inventory`)
| Event Trigger | Toast Kind | Title | Body | Inline Action |
|---|---|---|---|---|
| Sale Completed | `success` | Payment Settled | `Receipt #[No] paid ([Total] DZD cash).` | Print Receipt |
| Low Stock Warning | `warning` | Low Stock Alert | `[Product] stock dropped below [Min] units.` | Restock Item |
| Order Parked | `info` | Order Parked | `Cart #[ID] parked on Register #[N].` | Recall Cart |
| Barcode Scanned | `success` | Item Added to Cart | `[Product] scanned into active register.` | View Cart |

### 4. Venue & Space Rentals (`rental_booking`)
| Event Trigger | Toast Kind | Title | Body | Inline Action |
|---|---|---|---|---|
| Space Reserved | `success` | Venue Booked | `[Space] reserved for [Renter] on [Date].` | View Contract |
| Caution Escrow Held | `info` | Escrow Deposit Held | `[Amount] DZD caution held for [Space].` | View Escrow |
| Deposit Released | `success` | Caution Released | `[Amount] DZD refunded after inspection.` | Deposit Log |
| Turnaround Window | `warning` | Turnaround Window | `[Space] booking ends in 30 mins (cleaning needed).` | Check Space |

### 5. Education & Academies (`education_cohort`)
| Event Trigger | Toast Kind | Title | Body | Inline Action |
|---|---|---|---|---|
| 1-Click Roll Call Done | `success` | Attendance Logged | `Roll call complete for [Cohort] ([N] present).` | Gradebook |
| Tuition Installment Paid | `success` | Tuition Payment Logged | `Installment #[N] received for [Student] ([Amount] DZD).` | Print Receipt |
| Certificate Minted | `success` | Certificate Issued | `Accredited diploma generated for [Student].` | View Cert |
| Attendance Threshold | `warning` | Absence Warning | `[Student] has missed [N] consecutive lectures.` | Contact Guardian |

### 6. Freelancers & Solo Practitioners (`freelance_solo`)
| Event Trigger | Toast Kind | Title | Body | Inline Action |
|---|---|---|---|---|
| Stopwatch Time Saved | `success` | Time Logged | `[Hours]h [Mins]m logged to [Project].` | Create Invoice |
| Invoice Sent / Paid | `success` | Invoice Settled | `Client [Client] paid Invoice #[No] ([Amount] DZD).` | View Invoice |
| Proposal Accepted | `success` | Proposal Converted | `Proposal for [Client] accepted; project initialized.` | Kanban Board |
| Retainer Limit Alert | `warning` | Retainer 85% Consumed | `Only [N] hours left on [Client]'s monthly retainer.` | Bill Overage |

### 7. Cross-Facility & System Operations (Global)
| Event Trigger | Toast Kind | Title | Body | Inline Action |
|---|---|---|---|---|
| Facility Switch | `info` | Facility Switched | `Active workspace changed to [Branch Name].` | Undo Switch |
| Cloud Sync / Offline | `success` / `error` | Cloud Data Synced | `All offline changes synchronized with Supabase.` | Status Log |
| Voucher Activated | `success` | Perpetual License Active | `Lifetime [Plan] entitlement unlocked successfully.` | View License |

---

## 3. Visual Identity & Spring Physics

### Component Styling (`ToastStack.tsx` & `src/index.css`)
- **Dimensions**: Fixed 320px width (`W = 320`), 64px toast height (`H = 64`), 14px peek distance (`peek = 14`).
- **Spring Configuration**:
  $$\text{stiffness} = 380, \quad \text{damping} = 34, \quad \text{mass} = 1$$
  Settles smoothly with a hint of tactile give and zero jitter.
- **Stacked Rest State**:
  - Front card: Full opacity, solid `#ffffff` background (light) or `#1c1c20` (dark), crisp status icon (`#1f9d55` success, `#e5484d` error, `#e09a12` warning, muted info).
  - Tucked cards: Scaled down ($1 - d \times 0.05$), with a subtle 6% tint wash and hairline border.
- **Fanned Open State**:
  - Pointer over / focus: Fans out into a clean vertical list of up to 3 cards spaced by 10px gap.
  - Front card sits comfortably at the bottom, earlier cards stacked above.
- **Interactive Controls**:
  - `tst-act`: Pill button with hover scale ($0.96$ active press) triggering custom callbacks.
  - `tst-x`: Quick circular dismissal with smooth exit slide to the right (`x: 60`, `opacity: 0`).

---

## 4. Technical Architecture & State Integration

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Atrium State Store (store.ts)                   │
├────────────────────────────────────────────────────────────────────────┤
│ • toastQueue: ToastItem[] (Category-tagged, action-enabled)            │
│ • pushToast(kind, title, body, options: { action, onAction, vertical }) │
│ • dismissToast(id: string)                                             │
│ • Background Event Synthesizer (Periodic domain intelligence pulses)   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│  ToastStack UI Component             │  │ Operational Action Triggers  │
├──────────────────────────────────────┤  ├──────────────────────────────┤
│ • Framer Motion spring positioning   │  │ • POS checkout / print       │
│ • Hover open/close fanning           │  │ • Roll call attendance save  │
│ • Auto-dismiss timer with pause      │  │ • Appointment chair status   │
│ • Inline action execution            │  │ • Venue escrow hold/release  │
└──────────────────────────────────────┘  │ • Freelance time log & bill  │
                                          └──────────────────────────────┘
```

### Store Enhancements (`src/services/store.ts` & `src/types/index.ts`)
1. **Toast Model Upgrade**:
   ```typescript
   export interface EnhancedToast {
     id: string;
     kind: 'success' | 'info' | 'error' | 'warning';
     title: string;
     body: string;
     category?: BusinessCategory;
     action?: {
       label: string;
       onClick: () => void;
     };
     timestamp: number;
   }
   ```
2. **Category Simulation Engine**:
   - Realistic background intelligence timer (e.g. firing every 45–60s) generating vertical-relevant operational events (e.g., student attendance reminder, low stock notice, turnaround reminder) that keep the workspace feeling live and production-grade.
3. **Seamless Replacement of `ToastContainer`**:
   - Replace legacy `ToastContainer.tsx` in `App.tsx` with the new kinetic `ToastStack.tsx`.

---

## 5. Execution Plan

1. **CSS Integration**: Append `.tst`, `.tst-toast`, `.tst-icon`, `.tst-text`, `.tst-act`, `.tst-x` to `src/index.css`.
2. **Component Implementation (`src/components/ui/ToastStack.tsx`)**:
   - Implement `ToastStack` with Framer Motion, 6s auto-dismiss timer, hover-pause, and inline action execution.
3. **Store Wiring**:
   - Enhance `showToast` in `src/services/store.ts` to support `action` callback and category tagging.
   - Wire high-frequency operations across vertical screens to emit category-dedicated completion toasts.
4. **App Root Replacement**:
   - Mount `<ToastStack />` at the root of `src/App.tsx`.
5. **Verification**:
   - Run `lint_applet` and `compile_applet`.
   - Verify hover fanning, keyboard accessibility (`Tab`, `Esc`), and action callbacks.
