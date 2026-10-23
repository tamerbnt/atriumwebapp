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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { Modal } from '../ui/Modal';
import { validateVoucherCode } from '../../utils/rules';
import { LabelInput } from '../ui/LabelInput';
import { t, getSystemDefaultLanguage, SUPPORTED_LANGUAGES } from '../../utils/i18n';
import { BackendDiagnosticPanel } from '../BackendDiagnosticPanel';

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
    language,
    isLanguageAuto,
    setLanguage,
    setSystemDefaultLanguage,
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
  const [isDiagnosticPanelOpen, setIsDiagnosticPanelOpen] = useState(false);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Row 0: Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div
            style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
          >
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('settings_title', language)}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('settings_subtitle', language)}
            </p>
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
            className="h-10 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
            title="Download complete JSON database backup"
          >
            <FileDown size={14} className="text-[#C4785A]" />
            <span>{t('settings_export_backup', language)}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
            title="Restore database from a JSON backup file"
          >
            <FileUp size={14} className="text-[#C4785A]" />
            <span>{t('settings_restore_backup', language)}</span>
          </button>

          <button
            type="button"
            onClick={() => openDesktopUpgradeModal('general')}
            className="h-10 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer dark:border dark:border-neutral-700 shadow-xs"
          >
            <Laptop size={14} className="text-[#C4785A]" />
            <span>{t('topbar_desktop_app', language)}</span>
          </button>

          <button
            type="button"
            onClick={openOnboarding}
            className="h-10 px-4 rounded-xl bg-[#FDF4F0] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 text-[#C4785A] text-xs font-bold flex items-center gap-2 hover:bg-[#FBECE6] dark:hover:bg-neutral-700/80 transition-colors cursor-pointer"
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
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
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
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('settings_lang_title', language)}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isLanguageAuto
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-[#FCEEE8] text-[#C4785A] dark:bg-[#C4785A]/20 dark:text-[#C4785A]'
                  }`}
                >
                  {isLanguageAuto ? `${t('topbar_auto_detected', language)} (${language.toUpperCase()})` : `Manual (${language.toUpperCase()})`}
                </span>
              </div>
              <p className="text-xs text-[#52525B] dark:text-neutral-400 mt-0.5">
                {t('settings_lang_desc', language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-neutral-500 dark:text-neutral-400">
            <span>{t('settings_system_detected_badge', language)}:</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 uppercase bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
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
                ? 'bg-white dark:bg-neutral-800 border-[#C4785A] ring-2 ring-[#C4785A]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E9EEF0] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🌐</span>
              {isLanguageAuto && (
                <span className="w-5 h-5 rounded-full bg-[#C4785A] text-white flex items-center justify-center text-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-neutral-900 dark:text-white">
              {t('settings_system_default', language)}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
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
                ? 'bg-white dark:bg-neutral-800 border-[#C4785A] ring-2 ring-[#C4785A]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E9EEF0] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🇺🇸</span>
              {!isLanguageAuto && language === 'en' && (
                <span className="w-5 h-5 rounded-full bg-[#C4785A] text-white flex items-center justify-center text-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-neutral-900 dark:text-white">
              English (US / UK)
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
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
                ? 'bg-white dark:bg-neutral-800 border-[#C4785A] ring-2 ring-[#C4785A]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E9EEF0] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🇫🇷</span>
              {!isLanguageAuto && language === 'fr' && (
                <span className="w-5 h-5 rounded-full bg-[#C4785A] text-white flex items-center justify-center text-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-neutral-900 dark:text-white">
              Français (France / Algérie)
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
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
            className={`p-4 rounded-[20px] text-left transition-all border cursor-pointer relative ${
              !isLanguageAuto && language === 'ar'
                ? 'bg-white dark:bg-neutral-800 border-[#C4785A] ring-2 ring-[#C4785A]/20 shadow-sm'
                : 'bg-white/60 dark:bg-neutral-800/60 border-[#E9EEF0] dark:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🇩🇿</span>
              {!isLanguageAuto && language === 'ar' && (
                <span className="w-5 h-5 rounded-full bg-[#C4785A] text-white flex items-center justify-center text-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-neutral-900 dark:text-white">
              العربية (الجزائر / MENA)
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              دعم أصيل من اليمين إلى اليسار (RTL)
            </p>
          </button>
        </div>

        {/* RTL Information callout */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-300">
          <Sparkles size={16} className="text-[#C4785A] shrink-0" />
          <span>{t('settings_rtl_notice', language)}</span>
        </div>
      </div>

      {/* Row 2: License Status Banner */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
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
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {language === 'ar'
                ? `رتبة خطة أتريوم ${subscription.plan.name} #${subscription.plan.tierRank}`
                : language === 'fr'
                ? `Niveau Atrium ${subscription.plan.name} Rang #${subscription.plan.tierRank}`
                : `Atrium ${subscription.plan.name} Tier Rank #${subscription.plan.tierRank}`}
            </h2>
            <p className="text-xs text-[#52525B] dark:text-neutral-400">
              {subscription.isLifetime
                ? (language === 'ar'
                  ? `تم التفعيل عبر قسيمة ${subscription.activatedByVoucher || 'ATR-LIFE-VOUCHER'}. تم ترخيص التحديثات الدائمة والمزامنة.`
                  : language === 'fr'
                  ? `Activé par bon ${subscription.activatedByVoucher || 'ATR-LIFE-VOUCHER'}. Mises à jour perpétuelles autorisées.`
                  : `Activated via voucher code ${subscription.activatedByVoucher || 'ATR-LIFE-VOUCHER'}. Perpetual updates and sync authorized.`)
                : (language === 'ar'
                  ? 'فترة تقييم مجانية. أدخل رمز قسيمة الدفع المسبق الدائمة أو قم بالترقية على سطح المكتب لإدارة الفروع المتعددة.'
                  : language === 'fr'
                  ? 'Période d\'évaluation gratuite. Saisissez votre bon prépayé à vie ou passez sur Desktop.'
                  : 'Free evaluation tier. Enter your lifetime prepaid cash voucher code or upgrade on Desktop to unlock multi-branch management.')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => openDesktopUpgradeModal('general')}
              className="h-10 px-4 text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Download size={14} className="text-[#C4785A]" />
              <span>{t('settings_get_desktop', language)}</span>
            </button>

            <button
              type="button"
              onClick={onOpenVoucherModal}
              style={{
                backgroundColor: 'var(--color-accent)',
              }}
              className="h-10 px-5 text-xs font-bold text-white flex items-center gap-2 shrink-0 rounded-full hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
            >
              <KeyRound size={15} />
              <span>{t('settings_redeem_voucher', language)}</span>
            </button>
          </div>
        </div>

        {/* Free Web Edition Banner Notice */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FDF4F0] via-[#FAF0EA] to-white dark:from-[#26211E] dark:to-[#18181B] border border-[#F5E2D8] dark:border-[#3E3832] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Laptop size={18} className="text-[#C4785A] shrink-0" />
            <div>
              <span className="font-extrabold text-neutral-900 dark:text-white">
                {t('settings_current_plan', language)}: {t('settings_web_limit', language)}
              </span>
              <p className="text-neutral-500 dark:text-neutral-400 text-[11px] mt-0.5">
                {t('settings_web_limit_desc', language)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openDesktopUpgradeModal('general')}
            className="px-3.5 py-1.5 rounded-full bg-[#C4785A] text-white text-[11px] font-bold hover:bg-[#b3684a] transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            {language === 'ar' ? 'الترقية على سطح المكتب' : language === 'fr' ? 'Passer sur Desktop' : 'Upgrade on Desktop'}
          </button>
        </div>

        {/* Quota gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400 block text-[11px]">
              {language === 'ar' ? 'المنشآت المسموح بها' : language === 'fr' ? 'Établissements autorisés' : 'Businesses Allowed'}
            </span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {businesses.length} / {subscription.plan.maxBusinesses}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400 block text-[11px]">
              {language === 'ar' ? 'الفروع المسموح بها' : language === 'fr' ? 'Succursales autorisées' : 'Branches Allowed'}
            </span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {branches.length} / {subscription.plan.maxBranches}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400 block text-[11px]">
              {language === 'ar' ? 'أجهزة البيع المسموح بها' : language === 'fr' ? 'Terminaux POS autorisés' : 'POS Devices Allowed'}
            </span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {devices.length} / {subscription.plan.maxDevices}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400 block text-[11px]">
              {language === 'ar' ? 'تقارير الفروع المشتركة' : language === 'fr' ? 'Rapports multi-sites' : 'Cross-Branch Reports'}
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2 block">
              {subscription.plan.crossBranchReports
                ? (language === 'ar' ? 'مفعل' : language === 'fr' ? 'Activé' : 'Enabled')
                : (language === 'ar' ? 'خطة المحترفين فقط' : language === 'fr' ? 'Offre Pro uniquement' : 'Pro Tier Only')}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1.5: Supabase Cloud & PostgreSQL Database Integration */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
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
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('settings_supabase_title', language)}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    supabaseStatus === 'connected'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : supabaseStatus === 'connecting'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : supabaseStatus === 'offline'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {supabaseStatus === 'connected'
                    ? (language === 'ar' ? 'متصل بالسحابة' : language === 'fr' ? 'Connecté au cloud' : 'Cloud Connected')
                    : supabaseStatus === 'connecting'
                    ? (language === 'ar' ? 'جارٍ المزامنة' : language === 'fr' ? 'Synchronisation' : 'Syncing')
                    : supabaseStatus === 'offline'
                    ? (language === 'ar' ? 'الوضع المحلي البديل' : language === 'fr' ? 'Mode hors-ligne' : 'Offline Fallback')
                    : (language === 'ar' ? 'محرك محلي / هجين' : language === 'fr' ? 'Moteur hybride / local' : 'Hybrid / Local Engine')}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('settings_supabase_subtitle', language)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsDiagnosticPanelOpen(true)}
              className="h-9 px-4 text-xs font-bold rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
            >
              <Activity size={13} className="text-[#C4785A]" />
              <span>
                {language === 'ar'
                  ? 'فحص CRUD المباشر'
                  : language === 'fr'
                  ? 'Audit CRUD en direct'
                  : 'Live CRUD Diagnostics'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => syncWithSupabase()}
              disabled={isSyncing}
              className="h-9 px-4 text-xs font-bold rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-2 cursor-pointer transition-colors shadow-2xs disabled:opacity-60"
            >
              <RotateCw size={13} className={isSyncing ? 'animate-spin text-[#C4785A]' : ''} />
              <span>
                {isSyncing
                  ? (language === 'ar' ? 'جارٍ مزامنة الجداول...' : language === 'fr' ? 'Synchronisation des tables...' : 'Syncing Tables...')
                  : (language === 'ar' ? 'مزامنة قاعدة البيانات الآن' : language === 'fr' ? 'Synchroniser maintenant' : 'Sync Database Now')}
              </span>
            </button>
          </div>
        </div>

        {/* Cloud Diagnostics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-neutral-400 block">
              {language === 'ar' ? 'هيكلية المخطط' : language === 'fr' ? 'Architecture du schéma' : 'Schema Architecture'}
            </span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-1 block">
              {language === 'ar' ? '17 جدولا + 14 إجراء مخزن RPC' : language === 'fr' ? '17 tables + 14 fonctions RPC' : '17 Tables + 14 Stored RPCs'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {language === 'ar' ? 'عزل أمني صارم RLS متعدد المستأجرين' : language === 'fr' ? 'Isolation RLS multi-tenant stricte' : 'Strict multi-tenant RLS isolation'}
            </span>
          </div>

          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-neutral-400 block">
              {language === 'ar' ? 'بث حي WebSockets' : language === 'fr' ? 'WebSockets temps réel' : 'Realtime WebSockets'}
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {language === 'ar' ? 'مستمع بث نشط' : language === 'fr' ? 'Écouteur de diffusion actif' : 'Active Broadcast Listener'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {language === 'ar' ? 'تحديثات حية للحضور والمبيعات' : language === 'fr' ? 'Mises à jour directes entrées et ventes' : 'Live updates on check-ins & sales'}
            </span>
          </div>

          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-neutral-400 block">
              {language === 'ar' ? 'آخر مزامنة سحابية' : language === 'fr' ? 'Dernière synchronisation cloud' : 'Last Cloud Sync'}
            </span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-1 block">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : (language === 'ar' ? 'جاهز عند الطلب' : language === 'fr' ? 'Prêt à la demande' : 'Ready on command')}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {isSupabaseConfigured
                ? (language === 'ar' ? 'مزامنة سحابية مزدوجة نشطة' : language === 'fr' ? 'Synchronisation cloud active' : 'Dual-mode live cloud active')
                : (language === 'ar' ? 'وضع الحفظ المحلي البديل' : language === 'fr' ? 'Repli sur stockage local' : 'Offline local storage fallback')}
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

      {/* Row 1.8: Data Portability & Disaster Recovery Center */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FDF4F0] dark:bg-[#2A2420] text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-[#4A3B33]">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'مركز النسخ الاحتياطي واستعادة البيانات' : language === 'fr' ? 'Centre de sauvegarde & reprise d\'activité' : 'Data Backup & Disaster Recovery Center'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {language === 'ar' ? 'لقطة محلية جاهزة' : language === 'fr' ? 'Instantané local prêt' : 'Local Snapshot Ready'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar'
                  ? 'قم بتنزيل نسخة احتياطية كاملة ومحمولة بصيغة JSON لمساحة عملك، أو استعد بياناتك السابقة على أي جهاز.'
                  : language === 'fr'
                  ? 'Téléchargez une sauvegarde JSON 100% portable de votre espace ou restaurez vos données sur tout appareil.'
                  : 'Download a 100% portable JSON snapshot of your entire workspace or restore past records onto any device.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportDataBackup}
              className="h-9 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FileDown size={14} />
              <span>{language === 'ar' ? 'تصدير JSON كامل' : language === 'fr' ? 'Exporter JSON complet' : 'Export Full JSON'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FileUp size={14} className="text-[#C4785A]" />
              <span>{t('settings_restore_backup', language)}</span>
            </button>
          </div>
        </div>

        {/* Live Storage Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              {language === 'ar' ? 'المنشآت' : language === 'fr' ? 'Entités' : 'Tenants'}
            </span>
            <span className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5 block">
              {businesses.length} {language === 'ar' ? 'منشأة' : language === 'fr' ? 'Entreprise(s)' : `Business${businesses.length !== 1 ? 'es' : ''}`}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {branches.length} {language === 'ar' ? 'فروع' : language === 'fr' ? 'Succursales' : 'Branches'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              {language === 'ar' ? 'عملاء CRM' : language === 'fr' ? 'Clients CRM' : 'CRM Clients'}
            </span>
            <span className="text-base font-extrabold text-[#C4785A] mt-0.5 block">
              {members.length + (freelanceClients?.length || 0)} {language === 'ar' ? 'جهة اتصال' : language === 'fr' ? 'Contacts' : 'Contacts'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {language === 'ar' ? 'ملفات الحسابات النشطة' : language === 'fr' ? 'Profils comptables actifs' : 'Active ledger profiles'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              {language === 'ar' ? 'المخزون والمنتجات' : language === 'fr' ? 'Inventaire' : 'Inventory'}
            </span>
            <span className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5 block">
              {products.length} {language === 'ar' ? 'عنصر' : language === 'fr' ? 'Articles' : 'Items'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {language === 'ar' ? 'البضائع والباقات' : language === 'fr' ? 'Articles & forfaits' : 'SKUs & packages'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              {language === 'ar' ? 'المعاملات' : language === 'fr' ? 'Transactions' : 'Transactions'}
            </span>
            <span className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5 block">
              {sales.length + (freelanceInvoices?.length || 0)} {language === 'ar' ? 'سجل' : language === 'fr' ? 'Enregistrements' : 'Records'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {language === 'ar' ? 'الطلبات والفواتير' : language === 'fr' ? 'Commandes & factures' : 'Orders & invoices'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              {language === 'ar' ? 'محرك التخزين' : language === 'fr' ? 'Moteur stockage' : 'Storage Engine'}
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {language === 'ar' ? 'مشفر محلياً' : language === 'fr' ? 'Chiffré' : 'Encrypted'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">LocalStorage v2</span>
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
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t('settings_branches_title', language)}
            </h3>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {language === 'ar'
                ? `جميع المواقع الفعلية المسجلة للمنشأة (${branches.length} مسجل · ${subscription.plan.maxBranches} مسموح في باقة ${subscription.plan.name})`
                : language === 'fr'
                ? `Tous les établissements physiques de l'entreprise (${branches.length} enregistrés · ${subscription.plan.maxBranches} autorisés avec ${subscription.plan.name})`
                : `All physical locations under tenant business (${branches.length} registered · ${subscription.plan.maxBranches} permitted on ${subscription.plan.name})`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddBranch}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-9 px-4 text-xs font-bold text-white flex items-center gap-1.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
          >
            <Plus size={14} />
            <span>{t('settings_add_branch', language)}</span>
          </button>
        </div>

        {/* Multi-Branch Desktop Alert when at capacity */}
        {branches.length >= subscription.plan.maxBranches && (
          <div className="p-3.5 rounded-2xl bg-[#FDF4F0] dark:bg-[#2A2420]/70 border border-[#F5E2D8] dark:border-[#4A3B33] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Building2 size={18} className="text-[#C4785A] shrink-0" />
              <div>
                <span className="font-extrabold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'إدارة الفروع المتعددة ميزة حصرية في Atrium Desktop' : language === 'fr' ? 'La gestion multi-sites est une exclusivité Atrium Desktop' : 'Multi-Facility Management is an Atrium Desktop Feature'}
                </span>
                <p className="text-neutral-600 dark:text-neutral-300 text-[11px] mt-0.5">
                  {language === 'ar'
                    ? 'إدارة فروع فعلية متعددة، واشتراكات مشتركة وتقارير موحدة للمخزون عبر تطبيق Atrium المكتبي.'
                    : language === 'fr'
                    ? 'Gérez plusieurs succursales physiques, des abonnements multi-sites et des rapports unifiés avec Atrium Desktop.'
                    : 'Manage multiple physical branches, cross-branch memberships, and unified inventory reporting with Atrium Desktop.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openDesktopUpgradeModal('branch_limit')}
              className="px-3 py-1.5 rounded-full bg-[#C4785A] text-white text-[11px] font-bold hover:bg-[#b3684a] transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              {language === 'ar' ? 'تحميل Atrium للكمبيوتر (Windows / Mac)' : language === 'fr' ? 'Télécharger Atrium Desktop (Windows / Mac)' : 'Download Atrium Desktop (Windows / Mac)'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {branches.map((b) => (
            <div key={b.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs hover:border-[#D5DFE3] transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">
                    {b.name}
                  </span>
                  <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-500 font-bold">
                    {b.code}
                  </span>
                  {b.isMainBranch && (
                    <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                      {language === 'ar' ? 'المقر الرئيسي' : language === 'fr' ? 'Siège principal' : 'Headquarters'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {b.address || (language === 'ar' ? 'العنوان غير محدد' : language === 'fr' ? 'Adresse non renseignée' : 'Address not configured')} · {b.phone || (language === 'ar' ? 'بدون هاتف' : language === 'fr' ? 'Sans téléphone' : 'No phone')}
                </div>
              </div>

              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {language === 'ar' ? 'متصل' : language === 'fr' ? 'En ligne' : 'Online'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Authorized Devices & Terminals */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t('settings_terminals_title', language)}
            </h3>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
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
            <Printer size={18} className="text-[#C4785A] shrink-0" />
            <div>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                {language === 'ar'
                  ? 'ربط العتاد وأجهزة نقاط البيع والمزامنة بدون إنترنت SQLite تتطلب تطبيق Atrium المكتبي'
                  : language === 'fr'
                  ? 'L\'intégration matérielle et la synchronisation SQLite hors-ligne nécessitent Atrium Desktop'
                  : 'Hardware integration & offline-first SQLite synchronization require Atrium Desktop'}
              </span>
              <p className="text-neutral-500 dark:text-neutral-400 text-[11px] mt-0.5">
                {language === 'ar'
                  ? 'طابعات الإيصالات الحرارية (ESC/POS)، أدراج النقد، قارئات الباركود والبوابات البيومترية / RFID تتصل أصلياً عبر تطبيق الحاسوب.'
                  : language === 'fr'
                  ? 'Imprimantes thermiques (ESC/POS), tiroirs-caisses, lecteurs code-barres et tourniquets biométriques/RFID se connectent nativement via l\'application Desktop.'
                  : 'Thermal receipt printers (ESC/POS), cash drawers, barcode guns, and biometric fingerprint/RFID turnstiles connect natively via the desktop app.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openDesktopUpgradeModal('general')}
            className="px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 text-[11px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            {language === 'ar' ? 'معرفة المزيد' : language === 'fr' ? 'En savoir plus' : 'Learn More'}
          </button>
        </div>

        <div className="space-y-2">
          {devices.map((dev) => (
            <div key={dev.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs hover:border-[#D5DFE3] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F8F9FA] dark:bg-neutral-700/80 border border-[#EDF1F3] dark:border-neutral-600 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                  <Monitor size={17} />
                </div>
                <div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-white">
                    {dev.label}
                  </div>
                  <div className="text-xs font-mono text-neutral-400">
                    ID: {dev.hardwareId} · {language === 'ar' ? 'تاريخ التسجيل' : language === 'fr' ? 'Enregistré' : 'Registered'}: {new Date(dev.registeredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {language === 'ar' ? 'نقطة بيع نشطة' : language === 'fr' ? 'Terminal actif' : 'Active Terminal'}
                </span>
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => revokeDevice(dev.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer p-1.5 rounded-full hover:bg-rose-50 transition-colors"
                    title={language === 'ar' ? 'إلغاء الترخيص' : language === 'fr' ? 'Révoquer l\'autorisation' : 'Revoke authorization'}
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
        title={language === 'ar' ? 'إضافة فرع تجاري جديد' : language === 'fr' ? 'Ajouter une succursale' : 'Add Business Branch'}
        subtitle={
          language === 'ar'
            ? `توسيع شبكة فروع ${currentBusiness.name}`
            : language === 'fr'
            ? `Étendre le réseau d'implantations de ${currentBusiness.name}`
            : `Expand ${currentBusiness.name} location network`
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
            label={language === 'ar' ? 'اسم الفرع *' : language === 'fr' ? 'Nom de la succursale *' : 'Branch Name *'}
            required
            value={branchName}
            onChange={setBranchName}
            placeholder="e.g. Apex West Sidi Yahia"
            width="100%"
            height={40}
            corner={12}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="BranchCode"
              label={language === 'ar' ? 'رمز الفرع *' : language === 'fr' ? 'Code succursale *' : 'Branch Code *'}
              required
              value={branchCode}
              onChange={setBranchCode}
              placeholder="e.g. APX-WEST"
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
            label={language === 'ar' ? 'العنوان الفعلي' : language === 'fr' ? 'Adresse physique' : 'Physical Address'}
            value={branchAddress}
            onChange={setBranchAddress}
            placeholder="Boulevard, City, Wilaya"
            width="100%"
            height={40}
            corner={12}
          />

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddBranchOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 cursor-pointer"
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
              {language === 'ar' ? 'إنشاء الفرع' : language === 'fr' ? 'Créer la succursale' : 'Create Branch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Device Modal */}
      <Modal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        title={language === 'ar' ? 'مصادقة جهاز نقطة البيع' : language === 'fr' ? 'Autoriser un terminal POS' : 'Authorize POS Hardware Terminal'}
        subtitle={language === 'ar' ? 'تسجيل معرّف الجهاز للكشك أو سطح المكتب' : language === 'fr' ? 'Enregistrer l\'identifiant matériel pour le kiosque' : 'Register machine hardware ID for desktop or web kiosk'}
      >
        <form onSubmit={handleRegisterDevice} className="space-y-4">
          {deviceError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {deviceError}
            </div>
          )}

          <LabelInput
            field="DeviceLabel"
            label={language === 'ar' ? 'اسم المحطة أو الجهاز *' : language === 'fr' ? 'Nom convivial du terminal *' : 'Terminal Friendly Label *'}
            required
            value={deviceLabel}
            onChange={setDeviceLabel}
            placeholder="e.g. Reception Desk 2 (POS)"
            width="100%"
            height={40}
            corner={12}
          />

          <LabelInput
            field="HardwareId"
            label={language === 'ar' ? 'معرّف العتاد *' : language === 'fr' ? 'Identifiant matériel *' : 'Hardware ID *'}
            required
            value={deviceHwId}
            onChange={setDeviceHwId}
            placeholder="e.g. HW-POS-ALGIERS-03"
            width="100%"
            height={40}
            corner={12}
          />

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddDeviceOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 cursor-pointer"
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
              {language === 'ar' ? 'مصادقة نقطة البيع' : language === 'fr' ? 'Autoriser le terminal' : 'Authorize Terminal'}
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
                <span className="text-neutral-500">
                  {language === 'ar' ? 'تاريخ تصدير النسخة:' : language === 'fr' ? 'Date de la sauvegarde :' : 'Backup Export Date:'}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {new Date(pendingBackupMeta.exportedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500">
                  {language === 'ar' ? 'المنشأة الرئيسية:' : language === 'fr' ? 'Entreprise principale :' : 'Primary Business:'}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {pendingBackupMeta.primaryBusiness}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500">
                  {language === 'ar' ? 'إجمالي المنشآت:' : language === 'fr' ? 'Total des entreprises :' : 'Total Businesses:'}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {pendingBackupMeta.businessesCount}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">
                  {language === 'ar' ? 'الأعضاء / جهات الاتصال:' : language === 'fr' ? 'Membres / Contacts :' : 'Members / Contacts:'}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
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
              className="h-10 px-4 text-xs font-semibold text-neutral-500 cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirmRestore}
              className="h-10 px-5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-full cursor-pointer shadow-xs transition-colors"
            >
              {language === 'ar' ? 'تأكيد واستعادة قاعدة البيانات' : language === 'fr' ? 'Confirmer et restaurer la base' : 'Confirm & Restore Database'}
            </button>
          </div>
        </div>
      </Modal>

      <BackendDiagnosticPanel
        isOpen={isDiagnosticPanelOpen}
        onClose={() => setIsDiagnosticPanelOpen(false)}
      />
    </div>
  );
};
