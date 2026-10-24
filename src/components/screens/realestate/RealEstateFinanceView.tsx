import React, { useState } from 'react';
import { Receipt, Printer, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
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
  const totalCommissions = leases.reduce((acc, l) => acc + (l.agencyCommissionDzd || 0), 0);

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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Receipt size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'الإيجارات الشهرية الجارية' : 'Loyers mensuels gérés'}
            </span>
            <div className="mt-1 text-2xl font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(totalMonthlyRents, language)}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'إجمالي ودائع الضمان (Séquestre)' : 'Dépôts de garantie détenus'}
            </span>
            <div className="mt-1 text-2xl font-bold font-mono text-blue-600 tabular-nums">
              {formatMoney(totalDeposits, language)}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'عمولات الوكالة المحصلة' : 'Honoraires agence perçus'}
            </span>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              {formatMoney(totalCommissions, language)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث عن مخالصة أو مستأجر...' : 'Recherche quittance, locataire...'}
          />
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'العقار' : 'Bien'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'المستأجر' : 'Locataire'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'الإيجار الشهري' : 'Loyer'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'عمولة الوكالة' : 'Commission'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'وصل الإيجار' : 'Quittance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((lease) => (
                <tr key={lease.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">
                    {lease.propertyTitle}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {lease.tenantName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney(lease.monthlyRentDzd, language)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold">
                    {formatMoney(lease.agencyCommissionDzd || 0, language)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      En règle
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AtriumButton
                      size="xs"
                      variant="secondary"
                      onClick={() => handlePrintQuittance(lease.tenantName)}
                      icon={<Printer size={12} />}
                    >
                      {language === 'ar' ? 'وصل الكراء' : 'Quittance'}
                    </AtriumButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
