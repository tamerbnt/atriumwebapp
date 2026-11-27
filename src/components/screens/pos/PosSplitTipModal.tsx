import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Coins,
  CreditCard,
  LockOpen,
  Split,
  Truck,
  User,
} from 'lucide-react';
import {
  PaymentDetail,
  PosOrderChannel,
  StaffMember,
} from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { computeSplitBillShares, SplitBillShareInput } from '../../../utils/posDepth';
import { useTranslation } from '../../../utils/useTranslation';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { Button } from '@/atrium/core';

interface PosSplitTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotalDzd: number;
  discountDzd: number;
  taxDzd: number;
  orderChannel: PosOrderChannel;
  onOrderChannelChange?: (ch: PosOrderChannel) => void;
  tableLabel?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialDeliveryAddress?: string;
  initialDeliveryCourier?: string;
  initialDeliveryFeeDzd?: number;
  hasCustomerSelected: boolean;
  hasOpenCashSession: boolean;
  onQuickOpenCashDrawer: () => void;
  staff: StaffMember[];
  itemTotalsForByItems?: Array<{ id: string; label: string; itemTotalDzd: number }>;
  onConfirm: (payload: {
    paymentMethod: 'Cash' | 'Card' | 'MemberBalance' | 'BankTransfer' | 'Split' | 'Credit';
    payments?: PaymentDetail[];
    tipAmount: number;
    orderChannel: PosOrderChannel;
    deliveryAddress?: string;
    deliveryCourier?: string;
    deliveryFee: number;
    amountTendered: number;
    changeGiven: number;
    cashierName: string;
    customerPhone?: string;
    notes?: string;
  }) => void;
}

