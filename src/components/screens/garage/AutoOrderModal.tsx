import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RepairOrder, VehicleAsset } from './garageData';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface AutoOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: VehicleAsset[];
  onSave: (order: RepairOrder) => void;
}

export const AutoOrderModal: React.FC<AutoOrderModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onSave,
}) => {
  const { language } = useAtriumStore();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [diagnostic, setDiagnostic] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('15000');
  const [technician, setTechnician] = useState('Karim (Chef Atelier)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
    if (!veh) {
      showToast('Veuillez sélectionner un véhicule', 'error');
      return;
    }

    const newOrder: RepairOrder = {
      id: `ro_${Date.now()}`,
      orderNumber: `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      vehiclePlate: veh.plateNumber,
      vehicleModel: `${veh.brand} ${veh.model}`,
      clientName: veh.ownerName,
      clientPhone: veh.ownerPhone,
      intakeDate: new Date().toISOString(),
      diagnosticNotes: diagnostic.trim() || 'Diagnostic standard et révision générale',
      status: 'Diagnostic',
      estimatedCostDzd: parseFloat(estimatedCost) || 15000,
      finalCostDzd: 0,
      partsUsed: [],
      technicianName: technician,
    };

    onSave(newOrder);
    showToast(
      language === 'ar'
        ? 'تم فتح أمر التصليح (OR) بنجاح'
        : 'Ordre de réparation (OR) créé avec succès',
      'success'
    );
    onClose();
  };

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.plateNumber} — ${v.brand} ${v.model} (${v.ownerName})`,
  }));

  const techOptions = [
    { value: 'Karim (Chef Atelier)', label: 'Karim (Chef Atelier)' },
    { value: 'Amine (Électricien)', label: 'Amine (Électricien)' },
    { value: 'Farid (Mécanicien)', label: 'Farid (Mécanicien)' },
    { value: 'Yassine (Tôlier / Peintre)', label: 'Yassine (Tôlier / Peintre)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
            {language === 'ar' ? 'أمر تصليح جديد (OR)' : 'Nouvel Ordre de Réparation (OR)'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelSelect
            label={language === 'ar' ? 'المركبة والماتريكيل' : 'Véhicule & Immatriculation'}
            value={vehicleId}
            onChange={setVehicleId}
            options={vehicleOptions}
          />

          <LabelInput
            label={language === 'ar' ? 'تشخيص العطل والشكوى' : 'Diagnostic préliminaire & panne'}
            value={diagnostic}
            onChange={(e) => setDiagnostic(e.target.value)}
            placeholder="Ex: Bruit suspect au freinage..."
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'التكلفة التقديرية (د.ج)' : 'Devis estimé (DA)'}
              type="number"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
            <LabelSelect
              label={language === 'ar' ? 'الميكانيكي المسؤول' : 'Technicien assigné'}
              value={technician}
              onChange={setTechnician}
              options={techOptions}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Plus size={14} />}>
              {language === 'ar' ? 'فتح أمر التصليح' : 'Créer l\'OR'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
