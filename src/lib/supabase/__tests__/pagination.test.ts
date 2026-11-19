import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAllPages, fetchBoundedSlice } from '../pagination';
import * as clientModule from '../client';
import { auditService } from '../services/auditService';

describe('Enterprise Pagination & Keyset Audit Queries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchAllPages iterates .range(from, to) across >2,500 rows without 1,000-row truncation', async () => {
    const totalRows = 2542;
    const dataset = Array.from({ length: totalRows }, (_, idx) => ({
      id: `row_${String(idx + 1).padStart(4, '0')}`,
      seq: idx + 1,
    }));

    const rangeCalls: Array<[number, number]> = [];
    const rows = await fetchAllPages<{ id: string; seq: number }>(async (from, to) => {
      rangeCalls.push([from, to]);
      return {
        data: dataset.slice(from, to + 1),
        error: null,
      };
    });

    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(rows).toHaveLength(totalRows);
    expect(rows[0].id).toBe('row_0001');
    expect(rows[totalRows - 1].id).toBe('row_2542');
  });

  it('fetchAllPages stops immediately on empty page or partial last page and honors throwOnError', async () => {
    let calls = 0;
    const exact1000 = Array.from({ length: 1000 }, (_, idx) => ({ id: idx }));
    const resExact = await fetchAllPages(async (from) => {
      calls += 1;
      if (from === 0) return { data: exact1000, error: null };
      return { data: [], error: null };
    });
    expect(calls).toBe(2);
    expect(resExact).toHaveLength(1000);

    await expect(
      fetchAllPages(
        async () => ({ data: null, error: new Error('DB_TIMEOUT') }),
        { throwOnError: true }
      )
    ).rejects.toThrow('DB_TIMEOUT');

    const partialRes = await fetchAllPages(async (from) => {
      if (from === 0) return { data: Array.from({ length: 1000 }, (_, i) => i), error: null };
      return { data: null, error: { message: 'TRANSIENT' } };
    });
    expect(partialRes).toHaveLength(1000);
  });

  it('fetchBoundedSlice requests limit + 1 rows to compute exact hasMore without extra count queries', async () => {
    const dataset = Array.from({ length: 120 }, (_, i) => ({ id: `item_${i}` }));

    const page1 = await fetchBoundedSlice(
      async (from, to) => {
        expect(from).toBe(0);
        expect(to).toBe(50);
        return { data: dataset.slice(from, to + 1), error: null, count: 120 };
      },
      0,
      50
    );
    expect(page1.items).toHaveLength(50);
    expect(page1.hasMore).toBe(true);
    expect(page1.totalCount).toBe(120);

    const lastPage = await fetchBoundedSlice(
      async (from, to) => ({
        data: dataset.slice(from, to + 1),
        error: null,
        count: 120,
      }),
      100,
      50
    );
    expect(lastPage.items).toHaveLength(20);
    expect(lastPage.hasMore).toBe(false);
  });

  it('auditService.fetchAuditLogsPage uses get_audit_logs_page RPC keyset pagination and falls back cleanly', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: '00000000-0000-4000-8000-000000000099',
            account_id: '00000000-0000-4000-8000-000000000001',
            branch_id: '00000000-0000-4000-8000-000000000002',
            table_name: 'pos_products',
            record_id: 'prod_1',
            action: 'UPDATE',
            old_data: { price: 100 },
            new_data: { price: 120 },
            occurred_at: '2026-11-19T10:00:00.000Z',
          },
        ],
        hasMore: true,
        totalCount: 75,
      },
      error: null,
    });

    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue({ rpc: rpcMock } as any);

    const rpcPage = await auditService.fetchAuditLogsPage({
      accountId: 'acc_01',
      branchId: 'branch_01',
      cursorOccurredAt: '2026-11-19T11:00:00.000Z',
      cursorId: '00000000-0000-4000-8000-000000000100',
      limit: 50,
      tableName: 'pos_products',
      action: 'UPDATE',
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(
      'get_audit_logs_page',
      expect.objectContaining({
        p_limit: 50,
        p_table_name: 'pos_products',
        p_action: 'UPDATE',
        p_cursor_occurred_at: '2026-11-19T11:00:00.000Z',
      })
    );
    expect(rpcPage.items).toHaveLength(1);
    expect(rpcPage.hasMore).toBe(true);
    expect(rpcPage.totalCount).toBe(75);
    expect(rpcPage.items[0].tableName).toBe('pos_products');

    // Now simulate missing Phase 5 RPC and verify keyset table query fallback
    const limitMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      then: undefined,
      data: [
        {
          id: 'log_1',
          account_id: 'acc_01',
          table_name: 'gym_members',
          action: 'INSERT',
          occurred_at: '2026-11-19T09:00:00.000Z',
        },
        {
          id: 'log_2',
          account_id: 'acc_01',
          table_name: 'gym_members',
          action: 'INSERT',
          occurred_at: '2026-11-19T08:00:00.000Z',
        },
      ],
      error: null,
      count: 2,
    });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: limitMock,
      lt: vi.fn().mockReturnThis(),
    };
    // Make chain awaitable directly when limitMock returns chain
    const awaitableChain: any = {
      ...chain,
      limit: vi.fn(() => awaitableChain),
      eq: vi.fn(() => awaitableChain),
      order: vi.fn(() => awaitableChain),
      lt: vi.fn(() => awaitableChain),
      select: vi.fn(() => awaitableChain),
      then: (resolve: any) =>
        resolve({
          data: [
            {
              id: 'log_1',
              account_id: 'acc_01',
              table_name: 'gym_members',
              action: 'INSERT',
              occurred_at: '2026-11-19T09:00:00.000Z',
            },
            {
              id: 'log_2',
              account_id: 'acc_01',
              table_name: 'gym_members',
              action: 'INSERT',
              occurred_at: '2026-11-19T08:00:00.000Z',
            },
          ],
          error: null,
          count: 2,
        }),
    };

    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue({
      rpc: vi.fn().mockRejectedValue(new Error('RPC not deployed')),
      from: vi.fn(() => awaitableChain),
    } as any);

    const fallbackPage = await auditService.fetchAuditLogsPage({
      accountId: 'acc_01',
      limit: 1,
    });
    expect(fallbackPage.items).toHaveLength(1);
    expect(fallbackPage.hasMore).toBe(true);
    expect(fallbackPage.totalCount).toBe(2);
  });
});
