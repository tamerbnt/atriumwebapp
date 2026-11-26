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
import { REMINDER_EVENT_CATALOG } from '../../utils/reminderEngine';
import { ReminderEngineWorkspace } from '../../components/common/reminders/ReminderEngineWorkspace';

function readStoreSnapshot() {
  let snap: ReturnType<typeof useAtriumStore> | null = null;
  const Probe: React.FC = () => {
    snap = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(<Probe />);
  return snap!;
}

describe('Phase 2 Step 4 (6.5): Reminder & Notification Engine', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    atriumActions.resetAllData();
    setLanguageAction('fr');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
  });

  it('seeds all 13 event rules + Africa/Algiers quiet hours and triggers idempotent notifications without duplicates', () => {
    const initialSnap = readStoreSnapshot();
    expect(initialSnap.reminderRules).toHaveLength(13);
    expect(initialSnap.reminderQuietHours.timezone).toBe('Africa/Algiers');

    const nowIso = '2026-11-26T10:00:00.000Z';
    const expiringDate = '2026-11-29';
    atriumActions.addMember({
      fullName: 'Samir Boudiaf',
      email: 'samir.boudiaf@example.com',
      phoneNumber: '0550778899',
      membershipPlanId: initialSnap.plans[0]?.id || 'plan_1',
      remainingSessions: 12,
      gender: 'Male',
      status: 'Active',
      startDate: '2026-10-29',
      expirationDate: expiringDate,
    });

    const firstScan = atriumActions.runReminderEngineScan({
      nowIso,
      showSummaryToast: false,
    });
    expect(firstScan.createdCount).toBeGreaterThanOrEqual(1);
    expect(firstScan.sentCount).toBeGreaterThanOrEqual(1);

    const snapAfterFirst = readStoreSnapshot();
    expect(
      snapAfterFirst.notifications.some((n) => n.title.includes('Samir Boudiaf'))
    ).toBe(true);

    // Second scan at same window must produce 0 duplicates
    const secondScan = atriumActions.runReminderEngineScan({
      nowIso,
      showSummaryToast: false,
    });
    expect(secondScan.createdCount).toBe(0);
    expect(secondScan.logs).toHaveLength(0);
  });

  it('defers external channels during quiet hours and flushes them outside quiet hours while honoring CRM opt-out', () => {
    atriumActions.saveReminderQuietHours({
      enabled: true,
      startTime: '21:00',
      endTime: '08:00',
      timezone: 'Africa/Algiers',
      allowInAppDuringQuiet: true,
    });

    const snap0 = readStoreSnapshot();
    atriumActions.addMember({
      fullName: 'Nadia Benali',
      email: 'nadia.benali@example.com',
      phoneNumber: '0661334455',
      membershipPlanId: snap0.plans[0]?.id || 'plan_1',
      remainingSessions: 12,
      gender: 'Female',
      status: 'Active',
      startDate: '2026-10-29',
      expirationDate: '2026-11-28',
    });

    const snapWithMember = readStoreSnapshot();
    const nadia = snapWithMember.members.find((m) => m.fullName === 'Nadia Benali')!;
    expect(nadia).toBeDefined();

    // Link CRM party for Nadia (with WhatsApp consent enabled initially)
    const { party } = atriumActions.ensurePartyForEntity({
      sourceVertical: 'membership_session',
      entityType: 'member',
      entityId: nadia.id,
      displayName: nadia.fullName,
      phone: nadia.phoneNumber,
    });
    expect(party.optOutAll).toBe(false);

    // 22:30 Algiers = 21:30 UTC (inside quiet hours)
    const quietTimeIso = '2026-11-26T21:30:00.000Z';
    const quietScan = atriumActions.runReminderEngineScan({
      nowIso: quietTimeIso,
      showSummaryToast: false,
    });

    const nadiaLogs = quietScan.logs.filter((l) => l.entityId === nadia.id);
    const inAppLog = nadiaLogs.find((l) => l.channel === 'in_app');
    const waLog = nadiaLogs.find((l) => l.channel === 'whatsapp');

    expect(inAppLog?.status).toBe('sent');
    expect(waLog?.status).toBe('deferred_quiet_hours');
    expect(waLog?.scheduledFor).toBe('2026-11-27T07:00:00.000Z');

    // Flushing while still in quiet hours leaves it deferred
    const prematureFlush = atriumActions.flushDeferredReminders({
      nowIso: '2026-11-26T22:00:00.000Z',
    });
    expect(prematureFlush.flushedCount).toBe(0);
    expect(prematureFlush.stillDeferred).toBeGreaterThanOrEqual(1);

    // Flushing at 09:00 Algiers = 08:00 UTC (outside quiet hours) sends deferred WhatsApp and links CRM log
    const morningFlush = atriumActions.flushDeferredReminders({
      nowIso: '2026-11-27T08:00:00.000Z',
    });
    expect(morningFlush.flushedCount).toBeGreaterThanOrEqual(1);

    const snapAfterFlush = readStoreSnapshot();
    const flushedWa = snapAfterFlush.reminderDeliveryLogs.find((l) => l.id === waLog?.id);
    expect(flushedWa?.status).toBe('sent');
    expect(flushedWa?.crmCommLogId).toBeDefined();
    expect(
      snapAfterFlush.crmCommunicationLogs.some((c) => c.id === flushedWa?.crmCommLogId)
    ).toBe(true);

    // Now test CRM opt-out enforcement on an opted-out member
    atriumActions.addMember({
      fullName: 'Karim OptOut',
      email: 'karim.optout@example.com',
      phoneNumber: '0770556677',
      membershipPlanId: snap0.plans[0]?.id || 'plan_1',
      remainingSessions: 12,
      gender: 'Male',
      status: 'Active',
      startDate: '2026-10-29',
      expirationDate: '2026-11-28',
    });
    const karim = readStoreSnapshot().members.find((m) => m.fullName === 'Karim OptOut')!;
    const karimParty = atriumActions.ensurePartyForEntity({
      sourceVertical: 'membership_session',
      entityType: 'member',
      entityId: karim.id,
      displayName: karim.fullName,
      phone: karim.phoneNumber,
    }).party;
    atriumActions.upsertCrmParty({
      id: karimParty.id,
      displayName: karimParty.displayName,
      optOutAll: true,
    });

    const dayScan = atriumActions.runReminderEngineScan({
      nowIso: '2026-11-27T10:00:00.000Z',
      showSummaryToast: false,
    });
    const karimWa = dayScan.logs.find(
      (l) => l.entityId === karim.id && l.channel === 'whatsapp'
    );
    const karimInApp = dayScan.logs.find(
      (l) => l.entityId === karim.id && l.channel === 'in_app'
    );
    expect(karimWa?.status).toBe('blocked_opt_out');
    expect(karimInApp?.status).toBe('sent');
  });

  it('renders ReminderEngineWorkspace with quiet hours controls, all 13 event rules, and delivery log', () => {
    atriumActions.runReminderEngineScan({
      nowIso: '2026-11-26T10:00:00.000Z',
      showSummaryToast: false,
    });

    const html = renderToStaticMarkup(<ReminderEngineWorkspace />);
    expect(html).toContain('data-testid="reminder-engine-workspace"');
    expect(html).toContain('data-testid="reminder-quiet-hours-panel"');
    expect(html).toContain('data-testid="reminder-rules-list"');
    expect(html).toContain('data-testid="reminder-delivery-log-panel"');
    for (const meta of REMINDER_EVENT_CATALOG) {
      expect(html).toContain(`reminder-rule-row-${meta.eventType}`);
    }
  });
});
