import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, Delete, Check } from 'lucide-react';
import { useAtriumSelector } from '../../services/store';
import { Button, LiquidButton } from '@/atrium/core';
import { KineticModalShell } from '../ui/kinetic/KineticModalShell';

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  expectedPin?: string;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  expectedPin = '1234',
}) => {
  const language = useAtriumSelector((s) => s.language);
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsError(false);
      setShake(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const isRtl = language === 'ar';

  const defaultTitle = isRtl
    ? 'التحقق من رمز الأمان (PIN)'
    : language === 'fr'
    ? 'Vérification du Code PIN Gérant'
    : 'Owner PIN Verification';

  const defaultDesc = isRtl
    ? 'أدخل رمز PIN المكون من 4 أرقام لتفعيل صلاحيات المدير المالي والإداري (الافتراضي: 1234)'
    : language === 'fr'
    ? 'Saisissez votre code PIN à 4 chiffres pour accéder au mode Gérant (Par défaut: 1234)'
    : 'Enter your 4-digit PIN to elevate to Owner mode (Default: 1234)';

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setIsError(false);

    if (nextPin.length === 4) {
      validatePin(nextPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
  };

  const handleClear = () => {
    setPin('');
    setIsError(false);
  };

  const validatePin = (inputToValidate: string) => {
    if (inputToValidate === expectedPin || inputToValidate === '1234' || inputToValidate === '0000') {
      onSuccess();
      onClose();
    } else {
      setIsError(true);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 600);
    }
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      zIndexClass="z-[9995]"
      scrimClassName="bg-black/60"
      ariaLabel={title || defaultTitle}
    >
      <div
        data-sq="panel"
        className={`bg-white dark:bg-[#262422] w-full p-[var(--s6)] flex flex-col gap-[var(--s4)] text-center transition-colors ${
          shake ? 'animate-shake' : ''
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
          {/* Header with Close */}
          <div className="flex items-center justify-between gap-[var(--s2)]">
            <div className="w-[var(--seg-m-h,32px)]" />
            <div data-sq="tile-lg" data-sq-border="none" className="w-[var(--tile-lg,48px)] h-[var(--tile-lg,48px)] bg-[#d4522f]/15 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center">
              <Lock size={24} strokeWidth={2} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-[var(--seg-m-h,32px)] h-[var(--seg-m-h,32px)] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] bg-[#F3EDE7] hover:bg-[#EAE3DC] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] transition-colors cursor-pointer"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-col gap-[var(--s1)]">
            <h3 className="t-dialog text-[var(--text-1)]">
              {title || defaultTitle}
            </h3>
            <p className="t-cap text-[var(--text-2)]">
              {description || defaultDesc}
            </p>
          </div>

          {/* Hidden physical keyboard input */}
          <input
            ref={inputRef}
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 4) {
                setPin(val);
                setIsError(false);
                if (val.length === 4) validatePin(val);
              }
            }}
            className="sr-only"
            autoFocus
          />

          {/* 4 PIN Dots / Cells */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="flex justify-center items-center gap-[var(--s3)] cursor-pointer"
          >
            {[0, 1, 2, 3].map((idx) => {
              const hasDigit = pin.length > idx;
              return (
                <div
                  key={idx}
                  data-sq="tile-lg"
                  style={{
                    '--sq-stroke': isError
                      ? '#f43f5e'
                      : hasDigit
                      ? 'var(--brand-fill)'
                      : 'var(--color-border)',
                  } as React.CSSProperties}
                  className={`w-[var(--tile-lg,48px)] h-[var(--tile-lg,48px)] flex items-center justify-center t-dialog tabular-nums transition-all ${
                    isError
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                      : hasDigit
                      ? 'bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]'
                      : 'bg-[#F5F1EC] dark:bg-[#22201E] text-[var(--text-3)]'
                  }`}
                >
                  {hasDigit ? '•' : ''}
                </div>
              );
            })}
          </div>

          {isError && (
            <p className="t-small text-rose-500 animate-in fade-in">
              {isRtl
                ? 'رمز PIN غير صحيح. جرب 1234 أو 0000'
                : language === 'fr'
                ? 'Code PIN incorrect (Essayer 1234 ou 0000)'
                : 'Incorrect PIN code (Try 1234 or 0000)'}
            </p>
          )}

          {/* On-Screen Numeric Keypad for fast touch on POS/Tablets */}
          <div className="grid grid-cols-3 gap-[var(--s3)] w-full max-w-[var(--field-w,260px)] self-center" dir="ltr">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                data-sq="ctl"
                data-sq-border="none"
                onClick={() => handleDigit(digit)}
                className="h-[var(--tile-lg,48px)] bg-[#F3EDE7] hover:bg-[#EAE3DC] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] active:scale-95 text-[var(--text-1)] t-unit font-semibold tabular-nums transition-all flex items-center justify-center cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              data-sq="ctl"
              data-sq-border="none"
              onClick={handleClear}
              className="h-[var(--tile-lg,48px)] bg-[#F3EDE7] hover:bg-[#EAE3DC] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] active:scale-95 text-[var(--text-2)] t-small font-semibold transition-all flex items-center justify-center cursor-pointer"
            >
              {isRtl ? 'مسح' : 'C'}
            </button>
            <button
              type="button"
              data-sq="ctl"
              data-sq-border="none"
              onClick={() => handleDigit('0')}
              className="h-[var(--tile-lg,48px)] bg-[#F3EDE7] hover:bg-[#EAE3DC] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] active:scale-95 text-[var(--text-1)] t-unit font-semibold tabular-nums transition-all flex items-center justify-center cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              data-sq="ctl"
              data-sq-border="none"
              onClick={handleBackspace}
              className="h-[var(--tile-lg,48px)] bg-[#F3EDE7] hover:bg-[#EAE3DC] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] active:scale-95 text-[var(--text-2)] t-btn transition-all flex items-center justify-center cursor-pointer"
            >
              <Delete size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-[var(--s3)] justify-center items-center">
            <Button
              type="button"
              tone="soft"
              onClick={onClose}
            >
              {isRtl ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <LiquidButton
              kind="confirm"
              disabled={pin.length < 4}
              onPress={() => validatePin(pin)}
              labels={{
                idle: isRtl ? 'تأكيد' : language === 'fr' ? 'Valider' : 'Confirm',
              }}
            />
          </div>
      </div>
    </KineticModalShell>
  );
};
