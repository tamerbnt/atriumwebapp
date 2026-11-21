import React, { useState } from 'react';
import { QrCode, Scan, KeyRound, CheckCircle2, X, Clock, ArrowRight, User } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LiquidButton } from '@/atrium/core';
import { StaffMember } from '../../../types/index';

interface QuickPointageModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  onPunch: (staffId: string, type?: 'in' | 'out', method?: 'rfid' | 'qr' | 'pin' | 'manual') => void;
  language: string;
}

export const QuickPointageModal: React.FC<QuickPointageModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onPunch,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [inputCode, setInputCode] = useState('');
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSimulateScan = (token: string) => {
    const member = staffList.find(
      (s) => s.badgeToken?.toLowerCase() === token.toLowerCase() || s.pinCode === token
    );
    if (member) {
      onPunch(member.id, punchType, member.pinCode === token ? 'pin' : 'rfid');
      setSuccessMessage(
        isAr
          ? `تم تسجيل ${punchType === 'in' ? 'الدخول' : 'الخروج'} لـ ${member.fullName}`
          : isEn
          ? `${punchType.toUpperCase()} recorded for ${member.fullName}`
          : `Pointage ${punchType === 'in' ? 'Entrée' : 'Sortie'} validé pour ${member.fullName}`
      );
      setInputCode('');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    handleSimulateScan(inputCode.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'تسجيل الحضور' : isEn ? 'Clock Kiosk' : 'Borne Pointage'}
      subtitle={isAr ? 'الرمز أو البطاقة' : isEn ? 'Badge or PIN' : 'Badge ou PIN'}
      maxWidth="md"
    >
      <div className="flex flex-col gap-[var(--s4,16px)]">
        {/* Punch Type Selector */}
        <div
          data-sq="ctl"
          data-sq-border="none"
          className="grid grid-cols-2 gap-[var(--s1,4px)] p-[var(--seg-pad,2px)] bg-[#EFE9E2] dark:bg-[#191716] h-[var(--seg-s-h,32px)]"
        >
          <button
            type="button"
            onClick={() => setPunchType('in')}
            data-sq={punchType === 'in' ? 'thumb' : 'none'}
            className={`h-[var(--seg-s-thumb-h,28px)] px-[var(--seg-px,12px)] t-btn flex items-center justify-center gap-[var(--seg-badge-gap,6px)] transition-all cursor-pointer ${
              punchType === 'in'
                ? 'bg-emerald-600 text-white'
                : 'rounded-[var(--r-thumb,9px)] text-[var(--text-2)] dark:text-white/80 hover:text-[var(--text-1)] dark:hover:text-white'
            }`}
          >
            <Clock size={16} strokeWidth={1.5} />
            <span>{isAr ? 'دخول' : isEn ? 'Clock In' : 'Entrée'}</span>
          </button>
          <button
            type="button"
            onClick={() => setPunchType('out')}
            data-sq={punchType === 'out' ? 'thumb' : 'none'}
            className={`h-[var(--seg-s-thumb-h,28px)] px-[var(--seg-px,12px)] t-btn flex items-center justify-center gap-[var(--seg-badge-gap,6px)] transition-all cursor-pointer ${
              punchType === 'out'
                ? 'bg-amber-600 text-white'
                : 'rounded-[var(--r-thumb,9px)] text-[var(--text-2)] dark:text-white/80 hover:text-[var(--text-1)] dark:hover:text-white'
            }`}
          >
            <Clock size={16} strokeWidth={1.5} />
            <span>{isAr ? 'خروج' : isEn ? 'Clock Out' : 'Sortie'}</span>
          </button>
        </div>

        {/* Input for RFID Token or PIN */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s3,12px)]">
          <LabelInput
            label={isAr ? 'الرمز' : isEn ? 'Badge / PIN' : 'Badge / PIN'}
            value={inputCode}
            onChange={(e: any) => setInputCode(e?.target?.value ?? e)}
            placeholder={isAr ? 'الرمز...' : isEn ? 'Code or PIN...' : 'Code ou PIN...'}
            autoFocus
          />

          <div className="flex justify-center">
            <LiquidButton
              kind="scan"
              type="submit"
              size="md"
              labels={{
                idle: isAr ? 'تأكيد' : isEn ? 'Confirm' : 'Valider',
                busy: isAr ? 'مسح...' : isEn ? 'Scanning...' : 'Scan...',
                done: isAr ? 'تم' : isEn ? 'Done' : 'Fait',
              }}
            />
          </div>
        </form>

        {/* Success Toast Banner */}
        {successMessage && (
          <div
            data-sq="card"
            style={{ '--sq-stroke': '#A7F3D0' } as React.CSSProperties}
            className="p-[var(--s3,12px)] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 t-label flex items-center gap-[var(--s2,8px)] animate-in fade-in"
          >
            <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Quick Click Staff Members list */}
        <div className="pt-[var(--s3,12px)] border-t border-[var(--atr-divider)] flex flex-col gap-[var(--s2,8px)]">
          <div className="t-small text-[var(--text-2)] dark:text-white/70">
            {isAr ? 'تسجيل سريع' : isEn ? 'Quick Log' : 'Pointage Rapide'}
          </div>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-[var(--row-gap,8px)] pe-[var(--s1,4px)]">
            {staffList.slice(0, 8).map((member) => (
              <div
                key={member.id}
                onClick={() => onPunch(member.id, punchType, 'manual')}
                data-sq="row"
                className="flex items-center justify-between px-[var(--row-inset,12px)] py-[var(--s2,8px)] bg-[#F5F1EC] dark:bg-[#22201E] hover:bg-[#EAE2D9] dark:hover:bg-[#2B2825] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-[var(--s2,8px)] min-w-0">
                  <div className="w-[var(--av-list,32px)] h-[var(--av-list,32px)] rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center t-small font-semibold text-[var(--text-1)] dark:text-white shrink-0">
                    {member.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex flex-col gap-[var(--title-cap-gap,2px)]">
                    <div className="t-label font-semibold text-[var(--text-1)] dark:text-white truncate">
                      {member.fullName}
                    </div>
                    <div className="t-cap text-[var(--text-2)] dark:text-white/70 truncate tabular-nums">
                      {member.role} · PIN: {member.pinCode || '1234'}
                    </div>
                  </div>
                </div>
                <span className="t-btn text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0 flex items-center gap-[var(--s1,4px)]">
                  <span>{punchType === 'in' ? (isAr ? 'دخول' : isEn ? 'In' : 'Entrée') : (isAr ? 'خروج' : isEn ? 'Out' : 'Sortie')}</span>
                  <ArrowRight size={16} strokeWidth={1.5} className="rtl:rotate-180" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
