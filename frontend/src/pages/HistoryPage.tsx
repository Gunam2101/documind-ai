import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { MessageSquare, Search, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { chatApi } from '../services/chatApi';
import { Conversation } from '../types';
import { formatDate } from '../lib/utils';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');

  const fetchConvs = async () => {
    try {
      const data = await chatApi.listConversations();
      setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConvs();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation history?')) {
      await chatApi.deleteConversation(id);
      fetchConvs();
    }
  };

  const filtered = conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">Conversation History</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search and review all your previous document chat interactions.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/chat?conv=${c.id}`)}
              className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-4 hover:border-brand-400 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-brand-600 truncate">{c.title}</h4>
                  <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                    <Calendar className="w-3 h-3" /> {formatDate(c.updated_at)} • {c.messages.length} messages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};
