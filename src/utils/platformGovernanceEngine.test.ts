import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultApprovalRules,
  buildTenantStoragePath,
  buildWebhookSignatureHeader,
  canPurgeAttachment,
  computeWebhookRetryState,
  evaluateApprovalRequirement,
  generateSignedAttachmentAccess,
  hmacSha256Hex,
  issuePlatformApiKeyPair,
  issueWebhookEndpointSecret,
  isValidWebhookEndpointUrl,
  sha256Hex,
  validateApprovalDecision,
  validateAttachmentUpload,
  verifyApiKeyAccess,
  verifyWebhookSignature,
} from './platformGovernanceEngine';
import type { PlatformApprovalRequest, PlatformAttachmentRecord } from '../types/index';

test('sha256Hex and hmacSha256Hex produce RFC-compliant digests', () => {
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
  assert.equal(
    hmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog'),
    'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8'
  );
});

test('approval rules threshold matching & maker-checker non-self-approval', () => {
  const rules = buildDefaultApprovalRules({ accountId: 'acc_1', businessId: 'biz_1' });
  const below = evaluateApprovalRequirement({
    rules,
    actionScope: 'discount',
    amountCentimes: 200_000,
    percentDelta: 5,
  });
  assert.equal(below.required, false);

  const above = evaluateApprovalRequirement({
    rules,
    actionScope: 'discount',
    amountCentimes: 1_500_000,
    percentDelta: 20,
  });
  assert.equal(above.required, true);
  assert.equal(above.matchedRule?.actionScope, 'discount');

  const req: PlatformApprovalRequest = {
    id: 'apr_req_1',
    accountId: 'acc_1',
    businessId: 'biz_1',
    actionScope: 'discount',
    entityType: 'invoice',
    entityId: 'inv_1',
    entityLabel: 'FAC-2026-001',
    amountCentimes: 1_500_000,
    percentDelta: 20,
    reason: 'VIP client',
    status: 'pending',
    requestedByStaffId: 'stf_maker',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const selfApprove = validateApprovalDecision({
    request: req,
    rule: above.matchedRule,
    deciderStaffId: 'stf_maker',
    deciderRole: 'owner',
    decision: 'approved',
  });
  assert.equal(selfApprove.ok, false);
  if (!selfApprove.ok) assert.equal(selfApprove.reasonCode, 'APPROVAL_SELF_DECISION_FORBIDDEN');

  const checkerApprove = validateApprovalDecision({
    request: req,
    rule: above.matchedRule,
    deciderStaffId: 'stf_checker',
    deciderRole: 'owner',
    decision: 'approved',
  });
  assert.equal(checkerApprove.ok, true);
});

test('attachment upload validation, signed URL & legal hold purge protection', () => {
  const exeBlocked = validateAttachmentUpload({
    fileName: 'payload.exe',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  });
  assert.equal(exeBlocked.ok, false);

  const quarantined = validateAttachmentUpload({
    fileName: 'scan.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    virusScanStatus: 'quarantined',
  });
  assert.equal(quarantined.ok, false);

  const valid = validateAttachmentUpload({
    fileName: 'contract.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 4096,
    virusScanStatus: 'clean',
  });
  assert.equal(valid.ok, true);

  const storagePath = buildTenantStoragePath({
    accountId: 'acc_1',
    businessId: 'biz_1',
    entityType: 'invoice',
    entityId: 'FAC-1',
    fileName: '../secret/doc.pdf',
  });
  assert.ok(storagePath.startsWith('acc_1/biz_1/invoice/FAC-1/'));

  const oldDate = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const att: PlatformAttachmentRecord = {
    id: 'att_1',
    accountId: 'acc_1',
    businessId: 'biz_1',
    entityType: 'invoice',
    entityId: 'FAC-1',
    entityLabel: 'FAC-1',
    bucket: 'platform-attachments',
    storagePath,
    fileName: 'doc.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 4096,
    sha256: sha256Hex('doc'),
    virusScanStatus: 'clean',
    retentionDays: 30,
    legalHold: true,
    createdAt: oldDate,
    updatedAt: oldDate,
  };

  assert.deepEqual(canPurgeAttachment(att), { allowed: false, reasonCode: 'LEGAL_HOLD_ACTIVE' });
  assert.deepEqual(canPurgeAttachment({ ...att, legalHold: false }), { allowed: true });

  const signed = generateSignedAttachmentAccess({ attachment: att, ttlSeconds: 300 });
  assert.ok(signed.signedUrl.includes(`token=${signed.token}`));
});

test('scoped SHA-256 API keys & HMAC-SHA256 webhook signature + retry/dead-letter', () => {
  const { plaintextToken, record } = issuePlatformApiKeyPair({
    accountId: 'acc_1',
    businessId: 'biz_1',
    label: 'ERP BI Sync',
    scopes: ['bi:read', 'invoices:read'],
    rateLimitPerMinute: 60,
  });

  assert.ok(plaintextToken.startsWith('atr_live_'));
  assert.notEqual(record.keyHash, plaintextToken);

  const okRead = verifyApiKeyAccess({
    presentedToken: plaintextToken,
    keys: [record],
    requiredScope: 'bi:read',
    requestsInCurrentMinute: 5,
  });
  assert.equal(okRead.ok, true);

  const forbiddenWrite = verifyApiKeyAccess({
    presentedToken: plaintextToken,
    keys: [record],
    requiredScope: 'invoices:write',
    requestsInCurrentMinute: 5,
  });
  assert.equal(forbiddenWrite.ok, false);
  if (!forbiddenWrite.ok) assert.equal(forbiddenWrite.statusCode, 403);

  const rateLimited = verifyApiKeyAccess({
    presentedToken: plaintextToken,
    keys: [record],
    requiredScope: 'bi:read',
    requestsInCurrentMinute: 60,
  });
  assert.equal(rateLimited.ok, false);
  if (!rateLimited.ok) assert.equal(rateLimited.statusCode, 429);

  assert.equal(isValidWebhookEndpointUrl('https://erp.example.dz/hook'), true);
  assert.equal(isValidWebhookEndpointUrl('http://169.254.169.254/latest/meta-data'), false);

  const whSec = issueWebhookEndpointSecret();
  const payload = { event: 'invoice.issued', invoice: 'FAC-2026-010' };
  const ts = 1764192000;
  const sigHeader = buildWebhookSignatureHeader({
    secret: whSec.plaintextSecret,
    payloadJson: payload,
    timestampSeconds: ts,
  });
  assert.equal(
    verifyWebhookSignature({
      secret: whSec.plaintextSecret,
      payloadJson: payload,
      signatureHeader: sigHeader,
      nowSeconds: ts + 10,
    }),
    true
  );
  assert.equal(
    verifyWebhookSignature({
      secret: whSec.plaintextSecret,
      payloadJson: { event: 'tampered' },
      signatureHeader: sigHeader,
      nowSeconds: ts + 10,
    }),
    false
  );

  const retry1 = computeWebhookRetryState({ attemptCount: 1, maxRetries: 3, httpStatus: 502 });
  assert.equal(retry1.status, 'retrying');
  const dlq = computeWebhookRetryState({ attemptCount: 3, maxRetries: 3, httpStatus: 502 });
  assert.equal(dlq.status, 'dead_letter');
});
