import React, { useState } from 'react';
import { Key, Plus, Calendar, Home, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';

export const RealEstateLeasesView: React.FC = () => {
  const { language } = useAtriumStore();
  const { leases, properties, addLease } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);

  const filtered = leases.filter(
    (l) =>
      l.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenantPhone.includes(searchQuery)
  );

  const activeLeases = leases.filter((l) => l.status === 'Active').length;
  const totalDeposits = leases.reduce((acc, l) => acc + l.securityDepositDzd, 0);
  const totalMonthlyRent = leases
    .filter((l) => l.status === 'Active')
    .reduce((acc, l) => acc + l.monthlyRentDzd, 0);

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Key size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'عقود الكراء والاتفاقيات' : 'Baux & Contrats de Location'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {leases.length} {language === 'ar' ? 'عقد' : 'baux'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة عقود الإيجار السنوية، مواعيد التجديد، والودائع المالية'
                : 'Suivi juridique des baux, échéances de reconduction & dépôts de garantie'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsLeaseModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'تحرير عقد كراء' : 'Nouveau Bail'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'التزامات الإيجار والضمانات المالية' : 'Engagements Locatifs & Cautions Déposées'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة سريان العقود، الودائع الضامنة المحتجزة والكتلة الإيجارية الشهرية' : 'Baux en cours, montants des garanties sous séquestre et quittancement'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Baux Actifs */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'عقود الإيجار السارية' : 'Baux Actifs en Cours'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeLeases}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                100% {language === 'ar' ? 'موثقة قانونياً' : 'conformes et signés'}
              </p>
            </div>
          </div>

          {/* Card 2: Dépôts de garantie */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'مجموع الودائع الضامنة (Cautions)' : 'Dépôts de Garantie Séquestrés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatMoney(totalDeposits, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'ودائع محتجزة لحساب الملاك' : 'Fonds consignés pour garantie'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'حجم الإيجارات الشهرية' : 'Masse Locative Mensuelle'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'التحصيل الشهري' : 'Régie Quittances'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalMonthlyRent, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'عقد مطابق للبحث' : 'contrats listés'}
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
            <Key size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل عقود الإيجار والمستأجرين' : 'Registre des Baux & Locataires'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالعقار، المستأجر، الهاتف...' : 'Rechercher bien, locataire, téléphone...'}
            />
          </div>
        </div>

        {/* Leases Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'العقار المؤجر' : 'Bien Loué'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المستأجر' : 'Locataire'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم الهاتف' : 'Contact'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'فترة العقد' : 'Période du Bail'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الإيجار الشهري' : 'Loyer Mensuel'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'مبلغ الضمان' : 'Caution Déposée'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((lease) => (
                  <tr key={lease.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {lease.propertyTitle}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-800 dark:text-neutral-200 font-medium">
                      {lease.tenantName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">
                      {lease.tenantPhone}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400 text-[11px]">
                      {lease.startDate} → {lease.endDate}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(lease.monthlyRentDzd, language)}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      {formatMoney(lease.securityDepositDzd, language)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {lease.status === 'Active' ? (language === 'ar' ? 'سارٍ' : 'Actif') : lease.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RealEstateLeaseModal
        isOpen={isLeaseModalOpen}
        onClose={() => setIsLeaseModalOpen(false)}
        onSave={addLease}
        properties={properties}
      />
    </div>
  );
};
