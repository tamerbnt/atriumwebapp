import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Phone,
  Mail,
  UserCheck,
  ArrowRight,
  X,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Search,
  Home,
  ChevronDown,
  Download,
  Building2,
  Check,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Columns,
  Eye,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { AdmissionStage, EduAdmissionLead } from '../../../types';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';

export const EducationAdmissionsView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    eduAdmissions,
    eduCourses,
    eduCohorts,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    resetEduMockData,
    addEduAdmissionLead,
    updateAdmissionStage,
    updateEduAdmissionLead,
    deleteEduAdmissionLead,
    convertAdmissionToStudent,
    showToast,
  } = useAtriumStore();

  // Auto-heal empty admissions directory safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && eduAdmissions.length === 0) {
      hasAutoHealed.current = true;
      resetEduMockData();
    }
  }, [eduAdmissions.length, resetEduMockData]);

  const [viewLayout, setViewLayout] = useState<'kanban' | 'collection'>('kanban');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [conversionLead, setConversionLead] = useState<EduAdmissionLead | null>(null);
  const [targetCohortId, setTargetCohortId] = useState<string>(eduCohorts[0]?.id || '');
  const [conversionDeposit, setConversionDeposit] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [pinnedLeadIds, setPinnedLeadIds] = useState<Set<string>>(new Set());
  const [leadSortBy, setLeadSortBy] = useState<string>('studentName');
  const [leadSortDir, setLeadSortDir] = useState<'asc' | 'desc'>('asc');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    email: '',
    desiredCourseId: eduCourses[0]?.id || '',
    guardianName: '',
    placementScore: '',
    source: 'Social Media',
    notes: '',
  });

  const stages: { id: AdmissionStage; title: string }[] = [
    { id: 'Inquiry', title: t('edu_stage_inquiry') },
    { id: 'PlacementTest', title: t('edu_stage_placement') },
    { id: 'TrialClass', title: t('edu_stage_trial') },
    { id: 'Admitted', title: t('edu_stage_admitted') },
    { id: 'Enrolled', title: t('edu_stage_enrolled') },
  ];

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    const course = eduCourses.find((c) => c.id === formData.desiredCourseId);
    if (!course) return;

    addEduAdmissionLead({
      studentName: formData.studentName,
      phone: formData.phone,
      email: formData.email || undefined,
      desiredCourseId: course.id,
      desiredCourseTitle: course.title,
      stage: 'Inquiry',
      guardianName: formData.guardianName || undefined,
      placementScore: formData.placementScore || undefined,
      source: formData.source,
      notes: formData.notes || undefined,
    });

    setIsAddLeadModalOpen(false);
  };

  const handleConfirmConversion = () => {
    if (!conversionLead || !targetCohortId) return;
    convertAdmissionToStudent(conversionLead.id, targetCohortId, conversionDeposit);
    setConversionLead(null);
    setConversionDeposit(0);
  };

  const filteredAdmissions = useMemo(() => {
    return eduAdmissions.filter((lead) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        lead.studentName.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        lead.desiredCourseTitle.toLowerCase().includes(q)
      );
    });
  }, [eduAdmissions, searchQuery]);

  const sortedLeads = useMemo(() => {
    return [...filteredAdmissions].sort((a, b) => {
      const aPinned = pinnedLeadIds.has(a.id);
      const bPinned = pinnedLeadIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (leadSortBy === 'studentName') {
        const cmp = a.studentName.localeCompare(b.studentName);
        return leadSortDir === 'asc' ? cmp : -cmp;
      }
      if (leadSortBy === 'stage') {
        const cmp = a.stage.localeCompare(b.stage);
        return leadSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredAdmissions, pinnedLeadIds, leadSortBy, leadSortDir]);

  const leadColumns: ColumnDefinition<EduAdmissionLead>[] = useMemo(() => [
    {
      key: 'studentName',
      header: language === 'ar' ? 'المترشح / الطالب' : language === 'fr' ? 'Candidat / Élève' : 'Prospect Name',
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (lead) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
            {lead.studentName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-neutral-900 dark:text-white truncate">
              {lead.studentName}
            </div>
            <div className="text-[11px] text-[#C4785A] font-medium truncate">
              {lead.desiredCourseTitle}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: language === 'ar' ? 'الاتصال' : language === 'fr' ? 'Coordonnées' : 'Contact',
      width: '2*',
      minWidth: '180px',
      renderCell: (lead) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
            <Phone size={12} className="text-neutral-400 shrink-0" />
            <span>{lead.phone}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 truncate text-[11px]">
              <Mail size={12} className="text-neutral-400 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'guardian',
      header: language === 'ar' ? 'الولي / الوصي' : language === 'fr' ? 'Tuteur / Parent' : 'Guardian',
      width: '1.8*',
      minWidth: '150px',
      renderCell: (lead) => (
        <span className="text-xs text-neutral-700 dark:text-neutral-300">
          {lead.guardianName || (language === 'ar' ? 'مترشح راشد' : 'Adult / Self')}
        </span>
      ),
    },
    {
      key: 'score',
      header: language === 'ar' ? 'نتيجة التقييم' : language === 'fr' ? 'Test d\'orientation' : 'Placement Score',
      width: '1.8*',
      minWidth: '150px',
      renderCell: (lead) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {lead.placementScore ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A]">
              {lead.placementScore}
            </span>
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      key: 'stage',
      header: language === 'ar' ? 'المرحلة' : language === 'fr' ? 'Étape' : 'Stage',
      width: '1.5*',
      minWidth: '140px',
      sortable: true,
      renderCell: (lead) => {
        const isAdmitted = lead.stage === 'Admitted';
        const isEnrolled = lead.stage === 'Enrolled';
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isEnrolled
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : isAdmitted
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {lead.stage}
            </span>
            {isAdmitted && (
              <button
                type="button"
                onClick={() => setConversionLead(lead)}
                className="p-1 rounded-md bg-[#C4785A] text-white hover:opacity-90 shadow-2xs"
                title={t('edu_btn_convert_student')}
              >
                <UserCheck size={12} />
              </button>
            )}
          </div>
        );
      },
    },
  ], [language, t]);

  const handleExportCSV = () => {
    const headers = [
      language === 'ar' ? 'اسم المترشح' : language === 'fr' ? 'Nom Prospect' : 'Candidate Name',
      language === 'ar' ? 'الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone',
      language === 'ar' ? 'البريد الإلكتروني' : language === 'fr' ? 'Email' : 'Email',
      language === 'ar' ? 'المقرر المطلوب' : language === 'fr' ? 'Programme Souhaité' : 'Desired Course',
      language === 'ar' ? 'المرحلة الحالية' : language === 'fr' ? 'Étape' : 'Stage',
      language === 'ar' ? 'الولي' : language === 'fr' ? 'Tuteur' : 'Guardian',
      language === 'ar' ? 'نتيجة الاختبار' : language === 'fr' ? 'Score' : 'Placement Score',
      language === 'ar' ? 'مصدر التسجيل' : language === 'fr' ? 'Source' : 'Source',
      language === 'ar' ? 'ملاحظات' : language === 'fr' ? 'Remarques' : 'Notes',
    ];
    const rows = sortedLeads.map((l) => [
      `"${l.studentName}"`,
      `"${l.phone}"`,
      `"${l.email || ''}"`,
      `"${l.desiredCourseTitle}"`,
      `"${l.stage}"`,
      `"${l.guardianName || 'Adult / Self'}"`,
      `"${l.placementScore || ''}"`,
      `"${l.source || ''}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admission-leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم التصدير' : language === 'fr' ? 'Exportation réussie' : 'Export Complete',
      message: `${sortedLeads.length} ${language === 'ar' ? 'طلبات تسجيل تم تصديرها' : 'leads exported successfully'}`,
    });
  };

  const handleBatchSetStage = (stage: AdmissionStage) => {
    if (selectedLeadIds.size === 0) return;
    const count = selectedLeadIds.size;
    selectedLeadIds.forEach((id) => updateAdmissionStage(id, stage));
    setSelectedLeadIds(new Set());
    showToast({
      type: 'success',
      title: 'Statut Mis à Jour',
      message: `${count} dossiers passés à l'étape ${stage}`,
    });
  };

  const handleBatchDelete = () => {
    if (selectedLeadIds.size === 0) return;
    const count = selectedLeadIds.size;
    if (confirm(language === 'ar' ? `هل أنت متأكد من حذف ${count} ملف تسجيل؟` : language === 'fr' ? `Supprimer définitivement ${count} dossiers sélectionnés ?` : `Delete ${count} selected leads?`)) {
      selectedLeadIds.forEach((id) => deleteEduAdmissionLead(id));
      setSelectedLeadIds(new Set());
      showToast({
        type: 'info',
        title: language === 'ar' ? 'تم الحذف' : language === 'fr' ? 'Suppression' : 'Deleted',
        message: `${count} ${language === 'ar' ? 'ملفات تم حذفها' : 'leads deleted'}`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Row matching other category screens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {t('edu_admissions_title')}
              </h1>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {eduAdmissions.length} active leads · 5 intake pipeline stages
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('edu_admissions_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Facility Dropdown Menu */}
            {isFacilityDropdownOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'الفروع والمراكز التعليمية' : language === 'fr' ? 'Centres & Campus' : 'Campuses & Branches'}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* View Mode Toggle: Kanban vs Table/Cards */}
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-full border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setViewLayout('kanban')}
              className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewLayout === 'kanban'
                  ? 'bg-white dark:bg-neutral-900 text-[#C4785A] shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              <Columns size={13} />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('collection')}
              className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewLayout === 'collection'
                  ? 'bg-white dark:bg-neutral-900 text-[#C4785A] shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>{language === 'ar' ? 'جدول وبطاقات' : language === 'fr' ? 'Liste & Grille' : 'List & Grid'}</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-10 px-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Export CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Seed Demo Data Button */}
          <button
            type="button"
            onClick={resetEduMockData}
            className="h-10 px-3.5 bg-[#FCEEE8] dark:bg-neutral-800 hover:bg-[#F8DFD4] dark:hover:bg-neutral-700 text-[#C4785A] text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddLeadModalOpen(true)}
            className="h-10 px-4 rounded-full bg-[#C4785A] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>{t('edu_btn_new_lead')}</span>
          </button>
        </div>
      </div>

      {/* Batch Selection Toolbar */}
      {selectedLeadIds.size > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">
              {selectedLeadIds.size} {language === 'ar' ? 'طلبات تسجيل محددة' : language === 'fr' ? 'dossiers sélectionnés' : 'leads selected'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect'}
            </button>
            <button
              onClick={() => handleBatchSetStage('TrialClass')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={13} />
              <span>{language === 'ar' ? 'حصة تجريبية' : 'Trial Class'}</span>
            </button>
            <button
              onClick={() => handleBatchSetStage('Admitted')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={13} />
              <span>{language === 'ar' ? 'قبول الملف' : 'Admit'}</span>
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 size={13} />
              <span>{language === 'ar' ? 'حذف المحدد' : language === 'fr' ? 'Supprimer' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <Seek
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search leads by student, phone, desired course..."
        openWidth={320}
        shutSize={40}
      />

      {/* Mode 1: Universal Collection (List / Grid View) */}
      {viewLayout === 'collection' && (
        <UniversalDataCollection<EduAdmissionLead>
          items={sortedLeads}
          keyExtractor={(l) => l.id}
          defaultViewMode="list"
          columns={leadColumns}
          sortBy={leadSortBy}
          sortDirection={leadSortDir}
          onSortChange={(key) => {
            if (leadSortBy === key) {
              setLeadSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
              setLeadSortBy(key);
              setLeadSortDir('asc');
            }
          }}
          renderCard={(lead) => (
            <div className="flex flex-col items-center justify-center w-full">
              <div className="w-20 h-20 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center text-[28px] font-bold shadow-md mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">
                {lead.studentName.charAt(0)}
              </div>
              <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white truncate max-w-[210px] mb-1 tracking-tight text-center">
                {lead.studentName}
              </h3>
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] border border-[#F5E2D8] dark:border-neutral-700 mb-2 truncate max-w-[200px]">
                {lead.desiredCourseTitle}
              </span>

              <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1.5 text-center">
                <div className="font-mono text-neutral-600 dark:text-neutral-400 text-[11px]">{lead.phone}</div>
                {lead.guardianName && (
                  <div className="text-neutral-400 text-[11px]">Guardian: {lead.guardianName}</div>
                )}
                {lead.placementScore && (
                  <div className="text-[11px] font-semibold text-[#C4785A]">{lead.placementScore}</div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-400">Stage:</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{lead.stage}</span>
                </div>
              </div>
            </div>
          )}
          onItemClick={(lead) => {
            if (lead.stage === 'Admitted') setConversionLead(lead);
          }}
          onViewDetails={(lead) => {
            if (lead.stage === 'Admitted') setConversionLead(lead);
          }}
          onEdit={(lead) => {
            if (lead.stage === 'Admitted') setConversionLead(lead);
          }}
          onTogglePin={(lead) => {
            setPinnedLeadIds((prev) => {
              const next = new Set(prev);
              if (next.has(lead.id)) {
                next.delete(lead.id);
                showToast?.({ type: 'info', title: 'Unpinned', message: `${lead.studentName} unpinned` });
              } else {
                next.add(lead.id);
                showToast?.({ type: 'info', title: 'Pinned', message: `${lead.studentName} pinned to top` });
              }
              return next;
            });
          }}
          onDelete={(lead) => {
            if (confirm(`Delete admission record for ${lead.studentName}?`)) {
              deleteEduAdmissionLead(lead.id);
            }
          }}
          isPinned={(lead) => pinnedLeadIds.has(lead.id)}
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
          emptyTitle="No admission prospects"
          emptyDescription="No student leads match the current filters"
          primaryActionLabel={t('edu_btn_new_lead')}
          onAddFirstItem={() => setIsAddLeadModalOpen(true)}
        />
      )}

      {/* Mode 2: Kanban Pipeline Board */}
      {viewLayout === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {stages.map((stage) => {
          const leadsInStage = filteredAdmissions.filter((l) => l.stage === stage.id);

          return (
            <div
              key={stage.id}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/40 p-3.5 flex flex-col space-y-3 min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {stage.title}
                </span>
                <span className="w-5 h-5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold flex items-center justify-center">
                  {leadsInStage.length}
                </span>
              </div>

              {/* Lead Cards List */}
              <div className="space-y-2.5 flex-1">
                {leadsInStage.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-[#C4785A]/50 transition-all space-y-2 group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 dark:text-white text-xs group-hover:text-[#C4785A] transition-colors">
                          {lead.studentName}
                        </span>
                        {lead.placementScore && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A]">
                            Score: {lead.placementScore}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-[#C4785A] block mt-0.5">
                        {lead.desiredCourseTitle}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="text-neutral-400" />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.guardianName && (
                        <div className="text-[10px] text-neutral-400">
                          {t('edu_guardian_prefix', { name: lead.guardianName })}
                        </div>
                      )}
                      {lead.source && (
                        <div className="text-[10px] text-neutral-400">Source: {lead.source}</div>
                      )}
                    </div>

                    {/* Stage Transition Controls */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                      {stage.id === 'Admitted' ? (
                        <button
                          type="button"
                          onClick={() => setConversionLead(lead)}
                          className="w-full py-1.5 px-2 rounded-lg bg-[#C4785A] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 shadow-2xs"
                        >
                          <UserCheck size={12} />
                          <span>{t('edu_btn_convert_student')}</span>
                        </button>
                      ) : stage.id !== 'Enrolled' ? (
                        <button
                          type="button"
                          onClick={() => {
                            const nextIndex = stages.findIndex((s) => s.id === stage.id) + 1;
                            if (nextIndex < stages.length) {
                              updateAdmissionStage(lead.id, stages[nextIndex].id);
                            }
                          }}
                          className="w-full py-1 text-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Move Next</span>
                          <ArrowRight size={11} className="rtl:rotate-180" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mx-auto">
                          <UserCheck size={11} /> Converted
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {leadsInStage.length === 0 && (
                  <div className="py-8 text-center text-neutral-400 dark:text-neutral-500 text-[11px]">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Convert Lead to Student Modal */}
      {conversionLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('edu_lead_modal_title')}
              </h2>
              <button
                type="button"
                onClick={() => setConversionLead(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pt-4 space-y-4 text-xs">
              <p className="text-neutral-600 dark:text-neutral-300">
                You are about to register <strong className="text-neutral-900 dark:text-white">{conversionLead.studentName}</strong> into the student CRM and create an active enrollment record.
              </p>

              <LabelSelect
                label={t('edu_label_cohort')}
                value={targetCohortId}
                onChange={(val) => setTargetCohortId(val?.target?.value ?? String(val))}
                options={eduCohorts.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.cohortCode || c.courseTitle}) — ${c.tuitionFee.toLocaleString()} DZD`,
                }))}
                placeholder="Select Starting Cohort..."
              />

              <LabelInput
                label="Acompte Initial Reçu (DZD)"
                type="number"
                min="0"
                step="1000"
                value={conversionDeposit === 0 ? '' : conversionDeposit}
                placeholder="0 DZD (Optionnel - Règlement à l'inscription)"
                onChange={(e) => setConversionDeposit(Math.max(0, Number(e.target.value) || 0))}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setConversionLead(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConversion}
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('edu_btn_convert_student')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('edu_btn_new_lead')}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 pt-4 text-xs">
              <div>
                <LabelInput
                  field="studentName"
                  label={t('edu_field_fullname')}
                  required
                  placeholder="e.g. Yacine Benali"
                  value={formData.studentName}
                  onChange={(val) => setFormData({ ...formData, studentName: String(val) })}
                  width="100%"
                  height={44}
                  corner={12}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="phone"
                    label={t('edu_field_phone')}
                    type="tel"
                    required
                    placeholder="0550 00 00 00"
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: String(val) })}
                    width="100%"
                    height={44}
                    corner={12}
                  />
                </div>
                <div>
                  <LabelInput
                    field="email"
                    label={t('edu_field_email')}
                    type="email"
                    placeholder="yacine@example.com"
                    value={formData.email}
                    onChange={(val) => setFormData({ ...formData, email: String(val) })}
                    width="100%"
                    height={44}
                    corner={12}
                  />
                </div>
              </div>

              <LabelSelect
                label={t('edu_field_course_title')}
                value={formData.desiredCourseId}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    desiredCourseId: val?.target?.value ?? String(val),
                  })
                }
                options={eduCourses.map((co) => ({
                  value: co.id,
                  label: `${co.title} (${co.category})`,
                }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="guardianName"
                    label={t('edu_field_guardian_name')}
                    placeholder="Parent / Sponsor"
                    value={formData.guardianName}
                    onChange={(val) => setFormData({ ...formData, guardianName: String(val) })}
                    width="100%"
                    height={44}
                    corner={12}
                  />
                </div>
                <div>
                  <LabelInput
                    field="source"
                    label={t('member_field_acquisition')}
                    placeholder="e.g. Instagram, Referral, Walk-in"
                    value={formData.source}
                    onChange={(val) => setFormData({ ...formData, source: String(val) })}
                    width="100%"
                    height={44}
                    corner={12}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('edu_btn_new_lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
