import React, { useState } from 'react';
import { Scale, CreditCard, Printer, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const LegalTrustView: React.FC = () => {
  const { language } = useAtriumStore();
  const { matters } = useLegalData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = matters.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.matterNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTrust = matters.reduce((acc, m) => acc + (m.trustEscrowBalanceDzd || 0), 0);
  const totalRetainers = matters.reduce((acc, m) => acc + m.retainerAmountDzd, 0);

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'حساب الحراسة والودائع والأتعاب (Séquestre)' : 'Compte Séquestre & Honoraires Avocat'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Ordre des Avocats
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'فصل أموال الموكلين المودعة تحت الحراسة القضائية عن الأتعاب التشغيلية للمكتب'
                : 'Séparation stricte des fonds mandants (séquestre) et des honoraires de diligence'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => {
              showToast(language === 'ar' ? 'طباعة كشف حساب الودائع CARPA' : 'Relevé séquestre CARPA imprimé', 'info');
              window.print();
            }}
            icon={<Printer size={14} />}
          >
            {language === 'ar' ? 'كشف Séquestre' : 'Relevé CARPA'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'إدارة أموال الموكلين والودائع القضائية' : 'Comptabilité des Fonds Mandants & Diligences'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'الفصل المحاسبي الصارم بين أتعاب المحامي والمبالغ المودعة على ذمة الأحكام' : 'Fonds séquestre protégés et décomptes d\'honoraires selon déontologie du barreau'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Honoraires */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'أتعاب الدفاع والخدمات' : 'Honoraires & Diligences'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalRetainers, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {matters.length} {language === 'ar' ? 'قضية محصلة' : 'affaires conventionnées'}
              </p>
            </div>
          </div>

          {/* Card 2: Affaires avec séquestre */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'قضايا مودعة تحت الحراسة' : 'Dossiers Sous Séquestre'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {matters.filter((m) => (m.trustEscrowBalanceDzd || 0) > 0).length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'خاضعة لإشراف نقابة المحامين' : 'Contrôlés sous égide déontologique'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'إجمالي الودائع (Séquestre)' : 'Fonds Séquestre Protégés'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Séquestre CARPA
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalTrust, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'حساب مصفى' : 'comptes audités'}
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
            <Scale size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل الحسابات والودائع' : 'Relevé des Comptes Séquestres & Honoraires'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالقضية، الموكل، الوديعة...' : 'Rechercher affaire, client, séquestre...'}
            />
          </div>
        </div>

        {/* Trust Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم القضية' : 'N° Dossier'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الموضوع' : 'Affaire'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الموكل' : 'Client Mandant'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'أتعاب المكتب' : 'Honoraires Diligence'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'رصيد الوديعة (Séquestre)' : 'Solde Séquestre CARPA'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#C4785A]">
                      {m.matterNumber}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {m.title}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                      {m.clientName}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(m.retainerAmountDzd, language)}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {language === 'ar' ? 'مطابق ومحمي' : 'Conforme CARPA'}
                      </span>
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
