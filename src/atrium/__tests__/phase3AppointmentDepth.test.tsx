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
  selectCurrentAppointmentsFromState,
  selectCurrentMembersFromState,
  selectCurrentProductsFromState,
  selectCurrentSalonConsentFormsFromState,
  selectCurrentSalonGiftCardsFromState,
  selectCurrentSalonHammamSessionsFromState,
  selectCurrentSalonLoyaltyLedgerFromState,
  selectCurrentSalonPrepaidPackagesFromState,
  selectCurrentServicesFromState,
  selectCurrentStaffFromState,
  selectCurrentStylistSchedulesFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import { centimesToDzd, dzdToCentimes } from '../../utils/money';
import {
  detectClientAllergyConflicts,
  evaluateStylistAvailability,
} from '../../utils/appointmentDepth';
import { AppointmentModal } from '../../components/modals/AppointmentModal';
import { AppointmentClientsView } from '../../components/screens/appointment/AppointmentClientsView';
import { AppointmentScheduleView } from '../../components/screens/appointment/AppointmentScheduleView';
import { AppointmentServicesView } from '../../components/screens/appointment/AppointmentServicesView';
import { AppointmentFinanceView } from '../../components/screens/appointment/AppointmentFinanceView';
import { SalonHammamPanel } from '../../components/screens/appointment/SalonHammamPanel';
import { SalonPackagesConsentPanel } from '../../components/screens/appointment/SalonPackagesConsentPanel';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

function ensureSalonFixtures(actions: ReturnType<typeof useAtriumActions>) {
  const state = getGlobalState();
  let staffList = selectCurrentStaffFromState(state);
  if (staffList.length === 0) {
    actions.createStaffMember({
      fullName: 'Amira Stylist',
      email: 'amira@salon.dz',
      role: 'Staff',
      roleRank: 1,
      hireDate: '2026-01-01',
      paymentDay: 1,
      allowedModules: ['dashboard', 'scheduler', 'members'],
      phoneNumber: '0550112233',
      isActive: true,
      salary: 45000,
      serviceCommissionRate: 40,
      pinCode: '1111',
    });
    staffList = selectCurrentStaffFromState(getGlobalState());
  }

  let services = selectCurrentServicesFromState(getGlobalState());
  if (services.length === 0) {
    actions.addServiceItem({
      tenantId: getGlobalState().account.id,
      name: 'Balayage Ammonia Gloss',
      category: 'Hair',
      durationMinutes: 60,
      price: 8000,
      costPrice: 1200,
      commissionRate: 40,
      bufferMinutes: 10,
      allergyKeywords: ['ammonia', 'peroxide'],
      requiresConsent: false,
      isActive: true,
    });
    services = selectCurrentServicesFromState(getGlobalState());
  }

  let clients = selectCurrentMembersFromState(getGlobalState());
  if (clients.length === 0) {
    actions.addMember({
      fullName: 'Yasmine Walkin',
      email: '',
      phoneNumber: '0555998877',
      gender: 'Female',
      remainingSessions: 0,
      membershipPlanId: 'walkin_default',
      membershipPlanName: 'Walk-in Client',
      source: 'Walk-in',
      startDate: '2026-11-27',
      expirationDate: '2027-11-27',
      status: 'Active',
      notes: '',
      segmentData: {
        allergies: ['Ammonia'],
        loyaltyPoints: 5,
      },
    });
    clients = selectCurrentMembersFromState(getGlobalState());
  }

  return {
    stylist: staffList[0],
    service: services[0],
    client: clients[0],
  };
}

