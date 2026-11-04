import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { Button, Field, Dialog, Skeleton } from '@/components/ui';
import { useSession } from '@/features/auth';
import { useProfile, useUpdateProfile, type Profile } from '@/features/profile/queries';
import { useTheme } from '@/features/theme/ThemeProvider';
import { browserTimeZone } from '@/lib/dates';
import { exportUserData } from './exportData';
import { deleteUserAccount } from './deleteAccount';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function SettingsPage() {
  const { user } = useSession();
  const { data: profile, isLoading } = useProfile();

  if (isLoading && !profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <Skeleton rows={8} />
      </div>
    );
  }

  return (
    <SettingsForm
      key={profile?.id ?? 'default'}
      profile={profile ?? null}
      userEmail={user?.email ?? ''}
    />
  );
}

function getTimezoneOptions(): string[] {
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      return Intl.supportedValuesOf('timeZone');
    }
  } catch {
    // Fall back to default list
  }
  return [browserTimeZone(), 'Asia/Ho_Chi_Minh', 'UTC'];
}

interface SettingsFormProps {
  profile: Profile | null;
  userEmail: string;
}

function SettingsForm({ profile, userEmail }: SettingsFormProps) {
  const updateProfile = useUpdateProfile();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Profile section state
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [timezone, setTimezone] = useState(profile?.timezone || browserTimeZone());
  const [profileSaving, setProfileSaving] = useState(false);

  // Timezone options
  const [timezones] = useState<string[]>(getTimezoneOptions);

  // Focus section state (string state to allow free typing)
  const [focusMinutes, setFocusMinutes] = useState(String(profile?.focus_minutes ?? 25));
  const [shortBreakMinutes, setShortBreakMinutes] = useState(
    String(profile?.short_break_minutes ?? 5),
  );
  const [longBreakMinutes, setLongBreakMinutes] = useState(
    String(profile?.long_break_minutes ?? 15),
  );
  const [cyclesBeforeLongBreak, setCyclesBeforeLongBreak] = useState(
    String(profile?.cycles_before_long_break ?? 4),
  );
  const [autoStartBreaks, setAutoStartBreaks] = useState(Boolean(profile?.auto_start_breaks));
  const [notifications, setNotifications] = useState(Boolean(profile?.notifications ?? true));
  const [notificationDeniedMsg, setNotificationDeniedMsg] = useState<string | null>(null);

  // Focus errors
  const [focusError, setFocusError] = useState<string | null>(null);
  const [shortBreakError, setShortBreakError] = useState<string | null>(null);
  const [longBreakError, setLongBreakError] = useState<string | null>(null);
  const [cyclesError, setCyclesError] = useState<string | null>(null);
  const [focusSaving, setFocusSaving] = useState(false);

  // Data export state
  const [exporting, setExporting] = useState(false);

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  // --- Profile handlers ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.length > 40) {
      toast.error('Display name must be 40 characters or fewer.');
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || null,
        timezone,
      });
      toast.success('Profile saved.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save profile.';
      toast.error(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Appearance handlers ---
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    try {
      localStorage.setItem('fl:theme', newTheme);
    } catch {
      // Ignore
    }
    updateProfile.mutate({ theme: newTheme });
  };

  // --- Focus handlers ---
  const validateFocusMinutes = (valStr: string): boolean => {
    const val = Number(valStr);
    if (!valStr.trim() || isNaN(val) || val < 5 || val > 180) {
      setFocusError('Focus duration must be between 5 and 180 minutes.');
      return false;
    }
    setFocusError(null);
    return true;
  };

  const validateShortBreakMinutes = (valStr: string): boolean => {
    const val = Number(valStr);
    if (!valStr.trim() || isNaN(val) || val < 1 || val > 60) {
      setShortBreakError('Short break must be between 1 and 60 minutes.');
      return false;
    }
    setShortBreakError(null);
    return true;
  };

  const validateLongBreakMinutes = (valStr: string): boolean => {
    const val = Number(valStr);
    if (!valStr.trim() || isNaN(val) || val < 1 || val > 90) {
      setLongBreakError('Long break must be between 1 and 90 minutes.');
      return false;
    }
    setLongBreakError(null);
    return true;
  };

  const validateCycles = (valStr: string): boolean => {
    const val = Number(valStr);
    if (!valStr.trim() || isNaN(val) || val < 1 || val > 12) {
      setCyclesError('Cycles must be between 1 and 12.');
      return false;
    }
    setCyclesError(null);
    return true;
  };

  const handleSaveFocusSettings = async () => {
    const isFocusValid = validateFocusMinutes(focusMinutes);
    const isShortValid = validateShortBreakMinutes(shortBreakMinutes);
    const isLongValid = validateLongBreakMinutes(longBreakMinutes);
    const isCyclesValid = validateCycles(cyclesBeforeLongBreak);

    if (!isFocusValid || !isShortValid || !isLongValid || !isCyclesValid) {
      return;
    }

    setFocusSaving(true);
    try {
      await updateProfile.mutateAsync({
        focus_minutes: Number(focusMinutes),
        short_break_minutes: Number(shortBreakMinutes),
        long_break_minutes: Number(longBreakMinutes),
        cycles_before_long_break: Number(cyclesBeforeLongBreak),
        auto_start_breaks: autoStartBreaks,
        notifications,
      });
      toast.success('Focus settings saved.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save focus settings.';
      toast.error(msg);
    } finally {
      setFocusSaving(false);
    }
  };

  const handleNotificationsToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setNotificationDeniedMsg(null);

    if (checked) {
      if (typeof Notification !== 'undefined') {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            setNotifications(true);
            updateProfile.mutate({ notifications: true });
          } else {
            setNotifications(false);
            setNotificationDeniedMsg(
              'Notification permission was denied. Please allow notifications in your browser settings to receive alerts.',
            );
          }
        } catch {
          setNotifications(true);
          updateProfile.mutate({ notifications: true });
        }
      } else {
        setNotifications(true);
        updateProfile.mutate({ notifications: true });
      }
    } else {
      setNotifications(false);
      updateProfile.mutate({ notifications: false });
    }
  };

  // --- Data export handler ---
  const handleExportData = async () => {
    setExporting(true);
    try {
      await exportUserData(profile?.timezone || browserTimeZone());
      toast.success('Data export downloaded.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not export data.';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  // --- Account deletion handler ---
  const handleDeleteAccount = async () => {
    if (confirmEmail !== userEmail) return;

    setDeleting(true);
    try {
      await deleteUserAccount();
      setDeleteDialogOpen(false);
      toast.success('Your account was deleted.');
      void navigate({ to: '/login' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.';
      toast.error(msg);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title="Settings"
        meta="Manage your profile, timer preferences, theme, and data."
      />

      {/* 1. Profile Section */}
      <section aria-labelledby="section-profile" className="space-y-4">
        <h2 id="section-profile" className="font-serif text-lg font-semibold text-ink border-b border-rule pb-2">
          Profile
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
          <Field
            label="Display name"
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            hint="Maximum 40 characters."
            placeholder="Your name"
          />

          <div className="flex flex-col text-left">
            <label htmlFor="settings-timezone" className="mb-1.5 text-xs font-medium text-ink">
              Timezone
            </label>
            <select
              id="settings-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-[6px] border border-rule bg-surface px-3 py-2 text-sm text-ink transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 cursor-pointer"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Used to calculate your daily study streaks and journal dates.
            </p>
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" loading={profileSaving}>
              Save profile
            </Button>
          </div>
        </form>
      </section>

      {/* 2. Appearance Section */}
      <section aria-labelledby="section-appearance" className="space-y-4">
        <h2 id="section-appearance" className="font-serif text-lg font-semibold text-ink border-b border-rule pb-2">
          Appearance
        </h2>
        <div className="space-y-2">
          <span className="text-xs font-medium text-ink block">Theme</span>
          <div
            role="radiogroup"
            aria-label="Theme preference"
            className="inline-flex rounded-[6px] border border-rule bg-surface p-1 gap-1"
          >
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const active = theme === mode;
              const label = mode.charAt(0).toUpperCase() + mode.slice(1);
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleThemeChange(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
                    active
                      ? 'bg-paper text-ink font-semibold shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            Choose light paper, dark ink, or match your operating system theme.
          </p>
        </div>
      </section>

      {/* 3. Focus Section */}
      <section aria-labelledby="section-focus" className="space-y-4">
        <h2 id="section-focus" className="font-serif text-lg font-semibold text-ink border-b border-rule pb-2">
          Focus
        </h2>
        <div className="space-y-4 max-w-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              id="focus-minutes-input"
              label="Focus minutes"
              type="number"
              min={5}
              max={180}
              value={focusMinutes}
              onChange={(e) => setFocusMinutes(e.target.value)}
              onBlur={() => validateFocusMinutes(focusMinutes)}
              error={focusError}
              hint="5 to 180 minutes"
            />

            <Field
              id="short-break-input"
              label="Short break minutes"
              type="number"
              min={1}
              max={60}
              value={shortBreakMinutes}
              onChange={(e) => setShortBreakMinutes(e.target.value)}
              onBlur={() => validateShortBreakMinutes(shortBreakMinutes)}
              error={shortBreakError}
              hint="1 to 60 minutes"
            />

            <Field
              id="long-break-input"
              label="Long break minutes"
              type="number"
              min={1}
              max={90}
              value={longBreakMinutes}
              onChange={(e) => setLongBreakMinutes(e.target.value)}
              onBlur={() => validateLongBreakMinutes(longBreakMinutes)}
              error={longBreakError}
              hint="1 to 90 minutes"
            />

            <Field
              id="cycles-input"
              label="Cycles before long break"
              type="number"
              min={1}
              max={12}
              value={cyclesBeforeLongBreak}
              onChange={(e) => setCyclesBeforeLongBreak(e.target.value)}
              onBlur={() => validateCycles(cyclesBeforeLongBreak)}
              error={cyclesError}
              hint="1 to 12 cycles"
            />
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-ink">
              <input
                type="checkbox"
                checked={autoStartBreaks}
                onChange={(e) => {
                  setAutoStartBreaks(e.target.checked);
                  updateProfile.mutate({ auto_start_breaks: e.target.checked });
                }}
                className="rounded border-rule text-accent focus:ring-accent h-4 w-4 cursor-pointer"
              />
              <span>Auto-start breaks</span>
            </label>

            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-ink">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={handleNotificationsToggle}
                  className="rounded border-rule text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                />
                <span>Timer notifications</span>
              </label>
              {notificationDeniedMsg && (
                <p role="alert" className="text-xs text-danger pl-6">
                  {notificationDeniedMsg}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              loading={focusSaving}
              onClick={handleSaveFocusSettings}
            >
              Save focus settings
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Data Section */}
      <section aria-labelledby="section-data" className="space-y-4">
        <h2 id="section-data" className="font-serif text-lg font-semibold text-ink border-b border-rule pb-2">
          Data
        </h2>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="secondary"
              loading={exporting}
              onClick={handleExportData}
            >
              Export my data
            </Button>
            <Link
              to="/settings/import"
              className="text-sm font-medium text-ink underline hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              Import from the old FocusLearn
            </Link>
          </div>
          <p className="text-xs text-muted max-w-lg">
            Download a complete JSON export of all your notes, todos, sessions, distractions, and chat conversations.
          </p>
        </div>
      </section>

      {/* 5. Account Section */}
      <section aria-labelledby="section-account" className="space-y-4">
        <h2 id="section-account" className="font-serif text-lg font-semibold text-ink border-b border-rule pb-2">
          Account
        </h2>
        <div className="space-y-4 max-w-md">
          <div className="text-sm">
            <span className="text-muted block text-xs">Email address</span>
            <span className="font-medium text-ink">{userEmail || 'Unknown'}</span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await supabase.auth.signOut();
                void navigate({ to: '/login' });
              }}
            >
              Sign out
            </Button>

            <Button
              variant="danger"
              onClick={() => {
                setConfirmEmail('');
                setDeleteDialogOpen(true);
              }}
            >
              Delete account
            </Button>
          </div>
        </div>
      </section>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete account"
        description="This will permanently delete your account and all associated notes, todos, sessions, and messages. This action cannot be reversed."
      >
        <div className="space-y-4">
          <Field
            label={`To confirm, type your email (${userEmail})`}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={userEmail}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmEmail !== userEmail || deleting}
              loading={deleting}
              onClick={handleDeleteAccount}
            >
              Delete account
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
