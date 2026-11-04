import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactElement,
  cloneElement,
  isValidElement,
} from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'ghost' | 'secondary';
  size?: 'sm' | 'md';
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    variant = 'ghost',
    size = 'md',
    children,
    disabled = false,
    className = '',
    side = 'top',
    ...props
  },
  ref,
) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-[6px] transition-colors duration-120 ease-out select-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

  const sizeStyles =
    size === 'sm'
      ? 'min-h-[44px] min-w-[44px] md:h-8 md:w-8 md:min-h-0 md:min-w-0 p-1.5'
      : 'min-h-[44px] min-w-[44px] md:h-9 md:w-9 md:min-h-0 md:min-w-0 p-2';

  const variantStyles =
    variant === 'ghost'
      ? 'bg-transparent text-ink hover:bg-surface active:bg-surface/80 border border-transparent'
      : 'bg-surface text-ink border border-rule hover:bg-paper active:bg-surface/80';

  const stateStyles = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';

  const iconChild = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
      })
    : children;

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            ref={ref}
            type={props.type ?? 'button'}
            aria-label={label}
            disabled={disabled}
            className={`${baseStyles} ${sizeStyles} ${variantStyles} ${stateStyles} ${className}`.trim()}
            {...props}
          >
            {iconChild}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={4}
            className="z-50 rounded-[6px] border border-rule bg-paper px-2 py-1 text-xs text-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-in fade-in-0 zoom-in-95"
          >
            {label}
            <Tooltip.Arrow className="fill-rule" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
});
