import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  RentableUnit,
  RentalAssetCheckLog,
  RentalBooking,
  RentalContractTemplate,
  RentalCoworkingSubscription,
  RentalPricingRule,
} from '../types/index';
import {
  applyPaymentToStagedSchedule,
  buildRentalBookingsIcs,
  buildWeddingPaymentSchedule,
  computeLateReturnFee,
  computeRentalDurationHours,
  computeRentalPricingWithRules,
  detectRentalBookingOverlap,
  evaluateCoworkingSubscriptionUsage,
  evaluateGearAssetAvailability,
  evaluateVehicleFleetAlerts,
  filterBookingSegmentsForDate,
  parseIcsBookings,
  renderRentalContractDocument,
  validateDepositDeduction,
} from './rentalDepth';

const sampleHall: RentableUnit = {
  id: 'unit_hall_1',
  tenantId: 'acc_test',
  facilityId: 'br_1',
  name: 'Salle El Aurassi',
  code: 'HAL-01',
  type: 'Hall',
  rentalMode: 'venue',
  capacity: 250,
  hourlyRate: 15000,
  dailyRate: 110000,
  currency: 'DZD',
  amenities: ['Stage', 'Audio'],
  status: 'Available',
  description: 'Wedding and seminar hall',
  graceMinutes: 15,
  lateHourlyRate: 18000,
  createdAt: '2026-11-01T08:00:00Z',
};

const existingBooking: RentalBooking = {
  id: 'bk_existing_1',
  tenantId: 'acc_test',
  facilityId: 'br_1',
  renterId: 'rnt_1',
  renterName: 'Amine Wedding',
  renterPhone: '+213550112233',
  unitId: 'unit_hall_1',
  unitName: 'Salle El Aurassi',
  unitType: 'Hall',
  purpose: 'Reception',
  startDateTime: '2026-11-28T18:00:00Z',
  endDateTime: '2026-11-29T02:00:00Z',
  durationHours: 8,
  attendeeCount: 180,
  status: 'Confirmed',
  baseAmount: 110000,
  addonsAmount: 0,
  totalAmount: 110000,
  currency: 'DZD',
  depositAmount: 40000,
  depositStatus: 'Held',
  paidAmount: 33000,
  balanceDue: 77000,
  addons: [],
  contractSigned: true,
  createdAt: '2026-11-20T10:00:00Z',
  updatedAt: '2026-11-20T10:00:00Z',
};

