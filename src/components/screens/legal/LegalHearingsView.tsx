import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Landmark,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Printer,
  Eye,
  Check,
  X,
  FileText,
  AlertCircle,
  Briefcase,
  Users,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalHearing } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const LegalHearingsView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { hearings, updateHearing, addHearing } = useLegalData();

  const [activeWorkflowView, setActiveWorkflowView] = useState<'collection' | 'docket'>('collection');
  const [selectedHearing, setSelectedHearing] = useState<LegalHearing | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'fiche' | 'magistrats' | 'delibere'>('fiche');

  const pendingHearings = hearings.filter((h) => !h.isCompleted).length;
  const completedHearings = hearings.filter((h) => h.isCompleted).length;
  const uniqueCourts = new Set(hearings.map((h) => h.courtName)).size;

  const toggleHearingCompleted = (hearing: LegalHearing) => {
    const updated: LegalHearing = {
      ...hearing,
      isCompleted: !hearing.isCompleted,
      resultSummary: !hearing.isCompleted ? 'Audience tenue & plaidée au fond' : 'En attente d’audience',
    };
    updateHearing(updated);
    if (selectedHearing?.id === hearing.id) {
      setSelectedHearing(updated);
    }
    showToast(
      isAr
        ? updated.isCompleted ? 'تم تسجيل حضور ومرافعة الجلسة' : 'تمت إعادة تعيين الجلسة كقادمة'
        : updated.isCompleted ? 'Audience marquée comme plaidée' : 'Audience replacée en attente',
      'success'
    );
  };

  const getHearingActions = (hearing: LegalHearing): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة الجلسة' : 'Consulter Fiche',
      icon: <Eye size={14} />,
      onClick: () => setSelectedHearing(hearing),
    },
    {
      label: hearing.isCompleted ? (isAr ? 'إعادة للجدول' : 'Replacer') : (isAr ? 'تمت المرافعة' : 'Plaider'),
      icon: <Check size={14} />,
      onClick: () => toggleHearingCompleted(hearing),
    },
    {
      label: isAr ? 'ورقة الجلسة' : 'Fiche d’Audience',
      icon: <Printer size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `طباعة بطاقة الجلسة لقضية ${(hearing.matterTitle || '').substring(0, 20)}...`
            : `Génération de la fiche de plaidoirie (${hearing.courtName || ''})`,
          'info'
        );
      },
    },
    {
      label: isAr ? 'إشعار الخصم' : 'Avis Confrère',
      icon: <FileText size={14} />,
      onClick: () => {
        showToast(
          isAr ? 'تم إرسال إشعار رسمي لمحامي الخصم' : 'Avis d’audience télétransmis au confrère adverse',
          'success'
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Calendar size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الجلسات والمواعيد القضائية' : 'Rôle des Audiences & Délais Légaux'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {hearings.length} audiences
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'جدول الجلسات بالمحاكم والمجالس القضائية، المداولات وتبليغ المذكرات'
                : 'Calendrier des plaidoiries, composition de la cour & suivi des délibérés'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Hybrid Mode Switcher: Tabular Roster vs Visual Docket Board */}
          <div className="inline-flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700/60">
            <button
              onClick={() => setActiveWorkflowView('collection')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeWorkflowView === 'collection'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <List size={13} />
              <span>{isAr ? 'الجدول والقوائم' : 'Registre Roster'}</span>
            </button>
            <button
              onClick={() => setActiveWorkflowView('docket')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeWorkflowView === 'docket'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <LayoutGrid size={13} />
              <span>{isAr ? 'لوحة المواعيد' : 'Tableau Docket'}</span>
            </button>
          </div>

          <AtriumButton
            variant="primary"
            onClick={() => {
              const newH: LegalHearing = {
                id: `hear_${Date.now()}`,
                accountId: 'acc_01',
                businessId: 'biz_legal',
                branchId: 'branch_legal_main',
                staffId: 'staff_01',
                matterId: 'mat_01',
                matterTitle: 'Nouvelle Instance Civile & Commerciale',
                hearingDate: new Date().toISOString().split('T')[0],
                hearingTime: '10:00',
                courtName: 'Cour d’Alger (Chambre Civile)',
                benchJudge: 'Président de Chambre',
                purpose: 'Plaidoiries et constitution',
                resultSummary: 'Fixée au rôle',
                isCompleted: false,
              };
              addHearing(newH);
              setSelectedHearing(newH);
              showToast(isAr ? 'تمت إضافة جلسة جديدة للجدول' : 'Nouvelle audience inscrite au rôle', 'success');
            }}
            icon={<Plus size={14} />}
          >
            {isAr ? 'جلسة جديدة' : 'Nouvelle Audience'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مواعيد الجلسات والآجال الإجرائية' : 'Calendrier Judiciaire & Délais Légaux'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة جدول المرافعات أمام الغرف، مواعيد تبادل المذكرات والأحكام'
              : 'Audiences fixées, délibérés en attente et juridictions couvertes'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Audiences à venir */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'جلسات قادمة مبرمجة' : 'Audiences à Venir'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {pendingHearings}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {completedHearings} {isAr ? 'جلسة تمت المرافعة فيها' : 'audiences plaidées'}
              </p>
            </div>
          </div>

          {/* Card 2: Juridictions */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'المحاكم والمجالس المغطاة' : 'Tribunaux & Cours'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {uniqueCourts}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'مجالس قضاء ومحاكم ابتدائية' : 'Juridictions civiles & commerciales'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'احترام الآجال القانونية' : 'Respect des Délais Légaux'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                100% SLA
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {hearings.length} {isAr ? 'جلسة مدرجة بالجدول' : 'audiences au rôle'}
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
              {isAr ? 'جدول الجلسات والمرافعات القضائية' : 'Rôle Général des Audiences & Comparutions'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'مواعيد المحاكم، القضاة والقرارات' : 'Calendrier des comparutions et déroulement des audiences'}
            </p>
          </div>

          {/* Authentic Legal Hearing Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع الجلسات' : 'Toutes audiences' },
              { id: 'upcoming', label: isAr ? 'الجلسات القادمة' : 'À venir' },
              { id: 'delibere', label: isAr ? 'في المداولة' : 'En délibéré' },
              { id: 'plaidee', label: isAr ? 'مفصول فيها' : 'Plaidées' },
            ].map((tab, idx) => (
              <button
                key={tab.id}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: idx === 0 ? '#FCEEE8' : 'transparent',
                  color: idx === 0 ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        {activeWorkflowView === 'collection' ? (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full">
              <UniversalDataCollection<LegalHearing>
              title={isAr ? 'جدول الجلسات والمرافعات' : 'Rôle Général des Audiences & Plaidoiries'}
              subtitle={isAr ? 'مواعيد المحاكم، القضاة والقرارات' : 'Calendrier des comparutions et déroulement des audiences'}
              items={hearings}
              keyExtractor={(h) => h.id}
              searchPlaceholder={isAr ? 'بحث بالقضية، المحكمة، القاضي...' : 'Rechercher affaire, tribunal, chambre, juge...'}
              searchFilter={(h, query) =>
                (h.matterTitle || '').toLowerCase().includes(query.toLowerCase()) ||
                (h.courtName || '').toLowerCase().includes(query.toLowerCase()) ||
                (h.benchJudge || '').toLowerCase().includes(query.toLowerCase()) ||
                (h.hearingDate || '').includes(query) ||
                (h.purpose || '').toLowerCase().includes(query.toLowerCase())
              }
              onSelectRow={(h) => setSelectedHearing(h)}
              customActions={(h) => getHearingActions(h)}
              columns={[
                {
                  id: 'datetime',
                  header: isAr ? 'التاريخ والتوقيت' : 'Date & Heure',
                  width: '160px',
                  sortable: true,
                  renderCell: (h) => (
                    <div className="space-y-0.5 font-mono">
                      <div className="font-bold text-xs text-[#C4785A] flex items-center gap-1.5">
                        <Calendar size={13} />
                        <span>{h.hearingDate}</span>
                      </div>
                      {h.hearingTime && (
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                          <Clock size={11} />
                          <span>{h.hearingTime}</span>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'matter',
                  header: isAr ? 'ملف القضية' : 'Affaire & Dossier',
                  renderCell: (h) => (
                    <div>
                      <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                        {h.matterTitle}
                      </span>
                      {h.courtRoom && (
                        <span className="text-[10px] text-neutral-400">
                          Salle {h.courtRoom}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'court',
                  header: isAr ? 'المحكمة / الغرفة' : 'Juridiction',
                  width: '200px',
                  renderCell: (h) => (
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                        <Landmark size={12} className="text-neutral-400 shrink-0" />
                        <span className="truncate">{h.courtName}</span>
                      </div>
                      {h.benchJudge && (
                        <span className="text-[10px] text-neutral-500 block truncate">
                          Prés.: {h.benchJudge}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'purpose',
                  header: isAr ? 'الموضوع والغرض' : 'Objet / Diligence',
                  renderCell: (h) => (
                    <div className="max-w-xs">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">
                        {h.purpose || 'Plaidoiries et constitution contradictoire'}
                      </p>
                    </div>
                  ),
                },
                {
                  id: 'status',
                  header: isAr ? 'وضعية الجلسة' : 'Statut Audience',
                  width: '130px',
                  renderCell: (h) => (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        h.isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {h.isCompleted ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {h.isCompleted ? (isAr ? 'تمت المرافعة' : 'Plaidée') : (isAr ? 'قادمة' : 'À Venir')}
                    </span>
                  ),
                },
              ]}
              renderCard={(h) => (
                <div className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-mono text-xs font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded">
                      {h.hearingDate} {h.hearingTime ? `• ${h.hearingTime}` : ''}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        h.isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {h.isCompleted ? (isAr ? 'تمت المرافعة' : 'Plaidée') : (isAr ? 'قادمة' : 'À Venir')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-2">
                      {h.matterTitle}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
                      <Landmark size={12} className="text-neutral-400" />
                      <span className="truncate">{h.courtName}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
                    <span>Salle: {h.courtRoom || 'Chambre'}</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[140px]">
                      {h.benchJudge || 'Juge assigné'}
                    </span>
                  </div>
                </div>
              )}
            />
          </div>

          {/* 390px Side Inspector Drawer */}
          {selectedHearing && (
            <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Inspector Top Header */}
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                    <Scale size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                      {selectedHearing.hearingDate} {selectedHearing.hearingTime ? `• ${selectedHearing.hearingTime}` : ''}
                    </h3>
                    <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                      {selectedHearing.courtName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHearing(null)}
                  className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
                <button
                  onClick={() => setInspectorTab('fiche')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                    inspectorTab === 'fiche'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {isAr ? 'بطاقة الجلسة' : 'Fiche Audience'}
                </button>
                <button
                  onClick={() => setInspectorTab('magistrats')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                    inspectorTab === 'magistrats'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {isAr ? 'الهيئة والغرفة' : 'Cour & Magistrats'}
                </button>
                <button
                  onClick={() => setInspectorTab('delibere')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                    inspectorTab === 'delibere'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {isAr ? 'المداولة والمآل' : 'Délibéré & Résultat'}
                </button>
              </div>

              {/* Inspector Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {inspectorTab === 'fiche' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Dossier Judiciaire
                      </span>
                      <p className="font-bold text-neutral-900 dark:text-white leading-snug">
                        {selectedHearing.matterTitle}
                      </p>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-500">Statut:</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            selectedHearing.isCompleted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {selectedHearing.isCompleted ? 'Audience tenue & plaidée' : 'Fixée au rôle à venir'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                        Objet & Diligences Prévues
                      </span>
                      <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 leading-relaxed text-neutral-700 dark:text-neutral-300">
                        {selectedHearing.purpose || 'Plaidoiries au fond, dépôt des mémoires en réplique et communication des pièces cotées.'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div>
                        <span className="font-semibold block text-neutral-900 dark:text-white">Action sur le Rôle</span>
                        <span className="text-[10px] text-neutral-500">Basculer le statut de l’audience</span>
                      </div>
                      <button
                        onClick={() => toggleHearingCompleted(selectedHearing)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white transition-colors"
                      >
                        {selectedHearing.isCompleted ? 'Replacer en attente' : 'Marquer Plaidée ✓'}
                      </button>
                    </div>
                  </div>
                )}

                {inspectorTab === 'magistrats' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Composition de la Juridiction
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Juridiction:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">{selectedHearing.courtName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Président d'Audience:</span>
                          <span className="font-medium text-neutral-900 dark:text-white">{selectedHearing.benchJudge || 'Président désigné'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Salle / Box:</span>
                          <span className="font-mono font-bold text-neutral-900 dark:text-white">Salle {selectedHearing.courtRoom || 'N° 04'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Confrères & Ministère Public
                      </span>
                      <div className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1">
                        <p>• Représentation: Maître Y. Cherif (Avocat postulant)</p>
                        <p>• Adversaire: Notification d'assignation régulière</p>
                        <p>• Parquet: Présence requise selon chambre</p>
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === 'delibere' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Résultat & Décision d'Audience
                      </span>
                      <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium">
                        {selectedHearing.resultSummary || 'En attente de mise en délibéré par le tribunal.'}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-800/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                        <AlertCircle size={13} />
                        <span>Date de Renvoi Éventuelle</span>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        En cas de renvoi pour échange de pièces contradictoires, la nouvelle date sera inscrite d'office au calendrier du cabinet.
                      </p>
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
                      isAr ? 'جاري طباعة بطاقة المرافعة' : 'Impression de la fiche de plaidoirie',
                      'success'
                    );
                  }}
                >
                  {isAr ? 'طباعة ملف المرافعة' : 'Imprimer Fiche de Plaidoirie'}
                </AtriumButton>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Visual Docket Board Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hearings.map((h) => (
            <div
              key={h.id}
              onClick={() => {
                setSelectedHearing(h);
                setActiveWorkflowView('collection');
              }}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:shadow-md hover:border-[#C4785A]/50 transition-all cursor-pointer space-y-3.5 group"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                <span className="font-mono text-xs font-bold text-[#C4785A] bg-[#C4785A]/10 px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                  {h.hearingDate} {h.hearingTime ? `• ${h.hearingTime}` : ''}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    h.isCompleted
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {h.isCompleted ? 'Plaidée' : 'À Venir'}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-2 group-hover:text-[#C4785A] transition-colors">
                  {h.matterTitle}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
                  <Landmark size={13} className="text-neutral-400" />
                  <span>{h.courtName}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
                <span>Salle {h.courtRoom || 'N° 04'}</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">{h.benchJudge || 'Juge'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};
