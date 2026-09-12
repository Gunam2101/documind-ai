import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageSquare, ExternalLink, Trash2 } from 'lucide-react';
import { Document } from '../../types';
import { Badge } from '../ui/Badge';
import { formatBytes, formatDate, formatTimeAgo } from '../../lib/utils';

export interface DocumentTableProps {
  documents: Document[];
  onDelete?: () => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({ documents, onDelete }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-dark-surface shadow-sm">
      <table className="w-full text-left border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 font-semibold uppercase text-[11px] bg-gray-50/50 dark:bg-dark-card/50">
            <th className="py-3.5 px-4 sm:px-6">Document</th>
            <th className="py-3.5 px-4 hidden sm:table-cell">Pages</th>
            <th className="py-3.5 px-4 hidden md:table-cell">Uploaded</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group">
              <td className="py-3.5 px-4 sm:px-6 font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer truncate font-semibold block"
                    >
                      {doc.original_filename}
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal sm:hidden">
                      {formatBytes(doc.file_size)}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-3.5 px-4 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                {doc.page_count > 0 ? `${doc.page_count} pages` : '—'}
              </td>
              <td className="py-3.5 px-4 hidden md:table-cell text-gray-500 dark:text-gray-400 text-xs">
                {formatTimeAgo(doc.created_at)}
              </td>
              <td className="py-3.5 px-4">
                <Badge status={doc.status} />
              </td>
              <td className="py-3.5 px-4 sm:px-6 text-right">
                <div className="flex items-center justify-end gap-1">
                  {doc.status === 'READY' && (
                    <>
                      <button
                        onClick={() => navigate(`/chat?doc=${doc.id}`)}
                        className="p-1.5 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                        title="Start Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Open PDF"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
