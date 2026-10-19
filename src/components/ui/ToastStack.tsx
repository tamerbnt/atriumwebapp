import React, { type CSSProperties, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
  Sparkles,
} from "lucide-react";
import { useAtriumStore } from "../../services/store";
import { BusinessCategory, ToastNotification } from "../../types/index";

export type ToastKind = "success" | "info" | "error" | "warning";

export interface StackToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  category?: BusinessCategory;
}

const ICON: Record<ToastKind, LucideIcon> = {
  success: CircleCheck,
  info: Info,
  error: CircleX,
  warning: TriangleAlert,
};

// =========================================================================
// Category-Dedicated Notification Intelligence Pools
// =========================================================================
export const CATEGORY_NOTIFICATION_POOLS: Record<
  string,
  Omit<StackToastItem, "id">[]
> = {
  membership_session: [
    {
      kind: "success",
      title: "Member Checked In",
      body: "Walid Mesbah (RFID-8842) verified & access granted.",
      action: "Profile",
    },
    {
      kind: "warning",
      title: "Low Session Balance",
      body: "Amine K. has 1 session remaining on 10-Session Pass.",
      action: "Renew",
    },
    {
      kind: "info",
      title: "CrossFit Batch Booked",
      body: "16 athletes checked in for 18:00 WOD session.",
      action: "Roster",
    },
    {
      kind: "warning",
      title: "Plan Expiring in 3 Days",
      body: "Sarah B. Gold Membership renewal approaching.",
      action: "Extend",
    },
    {
      kind: "success",
      title: "Locker Assigned",
      body: "Locker #42 assigned to Amine K. for today's session.",
    },
  ],

  // Alias for backward compatibility
  membership_fitness: [
    {
      kind: "success",
      title: "Member Checked In",
      body: "Walid Mesbah (RFID-8842) verified & access granted.",
      action: "Profile",
    },
    {
      kind: "warning",
      title: "Low Session Balance",
      body: "Amine K. has 1 session remaining on 10-Session Pass.",
      action: "Renew",
    },
    {
      kind: "info",
      title: "CrossFit Batch Booked",
      body: "16 athletes checked in for 18:00 WOD session.",
      action: "Roster",
    },
    {
      kind: "warning",
      title: "Plan Expiring in 3 Days",
      body: "Sarah B. Gold Membership renewal approaching.",
      action: "Extend",
    },
    {
      kind: "success",
      title: "Locker Assigned",
      body: "Locker #42 assigned to Amine K. for today's session.",
    },
  ],

  appointment_service: [
    {
      kind: "success",
      title: "Appointment Booked",
      body: "Karim H. reserved with Stylist Yacine for 14:30.",
      action: "Calendar",
    },
    {
      kind: "info",
      title: "Client Seated in Chair",
      body: "Nadia B. color treatment & balayage in progress.",
      action: "Timer",
    },
    {
      kind: "success",
      title: "Treatment Sent to POS",
      body: "Service finished. 4,500 DZD billed to Register #1.",
      action: "Pay",
    },
    {
      kind: "info",
      title: "Walk-in Queue Updated",
      body: "Rania Cherif added to rapid intake waiting list.",
      action: "Queue",
    },
    {
      kind: "success",
      title: "Retail Care Upsell",
      body: "Argan Elixir 100ml added to client receipt.",
    },
  ],

  pos_inventory: [
    {
      kind: "success",
      title: "Payment Settled",
      body: "Receipt #R-2026-089 paid (6,400 DZD cash drawer).",
      action: "Receipt",
    },
    {
      kind: "warning",
      title: "Low Stock Alert",
      body: "Whey Isolate 1kg below threshold (3 units left).",
      action: "Restock",
    },
    {
      kind: "info",
      title: "Order Parked",
      body: "Cart #P-12 saved and held for Register #2.",
      action: "Recall",
    },
    {
      kind: "success",
      title: "Barcode Scanned",
      body: "Pre-Workout Energy Tub added to active checkout.",
    },
    {
      kind: "info",
      title: "Cash Drawer Float",
      body: "Opening float 15,000 DZD balanced and locked.",
    },
  ],

  rental_booking: [
    {
      kind: "success",
      title: "Venue Reserved",
      body: "Grand Ballroom booked for 24 Oct (Kaci Events).",
      action: "Contract",
    },
    {
      kind: "info",
      title: "Caution Escrow Held",
      body: "50,000 DZD security deposit held for Hall B.",
      action: "Escrow",
    },
    {
      kind: "success",
      title: "Security Deposit Released",
      body: "50,000 DZD refunded to renter after space check.",
      action: "Log",
    },
    {
      kind: "warning",
      title: "Turnaround Window (30m)",
      body: "Studio 2 session ending; cleaning squad notified.",
      action: "Inspect",
    },
    {
      kind: "warning",
      title: "Overtime Detected",
      body: "Conference Room A booking exceeded allocated slot.",
      action: "Invoice",
    },
  ],

  education_cohort: [
    {
      kind: "success",
      title: "Roll Call Completed",
      body: "Attendance saved for Full-Stack Cohort (18/20 present).",
      action: "Gradebook",
    },
    {
      kind: "success",
      title: "Tuition Installment Paid",
      body: "15,000 DZD received for Yasmine B. (Receipt #T-44).",
      action: "Receipt",
    },
    {
      kind: "success",
      title: "Diploma Minted",
      body: "Accredited certificate issued to Walid Mesbah.",
      action: "View",
    },
    {
      kind: "warning",
      title: "Student Absence Alert",
      body: "Karim T. missed 3 consecutive morning lectures.",
      action: "Contact",
    },
    {
      kind: "info",
      title: "New Admission Inquiry",
      body: "Lead received for Fall UI/UX Design Boot Camp.",
      action: "Funnel",
    },
  ],

  freelance_solo: [
    {
      kind: "success",
      title: "Time Logged to Deliverable",
      body: "2h 45m recorded for Fintech Mobile App Design.",
      action: "Invoice",
    },
    {
      kind: "success",
      title: "Invoice Settled (Paid)",
      body: "Algérie Telecom settled Invoice #INV-2026-004.",
      action: "Receipt",
    },
    {
      kind: "success",
      title: "Proposal Accepted",
      body: "Brand Identity proposal signed; project created.",
      action: "Board",
    },
    {
      kind: "warning",
      title: "Retainer 85% Consumed",
      body: "Only 4.5 billable hours remaining in October.",
      action: "Bill",
    },
    {
      kind: "warning",
      title: "Scope Creep Alert",
      body: "Deliverable hours exceeded agreed budget by 18%.",
      action: "Adjust",
    },
  ],

  project_milestone: [
    {
      kind: "success",
      title: "Milestone Delivered",
      body: "Phase 2 UI Architecture approved by client stakeholder.",
      action: "Deliverables",
    },
    {
      kind: "warning",
      title: "Budget Threshold (80%)",
      body: "Fintech Mobile Redesign has reached 80% allocated hours.",
      action: "Scope",
    },
    {
      kind: "info",
      title: "Sprint Retrospective Logged",
      body: "Sprint #14 velocity closed with 42 story points completed.",
      action: "Sprint",
    },
    {
      kind: "success",
      title: "Retainer Payment Received",
      body: "Monthly agency retainer settled for October (380,000 DZD).",
      action: "Invoice",
    },
  ],

  default_global: [
    {
      kind: "success",
      title: "Cloud Synced",
      body: "All local offline changes synchronized with Supabase.",
      action: "Status",
    },
    {
      kind: "info",
      title: "Facility Workspace",
      body: "Connected to main branch operational database.",
    },
    {
      kind: "success",
      title: "Perpetual License Active",
      body: "Enterprise multi-facility entitlement verified.",
      action: "Entitlements",
    },
  ],
};

