import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SearchNotesDialog } from './SearchNotesDialog';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

describe('SearchNotesDialog', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('prompts user to type at least 2 characters, then displays debounced search results', async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'note-calc',
          title: 'Calculus Notes',
          icon: '📐',
          content_text: 'Derivatives and integrals',
        },
      ],
      error: null,
    });

    const textSearchMock = vi.fn().mockReturnValue({ limit: limitMock });
    const isMock = vi.fn().mockReturnValue({ textSearch: textSearchMock });
    const selectMock = vi.fn().mockReturnValue({ is: isMock });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
    } as never);

    const onSelectMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <SearchNotesDialog
          open={true}
          onOpenChange={onOpenChangeMock}
          onSelectNote={onSelectMock}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Type at least 2 characters to search.')).toBeInTheDocument();

    const input = screen.getByRole('searchbox', { name: 'Search pages' });

    // Type "calc"
    fireEvent.change(input, { target: { value: 'calc' } });

    // Wait for debounced search result
    expect(await screen.findByText('Calculus Notes', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('Derivatives and integrals')).toBeInTheDocument();

    // Click result
    fireEvent.click(screen.getByText('Calculus Notes'));

    expect(onSelectMock).toHaveBeenCalledWith('note-calc');
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
