import React, { useState } from 'react';
import { FileText, Copy, Download, Check, X, Building2, ShieldCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { MerchantRemittanceBatch } from '../../../types';
import { formatCcpSfp01Line } from '../../../utils/logisticsRules';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';

interface AlgeriePosteSfp01ModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: MerchantRemittanceBatch[];
}

export const AlgeriePosteSfp01Modal: React.FC<AlgeriePosteSfp01ModalProps> = ({
  isOpen,
  onClose,
  batches,
}) => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate ASCII lines for each batch
  const lines = batches.map((b) =>
    formatCcpSfp01Line({
      centerCode: '20000',
      ccpAccount: b.ccpAccount,
      ccpKey: b.ccpKey,
      amountCentimes: Math.round(b.netPayoutDzd * 100),
      merchantName: b.merchantName,
    })
  );

  const fullText = lines.join('\n');
  const totalNet = batches.reduce((acc, b) => acc + b.netPayoutDzd, 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast(
      isAr ? 'تم نسخ ملف التحويل البريدي إلى الحافظة' : 'Texte SFP 01 copié dans le presse-papier',
      'success'
    );
  };

  const handleDownload = () => {
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SFP01_ALGERIE_POSTE_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(
      isAr ? 'تم تحميل ملف SFP 01 بنجاح' : 'Fichier SFP 01 Algérie Poste téléchargé',
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Building2 size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                {isAr ? 'تصدير ملف بريد الجزائر CCP SFP 01 / B1' : 'Export Fichier Algérie Poste CCP (SFP 01 / B1)'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr
                  ? 'ملف نصي موحد بدقة 57 حرفاً مع مفتاح 97 الحسابي المعتمد في المراكز البريدية'
                  : 'Format ASCII standardisé à largeur fixe (57 cols) avec contrôle algorithmique Clé 97'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Batch Overview Banner */}
        <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-500 block">
              {isAr ? 'المتاجر المشمولة بالدفعة' : 'Commerçants dans le lot'}
            </span>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {batches.length} {isAr ? 'تحويلات تجارية' : 'virements marchands'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-neutral-500 block">
              {isAr ? 'إجمالي مستحقات الدفعة' : 'Total Net à Verser'}
            </span>
            <span className="text-lg font-bold font-mono text-[#C4785A]">
              {formatMoney(totalNet, language)}
            </span>
          </div>
        </div>

        {/* ASCII Code Area */}
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
            <span>Structure: Centre(5) + Compte(10) + Clé(2) + Centimes(12) + Nom(30)</span>
            <span className="font-mono">{lines.length} lignes</span>
          </div>
          <pre className="p-4 rounded-xl bg-neutral-950 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre selection:bg-emerald-900 border border-neutral-800 leading-relaxed">
            {fullText}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          >
            {copied ? (isAr ? 'تم النسخ!' : 'Copié !') : isAr ? 'نسخ النص' : 'Copier ASCII'}
          </AtriumButton>

          <div className="flex items-center gap-2">
            <AtriumButton variant="ghost" size="sm" onClick={onClose}>
              {isAr ? 'إغلاق' : 'Fermer'}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={handleDownload}
              icon={<Download size={14} />}
            >
              {isAr ? 'تحميل ملف TXT' : 'Télécharger Fichier .txt'}
            </AtriumButton>
          </div>
        </div>
      </div>
    </div>
  );
};
