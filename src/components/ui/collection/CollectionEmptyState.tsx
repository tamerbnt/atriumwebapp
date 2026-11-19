import React from 'react';
import {
  EmptyState,
  EMPTY_STATE_ICONS,
  type EmptyStateLocale,
  type Tone,
} from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../kinetic/KineticEmptyStateMotion';

export interface CollectionEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  searchQuery?: string;
  onClearSearch?: () => void;
  totalCount?: number;
  siteName?: string;
  activeFilterLabels?: string[];
  isError?: boolean;
  errorStatus?: number;
  lastSyncedAt?: string | null;
  onRetry?: () => void;
  hint?: React.ReactNode;
  tone?: Tone;
  width?: number;
  variant?: 'island' | 'compact';
  locale?: EmptyStateLocale;
}

const COPY_BY_LOCALE: Record<
  EmptyStateLocale,
  {
    errorTitle: string;
    errorDesc: string;
    retry: string;
    searchTitle: (q: string) => string;
    searchDesc: string;
    clearSearch: string;
    addQuery: (q: string) => string;
    filterTitle: string;
    filterDesc: string;
    filterHint: (total: number, site?: string, filters?: string[]) => string;
    resetFilters: string;
    defaultTitle: string;
    defaultDesc: string;
    addNew: string;
  }
