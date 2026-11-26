import React, { useMemo, useState } from 'react';
import { Barcode, Printer, X } from 'lucide-react';
import { useTranslation } from '../../../utils/useTranslation';
import { buildDeterministicBarcodeBars, formatCentimesDzd } from '../../../utils/wmsEngine';
import { KineticModalShell } from '../../ui/kinetic';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';

export interface BarcodeLabelTarget {
  code: string;
  productName: string;
  sku?: string;
  lotNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
  unitCostCentimes?: number;
  priceDzd?: number;
}

interface WmsBarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: BarcodeLabelTarget | null;
}

export const WmsBarcodePrintModal: React.FC<WmsBarcodePrintModalProps> = ({
  isOpen,
  onClose,
  target,
}) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const [formatMode, setFormatMode] = useState<'80mm' | 'a4_grid'>('a4_grid');
  const [copies, setCopies] = useState<number>(6);

  const bars = useMemo(() => {
    if (!target) return [];
    return buildDeterministicBarcodeBars(target.code || target.sku || target.lotNumber || '000000');
  }, [target]);

  const maxBarX = useMemo(() => {
    if (bars.length === 0) return 120;
    const last = bars[bars.length - 1];
    return Math.max(120, last.x + last.w + 4);
  }, [bars]);

  const labelList = useMemo(() => {
    const n = Math.min(24, Math.max(1, Number.isFinite(copies) ? Math.round(copies) : 1));
    return Array.from({ length: n }, (_, idx) => idx);
  }, [copies]);

  if (!target) return null;

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-3xl print:max-w-none"
      scrimClassName="bg-black/70 print:p-0 print:bg-white print:static print:z-auto"
      ariaLabel={t('phase2_wms_barcode_title', L('Print Barcode Labels', 'Impression Étiquettes Codes-Barres', 'طباعة ملصقات الباركود'))}
    >
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        data-sq="panel"
        data-sq-border="solid"
        className="w-full bg-white text-black flex flex-col max-h-[90vh] overflow-hidden print:max-h-none print:border-none"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-stone-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Barcode size={18} />
            <span className="t-small font-semibold truncate">
              {t('phase2_wms_barcode_title', L('Print Barcode Labels', 'Impression Étiquettes Codes-Barres', 'طباعة ملصقات الباركود'))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AtriumButton
              variant="primary"
              size="xs"
              icon={<Printer size={14} />}
              onClick={() => window.print()}
            >
              {L('Print', 'Imprimer', 'طباعة')}
            </AtriumButton>
            <button
              type="button"
              onClick={onClose}
              aria-label={L('Close', 'Fermer', 'إغلاق')}
              className="p-1.5 text-white/75 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <AtriumButton
              variant={formatMode === 'a4_grid' ? 'primary' : 'secondary'}
              size="xs"
              onClick={() => setFormatMode('a4_grid')}
            >
              {L('A4 Label Sheet', 'Planche A4', 'ورقة A4')}
            </AtriumButton>
            <AtriumButton
              variant={formatMode === '80mm' ? 'primary' : 'secondary'}
              size="xs"
              onClick={() => setFormatMode('80mm')}
            >
              {L('Thermal 80mm', 'Thermique 80mm', 'حراري 80 مم')}
            </AtriumButton>
          </div>
          <div className="w-36">
            <LabelInput
              field="copies"
              label={L('Labels Count', 'Nb étiquettes', 'عدد الملصقات')}
              type="number"
              min={1}
              max={24}
              value={String(copies)}
              onChange={(val) => setCopies(Number(val || 1))}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 bg-white text-black print:p-0 print:overflow-visible">
          <div
            className={
              formatMode === '80mm'
                ? 'mx-auto max-w-[300px] space-y-3'
                : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'
            }
          >
            {labelList.map((idx) => (
              <div
                key={idx}
                className="border border-stone-300 rounded-[var(--r-card,10px)] p-3 flex flex-col justify-between bg-white break-inside-avoid"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-stone-900 truncate">
                      {target.productName}
                    </div>
                    <div className="text-[11px] font-mono text-stone-600 truncate">
                      {target.sku ? `SKU: ${target.sku}` : ''}
                      {target.lotNumber ? ` · LOT: ${target.lotNumber}` : ''}
                      {target.serialNumber ? ` · SN: ${target.serialNumber}` : ''}
                    </div>
                  </div>
                  {(target.priceDzd != null || target.unitCostCentimes != null) && (
                    <span className="font-bold text-xs font-mono text-stone-900 shrink-0">
                      {target.priceDzd != null
                        ? `${target.priceDzd.toLocaleString('fr-DZ')} DA`
                        : formatCentimesDzd(target.unitCostCentimes || 0)}
                    </span>
                  )}
                </div>

                <div className="my-2 flex flex-col items-center">
                  <svg
                    viewBox={`0 0 ${maxBarX} 36`}
                    className="w-full h-10"
                    role="img"
                    aria-label={target.code}
                  >
                    {bars.map((b, bIdx) => (
                      <rect
                        key={bIdx}
                        x={b.x}
                        y={2}
                        width={b.w}
                        height={32}
                        fill="#111111"
                      />
                    ))}
                  </svg>
                  <div className="text-[11px] font-mono tracking-widest text-stone-800 mt-0.5">
                    {target.code}
                  </div>
                </div>

                {target.expiryDate && (
                  <div className="text-[10px] font-mono text-stone-600 flex justify-between border-t border-stone-200 pt-1">
                    <span>{L('EXP', 'EXP', 'انتهاء')}:</span>
                    <span className="font-semibold">{target.expiryDate}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </KineticModalShell>
  );
};
