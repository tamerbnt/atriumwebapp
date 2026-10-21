import { useAtriumStore } from '../services/store';
import { t, TranslationKey } from './i18n';
import { SupportedLanguage } from '../types/index';

/**
 * Convenient React hook for components to subscribe to current language and direction
 */
export function useTranslation() {
  const { language } = useAtriumStore();
  return {
    t: (
      key: TranslationKey | string,
      arg2?: string | SupportedLanguage | Record<string, any>,
      arg3?: string | Record<string, any>
    ): string => {
      // Case 1: arg2 is explicit language override ('en' | 'fr' | 'ar')
      if (arg2 === 'en' || arg2 === 'fr' || arg2 === 'ar') {
        const fallback = typeof arg3 === 'string' ? arg3 : undefined;
        const params = typeof arg3 === 'object' && arg3 !== null ? (arg3 as Record<string, any>) : undefined;
        return t(key, arg2, fallback, params);
      }
      // Case 2: arg2 is params object e.g. t('key', { count: 5 })
      if (typeof arg2 === 'object' && arg2 !== null) {
        return t(key, language, undefined, arg2 as Record<string, any>);
      }
      // Case 3: arg2 is fallback string e.g. t('key', 'Default text', { var: 1 })
      const fallback = typeof arg2 === 'string' ? arg2 : undefined;
      const params = typeof arg3 === 'object' && arg3 !== null ? (arg3 as Record<string, any>) : undefined;
      return t(key, language, fallback, params);
    },
    language,
    isRtl: language === 'ar',
    dir: (language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
}
