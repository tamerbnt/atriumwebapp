import React, { useMemo } from 'react';
import {
  Kanban,
  Layers,
  Radio,
  Users,
  Wallet,
  FileText,
  ShoppingBag,
  Sparkles,
  Clock,
  ShieldCheck,
  Calendar,
  DoorOpen,
  Briefcase,
  Timer,
  Boxes,
  Truck,
  Building2,
  ClipboardList,
  Receipt,
} from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
  selectCurrentPmProjectsFromState,
  selectCurrentPmPrintOrdersFromState,
  selectCurrentPmBatDeliverablesFromState,
  selectCurrentPmTalentsFromState,
  selectCurrentPmMissionsFromState,
  selectCurrentPmAttendancesFromState,
  selectCurrentPmExpensesFromState,
  selectCurrentPmPayrollBatchesFromState,
  selectCurrentPmCcpSlipsFromState,
  selectCurrentPmEquipmentStockFromState,
  selectCurrentRentableUnitsFromState,
  selectCurrentRentalBookingsFromState,
  selectCurrentRentalRentersFromState,
  selectCurrentSecurityDepositsFromState,
  selectCurrentFreelanceClientsFromState,
  selectCurrentFreelanceProjectsFromState,
  selectCurrentTimeLogsFromState,
  selectCurrentFreelanceInvoicesFromState,
  selectCurrentFreelanceProposalsFromState,
  selectCurrentFreelanceExpensesFromState,
  selectCurrentB2bClientsFromState,
  selectCurrentWarehousesFromState,
  selectCurrentCommercialDocsFromState,
  selectCurrentPurchaseDocsFromState,
  selectCurrentProductsFromState,
  setScreenAction,
  setActivePmSubScreenAction,
  useTimerSelector,
  type ActiveScreen,
} from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import {
  HomeShell,
  HomeHeroRow,
  HomeOperationalRow,
  HomeLiveHistoryPod,
  HomeSetupPod,
  HomePreviewCard,
  HomeAnchorCard,
  HomePreviewRow,
  HomeQuickAction,
  type HomePreviewCardConfig,
  CATEGORY_HOME_RATIO,
  l3,
} from '../../common/home';
import {
  buildFreelanceHistorique,
  buildProjectMilestoneHistorique,
  buildTradingHistorique,
  buildVenueHistorique,
} from './homeActivityAdapters';
import type { HomeViewProps } from './CoreServiceHomeViews';

