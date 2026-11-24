import React, { useState, useRef } from 'react';
import {
  Settings,
  Building2,
  Monitor,
  ShieldCheck,
  Plus,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Database,
  Cloud,
  CloudOff,
  RotateCw,
  Laptop,
  FileDown,
  FileUp,
  Printer,
  WifiOff,
  Download,
  HardDrive,
  Globe,
  Check,
  Activity,
  Sun,
  Moon,
  Layout,
  ChevronUp,
  History,
  Layers,
  Receipt,
  Scale,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  useDashboardShellState,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBusinessConfigFromState,
  selectCurrentDevicesFromState,
  selectCurrentMembersFromState,
  selectCurrentProductsFromState,
  selectCurrentFreelanceClientsFromState,
  selectCurrentFreelanceInvoicesFromState,
  selectCurrentSalesFromState,
  selectQuotasFromState,
  isSupabaseConfigured as checkSupabaseConfigured,
  showToast,
  validateBackupSnapshot,
  type BackupValidationResult,
} from '../../services/store';
import { SettingsTabId } from '../../types/index';
import { Modal } from '../ui/Modal';
import { AuditLogViewerModal } from '../modals/AuditLogViewerModal';
import { validateVoucherCode } from '../../utils/rules';
import { LabelInput } from '../ui/LabelInput';
import { Button, LiquidButton, Toggle } from '@/atrium/core';
import { AtriumButton } from '../ui/AtriumButton';
import { t, getSystemDefaultLanguage, SUPPORTED_LANGUAGES } from '../../utils/i18n';
import { useSkeletonLoading } from '../../hooks/useSkeletonLoading';
import { SkeletonPageHeader } from '../ui/skeleton/StructuralSkeletons';
import { SkeletonBox, SkeletonText } from '../ui/skeleton/SkeletonPrimitives';
import { SettingsBusinessFiscalTab } from './settings/SettingsBusinessFiscalTab';
import { SettingsFormulesTab } from './settings/SettingsFormulesTab';
import { SettingsReferenceRatesTab } from './settings/SettingsReferenceRatesTab';

