import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ArrowLeft, MessageSquare, Download, Sparkles, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { documentApi } from '../services/documentApi';
import { Document } from '../types';
import { Badge } from '../components/ui/Badge';
import { formatBytes, formatDate } from '../lib/utils';
import { StudyHubModal } from '../components/chat/StudyHubModal';
import { PDFViewerModal } from '../components/chat/PDFViewerModal';
import { TeachMeThisModal } from '../components/documents/TeachMeThisModal';

export const DocumentViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [isStudyHubOpen, setIsStudyHubOpen] = useState(false);
  const [isTeachMeOpen, setIsTeachMeOpen] = useState(false);
  const [pdfPageModal, setPdfPageModal] = useState<{ isOpen: boolean; page: number }>({
    isOpen: false,
    page: 1
  });

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      setError('');
      documentApi.get(id)
        .then(async (docData) => {
          setDoc(docData);
          try {
            const url = await documentApi.getPdfBlobUrl(id);
            setBlobUrl(url);
          } catch (e: any) {
            setError(e.message || 'Unable to load PDF preview.');
          }
        })
        .catch((e: any) => {
          setError(e.response?.data?.detail || 'Document not found.');
        })
        .finally(() => setIsLoading(false));
    }
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [id]);

  const handleDownload = async () => {
    if (!id || isDownloading) return;
    setIsDownloading(true);
    try {
      await documentApi.downloadPdf(id, doc?.original_filename);
    } catch (err: any) {
      alert(err.message || 'Unable to download PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!doc && !isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 space-y-4">
          <p className="text-gray-400 text-xs font-semibold">{error || 'Document not found.'}</p>
          <button onClick={() => navigate('/documents')} className="text-indigo-400 font-bold underline text-xs cursor-pointer">
            Back to Documents
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/documents')}
              className="p-2 rounded-xl text-gray-400 hover:bg-[#161c30] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white truncate">{doc?.original_filename}</h1>
                {doc && <Badge status={doc.status} />}
              </div>
              <p className="text-xs text-gray-400">
                {doc?.page_count} pages • {formatBytes(doc?.file_size || 0)} • Uploaded {doc && formatDate(doc.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTeachMeOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-amber-300 text-amber-300" />
              Teach Me
            </button>
            <button
              onClick={() => setIsStudyHubOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 fill-white" />
              Study Assistant
            </button>
            <button
              onClick={() => navigate(`/chat?doc=${doc?.id}`)}
              className="px-3.5 py-2 bg-[#161c30] border border-[#212b45] text-gray-200 hover:bg-[#1f2842] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Chat
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 border border-[#212b45] bg-[#161c30] rounded-xl text-gray-300 hover:text-white hover:bg-[#1f2842] transition-colors cursor-pointer disabled:opacity-40"
              title="Download PDF"
            >
              {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> : <Download className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* PDF Viewer Frame */}
        <div className="flex-1 w-full rounded-2xl overflow-hidden border border-[#212b45] bg-gray-900 shadow-md relative">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-purple-400 font-bold gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading PDF Document...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 text-red-300 text-xs">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span>{error}</span>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              title={doc?.original_filename}
              className="w-full h-full border-none"
            />
          ) : null}
        </div>
      </div>

      {/* Teach Me This Learning Path Modal */}
      {doc && (
        <TeachMeThisModal
          isOpen={isTeachMeOpen}
          onClose={() => setIsTeachMeOpen(false)}
          documentId={doc.id}
          documentTitle={doc.original_filename}
          onSelectTopicForChat={(topicTitle, explanation) => {
            navigate(`/chat?doc=${doc.id}`);
          }}
        />
      )}

      {/* AI Study Hub Modal */}
      {doc && (
        <StudyHubModal
          isOpen={isStudyHubOpen}
          onClose={() => setIsStudyHubOpen(false)}
          documentId={doc.id}
          filename={doc.original_filename}
          onOpenSourcePage={(_, page) => {
            setPdfPageModal({ isOpen: true, page });
          }}
        />
      )}

      {/* PDF Page Modal */}
      {doc && pdfPageModal.isOpen && (
        <PDFViewerModal
          isOpen={pdfPageModal.isOpen}
          onClose={() => setPdfPageModal(prev => ({ ...prev, isOpen: false }))}
          documentId={doc.id}
          filename={doc.original_filename}
          initialPage={pdfPageModal.page}
        />
      )}
    </DashboardLayout>
  );
};
