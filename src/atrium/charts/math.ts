import { ChartLocale, ChartValueFormat, HistogramBin, TreemapItem } from './types';

const NUMBER_FORMATTERS = new Map<string, Intl.NumberFormat>();

function getFormatter(localeTag: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${localeTag}:${JSON.stringify(options)}`;
  let fmt = NUMBER_FORMATTERS.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(localeTag, options);
    NUMBER_FORMATTERS.set(key, fmt);
  }
  return fmt;
}

export function resolveLocaleTag(locale: ChartLocale = 'fr'): string {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-FR';
}

export interface FormatChartValueOptions {
  locale?: ChartLocale;
  format?: ChartValueFormat;
  currency?: string;
  unit?: string;
  compactAbove?: number;
  signed?: boolean;
  maximumFractionDigits?: number;
}

export function formatChartValue(
  raw: number,
  options: FormatChartValueOptions = {}
): string {
  const {
    locale = 'fr',
    format = 'number',
    currency = 'DZD',
    unit = '',
    compactAbove = 100_000,
    signed = false,
    maximumFractionDigits,
  } = options;

  if (!Number.isFinite(raw)) return '—';

  const sign = signed && raw > 0 ? '+' : raw < 0 ? '-' : '';
  const abs = Math.abs(raw);
  const tag = resolveLocaleTag(locale);

  if (format === 'percent') {
    const frac = maximumFractionDigits ?? (abs < 100 && abs % 1 !== 0 ? 1 : 0);
    const num = getFormatter(tag, {
      minimumFractionDigits: 0,
      maximumFractionDigits: frac,
    }).format(abs);
    return `${sign}${num}%`;
  }

  if (format === 'duration') {
    const mins = Math.round(abs);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${sign}${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
    }
    return `${sign}${mins} min`;
  }

  let formattedNumber: string;
  if (abs >= compactAbove) {
    if (abs >= 1_000_000_000) {
      formattedNumber = `${getFormatter(tag, { maximumFractionDigits: 1 }).format(abs / 1_000_000_000)} Md`;
    } else if (abs >= 1_000_000) {
      formattedNumber = `${getFormatter(tag, { maximumFractionDigits: 1 }).format(abs / 1_000_000)} M`;
    } else {
      formattedNumber = `${getFormatter(tag, { maximumFractionDigits: 1 }).format(abs / 1_000)} k`;
    }
  } else {
    const frac = maximumFractionDigits ?? (abs < 10 && abs % 1 !== 0 ? 1 : 0);
    formattedNumber = getFormatter(tag, {
      minimumFractionDigits: 0,
      maximumFractionDigits: frac,
    }).format(abs);
  }

  const suffix = unit
    ? ` ${unit}`
    : format === 'currency'
      ? ` ${currency}`
      : '';

  return `${sign}${formattedNumber}${suffix}`;
}

export function formatCompactTick(raw: number, locale: ChartLocale = 'fr'): string {
  if (!Number.isFinite(raw)) return '0';
  const sign = raw < 0 ? '-' : '';
  const abs = Math.abs(raw);
  const tag = resolveLocaleTag(locale);
  if (abs >= 1_000_000_000) {
    return `${sign}${getFormatter(tag, { maximumFractionDigits: 1 }).format(abs / 1_000_000_000)}Md`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${getFormatter(tag, { maximumFractionDigits: 1 }).format(abs / 1_000_000)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${getFormatter(tag, { maximumFractionDigits: 1 }).format(abs / 1_000)}k`;
  }
  return `${sign}${getFormatter(tag, { maximumFractionDigits: abs < 10 ? 1 : 0 }).format(abs)}`;
}

