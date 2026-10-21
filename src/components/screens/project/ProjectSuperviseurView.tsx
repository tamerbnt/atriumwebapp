import React, { useState } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMAttendance, PMMission } from '../../../types/index';
import { MobilePhoneSimulator } from './MobilePhoneSimulator';
import {
  Users,
  Clock,
  Camera,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Star,
  MapPin,
  Car,
  Phone,
  ShieldCheck,
  Plus,
  Send,
  Lock,
  ExternalLink,
  Radio,
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { useTranslation } from '../../../utils/useTranslation';

interface ProjectSuperviseurViewProps {
  initialTab?: 'missions' | 'attendance' | 'staffing' | 'expense';
}

export const ProjectSuperviseurView: React.FC<ProjectSuperviseurViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    pmMissions,
    pmTalents,
    pmAttendances,
    updatePmAttendanceStatus,
    closePmRollCall,
    addPmExpense,
    activePmSubScreen,
    setActivePmSubScreen,
  } = useAtriumStore();

  const activeTab: 'missions' | 'attendance' | 'staffing' | 'expense' =
    activePmSubScreen === 'attendance' || initialTab === 'attendance'
      ? 'attendance'
      : activePmSubScreen === 'staffing' || initialTab === 'staffing'
      ? 'staffing'
      : activePmSubScreen === 'expense' || initialTab === 'expense'
      ? 'expense'
      : 'missions';

  const setActiveTab = (tab: 'missions' | 'attendance' | 'staffing' | 'expense') => {
    setActivePmSubScreen(tab);
  };

  const [selectedMissionId, setSelectedMissionId] = useState(pmMissions[0]?.id || '');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('2500');
  const [expenseCategory, setExpenseCategory] = useState<'catering' | 'materials' | 'transport'>('materials');
  const [expensePhotoUrl, setExpensePhotoUrl] = useState('https://images.unsplash.com/photo-1554415707-9e49fe74a64c?w=500&auto=format&fit=crop&q=80');
  const [expenseSubmitted, setExpenseSubmitted] = useState(false);

  // Staffing filters
  const [wilayaFilter, setWilayaFilter] = useState('all');
  const [minRatingFilter, setMinRatingFilter] = useState(4.0);
  const [requireVehicle, setRequireVehicle] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(['talent_01', 'talent_02']);

  const selectedMission = pmMissions.find((m) => m.id === selectedMissionId) || pmMissions[0];
  const missionAttendances = pmAttendances.filter((a) => a.missionId === selectedMission?.id);

  // Stats for the daily roll call
  const presentCount = missionAttendances.filter((a) => a.status === 'present').length;
  const lateCount = missionAttendances.filter((a) => a.status === 'late').length;
  const absentCount = missionAttendances.filter((a) => a.status === 'absent').length;
  const isMissionLocked = missionAttendances.length > 0 && missionAttendances.every((a) => a.isLocked);

  const [talentSearch, setTalentSearch] = useState('');

  // Filter talents for staffing
  const filteredTalents = pmTalents.filter((t) => {
    if (wilayaFilter !== 'all' && t.wilayaCode !== wilayaFilter) return false;
    if (t.consolidatedScore < minRatingFilter) return false;
    if (requireVehicle && !t.isVehicleOwner) return false;
    if (talentSearch.trim()) {
      const q = talentSearch.toLowerCase();
      const match =
        t.fullName.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.commune.toLowerCase().includes(q) ||
        t.wilayaName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleStatusChange = (attendanceId: string, status: PMAttendance['status']) => {
    if (isMissionLocked) return;
    updatePmAttendanceStatus(attendanceId, status);
  };

  const handleRatingChange = (attendanceId: string, rating: number) => {
    if (isMissionLocked) return;
    updatePmAttendanceStatus(attendanceId, 'present', undefined, rating);
  };

  const handleCloseShift = () => {
    if (selectedMission) {
      closePmRollCall(selectedMission.id);
    }
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission || !expenseTitle) return;

    addPmExpense({
      tenantId: 'acc_01',
      facilityId: 'branch_agency_main',
      projectId: selectedMission.projectId,
      projectTitle: selectedMission.projectTitle,
      missionId: selectedMission.id,
      missionCode: selectedMission.code,
      title: expenseTitle,
      category: expenseCategory,
      amountDzd: Number(expenseAmount) || 1000,
      declaredByUserId: 'talent_02',
      declaredByUserName: 'Sofiane Ryad (Superviseur)',
      declaredByRole: 'superviseur',
      receiptPhotoUrl: expensePhotoUrl,
      hasFiscalInvoice: false,
    });

    setExpenseSubmitted(true);
    setTimeout(() => {
      setExpenseSubmitted(false);
      setExpenseTitle('');
      setActiveTab('missions');
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              {t('pm_role_sup_badge')}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">{t('pm_role_sup_sub')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'missions'
              ? t('pm_sup_tab_missions')
              : activeTab === 'attendance'
              ? t('pm_sup_tab_attendance')
              : activeTab === 'staffing'
              ? t('pm_sup_tab_staffing')
              : t('pm_sup_tab_expense')}
          </h1>
        </div>

        {/* Global Mission Selector */}
        <FilterSelect
          label={t('pm_sup_tab_missions')}
          value={selectedMissionId}
          onChange={(val) => setSelectedMissionId(typeof val === 'string' ? val : val.target?.value || val)}
          options={pmMissions.map((m) => ({
            value: m.id,
            label: `${m.code} — ${m.venueName} (${m.activationType})`,
          }))}
        />
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'missions', label: t('pm_sup_tab_missions'), icon: Radio, count: pmMissions.length },
          { id: 'attendance', label: t('pm_sup_tab_attendance'), icon: Clock },
          { id: 'staffing', label: t('pm_sup_tab_staffing'), icon: Users, count: pmTalents.length },
          { id: 'expense', label: t('pm_sup_tab_expense'), icon: Plus },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#C4785A] text-[#C4785A]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>



      {/* SCREEN 4.2: MISSION OPERATIONS HUB */}
      {activeTab === 'missions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pmMissions.map((mission) => {
              const isLive = mission.status === 'live_today';
              return (
                <div
                  key={mission.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isLive
                      ? 'bg-white dark:bg-zinc-900 border-[#C4785A] shadow-md ring-1 ring-[#C4785A]/20'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isLive
                          ? 'bg-[#C4785A] text-white animate-pulse'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {isLive ? '● EN COURS AUJOURD\'HUI' : 'À VENIR'}
                    </span>
                    <span className="font-mono text-xs text-zinc-500 font-semibold">{mission.code}</span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    {mission.title}
                  </h3>
                  <p className="text-xs text-[#C4785A] font-semibold mb-3">
                    {mission.clientName} · {mission.projectTitle}
                  </p>

                  <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 mb-4 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{mission.venueName}</span>
                      <span>· {mission.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{t('pm_sup_schedule_label', { start: mission.dailyStartHour, end: mission.dailyEndHour })}</span>
                      <span>· {mission.requiredStaffCount} staff</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(mission.venueName + ' ' + mission.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      Ouvrir Google Maps <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => {
                        setSelectedMissionId(mission.id);
                        setActiveTab('attendance');
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      Lancer le Pointage ➔
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCREEN 4.3: REAL-TIME MOBILE DAILY CLOCK-IN (WRAPPED IN SIMULATOR) */}
      {activeTab === 'attendance' && (
        <MobilePhoneSimulator
          title="Pointage Terrain en Temps Réel"
          subtitle={`${selectedMission?.code} · ${selectedMission?.venueName}`}
          defaultMode="mobile"
        >
          {/* Mission Briefing Header inside Mobile Viewport */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#C4785A] uppercase tracking-wide">
                Pointage Mobile
              </span>
              <span className="font-mono text-[10px] text-zinc-500">{selectedMission?.code}</span>
            </div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {selectedMission?.title}
            </h3>
            <p className="text-[11px] text-zinc-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {selectedMission?.venueName}
            </p>

            {/* Quick Roll Call Stats */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-center">
              <div className="p-1.5 bg-emerald-100/60 dark:bg-emerald-950/40 rounded-xl">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold block">{t('pm_sup_status_present_badge')}</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono">{presentCount}</span>
              </div>
              <div className="p-1.5 bg-amber-100/60 dark:bg-amber-950/40 rounded-xl">
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold block">{t('pm_sup_status_late_badge')}</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300 font-mono">{lateCount}</span>
              </div>
              <div className="p-1.5 bg-red-100/60 dark:bg-red-950/40 rounded-xl">
                <span className="text-[10px] text-red-800 dark:text-red-300 font-semibold block">{t('pm_sup_status_absent_badge')}</span>
                <span className="text-sm font-bold text-red-700 dark:text-red-300 font-mono">{absentCount}</span>
              </div>
            </div>
          </div>

          {/* Roster Attendance Cards */}
          <div className="space-y-3">
            {missionAttendances.map((att) => (
              <div
                key={att.id}
                className="p-3 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={att.talentPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                      alt={att.talentName}
                      className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{att.talentName}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {att.dayRateDzd.toLocaleString()} DA / jour
                      </span>
                    </div>
                  </div>

                  {/* Star Rating for daily performance */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={isMissionLocked}
                        onClick={() => handleRatingChange(att.id, star)}
                        className={`cursor-pointer ${isMissionLocked ? 'opacity-80' : 'hover:scale-110 transition-transform'}`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            star <= att.shiftRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-300 dark:text-zinc-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Touch Status Switcher Buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <button
                    type="button"
                    disabled={isMissionLocked}
                    onClick={() => handleStatusChange(att.id, 'present')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      att.status === 'present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Présent
                  </button>

                  <button
                    type="button"
                    disabled={isMissionLocked}
                    onClick={() => handleStatusChange(att.id, 'late')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      att.status === 'late'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Retard
                  </button>

                  <button
                    type="button"
                    disabled={isMissionLocked}
                    onClick={() => handleStatusChange(att.id, 'absent')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      att.status === 'absent'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Absent
                  </button>

                  <button
                    type="button"
                    disabled={isMissionLocked}
                    onClick={() => handleStatusChange(att.id, 'replacement')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      att.status === 'replacement'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    Standby
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tamper-Proof Lock Action */}
          <div className="pt-3">
            {isMissionLocked ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Pointage Clôturé & Verrouillé
                </p>
                <p className="text-[10px] text-zinc-500">
                  Transmis à la Direction pour approbation et génération des mandats CCP.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCloseShift}
                className="w-full py-3 px-4 bg-[#C4785A] hover:bg-[#b3684a] text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Lock className="w-4 h-4" />
                Clôturer le Pointage du Jour
              </button>
            )}
          </div>
        </MobilePhoneSimulator>
      )}

      {/* SCREEN 4.1: FIELD STAFFING & TEAM BUILDER */}
      {activeTab === 'staffing' && (
        <div className="space-y-6">
          {/* Smart Filter Bar */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Seek
                value={talentSearch}
                onChange={setTalentSearch}
                placeholder={t('pm_sup_search_talents_ph')}
                openWidth={260}
                shutSize={38}
              />

              <FilterSelect
                label={t('pm_sup_filter_wilaya')}
                value={wilayaFilter}
                onChange={(val) => setWilayaFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'all', label: '58 Wilayas (Toutes)' },
                  { value: '16', label: '16 - Alger' },
                  { value: '31', label: '31 - Oran' },
                  { value: '25', label: '25 - Constantine' },
                  { value: '19', label: '19 - Sétif' },
                ]}
              />

              <FilterSelect
                label={t('pm_sup_filter_min_rating')}
                value={minRatingFilter}
                onChange={(val) => setMinRatingFilter(Number(typeof val === 'string' || typeof val === 'number' ? val : val.target?.value || val))}
                options={[
                  { value: 4.0, label: '≥ 4.0 ★ (Confirmé)' },
                  { value: 4.5, label: '≥ 4.5 ★ (Élite)' },
                ]}
              />

              <div className="flex items-center gap-2 pt-3">
                <input
                  type="checkbox"
                  id="vehicule"
                  checked={requireVehicle}
                  onChange={(e) => setRequireVehicle(e.target.checked)}
                  className="rounded text-[#C4785A] focus:ring-[#C4785A]"
                />
                <label htmlFor="vehicule" className="font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Véhiculé uniquement (Permis B)
                </label>
              </div>
            </div>

            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {filteredTalents.length} animateurs éligibles trouvés
            </div>
          </div>

          {/* Talents Roster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTalents.map((talent) => {
              const isSelected = selectedStaffIds.includes(talent.id);
              return (
                <div
                  key={talent.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-[#C4785A] shadow-xs'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={talent.portraitPhotoUrl}
                      alt={talent.fullName}
                      className="w-12 h-12 rounded-full object-cover border border-zinc-200"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{talent.fullName}</h4>
                      <p className="text-[11px] text-zinc-500">{talent.wilayaName} ({talent.commune})</p>
                      <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{talent.consolidatedScore}</span>
                        <span className="text-zinc-400 font-normal">· {talent.completedMissionsCount} missions</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <span className="font-mono text-zinc-500">{t('pm_sup_ccp_account_tag', { number: talent.ccpNumber })}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedStaffIds(selectedStaffIds.filter((id) => id !== talent.id));
                        } else {
                          setSelectedStaffIds([...selectedStaffIds, talent.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#C4785A] text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" /> Assigné
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" /> Affecter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCREEN 4.4: QUICK FIELD EXPENSE DECLARATION */}
      {activeTab === 'expense' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-semibold text-[#C4785A] uppercase tracking-wide">
              Écran 4.4 · Déclaration Achat Terrain
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              Capture Reçu & Dépense Imprévue On-Site
            </h2>
            <p className="text-xs text-zinc-500">
              Photographie du ticket de caisse obligatoire pour validation par la Direction et remboursement.
            </p>
          </div>

          {expenseSubmitted && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-semibold animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Dépense transmise avec succès ! Statut : En attente d'approbation DG.
            </div>
          )}

          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <LabelInput
                field="Motif"
                label={t('pm_sup_field_expense_reason')}
                required
                placeholder={t('pm_sup_field_expense_reason_ph')}
                value={expenseTitle}
                onChange={setExpenseTitle}
                width="100%"
                height={46}
                corner={12}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <LabelInput
                  field="Montant"
                  label={t('pm_cp_field_amount')}
                  type="number"
                  required
                  value={expenseAmount}
                  onChange={setExpenseAmount}
                  width="100%"
                  height={46}
                  corner={12}
                />
              </div>

              <LabelSelect
                field="Category"
                label={t('pm_cp_table_col_category')}
                value={expenseCategory}
                onChange={(val) => setExpenseCategory(typeof val === 'string' ? (val as any) : (val.target?.value || val))}
                options={[
                  { value: 'materials', label: "Matériel d'Urgence" },
                  { value: 'catering', label: 'Restauration Animateurs' },
                  { value: 'transport', label: 'Transport & Parking' },
                ]}
                height={46}
                corner={12}
              />
            </div>

            <div>
              <LabelInput
                field="PhotoUrl"
                label={t('pm_sup_field_expense_photo')}
                type="url"
                value={expensePhotoUrl}
                onChange={setExpensePhotoUrl}
                width="100%"
                height={46}
                corner={12}
              />
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl flex items-center gap-3">
              <Camera className="w-5 h-5 text-[#C4785A]" />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                L'image est automatiquement soumise au zoom de contrôle de la Direction Générale.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#C4785A] hover:bg-[#b3684a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Soumettre la Dépense à la Direction
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
