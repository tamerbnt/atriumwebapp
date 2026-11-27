import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  getGlobalState,
  loginWithPinAction,
  selectCurrentRentableUnitsFromState,
  selectCurrentRentalAssetLogsFromState,
  selectCurrentRentalBookingsFromState,
  selectCurrentRentalContractTemplatesFromState,
  selectCurrentRentalCoworkingSubscriptionsFromState,
  selectCurrentRentalPricingRulesFromState,
  selectCurrentRentalRentersFromState,
  selectCurrentSecurityDepositsFromState,
  selectCurrentUnifiedDocumentsFromState,
  selectCurrentUnifiedPaymentsFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  buildRentalBookingsIcs,
  buildWeddingPaymentSchedule,
  computeLateReturnFee,
  computeRentalPricingWithRules,
  evaluateGearAssetAvailability,
  evaluateVehicleFleetAlerts,
  filterBookingSegmentsForDate,
  renderRentalContractDocument,
} from '../../utils/rentalDepth';
import { VenueDashboardView } from '../../components/screens/venue/VenueDashboardView';
import { VenueTimelineView } from '../../components/screens/venue/VenueTimelineView';
import { VenueBookingsView } from '../../components/screens/venue/VenueBookingsView';
import { VenueInventoryView } from '../../components/screens/venue/VenueInventoryView';
import { VenueFinanceView } from '../../components/screens/venue/VenueFinanceView';
import { VenueRentersView } from '../../components/screens/venue/VenueRentersView';

function HookBridge({
  onActions,
}: {
  onActions: (a: ReturnType<typeof useAtriumActions>) => void;
}) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

function getActions(): ReturnType<typeof useAtriumActions> {
  let actions!: ReturnType<typeof useAtriumActions>;
  renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
  return actions;
}

function ensureHallUnit(actions: ReturnType<typeof useAtriumActions>) {
  const existing = selectCurrentRentableUnitsFromState(getGlobalState());
  if (existing.length > 0) return existing[0];
  return actions.createRentableUnit({
    name: 'Grand Ballroom El Djazair',
    code: 'HALL-01',
    type: 'Hall',
    rentalMode: 'venue',
    capacity: 300,
    hourlyRate: 8000,
    dailyRate: 45000,
    currency: 'DZD',
    description: 'Main event reception hall',
    amenities: ['Stage', 'Sound System', 'AC'],
    status: 'Available',
    weekendMultiplier: 1.25,
    graceMinutes: 15,
    lateHourlyRate: 10000,
  });
}

