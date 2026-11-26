import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultPermissionMatrix,
  buildOtpAuthUri,
  buildPersonalDataExportPayload,
  can,
  consumeRecoveryCode,
  createDefaultSecurityPolicy,
  evaluatePinAttemptLockout,
  evaluateSessionIdleTimeout,
  generateRecoveryCodes,
  generateTotpSecretBase32,
  generateTotpToken,
  hashSecurityCode,
  isSensitiveVerticalScreen,
  mapScreenToRbacResource,
  maskTotpSecret,
  recordFailedPinAttempt,
  verifyTotpToken,
} from './rbacEngine';

describe('Phase 2 Section 6.8 — RBAC, 2FA TOTP, PIN Lockout & Law 18-07 Export Engine', () => {
  it('enforces fail-closed default authorization and protects owner governance access', () => {
    assert.equal(can(null, 'dashboard', 'view', { category: 'pos_inventory' }), false);
    assert.equal(can({ id: 's1', role: 'Cashier', roleRank: 2 }, 'rbac', 'edit', { category: 'pos_inventory' }), false);
    assert.equal(can({ id: 's1', role: 'Cashier', roleRank: 2 }, 'settings', 'view', { category: 'pos_inventory' }), false);
    assert.equal(can({ id: 's1', role: 'Owner', roleRank: 8 }, 'rbac', 'edit', { category: 'pos_inventory' }), true);

    // Explicit matrix override cannot lock out an owner on rbac/settings
    const maliciousOverride = [
      {
        id: 'rule_lockout',
        accountId: 'acc_t1',
        businessId: 'biz_1',
        category: 'pos_inventory',
        roleKey: 'owner',
        resource: 'rbac' as const,
        action: 'edit' as const,
        allowed: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    assert.equal(
      can({ id: 'o1', role: 'Owner', roleRank: 8 }, 'rbac', 'edit', {
        category: 'pos_inventory',
        businessId: 'biz_1',
        rbacMatrix: maliciousOverride,
      }),
      true
    );
  });

  it('applies owner-configured rbacMatrix overrides to operational staff roles', () => {
    const baseRules = buildDefaultPermissionMatrix({
      accountId: 'acc_t1',
      businessId: 'biz_gym',
      category: 'membership_session',
    });

    assert.equal(
      can({ id: 'stf_2', role: 'Staff', roleRank: 1 }, 'finance', 'view', {
        category: 'membership_session',
        businessId: 'biz_gym',
        rbacMatrix: baseRules,
      }),
      false
    );

    const grantedRules = baseRules.map((r) =>
      r.roleKey === 'staff' && r.resource === 'finance' && r.action === 'view'
        ? { ...r, allowed: true }
        : r
    );

    assert.equal(
      can({ id: 'stf_2', role: 'Staff', roleRank: 1 }, 'finance', 'view', {
        category: 'membership_session',
        businessId: 'biz_gym',
        rbacMatrix: grantedRules,
      }),
      true
    );
  });

  it('maps vertical screens accurately to RBAC resources including medical and legal vaults', () => {
    assert.equal(mapScreenToRbacResource('medical_clinic', 'members'), 'medical_records');
    assert.equal(mapScreenToRbacResource('legal_accounting', 'registrations'), 'legal_records');
    assert.equal(mapScreenToRbacResource('project_milestone', 'pm_compta_payroll'), 'finance');
    assert.equal(mapScreenToRbacResource('pos_inventory', 'home'), null);
  });

  it('generates and verifies RFC-6238 TOTP tokens and hashed recovery codes cleanly', () => {
    // Standard RFC 6238 test secret ("12345678901234567890" -> GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ)
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    assert.equal(generateTotpToken(secret, 59_000, 30), '287082');
    assert.equal(verifyTotpToken(secret, '287082', 59_000, 0), true);
    assert.equal(verifyTotpToken(secret, '000000', 59_000, 0), false);

    const randomSecret = generateTotpSecretBase32();
    assert.ok(randomSecret.length >= 26);
    const masked = maskTotpSecret(randomSecret);
    assert.ok(masked.includes('••••••••'));
    assert.notEqual(masked, randomSecret);

    const uri = buildOtpAuthUri({ accountEmail: 'owner@clinic.dz', secret: randomSecret });
    assert.ok(uri.startsWith('otpauth://totp/'));

    const codes = generateRecoveryCodes(6);
    assert.equal(codes.length, 6);
    const hashes = codes.map((c) => hashSecurityCode(c));
    const used = consumeRecoveryCode(codes[2], hashes);
    assert.equal(used.matched, true);
    assert.equal(used.remainingHashes.length, 5);
    const reused = consumeRecoveryCode(codes[2], used.remainingHashes);
    assert.equal(reused.matched, false);
  });

  it('enforces PIN brute-force lockout and session idle timeouts', () => {
    const policy = createDefaultSecurityPolicy({ accountId: 'acc_t1', businessId: 'biz_1' });
    assert.equal(policy.law1807ReviewStatus, 'pending_counsel_review');

    let tracker = undefined;
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 4; i++) {
      tracker = recordFailedPinAttempt(tracker, 5, 300, t0 + i * 1000);
      assert.equal(evaluatePinAttemptLockout(tracker, 5, 300, t0 + i * 1000).isLocked, false);
    }
    tracker = recordFailedPinAttempt(tracker, 5, 300, t0 + 4000);
    const locked = evaluatePinAttemptLockout(tracker, 5, 300, t0 + 5000);
    assert.equal(locked.isLocked, true);
    assert.ok(locked.remainingSeconds >= 295);

    const expired = evaluatePinAttemptLockout(tracker, 5, 300, t0 + 310_000);
    assert.equal(expired.isLocked, false);

    assert.equal(evaluateSessionIdleTimeout(t0, 15, t0 + 10 * 60_000, true).shouldLock, false);
    assert.equal(evaluateSessionIdleTimeout(t0, 15, t0 + 16 * 60_000, true).shouldLock, true);
    assert.equal(evaluateSessionIdleTimeout(t0, 15, t0 + 20 * 60_000, false).shouldLock, false);
  });

  it('classifies sensitive vertical reads and builds Law 18-07 portable data export bundles', () => {
    const medRead = isSensitiveVerticalScreen('medical_clinic', 'members');
    assert.deepEqual(medRead, {
      targetTable: 'medical_patients',
      recordLabel: 'patient_dossiers',
      vertical: 'medical_clinic',
    });
    assert.equal(isSensitiveVerticalScreen('pos_inventory', 'shop'), null);

    const bundle = buildPersonalDataExportPayload({
      businessId: 'biz_med',
      businessName: 'Clinique El Azhar',
      subjectType: 'patient',
      subjectId: 'pat_01',
      subjectName: 'Amina Benali',
      members: [{ id: 'pat_01', fullName: 'Amina Benali', phoneNumber: '0550112233' }],
      staff: [{ id: 'stf_99', fullName: 'Amina Benali', pinCode: '4321' }],
      consents: [
        {
          id: 'con_1',
          accountId: 'acc_t1',
          businessId: 'biz_med',
          subjectType: 'patient',
          subjectId: 'pat_01',
          subjectName: 'Amina Benali',
          purpose: 'Medical file storage',
          legalBasis: 'consent',
          status: 'granted',
          consentMethod: 'digital_pin',
          grantedAt: '2026-11-20T10:00:00Z',
          createdAt: '2026-11-20T10:00:00Z',
          updatedAt: '2026-11-20T10:00:00Z',
        },
      ],
    });
    assert.equal(bundle.counts.members, 1);
    assert.equal(bundle.counts.consents, 1);
    assert.equal(bundle.records.staff[0].pinCode, undefined);
  });
});
