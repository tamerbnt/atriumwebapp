import React, { useState } from 'react';
import { Car, X, Building2, Fuel, Gauge } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { VehicleAsset, useGarageData } from './garageData';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

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
  const { account, language, currentBusiness, currentBranch, currentUser } = useAtriumSelector(
    (s) => ({
      account: s.account,
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
    }),
    shallowEqualObjects
  );
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
      showToast({
        type: 'error',
        title: isAr ? 'بيانات ناقصة' : 'Champs requis',
        message: isAr ? 'يرجى إدخال الترقيم، الماركة، وبيانات المالك' : 'Veuillez renseigner l’immatriculation, la marque et le propriétaire',
      });
      return;
    }

    const activeAccountId = (vehicleToEdit?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (vehicleToEdit?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    const curMileage = parseInt(mileage, 10) || 0;
    const selectedFleetObj = isFleet ? fleets.find((f) => f.id === fleetId) : null;

    const saved: VehicleAsset = {
      id: vehicleToEdit ? vehicleToEdit.id : `veh_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
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
    <KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl" zIndexClass="z-[9990]">
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
          <div className="flex items-center gap-2">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"
            >
              <Car size={20} />
            </div>
            <div>
              <h3 className="font-semibold t-card text-black dark:text-white">
                {vehicleToEdit
                  ? (isAr ? 'تعديل بيانات المركبة' : 'Modifier la Fiche Véhicule')
                  : (isAr ? 'تسجيل مركبة جديدة في الحظيرة' : 'Nouveau Véhicule au Parc')}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Fermer'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Type Switcher (Particulier vs Flotte B2B) */}
          <LiveSegmentedControl
            value={isFleet ? 'fleet' : 'individual'}
            onChange={(val) => handleFleetToggle(val === 'fleet')}
            options={[
              { value: 'individual', label: isAr ? 'زبون فردي (Particulier)' : 'Client Particulier' },
              { value: 'fleet', label: isAr ? 'أسطول شركات (Flotte B2B)' : 'Flotte Entreprise B2B' },
            ]}
            size="sm"
            fullWidth
          />

          {/* If Corporate Fleet, show fleet account picker */}
          {isFleet && (
            <div
              data-sq="card"
              data-sq-border="none"
              className="p-4 bg-orange-50/70 dark:bg-orange-950/30 space-y-2"
            >
              <div className="flex items-center gap-2 t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                <Building2 size={15} />
                <span>{isAr ? 'حساب أسطول الشركة المتعاقدة' : 'Compte Flotte Partenaire (Conventionné)'}</span>
              </div>
              <LabelSelect
                field="vehicleFleetId"
                label={isAr ? 'الشركة المالكة للأسطول' : 'Entreprise Cliente'}
                value={fleetId}
                onChange={handleFleetChange}
                options={fleets.map((f) => ({
                  value: f.id,
                  label: `${f.companyName} (${f.tradeName})`,
                }))}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
          )}

          {/* Registration Plate & VIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="vehiclePlate"
              label={isAr ? 'الماتريكيل / لوحة الترقيم *' : 'Immatriculation (Matricule) *'}
              value={plate}
              onChange={setPlate}
              placeholder="00142-118-16"
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="vehicleVin"
              label={isAr ? 'رقم الشاسيه (VIN)' : 'N° Châssis (VIN)'}
              value={vin}
              onChange={setVin}
              placeholder="VF15R240..."
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          {/* Make, Model, Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              field="vehicleBrand"
              label={isAr ? 'الماركة *' : 'Marque *'}
              value={brand}
              onChange={setBrand}
              placeholder="Renault"
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="vehicleModel"
              label={isAr ? 'الموديل *' : 'Modèle *'}
              value={model}
              onChange={setModel}
              placeholder="Clio 4 dCi"
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="vehicleYear"
              label={isAr ? 'السنة' : 'Année'}
              type="number"
              value={year}
              onChange={setYear}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          {/* Fuel Type (4 options -> LiveSegmentedControl) */}
          <div className="space-y-1.5">
            <label className="t-small font-semibold text-black/70 dark:text-white/75 block">
              {isAr ? 'نوع الوقود' : 'Carburant'}
            </label>
            <LiveSegmentedControl
              value={fuelType || 'Diesel'}
              onChange={(v) => setFuelType(v as VehicleAsset['fuelType'])}
              options={[
                { value: 'Diesel', label: 'Diesel' },
                { value: 'Essence', label: 'Essence' },
                { value: 'GPL', label: 'GPL' },
                { value: 'Hybride', label: isAr ? 'هجين' : 'Hybride' },
              ]}
              size="sm"
              fullWidth
            />
          </div>

          {/* Owner details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="vehicleOwnerName"
              label={isAr ? 'اسم الزبون / ممثل الأسطول *' : 'Nom du Propriétaire / Conducteur *'}
              value={ownerName}
              onChange={setOwnerName}
              placeholder="Sofiane Mansouri"
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="vehicleOwnerPhone"
              label={isAr ? 'رقم الهاتف *' : 'Téléphone Contact *'}
              value={ownerPhone}
              onChange={setOwnerPhone}
              placeholder="0550 12 34 56"
              width="100%"
              height={40}
              corner={12}
              required
            />
          </div>

          {/* Mileage & Daily Rhythm */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              field="vehicleMileage"
              label={isAr ? 'العداد الحالي (km) *' : 'Kilométrage Actuel (km) *'}
              type="number"
              value={mileage}
              onChange={setMileage}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="vehicleDailyAvgKm"
              label={isAr ? 'المعدل اليومي (km/j)' : 'Roulage Moyen (km/jour)'}
              type="number"
              value={dailyAvgKm}
              onChange={setDailyAvgKm}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="vehicleCarteGrise"
              label={isAr ? 'رقم البطاقة الرمادية' : 'N° Carte Grise'}
              value={carteGriseNumber}
              onChange={setCarteGriseNumber}
              placeholder="CG-16-..."
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" tone="accent" size={40} leading={<Car size={15} />}>
              {vehicleToEdit
                ? (isAr ? 'حفظ التعديلات' : 'Enregistrer les Modifications')
                : (isAr ? 'تسجيل المركبة في الحظيرة' : 'Enregistrer le Véhicule')}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};

