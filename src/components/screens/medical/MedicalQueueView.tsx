import React, { useState, useMemo } from 'react';
import {
  Clock,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  HeartPulse,
  Eye,
  Plus,
  Pin,
  X,
  CreditCard,
  FileText,
  Printer,
  Phone,
  LayoutGrid,
  List,
  Activity,
  Tv,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { MedicalConsultation } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalWaitingRoomTvModal } from './MedicalWaitingRoomTvModal';
import { MedicalAgendaView } from './MedicalAgendaView';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const MedicalQueueView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    consultations,
    patients,
    practitioners,
    updateConsultationStatus,
    markConsultationPaid,
    addConsultation,
  } = useMedicalData();

  const [activeSubView, setActiveSubView] = useState<'queue' | 'agenda'>('queue');
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in_progress' | 'completed'>('all');
  const [displayLayout, setDisplayLayout] = useState<'collection' | 'visual_queue'>('collection');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('consultationDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['cons_01']));
  const [selectedConsultation, setSelectedConsultation] = useState<MedicalConsultation | null>(() => consultations[0] || null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'fiche' | 'vitals' | 'finance' | 'actions'>('fiche');
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const filtered = useMemo(() => {
    return consultations.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.patientName.toLowerCase().includes(q) ||
        c.chiefComplaint.toLowerCase().includes(q) ||
        (c.diagnosis && c.diagnosis.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (statusFilter === 'waiting') return c.status === 'InWaitingQueue';
      if (statusFilter === 'in_progress') return c.status === 'InConsultation';
      if (statusFilter === 'completed') return c.status === 'Completed';
      return true;
    });
  }, [consultations, searchQuery, statusFilter]);

  const sortedConsultations = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      if (sortBy === 'consultationDate') {
        return sortDir === 'asc'
          ? a.consultationDate.localeCompare(b.consultationDate)
          : b.consultationDate.localeCompare(a.consultationDate);
      }
      if (sortBy === 'patientName') {
        return sortDir === 'asc'
          ? a.patientName.localeCompare(b.patientName)
          : b.patientName.localeCompare(a.patientName);
      }
      if (sortBy === 'consultationFeeDzd') {
        return sortDir === 'asc'
          ? a.consultationFeeDzd - b.consultationFeeDzd
          : b.consultationFeeDzd - a.consultationFeeDzd;
      }
      return 0;
    });
    return list;
  }, [filtered, pinnedIds, sortBy, sortDir]);

  const waitingCount = consultations.filter((c) => c.status === 'InWaitingQueue').length;
  const inProgressCount = consultations.filter((c) => c.status === 'InConsultation').length;
  const completedCount = consultations.filter((c) => c.status === 'Completed').length;

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    showToast(
      pinnedIds.has(id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Priorité retirée')
        : (isAr ? 'تم تثبيت أولوية المريض' : 'Patient priorisé en tête de file'),
      'info'
    );
  };

  const handleStartExam = (c: MedicalConsultation) => {
    updateConsultationStatus(c.id, 'InConsultation');
    setSelectedConsultation({ ...c, status: 'InConsultation' });
    showToast(isAr ? 'تم استدعاء المريض لغرفة الكشف' : 'Patient appelé au cabinet de consultation', 'info');
  };

  const handleFinishExam = (c: MedicalConsultation) => {
    updateConsultationStatus(c.id, 'Completed');
    setSelectedConsultation({ ...c, status: 'Completed' });
    showToast(isAr ? 'تم إنهاء وتأكيد الفحص الطبي' : 'Consultation clôturée avec succès', 'success');
  };

  const handleSaveNote = () => {
    if (!quickNote.trim()) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ الملاحظة السريرية' : 'Observation clinique enregistrée', 'success');
  };

  // Universal Data Collection Column Definitions
  const columns: ColumnDefinition<MedicalConsultation>[] = [
    {
      key: 'patientName',
      header: isAr ? 'المريض / الشكوى' : 'Patient & Motif',
      sortable: true,
      minWidth: '220px',
      renderCell: (c) => {
        const isPinned = pinnedIds.has(c.id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0 border border-orange-100 dark:border-neutral-800">
              {c.patientName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                {c.patientName}
                {isPinned && <span className="text-xs text-amber-500">📌</span>}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[180px]">
                {c.chiefComplaint}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'vitals',
      header: isAr ? 'العلامات الحيوية' : 'Constantes Vitales',
      minWidth: '180px',
      renderCell: (c) => (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-mono text-[11px] font-semibold">
            {c.vitals?.bloodPressure || '120/80'}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-mono text-[11px]">
            {c.vitals?.temperatureCelsius ? `${c.vitals.temperatureCelsius}°C` : '37°C'}
          </span>
          <span className="text-[11px] text-neutral-400 font-mono">
            {c.vitals?.weightKg ? `${c.vitals.weightKg}kg` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: isAr ? 'حالة الدور' : 'Statut Triage',
      sortable: true,
      minWidth: '130px',
      renderCell: (c) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            c.status === 'InWaitingQueue'
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
              : c.status === 'InConsultation'
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}
        >
          {c.status === 'InConsultation' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
          {c.status === 'InWaitingQueue'
            ? (isAr ? 'في الانتظار' : 'En attente')
            : c.status === 'InConsultation'
            ? (isAr ? 'في الفحص' : 'En consultation')
            : (isAr ? 'مكتمل' : 'Terminé')}
        </span>
      ),
    },
    {
      key: 'consultationFeeDzd',
      header: isAr ? 'الأتعاب DZD' : 'Honoraires',
      sortable: true,
      minWidth: '120px',
      renderCell: (c) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {formatMoney(c.consultationFeeDzd, 'DZD')}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'قائمة الانتظار والفرز السريري' : 'File d\'Attente & Triage Clinique'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {waitingCount} {isAr ? 'في الانتظار' : 'en attente'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إدارة دور الدخول للعيادة، العلامات الحيوية، وأولويات الكشف الطبي'
                : 'Priorités de passage, constantes vitales & suivi en temps réel de la consultation'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SubView Mode Switcher: Queue vs Agenda */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
            <button
              type="button"
              onClick={() => setActiveSubView('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'queue'
                  ? 'bg-white dark:bg-neutral-700 text-[#0D9488] shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <Clock size={13} />
              <span>{isAr ? 'قائمة الفرز والانتظار' : 'File de Triage'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'agenda'
                  ? 'bg-white dark:bg-neutral-700 text-[#0D9488] shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <Calendar size={13} />
              <span>{isAr ? 'أجندة المواعيد' : 'Agenda Multi-Médecins'}</span>
            </button>
          </div>

          {/* Waiting Room TV Button */}
          <AtriumButton
            variant="secondary"
            onClick={() => setIsTvModalOpen(true)}
            icon={<Tv size={14} className="text-[#0D9488]" />}
          >
            Écran TV Salle d'Attente
          </AtriumButton>

          {activeSubView === 'queue' && (
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
              <button
                type="button"
                onClick={() => setDisplayLayout('collection')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  displayLayout === 'collection'
                    ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                {isAr ? 'الجدول والبطاقات' : 'Registre'}
              </button>
              <button
                type="button"
                onClick={() => setDisplayLayout('visual_queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  displayLayout === 'visual_queue'
                    ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                {isAr ? 'لوحة الانتظار' : 'File Visuelle'}
              </button>
            </div>
          )}

          <AtriumButton
            variant="primary"
            onClick={() => setIsConsultModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'قبول مريض جديد' : 'Admettre un Patient'}
          </AtriumButton>
        </div>
      </div>

      {activeSubView === 'agenda' ? (
        <MedicalAgendaView />
      ) : (
        <>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات تدفق المرضى وأوقات الانتظار' : 'Flux Salle d\'Attente & Triage des Urgences'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة حية للعلامات الحيوية وحالات الكشف السريري' : 'Constantes vitales (TA, Température, Poids) et affectation en cabinet'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'مرضى في الانتظار' : 'Patients en Salle d\'Attente'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {waitingCount}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                Priorité selon ordre d'admission
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'حالياً في الفحص' : 'En Examen Médical'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                {inProgressCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Cabinet de consultation actif
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي الفحوصات' : 'Prise en Charge Clinique'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                SLA & TRIAGE
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {completedCount} / {consultations.length}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>Consultations clôturées avec succès</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HeartPulse size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'سجل الاستشارات والفرز' : 'Registre des Consultations & Triage'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {sortedConsultations.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث عن مريض أو تشخيص...' : 'Rechercher patient ou motif...'}
              shutSize={36}
              openWidth={220}
            />

            {/* Medical Triage Domain Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(
                [
                  { id: 'all', label: isAr ? 'الكل' : 'Tous' },
                  { id: 'waiting', label: isAr ? 'في الانتظار' : 'En attente' },
                  { id: 'in_progress', label: isAr ? 'في الفحص' : 'En consultation' },
                  { id: 'completed', label: isAr ? 'مكتمل' : 'Clôturés' },
                ] as const
              ).map((filter) => {
                const isActive = statusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setStatusFilter(filter.id)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Workspace Area (Collection + 390px Drawer) */}
        <div className="flex items-start gap-4">
          {/* Collection / Visual Board Container */}
          <div className="flex-1 min-w-0">
            {displayLayout === 'collection' ? (
              <UniversalDataCollection<MedicalConsultation>
                items={sortedConsultations}
                keyExtractor={(c) => c.id}
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
                isPinned={(c) => pinnedIds.has(c.id)}
                onTogglePin={(c) => handleTogglePin(c.id)}
                onItemClick={(c) => setSelectedConsultation(c)}
                customActions={(c) => [
                  {
                    id: 'exam',
                    label: c.status === 'InWaitingQueue' ? (isAr ? 'بدء الفحص' : 'Consulter') : (isAr ? 'إنهاء' : 'Clôturer'),
                    icon: <Stethoscope size={13} />,
                    variant: 'primary',
                    onClick: () => {
                      if (c.status === 'InWaitingQueue') handleStartExam(c);
                      else handleFinishExam(c);
                    },
                  },
                  {
                    id: 'fiche',
                    label: isAr ? 'الملف' : 'Fiche',
                    icon: <Eye size={13} />,
                    onClick: () => setSelectedConsultation(c),
                  },
                ]}
                renderCard={(c) => {
                  const isPinned = pinnedIds.has(c.id);
                  return (
                    <div className="flex flex-col w-full space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {c.patientName} {isPinned && '📌'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.status === 'InWaitingQueue'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : c.status === 'InConsultation'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {c.status === 'InWaitingQueue' ? 'Attente' : c.status === 'InConsultation' ? 'En cours' : 'Terminé'}
                        </span>
                      </div>

                      <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5 grid grid-cols-3 gap-1 text-center text-xs font-mono">
                        <div>
                          <div className="text-[10px] text-neutral-400">TA</div>
                          <div className="font-bold text-neutral-800 dark:text-neutral-200">{c.vitals?.bloodPressure || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-400">Temp</div>
                          <div className="font-bold text-neutral-800 dark:text-neutral-200">{c.vitals?.temperatureCelsius ? `${c.vitals.temperatureCelsius}°` : '37°'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-400">Poids</div>
                          <div className="font-bold text-neutral-800 dark:text-neutral-200">{c.vitals?.weightKg ? `${c.vitals.weightKg}k` : 'N/A'}</div>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-500 line-clamp-1">
                        {c.chiefComplaint}
                      </div>

                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#C4785A]">
                          {formatMoney(c.consultationFeeDzd, 'DZD')}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {c.consultationDate.split('T')[0]}
                        </span>
                      </div>
                    </div>
                  );
                }}
                emptyTitle={isAr ? 'لا توجد استشارات مطابقة' : 'Aucune consultation trouvée'}
                emptyDescription={isAr ? 'قم بقبول مريض جديد للبدء' : 'Admettez un premier patient en salle d\'attente'}
                primaryActionLabel={isAr ? 'قبول مريض' : 'Admettre un patient'}
                onAddFirstItem={() => setIsConsultModalOpen(true)}
              />
            ) : (
            /* Visual Queue Board View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedConsultations.map((cons, index) => (
                <div
                  key={cons.id}
                  onClick={() => setSelectedConsultation(cons)}
                  className={`bg-white dark:bg-neutral-800 rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all cursor-pointer ${
                    selectedConsultation?.id === cons.id
                      ? 'border-[#C4785A] ring-2 ring-[#C4785A]/30'
                      : cons.status === 'InConsultation'
                      ? 'border-blue-400 ring-1 ring-blue-400/30'
                      : 'border-[#E9EEF0] dark:border-neutral-700/60 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 text-xs font-bold flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[140px]">
                        {cons.patientName}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        cons.status === 'InWaitingQueue'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : cons.status === 'InConsultation'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {cons.status === 'InWaitingQueue' ? 'Attente' : cons.status === 'InConsultation' ? 'En cours' : 'Terminé'}
                    </span>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5 grid grid-cols-3 gap-1 text-center text-xs font-mono border border-neutral-100 dark:border-neutral-700/40">
                    <div>
                      <div className="text-[10px] text-neutral-400">TA</div>
                      <div className="font-bold text-neutral-800 dark:text-neutral-200">{cons.vitals?.bloodPressure || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Temp</div>
                      <div className="font-bold text-neutral-800 dark:text-neutral-200">{cons.vitals?.temperatureCelsius ? `${cons.vitals.temperatureCelsius}°C` : 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Poids</div>
                      <div className="font-bold text-neutral-800 dark:text-neutral-200">{cons.vitals?.weightKg ? `${cons.vitals.weightKg}kg` : 'N/A'}</div>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                    <span className="font-medium text-neutral-400 mr-1">Motif:</span>
                    {cons.chiefComplaint}
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#C4785A]">
                      {formatMoney(cons.consultationFeeDzd, 'DZD')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cons.status === 'InWaitingQueue') handleStartExam(cons);
                        else handleFinishExam(cons);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#C4785A] text-white text-[11px] font-semibold hover:bg-[#b0674b] transition-colors cursor-pointer"
                    >
                      {cons.status === 'InWaitingQueue' ? 'Appeler' : cons.status === 'InConsultation' ? 'Clôturer' : 'Revoir'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedConsultation && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-orange-200/60">
                  <Stethoscope size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                    {selectedConsultation.patientName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <span className="font-mono">Réf: {selectedConsultation.id}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-4 bg-white dark:bg-neutral-850 text-xs">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('fiche')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeInspectorTab === 'fiche'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الفحص' : 'Fiche'}
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('vitals')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeInspectorTab === 'vitals'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'العلامات' : 'Constantes'}
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('finance')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeInspectorTab === 'finance'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الأتعاب' : 'Honoraires'}
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('actions')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeInspectorTab === 'actions'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الإجراءات' : 'Actions'}
              </button>
            </div>

            {/* Inspector Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Tab 1: Fiche Clinique */}
              {activeInspectorTab === 'fiche' && (
                <div className="space-y-4 text-xs animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400">MOTIF DE CONSULTATION</span>
                    <p className="text-neutral-900 dark:text-white font-medium text-xs">
                      {selectedConsultation.chiefComplaint}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400">DIAGNOSTIC / EXAMEN CLINIQUE</span>
                    <p className="text-neutral-800 dark:text-neutral-200">
                      {selectedConsultation.diagnosis || selectedConsultation.clinicalExam || 'Examen clinique en cours de documentation.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      {isAr ? 'ملاحظة الطبيب الفورية' : 'Note d\'observation immédiate'}
                    </label>
                    <textarea
                      rows={3}
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="Ajouter une consigne ou observation..."
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                    />
                    <div className="flex justify-end">
                      <AtriumButton size="xs" variant="primary" onClick={handleSaveNote}>
                        {noteSaved ? 'Enregistré ✓' : 'Sauvegarder note'}
                      </AtriumButton>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Constantes Vitales */}
              {activeInspectorTab === 'vitals' && (
                <div className="space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] text-neutral-400 font-bold">TENSION ARTÉRIELLE</span>
                      <div className="font-mono text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                        {selectedConsultation.vitals?.bloodPressure || '120/80'}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Normotendu</span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] text-neutral-400 font-bold">TEMPÉRATURE</span>
                      <div className="font-mono text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                        {selectedConsultation.vitals?.temperatureCelsius ? `${selectedConsultation.vitals.temperatureCelsius}°C` : '37.0°C'}
                      </div>
                      <span className="text-[10px] text-neutral-500">Apyrétique</span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] text-neutral-400 font-bold">POIDS / TAILLE</span>
                      <div className="font-mono text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                        {selectedConsultation.vitals?.weightKg ? `${selectedConsultation.vitals.weightKg} kg` : '72 kg'}
                      </div>
                      <span className="text-[10px] text-neutral-500">IMC: {selectedConsultation.vitals?.bmi || '23.5'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] text-neutral-400 font-bold">FRÉQUENCE CARDIAQUE</span>
                      <div className="font-mono text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                        {selectedConsultation.vitals?.heartRateBpm ? `${selectedConsultation.vitals.heartRateBpm} bpm` : '74 bpm'}
                      </div>
                      <span className="text-[10px] text-neutral-500">Pouls régulier</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Honoraires & Tiers-Payant */}
              {activeInspectorTab === 'finance' && (
                <div className="space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl bg-orange-50/60 dark:bg-neutral-800 border border-orange-100 dark:border-neutral-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Honoraires conventionnés:</span>
                      <span className="font-mono font-bold text-sm text-[#C4785A]">
                        {formatMoney(selectedConsultation.consultationFeeDzd, 'DZD')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                      <span>Ticket modérateur patient:</span>
                      <span className="font-mono font-semibold">
                        {formatMoney(selectedConsultation.copayAmountDzd || 600, 'DZD')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                      <span>Prise en charge CNAS/Chifa:</span>
                      <span className="font-mono font-semibold">
                        {formatMoney(selectedConsultation.insuranceShareDzd || 2400, 'DZD')}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-orange-200/60 dark:border-neutral-700 flex items-center justify-between font-bold">
                      <span>Statut encaissement:</span>
                      <span className={selectedConsultation.isPaid ? 'text-emerald-600' : 'text-amber-600'}>
                        {selectedConsultation.isPaid ? 'Réglé ✓' : 'En attente de paiement'}
                      </span>
                    </div>
                  </div>

                  {!selectedConsultation.isPaid && (
                    <AtriumButton
                      variant="primary"
                      onClick={() => {
                        markConsultationPaid(selectedConsultation.id);
                        setSelectedConsultation({ ...selectedConsultation, isPaid: true });
                        showToast('Paiement enregistré avec succès', 'success');
                      }}
                      className="w-full justify-center"
                      icon={<CreditCard size={14} />}
                    >
                      Encaisser la consultation
                    </AtriumButton>
                  )}
                </div>
              )}

              {/* Tab 4: Actions Immédiates */}
              {activeInspectorTab === 'actions' && (
                <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
                  {selectedConsultation.status === 'InWaitingQueue' && (
                    <button
                      type="button"
                      onClick={() => handleStartExam(selectedConsultation)}
                      className="w-full p-3 rounded-xl bg-[#C4785A] text-white font-semibold flex items-center justify-between hover:bg-[#b0674b] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Stethoscope size={16} />
                        Faire entrer le patient
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  )}

                  {selectedConsultation.status === 'InConsultation' && (
                    <button
                      type="button"
                      onClick={() => handleFinishExam(selectedConsultation)}
                      className="w-full p-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-between hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        Clôturer la consultation
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTogglePin(selectedConsultation.id)}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Pin size={16} />
                      {pinnedIds.has(selectedConsultation.id) ? 'Détacher priorité' : 'Prioriser en tête de file'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Impression du ticket de passage...', 'info');
                    }}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Printer size={16} />
                      Imprimer ticket d'attente
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
        </>
      )}

      <MedicalConsultationModal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        patients={patients}
        onSave={addConsultation}
      />

      <MedicalWaitingRoomTvModal
        isOpen={isTvModalOpen}
        onClose={() => setIsTvModalOpen(false)}
        consultations={consultations}
        practitioners={practitioners}
      />
    </div>
  );
};
