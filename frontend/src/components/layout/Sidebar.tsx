import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  BookOpen,
  Target,
  BarChart2,
  Settings,
  HelpCircle,
  LogOut,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Ask AI', path: '/chat', icon: MessageSquare },
    { name: 'Summary', path: '/summary', icon: FileText },
    { name: 'Study Notes', path: '/study-notes', icon: BookOpen },
    { name: 'Question Generator', path: '/question-generator', icon: Target },
    { name: 'Practice Quiz', path: '/practice-quiz', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-[#212b45] bg-[#121729] text-gray-100 h-screen sticky top-0 z-30 transition-colors">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#212b45]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
            DocuMind AI
            <Sparkles className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
          </span>
          <p className="text-[10px] text-gray-400 font-medium">Multilingual AI Teacher</p>
        </div>
      </div>

      {/* Main Nav Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="px-3 pb-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white font-bold border-l-4 border-purple-500 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#161c30]'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
                <span>{item.name}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
            </NavLink>
          );
        })}
      </div>

      {/* Help & User Footer */}
      <div className="p-3 border-t border-[#212b45] space-y-2">
        <NavLink
          to="/help"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#161c30] transition-all',
              isActive && 'bg-[#161c30] text-white font-bold'
            )
          }
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help & Support</span>
        </NavLink>

        {/* User Card */}
        {user && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <span className="inline-block px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 text-[9px] font-bold border border-purple-500/30">
                  {user.is_demo ? 'Demo Mode' : 'Free Plan'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
