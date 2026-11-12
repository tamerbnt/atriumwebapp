import React from 'react';
import { clamp, ROW_H, ROW_G, ROW_DH, ROW_B } from '../motion/adherentsMath';
import { User, Archive, Snowflake, Pin, CreditCard, RotateCcw } from 'lucide-react';

export interface RowDetailIslandProps {
  /** Spring e value (0..100) for standalone non-kinetic usage */
  eValue?: number;
  rowWidth?: number;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  planInfo?: {
    planName?: string;
    expiry?: string;
    daysLeft?: string;
    remainingSessions?: number | string;
  };
  notes?: string;
  isBlocked?: boolean;
  isPinned?: boolean;
  onOpenDetails?: () => void;
  onRenew?: () => void;
  onArchive?: () => void;
  onToggleStatus?: () => void;
  onTogglePin?: () => void;
  onPay?: () => void;
  detRef?: React.Ref<HTMLDivElement>;
  dcRef?: React.Ref<HTMLDivElement>;
  renderContent?: boolean;
  actions?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
  children?: React.ReactNode;
  className?: string;
}

const DET_CONTROLLED_BASE_STYLE: React.CSSProperties = { display: 'none' };

const DC_CONTROLLED_BASE_STYLE: React.CSSProperties = {
  display: 'none',
  top: `${ROW_H + ROW_G}px`,
  height: `${ROW_DH}px`,
  gridTemplateColumns: '1fr 1fr 1.2fr auto',
  gap: '24px',
  padding: '16px 22px',
};

