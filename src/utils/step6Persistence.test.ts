import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendEduAttendanceChange,
  buildPersistedChairStation,
  clampPartialRefundItems,
  computeDrawerExpectedCentimes,
  computeElapsedMinutesFromIso,
  dedupeEduAttendanceRecords,
  evaluateMemberCheckIn,
  evaluateProvisionalZReportDrift,
  requiresVarianceManagerPin,
} from './step6Persistence';

test('1.1 check-in guard blocks duplicate within 5 minutes unless override reason given', () => {
  const member = {
    id: 'm_1',
    status: 'Active' as const,
    expirationDate: '2027-01-01',
    remainingSessions: 8,
  };
  const recentLog = [
    {
      memberId: 'm_1',
      timestamp: '2026-11-26T10:00:00.000Z',
      accessStatus: 'Granted' as const,
    },
  ];

  const blocked = evaluateMemberCheckIn(member, recentLog, '2026-11-26T10:03:00.000Z');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.duplicateBlocked, true);
  assert.equal(blocked.shouldDecrementSession, false);
  assert.equal(blocked.remainingSessionsAfter, 8);

  const overridden = evaluateMemberCheckIn(member, recentLog, '2026-11-26T10:03:00.000Z', {
    overrideReason: 'Re-entry verified by coach',
  });
  assert.equal(overridden.allowed, true);
  assert.equal(overridden.duplicateBlocked, false);
  assert.equal(overridden.shouldDecrementSession, true);
  assert.equal(overridden.remainingSessionsAfter, 7);
});

test('1.1 frozen or expired members do not decrement sessions', () => {
  const frozen = evaluateMemberCheckIn(
    { id: 'm_2', status: 'Frozen', expirationDate: '2027-01-01', remainingSessions: 5 },
    [],
    '2026-11-26T10:00:00.000Z'
  );
  assert.equal(frozen.allowed, false);
  assert.equal(frozen.accessStatus, 'Denied_Frozen');
  assert.equal(frozen.shouldDecrementSession, false);
  assert.equal(frozen.remainingSessionsAfter, 5);
});

test('1.2 edu attendance deduplicates by (businessId, sessionId, studentId) and tracks change history', () => {
  const deduped = dedupeEduAttendanceRecords([
    {
      id: 'att_old',
      businessId: 'b1',
      tenantId: 't1',
      facilityId: 'br1',
      sessionId: 's1',
      cohortId: 'c1',
      studentId: 'st1',
      studentName: 'Amine',
      status: 'Present',
      recordedAt: '2026-11-26T08:00:00.000Z',
    },
    {
      id: 'att_new',
      businessId: 'b1',
      tenantId: 't1',
      facilityId: 'br1',
      sessionId: 's1',
      cohortId: 'c1',
      studentId: 'st1',
      studentName: 'Amine',
      status: 'Late',
      recordedAt: '2026-11-26T08:15:00.000Z',
    },
  ]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].id, 'att_new');
  assert.equal(deduped[0].status, 'Late');

  const history = appendEduAttendanceChange(
    deduped[0],
    'Excused',
    'staff_director',
    'Medical note',
    '2026-11-26T09:00:00.000Z'
  );
  assert.equal(history.length, 1);
  assert.equal(history[0].previousStatus, 'Late');
  assert.equal(history[0].newStatus, 'Excused');
});

test('1.3 salon chair station computes live elapsed minutes from ISO startedAt', () => {
  const nowMs = Date.parse('2026-11-26T11:30:00.000Z');
  assert.equal(computeElapsedMinutesFromIso('2026-11-26T10:45:00.000Z', nowMs), 45);
  const station = buildPersistedChairStation(
    {
      workstationId: 'ws_1',
      workstationName: 'Fauteuil 1',
      stage: 'in_progress',
      startTime: '2026-11-26T11:10:00.000Z',
    },
    nowMs
  );
  assert.equal(station.elapsedMinutes, 20);
});

test('1.4 POS cash drawer computes exact centimes, variance PIN rule & provisional Z drift', () => {
  const summary = computeDrawerExpectedCentimes({
    openingFloatCentimes: 1500000, // 15,000 DZD
    cashSalesCentimes: 850050, // 8,500.50 DZD
    cashMovements: [
      { direction: 'out', paymentMethod: 'Cash', amountCentimes: 120000 }, // 1,200 DZD
      { direction: 'in', paymentMethod: 'Cash', amountCentimes: 50000 }, // 500 DZD
      { direction: 'out', paymentMethod: 'Card', amountCentimes: 99900 }, // ignored (Card)
    ],
    cashRefundsCentimes: 30050, // 300.50 DZD
  });

  assert.equal(summary.expectedCashCentimes, 2250000); // 22,500.00 DZD
  assert.equal(requiresVarianceManagerPin(-60000, 50000), true);
  assert.equal(requiresVarianceManagerPin(-20000, 50000), false);
  assert.equal(requiresVarianceManagerPin(100000, 50000), false);

  const clean = evaluateProvisionalZReportDrift(
    {
      cashSalesCentimes: 850050,
      cardSalesCentimes: 200000,
      baridimobSalesCentimes: 0,
      refundsTotalCentimes: 30050,
    },
    {
      cashSalesCentimes: 850050,
      cardSalesCentimes: 200000,
      baridimobSalesCentimes: 0,
      refundsTotalCentimes: 30050,
    }
  );
  assert.equal(clean.driftDetected, false);
  assert.equal(clean.nextStatus, 'finalized');

  const drifted = evaluateProvisionalZReportDrift(
    {
      cashSalesCentimes: 850050,
      cardSalesCentimes: 200000,
      baridimobSalesCentimes: 0,
      refundsTotalCentimes: 30050,
    },
    {
      cashSalesCentimes: 950050,
      cardSalesCentimes: 200000,
      baridimobSalesCentimes: 0,
      refundsTotalCentimes: 30050,
    }
  );
  assert.equal(drifted.driftDetected, true);
  assert.equal(drifted.nextStatus, 'drift_flagged');
});

test('1.5 partial refund clamps quantities against prior refunds and skips service lines cleanly', () => {
  const sale = {
    id: 'sale_123456',
    items: [
      { productId: 'p1', productName: 'Eau', quantity: 4, unitPrice: 100, totalPrice: 400 },
      { productId: '', productName: 'Coupe Express (Service)', quantity: 1, unitPrice: 500, totalPrice: 500 },
    ],
  };

  const priorMovements = [
    {
      productId: 'p1',
      productName: 'Eau',
      type: 'Return' as const,
      quantity: 1,
      reason: 'Refund #123456: Opened bottle',
    },
  ];

  const attempt = clampPartialRefundItems(
    sale,
    [
      { productId: 'p1', productName: 'Eau', quantity: 5 },
      { productId: '', productName: 'Coupe Express (Service)', quantity: 1 },
    ],
    priorMovements
  );

  assert.equal(attempt.hasExceededRequest, true);
  assert.equal(attempt.validItems[0].quantity, 3);
  assert.equal(attempt.validItems[1].productId, '');
  assert.equal(attempt.isFullRefund, true);
});
