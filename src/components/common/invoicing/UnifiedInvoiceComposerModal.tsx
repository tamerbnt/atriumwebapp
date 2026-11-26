import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import type {
  TimbreCalculationBasis,
  UnifiedCurrency,
  UnifiedDocType,
  UnifiedDocument,
  UnifiedPaymentMethod,
} from '../../../types/index';
import {
  calculateUnifiedDocumentTotals,
  type UnifiedLineInput,
} from '../../../utils/invoicingEngine';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { useAtriumActions, useAtriumSelector, shallowEqualObjects } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { KineticModalShell } from '../../ui/kinetic';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';

export interface UnifiedInvoiceComposerPrefill {
  docType?: UnifiedDocType;
  sourceVertical?: string;
  partyId?: string;
  partyName?: string;
  partyNif?: string;
  partyNis?: string;
  partyRc?: string;
  partyAi?: string;
  partyAddress?: string;
  partyPhone?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  notesTop?: string;
  items?: UnifiedLineInput[];
}

interface UnifiedInvoiceComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDraft?: UnifiedDocument | null;
  prefill?: UnifiedInvoiceComposerPrefill | null;
  onSaved?: (doc: UnifiedDocument) => void;
}

export const UnifiedInvoiceComposerModal: React.FC<UnifiedInvoiceComposerModalProps> = ({
  isOpen,
  onClose,
  editingDraft,
  prefill,
  onSaved,
}) => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { createUnifiedDocument, updateUnifiedDraft } = useAtriumActions();
  const { statutoryRate } = useAtriumSelector(
    (s) => ({
      statutoryRate: s.effectiveStatutoryRate,
    }),
    shallowEqualObjects
  );

  const [docType, setDocType] = useState<UnifiedDocType>('facture');
  const [partyName, setPartyName] = useState('');
  const [partyNif, setPartyNif] = useState('');
  const [partyRc, setPartyRc] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState<UnifiedCurrency>('DZD');
  const [fxRate, setFxRate] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<UnifiedPaymentMethod>('bank_transfer');
  const [timbreBasis, setTimbreBasis] = useState<TimbreCalculationBasis>('commercial_cash');
  const [generalDiscountPercent, setGeneralDiscountPercent] = useState(0);
  const [guaranteeRetentionPercent, setGuaranteeRetentionPercent] = useState(0);
  const [includeStampSignature, setIncludeStampSignature] = useState(true);
  const [notesTop, setNotesTop] = useState('');
  const [items, setItems] = useState<UnifiedLineInput[]>([
    { description: '', quantity: 1, unit: 'u', unitPriceHt: 0, tvaPercent: 19, discountPercent: 0 },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingDraft) {
      setDocType(editingDraft.docType);
      setPartyName(editingDraft.partyName);
      setPartyNif(editingDraft.partyNif || '');
      setPartyRc(editingDraft.partyRc || '');
      setPartyAddress(editingDraft.partyAddress || '');
      setDocDate(editingDraft.docDate);
      setDueDate(editingDraft.dueDate || '');
      setCurrency(editingDraft.currency);
      setFxRate(editingDraft.fxRate);
      setPaymentMethod((editingDraft.paymentMethod as UnifiedPaymentMethod) || 'bank_transfer');
      setTimbreBasis(editingDraft.timbreBasis);
      setGeneralDiscountPercent(editingDraft.generalDiscountPercent);
      setGuaranteeRetentionPercent(editingDraft.guaranteeRetentionPercent);
      setIncludeStampSignature(editingDraft.includeStampSignature);
      setNotesTop(editingDraft.notesTop || '');
      setItems(
        editingDraft.items.map((l) => ({
          id: l.id,
          productId: l.productId,
          description: l.description,
          isService: l.isService,
          quantity: l.quantity,
          unit: l.unit,
          unitPriceHt: l.unitPriceHt,
          tvaPercent: l.tvaPercent,
          discountPercent: l.discountPercent || 0,
        }))
      );
      return;
    }

    setDocType(prefill?.docType || 'facture');
    setPartyName(prefill?.partyName || '');
    setPartyNif(prefill?.partyNif || '');
    setPartyRc(prefill?.partyRc || '');
    setPartyAddress(prefill?.partyAddress || '');
    setDocDate(new Date().toISOString().slice(0, 10));
    setDueDate('');
    setCurrency('DZD');
    setFxRate(1);
    setPaymentMethod('bank_transfer');
    setTimbreBasis('commercial_cash');
    setGeneralDiscountPercent(0);
    setGuaranteeRetentionPercent(0);
    setIncludeStampSignature(true);
    setNotesTop(prefill?.notesTop || '');
    setItems(
      prefill?.items && prefill.items.length > 0
        ? prefill.items
        : [{ description: '', quantity: 1, unit: 'u', unitPriceHt: 1000, tvaPercent: 19, discountPercent: 0 }]
    );
  }, [isOpen, editingDraft, prefill]);

  const totals = useMemo(
    () =>
      calculateUnifiedDocumentTotals({
        items,
        generalDiscountPercent,
        guaranteeRetentionPercent,
        paymentMethod,
        timbreBasis,
        isCashFiscalStampEnabled: paymentMethod === 'cash' && timbreBasis !== 'exempt',
        currency,
        fxRate,
        statutoryRate,
      }),
    [
      items,
      generalDiscountPercent,
      guaranteeRetentionPercent,
      paymentMethod,
      timbreBasis,
      currency,
      fxRate,
      statutoryRate,
    ]
  );

  const handleSave = (issueImmediately: boolean) => {
    if (!partyName.trim() || items.every((i) => !i.description.trim())) return;
    const cleanItems = items.filter((i) => i.description.trim().length > 0);
    if (editingDraft) {
      const updated = updateUnifiedDraft(editingDraft.id, {
        partyName: partyName.trim(),
        partyNif: partyNif.trim() || undefined,
        partyRc: partyRc.trim() || undefined,
        partyAddress: partyAddress.trim() || undefined,
        docDate,
        dueDate: dueDate || undefined,
        currency,
        fxRate,
        paymentMethod,
        timbreBasis,
        isCashFiscalStampEnabled: paymentMethod === 'cash' && timbreBasis !== 'exempt',
        generalDiscountPercent,
        guaranteeRetentionPercent,
        includeStampSignature,
        notesTop: notesTop.trim() || undefined,
        items: cleanItems,
      });
      if (updated) {
        onSaved?.(updated);
        onClose();
      }
      return;
    }

    const created = createUnifiedDocument({
      docType,
      sourceVertical: prefill?.sourceVertical,
      partyId: prefill?.partyId,
      partyName: partyName.trim(),
      partyNif: partyNif.trim() || prefill?.partyNif,
      partyNis: prefill?.partyNis,
      partyRc: partyRc.trim() || prefill?.partyRc,
      partyAi: prefill?.partyAi,
      partyAddress: partyAddress.trim() || prefill?.partyAddress,
      partyPhone: prefill?.partyPhone,
      docDate,
      dueDate: dueDate || undefined,
      currency,
      fxRate,
      paymentMethod,
      timbreBasis,
      isCashFiscalStampEnabled: paymentMethod === 'cash' && timbreBasis !== 'exempt',
      generalDiscountPercent,
      guaranteeRetentionPercent,
      includeStampSignature,
      notesTop: notesTop.trim() || undefined,
      sourceEntityType: prefill?.sourceEntityType,
      sourceEntityId: prefill?.sourceEntityId,
      items: cleanItems,
      issueImmediately,
    });
    onSaved?.(created);
    onClose();
  };

  const tvaOptions = (statutoryRate?.tvaRates?.length ? statutoryRate.tvaRates : [0, 9, 19]).map((r) => ({
    value: String(r),
    label: `${r}%`,
  }));

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      ariaLabel={isAr ? 'مستند تجاري موحد' : isEn ? 'Unified Invoice Composer' : 'Éditeur Facturation Unifiée'}
    >
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        data-sq="panel"
        data-sq-border="solid"
        className="w-full bg-white dark:bg-[#22201E] text-black dark:text-white flex flex-col max-h-[92vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--atr-divider)] shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <h2 className="t-card font-semibold">
              {editingDraft
                ? `${isAr ? 'تعديل المسودة' : isEn ? 'Edit Draft' : 'Modifier Brouillon'} · ${editingDraft.draftNumber}`
                : isAr
                  ? 'إصدار مستند مالي موحد'
                  : isEn
                    ? 'New Unified Commercial Document'
                    : 'Nouvelle Pièce Commerciale Unifiée'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <LabelSelect
              label={isAr ? 'نوع المستند' : isEn ? 'Document Type' : 'Type de pièce'}
              value={docType}
              onChange={(v) => setDocType(v as UnifiedDocType)}
              options={[
                { value: 'facture', label: isAr ? 'فاتورة (Facture)' : 'Facture' },
                { value: 'devis', label: isAr ? 'عرض سعر (Devis)' : 'Devis' },
                { value: 'proforma', label: isAr ? 'فاتورة شكلية (Proforma)' : 'Proforma' },
                { value: 'commande', label: isAr ? 'طلبية (Commande)' : 'Bon de Commande' },
                { value: 'bl', label: isAr ? 'وصل تسليم (BL)' : 'Bon de Livraison' },
                { value: 'receipt', label: isAr ? 'وصل استلام (Reçu)' : 'Reçu / Quittance' },
                { value: 'avoir', label: isAr ? 'إشعار دائن (Avoir)' : 'Facture d’Avoir' },
              ]}
            />
            <LabelInput
              label={isAr ? 'تاريخ الإصدار' : isEn ? 'Issue Date' : 'Date d’émission'}
              type="date"
              value={docDate}
              onChange={setDocDate}
            />
            <LabelInput
              label={isAr ? 'تاريخ الاستحقاق' : isEn ? 'Due Date' : 'Échéance'}
              type="date"
              value={dueDate}
              onChange={setDueDate}
            />
            <LabelSelect
              label={isAr ? 'العملة' : isEn ? 'Currency' : 'Devise'}
              value={currency}
              onChange={(v) => {
                const next = v as UnifiedCurrency;
                setCurrency(next);
                if (next === 'DZD') setFxRate(1);
              }}
              options={[
                { value: 'DZD', label: 'DZD' },
                { value: 'EUR', label: 'EUR' },
                { value: 'USD', label: 'USD' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <LabelInput
              label={isAr ? 'العميل / المستفيد *' : isEn ? 'Party / Client *' : 'Client / Tiers *'}
              value={partyName}
              onChange={setPartyName}
              placeholder={isAr ? 'الاسم الكامل أو المؤسسة' : 'Nom ou Raison sociale'}
              required
            />
            <LabelInput
              label="N.I.F."
              value={partyNif}
              onChange={setPartyNif}
              placeholder="000000000000000"
            />
            <LabelInput
              label="R.C."
              value={partyRc}
              onChange={setPartyRc}
              placeholder="RC"
            />
            <LabelInput
              label={isAr ? 'العنوان' : isEn ? 'Address' : 'Adresse'}
              value={partyAddress}
              onChange={setPartyAddress}
              placeholder={isAr ? 'المدينة / الولاية' : 'Adresse'}
            />
          </div>

          {currency !== 'DZD' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-500/20">
              <LabelInput
                label={isAr ? `سعر الصرف (${currency} → DZD)` : `Taux de change (${currency} → DZD)`}
                type="number"
                value={String(fxRate)}
                onChange={(v) => setFxRate(Math.max(0.0001, Number(v) || 1))}
              />
              <div className="flex flex-col justify-center t-cap tabular-nums">
                <span className="text-black/60 dark:text-white/60">
                  {isAr ? 'المعادل بالدينار' : isEn ? 'DZD Equivalent' : 'Contre-valeur DZD'}
                </span>
                <span className="t-label font-semibold">
                  {formatMoney(centimesToDzd(totals.netToPayDzdEquivalentCentimes))}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="t-small font-semibold uppercase tracking-wide text-black/65 dark:text-white/65">
                {isAr ? 'البنود والخدمات' : isEn ? 'Line Items' : 'Lignes de facturation'}
              </h3>
              <AtriumButton
                type="button"
                variant="secondary"
                size="xs"
                icon={<Plus size={14} />}
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { description: '', quantity: 1, unit: 'u', unitPriceHt: 0, tvaPercent: 19, discountPercent: 0 },
                  ])
                }
              >
                {isAr ? 'إضافة بند' : isEn ? 'Add Line' : 'Ajouter ligne'}
              </AtriumButton>
            </div>

            <div className="space-y-2">
              {items.map((line, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-[#FAF7F4] dark:bg-[#191716] border border-black/[0.08] dark:border-white/[0.08]"
                >
                  <div className="col-span-12 md:col-span-4">
                    <LabelInput
                      label={isAr ? 'الوصف' : isEn ? 'Description' : 'Désignation'}
                      value={line.description}
                      onChange={(v) =>
                        setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, description: v } : x)))
                      }
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <LabelInput
                      label={isAr ? 'الكمية' : isEn ? 'Qty' : 'Qté'}
                      type="number"
                      value={String(line.quantity)}
                      onChange={(v) =>
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, quantity: Math.max(0, Number(v) || 0) } : x))
                        )
                      }
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <LabelInput
                      label={isAr ? 'سعر الوحدة HT' : isEn ? 'Unit HT' : 'P.U. HT'}
                      type="number"
                      value={String(line.unitPriceHt)}
                      onChange={(v) =>
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, unitPriceHt: Math.max(0, Number(v) || 0) } : x))
                        )
                      }
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <LabelSelect
                      label="TVA"
                      value={String(line.tvaPercent ?? 19)}
                      onChange={(v) =>
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, tvaPercent: Number(v) } : x))
                        )
                      }
                      options={tvaOptions}
                    />
                  </div>
                  <div className="col-span-10 md:col-span-1">
                    <LabelInput
                      label="%"
                      type="number"
                      value={String(line.discountPercent ?? 0)}
                      onChange={(v) =>
                        setItems((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, discountPercent: Math.max(0, Math.min(100, Number(v) || 0)) } : x
                          )
                        )
                      }
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end pb-1">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-rose-600 disabled:opacity-30 cursor-pointer"
                      aria-label="Remove line"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <LabelSelect
              label={isAr ? 'طريقة الدفع' : isEn ? 'Payment Method' : 'Mode de règlement'}
              value={paymentMethod}
              onChange={(v) => setPaymentMethod(v as UnifiedPaymentMethod)}
              options={[
                { value: 'bank_transfer', label: isAr ? 'تحويل بنكي' : 'Virement bancaire' },
                { value: 'cash', label: isAr ? 'نقداً (طابع 1%)' : 'Espèces (Timbre)' },
                { value: 'ccp', label: 'CCP / Mandat' },
                { value: 'cheque', label: isAr ? 'شيك بنكي' : 'Chèque bancaire' },
                { value: 'traite', label: isAr ? 'كمبيالة (Traite)' : 'Traite / Effet' },
                { value: 'cib', label: 'CIB / Edahabia' },
                { value: 'baridimob', label: 'BaridiMob' },
              ]}
            />
            <LabelSelect
              label={isAr ? 'أساس الطابع الجبائي' : isEn ? 'Fiscal Stamp Basis' : 'Régime Timbre Fiscal'}
              value={timbreBasis}
              onChange={(v) => setTimbreBasis(v as TimbreCalculationBasis)}
              options={[
                { value: 'commercial_cash', label: '1% Espèces (Commercial)' },
                { value: 'art_317', label: 'Barème Art. 317 (Quittances)' },
                { value: 'exempt', label: isAr ? 'معفى' : isEn ? 'Exempt' : 'Exonéré' },
              ]}
            />
            <LabelInput
              label={isAr ? 'تخفيض عام %' : isEn ? 'Global Disc. %' : 'Remise Globale %'}
              type="number"
              value={String(generalDiscountPercent)}
              onChange={(v) => setGeneralDiscountPercent(Math.max(0, Math.min(100, Number(v) || 0)))}
            />
            <LabelInput
              label={isAr ? 'اقتطاع الضمان %' : isEn ? 'Retention %' : 'Retenue Garantie %'}
              type="number"
              value={String(guaranteeRetentionPercent)}
              onChange={(v) => setGuaranteeRetentionPercent(Math.max(0, Math.min(100, Number(v) || 0)))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <LabelInput
              label={isAr ? 'ملاحظات / الموضوع' : isEn ? 'Subject / Notes' : 'Objet / Notes'}
              value={notesTop}
              onChange={setNotesTop}
            />
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F4] dark:bg-[#191716]">
              <span className="t-small font-medium">
                {isAr ? 'إدراج الختم والتوقيع عند الطباعة' : isEn ? 'Include stamp & signature' : 'Inclure cachet & signature'}
              </span>
              <LiveSwitch checked={includeStampSignature} onChange={setIncludeStampSignature} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF7F4] dark:bg-[#191716] border border-black/[0.08] dark:border-white/[0.08] grid grid-cols-2 md:grid-cols-5 gap-3 tabular-nums t-cap">
            <div>
              <div className="text-black/55 dark:text-white/55">Total HT</div>
              <div className="t-label font-semibold">{formatMoney(centimesToDzd(totals.totalHtFinalCentimes))}</div>
            </div>
            <div>
              <div className="text-black/55 dark:text-white/55">TVA</div>
              <div className="t-label font-semibold">{formatMoney(centimesToDzd(totals.totalTvaCentimes))}</div>
            </div>
            <div>
              <div className="text-black/55 dark:text-white/55">Timbre</div>
              <div className="t-label font-semibold">{formatMoney(centimesToDzd(totals.timbreFiscalCentimes))}</div>
            </div>
            <div>
              <div className="text-black/55 dark:text-white/55">Total TTC</div>
              <div className="t-label font-semibold">{formatMoney(centimesToDzd(totals.totalTtcCentimes))}</div>
            </div>
            <div>
              <div className="text-black/55 dark:text-white/55">Net à Payer</div>
              <div className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {formatMoney(centimesToDzd(totals.netToPayCentimes))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-[var(--atr-divider)] shrink-0">
          <AtriumButton type="button" variant="ghost" size="sm" onClick={onClose}>
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </AtriumButton>
          <AtriumButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={!partyName.trim()}
            onClick={() => handleSave(false)}
          >
            {isAr ? 'حفظ كمسودة' : isEn ? 'Save Draft' : 'Enregistrer Brouillon'}
          </AtriumButton>
          {!editingDraft && (
            <AtriumButton
              type="button"
              variant="primary"
              size="sm"
              icon={<CheckCircle2 size={14} />}
              disabled={!partyName.trim()}
              onClick={() => handleSave(true)}
            >
              {isAr ? 'إصدار وترقيم رسمي' : isEn ? 'Issue & Number' : 'Émettre & Numéroter'}
            </AtriumButton>
          )}
        </div>
      </div>
    </KineticModalShell>
  );
};