export const PosSplitTipModal: React.FC<PosSplitTipModalProps> = ({
  isOpen,
  onClose,
  subtotalDzd,
  discountDzd,
  taxDzd,
  orderChannel,
  onOrderChannelChange,
  tableLabel,
  initialCustomerPhone = '',
  initialDeliveryAddress = '',
  initialDeliveryCourier = '',
  initialDeliveryFeeDzd = 0,
  hasCustomerSelected,
  hasOpenCashSession,
  onQuickOpenCashDrawer,
  staff,
  itemTotalsForByItems,
  onConfirm,
}) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const [settlementMode, setSettlementMode] = useState<'single' | 'split'>('single');
  const [singleMethod, setSingleMethod] = useState<
    'Cash' | 'Card' | 'BankTransfer' | 'MemberBalance' | 'Credit'
  >('Cash');
  const [tipInput, setTipInput] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState<string>(initialDeliveryAddress);
  const [deliveryCourier, setDeliveryCourier] = useState<string>(initialDeliveryCourier);
  const [deliveryFee, setDeliveryFee] = useState<number>(initialDeliveryFeeDzd);

  const [splitMode, setSplitMode] = useState<'equal' | 'by_items' | 'custom'>('equal');
  const [splitCount, setSplitCount] = useState<number>(2);
  const [customShares, setCustomShares] = useState<SplitBillShareInput[]>([
    { id: 'g1', label: 'Guest 1', paymentMethod: 'Cash', customAmountDzd: 0 },
    { id: 'g2', label: 'Guest 2', paymentMethod: 'Card', customAmountDzd: 0 },
  ]);

  const [tenderedInput, setTenderedInput] = useState<string>('');
  const [cashierName, setCashierName] = useState<string>(staff[0]?.fullName || 'Cashier Desk');
  const [customerPhone, setCustomerPhone] = useState<string>(initialCustomerPhone);
  const [notes, setNotes] = useState<string>('');

  const effectiveDeliveryFee = orderChannel === 'delivery' ? Math.max(0, deliveryFee || 0) : 0;

  const splitComputation = useMemo(() => {
    const shareTemplates: SplitBillShareInput[] =
      splitMode === 'by_items' && itemTotalsForByItems && itemTotalsForByItems.length > 0
        ? itemTotalsForByItems.map((it, idx) => ({
            id: it.id,
            label: it.label,
            paymentMethod: customShares[idx]?.paymentMethod || 'Cash',
            itemTotalDzd: it.itemTotalDzd,
          }))
        : customShares;

    return computeSplitBillShares({
      billSubtotalDzd: subtotalDzd,
      discountDzd,
      taxDzd,
      deliveryFeeDzd: effectiveDeliveryFee,
      tipDzd: tipInput,
      mode: splitMode,
      splitCount,
      shares: shareTemplates,
    });
  }, [
    subtotalDzd,
    discountDzd,
    taxDzd,
    effectiveDeliveryFee,
    tipInput,
    splitMode,
    splitCount,
    customShares,
    itemTotalsForByItems,
  ]);

  const payableDzd = splitComputation.totalPayableDzd;
  const numericTendered = useMemo(() => {
    const n = parseFloat(tenderedInput);
    return Number.isFinite(n) && n > 0 ? n : payableDzd;
  }, [tenderedInput, payableDzd]);

  const changeDue =
    settlementMode === 'single' && singleMethod === 'Cash'
      ? Math.max(0, numericTendered - payableDzd)
      : 0;

  const usesCash =
    settlementMode === 'single'
      ? singleMethod === 'Cash'
      : splitComputation.shares.some((s) => s.paymentMethod === 'Cash' && s.amountDzd > 0);

  const handleConfirmClick = () => {
    if (settlementMode === 'split' && !splitComputation.isBalanced) return;
    if (usesCash && !hasOpenCashSession) return;

    const payments: PaymentDetail[] | undefined =
      settlementMode === 'split'
        ? splitComputation.shares
            .filter((s) => s.amountDzd > 0)
            .map((s) => ({
              method: s.paymentMethod as any,
              amount: s.amountDzd,
              reference: s.label,
            }))
        : undefined;

    onConfirm({
      paymentMethod: settlementMode === 'split' ? 'Split' : singleMethod,
      payments,
      tipAmount: Math.max(0, tipInput || 0),
      orderChannel,
      deliveryAddress: orderChannel === 'delivery' ? deliveryAddress.trim() || undefined : undefined,
      deliveryCourier: orderChannel === 'delivery' ? deliveryCourier.trim() || undefined : undefined,
      deliveryFee: effectiveDeliveryFee,
      amountTendered: settlementMode === 'single' && singleMethod === 'Cash' ? numericTendered : payableDzd,
      changeGiven: changeDue,
      cashierName,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('shop_modal_checkout_title')}
    >
      <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Channel selector + Table tag */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="t-small font-semibold text-black/70 dark:text-white/75">
              {L('Order Channel', 'Canal de commande', 'قناة الطلب')}
            </span>
            {tableLabel && (
              <span className="t-cap font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {tableLabel}
              </span>
            )}
          </div>
          <LiveSegmentedControl
            value={orderChannel}
            onValueChange={(v) => onOrderChannelChange?.(v as PosOrderChannel)}
            options={[
              { value: 'counter', label: L('Counter', 'Comptoir', 'الكونتوار') },
              { value: 'dine_in', label: L('Dine-in', 'Sur place', 'في الصالة') },
              { value: 'takeaway', label: L('Takeaway', 'À emporter', 'سفري') },
              { value: 'delivery', label: L('Delivery', 'Livraison', 'توصيل') },
            ]}
            fullWidth
          />
        </div>

        {orderChannel === 'delivery' && (
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-3 bg-[#F5F1EC] dark:bg-[#191716] space-y-2.5"
          >
            <div className="flex items-center gap-1.5 t-small font-semibold text-black dark:text-white">
              <Truck size={14} className="text-[var(--brand-text,#BF431F)]" />
              <span>{L('Delivery Dispatch Details', 'Détails de livraison', 'بيانات التوصيل')}</span>
            </div>
            <LabelInput
              field="DelivAddress"
              label={L('Delivery Address', 'Adresse de livraison', 'عنوان التوصيل')}
              value={deliveryAddress}
              onChange={setDeliveryAddress}
              placeholder="Résidence El-Biar, Alger"
              width="100%"
              height={38}
              corner={10}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <LabelInput
                field="DelivCourier"
                label={L('Courier / Driver', 'Livreur', 'الموصل')}
                value={deliveryCourier}
                onChange={setDeliveryCourier}
                placeholder="Karim Express"
                width="100%"
                height={38}
                corner={10}
              />
              <LabelInput
                field="DelivFee"
                label={L('Delivery Fee (DA)', 'Frais de livraison (DA)', 'رسوم التوصيل (د.ج)')}
                type="number"
                min="0"
                value={String(deliveryFee)}
                onChange={(v) => setDeliveryFee(parseFloat(v) || 0)}
                width="100%"
                height={38}
                corner={10}
              />
            </div>
          </div>
        )}

        {/* Tip selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between t-small font-semibold text-black/70 dark:text-white/75">
            <span>{L('Tip / Gratuity (Optional)', 'Pourboire (Optionnel)', 'الإكرامية (اختياري)')}</span>
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
              {tipInput > 0 ? `+${formatMoney(tipInput)}` : formatMoney(0)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[0, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTipInput(amt)}
                data-sq="ctl-sm"
                data-sq-border="solid"
                className={`px-3 py-1.5 t-small font-semibold tabular-nums cursor-pointer ${
                  tipInput === amt
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black [--sq-stroke:transparent]'
                    : 'bg-[#F5F1EC] dark:bg-[#22201E] text-black dark:text-white'
                }`}
              >
                {amt === 0 ? L('No Tip', 'Sans', 'بدون') : `+${amt} DA`}
              </button>
            ))}
            <input
              type="number"
              min="0"
              aria-label={L('Custom tip amount', 'Montant pourboire personnalisé', 'مبلغ الإكرامية')}
              value={tipInput || ''}
              onChange={(e) => setTipInput(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder={L('Custom DA', 'Autre DA', 'مبلغ آخر')}
              className="w-24 h-8 px-2.5 t-cap rounded-[var(--r-ctl-sm,10px)] bg-[#F5F1EC] dark:bg-[#2B2825] tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]/30"
            />
          </div>
        </div>

        {/* Payable summary */}
        <div
          data-sq="card"
          data-sq-border="none"
          className="p-3 bg-[#F5F1EC] dark:bg-[#191716] flex items-center justify-between tabular-nums"
        >
          <span className="t-small font-semibold text-black/75 dark:text-white/80">
            {L('Total Payable (incl. Tip/Fee)', 'Total à encaisser (TTC + Pourboire)', 'المبلغ المستحق للدفع')}
          </span>
          <span className="t-pod font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
            {formatMoney(payableDzd)}
          </span>
        </div>

        {/* Single vs Split Bill */}
        <LiveSegmentedControl
          value={settlementMode}
          onValueChange={(v) => setSettlementMode(v as 'single' | 'split')}
          options={[
            { value: 'single', label: t('shop_mode_single'), icon: <Banknote size={14} /> },
            { value: 'split', label: t('shop_mode_split'), icon: <Split size={14} /> },
          ]}
          fullWidth
        />

        {settlementMode === 'single' ? (
          <div className="space-y-3">
            <LiveSegmentedControl
              value={singleMethod}
              onValueChange={(v) => setSingleMethod(v as any)}
              options={[
                { value: 'Cash', label: t('pos_tender_cash'), icon: <Banknote size={13} /> },
                { value: 'Card', label: t('pos_tender_card'), icon: <CreditCard size={13} /> },
                { value: 'BankTransfer', label: 'BaridiMob', icon: <Coins size={13} /> },
                { value: 'Credit', label: L('Carnet / Credit', 'Carnet crédit', 'كريدت الديون'), icon: <User size={13} /> },
              ]}
              fullWidth
            />

            {singleMethod === 'Credit' && !hasCustomerSelected && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300/60 t-cap text-amber-800 dark:text-amber-200">
                {L(
                  'Tip: select a customer on the register or enter phone below to track this Carnet entry cleanly.',
                  'Conseil : sélectionnez un client ou saisissez son téléphone pour le suivi Carnet de dettes.',
                  'تنبيه: يفضّل تحديد الزبون أو هاتفه لتسجيل الدين في الدفتر بدقة.'
                )}
              </div>
            )}

            {singleMethod === 'Cash' && (
              <div data-sq="card" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="t-small font-semibold text-black/55 dark:text-white/55">
                    {t('shop_cash_settlement')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTenderedInput(payableDzd.toString())}
                    className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline cursor-pointer"
                  >
                    {t('shop_exact_cash_btn', { amount: formatMoney(payableDzd) })}
                  </button>
                </div>
                <LabelInput
                  field="TenderedSplitModal"
                  label={t('shop_amount_tendered_input')}
                  type="number"
                  value={tenderedInput}
                  onChange={setTenderedInput}
                  placeholder={String(payableDzd)}
                  width="100%"
                  height={38}
                  corner={12}
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="t-small font-semibold text-black/55 dark:text-white/55">
                    {t('pos_change_due_label')} :
                  </span>
                  <span className="t-pod font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMoney(changeDue)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <LiveSegmentedControl
              value={splitMode}
              onValueChange={(v) => setSplitMode(v as 'equal' | 'by_items' | 'custom')}
              options={[
                { value: 'equal', label: L('Equal Split', 'Parts égales', 'بالتساوي') },
                { value: 'by_items', label: L('By Items', 'Par articles', 'حسب الأصناف') },
                { value: 'custom', label: L('Custom', 'Montants libres', 'مخصص') },
              ]}
              fullWidth
            />

            {splitMode === 'equal' && (
              <div className="flex items-center justify-between gap-3">
                <span className="t-small font-semibold text-black/70 dark:text-white/75">
                  {L('Number of Guests / Parts', 'Nombre de convives / parts', 'عدد الحصص')}
                </span>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSplitCount(n)}
                      data-sq="ctl-sm"
                      data-sq-border="solid"
                      className={`w-8 h-8 t-small font-semibold tabular-nums cursor-pointer ${
                        splitCount === n
                          ? 'bg-[var(--brand-fill,#C9461F)] text-white [--sq-stroke:transparent]'
                          : 'bg-[#F5F1EC] dark:bg-[#22201E] text-black dark:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(splitMode === 'custom'
                ? customShares
                : splitComputation.shares.map((s) => ({
                    id: s.id,
                    label: s.label,
                    paymentMethod: s.paymentMethod,
                    customAmountDzd: s.amountDzd,
                  }))
              ).map((sh, idx) => (
                <div key={sh.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4 t-cap font-semibold text-black dark:text-white truncate">
                    {sh.label}
                  </div>
                  <div className="col-span-4">
                    <select
                      aria-label={`${sh.label} payment method`}
                      value={sh.paymentMethod}
                      onChange={(e) => {
                        const val = e.target.value as SplitBillShareInput['paymentMethod'];
                        setCustomShares((prev) => {
                          const next = [...prev];
                          if (next[idx]) {
                            next[idx] = { ...next[idx], paymentMethod: val };
                          } else {
                            next.push({ id: sh.id, label: sh.label, paymentMethod: val, customAmountDzd: 0 });
                          }
                          return next;
                        });
                      }}
                      className="w-full h-9 px-2 t-cap rounded-[var(--r-ctl-sm,10px)] bg-[#F5F1EC] dark:bg-[#2B2825] text-black dark:text-white"
                    >
                      <option value="Cash">{t('pos_tender_cash')}</option>
                      <option value="Card">{t('pos_tender_card')}</option>
                      <option value="BankTransfer">BaridiMob</option>
                      <option value="Credit">{L('Carnet', 'Carnet', 'كريدت')}</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    {splitMode === 'custom' ? (
                      <input
                        type="number"
                        min="0"
                        aria-label={`${sh.label} amount`}
                        value={sh.customAmountDzd || ''}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setCustomShares((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, customAmountDzd: v } : item))
                          );
                        }}
                        className="w-full h-9 px-2 t-small tabular-nums text-end rounded-[var(--r-ctl-sm,10px)] bg-[#F5F1EC] dark:bg-[#2B2825] text-black dark:text-white"
                      />
                    ) : (
                      <div className="t-small font-semibold tabular-nums text-end text-black dark:text-white">
                        {formatMoney(sh.customAmountDzd || 0)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between t-small font-semibold tabular-nums">
              <span className="text-black/55 dark:text-white/55">
                {L('Split Balance Check:', 'Équilibre répartition :', 'حالة التوزيع:')}
              </span>
              <span className={splitComputation.isBalanced ? 'text-emerald-600' : 'text-red-500'}>
                {splitComputation.isBalanced
                  ? L('Balanced (100%)', 'Équilibré (100%)', 'متوازن 100%')
                  : `${L('Remaining', 'Écart', 'متبقي')}: ${formatMoney(splitComputation.differenceCentimes / 100)}`}
              </span>
            </div>
          </div>
        )}

        {usesCash && !hasOpenCashSession && (
          <div className="rounded-xl border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/30 p-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="t-small text-amber-900 dark:text-amber-200 leading-snug">
                {L(
                  'Open a cash drawer session before completing a cash checkout.',
                  'Ouvrez une session de caisse avant de valider un paiement en espèces.',
                  'افتح جلسة الصندوق قبل إتمام المبيعات النقدية.'
                )}
              </div>
            </div>
            <Button
              type="button"
              tone="soft"
              size={32}
              leading={<LockOpen size={14} />}
              onClick={onQuickOpenCashDrawer}
            >
              {L('Open Drawer', 'Ouvrir Caisse', 'فتح الصندوق')}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--atr-divider)]">
          <LabelSelect
            field="CashierSplit"
            label={t('shop_field_cashier')}
            value={cashierName}
            onChange={setCashierName}
            options={staff.map((s) => ({ value: s.fullName, label: `${s.fullName} (${s.role})` }))}
            height={38}
            corner={12}
          />
          <LabelInput
            field="CustPhoneSplit"
            label={t('shop_field_phone_optional')}
            type="tel"
            value={customerPhone}
            onChange={setCustomerPhone}
            placeholder="+213 550..."
            width="100%"
            height={38}
            corner={12}
          />
        </div>
        <LabelInput
          field="NotesSplit"
          label={t('shop_field_notes_optional')}
          value={notes}
          onChange={setNotes}
          placeholder="Ref BaridiMob / Note"
          width="100%"
          height={38}
          corner={12}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
          <Button type="button" tone="soft" size={40} onClick={onClose}>
            {t('action_cancel')}
          </Button>
          <Button
            type="button"
            tone="accent"
            size={40}
            disabled={(settlementMode === 'split' && !splitComputation.isBalanced) || (usesCash && !hasOpenCashSession)}
            leading={<CheckCircle2 size={15} />}
            onClick={handleConfirmClick}
          >
            {t('shop_btn_complete_sale')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
