import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { documentApi } from '../../services/documentApi';
import { Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCw, AlertCircle } from 'lucide-react';

export interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  filename: string;
  initialPage?: number;
  totalPages?: number;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  documentId,
  filename,
  initialPage = 1,
  totalPages = 1
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && documentId) {
      setIsLoading(true);
      setError('');
      documentApi.getPdfBlobUrl(documentId)
        .then(setBlobUrl)
        .catch((err: any) => setError(err.message || 'Unable to load PDF preview.'))
        .finally(() => setIsLoading(false));
    }
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, documentId]);

  const handleDownload = async () => {
    if (!documentId || isDownloading) return;
    setIsDownloading(true);
    try {
      await documentApi.downloadPdf(documentId, filename);
    } catch (err: any) {
      alert(err.message || 'Unable to download PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={filename} maxWidth="4xl">
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-100 dark:bg-dark-card rounded-xl text-xs font-medium">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Page {currentPage} {totalPages > 0 ? `/ ${totalPages}` : ''}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 15))}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span>{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 15))}
              className="p-1.5 rounded-lg bg-white dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                window.location.href = `/chat?doc=${documentId}&page=${currentPage}`;
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Set Ask AI context to this exact page"
            >
              <span>💬 Ask about this page</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              {isDownloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-900 flex items-center justify-center relative">
          {isLoading ? (
            <div className="text-xs font-bold text-purple-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading PDF...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-xs text-red-300 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{error}</span>
            </div>
          ) : blobUrl ? (
            <iframe
              src={`${blobUrl}#page=${currentPage}`}
              title={filename}
              className="w-full h-full border-none"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            />
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
