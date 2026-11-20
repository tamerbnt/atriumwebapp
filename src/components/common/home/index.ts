export {
  HomeShell,
  HomePodGrid,
  HomeCardsGrid,
  useHomeRole,
  HOME_POD_PULSE_CLASS,
  HOME_POD_DIRECTORY_CLASS,
  HOME_POD_HISTORIQUE_CLASS,
} from './HomeShell';
export type { HomeShellProps, HomePodGridProps, HomeCardsGridProps } from './HomeShell';

export { HomeHeroRow } from './HomeHeroRow';
export type { HomeHeroRowProps } from './HomeHeroRow';

export { HomeOperationalRow } from './HomeOperationalRow';
export type { HomeOperationalRowProps } from './HomeOperationalRow';

export { HomeKineticEventRow } from './HomeKineticEventRow';
export type { HomeKineticEventRowProps } from './HomeKineticEventRow';

export { HomeLiveHistoryPod } from './HomeLiveHistoryPod';
export type { HomeLiveHistoryPodProps } from './HomeLiveHistoryPod';

export { HomeSetupPod } from './HomeSetupPod';
export type { HomeSetupPodProps } from './HomeSetupPod';

export { HomePreviewCard, HomeCompactStrip } from './HomePreviewCard';
export type { HomePreviewCardProps, HomeCompactStripProps } from './HomePreviewCard';

export { HomeKioskCard } from './HomeKioskCard';
export type { HomeKioskCardProps } from './HomeKioskCard';

export { HomeAnchorCard } from './HomeAnchorCard';
export type { HomeAnchorCardProps } from './HomeAnchorCard';

export type {
  HomeColumnRatio,
  HomeCardTone,
  HomeRowStatusTone,
  HomeHistoriqueTone,
  HomeHistoriqueDetailPair,
  HomeHistoriqueAction,
  HomeDailyEvent,
  HomeHistoriqueFilterOption,
  HomePreviewRow,
  HomePreviewCardConfig,
  HomeCompactStripConfig,
  HomeQuickAction,
  HomeKioskConfig,
  HomeAnchorMetricConfig,
} from './homeTypes';

export {
  l3,
  getTimeGreeting,
  extractFirstName,
  CATEGORY_HOME_RATIO,
  getCategoryHomeTitle,
  getHomeRoleDisplayLabel,
  getHomeStrings,
} from './homeLocalization';
