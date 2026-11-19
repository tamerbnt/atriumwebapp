export const DEFAULT_SUPABASE_PAGE_SIZE = 1000;
export const DEFAULT_MAX_SYNC_PAGES = 100;

export interface PostgrestPageResult<T> {
  data: T[] | null;
  error: any;
  count?: number | null;
}

export interface FetchAllPagesOptions {
  pageSize?: number;
  maxPages?: number;
  throwOnError?: boolean;
}

/**
 * Automatically paginates any Supabase/PostgREST query in bounded `.range(from, to)`
 * chunks (1,000 rows per page by default) so multi-thousand-row branches never
 * suffer silent truncation from PostgREST's default `max-rows = 1000` limit.
 *
 * Callers MUST include a deterministic `.order(...)` (e.g. `updated_at ASC, id ASC`
 * or `created_at DESC, id DESC`) in `buildPageQuery` so pages never skip or duplicate rows.
 */
export async function fetchAllPages<T>(
  buildPageQuery: (from: number, to: number) => PromiseLike<PostgrestPageResult<T>>,
  options?: FetchAllPagesOptions
): Promise<T[]> {
  const pageSize = Math.max(1, Math.min(options?.pageSize ?? DEFAULT_SUPABASE_PAGE_SIZE, 1000));
  const maxPages = Math.max(1, options?.maxPages ?? DEFAULT_MAX_SYNC_PAGES);
  const allRows: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await buildPageQuery(from, to);

    if (error) {
      if (options?.throwOnError) {
        throw error;
      }
      return allRows;
    }

    const batch = Array.isArray(data) ? data : [];
    if (batch.length === 0) {
      break;
    }

    allRows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  return allRows;
}

export interface KeysetPageResponse<T> {
  items: T[];
  hasMore: boolean;
  totalCount: number | null;
  error?: string;
}

/**
 * Fetches a single bounded slice for UI-driven "Load More" pagination.
 * Requests `limit + 1` rows so `hasMore` is exact without extra round-trips.
 */
export async function fetchBoundedSlice<T>(
  buildQuery: (from: number, to: number) => PromiseLike<PostgrestPageResult<T>>,
  offset: number,
  limit = 100
): Promise<KeysetPageResponse<T>> {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const safeOffset = Math.max(0, offset);

  const { data, error, count } = await buildQuery(safeOffset, safeOffset + safeLimit);
  if (error) {
    return {
      items: [],
      hasMore: false,
      totalCount: count ?? null,
      error: error.message || 'Query failed',
    };
  }

  const rows = Array.isArray(data) ? data : [];
  const hasMore = rows.length > safeLimit;
  return {
    items: hasMore ? rows.slice(0, safeLimit) : rows,
    hasMore,
    totalCount: count ?? null,
  };
}
