import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';
import { supabase } from '@/lib/supabase';
import * as authFeature from './useSession';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('@tanstack/react-router', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate-mock">{to}</div>,
  useNavigate: () => vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authFeature, 'useSession').mockReturnValue({
      session: null,
      user: null,
      status: 'signed-out',
    });
  });

  it('renders wordmark, purpose line, and email input', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('FocusLearn');
    expect(
      screen.getByText('Your study notebook: todos, pages and focus sessions.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send sign-in link' }),
    ).toBeInTheDocument();
  });

  it('validates email on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }));

    expect(
      await screen.findByText('Please enter a valid email address.'),
    ).toBeInTheDocument();
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('sends OTP and transitions to code verification form', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.mocked(supabase.auth.signInWithOtp);
    mockSignIn.mockResolvedValueOnce({ data: {}, error: null } as never);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'student@example.com');
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'student@example.com',
      options: expect.objectContaining({
        emailRedirectTo: expect.any(String),
      }),
    });

    expect(await screen.findByText('Check your inbox at')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Enter the 6-digit code instead'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify code' })).toBeInTheDocument();
  });

  it('displays rate limit error message on 429', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.mocked(supabase.auth.signInWithOtp);
    mockSignIn.mockResolvedValueOnce({
      data: {},
      error: { status: 429, message: 'Too many requests' },
    } as never);

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'student@example.com');
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }));

    expect(
      await screen.findByText('Too many requests. Try again in a minute.'),
    ).toBeInTheDocument();
  });

  it('displays network connection error message on network failure', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.mocked(supabase.auth.signInWithOtp);
    mockSignIn.mockResolvedValueOnce({
      data: {},
      error: { status: 0, message: 'Failed to fetch' },
    } as never);

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'student@example.com');
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }));

    expect(
      await screen.findByText('Could not reach the server. Check your connection.'),
    ).toBeInTheDocument();
  });

  it('allows returning to email input via "Use a different email"', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.mocked(supabase.auth.signInWithOtp);
    mockSignIn.mockResolvedValueOnce({ data: {}, error: null } as never);

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'student@example.com');
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }));

    const differentEmailBtn = await screen.findByRole('button', {
      name: 'Use a different email',
    });
    await user.click(differentEmailBtn);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders full-page skeleton while session status is loading', () => {
    vi.spyOn(authFeature, 'useSession').mockReturnValue({
      session: null,
      user: null,
      status: 'loading',
    });

    render(<LoginPage />);
    expect(screen.getByRole('status', { name: 'Loading workspace' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('redirects signed-in user to root', () => {
    vi.spyOn(authFeature, 'useSession').mockReturnValue({
      session: { user: { id: 'u1' } } as never,
      user: { id: 'u1' } as never,
      status: 'signed-in',
    });

    render(<LoginPage />);
    expect(screen.getByTestId('navigate-mock')).toHaveTextContent('/');
  });
});
