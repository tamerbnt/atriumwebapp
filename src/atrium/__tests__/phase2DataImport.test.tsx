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
  selectCurrentImportJobsFromState,
  selectCurrentImportMappingsFromState,
  selectCurrentProductsFromState,
} from '../../services/store';
import {
  buildImportErrorsReportCsv,
  buildSampleCsvForEntity,
  parseDelimitedCsv,
} from '../../utils/dataImportEngine';
import { DataImportWorkspace } from '../../components/common/import/DataImportWorkspace';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 2 Step 6 (6.7) — CSV / Excel Data Import Integration', () => {
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

  it('saves/deletes column mapping templates, imports products with skip duplicate policy, and rolls back atomically on chunk failure or manual rollback', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const saved = actions.saveImportColumnMapping({
      entityType: 'products',
      templateName: 'Supplier DZ CSV',
      encoding: 'utf-8',
      delimiter: ';',
      duplicatePolicy: 'skip',
      columnMap: { Name: 'name', SKU: 'sku', Price: 'priceAmount', Stock: 'stockQuantity' },
    });
    expect(selectCurrentImportMappingsFromState(getGlobalState(), 'products').some((m) => m.id === saved.id)).toBe(true);

    const beforeProductsCount = selectCurrentProductsFromState(getGlobalState()).length;

    const job1 = actions.commitDataImportBatch({
      entityType: 'products',
      fileName: 'products_batch1.csv',
      encoding: 'utf-8',
      delimiter: ';',
      duplicatePolicy: 'skip',
      mappingId: saved.id,
      headers: ['Name', 'SKU', 'Price', 'Stock'],
      rows: [
        ['Creatine Monohydrate 300g', 'SKU-CREAT-300', '6800', '24'],
        ['Invalid Negative', 'SKU-BAD', '-50', '5'],
      ],
      columnMap: saved.columnMap,
      chunkSize: 100,
    });

    expect(job1.status).toBe('committed');
    expect(job1.insertedRows).toBe(1);
    expect(job1.errorRows).toBe(1);
    expect(selectCurrentProductsFromState(getGlobalState()).length).toBe(beforeProductsCount + 1);

    // Duplicate SKU skipped on second run with skip policy
    const jobDup = actions.commitDataImportBatch({
      entityType: 'products',
      fileName: 'products_batch2_dupe.csv',
      duplicatePolicy: 'skip',
      headers: ['Name', 'SKU', 'Price'],
      rows: [['Creatine Monohydrate 300g', 'SKU-CREAT-300', '7000']],
      columnMap: { Name: 'name', SKU: 'sku', Price: 'priceAmount' },
    });
    expect(jobDup.status).toBe('committed');
    expect(jobDup.skippedRows).toBe(1);
    expect(jobDup.insertedRows).toBe(0);

    // Simulated chunk 2 failure rolls back chunk 1 atomically
    const jobFail = actions.commitDataImportBatch({
      entityType: 'products',
      fileName: 'products_fail_chunk2.csv',
      duplicatePolicy: 'skip',
      headers: ['Name', 'SKU', 'Price'],
      rows: [
        ['Row 1 Chunk 1', 'SKU-RB-1', '1200'],
        ['Row 2 Chunk 2', 'SKU-RB-2', '1500'],
      ],
      columnMap: { Name: 'name', SKU: 'sku', Price: 'priceAmount' },
      chunkSize: 1,
      simulateFailChunkIndex: 1,
    });
    expect(jobFail.status).toBe('rolled_back');
    expect(selectCurrentProductsFromState(getGlobalState()).length).toBe(beforeProductsCount + 1);

    // Manual rollback of job1 removes the created product cleanly
    actions.rollbackDataImportJob(job1.id, 'Test cleanup');
    const updatedJob1 = selectCurrentImportJobsFromState(getGlobalState()).find((j) => j.id === job1.id);
    expect(updatedJob1?.status).toBe('rolled_back');
    expect(selectCurrentProductsFromState(getGlobalState()).length).toBe(beforeProductsCount);

    actions.deleteImportColumnMapping(saved.id);
    expect(selectCurrentImportMappingsFromState(getGlobalState(), 'products').some((m) => m.id === saved.id)).toBe(false);
  });

  it('produces formula-safe sample & error CSVs and renders DataImportWorkspace cleanly in SSR', () => {
    const sample = buildSampleCsvForEntity('members');
    const parsed = parseDelimitedCsv(sample, ',');
    expect(parsed.headers).toContain('fullName');
    expect(parsed.rows.length).toBe(1);

    const errCsv = buildImportErrorsReportCsv([
      {
        rowNumber: 3,
        column: 'phone',
        errorCode: 'INVALID_PHONE',
        messageEn: 'Bad phone',
        messageFr: 'Téléphone invalide',
        messageAr: 'هاتف غير صالح',
        rawValue: '=cmd|calc',
      },
    ]);
    expect(errCsv).toContain("'=cmd|calc");

    const html = renderToStaticMarkup(<DataImportWorkspace />);
    expect(html).toContain('CSV &amp; Excel Data Import Center');
  });
});
