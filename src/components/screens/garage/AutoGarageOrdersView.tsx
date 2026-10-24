import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Wrench,
  CheckCircle2,
  Clock,
  Car,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, RepairOrder } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { AutoOrderModal } from './AutoOrderModal';

export const AutoGarageOrdersView: React.FC = () => {
  const { language } = useAtriumStore();
  const { orders, vehicles, addOrder, updateOrderStatus } = useGarageData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'all') return o.status === statusFilter;
    return true;
  });

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الحالات' : 'Tous les états' },
    { value: 'Diagnostic', label: 'Diagnostic' },
    { value: 'InRepair', label: 'En réparation' },
    { value: 'ReadyForPickup', label: 'Prêt à livrer' },
    { value: 'Delivered', label: 'Livré & Clôturé' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ClipboardList size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'أوامر التصليح (Ordres de Réparation)' : 'Ordres de Réparation (OR)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {orders.length} OR
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'متابعة مراحل الإصلاح، الفحص التقني، وقطع الغيار المستهلكة'
                : 'Cycle complet atelier : Diagnostic → Réparation → Essai → Bon de sortie'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsOrderModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'أمر تصليح جديد' : 'Nouvel OR'}
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
              placeholder={language === 'ar' ? 'بحث برقم اللوحة، الزبون أو رقم OR...' : 'Recherche par matricule, client, N° OR...'}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={filterOptions}
            />
          </div>
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'أوامر' : 'ordres trouvés'}
          </div>
        </div>

        {/* Orders Cards Grid */}
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {order.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <Car size={14} className="text-neutral-400" />
                  <span>{order.vehiclePlate}</span>
                </h3>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {order.vehicleModel} · {order.clientName}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-xs text-neutral-600 dark:text-neutral-300">
                <span className="font-semibold text-neutral-400 mr-1">Panne:</span>
                {order.diagnosticNotes}
              </div>

              <div className="text-[11px] text-neutral-500">
                Technicien: <span className="font-medium text-neutral-700 dark:text-neutral-300">{order.technicianName}</span>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                  {formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}
                </div>

                <div className="flex items-center gap-1.5">
                  {order.status === 'Diagnostic' && (
                    <AtriumButton
                      size="xs"
                      variant="primary"
                      onClick={() => {
                        updateOrderStatus(order.id, 'InRepair');
                        showToast('Véhicule passé en réparation', 'info');
                      }}
                      icon={<Wrench size={12} />}
                    >
                      {language === 'ar' ? 'بدء التصليح' : 'Réparer'}
                    </AtriumButton>
                  )}
                  {order.status === 'InRepair' && (
                    <AtriumButton
                      size="xs"
                      variant="primary"
                      onClick={() => {
                        updateOrderStatus(order.id, 'ReadyForPickup');
                        showToast('Véhicule prêt pour livraison client', 'success');
                      }}
                      icon={<CheckCircle2 size={12} />}
                    >
                      {language === 'ar' ? 'جاهز للتسليم' : 'Prêt'}
                    </AtriumButton>
                  )}
                  {order.status === 'ReadyForPickup' && (
                    <AtriumButton
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        updateOrderStatus(order.id, 'Delivered');
                        showToast('Véhicule livré au client', 'success');
                      }}
                    >
                      {language === 'ar' ? 'تسليم' : 'Livrer'}
                    </AtriumButton>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AutoOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        vehicles={vehicles}
        onSave={addOrder}
      />
    </div>
  );
};
