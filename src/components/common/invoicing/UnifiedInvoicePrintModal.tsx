import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import type { UnifiedDocument } from '../../../types/index';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { useAtriumActions } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';
import { AtriumButton } from '../../ui/AtriumButton';

interface UnifiedInvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UnifiedDocument | null;
  defaultFormat?: 'a4' | '80mm';
}

const DOC_LABELS: Record<string, { fr: string; en: string; ar: string }> = {
  facture: { fr: 'FACTURE', en: 'INVOICE', ar: 'فاتورة تجارية' },
  devis: { fr: 'DEVIS', en: 'QUOTE', ar: 'عرض سعر' },
  proforma: { fr: 'FACTURE PROFORMA', en: 'PROFORMA INVOICE', ar: 'فاتورة شكلية' },
  commande: { fr: 'BON DE COMMANDE', en: 'PURCHASE ORDER', ar: 'طلبية شراء' },
  bl: { fr: 'BON DE LIVRAISON', en: 'DELIVERY NOTE', ar: 'وصل تسليم' },
  avoir: { fr: 'FACTURE D’AVOIR', en: 'CREDIT NOTE', ar: 'إشعار دائن' },
  retour: { fr: 'BON DE RETOUR', en: 'RETURN NOTE', ar: 'وصل إرجاع' },
  receipt: { fr: 'REÇU / QUITTANCE', en: 'PAYMENT RECEIPT', ar: 'وصل دفع' },
};