// ============================================================================
// 5. PROJECT & MILESTONE / AGENCY (project_milestone) — 6 Roles — 4-Row Home
// ============================================================================
export const ProjectHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const {
    role,
    currency,
    branchName,
    projects,
    printOrders,
    bats,
    talents,
    missions,
    attendances,
    expenses,
    payrollBatches,
    ccpSlips,
    equipment,
  } = useAtriumSelector(
    (s) => ({
      role: s.activePmRole || 'direction',
      currency: selectCurrentBusinessConfigFromState(s).currency || 'DZD',
      branchName: selectCurrentBranchFromState(s)?.name || 'Agence',
      projects: selectCurrentPmProjectsFromState(s),
      printOrders: selectCurrentPmPrintOrdersFromState(s),
      bats: selectCurrentPmBatDeliverablesFromState(s),
      talents: selectCurrentPmTalentsFromState(s),
      missions: selectCurrentPmMissionsFromState(s),
      attendances: selectCurrentPmAttendancesFromState(s),
      expenses: selectCurrentPmExpensesFromState(s),
      payrollBatches: selectCurrentPmPayrollBatchesFromState(s),
      ccpSlips: selectCurrentPmCcpSlipsFromState(s),
      equipment: selectCurrentPmEquipmentStockFromState(s),
    }),
    shallowEqualObjects
  );

  const pendingApprovals = useMemo(
    () =>
      expenses.filter((e) => e.status === 'pending_direction_approval').length +
      payrollBatches.filter((b) => b.status === 'pending_direction_approval').length,
    [expenses, payrollBatches]
  );

  const projectRows: HomePreviewRow[] = useMemo(
    () =>
      projects.slice(0, 4).map((p) => ({
        id: p.id,
        primary: p.title,
        secondary: [p.clientName, p.projectManagerName].filter(Boolean).join(' · '),
        trailing: formatMoney(p.budgetCapDzd, currency),
        statusTone: p.status === 'closed' || p.status === 'completed' ? 'neutral' : 'positive',
      })),
    [projects, currency]
  );

  const batRows: HomePreviewRow[] = useMemo(
    () =>
      bats.slice(0, 4).map((b) => ({
        id: b.id,
        primary: b.title,
        secondary: [b.projectTitle, b.versionCode, `${b.resolutionDpi} DPI`].filter(Boolean).join(' · '),
        trailing:
          b.approvalStatus === 'approved'
            ? l3(language, 'Validé', 'Approved', 'معتمد')
            : b.approvalStatus === 'revision_requested'
            ? l3(language, 'Révision', 'Revision', 'مراجعة')
            : l3(language, 'En revue', 'Pending', 'قيد المراجعة'),
        statusTone:
          b.approvalStatus === 'approved'
            ? 'positive'
            : b.approvalStatus === 'revision_requested'
            ? 'danger'
            : 'warning',
      })),
    [bats, language]
  );

  const printRows: HomePreviewRow[] = useMemo(
    () =>
      printOrders.slice(0, 3).map((po) => ({
        id: po.id,
        primary: `${po.orderNumber} · ${po.projectTitle}`,
        secondary: `${po.items?.length || 0} ${l3(language, 'supports', 'items', 'عناصر')}`,
        trailing: formatMoney(po.totalCostDzd, currency),
        statusTone: po.status === 'delivered' ? 'positive' : 'warning',
      })),
    [printOrders, currency, language]
  );

  const missionRows: HomePreviewRow[] = useMemo(
    () =>
      missions.slice(0, 4).map((m) => ({
        id: m.id,
        primary: `${m.code} · ${m.title}`,
        secondary: [m.wilayaName, m.venueName, `${m.requiredStaffCount} pers.`].filter(Boolean).join(' · '),
        trailing: m.dailyStartHour,
        statusTone: m.status === 'live_today' ? 'positive' : m.status === 'cancelled' ? 'danger' : 'warning',
      })),
    [missions]
  );

  const talentRows: HomePreviewRow[] = useMemo(
    () =>
      talents.slice(0, 4).map((t) => ({
        id: t.id,
        primary: t.fullName,
        secondary: [t.wilayaName, t.desiredRoles?.slice(0, 2).join(', ')].filter(Boolean).join(' · '),
        trailing: `${t.consolidatedScore?.toFixed(1) || '4.5'}/5`,
        statusTone: t.isHrVerified ? 'positive' : 'warning',
      })),
    [talents]
  );

  const payrollRows: HomePreviewRow[] = useMemo(
    () =>
      payrollBatches.slice(0, 4).map((b) => ({
        id: b.id,
        primary: b.batchNumber,
        secondary: [b.projectTitle, `${b.totalBeneficiaries} ${l3(language, 'bénéf.', 'payees', 'مستفيد')}`].join(' · '),
        trailing: formatMoney(b.totalAmountDzd, currency),
        statusTone: b.status === 'disbursed' ? 'positive' : 'warning',
      })),
    [payrollBatches, currency, language]
  );

  const expenseRows: HomePreviewRow[] = useMemo(
    () =>
      expenses.slice(0, 4).map((e) => ({
        id: e.id,
        primary: e.title,
        secondary: [e.projectTitle, e.declaredByUserName].filter(Boolean).join(' · '),
        trailing: formatMoney(e.amountDzd, currency),
        statusTone:
          e.status === 'approved_by_direction' || e.status === 'audited_and_paid'
            ? 'positive'
            : e.status === 'rejected'
            ? 'danger'
            : 'warning',
      })),
    [expenses, currency]
  );

  const roleConfig = useMemo<{
    dashboardTarget: 'pm_dir_dashboard' | null;
    anchor: {
      title: string;
      value: number;
      badgeText: string;
      targetScreen: ActiveScreen;
      targetPmSubScreen: string;
    };
    priorityCard: HomePreviewCardConfig;
    primaryCards: HomePreviewCardConfig[];
    quickActions: HomeQuickAction[];
  }>(() => {
    const goPm = (screen: Parameters<typeof setScreenAction>[0], sub: string) => {
      setScreenAction(screen);
      setActivePmSubScreenAction(sub);
    };

    if (role === 'chef_projet') {
      return {
        dashboardTarget: null,
        anchor: {
          title: l3(language, 'Portefeuille Projets', 'Managed Projects', 'محفظة المشاريع'),
          value: projects.length,
          badgeText: `${printOrders.length} ${l3(language, 'impressions', 'print orders', 'طباعة')}`,
          targetScreen: 'pm_cp_projects',
          targetPmSubScreen: 'portfolio',
        },
        priorityCard: {
          id: 'pm-cp-catalog',
          title: l3(language, 'Catalogue PLV & Stands', 'Collateral Catalog', 'كتالوج الدعامات'),
          subtitle: l3(language, 'Supports événementiels & tarifs', 'Event collateral & POS specs', 'المعدات والمواصفات'),
          icon: <ShoppingBag size={18} />,
          count: printOrders.length,
          items: printRows,
          targetScreen: 'pm_cp_catalog',
          targetPmSubScreen: 'catalog',
          emptyTitle: l3(language, 'Aucune commande catalogue.', 'No collateral orders.', 'لا توجد طلبات طباعة.'),
          emptyCtaLabel: l3(language, 'Ouvrir catalogue', 'Open catalog', 'فتح الكتالوج'),
        },
        primaryCards: [
          {
            id: 'pm-cp-projects',
            title: l3(language, 'Mes Projets & Jalons', 'Project Portfolio', 'المشاريع والمراحل'),
            subtitle: l3(language, 'Cahiers des charges & avancement', 'Campaigns & milestones', 'متابعة الحملات'),
            icon: <Kanban size={18} />,
            count: projects.length,
            items: projectRows,
            targetScreen: 'pm_cp_projects',
            targetPmSubScreen: 'portfolio',
            emptyTitle: l3(language, 'Aucun projet actif.', 'No active projects.', 'لا توجد مشاريع نشطة.'),
            emptyCtaLabel: l3(language, 'Voir projets', 'View projects', 'عرض المشاريع'),
          },
          {
            id: 'pm-cp-orders',
            title: l3(language, 'Commandes Impression', 'Print Orders', 'طلبات الطباعة'),
            subtitle: l3(language, 'Production PLV & délais', 'Vendor orders & delivery', 'متابعة الموردين والتسليم'),
            icon: <Sparkles size={18} />,
            count: printOrders.length,
            items: printRows,
            targetScreen: 'pm_cp_orders',
            targetPmSubScreen: 'orders',
            emptyTitle: l3(language, 'Aucune commande en cours.', 'No print orders yet.', 'لا توجد طلبات طباعة.'),
            emptyCtaLabel: l3(language, 'Nouvelle commande', 'Create order', 'إنشاء طلب'),
          },
          {
            id: 'pm-cp-bat',
            title: l3(language, 'Livrables & BAT', 'BAT Deliverables', 'الملفات والموافقات'),
            subtitle: l3(language, 'Validation fichiers créa 300 DPI', 'Print-ready proofs', 'مراجعة التصاميم'),
            icon: <FileText size={18} />,
            count: bats.length,
            items: batRows,
            targetScreen: 'pm_cp_files',
            targetPmSubScreen: 'bat',
            emptyTitle: l3(language, 'Aucun BAT soumis.', 'No BAT proofs yet.', 'لا توجد ملفات مرسلة.'),
            emptyCtaLabel: l3(language, 'Ouvrir BAT', 'Review BAT', 'مراجعة الملفات'),
          },
          {
            id: 'pm-cp-expenses',
            title: l3(language, 'Notes de Frais Projet', 'Project Expenses', 'مصاريف المشاريع'),
            subtitle: l3(language, 'Suivi des budgets terrain', 'Field spend tracking', 'مراقبة ميزانية الميدان'),
            icon: <Wallet size={18} />,
            count: expenses.length,
            items: expenseRows,
            targetScreen: 'pm_cp_expenses',
            targetPmSubScreen: 'expenses',
            emptyTitle: l3(language, 'Aucune note de frais.', 'No project expenses.', 'لا توجد مصاريف.'),
            emptyCtaLabel: l3(language, 'Saisir dépense', 'Log expense', 'إضافة مصروف'),
          },
        ],
        quickActions: [
          {
            id: 'cp-projects',
            label: l3(language, 'Portefeuille Projets', 'Open portfolio', 'فتح المشاريع'),
            icon: <Kanban size={15} />,
            onClick: () => goPm('pm_cp_projects', 'portfolio'),
          },
          {
            id: 'cp-orders',
            label: l3(language, 'Commander PLV', 'New print order', 'طلب طباعة'),
            icon: <Sparkles size={15} />,
            onClick: () => goPm('pm_cp_orders', 'orders'),
          },
        ],
      };
    }

    if (role === 'crea') {
      return {
        dashboardTarget: null,
        anchor: {
          title: l3(language, 'Livrables BAT Studio', 'Studio BAT Proofs', 'ملفات الاستوديو'),
          value: bats.length,
          badgeText: `${bats.filter((b) => b.approvalStatus === 'revision_requested').length} ${l3(language, 'révisions', 'revisions', 'تعديلات')}`,
          targetScreen: 'pm_crea_kanban',
          targetPmSubScreen: 'demandes',
        },
        priorityCard: {
          id: 'pm-crea-briefs',
          title: l3(language, 'Briefs Créatifs', 'Client Briefs', 'موجزات العملاء'),
          subtitle: l3(language, 'Cahiers des charges & KPI créa', 'Project briefs', 'متطلبات التصاميم'),
          icon: <FileText size={18} />,
          count: projects.length,
          items: projectRows.slice(0, 3),
          targetScreen: 'pm_crea_briefs',
          targetPmSubScreen: 'briefs',
          emptyTitle: l3(language, 'Aucun brief actif.', 'No active briefs.', 'لا توجد موجزات.'),
          emptyCtaLabel: l3(language, 'Lire briefs', 'Open briefs', 'عرض الموجزات'),
        },
        primaryCards: [
          {
            id: 'pm-crea-kanban',
            title: l3(language, 'File des Demandes', 'Studio Kanban', 'طابور الطلبات'),
            subtitle: l3(language, 'Briefs entrants & priorités', 'Incoming creative tasks', 'الطلبات الواردة'),
            icon: <Layers size={18} />,
            count: printOrders.length,
            items: printRows,
            targetScreen: 'pm_crea_kanban',
            targetPmSubScreen: 'demandes',
            emptyTitle: l3(language, 'Aucune demande créa.', 'No incoming requests.', 'لا توجد طلبات حالية.'),
            emptyCtaLabel: l3(language, 'Voir demandes', 'Open queue', 'فتح الطابور'),
          },
          {
            id: 'pm-crea-production',
            title: l3(language, 'Production en Cours', 'In Production', 'قيد الإنتاج'),
            subtitle: l3(language, 'Maquettes & rendus 300 DPI', 'Active artworks', 'التصاميم الجارية'),
            icon: <Sparkles size={18} />,
            count: bats.length,
            items: batRows,
            targetScreen: 'pm_crea_production',
            targetPmSubScreen: 'production',
            emptyTitle: l3(language, 'Aucun rendu en cours.', 'No artworks in progress.', 'لا توجد تصاميم قيد العمل.'),
            emptyCtaLabel: l3(language, 'Voir production', 'Open studio', 'فتح الاستوديو'),
          },
          {
            id: 'pm-crea-upload',
            title: l3(language, 'Dépôt Livrables BAT', 'Upload Final Proofs', 'رفع الملفات النهائية'),
            subtitle: l3(language, 'Export CMJN, fonds perdus 3mm', 'CMYK deliverables', 'التسليمات النهائية'),
            icon: <FileText size={18} />,
            count: bats.filter((b) => b.approvalStatus === 'pending_review').length,
            items: batRows,
            targetScreen: 'pm_crea_upload',
            targetPmSubScreen: 'upload',
            emptyTitle: l3(language, 'Aucun fichier déposé.', 'No files uploaded yet.', 'لم يتم رفع ملفات.'),
            emptyCtaLabel: l3(language, 'Déposer un BAT', 'Upload proof', 'رفع ملف'),
          },
        ],
        quickActions: [
          {
            id: 'crea-kanban',
            label: l3(language, 'Ouvrir Kanban Créa', 'Open Studio Kanban', 'فتح لوحة التصميم'),
            icon: <Layers size={15} />,
            onClick: () => goPm('pm_crea_kanban', 'demandes'),
          },
          {
            id: 'crea-upload',
            label: l3(language, 'Déposer un BAT', 'Upload BAT proof', 'رفع نسخة نهائية'),
            icon: <FileText size={15} />,
            onClick: () => goPm('pm_crea_upload', 'upload'),
          },
        ],
      };
    }

    if (role === 'superviseur') {
      return {
        dashboardTarget: null,
        anchor: {
          title: l3(language, 'Missions Terrain', 'Field Activations', 'المهمات الميدانية'),
          value: missions.length,
          badgeText: `${missions.filter((m) => m.status === 'live_today').length} ${l3(language, 'en direct', 'live', 'مباشرة')}`,
          targetScreen: 'pm_sup_missions',
          targetPmSubScreen: 'missions',
        },
        priorityCard: {
          id: 'pm-sup-expenses',
          title: l3(language, 'Frais Terrain', 'Field Expenses', 'مصاريف الميدان'),
          subtitle: l3(language, 'Justificatifs et transport', 'On-site disbursements', 'فواتير التنقل والميدان'),
          icon: <Wallet size={18} />,
          count: expenses.length,
          items: expenseRows.slice(0, 3),
          targetScreen: 'pm_sup_expenses',
          targetPmSubScreen: 'expense',
          emptyTitle: l3(language, 'Aucun frais déclaré.', 'No expenses logged.', 'لا توجد مصاريف.'),
          emptyCtaLabel: l3(language, 'Déclarer frais', 'Log expense', 'تسجيل مصروف'),
        },
        primaryCards: [
          {
            id: 'pm-sup-missions',
            title: l3(language, 'Opérations & Sites', 'Field Missions', 'العمليات والمواقع'),
            subtitle: l3(language, 'Roadshows & points de vente', 'Live activations & venues', 'الحملات ونقاط البيع'),
            icon: <Radio size={18} />,
            count: missions.length,
            items: missionRows,
            targetScreen: 'pm_sup_missions',
            targetPmSubScreen: 'missions',
            emptyTitle: l3(language, 'Aucune mission planifiée.', 'No field missions yet.', 'لا توجد مهمات ميدانية.'),
            emptyCtaLabel: l3(language, 'Voir missions', 'Open missions', 'عرض المهمات'),
          },
          {
            id: 'pm-sup-attendance',
            title: l3(language, 'Pointage Équipes', 'Roll Call Logs', 'سجل الحضور الميداني'),
            subtitle: l3(language, 'Présences & remplacements', 'Shift check-ins', 'تسجيل دخول المنشطين'),
            icon: <Clock size={18} />,
            count: attendances.length,
            items: attendances.slice(0, 4).map((a) => ({
              id: a.id,
              primary: a.talentName,
              secondary: [a.date, a.checkInTime].filter(Boolean).join(' · '),
              trailing: formatMoney(a.grossPayableDzd, currency),
              statusTone: a.status === 'present' ? 'positive' : a.status === 'late' ? 'warning' : 'danger',
            })),
            targetScreen: 'pm_sup_attendance',
            targetPmSubScreen: 'attendance',
            emptyTitle: l3(language, 'Aucun pointage saisi.', 'No attendance logs yet.', 'لا توجد سجلات حضور.'),
            emptyCtaLabel: l3(language, 'Faire le pointage', 'Open roll call', 'فتح كشف الحضور'),
          },
          {
            id: 'pm-sup-staffing',
            title: l3(language, 'Affectation Staff', 'Team Staffing', 'تعيين الطواقم'),
            subtitle: l3(language, 'Animateurs confirmés & standby', 'Crew assignments', 'المنشطون المكلفون'),
            icon: <Users size={18} />,
            count: talents.length,
            items: talentRows.slice(0, 3),
            targetScreen: 'pm_sup_staffing',
            targetPmSubScreen: 'staffing',
            emptyTitle: l3(language, 'Aucune équipe affectée.', 'No crew assigned yet.', 'لا توجد تعيينات.'),
            emptyCtaLabel: l3(language, 'Gérer équipes', 'Assign crew', 'إدارة الطواقم'),
          },
        ],
        quickActions: [
          {
            id: 'sup-missions',
            label: l3(language, 'Missions du jour', 'Today missions', 'مهمات اليوم'),
            icon: <Radio size={15} />,
            onClick: () => goPm('pm_sup_missions', 'missions'),
          },
          {
            id: 'sup-attendance',
            label: l3(language, 'Pointage terrain', 'Field roll call', 'تسجيل الحضور'),
            icon: <Clock size={15} />,
            onClick: () => goPm('pm_sup_attendance', 'attendance'),
          },
        ],
      };
    }

    if (role === 'rh') {
      return {
        dashboardTarget: null,
        anchor: {
          title: l3(language, 'Vivier des Talents', 'Verified Talent Pool', 'بنك المواهب'),
          value: talents.length,
          badgeText: `${talents.filter((t) => t.isHrVerified).length} ${l3(language, 'vérifiés', 'verified', 'موثق')}`,
          targetScreen: 'pm_rh_talents',
          targetPmSubScreen: 'talents',
        },
        priorityCard: {
          id: 'pm-rh-walkin',
          title: l3(language, 'Entretiens & Accueil RH', 'Walk-in Candidates', 'مقابلات التوظيف'),
          subtitle: l3(language, 'Candidats à évaluer', 'Intake & screening', 'ملفات بانتظار التقييم'),
          icon: <DoorOpen size={18} />,
          count: talents.filter((t) => t.status === 'in_review').length,
          items: talentRows.filter((r) => r.statusTone === 'warning').slice(0, 3),
          targetScreen: 'pm_rh_walkin',
          targetPmSubScreen: 'walkin',
          emptyTitle: l3(language, 'Aucun candidat en attente.', 'No pending interviews.', 'لا توجد مقابلات منتظرة.'),
          emptyCtaLabel: l3(language, 'Ouvrir accueil RH', 'Open intake', 'فتح الاستقبال'),
        },
        primaryCards: [
          {
            id: 'pm-rh-talents',
            title: l3(language, 'Base Animateurs & Hôtesses', 'Talent Directory', 'دليل المنشطين'),
            subtitle: l3(language, 'Notes, wilayas & CCP', 'Scores & regional roster', 'التقييمات والولايات'),
            icon: <Users size={18} />,
            count: talents.length,
            items: talentRows,
            targetScreen: 'pm_rh_talents',
            targetPmSubScreen: 'talents',
            emptyTitle: l3(language, 'Vivier vide.', 'No talents registered.', 'قاعدة المواهب فارغة.'),
            emptyCtaLabel: l3(language, 'Ajouter un profil', 'Add talent', 'إضافة منشط'),
          },
          {
            id: 'pm-rh-dossier',
            title: l3(language, 'Dossiers & CNI / CCP', 'Dossiers & Compliance', 'الملفات الإدارية'),
            subtitle: l3(language, 'Pièces d’identité & RIB CCP', 'ID cards & bank slips', 'وثائق الهوية والحساب البريدي'),
            icon: <FileText size={18} />,
            count: talents.length,
            items: talentRows.slice(0, 3),
            targetScreen: 'pm_rh_dossier',
            targetPmSubScreen: 'dossier',
            emptyTitle: l3(language, 'Aucun dossier.', 'No dossiers yet.', 'لا توجد ملفات.'),
            emptyCtaLabel: l3(language, 'Voir dossiers', 'Open dossiers', 'فتح الملفات'),
          },
          {
            id: 'pm-rh-portal',
            title: l3(language, 'Portail Formation', 'Onboarding Portal', 'بوابة التكوين'),
            subtitle: l3(language, 'Briefings & certifications', 'Training modules', 'التكوينات والشهادات'),
            icon: <Calendar size={18} />,
            count: missions.length,
            items: missionRows.slice(0, 3),
            targetScreen: 'pm_rh_portal',
            targetPmSubScreen: 'portal',
            emptyTitle: l3(language, 'Aucune session active.', 'No active training.', 'لا توجد دورات.'),
            emptyCtaLabel: l3(language, 'Ouvrir portail', 'Open portal', 'فتح البوابة'),
          },
        ],
        quickActions: [
          {
            id: 'rh-talents',
            label: l3(language, 'Annuaire des talents', 'Talent roster', 'قائمة المواهب'),
            icon: <Users size={15} />,
            onClick: () => goPm('pm_rh_talents', 'talents'),
          },
          {
            id: 'rh-walkin',
            label: l3(language, 'Nouvel entretien', 'Walk-in screening', 'تسجيل مرشح'),
            icon: <DoorOpen size={15} />,
            onClick: () => goPm('pm_rh_walkin', 'walkin'),
          },
        ],
      };
    }

    if (role === 'compta') {
      return {
        dashboardTarget: null,
        anchor: {
          title: l3(language, 'Lots Paie & CCP', 'Payroll Batches', 'حزم الأجور'),
          value: payrollBatches.length,
          badgeText: `${ccpSlips.length} ${l3(language, 'fiches CCP', 'CCP slips', 'كشوف بريدية')}`,
          targetScreen: 'pm_compta_payroll',
          targetPmSubScreen: 'payroll',
        },
        priorityCard: {
          id: 'pm-compta-stock',
          title: l3(language, 'Stock Matériel', 'Equipment Inventory', 'مخزون العتاد'),
          subtitle: l3(language, 'Tenues, totems & sonorisation', 'Field kit allocation', 'التجهيزات والعتاد'),
          icon: <Boxes size={18} />,
          count: equipment.length,
          items: equipment.slice(0, 3).map((eq) => ({
            id: eq.id,
            primary: eq.title,
            secondary: [eq.assetCode, eq.category].filter(Boolean).join(' · '),
            trailing:
              eq.currentStatus === 'in_stock'
                ? l3(language, 'En stock', 'In stock', 'متوفر')
                : eq.currentStatus === 'deployed_on_mission'
                ? l3(language, 'En mission', 'Deployed', 'في مهمة')
                : l3(language, 'Maintenance', 'Maintenance', 'صيانة'),
            statusTone: eq.currentStatus === 'in_stock' ? 'positive' : 'warning',
          })),
          targetScreen: 'pm_compta_stock',
          targetPmSubScreen: 'stock',
          emptyTitle: l3(language, 'Aucun équipement suivi.', 'No equipment tracked.', 'لا يوجد عتاد مسجل.'),
          emptyCtaLabel: l3(language, 'Voir stock', 'View equipment', 'عرض المخزون'),
        },
        primaryCards: [
          {
            id: 'pm-compta-payroll',
            title: l3(language, 'Paie Missions', 'Mission Payroll', 'رواتب المهمات'),
            subtitle: l3(language, 'Lots validés pour virement', 'Disbursement batches', 'دفعات الأجور'),
            icon: <Wallet size={18} />,
            count: payrollBatches.length,
            items: payrollRows,
            targetScreen: 'pm_compta_payroll',
            targetPmSubScreen: 'payroll',
            emptyTitle: l3(language, 'Aucun lot de paie.', 'No payroll batches.', 'لا توجد حزم أجور.'),
            emptyCtaLabel: l3(language, 'Ouvrir paie', 'Open payroll', 'فتح الأجور'),
          },
          {
            id: 'pm-compta-ccp',
            title: l3(language, 'Bordereaux CCP / Algérie Poste', 'CCP Postal Slips', 'حوالات البريد CCP'),
            subtitle: l3(language, 'Virements animateurs', 'Postal bank transfers', 'التحويلات البريدية'),
            icon: <FileText size={18} />,
            count: ccpSlips.length,
            items: ccpSlips.slice(0, 4).map((c) => ({
              id: c.id,
              primary: c.beneficiaryName,
              secondary: `CCP ${c.ccpNumber}-${c.ccpKey}`,
              trailing: formatMoney(c.amountDzd, currency),
              statusTone: 'positive',
            })),
            targetScreen: 'pm_compta_ccp',
            targetPmSubScreen: 'ccp',
            emptyTitle: l3(language, 'Aucun bordereau CCP.', 'No CCP slips generated.', 'لا توجد حوالات.'),
            emptyCtaLabel: l3(language, 'Générer CCP', 'Open CCP', 'فتح الحوالات'),
          },
          {
            id: 'pm-compta-expenses',
            title: l3(language, 'Audit Notes de Frais', 'Audited Expenses', 'تدقيق المصاريف'),
            subtitle: l3(language, 'Justificatifs NIF & remboursements', 'Fiscal compliance', 'المراقبة المالية'),
            icon: <Receipt size={18} />,
            count: expenses.length,
            items: expenseRows,
            targetScreen: 'pm_compta_expenses',
            targetPmSubScreen: 'expenses',
            emptyTitle: l3(language, 'Aucune dépense.', 'No expenses.', 'لا توجد مصاريف.'),
            emptyCtaLabel: l3(language, 'Auditer frais', 'Audit expenses', 'تدقيق المصاريف'),
          },
        ],
        quickActions: [
          {
            id: 'compta-payroll',
            label: l3(language, 'Traiter la paie', 'Run payroll', 'معالجة الرواتب'),
            icon: <Wallet size={15} />,
            onClick: () => goPm('pm_compta_payroll', 'payroll'),
          },
          {
            id: 'compta-ccp',
            label: l3(language, 'Bordereaux CCP', 'Generate CCP', 'إعداد الحوالات'),
            icon: <FileText size={15} />,
            onClick: () => goPm('pm_compta_ccp', 'ccp'),
          },
        ],
      };
    }

    // Default: direction
    return {
      dashboardTarget: 'pm_dir_dashboard',
      anchor: {
        title: l3(language, 'Validations en Attente', 'Pending Approvals', 'بانتظار الموافقة'),
        value: pendingApprovals,
        badgeText: `${projects.length} ${l3(language, 'projets', 'projects', 'مشروع')}`,
        targetScreen: 'pm_dir_dashboard',
        targetPmSubScreen: 'dashboard',
      },
      priorityCard: {
        id: 'pm-dir-approvals',
        title: l3(language, 'Circuit Approbations', 'Direction Approvals', 'اعتماد المدفوعات'),
        subtitle: l3(language, 'Frais & lots de paie à signer', 'Expenses & payroll sign-off', 'موافقات الصرف'),
        icon: <ShieldCheck size={18} />,
        count: pendingApprovals,
        items: expenseRows.slice(0, 3),
        targetScreen: 'pm_dir_approvals',
        targetPmSubScreen: 'approvals',
        emptyTitle: l3(language, 'Tout est validé.', 'No pending approvals.', 'لا توجد موافقات معلقة.'),
        emptyCtaLabel: l3(language, 'Voir historique', 'View approvals', 'عرض الموافقات'),
      },
      primaryCards: [
        {
          id: 'pm-dir-projects',
          title: l3(language, 'Projets & Campagnes', 'Agency Projects', 'المشاريع والحملات'),
          subtitle: l3(language, 'Budgets plafonds & chefs de projet', 'Caps & active campaigns', 'الميزانيات والمتابعة'),
          icon: <Kanban size={18} />,
          count: projects.length,
          items: projectRows,
          targetScreen: 'pm_dir_projects',
          targetPmSubScreen: 'dashboard',
          emptyTitle: l3(language, 'Aucun projet créé.', 'No projects created.', 'لا توجد مشاريع بعد.'),
          emptyCtaLabel: l3(language, 'Nouveau projet', 'New project', 'مشروع جديد'),
          onEmptyAction: () => goPm('pm_dir_new_project', 'new_project'),
        },
        {
          id: 'pm-dir-missions',
          title: l3(language, 'Missions Terrain Live', 'Field Activations', 'المهمات الميدانية'),
          subtitle: l3(language, 'Déploiements nationaux en cours', 'Regional field teams', 'التنفيذ الميداني'),
          icon: <Radio size={18} />,
          count: missions.length,
          items: missionRows,
          targetScreen: 'pm_sup_missions',
          targetPmSubScreen: 'missions',
          emptyTitle: l3(language, 'Aucune mission active.', 'No active missions.', 'لا توجد مهمات.'),
          emptyCtaLabel: l3(language, 'Voir missions', 'Open missions', 'فتح المهمات'),
        },
        {
          id: 'pm-dir-bat',
          title: l3(language, 'Studio Créa & BAT', 'Creative Studio & BAT', 'الاستوديو والتصاميم'),
          subtitle: l3(language, 'Validation maquettes et impressions', 'Proofs awaiting review', 'الملفات قيد المراجعة'),
          icon: <Layers size={18} />,
          count: bats.length,
          items: batRows,
          targetScreen: 'pm_crea_kanban',
          targetPmSubScreen: 'demandes',
          emptyTitle: l3(language, 'Aucun livrable BAT.', 'No BAT proofs yet.', 'لا توجد ملفات BAT.'),
          emptyCtaLabel: l3(language, 'Ouvrir studio', 'Open studio', 'فتح الاستوديو'),
        },
        {
          id: 'pm-dir-reports',
          title: l3(language, 'Rapports P&L & Marges', 'Executive P&L Reports', 'التقارير المالية'),
          subtitle: l3(language, 'Rentabilité par campagne', 'Campaign profitability', 'الربحية لكل مشروع'),
          icon: <FileText size={18} />,
          count: payrollBatches.length,
          items: payrollRows,
          targetScreen: 'pm_dir_reports',
          targetPmSubScreen: 'reports',
          emptyTitle: l3(language, 'Aucun rapport disponible.', 'No reports available.', 'لا توجد تقارير.'),
          emptyCtaLabel: l3(language, 'Ouvrir rapports', 'Open reports', 'فتح التقارير'),
        },
      ],
      quickActions: [
        {
          id: 'dir-new-project',
          label: l3(language, 'Nouveau projet', 'New project', 'مشروع جديد'),
          icon: <Kanban size={15} />,
          onClick: () => goPm('pm_dir_new_project', 'new_project'),
        },
        {
          id: 'dir-approvals',
          label: l3(language, 'File des validations', 'Approvals queue', 'قائمة الموافقات'),
          icon: <ShieldCheck size={15} />,
          onClick: () => goPm('pm_dir_approvals', 'approvals'),
        },
      ],
    };
  }, [
    role,
    language,
    currency,
    projects,
    printOrders,
    bats,
    talents,
    missions,
    attendances,
    expenses,
    payrollBatches,
    ccpSlips,
    equipment,
    pendingApprovals,
    projectRows,
    batRows,
    printRows,
    missionRows,
    talentRows,
    payrollRows,
    expenseRows,
  ]);

  const historique = useMemo(
    () =>
      buildProjectMilestoneHistorique({
        language,
        currency,
        branchName,
        role,
        projects,
        printOrders,
        bats,
        missions,
        attendances,
        expenses,
        payrollBatches,
      }),
    [language, currency, branchName, role, projects, printOrders, bats, missions, attendances, expenses, payrollBatches]
  );

  return (
    <HomeShell
      roleKey={role}
      quickActions={roleConfig.quickActions}
      dashboardTarget={roleConfig.dashboardTarget}
      onNavigateDashboard={
        roleConfig.dashboardTarget
          ? () => {
              setScreenAction('pm_dir_dashboard');
              setActivePmSubScreenAction('dashboard');
            }
          : undefined
      }
      testId={`home-project-${role}`}
    >
      <HomeHeroRow
        ratio={CATEGORY_HOME_RATIO.project_milestone}
        heroTitle={l3(language, 'Repères du Rôle', 'Role Anchor', 'مؤشرات الدور')}
        heroChildren={
          <HomeAnchorCard
            title={roleConfig.anchor.title}
            value={roleConfig.anchor.value}
            badgeText={roleConfig.anchor.badgeText}
            badgeVariant="orange"
            sublabel={l3(
              language,
              'Accès direct à l’espace principal de ce rôle',
              'Jump straight to your role workspace',
              'الانتقال المباشر إلى مساحة العمل الرئيسية'
            )}
            targetScreen={roleConfig.anchor.targetScreen}
            targetPmSubScreen={roleConfig.anchor.targetPmSubScreen}
          />
        }
        priorityTitle={l3(language, 'Priorités Immédiates', 'Role Priority Queue', 'الأولويات العاجلة')}
        priorityChildren={
          <HomePreviewCard config={{ ...roleConfig.priorityCard, tone: 'brown' }} />
        }
      />

      <HomeOperationalRow title={l3(language, 'Espaces Opérationnels', 'Agency Spaces', 'أقسام الوكالة')}>
        {roleConfig.primaryCards.map((card, idx) => (
          <HomePreviewCard
            key={card.id}
            config={{
              ...card,
              tone: card.tone || (idx === 0 ? 'terracotta' : idx % 2 === 1 ? 'lavender' : 'brown'),
            }}
          />
        ))}
      </HomeOperationalRow>

      <HomeLiveHistoryPod events={historique.events} filters={historique.filters} />

      <HomeSetupPod roleKey={role} />
    </HomeShell>
  );
};

