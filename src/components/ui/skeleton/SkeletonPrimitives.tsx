import React from 'react';

interface SkeletonBoxProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string; // e.g. "rounded-md", "rounded-xl", "rounded-2xl"
  shimmer?: boolean;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  className = '',
  width,
  height,
  rounded = 'rounded-lg',
  shimmer = true,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`relative overflow-hidden bg-neutral-200/80 dark:bg-neutral-800/80 ${rounded} ${className}`}
    >
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 dark:via-neutral-700/30 to-transparent animate-shimmer pointer-events-none" />
      )}
    </div>
  );
};

interface SkeletonTextProps {
  className?: string;
  width?: string | number;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  shimmer?: boolean;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  className = '',
  width = '100%',
  size = 'sm',
  shimmer = true,
}) => {
  const heightMap = {
    xs: 'h-2.5',
    sm: 'h-3.5',
    base: 'h-4',
    lg: 'h-5',
    xl: 'h-6',
    '2xl': 'h-8',
    '3xl': 'h-10',
  };

  return (
    <SkeletonBox
      width={width}
      className={`${heightMap[size]} ${className}`}
      rounded="rounded-xs"
      shimmer={shimmer}
    />
  );
};

interface SkeletonCircleProps {
  size?: number | string; // e.g. 32, 40, "2.5rem"
  className?: string;
  shimmer?: boolean;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 36,
  className = '',
  shimmer = true,
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  return (
    <SkeletonBox
      width={dimension}
      height={dimension}
      rounded="rounded-full"
      className={`shrink-0 ${className}`}
      shimmer={shimmer}
    />
  );
};

interface SkeletonButtonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  shimmer?: boolean;
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  width = 90,
  height = 36,
  className = '',
  shimmer = true,
}) => {
  return (
    <SkeletonBox
      width={width}
      height={height}
      rounded="rounded-xl"
      className={`shrink-0 ${className}`}
      shimmer={shimmer}
    />
  );
};
