export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
export type Side = 'down' | 'up';

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Where to put a floating panel (viewport coordinates, for position: fixed).
 * Flips to the other side when the preferred one is too tight and the other has more room,
 * and keeps the panel inside the viewport horizontally. No dependencies.
 */
export function computePosition(
  anchor: RectLike,
  panelW: number,
  panelH: number,
  placement: Placement,
  gap: number,
  viewport: Viewport,
  pad = 8,
): { top: number; left: number; side: Side } {
  const below = viewport.height - anchor.bottom - gap - pad;
  const above = anchor.top - gap - pad;
  let down = placement.startsWith('bottom');
  if (down && panelH > below && above > below) down = false;
  else if (!down && panelH > above && below > above) down = true;

  let left = placement.endsWith('end') ? anchor.right - panelW : anchor.left;
  left = Math.min(Math.max(pad, left), Math.max(pad, viewport.width - panelW - pad));
  const top = down ? anchor.bottom + gap : anchor.top - gap - panelH;
  return { top, left, side: down ? 'down' : 'up' };
}
