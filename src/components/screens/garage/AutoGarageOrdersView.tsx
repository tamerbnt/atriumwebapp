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

  const activeCount = orders.filter((o) => o.status === 'InRepair' || o.status === 'Diagnostic').length;
  const readyCount = orders.filter((o) => o.status === 'ReadyForPickup').length;
  const totalBilled = orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الحالات' : 'Tous les états' },
    { value: 'Diagnostic', label: 'Diagnostic' },
    { value: 'InRepair', label: 'En réparation' },
    { value: 'ReadyForPickup', label: 'Prêt à livrer' },
    { value: 'Delivered', label: 'Livré & Clôturé' },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'حالة أوامر الصيانة ومراحل الإنجاز' : 'État des Ordres de Travail & Disponibilité'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة وتيرة العمل على الرافعات وتجهيز المركبات' : 'Répartition des véhicules par phase d\'intervention'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: En cours */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'أوامر تحت الإنجاز / فحص' : 'En Réparation / Diagnostic'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeCount}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                {language === 'ar' ? 'قيد العمل الفعلي بالورشة' : 'Postes de travail occupés'}
              </p>
            </div>
          </div>

          {/* Card 2: Prêts à livrer */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'جاهزة للتسليم للزبون' : 'Prêtes à Livrer'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {readyCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'تم إجراء الفحص التجريبي النهائي' : 'Contrôle qualité final validé'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'إجمالي تقديرات الأوامر' : 'Masse Financière OR'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'قيمة الإصلاحات' : 'Devis & Factures'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalBilled, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'أمر مصفى' : 'dossiers affichés'}
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
            <ClipboardList size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'جدول أوامر التصليح' : 'Liste des Ordres de Réparation'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث باللوحة، الزبون، OR...' : 'Recherche matricule, client, OR...'}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={filterOptions}
            />
          </div>
        </div>

        {/* Orders Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم OR' : 'N° OR'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المركبة' : 'Véhicule'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الزبون' : 'Client'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'التشخيص' : 'Diagnostic'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'التقدير' : 'Coût'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الإجراء' : 'Progression'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#C4785A]">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {order.vehiclePlate}
                      <span className="block text-[11px] font-normal text-neutral-400">
                        {order.vehicleModel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                      {order.clientName}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                      {order.diagnosticNotes}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'ReadyForPickup'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : order.status === 'InRepair'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : order.status === 'Delivered'
                            ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left">
                      {order.status === 'Diagnostic' && (
                        <AtriumButton
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            updateOrderStatus(order.id, 'InRepair');
                            showToast('OR passé en réparation', 'info');
                          }}
                        >
                          {language === 'ar' ? 'بدء التصليح' : 'Lancer'}
                        </AtriumButton>
                      )}
                      {order.status === 'InRepair' && (
                        <AtriumButton
                          size="xs"
                          variant="primary"
                          onClick={() => {
                            updateOrderStatus(order.id, 'ReadyForPickup');
                            showToast('Véhicule prêt à livrer', 'success');
                          }}
                        >
                          {language === 'ar' ? 'جاهز للتسليم' : 'Prêt'}
                        </AtriumButton>
                      )}
                      {order.status === 'ReadyForPickup' && (
                        <AtriumButton
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            updateOrderStatus(order.id, 'Delivered');
                            showToast('Véhicule remis au client', 'success');
                          }}
                        >
                          {language === 'ar' ? 'تسليم' : 'Livrer'}
                        </AtriumButton>
                      )}
                      {order.status === 'Delivered' && (
                        <span className="text-[11px] text-emerald-600 flex items-center justify-end rtl:justify-start gap-1 font-semibold">
                          <CheckCircle2 size={13} />
                          {language === 'ar' ? 'مكتمل' : 'Clôturé'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AutoOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSave={addOrder}
        vehicles={vehicles}
      />
    </div>
  );
};
