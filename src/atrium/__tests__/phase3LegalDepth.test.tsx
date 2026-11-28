import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  getGlobalState,
  loginWithPinAction,
  setLanguageAction,
  switchBusinessAction,
  useAtriumStore,
} from '../../services/store';
import {
  DEFAULT_ALGERIAN_HOLIDAY_CALENDAR,
  DEFAULT_LEGAL_DOC_TEMPLATES,
  filterMattersByRole,
  detectLegalConflictOfInterest,
} from '../../utils/legalDepth';
import type {
  CPCADeadline,
  EscrowAccount,
  LegalArbitrationTimeline,
  LegalBailiffAct,
  LegalClientEntity,
  LegalClientLedgerBook,
  LegalDocTemplate,
  LegalFeeInvoice,
  LegalHolidayEntry,
  LegalMatter,
  LegalTimeEntry,
} from '../../types';
import { LegalTimeBillingPanel } from '../../components/screens/legal/LegalTimeBillingPanel';
import { LegalTemplatesAndSignModal } from '../../components/screens/legal/LegalTemplatesAndSignModal';
import { LegalTradeSpecialtyPanel } from '../../components/screens/legal/LegalTradeSpecialtyPanel';
import { LegalMatterModal } from '../../components/screens/legal/LegalMatterModal';
import { LegalDashboardView } from '../../components/screens/legal/LegalDashboardView';
import { LegalMattersView } from '../../components/screens/legal/LegalMattersView';
import { LegalHearingsView } from '../../components/screens/legal/LegalHearingsView';
import { LegalVaultView } from '../../components/screens/legal/LegalVaultView';
import { LegalTrustView } from '../../components/screens/legal/LegalTrustView';

