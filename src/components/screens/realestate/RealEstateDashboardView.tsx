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
  CheckCircle2,
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
  const occupancyRate = totalProps > 0 ? Math.round((rentedProps / totalProps) * 100) : 0;
  const monthlyRevenue = leases
    .filter((l) => l.status === 'Active')
    .reduce((acc, l) => acc + l.monthlyRentDzd, 0);

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات المحفظة العقارية ونسب الإشغال' : 'Indicateurs de Gestion & Taux d\'Occupation'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة الأصول المدارة، الشواغر والإيرادات الشهرية التعاقدية' : 'Suivi des lots sous mandat, baux actifs et rentabilité locative'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Biens en gestion */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي المحفظة العقارية' : 'Lots en Gestion'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {totalProps}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {availableProps} {language === 'ar' ? 'شاغر ومتاح للكراء' : 'lots vacants disponibles'}
              </p>
            </div>
          </div>

          {/* Card 2: Taux d'occupation */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'نسبة الإشغال المؤجرة' : 'Taux d\'Occupation'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {occupancyRate}%
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {rentedProps} {language === 'ar' ? 'عقد كراء سارٍ' : 'baux actifs signés'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'مداخيل الإيجار الشهرية' : 'Quittancement Mensuel'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'تحصيل شهري' : 'Loyer Global'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(monthlyRevenue, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {leases.length} {language === 'ar' ? 'ملف إيجار مسجل' : 'dossiers locataires'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'نظرة على العقارات المدارة' : 'Aperçu du Parc Immobilier'}
            </h2>
          </div>
          <AtriumButton
            variant="ghost"
            size="xs"
            onClick={() => setScreen('members')}
            icon={<ChevronRight size={14} />}
          >
            {language === 'ar' ? 'عرض الكل' : 'Voir tout'}
          </AtriumButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {properties.slice(0, 6).map((prop) => (
            <div
              key={prop.id}
              className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 hover:border-[#C4785A]/40 transition-all shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                  {prop.propertyType}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    prop.status === 'Rented'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {prop.status === 'Rented' ? (language === 'ar' ? 'مؤجر' : 'Loué') : (language === 'ar' ? 'شاغر' : 'Disponible')}
                </span>
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-900 dark:text-white">
                  {prop.title}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {prop.address}, {prop.cityWilaya}
                </div>
              </div>
              <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-700/60 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-neutral-400 font-sans text-[11px]">
                  {prop.surfaceM2} m² • {prop.ownerName}
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatMoney(prop.priceDzd, language)} / {language === 'ar' ? 'شهر' : 'mois'}
                </span>
              </div>
            </div>
          ))}
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
        onSave={addLease}
        properties={properties}
      />
    </div>
  );
};
