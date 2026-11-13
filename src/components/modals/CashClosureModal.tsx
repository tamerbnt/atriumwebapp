import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { Modal } from '../ui/Modal';
import { Button, LiquidButton } from '@/atrium';
import { LabelInput } from '../ui/LabelInput';
import { formatMoney } from '../../utils/rules';
import { DailyCashClosure, CashReceipt } from '../../types';

interface CashClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  closure: DailyCashClosure;
  cashReceipts: CashReceipt[];
  onSaveClosure: (closure: DailyCashClosure) => void;
}

export const CashClosureModal: React.FC<CashClosureModalProps> = ({
  isOpen,
  onClose,
  closure,
  cashReceipts,
  onSaveClosure,
}) => {
  const { language, networkMode } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const theoretical = closure.theoreticalCashDzd || 0;
  // Banknotes denomination count
  const [b2000, setB2000] = useState<number>(() => Math.floor(theoretical / 2000));
  const [b1000, setB1000] = useState<number>(() => Math.floor((theoretical % 2000) / 1000));
  const [b500, setB500] = useState<number>(0);
  const [b200, setB200] = useState<number>(0);
  const [b100, setB100] = useState<number>(0);
  const [notes, setNotes] = useState(closure.notes || '');

  // Computed physical cash total
  const countedTotal = useMemo(() => {
    return (
      b2000 * 2000 +
      b1000 * 1000 +
      b500 * 500 +
      b200 * 200 +
      b100 * 100
    );
  }, [b2000, b1000, b500, b200, b100]);

  const discrepancy = countedTotal - theoretical;
  const isBalanced = Math.abs(discrepancy) === 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced && Math.abs(discrepancy) > 500 && !notes.trim()) {
      showToast(
        isAr ? 'يرجى توضيح الفارق' : isEn ? 'Explain difference over 500 DA' : 'Justifiez l\'écart (> 500 DA)',
        'error'
      );
      return;
    }

    const updated: DailyCashClosure = {
      ...closure,
      actualPhysicalCashCountedDzd: countedTotal,
      discrepancyDzd: discrepancy,
      status: isBalanced ? 'balanced' : 'variance_flagged',
      notes,
    };

    onSaveClosure(updated);
    showToast(
      isAr
        ? `تم الإغلاق (${formatMoney(countedTotal, language)})`
        : isEn
        ? `Cash closed (${formatMoney(countedTotal, language)})`
        : `Caisse clôturée (${formatMoney(countedTotal, language)})`,
      isBalanced ? 'success' : 'info'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={networkMode === 'force_skeleton'}
      title={isAr ? 'إغلاق الصندوق' : isEn ? 'Cash Close' : 'Clôture Caisse'}
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Top Summary Card */}
        <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-black/70 dark:text-white/70">
              {isAr ? 'تاريخ العملية' : isEn ? 'Close Date' : 'Date Clôture'}
            </span>
            <span className="text-xs font-mono font-bold text-black dark:text-white tabular-nums">
              {closure.closureDate}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'الافتتاح' : isEn ? 'Opening' : 'Fond Initial'}</span>
              <span className="font-bold text-black dark:text-white font-mono tabular-nums">{formatMoney(closure.openingFloatDzd || 0, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'المقبوضات' : isEn ? 'Cash In' : 'Encaissements'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">+{formatMoney(closure.totalCashReceivedDzd || 0, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'رسوم الطابع' : isEn ? 'Stamp Tax' : 'Timbre Fiscal'}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">{formatMoney(closure.totalTimbreAccruedDzd || 0, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'المتوقع' : isEn ? 'Expected' : 'Théorique'}</span>
              <span className="font-bold text-[#d4522f] font-mono tabular-nums">{formatMoney(closure.theoreticalCashDzd || 0, language)}</span>
            </div>
          </div>
        </div>

        {/* Banknote Denominations Counter */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-700">
            <span className="text-xs font-bold text-black dark:text-white flex items-center gap-2">
              <Coins size={16} className="text-[#d4522f]" />
              {isAr ? 'عد الأوراق' : isEn ? 'Cash Count' : 'Comptage Billets'}
            </span>
            <span className={`text-xs font-mono font-bold tabular-nums ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isBalanced
                ? (isAr ? 'متطابق' : isEn ? 'Balanced' : 'Conforme')
                : `${isAr ? 'الفارق' : isEn ? 'Diff' : 'Écart'}: ${discrepancy > 0 ? '+' : ''}${formatMoney(discrepancy, language)}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div>
              <LabelInput
                type="number"
                label="2 000 DA"
                value={String(b2000)}
                onChange={(e) => setB2000(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-[10px] text-black/55 dark:text-white/55 font-mono text-center block mt-1 tabular-nums">
                = {formatMoney(b2000 * 2000, language)}
              </span>
            </div>
            <div>
              <LabelInput
                type="number"
                label="1 000 DA"
                value={String(b1000)}
                onChange={(e) => setB1000(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-[10px] text-black/55 dark:text-white/55 font-mono text-center block mt-1 tabular-nums">
                = {formatMoney(b1000 * 1000, language)}
              </span>
            </div>
            <div>
              <LabelInput
                type="number"
                label="500 DA"
                value={String(b500)}
                onChange={(e) => setB500(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-[10px] text-black/55 dark:text-white/55 font-mono text-center block mt-1 tabular-nums">
                = {formatMoney(b500 * 500, language)}
              </span>
            </div>
            <div>
              <LabelInput
                type="number"
                label="200 DA"
                value={String(b200)}
                onChange={(e) => setB200(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-[10px] text-black/55 dark:text-white/55 font-mono text-center block mt-1 tabular-nums">
                = {formatMoney(b200 * 200, language)}
              </span>
            </div>
            <div>
              <LabelInput
                type="number"
                label="100 DA"
                value={String(b100)}
                onChange={(e) => setB100(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-[10px] text-black/55 dark:text-white/55 font-mono text-center block mt-1 tabular-nums">
                = {formatMoney(b100 * 100, language)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 text-xs">
            <span className="font-medium text-black/70 dark:text-white/70">
              {isAr ? 'العد الفعلي' : isEn ? 'Counted Total' : 'Total Compté'}
            </span>
            <span className="text-lg font-extrabold font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums text-black dark:text-white">
              {formatMoney(countedTotal, language)}
            </span>
          </div>
        </div>

        <LabelInput
          label={isAr ? 'ملاحظات الإغلاق' : isEn ? 'Closing Notes' : 'Observations'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isAr ? 'أضف ملاحظة...' : isEn ? 'Add note...' : 'Notes...'}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <Button tone="soft" onClick={onClose} type="button">
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </Button>
          <LiquidButton
            kind="confirm"
            type="submit"
            labels={{
              idle: isAr ? 'إغلاق الصندوق' : isEn ? 'Close Cash' : 'Clôturer',
            }}
          />
        </div>
      </form>
    </Modal>
  );
};
