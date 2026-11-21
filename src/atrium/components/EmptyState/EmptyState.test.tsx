import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EmptyState,
  computeGhostRowCount,
  resolveGhostTrackCount,
  GHOST_TRACK_TEMPLATES,
  resolveEmptyState,
  resolveCompactCheckinsEmptyState,
  resolveCompactInvoicesEmptyState,
} from './index';
import type { EmptyStateContext, EmptyStateHandlers } from './index';
import { EMPTY_STATE_STORIES } from './EmptyState.stories';

const cssSource = readFileSync(join(__dirname, './EmptyState.css'), 'utf8');
const tsxSource = readFileSync(join(__dirname, './EmptyState.tsx'), 'utf8');

const handlers: EmptyStateHandlers = {
  retry: () => {},
  clearSearch: () => {},
  addMember: () => {},
  importFile: () => {},
  resetFilters: () => {},
  showAll: () => {},
  requestAccess: () => {},
  changeSite: () => {},
  report: () => {},
};

const baseCtx = (overrides: Partial<EmptyStateContext> = {}): EmptyStateContext => ({
  total: 8,
  results: 0,
  site: 'Siège Principal',
  handlers,
  ...overrides,
});

describe('resolveEmptyState priority and French copy deck', () => {
  it('follows strict priority: error -> forbidden -> total === 0 -> query -> tab/filters', () => {
    // 1. Error wins over forbidden, total === 0, query, filters
    const err = resolveEmptyState(
      baseCtx({
        error: { status: 503, lastSync: '09:14' },
        forbidden: { site: 'Annexe Oran' },
        total: 0,
        query: 'sara',
        filters: ['Accès : Bloqué'],
      })
    );
    expect(err?.tone).toBe('error');
    expect(err?.title).toBe('Impossible de charger la liste');
    expect(err?.hint).toBe('Code 503 · dernière synchronisation 09:14');
    expect(err?.autoFocusPrimary).toBe(true);

    // 2. Forbidden wins over total === 0, query, filters
    const forb = resolveEmptyState(
      baseCtx({
        forbidden: { site: 'Annexe Oran' },
        total: 0,
        query: 'sara',
        filters: ['Accès : Bloqué'],
      })
    );
    expect(forb?.tone).toBe('warning');
    expect(forb?.title).toBe('Accès limité à ce site');
    expect(String(forb?.description)).toContain('Annexe Oran');

    // 3. total === 0 wins over query, tab, filters
    const none = resolveEmptyState(
      baseCtx({
        total: 0,
        results: 0,
        query: 'sara',
        tab: 'renewals',
        filters: ['Accès : Bloqué'],
      })
    );
    expect(none?.tone).toBe('neutral');
    expect(none?.title).toBe('Aucun adhérent pour le moment');
    expect(none?.width).toBe(500);
    expect(none?.hint).toBe('Format accepté : .csv · ID, nom, téléphone, formule');

    // 4. query with results === 0 wins over tab/filters
    const search = resolveEmptyState(
      baseCtx({
        total: 8,
        results: 0,
        query: 'sara bz',
        tab: 'renewals',
        filters: ['Accès : Bloqué'],
      })
    );
    expect(search?.tone).toBe('neutral');
    expect(search?.title).toBe('Aucun résultat pour « sara bz »');
    expect(search?.primaryAction?.label).toBe('Effacer la recherche');
    expect(search?.secondaryAction?.label).toBe('Ajouter « sara bz »');

    // 5a. filters with results === 0
    const filt = resolveEmptyState(
      baseCtx({
        total: 8,
        results: 0,
        filters: ['Accès : Bloqué'],
      })
    );
    expect(filt?.tone).toBe('neutral');
    expect(filt?.title).toBe('Aucun adhérent ne correspond');
    expect(filt?.description).toBe('Aucun adhérent sur Siège Principal avec les filtres actuels.');
    expect(filt?.primaryAction?.label).toBe('Réinitialiser les filtres');

    // 5b. renewals tab with results === 0 uses positive tone + secondary only + nextExpiry hint
    const renewals = resolveEmptyState(
      baseCtx({
        total: 8,
        results: 0,
        tab: 'renewals',
        nextExpiry: { date: '2026-12-05', name: 'Amira Cherif', days: 29 },
      })
    );
    expect(renewals?.tone).toBe('positive');
    expect(renewals?.title).toBe('Aucun renouvellement à prévoir');
    expect(renewals?.primaryAction).toBeUndefined();
    expect(renewals?.secondaryAction?.label).toBe('Voir tous les adhérents');
    expect(renewals?.hint).toBe('Prochaine échéance · 2026-12-05 · Amira Cherif (29j)');

    // 5c. other empty tabs use neutral tone
    const otherTab = resolveEmptyState(
      baseCtx({
        total: 8,
        results: 0,
        tab: 'active',
      })
    );
    expect(otherTab?.tone).toBe('neutral');
    expect(otherTab?.secondaryAction?.label).toBe('Voir tous les adhérents');
  });

  it('returns nothing when results > 0 (and no error or forbidden)', () => {
    expect(resolveEmptyState(baseCtx({ total: 8, results: 3 }))).toBeUndefined();
    expect(
      resolveEmptyState(baseCtx({ total: 8, results: 3, query: 'amira', tab: 'active' }))
    ).toBeUndefined();
  });
});

