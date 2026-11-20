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
      className="absolute right-0 top-full mt-[var(--pop-offset,8px)] z-50 min-w-[190px] sq-elev-pop animate-in fade-in zoom-in-95 duration-150"
    >
      <div
        data-sq="card"
        data-sq-border="solid"
        className="relative p-[var(--s2,8px)] bg-white dark:bg-[#18181B] [--sq-stroke:#E5E5E5] dark:[--sq-stroke:#26262A] text-[var(--text-1)] t-label"
      >
        <div className="flex flex-col gap-[var(--s1,4px)]">
          {items.map((item, idx) => (
            <React.Fragment key={item.id || idx}>
              {item.isSeparatorBefore && (
                <div className="h-[1px] bg-neutral-200 dark:bg-neutral-800" />
              )}
              <button
                type="button"
                data-no-liquid="true"
                data-sq="row"
                data-sq-border="none"
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  onClose();
                }}
                className={`relative w-full h-[var(--btn-sm-h,32px)] flex items-center gap-[var(--s2,8px)] px-[var(--s3,12px)] text-left transition-colors cursor-pointer ${
                  item.isSpecialDelete
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/70 text-[var(--text-1)]'
                }`}
              >
                <span
                  className="w-[var(--icon-s,16px)] h-[var(--icon-s,16px)] flex items-center justify-center shrink-0"
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
    </div>
  );
};
