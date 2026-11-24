import { describe, it, expect } from 'vitest';
import { validateFileForBucket } from '../services/storageService';
import { mapMembershipPlanFromDb } from '../services/memberService';

describe('storageService.validateFileForBucket', () => {
  it('accepts valid expense receipts under 5 MB', () => {
    expect(
      validateFileForBucket('expense-receipts', {
        name: 'ticket.pdf',
        type: 'application/pdf',
        size: 1024 * 500,
      })
    ).toEqual({ valid: true });
  });

  it('rejects empty (0 byte) or oversized files', () => {
    const emptyRes = validateFileForBucket('expense-receipts', {
      name: 'empty.png',
      type: 'image/png',
      size: 0,
    });
    expect(emptyRes.valid).toBe(false);

    const hugeRes = validateFileForBucket('expense-receipts', {
      name: 'huge.pdf',
      type: 'application/pdf',
      size: 6 * 1024 * 1024,
    });
    expect(hugeRes.valid).toBe(false);
  });

  it('rejects disallowed executable/archive formats for bat-deliverables', () => {
    const exeRes = validateFileForBucket('bat-deliverables', {
      name: 'payload.exe',
      type: 'application/octet-stream',
      size: 2048,
    });
    expect(exeRes.valid).toBe(false);

    const aiRes = validateFileForBucket('bat-deliverables', {
      name: 'pack.ai',
      type: '',
      size: 2048,
    });
    expect(aiRes).toEqual({ valid: true });
  });
});

describe('memberService.mapMembershipPlanFromDb', () => {
  it('preserves null totalSessions and durationDays without name-substring heuristics', () => {
    const mapped = mapMembershipPlanFromDb({
      id: 'plan_carnet',
      account_id: 'acc_tenant_1',
      business_id: 'biz_1',
      branch_id: 'br_1',
      name: 'Carnet 10 Séances Libre',
      description: '',
      duration_days: null,
      total_sessions: null,
      price_dzd: 8500,
      currency: 'DZD',
      is_active: true,
      session_quota: 0,
      version: 2,
    });

    expect(mapped.durationDays).toBeNull();
    expect(mapped.totalSessions).toBeNull();
    expect(mapped.price).toEqual({ amount: 8500, currency: 'DZD' });
    expect(mapped.version).toBe(2);
  });

  it('parses explicit numeric durationDays and totalSessions accurately', () => {
    const mapped = mapMembershipPlanFromDb({
      id: 'plan_trim',
      account_id: 'acc_tenant_1',
      business_id: 'biz_1',
      branch_id: 'br_1',
      name: 'Abonnement Trimestriel',
      duration_days: 90,
      total_sessions: 36,
      price_dzd: 18000,
      currency: 'DZD',
      is_active: true,
      session_quota: 3,
    });

    expect(mapped.durationDays).toBe(90);
    expect(mapped.totalSessions).toBe(36);
    expect(mapped.sessionsPerWeek).toBe(3);
  });
});
