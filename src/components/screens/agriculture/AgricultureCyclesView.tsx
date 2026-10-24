import React, { useState } from 'react';
import { Calendar, Plus, ShieldCheck, AlertTriangle, Droplets, Clock, CheckCircle2 } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriTreatmentLog } from '../../../types';

export const AgricultureCyclesView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { treatmentLogs, parcels, selectedParcelId, setSelectedParcelId, addTreatmentLog } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [productName, setProductName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [pest, setPest] = useState('');
  const [dosage, setDosage] = useState('2.5 kg/ha');
  const [darDays, setDarDays] = useState('7');
  const [operator, setOperator] = useState('Abdelkader (Chef Culture)');
  const [notes, setNotes] = useState('');

  const filteredLogs = treatmentLogs.filter((t) =>
    t.commercialProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.targetPestDisease.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !pest.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم المادة والآفة المستهدفة' : 'Veuillez saisir le produit et le parasite ciblé', 'error');
      return;
    }

    const dar = parseInt(darDays, 10) || 7;
    const today = new Date();
    const harvestAllowed = new Date(today.getTime() + dar * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const newLog: AgriTreatmentLog = {
      id: `treat_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      parcelId: selectedParcelId,
      treatmentDate: today.toISOString().split('T')[0],
      commercialProductName: productName.trim(),
      activeIngredient: activeIngredient.trim() || 'Substance active homologuée',
      targetPestDisease: pest.trim(),
      dosagePerHa: dosage.trim(),
      darDays: dar,
      harvestAllowedDate: harvestAllowed,
      operatorName: operator.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    addTreatmentLog(newLog);
    setIsModalOpen(false);
    setProductName('');
    setPest('');
    showToast(
      isAr ? 'تم تسجيل المعالجة الفلاحية وحساب فترة الأمان (DAR)' : 'Traitement phytosanitaire enregistré avec DAR calculé',
      'success'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'سجل العمليات الفلاحية وفترات الأمان (DAR)' : 'Journal Cultural & Délais Avant Récolte (DAR)'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {treatmentLogs.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'سجل المعالجات النباتية، التسميد، وتواريخ الأمان الصحية قبل الجني'
                : 'Traçabilité phytosanitaire, délais de rémanence DAR et conformité sanitaire'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالمنتج أو الآفة...' : 'Rechercher produit, parasite...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'معالجة جديدة' : 'Nouveau Traitement'}
          </AtriumButton>
        </div>
      </div>

      {/* Treatments List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Calendar size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد سجلات معالجة مطابقة' : 'Aucun traitement enregistré'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">
                      {t.commercialProductName}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      ({t.activeIngredient})
                    </span>
                  </div>

                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <span>Cible: <strong className="text-neutral-800 dark:text-neutral-200">{t.targetPestDisease}</strong></span>
                    <span>·</span>
                    <span>Dose: {t.dosagePerHa}</span>
                    <span>·</span>
                    <span>Appliqué par: {t.operatorName}</span>
                  </div>

                  {t.notes && (
                    <p className="text-[11px] text-neutral-400 italic">
                      {t.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono text-xs">
                    <div className="text-[10px] text-neutral-400 uppercase">Délai DAR</div>
                    <div className="font-bold text-[#C4785A]">
                      {t.darDays} Jours
                    </div>
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-center font-mono">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">Récolte Autorisée</div>
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Dès le {t.harvestAllowedDate}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Treatment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#C4785A]" />
                <span>{isAr ? 'تسجيل معالجة نباتية جديدة' : 'Nouveau Traitement Phytosanitaire'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTreatment} className="space-y-3">
              <LabelSelect
                label={isAr ? 'القطعة المعنية' : 'Parcelle Cible'}
                value={selectedParcelId}
                onChange={(e) => setSelectedParcelId(e.target.value)}
                options={parcels.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.currentCrop})`,
                }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'اسم المنتج التجاري *' : 'Nom Commercial *'}
                  placeholder="Ex: Cuprocol 50 WG"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'المادة الفعالة' : 'Matière Active'}
                  placeholder="Ex: Oxychlorure de cuivre"
                  value={activeIngredient}
                  onChange={(e) => setActiveIngredient(e.target.value)}
                />
              </div>

              <LabelInput
                label={isAr ? 'المرض أو الحشرة المستهدفة *' : 'Maladie / Ravageur Visé *'}
                placeholder="Ex: Mildiou, Oïdium, Tuta Absoluta..."
                value={pest}
                onChange={(e) => setPest(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الجرعة / هكتار' : 'Dose / Hectare'}
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                />
                <LabelInput
                  label={isAr ? 'فترة الأمان (أيام DAR) *' : 'Délai DAR (Jours) *'}
                  type="number"
                  value={darDays}
                  onChange={(e) => setDarDays(e.target.value)}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'القائم بالعملية' : 'Applicateur / Chef'}
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {isAr ? 'تأكيد التسجيل' : 'Enregistrer le Traitement'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
