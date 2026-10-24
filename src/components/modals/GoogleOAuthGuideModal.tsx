import React, { useState } from 'react';
import {
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AtriumButton } from '../ui/AtriumButton';
import { useAtriumStore } from '../../services/store';

interface GoogleOAuthGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstantLogin?: (email: string) => void;
}

export const GoogleOAuthGuideModal: React.FC<GoogleOAuthGuideModalProps> = ({
  isOpen,
  onClose,
  onInstantLogin,
}) => {
  const { login } = useAtriumStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const supabaseUrl = 'https://tzzncsbvezywtaknwind.supabase.co';
  const redirectUri = 'https://tzzncsbvezywtaknwind.supabase.co/auth/v1/callback';

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleBypass = () => {
    if (onInstantLogin) {
      onInstantLogin('mehdisamih79@gmail.com');
    } else {
      login('mehdisamih79@gmail.com', 'owner2026');
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Google OAuth & 403 Error Fix Guide"
      subtitle="Complete answers for Google Cloud Console setup and test user errors"
      maxWidth="md"
    >
      <div className="space-y-5 text-neutral-800 dark:text-neutral-200 select-none">
        {/* Instant Access Banner */}
        <div className="p-4 rounded-2xl bg-[#FDF4F0] dark:bg-[#2A2420] border border-[#F5E2D8] dark:border-[#4A3B33] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-[#C4785A]">
              <Sparkles size={15} />
              <span>Want to skip setup and start right away?</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 text-[11px] leading-relaxed">
              Log in directly as workspace owner (mehdisamih79@gmail.com) in 1 click without waiting for Google Cloud review.
            </p>
          </div>
          <AtriumButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleBypass}
            icon={<ArrowRight size={13} />}
            iconPosition="right"
          >
            Launch Workspace
          </AtriumButton>
        </div>

        {/* Question 1: Is Google Auth Free? */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              ✓
            </div>
            <h4 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">
              1. Is Google Sign-In completely free?
            </h4>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pl-7">
            <strong>Yes, 100% free forever.</strong> Google Identity Services and OAuth 2.0 Web Client authentication incur zero charges. You never need to enter a credit card or pay any fees for Google Sign-In.
          </p>
        </div>

        {/* Question 2: The First Field in Google Cloud Console */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              ?
            </div>
            <h4 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">
              2. What do I put in the first field ("champ")?
            </h4>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pl-7">
            In Google Cloud Console &gt; <em>OAuth 2.0 Client IDs</em> &gt; <em>Web Application</em>:
          </p>

          <div className="space-y-2 pl-7 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-700 dark:text-neutral-300 text-[11px]">
                  First field: "Authorized JavaScript origins"
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  Optional (Can leave empty)
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                You can leave this completely <strong>blank</strong>, or copy your Supabase URL:
              </p>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono text-[#C4785A] bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded truncate flex-1">
                  {supabaseUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(supabaseUrl, 'origin')}
                  className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  title="Copy"
                >
                  {copiedField === 'origin' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-700 dark:text-neutral-300 text-[11px]">
                  Second field: "Authorized redirect URIs"
                </span>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                  Mandatory
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Paste this exact URL into Google Cloud Console:
              </p>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono text-[#C4785A] bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded truncate flex-1">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(redirectUri, 'redirect')}
                  className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  title="Copy"
                >
                  {copiedField === 'redirect' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Question 3: How to Fix 403 Google Error */}
        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-600 shrink-0" />
            <h4 className="text-xs font-black text-rose-950 dark:text-rose-200 uppercase tracking-wider">
              3. Why you got the "403 access_denied" Google error &amp; How to fix it
            </h4>
          </div>

          <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-2 pl-6">
            <p className="leading-relaxed">
              When Google Cloud OAuth is set to <strong>Testing</strong> mode, Google blocks all logins with 403 unless you do one of these two fixes:
            </p>

            <div className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-1">
              <span className="font-bold text-neutral-900 dark:text-white block">
                Fix A: Click "Publish App" (Best &amp; Easiest)
              </span>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Go to Google Cloud Console &gt; <strong>OAuth consent screen</strong> &gt; click the <strong>"PUBLISH APP"</strong> button. This switches the app to Production so any Google user can log in without needing test user approval.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-1">
              <span className="font-bold text-neutral-900 dark:text-white block">
                Fix B: Verify User Type is "External"
              </span>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Ensure User Type was not chosen as "Internal" (which blocks all personal @gmail.com accounts). It must be <strong>External</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            Close Guide
          </button>
          <button
            type="button"
            onClick={handleBypass}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 cursor-pointer shadow-xs"
          >
            Sign In with 1-Click
          </button>
        </div>
      </div>
    </Modal>
  );
};
