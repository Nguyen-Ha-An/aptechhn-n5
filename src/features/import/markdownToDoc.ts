/**
 * TipTap document contract converter for legacy markdown notes.
 * Converts markdown into TipTap JSON using StarterKit node names:
 * - doc, paragraph, heading (levels 1-3)
 * - bulletList, orderedList, listItem
 * - taskList, taskItem (attrs.checked)
 * - blockquote, codeBlock (attrs.language)
 * - horizontalRule
 * - inline marks: bold, italic, code, strike
 * - inline atom node: pageLink { id, label }
 *
 * Also computes content_text: plain text of the doc with blocks joined by \n
 * and pageLink contributing its label.
 */

export interface LinkResolverResult {
  id: string;
  label: string;
}

export type LinkResolver = (
  title: string,
) => LinkResolverResult | null | undefined;

export interface MarkdownToDocOptions {
  resolveLink?: LinkResolver;
}

export interface TipTapMark {
  type: 'bold' | 'italic' | 'code' | 'strike';
}

export interface TipTapInlineNode {
  type: 'text' | 'pageLink' | 'hardBreak';
  text?: string;
  marks?: TipTapMark[];
  attrs?: Record<string, unknown>;
}

export interface TipTapBlockNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: (TipTapBlockNode | TipTapInlineNode)[];
}

export interface TipTapDoc {
  type: 'doc';
  content: TipTapBlockNode[];
}

export interface MarkdownToDocResult {
  doc: TipTapDoc;
  content_text: string;
}

function normalizeMarks(marks?: TipTapMark[]): TipTapMark[] | undefined {
  if (!marks || marks.length === 0) return undefined;
  // Unique by type
  const seen = new Set<string>();
  const unique: TipTapMark[] = [];
  for (const m of marks) {
    if (!seen.has(m.type)) {
      seen.add(m.type);
      unique.push(m);
    }
  }
  return unique.length > 0 ? unique : undefined;
}

export function parseInlines(
  text: string,
  options?: MarkdownToDocOptions,
  currentMarks: TipTapMark[] = [],
): TipTapInlineNode[] {
  if (!text) return [];

  const nodes: TipTapInlineNode[] = [];
  let i = 0;

  while (i < text.length) {
    // 1. Check for page link: [[Title]]
    if (text.startsWith('[[', i)) {
      const closeIdx = text.indexOf(']]', i + 2);
      if (closeIdx !== -1) {
        const rawTitle = text.slice(i + 2, closeIdx).trim();
        const resolved = options?.resolveLink?.(rawTitle);
        if (resolved) {
          nodes.push({
            type: 'pageLink',
            attrs: {
              id: resolved.id,
              label: resolved.label || rawTitle,
            },
          });
        } else {
          // Unresolved stays as literal text
          nodes.push({
            type: 'text',
            text: `[[${rawTitle}]]`,
            marks: normalizeMarks(currentMarks),
          });
        }
        i = closeIdx + 2;
        continue;
      }
    }

    // 2. Inline code: `code`
    if (text[i] === '`') {
      const closeIdx = text.indexOf('`', i + 1);
      if (closeIdx !== -1) {
        const codeText = text.slice(i + 1, closeIdx);
        nodes.push({
          type: 'text',
          text: codeText,
          marks: normalizeMarks([...currentMarks, { type: 'code' }]),
        });
        i = closeIdx + 1;
        continue;
      }
    }

    // 3. Strikethrough: ~~text~~
    if (text.startsWith('~~', i)) {
      const closeIdx = text.indexOf('~~', i + 2);
      if (closeIdx !== -1) {
        const innerText = text.slice(i + 2, closeIdx);
        const childNodes = parseInlines(innerText, options, [
          ...currentMarks,
          { type: 'strike' },
        ]);
        nodes.push(...childNodes);
        i = closeIdx + 2;
        continue;
      }
    }

    // 4. Bold + Italic: ***text***
    if (text.startsWith('***', i)) {
      const closeIdx = text.indexOf('***', i + 3);
      if (closeIdx !== -1) {
        const innerText = text.slice(i + 3, closeIdx);
        const childNodes = parseInlines(innerText, options, [
          ...currentMarks,
          { type: 'bold' },
          { type: 'italic' },
        ]);
        nodes.push(...childNodes);
        i = closeIdx + 3;
        continue;
      }
    }

    // 5. Bold: **text** or __text__
    if (text.startsWith('**', i)) {
      const closeIdx = text.indexOf('**', i + 2);
      if (closeIdx !== -1) {
        const innerText = text.slice(i + 2, closeIdx);
        const childNodes = parseInlines(innerText, options, [
          ...currentMarks,
          { type: 'bold' },
        ]);
        nodes.push(...childNodes);
        i = closeIdx + 2;
        continue;
      }
    }

    if (text.startsWith('__', i)) {
      const closeIdx = text.indexOf('__', i + 2);
      if (closeIdx !== -1) {
        const innerText = text.slice(i + 2, closeIdx);
        const childNodes = parseInlines(innerText, options, [
          ...currentMarks,
          { type: 'bold' },
        ]);
        nodes.push(...childNodes);
        i = closeIdx + 2;
        continue;
      }
    }

    // 6. Italic: *text* or _text_
    if (text[i] === '*' && text[i + 1] !== '*') {
      const closeIdx = text.indexOf('*', i + 1);
      if (closeIdx !== -1 && text[closeIdx - 1] !== '\\') {
        const innerText = text.slice(i + 1, closeIdx);
        const childNodes = parseInlines(innerText, options, [
          ...currentMarks,
          { type: 'italic' },
        ]);
        nodes.push(...childNodes);
        i = closeIdx + 1;
        continue;
      }
    }

    if (text[i] === '_' && text[i + 1] !== '_') {
      const closeIdx = text.indexOf('_', i + 1);
      if (closeIdx !== -1 && text[closeIdx - 1] !== '\\') {
        const innerText = text.slice(i + 1, closeIdx);
        const childNodes = parseInlines(innerText, options, [
          ...currentMarks,
          { type: 'italic' },
        ]);
        nodes.push(...childNodes);
        i = closeIdx + 1;
        continue;
      }
    }

    // Plain text chunk: find index of next special token
    let nextSpecial = text.length;
    for (let j = i + 1; j < text.length; j++) {
      const ch = text[j];
      if (
        ch === '`' ||
        ch === '*' ||
        ch === '_' ||
        (ch === '[' && text[j + 1] === '[') ||
        (ch === '~' && text[j + 1] === '~')
      ) {
        nextSpecial = j;
        break;
      }
    }

    const chunk = text.slice(i, nextSpecial);
    if (chunk) {
      nodes.push({
        type: 'text',
        text: chunk,
        marks: normalizeMarks(currentMarks),
      });
    }
    i = nextSpecial;
  }

  // Merge adjacent text nodes with identical marks
  const merged: TipTapInlineNode[] = [];
  for (const node of nodes) {
    if (merged.length > 0) {
      const prev = merged[merged.length - 1]!;
      if (
        prev.type === 'text' &&
        node.type === 'text' &&
        marksEqual(prev.marks, node.marks)
      ) {
        prev.text = (prev.text || '') + (node.text || '');
        continue;
      }
    }
    merged.push(node);
  }

  return merged;
}

