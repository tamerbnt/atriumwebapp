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
      arg3?: Record<string, any>
    ): string => {
      if ((arg2 === 'en' || arg2 === 'fr' || arg2 === 'ar') && typeof arg3 === 'object' && arg3 !== null) {
        return t(key, arg2 as SupportedLanguage, undefined, arg3);
      }
      if (typeof arg2 === 'object' && arg2 !== null) {
        return t(key, language, undefined, arg2);
      }
      return t(key, language, typeof arg2 === 'string' ? arg2 : undefined, arg3);
    },
    language,
    isRtl: language === 'ar',
    dir: (language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
}
