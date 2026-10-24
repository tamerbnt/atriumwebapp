import React, { useState } from 'react';
import { Car, Plus, Phone, Calendar, Key } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useGarageData } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { AutoVehicleModal } from './AutoVehicleModal';

export const AutoGarageVehiclesView: React.FC = () => {
  const { language } = useAtriumStore();
  const { vehicles, addVehicle } = useGarageData();

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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Car size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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
            {language === 'ar' ? 'تسجيل مركبة' : 'Nouveau Véhicule'}
          </AtriumButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث بالماتريكيل، المالك أو الماركة...' : 'Recherche matricule, client, marque...'}
          />
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'مركبة' : 'véhicules enregistrés'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((veh) => (
            <div
              key={veh.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                  {veh.plateNumber}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  {veh.year}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {veh.brand} {veh.model}
                </h3>
                <div className="text-xs font-mono text-neutral-400 mt-0.5">
                  VIN: {veh.vin}
                </div>
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-300 border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between">
                <span>{veh.ownerName}</span>
                <span className="font-mono">{veh.ownerPhone}</span>
              </div>

              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Kilométrage</span>
                <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                  {veh.mileageKm.toLocaleString()} km
                </span>
              </div>
            </div>
          ))}
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
