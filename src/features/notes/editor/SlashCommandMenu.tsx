import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { SlashCommandItem } from './slashCommand';
import {
  TextT,
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  CheckSquare,
  Quotes,
  Code,
  Minus,
} from '@phosphor-icons/react';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  TextT,
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  CheckSquare,
  Quotes,
  Code,
  Minus,
};

export interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuHandle, SlashCommandMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) {
            command(item);
            return true;
          }
        }
        if (event.key === 'Escape') {
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="z-50 w-64 rounded-[10px] border border-rule bg-paper p-3 text-xs text-muted shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          No matching blocks
        </div>
      );
    }

    return (
      <div
        role="listbox"
        tabIndex={0}
        aria-label="Insert block"
        aria-activedescendant={`slash-item-${selectedIndex}`}
        className="z-50 max-h-72 w-64 overflow-y-auto rounded-[10px] border border-rule bg-paper p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] focus:outline-none"
      >
        <div className="px-2 py-1 text-xs font-semibold text-muted">Blocks</div>
        {items.map((item, index) => {
          const IconComponent = ICONS[item.icon] ?? TextT;
          const isSelected = index === selectedIndex;

          return (
            <button
              key={item.id}
              id={`slash-item-${index}`}
              role="option"
              type="button"
              aria-selected={isSelected}
              onClick={() => command(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left text-sm transition-colors ${
                isSelected ? 'bg-surface font-medium text-ink' : 'text-ink hover:bg-surface'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-rule bg-paper text-muted">
                <IconComponent size={15} aria-hidden="true" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="truncate leading-tight">{item.title}</span>
                <span className="truncate text-xs text-muted leading-tight">{item.hint}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  },
);

SlashCommandMenu.displayName = 'SlashCommandMenu';
