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
  const e = clamp(eValue / 100, 0, 1.08);
  if (e < 0.02) return null;

  // Content fade and interaction gate matching members2_reference.html:
  // dtl.style.opacity = cl((e - 0.5) / 0.4, 0, 1);
  const opacity = clamp((e - 0.45) / 0.4, 0, 1);
  const isInteractive = e > 0.65;

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
    <div
      className={`dt absolute left-0 right-0 top-[80px] h-[150px] rounded-[14px] bg-white dark:bg-[#1A1A1A] border border-[#E4DCD5] dark:border-[#3A3734] shadow-xs select-text box-border z-[2] transition-opacity duration-150 ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr 1.2fr auto',
        gap: '24px',
        padding: '18px 24px',
        opacity: opacity,
        pointerEvents: isInteractive ? 'auto' : 'none',
      }}
      aria-hidden={!isInteractive}
    >
      {children ? (
        children
      ) : (
        <>
          {/* Col 1: Contact */}
          <div className="flex flex-col min-w-0">
            <h4 className="m-0 mb-2 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C] dark:text-[#A89F95]">
              Contact
            </h4>
            <p className="m-0 mb-1 font-mono text-[13px] text-[#1B1917] dark:text-[#F3EDE7] font-semibold truncate">
              {contactInfo?.phone || 'Non renseigné'}
            </p>
            <p className="m-0 text-[13px] text-[#6B635C] dark:text-[#A89F95] truncate">
              {contactInfo?.email || 'Sans email'}
            </p>
          </div>

          {/* Col 2: Forfait */}
          <div className="flex flex-col min-w-0">
            <h4 className="m-0 mb-2 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C] dark:text-[#A89F95]">
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
          <div className="flex flex-col min-w-0">
            <h4 className="m-0 mb-2 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C] dark:text-[#A89F95]">
              Notes
            </h4>
            <p className="m-0 text-[13px] leading-relaxed text-[#6B635C] dark:text-[#A89F95] line-clamp-3 italic">
              {notes || 'Aucune note sur cet adhérent.'}
            </p>
          </div>

          {/* Col 4: Action cluster (.db) */}
          <div className="db flex flex-col gap-1.5 justify-end items-end shrink-0">
            {detailActions.map((btn) => (
              <button
                key={btn.id}
                type="button"
                tabIndex={isInteractive ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  btn.onClick();
                }}
                className="h-[30px] px-3 rounded-[9px] border border-[#E6DED6] dark:border-[#3A3734] bg-[#F7F4F1] dark:bg-[#262422] hover:bg-[#1B1917] hover:text-white dark:hover:bg-[#C9441F] dark:hover:text-white text-[#1B1917] dark:text-[#EAE3DC] font-medium text-[12px] flex items-center gap-2 transition-colors duration-140 cursor-pointer shadow-2xs whitespace-nowrap"
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
