import type {
  DataProtectionConsent,
  DataSubjectRequest,
  PinAttemptTracker,
  RbacAction,
  RbacPermissionRule,
  RbacResource,
  SecurityWorkspacePolicy,
} from '../types/index';
import {
  canAccessStaffScreen,
  normalizeBusinessCategory,
  normalizeOperationalRole,
} from './staffRules';

export const RBAC_RESOURCES: readonly RbacResource[] = [
  'dashboard',
  'members',
  'registrations',
  'shop',
  'scheduler',
  'finance',
  'history',
  'analytics',
  'staff',
  'settings',
  'medical_records',
  'legal_records',
  'wms',
  'data_import',
  'rbac',
  'data_protection',
] as const;

export const RBAC_ACTIONS: readonly RbacAction[] = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export',
] as const;

export const EXECUTIVE_RBAC_ROLES = new Set([
  'owner',
  'gerant',
  'directeur_general',
  'admin',
  'direction',
  'agency_director',
  'avocat_associe',
  'notaire_titulaire',
  'expert_comptable',
]);

export const CATALOG_ROLES_BY_CATEGORY: Record<string, string[]> = {
  membership_session: ['owner', 'staff'],
  appointment_service: ['owner', 'staff'],
  pos_inventory: ['owner', 'staff'],
  education_cohort: ['owner', 'staff'],
  project_milestone: ['direction', 'chef_projet', 'crea', 'superviseur', 'rh', 'compta'],
  freelance_solo: ['owner', 'staff'],
  rental_booking: ['owner', 'staff'],
  trading_commercial: ['owner', 'staff'],
  medical_clinic: ['owner', 'doctor', 'infirmier'],
  auto_garage: ['gerant', 'reception', 'mecanicien', 'magasinier', 'caisse'],
  real_estate: ['direction', 'negociateur', 'gestionnaire_locatif', 'notaire_compta'],
  manufacturing_production: ['gerant', 'chef_atelier', 'operateur', 'magasinier', 'qualite'],
  legal_accounting: [
    'avocat_associe',
    'notaire_titulaire',
    'expert_comptable',
    'avocat_collaborateur',
    'clerc_notaire',
    'secretaire_caisse',
  ],
  logistics_delivery: ['gerant', 'dispatcher', 'hub_sorter', 'stop_desk_agent'],
  construction_contractor: ['gerant', 'conducteur', 'chef_chantier', 'metreur', 'comptable'],
  agriculture_farming: ['gerant', 'chef_culture', 'zootechnicien', 'magasinier'],
};

export function normalizeRbacRole(role: string | undefined | null): string {
  const normalized = normalizeOperationalRole(role || '').toLowerCase().trim();
  if (!normalized) return 'staff';
  if (normalized === 'conducteur_travaux') return 'conducteur';
  if (normalized === 'daf_metreur') return 'metreur';
  if (normalized === 'controleur') return 'qualite';
  return normalized;
}

export function isExecutiveRbacRole(role: string | undefined | null): boolean {
  return EXECUTIVE_RBAC_ROLES.has(normalizeRbacRole(role));
}

