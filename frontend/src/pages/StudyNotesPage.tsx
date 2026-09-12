import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { BookOpen, Download, Copy, Check, Sparkles, FileText, AlertCircle, RefreshCw, Lightbulb, Bookmark, Globe } from 'lucide-react';
import { documentApi } from '../services/documentApi';
import { chatApi } from '../services/chatApi';
import { Document, IntelligenceResponse, StudyNotesStructured, StudyTopicNote } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

export const StudyNotesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const docIdParam = searchParams.get('doc');
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(docIdParam || '');
  const [targetLanguage, setTargetLanguage] = useState<string>('english');
  const [notesData, setNotesData] = useState<IntelligenceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);

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

  const fetchNotes = async (docId: string, lang: string = targetLanguage) => {
    if (!docId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await chatApi.getIntelligence({
        document_id: docId,
        mode: 'study_notes',
        target_language: lang
      });
      setNotesData(res);
      setSelectedTopicIdx(0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to generate study notes right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      fetchNotes(selectedDocId, targetLanguage);
    }
  }, [selectedDocId, targetLanguage]);

  const currentDoc = documents.find(d => d.id === selectedDocId);

  // Extract structured notes or attempt JSON parse fallback
  let structured: StudyNotesStructured | null = notesData?.study_notes_structured || null;
  if (!structured && notesData?.content) {
    try {
      const parsed = JSON.parse(notesData.content);
      if (parsed.topics) {
        structured = parsed;
      }
    } catch (e) {
      // Fallback
    }
  }

  const topicList: StudyTopicNote[] = structured?.topics || [];
  const currentTopic: StudyTopicNote | null = topicList[selectedTopicIdx] || (topicList.length > 0 ? topicList[0] : null);

  const handleCopy = () => {
    if (currentTopic) {
      const textToCopy = `
Topic: ${currentTopic.topic}
Definition: ${currentTopic.definition}
Important Points:
${currentTopic.important_points.map(p => `- ${p}`).join('\n')}
${currentTopic.example ? `Example: ${currentTopic.example}` : ''}
Remember: ${currentTopic.remember}
      `.trim();
      navigator.clipboard.writeText(textToCopy);
    } else if (notesData?.content) {
      navigator.clipboard.writeText(notesData.content);
    } else {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
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

                <div className="flex items-center gap-1.5 bg-[#0f1423] border border-[#212b45] rounded-xl px-2.5 py-1">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
                  >
                    <option value="english" className="bg-[#0f1423]">English</option>
                    <option value="tamil" className="bg-[#0f1423]">Tamil (தமிழ்)</option>
                    <option value="tanglish" className="bg-[#0f1423]">Tanglish</option>
                  </select>
                </div>

                {currentDoc && (
                  <span className="text-xs font-semibold text-gray-400">
                    {currentDoc.page_count} pages
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNotes(selectedDocId, targetLanguage)}
              disabled={isLoading || !selectedDocId}
              className="p-2 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-40"
              title="Regenerate Notes"
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

        {/* Digital Notebook Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Topic Navigation Menu */}
          <div className="lg:col-span-3 bg-[#161c30] border border-[#212b45] rounded-2xl p-2 space-y-1 shadow-xl">
            <div className="px-3 py-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              Document Topics
            </div>
            {topicList.length > 0 ? (
              topicList.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTopicIdx(idx)}
                  className={cn(
                    "w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer truncate",
                    selectedTopicIdx === idx
                      ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border-l-4 border-purple-500 font-extrabold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#0f1423]"
                  )}
                >
                  {t.topic}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">
                {isLoading ? "Extracting topics..." : "No topics found"}
              </div>
            )}
          </div>

          {/* Content Notebook Pane */}
          <div className="lg:col-span-9 bg-[#161c30] border border-[#212b45] rounded-2xl p-6 shadow-xl space-y-6 relative">
            {isLoading ? (
              <div className="space-y-4 py-8">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing your study notes...</span>
                </div>
                <div className="space-y-3 animate-pulse">
                  <div className="h-6 bg-[#212b45] rounded-xl w-1/3" />
                  <div className="h-4 bg-[#212b45] rounded-xl w-full" />
                  <div className="h-4 bg-[#212b45] rounded-xl w-5/6" />
                </div>
              </div>
            ) : error ? (
              <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-red-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Unable to generate study notes right now.</span>
                </div>
                <button
                  onClick={() => fetchNotes(selectedDocId, targetLanguage)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  Try Again
                </button>
              </div>
            ) : currentTopic ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#212b45] pb-4">
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span>{currentTopic.topic}</span>
                  </h2>

                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Topic Notes'}</span>
                  </button>
                </div>

                {/* Definition Card */}
                <div className="p-4 rounded-2xl bg-[#0f1423] border border-[#212b45] space-y-2">
                  <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">
                    Definition & Core Explanation
                  </h3>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">
                    {currentTopic.definition}
                  </p>
                </div>

                {/* Important Points Callout Box (Amber Theme) */}
                {currentTopic.important_points && currentTopic.important_points.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4 shrink-0" />
                      <span>Important Study Points</span>
                    </div>
                    <ul className="text-xs text-amber-100 space-y-2 pl-5 list-disc font-medium leading-relaxed">
                      {currentTopic.important_points.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Example Card (Purple Theme) */}
                {currentTopic.example && (
                  <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/40 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-extrabold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Real-World Scenario / Example</span>
                    </div>
                    <p className="text-xs text-purple-100 leading-relaxed font-medium">
                      {currentTopic.example}
                    </p>
                  </div>
                )}

                {/* Remember Box (Emerald Memory Aid Theme) */}
                {currentTopic.remember && (
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                      <Bookmark className="w-4 h-4 shrink-0" />
                      <span>Key Memory Aid / Remember</span>
                    </div>
                    <p className="text-xs text-emerald-100 leading-relaxed font-semibold">
                      {currentTopic.remember}
                    </p>
                  </div>
                )}
              </div>
            ) : notesData ? (
              <div className="prose prose-invert max-w-none text-xs text-gray-200 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {notesData.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <p className="text-xs text-gray-400">Select a document to view study notes.</p>
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
