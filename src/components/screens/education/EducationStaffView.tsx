import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { GraduationCap, BookOpen, CheckCircle } from 'lucide-react';

export const EducationStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'education_cohort' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'الأستاذ / المؤطر' : isEn ? 'Instructor / Teacher' : 'Enseignant & Formateur',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white text-xs truncate">
              {member.fullName}
            </div>
            <div className="text-[11px] text-black/70 dark:text-white/75 truncate">
              {member.role}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة التواجد' : isEn ? 'Faculty Status' : 'Statut Enseignant',
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
            <span className="text-xs font-medium text-black dark:text-white">
              {member.status === 'active'
                ? isPresent
                  ? isAr
                    ? 'في القاعة (حاضر)'
                    : isEn
                    ? 'In Class (Present)'
                    : 'En Cours / Salle'
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
      id: 'contractType',
      header: isAr ? 'طبيعة التعاقد' : isEn ? 'Contract / Status' : 'Régime Enseignement',
      accessorKey: 'contractType',
      cell: (member) => (
        <span className="text-xs font-medium text-black dark:text-white">
          {member.contractType === 'cdi'
            ? isAr
              ? 'دائم (CDI)'
              : 'Permanent (CDI)'
            : member.contractType === 'cdd'
            ? isAr
              ? 'محدد المدة (CDD)'
              : 'Vacataire (CDD)'
            : isAr
            ? 'ساعات إضافية'
            : 'Heures Vacations'}
        </span>
      ),
    },
    {
      id: 'phoneNumber',
      header: isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      accessorKey: 'phoneNumber',
      cell: (member) => (
        <span className="text-xs text-black/70 dark:text-white tabular-nums">
          {member.phoneNumber || '—'}
        </span>
      ),
    },
    {
      id: 'badgeToken',
      header: isAr ? 'بطاقة الأستاذ' : isEn ? 'Faculty Badge' : 'Carte Enseignant',
      accessorKey: 'badgeToken',
      cell: (member) => (
        <span className="font-mono text-xs text-black/70 dark:text-white">
          {member.badgeToken || '—'}
        </span>
      ),
    },
  ];

  return (
    <StandardStaffScreen
      foundation={foundation}
      category="education_cohort"
      columns={columns}
      categoryTitle={isAr ? 'هيئة التدريس والمؤطرون' : isEn ? 'Faculty & Instructors' : 'Corps Enseignant & Pédagogique'}
      newStaffButtonLabel={isAr ? 'إضافة أستاذ / مؤطر' : isEn ? 'Add Instructor' : 'Nouvel Enseignant'}
    />
  );
};
