import React, { useState } from 'react';
import { Sprout, Plus, Droplets, MapPin, Calendar, CheckCircle2, Tractor, Layers } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AgricultureParcelModal } from './AgricultureParcelModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';

export const AgricultureParcelsView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { parcels, addParcel, setSelectedParcelId } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [irrigationFilter, setIrrigationFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredParcels = parcels.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.currentCrop?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      p.soilType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesIrrigation = irrigationFilter === 'all' || p.irrigationType === irrigationFilter;
    return matchesSearch && matchesIrrigation;
  });

  const totalHectares = parcels.reduce((acc, p) => acc + p.surfaceHectares, 0);
  const dripSurface = parcels
    .filter((p) => p.irrigationType === 'Drip')
    .reduce((acc, p) => acc + p.surfaceHectares, 0);
  const activeCrops = parcels.filter((p) => p.status === 'Growing' || p.status === 'Harvesting').length;

  const irrigationOptions = [
    { value: 'all', label: isAr ? 'جميع نظم الري' : 'Tous les modes d\'irrigation' },
    { value: 'Drip', label: isAr ? 'تقطير (Goutte-à-goutte)' : 'Goutte-à-goutte (Drip)' },
    { value: 'Pivot', label: isAr ? 'رش محوري (Pivot)' : 'Pivot d\'arrosage' },
    { value: 'Gravity', label: isAr ? 'ري سطحي / غمر' : 'Gravitaire / Submersion' },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Sprout size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'القطع الفلاحية والبيوت المحمية' : 'Parcelles & Blocs de Serres'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {parcels.length} parcelles
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'مساحات المستثمرة الفلاحية، نظم الري بالتقطير، والمحاصيل الموسمية'
                : 'Cartographie parcellaire, assolements, modes d’irrigation et cycles culturaux'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'قطعة جديدة' : 'Nouvelle Parcelle'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'توزيع الأراضي الزراعية ونظم الري' : 'Répartition du Domaine & Assolement'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة القطع النشطة، شبكات التسميد السائل والري المحوري'
              : 'Surfaces cultivées, pilotage de l\'irrigation et rotation des cultures'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Parcelles actives */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'القطع قيد الإنتاج الفعلي' : 'Cultures Actives en Terre'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeCrops}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'دورة فلاحية منتظمة' : 'En phase végétative ou récolte'}
              </p>
            </div>
          </div>

          {/* Card 2: Surface goutte à goutte */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'المساحة المروية بالتقطير' : 'Surface en Goutte-à-Goutte'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {dripSurface.toFixed(1)} <span className="text-sm font-sans font-normal text-neutral-500">Ha</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'اقتصاد مائي وتسميد موضعي' : 'Fertirrigation automatisée'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي مساحة المستثمرة' : 'Superficie Exploitation'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Cadastre Foncier
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {totalHectares} <span className="text-sm font-sans font-normal text-neutral-300">Hectares</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {parcels.length} {isAr ? 'قطع مسجلة وموثقة' : 'parcelles cadastrales'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'فهرس القطع الفلاحية والبيوت البلاستيكية' : 'Inventaire Parcellaire & Cultures'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredParcels.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-56">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث بالقطعة، المحصول...' : 'Rechercher parcelle, culture...'}
              />
            </div>
            <div className="w-48">
              <FilterSelect
                value={irrigationFilter}
                onChange={setIrrigationFilter}
                options={irrigationOptions}
              />
            </div>
          </div>
        </div>

        {filteredParcels.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <Sprout size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد قطع مطابقة للبحث' : 'Aucune parcelle correspondant aux filtres'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredParcels.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedParcelId(p.id)}
                className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/60 transition-all cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {p.surfaceHectares} Hectares
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.status === 'Harvesting'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : p.status === 'Growing'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">
                      {p.name}
                    </h3>
                    <div className="text-xs text-[#C4785A] font-semibold mt-1">
                      {p.currentCrop}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Droplets size={13} className="text-blue-500" />
                        Irrigation:
                      </span>
                      <strong className="text-neutral-800 dark:text-neutral-200">{p.irrigationType}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Type de sol:</span>
                      <strong className="text-neutral-800 dark:text-neutral-200 truncate max-w-[150px]">{p.soilType}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={13} className="text-neutral-400" />
                    <span>Semis: {p.plantingDate}</span>
                  </div>
                  <div className="text-neutral-400">
                    Récolte: <strong className="text-neutral-700 dark:text-neutral-300">{p.expectedHarvestDate}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Parcel Modal */}
      <AgricultureParcelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(newP) => {
          addParcel(newP);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};
