import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccessRestrictedView } from '../../components/common/AccessRestrictedView';
import { MembershipFinanceView } from '../../components/screens/membership/MembershipFinanceView';
import { LegalVaultView } from '../../components/screens/legal/LegalVaultView';
import { SettingsScreen } from '../../components/screens/SettingsScreen';
import { TopBar } from '../../components/layout/TopBar';
import {
  setLanguageAction,
  switchBusinessAction,
  useAtriumStore,
} from '../../services/store';

function initBusinessAndActions(targetCategory: string) {
  let storeActions: ReturnType<typeof useAtriumStore> | null = null;
  const Probe: React.FC = () => {
    storeActions = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(<Probe />);
  const biz = storeActions!.businesses.find((b) => b.category === targetCategory);
  if (biz) switchBusinessAction(biz.id);
  return storeActions!;
}

describe('Section 5 AccessRestrictedView, MembershipFinanceView, Scoped Vault & Preferences UI verification', () => {
  beforeEach(() => {
    setLanguageAction('en');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders localized AccessRestrictedView in EN, FR, and AR (RTL) with native actions', () => {
    const enHtml = renderToStaticMarkup(
      <AccessRestrictedView attemptedScreen="settings" category="membership_session" effectiveRole="Staff" />
    );
    expect(enHtml).toContain('data-testid="access-restricted-view"');
    expect(enHtml).toContain('Access restricted');
    expect(enHtml).toContain('settings');
    expect(enHtml).toContain('Staff · membership_session');
    expect(enHtml).toContain('data-testid="access-restricted-return-home"');
    expect(enHtml).toContain('data-testid="access-restricted-switch-user"');

    setLanguageAction('fr');
    const frHtml = renderToStaticMarkup(
      <AccessRestrictedView attemptedScreen="finance" category="logistics_delivery" effectiveRole="dispatcher" />
    );
    expect(frHtml).toContain('Accès restreint');
    expect(frHtml).toContain('finance');

    setLanguageAction('ar');
    const arHtml = renderToStaticMarkup(
      <AccessRestrictedView attemptedScreen="staff" category="pos_inventory" effectiveRole="Staff" />
    );
    expect(arHtml).toContain('dir="rtl"');
    expect(arHtml).toContain('الوصول مقيّد');
  });

  it('renders MembershipFinanceView with explicit Estimated ledger pending banner and indicator (5.1)', () => {
    initBusinessAndActions('membership_session');
    setLanguageAction('en');
    const html = renderToStaticMarkup(<MembershipFinanceView />);
    expect(html).toContain('data-testid="membership-finance-estimated-banner"');
    expect(html).toContain('Estimated, ledger pending');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');

    setLanguageAction('fr');
    const frHtml = renderToStaticMarkup(<MembershipFinanceView />);
    expect(frHtml).toContain('Estimé, grand livre en attente');
  });

  it('enforces filing-only scope on LegalVaultView for secretaire_caisse and hides avocat confidential items (5.3)', () => {
    const storageMap = new Map<string, string>();
    storageMap.set(
      'atrium_legal_vault_v2',
      JSON.stringify([
        {
          id: 'v_sec_1',
          code: 'DEP-2026-101',
          title: 'Dossier NIN Client Benali',
          matterReference: 'DOS-2026-01',
          category: 'Identité NIN/NIF',
          depositDate: '2026-11-20',
          status: 'PieceClient',
          roleScope: 'secretaire',
        },
        {
          id: 'v_av_secret',
          code: 'DOC-2026-999',
          title: 'Secret Defense Strategy Memo',
          matterReference: 'DOS-2026-99',
          category: 'Mémoires',
          depositDate: '2026-11-20',
          status: 'Confidential',
          roleScope: 'avocat',
        },
      ])
    );
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, v),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear(),
      key: () => null,
      get length() {
        return storageMap.size;
      },
    });

    const storeActions = initBusinessAndActions('legal_accounting');
    storeActions.setActiveLegalRole('secretaire_caisse');
    setLanguageAction('en');

    const html = renderToStaticMarkup(<LegalVaultView />);
    expect(html).toContain('data-testid="legal-vault-filing-only-banner"');
    expect(html).toContain('Filing-only scope:');
    expect(html).toContain('SECRETAIRE');
    expect(html).toContain('>1</div>');
    expect(html).not.toContain('DOC-2026-999');
    expect(html).not.toContain('Secret Defense Strategy Memo');
    expect(html).not.toContain('Retirer');
    expect(html).not.toContain('>Delete<');
  });

  it('renders SettingsScreen in preferences-only mode for operational roles and exposes TopBar menu', () => {
    const storeActions = initBusinessAndActions('logistics_delivery');
    storeActions.setActiveLogisticsRole('dispatcher');
    storeActions.setSettingsTab('business_fiscal');
    setLanguageAction('en');

    const settingsHtml = renderToStaticMarkup(
      <SettingsScreen onOpenVoucherModal={() => {}} />
    );
    expect(settingsHtml).toContain('data-testid="settings-preferences-only-banner"');
    expect(settingsHtml).toContain('Workspace Preferences');
    expect(settingsHtml).not.toContain('Business &amp; Fiscal');
    expect(settingsHtml).not.toContain('License &amp; Billing');
    expect(settingsHtml).not.toContain('Cloud &amp; Backup');

    const topBarHtml = renderToStaticMarkup(
      <TopBar onOpenVoucherModal={() => {}} />
    );
    expect(topBarHtml).toContain('aria-haspopup="menu"');
    expect(topBarHtml).toContain('Operator:');
  });
});
