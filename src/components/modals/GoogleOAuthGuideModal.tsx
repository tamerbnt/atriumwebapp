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
      <div className="flex flex-col gap-[var(--modal-gap,20px)] text-[var(--text-1,#17130F)] dark:text-white select-none">
        {/* Instant Access Banner */}
        <div data-sq="card" className="card-opt p-[var(--card-pad,20px)] bg-[#FDF4F0] dark:bg-[#2A2420] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]">
          <div className="flex flex-col gap-[var(--s1,4px)]">
            <div className="flex items-center gap-[var(--s2,8px)] t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
              <Sparkles size={16} strokeWidth={1.5} />
              <span>Want to skip setup and start right away?</span>
            </div>
            <p className="text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)] t-cap">
              Log in directly as workspace owner (mehdisamih79@gmail.com) in 1 click without waiting for Google Cloud review.
            </p>
          </div>
          <AtriumButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleBypass}
            icon={<ArrowRight size={16} strokeWidth={1.5} />}
            iconPosition="right"
          >
            Launch Workspace
          </AtriumButton>
        </div>

        {/* Question 1: Is Google Auth Free? */}
        <div data-sq="card" className="card-opt p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s2,8px)]">
          <div className="flex items-center gap-[var(--s2,8px)]">
            <div className="w-[var(--badge-h,22px)] h-[var(--badge-h,22px)] rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center t-small shrink-0">
              ✓
            </div>
            <h4 className="t-card text-[var(--text-1,#17130F)] dark:text-white">
              1. Is Google Sign-In completely free?
            </h4>
          </div>
          <p className="t-body text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)] ps-[var(--s7,32px)]">
            <strong>Yes, 100% free forever.</strong> Google Identity Services and OAuth 2.0 Web Client authentication incur zero charges. You never need to enter a credit card or pay any fees for Google Sign-In.
          </p>
        </div>

        {/* Question 2: The First Field in Google Cloud Console */}
        <div data-sq="card" className="card-opt p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s3,12px)]">
          <div className="flex items-center gap-[var(--s2,8px)]">
            <div className="w-[var(--badge-h,22px)] h-[var(--badge-h,22px)] rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center t-small shrink-0">
              ?
            </div>
            <h4 className="t-card text-[var(--text-1,#17130F)] dark:text-white">
              2. What do I put in the first field (&quot;champ&quot;)?
            </h4>
          </div>
          <p className="t-body text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)] ps-[var(--s7,32px)]">
            In Google Cloud Console &gt; <em>OAuth 2.0 Client IDs</em> &gt; <em>Web Application</em>:
          </p>

          <div className="flex flex-col gap-[var(--s2,8px)] ps-[var(--s7,32px)]">
            <div data-sq="ctl" data-sq-border="none" className="p-[var(--s3,12px)] bg-[#F5F1EC] dark:bg-[#22201E] flex flex-col gap-[var(--s2,8px)]">
              <div className="flex items-center justify-between gap-[var(--s2,8px)]">
                <span className="t-small text-[var(--text-1,#17130F)] dark:text-white">
                  First field: &quot;Authorized JavaScript origins&quot;
                </span>
                <span className="h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center t-small text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-full">
                  Optional (Can leave empty)
                </span>
              </div>
              <p className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">
                You can leave this completely <strong>blank</strong>, or copy your Supabase URL:
              </p>
              <div className="flex items-center gap-[var(--s2,8px)]">
                <code className="t-cap font-sans text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] bg-[#EFE9E2] dark:bg-[#2B2825] px-[var(--s2,8px)] py-[var(--s1,4px)] rounded-[var(--r-check,6px)] truncate flex-1">
                  {supabaseUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(supabaseUrl, 'origin')}
                  className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] grid place-items-center rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] hover:bg-[#E7E0D7] dark:hover:bg-[#332F2B] text-[var(--text-2,#5A5047)] dark:text-white/75 cursor-pointer transition-colors"
                  title="Copy"
                >
                  {copiedField === 'origin' ? <Check size={16} strokeWidth={1.5} className="text-emerald-500" /> : <Copy size={16} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div data-sq="ctl" data-sq-border="none" className="p-[var(--s3,12px)] bg-[#F5F1EC] dark:bg-[#22201E] flex flex-col gap-[var(--s2,8px)]">
              <div className="flex items-center justify-between gap-[var(--s2,8px)]">
                <span className="t-small text-[var(--text-1,#17130F)] dark:text-white">
                  Second field: &quot;Authorized redirect URIs&quot;
                </span>
                <span className="h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center t-small text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 rounded-full">
                  Mandatory
                </span>
              </div>
              <p className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">
                Paste this exact URL into Google Cloud Console:
              </p>
              <div className="flex items-center gap-[var(--s2,8px)]">
                <code className="t-cap font-sans text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] bg-[#EFE9E2] dark:bg-[#2B2825] px-[var(--s2,8px)] py-[var(--s1,4px)] rounded-[var(--r-check,6px)] truncate flex-1">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(redirectUri, 'redirect')}
                  className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] grid place-items-center rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] hover:bg-[#E7E0D7] dark:hover:bg-[#332F2B] text-[var(--text-2,#5A5047)] dark:text-white/75 cursor-pointer transition-colors"
                  title="Copy"
                >
                  {copiedField === 'redirect' ? <Check size={16} strokeWidth={1.5} className="text-emerald-500" /> : <Copy size={16} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Question 3: How to Fix 403 Google Error */}
        <div
          data-sq="card"
          style={{ '--sq-stroke': 'rgba(244,63,94,0.35)' } as React.CSSProperties}
          className="card-opt p-[var(--card-pad,20px)] bg-rose-50/50 dark:bg-rose-950/20 flex flex-col gap-[var(--s3,12px)]"
        >
          <div className="flex items-center gap-[var(--s2,8px)]">
            <ShieldAlert size={16} strokeWidth={1.5} className="text-rose-600 shrink-0" />
            <h4 className="t-card text-rose-950 dark:text-rose-200">
              3. Why you got the &quot;403 access_denied&quot; Google error &amp; How to fix it
            </h4>
          </div>

          <div className="t-body text-[var(--text-2,#5A5047)] dark:text-white/80 flex flex-col gap-[var(--s2,8px)] ps-[var(--s6,24px)]">
            <p>
              When Google Cloud OAuth is set to <strong>Testing</strong> mode, Google blocks all logins with 403 unless you do one of these two fixes:
            </p>

            <div data-sq="ctl" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white">
                Fix A: Click &quot;Publish App&quot; (Best &amp; Easiest)
              </span>
              <p className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">
                Go to Google Cloud Console &gt; <strong>OAuth consent screen</strong> &gt; click the <strong>&quot;PUBLISH APP&quot;</strong> button. This switches the app to Production so any Google user can log in without needing test user approval.
              </p>
            </div>

            <div data-sq="ctl" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white">
                Fix B: Verify User Type is &quot;External&quot;
              </span>
              <p className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">
                Ensure User Type was not chosen as &quot;Internal&quot; (which blocks all personal @gmail.com accounts). It must be <strong>External</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-[var(--s3,12px)] pt-[var(--s2,8px)]">
          <button
            type="button"
            onClick={onClose}
            className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] t-btn text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)] hover:text-[var(--text-1,#17130F)] dark:hover:text-white cursor-pointer"
          >
            Close Guide
          </button>
          <button
            type="button"
            onClick={handleBypass}
            data-sq="ctl-sm"
            className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] t-btn bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 cursor-pointer"
          >
            Sign In with 1-Click
          </button>
        </div>
      </div>
    </Modal>
  );
};
