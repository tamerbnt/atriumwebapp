import React, { useState } from 'react';
import { Package, Plus, Printer, MapPin, CheckCircle, Truck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useLogisticsData } from './logisticsData';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'إدارة الطرود والشحنات (AWB)' : 'Gestion des Colis & Expéditions (AWB)'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {shipments.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'تتبع بوالص الشحن الجارية، التسليم للمستلم، والطباعة الحرارية'
                : 'Suivi des bordereaux d’expédition, livraisons et étiquettes thermiques'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالرمز، الاسم، الهاتف...' : 'Rechercher code, nom, tél...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'طرد جديد (AWB)' : 'Nouveau Colis (AWB)'}
          </AtriumButton>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-white/60 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-neutral-500 font-medium mr-1">{isAr ? 'الحالة:' : 'Statut:'}</span>
        {[
          { key: 'all', label: isAr ? 'الكل' : 'Tous' },
          { key: 'ReceivedAtHub', label: isAr ? 'في المركز' : 'Reçu Hub' },
          { key: 'Sorted', label: isAr ? 'تم الفرز' : 'Trié' },
          { key: 'OutForDelivery', label: isAr ? 'قيد التوزيع' : 'En Livraison' },
          { key: 'Delivered', label: isAr ? 'تم التسليم' : 'Livré' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              statusFilter === f.key
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Shipments Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredShipments.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Package size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد طرود مطابقة للبحث' : 'Aucun colis correspondant'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredShipments.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-[#C4785A]/40 transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                      {s.trackingCode}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        s.status === 'Delivered'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : s.status === 'OutForDelivery'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {s.recipientName}
                    </h3>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5">
                      {s.recipientPhone}
                    </div>
                  </div>

                  <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-1.5 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl">
                    <MapPin size={14} className="shrink-0 text-[#C4785A] mt-0.5" />
                    <span>
                      {s.destinationAddress} · <strong className="text-neutral-900 dark:text-white">{s.destinationWilaya}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs pt-1">
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">COD</div>
                      <div className="font-bold text-emerald-600 mt-0.5">{formatMoney(s.codAmountDzd)}</div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Frais</div>
                      <div className="font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">{formatMoney(s.shippingFeeDzd)}</div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Poids</div>
                      <div className="font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">{s.weightKg} kg</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400 text-[11px] truncate max-w-[140px]">
                    Exp: {s.merchantName}
                  </span>

                  <div className="flex items-center gap-2">
                    <AtriumButton
                      variant="outline"
                      size="xs"
                      onClick={() => handlePrintLabel(s)}
                      icon={<Printer size={13} />}
                    >
                      {isAr ? 'ملصق' : 'Bordereau'}
                    </AtriumButton>

                    {s.status !== 'Delivered' && (
                      <AtriumButton
                        variant="primary"
                        size="xs"
                        onClick={() => handleDeliver(s.id)}
                        icon={<CheckCircle size={13} />}
                      >
                        {isAr ? 'تسليم' : 'Livrer'}
                      </AtriumButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