export function mapScreenToRbacResource(
  category: string,
  screen: string
): RbacResource | null {
  const cat = normalizeBusinessCategory(category);
  const s = (screen || '').trim();
  if (!s || s === 'home' || s === 'preferences' || s === 'chart_catalog') return null;

  if (s === 'staff' || s === 'pm_rh_talents' || s === 'pm_rh_dossier' || s === 'pm_rh_portal' || s === 'pm_rh_walkin') {
    return 'staff';
  }
  if (s === 'settings') return 'settings';
  if (s === 'history') return 'history';
  if (s === 'analytics' || s === 'pm_dir_reports' || s === 'pm_sup_missions' || s === 'pm_sup_attendance' || s === 'pm_sup_staffing') {
    return 'analytics';
  }
  if (
    s === 'finance' ||
    s === 'trading_finance' ||
    s === 'pm_compta_payroll' ||
    s === 'pm_compta_ccp' ||
    s === 'pm_compta_expenses' ||
    s === 'pm_compta_stock'
  ) {
    return 'finance';
  }
  if (s === 'shop' || s === 'trading_inventory' || s === 'trading_catalog' || s === 'pm_cp_catalog') {
    return 'shop';
  }
  if (
    s === 'scheduler' ||
    s === 'agenda' ||
    s === 'trading_purchases' ||
    s === 'pm_cp_projects' ||
    s === 'pm_cp_orders' ||
    s === 'pm_cp_deliverables' ||
    s === 'pm_cp_files' ||
    s === 'pm_cp_expenses'
  ) {
    return 'scheduler';
  }
  if (
    s === 'registrations' ||
    s === 'trading_sales' ||
    s === 'realestate_mandates' ||
    s === 'pm_crea_kanban' ||
    s === 'pm_crea_production' ||
    s === 'pm_crea_upload' ||
    s === 'pm_crea_briefs' ||
    s === 'pm_sup_expenses'
  ) {
    if (cat === 'legal_accounting' && s === 'registrations') return 'legal_records';
    if (cat === 'medical_clinic' && s === 'registrations') return 'medical_records';
    return 'registrations';
  }
  if (s === 'members' || s === 'trading_directory') {
    if (cat === 'legal_accounting') return 'legal_records';
    if (cat === 'medical_clinic') return 'medical_records';
    return 'members';
  }
  if (
    s === 'dashboard' ||
    s === 'trading_dashboard' ||
    s === 'pm_dir_dashboard' ||
    s === 'pm_dir_new_project' ||
    s === 'pm_dir_projects' ||
    s === 'pm_dir_approvals'
  ) {
    return 'dashboard';
  }
  return 'dashboard';
}

export interface RbacUserSubject {
  id?: string | null;
  role?: string | null;
  roleRank?: number | null;
}

export interface RbacCheckContext {
  category?: string;
  businessId?: string | null;
  rbacMatrix?: RbacPermissionRule[];
  isExecutiveOverride?: boolean;
}

const DEFAULT_STAFF_VIEW_RESOURCES = new Set<RbacResource>([
  'dashboard',
  'members',
  'registrations',
  'shop',
  'scheduler',
]);

