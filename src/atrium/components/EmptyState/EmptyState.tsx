import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './EmptyState.css';

export type Tone = 'neutral' | 'positive' | 'warning' | 'error';

export type Action = {
  label: ReactNode;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
};

export type EmptyStateProps = {
  variant?: 'island' | 'compact';
  icon: ReactNode;
  tone?: Tone;
  title: ReactNode;
  titleAs?: 'h2' | 'h3';
  description?: ReactNode;
  primaryAction?: Action;
  secondaryAction?: Action;
  hint?: ReactNode;
  width?: number;
  ghostRows?: number | 'auto';
  ghostTracks?: 3 | 4 | 6 | 'auto';
  autoFocusPrimary?: boolean;
  className?: string;
};

export const GHOST_TRACK_TEMPLATES: Record<3 | 4 | 6, string> = {
  6: '22px 38px 1fr 190px 120px 100px',
  4: '22px 38px 1fr 96px',
  3: '22px 38px 1fr',
};

export const GHOST_TEXT_BAR_WIDTHS: ReadonlyArray<readonly [number, number]> = [
  [120, 72],
  [150, 88],
  [104, 64],
  [136, 80],
];

export function resolveGhostTrackCount(
  containerWidth: number,
  ghostTracks: 3 | 4 | 6 | 'auto' = 'auto'
): 3 | 4 | 6 {
  if (ghostTracks === 3 || ghostTracks === 4 || ghostTracks === 6) {
    return ghostTracks;
  }
  if (containerWidth >= 1000) return 6;
  if (containerWidth >= 600) return 4;
  return 3;
}

export function computeGhostRowCount(
  availableHeight: number,
  ghostRows: number | 'auto' = 'auto'
): number {
  if (typeof ghostRows === 'number') {
    return Math.max(0, Math.floor(ghostRows));
  }
  if (!Number.isFinite(availableHeight) || availableHeight <= 0) {
    return 4;
  }
  const raw = Math.floor(availableHeight / 70);
  return Math.min(4, Math.max(2, raw));
}

function renderActionButton(
  action: Action,
  kind: 'primary' | 'secondary',
  compact: boolean,
  ref?: React.RefObject<HTMLButtonElement | HTMLAnchorElement | null>
) {
  const classes = [
    'es-btn',
    kind === 'primary' ? 'es-btn--primary' : 'es-btn--secondary',
    compact ? 'es-btn--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const sqToken = compact ? 'ctl-sm' : 'ctl';
  const sqBorder = kind === 'secondary' ? 'solid' : 'none';

  const content = (
    <>
      {action.icon && (
        <span className="es-btn-icon" aria-hidden="true">
          {action.icon}
        </span>
      )}
      <span className="es-btn-label">{action.label}</span>
    </>
  );

  if (action.href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement | null>}
        href={action.href}
        onClick={action.onClick}
        data-sq={sqToken}
        data-sq-border={sqBorder}
        className={classes}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement | null>}
      type="button"
      onClick={action.onClick}
      data-sq={sqToken}
      data-sq-border={sqBorder}
      className={classes}
    >
      {content}
    </button>
  );
}

