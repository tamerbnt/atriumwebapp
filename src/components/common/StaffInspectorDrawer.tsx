import React, { useState, useMemo } from 'react';
import {
  Edit,
  Lock,
  PauseCircle,
  Plane,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Clock,
  BadgeCheck,
  Briefcase,
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
import { formatMoney } from '../../utils/rules';
import {
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorProgressBar,
  InspectorBigStat,
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
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
    updateStaffMember,
  } = useAtriumActions();

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
        return 'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#164E63]';
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

  const handleLifecycleAction = (action: 'freeze' | 'vacation' | 'terminate', targetId: string) => {
    try {
      if (action === 'freeze') freezeStaffMember(targetId);
      else if (action === 'vacation') vacationStaffMember(targetId);
      else if (action === 'terminate') terminateStaffMember(targetId);
    } catch (e: any) {
      showToast({
        type: 'warning',
        title: isAr ? 'تعذر إتمام العملية' : isEn ? 'Operation Restricted' : 'Action refusée',
        message: e.message || 'Action impossible.',
      });
    }
  };

  const handleCopyToast = (text: string) => {
    showToast({
      type: 'success',
      title: isAr ? 'تم النسخ' : isEn ? 'Copied' : 'Copié',
      message: text,
    });
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
        branchName={staffBranch?.name}
        statusLabel={getStatusLabel(staff?.status)}
        statusClassName={getStatusClass(staff?.status)}
        headerPills={
          staff ? (
            <>
              <span className="pill inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] border border-[#d4522f]/25 dark:border-[#52291F] truncate max-w-full">
                {staff.role || 'Staff'}
              </span>
              {staff.status === 'active' && (
                <span className="pill inline-flex items-center gap-[var(--pill-gap,6px)] h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small bg-[#DDF5E8] dark:bg-[#143324] text-[#096b40] dark:text-[#5BE3A3] border border-[#B5E8CE] dark:border-[#1E4D36]">
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
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
              }
            : undefined
        }
        holdToDelete={canEdit}
        renderBody={(activeStaff, activeTab, entranceEpoch) => {
          const perfScore = activeStaff.performance?.scorePercentage ?? 88;
          const perfLabel = isAr ? metricLabel.labelAr : isEn ? metricLabel.labelEn : metricLabel.labelFr;
          const contractLabel = (activeStaff.contractType || activeStaff.recruitmentType || 'CDI').toUpperCase();

          if (activeTab === 'access') {
            const recentLogs = (activeStaff.attendanceLogs || []).slice(0, 4);
            return (
              <>
                <InspectorSection
                  index={0}
                  title={isAr ? 'البصمة والبادج' : isEn ? 'Badge & Check-In' : 'Badge & Pointage'}
                >
                  <div className="flex flex-col gap-[var(--s3,12px)]">
                    <InspectorCard>
                      <InspectorKeyValue
                        label={isAr ? 'رقم البادج' : isEn ? 'RFID Badge' : 'Badge'}
                        value={activeStaff.badgeToken || activeStaff.cardId || `RFID-${activeStaff.id.slice(0, 8).toUpperCase()}`}
                        copyText={activeStaff.badgeToken || activeStaff.cardId}
                        onCopied={handleCopyToast}
                      />
                      <InspectorKeyValue
                        label={isAr ? 'حالة الحضور' : isEn ? 'Attendance Today' : 'Statut du jour'}
                        value={
                          activeStaff.isClockedInToday
                            ? `${isAr ? 'حاضر' : isEn ? 'Clocked In' : 'Présent'} · ${activeStaff.lastClockInTime || '08:00'}`
                            : isAr
                            ? 'غير مسجل'
                            : isEn
                            ? 'Not Clocked In'
                            : 'Non pointé'
                        }
                        tone={activeStaff.isClockedInToday ? 'ok' : 'default'}
                      />
                      <InspectorKeyValue
                        label={perfLabel}
                        value={`${activeStaff.performance?.kpiValue ?? `${perfScore}%`}`}
                        tone="ok"
                        isLast
                      />
                      <InspectorProgressBar
                        percent={perfScore}
                        tone="ok"
                        animateKey={`${activeStaff.id}-${entranceEpoch}`}
                      />
                    </InspectorCard>
                    <InspectorWideButton
                      label={
                        activeStaff.isClockedInToday
                          ? isAr
                            ? 'تسجيل الخروج الآن'
                            : isEn
                            ? 'Clock Out Now'
                            : 'Pointer la sortie'
                          : isAr
                          ? 'تسجيل الحضور الآن'
                          : isEn
                          ? 'Clock In Now'
                          : "Pointer l'entrée"
                      }
                      icon={<Clock className="w-4 h-4" strokeWidth={1.5} />}
                      tone={activeStaff.isClockedInToday ? 'dark' : 'accent'}
                      onClick={() => punchStaffAttendance(activeStaff.id)}
                    />
                  </div>
                </InspectorSection>

                <InspectorSection
                  index={1}
                  title={isAr ? 'سجل الحضور الأخير' : isEn ? 'Recent Punches' : 'Pointages récents'}
                >
                  <InspectorCard>
                    {(recentLogs.length > 0
                      ? recentLogs.map((log, i) => ({
                          title: log.type === 'in'
                            ? isAr ? 'تسجيل دخول' : isEn ? 'Check-In' : 'Entrée poste'
                            : isAr ? 'تسجيل خروج' : isEn ? 'Check-Out' : 'Sortie poste',
                          time: (log.timestamp || '').replace('T', ' · ').slice(0, 18) || 'Aujourd’hui',
                          ok: log.type === 'in',
                          key: log.id || String(i),
                        }))
                      : [
                          {
                            title: isAr ? 'نوبة الصباح' : isEn ? 'Morning Shift' : 'Prise de poste',
                            time: activeStaff.lastClockInTime ? `Aujourd’hui · ${activeStaff.lastClockInTime}` : 'Aujourd’hui · 08:00',
                            ok: activeStaff.isClockedInToday,
                            key: 'default-0',
                          },
                          {
                            title: isAr ? 'نوبة الأمس' : isEn ? 'Previous Shift' : 'Clôture de service',
                            time: 'Hier · 17:30',
                            ok: true,
                            key: 'default-1',
                          },
                        ]
                    ).map((item, idx, arr) => (
                      <InspectorListItem
                        key={item.key}
                        title={item.title}
                        subtitle={item.time}
                        badge={{
                          label: item.ok
                            ? isAr ? 'مسجل' : isEn ? 'Logged' : 'Validé'
                            : isAr ? 'معلق' : isEn ? 'Pending' : 'En attente',
                          tone: item.ok ? 'ok' : 'warn',
                        }}
                        isLast={idx === arr.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (activeTab === 'payroll') {
            return (
              <>
                <InspectorSection
                  index={0}
                  title={isAr ? 'التعويض الشهري' : isEn ? 'Monthly Compensation' : 'Rémunération mensuelle'}
                >
                  {isOwnerViewer ? (
                    <InspectorBigStat
                      value={`${formatMoney(activeStaff.salary || 0)} DZD`}
                      tone="accent"
                      caption={`${contractLabel} · ${isAr ? 'يوم الدفع' : isEn ? 'Payday' : 'Versement le'} ${activeStaff.paymentDay || 28}`}
                    />
                  ) : (
                    <InspectorCard>
                      <div className="py-[var(--s5,20px)] text-center flex flex-col items-center gap-[var(--s2,8px)]">
                        <Lock className="w-5 h-5 text-[var(--text-2)]" strokeWidth={1.75} />
                        <p className="t-small font-semibold text-[var(--text-1)]">
                          {isAr ? 'بيانات مقيدة للإدارة' : isEn ? 'Restricted Compensation Data' : 'Données salariales restreintes'}
                        </p>
                      </div>
                    </InspectorCard>
                  )}
                </InspectorSection>

                <InspectorSection
                  index={1}
                  title={isAr ? 'تفاصيل العقد والدفع' : isEn ? 'Contract & Payment Details' : 'Contrat & Règlement'}
                >
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'نوع العقد' : isEn ? 'Contract Type' : 'Type de contrat'}
                      value={contractLabel}
                      tone="accent"
                    />
                    <InspectorKeyValue
                      label={isAr ? 'طريقة الدفع' : isEn ? 'Payment Method' : 'Mode de règlement'}
                      value={
                        activeStaff.paymentMethod === 'ccp'
                          ? activeStaff.ccpNumber || 'CCP'
                          : activeStaff.paymentMethod === 'bank_transfer'
                          ? activeStaff.bankRib || 'RIB'
                          : isAr
                          ? 'نقداً'
                          : isEn
                          ? 'Cash'
                          : 'Espèces'
                      }
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الموقع المخصص' : isEn ? 'Assigned Station' : 'Poste assigné'}
                      value={activeStaff.chairOrStudio || staffBranch?.name || '—'}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>

                {canEdit && (
                  <InspectorSection
                    index={2}
                    title={isAr ? 'إجراءات العقد' : isEn ? 'Lifecycle Actions' : 'Gestion du contrat'}
                  >
                    <InspectorQuickActions
                      actions={[
                        {
                          id: 'freeze',
                          label: isAr ? 'تجميد' : isEn ? 'Pause' : 'Suspendre accès',
                          icon: <PauseCircle className="w-4 h-4 text-amber-500" strokeWidth={1.5} />,
                          disabled: activeStaff.status === 'frozen',
                          onClick: () => handleLifecycleAction('freeze', activeStaff.id),
                        },
                        {
                          id: 'leave',
                          label: isAr ? 'عطلة' : isEn ? 'Leave' : 'Mettre en congé',
                          icon: <Plane className="w-4 h-4 text-blue-500" strokeWidth={1.5} />,
                          disabled: activeStaff.status === 'vacation' || activeStaff.status === 'on_leave',
                          onClick: () => handleLifecycleAction('vacation', activeStaff.id),
                        },
                        {
                          id: 'end',
                          label: isAr ? 'إنهاء العقد' : isEn ? 'Terminate' : 'Fin de contrat',
                          icon: <AlertTriangle className="w-4 h-4 text-[#c0283d]" strokeWidth={1.5} />,
                          disabled: activeStaff.status === 'terminated',
                          onClick: () => handleLifecycleAction('terminate', activeStaff.id),
                        },
                      ]}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }

          const quickActions = [
            {
              id: 'punch',
              label: isAr ? 'تسجيل الحضور' : isEn ? 'Clock In' : 'Pointer présence',
              icon: <Clock className="w-4 h-4" strokeWidth={1.5} />,
              primary: true,
              onClick: () => punchStaffAttendance(activeStaff.id),
            },
            ...(canEdit
              ? [
                  {
                    id: 'edit',
                    label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                    icon: <Edit className="w-4 h-4" strokeWidth={1.5} />,
                    onClick: () => onEdit(activeStaff),
                  },
                  {
                    id: 'leave',
                    label: isAr ? 'عطلة' : isEn ? 'Set Leave' : 'Congé',
                    icon: <Plane className="w-4 h-4 text-blue-500" strokeWidth={1.5} />,
                    disabled: activeStaff.status === 'vacation' || activeStaff.status === 'on_leave',
                    onClick: () => handleLifecycleAction('vacation', activeStaff.id),
                  },
                  {
                    id: 'freeze',
                    label: isAr ? 'تجميد' : isEn ? 'Pause' : 'Suspendre',
                    icon: <PauseCircle className="w-4 h-4 text-amber-500" strokeWidth={1.5} />,
                    disabled: activeStaff.status === 'frozen',
                    onClick: () => handleLifecycleAction('freeze', activeStaff.id),
                  },
                ]
              : [
                  {
                    id: 'badge',
                    label: isAr ? 'البادج' : isEn ? 'Verified' : 'Badge actif',
                    icon: <BadgeCheck className="w-4 h-4 text-[#096b40]" strokeWidth={1.5} />,
                    onClick: () =>
                      handleCopyToast(
                        activeStaff.badgeToken || activeStaff.cardId || activeStaff.id.slice(0, 8)
                      ),
                  },
                ]),
          ];

          return (
            <>
              <InspectorSection
                index={0}
                title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}
              >
                <InspectorQuickActions actions={quickActions} />
              </InspectorSection>

              <InspectorSection index={1}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'الوظيفة' : isEn ? 'Role' : 'Poste / Fonction'}
                    icon={<Briefcase className="w-4 h-4" strokeWidth={1.5} />}
                    value={activeStaff.role || 'Staff'}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'العقد' : isEn ? 'Contract' : 'Contrat'}
                    value={contractLabel}
                    tone="accent"
                  />
                  <InspectorKeyValue
                    label={isAr ? 'حضور اليوم' : isEn ? 'Today' : 'Présence du jour'}
                    value={
                      activeStaff.isClockedInToday
                        ? `${isAr ? 'حاضر' : isEn ? 'Clocked In' : 'Présent'} · ${activeStaff.lastClockInTime || '08:00'}`
                        : isAr
                        ? 'غير مسجل'
                        : isEn
                        ? 'Pending'
                        : 'Non pointé'
                    }
                    tone={activeStaff.isClockedInToday ? 'ok' : 'default'}
                  />
                  <InspectorKeyValue
                    label={perfLabel}
                    value={`${activeStaff.performance?.kpiValue ?? `${perfScore}%`}`}
                    tone="ok"
                    isLast
                  />
                  <InspectorProgressBar
                    percent={perfScore}
                    tone="ok"
                    animateKey={`${activeStaff.id}-${entranceEpoch}`}
                  />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection
                index={2}
                title={isAr ? 'الاتصال والطوارئ' : isEn ? 'Contact & Emergency' : 'Contact & Coordonnées'}
              >
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}
                    icon={<Phone className="w-4 h-4" strokeWidth={1.5} />}
                    value={activeStaff.phoneNumber || '—'}
                    copyText={activeStaff.phoneNumber}
                    onCopied={handleCopyToast}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'البريد' : isEn ? 'Email' : 'E-mail'}
                    icon={<Mail className="w-4 h-4" strokeWidth={1.5} />}
                    value={activeStaff.email || '—'}
                    copyText={activeStaff.email}
                    onCopied={handleCopyToast}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'العنوان' : isEn ? 'Address' : 'Adresse'}
                    icon={<MapPin className="w-4 h-4" strokeWidth={1.5} />}
                    value={activeStaff.address || staffBranch?.name || '—'}
                    mono={false}
                    isLast={!activeStaff.emergencyContactName}
                  />
                  {activeStaff.emergencyContactName && (
                    <InspectorKeyValue
                      label={isAr ? 'الطوارئ' : isEn ? 'Emergency' : 'Contact urgence'}
                      value={`${activeStaff.emergencyContactName} (${activeStaff.emergencyContactPhone || '—'})`}
                      mono={false}
                      tone="danger"
                      isLast
                    />
                  )}
                </InspectorCard>
              </InspectorSection>

              <InspectorSection
                index={3}
                title={isAr ? 'ملاحظات الموارد البشرية' : isEn ? 'HR Notes' : 'Notes RH & suivi'}
              >
                <InspectorNotesField
                  ariaLabel={isAr ? 'ملاحظات الموارد البشرية' : isEn ? 'HR Notes' : 'Notes RH'}
                  value={activeStaff.notes || ''}
                  placeholder={
                    isAr
                      ? 'أضف ملاحظة إدارية حول هذا الموظف…'
                      : isEn
                      ? 'Add internal note for this staff member…'
                      : 'Ajouter une note RH relative à ce collaborateur…'
                  }
                  onSave={(nextNotes) => {
                    updateStaffMember(activeStaff.id, { notes: nextNotes });
                  }}
                />
              </InspectorSection>
            </>
          );
        }}
      />
    </>
  );
});

StaffInspectorDrawer.displayName = 'StaffInspectorDrawer';
