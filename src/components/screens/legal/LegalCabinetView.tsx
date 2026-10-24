import React, { useState, useEffect } from 'react';
import {
  Scale,
  Briefcase,
  FileText,
  Calendar,
  Lock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Building,
  User,
  Gavel,
  Landmark,
  FileCheck,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { LegalMatter, LegalHearing } from '../../../types/index';

interface LegalCabinetViewProps {
  initialTab?: 'dashboard' | 'matters' | 'hearings' | 'vault' | 'trust';
}

export const LegalCabinetView: React.FC<LegalCabinetViewProps> = ({ initialTab = 'dashboard' }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const { t } = useTranslation();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'matters' | 'hearings' | 'vault' | 'trust'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modals
  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [selectedMatterForInvoice, setSelectedMatterForInvoice] = useState<LegalMatter | null>(null);

  // Mock State
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
    {
      id: 'mat_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      matterNumber: 'DOS-2026-0092',
      title: 'Règlement Successoral & Partage Immobilier Famille Mansouri',
      category: 'Civil',
      clientName: 'Héritiers Feu Hadj Mansouri',
      clientPhone: '0661 44 55 66',
      courtJurisdiction: 'Cour d\'Alger, Section Statut Personnel',
      assignedLawyer: 'Maître L. Boumediene (Notaire & Avocat)',
      retainerAmountDzd: 180000,
      trustEscrowBalanceDzd: 8500000,
      status: 'Active',
      nextHearingDate: '2026-06-05',
      createdAt: '2026-05-04T09:00:00Z',
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
      presidingJudge: 'M. Le Juge Président Benmansour',
      objective: 'Dépôt des conclusions en réponse et pièces justificatives (BAT / Factures impayées)',
      status: 'Scheduled',
      createdAt: '2026-05-05T09:00:00Z',
    },
    {
      id: 'hear_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      matterId: 'mat_02',
      matterNumber: 'DOS-2026-0092',
      hearingDate: '2026-06-05',
      courtRoom: 'Salle des Audiences Civiles 1',
      presidingJudge: 'Mme La Présidente Khelifi',
      objective: 'Homologation du rapport d\'expertise foncière et projet d\'acte de partage',
      status: 'Scheduled',
      createdAt: '2026-05-08T10:00:00Z',
    },
  ]);

  // Form states for Matter Modal
  const [matterTitle, setMatterTitle] = useState('');
  const [matterCat, setMatterCat] = useState<'Commercial' | 'Civil' | 'Penal' | 'Labor' | 'TaxAdvisory' | 'NotaryAct'>('Commercial');
  const [matterClient, setMatterClient] = useState('');
  const [matterPhone, setMatterPhone] = useState('');
  const [matterAdverse, setMatterAdverse] = useState('');
  const [matterCourt, setMatterCourt] = useState('Tribunal de Sidi M\'Hamed, Alger');
  const [matterRetainer, setMatterRetainer] = useState('200000');
  const [matterEscrow, setMatterEscrow] = useState('500000');
  const [matterNextDate, setMatterNextDate] = useState('2026-06-15');

  // Form states for Hearing Modal
  const [hearMatterId, setHearMatterId] = useState(matters[0]?.id || '');
  const [hearDate, setHearDate] = useState('2026-06-10');
  const [hearRoom, setHearRoom] = useState('Chambre Commerciale 1, Salle 2');
  const [hearJudge, setHearJudge] = useState('M. Le Président');
  const [hearObjective, setHearObjective] = useState('Plaidoirie sur le fond et examen des pièces');

  const handleCreateMatter = (e: React.FormEvent) => {
    e.preventDefault();
    const createdMatter: LegalMatter = {
      id: `mat_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      matterNumber: `DOS-2026-${String(matters.length + 93).padStart(4, '0')}`,
      title: matterTitle,
      category: matterCat,
      clientName: matterClient,
      clientPhone: matterPhone,
      adversePartyName: matterAdverse,
      courtJurisdiction: matterCourt,
      assignedLawyer: 'Maître Avocat Référent',
      retainerAmountDzd: parseInt(matterRetainer, 10) || 150000,
      trustEscrowBalanceDzd: parseInt(matterEscrow, 10) || 0,
      status: 'PendingHearing',
      nextHearingDate: matterNextDate,
      createdAt: new Date().toISOString(),
    };

    setMatters([createdMatter, ...matters]);
    setIsMatterModalOpen(false);
    setMatterTitle('');
    setMatterClient('');
    showToast({
      type: 'success',
      title: isAr ? 'تم فتح ملف القضية' : 'Dossier d\'Affaire Ouvert',
      message: `${createdMatter.matterNumber} enregistré avec vérification de non-conflit.`,
    });
  };

  const handleCreateHearing = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenMatter = matters.find((m) => m.id === hearMatterId) || matters[0];
    const createdHearing: LegalHearing = {
      id: `hear_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      matterId: chosenMatter.id,
      matterNumber: chosenMatter.matterNumber,
      hearingDate: hearDate,
      courtRoom: hearRoom,
      presidingJudge: hearJudge,
      objective: hearObjective,
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
    };

    setHearings([createdHearing, ...hearings]);
    setIsHearingModalOpen(false);
    showToast({
      type: 'success',
      title: isAr ? 'تم جدولة الجلسة' : 'Audience Fixée au Rôle',
      message: `Audience du ${hearDate} ajoutée pour le dossier ${chosenMatter.matterNumber}.`,
    });
  };

  // Metrics
  const totalMatters = matters.length;
  const totalTrustEscrowDzd = matters.reduce((acc, m) => acc + m.trustEscrowBalanceDzd, 0);
  const totalRetainersBilledDzd = matters.reduce((acc, m) => acc + m.retainerAmountDzd, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-sm border border-purple-100 dark:border-purple-800">
            <Scale size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {isAr ? 'مكتب المحاماة والاستشارات القانونية' : 'Cabinet d\'Avocats & Conseil Juridique'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                FacilityType: 22
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'إدارة ملفات القضايا، أجندة الجلسات، حساب الحراسة والودائع (Séquestre) ونوتات الأتعاب'
                : 'Dossiers d\'affaires, calendrier des audiences, compte séquestre et notes d\'honoraires'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHearingModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Calendar size={15} />
            <span>{isAr ? 'جدولة جلسة' : '+ Nouvelle Audience'}</span>
          </button>
          <button
            onClick={() => setIsMatterModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>{isAr ? 'فتح ملف قضية' : '+ Nouveau Dossier'}</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'border-purple-600 text-purple-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Scale size={15} />
          <span>{isAr ? 'لوحة المكتب' : 'Tableau Cabinet'}</span>
        </button>
        <button
          onClick={() => setActiveTab('matters')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'matters' ? 'border-purple-600 text-purple-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Briefcase size={15} />
          <span>{isAr ? `ملفات القضايا (${matters.length})` : `Dossiers & Affaires (${matters.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('hearings')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'hearings' ? 'border-purple-600 text-purple-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Calendar size={15} />
          <span>{isAr ? `جدول الجلسات (${hearings.length})` : `Calendrier Audiences (${hearings.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'vault' ? 'border-purple-600 text-purple-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Lock size={15} />
          <span>{isAr ? 'خزينة المستندات والأدلة' : 'Coffre-Fort & Pièces'}</span>
        </button>
        <button
          onClick={() => setActiveTab('trust')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'trust' ? 'border-purple-600 text-purple-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Landmark size={15} />
          <span>{isAr ? 'حساب الحراسة والأتعاب' : 'Compte Séquestre & Honoraires'}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD                                                          */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'القضايا النشطة' : 'Dossiers Actifs'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-purple-600">{totalMatters}</div>
                <div className="text-[11px] text-neutral-400 mt-1">Devant les juridictions</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'أموال الحراسة المودعة' : 'Fonds en Séquestre'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
                  {formatMoney(totalTrustEscrowDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Compte CARPA / Séquestre bancaire</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'الجلسات المقررة' : 'Audiences Fixées'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-blue-600">{hearings.length}</div>
                <div className="text-[11px] text-neutral-400 mt-1">Ce mois-ci au rôle</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'الودائع والأتعاب المقبوضة' : 'Provisions sur Honoraires'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-indigo-600">
                  {formatMoney(totalRetainersBilledDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Comptabilité cabinet</div>
              </div>
            </div>

            {/* Next Hearings Alert Strip */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-purple-600" />
                <span>{isAr ? 'الجلسات القادمة بالمحاكم والمجالس' : 'Prochaines Audiences au Rôle des Juridictions'}</span>
              </h3>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {hearings.map((h) => (
                  <div key={h.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                          {h.hearingDate}
                        </span>
                        <span className="font-bold text-neutral-900 dark:text-white">{h.matterNumber}</span>
                        <span className="text-neutral-500 font-mono">({h.courtRoom})</span>
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        {h.objective}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-neutral-400 italic">{h.presidingJudge}</span>
                      <button
                        onClick={() => {
                          const matter = matters.find((m) => m.id === h.matterId) || matters[0];
                          setSelectedMatterForInvoice(matter);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={13} />
                        <span>Note d'Honoraires</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MATTERS (DOSSIERS)                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'matters' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matters.map((m) => (
                <div key={m.id} className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      {m.matterNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600">
                      {m.category}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-neutral-900 dark:text-white">{m.title}</div>

                  <div className="space-y-1 text-xs text-neutral-500">
                    <div>Client: <strong className="text-neutral-900 dark:text-white">{m.clientName}</strong> ({m.clientPhone})</div>
                    <div>Partie Adverse: <strong>{m.adversePartyName || 'N/A'}</strong></div>
                    <div>Juridiction: <strong>{m.courtJurisdiction}</strong></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400">Provision Honoraires</div>
                      <div className="font-bold text-purple-600 mt-0.5">{formatMoney(m.retainerAmountDzd, 'DZD')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Fonds en Séquestre</div>
                      <div className="font-bold text-emerald-600 mt-0.5">{formatMoney(m.trustEscrowBalanceDzd, 'DZD')}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Avocat: {m.assignedLawyer}</span>
                    <button
                      onClick={() => setSelectedMatterForInvoice(m)}
                      className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>Émettre Note d'Honoraires</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HEARINGS (AUDIENCES)                                               */}
        {/* ========================================================================= */}
        {activeTab === 'hearings' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 font-bold text-xs">
                Rôle des Audiences Judiciaires Fixées
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {hearings.map((h) => (
                  <div key={h.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                          {h.hearingDate}
                        </span>
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">{h.courtRoom}</span>
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        Dossier: <strong>{h.matterNumber}</strong> — {h.objective}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-neutral-400 italic">{h.presidingJudge}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: VAULT (PIÈCES & PREUVES)                                           */}
        {/* ========================================================================= */}
        {activeTab === 'vault' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Lock size={16} className="text-purple-600" />
              <span>Coffre-Fort Numérique & Pièces Justificatives Numérisées</span>
            </h3>
            <p className="text-neutral-500">
              Tous les actes notariés, conclusions et pièces probantes sont horodatés et scellés avec empreinte cryptographique.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-bold">Conclusions_en_Reponse_DOS-2026-0091.pdf</div>
                  <div className="text-neutral-400 text-[11px]">Signé électroniquement · 2.4 Mo</div>
                </div>
                <span className="font-mono text-emerald-600 font-bold">SCELLÉ</span>
              </div>
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-bold">Acte_Partage_Successoral_Mansouri.pdf</div>
                  <div className="text-neutral-400 text-[11px]">Enregistrement notarial · 5.8 Mo</div>
                </div>
                <span className="font-mono text-emerald-600 font-bold">SCELLÉ</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: TRUST ESCROW (SÉQUESTRE)                                           */}
        {/* ========================================================================= */}
        {activeTab === 'trust' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Landmark size={16} className="text-emerald-600" />
              <span>Grand Livre des Comptes Séquestres (Fonds Clients)</span>
            </h3>
            <p className="text-neutral-500">
              Ségrégation stricte des fonds déposés en garantie ou indemnités judiciaires, garantissant zéro mélange avec les honoraires opérationnels du cabinet.
            </p>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {matters.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-neutral-900 dark:text-white">{m.matterNumber} — {m.title}</div>
                    <div className="text-neutral-500">Bénéficiaire / Client: {m.clientName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-emerald-600">
                      {formatMoney(m.trustEscrowBalanceDzd, 'DZD')}
                    </div>
                    <div className="text-[10px] text-neutral-400">Solde séquestre disponible</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NOUVEAU DOSSIER D'AFFAIRE                                        */}
      {/* ========================================================================= */}
      {isMatterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Briefcase size={18} className="text-purple-600" />
                <span>Nouveau Dossier d'Affaire</span>
              </h2>
              <button onClick={() => setIsMatterModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateMatter} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Intitulé de l'Affaire *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Action en paiement créance SARL Atlas c/ SPA BTP"
                  value={matterTitle}
                  onChange={(e) => setMatterTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Matière / Juridiction</label>
                  <select
                    value={matterCat}
                    onChange={(e: any) => setMatterCat(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  >
                    <option value="Commercial">Commercial & Sociétés</option>
                    <option value="Civil">Civil & Foncier</option>
                    <option value="Labor">Droit Social / Travail</option>
                    <option value="Penal">Pénal des Affaires</option>
                    <option value="TaxAdvisory">Fiscal & Conseil</option>
                    <option value="NotaryAct">Acte Authentique / Notariat</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Juridiction Compétente</label>
                  <input
                    type="text"
                    value={matterCourt}
                    onChange={(e) => setMatterCourt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Nom du Client / Demandeur *</label>
                  <input
                    required
                    type="text"
                    placeholder="M. Farid Mansouri"
                    value={matterClient}
                    onChange={(e) => setMatterClient(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Téléphone Client *</label>
                  <input
                    required
                    type="text"
                    placeholder="0550 11 22 33"
                    value={matterPhone}
                    onChange={(e) => setMatterPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Partie Adverse / Défendeur (Vérification Conflit)</label>
                <input
                  type="text"
                  placeholder="Société ou personne adverse"
                  value={matterAdverse}
                  onChange={(e) => setMatterAdverse(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Provision d'Honoraires (DZD)</label>
                  <input
                    type="number"
                    value={matterRetainer}
                    onChange={(e) => setMatterRetainer(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Fonds en Séquestre (DZD)</label>
                  <input
                    type="number"
                    value={matterEscrow}
                    onChange={(e) => setMatterEscrow(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsMatterModalOpen(false)} className="px-3 py-1.5 border rounded">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 bg-purple-600 text-white rounded font-medium">
                  Enregistrer le Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NOUVELLE AUDIENCE                                                */}
      {/* ========================================================================= */}
      {isHearingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Calendar size={18} className="text-purple-600" />
                <span>Fixer une Nouvelle Audience au Rôle</span>
              </h2>
              <button onClick={() => setIsHearingModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateHearing} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Dossier d'Affaire *</label>
                <select
                  value={hearMatterId}
                  onChange={(e) => setHearMatterId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                >
                  {matters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.matterNumber} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Date d'Audience *</label>
                  <input
                    required
                    type="date"
                    value={hearDate}
                    onChange={(e) => setHearDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Salle / Chambre</label>
                  <input
                    type="text"
                    value={hearRoom}
                    onChange={(e) => setHearRoom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Président de Chambre</label>
                <input
                  type="text"
                  value={hearJudge}
                  onChange={(e) => setHearJudge(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Objet de l'Audience</label>
                <textarea
                  rows={2}
                  value={hearObjective}
                  onChange={(e) => setHearObjective(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsHearingModalOpen(false)} className="px-3 py-1.5 border rounded">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 bg-purple-600 text-white rounded font-medium">
                  Inscrire au Calendrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NOTE D'HONORAIRES                                                */}
      {/* ========================================================================= */}
      {selectedMatterForInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-xl w-full p-8 shadow-2xl border border-neutral-200 space-y-6 text-xs">
            <div className="border-b-2 border-neutral-900 pb-4 flex items-center justify-between">
              <div>
                <div className="text-base font-black tracking-wider uppercase">
                  {currentBusiness?.name || 'CABINET D\'AVOCATS & CONSEIL JURIDIQUE'}
                </div>
                <div className="text-neutral-500 text-[11px]">
                  Barreau d'Alger · Cour d'Alger & Tribunal de Sidi M'Hamed
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-purple-600">
                  NOTE D'HONORAIRES N° NH-2026-0114
                </div>
                <div className="text-[10px] text-neutral-400">Date: {new Date().toLocaleDateString('fr-FR')}</div>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
              <div>Dossier Réf: <strong>{selectedMatterForInvoice.matterNumber}</strong></div>
              <div>Affaire: <strong>{selectedMatterForInvoice.title}</strong></div>
              <div>Client: <strong>{selectedMatterForInvoice.clientName}</strong></div>
            </div>

            <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200 text-xs font-mono">
              <div className="p-2.5 flex justify-between bg-neutral-50 font-bold font-sans">
                <span>Prestations & Débours</span>
                <span>Montant DZD</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span>Étude du dossier, rédaction des conclusions & requêtes</span>
                <span>120,000 DZD</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span>Représentation & plaidoirie aux audiences</span>
                <span>80,000 DZD</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span>Débours (Droits de timbre, signification huissier de justice)</span>
                <span>15,000 DZD</span>
              </div>
              <div className="p-2.5 flex justify-between font-bold text-sm bg-purple-50 text-purple-900">
                <span>TOTAL DES HONORAIRES & DÉBOURS</span>
                <span>215,000 DZD</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button onClick={() => setSelectedMatterForInvoice(null)} className="px-4 py-2 border rounded-lg font-medium">
                Fermer
              </button>
              <button
                onClick={() => {
                  window.print();
                  showToast({
                    type: 'success',
                    title: 'Note d\'Honoraires Imprimée',
                    message: 'Document officiel prêt pour remise au client.',
                  });
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1.5"
              >
                <Printer size={15} />
                <span>Imprimer la Note d'Honoraires</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
