import React, { useState } from 'react';
import {
  ScanLine,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Package,
  ShieldCheck,
  Printer,
  Eye,
  Check,
  X,
  Share2,
  Truck,
  Barcode,
  Navigation,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsShipment } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const LogisticsScannerView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { shipments, updateShipmentStatus } = useLogisticsData();

  const [scannedCode, setScannedCode] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<LogisticsShipment | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'colis' | 'quai' | 'scans'>('colis');
  const [scanHistory, setScanHistory] = useState<
    Array<{ code: string; status: 'success' | 'error'; message: string; timestamp: string }>
  >([]);

  const sortedCount = shipments.filter((s) => s.status === 'Sorted' || s.status === 'OutForDelivery' || s.status === 'Delivered').length;
  const inHubCount = shipments.filter((s) => s.status === 'HubIntake' || s.status === 'ReceivedAtHub').length;

  const handleScanCode = (codeToScan: string) => {
    const clean = codeToScan.trim().toUpperCase();
    if (!clean) return;

    const found = shipments.find((s) => s.trackingCode.toUpperCase() === clean);
    const now = new Date().toLocaleTimeString();

    if (found) {
      updateShipmentStatus(found.id, 'Sorted');
      setScanHistory((prev) => [
        {
          code: clean,
          status: 'success',
          message: `Trié vers: ${found.destinationWilaya} (${found.recipientName})`,
          timestamp: now,
        },
        ...prev.slice(0, 9),
      ]);
      setSelectedShipment(found);
      showToast(
        isAr ? `تم فرز الطرد: ${clean}` : `Scan réussi: ${clean} aiguillé`,
        'success'
      );
    } else {
      setScanHistory((prev) => [
        {
          code: clean,
          status: 'error',
          message: isAr ? 'الرمز غير مسجل في النظام' : 'Code AWB non répertorié au Hub',
          timestamp: now,
        },
        ...prev.slice(0, 9),
      ]);
      showToast(
        isAr ? 'كود الطرد غير موجود' : 'Code AWB inconnu',
        'error'
      );
    }

    setScannedCode('');
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanCode(scannedCode);
  };

  const getScannerActions = (s: LogisticsShipment): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة الطرد' : 'Consulter Colis',
      icon: <Eye size={14} />,
      onClick: () => setSelectedShipment(s),
    },
    {
      label: isAr ? 'فرز وتوجيه' : 'Aiguiller Quai',
      icon: <Check size={14} />,
      onClick: () => handleScanCode(s.trackingCode),
    },
    {
      label: isAr ? 'طباعة الباركود' : 'Imprimer Barcode',
      icon: <Printer size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `طباعة ملصق الباركود للطرد ${s.trackingCode}`
            : `Étiquette AWB générée pour ${s.trackingCode}`,
          'info'
        );
      },
    },
    {
      label: isAr ? 'مشاركة الوصل' : 'Partager Bordereau',
      icon: <Share2 size={14} />,
      onClick: () => {
        showToast(
          isAr ? 'تم نسخ رابط تتبع الشحنة' : `Lien de tracking ${s.trackingCode} copié`,
          'success'
        );
      },
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ScanLine size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'محطة المسح الضوئي والفرز السريع' : 'Scanner Express & Aiguillage Hub'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Live Barcode Engine
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'مسح كود AWB بالباركود أو الكاميرا وتوجيه الطرد إلى ولاية الوجهة'
                : 'Lecture codes-barres 1D/2D, aiguillage automatisé vers les quais d\'expédition'}
            </p>
          </div>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات كفاءة الفرز ومعدل المسح' : 'Performance du Quai de Tri & Débit'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'الطرود المفروزة والموجهة، الطرود بانتظار الباركود ونسبة دقة المسح' : 'Colis aiguillés avec succès et disponibilité des quais de chargement'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Colis Triés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'طرود تم فرزها وتوجيهها' : 'Colis Aiguillés & Triés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {sortedCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'جاهزة للشحن للولايات' : 'Prêts pour expédition'}
              </p>
            </div>
          </div>

          {/* Card 2: Colis en attente */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'طرود بانتظار المسح بالفرز' : 'En Attente de Scan au Hub'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {inHubCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'على سيور التفريغ' : 'Sur tapis d\'alimentation'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'دقة المسح والتعرف' : 'Précision de Lecture'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                100% Zero-Error
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {scanHistory.length} {isAr ? 'عملية مسح مسجلة' : 'scans enregistrés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Barcode Scanner Input Form */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <form onSubmit={handleScanSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            {isAr ? 'مسح رمز التتبع AWB (اضغط Enter بعد الإدخال)' : 'Code-barres AWB (Scanner ou saisir + Entrée)'}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              autoFocus
              placeholder="Ex: AWB-2026-001"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              className="flex-1 h-12 px-4 rounded-xl font-mono text-base font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
            />
            <AtriumButton variant="primary" size="md" type="submit" icon={<ScanLine size={16} />}>
              {isAr ? 'مسح وتوجيه' : 'Aiguiller'}
            </AtriumButton>
          </div>
        </form>

        {/* Quick Simulation Pills */}
        <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-700/60 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-neutral-400 text-[11px]">
            {isAr ? 'محاكاة باركود سريع:' : 'Codes AWB rapides :'}
          </span>
          {shipments.slice(0, 6).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleScanCode(s.trackingCode)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white dark:bg-neutral-700 hover:bg-[#C4785A]/15 hover:text-[#C4785A] text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-600 transition-colors cursor-pointer"
            >
              {s.trackingCode} ({s.destinationWilaya})
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'قائمة الطرود الممسوحة والموجهة' : 'Colis Scannés & Affectation aux Quais'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'متابعة فرز وتوجيه الشحنات نحو الولايات' : 'Statut de tri, poids et affectation des quais de transit'}
            </p>
          </div>

          {/* Authentic Logistics Hub Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع الطرود' : 'Tous les colis' },
              { id: 'hub', label: isAr ? 'بالمستودع' : 'Au Hub Central' },
              { id: 'sorted', label: isAr ? 'مفروز' : 'Trié sur quai' },
              { id: 'shipped', label: isAr ? 'قيد النقل' : 'En transit' },
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
            title={isAr ? 'سجل الطرود بالمستودع المركزي' : 'Registre des Colis au Hub & Aiguillage'}
            subtitle={isAr ? 'متابعة فرز وتوجيه الشحنات نحو الولايات' : 'Statut de tri, poids et affectation des quais de transit'}
            items={shipments}
            keyExtractor={(s) => s.id}
            searchPlaceholder={isAr ? 'بحث بالكود، المستلم، الولاية...' : 'Rechercher AWB, destinataire, commerçant, wilaya...'}
            searchFilter={(s, query) =>
              s.trackingCode.toLowerCase().includes(query.toLowerCase()) ||
              s.recipientName.toLowerCase().includes(query.toLowerCase()) ||
              s.merchantName.toLowerCase().includes(query.toLowerCase()) ||
              s.destinationWilaya.toLowerCase().includes(query.toLowerCase())
            }
            onSelectRow={(s) => setSelectedShipment(s)}
            customActions={(s) => getScannerActions(s)}
            columns={[
              {
                id: 'code',
                header: 'N° AWB',
                width: '130px',
                sortable: true,
                renderCell: (s) => (
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded border border-[#C4785A]/20">
                    {s.trackingCode}
                  </span>
                ),
              },
              {
                id: 'dest',
                header: isAr ? 'الوجهة والمستلم' : 'Destination & Destinataire',
                renderCell: (s) => (
                  <div>
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                      {s.destinationWilaya} · {s.recipientName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {s.recipientPhone}
                    </span>
                  </div>
                ),
              },
              {
                id: 'merchant',
                header: isAr ? 'المتجر' : 'Boutique E-Com',
                width: '160px',
                renderCell: (s) => (
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    {s.merchantName}
                  </span>
                ),
              },
              {
                id: 'weight',
                header: isAr ? 'الوزن' : 'Poids',
                width: '100px',
                renderCell: (s) => (
                  <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
                    {s.weightKg || 1.2} kg
                  </span>
                ),
              },
              {
                id: 'cod',
                header: 'COD (DZD)',
                width: '120px',
                sortable: true,
                renderCell: (s) => (
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                    {s.codAmountDzd.toLocaleString()} DZD
                  </span>
                ),
              },
              {
                id: 'status',
                header: isAr ? 'الفرز' : 'Aiguillage',
                width: '130px',
                renderCell: (s) => {
                  const isSorted = s.status === 'Sorted' || s.status === 'OutForDelivery' || s.status === 'Delivered';
                  return (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        isSorted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isSorted ? <CheckCircle2 size={11} /> : <ScanLine size={11} />}
                      {isSorted ? 'Trié / Aiguillé' : 'Sur Tapis'}
                    </span>
                  );
                },
              },
            ]}
            renderCard={(s) => {
              const isSorted = s.status === 'Sorted' || s.status === 'OutForDelivery' || s.status === 'Delivered';
              return (
                <div className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded">
                      {s.trackingCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSorted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isSorted ? 'Trié' : 'Sur Tapis'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                      {s.destinationWilaya} · {s.recipientName}
                    </h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {s.merchantName} · COD: {s.codAmountDzd.toLocaleString()} DZD
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-500">{s.weightKg || 1.2} kg</span>
                    <button
                      onClick={() => handleScanCode(s.trackingCode)}
                      className="px-2 py-1 rounded bg-[#C4785A] text-white text-[10px] font-bold"
                    >
                      Scanner ✓
                    </button>
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
                  <Package size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                    {selectedShipment.trackingCode}
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                    {selectedShipment.destinationWilaya} · {selectedShipment.recipientName}
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
                onClick={() => setInspectorTab('colis')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'colis'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                Fiche Colis
              </button>
              <button
                onClick={() => setInspectorTab('quai')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'quai'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                Quai de Tri
              </button>
              <button
                onClick={() => setInspectorTab('scans')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'scans'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                Journal Scan
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'colis' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                    <span className="text-[10px] text-neutral-400 font-mono">AWB: {selectedShipment.trackingCode}</span>
                    <div className="flex items-center justify-between text-neutral-300 text-[11px]">
                      <span>Montant COD à Encaisser</span>
                      <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {selectedShipment.destinationWilaya}
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white">
                      {selectedShipment.codAmountDzd.toLocaleString()} DZD
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Acheminement & Contact
                    </span>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Expéditeur:</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{selectedShipment.merchantName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Destinataire:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedShipment.recipientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Téléphone:</span>
                      <span className="font-mono text-neutral-900 dark:text-white">{selectedShipment.recipientPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Poids mesuré:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedShipment.weightKg || 1.2} kg</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-neutral-900 dark:text-white">Validation du Tri</span>
                      <span className="text-[10px] text-neutral-500">Aiguiller sur le quai d'expédition</span>
                    </div>
                    <button
                      onClick={() => handleScanCode(selectedShipment.trackingCode)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white transition-colors"
                    >
                      Aiguiller ✓
                    </button>
                  </div>
                </div>
              )}

              {inspectorTab === 'quai' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Quai d'Expédition Ligne Wilaya
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Zone Régionale:</span>
                        <span className="font-bold text-neutral-900 dark:text-white">Région Centre / Est</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Quai de Chargement:</span>
                        <span className="font-mono font-bold text-[#C4785A]">Quai #{selectedShipment.destinationWilaya.slice(0, 2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Navette Inter-Hub:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">Camion 20T Départs 21:00</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === 'scans' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Historique de Passage Scanner
                    </span>
                    <div className="space-y-1.5">
                      <div className="p-2 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[11px]">
                        <span className="font-bold text-emerald-600 block">✓ Scan Réception Hub</span>
                        <span className="text-neutral-400">Poste Scanner Quai 01 · Validé</span>
                      </div>
                    </div>
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
                    isAr ? 'جاري طباعة ملصق الشحن' : 'Impression de l’étiquette de routage AWB',
                    'success'
                  );
                }}
              >
                {isAr ? 'طباعة ملصق الطرد' : 'Imprimer Étiquette Colis'}
              </AtriumButton>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
