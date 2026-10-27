import React, { useState } from 'react';
import { ScanLine, CheckCircle2, AlertCircle, ArrowRight, Package, ShieldCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';

export const LogisticsScannerView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { shipments, updateShipmentStatus } = useLogisticsData();

  const [scannedCode, setScannedCode] = useState('');
  const [scanHistory, setScanHistory] = useState<
    Array<{ code: string; status: 'success' | 'error'; message: string; timestamp: string }>
  >([]);

  const sortedCount = shipments.filter((s) => s.status === 'Sorted' || s.status === 'OutForDelivery' || s.status === 'Delivered').length;
  const inHubCount = shipments.filter((s) => s.status === 'HubIntake' || s.status === 'ReceivedAtHub').length;

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = scannedCode.trim().toUpperCase();
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

  const handleQuickScan = (code: string) => {
    setScannedCode(code);
  };

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

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Scan Input Form */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
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
                className="flex-1 h-12 px-4 rounded-xl font-mono text-base font-bold bg-[#F8F9FA] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
              />
              <AtriumButton variant="primary" size="md" type="submit" icon={<ScanLine size={16} />}>
                {isAr ? 'مسح وتوجيه' : 'Aiguiller'}
              </AtriumButton>
            </div>
          </form>

          {/* Quick-scan demo pills */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
            <span className="text-[11px] text-neutral-400 block mb-2 font-medium">
              {isAr ? 'رموز تجريبية سريعة:' : 'Simulation rapide codes AWB :'}
            </span>
            <div className="flex flex-wrap gap-2">
              {shipments.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleQuickScan(s.trackingCode)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-neutral-100 dark:bg-neutral-700 hover:bg-[#C4785A]/15 hover:text-[#C4785A] text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                >
                  {s.trackingCode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scan Log Table */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {isAr ? 'سجل عمليات المسح المباشرة' : 'Journal des Passages Scanner'}
            </span>
            <span className="text-[11px] text-neutral-400">
              {scanHistory.length} {isAr ? 'عمليات' : 'événements'}
            </span>
          </div>

          {scanHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              {isAr ? 'لم يتم مسح أي طرد بعد في هذه الجلسة' : 'Aucun scan enregistré sur ce poste'}
            </div>
          ) : (
            <div className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60 text-xs">
              {scanHistory.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                  <div className="flex items-center gap-3">
                    {item.status === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-red-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white mr-2">
                        {item.code}
                      </span>
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {item.message}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-neutral-400">{item.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
