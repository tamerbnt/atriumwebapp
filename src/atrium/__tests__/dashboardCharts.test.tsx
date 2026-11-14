import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AreaTrendChart,
  BulletChart,
  BubbleScatterChart,
  CapacityWaffle,
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
  computeMedianBucketIndex,
  computeSquarifiedTreemap,
  formatChartValue,
  formatCompactTick,
  niceScale,
  smoothSplinePath,
} from '../charts';

describe('ChartMath pure solvers & formatting', () => {
  it('niceScale handles zeros, negatives, equal bounds, and huge numbers', () => {
    const zero = niceScale(0, 0, 5);
    expect(zero.min).toBe(0);
    expect(zero.max).toBeGreaterThan(0);
    expect(zero.ticks.length).toBeGreaterThanOrEqual(2);

    const neg = niceScale(-450, 820, 5);
    expect(neg.min).toBeLessThanOrEqual(-450);
    expect(neg.max).toBeGreaterThanOrEqual(820);
    expect(neg.ticks).toContain(0);

    const eq = niceScale(500, 500, 4);
    expect(eq.max).toBeGreaterThan(500);

    const huge = niceScale(0, 4_200_000_000, 5);
    expect(huge.max).toBeGreaterThanOrEqual(4_200_000_000);
    expect(huge.ticks.every(Number.isFinite)).toBe(true);
  });

  it('formatChartValue formats fr/en/ar currencies, percent, duration, and compact values', () => {
    const cur = formatChartValue(2_500_000, { locale: 'fr', format: 'currency', currency: 'DZD' });
    expect(cur).toContain('M');
    expect(cur).toContain('DZD');

    expect(formatChartValue(14.5, { locale: 'en', format: 'percent', signed: true })).toBe('+14.5%');
    expect(formatChartValue(95, { locale: 'fr', format: 'duration' })).toBe('1h35');
    expect(formatCompactTick(1_500_000_000, 'fr')).toContain('Md');
    expect(formatChartValue(Number.NaN)).toBe('—');
  });

  it('smoothSplinePath clamps single/pair/multi points cleanly without NaN', () => {
    expect(smoothSplinePath([])).toBe('');
    expect(smoothSplinePath([{ x: 10, y: 20 }])).toBe('M 10.00 20.00');
    expect(smoothSplinePath([{ x: 0, y: 10 }, { x: 50, y: 40 }])).toContain('L 50.00 40.00');
    const curve = smoothSplinePath([
      { x: 0, y: 10 },
      { x: 50, y: 40 },
      { x: 100, y: 10 },
      { x: 150, y: 60 },
    ]);
    expect(curve).toContain('C ');
    expect(curve).not.toContain('NaN');
  });

  it('computeSquarifiedTreemap preserves full area and filters <= 0 items', () => {
    const rects = computeSquarifiedTreemap(
      [
        { label: 'A', value: 60 },
        { label: 'B', value: 30 },
        { label: 'C', value: 10 },
        { label: 'Zero', value: 0 },
        { label: 'Neg', value: -15 },
      ],
      100,
      100,
      1.618
    );
    expect(rects).toHaveLength(3);
    const totalArea = rects.reduce((s, r) => s + r.w * r.h, 0);
    expect(totalArea).toBeCloseTo(10000, 3);
    expect(rects.reduce((s, r) => s + r.share, 0)).toBeCloseTo(100, 3);
  });

  it('computeMedianBucketIndex picks cumulative 50% bucket accurately', () => {
    const idx = computeMedianBucketIndex([
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
      { label: 'C', value: 50 },
      { label: 'D', value: 20 },
    ]);
    expect(idx).toBe(2);
    expect(computeMedianBucketIndex([])).toBe(-1);
  });

  it('meets < 0.5 ms pure math budget across scale, spline, and 40-item treemap', () => {
    const items = Array.from({ length: 40 }).map((_, i) => ({
      label: `Catégorie ${i}`,
      value: 10000 - i * 190,
    }));
    const pts = Array.from({ length: 30 }).map((_, i) => ({
      x: i * 10,
      y: Math.sin(i) * 50 + 60,
    }));

    const t0 = performance.now();
    for (let k = 0; k < 50; k++) {
      niceScale(0, 12345678, 5);
      smoothSplinePath(pts);
      computeSquarifiedTreemap(items, 100, 100, 1.618);
    }
    const avgMs = (performance.now() - t0) / 50;
    expect(avgMs).toBeLessThan(0.5);
  });
});

