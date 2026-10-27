import React, { useState } from 'react';
import { DollarSign, Wallet, CheckCircle2, TrendingUp, Building2, Send, Clock, Printer } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';

export const AgricultureWholesaleView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { harvestTickets } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [settledTickets, setSettledTickets] = useState<string[]>(['pes_01']);

  const totalGrossSales = harvestTickets.reduce((acc, t) => acc + t.totalGrossDzd, 0);
  const totalMandataireFees = harvestTickets.reduce(
    (acc, t) => acc + (t.totalGrossDzd * t.mandataireFeePercent) / 100,
    0
  );
  const totalNetFarm = totalGrossSales - totalMandataireFees;

  const filteredTickets = harvestTickets.filter((t) => {
    const matchesSearch =
      t.cropDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destinationWholesaleMarket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const isSettled = settledTickets.includes(t.id);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'settled' && isSettled) ||
      (statusFilter === 'pending' && !isSettled);

    return matchesSearch && matchesStatus;
  });

  const handleSettle = (id: string, ticketNumber: string, netAmount: number) => {
    setSettledTickets((prev) => [...prev, id]);
    showToast(
      isAr
        ? `تم استلام صافي مستحقات البيع (${formatMoney(netAmount)}) للوصل ${ticketNumber}`
        : `Encaissement du net mandataire ${formatMoney(netAmount)} confirmé`,
      'success'
    );
  };

  const statusOptions = [
    { value: 'all', label: isAr ? 'جميع المعاملات' : 'Toutes les expéditions' },
    { value: 'settled', label: isAr ? 'تم التحصيل' : 'Encaissés' },
    { value: 'pending', label: isAr ? 'قيد التحصيل' : 'En attente de règlement' },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Wallet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'مبيعات سوق الجملة والسيولة الفلاحية' : 'Comptabilité Mandataires & Ventes Gros'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Commission 6%
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'مطابقة مداخيل وكلاء أسواق الجملة، اقتطاع العمولة 6%، وسيولة المستثمرة'
                : 'Rapprochement des bordereaux mandataires, commission 6% et trésorerie domaine'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => window.print()}
            icon={<Printer size={14} />}
          >
            {isAr ? 'طباعة الكشف' : 'Imprimer Grand-Livre'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'حسابات الوكلاء والمبيعات الإجمالية' : 'Comptabilité Ventes Gros & Mandataires'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة المبيعات الإجمالية بالأسواق، نسبة عمولة الوكيل القانونية والسيولة المقبوضة'
              : 'Volumes marchands réalisés en criée, frais d\'intermédiation et encaissements'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Chiffre d'affaires brut */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي المبيعات الإجمالية (Brut)' : 'Chiffre d’Affaires Brut Gros'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalGrossSales)}
              </div>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                {harvestTickets.length} {isAr ? 'شحنات مسوقة' : 'expéditions aux mandataires'}
              </p>
            </div>
          </div>

          {/* Card 2: Commission Mandataire */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'عمولة الوكلاء المقتطعة (6%)' : 'Commissions Mandataires (6%)'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {formatMoney(totalMandataireFees)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'حسب القوانين السارية' : 'Tarification légale marchés'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'صافي مستحقات المزرعة' : 'Net à Verser Domaine'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Trésorerie Gros
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalNetFarm)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {settledTickets.length} {isAr ? 'وصولات مسددة بالكامل' : 'bordereaux encaissés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'سجل تسويات وكلاء أسواق الجملة' : 'Bordereaux de Vente & Suivi Mandataires'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredTickets.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-56">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث بالمنتج، السوق...' : 'Filtrer produit, marché...'}
              />
            </div>
            <div className="w-48">
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
              />
            </div>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <DollarSign size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد وصولات بيع مطابقة للبحث' : 'Aucune expédition correspondant aux filtres'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => {
              const isSettled = settledTickets.includes(t.id);
              return (
                <div
                  key={t.id}
                  className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isSettled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {isSettled ? (isAr ? 'مقبوض' : 'Encaissé') : (isAr ? 'في الانتظار' : 'En Attente')}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">
                        {t.date}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {t.cropDesignation}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 pt-0.5">
                      <span>Poids Net: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{t.netWeightKg.toLocaleString()} kg</strong></span>
                      <span>·</span>
                      <span>Prix Criée: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{t.unitPriceDzdPerKg} DZD/kg</strong></span>
                      <span>·</span>
                      <span>Com. Mandataire (6%): <strong className="font-mono text-amber-600">-{formatMoney((t.totalGrossDzd * 6) / 100)}</strong></span>
                    </div>

                    <p className="text-[11px] text-neutral-400">
                      Mandataire / Marché: {t.destinationWholesaleMarket} · Chauffeur: {t.driverName}
                    </p>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                        Net Revenu Domaine
                      </span>
                      <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
                        {formatMoney(t.netFarmPayoutDzd)}
                      </span>
                    </div>

                    {!isSettled ? (
                      <AtriumButton
                        size="xs"
                        variant="primary"
                        onClick={() => handleSettle(t.id, t.ticketNumber, t.netFarmPayoutDzd)}
                        icon={<Send size={12} />}
                      >
                        {isAr ? 'تأكيد القبض' : 'Encaisser'}
                      </AtriumButton>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={14} />
                        <span>{isAr ? 'تم التحصيل' : 'Règlement Reçu'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
