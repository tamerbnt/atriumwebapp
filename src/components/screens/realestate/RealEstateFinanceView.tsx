import React, { useState } from 'react';
import { Receipt, Printer, CheckCircle2, ShieldCheck, Download, DollarSign } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const RealEstateFinanceView: React.FC = () => {
  const { language } = useAtriumStore();
  const { leases } = useRealEstateData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = leases.filter(
    (l) =>
      l.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMonthlyRents = leases.reduce((acc, l) => acc + l.monthlyRentDzd, 0);
  const totalDeposits = leases.reduce((acc, l) => acc + l.securityDepositDzd, 0);
  const totalCommissions = leases.reduce((acc, l) => acc + (l.monthlyRentDzd * 0.1), 0); // 10% standard agency management fee
  const netOwnerDisbursal = totalMonthlyRents - totalCommissions;

  const handlePrintQuittance = (tenantName: string) => {
    showToast(
      language === 'ar'
        ? `جاري طباعة مخالصة الإيجار للمستأجر ${tenantName}...`
        : `Impression de la quittance de loyer pour ${tenantName}...`,
      'info'
    );
    window.print();
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الوصولات ومستحقات الملاك' : 'Quittances de Loyer & Règlements Bailleurs'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Légal Foncier
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إصدار وصولات الإيجار القانونية، عمولات الوكالة، وتسوية حسابات الملاك'
                : 'Quittances de loyer dématérialisées, redditions de comptes & commissions'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => window.print()}
            icon={<Printer size={14} />}
          >
            {language === 'ar' ? 'طباعة كشف الحسابات' : 'Bordereau Bailleurs'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات التحصيل وعمولات الوكالة' : 'Encaissement des Loyers & Commissions'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'توزيع المبالغ المحصلة بين أتعاب الإدارة وصافي التحويل للمالك' : 'Ventilation des sommes perçues, honoraires de gestion et reversement bailleur'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Loyers */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي الإيجارات المحصلة' : 'Masse des Loyers Appelée'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalMonthlyRents, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {leases.length} {language === 'ar' ? 'وصل إيجار سارٍ' : 'quittances émises'}
              </p>
            </div>
          </div>

          {/* Card 2: Commissions Agence */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'عمولة التسيير العقاري (10%)' : 'Honoraires Gestion Agence'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatMoney(totalCommissions, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'إيرادات الوكالة الصافية' : 'Revenu net agence mandatée'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'صافي مستحقات الملاك' : 'Reversements Bailleurs'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'جاهز للتحويل' : 'Net Propriétaire'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(netOwnerDisbursal, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'حساب بانتظار التسوية' : 'dossiers à solder'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل الوصولات ومستحقات الملاك' : 'Registre des Quittances & Règlements'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالعقار أو المستأجر...' : 'Recherche bien ou locataire...'}
            />
          </div>
        </div>

        {/* Finance Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'العقار' : 'Bien'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المستأجر' : 'Locataire'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'مبلغ الإيجار' : 'Loyer Quittancé'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'عمولة الوكالة' : 'Commission (10%)'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'صافي المالك' : 'Net Bailleur'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الإجراء' : 'Quittance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((l) => {
                  const comm = l.monthlyRentDzd * 0.1;
                  const net = l.monthlyRentDzd - comm;
                  return (
                    <tr key={l.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                        {l.propertyTitle}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                        {l.tenantName}
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(l.monthlyRentDzd, language)}
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        {formatMoney(comm, language)}
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(net, language)}
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left">
                        <AtriumButton
                          size="xs"
                          variant="outline"
                          onClick={() => handlePrintQuittance(l.tenantName)}
                          icon={<Printer size={13} />}
                        >
                          {language === 'ar' ? 'وصل إيجار' : 'Quittance'}
                        </AtriumButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