describe('All 19 Atrium dashboard components — render states, edge cases, ARIA & RTL', () => {
  it('renders all 19 components cleanly in ready state with descriptive aria-labels', () => {
    const html = renderToStaticMarkup(
      <div>
        <KpiSparkCard
          title="Revenus"
          helpText="Aide KPI"
          value={120000}
          deltaPercent={12.4}
          format="currency"
          series={[
            { label: 'S1', value: 50000, previous: 42000 },
            { label: 'S2', value: 70000, previous: 60000 },
          ]}
        />
        <KpiMetricInverseCard
          title="Churn"
          value={4.2}
          deltaPercent={-1.8}
          format="percent"
          series={[
            { label: 'J1', value: 6 },
            { label: 'J2', value: 4.2 },
          ]}
        />
        <StackedBarChart
          title="Canaux"
          series={[{ id: 'a', label: 'A' }]}
          buckets={[
            { label: 'Lun', values: { a: 100 }, cancelled: 15 },
            { label: 'Mar', values: { a: 200 }, cancelled: 0 },
          ]}
        />
        <DonutChart
          title="Mix"
          segments={[
            { id: 's1', label: 'Pro', value: 80 },
            { id: 's2', label: 'Base', value: 20 },
          ]}
        />
        <AreaTrendChart
          title="Tendance"
          points={[
            { label: 'Jan', value: 100, previous: 80 },
            { label: 'Fév', value: 150, previous: 110 },
          ]}
        />
        <RadialGauge
          title="Objectif"
          metrics={[{ id: 'm1', label: 'Taux', value: 78, target: 85 }]}
        />
        <HourlyHeatmap
          title="Heures"
          rows={['Lun', 'Mar']}
          cols={['08h', '10h']}
          cells={[
            [10, 40],
            [25, 15],
          ]}
        />
        <RadarBalanceChart
          title="Radar"
          axes={[
            { id: 'q', label: 'Qualité', value: 80, benchmark: 75 },
            { id: 'd', label: 'Délais', value: 70, benchmark: 75 },
            { id: 'm', label: 'Marge', value: 90, benchmark: 80 },
          ]}
        />
        <RankedBarList
          title="Classement"
          criteria={[{ id: 'rev', label: 'CA' }]}
          items={[
            { id: '1', label: 'Amira', values: { rev: 500 } },
            { id: '2', label: 'Karim', values: { rev: 300 } },
          ]}
        />
        <CapacityWaffle title="Capacité" occupied={64} capacity={100} />
        <ResourceTimeline
          title="Planning"
          resources={[{ id: 'r1', label: 'Salle 1' }]}
          blocks={[{ id: 'b1', resourceId: 'r1', label: 'Cours', startHour: 9, endHour: 11 }]}
          startHour={8}
          endHour={18}
          nowHour={12}
        />
        <ConversionFunnel
          title="Entonnoir"
          stages={[
            { id: 'f1', label: 'Leads', value: 100 },
            { id: 'f2', label: 'Inscrits', value: 45 },
          ]}
        />
        <WaterfallChart
          title="Pont Net"
          steps={[
            { id: 'w1', label: 'Brut', value: 1000, kind: 'total' },
            { id: 'w2', label: 'Frais', value: -350, kind: 'delta' },
            { id: 'w3', label: 'Net', value: 0, kind: 'total' },
          ]}
        />
        <CohortHeatmap
          title="Cohortes"
          cohorts={[
            { label: 'Jan', values: [100, 80, 65] },
            { label: 'Fév', values: [100, 85] },
          ]}
        />
        <BubbleScatterChart
          title="Segments"
          groups={[{ id: 'g1', label: 'VIP' }]}
          points={[{ id: 'p1', label: 'Client A', groupId: 'g1', x: 5, y: 12000, size: 50000 }]}
        />
        <BulletChart
          title="Cibles"
          items={[{ label: 'Pôle A', value: 95, target: 100 }]}
        />
        <SquarifiedTreemap
          title="Treemap"
          items={[
            { label: 'Cat 1', value: 70 },
            { label: 'Cat 2', value: 30 },
          ]}
        />
        <HistogramChart
          title="Distribution"
          bins={[
            { label: '0-10', value: 12 },
            { label: '10-20', value: 28 },
          ]}
        />
        <DumbbellChart
          title="Évolution"
          items={[{ label: 'Alger', prev: 40, value: 65 }]}
        />
      </div>
    );

    expect(html).toContain('Revenus');
    expect(html).toContain('Churn');
    expect(html).toContain('ax-es');
    expect(html).toContain('médiane');
    expect(html).toContain('pathLength="100"');
    expect(html).toContain('aria-label=');
  });

  it('omits optional overlays cleanly without crashing (no previous, no target, no benchmark, no nowHour)', () => {
    const html = renderToStaticMarkup(
      <div>
        <KpiSparkCard
          title="Partial KPI"
          value={500}
          series={[{ label: 'J1', value: 500 }]}
        />
        <RadarBalanceChart
          title="Partial Radar"
          axes={[
            { id: 'a', label: 'A', value: 50 },
            { id: 'b', label: 'B', value: 70 },
            { id: 'c', label: 'C', value: 90 },
          ]}
        />
        <BulletChart
          title="Partial Bullet"
          items={[{ label: 'Sans cible', value: 420 }]}
        />
        <ResourceTimeline
          title="No Now Hairline"
          resources={[{ id: 'r1', label: 'Box 1' }]}
          blocks={[]}
          startHour={8}
          endHour={16}
        />
      </div>
    );
    expect(html).toContain('Partial KPI');
    expect(html).toContain('Sans cible');
    expect(html).not.toContain('Objectif:');
  });

  it('renders loading, empty, error states and Arabic RTL correctly', () => {
    const html = renderToStaticMarkup(
      <div>
        <BulletChart title="Loading Bullet" items={[]} state="loading" />
        <DonutChart title="Empty Donut" segments={[]} state="ready" locale="ar" />
        <WaterfallChart
          title="Error Waterfall"
          steps={[]}
          state="error"
          errorMessage="Erreur réseau"
          onRetry={() => {}}
        />
      </div>
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Erreur réseau');
  });
});
