import React, { useState, useMemo } from 'react';
import {
  Edit,
  Lock,
  PauseCircle,
  Plane,
  AlertTriangle,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { StaffMember, BusinessCategory } from '../../types/index';
import {
  useAtriumSelector,
  shallowEqualObjects,
  useAtriumActions,
  showToast,
} from '../../services/store';
import {
  canViewSensitivePayroll,
  getCategoryPerformanceMetricLabel,
  getEffectiveUserRole,
  canCreateStaff,
} from '../../utils/staffRules';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  extractInitials,
  computeInitialsColor,
} from '../ui/kinetic';

interface StaffInspectorDrawerProps {
  staff: StaffMember | null;
  allStaff?: StaffMember[];
  openerElement?: HTMLElement | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectStaff?: (staff: StaffMember) => void;
  onEdit: (staff: StaffMember) => void;
  currentCategory: BusinessCategory | string;
}

export const StaffInspectorDrawer: React.FC<StaffInspectorDrawerProps> = React.memo(({
  staff,
  allStaff = [],
  openerElement,
  isOpen,
  onClose,
  onSelectStaff,
  onEdit,
  currentCategory,
}) => {
  const storeSlice = useAtriumSelector(
    (s) => ({
      branches: s.branches,
      currentBranchId: s.currentBranchId,
      currentUser: s.currentUser,
      language: s.language,
      activePmRole: s.activePmRole,
      activeGarageRole: s.activeGarageRole,
      activeRealEstateRole: s.activeRealEstateRole,
      activeManufacturingRole: s.activeManufacturingRole,
      activeLegalRole: s.activeLegalRole,
      activeLogisticsRole: s.activeLogisticsRole,
      activeContractorRole: s.activeContractorRole,
      activeAgriRole: s.activeAgriRole,
      activeMembershipRole: s.activeMembershipRole,
      activeAppointmentRole: s.activeAppointmentRole,
      activePosRole: s.activePosRole,
      activeEducationRole: s.activeEducationRole,
    }),
    shallowEqualObjects
  );

  const {
    freezeStaffMember,
    vacationStaffMember,
    terminateStaffMember,
    deleteStaffMember,
    punchStaffAttendance,
  } = useAtriumActions();

  const [confirmAction, setConfirmAction] = useState<
    'freeze' | 'vacation' | 'terminate' | null
  >(null);

  const isAr = storeSlice.language === 'ar';
  const isEn = storeSlice.language === 'en';

  const effectiveRole = useMemo(
    () =>
      getEffectiveUserRole(currentCategory, {
        currentUser: storeSlice.currentUser,
        activePmRole: storeSlice.activePmRole,
        activeGarageRole: storeSlice.activeGarageRole,
        activeRealEstateRole: storeSlice.activeRealEstateRole,
        activeManufacturingRole: storeSlice.activeManufacturingRole,
        activeLegalRole: storeSlice.activeLegalRole,
        activeLogisticsRole: storeSlice.activeLogisticsRole,
        activeContractorRole: storeSlice.activeContractorRole,
        activeAgriRole: storeSlice.activeAgriRole,
        activeMembershipRole: storeSlice.activeMembershipRole,
        activeAppointmentRole: storeSlice.activeAppointmentRole,
        activePosRole: storeSlice.activePosRole,
        activeEducationRole: storeSlice.activeEducationRole,
      }),
    [currentCategory, storeSlice]
  );

  const isOwnerViewer = canViewSensitivePayroll(effectiveRole);
  const canEdit = canCreateStaff(currentCategory, effectiveRole);
  const metricLabel = useMemo(() => getCategoryPerformanceMetricLabel(currentCategory), [currentCategory]);

  const branchesById = useMemo(
    () => buildBranchesByIdMap(storeSlice.branches),
    [storeSlice.branches]
  );
  const currentBranch = useMemo(
    () =>
      storeSlice.branches?.find((b) => b.id === storeSlice.currentBranchId) ||
      storeSlice.branches?.[0],
    [storeSlice.branches, storeSlice.currentBranchId]
  );

  const staffBranch = useMemo(
    () =>
      staff
        ? resolveRecordBranch(staff, branchesById, currentBranch, storeSlice.language)
        : null,
    [staff, branchesById, currentBranch, storeSlice.language]
  );

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'frozen':
        return 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]';
      case 'vacation':
      case 'on_leave':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50';
      case 'terminated':
        return 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]';
      case 'active':
      default:
        return 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'frozen':
        return isAr ? 'معلق / مجمد' : isEn ? 'Paused' : 'Suspendu';
      case 'vacation':
      case 'on_leave':
        return isAr ? 'في عطلة' : isEn ? 'On Leave' : 'En congé';
      case 'terminated':
        return isAr ? 'منتهي العقد' : isEn ? 'Terminated' : 'Fin de contrat';
      case 'active':
      default:
        return isAr ? 'نشط' : isEn ? 'Active' : 'Actif';
    }
  };

  const handleConfirm = () => {
    if (!staff) return;
    try {
      if (confirmAction === 'freeze') freezeStaffMember(staff.id);
      else if (confirmAction === 'vacation') vacationStaffMember(staff.id);
      else if (confirmAction === 'terminate') terminateStaffMember(staff.id);
    } catch (e: any) {
      showToast({
        type: 'warning',
        title: isAr ? 'تعذر إتمام العملية' : isEn ? 'Operation Restricted' : 'Action refusée',
        message: e.message || 'Action impossible.',
      });
    } finally {
      setConfirmAction(null);
    }
  };

  const tabs = useMemo(
    () => [
      { id: 'overview', label: isAr ? 'نظرة عامة' : isEn ? 'Overview' : 'Aperçu & Profil' },
      { id: 'access', label: isAr ? 'الحضور والبادج' : isEn ? 'Attendance & RFID' : 'Pointage & Accès' },
      { id: 'payroll', label: isAr ? 'العقد والراتب' : isEn ? 'Contract & Payroll' : 'Contrat & Paie' },
    ],
    [isAr, isEn]
  );

  return (
    <>
      <KineticSlideOverInspector<StaffMember>
        isOpen={isOpen}
        item={staff}
        allItems={allStaff}
        keyExtractor={(s) => s.id}
        openerElement={openerElement}
        language={storeSlice.language}
        title={staff?.fullName || (isAr ? 'عضو الفريق' : isEn ? 'Staff Member' : 'Collaborateur')}
        subtitle={`ID: RFID-${(staff?.id || '00000000').slice(0, 8).toUpperCase()}`}
        avatarText={staff ? extractInitials(staff.fullName) : 'ST'}
        avatarColor={staff ? computeInitialsColor(staff.fullName) : '#d4522f'}
        branchName={staffBranch?.branchName}
        statusLabel={getStatusLabel(staff?.status)}
        statusClassName={getStatusClass(staff?.status)}
        headerPills={
          staff ? (
            <>
              <span className="pill inline-flex items-center px-2.5 py-[3px] rounded-md text-[12px] font-medium bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] border border-[#d4522f]/25 dark:border-[#52291F] truncate max-w-full">
                {staff.role || 'Staff'}
              </span>
              {staff.status === 'active' && (
                <span className="pill inline-flex items-center gap-1 px-2.5 py-[3px] rounded-md text-[12px] font-medium bg-[#DDF5E8] dark:bg-[#143324] text-[#096b40] dark:text-[#5BE3A3] border border-[#B5E8CE] dark:border-[#1E4D36]">
                  <ShieldCheck className="w-3 h-3" />
                  {isAr ? 'في الخدمة' : isEn ? 'In Service' : 'En Poste'}
                </span>
              )}
            </>
          ) : null
        }
        tabs={tabs}
        onClose={onClose}
        onSelectItem={onSelectStaff}
        onDelete={
          canEdit && staff
            ? (target) => {
                deleteStaffMember(target.id);
                onClose();
                showToast({
                  type: 'warning',
                  title: isAr ? 'تم الحذف' : isEn ? 'Removed' : 'Collaborateur supprimé',
                  message: target.fullName,
                });
              }
            : undefined
        }
        holdToDelete
        renderBody={(activeStaff, activeTab) => {
          if (activeTab === 'access') {
            return (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          activeStaff.isClockedInToday ? 'bg-emerald-500' : 'bg-[#8A8178]'
                        }`}
                      />
                      <span className="font-semibold text-[13px] text-black dark:text-white">
                        {activeStaff.isClockedInToday
                          ? isAr
                            ? `حاضر الآن (دخول ${activeStaff.lastClockInTime || '08:00'})`
                            : isEn
                            ? `Clocked In (${activeStaff.lastClockInTime || '08:00'})`
                            : `Présent sur site (${activeStaff.lastClockInTime || '08:00'})`
                          : isAr
                          ? 'غير مسجل حضور اليوم'
                          : isEn
                          ? 'Not Clocked In Today'
                          : "Non pointé aujourd'hui"}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-black/65 dark:text-white/70 mt-1 tabular-nums">
                      Badge: {activeStaff.badgeToken || activeStaff.cardId || 'NON-ATTRIBUÉ'}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-no-liquid="true"
                    onClick={() => punchStaffAttendance(activeStaff.id)}
                    className={`px-3.5 py-2 rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer ${
                      activeStaff.isClockedInToday
                        ? 'bg-[#E6DED6] dark:bg-[#3A3734] text-black dark:text-white hover:bg-[#D4C8BC]'
                        : 'bg-[#d4522f] text-white hover:bg-[#b03b1b]'
                    }`}
                  >
                    {activeStaff.isClockedInToday
                      ? isAr
                        ? 'تسجيل خروج'
                        : isEn
                        ? 'Clock Out'
                        : 'Pointer Sortie'
                      : isAr
                      ? 'تسجيل حضور'
                      : isEn
                      ? 'Clock In'
                      : 'Pointer Entrée'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#d4522f]" />
                      {isAr ? metricLabel.labelAr : isEn ? metricLabel.labelEn : metricLabel.labelFr}
                    </span>
                    <span className="font-bold text-sm font-mono text-[#d4522f] tabular-nums">
                      {activeStaff.performance?.kpiValue ?? '92%'}
                    </span>
                  </div>
                  <div className="w-full bg-[#E6DED6] dark:bg-[#3A3734] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                      style={{ width: `${activeStaff.performance?.scorePercentage ?? 85}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          if (activeTab === 'payroll') {
            return (
              <div className="space-y-4">
                {isOwnerViewer ? (
                  <div className="space-y-2.5 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] p-4 border border-[#E6DED6] dark:border-[#3A3734] text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-black/65 dark:text-white/70">
                        {isAr ? 'العقد' : isEn ? 'Contract' : 'Contrat'}
                      </span>
                      <span className="font-semibold uppercase text-[#d4522f]">
                        {activeStaff.contractType || activeStaff.recruitmentType || 'CDI'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-black/65 dark:text-white/70">
                        {isAr ? 'الراتب القاعدي' : isEn ? 'Base Salary' : 'Salaire de base'}
                      </span>
                      <span className="font-bold font-mono text-black dark:text-white tabular-nums">
                        {(activeStaff.salary || 0).toLocaleString()} DZD
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-black/65 dark:text-white/70">
                        {isAr ? 'يوم الدفع' : isEn ? 'Payday' : 'Échéance'}
                      </span>
                      <span className="font-medium font-mono text-black dark:text-white tabular-nums">
                        {activeStaff.paymentDay || 28}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-black/65 dark:text-white/70">
                        {isAr ? 'طريقة الدفع' : isEn ? 'Payment' : 'Règlement'}
                      </span>
                      <span className="font-medium text-black dark:text-white">
                        {activeStaff.paymentMethod === 'ccp'
                          ? `${activeStaff.ccpNumber || 'CCP'}`
                          : activeStaff.paymentMethod === 'bank_transfer'
                          ? `${activeStaff.bankRib || 'RIB'}`
                          : isAr
                          ? 'نقداً'
                          : isEn
                          ? 'Cash'
                          : 'Espèces'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-[#F3EDE7]/70 dark:bg-[#262422]/60 border border-dashed border-[#D4C8BC] dark:border-[#3A3734] text-center">
                    <Lock className="w-5 h-5 text-black/62 dark:text-white/65 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-black/85 dark:text-white/85">
                      {isAr ? 'بيانات مقيدة للإدارة' : isEn ? 'Restricted Compensation Data' : 'Données salariales restreintes'}
                    </p>
                  </div>
                )}

                {canEdit && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      data-no-liquid="true"
                      onClick={() => setConfirmAction('freeze')}
                      disabled={activeStaff.status === 'frozen'}
                      className="py-2.5 px-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تجميد' : isEn ? 'Pause' : 'Geler'}</span>
                    </button>
                    <button
                      type="button"
                      data-no-liquid="true"
                      onClick={() => setConfirmAction('vacation')}
                      disabled={activeStaff.status === 'vacation' || activeStaff.status === 'on_leave'}
                      className="py-2.5 px-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-semibold text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Plane className="w-3.5 h-3.5" />
                      <span>{isAr ? 'عطلة' : isEn ? 'Leave' : 'Congé'}</span>
                    </button>
                    <button
                      type="button"
                      data-no-liquid="true"
                      onClick={() => setConfirmAction('terminate')}
                      disabled={activeStaff.status === 'terminated'}
                      className="py-2.5 px-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 font-semibold text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إنهاء' : isEn ? 'End' : 'Arrêter'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-4 text-[13px]">
              <div className="space-y-2.5 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] p-4 border border-[#E6DED6] dark:border-[#3A3734]">
                <div className="flex items-center justify-between">
                  <span className="text-black/65 dark:text-white/70 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {isAr ? 'البريد' : isEn ? 'Email' : 'Email'}
                  </span>
                  <span className="font-medium text-black dark:text-white font-mono text-xs">
                    {activeStaff.email || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/65 dark:text-white/70 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}
                  </span>
                  <span className="font-medium text-black dark:text-white font-mono text-xs tabular-nums">
                    {activeStaff.phoneNumber || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/65 dark:text-white/70 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {isAr ? 'العنوان' : isEn ? 'Address' : 'Adresse'}
                  </span>
                  <span className="font-medium text-black dark:text-white text-right">
                    {activeStaff.address || '—'}
                  </span>
                </div>
                {activeStaff.chairOrStudio && (
                  <div className="flex items-center justify-between">
                    <span className="text-black/65 dark:text-white/70">
                      {isAr ? 'الموقع المخصص' : isEn ? 'Assigned Station' : 'Poste assigné'}
                    </span>
                    <span className="font-semibold text-[#d4522f]">
                      {activeStaff.chairOrStudio}
                    </span>
                  </div>
                )}
              </div>

              {(activeStaff.bloodGroup || activeStaff.emergencyContactName) && (
                <div className="space-y-2 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] p-4 border border-[#E6DED6] dark:border-[#3A3734]">
                  {activeStaff.bloodGroup && (
                    <div className="flex items-center justify-between">
                      <span className="text-black/65 dark:text-white/70">
                        {isAr ? 'فصيلة الدم' : isEn ? 'Blood Group' : 'Groupe sanguin'}
                      </span>
                      <span className="font-bold text-red-500">{activeStaff.bloodGroup}</span>
                    </div>
                  )}
                  {activeStaff.emergencyContactName && (
                    <div className="flex items-center justify-between">
                      <span className="text-black/65 dark:text-white/70">
                        {isAr ? 'الطوارئ' : isEn ? 'Emergency' : 'Contact urgence'}
                      </span>
                      <span className="font-medium text-black dark:text-white">
                        {activeStaff.emergencyContactName} ({activeStaff.emergencyContactPhone || '—'})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {canEdit && (
                <button
                  type="button"
                  data-no-liquid="true"
                  onClick={() => onEdit(activeStaff)}
                  className="w-full h-10 rounded-xl border border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#262422] text-xs font-semibold text-black dark:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#3A3734] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-[#d4522f]" />
                  <span>{isAr ? 'تعديل الملف المهني' : isEn ? 'Edit Staff Profile' : 'Modifier la fiche'}</span>
                </button>
              )}
            </div>
          );
        }}
      />

      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={
          confirmAction === 'freeze'
            ? 'Geler le compte de ce collaborateur ?'
            : confirmAction === 'vacation'
            ? 'Marquer le départ en congé ?'
            : 'Arrêter définitivement le contrat ?'
        }
        description={staff ? `Confirmer la modification de statut pour ${staff.fullName} ?` : ''}
        confirmLabel={
          confirmAction === 'freeze'
            ? "Geler l'accès"
            : confirmAction === 'terminate'
            ? 'Arrêter contrat'
            : 'Confirmer'
        }
        variant={confirmAction === 'terminate' ? 'danger' : 'warning'}
      />
    </>
  );
});

StaffInspectorDrawer.displayName = 'StaffInspectorDrawer';
