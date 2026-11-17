import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  useAtriumStore,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
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
  Plus,
  Lock,
  Radio,
  Pin,
  Smartphone,
  X,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { FilterSelect } from '../../ui/FilterSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  KineticFilterModal,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  KineticStatusVariant,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

interface ProjectSuperviseurViewProps {
  initialTab?: 'missions' | 'attendance' | 'staffing' | 'expense';
}

const getMissionStatusBadge = (
  status: string,
  language: string
): { label: string; variant: KineticStatusVariant; pillClass: string } => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  switch (status) {
    case 'live_today':
      return {
        label: isAr ? 'مباشر اليوم' : isEn ? 'Live Today' : 'En direct',
        variant: 'blocked',
        pillClass:
          'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
      };
    case 'upcoming':
    case 'scheduled':
      return {
        label: isAr ? 'مجدولة' : isEn ? 'Scheduled' : 'Planifiée',
        variant: 'info',
        pillClass:
          'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#164E63]',
      };
    case 'completed':
      return {
        label: isAr ? 'منتهية' : isEn ? 'Completed' : 'Terminée',
        variant: 'active',
        pillClass:
          'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
      };
    default:
      return {
        label: status,
        variant: 'neutral',
        pillClass:
          'bg-[#F3EDE7] dark:bg-neutral-800 text-black/75 dark:text-white/80 border border-[#E6DED6] dark:border-neutral-700',
      };
  }
};

const getAttendanceBadge = (
  status: string,
  language: string
): { label: string; variant: KineticStatusVariant; pillClass: string } => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  if (status === 'present') {
    return {
      label: isAr ? 'حاضر' : isEn ? 'Present' : 'Présent',
      variant: 'active',
      pillClass:
        'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
    };
  }
  if (status === 'late') {
    return {
      label: isAr ? 'متأخر' : isEn ? 'Late' : 'Retard',
      variant: 'warning',
      pillClass:
        'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
    };
  }
  return {
    label: isAr ? 'غائب' : isEn ? 'Absent' : 'Absent',
    variant: 'blocked',
    pillClass:
      'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
  };
};

