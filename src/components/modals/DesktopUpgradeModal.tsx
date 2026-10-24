import React, { useState } from 'react';
import {
  Laptop,
  Building2,
  Download,
  Cloud,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileDown,
  Monitor,
  Printer,
  WifiOff,
  Layers,
  KeyRound,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AtriumButton } from '../ui/AtriumButton';
import { useAtriumStore } from '../../services/store';
import { t } from '../../utils/i18n';

interface DesktopUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVoucherModal?: () => void;
  reason?: 'branch_limit' | 'business_limit' | 'general';
}

export const DesktopUpgradeModal: React.FC<DesktopUpgradeModalProps> = ({
  isOpen,
  onClose,
  onOpenVoucherModal,
  reason = 'general',
}) => {
  const { currentBusiness, currentBranch, currentUser, members, products, freelanceClients, freelanceInvoices, sales, language } = useAtriumStore();
  const [downloadingPlatform, setDownloadingPlatform] = useState<string | null>(null);
  const [exportedStatus, setExportedStatus] = useState<string | null>(null);

  const handleDownload = (platform: 'windows' | 'mac') => {
    setDownloadingPlatform(platform);
    setTimeout(() => {
      setDownloadingPlatform(null);
      // Create a small desktop installer manifest / guide download
      const manifest = {
        app: 'Atrium Desktop ERP & CRM',
        version: '2026.4.1-pro',
        targetPlatform: platform,
        userEmail: currentUser.email,
        businessId: currentBusiness.id,
        supabaseCloudSync: 'enabled',
        instructions: [
          '1. Install Atrium Desktop on your Windows / macOS workstation.',
          '2. Sign in with the SAME Google account: ' + currentUser.email,
          '3. Your business data will automatically pull down from Supabase Cloud in seconds.',
          '4. Activate your multi-branch lifetime license voucher in Settings -> License.',
        ],
      };
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atrium-desktop-installer-${platform}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1200);
  };

  const handleExportDataBackup = () => {
    try {
      const backupPayload = {
        exportedAt: new Date().toISOString(),
        user: currentUser,
        business: currentBusiness,
        branch: currentBranch,
        statistics: {
          membersCount: members.length,
          productsCount: products.length,
          freelanceClientsCount: freelanceClients.length,
          invoicesCount: freelanceInvoices.length,
          salesCount: sales.length,
        },
        data: {
          members,
          products,
          freelanceClients,
          freelanceInvoices,
          sales,
        },
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atrium-${currentBusiness.name.toLowerCase().replace(/\s+/g, '_')}-cloud-backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportedStatus(
        language === 'ar'
          ? 'تم تحميل النسخة الاحتياطية بنجاح! بياناتك آمنة ومحمية.'
          : language === 'fr'
          ? 'Sauvegarde téléchargée avec succès ! Vos données sont en sécurité.'
          : 'Backup downloaded successfully! Your data is 100% safe.'
      );
      setTimeout(() => setExportedStatus(null), 4000);
    } catch (err) {
      console.warn('Export failed', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'نسخة أتريوم المكتبية للكمبيوتر' : language === 'fr' ? 'Atrium Édition Bureau' : 'Atrium Desktop Edition'}
      subtitle={language === 'ar' ? 'تجاوز حدود الفرع الواحد مع تطبيق سطح المكتب فائق الأداء' : language === 'fr' ? 'Dépassez la limite d\'une seule agence avec l\'application de bureau haute performance' : 'Expand beyond 1 branch with the high-performance desktop application'}
      maxWidth="lg"
    >
      <div className="space-y-6 select-none">
        {/* Banner Alert based on trigger reason */}
        {reason === 'branch_limit' && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Building2 size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">
                {language === 'ar' ? 'تم الوصول لحد النسخة المجانية:' : language === 'fr' ? 'Limite de la version Web gratuite atteinte :' : 'Web Free Edition Limit Reached:'}
              </span>{' '}
              {language === 'ar'
                ? 'لقد بلغت الحد الأقصى للفرع الواحد في النسخة المجانية على الويب. لإضافة فروع متعددة وسلاسل قاعات، حمل تطبيق أتريوم المكتبي!'
                : language === 'fr'
                ? 'Vous avez atteint la limite d\'une seule agence de la version web gratuite. Pour ajouter plusieurs établissements et chaînes, téléchargez l\'application Atrium Bureau !'
                : 'You have reached the 1 branch limit of the free web version. To add multiple branches and manage multi-location chains, download the Atrium Desktop app!'}
            </div>
          </div>
        )}

        {reason === 'business_limit' && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Layers size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">
                {language === 'ar' ? 'إدارة الأنشطة المتعددة:' : language === 'fr' ? 'Gestion multi-activités :' : 'Multi-Business Management:'}
              </span>{' '}
              {language === 'ar'
                ? 'إدارة الأنشطة والقطاعات التجارية المتعددة ميزة حصرية لتطبيق أتريوم المكتبي.'
                : language === 'fr'
                ? 'La gestion de plusieurs activités et entreprises est exclusive à l\'édition Bureau d\'Atrium.'
                : 'Managing multiple business verticals and enterprise multi-tenancy is exclusive to the Atrium Desktop Edition.'}
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1E1B19] via-[#2A2420] to-[#1E1B19] p-6 text-white border border-[#3E3832] shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#C4785A] text-white">
                  {t('topbar_desktop_app', language)}
                </span>
                <span className="text-xs text-neutral-300">Windows · macOS · Linux</span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                {t('upgrade_modal_title', language)}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {t('upgrade_modal_subtitle', language)}
              </p>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#C4785A]/20 border border-[#C4785A]/40 text-[#C4785A] flex items-center justify-center shrink-0 self-center">
              <Laptop size={32} />
            </div>
          </div>

          {/* Quick Capabilities Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/10 text-[11px]">
            <div className="flex items-center gap-2 text-neutral-300">
              <Building2 size={14} className="text-[#C4785A] shrink-0" />
              <span>{t('settings_branches_title', language)}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <Printer size={14} className="text-[#C4785A] shrink-0" />
              <span>{t('shop_print_thermal', language)}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <WifiOff size={14} className="text-[#C4785A] shrink-0" />
              <span>{t('topbar_offline', language)}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <ShieldCheck size={14} className="text-[#C4785A] shrink-0" />
              <span>{t('settings_lifetime_badge', language)}</span>
            </div>
          </div>
        </div>

        {/* Free Web vs Desktop Lifetime Side-by-Side Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Free Web Tier Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-neutral-900 dark:text-white">{t('upgrade_free_badge', language)}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {t('status_active', language)}
              </span>
            </div>
            <ul className="space-y-1.5 text-neutral-600 dark:text-neutral-300 text-[11px]">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>
                  {language === 'ar' ? (
                    <><strong>نشاط تجاري 1</strong> و <strong>فرع 1</strong></>
                  ) : language === 'fr' ? (
                    <><strong>1 Entreprise</strong> &amp; <strong>1 Agence</strong></>
                  ) : (
                    <><strong>1 Business</strong> &amp; <strong>1 Branch</strong></>
                  )}
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>{t('settings_supabase_title', language)}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>{t('shop_title', language)}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>{language === 'ar' ? 'مجاني 100% للأبد' : language === 'fr' ? '100% Gratuit pour toujours' : '100% Free Forever'}</span>
              </li>
            </ul>
          </div>

          {/* Paid Desktop Lifetime Card */}
          <div className="p-4 rounded-2xl bg-[#FDF4F0] dark:bg-[#2A2420]/60 border border-[#F5E2D8] dark:border-[#4A3B33] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[#C4785A]">{t('upgrade_desktop_badge', language)}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C4785A] text-white">
                {t('settings_lifetime_badge', language)}
              </span>
            </div>
            <ul className="space-y-1.5 text-neutral-700 dark:text-neutral-300 text-[11px]">
              <li className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#C4785A] shrink-0" />
                <span><strong>{language === 'ar' ? 'فروع متعددة' : language === 'fr' ? 'Multi-agences' : 'Multi-Branch'}</strong> {language === 'ar' ? 'وسلاسل تجارية' : language === 'fr' ? 'Réseaux & Marques' : 'Chains & Brands'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#C4785A] shrink-0" />
                <span><strong>{language === 'ar' ? 'مستقل عن الإنترنت' : language === 'fr' ? 'Autonome hors-ligne' : 'Offline-First'}</strong> {language === 'ar' ? 'محرك SQLite محلي' : language === 'fr' ? 'moteur local SQLite' : 'local SQLite engine'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#C4785A] shrink-0" />
                <span>{language === 'ar' ? 'طابعات حرارية وقارئ باركود' : language === 'fr' ? 'Imprimante thermique & douchette' : 'Thermal receipt printer & barcode guns'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#C4785A] shrink-0" />
                <span>{language === 'ar' ? 'قسائم ترخيص مسبقة الدفع مدى الحياة' : language === 'fr' ? 'Bons de licence perpétuelle prépayés' : 'Prepaid Lifetime Cash Vouchers'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* The Seamless Data Sync Reassurance Box */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-xs">
            <Cloud size={16} className="text-[#C4785A]" />
            <span>
              {language === 'ar'
                ? 'كيف تنتقل بياناتك بسلاسة إلى تطبيق سطح المكتب'
                : language === 'fr'
                ? 'Comment vos données se synchronisent vers l\'application Bureau'
                : 'How Your Data Seamlessly Moves to the Desktop App'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </div>
              <p>
                <strong>{language === 'ar' ? 'تزامن تلقائي فوري:' : language === 'fr' ? 'Zéro migration manuelle :' : 'Zero Manual Migration:'}</strong>{' '}
                {language === 'ar'
                  ? 'كافة ملفات المشتركين، المنتجات، والعمليات متزامنة ومحفوظة بأمان في سحابة Supabase Cloud.'
                  : language === 'fr'
                  ? 'Tous vos dossiers, adhérents, produits et ventes sont déjà sauvegardés sur votre base cloud Supabase.'
                  : 'All your current business records, clients, products, deliverables, and settings are already safely synced in your Supabase Cloud database.'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </div>
              <p>
                <strong>{language === 'ar' ? 'تسجيل دخول موحد:' : language === 'fr' ? 'Connexion unique SSO :' : 'Single Sign-On:'}</strong>{' '}
                {language === 'ar'
                  ? `عند تشغيل التطبيق المكتبي، سجل الدخول بحسابك (${currentUser.email}) ليتم سحب قاعدة البيانات في ثوانٍ.`
                  : language === 'fr'
                  ? `À l'ouverture d'Atrium Bureau, connectez-vous avec votre compte Google (${currentUser.email}) pour charger l'intégralité de vos données.`
                  : `When you open the Atrium Desktop App, simply sign in with your Google account (${currentUser.email}). The desktop app instantly downloads your entire database.`}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </div>
              <p>
                <strong>{language === 'ar' ? 'تفعيل رمز القسيمة:' : language === 'fr' ? 'Activation par bon :' : 'License Voucher Activation:'}</strong>{' '}
                {language === 'ar'
                  ? 'أدخل رمز القسيمة الدائمة لفتح الفروع الإضافية فوراً وإدارة الأجهزة وربط نقاط البيع.'
                  : language === 'fr'
                  ? 'Saisissez votre bon de licence perpétuelle dans l\'application pour débloquer les agences supplémentaires et le matériel.'
                  : 'Enter your prepaid license voucher in Desktop to immediately unlock additional branches, team members, and POS hardware.'}
              </p>
            </div>
          </div>

          {/* Backup Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-[11px] text-neutral-400">
              {language === 'ar' ? 'هل ترغب في حفظ نسخة احتياطية إضافية؟' : language === 'fr' ? 'Souhaitez-vous une copie de sauvegarde hors-ligne ?' : 'Want an extra offline safety copy?'}
            </span>
            <button
              type="button"
              onClick={handleExportDataBackup}
              className="text-xs font-bold text-[#C4785A] hover:text-[#b3684a] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileDown size={14} />
              <span>{language === 'ar' ? 'تحميل نسخة احتياطية JSON' : language === 'fr' ? 'Télécharger une sauvegarde JSON' : 'Download Instant JSON Backup'}</span>
            </button>
          </div>

          {exportedStatus && (
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>{exportedStatus}</span>
            </div>
          )}
        </div>

        {/* Download Buttons */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            {language === 'ar' ? 'تحميل تطبيق أتريوم المكتبي' : language === 'fr' ? 'Télécharger l\'application de bureau Atrium' : 'Download Atrium Desktop Application'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AtriumButton
              type="button"
              variant="primary"
              size="md"
              glow
              icon={<Download size={16} />}
              onClick={() => handleDownload('windows')}
              disabled={downloadingPlatform !== null}
              className="!py-3"
            >
              {downloadingPlatform === 'windows'
                ? (language === 'ar' ? 'جاري تجهيز مثبت ويندوز...' : language === 'fr' ? 'Préparation de l\'installateur Windows...' : 'Preparing Windows Installer...')
                : (language === 'ar' ? 'تحميل لنظام ويندوز (.exe)' : language === 'fr' ? 'Télécharger pour Windows (.exe)' : 'Download for Windows (.exe)')}
            </AtriumButton>

            <AtriumButton
              type="button"
              variant="secondary"
              size="md"
              icon={<Download size={16} />}
              onClick={() => handleDownload('mac')}
              disabled={downloadingPlatform !== null}
              className="!py-3"
            >
              {downloadingPlatform === 'mac'
                ? (language === 'ar' ? 'جاري تجهيز حزمة ماك...' : language === 'fr' ? 'Préparation du paquet macOS...' : 'Preparing macOS Package...')
                : (language === 'ar' ? 'تحميل لنظام ماك (.dmg)' : language === 'fr' ? 'Télécharger pour macOS (.dmg)' : 'Download for macOS (.dmg)')}
            </AtriumButton>
          </div>
        </div>

        {/* Bottom Voucher Prompt */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'هل تمتلك قسيمة ترخيص مسبقاً؟' : language === 'fr' ? 'Vous possédez déjà un bon de licence ?' : 'Already purchased an Atrium License Voucher?'}
          </span>
          {onOpenVoucherModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVoucherModal();
              }}
              className="font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <KeyRound size={13} />
              <span>{language === 'ar' ? 'تفعيل رمز الترخيص' : language === 'fr' ? 'Activer la licence' : 'Redeem License Key'}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
