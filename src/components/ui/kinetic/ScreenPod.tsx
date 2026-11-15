import React from 'react';

export interface ScreenPodProps {
  children: React.ReactNode;
  className?: string;
}

export const ScreenPod: React.FC<ScreenPodProps> = React.memo(({ children, className = '' }) => {
  return (
    <div
      className={`bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-4 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs ${className}`}
    >
      {children}
    </div>
  );
});

ScreenPod.displayName = 'ScreenPod';
