import { forwardRef } from 'react';
import * as RadixPopover from '@radix-ui/react-popover';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;
export const PopoverClose = RadixPopover.Close;

export const PopoverContent = forwardRef<
  HTMLDivElement,
  RadixPopover.PopoverContentProps
>(function PopoverContent({ className = '', align = 'center', sideOffset = 4, ...props }, ref) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={`z-50 w-72 rounded-[10px] border border-rule bg-paper p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] duration-120 animate-in fade-in-0 zoom-in-95 focus:outline-none ${className}`.trim()}
        {...props}
      />
    </RadixPopover.Portal>
  );
});
