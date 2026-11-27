import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOnlineBookingLink,
  buildWhatsappBookingUrl,
  checkClosingTimeSpan,
  computeAppointmentEndTime,
  computeSalonCheckoutSettlement,
  createDefaultWeeklyHours,
  detectClientAllergyConflicts,
  evaluateConsumableDepletionPlan,
  evaluateDepositCancellationPolicy,
  evaluateHammamSessionSlot,
  evaluateStylistAvailability,
  findStylistAppointmentOverlap,
  migrateSalonClientsWalkInVisibility,
  normalizeSalonMemberRecord,
} from './appointmentDepth';
import type { Appointment, Member, Product, SalonHammamSession, StylistScheduleConfig } from '../types/index';

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt_1',
    tenantId: 'acc_01',
    facilityId: 'branch_salon_hydra',
    clientId: 'client_1',
    clientName: 'Yasmine',
    clientPhone: '0550123456',
    staffId: 'stylist_1',
    staffName: 'Lina',
    serviceId: 'srv_1',
    serviceName: 'Brushing',
    date: '2026-12-01',
    startTime: '14:00',
    endTime: '15:00',
    durationMinutes: 60,
    price: 2500,
    status: 'Confirmed',
    createdAt: '2026-11-28T10:00:00Z',
    ...overrides,
  };
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'mem_1',
    tenantId: 'acc_01',
    facilityId: 'branch_salon_hydra',
    fullName: 'Walkin Nadia',
    email: '',
    phoneNumber: '0555998877',
    status: 'Active',
    startDate: '2026-11-28',
    expirationDate: '2099-12-31',
    remainingSessions: 0,
    gender: 'Female',
    source: 'Walk-in Salon',
    membershipPlanName: 'Walk-in Service',
    createdAt: '2026-11-28T10:00:00Z',
    updatedAt: '2026-11-28T10:00:00Z',
    ...overrides,
  };
}

test('normalizeSalonMemberRecord & migration repair legacy walk-in clients missing segmentData & clientType', () => {
  const legacyWalkIn = makeMember();
  const normalized = normalizeSalonMemberRecord(legacyWalkIn);
  assert.equal(normalized.clientType, 'walkin');
  assert.equal(normalized.segmentData?.isWalkIn, true);
  assert.equal(normalized.segmentData?.totalVisits, 1);
  assert.ok(Array.isArray(normalized.segmentData?.allergies));

  const migrated = migrateSalonClientsWalkInVisibility([
    legacyWalkIn,
    makeMember({
      id: 'mem_vip',
      source: 'Direct',
      membershipPlanName: undefined,
      segmentData: { lifetimeSpent: 85000, isVip: true },
    }),
  ]);
  assert.equal(migrated[0].clientType, 'walkin');
  assert.equal(migrated[1].clientType, 'vip');
});

test('computeAppointmentEndTime & findStylistAppointmentOverlap catch conflicts and ignore Cancelled/NoShow', () => {
  const end = computeAppointmentEndTime('14:30', 90);
  assert.equal(end.endTime, '16:00');
  assert.equal(end.crossesMidnight, false);

  const existing = [
    makeAppointment({ id: 'apt_a', startTime: '14:00', endTime: '15:00', durationMinutes: 60, status: 'Confirmed' }),
    makeAppointment({ id: 'apt_b', startTime: '16:00', endTime: '17:00', durationMinutes: 60, status: 'Cancelled' }),
  ];

  // Overlaps apt_a
  const conflict = findStylistAppointmentOverlap({
    appointments: existing,
    staffId: 'stylist_1',
    date: '2026-12-01',
    startTime: '14:30',
    durationMinutes: 45,
  });
  assert.equal(conflict?.id, 'apt_a');

  // Duration change when editing apt_a into 16:00 slot (apt_b is Cancelled so ignored)
  const selfEdited = findStylistAppointmentOverlap({
    appointments: existing,
    staffId: 'stylist_1',
    date: '2026-12-01',
    startTime: '15:30',
    durationMinutes: 90,
    excludeAppointmentId: 'apt_a',
  });
  assert.equal(selfEdited, null);
});

