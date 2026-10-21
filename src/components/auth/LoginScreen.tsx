import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  KeyRound,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Hash,
  Globe,
  Check,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { authService } from '../../lib/supabase/services/authService';
import { t } from '../../utils/i18n';

import { FiveCubesLogo } from './AtriumMonolith';
import { LabelInput } from '../ui/LabelInput';

interface LoginScreenProps {
  onStartOnboarding: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onStartOnboarding }) => {
  const { login, loginWithPin, staff, language, setLanguage, setSystemDefaultLanguage, isLanguageAuto } = useAtriumStore();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('mehdisamih79@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const res = await authService.signInWithGoogle();
      if (res?.error) {
        setError(res.error.message || 'Google Sign-in failed. You can sign in using Fast Owner Access or check the setup guide.');
      }
    } catch (err: any) {
      setError(err?.message || 'Google Sign-in encountered an issue.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFastOwnerLogin = (ownerEmail: string = 'mehdisamih79@gmail.com') => {
    login(ownerEmail, 'owner2026');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your work email');
      return;
    }
    const res = login(email, password);
    if (!res.success) {
      setError('Login failed. Please check credentials.');
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto-submit 4th digit
        const res = loginWithPin(newPin);
        if (!res.success) {
          setError(res.message || 'Invalid PIN code');
          setTimeout(() => setPin(''), 600);
        }
      }
    }
  };

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handlePinClear = () => {
    setPin('');
    setError(null);
  };

  const quickFillStaff = (staffEmail: string, staffPin: string) => {
    setEmail(staffEmail);
    setPin(staffPin);
    setError(null);
    if (authMode === 'pin') {
      const res = loginWithPin(staffPin);
      if (!res.success) {
        setError(res.message || 'Invalid PIN');
      }
    } else {
      login(staffEmail, 'demo123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-[#121110] via-[#1A1715] to-[#26211C] overflow-y-auto select-none">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C4785A]/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Language Switcher in Top Right */}
      <div className="absolute top-5 right-5 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="h-9 px-3 rounded-full bg-neutral-900/90 border border-neutral-700/80 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-800 transition-colors cursor-pointer shadow-lg backdrop-blur-md"
          >
            <Globe size={14} className="text-[#C4785A]" />
            <span className="uppercase text-[11px] font-bold">
              {language === 'ar' ? 'العربية' : language === 'fr' ? 'Français' : 'English'}
            </span>
            {isLanguageAuto && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={t('topbar_auto_detected', language)} />
            )}
          </button>

          {langMenuOpen && (
            <div className={`absolute top-full mt-2 w-48 rounded-2xl bg-[#1E1B19] border border-neutral-700 shadow-2xl p-1.5 space-y-1 z-30 ${language === 'ar' ? 'left-0' : 'right-0'}`}>
              <button
                type="button"
                onClick={() => {
                  setSystemDefaultLanguage();
                  setLangMenuOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  isLanguageAuto ? 'bg-[#C4785A]/20 text-[#C4785A] font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>🌐 {t('settings_system_default', language)}</span>
                {isLanguageAuto && <Check size={13} />}
              </button>
              <div className="h-px bg-neutral-800 my-1" />
              <button
                type="button"
                onClick={() => {
                  setLanguage('en', false);
                  setLangMenuOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  !isLanguageAuto && language === 'en' ? 'bg-[#C4785A]/20 text-[#C4785A] font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>🇺🇸 English (US)</span>
                {!isLanguageAuto && language === 'en' && <Check size={13} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('fr', false);
                  setLangMenuOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  !isLanguageAuto && language === 'fr' ? 'bg-[#C4785A]/20 text-[#C4785A] font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>🇫🇷 Français</span>
                {!isLanguageAuto && language === 'fr' && <Check size={13} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('ar', false);
                  setLangMenuOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  !isLanguageAuto && language === 'ar' ? 'bg-[#C4785A]/20 text-[#C4785A] font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>🇩🇿 العربية (RTL)</span>
                {!isLanguageAuto && language === 'ar' && <Check size={13} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 480px Centered Auth Card */}
      <div className="relative w-full max-w-[480px] rounded-[28px] bg-[#1E1B19]/95 border border-[#3E3832]/80 shadow-2xl p-7 sm:p-9 text-white backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Atrium Brand Emblem */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#2A2420] border border-[#483B33] flex items-center justify-center p-2.5 mb-3.5 shadow-md">
            <FiveCubesLogo size={28} cubeColor="#C4785A" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">ATRIUM</h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {t('login_subtitle', language)}
          </p>
        </div>

        {/* Primary Google SSO Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full h-11 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer mb-2 disabled:opacity-75"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isGoogleLoading ? '...' : t('login_with_google', language)}</span>
        </button>

        {/* 1-Click Fast Owner Sign-in */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => handleFastOwnerLogin('mehdisamih79@gmail.com')}
            className="w-full h-9 px-3 rounded-xl bg-[#2A2420] hover:bg-[#342D28] border border-[#483B33] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Instant sign-in without Google OAuth"
          >
            <Sparkles size={13} className="text-[#C4785A]" />
            <span>{t('login_fast_access', language)}</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-3">
          <div className="flex-grow border-t border-neutral-800"></div>
          <span className="flex-shrink mx-3 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
            {language === 'ar' ? 'أو الدخول بكلمة المرور / رمز PIN' : language === 'fr' ? 'ou connexion par mot de passe / code PIN' : 'or sign in with password / PIN'}
          </span>
          <div className="flex-grow border-t border-neutral-800"></div>
        </div>

        {/* Auth Mode Toggle Pill */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-900/80 border border-neutral-800 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              authMode === 'password'
                ? 'bg-[#C4785A] text-white shadow-xs font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Mail size={13} />
            <span>{t('login_with_email', language)}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('pin');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              authMode === 'pin'
                ? 'bg-[#C4785A] text-white shadow-xs font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Hash size={13} />
            <span>{t('login_with_pin', language)}</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
            <ShieldCheck size={14} className="text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PASSWORD FORM */}
        {authMode === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div className="flex justify-center w-full">
              <LabelInput
                field="Email"
                label={language === 'ar' ? 'البريد الإلكتروني للعمل' : language === 'fr' ? 'Email professionnel' : 'Work Email'}
                value={email}
                onChange={setEmail}
                type="email"
                width={360}
                height={50}
                corner={16}
              />
            </div>

            <div className="flex flex-col items-center w-full">
              <div className="flex items-center justify-between w-full max-w-[360px] px-1 mb-1">
                <span className="text-[11px] text-neutral-400">
                  {language === 'ar' ? 'بيانات الاعتماد الأمنية' : language === 'fr' ? 'Identifiants de sécurité' : 'Security Credential'}
                </span>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-[11px] text-[#C4785A] hover:underline cursor-pointer"
                >
                  {language === 'ar' ? 'نسيت كلمة المرور؟' : language === 'fr' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                </button>
              </div>
              <LabelInput
                field="Password"
                label={language === 'ar' ? 'كلمة المرور' : language === 'fr' ? 'Mot de passe' : 'Password'}
                value={password}
                onChange={setPassword}
                type="password"
                width={360}
                height={50}
                corner={16}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-neutral-700 text-[#C4785A] focus:ring-0"
                />
                <span>{language === 'ar' ? 'تذكر هذا الجهاز' : language === 'fr' ? 'Mémoriser ce terminal' : 'Remember this terminal'}</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] active:scale-[0.99] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer mt-2"
            >
              <span>{language === 'ar' ? 'تسجيل الدخول إلى Atrium' : language === 'fr' ? 'Se connecter à Atrium' : 'Sign In to Atrium'}</span>
              <ArrowRight size={14} className={language === 'ar' ? 'rotate-180' : ''} />
            </button>
          </form>
        ) : (
          /* TERMINAL PIN PAD FORM */
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-neutral-400">
                {language === 'ar'
                  ? 'أدخل رمز PIN المكون من 4 أرقام لفتح هذا الجهاز'
                  : language === 'fr'
                  ? 'Entrez votre code PIN à 4 chiffres pour déverrouiller ce terminal'
                  : 'Enter your 4-digit staff PIN to unlock this terminal'}
              </p>
              {/* PIN Bubbles Display */}
              <div className="flex items-center justify-center gap-3 my-3">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all ${
                        isFilled
                          ? 'bg-[#C4785A] scale-110 shadow-xs'
                          : 'bg-neutral-800 border border-neutral-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* 3x4 Pin Pad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') handlePinClear();
                    else if (btn === '⌫') handlePinDelete();
                    else handlePinDigit(btn);
                  }}
                  className={`h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all cursor-pointer ${
                    btn === 'C'
                      ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                      : btn === '⌫'
                      ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                      : 'bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 hover:border-neutral-700 active:scale-95'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>

            <p className="text-center text-[11px] text-neutral-500 font-mono">
              {language === 'ar'
                ? 'الرموز الافتراضية: 1234 (المالك)، 5566 (المدير)، 9988 (الكاشير)'
                : language === 'fr'
                ? 'Codes PIN par défaut : 1234 (Propriétaire), 5566 (Manager), 9988 (Caissier)'
                : 'Default PINs: 1234 (Owner), 5566 (Manager), 9988 (Cashier)'}
            </p>
          </div>
        )}

        {/* Demo Fast Login Pills */}
        <div className="mt-6 pt-5 border-t border-neutral-800/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center justify-between">
            <span>{language === 'ar' ? 'دخول تجريبي سريع' : language === 'fr' ? 'Connexion démo rapide' : 'Fast Demo Sign-In'}</span>
            <span className="text-[9px] text-[#C4785A]">{language === 'ar' ? 'اضغط للتجربة' : language === 'fr' ? 'Cliquer pour tester' : 'Click to test'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-left">
            <button
              type="button"
              onClick={() => quickFillStaff('bentouatitamer@gmail.com', '1234')}
              className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-[#C4785A]/50 transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-[#C4785A]">Tamer</div>
              <div className="text-[10px] text-neutral-400">{language === 'ar' ? 'المالك (1234)' : language === 'fr' ? 'Propriétaire (1234)' : 'Owner (1234)'}</div>
            </button>
            <button
              type="button"
              onClick={() => quickFillStaff('samir.manager@atrium.dz', '5566')}
              className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-[#C4785A]/50 transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-[#C4785A]">Samir</div>
              <div className="text-[10px] text-neutral-400">{language === 'ar' ? 'المدير (5566)' : language === 'fr' ? 'Manager (5566)' : 'Manager (5566)'}</div>
            </button>
            <button
              type="button"
              onClick={() => quickFillStaff('meriem.cashier@atrium.dz', '9988')}
              className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-[#C4785A]/50 transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-[#C4785A]">Meriem</div>
              <div className="text-[10px] text-neutral-400">{language === 'ar' ? 'الكاشير (9988)' : language === 'fr' ? 'Caissier (9988)' : 'Cashier (9988)'}</div>
            </button>
          </div>
        </div>

        {/* Onboarding Link Section (Section 11.2) */}
        <div className="mt-6 text-center pt-3">
          <p className="text-xs text-neutral-400">
            {language === 'ar'
              ? 'هل تؤسس نشاطاً تجارياً أو فرعاً جديداً؟'
              : language === 'fr'
              ? 'Vous configurez une nouvelle entreprise ou succursale ?'
              : 'Setting up a new business or branch?'}
          </p>
          <button
            type="button"
            onClick={onStartOnboarding}
            className="mt-2 text-xs font-bold text-[#C4785A] hover:text-[#d68565] flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
          >
            <Sparkles size={13} />
            <span>{language === 'ar' ? 'بدء معالج التهيئة متعدد المراحل' : language === 'fr' ? 'Lancer l\'assistant de configuration' : 'Start Multi-Step Business Onboarding'}</span>
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1B19] border border-neutral-700 p-6 text-white space-y-4">
            <h3 className="text-base font-bold">
              {language === 'ar' ? 'استرجاع كلمة المرور' : language === 'fr' ? 'Récupération du mot de passe' : 'Password Recovery'}
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {language === 'ar'
                ? 'لأمان المحطات وأجهزة سطح المكتب، يتم إرسال رموز الاسترجاع إلى البريد الإلكتروني المعتمد أو عبر القسيمة الرئيسية.'
                : language === 'fr'
                ? 'Pour la sécurité locale des postes Atrium, les codes de récupération sont transmis à l\'adresse de l\'administrateur ou via le bon maître.'
                : 'For local security in Atrium desktop & web terminals, password recovery codes are routed to the registered account owner email or master cash voucher.'}
            </p>
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
              {language === 'ar'
                ? <>تلميح: استخدم بيانات الدخول التجريبية أو رمز PIN المكون من 4 أرقام (<span className="text-[#C4785A] font-bold">1234</span> للمالك).</>
                : language === 'fr'
                ? <>Astuce : Utilisez les identifiants de démo ou votre code PIN à 4 chiffres (<span className="text-[#C4785A] font-bold">1234</span> pour le Propriétaire).</>
                : <>Recovery hint: Use default demo credentials or sign in with your 4-digit PIN (<span className="text-[#C4785A] font-bold">1234</span> for Owner).</>}
            </div>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(false)}
              className="w-full h-10 rounded-xl bg-[#C4785A] text-white text-xs font-bold cursor-pointer"
            >
              {language === 'ar' ? 'العودة لتسجيل الدخول' : language === 'fr' ? 'Retour à la connexion' : 'Back to Sign In'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
