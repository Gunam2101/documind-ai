import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Search, FileText, MessageSquare, ExternalLink, Sparkles, Filter } from 'lucide-react';
import { searchApi } from '../services/searchApi';
import { SearchItem } from '../types';
import { Button } from '../components/ui/Button';

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await searchApi.search(query.trim());
      setResults(res.results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, [initialQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Title */}
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2 justify-center sm:justify-start">
            <Sparkles className="w-6 h-6 text-brand-600 fill-brand-600" />
            Search your knowledge base
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Ask a question or enter keywords to retrieve exact matching excerpts using semantic vector similarity.
          </p>
        </div>

        {/* Big Search Input */}
        <form onSubmit={handleSearch} className="relative flex items-center shadow-lg rounded-2xl">
          <Search className="w-5 h-5 absolute left-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="What are the main findings or transformer model advantages?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-32 py-4 text-sm sm:text-base bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button
            type="submit"
            className="absolute right-2"
            size="md"
            isLoading={isSearching}
          >
            Search
          </Button>
        </form>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {results.length} Search Results
              </span>
            </div>

            {results.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
                <Search className="w-10 h-10 mx-auto text-gray-400 opacity-40" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No relevant information found</h3>
                <p className="text-xs text-gray-500">Try rephrasing your search query or upload additional PDF documents.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((item, idx) => {
                  const relevancePct = Math.round(item.score * 100);
                  return (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3 hover:border-brand-400 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate font-semibold text-sm text-gray-900 dark:text-gray-100">
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="truncate">{item.filename}</span>
                          <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0">
                            Page {item.page}
                          </span>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                          {relevancePct > 0 ? `${relevancePct}% relevance` : 'Match'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-dark-card p-3 rounded-xl border border-gray-100 dark:border-gray-800 font-sans">
                        "{item.content}"
                      </p>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => navigate(`/documents/${item.document_id}`)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open
                        </button>
                        <button
                          onClick={() => navigate(`/chat?doc=${item.document_id}`)}
                          className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
