import React, { useMemo, useState } from 'react';
import { MessageSquare, Plus, Sparkles, X } from 'lucide-react';
import type { BuyerDemandProfile, RealEstateProperty } from '../../../types/index';
import { buildBuyerMatchAlerts } from '../../../utils/realEstateDepth';
import { formatMoney } from '../../../utils/rules';
import {
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  shallowEqualObjects,
  showToast,
  useAtriumSelector,
} from '../../../services/store';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { EmptyState } from '../../../atrium/components/EmptyState';

export interface RealEstateBuyerMatchPanelProps {
  properties: RealEstateProperty[];
  buyers: BuyerDemandProfile[];
  onAddBuyer: (buyer: BuyerDemandProfile) => void;
}

export const RealEstateBuyerMatchPanel: React.FC<RealEstateBuyerMatchPanelProps> = ({
  properties,
  buyers,
  onAddBuyer,
}) => {
  const { account, currentBusiness, currentBranch, currentUser, language } = useAtriumSelector(
    (s) => ({
      account: s.account,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
      language: s.language,
    }),
    shallowEqualObjects
  );

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const [selectedPropertyId, setSelectedPropertyId] = useState(() => properties[0]?.id || '');
  const [threshold, setThreshold] = useState(50);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [clientFullName, setClientFullName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [targetWilaya, setTargetWilaya] = useState('Alger');
  const [targetCommune, setTargetCommune] = useState('Hydra');
  const [propertyType, setPropertyType] = useState<BuyerDemandProfile['propertyType']>('Apartment');
  const [maxBudgetDzd, setMaxBudgetDzd] = useState('25000000');
  const [minSurfaceM2, setMinSurfaceM2] = useState('90');

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || properties[0],
    [properties, selectedPropertyId]
  );

  const matches = useMemo(
    () => (selectedProperty ? buildBuyerMatchAlerts(selectedProperty, buyers, threshold) : []),
    [selectedProperty, buyers, threshold]
  );

  const handleSaveBuyer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFullName.trim() || !clientPhone.trim()) {
      showToast(L('Enter buyer name and phone.', 'Saisissez le nom et téléphone.', 'أدخل اسم المشتري ورقم الهاتف.'), 'warning');
      return;
    }
    const nowIso = new Date().toISOString();
    onAddBuyer({
      id: `buy_${Date.now()}`,
      accountId: currentBranch?.accountId || account.id || '',
      businessId: currentBusiness?.id || '',
      branchId: currentBranch?.id || '',
      staffId: currentUser?.id || '',
      clientFullName: clientFullName.trim(),
      clientPhone: clientPhone.trim(),
      targetWilaya: targetWilaya.trim() || 'Alger',
      targetCommune: targetCommune.trim() || undefined,
      propertyType,
      maxBudgetDzd: Math.max(0, Number(maxBudgetDzd) || 0),
      minSurfaceM2: Math.max(0, Number(minSurfaceM2) || 0),
      financingType: 'Cash',
      searchUrgency: 'Immediate',
      activeStatus: 'Active',
      createdAt: nowIso,
    });
    setClientFullName('');
    setClientPhone('');
    setIsModalOpen(false);
    showToast(L('Buyer profile added to matching engine.', 'Profil acquéreur ajouté au moteur de matching.', 'تمت إضافة المشتري لمحرك المطابقة.'), 'success');
  };

  return (
    <ScreenPod>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <span>{L('Smart Buyer Match & WhatsApp Alerts', 'Rapprochement Acquéreurs & Alertes WhatsApp', 'مطابقة المشترين وإشعارات واتساب')}</span>
            </h2>
            <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
              {L(
                'Automatically ranks active buyer demands against each property and prepares one-click WhatsApp outreach.',
                'Classe les demandes acquéreurs selon la wilaya, le budget et la surface avec envoi WhatsApp direct.',
                'ترتيب المشترين تلقائياً حسب الميزانية والمساحة مع رابط واتساب مباشر.'
              )}
            </p>
          </div>
          <AtriumButton variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setIsModalOpen(true)}>
            {L('Add Buyer Demand', 'Nouvel Acquéreur', 'إضافة طلب مشتري')}
          </AtriumButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 t-cap">
          <div className="md:col-span-2">
            <LabelSelect
              label={L('Select Property to Match', 'Bien à rapprocher', 'اختر العقار للمطابقة')}
              value={selectedProperty?.id || ''}
              onChange={setSelectedPropertyId}
              options={properties.map((p) => ({
                value: p.id,
                label: `${p.title} · ${p.cityWilaya} (${formatMoney(p.priceDzd, language)})`,
              }))}
            />
          </div>
          <LabelSelect
            label={L('Minimum Score', 'Seuil de score', 'الحد الأدنى للتطابق')}
            value={String(threshold)}
            onChange={(v) => setThreshold(Number(v) || 50)}
            options={[
              { value: '40', label: '≥ 40%' },
              { value: '50', label: '≥ 50%' },
              { value: '65', label: '≥ 65%' },
              { value: '80', label: '≥ 80%' },
            ]}
          />
        </div>

        {matches.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={<Sparkles />}
            title={L('No matching buyers above threshold', 'Aucun acquéreur compatible au-dessus du seuil', 'لا يوجد مشترون مطابقون')}
            description={L('Lower the score threshold or register additional buyer searches.', 'Abaissez le seuil ou ajoutez une nouvelle recherche acquéreur.', 'خفض عتبة النتيجة أو أضف طلباً جديداً.')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matches.map((m) => (
              <div
                key={m.buyer.id}
                data-sq="card"
                data-sq-border="solid"
                className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="t-label font-semibold text-black dark:text-white block">{m.buyer.clientFullName}</span>
                    <span className="t-cap text-black/60 dark:text-white/60 tabular-nums">
                      {m.buyer.clientPhone} · Max {formatMoney(m.buyer.maxBudgetDzd, language)}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full t-small font-semibold tabular-nums ${
                      m.matchLevel === 'High'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {m.score}%
                  </span>
                </div>
                <p className="t-cap text-black/70 dark:text-white/75">{m.highlights.join(' · ')}</p>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--atr-divider)]">
                  <span className="t-cap text-black/55 dark:text-white/55 truncate">
                    {m.buyer.targetCommune ? `${m.buyer.targetCommune}, ` : ''}{m.buyer.targetWilaya}
                  </span>
                  <a
                    href={m.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/15 text-[#0b6e35] dark:text-[#6ee7a8] t-small font-semibold hover:bg-[#25D366]/25 transition-colors"
                  >
                    <MessageSquare size={14} />
                    <span>{L('Send WhatsApp Alert', 'Alerte WhatsApp', 'إرسال واتساب')}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <KineticModalShell isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidthClass="max-w-md" zIndexClass="z-50" scrimClassName="bg-black/60">
        <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h2 className="t-card font-semibold text-black dark:text-white">{L('New Buyer Search Profile', 'Nouveau Profil Acquéreur', 'طلب مشتري جديد')}</h2>
            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSaveBuyer} className="space-y-3 t-cap">
            <div className="grid grid-cols-2 gap-3">
              <LabelInput label={L('Full Name *', 'Nom complet *', 'الاسم *')} value={clientFullName} onChange={setClientFullName} required />
              <LabelInput label={L('Phone *', 'Téléphone *', 'الهاتف *')} value={clientPhone} onChange={setClientPhone} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelInput label={L('Wilaya', 'Wilaya', 'الولاية')} value={targetWilaya} onChange={setTargetWilaya} />
              <LabelInput label={L('Commune', 'Commune', 'البلدية')} value={targetCommune} onChange={setTargetCommune} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <LabelSelect
                label={L('Type', 'Type', 'النوع')}
                value={propertyType}
                onChange={(v) => setPropertyType(v as BuyerDemandProfile['propertyType'])}
                options={[
                  { value: 'Apartment', label: 'Appartement' },
                  { value: 'Villa', label: 'Villa' },
                  { value: 'Office', label: 'Bureau' },
                  { value: 'Commercial', label: 'Commercial' },
                  { value: 'Land', label: 'Terrain' },
                ]}
              />
              <LabelInput type="number" label={L('Max Budget (DZD)', 'Budget Max (DA)', 'الميزانية')} value={maxBudgetDzd} onChange={setMaxBudgetDzd} />
              <LabelInput type="number" label={L('Min m²', 'Surface Min m²', 'المساحة')} value={minSurfaceM2} onChange={setMinSurfaceM2} />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">
                {L('Save Buyer', 'Enregistrer', 'حفظ')}
              </AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
