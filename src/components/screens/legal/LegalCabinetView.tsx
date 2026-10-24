import React, { useState } from 'react';
import {
  Scale,
  Briefcase,
  FileText,
  Calendar,
  Lock,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { LegalMatter, LegalHearing } from '../../../types/index';

export const LegalCabinetView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matters' | 'hearings' | 'vault'>('dashboard');

  const [matters, setMatters] = useState<LegalMatter[]>([
    {
      id: 'mat_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      matterNumber: 'DOS-2026-0091',
      title: 'Contentieux Commercial / Recouvrement Créance SARL Atlas c/ SPA BTP',
      category: 'Commercial',
      clientName: 'SARL Atlas Distribution',
      clientPhone: '0555 88 99 00',
      adversePartyName: 'SPA BTP Méditerranée',
      courtJurisdiction: 'Tribunal de Commerce de Sidi M\'Hamed, Alger',
      assignedLawyer: 'Maître Y. Cherif (Avocat à la Cour)',
      retainerAmountDzd: 250000,
      trustEscrowBalanceDzd: 1200000,
      status: 'PendingHearing',
      nextHearingDate: '2026-05-22',
      createdAt: '2026-05-01T08:00:00Z',
    },
  ]);

  const [hearings, setHearings] = useState<LegalHearing[]>([
    {
      id: 'hear_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      matterId: 'mat_01',
      matterNumber: 'DOS-2026-0091',
      hearingDate: '2026-05-22',
      courtRoom: 'Chambre Commerciale 2, Salle 4',
      presidingJudge: 'M. Le Juge Président',
      objective: 'Dépôt des conclusions en réponse et pièces justificatives (BAT / Factures)',
      status: 'Scheduled',
      createdAt: '2026-05-05T09:00:00Z',
    },
  ]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-sm border border-purple-100 dark:border-purple-800">
            <Scale size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'مكتب المحاماة والاستشارات القانونية' : 'Cabinet d\'Avocats & Conseil Juridique'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                FacilityType: 22
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Dossiers d'affaires, calendrier des audiences, coffre-fort d'actes et comptes séquestres
            </p>
          </div>
        </div>

        <button
          onClick={() => showToast('Nouveau dossier d\'affaire initié', 'success')}
          className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>Nouveau Dossier d'Affaire</span>
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-purple-600 text-purple-600' : 'border-transparent text-neutral-500'}`}
        >
          <Briefcase size={15} />
          <span>Tableau du Cabinet</span>
        </button>
        <button
          onClick={() => setActiveTab('matters')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'matters' ? 'border-purple-600 text-purple-600' : 'border-transparent text-neutral-500'}`}
        >
          <FileText size={15} />
          <span>Dossiers & Affaires ({matters.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('hearings')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'hearings' ? 'border-purple-600 text-purple-600' : 'border-transparent text-neutral-500'}`}
        >
          <Calendar size={15} />
          <span>Rôle des Audiences ({hearings.length})</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Affaires en Cours</div>
            <div className="text-2xl font-bold font-mono mt-1">{matters.length}</div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Fonds Séquestres Déposés</div>
            <div className="text-2xl font-bold font-mono mt-1 text-purple-600">
              {formatMoney(
                matters.reduce((acc, m) => acc + m.trustEscrowBalanceDzd, 0),
                'DZD'
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Audiences Prévues ce Mois</div>
            <div className="text-2xl font-bold font-mono mt-1 text-amber-600">{hearings.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold">Dossiers d'Affaires & Contentieux</h3>
          {matters.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="text-xs font-bold">{m.matterNumber} — {m.title}</div>
                <div className="text-[11px] text-neutral-500">
                  Juridiction: {m.courtJurisdiction} · Avocat: {m.assignedLawyer}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  {m.category}
                </span>
                <span className="font-mono text-xs font-bold">{formatMoney(m.retainerAmountDzd, 'DZD')}</span>
                <button
                  onClick={() => showToast('Dossier de plaidoirie ouvert', 'success')}
                  className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-xs font-medium"
                >
                  Ouvrir Pièces
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
