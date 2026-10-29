import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Printer,
  CheckCircle2,
  ShieldCheck,
  Download,
  DollarSign,
  Building2,
  Key,
  Calendar,
  Send,
  Eye,
  Check,
  X,
  Share2,
  Clock,
  Calculator,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { RealEstateLease } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { NotarySimulatorModal } from './NotarySimulatorModal';

export const RealEstateFinanceView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { leases } = useRealEstateData();

  const [isNotaryModalOpen, setIsNotaryModalOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<RealEstateLease | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'quittance' | 'caution' | 'reversement'>('quittance');
  const [settledBailleurIds, setSettledBailleurIds] = useState<string[]>(['lease_01']);
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'loyers' | 'commissions' | 'reversements' | 'impayes'>('all');

  const filteredFinanceLeases = useMemo(() => {
    return leases.filter((l) => {
      if (settlementFilter === 'reversements' && !settledBailleurIds.includes(l.id)) return false;
      if (settlementFilter === 'impayes' && l.status === 'Active') return false;
      if (settlementFilter === 'loyers' && l.status !== 'Active') return false;
      return true;
    });
  }, [leases, settlementFilter, settledBailleurIds]);

  const totalMonthlyRents = leases.reduce((acc, l) => acc + l.monthlyRentDzd, 0);
  const totalDeposits = leases.reduce((acc, l) => acc + l.securityDepositDzd, 0);
  const totalCommissions = leases.reduce((acc, l) => acc + (l.monthlyRentDzd * 0.1), 0);
  const netOwnerDisbursal = totalMonthlyRents - totalCommissions;

  const handlePrintQuittance = (tenantName: string, propertyTitle: string) => {
    showToast(
      isAr
        ? `جاري طباعة مخالصة الإيجار للمستأجر ${tenantName}...`
        : `Impression de la quittance de loyer pour ${tenantName} (${propertyTitle})...`,
      'info'
    );
  };

  const handleDisburseToOwner = (lease: RealEstateLease) => {
    if (!settledBailleurIds.includes(lease.id)) {
      setSettledBailleurIds((prev) => [...prev, lease.id]);
      const net = lease.monthlyRentDzd * 0.9;
      showToast(
        isAr
          ? `تم تحويل صافي الإيجار (${formatMoney(net, language)}) للمالك بنجاح`
          : `Reversement du net bailleur (${formatMoney(net, language)}) confirmé`,
        'success'
      );
    }
  };

  const getLeaseActions = (l: RealEstateLease): ActionButtonDef[] => {
    const isSettled = settledBailleurIds.includes(l.id);
    return [
      {
        label: isAr ? 'معاينة الوصل' : 'Consulter Quittance',
        icon: <Eye size={14} />,
        onClick: () => setSelectedLease(l),
      },
      ...(!isSettled
        ? [
            {
              label: isAr ? 'تحويل للمالك' : 'Reverser Bailleur',
              icon: <Send size={14} />,
              onClick: () => handleDisburseToOwner(l),
            },
          ]
        : []),
      {
        label: isAr ? 'طباعة Quittance' : 'Imprimer Quittance',
        icon: <Printer size={14} />,
        onClick: () => handlePrintQuittance(l.tenantName, l.propertyTitle),
      },
      {
        label: isAr ? 'مشاركة الوصل' : 'Partager Reçu',
        icon: <Share2 size={14} />,
        onClick: () => {
          showToast(
            isAr
              ? `تم نسخ رابط الوصل للمستأجر ${l.tenantName}`
              : `Quittance électronique transmise à ${l.tenantName}`,
            'success'
          );
        },
      },
    ];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الوصولات ومستحقات الملاك' : 'Quittances de Loyer & Règlements Bailleurs'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Légal Foncier
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إصدار وصولات الإيجار القانونية، عمولات الوكالة، وتسوية حسابات الملاك'
                : 'Quittances de loyer dématérialisées, redditions de comptes & commissions'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => setIsNotaryModalOpen(true)}
            icon={<Calculator size={14} />}
          >
            {isAr ? 'حاسبة الموثق (08-243)' : 'Simulateur Notaire (08-243)'}
          </AtriumButton>
          <AtriumButton
            variant="outline"
            onClick={() => window.print()}
            icon={<Printer size={14} />}
          >
            {isAr ? 'طباعة كشف الحسابات' : 'Bordereau Bailleurs'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات التحصيل وعمولات الوكالة' : 'Encaissement des Loyers & Commissions'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'توزيع المبالغ المحصلة بين أتعاب الإدارة وصافي التحويل للمالك' : 'Ventilation des sommes perçues, honoraires de gestion et reversement bailleur'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Loyers */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الإيجارات المحصلة' : 'Masse des Loyers Appelée'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalMonthlyRents, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {leases.length} {isAr ? 'وصل إيجار سارٍ' : 'quittances émises'}
              </p>
            </div>
          </div>

          {/* Card 2: Commissions Agence */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'عمولة التسيير العقاري (10%)' : 'Honoraires Gestion Agence'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatMoney(totalCommissions, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'إيرادات الوكالة الصافية' : 'Revenu net agence mandatée'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'صافي مستحقات الملاك' : 'Reversements Bailleurs'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {isAr ? 'جاهز للتحويل' : 'Net Propriétaire'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(netOwnerDisbursal, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {settledBailleurIds.length} {isAr ? 'حساب تم تسويته' : 'bailleurs réglés'}
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
              {isAr ? 'سجل الوصولات ومستحقات الملاك العقاريين' : 'Registre des Quittances & Règlements Bailleurs'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إدارة الإيجارات وتصفية حسابات الملاك والعمولات' : 'Émission des quittances, prélèvement des honoraires et reversements'}
            </p>
          </div>

          {/* Authentic Real Estate Settlement Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع المعاملات' : 'Toutes opérations' },
              { id: 'loyers', label: isAr ? 'إيجارات محصلة' : 'Loyers encaissés' },
              { id: 'commissions', label: isAr ? 'أتعاب الوكالة' : 'Commissions agence' },
              { id: 'reversements', label: isAr ? 'محول للملاك' : 'Reversements bailleurs' },
              { id: 'impayes', label: isAr ? 'إيجارات متأخرة' : 'Impayés / Relances' },
            ].map((tab) => {
              const isActive = settlementFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSettlementFilter(tab.id as any)}
                  className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                    color: isActive ? 'var(--color-accent)' : '#71717A',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Collection Area + 390px Inspector Drawer */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<RealEstateLease>
              title={isAr ? 'سجل الوصولات ومستحقات الملاك' : 'Registre des Quittances & Règlements Bailleurs'}
              subtitle={isAr ? 'إدارة الإيجارات وتصفية حسابات الملاك' : 'Émission des quittances, prélèvement des honoraires et reversements'}
              items={filteredFinanceLeases}
            keyExtractor={(l) => l.id}
            searchPlaceholder={isAr ? 'بحث بالعقار أو المستأجر...' : 'Rechercher bien, locataire, bailleur, loyer...'}
            searchFilter={(l, query) =>
              l.propertyTitle.toLowerCase().includes(query.toLowerCase()) ||
              l.tenantName.toLowerCase().includes(query.toLowerCase()) ||
              (l.tenantPhone || '').toLowerCase().includes(query.toLowerCase())
            }
            onSelectRow={(l) => setSelectedLease(l)}
            customActions={(l) => getLeaseActions(l)}
            columns={[
              {
                id: 'property',
                header: isAr ? 'العقار' : 'Bien Immobilier',
                renderCell: (l) => (
                  <div>
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                      {l.propertyTitle}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Bail du {l.startDate} au {l.endDate}
                    </span>
                  </div>
                ),
              },
              {
                id: 'tenant',
                header: isAr ? 'المستأجر' : 'Locataire Titulaire',
                width: '180px',
                renderCell: (l) => (
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                      {l.tenantName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {l.tenantPhone}
                    </span>
                  </div>
                ),
              },
              {
                id: 'rent',
                header: isAr ? 'مبلغ الإيجار' : 'Loyer Quittancé',
                width: '140px',
                sortable: true,
                renderCell: (l) => (
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                    {formatMoney(l.monthlyRentDzd, language)}
                  </span>
                ),
              },
              {
                id: 'commission',
                header: isAr ? 'عمولة الوكالة' : 'Commission (10%)',
                width: '130px',
                renderCell: (l) => (
                  <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {formatMoney(l.monthlyRentDzd * 0.1, language)}
                  </span>
                ),
              },
              {
                id: 'netOwner',
                header: isAr ? 'صافي المالك' : 'Net Bailleur',
                width: '140px',
                sortable: true,
                renderCell: (l) => (
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(l.monthlyRentDzd * 0.9, language)}
                  </span>
                ),
              },
              {
                id: 'status',
                header: isAr ? 'التسوية' : 'Statut Reversement',
                width: '140px',
                renderCell: (l) => {
                  const isSettled = settledBailleurIds.includes(l.id);
                  return (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        isSettled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isSettled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {isSettled ? (isAr ? 'تم التحويل' : 'Reversé') : (isAr ? 'بانتظار التحويل' : 'À reverser')}
                    </span>
                  );
                },
              },
            ]}
            renderCard={(l) => {
              const isSettled = settledBailleurIds.includes(l.id);
              return (
                <div className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded">
                      {formatMoney(l.monthlyRentDzd, language)}/mois
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSettled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isSettled ? 'Reversé' : 'À reverser'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-2">
                      {l.propertyTitle}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Locataire: {l.tenantName}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Com. Agence</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        {formatMoney(l.monthlyRentDzd * 0.1, language)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block">Net Bailleur</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatMoney(l.monthlyRentDzd * 0.9, language)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 390px Side Inspector Drawer */}
        {selectedLease && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Inspector Top Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <Receipt size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                    Quittance de Loyer
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                    {selectedLease.tenantName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLease(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
              <button
                onClick={() => setInspectorTab('quittance')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'quittance'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'الوصل والرسوم' : 'Quittance'}
              </button>
              <button
                onClick={() => setInspectorTab('caution')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'caution'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'عقد الإيجار والضمان' : 'Bail & Caution'}
              </button>
              <button
                onClick={() => setInspectorTab('reversement')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'reversement'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'تحويل المالك' : 'Reversement'}
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'quittance' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-neutral-300 text-[11px]">
                      <span>Loyer Mensuel Net Quittancé</span>
                      <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Acquitté
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white">
                      {formatMoney(selectedLease.monthlyRentDzd, language)}
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Quittance de loyer délivrée au locataire valant décharge intégrale pour la période en cours.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Détails de la Quittance
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Bien loué:</span>
                      <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[190px]">{selectedLease.propertyTitle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Locataire:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedLease.tenantName}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                      <span>Honoraires Agence (10%):</span>
                      <span className="font-mono font-semibold">
                        -{formatMoney(selectedLease.monthlyRentDzd * 0.1, language)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
                      <span className="font-bold text-neutral-900 dark:text-white">Solde Net Bailleur:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(selectedLease.monthlyRentDzd * 0.9, language)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === 'caution' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Dépôt de Garantie Séquestré
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Montant Caution:</span>
                      <span className="font-mono font-bold text-base text-neutral-900 dark:text-white">
                        {formatMoney(selectedLease.securityDepositDzd, language)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Périodicité paiement:</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedLease.paymentFrequency}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Date d'échéance bail:</span>
                      <span className="font-mono">{selectedLease.endDate}</span>
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === 'reversement' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Ordre de Virement Propriétaire
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Bénéficiaire:</span>
                        <span className="font-bold text-neutral-900 dark:text-white">Propriétaire du bien</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Montant Net:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(selectedLease.monthlyRentDzd * 0.9, language)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-neutral-900 dark:text-white">Validation Virement</span>
                      <span className="text-[10px] text-neutral-500">
                        {settledBailleurIds.includes(selectedLease.id) ? 'Virement déjà exécuté' : 'Transférer sur compte bancaire'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDisburseToOwner(selectedLease)}
                      disabled={settledBailleurIds.includes(selectedLease.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white disabled:opacity-50 transition-colors"
                    >
                      {settledBailleurIds.includes(selectedLease.id) ? 'Reversé ✓' : 'Reverser Net'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
              <AtriumButton
                variant="primary"
                className="w-full justify-center"
                icon={<Printer size={14} />}
                onClick={() => handlePrintQuittance(selectedLease.tenantName, selectedLease.propertyTitle)}
              >
                {isAr ? 'طباعة مخالصة الإيجار' : 'Imprimer Quittance de Loyer'}
              </AtriumButton>
            </div>
          </div>
        )}
        </div>
      </div>

      <NotarySimulatorModal
        isOpen={isNotaryModalOpen}
        onClose={() => setIsNotaryModalOpen(false)}
      />
    </div>
  );
};
