import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalCodeBaselineStatutoryRate,
  getLocalFallbackWilayasRef,
  getMissingStatutoryParameters,
  selectEffectiveStatutoryRate,
  type StatutoryRateSet,
} from '../services/referenceDataService';
import {
  clearCachedDeviceBlocks,
  seedLocalDeviceBlock,
  sequenceService,
} from '../services/sequenceService';
import { toValidUuid } from '../client';

function installMemoryStorage(): void {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockStorage },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
}

describe('referenceDataService — effective_from versioning & baseline checks', () => {
  it('seeds code-baseline statutory rate as unverified with NULL effective_from & NULL snmg_dzd', () => {
    const baseline = getLocalCodeBaselineStatutoryRate();
    expect(baseline.verificationStatus).toBe('unverified');
    expect(baseline.isLegacyBaseline).toBe(true);
    expect(baseline.effectiveFrom).toBeNull();
    expect(baseline.snmgDzd).toBeNull();
    expect(baseline.cnasSalarialRate).toBe(0.09);
    expect(baseline.cnasPatronalRate).toBe(0.26);
    expect(baseline.overtimeMultiplier50).toBe(1.5);
    expect(baseline.overtimeMultiplier100).toBe(2.0);
    expect(baseline.irgAbatementRate).toBe(0.4);
    expect(baseline.irgAbatementMinDzd).toBe(1000);
    expect(baseline.irgAbatementMaxDzd).toBe(1500);
    expect(baseline.irgExemptionThresholdDzd).toBe(30000);
    expect(baseline.irgTransitionalMaxDzd).toBe(35000);
    expect(baseline.irgTransitionalConfig?.min_dzd).toBe(30001);
    expect(baseline.tvaRates).toEqual([0, 9, 19]);
    expect(getMissingStatutoryParameters(baseline)).toContain('snmg_dzd');
  });

  it('selects latest non-superseded version with effective_from <= targetDate and ranks dated above NULL baseline', () => {
    const baseline = getLocalCodeBaselineStatutoryRate();
    const v2025Superseded: StatutoryRateSet = {
      ...baseline,
      id: 'v-2025-sup',
      versionCode: 'DZ-2025-ERR',
      effectiveFrom: '2025-01-01',
      isLegacyBaseline: false,
      verificationStatus: 'superseded',
      snmgDzd: 20000,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const v2026: StatutoryRateSet = {
      ...baseline,
      id: 'v-2026',
      versionCode: 'DZ-2026-FIN',
      effectiveFrom: '2026-01-01',
      isLegacyBaseline: false,
      verificationStatus: 'verified',
      snmgDzd: 24000,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const v2027Future: StatutoryRateSet = {
      ...baseline,
      id: 'v-2027',
      versionCode: 'DZ-2027-DRAFT',
      effectiveFrom: '2027-01-01',
      isLegacyBaseline: false,
      verificationStatus: 'unverified',
      snmgDzd: 26000,
      createdAt: '2026-12-01T00:00:00.000Z',
    };

    const all = [baseline, v2025Superseded, v2026, v2027Future];

    expect(selectEffectiveStatutoryRate(all, '2025-06-15')?.id).toBe(baseline.id);
    expect(selectEffectiveStatutoryRate(all, '2026-01-01')?.id).toBe(v2026.id);
    expect(selectEffectiveStatutoryRate(all, '2026-11-24')?.id).toBe(v2026.id);
    expect(getMissingStatutoryParameters(v2026)).toEqual([]);
  });

  it('provides 58 legacy unverified wilayas fallback with NULL validFrom matching ALGERIA_58_WILAYAS', () => {
    const wilayas = getLocalFallbackWilayasRef();
    expect(wilayas).toHaveLength(58);
    expect(wilayas.every((w) => w.isLegacy && w.verificationStatus === 'unverified' && w.validFrom === null)).toBe(true);
    expect(wilayas.find((w) => w.code === 16)?.nameFr).toBe('Alger');
    expect(wilayas.find((w) => w.code === 58)?.nameFr).toBe('El Meniaa');
  });
});

describe('sequenceService — device blocks & document-type guardrails', () => {
  beforeEach(() => {
    installMemoryStorage();
    clearCachedDeviceBlocks();
  });

  it('allocates sequentially from cached device blocks for walk-in tickets & deposit receipts', async () => {
    const biz = '11111111-1111-4111-8111-111111111111';
    const br = '22222222-2222-4222-8222-222222222222';
    seedLocalDeviceBlock({
      businessId: toValidUuid(biz),
      branchId: toValidUuid(br),
      deviceId: 'dev-frontdesk-01',
      docType: 'walk_in_ticket',
      fiscalYear: 2026,
      rangeStart: 101,
      rangeEnd: 102,
      nextNumber: 101,
      prefix: 'WI',
      allocatedAt: '2026-11-24T00:00:00.000Z',
    });

    const first = await sequenceService.allocateFromDeviceBlock({
      businessId: biz,
      branchId: br,
      docType: 'walk_in_ticket',
      fiscalYear: 2026,
      deviceId: 'dev-frontdesk-01',
    });
    expect(first.data).toEqual({
      seqNumber: 101,
      fiscalYear: 2026,
      formattedNumber: 'WI-2026-00101',
      source: 'device_block',
    });

    const second = await sequenceService.allocateFromDeviceBlock({
      businessId: biz,
      branchId: br,
      docType: 'walk_in_ticket',
      fiscalYear: 2026,
      deviceId: 'dev-frontdesk-01',
    });
    expect(second.data?.formattedNumber).toBe('WI-2026-00102');

    // Exhausted block when offline must fail closed cleanly rather than duplicating/overflowing
    const exhausted = await sequenceService.allocateFromDeviceBlock({
      businessId: biz,
      branchId: br,
      docType: 'walk_in_ticket',
      fiscalYear: 2026,
      deviceId: 'dev-frontdesk-01',
    });
    expect(exhausted.data).toBeUndefined();
    expect(exhausted.error).toBeTruthy();
  });

  it('rejects fiscal_invoice and z_report from device block reservation', async () => {
    const biz = '11111111-1111-4111-8111-111111111111';
    const br = '22222222-2222-4222-8222-222222222222';

    const invAttempt = await sequenceService.reserveDeviceBlock({
      businessId: biz,
      branchId: br,
      docType: 'fiscal_invoice' as any,
    });
    expect(invAttempt.error).toContain('DEVICE_BLOCK_UNSUPPORTED_DOC_TYPE');

    const zAttempt = await sequenceService.allocateFromDeviceBlock({
      businessId: biz,
      branchId: br,
      docType: 'z_report' as any,
    });
    expect(zAttempt.error).toContain('DEVICE_BLOCK_UNSUPPORTED_DOC_TYPE');
  });
});
