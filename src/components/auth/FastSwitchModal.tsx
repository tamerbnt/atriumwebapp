import React, { useState } from 'react';
import {
  X,
  Lock,
  UserCheck,
  Shield,
  KeyRound,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { StaffMember } from '../../types/index';
import { t } from '../../utils/i18n';

interface FastSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOnboarding: () => void;
}

export const FastSwitchModal: React.FC<FastSwitchModalProps> = ({
  isOpen,
  onClose,
  onOpenOnboarding,
}) => {
  const { currentUser, staff, loginWithPin, logout, language } = useAtriumStore();

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next.length === 4) {
        const res = loginWithPin(next);
        if (res.success) {
          setPinInput('');
          setError(null);
          onClose();
        } else {
          setError(
            language === 'ar'
              ? 'رمز PIN غير صحيح. (جرب 1234 للمالك، 5566 للمدير، 9988 للكاشير)'
              : language === 'fr'
              ? 'Code PIN invalide. (Ex. 1234 Propriétaire, 5566 Gérant, 9988 Caissier)'
              : (res.message || 'Invalid PIN code. (Try 1234 for Owner, 5566 for Manager, 9988 for Cashier)')
          );
          setTimeout(() => setPinInput(''), 600);
        }
      }
    }
  };

  const handleClear = () => {
    setPinInput('');
    setError(null);
  };

  const handleBack = () => {
    setPinInput((p) => p.slice(0, -1));
    setError(null);
  };

  const handleQuickSelectStaff = (stf: StaffMember) => {
    setSelectedStaff(stf);
    if (stf.pinCode) {
      setPinInput(stf.pinCode);
      const res = loginWithPin(stf.pinCode);
      if (res.success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--s4,16px)] bg-black/75 backdrop-blur-md overflow-y-auto select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md sq-elev-pop">
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="relative w-full rounded-[var(--r-panel,28px)] bg-[#262422] [--sq-stroke:url(#sq-spec-dark-pop)] text-white p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-[var(--s3,12px)] border-b border-white/[0.06]">
            <div className="flex items-center gap-[var(--s3,12px)]">
              <div
                data-sq="tile"
                data-sq-border="solid"
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] rounded-[var(--r-tile,12px)] bg-[#2E1E19] [--sq-stroke:url(#sq-spec-dark-ctl)] flex items-center justify-center text-[var(--brand-on-dark,#FF8F63)] shrink-0"
              >
                <Lock size={20} strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-[var(--name-sub-gap,2px)]">
                <h3 className="t-dialog font-medium text-white">{t('fast_switch_title_lock', language)}</h3>
                <p className="t-cap text-[var(--text-dark-2,#A99E92)]">
                  {t('fast_switch_operator_security', language)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full bg-[#2B2825] border-0 text-[var(--text-dark-2,#A99E92)] hover:bg-[#36322E] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Current Active Operator Banner */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-[var(--s4,16px)] rounded-[var(--r-card,16px)] bg-[#22201E] [--sq-stroke:var(--sq-stroke-obsidian)] flex items-center justify-between gap-[var(--s3,12px)]"
          >
            <div className="flex items-center gap-[var(--av-to-text,12px)]">
              <div className="w-[var(--av-table,40px)] h-[var(--av-table,40px)] rounded-full bg-[var(--brand-fill,#C9461F)] text-white flex items-center justify-center t-label font-semibold shadow-xs shrink-0">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="flex flex-col gap-[var(--name-sub-gap,2px)]">
                <div className="flex items-center gap-[var(--s2,8px)]">
                  <span className="t-label text-white">{currentUser.fullName}</span>
                  <span className="inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] t-small text-[var(--brand-on-dark,#FF8F63)] bg-[#d4522f]/15 rounded-full">
                    {currentUser.role}
                  </span>
                </div>
                <span className="t-cap text-[var(--text-dark-2,#A99E92)]">{currentUser.email}</span>
              </div>
            </div>
            <span className="t-small text-emerald-400 flex items-center gap-[var(--s1,4px)] shrink-0">
              <UserCheck size={16} strokeWidth={1.5} /> {t('fast_switch_current_op', language)}
            </span>
          </div>

          {/* Staff Quick Tap Switch List */}
          <div className="flex flex-col gap-[var(--s2,8px)]">
            <div className="t-small text-[var(--text-dark-2,#A99E92)]">
              {t('fast_switch_switch_to', language)}
            </div>
            <div className="flex flex-col gap-[var(--s2,8px)] max-h-40 overflow-y-auto pe-[var(--s1,4px)]">
              {staff.map((stf) => {
                const isCurrent = currentUser.id === stf.id;
                return (
                  <button
                    key={stf.id}
                    type="button"
                    data-sq="row"
                    data-sq-border="solid"
                    onClick={() => handleQuickSelectStaff(stf)}
                    className={`w-full px-[var(--row-inset,12px)] py-[var(--s2,8px)] rounded-[var(--r-row,12px)] text-start flex items-center justify-between gap-[var(--s3,12px)] transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#2E1E19] [--sq-stroke:#d4522f] text-white font-medium'
                        : 'bg-[#22201E] [--sq-stroke:url(#sq-spec-dark-ctl)] text-white/85 hover:bg-[#2B2825] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-[var(--av-to-text,12px)] min-w-0">
                      <div className="w-[var(--av-list,32px)] h-[var(--av-list,32px)] rounded-full bg-[#2B2825] text-white/90 flex items-center justify-center t-small font-semibold shrink-0">
                        {stf.fullName.charAt(0)}
                      </div>
                      <div className="flex flex-col gap-[var(--name-sub-gap,2px)] truncate">
                        <div className="t-label truncate">{stf.fullName}</div>
                        <div className="t-cap text-[var(--text-dark-2,#A99E92)]">{stf.role}</div>
                      </div>
                    </div>
                    <div className="t-small text-[var(--brand-on-dark,#FF8F63)] tabular-nums shrink-0">
                      PIN: {stf.pinCode || '1234'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Digit Quick PIN Pad */}
          <div className="pt-[var(--s3,12px)] border-t border-white/[0.08] flex flex-col items-center gap-[var(--s3,12px)]">
            <div className="w-full flex items-center justify-between t-label">
              <span className="text-[var(--text-dark-2,#A99E92)]">{t('fast_switch_pin_label', language)}</span>
              <div className="flex items-center gap-[var(--s2,8px)]">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-[var(--s3,12px)] h-[var(--s3,12px)] rounded-full transition-all ${
                      pinInput.length > idx
                        ? 'bg-[var(--brand-fill,#C9461F)] scale-110'
                        : 'bg-[#332F2B]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="text-center text-rose-400 t-small animate-in fade-in">
                {error}
              </div>
            )}

            <div className="w-full max-w-[220px] grid grid-cols-3 gap-[var(--s2,8px)]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  data-sq="ctl"
                  data-sq-border="solid"
                  onClick={() => {
                    if (btn === 'C') handleClear();
                    else if (btn === '⌫') handleBack();
                    else handleDigit(btn);
                  }}
                  className="h-[var(--btn-h,40px)] rounded-[var(--r-ctl,12px)] bg-[#2B2825] [--sq-stroke:url(#sq-spec-dark-ctl)] text-white t-btn font-semibold tabular-nums hover:bg-[#36322E] hover:[--sq-stroke:url(#sq-spec-dark-ctl-hover)] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                >
                  {btn === 'C' ? t('fast_switch_pin_clear', language) : btn}
                </button>
              ))}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-[var(--s3,12px)] border-t border-white/[0.06] flex items-center justify-between gap-[var(--s3,12px)]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOnboarding();
              }}
              className="t-btn text-[var(--brand-on-dark,#FF8F63)] hover:underline flex items-center gap-[var(--s1,4px)] cursor-pointer"
            >
              <Sparkles size={16} strokeWidth={1.5} />
              <span>{t('onboarding_title', language)}</span>
            </button>

            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={() => {
                logout();
                onClose();
              }}
              className="h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] rounded-[var(--r-ctl-sm,10px)] bg-[#2B2825] hover:bg-rose-950/50 text-white/85 hover:text-rose-400 t-btn flex items-center gap-[var(--btn-sm-gap,6px)] transition-colors cursor-pointer"
            >
              <LogOut size={16} strokeWidth={1.5} />
              <span>{t('topbar_logout', language)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
