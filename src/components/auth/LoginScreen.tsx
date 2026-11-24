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
import {
  selectCurrentStaffFromState,
  shallowEqualObjects,
  useAtriumActions,
  useAtriumSelector,
} from '../../services/store';
import { authService } from '../../lib/supabase/services/authService';
import { t } from '../../utils/i18n';

import { FiveCubesLogo } from './AtriumMonolith';
import { LabelInput } from '../ui/LabelInput';
import { AtriumButton } from '../ui/AtriumButton';
import { KineticModalShell } from '../ui/kinetic/KineticModalShell';

interface LoginScreenProps {
  onStartOnboarding: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onStartOnboarding }) => {
  const { login, loginWithPin, setLanguage, setSystemDefaultLanguage } = useAtriumActions();
  const { staff, language, isLanguageAuto } = useAtriumSelector(
    (s) => ({
      staff: selectCurrentStaffFromState(s),
      language: s.language,
      isLanguageAuto: s.isLanguageAuto,
    }),
    shallowEqualObjects
  );
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--s4,16px)] bg-gradient-to-br from-[#121110] via-[#1A1715] to-[#26211C] overflow-y-auto select-none">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4522f]/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Language Switcher in Top Right */}
      <div className="absolute top-[var(--s4,16px)] right-[var(--s4,16px)] z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] rounded-full bg-[#22201E]/95 text-white t-btn flex items-center gap-[var(--btn-sm-gap,6px)] hover:bg-[#2B2825] transition-colors cursor-pointer shadow-lg backdrop-blur-md"
          >
            <Globe size={16} strokeWidth={1.5} className="text-[var(--brand-on-dark,#FF8F63)]" />
            <span>
              {language === 'ar' ? 'العربية' : language === 'fr' ? 'Français' : 'English'}
            </span>
            {isLanguageAuto && (
              <span className="w-[var(--pill-dot,6px)] h-[var(--pill-dot,6px)] rounded-full bg-emerald-500" title={t('topbar_auto_detected', language)} />
            )}
          </button>

          {langMenuOpen && (
            <div className={`absolute top-full mt-[var(--pop-offset,8px)] w-48 sq-elev-pop z-30 ${language === 'ar' ? 'left-0' : 'right-0'}`}>
              <div
                data-sq="table"
                data-sq-border="solid"
                className="w-full rounded-[var(--r-table,20px)] bg-[#262422] [--sq-stroke:var(--sq-stroke-obsidian)] p-[var(--s2,8px)] flex flex-col gap-[var(--s1,4px)]"
              >
                <button
                  type="button"
                  data-sq="row"
                  data-sq-border="none"
                  onClick={() => {
                    setSystemDefaultLanguage();
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-[var(--s3,12px)] py-[var(--s2,8px)] rounded-[var(--r-row,12px)] t-label flex items-center justify-between cursor-pointer transition-colors ${
                    isLanguageAuto ? 'bg-[#d4522f]/20 text-[var(--brand-on-dark,#FF8F63)] font-semibold' : 'text-white/85 hover:bg-[#2B2825] hover:text-white'
                  }`}
                >
                  <span>🌐 {t('settings_system_default', language)}</span>
                  {isLanguageAuto && <Check size={16} strokeWidth={1.5} />}
                </button>
                <div className="h-px bg-white/[0.08]" />
                <button
                  type="button"
                  data-sq="row"
                  data-sq-border="none"
                  onClick={() => {
                    setLanguage('en', false);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-[var(--s3,12px)] py-[var(--s2,8px)] rounded-[var(--r-row,12px)] t-label flex items-center justify-between cursor-pointer transition-colors ${
                    !isLanguageAuto && language === 'en' ? 'bg-[#d4522f]/20 text-[var(--brand-on-dark,#FF8F63)] font-semibold' : 'text-white/85 hover:bg-[#2B2825] hover:text-white'
                  }`}
                >
                  <span>🇺🇸 English (US)</span>
                  {!isLanguageAuto && language === 'en' && <Check size={16} strokeWidth={1.5} />}
                </button>
                <button
                  type="button"
                  data-sq="row"
                  data-sq-border="none"
                  onClick={() => {
                    setLanguage('fr', false);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-[var(--s3,12px)] py-[var(--s2,8px)] rounded-[var(--r-row,12px)] t-label flex items-center justify-between cursor-pointer transition-colors ${
                    !isLanguageAuto && language === 'fr' ? 'bg-[#d4522f]/20 text-[var(--brand-on-dark,#FF8F63)] font-semibold' : 'text-white/85 hover:bg-[#2B2825] hover:text-white'
                  }`}
                >
                  <span>🇫🇷 Français</span>
                  {!isLanguageAuto && language === 'fr' && <Check size={16} strokeWidth={1.5} />}
                </button>
                <button
                  type="button"
                  data-sq="row"
                  data-sq-border="none"
                  onClick={() => {
                    setLanguage('ar', false);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-[var(--s3,12px)] py-[var(--s2,8px)] rounded-[var(--r-row,12px)] t-label flex items-center justify-between cursor-pointer transition-colors ${
                    !isLanguageAuto && language === 'ar' ? 'bg-[#d4522f]/20 text-[var(--brand-on-dark,#FF8F63)] font-semibold' : 'text-white/85 hover:bg-[#2B2825] hover:text-white'
                  }`}
                >
                  <span>🇩🇿 العربية (RTL)</span>
                  {!isLanguageAuto && language === 'ar' && <Check size={16} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main 480px Centered Auth Card */}
      <div className="relative w-full max-w-[480px] sq-elev-pop animate-in fade-in zoom-in-95 duration-200">
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="relative w-full rounded-[var(--r-panel,28px)] bg-[#1E1B19]/95 [--sq-stroke:rgba(255,255,255,0.08)] p-[var(--modal-pad,24px)] sm:p-[var(--s8,48px)] text-white backdrop-blur-xl flex flex-col gap-[var(--modal-gap,20px)]"
        >
          {/* Atrium Brand Emblem */}
          <div className="flex flex-col items-center text-center gap-[var(--s2,8px)]">
            <div
              data-sq="tile-lg"
              data-sq-border="solid"
              className="w-[var(--tile-lg,48px)] h-[var(--tile-lg,48px)] rounded-[var(--r-tile-lg,15px)] bg-[#2A2420] [--sq-stroke:#483B33] flex items-center justify-center p-[var(--s2,8px)]"
            >
              <FiveCubesLogo size={24} cubeColor="#d4522f" />
            </div>
            <div className="flex flex-col items-center gap-[var(--ph-sub-gap,4px)]">
              <h1 className="t-page text-white">ATRIUM</h1>
              <p className="t-body text-[var(--text-dark-2,#A99E92)] max-w-xs">
                {t('login_subtitle', language)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-[var(--s2,8px)]">
            {/* Primary Google SSO Button */}
            <button
              type="button"
              data-sq="ctl"
              data-sq-border="none"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] rounded-[var(--r-ctl,12px)] bg-white hover:bg-neutral-100 text-black t-btn font-semibold transition-all flex items-center justify-center gap-[var(--btn-icon-gap,8px)] cursor-pointer disabled:opacity-75"
            >
              <svg className="w-[var(--icon-s,16px)] h-[var(--icon-s,16px)] shrink-0" viewBox="0 0 24 24">
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
            <button
              type="button"
              data-sq="ctl"
              data-sq-border="solid"
              onClick={() => handleFastOwnerLogin('mehdisamih79@gmail.com')}
              className="w-full h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] rounded-[var(--r-ctl,12px)] bg-[#2A2420] hover:bg-[#342D28] [--sq-stroke:url(#sq-spec-dark-ctl)] text-white t-btn flex items-center justify-center gap-[var(--btn-sm-gap,6px)] transition-colors cursor-pointer"
              title="Instant sign-in without Google OAuth"
            >
              <Sparkles size={16} strokeWidth={1.5} className="text-[var(--brand-on-dark,#FF8F63)]" />
              <span>{t('login_fast_access', language)}</span>
            </button>
          </div>

          <div className="relative flex py-[var(--s1,4px)] items-center gap-[var(--s3,12px)]">
            <div className="flex-grow border-t border-white/[0.08]"></div>
            <span className="flex-shrink t-cap text-[var(--text-dark-2,#A99E92)]">
              {language === 'ar' ? 'أو الدخول بكلمة المرور / رمز PIN' : language === 'fr' ? 'ou connexion par mot de passe / code PIN' : 'or sign in with password / PIN'}
            </span>
            <div className="flex-grow border-t border-white/[0.08]"></div>
          </div>

          {/* Auth Mode Toggle Pill */}
          <div
            data-sq="ctl"
            data-sq-border="none"
            className="grid grid-cols-2 h-[var(--seg-l-h,40px)] p-[var(--seg-l-pad,4px)] rounded-[var(--r-ctl,12px)] bg-[#191716] t-btn"
          >
            <button
              type="button"
              data-sq="thumb"
              data-sq-border="none"
              onClick={() => {
                setAuthMode('password');
                setError(null);
              }}
              className={`h-[var(--btn-sm-h,32px)] px-[var(--seg-px,12px)] rounded-[var(--r-thumb,9px)] transition-all cursor-pointer flex items-center justify-center gap-[var(--btn-sm-gap,6px)] ${
                authMode === 'password'
                  ? 'bg-[var(--brand-fill,#C9461F)] text-white font-semibold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Mail size={16} strokeWidth={1.5} />
              <span>{t('login_with_email', language)}</span>
            </button>
            <button
              type="button"
              data-sq="thumb"
              data-sq-border="none"
              onClick={() => {
                setAuthMode('pin');
                setError(null);
              }}
              className={`h-[var(--btn-sm-h,32px)] px-[var(--seg-px,12px)] rounded-[var(--r-thumb,9px)] transition-all cursor-pointer flex items-center justify-center gap-[var(--btn-sm-gap,6px)] ${
                authMode === 'pin'
                  ? 'bg-[var(--brand-fill,#C9461F)] text-white font-semibold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Hash size={16} strokeWidth={1.5} />
              <span>{t('login_with_pin', language)}</span>
            </button>
          </div>

          {error && (
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="p-[var(--s3,12px)] rounded-[var(--r-ctl,12px)] bg-rose-950/60 [--sq-stroke:rgba(159,18,57,0.8)] text-rose-200 t-small flex items-center gap-[var(--s2,8px)] animate-in fade-in"
            >
              <ShieldCheck size={16} strokeWidth={1.5} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PASSWORD FORM */}
          {authMode === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-[var(--s3,12px)]">
              <div className="flex justify-center w-full">
                <LabelInput
                  field="Email"
                  label={language === 'ar' ? 'البريد الإلكتروني للعمل' : language === 'fr' ? 'Email professionnel' : 'Work Email'}
                  value={email}
                  onChange={setEmail}
                  type="email"
                  width={360}
                  height={48}
                  corner={12}
                />
              </div>

              <div className="flex flex-col items-center gap-[var(--s1,4px)] w-full">
                <div className="flex items-center justify-between w-full max-w-[360px] px-[var(--s1,4px)]">
                  <span className="t-small text-[var(--text-dark-2,#A99E92)]">
                    {language === 'ar' ? 'كلمة المرور' : language === 'fr' ? 'Mot de passe' : 'Password'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="t-small text-[var(--brand-on-dark,#FF8F63)] hover:underline cursor-pointer"
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
                  height={48}
                  corner={12}
                />
              </div>

              <div className="flex items-center justify-between pt-[var(--s1,4px)]">
                <label className="flex items-center gap-[var(--s2,8px)] cursor-pointer t-body text-[var(--text-dark-2,#A99E92)]">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="rounded-[var(--r-check,6px)] border-white/[0.16] text-[var(--brand-fill,#C9461F)] focus:ring-0"
                  />
                  <span>{language === 'ar' ? 'تذكر هذا الجهاز' : language === 'fr' ? 'Mémoriser ce terminal' : 'Remember this terminal'}</span>
                </label>
              </div>

              <AtriumButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                icon={<ArrowRight size={16} strokeWidth={1.5} className={language === 'ar' ? 'rotate-180' : ''} />}
                iconPosition="right"
              >
                {language === 'ar' ? 'تسجيل الدخول إلى Atrium' : language === 'fr' ? 'Se connecter à Atrium' : 'Sign In to Atrium'}
              </AtriumButton>
            </form>
          ) : (
            /* TERMINAL PIN PAD FORM */
            <div className="flex flex-col items-center gap-[var(--s4,16px)]">
              <div className="text-center flex flex-col items-center gap-[var(--s3,12px)]">
                <p className="t-body text-[var(--text-dark-2,#A99E92)]">
                  {language === 'ar'
                    ? 'أدخل رمز PIN المكون من 4 أرقام لفتح هذا الجهاز'
                    : language === 'fr'
                    ? 'Entrez votre code PIN à 4 chiffres pour déverrouiller ce terminal'
                    : 'Enter your 4-digit staff PIN to unlock this terminal'}
                </p>
                {/* PIN Bubbles Display */}
                <div className="flex items-center justify-center gap-[var(--s3,12px)]">
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = pin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-[var(--s4,16px)] h-[var(--s4,16px)] rounded-full transition-all ${
                          isFilled
                            ? 'bg-[var(--brand-fill,#C9461F)] scale-110 shadow-xs'
                            : 'bg-[#2B2825]'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 3x4 Pin Pad */}
              <div className="w-full max-w-[280px] grid grid-cols-3 gap-[var(--s2,8px)]">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    data-sq="ctl"
                    data-sq-border={btn === 'C' || btn === '⌫' ? 'none' : 'solid'}
                    onClick={() => {
                      if (btn === 'C') handlePinClear();
                      else if (btn === '⌫') handlePinDelete();
                      else handlePinDigit(btn);
                    }}
                    className={`h-[var(--tile-lg,48px)] rounded-[var(--r-ctl,12px)] t-card tabular-nums flex items-center justify-center transition-all cursor-pointer ${
                      btn === 'C'
                        ? 'bg-[#2B2825] text-white/75 hover:bg-[#332F2B] hover:text-white'
                        : btn === '⌫'
                        ? 'bg-[#2B2825] text-white/75 hover:bg-[#332F2B] hover:text-white'
                        : 'bg-[#22201E] [--sq-stroke:url(#sq-spec-dark-ctl)] text-white hover:bg-[#2B2825] hover:[--sq-stroke:url(#sq-spec-dark-ctl-hover)] active:scale-95'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>

              <p className="text-center t-cap text-[var(--text-dark-2,#A99E92)] tabular-nums">
                {language === 'ar'
                  ? 'أدخل رمز PIN الخاص بحسابك'
                  : language === 'fr'
                  ? 'Entrez votre code PIN personnel à 4 chiffres'
                  : 'Enter your personal 4-digit staff PIN'}
              </p>
            </div>
          )}

          {/* Onboarding Link Section (Section 11.2) */}
          <div className="text-center pt-[var(--s3,12px)] border-t border-white/[0.08] flex flex-col items-center gap-[var(--s2,8px)]">
            <p className="t-body text-[var(--text-dark-2,#A99E92)]">
              {language === 'ar'
                ? 'هل تؤسس نشاطاً تجارياً أو فرعاً جديداً؟'
                : language === 'fr'
                ? 'Vous configurez une nouvelle entreprise ou succursale ?'
                : 'Setting up a new business or branch?'}
            </p>
            <button
              type="button"
              onClick={onStartOnboarding}
              className="t-btn font-semibold text-[var(--brand-on-dark,#FF8F63)] hover:underline flex items-center justify-center gap-[var(--btn-sm-gap,6px)] transition-colors cursor-pointer"
            >
              <Sparkles size={16} strokeWidth={1.5} />
              <span>{language === 'ar' ? 'إنشاء نشاط جديد' : language === 'fr' ? 'Créer un espace' : 'Create a Business'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <KineticModalShell
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        maxWidthClass="max-w-sm"
        zIndexClass="z-[9992]"
        scrimClassName="bg-black/70"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="w-full rounded-[var(--r-panel,28px)] bg-[#262422] [--sq-stroke:url(#sq-spec-dark-pop)] p-[var(--modal-pad,24px)] text-white flex flex-col gap-[var(--modal-gap,20px)]"
        >
          <h3 className="t-dialog font-medium">
            {language === 'ar' ? 'استرجاع كلمة المرور' : language === 'fr' ? 'Récupération du mot de passe' : 'Password Recovery'}
          </h3>
          <p className="t-body text-[var(--text-dark-2,#A99E92)]">
            {language === 'ar'
              ? 'لأمان المحطات وأجهزة سطح المكتب، يتم إرسال رموز الاسترجاع إلى البريد الإلكتروني المعتمد أو عبر القسيمة الرئيسية.'
              : language === 'fr'
              ? 'Pour la sécurité locale des postes Atrium, les codes de récupération sont transmis à l\'adresse de l\'administrateur ou via le bon maître.'
              : 'For local security in Atrium desktop & web terminals, password recovery codes are routed to the registered account owner email or master cash voucher.'}
          </p>
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-[var(--s3,12px)] rounded-[var(--r-card,16px)] bg-[#1D1B19] [--sq-stroke:var(--sq-stroke-obsidian)] t-small text-white/75"
          >
            {language === 'ar'
              ? <>تلميح: سجّل الدخول باستخدام عنوان بريدك الإلكتروني المعتمد أو رمز PIN المكون من 4 أرقام.</>
              : language === 'fr'
              ? <>Astuce : Connectez-vous avec votre adresse email enregistrée ou votre code PIN personnel à 4 chiffres.</>
              : <>Recovery hint: Sign in with your registered account email or your 4-digit PIN.</>}
          </div>
          <button
            type="button"
            data-sq="ctl"
            data-sq-border="none"
            onClick={() => setForgotPasswordOpen(false)}
            className="w-full h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] rounded-[var(--r-ctl,12px)] bg-[var(--brand-fill,#C9461F)] text-white t-btn font-semibold cursor-pointer"
          >
            {language === 'ar' ? 'العودة لتسجيل الدخول' : language === 'fr' ? 'Retour à la connexion' : 'Back to Sign In'}
          </button>
        </div>
      </KineticModalShell>

    </div>
  );
};
