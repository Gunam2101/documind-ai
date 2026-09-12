import React from 'react';
import { X, FileText, ExternalLink, BookOpen } from 'lucide-react';
import { SourceCitation } from '../../types';

export interface SourcePanelProps {
  sources: SourceCitation[];
  isOpen: boolean;
  onClose: () => void;
  onOpenSource: (docId: string, page: number) => void;
}

export const SourcePanel: React.FC<SourcePanelProps> = ({
  sources,
  isOpen,
  onClose,
  onOpenSource
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-full lg:w-80 bg-white dark:bg-dark-surface border-l border-gray-200 dark:border-gray-800 flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Sources</h3>
          <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-xs font-semibold">
            {sources.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sources.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-40" />
            <p>No source citations for this message.</p>
          </div>
        ) : (
          sources.map((src, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-gray-50/80 dark:bg-dark-card border border-gray-200/60 dark:border-gray-800 space-y-2.5 shadow-2xs hover:border-brand-300 transition-all"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-gray-900 dark:text-gray-100">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="truncate">{src.filename}</span>
                </div>
              </div>

              <div className="inline-block px-2 py-0.5 rounded-md bg-brand-100/70 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-[11px] font-bold">
                Page {src.page}
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic bg-white dark:bg-dark-surface p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                "{src.excerpt}"
              </p>

              <button
                onClick={() => onOpenSource(src.document_id, src.page)}
                className="w-full py-1.5 px-3 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Page {src.page}</span>
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
