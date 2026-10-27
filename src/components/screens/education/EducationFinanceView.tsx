import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Plus,
  Printer,
  X,
  FileText,
  Search,
  ChevronRight,
  Download,
  Sparkles,
  Building2,
  Check,
  Home,
  ChevronDown,
  Bell,
  Receipt,
  UserCheck,
  Percent,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { EduEnrollment } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';

type PaymentFilterKey = 'all' | 'pending' | 'partial' | 'overdue' | 'paid';

export const EducationFinanceView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    eduEnrollments,
    eduCohorts,
    recordTuitionPayment,
    currentBusiness,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    resetEduMockData,
    showToast,
  } = useAtriumStore();

  // Auto-heal empty enrollments directory safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && eduEnrollments.length === 0) {
      hasAutoHealed.current = true;
      resetEduMockData();
    }
  }, [eduEnrollments.length, resetEduMockData]);

  const [filterKey, setFilterKey] = useState<PaymentFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
  const [pinnedEnrollmentIds, setPinnedEnrollmentIds] = useState<Set<string>>(new Set());
  const [financeSortBy, setFinanceSortBy] = useState<string>('student');
  const [financeSortDir, setFinanceSortDir] = useState<'asc' | 'desc'>('asc');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Modals & Drawers
  const [selectedEnrollmentForPayment, setSelectedEnrollmentForPayment] = useState<EduEnrollment | null>(null);
  const [detailEnrollment, setDetailEnrollment] = useState<EduEnrollment | null>(null);
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(15000);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [receiptToPrint, setReceiptToPrint] = useState<{
    studentName: string;
    cohortName: string;
    amount: number;
    method: string;
    date: string;
    receiptNumber: string;
  } | null>(null);

  // Financial aggregates
  const totalBilled = eduEnrollments.reduce((sum, e) => sum + (e.agreedTuition || 0), 0);
  const totalCollected = eduEnrollments.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  const totalOutstanding = totalBilled - totalCollected;
  const collectionVelocity = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const overdueBalance = eduEnrollments
    .filter((e) => e.paymentStatus === 'Overdue')
    .reduce((sum, e) => sum + e.balanceDue, 0);

  // Filter & Search
  const filteredEnrollments = useMemo(() => {
    return eduEnrollments.filter((e) => {
      const matchesFilter = filterKey === 'all' || e.paymentStatus.toLowerCase() === filterKey.toLowerCase();
      if (!matchesFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.studentName.toLowerCase().includes(q) ||
          e.cohortName.toLowerCase().includes(q) ||
          e.studentId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [eduEnrollments, filterKey, searchQuery]);

  const handleOpenPayment = (enrollment: EduEnrollment, instIndex: number = 0) => {
    setSelectedEnrollmentForPayment(enrollment);
    setSelectedInstallmentIndex(instIndex);
    const inst = enrollment.installments?.[instIndex];
    setPaymentAmount(inst && !inst.isPaid ? inst.amount : enrollment.balanceDue);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentForPayment) return;

    recordTuitionPayment(
      selectedEnrollmentForPayment.id,
      selectedInstallmentIndex,
      paymentAmount,
      paymentMethod
    );

    setReceiptToPrint({
      studentName: selectedEnrollmentForPayment.studentName,
      cohortName: selectedEnrollmentForPayment.cohortName,
      amount: paymentAmount,
      method: paymentMethod,
      date: new Date().toISOString().split('T')[0],
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
    });

    showToast?.({
      type: 'success',
      title: 'Paiement Enregistré',
      message: `${formatMoney(paymentAmount)} encaissés pour ${selectedEnrollmentForPayment.studentName} (${paymentMethod}).`,
    });

    setSelectedEnrollmentForPayment(null);
  };

  // Batch Actions
  const handleBatchMarkInstallmentPaid = () => {
    if (selectedEnrollmentIds.size === 0) return;
    let count = 0;
    eduEnrollments.forEach((enr) => {
      if (selectedEnrollmentIds.has(enr.id) && enr.balanceDue > 0) {
        // find first unpaid installment
        const nextIndex = enr.installments?.findIndex((i) => !i.isPaid) ?? 0;
        const inst = enr.installments?.[nextIndex];
        const amt = inst ? inst.amount : enr.balanceDue;
        recordTuitionPayment(enr.id, Math.max(0, nextIndex), amt, 'Cash');
        count++;
      }
    });

    showToast?.({
      type: 'success',
      title: language === 'ar' ? 'تم تسجيل الدفعات' : 'Versements Encaissés',
      message: `${count} échéances ont été validées en lot.`,
    });
    setSelectedEnrollmentIds(new Set());
  };

  const handleBatchSendReminder = () => {
    showToast?.({
      type: 'info',
      title: language === 'ar' ? 'تم إرسال التنبيهات' : 'Rappels Émis',
      message: `${selectedEnrollmentIds.size} rappels de paiement transmis via SMS & WhatsApp.`,
    });
    setSelectedEnrollmentIds(new Set());
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'ID Inscription',
      'Apprenant',
      'ID Étudiant',
      'Formation / Cohorte',
      'Date Inscription',
      'Frais de Scolarité (DZD)',
      'Remise (DZD)',
      'Montant Payé (DZD)',
      'Reste à Payer (DZD)',
      'Statut Paiement',
      'Nombre Échéances',
      'Échéances Payées',
      'Statut Dossier',
    ];

    const rows = filteredEnrollments.map((enr) => {
      const paidInstCount = enr.installments?.filter((i) => i.isPaid).length || 0;
      const totalInstCount = enr.installments?.length || 0;
      return [
        `"${enr.id}"`,
        `"${enr.studentName.replace(/"/g, '""')}"`,
        `"${enr.studentId}"`,
        `"${enr.cohortName.replace(/"/g, '""')}"`,
        `"${enr.enrolledAt ? enr.enrolledAt.split('T')[0] : ''}"`,
        enr.agreedTuition,
        enr.discountAmount || 0,
        enr.paidAmount,
        enr.balanceDue,
        `"${enr.paymentStatus}"`,
        totalInstCount,
        paidInstCount,
        `"${enr.status}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `scolarite_reglements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast?.({
      type: 'success',
      title: 'Grand Livre Exporté',
      message: `${filteredEnrollments.length} contrats de scolarité exportés au format CSV.`,
    });
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<EduEnrollment>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('edu_col_student'),
        width: '2.5*',
        minWidth: '200px',
        sortable: true,
        renderCell: (enr) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
              {enr.studentName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-neutral-900 dark:text-white truncate">
                {enr.studentName}
              </div>
              <div className="text-[10px] text-neutral-400">ID: {enr.studentId}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'cohort',
        header: t('edu_col_cohort'),
        width: '2*',
        minWidth: '170px',
        sortable: true,
        renderCell: (enr) => (
          <div className="min-w-0">
            <span className="font-medium text-neutral-800 dark:text-neutral-200 block truncate">
              {enr.cohortName}
            </span>
            <span className="text-[10px] text-neutral-400">
              {enr.enrolledAt ? `Depuis ${enr.enrolledAt.split('T')[0]}` : 'Actif'}
            </span>
          </div>
        ),
      },
      {
        key: 'agreedTuition',
        header: t('edu_field_tuition_fee'),
        width: '1.4*',
        minWidth: '120px',
        sortable: true,
        renderCell: (enr) => (
          <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(enr.agreedTuition)}
          </span>
        ),
      },
      {
        key: 'paidAndBalance',
        header: language === 'ar' ? 'المسدد / الرصيد' : language === 'fr' ? 'Payé / Solde' : 'Paid / Balance',
        width: '2.2*',
        minWidth: '170px',
        sortable: true,
        renderCell: (enr) => {
          const percent = enr.agreedTuition > 0 ? Math.round((enr.paidAmount / enr.agreedTuition) * 100) : 0;
          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatMoney(enr.paidAmount)}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {formatMoney(enr.balanceDue)}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-amber-500' : 'bg-neutral-300'}`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'installments',
        header: language === 'ar' ? 'الأقساط' : language === 'fr' ? 'Échéances' : 'Schedule',
        width: '2*',
        minWidth: '150px',
        renderCell: (enr) => {
          const insts = enr.installments || [];
          const paidCount = insts.filter((i) => i.isPaid).length;
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {insts.length > 0 ? (
                insts.map((inst, idx) => (
                  <span
                    key={idx}
                    title={`${formatMoney(inst.amount)} - Échéance ${inst.dueDate} (${inst.isPaid ? 'Payée' : 'En attente'})`}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums border ${
                      inst.isPaid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
                    }`}
                  >
                    V{idx + 1}: {inst.isPaid ? '✓' : formatMoney(inst.amount).replace('DZD', '').trim()}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-neutral-400">Paiement unique</span>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: t('common_status'),
        width: '1.4*',
        minWidth: '110px',
        sortable: true,
        renderCell: (enr) => (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
              enr.paymentStatus === 'Paid'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : enr.paymentStatus === 'Overdue'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            {enr.paymentStatus === 'Paid'
              ? t('edu_tuition_paid')
              : enr.paymentStatus === 'Overdue'
              ? t('edu_tuition_overdue')
              : t('edu_tuition_partial')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('edu_col_actions'),
        width: '1.5*',
        minWidth: '120px',
        renderCell: (enr) => (
          <div className="flex items-center gap-1.5 justify-end rtl:justify-start">
            {enr.balanceDue > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPayment(enr, 0);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs whitespace-nowrap"
              >
                {t('edu_btn_log_payment')}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReceiptToPrint({
                    studentName: enr.studentName,
                    cohortName: enr.cohortName,
                    amount: enr.paidAmount,
                    method: 'Comptant / Virement',
                    date: enr.enrolledAt ? enr.enrolledAt.split('T')[0] : new Date().toISOString().split('T')[0],
                    receiptNumber: `REC-${enr.id.slice(-6)}`,
                  });
                }}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Receipt size={12} />
                <span>Reçu</span>
              </button>
            )}
          </div>
        ),
      },
    ],
    [language, t]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Outer Rounded Workspace Panel (WPF Spec: CornerRadius 28px, 1px CardBorderBrush) */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Row 0 — Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Wallet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {t('edu_finance_title')}
                </h1>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {eduEnrollments.length} {language === 'ar' ? 'حسابات مسجلة' : 'dossiers'} · {formatMoney(totalCollected)} {language === 'ar' ? 'مستحصل' : 'recouvré'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('edu_finance_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Pill: Atlas Academy ▾ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Atlas Academy'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Facility Dropdown Menu */}
              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'الفروع والمراكز التعليمية' : language === 'fr' ? 'Centres & Campus' : 'Campuses & Branches'}
                  </div>
                  {businesses.map((biz) => {
                    const isCurrent = biz.id === currentBusinessId;
                    const matchingBranch = branches.find((b) => b.businessId === biz.id);
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          switchBusiness(biz.id);
                          if (matchingBranch) switchBranch(matchingBranch.id);
                          setIsFacilityDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                          <span className="truncate">{biz.name}</span>
                        </div>
                        {isCurrent && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Seed Demo Data Button */}
            <AtriumButton
              variant="outline"
              size="sm"
              icon={<Sparkles size={14} className="text-[#C4785A]" />}
              onClick={() => {
                resetEduMockData();
                showToast?.({
                  type: 'success',
                  title: 'Données Réinitialisées',
                  message: '20 contrats de scolarité et échéanciers algériens rechargés.',
                });
              }}
              title="Recharge Demo Data"
            >
              <span className="hidden sm:inline">Demo Data</span>
            </AtriumButton>

            {/* Print Ledger */}
            <AtriumButton
              variant="outline"
              size="sm"
              icon={<Printer size={14} />}
              onClick={() => window.print()}
            >
              <span>{language === 'ar' ? 'طباعة كشف الحساب' : language === 'fr' ? 'Grand Livre' : 'Print Ledger'}</span>
            </AtriumButton>

            {/* Log Payment Direct Action */}
            {eduEnrollments.length > 0 && (
              <AtriumButton
                variant="primary"
                size="sm"
                glow
                icon={<Plus size={14} />}
                onClick={() => handleOpenPayment(eduEnrollments[0], 0)}
              >
                <span>{t('edu_btn_log_payment')}</span>
              </AtriumButton>
            )}
          </div>
        </div>

        {/* Batch Action Toolbar when items selected */}
        {selectedEnrollmentIds.size > 0 && (
          <div className="p-3 bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#C4785A] text-white flex items-center justify-center text-xs font-bold">
                {selectedEnrollmentIds.size}
              </span>
              <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'عقود محددة' : 'dossiers sélectionnés'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedEnrollmentIds(new Set())}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Désélectionner'}
              </button>
              <button
                type="button"
                onClick={handleBatchMarkInstallmentPaid}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 size={13} />
                <span>{language === 'ar' ? 'تسجيل سداد القسط' : 'Encaisser Versement'}</span>
              </button>
              <button
                type="button"
                onClick={handleBatchSendReminder}
                className="px-3.5 py-1.5 rounded-xl bg-[#C4785A] hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Bell size={13} />
                <span>{language === 'ar' ? 'إرسال تذكير بالسداد' : 'Envoyer Rappel SMS'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Metrics Pod Tray (Screenshot_30: bg-[#F8F9FA], rounded-[24px], p-5) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white tracking-tight">
              {language === 'ar' ? 'مؤشرات التحصيل والذمم المالية' : language === 'fr' ? 'Performance Financière & Recouvrement' : 'Tuition & Receivables Performance'}
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'متابعة سرعة التحصيل والأقساط المستحقة والديون المتعثرة' : language === 'fr' ? 'Indicateurs clés de facturation, encaissement et échéances en retard' : 'Key billing indicators, collection velocity, and overdue balances'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Inset White Card 1: Collection Velocity */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'سرعة التحصيل' : language === 'fr' ? 'Taux de Recouvrement' : 'Collection Velocity'}
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ↗ {collectionVelocity}% encaissement
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight font-mono">
                  {formatMoney(totalCollected)}
                </span>
                <span className="text-xs text-neutral-400 tabular-nums ml-1">
                  / {formatMoney(totalBilled)}
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {language === 'ar' ? 'رسوم محصلة فعلياً' : 'Total des frais scolaires perçus'}
                </p>
              </div>
            </div>

            {/* Inset White Card 2: Receivables Due */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {t('edu_fin_receivables')}
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {eduEnrollments.filter((e) => e.balanceDue > 0).length} en attente
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight font-mono">
                  {formatMoney(totalOutstanding)}
                </span>
                <span className="text-xs text-neutral-400 ml-1">
                  restant à percevoir
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {language === 'ar' ? 'أقساط مجدولة قيد التحصيل' : 'Échéances en cours de règlement'}
                </p>
              </div>
            </div>

            {/* Inset Card 3: DARK ESPRESSO CARD (#1F1D1B) — Overdue Tuition Balance */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-400">
                  {t('edu_fin_overdue')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 inline-block">
                  Relances Nécessaires
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#FB923C] tabular-nums tracking-tight font-mono">
                  {formatMoney(overdueBalance)}
                </span>
                <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                  <span>{language === 'ar' ? 'متأخرات تستوجب المتابعة' : 'Créances échues avec relance'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Collection Pod Tray (Screenshot_30: bg-[#F8F9FA], rounded-[24px], p-5) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Integrated Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Title & Count Badge */}
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-neutral-700 dark:text-neutral-300" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {t('edu_finance_title')}
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-neutral-200/70 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                {filteredEnrollments.length}
              </span>
            </div>

            {/* Right Controls: Seek + Filter Capsules + Export CSV */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Kinetic Seek Search */}
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search accounts by learner name or cohort..."
                openWidth={260}
                shutSize={36}
              />

              {/* Segmented Filter Capsules */}
              <div className="flex items-center gap-1 p-1 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                {[
                  { id: 'all', label: 'All Accounts' },
                  { id: 'pending', label: t('edu_tuition_unpaid') },
                  { id: 'partial', label: t('edu_tuition_partial') },
                  { id: 'overdue', label: t('edu_tuition_overdue') },
                  { id: 'paid', label: t('edu_tuition_paid') },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterKey(tab.id as PaymentFilterKey)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      filterKey === tab.id
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-9 px-3 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Export CSV"
              >
                <Download size={13} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          {/* UniversalDataCollection: List & Grid modes with selection & pinning */}
          <UniversalDataCollection<EduEnrollment>
            items={filteredEnrollments}
            keyExtractor={(enr) => enr.id}
            selectedIds={selectedEnrollmentIds}
            isPinned={(enr) => pinnedEnrollmentIds.has(enr.id)}
            onSelectionChange={setSelectedEnrollmentIds}
            defaultViewMode="list"
            columns={columns}
            sortBy={financeSortBy}
            sortDirection={financeSortDir}
            onSortChange={(key) => {
              if (financeSortBy === key) {
                setFinanceSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setFinanceSortBy(key);
                setFinanceSortDir('asc');
              }
            }}
            renderCard={(enr) => {
              const percent = enr.agreedTuition > 0 ? Math.round((enr.paidAmount / enr.agreedTuition) * 100) : 0;
              return (
                <div className="flex flex-col items-center justify-center w-full">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center text-xl font-bold shadow-xs mb-3 select-none border border-neutral-200 dark:border-neutral-700">
                    {enr.studentName.charAt(0)}
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate max-w-[210px] mb-0.5 tracking-tight">
                    {enr.studentName}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] border border-[#F5E2D8] dark:border-neutral-700 mb-3 truncate max-w-[200px]">
                    {enr.cohortName}
                  </span>

                  <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Contrat Total</span>
                      <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                        {formatMoney(enr.agreedTuition)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-600 font-semibold">{formatMoney(enr.paidAmount)}</span>
                      <span className="text-rose-600 font-semibold">{formatMoney(enr.balanceDue)} dû</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-[#C4785A]'}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          enr.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : enr.paymentStatus === 'Overdue'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {enr.paymentStatus}
                      </span>
                      {enr.balanceDue > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPayment(enr, 0);
                          }}
                          className="px-2 py-1 bg-[#C4785A] text-white rounded-lg text-[10px] font-semibold hover:opacity-90"
                        >
                          Encaisser
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
            onItemClick={(enr) => setDetailEnrollment(enr)}
            onViewDetails={(enr) => setDetailEnrollment(enr)}
            onEdit={(enr) => handleOpenPayment(enr, 0)}
            onTogglePin={(enr) => {
              setPinnedEnrollmentIds((prev) => {
                const next = new Set(prev);
                if (next.has(enr.id)) {
                  next.delete(enr.id);
                } else {
                  next.add(enr.id);
                }
                return next;
              });
            }}
          />
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedEnrollmentForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('edu_payment_modal_title')}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedEnrollmentForPayment(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="font-bold text-neutral-900 dark:text-white">
                  {selectedEnrollmentForPayment.studentName}
                </div>
                <div className="text-neutral-500">
                  {t('edu_label_cohort')}: {selectedEnrollmentForPayment.cohortName}
                </div>
                <div className="text-[#C4785A] font-bold">
                  {t('edu_fin_receivables')}: {formatMoney(selectedEnrollmentForPayment.balanceDue)}
                </div>
              </div>

              {selectedEnrollmentForPayment.installments && selectedEnrollmentForPayment.installments.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    Sélectionner l'échéance à solder
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEnrollmentForPayment.installments.map((inst, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedInstallmentIndex(idx);
                          setPaymentAmount(inst.isPaid ? 0 : inst.amount);
                        }}
                        className={`p-2 rounded-xl border text-left rtl:text-right transition-colors cursor-pointer ${
                          selectedInstallmentIndex === idx
                            ? 'bg-[#FCEEE8] dark:bg-neutral-800 border-[#C4785A] text-[#C4785A] font-bold'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="text-[10px] text-neutral-400">Échéance #{idx + 1}</div>
                        <div className="font-bold tabular-nums">{formatMoney(inst.amount)}</div>
                        <div className="text-[10px] text-neutral-500">{inst.isPaid ? '✓ Soldée' : `Due le ${inst.dueDate}`}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <LabelInput
                id="payment-amount"
                label={t('edu_field_pay_amount')}
                type="number"
                min="1"
                max={selectedEnrollmentForPayment.balanceDue}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                required
              />

              <LabelSelect
                field="Method"
                label={t('edu_field_pay_method')}
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'Cash', label: 'Cash (Campus Bureau)' },
                  { value: 'Card / POS', label: 'Card (CIB / Dahabia POS)' },
                  { value: 'Bank Transfer', label: 'Bank / CCP Transfer' },
                  { value: 'Scholarship Voucher', label: 'Scholarship Voucher' },
                ]}
                height={44}
                corner={14}
              />

              <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedEnrollmentForPayment(null)}
                >
                  {t('common_cancel')}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  type="submit"
                >
                  {t('edu_btn_save_payment')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer for Selected Enrollment */}
      {detailEnrollment && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 p-6 flex flex-col space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FCEEE8] text-[#C4785A] flex items-center justify-center font-bold text-sm">
                  {detailEnrollment.studentName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {detailEnrollment.studentName}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {detailEnrollment.cohortName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailEnrollment(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800">
                <span className="text-[11px] text-neutral-400 block mb-0.5">Frais de Scolarité</span>
                <span className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(detailEnrollment.agreedTuition)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800">
                <span className="text-[11px] text-neutral-400 block mb-0.5">Solde Restant</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatMoney(detailEnrollment.balanceDue)}
                </span>
              </div>
            </div>

            {/* Installments Table in Drawer */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Échéancier des versements
              </h3>
              <div className="space-y-2">
                {detailEnrollment.installments?.map((inst, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        Versement #{idx + 1}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Échéance : {inst.dueDate} {inst.paidAt && `· Payé le ${inst.paidAt.split('T')[0]}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-neutral-900 dark:text-white tabular-nums">
                        {formatMoney(inst.amount)}
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${
                          inst.isPaid ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {inst.isPaid ? '✓ Soldé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
              {detailEnrollment.balanceDue > 0 && (
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  icon={<Plus size={14} />}
                  className="flex-1 justify-center"
                  onClick={() => {
                    handleOpenPayment(detailEnrollment, 0);
                    setDetailEnrollment(null);
                  }}
                >
                  Encaisser un versement
                </AtriumButton>
              )}
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Printer size={14} />}
                onClick={() => {
                  setReceiptToPrint({
                    studentName: detailEnrollment.studentName,
                    cohortName: detailEnrollment.cohortName,
                    amount: detailEnrollment.paidAmount,
                    method: 'Comptant / Virement',
                    date: new Date().toISOString().split('T')[0],
                    receiptNumber: `REC-${detailEnrollment.id.slice(-6)}`,
                  });
                }}
              >
                Reçu
              </AtriumButton>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="text-xs font-bold uppercase tracking-wider text-[#C4785A]">
                Official Tuition Receipt
              </div>
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <div className="font-bold text-neutral-900 dark:text-white text-sm">
                {currentBusiness?.displayName || 'Atlas Academy'}
              </div>
              <div className="text-xs text-neutral-400">
                Receipt #{receiptToPrint.receiptNumber} · {receiptToPrint.date}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">{language === 'ar' ? 'المترشح / المتدرب:' : language === 'fr' ? 'Apprenant :' : 'Learner:'}</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {receiptToPrint.studentName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{language === 'ar' ? 'الفوج / الدورة التدريبية:' : language === 'fr' ? 'Promotion / Formation :' : 'Cohort / Course:'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {receiptToPrint.cohortName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t('edu_field_pay_method')}:</span>
                <span className="font-semibold">{receiptToPrint.method}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 font-bold text-sm">
                <span>{language === 'ar' ? 'المبلغ المسدد:' : language === 'fr' ? 'Montant payé :' : 'Amount Paid:'}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(receiptToPrint.amount)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
              <AtriumButton
                variant="primary"
                size="md"
                glow
                icon={<Printer size={15} />}
                className="w-full justify-center"
                onClick={() => window.print()}
              >
                Print Official Receipt
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
