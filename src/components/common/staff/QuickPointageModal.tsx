import React, { useState } from 'react';
import { QrCode, Scan, KeyRound, CheckCircle2, X, Clock, ArrowRight, User } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';
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
      title={isAr ? 'محطة تسجيل الحضور والانصراف' : isEn ? 'Attendance Pointage Terminal' : 'Borne de Pointage Présence'}
      subtitle={isAr ? 'مسح رمز RFID أو إدخال كود PIN السريع' : isEn ? 'Scan RFID / QR badge or enter 4-digit PIN' : 'Scanner le badge RFID ou saisir le code PIN'}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Punch Type Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <button
            type="button"
            onClick={() => setPunchType('in')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              punchType === 'in'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <Clock size={14} />
            <span>{isAr ? 'تسجيل دخول (Shift In)' : isEn ? 'Clock In (Shift In)' : 'Pointage Entrée'}</span>
          </button>
          <button
            type="button"
            onClick={() => setPunchType('out')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              punchType === 'out'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <Clock size={14} />
            <span>{isAr ? 'تسجيل خروج (Shift Out)' : isEn ? 'Clock Out (Shift Out)' : 'Pointage Sortie'}</span>
          </button>
        </div>

        {/* Input for RFID Token or PIN */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <LabelInput
            label={isAr ? 'رمز البادج RFID أو كود PIN' : isEn ? 'RFID Token or PIN Code' : 'Token RFID ou Code PIN'}
            value={inputCode}
            onChange={(e: any) => setInputCode(e?.target?.value ?? e)}
            placeholder="Ex: RF-84920 ou 1234"
            autoFocus
          />

          <AtriumButton
            type="submit"
            variant="primary"
            className="w-full justify-center"
            icon={<CheckCircle2 size={16} />}
          >
            {isAr ? 'تأكيد الحضور' : isEn ? 'Validate Pointage' : 'Valider le Pointage'}
          </AtriumButton>
        </form>

        {/* Success Toast Banner */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Quick Click Staff Members list */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            {isAr ? 'تسجيل سريع بنقرة واحدة' : isEn ? 'Quick 1-Click Pointage' : 'Pointage Rapide 1-Clic'}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pe-1">
            {staffList.slice(0, 8).map((member) => (
              <div
                key={member.id}
                onClick={() => onPunch(member.id, punchType, 'manual')}
                className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA] dark:bg-[#1C1C1E] hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-200 shrink-0">
                    {member.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {member.fullName}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {member.role} · PIN: {member.pinCode || '1234'}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-[#C4785A] font-semibold shrink-0 flex items-center gap-1">
                  <span>{punchType === 'in' ? (isAr ? 'دخول' : isEn ? 'In' : 'Entrée') : (isAr ? 'خروج' : isEn ? 'Out' : 'Sortie')}</span>
                  <ArrowRight size={12} className="rtl:rotate-180" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
