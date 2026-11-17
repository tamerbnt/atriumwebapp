import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wrench,
  BellRing,
  X,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { computeScrapYield } from '../../../utils/manufacturingRules';
import { useManufacturingData } from './manufacturingData';
import { ManufacturingOrder } from '../../../types';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKioskGrid } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
} from '../../ui/kinetic';

const SCRAP_REASON_CODES = [
  {
    id: 'dim_flaw',
    labelFr: 'Défaut Calibrage / Dimensionnel',
    labelEn: 'Calibration / Dimensional Defect',
    labelAr: 'خطأ في الأبعاد والقياس',
  },
  {
    id: 'raw_defect',
    labelFr: 'Défaut Matière Première',
    labelEn: 'Raw Material Defect',
    labelAr: 'عيب في المادة الأولية',
  },
  {
    id: 'power_cut',
    labelFr: 'Coupure Courant Sonelgaz',
    labelEn: 'Sonelgaz Power Outage',
    labelAr: 'انقطاع التيار الكهربائي',
  },
  {
    id: 'tool_wear',
    labelFr: 'Usure / Casse Outil de Coupe',
    labelEn: 'Cutting Tool Wear / Breakage',
    labelAr: 'تآكل أو انكسار أداة القطع',
  },
  {
    id: 'handling',
    labelFr: 'Erreur Réglage / Manipulation',
    labelEn: 'Setup / Handling Error',
    labelAr: 'خطأ في الضبط والتشغيل',
  },
];

