import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, Delete, Check } from 'lucide-react';
import { useAtriumStore } from '../../services/store';

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
  const { language } = useAtriumStore();
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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        className={`bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full p-6 text-center transition-all ${
          shake ? 'animate-shake' : 'animate-in fade-in zoom-in-95 duration-150'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between mb-2">
          <div className="w-8" />
          <div className="w-12 h-12 rounded-2xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center mx-auto shadow-2xs">
            <Lock size={22} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
          {title || defaultTitle}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
          {description || defaultDesc}
        </p>

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
          className="flex justify-center items-center gap-3 mb-6 cursor-pointer"
        >
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-mono font-bold transition-all border ${
                  isError
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                    : hasDigit
                    ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A] shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400'
                }`}
              >
                {hasDigit ? '•' : ''}
              </div>
            );
          })}
        </div>

        {isError && (
          <p className="text-xs font-semibold text-rose-500 mb-4 animate-in fade-in">
            {isRtl
              ? 'رمز PIN غير صحيح. جرب 1234 أو 0000'
              : language === 'fr'
              ? 'Code PIN incorrect (Essayer 1234 ou 0000)'
              : 'Incorrect PIN code (Try 1234 or 0000)'}
          </p>
        )}

        {/* On-Screen Numeric Keypad for fast touch on POS/Tablets */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto mb-4" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-100 text-lg font-bold font-mono transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-95 text-neutral-500 dark:text-neutral-400 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
          >
            {isRtl ? 'مسح' : 'C'}
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-100 text-lg font-bold font-mono transition-all flex items-center justify-center cursor-pointer shadow-2xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-95 text-neutral-500 dark:text-neutral-400 text-sm font-semibold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
          >
            <Delete size={18} />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2.5 justify-center">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            {isRtl ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => validatePin(pin)}
            disabled={pin.length < 4}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#C4785A] hover:bg-[#b3684a] text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check size={14} />
            <span>{isRtl ? 'تأكيد' : language === 'fr' ? 'Valider' : 'Confirm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
