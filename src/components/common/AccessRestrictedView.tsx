import React from 'react';
import { ShieldAlert, Home, ArrowLeftRight } from 'lucide-react';
import { useAtriumActions } from '../../services/store';
import { useTranslation } from '../../utils/useTranslation';

export interface AccessRestrictedViewProps {
  attemptedScreen: string;
  category?: string;
  effectiveRole?: string;
}

export const AccessRestrictedView: React.FC<AccessRestrictedViewProps> = ({
  attemptedScreen,
  category,
  effectiveRole,
}) => {
  const { t, isRtl } = useTranslation();
  const { setScreen, openFastSwitch } = useAtriumActions();

  return (
    <div
      data-testid="access-restricted-view"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full min-h-[55vh] flex items-center justify-center p-6 animate-in fade-in duration-200"
    >
      <div className="max-w-lg w-full rounded-[24px] bg-white dark:bg-[#1E1C1A] border border-black/[0.08] dark:border-white/[0.1] shadow-sm p-8 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] flex items-center justify-center">
          <ShieldAlert size={28} strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <h1
            data-testid="access-restricted-heading"
            className="t-h2 font-semibold text-black dark:text-white"
          >
            {t('access_restricted_title')}
          </h1>
          <p className="t-body text-black/65 dark:text-white/70">
            {t('access_restricted_desc')}
          </p>
        </div>

        <div className="rounded-xl bg-[#F5F1EC] dark:bg-[#141312] border border-black/[0.06] dark:border-white/[0.06] px-4 py-3 grid grid-cols-2 gap-3 text-start">
          <div>
            <div className="t-cap text-black/55 dark:text-white/55">
              {t('access_restricted_screen_label')}
            </div>
            <div
              data-testid="access-restricted-screen"
              className="t-small font-semibold text-black dark:text-white truncate tabular-nums"
            >
              {attemptedScreen}
            </div>
          </div>
          <div>
            <div className="t-cap text-black/55 dark:text-white/55">
              {t('access_restricted_role_label')}
            </div>
            <div
              data-testid="access-restricted-role"
              className="t-small font-semibold text-black dark:text-white truncate"
            >
              {effectiveRole || 'Staff'}
              {category ? ` · ${category}` : ''}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            data-testid="access-restricted-return-home"
            onClick={() => setScreen('home')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-fill,#E8643F)] hover:opacity-95 text-white font-semibold t-small transition-opacity cursor-pointer"
          >
            <Home size={16} />
            <span>{t('access_restricted_return_home')}</span>
          </button>

          <button
            type="button"
            data-testid="access-restricted-switch-user"
            onClick={() => openFastSwitch()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F3EDE7] dark:bg-[#2B2825] hover:bg-[#EAE1D8] dark:hover:bg-[#35312D] text-black dark:text-white font-semibold t-small transition-colors cursor-pointer"
          >
            <ArrowLeftRight size={16} />
            <span>{t('access_restricted_switch_user')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
