import React, { useState } from 'react';
import { Key, Plus, Calendar, Home, CheckCircle2 } from 'lucide-react';
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Key size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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

      {/* Main Content */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث باسم المستأجر أو العقار...' : 'Rechercher locataire, bien...'}
          />
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'عقود' : 'contrats trouvés'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lease) => (
            <div
              key={lease.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C4785A] uppercase">
                  {lease.paymentFrequency}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {lease.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {lease.propertyTitle}
                </h3>
                <div className="text-xs text-neutral-500 mt-1">
                  Locataire: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{lease.tenantName}</span> ({lease.tenantPhone})
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg text-xs grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-neutral-400">Période</div>
                  <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {lease.startDate} → {lease.endDate}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400">Caution Séquestre</div>
                  <div className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                    {formatMoney(lease.securityDepositDzd, language)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                  {formatMoney(lease.monthlyRentDzd, language)} / mois
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RealEstateLeaseModal
        isOpen={isLeaseModalOpen}
        onClose={() => setIsLeaseModalOpen(false)}
        properties={properties}
        onSave={addLease}
      />
    </div>
  );
};
