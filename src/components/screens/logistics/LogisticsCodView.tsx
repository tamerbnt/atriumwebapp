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
  FileText,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsShipment, CourierCashDischarge, MerchantRemittanceBatch } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { AlgeriePosteSfp01Modal } from './AlgeriePosteSfp01Modal';
import { calculateDriverPayout } from '../../../utils/logisticsRules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const LogisticsCodView: React.FC = () => {
  const { language, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';
  const { shipments, discharges, remittances, executeRemittance } = useLogisticsData();

  const [settledIds, setSettledIds] = useState<string[]>(['shp_01']);
  const [selectedShipment, setSelectedShipment] = useState<LogisticsShipment | null>(null);
  const [isSfp01ModalOpen, setIsSfp01ModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'shipments' | 'discharges' | 'remittances' | 'driver_payroll'>('shipments');

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

  // Driver Payroll Simulation (Feature 8)
  const salariedDriverPay = calculateDriverPayout({
    employmentType: 'salaried',
    completedDeliveries: 18,
    returnedDeliveries: 2,
    baseSalaryMonthlyDzd: 48000,
    fuelAllowanceDzd: 1500,
  });

  const freelanceDriverPay = calculateDriverPayout({
    employmentType: 'freelance_commission',
    completedDeliveries: 26,
    returnedDeliveries: 3,
    commissionPerDeliveredDzd: 220,
    commissionPerReturnDzd: 50,
    fuelAllowanceDzd: 1000,
    withholdingTaxRatePercent: 5.0,
  });

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

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: deliveredShipments.length > 0,
  });

  if (showSkeleton && (deliveredShipments.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode="list"
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

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
                {isAr ? 'تحصيل COD ومستحقات التجار وبريد الجزائر' : 'Caisse COD & Règlements E-Commerçants'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Paiement à la Livraison
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'مطابقة مبالغ الدفع عند الاستلام، تبرئة ذمة السائقين، وتصدير دفعات بريد الجزائر CCP SFP 01'
                : 'Rapprochement des encaissements à la livraison, décharge coffre livreurs & télétransmission CCP'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => setIsSfp01ModalOpen(true)}
            icon={<Building2 size={14} />}
          >
            {isAr ? 'بريد الجزائر SFP 01 / B1' : 'Export CCP SFP 01'}
          </AtriumButton>

          <AtriumButton
            variant="primary"
            size="sm"
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
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {deliveredShipments.length} {isAr ? 'طرد تم تسليمه بنجاح' : 'expéditions encaissées'}
              </p>
            </div>
          </div>

          {/* Card 2: Commissions Transport */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'رسوم التوصيل المستحقة للشركة' : 'Commissions & Frais Livraison'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-[#C4785A] font-mono tabular-nums">
                {formatMoney(totalShippingFees)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                Chiffre d'affaires prestations
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'صافي مستحقات المتاجر للتحويل' : 'Solde Net à Reverser'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Marchands
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalNetToMerchants)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                Prêt pour virement CCP / BaridiMob
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Strip: Shipments Settled vs Driver Discharges vs CCP Batches vs Payroll */}
      <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700 w-fit">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'shipments'
              ? 'bg-white dark:bg-neutral-900 text-[#C4785A] shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {isAr ? 'تسويات الطرود' : 'Rapprochement Colis'}
        </button>
        <button
          onClick={() => setActiveTab('discharges')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'discharges'
              ? 'bg-white dark:bg-neutral-900 text-[#C4785A] shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {isAr ? 'محاضر تبرئة ذمة السائقين' : 'Bons de Décharge Chauffeurs'}
        </button>
        <button
          onClick={() => setActiveTab('remittances')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'remittances'
              ? 'bg-white dark:bg-neutral-900 text-[#C4785A] shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {isAr ? 'دفعات بريد الجزائر CCP' : 'Lots CCP SFP 01'}
        </button>
        <button
          onClick={() => setActiveTab('driver_payroll')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'driver_payroll'
              ? 'bg-white dark:bg-neutral-900 text-[#C4785A] shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {isAr ? 'أجور وعمولات السائقين' : 'Paie & Commissions Livreurs'}
        </button>
      </div>

      {/* Tab 1: Shipments Collection */}
      {activeTab === 'shipments' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'طرود جاهزة لتسوية المستحقات' : 'Colis Livrés & Encaissements'}
              </h2>
              <p className="text-xs text-neutral-500">
                {isAr ? 'الطرود المسلمة والمقبوضة نقدياً بانتظار التحويل للمتاجر' : 'Règlements des e-commerçants après retenue de la commission'}
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-[#C4785A]">
              {deliveredShipments.length} {isAr ? 'طرد' : 'colis'}
            </div>
          </div>

          <UniversalDataCollection<LogisticsShipment>
            items={deliveredShipments}
            keyExtractor={(s) => s.id}
            defaultViewMode="list"
            selectedIds={new Set(settledIds)}
            onSelectionChange={(newSet) => setSettledIds(Array.from(newSet))}
            onItemClick={setSelectedShipment}
            customActions={getCodActions}
            columns={[
              {
                id: 'code',
                header: 'AWB',
                width: '130px',
                renderCell: (s: LogisticsShipment) => (
                  <span className="font-mono font-bold text-xs text-[#C4785A]">
                    {s.trackingCode}
                  </span>
                ),
              },
              {
                id: 'merchant',
                header: isAr ? 'المتجر والتاريخ' : 'Marchand / E-Boutique',
                renderCell: (s: LogisticsShipment) => (
                  <div>
                    <div className="font-semibold text-xs text-neutral-900 dark:text-white">
                      {s.merchantName}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {s.createdAt.split('T')[0]} • Dest: {s.recipientName}
                    </div>
                  </div>
                ),
              },
              {
                id: 'cod',
                header: 'Brut Encaissé',
                width: '120px',
                renderCell: (s: LogisticsShipment) => (
                  <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                    {formatMoney(s.codAmountDzd)}
                  </span>
                ),
              },
              {
                id: 'fee',
                header: 'Commission',
                width: '110px',
                renderCell: (s: LogisticsShipment) => (
                  <span className="font-mono text-xs text-neutral-500">
                    -{formatMoney(s.shippingFeeDzd)}
                  </span>
                ),
              },
              {
                id: 'net',
                header: 'Net Marchand',
                width: '120px',
                renderCell: (s: LogisticsShipment) => (
                  <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {formatMoney(s.codAmountDzd - s.shippingFeeDzd)}
                  </span>
                ),
              },
              {
                id: 'settled',
                header: 'Statut',
                width: '110px',
                renderCell: (s: LogisticsShipment) => {
                  const isSettled = settledIds.includes(s.id);
                  return (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSettled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isSettled ? 'Viré' : 'À Régler'}
                    </span>
                  );
                },
              },
            ]}
          />
        </div>
      )}

      {/* Tab 2: Discharges Table */}
      {activeTab === 'discharges' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'محاضر تبرئة ذمة السائقين (Double-Lock Vault)' : 'Registre des Billets de Décharge Chauffeurs'}
              </h3>
              <p className="text-xs text-neutral-500">
                Comptage physique des billets de banque et décharge conjointe caisse / chauffeur
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300">
              {discharges.length} procès-verbaux
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 font-medium">
                  <th className="py-2 px-3">N° Décharge</th>
                  <th className="py-2 px-3">Chauffeur</th>
                  <th className="py-2 px-3">Date & Heure</th>
                  <th className="py-2 px-3 text-right">Attendu</th>
                  <th className="py-2 px-3 text-right">Compté</th>
                  <th className="py-2 px-3 text-right">Écart</th>
                  <th className="py-2 px-3">Statut</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                {discharges.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-2.5 px-3 font-bold text-[#C4785A]">{d.dischargeNumber}</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-white">
                      {d.courierStaffId}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">{d.timestamp.replace('T', ' ').slice(0, 16)}</td>
                    <td className="py-2.5 px-3 text-right">{formatMoney(d.expectedCodDzd)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white">
                      {formatMoney(d.actualCashTurnedInDzd)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        d.discrepancyDzd === 0
                          ? 'text-emerald-600'
                          : d.discrepancyDzd < 0
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {d.discrepancyDzd === 0 ? '0 DZD' : `${d.discrepancyDzd} DZD`}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          d.status === 'Clean'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {d.status === 'Clean' ? 'Décharge Conforme' : 'Manquant (Shortage)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <AtriumButton
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          showToast(isAr ? 'طباعة محضر التبرئة' : 'Impression décharge', 'info');
                          window.print();
                        }}
                        icon={<Printer size={12} />}
                      >
                        Reçu
                      </AtriumButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Remittances Table */}
      {activeTab === 'remittances' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'دفعات التحويل البريدي للتجار (Algérie Poste & BaridiMob)' : 'Lots de Règlements E-Commerçants'}
              </h3>
              <p className="text-xs text-neutral-500">
                Télétransmission des bordereaux SFP 01 / B1 et virements BaridiMob avec Clé 97
              </p>
            </div>
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setIsSfp01ModalOpen(true)}
              icon={<Building2 size={14} />}
            >
              {isAr ? 'تصدير SFP 01' : 'Générer Fichier ASCII'}
            </AtriumButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 font-medium">
                  <th className="py-2 px-3">Lot N°</th>
                  <th className="py-2 px-3">Commerçant</th>
                  <th className="py-2 px-3">Compte CCP / Clé</th>
                  <th className="py-2 px-3">Canal</th>
                  <th className="py-2 px-3 text-right">Net à Verser</th>
                  <th className="py-2 px-3">Statut</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                {remittances.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-2.5 px-3 font-bold text-[#C4785A]">{r.batchNumber}</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-white">
                      {r.merchantName}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">
                      {r.ccpAccount} <span className="text-[#C4785A] font-bold">Clé {r.ccpKey}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {r.paymentChannel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(r.netPayoutDzd)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'Executed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {r.status === 'Executed' ? 'Exécuté' : 'En Attente'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      {r.status !== 'Executed' ? (
                        <AtriumButton
                          variant="primary"
                          size="xs"
                          onClick={() => {
                            executeRemittance(r.id);
                            showToast(
                              isAr ? `تم تنفيذ التحويل للدفعة ${r.batchNumber}` : `Virement ${r.batchNumber} exécuté`,
                              'success'
                            );
                          }}
                          icon={<Send size={12} />}
                        >
                          Exécuter
                        </AtriumButton>
                      ) : (
                        <span className="text-[10px] text-neutral-400 font-mono">Archivé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Driver Payroll Simulation (Feature 8) */}
      {activeTab === 'driver_payroll' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Salaried Internal Driver Card */}
          <div className="p-5 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Truck size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {isAr ? 'سائق أجير دائم (Salarié CDI)' : 'Chauffeur Salarié Flotte Interne'}
                </h3>
                <span className="text-[11px] text-neutral-500">
                  Salaire fixe mensuel + prime de livraison (50 DZD/colis) + carburant
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Base Journalière (48 000 DZD / 26j):</span>
                <span className="font-mono font-bold">1 846 DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Prime de Rendement (18 colis × 50 DZD):</span>
                <span className="font-mono font-bold text-emerald-600">+900 DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Indemnité Carburant / Péage:</span>
                <span className="font-mono font-bold">+1 500 DZD</span>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between font-bold text-sm">
                <span>Net Journalier à Payer:</span>
                <span className="font-mono text-[#C4785A]">{formatMoney(salariedDriverPay.netPayoutDzd)}</span>
              </div>
            </div>
          </div>

          {/* Auto-Entrepreneur Subcontractor Card */}
          <div className="p-5 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <UserCheck size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {isAr ? 'سائق مقاول ذاتي (Auto-Entrepreneur)' : 'Livreur Sous-Traitant Auto-Entrepreneur'}
                </h3>
                <span className="text-[11px] text-neutral-500">
                  Rémunération à l'acte (Loi 22-23) • Retenue à la source IFU 5%
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Colis Livrés (26 × 220 DZD):</span>
                <span className="font-mono font-bold">5 720 DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Retours Traités (3 × 50 DZD):</span>
                <span className="font-mono font-bold">+150 DZD</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Retenue Impôt Libératoire IFU 5%:</span>
                <span className="font-mono font-bold">-{formatMoney(freelanceDriverPay.taxWithheldDzd)}</span>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between font-bold text-sm">
                <span>Net Viré au Chauffeur:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(freelanceDriverPay.netPayoutDzd)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Algérie Poste SFP 01 Modal */}
      <AlgeriePosteSfp01Modal
        isOpen={isSfp01ModalOpen}
        onClose={() => setIsSfp01ModalOpen(false)}
        batches={remittances}
      />
    </div>
  );
};
