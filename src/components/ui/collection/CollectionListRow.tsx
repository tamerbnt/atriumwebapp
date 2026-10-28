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
            tooltip: 'View Details',
            icon: <Eye className="w-3.5 h-3.5" />,
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
            icon: <Pencil className="w-3.5 h-3.5" />,
            iconColor: '#C4785A',
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
            tooltip: isActive ? 'Freeze Record' : 'Reactivate Record',
            icon: isActive ? (
              <Snowflake className="w-3.5 h-3.5 text-[#06B6D4]" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
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
            tooltip: isPinned ? 'Unpin Record' : 'Pin to Top',
            icon: (
              <Pin
                className={`w-3.5 h-3.5 ${
                  isPinned ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-neutral-400'
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
            icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
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
            label: 'View Details',
            icon: <Eye className="w-4 h-4 text-neutral-500" />,
            onClick: () => onViewDetails(),
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            id: 'kebab-edit',
            label: 'Edit',
            icon: <Pencil className="w-4 h-4 text-[#C4785A]" />,
            onClick: () => onEdit(),
          },
        ]
      : []),
    ...extraKebabItems,
    ...(onTogglePin
      ? [
          {
            id: 'kebab-pin',
            label: isPinned ? 'Unpin' : 'Pin to Top',
            icon: (
              <Pin
                className={`w-4 h-4 ${
                  isPinned ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-neutral-500'
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
            label: isActive ? 'Freeze / Suspend' : 'Reactivate / Renew',
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
            label: 'Delete Record',
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
      className="relative flex flex-col w-full mb-1.5 transition-all duration-200 select-none group"
    >
      {/* ================= MAIN ROW CARD ================= */}
      <div
        onClick={onRowClick}
        style={{
          borderLeftWidth: isSelected || isHovered ? '3px' : isPinned ? '2px' : '1px',
          borderLeftColor:
            isSelected || isHovered
              ? '#C4785A'
              : isPinned
              ? '#F59E0B'
              : undefined,
        }}
        className={`relative z-10 w-full min-h-[50px] px-4 py-2 rounded-[10px] flex items-center transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'bg-[#C4785A]/10 border-t border-r border-b border-[#C4785A]/30 dark:bg-[#C4785A]/15'
            : isHovered
            ? 'bg-neutral-50/90 dark:bg-neutral-800/80 border-t border-r border-b border-neutral-200 dark:border-neutral-700 shadow-sm'
            : isPinned
            ? 'bg-white dark:bg-[#18181B] border-t border-r border-b border-amber-400/50 dark:border-amber-500/40'
            : 'bg-white dark:bg-[#18181B] border border-neutral-200/80 dark:border-neutral-800'
        }`}
      >
        {/* Dynamic Column Children */}
        <div className="flex-1 flex items-center gap-3 overflow-hidden">{children}</div>

        {/* Column 5: Kebab Button (⋮) */}
        <div className="relative shrink-0 ml-2">
          <button
            ref={kebabButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsKebabOpen((prev) => !prev);
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
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
      {/* Real layout height expansion (0 -> 46px) pushing rows below down */}
      <div
        style={{
          height: isHovered ? '46px' : '0px',
          opacity: isHovered ? 1 : 0,
          marginTop: isHovered ? '6px' : '0px',
          marginBottom: isHovered ? '4px' : '0px',
          transitionProperty: 'height, opacity, margin',
          transitionDuration: isHovered ? '240ms, 180ms, 240ms' : '180ms, 140ms, 180ms',
          transitionTimingFunction: isHovered
            ? 'cubic-bezier(0.2, 0, 0.2, 1)'
            : 'cubic-bezier(0.4, 0, 1, 1)',
          transitionDelay: isHovered ? '0ms' : '80ms', // 80ms delay before collapse
        }}
        className="w-full overflow-hidden flex items-center justify-center pointer-events-auto"
      >
        <div className="flex items-center justify-center gap-4 py-1">
          {defaultActions.map((action, idx) => {
            // Stagger calculation: Left-to-right (40ms) on enter, Right-to-left (30ms) on exit
            const enterDelay = idx * 40;
            const exitDelay = (defaultActions.length - 1 - idx) * 30;

            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                title={action.tooltip || action.label || ''}
                style={{
                  transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(-14px) scale(0.82)',
                  opacity: isHovered ? 1 : 0,
                  transitionProperty: 'transform, opacity',
                  transitionDuration: isHovered ? '240ms, 140ms' : '140ms, 100ms',
                  transitionTimingFunction: isHovered
                    ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' // spring bounce (BackEase)
                    : 'cubic-bezier(0.4, 0, 1, 1)',
                  transitionDelay: `${isHovered ? enterDelay : exitDelay}ms`,
                }}
                className={`w-9 h-9 rounded-full bg-white dark:bg-[#1E1E22] border border-neutral-200/90 dark:border-neutral-700/80 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                  action.isSpecialDelete
                    ? 'hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/60 hover:border-neutral-300'
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
