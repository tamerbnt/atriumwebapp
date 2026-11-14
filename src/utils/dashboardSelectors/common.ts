import { SupportedLanguage } from '../../types/index';
import type { AreaPoint, ChartState, SparkPoint } from '@/atrium';

export type DashboardPeriodKey = 'today' | '7d' | '30d' | 'year';
export type DashboardScopeKey = DashboardPeriodKey | 'all';

export const DAY_MS = 86_400_000;

const ISO_MS_CACHE = new Map<string, number>();

export function parseIsoDay(raw?: string | null): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cached = ISO_MS_CACHE.get(trimmed);
  if (cached !== undefined) {
    return Number.isNaN(cached) ? null : new Date(cached);
  }
  const parsed = new Date(trimmed.length === 10 ? `${trimmed}T12:00:00` : trimmed);
  const ms = parsed.getTime();
  if (ISO_MS_CACHE.size > 4000) {
    ISO_MS_CACHE.clear();
  }
  ISO_MS_CACHE.set(trimmed, ms);
  return Number.isNaN(ms) ? null : parsed;
}

export function resolvePeriodKey(
  raw: string | undefined,
  fallback: DashboardPeriodKey = '30d'
): DashboardPeriodKey {
  if (raw === 'today' || raw === '7d' || raw === '30d' || raw === 'year') {
    return raw;
  }
  if (raw === 'all') return 'year';
  return fallback;
}

export function getCompactTimeframeOptions(lang: SupportedLanguage) {
  return [
    { id: '7d', label: pickText(lang, '7J', '7D', '7ي') },
    { id: '30d', label: pickText(lang, '30J', '30D', '30ي') },
    { id: 'year', label: pickText(lang, 'Année', 'Year', 'سنة') },
  ];
}

export function getFullTimeframeOptions(lang: SupportedLanguage) {
  return [
    { id: 'today', label: pickText(lang, 'Auj.', 'Today', 'اليوم') },
    { id: '7d', label: pickText(lang, '7J', '7D', '7ي') },
    { id: '30d', label: pickText(lang, '30J', '30D', '30ي') },
    { id: 'year', label: pickText(lang, 'Année', 'Year', 'سنة') },
  ];
}

export function getPortfolioTimeframeOptions(lang: SupportedLanguage) {
  return [
    { id: '30d', label: pickText(lang, '30J', '30D', '30ي') },
    { id: 'year', label: pickText(lang, 'Année', 'Year', 'سنة') },
    { id: 'all', label: pickText(lang, 'Tout', 'All', 'الكل') },
  ];
}

export function getShiftWindowOptions(lang: SupportedLanguage) {
  return [
    { id: 'all', label: pickText(lang, 'Journée', 'Day', 'اليوم') },
    { id: 'am', label: pickText(lang, 'Matin', 'AM', 'صباح') },
    { id: 'pm', label: pickText(lang, 'Après-m.', 'PM', 'مساء') },
  ];
}

export function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function resolveWindowDays(period: DashboardPeriodKey): number {
  switch (period) {
    case 'today':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    case 'year':
      return 365;
  }
}

export interface WindowRange {
  startMs: number;
  endMs: number;
  prevStartMs: number;
  prevEndMs: number;
  days: number;
}

export function getPeriodRange(
  period: DashboardPeriodKey,
  anchorDate: Date = new Date()
): WindowRange {
  const days = resolveWindowDays(period);
  const anchorStart = startOfDayMs(anchorDate);
  const endMs = anchorStart + DAY_MS - 1;
  const startMs = anchorStart - (days - 1) * DAY_MS;
  const prevEndMs = startMs - 1;
  const prevStartMs = startMs - days * DAY_MS;
  return { startMs, endMs, prevStartMs, prevEndMs, days };
}

export function computeDeltaPercent(current: number, previous: number): number | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return undefined;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function resolveChartState(hasData: boolean, isLoading = false, hasError = false): ChartState {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  return hasData ? 'ready' : 'empty';
}

export function pickText(lang: SupportedLanguage, fr: string, en: string, ar: string): string {
  return lang === 'ar' ? ar : lang === 'fr' ? fr : en;
}

export function formatShortDateLabel(ms: number, lang: SupportedLanguage): string {
  const d = new Date(ms);
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
}

