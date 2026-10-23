import React, { useState } from 'react';
import {
  Eye,
  Pencil,
  DollarSign,
  Snowflake,
  RefreshCw,
  Pin,
  Trash2,
} from 'lucide-react';
import { ActionButtonDef } from './CollectionListRow';

interface CollectionGridCardProps {
  id: string;
  isSelected?: boolean;
  isPinned?: boolean;
  isActive?: boolean;
  onCardClick?: () => void;
  children: React.ReactNode; // Card body (e.g. 96px avatar, name, role badge)
  
  // Standard Actions
  onViewDetails?: () => void;
  onEdit?: () => void;
  onPay?: () => void;
  onToggleStatus?: () => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
  customActions?: ActionButtonDef[];
}

// 6 Arc Coordinates matching Desktop Spec
const FAN_OFFSETS = [
  { x: -72, y: -18, enterDelay: 0, exitDelay: 125 }, // Button 0: View Details
  { x: -50, y: -38, enterDelay: 30, exitDelay: 100 }, // Button 1: Edit
  { x: -18, y: -44, enterDelay: 60, exitDelay: 75 },  // Button 2: Pay / Custom
  { x: 16, y: -34, enterDelay: 90, exitDelay: 50 },   // Button 3: Freeze/Reactivate
  { x: 38, y: -6, enterDelay: 120, exitDelay: 25 },   // Button 4: Pin
  { x: 44, y: 28, enterDelay: 150, exitDelay: 0 },    // Button 5: Delete
];

export const CollectionGridCard: React.FC<CollectionGridCardProps> = ({
  id,
  isSelected = false,
  isPinned = false,
  isActive = true,
  onCardClick,
  children,
  onViewDetails,
  onEdit,
  onPay,
  onToggleStatus,
  onTogglePin,
  onDelete,
  customActions = [],
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Construct 6 fan action buttons
  const fanButtons: ActionButtonDef[] = [
    {
      id: 'fan-view',
      tooltip: 'View Details',
      icon: <Eye className="w-3.5 h-3.5" />,
      iconColor: '#64748B',
      onClick: (e) => {
        e.stopPropagation();
        onViewDetails?.();
      },
    },
    {
      id: 'fan-edit',
      tooltip: 'Edit',
      icon: <Pencil className="w-3.5 h-3.5" />,
      iconColor: '#C4785A',
      onClick: (e) => {
        e.stopPropagation();
        onEdit?.();
      },
    },
    {
      id: 'fan-pay',
      tooltip: 'Pay / Finance',
      icon: <DollarSign className="w-3.5 h-3.5" />,
      iconColor: '#C4785A',
      onClick: (e) => {
        e.stopPropagation();
        onPay?.();
      },
    },
    {
      id: 'fan-status',
      tooltip: isActive ? 'Freeze Record' : 'Reactivate Record',
      icon: isActive ? (
        <Snowflake className="w-3.5 h-3.5 text-[#06B6D4]" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
      ),
      iconColor: isActive ? '#06B6D4' : '#10B981',
      onClick: (e) => {
        e.stopPropagation();
        onToggleStatus?.();
      },
    },
    {
      id: 'fan-pin',
      tooltip: isPinned ? 'Unpin Record' : 'Pin to Top',
      icon: (
        <Pin
          className={`w-3.5 h-3.5 ${
            isPinned ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-neutral-400'
          }`}
        />
      ),
      iconColor: isPinned ? '#F59E0B' : '#94A3B8',
      onClick: (e) => {
        e.stopPropagation();
        onTogglePin?.();
      },
    },
    {
      id: 'fan-delete',
      tooltip: 'Delete',
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      iconColor: '#EF4444',
      isSpecialDelete: true,
      onClick: (e) => {
        e.stopPropagation();
        onDelete?.();
      },
    },
  ];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        zIndex: isHovered ? 999 : 1,
      }}
      className="relative flex flex-col pt-12 pr-11 pb-4 pl-3 select-none"
    >
      {/* 260px Fixed Width Card */}
      <div
        onClick={onCardClick}
        style={{
          transform: isHovered ? 'scale(1.01)' : 'scale(1)',
          transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
        }}
        className={`relative w-[260px] p-6 rounded-[20px] flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
          isSelected
            ? 'bg-gradient-to-br from-[#C4785A] to-[#a8583c] text-white shadow-lg border border-transparent'
            : isHovered
            ? 'bg-white dark:bg-[#18181B] border border-[#C4785A] shadow-md'
            : isPinned
            ? 'bg-white dark:bg-[#18181B] border-2 border-amber-400 shadow-sm'
            : 'bg-white dark:bg-[#18181B] border border-neutral-200/80 dark:border-neutral-800 shadow-sm'
        }`}
      >
        {/* ================= CORNER-FAN ACTION BUTTONS ANCHOR ================= */}
        {/* Rendered outside card boundaries via absolute positioning */}
        <div
          className="absolute top-0 right-0 pointer-events-none"
          style={{ width: 0, height: 0 }}
        >
          {fanButtons.map((btn, idx) => {
            const offset = FAN_OFFSETS[idx] || { x: 0, y: 0, enterDelay: 0, exitDelay: 0 };
            const delay = isHovered ? offset.enterDelay : offset.exitDelay;

            return (
              <button
                key={btn.id}
                type="button"
                onClick={btn.onClick}
                title={btn.tooltip}
                style={{
                  transform: isHovered
                    ? `translate(${offset.x}px, ${offset.y}px) scale(1)`
                    : 'translate(-20px, 20px) scale(0.82)',
                  opacity: isHovered ? 1 : 0,
                  pointerEvents: isHovered ? 'auto' : 'none',
                  transitionProperty: 'transform, opacity',
                  transitionDuration: isHovered ? '240ms, 150ms' : '160ms, 100ms',
                  transitionTimingFunction: isHovered
                    ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' // BackEase spring bounce
                    : 'cubic-bezier(0.4, 0, 1, 1)',
                  transitionDelay: `${delay}ms`,
                }}
                className={`absolute -top-4 -right-4 w-[34px] h-[34px] rounded-full bg-white dark:bg-[#1E1E22] border border-neutral-200 dark:border-neutral-700 shadow-md flex items-center justify-center transition-transform hover:scale-115 active:scale-95 cursor-pointer z-50 ${
                  btn.isSpecialDelete
                    ? 'hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/60'
                }`}
              >
                {btn.icon}
              </button>
            );
          })}
        </div>

        {/* Card Internal Body Content */}
        {children}
      </div>
    </div>
  );
};
