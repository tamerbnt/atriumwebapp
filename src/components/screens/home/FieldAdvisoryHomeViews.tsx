import React, { useMemo } from 'react';
import {
  Briefcase,
  Calendar,
  FileText,
  Scale,
  BookOpen,
  Landmark,
  Lock,
  Package,
  Truck,
  Boxes,
  CreditCard,
  HardHat,
  ClipboardList,
  Clock,
  Sprout,
  Layers,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
  setScreenAction,
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
  HomeCompactStrip,
  HomeAnchorCard,
  HomePreviewRow,
  HomeQuickAction,
  HomePreviewCardConfig,
  CATEGORY_HOME_RATIO,
  l3,
} from '../../common/home';
import { useLegalData } from '../legal/legalData';
import { useLogisticsData } from '../logistics/logisticsData';
import { useContractorData } from '../contractor/contractorData';
import { useAgricultureData } from '../agriculture/agricultureData';
import type { HomeViewProps } from './CoreServiceHomeViews';
import {
  buildAgricultureHistorique,
  buildContractorHistorique,
  buildLegalHistorique,
  buildLogisticsHistorique,
} from './homeActivityAdapters';

// ============================================================================
// 13. LEGAL & ACCOUNTING CABINETS (legal_accounting) — 4-Row Bento Home (42 / 58)
// ============================================================================
export const LegalHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { role, currency, branchName } = useAtriumSelector(
    (s) => ({
      role: s.activeLegalRole || 'avocat_associe',
      currency: selectCurrentBusinessConfigFromState(s).currency || 'DZD',
      branchName: selectCurrentBranchFromState(s)?.name || 'Cabinet',
    }),
    shallowEqualObjects
  );

  const {
    matters,
    hearings,
    deadlines,
    notaryDeeds,
    escrowAccounts,
    scfEntries,
    cashReceipts,
  } = useLegalData();

  const urgentDeadlines = useMemo(
    () =>
      deadlines.filter((d) => d.status === 'critical' || d.status === 'approaching').length,
    [deadlines]
  );

  const matterRows: HomePreviewRow[] = useMemo(
    () =>
      matters.slice(0, 4).map((m) => ({
        id: m.id,
        primary: `${m.matterNumber} · ${language === 'ar' && m.titleAr ? m.titleAr : m.title}`,
        secondary: [
          language === 'ar' && m.clientNameAr ? m.clientNameAr : m.clientName,
          m.courtJurisdiction,
        ]
          .filter(Boolean)
          .join(' · '),
        trailing: formatMoney(m.retainerAmountDzd, currency),
        statusTone:
          m.status === 'Closed'
            ? 'neutral'
            : m.status === 'PendingHearing'
            ? 'warning'
            : 'positive',
      })),
    [matters, currency, language]
  );

  const hearingRows: HomePreviewRow[] = useMemo(
    () =>
      hearings.slice(0, 4).map((h) => ({
        id: h.id,
        primary:
          (language === 'ar' && h.matterTitleAr ? h.matterTitleAr : h.matterTitle) ||
          h.matterNumber ||
          'Audience',
        secondary: [h.courtName, h.hearingDate, h.hearingTime].filter(Boolean).join(' · '),
        trailing: h.chamber || h.status || '',
        statusTone:
          h.status === 'Postponed' ? 'warning' : h.status === 'Ruled' ? 'positive' : 'neutral',
      })),
    [hearings, language]
  );

  const deedRows: HomePreviewRow[] = useMemo(
    () =>
      notaryDeeds.slice(0, 4).map((d) => ({
        id: d.id,
        primary: `${d.repertoireNumber} · ${language === 'ar' && d.titleAr ? d.titleAr : d.title}`,
        secondary: [d.parties?.vendorName, d.parties?.purchaserName].filter(Boolean).join(' → '),
        trailing: formatMoney(d.transactionValueDzd, currency),
        statusTone: d.status === 'publie_conservation' ? 'positive' : 'warning',
      })),
    [notaryDeeds, currency, language]
  );

  const escrowRows: HomePreviewRow[] = useMemo(
    () =>
      escrowAccounts.slice(0, 4).map((e) => ({
        id: e.id,
        primary: `${e.matterReference} · ${e.clientName}`,
        secondary: e.beneficiaryName,
        trailing: formatMoney(e.currentBalanceDzd, currency),
        statusTone: e.isLocked ? 'warning' : 'positive',
      })),
    [escrowAccounts, currency]
  );

  const deadlineRows: HomePreviewRow[] = useMemo(
    () =>
      deadlines.slice(0, 4).map((dl) => ({
        id: dl.id,
        primary: `${dl.caseNumber} · ${dl.recourseType}`,
        secondary: [dl.courtJurisdiction, dl.terminalExpiryDate].filter(Boolean).join(' · '),
        trailing: dl.status,
        statusTone:
          dl.status === 'critical'
            ? 'danger'
            : dl.status === 'approaching'
            ? 'warning'
            : 'positive',
      })),
    [deadlines]
  );

  const scfRows: HomePreviewRow[] = useMemo(
    () =>
      scfEntries.slice(0, 4).map((s) => ({
        id: s.id,
        primary: `${s.entryNumber} · ${s.libelle}`,
        secondary: [s.journalCode, s.date].join(' · '),
        trailing: formatMoney(s.totalDebitDzd, currency),
        statusTone: s.status === 'validated' ? 'positive' : 'warning',
      })),
    [scfEntries, currency]
  );

  const receiptRows: HomePreviewRow[] = useMemo(
    () =>
      cashReceipts.slice(0, 4).map((r) => ({
        id: r.id,
        primary: `${r.receiptNumber} · ${r.clientName}`,
        secondary: [r.matterTitle, r.paymentMethod].filter(Boolean).join(' · '),
        trailing: formatMoney(r.netCollectedDzd, currency),
        statusTone: 'positive',
      })),
    [cashReceipts, currency]
  );

  const historique = useMemo(
    () =>
      buildLegalHistorique({
        language,
        currency,
        branchName,
        role,
        hearings,
        deadlines,
        matters,
        notaryDeeds,
        scfEntries,
        cashReceipts,
      }),
    [
      language,
      currency,
      branchName,
      role,
      hearings,
      deadlines,
      matters,
      notaryDeeds,
      scfEntries,
      cashReceipts,
    ]
  );

  const isNotary = role === 'notaire_titulaire';
  const isAccountant = role === 'expert_comptable';
  const isSecretary = role === 'secretaire_caisse';

  const quickActions: HomeQuickAction[] = [
    {
      id: 'legal-matters',
      label: isNotary
        ? l3(language, 'Répertoire des Actes', 'Deeds Registry', 'سجل العقود')
        : l3(language, 'Dossiers & Affaires', 'Active Matters', 'الملفات والقضايا'),
      icon: <Briefcase size={15} />,
      onClick: () => setScreenAction('members'),
    },
    {
      id: 'legal-hearings',
      label: isNotary
        ? l3(language, 'Conservation Foncière', 'Land Registry', 'المحافظة العقارية')
        : isAccountant
        ? l3(language, 'Échéances Fiscales G50', 'Tax Calendar', 'المواعيد الجبائية')
        : l3(language, 'Rôle des Audiences', 'Court Hearings', 'جدول الجلسات'),
      icon: <Calendar size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
    {
      id: 'legal-trust',
      label: isNotary
        ? l3(language, 'Comptes Séquestre', 'Escrow Accounts', 'حسابات الودائع')
        : l3(language, 'Honoraires & Caisse', 'Trust & Cashier', 'الأتعاب والصندوق'),
      icon: <Scale size={15} />,
      onClick: () => setScreenAction('finance'),
    },
  ];

  return (
    <HomeShell
      roleKey={role}
      quickActions={quickActions}
      dashboardTarget={isSecretary ? 'finance' : 'dashboard'}
      dashboardLabel={
        isSecretary
          ? l3(language, 'Caisse & Formalités', 'Cashier & Desk', 'الصندوق والاستقبال')
          : undefined
      }
      testId={`home-legal-${role}`}
    >
      <HomeHeroRow
        ratio={CATEGORY_HOME_RATIO.legal_accounting}
        heroTitle={l3(language, 'Délais & Activité Étude', 'Critical Deadlines & Pulse', 'الآجال والتنبيهات')}
        heroChildren={
          <>
            <HomeAnchorCard
              title={
                isNotary
                  ? l3(language, 'Actes au Répertoire', 'Registered Notary Deeds', 'العقود المقيدة')
                  : isAccountant
                  ? l3(language, 'Écritures SCF Validées', 'SCF Journal Entries', 'القيود المحاسبية')
                  : isSecretary
                  ? l3(language, 'Encaissements Enregistrés', 'Cashier Receipts', 'الوصولات المحصلة')
                  : l3(language, 'Délais CPCA Critiques', 'Urgent CPCA Deadlines', 'الآجال القانونية الحرجة')
              }
              value={
                isNotary
                  ? notaryDeeds.length
                  : isAccountant
                  ? scfEntries.length
                  : isSecretary
                  ? cashReceipts.length
                  : urgentDeadlines
              }
              badgeText={`${matters.length} ${l3(language, 'dossiers', 'matters', 'ملف')}`}
              badgeVariant={urgentDeadlines > 0 && !isNotary && !isAccountant ? 'red' : 'orange'}
              sublabel={
                isSecretary
                  ? l3(language, 'Ouvrir le poste caisse et formalités', 'Open cashier receipts & stamp register', 'فتح صندوق المكتب والرسوم')
                  : l3(language, 'Ouvrir le tableau de bord du cabinet', 'Open practice KPIs & billing view', 'فتح لوحة قيادة المكتب')
              }
              targetScreen={isSecretary ? 'finance' : 'dashboard'}
            />
            <HomeCompactStrip
              config={{
                id: 'legal-escrow-strip',
                tone: 'lavender',
                title: isNotary
                  ? l3(language, 'Comptes Séquestre & Trésor', 'Escrow Accounts', 'حسابات الضمان')
                  : l3(language, 'Audiences & Recettes', 'Hearings & Cashier', 'الجلسات والتحصيل'),
                subtitle: `${hearings.length} ${l3(language, 'audiences', 'hearings', 'جلسات')} · ${cashReceipts.length} ${l3(language, 'reçus', 'receipts', 'وصولات')}`,
                icon: <Scale size={17} />,
                count: isNotary ? escrowAccounts.length : hearings.length,
                statusText:
                  urgentDeadlines > 0
                    ? `${urgentDeadlines} ${l3(language, 'CPCA urgents', 'urgent', 'حرجة')}`
                    : l3(language, 'Délais suivis', 'Tracked', 'تحت المتابعة'),
                targetScreen: isNotary ? 'finance' : 'scheduler',
              }}
            />
          </>
        }
        priorityTitle={
          isNotary
            ? l3(language, 'Comptes Séquestre Actifs', 'Active Escrow Accounts', 'حسابات الضمان النشطة')
            : l3(language, 'Délais de Recours CPCA', 'Statutory Deadlines CPCA', 'آجال الطعن القانونية')
        }
        priorityChildren={
          <HomePreviewCard
            config={{
              id: 'legal-deadlines',
              tone: 'brown',
              title: isNotary
                ? l3(language, 'Comptes Séquestre', 'Escrow Accounts', 'حسابات الضمان')
                : l3(language, 'Délais de Recours CPCA', 'Statutory Deadlines', 'آجال الطعن القانونية'),
              subtitle: isNotary
                ? l3(language, 'Provisions & mainlevées', 'Client trust balances', 'الأرصدة المحجوزة')
                : l3(language, 'Calcul automatique CPCA', 'Appeal & filing windows', 'المواعيد القضائية الحساسة'),
              icon: isNotary ? <Lock size={18} /> : <Clock size={18} />,
              count: isNotary ? escrowAccounts.length : deadlines.length,
              items: isNotary ? escrowRows : deadlineRows,
              targetScreen: isNotary ? 'finance' : 'scheduler',
              emptyTitle: l3(language, 'Aucune échéance urgente.', 'No urgent deadlines.', 'لا توجد مواعيد طارئة.'),
              emptyCtaLabel: l3(language, 'Ouvrir suivi', 'Open schedule', 'فتح المتابعة'),
            }}
          />
        }
      />

      <HomeOperationalRow title={l3(language, 'Espaces du Cabinet', 'Cabinet Spaces', 'أقسام المكتب')}>
        <HomePreviewCard
          config={{
            id: 'legal-matters',
            tone: 'terracotta',
            title: isNotary
              ? l3(language, 'Répertoire des Actes', 'Notary Deeds Registry', 'فهرس العقود')
              : isAccountant
              ? l3(language, 'Mandats & Sociétés', 'Client Mandates', 'الشركات الموكلة')
              : l3(language, 'Dossiers & Contentieux', 'Matters & Cases', 'القضايا والملفات'),
            subtitle: l3(language, 'Affaires actives et parties', 'Active files & parties', 'الملفات النشطة والأطراف'),
            icon: isNotary ? <BookOpen size={18} /> : <Briefcase size={18} />,
            count: isNotary ? notaryDeeds.length : matters.length,
            items: isNotary ? deedRows : matterRows,
            targetScreen: 'members',
            emptyTitle: l3(language, 'Aucun dossier ouvert.', 'No active matters.', 'لا توجد ملفات.'),
            emptyCtaLabel: l3(language, 'Nouveau dossier', 'Open registry', 'فتح السجل'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'legal-hearings',
            tone: 'lavender',
            title: isNotary
              ? l3(language, 'Conservation & Cadastre', 'Land & Registry', 'الشهر العقاري')
              : isAccountant
              ? l3(language, 'Échéances G50 & Bilans', 'Tax & Audit Dates', 'مواعيد الجباية')
              : l3(language, 'Audiences & Rôles', 'Court Calendar', 'جدول الجلسات'),
            subtitle: l3(language, 'Juridictions et chambres', 'Chambers & dates', 'المحاكم والتواريخ'),
            icon: isNotary ? <Landmark size={18} /> : <Calendar size={18} />,
            count: hearings.length,
            items: hearingRows,
            targetScreen: 'scheduler',
            emptyTitle: l3(language, 'Aucune audience planifiée.', 'No scheduled hearings.', 'لا توجد جلسات.'),
            emptyCtaLabel: l3(language, 'Voir calendrier', 'Open calendar', 'فتح التقويم'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'legal-vault',
            tone: 'brown',
            title: isSecretary
              ? l3(language, 'Accueil & Dépôts', 'Client Intake & Filing', 'الاستقبال والإيداع')
              : l3(language, 'Coffre & Pièces', 'Document Vault', 'أرشيف المستندات'),
            subtitle: isSecretary
              ? l3(language, 'Dépôts clients, NIN/NIF et récépissés', 'Client deposits, IDs & receipts', 'ملفات الإيداع والوصولات')
              : l3(language, 'Actes signés & pièces justificatives', 'Verified legal archive', 'الوثائق الرسمية'),
            icon: <FileText size={18} />,
            count: isSecretary
              ? cashReceipts.length
              : isAccountant
              ? scfEntries.length
              : notaryDeeds.length + matters.length,
            items: isSecretary
              ? receiptRows
              : isAccountant
              ? scfRows
              : deedRows.slice(0, 3),
            targetScreen: 'registrations',
            emptyTitle: isSecretary
              ? l3(language, 'Aucun dépôt enregistré.', 'No filing deposits.', 'لا توجد إيداعات.')
              : l3(language, 'Aucun document archivé.', 'No archived files.', 'لا توجد وثائق.'),
            emptyCtaLabel: isSecretary
              ? l3(language, 'Ouvrir dépôts', 'Open filing', 'فتح الإيداع')
              : l3(language, 'Ouvrir coffre', 'Open vault', 'فتح الأرشيف'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'legal-finance',
            tone: 'sage',
            title: isAccountant
              ? l3(language, 'Grand Livre SCF', 'SCF General Ledger', 'اليومية العامة SCF')
              : l3(language, 'Honoraires, Séquestre & Caisse', 'Trust & Cashier', 'الأتعاب والصندوق'),
            subtitle: l3(language, 'Reçus Art. 317 & soldes', 'Receipts & client trust', 'الوصولات والأرصدة'),
            icon: <Scale size={18} />,
            count: isAccountant ? scfEntries.length : cashReceipts.length,
            items: isAccountant ? scfRows : receiptRows,
            targetScreen: 'finance',
            emptyTitle: l3(language, 'Aucune écriture comptable.', 'No accounting entries.', 'لا توجد قيود مالية.'),
            emptyCtaLabel: l3(language, 'Ouvrir caisse', 'Open trust desk', 'فتح المالية'),
          }}
        />
      </HomeOperationalRow>

      <HomeLiveHistoryPod events={historique.events} filters={historique.filters} />

      <HomeSetupPod
        roleKey={role}
        setupOverrides={{ legalMatters: matters }}
      />
    </HomeShell>
  );
};

// ============================================================================
// 14. LOGISTICS & COURIER DISPATCH (logistics_delivery) — 4-Row Bento Home (44 / 56)
// ============================================================================
export const LogisticsHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { role, currency, branchName } = useAtriumSelector(
    (s) => ({
      role: s.activeLogisticsRole || 'gerant',
      currency: selectCurrentBusinessConfigFromState(s).currency || 'DZD',
      branchName: selectCurrentBranchFromState(s)?.name || 'Hub',
    }),
    shallowEqualObjects
  );

  const { shipments, bags, manifests, discharges, remittances } = useLogisticsData();

  const totalPendingCod = useMemo(
    () =>
      shipments
        .filter((s) => s.status !== 'Returned' && s.status !== 'Cancelled')
        .reduce((sum, s) => sum + (s.codAmountDzd || 0), 0),
    [shipments]
  );

  const outForDeliveryCount = useMemo(
    () => shipments.filter((s) => s.status === 'OutForDelivery').length,
    [shipments]
  );

  const shipmentRows: HomePreviewRow[] = useMemo(
    () =>
      shipments.slice(0, 4).map((s) => ({
        id: s.id,
        primary: `${s.trackingCode} · ${s.recipientName}`,
        secondary: [s.destinationWilaya, s.merchantName, s.deliveryMode]
          .filter(Boolean)
          .join(' · '),
        trailing: formatMoney(s.codAmountDzd, currency),
        statusTone:
          s.status === 'Delivered'
            ? 'positive'
            : s.status === 'Returned' || s.status === 'Postponed'
            ? 'danger'
            : 'warning',
      })),
    [shipments, currency]
  );

  const manifestRows: HomePreviewRow[] = useMemo(
    () =>
      manifests.slice(0, 4).map((m) => ({
        id: m.id,
        primary: `${m.manifestNumber} · ${m.driverName}`,
        secondary: [m.zoneWilaya, m.vehiclePlate, `${m.totalShipmentsCount} colis`]
          .filter(Boolean)
          .join(' · '),
        trailing: formatMoney(m.totalCodExpectedDzd, currency),
        statusTone: m.status === 'Reconciled' ? 'positive' : 'warning',
      })),
    [manifests, currency]
  );

  const bagRows: HomePreviewRow[] = useMemo(
    () =>
      bags.slice(0, 4).map((b) => ({
        id: b.id,
        primary: `${b.bagCode} · #${b.securitySealNumber}`,
        secondary: `W${b.originHubWilaya} → W${b.destinationHubWilaya} · ${b.totalItemCount} colis`,
        trailing: `${b.totalWeightKg} kg`,
        statusTone:
          b.status === 'Discrepancy' ? 'danger' : b.status === 'Received' ? 'positive' : 'warning',
      })),
    [bags]
  );

  const remittanceRows: HomePreviewRow[] = useMemo(
    () =>
      remittances.slice(0, 4).map((r) => ({
        id: r.id,
        primary: `${r.batchNumber} · ${r.merchantName}`,
        secondary: r.paymentChannel,
        trailing: formatMoney(r.netPayoutDzd, currency),
        statusTone: r.status === 'Executed' ? 'positive' : 'warning',
      })),
    [remittances, currency]
  );

  const historique = useMemo(
    () =>
      buildLogisticsHistorique({
        language,
        currency,
        branchName,
        shipments,
        manifests,
        bags,
        remittances,
      }),
    [language, currency, branchName, shipments, manifests, bags, remittances]
  );

  const isFieldScanRole = role === 'hub_sorter' || role === 'stop_desk_agent';
  const canOpenCod = role === 'gerant' || role === 'stop_desk_agent';

  const quickActions: HomeQuickAction[] = [
    {
      id: 'log-scanner',
      label: l3(language, 'Scanner Hub & Sacs', 'Hub Scanner', 'ماسح الفرز'),
      icon: <Boxes size={15} />,
      onClick: () => setScreenAction('registrations'),
    },
    {
      id: 'log-manifests',
      label: l3(language, 'Tournées & Feuilles de Route', 'Driver Manifests', 'مسارات التوزيع'),
      icon: <Truck size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
    {
      id: 'log-shipments',
      label: l3(language, 'Colis & Expéditions', 'All Parcels', 'الطرود والشحنات'),
      icon: <Package size={15} />,
      onClick: () => setScreenAction('members'),
    },
  ];

  return (
    <HomeShell
      roleKey={role}
      quickActions={quickActions}
      dashboardTarget={isFieldScanRole ? 'registrations' : 'dashboard'}
      dashboardLabel={
        isFieldScanRole
          ? l3(language, 'Poste Scanner', 'Scanner Desk', 'محطة المسح')
          : undefined
      }
      testId={`home-logistics-${role}`}
    >
      <HomeHeroRow
        ratio={CATEGORY_HOME_RATIO.logistics_delivery}
        heroTitle={l3(language, 'Activité Réseau & Hub', 'Network & Hub Pulse', 'نبض الشبكة والمركز')}
        heroChildren={
          <>
            <HomeAnchorCard
              title={
                role === 'dispatcher'
                  ? l3(language, 'Tournées Actives', 'Dispatched Manifests', 'المسارات الموزعة')
                  : role === 'hub_sorter'
                  ? l3(language, 'Sacs-Navette Hub', 'Shuttle Bags at Hub', 'أكياس الفرز بالمركز')
                  : l3(language, 'Volume COD en Transit', 'COD Volume in Transit', 'تحصيل الدفع عند الاستلام')
              }
              value={
                role === 'dispatcher'
                  ? manifests.length
                  : role === 'hub_sorter'
                  ? bags.length
                  : formatMoney(totalPendingCod, currency)
              }
              badgeText={`${shipments.length} ${l3(language, 'colis', 'parcels', 'طرد')}`}
              badgeVariant="orange"
              sublabel={
                isFieldScanRole
                  ? l3(language, 'Lancer le poste de scan & rayonnement', 'Launch live parcel barcode scanner', 'فتح محطة المسح السريع')
                  : l3(language, 'Ouvrir le tableau de bord inter-wilayas', 'Open inter-wilaya delivery rate & COD dashboard', 'فتح لوحة تحكم التوصيل عبر الولايات')
              }
              targetScreen={isFieldScanRole ? 'registrations' : 'dashboard'}
            />
            <HomeCompactStrip
              config={{
                id: 'log-discharges-strip',
                tone: 'lavender',
                title: l3(language, 'Décharges Livreurs & CCP', 'Driver Cash & CCP Batches', 'التسويات والتحصيل'),
                subtitle: `${discharges.length} ${l3(language, 'décharges', 'discharges', 'تسويات')} · ${outForDeliveryCount} ${l3(language, 'en tournée', 'out now', 'قيد التوصيل')}`,
                icon: <Truck size={17} />,
                count: outForDeliveryCount,
                statusText: `${remittances.length} ${l3(language, 'lots SFP-01', 'CCP batches', 'دفعات CCP')}`,
                targetScreen: canOpenCod ? 'finance' : 'registrations',
              }}
            />
          </>
        }
        priorityTitle={l3(language, 'Sacs-Navette & Scanner', 'Shuttle Bags Priority', 'أولويات الأكياس والفرز')}
        priorityChildren={
          <HomePreviewCard
            config={{
              id: 'log-bags',
              tone: 'brown',
              title: l3(language, 'Sacs-Navette & Scanner', 'Shuttle Bags & Scanner', 'الأكياس والماسح'),
              subtitle: l3(language, 'Scellés de sécurité & tri hub', 'Sealed transit bags', 'الأختام الأمنية والفرز'),
              icon: <Boxes size={18} />,
              count: bags.length,
              items: bagRows,
              targetScreen: 'registrations',
              emptyTitle: l3(language, 'Aucun sac en transit.', 'No shuttle bags open.', 'لا توجد أكياس فرز.'),
              emptyCtaLabel: l3(language, 'Ouvrir scanner', 'Open scanner', 'فتح الماسح'),
            }}
          />
        }
      />

      <HomeOperationalRow title={l3(language, 'Espaces Dispatch & Guichet', 'Dispatch Spaces', 'أقسام التوزيع')}>
        <HomePreviewCard
          config={{
            id: 'log-shipments',
            tone: 'terracotta',
            title: l3(language, 'Colis & Stop-Desk', 'Parcels & Stop-Desk', 'الطرود ونقاط الاستلام'),
            subtitle: l3(language, 'Suivi inter-wilayas & codes OTP', 'Live shipment tracking', 'متابعة الطرود والتسليم'),
            icon: <Package size={18} />,
            count: shipments.length,
            countLabel: `${outForDeliveryCount} ${l3(language, 'en tournée', 'out', 'قيد التوصيل')}`,
            items: shipmentRows,
            targetScreen: 'members',
            emptyTitle: l3(language, 'Aucun colis enregistré.', 'No parcels logged.', 'لا توجد طرود.'),
            emptyCtaLabel: l3(language, 'Nouvel envoi', 'View parcels', 'عرض الطرود'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'log-manifests',
            tone: 'lavender',
            title: l3(language, 'Feuilles de Route Chauffeurs', 'Driver Manifests', 'جداول السائقين'),
            subtitle: l3(language, 'Tournées assignées & chargements', 'Runs & expected COD', 'المسارات والمبالغ المتوقعة'),
            icon: <Truck size={18} />,
            count: manifests.length,
            items: manifestRows,
            targetScreen: 'scheduler',
            emptyTitle: l3(language, 'Aucune tournée émise.', 'No manifests created.', 'لا توجد جداول توصيل.'),
            emptyCtaLabel: l3(language, 'Créer tournée', 'Open manifests', 'فتح المسارات'),
          }}
        />

        {canOpenCod && (
          <HomePreviewCard
            config={{
              id: 'log-cod',
              tone: 'sage',
              title: l3(language, 'Décharges & Virements COD', 'COD Settlement & CCP', 'تحصيل وتسوية التجار'),
              subtitle: l3(
                language,
                `${discharges.length} décharges · lots SFP-01`,
                `${discharges.length} cash discharges`,
                `${discharges.length} تسويات مالية`
              ),
              icon: <CreditCard size={18} />,
              count: remittances.length,
              items: remittanceRows,
              targetScreen: 'finance',
              emptyTitle: l3(language, 'Aucun règlement marchand.', 'No COD settlements yet.', 'لا توجد تسويات.'),
              emptyCtaLabel: l3(language, 'Ouvrir caisse COD', 'Open COD finance', 'فتح التحصيل'),
            }}
          />
        )}
      </HomeOperationalRow>

      <HomeLiveHistoryPod events={historique.events} filters={historique.filters} />

      <HomeSetupPod roleKey={role} />
    </HomeShell>
  );
};

// ============================================================================
// 15. CONSTRUCTION & BTP (construction_contractor) — 4-Row Bento Home (44 / 56)
// ============================================================================
export const ContractorHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { role, currency, branchName } = useAtriumSelector(
    (s) => ({
      role: s.activeContractorRole || 'gerant',
      currency: selectCurrentBusinessConfigFromState(s).currency || 'DZD',
      branchName: selectCurrentBranchFromState(s)?.name || 'BTP',
    }),
    shallowEqualObjects
  );

  const { projects, boqItems, dailyLogs, dgps, serviceOrders, concretePours } =
    useContractorData();

  const totalContractValue = useMemo(
    () => projects.reduce((sum, p) => sum + (p.contractAmountDzd || 0), 0),
    [projects]
  );

  const projectRows: HomePreviewRow[] = useMemo(
    () =>
      projects.slice(0, 4).map((p) => ({
        id: p.id,
        primary: `${p.projectCode} · ${p.projectName}`,
        secondary: [p.clientName, p.siteLocation].filter(Boolean).join(' · '),
        trailing: `${p.progressPercent}%`,
        statusTone: p.status === 'InProgress' ? 'positive' : 'warning',
      })),
    [projects]
  );

  const boqRows: HomePreviewRow[] = useMemo(
    () =>
      boqItems.slice(0, 4).map((b) => ({
        id: b.id,
        primary: `${b.itemCode} · ${b.designation}`,
        secondary: `${b.executedQty}/${b.plannedQty} ${b.unit}`,
        trailing: formatMoney(b.totalExecutedDzd, currency),
        statusTone: b.executedQty >= b.plannedQty ? 'positive' : 'neutral',
      })),
    [boqItems, currency]
  );

  const logRows: HomePreviewRow[] = useMemo(
    () =>
      dailyLogs.slice(0, 4).map((dl) => ({
        id: dl.id,
        primary: `${dl.date} · ${dl.weather}`,
        secondary: dl.tasksAccomplished,
        trailing: `${dl.headcountWorkers} ouv.`,
        statusTone: dl.hasWorkStoppage ? 'danger' : 'positive',
      })),
    [dailyLogs]
  );

  const dgpRows: HomePreviewRow[] = useMemo(
    () =>
      dgps.slice(0, 4).map((d) => ({
        id: d.id,
        primary: `${d.dgpNumber} · ${d.periodLabel}`,
        secondary: d.issuedDate,
        trailing: formatMoney(d.netPayableDzd, currency),
        statusTone: d.status === 'Paid' ? 'positive' : 'warning',
      })),
    [dgps, currency]
  );

  const historique = useMemo(
    () =>
      buildContractorHistorique({
        language,
        currency,
        branchName,
        dailyLogs,
        dgps,
        serviceOrders,
        concretePours,
      }),
    [language, currency, branchName, dailyLogs, dgps, serviceOrders, concretePours]
  );

  const isForeman = role === 'chef_chantier';
  const quickActions: HomeQuickAction[] = [
    {
      id: 'btp-sites',
      label: l3(language, 'Marchés & Ordres de Service', 'Sites & Orders', 'المشاريع والأوامر'),
      icon: <HardHat size={15} />,
      onClick: () => setScreenAction('members'),
    },
    {
      id: 'btp-boq',
      label: l3(language, 'Métrés & DQE', 'BOQ & Quantities', 'جدول الكميات'),
      icon: <ClipboardList size={15} />,
      onClick: () => setScreenAction('shop'),
    },
    {
      id: 'btp-logs',
      label: l3(language, 'Journal de Chantier & Béton', 'Daily Site Logs', 'اليومية والخرسانة'),
      icon: <CheckCircle2 size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
  ];

  return (
    <HomeShell
      roleKey={role}
      quickActions={quickActions}
      dashboardTarget={isForeman ? 'scheduler' : 'dashboard'}
      dashboardLabel={
        isForeman
          ? l3(language, 'Journal Chantier', 'Open Site Log', 'فتح اليومية')
          : undefined
      }
      testId={`home-contractor-${role}`}
    >
      <HomeHeroRow
        ratio={CATEGORY_HOME_RATIO.construction_contractor}
        heroTitle={l3(language, 'Portefeuille Marchés BTP', 'Contract Portfolio', 'محفظة المقاولات')}
        heroChildren={
          <>
            <HomeAnchorCard
              title={l3(language, 'Volume Marchés Actifs', 'Active Contract Volume', 'حجم الصفقات الجارية')}
              value={formatMoney(totalContractValue, currency)}
              badgeText={`${projects.length} ${l3(language, 'chantiers', 'sites', 'ورشات')}`}
              badgeVariant="orange"
              sublabel={
                isForeman
                  ? l3(language, 'Ouvrir le journal quotidien et pointage ouvriers', 'Open daily site log and concrete pour tracker', 'فتح يومية الورشة وتتبع الخرسانة')
                  : l3(language, 'Ouvrir l’avancement physique & financier BTP', 'Open physical vs financial progress & retention KPIs', 'فتح مؤشرات التقدم المادي والمالي')
              }
              targetScreen={isForeman ? 'scheduler' : 'dashboard'}
            />
            <HomeCompactStrip
              config={{
                id: 'btp-dgp-strip',
                tone: 'lavender',
                title: l3(language, 'Situations DGP & Béton', 'Progress Billings & Concrete', 'الكشوف والخرسانة'),
                subtitle: `${dgps.length} ${l3(language, 'décomptes DGP', 'DGP statements', 'كشوف')} · ${concretePours.length} ${l3(language, 'coulages', 'pours', 'عمليات صب')}`,
                icon: <Wallet size={17} />,
                count: dgps.filter((d) => d.status !== 'Paid').length,
                statusText: `${boqItems.length} ${l3(language, 'postes DQE', 'BOQ lines', 'بنود DQE')}`,
                targetScreen: 'finance',
              }}
            />
          </>
        }
        priorityTitle={l3(language, 'Ordres de Service & Béton', 'Service Orders & Concrete', 'أوامر الخدمة والخرسانة')}
        priorityChildren={
          <HomePreviewCard
            config={{
              id: 'btp-os-concrete',
              tone: 'brown',
              title: l3(language, 'Ordres de Service & Béton', 'Service Orders & Concrete', 'أوامر الخدمة والخرسانة'),
              subtitle: l3(
                language,
                `${serviceOrders.length} OS · ${concretePours.length} coulages`,
                `${serviceOrders.length} OS · ${concretePours.length} pours`,
                `${serviceOrders.length} أوامر · ${concretePours.length} صب خرسانة`
              ),
              icon: <FileText size={18} />,
              count: serviceOrders.length + concretePours.length,
              items: serviceOrders.slice(0, 4).map((os) => ({
                id: os.id,
                primary: `${os.osNumber} · ${os.osType}`,
                secondary: os.effectiveDate,
                trailing: os.status,
                statusTone: os.status === 'Executed' ? 'positive' : 'warning',
              })),
              targetScreen: 'members',
              emptyTitle: l3(language, 'Aucun ordre de service.', 'No service orders logged.', 'لا توجد أوامر خدمة.'),
              emptyCtaLabel: l3(language, 'Voir chantiers', 'Open sites', 'فتح الورشات'),
            }}
          />
        }
      />

      <HomeOperationalRow title={l3(language, 'Espaces Chantiers & Études', 'Site Workspaces', 'أقسام الأشغال')}>
        <HomePreviewCard
          config={{
            id: 'btp-projects',
            tone: 'terracotta',
            title: l3(language, 'Chantiers & Marchés', 'Active Sites', 'الورشات الجارية'),
            subtitle: l3(language, 'Avancement & retenues de garantie', 'Progress & milestones', 'نسب التقدم والضمانات'),
            icon: <HardHat size={18} />,
            count: projects.length,
            items: projectRows,
            targetScreen: 'members',
            emptyTitle: l3(language, 'Aucun chantier actif.', 'No active projects.', 'لا توجد ورشات.'),
            emptyCtaLabel: l3(language, 'Nouveau marché', 'Open sites', 'فتح المشاريع'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'btp-boq',
            tone: 'lavender',
            title: l3(language, 'DQE & Attachements', 'BOQ & Quantities', 'جدول الكميات والأسعار'),
            subtitle: l3(language, 'Quantités réalisées vs marché', 'Executed vs planned', 'الكميات المنجزة والمخططة'),
            icon: <ClipboardList size={18} />,
            count: boqItems.length,
            items: boqRows,
            targetScreen: 'shop',
            emptyTitle: l3(language, 'Aucun poste DQE saisi.', 'No BOQ lines added.', 'لا توجد بنود كمية.'),
            emptyCtaLabel: l3(language, 'Ouvrir DQE', 'Open BOQ', 'فتح الكميات'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'btp-logs',
            tone: 'brown',
            title: l3(language, 'Journal de Chantier & Météo', 'Daily Logs & CACOBATPH', 'يومية الورشة والأحوال'),
            subtitle: l3(language, 'Effectifs, arrêts intempéries & BET', 'Headcount & weather', 'العمال والتوقفات الجوية'),
            icon: <CheckCircle2 size={18} />,
            count: dailyLogs.length,
            items: logRows,
            targetScreen: 'scheduler',
            emptyTitle: l3(language, 'Aucun rapport journalier.', 'No daily site logs.', 'لا توجد تقارير يومية.'),
            emptyCtaLabel: l3(language, 'Saisir journal', 'Log daily report', 'إضافة يومية'),
          }}
        />

        <HomePreviewCard
          config={{
            id: 'btp-billing',
            tone: 'sage',
            title: l3(language, 'Situations Mensuelles (DGP)', 'Progress Billings (DGP)', 'كشوف الأشغال الشهرية'),
            subtitle: l3(language, 'Décomptes & mandats Trésor', 'Monthly certificates', 'الفواتير والمستحقات'),
            icon: <Wallet size={18} />,
            count: dgps.length,
            items: dgpRows,
            targetScreen: 'finance',
            emptyTitle: l3(language, 'Aucune situation émise.', 'No DGP statements.', 'لا توجد كشوف شهرية.'),
            emptyCtaLabel: l3(language, 'Ouvrir décomptes', 'Open billing', 'فتح الكشوف'),
          }}
        />
      </HomeOperationalRow>

      <HomeLiveHistoryPod events={historique.events} filters={historique.filters} />

      <HomeSetupPod
        roleKey={role}
        setupOverrides={{ btpProjects: projects }}
      />
    </HomeShell>
  );
};

// ============================================================================
// 16. AGRICULTURE & LIVESTOCK (agriculture_farming) — Standardized 4-Row Bento Home (42 / 58)
// ============================================================================
export const AgricultureHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { role, currency, branchName } = useAtriumSelector(
    (s) => ({
      role: s.activeAgriRole || 'gerant',
      currency: selectCurrentBusinessConfigFromState(s).currency || 'DZD',
      branchName: selectCurrentBranchFromState(s)?.name || 'Exploitation',
    }),
    shallowEqualObjects
  );

  const {
    parcels,
    cropCycles,
    workers,
    pointages,
    dairyCows,
    milkingRecords,
    weighbridgeTickets,
  } = useAgricultureData();

  const totalHectares = useMemo(
    () => parcels.reduce((sum, p) => sum + (p.surfaceHectares || 0), 0),
    [parcels]
  );

  const darLockoutsCount = useMemo(
    () => cropCycles.filter((c) => c.currentPhase === 'treatment_locked').length,
    [cropCycles]
  );

  const parcelRows: HomePreviewRow[] = useMemo(
    () =>
      parcels.slice(0, 4).map((p) => ({
        id: p.id,
        primary: p.name,
        secondary: [p.currentCrop || p.soilType, p.irrigationType].filter(Boolean).join(' · '),
        trailing: `${p.surfaceHectares} ha`,
        statusTone:
          p.status === 'Harvesting' || p.status === 'Growing'
            ? 'positive'
            : p.status === 'Damaged'
            ? 'danger'
            : 'warning',
      })),
    [parcels]
  );

  const cycleRows: HomePreviewRow[] = useMemo(
    () =>
      cropCycles.slice(0, 4).map((c) => ({
        id: c.id,
        primary: `${c.cropName} · ${c.variety}`,
        secondary: [
          c.projectedHarvestDate,
          c.activeDarLockoutUntil ? `DAR ${c.activeDarLockoutUntil}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        trailing: `${c.projectedYieldQtx} Qx`,
        statusTone:
          c.currentPhase === 'treatment_locked'
            ? 'danger'
            : c.currentPhase === 'ready_harvest'
            ? 'positive'
            : 'warning',
      })),
    [cropCycles]
  );

  const cowRows: HomePreviewRow[] = useMemo(
    () =>
      dairyCows.slice(0, 4).map((cw) => ({
        id: cw.id,
        primary: `${cw.earTagNumber} · ${cw.nameOrNumber}`,
        secondary: [cw.breed, cw.reproStatus].filter(Boolean).join(' · '),
        trailing: `${cw.dailyAvgLiters} L/j`,
        statusTone: cw.isInWithholdingLockout ? 'danger' : 'positive',
      })),
    [dairyCows]
  );

  const weighRows: HomePreviewRow[] = useMemo(
    () =>
      weighbridgeTickets.slice(0, 4).map((w) => ({
        id: w.id,
        primary: `${w.ticketNumber} · ${w.cropDesignation}`,
        secondary: [w.buyerName, `${w.netWeightKg} kg`].filter(Boolean).join(' · '),
        trailing: formatMoney(w.totalAmountDzd, currency),
        statusTone: w.remainingDueDzd > 0 ? 'warning' : 'positive',
      })),
    [weighbridgeTickets, currency]
  );

  const pointageRows: HomePreviewRow[] = useMemo(
    () =>
      pointages.slice(0, 4).map((pt) => ({
        id: pt.id,
        primary: pt.workerName,
        secondary: [pt.parcelName, `${pt.cratesCollected} caisses`, pt.date]
          .filter(Boolean)
          .join(' · '),
        trailing: formatMoney(pt.netDueDzd, currency),
        statusTone: pt.isPaid ? 'positive' : 'warning',
      })),
    [pointages, currency]
  );

  const historique = useMemo(
    () =>
      buildAgricultureHistorique({
        language,
        currency,
        branchName,
        role,
        pointages,
        milkingRecords,
        weighbridgeTickets,
        cropCycles,
      }),
    [language, currency, branchName, role, pointages, milkingRecords, weighbridgeTickets, cropCycles]
  );

  const isGerant = role === 'gerant';
  const isChefCulture = role === 'chef_culture';
  const isZootech = role === 'zootechnicien';
  const isMagasinier = role === 'magasinier';

  const quickActions: HomeQuickAction[] = [
    ...(!isZootech && !isMagasinier
      ? [
          {
            id: 'agri-parcels',
            label: l3(language, 'Parcelles & Forage', 'Parcels & Land', 'القطع والسقي'),
            icon: <Sprout size={15} />,
            onClick: () => setScreenAction('members'),
          },
          {
            id: 'agri-cycles',
            label: l3(language, 'Cultures & Phytosanitaire', 'Crop Cycles', 'المواسم والمعالجة'),
            icon: <Calendar size={15} />,
            onClick: () => setScreenAction('scheduler'),
          },
        ]
      : []),
    ...(isGerant || isZootech
      ? [
          {
            id: 'agri-livestock',
            label: l3(language, 'Cheptel & Traite ONIL', 'Livestock & Dairy', 'القطيع والحلب'),
            icon: <Layers size={15} />,
            onClick: () => setScreenAction('registrations'),
          },
        ]
      : []),
    ...(isGerant || isMagasinier
      ? [
          {
            id: 'agri-weighbridge',
            label: l3(language, 'Pont-Bascule & Gros', 'Weighbridge & Sales', 'الميزان والتسويق'),
            icon: <Wallet size={15} />,
            onClick: () => setScreenAction('finance'),
          },
        ]
      : []),
  ];

  const primaryCards: HomePreviewCardConfig[] = useMemo(() => {
    const cards: HomePreviewCardConfig[] = [];
    if (isGerant || isChefCulture) {
      cards.push({
        id: 'agri-parcels',
        tone: 'terracotta',
        title: l3(language, 'Parcelles & Eau ANRH', 'Parcels & Irrigation', 'القطع الفلاحية والسقي'),
        subtitle: l3(language, 'Surface, sols & quotas hydriques', 'Hectares & water meters', 'المساحة وحصص المياه'),
        icon: <Sprout size={18} />,
        count: parcels.length,
        countLabel: `${totalHectares.toFixed(1)} ha`,
        items: parcelRows,
        targetScreen: 'members',
        emptyTitle: l3(language, 'Aucune parcelle enregistrée.', 'No parcels added.', 'لا توجد قطع أرضية.'),
        emptyCtaLabel: l3(language, 'Voir parcelles', 'Open parcels', 'فتح القطع'),
      });
      cards.push({
        id: 'agri-cycles',
        tone: 'lavender',
        title: l3(language, 'Cultures & Traitements DAR', 'Crops & Treatments', 'المواسم والمعالجة'),
        subtitle: l3(language, 'Phases végétatives & délais avant récolte', 'Crop stages & DAR locks', 'مراحل النمو وفترة الأمان'),
        icon: <Calendar size={18} />,
        count: cropCycles.length,
        items: cycleRows,
        targetScreen: 'scheduler',
        emptyTitle: l3(language, 'Aucun cycle cultural.', 'No crop cycles yet.', 'لا توجد مواسم مزروعة.'),
        emptyCtaLabel: l3(language, 'Voir cultures', 'Open cycles', 'فتح المحاصيل'),
      });
    }
    if (isGerant || isChefCulture || isMagasinier) {
      cards.push({
        id: 'agri-harvest',
        tone: 'brown',
        title: l3(language, 'Récoltes & Pointage Saisonnier', 'Harvest & Piecework', 'الجني وعمال الموسم'),
        subtitle: l3(
          language,
          `${workers.length} saisonniers · caisses & acomptes`,
          `${workers.length} seasonal workers`,
          `${workers.length} عامل موسمي`
        ),
        icon: <Layers size={18} />,
        count: pointages.length,
        items: pointageRows,
        targetScreen: 'shop',
        emptyTitle: l3(language, 'Aucun pointage de récolte.', 'No harvest logs yet.', 'لا توجد سجلات جني.'),
        emptyCtaLabel: l3(language, 'Ouvrir pointage', 'Open harvest', 'فتح الجني'),
      });
    }
    if (isGerant || isZootech) {
      cards.push({
        id: 'agri-livestock',
        tone: 'sage',
        title: l3(language, 'Cheptel Bovin & Collecte Lait', 'Dairy Herd & ONIL', 'تربية الأبقار والحليب'),
        subtitle: l3(
          language,
          `${milkingRecords.length} collectes · primes ONIL`,
          `${milkingRecords.length} milking logs`,
          `${milkingRecords.length} سجلات حلب`
        ),
        icon: <Layers size={18} />,
        count: dairyCows.length,
        items: cowRows,
        targetScreen: 'registrations',
        emptyTitle: l3(language, 'Aucune tête enregistrée.', 'No livestock records.', 'لا يوجد قطيع مسجل.'),
        emptyCtaLabel: l3(language, 'Voir cheptel', 'Open livestock', 'فتح القطيع'),
      });
    }
    if (isGerant || isMagasinier) {
      cards.push({
        id: 'agri-weighbridge',
        tone: 'terracotta',
        title: l3(language, 'Pont-Bascule & Mandataires', 'Weighbridge & Market', 'جسر الوزن والأسواق'),
        subtitle: l3(language, 'Pesées nettes & ventes gros', 'Net weight tickets', 'تذاكر الوزن والبيع بالجملة'),
        icon: <Wallet size={18} />,
        count: weighbridgeTickets.length,
        items: weighRows,
        targetScreen: 'finance',
        emptyTitle: l3(language, 'Aucun ticket de pesée.', 'No weighbridge tickets.', 'لا توجد تذاكر وزن.'),
        emptyCtaLabel: l3(language, 'Ouvrir bascule', 'Open weighbridge', 'فتح الميزان'),
      });
    }
    return cards;
  }, [
    isGerant,
    isChefCulture,
    isZootech,
    isMagasinier,
    language,
    parcels.length,
    totalHectares,
    parcelRows,
    cropCycles.length,
    cycleRows,
    workers.length,
    pointages.length,
    pointageRows,
    milkingRecords.length,
    dairyCows.length,
    cowRows,
    weighbridgeTickets.length,
    weighRows,
  ]);

  const roleTargetScreen = isZootech
    ? ('registrations' as const)
    : isChefCulture
    ? ('members' as const)
    : isMagasinier
    ? ('finance' as const)
    : ('dashboard' as const);

  return (
    <HomeShell
      roleKey={role}
      quickActions={quickActions}
      dashboardTarget={isGerant ? 'dashboard' : roleTargetScreen}
      dashboardLabel={
        !isGerant
          ? l3(language, 'Ouvrir Poste Métier', 'Open Role Space', 'فتح مساحة الدور')
          : undefined
      }
      testId={`home-agriculture-${role}`}
    >
      {/* Standardized 42/58 Hero Left / Priority Right */}
      <HomeHeroRow
        ratio={CATEGORY_HOME_RATIO.agriculture_farming}
        heroTitle={l3(language, 'Repères Exploitation', 'Estate Pulse', 'مؤشرات الاستغلالية')}
        heroChildren={
          <>
            <HomeAnchorCard
              title={
                isZootech
                  ? l3(language, 'Têtes de Cheptel', 'Active Dairy Herd', 'رؤوس الماشية')
                  : isMagasinier
                  ? l3(language, 'Tickets Pont-Bascule', 'Weighbridge Tickets', 'تذاكر الميزان')
                  : l3(language, 'Surface Cultivée', 'Managed Acreage', 'المساحة المستغلة')
              }
              value={
                isZootech
                  ? dairyCows.length
                  : isMagasinier
                  ? weighbridgeTickets.length
                  : `${totalHectares.toFixed(1)} ha`
              }
              badgeText={
                isZootech
                  ? `${milkingRecords.length} ${l3(language, 'traites', 'milkings', 'حلبات')}`
                  : `${cropCycles.length} ${l3(language, 'cultures', 'cycles', 'مواسم')}`
              }
              badgeVariant="orange"
              sublabel={
                isGerant
                  ? l3(language, 'Ouvrir le tableau de bord agro-industriel', 'Open yield, water quota and ONIL milk dashboard', 'فتح لوحة تحكم المردودية والإنتاج')
                  : l3(language, 'Accéder directement à votre espace opérationnel', 'Open your active operational workspace', 'الانتقال المباشر لمساحة عملك')
              }
              targetScreen={roleTargetScreen}
            />
            <HomeCompactStrip
              config={{
                id: 'agri-team-strip',
                tone: 'lavender',
                title: l3(language, 'Saisonniers & Délais DAR', 'Seasonal Crew & DAR Locks', 'العمال وفترة الأمان'),
                subtitle: `${workers.length} ${l3(language, 'ouvriers saisonniers', 'workers', 'عمال موسميين')} · ${parcels.length} ${l3(language, 'parcelles', 'parcels', 'قطع')}`,
                icon: <Sprout size={17} />,
                count: darLockoutsCount,
                statusText:
                  darLockoutsCount > 0
                    ? `${darLockoutsCount} ${l3(language, 'DAR actifs', 'DAR locks', 'تحت الحظر')}`
                    : l3(language, 'Récoltes ouvertes', 'Harvest open', 'مفتوح للجني'),
                targetScreen: isZootech ? 'registrations' : isMagasinier ? 'shop' : 'scheduler',
              }}
            />
          </>
        }
        priorityTitle={
          isZootech
            ? l3(language, 'Collecte Lait ONIL', 'ONIL Milk Deliveries', 'تسليم الحليب')
            : l3(language, 'Expéditions Gros & Bascule', 'Wholesale Weighbridge', 'مبيعات الجملة والميزان')
        }
        priorityChildren={
          <HomePreviewCard
            config={{
              id: 'agri-side-highlight',
              tone: 'brown',
              title: isZootech
                ? l3(language, 'Collecte Lait ONIL', 'ONIL Milk Deliveries', 'تسليم الحليب')
                : l3(language, 'Expéditions Gros & Bascule', 'Wholesale Weighbridge', 'مبيعات الجملة والميزان'),
              subtitle: isZootech
                ? l3(language, 'Litres conformes & subventions', 'Conforming tank yield', 'الكميات المقبولة والمنحة')
                : l3(language, 'Dernières pesées commerciales', 'Latest harvest shipments', 'أحدث الشحنات المسوقة'),
              icon: <Wallet size={18} />,
              count: isZootech ? milkingRecords.length : weighbridgeTickets.length,
              items: isZootech
                ? milkingRecords.slice(0, 4).map((m) => ({
                    id: m.id,
                    primary: `${m.sessionDate} · ${m.destinationDairy}`,
                    secondary: `${m.conformingLiters} L`,
                    trailing: formatMoney(m.onilTotalSubsidyDzd, currency),
                    statusTone: m.rejectedWithholdingLiters > 0 ? 'warning' : 'positive',
                  }))
                : weighRows,
              targetScreen: isZootech ? 'registrations' : isChefCulture ? 'shop' : 'finance',
              emptyTitle: l3(language, 'Aucune opération récente.', 'No recent activity.', 'لا توجد عمليات حديثة.'),
              emptyCtaLabel: l3(language, 'Ouvrir module', 'Open workspace', 'فتح القسم'),
            }}
          />
        }
      />

      <HomeOperationalRow title={l3(language, 'Espaces du Domaine', 'Estate Workspaces', 'أقسام المزرعة')}>
        {primaryCards.map((card) => (
          <HomePreviewCard key={card.id} config={card} />
        ))}
      </HomeOperationalRow>

      <HomeLiveHistoryPod events={historique.events} filters={historique.filters} />

      <HomeSetupPod
        roleKey={role}
        setupOverrides={{ agriParcels: parcels }}
      />
    </HomeShell>
  );
};
