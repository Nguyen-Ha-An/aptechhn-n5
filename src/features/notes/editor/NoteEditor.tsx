import { useEffect, useMemo } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import type { JSONContent } from '@tiptap/react';
import {
  SlashCommand,
  slashCommandPluginKey,
  filterSlashItems,
  isSlashTriggerAllowed,
} from './slashCommand';
import { SlashCommandMenu, type SlashCommandMenuHandle } from './SlashCommandMenu';
import { PageLink, pageLinkPluginKey } from './PageLink';
import {
  PageLinkMenu,
  type PageLinkMenuHandle,
  type PageLinkSuggestionItem,
} from './PageLinkMenu';
import { docToPlainText } from '../doc';
import type { NoteTreeItem } from '../queries';

export interface NoteEditorProps {
  initialContent?: JSONContent;
  onChange?: (content: JSONContent, text: string) => void;
  onNavigatePage?: (pageId: string) => void;
  notesTreeItems?: NoteTreeItem[];
  onCreatePage?: (title: string) => Promise<string | undefined>;
  editable?: boolean;
  className?: string;
}

function updatePopupPosition(rect: DOMRect | null | undefined, popup: HTMLDivElement | null) {
  if (!rect || !popup) return;
  const top = rect.bottom + 6;
  const left = Math.min(rect.left, typeof window !== 'undefined' ? window.innerWidth - 280 : 0);
  popup.style.position = 'fixed';
  popup.style.top = `${Math.max(8, top)}px`;
  popup.style.left = `${Math.max(8, left)}px`;
  popup.style.zIndex = '9999';
}

export function NoteEditor({
  initialContent,
  onChange,
  onNavigatePage,
  notesTreeItems = [],
  onCreatePage,
  editable = true,
  className = '',
}: NoteEditorProps) {
  const extensions = useMemo(() => {
    return [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: "Type '/' for blocks, '[[' to link a page",
      }),
      SlashCommand.configure({
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
          render: () => {
            let component: ReactRenderer<SlashCommandMenuHandle> | null = null;
            let popup: HTMLDivElement | null = null;

            return {
              onStart: (props) => {
                popup = document.createElement('div');
                document.body.appendChild(popup);

                component = new ReactRenderer(SlashCommandMenu, {
                  props,
                  editor: props.editor,
                });

                popup.appendChild(component.element);
                updatePopupPosition(props.clientRect?.(), popup);
              },
              onUpdate: (props) => {
                component?.updateProps(props);
                updatePopupPosition(props.clientRect?.(), popup);
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  popup?.remove();
                  component?.destroy();
                  popup = null;
                  component = null;
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.remove();
                component?.destroy();
                popup = null;
                component = null;
              },
            };
          },
        },
      }),
      PageLink.configure({
        suggestion: {
          char: '[[',
          pluginKey: pageLinkPluginKey,
          allowSpaces: true,
          items: ({ query }) => {
            const normalized = query.trim().toLowerCase();
            const filteredNotes = notesTreeItems.filter((note) =>
              note.title.toLowerCase().includes(normalized),
            );

            const items: PageLinkSuggestionItem[] = filteredNotes
              .slice(0, 10)
              .map((note) => ({
                type: 'note',
                id: note.id,
                title: note.title || 'Untitled',
                icon: note.icon,
              }));

            if (query.trim()) {
              items.push({
                type: 'create',
                title: query.trim(),
              });
            }

            return items;
          },
          render: () => {
            let component: ReactRenderer<PageLinkMenuHandle> | null = null;
            let popup: HTMLDivElement | null = null;

            return {
              onStart: (props) => {
                popup = document.createElement('div');
                document.body.appendChild(popup);

                component = new ReactRenderer(PageLinkMenu, {
                  props: {
                    ...props,
                    onCreateNote: (t: string) => onCreatePage?.(t) ?? Promise.resolve(undefined),
                  },
                  editor: props.editor,
                });

                popup.appendChild(component.element);
                updatePopupPosition(props.clientRect?.(), popup);
              },
              onUpdate: (props) => {
                component?.updateProps({
                  ...props,
                  onCreateNote: (t: string) => onCreatePage?.(t) ?? Promise.resolve(undefined),
                });
                updatePopupPosition(props.clientRect?.(), popup);
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  popup?.remove();
                  component?.destroy();
                  popup = null;
                  component = null;
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.remove();
                component?.destroy();
                popup = null;
                component = null;
              },
            };
          },
        },
      }),
    ];
  }, [notesTreeItems, onCreatePage]);

  const editor = useEditor({
    extensions,
    content: initialContent ?? { type: 'doc', content: [] },
    editable,
    editorProps: {
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement | null;
        const link = target?.closest('a[data-page-id]');
        if (link) {
          const pageId = link.getAttribute('data-page-id');
          if (pageId && onNavigatePage) {
            onNavigatePage(pageId);
            return true;
          }
        }
        return false;
      },
      attributes: {
        class: 'tiptap focus:outline-none min-h-[300px]',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const json = currentEditor.getJSON();
      const text = docToPlainText(json);
      onChange?.(json, text);
    },
  });

  useEffect(() => {
    if (editor && editable !== editor.isEditable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Handle clicks on page links inside the editor DOM
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[data-page-id]');
      if (link) {
        const pageId = link.getAttribute('data-page-id');
        if (pageId) {
          onNavigatePage?.(pageId);
        }
      }
    };
    dom.addEventListener('click', handleClick);
    return () => {
      dom.removeEventListener('click', handleClick);
    };
  }, [editor, onNavigatePage]);

  return (
    <div className={`note-editor-wrapper ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
