import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Save, RotateCcw } from 'lucide-react';
import { showToast, useAtriumSelector } from '../../../services/store';
import { DEFAULT_TARIFF_RULES, TariffRule, WilayaZone } from '../../../utils/logisticsRules';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { isSupabaseConfigured, logisticsService, syncCoordinator } from '../../../lib/supabase';
import { cloneSnapshot, pickLocalizedText, registerUndoEntry } from '../../../services/undoEngine';
import { KineticModalShell } from '../../ui/kinetic';

interface WilayaTariffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function persistTariffRules(
  rules: Record<WilayaZone, TariffRule>,
  ctx: { accountId: string; businessId: string; branchId: string; staffId: string }
): boolean {
  if (!ctx.accountId || !ctx.businessId || !ctx.branchId) {
    return false;
  }
  try {
    localStorage.setItem('atrium_logistics_tariffs_v1', JSON.stringify(rules));
  } catch {}
  void logisticsService.upsertWilayaTariffs(rules, ctx).catch(() => {});
  return true;
}

export const WilayaTariffModal: React.FC<WilayaTariffModalProps> = ({ isOpen, onClose }) => {
  const language = useAtriumSelector((s) => s.language);
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account?.id || '');
  const currentStaffId = useAtriumSelector((s) => s.currentUser?.id || '');
  const activeBranchId = currentBranchId || '';
  const isAr = language === 'ar';

  const [tariffRules, setTariffRules] = useState<Record<WilayaZone, TariffRule>>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_tariffs_v1');
      return saved ? JSON.parse(saved) : DEFAULT_TARIFF_RULES;
    } catch {
      return DEFAULT_TARIFF_RULES;
    }
  });
  const savedRulesRef = useRef<Record<WilayaZone, TariffRule>>(cloneSnapshot(tariffRules));

  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem('atrium_logistics_tariffs_v1');
      const parsed = saved ? (JSON.parse(saved) as Record<WilayaZone, TariffRule>) : DEFAULT_TARIFF_RULES;
      savedRulesRef.current = cloneSnapshot(parsed);
      setTariffRules(cloneSnapshot(parsed));
    } catch {
      savedRulesRef.current = cloneSnapshot(DEFAULT_TARIFF_RULES);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured() || !activeBranchId) return;
    let cancelled = false;
    void syncCoordinator.runSingleFlight(`logistics:tariffs:${activeBranchId}`, async () => {
      const remote = await logisticsService.fetchWilayaTariffs(activeBranchId);
      if (cancelled || Object.keys(remote).length === 0) return;
      setTariffRules((prev) => {
        const merged = { ...DEFAULT_TARIFF_RULES, ...prev, ...remote } as Record<WilayaZone, TariffRule>;
        savedRulesRef.current = cloneSnapshot(merged);
        try {
          localStorage.setItem('atrium_logistics_tariffs_v1', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeBranchId]);

  const handleUpdate = (zone: WilayaZone, field: keyof TariffRule, val: number) => {
    setTariffRules((prev) => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        [field]: val,
      },
    }));
  };

  const upsertCtx = {
    accountId: currentAccountId,
    businessId: currentBusinessId || '',
    branchId: activeBranchId,
    staffId: currentStaffId,
  };

  const handleSave = () => {
    if (!upsertCtx.accountId || !upsertCtx.businessId || !upsertCtx.branchId) {
      showToast({
        type: 'error',
        title: pickLocalizedText(language, {
          en: 'Tenant Context Required',
          fr: 'Contexte établissement requis',
          ar: 'سياق المؤسسة مطلوب',
        }),
        message: pickLocalizedText(language, {
          en: 'Select an active business and branch before saving tariff zones.',
          fr: 'Sélectionnez une entreprise et un site actifs avant d’enregistrer les tarifs.',
          ar: 'يرجى تحديد مؤسسة وفرع نشطين قبل حفظ تسعيرات الولايات.',
        }),
      });
      return;
    }
    const prevSnapshot = cloneSnapshot(savedRulesRef.current);
    const nextSnapshot = cloneSnapshot(tariffRules);
    if (!persistTariffRules(nextSnapshot, upsertCtx)) return;
    savedRulesRef.current = cloneSnapshot(nextSnapshot);
    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'edit',
      summary: pickLocalizedText(language, {
        en: 'Wilaya tariff matrix updated',
        fr: 'Grille tarifaire des Wilayas enregistrée',
        ar: 'تم حفظ جدول تسعيرات الولايات',
      }),
      toastType: 'success',
      undo: () => {
        setTariffRules(cloneSnapshot(prevSnapshot));
        savedRulesRef.current = cloneSnapshot(prevSnapshot);
        persistTariffRules(prevSnapshot, upsertCtx);
      },
      redo: () => {
        setTariffRules(cloneSnapshot(nextSnapshot));
        savedRulesRef.current = cloneSnapshot(nextSnapshot);
        persistTariffRules(nextSnapshot, upsertCtx);
      },
    });
    onClose();
  };

  const handleReset = () => {
    if (!upsertCtx.accountId || !upsertCtx.businessId || !upsertCtx.branchId) {
      showToast({
        type: 'error',
        title: pickLocalizedText(language, {
          en: 'Tenant Context Required',
          fr: 'Contexte établissement requis',
          ar: 'سياق المؤسسة مطلوب',
        }),
        message: pickLocalizedText(language, {
          en: 'Select an active business and branch before resetting tariff zones.',
          fr: 'Sélectionnez une entreprise et un site actifs avant de réinitialiser les tarifs.',
          ar: 'يرجى تحديد مؤسسة وفرع نشطين قبل إعادة ضبط التسعيرات.',
        }),
      });
      return;
    }
    const prevSnapshot = cloneSnapshot(savedRulesRef.current);
    const nextSnapshot = cloneSnapshot(DEFAULT_TARIFF_RULES);
    setTariffRules(cloneSnapshot(nextSnapshot));
    savedRulesRef.current = cloneSnapshot(nextSnapshot);
    persistTariffRules(nextSnapshot, upsertCtx);
    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'edit',
      summary: pickLocalizedText(language, {
        en: 'Wilaya tariffs reset to defaults',
        fr: 'Tarifs par défaut réinitialisés',
        ar: 'تمت استعادة التسعيرات الافتراضية',
      }),
      toastType: 'info',
      undo: () => {
        setTariffRules(cloneSnapshot(prevSnapshot));
        savedRulesRef.current = cloneSnapshot(prevSnapshot);
        persistTariffRules(prevSnapshot, upsertCtx);
      },
      redo: () => {
        setTariffRules(cloneSnapshot(nextSnapshot));
        savedRulesRef.current = cloneSnapshot(nextSnapshot);
        persistTariffRules(nextSnapshot, upsertCtx);
      },
    });
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
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      scrimClassName="bg-black/50"
      ariaLabel={isAr ? 'شبكة تسعير التوصيل عبر الولايات' : 'Grille Tarifaire des Wilayas & Zones'}
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-9 h-9 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"
            >
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="font-semibold t-card text-black dark:text-white">
                {isAr ? 'شبكة تسعير التوصيل عبر الولايات' : 'Grille Tarifaire des Wilayas & Zones'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            aria-label={isAr ? 'إغلاق' : 'Fermer'}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
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
                data-sq="card"
                data-sq-border="none"
                className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="font-semibold t-label text-black dark:text-white">
                      {isAr ? z.nameAr : z.nameFr}
                    </h4>
                    <span className="t-cap text-black/55 dark:text-white/75">
                      {z.wilayasExample}
                    </span>
                  </div>
                  <span className="t-small tabular-nums font-semibold px-2.5 py-1 rounded-full bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                    Franchise: {rule.baseWeightKg} kg
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 t-cap">
                  <LabelInput
                    type="number"
                    label={isAr ? 'توصيل للمنزل (DZD)' : 'Domicile (DZD)'}
                    value={rule.homeBasePriceDzd}
                    onChange={(val) =>
                      handleUpdate(z.id, 'homeBasePriceDzd', parseFloat(val) || 0)
                    }
                  />

                  <LabelInput
                    type="number"
                    label={isAr ? 'استلام مكتب Stop-Desk' : 'Stop-Desk (DZD)'}
                    value={rule.stopDeskBasePriceDzd}
                    onChange={(val) =>
                      handleUpdate(z.id, 'stopDeskBasePriceDzd', parseFloat(val) || 0)
                    }
                  />

                  <LabelInput
                    type="number"
                    label={isAr ? 'زيادة الكيلوغرام (+DZD/kg)' : '+ Par Kg supp.'}
                    value={rule.overweightPerKgDzd}
                    onChange={(val) =>
                      handleUpdate(z.id, 'overweightPerKgDzd', parseFloat(val) || 0)
                    }
                  />

                  <LabelInput
                    type="number"
                    label={isAr ? 'عناية هشة (+DZD)' : 'Fragile (+DZD)'}
                    value={rule.fragileHandlingSurchargeDzd}
                    onChange={(val) =>
                      handleUpdate(z.id, 'fragileHandlingSurchargeDzd', parseFloat(val) || 0)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--atr-divider)] shrink-0">
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
    </KineticModalShell>
  );
};
