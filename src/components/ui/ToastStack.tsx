import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAtriumStore } from "../../services/store";
import { BusinessCategory, ToastType } from "../../types/index";

export type ToastKind = ToastType;

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

// Maintained for backward compatibility with existing tests/references
export const SALON_NOTIFICATION_POOLS: Record<string, any[]> = { en: [], fr: [], ar: [] };
export const CATEGORY_NOTIFICATION_POOLS: Record<string, any[]> = {};

export interface ToastStackProps {
  className?: string;
  peek?: number;
  gap?: number;
  corner?: number;
}

export const ToastStack: React.FC<ToastStackProps> = ({
  className = "",
  peek = 11,
  gap = 10,
  corner = 20,
}) => {
  const { toasts, dismissToast, language } = useAtriumStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isExpandedManual, setIsExpandedManual] = useState(false);

  if (!toasts || toasts.length === 0) return null;

  const isExpanded = isHovered || isExpandedManual;
  const isRtl = language === 'ar';
  const CARD_HEIGHT = 64;
  const CARD_WIDTH = 360;

  // Compute container height based on whether it is open/fanned or stacked
  const visibleCount = Math.min(toasts.length, 3);
  const containerHeight = isExpanded
    ? toasts.length * (CARD_HEIGHT + gap)
    : CARD_HEIGHT + (visibleCount - 1) * peek;

  return (
    <aside
      aria-label="Action feedback notifications"
      className={`fixed z-[99999] pointer-events-auto select-none ${className}`}
      style={{
        position: 'fixed',
        top: '76px',
        right: isRtl ? 'auto' : '24px',
        left: isRtl ? '24px' : 'auto',
        zIndex: 99999,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpandedManual(false);
      }}
    >
      <div
        className="tst relative transition-all duration-300"
        data-open={isExpanded ? "true" : undefined}
        style={
          {
            "--tst-r": `${corner}px`,
            width: `${CARD_WIDTH}px`,
            height: `${containerHeight}px`,
          } as React.CSSProperties
        }
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => {
            const Icon = ICON[toast.type] || Info;
            const isFront = index === 0;

            // When collapsed, only top 3 cards are layered
            if (!isExpanded && index > 2) return null;

            // Fanning physics calculation: fanning downwards from top position
            const yOffset = isExpanded
              ? index * (CARD_HEIGHT + gap)
              : index * peek;

            const scale = isExpanded ? 1 : Math.max(0.88, 1 - index * 0.04);
            const zIndex = isExpanded ? 50 - index : 50 - index;
            const opacity = isExpanded ? 1 : index > 2 ? 0 : 1;

            return (
              <motion.div
                key={toast.id}
                role="status"
                layout
                initial={{ opacity: 0, y: -20, scale: 0.92 }}
                animate={{
                  opacity,
                  y: yOffset,
                  scale,
                  zIndex,
                }}
                exit={{
                  opacity: 0,
                  y: -14,
                  scale: 0.9,
                  transition: { duration: 0.16 },
                }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 28,
                  mass: 0.8,
                }}
                className="tst-toast cursor-pointer"
                data-kind={toast.type}
                data-front={isFront || isExpanded ? "true" : undefined}
                style={{
                  height: `${CARD_HEIGHT}px`,
                }}
                onClick={() => {
                  if (!isExpanded && toasts.length > 1) {
                    setIsExpandedManual(true);
                  }
                }}
              >
                {/* Status Icon */}
                <span className="tst-icon shrink-0">
                  <Icon size={18} strokeWidth={2.2} />
                </span>

                {/* Text Content */}
                <div className="tst-text">
                  <b>{toast.title}</b>
                  <span>{toast.message}</span>
                </div>

                {/* Optional Action Button */}
                {toast.action && (
                  <button
                    type="button"
                    className="tst-act"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}

                {/* Dismiss Button */}
                <button
                  type="button"
                  className="tst-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(toast.id);
                  }}
                  title="Dismiss notification"
                  aria-label="Dismiss notification"
                >
                  <X size={14} strokeWidth={2.2} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </aside>
  );
};

export default ToastStack;
