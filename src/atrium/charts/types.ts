export type ChartLocale = 'fr' | 'en' | 'ar';
export type ChartSurface = 'auto' | 'light' | 'dark';
export type ChartState = 'ready' | 'loading' | 'empty' | 'error';
export type ChartValueFormat = 'number' | 'currency' | 'percent' | 'duration';

export type ChartSkeletonKind =
  | 'kpi'
  | 'bars'
  | 'donut'
  | 'area'
  | 'gauge'
  | 'matrix'
  | 'radar'
  | 'list'
  | 'waffle'
  | 'timeline'
  | 'funnel'
  | 'treemap'
  | 'scatter';

export interface ChartCommonProps {
  title: string;
  subtitle?: string;
  helpText?: string;
  locale?: ChartLocale;
  surface?: ChartSurface;
  /** Keep dark card border crisp when placed inline inside a light grid (.dk parity) */
  inlineDark?: boolean;
  state?: ChartState;
  errorMessage?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  className?: string;
  'data-testid'?: string;
}

export interface SparkPoint {
  label: string;
  value: number;
  previous?: number;
}

export interface KpiSparkCardProps extends ChartCommonProps {
  value: number;
  previousValue?: number;
  deltaPercent?: number;
  deltaLabel?: string;
  higherIsBetter?: boolean;
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
  compactAbove?: number;
  rangeLabel?: string;
  series: SparkPoint[];
  minLabel?: string;
  maxLabel?: string;
}

export interface StackedSeries {
  id: string;
  label: string;
  color?: string;
}

export interface StackedBucket {
  label: string;
  shortLabel?: string;
  values: Record<string, number>;
  cancelled?: number;
}

export interface StackedPeriod {
  id: string;
  label: string;
  headlineValue?: number;
  deltaPercent?: number;
  buckets: StackedBucket[];
}

export interface StackedBarChartProps extends ChartCommonProps {
  series: StackedSeries[];
  buckets?: StackedBucket[];
  periods?: StackedPeriod[];
  activePeriodId?: string;
  onPeriodChange?: (periodId: string) => void;
  cancelledLabel?: string;
  showAverage?: boolean;
  averageLabel?: string;
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
}

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps extends ChartCommonProps {
  segments: DonutSegment[];
  centerFormat?: 'percent' | 'value';
  totalLabel?: string;
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
  maxSlices?: number;
  otherLabel?: string;
}

export interface AreaPoint {
  label: string;
  value: number;
  previous?: number;
}

export interface AreaRange {
  id: string;
  label: string;
  points: AreaPoint[];
}

export interface AreaTrendChartProps extends ChartCommonProps {
  points?: AreaPoint[];
  ranges?: AreaRange[];
  activeRangeId?: string;
  onRangeChange?: (rangeId: string) => void;
  currentLabel?: string;
  previousLabel?: string;
  averageLabel?: string;
  peakLabel?: string;
  showAverage?: boolean;
  showPeak?: boolean;
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
}

export interface GaugeMetric {
  id: string;
  label: string;
  value: number;
  delta?: number;
  target?: number;
  targetLabel?: string;
  unit?: string;
}

export interface RadialGaugeProps extends ChartCommonProps {
  metrics: GaugeMetric[];
  activeMetricId?: string;
  onMetricChange?: (metricId: string) => void;
}

export interface HourlyHeatmapProps extends ChartCommonProps {
  rows: string[];
  cols: string[];
  /** Matrix [rowIndex][colIndex] */
  cells: number[][];
  unit?: string;
  format?: ChartValueFormat;
  lowLabel?: string;
  highLabel?: string;
  peakLabel?: string;
}

export interface RadarAxis {
  id: string;
  label: string;
  value: number;
  benchmark?: number;
}

export interface RadarBalanceChartProps extends ChartCommonProps {
  axes: RadarAxis[];
  primaryLabel?: string;
  benchmarkLabel?: string;
  unit?: string;
}

export interface RankedCriterion {
  id: string;
  label: string;
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
}

export interface RankedItem {
  id: string;
  label: string;
  values: Record<string, number>;
}

export interface RankedBarListProps extends ChartCommonProps {
  criteria: RankedCriterion[];
  items: RankedItem[];
  activeCriterionId?: string;
  onCriterionChange?: (criterionId: string) => void;
  maxVisible?: number;
}

export interface CapacityWaffleProps extends ChartCommonProps {
  occupied: number;
  capacity?: number;
  occupiedLabel?: string;
  availableLabel?: string;
  unitLabel?: string;
}

export interface TimelineResource {
  id: string;
  label: string;
  meta?: string;
}

export type TimelineTone = 'primary' | 'secondary' | 'neutral';

export interface TimelineBlock {
  id: string;
  resourceId: string;
  label: string;
  startHour: number;
  endHour: number;
  tone?: TimelineTone;
  statusLabel?: string;
}

export interface ResourceTimelineProps extends ChartCommonProps {
  resources: TimelineResource[];
  blocks: TimelineBlock[];
  startHour: number;
  endHour: number;
  nowHour?: number;
  nowLabel?: string;
  maxVisibleResources?: number;
}

export interface FunnelStage {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface ConversionFunnelProps extends ChartCommonProps {
  stages: FunnelStage[];
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
  conversionLabel?: string;
  stepLabel?: string;
}

export interface WaterfallStep {
  id: string;
  label: string;
  value: number;
  kind: 'total' | 'delta';
}

export interface WaterfallChartProps extends ChartCommonProps {
  steps: WaterfallStep[];
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
  shareBasisIndex?: number;
}

export interface CohortRow {
  label: string;
  values: Array<number | null | undefined>;
}

export interface CohortHeatmapProps extends ChartCommonProps {
  cohorts: CohortRow[];
  columnPrefix?: string;
  unit?: string;
}

export interface BubbleGroup {
  id: string;
  label: string;
  color?: string;
}

export interface BubblePoint {
  id: string;
  label: string;
  groupId: string;
  x: number;
  y: number;
  size: number;
}

export interface BubbleScatterChartProps extends ChartCommonProps {
  groups: BubbleGroup[];
  points: BubblePoint[];
  xAxisLabel?: string;
  yFormat?: ChartValueFormat;
  xFormat?: ChartValueFormat;
  sizeFormat?: ChartValueFormat;
  currency?: string;
  xUnit?: string;
  yUnit?: string;
  sizeUnit?: string;
}

export interface BulletItem {
  id?: string;
  label: string;
  value: number;
  target?: number;
}

export interface BulletChartProps extends ChartCommonProps {
  items: BulletItem[];
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
  achievedLabel?: string;
  actualLegendLabel?: string;
  targetLegendLabel?: string;
}

export interface TreemapItem {
  id?: string;
  label: string;
  value: number;
  color?: string;
}

export interface SquarifiedTreemapProps extends ChartCommonProps {
  items: TreemapItem[];
  ratio?: number;
  variant?: 'squarified' | 'split';
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
}

export interface HistogramBin {
  id?: string;
  label: string;
  value: number;
}

export interface HistogramChartProps extends ChartCommonProps {
  bins: HistogramBin[];
  highlightIndex?: number;
  showMedian?: boolean;
  medianLabel?: string;
  totalLabel?: string;
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
}

export interface DumbbellItem {
  id?: string;
  label: string;
  prev: number;
  value: number;
}

export interface DumbbellChartProps extends ChartCommonProps {
  items: DumbbellItem[];
  prevLabel?: string;
  currentLabel?: string;
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
  deltaUnit?: string;
  higherIsBetter?: boolean;
}
