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
} from 'lucide-react';
import {
  useAtriumStore,
  showToast,
  validateBackupSnapshot,
  type BackupValidationResult,
} from '../../services/store';
import { Modal } from '../ui/Modal';
import { AuditLogViewerModal } from '../modals/AuditLogViewerModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { validateVoucherCode } from '../../utils/rules';
import { LabelInput } from '../ui/LabelInput';
import { Button, LiquidButton, Toggle } from '@/atrium';
import { AtriumButton } from '../ui/AtriumButton';
import { t, getSystemDefaultLanguage, SUPPORTED_LANGUAGES } from '../../utils/i18n';
import { useSkeletonLoading } from '../../hooks/useSkeletonLoading';
import { SkeletonPageHeader } from '../ui/skeleton/StructuralSkeletons';
import { SkeletonBox, SkeletonText } from '../ui/skeleton/SkeletonPrimitives';

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
    setTheme,
    density,
    setDensity,
    language,
    isLanguageAuto,
    setLanguage,
    setSystemDefaultLanguage,
    isTopBarAutoHide,
    toggleTopBarAutoHide,
    addBranch,
    registerDevice,
    revokeDevice,
    openOnboarding,
    openDesktopUpgradeModal,
    currentUser,
    members,
    products,
    freelanceClients,
    freelanceInvoices,
    sales,
    supabaseStatus,
    isSyncing,
    syncWithSupabase,
    isSupabaseConfigured,
    lastSyncedAt,
    syncErrorMessage,
    exportDatabase,
    importDatabase,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();

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
      showToast({
        type: 'success',
        title: 'Database Restored',
        message: 'All records, settings, and business states restored successfully.',
      });
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
      <div className="flex flex-col gap-6 animate-in fade-in duration-200">
        <SkeletonPageHeader hasIcon hasActionBtn={false} hasFacility={false} />
        {/* Tab pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} width={110} height={36} rounded="rounded-full" />
          ))}
        </div>
        {/* Settings Card 1 */}
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="p-6 bg-[#F3EDE7] dark:bg-[#141312] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D] flex flex-col gap-4"
        >
          <SkeletonText size="sm" width="200px" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonBox height={48} sq="ctl" />
            <SkeletonBox height={48} sq="ctl" />
          </div>
        </div>
        {/* Settings Card 2 */}
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="p-6 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col gap-4"
        >
          <SkeletonText size="sm" width="180px" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonBox height={54} sq="ctl" />
            <SkeletonBox height={54} sq="ctl" />
            <SkeletonBox height={54} sq="ctl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Row 0: Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="sq-elev-card shrink-0">
            <div
              data-sq="tile-lg"
              data-sq-border="none"
              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
              className="w-12 h-12 flex items-center justify-center"
            >
              <Settings size={24} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[var(--t-page)] leading-[var(--t-page-lh)] rtl:text-[32px] rtl:leading-[38px] font-normal uppercase rtl:normal-case tracking-[0.01em] rtl:tracking-normal text-[var(--text-1)] dark:text-white font-[var(--font-display)] rtl:font-sans">
              {t('settings_title', language)}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="h-10 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[var(--text-1)] dark:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            title="Download complete JSON database backup"
          >
            <FileDown size={16} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
            <span>{t('settings_export_backup', language)}</span>
          </button>

          <button
            type="button"
            data-sq="ctl"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[var(--text-1)] dark:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            title="Restore database from a JSON backup file"
          >
            <FileUp size={16} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
            <span>{t('settings_restore_backup', language)}</span>
          </button>

          <div className="sq-elev-card">
            <button
              type="button"
              data-sq="ctl"
              onClick={() => openDesktopUpgradeModal('general')}
              className="h-10 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Laptop size={16} className="text-[var(--brand-on-dark)]" />
              <span>{t('topbar_desktop_app', language)}</span>
            </button>
          </div>

          <button
            type="button"
            data-sq="ctl"
            onClick={openOnboarding}
            className="h-10 px-4 bg-[#FDF4F0] dark:bg-neutral-800 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] text-xs font-semibold flex items-center gap-2 hover:bg-[#FBECE6] dark:hover:bg-neutral-700/80 transition-colors cursor-pointer"
          >
            <Sparkles size={16} />
            <span>{t('action_relaunch_wizard', language)}</span>
          </button>
        </div>
      </div>

      {exportedStatus && (
        <div
          data-sq="card"
          style={{ '--sq-stroke': 'rgba(16,185,129,0.4)' } as React.CSSProperties}
          className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in"
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{exportedStatus}</span>
        </div>
      )}

      <div className="flex flex-col gap-[var(--pod-gap)]">
      {/* Row 1: Language & Regional Localization */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad)] flex flex-col gap-[var(--card-gap)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 px-3 pb-3">
            <div className="flex items-center gap-3">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-10 h-10 flex items-center justify-center shrink-0"
              >
                <Globe size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[var(--t-h3)] leading-[var(--t-h3-lh)] font-semibold text-[var(--text-1)] dark:text-white">
                    {t('settings_lang_title', language)}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isLanguageAuto
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-[#FCEEE8] text-[var(--brand-text)] dark:bg-[#d4522f]/20 dark:text-[var(--brand-on-dark)]'
                    }`}
                  >
                    {isLanguageAuto ? `${t('topbar_auto_detected', language)} (${language.toUpperCase()})` : `Manual (${language.toUpperCase()})`}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {t('settings_lang_desc', language)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
              <span>{t('settings_system_detected_badge', language)} :</span>
              <span className="font-semibold text-[var(--text-1)] dark:text-white bg-white dark:bg-neutral-800 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-700">
                {getSystemDefaultLanguage() === 'ar' ? 'العربية (ar)' : getSystemDefaultLanguage() === 'fr' ? 'Français (fr)' : 'English (en)'}
              </span>
            </div>
          </div>

          {/* Language Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Option 0: System Default */}
            <div className={isLanguageAuto ? 'sq-elev-card' : ''}>
              <button
                type="button"
                data-sq="card"
                data-sq-stroke-w={isLanguageAuto ? 2 : 1}
                style={{ '--sq-stroke': isLanguageAuto ? '#d4522f' : 'var(--color-border)' } as React.CSSProperties}
                onClick={() => {
                  setSystemDefaultLanguage();
                  showToast({
                    type: 'info',
                    title: t('topbar_auto_detected', language),
                    message: t('settings_lang_changed_toast', language),
                  });
                }}
                className={`w-full h-full p-4 text-left transition-all cursor-pointer relative ${
                  isLanguageAuto
                    ? 'bg-white dark:bg-neutral-800'
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">🌐</span>
                  {isLanguageAuto && (
                    <span className="w-5 h-5 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-black dark:text-white">
                  {t('settings_system_default', language)}
                </div>
                <p className="text-[11px] text-black/60 dark:text-white/60 mt-1">
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
                style={{ '--sq-stroke': !isLanguageAuto && language === 'en' ? '#d4522f' : 'var(--color-border)' } as React.CSSProperties}
                onClick={() => {
                  setLanguage('en', false);
                  showToast({
                    type: 'success',
                    title: 'Language Updated',
                    message: 'Interface display language set to English.',
                  });
                }}
                className={`w-full h-full p-4 text-left transition-all cursor-pointer relative ${
                  !isLanguageAuto && language === 'en'
                    ? 'bg-white dark:bg-neutral-800'
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">🇺🇸</span>
                  {!isLanguageAuto && language === 'en' && (
                    <span className="w-5 h-5 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-black dark:text-white">
                  English (US / UK)
                </div>
                <p className="text-[11px] text-black/60 dark:text-white/60 mt-1">
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
                style={{ '--sq-stroke': !isLanguageAuto && language === 'fr' ? '#d4522f' : 'var(--color-border)' } as React.CSSProperties}
                onClick={() => {
                  setLanguage('fr', false);
                  showToast({
                    type: 'success',
                    title: 'Langue modifiée',
                    message: 'La langue d\'affichage est maintenant le Français.',
                  });
                }}
                className={`w-full h-full p-4 text-left transition-all cursor-pointer relative ${
                  !isLanguageAuto && language === 'fr'
                    ? 'bg-white dark:bg-neutral-800'
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">🇫🇷</span>
                  {!isLanguageAuto && language === 'fr' && (
                    <span className="w-5 h-5 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-black dark:text-white">
                  Français (France / Algérie)
                </div>
                <p className="text-[11px] text-black/60 dark:text-white/60 mt-1">
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
                style={{ '--sq-stroke': !isLanguageAuto && language === 'ar' ? '#d4522f' : 'var(--color-border)' } as React.CSSProperties}
                onClick={() => {
                  setLanguage('ar', false);
                  showToast({
                    type: 'success',
                    title: 'تم تحديث اللغة',
                    message: 'تم تفعيل اللغة العربية والواجهة من اليمين إلى اليسار.',
                  });
                }}
                className={`w-full h-full p-4 text-left rtl:text-right transition-all cursor-pointer relative ${
                  !isLanguageAuto && language === 'ar'
                    ? 'bg-white dark:bg-neutral-800'
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">🇩🇿</span>
                  {!isLanguageAuto && language === 'ar' && (
                    <span className="w-5 h-5 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-black dark:text-white">
                  العربية (الجزائر / MENA)
                </div>
                <p className="text-[11px] text-black/60 dark:text-white/60 mt-1">
                  دعم أصيل من اليمين إلى اليسار (RTL)
                </p>
              </button>
            </div>
          </div>

          {/* RTL Information callout */}
          <div data-sq="card" className="p-3.5 bg-white dark:bg-neutral-800/60 flex items-center gap-3 text-xs text-black/75 dark:text-white/75">
            <Sparkles size={16} className="text-[#d4522f] shrink-0" />
            <span>{t('settings_rtl_notice', language)}</span>
          </div>
        </div>
      </div>

          {/* Option 0..3 inside Language grid */}
          {/* Row 1.1: Appearance & Theme Mode */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad)] flex flex-col gap-[var(--card-gap)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 px-3 pb-3">
            <div className="flex items-center gap-3">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-10 h-10 flex items-center justify-center shrink-0"
              >
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[var(--t-h3)] leading-[var(--t-h3-lh)] font-semibold text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'المظهر والسمة' : language === 'fr' ? 'Apparence' : 'Theme'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                    {theme === 'dark'
                      ? (language === 'ar' ? 'داكن' : language === 'fr' ? 'Sombre' : 'Dark')
                      : (language === 'ar' ? 'فاتح' : language === 'fr' ? 'Clair' : 'Light')}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
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
            <div data-sq="card" className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 card-opt">
              <div className="flex items-center gap-3">
                <div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center">
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'الوضع الليلي' : language === 'fr' ? 'Mode sombre' : 'Dark Mode'}
                  </div>
                  <div className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option: Light Mode */}
            <div className={theme === 'light' ? 'sq-elev-card' : ''}>
              <button
                type="button"
                data-sq="card"
                data-sq-stroke-w={theme === 'light' ? 2 : 1}
                style={{ '--sq-stroke': theme === 'light' ? '#C9461F' : 'var(--color-border)' } as React.CSSProperties}
                onClick={() => {
                  setTheme('light');
                  showToast({
                    type: 'info',
                    title: language === 'ar' ? 'الوضع الفاتح' : language === 'fr' ? 'Mode clair' : 'Light Mode',
                    message: language === 'ar' ? 'تم تفعيل الوضع الفاتح' : language === 'fr' ? 'Mode clair activé.' : 'Light theme enabled.',
                  });
                }}
                className={`w-full h-full p-5 text-left rtl:text-right transition-all cursor-pointer relative flex flex-col gap-2 card-opt ${
                  theme === 'light'
                    ? 'bg-white dark:bg-neutral-800'
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                    <Sun size={20} />
                  </div>
                  {theme === 'light' && (
                    <span className="w-5 h-5 rounded-full bg-[var(--brand-fill)] text-white flex items-center justify-center text-xs shadow-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="font-semibold text-sm text-[var(--text-1)] dark:text-white">
                  {language === 'ar' ? 'فاتح' : language === 'fr' ? 'Mode clair' : 'Light Theme'}
                </div>
                <p className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
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
                style={{ '--sq-stroke': theme === 'dark' ? '#C9461F' : 'var(--color-border)' } as React.CSSProperties}
                onClick={() => {
                  setTheme('dark');
                  showToast({
                    type: 'info',
                    title: language === 'ar' ? 'الوضع الداكن' : language === 'fr' ? 'Mode sombre' : 'Dark Mode',
                    message: language === 'ar' ? 'تم تفعيل الوضع الداكن' : language === 'fr' ? 'Mode sombre activé.' : 'Dark theme enabled.',
                  });
                }}
                className={`w-full h-full p-5 text-left rtl:text-right transition-all cursor-pointer relative flex flex-col gap-2 card-opt ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-neutral-800'
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-neutral-900 text-amber-300 flex items-center justify-center">
                    <Moon size={20} />
                  </div>
                  {theme === 'dark' && (
                    <span className="w-5 h-5 rounded-full bg-[var(--brand-fill)] text-white flex items-center justify-center text-xs shadow-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="font-semibold text-sm text-[var(--text-1)] dark:text-white">
                  {language === 'ar' ? 'داكن' : language === 'fr' ? 'Mode sombre' : 'Dark Theme'}
                </div>
                <p className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {language === 'ar' ? 'ألوان داكنة مريحة للعينين ليلاً' : language === 'fr' ? 'Teintes sombres pour un confort maximal' : 'Dark surfaces for low-light comfort'}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1.2: Layout, Compact Mode & Top Bar Settings */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad)] flex flex-col gap-[var(--card-gap)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 px-3 pb-3">
            <div className="flex items-center gap-3">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-10 h-10 flex items-center justify-center shrink-0"
              >
                <Layout size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[var(--t-h3)] leading-[var(--t-h3-lh)] font-semibold text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'تخطيط الواجهة والكثافة' : language === 'fr' ? 'Interface et densité' : 'Navigation Bar & Density'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                    {density === 'compact'
                      ? (language === 'ar' ? 'مكثف' : language === 'fr' ? 'Compact' : 'Compact')
                      : (language === 'ar' ? 'قياسي' : language === 'fr' ? 'Standard' : 'Standard')}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
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
            <div data-sq="card" className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 card-opt">
              <div className="flex items-center gap-3">
                <div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center">
                  <Layout size={16} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'الوضع المكثف (1280px)' : language === 'fr' ? 'Mode compact' : 'Compact Mode'}
                  </div>
                  <div className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                    {density === 'compact'
                      ? (language === 'ar' ? 'صفوف 52px، بطاقات 16px، حاوية 20px' : language === 'fr' ? 'Lignes 52 px, cartes 16 px, conteneur 20 px' : 'Rows 52px, cards 16px, container 20px')
                      : (language === 'ar' ? 'كثافة قياسية (صفوف 64px، بطاقات 20px)' : language === 'fr' ? 'Densité standard (lignes 64 px, cartes 20 px)' : 'Default spacing (rows 64px, cards 20px)')}
                  </div>
                </div>
              </div>
              <Toggle
                aria-label="Toggle Compact Mode"
                checked={density === 'compact'}
                onCheckedChange={(checked) => {
                  const next = checked ? 'compact' : 'default';
                  setDensity(next);
                  showToast({
                    type: 'info',
                    title: next === 'compact'
                      ? (language === 'ar' ? 'الوضع المكثف' : language === 'fr' ? 'Mode compact activé' : 'Compact Mode On')
                      : (language === 'ar' ? 'الوضع القياسي' : language === 'fr' ? 'Densité standard' : 'Standard Density'),
                    message: next === 'compact'
                      ? (language === 'ar' ? 'تم تقليل الحواشي وارتفاع الصفوف للشاشات الصغيرة.' : language === 'fr' ? 'Espacements optimisés pour écrans compacts.' : 'Tightened cards, rows, and pods for high-density viewports.')
                      : (language === 'ar' ? 'تم استعادة المسافات القياسية.' : language === 'fr' ? 'Espacements standard rétablis.' : 'Default 4pt/8pt layout spacing restored.'),
                  });
                }}
              />
            </div>
          </div>

          {/* Auto-Hide Switch */}
          <div className="sq-elev-card">
            <div data-sq="card" className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 card-opt">
              <div className="flex items-center gap-3">
                <div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center">
                  <ChevronUp size={16} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-[var(--text-1)] dark:text-white">
                    {language === 'ar' ? 'إخفاء تلقائي' : language === 'fr' ? 'Masquage automatique' : 'Auto-Hide'}
                  </div>
                  <div className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
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
                  showToast({
                    type: 'info',
                    title: isTopBarAutoHide ? (language === 'ar' ? 'الشريط ثابت' : language === 'fr' ? 'Barre fixée' : 'Bar Pinned') : (language === 'ar' ? 'إخفاء تلقائي' : language === 'fr' ? 'Masquage auto activé' : 'Auto-Hide On'),
                    message: isTopBarAutoHide
                      ? (language === 'ar' ? 'الشريط العلوي يبقى ظاهراً.' : language === 'fr' ? 'La barre reste visible.' : 'Top bar stays visible.')
                      : (language === 'ar' ? 'سيختفي الشريط عند التمرير.' : language === 'fr' ? 'La barre s\'efface au défilement.' : 'Top bar hides on scroll.'),
                  });
                }}
              />
            </div>
          </div>

          {/* Feature summary pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div data-sq="card" className="p-4 bg-white/70 dark:bg-neutral-800/70 flex flex-col gap-1 card-opt">
              <div className="font-semibold text-[var(--text-1)] dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--brand-fill)]" />
                <span>{language === 'ar' ? 'شريط جانبي' : language === 'fr' ? 'Menu latéral' : 'Sidebar Rail'}</span>
              </div>
              <p className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {language === 'ar' ? 'توسيع سلس دون إزاحة المحتوى' : language === 'fr' ? 'Ouverture fluide sans décalage' : 'Smooth overlay without pushing layout.'}
              </p>
            </div>

            <div data-sq="card" className="p-4 bg-white/70 dark:bg-neutral-800/70 flex flex-col gap-1 card-opt">
              <div className="font-semibold text-[var(--text-1)] dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>{language === 'ar' ? 'أداء فوري' : language === 'fr' ? 'Zéro latence' : 'Fast Render'}</span>
              </div>
              <p className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {language === 'ar' ? 'استجابة سريعة بدون ثقل' : language === 'fr' ? 'Animations fluides accélérées' : 'Hardware-accelerated smooth motion.'}
              </p>
            </div>

            <div data-sq="card" className="p-4 bg-white/70 dark:bg-neutral-800/70 flex flex-col gap-1 card-opt">
              <div className="font-semibold text-[var(--text-1)] dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>{language === 'ar' ? 'خط واضح' : language === 'fr' ? 'Typographie' : 'Typography'}</span>
              </div>
              <p className="text-xs text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {language === 'ar' ? 'عناوين عالية الوضوح' : language === 'fr' ? 'Titres haute lisibilité' : 'High-contrast display headers.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: License Status Banner */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#141312] p-3 space-y-4 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 pt-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-black/55 dark:text-white/55">
                  {t('settings_license_entitlement', language)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    subscription.isLifetime
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {subscription.isLifetime ? t('settings_lifetime_badge', language) : t('settings_trial_badge', language)}
                </span>
              </div>
              <h2 className="text-[var(--t-h2)] leading-[var(--lh-h2)] font-semibold text-[var(--text-1)] tabular-nums">
                {subscription.plan.name}
              </h2>
              <p className="text-xs text-[var(--text-2)]">
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

            <div className="flex items-center gap-2 shrink-0">
              <div className="sq-elev-card">
                <button
                  type="button"
                  data-sq="ctl"
                  onClick={() => openDesktopUpgradeModal('general')}
                  className="h-10 px-4 text-xs font-semibold text-[var(--text-1)] bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Download size={16} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                  <span>{t('settings_get_desktop', language)}</span>
                </button>
              </div>

              <AtriumButton
                onClick={onOpenVoucherModal}
                icon={<KeyRound size={16} />}
                size="md"
              >
                {t('settings_redeem_voucher', language)}
              </AtriumButton>
            </div>
          </div>

          {/* Free Web Edition Banner Notice */}
          <div data-sq="card" className="p-4 card-opt bg-gradient-to-r from-[#FDF4F0] via-[#FAF0EA] to-white dark:from-[#26211E] dark:to-[#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <Laptop size={20} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[var(--text-1)]">
                  {t('settings_current_plan', language)}: {t('settings_web_limit', language)}
                </span>
                <p className="text-[var(--text-2)] text-xs">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="sq-elev-card">
              <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-neutral-800 h-full flex flex-col justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-2)] block">
                  {language === 'ar' ? 'المنشآت' : language === 'fr' ? 'Établissements' : 'Businesses'}
                </span>
                <span className="text-[var(--t-unit)] leading-[var(--lh-unit)] font-semibold text-[var(--text-1)] tabular-nums block">
                  {businesses.length} / {subscription.plan.maxBusinesses}
                </span>
              </div>
            </div>
            <div className="sq-elev-card">
              <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-neutral-800 h-full flex flex-col justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-2)] block">
                  {language === 'ar' ? 'الفروع' : language === 'fr' ? 'Succursales' : 'Branches'}
                </span>
                <span className="text-[var(--t-unit)] leading-[var(--lh-unit)] font-semibold text-[var(--text-1)] tabular-nums block">
                  {branches.length} / {subscription.plan.maxBranches}
                </span>
              </div>
            </div>
            <div className="sq-elev-card">
              <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-neutral-800 h-full flex flex-col justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-2)] block">
                  {language === 'ar' ? 'نقاط البيع' : language === 'fr' ? 'Caisses' : 'Terminals'}
                </span>
                <span className="text-[var(--t-unit)] leading-[var(--lh-unit)] font-semibold text-[var(--text-1)] tabular-nums block">
                  {devices.length} / {subscription.plan.maxDevices}
                </span>
              </div>
            </div>
            <div className="sq-elev-card">
              <div data-sq="card" className="p-[var(--card-pad,20px)] card-opt bg-white dark:bg-neutral-800 h-full flex flex-col justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-2)] block">
                  {language === 'ar' ? 'التقارير' : language === 'fr' ? 'Rapports' : 'Reports'}
                </span>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 block">
                  {subscription.plan.crossBranchReports
                    ? (language === 'ar' ? 'مفعل' : language === 'fr' ? 'Activé' : 'Enabled')
                    : (language === 'ar' ? 'برو فقط' : language === 'fr' ? 'Offre Pro' : 'Pro Only')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1.5: Cloud Sync */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad,12px)] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 px-3 pb-1">
            <div className="flex items-center gap-3">
              <div
                data-sq="tile"
                data-sq-border="none"
                className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : supabaseStatus === 'connecting'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    : supabaseStatus === 'offline'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-[var(--text-1)]'
                }`}
              >
                <Database size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[var(--t-h3)] leading-[var(--pod-head-h,22px)] font-semibold text-[var(--text-1)]">
                    {t('settings_supabase_title', language)}
                  </h3>
                  <span
                    className={`h-[var(--badge-h,22px)] px-2 inline-flex items-center rounded-full text-xs font-medium ${
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
                <p className="text-xs text-[var(--text-2)]">
                  {t('settings_supabase_subtitle', language)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="sq-elev-card">
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => setIsAuditLogOpen(true)}
                  className="h-9 px-3 text-xs font-semibold bg-white dark:bg-neutral-800 text-[var(--text-1)] hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <History size={16} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
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
                  className="h-9 px-4 text-xs font-semibold bg-white dark:bg-neutral-800 text-[var(--text-1)] hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  <RotateCw size={16} className={isSyncing ? 'animate-spin text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]' : ''} />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-2)] block">
                {language === 'ar' ? 'قاعدة البيانات' : language === 'fr' ? 'Structure' : 'Database'}
              </span>
              <span className="text-sm font-semibold text-[var(--text-1)] block">
                {language === 'ar' ? 'مفعل وآمن' : language === 'fr' ? 'Actif & Sécurisé' : 'Active & Isolated'}
              </span>
              <span className="text-xs text-[var(--text-3)] block">
                {language === 'ar' ? 'عزل بيانات تام' : language === 'fr' ? 'Isolation complète' : 'Tenant isolation'}
              </span>
            </div>

            <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-2)] block">
                {language === 'ar' ? 'التحديث المباشر' : language === 'fr' ? 'Temps Réel' : 'Live Updates'}
              </span>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 block">
                {language === 'ar' ? 'متصل' : language === 'fr' ? 'Actif' : 'Active'}
              </span>
              <span className="text-xs text-[var(--text-3)] block">
                {language === 'ar' ? 'مزامنة فورية' : language === 'fr' ? 'Entrées & ventes' : 'Check-ins & sales'}
              </span>
            </div>

            <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-2)] block">
                {language === 'ar' ? 'آخر مزامنة' : language === 'fr' ? 'Dernière Sync' : 'Last Sync'}
              </span>
              <span className="text-sm font-semibold text-[var(--text-1)] block tabular-nums">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : (language === 'ar' ? 'جاهز' : language === 'fr' ? 'Prêt' : 'Ready')}
              </span>
              <span className="text-xs text-[var(--text-3)] block">
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
              className="p-3 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2"
            >
              <AlertTriangle size={16} className="shrink-0" />
              <span>{syncErrorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1.8: Backup & Restore */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad,12px)] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 px-3 pb-1">
            <div className="flex items-center gap-3">
              <div data-sq="tile" className="w-10 h-10 bg-[#FDF4F0] dark:bg-[#2A2420] text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center shrink-0">
                <HardDrive size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[var(--t-h3)] leading-[var(--pod-head-h,22px)] font-semibold text-[var(--text-1)]">
                    {language === 'ar' ? 'النسخ الاحتياطي' : language === 'fr' ? 'Sauvegarde' : 'Data Backup'}
                  </h3>
                  <span className="h-[var(--badge-h,22px)] px-2 inline-flex items-center rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    {language === 'ar' ? 'جاهز' : language === 'fr' ? 'Prêt' : 'Ready'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-2)]">
                  {language === 'ar'
                    ? 'قم بتنزيل نسخة احتياطية كاملة ومحمولة بصيغة JSON لمساحة عملك، أو استعد بياناتك السابقة على أي جهاز.'
                    : language === 'fr'
                    ? 'Téléchargez une sauvegarde JSON 100% portable de votre espace ou restaurez vos données sur tout appareil.'
                    : 'Download a 100% portable JSON snapshot of your entire workspace or restore past records onto any device.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-2)] block">
                {language === 'ar' ? 'المنشآت' : language === 'fr' ? 'Entités' : 'Tenants'}
              </span>
              <span className="text-base font-semibold text-[var(--text-1)] block tabular-nums">
                {businesses.length} {language === 'ar' ? 'منشأة' : language === 'fr' ? 'Entreprise(s)' : `Business${businesses.length !== 1 ? 'es' : ''}`}
              </span>
              <span className="text-xs text-[var(--text-3)] block tabular-nums">
                {branches.length} {language === 'ar' ? 'فروع' : language === 'fr' ? 'Succursales' : 'Branches'}
              </span>
            </div>

            <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-2)] block">
                {language === 'ar' ? 'عملاء CRM' : language === 'fr' ? 'Clients CRM' : 'CRM Clients'}
              </span>
              <span className="text-base font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] block tabular-nums">
                {members.length + (freelanceClients?.length || 0)} {language === 'ar' ? 'جهة اتصال' : language === 'fr' ? 'Contacts' : 'Contacts'}
              </span>
              <span className="text-xs text-[var(--text-3)] block">
                {language === 'ar' ? 'ملفات الحسابات النشطة' : language === 'fr' ? 'Profils comptables actifs' : 'Active ledger profiles'}
              </span>
            </div>

            <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-2)] block">
                {language === 'ar' ? 'المخزون والمنتجات' : language === 'fr' ? 'Inventaire' : 'Inventory'}
              </span>
              <span className="text-base font-semibold text-[var(--text-1)] block tabular-nums">
                {products.length} {language === 'ar' ? 'عنصر' : language === 'fr' ? 'Articles' : 'Items'}
              </span>
              <span className="text-xs text-[var(--text-3)] block">
                {language === 'ar' ? 'البضائع والباقات' : language === 'fr' ? 'Articles & forfaits' : 'SKUs & packages'}
              </span>
            </div>

            <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-2)] block">
                {language === 'ar' ? 'المعاملات' : language === 'fr' ? 'Transactions' : 'Transactions'}
              </span>
              <span className="text-base font-semibold text-[var(--text-1)] block tabular-nums">
                {sales.length + (freelanceInvoices?.length || 0)} {language === 'ar' ? 'سجل' : language === 'fr' ? 'Enregistrements' : 'Records'}
              </span>
              <span className="text-xs text-[var(--text-3)] block">
                {language === 'ar' ? 'الطلبات والفواتير' : language === 'fr' ? 'Commandes & factures' : 'Orders & invoices'}
              </span>
            </div>

            <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 col-span-2 sm:col-span-1 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-2)] block">
                {language === 'ar' ? 'محرك التخزين' : language === 'fr' ? 'Moteur stockage' : 'Storage Engine'}
              </span>
              <span className="text-base font-semibold text-emerald-700 dark:text-emerald-400 block">
                {language === 'ar' ? 'مشفر محلياً' : language === 'fr' ? 'Chiffré' : 'Encrypted'}
              </span>
              <span className="text-xs text-[var(--text-3)] block">LocalStorage v2</span>
            </div>
          </div>

          {exportedStatus && (
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'rgba(16,185,129,0.4)' } as React.CSSProperties}
              className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{exportedStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Branches Management */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad,12px)] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 pt-1 px-3 pb-1">
            <div className="flex flex-col gap-1">
              <h3 className="text-[var(--t-h3)] leading-[var(--pod-head-h,22px)] font-semibold text-[var(--text-1)]">
                {t('settings_branches_title', language)}
              </h3>
              <p className="text-xs text-[var(--text-2)] tabular-nums">
                {language === 'ar'
                  ? `جميع المواقع الفعلية المسجلة للمنشأة (${branches.length} مسجل · ${subscription.plan.maxBranches} مسموح في باقة ${subscription.plan.name})`
                  : language === 'fr'
                  ? `Tous les établissements physiques de l'entreprise (${branches.length} enregistrés · ${subscription.plan.maxBranches} autorisés avec ${subscription.plan.name})`
                  : `All physical locations under tenant business (${branches.length} registered · ${subscription.plan.maxBranches} permitted on ${subscription.plan.name})`}
              </p>
            </div>
            <AtriumButton
              onClick={handleOpenAddBranch}
              icon={<Plus size={16} />}
              size="sm"
            >
              {t('settings_add_branch', language)}
            </AtriumButton>
          </div>

          {/* Multi-Branch Desktop Alert when at capacity */}
          {branches.length >= subscription.plan.maxBranches && (
            <div data-sq="card" className="p-4 card-opt bg-[#FDF4F0] dark:bg-[#2A2420]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-[var(--text-1)]">
                    {language === 'ar' ? 'إدارة الفروع المتعددة ميزة حصرية في Atrium Desktop' : language === 'fr' ? 'La gestion multi-sites est une exclusivité Atrium Desktop' : 'Multi-Facility Management is an Atrium Desktop Feature'}
                  </span>
                  <p className="text-[var(--text-2)] text-xs">
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

          <div className="flex flex-col gap-2">
            {branches.map((b) => (
              <div key={b.id} className="sq-elev-card">
                <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex items-center justify-between gap-4 transition-all">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-1)]">
                        {b.name}
                      </span>
                      <span className="tabular-nums text-xs bg-neutral-100 dark:bg-neutral-800 px-2 h-[var(--badge-h,22px)] inline-flex items-center rounded-full text-[var(--text-2)] font-medium">
                        {b.code}
                      </span>
                      {b.isMainBranch && (
                        <span className="text-xs font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] bg-[#d4522f]/10 px-2 h-[var(--badge-h,22px)] inline-flex items-center rounded-full">
                          {language === 'ar' ? 'المقر الرئيسي' : language === 'fr' ? 'Siège principal' : 'Headquarters'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-2)]">
                      {b.address || (language === 'ar' ? 'العنوان غير محدد' : language === 'fr' ? 'Adresse non renseignée' : 'Address not configured')} · {b.phone || (language === 'ar' ? 'بدون هاتف' : language === 'fr' ? 'Sans téléphone' : 'No phone')}
                    </div>
                  </div>

                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 h-7 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad,12px)] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 pt-1 px-3 pb-1">
            <div className="flex flex-col gap-1">
              <h3 className="text-[var(--t-h3)] leading-[var(--pod-head-h,22px)] font-semibold text-[var(--text-1)]">
                {t('settings_terminals_title', language)}
              </h3>
              <p className="text-xs text-[var(--text-2)]">
                {t('settings_terminals_subtitle', language)}
              </p>
            </div>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={() => setIsAddDeviceOpen(true)}
              className="h-9 px-4 text-xs font-semibold text-white bg-[var(--brand-fill)] hover:bg-[var(--brand-accent)] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus size={16} />
              <span>{t('settings_register_terminal', language)}</span>
            </button>
          </div>

          {/* Hardware integration notice banner */}
          <div data-sq="card" className="p-4 card-opt bg-neutral-50 dark:bg-neutral-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <Printer size={20} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[var(--text-1)]">
                  {language === 'ar'
                    ? 'ربط العتاد والمزامنة المحلية عبر تطبيق سطح المكتب'
                    : language === 'fr'
                    ? 'Le matériel et la synchronisation locale nécessitent Atrium Desktop'
                    : 'Hardware & offline sync require Atrium Desktop'}
                </span>
                <p className="text-[var(--text-2)] text-xs">
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
              className="h-8 px-3 rounded-full border border-neutral-300 dark:border-neutral-600 text-[var(--text-1)] text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              {language === 'ar' ? 'المزيد' : language === 'fr' ? 'En savoir plus' : 'Learn More'}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {devices.map((dev) => (
              <div key={dev.id} className="sq-elev-card">
                <div data-sq="card" className="p-4 card-opt bg-white dark:bg-neutral-800 flex items-center justify-between gap-4 transition-all">
                  <div className="flex items-center gap-3">
                    <div data-sq="tile" className="w-10 h-10 bg-[#F3EDE7] dark:bg-neutral-700/80 flex items-center justify-center text-[var(--text-1)] shrink-0">
                      <Monitor size={18} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-semibold text-[var(--text-1)]">
                        {dev.label}
                      </div>
                      <div className="text-xs text-[var(--text-2)] tabular-nums">
                        ID: {dev.hardwareId} · {new Date(dev.registeredAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 h-7 rounded-full flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {language === 'ar' ? 'نشط' : language === 'fr' ? 'Actif' : 'Active'}
                    </span>
                    {devices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => revokeDevice(dev.id)}
                        className="w-8 h-8 flex items-center justify-center text-xs text-rose-600 hover:text-rose-700 cursor-pointer rounded-full hover:bg-rose-50 transition-colors"
                        title={language === 'ar' ? 'حذف' : language === 'fr' ? 'Révoquer' : 'Revoke'}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Branch Modal */}
      <Modal
        isOpen={isAddBranchOpen}
        onClose={() => setIsAddBranchOpen(false)}
        title={language === 'ar' ? 'إضافة فرع' : language === 'fr' ? 'Ajouter Succursale' : 'Add Branch'}
        subtitle={
          language === 'ar'
            ? currentBusiness.name
            : language === 'fr'
            ? currentBusiness.name
            : currentBusiness.name
        }
      >
        <form onSubmit={handleCreateBranch} className="flex flex-col gap-4">
          {branchError && (
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'rgba(244,63,94,0.4)' } as React.CSSProperties}
              className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 text-xs"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddBranchOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
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
        subtitle={language === 'ar' ? 'تسجيل جهاز جديد' : language === 'fr' ? 'Nouveau poste' : 'Register device'}
      >
        <form onSubmit={handleRegisterDevice} className="flex flex-col gap-4">
          {deviceError && (
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'rgba(244,63,94,0.4)' } as React.CSSProperties}
              className="p-3 bg-rose-50 text-rose-700 text-xs"
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

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddDeviceOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="submit"
              data-sq="ctl"
              data-sq-border="none"
              className="h-10 px-5 text-xs font-semibold text-white bg-[var(--brand-fill)] hover:bg-[var(--brand-accent)] cursor-pointer transition-colors"
            >
              {language === 'ar' ? 'حفظ' : language === 'fr' ? 'Autoriser' : 'Authorize'}
            </button>
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
        subtitle={language === 'ar' ? 'مراجعة محتويات النسخة قبل استبدال بيانات مساحة العمل' : language === 'fr' ? 'Vérifier le contenu avant d\'écraser les données' : 'Review backup contents before overwriting workspace data'}
      >
        <div className="flex flex-col gap-4">
          <div
            data-sq="card"
            style={{ '--sq-stroke': 'rgba(245,158,11,0.4)' } as React.CSSProperties}
            className="p-4 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3"
          >
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">
                {language === 'ar' ? 'تنبيه: استبدال شامل لبيانات النظام' : language === 'fr' ? 'Attention : Remplacement des données' : 'Caution: State Overwrite'}
              </p>
              <p className="opacity-90">
                {language === 'ar'
                  ? 'استعادة هذا الملف سيستبدل المنشآت الحالية، الفروع، الأعضاء، والمعاملات بالبيانات المحفوظة في النسخة الاحتياطية.'
                  : language === 'fr'
                  ? 'La restauration remplacera l\'ensemble des entités, succursales, membres et transactions actuels par les données de la sauvegarde.'
                  : 'Restoring this backup file will replace your current businesses, branches, members, and transactions with the backup snapshot.'}
              </p>
            </div>
          </div>

          {pendingBackupMeta && (
            <div className="flex flex-col gap-3">
              <div data-sq="card" className="p-4 bg-neutral-50 dark:bg-neutral-800 flex flex-col gap-2 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'تاريخ تصدير النسخة:' : language === 'fr' ? 'Date de la sauvegarde :' : 'Backup Export Date:'}
                  </span>
                  <span className="font-semibold text-[var(--text-1)] tabular-nums">
                    {pendingBackupMeta.exportedAt !== 'Unknown Date'
                      ? new Date(pendingBackupMeta.exportedAt).toLocaleString()
                      : pendingBackupMeta.exportedAt}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'المنشأة الرئيسية:' : language === 'fr' ? 'Entreprise principale :' : 'Primary Business:'}
                  </span>
                  <span className="font-semibold text-[var(--text-1)]">
                    {pendingBackupMeta.primaryBusiness}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'نسخة المخطط / البصمة:' : language === 'fr' ? 'Schéma / Empreinte :' : 'Schema / Checksum:'}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-1)] tabular-nums">
                    v{String(pendingBackupMeta.validation.schemaVersion)} · {pendingBackupMeta.validation.checksum}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'إجمالي السجلات:' : language === 'fr' ? 'Total des enregistrements :' : 'Total Records:'}
                  </span>
                  <span className="font-semibold text-[var(--text-1)] tabular-nums">
                    {pendingBackupMeta.validation.totalRecords.toLocaleString()} ({pendingBackupMeta.businessesCount}{' '}
                    {language === 'ar' ? 'منشأة' : language === 'fr' ? 'entités' : 'businesses'})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--text-2)]">
                    {language === 'ar' ? 'الأعضاء / جهات الاتصال:' : language === 'fr' ? 'Membres / Contacts :' : 'Members / Contacts:'}
                  </span>
                  <span className="font-semibold text-[var(--text-1)] tabular-nums">
                    {pendingBackupMeta.membersCount} {language === 'ar' ? 'سجل' : language === 'fr' ? 'enregistrements' : 'records'}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-2)] tabular-nums">
                  {Object.entries(pendingBackupMeta.validation.entityCounts)
                    .filter(([, count]) => count > 0)
                    .slice(0, 8)
                    .map(([key, count]) => (
                      <span key={key}>
                        {key}: <strong className="text-[var(--text-1)]">{count}</strong>
                      </span>
                    ))}
                </div>
              </div>

              {pendingBackupMeta.validation.warnings.length > 0 && (
                <div
                  data-sq="card"
                  style={{ '--sq-stroke': 'rgba(245,158,11,0.4)' } as React.CSSProperties}
                  className="p-3 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-1"
                >
                  {pendingBackupMeta.validation.warnings.map((w, idx) => (
                    <div key={idx}>{w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRestoreModalOpen(false);
                setPendingBackupContent(null);
                setPendingBackupMeta(null);
              }}
              className="h-10 px-4 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
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
