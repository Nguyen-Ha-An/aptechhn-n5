import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatThread } from './ChatThread';
import { streamChat, ChatStreamError } from './streamChat';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('./streamChat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./streamChat')>();
  return {
    ...actual,
    streamChat: vi.fn(),
  };
});

describe('ChatThread', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [],
            error: null,
          }),
        }),
        is: () => ({
          order: async () => ({
            data: [],
            error: null,
          }),
        }),
      }),
    } as never);
  });

  function renderThread(conversationId = 'conv-123') {
    return render(
      <QueryClientProvider client={queryClient}>
        <ChatThread conversationId={conversationId} />
      </QueryClientProvider>,
    );
  }

  it('renders empty thread state with 3 prompt buttons that fill the composer', async () => {
    const user = userEvent.setup();
    renderThread();

    expect(
      await screen.findByText('Ask about your notes, plan your day, or get an explanation.'),
    ).toBeInTheDocument();

    const planBtn = screen.getByRole('button', {
      name: 'Make a study plan for today from my todos',
    });
    const summarizeBtn = screen.getByRole('button', {
      name: 'Summarize the pages I attach',
    });
    const quizBtn = screen.getByRole('button', {
      name: 'Quiz me on the attached page',
    });

    expect(planBtn).toBeInTheDocument();
    expect(summarizeBtn).toBeInTheDocument();
    expect(quizBtn).toBeInTheDocument();

    await user.click(planBtn);
    const textarea = screen.getByLabelText('Message');
    expect(textarea).toHaveValue('Make a study plan for today from my todos');
  });

  it('renders quota error inline under pending user message on 429 quota failure', async () => {
    const user = userEvent.setup();
    vi.mocked(streamChat).mockRejectedValueOnce(new ChatStreamError('quota', 'Quota exceeded'));

    renderThread();

    const textarea = await screen.findByLabelText('Message');
    await user.type(textarea, 'Help me study');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText("You have reached today's AI limit. It resets at midnight."),
    ).toBeInTheDocument();
  });

  it('retry does not duplicate the pending message on network/upstream error', async () => {
    const user = userEvent.setup();

    // First attempt fails with network error
    vi.mocked(streamChat)
      .mockRejectedValueOnce(new ChatStreamError('network', 'Failed to fetch'))
      .mockImplementationOnce(async ({ onDelta, onDone }) => {
        onDelta('Here is your explanation.');
        onDone?.('msg-resp-1');
        return 'Here is your explanation.';
      });

    renderThread();

    const textarea = await screen.findByLabelText('Message');
    await user.type(textarea, 'Unique Question 42');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // Failed notice appears with retry button
    expect(await screen.findByText('The reply failed.')).toBeInTheDocument();

    // Pending user message is displayed exactly once
    const pendingBeforeRetry = screen.getAllByText('Unique Question 42');
    expect(pendingBeforeRetry).toHaveLength(1);

    // Click retry
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryBtn);

    // Verify streamChat was called again with the exact same text
    expect(streamChat).toHaveBeenCalledTimes(2);
    expect(vi.mocked(streamChat).mock.calls[1]?.[0].message).toBe('Unique Question 42');

    // While in-flight or completed, the pending message is still NOT duplicated
    await waitFor(() => {
      const pendingAfterRetry = screen.queryAllByText('Unique Question 42');
      expect(pendingAfterRetry.length).toBeLessThanOrEqual(1);
    });
  });
});
