/**
 * Shared single-word filter lexicon & tooltip helpers.
 * Guarantees every visible filter label (pill, chip, dropdown option, segmented tab)
 * renders strictly ONE word while preserving full descriptive context for hover tooltips.
 */

export interface OneWordFilterResult {
  label: string;
  tooltip?: string;
}

const GENERIC_LEADING_TOKENS = new Set([
  'all',
  'any',
  'tous',
  'toutes',
  'tout',
  'toute',
  'every',
  'plan',
  'formule',
  'pack',
  'offre',
  'salle',
  'groupe',
  'group',
  'depot',
  'dépôt',
  'warehouse',
  'magasin',
  'parcelle',
  'parcel',
  'zone',
  'secteur',
  'atelier',
  'poste',
  'filiere',
  'filière',
  'programme',
  'program',
  'module',
  'niveau',
  'classe',
  'cours',
  'dr',
  'dr.',
  'mr',
  'm.',
  'mme',
  'mlle',
  'en',
  'à',
  'de',
  'du',
  'des',
  'le',
  'la',
  'les',
  'un',
  'une',
  'au',
  'aux',
  'par',
  'pour',
  'sans',
  'avec',
  'hors',
  'sous',
  'sur',
  'قيد',
  'جميع',
  'كافة',
  'كل',
  'د.',
  'أ.',
  'مجموعة',
  'قاعة',
  'قسم',
  'فرع',
  'مستودع',
  'مخزن',
  'باقة',
  'خطة',
]);

/**
 * Ensures any dynamic filter label (plans, wilayas, staff names, categories, etc.)
 * renders as a strict single token/word while keeping the full label for hover tooltip.
 */
export function compactFilterLabel(
  rawLabel: string,
  tooltipPrefix?: string,
  explicitTooltip?: string,
): OneWordFilterResult {
  const cleaned = (rawLabel ?? '').trim();
  if (!cleaned) {
    return { label: '', tooltip: explicitTooltip };
  }

  // Strip parenthetical suffixes like "All (12)" or "Expiring (<14d)"
  const withoutParens = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const base = withoutParens || cleaned;

  // Compact numeric/age ranges like "< 18 ans" or "18 - 25 ans" -> "<18" / "18-25"
  const ageRangeMatch = base.match(/^([<>]?\s*\d+(?:\s*[-–]\s*\d+)?)\s*(?:ans?|yrs?|years?|سنة|سنوات)?$/i);
  if (ageRangeMatch) {
    const compactNum = ageRangeMatch[1].replace(/\s+/g, '');
    return {
      label: compactNum,
      tooltip: explicitTooltip || (tooltipPrefix ? `${tooltipPrefix}: ${cleaned}` : cleaned),
    };
  }

  // Handle "16 - Alger" or "16: Alger" style codes
  const codeDashMatch = base.match(/^\d+\s*[-–:]\s*(.+)$/);
  if (codeDashMatch && codeDashMatch[1]) {
    const cityPart = codeDashMatch[1].trim().split(/[\s/]+/)[0];
    return {
      label: cityPart,
      tooltip: explicitTooltip || (tooltipPrefix ? `${tooltipPrefix}: ${cleaned}` : cleaned),
    };
  }

  // Split by whitespace or slashes/pipes
  const parts = base
    .split(/[\s/|•·]+/)
    .map((p) => p.replace(/^[,;:]+|[,;:]+$/g, ''))
    .filter(Boolean);

  if (parts.length <= 1 && cleaned === base) {
    const word = parts[0] || cleaned;
    return {
      label: word,
      tooltip: explicitTooltip || (tooltipPrefix ? `${tooltipPrefix}: ${cleaned}` : undefined),
    };
  }

  // Pick the first distinguishing non-generic word (skip prepositions / generic prefixes)
  const chosen =
    parts.find((p) => !GENERIC_LEADING_TOKENS.has(p.toLowerCase())) ||
    parts[parts.length - 1] ||
    cleaned;

  return {
    label: chosen,
    tooltip: explicitTooltip || (tooltipPrefix ? `${tooltipPrefix}: ${cleaned}` : cleaned),
  };
}
