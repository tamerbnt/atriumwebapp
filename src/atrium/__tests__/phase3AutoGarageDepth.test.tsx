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
  selectCurrentBranchFromState,
  selectCurrentGarageTechCommissionsFromState,
  selectCurrentJournalEntriesFromState,
  selectCurrentStaffFromState,
  selectCurrentUnifiedDocumentsFromState,
  selectCurrentUnifiedPaymentsFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  aggregateGaragePayrollCommissions,
  buildGarageInvoiceScfDraft,
  captureQuoteUnitPricesSnapshot,
  computeFlatRateLaborLine,
  computeGarageInvoiceTotalsCentimes,
  createSupplierPurchaseOrder,
  DEFAULT_INSPECTION_CHECKLIST,
  detectQuoteToInvoicePriceDrift,
  evaluateBayAssignment,
  evaluateBodyShopClaim,
  evaluateInspectionPv,
  evaluatePartWarrantyStatus,
  evaluateTireStorageAlert,
  evaluateVehicleServiceReminders,
  formatGarageSequentialCode,
  prepareWorkOrderReopenWithCreditNote,
  receivePurchaseOrderGoods,
  startTechTimeLog,
  stopTechTimeLog,
  transferVehicleOwnership,
  type VehicleOwnershipHistoryEntry,
  validateIntakeOdometer,
  validateVehiclePlateAndVin,
} from '../../utils/garageDepth';
import { isDateInClosedPeriod } from '../../utils/invoicingEngine';
import { AutoGarageDashboardView } from '../../components/screens/garage/AutoGarageDashboardView';
import { AutoGarageVehiclesView } from '../../components/screens/garage/AutoGarageVehiclesView';
import { AutoGarageOrdersView } from '../../components/screens/garage/AutoGarageOrdersView';
import { AutoGaragePartsView } from '../../components/screens/garage/AutoGaragePartsView';
import { AutoGarageBillingView } from '../../components/screens/garage/AutoGarageBillingView';
import { AutoGarageStaffView } from '../../components/screens/garage/AutoGarageStaffView';
import { getAllowedRoutesForCategoryRole } from '../../utils/routePermissions';

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