const W = 320;
const H = 64;
const SHOWN = 3;
const AUTO_DISMISS_MS = 6000;
const SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 1 } as const;

export interface ToastStackProps {
  peek?: number;
  gap?: number;
  corner?: number;
  className?: string;
}

export const ToastStack: React.FC<ToastStackProps> = ({
  peek = 14,
  gap = 10,
  corner = 20,
  className = "",
}) => {
  const {
    currentBusiness,
    toasts: storeToasts,
    dismissToast: dismissStoreToast,
    setScreen,
  } = useAtriumStore();

  const category = currentBusiness?.category || "membership_session";
  const pool =
    CATEGORY_NOTIFICATION_POOLS[category] ||
    CATEGORY_NOTIFICATION_POOLS.membership_session ||
    CATEGORY_NOTIFICATION_POOLS.default_global;

  const nextIdRef = useRef(100);
  const root = useRef<HTMLDivElement | null>(null);

  // Active stack of toasts
  const [stack, setStack] = useState<StackToastItem[]>(() => {
    return pool.slice(0, SHOWN).map((item, idx) => ({
      ...item,
      id: `init-${idx}`,
    }));
  });

  const [leaving, setLeaving] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const isHoveredRef = useRef(false);

  // When business vertical changes, refresh the pool with category-dedicated notifications
  useEffect(() => {
    const freshPool =
      CATEGORY_NOTIFICATION_POOLS[category] ||
      CATEGORY_NOTIFICATION_POOLS.membership_session ||
      CATEGORY_NOTIFICATION_POOLS.default_global;
    setStack(
      freshPool.slice(0, SHOWN).map((item, idx) => ({
        ...item,
        id: `cat-${category}-${idx}-${Date.now()}`,
      }))
    );
  }, [category]);

  // Synchronize with store toasts when a user or system event triggers showToast
  const processedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (storeToasts && storeToasts.length > 0) {
      const newToasts = storeToasts.filter((t) => !processedIdsRef.current.has(t.id));
      if (newToasts.length > 0) {
        newToasts.forEach((t) => processedIdsRef.current.add(t.id));
        const newItems: StackToastItem[] = newToasts.map((latest) => ({
          id: latest.id,
          kind: latest.type as ToastKind,
          title: latest.title,
          body: latest.message,
          action: latest.action?.label,
          onAction: latest.action?.onClick,
          category: latest.category || category,
        }));

        setStack((prev) => {
          const newIds = new Set(newItems.map((n) => n.id));
          const rest = prev.filter((t) => !newIds.has(t.id));
          return [...newItems.reverse(), ...rest].slice(0, 5);
        });
      }
    }
  }, [storeToasts, category]);

  // Keyboard accessibility: Escape collapses fanned open stack
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Auto-dismiss the front toast every 6 seconds, pausing on hover/focus
  useEffect(() => {
    if (open) return; // Never auto-dismiss while user is inspecting fanned cards

    const timer = setTimeout(() => {
      if (isHoveredRef.current || open) {
        return; // Hover pause
      }

      setStack((currentStack) => {
        if (currentStack.length <= 1) {
          // If running low, replenish with category pool
          const nextIndex = nextIdRef.current++;
          const freshItem = pool[nextIndex % pool.length];
          return [
            { ...freshItem, id: `auto-${nextIndex}` },
            ...currentStack,
          ].slice(0, SHOWN);
        }

        // Dismiss front toast and pull next item from category pool
        const [, ...rest] = currentStack;
        const nextIndex = nextIdRef.current++;
        const freshItem = pool[nextIndex % pool.length];
        return [...rest, { ...freshItem, id: `auto-${nextIndex}` }].slice(0, SHOWN);
      });
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [stack, open, pool]);

  const listH = SHOWN * H + (SHOWN - 1) * gap;
  const FH = listH;

  /* Bottom-anchored positioning: Card 0 (front) stays fixed at the bottom baseline (FH - H)
     both when closed and open. Cards 1 & 2 fan gracefully upward on hover without cursor jumping. */
  const place = (k: number) => {
    const baseBottom = FH - H;
    if (open) {
      /* Fanned open: Cards fan upwards with clean 10px spacing */
      return { y: baseBottom - k * (H + gap), scale: 1 };
    }
    /* Stacked at rest: Cards tuck behind with subtle 14px peek and slight scale */
    const d = Math.min(k, SHOWN - 1);
    return { y: baseBottom - d * peek, scale: 1 - d * 0.05 };
  };

  const dismiss = (id: string) => {
    if (leaving !== null) return;
    setLeaving(id);
    dismissStoreToast(id);

    window.setTimeout(() => {
      setStack((s) => {
        const rest = s.filter((t) => t.id !== id);
        const n = nextIdRef.current++;
        const fresh = { ...pool[n % pool.length], id: `fresh-${n}` };
        return [...rest, fresh].slice(0, SHOWN);
      });
      setLeaving(null);
    }, 220);
  };

  const handleAction = (toast: StackToastItem) => {
    if (toast.onAction) {
      toast.onAction();
    } else {
      // Default contextual routing based on action label
      const act = toast.action?.toLowerCase() || "";
      if (act.includes("receipt") || act.includes("print")) {
        window.print?.();
      } else if (act.includes("profile") || act.includes("client")) {
        setScreen("members");
      } else if (act.includes("calendar") || act.includes("schedule")) {
        setScreen("scheduler");
      } else if (act.includes("gradebook") || act.includes("cert")) {
        setScreen("members");
      } else if (act.includes("invoice") || act.includes("pay")) {
        setScreen("shop");
      } else if (act.includes("contract") || act.includes("escrow")) {
        setScreen("registrations");
      }
    }

    // Morph the toast into a confirmed success state
    setStack((s) =>
      s.map((t) =>
        t.id === toast.id
          ? {
              ...t,
              kind: "success",
              title: "Action Dispatched",
              body: `${t.title} processed successfully.`,
              action: undefined,
            }
          : t
      )
    );
  };

  return (
    <aside
      aria-label="Category notifications dock"
      className={`fixed bottom-5 right-5 z-[99999] pointer-events-auto select-none ${className}`}
    >
      <div
        ref={root}
        className="tst"
        role="region"
        aria-label="Notifications"
        data-open={open || undefined}
        style={
          {
            width: W,
            height: FH,
            ["--tst-r" as string]: `${corner}px`,
          } as CSSProperties
        }
        onPointerOver={() => {
          isHoveredRef.current = true;
          setOpen(true);
        }}
        onPointerOut={(e) => {
          const to = e.relatedTarget as Node | null;
          if (!to || !root.current?.contains(to)) {
            isHoveredRef.current = false;
            setOpen(false);
          }
        }}
        onFocus={() => {
          isHoveredRef.current = true;
          setOpen(true);
        }}
        onBlur={(e) => {
          if (!root.current?.contains(e.relatedTarget as Node | null)) {
            isHoveredRef.current = false;
            setOpen(false);
          }
        }}
      >
        {stack.slice(0, SHOWN).map((t, k) => {
          const Icon = ICON[t.kind] || Info;
          const out = leaving === t.id;
          const p = place(k);
          const front = k === 0;

          return (
            <motion.div
              key={t.id}
              className="tst-toast"
              data-kind={t.kind}
              data-front={front || undefined}
              style={{ height: H, zIndex: SHOWN - k }}
              initial={{ y: place(0).y + 24, scale: 1, opacity: 0, x: 0 }}
              animate={
                out
                  ? { y: p.y, scale: p.scale, opacity: 0, x: 60 }
                  : { y: p.y, scale: p.scale, opacity: 1, x: 0 }
              }
              transition={
                out ? { duration: 0.22, ease: [0.4, 0, 1, 1] } : SPRING
              }
              aria-hidden={!open && !front ? true : undefined}
            >
              {/* Category Icon */}
              <span className="tst-icon">
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>

              {/* Title & Body Typography */}
              <span className="tst-text">
                <b title={t.title}>{t.title}</b>
                <span title={t.body}>{t.body}</span>
              </span>

              {/* Contextual Action Button */}
              {t.action && (
                <button
                  type="button"
                  className="tst-act"
                  tabIndex={open || front ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(t);
                  }}
                  title={`Trigger ${t.action}`}
                >
                  {t.action}
                </button>
              )}

              {/* Dismiss Button */}
              <button
                type="button"
                className="tst-x"
                aria-label={`Dismiss ${t.title}`}
                tabIndex={open || front ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
              >
                <X size={15} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </aside>
  );
};

export default ToastStack;
