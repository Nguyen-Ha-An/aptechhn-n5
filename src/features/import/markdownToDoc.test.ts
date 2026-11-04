import { describe, it, expect } from 'vitest';
import { markdownToDoc, parseInlines } from './markdownToDoc';

describe('markdownToDoc', () => {
  it('handles empty or whitespace strings', () => {
    const res1 = markdownToDoc('');
    expect(res1.doc).toEqual({ type: 'doc', content: [] });
    expect(res1.content_text).toBe('');

    const res2 = markdownToDoc('   \n\n  ');
    expect(res2.doc).toEqual({ type: 'doc', content: [] });
    expect(res2.content_text).toBe('');
  });

  it('converts headings #, ##, ### and maps deeper levels to 3', () => {
    const md = [
      '# Level 1',
      '## Level 2',
      '### Level 3',
      '#### Level 4 becomes 3',
      '###### Level 6 becomes 3',
    ].join('\n\n');

    const { doc, content_text } = markdownToDoc(md);
    expect(doc.content).toHaveLength(5);
    expect(doc.content[0]).toMatchObject({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Level 1' }],
    });
    expect(doc.content[1]).toMatchObject({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Level 2' }],
    });
    expect(doc.content[2]).toMatchObject({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Level 3' }],
    });
    expect(doc.content[3]).toMatchObject({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Level 4 becomes 3' }],
    });
    expect(doc.content[4]).toMatchObject({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Level 6 becomes 3' }],
    });

    expect(content_text).toBe(
      'Level 1\nLevel 2\nLevel 3\nLevel 4 becomes 3\nLevel 6 becomes 3',
    );
  });

  it('converts bullet lists and ordered lists', () => {
    const md = [
      '- First bullet',
      '- Second bullet',
      '',
      '1. First numbered',
      '2. Second numbered',
    ].join('\n');

    const { doc, content_text } = markdownToDoc(md);
    expect(doc.content).toHaveLength(2);
    expect(doc.content[0]?.type).toBe('bulletList');
    expect(doc.content[0]?.content).toHaveLength(2);
    expect(doc.content[1]?.type).toBe('orderedList');
    expect(doc.content[1]?.content).toHaveLength(2);

    expect(content_text).toBe(
      'First bullet\nSecond bullet\nFirst numbered\nSecond numbered',
    );
  });

  it('converts task lists with checked and unchecked items', () => {
    const md = ['- [ ] Pending task', '- [x] Completed task', '- [X] Also completed'].join(
      '\n',
    );

    const { doc, content_text } = markdownToDoc(md);
    expect(doc.content).toHaveLength(1);
    const taskList = doc.content[0]!;
    expect(taskList.type).toBe('taskList');
    expect(taskList.content).toHaveLength(3);

    expect(taskList.content?.[0]).toMatchObject({
      type: 'taskItem',
      attrs: { checked: false },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pending task' }] }],
    });
    expect(taskList.content?.[1]).toMatchObject({
      type: 'taskItem',
      attrs: { checked: true },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Completed task' }] }],
    });
    expect(taskList.content?.[2]).toMatchObject({
      type: 'taskItem',
      attrs: { checked: true },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Also completed' }] }],
    });

    expect(content_text).toBe('Pending task\nCompleted task\nAlso completed');
  });

  it('converts fenced code blocks, blockquotes, and horizontal rules', () => {
    const md = [
      '```ts',
      'const x = 42;',
      'console.log(x);',
      '```',
      '',
      '---',
      '',
      '> This is a quote',
      '> spanning multiple lines',
    ].join('\n');

    const { doc, content_text } = markdownToDoc(md);
    expect(doc.content).toHaveLength(3);

    expect(doc.content[0]).toMatchObject({
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const x = 42;\nconsole.log(x);' }],
    });

    expect(doc.content[1]).toEqual({
      type: 'horizontalRule',
    });

    expect(doc.content[2]).toMatchObject({
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This is a quote\nspanning multiple lines' }],
        },
      ],
    });

    expect(content_text).toContain('const x = 42;');
    expect(content_text).toContain('This is a quote');
  });

  it('parses inline bold, italic, code, and strike', () => {
    const inlines = parseInlines('A **bold** word, *italic*, and `code` with ~~strike~~');
    expect(inlines).toEqual([
      { type: 'text', text: 'A ' },
      { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' word, ' },
      { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      { type: 'text', text: ', and ' },
      { type: 'text', text: 'code', marks: [{ type: 'code' }] },
      { type: 'text', text: ' with ' },
      { type: 'text', text: 'strike', marks: [{ type: 'strike' }] },
    ]);
  });

  it('resolves [[Title]] to pageLink node with id and label, or leaves as literal text', () => {
    const linkResolver = (title: string) => {
      if (title.toLowerCase() === 'math 101') {
        return { id: 'note-uuid-math', label: 'Math 101' };
      }
      return null;
    };

    const md = 'See [[Math 101]] and missing [[Physics 202]].';
    const { doc, content_text } = markdownToDoc(md, { resolveLink: linkResolver });

    expect(doc.content).toHaveLength(1);
    const para = doc.content[0]!;
    expect(para.type).toBe('paragraph');
    expect(para.content).toEqual([
      { type: 'text', text: 'See ' },
      {
        type: 'pageLink',
        attrs: { id: 'note-uuid-math', label: 'Math 101' },
      },
      { type: 'text', text: ' and missing [[Physics 202]].' },
    ]);

    expect(content_text).toBe('See Math 101 and missing [[Physics 202]].');
  });
});
