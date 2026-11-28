import React, { useState } from 'react';
import { Car, X, Building2 } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import {
  validateVehiclePlateAndVin,
  type GaragePlateFormat,
  type GarageVehicleType,
} from '../../../utils/garageDepth';
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
  const isEn = language === 'en';
  const { fleets } = useGarageData();

  const [vehicleType, setVehicleType] = useState<GarageVehicleType>(vehicleToEdit?.vehicleType || 'car');
  const [plateFormat, setPlateFormat] = useState<GaragePlateFormat>(vehicleToEdit?.plateFormat || 'algeria_standard');
  const [plate, setPlate] = useState(vehicleToEdit?.plateNumber || '');
  const [brand, setBrand] = useState(vehicleToEdit?.brand || '');
  const [model, setModel] = useState(vehicleToEdit?.model || '');
  const [year, setYear] = useState(vehicleToEdit?.year ? String(vehicleToEdit.year) : '');
  const [vin, setVin] = useState(vehicleToEdit?.vin || '');
  const [fuelType, setFuelType] = useState<VehicleAsset['fuelType']>(vehicleToEdit?.fuelType || 'Diesel');
  const [isFleet, setIsFleet] = useState<boolean>(vehicleToEdit?.isFleet || false);
  const [fleetId, setFleetId] = useState<string>(vehicleToEdit?.fleetId || (fleets[0]?.id || ''));
  const [ownerName, setOwnerName] = useState(vehicleToEdit?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(vehicleToEdit?.ownerPhone || '');
  const [ownerEmail, setOwnerEmail] = useState(vehicleToEdit?.ownerEmail || '');
  const [mileage, setMileage] = useState(
    vehicleToEdit && typeof vehicleToEdit.mileageKm === 'number' ? String(vehicleToEdit.mileageKm) : ''
  );
  const [dailyAvgKm, setDailyAvgKm] = useState(
    vehicleToEdit?.dailyAvgKm ? String(vehicleToEdit.dailyAvgKm) : ''
  );
  const [carteGriseNumber, setCarteGriseNumber] = useState(vehicleToEdit?.carteGriseNumber || '');
  const [techControlExpiry, setTechControlExpiry] = useState(vehicleToEdit?.techControlExpiry || '');
  const [insuranceExpiry, setInsuranceExpiry] = useState(vehicleToEdit?.insuranceExpiry || '');

  React.useEffect(() => {
    if (!isOpen) return;
    if (vehicleToEdit) {
      setVehicleType(vehicleToEdit.vehicleType || 'car');
      setPlateFormat(vehicleToEdit.plateFormat || 'algeria_standard');
      setPlate(vehicleToEdit.plateNumber);
      setBrand(vehicleToEdit.brand);
      setModel(vehicleToEdit.model);
      setYear(vehicleToEdit.year ? String(vehicleToEdit.year) : '');
      setVin(vehicleToEdit.vin || '');
      setFuelType(vehicleToEdit.fuelType || 'Diesel');
      setIsFleet(Boolean(vehicleToEdit.isFleet));
      setFleetId(vehicleToEdit.fleetId || (fleets[0]?.id || ''));
      setOwnerName(vehicleToEdit.ownerName);
      setOwnerPhone(vehicleToEdit.ownerPhone);
      setOwnerEmail(vehicleToEdit.ownerEmail || '');
      setMileage(typeof vehicleToEdit.mileageKm === 'number' ? String(vehicleToEdit.mileageKm) : '');
      setDailyAvgKm(vehicleToEdit.dailyAvgKm ? String(vehicleToEdit.dailyAvgKm) : '');
      setCarteGriseNumber(vehicleToEdit.carteGriseNumber || '');
      setTechControlExpiry(vehicleToEdit.techControlExpiry || '');
      setInsuranceExpiry(vehicleToEdit.insuranceExpiry || '');
    } else {
      setVehicleType('car');
      setPlateFormat('algeria_standard');
      setPlate('');
      setBrand('');
      setModel('');
      setYear('');
      setVin('');
      setFuelType('Diesel');
      setIsFleet(false);
      setFleetId(fleets[0]?.id || '');
      setOwnerName('');
      setOwnerPhone('');
      setOwnerEmail('');
      setMileage('');
      setDailyAvgKm('');
      setCarteGriseNumber('');
      setTechControlExpiry('');
      setInsuranceExpiry('');
    }
  }, [isOpen, vehicleToEdit, fleets]);

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

  const handleVehicleTypeChange = (nextType: GarageVehicleType) => {
    setVehicleType(nextType);
    if (nextType === 'moto') {
      setPlateFormat('moto');
    } else if (plateFormat === 'moto') {
      setPlateFormat('algeria_standard');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedYear = Number.parseInt(year, 10);
    const parsedMileage = Number.parseInt(mileage, 10);
    if (
      !plate.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !ownerName.trim() ||
      !Number.isFinite(parsedYear) ||
      parsedYear < 1950 ||
      parsedYear > new Date().getFullYear() + 1 ||
      !Number.isFinite(parsedMileage) ||
      parsedMileage < 0
    ) {
      showToast({
        type: 'error',
        title: isAr ? 'بيانات ناقصة' : isEn ? 'Required fields' : 'Champs requis',
        message: isAr
          ? 'يرجى إدخال الترقيم، الماركة، الموديل، السنة، العداد وبيانات المالك'
          : isEn
          ? 'Please enter valid plate, brand, model, year, odometer, and owner details.'
          : 'Veuillez renseigner l’immatriculation, la marque, le modèle, l’année, le kilométrage et le propriétaire.',
      });
      return;
    }

    const plateVinCheck = validateVehiclePlateAndVin({
      plateNumber: plate,
      plateFormat,
      vehicleType,
      vin,
    });
    if (!plateVinCheck.valid) {
      const hasVinErr = plateVinCheck.errors.includes('VIN_17_CHARS_REQUIRED_NON_MOTO');
      showToast({
        type: 'error',
        title: hasVinErr
          ? isAr ? 'رقم الشاسيه (VIN) غير صالح' : isEn ? 'Invalid VIN' : 'N° Châssis (VIN) invalide'
          : isAr ? 'تنسيق الترقيم غير مطابق' : isEn ? 'Invalid plate format' : 'Format d’immatriculation invalide',
        message: hasVinErr
          ? isAr
            ? 'يجب أن يتكون رقم الهيكل (VIN) من 17 خانة (تُعفى الدراجات النارية).'
            : isEn
            ? 'Standard vehicles require a 17-character VIN when provided (motorcycles exempt).'
            : 'Un véhicule (hors moto) requiert un VIN de 17 caractères lorsqu’il est renseigné.'
          : isAr
          ? 'يرجى التحقق من صيغة لوحة الترقيم المختارة (مثال: 00142-118-16).'
          : isEn
          ? 'Check the plate number against the selected plate format (e.g. 00142-118-16).'
          : 'Vérifiez le matricule selon le format choisi (ex: 00142-118-16 ou 16-001420-23).',
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

    const parsedDaily = Number.parseInt(dailyAvgKm, 10);
    const selectedFleetObj = isFleet ? fleets.find((f) => f.id === fleetId) : null;

    const saved: VehicleAsset = {
      id: vehicleToEdit ? vehicleToEdit.id : `veh_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      crmPartyId: vehicleToEdit?.crmPartyId,
      vehicleType,
      plateFormat,
      plateNumber: plateVinCheck.normalizedPlate,
      brand: brand.trim(),
      model: model.trim(),
      year: parsedYear,
      vin: plateVinCheck.normalizedVin,
      fuelType,
      isFleet,
      fleetId: isFleet ? fleetId : undefined,
      fleetName: isFleet ? (selectedFleetObj?.companyName || 'Flotte Entreprise') : undefined,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerEmail: ownerEmail.trim(),
      mileageKm: parsedMileage,
      lastServiceKm: vehicleToEdit?.lastServiceKm ?? parsedMileage,
      lastServiceDate: vehicleToEdit?.lastServiceDate || new Date().toISOString().split('T')[0],
      nextServiceKm: vehicleToEdit?.nextServiceKm ?? parsedMileage + 10000,
      dailyAvgKm: Number.isFinite(parsedDaily) && parsedDaily > 0 ? parsedDaily : 50,
      carteGriseNumber: carteGriseNumber.trim() || undefined,
      techControlExpiry: techControlExpiry.trim() || undefined,
      insuranceExpiry: insuranceExpiry.trim() || undefined,
      ownershipHistory: vehicleToEdit?.ownershipHistory,
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
                  ? (isAr ? 'تعديل بيانات المركبة' : isEn ? 'Edit Vehicle' : 'Modifier la Fiche Véhicule')
                  : (isAr ? 'تسجيل مركبة جديدة في الحظيرة' : isEn ? 'Register New Vehicle' : 'Nouveau Véhicule au Parc')}
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
          <LiveSegmentedControl
            value={isFleet ? 'fleet' : 'individual'}
            onChange={(val) => handleFleetToggle(val === 'fleet')}
            options={[
              { value: 'individual', label: isAr ? 'زبون فردي (Particulier)' : isEn ? 'Private Client' : 'Client Particulier' },
              { value: 'fleet', label: isAr ? 'أسطول شركات (Flotte B2B)' : isEn ? 'Corporate Fleet B2B' : 'Flotte Entreprise B2B' },
            ]}
            size="sm"
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelSelect
              field="vehicleType"
              label={isAr ? 'نوع المركبة' : isEn ? 'Vehicle Type' : 'Catégorie Véhicule'}
              value={vehicleType}
              onChange={(val) => handleVehicleTypeChange(val as GarageVehicleType)}
              options={[
                { value: 'car', label: isAr ? 'سيارة سياحية' : isEn ? 'Passenger Car' : 'Véhicule Léger (VL)' },
                { value: 'utility', label: isAr ? 'مركبة نفعية' : isEn ? 'Utility / Van' : 'Utilitaire (VUL)' },
                { value: 'truck', label: isAr ? 'شاحنة وزن ثقيل' : isEn ? 'Heavy Truck' : 'Poids Lourd (PL)' },
                { value: 'moto', label: isAr ? 'دراجة نارية (إعفاء VIN)' : isEn ? 'Motorcycle (VIN Exempt)' : 'Moto / Scooter (Sans VIN 17c)' },
              ]}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelSelect
              field="vehiclePlateFormat"
              label={isAr ? 'صيغة لوحة الترقيم' : isEn ? 'Plate Format' : 'Format Immatriculation'}
              value={plateFormat}
              onChange={(val) => setPlateFormat(val as GaragePlateFormat)}
              options={[
                { value: 'algeria_standard', label: isAr ? 'الترقيم الجزائري (00142-118-16)' : 'Algérie Standard (00142-118-16)' },
                { value: 'algeria_new', label: isAr ? 'الترقيم الجديد (16-001420-23)' : 'Algérie Nouveau (16-001420-23)' },
                { value: 'temporary', label: isAr ? 'ترقيم مؤقت (WW / PROV)' : 'Provisoire (WW / PROV)' },
                { value: 'foreign', label: isAr ? 'ترقيم أجنبي / حر' : 'Étranger / Libre' },
                { value: 'moto', label: isAr ? 'ترقيم دراجة نارية' : 'Plaque Moto' },
              ]}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="vehiclePlate"
              label={isAr ? 'الماتريكيل / لوحة الترقيم *' : 'Immatriculation (Matricule) *'}
              value={plate}
              onChange={setPlate}
              placeholder={plateFormat === 'algeria_new' ? '16-001420-23' : '00142-118-16'}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="vehicleVin"
              label={
                vehicleType === 'moto'
                  ? (isAr ? 'رقم الإطار (اختياري للدراجة)' : 'N° Cadre / Châssis (optionnel moto)')
                  : (isAr ? 'رقم الشاسيه (VIN 17 خانة)' : 'N° Châssis (VIN 17 car.)')
              }
              value={vin}
              onChange={setVin}
              placeholder={vehicleType === 'moto' ? 'MOTO-FRAME-902' : 'VF15R240H51234567'}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

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
              label={isAr ? 'السنة *' : 'Année *'}
              type="number"
              value={year}
              onChange={setYear}
              placeholder="2022"
              width="100%"
              height={40}
              corner={12}
              required
            />
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              field="vehicleMileage"
              label={isAr ? 'العداد الحالي (km) *' : 'Kilométrage Actuel (km) *'}
              type="number"
              value={mileage}
              onChange={setMileage}
              placeholder="65000"
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
              placeholder="50"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="vehicleTechControlExpiry"
              label={isAr ? 'انتهاء المراقبة التقنية' : isEn ? 'Technical Inspection Expiry' : 'Échéance Contrôle Technique'}
              type="date"
              value={techControlExpiry}
              onChange={setTechControlExpiry}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="vehicleInsuranceExpiry"
              label={isAr ? 'انتهاء التأمين' : isEn ? 'Insurance Expiry' : 'Échéance Assurance'}
              type="date"
              value={insuranceExpiry}
              onChange={setInsuranceExpiry}
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

