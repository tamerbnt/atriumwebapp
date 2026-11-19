export {
  EmptyState,
  computeGhostRowCount,
  resolveGhostTrackCount,
  GHOST_TRACK_TEMPLATES,
  GHOST_TEXT_BAR_WIDTHS,
} from './EmptyState';
export type { Tone, Action, EmptyStateProps } from './EmptyState';

export {
  resolveEmptyState,
  resolveCompactCheckinsEmptyState,
  resolveCompactInvoicesEmptyState,
  EMPTY_STATE_COPY,
  EMPTY_STATE_ICONS,
  interpolateCopy,
} from './presets';
export type {
  EmptyStateLocale,
  EmptyStateCopyKey,
  EmptyStateHandlers,
  EmptyStateContext,
} from './presets';