// ============================================================================
// 6. VENUE & RENTALS (rental_booking) — 4-Row Bento Home
// ============================================================================
export const VenueHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { currency, branchName, units, bookings, renters, deposits } = useAtriumSelector(
    (s) => ({
      currency: selectCurrentBusinessConfigFromState(s).currency || 'DZD',
      branchName: selectCurrentBranchFromState(s)?.name || 'Espaces',
      units: selectCurrentRentableUnitsFromState(s),
      bookings: selectCurrentRentalBookingsFromState(s),
      renters: selectCurrentRentalRentersFromState(s),
      deposits: selectCurrentSecurityDepositsFromState(s),
    }),
    shallowEqualObjects
  );

  const heldDepositsTotal = useMemo(
    () => deposits.filter((d) => d.status === 'Held').reduce((sum, d) => sum + d.amount, 0),
    [deposits]
  );

  const bookingRows: HomePreviewRow[] = useMemo(
    () =>
      bookings.slice(0, 4).map((b) => ({
        id: b.id,
        primary: `${b.unitName} · ${b.renterName}`,
        secondary: [b.purpose, b.startDateTime?.slice(0, 10)].filter(Boolean).join(' · '),
        trailing: formatMoney(b.totalAmount, currency),
        statusTone: b.status === 'CheckedIn' || b.status === 'Confirmed' ? 'positive' : b.status === 'Cancelled' ? 'danger' : 'warning',
      })),
    [bookings, currency]
  );

  const unitRows: HomePreviewRow[] = useMemo(
    () =>
      units.slice(0, 4).map((u) => ({
        id: u.id,
        primary: `${u.code} · ${u.name}`,
        secondary: `${u.type} · ${u.capacity} pers.`,
        trailing: `${formatMoney(u.hourlyRate, currency)}/h`,
        statusTone: u.status === 'Available' ? 'positive' : u.status === 'Maintenance' ? 'danger' : 'warning',
      })),
    [units, currency]
  );

  const renterRows: HomePreviewRow[] = useMemo(
    () =>
      renters.slice(0, 3).map((r) => ({
        id: r.id,
        primary: r.fullName,
        secondary: [r.companyName, r.phone].filter(Boolean).join(' · '),
        trailing: `${r.totalBookings} rés.`,
        statusTone: 'neutral',
      })),
    [renters]
  );

  const depositRows: HomePreviewRow[] = useMemo(
    () =>
      deposits.slice(0, 3).map((d) => ({
        id: d.id,
        primary: d.renterName,
        secondary: [d.unitName, d.paymentMethod].join(' · '),
        trailing: formatMoney(d.amount, currency),
        statusTone: d.status === 'Held' ? 'warning' : d.status === 'Released' ? 'positive' : 'danger',
      })),
    [deposits, currency]
  );

  const historique = useMemo(
    () =>
      buildVenueHistorique({
        language,
        currency,
        branchName,
        bookings,
        deposits,
      }),
    [language, currency, branchName, bookings, deposits]
  );

  const quickActions: HomeQuickAction[] = [
    {
      id: 'venue-booking',
      label: l3(language, 'Nouvelle réservation', 'New booking', 'حجز جديد'),
      icon: <ClipboardList size={15} />,
      onClick: () => setScreenAction('registrations'),
    },
    {
      id: 'venue-timeline',
      label: l3(language, 'Planning des salles', 'Venue timeline', 'مخطط القاعات'),
      icon: <Calendar size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
  ];

  return (
    <HomeShell
      roleKey="owner"
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId="home-venue"
    >
      <HomeHeroRow
        ratio={CATEGORY_HOME_RATIO.rental_booking}
        heroTitle={l3(language, 'Occupation & Cautions', 'Occupancy & Deposits', 'الإشغال والضمانات')}
        heroChildren={
          <HomeAnchorCard
            title={l3(language, 'Cautions Détenues', 'Held Security Deposits', 'مبالغ الضمان المحجوزة')}
            value={formatMoney(heldDepositsTotal, currency)}
            badgeText={`${units.filter((u) => u.status === 'Available').length}/${units.length} ${l3(language, 'libres', 'free', 'متاحة')}`}
            badgeVariant="orange"
            sublabel={l3(
              language,
              'Accéder au tableau complet d’occupation des espaces',
              'Open space occupancy and revenue breakdown',
              'فتح لوحة إشغال القاعات والإيرادات'
            )}
            targetScreen="dashboard"
          />
        }
        priorityTitle={l3(language, 'Planning Chronologique', 'Booking Timeline', 'الجدول الزمني')}
        priorityChildren={
          <HomePreviewCard
            config={{
              id: 'venue-timeline',
              tone: 'brown',
              title: l3(language, 'Planning Chronologique', 'Booking Timeline', 'الجدول الزمني'),
              subtitle: l3(language, 'Créneaux horaires & arrivées', 'Check-ins & hall turnover', 'مواعيد التسليم والاستلام'),
              icon: <Calendar size={18} />,
              count: bookings.length,
              countLabel: `${bookings.filter((b) => b.status === 'Confirmed' || b.status === 'CheckedIn').length} ${l3(language, 'confirmées', 'confirmed', 'مؤكدة')}`,
              items: bookingRows.slice(0, 3),
              targetScreen: 'scheduler',
              emptyTitle: l3(language, 'Aucune occupation prévue.', 'No scheduled slots.', 'لا توجد حجوزات مبرمجة.'),
              emptyCtaLabel: l3(language, 'Voir planning', 'Open timeline', 'عرض الجدول'),
            }}
          />
        }
      />

      <HomeOperationalRow title={l3(language, 'Espaces & Locations', 'Venue Spaces', 'مساحات التأجير')}>
        <HomePreviewCard
          config={{
            id: 'venue-bookings',
            tone: 'terracotta',
            title: l3(language, 'Réservations', 'Bookings', 'الحجوزات'),
            subtitle: l3(language, 'Contrats & soldes à régler', 'Active reservations', 'العقود والأرصدة'),
            icon: <ClipboardList size={18} />,
            count: bookings.length,
            countLabel: `${bookings.length} ${l3(language, 'dossiers', 'bookings', 'حجز')}`,
            items: bookingRows,
            targetScreen: 'registrations',
            emptyTitle: l3(language, 'Aucune réservation.', 'No bookings yet.', 'لا توجد حجوزات بعد.'),
            emptyCtaLabel: l3(language, 'Créer réservation', 'New booking', 'إنشاء حجز'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'venue-units',
            tone: 'lavender',
            title: l3(language, 'Salles & Équipements', 'Rentable Units', 'القاعات والوحدات'),
            subtitle: l3(language, 'Disponibilité & tarification', 'Spaces & hourly rates', 'التوفر والتسعيرة'),
            icon: <DoorOpen size={18} />,
            count: units.length,
            countLabel: `${units.filter((u) => u.status === 'Available').length} ${l3(language, 'disponibles', 'available', 'متاحة')}`,
            items: unitRows,
            targetScreen: 'shop',
            emptyTitle: l3(language, 'Aucun espace configuré.', 'No rentable units yet.', 'لا توجد قاعات مضافة.'),
            emptyCtaLabel: l3(language, 'Ajouter espace', 'Add unit', 'إضافة وحدة'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'venue-renters',
            tone: 'brown',
            title: l3(language, 'Locataires & Organisateurs', 'Renters Directory', 'دليل المستأجرين'),
            subtitle: l3(language, 'Clients récurrents & sociétés', 'Corporate & event hosts', 'الأفراد والشركات'),
            icon: <Users size={18} />,
            count: renters.length,
            countLabel: `${renters.length} ${l3(language, 'comptes', 'renters', 'مستأجر')}`,
            items: renterRows,
            targetScreen: 'members',
            emptyTitle: l3(language, 'Aucun locataire.', 'No renters listed.', 'لا يوجد مستأجرون.'),
            emptyCtaLabel: l3(language, 'Voir répertoire', 'Open directory', 'فتح الدليل'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'venue-finance',
            tone: 'lavender',
            title: l3(language, 'Cautions & Finance', 'Deposits & Cash', 'الضمانات والمالية'),
            subtitle: l3(language, 'Suivi des dépôts de garantie', 'Escrow & releases', 'حالة الضمانات المالية'),
            icon: <ShieldCheck size={18} />,
            count: deposits.length,
            countLabel: formatMoney(heldDepositsTotal, currency),
            items: depositRows,
            targetScreen: 'finance',
            emptyTitle: l3(language, 'Aucune caution active.', 'No deposits recorded.', 'لا توجد ضمانات.'),
            emptyCtaLabel: l3(language, 'Gérer cautions', 'Open finance', 'فتح المالية'),
          }}
        />
      </HomeOperationalRow>

      <HomeLiveHistoryPod events={historique.events} filters={historique.filters} />

      <HomeSetupPod roleKey="owner" />
    </HomeShell>
  );
};

// ============================================================================
// 7. FREELANCE & SOLO STUDIO (freelance_solo) — 4-Row Bento Home
// ============================================================================
export const FreelanceHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const {
    currency,
    branchName,
    clients,
    projects,
    timeLogs,
    invoices,
    proposals,
    expenses,
  } = useAtriumSelector(
    (s) => ({
      currency: selectCurrentBusinessConfigFromState(s).currency || 'EUR',
      branchName: selectCurrentBranchFromState(s)?.name || 'Studio Solo',
      clients: selectCurrentFreelanceClientsFromState(s),
      projects: selectCurrentFreelanceProjectsFromState(s),
      timeLogs: selectCurrentTimeLogsFromState(s),
      invoices: selectCurrentFreelanceInvoicesFromState(s),
      proposals: selectCurrentFreelanceProposalsFromState(s),
      expenses: selectCurrentFreelanceExpensesFromState(s),
    }),
    shallowEqualObjects
  );
  const timerPreview = useTimerSelector(
    (timer) => ({
      isRunning: Boolean(timer?.isRunning),
      projectTitle: timer?.projectTitle || '',
      elapsedMinutes: Math.floor((timer?.elapsedSeconds || 0) / 60),
    }),
    shallowEqualObjects
  );

  const unpaidTotal = useMemo(
    () =>
      invoices
        .filter((i) => i.status === 'Sent' || i.status === 'Overdue')
        .reduce((sum, i) => sum + i.totalAmount, 0),
    [invoices]
  );

  const projectRows: HomePreviewRow[] = useMemo(
    () =>
      projects.slice(0, 4).map((p) => ({
        id: p.id,
        primary: p.title,
        secondary: [p.clientName, p.deadline].filter(Boolean).join(' · '),
        trailing: formatMoney(p.budget, p.currency || currency),
        statusTone: p.stage === 'Approved' || p.stage === 'Billed' ? 'positive' : 'warning',
      })),
    [projects, currency]
  );

  const invoiceRows: HomePreviewRow[] = useMemo(
    () =>
      invoices.slice(0, 4).map((inv) => ({
        id: inv.id,
        primary: `${inv.invoiceNumber} · ${inv.clientName}`,
        secondary: inv.dueDate,
        trailing: formatMoney(inv.totalAmount, inv.currency || currency),
        statusTone: inv.status === 'Paid' ? 'positive' : inv.status === 'Overdue' ? 'danger' : 'warning',
      })),
    [invoices, currency]
  );

  const clientRows: HomePreviewRow[] = useMemo(
    () =>
      clients.slice(0, 3).map((c) => ({
        id: c.id,
        primary: c.name,
        secondary: [c.company, c.status].filter(Boolean).join(' · '),
        trailing: formatMoney(c.lifetimeBilled, c.currency || currency),
        statusTone: c.status === 'ActiveRetainer' ? 'positive' : 'neutral',
      })),
    [clients, currency]
  );

  const proposalRows: HomePreviewRow[] = useMemo(
    () =>
      proposals.slice(0, 3).map((pr) => ({
        id: pr.id,
        primary: pr.title,
        secondary: [pr.clientName, pr.validUntil].filter(Boolean).join(' · '),
        trailing: formatMoney(pr.proposedBudget, pr.currency || currency),
        statusTone: pr.status === 'Accepted' ? 'positive' : pr.status === 'Declined' ? 'danger' : 'warning',
      })),
    [proposals, currency]
  );

  const historique = useMemo(
    () =>
      buildFreelanceHistorique({
        language,
        currency,
        branchName,
        timeLogs,
        invoices,
        proposals,
        projects,
      }),
    [language, currency, branchName, timeLogs, invoices, proposals, projects]
  );

  const quickActions: HomeQuickAction[] = [
    {
      id: 'solo-timer',
      label: l3(language, 'Chronomètre & Temps', 'Time Tracker', 'مؤقت العمل'),
      icon: <Timer size={15} />,
      onClick: () => setScreenAction('analytics'),
    },
    {
      id: 'solo-invoice',
      label: l3(language, 'Factures clients', 'Invoices', 'الفواتير'),
      icon: <FileText size={15} />,
      onClick: () => setScreenAction('shop'),
    },
    {
      id: 'solo-proposal',
      label: l3(language, 'Devis & Propositions', 'Proposals', 'عروض الأسعار'),
      icon: <ClipboardList size={15} />,
      onClick: () => setScreenAction('registrations'),
    },
  ];

  const elapsedMinutes = timerPreview.elapsedMinutes;

  return (
    <HomeShell
      roleKey="owner"
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId="home-freelance"
    >
      <HomeHeroRow
        ratio={CATEGORY_HOME_RATIO.freelance_solo}
        heroTitle={l3(language, 'Chrono & Encours', 'Focus Timer & Cash', 'مؤقت التركيز والتحصيل')}
        heroChildren={
          <HomeAnchorCard
            title={
              timerPreview.isRunning
                ? l3(language, 'Chronomètre En Cours', 'Active Timer Running', 'المؤقت يعمل حالياً')
                : l3(language, 'Factures À Encaisser', 'Awaiting Settlement', 'فواتير قيد التحصيل')
            }
            value={
              timerPreview.isRunning
                ? `${elapsedMinutes} min`
                : formatMoney(unpaidTotal, currency)
            }
            badgeText={
              timerPreview.isRunning
                ? timerPreview.projectTitle
                : `${invoices.filter((i) => i.status === 'Overdue').length} ${l3(language, 'en retard', 'overdue', 'متأخرة')}`
            }
            badgeVariant={timerPreview.isRunning ? 'green' : 'orange'}
            sublabel={l3(
              language,
              'Ouvrir le suivi du temps ou le tableau de bord financier',
              'Open live time tracker or studio revenue dashboard',
              'فتح متتبع الساعات أو لوحة قيادة الاستوديو'
            )}
            targetScreen={timerPreview.isRunning ? 'analytics' : 'dashboard'}
          />
        }
        priorityTitle={l3(language, 'Chronomètre & Feuilles de Temps', 'Recent Billable Hours', 'سجل الساعات')}
        priorityChildren={
          <HomePreviewCard
            config={{
              id: 'solo-timelogs',
              tone: 'brown',
              title: l3(language, 'Chronomètre & Feuilles', 'Time Logs', 'سجل الساعات'),
              subtitle: l3(language, 'Heures facturables enregistrées', 'Recent billable hours', 'الساعات المسجلة للفوترة'),
              icon: <Clock size={18} />,
              count: timeLogs.length,
              countLabel: `${timeLogs.filter((t) => !t.isInvoiced).length} ${l3(language, 'à facturer', 'unbilled', 'غير مفوترة')}`,
              items: timeLogs.slice(0, 3).map((tl) => ({
                id: tl.id,
                primary: tl.taskDescription,
                secondary: `${tl.projectTitle} · ${tl.date}`,
                trailing: `${(tl.durationSeconds / 3600).toFixed(1)}h`,
                statusTone: tl.isInvoiced ? 'positive' : 'warning',
              })),
              targetScreen: 'analytics',
              emptyTitle: l3(language, 'Aucune session chronométrée.', 'No time logs yet.', 'لا توجد ساعات مسجلة.'),
              emptyCtaLabel: l3(language, 'Lancer chrono', 'Start timer', 'بدء المؤقت'),
            }}
          />
        }
      />

      <HomeOperationalRow title={l3(language, 'Espaces Studio Solo', 'Studio Spaces', 'أقسام المكتب')}>
        <HomePreviewCard
          config={{
            id: 'solo-projects',
            tone: 'terracotta',
            title: l3(language, 'Projets & Livrables', 'Projects & Deliverables', 'المشاريع والتسليمات'),
            subtitle: l3(language, 'Jalons en cours', 'Active engagements', 'المشاريع النشطة'),
            icon: <Briefcase size={18} />,
            count: projects.length,
            countLabel: `${projects.length} ${l3(language, 'projets', 'projects', 'مشروع')}`,
            items: projectRows,
            targetScreen: 'scheduler',
            emptyTitle: l3(language, 'Aucun projet actif.', 'No active projects.', 'لا توجد مشاريع.'),
            emptyCtaLabel: l3(language, 'Voir livrables', 'Open projects', 'فتح المشاريع'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'solo-invoices',
            tone: 'lavender',
            title: l3(language, 'Factures Clients', 'Invoices & Payments', 'فواتير العملاء'),
            subtitle: l3(language, 'Multi-devises DZD / EUR / USD', 'Billing & settlements', 'الفوترة والتحصيل'),
            icon: <FileText size={18} />,
            count: invoices.length,
            countLabel: formatMoney(unpaidTotal, currency),
            items: invoiceRows,
            targetScreen: 'shop',
            emptyTitle: l3(language, 'Aucune facture émise.', 'No invoices issued.', 'لا توجد فواتير.'),
            emptyCtaLabel: l3(language, 'Créer facture', 'Open invoices', 'فتح الفواتير'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'solo-proposals',
            tone: 'brown',
            title: l3(language, 'Devis & Propositions', 'Proposals & Quotes', 'عروض الأسعار'),
            subtitle: l3(language, 'Offres envoyées aux prospects', 'Pending client quotes', 'العروض المرسلة'),
            icon: <ClipboardList size={18} />,
            count: proposals.length,
            countLabel: `${proposals.filter((p) => p.status === 'Pending').length} ${l3(language, 'en attente', 'pending', 'قيد الانتظار')}`,
            items: proposalRows,
            targetScreen: 'registrations',
            emptyTitle: l3(language, 'Aucun devis actif.', 'No proposals yet.', 'لا توجد عروض.'),
            emptyCtaLabel: l3(language, 'Nouveau devis', 'Create proposal', 'إنشاء عرض'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'solo-clients-fin',
            tone: 'lavender',
            title: l3(language, 'Clients & Dépenses', 'Clients & Finance', 'العملاء والمالية'),
            subtitle: l3(language, 'Comptes clients & frais pros', `${expenses.length} notes de frais`, `${expenses.length} مصاريف مهنية`),
            icon: <Users size={18} />,
            count: clients.length,
            countLabel: `${clients.length} ${l3(language, 'clients', 'clients', 'عملاء')}`,
            items: clientRows,
            targetScreen: 'members',
            emptyTitle: l3(language, 'Aucun client enregistré.', 'No clients added.', 'لا يوجد عملاء.'),
            emptyCtaLabel: l3(language, 'Voir clients', 'Open clients', 'عرض العملاء'),
          }}
        />
      </HomeOperationalRow>

      <HomeLiveHistoryPod events={historique.events} filters={historique.filters} />

      <HomeSetupPod roleKey="owner" />
    </HomeShell>
  );
};

// ============================================================================
// 8. B2B TRADING & WHOLESALE (trading_commercial) — 4-Row Bento Home
// ============================================================================
export const TradingHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const {
    currency,
    branchName,
    salesDocs,
    purchaseDocs,
    warehouses,
    clients,
    products,
  } = useAtriumSelector(
    (s) => ({
      currency: selectCurrentBusinessConfigFromState(s).currency || 'DZD',
      branchName: selectCurrentBranchFromState(s)?.name || 'Négoce',
      salesDocs: selectCurrentCommercialDocsFromState(s),
      purchaseDocs: selectCurrentPurchaseDocsFromState(s),
      warehouses: selectCurrentWarehousesFromState(s),
      clients: selectCurrentB2bClientsFromState(s),
      products: selectCurrentProductsFromState(s),
    }),
    shallowEqualObjects
  );

  const receivablesTotal = useMemo(
    () => clients.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0),
    [clients]
  );

  const salesRows: HomePreviewRow[] = useMemo(
    () =>
      salesDocs.slice(0, 4).map((d) => ({
        id: d.id,
        primary: `${d.docNumber} · ${d.clientName}`,
        secondary: [d.type.toUpperCase(), d.date].join(' · '),
        trailing: formatMoney(d.netToPay, d.currency || currency),
        statusTone: d.status === 'Paid' ? 'positive' : d.status === 'Canceled' ? 'danger' : 'warning',
      })),
    [salesDocs, currency]
  );

  const purchaseRows: HomePreviewRow[] = useMemo(
    () =>
      purchaseDocs.slice(0, 4).map((p) => ({
        id: p.id,
        primary: `${p.docNumber} · ${p.supplierName}`,
        secondary: [p.type.toUpperCase(), p.orderDate].join(' · '),
        trailing: formatMoney(p.totalTtc, p.currency || currency),
        statusTone: p.status === 'Paid' || p.status === 'Received' ? 'positive' : 'warning',
      })),
    [purchaseDocs, currency]
  );

  const warehouseRows: HomePreviewRow[] = useMemo(
    () =>
      warehouses.slice(0, 3).map((w) => ({
        id: w.id,
        primary: `${w.code} · ${w.name}`,
        secondary: [w.city, `${w.totalSkusCount} SKUs`].join(' · '),
        trailing: formatMoney(w.totalValuationDzd, currency),
        statusTone: 'positive',
      })),
    [warehouses, currency]
  );

  const partnerRows: HomePreviewRow[] = useMemo(
    () =>
      clients.slice(0, 3).map((c) => ({
        id: c.id,
        primary: c.companyName,
        secondary: [c.city, c.nif ? `NIF ${c.nif}` : ''].filter(Boolean).join(' · '),
        trailing: formatMoney(c.outstandingBalance, currency),
        statusTone: c.outstandingBalance > c.creditLimit ? 'danger' : 'neutral',
      })),
    [clients, currency]
  );

  const historique = useMemo(
    () =>
      buildTradingHistorique({
        language,
        currency,
        branchName,
        salesDocs,
        purchaseDocs,
        warehouses,
      }),
    [language, currency, branchName, salesDocs, purchaseDocs, warehouses]
  );

  const quickActions: HomeQuickAction[] = [
    {
      id: 'trd-sales',
      label: l3(language, 'Facturation & Devis B2B', 'Sales & Invoices', 'المبيعات والفواتير'),
      icon: <FileText size={15} />,
      onClick: () => setScreenAction('trading_sales'),
    },
    {
      id: 'trd-purchases',
      label: l3(language, 'Achats & Réceptions', 'Purchases & PO', 'المشتريات والاستلام'),
      icon: <Truck size={15} />,
      onClick: () => setScreenAction('trading_purchases'),
    },
    {
      id: 'trd-inventory',
      label: l3(language, 'Dépôts & Bons de Stock', 'Warehouse Stock', 'المخازن والسندات'),
      icon: <Boxes size={15} />,
      onClick: () => setScreenAction('trading_inventory'),
    },
  ];

  return (
    <HomeShell
      roleKey="owner"
      quickActions={quickActions}
      dashboardTarget="trading_dashboard"
      testId="home-trading"
    >
      <HomeHeroRow
        ratio={CATEGORY_HOME_RATIO.trading_commercial}
        heroTitle={l3(language, 'Encours Clients B2B', 'Receivables Anchor', 'مستحقات العملاء')}
        heroChildren={
          <HomeAnchorCard
            title={l3(language, 'Créances Clients B2B', 'Open B2B Receivables', 'مستحقات العملاء')}
            value={formatMoney(receivablesTotal, currency)}
            badgeText={`${salesDocs.length} ${l3(language, 'pièces', 'docs', 'وثائق')}`}
            badgeVariant="orange"
            sublabel={l3(
              language,
              'Ouvrir le tableau de bord commercial & chiffre HT/TTC',
              'Open commercial margin, aging and B2B revenue analytics',
              'فتح لوحة المؤشرات التجارية والأرصدة'
            )}
            targetScreen="trading_dashboard"
          />
        }
        priorityTitle={l3(language, 'Dépôts & Valorisation Stock', 'Warehouses & Stock', 'المخازن والسلع')}
        priorityChildren={
          <HomePreviewCard
            config={{
              id: 'trd-warehouses',
              tone: 'brown',
              title: l3(language, 'Dépôts & Stocks', 'Warehouses & Stock', 'المخازن والسلع'),
              subtitle: l3(language, 'Valorisation par entrepôt', 'Multi-depot stock balance', 'قيمة المخزون حسب المستودع'),
              icon: <Boxes size={18} />,
              count: warehouses.length,
              countLabel: `${products.length} ${l3(language, 'articles', 'SKUs', 'صنف')}`,
              items: warehouseRows,
              targetScreen: 'trading_inventory',
              emptyTitle: l3(language, 'Aucun dépôt configuré.', 'No warehouses configured.', 'لا توجد مخازن.'),
              emptyCtaLabel: l3(language, 'Gérer dépôts', 'Open stock', 'فتح المخزون'),
            }}
          />
        }
      />

      <HomeOperationalRow title={l3(language, 'Cycle Commercial B2B', 'Commercial Modules', 'أقسام التجارة والجملة')}>
        <HomePreviewCard
          config={{
            id: 'trd-sales',
            tone: 'terracotta',
            title: l3(language, 'Ventes · Devis / BL / Factures', 'Commercial Sales Docs', 'المبيعات والفواتير'),
            subtitle: l3(language, 'Chaîne devis vers facture DGI', 'Quotes, BLs & DGI invoices', 'عروض الأسعار ووصل التسليم'),
            icon: <FileText size={18} />,
            count: salesDocs.length,
            countLabel: `${salesDocs.length} ${l3(language, 'documents', 'docs', 'وثيقة')}`,
            items: salesRows,
            targetScreen: 'trading_sales',
            emptyTitle: l3(language, 'Aucune pièce de vente.', 'No sales documents.', 'لا توجد فواتير بيع.'),
            emptyCtaLabel: l3(language, 'Créer facture', 'New document', 'وثيقة جديدة'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'trd-purchases',
            tone: 'lavender',
            title: l3(language, 'Achats & Fournisseurs', 'Purchases & Receiving', 'المشتريات والموردون'),
            subtitle: l3(language, 'Bons de commande & réception', 'POs & goods receipts', 'طلبات الشراء والاستلام'),
            icon: <Truck size={18} />,
            count: purchaseDocs.length,
            countLabel: `${purchaseDocs.length} ${l3(language, 'commandes', 'POs', 'طلب شراء')}`,
            items: purchaseRows,
            targetScreen: 'trading_purchases',
            emptyTitle: l3(language, 'Aucun bon d’achat.', 'No purchase orders yet.', 'لا توجد مشتريات.'),
            emptyCtaLabel: l3(language, 'Nouvel achat', 'New PO', 'طلب شراء'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'trd-directory',
            tone: 'brown',
            title: l3(language, 'Répertoire Clients & NIF', 'B2B Partners Directory', 'دليل الشركاء'),
            subtitle: l3(language, 'Plafonds de crédit & RC/NIF', 'Credit limits & tax IDs', 'السجلات التجارية والضرائب'),
            icon: <Building2 size={18} />,
            count: clients.length,
            countLabel: `${clients.length} ${l3(language, 'comptes', 'partners', 'شريك')}`,
            items: partnerRows,
            targetScreen: 'trading_directory',
            emptyTitle: l3(language, 'Aucun partenaire B2B.', 'No B2B partners yet.', 'لا يوجد شركاء.'),
            emptyCtaLabel: l3(language, 'Ajouter partenaire', 'Open directory', 'فتح الدليل'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'trd-finance',
            tone: 'lavender',
            title: l3(language, 'Trésorerie & Échéances', 'Treasury & Catalog', 'الخزينة والكتالوج'),
            subtitle: l3(language, 'Règlements, chèques & tarifs', 'Cheques, balances & SKUs', 'الشيكات والأرصدة'),
            icon: <Wallet size={18} />,
            count: formatMoney(receivablesTotal, currency),
            countLabel: l3(language, 'À recouvrer', 'Outstanding', 'مستحق التحصيل'),
            items: salesRows.slice(0, 3),
            targetScreen: 'trading_finance',
            emptyTitle: l3(language, 'Aucune écriture active.', 'No treasury entries.', 'لا توجد قيود.'),
            emptyCtaLabel: l3(language, 'Ouvrir trésorerie', 'Open finance', 'فتح الخزينة'),
          }}
        />
      </HomeOperationalRow>

      <HomeLiveHistoryPod events={historique.events} filters={historique.filters} />

      <HomeSetupPod roleKey="owner" />
    </HomeShell>
  );
};
