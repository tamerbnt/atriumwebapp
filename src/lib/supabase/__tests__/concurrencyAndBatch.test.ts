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
import { posService } from '../services/posService';
import { tradingService } from '../services/tradingService';
import { contractorService } from '../services/contractorService';
import { agricultureService } from '../services/agricultureService';
import { realEstateService } from '../services/realEstateService';
import { medicalService } from '../services/medicalService';
import { manufacturingService } from '../services/manufacturingService';
import { projectMilestoneService } from '../services/projectMilestoneService';
import { logisticsService } from '../services/logisticsService';
import { mapDeviceFromDb } from '../mappers';
import {
  atriumActions,
  applyResolvedRowToSlice,
  validateBackupSnapshot,
} from '../../../services/store';

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
      .mockResolvedValue({ success: true, queued: false });

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

    const serverEvent: ConcurrencyResolutionEvent = {
      table: 'mfg_orders',
      recordId: 'ord_1',
      strategy: 'server',
      resolvedVersion: 2,
      resolvedRecord: null,
      resolvedAt: '2026-11-19T12:00:00Z',
    };
    const overwriteEvent: ConcurrencyResolutionEvent = {
      table: 're_leases',
      recordId: 'lease_2',
      strategy: 'overwrite',
      resolvedVersion: 3,
      resolvedRecord: null,
      resolvedAt: '2026-11-19T12:01:00Z',
    };

    emitConcurrencyResolution(serverEvent);
    unsubscribe();
    emitConcurrencyResolution(overwriteEvent);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(serverEvent);
  });

  it('chains .eq("business_id") before .order().range() in tenantService.fetchBranches and hydrates Device/StockMovement/PM versions', async () => {
    const accountUuid = '11111111-1111-4111-8111-111111111111';
    const businessUuid = '22222222-2222-4222-8222-222222222222';
    const eqCalls: Array<[string, any]> = [];

    const tableRows: Record<string, any[]> = {
      branches: [
        {
          id: 'br_1',
          account_id: accountUuid,
          business_id: businessUuid,
          name: 'Hydra HQ',
          code: 'HYD-01',
          is_main_branch: true,
          is_active: true,
          version: 7,
          created_at: '2026-11-19T10:00:00Z',
        },
      ],
      pos_stock_movements: [
        {
          id: 'sm_1',
          account_id: accountUuid,
          branch_id: 'br_1',
          product_id: 'prod_1',
          product_name: 'Espresso',
          movement_type: 'refund',
          quantity: 2,
          previous_stock: 10,
          new_stock: 12,
          version: 8,
          created_at: '2026-11-19T10:05:00Z',
        },
        {
          id: 'sm_2',
          account_id: accountUuid,
          branch_id: 'br_1',
          product_id: 'prod_1',
          product_name: 'Espresso',
          movement_type: 'adjustment',
          quantity: -1,
          previous_stock: 12,
          new_stock: 11,
          version: 9,
          created_at: '2026-11-19T10:06:00Z',
        },
      ],
      pm_attendances: [
        {
          id: 'att_1',
          account_id: accountUuid,
          business_id: businessUuid,
          branch_id: 'br_1',
          mission_id: 'miss_1',
          talent_id: 'tal_1',
          talent_name: 'Amine',
          date: '2026-11-19',
          status: 'present',
          version: 14,
        },
      ],
      pm_payroll_batches: [
        {
          id: 'bat_1',
          account_id: accountUuid,
          business_id: businessUuid,
          branch_id: 'br_1',
          project_id: 'proj_1',
          project_title: 'Activation',
          mission_id: 'miss_1',
          mission_code: 'M-1',
          batch_number: 'B-1',
          total_beneficiaries: 1,
          total_amount_dzd: 3500,
          status: 'draft',
          version: 15,
          created_at: '2026-11-19T10:00:00Z',
        },
      ],
      pm_ccp_slips: [
        {
          id: 'slip_1',
          account_id: accountUuid,
          business_id: businessUuid,
          branch_id: 'br_1',
          batch_id: 'bat_1',
          talent_id: 'tal_1',
          beneficiary_name: 'Amine',
          ccp_number: '123456',
          ccp_key: '12',
          wilaya_name: 'Alger',
          amount_dzd: 3500,
          amount_in_words_fr: 'Trois mille cinq cents dinars',
          amount_in_words_ar: 'ثلاثة آلاف وخمسمائة دينار',
          transaction_reference: 'REF-1',
          is_printed: false,
          version: 16,
          created_at: '2026-11-19T10:00:00Z',
        },
      ],
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        const orderChain: any = {
          order: vi.fn(() => orderChain),
          // Plain terminal result without .eq — proves .eq() cannot be chained after .order()
          range: vi.fn().mockResolvedValue({ data: tableRows[table] || [], error: null }),
        };
        const preRangeChain: any = {
          select: vi.fn(() => preRangeChain),
          eq: vi.fn((col: string, val: any) => {
            eqCalls.push([col, val]);
            return preRangeChain;
          }),
          is: vi.fn(() => preRangeChain),
          gt: vi.fn(() => preRangeChain),
          order: vi.fn(() => orderChain),
        };
        return preRangeChain;
      }),
    };

    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const branches = await tenantService.fetchBranches(accountUuid, businessUuid);
    const movements = await posService.fetchStockMovements('br_1');
    const attendances = await projectMilestoneService.fetchAttendances('br_1');
    const batches = await projectMilestoneService.fetchPayrollBatches('br_1');
    const slips = await projectMilestoneService.fetchCcpSlips('br_1');
    const mappedDevice = mapDeviceFromDb({
      id: 'dev_1',
      account_id: accountUuid,
      branch_id: 'br_1',
      hardware_id: 'HW-01',
      label: 'Front Desk',
      is_active: true,
      last_seen_at: '2026-11-19T10:00:00Z',
      registered_at: '2026-11-19T09:00:00Z',
      version: 5,
    } as any);

    expect(eqCalls).toContainEqual(['business_id', businessUuid]);
    expect(branches[0].version).toBe(7);
    expect(movements.map((m) => [m.type, m.version])).toEqual([
      ['Return', 8],
      ['Adjustment', 9],
    ]);
    expect(attendances[0].version).toBe(14);
    expect(batches[0].version).toBe(15);
    expect(slips[0].version).toBe(16);
    expect(mappedDevice.version).toBe(5);
  });

  it('routes product mutations to tradingService vs posService by branch category and passes secondary expectedVersion metadata', async () => {
    const baseline = atriumActions.exportDatabase();
    try {
      vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);
      const tradingUpsertSpy = vi.spyOn(tradingService, 'upsertProduct').mockResolvedValue(true);
      const tradingDeleteSpy = vi.spyOn(tradingService, 'deleteProduct').mockResolvedValue(true);
      const posUpsertSpy = vi.spyOn(posService, 'upsertProduct').mockResolvedValue(true);
      const posDeleteSpy = vi.spyOn(posService, 'deleteProduct').mockResolvedValue(true);
      const coordUpsertSpy = vi
        .spyOn(syncCoordinator, 'mutateOrQueueUpsert')
        .mockResolvedValue({ success: true, queued: false, conflict: false });
      const coordUpdateSpy = vi
        .spyOn(syncCoordinator, 'mutateOrQueueUpdate')
        .mockResolvedValue({ success: true, queued: false, conflict: false });

      // Switch to trading_commercial business
      atriumActions.switchBusiness('biz_trading');
      const tradingProd = atriumActions.addProduct({
        name: 'Acier Rond 12mm',
        description: 'Lot négoce',
        price: { amount: 1850, currency: 'DZD' },
        cost: { amount: 1400, currency: 'DZD' },
        stockQuantity: 100,
        sku: 'TRD-12',
        category: 'Matériaux',
        reorderLevel: 10,
        isActive: true,
        isPinned: false,
      });
      atriumActions.updateProduct(tradingProd.id, { stockQuantity: 120 });
      atriumActions.deleteProduct(tradingProd.id);

      expect(tradingUpsertSpy).toHaveBeenCalledTimes(2);
      expect(tradingDeleteSpy).toHaveBeenCalledTimes(1);
      expect(posUpsertSpy).not.toHaveBeenCalled();
      expect(posDeleteSpy).not.toHaveBeenCalled();

      // Switch to pos_inventory business
      atriumActions.switchBusiness('biz_restaurant');
      const posProd = atriumActions.addProduct({
        name: 'Flat White',
        description: 'Specialty coffee',
        price: { amount: 400, currency: 'DZD' },
        cost: { amount: 120, currency: 'DZD' },
        stockQuantity: 50,
        sku: 'POS-FW',
        category: 'Beverages',
        reorderLevel: 5,
        isActive: true,
        isPinned: false,
      });
      atriumActions.adjustStock(posProd.id, 5, 'delta', 'Restock check', 'Restock');
      atriumActions.deleteProduct(posProd.id);

      expect(posUpsertSpy).toHaveBeenCalledTimes(2);
      expect(posDeleteSpy).toHaveBeenCalledTimes(1);

      // Register device + seed versioned PM attendance & CCP slip via snapshot and confirm expectedVersion forwarding
      const snap = JSON.parse(atriumActions.exportDatabase());
      snap.devices = [];
      if (!Array.isArray(snap.pmAttendances) || snap.pmAttendances.length === 0) {
        snap.pmAttendances = [
          {
            id: 'att_test_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            missionId: 'miss_1',
            talentId: 'tal_1',
            talentName: 'Yacine Test',
            date: '2026-11-19',
            status: 'present',
            minutesLate: 0,
            shiftRating: 5,
            dayRateDzd: 3500,
            grossPayableDzd: 3500,
            isLocked: false,
            version: 22,
          },
        ];
      } else {
        snap.pmAttendances[0].version = 22;
      }
      if (!Array.isArray(snap.pmCcpSlips) || snap.pmCcpSlips.length === 0) {
        snap.pmCcpSlips = [
          {
            id: 'slip_test_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            batchId: 'batch_1',
            talentId: 'tal_1',
            beneficiaryName: 'Yacine Test',
            ccpNumber: '00123456',
            ccpKey: '42',
            wilayaName: 'Alger',
            amountDzd: 3500,
            amountInWordsFr: 'Trois mille cinq cents dinars',
            amountInWordsAr: 'ثلاثة آلاف وخمسمائة دينار',
            transactionReference: 'REF-01',
            isPrinted: false,
            createdAt: '2026-11-19T08:00:00Z',
            version: 33,
          },
        ];
      } else {
        snap.pmCcpSlips[0].version = 33;
      }
      atriumActions.importDatabase(JSON.stringify(snap));

      atriumActions.registerDevice('Caisse Comptoir', 'HW-POS-01');
      const movementUpsertCall = coordUpsertSpy.mock.calls.find(
        (c) => c[0] === 'pos_stock_movements'
      );
      const deviceUpsertCall = coordUpsertSpy.mock.calls.find((c) => c[0] === 'devices');
      expect(movementUpsertCall?.[2]).toMatchObject({
        entityType: 'StockMovement',
        entityLabel: 'Flat White',
      });
      expect(deviceUpsertCall?.[2]).toMatchObject({
        entityType: 'Device',
        entityLabel: 'Caisse Comptoir',
      });

      atriumActions.updatePmAttendanceStatus(snap.pmAttendances[0].id, 'late', 15);
      atriumActions.markPmCcpSlipPrinted(snap.pmCcpSlips[0].id);

      const attUpdateCall = coordUpdateSpy.mock.calls.find((c) => c[0] === 'pm_attendances');
      const slipUpdateCall = coordUpdateSpy.mock.calls.find((c) => c[0] === 'pm_ccp_slips');
      expect(attUpdateCall?.[3]).toMatchObject({
        expectedVersion: 22,
        entityType: 'PMAttendance',
      });
      expect(slipUpdateCall?.[3]).toMatchObject({
        expectedVersion: 33,
        entityType: 'PMCcpSlip',
      });
    } finally {
      atriumActions.importDatabase(baseline);
    }
  });

  it('maps full domain fields in applyResolvedRowToSlice using canonical mappers without wiping nested pos_sales items', () => {
    const baseline = atriumActions.exportDatabase();
    try {
      const snap = JSON.parse(baseline);
      if (!snap.freelanceClients?.length) {
        snap.freelanceClients = [
          {
            id: 'fcli_resolve_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            name: 'Nadia Local',
            email: 'nadia@local.dz',
            currency: 'DZD',
            hourlyRate: 3000,
            status: 'ActiveRetainer',
            lifetimeBilled: 0,
            createdAt: '2026-11-19T00:00:00Z',
          },
        ];
      }
      if (!snap.freelanceProjects?.length) {
        snap.freelanceProjects = [
          {
            id: 'fproj_resolve_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            clientId: snap.freelanceClients[0].id,
            clientName: snap.freelanceClients[0].name,
            title: 'Local Project',
            description: '',
            pricingModel: 'FixedFee',
            currency: 'DZD',
            budget: 500000,
            estimatedHours: 40,
            loggedHours: 0,
            stage: 'InProgress',
            startDate: '2026-11-19',
            deadline: '2026-12-19',
            deliverables: [],
            createdAt: '2026-11-19T00:00:00Z',
          },
        ];
      }
      if (!snap.rentalBookings?.length) {
        snap.rentalBookings = [
          {
            id: 'rbk_resolve_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            unitId: 'unit_1',
            unitName: 'Salle Atlas',
            renterId: 'rnt_1',
            renterName: 'Karim Local',
            startDate: '2026-11-19',
            endDate: '2026-11-20',
            status: 'Confirmed',
            totalAmount: 50000,
            paidAmount: 25000,
            createdAt: '2026-11-19T00:00:00Z',
            updatedAt: '2026-11-19T00:00:00Z',
          },
        ];
      }
      if (!snap.pmAttendances?.length) {
        snap.pmAttendances = [
          {
            id: 'att_resolve_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            missionId: 'miss_1',
            talentId: 'tal_1',
            talentName: 'Yacine Test',
            date: '2026-11-19',
            status: 'present',
            minutesLate: 0,
            shiftRating: 5,
            dayRateDzd: 3500,
            grossPayableDzd: 3500,
            isLocked: false,
          },
        ];
      }
      if (!snap.commercialDocs?.length) {
        snap.commercialDocs = [
          {
            id: 'cdoc_resolve_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            type: 'facture',
            docNumber: 'FAC-001',
            clientId: 'b2b_1',
            clientName: 'Client B2B',
            depotId: 'dep_1',
            date: '2026-11-19',
            paymentMethod: 'Virement',
            paymentTerms: 'Comptant',
            status: 'Draft',
            items: [],
            totalHtRaw: 100000,
            generalDiscountPercent: 0,
            totalHtFinal: 100000,
            totalTva: 19000,
            timbreFiscal: 0,
            totalTtc: 119000,
            guaranteeRetentionPercent: 0,
            guaranteeRetentionAmount: 0,
            netToPay: 119000,
            currency: 'DZD',
            createdAt: '2026-11-19T00:00:00Z',
          },
        ];
      }
      if (!snap.products?.length) {
        snap.products = [
          {
            id: 'prod_resolve_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            name: 'Local Product',
            description: '',
            price: { amount: 1200, currency: 'DZD' },
            cost: { amount: 800, currency: 'DZD' },
            stockQuantity: 10,
            sku: 'LOC-01',
            category: 'General',
            reorderLevel: 2,
            isActive: true,
          },
        ];
      }
      if (!snap.devices?.length) {
        snap.devices = [
          {
            id: 'dev_resolve_1',
            accountId: snap.account.id,
            branchId: snap.currentBranchId,
            hardwareId: 'HW-LOCAL',
            label: 'Local Terminal',
            isActive: true,
            lastSeenAt: '2026-11-19T08:00:00Z',
            registeredAt: '2026-11-19T08:00:00Z',
          },
        ];
      }
      if (!snap.sales?.length) {
        snap.sales = [
          {
            id: 'sale_resolve_1',
            tenantId: snap.account.id,
            facilityId: snap.currentBranchId,
            totalAmount: 1500,
            paymentMethod: 'Cash',
            items: [{ productId: 'p_1', productName: 'Espresso', quantity: 2, unitPrice: 750 }],
            createdAt: '2026-11-19T08:00:00Z',
          },
        ];
      }
      atriumActions.importDatabase(JSON.stringify(snap));

      const client = snap.freelanceClients[0];
      const project = snap.freelanceProjects[0];
      const booking = snap.rentalBookings[0];
      const att = snap.pmAttendances[0];
      const doc = snap.commercialDocs[0];
      const prod = snap.products[0];
      const dev = snap.devices[0];
      const sale = snap.sales[0];

      expect(client).toBeDefined();
      expect(project).toBeDefined();
      expect(booking).toBeDefined();
      expect(att).toBeDefined();
      expect(doc).toBeDefined();
      expect(prod).toBeDefined();
      expect(dev).toBeDefined();
      expect(sale).toBeDefined();

      const clientPatch = applyResolvedRowToSlice(
        'freelance_clients',
        client.id,
        {
          id: client.id,
          account_id: snap.account.id,
          branch_id: snap.currentBranchId,
          name: 'Nadia Server Updated',
          company: 'Atlas Cloud SARL',
          email: 'nadia@atlas.dz',
          phone: '+213555000111',
          currency: 'DZD',
          hourly_rate: 4500,
          status: 'ActiveRetainer',
          version: 9,
          created_at: '2026-11-19T00:00:00Z',
        },
        'version',
        9
      );
      expect(clientPatch.freelanceClients?.find((c) => c.id === client.id)).toMatchObject({
        name: 'Nadia Server Updated',
        company: 'Atlas Cloud SARL',
        hourlyRate: 4500,
        version: 9,
      });

      const projectPatch = applyResolvedRowToSlice(
        'freelance_projects',
        project.id,
        {
          id: project.id,
          account_id: snap.account.id,
          branch_id: snap.currentBranchId,
          client_id: project.clientId,
          client_name: project.clientName,
          title: 'Refonte ERP Server',
          stage: 'Approved',
          budget: 950000,
          currency: 'DZD',
          version: 10,
          created_at: '2026-11-19T00:00:00Z',
        },
        'version',
        10
      );
      expect(projectPatch.freelanceProjects?.find((p) => p.id === project.id)).toMatchObject({
        title: 'Refonte ERP Server',
        stage: 'Approved',
        budget: 950000,
        version: 10,
      });

      const bookingPatch = applyResolvedRowToSlice(
        'rental_bookings',
        booking.id,
        {
          id: booking.id,
          account_id: snap.account.id,
          business_id: booking.businessId || snap.currentBusinessId,
          branch_id: booking.branchId || snap.currentBranchId,
          unit_id: booking.unitId,
          unit_name: booking.unitName,
          renter_id: booking.renterId,
          renter_name: 'Karim Server Renter',
          start_date_time: booking.startDateTime || '2026-11-19T09:00:00Z',
          end_date_time: booking.endDateTime || '2026-11-19T17:00:00Z',
          status: 'CheckedIn',
          total_amount: 88000,
          paid_amount: 88000,
          version: 11,
          created_at: '2026-11-19T00:00:00Z',
        },
        'version',
        11
      );
      expect(bookingPatch.rentalBookings?.find((b) => b.id === booking.id)).toMatchObject({
        renterName: 'Karim Server Renter',
        status: 'CheckedIn',
        totalAmount: 88000,
        version: 11,
      });

      const attPatch = applyResolvedRowToSlice(
        'pm_attendances',
        att.id,
        {
          id: att.id,
          account_id: snap.account.id,
          business_id: snap.currentBusinessId,
          branch_id: snap.currentBranchId,
          mission_id: att.missionId,
          talent_id: att.talentId,
          talent_name: att.talentName,
          date: att.date,
          status: 'late',
          minutes_late: 20,
          gross_payable_dzd: 2500,
          version: 12,
        },
        'version',
        12
      );
      expect(attPatch.pmAttendances?.find((a) => a.id === att.id)).toMatchObject({
        status: 'late',
        minutesLate: 20,
        grossPayableDzd: 2500,
        version: 12,
      });

      const docPatch = applyResolvedRowToSlice(
        'trading_commercial_docs',
        doc.id,
        {
          id: doc.id,
          account_id: snap.account.id,
          business_id: snap.currentBusinessId,
          branch_id: snap.currentBranchId,
          doc_type: doc.type || 'facture',
          doc_number: doc.docNumber,
          client_id: doc.clientId,
          client_name: doc.clientName,
          doc_date: doc.date,
          status: 'Confirmed',
          total_ht: 373109,
          total_tva: 70891,
          total_ttc: 444000,
          version: 13,
          created_at: '2026-11-19T00:00:00Z',
        },
        'version',
        13
      );
      expect(docPatch.commercialDocs?.find((d) => d.id === doc.id)).toMatchObject({
        status: 'Confirmed',
        totalTtc: 444000,
        version: 13,
      });

      const prodPatch = applyResolvedRowToSlice(
        'trading_products',
        prod.id,
        {
          id: prod.id,
          account_id: snap.account.id,
          branch_id: snap.currentBranchId,
          name: 'Produit Négoce Serveur',
          selling_price_ht: 3200,
          purchase_price_ht: 2100,
          stock_quantity: 85,
          sku: 'TRD-99',
          version: 14,
        },
        'version',
        14
      );
      expect(prodPatch.products?.find((p) => p.id === prod.id)).toMatchObject({
        name: 'Produit Négoce Serveur',
        price: { amount: 3200, currency: 'DZD' },
        stockQuantity: 85,
        version: 14,
      });

      const devPatch = applyResolvedRowToSlice(
        'devices',
        dev.id,
        {
          id: dev.id,
          account_id: dev.accountId,
          branch_id: dev.branchId,
          hardware_id: dev.hardwareId,
          label: 'Terminal Server Label',
          is_active: true,
          last_seen_at: '2026-11-19T12:00:00Z',
          registered_at: dev.registeredAt,
          version: 15,
        },
        'version',
        15
      );
      expect(devPatch.devices?.find((d) => d.id === dev.id)).toMatchObject({
        label: 'Terminal Server Label',
        version: 15,
      });

      const salePatch = applyResolvedRowToSlice(
        'pos_sales',
        sale.id,
        {
          id: sale.id,
          account_id: snap.account.id,
          branch_id: snap.currentBranchId,
          total_amount: 9900,
          payment_method: 'Card',
          notes: 'Resolved from server',
          version: 16,
          created_at: sale.createdAt,
        },
        'version',
        16
      );
      const patchedSale = salePatch.sales?.find((s) => s.id === sale.id);
      expect(patchedSale).toMatchObject({
        totalAmount: 9900,
        paymentMethod: 'Card',
        notes: 'Resolved from server',
        version: 16,
      });
      expect(patchedSale?.items).toEqual(sale.items);
    } finally {
      atriumActions.importDatabase(baseline);
    }
  });
});
