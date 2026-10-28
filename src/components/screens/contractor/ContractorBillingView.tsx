import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Printer,
  CheckCircle2,
  FileText,
  ArrowRight,
  X,
  Building,
  ShieldCheck,
  Pin,
  Download,
  AlertCircle,
  Building2,
  DollarSign,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ContractorDgp } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const ContractorBillingView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { dgps, projects, selectedProjectId, setSelectedProjectId, addDgp, updateDgpStatus } = useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('issuedDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [selectedDgp, setSelectedDgp] = useState<ContractorDgp | null>(() => dgps[0] || null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'decompte' | 'certificat' | 'actions'>('decompte');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [periodLabel, setPeriodLabel] = useState('Situation Travaux - Mois Courant');
  const [periodGross, setPeriodGross] = useState('15000000');
  const [retentionPct, setRetentionPct] = useState('5');
  const [advanceAmort, setAdvanceAmort] = useState('1500000');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectDgps = dgps.filter((d) => d.projectId === (selectedProject?.id || selectedProjectId));

  const filteredDgps = useMemo(() => {
    return projectDgps.filter((d) =>
      d.dgpNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.periodLabel.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projectDgps, searchQuery]);

  const sortedDgps = useMemo(() => {
    const list = [...filteredDgps];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      if (sortBy === 'netPayableDzd') {
        return sortDir === 'asc'
          ? a.netPayableDzd - b.netPayableDzd
          : b.netPayableDzd - a.netPayableDzd;
      }
      if (sortBy === 'dgpNumber') {
        return sortDir === 'asc'
          ? a.dgpNumber.localeCompare(b.dgpNumber)
          : b.dgpNumber.localeCompare(a.dgpNumber);
      }
      return sortDir === 'asc'
        ? (a.issuedDate || '').localeCompare(b.issuedDate || '')
        : (b.issuedDate || '').localeCompare(a.issuedDate || '');
    });
    return list;
  }, [filteredDgps, pinnedIds, sortBy, sortDir]);

  const totalBilledGross = projectDgps.reduce((acc, d) => acc + d.periodGrossDzd, 0);
  const totalRetention = projectDgps.reduce((acc, d) => acc + d.retentionGuaranteeDzd, 0);
  const totalNetPayable = projectDgps.reduce((acc, d) => acc + d.netPayableDzd, 0);

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.projectCode} - ${p.projectName.substring(0, 24)}...`,
  }));

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    showToast(isAr ? 'تم تحديث التثبيت' : 'Situation épinglée', 'info');
  };

  const handlePrintDgp = (d: ContractorDgp) => {
    showToast(isAr ? 'جاري طباعة الكشف المالي (DGP)...' : 'Génération du certificat de décompte...', 'info');
  };

  const handleCreateDgp = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(periodGross) || 0;
    const retPercent = parseFloat(retentionPct) || 5;
    const retAmount = (gross * retPercent) / 100;
    const advance = parseFloat(advanceAmort) || 0;
    const taxable = gross - retAmount - advance;
    const tva = taxable * 0.19;
    const net = taxable + tva;

    const newDgp: ContractorDgp = {
      id: `dgp_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProject?.id || selectedProjectId,
      dgpNumber: `DGP-${String(projectDgps.length + 1).padStart(2, '0')}-${selectedProject?.projectCode || 'CHANT'}`,
      periodLabel: periodLabel.trim(),
      grossCompletedDzd: gross,
      previousCumulDzd: totalBilledGross,
      periodGrossDzd: gross,
      retentionGuaranteePercent: retPercent,
      retentionGuaranteeDzd: retAmount,
      advanceAmortizationDzd: advance,
      tvaPercent: 19,
      tvaAmountDzd: tva,
      netPayableDzd: net,
      status: 'ApprovedBE',
      issuedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    addDgp(newDgp);
    setIsModalOpen(false);
    setSelectedDgp(newDgp);
    showToast(
      isAr ? 'تم تحرير كشف الحساب والوضعية المالية (DGP)' : 'Situation DGP enregistrée avec succès',
      'success'
    );
  };

  const columns: ColumnDefinition<ContractorDgp>[] = [
    {
      key: 'dgpNumber',
      header: isAr ? 'رقم الكشف / الفترة' : 'Situation & Période',
      sortable: true,
      minWidth: '220px',
      renderCell: (d) => {
        const isPinned = pinnedIds.has(d.id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0 border border-orange-100 dark:border-neutral-800">
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                {d.dgpNumber}
                {isPinned && <span className="text-xs text-amber-500">📌</span>}
              </div>
              <div className="text-[11px] text-neutral-400 truncate max-w-[180px]">
                {d.periodLabel}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'periodGrossDzd',
      header: isAr ? 'المبلغ الإجمالي HT' : 'Montant Brut HT',
      sortable: true,
      minWidth: '140px',
      renderCell: (d) => (
        <div className="font-mono text-xs text-neutral-800 dark:text-neutral-200">
          {formatMoney(d.periodGrossDzd)}
        </div>
      ),
    },
    {
      key: 'retentionGuaranteeDzd',
      header: isAr ? 'اقتطاع الضمان (5%)' : 'Retenue (5%)',
      minWidth: '130px',
      renderCell: (d) => (
        <div className="font-mono text-xs text-amber-600 dark:text-amber-400">
          {formatMoney(d.retentionGuaranteeDzd)}
        </div>
      ),
    },
    {
      key: 'netPayableDzd',
      header: isAr ? 'الصافي للدفع TTC' : 'Net à Payer TTC',
      sortable: true,
      minWidth: '140px',
      renderCell: (d) => (
        <div className="font-mono font-bold text-xs text-[#C4785A]">
          {formatMoney(d.netPayableDzd)}
        </div>
      ),
    },
    {
      key: 'status',
      header: isAr ? 'حالة الاعتماد' : 'Validation',
      sortable: true,
      minWidth: '120px',
      renderCell: (d) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            d.status === 'Paid'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
          }`}
        >
          {d.status === 'Paid' ? (isAr ? 'مدفوع' : 'Réglé') : (isAr ? 'معتمد BET' : 'Approuvé BET')}
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
            <Wallet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الكشوفات المالية والضمان (DGP)' : 'Décomptes Généraux Provisoires (DGP)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {projectDgps.length} situations
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'كشوفات الأشغال المنجزة، اقتطاع الضمان 5%، استهلاك التسبيقات الضريبية'
                : 'Facturations périodiques de chantier, retenues de garantie et régularisations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'كشف جديد (DGP)' : 'Nouvelle Situation DGP'}
          </AtriumButton>
        </div>
      </div>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'الوضعية المالية للمشروع' : 'Situation Financière & Retenues du Projet'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {selectedProject ? `${selectedProject.projectCode} · ${selectedProject.projectName}` : 'Chantier actif'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الكشوفات المحررة' : 'Situations Émises'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {projectDgps.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'مقبولة من مكتب الدراسات' : 'Approuvées par le BET'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'اقتطاع الضمان المحجوز (5%)' : 'Retenue de Garantie Cumulée'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {formatMoney(totalRetention)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'تسترجع عند الاستلام النهائي' : 'Libérée à la réception définitive'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي الصافي المستحق' : 'Net des Situations Travaux'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                TVA 19% Incluse
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalNetPayable)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'بعد خصم التسبيق واقتطاع الضمان' : 'Déduction des avances effectuée'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'كشوف الحساب والوضعيات المالية (DGP)' : 'Décomptes Généraux & Situations de Travaux (DGP)'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'المطالبات المالية الدورية واقتطاعات الضمان النظامية' : 'Suivi des attestations de paiement, TVA 19% et retenues de garantie 5%'}
            </p>
          </div>

          {/* Authentic BTP Billing Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع الكشوفات' : 'Toutes les situations' },
              { id: 'bet', label: isAr ? 'مقبولة BET' : 'Approuvées BET' },
              { id: 'paid', label: isAr ? 'مسددة' : 'Mandatées / Réglées' },
            ].map((tab, idx) => (
              <button
                key={tab.id}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: idx === 0 ? '#FCEEE8' : 'transparent',
                  color: idx === 0 ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace Area with Dual Collection and 390px Inspector */}
        <div className="flex items-start gap-4">
          {/* Collection */}
          <div className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-56">
                <FilterSelect
                  value={selectedProject?.id || selectedProjectId}
                  onChange={setSelectedProjectId}
                  options={projectOptions}
                />
              </div>
              <div className="w-52">
                <Seek
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={isAr ? 'بحث برقم الكشف...' : 'Filtrer situation, libellé...'}
                />
              </div>
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {sortedDgps.length} {isAr ? 'كشوفات' : 'situations'}
            </div>
          </div>

          <UniversalDataCollection<ContractorDgp>
            items={sortedDgps}
            keyExtractor={(d) => d.id}
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
            isPinned={(d) => pinnedIds.has(d.id)}
            onTogglePin={(d) => handleTogglePin(d.id)}
            onItemClick={(d) => setSelectedDgp(d)}
            customActions={(d) => [
              {
                id: 'print',
                label: isAr ? 'طباعة' : 'Imprimer',
                icon: <Printer size={13} />,
                variant: 'primary',
                onClick: () => handlePrintDgp(d),
              },
              {
                id: 'cert',
                label: isAr ? 'شهادة الدفع' : 'Certificat',
                icon: <ShieldCheck size={13} />,
                onClick: () => setSelectedDgp(d),
              },
            ]}
            renderCard={(d) => {
              const isPinned = pinnedIds.has(d.id);
              return (
                <div className="flex flex-col w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {d.dgpNumber} {isPinned && '📌'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {d.status === 'Paid' ? 'Réglé' : 'Approuvé BET'}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-500 line-clamp-1">
                    {d.periodLabel}
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Montant Brut HT:</span>
                      <span>{formatMoney(d.periodGrossDzd)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>Retenue (5%):</span>
                      <span>-{formatMoney(d.retentionGuaranteeDzd)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-900 dark:text-white pt-1 border-t border-neutral-200 dark:border-neutral-700">
                      <span>Net TTC:</span>
                      <span className="text-[#C4785A]">{formatMoney(d.netPayableDzd)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                    <span>Date: {d.issuedDate}</span>
                    <span>TVA 19%</span>
                  </div>
                </div>
              );
            }}
            emptyTitle={isAr ? 'لا توجد كشوفات' : 'Aucune situation DGP'}
            emptyDescription={isAr ? 'قم بتحرير أول كشف أشغال للمشروع' : 'Créez votre première situation de travaux'}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedDgp && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-orange-200/60">
                  <Wallet size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                    {selectedDgp.dgpNumber}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <span className="font-mono">Date: {selectedDgp.issuedDate}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDgp(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-4 bg-white dark:bg-neutral-850 text-xs">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('decompte')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeInspectorTab === 'decompte'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'البيان المالي' : 'Décompte'}
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('certificat')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeInspectorTab === 'certificat'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الشهادة والضمان' : 'Certificat'}
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('actions')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeInspectorTab === 'actions'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الإجراءات' : 'Actions'}
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {activeInspectorTab === 'decompte' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2 font-mono">
                    <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                      <span>Cumul précédent:</span>
                      <span>{formatMoney(selectedDgp.previousCumulDzd || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-neutral-900 dark:text-white">
                      <span>Montant du mois HT:</span>
                      <span>{formatMoney(selectedDgp.periodGrossDzd)}</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                      <span>Retenue garantie (5%):</span>
                      <span>-{formatMoney(selectedDgp.retentionGuaranteeDzd)}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-500">
                      <span>Amortissement avances:</span>
                      <span>-{formatMoney(selectedDgp.advanceAmortizationDzd || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                      <span>TVA (19%):</span>
                      <span>+{formatMoney(selectedDgp.tvaAmountDzd || 0)}</span>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center font-bold text-sm">
                      <span>Net à Mandater TTC:</span>
                      <span className="text-[#C4785A]">{formatMoney(selectedDgp.netPayableDzd)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 space-y-1">
                    <span className="font-bold">Attachement des travaux validé</span>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Métrés contradictoires signés sur chantier avec le conducteur de travaux et le Maître d'Œuvre.
                    </p>
                  </div>
                </div>
              )}

              {activeInspectorTab === 'certificat' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                      <ShieldCheck size={16} className="text-[#C4785A]" />
                      <span>Certificat de Paiement BTP</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                      <div>Marché: {selectedProject?.projectCode}</div>
                      <div>Maître d'Ouvrage: {selectedProject?.clientName || 'Ministère / Promoteur'}</div>
                      <div>Bureau d'Études: BET Technique & Architecture</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 space-y-1">
                    <span className="font-bold">Libération de la caution</span>
                    <p className="text-[11px]">
                      La retenue de garantie cumulée ({formatMoney(totalRetention)}) sera débloquée 12 mois après la réception provisoire.
                    </p>
                  </div>
                </div>
              )}

              {activeInspectorTab === 'actions' && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => handlePrintDgp(selectedDgp)}
                    className="w-full p-3 rounded-xl bg-[#C4785A] text-white font-semibold flex items-center justify-between hover:bg-[#b0674b] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Printer size={16} />
                      Imprimer décompte provisoire
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePin(selectedDgp.id)}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Pin size={16} />
                      {pinnedIds.has(selectedDgp.id) ? 'Détacher' : 'Épingler la situation'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateDgpStatus(selectedDgp.id, 'Paid');
                      setSelectedDgp({ ...selectedDgp, status: 'Paid' });
                      showToast('Situation enregistrée comme réglée', 'success');
                    }}
                    className="w-full p-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-between hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Marquer comme réglée
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Modal Nouvel Attachement DGP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <Plus size={16} />
                </div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {isAr ? 'تحرير كشف حساب جديد (DGP)' : 'Établir une Nouvelle Situation DGP'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDgp} className="space-y-4">
              <LabelInput
                label="Libellé de la période"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label="Montant brut du mois (HT DZD)"
                  type="number"
                  value={periodGross}
                  onChange={(e) => setPeriodGross(e.target.value)}
                  required
                />
                <LabelInput
                  label="Retenue de garantie (%)"
                  type="number"
                  value={retentionPct}
                  onChange={(e) => setRetentionPct(e.target.value)}
                  required
                />
              </div>

              <LabelInput
                label="Amortissement avances forfaitaires (DZD)"
                type="number"
                value={advanceAmort}
                onChange={(e) => setAdvanceAmort(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="outline" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  Enregistrer situation
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
