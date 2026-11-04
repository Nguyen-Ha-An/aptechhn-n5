import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatComposer } from './ChatComposer';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

describe('ChatComposer', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        is: () => ({
          order: async () => ({
            data: [
              { id: 'note-1', title: 'Math Formulas', icon: '📐' },
              { id: 'note-2', title: 'History Outline', icon: '📜' },
            ],
            error: null,
          }),
        }),
      }),
    } as never);
  });

  function renderComposer(props: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
    return render(
      <QueryClientProvider client={queryClient}>
        <ChatComposer onSend={vi.fn()} {...props} />
      </QueryClientProvider>,
    );
  }

  it('Enter sends the message', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderComposer({ onSend });

    const textarea = screen.getByLabelText('Message');
    await user.type(textarea, 'Explain quantum mechanics');
    await user.keyboard('{Enter}');

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('Explain quantum mechanics', [], false);
    expect(textarea).toHaveValue('');
  });

  it('Shift+Enter inserts a newline and does not send', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderComposer({ onSend });

    const textarea = screen.getByLabelText('Message');
    await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(onSend).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('Line 1\nLine 2');
  });

  it('disables Send button when text is empty', () => {
    renderComposer();
    const sendBtn = screen.getByRole('button', { name: 'Send' });
    expect(sendBtn).toBeDisabled();
  });

  it('shows Stop button while streaming and calls onStop', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    renderComposer({ isStreaming: true, onStop });

    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    const stopBtn = screen.getByRole('button', { name: 'Stop' });
    expect(stopBtn).toBeInTheDocument();

    await user.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('attaches pages, displays removable chips, and includes note ids on send', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderComposer({ onSend });

    const attachBtn = screen.getByRole('button', { name: /Attach pages/i });
    await user.click(attachBtn);

    const mathCheckbox = await screen.findByRole('checkbox', { name: /Math Formulas/i });
    await user.click(mathCheckbox);

    // Chip should appear with remove button
    expect(screen.getByRole('button', { name: 'Remove page Math Formulas' })).toBeInTheDocument();

    // Type message and send
    const textarea = screen.getByLabelText('Message');
    await user.type(textarea, 'Summarize this');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('Summarize this', ['note-1'], false);
  });

  it('removes attached note chip when remove button is clicked', async () => {
    const user = userEvent.setup();
    renderComposer();

    const attachBtn = screen.getByRole('button', { name: /Attach pages/i });
    await user.click(attachBtn);

    const mathCheckbox = await screen.findByRole('checkbox', { name: /Math Formulas/i });
    await user.click(mathCheckbox);

    const removeBtn = screen.getByRole('button', { name: 'Remove page Math Formulas' });
    await user.click(removeBtn);

    expect(screen.queryByText('Math Formulas')).not.toBeInTheDocument();
  });

  it('toggles Include today plan switch and includes boolean on send', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderComposer({ onSend });

    const toggle = screen.getByRole('switch', { name: /Include today's plan/i });
    expect(toggle).not.toBeChecked();

    await user.click(toggle);
    expect(toggle).toBeChecked();

    const textarea = screen.getByLabelText('Message');
    await user.type(textarea, 'What should I do?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('What should I do?', [], true);
  });
});
