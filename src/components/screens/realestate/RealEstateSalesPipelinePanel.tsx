import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react';
import type {
  RealEstateAgentCommission,
  RealEstateMandate,
  RealEstateProperty,
  RealEstateSaleClosingChecklist,
  RealEstateSaleDeal,
  RealEstateSaleStage,
  StaffMember,
} from '../../../types/index';
import {
  SALE_STAGE_ORDER,
  buildRealEstateScfJournalDraft,
  computeAgentCommissionSplit,
  evaluateSaleClosingChecklist,
  formatRealEstateSequentialCode,
} from '../../../utils/realEstateDepth';
import { calculateMandateCommission } from '../../../utils/realEstateRules';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import {
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
  selectCurrentBusinessFromState,
  selectCurrentStaffFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { EmptyState } from '../../../atrium/components/EmptyState';

export interface RealEstateSalesPipelinePanelProps {
  saleDeals: RealEstateSaleDeal[];
  properties: RealEstateProperty[];
  mandates: RealEstateMandate[];
  onAddSaleDeal: (deal: RealEstateSaleDeal) => void;
  onUpdateSaleDeal: (deal: RealEstateSaleDeal) => void;
  onAdvanceStage: (
    dealId: string,
    nextStage: RealEstateSaleStage
  ) => { ok: boolean; errorCode?: string; updatedDeal?: RealEstateSaleDeal };
}

const DEFAULT_CHECKLIST: RealEstateSaleClosingChecklist = {
  livretFoncierVerified: false,
  certificatNegatifValid: false,
  quitusFiscalCleared: false,
  mainleveeBankCleared: false,
  notaryActSigned: false,
};

export const RealEstateSalesPipelinePanel: React.FC<RealEstateSalesPipelinePanelProps> = ({
  saleDeals,
  properties,
  mandates,
  onAddSaleDeal,
  onUpdateSaleDeal,
  onAdvanceStage,
}) => {
  const { account, currentBusiness, currentBranch, currentUser, language, businessConfig, staffList } = useAtriumSelector(
    (s) => ({
      account: s.account,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
      language: s.language,
      businessConfig: selectCurrentBusinessConfigFromState(s),
      staffList: selectCurrentStaffFromState(s),
    }),
    shallowEqualObjects
  );
  const { ensurePartyForEntity, createUnifiedDocument, postManualJournalEntry, recordRealEstateAgentCommission } =
    useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const tvaRate = businessConfig.defaultTvaRate ?? 19;
  const [stageFilter, setStageFilter] = useState<'All' | RealEstateSaleStage>('All');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [propertyId, setPropertyId] = useState(() => properties[0]?.id || '');
  const [mandateId, setMandateId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [notaryName, setNotaryName] = useState('');
  const [salePriceDzd, setSalePriceDzd] = useState(() => String(properties[0]?.priceDzd || 25000000));
  const [depositPaidDzd, setDepositPaidDzd] = useState('2500000');
  const [primaryAgentStaffId, setPrimaryAgentStaffId] = useState(() => staffList[0]?.id || currentUser?.id || '');
  const [secondaryAgentStaffId, setSecondaryAgentStaffId] = useState('');
  const [primarySplitPct, setPrimarySplitPct] = useState('70');

  const stageLabel = (stage: RealEstateSaleStage): string => {
    switch (stage) {
      case 'Offer':
        return L('Offer', 'Offre', 'عرض شراء');
      case 'Promesse':
        return L('Promise', 'Promesse', 'وعد بالبيع');
      case 'Notaire':
        return L('Notary', 'Notaire', 'الموثق');
      case 'Enregistrement':
        return L('Registration', 'Enregistrement', 'التسجيل');
      case 'Acte':
        return L('Deed Signed', 'Acte', 'العقد الرسمي');
      case 'Finalisé':
        return L('Finalized', 'Finalisé', 'مكتمل');
    }
  };

  const filteredDeals = useMemo(
    () => (stageFilter === 'All' ? saleDeals : saleDeals.filter((d) => d.stage === stageFilter)),
    [saleDeals, stageFilter]
  );

  const totalVolumeDzd = useMemo(
    () => saleDeals.reduce((sum, d) => sum + Number(d.salePriceDzd || 0), 0),
    [saleDeals]
  );
  const totalFeeTtcDzd = useMemo(
    () => saleDeals.reduce((sum, d) => sum + Number(d.commissionTtcDzd || 0), 0),
    [saleDeals]
  );

  const previewPrice = Math.max(0, Number(salePriceDzd) || 0);
  const previewComm = useMemo(
    () => calculateMandateCommission(previewPrice, 'DecreeTranches', 0, 0, tvaRate),
    [previewPrice, tvaRate]
  );
  const hasSecondary = Boolean(secondaryAgentStaffId && secondaryAgentStaffId !== primaryAgentStaffId);
  const primaryBps = Math.max(0, Math.min(10000, Math.round((parseFloat(primarySplitPct) || 0) * 100)));
  const previewSplit = useMemo(
    () =>
      computeAgentCommissionSplit({
        grossCommissionDzd: previewComm.totalTtc,
        primarySplitBps: hasSecondary ? primaryBps : 10000,
        secondarySplitBps: hasSecondary ? 10000 - primaryBps : 0,
        hasSecondaryAgent: hasSecondary,
      }),
    [previewComm.totalTtc, hasSecondary, primaryBps]
  );

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === propertyId) || properties[0];
    if (!prop || !buyerName.trim()) {
      showToast(L('Select property and enter buyer name.', 'Sélectionnez le bien et le nom de l’acquéreur.', 'اختر العقار واسم المشتري.'), 'warning');
      return;
    }
    if (previewPrice <= 0) {
      showToast(L('Enter a valid sale price.', 'Saisissez un prix de vente valide.', 'أدخل سعر بيع صالح.'), 'warning');
      return;
    }
    if (!previewSplit.valid) {
      showToast(L('Agent commission splits must equal 100%.', 'Le partage des honoraires doit totaliser 100%.', 'يجب أن يساوي تقسيم العمولة 100%.'), 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const linkedMandate = mandates.find((m) => m.id === mandateId) || mandates.find((m) => m.propertyId === prop.id);
    const primaryAgent = staffList.find((s: StaffMember) => s.id === primaryAgentStaffId);
    const secondaryAgent = hasSecondary ? staffList.find((s: StaffMember) => s.id === secondaryAgentStaffId) : undefined;
    const dealNumber = formatRealEstateSequentialCode(
      'DEAL',
      saleDeals.map((d) => d.dealNumber)
    );

    const deal: RealEstateSaleDeal = {
      id: `deal_${Date.now()}`,
      accountId: prop.accountId || currentBranch?.accountId || account.id || '',
      businessId: currentBusiness?.id || prop.businessId || '',
      branchId: currentBranch?.id || prop.branchId || '',
      staffId: currentUser?.id || '',
      dealNumber,
      propertyId: prop.id,
      propertyTitle: prop.title,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim() || undefined,
      sellerName: prop.ownerName,
      sellerPhone: prop.ownerPhone,
      mandateId: linkedMandate?.id,
      mandateNumber: linkedMandate?.mandateNumber,
      primaryAgentStaffId: primaryAgent?.id || primaryAgentStaffId || undefined,
      primaryAgentName: primaryAgent?.fullName,
      secondaryAgentStaffId: secondaryAgent?.id,
      secondaryAgentName: secondaryAgent?.fullName,
      primarySplitBps: previewSplit.primarySplitBps,
      secondarySplitBps: previewSplit.secondarySplitBps,
      salePriceDzd: previewPrice,
      commissionHtDzd: previewComm.baseHt,
      commissionTvaDzd: previewComm.tva,
      commissionTtcDzd: previewComm.totalTtc,
      depositPaidDzd: Math.max(0, Number(depositPaidDzd) || 0),
      notaryName: notaryName.trim() || undefined,
      stage: 'Offer',
      closingChecklist: { ...DEFAULT_CHECKLIST },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onAddSaleDeal(deal);
    setBuyerName('');
    setBuyerPhone('');
    setNotaryName('');
    setIsNewModalOpen(false);
    showToast(
      L(`Sale transaction ${dealNumber} created.`, `Dossier vente ${dealNumber} créé.`, `تم إنشاء ملف البيع ${dealNumber}.`),
      'success'
    );
  };

  const handleToggleChecklist = (deal: RealEstateSaleDeal, field: keyof RealEstateSaleClosingChecklist, checked: boolean) => {
    onUpdateSaleDeal({
      ...deal,
      closingChecklist: {
        ...deal.closingChecklist,
        [field]: checked,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAdvanceDeal = (deal: RealEstateSaleDeal) => {
    const idx = SALE_STAGE_ORDER.indexOf(deal.stage);
    if (idx < 0 || idx >= SALE_STAGE_ORDER.length - 1) return;
    const nextStage = SALE_STAGE_ORDER[idx + 1];
    const res = onAdvanceStage(deal.id, nextStage);
    if (!res.ok) {
      if (res.errorCode === 'RE_SALE_CLOSING_CHECKLIST_INCOMPLETE') {
        showToast(
          L(
            'Complete all 5 legal closing checks before finalizing the sale.',
            'Validez les 5 contrôles juridiques (Livret, Certificat négatif, Quitus, Mainlevée, Acte) avant de finaliser.',
            'أكمل جميع الضوابط القانونية الخمسة قبل إتمام البيع.'
          ),
          'warning'
        );
      }
      return;
    }

    const updated = res.updatedDeal!;
    if (nextStage === 'Finalisé') {
      const todayIso = new Date().toISOString().slice(0, 10);
      try {
        const buyerParty = ensurePartyForEntity({
          businessId: updated.businessId,
          branchId: updated.branchId,
          sourceVertical: 'real_estate',
          entityType: 'lead',
          entityId: updated.id,
          displayName: updated.buyerName,
          phone: updated.buyerPhone,
        });

        const doc = createUnifiedDocument({
          docType: 'facture',
          sourceVertical: 'real_estate',
          partyId: buyerParty.party.id,
          partyName: updated.buyerName,
          partyPhone: updated.buyerPhone,
          docDate: todayIso,
          paymentMethod: 'bank_transfer',
          sourceEntityType: 're_sale_deal',
          sourceEntityId: updated.id,
          items: [
            {
              description: `Honoraires transaction immobilière Décret 09-18 · ${updated.dealNumber} (${updated.propertyTitle})`,
              isService: true,
              quantity: 1,
              unit: 'dossier',
              unitPriceHt: updated.commissionHtDzd,
              tvaPercent: tvaRate,
            },
          ],
          issueImmediately: true,
        });

        const scfDraft = buildRealEstateScfJournalDraft({
          reference: updated.dealNumber,
          label: updated.propertyTitle,
          grossCollectedDzd: updated.commissionTtcDzd,
          agencyFeeHtDzd: updated.commissionHtDzd,
          agencyFeeTvaDzd: updated.commissionTvaDzd,
          paymentMethod: 'Virement',
        });

        let journalEntryId = updated.journalEntryId;
        if (scfDraft.balanced) {
          const entry = postManualJournalEntry({
            journalCode: scfDraft.journalCode,
            entryDate: todayIso,
            pieceRef: updated.dealNumber,
            libelle: `Honoraires vente ${updated.dealNumber} · ${updated.propertyTitle}`,
            lines: scfDraft.lines.map((l) => ({
              accountCode: l.accountCode,
              accountLabel: l.accountLabel,
              debitCentimes: l.debitCentimes,
              creditCentimes: l.creditCentimes,
              partyId: buyerParty.party.id,
              partyName: updated.buyerName,
            })),
            sourceVertical: 'real_estate',
            sourceEventType: 'sale_invoice',
            sourceDocId: doc.id,
            idempotencyKey: `re_sale_scf_${updated.id}`,
            silentSuccessToast: true,
          });
          if (entry && typeof entry === 'object' && 'id' in entry) {
            journalEntryId = (entry as { id: string }).id;
          }
        }

        onUpdateSaleDeal({
          ...updated,
          unifiedDocumentId: doc.id,
          journalEntryId,
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        if (err?.message === 'PERIOD_CLOSED_LOCKED') {
          showToast(
            L('Accounting period is locked; sale saved without journal posting.', 'Période comptable clôturée : vente enregistrée sans écriture.', 'الفترة المحاسبية مغلقة.'),
            'warning'
          );
        }
      }

      const split = computeAgentCommissionSplit({
        grossCommissionDzd: updated.commissionHtDzd,
        primarySplitBps: updated.primarySplitBps || 10000,
        secondarySplitBps: updated.secondarySplitBps || 0,
        hasSecondaryAgent: Boolean(updated.secondaryAgentStaffId),
      });
      if (split.valid) {
        const nowIso = new Date().toISOString();
        const periodMonth = nowIso.slice(0, 7);
        const primaryStaff = staffList.find((s) => s.id === updated.primaryAgentStaffId);
        if (updated.primaryAgentStaffId || primaryStaff) {
          const rec1: RealEstateAgentCommission = {
            id: `recomm_${updated.id}_p`,
            accountId: updated.accountId,
            businessId: updated.businessId,
            branchId: updated.branchId,
            agentStaffId: updated.primaryAgentStaffId || primaryStaff!.id,
            agentName: updated.primaryAgentName || primaryStaff?.fullName || currentUser?.fullName || 'Négociateur Principal',
            roleType: 'primary',
            sourceType: 'SaleDeal',
            sourceId: updated.id,
            referenceNumber: updated.dealNumber,
            periodMonth,
            grossCommissionCentimes: dzdToCentimes(updated.commissionHtDzd),
            splitBps: split.primarySplitBps,
            agentShareCentimes: split.primaryShareCentimes,
            agentShareDzd: centimesToDzd(split.primaryShareCentimes),
            status: 'pending',
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          recordRealEstateAgentCommission(rec1);
        }
        if (updated.secondaryAgentStaffId && split.secondaryShareCentimes > 0) {
          const secStaff = staffList.find((s) => s.id === updated.secondaryAgentStaffId);
          const rec2: RealEstateAgentCommission = {
            id: `recomm_${updated.id}_s`,
            accountId: updated.accountId,
            businessId: updated.businessId,
            branchId: updated.branchId,
            agentStaffId: updated.secondaryAgentStaffId,
            agentName: updated.secondaryAgentName || secStaff?.fullName || 'Co-Négociateur',
            roleType: 'secondary',
            sourceType: 'SaleDeal',
            sourceId: updated.id,
            referenceNumber: updated.dealNumber,
            periodMonth,
            grossCommissionCentimes: dzdToCentimes(updated.commissionHtDzd),
            splitBps: split.secondarySplitBps,
            agentShareCentimes: split.secondaryShareCentimes,
            agentShareDzd: centimesToDzd(split.secondaryShareCentimes),
            status: 'pending',
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          recordRealEstateAgentCommission(rec2);
        }
      }
    }

    showToast(
      L(
        `${deal.dealNumber} moved to ${stageLabel(nextStage)}.`,
        `${deal.dealNumber} passé à l’étape ${stageLabel(nextStage)}.`,
        `تم نقل ${deal.dealNumber} إلى ${stageLabel(nextStage)}.`
      ),
      'success'
    );
  };

  const checklistLabels: Array<{ key: keyof RealEstateSaleClosingChecklist; label: string }> = [
    { key: 'livretFoncierVerified', label: L('Livret Foncier verified', 'Livret Foncier vérifié', 'التحقق من الدفتر العقاري') },
    { key: 'certificatNegatifValid', label: L('Negative certificate valid', 'Certificat négatif valide', 'الشهادة السلبية سارية') },
    { key: 'quitusFiscalCleared', label: L('Tax clearance (Quitus)', 'Quitus fiscal apuré', 'براءة الذمة الجبائية') },
    { key: 'mainleveeBankCleared', label: L('Bank release (Mainlevée)', 'Mainlevée bancaire levée', 'رفع اليد البنكي') },
    { key: 'notaryActSigned', label: L('Notary deed signed', 'Acte notarié signé', 'توقيع العقد التوثيقي') },
  ];

  return (
    <ScreenPod>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
              <Briefcase size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <span>{L('Sales Closing Pipeline (Notary 6 Stages)', 'Pipeline Ventes & Étapes Notariales', 'مسار صفقات البيع والتوثيق')}</span>
            </h2>
            <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
              {L(
                'Tracks Algerian sales from Offer to Finalized deed with mandatory 5-point legal closing checklist and Décret 09-18 agent split.',
                'Suivi des ventes de l’Offre à l’Acte Finalisé avec contrôle des 5 pièces obligatoires et partage Décret 09-18.',
                'متابعة المبيعات من العرض إلى العقد النهائي مع ضوابط الإغلاق الخمسة وتقسيم العمولات.'
              )}
            </p>
          </div>
          <AtriumButton variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setIsNewModalOpen(true)}>
            {L('New Sale Deal', 'Nouveau Dossier Vente', 'صفقة بيع جديدة')}
          </AtriumButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Active Sale Deals', 'Dossiers en Cours', 'ملفات البيع')}</span>
            <span className="t-card font-semibold text-black dark:text-white">{saleDeals.length}</span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Pipeline Volume', 'Volume Transactions', 'حجم المبيعات')}</span>
            <span className="t-card font-semibold text-black dark:text-white">{formatMoney(totalVolumeDzd, language)}</span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Projected Fees TTC', 'Honoraires TTC Projetés', 'الأتعاب المتوقعة')}</span>
            <span className="t-card font-semibold text-emerald-700 dark:text-emerald-400">{formatMoney(totalFeeTtcDzd, language)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStageFilter('All')}
            data-sq="ctl-sm"
            data-sq-border="solid"
            className={`px-3 py-1.5 t-small font-semibold cursor-pointer transition-colors ${
              stageFilter === 'All'
                ? 'bg-[#BF431F] text-white [--sq-stroke:#BF431F]'
                : 'bg-[#FAF7F4] dark:bg-[#22201E] text-black/75 dark:text-white/75 [--sq-stroke:var(--sq-stroke-card)]'
            }`}
          >
            {L('All', 'Tous', 'الكل')} ({saleDeals.length})
          </button>
          {SALE_STAGE_ORDER.map((stg) => {
            const count = saleDeals.filter((d) => d.stage === stg).length;
            return (
              <button
                key={stg}
                type="button"
                onClick={() => setStageFilter(stg)}
                data-sq="ctl-sm"
                data-sq-border="solid"
                className={`px-3 py-1.5 t-small font-semibold cursor-pointer transition-colors ${
                  stageFilter === stg
                    ? 'bg-[#BF431F] text-white [--sq-stroke:#BF431F]'
                    : 'bg-[#FAF7F4] dark:bg-[#22201E] text-black/75 dark:text-white/75 [--sq-stroke:var(--sq-stroke-card)]'
                }`}
              >
                {stageLabel(stg)} ({count})
              </button>
            );
          })}
        </div>

        {filteredDeals.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={<Briefcase />}
            title={L('No sale deals in this stage', 'Aucun dossier de vente', 'لا توجد صفقات بيع')}
            description={L('Create a transaction dossier to track notary progression and fees.', 'Créez un dossier transaction pour suivre les étapes notariales.', 'أنشئ ملف بيع لمتابعة التوثيق والأتعاب.')}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDeals.map((deal) => {
              const chk = evaluateSaleClosingChecklist(deal.closingChecklist);
              const split = computeAgentCommissionSplit({
                grossCommissionDzd: deal.commissionTtcDzd,
                primarySplitBps: deal.primarySplitBps || 10000,
                secondarySplitBps: deal.secondarySplitBps || 0,
                hasSecondaryAgent: Boolean(deal.secondaryAgentStaffId),
              });
              const stageIdx = SALE_STAGE_ORDER.indexOf(deal.stage);
              const nextStage = stageIdx >= 0 && stageIdx < SALE_STAGE_ORDER.length - 1 ? SALE_STAGE_ORDER[stageIdx + 1] : null;
              const blockedNext = nextStage === 'Finalisé' && !chk.allCleared;

              return (
                <div
                  key={deal.id}
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="t-small font-semibold text-[#BF431F] dark:text-[#FF8F63] tabular-nums">
                          {deal.dealNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full t-small font-semibold bg-black/5 dark:bg-white/10 text-black dark:text-white">
                          {stageLabel(deal.stage)}
                        </span>
                      </div>
                      <h3 className="t-label font-semibold text-black dark:text-white truncate mt-1">
                        {deal.propertyTitle}
                      </h3>
                      <p className="t-cap text-black/60 dark:text-white/60 truncate">
                        {L('Buyer', 'Acquéreur', 'المشتري')}: {deal.buyerName} · {L('Seller', 'Vendeur', 'البائع')}: {deal.sellerName}
                      </p>
                      {deal.notaryName && (
                        <p className="t-cap text-black/55 dark:text-white/55 truncate">
                          {L('Notary', 'Notaire', 'الموثق')}: {deal.notaryName}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="t-label font-semibold text-black dark:text-white">
                        {formatMoney(deal.salePriceDzd, language)}
                      </div>
                      <div className="t-cap text-emerald-700 dark:text-emerald-400 font-semibold">
                        Hon TTC: {formatMoney(deal.commissionTtcDzd, language)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-1">
                    {SALE_STAGE_ORDER.map((s, i) => (
                      <div
                        key={s}
                        className={`h-1.5 rounded-full ${
                          i <= stageIdx ? 'bg-[#BF431F] dark:bg-[#FF8F63]' : 'bg-black/10 dark:bg-white/10'
                        }`}
                        title={stageLabel(s)}
                      />
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-[#191716] border border-[var(--atr-divider)] space-y-2">
                    <div className="flex items-center justify-between t-cap">
                      <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                        <ClipboardCheck size={14} className="text-[#BF431F] dark:text-[#FF8F63]" />
                        {L('Notarial Closing Checklist', 'Contrôle Pièces Notariales', 'قائمة ضوابط التوثيق')}
                      </span>
                      <span className={`font-semibold tabular-nums ${chk.allCleared ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {chk.completedCount}/{chk.totalCount}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 t-cap">
                      {checklistLabels.map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 text-black/80 dark:text-white/80 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(deal.closingChecklist[item.key])}
                            disabled={deal.stage === 'Finalisé'}
                            onChange={(ev) => handleToggleChecklist(deal, item.key, ev.target.checked)}
                            className="accent-[#BF431F] rounded"
                          />
                          <span className="truncate">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 t-cap tabular-nums">
                    <div className="text-black/65 dark:text-white/65">
                      {deal.secondaryAgentStaffId
                        ? `${L('Split', 'Partage', 'تقسيم')}: ${(deal.primarySplitBps / 100).toFixed(0)}% (${formatMoney(split.primaryShareDzd, language)}) / ${(deal.secondarySplitBps / 100).toFixed(0)}% (${formatMoney(split.secondaryShareDzd, language)})`
                        : `${L('Agent Share', 'Part Agent', 'حصة الوكيل')}: 100% (${formatMoney(split.primaryShareDzd, language)})`}
                    </div>
                    {nextStage ? (
                      <AtriumButton
                        variant={blockedNext ? 'outline' : 'primary'}
                        size="sm"
                        icon={blockedNext ? <ShieldAlert size={14} /> : <ChevronRight size={14} />}
                        onClick={() => handleAdvanceDeal(deal)}
                      >
                        {L(`Advance -> ${stageLabel(nextStage)}`, `Passer -> ${stageLabel(nextStage)}`, `ترقية -> ${stageLabel(nextStage)}`)}
                      </AtriumButton>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <FileCheck2 size={14} />
                        {L('Finalized & Posted', 'Finalisé & Comptabilisé', 'مكتمل ومرحل')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <KineticModalShell isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} maxWidthClass="max-w-lg" zIndexClass="z-50" scrimClassName="bg-black/60">
        <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h2 className="t-card font-semibold text-black dark:text-white">{L('New Sale Transaction', 'Nouveau Dossier de Vente', 'صفقة بيع عقارية جديدة')}</h2>
            <button type="button" onClick={() => setIsNewModalOpen(false)} className="p-1 text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreateDeal} className="space-y-3 t-cap">
            <LabelSelect
              label={L('Property *', 'Bien Immobilier *', 'العقار *')}
              value={propertyId}
              onChange={(pid) => {
                setPropertyId(pid);
                const p = properties.find((item) => item.id === pid);
                if (p) setSalePriceDzd(String(p.priceDzd));
              }}
              options={properties.map((p) => ({ value: p.id, label: `${p.title} (${formatMoney(p.priceDzd, language)})` }))}
            />
            <LabelSelect
              label={L('Mandate (optional)', 'Mandat lié (optionnel)', 'الوكالة المرتبطة')}
              value={mandateId}
              onChange={setMandateId}
              options={[
                { value: '', label: L('-- Auto-match property mandate --', '-- Associer automatiquement --', '-- ربط تلقائي --') },
                ...mandates.map((m) => ({ value: m.id, label: `${m.mandateNumber} · ${m.ownerFullName}` })),
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput label={L('Buyer Full Name *', 'Acquéreur *', 'اسم المشتري *')} value={buyerName} onChange={setBuyerName} required />
              <LabelInput label={L('Buyer Phone', 'Téléphone Acquéreur', 'هاتف المشتري')} value={buyerPhone} onChange={setBuyerPhone} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelInput type="number" label={L('Sale Price (DZD) *', 'Prix de Vente (DA) *', 'سعر البيع (دج) *')} value={salePriceDzd} onChange={setSalePriceDzd} required />
              <LabelInput type="number" label={L('Deposit Paid (DZD)', 'Acompte / Séquestre (DA)', 'العربون المدفوع (دج)')} value={depositPaidDzd} onChange={setDepositPaidDzd} />
            </div>
            <LabelInput label={L('Notary Study', 'Étude Notariale', 'مكتب التوثيق')} value={notaryName} onChange={setNotaryName} placeholder="Maître ..." />
            <div className="grid grid-cols-2 gap-3">
              <LabelSelect
                label={L('Primary Negotiator', 'Négociateur Principal', 'الوكيل الرئيسي')}
                value={primaryAgentStaffId}
                onChange={setPrimaryAgentStaffId}
                options={[
                  { value: '', label: L('-- Select agent --', '-- Sélectionner --', '-- اختر --') },
                  ...staffList.map((s) => ({ value: s.id, label: s.fullName })),
                ]}
              />
              <LabelSelect
                label={L('Co-Broker (optional)', 'Co-Négociateur (optionnel)', 'شريك العمولة (اختياري)')}
                value={secondaryAgentStaffId}
                onChange={setSecondaryAgentStaffId}
                options={[
                  { value: '', label: L('-- Single agent (100%) --', '-- Seul (100%) --', '-- وكيل واحد (100%) --') },
                  ...staffList.filter((s) => s.id !== primaryAgentStaffId).map((s) => ({ value: s.id, label: s.fullName })),
                ]}
              />
            </div>
            {hasSecondary && (
              <LabelInput
                type="number"
                label={L('Primary Agent Split (%)', 'Part Négociateur Principal (%)', 'نسبة الوكيل الرئيسي (%)')}
                value={primarySplitPct}
                onChange={setPrimarySplitPct}
              />
            )}
            <div className="p-3 rounded-lg bg-[#FAF7F4] dark:bg-[#22201E] border border-[var(--atr-divider)] space-y-1 tabular-nums">
              <div className="flex justify-between">
                <span>{L('Décret 09-18 Commission HT', 'Honoraires HT Décret 09-18', 'الأتعاب بدون رسم')}</span>
                <span className="font-semibold">{formatMoney(previewComm.baseHt, language)}</span>
              </div>
              <div className="flex justify-between">
                <span>{L(`Commission TTC (${tvaRate}%)`, `Honoraires TTC (${tvaRate}%)`, `الأتعاب شاملة الرسم`)}</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatMoney(previewComm.totalTtc, language)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 pt-1">
                <CheckCircle2 size={13} />
                <span>
                  {hasSecondary
                    ? `${L('Split', 'Partage', 'تقسيم')}: ${previewSplit.primarySplitBps / 100}% / ${previewSplit.secondarySplitBps / 100}%`
                    : '100%'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsNewModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">
                {L('Create Sale Dossier', 'Créer le Dossier', 'إنشاء الملف')}
              </AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
