import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as clientModule from '../client';
import {
  syncCoordinator,
  subscribeConcurrencyConflicts,
  subscribeConcurrencyResolutions,
  emitConcurrencyResolution,
  type ConcurrencyConflictEvent,
  type ConcurrencyResolutionEvent,
} from '../syncCoordinator';
import {
  clearOfflineQueue,
  enqueueMutation,
  flushOfflineQueue,
  getOfflineQueueCount,
} from '../offlineQueue';
import { tenantService } from '../services/tenantService';
import { memberService } from '../services/memberService';
import { contractorService } from '../services/contractorService';
import { agricultureService } from '../services/agricultureService';
import { realEstateService } from '../services/realEstateService';
import { medicalService } from '../services/medicalService';
import { manufacturingService } from '../services/manufacturingService';
import { projectMilestoneService } from '../services/projectMilestoneService';
import { logisticsService } from '../services/logisticsService';
import { validateBackupSnapshot } from '../../../services/store';

function createMockSupabaseForConflicts(opts: {
  upsertError?: any;
  updateRows?: any[];
  serverRow?: Record<string, any> | null;
}) {
  const fromMock = vi.fn((_table: string) => ({
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: opts.upsertError ? null : { id: 'rec_1', version: 2 },
          error: opts.upsertError || null,
        }),
      })),
    })),
    update: vi.fn(() => {
      const updateChain: any = {
        eq: vi.fn(() => updateChain),
        select: vi.fn().mockResolvedValue({
          data: opts.updateRows ?? [],
          error: null,
        }),
      };
      return updateChain;
    }),
    select: vi.fn(() => {
      const selectChain: any = {
        eq: vi.fn(() => selectChain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: opts.serverRow ?? null,
          error: null,
        }),
      };
      return selectChain;
    }),
  }));

  return {
    from: fromMock,
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  };
}

