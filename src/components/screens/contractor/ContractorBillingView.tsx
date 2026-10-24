import React, { useState } from 'react';
import { Wallet, Plus, Printer, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ContractorDgp } from '../../../types';

export const ContractorBillingView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { dgps, projects, selectedProjectId, setSelectedProjectId, addDgp, updateDgpStatus } = useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDgpForPrint, setSelectedDgpForPrint] = useState<ContractorDgp | null>(null);

  // Form states
  const [periodLabel, setPeriodLabel] = useState('Situation Travaux - Mois Courant');
  const [periodGross, setPeriodGross] = useState('15000000');
  const [retentionPct, setRetentionPct] = useState('5');
  const [advanceAmort, setAdvanceAmort] = useState('1500000');

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const projectDgps = dgps.filter((d) => d.projectId === selectedProjectId);

  const filteredDgps = projectDgps.filter((d) =>
    d.dgpNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.periodLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateDgp = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(periodGross) || 0;
    const retPercent = parseFloat(retentionPct) || 5;
    const retAmount = (gross * retPercent) / 100;
    const advance = parseFloat(advanceAmort) || 0;
    const taxable = gross - retAmount - advance;
    const tva = taxable * 0.19;
    const net = taxable + tva;

    const newDgp: ContractorDgp = {
      id: `dgp_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProjectId,
      dgpNumber: `DGP-${String(projectDgps.length + 1).padStart(2, '0')}-CHANT`,
      periodLabel: periodLabel.trim(),
      grossCompletedDzd: gross,
      previousCumulDzd: 0,
      periodGrossDzd: gross,
      retentionGuaranteePercent: retPercent,
      retentionGuaranteeDzd: retAmount,
      advanceAmortizationDzd: advance,
      tvaPercent: 19,
      tvaAmountDzd: tva,
      netPayableDzd: net,
      status: 'ApprovedBE',
      issuedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    addDgp(newDgp);
    setIsModalOpen(false);
    showToast(
      isAr ? 'تم تحرير كشف الحساب والوضعية المالية (DGP)' : 'Situation DGP enregistrée',
      'success'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'الكشوفات المالية والضمان (DGP)' : 'Décomptes Généraux Provisoires (DGP)'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {projectDgps.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'فوترة الأشغال المنجزة، اقتطاع 5% ضمان، واسترداد تسبيقات الصفقات'
                : 'Situations mensuelles validées BET, retenue de garantie et TVA 19%'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالرقم أو الوصف...' : 'Rechercher DGP, intitulé...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'كشف جديد (DGP)' : 'Nouvelle Situation DGP'}
          </AtriumButton>
        </div>
      </div>

      {/* Project Switcher Bar */}
      <div className="bg-white/60 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-neutral-500 font-medium">{isAr ? 'الورشة:' : 'Chantier:'}</span>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-medium"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.projectCode} - {p.projectName}
            </option>
          ))}
        </select>
      </div>

      {/* DGP Cards List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredDgps.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Wallet size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد كشوفات محررة لهذا المشروع' : 'Aucune situation DGP pour ce chantier'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDgps.map((dgp) => (
              <div
                key={dgp.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                        {dgp.dgpNumber}
                      </span>
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                        {dgp.periodLabel}
                      </h3>
                    </div>
                    <div className="text-xs text-neutral-500">
                      Émis le: {dgp.issuedDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        dgp.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {dgp.status === 'Paid' ? (isAr ? 'مدفوعة' : 'Payée') : (isAr ? 'معتمدة من مكتب الدراسات' : 'Validée BET')}
                    </span>

                    <AtriumButton
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDgpForPrint(dgp)}
                      icon={<Printer size={13} />}
                    >
                      {isAr ? 'طباعة' : 'Imprimer'}
                    </AtriumButton>

                    {dgp.status !== 'Paid' && (
                      <AtriumButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          updateDgpStatus(dgp.id, 'Paid');
                          showToast('Situation marquée comme encaissée', 'success');
                        }}
                        icon={<CheckCircle2 size={13} />}
                      >
                        {isAr ? 'تسوية الدفع' : 'Encaissé'}
                      </AtriumButton>
                    )}
                  </div>
                </div>

                {/* Calculation Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs text-center">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl">
                    <div className="text-[10px] text-neutral-400 uppercase">Travaux Réalisés</div>
                    <div className="font-bold text-neutral-900 dark:text-white mt-0.5">
                      {formatMoney(dgp.periodGrossDzd)}
                    </div>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl">
                    <div className="text-[10px] text-neutral-400 uppercase">Retenue (5%)</div>
                    <div className="font-bold text-amber-600 mt-0.5">
                      -{formatMoney(dgp.retentionGuaranteeDzd)}
                    </div>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl">
                    <div className="text-[10px] text-neutral-400 uppercase">TVA (19%)</div>
                    <div className="font-bold text-blue-600 mt-0.5">
                      +{formatMoney(dgp.tvaAmountDzd)}
                    </div>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-950/30 p-2.5 rounded-xl border border-orange-200 dark:border-orange-900/30">
                    <div className="text-[10px] text-[#C4785A] uppercase font-bold">Net à Payer</div>
                    <div className="font-bold text-[#C4785A] text-sm mt-0.5">
                      {formatMoney(dgp.netPayableDzd)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New DGP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Wallet size={18} className="text-[#C4785A]" />
                <span>{isAr ? 'تحرير وضعية مالية (DGP)' : 'Nouvelle Situation de Travaux (DGP)'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDgp} className="space-y-3">
              <LabelInput
                label={isAr ? 'عنوان الوضعية *' : 'Intitulé de la Situation *'}
                placeholder="Ex: Situation N°03 - Travaux Mai 2026"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'مبلغ الأعمال المنجزة (دج)' : 'Montant Brut Réalisé'}
                  type="number"
                  value={periodGross}
                  onChange={(e) => setPeriodGross(e.target.value)}
                  required
                />
                <LabelSelect
                  label={isAr ? 'اقتطاع الضمان' : 'Retenue Garantie'}
                  value={retentionPct}
                  onChange={(e) => setRetentionPct(e.target.value)}
                  options={[
                    { value: '5', label: '5%' },
                    { value: '10', label: '10%' },
                    { value: '0', label: '0%' },
                  ]}
                />
              </div>

              <LabelInput
                label={isAr ? 'استرجاع التسبيق (Amortissement)' : 'Remboursement Avance (DZD)'}
                type="number"
                value={advanceAmort}
                onChange={(e) => setAdvanceAmort(e.target.value)}
              />

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-xs text-neutral-500">
                La TVA à 19% est calculée automatiquement sur le montant net imposable.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {isAr ? 'تأكيد وإصدار' : 'Éditer la Situation'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {selectedDgpForPrint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-300 text-neutral-900 space-y-4 font-mono text-xs">
            <div className="text-center border-b pb-3 space-y-1">
              <div className="font-extrabold text-base tracking-widest text-[#C4785A]">ATRIUM BTP & GÉNIE CIVIL</div>
              <div className="text-xs text-neutral-500">DÉCOMPTE GÉNÉRAL PROVISOIRE (DGP)</div>
              <div className="text-base font-bold mt-1">{selectedDgpForPrint.dgpNumber} - {selectedDgpForPrint.periodLabel}</div>
            </div>

            <div className="space-y-2 border-b pb-3">
              <div className="flex justify-between">
                <span>Montant Brut des Travaux:</span>
                <span className="font-bold">{formatMoney(selectedDgpForPrint.periodGrossDzd)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Retenue de Garantie (5%):</span>
                <span>-{formatMoney(selectedDgpForPrint.retentionGuaranteeDzd)}</span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>TVA Légale (19%):</span>
                <span>+{formatMoney(selectedDgpForPrint.tvaAmountDzd)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t text-[#C4785A]">
                <span>NET À PAYER ENTREPRISE:</span>
                <span>{formatMoney(selectedDgpForPrint.netPayableDzd)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <AtriumButton variant="ghost" size="sm" onClick={() => setSelectedDgpForPrint(null)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                variant="primary"
                size="sm"
                onClick={() => {
                  window.print();
                  setSelectedDgpForPrint(null);
                }}
                icon={<Printer size={14} />}
              >
                Imprimer
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