describe('Ghost grid track selection & row count math', () => {
  it('selects 6 tracks at 1200px, 4 tracks at 800px, and 3 tracks at 500px container widths', () => {
    expect(resolveGhostTrackCount(1200, 'auto')).toBe(6);
    expect(resolveGhostTrackCount(1000, 'auto')).toBe(6);
    expect(resolveGhostTrackCount(999, 'auto')).toBe(4);
    expect(resolveGhostTrackCount(800, 'auto')).toBe(4);
    expect(resolveGhostTrackCount(600, 'auto')).toBe(4);
    expect(resolveGhostTrackCount(599, 'auto')).toBe(3);
    expect(resolveGhostTrackCount(500, 'auto')).toBe(3);

    expect(GHOST_TRACK_TEMPLATES[6]).toBe('22px 38px 1fr 190px 120px 100px');
    expect(GHOST_TRACK_TEMPLATES[4]).toBe('22px 38px 1fr 96px');
    expect(GHOST_TRACK_TEMPLATES[3]).toBe('22px 38px 1fr');

    expect(resolveGhostTrackCount(500, 6)).toBe(6);
    expect(resolveGhostTrackCount(1200, 3)).toBe(3);
  });

  it('computes ghost row count from floor(availableHeight / 70) clamped to 2..4', () => {
    expect(computeGhostRowCount(100, 'auto')).toBe(2);
    expect(computeGhostRowCount(140, 'auto')).toBe(2);
    expect(computeGhostRowCount(210, 'auto')).toBe(3);
    expect(computeGhostRowCount(279, 'auto')).toBe(3);
    expect(computeGhostRowCount(280, 'auto')).toBe(4);
    expect(computeGhostRowCount(330, 'auto')).toBe(4);
    expect(computeGhostRowCount(700, 'auto')).toBe(4);
    expect(computeGhostRowCount(330, 3)).toBe(3);
  });
});

