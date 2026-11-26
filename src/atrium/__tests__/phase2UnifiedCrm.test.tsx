import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  loginWithPinAction,
  setLanguageAction,
  useAtriumStore,
} from '../../services/store';
import { Customer360Panel } from '../../components/common/crm/Customer360Panel';
import { CrmPartyMergeModal } from '../../components/common/crm/CrmPartyMergeModal';

function readStoreSnapshot() {
  let snap: ReturnType<typeof useAtriumStore> | null = null;
  const Probe: React.FC = () => {
    snap = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(<Probe />);
  return snap!;
}

describe('Phase 2 Step 3 (6.4): Unified CRM & Communication', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    atriumActions.resetAllData();
    setLanguageAction('fr');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
  });

  it('normalizes +213 phones, keeps shared family phones separate, and surfaces duplicate candidates', () => {
    const first = atriumActions.ensurePartyForEntity({
      sourceVertical: 'membership_session',
      entityType: 'member',
      entityId: 'mem_family_1',
      displayName: 'Amira Cherif',
      phone: '0661 22 33 44',
      email: 'amira.cherif@example.dz',
    });

    expect(first.party.phoneValid).toBe(true);
    expect(first.party.phoneE164).toBe('+213661223344');

    const second = atriumActions.ensurePartyForEntity({
      sourceVertical: 'education_cohort',
      entityType: 'student',
      entityId: 'stu_family_2',
      displayName: 'Yacine Cherif',
      phone: '00213661223344',
    });

    expect(second.party.id).not.toBe(first.party.id);
    expect(second.duplicates.length).toBeGreaterThanOrEqual(1);
    expect(second.duplicates[0].party.id).toBe(first.party.id);
    expect(second.duplicates[0].isSharedFamilyPhone).toBe(true);
    expect(second.duplicates[0].confidence).toBe('medium');
  });

  it('merges duplicate parties atomically across links, notes, tasks, comms, and preserves opt-out', () => {
    const src = atriumActions.ensurePartyForEntity({
      sourceVertical: 'trading_commercial',
      entityType: 'b2b_client',
      entityId: 'cli_dup_src',
      displayName: 'SARL Atlas Import',
      phone: '0550112233',
      nif: '199916010012345',
    }).party;

    const tgt = atriumActions.ensurePartyForEntity({
      sourceVertical: 'freelance_solo',
      entityType: 'freelance_client',
      entityId: 'fl_dup_tgt',
      displayName: 'Atlas Import & Distribution',
      phone: '+213550112233',
    }).party;

    atriumActions.upsertCrmParty({
      id: src.id,
      displayName: src.displayName,
      optOutAll: true,
      consentSms: false,
    });
    atriumActions.addCrmPartyNote({
      partyId: src.id,
      noteType: 'call',
      body: 'Client confirmed NIF',
      sourceVertical: 'trading_commercial',
    });
    atriumActions.upsertCrmFollowUpTask({
      partyId: src.id,
      title: 'Verify tax card',
      channel: 'call',
      dueAt: '2026-12-05T10:00:00.000Z',
    });

    const mergeRes = atriumActions.mergeCrmParties(src.id, tgt.id, 'Duplicate company profile');
    expect(mergeRes.ok).toBe(true);

    const snap = readStoreSnapshot();
    const mergedTarget = snap.crmParties.find((p) => p.id === tgt.id)!;
    expect(mergedTarget.nif).toBe('199916010012345');
    expect(mergedTarget.optOutAll).toBe(true);
    expect(mergedTarget.consentSms).toBe(false);
    expect(snap.crmParties.find((p) => p.id === src.id)).toBeUndefined();
    expect(snap.crmPartyLinks.filter((l) => l.partyId === tgt.id)).toHaveLength(2);
    expect(snap.crmPartyNotes.filter((n) => n.partyId === tgt.id)).toHaveLength(1);
    expect(snap.crmFollowUpTasks.filter((t) => t.partyId === tgt.id)).toHaveLength(1);
  });

  it('enforces FR/AR/EN missing-var warning, opt-out block, and failed provider retry lifecycle', () => {
    const { party } = atriumActions.ensurePartyForEntity({
      sourceVertical: 'membership_session',
      entityType: 'member',
      entityId: 'mem_comms_1',
      displayName: 'Kamel Benali',
      phone: '0770889900',
      email: 'kamel@example.dz',
    });

    const snapBefore = readStoreSnapshot();
    const payTpl = snapBefore.crmMessageTemplates.find((t) => t.code === 'PAYMENT_FOLLOWUP')!;
    expect(payTpl).toBeDefined();

    // Missing variables block send unless explicitly overridden
    const missingRes = atriumActions.sendCrmCommunication({
      partyId: party.id,
      templateId: payTpl.id,
      channel: 'whatsapp',
      language: 'ar',
      variables: { name: 'كمال', doc_number: 'FAC-1', amount: '', due_date: '2026-12-01', business_name: 'Atrium' },
      providerConfigured: true,
    });
    expect(missingRes.ok).toBe(false);
    expect(missingRes.errorCode).toBe('CRM_MISSING_TEMPLATE_VARS');
    expect(missingRes.missingVariables).toEqual(['amount']);

    // Unconfigured provider surfaces failure honestly, then retry succeeds once configured
    const failedRes = atriumActions.sendCrmCommunication({
      partyId: party.id,
      templateId: payTpl.id,
      channel: 'whatsapp',
      language: 'fr',
      variables: {
        name: 'Kamel Benali',
        doc_number: 'FAC-2026-00012',
        amount: '12 000 DZD',
        due_date: '2026-12-01',
        business_name: 'Atrium',
      },
      providerConfigured: false,
    });
    expect(failedRes.ok).toBe(false);
    expect(failedRes.log?.status).toBe('failed');
    expect(failedRes.log?.errorCode).toBe('PROVIDER_NOT_CONFIGURED');

    const retried = atriumActions.retryCrmCommunication(failedRes.log!.id, {
      providerConfigured: true,
    });
    expect(retried?.status).toBe('sent');
    expect(retried?.attempts).toBe(2);

    // Opt-out blocks subsequent sends
    atriumActions.upsertCrmParty({
      id: party.id,
      displayName: party.displayName,
      optOutAll: true,
    });
    const blockedRes = atriumActions.sendCrmCommunication({
      partyId: party.id,
      templateId: payTpl.id,
      channel: 'whatsapp',
      language: 'en',
      variables: {
        name: 'Kamel Benali',
        doc_number: 'FAC-2026-00012',
        amount: '12 000 DZD',
        due_date: '2026-12-01',
        business_name: 'Atrium',
      },
      providerConfigured: true,
    });
    expect(blockedRes.ok).toBe(false);
    expect(blockedRes.log?.status).toBe('blocked_opt_out');
    expect(blockedRes.errorCode).toBe('CRM_OPT_OUT_ALL');
  });

  it('renders Customer360Panel and CrmPartyMergeModal with normalized phone and Customer 360 KPIs', () => {
    const snap = readStoreSnapshot();
    const member = snap.members[0];
    expect(member).toBeDefined();

    const p1 = atriumActions.ensurePartyForEntity({
      sourceVertical: 'membership_session',
      entityType: 'member',
      entityId: member.id,
      displayName: member.fullName,
      phone: member.phoneNumber || '0661001122',
    }).party;

    const p2 = atriumActions.ensurePartyForEntity({
      sourceVertical: 'trading_commercial',
      entityType: 'b2b_client',
      entityId: 'cli_merge_preview',
      displayName: 'Duplicate Member Profile',
      phone: member.phoneNumber || '0661001122',
    }).party;

    const html = renderToStaticMarkup(
      <Customer360Panel
        sourceVertical="membership_session"
        entityType="member"
        entityId={member.id}
        displayName={member.fullName}
        phone={member.phoneNumber || '0661001122'}
      />
    );
    expect(html).toContain('customer-360-panel');
    expect(html).toContain('crm-duplicate-banner');

    const mergeHtml = renderToStaticMarkup(
      <CrmPartyMergeModal isOpen sourceParty={p2} targetParty={p1} onClose={() => {}} />
    );
    expect(mergeHtml).toContain('crm-merge-modal');
    expect(mergeHtml).toContain('Duplicate Member Profile');
  });
});
