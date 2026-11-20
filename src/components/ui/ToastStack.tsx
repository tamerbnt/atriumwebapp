import React from "react";
import {
  Check,
  Info,
  AlertTriangle,
  X,
  Undo2,
} from "lucide-react";
import {
  useAtriumSelector,
  shallowEqualObjects,
  beginToastExit,
  pauseToast,
  resumeToast,
} from "../../services/store";
import { getUndoButtonLabel } from "../../services/undoEngine";
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

// Maintained for backward compatibility with existing tests/references
export const SALON_NOTIFICATION_POOLS: Record<string, any[]> = { en: [], fr: [], ar: [] };
export const CATEGORY_NOTIFICATION_POOLS: Record<string, any[]> = {};

export interface ToastStackProps {
  className?: string;
  peek?: number;
  gap?: number;
  corner?: number;
}

export const ToastStack: React.FC<ToastStackProps> = ({ className = "" }) => {
  const { toasts, language } = useAtriumSelector(
    (s) => ({ toasts: s.toasts, language: s.language }),
    shallowEqualObjects
  );

  if (!toasts || toasts.length === 0) return null;

  // MaxVisibleToasts = 1 per Atrium Desktop Undo Spec
  const activeToast = toasts[0];
  if (!activeToast) return null;

  const isUndo = Boolean(activeToast.hasUndo && activeToast.onUndo);
  const undoText = activeToast.undoLabel || getUndoButtonLabel(language);
  const displayMessage = activeToast.message || activeToast.title;
  const durationMs = activeToast.duration ?? (isUndo ? 6000 : 3000);

  const renderStatusIcon = () => {
    switch (activeToast.type) {
      case "success":
        return <Check size={14} strokeWidth={2.25} style={{ color: "#10B981" }} />;
      case "error":
        return <X size={14} strokeWidth={2.25} style={{ color: "#EF4444" }} />;
      case "warning":
        return <AlertTriangle size={14} strokeWidth={2} style={{ color: "#F59E0B" }} />;
      case "info":
      default:
        return (
          <Info
            size={14}
            strokeWidth={2}
            style={{ color: activeToast.facilityAccent || "var(--facility-accent, var(--brand-fill, #C9461F))" }}
          />
        );
    }
  };

  return (
    <aside
      aria-label="Action feedback notifications"
      aria-live="polite"
      className={`atrium-toast-container select-none ${className}`}
    >
      <div
        key={activeToast.id}
        role="status"
        data-toast-id={activeToast.id}
        data-has-undo={isUndo ? "true" : "false"}
        className={`atrium-toast-card ${activeToast.isExiting ? "exiting" : ""}`}
        style={
          activeToast.facilityAccent
            ? ({ "--facility-accent": activeToast.facilityAccent } as React.CSSProperties)
            : undefined
        }
        onMouseEnter={() => pauseToast(activeToast.id)}
        onMouseLeave={() => resumeToast(activeToast.id)}
      >
        <div className="atrium-toast-row">
          {/* Col 0: Status Icon */}
          <span className="atrium-toast-icon" aria-hidden="true">
            {renderStatusIcon()}
          </span>

          {/* Col 1: Message Text */}
          <span className="atrium-toast-msg" title={displayMessage}>
            {displayMessage}
          </span>

          {/* Col 2: Inline Undo / Optional Action Button */}
          {isUndo ? (
            <button
              type="button"
              data-no-liquid="true"
              className="atrium-undo-btn"
              onClick={async (e) => {
                e.stopPropagation();
                const undoFn = activeToast.onUndo;
                beginToastExit(activeToast.id);
                if (undoFn) {
                  await undoFn();
                }
              }}
            >
              <Undo2 size={13} strokeWidth={2.1} aria-hidden="true" />
              <span>{undoText}</span>
            </button>
          ) : activeToast.action ? (
            <button
              type="button"
              data-no-liquid="true"
              className="atrium-undo-btn"
              onClick={async (e) => {
                e.stopPropagation();
                const act = activeToast.action;
                beginToastExit(activeToast.id);
                if (act?.onClick) {
                  await act.onClick();
                }
              }}
            >
              <span>{activeToast.action.label}</span>
            </button>
          ) : (
            <span aria-hidden="true" />
          )}

          {/* Col 3: Dismiss (×) Button */}
          <button
            type="button"
            data-no-liquid="true"
            className="atrium-dismiss-btn"
            onClick={(e) => {
              e.stopPropagation();
              beginToastExit(activeToast.id);
            }}
            title={language === "ar" ? "إغلاق" : language === "fr" ? "Fermer" : "Dismiss"}
            aria-label={language === "ar" ? "إغلاق التنبيه" : language === "fr" ? "Fermer la notification" : "Dismiss notification"}
          >
            <X size={10} strokeWidth={2.25} />
          </button>
        </div>

        {/* Row 1: Burning Fuse Bar (only when HasUndo = true) */}
        {isUndo && (
          <div className="atrium-fuse-track" aria-hidden="true">
            <div
              className={`atrium-fuse-bar ${activeToast.isPaused ? "paused" : ""}`}
              style={{ animationDuration: `${durationMs}ms` }}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

export default ToastStack;