function getDefaultPermission(
  category: string,
  roleKey: string,
  resource: RbacResource,
  action: RbacAction,
  roleRank = 0
): boolean {
  const cat = normalizeBusinessCategory(category);
  const role = normalizeRbacRole(roleKey);
  const isExec =
    EXECUTIVE_RBAC_ROLES.has(role) ||
    (['freelance_solo', 'trading_commercial', 'rental_booking', 'medical_clinic'].includes(cat) &&
      roleRank >= 8);

  if (isExec) return true;

  // Restricted admin resources fail closed by default for non-executives
  if (resource === 'rbac' || resource === 'data_protection' || resource === 'settings') {
    return false;
  }

  if (resource === 'staff') {
    if (action === 'delete' || action === 'approve' || action === 'export') {
      return canAccessStaffScreen(cat, role) && action === 'approve' ? false : canAccessStaffScreen(cat, role);
    }
    return canAccessStaffScreen(cat, role);
  }

  if (resource === 'history') {
    return cat === 'legal_accounting' && (role === 'avocat_collaborateur' || role === 'clerc_notaire')
      ? action === 'view'
      : false;
  }

  if (resource === 'data_import') {
    return false;
  }

  if (resource === 'medical_records') {
    if (cat !== 'medical_clinic') return false;
    if (role === 'doctor' || role === 'medecin_chef' || role === 'cadre_sante') {
      return action !== 'delete';
    }
    if (role === 'infirmier') {
      return action === 'view' || action === 'create' || action === 'edit';
    }
    return false;
  }

  if (resource === 'legal_records') {
    if (cat !== 'legal_accounting') return false;
    if (role === 'avocat_collaborateur' || role === 'clerc_notaire' || role === 'premier_clerc') {
      return action !== 'delete';
    }
    if (role === 'secretaire_caisse') {
      return action === 'view' || action === 'create';
    }
    return false;
  }

  if (resource === 'finance') {
    const financeAllowedRoles = new Set([
      'compta',
      'reception',
      'caisse',
      'gestionnaire_locatif',
      'notaire_compta',
      'chef_atelier',
      'qualite',
      'magasinier',
      'avocat_collaborateur',
      'clerc_notaire',
      'secretaire_caisse',
      'stop_desk_agent',
      'conducteur',
      'chef_chantier',
      'metreur',
      'comptable',
      'cashier',
      'assistant',
    ]);
    if (cat === 'agriculture_farming' && role === 'magasinier') {
      return action === 'view' || action === 'create';
    }
    if (cat === 'manufacturing_production' && role === 'magasinier') {
      return action === 'view' || action === 'create';
    }
    if (financeAllowedRoles.has(role) || ['trading_commercial', 'rental_booking', 'medical_clinic', 'freelance_solo'].includes(cat)) {
      if (action === 'delete' || action === 'approve' || action === 'export') return false;
      return true;
    }
    return false;
  }

  if (resource === 'analytics') {
    if (cat === 'project_milestone' && role === 'superviseur') return action === 'view' || action === 'create' || action === 'edit';
    if (cat === 'education_cohort' && role === 'staff') return action === 'view' || action === 'create' || action === 'edit';
    if (['freelance_solo', 'rental_booking', 'trading_commercial'].includes(cat)) {
      return action === 'view';
    }
    return false;
  }

  if (resource === 'wms') {
    if (role === 'magasinier' || role === 'chef_atelier' || role === 'dispatcher') {
      return action === 'view' || action === 'create' || action === 'edit';
    }
    return action === 'view';
  }

  // Operational resources (dashboard, members, registrations, shop, scheduler)
  if (action === 'delete') return false;
  if (action === 'approve' || action === 'export') {
    return role === 'chef_projet' || role === 'superviseur' || role === 'conducteur';
  }
  return DEFAULT_STAFF_VIEW_RESOURCES.has(resource);
}

/**
 * Single authoritative RBAC check `can(user, resource, action, ctx)` used across
 * routes, components, and store/service mutations.
 */
export function can(
  user: RbacUserSubject | null | undefined,
  resource: RbacResource,
  action: RbacAction = 'view',
  ctx: RbacCheckContext = {}
): boolean {
  if (!user) return false;

  const category = normalizeBusinessCategory(ctx.category);
  const roleKey = normalizeRbacRole(user.role);
  const roleRank = Number(user.roleRank ?? 0);
  const isOwnerProtected =
    roleKey === 'owner' ||
    roleKey === 'gerant' ||
    roleKey === 'directeur_general' ||
    roleKey === 'admin' ||
    roleRank >= 8;

  // Prevent account owner / primary executive lockout on governance & settings
  if (isOwnerProtected && (resource === 'rbac' || resource === 'settings')) {
    return true;
  }

  // Explicit configured matrix overrides (tenant + business scoped)
  const rules = ctx.rbacMatrix || [];
  if (rules.length > 0) {
    const match = rules.find(
      (r) =>
        !r.deletedAt &&
        (!ctx.businessId || r.businessId === ctx.businessId) &&
        normalizeRbacRole(r.roleKey) === roleKey &&
        r.resource === resource &&
        r.action === action
    );
    if (match) {
      return Boolean(match.allowed);
    }
  }

  if (ctx.isExecutiveOverride) return true;

  return getDefaultPermission(category, roleKey, resource, action, roleRank);
}