export const UnifiedInvoicePrintModal: React.FC<UnifiedInvoicePrintModalProps> = ({
  isOpen,
  onClose,
  document: rawDoc,
  defaultFormat = 'a4',
}) => {
  const { language, isRtl } = useTranslation();
  const { incrementUnifiedPrintCount } = useAtriumActions();
  const [formatMode, setFormatMode] = useState<'a4' | '80mm'>(defaultFormat);
  const doc = useRetainedModalValue(isOpen ? rawDoc : null);
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const handlePrint = () => {
    if (doc) incrementUnifiedPrintCount(doc.id);
    window.print();
  };

  const titleMeta = doc ? DOC_LABELS[doc.docType] || DOC_LABELS.facture : DOC_LABELS.facture;
  const hdr = doc?.fiscalHeaderSnapshot;
  const displayNumber = doc?.docNumber || doc?.draftNumber || '—';

  return (
    <KineticModalShell
      isOpen={isOpen && Boolean(rawDoc)}
      onClose={onClose}
      maxWidthClass={formatMode === '80mm' ? 'max-w-md print:max-w-none' : 'max-w-4xl print:max-w-none'}
      scrimClassName="bg-black/70 print:p-0 print:bg-white print:static print:z-auto"
      ariaLabel={titleMeta.fr}
    >
      {doc && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          data-sq="panel"
          data-sq-border="solid"
          className="w-full bg-white text-black flex flex-col max-h-[94vh] overflow-hidden print:max-h-none print:border-none"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-stone-900 text-white shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <span className="tabular-nums t-cap font-semibold px-2 py-0.5 rounded bg-white/10">
                {displayNumber}
              </span>
              <span className="t-cap text-white/75">
                {doc.status === 'Draft'
                  ? isAr ? 'مسودة غير مرقمة' : isEn ? 'Provisional Draft' : 'Brouillon non numéroté'
                  : isAr ? 'نسخة رسمية' : isEn ? 'Official Document' : 'Pièce officielle'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormatMode('a4')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                  formatMode === 'a4' ? 'bg-white text-black' : 'bg-white/10 text-white/80'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setFormatMode('80mm')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                  formatMode === '80mm' ? 'bg-white text-black' : 'bg-white/10 text-white/80'
                }`}
              >
                80mm
              </button>
              <AtriumButton variant="primary" size="xs" icon={<Printer size={14} />} onClick={handlePrint}>
                {isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer'}
              </AtriumButton>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/75 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-6 sm:p-8 print:p-0 print:overflow-visible bg-white text-black">
            {formatMode === '80mm' ? (
              <div className="mx-auto max-w-[320px] space-y-3 tabular-nums t-cap leading-relaxed">
                <div className="text-center border-b border-dashed border-black/30 pb-2">
                  <div className="t-label font-semibold">{hdr?.companyName || '—'}</div>
                  {hdr?.address && <div className="text-black/70">{hdr.address}</div>}
                  {hdr?.phone && <div className="text-black/70">{hdr.phone}</div>}
                  {hdr?.nif && <div className="text-black/80 font-medium">NIF: {hdr.nif}</div>}
                  {hdr?.rc && <div className="text-black/80">RC: {hdr.rc}</div>}
                </div>
                <div className="border-b border-dashed border-black/30 pb-2 space-y-0.5">
                  <div className="flex justify-between font-semibold">
                    <span>{isAr ? titleMeta.ar : isEn ? titleMeta.en : titleMeta.fr}</span>
                    <span>{displayNumber}</span>
                  </div>
                  <div className="flex justify-between text-black/70">
                    <span>{doc.docDate}</span>
                    <span>{doc.partyName}</span>
                  </div>
                </div>
                <div className="space-y-1 border-b border-dashed border-black/30 pb-2">
                  {doc.items.map((it) => (
                    <div key={it.id} className="flex justify-between gap-2">
                      <span className="truncate">{it.quantity}x {it.description}</span>
                      <span className="font-semibold shrink-0">{formatMoney(centimesToDzd(it.totalTtcCentimes))}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total HT</span>
                    <span>{formatMoney(centimesToDzd(doc.totalHtFinalCentimes))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA</span>
                    <span>{formatMoney(centimesToDzd(doc.totalTvaCentimes))}</span>
                  </div>
                  {doc.timbreFiscalCentimes > 0 && (
                    <div className="flex justify-between">
                      <span>Timbre</span>
                      <span>{formatMoney(centimesToDzd(doc.timbreFiscalCentimes))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold t-label pt-1 border-t border-black/20">
                    <span>NET A PAYER</span>
                    <span>{formatMoney(centimesToDzd(doc.netToPayCentimes))}</span>
                  </div>
                </div>
                {hdr?.footerNote && (
                  <div className="pt-2 border-t border-dashed border-black/30 text-center text-black/65">
                    {hdr.footerNote}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 t-cap">
                <div className="flex justify-between items-start gap-4 border-b-2 border-black/80 pb-4">
                  <div className="space-y-1">
                    {hdr?.logoUrl && (
                      <img src={hdr.logoUrl} alt={hdr.companyName} className="h-10 w-auto object-contain mb-1" />
                    )}
                    <div className="t-dialog font-semibold">{hdr?.companyName || '—'}</div>
                    {hdr?.address && <div className="text-black/70">{hdr.address}</div>}
                    {(hdr?.phone || hdr?.email) && (
                      <div className="text-black/70">
                        {hdr.phone ? `Tél: ${hdr.phone}` : ''}
                        {hdr.phone && hdr.email ? ' · ' : ''}
                        {hdr.email ? hdr.email : ''}
                      </div>
                    )}
                  </div>
                  {(hdr?.rc || hdr?.nif || hdr?.nis || hdr?.ai || hdr?.ribCcp) && (
                    <div className="text-right tabular-nums space-y-0.5 border border-black/15 rounded-lg p-3 bg-stone-50">
                      {hdr.rc && <div><strong>R.C. :</strong> {hdr.rc}</div>}
                      {hdr.nif && <div><strong>N.I.F. :</strong> {hdr.nif}</div>}
                      {hdr.nis && <div><strong>N.I.S. :</strong> {hdr.nis}</div>}
                      {hdr.ai && <div><strong>A.I. :</strong> {hdr.ai}</div>}
                      {hdr.ribCcp && <div><strong>RIB / CCP :</strong> {hdr.ribCcp}</div>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-black/20 rounded-xl p-4 bg-stone-50/50 space-y-1.5">
                    <div className="flex justify-between items-center font-semibold t-label">
                      <span>{titleMeta.fr}</span>
                      <span>{titleMeta.ar}</span>
                    </div>
                    <div className="t-card font-semibold tabular-nums text-[#BF431F]">{displayNumber}</div>
                    <div className="grid grid-cols-2 gap-1 pt-1 tabular-nums">
                      <span className="text-black/60">{isAr ? 'التاريخ:' : 'Date:'}</span>
                      <span className="font-semibold">{doc.docDate}</span>
                      {doc.dueDate && (
                        <>
                          <span className="text-black/60">{isAr ? 'الاستحقاق:' : 'Échéance:'}</span>
                          <span className="font-semibold">{doc.dueDate}</span>
                        </>
                      )}
                      <span className="text-black/60">{isAr ? 'الحالة:' : 'Statut:'}</span>
                      <span className="font-semibold">{doc.status}</span>
                    </div>
                  </div>
                  <div className="border border-black/20 rounded-xl p-4 space-y-1">
                    <div className="text-black/60 font-semibold">{isAr ? 'العميل' : isEn ? 'Bill To' : 'Client / Destinataire'}</div>
                    <div className="t-label font-semibold">{doc.partyName}</div>
                    {doc.partyAddress && <div className="text-black/75">{doc.partyAddress}</div>}
                    {doc.partyNif && <div className="tabular-nums">NIF : {doc.partyNif}</div>}
                    {doc.partyRc && <div className="tabular-nums">RC : {doc.partyRc}</div>}
                    {doc.partyPhone && <div className="tabular-nums">Tél : {doc.partyPhone}</div>}
                  </div>
                </div>

                <div className="border border-black/30 rounded-xl overflow-hidden">
                  <table className="w-full text-left rtl:text-right">
                    <thead className="bg-stone-900 text-white">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">{isAr ? 'البيان' : 'Désignation'}</th>
                        <th className="py-2 px-3 text-right">{isAr ? 'الكمية' : 'Qté'}</th>
                        <th className="py-2 px-3 text-right">{isAr ? 'السعر HT' : 'P.U. HT'}</th>
                        <th className="py-2 px-3 text-right">TVA</th>
                        <th className="py-2 px-3 text-right">{isAr ? 'المبلغ HT' : 'Montant HT'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 tabular-nums">
                      {doc.items.map((it, idx) => (
                        <tr key={it.id}>
                          <td className="py-2 px-3 text-black/60">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium">{it.description}</td>
                          <td className="py-2 px-3 text-right">{it.quantity} {it.unit}</td>
                          <td className="py-2 px-3 text-right">{formatMoney(it.unitPriceHt)}</td>
                          <td className="py-2 px-3 text-right">{it.tvaPercent}%</td>
                          <td className="py-2 px-3 text-right font-semibold">{formatMoney(centimesToDzd(it.totalHtCentimes))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex-1 min-w-[240px] space-y-2 border border-black/15 rounded-xl p-4 bg-stone-50/70">
                    <div>
                      <strong>Arrêtée à la somme de :</strong>{' '}
                      <span className="capitalize font-semibold">{doc.totalsInWordsFr}</span>
                    </div>
                    <div dir="rtl" className="text-right">
                      <strong>أوقفت الفاتورة عند مبلغ :</strong>{' '}
                      <span className="font-semibold">{doc.totalsInWordsAr}</span>
                    </div>
                    {doc.tvaBreakdown.length > 0 && (
                      <div className="pt-2 border-t border-black/10 tabular-nums space-y-0.5">
                        {doc.tvaBreakdown.map((b) => (
                          <div key={b.ratePercent} className="flex justify-between text-black/75">
                            <span>Base TVA {b.ratePercent}% : {formatMoney(centimesToDzd(b.baseHtCentimes))}</span>
                            <span>TVA : {formatMoney(centimesToDzd(b.tvaCentimes))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-72 border border-black/40 rounded-xl overflow-hidden tabular-nums">
                    <div className="flex justify-between px-3 py-2 border-b border-black/10">
                      <span>Total Net HT</span>
                      <span className="font-semibold">{formatMoney(centimesToDzd(doc.totalHtFinalCentimes))}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 border-b border-black/10">
                      <span>Total TVA</span>
                      <span className="font-semibold">{formatMoney(centimesToDzd(doc.totalTvaCentimes))}</span>
                    </div>
                    {doc.timbreFiscalCentimes > 0 && (
                      <div className="flex justify-between px-3 py-2 border-b border-black/10">
                        <span>Timbre fiscal</span>
                        <span className="font-semibold">{formatMoney(centimesToDzd(doc.timbreFiscalCentimes))}</span>
                      </div>
                    )}
                    {doc.guaranteeRetentionCentimes > 0 && (
                      <div className="flex justify-between px-3 py-2 border-b border-black/10">
                        <span>Retenue ({doc.guaranteeRetentionPercent}%)</span>
                        <span className="font-semibold">-{formatMoney(centimesToDzd(doc.guaranteeRetentionCentimes))}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-3 py-2.5 bg-stone-900 text-white font-semibold t-label">
                      <span>Net à Payer</span>
                      <span>{formatMoney(centimesToDzd(doc.netToPayCentimes))}</span>
                    </div>
                  </div>
                </div>

                {hdr?.footerNote && (
                  <p className="text-center text-black/60 pt-2 border-t border-black/10">{hdr.footerNote}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </KineticModalShell>
  );
};
