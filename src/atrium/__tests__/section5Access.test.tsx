import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccessRestrictedView } from '../../components/common/AccessRestrictedView';
import { MembershipFinanceView } from '../../components/screens/membership/MembershipFinanceView';
import { setLanguageAction, switchBusinessAction, useAtriumStore } from '../../services/store';

function initMembershipStore() {
  let businesses: Array<{ id: string; category: string }> = [];
  const Probe: React.FC = () => {
    businesses = useAtriumStore().businesses.map((b) => ({ id: b.id, category: b.category }));
    return null;
  };
  renderToStaticMarkup(<Probe />);
  const gym = businesses.find((b) => b.category === 'membership_session');
  if (gym) switchBusinessAction(gym.id);
}

describe('Section 5 AccessRestrictedView & MembershipFinanceView UI verification', () => {
  beforeEach(() => {
    setLanguageAction('en');
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
    initMembershipStore();
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
});
