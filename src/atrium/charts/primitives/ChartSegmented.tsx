import React, { useCallback } from 'react';

export interface ChartSegmentedOption {
  id: string;
  label: string;
}

export interface ChartSegmentedProps {
  options: ChartSegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  isRtl?: boolean;
  className?: string;
}

/**
 * Spring-animated pill switcher (.seg / .th parity) using GPU-only translateX.
 * Supports keyboard Left/Right switching and RTL mirroring.
 */
export const ChartSegmented: React.FC<ChartSegmentedProps> = React.memo(
  ({ options, value, onChange, ariaLabel, isRtl = false, className = '' }) => {
    const activeIdx = Math.max(
      0,
      options.findIndex((o) => o.id === value)
    );
    const count = Math.max(1, options.length);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent, idx: number) => {
        if (options.length <= 1) return;
        const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
        const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
        if (e.key === nextKey) {
          e.preventDefault();
          const next = (idx + 1) % options.length;
          onChange(options[next].id);
        } else if (e.key === prevKey) {
          e.preventDefault();
          const prev = (idx - 1 + options.length) % options.length;
          onChange(options[prev].id);
        }
      },
      [options, onChange, isRtl]
    );

    if (options.length === 0) return null;

    const thumbPct = activeIdx * 100 * (isRtl ? -1 : 1);

    return (
      <div
        className={`ax-seg ${className}`}
        role="group"
        aria-label={ariaLabel}
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="ax-seg-th"
          style={{
            width: `calc((100% - 6px) / ${count})`,
            transform: `translate3d(${thumbPct}%, 0, 0)`,
          }}
        />
        {options.map((opt, idx) => {
          const pressed = idx === activeIdx;
          return (
            <button
              key={opt.id}
              type="button"
              className="ax-seg-btn"
              aria-pressed={pressed}
              onClick={() => onChange(opt.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }
);

ChartSegmented.displayName = 'ChartSegmented';
