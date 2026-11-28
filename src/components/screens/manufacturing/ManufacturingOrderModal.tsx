import React, { useState, useMemo, useEffect } from 'react';
import { Factory, X, AlertTriangle, PackageCheck } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { ManufacturingBom, ManufacturingOrder } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { validateStockAvailabilityForOf, calculateBomCost } from '../../../utils/manufacturingRules';
import { captureBomSnapshot } from '../../../utils/manufacturingDepth';
import { dzdToCentimes, centimesToDzd } from '../../../utils/money';
import { useManufacturingData } from './manufacturingData';
import { KineticModalShell } from '../../ui/kinetic';

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
  const { materials } = useManufacturingData();

  const [bomId, setBomId] = useState(orderToEdit?.bomId || boms[0]?.id || '');
  const [quantity, setQuantity] = useState(
    orderToEdit ? String(orderToEdit.targetQuantity || orderToEdit.quantityOrdered || '') : ''
  );
  const [dueDate, setDueDate] = useState(orderToEdit?.dueDate?.split('T')[0] || '');
  const [station, setStation] = useState(orderToEdit?.assignedStation || 'Poste 03 - Découpe & Usinage CNC');
  const [clientName, setClientName] = useState(orderToEdit?.clientName || '');
  const [unitPieceRateDzd, setUnitPieceRateDzd] = useState(
    orderToEdit?.unitPieceRateCentimes ? String(centimesToDzd(orderToEdit.unitPieceRateCentimes)) : ''
  );
  const [notes, setNotes] = useState(orderToEdit?.notes || '');

  useEffect(() => {
    if (orderToEdit) {
      setBomId(orderToEdit.bomId || boms[0]?.id || '');
      setQuantity(String(orderToEdit.targetQuantity || orderToEdit.quantityOrdered || ''));
      setDueDate(orderToEdit.dueDate ? orderToEdit.dueDate.split('T')[0] : '');
      setStation(orderToEdit.assignedStation || 'Poste 03 - Découpe & Usinage CNC');
      setClientName(orderToEdit.clientName || '');
      setUnitPieceRateDzd(
        orderToEdit.unitPieceRateCentimes ? String(centimesToDzd(orderToEdit.unitPieceRateCentimes)) : ''
      );
      setNotes(orderToEdit.notes || '');
    } else {
      setBomId(boms[0]?.id || '');
      setQuantity('');
      setDueDate('');
      setStation('Poste 03 - Découpe & Usinage CNC');
      setClientName('');
      setUnitPieceRateDzd('');
      setNotes('');
    }
  }, [orderToEdit, boms]);

  const selectedBom = useMemo(() => {
    return boms.find((b) => b.id === bomId) || boms[0] || null;
  }, [boms, bomId]);

  const parsedQty = parseInt(quantity, 10) || 1;
  const stockCheck = useMemo(() => {
    if (!selectedBom || !selectedBom.components) {
      return { canFulfill: true, missingComponents: [] };
    }
    return validateStockAvailabilityForOf(selectedBom.components, parsedQty, materials);
  }, [selectedBom, parsedQty, materials]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBom) {
      showToast(isAr ? 'يرجى تحديد التركيبة (BOM)' : 'Veuillez sélectionner une nomenclature (BOM)', 'error');
      return;
    }
    const targetQty = parseInt(quantity, 10);
    if (!Number.isFinite(targetQty) || targetQty <= 0) {
      showToast(isAr ? 'يرجى إدخال كمية صالحة' : 'Veuillez saisir une quantité valide', 'error');
      return;
    }
    if (!dueDate) {
      showToast(isAr ? 'يرجى تحديد تاريخ التسليم' : "Veuillez saisir la date d'échéance", 'error');
      return;
    }
    const activeAccountId = (orderToEdit?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (orderToEdit?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    const batchYield = Math.max(1, selectedBom.batchYield || 1);
    const batchFactor = targetQty / batchYield;
    const bomBreakdown =
      (selectedBom.components?.length || 0) > 0 || (selectedBom.routingSteps?.length || 0) > 0
        ? calculateBomCost(
            selectedBom.components || [],
            selectedBom.routingSteps || [],
            batchYield,
            selectedBom.targetMarginPercent ?? 35
          )
        : null;
    const matCostDzd = bomBreakdown
      ? Math.round(bomBreakdown.totalMaterialCostDzd * batchFactor)
      : Math.round((selectedBom.estimatedCostDzd || 0) * batchFactor);
    const laborCostDzd =
      orderToEdit?.totalLaborCostDzd ??
      (bomBreakdown
        ? Math.round(bomBreakdown.totalLaborMachineCostDzd * batchFactor)
        : Math.round((selectedBom.standardLaborHours || 10) * 1200 * batchFactor));
    const parsedPieceRate = Math.max(0, parseFloat(unitPieceRateDzd) || 0);

    onSave({
      id: orderToEdit ? orderToEdit.id : `of_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      orderNumber: orderToEdit ? orderToEdit.orderNumber : `OF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      bomId: selectedBom.id,
      bomCode: selectedBom.bomCode,
      pinnedBomVersion: orderToEdit?.pinnedBomVersion ?? (selectedBom.version || 1),
      bomSnapshot: orderToEdit?.bomSnapshot ?? captureBomSnapshot(selectedBom),
      productName: selectedBom.finishedProductName,
      targetQuantity: targetQty,
      quantityOrdered: targetQty,
      actualQuantityProduced: orderToEdit?.actualQuantityProduced || orderToEdit?.quantityProduced || 0,
      quantityProduced: orderToEdit?.actualQuantityProduced || orderToEdit?.quantityProduced || 0,
      scrapQuantity: orderToEdit?.scrapQuantity || 0,
      batchLotNumber: orderToEdit?.batchLotNumber || `LOT-202610-${Math.floor(1000 + Math.random() * 9000)}`,
      startDate: orderToEdit?.startDate || new Date().toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      targetDueDate: new Date(dueDate).toISOString(),
      status: orderToEdit?.status || 'Planned',
      assignedStation: station,
      totalMaterialCostDzd: matCostDzd,
      totalLaborCostDzd: laborCostDzd,
      totalCostDzd: orderToEdit?.totalCostDzd ?? matCostDzd + laborCostDzd,
      unitPieceRateCentimes: parsedPieceRate > 0 ? dzdToCentimes(parsedPieceRate) : orderToEdit?.unitPieceRateCentimes,
      clientName: clientName.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: orderToEdit?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  const bomOptions = boms.map((b) => ({
    value: b.id,
    label: `${b.finishedProductName} (${b.bomCode} v${b.version || 1})`,
  }));

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      scrimClassName="bg-black/60"
      ariaLabel={
        orderToEdit
          ? isAr ? 'تعديل أمر التصنيع' : "Modifier l'Ordre de Fabrication"
          : isAr ? 'أمر تصنيع جديد (OF)' : 'Nouvel Ordre de Fabrication (OF)'
      }
    >
      <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 sm:p-7 [--sq-stroke:var(--sq-stroke-pop)] space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
            <div className="flex items-center gap-3">
              <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold">
                <Factory size={20} />
              </div>
              <div>
                <h3 className="font-semibold t-card text-black dark:text-white">
                  {orderToEdit
                    ? isAr ? 'تعديل أمر التصنيع' : "Modifier l'Ordre de Fabrication"
                    : isAr ? 'أمر تصنيع جديد (OF)' : 'Nouvel Ordre de Fabrication (OF)'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelSelect
            field="ofBomId"
            label={isAr ? 'المنتج النهائي والتركيبة (BOM)' : 'Produit & Nomenclature (BOM)'}
            value={bomId}
            onChange={setBomId}
            options={bomOptions}
            width="100%"
            height={40}
            corner={12}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="ofQuantity"
              label={isAr ? 'الكمية المستهدفة' : 'Quantité à fabriquer'}
              type="number"
              placeholder="10"
              value={quantity}
              onChange={setQuantity}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="ofDueDate"
              label={isAr ? 'تاريخ التسليم المستهدف' : "Date d'échéance atelier"}
              type="date"
              value={dueDate}
              onChange={setDueDate}
              width="100%"
              height={40}
              corner={12}
              required
            />
          </div>
          <div
            data-sq="card"
            data-sq-border="none"
            className={`p-4 t-cap flex items-start gap-3 transition-all ${
              stockCheck.canFulfill
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
            }`}
          >
            {stockCheck.canFulfill ? (
              <PackageCheck size={18} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <div className="font-semibold">
                {stockCheck.canFulfill
                  ? isAr ? 'المخزون متاح بالكامل لإطلاق الدفعة' : 'Matières premières disponibles en stock'
                  : isAr ? 'تنبيه: عجز جزئي في بعض المواد الأولية' : 'Attention : Stock insuffisant pour certains composants'}
              </div>
              <p className="t-cap opacity-90 mt-0.5">
                {stockCheck.canFulfill
                  ? isAr ? 'يمكن للمخزن تسليم إذن الصرف (BSM) فوراً' : 'Le magasinier peut éditer le Bon de Sortie (BSM) sans rupture.'
                  : isAr
                  ? `${stockCheck.missingComponents.length} مادة أولية تتطلب إعادة تموين`
                  : `${stockCheck.missingComponents.length} composant(s) sous le seuil requis.`}
              </p>
            </div>
          </div>
          <LabelSelect
            field="ofStation"
            label={isAr ? 'محطة أو خط التشغيل' : "Poste / Ligne d'assemblage"}
            value={station}
            onChange={setStation}
            options={[
              { value: 'Poste 03 - Découpe & Usinage CNC', label: 'Poste 03 - Découpe & Usinage CNC' },
              { value: 'Presse Injection Plastique 350T', label: 'Presse Injection Plastique 350T' },
              { value: 'Atelier Métallerie & Soudure MIG', label: 'Atelier Métallerie & Soudure MIG' },
              { value: 'Ligne Piqueuses Industrielles (Textile)', label: 'Ligne Piqueuses Industrielles (Textile)' },
              { value: 'Cabine Peinture & Vernis', label: 'Cabine Peinture & Vernis' },
              { value: 'Poste Contrôle Qualité Final', label: 'Poste Contrôle Qualité Final' },
            ]}
            width="100%"
            height={40}
            corner={12}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              field="ofClientName"
              label={isAr ? 'اسم العميل / الوجهة' : 'Client ou Destination'}
              value={clientName}
              onChange={setClientName}
              placeholder="Ex: Sonatrach, BNA, Sur stock..."
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="ofPieceRateDzd"
              label={isAr ? 'أجر القطعة (دج/وحدة)' : 'Tarif Pièce (DZD/u)'}
              type="number"
              step="any"
              value={unitPieceRateDzd}
              onChange={setUnitPieceRateDzd}
              placeholder="Ex: 250"
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="ofNotes"
              label={isAr ? 'تعليمات فنية للورشة' : 'Instructions techniques'}
              value={notes}
              onChange={setNotes}
              placeholder="Tolérances, priorité haute..."
              width="100%"
              height={40}
              corner={12}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" tone="accent" size={40} leading={<Factory size={15} />}>
              {isAr ? 'إطلاق أمر التصنيع' : "Lancer l'Ordre de Fabrication"}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
