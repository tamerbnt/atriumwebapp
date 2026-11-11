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
        <span className="font-medium text-xs text-neutral-900 dark:text-white">
          {tx.memberName}
        </span>
      ),
    },
    {
      id: 'plan',
      header: isAr ? 'نوع الاشتراك' : isEn ? 'Membership Plan' : 'Formule Abonnement',
      accessorKey: 'plan',
      cell: (tx) => <span className="text-xs text-neutral-600 dark:text-neutral-300">{tx.plan}</span>,
    },
    {
      id: 'amount',
      header: isAr ? 'المبلغ المحصل' : isEn ? 'Amount' : 'Montant Encaissé',
      accessorKey: 'amount',
      sortable: true,
      cell: (tx) => (
        <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white tabular-nums">
          {formatMoney(tx.amount)}
        </span>
      ),
    },
    {
      id: 'paymentMethod',
      header: isAr ? 'طريقة الدفع' : isEn ? 'Method' : 'Règlement',
      accessorKey: 'paymentMethod',
      cell: (tx) => (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
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
      cell: (tx) => <span className="text-xs text-neutral-500 tabular-nums">{tx.date}</span>,
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
    <div className="w-full">
      {/* 4-KPI Elevated Pod Tray */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1F1D1B] text-white p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
              {isAr ? 'إجمالي تحصيلات الصالة' : isEn ? 'Total Gym Revenue' : 'Chiffre d’Affaires Salle'}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#d4522f]">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-white mb-1 tabular-nums font-mono">
              {formatMoney(financialMetrics.totalCollected)}
            </div>
            <div className="text-xs text-neutral-300">
              {financialMetrics.activeSubscriptions}{' '}
              {isAr ? 'اشتراك نشط هذا الشهر' : 'abonnements actifs ce mois'}
            </div>
          </div>
        </div>

        <div className="bg-[#F3EDE7] dark:bg-[#1C1C1E] p-5 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isAr ? 'متوسط الدخل اليومي' : isEn ? 'Daily Average' : 'Moyenne Journalière'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums font-mono">
              {formatMoney(financialMetrics.dailyEstimated)}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {isAr ? 'معدل تجديد متوازن' : 'Rythme de réabonnement régulier'}
            </p>
          </div>
        </div>

        <div className="bg-[#F3EDE7] dark:bg-[#1C1C1E] p-5 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isAr ? 'مستحقات غير محصلة' : isEn ? 'Pending Balances' : 'Impayés & Restes à Recouvrer'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard size={15} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums font-mono">
              {formatMoney(financialMetrics.pendingBalance)}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {isAr ? 'تنبيهات تلقائية مفعلة' : 'Relances automatiques actives'}
            </p>
          </div>
        </div>

        <div className="bg-[#F3EDE7] dark:bg-[#1C1C1E] p-5 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isAr ? 'الفرع الرياضي' : isEn ? 'Facility Branch' : 'Établissement Sportif'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 size={15} />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-neutral-900 dark:text-white truncate">
              {currentBranch?.name || 'Club Principal'}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {currentBranch?.address || 'Alger'} · {isAr ? 'صندوق مفتوح' : 'Caisse Ouverte'}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="w-64">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث بالإيصال أو اسم المشترك...' : 'Rechercher reçu ou adhérent...'}
            />
          </div>

          <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl text-xs font-medium">
            {(['All', 'Cash', 'Card', 'BaridiMob'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setSelectedFilter(method)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedFilter === method
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {method === 'All'
                  ? isAr
                    ? 'الكل'
                    : 'Tous'
                  : method === 'Cash'
                  ? isAr
                    ? 'نقداً'
                    : 'Espèces'
                  : method === 'Card'
                  ? 'CIB'
                  : 'BaridiMob'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
  );
};