describe('7.5 rental_booking pure domain engine', () => {
  it('handles overnight and multi-day booking durations and timeline day splitting', () => {
    const dur = computeRentalDurationHours('2026-11-28T18:00:00Z', '2026-11-29T02:00:00Z');
    assert.equal(dur.valid, true);
    assert.equal(dur.durationHours, 8);
    assert.equal(dur.spansMultipleDays, true);

    const invalid = computeRentalDurationHours('2026-11-28T18:00:00Z', '2026-11-28T16:00:00Z');
    assert.equal(invalid.valid, false);

    const day1Segments = filterBookingSegmentsForDate([existingBooking], '2026-11-28');
    assert.equal(day1Segments.length, 1);
    assert.equal(day1Segments[0].startHour, 18);
    assert.equal(day1Segments[0].endHour, 24);
    assert.equal(day1Segments[0].continuesToNextDay, true);

    const day2Segments = filterBookingSegmentsForDate([existingBooking], '2026-11-29');
    assert.equal(day2Segments.length, 1);
    assert.equal(day2Segments[0].continuesFromPriorDay, true);
  });

  it('prevents double-booking overlaps, permits adjacent slots, and excludes self on edit', () => {
    const overlap = detectRentalBookingOverlap(
      {
        unitId: 'unit_hall_1',
        startDateTime: '2026-11-28T22:00:00Z',
        endDateTime: '2026-11-29T01:00:00Z',
      },
      [existingBooking]
    );
    assert.equal(overlap.hasOverlap, true);
    assert.equal(overlap.reasonCode, 'RENTAL_BOOKING_OVERLAP');

    const adjacent = detectRentalBookingOverlap(
      {
        unitId: 'unit_hall_1',
        startDateTime: '2026-11-29T02:00:00Z',
        endDateTime: '2026-11-29T06:00:00Z',
      },
      [existingBooking]
    );
    assert.equal(adjacent.hasOverlap, false);

    const selfEdit = detectRentalBookingOverlap(
      {
        id: 'bk_existing_1',
        unitId: 'unit_hall_1',
        startDateTime: '2026-11-28T19:00:00Z',
        endDateTime: '2026-11-29T03:00:00Z',
      },
      [existingBooking]
    );
    assert.equal(selfEdit.hasOverlap, false);
  });

  it('computes seasonal and weekend multipliers cleanly', () => {
    const rules: RentalPricingRule[] = [
      {
        id: 'rule_summer_weekend',
        name: 'High Season Weekend',
        unitType: 'Hall',
        weekendMultiplier: 1.2,
        weekendDays: [5, 6], // Friday, Saturday in Algeria
        seasonStartDate: '2026-11-25',
        seasonEndDate: '2026-11-30',
        seasonalMultiplier: 1.15,
        isActive: true,
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];
    // 2026-11-28 is a Saturday (all hours before midnight are Saturday)
    const breakdown = computeRentalPricingWithRules({
      unit: sampleHall,
      startDateTime: '2026-11-28T12:00:00Z',
      endDateTime: '2026-11-28T20:00:00Z',
      pricingRules: rules,
      addons: [{ id: 'a1', name: 'DJ Rig', unitPrice: 10000, quantity: 1, totalPrice: 10000 }],
    });
    assert.equal(breakdown.appliedRuleId, 'rule_summer_weekend');
    assert.equal(breakdown.weekendHours, 8);
    // 110,000 * 1.15 * 1.20 = 151,800 + 10,000 addon = 161,800
    assert.equal(breakdown.adjustedBaseDzd, 151800);
    assert.equal(breakdown.totalDzd, 161800);
  });

  it('blocks deposit deduction exceeding held deposit and enforces reason', () => {
    const tooHigh = validateDepositDeduction(40000, 55000, 'Broken audio console');
    assert.equal(tooHigh.valid, false);
    assert.equal(tooHigh.errorCode, 'DEDUCTION_EXCEEDS_DEPOSIT');
    assert.equal(tooHigh.clampedAmount, 40000);

    const zero = validateDepositDeduction(40000, 0, 'Nothing');
    assert.equal(zero.valid, false);
    assert.equal(zero.errorCode, 'DEDUCTION_MUST_BE_POSITIVE');

    const missingReason = validateDepositDeduction(40000, 15000, '   ');
    assert.equal(missingReason.valid, false);
    assert.equal(missingReason.errorCode, 'DEDUCTION_REASON_REQUIRED');

    const valid = validateDepositDeduction(40000, 15000, 'Tablecloth burn repair');
    assert.equal(valid.valid, true);
    assert.equal(valid.clampedAmount, 15000);
  });

  it('calculates late return fees respecting grace period', () => {
    const withinGrace = computeLateReturnFee({
      scheduledEndDateTime: '2026-11-29T02:00:00Z',
      actualReturnDateTime: '2026-11-29T02:10:00Z',
      hourlyRate: 10000,
      graceMinutes: 15,
    });
    assert.equal(withinGrace.withinGrace, true);
    assert.equal(withinGrace.lateFeeDzd, 0);

    const overdue = computeLateReturnFee({
      scheduledEndDateTime: '2026-11-29T02:00:00Z',
      actualReturnDateTime: '2026-11-29T03:45:00Z', // 105m -> 90m past 15m grace -> 2 billable hrs
      hourlyRate: 10000,
      graceMinutes: 15,
      overtimeMultiplier: 1.5,
    });
    assert.equal(overdue.withinGrace, false);
    assert.equal(overdue.billableLateHours, 2);
    assert.equal(overdue.lateFeeDzd, 30000);
  });

  it('builds and settles wedding staged payment schedules & contract templates', () => {
    const schedule = buildWeddingPaymentSchedule({
      totalAmountDzd: 100000,
      eventDate: '2026-12-20',
      bookedDate: '2026-11-28',
    });
    assert.equal(schedule.length, 3);
    assert.equal(
      schedule.reduce((s, x) => s + x.amountDzd, 0),
      100000
    );

    const afterDeposit = applyPaymentToStagedSchedule(schedule, 50000, 'pay_1');
    assert.equal(afterDeposit[0].status, 'paid');
    assert.equal(afterDeposit[1].status, 'partial');
    assert.equal(afterDeposit[1].paidDzd, 20000);

    const tpl: RentalContractTemplate = {
      id: 'tpl_1',
      name: 'Event Contract',
      rentalMode: 'venue',
      bodyTemplate: 'Lessee {{renter_name}} books {{unit_name}} for {{total_amount}}',
      requireSignature: true,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };
    const rendered = renderRentalContractDocument({
      template: tpl,
      booking: existingBooking,
      unit: sampleHall,
      businessName: 'Atrium Palace',
    });
    assert.ok(rendered.includes('Amine Wedding'));
    assert.ok(rendered.includes('110'));
  });

  it('round-trips bookings via RFC 5545 iCal export and import', () => {
    const ics = buildRentalBookingsIcs([existingBooking], 'Atrium Calendar');
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('BEGIN:VEVENT'));

    const parsed = parseIcsBookings(ics);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].uid, 'bk_existing_1@atrium.local');
    assert.equal(parsed[0].startDateTime, '2026-11-28T18:00:00Z');
    assert.equal(parsed[0].endDateTime, '2026-11-29T02:00:00Z');
  });

  it('evaluates car fleet compliance, gear serial custody, and coworking subscriptions', () => {
    const car: RentableUnit = {
      ...sampleHall,
      id: 'car_1',
      name: 'Renault Clio 5',
      code: 'VEH-01',
      type: 'Vehicle',
      rentalMode: 'vehicle',
      plateNumber: '004182-125-16',
      odometerKm: 49700,
      maintenanceIntervalKm: 10000,
      insuranceExpiry: '2026-11-20',
      techControlExpiry: '2026-12-10',
    };
    const fleetAlerts = evaluateVehicleFleetAlerts([car], '2026-11-28T10:00:00Z');
    assert.equal(fleetAlerts.length, 1);
    assert.equal(fleetAlerts[0].insuranceState, 'expired');
    assert.equal(fleetAlerts[0].techControlState, 'expiring_soon');
    assert.equal(fleetAlerts[0].maintenanceDue, true);

    const gear: RentableUnit = {
      ...sampleHall,
      id: 'gear_1',
      name: 'Sony FX6 Cinema Kit',
      code: 'CAM-09',
      type: 'Gear',
      rentalMode: 'gear',
      serialNumber: 'SN-FX6-8821',
      status: 'Available',
    };
    const gearLogs: RentalAssetCheckLog[] = [
      {
        id: 'log_1',
        unitId: 'gear_1',
        unitName: 'Sony FX6 Cinema Kit',
        logType: 'checkout',
        serialNumber: 'SN-FX6-8821',
        loggedAt: '2026-11-28T09:00:00Z',
        createdAt: '2026-11-28T09:00:00Z',
        updatedAt: '2026-11-28T09:00:00Z',
      },
    ];
    const custody = evaluateGearAssetAvailability(gear, gearLogs);
    assert.equal(custody.custodyState, 'checked_out');

    const sub: RentalCoworkingSubscription = {
      id: 'sub_1',
      renterId: 'rnt_1',
      renterName: 'Nadia Dev',
      planName: 'Flex 20h Pack',
      planKind: 'hour_pack',
      includedHours: 20,
      usedHours: 16,
      monthlyFeeDzd: 12000,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'active',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };
    const okUse = evaluateCoworkingSubscriptionUsage(sub, 4, '2026-11-28T10:00:00Z');
    assert.equal(okUse.allowed, true);
    assert.equal(okUse.remainingHours, 0);

    const overUse = evaluateCoworkingSubscriptionUsage(sub, 6, '2026-11-28T10:00:00Z');
    assert.equal(overUse.allowed, false);
    assert.equal(overUse.reasonCode, 'INSUFFICIENT_HOURS');
  });
});