export const ManufacturingWorkstationView: React.FC = () => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();
  const { orders, updateOrder } = useManufacturingData();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
    const inProg = orders.find((o) => o.status === 'InProduction');
    return inProg ? inProg.id : orders[0]?.id || '';
  });

  const currentOrder = useMemo<ManufacturingOrder | null>(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  }, [orders, selectedOrderId]);

  const [epiGlasses, setEpiGlasses] = useState(false);
  const [epiGloves, setEpiGloves] = useState(false);
  const [epiShoes, setEpiShoes] = useState(false);
  const [epiHelmet, setEpiHelmet] = useState(false);
  const epiCount = [epiGlasses, epiGloves, epiShoes, epiHelmet].filter(Boolean).length;
  const isSafetyChecklistComplete = epiCount === 4;

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [goodQuantityInput, setGoodQuantityInput] = useState('1');
  const [scrapQuantityInput, setScrapQuantityInput] = useState('0');
  const [selectedScrapReason, setSelectedScrapReason] = useState(SCRAP_REASON_CODES[0].id);
  const [activeNumpadField, setActiveNumpadField] = useState<'good' | 'scrap'>('good');
  const [andonActive, setAndonActive] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    if (!isSafetyChecklistComplete) {
      showToast(
        isAr
          ? 'تنبيه: يجب تأكيد جميع تدابير السلامة والوقاية (قانون 88-07) قبل تشغيل الآلة'
          : isEn
          ? 'Loi 88-07 Safety: Validate all mandatory PPE items before starting the machine'
          : 'Sécurité Loi 88-07 : Veuillez valider tous les EPI obligatoires avant démarrage',
        'error'
      );
      return;
    }
    setIsRunning(true);
    if (!sessionStartTime) setSessionStartTime(Date.now());
    showToast(
      isAr
        ? 'تم بدء احتساب وقت دورة التشغيل'
        : isEn
        ? 'Machining cycle timer started'
        : "Chronomètre d'usinage lancé avec succès",
      'info'
    );
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
    showToast(
      isAr
        ? 'تم إيقاف دورة التشغيل مؤقتاً'
        : isEn
        ? 'Production cycle paused'
        : 'Cycle de fabrication mis en pause',
      'info'
    );
  };

  const handleTriggerAndon = () => {
    setAndonActive(true);
    showToast(
      isAr
        ? 'تم إرسال إشعار نداء أندون عاجل لرئيس الورشة والمراقب'
        : isEn
        ? 'Andon alert triggered! Workshop lead & maintenance notified.'
        : "Alerte Andon émise ! Le chef d'atelier et le responsable maintenance ont été notifiés.",
      'error'
    );
  };

  const handleCancelAndon = () => {
    setAndonActive(false);
    showToast(
      isAr
        ? 'تم إلغاء نداء التنبيه العاجل'
        : isEn
        ? 'Andon alert resolved and closed'
        : 'Alerte Andon résolue et clôturée',
      'success'
    );
  };

  const handleOpenFinishModal = () => {
    setIsRunning(false);
    setGoodQuantityInput('1');
    setScrapQuantityInput('0');
    setActiveNumpadField('good');
    setIsFinishModalOpen(true);
  };

  const handleNumpadPress = (digit: string) => {
    if (activeNumpadField === 'good') {
      if (digit === 'C') setGoodQuantityInput('0');
      else setGoodQuantityInput((prev) => (prev === '0' ? digit : prev + digit));
    } else if (digit === 'C') {
      setScrapQuantityInput('0');
    } else {
      setScrapQuantityInput((prev) => (prev === '0' ? digit : prev + digit));
    }
  };

  const handleConfirmFinish = () => {
    if (!currentOrder) return;
    const goodQty = parseInt(goodQuantityInput, 10) || 0;
    const scrapQty = parseInt(scrapQuantityInput, 10) || 0;
    const updatedProduced =
      (currentOrder.actualQuantityProduced || currentOrder.quantityProduced || 0) + goodQty;
    const yieldStats = computeScrapYield(
      currentOrder.targetQuantity,
      updatedProduced,
      (currentOrder.scrapQuantity || 0) + scrapQty
    );
    const updatedOrder: ManufacturingOrder = {
      ...currentOrder,
      actualQuantityProduced: updatedProduced,
      quantityProduced: updatedProduced,
      scrapQuantity: (currentOrder.scrapQuantity || 0) + scrapQty,
      status: updatedProduced >= currentOrder.targetQuantity ? 'Completed' : 'InProduction',
    };
    updateOrder(updatedOrder);
    setIsFinishModalOpen(false);
    setElapsedSeconds(0);
    setSessionStartTime(null);
    showToast(
      isAr
        ? `تم تسجيل ${goodQty} وحدة مطابقة و ${scrapQty} قطعة خردة. نسبة المطابقة: ${yieldStats.yieldPercent}%`
        : isEn
        ? `Logged +${goodQty} good units, +${scrapQty} scrap. Yield: ${yieldStats.yieldPercent}%`
        : `Déclaration validée : +${goodQty} pièces conformes, +${scrapQty} rebuts. Rendement : ${yieldStats.yieldPercent}%`,
      'success'
    );
  };

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: orders.length > 0,
  });

  const producedCount = currentOrder
    ? currentOrder.actualQuantityProduced || currentOrder.quantityProduced || 0
    : 0;
  const targetCount = currentOrder?.targetQuantity || 0;
  const scrapCount = currentOrder?.scrapQuantity || 0;
  const yieldStats = useMemo(
    () => computeScrapYield(targetCount, producedCount, scrapCount),
    [targetCount, producedCount, scrapCount]
  );

  if (showSkeleton && (orders.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut || isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync || retry}
        />
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
          <SkeletonKioskGrid count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut || isSyncTimeout}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />

      <ScreenHeaderBar
        icon={<Wrench size={22} />}
        title={isAr ? 'المحطة 03' : isEn ? 'Station 03' : 'Poste 03'}
        secondaryActions={
          <div className="min-w-[230px]">
            <select
              value={selectedOrderId}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                setElapsedSeconds(0);
                setIsRunning(false);
              }}
              aria-label={
                isAr
                  ? 'اختيار أمر التصنيع'
                  : isEn
                  ? 'Select Manufacturing Order'
                  : 'Sélectionner Ordre de Fabrication'
              }
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-black dark:text-white cursor-pointer outline-none focus:ring-2 focus:ring-[#d4522f]/40"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} - {o.productName} ({o.actualQuantityProduced || o.quantityProduced || 0}/{o.targetQuantity})
                </option>
              ))}
            </select>
          </div>
        }
        primaryAction={{
          label: andonActive
            ? isAr
              ? 'إلغاء نداء أندون العاجل'
              : isEn
              ? 'Resolve Andon Alert'
              : 'Résoudre Appel Andon'
            : isAr
            ? 'نداء الطوارئ / أندون'
            : isEn
            ? 'Workshop Andon Alert'
            : "Appel Chef d'Atelier (Andon)",
          icon: andonActive ? (
            <BellRing size={16} className="animate-spin" />
          ) : (
            <AlertTriangle size={16} />
          ),
          onClick: andonActive ? handleCancelAndon : handleTriggerAndon,
          dataAction: 'andon-alert',
        }}
      />

      {andonActive && (
        <div
          role="alert"
          className="rounded-2xl bg-red-600 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-3">
            <BellRing size={20} className="animate-bounce shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                {isAr
                  ? 'حالة طوارئ أندون نشطة — المحطة 03'
                  : isEn
                  ? 'Active Andon Alert — Station 03'
                  : "Appel Andon Actif — Poste 03 Découpe & Usinage CNC"}
              </p>
              <p className="text-xs text-white/90">
                {isAr
                  ? 'تم إشعار رئيس الورشة وفريق الصيانة بالتدخل الفوري.'
                  : isEn
                  ? 'Workshop supervisor and maintenance team have been alerted.'
                  : "Chef d'atelier et maintenance alertés pour intervention immédiate."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelAndon}
            className="px-3.5 py-2 rounded-xl bg-white text-red-700 text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer shrink-0"
          >
            {isAr ? 'إغلاق النداء' : isEn ? 'Close Alert' : 'Clôturer Andon'}
          </button>
        </div>
      )}

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات الإنتاجية والسلامة المهنية (قانون 88-07)'
            : isEn
            ? 'Workstation Output & Loi 88-07 Safety Indicators'
            : 'Pilotage Cadence Poste CNC & Conformité EPI (Loi 88-07)'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'القطع المطابقة / الهدف'
            : isEn
            ? 'Conforming / Target'
            : 'Conformes / Cible OF',
          count: producedCount,
          formatValue: (v) => `${v}/${targetCount}`,
          badgeText: `${yieldStats.yieldPercent}% ${isAr ? 'جودة' : isEn ? 'yield' : 'rendement'}`,
          tone: 'emerald',
        }}
        secondaryCard={{
          label: isAr ? 'الخردة المسجلة' : isEn ? 'Cumulative Scrap' : 'Rebuts Cumulés',
          count: scrapCount,
          badgeText: isAr ? 'قطعة' : isEn ? 'units' : 'pièces',
          tone: 'terracotta',
        }}
        darkCard={{
          label: isAr
            ? 'وقت الدورة والتوافر'
            : isEn
            ? 'Cycle Time & Availability'
            : 'Temps de Cycle & Disponibilité',
          valueCount: elapsedSeconds,
          formatValue: (v) => formatTimer(Math.round(v)),
          badgeCount: epiCount,
          badgePrefix: 'EPI Loi 88-07 · ',
          badgeSuffix: '/4',
          caption: isRunning
            ? isAr
              ? 'الآلة قيد التشغيل · التوافر 96.4%'
              : isEn
              ? 'Running · Availability 96.4%'
              : 'Cycle actif · Disponibilité 96.4%'
            : isAr
            ? 'وضع الاستعداد · التوافر 96.4%'
            : isEn
            ? 'Standby · Availability 96.4%'
            : 'Poste prêt · Disponibilité 96.4%',
        }}
      />

      <ScreenPod>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-neutral-900 rounded-[22px] p-5 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
                  {isAr
                    ? 'أمر التصنيع المخصص'
                    : isEn
                    ? 'Assigned Manufacturing Order'
                    : 'Ordre de Fabrication Actif'}
                </span>
                <span className="text-xs font-mono font-bold text-[#d4522f]">
                  {orders.length} {isAr ? 'أوامر متاحة' : isEn ? 'available' : 'OFs disponibles'}
                </span>
              </div>

              {currentOrder ? (
                <div className="p-4 rounded-2xl bg-[#F3EDE7]/65 dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-black/55 dark:text-white/55 font-mono">
                      Lot: {currentOrder.batchLotNumber || 'LOT-2026-05'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        currentOrder.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : currentOrder.status === 'InProduction'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75'
                      }`}
                    >
                      {currentOrder.status}
                    </span>
                  </div>
                  <div className="text-base font-bold text-black dark:text-white">
                    {currentOrder.productName}
                  </div>
                  <div className="text-[11px] font-mono text-black/55 dark:text-white/55">
                    {currentOrder.orderNumber}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E6DED6] dark:border-neutral-700 text-xs">
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[11px]">
                        {isAr ? 'الهدف' : isEn ? 'OF Target' : 'Cible OF'}
                      </span>
                      <span className="font-mono font-bold text-black dark:text-white text-sm">
                        {currentOrder.targetQuantity} {isAr ? 'وحدة' : isEn ? 'units' : 'unités'}
                      </span>
                    </div>
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[11px]">
                        {isAr ? 'المنجز' : isEn ? 'Conforming' : 'Conformes'}
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {producedCount} {isAr ? 'وحدة' : isEn ? 'units' : 'unités'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F3EDE7]/50 dark:bg-neutral-800/40 text-xs text-black/55 dark:text-white/55">
                  {isAr ? 'لا يوجد أمر تصنيع محدد' : isEn ? 'No manufacturing order selected' : 'Aucun OF sélectionné'}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-[22px] p-5 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#d4522f] shrink-0" />
                  <h3 className="text-sm font-bold text-black dark:text-white">
                    {isAr
                      ? 'إجراءات السلامة والوقاية (قانون 88-07)'
                      : isEn
                      ? 'PPE Safety Check (Loi 88-07)'
                      : 'Contrôle Sécurité EPI (Loi 88-07)'}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                    isSafetyChecklistComplete
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {isSafetyChecklistComplete
                    ? isAr
                      ? 'مطابق للسلامة'
                      : isEn
                      ? 'PPE Verified'
                      : 'EPI Conformes'
                    : isAr
                    ? 'التحقق مطلوب'
                    : isEn
                    ? 'Required'
                    : 'Validation Requise'}
                </span>
              </div>
              <p className="text-xs text-black/55 dark:text-white/75">
                {isAr
                  ? 'وفقاً للتشريع الجزائري، يُلزم المشغل بارتداء معدات الحماية قبل تفعيل محطة التشغيل.'
                  : isEn
                  ? 'Per Algerian occupational safety law, confirm all mandatory PPE before starting the workstation.'
                  : "Conformément à la réglementation de sécurité au travail, cochez les EPI obligatoires avant d'actionner le poste."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    active: epiGlasses,
                    toggle: () => setEpiGlasses((v) => !v),
                    label: isAr ? 'نظارات واقية' : isEn ? 'Safety Glasses' : 'Lunettes de protection',
                  },
                  {
                    active: epiGloves,
                    toggle: () => setEpiGloves((v) => !v),
                    label: isAr ? 'قفازات تقنية' : isEn ? 'Cut-Resistant Gloves' : 'Gants anti-coupure',
                  },
                  {
                    active: epiShoes,
                    toggle: () => setEpiShoes((v) => !v),
                    label: isAr ? 'أحذية سلامة S3' : isEn ? 'Safety Shoes S3' : 'Chaussures de sécurité',
                  },
                  {
                    active: epiHelmet,
                    toggle: () => setEpiHelmet((v) => !v),
                    label: isAr ? 'خوذة / واقي أذن' : isEn ? 'Helmet / Ear Protection' : 'Casque / Anti-bruit',
                  },
                ].map((epi, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-pressed={epi.active}
                    onClick={epi.toggle}
                    className={`p-3.5 rounded-xl border text-left rtl:text-right flex items-center gap-3 transition-all cursor-pointer ${
                      epi.active
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'bg-[#FBF8F5] dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        epi.active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-black/55 dark:text-white/55'
                      }`}
                    >
                      ✓
                    </div>
                    <span className="text-xs leading-snug">{epi.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-6 sm:p-8 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs flex flex-col items-center justify-center text-center space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-black/55 dark:text-white/55 uppercase tracking-widest">
                <Clock size={16} className="text-[#d4522f]" />
                <span>
                  {isAr
                    ? 'عداد وقت التشغيل النشط'
                    : isEn
                    ? 'Active Machine Cycle Timer'
                    : 'Temps de Cycle Machine'}
                </span>
              </div>
              <div className="font-mono font-black text-6xl sm:text-7xl lg:text-8xl tracking-tight text-black dark:text-white tabular-nums select-none">
                {formatTimer(elapsedSeconds)}
              </div>
              <div className="flex items-center gap-3 text-xs text-black/55 dark:text-white/55">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isRunning ? 'bg-emerald-500 animate-ping' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                />
                <span className="font-medium">
                  {isRunning
                    ? isAr
                      ? 'الآلة قيد التشغيل والإنتاج'
                      : isEn
                      ? 'Machine running · Active cycle'
                      : 'Machine en marche • Cycle actif'
                    : isAr
                    ? 'الآلة في وضع الاستعداد أو التوقف'
                    : isEn
                    ? 'Station on standby / paused'
                    : 'Poste en pause / attente'}
                </span>
              </div>
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E6DED6] dark:border-neutral-800">
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="w-full h-16 rounded-2xl bg-[#d4522f] hover:bg-[#b0674b] active:scale-[0.98] text-white font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer"
                  >
                    <Play size={22} fill="currentColor" />
                    <span>
                      {isAr ? 'بدء تشغيل الدورة' : isEn ? 'Start Cycle' : 'Démarrer Cycle'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseTimer}
                    className="w-full h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer"
                  >
                    <Pause size={22} fill="currentColor" />
                    <span>{isAr ? 'إيقاف مؤقت' : isEn ? 'Pause Cycle' : 'Mettre en Pause'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenFinishModal}
                  disabled={elapsedSeconds === 0 && !isRunning}
                  className={`w-full h-16 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-md transition-all ${
                    elapsedSeconds > 0 || isRunning
                      ? 'bg-[#1F1D1B] hover:bg-black text-white active:scale-[0.98] cursor-pointer'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-black/45 dark:text-white/40 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 size={22} />
                  <span>
                    {isAr
                      ? 'إنهاء وتسجيل القطع'
                      : isEn
                      ? 'Declare Units'
                      : 'Déclarer Pièces'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs text-center">
                <span className="text-[11px] text-black/55 dark:text-white/55 font-semibold block">
                  {isAr ? 'الوقت المستهدف' : isEn ? 'Target Rate' : 'Cadence Prévue'}
                </span>
                <span className="font-mono font-bold text-base text-black dark:text-white">
                  12 min / u
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs text-center">
                <span className="text-[11px] text-black/55 dark:text-white/55 font-semibold block">
                  {isAr ? 'معدل التوافر' : isEn ? 'Availability' : 'Disponibilité'}
                </span>
                <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                  96.4%
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs text-center">
                <span className="text-[11px] text-black/55 dark:text-white/55 font-semibold block">
                  {isAr ? 'الخردة المسجلة' : isEn ? 'Total Scrap' : 'Rebuts Cumulés'}
                </span>
                <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                  {scrapCount} u
                </span>
              </div>
            </div>
          </div>
        </div>
      </ScreenPod>

      {isFinishModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">
                    {isAr
                      ? 'تسجيل كميات الإنتاج والخردة'
                      : isEn
                      ? 'Declare Output & Scrap'
                      : 'Déclaration de Fin de Cycle & Rebuts'}
                  </h3>
                  <p className="text-xs text-black/55 dark:text-white/55">
                    {currentOrder?.orderNumber} • {currentOrder?.productName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'}
                onClick={() => setIsFinishModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setActiveNumpadField('good')}
                className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                  activeNumpadField === 'good'
                    ? 'border-[#d4522f] bg-[#FCEEE8] dark:bg-neutral-800 ring-2 ring-[#d4522f]'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40'
                }`}
              >
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                  {isAr
                    ? 'القطع السليمة المطابقة'
                    : isEn
                    ? 'Conforming Units'
                    : 'Pièces Bonnes (Conformes)'}
                </span>
                <span className="font-black text-3xl text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                  {goodQuantityInput}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNumpadField('scrap')}
                className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                  activeNumpadField === 'scrap'
                    ? 'border-red-500 bg-red-50 dark:bg-neutral-800 ring-2 ring-red-500'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40'
                }`}
              >
                <span className="text-xs font-bold text-red-600 dark:text-red-400 block mb-1">
                  {isAr
                    ? 'القطع المرفوضة / خردة'
                    : isEn
                    ? 'Scrapped Units'
                    : 'Pièces Rebutées (Chutes)'}
                </span>
                <span className="font-black text-3xl text-red-600 dark:text-red-400 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                  {scrapQuantityInput}
                </span>
              </button>
            </div>

            {parseInt(scrapQuantityInput, 10) > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-black/70 dark:text-white/75 block">
                  {isAr
                    ? 'سبب رفض القطع (التشريع الصناعي)'
                    : isEn
                    ? 'Scrap Reason Code'
                    : 'Motif de Rebut Déclaré'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SCRAP_REASON_CODES.map((code) => (
                    <button
                      key={code.id}
                      type="button"
                      onClick={() => setSelectedScrapReason(code.id)}
                      className={`p-2.5 rounded-xl border text-xs text-left rtl:text-right cursor-pointer transition-all ${
                        selectedScrapReason === code.id
                          ? 'border-red-500 bg-red-50 dark:bg-neutral-800 text-red-700 dark:text-red-300 font-bold'
                          : 'border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75'
                      }`}
                    >
                      {isAr ? code.labelAr : isEn ? code.labelEn : code.labelFr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '00'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumpadPress(digit)}
                  className={`h-14 rounded-xl font-mono text-xl font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs ${
                    digit === 'C'
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-200'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {digit}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFinishModalOpen(false)}
                className="flex-1 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 font-bold text-sm cursor-pointer"
              >
                {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                className="flex-2 py-3.5 rounded-xl bg-[#d4522f] hover:bg-[#b0674b] text-white font-bold text-sm shadow-md cursor-pointer transition-all"
              >
                {isAr
                  ? 'تأكيد التسجيل وتحديث أمر التصنيع'
                  : isEn
                  ? 'Confirm Output Declaration'
                  : 'Valider la Déclaration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
