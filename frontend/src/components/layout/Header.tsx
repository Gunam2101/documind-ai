import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Monitor, User as UserIcon, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const Header: React.FC = () => {
  const { user, isDemoMode, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Global Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents, questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-dark-card border-none rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isDemoMode && (
          <div className="px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Demo Mode Active</span>
          </div>
        )}
        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold uppercase text-gray-500">Notifications</span>
                <span className="text-[10px] text-brand-600 font-semibold cursor-pointer">Mark all as read</span>
              </div>
              <div className="py-3 space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-brand-50/60 dark:bg-brand-950/30 text-gray-800 dark:text-gray-200">
                  <p className="font-medium text-brand-600 dark:text-brand-400">System Ready</p>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px]">Welcome to DocuMind AI! Upload your first PDF to get started.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-semibold flex items-center justify-center text-sm shadow-sm ring-2 ring-brand-500/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={async () => { await logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
