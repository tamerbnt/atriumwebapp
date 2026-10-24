import React, { useState } from 'react';
import {
  X,
  Boxes,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StockMovementVoucher, StockVoucherType } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: StockVoucherType;
  onSaved?: (voucher: StockMovementVoucher) => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  initialType = 'entree',
  onSaved,
}) => {
  const { t } = useTranslation();
  const { warehouses, products, createStockVoucher, allStockVouchers, currentUser } =
    useAtriumStore();

  const [type, setType] = useState<StockVoucherType>(initialType);
  const [depotSourceId, setDepotSourceId] = useState<string>(
    warehouses[0]?.id || 'depot_01'
  );
  const [depotTargetId, setDepotTargetId] = useState<string>(
    warehouses[1]?.id || ''
  );
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<
    | 'reception_achat'
    | 'ajustement_inventaire'
    | 'sortie_client'
    | 'consommation_interne'
    | 'rebut_casse'
    | 'transfert'
  >(type === 'entree' ? 'reception_achat' : type === 'sortie' ? 'sortie_client' : 'transfert');
  const [operatorName, setOperatorName] = useState<string>(
    currentUser?.fullName || 'Responsable Magasin'
  );
  const [notes, setNotes] = useState<string>('');

  // Items
  const [items, setItems] = useState<
    Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitCostDzd: number;
      unit: string;
    }>
  >([
    {
      productId: products[0]?.id || '',
      productName: products[0]?.name || '',
      quantity: 1,
      unitCostDzd: products[0]?.cost?.amount || 0,
      unit: products[0]?.unit || 'u',
    },
  ]);

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId: prod.id,
        productName: prod.name,
        unitCostDzd: prod.cost?.amount || prod.price?.amount || 0,
        unit: prod.unit || 'u',
      };
      return next;
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: products[0]?.id || '',
        productName: products[0]?.name || '',
        quantity: 1,
        unitCostDzd: products[0]?.cost?.amount || 0,
        unit: products[0]?.unit || 'u',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalValuation = items.reduce(
    (sum, it) => sum + (it.quantity || 0) * (it.unitCostDzd || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || items.some((it) => it.quantity <= 0)) {
      alert('Veuillez spécifier des quantités valides supérieures à zéro.');
      return;
    }

    const year = new Date().getFullYear();
    const count = allStockVouchers.length + 1;
    const prefix = type === 'entree' ? 'BE' : type === 'sortie' ? 'BS' : 'BT';
    const voucherNumber = `${prefix}-${year}-${count.toString().padStart(4, '0')}`;

    const sourceDepot = warehouses.find((w) => w.id === depotSourceId);
    const targetDepot = type === 'transfert' ? warehouses.find((w) => w.id === depotTargetId) : undefined;

    const payload: Omit<StockMovementVoucher, 'id' | 'createdAt'> = {
      tenantId: 'acc_01',
      facilityId: sourceDepot?.branchId || 'branch_trading_main',
      voucherNumber,
      type,
      date,
      depotSourceId,
      depotSourceName: sourceDepot?.name || 'Dépôt Source',
      depotTargetId: targetDepot?.id,
      depotTargetName: targetDepot?.name,
      reason,
      operatorName,
      items,
      totalValuationDzd: totalValuation,
      notes: notes.trim() || undefined,
    };

    const saved = createStockVoucher(payload);
    if (onSaved) onSaved(saved);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center font-bold">
              <Boxes size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {t('trading_stock_modal_title')}
              </h2>
              <p className="text-xs text-stone-500">
                {t('trading_stock_modal_sub')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Movement Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-2">
              {t('trading_stock_dir')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('entree');
                  setReason('reception_achat');
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'entree'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 text-stone-600 dark:text-stone-400'
                }`}
              >
                <TrendingUp size={16} />
                <span>{t('trading_stock_be')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('sortie');
                  setReason('sortie_client');
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'sortie'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 text-stone-600 dark:text-stone-400'
                }`}
              >
                <TrendingDown size={16} />
                <span>{t('trading_stock_bs')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('transfert');
                  setReason('transfert');
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'transfert'
                    ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A] font-bold'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 text-stone-600 dark:text-stone-400'
                }`}
              >
                <ArrowRight size={16} />
                <span>{t('trading_stock_bt')}</span>
              </button>
            </div>
          </div>

          {/* Depots & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/20">
            <div>
              <LabelSelect
                label={type === 'transfert' ? t('trading_stock_depot_source') : t('trading_stock_depot_concerned')}
                value={depotSourceId}
                onChange={(val) => setDepotSourceId(typeof val === 'string' ? val : val?.target?.value || val)}
                options={warehouses.map((w) => ({
                  value: w.id,
                  label: `${w.code} — ${w.name}`,
                }))}
              />
            </div>

            {type === 'transfert' ? (
              <div>
                <LabelSelect
                  label={t('trading_stock_depot_target')}
                  value={depotTargetId}
                  onChange={(val) => setDepotTargetId(typeof val === 'string' ? val : val?.target?.value || val)}
                  placeholder="-- Choisir le dépôt cible --"
                  options={warehouses
                    .filter((w) => w.id !== depotSourceId)
                    .map((w) => ({
                      value: w.id,
                      label: `${w.code} — ${w.name}`,
                    }))}
                />
              </div>
            ) : (
              <div>
                <LabelSelect
                  label={t('trading_stock_reason')}
                  value={reason}
                  onChange={(val) => setReason((typeof val === 'string' ? val : val?.target?.value || val) as any)}
                  options={
                    type === 'entree'
                      ? [
                          { value: 'reception_achat', label: 'Réception achat fournisseur' },
                          { value: 'ajustement_inventaire', label: 'Ajustement inventaire positif (+)' },
                        ]
                      : [
                          { value: 'sortie_client', label: 'Sortie livraison client' },
                          { value: 'consommation_interne', label: 'Consommation interne atelier/chantier' },
                          { value: 'rebut_casse', label: 'Rebut / Casse / Avarie (-)' },
                        ]
                  }
                />
              </div>
            )}

            <div>
              <LabelInput
                type="date"
                label={t('trading_stock_date')}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <LabelInput
                label={t('trading_stock_operator')}
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                {t('trading_stock_items_title')} ({items.length})
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#C4785A]/10 text-[#C4785A] hover:bg-[#C4785A]/20 transition-colors"
              >
                <Plus size={13} />
                <span>{t('trading_stock_add_item')}</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
                >
                  <div className="flex-1">
                    <select
                      className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5"
                      value={it.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku ? `[${p.sku}] ` : ''}{p.name} (Stock: {p.stockQuantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qté"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5 text-right font-mono"
                    />
                  </div>

                  <span className="text-xs text-stone-500 w-10 text-center">{it.unit}</span>

                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-stone-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <LabelInput
              label={t('trading_stock_observations')}
              placeholder="Ex: Entrée suite à livraison BR-2026-0028"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Total Valuation Footer */}
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs font-mono">
            <span className="text-stone-500">{t('trading_stock_est_valuation')}</span>
            <span className="text-stone-900 dark:text-stone-100 font-bold text-sm">
              {formatMoney(totalValuation)}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {t('trading_composer_btn_cancel')}
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#C4785A] hover:bg-[#b06749] text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle size={15} />
              <span>{t('trading_stock_btn_validate')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