function initLegalWorkspace(
  role: 'avocat_associe' | 'notaire_titulaire' | 'expert_comptable' | 'secretaire_caisse' = 'avocat_associe'
) {
  let store!: ReturnType<typeof useAtriumStore>;
  const Probe: React.FC = () => {
    store = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(<Probe />);
  const legalBiz = store.businesses.find((b) => b.category === 'legal_accounting');
  expect(legalBiz).toBeTruthy();
  if (legalBiz) {
    switchBusinessAction(legalBiz.id);
  }
  store.setActiveLegalRole(role);
  return store;
}

const SAMPLE_MATTER: LegalMatter = {
  id: 'mat_legal_test_1',
  accountId: 'tenant_test_1',
  businessId: 'biz_legal_test',
  branchId: 'branch_legal_test',
  staffId: 'staff_1',
  matterNumber: 'DOS-2026-0713',
  title: 'Litige Commercial SARL Atlas Distribution',
  titleAr: 'نزاع تجاري شركة أطلس',
  category: 'Commercial',
  clientName: 'SARL Atlas Distribution',
  clientPhone: '0550112233',
  adversePartyName: 'EURL Transport Sud',
  courtJurisdiction: "Tribunal de Sidi M'Hamed",
  chamber: 'Chambre Commerciale',
  assignedLawyer: 'Me Benali',
  retainerAmountDzd: 250000,
  trustEscrowBalanceDzd: 100000,
  status: 'Active',
  confidentialityLevel: 'Internal',
  allowedRoles: ['avocat_associe', 'notaire_titulaire'],
  createdAt: '2026-11-20T09:00:00Z',
};

const SECRET_MATTER: LegalMatter = {
  ...SAMPLE_MATTER,
  id: 'mat_secret_99',
  matterNumber: 'DOS-2026-SECRET',
  title: 'Stratégie Pénale Confidentielle',
  confidentialityLevel: 'SecretDefense',
  allowedRoles: ['avocat_associe'],
};

const SAMPLE_CLIENT: LegalClientEntity = {
  id: 'ent_legal_1',
  accountId: 'tenant_test_1',
  businessId: 'biz_legal_test',
  branchId: 'branch_legal_test',
  staffId: 'staff_1',
  clientType: 'personne_morale',
  nameFr: 'SARL Atlas Distribution',
  nameAr: 'شركة أطلس للتوزيع',
  ninOrNif: '001916012345678',
  phone: '0550112233',
  addressFr: '14 Rue Didouche Mourad, Alger',
  addressAr: '14 شارع ديدوش مراد، الجزائر',
  wilaya: 'Alger',
  courtJurisdiction: "Tribunal de Sidi M'Hamed",
  activeMattersCount: 1,
  outstandingBalanceDzd: 150000,
  createdAt: '2026-01-10T09:00:00Z',
};

describe('Phase 3 Step 13 (7.13 legal_accounting) — Deep Vertical Integration', () => {
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
    initLegalWorkspace('avocat_associe');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders LegalTimeBillingPanel with unbilled entries, rate totals, and fee invoices in EN/FR/AR', () => {
    const entries: LegalTimeEntry[] = [
      {
        id: 'lte_1',
        accountId: 'tenant_test_1',
        businessId: 'biz_legal_test',
        branchId: 'branch_legal_test',
        matterId: SAMPLE_MATTER.id,
        matterNumber: SAMPLE_MATTER.matterNumber,
        clientName: SAMPLE_MATTER.clientName,
        staffId: 'staff_1',
        counselName: 'Me Benali',
        activityType: 'redaction',
        description: 'Rédaction conclusions en réplique',
        durationMinutes: 90,
        hourlyRateDzd: 12000,
        tvaRate: 19,
        amountHtCentimes: 1800000,
        isBillable: true,
        isBilled: false,
        entryDate: '2026-11-26',
        createdAt: '2026-11-26T10:00:00Z',
      },
    ];
    const invoices: LegalFeeInvoice[] = [
      {
        id: 'lfi_1',
        accountId: 'tenant_test_1',
        businessId: 'biz_legal_test',
        branchId: 'branch_legal_test',
        staffId: 'staff_1',
        invoiceNumber: 'HNR-2026-00001',
        matterId: SAMPLE_MATTER.id,
        matterNumber: SAMPLE_MATTER.matterNumber,
        clientName: SAMPLE_MATTER.clientName,
        issueDate: '2026-11-27',
        timeEntryIds: ['lte_old'],
        lineItems: [
          {
            entryId: 'lte_old',
            description: 'Consultation initiale',
            durationMinutes: 60,
            hourlyRateDzd: 10000,
            amountHtDzd: 10000,
          },
        ],
        feesHtDzd: 10000,
        disbursementsDzd: 2000,
        tvaRate: 19,
        tvaDzd: 1900,
        timbreDzd: 0,
        totalTtcDzd: 13900,
        totalTtcCentimes: 1390000,
        paidAmountDzd: 0,
        status: 'Sent',
        createdAt: '2026-11-27T10:00:00Z',
      },
    ];

    for (const lang of ['en', 'fr', 'ar'] as const) {
      const html = renderToStaticMarkup(
        <LegalTimeBillingPanel
          language={lang}
          accountId="tenant_test_1"
          businessId="biz_legal_test"
          branchId="branch_legal_test"
          staffId="staff_1"
          staffName="Me Benali"
          matters={[SAMPLE_MATTER]}
          timeEntries={entries}
          feeInvoices={invoices}
          onAddTimeEntry={() => {}}
          onDeleteTimeEntry={() => {}}
          onGenerateFeeInvoice={() => ({ ok: true })}
        />
      );
      expect(html).toContain('data-testid="legal-time-billing-panel"');
      expect(html).toContain('HNR-2026-00001');
      expect(html).toContain('Rédaction conclusions en réplique');
      expect(html).not.toContain('legal_depth_');
    }
  });

  it('renders LegalTemplatesAndSignModal with Algerian templates, interpolation, SVG signature pad, and confidentiality levels', () => {
    const templates: LegalDocTemplate[] = DEFAULT_LEGAL_DOC_TEMPLATES.map((tpl) => ({
      ...tpl,
      accountId: 'tenant_test_1',
      businessId: 'biz_legal_test',
      branchId: 'branch_legal_test',
      createdAt: '2026-11-20T09:00:00Z',
    }));

    const html = renderToStaticMarkup(
      <LegalTemplatesAndSignModal
        isOpen={true}
        onClose={() => {}}
        language="fr"
        accountId="tenant_test_1"
        businessId="biz_legal_test"
        branchId="branch_legal_test"
        staffId="staff_1"
        activeRoleScope="avocat"
        matters={[SAMPLE_MATTER]}
        templates={templates}
        onSealVaultDocument={() => {}}
      />
    );

    expect(html).toContain('data-testid="legal-templates-sign-modal"');
    expect(html).toContain('data-testid="legal-signature-pad"');
    expect(html).toContain(SAMPLE_MATTER.matterNumber);
    expect(html).toContain(SAMPLE_MATTER.clientName);
    expect(html).toContain('Restricted');
    expect(html).toContain('SecretDefense');
    expect(html).toContain('NotarialMinute');
    expect(html).not.toContain('legal_depth_');
  });

  it('renders LegalTradeSpecialtyPanel per legal role (Expert Comptable G50, Notaire CARPA & Holidays, Avocat Bailiff)', () => {
    const escrow: EscrowAccount = {
      id: 'esc_1',
      accountId: 'tenant_test_1',
      businessId: 'biz_legal_test',
      branchId: 'branch_legal_test',
      staffId: 'staff_1',
      matterId: SAMPLE_MATTER.id,
      matterReference: SAMPLE_MATTER.matterNumber,
      clientName: 'SARL Atlas Distribution',
      beneficiaryName: 'Promoteur Hydra',
      bankAccountRef: 'CARPA-ALGER-2026-01',
      bankStatementBalanceDzd: 4000000,
      totalDepositedDzd: 4000000,
      totalDisbursedDzd: 0,
      currentBalanceDzd: 4000000,
      isLocked: true,
      cadastralClearanceProof: {
        volume: 'VOL-2026-44',
        number: 'CF-9910',
        recordedAt: '2026-11-20',
      },
      transactions: [],
    };

    const ledgerBook: LegalClientLedgerBook = {
      id: 'book_1',
      accountId: 'tenant_test_1',
      businessId: 'biz_legal_test',
      branchId: 'branch_legal_test',
      staffId: 'staff_1',
      dossierCode: 'EC-2026-00001',
      clientName: 'EURL Agro Méditerranée',
      clientNif: '002016098765432',
      fiscalRegime: 'Reel',
      fiscalPeriod: '2026-11',
      tvaCollecteeCentimes: 5700000,
      tvaDeductibleCentimes: 1900000,
      creditTvaAnterieurCentimes: 0,
      tvaNetDueCentimes: 3800000,
      tapBaseCentimes: 0,
      irgSalairesCentimes: 850000,
      ibsAcompteCentimes: 0,
      timbreFiscalCentimes: 0,
      totalG50DueCentimes: 4650000,
      trialBalanceJson: [],
      g50Status: 'draft',
      liasseReady: true,
      createdAt: '2026-11-26T08:00:00Z',
    };

    const bailiffAct: LegalBailiffAct = {
      id: 'bail_1',
      accountId: 'tenant_test_1',
      businessId: 'biz_legal_test',
      branchId: 'branch_legal_test',
      staffId: 'staff_1',
      actNumber: 'HUI-2026-0044',
      matterId: SAMPLE_MATTER.id,
      matterNumber: SAMPLE_MATTER.matterNumber,
      bailiffName: 'Me Kaci Huissier',
      actKind: 'signification',
      recipientName: 'EURL Transport Sud',
      serviceMode: 'a_personne',
      serviceDate: '2026-11-25',
      pvSummary: 'Signification remise en mains propres',
      feeCentimes: 650000,
      status: 'served',
      createdAt: '2026-11-25T14:00:00Z',
    };

    const arbitration: LegalArbitrationTimeline = {
      id: 'arb_1',
      accountId: 'tenant_test_1',
      businessId: 'biz_legal_test',
      branchId: 'branch_legal_test',
      staffId: 'staff_1',
      caseCode: 'ARB-2026-00001',
      matterId: SAMPLE_MATTER.id,
      matterNumber: SAMPLE_MATTER.matterNumber,
      arbitrationSeat: 'Alger (CACI)',
      rulesFramework: 'CACI / CNUDCI',
      claimantName: 'SARL Atlas Distribution',
      respondentName: 'EURL Transport Sud',
      amountInDisputeCentimes: 1200000000,
      phase: 'Échange des Mémoires & Pièces',
      status: 'active',
      milestones: [
        {
          id: 'ms_1',
          label: 'Requête d’arbitrage',
          targetDate: '2026-11-15',
          status: 'done',
          completedDate: '2026-11-01',
        },
      ],
      createdAt: '2026-11-01T08:00:00Z',
    };

    const holidays: LegalHolidayEntry[] = DEFAULT_ALGERIAN_HOLIDAY_CALENDAR.map((h, i) => ({
      ...h,
      id: `hol_${i + 1}`,
      accountId: 'tenant_test_1',
      businessId: 'biz_legal_test',
      branchId: 'branch_legal_test',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    }));

    const baseProps = {
      language: 'fr' as const,
      accountId: 'tenant_test_1',
      businessId: 'biz_legal_test',
      branchId: 'branch_legal_test',
      staffId: 'staff_1',
      matters: [SAMPLE_MATTER],
      escrowAccounts: [escrow],
      holidays,
      bailiffActs: [bailiffAct],
      arbitrationTimelines: [arbitration],
      clientLedgers: [ledgerBook],
      onAddClientLedger: () => {},
      onUpdateClientLedger: () => {},
      onAddBailiffAct: () => {},
      onAddCPCADeadline: (_dl: CPCADeadline) => {},
      onAddArbitrationTimeline: () => {},
      onUpdateArbitrationTimeline: () => {},
      onUpdateEscrowAccount: () => {},
      onAddHoliday: () => {},
      onDeleteHoliday: () => {},
      onRecalculateDeadlines: () => 2,
    };

    const expertHtml = renderToStaticMarkup(
      <LegalTradeSpecialtyPanel {...baseProps} activeLegalRole="expert_comptable" />
    );
    expect(expertHtml).toContain('data-testid="legal-trade-specialty-panel"');
    expect(expertHtml).toContain('EURL Agro Méditerranée');

    const notaireHtml = renderToStaticMarkup(
      <LegalTradeSpecialtyPanel {...baseProps} activeLegalRole="notaire_titulaire" />
    );
    expect(notaireHtml).toContain(SAMPLE_MATTER.matterNumber);
    expect(notaireHtml).toContain('SARL Atlas Distribution');
    expect(notaireHtml).toContain('Fête de la Révolution');

    const avocatHtml = renderToStaticMarkup(
      <LegalTradeSpecialtyPanel {...baseProps} activeLegalRole="avocat_associe" />
    );
    expect(avocatHtml).toContain('HUI-2026-0044');
    expect(avocatHtml).not.toContain('legal_depth_');
  });

  it('surfaces live conflict-of-interest warning and confidentiality controls in LegalMatterModal', () => {
    const directConflict = detectLegalConflictOfInterest(
      {
        clientName: 'Nouveau Mandant SPA',
        adversePartyName: 'SARL Atlas Distribution',
      },
      [SAMPLE_MATTER],
      [SAMPLE_CLIENT]
    );
    expect(directConflict.hasConflict).toBe(true);
    expect(directConflict.status).toBe('conflict');

    const html = renderToStaticMarkup(
      <LegalMatterModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        matterToEdit={{
          ...SAMPLE_MATTER,
          id: 'mat_edit_conflict',
          clientName: 'Nouveau Mandant SPA',
          adversePartyName: 'SARL Atlas Distribution',
        }}
        existingMatters={[SAMPLE_MATTER]}
        existingClients={[SAMPLE_CLIENT]}
      />
    );

    expect(html).toContain('data-testid="legal-conflict-warning"');
    expect(html).toContain('Internal (Cabinet)');
    expect(html).toContain('Procédure Arbitrale');
    expect(html).not.toContain('legal_depth_');
  });

  it('filters SecretDefense matters from unauthorized roles via filterMattersByRole and renders all Legal views without untranslated keys', () => {
    const visibleToAvocat = filterMattersByRole([SAMPLE_MATTER, SECRET_MATTER], 'avocat_associe');
    expect(visibleToAvocat.map((m) => m.id)).toContain(SECRET_MATTER.id);

    const visibleToSecretaire = filterMattersByRole([SAMPLE_MATTER, SECRET_MATTER], 'secretaire_caisse');
    expect(visibleToSecretaire.map((m) => m.id)).not.toContain(SECRET_MATTER.id);

    const store = initLegalWorkspace('avocat_associe');
    expect(store.activeLegalRole).toBe('avocat_associe');
    expect(getGlobalState().businesses.some((b) => b.category === 'legal_accounting')).toBe(true);

    for (const lang of ['en', 'fr', 'ar'] as const) {
      setLanguageAction(lang);
      const htmls = [
        renderToStaticMarkup(<LegalDashboardView />),
        renderToStaticMarkup(<LegalMattersView />),
        renderToStaticMarkup(<LegalHearingsView />),
        renderToStaticMarkup(<LegalVaultView />),
        renderToStaticMarkup(<LegalTrustView />),
      ];
      for (const html of htmls) {
        expect(html.length).toBeGreaterThan(200);
        expect(html).not.toContain('legal_depth_');
        expect(html).not.toContain('undefined');
      }
    }
  });
});
