import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Wallet, X } from 'lucide-react';
import type { UnifiedDocument, UnifiedPayment, UnifiedPaymentMethod } from '../../../types/index';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { useAtriumActions, useAtriumSelector, shallowEqualObjects } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { KineticModalShell } from '../../ui/kinetic';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface UnifiedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceVertical?: string;
  partyId?: string;
  partyName: string;
  defaultAmountDzd?: number;
  initialSelectedDocId?: string;
  onRecorded?: (payment: UnifiedPayment) => void;
}

export const UnifiedPaymentModal: React.FC<UnifiedPaymentModalProps> = ({
  isOpen,
  onClose,
  sourceVertical,
  partyId,
  partyName,
  defaultAmountDzd = 0,
  initialSelectedDocId,
  onRecorded,
}) => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { recordUnifiedPayment } = useAtriumActions();
  const { unifiedDocuments } = useAtriumSelector(
    (s) => ({
      unifiedDocuments: s.unifiedDocuments || [],
    }),
    shallowEqualObjects
  );

  const openInvoices = useMemo(() => {
    return unifiedDocuments.filter((doc) => {
      if (doc.balanceDueCentimes <= 0) return false;
      if (doc.status === 'Voided' || doc.status === 'Canceled') return false;
      if (partyId && doc.partyId) return doc.partyId === partyId;
      return doc.partyName.toLowerCase() === (partyName || '').toLowerCase();
    });
  }, [unifiedDocuments, partyId, partyName]);

  const [amountDzd, setAmountDzd] = useState(defaultAmountDzd);
  const [method, setMethod] = useState<UnifiedPaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(() => new Set());
  const [instrumentNumber, setInstrumentNumber] = useState('');
  const [instrumentBank, setInstrumentBank] = useState('');
  const [instrumentDueDate, setInstrumentDueDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMethod('cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setInstrumentNumber('');
    setInstrumentBank('');
    setInstrumentDueDate('');
    setNotes('');
    const initSet = new Set<string>();
    if (initialSelectedDocId) {
      initSet.add(initialSelectedDocId);
    } else if (openInvoices.length > 0) {
      openInvoices.forEach((d) => initSet.add(d.id));
    }
    setSelectedDocIds(initSet);
    if (defaultAmountDzd > 0) {
      setAmountDzd(defaultAmountDzd);
    } else if (openInvoices.length > 0) {
      const totalOpen = openInvoices
        .filter((d) => initSet.has(d.id))
        .reduce((s, d) => s + centimesToDzd(d.balanceDueCentimes), 0);
      setAmountDzd(totalOpen);
    } else {
      setAmountDzd(0);
    }
  }, [isOpen, defaultAmountDzd, initialSelectedDocId, openInvoices.length]);

  const isInstrument = method === 'cheque' || method === 'traite';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountDzd <= 0) return;
    if (isInstrument && !instrumentNumber.trim()) return;
    const allocations = Array.from(selectedDocIds).map((docId) => ({ documentId: docId }));
    const payment = recordUnifiedPayment({
      sourceVertical,
      partyId,
      partyName,
      method,
      amountDzd,
      paymentDate,
      allocations,
      instrumentNumber: isInstrument ? instrumentNumber.trim() : undefined,
      instrumentBank: isInstrument ? instrumentBank.trim() || undefined : undefined,
      instrumentDueDate: isInstrument ? instrumentDueDate || undefined : undefined,
      notes: notes.trim() || undefined,
    });
    if (payment) {
      onRecorded?.(payment);
      onClose();
    }
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      ariaLabel={isAr ? 'تسجيل تحصيل موحد' : isEn ? 'Record Unified Payment' : 'Encaisser un règlement'}
    >
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        data-sq="panel"
        data-sq-border="solid"
        className="w-full bg-white dark:bg-[#22201E] text-black dark:text-white p-6 space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <h2 className="t-card font-semibold">
              {isAr ? 'تسجيل تحصيل مالي' : isEn ? 'Collect Payment' : 'Enregistrer un encaissement'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[#FAF7F4] dark:bg-[#191716] flex items-center justify-between t-cap">
          <span className="text-black/60 dark:text-white/60">{isAr ? 'العميل / العضو' : isEn ? 'Party' : 'Tiers'}</span>
          <span className="font-semibold">{partyName}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'المبلغ (DZD) *' : isEn ? 'Amount (DZD) *' : 'Montant encaissé (DZD) *'}
              type="number"
              value={String(amountDzd)}
              onChange={(v) => setAmountDzd(Math.max(0, Number(v) || 0))}
              required
            />
            <LabelInput
              label={isAr ? 'تاريخ الدفع *' : isEn ? 'Payment Date *' : 'Date d’encaissement *'}
              type="date"
              value={paymentDate}
              onChange={setPaymentDate}
              required
            />
          </div>

          <LabelSelect
            label={isAr ? 'طريقة الدفع *' : isEn ? 'Payment Method *' : 'Mode de règlement *'}
            value={method}
            onChange={(v) => setMethod(v as UnifiedPaymentMethod)}
            options={[
              { value: 'cash', label: isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces (Caisse)' },
              { value: 'ccp', label: 'CCP / Mandat' },
              { value: 'bank_transfer', label: isAr ? 'تحويل بنكي' : isEn ? 'Bank Transfer' : 'Virement bancaire' },
              { value: 'cib', label: 'CIB / Edahabia' },
              { value: 'baridimob', label: 'BaridiMob' },
              { value: 'cheque', label: isAr ? 'شيك بنكي' : isEn ? 'Cheque' : 'Chèque bancaire' },
              { value: 'traite', label: isAr ? 'كمبيالة' : isEn ? 'Traite / Bill' : 'Traite / Effet' },
              { value: 'member_balance', label: isAr ? 'رصيد العضو' : isEn ? 'Member Credit' : 'Solde / Acompte' },
            ]}
          />

          {isInstrument && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-500/20">
              <LabelInput
                label={isAr ? 'رقم الصك *' : isEn ? 'Instrument # *' : 'N° Chèque / Effet *'}
                value={instrumentNumber}
                onChange={setInstrumentNumber}
                placeholder="CHQ-001245"
                required
              />
              <LabelInput
                label={isAr ? 'البنك' : isEn ? 'Bank' : 'Banque'}
                value={instrumentBank}
                onChange={setInstrumentBank}
                placeholder="BNA / CPA / BDL"
              />
              <LabelInput
                label={isAr ? 'تاريخ الاستحقاق' : isEn ? 'Due Date' : 'Échéance'}
                type="date"
                value={instrumentDueDate}
                onChange={setInstrumentDueDate}
              />
            </div>
          )}

          {openInvoices.length > 0 && (
            <div className="space-y-1.5">
              <div className="t-small font-semibold text-black/70 dark:text-white/70">
                {isAr
                  ? 'توزيع على الفواتير المفتوحة'
                  : isEn
                    ? 'Allocate to Open Documents'
                    : 'Ventiler sur les pièces ouvertes'}
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {openInvoices.map((doc: UnifiedDocument) => {
                  const checked = selectedDocIds.has(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#FAF7F4] dark:bg-[#191716] cursor-pointer t-cap"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedDocIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(doc.id)) next.delete(doc.id);
                              else next.add(doc.id);
                              return next;
                            })
                          }
                        />
                        <span className="font-semibold truncate">{doc.docNumber || doc.draftNumber}</span>
                        <span className="text-black/55 dark:text-white/55">{doc.docDate}</span>
                      </span>
                      <span className="tabular-nums font-semibold shrink-0">
                        {formatMoney(centimesToDzd(doc.balanceDueCentimes))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <LabelInput
            label={isAr ? 'ملاحظات' : isEn ? 'Notes' : 'Notes / Référence'}
            value={notes}
            onChange={setNotes}
            placeholder={isAr ? 'تفاصيل العملية...' : 'Référence transaction...'}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <AtriumButton type="button" variant="ghost" size="sm" onClick={onClose}>
              {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
            </AtriumButton>
            <AtriumButton
              type="submit"
              variant="primary"
              size="sm"
              icon={<CheckCircle2 size={14} />}
              disabled={amountDzd <= 0 || (isInstrument && !instrumentNumber.trim())}
            >
              {isAr ? 'تأكيد التحصيل' : isEn ? 'Record Payment' : 'Valider l’encaissement'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
