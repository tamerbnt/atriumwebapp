import React, { useState } from 'react';
import { Factory, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { ManufacturingBom, ManufacturingOrder } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface ManufacturingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  boms: ManufacturingBom[];
  onSave: (order: ManufacturingOrder) => void;
  orderToEdit?: ManufacturingOrder | null;
}

export const ManufacturingOrderModal: React.FC<ManufacturingOrderModalProps> = ({
  isOpen,
  onClose,
  boms,
  onSave,
  orderToEdit,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [bomId, setBomId] = useState(orderToEdit?.bomId || boms[0]?.id || '');
  const [quantity, setQuantity] = useState(orderToEdit ? String(orderToEdit.targetQuantity || orderToEdit.quantityOrdered || 10) : '10');
  const [dueDate, setDueDate] = useState(orderToEdit?.dueDate?.split('T')[0] || '2026-06-15');
  const [station, setStation] = useState(orderToEdit?.assignedStation || 'Ligne Assemblage Principal');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (orderToEdit) {
      setBomId(orderToEdit.bomId || boms[0]?.id || '');
      setQuantity(String(orderToEdit.targetQuantity || orderToEdit.quantityOrdered || 10));
      setDueDate(orderToEdit.dueDate ? orderToEdit.dueDate.split('T')[0] : '2026-06-15');
      setStation(orderToEdit.assignedStation || 'Ligne Assemblage Principal');
    } else {
      setBomId(boms[0]?.id || '');
      setQuantity('10');
      setDueDate('2026-06-15');
      setStation('Ligne Assemblage Principal');
    }
  }, [orderToEdit, boms]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bom = boms.find((b) => b.id === bomId) || boms[0];
    if (!bom) {
      showToast('Veuillez sélectionner une nomenclature (BOM)', 'error');
      return;
    }

    const qtyNum = parseInt(quantity, 10) || 1;
    const saved: ManufacturingOrder = {
      id: orderToEdit ? orderToEdit.id : `of_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
      orderNumber: orderToEdit ? orderToEdit.orderNumber : `OF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      bomId: bom.id,
      productName: bom.finishedProductName,
      targetQuantity: qtyNum,
      quantityOrdered: qtyNum,
      quantityProduced: orderToEdit?.quantityProduced || 0,
      quantityScrapped: orderToEdit?.quantityScrapped || 0,
      batchLotNumber: orderToEdit?.batchLotNumber || `LOT-2026-${Math.floor(100 + Math.random() * 900)}`,
      startDate: orderToEdit?.startDate || new Date().toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      targetDueDate: new Date(dueDate).toISOString(),
      status: orderToEdit?.status || 'Planned',
      assignedStation: station,
      totalMaterialCostDzd: (bom.estimatedCostDzd || 0) * qtyNum,
      totalLaborCostDzd: orderToEdit?.totalLaborCostDzd || 0,
      totalCostDzd: orderToEdit?.totalCostDzd || (bom.estimatedCostDzd || 0) * qtyNum,
      notes: notes.trim() || undefined,
      createdAt: orderToEdit?.createdAt || new Date().toISOString(),
    };


    onSave(saved);
    showToast(
      language === 'ar' ? 'تم إنشاء أمر التصنيع بنجاح' : 'Ordre de fabrication (OF) lancé avec succès',
      'success'
    );

    onClose();
  };

  const bomOptions = boms.map((b) => ({
    value: b.id,
    label: `${b.finishedProductName} (${b.bomCode})`,
  }));

  const stationOptions = [
    { value: 'Ligne Assemblage Principal', label: 'Ligne Assemblage Principal' },
    { value: 'Atelier Ébénisterie & Finition', label: 'Atelier Ébénisterie & Finition' },
    { value: 'Ligne Injection Plastique', label: 'Ligne Injection Plastique' },
    { value: 'Cellule Soudure & Chaudronnerie', label: 'Cellule Soudure & Chaudronnerie' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Factory size={16} />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {language === 'ar' ? 'أمر تصنيع جديد (OF)' : 'Nouvel Ordre de Fabrication (OF)'}
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
          <LabelSelect
            label={language === 'ar' ? 'المنتج النهائي والنومكلاتور (BOM)' : 'Produit & Nomenclature (BOM)'}
            value={bomId}
            onChange={setBomId}
            options={bomOptions}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'الكمية المطلوبة' : 'Quantité à fabriquer'}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <LabelInput
              label={language === 'ar' ? 'تاريخ التسليم المستهدف' : 'Date d\'échéance'}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <LabelSelect
            label={language === 'ar' ? 'محطة أو خط الإنتاج' : 'Poste / Ligne d\'assemblage'}
            value={station}
            onChange={setStation}
            options={stationOptions}
          />

          <LabelInput
            label={language === 'ar' ? 'ملاحظات وتوجيهات الورشة' : 'Instructions techniques'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Tolérance 0.5mm, contrôle renforcé..."
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Factory size={14} />}>
              {language === 'ar' ? 'إطلاق أمر التصنيع' : 'Lancer la Fabrication'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
