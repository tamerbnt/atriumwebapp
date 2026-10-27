import React, { useState } from 'react';
import { Car, Plus, Phone, Calendar, Key, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { AutoVehicleModal } from './AutoVehicleModal';

export const AutoGarageVehiclesView: React.FC = () => {
  const { language } = useAtriumStore();
  const { vehicles, orders, addVehicle } = useGarageData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const filtered = vehicles.filter(
    (v) =>
      v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeVehiclesInShop = new Set(
    orders.filter((o) => o.status !== 'Delivered').map((o) => o.vehiclePlate)
  ).size;

  const totalMaintenanceValue = orders.reduce(
    (acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd),
    0
  );

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Car size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل المركبات وحظيرة الزبائن' : 'Parc Véhicules & Immatriculations'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {vehicles.length} {language === 'ar' ? 'مركبة' : 'véhicules'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'قاعدة بيانات لوحات الترقيم، أرقام الشاسيه (VIN)، وأصحاب المركبات'
                : 'Registre d\'immatriculation, historique kilométrique & coordonnées propriétaires'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsVehicleModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'إضافة مركبة' : 'Nouveau Véhicule'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'إحصائيات أسطول الحظيرة والزبائن' : 'Statistiques du Parc & Suivi Technique'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة البطاقات الرمادية، المركبات الموجودة في الورشة والمصروفات التراكمية' : 'Véhicules enregistrés, présence active en baie et volume d\'entretien historique'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Véhicules */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي المركبات المسجلة' : 'Parc Total Enregistré'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {vehicles.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {language === 'ar' ? '100% مطابقة للترقيم الوطني' : 'Dossiers techniques à jour'}
              </p>
            </div>
          </div>

          {/* Card 2: Présents en atelier */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'مركبات موجودة بالورشة حالياً' : 'Véhicules en Atelier'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {activeVehiclesInShop}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'مرتبطة بأوامر صيانة نشطة' : 'Liés à un OR en cours'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'حجم الصيانة التراكمي' : 'Volume Entretien Parc'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'سجل الورشة' : 'Historique OR'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalMaintenanceValue, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'مركبة مطابقة للبحث' : 'véhicules affichés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Car size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'دليل المركبات' : 'Répertoire des Véhicules'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث باللوحة، المالك، الشاسيه...' : 'Recherche matricule, VIN, propriétaire...'}
            />
          </div>
        </div>

        {/* Vehicles Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم اللوحة (الماتريكول)' : 'Matricule'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الموديل والعلامة' : 'Marque & Modèle'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المالك' : 'Propriétaire'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الهاتف' : 'Contact'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم الشاسيه (VIN)' : 'N° Châssis (VIN)'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'العداد (كم)' : 'Kilométrage'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-neutral-900 dark:text-white">
                      <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {v.plateNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {v.brand} {v.model} ({v.year})
                    </td>
                    <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                      {v.ownerName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">
                      {v.ownerPhone}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-neutral-500 text-[11px]">
                      {v.vin}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                      {v.mileageKm.toLocaleString()} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AutoVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSave={addVehicle}
      />
    </div>
  );
};
