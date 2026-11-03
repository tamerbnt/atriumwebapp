'use client';

import type { ReactNode, KeyboardEvent, MouseEvent } from 'react';
import { cx } from '../../hooks';
import { LiquidPanel, usePopup, panelStyles as s } from '../Panel/LiquidPanel';
import type { Placement } from '../Panel/position';

export type MenuEntry =
  | {
      type?: 'item';
      id: string;
      label: ReactNode;
      /** second line, muted */
      description?: ReactNode;
      /** any inline SVG */
      icon?: ReactNode;
      danger?: boolean;
      disabled?: boolean;
      onSelect?: () => void;
    }
  | { type: 'separator'; id?: string };

/** Everything a trigger needs. Spread it onto an Atrium Button (or any element that takes a ref). */
export interface MenuTriggerProps {
  ref: (el: HTMLElement | null) => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

export interface MenuProps {
  /** render the trigger, spreading `props` onto it: `trigger={(p) => <Button {...p}>Account</Button>}` */
  trigger: (props: MenuTriggerProps, state: { open: boolean }) => ReactNode;
  items: ReadonlyArray<MenuEntry>;
  /** shown above the items, e.g. the signed-in user */
  header?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  'aria-label'?: string;
}

/**
 * An action menu. The panel fills like a vessel and one blob follows the pointer between rows.
 * Portalled to <body>, flips and shifts to stay on screen, and follows its trigger on scroll.
 *
 * Keyboard: Enter / Space / ↓ opens on the first row, ↑ on the last. ↑ ↓ Home End move, type to jump,
 * Esc closes and returns focus to the trigger.
 */
export function Menu({ trigger, items, header, placement = 'bottom-end', open, defaultOpen, onOpenChange, ...rest }: MenuProps) {
  const popup = usePopup({ open, defaultOpen, onOpenChange, haspopup: 'menu' });
  const { panelProps } = popup;

  return (
    <>
      {trigger(popup.getTriggerProps() as MenuTriggerProps, { open: popup.open })}
      {popup.show ? (
        <LiquidPanel {...panelProps} role="menu" aria-label={rest['aria-label']} placement={placement} header={header}>
          {items.map((it, i) =>
            it.type === 'separator' ? (
              <div key={it.id ?? `sep-${i}`} className={s.hr} role="separator" />
            ) : (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                data-atr-item=""
                tabIndex={-1}
                disabled={it.disabled}
                className={cx(s.item, it.danger && s.danger)}
                onClick={() => {
                  it.onSelect?.();
                  panelProps.onRequestClose('select');
                }}
              >
                {it.icon}
                <span className={s.text}>
                  <b>{it.label}</b>
                  {it.description ? <small>{it.description}</small> : null}
                </span>
              </button>
            ),
          )}
        </LiquidPanel>
      ) : null}
    </>
  );
}
