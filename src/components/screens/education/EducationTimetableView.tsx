import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Search,
  BookOpen,
  ChevronRight,
  Sparkles,
  Home,
  ChevronDown,
  Building2,
  Check,
  Eye,
  Printer,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { EduSession } from '../../../types';
import { RollCallModal } from './RollCallModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const EducationTimetableView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const {
    eduSessions,
    eduCohorts,
    eduClassrooms,
    staff,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    addEduSession,
    deleteEduSession,
  } = useAtriumStore();

  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('all');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<EduSession | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'seance' | 'salle' | 'emargement'>('seance');
  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [rollCallSession, setRollCallSession] = useState<EduSession | null>(null);

  // New session form state
  const [formData, setFormData] = useState({
    cohortId: eduCohorts[0]?.id || '',
    classroomId: eduClassrooms[0]?.id || '',
    instructorId: staff[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    topic: '',
  });

  const filteredSessions = eduSessions.filter((s) => {
    if (selectedCohortId !== 'all' && s.cohortId !== selectedCohortId) return false;
    if (selectedClassroomId !== 'all' && s.classroomId !== selectedClassroomId) return false;
    return true;
  });

  // Conflict detection
  const conflicts = new Set<string>();
  for (let i = 0; i < filteredSessions.length; i++) {
    for (let j = i + 1; j < filteredSessions.length; j++) {
      const a = filteredSessions[i];
      const b = filteredSessions[j];
      if (a.date === b.date) {
        const isOverlap = a.startTime < b.endTime && b.startTime < a.endTime;
        if (isOverlap) {
          if (
            (a.classroomId && a.classroomId === b.classroomId) ||
            (a.instructorId && a.instructorId === b.instructorId)
          ) {
            conflicts.add(a.id);
            conflicts.add(b.id);
          }
        }
      }
    }
  }

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const cohort = eduCohorts.find((c) => c.id === formData.cohortId);
    const room = eduClassrooms.find((r) => r.id === formData.classroomId);
    const instructor = staff.find((s) => s.id === formData.instructorId);

    if (!cohort) return;

    addEduSession({
      cohortId: cohort.id,
      cohortName: cohort.name,
      classroomId: room?.id,
      classroomName: room?.name,
      instructorId: instructor?.id || cohort.instructorId,
      instructorName: instructor?.fullName || cohort.instructorName,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      topic: formData.topic || undefined,
      status: 'Scheduled',
    });

    setIsAddSessionModalOpen(false);
    showToast(isAr ? 'تمت إضافة الحصة التدريبية' : 'Créneau d’enseignement ajouté au planning', 'success');
  };

  const getSessionActions = (s: EduSession): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة الحصة' : 'Consulter Fiche',
      icon: <Eye size={14} />,
      onClick: () => setSelectedSession(s),
    },
    {
      label: isAr ? 'مناداة الحضور' : 'Feuille d’Émargement',
      icon: <ClipboardList size={14} />,
      onClick: () => {
        setRollCallSession(s);
        setIsRollCallOpen(true);
      },
    },
    {
      label: isAr ? 'طباعة المحضر' : 'Imprimer Liste',
      icon: <Printer size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `طباعة ورقة الحضور للفوج ${s.cohortName}`
            : `Feuille d'émargement générée pour ${s.cohortName}`,
          'info'
        );
      },
    },
    {
      label: isAr ? 'حذف الحصة' : 'Supprimer',
      icon: <Trash2 size={14} />,
      onClick: () => {
        deleteEduSession(s.id);
        if (selectedSession?.id === s.id) {
          setSelectedSession(null);
        }
        showToast(isAr ? 'تم حذف الحصة' : 'Séance retirée du planning', 'info');
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <CalendarIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {t('edu_timetable_title')}
                </h1>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {eduSessions.length} créneaux · {eduClassrooms.length} salles
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('edu_timetable_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {conflicts.size > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-semibold">
                <AlertTriangle size={14} />
                <span>{conflicts.size} Conflits détectés</span>
              </div>
            )}

            <AtriumButton
              variant="primary"
              size="sm"
              glow
              icon={<Plus size={14} />}
              onClick={() => setIsAddSessionModalOpen(true)}
            >
              {t('edu_btn_add_session')}
            </AtriumButton>
          </div>
        </div>

        {/* Canonical 3-Card Top Metrics Pod Tray */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white tracking-tight">
              Planning & Utilisation des Espaces
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Disponibilité des salles, rotation des formateurs et intégrité du calendrier
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Séances Planifiées
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ↗ {filteredSessions.length} actives
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight font-mono">
                  {eduSessions.length}
                </span>
                <span className="text-xs text-neutral-400 ml-1">créneaux programmés</span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Volume horaire d'enseignement
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Salles & Ateliers
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  100% opérationnelles
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight font-mono">
                  {eduClassrooms.length}
                </span>
                <span className="text-xs text-neutral-400 ml-1">espaces d'enseignement</span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Rotation salles & laboratoires
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-400">
                  Intégrité des Horaires
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 inline-block">
                  {conflicts.size > 0 ? `${conflicts.size} Conflits Détectés` : 'Optimal'}
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#FB923C] tabular-nums tracking-tight font-mono">
                  {conflicts.size === 0 ? 'Optimal' : `${conflicts.size} Alertes`}
                </span>
                <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                  <span>{conflicts.size === 0 ? 'Zéro conflit salle ou formateur' : 'Ajustement de planning requis'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Collection Area + 390px Inspector Drawer */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<EduSession>
              title={isAr ? 'جدول الحصص والتوقيت' : 'Grille Générale des Séances & Horaires'}
              subtitle={isAr ? 'توزيع القاعات، الأفواج والمدربين' : 'Suivi des cours, créneaux horaires et feuilles d’émargement'}
              items={filteredSessions}
              keyExtractor={(s) => s.id}
              searchPlaceholder={isAr ? 'بحث بالفوج، القاعة، المدرب...' : 'Rechercher matière, cohorte, salle, formateur...'}
              searchFilter={(s, query) =>
                (s.topic || '').toLowerCase().includes(query.toLowerCase()) ||
                (s.instructorName || '').toLowerCase().includes(query.toLowerCase()) ||
                (s.cohortName || '').toLowerCase().includes(query.toLowerCase()) ||
                (s.classroomName || '').toLowerCase().includes(query.toLowerCase()) ||
                s.date.includes(query)
              }
              onSelectRow={(s) => setSelectedSession(s)}
              customActions={(s) => getSessionActions(s)}
              columns={[
                {
                  id: 'schedule',
                  header: isAr ? 'التوقيت' : 'Horaire & Date',
                  width: '160px',
                  sortable: true,
                  renderCell: (s) => (
                    <div className="space-y-0.5 font-mono">
                      <div className="font-bold text-xs text-[#C4785A] flex items-center gap-1.5">
                        <CalendarIcon size={12} />
                        <span>{s.date}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Clock size={11} />
                        <span>{s.startTime} - {s.endTime}</span>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'cohort',
                  header: isAr ? 'الفوج' : 'Cohorte / Promotion',
                  width: '180px',
                  renderCell: (s) => (
                    <div>
                      <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                        {s.cohortName}
                      </span>
                      {s.topic && (
                        <span className="text-[11px] text-neutral-500 line-clamp-1">
                          {s.topic}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'room',
                  header: isAr ? 'القاعة' : 'Salle Campus',
                  width: '140px',
                  renderCell: (s) => (
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                      <MapPin size={12} className="text-[#C4785A]" />
                      <span>{s.classroomName || 'Non assignée'}</span>
                    </span>
                  ),
                },
                {
                  id: 'instructor',
                  header: isAr ? 'المدرب' : 'Formateur / Enseignant',
                  width: '170px',
                  renderCell: (s) => (
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                      <User size={12} className="text-neutral-400" />
                      <span>{s.instructorName || 'Formateur'}</span>
                    </span>
                  ),
                },
                {
                  id: 'status',
                  header: isAr ? 'الوضعية' : 'Statut Séance',
                  width: '120px',
                  renderCell: (s) => {
                    const hasConflict = conflicts.has(s.id);
                    return hasConflict ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Conflit
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        Planifiée
                      </span>
                    );
                  },
                },
              ]}
              renderCard={(s) => {
                const hasConflict = conflicts.has(s.id);
                return (
                  <div className="p-4 flex flex-col justify-between h-full space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono text-xs font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded">
                        {s.startTime} - {s.endTime}
                      </div>
                      {hasConflict ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Conflit
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Planifiée
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-1">
                        {s.cohortName}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                        {s.topic || 'Séance de cours'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                      <span>{s.classroomName || 'Salle'}</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                        {s.instructorName}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          </div>

          {/* 390px Side Inspector Drawer */}
          {selectedSession && (
            <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Inspector Top Header */}
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                    <CalendarIcon size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                      {selectedSession.date} · {selectedSession.startTime}
                    </h3>
                    <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                      {selectedSession.cohortName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
                <button
                  onClick={() => setInspectorTab('seance')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                    inspectorTab === 'seance'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {isAr ? 'تفاصيل الحصة' : 'Séance & Cours'}
                </button>
                <button
                  onClick={() => setInspectorTab('salle')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                    inspectorTab === 'salle'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {isAr ? 'القاعة والتجهيزات' : 'Salle & Capacité'}
                </button>
                <button
                  onClick={() => setInspectorTab('emargement')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                    inspectorTab === 'emargement'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {isAr ? 'ورقة الحضور' : 'Émargement'}
                </button>
              </div>

              {/* Inspector Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {inspectorTab === 'seance' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Fiche Pédagogique
                      </span>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Promotion / Cohorte:</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{selectedSession.cohortName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Date & Créneau:</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedSession.date} ({selectedSession.startTime} - {selectedSession.endTime})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Formateur:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{selectedSession.instructorName}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                        Sujet / Module Traité
                      </span>
                      <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
                        {selectedSession.topic || 'Séance magistrale et travaux pratiques dirigés selon le syllabus de la formation.'}
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === 'salle' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Espace Pédagogique Assigné
                      </span>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Salle de cours:</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{selectedSession.classroomName || 'Salle A1'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Équipements:</span>
                        <span className="text-neutral-700 dark:text-neutral-300">Vidéoprojecteur HD, Tableau blanc, Wi-Fi</span>
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === 'emargement' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Appel & Présences Étudiants
                      </span>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        Feuille d'émargement officielle de la séance. Les absences non justifiées sont transmises à l'administration.
                      </p>
                      <button
                        onClick={() => {
                          setRollCallSession(selectedSession);
                          setIsRollCallOpen(true);
                        }}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white transition-colors"
                      >
                        Lancer l'Appel des Présences
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector Footer Actions */}
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
                <AtriumButton
                  variant="primary"
                  className="w-full justify-center"
                  icon={<Printer size={14} />}
                  onClick={() => {
                    showToast(
                      isAr ? 'جاري طباعة ورقة الحضور' : 'Impression de la feuille d’émargement',
                      'success'
                    );
                  }}
                >
                  {isAr ? 'طباعة ورقة الحضور' : 'Imprimer Feuille d’Émargement'}
                </AtriumButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Session Modal */}
      {isAddSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-md shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <CalendarIcon size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {t('edu_btn_add_session')}
                </h3>
              </div>
              <button
                onClick={() => setIsAddSessionModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <LabelSelect
                label={t('edu_label_cohort')}
                value={formData.cohortId}
                onChange={(v) => setFormData({ ...formData, cohortId: v })}
                options={eduCohorts.map((c) => ({ value: c.id, label: c.name }))}
              />

              <LabelSelect
                label={t('edu_field_classroom')}
                value={formData.classroomId}
                onChange={(v) => setFormData({ ...formData, classroomId: v })}
                options={eduClassrooms.map((r) => ({ value: r.id, label: `${r.name} (Cap: ${r.capacity})` }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(v) => setFormData({ ...formData, date: v })}
                  required
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <LabelInput
                    label="Début"
                    type="time"
                    value={formData.startTime}
                    onChange={(v) => setFormData({ ...formData, startTime: v })}
                    required
                  />
                  <LabelInput
                    label="Fin"
                    type="time"
                    value={formData.endTime}
                    onChange={(v) => setFormData({ ...formData, endTime: v })}
                    required
                  />
                </div>
              </div>

              <LabelInput
                label="Module / Thème du cours"
                value={formData.topic}
                onChange={(v) => setFormData({ ...formData, topic: v })}
                placeholder="Ex: Programmation Web Avancée"
              />

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsAddSessionModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  Ajouter au Planning
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roll Call Modal */}
      {isRollCallOpen && rollCallSession && (
        <RollCallModal
          session={rollCallSession}
          onClose={() => {
            setIsRollCallOpen(false);
            setRollCallSession(null);
          }}
        />
      )}
    </div>
  );
};
