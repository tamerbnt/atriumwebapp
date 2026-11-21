import { SupportedLanguage } from '../types/index';
import type enTranslations from './locales/en.json';

export type TranslationDict = typeof enTranslations;
export type TranslationKey = keyof TranslationDict;

/**
 * Detect user's operating system / browser default language.
 * Matches Algerian/Middle-East/North-African/Global system locales:
 * 'ar' for Arabic (ar, ar-DZ, ar-EG, ar-SA, etc.)
 * 'fr' for French (fr, fr-DZ, fr-FR, fr-CA, etc.)
 * 'en' for English default.
 */
export const getSystemDefaultLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'en';
  }
  const browserLangs = navigator.languages || [navigator.language || 'en'];
  for (const lang of browserLangs) {
    if (!lang) continue;
    const lower = lang.toLowerCase();
    if (lower.startsWith('ar')) return 'ar';
    if (lower.startsWith('fr')) return 'fr';
    if (lower.startsWith('en')) return 'en';
  }
  return 'en';
};

/**
 * Resolves the starting language and whether it was auto-detected or manually chosen.
 */
export const getInitialLanguageConfig = (): { language: SupportedLanguage; isAuto: boolean } => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { language: 'en', isAuto: true };
  }
  const mode = localStorage.getItem('atrium_language_mode');
  const saved = localStorage.getItem('atrium_language') as SupportedLanguage | null;

  if (mode === 'manual' && saved && (saved === 'en' || saved === 'fr' || saved === 'ar')) {
    return { language: saved, isAuto: false };
  }
  return { language: getSystemDefaultLanguage(), isAuto: true };
};

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English (US)', flag: '🇺🇸', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية (الجزائر)', flag: '🇩🇿', dir: 'rtl' },
];

const loadedLocales: Partial<Record<SupportedLanguage, TranslationDict>> = {};
const inFlightLoads: Partial<Record<SupportedLanguage, Promise<TranslationDict>>> = {};

export function isLocaleLoaded(lang: SupportedLanguage): boolean {
  return Boolean(loadedLocales[lang]);
}

/**
 * Synchronous Node/Vitest fallback so unit tests and CLI runners that call `t()`
 * without running browser bootstrap still resolve dictionaries immediately,
 * while browser builds split each locale into its own async chunk.
 */
export function ensureLocaleLoadedSync(lang: SupportedLanguage): TranslationDict | undefined {
  const cached = loadedLocales[lang];
  if (cached) return cached;
  const proc = typeof globalThis !== 'undefined' ? (globalThis as { process?: { getBuiltinModule?: (id: string) => any; cwd?: () => string } }).process : undefined;
  if (proc && typeof proc.getBuiltinModule === 'function' && typeof proc.cwd === 'function') {
    try {
      const fs = proc.getBuiltinModule('node:fs');
      const path = proc.getBuiltinModule('node:path');
      if (fs && path) {
        const filePath = path.resolve(proc.cwd(), 'src/utils/locales', `${lang}.json`);
        if (fs.existsSync(filePath)) {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as TranslationDict;
          loadedLocales[lang] = parsed;
          return parsed;
        }
      }
    } catch {
      // Ignore in browser or sandboxed runtimes
    }
  }
  return undefined;
}

export async function loadLocale(lang: SupportedLanguage): Promise<TranslationDict> {
  const existing = loadedLocales[lang];
  if (existing) return existing;
  const inflight = inFlightLoads[lang];
  if (inflight) return inflight;

  const promise = (async () => {
    let mod: { default: TranslationDict };
    switch (lang) {
      case 'fr':
        mod = (await import('./locales/fr.json')) as unknown as { default: TranslationDict };
        break;
      case 'ar':
        mod = (await import('./locales/ar.json')) as unknown as { default: TranslationDict };
        break;
      case 'en':
      default:
        mod = (await import('./locales/en.json')) as unknown as { default: TranslationDict };
        break;
    }
    loadedLocales[lang] = mod.default;
    return mod.default;
  })();

  inFlightLoads[lang] = promise;
  try {
    return await promise;
  } finally {
    delete inFlightLoads[lang];
  }
}

