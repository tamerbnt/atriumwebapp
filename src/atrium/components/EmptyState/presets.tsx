import React from 'react';
import type { EmptyStateProps } from './EmptyState';

export type EmptyStateLocale = 'fr' | 'en' | 'ar';

export type EmptyStateCopyKey =
  | 'empty_none_title'
  | 'empty_none_description'
  | 'empty_none_primary'
  | 'empty_none_secondary'
  | 'empty_none_hint'
  | 'empty_search_title'
  | 'empty_search_description'
  | 'empty_search_primary'
  | 'empty_search_secondary'
  | 'empty_tab_renewals_title'
  | 'empty_tab_renewals_description'
  | 'empty_tab_renewals_secondary'
  | 'empty_tab_renewals_hint'
  | 'empty_tab_generic_title'
  | 'empty_tab_generic_description'
  | 'empty_tab_generic_secondary'
  | 'empty_tab_generic_hint'
  | 'empty_filters_title'
  | 'empty_filters_description'
  | 'empty_filters_primary'
  | 'empty_filters_hint'
  | 'empty_error_title'
  | 'empty_error_description'
  | 'empty_error_primary'
  | 'empty_error_secondary'
  | 'empty_error_hint'
  | 'empty_error_hint_no_sync'
  | 'empty_forbidden_title'
  | 'empty_forbidden_description'
  | 'empty_forbidden_primary'
  | 'empty_forbidden_secondary'
  | 'empty_compact_checkins_title'
  | 'empty_compact_checkins_description'
  | 'empty_compact_checkins_action'
  | 'empty_compact_invoices_title'
  | 'empty_compact_invoices_description'
  | 'empty_compact_invoices_action';

