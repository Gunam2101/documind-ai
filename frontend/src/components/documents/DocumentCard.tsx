import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageSquare, ExternalLink, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { Document } from '../../types';
import { Badge } from '../ui/Badge';
import { formatBytes, formatDate } from '../../lib/utils';
import { documentApi } from '../../services/documentApi';

export interface DocumentCardProps {
  document: Document;
  onDelete?: () => void;
  onRefresh?: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document: doc, onDelete, onRefresh }) => {
  const navigate = useNavigate();

  const handleStartChat = () => {
    navigate(`/chat?doc=${doc.id}`);
  };

  const handleOpenViewer = () => {
    navigate(`/documents/${doc.id}`);
  };

  const handleRetry = async () => {
    try {
      await documentApi.retry(doc.id);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete document "${doc.original_filename}"?`)) {
      try {
        await documentApi.delete(doc.id);
        if (onDelete) onDelete();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between gap-4 group">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 truncate">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h4
              onClick={handleOpenViewer}
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer truncate transition-colors"
              title={doc.original_filename}
            >
              {doc.original_filename}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {doc.page_count > 0 ? `${doc.page_count} pages` : 'PDF'} • {formatBytes(doc.file_size)}
            </p>
          </div>
        </div>

        <Badge status={doc.status} />
      </div>

      {/* Error Message Box if FAILED */}
      {doc.status === 'FAILED' && doc.processing_error && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-[11px] font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate" title={doc.processing_error}>{doc.processing_error}</span>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
        <span className="text-gray-400 text-[11px]">{formatDate(doc.created_at)}</span>

        <div className="flex items-center gap-1">
          {doc.status === 'READY' && (
            <>
              <button
                onClick={handleStartChat}
                className="px-2.5 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>
              <button
                onClick={handleOpenViewer}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="View PDF"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          )}

          {doc.status === 'FAILED' && (
            <button
              onClick={handleRetry}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 font-medium hover:bg-amber-100 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}

          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Delete Document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
