import React, { useState } from 'react';
import {
  Building2,
  Key,
  Plus,
  Home,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { RealEstatePropertyModal } from './RealEstatePropertyModal';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';

export const RealEstateDashboardView: React.FC = () => {
  const { language, setScreen } = useAtriumStore();
  const { properties, leases, addProperty, addLease } = useRealEstateData();

  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);

  const totalProps = properties.length;
  const rentedProps = properties.filter((p) => p.status === 'Rented').length;
  const availableProps = properties.filter((p) => p.status === 'Available').length;
  const monthlyRevenue = leases
    .filter((l) => l.status === 'Active')
    .reduce((acc, l) => acc + l.monthlyRentDzd, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الوكالة العقارية وإدارة الأملاك' : 'Agence Immobilière & Gestion Locative'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Facility: 20
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة محفظة العقارات، عقود الإيجار، معاينة الأماكن ومستحقات الملاك'
                : 'Portefeuille de biens, baux d\'habitation & commerciaux, quittances et états des lieux'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="secondary"
            onClick={() => setIsPropModalOpen(true)}
            icon={<Building2 size={14} />}
          >
            {language === 'ar' ? 'عقار جديد' : 'Nouveau Bien'}
          </AtriumButton>
          <AtriumButton
            variant="primary"
            onClick={() => setIsLeaseModalOpen(true)}
            icon={<Key size={14} />}
          >
            {language === 'ar' ? 'تحرير عقد كراء' : 'Nouveau Bail'}
          </AtriumButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'إجمالي المحفظة العقارية' : 'Biens en gestion'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {totalProps}
              </span>
              <span className="text-xs text-neutral-400">
                {language === 'ar' ? 'عقار' : 'lots'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'العقارات المؤجرة (نسبة الإشغال)' : 'Taux d\'occupation'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                {totalProps > 0 ? Math.round((rentedProps / totalProps) * 100) : 0}%
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                ({rentedProps} loués)
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'عقارات شاغرة معروضة' : 'Biens disponibles'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-600 tabular-nums">
                {availableProps}
              </span>
              <span className="text-xs text-amber-600 font-semibold">
                {language === 'ar' ? 'شاغر' : 'Vacants'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'إجمالي الإيجارات الشهرية' : 'Loyers mensuels'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(monthlyRevenue, language)}
              </span>
            </div>
          </div>
        </div>

        {/* Active Leases Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'عقود الكراء النشطة' : 'Baux & Contrats de Location en Cours'}
              </h2>
            </div>
            <button
              onClick={() => setScreen('scheduler')}
              className="text-xs text-[#C4785A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>{language === 'ar' ? 'عرض كل العقود' : 'Tous les baux'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {leases.map((lease) => (
              <div key={lease.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-bold flex items-center justify-center">
                    <Home size={15} className="text-neutral-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">
                      {lease.propertyTitle}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Locataire: {lease.tenantName} · Échéance: {lease.endDate}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {lease.status}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney(lease.monthlyRentDzd, language)} / mois
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RealEstatePropertyModal
        isOpen={isPropModalOpen}
        onClose={() => setIsPropModalOpen(false)}
        onSave={addProperty}
      />

      <RealEstateLeaseModal
        isOpen={isLeaseModalOpen}
        onClose={() => setIsLeaseModalOpen(false)}
        properties={properties}
        onSave={addLease}
      />
    </div>
  );
};
