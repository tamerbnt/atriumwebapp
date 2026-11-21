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
import { AtriumButton } from '../../ui/AtriumButton';
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
      <div className="sq-elev-pop relative w-full max-w-2xl my-auto">
      <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--atr-divider)] bg-[#F5F1EC]/70 dark:bg-[#22201E] shrink-0">
          <div className="flex items-center gap-3">
            <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold">
              <Boxes size={20} />
            </div>
            <div>
              <h2 className="t-pod font-semibold text-black dark:text-white">
                {t('trading_stock_modal_title')}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            data-sq="ctl-sm"
            data-sq-border="none"
            className="p-2 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 t-body">
          {/* Movement Type Switcher */}
          <div>
            <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-2">
              {t('trading_stock_dir')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('entree');
                  setReason('reception_achat');
                }}
                data-sq="ctl"
                data-sq-border={type === 'entree' ? 'solid' : 'none'}
                className={`flex items-center justify-center gap-2 p-3 t-small font-semibold transition-all ${
                  type === 'entree'
                    ? '[--sq-stroke:#10B981] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EAE1D8] dark:hover:bg-[#332F2B] text-black/70 dark:text-white/75'
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
                data-sq="ctl"
                data-sq-border={type === 'sortie' ? 'solid' : 'none'}
                className={`flex items-center justify-center gap-2 p-3 t-small font-semibold transition-all ${
                  type === 'sortie'
                    ? '[--sq-stroke:#F43F5E] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold'
                    : 'bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EAE1D8] dark:hover:bg-[#332F2B] text-black/70 dark:text-white/75'
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
                data-sq="ctl"
                data-sq-border={type === 'transfert' ? 'solid' : 'none'}
                className={`flex items-center justify-center gap-2 p-3 t-small font-semibold transition-all ${
                  type === 'transfert'
                    ? '[--sq-stroke:#d4522f] bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold'
                    : 'bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EAE1D8] dark:hover:bg-[#332F2B] text-black/70 dark:text-white/75'
                }`}
              >
                <ArrowRight size={16} />
                <span>{t('trading_stock_bt')}</span>
              </button>
            </div>
          </div>

          {/* Depots & Reason */}
          <div data-sq="card" data-sq-border="none" className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F5F1EC]/70 dark:bg-[#22201E]">
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
              <h3 className="t-small font-semibold text-black/70 dark:text-white/75">
                {t('trading_stock_items_title')} ({items.length})
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                data-sq="ctl-sm"
                data-sq-border="none"
                className="inline-flex items-center gap-1 px-2.5 py-1 t-small font-medium bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:bg-[#d4522f]/20 transition-colors"
              >
                <Plus size={13} />
                <span>{t('trading_stock_add_item')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  data-sq="card"
                  data-sq-border="none"
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 bg-[#F5F1EC]/60 dark:bg-[#22201E]"
                >
                  <div className="sm:col-span-8">
                    <LabelSelect
                      label="Article"
                      value={it.productId}
                      onChange={(val) => handleProductSelect(idx, typeof val === 'string' ? val : val?.target?.value || val)}
                      options={products.map((p) => ({
                        value: p.id,
                        label: `${p.sku ? `[${p.sku}] ` : ''}${p.name} (Stock: ${p.stockQuantity})`,
                      }))}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <LabelInput
                      type="number"
                      min="1"
                      label={`Qté (${it.unit})`}
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={items.length <= 1}
                      className="p-2 text-black/55 dark:text-white/55 hover:text-rose-600 disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
          <div data-sq="ctl" data-sq-border="none" className="p-3 bg-[#F3EDE7] dark:bg-[#22201E] flex items-center justify-between t-cap tabular-nums">
            <span className="text-black/55 dark:text-white/55">{t('trading_stock_est_valuation')}</span>
            <span className="text-black dark:text-white font-semibold t-label">
              {formatMoney(totalValuation)}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
            <AtriumButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              {t('trading_composer_btn_cancel')}
            </AtriumButton>

            <AtriumButton
              type="submit"
              variant="primary"
              size="sm"
              icon={<CheckCircle size={15} />}
            >
              {t('trading_stock_btn_validate')}
            </AtriumButton>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};
