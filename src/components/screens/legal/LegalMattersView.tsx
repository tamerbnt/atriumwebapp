import React, { useState, useMemo } from 'react';
import {
  Scale,
  Plus,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Landmark,
  UserCheck,
  ShieldCheck,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Briefcase,
  Gavel,
  BookOpen,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { LegalMatter, LegalHearing } from '../../../types';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LegalMatterModal } from './LegalMatterModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const LegalMattersView: React.FC = () => {
  const { language, showToast } = useAtriumStore();
  const { matters, hearings, addMatter, updateMatter, deleteMatter, addHearing } = useLegalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['mat_01']));
  const [sortBy, setSortBy] = useState<string>('matterNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);
  const [matterToEdit, setMatterToEdit] = useState<LegalMatter | null>(null);

  // 390px Inline Side Inspector
  const [selectedMatter, setSelectedMatter] = useState<LegalMatter | null>(null);
  const [activeTab, setActiveTab] = useState<'fiche' | 'client' | 'hearings' | 'strategy'>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Linked hearings mapping
  const matterHearingsMap = useMemo(() => {
    const map = new Map<string, LegalHearing[]>();
    hearings.forEach((h) => {
      const list = map.get(h.matterId) || [];
      list.push(h);
      map.set(h.matterId, list);
    });
    return map;
  }, [hearings]);

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      if (filterCategory !== 'All' && m.category !== filterCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = m.matterNumber.toLowerCase().includes(q);
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesClient = m.clientName.toLowerCase().includes(q);
        const matchesJurisdiction = m.courtJurisdiction.toLowerCase().includes(q);
        if (!matchesNum && !matchesTitle && !matchesClient && !matchesJurisdiction) return false;
      }
      return true;
    });
  }, [matters, filterCategory, searchQuery]);

  const sortedMatters = useMemo(() => {
    const list = [...filteredMatters];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'matterNumber') {
        const cmp = a.matterNumber.localeCompare(b.matterNumber);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'title') {
        const cmp = a.title.localeCompare(b.title);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'retainer') {
        const cmp = a.retainerAmountDzd - b.retainerAmountDzd;
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredMatters, pinnedIds, sortBy, sortDir]);

  const activeMattersCount = useMemo(() => {
    return matters.filter((m) => m.status === 'Active' || m.status === 'PendingHearing').length;
  }, [matters]);

  const totalTrustFunds = useMemo(() => {
    return matters.reduce((acc, m) => acc + (m.trustEscrowBalanceDzd || 0), 0);
  }, [matters]);

  const handleOpenAdd = () => {
    setMatterToEdit(null);
    setIsMatterModalOpen(true);
  };

  const handleOpenEdit = (m: LegalMatter) => {
    setMatterToEdit(m);
    setIsMatterModalOpen(true);
  };

  const handleDelete = (m: LegalMatter) => {
    deleteMatter(m.id);
    if (selectedMatter?.id === m.id) setSelectedMatter(null);
    showToast(language === 'ar' ? 'تمت أرشفة ملف القضية' : 'Dossier juridique archivé', 'success');
  };

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectMatter = (m: LegalMatter) => {
    setSelectedMatter(m);
    setInspectorNotes(`Dossier ${m.matterNumber}. Pièces contradictoires déposées au greffe. Stratégie de plaidoirie prête.`);
    setNoteSaved(false);
  };

  const handleAddHearingForMatter = (m: LegalMatter) => {
    const newHearing: LegalHearing = {
      id: `hear_${Date.now()}`,
      accountId: 'acc_01',
      businessId: m.businessId,
      branchId: m.branchId,
      staffId: m.staffId,
      matterId: m.id,
      matterTitle: m.title,
      hearingDate: '2026-06-20',
      hearingTime: '10:00',
      courtName: m.courtJurisdiction,
      benchJudge: 'Magistrat Titulaire',
      purpose: 'Audience de plaidoirie ou mise en état',
      resultSummary: 'Audience fixée',
      isCompleted: false,
    };
    addHearing(newHearing);
    showToast(language === 'ar' ? 'تم تسجيل جلسة محكمة جديدة' : 'Audience ajoutée au rôle', 'success');
  };

  const handleSaveNotes = () => {
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(language === 'ar' ? 'تم حفظ مذكرات واستراتيجية المحامي' : 'Stratégie et conclusions enregistrées', 'success');
  };

  const handleExportCSV = () => {
    const headers = ['Matter Number', 'Title', 'Category', 'Client', 'Phone', 'Court', 'Lawyer', 'Retainer (DZD)', 'Status', 'Next Hearing'];
    const rows = sortedMatters.map((m) => [
      `"${m.matterNumber}"`,
      `"${m.title}"`,
      m.category,
      `"${m.clientName}"`,
      `"${m.clientPhone}"`,
      `"${m.courtJurisdiction}"`,
      `"${m.assignedLawyer}"`,
      m.retainerAmountDzd,
      m.status,
      `"${m.nextHearingDate || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legal_matters_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(language === 'ar' ? 'تم تصدير سجل القضايا' : 'Export des dossiers juridiques terminé', 'info');
  };

  // Column definitions for List view
  const columns: ColumnDefinition<LegalMatter>[] = useMemo(
    () => [
      {
        key: 'matterNumber',
        header: language === 'ar' ? 'رقم القضية / الموضوع' : 'Dossier & Objet du Litige',
        width: '3.5*',
        sortable: true,
        renderCell: (m) => {
          const isPinned = pinnedIds.has(m.id);
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                <Gavel size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {m.title}
                  </span>
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                  <span className="font-bold text-[#C4785A]">{m.matterNumber}</span>
                  <span>·</span>
                  <span>{m.category}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'court',
        header: language === 'ar' ? 'المحكمة / الجهة القضائية' : 'Juridiction & Audience',
        width: '2.5*',
        renderCell: (m) => (
          <div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {m.courtJurisdiction}
            </div>
            {m.nextHearingDate && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 flex items-center gap-1">
                <Calendar size={10} />
                <span>{language === 'ar' ? 'جلسة: ' : 'Audience: '} {m.nextHearingDate}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'retainer',
        header: language === 'ar' ? 'أتعاب المحاماة' : 'Honoraires (Provision)',
        width: '2.0*',
        sortable: true,
        renderCell: (m) => (
          <div>
            <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
              {formatMoney(m.retainerAmountDzd)}
            </span>
            <div className="text-[10px] text-neutral-400">
              {m.clientName}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: language === 'ar' ? 'الحالة' : 'Statut',
        width: '2.0*',
        renderCell: (m) => {
          const isHearing = m.status === 'PendingHearing';
          const isActive = m.status === 'Active';
          return (
            <div className="text-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  isHearing
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60'
                    : isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isHearing ? 'bg-amber-500 animate-[live-heartbeat_1.2s_infinite]' : 'bg-emerald-500'
                  }`}
                />
                {isHearing
                  ? (language === 'ar' ? 'جلسة مرتقبة' : 'Rôle d\'Audience')
                  : (language === 'ar' ? 'نشط' : 'En Cours')}
              </span>
            </div>
          );
        },
      },
    ],
    [pinnedIds, language]
  );

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Scale size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل القضايا والملفات القضائية' : 'Dossiers Juridiques & Contentieux'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {matters.length} {language === 'ar' ? 'قضية' : 'dossiers'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'متابعة النزاعات التجارية، الجلسات أمام المحاكم، وحسابات الودائع والأمانات'
                : 'Suivi contentieux, rôles d\'audience, plaidoiries & comptes séquestres'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <AtriumButton
            type="button"
            variant="outline"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleExportCSV}
          >
            <span>{language === 'ar' ? 'تصدير' : 'Exporter'}</span>
          </AtriumButton>
          <AtriumButton
            type="button"
            variant="primary"
            onClick={handleOpenAdd}
            icon={<Plus size={15} strokeWidth={2.5} />}
          >
            <span>{language === 'ar' ? 'قضية جديدة' : 'Nouveau Dossier'}</span>
          </AtriumButton>
        </div>
      </div>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات المحاماة والأرصدة الائتمانية' : 'Indicateurs du Cabinet & Séquestres'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar'
              ? 'متابعة القضايا الجارية، أموال الأمانات تحت الوصاية، ومواعيد الجلسات'
              : 'Dossiers actifs, fonds séquestres CARPA/Trust et calendrier judiciaire'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'القضايا النشطة' : 'Dossiers Actifs au Rôle'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {activeMattersCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'جلسات ومذكرات قيد المتابعة' : 'En cours de délibéré ou plaidoirie'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'أموال الأمانات المحمية (Escrow)' : 'Fonds Séquestres & Dépôts'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {formatMoney(totalTrustFunds)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'حسابات أمناء معتمدة' : 'Comptes CARPA / fiduciaires'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                {language === 'ar' ? 'السرية المهنية والقانونية' : 'Secret Professionnel'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                BARREAU CONFORME
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                100%
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>Confidentialité et déontologie vérifiées</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Collection Container */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'دليل القضايا' : 'Registre des Affaires'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums">
              ({sortedMatters.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالرقم أو الموكل أو المحكمة...' : 'Recherche dossier, client, tribunal...'}
              shutSize={36}
              openWidth={220}
            />

            <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterCategory('All')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterCategory === 'All'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'Tous'} ({matters.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('Commercial')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterCategory === 'Commercial'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'تجاري' : 'Commercial'}
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('Civil')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterCategory === 'Civil'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'مدني' : 'Civil'}
              </button>
            </div>
          </div>
        </div>

        {/* Batch Selection Banner */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                {selectedIds.size} {language === 'ar' ? 'قضايا محددة' : 'dossiers sélectionnés'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 font-medium cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Désélectionner'}
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedIds.forEach((id) => deleteMatter(id));
                  setSelectedIds(new Set());
                  showToast(language === 'ar' ? 'تم حذف القضايا المحددة' : 'Dossiers sélectionnés supprimés', 'success');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 size={13} />
                <span>{language === 'ar' ? 'حذف المحدد' : 'Supprimer'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Inset Area Hosting Universal Collection and 390px Side Inspector */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<LegalMatter>
              items={sortedMatters}
              keyExtractor={(m) => m.id}
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
              isPinned={(m) => pinnedIds.has(m.id)}
              onTogglePin={(m) => handleTogglePin(m.id)}
              onItemClick={handleSelectMatter}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              customActions={(m) => [
                {
                  id: 'hearing',
                  label: language === 'ar' ? 'إضافة جلسة' : 'Nouvelle Audience',
                  tooltip: language === 'ar' ? 'تسجيل جلسة محكمة' : 'Ajouter au Rôle d\'Audience',
                  icon: <Gavel size={13} />,
                  variant: 'primary',
                  onClick: () => handleAddHearingForMatter(m),
                },
              ]}
              renderCard={(m) => {
                const isPinned = pinnedIds.has(m.id);
                return (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">
                      <Gavel size={32} />
                    </div>
                    <div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate tracking-tight">
                        {m.title}
                      </h3>
                      {isPinned && <span className="text-xs text-amber-500">📌</span>}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 mb-3 border border-neutral-200 dark:border-neutral-700">
                      {m.matterNumber}
                    </span>

                    <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                      <div className="text-neutral-900 dark:text-white font-mono font-bold text-[13px]">
                        {formatMoney(m.retainerAmountDzd)}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
                        <span className="text-neutral-500 truncate max-w-[120px]">{m.clientName}</span>
                        <span className="text-[#C4785A] font-bold">{m.courtJurisdiction.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
              emptyTitle={language === 'ar' ? 'لا توجد قضايا مطابقة' : 'Aucun dossier juridique'}
              emptyDescription={language === 'ar' ? 'أضف أول ملف قضية أو أعد ضبط معايير البحث' : 'Ouvrez un premier dossier contentieux ou modifiez vos filtres de recherche'}
              primaryActionLabel={language === 'ar' ? 'قضية جديدة' : 'Nouveau Dossier'}
              onAddFirstItem={handleOpenAdd}
              onResetFilters={() => {
                setSearchQuery('');
                setFilterCategory('All');
              }}
              hasActiveFilters={searchQuery.length > 0 || filterCategory !== 'All'}
            />
          </div>

          {/* 390px Inline Side Inspector Drawer */}
          {selectedMatter && (
            <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[700px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-[#F5E2D8]">
                    <Gavel size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                      {selectedMatter.matterNumber}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono truncate">
                      <span>{selectedMatter.category}</span>
                      <span>·</span>
                      <span className="text-[#C4785A] font-bold">{formatMoney(selectedMatter.retainerAmountDzd)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMatter(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddHearingForMatter(selectedMatter)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Gavel size={13} />
                  <span>{language === 'ar' ? 'إضافة جلسة' : 'Nouvelle Audience'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedMatter)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 text-xs font-semibold transition-colors"
                  title="Modifier"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePin(selectedMatter.id)}
                  className={`p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold transition-colors ${
                    pinnedIds.has(selectedMatter.id) ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                  title="Épingler"
                >
                  <Pin size={14} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex border-b border-neutral-100 dark:border-neutral-800 text-xs font-semibold px-2 bg-white dark:bg-neutral-850">
                <button
                  type="button"
                  onClick={() => setActiveTab('fiche')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'fiche'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'ملف القضية' : 'Dossier'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('client')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'client'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'الموكل' : 'Client'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('hearings')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'hearings'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'الجلسات' : 'Audiences'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('strategy')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'strategy'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'المذكرات' : 'Stratégie'}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'fiche' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'معلومات النزاع' : 'Éléments de la Cause'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'موضوع الدعوى' : 'Objet du litige'}</span>
                        <span className="font-bold text-neutral-900 dark:text-white text-right max-w-[200px] truncate">{selectedMatter.title}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الجهة القضائية' : 'Juridiction'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-right max-w-[200px] truncate">{selectedMatter.courtJurisdiction}</span>
                      </div>
                      {selectedMatter.adversePartyName && (
                        <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                          <span className="text-neutral-500">{language === 'ar' ? 'الطرف الخصم' : 'Partie adverse'}</span>
                          <span className="font-semibold text-rose-600">{selectedMatter.adversePartyName}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'المحامي المكلف' : 'Avocat assigné'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedMatter.assignedLawyer}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">{language === 'ar' ? 'الجلسة القادمة' : 'Prochaine audience'}</span>
                        <span className="font-mono font-bold text-amber-600">{selectedMatter.nextHearingDate || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'client' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'بيانات الموكل والأتعاب' : 'Coordonnées & Convention'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الموكل' : 'Client'}</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{selectedMatter.clientName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedMatter.clientPhone}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'أتعاب المحاماة' : 'Provision d\'honoraires'}</span>
                        <span className="font-mono font-bold text-[#C4785A]">{formatMoney(selectedMatter.retainerAmountDzd)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">{language === 'ar' ? 'أموال الأمانات' : 'Fonds en séquestre'}</span>
                        <span className="font-mono font-bold text-emerald-600">{formatMoney(selectedMatter.trustEscrowBalanceDzd || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'hearings' && (
                  <div className="space-y-2 text-xs">
                    {(matterHearingsMap.get(selectedMatter.id) || []).length > 0 ? (
                      (matterHearingsMap.get(selectedMatter.id) || []).map((h) => (
                        <div
                          key={h.id}
                          className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {h.courtName}
                            </span>
                            <span className="text-[10px] text-amber-600 font-mono font-bold">
                              {h.hearingDate} à {h.hearingTime}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {h.purpose}
                          </p>
                          <div className="pt-1 text-[10px] text-neutral-400 font-medium">
                            {language === 'ar' ? 'القاضي: ' : 'Juge: '} {h.benchJudge} · <span className="text-emerald-600">{h.resultSummary}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-neutral-400">
                        <Gavel size={28} className="mx-auto mb-2 opacity-40" />
                        <p>{language === 'ar' ? 'لا توجد جلسات مسجلة لهذه القضية' : 'Aucune audience enregistrée.'}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'strategy' && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase">
                      {language === 'ar' ? 'استراتيجية الدفاع والمذكرات الجوابية' : 'Stratégie de Plaidoirie & Conclusions'}
                    </label>
                    <textarea
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      rows={8}
                      placeholder={language === 'ar' ? 'أدخل ملاحظات الدفاع واستراتيجية المحامي...' : 'Arguments juridiques, textes de lois applicables, pièces à réclamer...'}
                      className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-[#C4785A] outline-none"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-neutral-400">
                        {noteSaved && (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check size={12} /> {language === 'ar' ? 'تم الحفظ' : 'Enregistré'}
                          </span>
                        )}
                      </span>
                      <AtriumButton
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={<Save size={13} />}
                        onClick={handleSaveNotes}
                      >
                        <span>{language === 'ar' ? 'حفظ المذكرات' : 'Enregistrer'}</span>
                      </AtriumButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matter Create / Edit Modal */}
      {isMatterModalOpen && (
        <LegalMatterModal
          isOpen={isMatterModalOpen}
          onClose={() => {
            setIsMatterModalOpen(false);
            setMatterToEdit(null);
          }}
          matterToEdit={matterToEdit}
          onSave={(m) => {
            if (matterToEdit) {
              updateMatter(m);
              if (selectedMatter?.id === m.id) setSelectedMatter(m);
              showToast(language === 'ar' ? 'تم تحديث ملف القضية' : 'Dossier juridique mis à jour', 'success');
            } else {
              addMatter(m);
              showToast(language === 'ar' ? 'تم فتح ملف القضية بنجاح' : 'Dossier juridique ouvert avec succès', 'success');
            }
            setIsMatterModalOpen(false);
            setMatterToEdit(null);
          }}
        />
      )}
    </div>
  );
};