describe('Phase 3 Step 10 (7.10 auto_garage) — Vehicles, Garage Ops, Purchasing, Payroll, Fiscal/SCF & Views', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    atriumActions.resetAllData();
    setLanguageAction('fr');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
    const garageBiz = getGlobalState().businesses.find((b) => b.category === 'auto_garage');
    expect(garageBiz).toBeTruthy();
    if (garageBiz) {
      switchBusinessAction(garageBiz.id);
    }
  });

  it('validates moto VIN exemption, 5 Algerian/foreign plate formats, odometer regression & ownership history', () => {
    const motoRes = validateVehiclePlateAndVin({
      plateNumber: 'M-1402-16',
      plateFormat: 'moto',
      vehicleType: 'moto',
      vin: '',
    });
    expect(motoRes.valid).toBe(true);
    expect(motoRes.vinExempt).toBe(true);

    expect(
      validateVehiclePlateAndVin({
        plateNumber: '04125-123-16',
        plateFormat: 'algeria_standard',
        vehicleType: 'car',
        vin: 'VF1RFA00X12345678',
      }).valid
    ).toBe(true);
    expect(
      validateVehiclePlateAndVin({
        plateNumber: '16-004125-24',
        plateFormat: 'algeria_new',
        vehicleType: 'car',
      }).valid
    ).toBe(true);
    expect(
      validateVehiclePlateAndVin({
        plateNumber: 'WW-16-4490',
        plateFormat: 'temporary',
        vehicleType: 'utility',
      }).valid
    ).toBe(true);
    expect(
      validateVehiclePlateAndVin({
        plateNumber: 'CD-992-DZ',
        plateFormat: 'foreign',
        vehicleType: 'car',
      }).valid
    ).toBe(true);
    expect(
      validateVehiclePlateAndVin({
        plateNumber: 'BAD',
        plateFormat: 'algeria_standard',
        vehicleType: 'car',
      }).valid
    ).toBe(false);

    const blocked = validateIntakeOdometer({
      newKm: 112000,
      recordedKm: 124500,
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.errorCode).toBe('GARAGE_MILEAGE_REGRESSION');

    const shortOverride = validateIntakeOdometer({
      newKm: 500,
      recordedKm: 124500,
      isOdometerReplaced: true,
      overrideReason: 'ab',
    });
    expect(shortOverride.ok).toBe(false);
    expect(shortOverride.errorCode).toBe('GARAGE_MILEAGE_OVERRIDE_REASON_REQUIRED');

    const validOverride = validateIntakeOdometer({
      newKm: 120,
      recordedKm: 124500,
      isOdometerReplaced: true,
      overrideReason: 'Compteur combiné remplacé suite panne LCD',
    });
    expect(validOverride.ok).toBe(true);

    const { updatedVehicle, historyEntry } = transferVehicleOwnership({
      vehicle: {
        ownerName: 'Karim Mansouri',
        ownerPhone: '0550112233',
        mileageKm: 124500,
        ownershipHistory: [] as VehicleOwnershipHistoryEntry[],
      },
      newOwnerName: 'Nabil Benali',
      newOwnerPhone: '0661445566',
      reason: 'Vente officielle notariale',
      odometerAtTransferKm: 125100,
    });
    expect(updatedVehicle.ownerName).toBe('Nabil Benali');
    expect(updatedVehicle.ownershipHistory).toHaveLength(1);
    expect(updatedVehicle.ownershipHistory[0].id).toBe(historyEntry.id);
    expect(updatedVehicle.ownershipHistory[0].previousOwnerName).toBe('Karim Mansouri');
    expect(updatedVehicle.mileageKm).toBe(125100);
  });

  it('guards occupied bays, detects estimate price drift, evaluates reminders/body/PV/tire alerts, and tracks PO/BL/warranties', () => {
    const occupiedBay = { id: 'bay_1', name: 'Pont 2 Colonnes', isOccupied: true, activeOrderId: 'ord_existing' };
    const bayConflict = evaluateBayAssignment({ bay: occupiedBay, workOrderId: 'ord_new' });
    expect(bayConflict.ok).toBe(false);
    expect(bayConflict.errorCode).toBe('GARAGE_BAY_ALREADY_OCCUPIED');
    expect(evaluateBayAssignment({ bay: occupiedBay, workOrderId: 'ord_existing' }).ok).toBe(true);

    const snapshot = captureQuoteUnitPricesSnapshot([
      { partId: 'p_brake', unitPriceDzd: 4800 },
      { partId: 'p_oil', unitPriceDzd: 6200 },
    ]);
    const drift = detectQuoteToInvoicePriceDrift({
      partsUsed: [
        { partId: 'p_brake', sku: 'BRK-01', name: 'Plaquettes AV', quantity: 2, unitPriceDzd: 4800 },
        { partId: 'p_oil', sku: 'OIL-05', name: 'Huile 5W30', quantity: 1, unitPriceDzd: 6200 },
      ],
      quoteUnitPricesSnapshot: snapshot,
      catalogParts: [
        { id: 'p_brake', sellingPriceDzd: 5400 },
        { id: 'p_oil', sellingPriceDzd: 6200 },
      ],
    });
    expect(drift.hasDrift).toBe(true);
    expect(drift.items).toHaveLength(1);
    expect(drift.totalDeltaDzd).toBe(1200);

    const alerts = evaluateVehicleServiceReminders(
      {
        mileageKm: 89500,
        nextServiceKm: 90000,
        lastServiceDate: '2026-11-01',
        dailyAvgKm: 100,
        techControlExpiry: '2026-11-10',
        insuranceExpiry: '2026-12-15',
      },
      '2026-11-28'
    );
    expect(alerts.some((a) => a.kind === 'vidange' && a.severity === 'overdue')).toBe(true);
    expect(alerts.some((a) => a.kind === 'tech_control' && a.severity === 'overdue')).toBe(true);
    expect(alerts.some((a) => a.kind === 'insurance' && a.severity === 'due_soon')).toBe(true);

    const claimShare = evaluateBodyShopClaim({ claimedDzd: 180000, approvedDzd: 150000, deductibleDzd: 15000 });
    expect(claimShare.insurerShareDzd).toBe(135000);
    expect(claimShare.clientShareDzd).toBe(45000);

    const checklist = DEFAULT_INSPECTION_CHECKLIST.map((item, idx) => ({
      ...item,
      result: idx === 0 ? ('major_defect' as const) : ('ok' as const),
    }));
    const pv = evaluateInspectionPv(checklist, '2026-11-28');
    expect(pv.verdict).toBe('contre_visite');
    expect(pv.majorDefectsCount).toBe(1);

    const tireAlert = evaluateTireStorageAlert(
      { treadDepthMm: 2.4, dueSwapDate: '2026-11-01', status: 'stored' },
      '2026-11-28'
    );
    expect(tireAlert.status).toBe('replace_recommended');
    expect(tireAlert.warnings.length).toBe(2);

    const po = createSupplierPurchaseOrder({
      branchId: 'branch_garage_main',
      existingPoNumbers: ['BC-GAR-2026-0001'],
      supplierId: 'sup_1',
      supplierName: 'Maghreb Pièces',
      items: [{ partId: 'part_1', sku: 'BRK-01', name: 'Disques Frein', quantity: 6, unitCostDzd: 5200 }],
      warrantyMonths: 12,
      nowIso: '2026-11-28T10:00:00Z',
    });
    expect(po.poNumber).toBe('BC-GAR-2026-0002');
    expect(po.totalDzd).toBe(31200);

    const { updatedPo, stockAdjustments } = receivePurchaseOrderGoods({
      po,
      deliveryNoteNumber: 'BL-2026-8841',
      receivedByName: 'Mourad Magasinier',
      receivedAtIso: '2026-11-28T14:00:00Z',
    });
    expect(updatedPo.status).toBe('Received');
    expect(updatedPo.deliveryNoteNumber).toBe('BL-2026-8841');
    expect(updatedPo.warrantyExpiryDate).toBe('2027-11-28');
    expect(stockAdjustments[0].addedQty).toBe(6);

    const warrantyStatus = evaluatePartWarrantyStatus(updatedPo, '2026-12-01');
    expect(warrantyStatus.status).toBe('active');

    // Fix 5.2 preserved: magasinier holds 'shop', does NOT hold 'finance'
    const magasinierRoutes = getAllowedRoutesForCategoryRole('auto_garage', {
      activeGarageRole: 'magasinier',
      currentUser: { id: 'usr_mag', role: 'magasinier', roleRank: 2 },
    });
    expect(magasinierRoutes.includes('shop')).toBe(true);
    expect(magasinierRoutes.includes('finance')).toBe(false);
  });

  it('computes flat-rate labor, logs mechanic timer -> commission -> payroll run, and enforces Credit Note RO reopen + SCF/CRM/closed period', () => {
    const actions = getActions();
    let state = getGlobalState();
    const activeBranch = selectCurrentBranchFromState(state)!;
    let staff = selectCurrentStaffFromState(state);
    if (staff.length === 0) {
      actions.createStaffMember({
        fullName: 'Karim Mécanicien',
        email: 'karim.tech@atrium-test.dz',
        phoneNumber: '+213550112244',
        role: 'mecanicien',
        roleRank: 2,
        isActive: true,
        status: 'active',
        hireDate: '2026-01-10',
        salary: 65000,
        paymentDay: 28,
        allowedModules: ['home', 'scheduler', 'registrations'],
        technicalSpecialty: 'Diagnostic Électronique & Embrayage',
      });
      state = getGlobalState();
      staff = selectCurrentStaffFromState(state);
    }
    expect(staff.length).toBeGreaterThan(0);
    const mechanic = staff[0];

    const laborLine = computeFlatRateLaborLine({
      item: { code: 'FR-EMB-01', label: 'Remplacement Kit Embrayage', standardHours: 4.5, hourlyRateDzd: 2800 },
      fleetNegotiatedHourlyRateDzd: 2200,
      technicianStaffId: mechanic.id,
      technicianName: mechanic.fullName,
    });
    expect(laborLine.totalDzd).toBe(9900);

    const timer = startTechTimeLog({
      branchId: activeBranch.id,
      workOrderId: 'ord_01',
      orderNumber: 'OR-2026-001',
      technicianStaffId: mechanic.id,
      technicianName: mechanic.fullName,
      taskLabel: 'Diagnostic & vidange',
      commissionRateBps: 2000,
      startedAtIso: '2026-11-28T08:00:00Z',
    });
    const { completedLog, commissionRecord } = stopTechTimeLog({
      log: timer,
      hourlyRateDzd: 3000,
      accountId: activeBranch.accountId,
      businessId: activeBranch.businessId,
      endedAtIso: '2026-11-28T10:00:00Z',
    });
    expect(completedLog.durationMinutes).toBe(120);
    expect(completedLog.laborRevenueDzd).toBe(6000);
    expect(commissionRecord.commissionAmountDzd).toBe(1200);

    actions.recordGarageTechCommission(commissionRecord);
    const posted = actions.postGarageCommissionsToPayroll([commissionRecord.id]);
    expect(posted).toHaveLength(1);
    expect(posted[0].status).toBe('posted_to_payroll');
    expect(
      selectCurrentGarageTechCommissionsFromState(getGlobalState()).some((c) => c.id === commissionRecord.id)
    ).toBe(true);

    const payrollAgg = aggregateGaragePayrollCommissions(
      selectCurrentGarageTechCommissionsFromState(getGlobalState()),
      mechanic.id
    );
    expect(payrollAgg.totalDzd).toBe(1200);

    const payrollRun = actions.generateStaffPayrollRun(11, 2026, 'auto_garage');
    expect(payrollRun).toBeTruthy();
    const mechanicPayslip = (getGlobalState().staffPayrollSlips || []).find(
      (slip) => slip.payrollRunId === payrollRun?.id && slip.staffId === mechanic.id
    );
    expect(mechanicPayslip).toBeTruthy();
    expect(
      mechanicPayslip!.primesCotisables.some(
        (p) => p.label.includes('Atelier Mécanique') && p.amount === 1200
      )
    ).toBe(true);

    const partyRes = actions.ensurePartyForEntity({
      sourceVertical: 'auto_garage',
      entityType: 'garage_client',
      entityId: 'veh_test_1',
      partyKind: 'person',
      displayName: 'Yacine Bouzid',
      phone: '+213550998877',
    });
    expect(partyRes.party.id).toBeTruthy();

    const totals = computeGarageInvoiceTotalsCentimes({
      laborTotalDzd: 10000,
      partsTotalDzd: 20000,
      partsDiscountPercent: 10,
      billingType: 'facture_dgi',
      paymentMethod: 'especes',
      tvaRatePercent: 19,
    });
    expect(totals.subtotalHt).toBe(28000);
    expect(totals.tvaAmount).toBe(5320);

    const invCode = formatGarageSequentialCode('FAC', ['FAC-2026-0001'], 2026);
    expect(invCode).toBe('FAC-2026-0002');

    const unifiedDoc = actions.createUnifiedDocument({
      docType: 'facture',
      sourceVertical: 'auto_garage',
      partyId: partyRes.party.id,
      partyName: 'Yacine Bouzid',
      docDate: '2026-11-28',
      paymentMethod: 'cash',
      timbreBasis: 'art_317',
      isCashFiscalStampEnabled: true,
      sourceEntityType: 'garage_work_order',
      sourceEntityId: 'ord_test_1',
      items: [
        { description: 'Main d’œuvre', isService: true, quantity: 1, unitPriceHt: 10000, tvaPercent: 19 },
        { description: 'Pièces', isService: false, quantity: 1, unitPriceHt: 20000, discountPercent: 10, tvaPercent: 19 },
      ],
      issueImmediately: true,
    });
    expect(selectCurrentUnifiedDocumentsFromState(getGlobalState()).some((d) => d.id === unifiedDoc.id)).toBe(true);

    const payment = actions.recordUnifiedPayment({
      sourceVertical: 'auto_garage',
      partyId: partyRes.party.id,
      partyName: 'Yacine Bouzid',
      method: 'cash',
      direction: 'inflow',
      amountDzd: totals.netToPayDzd,
      paymentDate: '2026-11-28',
      allocations: [{ documentId: unifiedDoc.id, requestedDzd: totals.netToPayDzd }],
    });
    expect(payment).toBeTruthy();
    expect(selectCurrentUnifiedPaymentsFromState(getGlobalState()).some((p) => p.id === payment!.id)).toBe(true);

    const scfDraft = buildGarageInvoiceScfDraft({
      invoiceNumber: invCode,
      orderNumber: 'OR-2026-001',
      clientName: 'Yacine Bouzid',
      partyId: partyRes.party.id,
      laborTotalHtDzd: totals.laborTotalHt,
      partsTotalHtDzd: totals.partsTotalHt,
      discountHtDzd: totals.discountHt,
      tvaAmountDzd: totals.tvaAmount,
      timbreFiscalDzd: totals.timbreFiscal,
      totalTtcDzd: totals.totalTtc,
      netToPayDzd: totals.netToPayDzd,
      paymentMethod: 'especes',
      isPaid: true,
    });
    const sumDebit = scfDraft.lines.reduce((s, l) => s + l.debitCentimes, 0);
    const sumCredit = scfDraft.lines.reduce((s, l) => s + l.creditCentimes, 0);
    expect(sumDebit).toBe(sumCredit);

    actions.postManualJournalEntry({
      journalCode: scfDraft.journalCode,
      entryDate: '2026-11-28',
      pieceRef: invCode,
      libelle: scfDraft.memo,
      lines: scfDraft.lines,
      sourceVertical: 'auto_garage',
      sourceEventType: scfDraft.eventType,
      sourceDocId: unifiedDoc.id,
    });
    expect(selectCurrentJournalEntriesFromState(getGlobalState()).some((j) => j.pieceRef === invCode)).toBe(true);

    expect(isDateInClosedPeriod('2026-10-15', ['2026-10'])).toBe(true);

    expect(() =>
      prepareWorkOrderReopenWithCreditNote({
        order: { id: 'o1', status: 'Delivered', isLockedInvoiced: true, invoiceId: 'inv_1' },
        creditNoteId: '',
        creditNoteNumber: '',
        reason: 'Erreur',
      })
    ).toThrow('GARAGE_REOPEN_REQUIRES_CREDIT_NOTE');

    const creditNote = actions.createCreditNoteForDocument(unifiedDoc.id, 'Erreur facturation main d’œuvre', undefined, true);
    expect(creditNote).toBeTruthy();

    const reopened = prepareWorkOrderReopenWithCreditNote({
      order: { id: 'o1', status: 'Delivered', isLockedInvoiced: true, invoiceId: 'inv_1' },
      creditNoteId: creditNote!.id,
      creditNoteNumber: creditNote!.docNumber || creditNote!.draftNumber,
      reason: 'Ajustement suite avoir validé',
    });
    expect(reopened.isLockedInvoiced).toBe(false);
    expect(reopened.status).toBe('InRepair');
    expect(reopened.reopenCreditNoteId).toBe(creditNote!.id);
  });

  it('renders all 7.10 auto_garage screens cleanly via SSR and omits hardcoded demo fiscal headers', () => {
    const html = [
      renderToStaticMarkup(<AutoGarageDashboardView />),
      renderToStaticMarkup(<AutoGarageVehiclesView />),
      renderToStaticMarkup(<AutoGarageOrdersView />),
      renderToStaticMarkup(<AutoGaragePartsView />),
      renderToStaticMarkup(<AutoGarageBillingView />),
      renderToStaticMarkup(<AutoGarageStaffView />),
    ].join('\n');

    expect(html.length).toBeGreaterThan(2500);
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('ATRIUM AUTO GARAGE &amp; FLEET DZ');
    expect(html).not.toContain('ATRIUM AUTO GARAGE & FLEET DZ');
    expect(html).not.toContain('16/00-0987654B20');
  });
});
