import React, { useEffect, useState } from 'react';
import {
  X,
  Lock,
  UserCheck,
  Shield,
  KeyRound,
  LogOut,
  Sparkles,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import {
  selectCurrentStaffFromState,
  shallowEqualObjects,
  useAtriumActions,
  useAtriumSelector,
} from '../../services/store';
import { StaffMember } from '../../types/index';
import { t } from '../../utils/i18n';
import {
  createDefaultSecurityPolicy,
  evaluatePinAttemptLockout,
} from '../../utils/rbacEngine';
import { KineticModalShell } from '../ui/kinetic/KineticModalShell';

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
  const { unlockActiveSessionWithPinAnd2fa, logout } = useAtriumActions();
  const {
    currentUser,
    staff,
    language,
    accountId,
    currentBusinessId,
    sessionLockState,
    securityPolicyByBusiness,
    pinAttemptTrackerByBusiness,
  } = useAtriumSelector(
    (s) => ({
      currentUser: s.currentUser,
      staff: selectCurrentStaffFromState(s),
      language: s.language,
      accountId: s.account?.id || '',
      currentBusinessId: s.currentBusinessId,
      sessionLockState: s.sessionLockState,
      securityPolicyByBusiness: s.securityPolicyByBusiness,
      pinAttemptTrackerByBusiness: s.pinAttemptTrackerByBusiness,
    }),
    shallowEqualObjects
  );

  const policy =
    securityPolicyByBusiness?.[currentBusinessId] ||
    createDefaultSecurityPolicy({
      accountId,
      businessId: currentBusinessId,
    });
  const pinTracker = pinAttemptTrackerByBusiness?.[currentBusinessId];
  const isSessionLocked = Boolean(sessionLockState?.isLocked);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const lockStatus = evaluatePinAttemptLockout(
    pinTracker,
    policy.pinLockMaxAttempts,
    policy.pinLockoutSeconds,
    nowMs
  );

  useEffect(() => {
    if (!lockStatus.isLocked) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockStatus.isLocked]);

  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending2faPin, setPending2faPin] = useState<string | null>(null);
  const [pending2faName, setPending2faName] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPinInput('');
      setError(null);
      setPending2faPin(null);
      setPending2faName(null);
      setTotpCode('');
    }
  }, [isOpen]);

  const safeClose = () => {
    if (isSessionLocked) return;
    onClose();
  };

  const attemptPinUnlock = (pin: string) => {
    setNowMs(Date.now());
    const res = unlockActiveSessionWithPinAnd2fa({ pin });
    if (res.success) {
      setPinInput('');
      setError(null);
      setPending2faPin(null);
      setPending2faName(null);
      setTotpCode('');
      onClose();
      return;
    }
    if (res.requires2fa) {
      setPending2faPin(pin);
      setPending2faName(res.matchedUserName || currentUser.fullName);
      setPinInput('');
      setError(null);
      return;
    }
    setError(res.message || t('phase2_sec_pin_invalid', language));
    setTimeout(() => setPinInput(''), 500);
  };

  const handleVerify2faSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2faPin) return;
    const clean = totpCode.trim();
    if (!clean) {
      setError(t('phase2_sec_2fa_enter_code', language));
      return;
    }
    setNowMs(Date.now());
    const res = unlockActiveSessionWithPinAnd2fa({
      pin: pending2faPin,
      totpOrRecoveryCode: clean,
    });
    if (res.success) {
      setPending2faPin(null);
      setPending2faName(null);
      setTotpCode('');
      setError(null);
      onClose();
    } else if (res.locked) {
      setPending2faPin(null);
      setPending2faName(null);
      setTotpCode('');
      setError(res.message || null);
    } else {
      setError(res.message || t('phase2_sec_2fa_invalid_code', language));
    }
  };

  const handleDigit = (digit: string) => {
    if (lockStatus.isLocked || pending2faPin) return;
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setError(null);
      if (next.length === 4) {
        attemptPinUnlock(next);
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
    if (lockStatus.isLocked) return;
    const pin = stf.pinCode || '1234';
    attemptPinUnlock(pin);
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={safeClose}
      closeOnScrimClick={!isSessionLocked}
      closeOnEscape={!isSessionLocked}
      maxWidthClass="max-w-md"
      zIndexClass="z-[9992]"
      scrimClassName="bg-black/72"
      ariaLabel={
        isSessionLocked
          ? t('phase2_sec_session_locked_title', language)
          : t('fast_switch_title_lock', language)
      }
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="relative w-full rounded-[var(--r-panel,28px)] bg-[#262422] [--sq-stroke:url(#sq-spec-dark-pop)] text-white p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)] select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-[var(--s3,12px)] border-b border-white/[0.06]">
          <div className="flex items-center gap-[var(--s3,12px)]">
            <div
              data-sq="tile"
              data-sq-border="solid"
              className="w-[var(--tile,40px)] h-[var(--tile,40px)] rounded-[var(--r-tile,12px)] bg-[#2E1E19] [--sq-stroke:url(#sq-spec-dark-ctl)] flex items-center justify-center text-[var(--brand-on-dark,#FF8F63)] shrink-0"
            >
              {pending2faPin ? (
                <KeyRound size={20} strokeWidth={1.75} />
              ) : (
                <Lock size={20} strokeWidth={1.75} />
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="t-dialog font-medium text-white">
                {pending2faPin
                  ? t('phase2_sec_2fa_prompt_title', language)
                  : isSessionLocked
                  ? t('phase2_sec_session_locked_title', language)
                  : t('fast_switch_title_lock', language)}
              </h3>
              {isSessionLocked && (
                <span className="t-cap text-[var(--brand-on-dark,#FF8F63)]">
                  {sessionLockState?.lockedReason === 'idle_timeout'
                    ? t('phase2_sec_locked_idle_reason', language)
                    : t('phase2_sec_locked_manual_reason', language)}
                </span>
              )}
            </div>
          </div>
          {!isSessionLocked && (
            <button
              type="button"
              onClick={safeClose}
              className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full bg-[#2B2825] border-0 text-[var(--text-dark-2,#A99E92)] hover:bg-[#36322E] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* PIN Lockout Alert */}
        {lockStatus.isLocked && (
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-[var(--s3,12px)] rounded-[var(--r-card,16px)] bg-rose-950/60 [--sq-stroke:rgba(244,63,94,0.45)] flex items-center gap-[var(--s3,12px)] text-rose-200 t-small"
          >
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-semibold text-white">
                {t('phase2_sec_pin_lockout_banner', language)}
              </span>
              <span className="tabular-nums text-rose-300">
                {t('phase2_sec_pin_lockout_wait', language)} {lockStatus.remainingSeconds}s
              </span>
            </div>
          </div>
        )}

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

        {pending2faPin ? (
          <form onSubmit={handleVerify2faSubmit} className="flex flex-col gap-[var(--s3,12px)]">
            <div className="p-[var(--s3,12px)] rounded-[var(--r-card,16px)] bg-[#22201E] border border-white/[0.08] flex flex-col gap-[var(--s2,8px)]">
              <div className="flex items-center gap-[var(--s2,8px)] text-[var(--brand-on-dark,#FF8F63)] t-small font-medium">
                <Shield size={15} />
                <span>
                  {pending2faName} — {t('phase2_sec_2fa_prompt_desc', language)}
                </span>
              </div>
              <input
                type="text"
                autoFocus
                value={totpCode}
                onChange={(e) => {
                  setTotpCode(e.target.value);
                  setError(null);
                }}
                placeholder="123456 / ABCD-EFGH"
                className="w-full h-[var(--btn-h,40px)] px-[var(--s3,12px)] rounded-[var(--r-ctl,12px)] bg-[#191716] border border-white/15 text-white t-label tabular-nums tracking-widest focus:outline-none focus:border-[#d4522f]"
              />
            </div>

            {error && (
              <div className="text-center text-rose-400 t-small">{error}</div>
            )}

            <div className="flex items-center justify-between gap-[var(--s2,8px)]">
              <button
                type="button"
                onClick={() => {
                  setPending2faPin(null);
                  setPending2faName(null);
                  setTotpCode('');
                  setError(null);
                }}
                className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] rounded-[var(--r-ctl,12px)] bg-[#2B2825] text-white/85 hover:text-white t-btn flex items-center gap-[var(--s2,8px)] cursor-pointer"
              >
                <ArrowLeft size={15} />
                <span>{t('phase2_sec_back_to_pin', language)}</span>
              </button>

              <button
                type="submit"
                disabled={lockStatus.isLocked}
                className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] rounded-[var(--r-ctl,12px)] bg-[var(--brand-fill,#C9461F)] hover:opacity-95 text-white t-btn cursor-pointer disabled:opacity-40"
              >
                {t('phase2_sec_2fa_verify_btn', language)}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Staff Quick Tap Switch List (hidden when session locked if PIN required) */}
            {!isSessionLocked && (
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
                        disabled={lockStatus.isLocked}
                        onClick={() => handleQuickSelectStaff(stf)}
                        className={`w-full px-[var(--row-inset,12px)] py-[var(--s2,8px)] rounded-[var(--r-row,12px)] text-start flex items-center justify-between gap-[var(--s3,12px)] transition-colors cursor-pointer disabled:opacity-40 ${
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
            )}

            {/* 4-Digit Quick PIN Pad */}
            <div className="pt-[var(--s3,12px)] border-t border-white/[0.08] flex flex-col items-center gap-[var(--s3,12px)]">
              <div className="w-full flex items-center justify-between t-label">
                <span className="text-[var(--text-dark-2,#A99E92)]">
                  {t('fast_switch_pin_label', language)}
                </span>
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
                    disabled={lockStatus.isLocked}
                    onClick={() => {
                      if (btn === 'C') handleClear();
                      else if (btn === '⌫') handleBack();
                      else handleDigit(btn);
                    }}
                    className="h-[var(--btn-h,40px)] rounded-[var(--r-ctl,12px)] bg-[#2B2825] [--sq-stroke:url(#sq-spec-dark-ctl)] text-white t-btn font-semibold tabular-nums hover:bg-[#36322E] hover:[--sq-stroke:url(#sq-spec-dark-ctl-hover)] active:scale-95 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center"
                  >
                    {btn === 'C' ? t('fast_switch_pin_clear', language) : btn}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions Footer */}
        <div className="pt-[var(--s3,12px)] border-t border-white/[0.06] flex items-center justify-between gap-[var(--s3,12px)]">
          {!isSessionLocked ? (
            <button
              type="button"
              onClick={() => {
                safeClose();
                onOpenOnboarding();
              }}
              className="t-btn text-[var(--brand-on-dark,#FF8F63)] hover:underline flex items-center gap-[var(--s1,4px)] cursor-pointer"
            >
              <Sparkles size={16} strokeWidth={1.5} />
              <span>{t('onboarding_title', language)}</span>
            </button>
          ) : (
            <span className="t-cap text-[var(--text-dark-2,#A99E92)]">
              {t('phase2_sec_locked_footer_hint', language)}
            </span>
          )}

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
    </KineticModalShell>
  );
};

