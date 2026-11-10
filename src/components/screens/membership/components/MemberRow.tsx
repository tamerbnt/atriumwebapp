import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { RowFan } from './RowFan';
import { RowDetailIsland } from './RowDetailIsland';
import { clamp, useSpring } from '../motion/adherentsMotion';

export interface MemberRowData {
  id: string | number;
  name: string;
  phone?: string;
  email?: string;
  planName: string;
  status: string; // e.g. 'Actif' | 'Bloqué' | 'Expiré'
  statusVariant?: 'active' | 'blocked' | 'expired';
  expiryDate: string;
  daysRemainingLabel: string;
  balance: number;
  balanceLabel?: string;
  avatarColor?: string;
  avatarText?: string;
  remainingSessions?: number;
  notes?: string;
  isBlocked?: boolean;
  isPinned?: boolean;
}

export interface MemberRowProps {
  member: MemberRowData;
  isSelected?: boolean;
  isOpen?: boolean; // Panel is open for this member
  isExpanded?: boolean; // Island dropdown is expanded
  isPinned?: boolean;
  viewMode?: 'list' | 'grid';
  /** Optional explicit Spring coordinates for absolute-positioned spring lists */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Presence spring value 0..100 (defaults to 100) */
  pValue?: number;
  /** Expand spring value 0..100 (if provided, overrides internal hook) */
  eValue?: number;
  onSelect?: (id: string | number, e: React.MouseEvent) => void;
  onToggleExpand?: (id: string | number) => void;
  onOpenDetails?: (id: string | number) => void;
  onEdit?: (id: string | number) => void;
  onMessage?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onRenew?: (id: string | number) => void;
  onArchive?: (id: string | number) => void;
  onToggleStatus?: (id: string | number) => void;
  onTogglePin?: (id: string | number) => void;
  onPay?: (id: string | number) => void;
  className?: string;
}

