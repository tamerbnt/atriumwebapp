import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { Wrench, Shield, CheckCircle2 } from 'lucide-react';

export const AutoGarageStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'auto_garage' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'الميكانيكي / التقني' : isEn ? 'Mechanic / Technician' : 'Mécanicien & Technicien',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold t-small flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white t-small truncate">
              {member.fullName}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate flex items-center gap-2">
              <span>{member.role}</span>
              {member.technicalSpecialty && (
                <>
                  <span>·</span>
                  <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-medium">{member.technicalSpecialty}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة الورشة' : isEn ? 'Bay Status' : 'Statut Atelier',
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
                    ? 'على الجسر (نشط)'
                    : isEn
                    ? 'At Bay (Working)'
                    : 'En Baie / Intervention'
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
      id: 'assignedBayId',
      header: isAr ? 'جسر الرفع / الباب' : isEn ? 'Assigned Lift Bay' : 'Pont Élévateur / Baie',
      accessorKey: 'assignedBayId',
      cell: (member) => (
        <span className="t-cap tabular-nums text-black/70 dark:text-white/75">
          {member.assignedBayId ? `Pont #${member.assignedBayId}` : isAr ? 'ورشة عامة' : 'Atelier Global'}
        </span>
      ),
    },
    {
      id: 'technicalSpecialty',
      header: isAr ? 'التخصص التقني' : isEn ? 'Technical Specialty' : 'Spécialité Technique',
      accessorKey: 'technicalSpecialty',
      cell: (member) => (
        <span className="t-small font-medium text-black/70 dark:text-white/75">
          {member.technicalSpecialty || (isAr ? 'ميكانيك عام' : 'Mécanique Générale')}
        </span>
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
    <StandardStaffScreen
      foundation={foundation}
      category="auto_garage"
      columns={columns}
      categoryTitle={isAr ? 'فريق صيانة السيارات' : isEn ? 'Garage Mechanics & Techs' : 'Mécaniciens & Atelier Auto'}
      newStaffButtonLabel={isAr ? 'إضافة تقني / ميكانيكي' : isEn ? 'Add Mechanic' : 'Nouveau Mécanicien'}
    />
  );
};
