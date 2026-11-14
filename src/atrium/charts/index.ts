export * from './types';
export {
  formatChartValue,
  formatCompactTick,
  niceScale,
  smoothSplinePath,
  computeSquarifiedTreemap,
  computeMedianBucketIndex,
  getDefaultChartStrings,
  resolveLocaleTag,
} from './math';
export {
  useInViewReveal,
  useChartKeyboardScrub,
  useIsRtl,
  prefersReducedMotion,
} from './hooks';

// Primitives
export { ChartCard } from './primitives/ChartCard';
export type { ChartCardProps } from './primitives/ChartCard';
export { ChartInfoPopover } from './primitives/ChartInfoPopover';
export type { ChartInfoPopoverProps } from './primitives/ChartInfoPopover';
export { RollingDigits } from './primitives/RollingDigits';
export type { RollingDigitsProps } from './primitives/RollingDigits';
export { ChartSegmented } from './primitives/ChartSegmented';
export type { ChartSegmentedProps, ChartSegmentedOption } from './primitives/ChartSegmented';

// 19 Dashboard Visualization Components
export { KpiSparkCard } from './series/KpiSparkCard';
export { KpiMetricInverseCard } from './series/KpiMetricInverseCard';
export { StackedBarChart } from './series/StackedBarChart';
export { DonutChart } from './series/DonutChart';
export { AreaTrendChart } from './series/AreaTrendChart';
export { RadialGauge } from './series/RadialGauge';

export { HourlyHeatmap } from './matrix/HourlyHeatmap';
export { RadarBalanceChart } from './matrix/RadarBalanceChart';
export { RankedBarList } from './matrix/RankedBarList';
export { CapacityWaffle } from './matrix/CapacityWaffle';
export { ResourceTimeline } from './matrix/ResourceTimeline';
export { ConversionFunnel } from './matrix/ConversionFunnel';
export { WaterfallChart } from './matrix/WaterfallChart';
export { CohortHeatmap } from './matrix/CohortHeatmap';
export { BubbleScatterChart } from './matrix/BubbleScatterChart';

export { BulletChart } from './analytical/BulletChart';
export { SquarifiedTreemap } from './analytical/SquarifiedTreemap';
export { HistogramChart } from './analytical/HistogramChart';
export { DumbbellChart } from './analytical/DumbbellChart';
