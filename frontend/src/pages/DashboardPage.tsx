import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { FileText, Plus, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { documentApi } from '../services/documentApi';
import { Document } from '../types';
import { Modal } from '../components/ui/Modal';
import { FileUploader } from '../components/documents/FileUploader';
import { cn } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadData = async () => {
    try {
      const docsRes = await documentApi.list();
      setDocuments(docsRes.documents);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto text-left">
        {/* Header Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Good morning, {user?.name || 'Learner'} 👋
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            What do you want to learn today?
          </p>
        </div>

        {/* Main Hero Upload Box */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#161c30] via-[#1b233c] to-[#121729] border border-[#212b45] shadow-2xl flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <FileText className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-md">
            <h2 className="text-xl font-extrabold text-white">
              Upload a document and start learning
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              PDF, Notes, Slides — your AI study assistant is ready
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-2 transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>+ Upload PDF</span>
          </button>
        </div>

        {/* Recent Documents Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Recent Documents</span>
            </h2>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs font-bold text-purple-400 hover:underline"
            >
              View all
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-44 rounded-2xl bg-[#161c30] border border-[#212b45]" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#161c30] border border-[#212b45] text-center space-y-3">
              <p className="text-xs text-gray-400">No documents uploaded yet.</p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow cursor-pointer"
              >
                Upload First PDF
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-4 shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-white truncate" title={doc.original_filename}>
                        {doc.original_filename}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {doc.page_count || 1} pages
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        doc.status === 'READY' ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"
                      )} />
                      <span className="text-[10px] font-bold text-gray-300">
                        {doc.status === 'READY' ? 'Processed - Ready' : 'Processing...'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/chat?doc=${doc.id}`)}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <span>Open & Learn</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload PDF Document" maxWidth="lg">
        <FileUploader
          onSuccess={() => {
            setIsUploadOpen(false);
            loadData();
          }}
        />
      </Modal>
    </DashboardLayout>
  );
};
