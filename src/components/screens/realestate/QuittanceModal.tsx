import React, { useState, useEffect } from 'react';
import { X, Receipt, Printer, Stamp } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { RealEstateLease, RentalQuittanceRecord } from '../../../types';
import { allocatePartialRentPayment, formatRealEstateSequentialCode } from '../../../utils/realEstateDepth';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessConfigFromState,
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  showToast,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { KineticModalShell } from '../../ui/kinetic';

interface QuittanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quittance: RentalQuittanceRecord) => void;
  leases: RealEstateLease[];
  selectedLease?: RealEstateLease | null;
  existingQuittances?: RentalQuittanceRecord[];
}

export const QuittanceModal: React.FC<QuittanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  leases,
  selectedLease,
  existingQuittances = [],
}) => {
  const activeLeases = leases.filter((l) => l.status === 'Active');
  const [leaseId, setLeaseId] = useState(selectedLease?.id || activeLeases[0]?.id || '');
  const activeLease = leases.find((l) => l.id === leaseId) || selectedLease || activeLeases[0];

  const currentDate = new Date();
  const [periodMonth, setPeriodMonth] = useState(currentDate.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(currentDate.getFullYear());

  const [rentAmountDzd, setRentAmountDzd] = useState<number>(activeLease?.monthlyRentDzd || 100000);
  const [chargesDzd, setChargesDzd] = useState<number>(5000);
  const [paidOverrideDzd, setPaidOverrideDzd] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Cheque' | 'Virement' | 'BaridiMob'>('Cash');
  const [notes, setNotes] = useState('');

  const {
    account,
    currentBranch,
    currentBusiness,
    currentUser,
    language,
    businessConfig,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      currentBranch: selectCurrentBranchFromState(s),
      currentBusiness: selectCurrentBusinessFromState(s),
      currentUser: s.currentUser,
      language: s.language,
      businessConfig: selectCurrentBusinessConfigFromState(s),
    }),
    shallowEqualObjects
  );
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const cashierStaffName = currentUser?.fullName || 'Agent Gestion';

  useEffect(() => {
    if (!isOpen) return;
    const nextLeaseId = selectedLease?.id || activeLeases[0]?.id || '';
    const nextLease = leases.find((l) => l.id === nextLeaseId) || selectedLease || activeLeases[0];
    const now = new Date();
    setLeaseId(nextLeaseId);
    setPeriodMonth(now.getMonth() + 1);
    setPeriodYear(now.getFullYear());
    setRentAmountDzd(nextLease?.monthlyRentDzd || 100000);
    setChargesDzd(5000);
    setPaidOverrideDzd('');
    setPaymentMethod('Cash');
    setNotes('');
  }, [isOpen, selectedLease]);

  const handleLeaseChange = (newLeaseId: string) => {
    setLeaseId(newLeaseId);
    const chosen = leases.find((l) => l.id === newLeaseId);
    if (chosen) {
      setRentAmountDzd(chosen.monthlyRentDzd);
      setPaidOverrideDzd('');
    }
  };

  const configuredMgmtFee = businessConfig.categorySettings?.defaultAgencyManagementFeePercent ?? 7.0;
  const configuredTvaRate = businessConfig.defaultTvaRate ?? 19;
  const applyTimbre = businessConfig.applyTimbreFiscal !== false;

  const amountDueDzd = Math.max(0, Number(rentAmountDzd) + Number(chargesDzd));
  const requestedPaymentDzd = paidOverrideDzd.trim() !== '' ? Math.max(0, Number(paidOverrideDzd) || 0) : amountDueDzd;

  const partialCalc = allocatePartialRentPayment({
    amountDueDzd,
    previouslyPaidDzd: 0,
    previousSeq: 0,
    paymentAmountDzd: requestedPaymentDzd,
    paymentMethod,
    applyTimbre,
  });

  const managementRate = activeLease?.agencyManagementRatePercent || configuredMgmtFee;
  const appliedBaseForFees = partialCalc.ok ? partialCalc.appliedPaymentDzd : amountDueDzd;
  const agencyCommissionFeeDzd = Math.round(appliedBaseForFees * (managementRate / 100));
  const agencyCommissionTvaDzd = Math.round(agencyCommissionFeeDzd * (configuredTvaRate / 100));
  const netDisbursedToOwnerDzd = Math.max(0, appliedBaseForFees - (agencyCommissionFeeDzd + agencyCommissionTvaDzd));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeAccountId = (activeLease?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (activeLease?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    if (!partialCalc.ok) {
      showToast({
        type: 'error',
        title: isAr ? 'مبلغ غير صالح' : isEn ? 'Invalid Payment Amount' : 'Montant Encaissé Invalide',
        message: isAr ? 'أدخل مبلغاً موجباً أقل أو يساوي المستحق.' : isEn ? 'Enter a positive payment amount.' : 'Veuillez saisir un montant encaissé positif.',
      });
      return;
    }

    const quittanceNumber = formatRealEstateSequentialCode(
      'QTC',
      existingQuittances.map((q) => q.quittanceNumber),
      Number(periodYear) || new Date().getFullYear()
    );
    const nowIso = new Date().toISOString();

    const newQuittance: RentalQuittanceRecord = {
      id: `qtc_${Date.now()}`,
      accountId: activeAccountId,
      businessId: activeLease?.businessId || currentBusiness?.id || '',
      branchId: activeBranchId,
      staffId: activeLease?.staffId || currentUser?.id || '',
      quittanceNumber,
      leaseId: activeLease?.id || '',
      propertyId: activeLease?.propertyId,
      propertyTitle: activeLease?.propertyTitle || 'Appartement en Gestion',
      tenantName: activeLease?.tenantName || 'Locataire',
      ownerName: activeLease?.ownerName || 'Propriétaire Bailleur',
      periodMonth: Number(periodMonth),
      periodYear: Number(periodYear),
      rentAmountDzd: Number(rentAmountDzd),
      chargesDzd: Number(chargesDzd),
      amountDueDzd,
      paidAmountDzd: partialCalc.totalPaidDzd,
      remainingDueDzd: partialCalc.remainingDueDzd,
      isPartial: partialCalc.isPartial,
      paymentStatus: partialCalc.paymentStatus,
      partialPaymentSeq: partialCalc.partialPaymentSeq,
      paymentMethod,
      timbreFiscalDzd: partialCalc.timbreFiscalDzd,
      totalCollectedDzd: partialCalc.totalCollectedWithTimbreDzd,
      agencyCommissionFeeDzd,
      agencyCommissionTvaDzd,
      netDisbursedToOwnerDzd,
      isDisbursedToOwner: false,
      paymentDate: nowIso.split('T')[0],
      cashierStaffName,
      notes: notes.trim(),
      createdAt: nowIso,
    };

    onSave(newQuittance);
    onClose();
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      scrimClassName="bg-black/60"
      ariaLabel="Encaissement & Quittance de Loyer"
    >
      <div data-sq="panel" data-sq-border="solid" className="relative w-full max-h-[92vh] overflow-y-auto bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 md:p-8 text-black dark:text-white">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--atr-divider)] mb-5">
          <div className="flex items-center gap-3">
            <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="t-dialog font-semibold">{isAr ? 'تحصيل وإصدار وصل الإيجار' : isEn ? 'Rent Collection & Receipt' : 'Encaissement & Quittance de Loyer'}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            data-sq="ctl-sm"
            data-sq-border="none"
            className="p-2 text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <LabelSelect
            label="Bail Locatif Concerné"
            value={leaseId}
            onChange={handleLeaseChange}
            options={activeLeases.map((l) => ({
              value: l.id,
              label: `${l.propertyTitle} — Locataire: ${l.tenantName} (${l.monthlyRentDzd.toLocaleString()} DZD)`,
            }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelSelect
              label="Mois de Facturation"
              value={periodMonth.toString()}
              onChange={(val) => setPeriodMonth(Number(val))}
              options={monthNames.map((m, idx) => ({
                value: (idx + 1).toString(),
                label: m,
              }))}
            />

            <LabelInput
              type="number"
              label="Année"
              value={periodYear}
              onChange={(v) => setPeriodYear(Number(v))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <LabelInput
              type="number"
              label="Loyer Principal (DZD)"
              value={rentAmountDzd}
              onChange={(v) => setRentAmountDzd(Number(v))}
              required
            />

            <LabelInput
              type="number"
              label="Charges (DZD)"
              value={chargesDzd}
              onChange={(v) => setChargesDzd(Number(v))}
            />

            <LabelInput
              type="number"
              label={isAr ? 'المدفوع حالياً (جزئي اختياري)' : isEn ? 'Paid Now (Optional Partial)' : 'Montant Payé (Partiel optionnel)'}
              value={paidOverrideDzd}
              onChange={setPaidOverrideDzd}
              placeholder={String(amountDueDzd)}
            />

            <LabelSelect
              label="Mode de Règlement"
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val as 'Cash' | 'Cheque' | 'Virement' | 'BaridiMob')}
              options={[
                { value: 'Cash', label: 'Espèces (Timbre Art. 317)' },
                { value: 'BaridiMob', label: 'BaridiMob (Exonéré)' },
                { value: 'Cheque', label: 'Chèque (Exonéré)' },
                { value: 'Virement', label: 'Virement (Exonéré)' },
              ]}
            />
          </div>

          <div data-sq="card" data-sq-border="none" className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-3">
            <div className="flex items-center justify-between t-small font-semibold text-black/70 dark:text-white/75">
              <span>Décompte Légal de la Quittance</span>
              <span className="flex items-center gap-1 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                <Stamp className="w-3.5 h-3.5" />
                <span>Code du Timbre Art. 317</span>
              </span>
            </div>

            <div className="space-y-2 t-cap">
              <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                <span>Loyer Principal + Charges (Appelé)</span>
                <span className="tabular-nums font-semibold">{amountDueDzd.toLocaleString()} DZD</span>
              </div>

              {partialCalc.isPartial && (
                <div className="flex justify-between py-1 border-b border-[var(--atr-divider)] text-amber-700 dark:text-amber-300 font-semibold">
                  <span>Reste à payer (Paiement Partiel #1)</span>
                  <span className="tabular-nums">{partialCalc.remainingDueDzd.toLocaleString()} DZD</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                <span>Droit de Timbre Fiscal ({paymentMethod === 'Cash' ? 'sur portion espèces' : 'Exonéré'})</span>
                <span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                  {partialCalc.timbreFiscalDzd > 0 ? `+ ${partialCalc.timbreFiscalDzd.toLocaleString()} DZD` : '0 DZD (Exonéré)'}
                </span>
              </div>

              <div className="flex justify-between py-2 t-label font-semibold text-black dark:text-white">
                <span>Total Net Encaissé du Locataire</span>
                <span className="tabular-nums t-body text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                  {partialCalc.totalCollectedWithTimbreDzd.toLocaleString()} DZD
                </span>
              </div>
            </div>

            <div data-sq="ctl" data-sq-border="none" className="p-3 bg-white dark:bg-[#22201E] t-cap text-black/70 dark:text-white/75 flex items-center justify-between flex-wrap gap-2">
              <span>Commission Agence ({managementRate}% + TVA {configuredTvaRate}%): <strong className="text-black dark:text-white">{(agencyCommissionFeeDzd + agencyCommissionTvaDzd).toLocaleString()} DZD</strong></span>
              <span>Reversé au Propriétaire: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{netDisbursedToOwnerDzd.toLocaleString()} DZD</strong></span>
            </div>
          </div>

          <LabelInput
            label="Notes de Paiement & Référence Reçu"
            value={notes}
            onChange={setNotes}
            placeholder="Ex: Paiement reçu en agence le 02 du mois, aucun arriéré restant..."
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--atr-divider)]">
            <AtriumButton variant="secondary" onClick={onClose} type="button">
              Annuler
            </AtriumButton>
            <AtriumButton variant="primary" icon={<Printer size={14} />} type="submit">
              {partialCalc.isPartial ? 'Encaisser Paiement Partiel' : 'Encaisser & Émettre Quittance'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
