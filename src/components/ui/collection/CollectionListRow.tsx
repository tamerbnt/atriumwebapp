import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  Pencil,
  Snowflake,
  RefreshCw,
  Pin,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { CollectionKebabMenu, KebabMenuItem } from './CollectionKebabMenu';

export interface ActionButtonDef {
  id?: string;
  tooltip?: string;
  label?: string;
  variant?: string;
  icon: React.ReactNode;
  iconColor?: string;
  onClick: (e?: any) => void;
  isSpecialDelete?: boolean;
  disabled?: boolean;
  title?: string;
}

interface CollectionListRowProps {
  id: string;
  isSelected?: boolean;
  isPinned?: boolean;
  isActive?: boolean;
  onRowClick?: () => void;
  children: React.ReactNode; // Row columns
  
  // Standard Actions
  onViewDetails?: () => void;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
  customActions?: ActionButtonDef[];
  
  // Custom kebab menu items
  extraKebabItems?: KebabMenuItem[];
}

export const CollectionListRow: React.FC<CollectionListRowProps> = ({
  id,
  isSelected = false,
  isPinned = false,
  isActive = true,
  onRowClick,
  children,
  onViewDetails,
  onEdit,
  onToggleStatus,
  onTogglePin,
  onDelete,
  customActions = [],
  extraKebabItems = [],
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isKebabOpen, setIsKebabOpen] = useState(false);
  const kebabButtonRef = useRef<HTMLButtonElement>(null);
  const rowContainerRef = useRef<HTMLDivElement>(null);

  // Close kebab menu if row unhovers and clicked outside
  useEffect(() => {
    if (!isHovered && !isKebabOpen) {
      // clean state
    }
  }, [isHovered, isKebabOpen]);

  // Construct 5 standard action buttons (with context-sensitive freeze and pin)
  const defaultActions: ActionButtonDef[] = [
    ...(onViewDetails
      ? [
          {
            id: 'view',
            tooltip: 'View',
            icon: <Eye className="w-4 h-4" strokeWidth={1.5} />,
            iconColor: '#64748B',
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onViewDetails();
            },
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            id: 'edit',
            tooltip: 'Edit',
            icon: <Pencil className="w-4 h-4" strokeWidth={1.5} />,
            iconColor: '#d4522f',
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit();
            },
          },
        ]
      : []),
    ...(onToggleStatus
      ? [
          {
            id: 'status',
            tooltip: isActive ? 'Freeze' : 'Activate',
            icon: isActive ? (
              <Snowflake className="w-4 h-4 text-[#06B6D4]" strokeWidth={1.5} />
            ) : (
              <RefreshCw className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
            ),
            iconColor: isActive ? '#06B6D4' : '#10B981',
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleStatus();
            },
          },
        ]
      : []),
    ...(onTogglePin
      ? [
          {
            id: 'pin',
            tooltip: isPinned ? 'Unpin' : 'Pin',
            icon: (
              <Pin
                strokeWidth={1.5}
                className={`w-4 h-4 ${
                  isPinned ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[var(--text-2)]'
                }`}
              />
            ),
            iconColor: isPinned ? '#F59E0B' : '#94A3B8',
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onTogglePin();
            },
          },
        ]
      : []),
    ...customActions,
    ...(onDelete
      ? [
          {
            id: 'delete',
            tooltip: 'Delete',
            icon: <Trash2 className="w-4 h-4 text-red-500" strokeWidth={1.5} />,
            iconColor: '#EF4444',
            isSpecialDelete: true,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete();
            },
          },
        ]
      : []),
  ];

  // Kebab items
  const kebabItems: KebabMenuItem[] = [
    ...(onViewDetails
      ? [
          {
            id: 'kebab-view',
            label: 'View',
            icon: <Eye className="w-4 h-4 text-black/65 dark:text-white/70" />,
            onClick: () => onViewDetails(),
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            id: 'kebab-edit',
            label: 'Edit',
            icon: <Pencil className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
            onClick: () => onEdit(),
          },
        ]
      : []),
    ...extraKebabItems,
    ...(onTogglePin
      ? [
          {
            id: 'kebab-pin',
            label: isPinned ? 'Unpin' : 'Pin',
            icon: (
              <Pin
                className={`w-4 h-4 ${
                  isPinned ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-black/65 dark:text-white/70'
                }`}
              />
            ),
            onClick: () => onTogglePin(),
          },
        ]
      : []),
    ...(onToggleStatus
      ? [
          {
            id: 'kebab-status',
            label: isActive ? 'Freeze' : 'Activate',
            icon: isActive ? (
              <Snowflake className="w-4 h-4 text-[#06B6D4]" />
            ) : (
              <RefreshCw className="w-4 h-4 text-emerald-500" />
            ),
            onClick: () => onToggleStatus(),
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            id: 'kebab-delete',
            label: 'Delete',
            icon: <Trash2 className="w-4 h-4 text-red-500" />,
            isSpecialDelete: true,
            isSeparatorBefore: true,
            onClick: () => onDelete(),
          },
        ]
      : []),
  ];

  return (
    <div
      ref={rowContainerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsKebabOpen(false);
      }}
      className="relative flex flex-col w-full transition-all duration-200 select-none group"
    >
      {/* ================= MAIN ROW CARD ================= */}
      <div
        onClick={onRowClick}
        className="relative z-10 w-full min-h-[var(--row-h,64px)] px-[var(--row-inset,12px)] py-[var(--s2,8px)] flex items-center gap-[var(--s2,8px)] cursor-pointer"
      >
        <div
          aria-hidden="true"
          data-sq="row"
          data-sq-border="solid"
          className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-150 ${
            isSelected
              ? 'bg-[#FCEEE8]/70 [--sq-stroke:rgba(212,82,47,0.5)] dark:bg-[#d4522f]/15 dark:[--sq-stroke:rgba(232,100,63,0.55)]'
              : isHovered
              ? 'bg-[#FBF8F5] dark:bg-[#282523]'
              : isPinned
              ? 'bg-white dark:bg-[#22201E] [--sq-stroke:rgba(245,158,11,0.45)] dark:[--sq-stroke:rgba(251,191,36,0.38)]'
              : 'bg-white dark:bg-[#22201E]'
          }`}
        />

        {/* Dynamic Column Children */}
        <div className="relative z-10 flex-1 flex items-center gap-[var(--col-gap,16px)] overflow-hidden">{children}</div>

        {/* Column 5: Kebab Button (⋮) */}
        <div className="relative z-20 shrink-0">
          <button
            ref={kebabButtonRef}
            type="button"
            data-no-liquid="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsKebabOpen((prev) => !prev);
            }}
            className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[#F3EDE7] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {/* Floating Context Menu */}
          <CollectionKebabMenu
            isOpen={isKebabOpen}
            onClose={() => setIsKebabOpen(false)}
            items={kebabItems}
          />
        </div>
      </div>

      {/* ================= ACTION ROW STRIP (EXPANDS ON HOVER) ================= */}
      {/* Real layout height expansion (0 -> 52px) pushing rows below down */}
      <div
        style={{
          height: isHovered ? '48px' : '0px',
          opacity: isHovered ? 1 : 0,
          transitionProperty: 'height, opacity',
          transitionDuration: isHovered ? '240ms, 180ms' : '180ms, 140ms',
          transitionTimingFunction: isHovered
            ? 'cubic-bezier(0.2, 0, 0.2, 1)'
            : 'cubic-bezier(0.4, 0, 1, 1)',
          transitionDelay: isHovered ? '0ms' : '80ms',
        }}
        className="w-full overflow-hidden flex items-center justify-center pointer-events-auto"
      >
        <div className="flex items-center justify-center gap-[var(--s3,12px)] py-[var(--s1,4px)]">
          {defaultActions.map((action, idx) => {
            const enterDelay = idx * 40;
            const exitDelay = (defaultActions.length - 1 - idx) * 30;

            return (
              <button
                key={action.id ? `${action.id}-${idx}` : `action-${idx}`}
                type="button"
                data-no-liquid="true"
                disabled={action.disabled}
                onClick={action.onClick}
                title={action.title || action.tooltip || action.label || ''}
                style={{
                  transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(-14px) scale(0.82)',
                  opacity: isHovered ? (action.disabled ? 0.45 : 1) : 0,
                  transitionProperty: 'transform, opacity',
                  transitionDuration: isHovered ? '240ms, 140ms' : '140ms, 100ms',
                  transitionTimingFunction: isHovered
                    ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'cubic-bezier(0.4, 0, 1, 1)',
                  transitionDelay: `${isHovered ? enterDelay : exitDelay}ms`,
                }}
                className={`w-[var(--btn-h,40px)] h-[var(--btn-h,40px)] rounded-full bg-white dark:bg-[#2B2825] border-0 shadow-[0_4px_14px_rgba(23,19,15,0.09)] dark:shadow-[0_6px_16px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center justify-center transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                  action.disabled
                    ? ''
                    : action.isSpecialDelete
                    ? 'hover:scale-105 active:scale-95 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/40'
                    : 'hover:scale-105 active:scale-95 cursor-pointer hover:bg-[#FDF4F0] dark:hover:bg-[#3A3632]'
                }`}
              >
                {action.icon}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
