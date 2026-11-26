import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  allocatePaymentAcrossDocuments,
  applyChequeStatusTransition,
  buildCreditNoteDraftFromInvoice,
  buildUnifiedFiscalHeader,
  calculateUnifiedDocumentTotals,
  canEditUnifiedDocument,
  convertCommercialDocToUnified,
  formatDraftDocNumber,
  formatServerFiscalNumber,
  isDateInClosedPeriod,
} from './invoicingEngine.ts';
import { sortQueueForReplay, type OfflineMutationItem } from '../lib/supabase/offlineQueue.ts';
import type { CommercialDocument, UnifiedDocument, UnifiedPayment } from '../types/index.ts';

describe('Phase 2 (6.1 + 6.2): Unified Invoicing & Payments Engine', () => {
  it('computes multi-rate TVA, general discount, cash timbre, retenue de garantie, and FX equivalent in integer centimes', () => {
    const calc = calculateUnifiedDocumentTotals({
      items: [
        { id: 'l1', description: 'Matériel informatique', quantity: 2, unitPriceHt: 10000, tvaPercent: 19, discountPercent: 0 },
        { id: 'l2', description: 'Formation logiciel', quantity: 1, unitPriceHt: 10000, tvaPercent: 9, discountPercent: 10 },
      ],
      generalDiscountPercent: 10,
      guaranteeRetentionPercent: 5,
      paymentMethod: 'cash',
      timbreBasis: 'commercial_cash',
      currency: 'EUR',
      fxRate: 145,
    });

    // l1 raw = 20000, l2 raw = 9000 -> totalHtRaw = 29000 DZD = 2900000 centimes
    assert.equal(calc.totalHtRawCentimes, 2900000);
    // 10% general discount -> 26100 DZD = 2610000 centimes
    assert.equal(calc.totalHtFinalCentimes, 2610000);
    assert.equal(calc.tvaBreakdown.length, 2);
    assert.equal(calc.timbreFiscalCentimes > 0, true);
    assert.equal(calc.guaranteeRetentionCentimes > 0, true);
    assert.equal(calc.netToPayCentimes < calc.totalTtcCentimes, true);
    assert.equal(calc.netToPayDzdEquivalentCentimes, calc.netToPayCentimes * 145);
    assert.ok(calc.totalsInWordsFr.length > 5);
    assert.ok(calc.totalsInWordsAr.length > 3);
  });

  it('builds fiscal header snapshot from live tenant/branch profile without demo NIF/RC/RIB placeholders', () => {
    const hdr = buildUnifiedFiscalHeader(
      { id: 'biz_1', name: 'SARL Atlas Services', phone: '+213 550 11 22 33' },
      { id: 'br_1', address: '12 Rue Didouche, Alger' } as any,
      null
    );
    assert.equal(hdr.companyName, 'SARL Atlas Services');
    assert.equal(hdr.nif, undefined);
    assert.equal(hdr.rc, undefined);
    assert.equal(hdr.ribCcp, undefined);
    assert.equal(hdr.address, '12 Rue Didouche, Alger');
  });

  it('enforces deferred numbering: drafts cannot bypass issued requirement for credit notes and edit lock blocks non-drafts', () => {
    const header = buildUnifiedFiscalHeader({ name: 'Atlas Corp' }, null, null);
    const calc = calculateUnifiedDocumentTotals({
      items: [{ id: 'l1', description: 'Lot A', quantity: 4, unitPriceHt: 2500, tvaPercent: 19 }],
      paymentMethod: 'bank_transfer',
    });

    const draft: UnifiedDocument = {
      id: 'udoc_1',
      businessId: 'biz_1',
      branchId: 'br_1',
      sourceVertical: 'trading_commercial',
      docType: 'facture',
      draftNumber: formatDraftDocNumber('facture', 'udoc_1'),
      docNumber: null,
      fiscalYear: 2026,
      status: 'Draft',
      partyName: 'Client Alpha',
      docDate: '2026-11-26',
      paymentMethod: 'bank_transfer',
      currency: 'DZD',
      fxRate: 1,
      timbreBasis: 'exempt',
      items: calc.items,
      tvaBreakdown: calc.tvaBreakdown,
      totalHtRawCentimes: calc.totalHtRawCentimes,
      generalDiscountPercent: 0,
      totalHtFinalCentimes: calc.totalHtFinalCentimes,
      totalTvaCentimes: calc.totalTvaCentimes,
      timbreFiscalCentimes: 0,
      totalTtcCentimes: calc.totalTtcCentimes,
      guaranteeRetentionPercent: 0,
      guaranteeRetentionCentimes: 0,
      netToPayCentimes: calc.netToPayCentimes,
      paidCentimes: 0,
      balanceDueCentimes: calc.netToPayCentimes,
      fiscalHeaderSnapshot: header,
      includeStampSignature: true,
      printedCount: 0,
      createdAt: '2026-11-26T10:00:00Z',
      updatedAt: '2026-11-26T10:00:00Z',
    };

    assert.equal(canEditUnifiedDocument(draft), true);
    assert.throws(() => buildCreditNoteDraftFromInvoice(draft, 'Return'), /CREDIT_NOTE_REQUIRES_ISSUED_DOCUMENT/);

    const issued: UnifiedDocument = {
      ...draft,
      status: 'Issued',
      docNumber: formatServerFiscalNumber('facture', 2026, 7),
    };
    assert.equal(issued.docNumber, 'FAC-2026-00007');
    assert.equal(canEditUnifiedDocument(issued), false);

    const creditDraft = buildCreditNoteDraftFromInvoice(issued, 'Retour partiel', [
      { lineId: calc.items[0].id, quantity: 2 },
    ]);
    assert.equal(creditDraft.docType, 'avoir');
    assert.equal(creditDraft.docNumber, null);
    assert.equal(creditDraft.status, 'Draft');
    assert.equal(creditDraft.linkedDocId, issued.id);
    assert.equal(creditDraft.totalHtFinalCentimes, 500000); // 2 * 2500 DZD = 5000 DZD
  });

  it('allocates partial payments across open invoices and handles cheque/traite clearance + bounce rollback', () => {
    const plan = allocatePaymentAcrossDocuments(1500000, [
      { documentId: 'doc_1', documentNumber: 'FAC-2026-00001', openBalanceCentimes: 1000000 },
      { documentId: 'doc_2', documentNumber: 'FAC-2026-00002', openBalanceCentimes: 800000 },
    ]);
    assert.equal(plan.totalAllocatedCentimes, 1500000);
    assert.equal(plan.unallocatedCreditCentimes, 0);
    assert.deepEqual(plan.allocations, [
      { documentId: 'doc_1', documentNumber: 'FAC-2026-00001', allocatedCentimes: 1000000 },
      { documentId: 'doc_2', documentNumber: 'FAC-2026-00002', allocatedCentimes: 500000 },
    ]);

    const doc1: UnifiedDocument = {
      id: 'doc_1',
      businessId: 'b1',
      branchId: 'br1',
      sourceVertical: 'trading_commercial',
      docType: 'facture',
      draftNumber: 'DRAFT-FAC-1',
      docNumber: 'FAC-2026-00001',
      fiscalYear: 2026,
      status: 'Paid',
      partyName: 'Client A',
      docDate: '2026-11-26',
      currency: 'DZD',
      fxRate: 1,
      timbreBasis: 'exempt',
      items: [],
      tvaBreakdown: [],
      totalHtRawCentimes: 1000000,
      generalDiscountPercent: 0,
      totalHtFinalCentimes: 1000000,
      totalTvaCentimes: 0,
      timbreFiscalCentimes: 0,
      totalTtcCentimes: 1000000,
      guaranteeRetentionPercent: 0,
      guaranteeRetentionCentimes: 0,
      netToPayCentimes: 1000000,
      paidCentimes: 1000000,
      balanceDueCentimes: 0,
      fiscalHeaderSnapshot: { companyName: 'Atlas' },
      includeStampSignature: true,
      printedCount: 0,
      createdAt: '2026-11-26T10:00:00Z',
      updatedAt: '2026-11-26T10:00:00Z',
    };

    const payment: UnifiedPayment = {
      id: 'pay_1',
      businessId: 'b1',
      branchId: 'br1',
      paymentNumber: 'REG-2026-00001',
      partyName: 'Client A',
      method: 'cheque',
      amountCentimes: 1000000,
      currency: 'DZD',
      fxRate: 1,
      paymentDate: '2026-11-26',
      status: 'pending_clearance',
      instrumentNumber: 'CHQ-998877',
      instrumentBank: 'BEA',
      instrumentStatus: 'received',
      allocations: [{ documentId: 'doc_1', documentNumber: 'FAC-2026-00001', allocatedCentimes: 1000000 }],
      createdAt: '2026-11-26T10:00:00Z',
      updatedAt: '2026-11-26T10:00:00Z',
    };

    const deposited = applyChequeStatusTransition(payment, [doc1], 'deposited');
    assert.equal(deposited.updatedPayment.instrumentStatus, 'deposited');

    const bounced = applyChequeStatusTransition(deposited.updatedPayment, deposited.updatedDocuments, 'bounced', 'Provision insuffisante');
    assert.equal(bounced.updatedPayment.status, 'bounced');
    assert.equal(bounced.reopenedCount, 1);
    assert.equal(bounced.updatedDocuments[0].paidCentimes, 0);
    assert.equal(bounced.updatedDocuments[0].balanceDueCentimes, 1000000);
    assert.equal(bounced.updatedDocuments[0].status, 'Issued');
    assert.throws(() => applyChequeStatusTransition(bounced.updatedPayment, bounced.updatedDocuments, 'cleared'), /BOUNCED_INSTRUMENT_FINAL/);
  });

  it('orders Phase 2 offline queue items before dependent RPCs and detects closed accounting periods', () => {
    assert.equal(isDateInClosedPeriod('2026-10-15', ['2026-10']), true);
    assert.equal(isDateInClosedPeriod('2026-11-26', ['2026-10']), false);

    const legacyDoc: CommercialDocument = {
      id: 'cdoc_1',
      facilityId: 'br1',
      type: 'facture',
      docNumber: 'FAC-2026-00099',
      date: '2026-11-26',
      clientId: 'cl_1',
      clientName: 'BTP Nord',
      items: [{ id: 'i1', description: 'Ciment', quantity: 10, unit: 'sac', unitPriceHt: 700, tvaPercent: 19, totalHt: 7000 }],
      totalHtRaw: 7000,
      generalDiscountPercent: 0,
      totalHtFinal: 7000,
      totalTva: 1330,
      timbreFiscal: 0,
      totalTtc: 8330,
      guaranteeRetentionPercent: 0,
      guaranteeRetentionAmount: 0,
      netToPay: 8330,
      paymentMethod: 'Virement',
      status: 'Validated',
      includeStampSignature: true,
      createdAt: '2026-11-26T09:00:00Z',
    };
    const converted = convertCommercialDocToUnified(legacyDoc, { companyName: 'Atlas' });
    assert.equal(converted.totalHtFinalCentimes, 700000);
    assert.equal(converted.status, 'Issued');

    const rpcIssue: OfflineMutationItem = {
      id: 'm_rpc',
      kind: 'rpc',
      table: 'unified_documents',
      fn: 'issue_unified_document',
      args: { p_doc_id: 'udoc_1' },
      enqueuedAt: '2026-11-26T08:00:00Z',
      attempts: 0,
    };
    const rpcPay: OfflineMutationItem = {
      id: 'm_pay_rpc',
      kind: 'rpc',
      table: 'unified_payments',
      fn: 'record_unified_payment_with_allocations',
      args: { p_payment: { id: 'pay_1' } },
      enqueuedAt: '2026-11-26T08:00:00Z',
      attempts: 0,
    };
    const payMutation: OfflineMutationItem = {
      id: 'm_pay',
      kind: 'upsert',
      table: 'unified_payments',
      payload: { id: 'pay_1' },
      enqueuedAt: '2026-11-26T08:00:01Z',
      attempts: 0,
    };
    const docMutation: OfflineMutationItem = {
      id: 'm_doc',
      kind: 'upsert',
      table: 'unified_documents',
      payload: { id: 'udoc_1' },
      enqueuedAt: '2026-11-26T08:00:02Z',
      attempts: 0,
    };
    const sorted = sortQueueForReplay([rpcPay, rpcIssue, payMutation, docMutation]);
    assert.deepEqual(
      sorted.map((x) => x.id),
      ['m_doc', 'm_rpc', 'm_pay', 'm_pay_rpc']
    );
  });
});