describe('Phase 3 Step 5 (7.5 rental_booking) — Venue, Fleet, Gear, Coworking, iCal, Contracts & 6.1/6.2/6.4', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    atriumActions.resetAllData();
    setLanguageAction('en');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
    const rentalBiz = getGlobalState().businesses.find((b) => b.category === 'rental_booking');
    expect(rentalBiz).toBeTruthy();
    if (rentalBiz) {
      switchBusinessAction(rentalBiz.id);
    }
  });

  it('enforces half-open double-booking rejection, self-excluding updates, and overnight/multi-day calendar segments', () => {
    const actions = getActions();
    const hall = ensureHallUnit(actions);

    const created = actions.createRentalBooking({
      renterId: '',
      renterName: 'Nassim Khelifi',
      renterPhone: '+213555102030',
      unitId: hall.id,
      unitName: hall.name,
      unitType: hall.type,
      rentalMode: 'venue',
      purpose: 'Overnight Conference Retreat',
      startDateTime: '2026-12-03T20:00:00Z',
      endDateTime: '2026-12-05T10:00:00Z',
      durationHours: 38,
      attendeeCount: 80,
      status: 'Confirmed',
      baseAmount: 90000,
      addonsAmount: 0,
      totalAmount: 90000,
      currency: 'DZD',
      depositAmount: 20000,
      depositStatus: 'Held',
      paidAmount: 0,
      balanceDue: 90000,
      addons: [],
      contractSigned: false,
    });
    expect(created).toBeTruthy();
    if (!created) return;

    // Overlapping candidate on same unit is rejected
    const overlapping = actions.createRentalBooking({
      renterId: '',
      renterName: 'Conflict Renter',
      renterPhone: '+213555998877',
      unitId: hall.id,
      unitName: hall.name,
      unitType: hall.type,
      rentalMode: 'venue',
      purpose: 'Colliding Event',
      startDateTime: '2026-12-04T09:00:00Z',
      endDateTime: '2026-12-04T12:00:00Z',
      durationHours: 3,
      attendeeCount: 15,
      status: 'Confirmed',
      baseAmount: 15000,
      addonsAmount: 0,
      totalAmount: 15000,
      currency: 'DZD',
      depositAmount: 0,
      depositStatus: 'Pending',
      paidAmount: 0,
      balanceDue: 15000,
      addons: [],
      contractSigned: false,
    });
    expect(overlapping).toBeNull();

    // Adjacent slot ending exactly at start (half-open [start, end)) succeeds
    const adjacent = actions.createRentalBooking({
      renterId: '',
      renterName: 'Adjacent Before',
      renterPhone: '+213555112233',
      unitId: hall.id,
      unitName: hall.name,
      unitType: hall.type,
      rentalMode: 'venue',
      purpose: 'Daytime Workshop',
      startDateTime: '2026-12-03T16:00:00Z',
      endDateTime: '2026-12-03T20:00:00Z',
      durationHours: 4,
      attendeeCount: 25,
      status: 'Confirmed',
      baseAmount: 20000,
      addonsAmount: 0,
      totalAmount: 20000,
      currency: 'DZD',
      depositAmount: 0,
      depositStatus: 'Pending',
      paidAmount: 0,
      balanceDue: 20000,
      addons: [],
      contractSigned: false,
    });
    expect(adjacent).toBeTruthy();

    // Self-excluding resize on existing booking succeeds, but moving into adjacent slot is rejected
    expect(
      actions.updateRentalBooking(created.id, {
        endDateTime: '2026-12-05T11:00:00Z',
        durationHours: 39,
      })
    ).toBe(true);
    expect(
      actions.updateRentalBooking(created.id, {
        startDateTime: '2026-12-03T18:00:00Z',
      })
    ).toBe(false);

    // Overnight & multi-day segment slicing across Dec 3, Dec 4, Dec 5
    const allBookings = selectCurrentRentalBookingsFromState(getGlobalState());
    const dec3 = filterBookingSegmentsForDate(allBookings, '2026-12-03').filter(
      (s) => s.booking.id === created.id
    );
    const dec4 = filterBookingSegmentsForDate(allBookings, '2026-12-04').filter(
      (s) => s.booking.id === created.id
    );
    const dec5 = filterBookingSegmentsForDate(allBookings, '2026-12-05').filter(
      (s) => s.booking.id === created.id
    );

    expect(dec3).toHaveLength(1);
    expect(dec3[0].continuesToNextDay).toBe(true);
    expect(dec3[0].continuesFromPriorDay).toBe(false);
    expect(dec4).toHaveLength(1);
    expect(dec4[0].startHour).toBe(8);
    expect(dec4[0].endHour).toBe(24);
    expect(dec4[0].continuesFromPriorDay).toBe(true);
    expect(dec4[0].continuesToNextDay).toBe(true);
    expect(dec5).toHaveLength(1);
    expect(dec5[0].continuesFromPriorDay).toBe(true);
    expect(dec5[0].continuesToNextDay).toBe(false);
  });

  it('computes Algeria weekend/seasonal pricing, wedding staged milestones, 6.4 CRM sync, 6.1 invoice & 6.2 partial settlement', () => {
    const actions = getActions();
    const hall = ensureHallUnit(actions);
    const renter = actions.createRentalRenter({
      fullName: 'Samira & Karim Wedding',
      companyName: 'Famille Benali',
      phone: '+213550778899',
      email: 'benali.events@example.dz',
      currency: 'DZD',
    });

    const rule = actions.upsertRentalPricingRule({
      name: 'Winter Wedding Weekend',
      unitId: hall.id,
      rentalMode: 'venue',
      seasonStartDate: '2026-12-01',
      seasonEndDate: '2026-12-31',
      weekendDays: [5, 6],
      weekendMultiplier: 1.5,
      seasonalMultiplier: 1.2,
      isActive: true,
    });
    expect(
      selectCurrentRentalPricingRulesFromState(getGlobalState()).some((r) => r.id === rule.id)
    ).toBe(true);

    // Friday Dec 11, 2026 (dayOfWeek = 5 -> Algeria weekend)
    const pricing = computeRentalPricingWithRules({
      unit: hall,
      startDateTime: '2026-12-11T14:00:00Z',
      endDateTime: '2026-12-11T22:00:00Z',
      pricingRules: [rule],
    });
    expect(pricing.weekendHours).toBe(8);
    expect(pricing.adjustedBaseDzd).toBeGreaterThan(pricing.baseBeforeRulesDzd);

    const schedule = buildWeddingPaymentSchedule({
      totalAmountDzd: pricing.totalDzd,
      eventDate: '2026-12-11',
      bookedDate: '2026-10-01',
    });
    expect(schedule).toHaveLength(3);
    expect(schedule.reduce((s, t) => s + t.amountDzd, 0)).toBe(pricing.totalDzd);

    const booking = actions.createRentalBooking({
      renterId: renter.id,
      renterName: renter.fullName,
      renterCompany: renter.companyName,
      renterPhone: renter.phone,
      renterEmail: renter.email,
      unitId: hall.id,
      unitName: hall.name,
      unitType: hall.type,
      rentalMode: 'venue',
      purpose: 'Wedding Reception',
      startDateTime: '2026-12-11T14:00:00Z',
      endDateTime: '2026-12-11T22:00:00Z',
      durationHours: pricing.durationHours,
      attendeeCount: 220,
      status: 'Confirmed',
      baseAmount: pricing.adjustedBaseDzd,
      addonsAmount: 0,
      totalAmount: pricing.totalDzd,
      currency: 'DZD',
      depositAmount: 50000,
      depositStatus: 'Held',
      paidAmount: 0,
      balanceDue: pricing.totalDzd,
      addons: [],
      stagedPaymentSchedule: schedule,
      contractSigned: false,
    });
    expect(booking).toBeTruthy();
    if (!booking) return;

    const invoice = actions.createRentalUnifiedInvoice(booking.id, {
      docType: 'facture',
      tvaPercent: 19,
      issueImmediately: true,
    });
    expect(invoice).toBeTruthy();
    expect(invoice?.sourceVertical).toBe('rental_booking');
    expect(
      selectCurrentUnifiedDocumentsFromState(getGlobalState()).some((d) => d.id === invoice?.id)
    ).toBe(true);

    // Renter automatically linked to CRM party (6.4)
    const linkedRenter = selectCurrentRentalRentersFromState(getGlobalState()).find(
      (r) => r.id === renter.id
    );
    expect(linkedRenter?.crmPartyId).toBeTruthy();

    // Settle first staged tranche (30%) via 6.2 unified payment
    const tranche1Amount = schedule[0].amountDzd;
    const payment = actions.recordRentalUnifiedPayment(booking.id, {
      amountDzd: tranche1Amount,
      method: 'bank_transfer',
    });
    expect(payment).toBeTruthy();
    expect(
      selectCurrentUnifiedPaymentsFromState(getGlobalState()).some((p) => p.id === payment?.id)
    ).toBe(true);

    const updatedBooking = selectCurrentRentalBookingsFromState(getGlobalState()).find(
      (b) => b.id === booking.id
    )!;
    expect(updatedBooking.paidAmount).toBe(tranche1Amount);
    expect(updatedBooking.balanceDue).toBe(pricing.totalDzd - tranche1Amount);
    expect(updatedBooking.stagedPaymentSchedule?.[0].status).toBe('paid');
    expect(updatedBooking.stagedPaymentSchedule?.[1].status).toBe('pending');
  });

  it('supports contract templates, e-signature validation, iCal export/import, late return checkout & bounded deposit deductions', () => {
    const actions = getActions();
    const hall = ensureHallUnit(actions);

    const tpl = actions.upsertRentalContractTemplate({
      name: 'Standard Venue Contract',
      rentalMode: 'venue',
      bodyTemplate: 'Agreement for {{renter_name}} at {{unit_name}} total {{total_amount}}',
      requireSignature: true,
      isDefault: true,
    });
    expect(
      selectCurrentRentalContractTemplatesFromState(getGlobalState()).some((t) => t.id === tpl.id)
    ).toBe(true);

    const booking = actions.createRentalBooking({
      renterId: '',
      renterName: 'Yacine Mansouri',
      renterPhone: '+213550111222',
      unitId: hall.id,
      unitName: hall.name,
      unitType: hall.type,
      rentalMode: 'venue',
      purpose: 'Corporate Seminar',
      startDateTime: '2026-12-18T09:00:00Z',
      endDateTime: '2026-12-18T13:00:00Z',
      durationHours: 4,
      attendeeCount: 45,
      status: 'Confirmed',
      baseAmount: 40000,
      addonsAmount: 0,
      totalAmount: 40000,
      currency: 'DZD',
      depositAmount: 15000,
      depositStatus: 'Held',
      paidAmount: 10000,
      balanceDue: 30000,
      addons: [],
      contractSigned: false,
    });
    expect(booking).toBeTruthy();
    if (!booking) return;

    const renderedText = renderRentalContractDocument({
      template: tpl,
      booking,
      unit: hall,
      businessName: 'Atrium Event Spaces',
    });
    expect(renderedText).toContain('Yacine Mansouri');
    expect(renderedText).toContain(hall.name);

    // Reject blank signature, persist valid SVG signature
    expect(
      actions.signRentalBookingContract(booking.id, {
        signerName: 'Yacine Mansouri',
        signatureData: '',
        templateId: tpl.id,
      })
    ).toBe(false);
    expect(
      actions.signRentalBookingContract(booking.id, {
        signerName: 'Yacine Mansouri',
        signatureData: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        templateId: tpl.id,
      })
    ).toBe(true);
    const signedBooking = selectCurrentRentalBookingsFromState(getGlobalState()).find(
      (b) => b.id === booking.id
    )!;
    expect(signedBooking.contractSigned).toBe(true);
    expect(signedBooking.contractSignerName).toBe('Yacine Mansouri');

    // Late checkout (+3 hours past 13:00 -> 16:00Z) adds late fee & audit log
    actions.checkInBooking(booking.id);
    const expectedLate = computeLateReturnFee({
      scheduledEndDateTime: booking.endDateTime,
      actualReturnDateTime: '2026-12-18T16:00:00Z',
      hourlyRate: hall.lateHourlyRate || hall.hourlyRate || 0,
      dailyRate: hall.dailyRate || 0,
      graceMinutes: hall.graceMinutes ?? 15,
    });
    actions.checkOutBooking(booking.id, {
      actualReturnAt: '2026-12-18T16:00:00Z',
      conditionNotes: 'Returned late with minor cleanup needed',
    });
    const checkedOut = selectCurrentRentalBookingsFromState(getGlobalState()).find(
      (b) => b.id === booking.id
    )!;
    expect(checkedOut.status).toBe('Completed');
    expect(checkedOut.lateFeeDzd).toBe(expectedLate.lateFeeDzd);
    expect(checkedOut.totalAmount).toBe(40000 + expectedLate.lateFeeDzd);
    expect(checkedOut.balanceDue).toBe(30000 + expectedLate.lateFeeDzd);

    // Security deposit deduction bounded strictly between (0, held] with non-empty reason
    const dep = selectCurrentSecurityDepositsFromState(getGlobalState()).find(
      (d) => d.bookingId === booking.id
    )!;
    expect(dep).toBeTruthy();
    expect(actions.deductSecurityDeposit(dep.id, 'Over-cap charge', 25000)).toBe(false);
    expect(actions.deductSecurityDeposit(dep.id, '   ', 5000)).toBe(false);
    expect(actions.deductSecurityDeposit(dep.id, 'Zero test', 0)).toBe(false);
    expect(actions.deductSecurityDeposit(dep.id, 'Carpet deep clean', 5000)).toBe(true);
    const deductedDep = selectCurrentSecurityDepositsFromState(getGlobalState()).find(
      (d) => d.id === dep.id
    )!;
    expect(deductedDep.status).toBe('Deducted');
    expect(deductedDep.deductedAmount).toBe(5000);
    expect(deductedDep.originalAmount).toBe(15000);

    // iCal round-trip export + import (deduplicates existing UID & imports external event)
    const exportedIcs = buildRentalBookingsIcs(selectCurrentRentalBookingsFromState(getGlobalState()));
    expect(exportedIcs).toContain('BEGIN:VCALENDAR');
    expect(exportedIcs).toContain('Yacine Mansouri');

    const combinedIcs = [
      exportedIcs.replace('END:VCALENDAR', '').trim(),
      'BEGIN:VEVENT',
      'UID:ext-ical-2026-991@partner.dz',
      'DTSTART:20261224T100000Z',
      'DTEND:20261224T140000Z',
      `LOCATION:${hall.code}`,
      'SUMMARY:External Partner Workshop',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const importSummary = actions.importRentalIcsBookings(combinedIcs, hall.id);
    expect(importSummary.importedCount).toBe(1);
    expect(importSummary.skippedDuplicates).toBeGreaterThanOrEqual(1);
    expect(
      selectCurrentRentalBookingsFromState(getGlobalState()).some(
        (b) => b.icalUid === 'ext-ical-2026-991@partner.dz'
      )
    ).toBe(true);
  });

  it('operates [trade gap] Vehicle fleet alerts, Gear serial custody & Coworking hour-pack subscriptions', () => {
    const actions = getActions();

    // 1. Vehicle mode with expiring insurance & contrôle technique
    const vehicle = actions.createRentableUnit({
      name: 'Renault Clio 5 — Fleet #04',
      code: 'VEH-04',
      type: 'Vehicle',
      rentalMode: 'vehicle',
      capacity: 5,
      hourlyRate: 1500,
      dailyRate: 7500,
      currency: 'DZD',
      description: 'Compact hatchback fleet car',
      amenities: ['A/C', 'GPS'],
      status: 'Available',
      plateNumber: '01245-124-16',
      vin: 'VF1RJA00567891234',
      makeModel: 'Renault Clio 5',
      odometerKm: 49700,
      fuelLevelPct: 85,
      insuranceExpiry: '2026-12-05',
      techControlExpiry: '2026-10-01', // expired relative to 2026-11-27
      maintenanceIntervalKm: 10000,
    });
    const fleetAlerts = evaluateVehicleFleetAlerts([vehicle], '2026-11-27T12:00:00Z');
    expect(fleetAlerts).toHaveLength(1);
    expect(fleetAlerts[0].techControlState).toBe('expired');
    expect(fleetAlerts[0].insuranceState).toBe('expiring_soon');
    expect(fleetAlerts[0].maintenanceDue).toBe(true);
    expect(fleetAlerts[0].needsAttention).toBe(true);

    // 2. Gear / AV mode with serial custody & damage tracking
    const gear = actions.createRentableUnit({
      name: 'Sony FX6 Cinema Camera Kit',
      code: 'AV-FX6',
      type: 'Gear',
      rentalMode: 'gear',
      capacity: 1,
      hourlyRate: 3500,
      dailyRate: 18000,
      currency: 'DZD',
      description: 'Full-frame cinema kit',
      amenities: ['24-70mm GM', 'V-Mount'],
      status: 'Available',
      serialNumber: 'SN-FX6-88421',
    });

    actions.recordRentalAssetCheckLog({
      unitId: gear.id,
      unitName: gear.name,
      logType: 'checkout',
      serialNumber: gear.serialNumber,
      conditionNotes: 'Dispatched for commercial shoot',
      damageDetected: false,
      damageAmountDzd: 0,
      performedBy: 'Amine Tech',
    });
    const outState = evaluateGearAssetAvailability(
      selectCurrentRentableUnitsFromState(getGlobalState()).find((u) => u.id === gear.id)!,
      selectCurrentRentalAssetLogsFromState(getGlobalState())
    );
    expect(outState.custodyState).toBe('checked_out');

    actions.recordRentalAssetCheckLog({
      unitId: gear.id,
      unitName: gear.name,
      logType: 'checkin',
      serialNumber: gear.serialNumber,
      conditionNotes: 'Lens hood cracked on return',
      damageDetected: true,
      damageAmountDzd: 12000,
      performedBy: 'Amine Tech',
    });
    const returnedState = evaluateGearAssetAvailability(
      selectCurrentRentableUnitsFromState(getGlobalState()).find((u) => u.id === gear.id)!,
      selectCurrentRentalAssetLogsFromState(getGlobalState())
    );
    expect(returnedState.custodyState).toBe('maintenance');
    expect(returnedState.totalDamageChargesDzd).toBe(12000);

    // 3. Coworking mode with hour_pack consumption & insufficient-hours block
    const desk = actions.createRentableUnit({
      name: 'Open Desk Pod B2',
      code: 'DESK-B2',
      type: 'Desk',
      rentalMode: 'coworking_desk',
      capacity: 1,
      hourlyRate: 400,
      dailyRate: 2000,
      currency: 'DZD',
      description: 'Dedicated coworking pod',
      amenities: ['Fiber 100Mbps', 'Monitor'],
      status: 'Available',
    });
    const pass = actions.upsertRentalCoworkingSubscription({
      renterId: '',
      renterName: 'Lina Freelancer',
      unitId: desk.id,
      planKind: 'hour_pack',
      planName: 'Pack 10h Focus',
      includedHours: 10,
      usedHours: 0,
      monthlyFeeDzd: 3500,
      startDate: '2026-11-01',
      endDate: '2030-12-31',
      status: 'active',
    });
    expect(
      selectCurrentRentalCoworkingSubscriptionsFromState(getGlobalState()).some(
        (s) => s.id === pass.id
      )
    ).toBe(true);

    const firstUse = actions.consumeRentalCoworkingHours(pass.id, 7);
    expect(firstUse.success).toBe(true);
    expect(firstUse.remainingHours).toBe(3);

    const overUse = actions.consumeRentalCoworkingHours(pass.id, 5);
    expect(overUse.success).toBe(false);
    expect(overUse.reason).toBe('INSUFFICIENT_HOURS');
  });

  it('renders all 7.5 venue/rental screens cleanly via SSR', () => {
    const html = [
      renderToStaticMarkup(<VenueDashboardView />),
      renderToStaticMarkup(<VenueTimelineView />),
      renderToStaticMarkup(<VenueBookingsView />),
      renderToStaticMarkup(<VenueInventoryView />),
      renderToStaticMarkup(<VenueFinanceView />),
      renderToStaticMarkup(<VenueRentersView />),
    ].join('\n');

    expect(html.length).toBeGreaterThan(2000);
    expect(html).not.toContain('NaN');
  });
});
