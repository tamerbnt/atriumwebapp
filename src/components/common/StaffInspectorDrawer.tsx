import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Shield,
  CreditCard,
  HeartPulse,
  KeyRound,
  Calendar,
  Lock,
  PauseCircle,
  Plane,
  AlertTriangle,
  Trash2,
  Edit,
  Clock,
  CheckCircle2,
  TrendingUp,
  Building,
  QrCode,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { StaffMember, BusinessCategory } from '../../types/index';
import { useAtriumStore } from '../../services/store';
import {
  canViewSensitivePayroll,
  getCategoryPerformanceMetricLabel,
  getEffectiveUserRole,
  canCreateStaff,
} from '../../utils/staffRules';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface StaffInspectorDrawerProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (staff: StaffMember) => void;
  currentCategory: BusinessCategory | string;
}

export const StaffInspectorDrawer: React.FC<StaffInspectorDrawerProps> = ({
  staff,
  isOpen,
  onClose,
  onEdit,
  currentCategory,
}) => {
  const {
    currentUser,
    freezeStaffMember,
    vacationStaffMember,
    terminateStaffMember,
    deleteStaffMember,
    punchStaffAttendance,
    showToast,
    language,
    activePmRole,
    activeGarageRole,
    activeRealEstateRole,
    activeManufacturingRole,
    activeLegalRole,
    activeLogisticsRole,
    activeContractorRole,
    activeAgriRole,
    activeMembershipRole,
    activeAppointmentRole,
    activePosRole,
    activeEducationRole,
  } = useAtriumStore();

  const [confirmAction, setConfirmAction] = useState<
    'freeze' | 'vacation' | 'terminate' | 'delete' | null
  >(null);

  if (!isOpen || !staff) return null;

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const effectiveRole = getEffectiveUserRole(currentCategory, {
    currentUser,
    activePmRole,
    activeGarageRole,
    activeRealEstateRole,
    activeManufacturingRole,
    activeLegalRole,
    activeLogisticsRole,
    activeContractorRole,
    activeAgriRole,
    activeMembershipRole,
    activeAppointmentRole,
    activePosRole,
    activeEducationRole,
  });

  const isOwnerViewer = canViewSensitivePayroll(effectiveRole);
  const canEdit = canCreateStaff(currentCategory, effectiveRole);
  const metricLabel = getCategoryPerformanceMetricLabel(currentCategory);

  const handleConfirm = () => {
    if (!staff) return;
    try {
      if (confirmAction === 'freeze') {
        freezeStaffMember(staff.id);
      } else if (confirmAction === 'vacation') {
        vacationStaffMember(staff.id);
      } else if (confirmAction === 'terminate') {
        terminateStaffMember(staff.id);
      } else if (confirmAction === 'delete') {
        deleteStaffMember(staff.id);
        onClose();
      }
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'frozen':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'vacation':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'terminated':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'active':
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'frozen':
        return isAr ? 'معلق / مجمد' : isEn ? 'Frozen' : 'Gelé';
      case 'vacation':
        return isAr ? 'في عطلة' : isEn ? 'On Vacation' : 'En congé';
      case 'terminated':
        return isAr ? 'منتهي العقد' : isEn ? 'Terminated' : 'Arrêté';
      case 'active':
      default:
        return isAr ? 'نشط' : isEn ? 'Active' : 'Actif';
    }
  };

  const drawerContent = (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      <div className="fixed inset-0 bg-[#1F1D1B]/45 backdrop-blur-xs pointer-events-auto transition-opacity duration-200" onClick={onClose} />

      <aside
        className={`fixed top-0 bottom-0 ${
          isAr ? 'left-0 border-r' : 'right-0 border-l'
        } z-[9995] pointer-events-auto w-full sm:w-[420px] bg-white dark:bg-[#1C1B1A] border-[#E6DED6] dark:border-[#3A3734] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-${
          isAr ? 'left' : 'right'
        } duration-200`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d4522f]/10 text-[#d4522f] font-bold text-lg flex items-center justify-center">
              {staff.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                <span>{staff.fullName}</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getStatusColor(
                    staff.status
                  )}`}
                >
                  {getStatusLabel(staff.status)}
                </span>
              </h2>
              <p className="text-xs text-black/70 dark:text-white/75">{staff.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => onEdit(staff)}
                className="p-2 rounded-xl text-black/65 hover:text-black dark:text-white/70 dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#262422] transition-colors cursor-pointer"
                title={isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier'}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-black/65 hover:text-black dark:text-white/70 dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#262422] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* Live Pointage & Badge Strip */}
          <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    staff.isClockedInToday ? 'bg-emerald-500' : 'bg-[#8A8178]'
                  }`}
                />
                <span className="font-semibold text-black dark:text-white">
                  {staff.isClockedInToday
                    ? isAr
                      ? `حاضر الآن (دخول ${staff.lastClockInTime || '08:00'})`
                      : isEn
                      ? `Clocked In (${staff.lastClockInTime || '08:00'})`
                      : `Présent sur site (${staff.lastClockInTime || '08:00'})`
                    : isAr
                    ? 'غير مسجل حضور اليوم'
                    : isEn
                    ? 'Not Clocked In Today'
                    : 'Non pointé aujourd\'hui'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-black/65 dark:text-white/70 mt-0.5 tabular-nums">
                Badge: {staff.cardId || 'NON-ATTRIBUÉ'}
              </p>
            </div>

            <button
              onClick={() => punchStaffAttendance(staff.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs shadow-xs transition-colors ${
                staff.isClockedInToday
                  ? 'bg-[#E6DED6] dark:bg-[#3A3734] text-black dark:text-white hover:bg-[#D4C8BC]'
                  : 'bg-[#d4522f] text-white hover:bg-[#b03b1b]'
              }`}
            >
              {staff.isClockedInToday
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

          {/* Performance Radar / KPI */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#d4522f]/5 to-transparent border border-[#d4522f]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-black dark:text-white font-semibold">
                <TrendingUp className="w-4 h-4 text-[#d4522f]" />
                <span>
                  {isAr ? metricLabel.labelAr : isEn ? metricLabel.labelEn : metricLabel.labelFr}
                </span>
              </div>
              <span className="font-bold text-sm text-[#d4522f] tabular-nums">
                {staff.performance?.kpiValue ?? '92%'}
              </span>
            </div>
            <div className="w-full bg-[#E6DED6] dark:bg-[#3A3734] h-2 rounded-full overflow-hidden mt-2.5">
              <div
                className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                style={{ width: `${staff.performance?.scorePercentage ?? 85}%` }}
              />
            </div>
            <p className="text-[11px] text-black/65 dark:text-white/70 mt-2">
              {isAr
                ? 'مؤشر أداء شهري محدث دورياً بناءً على العمليات المنجزة'
                : isEn
                ? 'Rolling 30-day performance score based on category operations'
                : 'Indicateur mensuel calculé sur les prestations et opérations réalisées'}
            </p>
          </div>

          {/* Contact & Personal Coordinates */}
          <div className="space-y-3">
            <h3 className="font-semibold text-black/65 dark:text-white/70 uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-[11px]">
              {isAr ? 'الاتصال' : isEn ? 'Contact' : 'Contact'}
            </h3>
            <div className="space-y-2 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] p-3.5 border border-[#E6DED6] dark:border-[#3A3734]">
              <div className="flex items-center justify-between">
                <span className="text-black/65 dark:text-white/70 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {isAr ? 'البريد' : isEn ? 'Email' : 'Email'}
                </span>
                <span className="font-medium text-black dark:text-white font-mono text-[11px]">
                  {staff.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/65 dark:text-white/70 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}
                </span>
                <span className="font-medium text-black dark:text-white font-mono text-[11px] tabular-nums">
                  {staff.phoneNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/65 dark:text-white/70 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {isAr ? 'العنوان' : isEn ? 'Address' : 'Adresse'}
                </span>
                <span className="font-medium text-black dark:text-white">
                  {staff.address || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/65 dark:text-white/70">{isAr ? 'العمر' : isEn ? 'Age' : 'Âge'}</span>
                <span className="font-medium text-black dark:text-white tabular-nums">
                  {staff.age ? `${staff.age}` : '-'} · {staff.gender === 'female' ? (isAr ? 'أنثى' : isEn ? 'Female' : 'Femme') : (isAr ? 'ذكر' : isEn ? 'Male' : 'Homme')}
                </span>
              </div>
            </div>
          </div>

          {/* Confidential Compensation & Legal Dossier (Strict RBAC Guard) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-black/65 dark:text-white/70 uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-[11px]">
                {isAr ? 'العقد والراتب' : isEn ? 'Payroll' : 'Contrat'}
              </h3>
              {!isOwnerViewer && (
                <span className="text-[11px] text-amber-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {isAr ? 'مقيد' : isEn ? 'Private' : 'Privé'}
                </span>
              )}
            </div>

            {isOwnerViewer ? (
              <div className="space-y-2 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] p-3.5 border border-[#E6DED6] dark:border-[#3A3734]">
                <div className="flex items-center justify-between">
                  <span className="text-black/65 dark:text-white/70">{isAr ? 'العقد' : isEn ? 'Contract' : 'Contrat'}</span>
                  <span className="font-semibold uppercase text-[#d4522f]">
                    {staff.recruitmentType || 'CDI'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/65 dark:text-white/70">{isAr ? 'الراتب' : isEn ? 'Salary' : 'Salaire'}</span>
                  <span className="font-bold text-black dark:text-white tabular-nums">
                    {(staff.salary || 0).toLocaleString()} DZD
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/65 dark:text-white/70">{isAr ? 'يوم الدفع' : isEn ? 'Payday' : 'Échéance'}</span>
                  <span className="font-medium text-black dark:text-white tabular-nums">
                    {staff.paymentDay || 28}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/65 dark:text-white/70">{isAr ? 'الدفع' : isEn ? 'Method' : 'Paiement'}</span>
                  <span className="font-medium text-black dark:text-white">
                    {staff.paymentMethod === 'ccp'
                      ? `${staff.ccpNumber || '—'}`
                      : staff.paymentMethod === 'bank_transfer'
                      ? `${staff.bankRib || '—'}`
                      : (isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F3EDE7]/70 dark:bg-[#262422]/60 border border-dashed border-[#D4C8BC] dark:border-[#3A3734] text-center">
                <Lock className="w-5 h-5 text-black/62 dark:text-white/65 mx-auto mb-1.5" />
                <p className="text-[11px] font-semibold text-black/85 dark:text-white/85">
                  {isAr ? 'بيانات مقيدة' : isEn ? 'Restricted' : 'Masqué'}
                </p>
              </div>
            )}
          </div>

          {/* Medical Dossier */}
          {(staff.bloodGroup || staff.emergencyContactName) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-black/65 dark:text-white/70 uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-[11px]">
                {isAr ? 'الطوارئ' : isEn ? 'Emergency' : 'Urgence'}
              </h3>
              <div className="space-y-2 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] p-3.5 border border-[#E6DED6] dark:border-[#3A3734]">
                {staff.bloodGroup && (
                  <div className="flex items-center justify-between">
                    <span className="text-black/65 dark:text-white/70">{isAr ? 'الدم' : isEn ? 'Blood' : 'Groupe'}</span>
                    <span className="font-bold text-red-500">{staff.bloodGroup}</span>
                  </div>
                )}
                {staff.emergencyContactName && (
                  <div className="flex items-center justify-between">
                    <span className="text-black/65 dark:text-white/70">{isAr ? 'الطوارئ' : isEn ? 'Contact' : 'Urgence'}</span>
                    <span className="font-medium text-black dark:text-white">
                      {staff.emergencyContactName} ({staff.emergencyContactPhone || '—'})
                    </span>
                  </div>
                )}
                {staff.medicalNotes && (
                  <p className="text-[11px] text-black/70 dark:text-white/75 italic mt-1 border-t border-[#E6DED6] dark:border-[#3A3734] pt-1.5">
                    "{staff.medicalNotes}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Action Bar (Management & Owner Only) */}
        {canEdit && (
          <div className="p-4 border-t border-[#E6DED6] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#151413] space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setConfirmAction('freeze')}
                disabled={staff.status === 'frozen'}
                className="py-2 px-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>{isAr ? 'تجميد' : isEn ? 'Freeze' : 'Geler'}</span>
              </button>

              <button
                onClick={() => setConfirmAction('vacation')}
                disabled={staff.status === 'vacation'}
                className="py-2 px-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
              >
                <Plane className="w-3.5 h-3.5" />
                <span>{isAr ? 'عطلة' : isEn ? 'Leave' : 'Congé'}</span>
              </button>

              <button
                onClick={() => setConfirmAction('terminate')}
                disabled={staff.status === 'terminated'}
                className="py-2 px-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isAr ? 'إنهاء' : isEn ? 'End' : 'Arrêter'}</span>
              </button>
            </div>

            <button
              onClick={() => setConfirmAction('delete')}
              className="w-full py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/40 hover:bg-red-500/10 text-red-500 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer'}</span>
            </button>
          </div>
        )}
      </aside>

      {/* Safety Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={
          confirmAction === 'freeze'
            ? 'Geler le compte de ce collaborateur ?'
            : confirmAction === 'vacation'
            ? 'Marquer le départ en congé ?'
            : confirmAction === 'terminate'
            ? 'Arrêter définitivement le contrat ?'
            : 'Supprimer ce collaborateur ?'
        }
        description={
          confirmAction === 'delete'
            ? `Êtes-vous sûr de vouloir supprimer définitivement ${staff.fullName} ? Cette action est irréversible.`
            : `Voulez-vous modifier le statut de ${staff.fullName} ?`
        }
        confirmLabel={
          confirmAction === 'delete'
            ? 'Supprimer'
            : confirmAction === 'freeze'
            ? 'Geler l\'accès'
            : confirmAction === 'terminate'
            ? 'Arrêter contrat'
            : 'Confirmer'
        }
        variant={confirmAction === 'delete' || confirmAction === 'terminate' ? 'danger' : 'warning'}
      />
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(drawerContent, document.body)
    : drawerContent;
};
