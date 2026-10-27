import React, { useState } from 'react';
import { Package, Plus, Printer, MapPin, CheckCircle2, Truck, ShieldCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useLogisticsData } from './logisticsData';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LogisticsShipment } from '../../../types';

export const LogisticsShipmentsView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { shipments, addShipment, updateShipmentStatus } = useLogisticsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLabelShipment, setSelectedLabelShipment] = useState<LogisticsShipment | null>(null);

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.recipientPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destinationWilaya.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.merchantName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const outForDeliveryCount = shipments.filter((s) => s.status === 'OutForDelivery').length;
  const deliveredCount = shipments.filter((s) => s.status === 'Delivered').length;
  const totalCodValue = shipments.reduce((acc, s) => acc + s.codAmountDzd, 0);

  const statusOptions = [
    { value: 'all', label: isAr ? 'جميع الحالات' : 'Tous les statuts' },
    { value: 'InHub', label: isAr ? 'بالمستودع (Hub)' : 'En Hub' },
    { value: 'OutForDelivery', label: isAr ? 'في طريق التوصيل' : 'En livraison' },
    { value: 'Delivered', label: isAr ? 'تم التسليم' : 'Livré' },
    { value: 'Returned', label: isAr ? 'مرتجع (RTS)' : 'Retourné' },
  ];

  const handleDeliver = (shipmentId: string) => {
    updateShipmentStatus(shipmentId, 'Delivered');
    showToast(
      isAr ? 'تم تأكيد تسليم الطرد وقبض المبلغ' : 'Livraison confirmée et montant COD encaissé',
      'success'
    );
  };

  const handlePrintLabel = (s: LogisticsShipment) => {
    setSelectedLabelShipment(s);
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Package size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'إدارة الطرود والشحنات (AWB)' : 'Gestion des Colis & Expéditions (AWB)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {shipments.length} AWB
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تتبع الشحنات، طباعة بوليصات الشحن الحرارية وتأكيد تسليم الطرود'
                : 'Suivi des lettres de voiture (AWB), étiquettes thermiques & bordereaux'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'شحنة جديدة (AWB)' : 'Nouveau Colis'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات الشحنات والتوزيع الميداني' : 'Flux des Expéditions & Dispatch'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة الطرود المسجلة، الشحنات في الطريق وقيمة مبالغ الدفع عند الاستلام' : 'Colis en tournée active, taux de succès et masse financière COD'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Colis en Tournée */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'طرود قيد التوزيع في الطريق' : 'Colis en Tournée Active'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-[#C4785A] font-mono tabular-nums">
                {outForDeliveryCount}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                {shipments.length} {isAr ? 'إجمالي الطرود' : 'expéditions totales'}
              </p>
            </div>
          </div>

          {/* Card 2: Colis Livrés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'طرود تم تسليمها بنجاح' : 'Colis Livrés Réceptionnés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {deliveredCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {shipments.length > 0 ? Math.round((deliveredCount / shipments.length) * 100) : 0}% {isAr ? 'نسبة النجاح' : 'taux de livraison'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي مبالغ COD المصرح بها' : 'Montant COD Global'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Valeur Marchande
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalCodValue)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filteredShipments.length} {isAr ? 'شحنة معروضة' : 'colis affichés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'جدول الطرود والشحنات' : 'Bordereau des Expéditions AWB'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filteredShipments.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث بالكود، الزبون، الولاية...' : 'Recherche AWB, client, wilaya...'}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Shipments Cards Container */}
        <div className="space-y-3">
          {filteredShipments.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 hover:border-[#C4785A]/40 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#C4785A] bg-[#C4785A]/10 px-2.5 py-0.5 rounded-full">
                    {s.trackingCode}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <MapPin size={11} className="text-neutral-400" />
                    {s.destinationWilaya}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : s.status === 'OutForDelivery'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : s.status === 'Returned'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                  {s.recipientName} • <span className="font-mono font-normal text-xs text-neutral-500">{s.recipientPhone}</span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {s.destinationAddress} • {isAr ? 'التاجر' : 'Marchand'}: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{s.merchantName}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-neutral-100 dark:border-neutral-700">
                <div className="text-right rtl:text-left">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase">COD</div>
                  <div className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                    {formatMoney(s.codAmountDzd)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AtriumButton
                    size="xs"
                    variant="outline"
                    onClick={() => handlePrintLabel(s)}
                    icon={<Printer size={13} />}
                  >
                    {isAr ? 'بوليصة' : 'AWB'}
                  </AtriumButton>

                  {s.status !== 'Delivered' && (
                    <AtriumButton
                      size="xs"
                      variant="primary"
                      onClick={() => handleDeliver(s.id)}
                      icon={<CheckCircle2 size={13} />}
                    >
                      {isAr ? 'تسليم' : 'Livrer'}
                    </AtriumButton>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shipment Modal */}
      <LogisticsShipmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(newShipment) => {
          addShipment(newShipment);
          setIsModalOpen(false);
        }}
      />

      {/* Thermal Waybill Label Print Preview Modal */}
      {selectedLabelShipment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-300 text-neutral-900 space-y-4 font-mono text-xs">
            <div className="text-center border-b pb-3 space-y-1">
              <div className="font-extrabold text-base tracking-widest text-[#C4785A]">ATRIUM EXPRESS</div>
              <div className="text-[10px] text-neutral-500">BORDEREAU D'EXPÉDITION EXPRESS AWB</div>
              <div className="text-lg font-bold tracking-wider mt-1 border border-neutral-800 py-1 bg-neutral-50">
                {selectedLabelShipment.trackingCode}
              </div>
            </div>

            <div className="space-y-2 border-b pb-3">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase">Destinataire:</span>
                <div className="font-bold text-sm">{selectedLabelShipment.recipientName}</div>
                <div>{selectedLabelShipment.recipientPhone}</div>
                <div>{selectedLabelShipment.destinationAddress}</div>
                <div className="font-bold text-[#C4785A] mt-1">{selectedLabelShipment.destinationWilaya}</div>
              </div>

              <div className="border-t pt-2">
                <span className="text-[10px] text-neutral-500 uppercase">Expéditeur:</span>
                <div className="font-bold">{selectedLabelShipment.merchantName}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-base font-bold bg-neutral-100 p-2.5 rounded-lg">
              <span>MONTANT COD:</span>
              <span className="text-[#C4785A]">{formatMoney(selectedLabelShipment.codAmountDzd)}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <AtriumButton variant="ghost" size="sm" onClick={() => setSelectedLabelShipment(null)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                variant="primary"
                size="sm"
                onClick={() => {
                  window.print();
                  showToast('Impression lancée', 'success');
                  setSelectedLabelShipment(null);
                }}
                icon={<Printer size={14} />}
              >
                Imprimer
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
