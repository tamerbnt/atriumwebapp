import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  ArrowUpRight,
  Building2,
  Send,
  ShieldCheck,
  Package,
  Truck,
  Printer,
  Eye,
  Check,
  X,
  Share2,
  Clock,
  Receipt,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsShipment } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const LogisticsCodView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { shipments } = useLogisticsData();

  const [settledIds, setSettledIds] = useState<string[]>(['shp_01']);
  const [selectedShipment, setSelectedShipment] = useState<LogisticsShipment | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'rapprochement' | 'colis' | 'virement'>('rapprochement');

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const deliveredShipments = shipments.filter((s) => s.status === 'Delivered');

  const totalCodCollected = deliveredShipments.reduce((acc, s) => acc + s.codAmountDzd, 0);
  const totalShippingFees = deliveredShipments.reduce((acc, s) => acc + s.shippingFeeDzd, 0);
  const totalNetToMerchants = totalCodCollected - totalShippingFees;

  const handleSettle = (id: string, merchant: string, netAmount: number) => {
    if (!settledIds.includes(id)) {
      setSettledIds((prev) => [...prev, id]);
      showToast(
        isAr
          ? `تم تحويل مستحقات التاجر (${formatMoney(netAmount)}) بنجاح`
          : `Virement net de ${formatMoney(netAmount)} validé pour ${merchant}`,
        'success'
      );
    }
  };

  const getCodActions = (s: LogisticsShipment): ActionButtonDef[] => {
    const net = s.codAmountDzd - s.shippingFeeDzd;
    const isSettled = settledIds.includes(s.id);
    return [
      {
        label: isAr ? 'معاينة التسوية' : 'Consulter Détail',
        icon: <Eye size={14} />,
        onClick: () => setSelectedShipment(s),
      },
      ...(!isSettled
        ? [
            {
              label: isAr ? 'تحويل للمتجر' : 'Virer Net',
              icon: <Send size={14} />,
              onClick: () => handleSettle(s.id, s.merchantName, net),
            },
          ]
        : []),
      {
        label: isAr ? 'وصل التحويل' : 'Reçu Virement',
        icon: <Printer size={14} />,
        onClick: () => {
          showToast(
            isAr
              ? `طباعة كشف تحويل المستحقات للطرد ${s.trackingCode}`
              : `Bordereau de reversement émis pour ${s.trackingCode}`,
            'info'
          );
        },
      },
      {
        label: isAr ? 'إشعار التاجر' : 'Avis SMS',
        icon: <Share2 size={14} />,
        onClick: () => {
          showToast(
            isAr
              ? `تم إرسال إشعار الدفع إلى ${s.merchantName}`
              : `Notification SMS de reversement envoyée à ${s.merchantName}`,
            'success'
          );
        },
      },
    ];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'تحصيل COD ومستحقات التجار' : 'Caisse COD & Règlements E-Commerçants'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Paiement à la Livraison
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'مطابقة مبالغ الدفع عند الاستلام، اقتطاع رسوم التوصيل، وتحويل صافي المستحقات'
                : 'Rapprochement des encaissements à la livraison et génération des virements marchands'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => {
              showToast(isAr ? 'تم تصدير كشف تسوية COD للمتاجر' : 'Bordereau de reversement exporté', 'info');
              window.print();
            }}
            icon={<ArrowUpRight size={14} />}
          >
            {isAr ? 'تصدير كشف التسوية' : 'Bordereau Marchands'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات صندوق التحصيل وأموال التجار' : 'Trésorerie des Encaissements & Reversements'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'إجمالي المبالغ المقبوضة، رسوم النقل المستحقة وصافي المبالغ المحولة للبائعين' : 'Ventilation des encaissements livreurs, commissions hub et solde net marchands'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total COD Encaissé */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي المقبوض نقداً عند الاستلام' : 'Total Brut Encaissé (Livreurs)'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalCodCollected)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {deliveredShipments.length} {isAr ? 'طرد مسلم بنجاح' : 'colis réglés à la porte'}
              </p>
            </div>
          </div>

          {/* Card 2: Frais de livraison */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'رسوم التوصيل المقتطعة للشركة' : 'Frais de Livraison Prélevés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatMoney(totalShippingFees)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'إيرادات الخدمة الصافية' : 'Chiffre d\'affaires transport'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'صافي مستحقات المتاجر' : 'Net à Reverser Marchands'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Solde Marchands
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalNetToMerchants)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {deliveredShipments.length} {isAr ? 'عملية تسوية متاحة' : 'colis réconciliés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'كشوفات تصفية الأموال والتحويلات للتجار' : 'Bordereaux de Rapprochement & Virements Commerçants'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'مطابقة السيولة النقدية، اقتطاع عمولات التوصيل، وإصدار أوامر التحويل' : 'Rapprochement des caisses livreurs, déduction des commissions et virements CCP/RIB'}
            </p>
          </div>

          {/* Authentic Logistics COD Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع التسويات' : 'Toutes liquidations' },
              { id: 'settled', label: isAr ? 'محولة للتجار' : 'Virements effectués' },
              { id: 'pending', label: isAr ? 'قيد التحويل' : 'En attente virement' },
            ].map((tab, idx) => (
              <button
                key={tab.id}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: idx === 0 ? '#FCEEE8' : 'transparent',
                  color: idx === 0 ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Collection Area + 390px Inspector Drawer */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<LogisticsShipment>
            title={isAr ? 'جدول تسويات الدفع عند الاستلام' : 'Tableau de Rapprochement & Virements COD'}
            subtitle={isAr ? 'مطابقة السيولة وتصفية الحسابات' : 'Colis livrés, commissions prélevées et reversements marchands'}
            items={deliveredShipments}
            keyExtractor={(s) => s.id}
            searchPlaceholder={isAr ? 'بحث بالتاجر، الكود، الزبون...' : 'Rechercher marchand, AWB, destinataire, wilaya...'}
            searchFilter={(s, query) =>
              s.merchantName.toLowerCase().includes(query.toLowerCase()) ||
              s.trackingCode.toLowerCase().includes(query.toLowerCase()) ||
              s.recipientName.toLowerCase().includes(query.toLowerCase()) ||
              s.destinationWilaya.toLowerCase().includes(query.toLowerCase())
            }
            onSelectRow={(s) => setSelectedShipment(s)}
            customActions={(s) => getCodActions(s)}
            columns={[
              {
                id: 'trackingCode',
                header: isAr ? 'رقم الشحنة' : 'N° AWB',
                width: '130px',
                sortable: true,
                renderCell: (s) => (
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded border border-[#C4785A]/20">
                    {s.trackingCode}
                  </span>
                ),
              },
              {
                id: 'merchant',
                header: isAr ? 'التاجر (المتجر)' : 'Commerçant & Boutique',
                renderCell: (s) => (
                  <div>
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                      {s.merchantName}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Destination: {s.destinationWilaya}
                    </span>
                  </div>
                ),
              },
              {
                id: 'recipient',
                header: isAr ? 'المستلم' : 'Destinataire Final',
                width: '170px',
                renderCell: (s) => (
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                      {s.recipientName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {s.recipientPhone}
                    </span>
                  </div>
                ),
              },
              {
                id: 'cod',
                header: isAr ? 'المبلغ المقبوض' : 'COD Encaissé',
                width: '130px',
                sortable: true,
                renderCell: (s) => (
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                    {formatMoney(s.codAmountDzd)}
                  </span>
                ),
              },
              {
                id: 'fee',
                header: isAr ? 'رسوم التوصيل' : 'Frais Livraison',
                width: '130px',
                renderCell: (s) => (
                  <span className="font-mono text-xs text-neutral-500">
                    -{formatMoney(s.shippingFeeDzd)}
                  </span>
                ),
              },
              {
                id: 'net',
                header: isAr ? 'الصافي للتاجر' : 'Net Vendeur',
                width: '140px',
                sortable: true,
                renderCell: (s) => (
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(s.codAmountDzd - s.shippingFeeDzd)}
                  </span>
                ),
              },
              {
                id: 'status',
                header: isAr ? 'الحالة' : 'Statut Virement',
                width: '130px',
                renderCell: (s) => {
                  const isSettled = settledIds.includes(s.id);
                  return (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        isSettled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isSettled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {isSettled ? (isAr ? 'تم التحويل' : 'Viré') : (isAr ? 'قيد التحويل' : 'À reverser')}
                    </span>
                  );
                },
              },
            ]}
            renderCard={(s) => {
              const net = s.codAmountDzd - s.shippingFeeDzd;
              const isSettled = settledIds.includes(s.id);
              return (
                <div className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded">
                      {s.trackingCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSettled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isSettled ? 'Viré' : 'À reverser'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                      {s.merchantName}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Destinataire: {s.recipientName} ({s.destinationWilaya})
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">COD Encaissé</span>
                      <span className="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                        {formatMoney(s.codAmountDzd)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block">Net Vendeur</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatMoney(net)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 390px Side Inspector Drawer */}
        {selectedShipment && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Inspector Top Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                    {selectedShipment.trackingCode}
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                    {selectedShipment.merchantName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
              <button
                onClick={() => setInspectorTab('rapprochement')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'rapprochement'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'المطابقة المالية' : 'Décompte COD'}
              </button>
              <button
                onClick={() => setInspectorTab('colis')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'colis'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'الطرد والتسليم' : 'Colis & Livreur'}
              </button>
              <button
                onClick={() => setInspectorTab('virement')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'virement'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'التحويل البنكي' : 'Virement CCP'}
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'rapprochement' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-neutral-300 text-[11px]">
                      <span>Net à Reverser au Marchand</span>
                      <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {settledIds.includes(selectedShipment.id) ? 'Transféré' : 'En Attente'}
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white">
                      {formatMoney(selectedShipment.codAmountDzd - selectedShipment.shippingFeeDzd)}
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Montant net disponible pour virement bancaire ou paiement en espèces au guichet hub.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Détails de l'Encaissement
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Montant COD Perçu (Livreur):</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(selectedShipment.codAmountDzd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                      <span>Frais de Transport Hub:</span>
                      <span className="font-mono font-semibold">
                        -{formatMoney(selectedShipment.shippingFeeDzd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
                      <span className="font-bold text-neutral-900 dark:text-white">Solde Net Marchand:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(selectedShipment.codAmountDzd - selectedShipment.shippingFeeDzd)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-neutral-900 dark:text-white">Reversement</span>
                      <span className="text-[10px] text-neutral-500">
                        {settledIds.includes(selectedShipment.id) ? 'Virement déjà exécuté' : 'Valider le paiement du marchand'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSettle(selectedShipment.id, selectedShipment.merchantName, selectedShipment.codAmountDzd - selectedShipment.shippingFeeDzd)}
                      disabled={settledIds.includes(selectedShipment.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white disabled:opacity-50 transition-colors"
                    >
                      {settledIds.includes(selectedShipment.id) ? 'Soldé ✓' : 'Virer Net'}
                    </button>
                  </div>
                </div>
              )}

              {inspectorTab === 'colis' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Livraison & Remise
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Code AWB:</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedShipment.trackingCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Client:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{selectedShipment.recipientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Téléphone:</span>
                        <span className="font-mono text-neutral-900 dark:text-white">{selectedShipment.recipientPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Wilaya:</span>
                        <span className="font-bold text-[#C4785A]">{selectedShipment.destinationWilaya}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Livreur assigné:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{selectedShipment.assignedDriverName || 'Livreur Express'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 size={13} />
                      <span>Espèces Remises au Hub Central</span>
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Montant collecté par le livreur encaissé et vérifié par la caisse du centre de tri.
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === 'virement' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Coordonnées Bancaires / CCP Marchand
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Bénéficiaire:</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{selectedShipment.merchantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Compte CCP / RIP:</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">007 99999 0012345678 44</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Mode de paiement:</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">Virement Automatique</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono block">Référence Bancaire Télé-compensée</span>
                    <p className="font-bold text-xs text-neutral-900 dark:text-white">VIR-COD-{selectedShipment.trackingCode}</p>
                    <span className="text-[9px] text-neutral-500 font-mono">Bordereau cryptographique horodaté</span>
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
                onClick={() => {
                  showToast(
                    isAr ? 'جاري طباعة كشف تسوية التاجر' : 'Impression du bordereau de reversement',
                    'success'
                  );
                }}
              >
                {isAr ? 'طباعة كشف تحويل المستحقات' : 'Imprimer Bordereau Reversement'}
              </AtriumButton>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
