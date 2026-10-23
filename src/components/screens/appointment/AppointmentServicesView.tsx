import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Plus,
  Search,
  Sparkles,
  Clock,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

export const AppointmentServicesView: React.FC = () => {
  const { language } = useTranslation();
  const { servicesCatalog, products, currentBranch } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<'services' | 'retail'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    servicesCatalog.forEach((s) => set.add(s.category));
    return ['All', ...Array.from(set)];
  }, [servicesCatalog]);

  const filteredServices = useMemo(() => {
    return servicesCatalog.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [servicesCatalog, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Scissors size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'كتالوج الخدمات ومنتجات العناية' : language === 'fr' ? 'Prestations, Forfaits & Soins Boutique' : 'Services & Salon Treatments'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {servicesCatalog.length} {language === 'ar' ? 'خدمات تجميل وصالون مسجلة' : language === 'fr' ? 'soins capillaires, esthétique, massages et forfaits mariée' : 'beauty treatments and packages'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث عن خدمة...' : 'Recherche prestation...'}
              openWidth={260}
              shutSize={36}
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white dark:bg-[#18181B] rounded-[22px] p-5 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {service.category}
                </span>
                <span className="flex items-center gap-1 text-neutral-400 font-mono text-[11px]">
                  <Clock size={12} /> {service.durationMinutes} min
                </span>
              </div>

              <h3 className="font-bold text-base text-neutral-900 dark:text-white mt-1">
                {service.name}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                {service.description || 'Prestation professionnelle réalisée au fauteuil ou en cabine de soins.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-base font-black text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(service.price, language)}
              </span>
              <span className="text-xs font-bold text-[#C4785A]">
                Disponible au salon
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
