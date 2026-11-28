import React, { useMemo, useState } from 'react';
import { Clock, FileText, Plus, Printer, Trash2, CheckSquare, Square, Receipt } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculateTimeEntryAmountCentimes } from '../../../utils/legalDepth';
import { calculateArticle317Stamp } from '../../../utils/legalRules';
import { PrintSheetModal } from '../../modals/PrintSheetModal';
import { t } from '../../../utils/i18n';
import type { SupportedLanguage as Language, LegalFeeInvoice, LegalMatter, LegalTimeEntry } from '../../../types';

interface LegalTimeBillingPanelProps {
  language: Language;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  staffName: string;
  matters: LegalMatter[];
  timeEntries: LegalTimeEntry[];
  feeInvoices: LegalFeeInvoice[];
  onAddTimeEntry: (entry: LegalTimeEntry) => void;
  onDeleteTimeEntry: (id: string) => void;
  onGenerateFeeInvoice: (params: {
    selectedIds: string[];
    matterId?: string;
    matterNumber?: string;
    clientId?: string;
    clientName: string;
    tvaRate: 0 | 9 | 19;
    disbursementDzd?: number;
    paymentMethod?: 'especes' | 'cheque' | 'virement' | 'baridimob';
    notes?: string;
  }) => { ok: boolean; invoice?: LegalFeeInvoice; message?: string };
}

