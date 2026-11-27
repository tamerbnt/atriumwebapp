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
  selectCurrentBiKpiDefinitionsFromState,
  selectCurrentBiReportSnapshotsFromState,
  selectCurrentBiSavedReportsFromState,
} from '../../services/store';
import { evaluateBiKpiRegistry } from '../../utils/biKpiRegistry';
import { canAccessRoute } from '../../utils/routePermissions';
import { dzdToCentimes } from '../../utils/money';
import { BiAnalyticsWorkspace } from '../../components/common/bi/BiAnalyticsWorkspace';
import type { RbacPermissionRule, UnifiedDocument } from '../../types/index';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 2 Step 9 (6.10) — Unified BI KPI Registry, Cross-Vertical Reports & RBAC', () => {
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

  it('reconciles canonical KPIs without double-counting bridged sales, computes aging buckets & branch comparison', () => {
    const state = getGlobalState();
    const accountId = state.account.id;
    const businessId = state.currentBusinessId;
    const branchId = state.currentBranchId;
    const now = new Date('2026-11-27T12:00:00.000Z');

    const docs: UnifiedDocument[] = [
      {
        id: 'doc_inv_bridged',
        accountId,
        businessId,
        branchId,
        sourceVertical: 'trading_commercial',
        docType: 'facture',
        draftNumber: 'DRF-100',
        docNumber: 'FAC-2026-0100',
        fiscalYear: 2026,
        status: 'PartiallyPaid',
        partyName: 'Client One',
        docDate: '2026-11-20',
        dueDate: '2026-10-01', // 57 days overdue -> 31_60 bucket
        paymentMethod: 'cash',
        paymentTerms: '30d',
        currency: 'DZD',
        fxRate: 1,
        fxRateDate: '2026-11-20',
        timbreBasis: 'exempt',
        items: [],
        tvaBreakdown: [],
        totalHtRawCentimes: dzdToCentimes(50000),
        generalDiscountPercent: 0,
        totalHtFinalCentimes: dzdToCentimes(50000),
        totalTvaCentimes: 0,
        timbreFiscalCentimes: 0,
        totalTtcCentimes: dzdToCentimes(50000),
        guaranteeRetentionPercent: 0,
        guaranteeRetentionCentimes: 0,
        netToPayCentimes: dzdToCentimes(50000),
        paidCentimes: dzdToCentimes(20000),
        balanceDueCentimes: dzdToCentimes(30000),
        fiscalHeaderSnapshot: { companyName: 'Atrium' },
        totalsInWordsFr: '',
        totalsInWordsAr: '',
        includeStampSignature: false,
        sourceEntityType: 'sale',
        sourceEntityId: 'sale_already_bridged',
        printedCount: 0,
        version: 1,
        createdAt: '2026-11-20T10:00:00.000Z',
        updatedAt: '2026-11-20T10:00:00.000Z',
      },
      {
        id: 'doc_inv_old',
        accountId,
        businessId,
        branchId,
        sourceVertical: 'trading_commercial',
        docType: 'facture',
        draftNumber: 'DRF-009',
        docNumber: 'FAC-2026-0009',
        fiscalYear: 2026,
        status: 'Issued',
        partyName: 'Client Two',
        docDate: '2026-11-18',
        dueDate: '2026-08-10', // >90 days overdue -> 90_plus bucket
        paymentMethod: 'bank_transfer',
        paymentTerms: '30d',
        currency: 'DZD',
        fxRate: 1,
        fxRateDate: '2026-11-18',
        timbreBasis: 'exempt',
        items: [],
        tvaBreakdown: [],
        totalHtRawCentimes: dzdToCentimes(10000),
        generalDiscountPercent: 0,
        totalHtFinalCentimes: dzdToCentimes(10000),
        totalTvaCentimes: 0,
        timbreFiscalCentimes: 0,
        totalTtcCentimes: dzdToCentimes(10000),
        guaranteeRetentionPercent: 0,
        guaranteeRetentionCentimes: 0,
        netToPayCentimes: dzdToCentimes(10000),
        paidCentimes: 0,
        balanceDueCentimes: dzdToCentimes(10000),
        fiscalHeaderSnapshot: { companyName: 'Atrium' },
        totalsInWordsFr: '',
        totalsInWordsAr: '',
        includeStampSignature: false,
        printedCount: 0,
        version: 1,
        createdAt: '2026-11-18T10:00:00.000Z',
        updatedAt: '2026-11-18T10:00:00.000Z',
      },
    ];

    const res = evaluateBiKpiRegistry({
      accountId,
      businessId,
      branches: state.branches,
      unifiedDocuments: docs,
      unifiedPayments: [],
      sales: [
        {
          id: 'sale_already_bridged',
          businessId,
          branchId,
          facilityId: branchId,
          totalAmount: 50000,
          paymentMethod: 'Cash',
          status: 'Completed',
          items: [],
          createdAt: '2026-11-20T10:00:00.000Z',
          updatedAt: '2026-11-20T10:00:00.000Z',
        } as any,
        {
          id: 'sale_unbridged',
          businessId,
          branchId,
          facilityId: branchId,
          totalAmount: 5000,
          paymentMethod: 'Cash',
          status: 'Completed',
          items: [],
          createdAt: '2026-11-21T10:00:00.000Z',
          updatedAt: '2026-11-21T10:00:00.000Z',
        } as any,
      ],
      products: [],
      wmsStockLots: [],
      payrollRuns: [],
      purchaseDocs: [],
      pmExpenses: [],
      freelanceExpenses: [],
      scfJournalEntries: [],
      preset: '30d',
      anchorDate: now,
    });

    // 50,000 + 10,000 from docs + 5,000 unbridged = 65,000 DZD (6,500,000 centimes)
    expect(res.metricsByCode.gross_invoiced_revenue).toBe(dzdToCentimes(65000));
    expect(res.metricsByCode.receivables_outstanding).toBe(dzdToCentimes(40000));

    const b31_60 = res.agingBuckets.find((b) => b.bucket === '31_60');
    const b90Plus = res.agingBuckets.find((b) => b.bucket === '90_plus');
    expect(b31_60?.amountCentimes).toBe(dzdToCentimes(30000));
    expect(b90Plus?.amountCentimes).toBe(dzdToCentimes(10000));
    expect(res.branchComparison.length).toBeGreaterThanOrEqual(1);
  });

  it('validates scheduled report emails, updates KPI targets, generates snapshots, and soft-deletes saved reports', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const updatedDef = actions.upsertBiKpiDefinition({
      kpiCode: 'collection_efficiency_pct',
      targetValue: 92,
    });
    expect(updatedDef.targetValue).toBe(92);
    expect(
      selectCurrentBiKpiDefinitionsFromState(getGlobalState()).find(
        (d) => d.kpiCode === 'collection_efficiency_pct'
      )?.targetValue
    ).toBe(92);

    const invalidEmailRes = actions.saveBiReportConfig({
      title: 'Weekly Executive Pack',
      reportType: 'executive_overview',
      kpiCodes: ['gross_invoiced_revenue'],
      dateRangePreset: '30d',
      scheduleCron: '0 8 * * 1',
      scheduleRecipientsRaw: 'bad-email, cfo@atrium.dz',
    });
    expect(invalidEmailRes.ok).toBe(false);
    if (!invalidEmailRes.ok) {
      expect(invalidEmailRes.errorCode).toBe('INVALID_RECIPIENT_EMAIL');
    }

    const savedRes = actions.saveBiReportConfig({
      title: 'Weekly Executive Pack',
      reportType: 'executive_overview',
      kpiCodes: ['gross_invoiced_revenue', 'receivables_outstanding'],
      dateRangePreset: '30d',
      scheduleCron: '0 8 * * 1',
      scheduleRecipientsRaw: 'ceo@atrium.dz, finance@atrium.dz',
    });
    expect(savedRes.ok).toBe(true);
    if (!savedRes.ok) return;

    const snap = actions.generateBiReportSnapshot({
      reportId: savedRes.report.id,
      preset: '30d',
    });
    expect(snap.reportId).toBe(savedRes.report.id);
    expect(
      selectCurrentBiReportSnapshotsFromState(getGlobalState()).some((s) => s.id === snap.id)
    ).toBe(true);

    const refreshedReport = selectCurrentBiSavedReportsFromState(getGlobalState()).find(
      (r) => r.id === savedRes.report.id
    );
    expect(Boolean(refreshedReport?.lastDispatchedAt)).toBe(true);

    expect(actions.deleteBiSavedReport(savedRes.report.id)).toBe(true);
    expect(
      selectCurrentBiSavedReportsFromState(getGlobalState()).some(
        (r) => r.id === savedRes.report.id
      )
    ).toBe(false);
  });

  it('enforces executive and RBAC-granted access to bi_reports across verticals', () => {
    const ownerUser = { id: 'usr_owner', role: 'owner' as const, roleRank: 10 };
    const staffUser = { id: 'usr_staff', role: 'staff' as const, roleRank: 1 };

    // Owners / executives allowed across all verticals
    for (const cat of [
      'membership_session',
      'pos_inventory',
      'trading_commercial',
      'project_milestone',
      'medical_clinic',
      'legal_accounting',
    ]) {
      expect(
        canAccessRoute(
          cat,
          { currentUser: ownerUser as any, activePmRole: 'direction' },
          'bi_reports'
        )
      ).toBe(true);
    }

    // Non-executive staff blocked by default
    expect(
      canAccessRoute(
        'pos_inventory',
        { currentUser: staffUser as any, activePosRole: 'staff' },
        'bi_reports'
      )
    ).toBe(false);

    // Explicit analytics:view grant unlocks bi_reports for that staff role
    const matrix: RbacPermissionRule[] = [
      {
        id: 'rbac_bi_staff',
        accountId: 'acc_test',
        businessId: 'biz_test',
        category: 'pos_inventory',
        roleKey: 'staff',
        resource: 'analytics',
        action: 'view',
        allowed: true,
        version: 1,
        createdAt: '2026-11-27T00:00:00Z',
        updatedAt: '2026-11-27T00:00:00Z',
      },
    ];
    expect(
      canAccessRoute(
        'pos_inventory',
        {
          currentUser: staffUser as any,
          businessId: 'biz_test',
          activePosRole: 'staff',
          rbacMatrix: matrix,
        },
        'bi_reports'
      )
    ).toBe(true);
  });

  it('renders BiAnalyticsWorkspace across EN, FR, and AR locales cleanly', () => {
    setLanguageAction('en');
    const htmlEn = renderToStaticMarkup(<BiAnalyticsWorkspace />);
    expect(htmlEn).toContain('Unified BI KPI Registry');
    expect(htmlEn).not.toContain('phase2_bi_');

    setLanguageAction('fr');
    const htmlFr = renderToStaticMarkup(<BiAnalyticsWorkspace />);
    expect(htmlFr).toContain('Registre KPI BI');
    expect(htmlFr).not.toContain('phase2_bi_');

    setLanguageAction('ar');
    const htmlAr = renderToStaticMarkup(<BiAnalyticsWorkspace />);
    expect(htmlAr).toContain('سجل مؤشرات الأداء');
    expect(htmlAr).not.toContain('phase2_bi_');
  });
});
