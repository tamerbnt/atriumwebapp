import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Printer,
  ArrowRight,
  DollarSign,
  Activity,
  Download,
  Pin,
  X,
  FileText,
  UserCheck,
  Building2,
  Receipt,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { MedicalConsultation } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const MedicalBillingView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { consultations, markConsultationPaid } = useMedicalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('consultationDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['cons_02']));
  const [selectedConsultation, setSelectedConsultation] = useState<MedicalConsultation | null>(() => consultations[0] || null);
  const [activeTab, setActiveTab] = useState<'decompte' | 'tiers_payant' | 'actions'>('decompte');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Dahabia' | 'BaridiMob'>('Cash');

  const filtered = useMemo(() => {
    return consultations.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.patientName.toLowerCase().includes(q) ||
        c.chiefComplaint.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === 'paid') return c.isPaid;
      if (statusFilter === 'pending') return !c.isPaid;
      return true;
    });
  }, [consultations, searchQuery, statusFilter]);

  const sortedConsultations = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      if (sortBy === 'consultationFeeDzd') {
        return sortDir === 'asc'
          ? a.consultationFeeDzd - b.consultationFeeDzd
          : b.consultationFeeDzd - a.consultationFeeDzd;
      }
      if (sortBy === 'patientName') {
        return sortDir === 'asc'
          ? a.patientName.localeCompare(b.patientName)
          : b.patientName.localeCompare(a.patientName);
      }
      return sortDir === 'asc'
        ? a.consultationDate.localeCompare(b.consultationDate)
        : b.consultationDate.localeCompare(a.consultationDate);
    });
    return list;
  }, [filtered, pinnedIds, sortBy, sortDir]);

  const totalFee = consultations.reduce((acc, c) => acc + c.consultationFeeDzd, 0);
  const totalPaid = consultations.reduce((acc, c) => acc + (c.isPaid ? c.consultationFeeDzd : 0), 0);
  const totalInsurance = consultations.reduce((acc, c) => acc + c.insuranceShareDzd, 0);

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    showToast(isAr ? 'تم تحديث التثبيت' : 'Statut épinglé mis à jour', 'info');
  };

  const handlePay = (c: MedicalConsultation) => {
    markConsultationPaid(c.id);
    setSelectedConsultation({ ...c, isPaid: true });
    showToast(isAr ? 'تم تسجيل الدفع وإصدار المخالصة' : 'Paiement enregistré & quittance validée', 'success');
  };

  const handlePrintReceipt = (c: MedicalConsultation) => {
    showToast(isAr ? 'جاري طباعة إيصال الدفع...' : 'Génération de la quittance médicale...', 'info');
  };

  const columns: ColumnDefinition<MedicalConsultation>[] = [
    {
      key: 'patientName',
      header: isAr ? 'المريض / الفحص' : 'Patient & Acte Médical',
      sortable: true,
      minWidth: '220px',
      renderCell: (c) => {
        const isPinned = pinnedIds.has(c.id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-neutral-800">
              <Receipt size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                {c.patientName}
                {isPinned && <span className="text-xs text-amber-500">📌</span>}
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">
                Réf: {c.id} · {c.consultationDate.split('T')[0]}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'consultationFeeDzd',
      header: isAr ? 'الأتعاب الإجمالية' : 'Total Honoraires',
      sortable: true,
      minWidth: '130px',
      renderCell: (c) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {formatMoney(c.consultationFeeDzd, 'DZD')}
        </div>
      ),
    },
    {
      key: 'copayAmountDzd',
      header: isAr ? 'حصة المريض' : 'Part Patient',
      minWidth: '120px',
      renderCell: (c) => (
        <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
          {formatMoney(c.copayAmountDzd || 0, 'DZD')}
        </div>
      ),
    },
    {
      key: 'insuranceShareDzd',
      header: isAr ? 'تغطية Chifa' : 'Tiers Payant Chifa',
      minWidth: '130px',
      renderCell: (c) => (
        <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
          {formatMoney(c.insuranceShareDzd || 0, 'DZD')}
        </div>
      ),
    },
    {
      key: 'isPaid',
      header: isAr ? 'حالة التحصيل' : 'Statut Recouvrement',
      sortable: true,
      minWidth: '120px',
      renderCell: (c) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            c.isPaid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          {c.isPaid ? (isAr ? 'مدفوع' : 'Encaissé') : (isAr ? 'معلق' : 'En attente')}
        </span>
      ),
    },
  ];

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
                {isAr ? 'الفواتير والضمان الاجتماعي (Chifa / CNAS)' : 'Facturation Clinique & Tiers Payant Chifa'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                CNAS / CASNOS
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تحصيل أتعاب الفحص الطبي، مستحقات الصندوق والتأمين الصحي التكميلي'
                : 'Ticket modérateur, télétransmission Chifa & bordereaux d\'encaissement'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => showToast(isAr ? 'جاري تصدير التقرير المالي...' : 'Exportation du bordereau CNAS...', 'info')}
            icon={<Printer size={14} />}
          >
            {isAr ? 'طباعة كشف CNAS' : 'Bordereau Chifa'}
          </AtriumButton>
        </div>
      </div>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات التحصيل الطبي والتأمين' : 'Indicateurs de Recouvrement & Tiers-Payant'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'توزيع الأتعاب بين التغطية التأمينية والتحصيل الفوري' : 'Répartition des honoraires conventionnés et encaissements patients'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الأتعاب المقررة' : 'Volume d\'Honoraires Total'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalFee, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {consultations.length} {isAr ? 'فحص مسجل' : 'actes facturés'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'حصة التأمين الصحي (Chifa)' : 'Prise en Charge CNAS/CASNOS'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatMoney(totalInsurance, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'بانتظار التحويل البنكي للصندوق' : 'Bordereaux en cours de télétransmission'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'المتحصلات الفعلية' : 'Encaissements Encaissés'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                RECOUVREMENT
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {formatMoney(totalPaid, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span>Reste à percevoir: {formatMoney(totalFee - totalPaid, 'DZD')}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'دفتر الفواتير والتحصيل الطبي' : 'Journal de Facturation & Recouvrement'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {sortedConsultations.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث برقم الفاتورة أو اسم المريض...' : 'Rechercher facture, patient...'}
              shutSize={36}
              openWidth={220}
            />

            {/* Billing Domain Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(
                [
                  { id: 'all', label: isAr ? 'الكل' : 'Toutes' },
                  { id: 'paid', label: isAr ? 'تم التحصيل' : 'Encaissées' },
                  { id: 'pending', label: isAr ? 'قيد الانتظار' : 'En attente' },
                ] as const
              ).map((filter) => {
                const isActive = statusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setStatusFilter(filter.id)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Workspace Area with Dual Collection and 390px Inspector */}
        <div className="flex items-start gap-4">
          {/* Collection */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<MedicalConsultation>
            items={sortedConsultations}
            keyExtractor={(c) => c.id}
            defaultViewMode={viewMode}
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(key) => {
              if (sortBy === key) {
                setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortBy(key);
                setSortDir('asc');
              }
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isPinned={(c) => pinnedIds.has(c.id)}
            onTogglePin={(c) => handleTogglePin(c.id)}
            onItemClick={(c) => setSelectedConsultation(c)}
            customActions={(c) => [
              {
                id: 'pay',
                label: c.isPaid ? (isAr ? 'تم التحصيل' : 'Réglé') : (isAr ? 'تحصيل' : 'Encaisser'),
                icon: <CreditCard size={13} />,
                variant: 'primary',
                onClick: () => {
                  if (!c.isPaid) handlePay(c);
                  else showToast('Facture déjà encaissée', 'info');
                },
              },
              {
                id: 'receipt',
                label: isAr ? 'إيصال' : 'Quittance',
                icon: <Printer size={13} />,
                onClick: () => handlePrintReceipt(c),
              },
            ]}
            renderCard={(c) => {
              const isPinned = pinnedIds.has(c.id);
              return (
                <div className="flex flex-col w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {c.patientName} {isPinned && '📌'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {c.isPaid ? 'Réglé' : 'En attente'}
                    </span>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Honoraires:</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{formatMoney(c.consultationFeeDzd, 'DZD')}</span>
                    </div>
                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                      <span>Prise en charge:</span>
                      <span>{formatMoney(c.insuranceShareDzd || 0, 'DZD')}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-300 pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                      <span>Part patient:</span>
                      <span className="font-bold">{formatMoney(c.copayAmountDzd || 0, 'DZD')}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                    <span>Réf: {c.id}</span>
                    <span>{c.consultationDate.split('T')[0]}</span>
                  </div>
                </div>
              );
            }}
            emptyTitle={isAr ? 'لا توجد فواتير' : 'Aucune facture trouvée'}
            emptyDescription={isAr ? 'جميع الفحوصات مسددة' : 'Toutes les consultations sont à jour de règlement'}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedConsultation && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-200/60">
                  <CreditCard size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                    {selectedConsultation.patientName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <span className="font-mono">Facture: {selectedConsultation.id}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-4 bg-white dark:bg-neutral-850 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('decompte')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'decompte'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'البيان المالي' : 'Décompte'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tiers_payant')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'tiers_payant'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الضمان الاجتماعي' : 'Tiers Payant'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('actions')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'actions'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الإجراءات' : 'Actions'}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {activeTab === 'decompte' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-3 font-mono">
                    <div className="flex justify-between items-center text-sm font-bold text-neutral-900 dark:text-white">
                      <span>Total Acte Médical:</span>
                      <span className="text-[#C4785A]">{formatMoney(selectedConsultation.consultationFeeDzd, 'DZD')}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                      <span>Ticket modérateur patient:</span>
                      <span>{formatMoney(selectedConsultation.copayAmountDzd || 600, 'DZD')}</span>
                    </div>
                    <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                      <span>Prise en charge CNAS/CASNOS:</span>
                      <span>{formatMoney(selectedConsultation.insuranceShareDzd || 2400, 'DZD')}</span>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center font-bold">
                      <span>Statut:</span>
                      <span className={selectedConsultation.isPaid ? 'text-emerald-600' : 'text-amber-600'}>
                        {selectedConsultation.isPaid ? 'Règlement effectué ✓' : 'Solde débiteur'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      Mode d'encaissement
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Cash', 'Dahabia', 'BaridiMob'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 px-2 text-center rounded-xl font-semibold border transition-all cursor-pointer ${
                            paymentMethod === method
                              ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A]'
                              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!selectedConsultation.isPaid && (
                    <AtriumButton
                      variant="primary"
                      onClick={() => handlePay(selectedConsultation)}
                      className="w-full justify-center"
                      icon={<CheckCircle2 size={14} />}
                    >
                      Encaisser via {paymentMethod}
                    </AtriumButton>
                  )}
                </div>
              )}

              {activeTab === 'tiers_payant' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
                      <ShieldCheck size={16} />
                      <span>Convention Tiers-Payant Chifa</span>
                    </div>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400">
                      Transmission dématérialisée conforme au protocole CNAS Algérie v2.4.
                    </p>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Code convention:</span>
                      <span className="text-neutral-800 dark:text-neutral-200">ALG-MED-8831</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Taux de couverture:</span>
                      <span className="text-emerald-600 font-bold">80% (Affection longue durée)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Bordereau mensuel:</span>
                      <span className="text-neutral-800 dark:text-neutral-200">BOR-2026-05</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(selectedConsultation)}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Printer size={16} />
                      Imprimer quittance patient
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePin(selectedConsultation.id)}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Pin size={16} />
                      {pinnedIds.has(selectedConsultation.id) ? 'Détacher' : 'Épingler la facture'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast('Télétransmission du bordereau Chifa confirmée', 'success')}
                    className="w-full p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 size={16} />
                      Télétransmettre bordereau Chifa
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
