import React, { useState } from 'react';
import { Sprout, Plus, Droplets, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AgricultureParcelModal } from './AgricultureParcelModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const AgricultureParcelsView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { parcels, addParcel, setSelectedParcelId } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredParcels = parcels.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.currentCrop.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.soilType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Sprout size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'القطع الفلاحية والبيوت المحمية' : 'Parcelles & Blocs de Serres'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {parcels.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'مساحات المستثمرة الفلاحية، نظم الري بالتقطير، والمحاصيل الموسمية'
                : 'Cartographie parcellaire, assolements, modes d’irrigation et cycles culturaux'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالقطعة، المحصول...' : 'Rechercher parcelle, culture...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'قطعة جديدة' : 'Nouvelle Parcelle'}
          </AtriumButton>
        </div>
      </div>

      {/* Parcels Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredParcels.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Sprout size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد قطع مطابقة للبحث' : 'Aucune parcelle trouvée'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredParcels.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedParcelId(p.id)}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-[#C4785A]/50 transition-all cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                      {p.surfaceHectares} Ha
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.status === 'Harvesting'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">
                      {p.name}
                    </h3>
                    <div className="text-xs text-neutral-500 font-medium mt-1">
                      Culture: <strong className="text-neutral-800 dark:text-neutral-200">{p.currentCrop}</strong>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl">
                    <Droplets size={14} className="shrink-0 text-blue-500" />
                    <span>Système: <strong>{p.irrigationType}</strong> · {p.soilType}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase">Semis</div>
                    <div className="text-neutral-700 dark:text-neutral-300 mt-0.5">{p.plantingDate}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase">Récolte Estimée</div>
                    <div className="font-bold text-[#C4785A] mt-0.5">{p.expectedHarvestDate}</div>
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
