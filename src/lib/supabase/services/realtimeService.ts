import type { RealtimeChannel } from '@supabase/supabase-js';
import type { BusinessCategory } from '../../../types/index';
import { getSupabaseClient, isUuid, toValidUuid } from '../client';
import { CATEGORY_TABLE_MAP } from '../syncCoordinator';

export interface RealtimeSubscriptionCallbacks {
  onDeltaChange?: (
    changedTables: string[],
    deletedIdsByTable: Record<string, string[]>
  ) => void;
  // Backwards-compatible fine-grained hooks (only fired when onDeltaChange is absent)
  onMemberChange?: (payload: any) => void;
  onLeadChange?: (payload: any) => void;
  onBranchChange?: (payload: any) => void;
  onRentalBookingChange?: (payload: any) => void;
  onRentableUnitChange?: (payload: any) => void;
}

export type TableChangesListener = (
  changedTables: string[],
  deletedIdsByTable: Record<string, string[]>
) => void;

interface TableListenerRegistration {
  tables: Set<string>;
  listener: TableChangesListener;
}

const CORE_REALTIME_BRANCH_TABLES = [
  'staff',
  'staff_attendance_logs',
  'staff_salary_advances',
  'staff_payroll_runs',
  'staff_payroll_slips',
  'devices',
] as const;

const DEBOUNCE_WINDOW_MS = 250;

let activeChannel: RealtimeChannel | null = null;
let activeScopeKey: string | null = null;
let activeCallbacks: RealtimeSubscriptionCallbacks = {};
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingChangedTables = new Set<string>();
const pendingDeletedIds = new Map<string, Set<string>>();
const tableListenerRegistry = new Set<TableListenerRegistration>();

function recordDeletedIdIfAny(tableName: string, payload: any): void {
  const newRow = payload?.new;
  const oldRow = payload?.old;

  let deletedId: string | null = null;
  if (payload?.eventType === 'DELETE' && oldRow?.id) {
    deletedId = String(oldRow.id);
  } else if (newRow?.deleted_at && newRow?.id) {
    deletedId = String(newRow.id);
  } else if ((tableName === 'businesses' || tableName === 'branches') && newRow?.is_active === false && newRow?.id) {
    deletedId = String(newRow.id);
  }

  if (deletedId) {
    let bucket = pendingDeletedIds.get(tableName);
    if (!bucket) {
      bucket = new Set<string>();
      pendingDeletedIds.set(tableName, bucket);
    }
    bucket.add(deletedId);
  }
}

export const realtimeService = {
  /**
   * Registers a scoped listener for specific table changes (used by Group B vertical hooks)
   * sharing the single active branch WebSocket channel without opening extra connections.
   */
  subscribeTableChanges(tables: string[], listener: TableChangesListener): () => void {
    const registration: TableListenerRegistration = {
      tables: new Set(tables),
      listener,
    };
    tableListenerRegistry.add(registration);
    return () => {
      tableListenerRegistry.delete(registration);
    };
  },

  /**
   * Maintains ONE stable debounced channel per (branchId, category, accountId) covering
   * all vertical tables for that business category plus core operational tables.
   */
  subscribeToBranch(
    branchId: string,
    callbacks: RealtimeSubscriptionCallbacks,
    category: BusinessCategory = 'membership_session',
    accountId?: string | null
  ): () => void {
    const client = getSupabaseClient();
    if (!client) {
      return () => {};
    }

    const normalizedAccountId = accountId && isUuid(accountId) ? accountId : '';
    const scopeKey = `${branchId}:${category}:${normalizedAccountId}`;
    activeCallbacks = callbacks;

    if (activeChannel && activeScopeKey === scopeKey) {
      // Reuse already-active channel for identical scope
      return () => {
        realtimeService.unsubscribe();
      };
    }

    realtimeService.unsubscribe();
    activeCallbacks = callbacks;

    try {
      const safeBranchUuid = toValidUuid(branchId);
      const verticalTables = CATEGORY_TABLE_MAP[category] || [];
      const watchedBranchTables = Array.from(
        new Set([...verticalTables, ...CORE_REALTIME_BRANCH_TABLES])
      );

      const channelName = `branch-${safeBranchUuid}-${category}`;
      let channel: RealtimeChannel = client.channel(channelName);

      const flushDebouncedBatch = () => {
        const batch = Array.from(pendingChangedTables);
        pendingChangedTables.clear();

        const deletedIdsByTable: Record<string, string[]> = {};
        for (const [tbl, ids] of pendingDeletedIds.entries()) {
          if (ids.size > 0) {
            deletedIdsByTable[tbl] = Array.from(ids);
          }
        }
        pendingDeletedIds.clear();
        debounceTimer = null;

        if (batch.length === 0) return;

        activeCallbacks.onDeltaChange?.(batch, deletedIdsByTable);

        for (const reg of tableListenerRegistry) {
          const matchedTables = batch.filter((tbl) => reg.tables.has(tbl));
          if (matchedTables.length === 0) continue;

          const scopedDeleted: Record<string, string[]> = {};
          for (const tbl of matchedTables) {
            if (deletedIdsByTable[tbl]?.length) {
              scopedDeleted[tbl] = deletedIdsByTable[tbl];
            }
          }
          try {
            reg.listener(matchedTables, scopedDeleted);
          } catch (err) {
            console.warn('[Realtime] Table listener callback error:', err);
          }
        }
      };

      const triggerDebouncedDelta = (tableName: string, payload: any) => {
        pendingChangedTables.add(tableName);
        recordDeletedIdIfAny(tableName, payload);

        // Only fire legacy fine-grained callbacks if caller did NOT provide onDeltaChange
        if (!activeCallbacks.onDeltaChange) {
          if (tableName === 'gym_members' || tableName === 'members_directory') {
            activeCallbacks.onMemberChange?.(payload);
          } else if (tableName === 'gym_registration_leads' || tableName === 'registration_requests') {
            activeCallbacks.onLeadChange?.(payload);
          } else if (tableName === 'branches') {
            activeCallbacks.onBranchChange?.(payload);
          } else if (tableName === 'rental_bookings') {
            activeCallbacks.onRentalBookingChange?.(payload);
          } else if (tableName === 'rental_units' || tableName === 'rentable_units') {
            activeCallbacks.onRentableUnitChange?.(payload);
          }
        }

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushDebouncedBatch, DEBOUNCE_WINDOW_MS);
      };

      for (const table of watchedBranchTables) {
        channel = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `branch_id=eq.${safeBranchUuid}`,
          },
          (payload) => triggerDebouncedDelta(table, payload)
        );
      }

      if (normalizedAccountId) {
        for (const accountTable of ['businesses', 'branches', 'business_configs', 'category_formules'] as const) {
          channel = channel.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: accountTable,
              filter: `account_id=eq.${normalizedAccountId}`,
            },
            (payload) => triggerDebouncedDelta(accountTable, payload)
          );
        }
      }

      channel.subscribe();
      activeChannel = channel;
      activeScopeKey = scopeKey;

      return () => {
        if (activeChannel === channel) {
          realtimeService.unsubscribe();
        }
      };
    } catch (err) {
      console.warn('[Realtime] Failed to establish branch subscription:', err);
      return () => {};
    }
  },

  unsubscribe(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingChangedTables.clear();
    pendingDeletedIds.clear();

    const client = getSupabaseClient();
    if (activeChannel && client) {
      try {
        client.removeChannel(activeChannel);
      } catch (e) {
        console.warn('[Realtime] Channel cleanup warning:', e);
      }
    }
    activeChannel = null;
    activeScopeKey = null;
    activeCallbacks = {};
  },
};
