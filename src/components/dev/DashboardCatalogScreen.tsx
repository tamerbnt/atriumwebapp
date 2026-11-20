import React, { Profiler, useMemo, useRef, useState } from 'react';
import {
  AreaTrendChart,
  BulletChart,
  BubbleScatterChart,
  CapacityWaffle,
  ChartLocale,
  ChartSegmented,
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
  const commitsRef = useRef(0);

  const handleProfile: React.ProfilerOnRenderCallback = (
    _id,
    _phase,
    actualDuration
  ) => {
    const now = performance.now();
    if (now - lastReportRef.current < 350 && commitsRef.current > 0) return;
    lastReportRef.current = now;
    commitsRef.current += 1;
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
      className={`ax-scope min-h-full rounded-[var(--r-panel,28px)] p-[var(--s4,16px)] sm:p-[var(--container-pad,24px)] flex flex-col gap-[var(--s6,24px)] transition-colors ${
        previewTheme === 'dark' ? 'bg-[#0E0D0C] text-[#F4EDE6]' : 'bg-[#F7F4F1] text-[#0A0A0A]'
      }`}
    >
      {/* Dev Catalog Control Bar */}
      <div
        data-sq="table"
        data-sq-border="solid"
        className="border border-[var(--ax-bdr)] [--sq-stroke:var(--ax-bdr)] bg-[var(--ax-slab)] p-[var(--s4,16px)] flex flex-col gap-[var(--s3,12px)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-[var(--s3,12px)]">
          <div className="flex flex-col gap-[var(--s1,4px)]">
            <div className="flex items-center gap-[var(--s2,8px)]">
              <span className="inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold bg-[var(--ax-c1)] text-[var(--ax-tc1)]">
                Dev catalog · Phase 1
              </span>
              <h2 className="t-pod">
                Atrium Dashboard Components (19/19)
              </h2>
            </div>
            <p className="t-cap text-[var(--ax-sub)]">
              Composants dashboard parity test · states, RTL, container widths &amp; live React Profiler render timing
            </p>
          </div>

          <div
            data-sq="ctl"
            data-sq-border="none"
            className="t-small tabular-nums px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[var(--ax-soft)] flex items-center gap-[var(--s3,12px)]"
          >
            <span>Last batch: <span className="font-semibold">{perfStats.lastMs} ms</span></span>
            <span>Peak: <span className="font-semibold">{perfStats.maxMs} ms</span></span>
            <span>Per-card avg: <span className="font-semibold">{(perfStats.lastMs / 19).toFixed(2)} ms</span></span>
          </div>
        </div>

        {/* Interactive Branded Switchers */}
        <div className="flex flex-wrap items-center gap-[var(--s3,12px)] t-small">
          <ChartSegmented
            ariaLabel="Theme"
            value={previewTheme}
            onChange={(v) => setPreviewTheme(v as PreviewTheme)}
            options={[
              { id: 'light', label: 'Clair' },
              { id: 'dark', label: 'Sombre' },
            ]}
          />

          <ChartSegmented
            ariaLabel="Card State"
            value={cardState}
            onChange={(v) => setCardState(v as ChartState)}
            options={[
              { id: 'ready', label: 'Ready' },
              { id: 'loading', label: 'Loading' },
              { id: 'empty', label: 'Empty' },
              { id: 'error', label: 'Error' },
            ]}
          />

          <ChartSegmented
            ariaLabel="Stress Preset"
            value={preset}
            onChange={(v) => setPreset(v as CatalogStressPreset)}
            options={[
              { id: 'nominal', label: 'Nominal' },
              { id: 'partial', label: 'Partial' },
              { id: 'extreme', label: 'Extreme' },
              { id: 'zeros', label: 'Zeros' },
            ]}
          />

          <ChartSegmented
            ariaLabel="Viewport Width"
            value={String(width)}
            onChange={(v) => setWidth(v === 'fluid' ? 'fluid' : (Number(v) as PreviewWidth))}
            options={[
              { id: 'fluid', label: 'Fluid' },
              { id: '1440', label: '1440px' },
              { id: '768', label: '768px' },
              { id: '320', label: '320px' },
            ]}
          />

          <ChartSegmented
            ariaLabel="Locale"
            value={locale}
            onChange={(v) => setLocale(v as ChartLocale)}
            options={[
              { id: 'fr', label: 'FR' },
              { id: 'en', label: 'EN' },
              { id: 'ar', label: 'AR (RTL)' },
            ]}
          />

          {/* Treemap Controls */}
          <label
            data-sq="ctl-sm"
            data-sq-border="none"
            className="inline-flex items-center gap-[var(--s2,8px)] h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] bg-[var(--ax-soft)] text-[var(--ax-on)] tabular-nums"
          >
            <span>Treemap φ: {treemapRatio.toFixed(2)}</span>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.1"
              value={treemapRatio}
              onChange={(e) => setTreemapRatio(Number(e.target.value))}
              className="w-20 accent-[var(--brand-accent,#D9532B)]"
            />
          </label>

          <button
            type="button"
            data-no-liquid="true"
            data-sq="ctl-sm"
            data-sq-border="none"
            onClick={() =>
              setTreemapVariant((v) => (v === 'squarified' ? 'split' : 'squarified'))
            }
            className="h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] bg-[var(--ax-soft)] text-[var(--ax-on)] t-btn cursor-pointer"
          >
            Treemap: {treemapVariant}
          </button>
        </div>
      </div>

      {/* All 19 Components Showcase */}
      <Profiler id="atrium-chart-catalog" onRender={handleProfile}>
        <div
          style={containerStyle}
          data-sq={width !== 'fluid' ? 'table' : undefined}
          data-sq-border={width !== 'fluid' ? 'dashed' : undefined}
          className={`grid ${gridColsClass} gap-[var(--card-gap,12px)] ${
            width !== 'fluid' ? 'p-[var(--pod-pad,12px)] [--sq-stroke:var(--ax-bdr)]' : ''
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
