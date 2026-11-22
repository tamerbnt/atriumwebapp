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
      tooltip: 'View',
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
      iconColor: '#d4522f',
      onClick: (e) => {
        e.stopPropagation();
        onEdit?.();
      },
    },
    {
      id: 'fan-pay',
      tooltip: 'Pay',
      icon: <DollarSign className="w-3.5 h-3.5" />,
      iconColor: '#d4522f',
      onClick: (e) => {
        e.stopPropagation();
        onPay?.();
      },
    },
    {
      id: 'fan-status',
      tooltip: isActive ? 'Freeze' : 'Activate',
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
      tooltip: isPinned ? 'Unpin' : 'Pin',
      icon: (
        <Pin
          className={`w-3.5 h-3.5 ${
            isPinned ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-black/62 dark:text-white/65'
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
        className={`relative w-[260px] p-6 sq-elev-card sq-elev-card-hover flex flex-col items-center justify-center text-center cursor-pointer ${
          isSelected ? 'text-white' : ''
        }`}
      >
        {/* Squircle card surface (background/stroke) so corner-fan buttons outside card bounds are never clipped */}
        <div
          aria-hidden="true"
          data-sq="card"
          data-sq-border={isSelected ? 'none' : 'solid'}
          className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-200 ${
            isSelected
              ? 'bg-gradient-to-br from-[#d4522f] to-[#a8583c]'
              : isHovered
              ? 'bg-[#FCF9F6] dark:bg-[#282523]'
              : isPinned
              ? 'bg-white dark:bg-[#22201E] [--sq-stroke:rgba(245,158,11,0.5)]'
              : 'bg-white dark:bg-[#22201E]'
          }`}
        />

        {/* ================= CORNER-FAN ACTION BUTTONS ANCHOR ================= */}
        {/* Rendered outside card boundaries via absolute positioning */}
        <div
          className="absolute top-0 right-0 pointer-events-none z-20"
          style={{ width: 0, height: 0 }}
        >
          {fanButtons.map((btn, idx) => {
            const offset = FAN_OFFSETS[idx] || { x: 0, y: 0, enterDelay: 0, exitDelay: 0 };
            const delay = isHovered ? offset.enterDelay : offset.exitDelay;

            return (
              <button
                key={btn.id ? `${btn.id}-${idx}` : `btn-${idx}`}
                type="button"
                data-no-liquid="true"
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
                className={`absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white dark:bg-[#2B2825] border-0 shadow-[0_4px_14px_rgba(23,19,15,0.1)] dark:shadow-[0_6px_16px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center justify-center transition-transform hover:scale-115 active:scale-95 cursor-pointer z-50 ${
                  btn.isSpecialDelete
                    ? 'hover:bg-red-50 dark:hover:bg-red-950/40'
                    : 'hover:bg-[#F3EDE7] dark:hover:bg-[#3A3632]'
                }`}
              >
                {btn.icon}
              </button>
            );
          })}
        </div>

        {/* Card Internal Body Content */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};
