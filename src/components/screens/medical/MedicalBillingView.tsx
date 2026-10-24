import React, { useState } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Printer, ArrowRight } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const MedicalBillingView: React.FC = () => {
  const { language } = useAtriumStore();
  const { consultations, markConsultationPaid } = useMedicalData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = consultations.filter((c) =>
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalFee = consultations.reduce((acc, c) => acc + c.consultationFeeDzd, 0);
  const totalPaid = consultations.reduce((acc, c) => acc + (c.isPaid ? c.consultationFeeDzd : 0), 0);
  const totalPending = totalFee - totalPaid;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الفواتير والضمان الاجتماعي (Chifa / CNAS)' : 'Facturation Clinique & Tiers Payant Chifa'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                CNAS / CASNOS
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'تحصيل أتعاب الفحص الطبي، مستحقات الصندوق والتأمين الصحي التكميلي'
                : 'Ticket modérateur, télétransmission Chifa & bordereaux d\'encaissement'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'إجمالي الأتعاب' : 'Total facturé'}
            </span>
            <div className="mt-1 text-xl font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(totalFee, language)}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'المحصل نقداً / فوري' : 'Encaissé (Patient / Chifa)'}
            </span>
            <div className="mt-1 text-xl font-bold font-mono text-emerald-600 tabular-nums">
              {formatMoney(totalPaid, language)}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'المتبقي قيد التحصيل' : 'Reste à recouvrer'}
            </span>
            <div className="mt-1 text-xl font-bold font-mono text-amber-600 tabular-nums">
              {formatMoney(totalPending, language)}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث عن فاتورة أو مريض...' : 'Recherche par patient ou consultation...'}
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3">{language === 'ar' ? 'المريض' : 'Patient'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'التشخيص / الكشف' : 'Motif'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ar' ? 'الأتعاب' : 'Tarif'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ar' ? 'حصة المريض' : 'Ticket Patient'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ar' ? 'حصة التأمين (Chifa)' : 'Part Assurance'}</th>
                  <th className="px-4 py-3 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((cons) => (
                  <tr key={cons.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">
                      {cons.patientName}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      {cons.diagnosis || cons.chiefComplaint}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {formatMoney(cons.consultationFeeDzd, language)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                      {formatMoney(cons.copayAmountDzd, language)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      {formatMoney(cons.insuranceShareDzd, language)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cons.isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {cons.isPaid
                          ? (language === 'ar' ? 'مدفوع' : 'Encaissé')
                          : (language === 'ar' ? 'معلق' : 'En attente')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!cons.isPaid ? (
                        <AtriumButton
                          size="xs"
                          variant="primary"
                          onClick={() => {
                            markConsultationPaid(cons.id);
                            showToast(
                              language === 'ar'
                                ? 'تم تحصيل أتعاب الفحص بنجاح'
                                : 'Encaissement validé avec succès',
                              'success'
                            );
                          }}
                        >
                          {language === 'ar' ? 'تحصيل' : 'Encaisser'}
                        </AtriumButton>
                      ) : (
                        <span className="text-[11px] text-emerald-600 flex items-center justify-end gap-1 font-semibold">
                          <CheckCircle2 size={13} />
                          {language === 'ar' ? 'تم الدفع' : 'Réglé'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
