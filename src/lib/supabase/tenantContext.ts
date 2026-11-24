import { isSupabaseConfigured } from './client';

export class TenantContextMissingError extends Error {
  public readonly code = 'TENANT_CONTEXT_MISSING' as const;

  constructor(message = 'TENANT_CONTEXT_MISSING: Active tenant account and branch context are required.') {
    super(message);
    this.name = 'TenantContextMissingError';
  }
}

/**
 * Demo mode is strictly active only when explicitly opted in via VITE_ATRIUM_DEMO_MODE
 * or when Supabase is intentionally unconfigured in the preview sandbox.
 * Production writes never fall back to demo tenant IDs regardless of this flag.
 */
export function isDemoModeEnabled(): boolean {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (metaEnv?.VITE_ATRIUM_DEMO_MODE === 'true') return true;
  if (metaEnv?.VITE_ATRIUM_DEMO_MODE === 'false') return false;
  return !isSupabaseConfigured();
}

/**
 * Resolves the first non-empty tenant account ID across explicit candidates,
 * or fails closed by throwing TenantContextMissingError.
 */
export function requireTenantAccountId(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  throw new TenantContextMissingError(
    'TENANT_CONTEXT_MISSING: Missing accountId on write path; fallback tenant assignment is disabled.'
  );
}

/**
 * Requires both accountId and branchId to be non-empty before building any DB trace envelope
 * or queueing an offline mutation.
 */
export function requireTenantContext(ctx: {
  accountId?: string | null;
  branchId?: string | null;
}): { accountId: string; branchId: string } {
  const accountId = requireTenantAccountId(ctx.accountId);
  const branchId =
    typeof ctx.branchId === 'string' && ctx.branchId.trim().length > 0 ? ctx.branchId.trim() : '';
  if (!branchId) {
    throw new TenantContextMissingError(
      'TENANT_CONTEXT_MISSING: Missing branchId on write path; refusing unscoped mutation.'
    );
  }
  return { accountId, branchId };
}
