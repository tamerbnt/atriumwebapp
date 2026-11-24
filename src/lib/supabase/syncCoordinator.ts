import type { BusinessCategory } from '../../types/index';
import { getSupabaseClient, isSupabaseConfigured, isUuid, toValidUuid } from './client';
import {
  canAcceptQueueAdditions,
  cancelQueuedMutations,
  enqueueMutation,
  flushOfflineQueue,
  isStaleVersionError,
  OfflineQueueCapacityError,
  registerQueueConflictListener,
  type OfflineMutationItem,
} from './offlineQueue';
import { requireTenantContext } from './tenantContext';

export interface TraceEnvelopeContext {
  accountId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  staffId?: string | null;
  updatedByStaffId?: string | null;
  deviceId?: string | null;
}

export interface DbTraceEnvelope {
  account_id: string;
  business_id: string | null;
  branch_id: string;
  staff_id: string | null;
  updated_by_staff_id: string | null;
  device_id: string;
  updated_at: string;
}

export interface ConcurrencyConflictEvent {
  id: string;
  table: string;
  recordId: string;
  entityType?: string;
  entityLabel?: string;
  expectedVersion: number;
  serverVersion: number;
  localData: Record<string, any>;
  serverData: Record<string, any> | null;
  versionColumn: string;
  detectedAt: string;
  onApplyResolution?: (
    resolvedRecord: Record<string, any>,
    strategy: 'server' | 'overwrite' | 'merge'
  ) => Promise<void> | void;
}

export interface ConcurrencyResolutionEvent {
  table: string;
  recordId: string;
  strategy: 'server' | 'overwrite' | 'merge';
  resolvedVersion: number;
  resolvedRecord: Record<string, any> | null;
  resolvedAt: string;
}

export interface MutateOptions {
  onConflict?: string;
  expectedVersion?: number;
  versionColumn?: string;
  entityType?: string;
  entityLabel?: string;
  localData?: Record<string, any>;
  onApplyResolution?: ConcurrencyConflictEvent['onApplyResolution'];
}

export interface MutateResult {
  success: boolean;
  queued: boolean;
  blockedByCapacity?: boolean;
  conflict?: boolean;
  serverData?: Record<string, any> | null;
  newVersion?: number;
  error?: string;
}

function tryEnqueueMutation(
  mutation: Omit<OfflineMutationItem, 'id' | 'enqueuedAt' | 'attempts'>
): { queued: boolean; blockedByCapacity?: boolean; error?: string } {
  try {
    enqueueMutation(mutation);
    return { queued: true };
  } catch (err: any) {
    if (err instanceof OfflineQueueCapacityError || err?.code === 'QUEUE_AT_CAPACITY') {
      return {
        queued: false,
        blockedByCapacity: true,
        error: err?.message || 'QUEUE_AT_CAPACITY',
      };
    }
    throw err;
  }
}

const DEVICE_STORAGE_KEY = 'atrium_client_device_id_v1';
const CURSOR_STORAGE_KEY = 'atrium_delta_sync_cursors_v1';

let fallbackDeviceId = `web_${Math.random().toString(36).slice(2, 10)}`;

const conflictListeners = new Set<(event: ConcurrencyConflictEvent) => void>();

export function subscribeConcurrencyConflicts(
  listener: (event: ConcurrencyConflictEvent) => void
): () => void {
  conflictListeners.add(listener);
  return () => {
    conflictListeners.delete(listener);
  };
}

export function emitConcurrencyConflict(event: ConcurrencyConflictEvent): void {
  conflictListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // keep dispatching to remaining listeners
    }
  });
}

const resolutionListeners = new Set<(event: ConcurrencyResolutionEvent) => void>();

export function subscribeConcurrencyResolutions(
  listener: (event: ConcurrencyResolutionEvent) => void
): () => void {
  resolutionListeners.add(listener);
  return () => {
    resolutionListeners.delete(listener);
  };
}

