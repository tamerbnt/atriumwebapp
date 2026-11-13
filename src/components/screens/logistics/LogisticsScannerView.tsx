import React, { useState, useRef, useEffect } from 'react';
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
  Lock,
  Volume2,
  Boxes,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsShipment, TransportBag } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

// Web Audio API Synthetic Chime / Buzz generator (zero external mp3 assets)
const playSound = (type: 'success' | 'error') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
};

export const LogisticsScannerView: React.FC = () => {
  const { language, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';
  const { shipments, bags, updateShipmentStatus, sealBag, addBag } = useLogisticsData();

  const [scanMode, setScanMode] = useState<'Intake' | 'Bagging' | 'Unbagging'>('Bagging');
  const [selectedBagId, setSelectedBagId] = useState<string>(bags[0]?.id || 'bag_01');
  const [scannedCode, setScannedCode] = useState('');
  const [securitySealInput, setSecuritySealInput] = useState('');
  const [isSealModalOpen, setIsSealModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<LogisticsShipment | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'colis' | 'quai' | 'scans'>('colis');
  const [scanHistory, setScanHistory] = useState<
    Array<{ code: string; status: 'success' | 'error'; message: string; timestamp: string }>
  >([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep scanner input focused for fast hands-free gun scanning
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const activeBag = bags.find((b) => b.id === selectedBagId) || bags[0];
  const sortedCount = shipments.filter(
    (s) => s.status === 'Sorted' || s.status === 'OutForDelivery' || s.status === 'Delivered'
  ).length;
  const inHubCount = shipments.filter(
    (s) => s.status === 'HubIntake' || s.status === 'ReceivedAtHub'
  ).length;

  const handleScanCode = (codeToScan: string) => {
    const clean = codeToScan.trim().toUpperCase();
    if (!clean) return;

    const found = shipments.find((s) => s.trackingCode.toUpperCase() === clean);
    const now = new Date().toLocaleTimeString();

    if (found) {
      playSound('success');
      updateShipmentStatus(found.id, scanMode === 'Bagging' ? 'Sorted' : 'ReceivedAtHub');
      setScanHistory((prev) => [
        {
          code: clean,
          status: 'success',
          message: `Colis orienté vers: ${found.destinationWilaya} (${found.recipientName})`,
          timestamp: now,
        },
        ...prev.slice(0, 11),
      ]);
      setSelectedShipment(found);
      showToast(
        isAr ? `تم فرز وتوجيه الطرد: ${clean}` : `Scan validé: ${clean} aiguillé`,
        'success'
      );
    } else {
      playSound('error');
      setScanHistory((prev) => [
        {
          code: clean,
          status: 'error',
          message: isAr ? 'الرمز غير مسجل في النظام' : 'Code AWB non répertorié au Hub',
          timestamp: now,
        },
        ...prev.slice(0, 11),
      ]);
      showToast(
        isAr ? 'كود الطرد غير موجود' : 'Code AWB inconnu au système',
        'error'
      );
    }

    setScannedCode('');
    inputRef.current?.focus();
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanCode(scannedCode);
  };

  const handleSealActiveBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securitySealInput.trim()) {
      showToast(
        isAr ? 'يرجى إدخال رقم الختم الأمني' : 'Numéro de scellé obligatoire',
        'error'
      );
      return;
    }

    sealBag(activeBag.id, securitySealInput.trim());
    showToast(
      isAr ? `تم إحكام وغلق الكيس بالختم الأمني ${securitySealInput}` : `Sac ${activeBag.bagCode} scellé avec succès (${securitySealInput})`,
      'success'
    );
    setIsSealModalOpen(false);
    setSecuritySealInput('');
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

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: shipments.length > 0,
  });

  if (showSkeleton && (shipments.length === 0 || networkMode === 'force_skeleton')) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E6DED6] dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs">
            <ScanLine size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
                {isAr ? 'ماسح الأرصفة وفرز الأكياس (Sac-Navette & Scellés)' : 'Scanner Express Quai & Sacs-Navette'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <Volume2 size={10} />
                Audio Chime Active
              </span>
            </div>
          </div>
        </div>

        {/* Scan Mode Toggle */}
        <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700">
          {(['Bagging', 'Intake', 'Unbagging'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setScanMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                scanMode === m
                  ? 'bg-white dark:bg-neutral-900 text-[#d4522f] shadow-xs'
                  : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
              }`}
            >
              {m === 'Bagging'
                ? (isAr ? 'تعبئة الأكياس' : 'Sacs-Navette')
                : m === 'Intake'
                ? (isAr ? 'استلام المدخلات' : 'Intake')
                : (isAr ? 'فتح الأكياس' : 'Dépotage')}
            </button>
          ))}
        </div>
      </div>

      {/* Active Bag & High-Speed Barcode Scanner Tray */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {scanMode === 'Bagging' && activeBag && (
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Boxes size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-black dark:text-white">
                    {activeBag.bagCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeBag.status === 'Sealed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {activeBag.status}
                  </span>
                </div>
                <div className="text-xs text-black/55 dark:text-white/55 mt-0.5">
                  Destination: Wilaya {activeBag.destinationHubWilaya} • Poids: <span className="font-mono font-bold">{activeBag.totalWeightKg} kg / 25 kg</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBagId}
                onChange={(e) => setSelectedBagId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-xs font-mono font-bold border-none"
              >
                {bags.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bagCode} (W{b.destinationHubWilaya})
                  </option>
                ))}
              </select>

              {activeBag.status === 'Open' && (
                <AtriumButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsSealModalOpen(true)}
                  icon={<Lock size={14} />}
                >
                  {isAr ? 'ختم الكيس الأمني' : 'Poser Scellé & Fermer'}
                </AtriumButton>
              )}
            </div>
          </div>
        )}

        {/* Input Barcode Gun Capture Box */}
        <form onSubmit={handleScanSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={scannedCode}
            onChange={(e) => setScannedCode(e.target.value)}
            placeholder={
              isAr
                ? 'امسح باركود الشحنة بواسطة قارئ الباركود (Ex: ATR-EXP-88912)...'
                : 'Scannez le code-barres AWB (Lecteur HID ou caméra, ex: ATR-EXP-88912)...'
            }
            className="w-full pl-12 pr-28 py-4 rounded-2xl bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 focus:border-[#d4522f] text-sm font-mono font-bold text-black dark:text-white shadow-xs outline-hidden tracking-wider"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/55 dark:text-white/55">
            <Barcode size={22} />
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AtriumButton variant="primary" size="sm" type="submit">
              {isAr ? 'تأكيد المسح' : 'Valider'}
            </AtriumButton>
          </div>
        </form>
      </div>

      {/* Main Grid: Scan History Feed & Scanned Items Collection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Audio / Optical Scan Feed */}
        <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-3 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
              {isAr ? 'سجل المسح الصوتي المباشر' : 'Journal des Scans en Direct'}
            </h3>
            <span className="text-[10px] font-mono text-black/55 dark:text-white/55">Auto-scroll</span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {scanHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-black/55 dark:text-white/55">
                {isAr ? 'في انتظار أول مسح ضوئي...' : 'En attente de lecture code-barres...'}
              </div>
            ) : (
              scanHistory.map((h, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    h.status === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50'
                  }`}
                >
                  <div className="space-y-0.5 truncate">
                    <div className="font-mono font-bold text-black dark:text-white">
                      {h.code}
                    </div>
                    <div className="text-[11px] text-black/70 dark:text-white/75 truncate">
                      {h.message}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-black/55 dark:text-white/55 shrink-0">
                    {h.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Parcels in Current Hub Quai Collection */}
        <div className="lg:col-span-2 bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {isAr ? 'طرود رصيف الفرز' : 'Colis au Quai de Tri'}
              </h2>
            </div>
            <div className="text-xs font-mono font-bold text-[#d4522f]">
              {shipments.length} {isAr ? 'طرد' : 'colis'}
            </div>
          </div>

          <UniversalDataCollection<LogisticsShipment>
            items={shipments}
            keyExtractor={(s) => s.id}
            defaultViewMode="list"
            selectedIds={new Set()}
            onSelectionChange={() => {}}
            onItemClick={setSelectedShipment}
            customActions={getScannerActions}
            columns={[
              {
                id: 'code',
                header: 'AWB',
                width: '140px',
                renderCell: (s: LogisticsShipment) => (
                  <span className="font-mono font-bold text-xs text-[#d4522f]">
                    {s.trackingCode}
                  </span>
                ),
              },
              {
                id: 'recipient',
                header: isAr ? 'المستلم والوجهة' : 'Destinataire & Wilaya',
                renderCell: (s: LogisticsShipment) => (
                  <div>
                    <div className="font-semibold text-xs text-black dark:text-white">
                      {s.recipientName}
                    </div>
                    <div className="text-[11px] text-black/55 dark:text-white/55">
                      {s.destinationWilaya} • {s.recipientPhone}
                    </div>
                  </div>
                ),
              },
              {
                id: 'mode',
                header: isAr ? 'طريقة الاستلام' : 'Mode',
                width: '110px',
                renderCell: (s: LogisticsShipment) => (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.deliveryMode === 'StopDesk'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {s.deliveryMode === 'StopDesk' ? 'Stop-Desk' : 'Domicile'}
                  </span>
                ),
              },
              {
                id: 'status',
                header: 'Statut',
                width: '110px',
                renderCell: (s: LogisticsShipment) => (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : s.status === 'Sorted'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {s.status}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Security Seal Modal */}
      {isSealModalOpen && activeBag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-[#d4522f]" />
                <h3 className="font-bold text-sm text-black dark:text-white">
                  {isAr ? 'ختم وإغلاق كيس الشحن (Scellé de Sécurité)' : 'Pose du Scellé de Sécurité'}
                </h3>
              </div>
              <button
                onClick={() => setIsSealModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSealActiveBag} className="space-y-4">
              <p className="text-xs text-black/55 dark:text-white/55">
                {isAr
                  ? `أدخل رقم القفل البلاستيكي الفريد لغلق الكيس ${activeBag.bagCode} المتوجه إلى ولاية ${activeBag.destinationHubWilaya}:`
                  : `Veuillez saisir le numéro unique gravé sur le collier de scellé plastique pour le sac ${activeBag.bagCode} :`}
              </p>

              <div>
                <label className="block text-xs font-semibold text-black/70 dark:text-white/75 mb-1">
                  Numéro de Scellé (Ex: SL-994821)
                </label>
                <input
                  type="text"
                  value={securitySealInput}
                  onChange={(e) => setSecuritySealInput(e.target.value)}
                  placeholder="SL-XXXXXX"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono font-bold text-sm text-center tracking-widest focus:border-[#d4522f] outline-hidden"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setIsSealModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit" icon={<ShieldCheck size={14} />}>
                  {isAr ? 'تأكيد الختم الأمني' : 'Verrouiller le Sac'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
