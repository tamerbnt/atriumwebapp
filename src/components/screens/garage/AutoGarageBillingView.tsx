import React, { useState } from 'react';
import { CreditCard, Printer, CheckCircle2, FileCheck } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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
      </div>

      {/* Main Container */}
      <div className="p-6 space-y-6 max-w-7xl">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs max-w-sm">
          <span className="text-xs text-neutral-500">
            {language === 'ar' ? 'إجمالي مستحقات أوامر التصليح' : 'Total facturé atelier'}
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(totalBilled, language)}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث عن فاتورة أو ماتريكيل...' : 'Rechercher facture, matricule, client...'}
          />
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'رقم OR' : 'N° OR'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الماتريكيل والسيارة' : 'Véhicule'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الزبون' : 'Client'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'المبلغ الإجمالي' : 'Montant Total'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'رخصة الخروج' : 'Bon de Sortie'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#C4785A]">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-neutral-900 dark:text-white font-mono">{order.vehiclePlate}</span>
                    <span className="text-neutral-500 ml-1.5 font-normal">({order.vehicleModel})</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {order.clientName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {order.status === 'Delivered'
                        ? (language === 'ar' ? 'مستلم ومدفوع' : 'Clôturé & Payé')
                        : (language === 'ar' ? 'قيد المتابعة' : 'En atelier')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AtriumButton
                      size="xs"
                      variant="secondary"
                      onClick={() => handlePrintExitPass(order.orderNumber)}
                      icon={<Printer size={12} />}
                    >
                      {language === 'ar' ? 'طباعة السند' : 'Bon de Sortie'}
                    </AtriumButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
