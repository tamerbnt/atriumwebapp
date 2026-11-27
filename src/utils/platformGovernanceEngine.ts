import type {
  ApprovalActionScope,
  PlatformApiKey,
  PlatformApiScope,
  PlatformApprovalRequest,
  PlatformApprovalRule,
  PlatformAttachmentRecord,
  PlatformCustomField,
  PlatformPrintTemplate,
  PlatformWebhook,
  PlatformWebhookDelivery,
  PlatformWebhookEventType,
  PrintTemplateDocType,
} from '../types/index';

// ============================================================================
// Pure Synchronous SHA-256 & HMAC-SHA256 (Browser + Node isomorphic)
// ============================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

export function sha256Bytes(message: Uint8Array): Uint8Array {
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

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = dv.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function sha256Hex(input: string): string {
  const enc = new TextEncoder();
  return bytesToHex(sha256Bytes(enc.encode(input)));
}

export function hmacSha256Hex(secret: string, message: string): string {
  const enc = new TextEncoder();
  const blockSize = 64;
  let keyBytes: Uint8Array = enc.encode(secret);
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes, 0);

  const msgBytes = enc.encode(message);
  const oKeyPad = new Uint8Array(blockSize + 32);
  const iKeyPad = new Uint8Array(blockSize + msgBytes.length);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }
  iKeyPad.set(msgBytes, blockSize);
  const inner = sha256Bytes(iKeyPad);
  oKeyPad.set(inner, blockSize);
  return bytesToHex(sha256Bytes(oKeyPad));
}

function constantTimeHexEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function randomHex(byteCount = 16): string {
  const buf = new Uint8Array(byteCount);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < byteCount; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(buf);
}

// ============================================================================
// 1. Approval Workflows & Maker-Checker Engine
// ============================================================================

export const APPROVAL_ACTION_SCOPES: readonly ApprovalActionScope[] = [
  'discount',
  'refund',
  'expense',
  'payroll_release',
  'price_change',
] as const;

export function buildDefaultApprovalRules(params: {
  accountId: string;
  businessId: string;
  branchId?: string;
}): PlatformApprovalRule[] {
  const now = new Date().toISOString();
  const defs: Array<{
    scope: ApprovalActionScope;
    ruleName: string;
    thresholdCentimes: number;
    thresholdPercent?: number;
    approverRoles: string[];
  }> = [
    {
      scope: 'discount',
      ruleName: 'Discounts above 10,000 DZD or 15%',
      thresholdCentimes: 1_000_000,
      thresholdPercent: 15,
      approverRoles: ['owner', 'gerant', 'direction'],
    },
    {
      scope: 'refund',
      ruleName: 'Customer Refunds above 5,000 DZD',
      thresholdCentimes: 500_000,
      approverRoles: ['owner', 'gerant', 'direction', 'compta'],
    },
    {
      scope: 'expense',
      ruleName: 'Expense Reimbursements above 25,000 DZD',
      thresholdCentimes: 2_500_000,
      approverRoles: ['owner', 'gerant', 'direction', 'compta'],
    },
    {
      scope: 'payroll_release',
      ruleName: 'Monthly Payroll Run Release',
      thresholdCentimes: 1,
      approverRoles: ['owner', 'gerant', 'direction'],
    },
    {
      scope: 'price_change',
      ruleName: 'Catalog Price Overrides >= 10%',
      thresholdCentimes: 0,
      thresholdPercent: 10,
      approverRoles: ['owner', 'gerant', 'direction'],
    },
  ];
  return defs.map((d) => ({
    id: `apr_rule_${params.businessId}_${d.scope}`,
    accountId: params.accountId,
    businessId: params.businessId,
    branchId: params.branchId,
    actionScope: d.scope,
    ruleName: d.ruleName,
    thresholdCentimes: d.thresholdCentimes,
    thresholdPercent: d.thresholdPercent ?? null,
    approverRoles: d.approverRoles,
    requireDualControl: true,
    isActive: true,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }));
}

export function evaluateApprovalRequirement(params: {
  rules: PlatformApprovalRule[];
  actionScope: ApprovalActionScope;
  amountCentimes: number;
  percentDelta?: number | null;
}): { required: boolean; matchedRule?: PlatformApprovalRule } {
  const rule = params.rules.find(
    (r) => r.actionScope === params.actionScope && r.isActive && !r.deletedAt
  );
  if (!rule) return { required: false };
  const amountExceeded = params.amountCentimes >= rule.thresholdCentimes && rule.thresholdCentimes > 0;
  const pctExceeded =
    rule.thresholdPercent != null &&
    params.percentDelta != null &&
    params.percentDelta >= rule.thresholdPercent;
  const zeroThresholdTriggers = rule.thresholdCentimes === 0 && rule.thresholdPercent == null;
  if (amountExceeded || pctExceeded || zeroThresholdTriggers) {
    return { required: true, matchedRule: rule };
  }
  return { required: false };
}

