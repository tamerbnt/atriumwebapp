import React from 'react';
import { Landmark, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import type { UnifiedPayment } from '../../../types/index';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { useAtriumActions } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';

interface UnifiedPaymentsLedgerPanelProps {
  payments: UnifiedPayment[];
  title?: string;
}

export const UnifiedPaymentsLedgerPanel: React.FC<UnifiedPaymentsLedgerPanelProps> = ({
  payments,
  title,
}) => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { transitionChequeStatus } = useAtriumActions();

  if (payments.length === 0) return null;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      data-sq="card"
      data-sq-border="solid"
      className="bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
          <h3 className="t-label font-semibold">
            {title || (isAr ? 'سجل المدفوعات والشيكات' : isEn ? 'Unified Payments & Instruments Ledger' : 'Journal Unifié des Règlements & Effets')}
          </h3>
        </div>
        <span className="t-cap text-black/60 dark:text-white/60 tabular-nums">
          {payments.length}
        </span>
      </div>

      <div className="divide-y divide-[var(--atr-divider)]">
        {payments.slice(0, 12).map((pay) => {
          const isInstrument = pay.method === 'cheque' || pay.method === 'traite';
          const canDeposit = isInstrument && pay.instrumentStatus === 'received';
          const canClear = isInstrument && (pay.instrumentStatus === 'received' || pay.instrumentStatus === 'deposited');
          const canBounce = isInstrument && pay.instrumentStatus !== 'bounced';
          return (
            <div key={pay.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3 t-cap">
              <div className="min-w-0">
                <div className="font-semibold text-black dark:text-white flex items-center gap-2">
                  <span className="tabular-nums">{pay.paymentNumber}</span>
                  <span>·</span>
                  <span className="truncate">{pay.partyName}</span>
                </div>
                <div className="text-black/60 dark:text-white/60 tabular-nums">
                  {pay.paymentDate} · {pay.method.toUpperCase()}
                  {pay.instrumentNumber ? ` #${pay.instrumentNumber}` : ''}
                  {pay.instrumentBank ? ` · ${pay.instrumentBank}` : ''}
                  {pay.instrumentStatus ? ` · ${pay.instrumentStatus}` : ` · ${pay.status}`}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="tabular-nums font-semibold t-label">
                  {formatMoney(centimesToDzd(pay.amountCentimes))}
                </span>
                {canDeposit && (
                  <AtriumButton
                    type="button"
                    variant="secondary"
                    size="xs"
                    icon={<ArrowUpRight size={13} />}
                    onClick={() => transitionChequeStatus(pay.id, 'deposited')}
                  >
                    {isAr ? 'إيداع' : isEn ? 'Deposit' : 'Remettre'}
                  </AtriumButton>
                )}
                {canClear && (
                  <AtriumButton
                    type="button"
                    variant="primary"
                    size="xs"
                    icon={<CheckCircle2 size={13} />}
                    onClick={() => transitionChequeStatus(pay.id, 'cleared')}
                  >
                    {isAr ? 'تحصيل' : isEn ? 'Clear' : 'Encaisser'}
                  </AtriumButton>
                )}
                {canBounce && (
                  <AtriumButton
                    type="button"
                    variant="danger"
                    size="xs"
                    icon={<AlertTriangle size={13} />}
                    onClick={() => transitionChequeStatus(pay.id, 'bounced', isAr ? 'رصيد غير كافٍ' : 'Impayé')}
                  >
                    {isAr ? 'مرفوض' : isEn ? 'Bounce' : 'Impayé'}
                  </AtriumButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
