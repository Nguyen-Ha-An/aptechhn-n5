import { forwardRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;
export const MenuGroup = DropdownMenu.Group;
export const MenuPortal = DropdownMenu.Portal;
export const MenuSub = DropdownMenu.Sub;
export const MenuRadioGroup = DropdownMenu.RadioGroup;

export const MenuContent = forwardRef<
  HTMLDivElement,
  DropdownMenu.DropdownMenuContentProps
>(function MenuContent({ className = '', sideOffset = 4, ...props }, ref) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        ref={ref}
        sideOffset={sideOffset}
        className={`z-50 min-w-[10rem] overflow-hidden rounded-[10px] border border-rule bg-paper p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] duration-120 animate-in fade-in-0 zoom-in-95 focus:outline-none ${className}`.trim()}
        {...props}
      />
    </DropdownMenu.Portal>
  );
});

export const MenuItem = forwardRef<
  HTMLDivElement,
  DropdownMenu.DropdownMenuItemProps & { destructive?: boolean }
>(function MenuItem({ className = '', destructive = false, ...props }, ref) {
  return (
    <DropdownMenu.Item
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-[6px] px-2.5 py-1.5 text-sm outline-none transition-colors duration-120 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${
        destructive
          ? 'text-danger hover:bg-surface focus:bg-surface'
          : 'text-ink hover:bg-surface focus:bg-surface'
      } ${className}`.trim()}
      {...props}
    />
  );
});

export const MenuSeparator = forwardRef<
  HTMLDivElement,
  DropdownMenu.DropdownMenuSeparatorProps
>(function MenuSeparator({ className = '', ...props }, ref) {
  return (
    <DropdownMenu.Separator
      ref={ref}
      className={`my-1 h-px bg-rule ${className}`.trim()}
      {...props}
    />
  );
});

export const MenuLabel = forwardRef<
  HTMLDivElement,
  DropdownMenu.DropdownMenuLabelProps
>(function MenuLabel({ className = '', ...props }, ref) {
  return (
    <DropdownMenu.Label
      ref={ref}
      className={`px-2.5 py-1.5 text-xs font-medium text-muted ${className}`.trim()}
      {...props}
    />
  );
});
