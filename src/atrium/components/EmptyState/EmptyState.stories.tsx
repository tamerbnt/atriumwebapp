import React from 'react';
import { EmptyState } from './EmptyState';
import type { EmptyStateProps } from './EmptyState';
import {
  resolveEmptyState,
  resolveCompactCheckinsEmptyState,
  resolveCompactInvoicesEmptyState,
} from './presets';
import type { EmptyStateHandlers } from './presets';

const noop = () => {};

const defaultHandlers: EmptyStateHandlers = {
  retry: noop,
  clearSearch: noop,
  addMember: noop,
  importFile: noop,
  resetFilters: noop,
  showAll: noop,
  requestAccess: noop,
  changeSite: noop,
  report: noop,
};

function mustResolve(props: EmptyStateProps | undefined): EmptyStateProps {
  if (!props) {
    throw new Error('Expected EmptyStateProps from story fixture');
  }
  return props;
}

/** A · Aucun adhérent (hero, width 500, total = 0) */
export const StoryA_NoMembers: React.FC<{ handlers?: EmptyStateHandlers }> = ({
  handlers = defaultHandlers,
}) => {
  const props = mustResolve(
    resolveEmptyState({
      total: 0,
      results: 0,
      site: 'Siège Principal',
      handlers,
    })
  );
  return <EmptyState {...props} />;
};

/** B · Recherche sans résultat */
export const StoryB_SearchEmpty: React.FC<{
  query?: string;
  handlers?: EmptyStateHandlers;
}> = ({ query = 'sara bz', handlers = defaultHandlers }) => {
  const props = mustResolve(
    resolveEmptyState({
      total: 8,
      results: 0,
      query,
      site: 'Siège Principal',
      handlers,
    })
  );
  return <EmptyState {...props} />;
};

/** C · Onglet vide (À renouveler <14j, tone positive) */
export const StoryC_RenewalsEmpty: React.FC<{ handlers?: EmptyStateHandlers }> = ({
  handlers = defaultHandlers,
}) => {
  const props = mustResolve(
    resolveEmptyState({
      total: 8,
      results: 0,
      tab: 'renewals',
      site: 'Siège Principal',
      nextExpiry: { date: '2026-12-05', name: 'Amira Cherif', days: 29 },
      handlers,
    })
  );
  return <EmptyState {...props} />;
};

/** D · Filtre sans résultat */
export const StoryD_FiltersEmpty: React.FC<{ handlers?: EmptyStateHandlers }> = ({
  handlers = defaultHandlers,
}) => {
  const props = mustResolve(
    resolveEmptyState({
      total: 8,
      results: 0,
      filters: ['Accès : Bloqué'],
      site: 'Siège Principal',
      handlers,
    })
  );
  return <EmptyState {...props} />;
};

/** E · Erreur de chargement (503, tone error, role="alert") */
export const StoryE_LoadError: React.FC<{ handlers?: EmptyStateHandlers }> = ({
  handlers = defaultHandlers,
}) => {
  const props = mustResolve(
    resolveEmptyState({
      error: { status: 503, lastSync: '09:14' },
      total: 0,
      results: 0,
      site: 'Siège Principal',
      handlers,
    })
  );
  return <EmptyState {...props} autoFocusPrimary={false} />;
};

/** F · Accès refusé au site (tone warning) */
export const StoryF_ForbiddenSite: React.FC<{ handlers?: EmptyStateHandlers }> = ({
  handlers = defaultHandlers,
}) => {
  const props = mustResolve(
    resolveEmptyState({
      forbidden: { site: 'Annexe Oran' },
      total: 0,
      results: 0,
      site: 'Annexe Oran',
      handlers,
    })
  );
  return <EmptyState {...props} />;
};

/** G · Compact : Aucun passage enregistré */
export const StoryG_CompactCheckins: React.FC<{
  name?: string;
  onAction?: () => void;
}> = ({ name = 'Amira Cherif', onAction = noop }) => {
  return <EmptyState {...resolveCompactCheckinsEmptyState({ name, onAction })} />;
};

/** H · Compact : Aucune facture */
export const StoryH_CompactInvoices: React.FC<{ onAction?: () => void }> = ({
  onAction = noop,
}) => {
  return <EmptyState {...resolveCompactInvoicesEmptyState({ onAction })} />;
};

