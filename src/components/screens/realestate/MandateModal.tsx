import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, CheckCircle, Calculator, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { RealEstateProperty, RealEstateMandate, MandateType, StaffMember } from '../../../types';
import { calculateMandateCommission } from '../../../utils/realEstateRules';
import {
  checkExclusiveMandateOverlap,
  computeAgentCommissionSplit,
  formatRealEstateSequentialCode,
} from '../../../utils/realEstateDepth';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessConfigFromState,
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  selectCurrentStaffFromState,
  showToast,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { KineticModalShell } from '../../ui/kinetic';

interface MandateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mandate: RealEstateMandate) => void;
  properties: RealEstateProperty[];
  selectedProperty?: RealEstateProperty | null;
  existingMandates?: RealEstateMandate[];
  staffList?: StaffMember[];
}

export const MandateModal: React.FC<MandateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  properties,
  selectedProperty,
  existingMandates = [],
  staffList,
}) => {
  const {
    account,
    currentBranch,
    currentBusiness,
    currentUser,
    language,
    businessConfig,
    storeStaff,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      currentBranch: selectCurrentBranchFromState(s),
      currentBusiness: selectCurrentBusinessFromState(s),
      currentUser: s.currentUser,
      language: s.language,
      businessConfig: selectCurrentBusinessConfigFromState(s),
      storeStaff: selectCurrentStaffFromState(s),
    }),
    shallowEqualObjects
  );
  const agents = useMemo(() => (staffList && staffList.length > 0 ? staffList : storeStaff || []), [staffList, storeStaff]);
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const defaultSaleCommission = businessConfig.categorySettings?.defaultSaleCommissionPercent ?? 2;
  const configuredTvaRate = businessConfig.defaultTvaRate ?? 19;

  const [propertyId, setPropertyId] = useState(selectedProperty?.id || (properties[0]?.id ?? ''));
  const activeProp = properties.find((p) => p.id === propertyId) || selectedProperty || properties[0];
  const [mandateType, setMandateType] = useState<MandateType>('Vente_Simple');
  const [ownerFullName, setOwnerFullName] = useState(activeProp?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(activeProp?.ownerPhone || '');
  const [ownerNationalId, setOwnerNationalId] = useState(activeProp?.ownerNationalId || '');
  const [ownerIdIssueDate, setOwnerIdIssueDate] = useState('2021-05-10');
  const [ownerIdIssueDaira, setOwnerIdIssueDaira] = useState('Alger');
  const [askingPriceDzd, setAskingPriceDzd] = useState(activeProp?.priceDzd || 15000000);
  const [minimumAcceptablePriceDzd, setMinimumAcceptablePriceDzd] = useState(activeProp ? Math.round(activeProp.priceDzd * 0.95) : 14250000);
  const [commissionMode, setCommissionMode] = useState<'DecreeTranches' | 'FlatPercent' | 'FixedAmount'>('DecreeTranches');
  const [commissionRatePercent, setCommissionRatePercent] = useState(defaultSaleCommission);
  const [commissionPayer, setCommissionPayer] = useState<'Seller' | 'Buyer' | 'Split50_50'>('Split50_50');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState(3);
  const [isExclusive, setIsExclusive] = useState(false);
  const [secondaryAgentId, setSecondaryAgentId] = useState('');
  const [primarySplitPct, setPrimarySplitPct] = useState('100');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const nextPropId = selectedProperty?.id || properties[0]?.id || '';
    const nextProp = properties.find((p) => p.id === nextPropId) || selectedProperty || properties[0];
    setPropertyId(nextPropId);
    setMandateType('Vente_Simple');
    setOwnerFullName(nextProp?.ownerName || '');
    setOwnerPhone(nextProp?.ownerPhone || '');
    setOwnerNationalId(nextProp?.ownerNationalId || '');
    setOwnerIdIssueDate('2021-05-10');
    setOwnerIdIssueDaira('Alger');
    setAskingPriceDzd(nextProp?.priceDzd || 15000000);
    setMinimumAcceptablePriceDzd(nextProp ? Math.round(nextProp.priceDzd * 0.95) : 14250000);
    setCommissionMode('DecreeTranches');
    setCommissionRatePercent(defaultSaleCommission);
    setCommissionPayer('Split50_50');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDurationMonths(3);
    setIsExclusive(false);
    setSecondaryAgentId('');
    setPrimarySplitPct('100');
    setNotes('');
  }, [isOpen, selectedProperty]);

  const start = new Date(startDate);
  start.setMonth(start.getMonth() + Number(durationMonths));
  const endDate = Number.isNaN(start.getTime()) ? startDate : start.toISOString().split('T')[0];

  const commissionCalc = calculateMandateCommission(askingPriceDzd, commissionMode, commissionRatePercent, 0, configuredTvaRate);
  const overlapCheck = useMemo(
    () =>
      checkExclusiveMandateOverlap(existingMandates, {
        propertyId: activeProp?.id || propertyId,
        isExclusive,
        startDate,
        endDate,
        status: 'Active',
      }),
    [existingMandates, activeProp?.id, propertyId, isExclusive, startDate, endDate]
  );

  const primarySplitBps = Math.max(0, Math.min(10000, Math.round((parseFloat(primarySplitPct) || 0) * 100)));
  const secondarySplitBps = secondaryAgentId ? 10000 - primarySplitBps : 0;
  const splitPreview = computeAgentCommissionSplit({
    grossCommissionDzd: commissionCalc.baseHt,
    primarySplitBps: secondaryAgentId ? primarySplitBps : 10000,
    secondarySplitBps,
    hasSecondaryAgent: Boolean(secondaryAgentId),
  });

  const handlePropertyChange = (newPropId: string) => {
    setPropertyId(newPropId);
    const chosen = properties.find((p) => p.id === newPropId);
    if (chosen) {
      setOwnerFullName(chosen.ownerName);
      setOwnerPhone(chosen.ownerPhone);
      setAskingPriceDzd(chosen.priceDzd);
      setMinimumAcceptablePriceDzd(Math.round(chosen.priceDzd * 0.95));
      if (chosen.ownerNationalId) setOwnerNationalId(chosen.ownerNationalId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeAccountId = (activeProp?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (activeProp?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    if (overlapCheck.hasOverlap) {
      showToast({
        type: 'error',
        title: isAr ? 'تداخل وكالة حصرية' : isEn ? 'Exclusive Mandate Conflict' : 'Conflit de Mandat Exclusif',
        message: isAr
          ? `العقار مرتبط مسبقاً بوكالة حصرية (${overlapCheck.conflictingMandate?.mandateNumber}).`
          : isEn
          ? `This property already has an active exclusive mandate (${overlapCheck.conflictingMandate?.mandateNumber}).`
          : `Un mandat exclusif actif existe déjà sur ce bien (${overlapCheck.conflictingMandate?.mandateNumber}).`,
      });
      return;
    }

    if (!splitPreview.valid) {
      showToast({
        type: 'error',
        title: isAr ? 'تقسيم عمولة غير صالح' : 'Répartition Commission Invalide',
        message: isAr ? 'يجب أن يكون مجموع الحصص 100%.' : 'Le partage entre négociateurs doit totaliser 100%.',
      });
      return;
    }

    const mandateNumber = formatRealEstateSequentialCode(
      'MND',
      existingMandates.map((m) => m.mandateNumber),
      new Date(startDate || Date.now()).getFullYear()
    );
    const secondaryAgent = agents.find((a) => a.id === secondaryAgentId);
    const nowIso = new Date().toISOString();

    onSave({
      id: `mnd_${Date.now()}`,
      accountId: activeAccountId,
      businessId: activeProp?.businessId || currentBusiness?.id || '',
      branchId: activeBranchId,
      staffId: activeProp?.staffId || currentUser?.id || '',
      negotiatorName: currentUser?.fullName || '',
      secondaryStaffId: secondaryAgent?.id || undefined,
      secondaryNegotiatorName: secondaryAgent?.fullName || undefined,
      primarySplitBps: splitPreview.primarySplitBps,
      secondarySplitBps: splitPreview.secondarySplitBps,
      mandateNumber,
      mandateType,
      status: 'Active',
      propertyId: activeProp?.id || '',
      propertyTitle: activeProp?.title || 'Bien Immobilier',
      propertyAddress: activeProp?.address || '',
      propertyType: activeProp?.propertyType || 'Apartment',
      listingType: mandateType.includes('Location') || mandateType === 'Gestion_Locative' ? 'Rental' : 'Sale',
      ownerFullName: ownerFullName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerNationalId: ownerNationalId.trim(),
      ownerIdIssueDate,
      ownerIdIssueDaira,
      askingPriceDzd: Number(askingPriceDzd) || 0,
      minimumAcceptablePriceDzd: Number(minimumAcceptablePriceDzd) || 0,
      commissionCalculationMode: commissionMode,
      commissionRatePercent: commissionMode === 'FlatPercent' ? commissionRatePercent : undefined,
      commissionEstimatedHtDzd: commissionCalc.baseHt,
      commissionEstimatedTtcDzd: commissionCalc.totalTtc,
      commissionPayer,
      startDate,
      endDate,
      renewalCount: 0,
      isExclusive: Boolean(isExclusive),
      notes: notes.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    onClose();
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      scrimClassName="bg-black/60"
      ariaLabel="Nouveau Mandat d'Agence (Décret 09-18)"
    >
      <div data-sq="panel" data-sq-border="solid" className="relative w-full max-h-[92vh] overflow-y-auto bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 md:p-8 text-black dark:text-white">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--atr-divider)] mb-6">
          <div className="flex items-center gap-3">
            <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"><FileText className="w-5 h-5" /></div>
            <div>
              <h2 className="t-dialog font-semibold">Nouveau Mandat d&apos;Agence (Décret 09-18)</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" data-sq="ctl-sm" data-sq-border="none" className="p-2 text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {overlapCheck.hasOverlap && (
          <div data-sq="card" data-sq-border="solid" className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 flex items-center gap-2.5 t-small text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Un mandat exclusif actif ({overlapCheck.conflictingMandate?.mandateNumber}) couvre déjà ce bien sur cette période ({overlapCheck.conflictingMandate?.startDate} → {overlapCheck.conflictingMandate?.endDate}).
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabelSelect
              label="Bien Immobilier Rattaché"
              value={propertyId}
              onChange={handlePropertyChange}
              options={properties.map((p) => ({
                value: p.id,
                label: `${p.title} (${p.cityWilaya})`,
              }))}
            />
            <LabelSelect
              label="Nature du Mandat"
              value={mandateType}
              onChange={(val) => {
                const nextType = val as MandateType;
                setMandateType(nextType);
                setIsExclusive(nextType.includes('Exclusif'));
              }}
              options={[
                { value: 'Vente_Simple', label: 'Vente Simple (Non-exclusif)' },
                { value: 'Vente_Exclusif', label: 'Vente Exclusive (Décret 09-18)' },
                { value: 'Location_Habitation', label: 'Location Habitation (1 mois)' },
                { value: 'Location_Commercial', label: 'Location Commerciale' },
                { value: 'Gestion_Locative', label: 'Gestion Locative Annuelle' },
              ]}
            />
          </div>
          <div data-sq="card" data-sq-border="none" className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-4">
            <div className="flex items-center gap-2 t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
              <ShieldCheck className="w-4 h-4" />
              <span>Identité Légale du Mandant (Propriétaire)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <LabelInput label="Nom & Prénom" value={ownerFullName} onChange={setOwnerFullName} required />
              <LabelInput label="N° Téléphone" value={ownerPhone} onChange={setOwnerPhone} required />
              <LabelInput label="N° CNI / Passeport (18 Chiffres)" value={ownerNationalId} onChange={setOwnerNationalId} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelInput type="date" label="Date de Délivrance CNI" value={ownerIdIssueDate} onChange={setOwnerIdIssueDate} />
              <LabelInput label="Daïra / Commune Émettrice" value={ownerIdIssueDaira} onChange={setOwnerIdIssueDaira} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabelInput type="number" label="Prix Demandé Mandant (DZD)" value={askingPriceDzd} onChange={(v) => setAskingPriceDzd(Number(v))} required />
            <LabelInput type="number" label="Prix Seuil Minimal Acceptable (DZD)" value={minimumAcceptablePriceDzd} onChange={(v) => setMinimumAcceptablePriceDzd(Number(v))} />
            <LabelSelect
              label="Mode Calcul Commission"
              value={commissionMode}
              onChange={(val) => setCommissionMode(val as 'DecreeTranches' | 'FlatPercent' | 'FixedAmount')}
              options={[
                { value: 'DecreeTranches', label: 'Barème Décret 09-18 (3% / 2% / 1%)' },
                { value: 'FlatPercent', label: 'Pourcentage Négocié Fixe' },
                { value: 'FixedAmount', label: 'Montant Forfaitaire Fixe' },
              ]}
            />
          </div>
          {commissionMode === 'FlatPercent' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabelInput type="number" step="0.1" label="Taux de Commission (%)" value={commissionRatePercent} onChange={(v) => setCommissionRatePercent(Number(v))} />
              <LabelSelect
                label="Charge de la Commission"
                value={commissionPayer}
                onChange={(val) => setCommissionPayer(val as 'Seller' | 'Buyer' | 'Split50_50')}
                options={[
                  { value: 'Split50_50', label: 'Partage 50% Vendeur / 50% Acquéreur' },
                  { value: 'Seller', label: '100% à la charge du Vendeur' },
                  { value: 'Buyer', label: "100% à la charge de l'Acquéreur" },
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabelSelect
              label={isAr ? 'وكيل متعاون ثانوي (اختياري)' : isEn ? 'Co-Listing Agent (Optional)' : 'Co-Négociateur / Partage (Optionnel)'}
              value={secondaryAgentId}
              onChange={(val) => {
                setSecondaryAgentId(val);
                if (!val) setPrimarySplitPct('100');
                else if (primarySplitPct === '100') setPrimarySplitPct('60');
              }}
              options={[
                { value: '', label: isAr ? 'بدون تقاسم (100% للوكيل الرئيسي)' : 'Aucun co-agent (100% Négociateur principal)' },
                ...agents.map((a) => ({ value: a.id, label: `${a.fullName} (${a.role})` })),
              ]}
            />
            {secondaryAgentId && (
              <LabelInput
                type="number"
                min={0}
                max={100}
                label={`Part Négociateur Principal (%) — Co-agent: ${(secondarySplitBps / 100).toFixed(0)}%`}
                value={primarySplitPct}
                onChange={setPrimarySplitPct}
              />
            )}
          </div>

          <div data-sq="card" data-sq-border="none" className="p-4 bg-[#FDF4F0] dark:bg-[#2B2825] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div data-sq="tile" data-sq-border="none" className="w-9 h-9 bg-[var(--brand-fill,#C9461F)] text-white flex items-center justify-center font-semibold"><Calculator className="w-5 h-5" /></div>
              <div>
                <div className="t-cap text-black/70 dark:text-white/75">
                  {commissionMode === 'DecreeTranches' ? 'Honoraires Légaux Dégressifs (Décret 09-18 Art. 34)' : `Honoraires Forfaitaires (${commissionRatePercent}%)`}
                </div>
                <div className="t-label font-semibold text-black dark:text-white">
                  Base HT:{' '}
                  <span className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold">
                    {commissionCalc.baseHt.toLocaleString()} DZD
                  </span>
                  {' · TVA (' + configuredTvaRate + '%): '}
                  <span className="tabular-nums">{commissionCalc.tva.toLocaleString()} DZD</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="t-small text-black/70 dark:text-white/75 font-semibold">Total TTC</span>
              <div className="t-pod font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {commissionCalc.totalTtc.toLocaleString()} DZD
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabelInput type="date" label="Date d'Effet du Mandat" value={startDate} onChange={setStartDate} required />
            <LabelSelect
              label="Durée du Mandat"
              value={durationMonths.toString()}
              onChange={(val) => setDurationMonths(Number(val))}
              options={[
                { value: '3', label: '3 Mois (Standard Légal Vente)' },
                { value: '6', label: '6 Mois' },
                { value: '12', label: '12 Mois (Gestion Locative)' },
              ]}
            />
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--r-ctl,12px)] bg-[#F5F1EC] dark:bg-[#292624]">
              <span className="t-small font-medium text-black dark:text-white">Mandat d&apos;Exclusivité Accordé</span>
              <LiveSwitch checked={isExclusive} onCheckedChange={setIsExclusive} aria-label="Mandat d'Exclusivité Accordé" />
            </div>
          </div>
          <LabelInput label="Conditions Particulières / Observations (Optionnel)" value={notes} onChange={setNotes} placeholder="Ex: Clés remises à l'agence, visites le samedi après-midi uniquement..." />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--atr-divider)]">
            <AtriumButton variant="secondary" onClick={onClose} type="button">Annuler</AtriumButton>
            <AtriumButton variant="primary" icon={<CheckCircle size={14} />} type="submit" disabled={overlapCheck.hasOverlap}>Enregistrer au Registre Officiel</AtriumButton>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
