import React, { useState, useMemo } from 'react';
import { X, Calculator, Printer, CheckCircle2, TrendingUp, Info, Building2 } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculatePriceRevisionCoeff } from '../../../utils/contractorRules';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { ContractorProject } from '../../../types';

interface PriceRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ContractorProject;
}

export const PriceRevisionModal: React.FC<PriceRevisionModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';

  // Base ONS Indices & Current Indices (Algerian BTP benchmarks)
  const [baseLaborS0, setBaseLaborS0] = useState('120.0');
  const [currentLaborS, setCurrentLaborS] = useState('134.5');
  const [baseMaterialM0, setBaseMaterialM0] = useState('145.0');
  const [currentMaterialM, setCurrentMaterialM] = useState('178.2');

  // Coefficients (sum = 1.0)
  const [coeffA, setCoeffA] = useState('0.15');
  const [coeffB, setCoeffB] = useState('0.35');
  const [coeffC, setCoeffC] = useState('0.50');

  // Contract Base Amount HT
  const [contractBaseAmount, setContractBaseAmount] = useState(String(project.contractAmountDzd || 85000000));

  const calculation = useMemo(() => {
    const s0 = parseFloat(baseLaborS0) || 120;
    const s = parseFloat(currentLaborS) || 134.5;
    const m0 = parseFloat(baseMaterialM0) || 145;
    const m = parseFloat(currentMaterialM) || 178.2;
    const a = parseFloat(coeffA) || 0.15;
    const b = parseFloat(coeffB) || 0.35;
    const c = parseFloat(coeffC) || 0.5;
    const baseP0 = parseFloat(contractBaseAmount) || 0;

    const res = calculatePriceRevisionCoeff(s, s0, m, m0, a, b, c);
    const revisedTotalDzd = Math.round(baseP0 * res.revisionCoefficient);
    const revisionAllowanceDzd = revisedTotalDzd - baseP0;
    const laborRatio = s / s0;
    const materialRatio = m / m0;

    return {
      kCoeff: res.revisionCoefficient,
      adjustmentRatio: res.priceAdjustmentRatio,
      percentChange: Math.round(res.priceAdjustmentRatio * 10000) / 100,
      revisedTotalDzd,
      revisionAllowanceDzd,
      laborRatio: Number(laborRatio.toFixed(3)),
      materialRatio: Number(materialRatio.toFixed(3)),
    };
  }, [baseLaborS0, currentLaborS, baseMaterialM0, currentMaterialM, coeffA, coeffB, coeffC, contractBaseAmount]);

  if (!isOpen) return null;

  const handlePrintNote = () => {
    window.print();
    showToast(
      isAr
        ? 'تم تجهيز مذكرة مراجعة الأسعار التعاقدية'
        : 'Note de calcul de révision des prix prête pour visa',
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {isAr ? 'حاسبة مراجعة الأسعار التعاقدية (CCAG المادة 54)' : 'Calculateur de Révision des Prix (CCAG Art. 54)'}
              </h2>
              <p className="text-xs text-neutral-500">
                {project.projectCode} · {project.projectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Regulatory Banner */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200">
            <Info size={14} className="text-[#C4785A]" />
            <span>Formule Paramétrique Réglementaire Algérienne</span>
          </div>
          <p className="text-[11px] text-neutral-500 font-mono">
            P = P0 × [a + b × (S / S0) + c × (M / M0)]
          </p>
          <p className="text-[10px] text-neutral-400">
            Indices officiels de l’Office National des Statistiques (ONS) et mercuriale du Ministère des Travaux Publics.
          </p>
        </div>

        {/* Indices and Weights Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Column 1: Salaires / Main d'œuvre */}
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <span className="text-xs font-bold text-neutral-900 dark:text-white block">
              Main d'Œuvre & Salaires (S)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <LabelInput
                label="Indice Base S0"
                type="number"
                value={baseLaborS0}
                onChange={setBaseLaborS0}
              />
              <LabelInput
                label="Indice Actuel S"
                type="number"
                value={currentLaborS}
                onChange={setCurrentLaborS}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-neutral-500 pt-1">
              <span>Ratio S / S0:</span>
              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                {calculation.laborRatio} (+{Math.round((calculation.laborRatio - 1) * 100)}%)
              </span>
            </div>
          </div>

          {/* Column 2: Matériaux (Ciment / Acier / Granulats) */}
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <span className="text-xs font-bold text-neutral-900 dark:text-white block">
              Matériaux & Carburant (M)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <LabelInput
                label="Indice Base M0"
                type="number"
                value={baseMaterialM0}
                onChange={setBaseMaterialM0}
              />
              <LabelInput
                label="Indice Actuel M"
                type="number"
                value={currentMaterialM}
                onChange={setCurrentMaterialM}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-neutral-500 pt-1">
              <span>Ratio M / M0:</span>
              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                {calculation.materialRatio} (+{Math.round((calculation.materialRatio - 1) * 100)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Parametric Weightings (a + b + c = 1.00) */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-neutral-900 dark:text-white">
              Pondération Contractuelle du Marché
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              Total = {(parseFloat(coeffA) + parseFloat(coeffB) + parseFloat(coeffC)).toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <LabelInput
              label="Marge Fixe (a)"
              type="number"
              value={coeffA}
              onChange={setCoeffA}
            />
            <LabelInput
              label="Part M.O. (b)"
              type="number"
              value={coeffB}
              onChange={setCoeffB}
            />
            <LabelInput
              label="Part Matériaux (c)"
              type="number"
              value={coeffC}
              onChange={setCoeffC}
            />
          </div>
        </div>

        {/* Base Contract Input */}
        <div>
          <LabelInput
            label="Montant Initial des Travaux HT (DZD)"
            type="number"
            value={contractBaseAmount}
            onChange={setContractBaseAmount}
          />
        </div>

        {/* Worked Calculation Result Pod */}
        <div className="p-4 rounded-2xl bg-[#1F1D1B] text-white space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">
              Résultat Paramétrique (Coefficient K)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#3D2817] text-[#FB923C]">
              K = {calculation.kCoeff}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
            <div>
              <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
                Montant Initial HT
              </span>
              <span className="text-base font-bold font-mono">
                {formatMoney(parseFloat(contractBaseAmount) || 0)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
                Plus-value Révision
              </span>
              <span className="text-base font-bold font-mono text-emerald-400">
                +{formatMoney(calculation.revisionAllowanceDzd)}
              </span>
              <span className="text-[10px] text-emerald-500 block">
                (+{calculation.percentChange}%)
              </span>
            </div>

            <div>
              <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
                Nouveau Montant Révisé HT
              </span>
              <span className="text-base font-bold font-mono text-[#FB923C]">
                {formatMoney(calculation.revisedTotalDzd)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <AtriumButton variant="secondary" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Fermer'}
          </AtriumButton>

          <div className="flex items-center gap-2">
            <AtriumButton
              variant="primary"
              onClick={handlePrintNote}
              icon={<Printer size={14} />}
            >
              {isAr ? 'طباعة مذكرة المراجعة' : 'Imprimer Note CCAG'}
            </AtriumButton>
          </div>
        </div>
      </div>
    </div>
  );
};
