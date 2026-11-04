import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from './SettingsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as exportModule from '@/features/settings/exportData';
import * as deleteAccountModule from '@/features/settings/deleteAccount';

// Mock dependencies
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                display_name: 'Test Student',
                theme: 'system',
                timezone: 'Asia/Ho_Chi_Minh',
                focus_minutes: 25,
                short_break_minutes: 5,
                long_break_minutes: 15,
                cycles_before_long_break: 4,
                auto_start_breaks: false,
                notifications: true,
                legacy_imported_at: null,
                created_at: '2026-11-01T00:00:00Z',
              },
              error: null,
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  display_name: 'Updated Student',
                  theme: 'dark',
                },
                error: null,
              }),
            })),
          })),
        })),
      })),
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'fake-jwt' } },
        }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    },
  };
});

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    user: { id: 'user-123', email: 'alex@example.com' },
    status: 'signed-in',
  }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
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
  };
});

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 5 main h2 sections: Profile, Appearance, Focus, Data, Account', async () => {
    renderWithClient(<SettingsPage />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Focus' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Data' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Account' })).toBeInTheDocument();
  });

  it('settings minutes field accepts typing "1" then "5" without snapping', async () => {
    const user = userEvent.setup();
    renderWithClient(<SettingsPage />);

    // Wait for data load
    const focusInput = await screen.findByLabelText(/Focus minutes/i);
    expect(focusInput).toHaveValue(25);

    // Clear and type "1" then "5"
    await user.clear(focusInput);
    await user.type(focusInput, '1');
    expect(focusInput).toHaveValue(1);

    await user.type(focusInput, '5');
    expect(focusInput).toHaveValue(15);

    // On blur, 15 is valid (between 5 and 180), so no error should appear
    await user.tab();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('validates focus minutes and shows inline error on blur when out of range', async () => {
    const user = userEvent.setup();
    renderWithClient(<SettingsPage />);

    const focusInput = await screen.findByLabelText(/Focus minutes/i);
    await user.clear(focusInput);
    await user.type(focusInput, '2'); // below min (5)
    await user.tab(); // blur

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Focus duration must be between 5 and 180 minutes.',
    );

    // Now type 200 (above max 180)
    await user.clear(focusInput);
    await user.type(focusInput, '200');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Focus duration must be between 5 and 180 minutes.',
    );
  });

  it('validates break minutes and cycles ranges', async () => {
    const user = userEvent.setup();
    renderWithClient(<SettingsPage />);

    const shortBreakInput = await screen.findByLabelText(/Short break minutes/i);
    await user.clear(shortBreakInput);
    await user.type(shortBreakInput, '0');
    await user.tab();
    expect(await screen.findByText('Short break must be between 1 and 60 minutes.')).toBeInTheDocument();

    const cyclesInput = await screen.findByLabelText(/Cycles before long break/i);
    await user.clear(cyclesInput);
    await user.type(cyclesInput, '20');
    await user.tab();
    expect(await screen.findByText('Cycles must be between 1 and 12.')).toBeInTheDocument();
  });

  it('allows switching theme to dark or light immediately', async () => {
    const user = userEvent.setup();
    renderWithClient(<SettingsPage />);

    const darkBtn = await screen.findByRole('radio', { name: 'Dark' });
    await user.click(darkBtn);

    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('calls exportUserData when clicking "Export my data"', async () => {
    const exportSpy = vi.spyOn(exportModule, 'exportUserData').mockResolvedValue();
    const user = userEvent.setup();
    renderWithClient(<SettingsPage />);

    const exportBtn = await screen.findByRole('button', { name: /Export my data/i });
    await user.click(exportBtn);

    expect(exportSpy).toHaveBeenCalled();
  });

  it('requires typing email to confirm account deletion', async () => {
    const deleteSpy = vi.spyOn(deleteAccountModule, 'deleteUserAccount').mockResolvedValue();
    const user = userEvent.setup();
    renderWithClient(<SettingsPage />);

    const deleteBtn = await screen.findByRole('button', { name: 'Delete account' });
    await user.click(deleteBtn);

    // Dialog opens with title "Delete account"
    const dialogHeadings = screen.getAllByRole('heading', { name: 'Delete account' });
    expect(dialogHeadings.length).toBeGreaterThan(0);

    // Find the confirm button inside dialog (initially disabled)
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete account', hidden: false });
    expect(confirmDeleteBtn).toBeDisabled();

    // Type incorrect email
    const emailInput = screen.getByPlaceholderText('alex@example.com');
    await user.type(emailInput, 'wrong@example.com');
    expect(confirmDeleteBtn).toBeDisabled();

    // Type correct email
    await user.clear(emailInput);
    await user.type(emailInput, 'alex@example.com');
    expect(confirmDeleteBtn).toBeEnabled();

    // Click confirm delete
    await user.click(confirmDeleteBtn);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
