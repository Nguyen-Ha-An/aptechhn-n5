import type { JSONContent } from '@tiptap/react';

/**
 * Extracts all unique target page IDs linked within a TipTap JSON document.
 * TipTap document contract: page links are inline atom nodes `pageLink` with attrs `{ id, label }`.
 */
export function extractLinks(doc: JSONContent | null | undefined): string[] {
  if (!doc) return [];

  const linkIds = new Set<string>();

  function walk(node: JSONContent) {
    if (node.type === 'pageLink' && typeof node.attrs?.id === 'string' && node.attrs.id.trim()) {
      linkIds.add(node.attrs.id.trim());
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(doc);
  return Array.from(linkIds);
}

/**
 * Converts a TipTap JSON document to plain text for full-text search indexing.
 * TipTap document contract:
 * - Blocks joined by `\n`
 * - `pageLink` node contributes its label
 * - `hardBreak` contributes a newline
 */
export function docToPlainText(doc: JSONContent | null | undefined): string {
  if (!doc) return '';

  const blockLines: string[] = [];

  function getInlineText(node: JSONContent): string {
    if (typeof node.text === 'string') {
      return node.text;
    }
    if (node.type === 'pageLink') {
      return typeof node.attrs?.label === 'string' ? node.attrs.label : '';
    }
    if (node.type === 'hardBreak') {
      return '\n';
    }
    if (Array.isArray(node.content)) {
      return node.content.map(getInlineText).join('');
    }
    return '';
  }

  function walkBlocks(node: JSONContent) {
    if (!node) return;

    // Check if this node is a block that contains direct inline content
    const isLeafBlock =
      node.type === 'paragraph' ||
      node.type === 'heading' ||
      node.type === 'codeBlock' ||
      node.type === 'blockquote';

    if (isLeafBlock) {
      const line = getInlineText(node).trim();
      if (line) {
        blockLines.push(line);
      }
      return;
    }

    if (node.type === 'taskItem' || node.type === 'listItem') {
      // Could contain a paragraph or direct content
      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          walkBlocks(child);
        }
      } else {
        const line = getInlineText(node).trim();
        if (line) blockLines.push(line);
      }
      return;
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walkBlocks(child);
      }
    }
  }

  walkBlocks(doc);
  return blockLines.join('\n');
}
