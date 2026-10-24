import React, { useState } from 'react';
import { Layers, Plus, Heart, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriLivestock } from '../../../types';

export const AgricultureLivestockView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { livestock, addLivestock } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [earTag, setEarTag] = useState('DZ-16-');
  const [species, setSpecies] = useState<AgriLivestock['species']>('Bovine');
  const [breed, setBreed] = useState('Holstein Frisonne Prime');
  const [gender, setGender] = useState<AgriLivestock['gender']>('Female');
  const [birthDate, setBirthDate] = useState('2023-05-10');
  const [milkProduction, setMilkProduction] = useState('25.0');
  const [healthStatus, setHealthStatus] = useState<AgriLivestock['healthStatus']>('Healthy');
  const [notes, setNotes] = useState('Vaccination à jour. Bon état corporel.');

  const filteredAnimals = livestock.filter((a) =>
    a.earTagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.species.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateAnimal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!earTag.trim()) {
      showToast(isAr ? 'يرجى إدخال رقم الحلقة / الترقيم' : 'Veuillez saisir le numéro de boucle', 'error');
      return;
    }

    const newAnimal: AgriLivestock = {
      id: `ani_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      earTagNumber: earTag.trim(),
      species,
      breed: breed.trim(),
      gender,
      birthDate,
      healthStatus,
      dailyProductionLiters: species === 'Bovine' && gender === 'Female' ? parseFloat(milkProduction) || 0 : undefined,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    addLivestock(newAnimal);
    setIsModalOpen(false);
    showToast(
      isAr ? 'تم تسجيل رأس الماشية في سجل الإسناد' : 'Animal enregistré au registre du cheptel',
      'success'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'تربية المواشي وسجل القطيع (Cheptel)' : 'Registre d’Élevage & Suivi du Cheptel'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {livestock.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'أرقام الحلقات الوطنية، إنتاج الحليب اليومي، والوضع الصحي البيطري'
                : 'Identification individuelle, race, lactation laitière et carnet sanitaire vétérinaire'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث برقم الحلقة أو السلالة...' : 'Rechercher boucle, race...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'رأس جديد' : 'Nouvel Animal'}
          </AtriumButton>
        </div>
      </div>

      {/* Livestock Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredAnimals.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Layers size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد رؤوس مسجلة مطابقة للبحث' : 'Aucun animal trouvé'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAnimals.map((a) => (
              <div
                key={a.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-[#C4785A]/50 transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                      {a.earTagNumber}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        a.healthStatus === 'Healthy'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {a.healthStatus}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {a.breed}
                    </h3>
                    <div className="text-xs text-neutral-500 font-medium mt-0.5">
                      Espèce: <strong>{a.species}</strong> ({a.gender === 'Female' ? 'Femelle' : 'Mâle'})
                    </div>
                  </div>

                  {a.dailyProductionLiters !== undefined && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl flex items-center justify-between font-mono text-xs">
                      <span className="text-neutral-500 font-medium">Production Lait:</span>
                      <span className="font-bold text-blue-600">{a.dailyProductionLiters} L / jour</span>
                    </div>
                  )}

                  {a.notes && (
                    <p className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/30 p-2 rounded-lg">
                      {a.notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between font-mono">
                  <span>Né(e) le: {a.birthDate}</span>
                  <span className="text-emerald-600 font-semibold">Suivi Vétérinaire OK</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Animal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-[#C4785A]" />
                <span>{isAr ? 'تسجيل رأس ماشية جديد' : 'Nouvel Animal au Cheptel'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnimal} className="space-y-3">
              <LabelInput
                label={isAr ? 'رقم الحلقة الوطنية (Boucle) *' : 'Numéro de Boucle d’Oreille *'}
                placeholder="Ex: DZ-16-0948"
                value={earTag}
                onChange={(e) => setEarTag(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label={isAr ? 'النوع' : 'Espèce'}
                  value={species}
                  onChange={(e) => setSpecies(e.target.value as AgriLivestock['species'])}
                  options={[
                    { value: 'Bovine', label: 'Bovine (Vache)' },
                    { value: 'Ovine', label: 'Ovine (Mouton)' },
                    { value: 'Caprine', label: 'Caprine (Chèvre)' },
                  ]}
                />
                <LabelSelect
                  label={isAr ? 'الجنس' : 'Sexe'}
                  value={gender}
                  onChange={(e) => setGender(e.target.value as AgriLivestock['gender'])}
                  options={[
                    { value: 'Female', label: 'Femelle' },
                    { value: 'Male', label: 'Mâle' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'السلالة' : 'Race'}
                  placeholder="Ex: Holstein, Ouled Djellal..."
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'تاريخ الولادة' : 'Date de Naissance'}
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              {species === 'Bovine' && gender === 'Female' && (
                <LabelInput
                  label={isAr ? 'إنتاج الحليب اليومي (لتر)' : 'Production Laitière (L / jour)'}
                  type="number"
                  step="0.5"
                  value={milkProduction}
                  onChange={(e) => setMilkProduction(e.target.value)}
                />
              )}

              <LabelInput
                label={isAr ? 'ملاحظات صحية وبيطرية' : 'Observations Sanitaires'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {isAr ? 'تأكيد التسجيل' : 'Enregistrer'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
