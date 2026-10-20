import { useAtriumStore } from '../services/store';
import { t, TranslationKey } from './i18n';

/**
 * Convenient React hook for components to subscribe to current language and direction
 */
export function useTranslation() {
  const { language } = useAtriumStore();
  return {
    t: (key: TranslationKey | string, fallback?: string) => t(key, language, fallback),
    language,
    isRtl: language === 'ar',
    dir: (language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
}
