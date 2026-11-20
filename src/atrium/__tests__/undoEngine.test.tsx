import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  UNDO_TOAST_DURATION_MS,
  MAX_UNDO_HISTORY_PER_BRANCH,
  configureUndoToastBridge,
  getFacilityAccentForCategory,
  getOperationDisplayName,
  getUndoHistoryEntries,
  getVerticalDisplayName,
  isApplyingUndo,
  pickLocalizedText,
  redoLatestForBranch,
  registerUndoEntry,
  resetUndoEngineForTests,
  runInsideUndoGuard,
  runUndoBatch,
  subscribeUndoHistory,
  triggerRedoById,
  triggerUndoById,
  undoLatestForBranch,
} from '../../services/undoEngine';
import { UndoHistoryPopover } from '../../components/ui/UndoHistoryPopover';
import { EmbeddedUndoHistoryPanel } from '../../components/ui/EmbeddedUndoHistoryPanel';
import { StaffHistorySubView } from '../../components/common/staff/StaffHistorySubView';
import { ToastStack } from '../../components/ui/ToastStack';
import { showToast, dismissToast, useAtriumStore } from '../../services/store';

describe('Atrium Universal Undo Engine', () => {
  beforeEach(() => {
    resetUndoEngineForTests();
  });

  it('registers entries, triggers undo & redo, and emits undo/redo toasts via bridge', async () => {
    const emitted: Array<{ title: string; message: string; hasUndo?: boolean; duration?: number }> = [];
    let value = 'initial';

    configureUndoToastBridge({
      emitToast: (opts) => {
        emitted.push({
          title: opts.title,
          message: opts.message,
          hasUndo: opts.hasUndo,
          duration: opts.duration,
        });
      },
      getContext: () => ({
        businessId: 'biz_1',
        branchId: 'br_1',
        category: 'membership_session',
        language: 'en',
      }),
    });

    const entry = registerUndoEntry({
      vertical: 'membership_session',
      operationType: 'edit',
      summary: 'Updated member plan',
      entityLabel: 'Amina',
      undo: () => {
        value = 'initial';
      },
      redo: () => {
        value = 'updated';
      },
    });

    value = 'updated';

    expect(entry).not.toBeNull();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].hasUndo).toBe(true);
    expect(emitted[0].duration).toBe(UNDO_TOAST_DURATION_MS);
    expect(emitted[0].message).toBe('Updated member plan');

    const undone = await triggerUndoById(entry!.id);
    expect(undone).toBe(true);
    expect(value).toBe('initial');

    const afterUndo = getUndoHistoryEntries({ businessId: 'biz_1', branchId: 'br_1' });
    expect(afterUndo[0].status).toBe('undone');

    const redone = await triggerRedoById(entry!.id);
    expect(redone).toBe(true);
    expect(value).toBe('updated');
    expect(getUndoHistoryEntries({ businessId: 'biz_1', branchId: 'br_1' })[0].status).toBe(
      'available'
    );
  });

  it('prevents re-entrant registration while applying undo', async () => {
    configureUndoToastBridge({
      emitToast: () => {},
      getContext: () => ({
        businessId: 'biz_guard',
        branchId: 'br_guard',
        category: 'pos_inventory',
        language: 'fr',
      }),
    });

    expect(isApplyingUndo()).toBe(false);
    await runInsideUndoGuard(() => {
      expect(isApplyingUndo()).toBe(true);
      const suppressed = registerUndoEntry({
        vertical: 'pos_inventory',
        operationType: 'create',
        summary: 'Should not record',
        undo: () => {},
      });
      expect(suppressed).toBeNull();
    });
    expect(isApplyingUndo()).toBe(false);
    expect(getUndoHistoryEntries({ businessId: 'biz_guard' })).toHaveLength(0);
  });

  it('coalesces 0, 1, and N mutations cleanly in runUndoBatch with reverse-order undo', async () => {
    configureUndoToastBridge({
      emitToast: () => {},
      getContext: () => ({
        businessId: 'biz_batch',
        branchId: 'br_batch',
        category: 'trading_commercial',
        language: 'en',
      }),
    });

    // 0 inner registrations -> no history entry
    runUndoBatch(
      {
        vertical: 'trading_commercial',
        operationType: 'bulk',
        summary: 'No-op batch',
      },
      () => {
        // nothing
      }
    );
    expect(getUndoHistoryEntries({ businessId: 'biz_batch' })).toHaveLength(0);

    // 1 inner registration -> preserves single operationType if not overridden, uses batch summary
    const log: string[] = [];
    runUndoBatch(
      {
        vertical: 'trading_commercial',
        summary: 'Single batched item',
      },
      () => {
        registerUndoEntry({
          vertical: 'trading_commercial',
          operationType: 'delete',
          summary: 'Inner',
          undo: () => {
            log.push('undo-single');
          },
          redo: () => {
            log.push('redo-single');
          },
        });
      }
    );
    let entries = getUndoHistoryEntries({ businessId: 'biz_batch', branchId: 'br_batch' });
    expect(entries).toHaveLength(1);
    expect(entries[0].operationType).toBe('delete');
    expect(entries[0].summary).toBe('Single batched item');

    // N inner registrations -> atomic bulk entry undoing in reverse order
    runUndoBatch(
      {
        vertical: 'trading_commercial',
        operationType: 'bulk',
        summary: 'Deleted 3 docs',
        affectedCount: 3,
      },
      () => {
        ['A', 'B', 'C'].forEach((item) => {
          registerUndoEntry({
            vertical: 'trading_commercial',
            operationType: 'delete',
            summary: `Delete ${item}`,
            undo: () => {
              log.push(`undo-${item}`);
            },
            redo: () => {
              log.push(`redo-${item}`);
            },
          });
        });
      }
    );

    entries = getUndoHistoryEntries({ businessId: 'biz_batch', branchId: 'br_batch' });
    expect(entries).toHaveLength(2);
    const bulkEntry = entries[0];
    expect(bulkEntry.operationType).toBe('bulk');
    expect(bulkEntry.affectedCount).toBe(3);

    await triggerUndoById(bulkEntry.id);
    expect(log).toEqual(['undo-C', 'undo-B', 'undo-A']);

    await triggerRedoById(bulkEntry.id);
    expect(log).toEqual(['undo-C', 'undo-B', 'undo-A', 'redo-A', 'redo-B', 'redo-C']);
  });

  it('caps history at 50 entries per branch while isolating other branches', () => {
    configureUndoToastBridge({
      emitToast: () => {},
      getContext: () => ({
        businessId: 'biz_cap',
        branchId: 'br_A',
        category: 'auto_garage',
        language: 'fr',
      }),
    });

    for (let i = 0; i < MAX_UNDO_HISTORY_PER_BRANCH + 12; i += 1) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'create',
        summary: `Entry ${i}`,
        businessId: 'biz_cap',
        branchId: 'br_A',
        showToast: false,
        undo: () => {},
      });
    }

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'create',
      summary: 'Branch B entry',
      businessId: 'biz_cap',
      branchId: 'br_B',
      showToast: false,
      undo: () => {},
    });

    expect(getUndoHistoryEntries({ businessId: 'biz_cap', branchId: 'br_A' })).toHaveLength(
      MAX_UNDO_HISTORY_PER_BRANCH
    );
    expect(getUndoHistoryEntries({ businessId: 'biz_cap', branchId: 'br_B' })).toHaveLength(1);
  });

  it('supports undoLatestForBranch, redoLatestForBranch, error marking, and subscribers', async () => {
    configureUndoToastBridge({
      emitToast: () => {},
      getContext: () => ({
        businessId: 'biz_latest',
        branchId: 'br_latest',
        category: 'legal_accounting',
        language: 'ar',
      }),
    });

    let listenerCalls = 0;
    const unsub = subscribeUndoHistory(() => {
      listenerCalls += 1;
    });

    let flag = 'v1';
    registerUndoEntry({
      vertical: 'legal_accounting',
      operationType: 'status',
      summary: 'First',
      showToast: false,
      undo: () => {
        flag = 'v0';
      },
      redo: () => {
        flag = 'v1';
      },
    });

    const didUndo = await undoLatestForBranch('biz_latest', 'br_latest');
    expect(didUndo).toBe(true);
    expect(flag).toBe('v0');

    const didRedo = await redoLatestForBranch('biz_latest', 'br_latest');
    expect(didRedo).toBe(true);
    expect(flag).toBe('v1');

    const failing = registerUndoEntry({
      vertical: 'legal_accounting',
      operationType: 'delete',
      summary: 'Failing action',
      showToast: false,
      undo: () => {
        throw new Error('Conflict detected');
      },
    });
    const failedUndo = await triggerUndoById(failing!.id);
    expect(failedUndo).toBe(false);
    const failedRecord = getUndoHistoryEntries({ businessId: 'biz_latest' }).find(
      (e) => e.id === failing!.id
    );
    expect(failedRecord?.status).toBe('error');
    expect(failedRecord?.lastError).toBe('Conflict detected');
    expect(listenerCalls).toBeGreaterThan(0);
    unsub();
  });

  it('provides localized labels and facility accents for all verticals', () => {
    expect(pickLocalizedText('ar', { fr: 'F', en: 'E', ar: 'A' })).toBe('A');
    expect(getVerticalDisplayName('construction_contractor', 'en')).toBe('Construction & BTP');
    expect(getVerticalDisplayName('agriculture_farming', 'fr')).toBe('Agriculture & Ferme');
    expect(getOperationDisplayName('bulk', 'fr')).toBe('Lot');
    const accent = getFacilityAccentForCategory('medical_clinic', 'dark');
    expect(accent.accent).toBe('#34D399');
  });

  it('renders UndoHistoryPopover and ToastStack markup cleanly across languages', () => {
    configureUndoToastBridge({
      emitToast: () => {},
      getContext: () => ({
        businessId: 'biz_ui',
        branchId: 'br_ui',
        category: 'rental_booking',
        language: 'fr',
      }),
    });

    registerUndoEntry({
      vertical: 'rental_booking',
      operationType: 'delete',
      summary: 'Réservation Salle A supprimée',
      showToast: false,
      undo: () => {},
    });

    const popoverHtml = renderToStaticMarkup(
      <UndoHistoryPopover
        isOpen={true}
        onClose={() => {}}
        businessId="biz_ui"
        branchId="br_ui"
        currentCategory="rental_booking"
        language="fr"
      />
    );
    expect(popoverHtml).toContain("Historique d&#x27;annulation");
    expect(popoverHtml).toContain('Réservation Salle A supprimée');
    expect(popoverHtml).toContain('Annuler');

    showToast({
      type: 'success',
      title: 'Test',
      message: 'Toast Undo Test',
      hasUndo: true,
      duration: 6000,
      onUndo: () => {},
      category: 'rental_booking',
    });

    const toastHtml = renderToStaticMarkup(<ToastStack />);
    expect(toastHtml).toContain('Toast Undo Test');
    expect(toastHtml).toContain('atrium-fuse-bar');
    const idMatch = toastHtml.match(/data-toast-id="([^"]+)"/);
    expect(idMatch?.[1]).toBeTruthy();
    if (idMatch?.[1]) dismissToast(idMatch[1]);
    expect(typeof useAtriumStore).toBe('function');
  });

  it('coalesces batched multi-item mutations into a single undo toast', () => {
    const emittedToasts: Array<{ title: string; message: string; hasUndo?: boolean }> = [];
    configureUndoToastBridge({
      emitToast: (opts) => {
        emittedToasts.push({
          title: opts.title,
          message: opts.message,
          hasUndo: opts.hasUndo,
        });
      },
      getContext: () => ({
        businessId: 'biz_bulk_toast',
        branchId: 'br_bulk_toast',
        category: 'membership_session',
        language: 'fr',
      }),
    });

    runUndoBatch(
      {
        vertical: 'staff',
        operationType: 'bulk',
        summary: '3 collaborateurs pointés (Entrée)',
        affectedCount: 3,
      },
      () => {
        ['s1', 's2', 's3'].forEach((staffId) => {
          registerUndoEntry({
            vertical: 'staff',
            operationType: 'create',
            summary: `Pointage ${staffId}`,
            undo: () => {},
          });
        });
      }
    );

    expect(emittedToasts).toHaveLength(1);
    expect(emittedToasts[0].hasUndo).toBe(true);
    expect(emittedToasts[0].message).toBe('3 collaborateurs pointés (Entrée)');
  });

  it('renders EmbeddedUndoHistoryPanel scoped to active vertical and empty state cleanly', () => {
    configureUndoToastBridge({
      emitToast: () => {},
      getContext: () => ({
        businessId: 'biz_embed',
        branchId: 'br_embed',
        category: 'medical_clinic',
        language: 'fr',
      }),
    });

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      summary: 'Consultation Dr. Benali enregistrée',
      showToast: false,
      undo: () => {},
    });

    registerUndoEntry({
      vertical: 'staff',
      operationType: 'edit',
      summary: 'Staff role updated',
      showToast: false,
      undo: () => {},
    });

    const panelHtml = renderToStaticMarkup(
      <EmbeddedUndoHistoryPanel
        businessId="biz_embed"
        branchId="br_embed"
        vertical="medical_clinic"
        language="fr"
      />
    );
    expect(panelHtml).toContain('Ce module');
    expect(panelHtml).toContain("Tout l&#x27;établissement");
    expect(panelHtml).toContain('Consultation Dr. Benali enregistrée');
    expect(panelHtml).not.toContain('Staff role updated');

    const emptyHtml = renderToStaticMarkup(
      <EmbeddedUndoHistoryPanel
        businessId="biz_embed"
        branchId="br_embed"
        vertical="auto_garage"
        language="fr"
      />
    );
    expect(emptyHtml).toContain('Aucune annulation correspondante');
  });

  it('renders StaffHistorySubView with Annulations as the 3rd segmented tab', () => {
    const html = renderToStaticMarkup(
      <StaffHistorySubView
        staffList={[]}
        payrollRuns={[]}
        payrollSlips={[]}
        attendanceLogs={[]}
        language="fr"
      />
    );
    const idxSalaires = html.indexOf('Salaires');
    const idxPointages = html.indexOf('Pointages');
    const idxAnnulations = html.indexOf('Annulations');
    expect(idxSalaires).toBeGreaterThan(-1);
    expect(idxPointages).toBeGreaterThan(idxSalaires);
    expect(idxAnnulations).toBeGreaterThan(idxPointages);
  });
});

