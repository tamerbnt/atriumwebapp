import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { Briefcase, Building2, CheckCircle2 } from 'lucide-react';
import { TradingRepCommissionsPanel } from './TradingRepCommissionsPanel';

export const TradingStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'trading_commercial' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'المندوب التجاري / أمين المستودع' : isEn ? 'Commercial Rep / Warehouse' : 'Commercial & Magasinier',
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
            <div className="t-cap text-black/55 dark:text-white/55 truncate">
              {member.role}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة النشاط' : isEn ? 'Activity Status' : 'Statut Présence',
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
                    ? 'في الميدان (حاضر)'
                    : isEn
                    ? 'Active On-Site'
                    : 'En Poste / Tournée'
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
      header: isAr ? 'طبيعة العقد' : isEn ? 'Contract' : 'Contrat Commercial',
      accessorKey: 'contractType',
      cell: (member) => (
        <span className="t-small font-medium text-black/70 dark:text-white/75">
          {member.contractType === 'cdi' ? 'CDI Permanent' : 'CDD / Mission'}
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
    <div className="space-y-6">
      <StandardStaffScreen
        foundation={foundation}
        category="trading_commercial"
        columns={columns}
        categoryTitle={isAr ? 'فريق التجارة والتوزيع B2B' : isEn ? 'Commercial & Warehouse Staff' : 'Commerciaux & Magasiniers B2B'}
        newStaffButtonLabel={isAr ? 'إضافة مندوب تجاري' : isEn ? 'Add Commercial Rep' : 'Nouveau Commercial B2B'}
      />
      <TradingRepCommissionsPanel
        staffList={foundation.facilityStaff}
        payrollRuns={foundation.staffPayrollRuns}
        language={language}
      />
    </div>
  );
};
