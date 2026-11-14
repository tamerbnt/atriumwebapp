import React, { useEffect, useId, useRef, useState } from 'react';

export interface ChartInfoPopoverProps {
  text: string;
  ariaLabel?: string;
}

/**
 * "?" contextual explanation trigger with -12px expanded touch inset and
 * spring-blur popover (0.57s --sp parity with Main.dc.html).
 */
export const ChartInfoPopover: React.FC<ChartInfoPopoverProps> = React.memo(
  ({ text, ariaLabel = 'Aide sur le graphique' }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const popoverId = useId();

    useEffect(() => {
      if (!open) return;

      const onPointerDown = (e: PointerEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
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
      <div className="ax-help-wrap" ref={wrapRef}>
        <button
          type="button"
          className="ax-q"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={ariaLabel}
          onClick={() => setOpen((prev) => !prev)}
        >
          ?
        </button>
        <div
          id={popoverId}
          role="tooltip"
          className="ax-pop"
          data-open={open ? 'true' : 'false'}
          aria-hidden={!open}
        >
          {text}
        </div>
      </div>
    );
  }
);

ChartInfoPopover.displayName = 'ChartInfoPopover';