export const LegalTimeBillingPanel: React.FC<LegalTimeBillingPanelProps> = ({
  language,
  accountId,
  businessId,
  branchId,
  staffId,
  staffName,
  matters,
  timeEntries,
  feeInvoices,
  onAddTimeEntry,
  onDeleteTimeEntry,
  onGenerateFeeInvoice,
}) => {
  const isAr = language === 'ar';
  const [matterId, setMatterId] = useState<string>(matters[0]?.id || '');
  const [activityType, setActivityType] = useState<LegalTimeEntry['activityType']>('redaction');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [hourlyRateDzd, setHourlyRateDzd] = useState<number>(8000);
  const [isBillable, setIsBillable] = useState(true);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tvaRate, setTvaRate] = useState<0 | 9 | 19>(19);
  const [disbursementDzd, setDisbursementDzd] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'virement' | 'cheque' | 'especes' | 'baridimob'>('virement');
  const [invoiceToPrint, setInvoiceToPrint] = useState<LegalFeeInvoice | null>(null);

  const selectedMatter = useMemo(
    () => matters.find((m) => m.id === matterId) || matters[0],
    [matters, matterId]
  );

  const unbilledEntries = useMemo(
    () => timeEntries.filter((e) => e.isBillable && !e.isBilled),
    [timeEntries]
  );

  const selectedSubtotalCentimes = useMemo(
    () =>
      timeEntries
        .filter((e) => selectedIds.includes(e.id) && e.isBillable && !e.isBilled)
        .reduce((acc, e) => acc + calculateTimeEntryAmountCentimes(e.durationMinutes, e.hourlyRateDzd), 0),
    [timeEntries, selectedIds]
  );

  const previewTvaCentimes = Math.round(selectedSubtotalCentimes * (tvaRate / 100));
  const previewDisbCentimes = Math.max(0, Math.round((Number(disbursementDzd) || 0) * 100));
  const previewTimbreDzd = calculateArticle317Stamp(
    (selectedSubtotalCentimes + previewTvaCentimes + previewDisbCentimes) / 100,
    paymentMethod
  );
  const previewTotalTtcDzd =
    (selectedSubtotalCentimes + previewTvaCentimes + previewDisbCentimes) / 100 + previewTimbreDzd;

  const handleLogTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast(t('legal_depth_time_desc_required', language), 'error');
      return;
    }
    const amountHtCentimes = calculateTimeEntryAmountCentimes(durationMinutes, hourlyRateDzd);
    const entry: LegalTimeEntry = {
      id: `te_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId,
      businessId,
      branchId,
      staffId,
      matterId: selectedMatter?.id,
      matterNumber: selectedMatter?.matterNumber,
      clientName: selectedMatter?.clientName || 'Client Cabinet',
      counselName: staffName || selectedMatter?.assignedLawyer || 'Maître',
      activityType,
      description: description.trim(),
      durationMinutes: Math.max(1, Number(durationMinutes) || 60),
      hourlyRateDzd: Math.max(0, Number(hourlyRateDzd) || 0),
      tvaRate,
      amountHtCentimes,
      isBillable,
      isBilled: false,
      entryDate: new Date().toISOString().split('T')[0],
      version: 1,
      createdAt: new Date().toISOString(),
    };
    onAddTimeEntry(entry);
    setDescription('');
    showToast(t('legal_depth_time_logged_ok', language), 'success');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnbilled = () => {
    if (selectedIds.length === unbilledEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unbilledEntries.map((e) => e.id));
    }
  };

  const handleConvertToInvoice = () => {
    const firstSelected = timeEntries.find((e) => selectedIds.includes(e.id));
    const targetMatter = matters.find((m) => m.id === firstSelected?.matterId) || selectedMatter;
    const res = onGenerateFeeInvoice({
      selectedIds,
      matterId: targetMatter?.id,
      matterNumber: targetMatter?.matterNumber,
      clientName: firstSelected?.clientName || targetMatter?.clientName || 'Client Cabinet',
      tvaRate,
      disbursementDzd,
      paymentMethod,
    });
    if (!res.ok) {
      showToast(res.message || t('legal_depth_invoice_error', language), 'error');
      return;
    }
    setSelectedIds([]);
    setDisbursementDzd(0);
    showToast(
      `${t('legal_depth_invoice_generated', language)} (${res.invoice?.invoiceNumber || ''})`,
      'success'
    );
  };

  return (
    <div
      data-testid="legal-time-billing-panel"
      className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Clock size={18} className="text-emerald-700 dark:text-emerald-400" />
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {t('legal_depth_time_billing_title', language)}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t('legal_depth_time_billing_sub', language)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-300 tabular-nums">
          <span>
            {unbilledEntries.length} {t('legal_depth_unbilled_entries', language)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {feeInvoices.length} {t('legal_depth_fee_invoices_count', language)}
          </span>
        </div>
      </div>

      {/* Quick Time Entry Form */}
      <form onSubmit={handleLogTime} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
            {t('legal_depth_matter_label', language)}
          </label>
          <select
            value={selectedMatter?.id || ''}
            onChange={(e) => setMatterId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
          >
            {matters.length === 0 && <option value="">—</option>}
            {matters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.matterNumber} — {m.clientName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
            {t('legal_depth_activity_type', language)}
          </label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as LegalTimeEntry['activityType'])}
            className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
          >
            <option value="consultation">Consultation</option>
            <option value="redaction">Rédaction d'actes / conclusions</option>
            <option value="audience">Plaidoirie / Audience</option>
            <option value="recherche">Recherche juridique</option>
            <option value="negociation">Négociation</option>
            <option value="audit">Audit comptable / fiscal</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
            {t('legal_depth_duration_min', language)}
          </label>
          <input
            type="number"
            min={5}
            step={5}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
            {t('legal_depth_hourly_rate', language)}
          </label>
          <input
            type="number"
            min={0}
            step={500}
            value={hourlyRateDzd}
            onChange={(e) => setHourlyRateDzd(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
          />
        </div>

        <div>
          <AtriumButton
            type="submit"
            variant="primary"
            icon={<Plus size={14} />}
            className="w-full justify-center whitespace-nowrap shrink-0"
          >
            {t('legal_depth_log_time_btn', language)}
          </AtriumButton>
        </div>

        <div className="md:col-span-5">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('legal_depth_time_desc_placeholder', language)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer pb-1.5">
          <input
            type="checkbox"
            checked={isBillable}
            onChange={(e) => setIsBillable(e.target.checked)}
            className="rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
          />
          <span>{t('legal_depth_billable_label', language)}</span>
        </label>
      </form>

      {/* Time Entries & Invoice Conversion Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={handleSelectAllUnbilled}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:text-emerald-700 whitespace-nowrap shrink-0"
          >
            {selectedIds.length > 0 && selectedIds.length === unbilledEntries.length ? (
              <CheckSquare size={14} className="text-emerald-600" />
            ) : (
              <Square size={14} />
            )}
            <span>{t('legal_depth_select_all_unbilled', language)}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="TVA"
              value={tvaRate}
              onChange={(e) => setTvaRate(Number(e.target.value) as 0 | 9 | 19)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
            >
              <option value={19}>TVA 19%</option>
              <option value={9}>TVA 9%</option>
              <option value={0}>TVA 0% (Exonéré)</option>
            </select>

            <input
              type="number"
              min={0}
              value={disbursementDzd || ''}
              onChange={(e) => setDisbursementDzd(Number(e.target.value) || 0)}
              placeholder={t('legal_depth_disbursements_placeholder', language)}
              className="w-36 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
            />

            <select
              aria-label="Mode de paiement"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as 'virement' | 'cheque' | 'especes' | 'baridimob')
              }
              className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="virement">Virement bancaire</option>
              <option value="cheque">Chèque</option>
              <option value="especes">Espèces (Timbre Art. 317)</option>
              <option value="baridimob">BaridiMob</option>
            </select>

            <AtriumButton
              variant="primary"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={handleConvertToInvoice}
              icon={<Receipt size={14} />}
              className="whitespace-nowrap shrink-0"
            >
              {t('legal_depth_generate_invoice_btn', language)} ({formatMoney(previewTotalTtcDzd, language)})
            </AtriumButton>
          </div>
        </div>

        {/* Time Entries Table */}
        <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-lg">
          <table className="w-full text-xs text-left rtl:text-right">
            <thead className="bg-stone-50 dark:bg-stone-800/70 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="py-2 px-3 w-8" />
                <th className="py-2 px-3">{t('legal_depth_date_col', language)}</th>
                <th className="py-2 px-3">{t('legal_depth_matter_label', language)}</th>
                <th className="py-2 px-3">{t('legal_depth_description_col', language)}</th>
                <th className="py-2 px-3 text-right">{t('legal_depth_duration_min', language)}</th>
                <th className="py-2 px-3 text-right">{t('legal_depth_amount_ht', language)}</th>
                <th className="py-2 px-3">{t('legal_depth_status_col', language)}</th>
                <th className="py-2 px-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {timeEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-stone-400">
                    {t('legal_depth_time_empty', language)}
                  </td>
                </tr>
              ) : (
                timeEntries.slice(0, 12).map((entry) => {
                  const amountDzd =
                    calculateTimeEntryAmountCentimes(entry.durationMinutes, entry.hourlyRateDzd) / 100;
                  const checked = selectedIds.includes(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40"
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          disabled={!entry.isBillable || entry.isBilled}
                          checked={checked}
                          onChange={() => toggleSelect(entry.id)}
                          aria-label={`select-${entry.id}`}
                          className="rounded border-stone-300 text-emerald-700"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-stone-600 dark:text-stone-300">
                        {entry.entryDate}
                      </td>
                      <td className="py-2 px-3 text-stone-700 dark:text-stone-200">
                        {entry.matterNumber || '—'} · {entry.clientName || '—'}
                      </td>
                      <td className="py-2 px-3 text-stone-900 dark:text-stone-100">
                        {entry.description}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {entry.durationMinutes} min
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-stone-900 dark:text-stone-100">
                        {formatMoney(amountDzd, language)}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span
                          className={
                            entry.isBilled
                              ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                              : entry.isBillable
                              ? 'text-amber-700 dark:text-amber-400 font-medium'
                              : 'text-stone-400'
                          }
                        >
                          {entry.isBilled
                            ? t('legal_depth_billed_status', language)
                            : entry.isBillable
                            ? t('legal_depth_unbilled_status', language)
                            : t('legal_depth_nonbillable_status', language)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {!entry.isBilled && (
                          <button
                            type="button"
                            onClick={() => onDeleteTimeEntry(entry.id)}
                            aria-label={`delete-${entry.id}`}
                            className="p-1 text-stone-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Generated Fee Invoices List */}
        {feeInvoices.length > 0 && (
          <div className="pt-2 space-y-2">
            <h4 className="text-xs font-semibold text-stone-600 dark:text-stone-300">
              {t('legal_depth_recent_invoices_heading', language)}
            </h4>
            <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg">
              {feeInvoices.slice(0, 6).map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={14} className="text-emerald-700 dark:text-emerald-400" />
                    <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                      {inv.invoiceNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-stone-700 dark:text-stone-300">{inv.clientName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-stone-500 tabular-nums">
                      HT {formatMoney(inv.feesHtDzd, language)} · TVA {inv.tvaRate}% ({formatMoney(inv.tvaDzd, language)})
                      {inv.timbreDzd > 0 ? ` · Timbre ${formatMoney(inv.timbreDzd, language)}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                      {formatMoney(inv.totalTtcDzd, language)}
                    </span>
                    <AtriumButton
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoiceToPrint(inv)}
                      icon={<Printer size={13} />}
                      className="whitespace-nowrap shrink-0"
                    >
                      {t('legal_depth_print_invoice', language)}
                    </AtriumButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PrintSheetModal
        isOpen={Boolean(invoiceToPrint)}
        onClose={() => setInvoiceToPrint(null)}
        language={language}
        format="a4"
        title={isAr ? 'بيان أتعاب المحاماة / الاستشارة' : "NOTE D'HONORAIRES"}
        subtitle={
          invoiceToPrint
            ? `${invoiceToPrint.invoiceNumber} · ${invoiceToPrint.clientName}`
            : undefined
        }
        pages={
          invoiceToPrint
            ? [
                {
                  id: invoiceToPrint.id,
                  title: `NOTE D'HONORAIRES N° ${invoiceToPrint.invoiceNumber}`,
                  subtitle: `${invoiceToPrint.clientName} · ${invoiceToPrint.matterNumber || 'Dossier Cabinet'}`,
                  badgeText: invoiceToPrint.status,
                  sections: [
                    {
                      heading: isAr ? 'تفصيل الخدمات' : 'Détail des Diligences',
                      rows: invoiceToPrint.lineItems.map((line) => ({
                        label: `${line.description} (${line.durationMinutes} min)`,
                        value: formatMoney(line.amountHtDzd, language),
                      })),
                    },
                    {
                      heading: isAr ? 'الخلاصة المالية' : 'Décompte Fiscal & Total TTC',
                      rows: [
                        { label: 'Total Honoraires HT', value: formatMoney(invoiceToPrint.feesHtDzd, language) },
                        { label: 'Débours / Frais avancés', value: formatMoney(invoiceToPrint.disbursementsDzd, language) },
                        { label: `TVA (${invoiceToPrint.tvaRate}%)`, value: formatMoney(invoiceToPrint.tvaDzd, language) },
                        { label: 'Droit de timbre (Art. 317)', value: formatMoney(invoiceToPrint.timbreDzd, language) },
                        { label: 'NET À PAYER TTC', value: formatMoney(invoiceToPrint.totalTtcDzd, language) },
                      ],
                    },
                  ],
                  signatureLeft: isAr ? 'إمضاء الموكل' : 'Bon pour accord — Client',
                  signatureRight: isAr ? 'ختم وإمضاء المكتب' : 'Cachet & Signature du Cabinet',
                },
              ]
            : []
        }
      />
    </div>
  );
};
