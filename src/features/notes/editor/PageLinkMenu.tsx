import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FileText, Plus } from '@phosphor-icons/react';

export type PageLinkSuggestionItem =
  | {
      type: 'note';
      id: string;
      title: string;
      icon: string | null;
    }
  | {
      type: 'create';
      title: string;
    };

export interface PageLinkMenuProps {
  items: PageLinkSuggestionItem[];
  command: (props: { id: string; label: string }) => void;
  onCreateNote?: (title: string) => Promise<string | undefined>;
}

export interface PageLinkMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const PageLinkMenu = forwardRef<PageLinkMenuHandle, PageLinkMenuProps>(
  ({ items, command, onCreateNote }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = async (item: PageLinkSuggestionItem) => {
      if (item.type === 'note') {
        command({ id: item.id, label: item.title || 'Untitled' });
      } else if (item.type === 'create') {
        if (onCreateNote && !isCreating) {
          try {
            setIsCreating(true);
            const newId = await onCreateNote(item.title);
            if (newId) {
              command({ id: newId, label: item.title });
            }
          } finally {
            setIsCreating(false);
          }
        }
      }
    };

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
            void selectItem(item);
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
          No pages found
        </div>
      );
    }

    return (
      <div
        role="listbox"
        tabIndex={0}
        aria-label="Link a page"
        aria-activedescendant={`link-item-${selectedIndex}`}
        className="z-50 max-h-72 w-64 overflow-y-auto rounded-[10px] border border-rule bg-paper p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] focus:outline-none"
      >
        <div className="px-2 py-1 text-[11px] font-semibold text-muted">LINK TO PAGE</div>
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;

          if (item.type === 'create') {
            return (
              <button
                key="create-option"
                id={`link-item-${index}`}
                role="option"
                type="button"
                aria-selected={isSelected}
                disabled={isCreating}
                onClick={() => void selectItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-sm transition-colors ${
                  isSelected ? 'bg-surface font-medium text-ink' : 'text-ink hover:bg-surface'
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-rule bg-paper text-muted">
                  <Plus size={14} aria-hidden="true" />
                </span>
                <span className="truncate">
                  Create page &ldquo;{item.title}&rdquo;
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              id={`link-item-${index}`}
              role="option"
              type="button"
              aria-selected={isSelected}
              onClick={() => void selectItem(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-sm transition-colors ${
                isSelected ? 'bg-surface font-medium text-ink' : 'text-ink hover:bg-surface'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-sm">
                {item.icon ? (
                  <span role="img" aria-label="Icon">
                    {item.icon}
                  </span>
                ) : (
                  <FileText size={16} className="text-muted" aria-hidden="true" />
                )}
              </span>
              <span className="truncate">{item.title || 'Untitled'}</span>
            </button>
          );
        })}
      </div>
    );
  },
);

PageLinkMenu.displayName = 'PageLinkMenu';
