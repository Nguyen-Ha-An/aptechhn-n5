import { describe, it, expect } from 'vitest';
import { extractLinks, docToPlainText } from './doc';
import type { JSONContent } from '@tiptap/react';

describe('doc utilities', () => {
  describe('extractLinks', () => {
    it('returns empty array when doc is null or undefined or empty', () => {
      expect(extractLinks(null)).toEqual([]);
      expect(extractLinks(undefined)).toEqual([]);
      expect(extractLinks({ type: 'doc', content: [] })).toEqual([]);
    });

    it('extracts unique target IDs from pageLink nodes', () => {
      const doc: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Check out ' },
              { type: 'pageLink', attrs: { id: 'note-1', label: 'Algebra' } },
              { type: 'text', text: ' and ' },
              { type: 'pageLink', attrs: { id: 'note-2', label: 'Biology' } },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Again, ' },
              { type: 'pageLink', attrs: { id: 'note-1', label: 'Algebra' } },
            ],
          },
        ],
      };

      const links = extractLinks(doc);
      expect(links).toEqual(['note-1', 'note-2']);
    });

    it('ignores invalid or empty id in pageLink attrs', () => {
      const doc: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'pageLink', attrs: { id: '', label: 'Missing' } },
              { type: 'pageLink', attrs: { id: '   ', label: 'Whitespace' } },
              { type: 'pageLink', attrs: { label: 'No ID' } },
            ],
          },
        ],
      };

      expect(extractLinks(doc)).toEqual([]);
    });
  });

  describe('docToPlainText', () => {
    it('returns empty string for null or empty document', () => {
      expect(docToPlainText(null)).toBe('');
      expect(docToPlainText(undefined)).toBe('');
      expect(docToPlainText({ type: 'doc', content: [] })).toBe('');
    });

    it('extracts text from headings, paragraphs, and includes pageLink label', () => {
      const doc: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Study Plan' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Read ' },
              { type: 'pageLink', attrs: { id: 'p1', label: 'Chapter 1' } },
              { type: 'text', text: ' before class.' },
            ],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'python' },
            content: [{ type: 'text', text: 'print("Hello world")' }],
          },
        ],
      };

      const plain = docToPlainText(doc);
      expect(plain).toBe(
        'Study Plan\nRead Chapter 1 before class.\nprint("Hello world")',
      );
    });

    it('extracts text from taskList and taskItems', () => {
      const doc: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Task 1 done' }],
                  },
                ],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Task 2 pending' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(docToPlainText(doc)).toBe('Task 1 done\nTask 2 pending');
    });
  });
});