export interface NiceScaleResult {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

export function niceScale(minInput: number, maxInput: number, maxTicks = 5): NiceScaleResult {
  let lo = Number.isFinite(minInput) ? minInput : 0;
  let hi = Number.isFinite(maxInput) ? maxInput : 100;

  if (lo > hi) [lo, hi] = [hi, lo];
  if (lo === hi) {
    if (lo === 0) {
      hi = 10;
    } else {
      const pad = Math.abs(lo) * 0.25 || 1;
      lo = lo > 0 ? 0 : lo - pad;
      hi = hi > 0 ? hi + pad : 0;
    }
  }

  const range = hi - lo;
  const roughStep = range / Math.max(2, maxTicks - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / mag;

  let niceFactor = 1;
  if (norm <= 1) niceFactor = 1;
  else if (norm <= 2) niceFactor = 2;
  else if (norm <= 2.5) niceFactor = 2.5;
  else if (norm <= 5) niceFactor = 5;
  else niceFactor = 10;

  const step = niceFactor * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;

  const ticks: number[] = [];
  const count = Math.min(12, Math.max(2, Math.round((max - min) / step) + 1));
  for (let i = 0; i < count; i++) {
    const val = min + i * step;
    ticks.push(Math.abs(val) < 1e-10 ? 0 : Number(val.toPrecision(12)));
  }

  return { min, max, step, ticks };
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Smooth Catmull-Rom to cubic Bezier spline path with overshoot clamping,
 * keeping line tension crisp even with sharp spikes or zeros.
 */
export function smoothSplinePath(points: Point2D[], tension = 0.22): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    let cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;
    let cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;

    // Clamp Y control points to avoid inverted loops past local extrema
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    cp1y = Math.max(minY, Math.min(maxY, cp1y));
    cp2y = Math.max(minY, Math.min(maxY, cp2y));
    cp1x = Math.max(p1.x, Math.min(p2.x, cp1x));
    cp2x = Math.max(p1.x, Math.min(p2.x, cp2x));

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export interface TreemapRect {
  id: string;
  label: string;
  value: number;
  share: number;
  color?: string;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Golden-ratio squarified treemap layout solver matching Treemap.dc.html.
 * Filters <= 0 values cleanly and degrades deterministically on 1 item.
 */
export function computeSquarifiedTreemap(
  items: TreemapItem[],
  width = 100,
  height = 100,
  targetRatio = 1.618
): TreemapRect[] {
  const valid = items
    .map((item, idx) => ({
      id: item.id ?? `tm-${idx}`,
      label: item.label,
      value: Math.max(0, Number.isFinite(item.value) ? item.value : 0),
      color: item.color,
      index: idx,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = valid.reduce((sum, item) => sum + item.value, 0);
  if (valid.length === 0 || total <= 0 || width <= 0 || height <= 0) return [];

  const ratioClamped = Math.max(0.8, Math.min(3, targetRatio));
  const areaTotal = width * height;
  const nodes = valid.map((item) => ({
    ...item,
    share: (item.value / total) * 100,
    area: (item.value / total) * areaTotal,
  }));

  const rects: TreemapRect[] = [];

  const worstAspect = (row: typeof nodes, shortSide: number): number => {
    if (row.length === 0 || shortSide <= 0) return Infinity;
    const sumArea = row.reduce((s, r) => s + r.area, 0);
    const maxArea = row[0].area;
    const minArea = row[row.length - 1].area;
    if (minArea <= 0) return Infinity;
    const s2 = shortSide * shortSide;
    const a2 = sumArea * sumArea;
    const r1 = (s2 * maxArea) / a2;
    const r2 = a2 / (s2 * minArea);
    const maxR = Math.max(r1, r2);
    return Math.abs(maxR - ratioClamped) + maxR * 0.25;
  };

  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let cursor = 0;

  while (cursor < nodes.length) {
    const horizontalCut = w >= h;
    const side = horizontalCut ? h : w;
    const row: typeof nodes = [];

    while (cursor < nodes.length) {
      const candidate = [...row, nodes[cursor]];
      if (row.length === 0 || worstAspect(candidate, side) <= worstAspect(row, side)) {
        row.push(nodes[cursor]);
        cursor++;
      } else {
        break;
      }
    }

    const rowArea = row.reduce((s, r) => s + r.area, 0);
    if (horizontalCut) {
      const stripW = h > 0 ? rowArea / h : w;
      let cy = y;
      for (const item of row) {
        const ih = stripW > 0 ? item.area / stripW : 0;
        rects.push({
          id: item.id,
          label: item.label,
          value: item.value,
          share: item.share,
          color: item.color,
          index: item.index,
          x,
          y: cy,
          w: stripW,
          h: ih,
        });
        cy += ih;
      }
      x += stripW;
      w = Math.max(0, w - stripW);
    } else {
      const stripH = w > 0 ? rowArea / w : h;
      let cx = x;
      for (const item of row) {
        const iw = stripH > 0 ? item.area / stripH : 0;
        rects.push({
          id: item.id,
          label: item.label,
          value: item.value,
          share: item.share,
          color: item.color,
          index: item.index,
          x: cx,
          y,
          w: iw,
          h: stripH,
        });
        cx += iw;
      }
      y += stripH;
      h = Math.max(0, h - stripH);
    }
  }

  return rects;
}

export function computeMedianBucketIndex(bins: HistogramBin[]): number {
  const total = bins.reduce((sum, b) => sum + Math.max(0, b.value), 0);
  if (total <= 0) return -1;
  const half = total / 2;
  let acc = 0;
  for (let i = 0; i < bins.length; i++) {
    acc += Math.max(0, bins[i].value);
    if (acc >= half) return i;
  }
  return bins.length - 1;
}

export interface DefaultChartStrings {
  loading: string;
  empty: string;
  error: string;
  retry: string;
  helpLabel: string;
  medianLabel: string;
  achievedLabel: string;
  avgLabel: string;
  peakLabel: string;
  totalLabel: string;
  previousLabel: string;
  currentLabel: string;
  actualLabel: string;
  targetLabel: string;
  occupiedLabel: string;
  availableLabel: string;
  lowLabel: string;
  highLabel: string;
  conversionLabel: string;
  stepLabel: string;
  minLabel: string;
  maxLabel: string;
}

const CHART_STRINGS: Record<ChartLocale, DefaultChartStrings> = {
  fr: {
    loading: 'Chargement des données…',
    empty: 'Aucune donnée disponible sur cette période.',
    error: 'Impossible de charger cet indicateur.',
    retry: 'Réessayer',
    helpLabel: 'À propos de ce graphique',
    medianLabel: 'médiane',
    achievedLabel: 'Atteint',
    avgLabel: 'Moy.',
    peakLabel: 'Pic',
    totalLabel: 'Total',
    previousLabel: 'Précédent',
    currentLabel: 'Actuel',
    actualLabel: 'Réalisé',
    targetLabel: 'Objectif',
    occupiedLabel: 'Occupé',
    availableLabel: 'Disponible',
    lowLabel: 'Bas',
    highLabel: 'Élevé',
    conversionLabel: 'Conversion',
    stepLabel: 'Étape',
    minLabel: 'Min',
    maxLabel: 'Max',
  },
  en: {
    loading: 'Loading data…',
    empty: 'No data available for this period.',
    error: 'Unable to load this chart.',
    retry: 'Retry',
    helpLabel: 'About this chart',
    medianLabel: 'median',
    achievedLabel: 'Reached',
    avgLabel: 'Avg.',
    peakLabel: 'Peak',
    totalLabel: 'Total',
    previousLabel: 'Previous',
    currentLabel: 'Current',
    actualLabel: 'Actual',
    targetLabel: 'Target',
    occupiedLabel: 'Occupied',
    availableLabel: 'Available',
    lowLabel: 'Low',
    highLabel: 'High',
    conversionLabel: 'Conversion',
    stepLabel: 'Step',
    minLabel: 'Min',
    maxLabel: 'Max',
  },
  ar: {
    loading: 'جارٍ تحميل البيانات…',
    empty: 'لا توجد بيانات متاحة لهذه الفترة.',
    error: 'تعذر تحميل هذا المؤشر.',
    retry: 'إعادة المحاولة',
    helpLabel: 'حول هذا الرسم البياني',
    medianLabel: 'الوسيط',
    achievedLabel: 'محقق',
    avgLabel: 'المتوسط',
    peakLabel: 'الذروة',
    totalLabel: 'الإجمالي',
    previousLabel: 'السابق',
    currentLabel: 'الحالي',
    actualLabel: 'الفعلي',
    targetLabel: 'الهدف',
    occupiedLabel: 'مشغول',
    availableLabel: 'متاح',
    lowLabel: 'منخفض',
    highLabel: 'مرتفع',
    conversionLabel: 'التحويل',
    stepLabel: 'المرحلة',
    minLabel: 'الأدنى',
    maxLabel: 'الأقصى',
  },
};

export function getDefaultChartStrings(locale: ChartLocale = 'fr'): DefaultChartStrings {
  return CHART_STRINGS[locale] ?? CHART_STRINGS.fr;
}
