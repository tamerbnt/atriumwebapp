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
      <form onSubmit={handleSave} className="flex flex-col gap-[var(--s4,16px)]">
        {/* Top Summary Card */}
        <div
          data-sq="panel"
          style={{ '--sq-stroke': 'var(--atr-border, #E6DED6)' } as React.CSSProperties}
          className="p-[var(--pod-pad,12px)] bg-[#F3EDE7] dark:bg-neutral-800/60 flex flex-col gap-[var(--card-gap,12px)]"
        >
          <div className="flex items-center justify-between px-[var(--s1,4px)] pt-[var(--s1,4px)]">
            <span className="t-small text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">
              {isAr ? 'تاريخ العملية' : isEn ? 'Close Date' : 'Date Clôture'}
            </span>
            <span className="t-small font-semibold text-[var(--text-1,#17130F)] dark:text-white tabular-nums">
              {closure.closureDate}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--s2,8px)]">
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'var(--atr-border, #E5E5E5)' } as React.CSSProperties}
              className="p-[var(--s3,12px)] bg-white dark:bg-neutral-800 flex flex-col gap-[var(--s1,4px)]"
            >
              <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'الافتتاح' : isEn ? 'Opening' : 'Fond Initial'}</span>
              <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white tabular-nums">{formatMoney(closure.openingFloatDzd || 0, language)}</span>
            </div>
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'var(--atr-border, #E5E5E5)' } as React.CSSProperties}
              className="p-[var(--s3,12px)] bg-white dark:bg-neutral-800 flex flex-col gap-[var(--s1,4px)]"
            >
              <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'المقبوضات' : isEn ? 'Cash In' : 'Encaissements'}</span>
              <span className="t-label font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatMoney(closure.totalCashReceivedDzd || 0, language)}</span>
            </div>
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'var(--atr-border, #E5E5E5)' } as React.CSSProperties}
              className="p-[var(--s3,12px)] bg-white dark:bg-neutral-800 flex flex-col gap-[var(--s1,4px)]"
            >
              <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'رسوم الطابع' : isEn ? 'Stamp Tax' : 'Timbre Fiscal'}</span>
              <span className="t-label font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{formatMoney(closure.totalTimbreAccruedDzd || 0, language)}</span>
            </div>
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'var(--atr-border, #E5E5E5)' } as React.CSSProperties}
              className="p-[var(--s3,12px)] bg-white dark:bg-neutral-800 flex flex-col gap-[var(--s1,4px)]"
            >
              <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'المتوقع' : isEn ? 'Expected' : 'Théorique'}</span>
              <span className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">{formatMoney(closure.theoreticalCashDzd || 0, language)}</span>
            </div>
          </div>
        </div>

        {/* Banknote Denominations Counter */}
        <div className="sq-elev-card">
          <div
            data-sq="card"
            style={{ '--sq-stroke': 'var(--atr-border, #E5E5E5)' } as React.CSSProperties}
            className="card-opt p-[var(--card-pad,20px)] bg-white dark:bg-neutral-800 flex flex-col gap-[var(--s4,16px)]"
          >
            <div className="flex items-center justify-between pb-[var(--s2,8px)] border-b border-neutral-100 dark:border-neutral-700">
              <span className="t-small font-semibold text-[var(--text-1,#17130F)] dark:text-white flex items-center gap-[var(--icon-text-gap,8px)]">
                <Coins size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                {isAr ? 'عد الأوراق' : isEn ? 'Cash Count' : 'Comptage Billets'}
              </span>
              <span className={`t-small font-semibold tabular-nums ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isBalanced
                  ? (isAr ? 'متطابق' : isEn ? 'Balanced' : 'Conforme')
                  : `${isAr ? 'الفارق' : isEn ? 'Diff' : 'Écart'}: ${discrepancy > 0 ? '+' : ''}${formatMoney(discrepancy, language)}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-[var(--s3,12px)]">
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <LabelInput
                  type="number"
                  label="2 000 DA"
                  value={String(b2000)}
                  onChange={(e) => setB2000(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] text-center tabular-nums">
                  = {formatMoney(b2000 * 2000, language)}
                </span>
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <LabelInput
                  type="number"
                  label="1 000 DA"
                  value={String(b1000)}
                  onChange={(e) => setB1000(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] text-center tabular-nums">
                  = {formatMoney(b1000 * 1000, language)}
                </span>
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <LabelInput
                  type="number"
                  label="500 DA"
                  value={String(b500)}
                  onChange={(e) => setB500(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] text-center tabular-nums">
                  = {formatMoney(b500 * 500, language)}
                </span>
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <LabelInput
                  type="number"
                  label="200 DA"
                  value={String(b200)}
                  onChange={(e) => setB200(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] text-center tabular-nums">
                  = {formatMoney(b200 * 200, language)}
                </span>
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <LabelInput
                  type="number"
                  label="100 DA"
                  value={String(b100)}
                  onChange={(e) => setB100(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] text-center tabular-nums">
                  = {formatMoney(b100 * 100, language)}
                </span>
              </div>
            </div>

            <div
              data-sq="ctl"
              className="flex items-center justify-between p-[var(--s3,12px)] bg-neutral-50 dark:bg-neutral-900/50"
            >
              <span className="t-label text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">
                {isAr ? 'العد الفعلي' : isEn ? 'Counted Total' : 'Total Compté'}
              </span>
              <span className="t-unit font-semibold tabular-nums text-[var(--text-1,#17130F)] dark:text-white">
                {formatMoney(countedTotal, language)}
              </span>
            </div>
          </div>
        </div>

        <LabelInput
          label={isAr ? 'ملاحظات الإغلاق' : isEn ? 'Closing Notes' : 'Observations'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isAr ? 'أضف ملاحظة...' : isEn ? 'Add note...' : 'Notes...'}
        />

        <div className="flex justify-end gap-[var(--s2,8px)] pt-[var(--s2,8px)] border-t border-neutral-200 dark:border-neutral-800">
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
