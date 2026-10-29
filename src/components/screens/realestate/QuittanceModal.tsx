import React, { useState } from 'react';
import { X, Receipt, CheckCircle, Printer, AlertCircle, Stamp } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { RealEstateLease, RentalQuittanceRecord } from '../../../types';
import { computeRentalTimbreFiscal } from '../../../utils/realEstateRules';

interface QuittanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quittance: RentalQuittanceRecord) => void;
  leases: RealEstateLease[];
  selectedLease?: RealEstateLease | null;
}

export const QuittanceModal: React.FC<QuittanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  leases,
  selectedLease,
}) => {
  const activeLeases = leases.filter((l) => l.status === 'Active');
  const [leaseId, setLeaseId] = useState(selectedLease?.id || activeLeases[0]?.id || '');
  const activeLease = leases.find((l) => l.id === leaseId) || selectedLease || activeLeases[0];

  const currentDate = new Date();
  const [periodMonth, setPeriodMonth] = useState(currentDate.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(currentDate.getFullYear());

  const [rentAmountDzd, setRentAmountDzd] = useState<number>(activeLease?.monthlyRentDzd || 100000);
  const [chargesDzd, setChargesDzd] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Cheque' | 'Virement' | 'BaridiMob'>('Cash');
  const [cashierStaffName, setCashierStaffName] = useState('Yasmine Cherif');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleLeaseChange = (newLeaseId: string) => {
    setLeaseId(newLeaseId);
    const chosen = leases.find((l) => l.id === newLeaseId);
    if (chosen) {
      setRentAmountDzd(chosen.monthlyRentDzd);
    }
  };

  // Timbre fiscal on total collected if cash
  const subTotal = Number(rentAmountDzd) + Number(chargesDzd);
  const timbreFiscalDzd = computeRentalTimbreFiscal(subTotal, paymentMethod);
  const totalCollectedDzd = subTotal + timbreFiscalDzd;

  // Agency management fee (e.g. 7% + 19% TVA)
  const managementRate = activeLease?.agencyManagementRatePercent || 7.0;
  const agencyCommissionFeeDzd = Math.round(rentAmountDzd * (managementRate / 100));
  const agencyCommissionTvaDzd = Math.round(agencyCommissionFeeDzd * 0.19);
  const netDisbursedToOwnerDzd = rentAmountDzd - (agencyCommissionFeeDzd + agencyCommissionTvaDzd);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const quittanceSeq = Math.floor(100000 + Math.random() * 900000);
    const quittanceNumber = `QTC-${periodYear}-${quittanceSeq}`;

    const newQuittance: RentalQuittanceRecord = {
      id: `qtc_${Date.now()}`,
      accountId: activeLease?.accountId || 'acc_01',
      businessId: activeLease?.businessId || 'biz_realestate',
      branchId: activeLease?.branchId || 'branch_realestate_main',
      staffId: activeLease?.staffId || 'staff_01',
      quittanceNumber,
      leaseId: activeLease?.id || 'lease_01',
      propertyId: activeLease?.propertyId,
      propertyTitle: activeLease?.propertyTitle || 'Appartement en Gestion',
      tenantName: activeLease?.tenantName || 'Locataire',
      ownerName: activeLease?.ownerName || 'Propriétaire Bailleurs',
      periodMonth: Number(periodMonth),
      periodYear: Number(periodYear),
      rentAmountDzd: Number(rentAmountDzd),
      chargesDzd: Number(chargesDzd),
      paymentMethod,
      timbreFiscalDzd,
      totalCollectedDzd,
      agencyCommissionFeeDzd,
      agencyCommissionTvaDzd,
      netDisbursedToOwnerDzd,
      isDisbursedToOwner: false,
      paymentDate: new Date().toISOString().split('T')[0],
      cashierStaffName,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSave(newQuittance);
    onClose();
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#18181B] rounded-[28px] shadow-2xl border border-[#E9EEF0] dark:border-[#27272A] p-6 md:p-8 my-8 text-[#18181B] dark:text-[#FAFAFA]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8EC] dark:border-[#27272A] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Encaissement & Quittance de Loyer</h2>
              <p className="text-xs text-[#64748B] dark:text-[#A1A1AA]">
                Émission de quittance avec calcul automatique du droit de timbre fiscal (Art. 317)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#18181B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Lease Selection */}
          <LabelSelect
            label="Bail Locatif Concerné"
            value={leaseId}
            onChange={(val) => handleLeaseChange(val)}
            options={activeLeases.map((l) => ({
              value: l.id,
              label: `${l.propertyTitle} — Locataire: ${l.tenantName} (${l.monthlyRentDzd.toLocaleString()} DZD)`,
            }))}
          />

          {/* Period Selection */}
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
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              required
            />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <LabelInput
              type="number"
              label="Loyer Mensuel Principal (DZD)"
              value={rentAmountDzd}
              onChange={(e) => setRentAmountDzd(Number(e.target.value))}
              required
            />

            <LabelInput
              type="number"
              label="Charges Locatives (DZD)"
              value={chargesDzd}
              onChange={(e) => setChargesDzd(Number(e.target.value))}
            />

            <LabelSelect
              label="Mode de Règlement"
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val as any)}
              options={[
                { value: 'Cash', label: 'Espèces (Timbre Fiscal Applicable)' },
                { value: 'BaridiMob', label: 'BaridiMob / Virement Postal (Exonéré)' },
                { value: 'Cheque', label: 'Chèque Bancaire (Exonéré)' },
                { value: 'Virement', label: 'Virement Bancaire (Exonéré)' },
              ]}
            />
          </div>

          {/* Fiscal Calculation Breakdown Pod */}
          <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#141416] border border-[#EDF1F3] dark:border-[#232328] space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] dark:text-[#A1A1AA] uppercase">
              <span>Décompte Légal de la Quittance</span>
              <span className="flex items-center gap-1 text-[#C4785A]">
                <Stamp className="w-3.5 h-3.5" />
                <span>Code du Timbre Art. 317</span>
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#EDF1F3] dark:border-[#232328]">
                <span>Loyer Principal HT + Charges</span>
                <span className="font-mono font-semibold">{subTotal.toLocaleString()} DZD</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#EDF1F3] dark:border-[#232328]">
                <span className="flex items-center gap-1">
                  <span>Droit de Timbre Fiscal ({paymentMethod === 'Cash' ? '1% progressif' : 'Exonéré'})</span>
                </span>
                <span className="font-mono font-bold text-[#C4785A]">
                  {timbreFiscalDzd > 0 ? `+ ${timbreFiscalDzd.toLocaleString()} DZD` : '0 DZD (Exonéré)'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 text-sm font-bold text-[#18181B] dark:text-white">
                <span>Total Net Encaissé du Locataire</span>
                <span className="font-mono text-base text-[#C4785A]">
                  {totalCollectedDzd.toLocaleString()} DZD
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-[#E2E8EC] dark:border-[#27272A] text-[11px] text-[#64748B] dark:text-[#A1A1AA] flex items-center justify-between">
              <span>Commission Agence ({managementRate}% + TVA 19%): <strong className="text-[#18181B] dark:text-white">{(agencyCommissionFeeDzd + agencyCommissionTvaDzd).toLocaleString()} DZD</strong></span>
              <span>Reversé au Propriétaire: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{netDisbursedToOwnerDzd.toLocaleString()} DZD</strong></span>
            </div>
          </div>

          <LabelInput
            label="Notes de Paiement & Référence Reçu"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Paiement reçu en agence le 02 du mois, aucun arriéré restant..."
          />

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8EC] dark:border-[#27272A]">
            <AtriumButton variant="secondary" onClick={onClose} type="button">
              Annuler
            </AtriumButton>
            <AtriumButton variant="primary" icon={<Printer size={14} />} type="submit">
              Encaisser & Émettre Quittance
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
