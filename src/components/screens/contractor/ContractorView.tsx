import React, { useState } from 'react';
import {
  HardHat,
  Hammer,
  ClipboardList,
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { ContractorProject, ContractorBoqItem } from '../../../types/index';

export const ContractorView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'progress' | 'finance'>('dashboard');

  const [projects, setProjects] = useState<ContractorProject[]>([
    {
      id: 'btp_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectCode: 'CHANT-2026-08',
      projectName: 'Construction Siège Administratif R+4 Chéraga',
      clientName: 'Société Nationale Immobilière',
      siteLocation: 'Zone d\'Activité Chéraga, Alger',
      contractAmountDzd: 85000000,
      retentionGuaranteePercent: 5,
      retentionAmountDzd: 4250000,
      startDate: '2026-02-01',
      targetEndDate: '2026-11-30',
      supervisorName: 'Ingénieur Mourad K.',
      progressPercent: 42,
      status: 'InProgress',
      createdAt: '2026-02-01T08:00:00Z',
    },
  ]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-950/60 text-yellow-600 dark:text-yellow-400 flex items-center justify-center font-bold shadow-sm border border-yellow-100 dark:border-yellow-800">
            <HardHat size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'مقاولات البناء والأشغال العمومية BTP' : 'BTP, Travaux Publics & Génie Civil'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                FacilityType: 24
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Devis quantitatifs (BPU/BOQ), attachements mensuels, décomptes provisoires (DGP) et retenue de garantie 5%
            </p>
          </div>
        </div>

        <button
          onClick={() => showToast('Assistant nouveau chantier ouvert', 'success')}
          className="px-3 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>Nouveau Chantier (Projet)</span>
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-yellow-600 text-yellow-600' : 'border-transparent text-neutral-500'}`}
        >
          <Building size={15} />
          <span>Tableau Chantiers</span>
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'projects' ? 'border-yellow-600 text-yellow-600' : 'border-transparent text-neutral-500'}`}
        >
          <Hammer size={15} />
          <span>Projets & Chantiers ({projects.length})</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Portefeuille Marchés BTP</div>
            <div className="text-2xl font-bold font-mono mt-1 text-yellow-600">
              {formatMoney(
                projects.reduce((acc, p) => acc + p.contractAmountDzd, 0),
                'DZD'
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Retenues de Garantie Bloquées (5%)</div>
            <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
              {formatMoney(
                projects.reduce((acc, p) => acc + p.retentionAmountDzd, 0),
                'DZD'
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Chantiers Actifs</div>
            <div className="text-2xl font-bold font-mono mt-1">{projects.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold">Chantiers en Cours d'Exécution</h3>
          {projects.map((p) => (
            <div key={p.id} className="py-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="text-xs font-bold">{p.projectCode} — {p.projectName}</div>
                <div className="text-[11px] text-neutral-500">
                  Client: {p.clientName} · Chef de Chantier: {p.supervisorName}
                </div>
                <div className="w-48 bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${p.progressPercent}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold">{p.progressPercent}% réalisé</span>
                <button
                  onClick={() => showToast('Attachement de travaux mensuel (DGP) généré', 'success')}
                  className="px-2.5 py-1 rounded bg-yellow-50 text-yellow-800 hover:bg-yellow-100 text-xs font-semibold"
                >
                  Attachement DGP
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
