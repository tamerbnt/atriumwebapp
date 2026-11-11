import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Home,
  ChevronDown,
  Building2,
  Check,
  Clock,
  DollarSign,
  History,
  QrCode,
  List,
  LayoutGrid,
} from 'lucide-react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { QuickPointageModal } from '../../common/staff/QuickPointageModal';
import { StaffModal } from '../../modals/StaffModal';
import { StaffInspectorDrawer } from '../../common/StaffInspectorDrawer';
import { StaffMember, StaffLifecycleStatus } from '../../../types/index';
import { StaffAttendanceSubView } from '../../common/staff/StaffAttendanceSubView';
import { StaffPayrollSubView } from '../../common/staff/StaffPayrollSubView';
import { StaffHistorySubView } from '../../common/staff/StaffHistorySubView';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiquidButton } from '@/atrium';
import { Seek } from '../../ui/Seek';
import { useAtriumStore } from '../../../services/store';
import { t } from '../../../utils/i18n';

export const MembershipStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'membership_session' });
  const { isAr, isEn, language } = foundation;

  const {
    businesses,
    branches,
    currentBusinessId,
    currentBranch,
    switchBusiness,
    switchBranch,
    terminology,
    showToast,
  } = useAtriumStore();

  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Quick Status Filter Options (Matching MembershipMembersView 40px pattern)
  const quickStatusOptions = useMemo(() => [
    { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
    { value: 'active', label: isAr ? 'في الخدمة' : isEn ? 'Active' : 'En Poste' },
    { value: 'on_leave', label: isAr ? 'عطلة' : isEn ? 'On Leave' : 'En Congé' },
    { value: 'frozen', label: isAr ? 'موقوف' : isEn ? 'Suspended' : 'Suspendu' },
  ], [isAr, isEn]);

  // CSV Export for Staff Members (Identical to MembershipMembersView)
  const handleExportCSV = () => {
    try {
      const staffRows = foundation.filteredStaff;
      if (staffRows.length === 0) {
        showToast(isAr ? 'لا يوجد مدربون للتصدير' : 'Aucun collaborateur à exporter', 'info');
        return;
      }
      const headers = ['Nom & Prénom', 'Rôle / Spécialité', 'Statut', 'Téléphone', 'Contrat', 'Salaire de Base (DZD)', 'Badge RFID'];
      const rows = staffRows.map((s) => [
        `"${s.fullName.replace(/"/g, '""')}"`,
        `"${(s.role || '').replace(/"/g, '""')}"`,
        `"${s.status}"`,
        `"${s.phoneNumber || ''}"`,
        `"${s.contractType || 'CDI'}"`,
        `"${s.salary || 0}"`,
        `"${s.badgeToken || s.cardId || ''}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `staff_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(isAr ? 'تم تصدير ملف الموظفين بنجاح' : 'Exportation des collaborateurs réussie', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de l\'exportation CSV', 'error');
    }
  };

  // Universal Data Collection Columns for Staff Directory
  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'المدرب / الموظف' : isEn ? 'Coach / Staff' : 'Coach & Collaborateur',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#d4522f]/15 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-neutral-900 dark:text-white text-xs truncate">
              {member.fullName}
            </div>
            <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1.5">
              <span>{member.role}</span>
              {member.chairOrStudio && (
                <>
                  <span>·</span>
                  <span className="text-[#d4522f] font-medium">{member.chairOrStudio}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة العمل' : isEn ? 'Duty Status' : 'Statut Présence',
      accessorKey: 'status',
      cell: (member) => {
        const isPresent =
          member.isClockedInToday ||
          member.attendanceLogs?.some(
            (l) => (l.timestamp || '').slice(0, 10) === new Date().toISOString().slice(0, 10) && l.type === 'in'
          );
        return (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                member.status === 'active'
                  ? isPresent
                    ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950'
                    : 'bg-emerald-500'
                  : member.status === 'on_leave'
                  ? 'bg-amber-500'
                  : member.status === 'frozen'
                  ? 'bg-rose-500'
                  : 'bg-neutral-400'
              }`}
            />
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              {member.status === 'active'
                ? isPresent
                  ? isAr
                    ? 'متواجد بالصالة'
                    : isEn
                    ? 'In Gym (Shift On)'
                    : 'Présent en Salle'
                  : isAr
                  ? 'نشط'
                  : isEn
                  ? 'Active'
                  : 'En Poste'
                : member.status === 'on_leave'
                ? isAr
                  ? 'عطلة'
                  : isEn
                  ? 'On Leave'
                  : 'En Congé'
                : member.status === 'frozen'
                ? isAr
                  ? 'موقوف'
                  : isEn
                  ? 'Suspended'
                  : 'Suspendu'
                : isAr
                ? 'منتهي'
                : isEn
                ? 'Terminated'
                : 'Fin de Contrat'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'badgeToken',
      header: isAr ? 'رمز البادج RFID' : isEn ? 'RFID Badge' : 'Badge Tourniquet RFID',
      accessorKey: 'badgeToken',
      cell: (member) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">
          {member.badgeToken || member.cardId || '—'}
        </span>
      ),
    },
    {
      id: 'phoneNumber',
      header: isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      accessorKey: 'phoneNumber',
      cell: (member) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300 tabular-nums font-mono">
          {member.phoneNumber || '—'}
        </span>
      ),
    },
    {
      id: 'contractType',
      header: isAr ? 'نوع العقد' : isEn ? 'Contract' : 'Contrat',
      accessorKey: 'contractType',
      cell: (member) => (
        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
          {member.contractType || 'CDI'}
        </span>
      ),
    },
    {
      id: 'salary',
      header: isAr ? 'الراتب القاعدي' : isEn ? 'Base Salary' : 'Salaire de Base',
      accessorKey: 'salary',
      cell: (member) => (
        <span className="text-xs font-bold font-mono text-[#d4522f]">
          {member.salary ? `${member.salary.toLocaleString()} DZD` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* ROW 0: TOP HEADER (EXACT MEMBERSHIPMEMBERSVIEW LAYOUT) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {isAr ? 'فريق العمل والمدربون' : isEn ? 'Staff & Workforce' : 'Staff & Équipe'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Selector: 40px Standard Squircle matching Screenshot 881 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-[6px] bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={16} className="text-[#d4522f]" />
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
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('fast_switch_title', language)}
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
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#d4522f]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Action Button: in the SAME row with the header */}
          <AtriumButton
            variant="primary"
            size="md"
            onClick={foundation.handleOpenCreate}
            icon={<Plus size={16} strokeWidth={2.2} />}
            className="px-4 font-semibold shadow-xs"
          >
            <span className="text-xs sm:text-sm font-semibold">
              {isAr ? 'إضافة مدرب / موظف' : isEn ? 'Add Coach / Staff' : 'Nouveau Collaborateur'}
            </span>
          </AtriumButton>
        </div>
      </div>

      {/* ROW 1: "WORKFORCE HEALTH" BANNER CARD (EXACT 3-CARD, 124px GRID MATCHING MEMBER SCREEN) */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {isAr
              ? 'فريق العمل ومؤشرات الحضور'
              : isEn
              ? 'Workforce & Operational Health'
              : 'Effectif & Santé Opérationnelle'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Active Staff Base — Pure White Card (Exact 124px Height) */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {isAr ? 'قاعدة الفريق النشطة' : isEn ? 'Active Staff Base' : 'Base active collaborateurs'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ {foundation.facilityStaff.length > 0 ? Math.round((foundation.activeCount / foundation.facilityStaff.length) * 100) : 0}% {isAr ? 'نشط' : 'Actifs'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {foundation.activeCount}
            </div>
          </div>

          {/* Tile 2: Pointage du Jour & Retards — Pure White Card (Exact 124px Height) */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {isAr ? 'حضور وتأخيرات اليوم' : isEn ? 'Today\'s Pointage & Lates' : 'Pointage & Retards du Jour'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-full">
                  {foundation.todayPresentCount} {isAr ? 'حاضرون' : 'présents'} · {foundation.presentPercentage}%
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
              {foundation.presentPercentage}%
            </div>
          </div>

          {/* Tile 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) — Monthly Payroll Budget (Exact 124px Height) */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'الكتلة الأجرية الشهرية' : isEn ? 'Monthly Payroll Budget' : 'Masse Salariale Mensuelle'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                +{foundation.facilityStaff.length} {isAr ? 'عضو' : 'staff'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {foundation.totalMonthlyPayroll.toLocaleString()} DZD
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>
                  {isAr ? 'قوانين العمل الجزائرية، IRG 2022 و CNAS' : 'Calcul statutory CNAS 9%/26% & Barème IRG 2022'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: BRANDED ATRIUM LIQUID TAB SWITCHER (40px Standard Squircle) */}
      <div className="flex items-center">
        <LiveSegmentedControl
          value={foundation.activeSubTab}
          onValueChange={(val) => foundation.setActiveSubTab(val as any)}
          size="md"
          options={[
            {
              value: 'directory',
              label: isAr ? 'دليل الفريق' : isEn ? 'Staff Directory' : 'Annuaire & RH',
              icon: <Users size={16} className="mr-1.5" />,
              count: foundation.facilityStaff.length,
            },
            {
              value: 'attendance',
              label: isAr ? 'الحضور والتوقيع' : isEn ? 'Attendance & Clock-in' : 'Pointage & Présence',
              icon: <Clock size={16} className="mr-1.5" />,
              count: foundation.todayPresentCount,
            },
            {
              value: 'payroll',
              label: isAr ? 'الرواتب والأجور' : isEn ? 'Payroll & Slips' : 'Salaires & Paie',
              icon: <DollarSign size={16} className="mr-1.5" />,
            },
            {
              value: 'history',
              label: isAr ? 'الأرشيف والسجلات' : isEn ? 'History & Audits' : 'Historique & Audit',
              icon: <History size={16} className="mr-1.5" />,
            },
          ]}
        />
      </div>

      {/* ROW 3: MASTER COLLECTION POD (EXACT MEMBERSHIPMEMBERSVIEW ROW 2 ARCHITECTURE) */}
      {/* SUB-TAB 1: DIRECTORY & 360° DOSSIER */}
      {foundation.activeSubTab === 'directory' && (
        <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
          {/* Unified Header & Tools Row: Title on Left, Search & Filters Middle, Export on Right */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Left: Section Title & Count Badge */}
            <div className="flex items-center gap-2.5 shrink-0">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                {isAr ? 'قائمة فريق العمل والمدربين' : isEn ? 'Staff & Coaches Directory' : 'Liste des collaborateurs'}
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/70 text-neutral-700 dark:text-neutral-300 shadow-2xs tabular-nums">
                {foundation.filteredStaff.length}
              </span>
            </div>

            {/* Middle: Search + Quick Status Tabs + Pointage Kiosk Scan Button (All 40px Squircles) */}
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              {/* Seek Kinetic Search Box (40px Standard Squircle) */}
              <Seek
                value={foundation.searchQuery}
                onChange={foundation.setSearchQuery}
                placeholder={isAr ? 'بحث بالاسم، الهاتف، البادج...' : isEn ? 'Search staff, phone, token...' : 'Rechercher collaborateur...'}
                shutSize={40}
                openWidth={240}
                className="shrink-0 !rounded-xl"
              />

              {/* Streamlined Quick Status Tabs (40px Standard Squircle) */}
              <div className="shrink-0">
                <LiveSegmentedControl
                  size="md"
                  value={foundation.statusFilter}
                  onValueChange={(val) => foundation.setStatusFilter(val as 'all' | StaffLifecycleStatus)}
                  options={quickStatusOptions}
                  aria-label="Staff Status Filter"
                />
              </div>

              {/* Quick Pointage Modal Trigger Button (40px Standard Squircle) */}
              <button
                type="button"
                onClick={() => foundation.setIsPointageScannerOpen(true)}
                className="h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all shadow-2xs bg-white dark:bg-neutral-800 border-[#E9EEF0] dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                title={isAr ? 'كشك البصمة / البادج السريع' : 'Ouvrir Kiosk Pointage RFID / PIN'}
              >
                <QrCode size={15} className="text-[#d4522f]" />
                <span>{isAr ? 'كشك الحضور' : 'Pointer Kiosk'}</span>
              </button>
            </div>

            {/* Right Utility Group: SINGLE View Switcher (List/Grid) + Branded Atrium Export Button (40px Squircle) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* View Switcher: List | Grid (40px standard squircle) */}
              <LiveSegmentedControl
                size="md"
                options={[
                  { value: 'list', icon: <List className="w-4 h-4" />, 'aria-label': 'List View' },
                  { value: 'grid', icon: <LayoutGrid className="w-4 h-4" />, 'aria-label': 'Grid View' },
                ]}
                value={foundation.viewMode}
                onValueChange={(val) => foundation.setViewMode(val as any)}
                aria-label="View Switcher"
              />

              {/* Official Branded Atrium Liquid Export Button (exact 40px height matching row) */}
              <LiquidButton
                kind="export"
                size={40}
                tone="accent"
                labels={{
                  idle: isAr ? 'تصدير' : isEn ? 'Export' : 'Exporter',
                  busy: isAr ? 'جاري التصدير' : isEn ? 'Exporting...' : 'Exportation...',
                  done: isAr ? 'تم التصدير' : isEn ? 'Exported' : 'Exporté',
                  error: isAr ? 'فشل' : isEn ? 'Failed' : 'Échec',
                }}
                onPress={async () => {
                  await new Promise((resolve) => setTimeout(resolve, 600));
                  handleExportCSV();
                }}
                title={isAr ? 'تصدير كملف CSV' : 'Exporter en CSV'}
                aria-label={isAr ? 'تصدير كملف CSV' : 'Exporter en CSV'}
                className="shrink-0 !h-10 !max-h-10 !rounded-xl"
                style={{ height: '40px', maxHeight: '40px', width: '148px' }}
              />
            </div>
          </div>

          {/* Collection Content (showViewToggle={false} completely eliminates the duplicate toggle!) */}
          <UniversalDataCollection
            data={foundation.filteredStaff}
            columns={columns}
            keyExtractor={(item) => item.id}
            viewMode={foundation.viewMode}
            showViewToggle={false}
            selectedIds={foundation.selectedStaffIds}
            onSelectionChange={foundation.setSelectedStaffIds}
            pinnedIds={foundation.pinnedStaffIds}
            onPinToggle={(id: any) => {
              const key = typeof id === 'string' ? id : id?.id;
              const next = new Set(foundation.pinnedStaffIds);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              foundation.setPinnedStaffIds(next);
            }}
            onItemClick={(item) => foundation.handleOpenDrawer(item)}
            onBulkDelete={foundation.handleBulkDelete}
            bulkCustomActions={[
              {
                id: 'punch_in',
                label: isAr ? 'تسجيل حضور' : isEn ? 'Punch In' : 'Pointer Présents',
                onClick: foundation.handleBulkPointage,
              },
              {
                id: 'on_leave',
                label: isAr ? 'تحويل لعطلة' : isEn ? 'Set On Leave' : 'Mettre en Congé',
                onClick: () => foundation.handleBulkStatusChange('on_leave'),
              },
              {
                id: 'frozen',
                label: isAr ? 'تجميد مؤقت' : isEn ? 'Suspend' : 'Suspendre',
                onClick: () => foundation.handleBulkStatusChange('frozen'),
              },
            ]}
          />
        </div>
      )}

      {/* SUB-TAB 2: ATTENDANCE & POINTAGE (WRAPPED IN #F3EDE7 POD CONTAINER) */}
      {foundation.activeSubTab === 'attendance' && (
        <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
          <StaffAttendanceSubView
            staffList={foundation.facilityStaff}
            attendanceLogs={foundation.staffAttendanceLogs}
            onOpenKiosk={() => foundation.setIsPointageScannerOpen(true)}
            onPunchStaff={foundation.handlePunchPointage}
            onManualLog={foundation.logStaffAttendanceManual}
            language={language}
          />
        </div>
      )}

      {/* SUB-TAB 3: SALAIRES & STATUTORY PAYROLL (WRAPPED IN #F3EDE7 POD CONTAINER) */}
      {foundation.activeSubTab === 'payroll' && (
        <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
          <StaffPayrollSubView
            staffList={foundation.facilityStaff}
            payrollRuns={foundation.staffPayrollRuns}
            payrollSlips={foundation.staffPayrollSlips}
            salaryAdvances={foundation.staffSalaryAdvances}
            onGeneratePayroll={(month, year) => foundation.generateStaffPayrollRun(month, year, 'membership_session')}
            onApprovePayroll={foundation.approveStaffPayrollRun}
            onMarkSlipPaid={foundation.markStaffPayrollSlipPaid}
            onCreateAdvance={foundation.createStaffSalaryAdvance}
            language={language}
          />
        </div>
      )}

      {/* SUB-TAB 4: HISTORIQUE DES SALAIRES & POINTAGES (WRAPPED IN #F3EDE7 POD CONTAINER) */}
      {foundation.activeSubTab === 'history' && (
        <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
          <StaffHistorySubView
            staffList={foundation.facilityStaff}
            payrollRuns={foundation.staffPayrollRuns}
            payrollSlips={foundation.staffPayrollSlips}
            attendanceLogs={foundation.staffAttendanceLogs}
            language={language}
          />
        </div>
      )}

      {/* Slide-over Inspector Drawer */}
      <StaffInspectorDrawer
        staff={foundation.drawerStaff}
        isOpen={foundation.isDrawerOpen}
        onClose={foundation.handleCloseDrawer}
        onEdit={(member) => {
          foundation.handleCloseDrawer();
          foundation.handleOpenEdit(member);
        }}
        currentCategory="membership_session"
      />

      {/* Create / Edit Staff Modal */}
      <StaffModal
        isOpen={foundation.isModalOpen}
        onClose={foundation.handleCloseModal}
        staffToEdit={foundation.staffToEdit}
        currentCategory="membership_session"
      />

      {/* Rapid Attendance Pointage Kiosk Modal */}
      <QuickPointageModal
        isOpen={foundation.isPointageScannerOpen}
        onClose={() => foundation.setIsPointageScannerOpen(false)}
        staffList={foundation.facilityStaff}
        onPunch={foundation.handlePunchPointage}
        language={language}
      />
    </div>
  );
};
