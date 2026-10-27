import React, { useState } from 'react';
import { Layers, Plus, Heart, ShieldCheck, CheckCircle2, X, Milk, Calendar } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriLivestock } from '../../../types';

export const AgricultureLivestockView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { livestock, addLivestock } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
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

  const filteredAnimals = livestock.filter((a) => {
    const matchesSearch =
      a.earTagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.species.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSpecies = speciesFilter === 'all' || a.species === speciesFilter;
    return matchesSearch && matchesSpecies;
  });

  const totalMilkProduction = livestock
    .filter((a) => a.dailyProductionLiters)
    .reduce((acc, a) => acc + (a.dailyProductionLiters || 0), 0);

  const healthyCount = livestock.filter((a) => a.healthStatus === 'Healthy').length;

  const speciesOptions = [
    { value: 'all', label: isAr ? 'جميع الفصائل' : 'Toutes les espèces' },
    { value: 'Bovine', label: isAr ? 'أبقار (Bovins)' : 'Bovins (Vaches/Génisses)' },
    { value: 'Ovine', label: isAr ? 'أغنام (Ovins)' : 'Ovins (Brebis/Béliers)' },
    { value: 'Caprine', label: isAr ? 'ماعز (Caprins)' : 'Caprins (Chèvres)' },
    { value: 'Camelid', label: isAr ? 'إبل (Camelins)' : 'Camelins (Chameaux)' },
  ];

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
      isAr ? 'تم تسجيل رأس الماشية في السجل البيطري' : 'Animal enregistré au carnet sanitaire du cheptel',
      'success'
    );
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Layers size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'إدارة الثروة الحيوانية والإنتاج اللبني' : 'Gestion du Cheptel & Production Laitière'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {livestock.length} têtes
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'ترقيم المواشي (الحلقات)، متابعة إنتاج الحليب اليومي، والسجل الصحي البيطري'
                : 'Bouclage d’identification, suivi de traite laitière et carnet sanitaire vétérinaire'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'إضافة رأس جديد' : 'Nouvelle Tête de Bétail'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات قطيع المزرعة' : 'Indicateurs de l\'Élevage & Production'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة الرؤوس المرقّمة، إنتاج الحليب اليومي والحالة الصحية البيطرية'
              : 'Identification auriculaire, volumes de traite quotidienne et suivi sanitaire'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Cheptel total */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي رؤوس القطيع' : 'Têtes de Cheptel Enregistrées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {livestock.length} <span className="text-sm font-sans font-normal text-neutral-500">têtes</span>
              </div>
              <p className="text-[11px] text-[#C4785A] mt-0.5 font-medium">
                {isAr ? 'ترقيم أذني رسمي' : 'Bouclage d\'identification DZ'}
              </p>
            </div>
          </div>

          {/* Card 2: Production Lait */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إنتاج الحليب اليومي' : 'Production Laitière Quotidienne'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {totalMilkProduction.toFixed(1)} <span className="text-sm font-sans font-normal text-neutral-500">Litres / jour</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'جمع وحلب ميكانيكي' : 'Traite matin et soir contrôlée'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'المطابقة البيطرية' : 'Statut Sanitaire Cheptel'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Contrôle Vétérinaire
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {healthyCount} / {livestock.length} <span className="text-sm font-sans font-normal text-neutral-300">Sains</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'دفتر التلقيحات مستوفى' : 'Vaccinations et prophylaxie à jour'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'سجل تتبع أفراد القطيع' : 'Inventaire Individuel des Animaux'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredAnimals.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-56">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث بالترقيم، السلالة...' : 'Filtrer boucle, race...'}
              />
            </div>
            <div className="w-48">
              <FilterSelect
                value={speciesFilter}
                onChange={setSpeciesFilter}
                options={speciesOptions}
              />
            </div>
          </div>
        </div>

        {filteredAnimals.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <Layers size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد مواشي مطابقة للبحث' : 'Aucun animal correspondant aux filtres'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAnimals.map((a) => (
              <div
                key={a.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {a.earTagNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
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
                      {a.species} · {a.gender === 'Female' ? (isAr ? 'أنثى' : 'Femelle') : (isAr ? 'ذكر' : 'Mâle')}
                    </div>
                  </div>

                  {a.dailyProductionLiters && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Milk size={14} />
                        Lait Journalier:
                      </span>
                      <strong className="font-mono">{a.dailyProductionLiters} Litres / jour</strong>
                    </div>
                  )}

                  <p className="text-xs text-neutral-500 leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-xl">
                    {a.notes || 'R.A.S. Suivi régulier'}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                  <div className="flex items-center gap-1">
                    <Calendar size={13} />
                    <span>Né(e) le: {a.birthDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Livestock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'تسجيل رأس ماشية جديد' : 'Nouvelle Tête de Bétail au Cheptel'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAnimal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رقم الحلقة الأذنية' : 'Numéro de Boucle (ex: DZ-16-102)'}
                  value={earTag}
                  onChange={setEarTag}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الفصيلة' : 'Espèce'}
                  value={species}
                  onChange={(v) => setSpecies(v as AgriLivestock['species'])}
                  options={[
                    { value: 'Bovine', label: 'Bovine (Vache)' },
                    { value: 'Ovine', label: 'Ovine (Mouton/Brebis)' },
                    { value: 'Caprine', label: 'Caprine (Chèvre)' },
                    { value: 'Camelid', label: 'Cameline (Chameau)' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'السلالة' : 'Race'}
                  value={breed}
                  onChange={setBreed}
                  placeholder="Ex: Holstein, Ouled Djellal..."
                  required
                />
                <LabelSelect
                  label={isAr ? 'الجنس' : 'Sexe'}
                  value={gender}
                  onChange={(v) => setGender(v as AgriLivestock['gender'])}
                  options={[
                    { value: 'Female', label: 'Femelle' },
                    { value: 'Male', label: 'Mâle' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'تاريخ الولادة' : 'Date de Naissance'}
                  type="date"
                  value={birthDate}
                  onChange={setBirthDate}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الحالة الصحية' : 'Statut Vétérinaire'}
                  value={healthStatus}
                  onChange={(v) => setHealthStatus(v as AgriLivestock['healthStatus'])}
                  options={[
                    { value: 'Healthy', label: 'Sain (Healthy)' },
                    { value: 'Sick', label: 'En Soins (Sick)' },
                    { value: 'Quarantined', label: 'Quarantaine' },
                    { value: 'Culled', label: 'Réformé' },
                  ]}
                />
              </div>

              {species === 'Bovine' && gender === 'Female' && (
                <LabelInput
                  label={isAr ? 'إنتاج الحليب اليومي (لتر/يوم)' : 'Production Laitière Quotidienne (L/jour)'}
                  type="number"
                  value={milkProduction}
                  onChange={setMilkProduction}
                />
              )}

              <LabelInput
                label={isAr ? 'ملاحظات والتلقيحات البيطرية' : 'Carnet Sanitaire & Observations'}
                value={notes}
                onChange={setNotes}
                placeholder="Vaccination aphteuse effectuée..."
              />

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'تسجيل الحيوان' : 'Enregistrer'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