export const ProjectSuperviseurView: React.FC<ProjectSuperviseurViewProps> = ({ initialTab }) => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const state = useAtriumStore();
  const {
    currentBranch,
    branches,
    pmMissions,
    pmTalents,
    pmAttendances,
    updatePmAttendanceStatus,
    batchUpdatePmAttendanceStatus,
    closePmRollCall,
    addPmExpense,
    batchDeletePmMissions,
    activePmSubScreen,
    setActivePmSubScreen,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = state;

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const [showPhoneSimulator, setShowPhoneSimulator] = useState(false);

  const activeTab: 'missions' | 'attendance' | 'staffing' | 'expense' =
    activePmSubScreen === 'attendance' || initialTab === 'attendance'
      ? 'attendance'
      : activePmSubScreen === 'staffing' || initialTab === 'staffing'
      ? 'staffing'
      : activePmSubScreen === 'expense' || initialTab === 'expense'
      ? 'expense'
      : 'missions';

  const setActiveTab = useCallback(
    (tab: string) => {
      setActivePmSubScreen(tab);
    },
    [setActivePmSubScreen]
  );

  const [selectedMissionId, setSelectedMissionId] = useState<string>(pmMissions[0]?.id || '');

  // Expense quick form
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('2500');
  const [expenseCategory, setExpenseCategory] = useState('materials');
  const [expensePhotoUrl] = useState(
    'https://images.unsplash.com/photo-1554415707-9e49fe74a64c?w=500&auto=format&fit=crop&q=80'
  );
  const [expenseSubmitted, setExpenseSubmitted] = useState(false);

  // Missions collection state
  const [missionSearch, setMissionSearch] = useState('');
  const [wilayaFilter, setWilayaFilter] = useState('all');
  const [missionsViewMode, setMissionsViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isMissionsFilterOpen, setIsMissionsFilterOpen] = useState(false);
  const missionsFilterRef = useRef<HTMLButtonElement | null>(null);
  const [selectedMissionIds, setSelectedMissionIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedMissionIds, setPinnedMissionIds] = useState<Set<string>>(() => new Set<string>());
  const [inspectedMission, setInspectedMission] = useState<PMMission | null>(null);
  const [missionOpenerEl, setMissionOpenerEl] = useState<HTMLElement | null>(null);

  // Attendance collection state
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all');
  const [attendanceViewMode, setAttendanceViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isAttendanceFilterOpen, setIsAttendanceFilterOpen] = useState(false);
  const attendanceFilterRef = useRef<HTMLButtonElement | null>(null);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<string>>(() => new Set<string>());
  const [inspectedAttendance, setInspectedAttendance] = useState<PMAttendance | null>(null);
  const [attendanceOpenerEl, setAttendanceOpenerEl] = useState<HTMLElement | null>(null);

  // Staffing collection state
  const [talentSearch, setTalentSearch] = useState('');
  const [requireVehicle, setRequireVehicle] = useState(false);
  const [staffingViewMode, setStaffingViewMode] = useState<'list' | 'grid' | 'calendar'>('grid');
  const [inspectedTalent, setInspectedTalent] = useState<PMTalent | null>(null);
  const [talentOpenerEl, setTalentOpenerEl] = useState<HTMLElement | null>(null);

  const selectedMission = useMemo(
    () => pmMissions.find((m) => m.id === selectedMissionId) || pmMissions[0],
    [pmMissions, selectedMissionId]
  );

  const missionAttendances = useMemo(
    () => pmAttendances.filter((a) => a.missionId === selectedMission?.id),
    [pmAttendances, selectedMission]
  );

  const presentCount = missionAttendances.filter((a) => a.status === 'present').length;
  const lateCount = missionAttendances.filter((a) => a.status === 'late').length;
  const absentCount = missionAttendances.filter((a) => a.status === 'absent').length;
  const isMissionLocked =
    missionAttendances.length > 0 && missionAttendances.every((a) => a.isLocked);

  const filteredMissions = useMemo(() => {
    const q = missionSearch.toLowerCase().trim();
    return pmMissions
      .filter((m) => {
        const matchQ =
          !q ||
          m.code.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q) ||
          m.venueName.toLowerCase().includes(q) ||
          m.wilayaName.toLowerCase().includes(q);
        const matchWilaya = wilayaFilter === 'all' || m.wilayaCode === wilayaFilter;
        return matchQ && matchWilaya;
      })
      .sort((a, b) => {
        const aP = pinnedMissionIds.has(a.id);
        const bP = pinnedMissionIds.has(b.id);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        return 0;
      });
  }, [pmMissions, missionSearch, wilayaFilter, pinnedMissionIds]);

  const filteredAttendances = useMemo(() => {
    const q = attendanceSearch.toLowerCase().trim();
    return missionAttendances.filter((att) => {
      const matchQ = !q || att.talentName.toLowerCase().includes(q);
      const matchSt = attendanceStatusFilter === 'all' || att.status === attendanceStatusFilter;
      return matchQ && matchSt;
    });
  }, [missionAttendances, attendanceSearch, attendanceStatusFilter]);

  const filteredTalents = useMemo(() => {
    const q = talentSearch.toLowerCase().trim();
    return pmTalents.filter((tal) => {
      const matchQ =
        !q ||
        tal.fullName.toLowerCase().includes(q) ||
        tal.wilayaName.toLowerCase().includes(q) ||
        tal.commune.toLowerCase().includes(q);
      const matchVeh = !requireVehicle || tal.isVehicleOwner;
      return matchQ && matchVeh;
    });
  }, [pmTalents, talentSearch, requireVehicle]);

  const activeMission = useMemo(
    () =>
      inspectedMission
        ? pmMissions.find((m) => m.id === inspectedMission.id) || inspectedMission
        : null,
    [inspectedMission, pmMissions]
  );

  const activeAttendance = useMemo(
    () =>
      inspectedAttendance
        ? pmAttendances.find((a) => a.id === inspectedAttendance.id) || inspectedAttendance
        : null,
    [inspectedAttendance, pmAttendances]
  );

  const handleTogglePinMission = useCallback((m: PMMission) => {
    setPinnedMissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  }, []);

  const handleCloseShift = useCallback(() => {
    if (!selectedMission) return;
    closePmRollCall(selectedMission.id);
    showToast(
      isAr
        ? 'تم غلق سجل الحضور وإحالة كشف الأجور للمديرية'
        : isEn
        ? 'Roll call locked & sent to direction payroll'
        : 'Émargement clôturé et transmis à la paie DG',
      'success'
    );
  }, [selectedMission, closePmRollCall, isAr, isEn]);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission || !expenseTitle) return;
    addPmExpense({
      tenantId: 'acc_01',
      facilityId: currentBranch?.id || 'branch_agency_main',
      projectId: selectedMission.projectId,
      projectTitle: selectedMission.projectTitle,
      missionId: selectedMission.id,
      missionCode: selectedMission.code,
      title: expenseTitle,
      category: expenseCategory as 'materials' | 'catering' | 'transport',
      amountDzd: Number(expenseAmount) || 1000,
      declaredByUserId: 'talent_02',
      declaredByUserName: 'Sofiane Ryad (Superviseur)',
      declaredByRole: 'superviseur',
      receiptPhotoUrl: expensePhotoUrl,
      hasFiscalInvoice: false,
    });
    setExpenseSubmitted(true);
    showToast(
      isAr ? 'تم إرسال وصل النفقة للمصادقة' : 'Dépense terrain soumise à la Direction',
      'success'
    );
    setTimeout(() => {
      setExpenseSubmitted(false);
      setExpenseTitle('');
      setActiveTab('missions');
    }, 1800);
  };

  const handleExportMissionsCsv = useCallback(() => {
    const headers = ['Code', 'Titre', 'Campagne', 'Lieu', 'Wilaya', 'Date', 'Effectif Requis', 'Statut'];
    const rows = filteredMissions.map((m) => [
      m.code,
      m.title,
      m.projectTitle,
      m.venueName,
      m.wilayaName,
      m.startDate,
      m.requiredStaffCount,
      m.status,
    ]);
    downloadCsvSafe(
      `missions_terrain_nch_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير جدول المهام CSV' : 'Export CSV des missions généré', 'info');
  }, [filteredMissions, isAr]);

  const getMissionRowMeta = useCallback(
    (m: PMMission): Partial<KineticRowData> => {
      const br = resolveRecordBranch(m, branchesById, currentBranch, language);
      const badge = getMissionStatusBadge(m.status, language);
      return {
        title: `${m.code} · ${m.title}`,
        subline: `${m.venueName} (${m.wilayaName})`,
        avatarText: m.wilayaCode || 'DZ',
        categoryLabel: m.activationType.replace(/_/g, ' '),
        statusLabel: badge.label,
        statusVariant: badge.variant,
        metricPrimary: `${m.requiredStaffCount} ${isAr ? 'منشط' : 'pers.'}`,
        metricSecondary: `${m.startDate} · ${m.dailyStartHour}-${m.dailyEndHour}`,
        branchName: br.name,
        branchCode: br.code,
        isPinned: pinnedMissionIds.has(m.id),
        detailCol1: {
          heading: isAr ? 'الموقع والتوقيت' : 'Lieu & Horaires',
          primaryText: `${m.venueName} (${m.wilayaName})`,
          secondaryText: `${m.dailyStartHour} - ${m.dailyEndHour}`,
        },
        detailCol2: {
          heading: isAr ? 'التأطير' : 'Supervision',
          primaryText: m.supervisorName,
          secondaryText: `${m.requiredStaffCount} animateurs`,
        },
      };
    },
    [branchesById, currentBranch, language, pinnedMissionIds, isAr]
  );

  const getAttendanceRowMeta = useCallback(
    (att: PMAttendance): Partial<KineticRowData> => {
      const br = resolveRecordBranch(att, branchesById, currentBranch, language);
      const badge = getAttendanceBadge(att.status, language);
      return {
        title: att.talentName,
        subline: `${isAr ? 'الوصول:' : 'Arrivée :'} ${att.checkInTime || 'Non pointé'}`,
        avatarText: att.talentName.slice(0, 2).toUpperCase(),
        categoryLabel: `${att.shiftRating}/5 ★`,
        statusLabel: att.isLocked ? `${badge.label} (Verrouillé)` : badge.label,
        statusVariant: badge.variant,
        metricPrimary: formatMoney(att.grossPayableDzd, 'DZD'),
        metricSecondary: att.date,
        branchName: br.name,
        branchCode: br.code,
        detailCol1: {
          heading: isAr ? 'التنقيط' : 'Pointage',
          primaryText: att.checkInTime || '—',
          secondaryText: att.minutesLate ? `${att.minutesLate} min retard` : 'À l’heure',
        },
        detailCol2: {
          heading: isAr ? 'المستحقات' : 'Rémunération',
          primaryText: formatMoney(att.grossPayableDzd, 'DZD'),
          secondaryText: `Forfait ${formatMoney(att.dayRateDzd, 'DZD')}`,
        },
      };
    },
    [branchesById, currentBranch, language, isAr]
  );

  const getTalentRowMeta = useCallback(
    (tal: PMTalent): Partial<KineticRowData> => {
      const br = resolveRecordBranch(tal, branchesById, currentBranch, language);
      return {
        title: tal.fullName,
        subline: `${tal.wilayaName} · ${tal.commune}`,
        avatarText: tal.fullName.slice(0, 2).toUpperCase(),
        categoryLabel: tal.desiredRoles[0] || 'Animateur',
        statusLabel: tal.status,
        statusVariant: tal.status === 'active' ? 'active' : 'neutral',
        metricPrimary: `${tal.consolidatedScore.toFixed(1)} ★`,
        metricSecondary: tal.isVehicleOwner ? 'Véhiculé' : `${tal.completedMissionsCount} missions`,
        branchName: br.name,
        branchCode: br.code,
      };
    },
    [branchesById, currentBranch, language]
  );

  const missionColumns = useMemo<ColumnDefinition<PMMission>[]>(
    () => [
      {
        key: 'code',
        header: isAr ? 'رمز واسم المهمة' : isEn ? 'Mission Ref.' : 'Réf & Titre Mission',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (m) => {
          const isPinned = pinnedMissionIds.has(m.id);
          return (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                aria-label="Pin"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePinMission(m);
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isPinned
                    ? 'text-[#d4522f] bg-[#d4522f]/10'
                    : 'text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#d4522f]">{m.code}</span>
                  <span className="font-semibold text-xs text-black dark:text-white">{m.title}</span>
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55 truncate max-w-[200px]">
                  {m.projectTitle}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'venue',
        header: isAr ? 'الموقع والولاية' : isEn ? 'Venue & Wilaya' : 'Lieu & Wilaya',
        width: '2*',
        minWidth: '180px',
        renderCell: (m) => (
          <div className="text-xs text-black/70 dark:text-white/75">
            <div className="font-semibold">{m.venueName}</div>
            <div className="text-[11px] text-black/55 dark:text-white/55">
              {m.address} ({m.wilayaName})
            </div>
          </div>
        ),
      },
      {
        key: 'dates',
        header: isAr ? 'التاريخ والساعات' : isEn ? 'Date & Hours' : 'Date & Horaires',
        width: '1.5*',
        minWidth: '150px',
        renderCell: (m) => (
          <div className="text-xs text-black/70 dark:text-white/75 font-mono">
            <div>{m.startDate}</div>
            <div className="text-[11px] text-black/55 dark:text-white/55">
              {m.dailyStartHour} - {m.dailyEndHour}
            </div>
          </div>
        ),
      },
      {
        key: 'team',
        header: isAr ? 'الفريق المطلوب' : isEn ? 'Staff Needed' : 'Effectif Requis',
        width: '1.2*',
        minWidth: '120px',
        align: 'center',
        renderCell: (m) => (
          <span className="font-mono text-xs font-bold text-black dark:text-white">
            {m.requiredStaffCount} pers.
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        width: '1.2*',
        minWidth: '120px',
        align: 'center',
        renderCell: (m) => {
          const badge = getMissionStatusBadge(m.status, language);
          return (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.pillClass}`}>
              {badge.label}
            </span>
          );
        },
      },
      {
        key: 'action',
        header: isAr ? 'التنقيط' : isEn ? 'Roll Call' : 'Pointage',
        width: '1*',
        minWidth: '110px',
        align: 'right',
        renderCell: (m) => (
          <AtriumButton
            type="button"
            size="xs"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMissionId(m.id);
              setActiveTab('attendance');
            }}
            className="ml-auto"
          >
            {isAr ? 'تنقيط ➔' : isEn ? 'Roll Call ➔' : 'Pointer ➔'}
          </AtriumButton>
        ),
      },
    ],
    [pinnedMissionIds, handleTogglePinMission, language, setActiveTab, isAr, isEn]
  );

  const attendanceColumns = useMemo<ColumnDefinition<PMAttendance>[]>(
    () => [
      {
        key: 'talent',
        header: isAr ? 'المنشط الميداني' : isEn ? 'Field Promoter' : 'Animateur Terrain',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (att) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-[#d4522f] shrink-0">
              {att.talentName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-xs text-black dark:text-white">{att.talentName}</div>
              <div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
                {isAr ? 'الوصول:' : 'Arrivée :'} {att.checkInTime || 'Non pointé'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'rate',
        header: isAr ? 'الأجر اليومي' : isEn ? 'Day Rate' : 'Forfait Journée',
        width: '1.5*',
        minWidth: '140px',
        align: 'right',
        renderCell: (att) => (
          <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
            {formatMoney(att.grossPayableDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'حالة الحضور' : isEn ? 'Attendance' : 'État Présence',
        width: '2*',
        minWidth: '210px',
        align: 'center',
        renderCell: (att) => {
          if (isMissionLocked) {
            return (
              <span className="font-semibold text-xs text-black/70 dark:text-white/75 capitalize">
                {getAttendanceBadge(att.status, language).label} (Verrouillé)
              </span>
            );
          }
          return (
            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => updatePmAttendanceStatus(att.id, 'present')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  att.status === 'present'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 hover:bg-emerald-50'
                }`}
              >
                {isAr ? 'حاضر' : isEn ? 'Present' : 'Présent'}
              </button>
              <button
                type="button"
                onClick={() => updatePmAttendanceStatus(att.id, 'late', 15)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  att.status === 'late'
                    ? 'bg-amber-500 text-white'
                    : 'bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 hover:bg-amber-50'
                }`}
              >
                {isAr ? 'متأخر' : isEn ? 'Late' : 'Retard'}
              </button>
              <button
                type="button"
                onClick={() => updatePmAttendanceStatus(att.id, 'absent')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  att.status === 'absent'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 hover:bg-red-50'
                }`}
              >
                {isAr ? 'غائب' : isEn ? 'Absent' : 'Absent'}
              </button>
            </div>
          );
        },
      },
    ],
    [isMissionLocked, updatePmAttendanceStatus, language, isAr, isEn]
  );

  const talentColumns = useMemo<ColumnDefinition<PMTalent>[]>(
    () => [
      {
        key: 'name',
        header: isAr ? 'المنشط' : isEn ? 'Promoter' : 'Animateur',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (tal) => (
          <div className="flex items-center gap-3">
            {tal.portraitPhotoUrl ? (
              <img
                src={tal.portraitPhotoUrl}
                alt={tal.fullName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-[#d4522f] shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-[#d4522f] shrink-0">
                {tal.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-xs text-black dark:text-white truncate">{tal.fullName}</div>
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                {tal.wilayaName} · {tal.commune}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'score',
        header: isAr ? 'التقييم' : isEn ? 'Rating' : 'Note',
        width: '1*',
        minWidth: '100px',
        renderCell: (tal) => (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-current" />
            {tal.consolidatedScore.toFixed(1)}
          </span>
        ),
      },
      {
        key: 'vehicle',
        header: isAr ? 'التنقل' : isEn ? 'Mobility' : 'Mobilité',
        width: '1.2*',
        minWidth: '120px',
        renderCell: (tal) => (
          <span className="text-xs text-black/70 dark:text-white/75">
            {tal.isVehicleOwner
              ? isAr
                ? 'سيارة خاصة'
                : isEn
                ? 'Vehicle Owner'
                : 'Véhiculé'
              : isAr
              ? 'بدون سيارة'
              : isEn
              ? 'No Vehicle'
              : 'Non véhiculé'}
          </span>
        ),
      },
    ],
    [isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: pmMissions.length > 0 || pmAttendances.length > 0,
  });

  if (
    showSkeleton &&
    ((pmMissions.length === 0 && pmAttendances.length === 0) || networkMode === 'force_skeleton')
  ) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut || isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync || retry}
        />
        <SkeletonCollectionScreen
          kpiCount={3}
          columns={[
            { width: '2.5*', minWidth: '180px' },
            { width: '1.5*', minWidth: '140px' },
            { width: '1.4*', minWidth: '130px' },
            { width: '1.2*', minWidth: '110px' },
          ]}
          viewMode="list"
          isOffline={isOffline}
          isTimedOut={isTimedOut || isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync || retry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut || isSyncTimeout}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />

      <ScreenHeaderBar
        icon={<Radio size={22} />}
        title={
          activeTab === 'missions'
            ? isAr
              ? 'المهام'
              : isEn
              ? 'Missions'
              : 'Missions'
            : activeTab === 'attendance'
            ? isAr
              ? 'الحضور'
              : isEn
              ? 'Roll Call'
              : 'Pointage'
            : activeTab === 'staffing'
            ? isAr
              ? 'التوظيف'
              : isEn
              ? 'Staffing'
              : 'Équipes'
            : isAr
            ? 'المصاريف'
            : isEn
            ? 'Expenses'
            : 'Dépenses'
        }
        secondaryActions={
          <button
            type="button"
            onClick={() => setShowPhoneSimulator((prev) => !prev)}
            className={`h-10 px-3.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ${
              showPhoneSimulator
                ? 'bg-[#d4522f] text-white'
                : 'bg-white dark:bg-neutral-800 text-black/70 dark:text-white/75 border border-[#E6DED6] dark:border-neutral-700 hover:bg-[#FBF8F5]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>
              {isAr
                ? 'محاكي الهاتف'
                : isEn
                ? 'Mobile Simulator'
                : 'Simulateur Mobile'}
            </span>
          </button>
        }
        primaryAction={
          activeTab === 'attendance' && !isMissionLocked && selectedMission
            ? {
                label: isAr
                  ? 'غلق الحضور ونقل الأجور'
                  : isEn
                  ? 'Lock Roll Call & Send Payroll'
                  : 'Clôturer & Transmettre Paie DG',
                icon: <Lock size={16} />,
                onClick: handleCloseShift,
                dataAction: 'close-rollcall',
              }
            : {
                label: isAr ? 'التنقيط المباشر' : isEn ? 'Live Roll Call' : 'Pointage Live',
                icon: <Clock size={16} />,
                onClick: () => setActiveTab('attendance'),
                dataAction: 'open-rollcall',
              }
        }
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'الإشراف العملياتي والانتشار الميداني'
            : isEn
            ? 'Field Operations & Workforce Deployment'
            : 'Supervision Opérationnelle & Déploiement Terrains'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'المنشطون النشطون المجندون'
            : isEn
            ? 'Active Mobilized Talents'
            : 'Talents Actifs Mobilisés',
          count: pmTalents.filter((tal) => tal.status === 'active').length,
          badgeText: `${pmTalents.length} ${isAr ? 'ملف مؤهل' : isEn ? 'qualified' : 'profils qualifiés'}`,
          tone: 'emerald',
          isActive: activeTab === 'staffing',
          onToggle: () => setActiveTab('staffing'),
        }}
        secondaryCard={{
          label: isAr
            ? 'المهام الميدانية المنشورة'
            : isEn
            ? 'Deployed Missions'
            : 'Missions Déployées',
          count: pmMissions.length,
          badgeText: `${new Set(pmMissions.map((m) => m.wilayaCode)).size} ${
            isAr ? 'ولايات' : 'wilayas'
          }`,
          tone: 'terracotta',
          isActive: activeTab === 'missions',
          onToggle: () => setActiveTab('missions'),
        }}
        darkCard={{
          label: isAr
            ? 'معدل الالتزام بإغلاق الحضور'
            : isEn
            ? 'SLA Closure Compliance'
            : 'SLA Conformité Clôture',
          valueCount: 98.6,
          formatValue: (v) => `${v.toFixed(1)}%`,
          badgeCount: 58,
          badgePrefix: '',
          badgeSuffix: ' WILAYAS LIVE',
          caption: isAr
            ? 'توقيعات حضور محددة جغرافياً ومؤكدة'
            : isEn
            ? 'Geolocated attendance roll-calls closed'
            : 'Émargements géolocalisés clôturés',
        }}
      />

      <ScreenPod>
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-[13.5px] font-semibold text-black dark:text-white">
              {isAr
                ? 'مركز العمليات الميدانية والتنقيط الحي'
                : isEn
                ? 'Live Field Operations Console'
                : 'Console Terrain & Pointage Équipes'}
            </h2>
            <LiveSegmentedControl
              size="sm"
              value={activeTab}
              onValueChange={(val) => setActiveTab(val)}
              options={[
                {
                  value: 'missions',
                  label: isAr ? 'المهام' : isEn ? 'Missions' : 'Missions Terrain',
                  count: pmMissions.length,
                },
                {
                  value: 'attendance',
                  label: isAr ? 'التنقيط والأجور' : isEn ? 'Roll Call' : 'Pointage & Paie',
                  count: missionAttendances.length,
                },
                {
                  value: 'staffing',
                  label: isAr ? 'المنشطون' : isEn ? 'Staffing' : 'Équipes',
                  count: pmTalents.length,
                },
                {
                  value: 'expense',
                  label: isAr ? 'نفقات طارئة' : isEn ? 'Expenses' : 'Déclaration Frais',
                },
              ]}
              aria-label="Project Superviseur Sub-Tabs"
            />
          </div>

          {activeTab === 'missions' && (
            <div className="space-y-4">
              <ScreenCollectionToolbar
                title={isAr ? 'جدول المهام الميدانية' : isEn ? 'Field Missions Registry' : 'Registre des Missions Terrain'}
                liveRegionText={`${filteredMissions.length} ${isAr ? 'مهمة' : isEn ? 'missions' : 'missions'}`}
                language={language}
                searchQuery={missionSearch}
                onSearchChange={setMissionSearch}
                searchPlaceholder={
                  isAr ? 'بحث بالرمز أو الموقع أو الولاية...' : isEn ? 'Search code, venue or wilaya...' : 'Rechercher par code, lieu ou wilaya...'
                }
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: pmMissions.length },
                  { value: '16', label: isAr ? 'الجزائر' : isEn ? 'Algiers' : 'Alger' },
                  { value: '31', label: isAr ? 'وهران' : 'Oran' },
                  { value: '25', label: isAr ? 'قسنطينة' : 'Constantine' },
                  { value: '19', label: isAr ? 'سطيف' : 'Sétif' },
                ]}
                statusValue={wilayaFilter}
                onStatusChange={setWilayaFilter}
                hasActiveAdvancedFilters={wilayaFilter !== 'all'}
                activeFiltersCount={wilayaFilter !== 'all' ? 1 : 0}
                isFilterModalOpen={isMissionsFilterOpen}
                filterButtonRef={missionsFilterRef}
                onToggleFilterModal={() => setIsMissionsFilterOpen((p) => !p)}
                viewMode={missionsViewMode}
                onViewModeChange={setMissionsViewMode}
                onExport={handleExportMissionsCsv}
                activeChips={
                  wilayaFilter !== 'all'
                    ? [{ key: 'wilaya', label: `Wilaya ${wilayaFilter}`, onRemove: () => setWilayaFilter('all') }]
                    : []
                }
                onResetAllFilters={() => {
                  setMissionSearch('');
                  setWilayaFilter('all');
                }}
              />

              <UniversalDataCollection<PMMission>
                hideToolbar
                items={filteredMissions}
                keyExtractor={(m) => m.id}
                viewMode={missionsViewMode === 'grid' ? 'grid' : 'list'}
                defaultViewMode={missionsViewMode}
                columns={missionColumns}
                selectedIds={selectedMissionIds}
                onSelectionChange={setSelectedMissionIds}
                isPinned={(m) => pinnedMissionIds.has(m.id)}
                onTogglePin={handleTogglePinMission}
                onBulkDelete={(ids) => {
                  batchDeletePmMissions(Array.from(ids));
                  setSelectedMissionIds(new Set<string>());
                }}
                openItemId={activeMission?.id || null}
                onItemClick={(m, el) => {
                  if (el) setMissionOpenerEl(el);
                  setInspectedMission(m);
                }}
                onViewDetails={(m, el) => {
                  if (el) setMissionOpenerEl(el);
                  setInspectedMission(m);
                }}
                getRowMeta={getMissionRowMeta}
                getFanActions={(m): KineticRowFanAction[] => [
                  {
                    id: 'rollcall',
                    label: isAr ? 'تنقيط' : isEn ? 'Roll Call' : 'Pointer',
                    icon: <Clock size={14} />,
                    onClick: () => {
                      setSelectedMissionId(m.id);
                      setActiveTab('attendance');
                    },
                  },
                ]}
                getDetailActions={(m): KineticDetailAction[] => [
                  {
                    id: 'rollcall',
                    label: isAr ? 'فتح ورقة التنقيط' : isEn ? 'Open Roll Call' : 'Pointer Équipe',
                    icon: <Clock size={14} />,
                    onClick: () => {
                      setSelectedMissionId(m.id);
                      setActiveTab('attendance');
                    },
                  },
                ]}
                renderCard={(mission) => (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-[#d4522f]">
                        <span>{mission.code}</span>
                        <span className="text-black/55 dark:text-white/55 font-normal">
                          {mission.activationType}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">
                        {mission.title}
                      </h4>
                      <div className="text-xs text-black/55 dark:text-white/55 space-y-0.5">
                        <div className="font-semibold text-black/70 dark:text-white/75">
                          {mission.venueName}
                        </div>
                        <div>
                          {mission.address} ({mission.wilayaName})
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex justify-between items-center text-xs">
                      <span className="font-mono text-black/55 dark:text-white/55">
                        {mission.startDate}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMissionId(mission.id);
                          setActiveTab('attendance');
                        }}
                        className="text-[#d4522f] font-semibold hover:underline cursor-pointer"
                      >
                        {isAr ? 'تنقيط ➔' : isEn ? 'Roll Call ➔' : 'Pointer ➔'}
                      </button>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider">
                      {isAr
                        ? 'ورقة الحضور والتنقيط الحي'
                        : isEn
                        ? 'Live Roll Call & Payroll Sheet'
                        : 'Feuille de Présence & Pointage'}
                    </span>
                    {isMissionLocked && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {isAr ? 'مغلق' : isEn ? 'Locked' : 'Verrouillé'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedMission?.id || ''}
                      onChange={(e) => setSelectedMissionId(e.target.value)}
                      aria-label={isAr ? 'اختيار المهمة' : 'Sélectionner la mission'}
                      className="h-9 px-3 rounded-xl border border-[#E6DED6] dark:border-neutral-700 bg-[#FBF8F5] dark:bg-neutral-800 text-xs font-bold text-black dark:text-white cursor-pointer"
                    >
                      {pmMissions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} · {m.title} ({m.wilayaName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-black/55 dark:text-white/55">
                    {selectedMission?.venueName} · {selectedMission?.startDate} (
                    {selectedMission?.dailyStartHour} - {selectedMission?.dailyEndHour})
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-3 text-xs font-bold font-mono px-4 py-2 bg-[#FBF8F5] dark:bg-neutral-800 rounded-xl">
                    <span className="text-emerald-600">
                      {presentCount} {isAr ? 'حاضر' : isEn ? 'Present' : 'Présents'}
                    </span>
                    <span>·</span>
                    <span className="text-amber-500">
                      {lateCount} {isAr ? 'تأخر' : isEn ? 'Late' : 'Retards'}
                    </span>
                    <span>·</span>
                    <span className="text-red-500">
                      {absentCount} {isAr ? 'غائب' : isEn ? 'Absent' : 'Absents'}
                    </span>
                  </div>
                  {!isMissionLocked && selectedMission && (
                    <button
                      type="button"
                      onClick={handleCloseShift}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {isAr
                        ? 'غلق وإحالة للأجور'
                        : isEn
                        ? 'Lock & Send Payroll'
                        : 'Clôturer & Transmettre Paie DG'}
                    </button>
                  )}
                </div>
              </div>

              <ScreenCollectionToolbar
                title={isAr ? 'قائمة التنقيط الميداني' : isEn ? 'Shift Attendance' : 'Émargements Animateurs'}
                liveRegionText={`${filteredAttendances.length} ${isAr ? 'منشط' : 'animateurs'}`}
                language={language}
                searchQuery={attendanceSearch}
                onSearchChange={setAttendanceSearch}
                searchPlaceholder={isAr ? 'بحث باسم المنشط...' : 'Filtrer par nom...'}
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : 'Tous', count: missionAttendances.length },
                  { value: 'present', label: isAr ? 'حاضر' : 'Présent', count: presentCount },
                  { value: 'late', label: isAr ? 'متأخر' : 'Retard', count: lateCount },
                  { value: 'absent', label: isAr ? 'غائب' : 'Absent', count: absentCount },
                ]}
                statusValue={attendanceStatusFilter}
                onStatusChange={setAttendanceStatusFilter}
                hasActiveAdvancedFilters={attendanceStatusFilter !== 'all'}
                activeFiltersCount={attendanceStatusFilter !== 'all' ? 1 : 0}
                isFilterModalOpen={isAttendanceFilterOpen}
                filterButtonRef={attendanceFilterRef}
                onToggleFilterModal={() => setIsAttendanceFilterOpen((p) => !p)}
                viewMode={attendanceViewMode}
                onViewModeChange={setAttendanceViewMode}
                onResetAllFilters={() => {
                  setAttendanceSearch('');
                  setAttendanceStatusFilter('all');
                }}
              />

              <UniversalDataCollection<PMAttendance>
                hideToolbar
                items={filteredAttendances}
                keyExtractor={(a) => a.id}
                viewMode={attendanceViewMode === 'grid' ? 'grid' : 'list'}
                defaultViewMode={attendanceViewMode}
                columns={attendanceColumns}
                selectedIds={selectedAttendanceIds}
                onSelectionChange={setSelectedAttendanceIds}
                bulkSecondaryAction={
                  !isMissionLocked
                    ? {
                        label: isAr ? 'تحديد الكل حاضر' : 'Marquer Présents',
                        icon: <CheckCircle size={14} />,
                        onClick: () => {
                          batchUpdatePmAttendanceStatus(
                            Array.from(selectedAttendanceIds),
                            'present'
                          );
                          setSelectedAttendanceIds(new Set<string>());
                        },
                      }
                    : undefined
                }
                openItemId={activeAttendance?.id || null}
                onItemClick={(att, el) => {
                  if (el) setAttendanceOpenerEl(el);
                  setInspectedAttendance(att);
                }}
                onViewDetails={(att, el) => {
                  if (el) setAttendanceOpenerEl(el);
                  setInspectedAttendance(att);
                }}
                getRowMeta={getAttendanceRowMeta}
                getFanActions={(att): KineticRowFanAction[] =>
                  isMissionLocked
                    ? []
                    : [
                        {
                          id: 'present',
                          label: isAr ? 'حاضر' : 'Présent',
                          icon: <CheckCircle size={14} />,
                          onClick: () => updatePmAttendanceStatus(att.id, 'present'),
                        },
                        {
                          id: 'late',
                          label: isAr ? 'تأخر' : 'Retard',
                          icon: <AlertTriangle size={14} />,
                          onClick: () => updatePmAttendanceStatus(att.id, 'late', 15),
                        },
                        {
                          id: 'absent',
                          label: isAr ? 'غائب' : 'Absent',
                          icon: <XCircle size={14} />,
                          isDanger: true,
                          onClick: () => updatePmAttendanceStatus(att.id, 'absent'),
                        },
                      ]
                }
                renderCard={(att) => (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-[#d4522f] shrink-0">
                        {att.talentName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">
                          {att.talentName}
                        </h4>
                        <p className="text-xs text-black/55 dark:text-white/55 font-mono">
                          Arrivée : {att.checkInTime || 'Non pointé'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-black dark:text-white tabular-nums">
                        {formatMoney(att.grossPayableDzd, 'DZD')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          getAttendanceBadge(att.status, language).pillClass
                        }`}
                      >
                        {getAttendanceBadge(att.status, language).label}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeTab === 'staffing' && (
            <div className="space-y-4">
              <ScreenCollectionToolbar
                title={isAr ? 'دليل المنشطين (58 ولاية)' : isEn ? 'Field Promoters (58 Wilayas)' : 'Répertoire des Animateurs (58 Wilayas)'}
                liveRegionText={`${filteredTalents.length} ${isAr ? 'منشط' : 'profils'}`}
                language={language}
                searchQuery={talentSearch}
                onSearchChange={setTalentSearch}
                searchPlaceholder={
                  isAr ? 'بحث بالاسم أو الولاية...' : 'Rechercher nom, wilaya, commune...'
                }
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : 'Tous', count: pmTalents.length },
                  {
                    value: 'vehicle',
                    label: isAr ? 'سيارة خاصة' : isEn ? 'Vehicle' : 'Véhiculés',
                    count: pmTalents.filter((t) => t.isVehicleOwner).length,
                  },
                ]}
                statusValue={requireVehicle ? 'vehicle' : 'all'}
                onStatusChange={(val) => setRequireVehicle(val === 'vehicle')}
                viewMode={staffingViewMode}
                onViewModeChange={setStaffingViewMode}
              />

              <UniversalDataCollection<PMTalent>
                hideToolbar
                items={filteredTalents}
                keyExtractor={(tal) => tal.id}
                viewMode={staffingViewMode === 'list' ? 'list' : 'grid'}
                defaultViewMode={staffingViewMode}
                columns={talentColumns}
                openItemId={inspectedTalent?.id || null}
                onItemClick={(tal, el) => {
                  if (el) setTalentOpenerEl(el);
                  setInspectedTalent(tal);
                }}
                getRowMeta={getTalentRowMeta}
                renderCard={(talent) => (
                  <div className="p-4 flex items-center gap-3">
                    {talent.portraitPhotoUrl ? (
                      <img
                        src={talent.portraitPhotoUrl}
                        alt={talent.fullName}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border border-[#d4522f] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-[#d4522f] shrink-0">
                        {talent.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-black dark:text-white truncate">
                        {talent.fullName}
                      </div>
                      <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                        {talent.wilayaName} · {talent.commune}
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-amber-500 font-bold mt-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{talent.consolidatedScore.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeTab === 'expense' && (
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-2xs max-w-xl mx-auto space-y-4">
              <div>
                <span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">
                  {isAr ? 'مصاريف الميدان الطارئة' : isEn ? 'Emergency Field Expense' : "Dépense d'Urgence Terrain"}
                </span>
                <h3 className="text-lg font-bold text-black dark:text-white mt-0.5">
                  {isAr ? 'مصاريف التسيير والمستهلكات' : isEn ? 'Site Petty Cash & Consumables' : 'Frais de Régie & Consommables'}
                </h3>
              </div>
              {expenseSubmitted && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                  {isAr
                    ? 'تم إرسال النفقة إلى الإدارة للمصادقة!'
                    : 'Dépense transmise à la Direction pour arbitrage !'}
                </div>
              )}
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <LabelInput
                  field="ExpTitle"
                  label={isAr ? 'سبب النفقة' : isEn ? 'Expense Reason' : 'Motif du Frais'}
                  value={expenseTitle}
                  onChange={setExpenseTitle}
                  required
                  height={44}
                  corner={12}
                />
                <LabelInput
                  field="ExpAmount"
                  label={isAr ? 'المبلغ (دج)' : isEn ? 'Amount (DZD)' : 'Montant (DZD)'}
                  type="number"
                  value={expenseAmount}
                  onChange={setExpenseAmount}
                  required
                  height={44}
                  corner={12}
                />
                <FilterSelect
                  label={isAr ? 'فئة المصاريف' : isEn ? 'Category' : 'Catégorie de Frais'}
                  value={expenseCategory}
                  onChange={(val) =>
                    setExpenseCategory(typeof val === 'string' ? val : val.target?.value || String(val))
                  }
                  options={[
                    {
                      value: 'materials',
                      label: isAr ? 'مستلزمات' : isEn ? 'Supplies' : 'Fournitures',
                      tooltip: 'Fournitures stand / adhésif / scotch',
                    },
                    {
                      value: 'catering',
                      label: isAr ? 'إطعام' : isEn ? 'Refreshments' : 'Pauses',
                      tooltip: 'Eau minérale & pauses animateurs',
                    },
                    {
                      value: 'transport',
                      label: isAr ? 'نقل' : isEn ? 'Transit' : 'Transport',
                      tooltip: 'Stationnement & péage autoroute',
                    },
                  ]}
                />
                <AtriumButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  icon={<Plus className="w-4 h-4" />}
                >
                  {isAr
                    ? 'إرسال الوصل للإدارة'
                    : isEn
                    ? 'Submit Receipt to Direction'
                    : 'Soumettre le Reçu à la Direction'}
                </AtriumButton>
              </form>
            </div>
          )}
        </div>
      </ScreenPod>

      {/* Filter Modals */}
      <KineticFilterModal
        isOpen={isMissionsFilterOpen}
        onClose={() => setIsMissionsFilterOpen(false)}
        triggerRef={missionsFilterRef}
        language={language}
        displayCount={filteredMissions.length}
        entityPluralLabel={isAr ? 'مهام' : 'missions'}
        hasActiveFilters={wilayaFilter !== 'all'}
        onResetFilters={() => {
          setMissionSearch('');
          setWilayaFilter('all');
        }}
        sections={[
          {
            id: 'wilaya',
            kind: 'segmented',
            label: isAr ? 'الولاية' : 'Wilaya',
            value: wilayaFilter,
            onChange: setWilayaFilter,
            options: [
              { value: 'all', label: isAr ? 'الكل' : 'Toutes', count: pmMissions.length },
              { value: '16', label: '16 - Alger' },
              { value: '31', label: '31 - Oran' },
              { value: '25', label: '25 - Constantine' },
              { value: '19', label: '19 - Sétif' },
            ],
          },
        ]}
      />

      <KineticFilterModal
        isOpen={isAttendanceFilterOpen}
        onClose={() => setIsAttendanceFilterOpen(false)}
        triggerRef={attendanceFilterRef}
        language={language}
        displayCount={filteredAttendances.length}
        entityPluralLabel={isAr ? 'منشطين' : 'animateurs'}
        hasActiveFilters={attendanceStatusFilter !== 'all'}
        onResetFilters={() => {
          setAttendanceSearch('');
          setAttendanceStatusFilter('all');
        }}
        sections={[
          {
            id: 'attStatus',
            kind: 'segmented',
            label: isAr ? 'حالة الحضور' : 'Statut Pointage',
            value: attendanceStatusFilter,
            onChange: setAttendanceStatusFilter,
            options: [
              { value: 'all', label: isAr ? 'الكل' : 'Tous', count: missionAttendances.length },
              { value: 'present', label: 'Présent', count: presentCount },
              { value: 'late', label: 'Retard', count: lateCount },
              { value: 'absent', label: 'Absent', count: absentCount },
            ],
          },
        ]}
      />

      {/* Inspectors */}
      <KineticSlideOverInspector<PMMission>
        isOpen={Boolean(activeMission)}
        item={activeMission}
        allItems={filteredMissions}
        keyExtractor={(m) => m.id}
        openerElement={missionOpenerEl}
        language={language}
        title={activeMission?.code || ''}
        subtitle={activeMission?.title}
        categoryLabel={activeMission ? `${activeMission.venueName} (${activeMission.wilayaName})` : undefined}
        avatarText={activeMission?.wilayaCode || 'DZ'}
        statusLabel={activeMission ? getMissionStatusBadge(activeMission.status, language).label : undefined}
        statusClassName={activeMission ? getMissionStatusBadge(activeMission.status, language).pillClass : undefined}
        onClose={() => setInspectedMission(null)}
        onSelectItem={(m) => setInspectedMission(m)}
        onDelete={(m) => {
          batchDeletePmMissions([m.id]);
          setInspectedMission(null);
        }}
        holdToDelete
        renderBody={(m) => {
          const attList = pmAttendances.filter((a) => a.missionId === m.id);
          return (
            <>
              <InspectorSection index={0} title={isAr ? 'معلومات المهمة' : 'Détails Déploiement'}>
                <InspectorCard>
                  <InspectorKeyValue label="Campagne" value={m.projectTitle} mono={false} />
                  <InspectorKeyValue label="Lieu" value={`${m.venueName}, ${m.wilayaName}`} mono={false} />
                  <InspectorKeyValue label="Adresse" value={m.address} mono={false} />
                  <InspectorKeyValue label="Horaires" value={`${m.startDate} · ${m.dailyStartHour}-${m.dailyEndHour}`} />
                  <InspectorKeyValue label="Superviseur" value={m.supervisorName} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'الفريق المعين' : `Équipe Pointée (${attList.length})`}>
                <InspectorCard>
                  {attList.length === 0 ? (
                    <InspectorListItem title="Aucun animateur affecté" badge={{ label: 'Vide', tone: 'neutral' }} isLast />
                  ) : (
                    attList.map((a, idx) => (
                      <InspectorListItem
                        key={a.id}
                        title={a.talentName}
                        subtitle={a.checkInTime || 'Non pointé'}
                        badge={{
                          label: a.status,
                          tone: a.status === 'present' ? 'ok' : a.status === 'late' ? 'warn' : 'danger',
                        }}
                        isLast={idx === attList.length - 1}
                      />
                    ))
                  )}
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2}>
                <InspectorWideButton
                  label={isAr ? 'فتح ورقة التنقيط المباشر' : 'Ouvrir Feuille de Pointage Live ➔'}
                  onClick={() => {
                    setSelectedMissionId(m.id);
                    setActiveTab('attendance');
                    setInspectedMission(null);
                  }}
                />
              </InspectorSection>
            </>
          );
        }}
      />

      <KineticSlideOverInspector<PMAttendance>
        isOpen={Boolean(activeAttendance)}
        item={activeAttendance}
        allItems={filteredAttendances}
        keyExtractor={(a) => a.id}
        openerElement={attendanceOpenerEl}
        language={language}
        title={activeAttendance?.talentName || ''}
        subtitle={activeAttendance ? `Arrivée : ${activeAttendance.checkInTime || 'Non pointé'}` : undefined}
        categoryLabel={activeAttendance ? `Note : ${activeAttendance.shiftRating}/5 ★` : undefined}
        avatarText={(activeAttendance?.talentName || 'AT').slice(0, 2).toUpperCase()}
        statusLabel={activeAttendance ? getAttendanceBadge(activeAttendance.status, language).label : undefined}
        statusClassName={activeAttendance ? getAttendanceBadge(activeAttendance.status, language).pillClass : undefined}
        onClose={() => setInspectedAttendance(null)}
        onSelectItem={(a) => setInspectedAttendance(a)}
        renderBody={(att) => (
          <>
            {!att.isLocked && (
              <InspectorSection index={0} title={isAr ? 'تحديث الحالة' : 'Actions Pointage'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'present',
                      label: 'Présent',
                      icon: <CheckCircle className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => updatePmAttendanceStatus(att.id, 'present'),
                    },
                    {
                      id: 'late',
                      label: 'Retard +15m',
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      onClick: () => updatePmAttendanceStatus(att.id, 'late', 15),
                    },
                    {
                      id: 'absent',
                      label: 'Absent',
                      icon: <XCircle className="w-[18px] h-[18px]" />,
                      onClick: () => updatePmAttendanceStatus(att.id, 'absent'),
                    },
                  ]}
                />
              </InspectorSection>
            )}
            <InspectorSection index={1}>
              <InspectorBigStat
                value={formatMoney(att.grossPayableDzd, 'DZD')}
                tone="accent"
                caption={`Forfait jour : ${formatMoney(att.dayRateDzd, 'DZD')} · Date : ${att.date}`}
              />
            </InspectorSection>
            <InspectorSection index={2} title={isAr ? 'تفاصيل المناوبة' : 'Détails Vacation'}>
              <InspectorCard>
                <InspectorKeyValue label="Heure d'arrivée" value={att.checkInTime || 'Non pointé'} />
                <InspectorKeyValue label="Évaluation" value={`${att.shiftRating} / 5 ★`} />
                <InspectorKeyValue label="Notes superviseur" value={att.supervisorNotes || 'R.A.S'} mono={false} isLast />
              </InspectorCard>
            </InspectorSection>
          </>
        )}
      />

      <KineticSlideOverInspector<PMTalent>
        isOpen={Boolean(inspectedTalent)}
        item={inspectedTalent}
        allItems={filteredTalents}
        keyExtractor={(tal) => tal.id}
        openerElement={talentOpenerEl}
        language={language}
        title={inspectedTalent?.fullName || ''}
        subtitle={inspectedTalent ? `${inspectedTalent.wilayaName} · ${inspectedTalent.commune}` : undefined}
        categoryLabel={inspectedTalent?.desiredRoles[0]}
        avatarText={(inspectedTalent?.fullName || 'TL').slice(0, 2).toUpperCase()}
        onClose={() => setInspectedTalent(null)}
        onSelectItem={(tal) => setInspectedTalent(tal)}
        renderBody={(tal) => (
          <>
            <InspectorSection index={0}>
              <InspectorBigStat
                value={`${tal.consolidatedScore.toFixed(1)} / 5 ★`}
                tone="accent"
                caption={`${tal.completedMissionsCount} missions accomplies · ${tal.absencesCount} absence(s)`}
              />
            </InspectorSection>
            <InspectorSection index={1} title={isAr ? 'ملف المنشط' : 'Profil Animateur'}>
              <InspectorCard>
                <InspectorKeyValue label="Téléphone" value={tal.phone} />
                <InspectorKeyValue label="Wilaya" value={`${tal.wilayaCode} - ${tal.wilayaName}`} mono={false} />
                <InspectorKeyValue label="Permis / Véhicule" value={tal.isVehicleOwner ? 'Véhiculé' : tal.hasDriverLicense ? 'Permis B' : 'Non'} mono={false} />
                <InspectorKeyValue label="Rôles" value={tal.desiredRoles.join(', ')} mono={false} isLast />
              </InspectorCard>
            </InspectorSection>
          </>
        )}
      />

      {showPhoneSimulator && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPhoneSimulator(false)}
              className="absolute -top-10 right-0 text-white font-bold text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isAr ? 'إغلاق المحاكي' : 'Fermer le Simulateur'}</span>
            </button>
            <MobilePhoneSimulator title="Superviseur Terrain" subtitle="PWA Pointage & Émargement">
              <div className="p-4 space-y-4">
                <div className="p-3 bg-[#FBF8F5] dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700">
                  <div className="text-xs font-bold text-[#d4522f]">
                    {selectedMission?.code || 'MIS-104'}
                  </div>
                  <div className="text-sm font-bold text-black dark:text-white">
                    {selectedMission?.title || 'Activation Terrain'}
                  </div>
                  <div className="text-[11px] text-black/55 dark:text-white/55">
                    {selectedMission?.venueName} ({selectedMission?.wilayaName})
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-black/70 dark:text-white/75">
                    Équipe Affectée ({missionAttendances.length} animateurs)
                  </div>
                  {missionAttendances.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700 flex items-center justify-between text-xs shadow-xs"
                    >
                      <div>
                        <div className="font-semibold text-black dark:text-white">
                          {att.talentName}
                        </div>
                        <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
                          {att.status.toUpperCase()} · {formatMoney(att.grossPayableDzd, 'DZD')}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          getAttendanceBadge(att.status, language).pillClass
                        }`}
                      >
                        {getAttendanceBadge(att.status, language).label}
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
