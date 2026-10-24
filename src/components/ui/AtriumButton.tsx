import React from 'react';
import { Loader2 } from 'lucide-react';

export interface AtriumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const AtriumButton: React.FC<AtriumButtonProps> = ({
  children,
  variant = 'primary',
  size = 'sm',
  glow = true,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) => {
  // Size styles matching Medical category primary button geometry
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-[11px] rounded-lg gap-1',
    sm: 'px-3.5 py-2 text-xs font-semibold rounded-xl gap-1.5',
    md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-5 py-3 text-base font-bold rounded-2xl gap-2.5',
  }[size];

  // Variant styling with original Logo Terracotta (#C4785A) - clean, standard treatment
  let variantClasses = '';
  switch (variant) {
    case 'primary':
      variantClasses =
        'bg-[#C4785A] hover:bg-[#b06749] active:bg-[#9e573a] text-white border border-transparent shadow-xs active:scale-[0.98]';
      break;
    case 'secondary':
      variantClasses =
        'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 hover:border-neutral-300 dark:hover:border-neutral-600 shadow-2xs active:scale-[0.98]';
      break;
    case 'outline':
      variantClasses =
        'bg-transparent text-[#C4785A] border border-[#C4785A]/50 hover:border-[#C4785A] hover:bg-[#C4785A]/10 active:scale-[0.98]';
      break;
    case 'ghost':
      variantClasses =
        'bg-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white border border-transparent active:scale-[0.98]';
      break;
    case 'danger':
      variantClasses =
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-transparent shadow-xs active:scale-[0.98]';
      break;
  }

  const disabledClasses = disabled || loading
    ? 'opacity-60 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none whitespace-nowrap shrink-0 ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};

export const Button = AtriumButton;
export default AtriumButton;
