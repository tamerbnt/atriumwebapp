import React, { useEffect, useId, useRef, useState } from 'react';

export interface ChartInfoPopoverProps {
  text: string;
  ariaLabel?: string;
}

/**
 * "?" contextual explanation trigger with -12px expanded touch inset,
 * hover/focus/click reveal, rotated diamond arrow, and spring-blur popover
 * (0.57s --sp parity with Main.dc.html).
 */
export const ChartInfoPopover: React.FC<ChartInfoPopoverProps> = React.memo(
  ({ text, ariaLabel = 'Aide sur le graphique' }) => {
    const [pinned, setPinned] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [layout, setLayout] = useState({ shiftPx: 0, arrowPx: 10 });
    const wrapRef = useRef<HTMLDivElement>(null);
    const popoverId = useId();

    const open = pinned || hovered || focused;

    useEffect(() => {
      if (!open) return;

      const wrap = wrapRef.current;
      const card = wrap?.closest('.ax-card');
      if (wrap && card) {
        const wRect = wrap.getBoundingClientRect();
        const cRect = card.getBoundingClientRect();
        const popW = Math.min(232, cRect.width * 0.7);
        const isRtl = getComputedStyle(card).direction === 'rtl';
        const btnCenterX = wRect.left + wRect.width / 2;
        const idealLeft = isRtl ? wRect.right - popW : wRect.left - 8;
        const minLeft = cRect.left + 12;
        const maxLeft = Math.max(minLeft, cRect.right - 12 - popW);
        const clampedLeft = Math.max(minLeft, Math.min(maxLeft, idealLeft));
        const arrowPx = Math.max(12, Math.min(popW - 12, btnCenterX - clampedLeft));
        setLayout({
          shiftPx: Math.round(clampedLeft - wRect.left),
          arrowPx: Math.round(arrowPx),
        });
      }

      const onPointerDown = (e: PointerEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
          setPinned(false);
          setHovered(false);
          setFocused(false);
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setPinned(false);
          setHovered(false);
          setFocused(false);
        }
      };

      document.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
      };
    }, [open]);

    if (!text) return null;

    return (
      <div
        className="ax-help-wrap"
        ref={wrapRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <button
          type="button"
          data-no-liquid="true"
          className="ax-q"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={ariaLabel}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onClick={() => setPinned((prev) => !prev)}
        >
          ?
        </button>
        <div
          id={popoverId}
          role="tooltip"
          className="ax-pop"
          data-open={open ? 'true' : 'false'}
          style={
            {
              left: `${layout.shiftPx}px`,
              '--ax-arrow-x': `${layout.arrowPx}px`,
            } as React.CSSProperties
          }
          aria-hidden={!open}
        >
          {text}
        </div>
      </div>
    );
  }
);

ChartInfoPopover.displayName = 'ChartInfoPopover';
