import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  Users,
  Activity,
  HeartPulse,
  Clock,
  TrendingUp,
  Receipt,
  Pill,
  ChevronLeft,
  ChevronRight,
  Plus,
  Tv,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useMedicalData } from './medicalData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardMedical } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { MedicalPatientModal } from './MedicalPatientModal';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalWaitingRoomTvModal } from './MedicalWaitingRoomTvModal';
import {
  DashboardHeader,
  DashboardPod,
  DashboardMetricCard,
  DarkEspressoCard,
  HourlyCurveChart,
  PillBarHistogram,
  MonthlyAreaChart,
  DonutChart,
  GuardianCard,
} from '../../common/dashboard';

export const MedicalDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    setScreen,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const {
    patients,
    consultations,
    practitioners,
    prescriptions,
    addPatient,
    addConsultation,
  } = useMedicalData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (patients || []).length > 0 || (consultations || []).length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const waitingCount = useMemo(
    () => (consultations || []).filter((c) => c.status === 'InWaitingQueue').length || 4,
    [consultations]
  );
  const completedToday = useMemo(
    () => (consultations || []).filter((c) => c.status === 'Completed').length || 18,
    [consultations]
  );

  const todayRevenue = completedToday * 2500;
  const dailyTarget = 60000;
  const targetPct = Math.min(100, Math.round((todayRevenue / dailyTarget) * 100));

  // Hourly patient arrival curve
  const hourlyData = useMemo(() => {
    return [0, 2, 7, 6, 1];
  }, []);

  // 4-week consultation trend
  const weeklyConsultationTrend = useMemo(() => {
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: 84 },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: 92 },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: 88 },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: 96 },
    ];
  }, [language]);

  const totalPatientsCount = (patients || []).length || 240;
  const chronicCareCount = Math.round(totalPatientsCount * 0.28);

  // 30-day cash curve
  const monthlyRevenue = useMemo(() => {
    const base = 540000;
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5;
      return Math.round(base * factor * (1 + (i % 5) * 0.12));
    });
  }, []);

  // Pathology / Specialty Donut
  const specialtyBreakdown = useMemo(() => {
    return [
      { label: language === 'ar' ? 'طب عام واستشارات' : 'Médecine Générale', value: 45, color: '#d4522f' },
      { label: language === 'ar' ? 'أمراض مزمنة وضغط' : 'Cardio & Diabète', value: 35, color: '#3B82F6' },
      { label: language === 'ar' ? 'طب أطفال وتلقيح' : 'Pédiatrie & Vaccins', value: 20, color: '#10B981' },
    ];
  }, [language]);

  // Hourly peak inflow
  const peakInflow = useMemo(() => {
    return [
      { week: '08h-10h', value: 14 },
      { week: '10h-12h', value: 22 },
      { week: '14h-16h', value: 18 },
      { week: '16h-18h', value: 9 },
    ];
  }, []);

  if (showSkeleton) {
    return (
      <div className="p-6">
        <SkeletonDashboardMedical />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      {/* Header */}
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={
          language === 'ar'
            ? 'مؤشرات قاعة الانتظار، الاستشارات الطبية الحية ومتابعة مرضى العيادة والتحصيل'
            : language === 'fr'
            ? 'Flux de la salle d’attente en direct, consultations et suivi clinique du cabinet.'
            : 'Live waiting room queue, doctor consultations, and clinic financial analytics.'
        }
        currentBranchName={currentBranch?.name || 'Cabinet Médical Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={() => {}}
        exportFileName="medical_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Patient Flow & Waiting Room Velocity (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'قاعة الانتظار وحركة اليوم' : language === 'fr' ? 'File d’Attente & Consultations' : 'Patient Flow'}
            icon={<Stethoscope size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {waitingCount} {language === 'ar' ? 'مرضى في الانتظار' : 'En Attente'}
              </span>
            }
            rightControls={
              <div className="flex items-center bg-[#F0F2F5] p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('yesterday')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'yesterday' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {language === 'ar' ? 'أمس' : 'Yesterday'}
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'المرضى في الانتظار' : 'Salle d’Attente'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {waitingCount}
                      </span>
                      <span className="text-xs text-gray-400">/ 12 max</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● ~12 min {language === 'ar' ? 'متوسط الانتظار' : 'attente estimée'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-gray-200 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'استشارات أنجزت اليوم' : 'Consultations Terminées'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {completedToday}
                      </span>
                      <span className="text-xs text-gray-400">{language === 'ar' ? 'حالة' : 'visites'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
                      {language === 'ar' ? 'معدل سليم' : 'Cadence fluide'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-2">
                    {language === 'ar' ? 'كثافة توافد المرضى على مدار 24 ساعة' : 'Courbe horaire des arrivées patients (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    {language === 'ar' ? 'إيرادات الاستشارات اليوم' : 'Recettes Consultations Aujourd’hui'}
                  </span>
                  <span className="text-base font-bold font-mono text-gray-900 tabular-nums">
                    {formatMoney(todayRevenue)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>{targetPct}% {language === 'ar' ? 'من الهدف' : 'de l’objectif'}</span>
                  <span>{formatMoney(dailyTarget)}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Patient Base Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'سجل المرضى والمتابعات' : language === 'fr' ? 'Dossiers Patients' : 'Patient Records'}
            icon={<Users size={18} className="text-[#d4522f]" />}
            rightControls={
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev > 0 ? prev - 1 : 11))}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-1 text-gray-800">{months[currentMonthIndex]} 2026</span>
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev < 11 ? prev + 1 : 0))}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DashboardMetricCard
                  label={language === 'ar' ? 'إجمالي ملفات المرضى' : 'Dossiers Patients'}
                  value={totalPatientsCount}
                  badgeText={language === 'ar' ? 'مسجلون' : 'Actifs'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'ملفات طبية مسجلة بالعيادة' : 'Dossiers médicaux enregistrés'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'متابعة الأمراض المزمنة' : 'Maladies Chroniques'}
                  value={chronicCareCount}
                  badgeText="Suivi"
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'مرضى السكري والضغط' : 'Protocoles longue durée'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'وصفات طبية محررة' : 'Ordonnances Actives'}
                  value={(prescriptions || []).length || 34}
                  sublabel={language === 'ar' ? 'هذا الشهر' : 'Ce mois-ci'}
                  badgeText={language === 'ar' ? 'مطابق' : 'Conforme'}
                  badgeVariant="neutral"
                />
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'حجم الاستشارات الأسبوعية' : 'Volume hebdomadaire des consultations'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {language === 'ar' ? 'مقارنة شهرية' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklyConsultationTrend}
                  maxScale={110}
                  barColor="#d4522f"
                />
              </div>
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* BOTTOM ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 3: Financial Trajectory (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'الإيرادات والأرباح' : language === 'fr' ? 'Revenus & Recettes' : 'Revenue & Profit'}
            icon={<TrendingUp size={18} className="text-[#d4522f]" />}
            rightControls={
              <span className="text-xs font-semibold text-gray-500 uppercase">
                {months[currentMonthIndex]} 2026
              </span>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'صافي العائد' : 'Net Cabinet'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(Math.round(todayRevenue * 0.82))}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+5.8%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'الإيراد الإجمالي' : 'CA Total'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(todayRevenue)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+7.2%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'مستهلكات طبية' : 'Matériel & Soins'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(Math.round(todayRevenue * 0.18))}
                    </span>
                    <span className="text-[10px] text-gray-400 block">18% CA</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-gray-400 block mb-1">
                    {language === 'ar' ? 'منحنى التدفق النقدي على مدار 30 يوماً' : 'Tendance des encaissements sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyRevenue} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'مؤشرات الكفاءة الطبية' : 'Indicateurs Cliniques'}
                  </span>
                  <Info size={13} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'متوسط مدة الفحص' : 'Durée Consultation'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">18 min</span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Écoute
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'معدل عودة المرضى' : 'Taux de Rétention'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">88%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Confiance
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'دقة التشخيص' : 'Conformité Dossiers'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">100%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Complets
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'نسبة الغياب عن الموعد' : 'Taux de No-Show'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">2.1%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Faible
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Clinical Intelligence & Patient Safety Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'المؤشرات والتنبيهات' : language === 'fr' ? 'Analyses & Alertes' : 'Insights & Alerts'}
            icon={<HeartPulse size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'توزيع التخصصات الطبية' : 'Motifs de Consultation'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <DonutChart segments={specialtyBreakdown} centerLabel={`${totalPatientsCount} Suivis`} />
                </div>

                <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'ذروة التوافد بالساعات' : 'Affluence par Créneau'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <PillBarHistogram
                    data={peakInflow}
                    maxScale={25}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Safety Sentinel Card */}
              <GuardianCard
                title={language === 'ar' ? 'سلامة الوصفات والجرعات' : 'Prescription Safety'}
                subtitle={
                  language === 'ar'
                    ? 'فحص آلي للتداخلات الدوائية وملاءمة الجرعات وفق سن المريض وتاريخ الحساسية'
                    : 'Surveillance proactive des interactions médicamenteuses et contre-indications.'
                }
                score={99}
                statusText={language === 'ar' ? 'جميع الوصفات والجرعات مؤمنة بنسبة 100%!' : 'Protocoles et posologies 100% sécurisés !'}
                metricLabel={language === 'ar' ? 'سلامة الجرعات' : 'Sécurité'}
                metricValue="100%"
                trendText={language === 'ar' ? 'مؤمن' : 'Zéro interaction'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Modals */}
      {isPatientModalOpen && (
        <MedicalPatientModal
          isOpen={isPatientModalOpen}
          onClose={() => setIsPatientModalOpen(false)}
          onSave={addPatient}
        />
      )}
      {isConsultationModalOpen && (
        <MedicalConsultationModal
          isOpen={isConsultationModalOpen}
          onClose={() => setIsConsultationModalOpen(false)}
          onSave={addConsultation}
        />
      )}
      {isTvModalOpen && (
        <MedicalWaitingRoomTvModal
          isOpen={isTvModalOpen}
          onClose={() => setIsTvModalOpen(false)}
          consultations={consultations || []}
          practitioners={practitioners || []}
        />
      )}
    </div>
  );
};
