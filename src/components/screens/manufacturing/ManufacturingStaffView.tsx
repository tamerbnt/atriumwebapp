import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { ManufacturingPieceRatePanel } from './ManufacturingPieceRatePanel';
import { Factory, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ManufacturingStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'manufacturing_production' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'عامل التشغيل / التقني' : isEn ? 'Operator / Machinist' : 'Opérateur & Technicien Machine',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold t-small flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white t-small truncate">
              {member.fullName}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate flex items-center gap-2">
              <span>{member.role}</span>
              {member.assignedWorkstationId && (
                <>
                  <span>·</span>
                  <span className="font-medium text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{member.assignedWorkstationId}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة الوردية' : isEn ? 'Machine Shift' : 'Statut Poste',
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
            <span className="t-small font-medium text-black dark:text-white">
              {member.status === 'active'
                ? isPresent
                  ? isAr
                    ? 'على الآلة (إنتاج)'
                    : isEn
                    ? 'At Station (Active)'
                    : 'Sur Machine'
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
      id: 'assignedWorkstationId',
      header: isAr ? 'محطة / آلة الإنتاج' : isEn ? 'Assigned Workstation' : 'Poste / Machine Attribué',
      accessorKey: 'assignedWorkstationId',
      cell: (member) => (
        <span className="t-cap tabular-nums text-black/70 dark:text-white/75">
          {member.assignedWorkstationId || (isAr ? 'خط عام' : 'Ligne Générale')}
        </span>
      ),
    },
    {
      id: 'machineSafetyClearance',
      header: isAr ? 'أمان الآلات (مرسوم 05-468)' : isEn ? 'Safety Clearance' : 'Sécurité Décret 05-468',
      accessorKey: 'machineSafetyClearance',
      cell: (member) => (
        <div className="flex items-center gap-2">
          {member.machineSafetyClearance ? (
            <span className="inline-flex items-center gap-1 t-small font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={13} />
              <span>{isAr ? 'مؤهل' : 'Habilité'}</span>
            </span>
          ) : (
            <span className="t-cap text-black/55 dark:text-white/55">
              {isAr ? 'عادي' : 'Standard'}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'phoneNumber',
      header: isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      accessorKey: 'phoneNumber',
      cell: (member) => (
        <span className="t-cap text-black/70 dark:text-white/75 tabular-nums">
          {member.phoneNumber || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <StandardStaffScreen
        foundation={foundation}
        category="manufacturing_production"
        columns={columns}
        categoryTitle={isAr ? 'مشغلو الورشة والإنتاج' : isEn ? 'Workshop Operators & Staff' : 'Opérateurs & Équipe Atelier'}
        newStaffButtonLabel={isAr ? 'إضافة مشغل آلة' : isEn ? 'Add Operator' : 'Nouvel Opérateur'}
      />
      <ManufacturingPieceRatePanel
        staffList={foundation.facilityStaff}
        payrollRuns={foundation.staffPayrollRuns}
        language={language}
      />
    </div>
  );
};
