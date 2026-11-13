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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { Modal } from '../ui/Modal';
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
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [pendingBackupContent, setPendingBackupContent] = useState<string | null>(null);
  const [pendingBackupMeta, setPendingBackupMeta] = useState<{
    exportedAt: string;
    businessesCount: number;
    primaryBusiness: string;
    membersCount: number;
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
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.businesses) || !parsed.account) {
          showToast({
            type: 'error',
            title: 'Invalid Backup File',
            message: 'Expected a valid Atrium JSON database export containing businesses and account schemas.',
          });
          return;
        }
        setPendingBackupContent(text);
        setPendingBackupMeta({
          exportedAt: parsed.exportedAt || 'Unknown Date',
          businessesCount: parsed.businesses?.length || 0,
          primaryBusiness: parsed.businesses?.[0]?.name || 'Unknown Business',
          membersCount: parsed.members?.length || 0,
        });
        setIsRestoreModalOpen(true);
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Corrupted Backup File',
          message: 'Could not parse JSON. Please ensure the file was not modified or corrupted.',
        });
      }
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
      <div className="space-y-6 animate-in fade-in duration-200">
        <SkeletonPageHeader hasIcon hasActionBtn={false} hasFacility={false} />
        {/* Tab pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} width={110} height={36} rounded="rounded-full" />
          ))}
        </div>
        {/* Settings Card 1 */}
        <div className="p-6 rounded-[24px] bg-[#F3EDE7] dark:bg-neutral-800/40 border border-[#E6DED6] dark:border-neutral-800/60 space-y-4">
          <SkeletonText size="sm" width="200px" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonBox height={48} rounded="rounded-xl" />
            <SkeletonBox height={48} rounded="rounded-xl" />
          </div>
        </div>
        {/* Settings Card 2 */}
        <div className="p-6 rounded-[24px] bg-white dark:bg-[#18181B] border border-[#E6DED6] dark:border-neutral-800 space-y-4">
          <SkeletonText size="sm" width="180px" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonBox height={54} rounded="rounded-xl" />
            <SkeletonBox height={54} rounded="rounded-xl" />
            <SkeletonBox height={54} rounded="rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Row 0: Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5">
          <div
            style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
          >
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase rtl:normal-case leading-none rtl:leading-tight tracking-[0.01em] rtl:tracking-normal text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {t('settings_title', language)}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleExportDataBackup}
            className="h-10 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black/85 dark:text-white/90 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
            title="Download complete JSON database backup"
          >
            <FileDown size={14} className="text-[#d4522f]" />
            <span>{t('settings_export_backup', language)}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black/85 dark:text-white/90 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
            title="Restore database from a JSON backup file"
          >
            <FileUp size={14} className="text-[#d4522f]" />
            <span>{t('settings_restore_backup', language)}</span>
          </button>

          <button
            type="button"
            onClick={() => openDesktopUpgradeModal('general')}
            className="h-10 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer dark:border dark:border-neutral-700 shadow-xs"
          >
            <Laptop size={14} className="text-[#d4522f]" />
            <span>{t('topbar_desktop_app', language)}</span>
          </button>

          <button
            type="button"
            onClick={openOnboarding}
            className="h-10 px-4 rounded-xl bg-[#FDF4F0] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 text-[#d4522f] text-xs font-bold flex items-center gap-2 hover:bg-[#FBECE6] dark:hover:bg-neutral-700/80 transition-colors cursor-pointer"
          >
            <Sparkles size={14} />
            <span>{t('action_relaunch_wizard', language)}</span>
          </button>
        </div>
      </div>

      {exportedStatus && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
          <span>{exportedStatus}</span>
        </div>
      )}

      {/* Row 1: Language & Regional Localization */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            >
              <Globe size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white">
                  {t('settings_lang_title', language)}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal ${
                    isLanguageAuto
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-[#FCEEE8] text-[#d4522f] dark:bg-[#d4522f]/20 dark:text-[#d4522f]'
                  }`}
                >
                  {isLanguageAuto ? `${t('topbar_auto_detected', language)} (${language.toUpperCase()})` : `Manual (${language.toUpperCase()})`}
                </span>
              </div>
              <p className="text-xs text-black/65 dark:text-white/65 mt-0.5">
                {t('settings_lang_desc', language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-black/65 dark:text-white/65">
            <span>{t('settings_system_detected_badge', language)}:</span>
            <span className="font-bold text-black dark:text-white uppercase rtl:normal-case bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
              {getSystemDefaultLanguage() === 'ar' ? 'العربية (ar)' : getSystemDefaultLanguage() === 'fr' ? 'Français (fr)' : 'English (en)'}
            </span>
          </div>
        </div>

        {/* Language Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Option 0: System Default */}
          <button
            type="button"
            onClick={() => {
              setSystemDefaultLanguage();
              showToast({
                type: 'info',
                title: t('topbar_auto_detected', language),
                message: t('settings_lang_changed_toast', language),
              });
            }}
            className={`p-4 rounded-[20px] text-left transition-all border cursor-pointer relative ${
              isLanguageAuto
                ? 'bg-white dark:bg-neutral-800 border-[#d4522f] ring-2 ring-[#d4522f]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
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

          {/* Option 1: English */}
          <button
            type="button"
            onClick={() => {
              setLanguage('en', false);
              showToast({
                type: 'success',
                title: 'Language Updated',
                message: 'Interface display language set to English.',
              });
            }}
            className={`p-4 rounded-[20px] text-left transition-all border cursor-pointer relative ${
              !isLanguageAuto && language === 'en'
                ? 'bg-white dark:bg-neutral-800 border-[#d4522f] ring-2 ring-[#d4522f]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
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

          {/* Option 2: Français */}
          <button
            type="button"
            onClick={() => {
              setLanguage('fr', false);
              showToast({
                type: 'success',
                title: 'Langue modifiée',
                message: 'La langue d\'affichage est maintenant le Français.',
              });
            }}
            className={`p-4 rounded-[20px] text-left transition-all border cursor-pointer relative ${
              !isLanguageAuto && language === 'fr'
                ? 'bg-white dark:bg-neutral-800 border-[#d4522f] ring-2 ring-[#d4522f]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
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

          {/* Option 3: العربية */}
          <button
            type="button"
            onClick={() => {
              setLanguage('ar', false);
              showToast({
                type: 'success',
                title: 'تم تحديث اللغة',
                message: 'تم تفعيل اللغة العربية والواجهة من اليمين إلى اليسار.',
              });
            }}
            className={`p-4 rounded-[20px] text-left rtl:text-right transition-all border cursor-pointer relative ${
              !isLanguageAuto && language === 'ar'
                ? 'bg-white dark:bg-neutral-800 border-[#d4522f] ring-2 ring-[#d4522f]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
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

        {/* RTL Information callout */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center gap-3 text-xs text-black/75 dark:text-white/75">
          <Sparkles size={16} className="text-[#d4522f] shrink-0" />
          <span>{t('settings_rtl_notice', language)}</span>
        </div>
      </div>

      {/* Row 1.1: Appearance & Theme Mode */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white">
                  {language === 'ar' ? 'المظهر والسمة' : language === 'fr' ? 'Apparence' : 'Theme'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal bg-[#d4522f]/10 text-[#d4522f]">
                  {theme === 'dark'
                    ? (language === 'ar' ? 'داكن' : language === 'fr' ? 'Sombre' : 'Dark')
                    : (language === 'ar' ? 'فاتح' : language === 'fr' ? 'Clair' : 'Light')}
                </span>
              </div>
              <p className="text-xs text-black/65 dark:text-white/65 mt-0.5">
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
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center">
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </div>
            <div>
              <div className="text-xs font-bold text-black dark:text-white">
                {language === 'ar' ? 'الوضع الليلي' : language === 'fr' ? 'Mode Sombre' : 'Dark Mode'}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55">
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

        {/* Theme Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Option: Light Mode */}
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              showToast({
                type: 'info',
                title: language === 'ar' ? 'الوضع الفاتح' : language === 'fr' ? 'Mode Clair' : 'Light Mode',
                message: language === 'ar' ? 'تم تفعيل الوضع الفاتح' : language === 'fr' ? 'Mode clair activé.' : 'Light theme enabled.',
              });
            }}
            className={`p-4 rounded-[20px] text-left rtl:text-right transition-all border cursor-pointer relative ${
              theme === 'light'
                ? 'bg-white dark:bg-neutral-800 border-[#d4522f] ring-2 ring-[#d4522f]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                <Sun size={20} />
              </div>
              {theme === 'light' && (
                <span className="w-5 h-5 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-xs shadow-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-black dark:text-white">
              {language === 'ar' ? 'فاتح' : language === 'fr' ? 'Mode Clair' : 'Light Theme'}
            </div>
            <p className="text-[11px] text-black/60 dark:text-white/60 mt-1">
              {language === 'ar' ? 'واجهة ناصعة للاستخدام النهاري' : language === 'fr' ? 'Interface claire et contrastée' : 'Clean bright canvas for daytime use'}
            </p>
          </button>

          {/* Option: Dark Mode */}
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              showToast({
                type: 'info',
                title: language === 'ar' ? 'الوضع الداكن' : language === 'fr' ? 'Mode Sombre' : 'Dark Mode',
                message: language === 'ar' ? 'تم تفعيل الوضع الداكن' : language === 'fr' ? 'Mode sombre activé.' : 'Dark theme enabled.',
              });
            }}
            className={`p-4 rounded-[20px] text-left rtl:text-right transition-all border cursor-pointer relative ${
              theme === 'dark'
                ? 'bg-white dark:bg-neutral-800 border-[#d4522f] ring-2 ring-[#d4522f]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-amber-300 flex items-center justify-center">
                <Moon size={20} />
              </div>
              {theme === 'dark' && (
                <span className="w-5 h-5 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-xs shadow-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-black dark:text-white">
              {language === 'ar' ? 'داكن' : language === 'fr' ? 'Mode Sombre' : 'Dark Theme'}
            </div>
            <p className="text-[11px] text-black/60 dark:text-white/60 mt-1">
              {language === 'ar' ? 'ألوان داكنة مريحة للعينين ليلاً' : language === 'fr' ? 'Teintes sombres pour un confort maximal' : 'Dark surfaces for low-light comfort'}
            </p>
          </button>
        </div>
      </div>

      {/* Row 1.2: Layout & Top Bar Settings */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            >
              <Layout size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white">
                  {language === 'ar' ? 'سلوك الشريط' : language === 'fr' ? 'Barre Supérieure' : 'Navigation Bar'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal bg-[#d4522f]/10 text-[#d4522f]">
                  {language === 'ar' ? 'تخطيط' : language === 'fr' ? 'Interface' : 'Layout'}
                </span>
              </div>
              <p className="text-xs text-black/65 dark:text-white/65 mt-0.5">
                {language === 'ar'
                  ? 'التحكم في إخفاء الشريط العلوي عند التمرير'
                  : language === 'fr'
                  ? 'Masquage automatique de la barre lors du défilement'
                  : 'Control top bar scroll auto-hide behavior'}
              </p>
            </div>
          </div>
        </div>

        {/* Auto-Hide Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center">
              <ChevronUp size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-black dark:text-white">
                {language === 'ar' ? 'إخفاء تلقائي' : language === 'fr' ? 'Masquage Auto' : 'Auto-Hide'}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55">
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
                title: isTopBarAutoHide ? (language === 'ar' ? 'الشريط ثابت' : language === 'fr' ? 'Barre fixée' : 'Bar Pinned') : (language === 'ar' ? 'إخفاء تلقائي' : language === 'fr' ? 'Auto-Hide Activé' : 'Auto-Hide On'),
                message: isTopBarAutoHide
                  ? (language === 'ar' ? 'الشريط العلوي يبقى ظاهراً.' : language === 'fr' ? 'La barre reste visible.' : 'Top bar stays visible.')
                  : (language === 'ar' ? 'سيختفي الشريط عند التمرير.' : language === 'fr' ? 'La barre s\'efface au défilement.' : 'Top bar hides on scroll.'),
              });
            }}
          />
        </div>

        {/* Feature summary pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/80">
            <div className="font-bold text-black dark:text-white flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#d4522f]" />
              <span>{language === 'ar' ? 'شريط جانبي' : language === 'fr' ? 'Menu Latéral' : 'Sidebar Rail'}</span>
            </div>
            <p className="text-[11px] text-black/60 dark:text-white/60">
              {language === 'ar' ? 'توسيع سلس دون إزاحة المحتوى' : language === 'fr' ? 'Ouverture fluide sans décalage' : 'Smooth overlay without pushing layout.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/80">
            <div className="font-bold text-black dark:text-white flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{language === 'ar' ? 'أداء فوري' : language === 'fr' ? 'Zéro Latence' : 'Fast Render'}</span>
            </div>
            <p className="text-[11px] text-black/60 dark:text-white/60">
              {language === 'ar' ? 'استجابة سريعة بدون ثقل' : language === 'fr' ? 'Animations fluides accélérées' : 'Hardware-accelerated smooth motion.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/80">
            <div className="font-bold text-black dark:text-white flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{language === 'ar' ? 'خط واضح' : language === 'fr' ? 'Typographie' : 'Typography'}</span>
            </div>
            <p className="text-[11px] text-black/60 dark:text-white/60">
              {language === 'ar' ? 'عناوين عالية الوضوح' : language === 'fr' ? 'Titres haute lisibilité' : 'High-contrast display headers.'}
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: License Status Banner */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-black/55 dark:text-white/55">
                {t('settings_license_entitlement', language)}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  subscription.isLifetime
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                {subscription.isLifetime ? t('settings_lifetime_badge', language) : t('settings_trial_badge', language)}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
              {subscription.plan.name}
            </h2>
            <p className="text-xs text-black/65 dark:text-white/65">
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

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => openDesktopUpgradeModal('general')}
              className="h-10 px-4 text-xs font-bold text-black/85 dark:text-white/90 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Download size={14} className="text-[#d4522f]" />
              <span>{t('settings_get_desktop', language)}</span>
            </button>

            <AtriumButton
              onClick={onOpenVoucherModal}
              icon={<KeyRound size={15} />}
              size="md"
            >
              {t('settings_redeem_voucher', language)}
            </AtriumButton>
          </div>
        </div>

        {/* Free Web Edition Banner Notice */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FDF4F0] via-[#FAF0EA] to-white dark:from-[#26211E] dark:to-[#18181B] border border-[#F5E2D8] dark:border-[#3E3832] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Laptop size={18} className="text-[#d4522f] shrink-0" />
            <div>
              <span className="font-extrabold text-black dark:text-white">
                {t('settings_current_plan', language)}: {t('settings_web_limit', language)}
              </span>
              <p className="text-black/65 dark:text-white/65 text-[11px] mt-0.5">
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
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-black/60 dark:text-white/60 block text-[11px]">
              {language === 'ar' ? 'المنشآت' : language === 'fr' ? 'Établissements' : 'Businesses'}
            </span>
            <span className="text-2xl font-black text-black dark:text-white tabular-nums mt-1 block font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {businesses.length} / {subscription.plan.maxBusinesses}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-black/60 dark:text-white/60 block text-[11px]">
              {language === 'ar' ? 'الفروع' : language === 'fr' ? 'Succursales' : 'Branches'}
            </span>
            <span className="text-2xl font-black text-black dark:text-white tabular-nums mt-1 block font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {branches.length} / {subscription.plan.maxBranches}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-black/60 dark:text-white/60 block text-[11px]">
              {language === 'ar' ? 'نقاط البيع' : language === 'fr' ? 'Caisses' : 'Terminals'}
            </span>
            <span className="text-2xl font-black text-black dark:text-white tabular-nums mt-1 block font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {devices.length} / {subscription.plan.maxDevices}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-black/60 dark:text-white/60 block text-[11px]">
              {language === 'ar' ? 'التقارير' : language === 'fr' ? 'Rapports' : 'Reports'}
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2 block">
              {subscription.plan.crossBranchReports
                ? (language === 'ar' ? 'مفعل' : language === 'fr' ? 'Activé' : 'Enabled')
                : (language === 'ar' ? 'برو فقط' : language === 'fr' ? 'Offre Pro' : 'Pro Only')}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1.5: Cloud Sync */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : supabaseStatus === 'connecting'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  : supabaseStatus === 'offline'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-black/75 dark:text-white/80'
              }`}
            >
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white">
                  {t('settings_supabase_title', language)}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal ${
                    supabaseStatus === 'connected'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : supabaseStatus === 'connecting'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : supabaseStatus === 'offline'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-neutral-200 text-black/80 dark:bg-neutral-700 dark:text-white/80'
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
              <p className="text-xs text-black/65 dark:text-white/65 mt-0.5">
                {t('settings_supabase_subtitle', language)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => syncWithSupabase()}
              disabled={isSyncing}
              className="h-9 px-4 text-xs font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-2 cursor-pointer transition-colors shadow-2xs disabled:opacity-60"
            >
              <RotateCw size={13} className={isSyncing ? 'animate-spin text-[#d4522f]' : ''} />
              <span>
                {isSyncing
                  ? (language === 'ar' ? 'جاري المزامنة...' : language === 'fr' ? 'Synchronisation...' : 'Syncing...')
                  : (language === 'ar' ? 'مزامنة الآن' : language === 'fr' ? 'Synchroniser' : 'Sync Now')}
              </span>
            </button>
          </div>
        </div>

        {/* Cloud Diagnostics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-black/55 dark:text-white/55 block">
              {language === 'ar' ? 'قاعدة البيانات' : language === 'fr' ? 'Structure' : 'Database'}
            </span>
            <span className="text-sm font-bold text-black dark:text-white mt-1 block">
              {language === 'ar' ? 'مفعل وآمن' : language === 'fr' ? 'Actif & Sécurisé' : 'Active & Isolated'}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block mt-0.5">
              {language === 'ar' ? 'عزل بيانات تام' : language === 'fr' ? 'Isolation complète' : 'Tenant isolation'}
            </span>
          </div>

          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-black/55 dark:text-white/55 block">
              {language === 'ar' ? 'التحديث المباشر' : language === 'fr' ? 'Temps Réel' : 'Live Updates'}
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {language === 'ar' ? 'متصل' : language === 'fr' ? 'Actif' : 'Active'}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block mt-0.5">
              {language === 'ar' ? 'مزامنة فورية' : language === 'fr' ? 'Entrées & ventes' : 'Check-ins & sales'}
            </span>
          </div>

          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-black/55 dark:text-white/55 block">
              {language === 'ar' ? 'آخر مزامنة' : language === 'fr' ? 'Dernière Sync' : 'Last Sync'}
            </span>
            <span className="text-sm font-bold text-black dark:text-white mt-1 block tabular-nums">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : (language === 'ar' ? 'جاهز' : language === 'fr' ? 'Prêt' : 'Ready')}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block mt-0.5">
              {isSupabaseConfigured
                ? (language === 'ar' ? 'سحابة نشطة' : language === 'fr' ? 'Cloud actif' : 'Cloud active')
                : (language === 'ar' ? 'تخزين محلي' : language === 'fr' ? 'Stockage local' : 'Local storage')}
            </span>
          </div>
        </div>

        {syncErrorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{syncErrorMessage}</span>
          </div>
        )}
      </div>

      {/* Row 1.8: Backup & Restore */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FDF4F0] dark:bg-[#2A2420] text-[#d4522f] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-[#4A3B33]">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white">
                  {language === 'ar' ? 'النسخ الاحتياطي' : language === 'fr' ? 'Sauvegarde' : 'Data Backup'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {language === 'ar' ? 'جاهز' : language === 'fr' ? 'Prêt' : 'Ready'}
                </span>
              </div>
              <p className="text-xs text-black/65 dark:text-white/65 mt-0.5">
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block tracking-wider rtl:normal-case rtl:tracking-normal">
              {language === 'ar' ? 'المنشآت' : language === 'fr' ? 'Entités' : 'Tenants'}
            </span>
            <span className="text-base font-extrabold text-black dark:text-white mt-0.5 block tabular-nums">
              {businesses.length} {language === 'ar' ? 'منشأة' : language === 'fr' ? 'Entreprise(s)' : `Business${businesses.length !== 1 ? 'es' : ''}`}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block mt-0.5 tabular-nums">
              {branches.length} {language === 'ar' ? 'فروع' : language === 'fr' ? 'Succursales' : 'Branches'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block tracking-wider rtl:normal-case rtl:tracking-normal">
              {language === 'ar' ? 'عملاء CRM' : language === 'fr' ? 'Clients CRM' : 'CRM Clients'}
            </span>
            <span className="text-base font-extrabold text-[#d4522f] mt-0.5 block tabular-nums">
              {members.length + (freelanceClients?.length || 0)} {language === 'ar' ? 'جهة اتصال' : language === 'fr' ? 'Contacts' : 'Contacts'}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block mt-0.5">
              {language === 'ar' ? 'ملفات الحسابات النشطة' : language === 'fr' ? 'Profils comptables actifs' : 'Active ledger profiles'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block tracking-wider rtl:normal-case rtl:tracking-normal">
              {language === 'ar' ? 'المخزون والمنتجات' : language === 'fr' ? 'Inventaire' : 'Inventory'}
            </span>
            <span className="text-base font-extrabold text-black dark:text-white mt-0.5 block tabular-nums">
              {products.length} {language === 'ar' ? 'عنصر' : language === 'fr' ? 'Articles' : 'Items'}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block mt-0.5">
              {language === 'ar' ? 'البضائع والباقات' : language === 'fr' ? 'Articles & forfaits' : 'SKUs & packages'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block tracking-wider rtl:normal-case rtl:tracking-normal">
              {language === 'ar' ? 'المعاملات' : language === 'fr' ? 'Transactions' : 'Transactions'}
            </span>
            <span className="text-base font-extrabold text-black dark:text-white mt-0.5 block tabular-nums">
              {sales.length + (freelanceInvoices?.length || 0)} {language === 'ar' ? 'سجل' : language === 'fr' ? 'Enregistrements' : 'Records'}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block mt-0.5">
              {language === 'ar' ? 'الطلبات والفواتير' : language === 'fr' ? 'Commandes & factures' : 'Orders & invoices'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block tracking-wider rtl:normal-case rtl:tracking-normal">
              {language === 'ar' ? 'محرك التخزين' : language === 'fr' ? 'Moteur stockage' : 'Storage Engine'}
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {language === 'ar' ? 'مشفر محلياً' : language === 'fr' ? 'Chiffré' : 'Encrypted'}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block mt-0.5">LocalStorage v2</span>
          </div>
        </div>

        {exportedStatus && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{exportedStatus}</span>
          </div>
        )}
      </div>

      {/* Row 2: Branches Management */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white">
              {t('settings_branches_title', language)}
            </h3>
            <p className="text-xs text-black/60 dark:text-white/60 tabular-nums">
              {language === 'ar'
                ? `جميع المواقع الفعلية المسجلة للمنشأة (${branches.length} مسجل · ${subscription.plan.maxBranches} مسموح في باقة ${subscription.plan.name})`
                : language === 'fr'
                ? `Tous les établissements physiques de l'entreprise (${branches.length} enregistrés · ${subscription.plan.maxBranches} autorisés avec ${subscription.plan.name})`
                : `All physical locations under tenant business (${branches.length} registered · ${subscription.plan.maxBranches} permitted on ${subscription.plan.name})`}
            </p>
          </div>
          <AtriumButton
            onClick={handleOpenAddBranch}
            icon={<Plus size={14} />}
            size="sm"
          >
            {t('settings_add_branch', language)}
          </AtriumButton>
        </div>

        {/* Multi-Branch Desktop Alert when at capacity */}
        {branches.length >= subscription.plan.maxBranches && (
          <div className="p-3.5 rounded-2xl bg-[#FDF4F0] dark:bg-[#2A2420]/70 border border-[#F5E2D8] dark:border-[#4A3B33] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Building2 size={18} className="text-[#d4522f] shrink-0" />
              <div>
                <span className="font-extrabold text-black dark:text-white">
                  {language === 'ar' ? 'إدارة الفروع المتعددة ميزة حصرية في Atrium Desktop' : language === 'fr' ? 'La gestion multi-sites est une exclusivité Atrium Desktop' : 'Multi-Facility Management is an Atrium Desktop Feature'}
                </span>
                <p className="text-black/70 dark:text-white/75 text-[11px] mt-0.5">
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

        <div className="space-y-2">
          {branches.map((b) => (
            <div key={b.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs hover:border-[#D5DFE3] transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-black dark:text-white">
                    {b.name}
                  </span>
                  <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-black/65 dark:text-white/70 font-bold">
                    {b.code}
                  </span>
                  {b.isMainBranch && (
                    <span className="text-[10px] font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-full">
                      {language === 'ar' ? 'المقر الرئيسي' : language === 'fr' ? 'Siège principal' : 'Headquarters'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-black/65 dark:text-white/65 mt-0.5">
                  {b.address || (language === 'ar' ? 'العنوان غير محدد' : language === 'fr' ? 'Adresse non renseignée' : 'Address not configured')} · {b.phone || (language === 'ar' ? 'بدون هاتف' : language === 'fr' ? 'Sans téléphone' : 'No phone')}
                </div>
              </div>

              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {language === 'ar' ? 'متصل' : language === 'fr' ? 'En ligne' : 'Online'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Authorized Devices & Terminals */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white">
              {t('settings_terminals_title', language)}
            </h3>
            <p className="text-xs text-black/60 dark:text-white/60">
              {t('settings_terminals_subtitle', language)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddDeviceOpen(true)}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-9 px-4 text-xs font-bold text-white flex items-center gap-1.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
          >
            <Plus size={14} />
            <span>{t('settings_register_terminal', language)}</span>
          </button>
        </div>

        {/* Hardware integration notice banner */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Printer size={18} className="text-[#d4522f] shrink-0" />
            <div>
              <span className="font-bold text-black dark:text-white">
                {language === 'ar'
                  ? 'ربط العتاد والمزامنة المحلية عبر تطبيق سطح المكتب'
                  : language === 'fr'
                  ? 'Le matériel et la synchronisation locale nécessitent Atrium Desktop'
                  : 'Hardware & offline sync require Atrium Desktop'}
              </span>
              <p className="text-black/65 dark:text-white/65 text-[11px] mt-0.5">
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
            className="px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-600 text-black/80 dark:text-white/85 text-[11px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            {language === 'ar' ? 'المزيد' : language === 'fr' ? 'En savoir plus' : 'Learn More'}
          </button>
        </div>

        <div className="space-y-2">
          {devices.map((dev) => (
            <div key={dev.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs hover:border-[#D5DFE3] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F3EDE7] dark:bg-neutral-700/80 border border-[#E6DED6] dark:border-neutral-600 flex items-center justify-center text-black/75 dark:text-white/80">
                  <Monitor size={17} />
                </div>
                <div>
                  <div className="text-sm font-bold text-black dark:text-white">
                    {dev.label}
                  </div>
                  <div className="text-xs font-mono text-black/55 dark:text-white/55 tabular-nums">
                    ID: {dev.hardwareId} · {new Date(dev.registeredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {language === 'ar' ? 'نشط' : language === 'fr' ? 'Actif' : 'Active'}
                </span>
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => revokeDevice(dev.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer p-1.5 rounded-full hover:bg-rose-50 transition-colors"
                    title={language === 'ar' ? 'حذف' : language === 'fr' ? 'Révoquer' : 'Revoke'}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
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
        <form onSubmit={handleCreateBranch} className="space-y-4">
          {branchError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 text-xs border border-rose-200">
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

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddBranchOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-black/65 dark:text-white/65 hover:text-black dark:hover:text-white cursor-pointer"
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
        <form onSubmit={handleRegisterDevice} className="space-y-4">
          {deviceError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
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

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddDeviceOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-black/65 dark:text-white/65 hover:text-black dark:hover:text-white cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--color-accent)',
                borderRadius: 'var(--radius-button)',
              }}
              className="h-10 px-5 text-xs font-semibold text-white cursor-pointer shadow-xs"
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
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {language === 'ar' ? 'تنبيه: استبدال شامل لبيانات النظام' : language === 'fr' ? 'Attention : Remplacement des données' : 'Caution: State Overwrite'}
              </p>
              <p className="mt-1 opacity-90">
                {language === 'ar'
                  ? 'استعادة هذا الملف سيستبدل المنشآت الحالية، الفروع، الأعضاء، والمعاملات بالبيانات المحفوظة في النسخة الاحتياطية.'
                  : language === 'fr'
                  ? 'La restauration remplacera l\'ensemble des entités, succursales, membres et transactions actuels par les données de la sauvegarde.'
                  : 'Restoring this backup file will replace your current businesses, branches, members, and transactions with the backup snapshot.'}
              </p>
            </div>
          </div>

          {pendingBackupMeta && (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-black/65 dark:text-white/65">
                  {language === 'ar' ? 'تاريخ تصدير النسخة:' : language === 'fr' ? 'Date de la sauvegarde :' : 'Backup Export Date:'}
                </span>
                <span className="font-semibold text-black dark:text-white tabular-nums">
                  {new Date(pendingBackupMeta.exportedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-black/65 dark:text-white/65">
                  {language === 'ar' ? 'المنشأة الرئيسية:' : language === 'fr' ? 'Entreprise principale :' : 'Primary Business:'}
                </span>
                <span className="font-semibold text-black dark:text-white">
                  {pendingBackupMeta.primaryBusiness}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-black/65 dark:text-white/65">
                  {language === 'ar' ? 'إجمالي المنشآت:' : language === 'fr' ? 'Total des entreprises :' : 'Total Businesses:'}
                </span>
                <span className="font-semibold text-black dark:text-white tabular-nums">
                  {pendingBackupMeta.businessesCount}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-black/65 dark:text-white/65">
                  {language === 'ar' ? 'الأعضاء / جهات الاتصال:' : language === 'fr' ? 'Membres / Contacts :' : 'Members / Contacts:'}
                </span>
                <span className="font-semibold text-black dark:text-white tabular-nums">
                  {pendingBackupMeta.membersCount} {language === 'ar' ? 'سجل' : language === 'fr' ? 'enregistrements' : 'records'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsRestoreModalOpen(false);
                setPendingBackupContent(null);
                setPendingBackupMeta(null);
              }}
              className="h-10 px-4 text-xs font-semibold text-black/65 dark:text-white/65 hover:text-black dark:hover:text-white cursor-pointer"
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
  );
};