function marksEqual(a?: TipTapMark[], b?: TipTapMark[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const aTypes = a.map((m) => m.type).sort();
  const bTypes = b.map((m) => m.type).sort();
  return aTypes.every((t, idx) => t === bTypes[idx]);
}

/**
 * Extracts plain text from a block or inline node.
 */
function extractNodeText(node: TipTapBlockNode | TipTapInlineNode): string {
  if (node.type === 'text' && 'text' in node) {
    return node.text || '';
  }
  if (node.type === 'pageLink' && 'attrs' in node) {
    return (node.attrs?.label as string) || '';
  }
  if (node.type === 'hardBreak') {
    return '\n';
  }
  if ('content' in node && Array.isArray(node.content)) {
    return node.content.map(extractNodeText).join('');
  }
  return '';
}

/**
 * Extracts the full content_text from a TipTap document.
 * Blocks joined by \n, and pageLink contributes its label.
 */
export function extractContentText(doc: TipTapDoc): string {
  const blockTexts: string[] = [];
  for (const block of doc.content) {
    if (block.type === 'bulletList' || block.type === 'orderedList') {
      const items = (block.content || []).map((item) => extractNodeText(item));
      blockTexts.push(items.join('\n'));
    } else if (block.type === 'taskList') {
      const items = (block.content || []).map((item) => extractNodeText(item));
      blockTexts.push(items.join('\n'));
    } else {
      blockTexts.push(extractNodeText(block));
    }
  }
  return blockTexts.join('\n');
}

export function markdownToDoc(
  markdown: string,
  options?: MarkdownToDocOptions,
): MarkdownToDocResult {
  if (!markdown || !markdown.trim()) {
    const emptyDoc: TipTapDoc = { type: 'doc', content: [] };
    return { doc: emptyDoc, content_text: '' };
  }

  const rawLines = markdown.split(/\r?\n/);
  const blocks: TipTapBlockNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i] ?? '';

    // Empty line: skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 1. Fenced code block
    const codeFenceMatch = line.match(/^```(\w*)/);
    if (codeFenceMatch) {
      const lang = codeFenceMatch[1] ? codeFenceMatch[1].trim() : null;
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !(rawLines[i] ?? '').startsWith('```')) {
        codeLines.push(rawLines[i] ?? '');
        i++;
      }
      if (i < rawLines.length) {
        i++; // skip closing ```
      }
      blocks.push({
        type: 'codeBlock',
        attrs: { language: lang || null },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      });
      continue;
    }

    // 2. Horizontal rule: ---, ***, ___
    if (/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // 3. Headings: #, ##, ###, ####...
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const rawLevel = headingMatch[1]!.length;
      const level = Math.min(Math.max(rawLevel, 1), 3);
      const headingText = headingMatch[2]!.trim();
      blocks.push({
        type: 'heading',
        attrs: { level },
        content: parseInlines(headingText, options),
      });
      i++;
      continue;
    }

    // 4. Blockquote: > text
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && (rawLines[i] ?? '').startsWith('>')) {
        const quoteText = (rawLines[i] ?? '').replace(/^>\s?/, '');
        quoteLines.push(quoteText);
        i++;
      }
      // Group lines separated by blank lines into paragraphs
      const paragraphs: TipTapBlockNode[] = [];
      let currentParaLines: string[] = [];
      for (const qLine of quoteLines) {
        if (qLine.trim() === '') {
          if (currentParaLines.length > 0) {
            paragraphs.push({
              type: 'paragraph',
              content: parseInlines(currentParaLines.join('\n'), options),
            });
            currentParaLines = [];
          }
        } else {
          currentParaLines.push(qLine);
        }
      }
      if (currentParaLines.length > 0) {
        paragraphs.push({
          type: 'paragraph',
          content: parseInlines(currentParaLines.join('\n'), options),
        });
      }
      blocks.push({
        type: 'blockquote',
        content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph', content: [] }],
      });
      continue;
    }

    // 5. Task list item: - [ ] or - [x] or * [ ] or * [x]
    const taskMatch = line.match(/^[-*+]\s+\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const taskItems: TipTapBlockNode[] = [];
      while (i < rawLines.length) {
        const currentLine = rawLines[i] ?? '';
        const currentMatch = currentLine.match(/^[-*+]\s+\[([ xX])\]\s*(.*)$/);
        if (!currentMatch) break;
        const checked = currentMatch[1]!.toLowerCase() === 'x';
        const itemText = currentMatch[2] ?? '';
        taskItems.push({
          type: 'taskItem',
          attrs: { checked },
          content: [
            {
              type: 'paragraph',
              content: parseInlines(itemText, options),
            },
          ],
        });
        i++;
      }
      blocks.push({
        type: 'taskList',
        content: taskItems,
      });
      continue;
    }

    // 6. Bullet list item: - item or * item or + item (not a task)
    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const listItems: TipTapBlockNode[] = [];
      while (i < rawLines.length) {
        const currentLine = rawLines[i] ?? '';
        // If it's a task item, don't treat as plain bullet
        if (/^[-*+]\s+\[[ xX]\]/.test(currentLine)) break;
        const currentMatch = currentLine.match(/^[-*+]\s+(.*)$/);
        if (!currentMatch) break;
        const itemText = currentMatch[1] ?? '';
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlines(itemText, options),
            },
          ],
        });
        i++;
      }
      blocks.push({
        type: 'bulletList',
        content: listItems,
      });
      continue;
    }

    // 7. Ordered list item: 1. item
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      const listItems: TipTapBlockNode[] = [];
      while (i < rawLines.length) {
        const currentLine = rawLines[i] ?? '';
        const currentMatch = currentLine.match(/^\d+\.\s+(.*)$/);
        if (!currentMatch) break;
        const itemText = currentMatch[1] ?? '';
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlines(itemText, options),
            },
          ],
        });
        i++;
      }
      blocks.push({
        type: 'orderedList',
        content: listItems,
      });
      continue;
    }

    // 8. Paragraph: regular line(s)
    const paraLines: string[] = [];
    while (
      i < rawLines.length &&
      (rawLines[i] ?? '').trim() !== '' &&
      !/^(?:```|#{1,6}\s|>|[-*+]\s|\d+\.\s|-{3,}|\*{3,}|_{3,})/.test(
        rawLines[i] ?? '',
      )
    ) {
      paraLines.push(rawLines[i] ?? '');
      i++;
    }
    const paraText = paraLines.join('\n');
    blocks.push({
      type: 'paragraph',
      content: parseInlines(paraText, options),
    });
  }

  const doc: TipTapDoc = { type: 'doc', content: blocks };
  const content_text = extractContentText(doc);
  return { doc, content_text };
}
