import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportBanner } from './ImportBanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/features/profile/queries';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    user: { id: 'test-user-123' },
    status: 'signed-in',
  }),
}));

let mockProfile: Partial<Profile> | null = null;
vi.mock('@/features/profile/queries', () => ({
  useProfile: () => ({
    data: mockProfile,
    isLoading: false,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children?: React.ReactNode;
    to: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('ImportBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockProfile = {
      id: 'test-user-123',
      legacy_imported_at: null,
    };
  });

  it('renders banner when legacy_imported_at is null and todos=0 and notes=0', async () => {
    vi.mocked(supabase.from).mockImplementation((tableName: string) => {
      if (tableName === 'todos' || tableName === 'notes') {
        return {
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    renderWithClient(<ImportBanner />);

    expect(
      await screen.findByRole('region', { name: 'Legacy data import' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Used FocusLearn before?')).toBeInTheDocument();
    expect(screen.getByText('Import your old data.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss import notice' })).toBeInTheDocument();
  });

  it('dismisses banner and stores flag in localStorage when clicking Dismiss', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.from).mockImplementation((tableName: string) => {
      if (tableName === 'todos' || tableName === 'notes') {
        return {
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    renderWithClient(<ImportBanner />);

    const dismissBtn = await screen.findByRole('button', { name: 'Dismiss import notice' });
    await user.click(dismissBtn);

    expect(localStorage.getItem('fl:import-banner-dismissed')).toBe('true');
    expect(screen.queryByRole('region', { name: 'Legacy data import' })).not.toBeInTheDocument();
  });

  it('does not render if already dismissed in localStorage', () => {
    localStorage.setItem('fl:import-banner-dismissed', 'true');
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({ count: 0, error: null }),
    } as unknown as ReturnType<typeof supabase.from>));

    renderWithClient(<ImportBanner />);
    expect(screen.queryByRole('region', { name: 'Legacy data import' })).not.toBeInTheDocument();
  });

  it('does not render if legacy_imported_at is already set', () => {
    mockProfile = {
      id: 'test-user-123',
      legacy_imported_at: '2026-11-01T00:00:00Z',
    };

    renderWithClient(<ImportBanner />);
    expect(screen.queryByRole('region', { name: 'Legacy data import' })).not.toBeInTheDocument();
  });

  it('does not render if user already has todos > 0', async () => {
    vi.mocked(supabase.from).mockImplementation((tableName: string) => {
      if (tableName === 'todos') {
        return {
          select: vi.fn().mockResolvedValue({ count: 3, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (tableName === 'notes') {
        return {
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    renderWithClient(<ImportBanner />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('region', { name: 'Legacy data import' })).not.toBeInTheDocument();
  });

  it('does not render if user already has notes > 0', async () => {
    vi.mocked(supabase.from).mockImplementation((tableName: string) => {
      if (tableName === 'todos') {
        return {
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (tableName === 'notes') {
        return {
          select: vi.fn().mockResolvedValue({ count: 5, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    renderWithClient(<ImportBanner />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('region', { name: 'Legacy data import' })).not.toBeInTheDocument();
  });
});
