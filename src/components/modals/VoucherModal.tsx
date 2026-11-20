import React, { useState } from 'react';
import { Shield, Sparkles, CheckCircle2, AlertCircle, KeyRound, Copy } from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';
import { AtriumButton } from '../ui/AtriumButton';
import { validateVoucherCode } from '../../utils/rules';
import { t } from '../../utils/i18n';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ isOpen, onClose }) => {
  const { subscription, redeemVoucher, language, networkMode } = useAtriumStore();
  const [code, setCode] = useState('');
  const [resultMessage, setResultMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const sampleVouchers = [
    {
      label: language === 'ar' ? 'باقة المبتدئ مدى الحياة' : language === 'fr' ? 'Starter Perpétuel' : 'Starter Lifetime',
      code: 'ATR-STARTER-LIFE-A1B2-C3D4',
    },
    {
      label: language === 'ar' ? 'باقة المحترف مدى الحياة (موصى به)' : language === 'fr' ? 'Pro Perpétuel (Recommandé)' : 'Pro Lifetime (Recommended)',
      code: 'ATR-PRO-LIFE-E5F6-G7H8',
    },
    {
      label: language === 'ar' ? 'باقة المؤسسات غير المحدودة' : language === 'fr' ? 'Enterprise Illimité' : 'Enterprise Perpetual',
      code: 'ATR-ENTERPRISE-LIFE-9988-7766',
    },
  ];

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    setResultMessage(null);

    const res = redeemVoucher(code);
    if (res.success) {
      setResultMessage({ success: true, text: res.message });
      setCode('');
    } else {
      setResultMessage({ success: false, text: res.message });
      showToast({
        type: 'error',
        title: t('voucher_invalid_title', language),
        message: res.message || t('voucher_invalid_msg', language),
      });
    }
  };

  const handleApplyPreset = (presetCode: string) => {
    setCode(presetCode);
    setResultMessage(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={networkMode === 'force_skeleton'}
      title={t('voucher_title', language)}
      subtitle={t('voucher_subtitle', language)}
      maxWidth="md"
    >
      <div className="flex flex-col gap-[var(--s5)]">
        {/* Active Entitlement Status */}
        <div className="sq-elev-card">
          <div data-sq="card" className="p-[var(--s4)] bg-[#F3EDE7] dark:bg-neutral-800/60 flex items-center justify-between gap-[var(--s3)]">
            <div className="flex flex-col gap-[var(--s1)]">
              <span className="t-cap font-medium text-[var(--text-2)]">
                {t('settings_license_entitlement', language)}
              </span>
              <div className="t-label font-semibold text-[var(--text-1)] tabular-nums">
                {subscription.plan.name} {language === 'ar' ? `الرتبة #${subscription.plan.tierRank}` : language === 'fr' ? `Niveau #${subscription.plan.tierRank}` : `Tier Rank #${subscription.plan.tierRank}`}
              </div>
              <span className="t-cap font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                {subscription.isLifetime
                  ? t('settings_lifetime_badge', language)
                  : t('settings_trial_badge', language)}
              </span>
            </div>
            <div data-sq="tile" data-sq-border="none" className="w-[var(--tile,40px)] h-[var(--tile,40px)] bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center shrink-0">
              <Shield size={20} strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* Form input */}
        <form onSubmit={handleRedeem} className="flex flex-col gap-[var(--s4)]">
          <div className="flex flex-col gap-[var(--s2)]">
            <LabelInput
              field="Voucher Code"
              label={language === 'ar' ? 'أدخل رمز القسيمة (20 خانة)' : language === 'fr' ? 'Saisissez le code voucher à 20 chiffres' : 'Enter 20-digit Voucher Code'}
              value={code}
              onChange={(val) => setCode(val.toUpperCase())}
              width="100%"
              height={44}
              corner={12}
              required
            />
            <span className="t-cap text-[var(--text-2)] px-[var(--s1)]">
              Format: ATR-[STARTER|PRO|ENTERPRISE]-LIFE-XXXX-XXXX
            </span>
          </div>

          <AtriumButton
            type="submit"
            variant="primary"
            size="md"
            icon={<Sparkles size={16} strokeWidth={1.5} />}
            className="w-full"
          >
            {t('voucher_redeem_btn', language)}
          </AtriumButton>
        </form>

        {/* Feedback Alert */}
        {resultMessage && (
          <div
            data-sq="card"
            style={{
              '--sq-stroke': resultMessage.success ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.4)',
            } as React.CSSProperties}
            className={`p-[var(--s4)] t-cap font-semibold flex items-start gap-[var(--s3)] ${
              resultMessage.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
            }`}
          >
            {resultMessage.success ? (
              <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle size={16} strokeWidth={1.5} className="shrink-0 text-rose-500" />
            )}
            <span>{resultMessage.text}</span>
          </div>
        )}

        {/* Preset Sample Vouchers */}
        <div className="pt-[var(--s3)] border-t border-[var(--color-border)] flex flex-col gap-[var(--s2)]">
          <span className="t-small font-medium text-[var(--text-2)]">
            {t('voucher_preset_title', language)}
          </span>
          <div className="flex flex-col gap-[var(--s2)]">
            {sampleVouchers.map((v) => (
              <div key={v.code} className="sq-elev-card">
                <button
                  type="button"
                  data-sq="card"
                  onClick={() => handleApplyPreset(v.code)}
                  className="w-full text-left rtl:text-right p-[var(--s3)] bg-white dark:bg-neutral-800/50 flex items-center justify-between gap-[var(--s3)] group cursor-pointer transition-colors"
                >
                  <div className="flex flex-col gap-[var(--s1)]">
                    <div className="t-small font-semibold text-[var(--text-1)]">
                      {v.label}
                    </div>
                    <span className="t-cap tabular-nums text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] font-semibold">
                      {v.code}
                    </span>
                  </div>
                  <span className="t-cap font-semibold text-[var(--text-2)] group-hover:text-[var(--brand-text)] dark:group-hover:text-[var(--brand-on-dark)] shrink-0">
                    {t('voucher_fill_code', language)}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
