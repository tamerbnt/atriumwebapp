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
import { useAtriumStore } from '../../services/store';

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
  const { currentBusiness, currentBranch, currentUser, members, products, freelanceClients, freelanceInvoices, sales } = useAtriumStore();
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

      setExportedStatus('Backup downloaded successfully! Your data is 100% safe.');
      setTimeout(() => setExportedStatus(null), 4000);
    } catch (err) {
      console.warn('Export failed', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atrium Desktop Edition"
      subtitle="Expand beyond 1 branch with the high-performance desktop application"
      maxWidth="lg"
    >
      <div className="space-y-6 select-none">
        {/* Banner Alert based on trigger reason */}
        {reason === 'branch_limit' && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Building2 size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">Web Free Edition Limit Reached:</span> You have reached the 1 branch limit of the free web version. To add multiple branches and manage multi-location chains, download the Atrium Desktop app!
            </div>
          </div>
        )}

        {reason === 'business_limit' && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Layers size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">Multi-Business Management:</span> Managing multiple business verticals and enterprise multi-tenancy is exclusive to the Atrium Desktop Edition.
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1E1B19] via-[#2A2420] to-[#1E1B19] p-6 text-white border border-[#3E3832] shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#C4785A] text-white">
                  Desktop Pro & Enterprise
                </span>
                <span className="text-xs text-neutral-300">Windows · macOS</span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Scale Your Business Beyond Limits
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                The Atrium Web app is <strong>100% Free Forever</strong> for 1 business and 1 branch. Unlock multi-branch networks, hardware POS, offline resilience, and lifetime licenses in Desktop.
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
              <span>Multi-Branch Chains</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <Printer size={14} className="text-[#C4785A] shrink-0" />
              <span>Thermal Receipt POS</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <WifiOff size={14} className="text-[#C4785A] shrink-0" />
              <span>Offline-First Engine</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <ShieldCheck size={14} className="text-[#C4785A] shrink-0" />
              <span>Lifetime License Keys</span>
            </div>
          </div>
        </div>

        {/* The Seamless Data Sync Reassurance Box */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-xs">
            <Cloud size={16} className="text-[#C4785A]" />
            <span>How Your Data Seamlessly Moves to the Desktop App</span>
          </div>

          <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </div>
              <p>
                <strong>Zero Manual Migration:</strong> All your current business records, clients, products, deliverables, and settings are already safely synced in your <strong>Supabase Cloud</strong> database.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </div>
              <p>
                <strong>Single Sign-On:</strong> When you open the Atrium Desktop App, simply sign in with your Google account (<strong>{currentUser.email}</strong>). The desktop app instantly downloads your entire database.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </div>
              <p>
                <strong>License Voucher Activation:</strong> Enter your prepaid license voucher in Desktop to immediately unlock additional branches, team members, and POS hardware.
              </p>
            </div>
          </div>

          {/* Backup Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-[11px] text-neutral-400">
              Want an extra offline safety copy?
            </span>
            <button
              type="button"
              onClick={handleExportDataBackup}
              className="text-xs font-bold text-[#C4785A] hover:text-[#b3684a] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileDown size={14} />
              <span>Download Instant JSON Backup</span>
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
            Download Atrium Desktop Application
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDownload('windows')}
              disabled={downloadingPlatform !== null}
              className="h-12 px-4 rounded-2xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all active:scale-[0.99] disabled:opacity-75"
            >
              <Download size={16} />
              <span>
                {downloadingPlatform === 'windows' ? 'Preparing Windows Installer...' : 'Download for Windows (.exe)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleDownload('mac')}
              disabled={downloadingPlatform !== null}
              className="h-12 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all active:scale-[0.99] disabled:opacity-75 dark:border dark:border-neutral-700"
            >
              <Download size={16} />
              <span>
                {downloadingPlatform === 'mac' ? 'Preparing macOS Package...' : 'Download for macOS (.dmg)'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Voucher Prompt */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            Already purchased an Atrium License Voucher?
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
              <span>Redeem License Key</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
