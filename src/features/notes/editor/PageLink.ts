import { Mention } from '@tiptap/extension-mention';
import { mergeAttributes } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';

export const pageLinkPluginKey = new PluginKey('pageLinkSuggestion');

export const PageLink = Mention.extend({
  name: 'pageLink',

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-page-id') || element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-page-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-label') || element.textContent,
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }
          return {
            'data-label': attributes.label,
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(
        {
          'data-page-id': node.attrs.id,
          'data-page-link': '',
          class:
            'page-link text-ink underline decoration-rule hover:decoration-accent cursor-pointer font-medium px-0.5 rounded-[4px] hover:bg-surface transition-colors',
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      node.attrs.label || 'Untitled',
    ];
  },
});
