import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FocusPage } from './FocusPage';
import { FocusProvider, useFocus } from './useFocusSession';
import { LiveSessionRow } from './LiveSessionRow';

// Mock Supabase
const mockUpsertSession = vi.fn().mockResolvedValue({ error: null });
const mockUpsertDistractions = vi.fn().mockResolvedValue({ error: null });
const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'todos') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'todo-1', title: 'Study Calculus' },
              { id: 'todo-2', title: 'Write Chemistry Lab Report' },
            ],
            error: null,
          }),
        };
      }
      if (table === 'focus_sessions') {
        return {
          upsert: mockUpsertSession,
        };
      }
      if (table === 'distractions') {
        return {
          upsert: mockUpsertDistractions,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    user: { id: 'user-student-1', email: 'student@example.com' },
    status: 'signed-in',
  }),
}));

vi.mock('@/features/profile/queries', () => ({
  useProfile: () => ({
    data: {
      focus_minutes: 25,
      short_break_minutes: 5,
      long_break_minutes: 15,
      cycles_before_long_break: 4,
      auto_start_breaks: false,
      notifications: true,
    },
  }),
}));

// Mock Link from @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children?: React.ReactNode;
    to?: string;
    [key: string]: unknown;
  }) => (
    <a href={to} {...(props as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

describe('Focus Feature Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  function renderFocusPage(initialTodoId?: string) {
    return render(
      <QueryClientProvider client={queryClient}>
        <FocusProvider>
          <FocusPage initialTodoId={initialTodoId} />
        </FocusProvider>
      </QueryClientProvider>
    );
  }

  it('renders idle form with accessible controls and loads open todos', async () => {
    renderFocusPage();

    // Check mode selector
    const timedBtn = screen.getByRole('radio', { name: 'Timed' });
    const openBtn = screen.getByRole('radio', { name: 'Open' });
    expect(timedBtn).toBeInTheDocument();
    expect(openBtn).toBeInTheDocument();
    expect(timedBtn).toHaveAttribute('aria-checked', 'true');

    // Check minutes input
    const minutesInput = screen.getByLabelText('Minutes');
    expect(minutesInput).toHaveValue(25);

    // Check open todos dropdown
    await waitFor(() => {
      expect(screen.getByText('Study Calculus')).toBeInTheDocument();
      expect(screen.getByText('Write Chemistry Lab Report')).toBeInTheDocument();
    });

    // Check primary start button
    const startBtn = screen.getByRole('button', { name: 'Start focus session' });
    expect(startBtn).toBeInTheDocument();
  });

  it('preselects todo from initialTodoId', async () => {
    renderFocusPage('todo-2');

    await waitFor(() => {
      const select = screen.getByLabelText('Working on') as HTMLSelectElement;
      expect(select.value).toBe('todo-2');
    });
  });

  it('validates minutes on blur with inline error', async () => {
    renderFocusPage();

    const minutesInput = screen.getByLabelText('Minutes');
    fireEvent.change(minutesInput, { target: { value: '2' } });
    fireEvent.blur(minutesInput);

    expect(
      screen.getByText('Focus minutes must be between 5 and 180.')
    ).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: 'Start focus session' });
    expect(startBtn).toBeDisabled();

    // Fix error
    fireEvent.change(minutesInput, { target: { value: '45' } });
    fireEvent.blur(minutesInput);

    expect(
      screen.queryByText('Focus minutes must be between 5 and 180.')
    ).not.toBeInTheDocument();
    expect(startBtn).not.toBeDisabled();
  });

  it('starts session, shows timer digits and controls, allows pause and resume', async () => {
    const user = userEvent.setup();
    renderFocusPage('todo-1');

    await waitFor(() => {
      expect(screen.getByText('Study Calculus')).toBeInTheDocument();
    });

    const startBtn = screen.getByRole('button', { name: 'Start focus session' });
    await user.click(startBtn);

    // Now in running state
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Focusing')).toBeInTheDocument();
    expect(screen.getByText('Study Calculus')).toBeInTheDocument();

    // Pause via button
    const pauseBtn = screen.getByRole('button', { name: 'Pause session (Space)' });
    await user.click(pauseBtn);

    expect(screen.getByText('Paused')).toBeInTheDocument();
    const resumeBtn = screen.getByRole('button', { name: 'Resume session (Space)' });
    expect(resumeBtn).toBeInTheDocument();

    // Resume via button
    await user.click(resumeBtn);
    expect(screen.getByText('Focusing')).toBeInTheDocument();
  });

  it('shortcuts Space and Z operate correctly when not typing', async () => {
    const user = userEvent.setup();
    renderFocusPage();

    // Start session
    const startBtn = screen.getByRole('button', { name: 'Start focus session' });
    await user.click(startBtn);

    expect(screen.getByText('Focusing')).toBeInTheDocument();

    // Press Space on window -> pauses
    fireEvent.keyDown(window, { code: 'Space' });
    expect(screen.getByText('Paused')).toBeInTheDocument();

    // Press Space again -> resumes
    fireEvent.keyDown(window, { code: 'Space' });
    expect(screen.getByText('Focusing')).toBeInTheDocument();

    // Press Z -> enters Zen mode
    fireEvent.keyDown(window, { key: 'z' });
    expect(screen.getAllByLabelText('Exit Zen mode (Esc)').length).toBeGreaterThanOrEqual(1);

    // Press Esc -> exits Zen mode
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByLabelText('Exit Zen mode (Esc)')).not.toBeInTheDocument();
  });

  it('shortcuts do not fire when modifier keys (meta, ctrl, alt) are held', async () => {
    const user = userEvent.setup();
    renderFocusPage();

    await user.click(screen.getByRole('button', { name: 'Start focus session' }));
    expect(screen.getByText('Focusing')).toBeInTheDocument();

    // Cmd+Z should NOT enter Zen mode
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(screen.queryByLabelText('Exit Zen mode (Esc)')).not.toBeInTheDocument();

    // Ctrl+Space should NOT pause
    fireEvent.keyDown(window, { code: 'Space', ctrlKey: true });
    expect(screen.getByText('Focusing')).toBeInTheDocument();

    // Alt+D should NOT open distraction popover
    fireEvent.keyDown(window, { key: 'd', altKey: true });
    expect(screen.queryByText('Note what pulled your attention away.')).not.toBeInTheDocument();
  });

  it('shortcuts do not fire while typing in reflection or inputs', async () => {
    const user = userEvent.setup();

    // Render a helper that exposes endFocus to transition quickly to finished
    function TestComponent() {
      const { startSession, endFocus } = useFocus();
      return (
        <div>
          <button
            onClick={() =>
              startSession({ mode: 'timed', plannedMinutes: 25 })
            }
          >
            Trigger Start
          </button>
          <button onClick={() => endFocus()}>Trigger End</button>
          <FocusPage />
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <FocusProvider>
          <TestComponent />
        </FocusProvider>
      </QueryClientProvider>
    );

    // Start session then end session
    await user.click(screen.getByText('Trigger Start'));
    await user.click(screen.getByText('Trigger End'));

    // Should now be in finished state
    expect(screen.getByText('Session complete')).toBeInTheDocument();

    const reflectionInput = screen.getByLabelText('Reflection (optional)');
    await user.click(reflectionInput);

    // Type text with spaces, 'z', 'd' into the textarea
    await user.type(reflectionInput, 'Deep focus zone today');

    // Reflection value must hold the typed text
    expect(reflectionInput).toHaveValue('Deep focus zone today');

    // Zen mode should NOT have been activated by the letter 'z'
    expect(screen.queryByLabelText('Exit Zen mode (Esc)')).not.toBeInTheDocument();
  });

  it('allows logging distractions during session', async () => {
    const user = userEvent.setup();
    renderFocusPage();

    await user.click(screen.getByRole('button', { name: 'Start focus session' }));

    // Open distraction popover
    const distBtn = screen.getByRole('button', { name: 'Log distraction (D)' });
    await user.click(distBtn);

    // Check category buttons
    expect(screen.getByRole('button', { name: 'Phone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Noise' })).toBeInTheDocument();

    // Click Noise
    await user.click(screen.getByRole('button', { name: 'Noise' }));

    // Add note
    const noteField = screen.getByLabelText('Note (optional)');
    await user.type(noteField, 'Street traffic');

    // Click Log
    await user.click(screen.getByRole('button', { name: 'Log' }));

    // Verify distraction counter in UI
    expect(screen.getByText('1 distraction logged')).toBeInTheDocument();
  });

  it('saves session with rating and reflection to Supabase and resets', async () => {
    const user = userEvent.setup();

    function TestComponent() {
      const { startSession, endFocus } = useFocus();
      return (
        <div>
          <button
            onClick={() =>
              startSession({ mode: 'timed', plannedMinutes: 25, todoId: 'todo-1' })
            }
          >
            Trigger Start
          </button>
          <button onClick={() => endFocus()}>Trigger End</button>
          <FocusPage />
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <FocusProvider>
          <TestComponent />
        </FocusProvider>
      </QueryClientProvider>
    );

    await user.click(screen.getByText('Trigger Start'));
    await user.click(screen.getByText('Trigger End'));

    // Select rating 5
    const rating5 = screen.getByRole('radio', { name: 'Rating 5 of 5' });
    await user.click(rating5);
    expect(rating5).toHaveAttribute('aria-checked', 'true');

    // Type reflection
    const reflectionField = screen.getByLabelText('Reflection (optional)');
    await user.type(reflectionField, 'Completed calculus problems smoothly.');

    // Click Save session
    const saveBtn = screen.getByRole('button', { name: 'Save session' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockUpsertSession).toHaveBeenCalledTimes(1);
    });

    const calledArg = mockUpsertSession.mock.calls[0]?.[0];
    expect(calledArg?.todo_id).toBe('todo-1');
    expect(calledArg?.mode).toBe('timed');
    expect(calledArg?.focus_rating).toBe(5);
    expect(calledArg?.reflection).toBe('Completed calculus problems smoothly.');

    // State returns to idle
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start focus session' })).toBeInTheDocument();
    });

    // Start another session and end it to verify rating and reflection were reset
    await user.click(screen.getByText('Trigger Start'));
    await user.click(screen.getByText('Trigger End'));

    const rating5AfterReset = screen.getByRole('radio', { name: 'Rating 5 of 5' });
    expect(rating5AfterReset).toHaveAttribute('aria-checked', 'false');
    const reflectionAfterReset = screen.getByLabelText('Reflection (optional)');
    expect(reflectionAfterReset).toHaveValue('');
  });

  it('discarding session resets machine state and clears rating and reflection', async () => {
    const user = userEvent.setup();

    function TestComponent() {
      const { startSession, endFocus } = useFocus();
      return (
        <div>
          <button onClick={() => startSession({ mode: 'timed', plannedMinutes: 25 })}>
            Trigger Start
          </button>
          <button onClick={() => endFocus()}>Trigger End</button>
          <FocusPage />
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <FocusProvider>
          <TestComponent />
        </FocusProvider>
      </QueryClientProvider>
    );

    await user.click(screen.getByText('Trigger Start'));
    await user.click(screen.getByText('Trigger End'));

    // Set rating and reflection
    await user.click(screen.getByRole('radio', { name: 'Rating 3 of 5' }));
    await user.type(screen.getByLabelText('Reflection (optional)'), 'Distracted by noise');

    // Click Discard
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    // Confirm discard
    const confirmDiscardBtn = screen.getByRole('button', { name: 'Discard' });
    await user.click(confirmDiscardBtn);

    // Returns to idle
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start focus session' })).toBeInTheDocument();
    });

    // Start and end another session: fields should be clean
    await user.click(screen.getByText('Trigger Start'));
    await user.click(screen.getByText('Trigger End'));

    expect(screen.getByRole('radio', { name: 'Rating 3 of 5' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('Reflection (optional)')).toHaveValue('');
  });

  it('displays error and retry button when open todos fail to load', async () => {
    const mockRefetch = vi.fn();
    // Temporarily spy on useOpenTodos to return error
    const queries = await import('./queries');
    const spy = vi.spyOn(queries, 'useOpenTodos').mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof queries.useOpenTodos>);

    const user = userEvent.setup();
    renderFocusPage();

    expect(screen.getByText('Failed to load open todos.')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    expect(retryBtn).toBeInTheDocument();

    await user.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('renders LiveSessionRow when active and hides when idle', async () => {
    const user = userEvent.setup();

    function CombinedTest() {
      return (
        <div>
          <LiveSessionRow />
          <FocusPage />
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <FocusProvider>
          <CombinedTest />
        </FocusProvider>
      </QueryClientProvider>
    );

    // When idle, LiveSessionRow is null
    expect(screen.queryByLabelText(/Active focus session:/)).not.toBeInTheDocument();

    // Start session
    await user.click(screen.getByRole('button', { name: 'Start focus session' }));

    // Now LiveSessionRow renders
    const liveRow = screen.getByLabelText(/Active focus session: Focusing/);
    expect(liveRow).toBeInTheDocument();
    expect(liveRow).toHaveAttribute('href', '/focus');
  });
});
