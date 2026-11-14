import React, { useEffect, useRef } from 'react';

export interface RollingDigitsProps {
  value: string | number;
  className?: string;
  staggerMs?: number;
}

/**
 * Character-by-character rolling numeric display matching Main.dc.html's
 * alternating pa / pb keyframe with 60ms stagger per digit slot.
 */
export const RollingDigits: React.FC<RollingDigitsProps> = React.memo(
  ({ value, className = '', staggerMs = 60 }) => {
    const str = String(value);
    const prevRef = useRef<string>(str);
    const phaseRef = useRef<'a' | 'b'>('a');

    if (prevRef.current !== str) {
      phaseRef.current = phaseRef.current === 'a' ? 'b' : 'a';
      prevRef.current = str;
    }

    useEffect(() => {
      prevRef.current = str;
    }, [str]);

    const chars = str.split('');
    const phase = phaseRef.current;

    return (
      <span className={`ax-roll ${className}`} aria-live="off">
        {chars.map((ch, idx) => {
          const isStatic = ch === ' ' || ch === '\u00a0' || ch === '\u202f';
          if (isStatic) {
            return (
              <span key={`sp-${idx}`} className="ax-roll-ch">
                {ch}
              </span>
            );
          }
          const delay = Math.min(idx * staggerMs, 420);
          return (
            <span key={`d-${idx}-${chars.length}`} className="ax-roll-ch">
              <span
                key={`${phase}-${ch}`}
                className="ax-roll-in"
                data-phase={phase}
                style={{ animationDelay: `${delay}ms` }}
              >
                {ch}
              </span>
            </span>
          );
        })}
      </span>
    );
  }
);

RollingDigits.displayName = 'RollingDigits';
