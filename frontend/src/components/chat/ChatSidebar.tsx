import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, MessageSquare, Trash2, Edit2, Check, Sparkles, Sun, Moon, Home, FileText, Settings as SettingsIcon } from 'lucide-react';
import { Conversation } from '../../types';
import { getTimeGroup, cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export interface ChatSidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setTheme, isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const groups = {
    TODAY: filtered.filter(c => getTimeGroup(c.updated_at) === 'Today'),
    YESTERDAY: filtered.filter(c => getTimeGroup(c.updated_at) === 'Yesterday'),
    EARLIER: filtered.filter(c => getTimeGroup(c.updated_at) !== 'Today' && getTimeGroup(c.updated_at) !== 'Yesterday')
  };

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'GM';

  return (
    <aside className="w-full lg:w-72 bg-gray-900/90 dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border flex flex-col h-full shrink-0 select-none">
      {/* Branding & Top Actions */}
      <div className="p-4 border-b border-gray-200/80 dark:border-dark-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-dark-bg rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1">
              DocuMind AI
            </h1>
            <p className="text-[10px] font-semibold text-indigo-300/80">Your AI Study Partner</p>
          </div>
        </div>

        {/* Navigation Quick Links */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => navigate('/dashboard')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
              location.pathname === '/dashboard' || location.pathname === '/' || location.pathname === '/home'
                ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/40 font-bold"
                : "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-800"
            )}
          >
            <Home className="w-3.5 h-3.5 text-indigo-400" />
            <span>Home</span>
          </button>

          <button
            onClick={() => navigate('/documents')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
              location.pathname === '/documents'
                ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/40 font-bold"
                : "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-800"
            )}
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Documents</span>
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Search Conversations */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-12 py-2 bg-gray-800/80 dark:bg-dark-card border border-gray-700/60 dark:border-dark-border rounded-xl text-xs text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-bold text-gray-400 bg-gray-700/60 dark:bg-dark-border rounded">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {(Object.keys(groups) as Array<keyof typeof groups>).map(groupName => {
          const list = groups[groupName];
          if (list.length === 0) return null;

          return (
            <div key={groupName} className="space-y-1">
              <span className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {groupName}
              </span>
              {list.map(c => {
                const isActive = c.id === activeId;
                const isEditing = c.id === editingId;

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      'group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all',
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-bold shadow-inner'
                        : 'text-gray-300 hover:bg-gray-800/60 dark:hover:bg-dark-hover hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                      <MessageSquare className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-indigo-400' : 'text-gray-400')} />
                      {isEditing ? (
                        <form onSubmit={(e) => handleSaveRename(c.id, e)} className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-1.5 py-0.5 text-xs bg-dark-card border border-indigo-500 rounded text-white focus:outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <span className="truncate">{c.title}</span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => handleStartRename(c, e)}
                          className="p-1 text-gray-400 hover:text-white rounded"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                          className="p-1 text-gray-400 hover:text-rose-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Profile Footer */}
      <div className="p-3.5 border-t border-gray-200/80 dark:border-dark-border bg-gray-900/90 dark:bg-dark-surface space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-gray-100 truncate">{user?.name || 'Guna Madhaiyan'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email || 'guna@example.com'}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-full py-1.5 px-3 bg-gray-800/80 dark:bg-dark-card hover:bg-gray-700/80 text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  );
};
