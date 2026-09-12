import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, MessageSquare, Search, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export const BottomNav: React.FC = () => {
  const navItems = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Profile', path: '/settings', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 px-2 py-1.5 flex items-center justify-around transition-colors">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-all gap-1',
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-semibold scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
