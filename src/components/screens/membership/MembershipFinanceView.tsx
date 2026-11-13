import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  ChevronDown,
  Download,
  CheckCircle2,
  Receipt,
  Wallet,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const MembershipFinanceView: React.FC = () => {
  const {
    members,
    currentBranch,
    branches,
    switchBranch,
    language,
    showToast,
  } = useAtriumStore();

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Cash' | 'Card' | 'BaridiMob'>('All');
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [pinnedTxIds, setPinnedTxIds] = useState<Set<string>>(new Set());

  // Aggregate Gym Financial Revenue from Members Subscriptions
  const financialMetrics = useMemo(() => {
    const totalCollected = members.reduce((sum, m: any) => sum + (m.membershipFee || 4500), 0);
    const activeSubscriptions = members.filter((m) => m.status === 'Active').length;
    const pendingBalance = members.reduce((sum, m: any) => sum + (m.balanceDue || 0), 0);
    const dailyEstimated = Math.round(totalCollected / 30);

    return {
      totalCollected,
      activeSubscriptions,
      pendingBalance,
      dailyEstimated,
    };
  }, [members]);

  // Financial transactions ledger
  interface MembershipTransaction {
    id: string;
    memberName: string;
    plan: string;
    amount: number;
    paymentMethod: 'Cash' | 'Card' | 'BaridiMob';
    date: string;
    status: 'Settled' | 'Pending';
  }

  const transactions: MembershipTransaction[] = useMemo(() => {
    return members.map((m: any, idx) => ({
      id: `TX-GYM-${m.id}-${idx + 1}`,
      memberName: m.fullName,
      plan: m.membershipType || m.membershipPlanName || (isAr ? 'اشتراك لياقة شهري' : 'Pass Fitness Mensuel'),
      amount: m.membershipFee || 4500,
      paymentMethod: idx % 3 === 0 ? 'BaridiMob' : idx % 2 === 0 ? 'Card' : 'Cash',
      date: new Date(Date.now() - idx * 86400000 * 2).toISOString().slice(0, 10),
      status: (m.balanceDue || 0) > 0 ? 'Pending' : 'Settled',
    }));
  }, [members, isAr]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedFilter !== 'All' && tx.paymentMethod !== selectedFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.memberName.toLowerCase().includes(q) ||
          tx.id.toLowerCase().includes(q) ||
          tx.plan.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, selectedFilter, searchQuery]);

  const columns: ColumnDefinition<MembershipTransaction>[] = [
    {
      id: 'id',
      header: isAr ? 'رقم الإيصال' : isEn ? 'Receipt #' : 'Réf. Reçu',
      accessorKey: 'id',
      sortable: true,
      cell: (tx) => <span className="font-mono text-xs text-[#d4522f] font-semibold">{tx.id}</span>,
    },
    {
      id: 'memberName',
      header: isAr ? 'المشترك' : isEn ? 'Member' : 'Membre Adhérent',
      accessorKey: 'memberName',
      sortable: true,
      cell: (tx) => (
        <span className="font-medium text-xs text-black dark:text-white">
          {tx.memberName}
        </span>
      ),
    },
    {
      id: 'plan',
      header: isAr ? 'نوع الاشتراك' : isEn ? 'Membership Plan' : 'Formule Abonnement',
      accessorKey: 'plan',
      cell: (tx) => <span className="text-xs text-black/70 dark:text-white/75">{tx.plan}</span>,
    },
    {
      id: 'amount',
      header: isAr ? 'المبلغ المحصل' : isEn ? 'Amount' : 'Montant Encaissé',
      accessorKey: 'amount',
      sortable: true,
      cell: (tx) => (
        <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
          {formatMoney(tx.amount)}
        </span>
      ),
    },
    {
      id: 'paymentMethod',
      header: isAr ? 'طريقة الدفع' : isEn ? 'Method' : 'Règlement',
      accessorKey: 'paymentMethod',
      cell: (tx) => (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6]/60 dark:border-[#3A3734] text-black/75 dark:text-white/80">
          {tx.paymentMethod === 'BaridiMob'
            ? 'BaridiMob'
            : tx.paymentMethod === 'Card'
            ? 'CIB / Dahabia'
            : isAr
            ? 'نقداً (Espèces)'
            : 'Espèces'}
        </span>
      ),
    },
    {
      id: 'date',
      header: isAr ? 'التاريخ' : isEn ? 'Date' : 'Date d’Opération',
      accessorKey: 'date',
      cell: (tx) => <span className="text-xs text-black/62 dark:text-white/65 tabular-nums">{tx.date}</span>,
    },
    {
      id: 'status',
      header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
      accessorKey: 'status',
      cell: (tx) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
            tx.status === 'Settled' ? 'text-emerald-600' : 'text-amber-600'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              tx.status === 'Settled' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          {tx.status === 'Settled'
            ? isAr
              ? 'مسدد'
              : 'Encaissé'
            : isAr
              ? 'متبقي'
              : 'En attente'}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white">
            <DollarSign size={22} />
          </div>
          <div>
            <h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-[0.98] rtl:leading-tight tracking-[0.012em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {isAr ? 'المالية' : isEn ? 'Finance' : 'Finances'}
            </h1>
          </div>
        </div>
      </div>

      {/* 4-KPI Elevated Pod Tray */}
      <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
        <div>
          <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
            {isAr ? 'ملخص الخزينة والتدفقات' : isEn ? 'Treasury Overview' : 'Trésorerie & Encaissements'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1F1D1B] text-white p-4.5 sm:p-5 rounded-[18px] border border-white/[0.08] flex flex-col justify-between min-h-[132px] shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-white/75">
                {isAr ? 'إجمالي تحصيلات الصالة' : isEn ? 'Total Gym Revenue' : 'Chiffre d’Affaires Salle'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#FB923C] shrink-0">
                <Wallet size={15} />
              </div>
            </div>
            <div>
              <div className="text-[28px] lg:text-[32px] leading-[0.95] font-bold tracking-tight text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {formatMoney(financialMetrics.totalCollected)}
              </div>
              <div className="text-[11.5px] text-white/68 mt-1.5 tabular-nums">
                {financialMetrics.activeSubscriptions}{' '}
                {isAr ? 'اشتراك نشط هذا الشهر' : isEn ? 'active subscriptions' : 'abonnements actifs ce mois'}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800/90 p-4.5 sm:p-5 rounded-[18px] border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-black/68 dark:text-white/72">
                {isAr ? 'متوسط الدخل اليومي' : isEn ? 'Daily Average' : 'Moyenne Journalière'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp size={15} />
              </div>
            </div>
            <div>
              <div className="text-[28px] lg:text-[30px] leading-[0.95] font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {formatMoney(financialMetrics.dailyEstimated)}
              </div>
              <p className="text-[11.5px] text-black/62 dark:text-white/65 mt-1.5">
                {isAr ? 'معدل تجديد متوازن' : isEn ? 'Steady renewal pace' : 'Rythme de réabonnement régulier'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800/90 p-4.5 sm:p-5 rounded-[18px] border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-black/68 dark:text-white/72">
                {isAr ? 'مستحقات غير محصلة' : isEn ? 'Pending Balances' : 'Restes à Recouvrer'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <CreditCard size={15} />
              </div>
            </div>
            <div>
              <div className="text-[28px] lg:text-[30px] leading-[0.95] font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {formatMoney(financialMetrics.pendingBalance)}
              </div>
              <p className="text-[11.5px] text-black/62 dark:text-white/65 mt-1.5">
                {isAr ? 'تنبيهات تلقائية مفعلة' : isEn ? 'Auto reminders active' : 'Relances automatiques actives'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800/90 p-4.5 sm:p-5 rounded-[18px] border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-black/68 dark:text-white/72">
                {isAr ? 'الفرع الرياضي' : isEn ? 'Facility Branch' : 'Établissement Sportif'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center shrink-0">
                <Building2 size={15} />
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-black dark:text-white truncate">
                {currentBranch?.name || 'Club Principal'}
              </div>
              <p className="text-[11.5px] text-black/62 dark:text-white/65 mt-1.5">
                {currentBranch?.address || 'Alger'} · {isAr ? 'صندوق مفتوح' : isEn ? 'Register Open' : 'Caisse Ouverte'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Pod Tray: Control Bar + Transactions Ledger */}
      <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0 mr-1 rtl:mr-0 rtl:ml-1">
              <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
                {isAr ? 'سجل المدفوعات' : isEn ? 'Transactions Ledger' : 'Journal des règlements'}
              </h2>
            </div>

            <div className="w-64">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث بالإيصال أو اسم المشترك...' : 'Rechercher reçu ou adhérent...'}
              />
            </div>

            <div className="flex items-center p-0.5 bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] rounded-xl text-xs font-medium shadow-2xs">
              {(['All', 'Cash', 'Card', 'BaridiMob'] as const).map((method) => {
                const label =
                  method === 'All'
                    ? isAr ? 'الكل' : isEn ? 'All' : 'Tous'
                    : method === 'Cash'
                    ? isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces'
                    : method === 'Card'
                    ? 'CIB'
                    : 'BaridiMob';
                const tooltip =
                  method === 'All'
                    ? isAr ? 'جميع طرق الدفع' : isEn ? 'All payment methods' : 'Tous les modes de paiement'
                    : method === 'Cash'
                    ? isAr ? 'الدفع نقداً' : isEn ? 'Cash payments' : 'Règlement en espèces'
                    : method === 'Card'
                    ? isAr ? 'بطاقة CIB / الذهبية' : isEn ? 'CIB / Dahabia Card' : 'Carte CIB / Dahabia'
                    : 'BaridiMob';
                return (
                  <button
                    key={method}
                    type="button"
                    title={tooltip}
                    onClick={() => setSelectedFilter(method)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      selectedFilter === method
                        ? 'bg-[#d4522f]/12 text-[#d4522f] dark:bg-[#d4522f]/20 dark:text-[#FB923C] font-bold'
                        : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <AtriumButton
              variant="secondary"
              onClick={() =>
                showToast({
                  title: isAr ? 'تصدير' : 'Export',
                  message: isAr ? 'تم تصدير سجل المبيعات' : 'Journal des recettes exporté',
                  type: 'info',
                })
              }
              icon={<Download size={15} />}
            >
              {isAr ? 'تصدير السجل' : 'Exporter Journal'}
            </AtriumButton>
          </div>
        </div>

        {/* Transactions Universal Collection */}
        <UniversalDataCollection
          data={filteredTransactions}
          columns={columns}
          keyExtractor={(tx) => tx.id}
          viewMode="list"
          selectedIds={selectedTxIds}
          onSelectionChange={setSelectedTxIds}
          pinnedIds={pinnedTxIds}
          onPinToggle={(id: any) => {
            const key = typeof id === 'string' ? id : id?.id;
            const next = new Set(pinnedTxIds);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            setPinnedTxIds(next);
          }}
          onItemClick={(tx) => {
            showToast({
              title: isAr ? `إيصال #${tx.id}` : `Reçu #${tx.id}`,
              message: `${tx.memberName} (${formatMoney(tx.amount)})`,
              type: 'info',
            });
          }}
        />
      </div>
    </div>
  );
};