export function validateApprovalDecision(params: {
  request: PlatformApprovalRequest;
  rule?: PlatformApprovalRule;
  deciderStaffId?: string;
  deciderRole: string;
  decision: 'approved' | 'rejected' | 'cancelled';
  allowSoleOwnerFallback?: boolean;
}): { ok: true } | { ok: false; reasonCode: string } {
  if (params.request.status !== 'pending') {
    return { ok: false, reasonCode: 'APPROVAL_ALREADY_DECIDED' };
  }
  if (params.decision === 'cancelled') {
    return { ok: true };
  }
  const normalizedRole = (params.deciderRole || '').trim().toLowerCase();
  const allowedRoles = (params.rule?.approverRoles || ['owner', 'gerant', 'direction']).map((r) =>
    r.toLowerCase()
  );
  const roleAuthorized =
    allowedRoles.includes(normalizedRole) ||
    ['owner', 'gerant', 'directeur_general', 'direction', 'admin'].includes(normalizedRole);
  if (!roleAuthorized) {
    return { ok: false, reasonCode: 'APPROVAL_ROLE_UNAUTHORIZED' };
  }

  const dualControl = params.rule ? params.rule.requireDualControl : true;
  if (
    dualControl &&
    !params.allowSoleOwnerFallback &&
    params.request.requestedByStaffId &&
    params.deciderStaffId &&
    params.request.requestedByStaffId === params.deciderStaffId
  ) {
    return { ok: false, reasonCode: 'APPROVAL_SELF_DECISION_FORBIDDEN' };
  }
  return { ok: true };
}

// ============================================================================
// 2. Attachments, Signed URLs, Virus-Scan Guard & Legal Hold Retention
// ============================================================================

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'sh',
  'ps1',
  'vbs',
  'js',
  'mjs',
  'dll',
  'msi',
  'scr',
]);

export function sanitizeAttachmentFileName(fileName: string): string {
  const base = (fileName || 'document.pdf').replace(/[\\/]/g, '_').trim();
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment.bin';
}

