import React, { useState } from 'react';
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
}

export const AgricultureParcelModal: React.FC<AgricultureParcelModalProps> = ({
  isOpen,
  onClose,
  onSave,
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentCrop.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم القطعة والمحصول' : 'Veuillez saisir le nom de la parcelle et la culture', 'error');
      return;
    }

    const created: AgriParcel = {
      id: `parc_${Date.now()}`,
      accountId: 'acc_01',
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
      status: 'Growing',
      createdAt: new Date().toISOString(),
    };

    onSave(created);
    showToast(
      isAr ? 'تم تسجيل القطعة الفلاحية بنجاح' : 'Parcelle agricole enregistrée avec succès',
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
              <Sprout size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {isAr ? 'تسجيل قطعة فلاحية أو بيت بلاستيكي' : 'Nouvelle Parcelle / Serre Agricole'}
              </h2>
              <p className="text-xs text-neutral-500">
                {isAr ? 'إدراج المساحة بالهكتار ونظام الري والمحصول' : 'Superficie, mode d’irrigation et calendrier cultural'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelInput
            label={isAr ? 'اسم أو رقم القطعة / البيت *' : 'Nom ou Identifiant de la Parcelle / Serre *'}
            placeholder="Ex: Verger Sud - Oliviers Sigoise ou Serre N°04"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'المساحة (هكتار)' : 'Superficie (Hectares)'}
              type="number"
              step="0.1"
              value={surfaceHectares}
              onChange={(e) => setSurfaceHectares(e.target.value)}
              required
            />
            <LabelSelect
              label={isAr ? 'نظام السقي والري' : 'Mode d’Irrigation'}
              value={irrigationType}
              onChange={(e) => setIrrigationType(e.target.value as AgriParcel['irrigationType'])}
              options={[
                { value: 'Drip', label: 'Goutte-à-goutte (Drip)' },
                { value: 'Sprinkler', label: 'Aspersion' },
                { value: 'Pivot', label: 'Pivot Central' },
                { value: 'Rainfed', label: 'Bour (Pluvial)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'المحصول المزروع *' : 'Culture en Place *'}
              placeholder="Ex: Tomates, Blé Dur, Olives..."
              value={currentCrop}
              onChange={(e) => setCurrentCrop(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'طبيعة التربة' : 'Type de Sol / Terroir'}
              placeholder="Ex: Argilo-limoneux profond"
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'تاريخ الغرس' : 'Date de Semis / Plantation'}
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
            />
            <LabelInput
              label={isAr ? 'تاريخ الجني التقديري' : 'Récolte Prévisionnelle'}
              type="date"
              value={expectedHarvestDate}
              onChange={(e) => setExpectedHarvestDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="ghost" size="sm" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" type="submit">
              {isAr ? 'تأكيد التسجيل' : 'Enregistrer la Parcelle'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
