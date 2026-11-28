import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  loginWithPinAction,
  setLanguageAction,
  switchBusinessAction,
  useAtriumStore,
} from '../../services/store';
import {
  evaluateOtpAttemptLockout,
  validateRemittanceCcpBatch,
  detectDuplicateParcelScan,
  optimizeManifestRouteStops,
  aggregateDriverPayrollSummaries,
  computeVolumetricBillingDetails,
  resolveWilayaZone,
} from '../../utils/logisticsDepth';
import { calculateCcpKey } from '../../utils/logisticsRules';
import type {
  LogisticsShipment,
  LogisticsManifest,
  CourierCashDischarge,
  MerchantRemittanceBatch,
} from '../../types';
import { StopDeskHandoverModal } from '../../components/screens/logistics/StopDeskHandoverModal';
import { AlgeriePosteSfp01Modal } from '../../components/screens/logistics/AlgeriePosteSfp01Modal';
import { TransportManifestPrintModal } from '../../components/screens/logistics/TransportManifestPrintModal';
import { LogisticsShipmentModal } from '../../components/screens/logistics/LogisticsShipmentModal';
import { LogisticsTrackingDrawer } from '../../components/screens/logistics/LogisticsTrackingDrawer';
import { LogisticsDriverPodModal } from '../../components/screens/logistics/LogisticsDriverPodModal';
import { LogisticsOperationsPanel } from '../../components/screens/logistics/LogisticsOperationsPanel';
import { LogisticsShipmentsView } from '../../components/screens/logistics/LogisticsShipmentsView';
import { LogisticsScannerView } from '../../components/screens/logistics/LogisticsScannerView';
import { LogisticsManifestsView } from '../../components/screens/logistics/LogisticsManifestsView';
import { LogisticsCodView } from '../../components/screens/logistics/LogisticsCodView';

