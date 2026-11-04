import { Link } from '@tanstack/react-router';
import {
  House,
  CheckSquare,
  Timer,
  ChatCircle,
  ChartBar,
  GearSix,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth';
import { SidebarPages } from '@/features/notes/SidebarPages';
import { LiveSessionSlot } from '@/features/focus/LiveSessionRow';
import { Button } from '@/components/ui';

export interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof House;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: House, exact: true },
  { to: '/todos', label: 'Todos', icon: CheckSquare },
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/chat', label: 'Chat', icon: ChatCircle },
  { to: '/progress', label: 'Progress', icon: ChartBar },
  { to: '/settings', label: 'Settings', icon: GearSix },
];

export function Sidebar({ onNavigate, className = '' }: SidebarProps) {
  const { user } = useSession();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign-out error:', err);
    }
  };

  const navLinkBase =
    'flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm text-muted transition-colors duration-120 hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent';
  const navLinkActive = 'bg-paper text-ink font-semibold shadow-xs';

  return (
    <aside
      className={`flex h-full w-[248px] flex-col border-r border-rule bg-surface ${className}`.trim()}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center px-4 border-b border-rule">
        <Link
          to="/"
          onClick={onNavigate}
          className="font-serif text-lg font-bold tracking-tight text-ink hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
        >
          FocusLearn
        </Link>
      </div>

      {/* Main Navigation */}
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <LiveSessionSlot />

        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            onClick={onNavigate}
            className={navLinkBase}
            activeProps={{ className: navLinkActive }}
          >
            <Icon size={18} aria-hidden="true" className="shrink-0" />
            <span>{label}</span>
          </Link>
        ))}

        <SidebarPages />
      </nav>

      {/* User Footer */}
      <div className="border-t border-rule p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              title={user?.email ?? undefined}
              className="truncate text-xs text-muted"
            >
              {user?.email || 'Signed in'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-muted hover:text-ink shrink-0 h-8 px-2"
          >
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}
