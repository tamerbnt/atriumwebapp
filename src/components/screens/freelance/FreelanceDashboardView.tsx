import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Clock,
  Briefcase,
  AlertCircle,
  Play,
  Pause,
  Square,
  ArrowUpRight,
  Plus,
  FileText,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckCircle2,
  Building2,
  ChevronDown,
  Check,
  Sparkles,
  Users,
  Timer,
  Receipt,
  UserPlus,
  Layers,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatDuration, formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { FreelanceInvoice } from '../../../types/index';

export const FreelanceDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    freelanceClients,
    freelanceProjects,
    timeLogs,
    freelanceInvoices,
    freelanceProposals,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    businesses,
    branches,
    currentBusinessId,
    currentBusiness,
    switchBusiness,
    switchBranch,
    setScreen,
    updateInvoiceStatus,
    resetFreelanceMockData,
  } = useAtriumStore();

  const [previewInvoice, setPreviewInvoice] = useState<FreelanceInvoice | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'Tous' | 'Factures' | 'Temps'>('Tous');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const quickActionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setIsQuickActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (freelanceClients.length === 0 && freelanceProjects.length === 0) {
      resetFreelanceMockData?.();
    }
  }, [freelanceClients.length, freelanceProjects.length, resetFreelanceMockData]);

  // Compute stats
  const paidInvoices = freelanceInvoices.filter((i) => i.status === 'Paid');
  const overdueInvoices = freelanceInvoices.filter((i) => i.status === 'Overdue');
  const pendingInvoices = freelanceInvoices.filter((i) => i.status === 'Sent');

  // Dynamic pipeline by currency
  const pipelineByCurrency = freelanceInvoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.currency] = (acc[inv.currency] || 0) + inv.totalAmount;
    return acc;
  }, {});
  const formattedPipeline = Object.entries(pipelineByCurrency).length > 0
    ? Object.entries(pipelineByCurrency)
        .map(([curr, sum]) => formatCurrencyAmount(sum, curr as any))
        .join(' · ')
    : '0 EUR';

  // Weekly hours logged
  const totalSecondsLogged = timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
  const billableSeconds = timeLogs.filter((l) => l.isBillable).reduce((sum, log) => sum + log.durationSeconds, 0);
  const totalBillableHours = Number((billableSeconds / 3600).toFixed(1));
  const weeklyTargetHours = 35;
  const capacityPercent = Math.min(100, Math.round((totalBillableHours / weeklyTargetHours) * 100));

  // Dynamic Effective Hourly Rate
  const totalBilledValueEUR = timeLogs.reduce((sum, log) => {
    if (!log.isBillable) return sum;
    const factor = log.currency === 'DZD' ? 1 / 215 : 1;
    return sum + (log.durationSeconds / 3600) * (log.rateAtMoment || 85) * factor;
  }, 0);
  const ehrRate = totalBillableHours > 0
    ? Math.round(totalBilledValueEUR / totalBillableHours)
    : (freelanceClients[0]?.hourlyRate || 85);

  // Active deliverables count & scope creep check
  const { activeDeliverablesCount, scopeCreepCount, highestOverrunDeliverable } = useMemo(() => {
    let active = 0;
    let creep = 0;
    let highest: { title: string; projectTitle: string; diffHours: number } | null = null;

    for (const proj of freelanceProjects) {
      for (const d of proj.deliverables || []) {
        if (!d.isCompleted) active++;
        if (d.loggedHours > d.estimatedHours) {
          creep++;
          const diff = Number((d.loggedHours - d.estimatedHours).toFixed(1));
          if (!highest || diff > highest.diffHours) {
            highest = {
              title: d.title,
              projectTitle: proj.title,
              diffHours: diff,
            };
          }
        }
      }
    }

    return {
      activeDeliverablesCount: active,
      scopeCreepCount: creep,
      highestOverrunDeliverable: highest,
    };
  }, [freelanceProjects]);

  // Atrium Studio Tips
  const studioTips = [
    {
      title: language === 'ar' ? 'تتبع زحف النطاق' : language === 'fr' ? 'Contrôle du Scope Creep' : 'Control Scope Creep',
      desc: language === 'ar'
        ? 'راقب الساعات الفعلية مقارنة بالتقديرية لكل مهمة قبل إصدار الفاتورة لتفادي العمل غير المفوتر.'
        : language === 'fr'
        ? 'Surveillez les heures réelles vs estimées sur chaque livrable pour facturer les dépassements.'
        : 'Monitor actual vs estimated hours per deliverable to bill client change requests proactively.',
      link: 'scheduler',
      linkLabel: language === 'ar' ? 'عرض المهام والمشاريع' : language === 'fr' ? 'Voir les livrables' : 'View Deliverables',
    },
    {
      title: language === 'ar' ? 'تحصيل أتعاب الحجز الشهري' : language === 'fr' ? 'Facturation des Forfaits' : 'Monthly Retainers',
      desc: language === 'ar'
        ? 'تحويل العملاء إلى عقود Retainer يوفر دخلاً دورياً ثابتاً ويقلل تقلبات التدفق المالي.'
        : language === 'fr'
        ? 'Convertissez vos clients récurrents en forfaits mensuels pour sécuriser votre trésorerie.'
        : 'Convert ongoing clients to monthly retainer packages for predictable recurring cash flow.',
      link: 'members',
      linkLabel: language === 'ar' ? 'إدارة العملاء' : language === 'fr' ? 'Gérer les clients' : 'Manage Clients',
    },
    {
      title: language === 'ar' ? 'متابعة الفواتير المستحقة' : language === 'fr' ? 'Relance des Échéances' : 'Overdue Invoices',
      desc: language === 'ar'
        ? 'أرسل تذكيرات فورية بعد انقضاء موعد الاستحقاق لحماية التدفق النقدي لاستوديو العمل الخاص بك.'
        : language === 'fr'
        ? 'Relancez systématiquement les factures dès l\'échéance dépassée pour préserver votre BFR.'
        : 'Send prompt reminders as soon as due dates lapse to maintain healthy studio liquidity.',
      link: 'shop',
      linkLabel: language === 'ar' ? 'مركز الفواتير' : language === 'fr' ? 'Centre de facturation' : 'Invoices Center',
    },
    {
      title: language === 'ar' ? 'سعر الساعة الفعلي (EHR)' : language === 'fr' ? 'Taux Horaire Effectif' : 'Effective Hourly Rate',
      desc: language === 'ar'
        ? 'حساب معدل الدخل للساعة الفعلية يكشف أربح المشاريع وأكثرها استهلاكاً للوقت بدون عائد مناسب.'
        : language === 'fr'
        ? 'Analysez votre EHR pour identifier les projets à forte valeur et éliminer les missions non rentables.'
        : 'Analyze your effective hourly rate to weed out time sinks and double down on high-yield work.',
      link: 'finance',
      linkLabel: language === 'ar' ? 'المؤشرات المالية' : language === 'fr' ? 'Analytique financière' : 'Studio Finance',
    },
    {
      title: language === 'ar' ? 'جلسات التركيز بومودورو' : language === 'fr' ? 'Sessions Focus Pomodoro' : 'Focus Pomodoro Blocks',
      desc: language === 'ar'
        ? 'استخدم مؤقت الاستوديو للعمل في فترات 25 دقيقة مركزة بدون مقاطعات لمضاعفة الإنتاجية.'
        : language === 'fr'
        ? 'Activez le chronomètre intégré pour des sessions de 25 minutes concentrées sans distraction.'
        : 'Use the integrated studio timer for uninterrupted 25-minute sprints to boost output.',
      link: 'registrations',
      linkLabel: language === 'ar' ? 'متتبع الوقت' : language === 'fr' ? 'Chronomètre' : 'Time Tracker',
    },
  ];

  // Occupancy / focus histogram data (10 bars)
  const focusHistogramBars = [35, 60, 45, 80, 65, 95, 75, 90, 50, 70];

  // Unified recent activity feed
  const unifiedActivities = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      type: 'Factures' | 'Temps';
      operation: string;
      status: string;
      statusColor: string;
      time: string;
      amount?: string;
    }> = [];

    // Invoices
    freelanceInvoices.forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        title: inv.clientCompany || inv.clientName,
        type: 'Factures',
        operation: `Facture #${inv.invoiceNumber} · ${inv.items[0]?.description || 'Prestation'}`,
        status: inv.status === 'Paid' ? 'Payée' : inv.status === 'Overdue' ? 'En retard' : 'Envoyée',
        statusColor: inv.status === 'Paid'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
          : inv.status === 'Overdue'
          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
        time: inv.issueDate || 'Aujourd\'hui',
        amount: formatCurrencyAmount(inv.totalAmount, inv.currency),
      });
    });

    // Time Logs
    timeLogs.slice(0, 10).forEach((log) => {
      items.push({
        id: `log-${log.id}`,
        title: log.clientName || 'Client',
        type: 'Temps',
        operation: `${log.taskDescription || 'Session focus'} (${Number((log.durationSeconds / 3600).toFixed(1))}h)`,
        status: log.isInvoiced ? 'Facturé' : log.isBillable ? 'À facturer' : 'Non-facturable',
        statusColor: log.isInvoiced
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
          : log.isBillable
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
        time: log.date || 'Aujourd\'hui',
        amount: log.isBillable ? `€${Math.round((log.durationSeconds / 3600) * (log.rateAtMoment || 85))}` : undefined,
      });
    });

    return items;
  }, [freelanceInvoices, timeLogs]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'Tous') return unifiedActivities;
    return unifiedActivities.filter((a) => a.type === activityFilter);
  }, [unifiedActivities, activityFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Outer Rounded Workspace Panel (WPF Spec: CornerRadius 28px, 1px CardBorderBrush) */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Row 0 — Header: Split Left (Greeting) and Right (Branch Switcher + Terracotta Quick Actions) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {language === 'ar' ? 'مرحباً بعودتك، ثامر!' : language === 'fr' ? 'Bon retour, Tamer !' : 'Welcome back, Tamer!'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {language === 'ar'
                ? 'نظرة عامة حية على نشاط الاستوديو والمهام والفواتير قيد التحصيل.'
                : language === 'fr'
                ? 'Vue d\'ensemble en direct des livrables du studio, honoraires et facturation.'
                : 'Live overview of today\'s studio deliverables, client billables, and cash flow.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Building2 size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBusiness?.name || (language === 'ar' ? 'استوديو أطلس' : 'Atlas Studio')}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isFacilityDropdownOpen && (
                <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150`}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {t('topbar_fast_switch')}
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

            {/* Recharger Démo Button */}
            <button
              type="button"
              onClick={() => resetFreelanceMockData?.()}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-[#C4785A] dark:hover:text-[#C4785A] text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
              title="Seed Studio Data"
            >
              <Sparkles size={14} className="text-[#C4785A]" />
              <span className="hidden sm:inline">Démo</span>
            </button>

            {/* Terracotta Quick Actions CTA Button with 4-Item Floating Popup */}
            <div className="relative" ref={quickActionsRef}>
              <button
                type="button"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="h-[42px] px-5 rounded-[14px] bg-[#C4785A] hover:bg-[#B3694C] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <Plus size={16} />
                <span>Quick Actions</span>
              </button>

              {isQuickActionsOpen && (
                <div
                  className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-[240px] rounded-[18px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150`}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Quick Actions
                  </div>

                  <div className="space-y-1">
                    {/* Action 1: New Deliverable */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('scheduler');
                      }}
                      className="w-full h-10 px-2.5 rounded-xl flex items-center gap-3 hover:bg-[#F8F9FA] dark:hover:bg-neutral-800 transition-colors text-left rtl:text-right cursor-pointer"
                    >
                      <div className="w-[30px] h-[30px] rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center shrink-0">
                        <Layers size={15} />
                      </div>
                      <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-100">
                        {t('free_btn_new_deliverable')}
                      </span>
                    </button>

                    {/* Action 2: Start Focus Timer */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        if (freelanceClients.length > 0 && freelanceProjects.length > 0) {
                          const client = freelanceClients[0];
                          const project = freelanceProjects[0];
                          startTimer(
                            client.id,
                            client.company || client.name,
                            project.id,
                            project.title,
                            'Sprint Focus Session'
                          );
                        }
                        setScreen('registrations');
                      }}
                      className="w-full h-10 px-2.5 rounded-xl flex items-center gap-3 hover:bg-[#F8F9FA] dark:hover:bg-neutral-800 transition-colors text-left rtl:text-right cursor-pointer"
                    >
                      <div className="w-[30px] h-[30px] rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Timer size={15} />
                      </div>
                      <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-100">
                        {t('free_time_timer_start', language)}
                      </span>
                    </button>

                    {/* Action 3: Create Invoice */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('shop');
                      }}
                      className="w-full h-10 px-2.5 rounded-xl flex items-center gap-3 hover:bg-[#F8F9FA] dark:hover:bg-neutral-800 transition-colors text-left rtl:text-right cursor-pointer"
                    >
                      <div className="w-[30px] h-[30px] rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Receipt size={15} />
                      </div>
                      <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-100">
                        {t('free_btn_create_invoice')}
                      </span>
                    </button>

                    {/* Action 4: New Client */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('members');
                      }}
                      className="w-full h-10 px-2.5 rounded-xl flex items-center gap-3 hover:bg-[#F8F9FA] dark:hover:bg-neutral-800 transition-colors text-left rtl:text-right cursor-pointer"
                    >
                      <div className="w-[30px] h-[30px] rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <UserPlus size={15} />
                      </div>
                      <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-100">
                        {t('free_clients_add_new', language)}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1 — Two-Column Pod Canvas (~38% Left / ~62% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ================= LEFT COLUMN (~38% - lg:col-span-5) ================= */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 2.4.1 Summary Pod Tray */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              {/* Pod Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                    Summary
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Track live studio billable performance.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-[12px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs">
                  Weekly ▾
                </div>
              </div>

              {/* Inset Floating White Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
                {/* Section A: Two Metric Columns with hairline divider */}
                <div className="grid grid-cols-2 divide-x rtl:divide-x-reverse divide-neutral-100 dark:divide-neutral-700/60 pt-1">
                  {/* Left: Billable Hours */}
                  <div className="pr-3 rtl:pr-0 rtl:pl-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center shrink-0">
                        <Clock size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        Billable Focus
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                        {totalBillableHours}
                      </span>
                      <span className="text-xs text-neutral-400 tabular-nums">
                        / {weeklyTargetHours}h
                      </span>
                    </div>
                  </div>

                  {/* Right: Time Logs Entries */}
                  <div className="pl-3 rtl:pl-0 rtl:pr-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Timer size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        Time Logs
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                        {timeLogs.length}
                      </span>
                      <span className="text-xs text-neutral-400">
                        sessions
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section B: 10 rounded capsule bars histogram */}
                <div className="pt-2">
                  <div className="h-[120px] flex items-end justify-between gap-1.5 px-1">
                    {focusHistogramBars.map((height, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-[#F5E2D8] dark:bg-neutral-700/60 hover:bg-[#C4785A] dark:hover:bg-[#C4785A] rounded-full transition-all duration-200 group relative"
                        style={{ height: `${height}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-neutral-900 text-white text-[10px] font-mono pointer-events-none whitespace-nowrap z-20">
                          {height}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2.4.2 Dual Compact KPI Tiles */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Tile 1: Effective Hourly Rate */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    {t('free_kpi_effective_rate', language)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ↗ +8.5%
                  </span>
                </div>
                <div>
                  <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                    €{ehrRate} <span className="text-xs text-neutral-400 font-normal">/h</span>
                  </span>
                </div>
              </div>

              {/* Tile 2: Monthly Target Progress */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    Capacité Mensuelle
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ↗ On Track
                  </span>
                </div>
                <div>
                  <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                    {capacityPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* 2.4.3 Sleek Prompt Banner (Atrium Tips Card) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5">
              {/* Row 0: Header with badge and carousel controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-[#C4785A]/15 text-[#C4785A] uppercase tracking-wide">
                    ASTUCE {currentTipIndex + 1}/{studioTips.length}
                  </span>
                  <span className="text-[11.5px] font-semibold text-neutral-800 dark:text-neutral-200">
                    Conseil Atrium
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <button
                    type="button"
                    onClick={() => setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : studioTips.length - 1))}
                    className="p-1 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="tabular-nums">{currentTipIndex + 1}/{studioTips.length}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentTipIndex((prev) => (prev < studioTips.length - 1 ? prev + 1 : 0))}
                    className="p-1 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Row 1: Description */}
              <p className="text-[12.5px] text-neutral-600 dark:text-neutral-300 leading-relaxed min-h-[50px]">
                {studioTips[currentTipIndex].desc}
              </p>

              {/* Row 2: Full-width CTA Button */}
              <button
                type="button"
                onClick={() => setScreen(studioTips[currentTipIndex].link as any)}
                className="w-full h-9 rounded-[10px] bg-[#C4785A]/15 hover:bg-[#C4785A]/25 text-[#C4785A] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{studioTips[currentTipIndex].linkLabel}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~62% - lg:col-span-7) ================= */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* 2.5.1 Activity Pod Tray (Top) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5">
              <div>
                <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                  Activity
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Track your daily studio and client activity.
                </p>
              </div>

              {/* 3 Inset Activity Cards (Equal Width, 12px gap, Height 155px) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Card 1: Revenue Pipeline */}
                <div className="h-[155px] rounded-[18px] bg-white dark:bg-neutral-800 p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between relative overflow-hidden group">
                  <div className="relative z-10 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                      Invoiced Pipeline
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      ↗ {paidInvoices.length} payées
                    </span>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[20px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight truncate block">
                      {formattedPipeline}
                    </span>
                  </div>
                  {/* Subtle Sparkline SVG bleed */}
                  <svg className="absolute bottom-0 left-0 right-0 h-[65px] w-full text-emerald-500/20 fill-current opacity-60" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path d="M0,25 Q20,10 40,18 T80,8 T100,20 L100,30 L0,30 Z" />
                  </svg>
                </div>

                {/* Card 2: Active Clients & Retainers */}
                <div className="h-[155px] rounded-[18px] bg-white dark:bg-neutral-800 p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between relative overflow-hidden group">
                  <div className="relative z-10 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                      Active Roster
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      vs last month
                    </span>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                      {freelanceClients.length}
                    </span>
                  </div>
                  {/* Subtle Sparkline SVG bleed */}
                  <svg className="absolute bottom-0 left-0 right-0 h-[65px] w-full text-emerald-500/20 fill-current opacity-60" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path d="M0,28 Q25,25 50,15 T80,8 T100,5 L100,30 L0,30 Z" />
                  </svg>
                </div>

                {/* Card 3: DARK ESPRESSO CARD (#1F1D1B) — Scope Creep & Overdue Invoices */}
                <div className="h-[155px] rounded-[18px] bg-[#1F1D1B] p-4 border border-neutral-800 shadow-sm flex flex-col justify-between relative overflow-hidden text-white group">
                  <div className="relative z-10 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-400 block">
                      Attention & Overdue
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                      {overdueInvoices.length > 0 ? `${overdueInvoices.length} En retard` : scopeCreepCount > 0 ? `${scopeCreepCount} Creep` : '0 Alertes'}
                    </span>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[22px] font-bold text-white tabular-nums tracking-tight">
                      {overdueInvoices.length > 0
                        ? formatCurrencyAmount(overdueInvoices[0].totalAmount, overdueInvoices[0].currency)
                        : `${activeDeliverablesCount} Actifs`}
                    </span>
                  </div>
                  {/* Linear amber line accent */}
                  <div className="absolute bottom-6 left-4 right-4 h-0.5 bg-[#FB923C]/40" />
                </div>
              </div>
            </div>

            {/* 2.5.2 Transactions / Recent Activity Pod Tray (Bottom) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5">
              
              {/* Pod Header + Filter Pill Group */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                    Recent Activity
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Track your daily studio operational activity.
                  </p>
                </div>

                {/* Filter Pill Group (CornerRadius 10px, Height 32px, Padding 3px) */}
                <div className="h-8 p-0.5 rounded-[10px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center shadow-2xs">
                  {(['Tous', 'Factures', 'Temps'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActivityFilter(tab)}
                      className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activityFilter === tab
                          ? 'bg-[#C4785A]/15 text-[#C4785A] font-bold'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Headers Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[12px] p-3 px-4 border border-[#E9EEF0] dark:border-neutral-700/60 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 grid grid-cols-12 gap-2 shadow-2xs">
                <div className="col-span-4 flex items-center gap-1 uppercase tracking-wider">
                  <span>Client</span>
                  <span className="text-[10px] text-neutral-400">↕</span>
                </div>
                <div className="col-span-4 uppercase tracking-wider">
                  Opération
                </div>
                <div className="col-span-2 uppercase tracking-wider text-center">
                  Statut
                </div>
                <div className="col-span-2 uppercase tracking-wider text-right rtl:text-left">
                  Montant
                </div>
              </div>

              {/* Activity Rows List */}
              <div className="space-y-2">
                {filteredActivities.length === 0 ? (
                  <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-8 text-center border border-[#E9EEF0] dark:border-neutral-700/60 space-y-2">
                    <Briefcase size={28} className="mx-auto text-neutral-300 dark:text-neutral-600" />
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Aucune activité récente aujourd'hui
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Les factures émises et sessions de travail s'afficheront ici en direct.
                    </p>
                  </div>
                ) : (
                  filteredActivities.slice(0, 6).map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-white dark:bg-neutral-800 rounded-[12px] p-3 px-4 border border-[#E9EEF0] dark:border-neutral-700/60 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/40 transition-colors grid grid-cols-12 gap-2 items-center text-xs shadow-2xs group cursor-pointer"
                      onClick={() => {
                        if (activity.type === 'Factures') setScreen('shop');
                        else setScreen('registrations');
                      }}
                    >
                      {/* Col 0: Client Avatar & Name */}
                      <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0">
                          {activity.title.charAt(0)}
                        </div>
                        <span className="font-semibold text-neutral-900 dark:text-white truncate">
                          {activity.title}
                        </span>
                      </div>

                      {/* Col 1: Operation */}
                      <div className="col-span-4 text-neutral-500 dark:text-neutral-400 truncate text-[11.5px]">
                        {activity.operation}
                      </div>

                      {/* Col 2: Status Badge */}
                      <div className="col-span-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${activity.statusColor}`}>
                          {activity.status}
                        </span>
                      </div>

                      {/* Col 3: Amount or Time */}
                      <div className="col-span-2 text-right rtl:text-left text-[11px] text-neutral-600 dark:text-neutral-300 font-semibold tabular-nums">
                        {activity.amount || activity.time}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
        onMarkPaid={(id) => updateInvoiceStatus(id, 'Paid')}
      />
    </div>
  );
};
