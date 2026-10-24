import React, { useState } from 'react';
import { Car, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { VehicleAsset } from './garageData';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';

interface AutoVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: VehicleAsset) => void;
}

export const AutoVehicleModal: React.FC<AutoVehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { language } = useAtriumStore();
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2020');
  const [vin, setVin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [mileage, setMileage] = useState('50000');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !brand.trim() || !ownerName.trim()) {
      showToast('Veuillez remplir le matricule, la marque et le propriétaire', 'error');
      return;
    }

    const created: VehicleAsset = {
      id: `veh_${Date.now()}`,
      plateNumber: plate.trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year) || 2020,
      vin: vin.trim() || `VIN-${Date.now()}`,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      mileageKm: parseInt(mileage) || 0,
      lastServiceDate: new Date().toISOString().split('T')[0],
    };

    onSave(created);
    showToast(
      language === 'ar' ? 'تم تسجيل المركبة بنجاح' : 'Véhicule enregistré avec succès',
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Car size={16} />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {language === 'ar' ? 'تسجيل مركبة جديدة في الحظيرة' : 'Nouveau Véhicule au Parc'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'الماتريكيل / لوحة الترقيم' : 'Immatriculation (Matricule)'}
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="16-118-2045"
              required
            />
            <LabelInput
              label={language === 'ar' ? 'رقم الشاسيه (VIN)' : 'N° Châssis (VIN)'}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="VF1..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              label={language === 'ar' ? 'الماركة' : 'Marque'}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Renault"
              required
            />
            <LabelInput
              label={language === 'ar' ? 'الموديل' : 'Modèle'}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Clio 4"
              required
            />
            <LabelInput
              label={language === 'ar' ? 'السنة' : 'Année'}
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'اسم الزبون / المالك' : 'Propriétaire'}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Sofiane Mansouri"
              required
            />
            <LabelInput
              label={language === 'ar' ? 'الهاتف' : 'Téléphone'}
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="0550..."
              required
            />
          </div>

          <LabelInput
            label={language === 'ar' ? 'العداد الكيلومتري الحالي (km)' : 'Kilométrage actuel (km)'}
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Car size={14} />}>
              {language === 'ar' ? 'تسجيل المركبة' : 'Enregistrer le Véhicule'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
