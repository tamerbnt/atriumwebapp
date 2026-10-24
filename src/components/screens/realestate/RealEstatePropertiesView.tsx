import React, { useState } from 'react';
import { Building2, Plus, MapPin, Home, User } from 'lucide-react';
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

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الأنواع' : 'Tous les types' },
    { value: 'Apartment', label: language === 'ar' ? 'شقق' : 'Appartements' },
    { value: 'Villa', label: language === 'ar' ? 'فيلات' : 'Villas' },
    { value: 'Office', label: language === 'ar' ? 'مكاتب' : 'Bureaux' },
    { value: 'Commercial', label: language === 'ar' ? 'محلات تجارية' : 'Commerces' },
  ];

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
                {language === 'ar' ? 'محفظة العقارات والأملاك' : 'Portefeuille des Biens Immobiliers'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {properties.length} {language === 'ar' ? 'عقار' : 'lots'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة الشقق، الفيلات، المكاتب والمحلات المعروضة للكراء أو البيع'
                : 'Inventaire des biens mandatés, caractéristiques & fiches techniques'}
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

      {/* Main Content */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث في العقارات، العناوين أو الملاك...' : 'Recherche bien, adresse, propriétaire...'}
            />
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={filterOptions}
            />
          </div>
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'عقارات معروضة' : 'biens affichés'}
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prop) => (
            <div
              key={prop.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider">
                  {prop.propertyType}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    prop.status === 'Rented'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {prop.status === 'Rented'
                    ? (language === 'ar' ? 'مؤجر' : 'Loué')
                    : (language === 'ar' ? 'شاغر' : 'Disponible')}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {prop.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{prop.address}, {prop.cityWilaya}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                <span>{prop.surfaceM2} m²</span>
                <span>·</span>
                <span>{prop.roomsCount} pièces</span>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                  {formatMoney(prop.priceDzd, language)} / mois
                </div>
                <div className="text-[11px] text-neutral-500">
                  Propriétaire: {prop.ownerName}
                </div>
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
    </div>
  );
};