export function buildDefaultPermissionMatrix(params: {
  accountId: string;
  businessId: string;
  branchId?: string;
  category: string;
}): RbacPermissionRule[] {
  const category = normalizeBusinessCategory(params.category);
  const roles = CATALOG_ROLES_BY_CATEGORY[category] || ['owner', 'staff'];
  const nowIso = new Date().toISOString();
  const out: RbacPermissionRule[] = [];

  for (const roleKey of roles) {
    for (const resource of RBAC_RESOURCES) {
      for (const action of RBAC_ACTIONS) {
        const allowed = getDefaultPermission(category, roleKey, resource, action, 0);
        out.push({
          id: `rbac_${params.businessId}_${roleKey}_${resource}_${action}`,
          accountId: params.accountId,
          businessId: params.businessId,
          branchId: params.branchId,
          category,
          roleKey,
          resource,
          action,
          allowed,
          version: 1,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  }

  return out;
}

// ============================================================================
// Pure RFC-6238 HMAC-SHA1 TOTP + Recovery Code Verification (Node & Browser)
// ============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length;
  const bitLenHi = Math.floor((ml * 8) / 0x100000000);
  const bitLenLo = (ml * 8) >>> 0;
  const padLen = (64 - ((ml + 9) % 64)) % 64;
  const padded = new Uint8Array(ml + 1 + padLen + 8);
  padded.set(message, 0);
  padded[ml] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLenHi, false);
  dv.setUint32(padded.length - 4, bitLenLo, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = dv.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i++) {
      const val = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = ((val << 1) | (val >>> 31)) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f = 0;
      let k = 0;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const outView = new DataView(digest.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  return digest;
}

function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) {
    k = sha1(k);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(k, 0);

  const oKeyPad = new Uint8Array(blockSize + 20);
  const iKeyPad = new Uint8Array(blockSize + message.length);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }
  iKeyPad.set(message, blockSize);
  const innerHash = sha1(iKeyPad);
  oKeyPad.set(innerHash, blockSize);
  return sha1(oKeyPad);
}

export function generateTotpSecretBase32(bytesLength = 20): string {
  const buf = new Uint8Array(bytesLength);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < bytesLength; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return base32Encode(buf);
}

export function maskTotpSecret(secret: string): string {
  const clean = (secret || '').trim().toUpperCase();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

export function buildOtpAuthUri(params: {
  issuer?: string;
  accountEmail: string;
  secret: string;
}): string {
  const issuer = encodeURIComponent(params.issuer || 'Atrium ERP');
  const label = encodeURIComponent(`${params.issuer || 'Atrium ERP'}:${params.accountEmail}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(params.secret)}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateTotpToken(
  secretBase32: string,
  timestampMs = Date.now(),
  periodSeconds = 30
): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timestampMs / 1000 / periodSeconds);
  const counterBytes = new Uint8Array(8);
  const view = new DataView(counterBytes.buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  const hmac = hmacSha1(key, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1_000_000;
  return String(code).padStart(6, '0');
}

export function verifyTotpToken(
  secretBase32: string,
  code: string,
  timestampMs = Date.now(),
  windowSteps = 1
): boolean {
  const cleanCode = (code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode) || !secretBase32) return false;
  const periodMs = 30_000;
  for (let w = -windowSteps; w <= windowSteps; w++) {
    const candidate = generateTotpToken(secretBase32, timestampMs + w * periodMs, 30);
    if (candidate === cleanCode) return true;
  }
  return false;
}

export function hashSecurityCode(code: string, salt = 'atrium_sec_v1'): string {
  const normalized = (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const encoder = new TextEncoder();
  const digest = sha1(encoder.encode(`${salt}:${normalized}`));
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateRecoveryCodes(count = 6): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let raw = '';
    const rand = new Uint8Array(8);
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(rand);
    } else {
      for (let j = 0; j < 8; j++) rand[j] = Math.floor(Math.random() * 256);
    }
    for (let j = 0; j < 8; j++) {
      raw += chars[rand[j] % chars.length];
    }
    out.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return out;
}

export function consumeRecoveryCode(
  code: string,
  storedHashes: string[]
): { matched: boolean; remainingHashes: string[] } {
  const targetHash = hashSecurityCode(code);
  const idx = storedHashes.findIndex((h) => h === targetHash);
  if (idx === -1) {
    return { matched: false, remainingHashes: storedHashes };
  }
  return {
    matched: true,
    remainingHashes: storedHashes.filter((_, i) => i !== idx),
  };
}

// ============================================================================
// PIN Brute-Force Lockout & Session Timeout Helpers
// ============================================================================

export function createDefaultSecurityPolicy(params: {
  accountId: string;
  businessId: string;
}): SecurityWorkspacePolicy {
  const nowIso = new Date().toISOString();
  return {
    id: `secpol_${params.businessId}`,
    accountId: params.accountId,
    businessId: params.businessId,
    owner2faEnabled: false,
    owner2faRecoveryHashes: [],
    sessionTimeoutMinutes: 15,
    pinLockMaxAttempts: 5,
    pinLockoutSeconds: 300,
    requirePinOnIdle: true,
    logSensitiveReads: true,
    dataRetentionDays: 1825,
    law1807ReviewStatus: 'pending_counsel_review',
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function evaluatePinAttemptLockout(
  tracker: PinAttemptTracker | undefined,
  maxAttempts: number,
  lockoutSeconds: number,
  nowMs = Date.now()
): {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
} {
  if (!tracker) {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }
  if (tracker.lockedUntilMs && tracker.lockedUntilMs > nowMs) {
    return {
      isLocked: true,
      remainingSeconds: Math.max(1, Math.ceil((tracker.lockedUntilMs - nowMs) / 1000)),
      failedAttempts: tracker.failedAttempts,
    };
  }
  const safeMax = Math.max(3, maxAttempts || 5);
  if (tracker.failedAttempts >= safeMax && tracker.lockedUntilMs && tracker.lockedUntilMs <= nowMs) {
    // Lockout expired — ready for fresh attempts
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }
  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: tracker.failedAttempts,
  };
}

export function recordFailedPinAttempt(
  tracker: PinAttemptTracker | undefined,
  maxAttempts: number,
  lockoutSeconds: number,
  nowMs = Date.now()
): PinAttemptTracker {
  const status = evaluatePinAttemptLockout(tracker, maxAttempts, lockoutSeconds, nowMs);
  if (status.isLocked && tracker) {
    return tracker;
  }
  const safeMax = Math.max(3, maxAttempts || 5);
  const safeLockSec = Math.max(30, lockoutSeconds || 300);
  const nextCount = status.failedAttempts + 1;
  if (nextCount >= safeMax) {
    return {
      failedAttempts: nextCount,
      firstFailedAtMs: tracker?.firstFailedAtMs ?? nowMs,
      lockedUntilMs: nowMs + safeLockSec * 1000,
    };
  }
  return {
    failedAttempts: nextCount,
    firstFailedAtMs: tracker?.firstFailedAtMs ?? nowMs,
  };
}

export function evaluateSessionIdleTimeout(
  lastActivityAtMs: number,
  timeoutMinutes: number,
  nowMs = Date.now(),
  requirePinOnIdle = true
): { shouldLock: boolean; idleMs: number; thresholdMs: number } {
  const safeMinutes = Math.max(1, timeoutMinutes || 15);
  const thresholdMs = safeMinutes * 60_000;
  const idleMs = Math.max(0, nowMs - lastActivityAtMs);
  return {
    shouldLock: Boolean(requirePinOnIdle && idleMs >= thresholdMs),
    idleMs,
    thresholdMs,
  };
}

// ============================================================================
// Sensitive Read Audit Classification & Law 18-07 Subject Export Bundle
// ============================================================================

export function isSensitiveVerticalScreen(
  category: string,
  screen: string
): { targetTable: string; recordLabel: string; vertical: string } | null {
  const cat = normalizeBusinessCategory(category);
  const scr = (screen || '').trim();
  if (cat === 'medical_clinic') {
    if (scr === 'members') return { targetTable: 'medical_patients', recordLabel: 'patient_dossiers', vertical: cat };
    if (scr === 'registrations') return { targetTable: 'medical_prescriptions', recordLabel: 'prescriptions_and_consultations', vertical: cat };
    if (scr === 'scheduler' || scr === 'agenda') return { targetTable: 'medical_appointments', recordLabel: 'clinical_agenda', vertical: cat };
    if (scr === 'finance') return { targetTable: 'medical_billing', recordLabel: 'medical_billing', vertical: cat };
    if (scr === 'history') return { targetTable: 'medical_certificates', recordLabel: 'medical_certificates', vertical: cat };
  }
  if (cat === 'legal_accounting') {
    if (scr === 'members') return { targetTable: 'legal_cases', recordLabel: 'client_matters_and_dossiers', vertical: cat };
    if (scr === 'registrations') return { targetTable: 'legal_vault_documents', recordLabel: 'notary_and_defense_vault', vertical: cat };
    if (scr === 'scheduler') return { targetTable: 'legal_hearings', recordLabel: 'hearings_and_cpca_deadlines', vertical: cat };
    if (scr === 'finance') return { targetTable: 'legal_trust_accounts', recordLabel: 'carpa_and_escrow_trust', vertical: cat };
  }
  return null;
}

export function buildPersonalDataExportPayload(params: {
  businessId: string;
  businessName: string;
  subjectType: DataSubjectRequest['subjectType'];
  subjectId: string;
  subjectName: string;
  members?: any[];
  eduStudents?: any[];
  crmParties?: any[];
  staff?: any[];
  sales?: any[];
  unifiedDocuments?: any[];
  unifiedPayments?: any[];
  consents?: DataProtectionConsent[];
}): Record<string, any> {
  const normId = (params.subjectId || '').trim();
  const normName = (params.subjectName || '').trim().toLowerCase();

  const matches = (row: any, nameField = 'fullName'): boolean => {
    if (!row) return false;
    if (normId && String(row.id || '') === normId) return true;
    const candidateName = String(row[nameField] || row.displayName || row.partyName || '').trim().toLowerCase();
    return Boolean(normName && candidateName && candidateName === normName);
  };

  const memberRecords = (params.members || []).filter((m) => matches(m, 'fullName'));
  const studentRecords = (params.eduStudents || []).filter((st) => matches(st, 'fullName'));
  const partyRecords = (params.crmParties || []).filter((p) => matches(p, 'displayName'));
  const staffRecords = (params.staff || [])
    .filter((s) => matches(s, 'fullName'))
    .map(({ pinCode: _pin, ...safeStaff }) => safeStaff);

  const saleRecords = (params.sales || []).filter(
    (s) => (normId && s.memberId === normId) || (normName && String(s.memberName || '').toLowerCase() === normName)
  );
  const documentRecords = (params.unifiedDocuments || []).filter(
    (d) => (normId && d.partyId === normId) || (normName && String(d.partyName || '').toLowerCase() === normName)
  );
  const paymentRecords = (params.unifiedPayments || []).filter(
    (p) => (normId && p.partyId === normId) || (normName && String(p.partyName || '').toLowerCase() === normName)
  );
  const consentRecords = (params.consents || []).filter(
    (c) => (normId && c.subjectId === normId) || (normName && c.subjectName.toLowerCase() === normName)
  );

  return {
    schemaVersion: 'atrium-dsr-export-v1',
    frameworkNote: 'Law 18-07 configuration aid export — review with legal counsel before external release',
    exportedAt: new Date().toISOString(),
    businessId: params.businessId,
    businessName: params.businessName,
    subject: {
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      subjectName: params.subjectName,
    },
    counts: {
      members: memberRecords.length,
      students: studentRecords.length,
      crmParties: partyRecords.length,
      staff: staffRecords.length,
      sales: saleRecords.length,
      documents: documentRecords.length,
      payments: paymentRecords.length,
      consents: consentRecords.length,
    },
    records: {
      members: memberRecords,
      students: studentRecords,
      crmParties: partyRecords,
      staff: staffRecords,
      sales: saleRecords,
      documents: documentRecords,
      payments: paymentRecords,
      consents: consentRecords,
    },
  };
}
