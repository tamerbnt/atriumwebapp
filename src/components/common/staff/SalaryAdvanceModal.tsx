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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#d4522f]/10 flex items-center justify-center text-[#d4522f]">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {isAr ? 'سلفة راتب' : isEn ? 'Salary Advance' : 'Acompte Salaire'}
            </h3>
            <p className="text-xs text-neutral-500">
              {isAr ? 'تخصم من الراتب' : isEn ? 'Deducted next payroll' : 'Déduit sur paie'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
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

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {isAr ? 'المبلغ' : isEn ? 'Amount' : 'Montant'}
            </label>
            <div className="relative">
              <input
                type="number"
                min="500"
                max={selectedStaff?.salary ? selectedStaff.salary * 0.8 : 200000}
                step="500"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#202024] text-neutral-900 dark:text-white font-mono font-bold text-base focus:ring-2 focus:ring-[#d4522f] focus:outline-hidden"
              />
              <span className="absolute right-4 top-2.5 text-xs font-bold text-neutral-400">DZD</span>
            </div>
            {selectedStaff?.salary && (
              <p className="text-[11px] text-neutral-400 mt-1">
                {isAr ? `الحد: ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} دج` : isEn ? `Max: ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} DZD` : `Max : ${Math.round(selectedStaff.salary * 0.8).toLocaleString()} DZD`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {isAr ? 'الدفع' : isEn ? 'Method' : 'Paiement'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces' },
                { id: 'ccp', label: isAr ? 'بريدي' : isEn ? 'Postal' : 'Poste' },
                { id: 'bank_transfer', label: isAr ? 'تحويل' : isEn ? 'Transfer' : 'Virement' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === m.id
                      ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {isAr ? 'ملاحظة' : isEn ? 'Note' : 'Motif'}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isAr ? 'ملاحظة...' : isEn ? 'Reason...' : 'Motif...'}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#202024] text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-[#d4522f] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
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
  );
};
