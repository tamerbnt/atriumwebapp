import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { Calendar, Building, CheckCircle2 } from 'lucide-react';

export const VenueStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'rental_booking' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'منسق الفعاليات / التقني' : isEn ? 'Event Coordinator / Staff' : 'Régisseur & Équipe Événement',
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
            <div className="t-cap text-black/55 dark:text-white/55 truncate">
              {member.role}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة التواجد بالقاعة' : isEn ? 'Venue Presence' : 'Statut Régie',
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
                    ? 'في القاعة (حاضر)'
                    : isEn
                    ? 'In Hall (On Shift)'
                    : 'En Salle / Régie'
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
      header: isAr ? 'طبيعة العقد' : isEn ? 'Contract' : 'Contrat',
      accessorKey: 'contractType',
      cell: (member) => (
        <span className="t-small font-medium text-black/70 dark:text-white/75">
          {member.contractType === 'cdi' ? 'CDI' : 'Prestation Événement'}
        </span>
      ),
    },
  ];

  return (
    <StandardStaffScreen
      foundation={foundation}
      category="rental_booking"
      columns={columns}
      categoryTitle={isAr ? 'فريق إدارة القاعات والفعاليات' : isEn ? 'Venue & Event Staff' : 'Régisseurs & Équipe Événementielle'}
      newStaffButtonLabel={isAr ? 'إضافة منسق / تقني' : isEn ? 'Add Staff' : 'Nouveau Régisseur'}
    />
  );
};
