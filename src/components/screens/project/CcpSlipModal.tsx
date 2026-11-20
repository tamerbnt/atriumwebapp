import React from 'react';
import { PMCcpSlip } from '../../../types/index';
import { Printer, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';

interface CcpSlipModalProps {
  isOpen: boolean;
  slip: PMCcpSlip | null;
  onClose: () => void;
  onMarkPrinted?: (slipId: string) => void;
}

export const CcpSlipModal: React.FC<CcpSlipModalProps> = ({
  isOpen,
  slip,
  onClose,
  onMarkPrinted,
}) => {
  const { t, language, isRtl } = useTranslation();
  if (!isOpen || !slip) return null;

  const handlePrint = () => {
    if (onMarkPrinted && slip) {
      onMarkPrinted(slip.id);
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="sq-elev-pop max-w-3xl w-full">
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between bg-[#FBF8F5] dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div data-sq="ctl-sm" className="w-8 h-8 bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small">
              SFP01
            </div>
            <div>
              <h3 className="font-semibold text-black dark:text-white t-label">
                {t('pm_ccp_modal_title')}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AtriumButton
              size="xs"
              variant="primary"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              {t('common_print')} (A4)
            </AtriumButton>
            <button
              onClick={onClose}
              data-sq="ctl-sm"
              className="p-2 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Official Postal Slip Document Canvas */}
        <div className="p-6 overflow-y-auto bg-[#F3EDE7]/70 dark:bg-neutral-950/40 flex justify-center">
          <div className="sq-elev-card w-full max-w-2xl print:shadow-none">
            <div
              data-sq="card"
              data-sq-border="dashed"
              className="w-full bg-amber-50/70 dark:bg-neutral-900 [--sq-stroke:#fcd34d] dark:[--sq-stroke:#404040] p-6 text-black font-sans print:border-solid print:border-black"
            >
            {/* Header Stamp */}
            <div className="flex justify-between items-start border-b-2 border-neutral-800 dark:border-neutral-300 pb-3 mb-4">
              <div>
                <p className="font-semibold t-small text-black/75">
                  {t('pm_ccp_republic')}
                </p>
                <p className="t-small font-semibold text-black">
                  {t('pm_ccp_ministry')}
                </p>
                <p className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] mt-0.5">
                  {t('pm_ccp_operations')}
                </p>
              </div>
              <div className="text-right">
                <span
                  data-sq="check"
                  data-sq-border="solid"
                  className="inline-block [--sq-stroke:#262626] dark:[--sq-stroke:#e5e5e5] px-3 py-1 tabular-nums font-semibold t-small"
                >
                  SFP 01
                </span>
                <p className="t-cap text-black/55 mt-1">{t('pm_ccp_edition')}</p>
              </div>
            </div>

            {/* Financial Amount & CCP Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div
                data-sq="ctl"
                data-sq-border="solid"
                className="col-span-2 p-3 bg-white dark:bg-neutral-800 [--sq-stroke:#D5CBBF] dark:[--sq-stroke:#404040]"
              >
                <span className="t-small font-semibold text-black/55 block">
                  {t('pm_ccp_beneficiary_name')}
                </span>
                <span className="font-semibold t-card text-black block">
                  {slip.beneficiaryName}
                </span>
                <span className="t-cap text-black/55 block mt-0.5">
                  {t('pm_compta_wilaya_label')} {slip.wilayaName}
                </span>
              </div>
              <div
                data-sq="ctl"
                data-sq-border="solid"
                className="p-3 bg-white dark:bg-neutral-800 [--sq-stroke:#D5CBBF] dark:[--sq-stroke:#404040] text-right"
              >
                <span className="t-small font-semibold text-black/55 block">
                  {t('pm_ccp_amount_digits')}
                </span>
                <span className="tabular-nums font-semibold t-pod text-emerald-700">
                  {slip.amountDzd.toLocaleString()} DA
                </span>
              </div>
            </div>

            {/* CCP Account Box */}
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="p-3 bg-white dark:bg-neutral-800 [--sq-stroke:#D5CBBF] dark:[--sq-stroke:#404040] mb-4 flex items-center justify-between"
            >
              <div>
                <span className="t-small font-semibold text-black/55 block">
                  {t('pm_ccp_account_number')}
                </span>
                <span className="tabular-nums font-semibold t-dialog text-black">
                  {slip.ccpNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="t-small font-semibold text-black/55 block">
                  {t('pm_ccp_key')}
                </span>
                <span className="tabular-nums font-semibold t-dialog text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                  {slip.ccpKey}
                </span>
              </div>
            </div>

            {/* Legal Amount in Words: French */}
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="mb-3 p-3 bg-white/80 dark:bg-neutral-800/80 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#404040]"
            >
              <span className="t-small font-semibold text-black/55 block mb-0.5">
                {t('pm_ccp_words_fr')}
              </span>
              <p className="italic t-body text-black leading-snug">
                « {slip.amountInWordsFr} »
              </p>
            </div>

            {/* Legal Amount in Words: Arabic */}
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="mb-4 p-3 bg-white/80 dark:bg-neutral-800/80 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#404040] text-right"
              dir="rtl"
            >
              <span className="t-small font-semibold text-black/55 block mb-0.5">
                {t('pm_ccp_words_ar')}
              </span>
              <p className="t-label font-semibold text-black leading-snug">
                « {slip.amountInWordsAr} »
              </p>
            </div>

            {/* Transaction Reference & Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#D5CBBF] dark:border-neutral-700 t-cap">
              <div>
                <span className="t-cap text-black/55 block">{t('pm_ccp_purpose')}</span>
                <p className="font-medium text-black">{slip.transactionReference}</p>
                <div className="mt-4 pt-4 border-t border-[#E6DED6] dark:border-neutral-700">
                  <span className="t-cap text-black/55 block">{t('pm_ccp_signature_order')}</span>
                  <div className="h-12 flex items-center gap-2 text-black/55 t-cap italic">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t('pm_ccp_signed_dg')}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="t-cap text-black/55 block">{t('pm_ccp_postal_reserved')}</span>
                <div
                  data-sq="ctl-sm"
                  data-sq-border="solid"
                  className="h-24 [--sq-stroke:#D5CBBF] dark:[--sq-stroke:#404040] bg-white/50 dark:bg-neutral-900/50 flex items-center justify-center t-cap text-black/55 mt-1"
                >
                  {t('pm_ccp_post_stamp_box')}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between t-cap text-black/55 dark:text-white/55 bg-[#FBF8F5] dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('pm_ccp_compliance_footer')}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 t-small font-medium text-black/70 hover:text-black dark:text-white/75 dark:hover:text-white transition-colors"
          >
            {t('common_close')}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