function initLogisticsWorkspace(
  role: 'gerant' | 'dispatcher' | 'hub_sorter' | 'stop_desk_agent' = 'dispatcher'
) {
  let store!: ReturnType<typeof useAtriumStore>;
  const Probe: React.FC = () => {
    store = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(<Probe />);
  const logBiz = store.businesses.find((b) => b.category === 'logistics_delivery');
  expect(logBiz).toBeTruthy();
  if (logBiz) {
    switchBusinessAction(logBiz.id);
  }
  store.setActiveLogisticsRole(role);
  return store;
}

const SAMPLE_SHIPMENT: LogisticsShipment = {
  id: 'ship_test_01',
  accountId: 'tenant_log_1',
  businessId: 'biz_log_1',
  branchId: 'branch_log_1',
  staffId: 'staff_log_1',
  trackingCode: 'ATR-EXP-99001',
  merchantName: 'Boutique Atlas DZ',
  recipientName: 'Amine Benyamina',
  recipientPhone: '0555412233',
  destinationWilaya: '31 - Oran',
  destinationAddress: 'Bir El Djir, Oran',
  deliveryMode: 'StopDesk',
  dimensionsCm: { length: 50, width: 40, height: 30 },
  codAmountDzd: 14500,
  shippingFeeDzd: 650,
  stampDutyDzd: 145,
  weightKg: 12,
  pickupOtpCode: '7492',
  stopDeskShelfCode: 'RACK-B-08',
  status: 'ReceivedAtHub',
  assignedDriverName: 'Farid Belhadj',
  createdAt: '2026-11-28T08:00:00Z',
};

const SAMPLE_MANIFEST: LogisticsManifest = {
  id: 'man_test_01',
  accountId: 'tenant_log_1',
  businessId: 'biz_log_1',
  branchId: 'branch_log_1',
  staffId: 'staff_log_1',
  manifestNumber: 'LVR-2026-0091',
  driverName: 'Farid Belhadj',
  driverPhone: '0550112233',
  vehiclePlate: '04112-120-31',
  dispatchDate: '2026-11-28',
  zoneWilaya: 'Oran & Ouest',
  shipmentIds: ['ship_test_01'],
  totalShipmentsCount: 1,
  totalCodExpectedDzd: 14500,
  totalCodCollectedDzd: 0,
  status: 'Dispatched',
  createdAt: '2026-11-28T07:30:00Z',
};

describe('Phase 3 Step 14 (7.14 logistics_delivery) — Deep Vertical Integration', () => {
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
    initLogisticsWorkspace('dispatcher');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('never leaks expected Stop-Desk OTP into DOM and enforces 3-attempt lockout', () => {
    const html = renderToStaticMarkup(
      <StopDeskHandoverModal
        isOpen={true}
        onClose={() => {}}
        shipment={SAMPLE_SHIPMENT}
        onConfirmDelivery={() => {}}
      />
    );

    expect(html).toContain('ATR-EXP-99001');
    expect(html).toContain('RACK-B-08');
    expect(html).not.toContain('7492');
    expect(html).not.toContain('(Test:');

    const attempt3 = evaluateOtpAttemptLockout({
      expectedOtp: '7492',
      enteredOtp: '0000',
      currentAttempts: 2,
      maxAttempts: 3,
    });
    expect(attempt3.matched).toBe(false);
    expect(attempt3.isLockedOut).toBe(true);
    expect(attempt3.canUnlockWithManagerPin).toBe(true);
  });

  it('blocks AlgeriePosteSfp01Modal export when CCP Mod-97 key is invalid and permits valid batches', () => {
    const validBatch: MerchantRemittanceBatch = {
      id: 'rem_v1',
      accountId: 'tenant_log_1',
      businessId: 'biz_log_1',
      branchId: 'branch_log_1',
      staffId: 'staff_log_1',
      batchNumber: 'LOT-CCP-2026-99',
      merchantName: 'Boutique Atlas DZ',
      ccpAccount: '0012345678',
      ccpKey: calculateCcpKey('0012345678'),
      grossCodDzd: 14500,
      shippingFeesDzd: 650,
      returnFeesDzd: 0,
      netPayoutDzd: 13850,
      paymentChannel: 'AlgeriePoste_SFP01',
      status: 'Approved',
    };
    const invalidBatch: MerchantRemittanceBatch = {
      ...validBatch,
      id: 'rem_bad_1',
      batchNumber: 'LOT-CCP-BAD',
      ccpKey: (validBatch.ccpKey + 17) % 100,
    };

    const invalidCheck = validateRemittanceCcpBatch([invalidBatch]);
    expect(invalidCheck.isValid).toBe(false);
    expect(invalidCheck.invalidIssues.length).toBe(1);

    const invalidHtml = renderToStaticMarkup(
      <AlgeriePosteSfp01Modal isOpen={true} onClose={() => {}} batches={[invalidBatch]} />
    );
    expect(invalidHtml).toContain('LOT-CCP-BAD');
    expect(invalidHtml).toContain('disabled');

    const validHtml = renderToStaticMarkup(
      <AlgeriePosteSfp01Modal isOpen={true} onClose={() => {}} batches={[validBatch]} />
    );
    expect(validHtml).toContain('Boutique Atlas DZ');
    expect(validHtml).toContain('0012345678');
  });

  it('renders TransportManifestPrintModal cleanly with real fields only (no static fake NIF/RC defaults)', () => {
    const blankManifest: LogisticsManifest = {
      ...SAMPLE_MANIFEST,
      originHub: undefined,
      destinationHub: undefined,
      driverNin: undefined,
      transportCardNumber: undefined,
      sealNumbers: undefined,
    };
    const html = renderToStaticMarkup(
      <TransportManifestPrintModal isOpen={true} onClose={() => {}} manifest={blankManifest} />
    );
    expect(html).toContain('LVR-2026-0091');
    expect(html).not.toContain('001916010044589');
    expect(html).not.toContain('16/00-0988421');
    expect(html).not.toContain('SL-994821');
  });

  it('renders LogisticsShipmentModal with volumetric comparison, fragile toggle, and dynamic wilaya catalog', () => {
    const vol = computeVolumetricBillingDetails({
      actualWeightKg: 2,
      dimensionsCm: { length: 50, width: 40, height: 30 },
    });
    expect(vol.usedVolumetric).toBe(true);
    expect(vol.billableWeightKg).toBe(12);

    const fallback = resolveWilayaZone('99 - Nouvelle Wilaya Test', []);
    expect(fallback.isUnknownWilaya).toBe(true);

    const html = renderToStaticMarkup(
      <LogisticsShipmentModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        shipmentToEdit={SAMPLE_SHIPMENT}
      />
    );
    expect(html).toContain('Amine Benyamina');
    expect(html).toContain('Vol:');
    expect(html).toContain('Manutention Fragile');
  });

  it('guards duplicate scans, optimizes route stops, and aggregates live driver payroll', () => {
    const dup = detectDuplicateParcelScan({
      trackingCode: 'ATR-EXP-99001',
      stage: 'Bagging',
      shipmentStatus: 'Sorted',
      recentSessionScans: [{ code: 'ATR-EXP-99001', stage: 'Bagging', status: 'success' }],
    });
    expect(dup.isDuplicate).toBe(true);

    const routePlan = optimizeManifestRouteStops([
      SAMPLE_SHIPMENT,
      {
        ...SAMPLE_SHIPMENT,
        id: 'ship_home_02',
        trackingCode: 'ATR-EXP-99002',
        destinationWilaya: '16 - Alger',
        deliveryMode: 'HomeDelivery',
      },
    ]);
    expect(routePlan.stops.length).toBe(2);
    expect(routePlan.stops[0].wilayaCode).toBe(16);
    expect(routePlan.stops[1].deliveryMode).toBe('StopDesk');

    const discharges: CourierCashDischarge[] = [
      {
        id: 'd1',
        accountId: 'tenant_log_1',
        businessId: 'biz_log_1',
        branchId: 'branch_log_1',
        cashierStaffId: 'staff_1',
        courierStaffId: 'Farid Belhadj',
        manifestId: 'man_test_01',
        dischargeNumber: 'DECH-2026-0001',
        deliveredCount: 10,
        returnedCount: 1,
        expectedCodDzd: 100000,
        actualCashTurnedInDzd: 99000,
        discrepancyDzd: -1000,
        banknotesCount: { note2000: 45, note1000: 9, note500: 0, note200: 0, coins: 0 },
        courierSignatureConfirmed: true,
        status: 'Shortage',
        timestamp: '2026-11-28T17:00:00Z',
      },
    ];
    const payroll = aggregateDriverPayrollSummaries({
      shipments: [SAMPLE_SHIPMENT],
      discharges,
      manifests: [SAMPLE_MANIFEST],
    });
    expect(payroll.length).toBe(1);
    expect(payroll[0].dischargeShortageDzd).toBe(1000);
  });

  it('renders TrackingDrawer, DriverPodModal, OperationsPanel, and all 4 Logistics views cleanly in EN/FR/AR', () => {
    const podHtml = renderToStaticMarkup(
      <LogisticsDriverPodModal
        isOpen={true}
        onClose={() => {}}
        shipment={SAMPLE_SHIPMENT}
        language="fr"
        onSubmitPod={() => {}}
      />
    );
    expect(podHtml).toContain('pod-signature-canvas');
    expect(podHtml).toContain('ATR-EXP-99001');

    const trackHtml = renderToStaticMarkup(
      <LogisticsTrackingDrawer
        isOpen={true}
        onClose={() => {}}
        shipment={SAMPLE_SHIPMENT}
        events={[]}
        language="fr"
        onLogNotification={() => {}}
      />
    );
    expect(trackHtml).toContain('TRK-ATREXP99001');

    const opsHtml = renderToStaticMarkup(
      <LogisticsOperationsPanel
        language="fr"
        shipments={[SAMPLE_SHIPMENT]}
        vehicleLogs={[]}
        merchantFeeInvoices={[]}
        carrierIntegrations={[]}
        freightWaybills={[]}
        movingQuotes={[]}
        coldChainLogs={[]}
        customsDossiers={[]}
        towingDispatches={[]}
        onAddVehicleLog={() => {}}
        onIssueMerchantInvoice={() => {}}
        onAddIntegration={() => {}}
        onToggleIntegration={() => {}}
        onAddFreightWaybill={() => {}}
        onAddMovingQuote={() => {}}
        onAddColdChainLog={() => {}}
        onAddCustomsDossier={() => {}}
        onAddTowingDispatch={() => {}}
      />
    );
    expect(opsHtml).toContain('Flotte');
    expect(opsHtml).toContain('Fret &amp; LTL/FTL');
    expect(opsHtml).toContain('Chaîne du Froid');

    for (const lang of ['en', 'fr', 'ar'] as const) {
      setLanguageAction(lang);
      const htmls = [
        renderToStaticMarkup(<LogisticsShipmentsView />),
        renderToStaticMarkup(<LogisticsScannerView />),
        renderToStaticMarkup(<LogisticsManifestsView />),
        renderToStaticMarkup(<LogisticsCodView />),
      ];
      for (const html of htmls) {
        expect(html.length).toBeGreaterThan(200);
        expect(html).not.toContain('feature_not_available_phase2');
        expect(html).not.toContain('undefined');
      }
    }
  });
});
