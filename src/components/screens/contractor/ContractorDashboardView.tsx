import React from 'react';
import { HardHat, Building, AlertTriangle, Users, Hammer, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';

export const ContractorDashboardView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { projects, dailyLogs, dgps } = useContractorData();

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const totalContractValue = projects.reduce((acc, p) => acc + p.contractAmountDzd, 0);
  const totalRetentionHeld = projects.reduce((acc, p) => acc + p.retentionAmountDzd, 0);
  const totalBilledDzd = dgps.reduce((acc, d) => acc + d.periodGrossDzd, 0);

  const activeProjects = projects.filter((p) => p.status === 'InProgress');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <HardHat size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'لوحة متابعة الورشات والمشاريع (BTP)' : 'Supervision des Chantiers & Projets BTP'}
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'متابعة الصفقات الجارية، نسب الإنجاز، الكشوفات والضمانات البنكية'
                : 'Avancement physique, situations de travaux (DGP) et retenues de garantie'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <div className="text-neutral-500 text-xs font-medium">
              {isAr ? 'إجمالي قيمة الصفقات المتعاقد عليها' : 'Portefeuille Marchés BTP'}
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
              {formatMoney(totalContractValue)}
            </div>
            <div className="text-[11px] text-[#C4785A]">
              {projects.length} {isAr ? 'مشاريع مسجلة' : 'projets au total'}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <div className="text-neutral-500 text-xs font-medium">
              {isAr ? 'الورشات النشطة قيد الإنجاز' : 'Chantiers en Cours'}
            </div>
            <div className="text-2xl font-bold font-mono text-blue-600">
              {activeProjects.length}
            </div>
            <div className="text-[11px] text-neutral-400">
              {isAr ? 'تتابع العمليات اليومية' : 'Suivi journalier actif'}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <div className="text-neutral-500 text-xs font-medium">
              {isAr ? 'مجموع الكشوفات المفوترة (DGP)' : 'Situations Facturées'}
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {formatMoney(totalBilledDzd)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              {dgps.length} {isAr ? 'كشوفات محررة' : 'situations émises'}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <div className="text-neutral-500 text-xs font-medium">
              {isAr ? 'إجمالي اقتطاع الضمان (5%)' : 'Retenue de Garantie (5%)'}
            </div>
            <div className="text-2xl font-bold font-mono text-amber-600">
              {formatMoney(totalRetentionHeld)}
            </div>
            <div className="text-[11px] text-neutral-400">
              {isAr ? 'مسترجعة عند الاستلام النهائي' : 'Libérée à la réception définitive'}
            </div>
          </div>
        </div>

        {/* Active Sites Progress */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Building size={16} className="text-[#C4785A]" />
            <span>{isAr ? 'نسب الإنجاز الفعلي بالورشات' : 'Taux d’Avancement des Chantiers Principaux'}</span>
          </h2>

          <div className="space-y-4">
            {projects.map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-white mr-2">
                      {p.projectName}
                    </span>
                    <span className="text-neutral-500">({p.clientName} · {p.siteLocation})</span>
                  </div>
                  <span className="font-mono font-bold text-[#C4785A]">
                    {p.progressPercent}%
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-[#C4785A] rounded-full transition-all duration-500"
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Daily Logs Summary */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-[#C4785A]" />
            <span>{isAr ? 'آخر تقارير ورشات العمل (Journaux de Chantier)' : 'Derniers Rapports de Chantier Signés'}</span>
          </h2>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {dailyLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-wrap items-start justify-between gap-4 text-xs">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {log.date}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                      {log.weather}
                    </span>
                    <span className="text-neutral-500">
                      · {log.headcountWorkers} ouvriers sur site
                    </span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {log.tasksAccomplished}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-neutral-400">Signé par</div>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {log.supervisorSignature}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
