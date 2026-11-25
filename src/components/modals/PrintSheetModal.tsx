import React, { useState } from 'react';
import { Printer, X, Copy, Check, AlertTriangle, Download } from 'lucide-react';
import { AtriumButton } from '../ui/AtriumButton';

export interface PrintSheetSection {
  heading?: string;
  rows: Array<{ label: string; value: string }>;
}

export interface PrintSheetPage {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  watermarkText?: string;
  tableHeaders?: string[];
  tableRows?: Array<string[]>;
  sections?: PrintSheetSection[];
  footerNote?: string;
  signatureLeft?: string;
  signatureRight?: string;
}

export interface PrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'fr' | 'en' | 'ar';
  format?: 'a4' | '80mm' | 'label';
  title: string;
  subtitle?: string;
  pages: PrintSheetPage[];
  warningBanner?: string;
  onPrintTriggered?: () => void;
  onExportCsv?: () => void;
}

export const PrintSheetModal: React.FC<PrintSheetModalProps> = ({
  isOpen,
  onClose,
  language = 'fr',
  format = 'a4',
  title,
  subtitle,
  pages,
  warningBanner,
  onPrintTriggered,
  onExportCsv,
}) => {
  const [printFallbackHint, setPrintFallbackHint] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  const isRtl = language === 'ar';

  const handlePrint = () => {
    try {
      if (onPrintTriggered) onPrintTriggered();
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      } else {
        setPrintFallbackHint(true);
      }
    } catch {
      setPrintFallbackHint(true);
    }
  };

  const handleCopyPlainText = async () => {
    const plain = pages
      .map((p) => {
        const lines: string[] = [p.title];
        if (p.subtitle) lines.push(p.subtitle);
        if (p.watermarkText) lines.push(`[${p.watermarkText}]`);
        p.sections?.forEach((sec) => {
          if (sec.heading) lines.push(`--- ${sec.heading} ---`);
          sec.rows.forEach((r) => lines.push(`${r.label}: ${r.value}`));
        });
        if (p.tableHeaders && p.tableRows) {
          lines.push(p.tableHeaders.join(' | '));
          p.tableRows.forEach((r) => lines.push(r.join(' | ')));
        }
        if (p.footerNote) lines.push(p.footerNote);
        return lines.join('\n');
      })
      .join('\n\n====================\n\n');

    try {
      await navigator.clipboard?.writeText(plain);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      setPrintFallbackHint(true);
    }
  };

  const widthClass =
    format === '80mm'
      ? 'max-w-[380px]'
      : format === 'label'
      ? 'max-w-[460px]'
      : 'max-w-[820px]';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 print:static print:inset-auto print:bg-white print:p-0 print:block"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`w-full ${widthClass} max-h-[90vh] flex flex-col rounded-2xl bg-[var(--atr-card,#fff)] dark:bg-[#22201E] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden print:max-w-none print:max-h-none print:rounded-none print:border-0 print:shadow-none print:bg-white`}>
        {/* Header bar (hidden on print) */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-black/[0.07] dark:border-white/[0.08] print:hidden">
          <div className="min-w-0">
            <h2 className="t-h3 text-[var(--text-1)] dark:text-white truncate">{title}</h2>
            {subtitle && (
              <p className="t-small text-[var(--text-2)] dark:text-white/60 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close'}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-2)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning / Popup-blocked recovery banner */}
        {(warningBanner || printFallbackHint) && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/35 border-b border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs print:hidden">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {warningBanner && <p>{warningBanner}</p>}
              {printFallbackHint && (
                <p>
                  {language === 'ar'
                    ? 'لم يتمكن المتصفح من فتح نافذة الطباعة تلقائياً. استخدم Ctrl+P أو انسخ النص من الأسفل.'
                    : language === 'fr'
                    ? "L'impression système est bloquée ou indisponible dans cet environnement. Utilisez Ctrl+P ou copiez le document ci-dessous."
                    : 'Print dialog was blocked or unavailable. Use Ctrl+P / Cmd+P or copy the formatted text below.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FAF7F4] dark:bg-[#191715] print:overflow-visible print:p-0 print:bg-white">
          {pages.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#22201E] p-8 text-center text-sm text-[var(--text-2)]">
              {language === 'ar'
                ? 'لا توجد عناصر صالحة للطباعة.'
                : language === 'fr'
                ? 'Aucun élément valide sélectionné pour impression.'
                : 'No valid records selected for printing.'}
            </div>
          ) : (
            pages.map((page, idx) => (
              <article
                key={page.id}
                className={`relative rounded-xl bg-white text-[#1B1917] border border-black/10 shadow-xs p-5 space-y-4 print:rounded-none print:border-0 print:shadow-none ${
                  idx < pages.length - 1 ? 'print:break-after-page' : ''
                }`}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {page.watermarkText && (
                  <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.11]">
                    <span className="text-4xl font-black tracking-[0.22em] uppercase -rotate-12 text-[#c0283d] border-4 border-[#c0283d] px-4 py-1.5 rounded-lg">
                      {page.watermarkText}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#1B1917]">{page.title}</h3>
                    {page.subtitle && (
                      <p className="text-xs text-[#5E5852] mt-0.5">{page.subtitle}</p>
                    )}
                  </div>
                  {page.badgeText && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F3EDE7] text-[#1B1917] tabular-nums">
                      {page.badgeText}
                    </span>
                  )}
                </div>

                {page.sections?.map((sec, sIdx) => (
                  <div key={`${page.id}_sec_${sIdx}`} className="space-y-2">
                    {sec.heading && (
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F6861]">
                        {sec.heading}
                      </h4>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      {sec.rows.map((r, rIdx) => (
                        <div
                          key={`${page.id}_row_${sIdx}_${rIdx}`}
                          className="flex items-baseline justify-between gap-2 py-1 border-b border-black/[0.06]"
                        >
                          <span className="text-[#6F6861]">{r.label}</span>
                          <span className="font-semibold text-[#1B1917] text-end tabular-nums">
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {page.tableHeaders && page.tableRows && page.tableRows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-black/20 bg-[#F7F3EE]">
                          {page.tableHeaders.map((h, hIdx) => (
                            <th key={hIdx} className="py-2 px-2 text-start font-bold text-[#1B1917]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {page.tableRows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-black/[0.07]">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2 px-2 text-[#1B1917] tabular-nums">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {(page.signatureLeft || page.signatureRight) && (
                  <div className="grid grid-cols-2 gap-6 pt-4 text-xs text-[#5E5852]">
                    <div className="border-t border-dashed border-black/25 pt-2">
                      {page.signatureLeft || ''}
                    </div>
                    <div className="border-t border-dashed border-black/25 pt-2 text-end">
                      {page.signatureRight || ''}
                    </div>
                  </div>
                )}

                {page.footerNote && (
                  <p className="text-[11px] text-[#6F6861] pt-2 border-t border-black/10">
                    {page.footerNote}
                  </p>
                )}
              </article>
            ))
          )}
        </div>

        {/* Footer actions (hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-black/[0.07] dark:border-white/[0.08] print:hidden">
          <div className="flex items-center gap-2">
            <AtriumButton
              variant="secondary"
              size="sm"
              onClick={handleCopyPlainText}
              icon={copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedAll
                ? language === 'ar'
                  ? 'تم النسخ'
                  : language === 'fr'
                  ? 'Copié'
                  : 'Copied'
                : language === 'ar'
                ? 'نسخ النص'
                : language === 'fr'
                ? 'Copier texte'
                : 'Copy text'}
            </AtriumButton>
            {onExportCsv && (
              <AtriumButton
                variant="secondary"
                size="sm"
                onClick={onExportCsv}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                CSV
              </AtriumButton>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AtriumButton variant="ghost" size="sm" onClick={onClose}>
              {language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close'}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="sm"
              disabled={pages.length === 0}
              onClick={handlePrint}
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              {language === 'ar'
                ? 'طباعة / PDF'
                : language === 'fr'
                ? 'Imprimer / PDF'
                : 'Print / PDF'}
            </AtriumButton>
          </div>
        </div>
      </div>
    </div>
  );
};