> = {
  fr: {
    errorTitle: 'Impossible de charger la liste',
    errorDesc: 'Le serveur ne répond pas. Vos données ne sont pas perdues, rien n’a été modifié.',
    retry: 'Réessayer',
    searchTitle: (q) => `Aucun résultat pour « ${q} »`,
    searchDesc: 'Vérifiez l’orthographe ou essayez un autre terme de recherche.',
    clearSearch: 'Effacer la recherche',
    addQuery: (q) => `Ajouter « ${q} »`,
    filterTitle: 'Aucun élément ne correspond',
    filterDesc: 'Aucun enregistrement ne correspond aux filtres actuels.',
    filterHint: (total, site, filters) =>
      [
        `${total} éléments${site ? ` sur ${site}` : ''}`,
        filters && filters.length > 0 ? filters.join(' · ') : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
    resetFilters: 'Réinitialiser les filtres',
    defaultTitle: 'Aucun élément pour le moment',
    defaultDesc: 'Ajoutez votre premier enregistrement pour démarrer.',
    addNew: 'Ajouter',
  },
  en: {
    errorTitle: 'Unable to load list',
    errorDesc: 'The server is not responding. Your data is safe and nothing was changed.',
    retry: 'Retry',
    searchTitle: (q) => `No results for “${q}”`,
    searchDesc: 'Check the spelling or try a different search term.',
    clearSearch: 'Clear search',
    addQuery: (q) => `Add “${q}”`,
    filterTitle: 'No matching records',
    filterDesc: 'No records match the current filters.',
    filterHint: (total, site, filters) =>
      [
        `${total} records${site ? ` at ${site}` : ''}`,
        filters && filters.length > 0 ? filters.join(' · ') : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
    resetFilters: 'Reset filters',
    defaultTitle: 'No records yet',
    defaultDesc: 'Add your first record to get started.',
    addNew: 'Add New',
  },
  ar: {
    errorTitle: 'تعذر تحميل القائمة',
    errorDesc: 'الخادم لا يستجيب. بياناتك محفوظة ولم يتم تعديل أي شيء.',
    retry: 'إعادة المحاولة',
    searchTitle: (q) => `لا توجد نتائج لـ «${q}»`,
    searchDesc: 'تحقق من الإملاء أو جرب كلمة بحث أخرى.',
    clearSearch: 'مسح البحث',
    addQuery: (q) => `إضافة «${q}»`,
    filterTitle: 'لا توجد نتائج مطابقة',
    filterDesc: 'لا توجد سجلات تطابق المرشحات الحالية.',
    filterHint: (total, site, filters) =>
      [
        `${total} سجل${site ? ` في ${site}` : ''}`,
        filters && filters.length > 0 ? filters.join(' · ') : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
    resetFilters: 'إعادة ضبط المرشحات',
    defaultTitle: 'لا توجد سجلات حتى الآن',
    defaultDesc: 'أضف أول سجل للبدء.',
    addNew: 'إضافة جديد',
  },
};

export const CollectionEmptyState: React.FC<CollectionEmptyStateProps> = React.memo(({
  title,
  description,
  icon,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  onResetFilters,
  hasActiveFilters = false,
  searchQuery,
  onClearSearch,
  totalCount,
  siteName,
  activeFilterLabels,
  isError = false,
  errorStatus = 503,
  lastSyncedAt,
  onRetry,
  hint,
  tone,
  width,
  variant = 'island',
  locale = 'fr',
}) => {
  const copy = COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.fr;
  const trimmedQuery = (searchQuery ?? '').trim();

  // 1. Network / Sync Error (highest priority)
  if (isError) {
    const errorHint =
      hint ??
      (lastSyncedAt
        ? `Code ${errorStatus} · ${lastSyncedAt}`
        : `Code ${errorStatus}`);

    return (
      <KineticEmptyStateMotion motionKey={`err-${errorStatus}-${locale}`}>
        <EmptyState
          variant={variant}
          tone="error"
          icon={<EMPTY_STATE_ICONS.WifiSlash />}
          title={copy.errorTitle}
          description={copy.errorDesc}
          primaryAction={
            onRetry
              ? {
                  label: copy.retry,
                  icon: <EMPTY_STATE_ICONS.ArrowClockwise />,
                  onClick: onRetry,
                }
              : undefined
          }
          hint={errorHint}
          width={width}
          autoFocusPrimary
        />
      </KineticEmptyStateMotion>
    );
  }

  // 2. First-run / Hero state when totalCount === 0
  if (totalCount === 0) {
    return (
      <KineticEmptyStateMotion motionKey={`hero-${title ?? ''}-${locale}`}>
        <EmptyState
          variant={variant}
          tone={tone ?? 'neutral'}
          icon={icon ?? <EMPTY_STATE_ICONS.UserPlus />}
          title={title || copy.defaultTitle}
          description={description || copy.defaultDesc}
          primaryAction={
            onPrimaryAction
              ? {
                  label: primaryActionLabel || copy.addNew,
                  icon: <EMPTY_STATE_ICONS.Plus />,
                  onClick: onPrimaryAction,
                }
              : undefined
          }
          secondaryAction={
            secondaryActionLabel && onSecondaryAction
              ? { label: secondaryActionLabel, onClick: onSecondaryAction }
              : undefined
          }
          hint={hint}
          width={width ?? 500}
        />
      </KineticEmptyStateMotion>
    );
  }

  // 3. Search active with 0 results (always surfaces query context!)
  if (trimmedQuery.length > 0) {
    const clearFn = onClearSearch ?? onResetFilters;
    return (
      <KineticEmptyStateMotion motionKey={`search-${trimmedQuery}-${locale}`}>
        <EmptyState
          variant={variant}
          tone={tone ?? 'neutral'}
          icon={icon ?? <EMPTY_STATE_ICONS.MagnifyingGlass />}
          title={copy.searchTitle(trimmedQuery)}
          description={copy.searchDesc}
          primaryAction={
            clearFn
              ? {
                  label: copy.clearSearch,
                  icon: <EMPTY_STATE_ICONS.X />,
                  onClick: clearFn,
                }
              : onPrimaryAction
              ? {
                  label: primaryActionLabel || copy.addQuery(trimmedQuery),
                  icon: <EMPTY_STATE_ICONS.Plus />,
                  onClick: onPrimaryAction,
                }
              : undefined
          }
          secondaryAction={
            clearFn && onPrimaryAction
              ? {
                  label: copy.addQuery(trimmedQuery),
                  icon: <EMPTY_STATE_ICONS.Plus />,
                  onClick: onPrimaryAction,
                }
              : secondaryActionLabel && onSecondaryAction
              ? { label: secondaryActionLabel, onClick: onSecondaryAction }
              : undefined
          }
          hint={
            hint ??
            (typeof totalCount === 'number' && totalCount > 0
              ? copy.filterHint(totalCount, siteName)
              : undefined)
          }
          width={width}
        />
      </KineticEmptyStateMotion>
    );
  }

  // 4. Filters active with 0 results
  if (hasActiveFilters) {
    const filterSummaryHint =
      hint ??
      (typeof totalCount === 'number' && totalCount > 0
        ? copy.filterHint(totalCount, siteName, activeFilterLabels)
        : [siteName, ...(activeFilterLabels ?? [])].filter(Boolean).join(' · ') || undefined);

    return (
      <KineticEmptyStateMotion motionKey={`filters-${locale}-${activeFilterLabels?.join('|') ?? ''}`}>
        <EmptyState
          variant={variant}
          tone={tone ?? 'neutral'}
          icon={icon ?? <EMPTY_STATE_ICONS.Funnel />}
          title={copy.filterTitle}
          description={copy.filterDesc}
          primaryAction={
            onResetFilters
              ? {
                  label: copy.resetFilters,
                  onClick: onResetFilters,
                }
              : onPrimaryAction
              ? {
                  label: primaryActionLabel || copy.addNew,
                  icon: <EMPTY_STATE_ICONS.Plus />,
                  onClick: onPrimaryAction,
                }
              : undefined
          }
          secondaryAction={
            onResetFilters && onPrimaryAction
              ? {
                  label: primaryActionLabel || copy.addNew,
                  icon: <EMPTY_STATE_ICONS.Plus />,
                  onClick: onPrimaryAction,
                }
              : undefined
          }
          hint={filterSummaryHint}
          width={width}
        />
      </KineticEmptyStateMotion>
    );
  }

  // 5. Generic empty collection state
  const resolvedWidth = width ?? (onPrimaryAction ? 500 : 420);

  return (
    <KineticEmptyStateMotion motionKey={`empty-${title ?? ''}-${locale}`}>
      <EmptyState
        variant={variant}
        tone={tone ?? 'neutral'}
        icon={icon ?? <EMPTY_STATE_ICONS.UserPlus />}
        title={title || copy.defaultTitle}
        description={description || copy.defaultDesc}
        primaryAction={
          onPrimaryAction
            ? {
                label: primaryActionLabel || copy.addNew,
                icon: <EMPTY_STATE_ICONS.Plus />,
                onClick: onPrimaryAction,
              }
            : undefined
        }
        secondaryAction={
          secondaryActionLabel && onSecondaryAction
            ? {
                label: secondaryActionLabel,
                onClick: onSecondaryAction,
              }
            : undefined
        }
        hint={hint}
        width={resolvedWidth}
      />
    </KineticEmptyStateMotion>
  );
});

CollectionEmptyState.displayName = 'CollectionEmptyState';
