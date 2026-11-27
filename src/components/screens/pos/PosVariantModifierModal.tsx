import React, { useEffect, useMemo, useState } from 'react';
import { Check, Scale, Sparkles } from 'lucide-react';
import {
  PosSelectedModifier,
  Product,
  ProductVariant,
} from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { Button } from '@/atrium/core';
import { getEffectiveProductOrVariantStock } from '../../../utils/posDepth';

interface PosVariantModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (selection: {
    product: Product;
    variant?: ProductVariant;
    modifiers: PosSelectedModifier[];
    weightKg?: number;
    quantity: number;
    unitPriceDzd: number;
    modifiersUnitDeltaDzd: number;
    notes?: string;
  }) => void;
}

export const PosVariantModifierModal: React.FC<PosVariantModifierModalProps> = ({
  isOpen,
  onClose,
  product,
  onConfirm,
}) => {
  const { language, isRtl, t } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [weightInput, setWeightInput] = useState<string>('1.000');
  const [qtyInput, setQtyInput] = useState<string>('1');
  const [lineNotes, setLineNotes] = useState<string>('');

  useEffect(() => {
    if (!product || !isOpen) return;
    const activeVariants = (product.variants || []).filter((v) => v.isActive !== false);
    const firstInStock = activeVariants.find((v) => v.stockQuantity > 0) || activeVariants[0];
    setSelectedVariantId(firstInStock?.id || '');

    const defaults: Record<string, string[]> = {};
    for (const grp of product.modifierGroups || []) {
      if (grp.required && grp.options[0]) {
        defaults[grp.id] = [grp.options[0].id];
      } else {
        defaults[grp.id] = [];
      }
    }
    setSelectedModifiers(defaults);
    setWeightInput('1.000');
    setQtyInput('1');
    setLineNotes('');
  }, [product, isOpen]);

  const activeVariant = useMemo(
    () => (product?.variants || []).find((v) => v.id === selectedVariantId),
    [product, selectedVariantId]
  );

  const chosenModifiers = useMemo<PosSelectedModifier[]>(() => {
    if (!product?.modifierGroups) return [];
    const list: PosSelectedModifier[] = [];
    for (const grp of product.modifierGroups) {
      const picked = selectedModifiers[grp.id] || [];
      for (const optId of picked) {
        const opt = grp.options.find((o) => o.id === optId);
        if (opt) {
          list.push({
            groupId: grp.id,
            groupName: grp.name,
            optionId: opt.id,
            optionName: opt.name,
            priceDeltaDzd: Number(opt.priceDeltaDzd || 0),
          });
        }
      }
    }
    return list;
  }, [product, selectedModifiers]);

  const modifiersUnitDeltaDzd = useMemo(
    () => chosenModifiers.reduce((s, m) => s + Number(m.priceDeltaDzd || 0), 0),
    [chosenModifiers]
  );

  const unitPriceDzd = useMemo(() => {
    if (!product) return 0;
    const base =
      activeVariant && activeVariant.priceDzd != null
        ? Number(activeVariant.priceDzd)
        : Number(product.price?.amount || 0);
    return Math.max(0, base + modifiersUnitDeltaDzd);
  }, [product, activeVariant, modifiersUnitDeltaDzd]);

  const effectiveQty = useMemo(() => {
    if (!product) return 1;
    if (product.isWeighted) {
      const w = parseFloat(weightInput.replace(',', '.'));
      return Number.isFinite(w) && w > 0 ? Number(w.toFixed(3)) : 0;
    }
    const q = parseInt(qtyInput, 10);
    return Number.isFinite(q) && q > 0 ? q : 1;
  }, [product, weightInput, qtyInput]);

  const availableStock = product
    ? getEffectiveProductOrVariantStock(product, activeVariant?.id)
    : 0;

  if (!product) return null;

  const toggleModifier = (groupId: string, optionId: string, mode: 'single' | 'multiple') => {
    setSelectedModifiers((prev) => {
      const cur = prev[groupId] || [];
      if (mode === 'single') {
        return { ...prev, [groupId]: [optionId] };
      }
      const next = cur.includes(optionId)
        ? cur.filter((id) => id !== optionId)
        : [...cur, optionId];
      return { ...prev, [groupId]: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveQty <= 0) return;
    onConfirm({
      product,
      variant: activeVariant,
      modifiers: chosenModifiers,
      weightKg: product.isWeighted ? effectiveQty : undefined,
      quantity: effectiveQty,
      unitPriceDzd,
      modifiersUnitDeltaDzd,
      notes: lineNotes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${product.name} · ${L('Options & Variant', 'Variantes & Options', 'الخيارات والأحجام')}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        {Array.isArray(product.variants) && product.variants.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between t-small font-semibold text-black/70 dark:text-white/75">
              <span>{L('Select Variant / Size', 'Choisir la variante / taille', 'اختر المقاس أو النوع')}</span>
              <span className="t-cap tabular-nums text-black/55 dark:text-white/55">
                {L('Available:', 'Disponible :', 'المتوفر:')} {availableStock} {product.unit || 'pcs'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {product.variants.map((v) => {
                const selected = v.id === selectedVariantId;
                const vPrice = v.priceDzd != null ? v.priceDzd : product.price.amount;
                const isOut = v.stockQuantity <= 0 || v.isActive === false;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    data-sq="ctl"
                    data-sq-border="solid"
                    className={`p-2.5 text-start cursor-pointer transition-colors ${
                      selected
                        ? 'bg-[var(--brand-fill,#C9461F)] text-white [--sq-stroke:transparent]'
                        : isOut
                        ? 'bg-[#F5F1EC] dark:bg-[#191716] text-black/45 dark:text-white/45'
                        : 'bg-[#F5F1EC] dark:bg-[#22201E] text-black dark:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825]'
                    }`}
                  >
                    <div className="t-small font-semibold truncate">{v.label}</div>
                    <div className="flex items-center justify-between t-cap tabular-nums mt-0.5 opacity-90">
                      <span>{formatMoney(vPrice)}</span>
                      <span>
                        {isOut ? L('Out', 'Rupt.', 'نفذ') : `${v.stockQuantity}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {Array.isArray(product.modifierGroups) && product.modifierGroups.length > 0 && (
          <div className="space-y-3">
            {product.modifierGroups.map((grp) => {
              const picked = selectedModifiers[grp.id] || [];
              return (
                <div key={grp.id} className="space-y-1.5">
                  <div className="flex items-center justify-between t-small font-semibold text-black/70 dark:text-white/75">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                      {grp.name}
                    </span>
                    <span className="t-cap text-black/50 dark:text-white/50">
                      {!grp.multiSelect
                        ? L('Single choice', 'Choix unique', 'خيار واحد')
                        : L('Multiple', 'Multi-choix', 'متعدد')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {grp.options.map((opt) => {
                      const active = picked.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleModifier(grp.id, opt.id, grp.multiSelect ? 'multiple' : 'single')}
                          data-sq="ctl-sm"
                          data-sq-border="solid"
                          className={`px-3 py-1.5 t-small font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            active
                              ? 'bg-neutral-900 dark:bg-white text-white dark:text-black [--sq-stroke:transparent]'
                              : 'bg-[#F5F1EC] dark:bg-[#22201E] text-black dark:text-white hover:bg-[#EFE9E2]'
                          }`}
                        >
                          {active && <Check size={12} />}
                          <span>{opt.name}</span>
                          {opt.priceDeltaDzd > 0 && (
                            <span className="t-cap tabular-nums opacity-80">
                              +{formatMoney(opt.priceDeltaDzd)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {product.isWeighted ? (
            <LabelInput
              field="WeightKg"
              label={L('Net Weight (kg)', 'Poids net (kg)', 'الوزن الصافي (كغ)')}
              type="number"
              step="0.005"
              min="0.01"
              value={weightInput}
              onChange={setWeightInput}
              prefix={<Scale size={15} className="text-[var(--brand-text,#BF431F)]" />}
              width="100%"
              height={40}
              corner={12}
            />
          ) : (
            <LabelInput
              field="LineQty"
              label={L('Quantity', 'Quantité', 'الكمية')}
              type="number"
              min="1"
              value={qtyInput}
              onChange={setQtyInput}
              width="100%"
              height={40}
              corner={12}
            />
          )}
          <LabelInput
            field="LineKitchenNote"
            label={L('Kitchen / prep note', 'Note cuisine / préparation', 'ملاحظة التحضير')}
            value={lineNotes}
            onChange={setLineNotes}
            placeholder={L('e.g. Well done, no onion', 'Ex: Bien cuit, sans oignon', 'مثال: بدون بصل')}
            width="100%"
            height={40}
            corner={12}
          />
        </div>

        <div
          data-sq="card"
          data-sq-border="none"
          className="p-3.5 bg-[#F5F1EC] dark:bg-[#191716] flex items-center justify-between tabular-nums"
        >
          <div>
            <div className="t-cap text-black/55 dark:text-white/55">
              {L('Unit Snapshot', 'Prix unitaire figé', 'سعر الوحدة')}
            </div>
            <div className="t-small font-semibold text-black dark:text-white">
              {formatMoney(unitPriceDzd)} × {effectiveQty} {product.isWeighted ? 'kg' : product.unit || 'pcs'}
            </div>
          </div>
          <div className="text-end">
            <div className="t-cap text-black/55 dark:text-white/55">
              {L('Line Total', 'Total ligne', 'إجمالي السطر')}
            </div>
            <div className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
              {formatMoney(Math.round(unitPriceDzd * effectiveQty))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
          <Button type="button" tone="soft" size={40} onClick={onClose}>
            {t('action_cancel')}
          </Button>
          <Button type="submit" tone="accent" size={40}>
            {L('Add to Order', 'Ajouter à la commande', 'إضافة للطلب')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
