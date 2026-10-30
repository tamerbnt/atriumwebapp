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
import { AtriumButton } from '../ui/AtriumButton';
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
  const { language } = useAtriumStore();
  const isAr = language === 'ar';

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
        isAr ? 'يرجى كتابة سبب الفارق المالي في الصندوق' : 'Veuillez justifier l\'écart de caisse supérieur à 500 DA',
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
        ? `تم اعتماد محضر إغلاق الصندوق اليومي (المجموع: ${formatMoney(countedTotal, language)})`
        : `Procès-verbal de clôture journalière de caisse validé (${formatMoney(countedTotal, language)})`,
      isBalanced ? 'success' : 'info'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'محضر الإغلاق اليومي للصندوق وطابع المادة 317' : 'Arrêté Journalier de Caisse & Rapprochement Timbre Art. 317'}
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Top Summary Card */}
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {isAr ? 'التاريخ والسيولة النظرية المسجلة:' : 'Date d\'Opération & Solde Théorique :'}
            </span>
            <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
              {closure.closureDate}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'الرصيد الافتتاحي' : 'Fond Initial'}</span>
              <span className="font-bold text-neutral-900 dark:text-white font-mono">{formatMoney(closure.openingFloatDzd || 0, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'المقبوضات الإجمالية' : 'Encaissements'}</span>
              <span className="font-bold text-emerald-600 font-mono">+{formatMoney(closure.totalCashReceivedDzd || 0, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'طابع المادة 317 المستحق' : 'Timbre Art. 317'}</span>
              <span className="font-bold text-amber-600 font-mono">{formatMoney(closure.totalTimbreAccruedDzd || 0, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'الرصيد النظري المطلوب' : 'Solde Théorique'}</span>
              <span className="font-bold text-[#C4785A] font-mono">{formatMoney(closure.theoreticalCashDzd || 0, language)}</span>
            </div>
          </div>
        </div>

        {/* Banknote Denominations Counter */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-700">
            <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Coins size={16} className="text-[#C4785A]" />
              {isAr ? 'عد الأوراق النقدية الفعلية في الصندوق:' : 'Comptage Physique des Coupures (Dinar Algérien) :'}
            </span>
            <span className={`text-xs font-mono font-bold ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isBalanced ? '✓ Solde Conforme' : `Écart: ${discrepancy > 0 ? '+' : ''}${formatMoney(discrepancy, language)}`}
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
              <span className="text-[10px] text-neutral-400 font-mono text-center block mt-1">
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
              <span className="text-[10px] text-neutral-400 font-mono text-center block mt-1">
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
              <span className="text-[10px] text-neutral-400 font-mono text-center block mt-1">
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
              <span className="text-[10px] text-neutral-400 font-mono text-center block mt-1">
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
              <span className="text-[10px] text-neutral-400 font-mono text-center block mt-1">
                = {formatMoney(b100 * 100, language)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 text-xs">
            <span className="font-medium text-neutral-600 dark:text-neutral-400">
              {isAr ? 'إجمالي العد الفعلي:' : 'Total Physique Compté :'}
            </span>
            <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
              {formatMoney(countedTotal, language)}
            </span>
          </div>
        </div>

        <LabelInput
          label={isAr ? 'ملاحظات المحضر ومبررات الفارق (إن وجد)' : 'Observations & Justification d\'Écart'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isAr ? 'اكتب ملاحظات إغلاق الصندوق اليومي...' : 'Renseigner les observations de clôture...'}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <AtriumButton variant="secondary" onClick={onClose} type="button">
            {isAr ? 'إلغاء' : 'Annuler'}
          </AtriumButton>
          <AtriumButton variant="primary" type="submit" icon={<CheckCircle2 size={15} />}>
            {isAr ? 'تأكيد وإقفال الصندوق' : 'Valider & Clôturer la Caisse'}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};
