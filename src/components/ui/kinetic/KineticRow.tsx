import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { KineticRowFan, KineticRowFanAction } from './KineticRowFan';
import {
  KineticDetailIsland,
  KineticDetailAction,
  KineticDetailColumn,
} from './KineticDetailIsland';
import { KineticRowDomRefs } from './useKineticCollectionLayout';

export type KineticStatusVariant =
  | 'active'
  | 'blocked'
  | 'expired'
  | 'warning'
  | 'info'
  | 'neutral';

export interface KineticRowData {
  id: string;
  title: string;
  subline?: string;
  avatarText?: string;
  avatarColor?: string;
  vipBadge?: string;
  categoryLabel: string;
  statusLabel: string;
  statusVariant?: KineticStatusVariant;
  metricPrimary: string;
  metricSecondary?: string;
  branchName: string;
  branchCode?: string;
  isPinned?: boolean;
  notes?: string;
  detailCol1?: KineticDetailColumn;
  detailCol2?: KineticDetailColumn;
  detailCol3?: KineticDetailColumn;
  overflowFields?: Array<{ label: string; value: React.ReactNode }>;
  // Optional rich node overrides (used by bridged legacy columns)
  identityNode?: React.ReactNode;
  categoryNode?: React.ReactNode;
  statusNode?: React.ReactNode;
  metricNode?: React.ReactNode;
  branchNode?: React.ReactNode;
}

export type KineticRowMeta = Partial<KineticRowData>;

export interface KineticRowProps {
  row: KineticRowData;
  viewMode?: 'list' | 'grid';
  isSelected?: boolean;
  isOpen?: boolean;
  isExpanded?: boolean;
  isPinned?: boolean;
  registerRowRefs?: (id: string, refs: KineticRowDomRefs | null) => void;
  onSelect?: (id: string, e: React.MouseEvent) => void;
  onToggleExpand?: (id: string) => void;
  onOpenDetails?: (id: string, originEl?: HTMLElement | null) => void;
  onEdit?: (id: string, originEl?: HTMLElement | null) => void;
  onSecondaryAction?: (id: string, originEl?: HTMLElement | null) => void;
  secondaryIcon?: React.ReactNode;
  secondaryLabel?: string;
  onDelete?: (id: string) => void;
  fanActions?: KineticRowFanAction[];
  detailActions?: KineticDetailAction[];
  detailChildren?: React.ReactNode;
  className?: string;
}

export const KINETIC_STATUS_PILLS: Record<KineticStatusVariant, string> = {
  blocked:
    'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
  expired:
    'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
  warning:
    'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
  active:
    'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
  info:
    'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#164E63]',
  neutral:
    'bg-[#F3EDE7] dark:bg-[#262422] text-black/80 dark:text-white/85 border border-[#E6DED6] dark:border-[#3A3734]',
};

const AVATAR_PALETTE = ['#D946EF', '#2563EB', '#d4522f', '#10B981', '#06B6D4', '#8B5CF6'];

