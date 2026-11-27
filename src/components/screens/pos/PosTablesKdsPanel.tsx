import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  Plus,
  ShieldAlert,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import {
  PosFloorTable,
  PosKitchenOrder,
  PosSubRole,
} from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { canPerformPosActionBySubRole } from '../../../utils/posDepth';
import { useTranslation } from '../../../utils/useTranslation';
import { ScreenPod } from '../../ui/kinetic';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { PinVerificationModal } from '../../modals/PinVerificationModal';
import { showToast } from '../../../services/store';

interface PosTablesKdsPanelProps {
  floorTables: PosFloorTable[];
  kitchenOrders: PosKitchenOrder[];
  activeSubRole: PosSubRole;
  selectedTableId: string;
  onSelectTableForRegister: (table: PosFloorTable) => void;
  onUpsertFloorTable: (input: {
    id?: string;
    tableCode: string;
    label: string;
    zone?: string;
    seats?: number;
    status?: PosFloorTable['status'];
  }) => void;
  onUpdateKdsStatus: (orderId: string, status: PosKitchenOrder['kdsStatus']) => void;
  onTransferTable: (orderId: string, targetTableId: string) => { success: boolean; error?: string };
  onLoadOrderIntoRegister: (order: PosKitchenOrder) => void;
  onOpenSettleOrder: (order: PosKitchenOrder) => void;
  onVoidKitchenOrder: (params: { orderId: string; reason: string; pinVerified: boolean }) => {
    success: boolean;
    error?: string;
  };
}