export function emitConcurrencyResolution(event: ConcurrencyResolutionEvent): void {
  resolutionListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // keep dispatching to remaining listeners
    }
  });
}

// Forward offline replay conflicts into the unified concurrency conflict bus
registerQueueConflictListener(({ item, serverData, serverVersion }) => {
  const targetId = item.recordId || item.payload?.id || '';
  if (!item.table || !targetId) return;
  emitConcurrencyConflict({
    id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    table: item.table,
    recordId: targetId,
    entityType: item.entityType,
    entityLabel: item.entityLabel,
    expectedVersion: Number(item.expectedVersion ?? 1),
    serverVersion,
    localData: item.payload || {},
    serverData,
    versionColumn: item.versionColumn || 'version',
    detectedAt: new Date().toISOString(),
  });
});

export function getActiveDeviceId(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      let existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
      if (!existing) {
        existing = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        window.localStorage.setItem(DEVICE_STORAGE_KEY, existing);
      }
      return existing;
    }
  } catch {
    // ignore storage restriction
  }
  return fallbackDeviceId;
}

export function normalizeUuidOrNull(val?: string | null): string | null {
  if (!val) return null;
  if (isUuid(val)) return val;
  return toValidUuid(val);
}

export function buildTraceEnvelope(ctx: TraceEnvelopeContext): DbTraceEnvelope {
  const validated = requireTenantContext({
    accountId: ctx.accountId,
    branchId: ctx.branchId,
  });
  return {
    account_id: toValidUuid(validated.accountId),
    business_id: ctx.businessId ? toValidUuid(ctx.businessId) : null,
    branch_id: toValidUuid(validated.branchId),
    staff_id: ctx.staffId ? normalizeUuidOrNull(ctx.staffId) : null,
    updated_by_staff_id: ctx.updatedByStaffId
      ? normalizeUuidOrNull(ctx.updatedByStaffId)
      : ctx.staffId
      ? normalizeUuidOrNull(ctx.staffId)
      : null,
    device_id: ctx.deviceId || getActiveDeviceId(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Bounded concurrency executor: runs at most `maxConcurrency` tasks simultaneously
 * to protect Supavisor connection pools (Port 6543 Transaction Mode) from connection storms.
 */
export async function runWithConcurrency<const TTasks extends readonly (() => Promise<any>)[]>(
  tasks: TTasks,
  maxConcurrency?: number
): Promise<{ -readonly [K in keyof TTasks]: Awaited<ReturnType<TTasks[K]>> }>;
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  maxConcurrency?: number
): Promise<T[]>;
export async function runWithConcurrency<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  maxConcurrency = 4
): Promise<T[]> {
  if (tasks.length === 0) return [];
  const limit = Math.max(1, Math.min(maxConcurrency, tasks.length));
  const results = new Array<T>(tasks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  };

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

/**
 * Shared Category -> Tables Registry across all 16 business verticals.
 * SyncCoordinator and realtimeService both use this to scope reads/subscriptions
 * strictly to the currently active business category + shared core tables.
 */
export const CATEGORY_TABLE_MAP: Record<BusinessCategory, string[]> = {
  membership_session: [
    'gym_staff',
    'gym_plans',
    'gym_members',
    'gym_registration_leads',
    'gym_registrations',
    'gym_check_ins',
    'gym_walk_in_tickets',
    'gym_schedule_events',
    'gym_products',
    'gym_sales',
    'gym_sale_items',
  ],
  appointment_service: [
    'salon_staff',
    'salon_workstations',
    'salon_chair_stations',
    'salon_clients',
    'salon_services',
    'salon_products',
    'salon_appointments',
    'salon_sales',
    'salon_sale_items',
    'salon_stylist_payouts',
  ],
  pos_inventory: [
    'pos_staff',
    'pos_customers',
    'pos_products',
    'pos_sales',
    'pos_sale_items',
    'pos_parked_orders',
    'pos_stock_movements',
    'pos_receipt_configs',
  ],
  project_milestone: [
    'pm_staff',
    'pm_clients',
    'pm_projects',
    'pm_milestones',
    'pm_collateral_catalog',
    'pm_print_orders',
    'pm_bat_deliverables',
    'pm_talents',
    'pm_missions',
    'pm_mission_staff',
    'pm_attendances',
    'pm_expenses',
    'pm_payroll_batches',
    'pm_ccp_slips',
    'pm_equipment_stock',
  ],
  rental_booking: [
    'rental_staff',
    'rental_units',
    'rental_renters',
    'rental_bookings',
    'rental_booking_addons',
    'rental_security_deposits',
  ],
  education_cohort: [
    'edu_staff',
    'edu_courses',
    'edu_classrooms',
    'edu_cohorts',
    'edu_students',
    'edu_enrollments',
    'edu_sessions',
    'edu_attendance',
    'edu_grades',
    'edu_certificates',
    'edu_admissions',
  ],
  freelance_solo: [
    'freelance_staff',
    'freelance_services',
    'freelance_clients',
    'freelance_projects',
    'freelance_deliverables',
    'freelance_active_timers',
    'freelance_time_logs',
    'freelance_invoices',
    'freelance_invoice_items',
    'freelance_proposals',
    'freelance_expenses',
  ],
  trading_commercial: [
    'trading_staff',
    'trading_warehouses',
    'trading_b2b_clients',
    'trading_b2b_suppliers',
    'trading_products',
    'trading_commercial_docs',
    'trading_commercial_doc_items',
    'trading_purchase_docs',
    'trading_purchase_doc_items',
    'trading_stock_vouchers',
    'trading_stock_voucher_items',
  ],
  medical_clinic: [
    'medical_staff',
    'medical_departments',
    'medical_patients',
    'medical_appointments',
    'medical_consultations',
    'medical_consumables',
    'medical_invoices',
  ],
  auto_garage: [
    'garage_staff',
    'garage_bays',
    'garage_vehicles',
    'garage_work_orders',
    'garage_work_order_items',
    'garage_parts',
    'garage_part_requisitions',
    'garage_suppliers',
    'garage_purchase_orders',
    'garage_fleet_contracts',
    'garage_invoices',
  ],
  real_estate: [
    're_staff',
    're_properties',
    're_clients',
    're_leads',
    're_visits',
    're_mandates',
    're_leases',
    're_rent_schedules',
    're_inspections',
    're_owner_ledger',
    're_sales',
  ],
  manufacturing_production: [
    'mfg_staff',
    'mfg_workstations',
    'mfg_raw_materials',
    'mfg_bom_recipes',
    'mfg_bom_ingredients',
    'mfg_orders',
    'mfg_workstation_logs',
    'mfg_qc_inspections',
    'mfg_material_vouchers',
    'mfg_batches',
  ],
  legal_accounting: [
    'legal_staff',
    'legal_clients',
    'legal_matters',
    'legal_hearings',
    'legal_deadlines',
    'legal_time_entries',
    'legal_escrow_movements',
    'legal_disbursements',
    'legal_invoices',
    'legal_cash_receipts',
    'legal_documents',
  ],
  logistics_delivery: [
    'logistics_staff',
    'logistics_fleet',
    'logistics_drivers',
    'logistics_wilaya_tariffs',
    'logistics_merchants',
    'logistics_courier_bags',
    'logistics_parcels',
    'logistics_parcel_events',
    'logistics_remittances',
    'logistics_discharges',
    'logistics_tickets',
  ],
  construction_contractor: [
    'btp_staff',
    'btp_projects',
    'btp_boq_items',
    'btp_decomptes',
    'btp_subcontractors',
    'btp_subcontract_claims',
    'btp_daily_logs',
    'btp_materials',
    'btp_equipment',
    'btp_safety_incidents',
    'btp_cacobatph_dossiers',
  ],
  agriculture_farming: [
    'agri_staff',
    'agri_parcels',
    'agri_crop_cycles',
    'agri_livestock',
    'agri_milking_logs',
    'agri_treatments',
    'agri_harvests',
    'agri_cold_storage',
    'agri_stock_items',
    'agri_sales',
  ],
};

export const CORE_SYNC_TABLES = [
  'businesses',
  'branches',
  'business_configs',
  'category_formules',
  'staff',
  'staff_attendance_logs',
  'staff_salary_advances',
  'staff_payroll_runs',
  'staff_payroll_slips',
  'devices',
];

const inFlightMap = new Map<string, Promise<any>>();
const memoryCursorMap: Record<string, string> = {};

function readCursors(): Record<string, string> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(CURSOR_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return memoryCursorMap;
}

function writeCursors(map: Record<string, string>): void {
  Object.assign(memoryCursorMap, map);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CURSOR_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore
  }
}

async function fetchServerRowForConflict(
  client: any,
  table: string,
  recordId: string
): Promise<Record<string, any> | null> {
  try {
    const { data } = await client.from(table).select('*').eq('id', recordId).maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export const syncCoordinator = {
  /**
   * Coalesces duplicate concurrent calls sharing the same sync key into a single promise.
   */
  runSingleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inFlightMap.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fn().finally(() => {
      if (inFlightMap.get(key) === promise) {
        inFlightMap.delete(key);
      }
    });
    inFlightMap.set(key, promise);
    return promise;
  },

  isSyncing(key?: string): boolean {
    if (key) return inFlightMap.has(key);
    return inFlightMap.size > 0;
  },

  getDeltaCursor(branchId: string, category: BusinessCategory | string): string | null {
    const cursors = readCursors();
    return cursors[`${branchId}:${category}`] || null;
  },

  markSynced(branchId: string, category: BusinessCategory | string, isoTimestamp?: string): void {
    const cursors = readCursors();
    cursors[`${branchId}:${category}`] = isoTimestamp || new Date().toISOString();
    writeCursors(cursors);
  },

  clearCursors(): void {
    Object.keys(memoryCursorMap).forEach((k) => delete memoryCursorMap[k]);
    writeCursors({});
  },

  getTablesForCategory(category: BusinessCategory | string): string[] {
    return CATEGORY_TABLE_MAP[category as BusinessCategory] || [];
  },

  /**
   * Upserts a row with optimistic version checks and offline queue fallback on network failure.
   * Stale-version conflicts (`40001` / `CONFLICT_STALE_VERSION`) NEVER enter the offline queue;
   * instead they emit a `ConcurrencyConflictEvent` with the latest server snapshot.
   */
  async mutateOrQueueUpsert(
    table: string,
    payload: Record<string, any>,
    options?: MutateOptions
  ): Promise<MutateResult> {
    const versionCol = options?.versionColumn || 'version';
    const expectedVersion = options?.expectedVersion ?? payload?.[versionCol];
    const effectivePayload =
      expectedVersion !== undefined && payload[versionCol] === undefined
        ? { ...payload, [versionCol]: expectedVersion }
        : payload;

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      const q = tryEnqueueMutation({
        kind: 'upsert',
        table,
        payload: effectivePayload,
        onConflict: options?.onConflict,
        expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        versionColumn: versionCol,
        entityType: options?.entityType,
        entityLabel: options?.entityLabel,
      });
      return { success: false, queued: q.queued, blockedByCapacity: q.blockedByCapacity, error: q.error };
    }

    try {
      const { data, error } = await (client as any)
        .from(table)
        .upsert(effectivePayload, options?.onConflict ? { onConflict: options.onConflict } : undefined)
        .select(`id, ${versionCol}`)
        .maybeSingle();

      if (error) {
        if (isStaleVersionError(error) && effectivePayload?.id) {
          const serverData = await fetchServerRowForConflict(client, table, String(effectivePayload.id));
          const serverVersion = Number(serverData?.[versionCol] ?? Number(expectedVersion ?? 1) + 1);
          emitConcurrencyConflict({
            id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            table,
            recordId: String(effectivePayload.id),
            entityType: options?.entityType,
            entityLabel: options?.entityLabel,
            expectedVersion: Number(expectedVersion ?? 1),
            serverVersion,
            localData: options?.localData || effectivePayload,
            serverData,
            versionColumn: versionCol,
            detectedAt: new Date().toISOString(),
            onApplyResolution: options?.onApplyResolution,
          });
          return {
            success: false,
            queued: false,
            conflict: true,
            serverData,
            error: error.message || 'CONFLICT_STALE_VERSION',
          };
        }

        const q = tryEnqueueMutation({
          kind: 'upsert',
          table,
          payload: effectivePayload,
          onConflict: options?.onConflict,
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
          versionColumn: versionCol,
          entityType: options?.entityType,
          entityLabel: options?.entityLabel,
        });
        return {
          success: false,
          queued: q.queued,
          blockedByCapacity: q.blockedByCapacity,
          error: q.blockedByCapacity ? q.error : error.message,
        };
      }

      const newVersion =
        data && typeof data[versionCol] === 'number' ? Number(data[versionCol]) : undefined;
      return { success: true, queued: false, newVersion };
    } catch (err: any) {
      if (isStaleVersionError(err) && effectivePayload?.id) {
        const serverData = await fetchServerRowForConflict(client, table, String(effectivePayload.id));
        const serverVersion = Number(serverData?.[versionCol] ?? Number(expectedVersion ?? 1) + 1);
        emitConcurrencyConflict({
          id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          table,
          recordId: String(effectivePayload.id),
          entityType: options?.entityType,
          entityLabel: options?.entityLabel,
          expectedVersion: Number(expectedVersion ?? 1),
          serverVersion,
          localData: options?.localData || effectivePayload,
          serverData,
          versionColumn: versionCol,
          detectedAt: new Date().toISOString(),
          onApplyResolution: options?.onApplyResolution,
        });
        return {
          success: false,
          queued: false,
          conflict: true,
          serverData,
          error: err?.message || 'CONFLICT_STALE_VERSION',
        };
      }

      const q = tryEnqueueMutation({
        kind: 'upsert',
        table,
        payload: effectivePayload,
        onConflict: options?.onConflict,
        expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        versionColumn: versionCol,
        entityType: options?.entityType,
        entityLabel: options?.entityLabel,
      });
      return {
        success: false,
        queued: q.queued,
        blockedByCapacity: q.blockedByCapacity,
        error: q.blockedByCapacity ? q.error : err?.message || 'Network exception',
      };
    }
  },

  /**
   * Restores a soft-deleted record (`deleted_at = null`) for Undo operations.
   * Also cancels any un-flushed soft_delete queued offline for the same record.
   */
  async restoreRow(
    table: string,
    id: string,
    restoredByStaffId?: string | null
  ): Promise<{ success: boolean; queued: boolean; blockedByCapacity?: boolean; error?: string }> {
    const recordId = toValidUuid(id);
    const staffUuid = restoredByStaffId ? normalizeUuidOrNull(restoredByStaffId) : null;
    cancelQueuedMutations(table, recordId, ['soft_delete']);

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      const q = tryEnqueueMutation({
        kind: 'restore',
        table,
        recordId,
        deletedByStaffId: staffUuid,
      });
      return { success: false, queued: q.queued, blockedByCapacity: q.blockedByCapacity, error: q.error };
    }

    try {
      const { error } = await (client as any)
        .from(table)
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString(),
          ...(staffUuid ? { updated_by_staff_id: staffUuid } : {}),
        })
        .eq('id', recordId);

      if (error) {
        const q = tryEnqueueMutation({
          kind: 'restore',
          table,
          recordId,
          deletedByStaffId: staffUuid,
        });
        return {
          success: false,
          queued: q.queued,
          blockedByCapacity: q.blockedByCapacity,
          error: q.blockedByCapacity ? q.error : error.message,
        };
      }
      return { success: true, queued: false };
    } catch (err: any) {
      const q = tryEnqueueMutation({
        kind: 'restore',
        table,
        recordId,
        deletedByStaffId: staffUuid,
      });
      return {
        success: false,
        queued: q.queued,
        blockedByCapacity: q.blockedByCapacity,
        error: q.blockedByCapacity ? q.error : err?.message || 'Network exception',
      };
    }
  },

  /**
   * Single-request batch array upsert with offline queue fallback.
   */
  async mutateBatchUpsert(
    table: string,
    rows: Array<Record<string, any>>,
    options?: { onConflict?: string }
  ): Promise<{ success: boolean; queued: boolean; blockedByCapacity?: boolean; count: number; error?: string }> {
    if (rows.length === 0) return { success: true, queued: false, count: 0 };

    const queueBatchRows = (fallbackError?: string) => {
      if (!canAcceptQueueAdditions(rows.length)) {
        return {
          success: false,
          queued: false,
          blockedByCapacity: true,
          count: 0,
          error: 'QUEUE_AT_CAPACITY: Offline sync queue is full (500/500).',
        };
      }
      for (const row of rows) {
        const q = tryEnqueueMutation({ kind: 'upsert', table, payload: row, onConflict: options?.onConflict });
        if (!q.queued) {
          return {
            success: false,
            queued: false,
            blockedByCapacity: q.blockedByCapacity,
            count: 0,
            error: q.error,
          };
        }
      }
      return { success: false, queued: true, count: rows.length, error: fallbackError };
    };

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return queueBatchRows();
    }

    try {
      const { error } = await (client as any)
        .from(table)
        .upsert(rows, options?.onConflict ? { onConflict: options.onConflict } : undefined);
      if (error) {
        return queueBatchRows(error.message);
      }
      return { success: true, queued: false, count: rows.length };
    } catch (err: any) {
      return queueBatchRows(err?.message || 'Network exception');
    }
  },

  /**
   * Performs a partial UPDATE by primary key (`id`) with optimistic version guard
   * and offline queue fallback, avoiding NOT NULL violations triggered by incomplete UPSERT payloads.
   */
  async mutateOrQueueUpdate(
    table: string,
    id: string,
    patch: Record<string, any>,
    options?: MutateOptions
  ): Promise<MutateResult> {
    const recordId = toValidUuid(id);
    const versionCol = options?.versionColumn || 'version';
    const expectedVersion = options?.expectedVersion;
    const updatePayload: Record<string, any> = {
      ...patch,
      updated_at: patch.updated_at || new Date().toISOString(),
    };
    if (expectedVersion !== undefined && updatePayload[versionCol] === undefined) {
      updatePayload[versionCol] = expectedVersion;
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      const q = tryEnqueueMutation({
        kind: 'update',
        table,
        recordId,
        payload: updatePayload,
        expectedVersion,
        versionColumn: versionCol,
        entityType: options?.entityType,
        entityLabel: options?.entityLabel,
      });
      return { success: false, queued: q.queued, blockedByCapacity: q.blockedByCapacity, error: q.error };
    }

    try {
      let query = (client as any)
        .from(table)
        .update(updatePayload)
        .eq('id', recordId);

      if (expectedVersion !== undefined) {
        query = query.eq(versionCol, expectedVersion).select(`id, ${versionCol}`);
      }

      const { data, error } = await query;

      const isZeroRowMismatch =
        !error && expectedVersion !== undefined && Array.isArray(data) && data.length === 0;

      if (isZeroRowMismatch || isStaleVersionError(error)) {
        const serverData = await fetchServerRowForConflict(client, table, recordId);
        // Only treat 0-row mismatch as a conflict if the record actually exists on the server with a newer version
        if (serverData || isStaleVersionError(error)) {
          const serverVersion = Number(serverData?.[versionCol] ?? Number(expectedVersion ?? 1) + 1);
          emitConcurrencyConflict({
            id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            table,
            recordId,
            entityType: options?.entityType,
            entityLabel: options?.entityLabel,
            expectedVersion: Number(expectedVersion ?? 1),
            serverVersion,
            localData: options?.localData || updatePayload,
            serverData,
            versionColumn: versionCol,
            detectedAt: new Date().toISOString(),
            onApplyResolution: options?.onApplyResolution,
          });
          return {
            success: false,
            queued: false,
            conflict: true,
            serverData,
            error: error?.message || 'CONFLICT_STALE_VERSION',
          };
        }
      }

      if (error) {
        const q = tryEnqueueMutation({
          kind: 'update',
          table,
          recordId,
          payload: updatePayload,
          expectedVersion,
          versionColumn: versionCol,
          entityType: options?.entityType,
          entityLabel: options?.entityLabel,
        });
        return {
          success: false,
          queued: q.queued,
          blockedByCapacity: q.blockedByCapacity,
          error: q.blockedByCapacity ? q.error : error.message,
        };
      }

      const firstRow = Array.isArray(data) ? data[0] : data;
      const newVersion =
        firstRow && typeof firstRow[versionCol] === 'number'
          ? Number(firstRow[versionCol])
          : undefined;
      return { success: true, queued: false, newVersion };
    } catch (err: any) {
      if (isStaleVersionError(err)) {
        const serverData = await fetchServerRowForConflict(client, table, recordId);
        const serverVersion = Number(serverData?.[versionCol] ?? Number(expectedVersion ?? 1) + 1);
        emitConcurrencyConflict({
          id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          table,
          recordId,
          entityType: options?.entityType,
          entityLabel: options?.entityLabel,
          expectedVersion: Number(expectedVersion ?? 1),
          serverVersion,
          localData: options?.localData || updatePayload,
          serverData,
          versionColumn: versionCol,
          detectedAt: new Date().toISOString(),
          onApplyResolution: options?.onApplyResolution,
        });
        return {
          success: false,
          queued: false,
          conflict: true,
          serverData,
          error: err?.message || 'CONFLICT_STALE_VERSION',
        };
      }

      const q = tryEnqueueMutation({
        kind: 'update',
        table,
        recordId,
        payload: updatePayload,
        expectedVersion,
        versionColumn: versionCol,
        entityType: options?.entityType,
        entityLabel: options?.entityLabel,
      });
      return {
        success: false,
        queued: q.queued,
        blockedByCapacity: q.blockedByCapacity,
        error: q.blockedByCapacity ? q.error : err?.message || 'Network exception',
      };
    }
  },

  /**
   * Soft-deletes a record (`deleted_at = now()`) instead of hard DELETE.
   */
  async softDeleteRow(
    table: string,
    id: string,
    deletedByStaffId?: string | null
  ): Promise<{ success: boolean; queued: boolean; blockedByCapacity?: boolean; error?: string }> {
    const recordId = toValidUuid(id);
    const staffUuid = deletedByStaffId ? normalizeUuidOrNull(deletedByStaffId) : null;
    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      const q = tryEnqueueMutation({
        kind: 'soft_delete',
        table,
        recordId,
        deletedByStaffId: staffUuid,
      });
      return { success: false, queued: q.queued, blockedByCapacity: q.blockedByCapacity, error: q.error };
    }

    try {
      const { error } = await (client as any)
        .from(table)
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(staffUuid ? { updated_by_staff_id: staffUuid } : {}),
        })
        .eq('id', recordId);

      if (error) {
        const q = tryEnqueueMutation({
          kind: 'soft_delete',
          table,
          recordId,
          deletedByStaffId: staffUuid,
        });
        return {
          success: false,
          queued: q.queued,
          blockedByCapacity: q.blockedByCapacity,
          error: q.blockedByCapacity ? q.error : error.message,
        };
      }
      return { success: true, queued: false };
    } catch (err: any) {
      const q = tryEnqueueMutation({
        kind: 'soft_delete',
        table,
        recordId,
        deletedByStaffId: staffUuid,
      });
      return {
        success: false,
        queued: q.queued,
        blockedByCapacity: q.blockedByCapacity,
        error: q.blockedByCapacity ? q.error : err?.message || 'Network exception',
      };
    }
  },

  async rpcOrQueue<T = any>(
    fn: string,
    args: Record<string, any>,
    conflictOptions?: {
      table: string;
      recordId: string;
      versionColumn?: string;
      expectedVersion?: number;
      entityType?: string;
      entityLabel?: string;
      localData?: Record<string, any>;
      onApplyResolution?: ConcurrencyConflictEvent['onApplyResolution'];
    }
  ): Promise<{
    success: boolean;
    data?: T;
    queued: boolean;
    blockedByCapacity?: boolean;
    conflict?: boolean;
    serverData?: Record<string, any> | null;
    error?: string;
  }> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      const q = tryEnqueueMutation({
        kind: 'rpc',
        fn,
        args,
        table: conflictOptions?.table,
        recordId: conflictOptions?.recordId,
        expectedVersion: conflictOptions?.expectedVersion,
        versionColumn: conflictOptions?.versionColumn,
        entityType: conflictOptions?.entityType,
        entityLabel: conflictOptions?.entityLabel,
      });
      return { success: false, queued: q.queued, blockedByCapacity: q.blockedByCapacity, error: q.error };
    }

    const handleRpcConflict = async (errObj: any) => {
      let serverData: Record<string, any> | null = null;
      if (conflictOptions?.table && conflictOptions?.recordId) {
        serverData = await fetchServerRowForConflict(
          client,
          conflictOptions.table,
          toValidUuid(conflictOptions.recordId)
        );
        const versionCol = conflictOptions.versionColumn || 'version';
        const expectedVer = Number(conflictOptions.expectedVersion ?? 1);
        const serverVer = Number(serverData?.[versionCol] ?? expectedVer + 1);
        emitConcurrencyConflict({
          id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          table: conflictOptions.table,
          recordId: toValidUuid(conflictOptions.recordId),
          entityType: conflictOptions.entityType,
          entityLabel: conflictOptions.entityLabel,
          expectedVersion: expectedVer,
          serverVersion: serverVer,
          localData: conflictOptions.localData || args,
          serverData,
          versionColumn: versionCol,
          detectedAt: new Date().toISOString(),
          onApplyResolution: conflictOptions.onApplyResolution,
        });
      }
      return {
        success: false,
        queued: false,
        conflict: true,
        serverData,
        error: errObj?.message || 'CONFLICT_STALE_VERSION',
      };
    };

    try {
      const { data, error } = await (client as any).rpc(fn, args);
      if (error) {
        if (isStaleVersionError(error)) {
          return await handleRpcConflict(error);
        }
        const q = tryEnqueueMutation({
          kind: 'rpc',
          fn,
          args,
          table: conflictOptions?.table,
          recordId: conflictOptions?.recordId,
          expectedVersion: conflictOptions?.expectedVersion,
          versionColumn: conflictOptions?.versionColumn,
          entityType: conflictOptions?.entityType,
          entityLabel: conflictOptions?.entityLabel,
        });
        return {
          success: false,
          queued: q.queued,
          blockedByCapacity: q.blockedByCapacity,
          error: q.blockedByCapacity ? q.error : error.message,
        };
      }
      return { success: true, data, queued: false };
    } catch (err: any) {
      if (isStaleVersionError(err)) {
        return await handleRpcConflict(err);
      }
      const q = tryEnqueueMutation({
        kind: 'rpc',
        fn,
        args,
        table: conflictOptions?.table,
        recordId: conflictOptions?.recordId,
        expectedVersion: conflictOptions?.expectedVersion,
        versionColumn: conflictOptions?.versionColumn,
        entityType: conflictOptions?.entityType,
        entityLabel: conflictOptions?.entityLabel,
      });
      return {
        success: false,
        queued: q.queued,
        blockedByCapacity: q.blockedByCapacity,
        error: q.blockedByCapacity ? q.error : err?.message || 'Network exception',
      };
    }
  },

  flushQueue: flushOfflineQueue,
};
