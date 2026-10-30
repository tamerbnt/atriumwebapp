import React, { useState } from 'react';
import { MapPin, X, Save, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { DEFAULT_TARIFF_RULES, TariffRule, WilayaZone } from '../../../utils/logisticsRules';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';

interface WilayaTariffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WilayaTariffModal: React.FC<WilayaTariffModalProps> = ({ isOpen, onClose }) => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';

  const [tariffRules, setTariffRules] = useState<Record<WilayaZone, TariffRule>>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_tariffs_v1');
      return saved ? JSON.parse(saved) : DEFAULT_TARIFF_RULES;
    } catch {
      return DEFAULT_TARIFF_RULES;
    }
  });

  if (!isOpen) return null;

  const handleUpdate = (zone: WilayaZone, field: keyof TariffRule, val: number) => {
    setTariffRules((prev) => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        [field]: val,
      },
    }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem('atrium_logistics_tariffs_v1', JSON.stringify(tariffRules));
    } catch {}
    showToast(
      isAr ? 'تم حفظ جدول تسعيرات الولايات بنجاح' : 'Grille tarifaire des 58 Wilayas enregistrée',
      'success'
    );
    onClose();
  };

  const handleReset = () => {
    setTariffRules(DEFAULT_TARIFF_RULES);
    try {
      localStorage.setItem('atrium_logistics_tariffs_v1', JSON.stringify(DEFAULT_TARIFF_RULES));
    } catch {}
    showToast(
      isAr ? 'تمت استعادة التسعيرات الافتراضية' : 'Tarifs par défaut réinitialisés',
      'info'
    );
  };

  const zones: Array<{ id: WilayaZone; nameFr: string; nameAr: string; wilayasExample: string }> = [
    {
      id: 'Zone1_Local',
      nameFr: 'Zone 1 — Alger & Grand Alger',
      nameAr: 'المنطقة 1 — الجزائر العاصمة وضواحيها',
      wilayasExample: '16 Alger',
    },
    {
      id: 'Zone2_Proche',
      nameFr: 'Zone 2 — Proche Mitidja',
      nameAr: 'المنطقة 2 — متيجة والمناطق المجاورة',
      wilayasExample: '09 Blida, 35 Boumerdès, 42 Tipaza',
    },
    {
      id: 'Zone3_Nord',
      nameFr: 'Zone 3 — Nord & Métropoles Côtières',
      nameAr: 'المنطقة 3 — الشمال والحواضر الكبرى',
      wilayasExample: '31 Oran, 25 Constantine, 19 Sétif, 06 Béjaïa, 23 Annaba, 13 Tlemcen',
    },
    {
      id: 'Zone4_Plateaux',
      nameFr: 'Zone 4 — Hauts-Plateaux & Intérieur',
      nameAr: 'المنطقة 4 — الهضاب العليا والداخل',
      wilayasExample: '05 Batna, 17 Djelfa, 14 Tiaret, 34 BBA, 43 Mila',
    },
    {
      id: 'Zone5_Sud',
      nameFr: 'Zone 5 — Oasis & Portes du Sud',
      nameAr: 'المنطقة 5 — الواحات وبوابات الصحراء',
      wilayasExample: '30 Ouargla, 07 Biskra, 47 Ghardaïa, 08 Béchar, 39 El Oued',
    },
    {
      id: 'Zone6_GrandSud',
      nameFr: 'Zone 6 — Grand Sud & Frontaliers',
      nameAr: 'المنطقة 6 — أقصى الجنوب والحدود',
      wilayasExample: '11 Tamanrasset, 01 Adrar, 54 In Salah, 57 In Guezzam, 58 Djanet, 33 Illizi, 37 Tindouf',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-4xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                {isAr ? 'شبكة تسعير التوصيل عبر 58 ولاية' : 'Grille Tarifaire des 58 Wilayas & Zones'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr
                  ? 'تعريفة التوصيل للمنزل والمكتب، وزن القاعدة، والزيادة عن كل كغ إضافي'
                  : 'Tarifs réglementaires Stop-Desk & Domicile, franchise de poids et surcoût au kg'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Zones Table */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {zones.map((z) => {
            const rule = tariffRules[z.id];
            return (
              <div
                key={z.id}
                className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                      {isAr ? z.nameAr : z.nameFr}
                    </h4>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {z.wilayasExample}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                    Franchise: {rule.baseWeightKg} kg
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      {isAr ? 'توصيل للمنزل (DZD)' : 'Domicile (DZD)'}
                    </label>
                    <input
                      type="number"
                      value={rule.homeBasePriceDzd}
                      onChange={(e) =>
                        handleUpdate(z.id, 'homeBasePriceDzd', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      {isAr ? 'استلام مكتب Stop-Desk' : 'Stop-Desk (DZD)'}
                    </label>
                    <input
                      type="number"
                      value={rule.stopDeskBasePriceDzd}
                      onChange={(e) =>
                        handleUpdate(z.id, 'stopDeskBasePriceDzd', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      {isAr ? 'زيادة الكيلوغرام (+DZD/kg)' : '+ Par Kg supp.'}
                    </label>
                    <input
                      type="number"
                      value={rule.overweightPerKgDzd}
                      onChange={(e) =>
                        handleUpdate(z.id, 'overweightPerKgDzd', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      {isAr ? 'عناية هشة (+DZD)' : 'Fragile (+DZD)'}
                    </label>
                    <input
                      type="number"
                      value={rule.fragileHandlingSurchargeDzd}
                      onChange={(e) =>
                        handleUpdate(z.id, 'fragileHandlingSurchargeDzd', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
          <AtriumButton variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw size={14} />}>
            {isAr ? 'إعادة ضبط افتراضي' : 'Réinitialiser'}
          </AtriumButton>

          <div className="flex items-center gap-2">
            <AtriumButton variant="outline" size="sm" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Fermer'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" onClick={handleSave} icon={<Save size={14} />}>
              {isAr ? 'حفظ التسعيرات' : 'Enregistrer la Grille'}
            </AtriumButton>
          </div>
        </div>
      </div>
    </div>
  );
};
