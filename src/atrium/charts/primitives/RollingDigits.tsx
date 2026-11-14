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
  ({ value, className = '', staggerMs = 26 }) => {
    const str = String(value);
    const prevRef = useRef<string>(str);
    const phaseRef = useRef<'a' | 'b'>('a');
    const hasChangedRef = useRef<boolean>(false);
    const lastChangeMsRef = useRef<number>(0);
    const rapidScrubRef = useRef<boolean>(false);

    if (prevRef.current !== str) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const isRapid = hasChangedRef.current && now - lastChangeMsRef.current < 120;
      lastChangeMsRef.current = now;
      rapidScrubRef.current = isRapid;
      hasChangedRef.current = true;
      if (!isRapid) {
        phaseRef.current = phaseRef.current === 'a' ? 'b' : 'a';
      }
      prevRef.current = str;
    }

    useEffect(() => {
      prevRef.current = str;
    }, [str]);

    const chars = str.split('');
    const phase = phaseRef.current;
    const animate = hasChangedRef.current && !rapidScrubRef.current;

    return (
      <span dir="ltr" className={`ax-roll ${className}`} aria-live="off">
        {chars.map((ch, idx) => {
          const isStatic = ch === ' ' || ch === '\u00a0' || ch === '\u202f';
          if (isStatic) {
            return (
              <span key={`sp-${idx}`} className="ax-roll-ch">
                {ch === ' ' ? '\u00a0' : ch}
              </span>
            );
          }
          const delay = animate ? Math.min(idx * staggerMs, 180) : 0;
          return (
            <span key={`d-${idx}-${chars.length}`} className="ax-roll-ch">
              {animate ? (
                <span
                  key={`${phase}-${ch}`}
                  className="ax-roll-in"
                  data-phase={phase}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  {ch}
                </span>
              ) : (
                <span>{ch}</span>
              )}
            </span>
          );
        })}
      </span>
    );
  }
);

RollingDigits.displayName = 'RollingDigits';
