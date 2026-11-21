import React, { useState } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';
import { useTranslation } from '../../../utils/useTranslation';

interface MobilePhoneSimulatorProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  defaultMode?: 'mobile' | 'desktop';
}

export const MobilePhoneSimulator: React.FC<MobilePhoneSimulatorProps> = ({
  children,
  title,
  subtitle,
  defaultMode = 'mobile',
}) => {
  const { t, language } = useTranslation();
  const [mode, setMode] = useState<'mobile' | 'desktop'>(defaultMode);

  const currentTime = new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  return (
    <div className="space-y-4">
      {/* Viewport Control Bar */}
      <div
        data-sq="pod"
        data-sq-border="none"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-[#F3EDE7] dark:bg-[#191716]"
      >
        <div className="flex items-center gap-2">
          <div data-sq="ctl" className="w-8 h-8 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small">
            📱
          </div>
          <div>
            <div className="t-small font-semibold text-black dark:text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="t-small font-medium px-2 py-1 rounded-full bg-[#d4522f]/20 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {t('pm_sim_badge')}
              </span>
            </div>
            {subtitle && (
              <p className="t-cap text-black/55 dark:text-white/75">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Mode Toggle Switcher */}
        <div className="sq-elev-card self-start sm:self-auto">
          <div
            data-sq="ctl"
            data-sq-border="none"
            className="flex items-center gap-1 p-1 bg-white dark:bg-[#22201E]"
          >
            <button
              type="button"
              onClick={() => setMode('mobile')}
              data-sq="ctl-sm"
              className={`flex items-center gap-2 px-3 py-2 t-small font-semibold transition-all cursor-pointer ${
                mode === 'mobile'
                  ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                  : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{t('pm_sim_mobile_mode')}</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('desktop')}
              data-sq="ctl-sm"
              className={`flex items-center gap-2 px-3 py-2 t-small font-semibold transition-all cursor-pointer ${
                mode === 'desktop'
                  ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                  : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t('pm_sim_desktop_mode')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Frame Container */}
      {mode === 'mobile' ? (
        <div
          data-sq="pod"
          data-sq-border="none"
          className="flex justify-center py-4 px-2 bg-[#F3EDE7]/60 dark:bg-[#131211]"
        >
          {/* Realistic Smartphone Shell (390px wide) */}
          <div className="w-[390px] max-w-full bg-white dark:bg-[#191716] rounded-[48px] shadow-2xl border-[10px] border-neutral-800 dark:border-neutral-700 overflow-hidden relative flex flex-col min-h-[760px]">
            {/* Status Bar */}
            <div className="bg-neutral-900 text-white px-6 pt-3 pb-2 flex items-center justify-between t-small font-semibold select-none z-10 shrink-0">
              <span>{currentTime}</span>
              {/* Dynamic Island / Camera Pill */}
              <div className="w-24 h-4 bg-black rounded-full mx-auto" />
              <div className="flex items-center gap-2">
                <Signal className="w-3 h-3" />
                <span className="t-small font-semibold">5G</span>
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Mobile Scrollable Viewport */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {children}
            </div>

            {/* Home Indicator Bar */}
            <div className="py-2 bg-white dark:bg-[#191716] flex justify-center shrink-0">
              <div className="w-32 h-1 bg-neutral-400 dark:bg-white/25 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="sq-elev-card w-full">
          <div
            data-sq="card"
            data-sq-border="none"
            className="w-full bg-white dark:bg-[#22201E] p-4 sm:p-6"
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
