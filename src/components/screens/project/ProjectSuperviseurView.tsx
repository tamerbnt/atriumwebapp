import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMAttendance, PMMission, PMTalent } from '../../../types/index';
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
  Building2,
  ChevronDown,
  Download,
  Pin,
  Trash2,
  Smartphone,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

interface ProjectSuperviseurViewProps {
  initialTab?: 'missions' | 'attendance' | 'staffing' | 'expense';
}

export const ProjectSuperviseurView: React.FC<ProjectSuperviseurViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    pmMissions,
    pmTalents,
    pmAttendances,
    updatePmAttendanceStatus,
    batchUpdatePmAttendanceStatus,
    closePmRollCall,
    addPmExpense,
    batchDeletePmMissions,
    resetPmMockData,
    activePmSubScreen,
    setActivePmSubScreen,
  } = useAtriumStore();

  // Auto-heal empty mock state on mount
  useEffect(() => {
    if (!pmMissions || pmMissions.length === 0) {
      resetPmMockData();
    }
  }, [pmMissions, resetPmMockData]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [showPhoneSimulator, setShowPhoneSimulator] = useState(false);

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

  // Search & Filter States
  const [missionSearch, setMissionSearch] = useState('');
  const [wilayaFilter, setWilayaFilter] = useState('all');
  const [selectedMissionIds, setSelectedMissionIds] = useState<Set<string>>(new Set());
  const [pinnedMissionIds, setPinnedMissionIds] = useState<Set<string>>(new Set());

  // Attendance Collection State
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<string>>(new Set());
  const [pinnedAttendanceIds, setPinnedAttendanceIds] = useState<Set<string>>(new Set());

  // Staffing filters
  const [talentSearch, setTalentSearch] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState(4.0);
  const [requireVehicle, setRequireVehicle] = useState(false);

  const selectedMission = pmMissions.find((m) => m.id === selectedMissionId) || pmMissions[0];
  const missionAttendances = pmAttendances.filter((a) => a.missionId === selectedMission?.id);

  // Stats for the daily roll call
  const presentCount = missionAttendances.filter((a) => a.status === 'present').length;
  const lateCount = missionAttendances.filter((a) => a.status === 'late').length;
  const absentCount = missionAttendances.filter((a) => a.status === 'absent').length;
  const isMissionLocked = missionAttendances.length > 0 && missionAttendances.every((a) => a.isLocked);

  // Filtered Missions
  const filteredMissions = useMemo(() => {
    return pmMissions.filter((m) => {
      const q = missionSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        m.code.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.venueName.toLowerCase().includes(q) ||
        m.wilayaName.toLowerCase().includes(q);
      const matchWilaya = wilayaFilter === 'all' || m.wilayaCode === wilayaFilter;
      return matchQ && matchWilaya;
    });
  }, [pmMissions, missionSearch, wilayaFilter]);

  // Mission Columns
  const missionColumns: ColumnDefinition<PMMission>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Réf & Titre Mission',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (m) => {
          const isPinned = pinnedMissionIds.has(m.id);
          return (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedMissionIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(m.id)) next.delete(m.id);
                    else next.add(m.id);
                    return next;
                  });
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-zinc-300 hover:text-zinc-500'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#C4785A]">{m.code}</span>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{m.title}</span>
                </div>
                <div className="text-[11px] text-zinc-500 truncate max-w-[200px]">{m.projectTitle}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'venue',
        header: 'Lieu & Wilaya',
        width: '2*',
        minWidth: '180px',
        renderCell: (m) => (
          <div className="text-xs text-zinc-700 dark:text-zinc-300">
            <div className="font-semibold">{m.venueName}</div>
            <div className="text-[11px] text-zinc-500">{m.address} ({m.wilayaName})</div>
          </div>
        ),
      },
      {
        key: 'dates',
        header: 'Date & Horaires',
        width: '1.5*',
        minWidth: '150px',
        renderCell: (m) => (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            <div>{m.startDate}</div>
            <div className="text-[11px] text-zinc-400">{m.dailyStartHour} - {m.dailyEndHour}</div>
          </div>
        ),
      },
      {
        key: 'team',
        header: 'Effectif Requis',
        width: '1.2*',
        minWidth: '120px',
        align: 'center',
        renderCell: (m) => (
          <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {m.requiredStaffCount} pers.
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '1.2*',
        minWidth: '120px',
        align: 'center',
        renderCell: (m) => {
          const map: Record<string, { label: string; bg: string; text: string }> = {
            live_today: { label: 'En direct', bg: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300', text: '' },
            scheduled: { label: 'Planifiée', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300', text: '' },
            completed: { label: 'Terminée', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', text: '' },
          };
          const b = map[m.status] || { label: m.status, bg: 'bg-zinc-100 text-zinc-700' };
          return (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${b.bg}`}>
              {b.label}
            </span>
          );
        },
      },
      {
        key: 'action',
        header: 'Pointage',
        width: '1*',
        minWidth: '110px',
        align: 'right',
        renderCell: (m) => (
          <button
            type="button"
            onClick={() => {
              setSelectedMissionId(m.id);
              setActiveTab('attendance');
            }}
            className="px-2.5 py-1 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-lg cursor-pointer ml-auto"
          >
            Pointer ➔
          </button>
        ),
      },
    ],
    [pinnedMissionIds]
  );

  // Attendance Columns
  const attendanceColumns: ColumnDefinition<PMAttendance>[] = useMemo(
    () => [
      {
        key: 'talent',
        header: 'Animateur Terrain',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (att) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-[#C4785A] shrink-0">
              {att.talentName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                {att.talentName}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                Arrivée : {att.checkInTime || 'Non pointé'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'rate',
        header: 'Forfait Journée',
        width: '1.5*',
        minWidth: '140px',
        align: 'right',
        renderCell: (att) => (
          <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(att.grossPayableDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'État Présence',
        width: '2*',
        minWidth: '200px',
        align: 'center',
        renderCell: (att) => {
          if (isMissionLocked) {
            return (
              <span className="font-semibold text-xs text-zinc-600 dark:text-zinc-400 capitalize">
                {att.status} (Verrouillé)
              </span>
            );
          }
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updatePmAttendanceStatus(att.id, 'present')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  att.status === 'present'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-emerald-50'
                }`}
              >
                Présent
              </button>
              <button
                type="button"
                onClick={() => updatePmAttendanceStatus(att.id, 'late', 15)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  att.status === 'late'
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-amber-50'
                }`}
              >
                Retard
              </button>
              <button
                type="button"
                onClick={() => updatePmAttendanceStatus(att.id, 'absent')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  att.status === 'absent'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-red-50'
                }`}
              >
                Absent
              </button>
            </div>
          );
        },
      },
    ],
    [isMissionLocked]
  );

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

  const handleExportMissionsCsv = () => {
    const headers = ['Code', 'Titre', 'Campagne', 'Lieu', 'Wilaya', 'Date', 'Effectif Requis', 'Statut'];
    const rows = filteredMissions.map((m) => [
      `"${m.code}"`,
      `"${m.title.replace(/"/g, '""')}"`,
      `"${m.projectTitle.replace(/"/g, '""')}"`,
      `"${m.venueName.replace(/"/g, '""')}"`,
      m.wilayaName,
      m.startDate,
      m.requiredStaffCount,
      m.status,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `missions_terrain_nch_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Facility Switcher & Simulator Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              Superviseur Terrain
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Missions Live & Pointage Mobile</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'missions'
              ? 'Déploiements & Activations Terrain'
              : activeTab === 'attendance'
              ? 'Pointage Présence & Clôture Paie'
              : activeTab === 'staffing'
              ? 'Sélection & Affectation Équipes'
              : 'Frais & Dépenses Logistiques'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Facility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-750 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
              <span>{currentBranch?.name || 'NCH Cyberpark Tower B'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {isBranchDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1.5 z-50">
                {branches && branches.length > 0 ? (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsBranchDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      {b.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-500">NCH Cyberpark Tower B</div>
                )}
              </div>
            )}
          </div>

          {/* Demo Data Recharge Button */}
          <button
            onClick={() => resetPmMockData()}
            title="Recharger les missions terrain"
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
            <span>Demo Data</span>
          </button>

          {/* Toggle Phone Simulator */}
          <button
            onClick={() => setShowPhoneSimulator((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ${
              showPhoneSimulator
                ? 'bg-[#C4785A] text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Simulateur Mobile</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'missions', label: 'Missions Terrain', icon: Radio, count: pmMissions.length },
          { id: 'attendance', label: 'Pointage Live & Paie', icon: Clock, count: missionAttendances.length },
          { id: 'staffing', label: 'Vivier Staffing', icon: Users, count: pmTalents.length },
          { id: 'expense', label: 'Déclaration Frais', icon: Camera },
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
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MISSIONS TERRAIN (UniversalDataCollection) */}
      {activeTab === 'missions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
              <Seek
                value={missionSearch}
                onChange={setMissionSearch}
                placeholder="Rechercher par code, lieu ou wilaya..."
                openWidth={360}
                shutSize={38}
              />
              <FilterSelect
                label="Wilaya"
                value={wilayaFilter}
                onChange={(val) => setWilayaFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'all', label: 'Toutes les wilayas' },
                  { value: '16', label: '16 - Alger' },
                  { value: '31', label: '31 - Oran' },
                  { value: '25', label: '25 - Constantine' },
                  { value: '19', label: '19 - Sétif' },
                ]}
              />
            </div>

            <button
              onClick={handleExportMissionsCsv}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <UniversalDataCollection<PMMission>
            items={filteredMissions}
            keyExtractor={(m) => m.id}
            defaultViewMode="list"
            columns={missionColumns}
            selectedIds={selectedMissionIds}
            onSelectionChange={setSelectedMissionIds}
            renderCard={(mission) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#C4785A]">
                    <span>{mission.code}</span>
                    <span className="text-zinc-500 font-normal">{mission.activationType}</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {mission.title}
                  </h4>
                  <div className="text-xs text-zinc-500 space-y-0.5">
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">{mission.venueName}</div>
                    <div>{mission.address} ({mission.wilayaName})</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                  <span className="font-mono text-zinc-500">{mission.startDate}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMissionId(mission.id);
                      setActiveTab('attendance');
                    }}
                    className="text-[#C4785A] font-semibold hover:underline cursor-pointer"
                  >
                    Pointer ➔
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 2: POINTAGE LIVE & PAIE (UniversalDataCollection) */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider">
                  Feuille de Présence & Pointage (Slide 9 & 10)
                </span>
                {isMissionLocked && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Verrouillé
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {selectedMission?.code} · {selectedMission?.title}
              </h2>
              <div className="text-xs text-zinc-500">
                {selectedMission?.venueName} · {selectedMission?.startDate} ({selectedMission?.dailyStartHour} - {selectedMission?.dailyEndHour})
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs font-bold font-mono px-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <span className="text-emerald-600">{presentCount} Présents</span>
                <span>·</span>
                <span className="text-amber-500">{lateCount} Retards</span>
                <span>·</span>
                <span className="text-red-500">{absentCount} Absents</span>
              </div>

              {!isMissionLocked && (
                <button
                  type="button"
                  onClick={handleCloseShift}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Clôturer & Transmettre Paie DG
                </button>
              )}
            </div>
          </div>

          <UniversalDataCollection<PMAttendance>
            items={missionAttendances}
            keyExtractor={(a) => a.id}
            defaultViewMode="list"
            columns={attendanceColumns}
            selectedIds={selectedAttendanceIds}
            onSelectionChange={setSelectedAttendanceIds}
            renderCard={(att) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-sm text-[#C4785A] shrink-0">
                    {att.talentName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                      {att.talentName}
                    </h4>
                    <p className="text-xs text-zinc-400 font-mono">
                      Arrivée : {att.checkInTime || 'Non pointé'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatMoney(att.grossPayableDzd, 'DZD')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    att.status === 'present'
                      ? 'bg-emerald-100 text-emerald-700'
                      : att.status === 'late'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {att.status}
                  </span>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 3: VIVIER STAFFING */}
      {activeTab === 'staffing' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Vivier National des Animateurs Qualifiés (58 Wilayas)
            </h3>
            <span className="text-xs text-zinc-500">{pmTalents.length} profils disponibles</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pmTalents.slice(0, 9).map((talent) => (
              <div
                key={talent.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center gap-3"
              >
                <img
                  src={talent.portraitPhotoUrl}
                  alt={talent.fullName}
                  className="w-12 h-12 rounded-full object-cover border border-[#C4785A]"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                    {talent.fullName}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {talent.wilayaName} · {talent.commune}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-amber-500 font-bold mt-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{talent.consolidatedScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DECLARATION FRAIS */}
      {activeTab === 'expense' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-xl mx-auto space-y-4">
          <div>
            <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider block">
              Dépense d'Urgence Terrain (Slide 11)
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              Frais de Régie & Consommables
            </h3>
          </div>

          {expenseSubmitted && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
              Dépense transmise à la Direction pour arbitrage !
            </div>
          )}

          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <LabelInput
              field="ExpTitle"
              label="Motif du Frais"
              value={expenseTitle}
              onChange={setExpenseTitle}
              required
              height={44}
              corner={12}
            />

            <LabelInput
              field="ExpAmount"
              label="Montant (DZD)"
              type="number"
              value={expenseAmount}
              onChange={setExpenseAmount}
              required
              height={44}
              corner={12}
            />

            <FilterSelect
              label="Catégorie de Frais"
              value={expenseCategory}
              onChange={(val) => setExpenseCategory((typeof val === 'string' ? val : val.target?.value || val) as any)}
              options={[
                { value: 'materials', label: 'Fournitures stand / adhésif / scotch' },
                { value: 'catering', label: 'Eau minérale & pauses animateurs' },
                { value: 'transport', label: 'Stationnement & péage autoroute' },
              ]}
            />

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Soumettre le Reçu à la Direction
            </button>
          </form>
        </div>
      )}

      {/* Floating Mobile Simulator Frame */}
      {showPhoneSimulator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPhoneSimulator(false)}
              className="absolute -top-10 right-0 text-white font-bold text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1"
            >
              Fermer le Simulateur
            </button>
            <MobilePhoneSimulator
              title="Superviseur Terrain"
              subtitle="PWA Pointage & Émargement"
            >
              <div className="p-4 space-y-4">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs font-bold text-[#C4785A]">
                    {selectedMission?.code || 'MIS-104'}
                  </div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedMission?.title || 'Activation Terrain'}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {selectedMission?.venueName} ({selectedMission?.wilayaName})
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Équipe Affectée ({missionAttendances.length} animateurs)
                  </div>
                  {missionAttendances.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs shadow-xs"
                    >
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {att.talentName}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {att.status.toUpperCase()} · {formatMoney(att.grossPayableDzd, 'DZD')}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        att.status === 'present'
                          ? 'bg-emerald-100 text-emerald-700'
                          : att.status === 'late'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {att.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </MobilePhoneSimulator>
          </div>
        </div>
      )}
    </div>
  );
};
