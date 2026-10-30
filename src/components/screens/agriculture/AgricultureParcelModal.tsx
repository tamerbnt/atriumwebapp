import React, { useState, useEffect } from 'react';
import { Sprout, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { AgriParcel, AgriTenureType, AgriIrrigationType, AgriParcelStatus } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

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
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';

  const [name, setName] = useState('');
  const [code, setCode] = useState('P-01');
  const [tenureType, setTenureType] = useState<AgriTenureType>('concession_loi_10_03');
  const [cadastralSection, setCadastralSection] = useState('Section 04, Îlot 12');
  const [cadastralDeedRef, setCadastralDeedRef] = useState('Acte Notarié N° 1048/2012');
  const [surfaceHectares, setSurfaceHectares] = useState('5.0');
  const [irrigationType, setIrrigationType] = useState<AgriIrrigationType>('Drip');
  const [anrhAnnualQuotaM3, setAnrhAnnualQuotaM3] = useState('50000');
  const [soilType, setSoilType] = useState('Argilo-limoneux fertile');
  const [currentCrop, setCurrentCrop] = useState('');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('2026-10-30');
  const [status, setStatus] = useState<AgriParcelStatus>('Growing');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code || 'P-01');
      setTenureType(initialData.tenureType || 'concession_loi_10_03');
      setCadastralSection(initialData.cadastralSection || '');
      setCadastralDeedRef(initialData.cadastralDeedRef || '');
      setSurfaceHectares(String(initialData.surfaceHectares));
      setIrrigationType(initialData.irrigationType);
      setAnrhAnnualQuotaM3(String(initialData.anrhAnnualQuotaM3 || 50000));
      setSoilType(initialData.soilType);
      setCurrentCrop(initialData.currentCrop || '');
      setPlantingDate(initialData.plantingDate || new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate(initialData.expectedHarvestDate || '2026-10-30');
      setStatus(initialData.status);
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setCode(`P-0${Math.floor(1 + Math.random() * 9)}`);
      setTenureType('concession_loi_10_03');
      setCadastralSection('Section 04, Îlot 12');
      setCadastralDeedRef('Acte Notarié N° 1048/2012');
      setSurfaceHectares('5.0');
      setIrrigationType('Drip');
      setAnrhAnnualQuotaM3('50000');
      setSoilType('Argilo-limoneux fertile');
      setCurrentCrop('');
      setPlantingDate(new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate('2026-10-30');
      setStatus('Growing');
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentCrop.trim()) {
      showToast(
        isAr ? 'يرجى إدخال اسم القطعة والمحصول' : 'Veuillez saisir le nom de la parcelle et la culture',
        'error'
      );
      return;
    }

    const payload: AgriParcel = {
      id: initialData?.id || `parc_${Date.now()}`,
      accountId: initialData?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: name.trim(),
      code: code.trim(),
      tenureType,
      cadastralSection: cadastralSection.trim(),
      cadastralDeedRef: cadastralDeedRef.trim(),
      surfaceHectares: parseFloat(surfaceHectares) || 1.0,
      irrigationType,
      anrhAnnualQuotaM3: parseFloat(anrhAnnualQuotaM3) || 50000,
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
    showToast(
      initialData
        ? (isAr ? 'تم تحديث القطعة الفلاحية بنجاح' : 'Parcelle agricole mise à jour avec succès')
        : (isAr ? 'تم تسجيل القطعة الفلاحية بنجاح' : 'Parcelle agricole enregistrée avec succès'),
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Sprout size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {initialData
                  ? (isAr ? 'تعديل بيانات القطعة الفلاحية' : 'Modifier la Parcelle Agricole')
                  : (isAr ? 'تسجيل قطعة فلاحية / امتياز جديد' : 'Nouvelle Parcelle Agricole & Cadastre')}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'سند الامتياز (قانون 10-03)، المخطط المساحي، نوع التربة وحصة المياه ANRH'
                  : 'Passeport foncier Loi 10-03, sol, système d\'irrigation et quota ANRH'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <LabelInput
                label={isAr ? 'اسم القطعة أو الحقل' : 'Désignation de la parcelle'}
                value={name}
                onChange={setName}
                placeholder="Ex: Verger Nord - Orangers Thomson"
                required
              />
            </div>
            <LabelInput
              label={isAr ? 'الرمز الداخلي' : 'Code'}
              value={code}
              onChange={setCode}
              placeholder="Ex: P-01"
            />
          </div>

          {/* Cadastre & Concession Loi 10-03 */}
          <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
            <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
              {isAr ? 'البيانات العقارية والمسح الفلاحي' : 'Régime Foncier & Concession (Loi 10-03)'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelSelect
                label={isAr ? 'طبيعة الحيازة' : 'Régime foncier'}
                value={tenureType}
                onChange={(val) => setTenureType(val as AgriTenureType)}
                options={[
                  { value: 'concession_loi_10_03', label: isAr ? 'امتياز فلاحي (قانون 10-03)' : 'Concession Loi 10-03 (40 ans)' },
                  { value: 'propriete_melk', label: isAr ? 'ملكية خاصة (ملك)' : 'Propriété Privée (Melk)' },
                  { value: 'fermage_location', label: isAr ? 'عقد إيجار / مزارعة' : 'Fermage / Location Privée' },
                ]}
              />

              <LabelInput
                label={isAr ? 'القسم والجزيرة العقارية' : 'Section & Îlot cadastral'}
                value={cadastralSection}
                onChange={setCadastralSection}
                placeholder="Ex: Section 04, Îlot 12"
              />

              <LabelInput
                label={isAr ? 'رقم العقد التوثيقي / الدفتر' : 'Réf. Acte / Livret Foncier'}
                value={cadastralDeedRef}
                onChange={setCadastralDeedRef}
                placeholder="Ex: Acte N° 1048/2012"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              label={isAr ? 'المساحة (هكتار)' : 'Superficie (Ha)'}
              type="number"
              step="0.1"
              value={surfaceHectares}
              onChange={setSurfaceHectares}
              required
            />

            <LabelSelect
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
            />

            <LabelInput
              label={isAr ? 'حصة مياه البئر ANRH (م³)' : 'Quota Forage ANRH (m³)'}
              type="number"
              value={anrhAnnualQuotaM3}
              onChange={setAnrhAnnualQuotaM3}
              placeholder="Ex: 50000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'المحصول المزروع' : 'Culture actuelle'}
              value={currentCrop}
              onChange={setCurrentCrop}
              placeholder="Ex: Oranges Thomson & Clémentines"
              required
            />

            <LabelInput
              label={isAr ? 'نوع التربة والخصوبة' : 'Pédologie & Type de sol'}
              value={soilType}
              onChange={setSoilType}
              placeholder="Ex: Argilo-limoneux profond fertile"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              label={isAr ? 'تاريخ الغرس / البذر' : 'Date de plantation'}
              type="date"
              value={plantingDate}
              onChange={setPlantingDate}
            />

            <LabelInput
              label={isAr ? 'تاريخ الجني المتوقع' : 'Récolte estimée'}
              type="date"
              value={expectedHarvestDate}
              onChange={setExpectedHarvestDate}
            />

            <LabelSelect
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
            />
          </div>

          <div>
            <LabelInput
              label={isAr ? 'ملاحظات وتوصيات agronomy' : 'Observations agronomiques'}
              value={notes}
              onChange={setNotes}
              placeholder="Ex: Programme de fertilisation NPK et analyses de sol validées..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Annuler'}
            </button>
            <AtriumButton variant="primary" type="submit">
              {initialData
                ? (isAr ? 'حفظ التعديلات' : 'Enregistrer les Modifications')
                : (isAr ? 'تأكيد وحفظ القطعة' : 'Créer le Passeport Parcelle')}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
