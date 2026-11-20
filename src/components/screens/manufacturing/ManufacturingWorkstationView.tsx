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
  Eye,
} from 'lucide-react';
import {
  useAtriumStore,
  useAtriumSelector,
  showToast,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { computeScrapYield } from '../../../utils/manufacturingRules';
import { formatMoney } from '../../../utils/rules';
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
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorWideButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
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
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();
  const currentBranch = useAtriumSelector(selectCurrentBranchFromState);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);
  const { orders, updateOrder } = useManufacturingData();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
    const inProg = orders.find((o) => o.status === 'InProduction');
    return inProg ? inProg.id : orders[0]?.id || '';
  });

  const currentOrder = useMemo<ManufacturingOrder | null>(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  }, [orders, selectedOrderId]);

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'of' | 'epi' | 'yield'>('of');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

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
        <div className="sq-elev-card">
          <div data-sq="panel" data-sq-border="solid" className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <SkeletonKioskGrid count={6} />
          </div>
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
          <div data-sq="ctl" data-sq-border="solid" className="min-w-[230px] h-10 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
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
              className="lbi-field w-full h-full px-3 bg-transparent border-0 text-xs font-semibold text-black dark:text-white cursor-pointer outline-none"
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
        <div className="sq-elev-card">
          <div
            role="alert"
            data-sq="card"
            data-sq-border="none"
            className="bg-red-600 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
              data-no-liquid="true"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={handleCancelAndon}
              className="px-3.5 py-2 bg-white text-red-700 text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer shrink-0"
            >
              {isAr ? 'إغلاق النداء' : isEn ? 'Close Alert' : 'Clôturer Andon'}
            </button>
          </div>
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
          isActive: isInspectorOpen && inspectorTab === 'of',
          onToggle: () => {
            setInspectorTab('of');
            setIsInspectorOpen((prev) => (inspectorTab === 'of' ? !prev : true));
          },
          filteredLabel: isAr ? 'المعاينة مفتوحة' : isEn ? 'Inspecting' : 'Inspecteur ouvert',
        }}
        secondaryCard={{
          label: isAr ? 'الخردة المسجلة' : isEn ? 'Cumulative Scrap' : 'Rebuts Cumulés',
          count: scrapCount,
          badgeText: isAr ? 'قطعة' : isEn ? 'units' : 'pièces',
          tone: 'terracotta',
          isActive: isInspectorOpen && inspectorTab === 'yield',
          onToggle: () => {
            setInspectorTab('yield');
            setIsInspectorOpen((prev) => (inspectorTab === 'yield' ? !prev : true));
          },
          filteredLabel: isAr ? 'تحليل المردود' : isEn ? 'Yield View' : 'Vue Rendement',
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
            <div className="sq-elev-card">
              <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 p-3 border border-[#E6DED6] dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between px-1 pt-1">
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
                  <div data-sq="card" data-sq-border="solid" className="p-4 bg-[#F3EDE7]/65 dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60 space-y-3">
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
                  <div className="pt-2">
                      <button
                        type="button"
                        data-no-liquid="true"
                        data-sq="ctl"
                        data-sq-border="solid"
                        onClick={(e) => {
                          setDrawerOpenerEl(e.currentTarget);
                          setInspectorTab('of');
                          setIsInspectorOpen(true);
                        }}
                        className="w-full py-2.5 px-3 bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 hover:border-[#d4522f] text-xs font-bold text-black dark:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Eye size={14} className="text-[#d4522f]" />
                        <span>
                          {isAr ? 'معاينة أمر التصنيع والمواصفات' : isEn ? 'Inspect MO & Specs' : 'Inspecter OF / Specs'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div data-sq="card" data-sq-border="none" className="p-4 bg-[#F3EDE7]/50 dark:bg-neutral-800/40 text-xs text-black/55 dark:text-white/55">
                    {isAr ? 'لا يوجد أمر تصنيع محدد' : isEn ? 'No manufacturing order selected' : 'Aucun OF sélectionné'}
                  </div>
                )}
              </div>
            </div>

            <div className="sq-elev-card">
              <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 p-3 border border-[#E6DED6] dark:border-neutral-800 space-y-3">
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
                    data-no-liquid="true"
                    data-sq="card"
                    data-sq-border="solid"
                    aria-pressed={epi.active}
                    onClick={epi.toggle}
                    className={`p-3.5 border text-left rtl:text-right flex items-center gap-3 transition-all cursor-pointer ${
                      epi.active
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'bg-[#FBF8F5] dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-[var(--r-check,6px)] flex items-center justify-center text-xs font-bold shrink-0 ${
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
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="sq-elev-card">
              <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 p-6 sm:p-8 border border-[#E6DED6] dark:border-neutral-800 flex flex-col items-center justify-center text-center space-y-6">
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
                  <div className="sq-elev-card w-full">
                    <button
                      type="button"
                      data-no-liquid="true"
                      data-sq="ctl"
                      data-sq-border="none"
                      onClick={handleStartTimer}
                      className="w-full h-16 bg-[#d4522f] hover:bg-[#b0674b] active:scale-[0.98] text-white font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all cursor-pointer"
                    >
                      <Play size={22} fill="currentColor" />
                      <span>
                        {isAr ? 'بدء تشغيل الدورة' : isEn ? 'Start Cycle' : 'Démarrer Cycle'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="sq-elev-card w-full">
                    <button
                      type="button"
                      data-no-liquid="true"
                      data-sq="ctl"
                      data-sq-border="none"
                      onClick={handlePauseTimer}
                      className="w-full h-16 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all cursor-pointer"
                    >
                      <Pause size={22} fill="currentColor" />
                      <span>{isAr ? 'إيقاف مؤقت' : isEn ? 'Pause Cycle' : 'Mettre en Pause'}</span>
                    </button>
                  </div>
                )}
                <div className="sq-elev-card w-full">
                  <button
                    type="button"
                    data-no-liquid="true"
                    data-sq="ctl"
                    data-sq-border="none"
                    onClick={handleOpenFinishModal}
                    disabled={elapsedSeconds === 0 && !isRunning}
                    className={`w-full h-16 font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all ${
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
            </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="sq-elev-card">
                <div data-sq="card" data-sq-border="solid" className="p-4 bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 text-center">
                  <span className="text-[11px] text-black/55 dark:text-white/55 font-semibold block">
                    {isAr ? 'الوقت المستهدف' : isEn ? 'Target Rate' : 'Cadence Prévue'}
                  </span>
                  <span className="font-mono font-bold text-base text-black dark:text-white">
                    12 min / u
                  </span>
                </div>
              </div>
              <div className="sq-elev-card">
                <div data-sq="card" data-sq-border="solid" className="p-4 bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 text-center">
                  <span className="text-[11px] text-black/55 dark:text-white/55 font-semibold block">
                    {isAr ? 'معدل التوافر' : isEn ? 'Availability' : 'Disponibilité'}
                  </span>
                  <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                    96.4%
                  </span>
                </div>
              </div>
              <div className="sq-elev-card">
                <div data-sq="card" data-sq-border="solid" className="p-4 bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 text-center">
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
        </div>
      </ScreenPod>

      {isFinishModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="sq-elev-pop max-w-xl w-full animate-in zoom-in-95 duration-150">
            <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 w-full p-6 border border-neutral-200 dark:border-neutral-800 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
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
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="card"
                  data-sq-border="solid"
                  data-sq-stroke-w={activeNumpadField === 'good' ? 2 : 1}
                  onClick={() => setActiveNumpadField('good')}
                  className={`p-4 border text-center transition-all cursor-pointer ${
                    activeNumpadField === 'good'
                      ? 'border-[#d4522f] bg-[#FCEEE8] dark:bg-neutral-800'
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
                  data-no-liquid="true"
                  data-sq="card"
                  data-sq-border="solid"
                  data-sq-stroke-w={activeNumpadField === 'scrap' ? 2 : 1}
                  onClick={() => setActiveNumpadField('scrap')}
                  className={`p-4 border text-center transition-all cursor-pointer ${
                    activeNumpadField === 'scrap'
                      ? 'border-red-500 bg-red-50 dark:bg-neutral-800'
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
                        data-no-liquid="true"
                        data-sq="ctl"
                        data-sq-border="solid"
                        onClick={() => setSelectedScrapReason(code.id)}
                        className={`p-2.5 border text-xs text-left rtl:text-right cursor-pointer transition-all ${
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
                    data-no-liquid="true"
                    data-sq="ctl"
                    data-sq-border="none"
                    onClick={() => handleNumpadPress(digit)}
                    className={`h-14 font-mono text-xl font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
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
                  data-no-liquid="true"
                  data-sq="ctl"
                  data-sq-border="solid"
                  onClick={() => setIsFinishModalOpen(false)}
                  className="flex-1 py-3.5 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 font-bold text-sm cursor-pointer"
                >
                  {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
                </button>
                <div className="sq-elev-card flex-2">
                  <button
                    type="button"
                    data-no-liquid="true"
                    data-sq="ctl"
                    data-sq-border="none"
                    onClick={handleConfirmFinish}
                    className="w-full py-3.5 bg-[#d4522f] hover:bg-[#b0674b] text-white font-bold text-sm cursor-pointer transition-all"
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
          </div>
        </div>
      )}
      <KineticSlideOverInspector<ManufacturingOrder>
        isOpen={isInspectorOpen && Boolean(currentOrder)}
        item={currentOrder}
        allItems={orders}
        keyExtractor={(o) => o.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={currentOrder?.orderNumber || ''}
        subtitle={
          currentOrder
            ? `${currentOrder.productName} · Lot ${currentOrder.batchLotNumber || 'LOT-2026-05'}`
            : ''
        }
        avatarText="OF"
        avatarColor="#d4522f"
        categoryLabel={isAr ? 'محطة 03 CNC' : isEn ? 'Station 03 CNC' : 'Poste 03 CNC'}
        branchName={
          currentOrder
            ? resolveRecordBranch(currentOrder, branchesById, currentBranch, language).name
            : ''
        }
        statusLabel={currentOrder?.status || ''}
        statusClassName={
          currentOrder?.status === 'Completed'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : currentOrder?.status === 'InProduction'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-neutral-100 dark:bg-neutral-800 text-black/75 dark:text-white/75 border border-neutral-200 dark:border-neutral-700'
        }
        tabs={[
          { id: 'of', label: isAr ? 'أمر التصنيع' : isEn ? 'MO & Specs' : 'Fiche OF' },
          { id: 'epi', label: isAr ? 'السلامة EPI' : isEn ? 'Safety Loi 88-07' : 'Sécurité EPI' },
          { id: 'yield', label: isAr ? 'المردود والخردة' : isEn ? 'Yield & Scrap' : 'Rendement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={(t) => setInspectorTab(t as 'of' | 'epi' | 'yield')}
        onSelectItem={(o) => {
          setSelectedOrderId(o.id);
          setElapsedSeconds(0);
          setIsRunning(false);
        }}
        onClose={() => setIsInspectorOpen(false)}
        renderBody={(ord, tab) => {
          const ordProduced = ord.actualQuantityProduced || ord.quantityProduced || 0;
          const ordScrap = ord.scrapQuantity || 0;
          const ordYield = computeScrapYield(ord.targetQuantity, ordProduced, ordScrap);
          const br = resolveRecordBranch(ord, branchesById, currentBranch, language);
          if (tab === 'epi') {
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={isAr ? 'معدات الحماية الإلزامية (قانون 88-07)' : isEn ? 'Mandatory PPE Checklist (Loi 88-07)' : 'Contrôle EPI Obligatoire (Loi 88-07)'}
                >
                  <InspectorBigStat
                    value={`${epiCount} / 4`}
                    tone={isSafetyChecklistComplete ? 'ok' : 'accent'}
                    caption={
                      isSafetyChecklistComplete
                        ? isAr ? 'جميع شروط السلامة مؤكدة' : isEn ? 'All PPE items verified' : 'Poste conforme pour démarrage'
                        : isAr ? 'يرجى تأكيد العناصر الأربعة' : isEn ? 'Verify all 4 PPE items' : 'Validation requise avant cycle'
                    }
                  />
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'نظارات واقية' : isEn ? 'Safety Glasses' : 'Lunettes de protection'} value={epiGlasses ? '✓ OK' : 'En attente'} tone={epiGlasses ? 'ok' : 'warn'} />
                    <InspectorKeyValue label={isAr ? 'قفازات تقنية' : isEn ? 'Cut-Resistant Gloves' : 'Gants anti-coupure'} value={epiGloves ? '✓ OK' : 'En attente'} tone={epiGloves ? 'ok' : 'warn'} />
                    <InspectorKeyValue label={isAr ? 'أحذية سلامة S3' : isEn ? 'Safety Shoes S3' : 'Chaussures S3'} value={epiShoes ? '✓ OK' : 'En attente'} tone={epiShoes ? 'ok' : 'warn'} />
                    <InspectorKeyValue label={isAr ? 'خوذة / واقي أذن' : isEn ? 'Helmet / Ear Protection' : 'Casque / Anti-bruit'} value={epiHelmet ? '✓ OK' : 'En attente'} tone={epiHelmet ? 'ok' : 'warn'} isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={
                      andonActive
                        ? isAr ? 'إلغاء نداء أندون' : isEn ? 'Resolve Andon Alert' : 'Résoudre Alerte Andon'
                        : isAr ? 'إرسال نداء أندون' : isEn ? 'Trigger Andon Alert' : 'Déclencher Appel Andon'
                    }
                    icon={<AlertTriangle size={14} />}
                    tone={andonActive ? 'dark' : 'accent'}
                    onClick={andonActive ? handleCancelAndon : handleTriggerAndon}
                  />
                </InspectorSection>
              </div>
            );
          }
          if (tab === 'yield') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={isAr ? 'نسبة المطابقة والمردود' : isEn ? 'Cycle Yield & Scrap' : 'Rendement & Maîtrise Rebuts'}>
                  <InspectorBigStat
                    value={`${ordYield.yieldPercent}%`}
                    tone={ordYield.yieldPercent >= 95 ? 'ok' : 'accent'}
                    caption={`${ordProduced} ${isAr ? 'مطابق' : 'conformes'} / ${ordScrap} ${isAr ? 'خردة' : 'rebuts'}`}
                  />
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'الهدف' : isEn ? 'Target Qty' : 'Quantité Cible'} value={`${ord.targetQuantity} u`} mono />
                    <InspectorKeyValue label={isAr ? 'المنجز' : isEn ? 'Produced' : 'Conformes Produits'} value={`${ordProduced} u`} mono tone="ok" />
                    <InspectorKeyValue label={isAr ? 'الخردة' : isEn ? 'Scrap' : 'Rebuts Cumulés'} value={`${ordScrap} u`} mono tone={ordScrap > 0 ? 'warn' : 'ok'} />
                    <InspectorKeyValue label={isAr ? 'التكلفة الإجمالية' : isEn ? 'Total Cost' : 'Coût Engagé'} value={formatMoney(ord.totalCostDzd, language)} mono isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'تصريح الإنتاج والخردة' : isEn ? 'Declare Output & Scrap' : 'Déclarer Pièces & Rebuts'}
                    icon={<CheckCircle2 size={14} />}
                    tone="accent"
                    onClick={handleOpenFinishModal}
                  />
                </InspectorSection>
              </div>
            );
          }
          return (
            <div className="space-y-4">
              <InspectorSection index={0} title={isAr ? 'التحكم السريع بالمحطة' : isEn ? 'Quick Workstation Actions' : 'Pilotage Rapide Poste'}>
                <InspectorQuickActions
                  actions={[
                    isRunning
                      ? {
                          id: 'pause',
                          label: isAr ? 'إيقاف مؤقت' : isEn ? 'Pause' : 'Pause',
                          icon: <Pause size={15} />,
                          onClick: handlePauseTimer,
                        }
                      : {
                          id: 'start',
                          label: isAr ? 'تشغيل' : isEn ? 'Start' : 'Démarrer',
                          icon: <Play size={15} />,
                          primary: true,
                          onClick: handleStartTimer,
                        },
                    {
                      id: 'declare',
                      label: isAr ? 'تسجيل' : isEn ? 'Declare' : 'Déclarer',
                      icon: <CheckCircle2 size={15} />,
                      onClick: handleOpenFinishModal,
                    },
                    {
                      id: 'andon',
                      label: andonActive ? 'Clôturer' : 'Andon',
                      icon: <AlertTriangle size={15} />,
                      onClick: andonActive ? handleCancelAndon : handleTriggerAndon,
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'مواصفات أمر التصنيع' : isEn ? 'MO Specifications' : 'Spécifications OF'}>
                <InspectorCard>
                  <InspectorKeyValue label="N° OF" value={ord.orderNumber} mono />
                  <InspectorKeyValue label={isAr ? 'المنتج' : isEn ? 'Product' : 'Produit'} value={ord.productName} />
                  <InspectorKeyValue label="Lot" value={ord.batchLotNumber || 'LOT-2026-05'} mono />
                  <InspectorKeyValue label={isAr ? 'الوحدة / الفرع' : isEn ? 'Branch' : 'Unité / Atelier'} value={br.name} />
                  <InspectorKeyValue label={isAr ? 'التقدم' : isEn ? 'Progress' : 'Avancement'} value={`${ordProduced} / ${ord.targetQuantity}`} mono isLast />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
      />
    </div>
  );
};
