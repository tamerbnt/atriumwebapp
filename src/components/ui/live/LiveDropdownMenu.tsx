import React, { useState, useRef } from 'react';
import { LivePopoverPanel, popoverClasses } from './LivePopoverPanel';

export type LiveMenuItem =
  | {
      id: string;
      label: React.ReactNode;
      icon?: React.ReactNode;
      description?: React.ReactNode;
      danger?: boolean;
      disabled?: boolean;
      onClick?: () => void;
    }
  | {
      type: 'separator';
    };

export interface LiveDropdownMenuProps {
  trigger: (
    triggerProps: {
      ref: React.RefCallback<HTMLElement>;
      onClick: (e: React.MouseEvent) => void;
      'aria-haspopup': 'menu';
      'aria-expanded': boolean;
    },
    state: { open: boolean }
  ) => React.ReactNode;
  items: LiveMenuItem[];
  header?: React.ReactNode;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  'aria-label'?: string;
}

export function LiveDropdownMenu({
  trigger,
  items,
  header,
  placement = 'bottom-end',
  'aria-label': ariaLabel,
}: LiveDropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const handleSetRef = (el: HTMLElement | null) => {
    triggerRef.current = el;
    setAnchorEl(el);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleItemClick = (item: Extract<LiveMenuItem, { id: string }>) => {
    if (item.disabled) return;
    setOpen(false);
    item.onClick?.();
    triggerRef.current?.focus();
  };

  return (
    <>
      {trigger(
        {
          ref: handleSetRef,
          onClick: handleToggle,
          'aria-haspopup': 'menu',
          'aria-expanded': open,
        },
        { open }
      )}

      <LivePopoverPanel
        anchor={anchorEl}
        open={open}
        role="menu"
        aria-label={ariaLabel}
        placement={placement}
        width="menu"
        header={header}
        focus="first"
        onRequestClose={() => setOpen(false)}
      >
        {items.map((item, idx) => {
          if ('type' in item && item.type === 'separator') {
            return <div key={`sep-${idx}`} className={popoverClasses.hr} />;
          }

          const actionItem = item as Extract<LiveMenuItem, { id: string }>;
          const itemClasses = [
            popoverClasses.item,
            actionItem.danger ? popoverClasses.danger : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={actionItem.id}
              type="button"
              role="menuitem"
              data-atr-item=""
              tabIndex={-1}
              disabled={actionItem.disabled}
              className={itemClasses}
              onClick={() => handleItemClick(actionItem)}
            >
              {actionItem.icon}
              <span className={popoverClasses.text}>
                <b>{actionItem.label}</b>
                {actionItem.description && <small>{actionItem.description}</small>}
              </span>
            </button>
          );
        })}
      </LivePopoverPanel>
    </>
  );
}
