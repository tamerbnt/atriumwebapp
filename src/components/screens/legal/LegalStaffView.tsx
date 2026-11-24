import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { Scale, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const LegalStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'legal_accounting' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'المحامي / الكاتب المحلف' : isEn ? 'Lawyer / Sworn Clerk' : 'Avocat & Clerc d’Étude',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-black/75 dark:text-white/80 font-semibold t-small flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white t-small truncate">
              {member.fullName}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate flex items-center gap-2">
              <span>{member.role}</span>
              {member.barAssociationNumber && (
                <>
                  <span>·</span>
                  <span className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{member.barAssociationNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة التواجد بالجلسات' : isEn ? 'Cabinet Presence' : 'Statut Étude / Palais',
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
                    ? 'في المكتب / الجلسة'
                    : isEn
                    ? 'In Chamber / Court'
                    : 'À l’Étude / Audience'
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
      id: 'barAssociationNumber',
      header: isAr ? 'رقم القيد بالمنظمة' : isEn ? 'Bar Association No.' : 'N° Barreau / Chambre',
      accessorKey: 'barAssociationNumber',
      cell: (member) => (
        <span className="t-cap tabular-nums text-black/70 dark:text-white/75">
          {member.barAssociationNumber || (isAr ? 'قيد التثبيت' : 'En stage')}
        </span>
      ),
    },
    {
      id: 'swornClerkClearance',
      header: isAr ? 'الصفة القانونية' : isEn ? 'Legal Clearance' : 'Assermentation',
      accessorKey: 'swornClerkClearance',
      cell: (member) => (
        <div className="flex items-center gap-2">
          {member.swornClerkClearance ? (
            <span className="inline-flex items-center gap-1 t-small font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={13} />
              <span>{isAr ? 'محلف ومفوض' : 'Clerc Assermenté'}</span>
            </span>
          ) : (
            <span className="t-cap text-black/55 dark:text-white/55">
              {isAr ? 'مساعد قانوني' : 'Collaborateur'}
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
    <StandardStaffScreen
      foundation={foundation}
      category="legal_accounting"
      columns={columns}
      categoryTitle={isAr ? 'فريق المكتب القانوني والتوثيقي' : isEn ? 'Legal Associates & Clerks' : 'Avocats & Clercs d’Étude'}
      newStaffButtonLabel={isAr ? 'إضافة محامٍ / كاتب' : isEn ? 'Add Legal Staff' : 'Nouveau Juriste / Clerc'}
    />
  );
};
