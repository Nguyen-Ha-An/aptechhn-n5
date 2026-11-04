import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TodayPage } from './TodayPage';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
  };
});

// Mock Supabase to return empty arrays for queries
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-1',
                  display_name: 'Alex',
                  timezone: 'Asia/Ho_Chi_Minh',
                },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'todos') {
        return {
          select: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }
      if (table === 'focus_sessions') {
        return {
          select: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }
      if (table === 'notes') {
        return {
          select: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      };
    }),
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    user: { id: 'user-1', email: 'alex@example.com' },
    status: 'signed-in',
  }),
}));

function renderTodayPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TodayPage />
    </QueryClientProvider>,
  );
}

describe('Today page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders greeting in PageHeader and focal point primary button', async () => {
    renderTodayPage();

    // Check greeting
    const greeting = await screen.findByText(/Good (morning|afternoon|evening), (Alex|there)/i);
    expect(greeting).toBeInTheDocument();

    // Check primary CTA link
    const cta = screen.getByRole('link', { name: 'Start focus session' });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/focus');
  });

  it('renders empty states when queries return []', async () => {
    renderTodayPage();

    // Due today empty state
    expect(await screen.findByText('Nothing due today.')).toBeInTheDocument();
    expect(screen.getByText('You have no overdue or today tasks.')).toBeInTheDocument();

    // Focus today empty state
    expect(await screen.findByText('No focus time yet today.')).toBeInTheDocument();
    expect(screen.getByText('Start a timer session to build your study streak.')).toBeInTheDocument();

    // Recently edited pages empty state
    expect(await screen.findByText('No pages yet.')).toBeInTheDocument();
    expect(screen.getByText('Pages you edit will appear here for quick access.')).toBeInTheDocument();
  });
});