const EmptyStateInner: React.FC<EmptyStateProps> = ({
  variant = 'island',
  icon,
  tone = 'neutral',
  title,
  titleAs = 'h3',
  description,
  primaryAction,
  secondaryAction,
  hint,
  width = 420,
  ghostRows = 'auto',
  ghostTracks = 'auto',
  autoFocusPrimary = false,
  className,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const needsWidthObserver = variant === 'island' && ghostTracks === 'auto';
  const needsHeightObserver = variant === 'island' && ghostRows === 'auto';
  const needsObserver = needsWidthObserver || needsHeightObserver;

  const [quantizedLayout, setQuantizedLayout] = useState<{
    trackCount: 3 | 4 | 6;
    rowCount: number;
  }>(() => ({
    trackCount: resolveGhostTrackCount(1000, ghostTracks),
    rowCount: computeGhostRowCount(330, ghostRows),
  }));

  useLayoutEffect(() => {
    if (!needsObserver) return;
    const el = rootRef.current;
    if (!el) return;

    const updateLayout = (w: number, h: number) => {
      if (w <= 0 && h <= 0) return;
      const nextTrackCount = resolveGhostTrackCount(w > 0 ? w : 1000, ghostTracks);
      const nextRowCount = computeGhostRowCount(h > 0 ? h : 330, ghostRows);
      setQuantizedLayout((prev) =>
        prev.trackCount === nextTrackCount && prev.rowCount === nextRowCount
          ? prev
          : { trackCount: nextTrackCount, rowCount: nextRowCount }
      );
    };

    const rect = el.getBoundingClientRect();
    updateLayout(rect.width, rect.height);

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) {
        updateLayout(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [needsObserver, ghostTracks, ghostRows]);

  useEffect(() => {
    if (autoFocusPrimary && tone === 'error') {
      primaryRef.current?.focus();
    }
  }, [autoFocusPrimary, tone]);

  const trackCount =
    ghostTracks === 'auto' ? quantizedLayout.trackCount : ghostTracks;
  const rowCount =
    typeof ghostRows === 'number'
      ? Math.max(0, Math.floor(ghostRows))
      : quantizedLayout.rowCount;

  const ghostRowElements = useMemo(() => {
    if (variant !== 'island' || rowCount <= 0) return null;
    const gridTemplateColumns = GHOST_TRACK_TEMPLATES[trackCount];
    return (
      <div className="es-ghost" aria-hidden="true">
        {Array.from({ length: rowCount }).map((_, idx) => {
          const [primaryBarW, secondaryBarW] =
            GHOST_TEXT_BAR_WIDTHS[idx % GHOST_TEXT_BAR_WIDTHS.length];
          return (
            <div
              key={idx}
              className="es-ghost-row"
              data-sq="row"
              data-sq-border="dashed"
              data-sq-stroke-w="1.5"
              style={{ gridTemplateColumns }}
            >
              <span
                className="es-gc"
                data-sq="check"
                data-sq-border="dashed"
                data-sq-stroke-w="1.5"
              />
              <span className="es-ga" />
              <span className="es-gl">
                <span className="es-gl-bar" style={{ width: `${primaryBarW}px` }} />
                <span
                  className="es-gl-bar es-gl-bar--sub"
                  style={{ width: `${secondaryBarW}px` }}
                />
              </span>
              {trackCount >= 4 && <span className="es-gp" />}
              {trackCount === 6 && (
                <>
                  <span className="es-gd">
                    <span className="es-gd-bar" />
                    <span className="es-gd-bar es-gd-bar--sub" />
                  </span>
                  <span className="es-gb" />
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [variant, rowCount, trackCount]);

  const Heading = titleAs;
  const isError = tone === 'error';
  const liveRoleProps = isError
    ? { role: 'alert' as const }
    : { role: 'status' as const, 'aria-live': 'polite' as const };

  const tileContent = (
    <span className={`es-tile ${variant === 'compact' ? 'es-tile--compact' : ''}`}>
      <span
        className="es-tile-surface"
        aria-hidden="true"
        data-sq={variant === 'compact' ? 'tile' : 'tile-lg'}
        data-sq-border="solid"
      />
      <span className="es-tile-icon" aria-hidden="true">
        {icon}
      </span>
      {tone !== 'neutral' && (
        <span className={`es-dot es-dot--${tone}`} aria-hidden="true" />
      )}
    </span>
  );

  if (variant === 'compact') {
    const singleAction = primaryAction ?? secondaryAction;
    const singleKind: 'primary' | 'secondary' = primaryAction ? 'primary' : 'secondary';

    return (
      <div
        ref={rootRef}
        className={['es-compact-root', className].filter(Boolean).join(' ')}
      >
        <div
          className="es-compact"
          data-sq="empty"
          data-sq-border="dashed"
          data-sq-stroke-w="1.5"
          {...liveRoleProps}
        >
          {tileContent}
          <Heading className="es-title">{title}</Heading>
          {description && <p className="es-desc">{description}</p>}
          {singleAction && (
            <div className="es-actions">
              {renderActionButton(singleAction, singleKind, true, primaryAction ? primaryRef : undefined)}
            </div>
          )}
          {hint && <p className="es-hint">{hint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      data-es-hero={width >= 500 ? 'true' : undefined}
      data-es-tracks={trackCount}
      className={['es-root', className].filter(Boolean).join(' ')}
    >
      {ghostRowElements}

      <div
        className="es-island"
        data-sq="panel"
        data-sq-border="solid"
        style={{ '--es-width': `${width}px` } as React.CSSProperties}
        {...liveRoleProps}
      >
        {tileContent}
        <Heading className="es-title">{title}</Heading>
        {description && <p className="es-desc">{description}</p>}
        {(primaryAction || secondaryAction) && (
          <div className="es-actions">
            {primaryAction && renderActionButton(primaryAction, 'primary', false, primaryRef)}
            {secondaryAction && renderActionButton(secondaryAction, 'secondary', false)}
          </div>
        )}
        {hint && <p className="es-hint">{hint}</p>}
      </div>
    </div>
  );
};

export const EmptyState = React.memo(EmptyStateInner);
EmptyState.displayName = 'EmptyState';

export default EmptyState;
