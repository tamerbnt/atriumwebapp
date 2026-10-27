import React, { useState } from 'react';
import { CreditCard, Printer, CheckCircle2, FileCheck, ShieldCheck, DollarSign } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const AutoGarageBillingView: React.FC = () => {
  const { language } = useAtriumStore();
  const { orders } = useGarageData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = orders.filter(
    (o) =>
      o.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBilled = orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered');
  const paidVolume = deliveredOrders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);
  const pendingVolume = totalBilled - paidVolume;

  const handlePrintExitPass = (orderNumber: string) => {
    showToast(
      language === 'ar'
        ? `جاري طباعة رخصة الخروج والفاتورة ${orderNumber}...`
        : `Impression du bon de sortie et facture ${orderNumber}...`,
      'info'
    );
    window.print();
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الفواتير ورخص الخروج (Bons de Sortie)' : 'Facturation Atelier & Bons de Sortie'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Gate Pass Authorized
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'تسوية حسابات التصليح، إصدار فواتير الصيانة وسندات استلام المركبات'
                : 'Clôture comptable, décompte pièces/main d\'œuvre & bons de sortie atelier'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => window.print()}
            icon={<Printer size={14} />}
          >
            {language === 'ar' ? 'طباعة كشف الحساب' : 'Bordereau Caisse'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات التحصيل والفوترة المالية' : 'Recouvrement & Encaissements Atelier'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'توزيع المداخيل بين المبالغ المسددة والمستحقات قيد التسوية عند التسليم' : 'Ventilation des règlements clients et encaissements à la restitution'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Facturé Total */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي فواتير الصيانة' : 'Facturation Globale OR'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalBilled, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {orders.length} {language === 'ar' ? 'أمر صيانة' : 'dossiers facturés'}
              </p>
            </div>
          </div>

          {/* Card 2: En cours de règlement */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'مستحقات قيد التسليم' : 'En Attente de Règlement'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {formatMoney(pendingVolume, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {orders.length - deliveredOrders.length} {language === 'ar' ? 'مركبة قيد الإنجاز' : 'véhicules non livrés'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'خزينة الورشة المحصلة' : 'Encaissements Encaissés'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'المحصل نقداً' : 'Caisse Réglée'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(paidVolume, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {deliveredOrders.length} {language === 'ar' ? 'أمر تم استيفاؤه' : 'bons de sortie délivrés'}
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
            <CreditCard size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل فواتير ورخص خروج الورشة' : 'Registre des Règlements & Sorties'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث باللوحة، الزبون، N° OR...' : 'Recherche matricule, client, N° OR...'}
            />
          </div>
        </div>

        {/* Billing Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم OR' : 'N° OR'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المركبة' : 'Véhicule'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الزبون' : 'Client'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'المبلغ الإجمالي' : 'Montant Facturé'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((order) => {
                  const isDelivered = order.status === 'Delivered';
                  return (
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
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isDelivered
                            ? (language === 'ar' ? 'مسدد وخارج' : 'Réglé & Sorti')
                            : (language === 'ar' ? 'قيد التحصيل' : 'En Atelier')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left">
                        <AtriumButton
                          size="xs"
                          variant="outline"
                          onClick={() => handlePrintExitPass(order.orderNumber)}
                          icon={<Printer size={13} />}
                        >
                          {language === 'ar' ? 'رخصة خروج' : 'Bon de Sortie'}
                        </AtriumButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
