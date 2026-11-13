import React, { forwardRef, useRef, useState, useEffect, useLayoutEffect, useImperativeHandle } from 'react';
import { SegmentedBlobController } from '../../../utils/atriumSprings';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import { LiveButtonSize } from './LiveButton';

export interface SegmentedOption {
  value?: string;
  id?: string;
  label?: React.ReactNode;
  tooltip?: string;
  icon?: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
  'aria-label'?: string;
}

export interface LiveSegmentedControlProps {
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  onChange?: (val: string) => void;
  size?: LiveButtonSize | 'sm' | 'md' | 'lg' | number;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  fullWidth?: boolean;
}

const classes = {
  root: 'd',
  blob: 's',
  option: 'e',
  iconOnly: 'z',
};

function getSizeProps(size?: LiveButtonSize | 'sm' | 'md' | 'lg' | number, style?: React.CSSProperties) {
  if (size === 'sm') {
    return {
      'data-atr-size': 'sm',
      style: {
        ...style,
        '--atr-h': '36px',
      } as React.CSSProperties,
    };
  }
  if (size === 'md') {
    return {
      'data-atr-size': 'md',
      style: {
        ...style,
        '--atr-h': '40px',
      } as React.CSSProperties,
    };
  }
  if (size === 'lg') {
    return {
      'data-atr-size': 'lg',
      style: {
        ...style,
        '--atr-h': '48px',
      } as React.CSSProperties,
    };
  }
  if (size === undefined) return { style };
  if (typeof size === 'number') {
    return {
      style: {
        ...style,
        '--atr-h': `${size}px`,
      } as React.CSSProperties,
    };
  }
  return {
    'data-atr-size': size,
    style,
  };
}

export const LiveSegmentedControl = React.memo(forwardRef<HTMLDivElement, LiveSegmentedControlProps>(
  function LiveSegmentedControl(
    {
      options,
      value: controlledValue,
      defaultValue,
      onValueChange,
      onChange,
      size,
      className = '',
      style,
      'aria-label': ariaLabel,
      fullWidth = false,
    },
    ref
  ) {
    const isControlled = controlledValue !== undefined;
    const getOptVal = (o?: SegmentedOption): string => (o ? (o.value ?? o.id ?? '') : '');

    const firstEnabled = getOptVal(options.find((o) => !o.disabled)) || getOptVal(options[0]);
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue !== undefined ? defaultValue : firstEnabled
    );
    const currentValue = isControlled ? controlledValue : internalValue;

    const selectedIndex = Math.max(
      0,
      options.findIndex((o) => getOptVal(o) === currentValue)
    );

    const rootRef = useRef<HTMLDivElement>(null);
    const blobRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const controllerRef = useRef<SegmentedBlobController | null>(null);
    const indexRef = useRef(selectedIndex);
    indexRef.current = selectedIndex;

    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

    const handleSelect = (val: string) => {
      if (!isControlled) {
        setInternalValue(val);
      }
      onValueChange?.(val);
      onChange?.(val);
    };

    const optionsLayoutKey = options
      .map((o) => `${getOptVal(o)}_${String(o.label)}_${o.count}`)
      .join('|');

    // Initialize controller only when option count or fullWidth layout mode changes
    useLayoutEffect(() => {
      const root = rootRef.current;
      const blob = blobRef.current;
      if (!root || !blob) return;

      const items = itemRefs.current.slice(0, options.length).filter(Boolean) as HTMLButtonElement[];
      const controller = new SegmentedBlobController(root, blob, items);
      controllerRef.current = controller;

      const refresh = () => {
        controller.measure();
        controller.setIndex(indexRef.current, false);
      };

      refresh();
      root.setAttribute('data-live', 'true');

      let ro: ResizeObserver | undefined;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(refresh);
        ro.observe(root);
      }

      let active = true;
      if (
        typeof document !== 'undefined' &&
        document.fonts &&
        document.fonts.status !== 'loaded' &&
        document.fonts.ready
      ) {
        document.fonts.ready.then(() => {
          if (active) refresh();
        });
      }

      return () => {
        active = false;
        ro?.disconnect();
        controller.dispose();
        controllerRef.current = null;
        root.removeAttribute('data-live');
      };
    }, [options.length, fullWidth]);

    // Re-measure button geometry in place if labels or badge counts change (zero controller teardown)
    useLayoutEffect(() => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      ctrl.opts = itemRefs.current.slice(0, options.length).filter(Boolean) as HTMLButtonElement[];
      ctrl.measure();
      ctrl.setIndex(indexRef.current, false);
    }, [optionsLayoutKey, options.length]);

    // Animate blob when index changes
    useEffect(() => {
      controllerRef.current?.setIndex(selectedIndex, true);
    }, [selectedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const total = options.length;
        let next = selectedIndex + dir;
        while (next >= 0 && next < total && options[next].disabled) {
          next += dir;
        }
        if (next >= 0 && next < total) {
          const nextOpt = options[next];
          handleSelect(getOptVal(nextOpt));
          itemRefs.current[next]?.focus();
        }
      }
    };

    const sizeProps = getSizeProps(size, style);

    return (
      <div
        ref={rootRef}
        role="radiogroup"
        aria-label={ariaLabel}
        className={[classes.root, fullWidth ? 'w-full flex' : '', className].filter(Boolean).join(' ')}
        onKeyDown={handleKeyDown}
        {...sizeProps}
      >
        <div ref={blobRef} className={classes.blob} aria-hidden="true" />
        {options.map((opt, idx) => {
          const val = getOptVal(opt);
          const isChecked = val === currentValue;
          const isIconOnly = opt.icon && !opt.label;
          const hasCount = opt.count !== undefined && opt.count !== null;
          const compacted = typeof opt.label === 'string'
            ? compactFilterLabel(opt.label, undefined, opt.tooltip)
            : null;
          const displayLabel = compacted ? compacted.label : opt.label;
          const tooltipText = opt.tooltip || compacted?.tooltip;
          return (
            <button
              key={val || idx}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isChecked}
              aria-label={opt['aria-label'] || (typeof opt.label === 'string' ? opt.label : undefined)}
              title={tooltipText}
              disabled={opt.disabled}
              className={[
                classes.option,
                fullWidth ? 'flex-1 justify-center' : '',
                isIconOnly ? classes.iconOnly : ''
              ].filter(Boolean).join(' ')}
              tabIndex={isChecked ? 0 : -1}
              onClick={() => handleSelect(val)}
            >
              {opt.icon}
              {displayLabel && <span>{displayLabel}</span>}
              {hasCount && <span className="atr-badge">{opt.count}</span>}
            </button>
          );
        })}
      </div>
    );
  }
));

LiveSegmentedControl.displayName = 'LiveSegmentedControl';
