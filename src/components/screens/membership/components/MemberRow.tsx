import React from 'react';
import { Check, ChevronDown, Minus } from 'lucide-react';
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
}

export interface MemberRowProps {
  member: MemberRowData;
  isSelected?: boolean;
  isOpen?: boolean; // Panel is open for this member
  isExpanded?: boolean; // Island dropdown is expanded
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
  className?: string;
}

export const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isSelected = false,
  isOpen = false,
  isExpanded = false,
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
  className = '',
}) => {
  // Use internal spring if external spring value is not passed
  const internalEValue = useSpring(isExpanded ? 100 : 0, 26);
  const currentE = externalEValue !== undefined ? externalEValue : internalEValue;

  const RH = height ?? (viewMode === 'grid' ? 172 : 62);
  const W = width ?? 1200;

  // Presence spring math from prototype:
  const p = pValue / 100;
  const qv = clamp(p, 0, 1.05);
  const slabTop = (RH * (1 - qv)) / 2;
  const slabHeight = Math.max(0, RH * qv);
  const contentOpacity = clamp((p - 0.5) / 0.4, 0, 1);

  // Status badge colors matching prototype:
  const getStatusClasses = () => {
    const s = member.status.toLowerCase();
    if (s.includes('bloq') || s.includes('block') || member.statusVariant === 'blocked') {
      return {
        pill: 'bg-[#FDE4DF] text-[#B8321C] border border-[#F5BDB3]',
        dot: 'bg-[#B8321C]',
      };
    }
    if (s.includes('expir') || member.statusVariant === 'expired') {
      return {
        pill: 'bg-[#FCEFD2] text-[#8A5A06] border border-[#F0D79B]',
        dot: 'bg-[#8A5A06]',
      };
    }
    return {
      pill: 'bg-[#DDF5E8] text-[#0B7A45] border border-[#B5E8CE]',
      dot: 'bg-[#0B7A45]',
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

  const isGrid = viewMode === 'grid';
  const isPositioned = x !== undefined && y !== undefined;

  // Chevron rotation: 0..180deg with spring e
  const chevronRotation = (currentE / 100) * 180;

  return (
    <div
      role="listitem"
      data-id={member.id}
      data-sel={isSelected ? 'true' : undefined}
      data-open={isOpen ? 'true' : undefined}
      className={`row group relative transition-colors select-none ${className}`}
      style={{
        ...(isPositioned
          ? {
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${Math.max(0, W)}px`,
              height: `${Math.max(0, RH)}px`,
            }
          : {
              position: 'relative',
              width: '100%',
              minHeight: `${RH}px`,
              marginBottom: currentE > 0.01 && !isGrid ? `${150 + 8}px` : '8px',
            }),
        pointerEvents: p > 0.6 ? 'auto' : 'none',
      }}
    >
      {/* 1. Island Slab (.slab) */}
      <div
        className={`slab absolute left-0 right-0 rounded-[16px] border box-border z-0 transition-[border-color,box-shadow,background-color] duration-150 ${
          isOpen
            ? 'bg-[#FBE7DF] border-[#C9441F]'
            : isSelected
            ? 'bg-white border-[#C9441F] shadow-[0_0_0_1px_#C9441F]'
            : 'bg-white border-[#E6DED6] group-hover:border-[#D5C9BE]'
        }`}
        style={{
          top: `${slabTop}px`,
          height: `${slabHeight}px`,
        }}
      />

      {/* 2. Expandable Dropdown Island (only in list view) */}
      {!isGrid && (
        <RowDetailIsland
          eValue={currentE}
          rowWidth={isPositioned ? W : undefined}
          rowHeight={62}
          detailHeight={150}
          buttonSize={38}
          gap={8}
          contactInfo={{ phone: member.phone, email: member.email }}
          planInfo={{
            planName: member.planName,
            expiry: member.expiryDate,
            daysLeft: member.daysRemainingLabel,
            remainingSessions: member.remainingSessions,
          }}
          notes={member.notes}
          onOpenDetails={() => onOpenDetails?.(member.id)}
          onRenew={() => onRenew?.(member.id)}
          onArchive={() => onArchive?.(member.id)}
        />
      )}

      {/* 3. Row Inner Content (.in) */}
      <div
        className={`in absolute inset-0 z-[2] ${
          isGrid
            ? 'p-4 grid grid-cols-[22px_1fr_auto] gap-x-3 gap-y-2.5 content-between'
            : 'px-3.5 pr-[176px] grid grid-cols-[22px_minmax(220px,1fr)_190px_120px_130px_110px] gap-4 items-center'
        }`}
        style={{ opacity: contentOpacity }}
      >
        {/* Checkbox (.cb) */}
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
              : 'bg-white border-[#B3A89E] text-transparent hover:border-[#C9441F]'
          }`}
        >
          <Check className={`w-3.5 h-3.5 transition-opacity duration-120 ${isSelected ? 'opacity-100 text-white' : 'opacity-0'}`} />
        </button>

        {/* Member Info (Avatar + Name + Subtitle) */}
        <div className={`flex items-center gap-3 min-w-0 ${isGrid ? 'col-span-1' : ''}`}>
          <div
            className="w-[38px] h-[38px] rounded-full grid place-items-center text-white font-semibold text-[13px] shrink-0"
            style={{ backgroundColor: member.avatarColor || '#C9441F' }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails?.(member.id);
              }}
              className="text-left font-semibold text-[14px] text-[#1B1917] hover:text-[#C9441F] transition-colors truncate p-0 bg-transparent border-0 cursor-pointer"
            >
              {member.name}
            </button>
            <span className="font-mono text-[11px] text-[#6B635C] truncate">
              ID: {member.id} {member.phone ? `· ${member.phone}` : ''}
            </span>
          </div>
        </div>

        {/* Plan Pill */}
        <div className={`${isGrid ? 'col-span-3' : 'min-w-0'}`}>
          <span
            title={member.planName}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-[#FBE7DF] text-[#C9441F] border border-[#F3C9BA] max-w-full truncate"
          >
            {member.planName}
          </span>
        </div>

        {/* Status Pill */}
        <div className={`${isGrid ? 'justify-self-end' : ''}`}>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap ${statusStyle.pill}`}
          >
            <i className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyle.dot}`} />
            {member.status}
          </span>
        </div>

        {/* Expiry Date */}
        <div className="flex flex-col min-w-0">
          <b className="font-mono text-[12px] font-bold text-[#1B1917] truncate">
            {member.expiryDate}
          </b>
          <span className="font-mono text-[11px] text-[#6B635C] truncate">
            {member.daysRemainingLabel}
          </span>
        </div>

        {/* Balance */}
        <div className={`font-mono text-[12px] font-bold ${member.balance === 0 ? 'text-[#0B7A45]' : 'text-[#1B1917]'}`}>
          {member.balance === 0 ? 'Soldé' : member.balanceLabel || `${member.balance.toLocaleString()} DZD`}
        </div>
      </div>

      {/* 4. Hover Fan Actions & Chevron Button (List view only) */}
      {!isGrid && (
        <>
          <RowFan
            memberName={member.name}
            onEdit={() => onEdit?.(member.id)}
            onMessage={() => onMessage?.(member.id)}
            onDelete={() => onDelete?.(member.id)}
          />

          {/* Chevron Dropdown Island Button (.rb) */}
          <button
            type="button"
            className="rb absolute right-3 top-3 w-[38px] h-[38px] rounded-full bg-[#F3EDE7] grid place-items-center p-0 border-0 cursor-pointer z-[3] text-[#1B1917] hover:scale-[1.12] transition-transform duration-160"
            style={{
              transform: `rotate(${chevronRotation}deg)`,
            }}
            aria-expanded={currentE > 0.1}
            aria-label={`Aperçu rapide de ${member.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(member.id);
            }}
          >
            <ChevronDown className="w-4 h-4 text-[#1B1917]" />
          </button>
        </>
      )}
    </div>
  );
};
