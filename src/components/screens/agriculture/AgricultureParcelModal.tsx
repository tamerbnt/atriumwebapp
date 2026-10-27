import React, { useState, useEffect } from 'react';
import { Sprout, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { AgriParcel } from '../../../types';
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
  const [surfaceHectares, setSurfaceHectares] = useState('5.0');
  const [irrigationType, setIrrigationType] = useState<AgriParcel['irrigationType']>('Drip');
  const [soilType, setSoilType] = useState('Argilo-limoneux fertile');
  const [currentCrop, setCurrentCrop] = useState('');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('2026-10-30');
  const [status, setStatus] = useState<AgriParcel['status']>('Growing');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSurfaceHectares(String(initialData.surfaceHectares));
      setIrrigationType(initialData.irrigationType);
      setSoilType(initialData.soilType);
      setCurrentCrop(initialData.currentCrop || '');
      setPlantingDate(initialData.plantingDate || new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate(initialData.expectedHarvestDate || '2026-10-30');
      setStatus(initialData.status);
    } else {
      setName('');
      setSurfaceHectares('5.0');
      setIrrigationType('Drip');
      setSoilType('Argilo-limoneux fertile');
      setCurrentCrop('');
      setPlantingDate(new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate('2026-10-30');
      setStatus('Growing');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentCrop.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم القطعة والمحصول' : 'Veuillez saisir le nom de la parcelle et la culture', 'error');
      return;
    }

    const payload: AgriParcel = {
      id: initialData?.id || `parc_${Date.now()}`,
      accountId: initialData?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: name.trim(),
      surfaceHectares: parseFloat(surfaceHectares) || 1.0,
      irrigationType,
      soilType: soilType.trim(),
      currentCrop: currentCrop.trim(),
      plantingDate,
      expectedHarvestDate,
      status,
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
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <Sprout size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {initialData
                  ? (isAr ? 'تعديل بيانات القطعة الفلاحية' : 'Modifier la Parcelle Agricole')
                  : (isAr ? 'إضافة قطعة فلاحية جديدة' : 'Nouvelle Parcelle Agricole')}
              </h2>
              <p className="text-xs text-neutral-500">
                {isAr ? 'تحديد المساحة ونظام السقي والمحصول' : 'Définition de la surface, mode d’irrigation et culture'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelInput
            label={isAr ? 'اسم أو تعيين القطعة *' : 'Nom ou Identifiant Parcelle *'}
            placeholder="Ex: Verger Sud, Serre Multi-chapelle B3, Parcelle Céréalière..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'المساحة (هكتار)' : 'Surface (Hectares)'}
              type="number"
              step="0.1"
              value={surfaceHectares}
              onChange={(e) => setSurfaceHectares(e.target.value)}
              required
            />
            <LabelSelect
              label={isAr ? 'نظام الري' : 'Système d’Irrigation'}
              value={irrigationType}
              onChange={(e) => setIrrigationType(e.target.value as AgriParcel['irrigationType'])}
              options={[
                { value: 'Drip', label: 'Goutte-à-goutte (Drip)' },
                { value: 'Pivot', label: 'Pivot d’arrosage' },
                { value: 'Gravity', label: 'Gravitaire / Submersion' },
                { value: 'Rainfed', label: 'Bour (Pluvial)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'المحصول المزروع *' : 'Culture en Place *'}
              placeholder="Ex: Tomate industrielle, Oranges..."
              value={currentCrop}
              onChange={(e) => setCurrentCrop(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'نوعية التربة' : 'Type de Sol'}
              placeholder="Ex: Argilo-limoneux, Calcaire..."
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'تاريخ الغرس / البذر' : 'Date de Semis / Plantation'}
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
            />
            <LabelInput
              label={isAr ? 'تاريخ الحصاد / الجني المتوقع' : 'Récolte Prévisionnelle'}
              type="date"
              value={expectedHarvestDate}
              onChange={(e) => setExpectedHarvestDate(e.target.value)}
            />
          </div>

          <LabelSelect
            label={isAr ? 'حالة القطعة' : 'Statut de la Parcelle'}
            value={status}
            onChange={(e) => setStatus(e.target.value as AgriParcel['status'])}
            options={[
              { value: 'Growing', label: 'En Végétation (Growing)' },
              { value: 'Harvesting', label: 'En Récolte (Harvesting)' },
              { value: 'Fallow', label: 'En Jachère (Fallow)' },
              { value: 'Preparation', label: 'En Préparation de Sol' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="ghost" size="sm" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" type="submit">
              {initialData ? (isAr ? 'حفظ التعديلات' : 'Enregistrer') : (isAr ? 'تسجيل القطعة' : 'Enregistrer la Parcelle')}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
