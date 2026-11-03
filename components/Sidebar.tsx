/**
 * Sidebar Component - Notion-inspired navigation
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import { useT } from '../i18n';
import {
  LayoutDashboard,
  ListTodo,
  CheckSquare,
  FolderKanban,
  FileText,
  GraduationCap,
  Timer,
  History,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Star,
  Search,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { Badge, Kbd } from './ui';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | string;
  collapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge, collapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <NavLink
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 group ${
        isActive
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-sm font-medium truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <Badge variant={isActive ? 'primary' : 'default'} size="sm">
              {badge}
            </Badge>
          )}
        </>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { state, updateState, setCommandPaletteOpen } = useGlobal();
  const t = useT();
  const collapsed = state.settings.sidebarCollapsed;

  // Calculate badges
  const activeTodos = state.todos.filter((todo) => !todo.done).length;
  const todayTasks = state.tasks.filter(
    (task) => task.status !== 'done' && task.dueDate === new Date().toISOString().split('T')[0]
  ).length;
  const dueCards = state.decks.reduce((acc, deck) => {
    const today = new Date().toISOString().split('T')[0];
    return acc + deck.cards.filter((c) => c.nextReviewDate <= today).length;
  }, 0);

  const toggleCollapsed = () => {
    updateState({
      settings: { ...state.settings, sidebarCollapsed: !collapsed },
    });
  };

  return (
    <aside
      className={`flex flex-col h-full bg-gray-50 border-r border-gray-200 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center h-14 px-3 border-b border-gray-200 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">{t.app.name}</span>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Search / Command Palette Trigger */}
      {!collapsed && (
        <div className="px-3 py-2">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">{t.nav.search}</span>
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Main */}
        <NavItem to="/dashboard" icon={<LayoutDashboard size={18} />} label={t.nav.dashboard} collapsed={collapsed} />
        <NavItem to="/todo" icon={<ListTodo size={18} />} label={t.nav.todo} badge={activeTodos} collapsed={collapsed} />
        <NavItem to="/notes" icon={<FileText size={18} />} label={t.nav.notes} collapsed={collapsed} />

        {/* Divider */}
        {!collapsed && (
          <div className="py-2">
            <div className="h-px bg-gray-200" />
          </div>
        )}

        {/* Work */}
        <NavItem to="/tasks" icon={<CheckSquare size={18} />} label={t.nav.tasks} badge={todayTasks} collapsed={collapsed} />
        <NavItem to="/projects" icon={<FolderKanban size={18} />} label={t.nav.projects} collapsed={collapsed} />
        <NavItem to="/flashcards" icon={<GraduationCap size={18} />} label={t.nav.flashcards} badge={dueCards} collapsed={collapsed} />

        {/* Divider */}
        {!collapsed && (
          <div className="py-2">
            <div className="h-px bg-gray-200" />
          </div>
        )}

        {/* Focus */}
        <NavItem to="/timer" icon={<Timer size={18} />} label={t.nav.timer} collapsed={collapsed} />
        <NavItem to="/chat" icon={<MessageCircle size={18} />} label={t.nav.chat} collapsed={collapsed} />
        <NavItem to="/sessions" icon={<History size={18} />} label={t.nav.sessions} collapsed={collapsed} />
        <NavItem to="/analytics" icon={<BarChart3 size={18} />} label={t.nav.analytics} collapsed={collapsed} />
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-gray-200">
        <NavItem to="/settings" icon={<Settings size={18} />} label={t.nav.settings} collapsed={collapsed} />
      </div>
    </aside>
  );
};

export default Sidebar;