describe('Phase 3 Step 2 (7.2 appointment_service) — Deep Salon & Spa Integration', () => {
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
    const salonBiz = getGlobalState().businesses.find((b) => b.category === 'appointment_service');
    expect(salonBiz).toBeTruthy();
    if (salonBiz) {
      switchBusinessAction(salonBiz.id);
    }
  });

  it('normalizes walk-in salon clients on creation and preselects initialClientId in AppointmentModal', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client, stylist, service } = ensureSalonFixtures(actions);

    expect(client.clientType).toBe('walkin');
    expect(client.segmentData?.isWalkIn).toBe(true);

    // Add a second regular client and verify AppointmentModal preselects initialClientId in rendered markup
    const secondClient = actions.addMember({
      fullName: 'Salima VIP',
      email: '',
      phoneNumber: '0551223344',
      gender: 'Female',
      remainingSessions: 0,
      membershipPlanId: 'reg_1',
      membershipPlanName: 'Client Fidèle',
      startDate: '2026-11-27',
      expirationDate: '2027-11-27',
      status: 'Active',
      notes: '',
      segmentData: {
        loyaltyPoints: 20,
        lifetimeSpent: 60000,
      },
    });
    expect(secondClient.clientType).toBe('vip');

    const allSalonClients = selectCurrentMembersFromState(getGlobalState());
    expect(allSalonClients.some((c) => c.fullName === 'Yasmine Walkin' && c.clientType === 'walkin')).toBe(true);
    expect(allSalonClients.some((c) => c.fullName === 'Salima VIP' && c.clientType === 'vip')).toBe(true);

    const clientsHtml = renderToStaticMarkup(<AppointmentClientsView />);
    expect(clientsHtml).toContain('Walk-in');
    expect(clientsHtml).not.toContain('NaN');

    const modalHtml = renderToStaticMarkup(
      <AppointmentModal
        isOpen
        onClose={() => {}}
        initialClientId={secondClient.id}
        initialStaffId={stylist.id}
        initialDate="2026-12-01"
        initialTime="10:00"
      />
    );
    expect(modalHtml).toContain(secondClient.fullName);
    expect(modalHtml).toContain(service.name);
  });

  it('enforces stylist overlap blocking, editable duration endTime calculation, and stylist schedule availability', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { stylist, service, client } = ensureSalonFixtures(actions);

    const schedule = actions.upsertStylistSchedule({
      staffId: stylist.id,
      staffName: stylist.fullName,
      salonClosingTime: '19:00',
      timeOffRanges: [{ id: 'off_1', startDate: '2026-12-20', endDate: '2026-12-22', reason: 'Annual leave' }],
    });
    expect(selectCurrentStylistSchedulesFromState(getGlobalState()).some((s) => s.id === schedule.id)).toBe(true);

    // Book 10:00 for 90 minutes -> endTime should be 11:30
    const first = actions.createAppointment({
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phoneNumber,
      staffId: stylist.id,
      staffName: stylist.fullName,
      serviceId: service.id,
      serviceName: service.name,
      date: '2026-12-02',
      startTime: '10:00',
      endTime: '',
      durationMinutes: 90,
      price: 8000,
      status: 'Confirmed',
      bookingChannel: 'online',
    });
    expect(first.endTime).toBe('11:30');

    // Overlapping slot 11:00 must throw APPOINTMENT_OVERLAP
    expect(() =>
      actions.createAppointment({
        clientId: client.id,
        clientName: client.fullName,
        clientPhone: client.phoneNumber,
        staffId: stylist.id,
        staffName: stylist.fullName,
        serviceId: service.id,
        serviceName: service.name,
        date: '2026-12-02',
        startTime: '11:00',
        endTime: '12:00',
        durationMinutes: 60,
        price: 8000,
        status: 'Confirmed',
      })
    ).toThrow('APPOINTMENT_OVERLAP');

    // Non-overlapping slot 14:00 succeeds, and rescheduling to 10:30 throws overlap
    const second = actions.createAppointment({
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phoneNumber,
      staffId: stylist.id,
      staffName: stylist.fullName,
      serviceId: service.id,
      serviceName: service.name,
      date: '2026-12-02',
      startTime: '14:00',
      endTime: '',
      durationMinutes: 45,
      price: 5000,
      status: 'Confirmed',
    });
    expect(second.endTime).toBe('14:45');

    expect(() =>
      actions.rescheduleAppointment(second.id, '2026-12-02', '10:30', '', stylist.id, stylist.fullName, 45)
    ).toThrow('APPOINTMENT_OVERLAP');

    // Rescheduling second appointment's own duration from 45m -> 75m updates endTime to 15:15 cleanly
    actions.rescheduleAppointment(second.id, '2026-12-02', '14:00', '', stylist.id, stylist.fullName, 75);
    const updatedSecond = selectCurrentAppointmentsFromState(getGlobalState()).find((a) => a.id === second.id);
    expect(updatedSecond?.endTime).toBe('15:15');

    // Check closing time and time-off availability evaluation
    const closingCheck = evaluateStylistAvailability({
      schedule,
      appointments: selectCurrentAppointmentsFromState(getGlobalState()),
      staffId: stylist.id,
      date: '2026-12-02',
      startTime: '18:30',
      durationMinutes: 60,
    });
    expect(closingCheck.issues).toContain('EXCEEDS_CLOSING_TIME');

    const timeOffCheck = evaluateStylistAvailability({
      schedule,
      appointments: selectCurrentAppointmentsFromState(getGlobalState()),
      staffId: stylist.id,
      date: '2026-12-21',
      startTime: '10:00',
      durationMinutes: 60,
    });
    expect(timeOffCheck.issues).toContain('TIME_OFF');
  });

  it('detects client allergy conflicts and records manager allergy override', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { stylist, service, client } = ensureSalonFixtures(actions);

    const conflict = detectClientAllergyConflicts(client, service);
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.matchedKeywords).toContain('Ammonia');

    const apt = actions.createAppointment({
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phoneNumber,
      staffId: stylist.id,
      staffName: stylist.fullName,
      serviceId: service.id,
      serviceName: service.name,
      date: '2026-12-03',
      startTime: '10:00',
      endTime: '11:00',
      durationMinutes: 60,
      price: 8000,
      status: 'Confirmed',
      allergyOverrideConfirmed: true,
    });
    expect(apt.allergyOverrideConfirmed).toBe(true);
  });

  it('evaluates held deposit cancellation inside vs outside the cutoff window', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { stylist, service, client } = ensureSalonFixtures(actions);

    const earlyCancelApt = actions.createAppointment({
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phoneNumber,
      staffId: stylist.id,
      staffName: stylist.fullName,
      serviceId: service.id,
      serviceName: service.name,
      date: '2026-12-10',
      startTime: '14:00',
      endTime: '15:00',
      durationMinutes: 60,
      price: 8000,
      status: 'Confirmed',
      depositCentimes: dzdToCentimes(2000),
      depositStatus: 'held',
      cancellationCutoffHours: 24,
    });

    // Cancelled 48h prior -> refunded
    actions.updateAppointmentStatus(earlyCancelApt.id, 'Cancelled', {
      cancelledAtIso: '2026-12-08T12:00:00Z',
    });
    const refundedApt = selectCurrentAppointmentsFromState(getGlobalState()).find(
      (a) => a.id === earlyCancelApt.id
    );
    expect(refundedApt?.depositStatus).toBe('refunded');
    expect(centimesToDzd(refundedApt?.refundedDepositCentimes || 0)).toBe(2000);

    // Cancelled 4h prior -> forfeited
    const lateCancelApt = actions.createAppointment({
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phoneNumber,
      staffId: stylist.id,
      staffName: stylist.fullName,
      serviceId: service.id,
      serviceName: service.name,
      date: '2026-12-12',
      startTime: '14:00',
      endTime: '15:00',
      durationMinutes: 60,
      price: 8000,
      status: 'Confirmed',
      depositCentimes: dzdToCentimes(2000),
      depositStatus: 'held',
      cancellationCutoffHours: 24,
    });
    actions.updateAppointmentStatus(lateCancelApt.id, 'Cancelled', {
      cancelledAtIso: '2026-12-12T10:00:00Z',
    });
    const forfeitedApt = selectCurrentAppointmentsFromState(getGlobalState()).find(
      (a) => a.id === lateCancelApt.id
    );
    expect(forfeitedApt?.depositStatus).toBe('forfeited');
    expect(forfeitedApt?.refundedDepositCentimes).toBe(0);
  });

  it('settles checkout with prepaid package, gift card, loyalty points, and single-pass consumables stock depletion', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { stylist, client } = ensureSalonFixtures(actions);

    const dyeProduct = actions.addProduct({
      name: 'Oxydant 20V 100ml',
      description: 'Salon developer',
      category: 'Beauty Products',
      sku: 'SAL-OXY-20',
      barcode: 'SAL-OXY-20',
      cost: { amount: 400, currency: 'DZD' },
      costPrice: 400,
      price: { amount: 1200, currency: 'DZD' },
      stockQuantity: 10,
      reorderLevel: 2,
      isPinned: false,
      isActive: true,
    });

    const colorService = actions.addServiceItem({
      tenantId: getGlobalState().account.id,
      name: 'Complete Coloration',
      category: 'Hair',
      durationMinutes: 90,
      price: 9000,
      costPrice: 800,
      commissionRate: 40,
      consumables: [
        {
          productId: dyeProduct.id,
          productName: dyeProduct.name,
          quantity: 2,
          unit: 'bottle',
        },
      ],
      isActive: true,
    });

    const pkg = actions.createSalonPrepaidPackage({
      clientId: client.id,
      clientName: client.fullName,
      packageName: 'Pack 5 Couleurs',
      totalSessions: 5,
      priceDzd: 35000,
    });

    const gc = actions.createSalonGiftCard({
      code: 'SALON-GIFT-26',
      recipientName: client.fullName,
      amountDzd: 2500,
    });

    // Service 9000 + Retail 2000 + Tip 500 = 11500
    // Package covers service (9000) -> remaining 2500
    // Gift card covers 2500 -> net payable 0; loyalty earns 0 on 0 paid, or test partial gift card 1500 + 2 loyalty pts (20 DZD) -> net 980 DZD
    const gcPartial = actions.createSalonGiftCard({
      code: 'SALON-PARTIAL',
      recipientName: client.fullName,
      amountDzd: 1000,
    });
    expect(gc.code).toBe('SALON-GIFT-26');

    const apt = actions.createAppointment({
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phoneNumber,
      staffId: stylist.id,
      staffName: stylist.fullName,
      serviceId: colorService.id,
      serviceName: colorService.name,
      date: '2026-12-05',
      startTime: '11:00',
      endTime: '12:30',
      durationMinutes: 90,
      price: 9000,
      status: 'Confirmed',
    });

    actions.checkoutAppointment(apt.id, 'Cash', {
      prepaidPackageId: pkg.id,
      giftCardCode: gcPartial.code,
      loyaltyPointsToRedeem: 2, // 20 DZD
      retailTotalDzd: 2000,
      tipAmountDzd: 500,
    });

    const afterState = getGlobalState();
    const updatedProduct = selectCurrentProductsFromState(afterState).find((p) => p.id === dyeProduct.id);
    expect(updatedProduct?.stockQuantity).toBe(8);

    const consMovements = afterState.stockMovements.filter((m) => m.productId === dyeProduct.id);
    expect(consMovements.length).toBe(1);
    expect(consMovements[0].quantity).toBe(-2);

    const updatedPkg = selectCurrentSalonPrepaidPackagesFromState(afterState).find((p) => p.id === pkg.id);
    expect(updatedPkg?.remainingSessions).toBe(4);

    const updatedGc = selectCurrentSalonGiftCardsFromState(afterState).find((g) => g.id === gcPartial.id);
    expect(updatedGc?.remainingCentimes).toBe(0);
    expect(updatedGc?.status).toBe('redeemed');

    const ledgerEntries = selectCurrentSalonLoyaltyLedgerFromState(afterState).filter(
      (l) => l.clientId === client.id
    );
    expect(ledgerEntries.some((l) => l.pointsDelta === -2)).toBe(true);
    expect(ledgerEntries.some((l) => l.pointsDelta > 0)).toBe(true);

    // Re-running checkout must NOT double-deplete consumables
    actions.checkoutAppointment(apt.id, 'Cash');
    const productAfterSecondCheckout = selectCurrentProductsFromState(getGlobalState()).find(
      (p) => p.id === dyeProduct.id
    );
    expect(productAfterSecondCheckout?.stockQuantity).toBe(8);
  });

  it('enforces Hammam gender-block & capacity limits, saves tattoo/laser consents, and renders all salon views cleanly', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client, service } = ensureSalonFixtures(actions);

    const firstHammam = actions.createHammamSession({
      cabinName: 'Hammam Émeraude',
      genderBlock: 'women',
      clientId: client.id,
      clientName: client.fullName,
      date: '2026-12-06',
      startTime: '10:00',
      endTime: '11:30',
      capacity: 4,
      bookedCount: 3,
      priceDzd: 4100,
    });
    expect(firstHammam.success).toBe(true);

    // Opposite gender on overlapping cabin slot must fail
    const genderConflict = actions.createHammamSession({
      cabinName: 'Hammam Émeraude',
      genderBlock: 'men',
      clientName: 'Karim Test',
      date: '2026-12-06',
      startTime: '10:30',
      endTime: '12:00',
      capacity: 4,
      bookedCount: 1,
      priceDzd: 3500,
    });
    expect(genderConflict.success).toBe(false);
    if (!genderConflict.success) {
      expect(genderConflict.error).toBe('GENDER_BLOCK_CONFLICT');
    }

    // Exceeding remaining capacity (1 left, requesting 2) must fail
    const capConflict = actions.createHammamSession({
      cabinName: 'Hammam Émeraude',
      genderBlock: 'women',
      clientName: 'Meriem Duo',
      date: '2026-12-06',
      startTime: '10:30',
      endTime: '11:30',
      capacity: 4,
      bookedCount: 2,
      priceDzd: 7000,
    });
    expect(capConflict.success).toBe(false);
    if (!capConflict.success) {
      expect(capConflict.error).toBe('CAPACITY_EXCEEDED');
    }

    expect(selectCurrentSalonHammamSessionsFromState(getGlobalState()).length).toBe(1);

    const consent = actions.saveSalonConsentForm({
      clientId: client.id,
      clientName: client.fullName,
      serviceId: service.id,
      serviceName: 'Épilation Laser Visage',
      protocolType: 'laser',
      medicalChecklist: { noContraindication: true, patchTestDone: true, aftercareUnderstood: true },
      allergiesAcknowledged: true,
      signatureDataUrl: 'typed:Yasmine Walkin',
    });
    expect(selectCurrentSalonConsentFormsFromState(getGlobalState()).some((c) => c.id === consent.id)).toBe(true);

    // Render all deep views/panels with zero NaN and valid HTML
    const hammamHtml = renderToStaticMarkup(<SalonHammamPanel />);
    expect(hammamHtml).toContain('Hammam Émeraude');
    expect(hammamHtml).not.toContain('NaN');

    const pkgHtml = renderToStaticMarkup(<SalonPackagesConsentPanel mode="packages" />);
    expect(pkgHtml).toContain('Prepaid Treatment Packages');

    const consentHtml = renderToStaticMarkup(<SalonPackagesConsentPanel mode="consent" />);
    expect(consentHtml).toContain('data-testid="consent-signature-canvas"');
    expect(consentHtml).toContain('Épilation Laser Visage');

    const scheduleHtml = renderToStaticMarkup(<AppointmentScheduleView />);
    expect(scheduleHtml).toContain('Stylist Hours');
    expect(scheduleHtml).not.toContain('NaN');

    const servicesHtml = renderToStaticMarkup(<AppointmentServicesView />);
    expect(servicesHtml).toContain('Packages &amp; Gift Cards');
    expect(servicesHtml).not.toContain('NaN');

    const financeHtml = renderToStaticMarkup(<AppointmentFinanceView />);
    expect(financeHtml).toContain('data-testid="salon-finance-depth-strip"');
    expect(financeHtml).not.toContain('NaN');
  });
});
