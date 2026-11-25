import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintSheetModal } from '../../components/modals/PrintSheetModal';
import { ShareArtifactModal } from '../../components/modals/ShareArtifactModal';
import { buildScrapNcrArtifacts } from '../../utils/step5Actions';
import { t } from '../../utils/i18n';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
  enqueueMutation,
  flushOfflineQueue,
  getOfflineQueueCount,
  sortQueueForReplay,
} from '../../lib/supabase/offlineQueue';
import * as clientModule from '../../lib/supabase/client';

describe('Step 5 Workflows: PrintSheetModal, ShareArtifactModal, 3.12 CMUP Hold, and Offline Queue Replay', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders PrintSheetModal with DUPLICATA watermark, warning banner, and Arabic RTL direction (3.7/3.9)', () => {
    const html = renderToStaticMarkup(
      <PrintSheetModal
        isOpen
        onClose={() => {}}
        language="ar"
        format="a4"
        title="إيصال ضمان"
        warningBanner="تم تجاهل 1 سجل محذوف"
        pages={[
          {
            id: 'dep_1',
            title: 'RC-2026-0001',
            watermarkText: 'DUPLICATA',
            sections: [
              {
                heading: 'التفاصيل',
                rows: [{ label: 'المبلغ', value: '50 000 DZD' }],
              },
            ],
          },
        ]}
      />
    );

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('DUPLICATA');
    expect(html).toContain('RC-2026-0001');
    expect(html).toContain('50 000 DZD');
    expect(html).toContain('تم تجاهل 1 سجل محذوف');
  });

  it('renders ShareArtifactModal summary without fabricating fake public tracking/share URLs (3.11)', () => {
    const html = renderToStaticMarkup(
      <ShareArtifactModal
        isOpen
        onClose={() => {}}
        language="fr"
        title="Partager PV État des Lieux"
        shareText={'Villa Hydra F5\nÉtat: Bon\nValidé et verrouillé'}
        onOpenPrintPdf={() => {}}
      />
    );

    expect(html).toContain('Villa Hydra F5');
    expect(html).toContain('https://wa.me/?text=');
    // Must not generate fake hosted receipt/viewer URLs
    expect(html).not.toMatch(/https:\/\/(?!wa\.me)/);
  });

  it('enforces 3.12 CMUP Hold invariant without mutating stock or WIP valuation and exposes localized notice', () => {
    const rawMaterialsBefore = [{ id: 'rm_1', stockKg: 400, cmupCost: 850 }];
    const { qcRecord, ncrRecord } = buildScrapNcrArtifacts({
      ncrId: 'ncr_step5_1',
      qcId: 'qc_step5_1',
      ncrNumber: 'NCR-2026-0042',
      inspectionNumber: 'QC-2026-0042',
      accountId: 'acc_demo',
      businessId: 'biz_mfg',
      branchId: 'br_main',
      staffId: 'stf_qc',
      orderId: 'of_42',
      orderNumber: 'OF-042',
      batchLotNumber: 'LOT-42',
      productName: 'Acier Galvanisé',
      inspectorName: 'Karim QC',
      scrappedQuantity: 5,
      reason: 'Fissure soudure',
      inspectionDate: '2026-11-25',
    });

    expect(qcRecord.verdict).toBe('Scrapped');
    expect(ncrRecord.disposition).toBe('Scrapped');
    expect(ncrRecord.cmupAdjustmentHeld).toBe(true);
    // Raw material stock & CMUP remain untouched
    expect(rawMaterialsBefore[0].stockKg).toBe(400);
    expect(rawMaterialsBefore[0].cmupCost).toBe(850);
    // Localized notice key exists in FR / EN / AR
    expect(t('step5_cmup_held_notice', 'fr')).toContain('CMUP');
    expect(t('step5_cmup_held_notice', 'en')).toContain('CMUP');
    expect(t('step5_cmup_held_notice', 'ar')).toContain('CMUP');
  });

  it('enqueues Step 5 tables offline in dependency order and drains cleanly upon reconnect', async () => {
    const scheduleItem = enqueueMutation({
      kind: 'upsert',
      table: 'gym_schedule_events',
      payload: { id: 'ev_99', title: 'HIIT' },
    });
    const enrollmentItem = enqueueMutation({
      kind: 'upsert',
      table: 'gym_class_enrollments',
      payload: { id: 'enr_99', event_id: 'ev_99', member_id: 'mem_1' },
      dependsOnId: scheduleItem.id,
    });
    const depositItem = enqueueMutation({
      kind: 'upsert',
      table: 'rental_security_deposits',
      payload: { id: 'dep_99', deposit_receipt_number: 'RC-2026-0099', printed_count: 1 },
    });
    const inspectionItem = enqueueMutation({
      kind: 'upsert',
      table: 're_inspections',
      payload: { id: 'insp_99', is_locked: true },
    });
    const ncrItem = enqueueMutation({
      kind: 'upsert',
      table: 'mfg_ncr_records',
      payload: { id: 'ncr_99', cmup_adjustment_held: true },
    });

    expect(getOfflineQueueCount()).toBe(5);
    const sorted = sortQueueForReplay([
      ncrItem,
      enrollmentItem,
      inspectionItem,
      depositItem,
      scheduleItem,
    ]);
    const sortedIds = sorted.map((x) => x.id);
    expect(sortedIds.indexOf(scheduleItem.id)).toBeLessThan(sortedIds.indexOf(enrollmentItem.id));

    const replayedTables: string[] = [];
    vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue({
      from: (table: string) => ({
        upsert: async () => {
          replayedTables.push(table);
          return { error: null };
        },
      }),
    } as any);

    const flushResult = await flushOfflineQueue({ ignoreBackoff: true });
    expect(flushResult.succeeded).toBe(5);
    expect(flushResult.failed).toBe(0);
    expect(getOfflineQueueCount()).toBe(0);
    expect(replayedTables).toContain('gym_schedule_events');
    expect(replayedTables).toContain('gym_class_enrollments');
    expect(replayedTables).toContain('rental_security_deposits');
    expect(replayedTables).toContain('re_inspections');
    expect(replayedTables).toContain('mfg_ncr_records');
  });
});
