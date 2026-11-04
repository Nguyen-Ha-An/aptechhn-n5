import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-[6px] transition-colors duration-120 ease-out select-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

  const sizeStyles =
    size === 'sm'
      ? 'text-xs px-2.5 py-1.5 min-h-[44px] md:min-h-[32px] gap-1.5'
      : 'text-sm px-3.5 py-2 min-h-[44px] md:min-h-[38px] gap-2';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-accent text-accent-ink hover:opacity-90 active:opacity-95 border border-transparent shadow-none',
    secondary:
      'bg-surface text-ink border border-rule hover:bg-paper active:bg-surface/80',
    ghost:
      'bg-transparent text-ink hover:bg-surface active:bg-surface/80 border border-transparent',
    danger:
      'bg-transparent text-danger hover:bg-surface active:bg-surface/80 border border-transparent font-medium',
  };

  const stateStyles = isDisabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      className={`${baseStyles} ${sizeStyles} ${variantStyles[variant]} ${stateStyles} ${className}`.trim()}
      {...props}
    >
      {loading && <Spinner size={size === 'sm' ? 'sm' : 'md'} />}
      {children}
    </button>
  );
});