export const DICTIONARY: Record<SupportedLanguage, TranslationDict> = new Proxy(
  {} as Record<SupportedLanguage, TranslationDict>,
  {
    get(_target, prop) {
      if (prop === 'en' || prop === 'fr' || prop === 'ar') {
        return (
          loadedLocales[prop] ||
          ensureLocaleLoadedSync(prop) ||
          ({} as TranslationDict)
        );
      }
      return undefined;
    },
    ownKeys() {
      return ['en', 'fr', 'ar'];
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (prop === 'en' || prop === 'fr' || prop === 'ar') {
        return {
          enumerable: true,
          configurable: true,
          value: loadedLocales[prop] || ensureLocaleLoadedSync(prop) || ({} as TranslationDict),
        };
      }
      return undefined;
    },
  }
);

/**
 * Direct translator function with template variable interpolation: {var}
 */
export function t(
  key: TranslationKey | string,
  lang: SupportedLanguage = 'en',
  fallbackOrParams?: string | Record<string, any>,
  params?: Record<string, any>
): string {
  const dict =
    loadedLocales[lang] ||
    ensureLocaleLoadedSync(lang) ||
    loadedLocales.en ||
    ensureLocaleLoadedSync('en');
  let val = (dict as Record<string, string> | undefined)?.[key];
  if (!val && lang !== 'en') {
    const enDict = loadedLocales.en || ensureLocaleLoadedSync('en');
    val = (enDict as Record<string, string> | undefined)?.[key];
  }
  let fallback: string | undefined;
  let resolvedParams = params;
  if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
    resolvedParams = fallbackOrParams;
  } else if (typeof fallbackOrParams === 'string') {
    fallback = fallbackOrParams;
  }
  if (!val) {
    val = fallback !== undefined ? fallback : (key as string);
  }
  if (resolvedParams && typeof val === 'string') {
    return Object.entries(resolvedParams).reduce((acc, [k, v]) => {
      return acc.replaceAll(`{${k}}`, String(v ?? ''));
    }, val);
  }
  return val;
}

/**
 * Helper to localize preset salon service items dynamically
 */
export function getLocalizedService<T extends { id: string; name: string; description?: string; category?: string }>(
  service: T,
  lang: SupportedLanguage
): T {
  if (!service) return service;
  const mapping: Record<string, { nameKey: TranslationKey; descKey: TranslationKey }> = {
    srv_01: { nameKey: 'srv_balayage_name', descKey: 'srv_balayage_desc' },
    srv_02: { nameKey: 'srv_blowout_name', descKey: 'srv_blowout_desc' },
    srv_03: { nameKey: 'srv_keratin_name', descKey: 'srv_keratin_desc' },
    srv_04: { nameKey: 'srv_manicure_name', descKey: 'srv_manicure_desc' },
    srv_05: { nameKey: 'srv_pedicure_name', descKey: 'srv_pedicure_desc' },
    srv_06: { nameKey: 'srv_hydrafacial_name', descKey: 'srv_hydrafacial_desc' },
    srv_07: { nameKey: 'srv_bridal_name', descKey: 'srv_bridal_desc' },
    srv_08: { nameKey: 'srv_massage_name', descKey: 'srv_massage_desc' },
  };

  const item = mapping[service.id];
  return {
    ...service,
    name: item ? t(item.nameKey, lang, service.name) : service.name,
    description: item ? t(item.descKey, lang, service.description) : service.description,
  };
}

/**
 * Helper to localize salon service categories
 */
export function getLocalizedServiceCategory(category: string, lang: SupportedLanguage): string {
  switch (category) {
    case 'Hair': return t('srv_cat_hair', lang, 'Hair');
    case 'Nails': return t('srv_cat_nails', lang, 'Nails');
    case 'Facial': return t('srv_cat_facial', lang, 'Facial');
    case 'Massage': return t('srv_cat_massage', lang, 'Massage');
    case 'Bridal': return t('srv_cat_bridal', lang, 'Bridal');
    case 'Barber': return t('srv_cat_barber', lang, 'Barber');
    default: return category;
  }
}

/**
 * Helper to dynamically resolve localized name of a salon treatment
 */
export function getLocalizedServiceName(serviceId: string | undefined, fallbackName: string, lang: SupportedLanguage): string {
  if (!serviceId) return fallbackName;
  const mapping: Record<string, TranslationKey> = {
    srv_01: 'srv_balayage_name',
    srv_02: 'srv_blowout_name',
    srv_03: 'srv_keratin_name',
    srv_04: 'srv_manicure_name',
    srv_05: 'srv_pedicure_name',
    srv_06: 'srv_hydrafacial_name',
    srv_07: 'srv_bridal_name',
    srv_08: 'srv_massage_name',
  };
  const key = mapping[serviceId];
  return key ? t(key, lang, fallbackName) : fallbackName;
}
