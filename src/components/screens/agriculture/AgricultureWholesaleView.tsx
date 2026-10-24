import React, { useState } from 'react';
import { DollarSign, Wallet, CheckCircle2, TrendingUp, Building2, Send } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const AgricultureWholesaleView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { harvestTickets } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [settledTickets, setSettledTickets] = useState<string[]>(['pes_01']);

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const totalGrossSales = harvestTickets.reduce((acc, t) => acc + t.totalGrossDzd, 0);
  const totalMandataireFees = harvestTickets.reduce(
    (acc, t) => acc + (t.totalGrossDzd * t.mandataireFeePercent) / 100,
    0
  );
  const totalNetFarm = totalGrossSales - totalMandataireFees;

  const filteredTickets = harvestTickets.filter((t) =>
    t.cropDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destinationWholesaleMarket.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSettle = (id: string, ticketNumber: string, netAmount: number) => {
    setSettledTickets((prev) => [...prev, id]);
    showToast(
      isAr
        ? `تم استلام صافي مستحقات البيع (${formatMoney(netAmount)}) للوصل ${ticketNumber}`
        : `Encaissement du net mandataire ${formatMoney(netAmount)} confirmé`,
      'success'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'مبيعات سوق الجملة والسيولة الفلاحية' : 'Comptabilité Mandataires & Ventes Gros'}
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'مطابقة مداخيل وكلاء أسواق الجملة، اقتطاع العمولة 6%، وسيولة المستثمرة'
                : 'Rapprochement des bordereaux mandataires, commission 6% et trésorerie domaine'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالوصل أو السوق...' : 'Rechercher ticket, marché...'}
          />
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="text-neutral-500 text-xs font-medium">
            {isAr ? 'إجمالي المبيعات بالوزن (Brut)' : 'Chiffre d’Affaires Brut Pesé'}
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            {formatMoney(totalGrossSales)}
          </div>
          <div className="text-[11px] text-neutral-400">
            {harvestTickets.length} expéditions enregistrées
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="text-neutral-500 text-xs font-medium">
            {isAr ? 'عمولات وكلاء الجملة (6%)' : 'Commissions Mandataires (6%)'}
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            {formatMoney(totalMandataireFees)}
          </div>
          <div className="text-[11px] text-neutral-400">
            Frais légaux de carreau
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="text-neutral-500 text-xs font-medium">
            {isAr ? 'صافي أرباح المستثمرة الفلاحية' : 'Net Reversé au Domaine'}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {formatMoney(totalNetFarm)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            Trésorerie nette récolte
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Building2 size={15} className="text-[#C4785A]" />
          <span>{isAr ? 'تفاصيل وصولات المبيعات والعمولات' : 'Bordereaux de Vente & Règlements'}</span>
        </h3>

        {filteredTickets.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <DollarSign size={32} className="text-neutral-300 dark:text-neutral-700 mb-1" />
            <p className="text-xs font-medium text-neutral-500">
              {isAr ? 'لا توجد وصولات مبيعات' : 'Aucune expédition trouvée'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredTickets.map((t) => {
                const isSettled = settledTickets.includes(t.id);
                const fee = (t.totalGrossDzd * t.mandataireFeePercent) / 100;

                return (
                  <div
                    key={t.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">
                          {t.cropDesignation}
                        </span>
                        <span className="font-mono text-xs bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2 py-0.5 rounded">
                          {t.ticketNumber}
                        </span>
                      </div>
                      <div className="text-neutral-500">
                        {t.destinationWholesaleMarket} · {t.netWeightKg} kg à {t.unitPriceDzdPerKg} DZD/kg
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right font-mono text-xs">
                        <div className="text-[10px] text-neutral-400 uppercase">Brut - Com (6%) = Net</div>
                        <div>
                          <span className="font-semibold">{formatMoney(t.totalGrossDzd)}</span>
                          <span className="text-neutral-400"> - </span>
                          <span className="text-amber-600">{formatMoney(fee)}</span>
                          <span className="text-neutral-400"> = </span>
                          <span className="font-bold text-emerald-600">{formatMoney(t.netFarmPayoutDzd)}</span>
                        </div>
                      </div>

                      {isSettled ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>{isAr ? 'تم التحصيل' : 'Encaissé'}</span>
                        </span>
                      ) : (
                        <AtriumButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleSettle(t.id, t.ticketNumber, t.netFarmPayoutDzd)}
                          icon={<CheckCircle2 size={13} />}
                        >
                          {isAr ? 'تأكيد القبض' : 'Encaisser'}
                        </AtriumButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