test('evaluateStylistAvailability flags closing time span, break window, and time-off ranges', () => {
  const closing = checkClosingTimeSpan('19:30', 60, '20:00');
  assert.equal(closing.exceedsClosingTime, true);
  assert.equal(closing.overflowMinutes, 30);

  const weekly = createDefaultWeeklyHours();
  const schedule: StylistScheduleConfig = {
    id: 'sched_1',
    staffId: 'stylist_1',
    staffName: 'Lina',
    salonClosingTime: '20:00',
    weeklyHours: weekly,
    timeOffRanges: [{ id: 'off_1', startDate: '2026-12-10', endDate: '2026-12-12', reason: 'Congé' }],
  };

  // Break window 13:00-14:00 on Tuesday 2026-12-01
  const breakCheck = evaluateStylistAvailability({
    schedule,
    appointments: [],
    staffId: 'stylist_1',
    date: '2026-12-01',
    startTime: '13:15',
    durationMinutes: 30,
  });
  assert.equal(breakCheck.available, false);
  assert.ok(breakCheck.issues.includes('IN_BREAK_WINDOW'));

  // Time-off range
  const offCheck = evaluateStylistAvailability({
    schedule,
    appointments: [],
    staffId: 'stylist_1',
    date: '2026-12-11',
    startTime: '10:00',
    durationMinutes: 45,
  });
  assert.equal(offCheck.available, false);
  assert.ok(offCheck.issues.includes('TIME_OFF'));

  // Clean morning slot
  const okCheck = evaluateStylistAvailability({
    schedule,
    appointments: [],
    staffId: 'stylist_1',
    date: '2026-12-01',
    startTime: '10:00',
    durationMinutes: 60,
  });
  assert.equal(okCheck.available, true);
  assert.equal(okCheck.issues.length, 0);
});

test('detectClientAllergyConflicts flags matched service keywords and consumables', () => {
  const client = makeMember({ segmentData: { allergies: ['Ammoniaque', 'Latex'] } });
  const conflict = detectClientAllergyConflicts(client, {
    name: 'Coloration Complète',
    category: 'Hair',
    allergyKeywords: ['Ammoniaque', 'Peroxyde'],
    consumables: [{ productId: 'p1', productName: 'Oxydant Sans Ammoniaque', quantity: 1 }],
  });
  assert.equal(conflict.hasConflict, true);
  assert.deepEqual(conflict.matchedKeywords, ['Ammoniaque']);

  const safe = detectClientAllergyConflicts(client, {
    name: 'Brushing Simple',
    category: 'Hair',
    allergyKeywords: [],
    consumables: [],
  });
  assert.equal(safe.hasConflict, false);
});

test('evaluateDepositCancellationPolicy refunds outside cutoff and forfeits inside cutoff or on NoShow', () => {
  const apt = makeAppointment({
    date: '2026-12-10',
    startTime: '14:00',
    depositCentimes: 100000,
    depositStatus: 'held',
    cancellationCutoffHours: 24,
  });

  // Cancelled 48h before -> refund
  const refundRes = evaluateDepositCancellationPolicy({
    appointment: apt,
    cancelledAtIso: '2026-12-08T14:00:00Z',
    newStatus: 'Cancelled',
  });
  assert.equal(refundRes.depositStatus, 'refunded');
  assert.equal(refundRes.refundedDepositCentimes, 100000);
  assert.equal(refundRes.forfeitedDepositCentimes, 0);

  // Cancelled 4h before -> forfeit
  const lateRes = evaluateDepositCancellationPolicy({
    appointment: apt,
    cancelledAtIso: '2026-12-10T10:00:00Z',
    newStatus: 'Cancelled',
  });
  assert.equal(lateRes.depositStatus, 'forfeited');
  assert.equal(lateRes.refundedDepositCentimes, 0);
  assert.equal(lateRes.forfeitedDepositCentimes, 100000);

  // NoShow even with future timestamp -> forfeit
  const noShowRes = evaluateDepositCancellationPolicy({
    appointment: apt,
    cancelledAtIso: '2026-12-08T10:00:00Z',
    newStatus: 'NoShow',
  });
  assert.equal(noShowRes.depositStatus, 'forfeited');
});

