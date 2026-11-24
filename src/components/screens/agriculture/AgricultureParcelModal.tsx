import React, { useState, useEffect } from 'react';
import { Sprout, X } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { AgriParcel, AgriTenureType, AgriIrrigationType, AgriParcelStatus } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

interface AgricultureParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (parcel: AgriParcel) => void;
  initialData?: AgriParcel | null;
}

export const AgricultureParcelModal: React.FC<AgricultureParcelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
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

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [tenureType, setTenureType] = useState<AgriTenureType>('concession_loi_10_03');
  const [cadastralSection, setCadastralSection] = useState('');
  const [cadastralDeedRef, setCadastralDeedRef] = useState('');
  const [surfaceHectares, setSurfaceHectares] = useState('');
  const [irrigationType, setIrrigationType] = useState<AgriIrrigationType>('Drip');
  const [anrhAnnualQuotaM3, setAnrhAnnualQuotaM3] = useState('');
  const [soilType, setSoilType] = useState('');
  const [currentCrop, setCurrentCrop] = useState('');
  const [plantingDate, setPlantingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
  const [status, setStatus] = useState<AgriParcelStatus>('Growing');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code || '');
      setTenureType(initialData.tenureType || 'concession_loi_10_03');
      setCadastralSection(initialData.cadastralSection || '');
      setCadastralDeedRef(initialData.cadastralDeedRef || '');
      setSurfaceHectares(String(initialData.surfaceHectares));
      setIrrigationType(initialData.irrigationType);
      setAnrhAnnualQuotaM3(initialData.anrhAnnualQuotaM3 ? String(initialData.anrhAnnualQuotaM3) : '');
      setSoilType(initialData.soilType);
      setCurrentCrop(initialData.currentCrop || '');
      setPlantingDate(initialData.plantingDate || new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate(initialData.expectedHarvestDate || '');
      setStatus(initialData.status);
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setCode('');
      setTenureType('concession_loi_10_03');
      setCadastralSection('');
      setCadastralDeedRef('');
      setSurfaceHectares('');
      setIrrigationType('Drip');
      setAnrhAnnualQuotaM3('');
      setSoilType('');
      setCurrentCrop('');
      setPlantingDate(new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate('');
      setStatus('Growing');
      setNotes('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const surfaceVal = parseFloat(surfaceHectares);
    if (!name.trim() || !currentCrop.trim() || isNaN(surfaceVal) || surfaceVal <= 0) {
      showToast(
        isAr ? 'يرجى إدخال اسم القطعة والمحصول والمساحة بشكل صحيح' : 'Veuillez saisir le nom de la parcelle, la culture et une superficie valide',
        'error'
      );
      return;
    }

    const activeAccountId = (initialData?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (initialData?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    const payload: AgriParcel = {
      id: initialData?.id || `parc_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      name: name.trim(),
      code: code.trim(),
      tenureType,
      cadastralSection: cadastralSection.trim(),
      cadastralDeedRef: cadastralDeedRef.trim(),
      surfaceHectares: surfaceVal,
      irrigationType,
      anrhAnnualQuotaM3: parseFloat(anrhAnnualQuotaM3) || 0,
      anrhConsumedM3: initialData?.anrhConsumedM3 || 0,
      soilType: soilType.trim(),
      currentCrop: currentCrop.trim(),
      plantingDate,
      expectedHarvestDate,
      status,
      notes: notes.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(payload);
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
                className="w-9 h-9 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold shrink-0"
              >
                <Sprout size={20} />
              </div>
            <div>
              <h2 className="t-card font-semibold text-black dark:text-white">
                {initialData
                  ? (isAr ? 'تعديل بيانات القطعة الفلاحية' : 'Modifier la Parcelle Agricole')
                  : (isAr ? 'تسجيل قطعة فلاحية / امتياز جديد' : 'Nouvelle Parcelle Agricole & Cadastre')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق النافذة' : 'Fermer la fenêtre'}
            className="p-1 rounded-full text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <LabelInput
                field="ParcelName"
                label={isAr ? 'اسم القطعة أو الحقل' : 'Désignation de la parcelle'}
                value={name}
                onChange={setName}
                placeholder="Ex: Verger Nord - Orangers Thomson"
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
            <LabelInput
              field="ParcelCode"
              label={isAr ? 'الرمز الداخلي' : 'Code'}
              value={code}
              onChange={setCode}
              placeholder="Ex: P-01"
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          {/* Cadastre & Concession Loi 10-03 */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-3"
          >
            <span className="t-small font-semibold text-black dark:text-white block rtl:normal-case rtl:tracking-normal">
              {isAr ? 'البيانات العقارية والمسح الفلاحي' : 'Régime Foncier & Concession (Loi 10-03)'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelSelect
                field="TenureType"
                label={isAr ? 'طبيعة الحيازة' : 'Régime foncier'}
                value={tenureType}
                onChange={(val) => setTenureType(val as AgriTenureType)}
                options={[
                  { value: 'concession_loi_10_03', label: isAr ? 'امتياز فلاحي (قانون 10-03)' : 'Concession Loi 10-03 (40 ans)' },
                  { value: 'propriete_melk', label: isAr ? 'ملكية خاصة (ملك)' : 'Propriété Privée (Melk)' },
                  { value: 'fermage_location', label: isAr ? 'عقد إيجار / مزارعة' : 'Fermage / Location Privée' },
                ]}
                width="100%"
                height={40}
                corner={12}
              />

              <LabelInput
                field="CadastralSection"
                label={isAr ? 'القسم والجزيرة العقارية' : 'Section & Îlot cadastral'}
                value={cadastralSection}
                onChange={setCadastralSection}
                placeholder="Ex: Section 04, Îlot 12"
                width="100%"
                height={40}
                corner={12}
              />

              <LabelInput
                field="CadastralDeedRef"
                label={isAr ? 'رقم العقد التوثيقي / الدفتر' : 'Réf. Acte / Livret Foncier'}
                value={cadastralDeedRef}
                onChange={setCadastralDeedRef}
                placeholder="Ex: Acte N° 1048/2012"
                width="100%"
                height={40}
                corner={12}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              field="SurfaceHectares"
              label={isAr ? 'المساحة (هكتار)' : 'Superficie (Ha)'}
              type="number"
              step="0.1"
              placeholder="5.0"
              value={surfaceHectares}
              onChange={setSurfaceHectares}
              width="100%"
              height={40}
              corner={12}
              required
            />

            <LabelSelect
              field="IrrigationType"
              label={isAr ? 'نظام الري' : 'Mode d\'irrigation'}
              value={irrigationType}
              onChange={(val) => setIrrigationType(val as AgriIrrigationType)}
              options={[
                { value: 'Drip', label: isAr ? 'الري قطرة قطرة' : 'Goutte-à-goutte (Drip)' },
                { value: 'Pivot', label: isAr ? 'المحور الرشاش' : 'Pivot d\'irrigation' },
                { value: 'Sprinkler', label: isAr ? 'الرش الدائري' : 'Aspersion' },
                { value: 'Gravity', label: isAr ? 'السقي السطحي / الساقية' : 'Gravitaire' },
                { value: 'Rainfed', label: isAr ? 'فلاحة بورية (مطرية)' : 'Bour (Pluvial)' },
              ]}
              width="100%"
              height={40}
              corner={12}
            />

            <LabelInput
              field="AnrhAnnualQuotaM3"
              label={isAr ? 'حصة مياه البئر ANRH (م³)' : 'Quota Forage ANRH (m³)'}
              type="number"
              value={anrhAnnualQuotaM3}
              onChange={setAnrhAnnualQuotaM3}
              placeholder="Ex: 50000"
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="CurrentCrop"
              label={isAr ? 'المحصول المزروع' : 'Culture actuelle'}
              value={currentCrop}
              onChange={setCurrentCrop}
              placeholder="Ex: Oranges Thomson & Clémentines"
              width="100%"
              height={40}
              corner={12}
              required
            />

            <LabelInput
              field="SoilType"
              label={isAr ? 'نوع التربة والخصوبة' : 'Pédologie & Type de sol'}
              value={soilType}
              onChange={setSoilType}
              placeholder="Ex: Argilo-limoneux profond fertile"
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              field="PlantingDate"
              label={isAr ? 'تاريخ الغرس / البذر' : 'Date de plantation'}
              type="date"
              value={plantingDate}
              onChange={setPlantingDate}
              width="100%"
              height={40}
              corner={12}
            />

            <LabelInput
              field="ExpectedHarvestDate"
              label={isAr ? 'تاريخ الجني المتوقع' : 'Récolte estimée'}
              type="date"
              value={expectedHarvestDate}
              onChange={setExpectedHarvestDate}
              width="100%"
              height={40}
              corner={12}
            />

            <LabelSelect
              field="ParcelStatus"
              label={isAr ? 'الحالة الحالية' : 'Statut cultural'}
              value={status}
              onChange={(val) => setStatus(val as AgriParcelStatus)}
              options={[
                { value: 'Fallow', label: isAr ? 'بور / راحة' : 'En Repos (Jachère)' },
                { value: 'Planted', label: isAr ? 'بذر حديث' : 'Ensemencée' },
                { value: 'Growing', label: isAr ? 'قيد النمو' : 'En Végétation' },
                { value: 'Harvesting', label: isAr ? 'موسم الجني' : 'En Récolte' },
                { value: 'Damaged', label: isAr ? 'تلف / صقيع' : 'Sinistrée' },
              ]}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div>
            <LabelInput
              field="ParcelNotes"
              label={isAr ? 'ملاحظات وتوصيات agronomy' : 'Observations agronomiques'}
              value={notes}
              onChange={setNotes}
              placeholder="Ex: Programme de fertilisation NPK et analyses de sol validées..."
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--atr-divider)]">
            <Button
              type="button"
              onClick={onClose}
              tone="soft"
              size={40}
            >
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button tone="accent" size={40} type="submit">
              {initialData
                ? (isAr ? 'حفظ التعديلات' : 'Enregistrer les Modifications')
                : (isAr ? 'تأكيد وحفظ القطعة' : 'Créer le Passeport Parcelle')}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
