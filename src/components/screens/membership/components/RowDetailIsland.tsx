import React from 'react';
import { clamp } from '../motion/adherentsMotion';
import { User, Archive, Snowflake, Pin, CreditCard, RotateCcw } from 'lucide-react';

export interface RowDetailIslandProps {
  /** Spring e value (0..100) */
  eValue: number;
  rowWidth?: number;
  rowHeight?: number;
  detailHeight?: number;
  gap?: number;
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
  actions?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
  children?: React.ReactNode;
  className?: string;
}

export const RowDetailIsland: React.FC<RowDetailIslandProps> = ({
  eValue,
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
  actions,
  children,
  className = '',
}) => {
  const H = 68;
  const G = 8;
  const DH = 176;
  const B = 36;
  const W = Math.max(B, rowWidth || 1200);

  const e = clamp(eValue / 100, 0, 1.1);
  const isHidden = e < 0.01;

  // Island morphing geometry from prototype specification:
  // left=(W-14-B)(1-e); top=16(1-e)+(H+G)e; width=B+(W-B)e; height=B+(DH-B)e; radius=18+4e; display none while e < 0.01.
  const islandLeft = (W - 14 - B) * (1 - e);
  const islandTop = 16 * (1 - e) + (H + G) * e;
  const islandWidth = B + (W - B) * e;
  const islandHeight = B + (DH - B) * e;
  const islandRadius = 18 + 4 * e;

  // Content layer: top=H+G, height=DH, opacity=clamp((e-0.55)/0.35,0,1);
  // only interactive and tabbable when that opacity > 0.6.
  const opacity = clamp((e - 0.55) / 0.35, 0, 1);
  const isInteractive = opacity > 0.6;

  const defaultActions = [
    ...(onOpenDetails
      ? [
          {
            id: 'open',
            label: 'Ouvrir la fiche',
            icon: <User className="w-3.5 h-3.5 text-[#C9441F]" />,
            onClick: onOpenDetails,
          },
        ]
      : []),
    ...(onRenew
      ? [
          {
            id: 'renew',
            label: 'Renouveler',
            icon: <RotateCcw className="w-3.5 h-3.5 text-[#0B7A45]" />,
            onClick: onRenew,
          },
        ]
      : []),
    ...(onToggleStatus
      ? [
          {
            id: 'freeze',
            label: isBlocked ? 'Débloquer badge' : 'Geler badge',
            icon: <Snowflake className="w-3.5 h-3.5 text-[#3B82F6]" />,
            onClick: onToggleStatus,
          },
        ]
      : []),
    ...(onTogglePin
      ? [
          {
            id: 'pin',
            label: isPinned ? 'Détacher' : 'Épingler en haut',
            icon: <Pin className="w-3.5 h-3.5 text-[#E8B33F]" />,
            onClick: onTogglePin,
          },
        ]
      : []),
    ...(onPay
      ? [
          {
            id: 'pay',
            label: 'Encaisser / Solde',
            icon: <CreditCard className="w-3.5 h-3.5 text-[#0B7A45]" />,
            onClick: onPay,
          },
        ]
      : []),
    ...(onArchive
      ? [
          {
            id: 'archive',
            label: 'Archiver',
            icon: <Archive className="w-3.5 h-3.5 text-[#6B635C]" />,
            onClick: onArchive,
          },
        ]
      : []),
  ];

  const detailActions = actions && actions.length > 0 ? actions : defaultActions;

  return (
    <>
      {/* 1. Morphing Island Slab (.isl) - z-index: 0 */}
      <div
        className="isl det absolute bg-white dark:bg-[#1A1A1A] border border-[#E6DED6] dark:border-[#3A3734] shadow-xs pointer-events-none z-0 box-border transition-[border-color,background-color] duration-150"
        style={{
          display: isHidden ? 'none' : 'block',
          left: e >= 0.99 ? 0 : `${islandLeft}px`,
          right: e >= 0.99 ? 0 : undefined,
          width: e >= 0.99 ? '100%' : `${islandWidth}px`,
          top: `${islandTop}px`,
          height: `${islandHeight}px`,
          borderRadius: `${islandRadius}px`,
        }}
      />

      {/* 2. Content Layer (.dc) - z-index: 2, top: H+G, height: DH */}
      <div
        className={`dc absolute left-0 right-0 z-[2] select-text box-border ${className}`}
        style={{
          display: isHidden ? 'none' : 'grid',
          top: `${H + G}px`,
          height: `${DH}px`,
          opacity,
          pointerEvents: isInteractive ? 'auto' : 'none',
          gridTemplateColumns: 'minmax(140px, 1fr) minmax(160px, 1.1fr) minmax(140px, 1fr) auto',
          gap: '20px',
          padding: '18px 24px',
        }}
        aria-hidden={!isInteractive}
      >
      {children ? (
        children
      ) : (
        <>
          {/* Col 1: Contact */}
          <div className="flex flex-col min-w-0 justify-center">
            <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C] dark:text-[#A89F95]">
              Contact
            </h4>
            <p className="m-0 mb-1 font-mono text-[13px] text-[#1B1917] dark:text-[#F3EDE7] font-semibold truncate">
              {contactInfo?.phone || 'Non renseigné'}
            </p>
            <p className="m-0 text-[12.5px] text-[#6B635C] dark:text-[#A89F95] truncate">
              {contactInfo?.email || 'Sans email'}
            </p>
          </div>

          {/* Col 2: Forfait */}
          <div className="flex flex-col min-w-0 justify-center">
            <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C] dark:text-[#A89F95]">
              Forfait
            </h4>
            <p className="m-0 mb-1 text-[13px] font-bold text-[#1B1917] dark:text-[#F3EDE7] truncate">
              {planInfo?.planName || 'Standard'}
            </p>
            <p className="m-0 mb-1 text-[12px] text-[#6B635C] dark:text-[#A89F95] truncate">
              Échéance {planInfo?.expiry || '—'} · {planInfo?.daysLeft || ''}
            </p>
            {planInfo?.remainingSessions !== undefined && (
              <p className="m-0 text-[12px] font-semibold text-[#0B7A45] dark:text-[#3CE085]">
                {planInfo.remainingSessions} séances restantes
              </p>
            )}
          </div>

          {/* Col 3: Notes */}
          <div className="flex flex-col min-w-0 justify-center">
            <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C] dark:text-[#A89F95]">
              Notes
            </h4>
            <p className="m-0 text-[12.5px] leading-relaxed text-[#6B635C] dark:text-[#A89F95] line-clamp-3 italic">
              {notes || 'Aucune note sur cet adhérent.'}
            </p>
          </div>

          {/* Col 4: Action cluster (.db) - Two column button grid for compact fit */}
          <div className="db grid grid-cols-2 gap-2 self-center shrink-0">
            {detailActions.map((btn) => (
              <button
                key={btn.id}
                type="button"
                data-no-liquid="true"
                tabIndex={isInteractive ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  btn.onClick();
                }}
                className="h-[32px] px-3 rounded-[9px] border border-[#E6DED6] dark:border-[#3A3734] bg-[#F7F4F1] dark:bg-[#262422] hover:bg-[#1B1917] hover:text-white dark:hover:bg-[#C9441F] dark:hover:text-white text-[#1B1917] dark:text-[#EAE3DC] font-medium text-[11.5px] flex items-center gap-2 transition-colors duration-140 cursor-pointer shadow-2xs whitespace-nowrap"
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
