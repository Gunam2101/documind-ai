import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Search, Plus, FileText, MoreVertical, Trash2, Eye, ArrowRight, Download, Sparkles } from 'lucide-react';
import { documentApi } from '../services/documentApi';
import { Document } from '../types';
import { Modal } from '../components/ui/Modal';
import { FileUploader } from '../components/documents/FileUploader';
import { TeachMeThisModal } from '../components/documents/TeachMeThisModal';
import { cn } from '../lib/utils';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Ready' | 'Processing' | 'Failed' | 'Newest'>('All');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);
  const [teachMeModalDoc, setTeachMeModalDoc] = useState<{ id: string; title: string } | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await documentApi.list(search);
      setDocuments(res.documents);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [search]);

  useEffect(() => {
    const hasActiveProcessing = documents.some(
      d => d.status === 'UPLOADING' || d.status === 'PROCESSING'
    );
    if (hasActiveProcessing) {
      const timer = setInterval(() => {
        fetchDocs();
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [documents, search]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await documentApi.delete(id);
        fetchDocs();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (filterTab === 'Ready') return doc.status === 'READY';
    if (filterTab === 'Processing') return doc.status === 'PROCESSING' || doc.status === 'UPLOADING';
    if (filterTab === 'Failed') return doc.status === 'FAILED';
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Your Learning Library</h1>
            <p className="text-xs text-gray-400 font-medium">
              Upload, manage and learn from your documents.
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Upload PDF</span>
          </button>
        </div>

        {/* Toolbar: Search Bar + Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#161c30] p-4 rounded-2xl border border-[#212b45] shadow-lg">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#0f1423] border border-[#212b45] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {(['All', 'Ready', 'Processing', 'Failed', 'Newest'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                  filterTab === tab
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "bg-[#0f1423] text-gray-400 hover:text-white border border-[#212b45]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Document Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="h-48 rounded-2xl bg-[#161c30] border border-[#212b45]" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center bg-[#161c30] border border-[#212b45] rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No documents found</h3>
              <p className="text-xs text-gray-400">Upload your first PDF document to begin chatting and learning with AI.</p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Upload PDF</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-5 shadow-xl relative"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id)}
                        className="p-1.5 rounded-lg hover:bg-[#212b45] text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuDocId === doc.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-[#0f1423] border border-[#212b45] rounded-xl shadow-2xl p-1.5 z-20 space-y-1">
                          <button
                            onClick={async () => {
                              setActiveMenuDocId(null);
                              try {
                                await documentApi.viewPdf(doc.id);
                              } catch (err: any) {
                                alert(err.message || 'Unable to open PDF.');
                              }
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#161c30] rounded-lg cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-400" />
                            <span>View PDF</span>
                          </button>
                          <button
                            onClick={async () => {
                              setActiveMenuDocId(null);
                              try {
                                await documentApi.downloadPdf(doc.id, doc.original_filename);
                              } catch (err: any) {
                                alert(err.message || 'Unable to download PDF.');
                              }
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#161c30] rounded-lg cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Download PDF</span>
                          </button>
                          <button
                            onClick={() => { handleDelete(doc.id); setActiveMenuDocId(null); }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white truncate" title={doc.original_filename}>
                      {doc.original_filename}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                      {doc.page_count || 1} pages
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      doc.status === 'READY' ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"
                    )} />
                    <span className="text-xs font-semibold text-gray-300">
                      {doc.status === 'READY' ? '● Ready' : 'Processing...'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTeachMeModalDoc({ id: doc.id, title: doc.original_filename })}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-amber-600/30 hover:from-purple-600 hover:to-amber-600 border border-purple-500/40 text-purple-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Teach Me</span>
                  </button>

                  <button
                    onClick={() => navigate(`/chat?doc=${doc.id}`)}
                    className="py-2.5 rounded-xl bg-[#0f1423] hover:bg-indigo-600 border border-[#212b45] hover:border-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <span>Ask AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {teachMeModalDoc && (
        <TeachMeThisModal
          isOpen={!!teachMeModalDoc}
          onClose={() => setTeachMeModalDoc(null)}
          documentId={teachMeModalDoc.id}
          documentTitle={teachMeModalDoc.title}
          onSelectTopicForChat={(topicTitle, explanation) => {
            navigate(`/chat?doc=${teachMeModalDoc.id}`);
          }}
        />
      )}

      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload PDF Document" maxWidth="lg">
        <FileUploader
          onSuccess={() => {
            setIsUploadOpen(false);
            fetchDocs();
          }}
        />
      </Modal>
    </DashboardLayout>
  );
};