interface SettingsScreenProps {
  onOpenVoucherModal: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenVoucherModal }) => {
  const {
    account,
    subscription,
    businesses,
    branches,
    devices,
    quotas,
    currentBusiness,
    theme,
    density,
    language,
    isLanguageAuto,
    isTopBarAutoHide,
    currentUser,
    members,
    products,
    freelanceClients,
    freelanceInvoices,
    sales,
    supabaseStatus,
    syncErrorMessage,
    settingsTab,
    settingsFocusSection,
    currentBusinessConfig,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      subscription: s.subscription,
      businesses: s.businesses,
      branches: s.branches,
      devices: selectCurrentDevicesFromState(s),
      quotas: selectQuotasFromState(s),
      currentBusiness: selectCurrentBusinessFromState(s),
      theme: s.theme,
      density: s.density || 'default',
      language: s.language,
      isLanguageAuto: s.isLanguageAuto,
      isTopBarAutoHide: s.isTopBarAutoHide ?? false,
      currentUser: s.currentUser,
      members: selectCurrentMembersFromState(s),
      products: selectCurrentProductsFromState(s),
      freelanceClients: selectCurrentFreelanceClientsFromState(s),
      freelanceInvoices: selectCurrentFreelanceInvoicesFromState(s),
      sales: selectCurrentSalesFromState(s),
      supabaseStatus: s.supabaseStatus,
      syncErrorMessage: s.syncErrorMessage,
      settingsTab: s.settingsTab || 'preferences',
      settingsFocusSection: s.settingsFocusSection || null,
      currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
    }),
    shallowEqualObjects
  );
  const { isSyncing, networkMode, lastSyncedAt, retryCloudSync } = useDashboardShellState();
  const isSupabaseConfigured = checkSupabaseConfigured();
  const {
    setTheme,
    setDensity,
    setLanguage,
    setSystemDefaultLanguage,
    toggleTopBarAutoHide,
    addBranch,
    registerDevice,
    revokeDevice,
    openOnboarding,
    openDesktopUpgradeModal,
    syncWithSupabase,
    exportDatabase,
    importDatabase,
    setSettingsTab,
    clearSettingsFocusSection,
    restoreSetupBanner,
  } = useAtriumActions();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [pendingBackupContent, setPendingBackupContent] = useState<string | null>(null);
  const [pendingBackupMeta, setPendingBackupMeta] = useState<{
    exportedAt: string;
    businessesCount: number;
    primaryBusiness: string;
    membersCount: number;
    validation: BackupValidationResult;
  } | null>(null);

  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchError, setBranchError] = useState<string | null>(null);

  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [deviceHwId, setDeviceHwId] = useState('');
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [exportedStatus, setExportedStatus] = useState<string | null>(null);

  const handleExportDataBackup = () => {
    try {
      const fullJson = exportDatabase();
      const blob = new Blob([fullJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `atrium_full_backup_${currentBusiness.name.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        title: 'Backup Exported',
        message: `Database backup for ${currentBusiness.name} downloaded as JSON.`,
      });
      setExportedStatus('Complete database JSON backup downloaded successfully!');
      setTimeout(() => setExportedStatus(null), 4000);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: err?.message || 'Could not generate backup file.',
      });
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const validation = validateBackupSnapshot(text);
      if (!validation.valid || !validation.parsed) {
        showToast({
          type: 'error',
          title: 'Invalid Backup File',
          message:
            validation.errors[0] ||
            'Expected a valid Atrium JSON database export containing account, businesses, and branches.',
        });
        return;
      }

      const parsed = validation.parsed;
      setPendingBackupContent(text);
      setPendingBackupMeta({
        exportedAt: validation.exportedAt || parsed.exportedAt || 'Unknown Date',
        businessesCount: validation.entityCounts.businesses ?? parsed.businesses?.length ?? 0,
        primaryBusiness: validation.primaryBusiness || parsed.businesses?.[0]?.name || 'Unknown Business',
        membersCount: validation.entityCounts.members ?? parsed.members?.length ?? 0,
        validation,
      });
      setIsRestoreModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (!pendingBackupContent) return;
    const success = importDatabase(pendingBackupContent);
    if (success) {
      setExportedStatus('Database restored successfully from backup!');
      setTimeout(() => setExportedStatus(null), 4000);
    } else {
      showToast({
        type: 'error',
        title: 'Restoration Failed',
        message: 'Database could not be imported. Incompatible backup format.',
      });
    }
    setIsRestoreModalOpen(false);
    setPendingBackupContent(null);
    setPendingBackupMeta(null);
  };

  const handleOpenAddBranch = () => {
    if (branches.length >= subscription.plan.maxBranches) {
      openDesktopUpgradeModal('branch_limit');
    } else {
      setIsAddBranchOpen(true);
    }
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    setBranchError(null);
    try {
      addBranch(branchName, branchCode, branchAddress, branchPhone);
      setIsAddBranchOpen(false);
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      setBranchPhone('');
    } catch (err: any) {
      setBranchError(err.message || 'Failed to create branch');
    }
  };

  const handleRegisterDevice = (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceError(null);
    try {
      registerDevice(deviceLabel, deviceHwId);
      setIsAddDeviceOpen(false);
      setDeviceLabel('');
      setDeviceHwId('');
    } catch (err: any) {
      setDeviceError(err.message || 'Failed to register terminal');
    }
  };

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: !!account,
  });

  if (showSkeleton && (!account || networkMode === 'force_skeleton')) {
    return (
      <div className="flex flex-col gap-[var(--ph-mb,24px)] animate-in fade-in duration-200">
        <SkeletonPageHeader hasIcon hasActionBtn={false} hasFacility={false} />
        {/* Tab pills */}
        <div className="flex gap-[var(--s2,8px)] overflow-x-auto pb-[var(--s1,4px)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBox key={i} width={120} height={36} rounded="rounded-full" />
          ))}
        </div>
        {/* Settings Card 1 */}
        <div
          data-sq="panel"
          className="p-[var(--card-pad,20px)] bg-[#F3EDE7] dark:bg-[#191716] flex flex-col gap-[var(--s4,16px)]"
        >
          <SkeletonText size="sm" width="200px" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--card-gap,12px)]">
            <SkeletonBox height={48} sq="ctl" />
            <SkeletonBox height={48} sq="ctl" />
          </div>
        </div>
        {/* Settings Card 2 */}
        <div
          data-sq="panel"
          className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s4,16px)]"
        >
          <SkeletonText size="sm" width="180px" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--card-gap,12px)]">
            <SkeletonBox height={56} sq="ctl" />
            <SkeletonBox height={56} sq="ctl" />
            <SkeletonBox height={56} sq="ctl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--ph-mb,24px)] animate-in fade-in duration-200">
      {/* Row 0: Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4,16px)]">
        <div className="flex items-center gap-[var(--ph-gap,16px)]">
          <div className="sq-elev-card shrink-0">
            <div
              data-sq="tile-lg"
              data-sq-border="none"
              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
              className="w-[var(--ph-tile,48px)] h-[var(--ph-tile,48px)] flex items-center justify-center"
            >
              <Settings size={24} strokeWidth={1.5} />
            </div>
          </div>
          <div className="flex flex-col gap-[var(--ph-sub-gap,4px)]">
            <h1 className="t-page text-[var(--text-1)] dark:text-white">
              {t('settings_title', language)}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            className="hidden"
          />

          <button
            type="button"
            data-sq="ctl"
            onClick={handleExportDataBackup}
            className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] bg-[#EFE9E2] hover:bg-[#E7E0D7] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] text-[var(--text-1)] dark:text-white t-btn flex items-center gap-[var(--btn-icon-gap,8px)] transition-colors cursor-pointer"
            title="Download complete JSON database backup"
          >
            <FileDown size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
            <span>{t('settings_export_backup', language)}</span>
          </button>

          <button
            type="button"
            data-sq="ctl"
            onClick={() => fileInputRef.current?.click()}
            className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] bg-[#EFE9E2] hover:bg-[#E7E0D7] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] text-[var(--text-1)] dark:text-white t-btn flex items-center gap-[var(--btn-icon-gap,8px)] transition-colors cursor-pointer"
            title="Restore database from a JSON backup file"
          >
            <FileUp size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
            <span>{t('settings_restore_backup', language)}</span>
          </button>

          <div className="sq-elev-card">
            <button
              type="button"
              data-sq="ctl"
              onClick={() => openDesktopUpgradeModal('general')}
              className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] bg-neutral-900 hover:bg-neutral-800 text-white t-btn flex items-center gap-[var(--btn-icon-gap,8px)] transition-colors cursor-pointer"
            >
              <Laptop size={16} strokeWidth={1.5} className="text-[var(--brand-on-dark)]" />
              <span>{t('topbar_desktop_app', language)}</span>
            </button>
          </div>

          <button
            type="button"
            data-sq="ctl"
            onClick={openOnboarding}
            className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] bg-[#FDF4F0] dark:bg-[#2B2825] text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] t-btn flex items-center gap-[var(--btn-icon-gap,8px)] hover:bg-[#FBECE6] dark:hover:bg-[#332F2B] transition-colors cursor-pointer"
          >
            <Sparkles size={16} strokeWidth={1.5} />
            <span>{t('action_relaunch_wizard', language)}</span>
          </button>
        </div>
      </div>

      {exportedStatus && (
        <div
          data-sq="card"
          style={{ '--sq-stroke': 'rgba(16,185,129,0.4)' } as React.CSSProperties}
          className="p-[var(--s4,16px)] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 t-small flex items-center gap-[var(--s2,8px)] animate-in fade-in"
        >
          <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-600 shrink-0" />
          <span>{exportedStatus}</span>
        </div>
      )}

      {/* Single-line Horizontal Tab Bar */}
      {(() => {
        const tabs: Array<{ id: SettingsTabId; label: string; icon: React.ReactNode }> = [
          {
            id: 'preferences',
            label: language === 'ar' ? 'التفضيلات' : language === 'fr' ? 'Préférences' : 'Preferences',
            icon: <Globe size={15} strokeWidth={1.5} />,
          },
          {
            id: 'business_fiscal',
            label: language === 'ar' ? 'المنشأة والضرائب' : language === 'fr' ? 'Entreprise & Fiscalité' : 'Business & Fiscal',
            icon: <Receipt size={15} strokeWidth={1.5} />,
          },
          {
            id: 'formules',
            label: language === 'ar' ? 'الصيغ والباقات' : language === 'fr' ? 'Formules & Tarifs' : 'Formules & Catalog',
            icon: <Layers size={15} strokeWidth={1.5} />,
          },
          {
            id: 'reference_rates',
            label: t('settings_tab_reference_rates', language),
            icon: <Scale size={15} strokeWidth={1.5} />,
          },
          {
            id: 'branches_devices',
            label: language === 'ar' ? 'الفروع والأجهزة' : language === 'fr' ? 'Sites & Terminaux' : 'Branches & Terminals',
            icon: <Monitor size={15} strokeWidth={1.5} />,
          },
          {
            id: 'license',
            label: language === 'ar' ? 'الترخيص والاشتراك' : language === 'fr' ? 'Licence & Offre' : 'License & Billing',
            icon: <ShieldCheck size={15} strokeWidth={1.5} />,
          },
          {
            id: 'cloud_backup',
            label: language === 'ar' ? 'السحابة والنسخ' : language === 'fr' ? 'Cloud & Sauvegardes' : 'Cloud & Backup',
            icon: <Cloud size={15} strokeWidth={1.5} />,
          },
        ];

        return (
          <div
            role="tablist"
            aria-label={language === 'ar' ? 'أقسام الإعدادات' : language === 'fr' ? 'Onglets des paramètres' : 'Settings sections'}
            className="flex items-center gap-[var(--s2,8px)] overflow-x-auto pb-[2px] border-b border-[var(--atr-divider)]"
          >
            {tabs.map((tab, idx) => {
              const isSelected = settingsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => setSettingsTab(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') {
                      const next = tabs[(idx + 1) % tabs.length];
                      setSettingsTab(next.id);
                    } else if (e.key === 'ArrowLeft') {
                      const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
                      setSettingsTab(prev.id);
                    }
                  }}
                  className={`h-[38px] px-[var(--s3,12px)] t-small font-semibold inline-flex items-center gap-[var(--s2,8px)] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--brand-fill)] text-white'
                      : 'bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-2)] hover:text-[var(--text-1)] dark:hover:text-white dark:hover:bg-[#2B2825]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      <div className="flex flex-col gap-[var(--pod-gap,16px)]">
      {settingsTab === 'business_fiscal' && (
        <SettingsBusinessFiscalTab
          focusSection={settingsFocusSection}
          onClearFocus={clearSettingsFocusSection}
        />
      )}

      {settingsTab === 'formules' && <SettingsFormulesTab />}

      {settingsTab === 'reference_rates' && <SettingsReferenceRatesTab />}

      {settingsTab === 'preferences' && (
        <>
      {/* Row 1: Language & Regional Localization */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4,16px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
              >
                <Globe size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <div className="flex items-center gap-[var(--s2,8px)]">
                  <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                    {t('settings_lang_title', language)}
                  </h3>
                  <span
                    className={`px-[var(--pill-px,10px)] h-[var(--pill-h,24px)] inline-flex items-center rounded-full t-small ${
                      isLanguageAuto
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-[#FCEEE8] text-[var(--brand-text)] dark:bg-[#d4522f]/20 dark:text-[var(--brand-on-dark)]'
                    }`}
                  >
                    {isLanguageAuto ? `${t('topbar_auto_detected', language)} (${language.toUpperCase()})` : `Manual (${language.toUpperCase()})`}
                  </span>
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {t('settings_lang_desc', language)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-[var(--s2,8px)] self-start sm:self-auto t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
              <span>{t('settings_system_detected_badge', language)}{language === 'fr' ? '\u00A0:' : ':'}</span>
              <span className="t-small text-[var(--text-1)] dark:text-white bg-white dark:bg-[#2B2825] px-[var(--s3,12px)] h-[var(--pill-h,24px)] inline-flex items-center rounded-full">
                {getSystemDefaultLanguage() === 'ar' ? 'العربية (ar)' : getSystemDefaultLanguage() === 'fr' ? 'Français (fr)' : 'English (en)'}
              </span>
            </div>
          </div>

          {/* Language Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--card-gap,12px)]">
            {/* Option 0: System Default */}
            <div className={isLanguageAuto ? 'sq-elev-card' : ''}>
              <button
                type="button"
                data-sq="card"
                data-sq-stroke-w={isLanguageAuto ? 2 : 1}
                style={{ '--sq-stroke': isLanguageAuto ? '#C9461F' : 'var(--sq-stroke-card)' } as React.CSSProperties}
                onClick={() => {
                  setSystemDefaultLanguage();
                }}
                className={`w-full h-full p-[var(--card-pad,20px)] card-opt flex flex-col gap-[var(--s2,8px)] text-start transition-all cursor-pointer relative ${
                  isLanguageAuto
                    ? 'bg-white dark:bg-[#22201E]'
                    : 'bg-white/60 dark:bg-[#22201E]/60 hover:bg-white dark:hover:bg-[#282523]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="t-unit">🌐</span>
                  {isLanguageAuto && (
                    <span className="w-[var(--s6,24px)] h-[var(--s6,24px)] rounded-full bg-[var(--brand-fill)] text-white flex items-center justify-center t-small">
                      <Check size={16} strokeWidth={1.5} />
                    </span>
                  )}
                </div>
                <div className="t-card text-[var(--text-1)] dark:text-white">
                  {t('settings_system_default', language)}
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {t('settings_lang_desc', language)} ({getSystemDefaultLanguage().toUpperCase()})
                </p>
              </button>
            </div>

            {/* Option 1: English */}
            <div className={!isLanguageAuto && language === 'en' ? 'sq-elev-card' : ''}>
              <button
                type="button"
                data-sq="card"
                data-sq-stroke-w={!isLanguageAuto && language === 'en' ? 2 : 1}
                style={{ '--sq-stroke': !isLanguageAuto && language === 'en' ? '#C9461F' : 'var(--sq-stroke-card)' } as React.CSSProperties}
                onClick={() => {
                  setLanguage('en', false);
                }}
                className={`w-full h-full p-[var(--card-pad,20px)] card-opt flex flex-col gap-[var(--s2,8px)] text-start transition-all cursor-pointer relative ${
                  !isLanguageAuto && language === 'en'
                    ? 'bg-white dark:bg-[#22201E]'
                    : 'bg-white/60 dark:bg-[#22201E]/60 hover:bg-white dark:hover:bg-[#282523]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="t-unit">🇺🇸</span>
                  {!isLanguageAuto && language === 'en' && (
                    <span className="w-[var(--s6,24px)] h-[var(--s6,24px)] rounded-full bg-[var(--brand-fill)] text-white flex items-center justify-center t-small">
                      <Check size={16} strokeWidth={1.5} />
                    </span>
                  )}
                </div>
                <div className="t-card text-[var(--text-1)] dark:text-white">
                  English (US / UK)
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  Standard Left-to-Right (LTR)
                </p>
              </button>
            </div>

            {/* Option 2: Français */}
            <div className={!isLanguageAuto && language === 'fr' ? 'sq-elev-card' : ''}>
              <button
                type="button"
                data-sq="card"
                data-sq-stroke-w={!isLanguageAuto && language === 'fr' ? 2 : 1}
                style={{ '--sq-stroke': !isLanguageAuto && language === 'fr' ? '#C9461F' : 'var(--sq-stroke-card)' } as React.CSSProperties}
                onClick={() => {
                  setLanguage('fr', false);
                }}
                className={`w-full h-full p-[var(--card-pad,20px)] card-opt flex flex-col gap-[var(--s2,8px)] text-start transition-all cursor-pointer relative ${
                  !isLanguageAuto && language === 'fr'
                    ? 'bg-white dark:bg-[#22201E]'
                    : 'bg-white/60 dark:bg-[#22201E]/60 hover:bg-white dark:hover:bg-[#282523]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="t-unit">🇫🇷</span>
                  {!isLanguageAuto && language === 'fr' && (
                    <span className="w-[var(--s6,24px)] h-[var(--s6,24px)] rounded-full bg-[var(--brand-fill)] text-white flex items-center justify-center t-small">
                      <Check size={16} strokeWidth={1.5} />
                    </span>
                  )}
                </div>
                <div className="t-card text-[var(--text-1)] dark:text-white">
                  Français (France / Algérie)
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  Mise en page standard (LTR)
                </p>
              </button>
            </div>

            {/* Option 3: العربية */}
            <div className={!isLanguageAuto && language === 'ar' ? 'sq-elev-card' : ''}>
              <button
                type="button"
                data-sq="card"
                data-sq-stroke-w={!isLanguageAuto && language === 'ar' ? 2 : 1}
                style={{ '--sq-stroke': !isLanguageAuto && language === 'ar' ? '#C9461F' : 'var(--sq-stroke-card)' } as React.CSSProperties}
                onClick={() => {
                  setLanguage('ar', false);
                }}
                className={`w-full h-full p-[var(--card-pad,20px)] card-opt flex flex-col gap-[var(--s2,8px)] text-start transition-all cursor-pointer relative ${
                  !isLanguageAuto && language === 'ar'
                    ? 'bg-white dark:bg-[#22201E]'
                    : 'bg-white/60 dark:bg-[#22201E]/60 hover:bg-white dark:hover:bg-[#282523]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="t-unit">🇩🇿</span>
                  {!isLanguageAuto && language === 'ar' && (
                    <span className="w-[var(--s6,24px)] h-[var(--s6,24px)] rounded-full bg-[var(--brand-fill)] text-white flex items-center justify-center t-small">
                      <Check size={16} strokeWidth={1.5} />
                    </span>
                  )}
                </div>
                <div className="t-card text-[var(--text-1)] dark:text-white">
                  العربية (الجزائر / MENA)
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  دعم أصيل من اليمين إلى اليسار (RTL)
                </p>
              </button>
            </div>
          </div>

          {/* RTL Information callout */}
          <div data-sq="card" className="py-[var(--s3,12px)] px-[var(--s4,16px)] bg-white dark:bg-[#22201E] flex items-center gap-[var(--s3,12px)] t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
            <Sparkles size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0" />
            <span>{t('settings_rtl_notice', language)}</span>
          </div>
        </div>
      </div>

      {/* Row 1.1: Appearance & Theme Mode */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4,16px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
              >
                {theme === 'dark' ? <Moon size={20} strokeWidth={1.5} /> : <Sun size={20} strokeWidth={1.5} />}
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <div className="flex items-center gap-[var(--s2,8px)]">
                  <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'المظهر والسمة' : language === 'fr' ? 'Apparence' : 'Theme'}
                  </h3>
                  <span className="px-[var(--pill-px,10px)] h-[var(--pill-h,24px)] inline-flex items-center rounded-full t-small bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                    {theme === 'dark'
                      ? (language === 'ar' ? 'داكن' : language === 'fr' ? 'Sombre' : 'Dark')
                      : (language === 'ar' ? 'فاتح' : language === 'fr' ? 'Clair' : 'Light')}
                  </span>
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {language === 'ar'
                    ? 'اختر مظهر العرض المناسب لعملك'
                    : language === 'fr'
                    ? 'Choisissez le thème visuel adapté à votre espace'
                    : 'Select your preferred display theme'}
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Theme Toggle */}
          <div className="sq-elev-card">
            <div data-sq="card" className="flex items-center justify-between p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] card-opt">
              <div className="flex items-center gap-[var(--card-head-gap,12px)]">
                <div data-sq="ctl-sm" data-sq-border="none" className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center">
                  {theme === 'dark' ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
                </div>
                <div className="flex flex-col gap-[var(--name-sub-gap,2px)]">
                  <div className="t-card text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'الوضع الليلي' : language === 'fr' ? 'Mode sombre' : 'Dark Mode'}
                  </div>
                  <div className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                    {theme === 'dark'
                      ? (language === 'ar' ? 'ليلي' : language === 'fr' ? 'Sombre' : 'Night')
                      : (language === 'ar' ? 'نهاري' : language === 'fr' ? 'Clair' : 'Day')}
                  </div>
                </div>
              </div>
              <Toggle
                aria-label="Toggle dark mode"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => {
                  setTheme(checked ? 'dark' : 'light');
                }}
              />
            </div>
          </div>

          {/* Theme Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--card-gap,12px)]">
            {/* Option: Light Mode */}
            <div className={theme === 'light' ? 'sq-elev-card' : ''}>
              <button
                type="button"
                data-sq="card"
                data-sq-stroke-w={theme === 'light' ? 2 : 1}
                style={{ '--sq-stroke': theme === 'light' ? '#C9461F' : 'var(--sq-stroke-card)' } as React.CSSProperties}
                onClick={() => {
                  setTheme('light');
                }}
                className={`w-full h-full p-[var(--card-pad,20px)] text-start transition-all cursor-pointer relative flex flex-col gap-[var(--s2,8px)] card-opt ${
                  theme === 'light'
                    ? 'bg-white dark:bg-[#22201E]'
                    : 'bg-white/60 dark:bg-[#22201E]/60 hover:bg-white dark:hover:bg-[#282523]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div data-sq="tile" data-sq-border="none" className="w-[var(--tile,40px)] h-[var(--tile,40px)] bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                    <Sun size={20} strokeWidth={1.5} />
                  </div>
                  {theme === 'light' && (
                    <span className="w-[var(--s6,24px)] h-[var(--s6,24px)] rounded-full bg-[var(--brand-fill)] text-white flex items-center justify-center t-small shadow-xs">
                      <Check size={16} strokeWidth={1.5} />
                    </span>
                  )}
                </div>
                <div className="t-card text-[var(--text-1)] dark:text-white">
                  {language === 'ar' ? 'فاتح' : language === 'fr' ? 'Mode clair' : 'Light Theme'}
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {language === 'ar' ? 'واجهة ناصعة للاستخدام النهاري' : language === 'fr' ? 'Interface claire et contrastée' : 'Clean bright canvas for daytime use'}
                </p>
              </button>
            </div>

            {/* Option: Dark Mode */}
            <div className={theme === 'dark' ? 'sq-elev-card' : ''}>
              <button
                type="button"
                data-sq="card"
                data-sq-stroke-w={theme === 'dark' ? 2 : 1}
                style={{ '--sq-stroke': theme === 'dark' ? '#C9461F' : 'var(--sq-stroke-card)' } as React.CSSProperties}
                onClick={() => {
                  setTheme('dark');
                }}
                className={`w-full h-full p-[var(--card-pad,20px)] text-start transition-all cursor-pointer relative flex flex-col gap-[var(--s2,8px)] card-opt ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-[#22201E]'
                    : 'bg-white/60 dark:bg-[#22201E]/60 hover:bg-white dark:hover:bg-[#282523]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div data-sq="tile" data-sq-border="none" className="w-[var(--tile,40px)] h-[var(--tile,40px)] bg-neutral-900 text-amber-300 flex items-center justify-center">
                    <Moon size={20} strokeWidth={1.5} />
                  </div>
                  {theme === 'dark' && (
                    <span className="w-[var(--s6,24px)] h-[var(--s6,24px)] rounded-full bg-[var(--brand-fill)] text-white flex items-center justify-center t-small shadow-xs">
                      <Check size={16} strokeWidth={1.5} />
                    </span>
                  )}
                </div>
                <div className="t-card text-[var(--text-1)] dark:text-white">
                  {language === 'ar' ? 'داكن' : language === 'fr' ? 'Mode sombre' : 'Dark Theme'}
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {language === 'ar' ? 'ألوان داكنة مريحة للعينين ليلاً' : language === 'fr' ? 'Teintes sombres pour un confort maximal' : 'Dark surfaces for low-light comfort'}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1.2: Layout, Compact Mode & Top Bar Settings */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4,16px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
              >
                <Layout size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <div className="flex items-center gap-[var(--s2,8px)]">
                  <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'تخطيط الواجهة والكثافة' : language === 'fr' ? 'Interface et densité' : 'Navigation Bar & Density'}
                  </h3>
                  <span className="px-[var(--pill-px,10px)] h-[var(--pill-h,24px)] inline-flex items-center rounded-full t-small bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                    {density === 'compact'
                      ? (language === 'ar' ? 'مكثف' : language === 'fr' ? 'Compact' : 'Compact')
                      : (language === 'ar' ? 'قياسي' : language === 'fr' ? 'Standard' : 'Standard')}
                  </span>
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {language === 'ar'
                    ? 'التحكم في كثافة الجداول وسلوك الشريط العلوي عند التمرير'
                    : language === 'fr'
                    ? 'Densité des tableaux et masquage automatique de la barre lors du défilement'
                    : 'Control compact workspace density and top bar scroll auto-hide behavior'}
                </p>
              </div>
            </div>
          </div>

          {/* Compact Mode Toggle (Section 12) */}
          <div className="sq-elev-card">
            <div data-sq="card" className="flex items-center justify-between p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] card-opt">
              <div className="flex items-center gap-[var(--card-head-gap,12px)]">
                <div data-sq="ctl-sm" data-sq-border="none" className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center">
                  <Layout size={16} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-[var(--name-sub-gap,2px)]">
                  <div className="t-card text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'الوضع المكثف (1280px)' : language === 'fr' ? 'Mode compact' : 'Compact Mode'}
                  </div>
                  <div className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                    {density === 'compact'
                      ? (language === 'ar' ? 'صفوف 56px، بطاقات 16px، حاوية 8px' : language === 'fr' ? 'Lignes 56 px, cartes 16 px, groupe 8 px' : 'Rows 56px, cards 16px, pod 8px')
                      : (language === 'ar' ? 'كثافة قياسية (صفوف 64px، بطاقات 20px)' : language === 'fr' ? 'Densité standard (lignes 64 px, cartes 20 px)' : 'Default spacing (rows 64px, cards 20px)')}
                  </div>
                </div>
              </div>
              <Toggle
                aria-label="Toggle Compact Mode"
                checked={density === 'compact'}
                onCheckedChange={(checked) => {
                  setDensity(checked ? 'compact' : 'default');
                }}
              />
            </div>
          </div>

          {/* Auto-Hide Switch */}
          <div className="sq-elev-card">
            <div data-sq="card" className="flex items-center justify-between p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] card-opt">
              <div className="flex items-center gap-[var(--card-head-gap,12px)]">
                <div data-sq="ctl-sm" data-sq-border="none" className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center">
                  <ChevronUp size={16} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-[var(--name-sub-gap,2px)]">
                  <div className="t-card text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'إخفاء تلقائي' : language === 'fr' ? 'Masquage automatique' : 'Auto-Hide'}
                  </div>
                  <div className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                    {isTopBarAutoHide
                      ? (language === 'ar' ? 'يختفي عند التمرير للأسفل' : language === 'fr' ? 'Masqué au défilement' : 'Hides on scroll down')
                      : (language === 'ar' ? 'ثابت ودائم الظهور' : language === 'fr' ? 'Toujours visible' : 'Always visible')}
                  </div>
                </div>
              </div>
              <Toggle
                aria-label="Toggle Top Bar Auto-hide"
                checked={isTopBarAutoHide}
                onCheckedChange={() => {
                  toggleTopBarAutoHide();
                }}
              />
            </div>
          </div>

          {/* Feature summary pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--card-gap,12px)]">
            <div data-sq="card" className="p-[var(--card-pad,20px)] bg-white/70 dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)] card-opt">
              <div className="t-small font-semibold text-[var(--text-1)] dark:text-white flex items-center gap-[var(--s2,8px)]">
                <span className="w-[var(--s2,8px)] h-[var(--s2,8px)] rounded-full bg-[var(--brand-fill)]" />
                <span>{language === 'ar' ? 'شريط جانبي' : language === 'fr' ? 'Menu latéral' : 'Sidebar Rail'}</span>
              </div>
              <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {language === 'ar' ? 'توسيع سلس دون إزاحة المحتوى' : language === 'fr' ? 'Ouverture fluide sans décalage' : 'Smooth overlay without pushing layout.'}
              </p>
            </div>

            <div data-sq="card" className="p-[var(--card-pad,20px)] bg-white/70 dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)] card-opt">
              <div className="t-small font-semibold text-[var(--text-1)] dark:text-white flex items-center gap-[var(--s2,8px)]">
                <span className="w-[var(--s2,8px)] h-[var(--s2,8px)] rounded-full bg-emerald-600" />
                <span>{language === 'ar' ? 'أداء فوري' : language === 'fr' ? 'Zéro latence' : 'Fast Render'}</span>
              </div>
              <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {language === 'ar' ? 'استجابة سريعة بدون ثقل' : language === 'fr' ? 'Animations fluides accélérées' : 'Hardware-accelerated smooth motion.'}
              </p>
            </div>

            <div data-sq="card" className="p-[var(--card-pad,20px)] bg-white/70 dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)] card-opt">
              <div className="t-small font-semibold text-[var(--text-1)] dark:text-white flex items-center gap-[var(--s2,8px)]">
                <span className="w-[var(--s2,8px)] h-[var(--s2,8px)] rounded-full bg-amber-600" />
                <span>{language === 'ar' ? 'خط واضح' : language === 'fr' ? 'Typographie' : 'Typography'}</span>
              </div>
              <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {language === 'ar' ? 'عناوين عالية الوضوح' : language === 'fr' ? 'Titres haute lisibilité' : 'High-contrast display headers.'}
              </p>
            </div>
          </div>

          {currentBusinessConfig.setupState?.dismissed && (
            <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex items-center justify-between gap-[var(--s3,12px)]">
              <div className="flex flex-col gap-[2px]">
                <span className="t-small font-semibold text-[var(--text-1)]">
                  {language === 'ar'
                    ? 'دليل الإعداد في الصفحة الرئيسية مخفي'
                    : language === 'fr'
                    ? "Bannière de configuration sur l'accueil masquée"
                    : 'Home setup checklist banner is dismissed'}
                </span>
                <span className="t-cap text-[var(--text-2)]">
                  {language === 'ar'
                    ? 'يمكنك إظهارها مجدداً لمراجعة جاهزية الإعدادات.'
                    : language === 'fr'
                    ? "Réaffichez le module de configuration sur l'écran d'accueil."
                    : 'Restore the 5-step configuration pod on your Home hall.'}
                </span>
              </div>
              <AtriumButton
                size="xs"
                variant="secondary"
                onClick={() => {
                  restoreSetupBanner();
                }}
              >
                {language === 'ar' ? 'إظهار في الرئيسية' : language === 'fr' ? 'Réafficher' : 'Restore'}
              </AtriumButton>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {settingsTab === 'license' && (
      /* Row 2: License Status Banner */
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--s4,16px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <div className="flex items-center gap-[var(--s2,8px)]">
                <span className="t-small font-semibold text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {t('settings_license_entitlement', language)}
                </span>
                <span
                  className={`px-[var(--pill-px,10px)] h-[var(--pill-h,24px)] inline-flex items-center rounded-full t-small font-semibold ${
                    subscription.isLifetime
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {subscription.isLifetime ? t('settings_lifetime_badge', language) : t('settings_trial_badge', language)}
                </span>
              </div>
              <h2 className="t-dialog text-[var(--text-1)] tabular-nums">
                {subscription.plan.name}
              </h2>
              <p className="t-cap text-[var(--text-2)]">
                {subscription.isLifetime
                  ? (language === 'ar'
                    ? `تم التفعيل (${subscription.activatedByVoucher || 'LIFETIME'}).`
                    : language === 'fr'
                    ? `Activé (${subscription.activatedByVoucher || 'LIFETIME'}).`
                    : `Activated (${subscription.activatedByVoucher || 'LIFETIME'}).`)
                  : (language === 'ar'
                    ? 'خطة تقييم مجانية.'
                    : language === 'fr'
                    ? 'Version d\'évaluation gratuite.'
                    : 'Free evaluation tier.')}
              </p>
            </div>

            <div className="flex items-center gap-[var(--s2,8px)] shrink-0">
              <div className="sq-elev-card">
                <button
                  type="button"
                  data-sq="ctl"
                  onClick={() => openDesktopUpgradeModal('general')}
                  className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] t-btn text-[var(--text-1)] bg-white dark:bg-[#22201E] hover:bg-[#FAF7F4] dark:hover:bg-[#2B2825] flex items-center gap-[var(--btn-icon-gap,8px)] cursor-pointer transition-colors"
                >
                  <Download size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                  <span>{t('settings_get_desktop', language)}</span>
                </button>
              </div>

              <AtriumButton
                onClick={onOpenVoucherModal}
                icon={<KeyRound size={16} strokeWidth={1.5} />}
                size="md"
              >
                {t('settings_redeem_voucher', language)}
              </AtriumButton>
            </div>
          </div>

          {/* Free Web Edition Banner Notice */}
          <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-gradient-to-r from-[#FDF4F0] via-[#FAF0EA] to-white dark:from-[#26211E] dark:via-[#221E1C] dark:to-[#22201E] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <Laptop size={20} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0" />
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <span className="t-label font-semibold text-[var(--text-1)]">
                  {t('settings_current_plan', language)}{language === 'fr' ? '\u00A0:' : ':'} {t('settings_web_limit', language)}
                </span>
                <p className="text-[var(--text-2)] t-cap">
                  {t('settings_web_limit_desc', language)}
                </p>
              </div>
            </div>
            <AtriumButton
              type="button"
              variant="primary"
              size="xs"
              onClick={() => openDesktopUpgradeModal('general')}
              className="shrink-0 self-start sm:self-auto"
            >
              {language === 'ar' ? 'الترقية' : language === 'fr' ? 'Version Desktop' : 'Get Desktop'}
            </AtriumButton>
          </div>

          {/* Quota gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--card-gap,12px)]">
            <div className="sq-elev-card">
              <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] h-full flex flex-col justify-between gap-[var(--s3,12px)]">
                <span className="t-small text-[var(--text-2)] block">
                  {language === 'ar' ? 'المنشآت' : language === 'fr' ? 'Établissements' : 'Businesses'}
                </span>
                <span className="t-unit font-semibold text-[var(--text-1)] tabular-nums block mt-auto">
                  {businesses.length} / {subscription.plan.maxBusinesses}
                </span>
              </div>
            </div>
            <div className="sq-elev-card">
              <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] h-full flex flex-col justify-between gap-[var(--s3,12px)]">
                <span className="t-small text-[var(--text-2)] block">
                  {language === 'ar' ? 'الفروع' : language === 'fr' ? 'Succursales' : 'Branches'}
                </span>
                <span className="t-unit font-semibold text-[var(--text-1)] tabular-nums block mt-auto">
                  {branches.length} / {subscription.plan.maxBranches}
                </span>
              </div>
            </div>
            <div className="sq-elev-card">
              <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] h-full flex flex-col justify-between gap-[var(--s3,12px)]">
                <span className="t-small text-[var(--text-2)] block">
                  {language === 'ar' ? 'نقاط البيع' : language === 'fr' ? 'Caisses' : 'Terminals'}
                </span>
                <span className="t-unit font-semibold text-[var(--text-1)] tabular-nums block mt-auto">
                  {devices.length} / {subscription.plan.maxDevices}
                </span>
              </div>
            </div>
            <div className="sq-elev-card">
              <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] h-full flex flex-col justify-between gap-[var(--s3,12px)]">
                <span className="t-small text-[var(--text-2)] block">
                  {language === 'ar' ? 'التقارير' : language === 'fr' ? 'Rapports' : 'Reports'}
                </span>
                <span className="t-card text-emerald-700 dark:text-emerald-400 block mt-auto">
                  {subscription.plan.crossBranchReports
                    ? (language === 'ar' ? 'مفعل' : language === 'fr' ? 'Activé' : 'Enabled')
                    : (language === 'ar' ? 'برو فقط' : language === 'fr' ? 'Offre Pro' : 'Pro Only')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {settingsTab === 'cloud_backup' && (
        <>
      {/* Row 1.5: Cloud Sync */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4,16px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                className={`w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0 ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : supabaseStatus === 'connecting'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    : supabaseStatus === 'offline'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-[var(--text-1)]'
                }`}
              >
                <Database size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <div className="flex items-center gap-[var(--s2,8px)]">
                  <h3 className="t-pod text-[var(--text-1)]">
                    {t('settings_supabase_title', language)}
                  </h3>
                  <span
                    className={`h-[var(--badge-h,22px)] px-[var(--s2,8px)] inline-flex items-center rounded-full t-small ${
                      supabaseStatus === 'connected'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : supabaseStatus === 'connecting'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        : supabaseStatus === 'offline'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'bg-neutral-200 text-[var(--text-1)] dark:bg-neutral-700'
                    }`}
                  >
                    {supabaseStatus === 'connected'
                      ? (language === 'ar' ? 'متصل' : language === 'fr' ? 'Connecté' : 'Connected')
                      : supabaseStatus === 'connecting'
                      ? (language === 'ar' ? 'مزامنة' : language === 'fr' ? 'Sync...' : 'Syncing')
                      : supabaseStatus === 'offline'
                      ? (language === 'ar' ? 'محلي' : language === 'fr' ? 'Hors-ligne' : 'Offline')
                      : (language === 'ar' ? 'هجين' : language === 'fr' ? 'Local' : 'Local')}
                  </span>
                </div>
                <p className="t-cap text-[var(--text-2)]">
                  {t('settings_supabase_subtitle', language)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
              <div className="sq-elev-card">
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => setIsAuditLogOpen(true)}
                  className="h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] t-small font-semibold bg-white dark:bg-[#22201E] text-[var(--text-1)] hover:bg-[#FAF7F4] dark:hover:bg-[#2B2825] flex items-center gap-[var(--btn-sm-gap,6px)] cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <History size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                  <span>
                    {language === 'ar' ? 'سجل التدقيق' : language === 'fr' ? 'Journal d’audit' : 'Audit Log'}
                  </span>
                </button>
              </div>
              <div className="sq-elev-card">
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => syncWithSupabase()}
                  disabled={isSyncing}
                  className="h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] t-small font-semibold bg-white dark:bg-[#22201E] text-[var(--text-1)] hover:bg-[#FAF7F4] dark:hover:bg-[#2B2825] flex items-center gap-[var(--btn-sm-gap,6px)] cursor-pointer transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  <RotateCw size={16} strokeWidth={1.5} className={isSyncing ? 'animate-spin text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]' : ''} />
                  <span>
                    {isSyncing
                      ? (language === 'ar' ? 'جاري المزامنة...' : language === 'fr' ? 'Synchronisation...' : 'Syncing...')
                      : (language === 'ar' ? 'مزامنة الآن' : language === 'fr' ? 'Synchroniser' : 'Sync Now')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Cloud Diagnostics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--card-gap,12px)]">
            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-small text-[var(--text-2)] block">
                {language === 'ar' ? 'قاعدة البيانات' : language === 'fr' ? 'Structure' : 'Database'}
              </span>
              <span className="t-card text-[var(--text-1)] block">
                {language === 'ar' ? 'مفعل وآمن' : language === 'fr' ? 'Actif & Sécurisé' : 'Active & Isolated'}
              </span>
              <span className="t-cap text-[var(--text-3)] block">
                {language === 'ar' ? 'عزل بيانات تام' : language === 'fr' ? 'Isolation complète' : 'Tenant isolation'}
              </span>
            </div>

            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-small text-[var(--text-2)] block">
                {language === 'ar' ? 'التحديث المباشر' : language === 'fr' ? 'Temps Réel' : 'Live Updates'}
              </span>
              <span className="t-card text-emerald-700 dark:text-emerald-400 block">
                {language === 'ar' ? 'متصل' : language === 'fr' ? 'Actif' : 'Active'}
              </span>
              <span className="t-cap text-[var(--text-3)] block">
                {language === 'ar' ? 'مزامنة فورية' : language === 'fr' ? 'Entrées & ventes' : 'Check-ins & sales'}
              </span>
            </div>

            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-small text-[var(--text-2)] block">
                {language === 'ar' ? 'آخر مزامنة' : language === 'fr' ? 'Dernière Sync' : 'Last Sync'}
              </span>
              <span className="t-card text-[var(--text-1)] block tabular-nums">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : (language === 'ar' ? 'جاهز' : language === 'fr' ? 'Prêt' : 'Ready')}
              </span>
              <span className="t-cap text-[var(--text-3)] block">
                {isSupabaseConfigured
                  ? (language === 'ar' ? 'سحابة نشطة' : language === 'fr' ? 'Cloud actif' : 'Cloud active')
                  : (language === 'ar' ? 'تخزين محلي' : language === 'fr' ? 'Stockage local' : 'Local storage')}
              </span>
            </div>
          </div>

          {syncErrorMessage && (
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'rgba(244,63,94,0.4)' } as React.CSSProperties}
              className="p-[var(--s3,12px)] bg-rose-50 dark:bg-rose-950/40 t-cap text-rose-700 dark:text-rose-300 flex items-center gap-[var(--s2,8px)]"
            >
              <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0" />
              <span>{syncErrorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1.8: Backup & Restore */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4,16px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div data-sq="tile" className="w-[var(--tile,40px)] h-[var(--tile,40px)] bg-[#FDF4F0] dark:bg-[#2A2420] text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center shrink-0">
                <HardDrive size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <div className="flex items-center gap-[var(--s2,8px)]">
                  <h3 className="t-pod text-[var(--text-1)]">
                    {language === 'ar' ? 'النسخ الاحتياطي' : language === 'fr' ? 'Sauvegarde' : 'Data Backup'}
                  </h3>
                  <span className="h-[var(--badge-h,22px)] px-[var(--s2,8px)] inline-flex items-center rounded-full t-small bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    {language === 'ar' ? 'جاهز' : language === 'fr' ? 'Prêt' : 'Ready'}
                  </span>
                </div>
                <p className="t-cap text-[var(--text-2)]">
                  {language === 'ar'
                    ? 'قم بتنزيل نسخة احتياطية كاملة ومحمولة بصيغة JSON لمساحة عملك، أو استعد بياناتك السابقة على أي جهاز.'
                    : language === 'fr'
                    ? 'Téléchargez une sauvegarde JSON 100% portable de votre espace ou restaurez vos données sur tout appareil.'
                    : 'Download a 100% portable JSON snapshot of your entire workspace or restore past records onto any device.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
              <LiquidButton
                kind="export"
                size="sm"
                labels={{
                  idle: language === 'ar' ? 'تصدير JSON كامل' : language === 'fr' ? 'Exporter JSON' : 'Export JSON',
                  busy: language === 'ar' ? 'جاري التصدير' : language === 'fr' ? 'Exportation...' : 'Exporting...',
                  done: language === 'ar' ? 'تم التصدير' : language === 'fr' ? 'Exporté' : 'Exported',
                }}
                onPress={async () => {
                  await Promise.resolve(handleExportDataBackup());
                }}
              />

              <LiquidButton
                kind="import"
                size="sm"
                tone="ink"
                labels={{
                  idle: t('settings_restore_backup', language),
                  busy: language === 'ar' ? 'استعادة...' : 'Restauration...',
                  done: language === 'ar' ? 'تمت الاستعادة' : 'Restauré',
                }}
                onPress={() => {
                  fileInputRef.current?.click();
                }}
              />
            </div>
          </div>

          {/* Live Storage Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-[var(--card-gap,12px)]">
            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-small text-[var(--text-2)] block">
                {language === 'ar' ? 'المنشآت' : language === 'fr' ? 'Entités' : 'Tenants'}
              </span>
              <span className="t-card text-[var(--text-1)] block tabular-nums">
                {businesses.length} {language === 'ar' ? 'منشأة' : language === 'fr' ? 'Entreprise(s)' : `Business${businesses.length !== 1 ? 'es' : ''}`}
              </span>
              <span className="t-cap text-[var(--text-3)] block tabular-nums">
                {branches.length} {language === 'ar' ? 'فروع' : language === 'fr' ? 'Succursales' : 'Branches'}
              </span>
            </div>

            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-small text-[var(--text-2)] block">
                {language === 'ar' ? 'عملاء CRM' : language === 'fr' ? 'Clients CRM' : 'CRM Clients'}
              </span>
              <span className="t-card text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] block tabular-nums">
                {members.length + (freelanceClients?.length || 0)} {language === 'ar' ? 'جهة اتصال' : language === 'fr' ? 'Contacts' : 'Contacts'}
              </span>
              <span className="t-cap text-[var(--text-3)] block">
                {language === 'ar' ? 'ملفات الحسابات النشطة' : language === 'fr' ? 'Profils comptables actifs' : 'Active ledger profiles'}
              </span>
            </div>

            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-small text-[var(--text-2)] block">
                {language === 'ar' ? 'المخزون والمنتجات' : language === 'fr' ? 'Inventaire' : 'Inventory'}
              </span>
              <span className="t-card text-[var(--text-1)] block tabular-nums">
                {products.length} {language === 'ar' ? 'عنصر' : language === 'fr' ? 'Articles' : 'Items'}
              </span>
              <span className="t-cap text-[var(--text-3)] block">
                {language === 'ar' ? 'البضائع والباقات' : language === 'fr' ? 'Articles & forfaits' : 'SKUs & packages'}
              </span>
            </div>

            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-small text-[var(--text-2)] block">
                {language === 'ar' ? 'المعاملات' : language === 'fr' ? 'Transactions' : 'Transactions'}
              </span>
              <span className="t-card text-[var(--text-1)] block tabular-nums">
                {sales.length + (freelanceInvoices?.length || 0)} {language === 'ar' ? 'سجل' : language === 'fr' ? 'Enregistrements' : 'Records'}
              </span>
              <span className="t-cap text-[var(--text-3)] block">
                {language === 'ar' ? 'الطلبات والفواتير' : language === 'fr' ? 'Commandes & factures' : 'Orders & invoices'}
              </span>
            </div>

            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] col-span-2 sm:col-span-1 flex flex-col gap-[var(--s1,4px)]">
              <span className="t-small text-[var(--text-2)] block">
                {language === 'ar' ? 'محرك التخزين' : language === 'fr' ? 'Moteur stockage' : 'Storage Engine'}
              </span>
              <span className="t-card text-emerald-700 dark:text-emerald-400 block">
                {language === 'ar' ? 'مشفر محلياً' : language === 'fr' ? 'Chiffré' : 'Encrypted'}
              </span>
              <span className="t-cap text-[var(--text-3)] block">LocalStorage v2</span>
            </div>
          </div>

          {exportedStatus && (
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'rgba(16,185,129,0.4)' } as React.CSSProperties}
              className="p-[var(--s3,12px)] bg-emerald-50 dark:bg-emerald-950/40 t-cap text-emerald-700 dark:text-emerald-300 flex items-center gap-[var(--s2,8px)]"
            >
              <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{exportedStatus}</span>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {settingsTab === 'branches_devices' && (
        <>
      {/* Row 2: Branches Management */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex items-center justify-between gap-[var(--s4,16px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <h3 className="t-pod text-[var(--text-1)]">
                {t('settings_branches_title', language)}
              </h3>
              <p className="t-cap text-[var(--text-2)] tabular-nums">
                {language === 'ar'
                  ? `جميع المواقع الفعلية المسجلة للمنشأة (${branches.length} مسجل · ${subscription.plan.maxBranches} مسموح في باقة ${subscription.plan.name})`
                  : language === 'fr'
                  ? `Tous les établissements physiques de l'entreprise (${branches.length} enregistrés · ${subscription.plan.maxBranches} autorisés avec ${subscription.plan.name})`
                  : `All physical locations under tenant business (${branches.length} registered · ${subscription.plan.maxBranches} permitted on ${subscription.plan.name})`}
              </p>
            </div>
            <AtriumButton
              onClick={handleOpenAddBranch}
              icon={<Plus size={16} strokeWidth={1.5} />}
              size="sm"
            >
              {t('settings_add_branch', language)}
            </AtriumButton>
          </div>

          {/* Multi-Branch Desktop Alert when at capacity */}
          {branches.length >= subscription.plan.maxBranches && (
            <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-[#FDF4F0] dark:bg-[#2A2420]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]">
              <div className="flex items-center gap-[var(--card-head-gap,12px)]">
                <Building2 size={20} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0" />
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <span className="t-label font-semibold text-[var(--text-1)]">
                    {language === 'ar' ? 'إدارة الفروع المتعددة ميزة حصرية في Atrium Desktop' : language === 'fr' ? 'La gestion multi-sites est une exclusivité Atrium Desktop' : 'Multi-Facility Management is an Atrium Desktop Feature'}
                  </span>
                  <p className="text-[var(--text-2)] t-cap">
                    {language === 'ar'
                      ? 'إدارة فروع فعلية متعددة، واشتراكات مشتركة وتقارير موحدة للمخزون عبر تطبيق Atrium المكتبي.'
                      : language === 'fr'
                      ? 'Gérez plusieurs succursales physiques, des abonnements multi-sites et des rapports unifiés avec Atrium Desktop.'
                      : 'Manage multiple physical branches, cross-branch memberships, and unified inventory reporting with Atrium Desktop.'}
                  </p>
                </div>
              </div>
              <AtriumButton
                type="button"
                variant="primary"
                size="xs"
                onClick={() => openDesktopUpgradeModal('branch_limit')}
                className="shrink-0 self-start sm:self-auto"
              >
                {language === 'ar' ? 'تحميل Atrium للكمبيوتر (Windows / Mac)' : language === 'fr' ? 'Télécharger Atrium Desktop (Windows / Mac)' : 'Download Atrium Desktop (Windows / Mac)'}
              </AtriumButton>
            </div>
          )}

          <div className="flex flex-col gap-[var(--row-gap,8px)]">
            {branches.map((b) => (
              <div key={b.id} className="sq-elev-card">
                <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex items-center justify-between gap-[var(--s4,16px)] transition-all">
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <div className="flex items-center gap-[var(--s2,8px)]">
                      <span className="t-card text-[var(--text-1)]">
                        {b.name}
                      </span>
                      <span className="tabular-nums t-small bg-[#EFE9E2] dark:bg-[#2B2825] px-[var(--s2,8px)] h-[var(--badge-h,22px)] inline-flex items-center rounded-full text-[var(--text-2)]">
                        {b.code}
                      </span>
                      {b.isMainBranch && (
                        <span className="t-small font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] bg-[#d4522f]/10 px-[var(--s2,8px)] h-[var(--badge-h,22px)] inline-flex items-center rounded-full">
                          {language === 'ar' ? 'المقر الرئيسي' : language === 'fr' ? 'Siège principal' : 'Headquarters'}
                        </span>
                      )}
                    </div>
                    <div className="t-cap text-[var(--text-2)]">
                      {b.address || (language === 'ar' ? 'العنوان غير محدد' : language === 'fr' ? 'Adresse non renseignée' : 'Address not configured')} · {b.phone || (language === 'ar' ? 'بدون هاتف' : language === 'fr' ? 'Sans téléphone' : 'No phone')}
                    </div>
                  </div>

                  <span className="t-small font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-[var(--pill-gap,6px)] bg-emerald-50 dark:bg-emerald-950/40 px-[var(--pill-px,10px)] h-[var(--pill-h,24px)] rounded-full">
                    <span className="w-[var(--pill-dot,6px)] h-[var(--pill-dot,6px)] rounded-full bg-emerald-500" />
                    {language === 'ar' ? 'متصل' : language === 'fr' ? 'En ligne' : 'Online'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Authorized Devices & Terminals */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex items-center justify-between gap-[var(--s4,16px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <h3 className="t-pod text-[var(--text-1)]">
                {t('settings_terminals_title', language)}
              </h3>
              <p className="t-cap text-[var(--text-2)]">
                {t('settings_terminals_subtitle', language)}
              </p>
            </div>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={() => setIsAddDeviceOpen(true)}
              className="h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] t-small font-semibold text-white bg-[var(--brand-fill)] hover:bg-[var(--brand-accent)] flex items-center gap-[var(--btn-sm-gap,6px)] cursor-pointer transition-colors"
            >
              <Plus size={16} strokeWidth={1.5} />
              <span>{t('settings_register_terminal', language)}</span>
            </button>
          </div>

          {/* Hardware integration notice banner */}
          <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-[#FBF8F5] dark:bg-[#22201E] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <Printer size={20} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0" />
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <span className="t-label font-semibold text-[var(--text-1)]">
                  {language === 'ar'
                    ? 'ربط العتاد والمزامنة المحلية عبر تطبيق سطح المكتب'
                    : language === 'fr'
                    ? 'Le matériel et la synchronisation locale nécessitent Atrium Desktop'
                    : 'Hardware & offline sync require Atrium Desktop'}
                </span>
                <p className="text-[var(--text-2)] t-cap">
                  {language === 'ar'
                    ? 'طابعات الإيصالات، أدراج النقد، وقارئات الباركود.'
                    : language === 'fr'
                    ? 'Imprimantes thermiques, tiroirs-caisses et lecteurs.'
                    : 'Receipt printers, cash drawers, and barcode scanners.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openDesktopUpgradeModal('general')}
              className="h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-1)] t-small font-semibold hover:bg-[#E7E0D7] dark:hover:bg-[#332F2B] transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              {language === 'ar' ? 'المزيد' : language === 'fr' ? 'En savoir plus' : 'Learn More'}
            </button>
          </div>

          <div className="flex flex-col gap-[var(--row-gap,8px)]">
            {devices.map((dev) => (
              <div key={dev.id} className="sq-elev-card">
                <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] flex items-center justify-between gap-[var(--s4,16px)] transition-all">
                  <div className="flex items-center gap-[var(--card-head-gap,12px)]">
                    <div data-sq="tile" className="w-[var(--tile,40px)] h-[var(--tile,40px)] bg-[#F3EDE7] dark:bg-[#2B2825] flex items-center justify-center text-[var(--text-1)] shrink-0">
                      <Monitor size={20} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col gap-[var(--name-sub-gap,2px)]">
                      <div className="t-card text-[var(--text-1)]">
                        {dev.label}
                      </div>
                      <div className="t-cap text-[var(--text-2)] tabular-nums">
                        ID: {dev.hardwareId} · {new Date(dev.registeredAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-[var(--s3,12px)]">
                    <span className="t-small text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-[var(--pill-px,10px)] h-[var(--pill-h,24px)] rounded-full flex items-center gap-[var(--pill-gap,6px)]">
                      <span className="w-[var(--pill-dot,6px)] h-[var(--pill-dot,6px)] rounded-full bg-emerald-500" />
                      {language === 'ar' ? 'نشط' : language === 'fr' ? 'Actif' : 'Active'}
                    </span>
                    {devices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => revokeDevice(dev.id)}
                        className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] flex items-center justify-center t-small text-rose-600 hover:text-rose-700 cursor-pointer rounded-full hover:bg-rose-50 transition-colors"
                        title={language === 'ar' ? 'حذف' : language === 'fr' ? 'Révoquer' : 'Revoke'}
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Add Branch Modal */}
      <Modal
        isOpen={isAddBranchOpen}
        onClose={() => setIsAddBranchOpen(false)}
        title={language === 'ar' ? 'إضافة فرع' : language === 'fr' ? 'Ajouter Succursale' : 'Add Branch'}
      >
        <form onSubmit={handleCreateBranch} className="flex flex-col gap-[var(--modal-gap,20px)]">
          {branchError && (
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'rgba(244,63,94,0.4)' } as React.CSSProperties}
              className="p-[var(--s3,12px)] bg-rose-50 dark:bg-rose-950/40 text-rose-700 t-cap"
            >
              {branchError}
            </div>
          )}

          <LabelInput
            field="BranchName"
            label={language === 'ar' ? 'اسم الفرع *' : language === 'fr' ? 'Nom *' : 'Branch Name *'}
            required
            value={branchName}
            onChange={setBranchName}
            placeholder="Sidi Yahia"
            width="100%"
            height={40}
            corner={12}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--card-gap,12px)]">
            <LabelInput
              field="BranchCode"
              label={language === 'ar' ? 'الرمز *' : language === 'fr' ? 'Code *' : 'Code *'}
              required
              value={branchCode}
              onChange={setBranchCode}
              placeholder="APX-WEST"
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="BranchPhone"
              label={language === 'ar' ? 'الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone'}
              type="tel"
              value={branchPhone}
              onChange={setBranchPhone}
              placeholder="+213 21 00 00 00"
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <LabelInput
            field="BranchAddress"
            label={language === 'ar' ? 'العنوان' : language === 'fr' ? 'Adresse' : 'Address'}
            value={branchAddress}
            onChange={setBranchAddress}
            placeholder="Alger"
            width="100%"
            height={40}
            corner={12}
          />

          <div className="flex justify-end gap-[var(--s3,12px)] pt-[var(--s2,8px)] border-t border-[var(--atr-divider)]">
            <Button
              type="button"
              tone="soft"
              size={40}
              onClick={() => setIsAddBranchOpen(false)}
            >
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <AtriumButton
              type="submit"
              size="md"
            >
              {language === 'ar' ? 'إنشاء' : language === 'fr' ? 'Créer' : 'Create'}
            </AtriumButton>
          </div>
        </form>
      </Modal>

      {/* Add Device Modal */}
      <Modal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        title={language === 'ar' ? 'إضافة جهاز' : language === 'fr' ? 'Ajouter Terminal' : 'Add Terminal'}
      >
        <form onSubmit={handleRegisterDevice} className="flex flex-col gap-[var(--modal-gap,20px)]">
          {deviceError && (
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'rgba(244,63,94,0.4)' } as React.CSSProperties}
              className="p-[var(--s3,12px)] bg-rose-50 text-rose-700 t-cap"
            >
              {deviceError}
            </div>
          )}

          <LabelInput
            field="DeviceLabel"
            label={language === 'ar' ? 'اسم الجهاز *' : language === 'fr' ? 'Nom *' : 'Device Name *'}
            required
            value={deviceLabel}
            onChange={setDeviceLabel}
            placeholder="Caisse 2"
            width="100%"
            height={40}
            corner={12}
          />

          <LabelInput
            field="HardwareId"
            label={language === 'ar' ? 'معرّف الجهاز *' : language === 'fr' ? 'ID Matériel *' : 'Device ID *'}
            required
            value={deviceHwId}
            onChange={setDeviceHwId}
            placeholder="POS-03"
            width="100%"
            height={40}
            corner={12}
          />

          <div className="flex justify-end gap-[var(--s3,12px)] pt-[var(--s2,8px)] border-t border-[var(--atr-divider)]">
            <Button
              type="button"
              tone="soft"
              size={40}
              onClick={() => setIsAddDeviceOpen(false)}
            >
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <AtriumButton
              type="submit"
              size="md"
            >
              {language === 'ar' ? 'حفظ' : language === 'fr' ? 'Autoriser' : 'Authorize'}
            </AtriumButton>
          </div>
        </form>
      </Modal>

      {/* Restore Database Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setPendingBackupContent(null);
          setPendingBackupMeta(null);
        }}
        title={language === 'ar' ? 'استعادة قاعدة البيانات من النسخة الاحتياطية' : language === 'fr' ? 'Restaurer la base de données' : 'Restore Database from Backup'}
      >
        <div className="flex flex-col gap-[var(--modal-gap,20px)]">
          <div
            data-sq="card"
            style={{ '--sq-stroke': 'rgba(245,158,11,0.4)' } as React.CSSProperties}
            className="p-[var(--s4,16px)] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-start gap-[var(--s3,12px)]"
          >
            <AlertTriangle size={20} strokeWidth={1.5} className="text-amber-600 shrink-0" />
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <p className="t-label font-semibold">
                {language === 'ar' ? 'تنبيه: استبدال شامل لبيانات النظام' : language === 'fr' ? 'Attention : Remplacement des données' : 'Caution: State Overwrite'}
              </p>
              <p className="t-cap opacity-90">
                {language === 'ar'
                  ? 'استعادة هذا الملف سيستبدل المنشآت الحالية، الفروع، الأعضاء، والمعاملات بالبيانات المحفوظة في النسخة الاحتياطية.'
                  : language === 'fr'
                  ? 'La restauration remplacera l\'ensemble des entités, succursales, membres et transactions actuels par les données de la sauvegarde.'
                  : 'Restoring this backup file will replace your current businesses, branches, members, and transactions with the backup snapshot.'}
              </p>
            </div>
          </div>

          {pendingBackupMeta && (
            <div className="flex flex-col gap-[var(--card-gap,12px)]">
              <div data-sq="card" className="p-[var(--s4,16px)] bg-[#F5F1EC] dark:bg-[#22201E] flex flex-col gap-[var(--s2,8px)] t-cap">
                <div className="flex justify-between py-[var(--s1,4px)] border-b border-[var(--atr-divider)]">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'تاريخ تصدير النسخة:' : language === 'fr' ? 'Date de la sauvegarde :' : 'Backup Export Date:'}
                  </span>
                  <span className="t-small font-semibold text-[var(--text-1)] tabular-nums">
                    {pendingBackupMeta.exportedAt !== 'Unknown Date'
                      ? new Date(pendingBackupMeta.exportedAt).toLocaleString()
                      : pendingBackupMeta.exportedAt}
                  </span>
                </div>
                <div className="flex justify-between py-[var(--s1,4px)] border-b border-[var(--atr-divider)]">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'المنشأة الرئيسية:' : language === 'fr' ? 'Entreprise principale :' : 'Primary Business:'}
                  </span>
                  <span className="t-small font-semibold text-[var(--text-1)]">
                    {pendingBackupMeta.primaryBusiness}
                  </span>
                </div>
                <div className="flex justify-between py-[var(--s1,4px)] border-b border-[var(--atr-divider)]">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'نسخة المخطط / البصمة:' : language === 'fr' ? 'Schéma / Empreinte :' : 'Schema / Checksum:'}
                  </span>
                  <span className="t-small font-semibold text-[var(--text-1)] tabular-nums">
                    v{String(pendingBackupMeta.validation.schemaVersion)} · {pendingBackupMeta.validation.checksum}
                  </span>
                </div>
                <div className="flex justify-between py-[var(--s1,4px)] border-b border-[var(--atr-divider)]">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'إجمالي السجلات:' : language === 'fr' ? 'Total des enregistrements :' : 'Total Records:'}
                  </span>
                  <span className="t-small font-semibold text-[var(--text-1)] tabular-nums">
                    {pendingBackupMeta.validation.totalRecords.toLocaleString()} ({pendingBackupMeta.businessesCount}{' '}
                    {language === 'ar' ? 'منشأة' : language === 'fr' ? 'entités' : 'businesses'})
                  </span>
                </div>
                <div className="flex justify-between py-[var(--s1,4px)]">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'الأعضاء / جهات الاتصال:' : language === 'fr' ? 'Membres / Contacts :' : 'Members / Contacts:'}
                  </span>
                  <span className="t-small font-semibold text-[var(--text-1)] tabular-nums">
                    {pendingBackupMeta.membersCount} {language === 'ar' ? 'سجل' : language === 'fr' ? 'enregistrements' : 'records'}
                  </span>
                </div>
                <div className="pt-[var(--s2,8px)] border-t border-[var(--atr-divider)] flex flex-wrap gap-x-[var(--s3,12px)] gap-y-[var(--s1,4px)] t-cap text-[var(--text-2)] tabular-nums">
                  {Object.entries(pendingBackupMeta.validation.entityCounts)
                    .filter(([, count]) => count > 0)
                    .slice(0, 8)
                    .map(([key, count]) => (
                      <span key={key}>
                        {key}: <strong className="font-semibold text-[var(--text-1)]">{count}</strong>
                      </span>
                    ))}
                </div>
              </div>

              {pendingBackupMeta.validation.warnings.length > 0 && (
                <div
                  data-sq="card"
                  style={{ '--sq-stroke': 'rgba(245,158,11,0.4)' } as React.CSSProperties}
                  className="p-[var(--s3,12px)] bg-amber-50/70 dark:bg-amber-950/30 t-cap text-amber-800 dark:text-amber-300 flex flex-col gap-[var(--s1,4px)]"
                >
                  {pendingBackupMeta.validation.warnings.map((w, idx) => (
                    <div key={idx}>{w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-[var(--s3,12px)] pt-[var(--s2,8px)] border-t border-[var(--atr-divider)]">
            <Button
              type="button"
              tone="soft"
              size={40}
              onClick={() => {
                setIsRestoreModalOpen(false);
                setPendingBackupContent(null);
                setPendingBackupMeta(null);
              }}
            >
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <AtriumButton
              variant="danger"
              onClick={handleConfirmRestore}
              size="md"
            >
              {language === 'ar' ? 'تأكيد واستعادة قاعدة البيانات' : language === 'fr' ? 'Confirmer et restaurer la base' : 'Confirm & Restore Database'}
            </AtriumButton>
          </div>
        </div>
      </Modal>

      </div>
      <AuditLogViewerModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
      />

    </div>
  );
};
