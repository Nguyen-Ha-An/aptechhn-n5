import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import type { Editor, Range } from '@tiptap/core';

export interface SlashCommandItem {
  id: string;
  title: string;
  hint: string;
  icon: string;
  aliases?: string[];
  run: (editor: Editor, range: Range) => void;
}

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    id: 'text',
    title: 'Text',
    hint: 'Plain text paragraph',
    icon: 'TextT',
    aliases: ['paragraph', 'p'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    id: 'heading-1',
    title: 'Heading 1',
    hint: 'Large section heading',
    icon: 'TextHOne',
    aliases: ['h1', 'title'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    id: 'heading-2',
    title: 'Heading 2',
    hint: 'Medium section heading',
    icon: 'TextHTwo',
    aliases: ['h2', 'subtitle'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    id: 'heading-3',
    title: 'Heading 3',
    hint: 'Small section heading',
    icon: 'TextHThree',
    aliases: ['h3', 'subheading'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    id: 'bullet-list',
    title: 'Bulleted list',
    hint: 'Create a bulleted list',
    icon: 'ListBullets',
    aliases: ['ul', 'bullet'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: 'ordered-list',
    title: 'Numbered list',
    hint: 'Create a numbered list',
    icon: 'ListNumbers',
    aliases: ['ol', 'number'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: 'task-list',
    title: 'To-do list',
    hint: 'Track tasks with a to-do list',
    icon: 'CheckSquare',
    aliases: ['todo', 'task', 'checklist', 'checkbox'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: 'blockquote',
    title: 'Quote',
    hint: 'Capture a quote or callout',
    icon: 'Quotes',
    aliases: ['callout', 'blockquote'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: 'code-block',
    title: 'Code block',
    hint: 'Display code with syntax formatting',
    icon: 'Code',
    aliases: ['code', 'pre', 'snippet'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: 'horizontal-rule',
    title: 'Divider',
    hint: 'Visual separator between sections',
    icon: 'Minus',
    aliases: ['hr', 'rule', 'line', 'divider'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

export function filterSlashItems(query: string): SlashCommandItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return SLASH_COMMAND_ITEMS;
  }
  return SLASH_COMMAND_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(normalized) ||
      item.hint.toLowerCase().includes(normalized) ||
      item.id.toLowerCase().includes(normalized) ||
      (item.aliases && item.aliases.some((a) => a.includes(normalized))),
  );
}

export function isSlashTriggerAllowed({
  parentOffset,
  charBefore,
}: {
  parentOffset: number;
  charBefore: string;
}): boolean {
  if (parentOffset === 0) return true;
  return /\s/.test(charBefore);
}

export const slashCommandPluginKey = new PluginKey('slashCommand');

export interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions<SlashCommandItem>, 'editor'>;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: slashCommandPluginKey,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const parentOffset = $from.parentOffset;
          const charBefore =
            range.from > 0
              ? state.doc.textBetween(range.from - 1, range.from, '\0', '\0')
              : '';
          return isSlashTriggerAllowed({ parentOffset, charBefore });
        },
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => {
          props.run(editor, range);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