export function buildTenantStoragePath(params: {
  accountId: string;
  businessId: string;
  entityType: string;
  entityId: string;
  fileName: string;
}): string {
  const safeFile = sanitizeAttachmentFileName(params.fileName);
  const safeEntity = params.entityType.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeEntityId = params.entityId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${params.accountId}/${params.businessId}/${safeEntity}/${safeEntityId}/${Date.now()}_${safeFile}`;
}

export function validateAttachmentUpload(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  virusScanStatus?: 'pending' | 'clean' | 'quarantined';
}): { ok: true } | { ok: false; errorCode: string } {
  const cleanName = (params.fileName || '').trim();
  if (!cleanName) return { ok: false, errorCode: 'ATTACHMENT_EMPTY_NAME' };
  const ext = cleanName.split('.').pop()?.toLowerCase() || '';
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, errorCode: 'ATTACHMENT_BLOCKED_EXECUTABLE' };
  }
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has((params.mimeType || '').toLowerCase())) {
    return { ok: false, errorCode: 'ATTACHMENT_UNSUPPORTED_MIME' };
  }
  if (!Number.isFinite(params.sizeBytes) || params.sizeBytes <= 0 || params.sizeBytes > MAX_ATTACHMENT_BYTES) {
    return { ok: false, errorCode: 'ATTACHMENT_SIZE_LIMIT_EXCEEDED' };
  }
  if (params.virusScanStatus === 'quarantined') {
    return { ok: false, errorCode: 'ATTACHMENT_QUARANTINED_MALWARE' };
  }
  return { ok: true };
}

export function generateSignedAttachmentAccess(params: {
  attachment: PlatformAttachmentRecord;
  ttlSeconds?: number;
  nowMs?: number;
}): { token: string; expiresAt: string; signedUrl: string } {
  const ttl = Math.max(30, Math.min(3600 * 24, params.ttlSeconds ?? 900));
  const expMs = (params.nowMs ?? Date.now()) + ttl * 1000;
  const expiresAt = new Date(expMs).toISOString();
  const token = `sig_${sha256Hex(`${params.attachment.storagePath}:${expMs}:${randomHex(8)}`).slice(0, 28)}`;
  const signedUrl = `/storage/v1/object/sign/${params.attachment.bucket}/${encodeURI(params.attachment.storagePath)}?token=${token}&exp=${Math.floor(expMs / 1000)}`;
  return { token, expiresAt, signedUrl };
}

export function canPurgeAttachment(
  attachment: PlatformAttachmentRecord,
  nowMs = Date.now()
): { allowed: boolean; reasonCode?: 'LEGAL_HOLD_ACTIVE' | 'ALREADY_PURGED' | 'RETENTION_ACTIVE' } {
  if (attachment.purgedAt || attachment.deletedAt) {
    return { allowed: false, reasonCode: 'ALREADY_PURGED' };
  }
  if (attachment.legalHold) {
    return { allowed: false, reasonCode: 'LEGAL_HOLD_ACTIVE' };
  }
  const createdMs = Date.parse(attachment.createdAt);
  const retentionMs = Math.max(1, attachment.retentionDays) * 86_400_000;
  if (Number.isFinite(createdMs) && nowMs < createdMs + retentionMs) {
    return { allowed: false, reasonCode: 'RETENTION_ACTIVE' };
  }
  return { allowed: true };
}

// ============================================================================
// 3. Scoped REST API Keys (SHA-256 Hashed + Rate-Limit Check)
// ============================================================================

export const PLATFORM_API_SCOPES: readonly PlatformApiScope[] = [
  'invoices:read',
  'invoices:write',
  'payments:read',
  'crm:read',
  'crm:write',
  'wms:read',
  'bi:read',
  'approvals:read',
  'attachments:read',
] as const;

export function issuePlatformApiKeyPair(params: {
  accountId: string;
  businessId: string;
  branchId?: string;
  label: string;
  scopes: PlatformApiScope[];
  rateLimitPerMinute?: number;
  expiresInDays?: number | null;
  createdByStaffId?: string;
}): { plaintextToken: string; record: PlatformApiKey } {
  const tokenBody = randomHex(20);
  const plaintextToken = `atr_live_${tokenBody}`;
  const keyPrefix = plaintextToken.slice(0, 14) + '…';
  const keyHash = sha256Hex(plaintextToken);
  const nowIso = new Date().toISOString();
  const expiresAt =
    params.expiresInDays && params.expiresInDays > 0
      ? new Date(Date.now() + params.expiresInDays * 86_400_000).toISOString()
      : undefined;

  const record: PlatformApiKey = {
    id: `apk_${randomHex(8)}`,
    accountId: params.accountId,
    businessId: params.businessId,
    branchId: params.branchId,
    label: params.label.trim() || 'API Integration Key',
    keyPrefix,
    keyHash,
    scopes: params.scopes.length > 0 ? [...new Set(params.scopes)] : ['invoices:read', 'bi:read'],
    rateLimitPerMinute: Math.max(10, Math.min(6000, params.rateLimitPerMinute ?? 120)),
    status: 'active',
    expiresAt,
    createdByStaffId: params.createdByStaffId,
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return { plaintextToken, record };
}

export function verifyApiKeyAccess(params: {
  presentedToken: string;
  keys: PlatformApiKey[];
  requiredScope: PlatformApiScope;
  requestsInCurrentMinute?: number;
  nowMs?: number;
}): { ok: true; key: PlatformApiKey } | { ok: false; statusCode: 401 | 403 | 429; errorCode: string } {
  const clean = (params.presentedToken || '').trim();
  if (!clean.startsWith('atr_live_')) {
    return { ok: false, statusCode: 401, errorCode: 'INVALID_API_KEY_FORMAT' };
  }
  const candidateHash = sha256Hex(clean);
  const matched = params.keys.find(
    (k) => !k.deletedAt && constantTimeHexEquals(k.keyHash, candidateHash)
  );
  if (!matched || matched.status !== 'active') {
    return { ok: false, statusCode: 401, errorCode: 'API_KEY_REVOKED_OR_UNKNOWN' };
  }
  const nowMs = params.nowMs ?? Date.now();
  if (matched.expiresAt && Date.parse(matched.expiresAt) <= nowMs) {
    return { ok: false, statusCode: 401, errorCode: 'API_KEY_EXPIRED' };
  }
  if (!matched.scopes.includes(params.requiredScope)) {
    return { ok: false, statusCode: 403, errorCode: 'API_KEY_INSUFFICIENT_SCOPE' };
  }
  if ((params.requestsInCurrentMinute ?? 0) >= matched.rateLimitPerMinute) {
    return { ok: false, statusCode: 429, errorCode: 'API_RATE_LIMIT_EXCEEDED' };
  }
  return { ok: true, key: matched };
}

// ============================================================================
// 4. Signed Outbound Webhooks (`HMAC-SHA256`) & Retry / Dead-Letter Engine
// ============================================================================

export const PLATFORM_WEBHOOK_EVENTS: readonly PlatformWebhookEventType[] = [
  'invoice.issued',
  'payment.recorded',
  'approval.decided',
  'stock.low',
  'crm.party.merged',
  'attachment.uploaded',
  'dsr.processed',
] as const;

export function isValidWebhookEndpointUrl(rawUrl: string): boolean {
  try {
    const u = new URL((rawUrl || '').trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) return false;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === 'metadata.google.internal' ||
      host.startsWith('169.254.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function issueWebhookEndpointSecret(): {
  plaintextSecret: string;
  maskedSecret: string;
  secretHash: string;
} {
  const plaintextSecret = `whsec_${randomHex(20)}`;
  const maskedSecret = `whsec_••••${plaintextSecret.slice(-4)}`;
  const secretHash = sha256Hex(plaintextSecret);
  return { plaintextSecret, maskedSecret, secretHash };
}

export function buildWebhookSignatureHeader(params: {
  secret: string;
  payloadJson: Record<string, any> | string;
  timestampSeconds?: number;
}): string {
  const ts = params.timestampSeconds ?? Math.floor(Date.now() / 1000);
  const body =
    typeof params.payloadJson === 'string'
      ? params.payloadJson
      : JSON.stringify(params.payloadJson);
  const sig = hmacSha256Hex(params.secret, `${ts}.${body}`);
  return `t=${ts},v1=${sig}`;
}

export function verifyWebhookSignature(params: {
  secret: string;
  payloadJson: Record<string, any> | string;
  signatureHeader: string;
  maxAgeSeconds?: number;
  nowSeconds?: number;
}): boolean {
  const parts = Object.fromEntries(
    (params.signatureHeader || '')
      .split(',')
      .map((s) => s.trim().split('='))
      .filter(([k, v]) => k && v)
  );
  const ts = Number(parts.t);
  const sig = String(parts.v1 || '');
  if (!Number.isFinite(ts) || !sig) return false;
  const nowSec = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAge = params.maxAgeSeconds ?? 300;
  if (Math.abs(nowSec - ts) > maxAge) return false;

  const body =
    typeof params.payloadJson === 'string'
      ? params.payloadJson
      : JSON.stringify(params.payloadJson);
  const expected = hmacSha256Hex(params.secret, `${ts}.${body}`);
  return constantTimeHexEquals(expected, sig);
}

export function computeWebhookRetryState(params: {
  attemptCount: number;
  maxRetries: number;
  httpStatus: number;
  nowMs?: number;
}): {
  status: 'delivered' | 'retrying' | 'dead_letter';
  nextRetryAt?: string;
  deliveredAt?: string;
} {
  const nowMs = params.nowMs ?? Date.now();
  if (params.httpStatus >= 200 && params.httpStatus < 300) {
    return {
      status: 'delivered',
      deliveredAt: new Date(nowMs).toISOString(),
    };
  }
  if (params.attemptCount >= params.maxRetries) {
    return {
      status: 'dead_letter',
    };
  }
  const delaySec = Math.min(3600, 30 * Math.pow(4, Math.max(0, params.attemptCount - 1)));
  return {
    status: 'retrying',
    nextRetryAt: new Date(nowMs + delaySec * 1000).toISOString(),
  };
}

// ============================================================================
// 5. Custom Fields & Print Templates Defaults
// ============================================================================

export function buildDefaultPrintTemplate(params: {
  accountId: string;
  businessId: string;
  docType: PrintTemplateDocType;
}): PlatformPrintTemplate {
  const now = new Date().toISOString();
  return {
    id: `prnt_${params.businessId}_${params.docType}`,
    accountId: params.accountId,
    businessId: params.businessId,
    docType: params.docType,
    headerNote: '',
    footerNote: 'Thank you for your business.',
    accentColor: '#D4522F',
    showQr: true,
    showStamp: true,
    showSignature: true,
    rtlMirrorLayout: true,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateCustomFieldKey(rawKey: string): string {
  return (rawKey || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function scrubPlatformSecretsForBackup<
  T extends {
    platformApiKeys?: PlatformApiKey[];
    platformWebhooks?: PlatformWebhook[];
    platformWebhookDeliveries?: PlatformWebhookDelivery[];
    platformCustomFields?: PlatformCustomField[];
  }
>(snapshot: T): T {
  return {
    ...snapshot,
    platformApiKeys: (snapshot.platformApiKeys || []).map((k) => ({
      ...k,
      // Explicitly retain only hash + masked prefix; strip any accidental token property
      keyPrefix: k.keyPrefix,
      keyHash: k.keyHash,
    })),
    platformWebhooks: (snapshot.platformWebhooks || []).map((w) => ({
      ...w,
      signingSecretMasked: w.signingSecretMasked,
      signingSecretHash: w.signingSecretHash,
    })),
  };
}
