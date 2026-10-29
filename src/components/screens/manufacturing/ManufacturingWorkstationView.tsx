import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserCheck,
  Flame,
  Wrench,
  Boxes,
  HelpCircle,
  RefreshCw,
  BellRing,
  RotateCcw,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { computeScrapYield } from '../../../utils/manufacturingRules';
import { useManufacturingData } from './manufacturingData';
import { ManufacturingOrder } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';

// Algerian failure reason codes for scrap declaration
const SCRAP_REASON_CODES = [
  { id: 'dim_flaw', labelFr: 'Défaut Calibrage / Dimensionnel', labelAr: 'خطأ في الأبعاد والقياس' },
  { id: 'raw_defect', labelFr: 'Défaut Matière Première', labelAr: 'عيب في المادة الأولية' },
  { id: 'power_cut', labelFr: 'Coupure Courant Sonelgaz', labelAr: 'انقطاع التيار الكهربائي' },
  { id: 'tool_wear', labelFr: 'Usure / Casse Outil de Coupe', labelAr: 'تآكل أو انكسار أداة القطع' },
  { id: 'handling', labelFr: 'Erreur Réglage / Manipulation', labelAr: 'خطأ في الضبط والتشغيل' },
];

export const ManufacturingWorkstationView: React.FC = () => {
  const { language, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { orders, updateOrder } = useManufacturingData();

  // Active workstation state
  const [stationName, setStationName] = useState('Poste 03 - Découpe & Usinage CNC');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
    const inProg = orders.find((o) => o.status === 'InProduction');
    return inProg ? inProg.id : orders[0]?.id || '';
  });

  // Selected Order
  const currentOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  }, [orders, selectedOrderId]);

  // Loi 88-07 Safety EPI Checklist State
  const [epiGlasses, setEpiGlasses] = useState(false);
  const [epiGloves, setEpiGloves] = useState(false);
  const [epiShoes, setEpiShoes] = useState(false);
  const [epiHelmet, setEpiHelmet] = useState(false);

  const isSafetyChecklistComplete = epiGlasses && epiGloves && epiShoes && epiHelmet;

  // Machine Timer State
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Completion / Scrap Modal State
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [goodQuantityInput, setGoodQuantityInput] = useState<string>('1');
  const [scrapQuantityInput, setScrapQuantityInput] = useState<string>('0');
  const [selectedScrapReason, setSelectedScrapReason] = useState<string>(SCRAP_REASON_CODES[0].id);
  const [activeNumpadField, setActiveNumpadField] = useState<'good' | 'scrap'>('good');

  // Andon Alert Call State
  const [andonActive, setAndonActive] = useState(false);
  const [andonReason, setAndonReason] = useState<'machine_fault' | 'material_shortage' | 'qc_inspection' | 'urgent_aid'>('machine_fault');

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
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
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    if (!isSafetyChecklistComplete) {
      showToast(
        isAr
          ? 'تنبيه: يجب تأكيد جميع تدابير السلامة والوقاية (قانون 88-07) قبل تشغيل الآلة'
          : 'Sécurité Loi 88-07 : Veuillez valider tous les EPI obligatoires avant démarrage',
        'error'
      );
      return;
    }
    setIsRunning(true);
    if (!sessionStartTime) setSessionStartTime(Date.now());
    showToast(
      isAr ? 'تم بدء احتساب وقت دورة التشغيل' : 'Chronomètre d\'usinage lancé avec succès',
      'info'
    );
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
    showToast(
      isAr ? 'تم إيقاف دورة التشغيل مؤقتاً' : 'Cycle de fabrication mis en pause',
      'info'
    );
  };

  const handleTriggerAndon = () => {
    setAndonActive(true);
    showToast(
      isAr
        ? 'تم إرسال إشعار نداء أندون عاجل لرئيس الورشة والمراقب'
        : 'Alerte Andon émise ! Le chef d\'atelier et le responsable maintenance ont été notifiés.',
      'error'
    );
  };

  const handleCancelAndon = () => {
    setAndonActive(false);
    showToast(
      isAr ? 'تم إلغاء نداء التنبيه العاجل' : 'Alerte Andon résolue et clôturée',
      'success'
    );
  };

  const handleOpenFinishModal = () => {
    setIsRunning(false);
    setGoodQuantityInput('1');
    setScrapQuantityInput('0');
    setIsFinishModalOpen(true);
  };

  const handleNumpadPress = (digit: string) => {
    if (activeNumpadField === 'good') {
      if (digit === 'C') {
        setGoodQuantityInput('0');
      } else {
        setGoodQuantityInput((prev) => (prev === '0' ? digit : prev + digit));
      }
    } else {
      if (digit === 'C') {
        setScrapQuantityInput('0');
      } else {
        setScrapQuantityInput((prev) => (prev === '0' ? digit : prev + digit));
      }
    }
  };

  const handleConfirmFinish = () => {
    if (!currentOrder) return;
    const goodQty = parseInt(goodQuantityInput, 10) || 0;
    const scrapQty = parseInt(scrapQuantityInput, 10) || 0;

    const currentProduced = currentOrder.actualQuantityProduced || currentOrder.quantityProduced || 0;
    const updatedProduced = currentProduced + goodQty;

    const yieldStats = computeScrapYield(currentOrder.targetQuantity, updatedProduced, scrapQty);

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
        : `Déclaration validée : +${goodQty} pièces conformes, +${scrapQty} rebuts. Rendement : ${yieldStats.yieldPercent}%`,
      'success'
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Kiosk Top Bar Banner */}
      <div className="bg-[#1F1D1B] text-white rounded-[24px] p-5 sm:p-6 shadow-md border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C4785A] text-white flex items-center justify-center font-black text-xl shadow-inner shrink-0">
            <Wrench size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FB923C]/20 text-[#FB923C] uppercase tracking-wider font-mono">
                {isAr ? 'محطة تشغيل تابلت' : 'Borne Kiosk Atelier'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-neutral-400 font-medium">Poste Connecté</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
              {stationName}
            </h1>
            <p className="text-xs text-neutral-400">
              {isAr ? 'المشغل المسجل: ' : 'Opérateur connecté : '}
              <span className="text-neutral-200 font-semibold">{currentUser?.fullName || 'M. Karim Bouzid'}</span>
            </p>
          </div>
        </div>

        {/* Andon Urgent Alert Button */}
        <div className="flex items-center gap-3">
          {andonActive ? (
            <button
              type="button"
              onClick={handleCancelAndon}
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center gap-2 animate-bounce cursor-pointer shadow-lg"
            >
              <BellRing size={20} className="animate-spin" />
              <span>{isAr ? 'إلغاء نداء أندون العاجل' : 'Résoudre Appel Andon'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTriggerAndon}
              className="px-5 py-3 rounded-2xl bg-[#3D2817] hover:bg-[#52331c] text-[#FB923C] border border-[#FB923C]/40 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <AlertTriangle size={18} />
              <span>{isAr ? 'نداء الطوارئ / أندون (Andon)' : 'Appel Chef d\'Atelier (Andon)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Active Work Order & Safety on Left, Live Stopwatch & Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: OF Selector & Safety PPE Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* OF Picker Card */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {isAr ? 'أمر التصنيع المخصص' : 'Sélection Ordre de Fabrication'}
              </span>
              <span className="text-xs font-mono font-bold text-[#C4785A]">
                {orders.length} {isAr ? 'أوامر متاحة' : 'OFs disponibles'}
              </span>
            </div>

            <select
              value={selectedOrderId}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                setElapsedSeconds(0);
                setIsRunning(false);
              }}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white shadow-2xs outline-none focus:ring-2 focus:ring-[#C4785A]"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} - {o.productName} ({o.actualQuantityProduced || o.quantityProduced || 0}/{o.targetQuantity})
                </option>
              ))}
            </select>

            {currentOrder && (
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 font-mono">
                    Lot: {currentOrder.batchLotNumber || 'LOT-2026-05'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentOrder.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentOrder.status === 'InProduction'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {currentOrder.status}
                  </span>
                </div>

                <div className="text-base font-bold text-neutral-900 dark:text-white">
                  {currentOrder.productName}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EDF1F3] dark:border-neutral-700 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">{isAr ? 'الهدف' : 'Cible OF'}</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                      {currentOrder.targetQuantity} unités
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">{isAr ? 'المنجز' : 'Conformes'}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {currentOrder.actualQuantityProduced || currentOrder.quantityProduced || 0} unités
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loi 88-07 Mandatory Safety EPI Checklist */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#C4785A]" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'إجراءات السلامة والوقاية (قانون 88-07)' : 'Contrôle Sécurité EPI (Loi 88-07)'}
                </h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSafetyChecklistComplete
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isSafetyChecklistComplete ? 'EPI Conformes' : 'Validation Requise'}
              </span>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'وفقاً للتشريع الجزائري، يُلزم المشغل بارتداء معدات الحماية قبل تفعيل محطة التشغيل'
                : 'Conformément à la réglementation de sécurité au travail, cochez les EPI obligatoires avant d\'actionner le poste.'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEpiGlasses(!epiGlasses)}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  epiGlasses
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    epiGlasses ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  ✓
                </div>
                <span className="text-xs">{isAr ? 'نظارات واقية' : 'Lunettes de protection'}</span>
              </button>

              <button
                type="button"
                onClick={() => setEpiGloves(!epiGloves)}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  epiGloves
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    epiGloves ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  ✓
                </div>
                <span className="text-xs">{isAr ? 'قفازات تقنية' : 'Gants anti-coupure'}</span>
              </button>

              <button
                type="button"
                onClick={() => setEpiShoes(!epiShoes)}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  epiShoes
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    epiShoes ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  ✓
                </div>
                <span className="text-xs">{isAr ? 'أحذية سلامة S3' : 'Chaussures de sécurité'}</span>
              </button>

              <button
                type="button"
                onClick={() => setEpiHelmet(!epiHelmet)}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  epiHelmet
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    epiHelmet ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  ✓
                </div>
                <span className="text-xs">{isAr ? 'خوذة / واقي أذن' : 'Casque / Anti-bruit'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Giant Monospace Timer & Glove-Friendly Action Buttons (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Giant Stopwatch Display Card */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[28px] p-6 sm:p-8 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-widest">
              <Clock size={16} className="text-[#C4785A]" />
              <span>{isAr ? 'عداد وقت التشغيل النشط' : 'Temps de Cycle Machine'}</span>
            </div>

            {/* Giant Monospace Timer Display */}
            <div className="font-mono font-black text-6xl sm:text-7xl lg:text-8xl tracking-tight text-neutral-900 dark:text-white tabular-nums select-none drop-shadow-xs">
              {formatTimer(elapsedSeconds)}
            </div>

            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span
                className={`w-3 h-3 rounded-full ${
                  isRunning ? 'bg-emerald-500 animate-ping' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              />
              <span className="font-medium">
                {isRunning
                  ? (isAr ? 'الآلة قيد التشغيل والإنتاج' : 'Machine en marche • Cycle actif')
                  : (isAr ? 'الآلة في وضع الاستعداد أو التوقف' : 'Poste en pause / attente')}
              </span>
            </div>

            {/* Giant Glove-Friendly Action Controls (Minimum height 64px for tablet use) */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EDF1F3] dark:border-neutral-700/60">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="w-full h-18 rounded-2xl bg-[#C4785A] hover:bg-[#b0674b] active:scale-98 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer"
                >
                  <Play size={24} fill="currentColor" />
                  <span>{isAr ? 'بدء تشغيل الدورة' : 'Démarrer Cycle'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseTimer}
                  className="w-full h-18 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer"
                >
                  <Pause size={24} fill="currentColor" />
                  <span>{isAr ? 'إيقاف مؤقت' : 'Mettre en Pause'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenFinishModal}
                disabled={elapsedSeconds === 0 && !isRunning}
                className={`w-full h-18 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer ${
                  elapsedSeconds > 0 || isRunning
                    ? 'bg-[#1F1D1B] hover:bg-black text-white active:scale-98'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 size={24} />
                <span>{isAr ? 'إنهاء وتسجيل القطع' : 'Déclarer Pièces'}</span>
              </button>
            </div>
          </div>

          {/* Quick Station Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs text-center">
              <span className="text-[11px] text-neutral-400 font-semibold block">{isAr ? 'الوقت المستهدف' : 'Cadence Prévue'}</span>
              <span className="font-mono font-bold text-base text-neutral-900 dark:text-white">12 min / u</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs text-center">
              <span className="text-[11px] text-neutral-400 font-semibold block">{isAr ? 'معدل التوافر' : 'Disponibilité'}</span>
              <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">96.4%</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs text-center">
              <span className="text-[11px] text-neutral-400 font-semibold block">{isAr ? 'الخردة المسجلة' : 'Rebuts Cumulés'}</span>
              <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                {currentOrder?.scrapQuantity || 0} u
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Completion & Scrap Touch Numpad Modal */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    {isAr ? 'تسجيل كميات الإنتاج والخردة' : 'Déclaration de Fin de Cycle & Rebuts'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {currentOrder?.orderNumber} • {currentOrder?.productName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFinishModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Fields Selector */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setActiveNumpadField('good')}
                className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                  activeNumpadField === 'good'
                    ? 'border-[#C4785A] bg-[#FCEEE8] dark:bg-neutral-800 ring-2 ring-[#C4785A]'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40'
                }`}
              >
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                  {isAr ? 'القطع السليمة المطابقة' : 'Pièces Bonnes (Conformes)'}
                </span>
                <span className="font-mono font-black text-3xl text-neutral-900 dark:text-white">
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
                  {isAr ? 'القطع المرفوضة / خردة' : 'Pièces Rebutées (Chutes)'}
                </span>
                <span className="font-mono font-black text-3xl text-red-600 dark:text-red-400">
                  {scrapQuantityInput}
                </span>
              </button>
            </div>

            {/* If Scrap > 0, show Scrap Reason Code Selection */}
            {parseInt(scrapQuantityInput, 10) > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  {isAr ? 'سبب رفض القطع (التشريع الصناعي)' : 'Motif de Rebut Déclaré'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SCRAP_REASON_CODES.map((code) => (
                    <button
                      key={code.id}
                      type="button"
                      onClick={() => setSelectedScrapReason(code.id)}
                      className={`p-2.5 rounded-xl border text-xs text-left cursor-pointer transition-all ${
                        selectedScrapReason === code.id
                          ? 'border-red-500 bg-red-50 dark:bg-neutral-800 text-red-700 dark:text-red-300 font-bold'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {isAr ? code.labelAr : code.labelFr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Touch Numpad */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '00'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumpadPress(digit)}
                  className={`h-14 rounded-xl font-mono text-xl font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs ${
                    digit === 'C'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {digit}
                </button>
              ))}
            </div>

            {/* Submit Action */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFinishModalOpen(false)}
                className="flex-1 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold text-sm cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                className="flex-2 py-3.5 rounded-xl bg-[#C4785A] hover:bg-[#b0674b] text-white font-bold text-sm shadow-md cursor-pointer transition-all"
              >
                {isAr ? 'تأكيد التسجيل وتحديث أمر التصنيع' : 'Valider la Déclaration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
