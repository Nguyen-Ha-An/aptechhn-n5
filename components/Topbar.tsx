/**
 * Topbar Component - Linear-inspired header
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import { useT } from '../i18n';
import {
  ChevronRight,
  Search,
  Plus,
  Star,
  StarOff,
  Bell,
} from 'lucide-react';
import { Button, Kbd, Badge } from './ui';

export const Topbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCommandPaletteOpen, toggleFavorite, isFavorite, state } = useGlobal();
  const t = useT();

  // Route title mapping with translations
  const getRouteInfo = (path: string): { title: string; subtitle?: string } => {
    const routes: Record<string, { title: string; subtitle?: string }> = {
      '/dashboard': { title: t.nav.dashboard, subtitle: t.dashboard.subtitle },
      '/inbox': { title: t.nav.inbox, subtitle: t.inbox.subtitle },
      '/tasks': { title: t.nav.tasks, subtitle: t.tasks.subtitle },
      '/projects': { title: t.nav.projects, subtitle: t.projects.subtitle },
      '/notes': { title: t.nav.notes, subtitle: t.notes.subtitle },
      '/flashcards': { title: t.nav.flashcards, subtitle: t.flashcards.subtitle },
      '/timer': { title: t.nav.timer, subtitle: t.timer.pomodoroSessions },
      '/chat': { title: t.nav.chat, subtitle: t.chat.subtitle },
      '/sessions': { title: t.nav.sessions, subtitle: t.sessions.subtitle },
      '/analytics': { title: t.nav.analytics, subtitle: t.analytics.subtitle },
      '/settings': { title: t.nav.settings, subtitle: t.settings.subtitle },
    };
    return routes[path] || { title: t.app.name };
  };

  const currentPath = location.pathname;
  const { title, subtitle } = getRouteInfo(currentPath);
  const isFav = isFavorite(currentPath);

  // Personalized greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    const name = state.settings.userName;
    let greeting = '';

    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 18) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    return name ? `${greeting}, ${name}` : greeting;
  };

  // Quick actions based on current route
  const getQuickActions = () => {
    switch (currentPath) {
      case '/tasks':
        return (
          <Button size="sm" onClick={() => setCommandPaletteOpen(true)}>
            <Plus className="w-4 h-4" />
            {t.tasks.newTask}
          </Button>
        );
      case '/notes':
        return (
          <Button size="sm" onClick={() => setCommandPaletteOpen(true)}>
            <Plus className="w-4 h-4" />
            {t.notes.newNote}
          </Button>
        );
      case '/inbox':
        return (
          <Button size="sm" onClick={() => setCommandPaletteOpen(true)}>
            <Plus className="w-4 h-4" />
            {t.inbox.quickCapture}
          </Button>
        );
      case '/flashcards':
        return (
          <Button size="sm" onClick={() => setCommandPaletteOpen(true)}>
            <Plus className="w-4 h-4" />
            {t.flashcards.newDeck}
          </Button>
        );
      default:
        return null;
    }
  };

  // Calculate notifications
  const inboxCount = state.inbox.length;
  const dueCards = state.decks.reduce((acc, deck) => {
    const today = new Date().toISOString().split('T')[0];
    return acc + deck.cards.filter((c) => c.nextReviewDate <= today).length;
  }, 0);
  const totalNotifications = inboxCount + (dueCards > 0 ? 1 : 0);

  // Show greeting on dashboard
  const showGreeting = currentPath === '/dashboard' || currentPath === '/';

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200">
      {/* Left: Title & Breadcrumb */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {showGreeting && state.settings.userName ? (
            <h1 className="text-lg font-semibold text-gray-900">{getGreeting()}</h1>
          ) : (
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          )}
          <button
            onClick={() => toggleFavorite(currentPath)}
            className={`p-1 rounded transition-colors ${
              isFav ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            {isFav ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
          </button>
        </div>
        {subtitle && !showGreeting && (
          <span className="text-sm text-gray-500 hidden md:inline">{subtitle}</span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Command Palette Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>{t.nav.search.replace('...', '')}</span>
          <div className="flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </div>
        </button>

        {/* Quick Actions */}
        {getQuickActions()}

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
          <Bell className="w-5 h-5" />
          {totalNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {totalNotifications}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Topbar;
