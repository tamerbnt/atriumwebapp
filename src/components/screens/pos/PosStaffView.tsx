import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { ShoppingBag, CreditCard } from 'lucide-react';

export const PosStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'pos_inventory' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'أمين الصندوق / الموظف' : isEn ? 'Cashier / Store Staff' : 'Caissier & Équipe Magasin',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold t-small flex items-center justify-center shrink-0">
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
      header: isAr ? 'حالة الوردية' : isEn ? 'Shift Status' : 'Statut Caisse',
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
                    ? 'على الصندوق'
                    : isEn
                    ? 'At Register'
                    : 'Caisse Ouverte'
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
      id: 'assignedRegisterId',
      header: isAr ? 'رقم الصندوق المخصص' : isEn ? 'Assigned Register' : 'Caisse / Terminal Attribué',
      accessorKey: 'assignedRegisterId',
      cell: (member) => (
        <span className="t-cap tabular-nums text-black/70 dark:text-white/75">
          {member.assignedRegisterId || (isAr ? 'عائم' : isEn ? 'Floating' : 'Flottant')}
        </span>
      ),
    },
    {
      id: 'maxCashFloatLimit',
      header: isAr ? 'سقف صندوق النقد' : isEn ? 'Cash Float Ceiling' : 'Plafond Fond de Caisse',
      accessorKey: 'maxCashFloatLimit',
      cell: (member) => (
        <span className="t-small font-semibold text-black dark:text-white tabular-nums">
          {member.maxCashFloatLimit ? formatMoney(member.maxCashFloatLimit) : 'Standard'}
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
      category="pos_inventory"
      columns={columns}
      categoryTitle={isAr ? 'أمناء الصناديق والمبيعات' : isEn ? 'Retail & POS Staff' : 'Caissiers & Vendeurs'}
      newStaffButtonLabel={isAr ? 'إضافة أمين صندوق' : isEn ? 'Add Cashier' : 'Nouveau Caissier'}
    />
  );
};
