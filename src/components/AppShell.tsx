import { useState, type ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { List } from '@phosphor-icons/react';
import { Sidebar } from './Sidebar';
import { IconButton } from '@/components/ui';
import { FocusProvider, useFocus } from '@/features/focus/useFocusSession';

export interface AppShellProps {
  children?: ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { zenMode } = useFocus();

  return (
    <div className="flex min-h-screen w-full bg-paper text-ink">
      {/* Skip to Content */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[6px] focus:border focus:border-rule focus:bg-paper focus:px-4 focus:py-2 focus:text-ink focus:shadow-md focus:outline-2 focus:outline-accent"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      {!zenMode && (
        <div className="hidden md:flex shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Mobile Drawer */}
      <RadixDialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-120 animate-in fade-in-0 md:hidden" />
          <RadixDialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[248px] bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.12)] duration-120 animate-in slide-in-from-left focus:outline-none md:hidden"
          >
            <RadixDialog.Title className="sr-only">Navigation</RadixDialog.Title>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      {/* Main Column & Mobile Header */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Top Bar */}
        {!zenMode && (
          <header className="flex h-14 md:hidden items-center justify-between border-b border-rule bg-surface px-4 shrink-0">
            <div className="flex items-center gap-3">
              <IconButton
                label="Open navigation menu"
                variant="ghost"
                onClick={() => setMobileOpen(true)}
              >
                <List size={22} />
              </IconButton>
              <span className="font-serif text-lg font-bold text-ink">FocusLearn</span>
            </div>
          </header>
        )}

        {/* Reading Column */}
        <main
          id="main"
          className={`mx-auto w-full flex-1 px-5 py-6 md:py-12 ${
            zenMode ? 'max-w-[800px]' : 'max-w-[720px]'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <FocusProvider>
      <AppShellInner>{children}</AppShellInner>
    </FocusProvider>
  );
}
