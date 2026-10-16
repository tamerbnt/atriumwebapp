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
  HelpCircle,
  Hash,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';

interface LoginScreenProps {
  onStartOnboarding: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onStartOnboarding }) => {
  const { login, loginWithPin, staff } = useAtriumStore();

  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('bentouatitamer@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

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

      {/* Main 480px Centered Auth Card */}
      <div className="relative w-full max-w-[480px] rounded-[28px] bg-[#1E1B19]/95 border border-[#3E3832]/80 shadow-2xl p-7 sm:p-9 text-white backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Atrium Brand Emblem */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#2A2420] border border-[#483B33] flex items-center justify-center p-3 mb-3.5 shadow-md">
            <div className="grid grid-cols-2 gap-1.5 w-6 h-6">
              <div className="w-2.5 h-2.5 rounded-xs bg-[#C4785A]" />
              <div className="w-2.5 h-2.5 rounded-xs bg-[#C4785A]" />
              <div className="w-2.5 h-2.5 rounded-xs bg-[#C4785A]" />
              <div className="w-2.5 h-2.5 rounded-xs bg-[#C4785A]" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">ATRIUM</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Enterprise Management Platform & Point of Sale
          </p>
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
            <span>Owner / Staff Email</span>
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
            <span>Terminal PIN Pad</span>
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
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.dz"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#C4785A] transition-colors"
                />
                <Mail size={15} className="absolute left-3.5 top-3 text-neutral-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-300">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-[11px] text-[#C4785A] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#C4785A] transition-colors"
                />
                <Lock size={15} className="absolute left-3.5 top-3 text-neutral-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-neutral-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-neutral-700 text-[#C4785A] focus:ring-0"
                />
                <span>Remember this terminal</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] active:scale-[0.99] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer mt-2"
            >
              <span>Sign In to Atrium</span>
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          /* TERMINAL PIN PAD FORM */
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-neutral-400">
                Enter your 4-digit staff PIN to unlock this terminal
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
              Default PINs: 1234 (Owner), 5566 (Manager), 9988 (Cashier)
            </p>
          </div>
        )}

        {/* Demo Fast Login Pills */}
        <div className="mt-6 pt-5 border-t border-neutral-800/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center justify-between">
            <span>Fast Demo Sign-In</span>
            <span className="text-[9px] text-[#C4785A]">Click to test</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-left">
            <button
              type="button"
              onClick={() => quickFillStaff('bentouatitamer@gmail.com', '1234')}
              className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-[#C4785A]/50 transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-[#C4785A]">Tamer</div>
              <div className="text-[10px] text-neutral-400">Owner (1234)</div>
            </button>
            <button
              type="button"
              onClick={() => quickFillStaff('samir.manager@atrium.dz', '5566')}
              className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-[#C4785A]/50 transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-[#C4785A]">Samir</div>
              <div className="text-[10px] text-neutral-400">Manager (5566)</div>
            </button>
            <button
              type="button"
              onClick={() => quickFillStaff('meriem.cashier@atrium.dz', '9988')}
              className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-[#C4785A]/50 transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-[#C4785A]">Meriem</div>
              <div className="text-[10px] text-neutral-400">Cashier (9988)</div>
            </button>
          </div>
        </div>

        {/* Onboarding Link Section (Section 11.2) */}
        <div className="mt-6 text-center pt-3">
          <p className="text-xs text-neutral-400">
            Setting up a new business or branch?
          </p>
          <button
            type="button"
            onClick={onStartOnboarding}
            className="mt-2 text-xs font-bold text-[#C4785A] hover:text-[#d68565] flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
          >
            <Sparkles size={13} />
            <span>Start Multi-Step Business Onboarding</span>
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1B19] border border-neutral-700 p-6 text-white space-y-4">
            <h3 className="text-base font-bold">Password Recovery</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              For local security in Atrium desktop & web terminals, password recovery codes are routed to the registered account owner email or master cash voucher.
            </p>
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
              Recovery hint: Use default demo credentials or sign in with your 4-digit PIN (<span className="text-[#C4785A] font-bold">1234</span> for Owner).
            </div>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(false)}
              className="w-full h-10 rounded-xl bg-[#C4785A] text-white text-xs font-bold cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
