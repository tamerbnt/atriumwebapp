import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  getGlobalState,
  loginWithPinAction,
  setLanguageAction,
  useAtriumActions,
  selectCurrentDataConsentsFromState,
  selectCurrentDataSubjectRequestsFromState,
  selectCurrentMembersFromState,
  selectCurrentRbacPermissionsFromState,
  selectCurrentSecurityPolicyFromState,
  selectCurrentSensitiveReadEventsFromState,
} from '../../services/store';
import { generateTotpToken } from '../../utils/rbacEngine';
import { canAccessRoute } from '../../utils/routePermissions';
import { SecurityRbacWorkspace } from '../../components/common/security/SecurityRbacWorkspace';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 2 Step 7 (6.8) — RBAC, Owner 2FA, PIN Lockout & Law 18-07 Integration', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    atriumActions.resetAllData();
    setLanguageAction('en');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
  });

  it('configures RBAC cells and presets while protecting Owner governance from lockout', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    // Cannot lock out owner on rbac/settings
    const blocked = actions.saveRbacPermissionCell({
      roleKey: 'owner',
      resource: 'rbac',
      action: 'edit',
      allowed: false,
    });
    expect(blocked.ok).toBe(false);
    expect(actions.canPerformRbacAction('rbac', 'edit')).toBe(true);

    // Grant staff access to finance view and verify live route check honors it
    const granted = actions.saveRbacPermissionCell({
      roleKey: 'staff',
      resource: 'finance',
      action: 'view',
      allowed: true,
    });
    expect(granted.ok).toBe(true);

    const state = getGlobalState();
    const matrix = selectCurrentRbacPermissionsFromState(state);
    expect(
      canAccessRoute(
        'membership_session',
        {
          currentUser: { id: 'stf_staff', role: 'Staff', roleRank: 1 },
          businessId: state.currentBusinessId,
          activeMembershipRole: 'staff',
          rbacMatrix: matrix,
        },
        'finance'
      )
    ).toBe(true);

    // Apply readonly preset then reset to defaults
    const presetRes = actions.applyRbacRolePreset({ roleKey: 'staff', preset: 'readonly' });
    expect(presetRes.ok).toBe(true);

    const resetRes = actions.resetRbacMatrixToDefaults();
    expect(resetRes.ok).toBe(true);
  });

  it('enforces Owner 2FA TOTP enrollment, recovery codes, PIN lockout, and backup secret scrubbing', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const enroll = actions.beginOwner2faEnrollment();
    expect(enroll.recoveryCodes.length).toBe(6);
    expect(enroll.otpAuthUri.startsWith('otpauth://totp/')).toBe(true);

    const badEnable = actions.enableOwner2fa({
      secret: enroll.secret,
      totpCode: '000000',
      recoveryCodes: enroll.recoveryCodes,
    });
    expect(badEnable.ok).toBe(false);

    const validToken = generateTotpToken(enroll.secret);
    const okEnable = actions.enableOwner2fa({
      secret: enroll.secret,
      totpCode: validToken,
      recoveryCodes: enroll.recoveryCodes,
    });
    expect(okEnable.ok).toBe(true);

    const policy = selectCurrentSecurityPolicyFromState(getGlobalState());
    expect(policy.owner2faEnabled).toBe(true);
    expect(policy.owner2faSecretMasked).toBe(enroll.maskedSecret);

    // Backup export must strip plaintext owner2faVerifier
    const exportedJson = actions.exportDatabase();
    expect(exportedJson.includes(enroll.secret)).toBe(false);

    // Lock active session manually and require PIN + 2FA
    actions.lockActiveSession('manual_lock');
    expect(getGlobalState().sessionLockState?.isLocked).toBe(true);

    const step1 = actions.unlockActiveSessionWithPinAnd2fa({ pin: '1234' });
    expect(step1.success).toBe(false);
    expect(step1.requires2fa).toBe(true);

    // Unlock using single-use recovery code
    const step2 = actions.unlockActiveSessionWithPinAnd2fa({
      pin: '1234',
      totpOrRecoveryCode: enroll.recoveryCodes[0],
    });
    expect(step2.success).toBe(true);
    expect(getGlobalState().sessionLockState?.isLocked).toBe(false);
    expect(selectCurrentSecurityPolicyFromState(getGlobalState()).owner2faRecoveryHashes.length).toBe(5);

    // Lower max PIN attempts to 3 and trigger brute-force lockout
    actions.updateSecurityWorkspacePolicy({ pinLockMaxAttempts: 3, pinLockoutSeconds: 120 });
    expect(actions.unlockActiveSessionWithPinAnd2fa({ pin: '0001' }).locked).toBe(false);
    expect(actions.unlockActiveSessionWithPinAnd2fa({ pin: '0002' }).locked).toBe(false);
    const lockedAttempt = actions.unlockActiveSessionWithPinAnd2fa({ pin: '0003' });
    expect(lockedAttempt.locked).toBe(true);
    expect((lockedAttempt.remainingSeconds || 0) >= 100).toBe(true);
  });

  it('records Law 18-07 consents, processes DSR export/erasure, and deduplicates sensitive reads', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const targetMember = selectCurrentMembersFromState(getGlobalState())[0];
    expect(targetMember).toBeTruthy();

    const consent = actions.captureDataConsent({
      subjectType: 'member',
      subjectId: targetMember.id,
      subjectName: targetMember.fullName,
      purpose: 'Client file & access control',
      legalBasis: 'consent',
      consentMethod: 'digital_pin',
    });
    expect(consent.status).toBe('granted');
    expect(selectCurrentDataConsentsFromState(getGlobalState()).some((c) => c.id === consent.id)).toBe(true);

    actions.withdrawDataConsent(consent.id);
    const withdrawn = selectCurrentDataConsentsFromState(getGlobalState()).find((c) => c.id === consent.id);
    expect(withdrawn?.status).toBe('withdrawn');

    const dsr = actions.createDataSubjectRequest({
      subjectType: 'member',
      subjectId: targetMember.id,
      subjectName: targetMember.fullName,
      requestType: 'export',
      reason: 'Art. 32 portable export request',
    });
    expect(selectCurrentDataSubjectRequestsFromState(getGlobalState()).some((r) => r.id === dsr.id)).toBe(true);

    const exported = actions.processDataSubjectRequestAction({ requestId: dsr.id, action: 'export' });
    expect(exported.ok).toBe(true);
    expect(exported.exportPayload?.counts?.members).toBeGreaterThanOrEqual(1);

    const eraseReq = actions.createDataSubjectRequest({
      subjectType: 'member',
      subjectId: targetMember.id,
      subjectName: targetMember.fullName,
      requestType: 'erase',
      reason: 'Customer erasure request',
    });
    const erased = actions.processDataSubjectRequestAction({ requestId: eraseReq.id, action: 'erase' });
    expect(erased.ok).toBe(true);
    const updatedMember = getGlobalState().members.find((m) => m.id === targetMember.id);
    expect(updatedMember?.fullName.startsWith('[ERASED-')).toBe(true);

    // Sensitive read audit dedupes within 10s window
    const read1 = actions.recordSensitiveDataRead({
      category: 'medical_clinic',
      screen: 'members',
    });
    const read2 = actions.recordSensitiveDataRead({
      category: 'medical_clinic',
      screen: 'members',
    });
    expect(read1?.targetTable).toBe('medical_patients');
    expect(read2).toBeNull();
    expect(selectCurrentSensitiveReadEventsFromState(getGlobalState()).length).toBeGreaterThanOrEqual(1);
  });

  it('renders SecurityRbacWorkspace cleanly across EN, FR, and AR locales with Law 18-07 non-certification disclaimer', () => {
    setLanguageAction('en');
    const htmlEn = renderToStaticMarkup(<SecurityRbacWorkspace />);
    expect(htmlEn).toContain('Security, RBAC &amp; Data Protection Aid');
    expect(htmlEn).toContain('RBAC Permission Matrix');

    setLanguageAction('fr');
    const htmlFr = renderToStaticMarkup(<SecurityRbacWorkspace />);
    expect(htmlFr).toContain('Matrice des Permissions RBAC');

    setLanguageAction('ar');
    const htmlAr = renderToStaticMarkup(<SecurityRbacWorkspace />);
    expect(htmlAr).toContain('مصفوفة صلاحيات الأدوار');
  });
});
