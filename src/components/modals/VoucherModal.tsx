import React, { useState } from 'react';
import { Shield, Sparkles, CheckCircle2, AlertCircle, KeyRound, Copy } from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';
import { validateVoucherCode } from '../../utils/rules';
import { t } from '../../utils/i18n';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ isOpen, onClose }) => {
  const { subscription, redeemVoucher, showToast, language } = useAtriumStore();
  const [code, setCode] = useState('');
  const [resultMessage, setResultMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const sampleVouchers = [
    { label: 'Starter Lifetime', code: 'ATR-STARTER-LIFE-A1B2-C3D4' },
    { label: 'Pro Lifetime (Recommended)', code: 'ATR-PRO-LIFE-E5F6-G7H8' },
    { label: 'Enterprise Perpetual', code: 'ATR-ENTERPRISE-LIFE-9988-7766' },
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
        title: 'Voucher Invalid',
        message: res.message || 'Please verify the 20-digit code and try again.',
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
      title={t('voucher_title', language)}
      subtitle={t('voucher_subtitle', language)}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Active Entitlement Status */}
        <div className="p-4 rounded-[20px] bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              {t('settings_license_entitlement', language)}
            </span>
            <div className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
              {subscription.plan.name} Tier Rank #{subscription.plan.tierRank}
            </div>
            <span className="text-xs text-[#C4785A] font-semibold">
              {subscription.isLifetime
                ? t('settings_lifetime_badge', language)
                : t('settings_trial_badge', language)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center shrink-0">
            <Shield size={20} />
          </div>
        </div>

        {/* Form input */}
        <form onSubmit={handleRedeem} className="space-y-4">
          <div className="space-y-1.5">
            <LabelInput
              field="Voucher Code"
              label={language === 'ar' ? 'أدخل رمز القسيمة (20 خانة)' : language === 'fr' ? 'Saisissez le code voucher à 20 chiffres' : 'Enter 20-digit Voucher Code'}
              value={code}
              onChange={(val) => setCode(val.toUpperCase())}
              width="100%"
              height={44}
              corner={14}
              required
            />
            <span className="text-[11px] text-neutral-400 block px-1">
              Format: ATR-[STARTER|PRO|ENTERPRISE]-LIFE-XXXX-XXXX
            </span>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: 'var(--color-accent)',
              borderRadius: 'var(--radius-button)',
            }}
            className="w-full h-11 text-xs font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <Sparkles size={16} />
            <span>{t('voucher_redeem_btn', language)}</span>
          </button>
        </form>

        {/* Feedback Alert */}
        {resultMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 border ${
              resultMessage.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200'
            }`}
          >
            {resultMessage.success ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-500" />
            )}
            <span>{resultMessage.text}</span>
          </div>
        )}

        {/* Preset Sample Vouchers */}
        <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-800/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
            Test Codes (Instant Lifetime Demo Activation)
          </span>
          <div className="space-y-1.5">
            {sampleVouchers.map((v) => (
              <button
                key={v.code}
                type="button"
                onClick={() => handleApplyPreset(v.code)}
                className="w-full text-left p-3 rounded-2xl border border-[#E9EEF0] dark:border-neutral-800 hover:border-[#D5DFE3] bg-white dark:bg-neutral-800/50 flex items-center justify-between group cursor-pointer transition-colors shadow-2xs"
              >
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">
                    {v.label}
                  </div>
                  <span className="text-[11px] font-mono text-[#C4785A] font-semibold">
                    {v.code}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-neutral-400 group-hover:text-[#C4785A] uppercase tracking-wider">
                  Fill Code
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
