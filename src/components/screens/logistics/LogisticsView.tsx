import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  QrCode,
  MapPin,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
  BarChart2,
  DollarSign,
  AlertCircle,
  FileText,
  ScanLine,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { LogisticsShipment, LogisticsManifest } from '../../../types/index';

interface LogisticsViewProps {
  initialTab?: 'dashboard' | 'shipments' | 'manifests' | 'scanner' | 'cod';
}

export const LogisticsView: React.FC<LogisticsViewProps> = ({ initialTab = 'dashboard' }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const { t } = useTranslation();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'shipments' | 'manifests' | 'scanner' | 'cod'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWilaya, setFilterWilaya] = useState<string>('all');

  // Modals
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [selectedShipmentForLabel, setSelectedShipmentForLabel] = useState<LogisticsShipment | null>(null);
  const [selectedShipmentForPod, setSelectedShipmentForPod] = useState<LogisticsShipment | null>(null);

  // Scanner Simulator State
  const [scannedCode, setScannedCode] = useState('');

  // Mock State
  const [shipments, setShipments] = useState<LogisticsShipment[]>([
    {
      id: 'ship_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      trackingCode: 'ATR-EXP-88912',
      merchantName: 'Boutique E-commerce Électro SARL',
      recipientName: 'Abdelkader Meziani',
      recipientPhone: '0555 41 22 33',
      destinationWilaya: '16 - Alger (Kouba)',
      destinationAddress: 'Cité Oasis, Bâtiment 4, Kouba',
      codAmountDzd: 8500,
      shippingFeeDzd: 600,
      weightKg: 1.8,
      status: 'OutForDelivery',
      assignedDriverName: 'Farid (Van 04)',
      createdAt: '2026-05-25T08:00:00Z',
    },
    {
      id: 'ship_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      trackingCode: 'ATR-EXP-88913',
      merchantName: 'Cosmétique Bio Alger',
      recipientName: 'Amina Saidi',
      recipientPhone: '0661 99 88 11',
      destinationWilaya: '31 - Oran (Bir El Djir)',
      destinationAddress: 'Résidence El Bahia, Oran',
      codAmountDzd: 14200,
      shippingFeeDzd: 900,
      weightKg: 0.9,
      status: 'Delivered',
      assignedDriverName: 'Hamid (Oran Sud)',
      createdAt: '2026-05-24T09:00:00Z',
    },
    {
      id: 'ship_03',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      trackingCode: 'ATR-EXP-88914',
      merchantName: 'Quincaillerie & Outillage Gros',
      recipientName: 'Mohamed Brahimi',
      recipientPhone: '0770 12 34 56',
      destinationWilaya: '25 - Constantine (El Khroub)',
      destinationAddress: 'Zone Industrielle, El Khroub',
      codAmountDzd: 32000,
      shippingFeeDzd: 1200,
      weightKg: 8.5,
      status: 'HubIntake',
      createdAt: '2026-05-25T11:00:00Z',
    },
    {
      id: 'ship_04',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      trackingCode: 'ATR-EXP-88915',
      merchantName: 'Mode & Prêt-à-Porter Féminin',
      recipientName: 'Yasmine Benzerga',
      recipientPhone: '0550 88 77 66',
      destinationWilaya: '09 - Blida (Boufarik)',
      destinationAddress: 'Rue des Orangers, Boufarik',
      codAmountDzd: 6800,
      shippingFeeDzd: 500,
      weightKg: 1.2,
      status: 'Sorted',
      createdAt: '2026-05-25T13:00:00Z',
    },
  ]);

  const [manifests, setManifests] = useState<LogisticsManifest[]>([
    {
      id: 'man_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      manifestNumber: 'MAN-2026-0188',
      driverName: 'Farid (Van 04)',
      driverPhone: '0555 00 11 22',
      vehiclePlate: '04123-119-16',
      dispatchDate: '2026-05-25',
      zoneWilaya: 'Alger Centre & Est',
      shipmentIds: ['ship_01'],
      totalShipmentsCount: 1,
      totalCodExpectedDzd: 8500,
      totalCodCollectedDzd: 0,
      status: 'Dispatched',
      createdAt: '2026-05-25T08:30:00Z',
    },
  ]);

  // Form states for AWB Modal
  const [awbMerchant, setAwbMerchant] = useState('');
  const [awbRecipient, setAwbRecipient] = useState('');
  const [awbPhone, setAwbPhone] = useState('');
  const [awbWilaya, setAwbWilaya] = useState('16 - Alger');
  const [awbAddress, setAwbAddress] = useState('');
  const [awbCod, setAwbCod] = useState('5000');
  const [awbFee, setAwbFee] = useState('600');
  const [awbWeight, setAwbWeight] = useState('1.5');

  // Form states for Manifest Modal
  const [manDriver, setManDriver] = useState('');
  const [manPhone, setManPhone] = useState('0550 00 00 00');
  const [manPlate, setManPlate] = useState('00000-120-16');
  const [manZone, setManZone] = useState('Alger & Banlieue');

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    const createdShipment: LogisticsShipment = {
      id: `ship_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      trackingCode: `ATR-EXP-${Math.floor(10000 + Math.random() * 90000)}`,
      merchantName: awbMerchant,
      recipientName: awbRecipient,
      recipientPhone: awbPhone,
      destinationWilaya: awbWilaya,
      destinationAddress: awbAddress || awbWilaya,
      codAmountDzd: parseInt(awbCod, 10) || 0,
      shippingFeeDzd: parseInt(awbFee, 10) || 600,
      weightKg: parseFloat(awbWeight) || 1.0,
      status: 'HubIntake',
      createdAt: new Date().toISOString(),
    };

    setShipments([createdShipment, ...shipments]);
    setIsShipmentModalOpen(false);
    setAwbMerchant('');
    setAwbRecipient('');
    setAwbPhone('');
    showToast({
      type: 'success',
      title: isAr ? 'تم إنشاء بوليصة الشحن (AWB)' : 'Bordereau AWB Enregistré',
      message: `Colis ${createdShipment.trackingCode} pris en charge au hub.`,
    });
  };

  const handleCreateManifest = (e: React.FormEvent) => {
    e.preventDefault();
    const assignableShipments = shipments.filter((s) => s.status === 'HubIntake' || s.status === 'Sorted');
    const totalCod = assignableShipments.reduce((acc, s) => acc + s.codAmountDzd, 0);

    const createdManifest: LogisticsManifest = {
      id: `man_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      manifestNumber: `MAN-2026-${String(manifests.length + 189).padStart(4, '0')}`,
      driverName: manDriver || 'Chauffeur Messagerie',
      driverPhone: manPhone,
      vehiclePlate: manPlate,
      dispatchDate: new Date().toISOString().split('T')[0],
      zoneWilaya: manZone,
      shipmentIds: assignableShipments.map((s) => s.id),
      totalShipmentsCount: assignableShipments.length,
      totalCodExpectedDzd: totalCod,
      totalCodCollectedDzd: 0,
      status: 'Dispatched',
      createdAt: new Date().toISOString(),
    };

    setManifests([createdManifest, ...manifests]);
    setShipments(
      shipments.map((s) =>
        assignableShipments.some((as) => as.id === s.id)
          ? { ...s, status: 'OutForDelivery', assignedDriverName: createdManifest.driverName }
          : s
      )
    );
    setIsManifestModalOpen(false);
    showToast({
      type: 'success',
      title: isAr ? 'تم إصدار مسار التوزيع' : 'Feuille de Route Générée',
      message: `${createdManifest.manifestNumber} confiée à ${createdManifest.driverName} (${createdManifest.totalShipmentsCount} colis).`,
    });
  };

  const handleConfirmDelivery = (shipmentId: string) => {
    setShipments(
      shipments.map((s) => (s.id === shipmentId ? { ...s, status: 'Delivered' } : s))
    );
    setSelectedShipmentForPod(null);
    showToast({
      type: 'success',
      title: isAr ? 'تم تأكيد تسليم الطرد' : 'Livraison Confirmée',
      message: 'Montant COD encaissé et décharge client enregistrée.',
    });
  };

  const handleScannerScan = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = scannedCode.trim().toUpperCase();
    const found = shipments.find((s) => s.trackingCode.toUpperCase() === clean);
    if (found) {
      setShipments(
        shipments.map((s) => (s.id === found.id ? { ...s, status: 'Sorted' } : s))
      );
      showToast({
        type: 'success',
        title: 'Bip Scan Réussi',
        message: `${found.trackingCode} trié vers ${found.destinationWilaya}.`,
      });
      setScannedCode('');
    } else {
      showToast({
        type: 'error',
        title: 'Code Non Référencé',
        message: `Aucun colis trouvé avec le code ${clean}.`,
      });
    }
  };

  // Metrics
  const totalShipments = shipments.length;
  const totalCodCollectedDzd = shipments
    .filter((s) => s.status === 'Delivered')
    .reduce((acc, s) => acc + s.codAmountDzd, 0);
  const totalCodPendingDzd = shipments
    .filter((s) => s.status !== 'Delivered' && s.status !== 'Cancelled')
    .reduce((acc, s) => acc + s.codAmountDzd, 0);
  const totalShippingRevenueDzd = shipments
    .filter((s) => s.status === 'Delivered')
    .reduce((acc, s) => acc + s.shippingFeeDzd, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold shadow-sm border border-cyan-100 dark:border-cyan-800">
            <Truck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الخدمات اللوجستية وتوصيل الطرود' : 'Messagerie Express & Logistique Colis'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                FacilityType: 23
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'بوالص الشحن (AWB)، مسارات التوزيع، فرز الطرود بالباركود، وتحصيل الدفع عند الاستلام (COD)'
                : 'Bordereaux AWB, feuilles de route chauffeurs, tri hub et réconciliation Cash-on-Delivery (COD)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManifestModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Truck size={15} />
            <span>{isAr ? 'مسار توزيع جديد' : '+ Nouvelle Tournée'}</span>
          </button>
          <button
            onClick={() => setIsShipmentModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>{isAr ? 'طرد جديد (AWB)' : '+ Nouveau Colis (AWB)'}</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <BarChart2 size={15} />
          <span>{isAr ? 'مركز الفرز' : 'Hub Pulse'}</span>
        </button>
        <button
          onClick={() => setActiveTab('shipments')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'shipments' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Package size={15} />
          <span>{isAr ? `الطرود والشحنات (${shipments.length})` : `Colis & Expéditions (${shipments.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('manifests')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'manifests' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Truck size={15} />
          <span>{isAr ? `مسارات التوصيل (${manifests.length})` : `Feuilles de Route (${manifests.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'scanner' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <ScanLine size={15} />
          <span>{isAr ? 'ماسح الباركود' : 'Scanner de Tri'}</span>
        </button>
        <button
          onClick={() => setActiveTab('cod')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'cod' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <DollarSign size={15} />
          <span>{isAr ? 'تحصيل COD ومستحقات التجار' : 'Caisse COD & Règlements'}</span>
        </button>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD                                                          */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'إجمالي الطرود بالمركز' : 'Colis Traités au Hub'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-cyan-600">{totalShipments}</div>
                <div className="text-[11px] text-neutral-400 mt-1">Flux 58 Wilayas</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'أموال COD المحصلة' : 'COD Encaissé (Caisse)'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
                  {formatMoney(totalCodCollectedDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 font-medium">À reverser aux e-commerçants</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'أموال COD الجارية في التوصيل' : 'COD en Cours (Chauffeurs)'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-amber-600">
                  {formatMoney(totalCodPendingDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">En cours de livraison</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'مداخيل التوصيل والشحن' : 'Chiffre d\'Affaires Livraison'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-blue-600">
                  {formatMoney(totalShippingRevenueDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Frais nets agence</div>
              </div>
            </div>

            {/* Active Delivery Runs */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Truck size={16} className="text-cyan-600" />
                  <span>{isAr ? 'مسارات التوصيل الميدانية النشطة اليوم' : 'Tournées Chauffeurs en Distribution'}</span>
                </h3>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {manifests.map((m) => (
                  <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded">
                          {m.manifestNumber}
                        </span>
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">{m.driverName}</span>
                        <span className="text-neutral-500 font-mono">({m.vehiclePlate})</span>
                      </div>
                      <div className="text-neutral-500">
                        Zone: <strong className="text-neutral-900 dark:text-white">{m.zoneWilaya}</strong> · {m.totalShipmentsCount} colis · COD Attendu: {formatMoney(m.totalCodExpectedDzd, 'DZD')}
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SHIPMENTS & WAYBILLS                                               */}
        {/* ========================================================================= */}
        {activeTab === 'shipments' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shipments.map((s) => (
                <div key={s.id} className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                      {s.trackingCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        s.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'OutForDelivery'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-neutral-900 dark:text-white">
                    Destinataire: {s.recipientName} ({s.recipientPhone})
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1">
                    <MapPin size={13} className="shrink-0 text-neutral-400" />
                    <span>{s.destinationAddress} · <strong>{s.destinationWilaya}</strong></span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono text-center text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400">Montant COD</div>
                      <div className="font-bold text-emerald-600 mt-0.5">{formatMoney(s.codAmountDzd, 'DZD')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Frais Livraison</div>
                      <div className="font-bold mt-0.5">{formatMoney(s.shippingFeeDzd, 'DZD')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Poids (kg)</div>
                      <div className="font-bold mt-0.5">{s.weightKg} kg</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-500 text-[11px]">Expéditeur: {s.merchantName}</span>
                    <div className="flex items-center gap-2">
                      {s.status !== 'Delivered' && (
                        <button
                          onClick={() => setSelectedShipmentForPod(s)}
                          className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                        >
                          Décharge POD
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedShipmentForLabel(s)}
                        className="text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={13} />
                        <span>Étiquette Thermique</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MANIFESTS                                                          */}
        {/* ========================================================================= */}
        {activeTab === 'manifests' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 font-bold text-xs flex justify-between items-center">
                <span>Feuilles de Route Chauffeurs & Décharges</span>
                <button
                  onClick={() => setIsManifestModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-cyan-600 text-white text-xs font-semibold cursor-pointer"
                >
                  + Nouvelle Tournée
                </button>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {manifests.map((m) => (
                  <div key={m.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                          {m.manifestNumber}
                        </span>
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">{m.driverName}</span>
                      </div>
                      <div className="text-neutral-500">
                        Date: {m.dispatchDate} · Zone: {m.zoneWilaya} · Véhicule: {m.vehiclePlate}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] text-neutral-400">Colis & COD Attendu</div>
                        <div className="font-mono font-bold text-xs text-cyan-600">
                          {m.totalShipmentsCount} colis · {formatMoney(m.totalCodExpectedDzd, 'DZD')}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          window.print();
                          showToast({
                            type: 'success',
                            title: 'Feuille de Route Imprimée',
                            message: 'Document de tournée prêt pour le chauffeur.',
                          });
                        }}
                        className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={13} />
                        <span>Imprimer Manifeste</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SCANNER DE TRI                                                     */}
        {/* ========================================================================= */}
        {activeTab === 'scanner' && (
          <div className="max-w-xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-6 text-center text-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center">
              <ScanLine size={32} />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {isAr ? 'قارئ الباركود السريع لفرز الطرود' : 'Poste de Tri & Scan Douchette Hub'}
              </h2>
              <p className="text-neutral-500 text-xs">
                Scannez le code-barres AWB ou saisissez le code pour aiguiller automatiquement vers la Wilaya de destination.
              </p>
            </div>

            <form onSubmit={handleScannerScan} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Ex: ATR-EXP-88914..."
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                className="w-full text-center py-3 text-base font-mono font-bold border-2 border-cyan-500 rounded-xl bg-cyan-50/20 dark:bg-cyan-950/20 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Valider Scan Bip
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: COD & MERCHANT SETTLEMENTS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'cod' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-600" />
              <span>Règlements E-Commerçants & Rapprochement Caisse COD</span>
            </h3>
            <p className="text-neutral-500">
              Déduction automatique des frais de livraison et génération des bordereaux de virement CCP / Dahabia pour les expéditeurs.
            </p>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {shipments
                .filter((s) => s.status === 'Delivered')
                .map((s) => {
                  const netMerchant = s.codAmountDzd - s.shippingFeeDzd;
                  return (
                    <div key={s.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-neutral-900 dark:text-white">{s.merchantName}</div>
                        <div className="text-neutral-500">Colis: {s.trackingCode} · Destinataire: {s.recipientName}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right font-mono">
                          <div className="text-[10px] text-neutral-400">COD / Frais / Net</div>
                          <div>
                            <span className="font-bold">{formatMoney(s.codAmountDzd, 'DZD')}</span>
                            <span className="text-neutral-400"> - </span>
                            <span className="text-red-500">{formatMoney(s.shippingFeeDzd, 'DZD')}</span>
                            <span className="text-neutral-400"> = </span>
                            <span className="font-bold text-emerald-600">{formatMoney(netMerchant, 'DZD')}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            showToast({
                              type: 'success',
                              title: 'Virement CCP É-commerçant Validé',
                              message: `Règlement net de ${formatMoney(netMerchant, 'DZD')} transmis.`,
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold cursor-pointer"
                        >
                          Virer Net Marchand
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NOUVEAU COLIS AWB                                                */}
      {/* ========================================================================= */}
      {isShipmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Package size={18} className="text-cyan-600" />
                <span>Nouveau Colis & Bordereau d'Expédition (AWB)</span>
              </h2>
              <button onClick={() => setIsShipmentModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateShipment} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Boutique Expéditrice (Marchand) *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: SARL Électronique Alger"
                  value={awbMerchant}
                  onChange={(e) => setAwbMerchant(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Nom Destinataire *</label>
                  <input
                    required
                    type="text"
                    placeholder="M. Abdelkader"
                    value={awbRecipient}
                    onChange={(e) => setAwbRecipient(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Téléphone Destinataire *</label>
                  <input
                    required
                    type="text"
                    placeholder="0555 00 00 00"
                    value={awbPhone}
                    onChange={(e) => setAwbPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Wilaya de Destination *</label>
                  <select
                    value={awbWilaya}
                    onChange={(e) => setAwbWilaya(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  >
                    <option value="16 - Alger">16 - Alger</option>
                    <option value="31 - Oran">31 - Oran</option>
                    <option value="25 - Constantine">25 - Constantine</option>
                    <option value="09 - Blida">09 - Blida</option>
                    <option value="19 - Sétif">19 - Sétif</option>
                    <option value="23 - Annaba">23 - Annaba</option>
                    <option value="30 - Ouargla">30 - Ouargla</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Poids (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={awbWeight}
                    onChange={(e) => setAwbWeight(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Adresse de Livraison Précise</label>
                <input
                  type="text"
                  placeholder="Cité, Numéro d'appartement, Commune"
                  value={awbAddress}
                  onChange={(e) => setAwbAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Montant COD à Encaisser (DZD) *</label>
                  <input
                    required
                    type="number"
                    value={awbCod}
                    onChange={(e) => setAwbCod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Frais de Livraison (DZD)</label>
                  <input
                    type="number"
                    value={awbFee}
                    onChange={(e) => setAwbFee(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsShipmentModalOpen(false)} className="px-3 py-1.5 border rounded">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 bg-cyan-600 text-white rounded font-medium">
                  Enregistrer & Générer Code AWB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NOUVELLE TOURNÉE                                                 */}
      {/* ========================================================================= */}
      {isManifestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Truck size={18} className="text-cyan-600" />
                <span>Créer une Tournée & Feuille de Route Chauffeur</span>
              </h2>
              <button onClick={() => setIsManifestModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateManifest} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nom du Chauffeur / Livreur *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Farid Belkacem"
                  value={manDriver}
                  onChange={(e) => setManDriver(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Téléphone Chauffeur</label>
                  <input
                    type="text"
                    value={manPhone}
                    onChange={(e) => setManPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Matricule Véhicule</label>
                  <input
                    type="text"
                    value={manPlate}
                    onChange={(e) => setManPlate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Zone Géographique de Distribution</label>
                <input
                  type="text"
                  value={manZone}
                  onChange={(e) => setManZone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 text-[11px] leading-relaxed">
                Tous les colis actuellement en statut "HubIntake" ou "Sorted" seront automatiquement agrégés sur la feuille de route du livreur avec le montant COD total sous sa responsabilité.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsManifestModalOpen(false)} className="px-3 py-1.5 border rounded">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 bg-cyan-600 text-white rounded font-medium">
                  Émettre la Feuille de Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ÉTIQUETTE THERMIQUE AWB (100x150mm)                              */}
      {/* ========================================================================= */}
      {selectedShipmentForLabel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-300 space-y-4 text-xs font-mono">
            <div className="border-b-2 border-dashed border-neutral-800 pb-3 flex justify-between items-center font-sans">
              <div>
                <div className="font-black text-sm uppercase">ATRIUM EXPRESS</div>
                <div className="text-[10px] text-neutral-500">Messagerie & Logistique 58 Wilayas</div>
              </div>
              <div className="font-bold text-cyan-700 font-mono text-sm">
                {selectedShipmentForLabel.trackingCode}
              </div>
            </div>

            <div className="p-3 bg-neutral-100 rounded border border-neutral-300 space-y-1">
              <div className="text-[10px] uppercase font-bold text-neutral-500">Destinataire:</div>
              <div className="font-bold text-sm font-sans">{selectedShipmentForLabel.recipientName}</div>
              <div className="font-sans text-xs">{selectedShipmentForLabel.recipientPhone}</div>
              <div className="font-sans text-xs text-neutral-600">{selectedShipmentForLabel.destinationAddress}</div>
              <div className="font-bold text-sm text-cyan-800">{selectedShipmentForLabel.destinationWilaya}</div>
            </div>

            <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded text-center">
              <div className="text-[10px] uppercase font-bold text-amber-800">Montant à Encaisser (COD)</div>
              <div className="text-xl font-black text-amber-900">
                {formatMoney(selectedShipmentForLabel.codAmountDzd, 'DZD')}
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="w-full h-12 bg-neutral-900 text-white flex items-center justify-center tracking-widest text-xs font-bold">
                |||||| | ||||| |||| |||||| ||||
              </div>
              <div className="text-[10px] text-neutral-400 font-sans">Code128 Barcode Simulation</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setSelectedShipmentForLabel(null)} className="px-3 py-1.5 border rounded font-sans">
                Fermer
              </button>
              <button
                onClick={() => {
                  window.print();
                  showToast({
                    type: 'success',
                    title: 'Étiquette Imprimée',
                    message: 'Format thermique 100x150mm généré.',
                  });
                }}
                className="px-4 py-1.5 bg-cyan-600 text-white rounded font-bold font-sans flex items-center gap-1"
              >
                <Printer size={14} />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: POD SIGN-OFF                                                     */}
      {/* ========================================================================= */}
      {selectedShipmentForPod && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Confirmation de Livraison (POD)</span>
            </h2>

            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 space-y-1">
              <div>Colis: <strong>{selectedShipmentForPod.trackingCode}</strong></div>
              <div>Client: <strong>{selectedShipmentForPod.recipientName}</strong></div>
              <div>Montant Encaissé: <strong className="text-emerald-600">{formatMoney(selectedShipmentForPod.codAmountDzd, 'DZD')}</strong></div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold">Signature Client sur Écran tactile</div>
              <div className="w-full h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl flex items-center justify-center text-neutral-400">
                [ Signature Digitale Capturée ]
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setSelectedShipmentForPod(null)} className="px-3 py-1.5 border rounded">
                Annuler
              </button>
              <button
                onClick={() => handleConfirmDelivery(selectedShipmentForPod.id)}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium"
              >
                Confirmer la Décharge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
