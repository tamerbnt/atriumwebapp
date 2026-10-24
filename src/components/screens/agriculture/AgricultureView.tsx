import React, { useState } from 'react';
import {
  Sprout,
  Tractor,
  Wheat,
  Scale,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { AgriParcel, AgriLivestock } from '../../../types/index';

export const AgricultureView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'parcels' | 'crops' | 'livestock'>('dashboard');

  const [parcels, setParcels] = useState<AgriParcel[]>([
    {
      id: 'parc_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: 'Parcelle Nord - Vergers d\'Agrumes',
      surfaceHectares: 12.5,
      irrigationType: 'Drip',
      soilType: 'Argilo-limoneux',
      currentCrop: 'Oranges Thomson & Clémentines',
      plantingDate: '2024-11-15',
      expectedHarvestDate: '2026-11-20',
      status: 'Growing',
      createdAt: '2026-06-05T08:00:00Z',
    },
    {
      id: 'parc_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: 'Serres Multi-Chapelles Maraîchage',
      surfaceHectares: 4.0,
      irrigationType: 'Drip',
      soilType: 'Sableux amendé',
      currentCrop: 'Tomates Industrielles & Poivrons',
      plantingDate: '2026-02-10',
      expectedHarvestDate: '2026-06-15',
      status: 'Harvesting',
      createdAt: '2026-06-05T08:00:00Z',
    },
  ]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-50 dark:bg-lime-950/60 text-lime-600 dark:text-lime-400 flex items-center justify-center font-bold shadow-sm border border-lime-100 dark:border-lime-800">
            <Sprout size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المستثمرة الفلاحية والإنتاج الحيواني' : 'Exploitation Agricole & Élevage'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-lime-100 text-lime-800">
                FacilityType: 25
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Registre des parcelles et serres, récoltes au poids public, intrants phytosanitaires et cheptel
            </p>
          </div>
        </div>

        <button
          onClick={() => showToast('Bon de pesage / Poids public émis', 'success')}
          className="px-3 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Scale size={15} />
          <span>Ticket Poids Public (Pesage)</span>
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-lime-600 text-lime-600' : 'border-transparent text-neutral-500'}`}
        >
          <Tractor size={15} />
          <span>Tableau du Domaine</span>
        </button>
        <button
          onClick={() => setActiveTab('parcels')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'parcels' ? 'border-lime-600 text-lime-600' : 'border-transparent text-neutral-500'}`}
        >
          <Wheat size={15} />
          <span>Parcelles & Serres ({parcels.length})</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Superficie Exploitation</div>
            <div className="text-2xl font-bold font-mono mt-1 text-lime-600">
              {parcels.reduce((acc, p) => acc + p.surfaceHectares, 0)} Hectares
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Parcelles en Récolte Active</div>
            <div className="text-2xl font-bold font-mono mt-1 text-amber-600">
              {parcels.filter((p) => p.status === 'Harvesting').length}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Irrigation Goutte-à-Goutte</div>
            <div className="text-2xl font-bold font-mono mt-1 text-teal-600">100% connectée</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parcels.map((p) => (
            <div key={p.id} className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-lime-50 text-lime-800 font-mono">
                  {p.surfaceHectares} Ha · {p.irrigationType}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {p.status}
                </span>
              </div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white">{p.name}</div>
              <div className="text-xs text-neutral-500">Culture: {p.currentCrop}</div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Sol: {p.soilType}</span>
                <button
                  onClick={() => showToast('Journal de culture et application intrants ouvert', 'success')}
                  className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-xs font-medium"
                >
                  Journal Culture
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