export function getWeekdayLabels(lang: SupportedLanguage): string[] {
  if (lang === 'ar') return ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  if (lang === 'fr') return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

export function buildDailySparkSeries<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  getValue: (item: T) => number,
  period: DashboardPeriodKey,
  lang: SupportedLanguage,
  anchorDate: Date = new Date()
): {
  currentTotal: number;
  previousTotal: number;
  deltaPercent: number | undefined;
  series: SparkPoint[];
  areaPoints: AreaPoint[];
} {
  const range = getPeriodRange(period, anchorDate);
  const bucketCount = period === 'today' ? 7 : period === 'year' ? 12 : period === '7d' ? 7 : 10;
  const spanMs = period === 'today' ? 7 * DAY_MS : range.days * DAY_MS;
  const effectiveStart = period === 'today' ? range.endMs + 1 - 7 * DAY_MS : range.startMs;
  const bucketMs = Math.max(1, spanMs / bucketCount);

  const curBuckets = new Array<number>(bucketCount).fill(0);
  const prevBuckets = new Array<number>(bucketCount).fill(0);

  let currentTotal = 0;
  let previousTotal = 0;

  for (const item of items) {
    const parsed = parseIsoDay(getDate(item));
    if (!parsed) continue;
    const ms = parsed.getTime();
    const val = getValue(item);
    if (!Number.isFinite(val)) continue;

    if (ms >= range.startMs && ms <= range.endMs) {
      currentTotal += val;
    } else if (ms >= range.prevStartMs && ms <= range.prevEndMs) {
      previousTotal += val;
    }

    if (ms >= effectiveStart && ms <= range.endMs) {
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - effectiveStart) / bucketMs)));
      curBuckets[idx] += val;
    } else if (ms >= effectiveStart - spanMs && ms < effectiveStart) {
      const idx = Math.min(
        bucketCount - 1,
        Math.max(0, Math.floor((ms - (effectiveStart - spanMs)) / bucketMs))
      );
      prevBuckets[idx] += val;
    }
  }

  const series: SparkPoint[] = [];
  const areaPoints: AreaPoint[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = effectiveStart + i * bucketMs;
    const label = formatShortDateLabel(bucketStart, lang);
    const v = Math.round(curBuckets[i] * 100) / 100;
    const p = Math.round(prevBuckets[i] * 100) / 100;
    series.push({ label, value: v, previous: p });
    areaPoints.push({ label, value: v, previous: p });
  }

  return {
    currentTotal: Math.round(currentTotal * 100) / 100,
    previousTotal: Math.round(previousTotal * 100) / 100,
    deltaPercent: computeDeltaPercent(currentTotal, previousTotal),
    series,
    areaPoints,
  };
}

export function isWithinPeriod(
  rawDate?: string | null,
  period: DashboardPeriodKey = '30d',
  anchorDate: Date = new Date()
): boolean {
  const parsed = parseIsoDay(rawDate);
  if (!parsed) return false;
  const ms = parsed.getTime();
  const range = getPeriodRange(period, anchorDate);
  return ms >= range.startMs && ms <= range.endMs;
}

export function filterByPeriod<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  period: DashboardPeriodKey,
  anchorDate: Date = new Date()
): T[] {
  const range = getPeriodRange(period, anchorDate);
  return items.filter((item) => {
    const parsed = parseIsoDay(getDate(item));
    if (!parsed) return false;
    const ms = parsed.getTime();
    return ms >= range.startMs && ms <= range.endMs;
  });
}

export function filterByScope<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  scope: string | undefined,
  fallback: DashboardPeriodKey = '30d',
  anchorDate: Date = new Date()
): T[] {
  if (scope === 'all') return items;
  return filterByPeriod(items, getDate, resolvePeriodKey(scope, fallback), anchorDate);
}

export function getPeriodBuckets(period: DashboardPeriodKey, anchorDate: Date = new Date()) {
  const range = getPeriodRange(period, anchorDate);
  const bucketCount = period === 'today' ? 7 : period === 'year' ? 12 : period === '7d' ? 7 : 10;
  const spanMs = period === 'today' ? 7 * DAY_MS : range.days * DAY_MS;
  const effectiveStart = period === 'today' ? range.endMs + 1 - 7 * DAY_MS : range.startMs;
  const bucketMs = Math.max(1, spanMs / bucketCount);
  return { range, bucketCount, spanMs, effectiveStart, bucketMs };
}

