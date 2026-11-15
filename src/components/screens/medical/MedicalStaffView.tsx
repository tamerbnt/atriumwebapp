import React from 'react';
import { ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StandardStaffScreen } from '../../common/staff/StandardStaffScreen';
import { StaffMember } from '../../../types/index';
import { HeartPulse, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export const MedicalStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'medical_clinic' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'الطبيب / الممارس' : isEn ? 'Doctor / Practitioner' : 'Praticien & Médecin',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white text-xs truncate">
              {member.fullName}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 truncate flex items-center gap-1.5">
              <span>{member.role}</span>
              {member.medicalSpecialty && (
                <>
                  <span>·</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium">{member.medicalSpecialty}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة التواجد بالعيادة' : isEn ? 'Clinical Status' : 'Statut Clinique',
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
                    ? 'في الفحص (متاح)'
                    : isEn
                    ? 'In Consultation'
                    : 'En Consultation'
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
      id: 'orderRegistrationNumber',
      header: isAr ? 'رقم عمادة الأطباء' : isEn ? 'Medical Order No.' : 'N° Ordre des Médecins',
      accessorKey: 'orderRegistrationNumber',
      cell: (member) => (
        <span className="text-xs font-mono text-black/70 dark:text-white/75">
          {member.orderRegistrationNumber || (isAr ? 'قيد التسجيل' : 'En cours')}
        </span>
      ),
    },
    {
      id: 'canPrescribe',
      header: isAr ? 'صلاحية الوصفات CNAS' : isEn ? 'Prescription Rights' : 'Habilitation Ordonnance',
      accessorKey: 'canPrescribe',
      cell: (member) => (
        <div className="flex items-center gap-1.5">
          {member.canPrescribe ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={13} />
              <span>{isAr ? 'معتمد' : 'Agréé CNAS'}</span>
            </span>
          ) : (
            <span className="text-[11px] text-black/55 dark:text-white/55">
              {isAr ? 'غير مصرح' : 'Non prescripteur'}
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
        <span className="text-xs text-black/70 dark:text-white/75 tabular-nums">
          {member.phoneNumber || '—'}
        </span>
      ),
    },
  ];

  return (
    <StandardStaffScreen
      foundation={foundation}
      category="medical_clinic"
      columns={columns}
      categoryTitle={isAr ? 'الطاقم الطبي وشبه الطبي' : isEn ? 'Medical & Clinical Staff' : 'Corps Médical & Soignants'}
      newStaffButtonLabel={isAr ? 'إضافة طبيب / ممارس' : isEn ? 'Add Practitioner' : 'Nouveau Praticien'}
    />
  );
};