export const PosTablesKdsPanel: React.FC<PosTablesKdsPanelProps> = ({
  floorTables,
  kitchenOrders,
  activeSubRole,
  selectedTableId,
  onSelectTableForRegister,
  onUpsertFloorTable,
  onUpdateKdsStatus,
  onTransferTable,
  onLoadOrderIntoRegister,
  onOpenSettleOrder,
  onVoidKitchenOrder,
}) => {
  const { language, isRtl, t } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [tableCode, setTableCode] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [tableZone, setTableZone] = useState('Main Hall');
  const [tableSeats, setTableSeats] = useState('4');

  const [transferOrder, setTransferOrder] = useState<PosKitchenOrder | null>(null);
  const [targetTableId, setTargetTableId] = useState('');

  const [voidTargetOrder, setVoidTargetOrder] = useState<PosKitchenOrder | null>(null);
  const [voidReasonInput, setVoidReasonInput] = useState('Customer cancelled before prep');
  const [isVoidPinOpen, setIsVoidPinOpen] = useState(false);

  const activeKdsOrders = useMemo(
    () =>
      kitchenOrders.filter(
        (o) => o.kdsStatus !== 'settled' && o.kdsStatus !== 'voided'
      ),
    [kitchenOrders]
  );

  const availableTargetTables = useMemo(
    () =>
      floorTables.filter(
        (tbl) => tbl.status === 'available' && tbl.id !== transferOrder?.tableId
      ),
    [floorTables, transferOrder?.tableId]
  );

  const canAdvanceKds = canPerformPosActionBySubRole(activeSubRole, 'advance_kds_status').allowed;
  const canTransfer = canPerformPosActionBySubRole(activeSubRole, 'transfer_table').allowed;
  const canSettle = canPerformPosActionBySubRole(activeSubRole, 'collect_payment').allowed;

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableCode.trim() && !tableLabel.trim()) return;
    onUpsertFloorTable({
      tableCode: tableCode.trim() || `T${floorTables.length + 1}`,
      label: tableLabel.trim() || tableCode.trim(),
      zone: tableZone.trim() || 'Main Hall',
      seats: parseInt(tableSeats, 10) || 4,
      status: 'available',
    });
    setTableCode('');
    setTableLabel('');
    setIsAddTableOpen(false);
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferOrder || !targetTableId) return;
    const res = onTransferTable(transferOrder.id, targetTableId);
    if (!res.success) {
      showToast({
        type: 'warning',
        title: L('Transfer blocked', 'Transfert bloqué', 'تعذر نقل الطاولة'),
        message:
          res.error === 'TARGET_TABLE_OCCUPIED'
            ? L('Target table is currently occupied.', 'La table cible est déjà occupée.', 'الطاولة المختارة مشغولة حالياً.')
            : res.error || 'Error',
      });
      return;
    }
    showToast({
      type: 'success',
      title: L('Table transferred', 'Table transférée', 'تم نقل الطاولة'),
      message: `${transferOrder.orderNumber}`,
    });
    setTransferOrder(null);
  };

  return (
    <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Floor Tables Map */}
      <ScreenPod>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--atr-divider)]">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <div>
              <h2 className="t-card font-semibold text-black dark:text-white">
                {L('Floor Plan & Table Assignment', 'Plan de Salle & Tables', 'مخطط الصالة والطاولات')}
              </h2>
              <p className="t-cap text-black/55 dark:text-white/55">
                {L(
                  'Click any table to take or revise an order in Register, or manage active KDS tickets below.',
                  'Cliquez sur une table pour ouvrir/modifier sa commande en caisse ou suivez la file cuisine ci-dessous.',
                  'انقر على طاولة لأخذ طلب أو تعديله، أو تابع طلبات المطبخ أدناه.'
                )}
              </p>
            </div>
          </div>
          <Button
            type="button"
            tone="accent"
            size={36}
            leading={<Plus size={14} />}
            onClick={() => setIsAddTableOpen(true)}
          >
            {L('Add Table', 'Nouvelle table', 'إضافة طاولة')}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {floorTables.map((tbl) => {
            const linkedOrder = kitchenOrders.find(
              (o) =>
                (o.id === tbl.currentOrderId || o.tableId === tbl.id) &&
                o.kdsStatus !== 'settled' &&
                o.kdsStatus !== 'voided'
            );
            const isOccupied = tbl.status === 'occupied' || Boolean(linkedOrder);
            const isSelected = tbl.id === selectedTableId;
            return (
              <button
                key={tbl.id}
                type="button"
                onClick={() => onSelectTableForRegister(tbl)}
                data-sq="card"
                data-sq-border="solid"
                className={`p-3.5 text-start cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? 'bg-[#FFF3EC] dark:bg-[#2F211B] [--sq-stroke:#BF431F]'
                    : isOccupied
                    ? 'bg-[#FDF4EC] dark:bg-[#29221D] [--sq-stroke:#D97706]'
                    : 'bg-white dark:bg-[#22201E] hover:bg-[#FAF6F1] dark:hover:bg-[#292624]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="t-small font-semibold text-black dark:text-white truncate">
                    {tbl.label}
                  </span>
                  <span
                    className={`t-cap font-semibold px-2 py-0.5 rounded-full ${
                      isOccupied
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {isOccupied
                      ? L('Occupied', 'Occupée', 'مشغولة')
                      : L('Free', 'Libre', 'متاحة')}
                  </span>
                </div>
                <div className="t-cap text-black/55 dark:text-white/55 flex items-center justify-between">
                  <span>{tbl.zone || 'Main Hall'}</span>
                  <span>{tbl.seats} pl.</span>
                </div>
                {linkedOrder ? (
                  <div className="pt-1.5 border-t border-[var(--atr-divider)] flex items-center justify-between t-cap tabular-nums">
                    <span className="font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                      {linkedOrder.orderNumber} · v{linkedOrder.revision}
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      {formatMoney(linkedOrder.totalCentimes / 100)}
                    </span>
                  </div>
                ) : (
                  <div className="pt-1.5 border-t border-[var(--atr-divider)] t-cap text-black/45 dark:text-white/45">
                    {L('Tap to assign cart', 'Toucher pour servir', 'اضغط لفتح طلب')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScreenPod>

      {/* Kitchen Display Queue (KDS) */}
      <ScreenPod>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--atr-divider)]">
          <div className="flex items-center gap-2">
            <ChefHat size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <div>
              <h2 className="t-card font-semibold text-black dark:text-white">
                {L('Kitchen Display Queue (KDS) & Active Orders', 'Écran Cuisine (KDS) & Commandes Actives', 'شاشة المطبخ والطلبات النشطة')}
              </h2>
              <p className="t-cap text-black/55 dark:text-white/55">
                {activeKdsOrders.length}{' '}
                {L('active ticket(s) with immutable revision deltas', 'ticket(s) actif(s) avec suivi des modifications', 'طلب(ات) نشطة مع تتبع التعديلات')}
              </p>
            </div>
          </div>
        </div>

        {activeKdsOrders.length === 0 ? (
          <div className="py-10 text-center t-small text-black/55 dark:text-white/55">
            {L(
              'No active kitchen tickets right now. Build an order in Register and click "Send to Kitchen".',
              'Aucun ticket cuisine actif. Ajoutez des articles en Caisse puis cliquez sur « Envoyer en cuisine ».',
              'لا توجد طلبات مطبخ حالياً. أضف أصنافاً في نقطة البيع ثم أرسلها للمطبخ.'
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
            {activeKdsOrders.map((order) => (
              <div
                key={order.id}
                data-sq="card"
                data-sq-border="solid"
                className="p-4 bg-white dark:bg-[#22201E] sq-elev-card flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="t-small font-semibold text-black dark:text-white">
                          {order.orderNumber}
                        </span>
                        <span className="t-cap px-2 py-0.5 rounded bg-[#EFE9E2] dark:bg-[#2B2825] font-semibold text-black/75 dark:text-white/80">
                          {order.orderChannel === 'dine_in'
                            ? order.tableLabel || L('Dine-in', 'Table', 'طاولة')
                            : order.orderChannel === 'delivery'
                            ? L('Delivery', 'Livraison', 'توصيل')
                            : order.orderChannel === 'takeaway'
                            ? L('Takeaway', 'À emporter', 'سفري')
                            : L('Counter', 'Comptoir', 'كونتوار')}
                        </span>
                        {order.revision > 1 && (
                          <span className="t-cap px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                            REV #{order.revision}
                          </span>
                        )}
                      </div>
                      <div className="t-cap text-black/55 dark:text-white/55 flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} />
                        <span>{new Date(order.sentAt || order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>· {order.waiterName || 'Staff'}</span>
                      </div>
                    </div>

                    <span
                      className={`t-cap font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                        order.kdsStatus === 'ready'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : order.kdsStatus === 'preparing'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : order.kdsStatus === 'served'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {order.kdsStatus.toUpperCase()}
                    </span>
                  </div>

                  {order.orderChannel === 'delivery' && order.deliveryAddress && (
                    <div className="p-2 rounded bg-[#F5F1EC] dark:bg-[#191716] t-cap flex items-start gap-1.5 text-black/75 dark:text-white/80">
                      <Truck size={13} className="shrink-0 mt-0.5 text-[var(--brand-text,#BF431F)]" />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{order.deliveryAddress}</div>
                        {order.deliveryCourier && <div>{order.deliveryCourier}</div>}
                      </div>
                    </div>
                  )}

                  {/* Revision delta highlight */}
                  {Array.isArray(order.deltaItems) && order.deltaItems.length > 0 && (
                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-300/60 space-y-1">
                      <div className="t-cap font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <Sparkles size={12} />
                        <span>{L('Latest Kitchen Delta', 'Dernier Delta Cuisine', 'آخر تعديل للمطبخ')}</span>
                      </div>
                      {order.deltaItems.map((d) => (
                        <div key={d.lineKey} className="t-cap flex items-center justify-between text-amber-900 dark:text-amber-200 tabular-nums">
                          <span className="truncate">
                            {d.deltaQty > 0 ? `+${d.deltaQty}` : d.deltaQty}× {d.productName}
                            {d.variantLabel ? ` (${d.variantLabel})` : ''}
                          </span>
                          <span className="uppercase">{d.changeType}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Line items */}
                  <div className="divide-y divide-[var(--atr-divider)] t-cap">
                    {order.currentItems.map((it) => (
                      <div key={it.lineKey} className="py-1.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-black dark:text-white">
                            {it.quantity}× {it.productName}
                            {it.variantLabel ? ` (${it.variantLabel})` : ''}
                          </div>
                          {it.modifiers && it.modifiers.length > 0 && (
                            <div className="text-black/55 dark:text-white/55">
                              {it.modifiers.map((m) => m.optionName).join(', ')}
                            </div>
                          )}
                          {it.notes && (
                            <div className="text-amber-700 dark:text-amber-300 italic">{it.notes}</div>
                          )}
                        </div>
                        <span className="tabular-nums font-semibold text-black/75 dark:text-white/80 shrink-0">
                          {formatMoney(it.lineTotalDzd)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[var(--atr-divider)] space-y-2">
                  <div className="flex items-center justify-between t-small font-semibold tabular-nums">
                    <span className="text-black/60 dark:text-white/60">{L('Total', 'Total', 'المجموع')}</span>
                    <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                      {formatMoney(order.totalCentimes / 100)}
                    </span>
                  </div>

                  {/* Kitchen Progression Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {canAdvanceKds && order.kdsStatus === 'sent' && (
                      <Button
                        type="button"
                        tone="soft"
                        size={32}
                        onClick={() => onUpdateKdsStatus(order.id, 'preparing')}
                      >
                        {L('Start Prep', 'En prép.', 'بدء التحضير')}
                      </Button>
                    )}
                    {canAdvanceKds && (order.kdsStatus === 'sent' || order.kdsStatus === 'preparing') && (
                      <Button
                        type="button"
                        tone="soft"
                        size={32}
                        leading={<CheckCircle2 size={13} />}
                        onClick={() => onUpdateKdsStatus(order.id, 'ready')}
                      >
                        {L('Ready', 'Prêt', 'جاهز')}
                      </Button>
                    )}
                    {canAdvanceKds && order.kdsStatus === 'ready' && (
                      <Button
                        type="button"
                        tone="soft"
                        size={32}
                        onClick={() => onUpdateKdsStatus(order.id, 'served')}
                      >
                        {L('Served', 'Servi', 'تم التقديم')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      tone="soft"
                      size={32}
                      onClick={() => onLoadOrderIntoRegister(order)}
                    >
                      {L('Edit / Add', 'Compléter', 'تعديل / إضافة')}
                    </Button>
                    {canTransfer && (
                      <Button
                        type="button"
                        tone="soft"
                        size={32}
                        leading={<ArrowRightLeft size={13} />}
                        onClick={() => {
                          setTransferOrder(order);
                          const free = floorTables.find(
                            (tbl) => tbl.status === 'available' && tbl.id !== order.tableId
                          );
                          setTargetTableId(free?.id || '');
                        }}
                      >
                        {L('Move', 'Transférer', 'نقل')}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {canSettle && (
                      <Button
                        type="button"
                        tone="accent"
                        size={36}
                        className="flex-1"
                        leading={<CreditCard size={14} />}
                        onClick={() => onOpenSettleOrder(order)}
                      >
                        {L('Settle / Split', 'Encaisser / Partager', 'دفع وتحصيل')}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setVoidTargetOrder(order);
                        setIsVoidPinOpen(true);
                      }}
                      title={L('Void Ticket (Manager PIN)', 'Annuler ticket (Code PIN)', 'إلغاء الطلب (PIN)')}
                      aria-label={`Void ${order.orderNumber}`}
                      data-sq="ctl-sm"
                      data-sq-border="solid"
                      className="h-9 px-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 t-cap font-semibold cursor-pointer"
                    >
                      <ShieldAlert size={14} />
                      <span>{L('Void', 'Annuler', 'إلغاء')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScreenPod>

      {/* Add Floor Table Modal */}
      <Modal
        isOpen={isAddTableOpen}
        onClose={() => setIsAddTableOpen(false)}
        title={L('Add Dining Table', 'Ajouter une Table', 'إضافة طاولة جديدة')}
      >
        <form onSubmit={handleSaveTable} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="TblCode"
              label={L('Code', 'Code', 'الرمز')}
              value={tableCode}
              onChange={setTableCode}
              placeholder="T7"
              required
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="TblSeats"
              label={L('Seats', 'Places', 'المقاعد')}
              type="number"
              min="1"
              value={tableSeats}
              onChange={setTableSeats}
              width="100%"
              height={40}
              corner={12}
            />
          </div>
          <LabelInput
            field="TblLabel"
            label={L('Display Label', 'Libellé', 'الاسم الظاهر')}
            value={tableLabel}
            onChange={setTableLabel}
            placeholder="Table 07 · VIP"
            required
            width="100%"
            height={40}
            corner={12}
          />
          <LabelInput
            field="TblZone"
            label={L('Floor Zone', 'Zone / Salle', 'القاعة')}
            value={tableZone}
            onChange={setTableZone}
            placeholder="Terrasse / Salle"
            width="100%"
            height={40}
            corner={12}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={() => setIsAddTableOpen(false)}>
              {t('action_cancel')}
            </Button>
            <Button type="submit" tone="accent" size={40}>
              {L('Create Table', 'Créer la table', 'إنشاء الطاولة')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Table Modal */}
      <Modal
        isOpen={Boolean(transferOrder)}
        onClose={() => setTransferOrder(null)}
        title={L('Transfer Table Order', 'Transférer vers une autre table', 'نقل الطلب إلى طاولة أخرى')}
      >
        <form onSubmit={handleConfirmTransfer} className="space-y-4">
          <div className="t-small text-black/70 dark:text-white/75">
            {transferOrder?.orderNumber} ({transferOrder?.tableLabel || L('Unassigned', 'Sans table', 'بدون طاولة')})
          </div>
          <LabelSelect
            field="TargetTable"
            label={L('Target Free Table', 'Table libre de destination', 'الطاولة المتاحة المستهدفة')}
            value={targetTableId}
            onChange={setTargetTableId}
            options={
              availableTargetTables.length > 0
                ? availableTargetTables.map((tbl) => ({
                    value: tbl.id,
                    label: `${tbl.label} (${tbl.zone || 'Main'}, ${tbl.seats} pl.)`,
                  }))
                : [{ value: '', label: L('No free tables available', 'Aucune table libre disponible', 'لا توجد طاولة متاحة') }]
            }
            height={40}
            corner={12}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={() => setTransferOrder(null)}>
              {t('action_cancel')}
            </Button>
            <Button type="submit" tone="accent" size={40} disabled={!targetTableId}>
              {L('Confirm Transfer', 'Confirmer transfert', 'تأكيد النقل')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Void Kitchen Order PIN Gate */}
      <PinVerificationModal
        isOpen={isVoidPinOpen}
        onClose={() => {
          setIsVoidPinOpen(false);
          setVoidTargetOrder(null);
        }}
        title={L('Manager PIN Required to Void Ticket', 'Code PIN requis pour annuler le ticket', 'رمز المدير مطلوب لإلغاء الطلب')}
        description={`${voidTargetOrder?.orderNumber || ''} · ${voidReasonInput}`}
        onSuccess={() => {
          if (!voidTargetOrder) return;
          const res = onVoidKitchenOrder({
            orderId: voidTargetOrder.id,
            reason: voidReasonInput,
            pinVerified: true,
          });
          if (res.success) {
            showToast({
              type: 'warning',
              title: L('Kitchen ticket voided', 'Ticket cuisine annulé', 'تم إلغاء الطلب'),
              message: `${voidTargetOrder.orderNumber}`,
            });
          }
          setVoidTargetOrder(null);
          setIsVoidPinOpen(false);
        }}
      />
    </div>
  );
};
