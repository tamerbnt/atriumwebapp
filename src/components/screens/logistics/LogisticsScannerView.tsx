import React, { useState } from 'react';
import { ScanLine, CheckCircle2, AlertCircle, ArrowRight, Package } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <ScanLine size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'ماسح الفرز والاستلام (Douchette Hub)' : 'Poste de Tri & Scan Douchette Hub'}
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'استقبال الشحنات بالباركود، التوجيه الآلي للولايات وتأكيد الاستلام'
                : 'Lecture code-barres AWB haute fréquence, routage par Wilaya et pointage'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Scanner Terminal Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center shadow-xs border border-orange-100 dark:border-orange-900/30">
            <ScanLine size={32} />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {isAr ? 'امسح باركود الشحنة (AWB)' : 'Scanner ou Saisir le Code AWB'}
            </h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              {isAr
                ? 'استخدم قارئ الباركود أو أدخل الرمز يدوياً لتحديث حالة الطرد وتوجيهه لخط الشحن'
                : 'Pointez la douchette vers l’étiquette thermique ou entrez le code pour tri immédiat'}
            </p>
          </div>

          <form onSubmit={handleScanSubmit} className="max-w-md mx-auto space-y-3">
            <input
              type="text"
              autoFocus
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              placeholder="Ex: ATR-EXP-88912..."
              className="w-full text-center py-3.5 px-4 text-lg font-mono font-bold tracking-wider border-2 border-[#C4785A] rounded-2xl bg-orange-50/20 dark:bg-orange-950/20 text-neutral-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-[#C4785A]/20 transition-all placeholder:text-neutral-400 placeholder:font-normal placeholder:text-sm"
            />

            <AtriumButton
              variant="primary"
              size="lg"
              type="submit"
              className="w-full justify-center"
              icon={<ArrowRight size={16} />}
            >
              {isAr ? 'تأكيد قراءة الباركود' : 'Valider le Bip'}
            </AtriumButton>
          </form>

          {/* Quick Click Samples */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              {isAr ? 'رموز جاهزة للاختبار السريع:' : 'Échantillons pour test rapide:'}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {shipments.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleQuickScan(s.trackingCode)}
                  className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  {s.trackingCode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scan Log History */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Package size={15} className="text-[#C4785A]" />
            <span>{isAr ? 'سجل العمليات الأخيرة' : 'Journal des Passages Scanner Récent'}</span>
          </h3>

          {scanHistory.length === 0 ? (
            <p className="text-xs text-neutral-400 italic text-center py-4">
              {isAr ? 'لا توجد عمليات مسح بعد' : 'En attente du premier scan...'}
            </p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {scanHistory.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
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
                      <span className="text-neutral-500">{item.message}</span>
                    </div>
                  </div>

                  <span className="font-mono text-neutral-400 text-[11px]">{item.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