export const EMPTY_STATE_STORIES = [
  { id: 'A', label: 'A · Aucun adhérent', Component: StoryA_NoMembers },
  { id: 'B', label: 'B · Recherche sans résultat', Component: StoryB_SearchEmpty },
  { id: 'C', label: 'C · Onglet vide (bonne nouvelle)', Component: StoryC_RenewalsEmpty },
  { id: 'D', label: 'D · Filtre sans résultat', Component: StoryD_FiltersEmpty },
  { id: 'E', label: 'E · Erreur de chargement', Component: StoryE_LoadError },
  { id: 'F', label: 'F · Accès refusé au site', Component: StoryF_ForbiddenSite },
  { id: 'G', label: 'G · Compact passages', Component: StoryG_CompactCheckins },
  { id: 'H', label: 'H · Compact factures', Component: StoryH_CompactInvoices },
] as const;

export const EmptyStateStoriesShowcase: React.FC<{
  palette?: 'warm' | 'neutral';
}> = ({ palette = 'warm' }) => {
  const paletteAttr = palette === 'neutral' ? 'neutral' : undefined;

  return (
    <div data-es-palette={paletteAttr} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <section>
        <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 14 }}>
          A · Aucun adhérent (pleine largeur · 500px)
        </div>
        <div
          style={{
            background: 'var(--pod, #F3EDE7)',
            border: '1px solid var(--border, #E6DED6)',
            borderRadius: 24,
            padding: 16,
          }}
        >
          <div style={{ height: 350 }}>
            <StoryA_NoMembers />
          </div>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 24,
        }}
      >
        <section>
          <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 14 }}>
            B · Recherche sans résultat
          </div>
          <div
            style={{
              background: 'var(--pod, #F3EDE7)',
              border: '1px solid var(--border, #E6DED6)',
              borderRadius: 24,
              padding: 16,
            }}
          >
            <div style={{ height: 330 }}>
              <StoryB_SearchEmpty />
            </div>
          </div>
        </section>

        <section>
          <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 14 }}>
            C · Onglet vide (bonne nouvelle)
          </div>
          <div
            style={{
              background: 'var(--pod, #F3EDE7)',
              border: '1px solid var(--border, #E6DED6)',
              borderRadius: 24,
              padding: 16,
            }}
          >
            <div style={{ height: 330 }}>
              <StoryC_RenewalsEmpty />
            </div>
          </div>
        </section>

        <section>
          <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 14 }}>
            D · Filtre sans résultat
          </div>
          <div
            style={{
              background: 'var(--pod, #F3EDE7)',
              border: '1px solid var(--border, #E6DED6)',
              borderRadius: 24,
              padding: 16,
            }}
          >
            <div style={{ height: 330 }}>
              <StoryD_FiltersEmpty />
            </div>
          </div>
        </section>

        <section>
          <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 14 }}>
            E · Erreur de chargement (503)
          </div>
          <div
            style={{
              background: 'var(--pod, #F3EDE7)',
              border: '1px solid var(--border, #E6DED6)',
              borderRadius: 24,
              padding: 16,
            }}
          >
            <div style={{ height: 330 }}>
              <StoryE_LoadError />
            </div>
          </div>
        </section>

        <section>
          <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 14 }}>
            F · Accès refusé au site
          </div>
          <div
            style={{
              background: 'var(--pod, #F3EDE7)',
              border: '1px solid var(--border, #E6DED6)',
              borderRadius: 24,
              padding: 16,
            }}
          >
            <div style={{ height: 330 }}>
              <StoryF_ForbiddenSite />
            </div>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>G · H · Versions compactes</div>
          <div
            style={{
              background: 'var(--card, #FFFFFF)',
              border: '1px solid var(--border, #E6DED6)',
              borderRadius: 22,
              padding: 14,
            }}
          >
            <StoryG_CompactCheckins />
          </div>
          <div
            style={{
              background: 'var(--card, #FFFFFF)',
              border: '1px solid var(--border, #E6DED6)',
              borderRadius: 22,
              padding: 14,
            }}
          >
            <StoryH_CompactInvoices />
          </div>
        </section>
      </div>
    </div>
  );
};

export default EmptyStateStoriesShowcase;
