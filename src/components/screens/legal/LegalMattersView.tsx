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
  Building2,
  Coins,
  CreditCard,
  Users,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { LegalMatter, LegalHearing, NotaryDeed, LegalClientEntity } from '../../../types';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LegalMatterModal } from './LegalMatterModal';
import { NotaryDeedModal } from '../../modals/NotaryDeedModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const LegalMattersView: React.FC = () => {
  const { language, showToast, activeLegalRole, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    matters,
    hearings,
    notaryDeeds,
    entities,
    addMatter,
    updateMatter,
    deleteMatter,
    addNotaryDeed,
    updateNotaryDeed,
  } = useLegalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['mat_01', 'deed_01']));
  const [sortBy, setSortBy] = useState<string>('matterNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);
  const [matterToEdit, setMatterToEdit] = useState<LegalMatter | null>(null);
  const [isNotaryModalOpen, setIsNotaryModalOpen] = useState(false);

  // 390px Inline Side Inspector
  const [selectedMatter, setSelectedMatter] = useState<LegalMatter | null>(null);
  const [selectedDeed, setSelectedDeed] = useState<NotaryDeed | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<LegalClientEntity | null>(null);
  const [activeTab, setActiveTab] = useState<'fiche' | 'parties' | 'tarifs' | 'notes'>('fiche');

  // ==========================================
  // 1. NOTARY STUDY WORKSPACE (notaire_titulaire)
  // ==========================================
  const filteredDeeds = useMemo(() => {
    return notaryDeeds.filter((d) => {
      if (filterCategory !== 'All' && d.actType !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mNum = d.repertoireNumber.toLowerCase().includes(q);
        const mTitle = d.title.toLowerCase().includes(q);
        const mVendor = d.parties.vendorName.toLowerCase().includes(q);
        const mBuyer = d.parties.purchaserName.toLowerCase().includes(q);
        if (!mNum && !mTitle && !mVendor && !mBuyer) return false;
      }
      return true;
    });
  }, [notaryDeeds, filterCategory, searchQuery]);

  const notaryColumns: ColumnDefinition<NotaryDeed>[] = useMemo(
    () => [
      {
        key: 'repertoireNumber',
        header: isAr ? 'رقم الفهرس الرسمي' : 'N° au Répertoire & Intitulé',
        width: '3.5*',
        sortable: true,
        renderCell: (d) => (
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {d.title}
                </span>
                {pinnedIds.has(d.id) && <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                <span className="font-bold text-[#C4785A]">{d.repertoireNumber}</span>
                <span>·</span>
                <span>{d.actType.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'parties',
        header: isAr ? 'الأطراف الموقعة (NIN)' : 'Parties Contractantes (NIN)',
        width: '3*',
        renderCell: (d) => (
          <div className="text-xs">
            <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
              {d.parties.vendorName} ➔ {d.parties.purchaserName}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              NIN: {d.parties.purchaserNin}
            </div>
          </div>
        ),
      },
      {
        key: 'tarifs',
        header: isAr ? 'المعاملة والتعريفة (مرسوم 08-243)' : 'Valeur & Honoraires Décret 08-243',
        width: '2.5*',
        renderCell: (d) => (
          <div className="text-xs">
            <div className="font-bold font-mono text-neutral-900 dark:text-white">
              {formatMoney(d.transactionValueDzd, language)}
            </div>
            <div className="text-[10px] font-mono text-[#C4785A] mt-0.5">
              Tarif HT: {formatMoney(d.financials.honorairesHtDzd, language)} (+{formatMoney(d.financials.tvaAmountDzd, language)} TVA)
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الشهر والحفظ العقاري' : 'Statut Conservation Foncière',
        width: '2*',
        renderCell: (d) => {
          const isPublished = d.status === 'publie_conservation';
          return (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isPublished
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
              }`}
            >
              {isPublished ? `Publié (${d.conservationVolume || 'Vol.'})` : 'En attente publication'}
            </span>
          );
        },
      },
    ],
    [language, isAr, pinnedIds]
  );

  // ==========================================
  // 2. LITIGATION WORKSPACE (avocat_associe)
  // ==========================================
  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      if (filterCategory !== 'All' && m.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mNum = m.matterNumber.toLowerCase().includes(q);
        const mTitle = m.title.toLowerCase().includes(q);
        const mClient = m.clientName.toLowerCase().includes(q);
        if (!mNum && !mTitle && !mClient) return false;
      }
      return true;
    });
  }, [matters, filterCategory, searchQuery]);

  const matterColumns: ColumnDefinition<LegalMatter>[] = useMemo(
    () => [
      {
        key: 'matterNumber',
        header: isAr ? 'رقم القضية / الموضوع' : 'Dossier & Objet du Litige',
        width: '3.5*',
        sortable: true,
        renderCell: (m) => (
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
              <Gavel size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {m.title}
                </span>
                {pinnedIds.has(m.id) && <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                <span className="font-bold text-[#C4785A]">{m.matterNumber}</span>
                <span>·</span>
                <span>{m.category}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'court',
        header: isAr ? 'المحكمة والغرفة' : 'Juridiction & Chambre',
        width: '2.5*',
        renderCell: (m) => (
          <div className="text-xs">
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {m.courtJurisdiction}
            </div>
            {m.nextHearingDate && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 flex items-center gap-1">
                <Calendar size={10} />
                <span>{isAr ? 'جلسة: ' : 'Audience : '} {m.nextHearingDate}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'client',
        header: isAr ? 'الموكل والطرف الخصم' : 'Client & Partie Adverse',
        width: '2.5*',
        renderCell: (m) => (
          <div className="text-xs">
            <div className="font-medium text-neutral-900 dark:text-white truncate">
              {m.clientName}
            </div>
            <div className="text-[10px] text-neutral-400 truncate mt-0.5">
              c/ {m.adversePartyName || 'N/A'}
            </div>
          </div>
        ),
      },
      {
        key: 'retainer',
        header: isAr ? 'الأتعاب والوديعة (دج)' : 'Honoraires & Séquestre',
        width: '2*',
        renderCell: (m) => (
          <div className="text-xs font-mono">
            <div className="font-bold text-neutral-900 dark:text-white">
              {formatMoney(m.retainerAmountDzd, language)}
            </div>
            <div className="text-[10px] text-[#C4785A] mt-0.5">
              CARPA: {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
            </div>
          </div>
        ),
      },
    ],
    [language, isAr, pinnedIds]
  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: matters.length > 0 || notaryDeeds.length > 0,
  });

  if (showSkeleton && ((matters.length === 0 && notaryDeeds.length === 0) || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              {activeLegalRole === 'notaire_titulaire'
                ? isAr ? 'سجل العقود التوثيقية الرسمية (المرسوم 08-243)' : 'Répertoire Chronologique des Actes Notariés'
                : activeLegalRole === 'secretaire_caisse'
                ? isAr ? 'دليل الموكلين والأطراف والمعرف الوطني NIN' : 'Répertoire Général des Clients & Personnes Morales'
                : isAr ? 'ملفات القضايا والمنازعات القضائية' : 'Dossiers Juridiques & Affaires au Rôle'}
            </h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-mono">
              {activeLegalRole.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {activeLegalRole === 'notaire_titulaire'
              ? isAr ? 'الأرقام التسلسلية الإلزامية، أتعاب 5 شرائح، والمسح العقاري' : 'Enregistrement chronologique séquentiel sans lacune, barème 5 tranches'
              : isAr ? 'متابعة ملفات المحاماة، تواريخ الجلسات، وحسابات الودائع' : 'Gestion du contentieux, parties adverses, conventions d\'honoraires'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeLegalRole === 'notaire_titulaire' ? (
            <AtriumButton
              variant="primary"
              onClick={() => setIsNotaryModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'عقد رسمي في الفهرس' : 'Nouvel Acte au Répertoire'}
            </AtriumButton>
          ) : (
            <AtriumButton
              variant="primary"
              onClick={() => {
                setMatterToEdit(null);
                setIsMatterModalOpen(true);
              }}
              icon={<Plus size={14} />}
            >
              {isAr ? 'فتح ملف قضية' : 'Nouveau Dossier'}
            </AtriumButton>
          )}
        </div>
      </div>

      {/* Main Collection Container */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[28px] p-6 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {activeLegalRole === 'notaire_titulaire' ? (
          <UniversalDataCollection<NotaryDeed>
            items={filteredDeeds}
            keyExtractor={(d) => d.id}
            columns={notaryColumns}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث في الفهرس، الأطراف، أو رقم العقد...' : 'Rechercher au répertoire, partie, référence...'}
            filterOptions={[
              { value: 'All', label: isAr ? 'كل العقود' : 'Tous les Actes' },
              { value: 'vente_immobiliere', label: isAr ? 'عقود بيع عقاري' : 'Ventes Immobilières' },
              { value: 'bail_commercial', label: isAr ? 'إيجار تجاري' : 'Baux Commerciaux' },
              { value: 'fredha', label: isAr ? 'فرائض شرعية' : 'Actes de Frédha' },
              { value: 'statuts_societe', label: isAr ? 'عقود تأسيس شركات' : 'Statuts Sociétés' },
            ]}
            filterValue={filterCategory}
            onFilterChange={setFilterCategory}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pinnedIds={pinnedIds}
            onPinToggle={(itemOrId: any) => {
              const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
              setPinnedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onItemClick={(d: NotaryDeed) => setSelectedDeed(d)}
            renderGridCard={(d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDeed(d)}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs hover:border-[#C4785A] transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#C4785A]">
                    {d.repertoireNumber}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
                    {d.status === 'publie_conservation' ? 'Publié' : 'Signé'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-2">
                  {d.title}
                </h4>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 text-xs">
                  <span className="text-[10px] text-neutral-400 block">{isAr ? 'قيمة المعاملة' : 'Valeur'}</span>
                  <span className="font-bold font-mono text-neutral-900 dark:text-white">
                    {formatMoney(d.transactionValueDzd, language)}
                  </span>
                </div>
              </div>
            )}
          />
        ) : (
          <UniversalDataCollection<LegalMatter>
            items={filteredMatters}
            keyExtractor={(m) => m.id}
            columns={matterColumns}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث في القضايا، الموكلين، أو المحكمة...' : 'Rechercher une affaire, client, juridiction...'}
            filterOptions={[
              { value: 'All', label: isAr ? 'كل القضايا' : 'Tous les Dossiers' },
              { value: 'Commercial', label: isAr ? 'تجاري ومنازعات' : 'Commercial' },
              { value: 'Civil', label: isAr ? 'مدني وعقارات' : 'Civil' },
              { value: 'Labor', label: isAr ? 'عمالي واجتماعي' : 'Social' },
              { value: 'Penal', label: isAr ? 'جزائي وجنائي' : 'Pénal' },
            ]}
            filterValue={filterCategory}
            onFilterChange={setFilterCategory}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pinnedIds={pinnedIds}
            onPinToggle={(itemOrId: any) => {
              const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
              setPinnedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onItemClick={(m: LegalMatter) => setSelectedMatter(m)}
            renderGridCard={(m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMatter(m)}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs hover:border-[#C4785A] transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#C4785A]">
                    {m.matterNumber}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                    {m.category}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-2">
                  {m.title}
                </h4>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 text-xs">
                  <span className="text-[10px] text-neutral-400 block">{m.clientName}</span>
                  <span className="font-bold font-mono text-neutral-900 dark:text-white">
                    {formatMoney(m.retainerAmountDzd, language)}
                  </span>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* 390px Inline Side Inspector Drawer for Notary Deed */}
      {selectedDeed && (
        <div className="fixed inset-y-0 right-0 z-50 w-[390px] bg-white dark:bg-neutral-800 shadow-2xl border-l border-neutral-200 dark:border-neutral-700 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                  {selectedDeed.repertoireNumber}
                </span>
              </div>
              <button
                onClick={() => setSelectedDeed(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {selectedDeed.title}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">{selectedDeed.titleAr}</p>
            </div>

            {/* Financials & Décret 08-243 Breakdown */}
            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2 text-xs">
              <span className="font-bold text-neutral-900 dark:text-white block">
                {isAr ? 'التعريفة الرسمية (المرسوم 08-243):' : 'Décompte Légal Décret 08-243 :'}
              </span>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{isAr ? 'مبلغ المعاملة' : 'Valeur Transaction'}</span>
                <span className="font-bold font-mono text-neutral-900 dark:text-white">
                  {formatMoney(selectedDeed.transactionValueDzd, language)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{isAr ? 'أتعاب التوثيق الخام' : 'Honoraires Notaire HT'}</span>
                <span className="font-bold font-mono text-neutral-900 dark:text-white">
                  {formatMoney(selectedDeed.financials.honorairesHtDzd, language)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{isAr ? 'الرسم 19% TVA' : 'TVA (19%)'}</span>
                <span className="font-bold font-mono text-[#C4785A]">
                  +{formatMoney(selectedDeed.financials.tvaAmountDzd, language)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{isAr ? 'حقوق التسجيل والشهر' : 'Enregistrement & Publicité'}</span>
                <span className="font-bold font-mono text-neutral-900 dark:text-white">
                  +{formatMoney(selectedDeed.financials.droitsEnregistrementDzd + selectedDeed.financials.droitsPubliciteDzd, language)}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between font-bold text-neutral-900 dark:text-white">
                <span>{isAr ? 'إجمالي الوديعة المطلوبة' : 'Total Provision Due'}</span>
                <span className="text-[#C4785A] font-mono">
                  {formatMoney(selectedDeed.financials.totalProvisionClientDzd, language)}
                </span>
              </div>
            </div>

            {/* Parties */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-neutral-900 dark:text-white block">
                {isAr ? 'الأطراف الموقعة:' : 'Parties Contractantes :'}
              </span>
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block">{isAr ? 'البائع / المتنازل' : 'Vendeur'}</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{selectedDeed.parties.vendorName}</span>
                <span className="text-[10px] font-mono text-neutral-400 block">NIN: {selectedDeed.parties.vendorNin}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block">{isAr ? 'المشتري / المستفيد' : 'Acquéreur'}</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{selectedDeed.parties.purchaserName}</span>
                <span className="text-[10px] font-mono text-neutral-400 block">NIN: {selectedDeed.parties.purchaserNin}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 flex gap-2">
            <AtriumButton
              variant="secondary"
              className="flex-1 justify-center"
              onClick={() => {
                showToast(isAr ? 'جاري طباعة النسخة الرسمية للعقد' : 'Impression de la Grosse d\'Acte Authentique', 'info');
              }}
            >
              {isAr ? 'طباعة النسخة الرسمية' : 'Imprimer Grosse'}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              className="flex-1 justify-center"
              onClick={() => setSelectedDeed(null)}
            >
              {isAr ? 'إغلاق' : 'Fermer'}
            </AtriumButton>
          </div>
        </div>
      )}

      {/* 390px Inline Side Inspector Drawer for Litigation Matter */}
      {selectedMatter && (
        <div className="fixed inset-y-0 right-0 z-50 w-[390px] bg-white dark:bg-neutral-800 shadow-2xl border-l border-neutral-200 dark:border-neutral-700 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <Gavel size={18} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                  {selectedMatter.matterNumber}
                </span>
              </div>
              <button
                onClick={() => setSelectedMatter(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {selectedMatter.title}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">{selectedMatter.courtJurisdiction}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">{isAr ? 'الموكل' : 'Client'}</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedMatter.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{isAr ? 'الطرف الخصم' : 'Partie Adverse'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedMatter.adversePartyName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{isAr ? 'الأتعاب المتفق عليها' : 'Convention Retainer'}</span>
                <span className="font-bold font-mono text-[#C4785A]">{formatMoney(selectedMatter.retainerAmountDzd, language)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{isAr ? 'رصيد حساب الحراسة' : 'Solde CARPA'}</span>
                <span className="font-bold font-mono text-emerald-600">{formatMoney(selectedMatter.trustEscrowBalanceDzd, language)}</span>
              </div>
            </div>

            {selectedMatter.notes && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-neutral-700 dark:text-neutral-300 block">{isAr ? 'ملاحظات المحامي والاستراتيجية:' : 'Stratégie du Cabinet :'}</span>
                <p className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {selectedMatter.notes}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 flex gap-2">
            <AtriumButton
              variant="secondary"
              className="flex-1 justify-center"
              onClick={() => {
                setMatterToEdit(selectedMatter);
                setIsMatterModalOpen(true);
              }}
            >
              {isAr ? 'تعديل' : 'Modifier'}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              className="flex-1 justify-center"
              onClick={() => setSelectedMatter(null)}
            >
              {isAr ? 'إغلاق' : 'Fermer'}
            </AtriumButton>
          </div>
        </div>
      )}

      {/* Modals */}
      {isMatterModalOpen && (
        <LegalMatterModal
          isOpen={isMatterModalOpen}
          onClose={() => setIsMatterModalOpen(false)}
          onSave={matterToEdit ? updateMatter : addMatter}
          matterToEdit={matterToEdit}
        />
      )}

      {isNotaryModalOpen && (
        <NotaryDeedModal
          isOpen={isNotaryModalOpen}
          onClose={() => setIsNotaryModalOpen(false)}
          nextIndex={notaryDeeds.length + 1}
          onSaveDeed={addNotaryDeed}
        />
      )}
    </div>
  );
};
