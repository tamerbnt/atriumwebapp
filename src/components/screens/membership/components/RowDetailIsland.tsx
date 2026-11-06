import React from 'react';
import { clamp } from '../motion/adherentsMotion';
import { User, RotateCcw, Archive } from 'lucide-react';

export interface RowDetailSection {
  title: string;
  items: React.ReactNode[];
}

export interface RowDetailIslandProps {
  /** Spring e value (0..100) */
  eValue: number;
  rowWidth?: number;
  rowHeight?: number;
  detailHeight?: number;
  buttonSize?: number;
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
  onOpenDetails?: () => void;
  onRenew?: () => void;
  onArchive?: () => void;
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
  rowHeight = 62,
  detailHeight = 150,
  buttonSize = 38,
  gap = 8,
  contactInfo,
  planInfo,
  notes,
  onOpenDetails,
  onRenew,
  onArchive,
  actions,
  children,
  className = '',
}) => {
  const e = clamp(eValue / 100, 0, 1.1);
  if (e < 0.01) return null;

  const w = rowWidth;
  const RH = rowHeight;
  const B = buttonSize;
  const G = gap;
  const DH = detailHeight;

  // Exact rectangle interpolation from the prototype (supports both explicit px and fluid 100%):
  const isFluid = rowWidth === undefined || rowWidth <= 0;
  const leftCss = isFluid ? `calc((100% - 14px - ${B}px) * ${1 - e})` : `${(rowWidth - 14 - B) * (1 - e)}px`;
  const widthCss = isFluid ? `calc(${B}px + (100% - ${B}px) * ${e})` : `${Math.max(0, B + (rowWidth - B) * e)}px`;
  const top = (RH / 2 - B / 2) * (1 - e) + (RH + G) * e;
  const currentHeight = Math.max(0, B + (DH - B) * e);
  const borderRadius = 19 + 3 * e;

  // Content fade and interaction gate:
  const sh = clamp((e - 0.55) / 0.35, 0, 1);
  const isInteractive = sh > 0.6;

  const detailActions = actions || [
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

  return (
    <>
      {/* Expanding slab background (.det) */}
      <div
        className={`det border border-[#F3C9BA] bg-[#FBE7DF] shadow-sm pointer-events-none ${className}`}
        style={{
          position: 'absolute',
          display: 'block',
          left: leftCss,
          top: `${top}px`,
          width: widthCss,
          height: `${currentHeight}px`,
          borderRadius: `${borderRadius}px`,
          boxSizing: 'border-box',
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* Content panel (.dc) */}
      <div
        className="dc"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${RH + G}px`,
          height: `${DH}px`,
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.2fr auto',
          gap: '28px',
          padding: '18px 22px',
          boxSizing: 'border-box',
          opacity: sh,
          pointerEvents: isInteractive ? 'auto' : 'none',
        }}
        aria-hidden={!isInteractive}
      >
        {children ? (
          children
        ) : (
          <>
            <div>
              <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C]">
                Contact
              </h4>
              <p className="m-0 mb-1 text-[13px] leading-snug text-[#1B1917] font-medium">
                {contactInfo?.phone || '—'}
              </p>
              <p className="m-0 text-[13px] leading-snug text-[#6B635C] truncate">
                {contactInfo?.email || '—'}
              </p>
            </div>

            <div>
              <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C]">
                Forfait
              </h4>
              <p className="m-0 mb-1 text-[13px] leading-snug font-semibold text-[#1B1917]">
                {planInfo?.planName || '—'}
              </p>
              <p className="m-0 mb-1 text-[12px] leading-snug text-[#6B635C]">
                Échéance {planInfo?.expiry || '—'} · {planInfo?.daysLeft || ''}
              </p>
              {planInfo?.remainingSessions !== undefined && (
                <p className="m-0 text-[12px] font-medium text-[#0B7A45]">
                  {planInfo.remainingSessions} séances restantes
                </p>
              )}
            </div>

            <div>
              <h4 className="m-0 mb-1.5 font-mono text-[11px] font-bold tracking-widest uppercase text-[#6B635C]">
                Notes
              </h4>
              <p className="m-0 text-[13px] leading-snug text-[#6B635C] line-clamp-3 italic">
                {notes || 'Aucune note.'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 justify-end">
              {detailActions.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  tabIndex={isInteractive ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    btn.onClick();
                  }}
                  className="h-8 px-3.5 border border-[#E6DED6] rounded-[10px] bg-white font-medium text-[13px] text-[#1B1917] flex items-center gap-2 hover:bg-[#1B1917] hover:text-white transition-colors duration-150 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  {btn.icon}
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};