export const EMPTY_STATE_COPY: Record<EmptyStateLocale, Record<EmptyStateCopyKey, string>> = {
  fr: {
    empty_none_title: 'Aucun adhérent pour le moment',
    empty_none_description:
      'Ajoutez votre premier adhérent pour suivre ses abonnements, ses accès au portique et ses renouvellements.',
    empty_none_primary: 'Ajouter Adhérent',
    empty_none_secondary: 'Importer un fichier',
    empty_none_hint: 'Format accepté : .csv · ID, nom, téléphone, formule',

    empty_search_title: 'Aucun résultat pour « {query} »',
    empty_search_description:
      'Vérifiez l’orthographe, ou essayez un ID, un téléphone ou une adresse e-mail.',
    empty_search_primary: 'Effacer la recherche',
    empty_search_secondary: 'Ajouter « {query} »',

    empty_tab_renewals_title: 'Aucun renouvellement à prévoir',
    empty_tab_renewals_description:
      'Tous les abonnements actifs ont plus de 14 jours devant eux.',
    empty_tab_renewals_secondary: 'Voir tous les adhérents',
    empty_tab_renewals_hint: 'Prochaine échéance · {date} · {name} ({days}j)',

    empty_tab_generic_title: 'Aucun adhérent dans cet onglet',
    empty_tab_generic_description: 'Aucun adhérent sur {site} ne correspond à cet onglet.',
    empty_tab_generic_secondary: 'Voir tous les adhérents',
    empty_tab_generic_hint: '{total} adhérents sur {site}',

    empty_filters_title: 'Aucun adhérent ne correspond',
    empty_filters_description: 'Aucun adhérent sur {site} avec les filtres actuels.',
    empty_filters_primary: 'Réinitialiser les filtres',
    empty_filters_hint: '{total} adhérents sur {site} · {filters}',

    empty_error_title: 'Impossible de charger la liste',
    empty_error_description:
      'Le serveur ne répond pas. Vos adhérents ne sont pas perdus, rien n’a été modifié.',
    empty_error_primary: 'Réessayer',
    empty_error_secondary: 'Signaler le problème',
    empty_error_hint: 'Code {status} · dernière synchronisation {lastSync}',
    empty_error_hint_no_sync: 'Code {status}',

    empty_forbidden_title: 'Accès limité à ce site',
    empty_forbidden_description:
      'Votre compte n’a pas accès aux adhérents de {site}. Demandez l’accès à un administrateur.',
    empty_forbidden_primary: 'Demander l’accès',
    empty_forbidden_secondary: 'Changer de site',

    empty_compact_checkins_title: 'Aucun passage enregistré',
    empty_compact_checkins_description:
      'Les entrées au portique de {name} apparaîtront ici.',
    empty_compact_checkins_action: 'Enregistrer une présence',

    empty_compact_invoices_title: 'Aucune facture',
    empty_compact_invoices_description:
      'Les ventes et paiements de ce membre apparaîtront ici.',
    empty_compact_invoices_action: 'Nouvelle vente',
  },
  en: {
    empty_none_title: 'No members yet',
    empty_none_description:
      'Add your first member to track subscriptions, turnstile access, and renewals.',
    empty_none_primary: 'Add Member',
    empty_none_secondary: 'Import a file',
    empty_none_hint: 'Accepted format: .csv · ID, name, phone, plan',

    empty_search_title: 'No results for “{query}”',
    empty_search_description:
      'Check the spelling, or try an ID, phone number, or email address.',
    empty_search_primary: 'Clear search',
    empty_search_secondary: 'Add “{query}”',

    empty_tab_renewals_title: 'No upcoming renewals',
    empty_tab_renewals_description:
      'All active memberships have more than 14 days remaining.',
    empty_tab_renewals_secondary: 'View all members',
    empty_tab_renewals_hint: 'Next expiry · {date} · {name} ({days}d)',

    empty_tab_generic_title: 'No members in this tab',
    empty_tab_generic_description: 'No members at {site} match this view.',
    empty_tab_generic_secondary: 'View all members',
    empty_tab_generic_hint: '{total} members at {site}',

    empty_filters_title: 'No matching members',
    empty_filters_description: 'No members at {site} match the current filters.',
    empty_filters_primary: 'Reset filters',
    empty_filters_hint: '{total} members at {site} · {filters}',

    empty_error_title: 'Unable to load list',
    empty_error_description:
      'The server is not responding. Your members are safe and nothing was changed.',
    empty_error_primary: 'Retry',
    empty_error_secondary: 'Report issue',
    empty_error_hint: 'Code {status} · last sync {lastSync}',
    empty_error_hint_no_sync: 'Code {status}',

    empty_forbidden_title: 'Access restricted for this site',
    empty_forbidden_description:
      'Your account does not have access to members at {site}. Request access from an administrator.',
    empty_forbidden_primary: 'Request access',
    empty_forbidden_secondary: 'Switch site',

    empty_compact_checkins_title: 'No check-ins recorded',
    empty_compact_checkins_description: 'Turnstile entries for {name} will appear here.',
    empty_compact_checkins_action: 'Record check-in',

    empty_compact_invoices_title: 'No invoices',
    empty_compact_invoices_description: 'Sales and payments for this member will appear here.',
    empty_compact_invoices_action: 'New sale',
  },
  ar: {
    empty_none_title: 'لا يوجد مشتركون حتى الآن',
    empty_none_description:
      'أضف أول مشترك لمتابعة الاشتراكات والدخول عبر البوابة والتجديدات.',
    empty_none_primary: 'إضافة مشترك',
    empty_none_secondary: 'استيراد ملف',
    empty_none_hint: 'الصيغة المقبولة: .csv · المعرف، الاسم، الهاتف، الباقة',

    empty_search_title: 'لا توجد نتائج لـ «{query}»',
    empty_search_description: 'تحقق من الإملاء، أو جرب المعرف أو رقم الهاتف أو البريد الإلكتروني.',
    empty_search_primary: 'مسح البحث',
    empty_search_secondary: 'إضافة «{query}»',

    empty_tab_renewals_title: 'لا توجد تجديدات قادمة',
    empty_tab_renewals_description: 'جميع الاشتراكات النشطة يتبقى لها أكثر من 14 يوماً.',
    empty_tab_renewals_secondary: 'عرض كل المشتركين',
    empty_tab_renewals_hint: 'الاستحقاق القادم · {date} · {name} ({days} يوم)',

    empty_tab_generic_title: 'لا يوجد مشتركون في هذا التبويب',
    empty_tab_generic_description: 'لا يوجد مشتركون في {site} ضمن هذا العرض.',
    empty_tab_generic_secondary: 'عرض كل المشتركين',
    empty_tab_generic_hint: '{total} مشترك في {site}',

    empty_filters_title: 'لا يوجد مشتركون مطابقون',
    empty_filters_description: 'لا يوجد مشتركون في {site} وفق الفلاتر الحالية.',
    empty_filters_primary: 'إعادة ضبط الفلاتر',
    empty_filters_hint: '{total} مشترك في {site} · {filters}',

    empty_error_title: 'تعذر تحميل القائمة',
    empty_error_description:
      'الخادم لا يستجيب. بيانات المشتركين محفوظة ولم يتم تعديل أي شيء.',
    empty_error_primary: 'إعادة المحاولة',
    empty_error_secondary: 'الإبلاغ عن مشكلة',
    empty_error_hint: 'الرمز {status} · آخر مزامنة {lastSync}',
    empty_error_hint_no_sync: 'الرمز {status}',

    empty_forbidden_title: 'الوصول محدود لهذا الموقع',
    empty_forbidden_description:
      'حسابك لا يملك صلاحية الوصول إلى مشتركي {site}. اطلب الصلاحية من المسؤول.',
    empty_forbidden_primary: 'طلب الصلاحية',
    empty_forbidden_secondary: 'تغيير الموقع',

    empty_compact_checkins_title: 'لا توجد عمليات دخول مسجلة',
    empty_compact_checkins_description: 'ستظهر عمليات دخول {name} عبر البوابة هنا.',
    empty_compact_checkins_action: 'تسجيل حضور',

    empty_compact_invoices_title: 'لا توجد فواتير',
    empty_compact_invoices_description: 'ستظهر مبيعات ومدفوعات هذا المشترك هنا.',
    empty_compact_invoices_action: 'عملية بيع جديدة',
  },
};

