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
  const { currentBusiness, currentBranch, currentUser, members, products, freelanceClients, freelanceInvoices, sales, language, networkMode } = useAtriumStore();
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
      isLoading={networkMode === 'force_skeleton'}
      title={language === 'ar' ? 'نسخة أتريوم المكتبية للكمبيوتر' : language === 'fr' ? 'Atrium Édition Bureau' : 'Atrium Desktop Edition'}
      subtitle={language === 'ar' ? 'تجاوز حدود الفرع الواحد مع تطبيق سطح المكتب فائق الأداء' : language === 'fr' ? 'Dépassez la limite d\'une seule agence avec l\'application de bureau haute performance' : 'Expand beyond 1 branch with the high-performance desktop application'}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-[var(--s6,24px)] select-none">
        {/* Banner Alert based on trigger reason */}
        {reason === 'branch_limit' && (
          <div
            data-sq="card"
            style={{ '--sq-stroke': '#FDE68A' } as React.CSSProperties}
            className="p-[var(--s4,16px)] bg-amber-50 dark:bg-amber-950/40 t-cap text-amber-900 dark:text-amber-200 flex items-start gap-[var(--s3,12px)]"
          >
            <Building2 size={16} strokeWidth={1.5} className="shrink-0 text-amber-600" />
            <div>
              <span className="font-semibold">
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
          <div
            data-sq="card"
            style={{ '--sq-stroke': '#FDE68A' } as React.CSSProperties}
            className="p-[var(--s4,16px)] bg-amber-50 dark:bg-amber-950/40 t-cap text-amber-900 dark:text-amber-200 flex items-start gap-[var(--s3,12px)]"
          >
            <Layers size={16} strokeWidth={1.5} className="shrink-0 text-amber-600" />
            <div>
              <span className="font-semibold">
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
        <div className="sq-elev-card">
          <div
            data-sq="card"
            style={{ '--sq-stroke': '#3E3832' } as React.CSSProperties}
            className="card-opt relative overflow-hidden bg-gradient-to-br from-[#1E1B19] via-[#2A2420] to-[#1E1B19] p-[var(--card-pad,20px)] text-white flex flex-col gap-[var(--s5,20px)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4,16px)]">
              <div className="flex flex-col gap-[var(--s2,8px)] max-w-md">
                <div className="flex items-center gap-[var(--s2,8px)]">
                  <span className="h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center rounded-full t-small bg-[var(--brand-fill,#C9461F)] text-white">
                    {t('topbar_desktop_app', language)}
                  </span>
                  <span className="t-cap text-[var(--text-dark-2,#A99E92)]">Windows · macOS · Linux</span>
                </div>
                <h3 className="t-dialog font-medium text-white">
                  {t('upgrade_modal_title', language)}
                </h3>
              </div>

              <div
                data-sq="tile-lg"
                style={{ '--sq-stroke': 'rgba(212,82,47,0.4)' } as React.CSSProperties}
                className="w-[var(--tile-lg,48px)] h-[var(--tile-lg,48px)] bg-[#d4522f]/20 text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center shrink-0 self-center"
              >
                <Laptop size={24} strokeWidth={2} />
              </div>
            </div>

          {/* Quick Capabilities Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--s3,12px)] pt-[var(--s4,16px)] border-t border-white/10 t-small">
            <div className="flex items-center gap-[var(--icon-text-gap,8px)] text-white/85">
              <Building2 size={16} strokeWidth={1.5} className="text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span>{t('settings_branches_title', language)}</span>
            </div>
            <div className="flex items-center gap-[var(--icon-text-gap,8px)] text-white/85">
              <Printer size={16} strokeWidth={1.5} className="text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span>{t('shop_print_thermal', language)}</span>
            </div>
            <div className="flex items-center gap-[var(--icon-text-gap,8px)] text-white/85">
              <WifiOff size={16} strokeWidth={1.5} className="text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span>{t('topbar_offline', language)}</span>
            </div>
            <div className="flex items-center gap-[var(--icon-text-gap,8px)] text-white/85">
              <ShieldCheck size={16} strokeWidth={1.5} className="text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span>{t('settings_lifetime_badge', language)}</span>
            </div>
          </div>
          </div>
        </div>

        {/* Free Web vs Desktop Lifetime Side-by-Side Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--card-gap,12px)]">
          {/* Free Web Tier Card */}
          <div
            data-sq="card"
            className="card-opt p-[var(--card-pad,20px)] bg-[#F5F1EC] dark:bg-[#22201E] flex flex-col gap-[var(--s3,12px)]"
          >
            <div className="flex items-center justify-between gap-[var(--s2,8px)]">
              <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white">{t('upgrade_free_badge', language)}</span>
              <span className="h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center rounded-full t-small bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {t('status_active', language)}
              </span>
            </div>
            <ul className="flex flex-col gap-[var(--s2,8px)] text-[var(--text-2,#5A5047)] dark:text-white/80 t-cap">
              <li className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-500 shrink-0" />
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
              <li className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-500 shrink-0" />
                <span>{t('settings_supabase_title', language)}</span>
              </li>
              <li className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-500 shrink-0" />
                <span>{t('shop_title', language)}</span>
              </li>
              <li className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-500 shrink-0" />
                <span>{language === 'ar' ? 'مجاني 100 % للأبد' : language === 'fr' ? '100 % Gratuit pour toujours' : '100% Free Forever'}</span>
              </li>
            </ul>
          </div>

          {/* Paid Desktop Lifetime Card */}
          <div
            data-sq="card"
            className="card-opt p-[var(--card-pad,20px)] bg-[#FDF4F0] dark:bg-[#2A2420]/60 [--sq-stroke:rgba(212,82,47,0.22)] dark:[--sq-stroke:rgba(255,143,99,0.22)] flex flex-col gap-[var(--s3,12px)]"
          >
            <div className="flex items-center justify-between gap-[var(--s2,8px)]">
              <span className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{t('upgrade_desktop_badge', language)}</span>
              <span className="h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center rounded-full t-small bg-[var(--brand-fill,#C9461F)] text-white">
                {t('settings_lifetime_badge', language)}
              </span>
            </div>
            <ul className="flex flex-col gap-[var(--s2,8px)] text-[var(--text-2,#5A5047)] dark:text-white/85 t-cap">
              <li className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <Sparkles size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
                <span><strong>{language === 'ar' ? 'فروع متعددة' : language === 'fr' ? 'Multi-agences' : 'Multi-Branch'}</strong> {language === 'ar' ? 'وسلاسل تجارية' : language === 'fr' ? 'Réseaux & Marques' : 'Chains & Brands'}</span>
              </li>
              <li className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <Sparkles size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
                <span><strong>{language === 'ar' ? 'مستقل عن الإنترنت' : language === 'fr' ? 'Autonome hors-ligne' : 'Offline-First'}</strong> {language === 'ar' ? 'محرك SQLite محلي' : language === 'fr' ? 'moteur local SQLite' : 'local SQLite engine'}</span>
              </li>
              <li className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <Sparkles size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
                <span>{language === 'ar' ? 'طابعات حرارية وقارئ باركود' : language === 'fr' ? 'Imprimante thermique & douchette' : 'Thermal receipt printer & barcode guns'}</span>
              </li>
              <li className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <Sparkles size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
                <span>{language === 'ar' ? 'قسائم ترخيص مسبقة الدفع مدى الحياة' : language === 'fr' ? 'Bons de licence perpétuelle prépayés' : 'Prepaid Lifetime Cash Vouchers'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* The Seamless Data Sync Reassurance Box */}
        <div
          data-sq="card"
          className="card-opt p-[var(--card-pad,20px)] bg-[#F5F1EC] dark:bg-[#22201E] flex flex-col gap-[var(--s3,12px)]"
        >
          <div className="flex items-center gap-[var(--icon-text-gap,8px)] text-[var(--text-1,#17130F)] dark:text-white t-label font-semibold">
            <Cloud size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <span>
              {language === 'ar'
                ? 'كيف تنتقل بياناتك بسلاسة إلى تطبيق سطح المكتب'
                : language === 'fr'
                ? 'Comment vos données se synchronisent vers l\'application Bureau'
                : 'How Your Data Seamlessly Moves to the Desktop App'}
            </span>
          </div>

          <div className="flex flex-col gap-[var(--s2,8px)] t-body text-[var(--text-2,#5A5047)] dark:text-white/80">
            <div className="flex items-start gap-[var(--s2,8px)]">
              <div className="w-[var(--badge-h,22px)] h-[var(--badge-h,22px)] rounded-full bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center t-small shrink-0 tabular-nums">
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
            <div className="flex items-start gap-[var(--s2,8px)]">
              <div className="w-[var(--badge-h,22px)] h-[var(--badge-h,22px)] rounded-full bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center t-small shrink-0 tabular-nums">
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
            <div className="flex items-start gap-[var(--s2,8px)]">
              <div className="w-[var(--badge-h,22px)] h-[var(--badge-h,22px)] rounded-full bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center t-small shrink-0 tabular-nums">
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
          <div className="pt-[var(--s2,8px)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s2,8px)] border-t border-[var(--atr-divider)]">
            <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">
              {language === 'ar' ? 'هل ترغب في حفظ نسخة احتياطية إضافية؟' : language === 'fr' ? 'Souhaitez-vous une copie de sauvegarde hors-ligne ?' : 'Want an extra offline safety copy?'}
            </span>
            <button
              type="button"
              onClick={handleExportDataBackup}
              className="t-btn font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline flex items-center gap-[var(--btn-sm-gap,6px)] transition-colors cursor-pointer"
            >
              <FileDown size={16} strokeWidth={1.5} />
              <span>{language === 'ar' ? 'تحميل نسخة احتياطية JSON' : language === 'fr' ? 'Télécharger une sauvegarde JSON' : 'Download Instant JSON Backup'}</span>
            </button>
          </div>

          {exportedStatus && (
            <div
              data-sq="ctl"
              className="p-[var(--s2,8px)] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 t-small flex items-center gap-[var(--icon-text-gap,8px)]"
            >
              <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-500" />
              <span>{exportedStatus}</span>
            </div>
          )}
        </div>

        {/* Download Buttons */}
        <div className="flex flex-col gap-[var(--s3,12px)]">
          <label className="t-label text-[var(--text-1,#17130F)] dark:text-white">
            {language === 'ar' ? 'تحميل تطبيق أتريوم المكتبي' : language === 'fr' ? 'Télécharger l\'application de bureau Atrium' : 'Download Atrium Desktop Application'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3,12px)]">
            <AtriumButton
              type="button"
              variant="primary"
              size="md"
              glow
              icon={<Download size={16} strokeWidth={1.5} />}
              onClick={() => handleDownload('windows')}
              disabled={downloadingPlatform !== null}
            >
              {downloadingPlatform === 'windows'
                ? (language === 'ar' ? 'جاري تجهيز مثبت ويندوز...' : language === 'fr' ? 'Préparation de l\'installateur Windows...' : 'Preparing Windows Installer...')
                : (language === 'ar' ? 'تحميل لنظام ويندوز (.exe)' : language === 'fr' ? 'Télécharger pour Windows (.exe)' : 'Download for Windows (.exe)')}
            </AtriumButton>

            <AtriumButton
              type="button"
              variant="secondary"
              size="md"
              icon={<Download size={16} strokeWidth={1.5} />}
              onClick={() => handleDownload('mac')}
              disabled={downloadingPlatform !== null}
            >
              {downloadingPlatform === 'mac'
                ? (language === 'ar' ? 'جاري تجهيز حزمة ماك...' : language === 'fr' ? 'Préparation du paquet macOS...' : 'Preparing macOS Package...')
                : (language === 'ar' ? 'تحميل لنظام ماك (.dmg)' : language === 'fr' ? 'Télécharger pour macOS (.dmg)' : 'Download for macOS (.dmg)')}
            </AtriumButton>
          </div>
        </div>

        {/* Bottom Voucher Prompt */}
        <div className="flex items-center justify-between pt-[var(--s2,8px)] border-t border-[var(--atr-divider)]">
          <span className="t-cap text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">
            {language === 'ar' ? 'هل تمتلك قسيمة ترخيص مسبقاً؟' : language === 'fr' ? 'Vous possédez déjà un bon de licence ?' : 'Already purchased an Atrium License Voucher?'}
          </span>
          {onOpenVoucherModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVoucherModal();
              }}
              className="t-btn font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline flex items-center gap-[var(--btn-sm-gap,6px)] cursor-pointer"
            >
              <KeyRound size={16} strokeWidth={1.5} />
              <span>{language === 'ar' ? 'تفعيل رمز الترخيص' : language === 'fr' ? 'Activer la licence' : 'Redeem License Key'}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
