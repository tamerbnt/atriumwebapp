import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { Truck, MapPin, CheckCircle2 } from 'lucide-react';

export const LogisticsStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'logistics_courier' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'السائق / عون التوزيع' : isEn ? 'Courier / Driver' : 'Chauffeur & Livreur',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold t-small flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white t-small truncate">
              {member.fullName}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate flex items-center gap-2">
              <span>{member.role}</span>
              {member.assignedVehiclePlate && (
                <>
                  <span>·</span>
                  <span className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{member.assignedVehiclePlate}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة الجولة' : isEn ? 'Route Status' : 'Statut Tournée',
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
                    ? 'في الجولة (نشط)'
                    : isEn
                    ? 'On Route (Active)'
                    : 'En Tournée'
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
      id: 'drivingLicenseCategory',
      header: isAr ? 'صنف الرخصة' : isEn ? 'License Class' : 'Permis de Conduire',
      accessorKey: 'drivingLicenseCategory',
      cell: (member) => (
        <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 t-small tabular-nums font-semibold text-black dark:text-white">
          {member.drivingLicenseCategory || 'B'}
        </span>
      ),
    },
    {
      id: 'deliveryZoneWilayas',
      header: isAr ? 'ولاية / منطقة التوزيع' : isEn ? 'Delivery Zone' : 'Zone / Wilayas',
      accessorKey: 'deliveryZoneWilayas',
      cell: (member) => (
        <span className="t-cap text-black/70 dark:text-white/75">
          {member.deliveryZoneWilayas || (isAr ? 'المركز الرئيسي' : 'Hub Central')}
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
      category="logistics_courier"
      columns={columns}
      categoryTitle={isAr ? 'السائقون وأعوان التوزيع' : isEn ? 'Fleet Drivers & Couriers' : 'Chauffeurs & Livreurs Hub'}
      newStaffButtonLabel={isAr ? 'إضافة سائق / عون توزيع' : isEn ? 'Add Courier' : 'Nouveau Chauffeur Livreur'}
    />
  );
};
