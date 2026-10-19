import React, { useState } from "react";

/* ══ Action node ══════════════════════════════════════════
   A node card whose controls live in its top-right corner
   until the pointer asks for them. The component owns the
   geometry — every number that decides where a button sits is
   in ActionNode.tsx, because it is arithmetic on an arc
   and not a style. What is in CSS is what the card and the
   buttons are MADE of.

   The vertical padding on .nod is set inline for the same
   reason: it is the fan's own reach.
*/

export interface ActionNodeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  color?: string;
}

export interface ActionNodeAvatar {
  id?: string;
  name?: string;
  avatarUrl?: string;
  color?: string;
}

export interface ActionNodeProps {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  avatars?: ActionNodeAvatar[];
  moreAvatarsCount?: number;
  actions?: ActionNodeAction[];
  corner?: number;
  markCorner?: number;
  width?: number | string;
  air?: number;
  stroke?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  tag?: string;
}

export const ActionNode: React.FC<ActionNodeProps> = ({
  title,
  description,
  icon,
  avatars = [],
  moreAvatarsCount,
  actions = [],
  corner = 20,
  markCorner = 14,
  width = 272,
  air = 36,
  stroke = true,
  selected = false,
  onClick,
  className = "",
  children,
  tag,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Geometry: Fan buttons fanned out along an arc around top-right corner
  // Struck from 26px inside the top-right corner
  const fanRadius = 56;
  const numActions = actions.length;

  // Arc angles in radians: from ~115 deg (top) down to -25 deg (right)
  const startDeg = -75;
  const endDeg = 25;
  const stepDeg = numActions > 1 ? (endDeg - startDeg) / (numActions - 1) : 0;

  return (
    <div
      className={`nod ${className}`}
      data-stroke={stroke ? "on" : "off"}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ padding: `${air}px 0`, width: typeof width === "number" ? `${width}px` : width }}
    >
      {/* ── THE CARD ────────────────────────────────────── */}
      <div
        className={`nod-card cursor-pointer select-none ${
          selected ? "ring-2 ring-[#C4785A] border-transparent" : ""
        }`}
        data-on={isHovered ? "true" : "false"}
        onClick={onClick}
        style={
          {
            width: typeof width === "number" ? `${width}px` : width,
            "--nod-r": `${corner}px`,
          } as React.CSSProperties
        }
      >
        {/* Top Header: Mark Icon & Step/Item Name */}
        <div className="nod-top">
          {icon && (
            <div
              className="nod-mark shrink-0"
              style={{ "--nod-mark-r": `${markCorner}px` } as React.CSSProperties}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="nod-name truncate text-neutral-900 dark:text-white">
              {title}
            </div>
            {tag && (
              <span className="inline-block mt-0.5 text-[10.5px] font-bold text-[#C4785A] tracking-wider uppercase">
                {tag}
              </span>
            )}
          </div>
        </div>

        {/* Description Sentence */}
        {description && (
          <p className="nod-say line-clamp-2">
            {description}
          </p>
        )}

        {/* Custom Body / Metadata */}
        {children && <div className="mt-3">{children}</div>}

        {/* Avatars Stack & Chain */}
        {avatars.length > 0 && (
          <div className="nod-chain">
            {avatars.slice(0, 4).map((av, idx) => (
              <div
                key={av.id || idx}
                className="nod-link"
                style={{ backgroundColor: av.color || undefined }}
                title={av.name}
              >
                {av.avatarUrl ? (
                  <img src={av.avatarUrl} alt={av.name || "avatar"} />
                ) : (
                  <span>{(av.name || "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
            ))}
            {(moreAvatarsCount || (avatars.length > 4 ? avatars.length - 4 : 0)) > 0 && (
              <span className="nod-more">
                +{moreAvatarsCount || avatars.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── THE FAN OF CONTROLS (Corner Controls on Hover) ──────── */}
      {actions.length > 0 && (
        <div className="nod-fan">
          {/* Hover Reach Zone */}
          <div
            className="nod-reach"
            data-on={isHovered ? "true" : "false"}
            style={{
              top: -air,
              right: -air,
              width: air * 2 + 32,
              height: air * 2 + 32,
            }}
          />

          {actions.map((act, idx) => {
            const angleDeg = numActions === 1 ? -30 : startDeg + idx * stepDeg;
            const angleRad = (angleDeg * Math.PI) / 180;
            // Coordinate relative to top-right corner
            const dx = Math.round(fanRadius * Math.cos(angleRad));
            const dy = Math.round(fanRadius * Math.sin(angleRad));

            return (
              <button
                key={act.id}
                type="button"
                className="nod-act"
                title={act.label}
                aria-label={act.label}
                onClick={(e) => {
                  e.stopPropagation();
                  act.onClick(e);
                }}
                style={{
                  transform: isHovered
                    ? `translate(${dx}px, ${dy}px) translate(-50%, -50%)`
                    : "translate(-12px, 12px) translate(-50%, -50%) scale(0.4)",
                  opacity: isHovered ? 1 : 0,
                  pointerEvents: isHovered ? "auto" : "none",
                  transitionDelay: isHovered ? `${idx * 28}ms` : "0ms",
                  color: act.color,
                }}
              >
                {act.icon}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActionNode;