export function buildPeriodRateSeries<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  isEvent: (item: T) => boolean,
  period: DashboardPeriodKey,
  lang: SupportedLanguage,
  anchorDate: Date = new Date()
): SparkPoint[] {
  const { range, bucketCount, spanMs, effectiveStart, bucketMs } = getPeriodBuckets(period, anchorDate);
  const curNum = new Array<number>(bucketCount).fill(0);
  const curDen = new Array<number>(bucketCount).fill(0);
  const prevNum = new Array<number>(bucketCount).fill(0);
  const prevDen = new Array<number>(bucketCount).fill(0);
  let hasAnyInSpan = false;

  for (const item of items) {
    const parsed = parseIsoDay(getDate(item));
    if (!parsed) continue;
    const ms = parsed.getTime();
    const matched = isEvent(item) ? 1 : 0;
    if (ms >= effectiveStart && ms <= range.endMs) {
      hasAnyInSpan = true;
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - effectiveStart) / bucketMs)));
      curDen[idx] += 1;
      curNum[idx] += matched;
    } else if (ms >= effectiveStart - spanMs && ms < effectiveStart) {
      hasAnyInSpan = true;
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - (effectiveStart - spanMs)) / bucketMs)));
      prevDen[idx] += 1;
      prevNum[idx] += matched;
    }
  }

  if (!hasAnyInSpan) return [];

  const series: SparkPoint[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = effectiveStart + i * bucketMs;
    const label = formatShortDateLabel(bucketStart, lang);
    const v = curDen[i] > 0 ? Math.round((curNum[i] / curDen[i]) * 1000) / 10 : 0;
    const p = prevDen[i] > 0 ? Math.round((prevNum[i] / prevDen[i]) * 1000) / 10 : 0;
    series.push({ label, value: v, previous: p });
  }
  return series;
}

export function buildBucketWeightedRateSeries<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  getNumerator: (item: T) => number,
  getDenominator: (item: T) => number,
  period: DashboardPeriodKey,
  lang: SupportedLanguage,
  anchorDate: Date = new Date()
): SparkPoint[] {
  const { range, bucketCount, spanMs, effectiveStart, bucketMs } = getPeriodBuckets(period, anchorDate);
  const curNum = new Array<number>(bucketCount).fill(0);
  const curDen = new Array<number>(bucketCount).fill(0);
  const prevNum = new Array<number>(bucketCount).fill(0);
  const prevDen = new Array<number>(bucketCount).fill(0);
  let hasAnyInSpan = false;

  for (const item of items) {
    const parsed = parseIsoDay(getDate(item));
    if (!parsed) continue;
    const ms = parsed.getTime();
    const num = Math.max(0, getNumerator(item) || 0);
    const den = Math.max(0, getDenominator(item) || 0);
    if (den <= 0) continue;

    if (ms >= effectiveStart && ms <= range.endMs) {
      hasAnyInSpan = true;
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - effectiveStart) / bucketMs)));
      curDen[idx] += den;
      curNum[idx] += num;
    } else if (ms >= effectiveStart - spanMs && ms < effectiveStart) {
      hasAnyInSpan = true;
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - (effectiveStart - spanMs)) / bucketMs)));
      prevDen[idx] += den;
      prevNum[idx] += num;
    }
  }

  if (!hasAnyInSpan) return [];

  const series: SparkPoint[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = effectiveStart + i * bucketMs;
    const label = formatShortDateLabel(bucketStart, lang);
    const v = curDen[i] > 0 ? Math.round((curNum[i] / curDen[i]) * 1000) / 10 : 0;
    const p = prevDen[i] > 0 ? Math.round((prevNum[i] / prevDen[i]) * 1000) / 10 : 0;
    series.push({ label, value: v, previous: p });
  }
  return series;
}

export function buildHourlyWeekdayMatrix<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  lang: SupportedLanguage,
  hours: number[] = [8, 10, 12, 14, 16, 18, 20]
): {
  rows: string[];
  cols: string[];
  cells: number[][];
  hasAny: boolean;
} {
  const rows = getWeekdayLabels(lang);
  const cols = hours.map((h) => `${String(h).padStart(2, '0')}h`);
  const cells = rows.map(() => cols.map(() => 0));
  let hasAny = false;

  for (const item of items) {
    const parsed = parseIsoDay(getDate(item));
    if (!parsed) continue;
    const dayIdx = parsed.getDay();
    const hour = parsed.getHours();
    let bestCol = 0;
    let bestDiff = Infinity;
    for (let c = 0; c < hours.length; c++) {
      const diff = Math.abs(hour - hours[c]);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestCol = c;
      }
    }
    cells[dayIdx][bestCol] += 1;
    hasAny = true;
  }

  return { rows, cols, cells, hasAny };
}
