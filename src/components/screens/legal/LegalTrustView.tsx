import React, { useState } from 'react';
import { Scale, CreditCard, Printer, CheckCircle2 } from 'lucide-react';
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
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">Total des Fonds Séquestre Clients</span>
            <div className="mt-1 text-2xl font-bold font-mono text-blue-600 tabular-nums">
              {formatMoney(totalTrust, language)}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">Honoraires & Provisions Facturées</span>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              {formatMoney(totalRetainers, language)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث في حسابات الموكلين...' : 'Recherche dossier, client...'}
          />
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3">N° Dossier</th>
                <th className="px-4 py-3">Intitulé Affaire</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 text-right">Fonds en Séquestre</th>
                <th className="px-4 py-3 text-right">Provision Honoraires</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((matter) => (
                <tr key={matter.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#C4785A]">
                    {matter.matterNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                    {matter.title}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {matter.clientName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                    {formatMoney(matter.trustEscrowBalanceDzd || 0, language)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney(matter.retainerAmountDzd, language)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AtriumButton
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        showToast('Relevé de compte séquestre imprimé', 'info');
                        window.print();
                      }}
                      icon={<Printer size={12} />}
                    >
                      {language === 'ar' ? 'كشف الحساب' : 'Relevé CARPA'}
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