export function computeInitialsColor(text?: string): string {
  if (!text) return '#d4522f';
  const ch = text.trim()[0]?.toLowerCase() || '';
  if (ch === 'a' || ch === 'm') return '#D946EF';
  if (ch === 's' || ch === 'c' || ch === 'b') return '#2563EB';
  if (ch === 'y' || ch === 'f' || ch === 'l') return '#d4522f';
  if (ch === 'n' || ch === 'k' || ch === 'h') return '#10B981';
  if (ch === 'r' || ch === 't' || ch === 'd') return '#06B6D4';
  const code = ch.charCodeAt(0) || 0;
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

export function extractInitials(text?: string): string {
  if (!text) return 'AT';
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AT';
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function inferStatusVariant(statusText: string): KineticStatusVariant {
  const s = (statusText || '').toLowerCase();
  if (
    s.includes('bloq') ||
    s.includes('block') ||
    s.includes('suspend') ||
    s.includes('cancel') ||
    s.includes('annul') ||
    s.includes('rejet') ||
    s.includes('declin') ||
    s.includes('danger') ||
    s.includes('rupture') ||
    s.includes('ban') ||
    s.includes('overdue') ||
    s.includes('retard') ||
    s.includes('محظور') ||
    s.includes('ملغ')
  ) {
    return 'blocked';
  }
  if (
    s.includes('expir') ||
    s.includes('pend') ||
    s.includes('att') ||
    s.includes('maint') ||
    s.includes('hold') ||
    s.includes('draft') ||
    s.includes('brouillon') ||
    s.includes('immin') ||
    s.includes('partial') ||
    s.includes('partiel') ||
    s.includes('قيد') ||
    s.includes('معلق')
  ) {
    return 'warning';
  }
  if (
    s.includes('actif') ||
    s.includes('activ') ||
    s.includes('paid') ||
    s.includes('pay') ||
    s.includes('complet') ||
    s.includes('approv') ||
    s.includes('confirm') ||
    s.includes('liv') ||
    s.includes('deliv') ||
    s.includes('ok') ||
    s.includes('open') ||
    s.includes('ouvert') ||
    s.includes('نشط') ||
    s.includes('مكتمل') ||
    s.includes('مدفوع')
  ) {
    return 'active';
  }
  if (s.includes('cours') || s.includes('progress') || s.includes('schedul') || s.includes('plan')) {
    return 'info';
  }
  return 'neutral';
}

const KineticRowInner: React.FC<KineticRowProps> = ({
  row,
  viewMode = 'list',
  isSelected = false,
  isOpen = false,
  isExpanded = false,
  isPinned = false,
  registerRowRefs,
  onSelect,
  onToggleExpand,
  onOpenDetails,
  onEdit,
  onSecondaryAction,
  secondaryIcon,
  secondaryLabel,
  onDelete,
  fanActions,
  detailActions = [],
  detailChildren,
  className = '',
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const slabRef = useRef<HTMLDivElement | null>(null);
  const innRef = useRef<HTMLDivElement | null>(null);
  const detRef = useRef<HTMLDivElement | null>(null);
  const dcRef = useRef<HTMLDivElement | null>(null);
  const rbRef = useRef<HTMLButtonElement | null>(null);

  const rowIdStr = String(row.id);
  const [detailMounted, setDetailMounted] = useState(Boolean(isExpanded));
  const shouldRenderDetail = isExpanded || detailMounted;

  useEffect(() => {
    if (isExpanded) {
      if (!detailMounted) setDetailMounted(true);
      return;
    }
    if (!detailMounted) return;
    const timer = setTimeout(() => {
      setDetailMounted(false);
    }, 420);
    return () => clearTimeout(timer);
  }, [isExpanded, detailMounted]);

  useLayoutEffect(() => {
    if (!registerRowRefs) return;
    registerRowRefs(rowIdStr, {
      rowEl: rowRef.current,
      slabEl: slabRef.current,
      innEl: innRef.current,
      detEl: detRef.current,
      dcEl: dcRef.current,
      rbEl: rbRef.current,
      dcButtons: [],
    });
    return () => {
      registerRowRefs(rowIdStr, null);
    };
  }, [rowIdStr, registerRowRefs]);

  const variant = row.statusVariant || inferStatusVariant(row.statusLabel);
  const statusPillClass = KINETIC_STATUS_PILLS[variant] || KINETIC_STATUS_PILLS.neutral;
  const initials = row.avatarText || extractInitials(row.title);
  const avatarBg = row.avatarColor || computeInitialsColor(row.title);

  return (
    <div
      ref={rowRef}
      role="listitem"
      data-id={rowIdStr}
      data-sel={isSelected ? 'true' : undefined}
      data-open={isOpen ? 'true' : undefined}
      data-expanded={isExpanded ? 'true' : undefined}
      className={`row select-none ${className}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onOpenDetails?.(rowIdStr, rowRef.current);
      }}
    >
      {/* 1. Island Slab (.slab) */}
      <div
        ref={slabRef}
        data-sq={viewMode === 'grid' ? 'card' : 'row'}
        data-sq-border="solid"
        data-sq-stroke-w={isSelected && !isOpen ? '1.5' : undefined}
        className={`slab ${
          isOpen
            ? '!bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:!bg-[#2A1D18] [--sq-stroke:var(--atr-acc,#d4522f)]'
            : isSelected
            ? 'bg-white dark:bg-[#1C1B1A] [--sq-stroke:var(--atr-acc,#d4522f)]'
            : 'bg-white dark:bg-[#1C1B1A] [--sq-stroke:var(--sq-stroke-row)]'
        }`}
      />

      {/* 2. Expanding 4-Column Detail Island (.det + .dc) */}
      <KineticDetailIsland
        detRef={detRef}
        dcRef={dcRef}
        renderContent={shouldRenderDetail}
        column1={row.detailCol1}
        column2={row.detailCol2}
        column3={row.detailCol3}
        overflowFields={row.overflowFields}
        notes={row.notes}
        actions={detailActions}
      >
        {detailChildren}
      </KineticDetailIsland>

      {/* 3. Row Content Layer (.in) - switches smoothly between List & Grid CSS grid */}
      <div ref={innRef} className="in cursor-pointer">
        {/* Track 1: Checkbox (.c-cb) */}
        <button
          type="button"
          role="checkbox"
          data-no-liquid="true"
          data-sq="check"
          data-sq-border="solid"
          data-sq-stroke-w="1.5"
          aria-checked={isSelected}
          aria-label={`${isSelected ? 'Désélectionner' : 'Sélectionner'} ${row.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(rowIdStr, e);
          }}
          className={`cb c-cb relative w-[var(--check,20px)] h-[var(--check,20px)] grid place-items-center p-0 cursor-pointer ${
            isSelected
              ? 'bg-[var(--atr-acc,#d4522f)] [--sq-stroke:var(--atr-acc,#d4522f)] text-white'
              : 'bg-white dark:bg-[#262422] [--sq-stroke:rgba(23,19,15,0.16)] dark:[--sq-stroke:rgba(255,255,255,0.20)] hover:[--sq-stroke:var(--atr-acc,#d4522f)] text-transparent'
          }`}
        >
          <Check
            className={`w-3.5 h-3.5 stroke-[2.5] transition-opacity duration-120 ${
              isSelected ? 'opacity-100 text-white' : 'opacity-0'
            }`}
          />
        </button>

        {/* Track 2: Avatar + Primary Identity + Subline (.who.c-who) */}
        {row.identityNode ? (
          <div className="who c-who min-w-0 flex items-center">{row.identityNode}</div>
        ) : (
          <span className="who c-who flex items-center gap-[var(--av-to-text,12px)] min-w-0 text-left rtl:text-right">
            <span
              className="av w-[var(--av-table,40px)] h-[var(--av-table,40px)] rounded-full grid place-items-center text-white t-label font-semibold shrink-0 select-none"
              style={{ backgroundColor: avatarBg }}
              aria-hidden="true"
            >
              {initials}
            </span>
            <span className="flex flex-col gap-[var(--name-sub-gap,2px)] min-w-0">
              <span className="flex items-center gap-[var(--s2,8px)] min-w-0">
                <button
                  type="button"
                  data-no-liquid="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetails?.(rowIdStr, e.currentTarget);
                  }}
                  className="nm border-0 bg-transparent p-0 text-left rtl:text-right t-label font-semibold text-[var(--text-1)] dark:text-white hover:text-[var(--brand-text)] dark:hover:text-[var(--brand-on-dark)] truncate cursor-pointer"
                >
                  {row.title}
                </button>
                {(isPinned || row.isPinned || row.vipBadge) && (
                  <span className="inline-flex items-center h-[var(--badge-h,22px)] t-small text-amber-800 dark:text-amber-300 bg-amber-500/15 px-[var(--badge-px,6px)] rounded-full shrink-0">
                    {row.vipBadge || 'VIP'}
                  </span>
                )}
              </span>
              {row.subline && (
                <small className="t-cap tabular-nums text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate">
                  {row.subline}
                </small>
              )}
            </span>
          </span>
        )}

        {/* Track 3: Domain Category Pill (.c-fm) */}
        <span className="c-fm min-w-0">
          {row.categoryNode ? (
            <span className="inline-flex items-center max-w-full truncate">
              {row.categoryNode}
            </span>
          ) : (
            <span
              title={row.categoryLabel}
              className="pill inline-flex items-center h-[var(--pill-h,24px)] max-w-full px-[var(--pill-px,10px)] rounded-full t-small bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[var(--brand-on-dark)] border border-[#d4522f]/25 dark:border-[#52291F] truncate"
            >
              {row.categoryLabel}
            </span>
          )}
        </span>

        {/* Track 4: Status Pill (.c-st) */}
        <span className="c-st">
          {row.statusNode ? (
            row.statusNode
          ) : (
            <span
              className={`pill inline-flex items-center gap-[var(--pill-gap,6px)] h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small whitespace-nowrap ${statusPillClass}`}
            >
              <i className="w-[var(--pill-dot,6px)] h-[var(--pill-dot,6px)] rounded-full bg-current shrink-0" />
              {row.statusLabel}
            </span>
          )}
        </span>

        {/* Track 5: Metric / Date Pair (.dt.c-dt) */}
        {row.metricNode ? (
          <div className="dt c-dt min-w-0">{row.metricNode}</div>
        ) : (
          <span className="dt c-dt flex flex-col gap-[var(--name-sub-gap,2px)] min-w-0">
            <b className="t-label font-semibold tabular-nums text-[var(--text-1)] dark:text-white truncate">
              {row.metricPrimary}
            </b>
            {row.metricSecondary && (
              <small className="t-cap tabular-nums text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate">
                {row.metricSecondary}
              </small>
            )}
          </span>
        )}

        {/* Track 6: Mandatory Branch Column (.br.c-sd) */}
        {row.branchNode ? (
          <div className="br c-sd min-w-0">{row.branchNode}</div>
        ) : (
          <span
            title={row.branchName || '—'}
            className="br c-sd inline-flex items-center gap-[var(--s2,8px)] min-w-0 max-w-full t-label text-[var(--text-1)] dark:text-white truncate"
          >
            <span className="inline-block w-[var(--pill-dot,6px)] h-[var(--pill-dot,6px)] rounded-full bg-[var(--brand-fill)] shrink-0" />
            <span className="truncate">{row.branchName || '—'}</span>
          </span>
        )}
      </div>

      {/* 4. Hover Fan Actions (.act) */}
      <KineticRowFan
        recordTitle={row.title}
        actions={fanActions}
        onEdit={onEdit ? (e) => onEdit(rowIdStr, e.currentTarget) : undefined}
        onSecondaryAction={
          onSecondaryAction ? (e) => onSecondaryAction(rowIdStr, e.currentTarget) : undefined
        }
        secondaryIcon={secondaryIcon}
        secondaryLabel={secondaryLabel}
        onDelete={onDelete ? () => onDelete(rowIdStr) : undefined}
      />

      {/* 5. Expand Detail Island Button (.rb) */}
      <button
        ref={rbRef}
        type="button"
        data-no-liquid="true"
        className="rb border-0 bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#2B2927] text-[var(--atr-ink,#000000)] dark:text-white cursor-pointer"
        aria-expanded={isExpanded}
        aria-label={`Aperçu rapide de ${row.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand?.(rowIdStr);
        }}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
};

export const KineticRow = React.memo(KineticRowInner);
