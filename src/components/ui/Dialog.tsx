import { type ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  trigger?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  className = '',
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-120 animate-in fade-in-0" />
        <RadixDialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-rule bg-paper p-6 shadow-[0_8px_24px_rgba(0,0,0,0.12)] duration-120 animate-in fade-in-0 zoom-in-95 focus:outline-none ${className}`.trim()}
        >
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="font-serif text-lg font-semibold text-ink">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </RadixDialog.Close>
          </div>

          {description && (
            <RadixDialog.Description className="mt-2 text-sm text-muted">
              {description}
            </RadixDialog.Description>
          )}

          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogRoot = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogPortal = RadixDialog.Portal;
export const DialogOverlay = RadixDialog.Overlay;
export const DialogContent = RadixDialog.Content;
export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description;
export const DialogClose = RadixDialog.Close;