test('evaluateConsumableDepletionPlan prevents double deduction and computes exact stock decrements', () => {
  const products: Pick<Product, 'id' | 'name' | 'stockQuantity'>[] = [
    { id: 'prod_dye', name: 'Tube Couleur', stockQuantity: 10 },
    { id: 'prod_serum', name: 'Sérum Kératine', stockQuantity: 1 },
  ];
  const service = {
    consumables: [
      { productId: 'prod_dye', productName: 'Tube Couleur', quantity: 2 },
      { productId: 'prod_serum', productName: 'Sérum Kératine', quantity: 2 },
    ],
  };

  const plan = evaluateConsumableDepletionPlan({ service, products, alreadyDeducted: false });
  assert.equal(plan.lines.length, 2);
  assert.equal(plan.lines[0].nextStock, 8);
  assert.equal(plan.lines[1].nextStock, 0);
  assert.equal(plan.lines[1].shortfallQty, 1);

  const idempotent = evaluateConsumableDepletionPlan({ service, products, alreadyDeducted: true });
  assert.equal(idempotent.lines.length, 0);
});

test('computeSalonCheckoutSettlement settles prepaid package, held deposit, gift card, and loyalty', () => {
  const settlement = computeSalonCheckoutSettlement({
    servicePriceDzd: 6000,
    retailTotalDzd: 2000,
    depositCentimes: 100000, // 1000 DZD
    depositStatus: 'held',
    prepaidPackage: { status: 'active', remainingSessions: 3 },
    giftCard: { status: 'active', remainingCentimes: 50000 }, // 500 DZD
    loyaltyPointsToRedeem: 0,
  });

  // 6000 service covered by package; remaining retail = 2000 -> -1000 deposit -> -500 gift card -> 500 DZD net
  assert.equal(settlement.packageCoveredCentimes, 600000);
  assert.equal(settlement.depositAppliedCentimes, 100000);
  assert.equal(settlement.giftCardAppliedCentimes, 50000);
  assert.equal(settlement.netPayableDzd, 500);
});

test('buildOnlineBookingLink, buildWhatsappBookingUrl & evaluateHammamSessionSlot enforce safety & capacity', () => {
  const bookingLink = buildOnlineBookingLink({
    businessId: 'biz_salon',
    branchId: 'branch_salon_hydra',
    serviceId: 'srv_1',
  });
  assert.ok(bookingLink.includes('biz=biz_salon'));
  assert.ok(bookingLink.includes('service=srv_1'));

  const waUrl = buildWhatsappBookingUrl({
    phone: '0550123456',
    clientName: 'Amira',
    businessName: 'Luxe Beauty',
    bookingLink,
  });
  assert.ok(waUrl.startsWith('https://wa.me/213550123456?text='));

  const existingHammam: SalonHammamSession[] = [
    {
      id: 'ham_1',
      cabinName: 'Hammam Femmes 1',
      genderBlock: 'women',
      clientName: 'Sara',
      date: '2026-12-01',
      startTime: '14:00',
      endTime: '15:30',
      capacity: 4,
      bookedCount: 3,
      addons: ['Savon Noir'],
      priceCentimes: 350000,
      status: 'Booked',
      createdAt: '2026-11-28T10:00:00Z',
    },
  ];

  // Different gender block in same slot -> conflict
  const genderBad = evaluateHammamSessionSlot({
    existingSessions: existingHammam,
    cabinName: 'Hammam Femmes 1',
    genderBlock: 'men',
    date: '2026-12-01',
    startTime: '14:30',
    endTime: '15:30',
    cabinCapacity: 4,
  });
  assert.equal(genderBad.allowed, false);
  assert.equal(genderBad.reason, 'GENDER_BLOCK_CONFLICT');

  // 1 seat remaining -> 2 seats rejected, 1 seat allowed
  const overCap = evaluateHammamSessionSlot({
    existingSessions: existingHammam,
    cabinName: 'Hammam Femmes 1',
    genderBlock: 'women',
    date: '2026-12-01',
    startTime: '14:30',
    endTime: '15:30',
    requestedSeats: 2,
    cabinCapacity: 4,
  });
  assert.equal(overCap.allowed, false);
  assert.equal(overCap.reason, 'CAPACITY_EXCEEDED');

  const okCap = evaluateHammamSessionSlot({
    existingSessions: existingHammam,
    cabinName: 'Hammam Femmes 1',
    genderBlock: 'women',
    date: '2026-12-01',
    startTime: '14:30',
    endTime: '15:30',
    requestedSeats: 1,
    cabinCapacity: 4,
  });
  assert.equal(okCap.allowed, true);
  assert.equal(okCap.remainingCapacity, 0);
});
