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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-[#F3EDE7] dark:bg-neutral-800/80 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold text-xs">
            📱
          </div>
          <div>
            <div className="text-xs font-semibold text-black dark:text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#d4522f]/20 text-[#d4522f]">
                {t('pm_sim_badge')}
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] text-black/55 dark:text-white/75">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Mode Toggle Switcher */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-neutral-900 rounded-xl border border-[#E6DED6] dark:border-neutral-800 shadow-sm self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'mobile'
                ? 'bg-[#d4522f] text-white shadow-xs'
                : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{t('pm_sim_mobile_mode')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'desktop'
                ? 'bg-[#d4522f] text-white shadow-xs'
                : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{t('pm_sim_desktop_mode')}</span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      {mode === 'mobile' ? (
        <div className="flex justify-center py-4 px-2 bg-gradient-to-b from-[#F3EDE7]/60 to-[#EAE1D8]/60 dark:from-neutral-950/40 dark:to-neutral-900/40 rounded-3xl border border-dashed border-[#D5CBBF] dark:border-neutral-800">
          {/* Realistic Smartphone Shell (390px wide) */}
          <div className="w-[390px] max-w-full bg-white dark:bg-neutral-900 rounded-[48px] shadow-2xl border-[10px] border-neutral-800 dark:border-neutral-700 overflow-hidden relative flex flex-col min-h-[760px]">
            {/* Status Bar */}
            <div className="bg-neutral-900 text-white px-6 pt-3 pb-2 flex items-center justify-between text-[11px] font-semibold select-none z-10 shrink-0">
              <span>{currentTime}</span>
              {/* Dynamic Island / Camera Pill */}
              <div className="w-24 h-4 bg-black rounded-full mx-auto" />
              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3" />
                <span className="text-[10px] font-bold">5G</span>
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Mobile Scrollable Viewport */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {children}
            </div>

            {/* Home Indicator Bar */}
            <div className="py-2.5 bg-white dark:bg-neutral-900 flex justify-center shrink-0">
              <div className="w-32 h-1 bg-neutral-400 dark:bg-neutral-600 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white dark:bg-neutral-900/60 p-4 sm:p-6 rounded-2xl border border-[#E6DED6] dark:border-neutral-800">
          {children}
        </div>
      )}
    </div>
  );
};
