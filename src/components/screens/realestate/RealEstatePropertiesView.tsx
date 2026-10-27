import React, { useState } from 'react';
import { Building2, Plus, MapPin, Home, User, CheckCircle2 } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { RealEstatePropertyModal } from './RealEstatePropertyModal';

export const RealEstatePropertiesView: React.FC = () => {
  const { language } = useAtriumStore();
  const { properties, addProperty } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);

  const filtered = properties.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cityWilaya.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (typeFilter !== 'all') return p.propertyType === typeFilter;
    return true;
  });

  const availableCount = properties.filter((p) => p.status === 'Available').length;
  const rentedCount = properties.filter((p) => p.status === 'Rented').length;
  const totalPotentialRent = properties.reduce((acc, p) => acc + p.priceDzd, 0);

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الأنواع' : 'Tous les types' },
    { value: 'Apartment', label: language === 'ar' ? 'شقق' : 'Appartements' },
    { value: 'Villa', label: language === 'ar' ? 'فيلات' : 'Villas' },
    { value: 'Office', label: language === 'ar' ? 'مكاتب' : 'Bureaux' },
    { value: 'Commercial', label: language === 'ar' ? 'محلات تجارية' : 'Commerces' },
  ];

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
                {language === 'ar' ? 'محفظة العقارات والأملاك' : 'Portefeuille des Biens Immobiliers'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {properties.length} lots
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'فهرس الشقق، الفيلات، المحلات والمكاتب المعروضة للإيجار'
                : 'Inventaire des mandats de gestion, caractéristiques & valeurs locatives'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsPropModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'عقار جديد' : 'Nouveau Bien'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات المحفظة العقارية والشواغر' : 'Disponibilités & Répartition du Parc'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة الشواغر المتاحة للتأجير والعقارات المشغولة حالياً' : 'Lots disponibles à la location et valeur locative théorique globale'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Lots Totaux */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي العقارات المسجلة' : 'Parc Foncier Géré'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {properties.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {rentedCount} {language === 'ar' ? 'مشغول حالياً' : 'occupés sous bail'}
              </p>
            </div>
          </div>

          {/* Card 2: Lots Disponibles */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'عقارات شاغرة معروضة للكراء' : 'Biens Immédiatement Vacants'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {availableCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'جاهزة للمعاينات وتوقيع العقود' : 'Disponibles pour visites'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'القيمة الإيجارية الشهرية' : 'Valeur Locative Mensuelle'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'طاقة التأجير' : 'Capacité Théorique'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalPotentialRent, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'عقار معروض' : 'lots affichés'}
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
            <Building2 size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'جدول العقارات' : 'Registre des Mandats & Biens'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالاسم، العنوان، المالك...' : 'Rechercher titre, adresse, propriétaire...'}
            />
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={filterOptions}
            />
          </div>
        </div>

        {/* Properties Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'العقار' : 'Bien & Désignation'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الموقع / الولاية' : 'Adresse & Wilaya'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المالك' : 'Propriétaire'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'المساحة' : 'Surface'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الإيجار الشهري' : 'Loyer Demandé'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {p.title}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C4785A]/15 text-[#C4785A]">
                        {p.propertyType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400">
                      {p.address}, {p.cityWilaya}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                      {p.ownerName}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-700 dark:text-neutral-300">
                      {p.surfaceM2} m²
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(p.priceDzd, language)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'Rented'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {p.status === 'Rented'
                          ? (language === 'ar' ? 'مؤجر' : 'Loué')
                          : (language === 'ar' ? 'شاغر' : 'Disponible')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RealEstatePropertyModal
        isOpen={isPropModalOpen}
        onClose={() => setIsPropModalOpen(false)}
        onSave={addProperty}
      />
    </div>
  );
};
