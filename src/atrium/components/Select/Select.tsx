'use client';

import type { ReactNode } from 'react';
import { cx, useControllable } from '../../hooks';
import type { Size } from '../../hooks';
import { Button } from '../Button/Button';
import type { Tone } from '../Button/Button';
import { LiquidPanel, usePopup, panelStyles as s } from '../Panel/LiquidPanel';
import type { Placement } from '../Panel/position';

export interface SelectOption<T extends string = string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  options: ReadonlyArray<SelectOption<T>>;
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  /** shown when nothing is selected */
  placeholder?: ReactNode;
  tone?: Tone;
  size?: Size;
  disabled?: boolean;
  /** renders a hidden input so the value posts with a native <form> */
  name?: string;
  placement?: Placement;
  /** required: name the control for screen readers, e.g. "Period" */
  'aria-label': string;
  className?: string;
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" data-atr-chev="">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/**
 * A dropdown that picks one value. Same liquid vessel as Menu, with one of the logo's corner squares
 * marking the selected row. Works controlled (`value` + `onValueChange`, e.g. with React Hook Form's
 * Controller) or uncontrolled (`defaultValue`).
 */
export function Select<T extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  tone = 'soft',
  size,
  disabled,
  name,
  placement = 'bottom-start',
  className,
  ...rest
}: SelectProps<T>) {
  const [current, setCurrent] = useControllable<T | undefined>(
    value,
    defaultValue,
    onValueChange as ((v: T | undefined) => void) | undefined,
  );
  const popup = usePopup({ haspopup: 'listbox' });
  const { panelProps } = popup;
  const selected = options.find((o) => o.value === current);

  return (
    <>
      <Button
        {...popup.getTriggerProps()}
        tone={tone}
        size={size}
        disabled={disabled}
        className={cx(className)}
        aria-label={`${rest['aria-label']}${selected ? `: ${typeof selected.label === 'string' ? selected.label : String(selected.value)}` : ''}`}
        leading={selected?.icon}
        trailing={<Chevron />}
      >
        {selected ? selected.label : placeholder}
      </Button>
      {name ? <input type="hidden" name={name} value={current ?? ''} /> : null}
      {popup.show ? (
        <LiquidPanel {...panelProps} role="listbox" aria-label={rest['aria-label']} placement={placement} width="anchor">
          {options.map((o) => {
            const on = o.value === current;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                data-atr-item=""
                tabIndex={-1}
                disabled={o.disabled}
                className={s.item}
                onClick={() => {
                  setCurrent(o.value);
                  panelProps.onRequestClose('select');
                }}
              >
                {o.icon}
                <span className={s.text}>
                  <b>{o.label}</b>
                  {o.description ? <small>{o.description}</small> : null}
                </span>
                {on ? <i className={s.mark} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </LiquidPanel>
      ) : null}
    </>
  );
}
