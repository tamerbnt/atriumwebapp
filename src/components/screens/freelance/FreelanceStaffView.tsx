import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { Laptop, Briefcase, CheckCircle2 } from 'lucide-react';

export const FreelanceStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'freelance_solo' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'المتعاون / المستقل الشريك' : isEn ? 'Collaborator / Freelancer' : 'Collaborateur & Freelance',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold t-small flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white t-small truncate">
              {member.fullName}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate">
              {member.role}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة التفرغ' : isEn ? 'Availability' : 'Disponibilité',
      accessorKey: 'status',
      cell: (member) => (
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              member.status === 'active'
                ? 'bg-emerald-500'
                : member.status === 'on_leave'
                ? 'bg-amber-500'
                : member.status === 'frozen'
                ? 'bg-rose-500'
                : 'bg-neutral-400'
            }`}
          />
          <span className="t-small font-medium text-black dark:text-white">
            {member.status === 'active'
              ? isAr
                ? 'متاح للمشاريع'
                : isEn
                ? 'Available'
                : 'Disponible'
              : member.status === 'on_leave'
              ? isAr
                ? 'في عطلة'
                : isEn
                ? 'On Break'
                : 'En Pause'
              : member.status === 'frozen'
              ? isAr
                ? 'غير متاح'
                : isEn
                ? 'Unavailable'
                : 'Indisponible'
              : isAr
              ? 'مؤرشف'
              : isEn
              ? 'Archived'
              : 'Archivé'}
          </span>
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
    {
      id: 'contractType',
      header: isAr ? 'صيغة التعاقد' : isEn ? 'Contract Model' : 'Type Collaboration',
      accessorKey: 'contractType',
      cell: (member) => (
        <span className="t-small font-medium text-black/70 dark:text-white/75">
          {member.contractType === 'cdi' ? 'Sous-traitance Régulière' : 'Mission Ponctuelle'}
        </span>
      ),
    },
  ];

  return (
    <StandardStaffScreen
      foundation={foundation}
      category="freelance_solo"
      columns={columns}
      categoryTitle={isAr ? 'شبكة المتعاونين والمستقلين' : isEn ? 'Collaborators & Subcontractors' : 'Collaborateurs & Freelances'}
      newStaffButtonLabel={isAr ? 'إضافة متعاون' : isEn ? 'Add Collaborator' : 'Nouveau Collaborateur'}
    />
  );
};
