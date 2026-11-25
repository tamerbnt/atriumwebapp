import React, { useState } from 'react';
import { Copy, Check, Printer, Share2, X, MessageSquare } from 'lucide-react';
import { AtriumButton } from '../ui/AtriumButton';

export interface ShareArtifactModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'fr' | 'en' | 'ar';
  title: string;
  subtitle?: string;
  shareText: string;
  onOpenPrintPdf?: () => void;
}

export const ShareArtifactModal: React.FC<ShareArtifactModalProps> = ({
  isOpen,
  onClose,
  language = 'fr',
  title,
  subtitle,
  shareText,
  onOpenPrintPdf,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  if (!isOpen) return null;

  const isRtl = language === 'ar';
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(shareText);
      setCopied(true);
      setShareNote(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareNote(
        language === 'ar'
          ? 'تعذر النسخ التلقائي — يرجى تحديد النص ونسخه يدوياً.'
          : language === 'fr'
          ? 'Copie automatique impossible — sélectionnez le texte ci-dessus manuellement.'
          : 'Clipboard access denied — select and copy the summary manually.'
      );
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: shareText });
        return;
      } catch {
        // User cancelled or share unsupported in iframe
      }
    }
    await handleCopy();
    setShareNote(
      language === 'ar'
        ? 'تم نسخ الملخص للحافظة للمشاركة.'
        : language === 'fr'
        ? 'Résumé copié dans le presse-papiers pour partage.'
        : 'Summary copied to clipboard for sharing.'
    );
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-[540px] rounded-2xl bg-[var(--atr-card,#fff)] dark:bg-[#22201E] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-black/[0.07] dark:border-white/[0.08]">
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

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-[#F7F3EE] dark:bg-[#191715] border border-black/[0.08] dark:border-white/[0.08] p-4">
            <pre
              className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--text-1)] dark:text-white/90 m-0"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {shareText}
            </pre>
          </div>

          {shareNote && (
            <p className="text-xs text-[#096b40] dark:text-[#5BE3A3]">{shareNote}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <AtriumButton
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied
                  ? language === 'ar'
                    ? 'تم النسخ'
                    : language === 'fr'
                    ? 'Copié'
                    : 'Copied'
                  : language === 'ar'
                  ? 'نسخ الملخص'
                  : language === 'fr'
                  ? 'Copier'
                  : 'Copy'}
              </AtriumButton>
              <AtriumButton
                variant="secondary"
                size="sm"
                onClick={handleNativeShare}
                icon={<Share2 className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'مشاركة' : language === 'fr' ? 'Partager' : 'Share'}
              </AtriumButton>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#25D366]/12 text-[#0b6e35] dark:text-[#6ee7a8] text-xs font-semibold hover:bg-[#25D366]/20 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>

            {onOpenPrintPdf && (
              <AtriumButton
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenPrintPdf();
                }}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                {language === 'ar'
                  ? 'نسخة للطباعة / PDF'
                  : language === 'fr'
                  ? 'PDF / Imprimer'
                  : 'PDF / Print'}
              </AtriumButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
