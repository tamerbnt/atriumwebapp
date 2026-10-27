import React, { useState } from 'react';
import { Wallet, Plus, Printer, CheckCircle2, FileText, ArrowRight, X, Building, ShieldCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
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

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectDgps = dgps.filter((d) => d.projectId === (selectedProject?.id || selectedProjectId));

  const filteredDgps = projectDgps.filter((d) =>
    d.dgpNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.periodLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBilledGross = projectDgps.reduce((acc, d) => acc + d.periodGrossDzd, 0);
  const totalRetention = projectDgps.reduce((acc, d) => acc + d.retentionGuaranteeDzd, 0);
  const totalNetPayable = projectDgps.reduce((acc, d) => acc + d.netPayableDzd, 0);

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.projectCode} - ${p.projectName.substring(0, 24)}...`,
  }));

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
      projectId: selectedProject?.id || selectedProjectId,
      dgpNumber: `DGP-${String(projectDgps.length + 1).padStart(2, '0')}-${selectedProject?.projectCode || 'CHANT'}`,
      periodLabel: periodLabel.trim(),
      grossCompletedDzd: gross,
      previousCumulDzd: totalBilledGross,
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
      isAr ? 'تم تحرير كشف الحساب والوضعية المالية (DGP)' : 'Situation DGP enregistrée avec succès',
      'success'
    );
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Wallet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الكشوفات المالية والضمان (DGP)' : 'Décomptes Généraux Provisoires (DGP)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {projectDgps.length} situations
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'كشوفات الأشغال المنجزة، اقتطاع الضمان 5%، استهلاك التسبيقات الضريبية'
                : 'Facturations périodiques de chantier, retenues de garantie et régularisations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'كشف جديد (DGP)' : 'Nouvelle Situation DGP'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'الوضعية المالية للمشروع' : 'Situation Financière & Retenues du Projet'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {selectedProject ? `${selectedProject.projectCode} · ${selectedProject.projectName}` : 'Chantier actif'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Situations Émises */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الكشوفات المحررة' : 'Situations Émises'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {projectDgps.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'مقبولة من مكتب الدراسات' : 'Approuvées par le BET'}
              </p>
            </div>
          </div>

          {/* Card 2: Retenue de Garantie */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'اقتطاع الضمان المحجوز (5%)' : 'Retenue de Garantie Cumulée'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {formatMoney(totalRetention)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'تسترجع عند الاستلام النهائي' : 'Libérée à la réception définitive'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي الصافي المستحق' : 'Net des Situations Travaux'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                TVA 19% Incluse
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalNetPayable)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'بعد خصم التسبيق واقتطاع الضمان' : 'Déduction des avances effectuée'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'سجل كشوفات ومستحقات الأشغال' : 'Historique des Situations BTP'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredDgps.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-56">
              <FilterSelect
                value={selectedProject?.id || selectedProjectId}
                onChange={setSelectedProjectId}
                options={projectOptions}
              />
            </div>
            <div className="w-52">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث برقم الكشف...' : 'Filtrer situation, libellé...'}
              />
            </div>
          </div>
        </div>

        {filteredDgps.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <Wallet size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد كشوفات مسجلة لهذا المشروع' : 'Aucune situation DGP enregistrée pour ce chantier'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDgps.map((d) => (
              <div
                key={d.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {d.dgpNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        d.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : d.status === 'ApprovedBE'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {d.status}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      Émis le {d.issuedDate}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {d.periodLabel}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 pt-0.5">
                    <span>Montant Brut: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(d.periodGrossDzd)}</strong></span>
                    <span>·</span>
                    <span>Retenue (5%): <strong className="font-mono text-amber-600">{formatMoney(d.retentionGuaranteeDzd)}</strong></span>
                    <span>·</span>
                    <span>Amort. Avance: <strong className="font-mono text-neutral-700 dark:text-neutral-300">{formatMoney(d.advanceAmortizationDzd)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium block">
                      Net à Payer (TTC)
                    </span>
                    <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
                      {formatMoney(d.netPayableDzd)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDgpForPrint(d)}
                      className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors"
                      title="Imprimer le décompte"
                    >
                      <Printer size={16} />
                    </button>

                    {d.status === 'ApprovedBE' && (
                      <AtriumButton
                        size="xs"
                        variant="primary"
                        onClick={() => {
                          updateDgpStatus(d.id, 'Paid');
                          showToast(
                            isAr ? 'تم تأكيد دفع الكشف المالي' : 'Décompte marqué comme réglé',
                            'success'
                          );
                        }}
                      >
                        {isAr ? 'تأكيد القبض' : 'Encaisser'}
                      </AtriumButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New DGP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'تحرير كشف حساب وأشغال (DGP)' : 'Émission Décompte Général Provisoire'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDgp} className="space-y-4">
              <LabelInput
                label={isAr ? 'عنوان ومرحلة الكشف' : 'Libellé de la situation'}
                value={periodLabel}
                onChange={setPeriodLabel}
                placeholder="Situation N°03 - Travaux Mai 2026"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'مبلغ الأشغال المنجزة الخام (DZD)' : 'Montant Brut Période (DZD)'}
                  type="number"
                  value={periodGross}
                  onChange={setPeriodGross}
                  required
                />
                <LabelInput
                  label={isAr ? 'نسبة اقتطاع الضمان (%)' : 'Retenue Garantie (%)'}
                  type="number"
                  value={retentionPct}
                  onChange={setRetentionPct}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'استرجاع التسبيق المالي (Amortissement Avance DZD)' : 'Remboursement Avance Forfaitaire (DZD)'}
                type="number"
                value={advanceAmort}
                onChange={setAdvanceAmort}
                required
              />

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Retenue Garantie ({(parseFloat(retentionPct) || 5)}%):</span>
                  <span className="font-mono text-amber-600 font-semibold">
                    -{formatMoney(((parseFloat(periodGross) || 0) * (parseFloat(retentionPct) || 5)) / 100)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>TVA (19%):</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">
                    +{formatMoney((((parseFloat(periodGross) || 0) - ((parseFloat(periodGross) || 0) * (parseFloat(retentionPct) || 5)) / 100 - (parseFloat(advanceAmort) || 0)) * 0.19))}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700 font-bold text-neutral-900 dark:text-white">
                  <span>Net à Payer Estimé:</span>
                  <span className="font-mono text-[#C4785A]">
                    {formatMoney(
                      Math.max(
                        0,
                        ((parseFloat(periodGross) || 0) -
                          ((parseFloat(periodGross) || 0) * (parseFloat(retentionPct) || 5)) / 100 -
                          (parseFloat(advanceAmort) || 0)) * 1.19
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'إصدار الكشف' : 'Émettre la Situation'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print DGP Modal */}
      {selectedDgpForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {selectedDgpForPrint.dgpNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDgpForPrint(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs font-mono">
              <div className="font-sans font-bold text-sm text-neutral-900 dark:text-white mb-2">
                {selectedProject?.projectName}
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Montant Brut Période:</span>
                <span>{formatMoney(selectedDgpForPrint.periodGrossDzd)}</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>Retenue Garantie ({selectedDgpForPrint.retentionGuaranteePercent}%):</span>
                <span>-{formatMoney(selectedDgpForPrint.retentionGuaranteeDzd)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Amortissement Avance:</span>
                <span>-{formatMoney(selectedDgpForPrint.advanceAmortizationDzd)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>TVA (19%):</span>
                <span>+{formatMoney(selectedDgpForPrint.tvaAmountDzd)}</span>
              </div>
              <div className="pt-2 border-t border-neutral-300 dark:border-neutral-600 flex justify-between font-bold text-sm text-neutral-900 dark:text-white">
                <span>NET MANDATÉ:</span>
                <span className="text-[#C4785A]">{formatMoney(selectedDgpForPrint.netPayableDzd)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <AtriumButton variant="secondary" onClick={() => setSelectedDgpForPrint(null)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                variant="primary"
                icon={<Printer size={14} />}
                onClick={() => {
                  window.print();
                  setSelectedDgpForPrint(null);
                }}
              >
                Imprimer le Décompte
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
