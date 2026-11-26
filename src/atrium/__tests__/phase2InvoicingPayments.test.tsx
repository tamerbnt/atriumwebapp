import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

import { setLanguageAction } from '../../services/store';
import { UnifiedInvoicePrintModal } from '../../components/common/invoicing/UnifiedInvoicePrintModal';
import { UnifiedPaymentsLedgerPanel } from '../../components/common/invoicing/UnifiedPaymentsLedgerPanel';
import { CommercialDocPrintModal } from '../../components/screens/trading/CommercialDocPrintModal';
import { MemberSlideOverInspector } from '../../components/screens/membership/MemberSlideOverInspector';
import type { CommercialDocument, Member, UnifiedDocument, UnifiedPayment } from '../../types/index';

describe('Phase 2 Step 2.1 Workflows: Unified Invoicing & Payments UI Adoption', () => {
  beforeEach(() => {
    setLanguageAction('en');
  });

  it('renders UnifiedInvoicePrintModal with live tenant fiscal header without demo constants', () => {
    const doc: UnifiedDocument = {
      id: 'udoc_test_1',
      accountId: 'acc_test',
      businessId: 'biz_1',
      branchId: 'br_1',
      sourceVertical: 'trading_commercial',
      docType: 'facture',
      draftNumber: 'DRAFT-FACT-0001',
      docNumber: 'FAC-2026-00042',
      fiscalYear: 2026,
      status: 'Issued',
      partyName: 'Clinique El Manar',
      partyNif: '002016000011223',
      docDate: '2026-11-26',
      paymentMethod: 'bank_transfer',
      paymentTerms: 'Comptant',
      currency: 'DZD',
      fxRate: 1,
      fxRateDate: '2026-11-26',
      timbreBasis: 'exempt',
      items: [
        {
          id: 'l1',
          description: 'Maintenance annuelle serveur',
          isService: true,
          quantity: 1,
          unit: 'an',
          unitPriceHt: 50000,
          tvaPercent: 19,
          discountPercent: 0,
          totalHtCentimes: 5000000,
          totalTvaCentimes: 950000,
          totalTtcCentimes: 5950000,
        },
      ],
      tvaBreakdown: [{ ratePercent: 19, baseHtCentimes: 5000000, tvaCentimes: 950000 }],
      totalHtRawCentimes: 5000000,
      generalDiscountPercent: 0,
      totalHtFinalCentimes: 5000000,
      totalTvaCentimes: 950000,
      timbreFiscalCentimes: 0,
      totalTtcCentimes: 5950000,
      guaranteeRetentionPercent: 0,
      guaranteeRetentionCentimes: 0,
      netToPayCentimes: 5950000,
      paidCentimes: 0,
      balanceDueCentimes: 5950000,
      fiscalHeaderSnapshot: {
        companyName: 'SARL Numidia Tech',
        nif: '001916099887766',
        rc: '16/00-998877B19',
      },
      totalsInWordsFr: 'Cinquante-neuf mille cinq cents dinars',
      totalsInWordsAr: 'تسعة وخمسون ألفاً وخمسمائة دينار جزائري',
      includeStampSignature: true,
      printedCount: 0,
      createdAt: '2026-11-26T10:00:00Z',
      updatedAt: '2026-11-26T10:00:00Z',
    };

    const html = renderToStaticMarkup(
      <UnifiedInvoicePrintModal isOpen onClose={() => {}} document={doc} />
    );

    expect(html).toContain('FAC-2026-00042');
    expect(html).toContain('SARL Numidia Tech');
    expect(html).toContain('001916099887766');
    expect(html).toContain('Stamp &amp; Signature');
    expect(html).not.toContain('MAGHREB');
    expect(html).not.toContain('002116019842189');

    setLanguageAction('ar');
    const fxDoc: UnifiedDocument = {
      ...doc,
      currency: 'EUR',
      fxRate: 145,
      notesTop: 'Contrat export Q4',
    };
    const arHtml = renderToStaticMarkup(
      <UnifiedInvoicePrintModal isOpen onClose={() => {}} document={fxDoc} />
    );
    expect(arHtml).toContain('dir="rtl"');
    expect(arHtml).toContain('EUR');
    expect(arHtml).toContain('DZD (x145)');
    expect(arHtml).toContain('Contrat export Q4');
    expect(arHtml).toContain('الختم والتوقيع');
  });

  it('CommercialDocPrintModal avoids hardcoded demo fiscal identifiers when business profile is unset', () => {
    const legacyDoc: CommercialDocument = {
      id: 'cd_1',
      tenantId: 'acc_test',
      facilityId: 'br_1',
      type: 'facture',
      docNumber: 'FAC-2026-00010',
      date: '2026-11-26',
      clientId: 'cl_1',
      clientName: 'EURL Horizon',
      depotId: 'dep_1',
      items: [],
      totalHtRaw: 10000,
      generalDiscountPercent: 0,
      totalHtFinal: 10000,
      totalTva: 1900,
      timbreFiscal: 0,
      totalTtc: 11900,
      guaranteeRetentionPercent: 0,
      guaranteeRetentionAmount: 0,
      netToPay: 11900,
      paymentMethod: 'Virement',
      paymentTerms: 'Comptant',
      currency: 'DZD',
      status: 'Validated',
      includeStampSignature: false,
      createdAt: '2026-11-26T10:00:00Z',
      updatedAt: '2026-11-26T10:00:00Z',
    };

    const html = renderToStaticMarkup(
      <CommercialDocPrintModal isOpen onClose={() => {}} document={legacyDoc} />
    );
    expect(html).not.toContain('002116019842189');
    expect(html).not.toContain('16/00-0198421B21');
    expect(html).not.toContain('MAGHREB NÉGOCE');
  });

  it('renders UnifiedPaymentsLedgerPanel with cheque/traite lifecycle transitions', () => {
    setLanguageAction('fr');
    const payments: UnifiedPayment[] = [
      {
        id: 'pay_chq_1',
        accountId: 'acc_test',
        businessId: 'biz_1',
        branchId: 'br_1',
        sourceVertical: 'trading_commercial',
        paymentNumber: 'REG-2026-00005',
        partyName: 'EURL Horizon',
        method: 'cheque',
        direction: 'inflow',
        amountCentimes: 1200000,
        unallocatedCreditCentimes: 1200000,
        currency: 'DZD',
        fxRate: 1,
        paymentDate: '2026-11-26',
        status: 'pending_clearance',
        instrumentNumber: 'CHQ-441122',
        instrumentBank: 'BNA',
        instrumentStatus: 'received',
        allocations: [],
        createdAt: '2026-11-26T10:00:00Z',
        updatedAt: '2026-11-26T10:00:00Z',
      },
    ];

    const html = renderToStaticMarkup(<UnifiedPaymentsLedgerPanel payments={payments} />);
    expect(html).toContain('REG-2026-00005');
    expect(html).toContain('CHQ-441122');
    expect(html).toContain('BNA');
    expect(html).toContain('Remettre');
    expect(html).toContain('Encaisser');
    expect(html).toContain('Impayé');
  });

  it('enables Collect balance and New invoice actions in MemberSlideOverInspector billing tab (3.1 & 3.2)', () => {
    setLanguageAction('fr');
    const member: Member = {
      id: 'mem_1',
      tenantId: 'acc_test',
      facilityId: 'br_1',
      fullName: 'Karim Mansouri',
      email: 'karim@example.dz',
      phoneNumber: '0550112233',
      status: 'Active',
      startDate: '2026-10-01',
      expirationDate: '2026-12-31',
      membershipPlanName: 'Gold Mensuel',
      remainingSessions: 12,
      gender: 'Male',
      balance: 2500,
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    };

    const html = renderToStaticMarkup(
      <MemberSlideOverInspector
        isOpen
        member={member}
        allMembers={[member]}
        initialTab="billing"
        onClose={() => {}}
        onSelectMember={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onCheckIn={() => {}}
        onRenew={() => {}}
        onToggleBlock={() => {}}
        onUpdateNotes={() => {}}
        showToast={() => {}}
      />
    );

    expect(html).toContain('Encaisser le solde');
    expect(html).toContain('Nouvelle');
    const billingPanelHtml = html.slice(html.indexOf('role="tabpanel"'));
    expect(billingPanelHtml).not.toContain('cursor-not-allowed');
    expect(billingPanelHtml).not.toContain('Pas encore disponible');
  });
});