describe('Optimistic Concurrency, Atomic Batch RPCs & Backup Validation', () => {
  beforeEach(() => {
    clearOfflineQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearOfflineQueue();
  });

  it('emits ConcurrencyConflictEvent on 40001 upsert error without enqueuing into offlineQueue', async () => {
    const serverSnapshot = {
      id: clientModule.toValidUuid('member_conflict_1'),
      full_name: 'Karim Server',
      version: 5,
    };
    const mockClient = createMockSupabaseForConflicts({
      upsertError: { code: '40001', message: 'CONFLICT_STALE_VERSION: expected version 3, current version 5' },
      serverRow: serverSnapshot,
    });

    vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const events: ConcurrencyConflictEvent[] = [];
    const unsubscribe = subscribeConcurrencyConflicts((ev) => events.push(ev));

    const res = await syncCoordinator.mutateOrQueueUpsert(
      'gym_members',
      {
        id: serverSnapshot.id,
        full_name: 'Karim Local',
        version: 3,
      },
      {
        expectedVersion: 3,
        entityType: 'Member',
        entityLabel: 'Karim Local',
      }
    );

    unsubscribe();

    expect(res.success).toBe(false);
    expect(res.queued).toBe(false);
    expect(res.conflict).toBe(true);
    expect(getOfflineQueueCount()).toBe(0);
    expect(events).toHaveLength(1);
    expect(events[0].table).toBe('gym_members');
    expect(events[0].expectedVersion).toBe(3);
    expect(events[0].serverVersion).toBe(5);
    expect(events[0].serverData?.full_name).toBe('Karim Server');
  });

  it('emits ConcurrencyConflictEvent when mutateOrQueueUpdate matches 0 rows due to stale version', async () => {
    const targetUuid = clientModule.toValidUuid('prod_conflict_2');
    const mockClient = createMockSupabaseForConflicts({
      updateRows: [],
      serverRow: { id: targetUuid, name: 'Server Name', price: 2400, version: 4 },
    });

    vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const events: ConcurrencyConflictEvent[] = [];
    const unsubscribe = subscribeConcurrencyConflicts((ev) => events.push(ev));

    const res = await syncCoordinator.mutateOrQueueUpdate(
      'pos_products',
      'prod_conflict_2',
      { price: 2100 },
      { expectedVersion: 2, entityType: 'Product', entityLabel: 'Espresso Blend' }
    );

    unsubscribe();

    expect(res.success).toBe(false);
    expect(res.queued).toBe(false);
    expect(res.conflict).toBe(true);
    expect(getOfflineQueueCount()).toBe(0);
    expect(events).toHaveLength(1);
    expect(events[0].expectedVersion).toBe(2);
    expect(events[0].serverVersion).toBe(4);
  });

  it('forwards offline queue replay conflicts into subscribeConcurrencyConflicts and removes the conflicting mutation', async () => {
    const targetUuid = clientModule.toValidUuid('client_offline_1');
    enqueueMutation({
      kind: 'update',
      table: 'salon_clients',
      recordId: targetUuid,
      payload: { notes: 'Offline edit' },
      expectedVersion: 1,
      versionColumn: 'version',
      entityType: 'Client',
      entityLabel: 'Nadia',
    });
    expect(getOfflineQueueCount()).toBe(1);

    const mockClient = createMockSupabaseForConflicts({
      updateRows: [],
      serverRow: { id: targetUuid, notes: 'Newer server edit', version: 3 },
    });
    vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const events: ConcurrencyConflictEvent[] = [];
    const unsubscribe = subscribeConcurrencyConflicts((ev) => events.push(ev));

    const flush = await flushOfflineQueue();
    unsubscribe();

    expect(flush).toEqual({ processed: 1, succeeded: 0, failed: 0, conflicts: 1 });
    expect(getOfflineQueueCount()).toBe(0);
    expect(events).toHaveLength(1);
    expect(events[0].table).toBe('salon_clients');
    expect(events[0].serverVersion).toBe(3);
  });

  it('executes single atomic RPC calls for manufacturing BOM, PM CCP batch slips, and logistics tariffs', async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const fromSpy = vi.fn();

    vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue({
      rpc: rpcSpy,
      from: fromSpy,
    } as any);

    // 1. Manufacturing BOM atomic upsert
    const bomOk = await manufacturingService.upsertBom({
      id: 'bom_1',
      accountId: 'acc_01',
      businessId: 'biz_mfg',
      branchId: 'branch_mfg',
      staffId: 'staff_01',
      bomCode: 'BOM-001',
      finishedProductId: 'prod_1',
      finishedProductName: 'Biscuit Box',
      finishedProductSku: 'SKU-01',
      unit: 'box',
      batchYield: 100,
      estimatedCostDzd: 12000,
      standardLaborHours: 2,
      version: 1,
      rowVersion: 2,
      archetype: 'Discrete',
      components: [
        {
          id: 'c1',
          rawProductId: 'raw_1',
          rawProductName: 'Flour',
          quantity: 10,
          unit: 'kg',
          unitCostDzd: 120,
          scrapAllowancePercent: 2,
        },
        {
          id: 'c2',
          rawProductId: 'raw_2',
          rawProductName: 'Sugar',
          quantity: 5,
          unit: 'kg',
          unitCostDzd: 150,
          scrapAllowancePercent: 1,
        },
      ],
      routingSteps: [],
      totalMaterialCostDzd: 1950,
      totalLaborCostDzd: 1000,
      totalLaborMachineCostDzd: 1200,
      suggestedSalePriceDzd: 18000,
      targetMarginPercent: 30,
      status: 'Active',
      isActive: true,
      createdAt: '2026-11-19T00:00:00Z',
    });
    expect(bomOk).toBe(true);

    // 2. Project Milestone CCP batch slips atomic generation
    const talentsMap = new Map([
      [
        'tal_1',
        {
          id: 'tal_1',
          fullName: 'Yacine Benali',
          ccpNumber: '0023456789',
          ccpKey: '42',
          wilayaName: 'Alger',
        } as any,
      ],
      [
        'tal_2',
        {
          id: 'tal_2',
          fullName: 'Meriem Khelifi',
          ccpNumber: '0098765432',
          ccpKey: '11',
          wilayaName: 'Oran',
        } as any,
      ],
    ]);
    const slips = await projectMilestoneService.generateCcpBatchSlips(
      {
        id: 'batch_1',
        tenantId: 'acc_01',
        facilityId: 'branch_pm',
        projectId: 'proj_1',
        projectTitle: 'Activation Alger',
        missionId: 'miss_1',
        missionCode: 'MIS-01',
        batchNumber: 'B-001',
        totalBeneficiaries: 2,
        totalAmountDzd: 9000,
        status: 'draft',
        createdAt: '2026-11-19T00:00:00Z',
      } as any,
      [
        { id: 'att_1', talentId: 'tal_1', status: 'present', grossPayableDzd: 4500 } as any,
        { id: 'att_2', talentId: 'tal_2', status: 'present', grossPayableDzd: 4500 } as any,
      ],
      talentsMap
    );
    expect(slips).toHaveLength(2);

    // 3. Logistics wilaya tariff matrix batch upsert
    const tariffsOk = await logisticsService.upsertWilayaTariffs(
      {
        zone_1_algiers: {
          zone: 'zone_1_algiers',
          label: 'Alger',
          wilayas: ['16 - Alger'],
          baseWeightKg: 5,
          homeBasePriceDzd: 450,
          stopDeskBasePriceDzd: 250,
          overweightPerKgDzd: 50,
          fragileHandlingSurchargeDzd: 100,
          insuranceRatePercent: 1,
        },
        zone_2_north: {
          zone: 'zone_2_north',
          label: 'Nord',
          wilayas: ['31 - Oran'],
          baseWeightKg: 5,
          homeBasePriceDzd: 650,
          stopDeskBasePriceDzd: 400,
          overweightPerKgDzd: 60,
          fragileHandlingSurchargeDzd: 150,
          insuranceRatePercent: 1,
        },
      } as any,
      { accountId: 'acc_01', businessId: 'biz_log', branchId: 'branch_log' }
    );
    expect(tariffsOk).toBe(true);

    expect(fromSpy).not.toHaveBeenCalled();
    expect(rpcSpy.mock.calls.map((c) => c[0])).toEqual([
      'mfg_upsert_bom_atomic',
      'pm_generate_ccp_batch_slips_atomic',
      'logistics_upsert_wilaya_tariffs_batch',
    ]);
  });

  it('validates JSON backup snapshots with schema diagnostics, totalRecords, warnings, and deterministic checksum', () => {
    const validPayload = JSON.stringify({
      storageVersion: 2,
      exportedAt: '2026-11-19T09:30:00.000Z',
      account: { id: 'acc_01', ownerName: 'Tamer' },
      businesses: [{ id: 'biz_1', name: 'Atrium Flagship' }],
      branches: [{ id: 'br_1', name: 'Main Branch' }],
      members: [{ id: 'm1' }, { id: 'm2' }],
      products: [{ id: 'p1' }],
    });

    const ok = validateBackupSnapshot(validPayload);
    expect(ok.valid).toBe(true);
    expect(ok.totalRecords).toBe(5);
    expect(ok.primaryBusiness).toBe('Atrium Flagship');
    expect(ok.checksum).toMatch(/^fnv1a-[0-9a-f]{8}$/);
    expect(ok.errors).toHaveLength(0);

    const oldSchema = validateBackupSnapshot({
      storageVersion: 1,
      account: { id: 'acc_01' },
      businesses: [],
      branches: [],
    });
    expect(oldSchema.valid).toBe(true);
    expect(oldSchema.warnings.length).toBeGreaterThanOrEqual(2);

    const invalidJson = validateBackupSnapshot('{broken-json');
    expect(invalidJson.valid).toBe(false);
    expect(invalidJson.errors[0]).toContain('Invalid JSON');

    const missingKeys = validateBackupSnapshot(JSON.stringify({ hello: 'world' }));
    expect(missingKeys.valid).toBe(false);
    expect(missingKeys.errors.length).toBe(3);
  });

  it('filters out soft-deleted businesses and branches in tenantService queries', async () => {
    const isCallsByTable: Record<string, Array<[string, any]>> = {};

    const mockClient = {
      from: vi.fn((table: string) => {
        isCallsByTable[table] = isCallsByTable[table] || [];
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          is: vi.fn((col: string, val: any) => {
            isCallsByTable[table].push([col, val]);
            return chain;
          }),
          order: vi.fn(() => chain),
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        return chain;
      }),
    };

    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const accountUuid = '11111111-1111-4111-8111-111111111111';
    const businessUuid = '22222222-2222-4222-8222-222222222222';

    await tenantService.fetchBusinesses(accountUuid);
    await tenantService.fetchBranches(accountUuid, businessUuid);

    expect(isCallsByTable.businesses).toContainEqual(['deleted_at', null]);
    expect(isCallsByTable.branches).toContainEqual(['deleted_at', null]);
  });

  it('routes memberService.deleteScheduleEvent and Group B delete wrappers with canonical table and ID prefixes', async () => {
    const softDeleteSpy = vi
      .spyOn(syncCoordinator, 'softDeleteRow')
      .mockResolvedValue({ success: true, queued: false, conflict: false });

    expect(await memberService.deleteScheduleEvent('sched_1', 'staff_9')).toBe(true);
    expect(await contractorService.deleteCaisseExpense('caisse_7', 'staff_2')).toBe(true);
    expect(await agricultureService.deletePointage('day_3', 'staff_5')).toBe(true);
    expect(await medicalService.deleteAppointment('apt_4', 'staff_8')).toBe(true);

    expect(softDeleteSpy.mock.calls).toEqual([
      ['gym_schedule_events', 'sched_1', 'staff_9'],
      ['btp_materials', 'exp_caisse_7', 'staff_2'],
      ['agri_sales', 'ptg_day_3', 'staff_5'],
      ['medical_appointments', 'apt_4', 'staff_8'],
    ]);
  });

  it('forwards expectedVersion on secondary upserts and hydrates authoritative DB row.version on packed-meta fetches', async () => {
    const mutateSpy = vi
      .spyOn(syncCoordinator, 'mutateOrQueueUpsert')
      .mockResolvedValue({ success: true, queued: false, conflict: false });

    await manufacturingService.upsertSessionLog({
      id: 'log_1',
      accountId: 'acc_01',
      businessId: 'biz_mfg',
      branchId: 'branch_mfg',
      staffId: 'staff_01',
      orderId: 'ord_1',
      orderNumber: 'OF-101',
      workstationName: 'CNC-1',
      operationName: 'Cutting',
      operatorName: 'Amine',
      startTime: '2026-11-19T08:00:00Z',
      goodQuantity: 40,
      scrapQuantity: 1,
      pauseDurationSeconds: 120,
      version: 4,
    } as any);

    await realEstateService.upsertQuittance({
      id: 'q_1',
      accountId: 'acc_01',
      businessId: 'biz_re',
      branchId: 'branch_re',
      staffId: 'staff_01',
      leaseId: 'lease_1',
      periodMonth: 11,
      periodYear: 2026,
      paymentDate: '2026-11-05',
      totalCollectedDzd: 65000,
      version: 6,
    } as any);

    await medicalService.upsertPrescription(
      {
        id: 'rx_1',
        accountId: 'acc_01',
        businessId: 'biz_med',
        branchId: 'branch_med',
        staffId: 'staff_01',
        patientId: 'pat_1',
        patientName: 'Sami',
        prescriptionDate: '2026-11-19',
        items: [],
        qrCodeHash: 'qr_123',
        isSigned: true,
        version: 9,
      } as any,
      { accountId: 'acc_01', businessId: 'biz_med', branchId: 'branch_med', staffId: 'staff_01' }
    );

    expect(mutateSpy.mock.calls.map((c) => c[2]?.expectedVersion)).toEqual([4, 6, 9]);

    const mfgPayload = mutateSpy.mock.calls[0][1];
    const rePayload = mutateSpy.mock.calls[1][1];
    const medPayload = mutateSpy.mock.calls[2][1];

    const tableRows: Record<string, any[]> = {
      mfg_workstation_logs: [{ ...mfgPayload, version: 11 }],
      re_rent_schedules: [{ ...rePayload, version: 12 }],
      medical_consultations: [{ ...medPayload, version: 13 }],
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          ilike: vi.fn(() => chain),
          gt: vi.fn(() => chain),
          order: vi.fn(() => chain),
          range: vi.fn().mockResolvedValue({ data: tableRows[table] || [], error: null }),
        };
        return chain;
      }),
    };

    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const logs = await manufacturingService.fetchSessionLogs('branch_mfg');
    const quittances = await realEstateService.fetchQuittances('branch_re');
    const prescriptions = await medicalService.fetchPrescriptions('branch_med');

    expect(logs[0].version).toBe(11);
    expect(quittances[0].version).toBe(12);
    expect(prescriptions[0].version).toBe(13);
  });

  it('delivers concurrency resolution events to active subscribers and stops after unsubscribe', () => {
    const received: ConcurrencyResolutionEvent[] = [];
    const unsubscribe = subscribeConcurrencyResolutions((ev) => received.push(ev));

    emitConcurrencyResolution({ table: 'mfg_orders', recordId: 'ord_1', resolution: 'server' });
    unsubscribe();
    emitConcurrencyResolution({ table: 're_leases', recordId: 'lease_2', resolution: 'overwrite' });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ table: 'mfg_orders', recordId: 'ord_1', resolution: 'server' });
  });
});
