import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth/useSession';
import { Button, Field } from '@/components/ui';
import { FullPageSkeleton } from '@/components/FullPageSkeleton';

const emailSchema = z.string().trim().email('Please enter a valid email address.');
const tokenSchema = z
  .string()
  .trim()
  .min(6, 'Please enter the 6-digit verification code.')
  .max(8, 'Verification code is invalid.');

function getErrorMessage(error: { status?: number; message?: string }): string {
  if (error.status === 429) {
    return 'Too many requests. Try again in a minute.';
  }
  const msg = error.message?.toLowerCase() ?? '';
  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('connection') ||
    error.status === 0
  ) {
    return 'Could not reach the server. Check your connection.';
  }
  return error.message || 'An error occurred during authentication.';
}

export function LoginPage() {
  const { status } = useSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') {
    return <FullPageSkeleton />;
  }

  if (status === 'signed-in') {
    return <Navigate to="/" replace />;
  }

  const handleSendLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Invalid email address.');
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: validation.data,
        options: {
          emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
        },
      });

      if (signInError) {
        setError(getErrorMessage(signInError));
        return;
      }

      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        setError('Could not reach the server. Check your connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = tokenSchema.safeParse(token);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Invalid verification code.');
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: validation.data,
        type: 'email',
      });

      if (verifyError) {
        setError(getErrorMessage(verifyError));
        return;
      }

      navigate({ to: '/' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        setError('Could not reach the server. Check your connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSent(false);
    setToken('');
    setError(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-sm rounded-[10px] border border-rule bg-surface/40 p-6 md:p-8">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-ink">
            FocusLearn
          </h1>
          <p className="mt-2 text-xs md:text-sm text-muted">
            Your study notebook: todos, pages and focus sessions.
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSendLink} noValidate className="space-y-4">
            <Field
              label="Email"
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              error={error}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full"
            >
              Send sign-in link
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="rounded-[6px] border border-rule bg-paper p-3 text-center">
              <p className="text-xs text-muted">
                Check your inbox at{' '}
                <span className="mt-0.5 block truncate text-sm font-medium text-ink">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
              <Field
                label="Enter the 6-digit code instead"
                id="login-token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={token}
                error={error}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (error) setError(null);
                }}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
              >
                Verify code
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted hover:text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
              >
                Use a different email
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
