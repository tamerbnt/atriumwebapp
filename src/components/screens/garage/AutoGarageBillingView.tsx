import React, { useState } from 'react';
import {
  CreditCard,
  Printer,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  DollarSign,
  Car,
  Wrench,
  Package,
  Receipt,
  Eye,
  Check,
  X,
  Share2,
  Clock,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, RepairOrder } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const AutoGarageBillingView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { orders, updateOrder } = useGarageData();

  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'decompte' | 'pieces' | 'sortie'>('decompte');

  const totalBilled = orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered');
  const paidVolume = deliveredOrders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);
  const pendingVolume = totalBilled - paidVolume;

  const handleSettleAndDeliver = (order: RepairOrder) => {
    const updated: RepairOrder = {
      ...order,
      status: 'Delivered',
      finalCostDzd: order.finalCostDzd || order.estimatedCostDzd,
    };
    updateOrder(updated);
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(updated);
    }
    showToast(
      isAr
        ? `تم استلام مستحقات الإصلاح (${formatMoney(updated.finalCostDzd, language)}) وتسليم رخصة الخروج`
        : `Règlement encaissé (${formatMoney(updated.finalCostDzd, language)}) & Bon de sortie délivré`,
      'success'
    );
  };

  const handlePrintExitPass = (orderNumber: string) => {
    showToast(
      isAr
        ? `جاري طباعة رخصة الخروج والفاتورة ${orderNumber}...`
        : `Impression du bon de sortie et facture ${orderNumber}...`,
      'info'
    );
  };

  const getBillingActions = (order: RepairOrder): ActionButtonDef[] => {
    const isDelivered = order.status === 'Delivered';
    return [
      {
        label: isAr ? 'معاينة الفاتورة' : 'Consulter Facture',
        icon: <Eye size={14} />,
        onClick: () => setSelectedOrder(order),
      },
      ...(!isDelivered
        ? [
            {
              label: isAr ? 'تحصيل وتسليم' : 'Encaisser & Clôturer',
              icon: <Check size={14} />,
              onClick: () => handleSettleAndDeliver(order),
            },
          ]
        : []),
      {
        label: isAr ? 'رخصة الخروج' : 'Bon de Sortie',
        icon: <Printer size={14} />,
        onClick: () => handlePrintExitPass(order.orderNumber),
      },
      {
        label: isAr ? 'مشاركة الفاتورة' : 'Partager Facture',
        icon: <Share2 size={14} />,
        onClick: () => {
          showToast(
            isAr
              ? `تم نسخ رابط الفاتورة ${order.orderNumber}`
              : `Lien de télé-facturation ${order.orderNumber} copié`,
            'success'
          );
        },
      },
    ];
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الفواتير ورخص الخروج (Bons de Sortie)' : 'Facturation Atelier & Bons de Sortie'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Gate Pass Authorized
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تسوية حسابات التصليح، إصدار فواتير الصيانة وسندات استلام المركبات'
                : 'Clôture comptable, décompte pièces/main d\'œuvre & bons de sortie atelier'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => window.print()}
            icon={<Printer size={14} />}
          >
            {isAr ? 'طباعة كشف الحساب' : 'Bordereau Caisse'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات التحصيل والفوترة المالية' : 'Recouvrement & Encaissements Atelier'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'توزيع المداخيل بين المبالغ المسددة والمستحقات قيد التسوية عند التسليم'
              : 'Ventilation des règlements clients et encaissements à la restitution'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Facturé Total */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي فواتير الصيانة' : 'Facturation Globale OR'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalBilled, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {orders.length} {isAr ? 'أمر صيانة' : 'dossiers facturés'}
              </p>
            </div>
          </div>

          {/* Card 2: En cours de règlement */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'مستحقات قيد التسليم' : 'En Attente de Règlement'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {formatMoney(pendingVolume, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {orders.length - deliveredOrders.length} {isAr ? 'مركبة قيد الإنجاز' : 'véhicules non livrés'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'خزينة الورشة المحصلة' : 'Encaissements Encaissés'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {isAr ? 'المحصل نقداً' : 'Caisse Réglée'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(paidVolume, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {deliveredOrders.length} {isAr ? 'أمر تم استيفاؤه' : 'bons de sortie délivrés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Collection Area + 390px Inspector Drawer */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          <UniversalDataCollection<RepairOrder>
            title={isAr ? 'سجل فواتير ورخص خروج الورشة' : 'Registre des Règlements & Sorties Atelier'}
            subtitle={isAr ? 'متابعة الدفع والتسليم للزبائن' : 'Clôture financière, pièces consommées et autorisation de sortie'}
            items={orders}
            keyExtractor={(o) => o.id}
            searchPlaceholder={isAr ? 'بحث باللوحة، الزبون، N° OR...' : 'Rechercher matricule, client, modèle, N° OR...'}
            searchFilter={(o, query) =>
              o.vehiclePlate.toLowerCase().includes(query.toLowerCase()) ||
              o.clientName.toLowerCase().includes(query.toLowerCase()) ||
              o.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
              o.vehicleModel.toLowerCase().includes(query.toLowerCase())
            }
            onSelectRow={(o) => setSelectedOrder(o)}
            customActions={(o) => getBillingActions(o)}
            columns={[
              {
                id: 'orderNumber',
                header: isAr ? 'رقم OR' : 'N° OR',
                width: '130px',
                sortable: true,
                renderCell: (o) => (
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded border border-[#C4785A]/20">
                    {o.orderNumber}
                  </span>
                ),
              },
              {
                id: 'vehicle',
                header: isAr ? 'المركبة' : 'Véhicule & Immatriculation',
                renderCell: (o) => (
                  <div>
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                      {o.vehiclePlate}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {o.vehicleModel}
                    </span>
                  </div>
                ),
              },
              {
                id: 'client',
                header: isAr ? 'الزبون' : 'Client Propriétaire',
                width: '180px',
                renderCell: (o) => (
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                      {o.clientName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {o.clientPhone}
                    </span>
                  </div>
                ),
              },
              {
                id: 'parts',
                header: isAr ? 'قطع الغيار' : 'Pièces Utilisées',
                width: '140px',
                renderCell: (o) => (
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                    <Package size={12} className="text-[#C4785A]" />
                    <span>{o.partsUsed.length} article(s)</span>
                  </span>
                ),
              },
              {
                id: 'total',
                header: isAr ? 'المبلغ الإجمالي' : 'Montant Facturé',
                width: '150px',
                sortable: true,
                renderCell: (o) => (
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                    {formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}
                  </span>
                ),
              },
              {
                id: 'status',
                header: isAr ? 'الحالة' : 'Statut Caisse',
                width: '130px',
                renderCell: (o) => {
                  const isDelivered = o.status === 'Delivered';
                  return (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isDelivered ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {isDelivered ? (isAr ? 'مسدد وخارج' : 'Réglé & Sorti') : (isAr ? 'قيد التحصيل' : 'En Atelier')}
                    </span>
                  );
                },
              },
            ]}
            renderCard={(o) => {
              const isDelivered = o.status === 'Delivered';
              return (
                <div className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded">
                      {o.orderNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isDelivered ? 'Réglé' : 'En Atelier'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                      {o.vehiclePlate} · {o.vehicleModel}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {o.clientName} ({o.clientPhone})
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-neutral-400">
                      {o.partsUsed.length} pièce(s)
                    </span>
                    <span className="font-mono font-bold text-[#C4785A] text-sm">
                      {formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}
                    </span>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 390px Side Inspector Drawer */}
        {selectedOrder && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Inspector Top Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <Car size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                    {selectedOrder.orderNumber}
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                    {selectedOrder.vehiclePlate} · {selectedOrder.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
              <button
                onClick={() => setInspectorTab('decompte')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'decompte'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'الفاتورة والتحصيل' : 'Décompte'}
              </button>
              <button
                onClick={() => setInspectorTab('pieces')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'pieces'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'القطع واليد العاملة' : 'Pièces & MO'}
              </button>
              <button
                onClick={() => setInspectorTab('sortie')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'sortie'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'رخصة الخروج' : 'Bon de Sortie'}
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'decompte' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-neutral-300 text-[11px]">
                      <span>Total Facture Atelier TTC</span>
                      <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {selectedOrder.status === 'Delivered' ? 'Réglé' : 'À Encaisser'}
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white">
                      {formatMoney(selectedOrder.finalCostDzd || selectedOrder.estimatedCostDzd, language)}
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Montant net à régler avant remise des clés et signature du bon de sortie.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Informations Véhicule & Client
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Immatriculation:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedOrder.vehiclePlate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Modèle:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedOrder.vehicleModel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Client:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedOrder.clientName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Téléphone:</span>
                      <span className="font-mono text-neutral-900 dark:text-white">{selectedOrder.clientPhone}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-neutral-900 dark:text-white">Clôture & Règlement</span>
                      <span className="text-[10px] text-neutral-500">
                        {selectedOrder.status === 'Delivered' ? 'Véhicule restitué au client' : 'En attente de paiement'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSettleAndDeliver(selectedOrder)}
                      disabled={selectedOrder.status === 'Delivered'}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white disabled:opacity-50 transition-colors"
                    >
                      {selectedOrder.status === 'Delivered' ? 'Encaissé ✓' : 'Encaisser & Clôturer'}
                    </button>
                  </div>
                </div>
              )}

              {inspectorTab === 'pieces' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Pièces Remplacées ({selectedOrder.partsUsed.length})
                    </span>
                    {selectedOrder.partsUsed.length === 0 ? (
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl text-center text-neutral-400">
                        Aucune pièce détachée facturée sur cet ordre.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedOrder.partsUsed.map((p, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-neutral-900 dark:text-white block">{p.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">Quantité: {p.quantity} x {p.unitPriceDzd} DZD</span>
                            </div>
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">
                              {formatMoney(p.quantity * p.unitPriceDzd, language)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Main d'Œuvre Atelier
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Technicien assigné:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedOrder.technicianName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Diagnostic & intervention:</span>
                      <span className="text-emerald-600 font-semibold">Réalisé</span>
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === 'sortie' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Bon de Sortie Atelier (Gate Pass)
                    </span>
                    <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                      Ce document autorise la sortie définitive du véhicule après contrôle de fin de travaux et vérification de la quittance comptable.
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono block">QR Code Sécurité Sortie</span>
                    <p className="font-bold text-xs text-neutral-900 dark:text-white">GATEPASS-{selectedOrder.orderNumber}</p>
                    <span className="text-[9px] text-neutral-500 font-mono">Valable 24h après émission</span>
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
              <AtriumButton
                variant="primary"
                className="w-full justify-center"
                icon={<Printer size={14} />}
                onClick={() => handlePrintExitPass(selectedOrder.orderNumber)}
              >
                {isAr ? 'طباعة رخصة الخروج والفاتورة' : 'Imprimer Bon de Sortie & Facture'}
              </AtriumButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
