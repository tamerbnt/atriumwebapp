import React from 'react';
import { Users, Plus } from 'lucide-react';
import { formatMoney } from '../../../utils/rules';
import { ScreenHeaderBar, ScreenKpiBanner } from '../../ui/kinetic';
import { StaffLifecycleStatus } from '../../../types/index';

interface StaffHeaderTrayProps {
  totalStaffCount: number;
  activeCount: number;
  onLeaveCount: number;
  frozenCount: number;
  presentPercentage: number;
  todayPresentCount: number;
  totalMonthlyPayroll: number;
  isOwnerViewer: boolean;
  metricLabel: string | { labelFr: string; labelEn: string; labelAr: string; unit?: string };
  language: string;
  categoryTitle?: string;
  headerTitle?: string;
  headerIcon?: React.ReactNode;
  onOpenCreate?: () => void;
  canCreate?: boolean;
  newStaffButtonLabel?: string;
  statusFilter?: 'all' | StaffLifecycleStatus;
  onStatusFilterChange?: (next: 'all' | StaffLifecycleStatus) => void;
}

export const StaffHeaderTray: React.FC<StaffHeaderTrayProps> = React.memo(({
  totalStaffCount,
  activeCount,
  onLeaveCount,
  frozenCount,
  presentPercentage,
  todayPresentCount,
  totalMonthlyPayroll,
  isOwnerViewer,
  metricLabel,
  language,
  categoryTitle,
  headerTitle,
  headerIcon,
  onOpenCreate,
  canCreate = false,
  newStaffButtonLabel,
  statusFilter = 'all',
  onStatusFilterChange,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const resolvedMetricLabel =
    typeof metricLabel === 'string'
      ? metricLabel
      : isAr
      ? metricLabel?.labelAr
      : isEn
      ? metricLabel?.labelEn
      : metricLabel?.labelFr;

  const activePct = totalStaffCount > 0 ? Math.round((activeCount / totalStaffCount) * 100) : 0;

  const resolvedPageTitle =
    headerTitle ||
    (isAr ? 'الفريق والموارد' : isEn ? 'Team & Staff' : 'Équipe');

  const resolvedBannerHeading =
    categoryTitle ||
    (isAr ? 'فريق العمل ومؤشرات الحضور' : isEn ? 'Workforce & Operational Health' : 'Effectif & Santé Opérationnelle');

  return (
    <div className="flex flex-col gap-[var(--ph-mb,24px)]">
      <ScreenHeaderBar
        icon={headerIcon || <Users size={24} strokeWidth={2} />}
        title={resolvedPageTitle}
        primaryAction={
          onOpenCreate && canCreate
            ? {
                label:
                  newStaffButtonLabel ||
                  (isAr ? 'إضافة موظف' : isEn ? 'Add Staff' : 'Nouveau Collaborateur'),
                icon: <Plus size={16} strokeWidth={1.5} />,
                onClick: onOpenCreate,
              }
            : undefined
        }
      />

      <ScreenKpiBanner
        heading={resolvedBannerHeading}
        language={language}
        primaryCard={{
          label: isAr ? 'قاعدة الفريق النشطة' : isEn ? 'Active Staff Base' : 'Base active collaborateurs',
          badgeText: `↗ ${activePct}% ${isAr ? 'نشط' : isEn ? 'active' : 'Actifs'}`,
          count: activeCount,
          tone: 'emerald',
          isActive: statusFilter === 'active',
          onToggle: onStatusFilterChange
            ? () => onStatusFilterChange(statusFilter === 'active' ? 'all' : 'active')
            : undefined,
          title: isAr ? 'تصفية النشطين' : isEn ? 'Filter active staff' : 'Filtrer les collaborateurs actifs',
        }}
        secondaryCard={{
          label: isAr ? 'حضور اليوم' : isEn ? "Today's Attendance" : 'Pointage du Jour',
          badgeText: `${isAr ? 'حاضرون' : isEn ? 'present' : 'présents'} · ${presentPercentage}%`,
          count: todayPresentCount,
          tone: 'terracotta',
          isActive: statusFilter === 'on_leave',
          onToggle: onStatusFilterChange
            ? () => onStatusFilterChange(statusFilter === 'on_leave' ? 'all' : 'on_leave')
            : undefined,
          title: isAr ? 'عرض الإجازات / الحضور' : isEn ? 'Filter staff on leave' : 'Voir congés / pointage',
        }}
        darkCard={
          isOwnerViewer
            ? {
                label: isAr ? 'الكتلة الأجرية الشهرية' : isEn ? 'Monthly Payroll Budget' : 'Masse Salariale Mensuelle',
                badgePrefix: '',
                badgeCount: totalStaffCount,
                badgeSuffix: isAr ? 'عضو' : isEn ? 'staff' : 'agents',
                valuePrefix: '',
                valueCount: totalMonthlyPayroll,
                valueSuffix: ' DZD',
                formatValue: (n) => formatMoney(n),
                caption: isAr
                  ? `${onLeaveCount} عطلة · ${frozenCount} موقوف`
                  : isEn
                  ? `${onLeaveCount} on leave · ${frozenCount} paused`
                  : `${onLeaveCount} en congé · ${frozenCount} gelé(s) · Virement le 28`,
              }
            : {
                label: isAr ? 'مؤشر الأداء العام' : isEn ? 'Operational Score' : 'Indice de Performance',
                badgePrefix: '',
                badgeCount: totalStaffCount,
                badgeSuffix: isAr ? 'عضو' : isEn ? 'staff' : 'agents',
                valuePrefix: '',
                valueCount: presentPercentage,
                valueSuffix: '%',
                caption: resolvedMetricLabel || (isAr ? 'مقيد للإدارة' : isEn ? 'Restricted payroll' : 'Paie restreinte'),
              }
        }
      />
    </div>
  );
});

StaffHeaderTray.displayName = 'StaffHeaderTray';
