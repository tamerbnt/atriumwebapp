import React, { useState } from 'react';
import { X, DollarSign, Calendar, User, FileText, CreditCard } from 'lucide-react';
import { StaffMember } from '../../../types/index';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface SalaryAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  onCreateAdvance: (data: {
    staffId: string;
    staffName: string;
    amountDzd: number;
    paymentMethod: 'cash' | 'ccp' | 'bank_transfer';
    reason?: string;
  }) => void;
  language: string;
}

export const SalaryAdvanceModal: React.FC<SalaryAdvanceModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onCreateAdvance,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || '');
  const [amount, setAmount] = useState<string>('10000');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'ccp' | 'bank_transfer'>('cash');
  const [reason, setReason] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find((s) => s.id === selectedStaffId);
    if (!staff) return;

    const parsedAmount = Math.max(500, parseInt(amount, 10) || 5000);

    onCreateAdvance({
      staffId: staff.id,
      staffName: staff.fullName,
      amountDzd: parsedAmount,
      paymentMethod,
      reason: reason.trim() || undefined,
    });
    onClose();
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--s4,16px)] bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="sq-elev-pop max-w-lg w-full">
        <div
          data-sq="panel"
          style={{ '--sq-stroke': 'var(--atr-border, #E5E5E5)' } as React.CSSProperties}
          className="bg-white dark:bg-[#18181B] w-full p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)] relative"
        >
          <div className="flex items-center justify-between gap-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)] min-w-0">
              <div
                data-sq="tile"
                className="w-[var(--tile-md,40px)] h-[var(--tile-md,40px)] bg-[#d4522f]/10 flex items-center justify-center text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0"
              >
                <DollarSign className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-[var(--title-cap-gap,2px)] min-w-0">
                <h3 className="t-dialog text-[var(--text-1)] dark:text-white truncate">
                  {isAr ? 'سلفة راتب' : isEn ? 'Salary Advance' : 'Acompte Salaire'}
                </h3>
                <p className="t-cap text-[var(--text-2)] dark:text-white/75">
                  {isAr ? 'تخصم من الراتب' : isEn ? 'Deducted next payroll' : 'Déduit sur paie'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] flex items-center justify-center rounded-full text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-white/65 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s4,16px)]">
            <div className="flex flex-col gap-[var(--s2,8px)]">
              <label className="block t-label font-semibold text-[var(--text-1)] dark:text-white/85">
                {isAr ? 'الموظف' : isEn ? 'Staff' : 'Collaborateur'}
              </label>
              <LabelSelect
                value={selectedStaffId}
                onChange={(val) => setSelectedStaffId(val)}
                options={staffList.map((s) => ({
                  value: s.id,
                  label: `${s.fullName} (${s.role})`,
                }))}
              />
            </div>

            <div className="flex flex-col gap-[var(--s2,8px)]">
              <label className="block t-label font-semibold text-[var(--text-1)] dark:text-white/85">
                {isAr ? 'المبلغ' : isEn ? 'Amount' : 'Montant'}
              </label>
              <div
                data-sq="ctl"
                style={{ '--sq-stroke': 'var(--atr-border-strong, #D4D4D4)' } as React.CSSProperties}
                className="relative h-[var(--btn-h,40px)] flex items-center bg-white dark:bg-[#202024]"
              >
                <input
                  type="number"
                  min="500"
                  max={selectedStaff?.salary ? selectedStaff.salary * 0.8 : 200000}
                  step="500"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-full px-[var(--s4,16px)] pe-[var(--s8,48px)] bg-transparent text-[var(--text-1)] dark:text-white t-card tabular-nums focus:outline-hidden"
                />
                <span className="absolute end-[var(--s4,16px)] t-small text-[var(--text-2)] dark:text-white/65">DZD</span>
              </div>
              {selectedStaff?.salary && (
                <p className="t-cap text-[var(--text-2)] dark:text-white/65 tabular-nums">
                  {isAr ? `الحد: ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} دج` : isEn ? `Max: ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} DZD` : `Max : ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} DZD`}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-[var(--s2,8px)]">
              <label className="block t-label font-semibold text-[var(--text-1)] dark:text-white/85">
                {isAr ? 'الدفع' : isEn ? 'Method' : 'Paiement'}
              </label>
              <div className="grid grid-cols-3 gap-[var(--s2,8px)]">
                {[
                  { id: 'cash', label: isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces' },
                  { id: 'ccp', label: isAr ? 'بريدي' : isEn ? 'Postal' : 'Poste' },
                  { id: 'bank_transfer', label: isAr ? 'تحويل' : isEn ? 'Transfer' : 'Virement' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    data-sq="ctl"
                    style={
                      {
                        '--sq-stroke': paymentMethod === m.id ? '#BF431F' : 'var(--atr-border, #E5E5E5)',
                      } as React.CSSProperties
                    }
                    className={`h-[var(--btn-h,40px)] px-[var(--s3,12px)] t-btn transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                        : 'text-[var(--text-2)] dark:text-white/75 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[var(--s2,8px)]">
              <label className="block t-label font-semibold text-[var(--text-1)] dark:text-white/85">
                {isAr ? 'ملاحظة' : isEn ? 'Note' : 'Motif'}
              </label>
              <div
                data-sq="ctl"
                style={{ '--sq-stroke': 'var(--atr-border-strong, #D4D4D4)' } as React.CSSProperties}
                className="h-[var(--btn-h,40px)] flex items-center bg-white dark:bg-[#202024]"
              >
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={isAr ? 'ملاحظة...' : isEn ? 'Reason...' : 'Motif...'}
                  className="w-full h-full px-[var(--s4,16px)] bg-transparent text-[var(--text-1)] dark:text-white placeholder:text-black/50 dark:placeholder:text-white/55 t-body focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-[var(--s3,12px)] pt-[var(--footer-gap,16px)] border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                data-sq="ctl-sm"
                className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] t-btn text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-white/75 dark:hover:text-white cursor-pointer"
              >
                {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
              </button>
              <AtriumButton type="submit">
                {isAr ? 'تأكيد' : isEn ? 'Confirm' : 'Confirmer'}
              </AtriumButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
