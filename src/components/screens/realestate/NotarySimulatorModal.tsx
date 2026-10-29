import React, { useState } from 'react';
import { X, Calculator, Printer, Landmark, Building, FileCheck } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { calculateNotaryClosingCosts } from '../../../utils/realEstateRules';

interface NotarySimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPriceDzd?: number;
  propertyTitle?: string;
}

export const NotarySimulatorModal: React.FC<NotarySimulatorModalProps> = ({
  isOpen,
  onClose,
  defaultPriceDzd = 20000000,
  propertyTitle = 'Simulation d\'Acquisition Immobilière',
}) => {
  const [priceDzd, setPriceDzd] = useState<number>(defaultPriceDzd);
  const [propertyType, setPropertyType] = useState<'Residential' | 'Commercial' | 'Land' | 'NewDevelopment'>('Residential');
  const [deboursDzd, setDeboursDzd] = useState<number>(25000);

  if (!isOpen) return null;

  const sim = calculateNotaryClosingCosts(priceDzd, propertyType, deboursDzd);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#18181B] rounded-[28px] shadow-2xl border border-[#E9EEF0] dark:border-[#27272A] p-6 md:p-8 my-8 text-[#18181B] dark:text-[#FAFAFA]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8EC] dark:border-[#27272A] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Simulateur de Frais de Notaire & Enregistrement</h2>
              <p className="text-xs text-[#64748B] dark:text-[#A1A1AA]">
                Décret exécutif n° 08-243 & Loi de Finances (Droits d'enregistrement et publicité foncière)
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

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <LabelInput
            type="number"
            label="Prix Déclaré du Bien (DZD)"
            value={priceDzd}
            onChange={(e) => setPriceDzd(Number(e.target.value))}
            required
          />

          <LabelSelect
            label="Typologie Fiscale du Bien"
            value={propertyType}
            onChange={(val) => setPropertyType(val as any)}
            options={[
              { value: 'Residential', label: 'Habitation Bâtie (Droits 2.5%)' },
              { value: 'Commercial', label: 'Commercial / Professionnel (Droits 5.0%)' },
              { value: 'Land', label: 'Terrain Urbain Constructible (Droits 5.0%)' },
              { value: 'NewDevelopment', label: 'Neuf Promoteur VEFA (Droits 2.5%)' },
            ]}
          />
        </div>

        {/* Results Card */}
        <div className="p-5 rounded-2xl bg-[#F8F9FA] dark:bg-[#141416] border border-[#EDF1F3] dark:border-[#232328] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#C4785A] tracking-wider">
              Décomposition Détaillée de l'Acquisition
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
              Taux Moyen: ~{sim.effectivePercentage}% du prix
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Droits d'Enregistrement */}
            <div className="flex justify-between items-center py-2 border-b border-[#EDF1F3] dark:border-[#232328]">
              <div>
                <div className="font-semibold text-[#18181B] dark:text-white">
                  Droits d'Enregistrement (DGI / Trésor Public)
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#A1A1AA]">
                  {propertyType === 'Commercial' || propertyType === 'Land' ? 'Taux légal 5.0%' : 'Taux légal 2.5%'} reversé à l'inspection des impôts
                </div>
              </div>
              <span className="font-mono font-bold text-sm">
                {sim.droitsEnregistrementDzd.toLocaleString()} DZD
              </span>
            </div>

            {/* 2. Publicité Foncière */}
            <div className="flex justify-between items-center py-2 border-b border-[#EDF1F3] dark:border-[#232328]">
              <div>
                <div className="font-semibold text-[#18181B] dark:text-white">
                  Taxe de Publicité Foncière (TPF)
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#A1A1AA]">
                  Taux uniforme 1.0% pour inscription à la Conservation Foncière (Livret foncier)
                </div>
              </div>
              <span className="font-mono font-bold text-sm">
                {sim.taxePubliciteFonciereDzd.toLocaleString()} DZD
              </span>
            </div>

            {/* 3. Honoraires Notaire */}
            <div className="flex justify-between items-center py-2 border-b border-[#EDF1F3] dark:border-[#232328]">
              <div>
                <div className="font-semibold text-[#18181B] dark:text-white">
                  Émoluments Officiels du Notaire (Décret 08-243)
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#A1A1AA]">
                  Barème dégressif par tranches (3% ≤500k, 2% ≤1M, 1% au-delà) + TVA 19%
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-sm">
                  {(sim.notaryEmolumentsHtDzd + sim.notaryTvaDzd).toLocaleString()} DZD
                </span>
                <div className="text-[10px] text-[#64748B] dark:text-[#A1A1AA]">
                  HT: {sim.notaryEmolumentsHtDzd.toLocaleString()} · TVA: {sim.notaryTvaDzd.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 4. Débours */}
            <div className="flex justify-between items-center py-2 border-b border-[#EDF1F3] dark:border-[#232328]">
              <div>
                <div className="font-semibold text-[#18181B] dark:text-white">
                  Timbres Fiscaux & Débours Administratifs
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#A1A1AA]">
                  Certificats d'urbanisme, extraits cadastraux, timbres de dimension
                </div>
              </div>
              <span className="font-mono font-semibold">
                {sim.deboursAndStampsDzd.toLocaleString()} DZD
              </span>
            </div>

            {/* Total Frais de Clôture */}
            <div className="flex justify-between items-center pt-2 text-[#C4785A]">
              <span className="font-bold text-sm">Total des Frais de Notaire & Taxes</span>
              <span className="font-mono font-bold text-lg">
                {sim.totalClosingCostsDzd.toLocaleString()} DZD
              </span>
            </div>

            {/* Total Budget Global */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-[#C4785A]/30 flex justify-between items-center mt-2">
              <div>
                <span className="text-[11px] uppercase font-bold text-[#64748B] dark:text-[#A1A1AA]">
                  Budget Global d'Acquisition (Prix + Frais)
                </span>
                <div className="text-xs text-[#64748B] dark:text-[#A1A1AA]">
                  Montant total à mobiliser par l'acquéreur
                </div>
              </div>
              <span className="font-mono font-bold text-xl text-[#18181B] dark:text-white">
                {sim.totalAcquisitionBudgetDzd.toLocaleString()} DZD
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 border-t border-[#E2E8EC] dark:border-[#27272A] mt-5">
          <span className="text-[11px] text-[#64748B] dark:text-[#A1A1AA]">
            * Calcul indicatif soumis à la vérification finale de l'étude notariale instrumentante.
          </span>

          <div className="flex items-center gap-2.5">
            <AtriumButton variant="secondary" onClick={onClose} type="button">
              Fermer
            </AtriumButton>
            <AtriumButton
              variant="primary"
              icon={<Printer size={14} />}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.print();
                }
              }}
            >
              Imprimer Devis Acquéreur
            </AtriumButton>
          </div>
        </div>
      </div>
    </div>
  );
};
