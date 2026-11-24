import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { StaffMember } from '../../../types/index';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

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
    <KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg" zIndexClass="z-[9990]">
      <div
        data-sq="panel"
        data-sq-border="solid"
        dir={isAr ? 'rtl' : 'ltr'}
        className="bg-white dark:bg-[#262422] w-full p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)] relative [--sq-stroke:var(--sq-stroke-pop)]"
      >
          <div className="flex items-center justify-between gap-[var(--s3,12px)] pb-[var(--s3,12px)] border-b border-[var(--atr-divider)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)] min-w-0">
              <div
                data-sq="tile"
                className="w-[var(--tile-md,40px)] h-[var(--tile-md,40px)] bg-[#d4522f]/10 flex items-center justify-center text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0"
              >
                <DollarSign className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="t-dialog text-[var(--text-1)] dark:text-white truncate">
                {isAr ? 'سلفة راتب' : isEn ? 'Salary Advance' : 'Acompte Salaire'}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'}
              className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] flex items-center justify-center rounded-full text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-white/65 dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#2B2825] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s4,16px)]">
            <LabelSelect
              label={isAr ? 'الموظف' : isEn ? 'Staff' : 'Collaborateur'}
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              height={40}
              options={staffList.map((s) => ({
                value: s.id,
                label: `${s.fullName} (${s.role})`,
              }))}
            />

            <div className="flex flex-col gap-[var(--s1,4px)]">
              <LabelInput
                label={isAr ? 'المبلغ' : isEn ? 'Amount' : 'Montant'}
                type="number"
                min={500}
                max={selectedStaff?.salary ? selectedStaff.salary * 0.8 : 200000}
                step={500}
                required
                value={amount}
                onChange={setAmount}
                height={40}
                suffix={<span className="t-small text-[var(--text-2)] dark:text-white/65">DZD</span>}
              />
              {selectedStaff?.salary && (
                <p className="t-cap text-[var(--text-2)] dark:text-white/65 tabular-nums">
                  {isAr ? `الحد: ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} دج` : isEn ? `Max: ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} DZD` : `Max : ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} DZD`}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="block t-small font-medium text-[var(--text-2)] dark:text-white/80">
                {isAr ? 'الدفع' : isEn ? 'Method' : 'Paiement'}
              </label>
              <LiveSegmentedControl
                fullWidth
                size="md"
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as 'cash' | 'ccp' | 'bank_transfer')}
                aria-label={isAr ? 'الدفع' : isEn ? 'Method' : 'Paiement'}
                options={[
                  { value: 'cash', label: isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces' },
                  { value: 'ccp', label: isAr ? 'بريدي' : isEn ? 'Postal' : 'Poste' },
                  { value: 'bank_transfer', label: isAr ? 'تحويل' : isEn ? 'Transfer' : 'Virement' },
                ]}
              />
            </div>

            <LabelInput
              label={isAr ? 'ملاحظة' : isEn ? 'Note' : 'Motif'}
              type="text"
              value={reason}
              onChange={setReason}
              placeholder={isAr ? 'ملاحظة...' : isEn ? 'Reason...' : 'Motif...'}
              height={40}
            />

            <div className="flex items-center justify-end gap-[var(--s3,12px)] pt-[var(--footer-gap,16px)] border-t border-[var(--atr-divider)]">
              <Button
                type="button"
                tone="soft"
                onClick={onClose}
              >
                {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
              </Button>
              <AtriumButton type="submit">
                {isAr ? 'تأكيد' : isEn ? 'Confirm' : 'Confirmer'}
              </AtriumButton>
            </div>
          </form>
      </div>
    </KineticModalShell>
  );
};

