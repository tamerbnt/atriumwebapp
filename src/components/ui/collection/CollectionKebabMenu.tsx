import React, { useEffect, useRef } from 'react';
import {
  Eye,
  Pencil,
  Snowflake,
  RefreshCw,
  Pin,
  Trash2,
} from 'lucide-react';

export interface KebabMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconColor?: string;
  onClick: () => void;
  isSpecialDelete?: boolean;
  isSeparatorBefore?: boolean;
}

interface CollectionKebabMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: KebabMenuItem[];
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

export const CollectionKebabMenu: React.FC<CollectionKebabMenuProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }}
      className="absolute right-0 top-full mt-1.5 z-50 min-w-[190px] p-1.5 rounded-[14px] bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 text-[13px] font-medium shadow-xl animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex flex-col gap-0.5">
        {items.map((item, idx) => (
          <React.Fragment key={item.id || idx}>
            {item.isSeparatorBefore && (
              <div className="h-[1px] my-1 mx-2 bg-neutral-200 dark:bg-neutral-800" />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-left transition-colors cursor-pointer ${
                item.isSpecialDelete
                  ? 'text-red-500 hover:bg-[#12EF4444] dark:hover:bg-red-500/10'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/70 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              <span
                className="w-5 h-5 flex items-center justify-center shrink-0"
                style={{ color: item.iconColor }}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
