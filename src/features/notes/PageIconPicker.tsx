import { useState, Suspense } from 'react';
import { EmojiPicker, defaultEmojiDataResolver, type Emoji, type EmojiData } from 'frimousse';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui';
import { Smiley, Trash } from '@phosphor-icons/react';

const FALLBACK_EMOJI_DATA: EmojiData = {
  locale: 'en',
  emojis: [
    { emoji: '📝', category: 0, label: 'memo', version: 1, tags: ['note', 'write'] },
    { emoji: '📐', category: 0, label: 'triangle ruler', version: 1, tags: ['math'] },
    { emoji: '🧬', category: 0, label: 'dna', version: 1, tags: ['biology', 'science'] },
    { emoji: '📚', category: 0, label: 'books', version: 1, tags: ['study', 'read'] },
    { emoji: '💡', category: 0, label: 'light bulb', version: 1, tags: ['idea'] },
    { emoji: '🎯', category: 0, label: 'direct hit', version: 1, tags: ['target', 'goal'] },
    { emoji: '🚀', category: 0, label: 'rocket', version: 1, tags: ['launch', 'fast'] },
    { emoji: '💻', category: 0, label: 'laptop', version: 1, tags: ['code', 'computer'] },
    { emoji: '🧠', category: 0, label: 'brain', version: 1, tags: ['think', 'mind'] },
    { emoji: '📁', category: 0, label: 'file folder', version: 1, tags: ['folder', 'docs'] },
    { emoji: '⭐', category: 0, label: 'star', version: 1, tags: ['favorite'] },
    { emoji: '✏️', category: 0, label: 'pencil', version: 1, tags: ['write'] },
  ],
  categories: [{ index: 0, label: 'Common' }],
  skinTones: {
    light: '🏻',
    'medium-light': '🏼',
    medium: '🏽',
    'medium-dark': '🏾',
    dark: '🏿',
  },
};

async function safeEmojiResolver(
  locale: string,
  options: Parameters<typeof defaultEmojiDataResolver>[1],
) {
  try {
    return await defaultEmojiDataResolver(locale, options);
  } catch {
    return FALLBACK_EMOJI_DATA;
  }
}

export interface PageIconPickerProps {
  icon: string | null;
  onChangeIcon: (icon: string | null) => void;
  disabled?: boolean;
}

export function PageIconPicker({ icon, onChangeIcon, disabled = false }: PageIconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={icon ? `Change page icon, current icon is ${icon}` : 'Add page icon'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] text-2xl transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          {icon ? (
            <span role="img" aria-hidden="true">
              {icon}
            </span>
          ) : (
            <Smiley size={24} className="text-muted hover:text-ink" aria-hidden="true" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="z-50 w-72 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
      >
        <div className="flex flex-col gap-2">
          {icon && (
            <button
              type="button"
              onClick={() => {
                onChangeIcon(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-danger transition-colors hover:bg-surface"
            >
              <Trash size={14} aria-hidden="true" />
              <span>Remove icon</span>
            </button>
          )}

          <Suspense
            fallback={
              <div className="py-6 text-center text-xs text-muted">
                Loading emojis...
              </div>
            }
          >
            <EmojiPicker.Root
              resolveEmojiData={safeEmojiResolver}
              onEmojiSelect={(emoji: Emoji) => {
                onChangeIcon(emoji.emoji);
                setOpen(false);
              }}
              className="flex flex-col gap-2 text-sm"
            >
              <EmojiPicker.Search
                placeholder="Search emoji..."
                className="w-full rounded-[6px] border border-rule bg-surface px-2.5 py-1 text-xs text-ink placeholder:text-muted focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
              <EmojiPicker.Viewport className="max-h-56 overflow-y-auto">
                <EmojiPicker.Loading className="block py-4 text-center text-xs text-muted">
                  Loading emojis...
                </EmojiPicker.Loading>
                <EmojiPicker.Empty className="block py-4 text-center text-xs text-muted">
                  No emoji found.
                </EmojiPicker.Empty>
                <EmojiPicker.List className="grid grid-cols-6 gap-1 p-1" />
              </EmojiPicker.Viewport>
            </EmojiPicker.Root>
          </Suspense>
        </div>
      </PopoverContent>
    </Popover>
  );
}
