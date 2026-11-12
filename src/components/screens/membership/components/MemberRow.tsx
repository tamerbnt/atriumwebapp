import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { RowFan } from './RowFan';
import { RowDetailIsland } from './RowDetailIsland';
import { RowDomRefs } from '../motion/useKineticRowLayout';

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
  registerRowRefs?: (id: string, refs: RowDomRefs | null) => void;
  onSelect?: (id: string | number, e: React.MouseEvent) => void;
  onToggleExpand?: (id: string | number) => void;
  onOpenDetails?: (id: string | number, originEl?: HTMLElement | null) => void;
  onEdit?: (id: string | number, originEl?: HTMLElement | null) => void;
  onMessage?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onRenew?: (id: string | number) => void;
  onArchive?: (id: string | number) => void;
  onToggleStatus?: (id: string | number) => void;
  onTogglePin?: (id: string | number) => void;
  onPay?: (id: string | number) => void;
  className?: string;
}

const MemberRowInner: React.FC<MemberRowProps> = ({
  member,
  isSelected = false,
  isOpen = false,
  isExpanded = false,
  isPinned = false,
  registerRowRefs,
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
  const rowRef = useRef<HTMLDivElement | null>(null);
  const slabRef = useRef<HTMLDivElement | null>(null);
  const innRef = useRef<HTMLDivElement | null>(null);
  const detRef = useRef<HTMLDivElement | null>(null);
  const dcRef = useRef<HTMLDivElement | null>(null);
  const rbRef = useRef<HTMLButtonElement | null>(null);

  const memberIdStr = String(member.id);
  const [detailMounted, setDetailMounted] = useState(Boolean(isExpanded));
  const shouldRenderDetail = isExpanded || detailMounted;

  useEffect(() => {
    if (isExpanded) {
      setDetailMounted(true);
      return;
    }
    if (!detailMounted) return;
    const timer = setTimeout(() => {
      setDetailMounted(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [isExpanded, detailMounted]);

  useLayoutEffect(() => {
    if (!registerRowRefs) return;
    const dcButtons = dcRef.current
      ? (Array.from(dcRef.current.querySelectorAll('button')) as HTMLButtonElement[])
      : [];
    registerRowRefs(memberIdStr, {
      rowEl: rowRef.current,
      slabEl: slabRef.current,
      innEl: innRef.current,
      detEl: detRef.current,
      dcEl: dcRef.current,
      rbEl: rbRef.current,
      dcButtons,
    });
    return () => {
      registerRowRefs(memberIdStr, null);
    };
  }, [memberIdStr, registerRowRefs, shouldRenderDetail]);

  const getStatusClasses = () => {
    const s = member.status.toLowerCase();
    if (s.includes('bloq') || s.includes('block') || member.statusVariant === 'blocked' || member.isBlocked) {
      return {
        pill: 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
      };
    }
    if (s.includes('expir') || member.statusVariant === 'expired') {
      return {
        pill: 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
      };
    }
    return {
      pill: 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
    };
  };

  const statusStyle = getStatusClasses();
  const initials =
    member.avatarText ||
    member.name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div
      ref={rowRef}
      role="listitem"
      data-id={member.id}
      data-sel={isSelected ? 'true' : undefined}
      data-open={isOpen ? 'true' : undefined}
      data-expanded={isExpanded ? 'true' : undefined}
      className={`row select-none ${className}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onOpenDetails?.(member.id, rowRef.current);
      }}
    >
      {/* 1. Island Slab (.slab) - z-index: 0, height & top driven by presence spring */}
      <div
        ref={slabRef}
        className={`slab ${
          isOpen
            ? '!bg-[var(--atr-hl,#FBE7DF)] dark:!bg-[#2A1D18] !border-[var(--atr-acc,#C9441F)]'
            : isSelected
            ? 'bg-white dark:bg-[#1C1B1A] !border-[var(--atr-acc,#C9441F)] shadow-[0_0_0_1px_var(--atr-acc,#C9441F)]'
            : 'bg-white dark:bg-[#1C1B1A] border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]'
        }`}
      />

      {/* 2. Detail Island Backdrop (.det) & Content (.dc) - hidden in grid view by CSS */}
      <RowDetailIsland
        detRef={detRef}
        dcRef={dcRef}
        renderContent={shouldRenderDetail}
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
        onOpenDetails={() => onOpenDetails?.(member.id, rowRef.current)}
        onRenew={() => onRenew?.(member.id)}
        onArchive={() => onArchive?.(member.id)}
        onToggleStatus={() => onToggleStatus?.(member.id)}
        onTogglePin={() => onTogglePin?.(member.id)}
        onPay={() => onPay?.(member.id)}
      />

      {/* 3. Row Inner Content (.in) - adapts seamlessly between list & grid via CSS [data-v] */}
      <div ref={innRef} className="in cursor-pointer">
        {/* Checkbox (.c-cb) */}
        <button
          type="button"
          role="checkbox"
          data-no-liquid="true"
          aria-checked={isSelected}
          aria-label={`${isSelected ? 'Désélectionner' : 'Sélectionner'} ${member.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(member.id, e);
          }}
          className={`cb c-cb w-[22px] h-[22px] rounded-[7px] border-[1.5px] grid place-items-center p-0 cursor-pointer ${
            isSelected
              ? 'bg-[var(--atr-acc,#C9441F)] border-[var(--atr-acc,#C9441F)] text-white'
              : 'bg-white dark:bg-[#262422] border-[#B3A89E] dark:border-[#5A5550] text-transparent hover:border-[var(--atr-acc,#C9441F)]'
          }`}
        >
          <Check
            className={`w-3.5 h-3.5 stroke-[3] transition-opacity duration-120 ${
              isSelected ? 'opacity-100 text-white' : 'opacity-0'
            }`}
          />
        </button>

        {/* Avatar + Identity (.who.c-who) */}
        <span className="who c-who flex items-center gap-3 min-w-0 text-left rtl:text-right">
          <span
            className="av w-[38px] h-[38px] rounded-full grid place-items-center text-white font-semibold text-[14px] shrink-0 select-none"
            style={{ backgroundColor: member.avatarColor || '#C9441F' }}
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="flex flex-col min-w-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                data-no-liquid="true"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails?.(member.id, e.currentTarget);
                }}
                className="nm border-0 bg-transparent p-0 text-left rtl:text-right font-semibold text-[14px] text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] hover:text-[var(--atr-acc,#C9441F)] truncate cursor-pointer"
              >
                {member.name}
              </button>
              {(isPinned || member.isPinned) && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1 rounded-sm shrink-0">
                  VIP
                </span>
              )}
            </span>
            <small className="font-mono text-[11px] text-[var(--atr-mut,#6B635C)] truncate">
              ID: {member.id}
              {member.phone ? ` · ${member.phone}` : ''}
            </small>
          </span>
        </span>

        {/* Plan Pill (.c-fm) */}
        <span className="c-fm min-w-0">
          <span
            title={member.planName}
            className="pill inline-flex items-center max-w-full px-2.5 py-[3px] rounded-full text-[12px] font-medium bg-[var(--atr-hl,#FBE7DF)] dark:bg-[#2C1D18] text-[var(--atr-acc,#C9441F)] dark:text-[#FF8D7A] border border-[#F3C9BA] dark:border-[#52291F] truncate"
          >
            {member.planName}
          </span>
        </span>

        {/* Status Pill (.c-st) */}
        <span className="c-st">
          <span
            className={`pill inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[12px] font-medium whitespace-nowrap ${statusStyle.pill}`}
          >
            <i className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
            {member.status}
          </span>
        </span>

        {/* Expiry Date (.dt.c-dt) */}
        <span className="dt c-dt flex flex-col min-w-0">
          <b className="font-mono text-[12px] font-bold text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] truncate">
            {member.expiryDate}
          </b>
          <small className="font-mono text-[11px] text-[var(--atr-mut,#6B635C)] truncate">
            {member.daysRemainingLabel}
          </small>
        </span>

        {/* Balance (.sd.c-sd) */}
        <span
          className={`sd c-sd font-mono text-[12px] font-bold truncate ${
            member.balance === 0
              ? 'z text-[var(--atr-ok,#0B7A45)] dark:text-[#5BE3A3]'
              : 'text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6]'
          }`}
        >
          {member.balance === 0
            ? 'Soldé'
            : member.balanceLabel || `${member.balance.toLocaleString()} DZD`}
        </span>
      </div>

      {/* 4. Hover Fan Actions (.act) - right:15px top:15px, hidden in grid via CSS */}
      <RowFan
        memberName={member.name}
        onEdit={(e) => onEdit?.(member.id, e.currentTarget)}
        onMessage={() => onMessage?.(member.id)}
        onDelete={() => onDelete?.(member.id)}
      />

      {/* 5. Expand Chevron Button (.rb) - 38x38 at right:12px top:12px, z-index 3, hidden in grid via CSS */}
      <button
        ref={rbRef}
        type="button"
        data-no-liquid="true"
        className="rb border-0 bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#2B2927] text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] cursor-pointer"
        aria-expanded={isExpanded}
        aria-label={`Aperçu rapide de ${member.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand?.(member.id);
        }}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
};

export const MemberRow = React.memo(MemberRowInner);
