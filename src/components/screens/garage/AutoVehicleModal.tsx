import React, { useState } from 'react';
import { Car, X, Building2, Fuel, Gauge } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { VehicleAsset, useGarageData } from './garageData';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface AutoVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: VehicleAsset) => void;
  vehicleToEdit?: VehicleAsset | null;
}

export const AutoVehicleModal: React.FC<AutoVehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicleToEdit,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { fleets } = useGarageData();

  const [plate, setPlate] = useState(vehicleToEdit?.plateNumber || '');
  const [brand, setBrand] = useState(vehicleToEdit?.brand || '');
  const [model, setModel] = useState(vehicleToEdit?.model || '');
  const [year, setYear] = useState(vehicleToEdit ? String(vehicleToEdit.year) : '2021');
  const [vin, setVin] = useState(vehicleToEdit?.vin || '');
  const [fuelType, setFuelType] = useState<VehicleAsset['fuelType']>(vehicleToEdit?.fuelType || 'Diesel');
  const [isFleet, setIsFleet] = useState<boolean>(vehicleToEdit?.isFleet || false);
  const [fleetId, setFleetId] = useState<string>(vehicleToEdit?.fleetId || (fleets[0]?.id || ''));
  const [ownerName, setOwnerName] = useState(vehicleToEdit?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(vehicleToEdit?.ownerPhone || '');
  const [ownerEmail, setOwnerEmail] = useState(vehicleToEdit?.ownerEmail || '');
  const [mileage, setMileage] = useState(vehicleToEdit ? String(vehicleToEdit.mileageKm) : '65000');
  const [dailyAvgKm, setDailyAvgKm] = useState(vehicleToEdit?.dailyAvgKm ? String(vehicleToEdit.dailyAvgKm) : '50');
  const [carteGriseNumber, setCarteGriseNumber] = useState(vehicleToEdit?.carteGriseNumber || '');

  React.useEffect(() => {
    if (vehicleToEdit) {
      setPlate(vehicleToEdit.plateNumber);
      setBrand(vehicleToEdit.brand);
      setModel(vehicleToEdit.model);
      setYear(String(vehicleToEdit.year));
      setVin(vehicleToEdit.vin);
      setFuelType(vehicleToEdit.fuelType || 'Diesel');
      setIsFleet(Boolean(vehicleToEdit.isFleet));
      setFleetId(vehicleToEdit.fleetId || (fleets[0]?.id || ''));
      setOwnerName(vehicleToEdit.ownerName);
      setOwnerPhone(vehicleToEdit.ownerPhone);
      setOwnerEmail(vehicleToEdit.ownerEmail || '');
      setMileage(String(vehicleToEdit.mileageKm));
      setDailyAvgKm(String(vehicleToEdit.dailyAvgKm || 50));
      setCarteGriseNumber(vehicleToEdit.carteGriseNumber || '');
    } else {
      setPlate('');
      setBrand('');
      setModel('');
      setYear('2021');
      setVin('');
      setFuelType('Diesel');
      setIsFleet(false);
      setFleetId(fleets[0]?.id || '');
      setOwnerName('');
      setOwnerPhone('');
      setOwnerEmail('');
      setMileage('65000');
      setDailyAvgKm('50');
      setCarteGriseNumber('');
    }
  }, [vehicleToEdit, fleets]);

  if (!isOpen) return null;

  const handleFleetToggle = (fleetEnabled: boolean) => {
    setIsFleet(fleetEnabled);
    if (fleetEnabled && fleets.length > 0) {
      const selectedFleet = fleets.find((f) => f.id === fleetId) || fleets[0];
      if (selectedFleet) {
        setOwnerName(selectedFleet.companyName);
        setOwnerPhone(selectedFleet.phone);
        setOwnerEmail(selectedFleet.email);
      }
    }
  };

  const handleFleetChange = (selectedId: string) => {
    setFleetId(selectedId);
    const selected = fleets.find((f) => f.id === selectedId);
    if (selected) {
      setOwnerName(selected.companyName);
      setOwnerPhone(selected.phone);
      setOwnerEmail(selected.email);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !brand.trim() || !ownerName.trim()) {
      showToast(
        isAr ? 'يرجى إدخال الترقيم، الماركة، وبيانات المالك' : 'Veuillez renseigner l’immatriculation, la marque et le propriétaire',
        'error'
      );
      return;
    }

    const curMileage = parseInt(mileage, 10) || 0;
    const selectedFleetObj = isFleet ? fleets.find((f) => f.id === fleetId) : null;

    const saved: VehicleAsset = {
      id: vehicleToEdit ? vehicleToEdit.id : `veh_${Date.now()}`,
      accountId: vehicleToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'stf_01',
      plateNumber: plate.trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year, 10) || 2021,
      vin: vin.trim() || `VF1${Date.now()}`,
      fuelType,
      isFleet,
      fleetId: isFleet ? fleetId : undefined,
      fleetName: isFleet ? (selectedFleetObj?.companyName || 'Flotte Entreprise') : undefined,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerEmail: ownerEmail.trim(),
      mileageKm: curMileage,
      lastServiceKm: vehicleToEdit?.lastServiceKm || curMileage - 5000,
      lastServiceDate: vehicleToEdit?.lastServiceDate || new Date().toISOString().split('T')[0],
      nextServiceKm: curMileage + 10000,
      dailyAvgKm: parseInt(dailyAvgKm, 10) || 50,
      carteGriseNumber: carteGriseNumber.trim() || undefined,
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Car size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                {vehicleToEdit
                  ? (isAr ? 'تعديل بيانات المركبة' : 'Modifier la Fiche Véhicule')
                  : (isAr ? 'تسجيل مركبة جديدة في الحظيرة' : 'Nouveau Véhicule au Parc')}
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr ? 'الترقيم، رقم الشاسيه، الحظيرة والمتابعة الكيلومترية' : 'Immatriculation, VIN, rattachement flotte & entretien'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Type Switcher (Particulier vs Flotte B2B) */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => handleFleetToggle(false)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                !isFleet
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs border border-neutral-200 dark:border-neutral-700'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              🚗 {isAr ? 'زبون فردي (Particulier)' : 'Client Particulier'}
            </button>
            <button
              type="button"
              onClick={() => handleFleetToggle(true)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                isFleet
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              🏢 {isAr ? 'أسطول شركات (Flotte B2B)' : 'Flotte Entreprise B2B'}
            </button>
          </div>

          {/* If Corporate Fleet, show fleet account picker */}
          {isFleet && (
            <div className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-800/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C4785A]">
                <Building2 size={15} />
                <span>{isAr ? 'حساب أسطول الشركة المتعاقدة' : 'Compte Flotte Partenaire (Conventionné)'}</span>
              </div>
              <LabelSelect
                label={isAr ? 'الشركة المالكة للأسطول' : 'Entreprise Cliente'}
                value={fleetId}
                onChange={(e) => handleFleetChange(e.target.value)}
                options={fleets.map((f) => ({
                  value: f.id,
                  label: `${f.companyName} (${f.tradeName})`,
                }))}
              />
            </div>
          )}

          {/* Registration Plate & VIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'الماتريكيل / لوحة الترقيم *' : 'Immatriculation (Matricule) *'}
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="00142-118-16"
              required
            />
            <LabelInput
              label={isAr ? 'رقم الشاسيه (VIN)' : 'N° Châssis (VIN)'}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="VF15R240..."
            />
          </div>

          {/* Make, Model, Year, Fuel */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <LabelInput
              label={isAr ? 'الماركة *' : 'Marque *'}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Renault"
              required
            />
            <LabelInput
              label={isAr ? 'الموديل *' : 'Modèle *'}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Clio 4 dCi"
              required
            />
            <LabelInput
              label={isAr ? 'السنة' : 'Année'}
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <LabelSelect
              label={isAr ? 'نوع الوقود' : 'Carburant'}
              value={fuelType || 'Diesel'}
              onChange={(e) => setFuelType(e.target.value as any)}
              options={[
                { value: 'Diesel', label: 'Diesel (Gazole)' },
                { value: 'Essence', label: 'Essence Sans Plomb' },
                { value: 'GPL', label: 'GPL / Sirghaz' },
                { value: 'Hybride', label: 'Hybride' },
              ]}
            />
          </div>

          {/* Owner details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'اسم الزبون / ممثل الأسطول *' : 'Nom du Propriétaire / Conducteur *'}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Sofiane Mansouri"
              required
            />
            <LabelInput
              label={isAr ? 'رقم الهاتف *' : 'Téléphone Contact *'}
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="0550 12 34 56"
              required
            />
          </div>

          {/* Mileage & Daily Rhythm */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              label={isAr ? 'العداد الحالي (km) *' : 'Kilométrage Actuel (km) *'}
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'المعدل اليومي (km/j)' : 'Roulage Moyen (km/jour)'}
              type="number"
              value={dailyAvgKm}
              onChange={(e) => setDailyAvgKm(e.target.value)}
            />
            <LabelInput
              label={isAr ? 'رقم البطاقة الرمادية' : 'N° Carte Grise'}
              value={carteGriseNumber}
              onChange={(e) => setCarteGriseNumber(e.target.value)}
              placeholder="CG-16-..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="ghost" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Car size={15} />}>
              {vehicleToEdit
                ? (isAr ? 'حفظ التعديلات' : 'Enregistrer les Modifications')
                : (isAr ? 'تسجيل المركبة في الحظيرة' : 'Enregistrer le Véhicule')}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};

