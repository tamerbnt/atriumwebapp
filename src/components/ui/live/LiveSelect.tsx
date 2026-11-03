import React, { useState, useRef } from 'react';
import { LiveButton, LiveButtonTone, LiveButtonSize } from './LiveButton';
import { LivePopoverPanel, popoverClasses } from './LivePopoverPanel';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface LiveSelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  placeholder?: string;
  tone?: LiveButtonTone;
  size?: LiveButtonSize;
  disabled?: boolean;
  name?: string;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-atr-chev=""
      style={{ transition: 'none' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function LiveSelect({
  options,
  value: controlledValue,
  defaultValue,
  onValueChange,
  placeholder = 'Select...',
  tone = 'soft',
  size,
  disabled,
  name,
  placement = 'bottom-start',
  className = '',
  style,
  'aria-label': ariaLabel,
}: LiveSelectProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue !== undefined ? defaultValue : (options[0]?.value ?? '')
  );
  const currentValue = isControlled ? controlledValue : internalValue;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.value === currentValue);

  const handleSelect = (val: string) => {
    if (!isControlled) {
      setInternalValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <LiveButton
        ref={triggerRef}
        type="button"
        tone={tone}
        size={size}
        disabled={disabled}
        className={className}
        style={style}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel || 'Select'}${selectedOption ? `: ${typeof selectedOption.label === 'string' ? selectedOption.label : selectedOption.value}` : ''}`}
        leading={selectedOption?.icon}
        trailing={<ChevronIcon />}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedOption ? selectedOption.label : placeholder}
      </LiveButton>

      {name && <input type="hidden" name={name} value={currentValue ?? ''} />}

      <LivePopoverPanel
        anchor={triggerRef.current}
        open={open}
        role="listbox"
        aria-label={ariaLabel}
        placement={placement}
        width="anchor"
        focus="selected"
        onRequestClose={() => setOpen(false)}
      >
        {options.map((opt) => {
          const isSelected = opt.value === currentValue;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-atr-item=""
              tabIndex={-1}
              disabled={opt.disabled}
              className={popoverClasses.item}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.icon}
              <span className={popoverClasses.text}>
                <b>{opt.label}</b>
                {opt.description && <small>{opt.description}</small>}
              </span>
              {isSelected && <i className={popoverClasses.mark} aria-hidden="true" />}
            </button>
          );
        })}
      </LivePopoverPanel>
    </>
  );
}