describe('EmptyState DOM, accessibility, tone, icon slot & palette checks', () => {
  const customIcon = (
    <svg data-testid="custom-icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );

  it('uses role="alert" ONLY for error and role="status" aria-live="polite" for all other tones', () => {
    const errorHtml = renderToStaticMarkup(
      <EmptyState icon={customIcon} tone="error" title="Erreur" autoFocusPrimary />
    );
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).not.toContain('role="status"');

    for (const tone of ['neutral', 'positive', 'warning'] as const) {
      const html = renderToStaticMarkup(
        <EmptyState icon={customIcon} tone={tone} title="Statut" />
      );
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).not.toContain('role="alert"');
    }
  });

  it('renders at most one primary action and uses real <button> / <a> elements', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        icon={customIcon}
        title="Vide"
        primaryAction={{ label: 'Action principale', onClick: () => {} }}
        secondaryAction={{ label: 'Action secondaire', href: '/import' }}
      />
    );
    const primaryMatches = html.match(/es-btn--primary/g) ?? [];
    const secondaryMatches = html.match(/es-btn--secondary/g) ?? [];
    expect(primaryMatches).toHaveLength(1);
    expect(secondaryMatches).toHaveLength(1);
    expect(html).toContain('<button type="button"');
    expect(html).toContain('<a href="/import"');
  });

  it('tone changes only the dot on the icon tile and never alters button styling', () => {
    const neutralHtml = renderToStaticMarkup(
      <EmptyState
        icon={customIcon}
        tone="neutral"
        title="Neutre"
        primaryAction={{ label: 'Ajouter', onClick: () => {} }}
      />
    );
    expect(neutralHtml).not.toContain('es-dot');

    for (const tone of ['positive', 'warning', 'error'] as const) {
      const html = renderToStaticMarkup(
        <EmptyState
          icon={customIcon}
          tone={tone}
          title="Ton"
          primaryAction={{ label: 'Ajouter', onClick: () => {} }}
        />
      );
      expect(html).toContain(`es-dot es-dot--${tone}`);
      expect(html).toContain('es-btn es-btn--primary');
    }
  });

  it('accepts any custom icon through the icon slot and marks ghost rows & tile icons aria-hidden', () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={customIcon} title="Custom" ghostTracks={4} ghostRows={3} />
    );
    expect(html).toContain('data-testid="custom-icon"');
    expect(html).toContain('class="es-tile-icon" aria-hidden="true"');
    expect(html).toContain('class="es-ghost" aria-hidden="true"');
    expect(html.match(/class="es-ghost-row"/g)).toHaveLength(3);
    expect(html).toContain('grid-template-columns:22px 38px 1fr 96px');
  });

  it('supports titleAs h2/h3 (default h3) and compact variant with zero ghost rows', () => {
    const h2Html = renderToStaticMarkup(
      <EmptyState icon={customIcon} title="Titre H2" titleAs="h2" />
    );
    expect(h2Html).toContain('<h2 class="es-title">Titre H2</h2>');

    const compactHtml = renderToStaticMarkup(
      <EmptyState
        {...resolveCompactCheckinsEmptyState({ name: 'Amira Cherif', onAction: () => {} })}
      />
    );
    expect(compactHtml).toContain('class="es-compact"');
    expect(compactHtml).not.toContain('es-ghost');
    expect(compactHtml).toContain('es-btn--compact');
    expect(compactHtml).toContain('Amira Cherif');

    const compactInvHtml = renderToStaticMarkup(
      <EmptyState {...resolveCompactInvoicesEmptyState({ onAction: () => {} })} />
    );
    expect(compactInvHtml).toContain('Aucune facture');
    expect(compactInvHtml).toContain('Nouvelle vente');
  });

  it('renders all 8 story scenarios (A-F + G-H) without errors', () => {
    expect(EMPTY_STATE_STORIES).toHaveLength(8);
    for (const story of EMPTY_STATE_STORIES) {
      const StoryComp = story.Component;
      const html = renderToStaticMarkup(<StoryComp />);
      expect(html.length).toBeGreaterThan(100);
    }
  });

  it('enforces autofocus strictly on error tone, Inter font, zero animations, and Neutral CSS token swap', () => {
    // Error-only autofocus guard in component code
    expect(tsxSource).toContain("if (autoFocusPrimary && tone === 'error')");

    // CSS uses Inter font, zero animations, and includes Neutral palette tokens
    expect(cssSource).toContain("'Inter'");
    expect(cssSource).not.toMatch(/@keyframes|animation\s*:|transition\s*:|prefers-reduced-motion/);
    expect(cssSource).toContain('--panel: #FBF8F5');
    expect(cssSource).toContain('--accent: var(--brand-fill, #C9461F)');
    expect(cssSource).toContain('--panel: #FAFAFA');
    expect(cssSource).toContain('--pod: #F1F1F1');
    expect(cssSource).toContain('--border: rgba(23, 19, 15, 0.06)');
    expect(cssSource).toContain('--ghost-border: rgba(23, 19, 15, 0.16)');
    expect(cssSource).toContain('--skeleton-1: #E6E6E6');
    expect(cssSource).toContain('--skeleton-2: #EEEEEE');
  });

  it('includes filter/tab context hints, exports a React.memo component, and allows liquid button integration', () => {
    const filt = resolveEmptyState(
      baseCtx({
        total: 8,
        results: 0,
        filters: ['Accès : Bloqué'],
      })
    );
    expect(filt?.hint).toBe('8 adhérents sur Siège Principal · Accès : Bloqué');

    const tabEmpty = resolveEmptyState(
      baseCtx({
        total: 8,
        results: 0,
        tab: 'active',
      })
    );
    expect(tabEmpty?.hint).toBe('8 adhérents sur Siège Principal');

    expect((EmptyState as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
    expect(tsxSource).not.toContain('data-no-liquid');
  });
});
