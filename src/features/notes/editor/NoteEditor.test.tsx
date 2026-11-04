import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteEditor } from './NoteEditor';
import type { JSONContent } from '@tiptap/react';

describe('NoteEditor', () => {
  it('renders initial TipTap content and calls onNavigatePage when page link is clicked', () => {
    const onNavigatePageMock = vi.fn();
    const initialContent: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Lecture Notes' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Reference to ' },
            { type: 'pageLink', attrs: { id: 'linked-target-123', label: 'Algebra' } },
          ],
        },
      ],
    };

    render(
      <NoteEditor
        initialContent={initialContent}
        onNavigatePage={onNavigatePageMock}
      />,
    );

    expect(screen.getByText('Lecture Notes')).toBeInTheDocument();
    const link = screen.getByText('Algebra');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('data-page-id', 'linked-target-123');

    fireEvent.click(link);
    expect(onNavigatePageMock).toHaveBeenCalledWith('linked-target-123');
  });
});
