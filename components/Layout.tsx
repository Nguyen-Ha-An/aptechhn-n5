import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import { Timer, BookOpen, Brain, MessageSquare, ShoppingBag, BarChart2, Settings, Home } from 'lucide-react';

const Layout: React.FC = () => {
  const { data } = useGlobal();
  const theme = data.profile.activeTheme;

  // Simple theme mapping
  const themeClasses = {
    light: 'bg-gray-50 text-gray-900',
    dark: 'bg-gray-900 text-gray-100',
    navy: 'bg-slate-900 text-slate-100',
    forest: 'bg-stone-900 text-emerald-50'
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) => 
    `flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
      isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'
    }`;

  return (
    <div className={`h-full w-full flex flex-col md:flex-row ${themeClasses[theme] || themeClasses.light}`}>
      {/* Mobile/Desktop Content Area */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0 order-1 md:order-2">
        <div className="max-w-5xl mx-auto min-h-full">
           <Outlet />
        </div>
      </div>

      {/* Navigation Bar (Bottom on Mobile, Left on Desktop) */}
      <nav className="fixed md:relative bottom-0 w-full md:w-20 bg-white border-t md:border-t-0 md:border-r border-gray-200 flex md:flex-col justify-around md:justify-start md:pt-8 md:space-y-6 z-50 order-2 md:order-1 h-16 md:h-full shrink-0">
        <NavLink to="/" className={navItemClass}><Timer size={24} /><span className="text-[10px] md:hidden">Focus</span></NavLink>
        <NavLink to="/flashcards" className={navItemClass}><BookOpen size={24} /><span className="text-[10px] md:hidden">Cards</span></NavLink>
        <NavLink to="/chat" className={navItemClass}><MessageSquare size={24} /><span className="text-[10px] md:hidden">Chat</span></NavLink>
        <NavLink to="/shop" className={navItemClass}><ShoppingBag size={24} /><span className="text-[10px] md:hidden">Shop</span></NavLink>
        <NavLink to="/analytics" className={navItemClass}><BarChart2 size={24} /><span className="text-[10px] md:hidden">Stats</span></NavLink>
        <NavLink to="/settings" className={navItemClass}><Settings size={24} /><span className="text-[10px] md:hidden">Settings</span></NavLink>
      </nav>
    </div>
  );
};

export default Layout;
