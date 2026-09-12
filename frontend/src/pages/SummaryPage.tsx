import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { FileText, Download, Brain, CheckCircle2, AlertCircle, RefreshCw, Layers, BookOpen, Check } from 'lucide-react';
import { documentApi } from '../services/documentApi';
import { chatApi } from '../services/chatApi';
import { Document, IntelligenceResponse, SummaryStructured } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

export const SummaryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const docIdParam = searchParams.get('doc');
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(docIdParam || '');
  const [summaryData, setSummaryData] = useState<IntelligenceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'main_topics' | 'key_concepts' | 'takeaways'>('overview');
  const [error, setError] = useState('');

  const fetchDocs = async () => {
    try {
      const res = await documentApi.list();
      setDocuments(res.documents);
      if (res.documents.length > 0 && !selectedDocId) {
        setSelectedDocId(res.documents[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSummary = async (docId: string) => {
    if (!docId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await chatApi.getIntelligence({ document_id: docId, mode: 'summary' });
      setSummaryData(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to generate document summary right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      fetchSummary(selectedDocId);
    }
  }, [selectedDocId]);

  const currentDoc = documents.find(d => d.id === selectedDocId);

  // Extract structured summary or attempt JSON parse fallback
  let structured: SummaryStructured | null = summaryData?.summary_structured || null;
  if (!structured && summaryData?.content) {
    try {
      const parsed = JSON.parse(summaryData.content);
      if (parsed.overview) {
        structured = parsed;
      }
    } catch (e) {
      // String format fallback
    }
  }

  const renderOverviewTab = () => {
    if (structured?.overview) {
      return (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#0f1423] border border-[#212b45] space-y-3">
            <h3 className="text-sm font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span>Executive Summary</span>
            </h3>
            <p className="text-xs text-gray-200 leading-relaxed font-medium">
              {structured.overview.executive_summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f1423] border border-[#212b45] space-y-2">
              <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Document Purpose</span>
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                {structured.overview.document_purpose}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f1423] border border-[#212b45] space-y-2">
              <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Overall Scope</span>
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                {structured.overview.scope}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-invert max-w-none text-xs text-gray-200 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {summaryData?.content || ''}
        </ReactMarkdown>
      </div>
    );
  };

  const renderMainTopicsTab = () => {
    const topics = structured?.main_topics || [];
    if (topics.length > 0) {
      return (
        <div className="space-y-3">
          <div className="text-xs font-extrabold text-gray-400 uppercase tracking-wider pb-2 border-b border-[#212b45]">
            Major Topics & Modules
          </div>
          <div className="space-y-3">
            {topics.map((t, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#0f1423] border border-[#212b45] flex items-start gap-4 transition-all hover:border-purple-500/30">
                <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                  {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </span>
                <div className="space-y-1 w-full">
                  <h4 className="text-xs font-extrabold text-white">{t.title}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-normal">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="py-8 text-center text-xs text-gray-400">
        No specific topics list found for this document.
      </div>
    );
  };

  const renderKeyConceptsTab = () => {
    const concepts = structured?.key_concepts || [];
    if (concepts.length > 0) {
      return (
        <div className="space-y-3">
          <div className="text-xs font-extrabold text-gray-400 uppercase tracking-wider pb-2 border-b border-[#212b45]">
            Important Concepts & Definitions
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {concepts.map((c, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#0f1423] border border-[#212b45] space-y-2">
                <h4 className="text-xs font-extrabold text-purple-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>{c.title}</span>
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                  {c.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="py-8 text-center text-xs text-gray-400">
        No key concepts list found for this document.
      </div>
    );
  };

  const renderTakeawaysTab = () => {
    const takeaways = structured?.key_takeaways || [];
    if (takeaways.length > 0) {
      return (
        <div className="space-y-3">
          <div className="text-xs font-extrabold text-gray-400 uppercase tracking-wider pb-2 border-b border-[#212b45]">
            Key Learning Takeaways
          </div>
          <div className="space-y-2.5">
            {takeaways.map((takeaway, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45] flex items-start gap-3 text-xs text-gray-200 font-medium">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="leading-relaxed">{takeaway}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="py-8 text-center text-xs text-gray-400">
        No key takeaways found for this document.
      </div>
    );
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!selectedDocId || isDownloading) return;
    setIsDownloading(true);
    try {
      await documentApi.downloadPdf(selectedDocId, currentDoc?.original_filename);
    } catch (err: any) {
      alert(err.message || 'Unable to download this PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Context Top Bar */}
        <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="bg-[#0f1423] border border-[#212b45] text-sm font-bold text-white rounded-xl px-3 py-1 focus:outline-none cursor-pointer max-w-xs truncate"
                >
                  {documents.length === 0 ? (
                    <option value="">No documents found</option>
                  ) : (
                    documents.map(d => (
                      <option key={d.id} value={d.id}>{d.original_filename}</option>
                    ))
                  )}
                </select>
                {currentDoc && (
                  <>
                    <span className="text-xs font-semibold text-gray-400">
                      {currentDoc.page_count} pages
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ● Ready
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSummary(selectedDocId)}
              disabled={isLoading || !selectedDocId}
              className="p-2 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-40"
              title="Regenerate Summary"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-purple-400")} />
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading || !selectedDocId}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-40"
            >
              <Download className={cn("w-3.5 h-3.5", isDownloading && "animate-spin")} />
              <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Main Summary Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sub Navigation Menu */}
          <div className="lg:col-span-3 bg-[#161c30] border border-[#212b45] rounded-2xl p-2 space-y-1 shadow-xl">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'main_topics', label: 'Main Topics' },
              { id: 'key_concepts', label: 'Key Concepts' },
              { id: 'takeaways', label: 'Key Takeaways' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border-l-4 border-purple-500 font-extrabold"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#0f1423]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Reading Pane */}
          <div className="lg:col-span-9 bg-[#161c30] border border-[#212b45] rounded-2xl p-6 shadow-xl space-y-6">
            {isLoading ? (
              <div className="space-y-4 py-8">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating document summary...</span>
                </div>
                <div className="space-y-3 animate-pulse">
                  <div className="h-6 bg-[#212b45] rounded-xl w-1/3" />
                  <div className="h-4 bg-[#212b45] rounded-xl w-full" />
                  <div className="h-4 bg-[#212b45] rounded-xl w-5/6" />
                  <div className="h-4 bg-[#212b45] rounded-xl w-4/6" />
                </div>
              </div>
            ) : error ? (
              <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-red-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Unable to generate this content right now.</span>
                </div>
                <button
                  onClick={() => fetchSummary(selectedDocId)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  Try Again
                </button>
              </div>
            ) : summaryData ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#212b45] pb-4">
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <span>
                      {activeTab === 'overview' && 'Overview'}
                      {activeTab === 'main_topics' && 'Main Topics'}
                      {activeTab === 'key_concepts' && 'Key Concepts'}
                      {activeTab === 'takeaways' && 'Key Takeaways'}
                    </span>
                  </h2>
                  <span className="text-xs font-bold text-gray-400">DocuMind AI Grounded</span>
                </div>

                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'main_topics' && renderMainTopicsTab()}
                {activeTab === 'key_concepts' && renderKeyConceptsTab()}
                {activeTab === 'takeaways' && renderTakeawaysTab()}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <p className="text-xs text-gray-400">Select a document to start learning.</p>
                <button
                  onClick={() => navigate('/documents')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  Choose Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
