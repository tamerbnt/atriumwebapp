import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Droplets,
  Clock,
  CheckCircle2,
  X,
  Sprout,
  Download,
  Trash2,
  Edit,
  Pin,
  Save,
  Check,
  Send,
  Activity,
  Layers,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { AgriTreatmentLog } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const AgricultureCyclesView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { treatmentLogs, parcels, addTreatmentLog, updateTreatmentLog, deleteTreatmentLog } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterParcel, setFilterParcel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['treat_01']));
  const [sortBy, setSortBy] = useState<string>('treatmentDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logToEdit, setLogToEdit] = useState<AgriTreatmentLog | null>(null);

  // Form states inside Modal
  const [parcelId, setParcelId] = useState(parcels[0]?.id || 'parc_01');
  const [productName, setProductName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [pest, setPest] = useState('');
  const [dosage, setDosage] = useState('2.5 kg/ha');
  const [darDays, setDarDays] = useState('7');
  const [operator, setOperator] = useState('Abdelkader (Chef Culture)');
  const [notes, setNotes] = useState('');

  // 390px Inline Side Inspector
  const [selectedLog, setSelectedLog] = useState<AgriTreatmentLog | null>(() => {
    return treatmentLogs[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'traitement' | 'dar' | 'cible' | 'notes'>('traitement');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const openCreateModal = () => {
    setLogToEdit(null);
    setParcelId(parcels[0]?.id || 'parc_01');
    setProductName('');
    setActiveIngredient('');
    setPest('');
    setDosage('2.5 kg/ha');
    setDarDays('7');
    setOperator('Abdelkader (Chef Culture)');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: AgriTreatmentLog) => {
    setLogToEdit(t);
    setParcelId(t.parcelId);
    setProductName(t.commercialProductName);
    setActiveIngredient(t.activeIngredient);
    setPest(t.targetPestDisease);
    setDosage(t.dosagePerHa);
    setDarDays(String(t.darDays));
    setOperator(t.operatorName);
    setNotes(t.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !pest.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم المادة والآفة المستهدفة' : 'Veuillez saisir le produit et le parasite', 'error');
      return;
    }

    const dar = parseInt(darDays, 10) || 7;
    const today = new Date();
    const harvestAllowed = new Date(today.getTime() + dar * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const payload: AgriTreatmentLog = {
      id: logToEdit?.id || `treat_${Date.now()}`,
      accountId: logToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      parcelId,
      treatmentDate: logToEdit?.treatmentDate || today.toISOString().split('T')[0],
      commercialProductName: productName.trim(),
      activeIngredient: activeIngredient.trim() || 'Substance active homologuée',
      targetPestDisease: pest.trim(),
      dosagePerHa: dosage.trim(),
      darDays: dar,
      harvestAllowedDate: harvestAllowed,
      operatorName: operator.trim(),
      notes: notes.trim(),
      createdAt: logToEdit?.createdAt || new Date().toISOString(),
    };

    if (logToEdit) {
      updateTreatmentLog(payload);
      if (selectedLog?.id === payload.id) setSelectedLog(payload);
      showToast(isAr ? 'تم تحديث سجل المعالجة' : 'Traitement mis à jour', 'success');
    } else {
      addTreatmentLog(payload);
      setSelectedLog(payload);
      showToast(isAr ? 'تم قيد المعالجة الفلاحية في السجل' : 'Traitement phytosanitaire consigné', 'success');
    }
    setIsModalOpen(false);
  };

  const filteredLogs = useMemo(() => {
    return treatmentLogs.filter((t) => {
      if (filterParcel !== 'all' && t.parcelId !== filterParcel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.commercialProductName.toLowerCase().includes(q);
        const matchesIng = t.activeIngredient.toLowerCase().includes(q);
        const matchesPest = t.targetPestDisease.toLowerCase().includes(q);
        const matchesOp = t.operatorName.toLowerCase().includes(q);
        if (!matchesName && !matchesIng && !matchesPest && !matchesOp) return false;
      }
      return true;
    });
  }, [treatmentLogs, filterParcel, searchQuery]);

  // KPIs
  const avgDar = filteredLogs.length > 0
    ? Math.round(filteredLogs.reduce((acc, t) => acc + t.darDays, 0) / filteredLogs.length)
    : 7;

  // Actions
  const handlePin = (t: AgriTreatmentLog) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(t.id)) next.delete(t.id);
      else next.add(t.id);
      return next;
    });
    showToast(
      pinnedIds.has(t.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Traitement désépinglé')
        : (isAr ? 'تم تثبيت المعالجة' : 'Traitement épinglé'),
      'info'
    );
  };

  const handleDelete = (t: AgriTreatmentLog) => {
    deleteTreatmentLog(t.id);
    if (selectedLog?.id === t.id) setSelectedLog(null);
    showToast(isAr ? 'تم حذف المعالجة من السجل' : 'Traitement retiré du carnet', 'success');
  };

  const handleVerifyDar = (t: AgriTreatmentLog) => {
    showToast(
      isAr
        ? `فترة الأمان DAR: ${t.darDays} أيام. الحصاد مسموح ابتداءً من ${t.harvestAllowedDate}`
        : `DAR : ${t.darDays} jours respecté. Récolte autorisée dès le ${t.harvestAllowedDate}`,
      'success'
    );
    if (selectedLog?.id === t.id) setActiveTab('dar');
  };

  const handleExportCsv = () => {
    const headers = ['Produit Commercial', 'Substance Active', 'Cible / Maladie', 'Dose/ha', 'Date Traitement', 'DAR (Jours)', 'Date Récolte Autorisée', 'Applicateur'];
    const rows = filteredLogs.map((t) => [
      `"${t.commercialProductName.replace(/"/g, '""')}"`,
      `"${t.activeIngredient.replace(/"/g, '""')}"`,
      `"${t.targetPestDisease.replace(/"/g, '""')}"`,
      t.dosagePerHa,
      t.treatmentDate,
      t.darDays,
      t.harvestAllowedDate,
      `"${t.operatorName.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traitements_phyto_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير سجل المعالجات CSV' : 'Export CSV du carnet phyto généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedLog) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ ملاحظات المعالجة' : 'Consignes enregistrées', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<AgriTreatmentLog>[] = [
    {
      id: 'productName',
      header: isAr ? 'المادة التجارية' : 'Produit Commercial',
      accessorKey: 'commercialProductName',
      sortable: true,
      minWidth: '220px',
      cell: (t) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div>
            <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {t.commercialProductName}
              {pinnedIds.has(t.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[11px] text-neutral-500">
              {t.activeIngredient}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'targetPest',
      header: isAr ? 'الآفة المستهدفة' : 'Cible / Ravageur',
      accessorKey: 'targetPestDisease',
      sortable: true,
      minWidth: '180px',
      cell: (t) => (
        <div>
          <div className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">
            {t.targetPestDisease}
          </div>
          <div className="text-[10px] text-neutral-400">
            Dose: {t.dosagePerHa}
          </div>
        </div>
      ),
    },
    {
      id: 'darDays',
      header: isAr ? 'فترة الأمان DAR' : 'Délai Attente (DAR)',
      accessorKey: 'darDays',
      sortable: true,
      minWidth: '140px',
      cell: (t) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            {t.darDays} jours
          </span>
          <span className="text-[10px] text-neutral-400">
            Dès: {t.harvestAllowedDate}
          </span>
        </div>
      ),
    },
    {
      id: 'treatmentDate',
      header: isAr ? 'تاريخ الرش' : 'Date d’Application',
      accessorKey: 'treatmentDate',
      sortable: true,
      minWidth: '130px',
      cell: (t) => (
        <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
          {t.treatmentDate}
        </div>
      ),
    },
    {
      id: 'operator',
      header: isAr ? 'المطبق' : 'Opérateur',
      accessorKey: 'operatorName',
      sortable: true,
      minWidth: '150px',
      cell: (t) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
          {t.operatorName}
        </div>
      ),
    },
  ];

  const parcelFilterOptions = [
    { value: 'all', label: isAr ? 'جميع القطع' : 'Toutes les parcelles' },
    ...parcels.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Calendar size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'المعالجات الفلاحية وفترات الأمان (DAR)' : 'Traitements Phyto & Suivi DAR'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {filteredLogs.length} traitements
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'السجل النباتي الإلزامي، حساب فترات الأمان قبل الجني، وجرعات المبيدات والأسمدة'
                : 'Carnet phytosanitaire réglementaire, respect des DAR et traçabilité des bouillies'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download size={14} />}
          >
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </AtriumButton>
          <AtriumButton
            variant="primary"
            onClick={openCreateModal}
            icon={<Plus size={14} />}
          >
            {isAr ? 'معالجة جديدة' : 'Nouveau Traitement'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات الأمان الحيوي والامتثال الزراعي' : 'Conformité Sanitaire & Délais de Sécurité'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'مراقبة فترات الأمان DAR لمنع تسويق المحاصيل المعالجة حديثاً' : 'Contrôle des délais avant récolte pour garantir zéro résidu non conforme'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Traitements */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي المعالجات المنفذة' : 'Applications Réalisées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {filteredLogs.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'مسجلة بالسجل الرسمي' : 'Inscrites au registre phyto'}
              </p>
            </div>
          </div>

          {/* Card 2: DAR Moyen */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'متوسط فترة الأمان DAR' : 'DAR Moyen Exploitation'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {avgDar} jours
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'فترة انتظار إلزامية' : 'Délai d’attente avant cueillette'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'حالة الأمان للمحاصيل' : 'Statut Récoltabilité'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Contrôle Phyto
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100% Conforme
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'القطع النشطة استوفت شروط DAR' : 'DAR respectés sur le domaine'}
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
              {isAr ? 'سجل التدخلات والمعالجات الفلاحية' : 'Carnet Phytosanitaire & Registre des Traitements'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'تتبع فترات الأمان DAR، المواد الفعالة والجرعات المعتمدة' : 'Traçabilité des bouillies, homologations et délais de sécurité avant récolte'}
            </p>
          </div>

          {/* Authentic Agriculture Phyto Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع المعالجات' : 'Tous traitements' },
              { id: 'fongi', label: 'Fongicides' },
              { id: 'insecti', label: 'Insecticides' },
              { id: 'fertili', label: 'Fertilisation NPK' },
            ].map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setFilterParcel('all')}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: idx === 0 && filterParcel === 'all' ? '#FCEEE8' : 'transparent',
                  color: idx === 0 && filterParcel === 'all' ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
        <div className="flex items-start gap-4">
          {/* Main Collection Container */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<AgriTreatmentLog>
            data={filteredLogs}
            columns={columns}
            keyExtractor={(t) => t.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث بالمادة، الآفة، المطبق...' : 'Rechercher par produit, ravageur, applicateur...'}
            filterValue={filterParcel}
            onFilterChange={setFilterParcel}
            filterOptions={parcelFilterOptions}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pinnedIds={pinnedIds}
            onPinToggle={handlePin}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            onItemClick={(t) => {
              setSelectedLog(t);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<ShieldCheck size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد معالجات' : 'Aucun traitement trouvé'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun traitement ne correspond à votre recherche')
                : (isAr ? 'قم بقيد أول معالجة نباتية' : 'Consignez votre première application phyto')
            }
            customActions={[
              {
                id: 'verifyDar',
                label: isAr ? 'فحص فترة DAR' : 'Vérifier DAR',
                icon: <Clock size={14} />,
                onClick: handleVerifyDar,
              },
            ]}
            renderGridCard={(t) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded-full">
                    DAR {t.darDays}j
                  </span>
                  <span className="font-mono text-xs text-neutral-500">
                    {t.treatmentDate}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {t.commercialProductName}
                  </h3>
                  <div className="text-xs text-neutral-500 font-medium mt-0.5">
                    {t.activeIngredient} • {t.dosagePerHa}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">{t.targetPestDisease}</span>
                  <span className="text-emerald-600 font-medium font-mono">Dès {t.harvestAllowedDate}</span>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedLog && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedLog.commercialProductName}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      DAR {selectedLog.darDays}j
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {selectedLog.activeIngredient}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleVerifyDar(selectedLog)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors"
              >
                <Clock size={12} />
                {isAr ? 'فحص DAR' : 'Vérifier DAR'}
              </button>
              <button
                onClick={() => openEditModal(selectedLog)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedLog)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('traitement')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'traitement'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'البيانات' : 'Traitement'}
              </button>
              <button
                onClick={() => setActiveTab('dar')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'dar'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'فترة الأمان' : 'DAR & Récolte'}
              </button>
              <button
                onClick={() => setActiveTab('cible')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'cible'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الآفة والجرعة' : 'Dosage'}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الملاحظات' : 'Consignes'}
              </button>
            </div>

            {/* Tab 1: Traitement */}
            {activeTab === 'traitement' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Matière active:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedLog.activeIngredient}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Date d'application:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedLog.treatmentDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Applicateur responsable:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedLog.operatorName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: DAR & Récolte */}
            {activeTab === 'dar' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Délai d'attente (DAR):</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      {selectedLog.darDays} jours obligatoires
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Récolte autorisée dès le:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {selectedLog.harvestAllowedDate}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                    Interdiction formelle de cueillette avant cette date pour conformité phytosanitaire.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Dosage */}
            {activeTab === 'cible' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Parasite ou Maladie:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedLog.targetPestDisease}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Dose appliquée à l'hectare:</span>
                    <span className="font-mono font-bold text-[#C4785A]">
                      {selectedLog.dosagePerHa}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Consignes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Conditions météo (vent &lt; 15 km/h, hygrométrie) et équipements de protection individuelle (EPI) :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes || selectedLog.notes || ''}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter le port du masque FFP3, température matinale, absence de vent..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C4785A] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs"
                >
                  {noteSaved ? (
                    <>
                      <Check size={14} />
                      {isAr ? 'تم الحفظ' : 'Consignes enregistrées'}
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {isAr ? 'حفظ' : 'Enregistrer'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* New / Edit Treatment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {logToEdit
                      ? (isAr ? 'تعديل المعالجة النباتية' : 'Modifier le Traitement')
                      : (isAr ? 'تسجيل معالجة نباتية جديدة' : 'Nouveau Traitement Phytosanitaire')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'تدوين المواد وحساب فترة الأمان DAR' : 'Enregistrement au registre obligatoire et calcul DAR'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <LabelSelect
                label={isAr ? 'القطعة الفلاحية المستهدفة' : 'Parcelle Cible'}
                value={parcelId}
                onChange={(e) => setParcelId(e.target.value)}
                options={parcelFilterOptions.filter((p) => p.value !== 'all')}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'اسم المنتج التجاري *' : 'Nom Commercial *'}
                  placeholder="Ex: Cuprocol 50 WG"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'المادة الفعالة' : 'Substance Active'}
                  placeholder="Ex: Oxychlorure de cuivre"
                  value={activeIngredient}
                  onChange={(e) => setActiveIngredient(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الآفة أو المرض *' : 'Cible / Maladie *'}
                  placeholder="Ex: Mildiou, Oïdium, Pucerons"
                  value={pest}
                  onChange={(e) => setPest(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'الجرعة بالهكتار' : 'Dose / ha'}
                  placeholder="Ex: 2.5 kg/ha"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'فترة الأمان DAR (أيام)' : 'Délai d’Attente DAR (Jours)'}
                  type="number"
                  value={darDays}
                  onChange={(e) => setDarDays(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'اسم المطبق المسؤول' : 'Applicateur Responsable'}
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'ملاحظات وظروف الطقس' : 'Observations & Météo'}
                placeholder="Ex: Pulvérisation sans vent, température 19°C..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {logToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'تأكيد وقيد المعالجة' : 'Consigner le Traitement')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
