import React, { useLayoutEffect, useRef, useState, useEffect, useCallback, useMemo } from 'react';
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

const STATUS_PILLS = {
  blocked: 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
  expired: 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
  active: 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
} as const;

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
      if (detailMounted) return;
      const timer = setTimeout(() => {
        setDetailMounted(true);
      }, 280);
      return () => clearTimeout(timer);
    }
    if (!detailMounted) return;
    const timer = setTimeout(() => {
      setDetailMounted(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [isExpanded, detailMounted]);

  useLayoutEffect(() => {
    if (!registerRowRefs) return;
    registerRowRefs(memberIdStr, {
      rowEl: rowRef.current,
      slabEl: slabRef.current,
      innEl: innRef.current,
      detEl: detRef.current,
      dcEl: dcRef.current,
      rbEl: rbRef.current,
      dcButtons: [],
    });
    return () => {
      registerRowRefs(memberIdStr, null);
    };
  }, [memberIdStr, registerRowRefs]);

  const statusPillClass = useMemo(() => {
    if (member.statusVariant) return STATUS_PILLS[member.statusVariant];
    if (member.isBlocked) return STATUS_PILLS.blocked;
    const s = member.status.toLowerCase();
    if (s.includes('bloq') || s.includes('block')) return STATUS_PILLS.blocked;
    if (s.includes('expir')) return STATUS_PILLS.expired;
    return STATUS_PILLS.active;
  }, [member.statusVariant, member.isBlocked, member.status]);

  const initials = useMemo(() => {
    if (member.avatarText) return member.avatarText;
    return member.name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [member.avatarText, member.name]);

  const contactInfo = useMemo(
    () => ({ phone: member.phone, email: member.email }),
    [member.phone, member.email]
  );

  const planInfo = useMemo(
    () => ({
      planName: member.planName,
      expiry: member.expiryDate,
      daysLeft: member.daysRemainingLabel,
      remainingSessions: member.remainingSessions,
    }),
    [member.planName, member.expiryDate, member.daysRemainingLabel, member.remainingSessions]
  );

  const handleOpenFromRow = useCallback(() => onOpenDetails?.(member.id, rowRef.current), [onOpenDetails, member.id]);
  const handleRenewRow = useCallback(() => onRenew?.(member.id), [onRenew, member.id]);
  const handleArchiveRow = useCallback(() => onArchive?.(member.id), [onArchive, member.id]);
  const handleToggleStatusRow = useCallback(() => onToggleStatus?.(member.id), [onToggleStatus, member.id]);
  const handleTogglePinRow = useCallback(() => onTogglePin?.(member.id), [onTogglePin, member.id]);
  const handlePayRow = useCallback(() => onPay?.(member.id), [onPay, member.id]);

  const handleEditFan = useCallback((e: React.MouseEvent<HTMLButtonElement>) => onEdit?.(member.id, e.currentTarget), [onEdit, member.id]);
  const handleMessageFan = useCallback(() => onMessage?.(member.id), [onMessage, member.id]);
  const handleDeleteFan = useCallback(() => onDelete?.(member.id), [onDelete, member.id]);

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
            ? '!bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:!bg-[#2A1D18] !border-[var(--atr-acc,#d4522f)]'
            : isSelected
            ? 'bg-white dark:bg-[#1C1B1A] !border-[var(--atr-acc,#d4522f)] shadow-[0_0_0_1px_var(--atr-acc,#d4522f)]'
            : 'bg-white dark:bg-[#1C1B1A] border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]'
        }`}
      />

      {/* 2. Detail Island Backdrop (.det) & Content (.dc) - hidden in grid view by CSS */}
      <RowDetailIsland
        detRef={detRef}
        dcRef={dcRef}
        renderContent={shouldRenderDetail}
        contactInfo={contactInfo}
        planInfo={planInfo}
        notes={member.notes}
        isBlocked={member.isBlocked || member.statusVariant === 'blocked'}
        isPinned={isPinned || member.isPinned}
        onOpenDetails={handleOpenFromRow}
        onRenew={handleRenewRow}
        onArchive={handleArchiveRow}
        onToggleStatus={handleToggleStatusRow}
        onTogglePin={handleTogglePinRow}
        onPay={handlePayRow}
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
              ? 'bg-[var(--atr-acc,#d4522f)] border-[var(--atr-acc,#d4522f)] text-white'
              : 'bg-white dark:bg-[#262422] border-[#D4C8BC] dark:border-[#5A5550] text-transparent hover:border-[var(--atr-acc,#d4522f)]'
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
            style={{ backgroundColor: member.avatarColor || '#d4522f' }}
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
                className="nm border-0 bg-transparent p-0 text-left rtl:text-right font-semibold text-[14px] text-[var(--atr-ink,#000000)] dark:text-white hover:text-[var(--atr-acc,#d4522f)] truncate cursor-pointer"
              >
                {member.name}
              </button>
              {(isPinned || member.isPinned) && (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/12 px-1.5 py-0.2 rounded-md shrink-0">
                  VIP
                </span>
              )}
            </span>
            <small className="font-mono text-[11px] tabular-nums text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68 truncate">
              ID: {member.id}
              {member.phone ? ` · ${member.phone}` : ''}
            </small>
          </span>
        </span>

        {/* Plan Pill (.c-fm) */}
        <span className="c-fm min-w-0">
          <span
            title={member.planName}
            className="pill inline-flex items-center max-w-full px-2.5 py-[3px] rounded-md text-[12px] font-medium bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] border border-[#d4522f]/25 dark:border-[#52291F] truncate"
          >
            {member.planName}
          </span>
        </span>

        {/* Status Pill (.c-st) */}
        <span className="c-st">
          <span
            className={`pill inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-md text-[12px] font-medium whitespace-nowrap ${statusPillClass}`}
          >
            <i className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
            {member.status}
          </span>
        </span>

        {/* Expiry Date (.dt.c-dt) */}
        <span className="dt c-dt flex flex-col min-w-0">
          <b className="font-mono text-[12px] font-bold tabular-nums text-[var(--atr-ink,#000000)] dark:text-white truncate">
            {member.expiryDate}
          </b>
          <small className="font-mono text-[11px] tabular-nums text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68 truncate">
            {member.daysRemainingLabel}
          </small>
        </span>

        {/* Balance (.sd.c-sd) */}
        <span
          className={`sd c-sd font-mono text-[12px] font-bold tabular-nums truncate ${
            member.balance === 0
              ? 'z text-[var(--atr-ok,#096b40)] dark:text-[#5BE3A3]'
              : 'text-[var(--atr-ink,#000000)] dark:text-white'
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
        onEdit={handleEditFan}
        onMessage={handleMessageFan}
        onDelete={handleDeleteFan}
      />

      {/* 5. Expand Chevron Button (.rb) - 38x38 at right:12px top:12px, z-index 3, hidden in grid via CSS */}
      <button
        ref={rbRef}
        type="button"
        data-no-liquid="true"
        className="rb border-0 bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#2B2927] text-[var(--atr-ink,#000000)] dark:text-white cursor-pointer"
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