export const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isSelected = false,
  isOpen = false,
  isExpanded = false,
  isPinned = false,
  viewMode = 'list',
  x,
  y,
  width,
  height,
  pValue = 100,
  eValue: externalEValue,
  onSelect,
  onToggleExpand,
  onOpenDetails,
  onEdit,
  onMessage,
  onDelete,
  onRenew,
  onArchive,
  onToggleStatus,
  onTogglePin,
  onPay,
  className = '',
}) => {
  // Use internal spring if external spring value is not passed
  const internalEValue = useSpring(isExpanded ? 100 : 0, 26);
  const currentE = externalEValue !== undefined ? externalEValue : internalEValue;

  const isGrid = viewMode === 'grid';
  const isPositioned = x !== undefined && y !== undefined;

  const H = 68;
  const G = 8;
  const DH = 176;
  const B = 36;

  const eNormalized = clamp(currentE / 100, 0, 1.1);
  const calculatedHeight = isGrid
    ? height ?? 172
    : (H + G) + eNormalized * (DH + G);

  const W = width ?? 1200;

  // Presence spring math from specification:
  // qv = clamp(p/100, 0, 1.05)
  // Row slab: top=H*(1-qv)/2, height=max(0,H*qv). Content opacity=clamp((p/100-0.5)/0.4,0,1).
  // pointer-events only when p/100 > 0.6.
  const qv = clamp(pValue / 100, 0, 1.05);
  const slabTop = (H * (1 - qv)) / 2;
  const slabHeight = Math.max(0, H * qv);
  const contentOpacity = clamp((pValue / 100 - 0.5) / 0.4, 0, 1);
  const isPointerInteractive = pValue / 100 > 0.6;

  // Status badge colors matching prototype:
  const getStatusClasses = () => {
    const s = member.status.toLowerCase();
    if (s.includes('bloq') || s.includes('block') || member.statusVariant === 'blocked' || member.isBlocked) {
      return {
        pill: 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
        dot: 'bg-[#B8321C] dark:bg-[#FF8D7A]',
      };
    }
    if (s.includes('expir') || member.statusVariant === 'expired') {
      return {
        pill: 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
        dot: 'bg-[#8A5A06] dark:bg-[#FFD166]',
      };
    }
    return {
      pill: 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
      dot: 'bg-[#0B7A45] dark:bg-[#4ADE80]',
    };
  };

  const statusStyle = getStatusClasses();
  const initials =
    member.avatarText ||
    member.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  // Chevron rotation: e * 180deg
  const chevronRotation = eNormalized * 180;

  return (
    <div
      role="listitem"
      data-id={member.id}
      data-sel={isSelected ? 'true' : undefined}
      data-open={isOpen ? 'true' : undefined}
      data-expanded={isExpanded ? 'true' : undefined}
      className={`row rw group relative overflow-hidden select-none ${className}`}
      style={{
        ...(isPositioned
          ? {
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${Math.max(0, W)}px`,
              height: `${Math.max(0, height ?? calculatedHeight)}px`,
            }
          : {
              position: 'relative',
              width: '100%',
              height: `${calculatedHeight}px`,
              marginBottom: `${G}px`,
            }),
        pointerEvents: isPointerInteractive ? 'auto' : 'none',
      }}
    >
      {/* 1. Main Row Island (.ri) - H=68px */}
      <div
        className="ri absolute left-0 right-0 top-0 h-[68px]"
        onClick={() => onOpenDetails?.(member.id)}
      >
        {/* Island Slab (.slab) - z-index: 0, top=H*(1-qv)/2, height=max(0,H*qv) */}
        <div
          className={`slab absolute inset-x-0 rounded-[16px] border box-border z-0 transition-[border-color,box-shadow,background-color] duration-150 ${
            isOpen
              ? 'bg-[#FBE7DF] dark:bg-[#2A201C] border-[#C9441F]'
              : isSelected
              ? 'bg-white dark:bg-[#1A1A1A] border-[#C9441F] shadow-[0_0_0_1px_#C9441F]'
              : 'bg-white dark:bg-[#1A1A1A] border-[#E4DCD5] dark:border-[#3A3734] group-hover:border-[#D5C9BE] dark:group-hover:border-[#4A4744]'
          }`}
          style={{
            top: `${slabTop}px`,
            height: `${slabHeight}px`,
          }}
        />

        {/* Row Inner Content (.in) - z-index: 2, padding-right: 196px */}
        <div
          className={`in absolute inset-0 z-[2] cursor-pointer ${
            isGrid
              ? 'p-4 grid grid-cols-[22px_1fr_auto] gap-x-3 gap-y-2.5 content-between pr-4'
              : 'grid grid-cols-[22px_40px_minmax(200px,1.5fr)_minmax(150px,1fr)_100px_150px_110px] gap-3.5 items-center px-4 pr-[196px]'
          }`}
          style={{ opacity: contentOpacity }}
        >
          {/* Column 0: Checkbox (.cb) */}
          <button
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            aria-label={`${isSelected ? 'Désélectionner' : 'Sélectionner'} ${member.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(member.id, e);
            }}
            className={`cb w-[22px] h-[22px] rounded-[7px] border-[1.5px] grid place-items-center p-0 transition-colors duration-140 cursor-pointer ${
              isSelected
                ? 'bg-[#C9441F] border-[#C9441F] text-white'
                : 'bg-white dark:bg-[#262422] border-[#B3A89E] dark:border-[#5A5550] text-transparent hover:border-[#C9441F]'
            }`}
          >
            <Check
              className={`w-3.5 h-3.5 stroke-[3] transition-opacity duration-120 ${
                isSelected ? 'opacity-100 text-white' : 'opacity-0'
              }`}
            />
          </button>

          {/* Column 1: Avatar (.av) */}
          <div
            className="av w-[40px] h-[40px] rounded-[12px] grid place-items-center text-white font-bold text-[15px] shrink-0 select-none shadow-2xs"
            style={{ backgroundColor: member.avatarColor || '#C9441F' }}
            aria-hidden="true"
          >
            {initials}
          </div>

          {/* Column 2: Who (Name + ID & Phone) */}
          <div className="who flex flex-col min-w-0 text-left">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[14.5px] text-[#1B1917] dark:text-[#F3EDE7] group-hover:text-[#C9441F] transition-colors truncate">
                {member.name}
              </span>
              {(isPinned || member.isPinned) && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1 rounded-sm shrink-0">
                  📌 VIP
                </span>
              )}
            </div>
            <span className="font-mono text-[11.5px] text-[#6B635C] dark:text-[#A89F95] truncate">
              ID: {member.id} {member.phone ? `· ${member.phone}` : ''}
            </span>
          </div>

          {/* Column 3: Plan Pill (.plan) */}
          <div className="min-w-0">
            <span
              title={member.planName}
              className="plan inline-block max-w-full px-2.5 py-0.5 rounded-[8px] text-[12px] font-medium bg-[#FBE7DF] dark:bg-[#2C1D18] text-[#C9441F] dark:text-[#FF8D7A] border border-[#F3C9BA] dark:border-[#52291F] truncate"
            >
              {member.planName}
            </span>
          </div>

          {/* Column 4: Status Pill (.st) */}
          <div>
            <span
              className={`st inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[8px] text-[12px] font-semibold whitespace-nowrap ${statusStyle.pill}`}
            >
              <i className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyle.dot}`} />
              {member.status}
            </span>
          </div>

          {/* Column 5: Expiry Date (.du) */}
          <div className="du flex flex-col min-w-0">
            <b className="font-mono text-[12.5px] font-bold text-[#1B1917] dark:text-[#F3EDE7] truncate">
              {member.expiryDate}
            </b>
            <small className="font-mono text-[11px] text-[#6B635C] dark:text-[#A89F95] truncate">
              {member.daysRemainingLabel}
            </small>
          </div>

          {/* Column 6: Balance (mono) */}
          <div
            className={`font-mono text-[12.5px] font-bold truncate ${
              member.balance === 0
                ? 'text-[#0B7A45] dark:text-[#3CE085]'
                : 'text-[#1B1917] dark:text-[#F3EDE7]'
            }`}
          >
            {member.balance === 0
              ? 'Soldé'
              : member.balanceLabel || `${member.balance.toLocaleString()} DZD`}
          </div>
        </div>

        {/* Hover Fan Actions (.act) - 3 buttons sliding out to left */}
        {!isGrid && (
          <RowFan
            memberName={member.name}
            onEdit={() => onEdit?.(member.id)}
            onMessage={() => onMessage?.(member.id)}
            onDelete={() => onDelete?.(member.id)}
          />
        )}

        {/* Drop Down Chevron Button (.rb) - 36px round, right: 14px, top: 16px, z-index: 3 */}
        {!isGrid && (
          <button
            type="button"
            data-no-liquid="true"
            className="rb absolute right-[14px] top-[16px] w-[36px] h-[36px] rounded-full bg-[#F3EDE7] dark:bg-[#2A2A2A] grid place-items-center p-0 border border-[#E6DED6] dark:border-[#3A3734] cursor-pointer z-[3] text-[#1B1917] dark:text-[#F3EDE7] shadow-2xs"
            style={{
              position: 'absolute',
              top: '16px',
              right: '14px',
              zIndex: 3,
              width: '36px',
              height: '36px',
              transform: `rotate(${chevronRotation}deg)`,
            }}
            aria-expanded={isExpanded}
            aria-label={`Aperçu rapide de ${member.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(member.id);
            }}
          >
            <ChevronDown className="w-4 h-4 text-[#1B1917] dark:text-[#F3EDE7]" />
          </button>
        )}
      </div>

      {/* 2. Expandable Drop Down Island (.dt) - Positioned at top: 80px, height: 150px, full width */}
      {!isGrid && (
        <RowDetailIsland
          eValue={currentE}
          rowWidth={isPositioned ? W : undefined}
          contactInfo={{ phone: member.phone, email: member.email }}
          planInfo={{
            planName: member.planName,
            expiry: member.expiryDate,
            daysLeft: member.daysRemainingLabel,
            remainingSessions: member.remainingSessions,
          }}
          notes={member.notes}
          isBlocked={member.isBlocked || member.statusVariant === 'blocked'}
          isPinned={isPinned || member.isPinned}
          onOpenDetails={() => onOpenDetails?.(member.id)}
          onRenew={() => onRenew?.(member.id)}
          onArchive={() => onArchive?.(member.id)}
          onToggleStatus={() => onToggleStatus?.(member.id)}
          onTogglePin={() => onTogglePin?.(member.id)}
          onPay={() => onPay?.(member.id)}
        />
      )}
    </div>
  );
};
