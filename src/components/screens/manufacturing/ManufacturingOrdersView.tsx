import React, { useState } from 'react';
import {
  Factory,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { ManufacturingOrderModal } from './ManufacturingOrderModal';

export const ManufacturingOrdersView: React.FC = () => {
  const { language } = useAtriumStore();
  const { orders, boms, addOrder, updateOrderStatus } = useManufacturingData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.assignedStation.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'all') return o.status === statusFilter;
    return true;
  });

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الحالات' : 'Tous les états' },
    { value: 'Planned', label: 'Planifié' },
    { value: 'InProduction', label: 'En production' },
    { value: 'Completed', label: 'Terminé' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Factory size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'أوامر التصنيع والإنتاج (OF)' : 'Ordres de Fabrication (OF)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {orders.length} OF
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إطلاق دفعات الإنتاج، متابعة نسبة الإنجاز ومحطات التشغيل'
                : 'Pilotage d\'atelier, cadences de fabrication & suivi des postes d\'assemblage'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsOrderModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'أمر تصنيع جديد' : 'Nouvel OF'}
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
              placeholder={language === 'ar' ? 'بحث برقم الأمر، المنتج أو الورشة...' : 'Recherche par N° OF, article, poste...'}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={filterOptions}
            />
          </div>
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'أوامر تصنيع' : 'ordres trouvés'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-[#C4785A]">
                  {order.orderNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    order.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : order.status === 'InProduction'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {order.productName}
                </h3>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Poste: {order.assignedStation}
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg text-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-neutral-400">Quantité</div>
                  <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {order.quantityProduced} / {order.quantityOrdered}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-neutral-400">Échéance</div>
                  <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {new Date(order.targetDueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                {order.status === 'Planned' && (
                  <AtriumButton
                    size="xs"
                    variant="primary"
                    onClick={() => {
                      updateOrderStatus(order.id, 'InProduction');
                      showToast('Ordre de fabrication lancé en atelier', 'info');
                    }}
                    icon={<Play size={12} />}
                  >
                    {language === 'ar' ? 'بدء التصنيع' : 'Lancer'}
                  </AtriumButton>
                )}
                {order.status === 'InProduction' && (
                  <AtriumButton
                    size="xs"
                    variant="primary"
                    onClick={() => {
                      updateOrderStatus(order.id, 'Completed');
                      showToast('Fabrication terminée avec succès', 'success');
                    }}
                    icon={<CheckCircle2 size={12} />}
                  >
                    {language === 'ar' ? 'إنهاء الأمر' : 'Clôturer'}
                  </AtriumButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ManufacturingOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        boms={boms}
        onSave={addOrder}
      />
    </div>
  );
};
