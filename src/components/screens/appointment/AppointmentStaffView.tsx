import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { Scissors, Sparkles, Clock, CheckCircle2 } from 'lucide-react';

export const AppointmentStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'appointment_service' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'مصفف الشعر / الممارس' : isEn ? 'Stylist / Specialist' : 'Coiffeur & Spécialiste',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-400 font-bold text-xs flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white text-xs truncate">
              {member.fullName}
            </div>
            <div className="text-[11px] text-black/70 dark:text-white/75 truncate flex items-center gap-1.5">
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
      header: isAr ? 'حالة التواجد' : isEn ? 'Chair Status' : 'Statut Présence',
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
                    ? 'بالصالون (متاح)'
                    : isEn
                    ? 'At Chair (Ready)'
                    : 'En Cabine / Fauteuil'
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
      id: 'chairOrStudio',
      header: isAr ? 'الكرسي / المقصورة' : isEn ? 'Assigned Chair / Cabin' : 'Fauteuil / Cabine',
      accessorKey: 'chairOrStudio',
      cell: (member) => (
        <span className="text-xs font-medium text-black dark:text-white">
          {member.chairOrStudio || (isAr ? 'مشترك' : isEn ? 'Shared' : 'Partagé')}
        </span>
      ),
    },
    {
      id: 'serviceCommissionRate',
      header: isAr ? 'نسبة العمولة' : isEn ? 'Commission %' : 'Commission Prestations',
      accessorKey: 'serviceCommissionRate',
      cell: (member) => (
        <span className="text-xs font-semibold text-[#d4522f]">
          {member.serviceCommissionRate ? `${member.serviceCommissionRate}%` : 'Standard'}
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
  ];

  return (
    <StandardStaffScreen
      foundation={foundation}
      category="appointment_service"
      columns={columns}
      categoryTitle={isAr ? 'فريق الصالون والتجميل' : isEn ? 'Salon Stylists & Staff' : 'Stylistes & Soins Salon'}
      newStaffButtonLabel={isAr ? 'إضافة مصفف / ممارس' : isEn ? 'Add Stylist' : 'Nouveau Styliste'}
    />
  );
};