export function interpolateCopy(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

function getCopy(
  key: EmptyStateCopyKey,
  locale: EmptyStateLocale = 'fr',
  vars?: Record<string, string | number>,
  translate?: (key: EmptyStateCopyKey, vars?: Record<string, string | number>) => string
): string {
  if (translate) return translate(key, vars);
  const deck = EMPTY_STATE_COPY[locale] ?? EMPTY_STATE_COPY.fr;
  return interpolateCopy(deck[key], vars);
}

/* Built-in dependency-free Phosphor-matched SVG icons */
const SvgIcon: React.FC<{ d: string }> = ({ d }) => (
  <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const EMPTY_STATE_ICONS = {
  UserPlus: () => (
    <SvgIcon d="M256,136a8,8,0,0,1-8,8H232v16a8,8,0,0,1-16,0V144H200a8,8,0,0,1,0-16h16V112a8,8,0,0,1,16,0v16h16A8,8,0,0,1,256,136Zm-57.87,58.85a8,8,0,0,1-12.26,10.3C165.75,181.19,138.09,168,108,168s-57.75,13.19-77.87,37.15a8,8,0,0,1-12.25-10.3c14.94-17.78,33.52-30.41,54.17-37.17a68,68,0,1,1,71.9,0C164.6,164.44,183.18,177.07,198.13,194.85ZM108,152a52,52,0,1,0-52-52A52.06,52.06,0,0,0,108,152Z" />
  ),
  MagnifyingGlass: () => (
    <SvgIcon d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
  ),
  CalendarCheck: () => (
    <SvgIcon d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z" />
  ),
  Funnel: () => (
    <SvgIcon d="M230.6,49.53A15.81,15.81,0,0,0,216,40H40A16,16,0,0,0,28.19,66.76l.08.09L96,139.17V216a16,16,0,0,0,24.87,13.32l32-21.34A16,16,0,0,0,160,194.66V139.17l67.74-72.32.08-.09A15.8,15.8,0,0,0,230.6,49.53ZM40,56h0Zm106.18,74.58A8,8,0,0,0,144,136v58.66L112,216V136a8,8,0,0,0-2.16-5.47L40,56H216Z" />
  ),
  WifiSlash: () => (
    <SvgIcon d="M213.92,210.62a8,8,0,1,1-11.84,10.76l-52-57.15a60,60,0,0,0-57.41,7.24,8,8,0,1,1-9.42-12.93A75.43,75.43,0,0,1,128,144c1.28,0,2.55,0,3.82.1L104.9,114.49A108,108,0,0,0,61,135.31,8,8,0,0,1,49.73,134,8,8,0,0,1,51,122.77a124.27,124.27,0,0,1,41.71-21.66L69.37,75.4a155.43,155.43,0,0,0-40.29,24A8,8,0,0,1,18.92,87,171.87,171.87,0,0,1,58,62.86L42.08,45.38A8,8,0,1,1,53.92,34.62ZM128,192a12,12,0,1,0,12,12A12,12,0,0,0,128,192ZM237.08,87A172.3,172.3,0,0,0,106,49.4a8,8,0,1,0,2,15.87A158.33,158.33,0,0,1,128,64a156.25,156.25,0,0,1,98.92,35.37A8,8,0,0,0,237.08,87ZM195,135.31a8,8,0,0,0,11.24-1.3,8,8,0,0,0-1.3-11.24,124.25,124.25,0,0,0-51.73-24.2A8,8,0,1,0,150,114.24,108.12,108.12,0,0,1,195,135.31Z" />
  ),
  LockKey: () => (
    <SvgIcon d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z" />
  ),
  ClockCounterClockwise: () => (
    <SvgIcon d="M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0Zm-8-48A95.44,95.44,0,0,0,60.08,60.15C52.81,67.51,46.35,74.59,40,82V64a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16H49c7.15-8.42,14.27-16.35,22.39-24.57a80,80,0,1,1,1.66,114.75,8,8,0,1,0-11,11.64A96,96,0,1,0,128,32Z" />
  ),
  Receipt: () => (
    <SvgIcon d="M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z" />
  ),
  Plus: () => (
    <SvgIcon d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
  ),
  UploadSimple: () => (
    <SvgIcon d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0ZM93.66,77.66,120,51.31V144a8,8,0,0,0,16,0V51.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,77.66Z" />
  ),
  X: () => (
    <SvgIcon d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  ),
  ArrowClockwise: () => (
    <SvgIcon d="M224,48V96a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h28.69L182.06,73.37a79.56,79.56,0,0,0-56.13-23.43h-.45A79.52,79.52,0,0,0,69.59,72.71,8,8,0,0,1,58.41,61.27a96,96,0,0,1,135,.79L208,76.69V48a8,8,0,0,1,16,0ZM186.41,183.29a80,80,0,0,1-112.47-.66L59.31,168H88a8,8,0,0,0,0-16H40a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V179.31l14.63,14.63A95.43,95.43,0,0,0,130,222.06h.53a95.36,95.36,0,0,0,67.07-27.33,8,8,0,0,0-11.18-11.44Z" />
  ),
  CaretDown: () => (
    <SvgIcon d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
  ),
};

export type EmptyStateHandlers = {
  retry?: () => void;
  clearSearch?: () => void;
  addMember?: (prefillName?: string) => void;
  importFile?: () => void;
  resetFilters?: () => void;
  showAll?: () => void;
  requestAccess?: () => void;
  changeSite?: () => void;
  report?: () => void;
};

export type EmptyStateContext = {
  error?: { status: number; lastSync?: string };
  forbidden?: { site: string };
  total: number;
  results: number;
  query?: string;
  tab?: string;
  filters?: string[];
  site: string;
  nextExpiry?: { date: string; name: string; days: number };
  handlers: EmptyStateHandlers;
  locale?: EmptyStateLocale;
  translate?: (key: EmptyStateCopyKey, vars?: Record<string, string | number>) => string;
};

/**
 * Resolves the canonical EmptyStateProps for a collection view.
 * Priority (first match wins):
 *   error -> forbidden -> total === 0 -> query with results === 0 -> tab/filters with results === 0.
 * Returns undefined when results > 0 (and no error/forbidden).
 */
export function resolveEmptyState(context: EmptyStateContext): EmptyStateProps | undefined {
  const {
    error,
    forbidden,
    total,
    results,
    query,
    tab,
    filters,
    site,
    nextExpiry,
    handlers,
    locale = 'fr',
    translate,
  } = context;

  // 1. Error state
  if (error) {
    return {
      variant: 'island',
      tone: 'error',
      icon: <EMPTY_STATE_ICONS.WifiSlash />,
      title: getCopy('empty_error_title', locale, undefined, translate),
      description: getCopy('empty_error_description', locale, undefined, translate),
      primaryAction: {
        label: getCopy('empty_error_primary', locale, undefined, translate),
        icon: <EMPTY_STATE_ICONS.ArrowClockwise />,
        onClick: handlers.retry,
      },
      secondaryAction: handlers.report
        ? {
            label: getCopy('empty_error_secondary', locale, undefined, translate),
            onClick: handlers.report,
          }
        : undefined,
      hint: error.lastSync
        ? getCopy('empty_error_hint', locale, { status: error.status, lastSync: error.lastSync }, translate)
        : getCopy('empty_error_hint_no_sync', locale, { status: error.status }, translate),
      autoFocusPrimary: true,
    };
  }

  // 2. Forbidden state
  if (forbidden) {
    return {
      variant: 'island',
      tone: 'warning',
      icon: <EMPTY_STATE_ICONS.LockKey />,
      title: getCopy('empty_forbidden_title', locale, undefined, translate),
      description: getCopy(
        'empty_forbidden_description',
        locale,
        { site: forbidden.site || site },
        translate
      ),
      primaryAction: {
        label: getCopy('empty_forbidden_primary', locale, undefined, translate),
        onClick: handlers.requestAccess,
      },
      secondaryAction: handlers.changeSite
        ? {
            label: getCopy('empty_forbidden_secondary', locale, undefined, translate),
            icon: <EMPTY_STATE_ICONS.CaretDown />,
            onClick: handlers.changeSite,
          }
        : undefined,
    };
  }

  // 3. No records at all (hero state)
  if (total === 0) {
    return {
      variant: 'island',
      tone: 'neutral',
      width: 500,
      icon: <EMPTY_STATE_ICONS.UserPlus />,
      title: getCopy('empty_none_title', locale, undefined, translate),
      description: getCopy('empty_none_description', locale, undefined, translate),
      primaryAction: {
        label: getCopy('empty_none_primary', locale, undefined, translate),
        icon: <EMPTY_STATE_ICONS.Plus />,
        onClick: () => handlers.addMember?.(),
      },
      secondaryAction: handlers.importFile
        ? {
            label: getCopy('empty_none_secondary', locale, undefined, translate),
            icon: <EMPTY_STATE_ICONS.UploadSimple />,
            onClick: handlers.importFile,
          }
        : undefined,
      hint: getCopy('empty_none_hint', locale, undefined, translate),
    };
  }

  // Return nothing when results > 0
  if (results > 0) {
    return undefined;
  }

  // 4. Search query with 0 results
  const trimmedQuery = (query ?? '').trim();
  if (trimmedQuery.length > 0) {
    return {
      variant: 'island',
      tone: 'neutral',
      icon: <EMPTY_STATE_ICONS.MagnifyingGlass />,
      title: getCopy('empty_search_title', locale, { query: trimmedQuery }, translate),
      description: getCopy('empty_search_description', locale, { query: trimmedQuery }, translate),
      primaryAction: {
        label: getCopy('empty_search_primary', locale, undefined, translate),
        icon: <EMPTY_STATE_ICONS.X />,
        onClick: handlers.clearSearch,
      },
      secondaryAction: handlers.addMember
        ? {
            label: getCopy('empty_search_secondary', locale, { query: trimmedQuery }, translate),
            icon: <EMPTY_STATE_ICONS.Plus />,
            onClick: () => handlers.addMember?.(trimmedQuery),
          }
        : undefined,
    };
  }

  // 5. Filters or tab with 0 results
  const hasFilters = Boolean(filters && filters.length > 0);
  if (hasFilters) {
    return {
      variant: 'island',
      tone: 'neutral',
      icon: <EMPTY_STATE_ICONS.Funnel />,
      title: getCopy('empty_filters_title', locale, undefined, translate),
      description: getCopy('empty_filters_description', locale, { site }, translate),
      primaryAction: {
        label: getCopy('empty_filters_primary', locale, undefined, translate),
        onClick: handlers.resetFilters,
      },
      hint: getCopy(
        'empty_filters_hint',
        locale,
        { total, site, filters: (filters ?? []).join(' · ') },
        translate
      ),
    };
  }

  if (tab === 'renewals') {
    return {
      variant: 'island',
      tone: 'positive',
      icon: <EMPTY_STATE_ICONS.CalendarCheck />,
      title: getCopy('empty_tab_renewals_title', locale, undefined, translate),
      description: getCopy('empty_tab_renewals_description', locale, undefined, translate),
      secondaryAction: {
        label: getCopy('empty_tab_renewals_secondary', locale, undefined, translate),
        onClick: handlers.showAll,
      },
      hint: nextExpiry
        ? getCopy(
            'empty_tab_renewals_hint',
            locale,
            { date: nextExpiry.date, name: nextExpiry.name, days: nextExpiry.days },
            translate
          )
        : undefined,
    };
  }

  if (tab) {
    return {
      variant: 'island',
      tone: 'neutral',
      icon: <EMPTY_STATE_ICONS.Funnel />,
      title: getCopy('empty_tab_generic_title', locale, undefined, translate),
      description: getCopy('empty_tab_generic_description', locale, { site }, translate),
      secondaryAction: {
        label: getCopy('empty_tab_generic_secondary', locale, undefined, translate),
        onClick: handlers.showAll,
      },
      hint: getCopy('empty_tab_generic_hint', locale, { total, site }, translate),
    };
  }

  // Fallback when results === 0 and total > 0 without explicit tab/filter metadata
  return {
    variant: 'island',
    tone: 'neutral',
    icon: <EMPTY_STATE_ICONS.Funnel />,
    title: getCopy('empty_filters_title', locale, undefined, translate),
    description: getCopy('empty_filters_description', locale, { site }, translate),
    primaryAction: {
      label: getCopy('empty_filters_primary', locale, undefined, translate),
      onClick: handlers.resetFilters ?? handlers.showAll,
    },
  };
}

export function resolveCompactCheckinsEmptyState(params: {
  name: string;
  onAction?: () => void;
  locale?: EmptyStateLocale;
  translate?: (key: EmptyStateCopyKey, vars?: Record<string, string | number>) => string;
}): EmptyStateProps {
  const { name, onAction, locale = 'fr', translate } = params;
  return {
    variant: 'compact',
    tone: 'neutral',
    icon: <EMPTY_STATE_ICONS.ClockCounterClockwise />,
    title: getCopy('empty_compact_checkins_title', locale, undefined, translate),
    description: getCopy('empty_compact_checkins_description', locale, { name }, translate),
    secondaryAction: onAction
      ? {
          label: getCopy('empty_compact_checkins_action', locale, undefined, translate),
          onClick: onAction,
        }
      : undefined,
  };
}

export function resolveCompactInvoicesEmptyState(params: {
  onAction?: () => void;
  locale?: EmptyStateLocale;
  translate?: (key: EmptyStateCopyKey, vars?: Record<string, string | number>) => string;
}): EmptyStateProps {
  const { onAction, locale = 'fr', translate } = params;
  return {
    variant: 'compact',
    tone: 'neutral',
    icon: <EMPTY_STATE_ICONS.Receipt />,
    title: getCopy('empty_compact_invoices_title', locale, undefined, translate),
    description: getCopy('empty_compact_invoices_description', locale, undefined, translate),
    secondaryAction: onAction
      ? {
          label: getCopy('empty_compact_invoices_action', locale, undefined, translate),
          icon: <EMPTY_STATE_ICONS.Plus />,
          onClick: onAction,
        }
      : undefined,
  };
}
