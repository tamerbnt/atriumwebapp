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
  selectCurrentPlatformApiKeysFromState,
  selectCurrentPlatformApprovalRequestsFromState,
  selectCurrentPlatformApprovalRulesFromState,
  selectCurrentPlatformAttachmentsFromState,
  selectCurrentPlatformCustomFieldsFromState,
  selectCurrentPlatformPrintTemplatesFromState,
  selectCurrentPlatformWebhookDeliveriesFromState,
  selectCurrentPlatformWebhooksFromState,
} from '../../services/store';
import {
  canPurgeAttachment,
  verifyApiKeyAccess,
  verifyWebhookSignature,
} from '../../utils/platformGovernanceEngine';
import { dzdToCentimes } from '../../utils/money';
import { PlatformGovernanceWorkspace } from '../../components/common/platform/PlatformGovernanceWorkspace';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 2 Step 8 (6.9) — Maker-Checker, Attachments, Custom Schema, API Keys & Webhooks', () => {
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

  it('enforces maker-checker rules, blocks self-approval by default, and supports distinct-checker & sole-owner fallback', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const savedRule = actions.savePlatformApprovalRule({
      actionScope: 'discount',
      ruleName: 'Discount >= 5000 DZD',
      thresholdCentimes: dzdToCentimes(5000),
      requireDualControl: true,
      isActive: true,
    });
    expect(savedRule.actionScope).toBe('discount');
    expect(
      selectCurrentPlatformApprovalRulesFromState(getGlobalState()).some(
        (r) => r.id === savedRule.id && r.thresholdCentimes === dzdToCentimes(5000)
      )
    ).toBe(true);

    const submitted = actions.submitPlatformApprovalRequest({
      actionScope: 'discount',
      entityType: 'invoice',
      entityId: 'FAC-2026-088',
      entityLabel: 'FAC-2026-088 VIP',
      amountCentimes: dzdToCentimes(12000),
      percentDelta: 20,
      reason: 'Annual fleet agreement',
    });
    expect(submitted.ruleMatched).toBe(true);
    expect(submitted.request.status).toBe('pending');
    expect(
      selectCurrentPlatformApprovalRequestsFromState(getGlobalState()).some(
        (r) => r.id === submitted.request.id
      )
    ).toBe(true);

    // Same operator cannot self-approve without sole-owner override
    const selfBlocked = actions.decidePlatformApprovalRequest({
      requestId: submitted.request.id,
      decision: 'approved',
      allowSoleOwnerFallback: false,
    });
    expect(selfBlocked.ok).toBe(false);
    if (!selfBlocked.ok) {
      expect(selfBlocked.reasonCode).toBe('APPROVAL_SELF_DECISION_FORBIDDEN');
    }

    // Sole-owner fallback explicitly allowed succeeds for the audit record
    const soleApproved = actions.decidePlatformApprovalRequest({
      requestId: submitted.request.id,
      decision: 'approved',
      decisionNote: 'Sole owner emergency approval',
      allowSoleOwnerFallback: true,
    });
    expect(soleApproved.ok).toBe(true);
    if (soleApproved.ok) {
      expect(soleApproved.request.status).toBe('approved');
      expect(soleApproved.request.decisionNote).toBe('Sole owner emergency approval');
    }
  });

  it('validates attachments, blocks purge under legal hold, issues signed URLs, and saves custom fields & print templates', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    // Reject dangerous executable extension / MIME
    const rejectedExec = actions.registerPlatformAttachment({
      entityType: 'invoice',
      entityId: 'FAC-1',
      entityLabel: 'FAC-1',
      fileName: 'payload.exe',
      mimeType: 'application/x-msdownload',
      sizeBytes: 2048,
      virusScanStatus: 'clean',
      retentionDays: 365,
      legalHold: false,
    });
    expect(rejectedExec.ok).toBe(false);

    // Reject oversized (>25MB)
    const rejectedHuge = actions.registerPlatformAttachment({
      entityType: 'invoice',
      entityId: 'FAC-1',
      entityLabel: 'FAC-1',
      fileName: 'scan.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 30 * 1024 * 1024,
      virusScanStatus: 'clean',
      retentionDays: 365,
      legalHold: false,
    });
    expect(rejectedHuge.ok).toBe(false);

    // Register valid PDF with legal hold
    const validAtt = actions.registerPlatformAttachment({
      entityType: 'contract',
      entityId: 'CTR-2026-09',
      entityLabel: 'CTR-2026-09',
      fileName: 'Signed Annex.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 120_000,
      virusScanStatus: 'clean',
      retentionDays: 1825,
      legalHold: true,
    });
    expect(validAtt.ok).toBe(true);
    if (!validAtt.ok) return;

    const attId = validAtt.attachment.id;
    expect(
      selectCurrentPlatformAttachmentsFromState(getGlobalState()).some((a) => a.id === attId)
    ).toBe(true);

    const signed = actions.issueAttachmentSignedUrl({ attachmentId: attId, ttlSeconds: 600 });
    expect(signed.ok).toBe(true);
    if (signed.ok) {
      expect(signed.signedUrl).toContain('/storage/v1/object/sign/');
      expect(signed.signedUrl).toContain('token=');
    }

    // Purge blocked while legal hold active
    const purgeBlocked = actions.purgePlatformAttachment(attId);
    expect(purgeBlocked.ok).toBe(false);
    if (!purgeBlocked.ok) {
      expect(purgeBlocked.reasonCode).toBe('LEGAL_HOLD_ACTIVE');
    }

    // Release legal hold: retention window still protects recently registered file
    const released = actions.toggleAttachmentLegalHold(attId);
    expect(released?.legalHold).toBe(false);
    const retentionBlocked = actions.purgePlatformAttachment(attId);
    expect(retentionBlocked.ok).toBe(false);
    if (!retentionBlocked.ok) {
      expect(retentionBlocked.reasonCode).toBe('RETENTION_ACTIVE');
    }
    expect(
      released ? canPurgeAttachment(released, Date.now() + 2000 * 86_400_000).allowed : false
    ).toBe(true);

    // Custom fields & print templates
    const cf = actions.upsertPlatformCustomField({
      entityType: 'invoice',
      fieldKey: 'po_reference',
      labelEn: 'PO Reference',
      labelFr: 'Réf Bon de Commande',
      labelAr: 'مرجع طلب الشراء',
      fieldType: 'text',
      isRequired: true,
    });
    expect(cf.fieldKey).toBe('po_reference');
    expect(
      selectCurrentPlatformCustomFieldsFromState(getGlobalState()).some((f) => f.id === cf.id)
    ).toBe(true);

    const tpl = actions.upsertPlatformPrintTemplate({
      docType: 'invoice',
      footerNote: 'Payment due within 30 days',
      accentColor: '#C9461F',
      showQr: true,
      showStamp: false,
    });
    expect(tpl.footerNote).toBe('Payment due within 30 days');
    expect(
      selectCurrentPlatformPrintTemplatesFromState(getGlobalState()).some(
        (p) => p.docType === 'invoice' && p.showStamp === false
      )
    ).toBe(true);
  });

  it('issues scoped API keys, blocks SSRF webhook URLs, verifies HMAC signatures, retries failures, and scrubs secrets from backups', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const issued = actions.createPlatformApiKey({
      label: 'Accounting ERP Bridge',
      scopes: ['invoices:read', 'bi:read'],
      rateLimitPerMinute: 120,
      expiresInDays: 365,
    });
    expect(issued.plaintextToken.startsWith('atr_live_')).toBe(true);
    expect(issued.record.keyHash).not.toBe(issued.plaintextToken);

    // Verify API key check with scoped authorization
    const verified = verifyApiKeyAccess({
      presentedToken: issued.plaintextToken,
      keys: selectCurrentPlatformApiKeysFromState(getGlobalState()),
      requiredScope: 'bi:read',
    });
    expect(verified.ok).toBe(true);

    const forbiddenScope = verifyApiKeyAccess({
      presentedToken: issued.plaintextToken,
      keys: selectCurrentPlatformApiKeysFromState(getGlobalState()),
      requiredScope: 'crm:write',
    });
    expect(forbiddenScope.ok).toBe(false);

    // SSRF local webhook blocked
    const ssrfBlocked = actions.createPlatformWebhook({
      label: 'Localhost SSRF',
      endpointUrl: 'http://127.0.0.1:8080/hook',
      subscribedEvents: ['invoice.issued'],
    });
    expect(ssrfBlocked.ok).toBe(false);

    // Valid HTTPS webhook
    const whRes = actions.createPlatformWebhook({
      label: 'Partner Ledger Hook',
      endpointUrl: 'https://hooks.partner-erp.dz/ingest',
      subscribedEvents: ['invoice.issued', 'payment.recorded'],
      maxRetries: 2,
    });
    expect(whRes.ok).toBe(true);
    if (!whRes.ok) return;

    // Backup export must scrub plaintext API token & webhook signing secret
    const exportedJson = actions.exportDatabase();
    expect(exportedJson.includes(issued.plaintextToken)).toBe(false);
    expect(exportedJson.includes(whRes.plaintextSecret)).toBe(false);

    // Trigger signed delivery & verify HMAC signature
    const delivered = actions.triggerWebhookDelivery({
      webhookId: whRes.webhook.id,
      eventType: 'invoice.issued',
      payloadJson: { invoiceId: 'FAC-2026-099', totalCentimes: 450000 },
      simulateHttpStatus: 200,
    });
    expect(delivered?.status).toBe('delivered');
    if (delivered) {
      expect(
        verifyWebhookSignature({
          secret: whRes.plaintextSecret,
          signatureHeader: delivered.signatureHeader,
          payloadJson: delivered.payloadJson,
        })
      ).toBe(true);
    }

    // Simulate 502 failure -> retrying -> dead_letter -> manual retry delivered
    const failed1 = actions.triggerWebhookDelivery({
      webhookId: whRes.webhook.id,
      eventType: 'payment.recorded',
      simulateHttpStatus: 502,
    });
    expect(failed1?.status).toBe('retrying');
    if (failed1) {
      const deadLetter = actions.retryWebhookDelivery({
        deliveryId: failed1.id,
        simulateHttpStatus: 502,
      });
      expect(deadLetter?.status).toBe('dead_letter');

      const recovered = actions.retryWebhookDelivery({
        deliveryId: failed1.id,
        simulateHttpStatus: 200,
      });
      expect(recovered?.status).toBe('delivered');
    }

    expect(selectCurrentPlatformWebhooksFromState(getGlobalState()).length).toBeGreaterThanOrEqual(1);
    expect(
      selectCurrentPlatformWebhookDeliveriesFromState(getGlobalState()).length
    ).toBeGreaterThanOrEqual(2);

    // Revoke API key and verify revocation blocks further auth
    actions.revokePlatformApiKey(issued.record.id);
    const afterRevoke = verifyApiKeyAccess({
      presentedToken: issued.plaintextToken,
      keys: selectCurrentPlatformApiKeysFromState(getGlobalState()),
      requiredScope: 'bi:read',
    });
    expect(afterRevoke.ok).toBe(false);
  });

  it('renders PlatformGovernanceWorkspace across EN, FR, and AR locales cleanly', () => {
    setLanguageAction('en');
    const htmlEn = renderToStaticMarkup(<PlatformGovernanceWorkspace />);
    expect(htmlEn).toContain('Platform Governance &amp; Integrations');
    expect(htmlEn).toContain('Approval Threshold Rules');
    expect(htmlEn).not.toContain('phase2_plat_');

    setLanguageAction('fr');
    const htmlFr = renderToStaticMarkup(<PlatformGovernanceWorkspace />);
    expect(htmlFr).toContain('Gouvernance Plateforme &amp; Intégrations');
    expect(htmlFr).not.toContain('phase2_plat_');

    setLanguageAction('ar');
    const htmlAr = renderToStaticMarkup(<PlatformGovernanceWorkspace />);
    expect(htmlAr).toContain('حوكمة المنصة والتكاملات');
    expect(htmlAr).not.toContain('phase2_plat_');
  });
});
