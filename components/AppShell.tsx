/**
 * AppShell - Main application layout
 * Combines Sidebar, Topbar, and main content area
 */

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';
import ToastContainer from './ToastContainer';
import MiniChatDrawer from './MiniChatDrawer';

export const AppShell: React.FC = () => {
  const { isZenMode, state } = useGlobal();
  const theme = state.settings.theme || 'light';

  // Apply theme to document body for dark mode support
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme === 'dark' ? 'dark' : 'light');

    // Update body background for dark mode
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#f3f4f6';
    } else {
      document.body.style.backgroundColor = '#f9fafb';
      document.body.style.color = '#111827';
    }
  }, [theme]);

  // Theme classes for main container
  const themeClasses: Record<string, string> = {
    light: 'bg-gray-50 text-gray-900',
    dark: 'bg-gray-900 text-gray-100',
    navy: 'bg-slate-900 text-slate-100',
    forest: 'bg-stone-900 text-emerald-50',
  };

  // Dark mode card classes
  const darkModeStyles = theme === 'dark' ? `
    [&_.bg-white]:bg-gray-800
    [&_.bg-gray-50]:bg-gray-900
    [&_.border-gray-200]:border-gray-700
    [&_.border-gray-100]:border-gray-800
    [&_.text-gray-900]:text-gray-100
    [&_.text-gray-700]:text-gray-300
    [&_.text-gray-600]:text-gray-400
    [&_.text-gray-500]:text-gray-400
    [&_.text-gray-400]:text-gray-500
    [&_.hover\\:bg-gray-100]:hover:bg-gray-700
    [&_.hover\\:bg-gray-50]:hover:bg-gray-800
  ` : '';

  // Zen mode - hide sidebar and topbar for distraction-free focus
  if (isZenMode) {
    return (
      <div className={`h-full w-full ${themeClasses[theme]} ${darkModeStyles}`}>
        <main className="h-full w-full overflow-hidden">
          <Outlet />
        </main>
        <CommandPalette />
        <ToastContainer />
        <MiniChatDrawer />
      </div>
    );
  }

  return (
    <div className={`h-full w-full flex ${themeClasses[theme]} ${darkModeStyles}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Command Palette (Global) */}
      <CommandPalette />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Mini Chat Drawer */}
      <MiniChatDrawer />
    </div>
  );
};

export default AppShell;
