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
  const { currentUser, staff, loginWithPin, logout } = useAtriumStore();

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
          setError(res.message || 'Invalid PIN code');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-[28px] bg-[#1E1B19] border border-[#3E3832] shadow-2xl text-white p-6 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2A2420] border border-[#483B33] flex items-center justify-center text-[#C4785A]">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Staff Fast Switch & Lock</h3>
              <p className="text-[11px] text-neutral-400">
                Front desk operator security
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Current Active Operator Banner */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C4785A] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {currentUser.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">{currentUser.fullName}</span>
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/15 px-2 py-0.5 rounded-full uppercase">
                  {currentUser.role}
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">{currentUser.email}</span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <UserCheck size={13} /> Active
          </span>
        </div>

        {/* Staff Quick Tap Switch List */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Switch Terminal Operator
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {staff.map((stf) => {
              const isCurrent = currentUser.id === stf.id;
              return (
                <button
                  key={stf.id}
                  type="button"
                  onClick={() => handleQuickSelectStaff(stf)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#2A2420] border-[#C4785A] text-white font-bold'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-bold">
                      {stf.fullName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium truncate">{stf.fullName}</div>
                      <div className="text-[10px] text-neutral-400">{stf.role}</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#C4785A]">
                    PIN: {stf.pinCode || '1234'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4-Digit Quick PIN Pad */}
        <div className="pt-2 border-t border-neutral-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Or enter 4-digit PIN:</span>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    pinInput.length > idx
                      ? 'bg-[#C4785A] scale-110'
                      : 'bg-neutral-800 border border-neutral-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="text-center text-rose-400 text-[11px] font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => {
                  if (btn === 'C') handleClear();
                  else if (btn === '⌫') handleBack();
                  else handleDigit(btn);
                }}
                className="h-10 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold text-xs hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOnboarding();
            }}
            className="text-xs text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles size={13} />
            <span>New Business Setup</span>
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="h-9 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-rose-950/40 hover:border-rose-900 text-neutral-300 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