export const RowDetailIsland: React.FC<RowDetailIslandProps> = ({
  eValue = 0,
  rowWidth = 1200,
  contactInfo,
  planInfo,
  notes,
  isBlocked = false,
  isPinned = false,
  onOpenDetails,
  onRenew,
  onArchive,
  onToggleStatus,
  onTogglePin,
  onPay,
  detRef,
  dcRef,
  renderContent = true,
  actions,
  children,
  className = '',
}) => {
  const W = Math.max(ROW_B, rowWidth || 1200);
  const e = clamp(eValue / 100, 0, 1.1);
  const isHidden = e < 0.01;
  const opacity = clamp((e - 0.55) / 0.35, 0, 1);
  const isInteractive = opacity > 0.6;

  const islandLeft = (W - 14 - ROW_B) * (1 - e);
  const islandTop = (ROW_H / 2 - ROW_B / 2) * (1 - e) + (ROW_H + ROW_G) * e;
  const islandWidth = ROW_B + (W - ROW_B) * e;
  const islandHeight = ROW_B + (ROW_DH - ROW_B) * e;
  const islandRadius = 19 + 3 * e;

  let detailActions: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }> = [];

  if (renderContent && !children) {
    if (actions && actions.length > 0) {
      detailActions = actions;
    } else {
      detailActions = [
        ...(onOpenDetails
          ? [
              {
                id: 'open',
                label: 'Ouvrir la fiche',
                icon: <User className="w-3.5 h-3.5 text-[var(--atr-acc,#C9441F)]" />,
                onClick: onOpenDetails,
              },
            ]
          : []),
        ...(onRenew
          ? [
              {
                id: 'renew',
                label: 'Renouveler',
                icon: <RotateCcw className="w-3.5 h-3.5 text-[var(--atr-ok,#0B7A45)]" />,
                onClick: onRenew,
              },
            ]
          : []),
        ...(onToggleStatus
          ? [
              {
                id: 'freeze',
                label: isBlocked ? 'Débloquer badge' : 'Geler badge',
                icon: <Snowflake className="w-3.5 h-3.5 text-sky-500" />,
                onClick: onToggleStatus,
              },
            ]
          : []),
        ...(onTogglePin
          ? [
              {
                id: 'pin',
                label: isPinned ? 'Détacher' : 'Épingler',
                icon: <Pin className="w-3.5 h-3.5 text-amber-500" />,
                onClick: onTogglePin,
              },
            ]
          : []),
        ...(onPay
          ? [
              {
                id: 'pay',
                label: 'Solde',
                icon: <CreditCard className="w-3.5 h-3.5 text-[var(--atr-ok,#0B7A45)]" />,
                onClick: onPay,
              },
            ]
          : []),
        ...(onArchive
          ? [
              {
                id: 'archive',
                label: 'Archiver',
                icon: <Archive className="w-3.5 h-3.5 text-[var(--atr-mut,#6B635C)]" />,
                onClick: onArchive,
              },
            ]
          : []),
      ];
    }
  }

  return (
    <>
      {/* 1. Morphing Island Slab (.det) - z-index: 0, driven by rAF refs */}
      <div
        ref={detRef}
        className="det absolute bg-[var(--atr-hl,#FBE7DF)] dark:bg-[#2C1D18] border border-[#F3C9BA] dark:border-[#52291F] rounded-[20px] box-border z-0 pointer-events-none"
        style={
          detRef
            ? DET_CONTROLLED_BASE_STYLE
            : {
                display: isHidden ? 'none' : 'block',
                left: `${islandLeft}px`,
                top: `${islandTop}px`,
                width: `${islandWidth}px`,
                height: `${islandHeight}px`,
                borderRadius: `${islandRadius}px`,
              }
        }
      />

      {/* 2. Content Layer (.dc) - top: 70px, height: 150px, z-index: 2 */}
      <div
        ref={dcRef}
        className={`dc absolute left-0 right-0 z-[2] select-text box-border ${className}`}
        style={
          dcRef
            ? DC_CONTROLLED_BASE_STYLE
            : {
                display: isHidden ? 'none' : 'grid',
                top: `${ROW_H + ROW_G}px`,
                height: `${ROW_DH}px`,
                opacity,
                pointerEvents: isInteractive ? 'auto' : 'none',
                gridTemplateColumns: '1fr 1fr 1.2fr auto',
                gap: '24px',
                padding: '16px 22px',
              }
        }
        aria-hidden={dcRef ? true : !isInteractive}
      >
        {!renderContent ? null : children ? (
          children
        ) : (
          <>
            {/* Col 1: Contact */}
            <div className="flex flex-col min-w-0 justify-center">
              <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[var(--atr-mut,#6B635C)]">
                Contact
              </h4>
              <p className="m-0 mb-1 font-mono text-[13px] text-[var(--atr-ink,#1B1917)] font-semibold truncate">
                {contactInfo?.phone || 'Non renseigné'}
              </p>
              <p className="m-0 text-[12.5px] text-[var(--atr-mut,#6B635C)] truncate">
                {contactInfo?.email || 'Sans email'}
              </p>
            </div>

            {/* Col 2: Forfait */}
            <div className="flex flex-col min-w-0 justify-center">
              <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[var(--atr-mut,#6B635C)]">
                Forfait
              </h4>
              <p className="m-0 mb-1 text-[13px] font-bold text-[var(--atr-ink,#1B1917)] truncate">
                {planInfo?.planName || 'Standard'}
              </p>
              <p className="m-0 mb-0.5 text-[12px] text-[var(--atr-mut,#6B635C)] truncate">
                Échéance {planInfo?.expiry || '—'} · {planInfo?.daysLeft || ''}
              </p>
              {planInfo?.remainingSessions !== undefined && (
                <p className="m-0 text-[12px] font-semibold text-[var(--atr-ok,#0B7A45)]">
                  {planInfo.remainingSessions} séances restantes
                </p>
              )}
            </div>

            {/* Col 3: Notes */}
            <div className="flex flex-col min-w-0 justify-center">
              <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[var(--atr-mut,#6B635C)]">
                Notes
              </h4>
              <p className="m-0 text-[12.5px] leading-snug text-[var(--atr-mut,#6B635C)] line-clamp-3">
                {notes || 'Aucune note.'}
              </p>
            </div>

            {/* Col 4: Action cluster (.db) */}
            <div className="db grid grid-cols-2 gap-1.5 self-center shrink-0">
              {detailActions.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  data-no-liquid="true"
                  tabIndex={dcRef ? -1 : isInteractive ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    btn.onClick();
                  }}
                  className="h-[30px] px-3 rounded-[9px] border border-[var(--atr-line,#E6DED6)] bg-white dark:bg-[#262422] hover:bg-[#1B1917] hover:text-white dark:hover:bg-[var(--atr-acc,#E8643F)] dark:hover:text-black text-[var(--atr-ink,#1B1917)] font-medium text-[11.5px] flex items-center gap-1.5 transition-colors duration-140 cursor-pointer whitespace-nowrap"
                >
                  {btn.icon}
                  <span className="truncate">{btn.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};
