import React, { Profiler, useMemo, useRef, useState } from 'react';
import {
  AreaTrendChart,
  BulletChart,
  BubbleScatterChart,
  CapacityWaffle,
  ChartLocale,
  ChartState,
  CohortHeatmap,
  ConversionFunnel,
  DonutChart,
  DumbbellChart,
  HistogramChart,
  HourlyHeatmap,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadarBalanceChart,
  RankedBarList,
  RadialGauge,
  ResourceTimeline,
  SquarifiedTreemap,
  StackedBarChart,
  WaterfallChart,
} from '@/atrium';
import { buildCatalogFixtures, CatalogStressPreset } from './catalogFixtures';

type PreviewWidth = 'fluid' | 1440 | 768 | 320;
type PreviewTheme = 'light' | 'dark';

export const DashboardCatalogScreen: React.FC = () => {
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('light');
  const [cardState, setCardState] = useState<ChartState>('ready');
  const [preset, setPreset] = useState<CatalogStressPreset>('nominal');
  const [width, setWidth] = useState<PreviewWidth>('fluid');
  const [locale, setLocale] = useState<ChartLocale>('fr');
  const [treemapRatio, setTreemapRatio] = useState<number>(1.618);
  const [treemapVariant, setTreemapVariant] = useState<'squarified' | 'split'>('squarified');
  const [perfStats, setPerfStats] = useState<{ lastMs: number; maxMs: number; commits: number }>({
    lastMs: 0,
    maxMs: 0,
    commits: 0,
  });

  const fixtures = useMemo(() => buildCatalogFixtures(preset, locale), [preset, locale]);
  const lastReportRef = useRef(0);

  const handleProfile: React.ProfilerOnRenderCallback = (
    _id,
    _phase,
    actualDuration
  ) => {
    const now = performance.now();
    if (now - lastReportRef.current < 120 && perfStats.commits > 0) return;
    lastReportRef.current = now;
    setPerfStats((prev) => ({
      lastMs: Number(actualDuration.toFixed(2)),
      maxMs: Number(Math.max(prev.maxMs, actualDuration).toFixed(2)),
      commits: prev.commits + 1,
    }));
  };

  const containerStyle: React.CSSProperties =
    width === 'fluid'
      ? { width: '100%' }
      : {
          width: `${width}px`,
          maxWidth: '100%',
          marginInline: 'auto',
          border: '1px dashed var(--ax-bdr)',
        };

  const isCompact320 = width === 320;
  const gridColsClass =
    width === 320
      ? 'grid-cols-1'
      : width === 768
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <div
      data-atrium-theme={previewTheme}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`ax-scope min-h-full rounded-[24px] p-4 sm:p-6 transition-colors ${
        previewTheme === 'dark' ? 'bg-[#0E0D0C] text-[#F4EDE6]' : 'bg-[#F7F4F1] text-[#0A0A0A]'
      }`}
    >
      {/* Dev Catalog Control Bar */}
      <div className="mb-6 rounded-[20px] border border-[var(--ax-bdr)] bg-[var(--ax-slab)] p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-[var(--ax-c1)] text-[var(--ax-tc1)]">
                DEV CATALOG · PHASE 1
              </span>
              <h1 className="text-lg font-bold tracking-tight">
                Atrium Dashboard Components (19/19)
              </h1>
            </div>
            <p className="text-xs text-[var(--ax-sub)] mt-0.5">
              Composants dashboard parity test · states, RTL, container widths &amp; live React Profiler render timing
            </p>
          </div>

          <div className="ax-mono text-[11px] px-3 py-1.5 rounded-xl bg-[var(--ax-soft)] flex items-center gap-3">
            <span>Last batch: <strong>{perfStats.lastMs} ms</strong></span>
            <span>Peak: <strong>{perfStats.maxMs} ms</strong></span>
            <span>Per-card avg: <strong>{(perfStats.lastMs / 19).toFixed(2)} ms</strong></span>
          </div>
        </div>

        {/* Interactive Switchers */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Theme */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--ax-soft)]">
            {(['light', 'dark'] as PreviewTheme[]).map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => setPreviewTheme(th)}
                className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                  previewTheme === th ? 'bg-[var(--ax-th)] shadow-xs' : 'opacity-70'
                }`}
              >
                {th === 'light' ? 'Clair (#F7F4F1)' : 'Sombre (#0E0D0C)'}
              </button>
            ))}
          </div>

          {/* State */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--ax-soft)]">
            {(['ready', 'loading', 'empty', 'error'] as ChartState[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setCardState(st)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer ${
                  cardState === st ? 'bg-[var(--ax-th)] shadow-xs' : 'opacity-70'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Data Stress */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--ax-soft)]">
            {(['nominal', 'partial', 'extreme', 'zeros'] as CatalogStressPreset[]).map((pr) => (
              <button
                key={pr}
                type="button"
                onClick={() => setPreset(pr)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer ${
                  preset === pr ? 'bg-[var(--ax-th)] shadow-xs' : 'opacity-70'
                }`}
              >
                {pr}
              </button>
            ))}
          </div>

          {/* Viewport Simulator */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--ax-soft)]">
            {(['fluid', 1440, 768, 320] as PreviewWidth[]).map((w) => (
              <button
                key={String(w)}
                type="button"
                onClick={() => setWidth(w)}
                className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                  width === w ? 'bg-[var(--ax-th)] shadow-xs' : 'opacity-70'
                }`}
              >
                {w === 'fluid' ? 'Fluid' : `${w}px`}
              </button>
            ))}
          </div>

          {/* Locale / RTL */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--ax-soft)]">
            {(['fr', 'en', 'ar'] as ChartLocale[]).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocale(loc)}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase cursor-pointer ${
                  locale === loc ? 'bg-[var(--ax-th)] shadow-xs' : 'opacity-70'
                }`}
              >
                {loc === 'ar' ? 'AR (RTL)' : loc}
              </button>
            ))}
          </div>

          {/* Treemap Controls */}
          <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[var(--ax-soft)]">
            <span>Treemap φ: {treemapRatio.toFixed(2)}</span>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.1"
              value={treemapRatio}
              onChange={(e) => setTreemapRatio(Number(e.target.value))}
              className="w-20 accent-[#D4522F]"
            />
          </label>

          <button
            type="button"
            onClick={() =>
              setTreemapVariant((v) => (v === 'squarified' ? 'split' : 'squarified'))
            }
            className="px-2.5 py-1 rounded-xl bg-[var(--ax-soft)] font-semibold cursor-pointer"
          >
            Treemap: {treemapVariant}
          </button>
        </div>
      </div>

      {/* All 19 Components Showcase */}
      <Profiler id="atrium-chart-catalog" onRender={handleProfile}>
        <div
          style={containerStyle}
          className={`grid ${gridColsClass} gap-4 rounded-[20px] ${
            width !== 'fluid' ? 'p-3' : ''
          }`}
        >
          {/* #1 KPI Spark Card */}
          <KpiSparkCard
            {...fixtures.kpiPositive}
            locale={locale}
            state={cardState}
            format="currency"
            currency="DZD"
            onRetry={() => setCardState('ready')}
          />

          {/* #2 Dark Inverse KPI Card */}
          <KpiMetricInverseCard
            {...fixtures.kpiInverse}
            locale={locale}
            state={cardState}
            format="percent"
            onRetry={() => setCardState('ready')}
          />

          {/* #6 Radial Gauge */}
          <RadialGauge
            {...fixtures.radialGauge}
            locale={locale}
            surface={previewTheme === 'light' ? 'dark' : 'auto'}
            inlineDark={previewTheme === 'light'}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #3 Stacked Bar Chart */}
          <div className={isCompact320 ? '' : 'md:col-span-2'}>
            <StackedBarChart
              {...fixtures.stackedBar}
              locale={locale}
              state={cardState}
              format="currency"
              currency="DZD"
              onRetry={() => setCardState('ready')}
            />
          </div>

          {/* #4 Donut Chart */}
          <DonutChart
            {...fixtures.donut}
            locale={locale}
            state={cardState}
            format="currency"
            currency="DZD"
            onRetry={() => setCardState('ready')}
          />

          {/* #5 Area Trend Chart */}
          <div className={isCompact320 ? '' : 'md:col-span-2'}>
            <AreaTrendChart
              {...fixtures.areaTrend}
              locale={locale}
              state={cardState}
              format="currency"
              currency="DZD"
              onRetry={() => setCardState('ready')}
            />
          </div>

          {/* #10 Capacity Waffle */}
          <CapacityWaffle
            {...fixtures.waffle}
            locale={locale}
            surface={previewTheme === 'light' ? 'dark' : 'auto'}
            inlineDark={previewTheme === 'light'}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #7 Hourly Heatmap */}
          <HourlyHeatmap
            {...fixtures.heatmap}
            locale={locale}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #8 Radar Balance Chart */}
          <RadarBalanceChart
            {...fixtures.radar}
            locale={locale}
            surface={previewTheme === 'light' ? 'dark' : 'auto'}
            inlineDark={previewTheme === 'light'}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #9 Ranked Bar List */}
          <RankedBarList
            {...fixtures.ranked}
            locale={locale}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #11 Resource Timeline */}
          <div className={isCompact320 ? '' : 'md:col-span-2'}>
            <ResourceTimeline
              {...fixtures.timeline}
              locale={locale}
              state={cardState}
              onRetry={() => setCardState('ready')}
            />
          </div>

          {/* #12 Conversion Funnel */}
          <ConversionFunnel
            {...fixtures.funnel}
            locale={locale}
            surface={previewTheme === 'light' ? 'dark' : 'auto'}
            inlineDark={previewTheme === 'light'}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #13 Waterfall Chart */}
          <WaterfallChart
            {...fixtures.waterfall}
            locale={locale}
            surface={previewTheme === 'light' ? 'dark' : 'auto'}
            inlineDark={previewTheme === 'light'}
            state={cardState}
            format="currency"
            currency="DZD"
            onRetry={() => setCardState('ready')}
          />

          {/* #14 Cohort Heatmap */}
          <CohortHeatmap
            {...fixtures.cohort}
            locale={locale}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #15 Bubble Scatter Chart */}
          <BubbleScatterChart
            {...fixtures.bubble}
            locale={locale}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #16 Bullet Chart */}
          <BulletChart
            {...fixtures.bullet}
            locale={locale}
            state={cardState}
            format="currency"
            currency="DZD"
            onRetry={() => setCardState('ready')}
          />

          {/* #17 Squarified Treemap */}
          <SquarifiedTreemap
            {...fixtures.treemap}
            ratio={treemapRatio}
            variant={treemapVariant}
            locale={locale}
            state={cardState}
            format="currency"
            currency="DZD"
            onRetry={() => setCardState('ready')}
          />

          {/* #18 Histogram Chart */}
          <HistogramChart
            {...fixtures.histogram}
            locale={locale}
            state={cardState}
            onRetry={() => setCardState('ready')}
          />

          {/* #19 Dumbbell Chart */}
          <div className={isCompact320 ? '' : 'md:col-span-2 xl:col-span-1'}>
            <DumbbellChart
              {...fixtures.dumbbell}
              locale={locale}
              state={cardState}
              format="currency"
              currency="DZD"
              onRetry={() => setCardState('ready')}
            />
          </div>
        </div>
      </Profiler>
    </div>
  );
};

export default DashboardCatalogScreen;
