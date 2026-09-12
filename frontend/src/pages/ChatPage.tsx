import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { SourcePanel } from '../components/chat/SourcePanel';
import { MessageItem } from '../components/chat/MessageItem';
import { PDFViewerModal } from '../components/chat/PDFViewerModal';
import { StudyHubModal } from '../components/chat/StudyHubModal';
import { ExplainThisTooltip } from '../components/ui/ExplainThisTooltip';
import { TeachMeThisModal } from '../components/documents/TeachMeThisModal';
import { chatApi } from '../services/chatApi';
import { documentApi } from '../services/documentApi';
import { Conversation, Message, SourceCitation, Document } from '../types';
import { Send, Paperclip, FileText, Sparkles, AlertCircle, Eye, MoreVertical, ArrowLeft, Image as ImageIcon, X, Compass, Layers, BookOpen } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preSelectedDocId = searchParams.get('doc');
  const pageParam = searchParams.get('page');
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [answerStyle, setAnswerStyle] = useState<'auto' | 'quick' | '2_marks' | '5_marks' | '10_marks' | 'detailed'>('auto');
  const [pageContextNumber, setPageContextNumber] = useState<number | null>(pageParam ? parseInt(pageParam) : null);
  const [isSending, setIsSending] = useState(false);
  const [streamStage, setStreamStage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sources Panel & Modals State
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isStudyHubOpen, setIsStudyHubOpen] = useState(false);
  const [isTeachMeOpen, setIsTeachMeOpen] = useState(false);

  // PDF Viewer Modal State
  const [viewerModal, setViewerModal] = useState<{ isOpen: boolean; docId: string; filename: string; page: number }>({
    isOpen: false,
    docId: '',
    filename: '',
    page: 1
  });

  // Attached Documents
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(preSelectedDocId ? [preSelectedDocId] : []);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Custom Event Listener for prompt prefill (from Translate or Teach Me)
  useEffect(() => {
    const handleAskAiPrompt = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setInputMessage(customEvent.detail);
      }
    };
    window.addEventListener('documind:ask-ai-prompt', handleAskAiPrompt);
    return () => {
      window.removeEventListener('documind:ask-ai-prompt', handleAskAiPrompt);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const convs = await chatApi.listConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConv) {
        selectConversation(convs[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await documentApi.list();
      setAllDocs(res.documents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchDocs();
  }, []);

  useEffect(() => {
    if (allDocs.length > 0 && selectedDocIds.length > 0) {
      const validDocIds = selectedDocIds.filter(id => allDocs.some(d => d.id === id));
      if (validDocIds.length !== selectedDocIds.length) {
        setSelectedDocIds(validDocIds);
      }
    }
  }, [allDocs]);

  const selectConversation = async (id: string) => {
    try {
      const c = await chatApi.getConversation(id);
      setActiveConv(c);
      setMessages(c.messages);
      setSelectedDocIds(c.documents.map(d => d.id));
      
      // Collect last assistant sources
      const lastAssistant = [...c.messages].reverse().find(m => m.role === 'assistant' && m.sources && m.sources.length > 0);
      if (lastAssistant && lastAssistant.sources) {
        setSources(lastAssistant.sources);
      } else {
        setSources([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewChat = () => {
    setActiveConv(null);
    setMessages([]);
    setSources([]);
    setIsSourcesOpen(false);
    if (!preSelectedDocId) setSelectedDocIds([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachedImage) || isSending) return;

    const query = inputMessage.trim() || (attachedImage ? "Explain this image in detail." : "");
    const currentAttachedImage = attachedImage;
    setInputMessage('');
    setAttachedImage(null);
    setIsSending(true);

    // Optimistic User Message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConv?.id || '',
      role: 'user',
      content: query,
      image_url: currentAttachedImage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    setStreamStage("Analyzing document & visual content...");

    try {
      const res = await chatApi.sendMessage({
        conversation_id: activeConv?.id,
        document_ids: selectedDocIds,
        message: query,
        image_url: currentAttachedImage || undefined,
        language: selectedLanguage,
        answer_style: answerStyle,
        page_number: pageContextNumber || undefined
      });

      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        conversation_id: res.conversation_id,
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
      setSources(res.sources);
      if (res.sources.length > 0) setIsSourcesOpen(true);

      // Refresh conversations sidebar
      fetchConversations();
      if (!activeConv) {
        selectConversation(res.conversation_id);
      }
    } catch (err: any) {
      console.error("[ChatPage Error]:", err);
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.error?.message;

      let errorMsg = detail;
      if (!errorMsg) {
        if (status === 429) errorMsg = "Your AI provider rate limit has been reached. Please try again later.";
        else if (status === 503) errorMsg = "AI service is temporarily unavailable. Please try again.";
        else if (status === 504) errorMsg = "AI provider request timed out. Please try again.";
        else if (status === 404) errorMsg = "Document or conversation not found. Please select a valid document.";
        else if (status === 400) errorMsg = "Please enter a valid question or attach an image.";
        else errorMsg = "An unexpected server error occurred. Please try again.";
      }

      if (status === 404 || status === 403) {
        setActiveConv(null);
      }

      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        conversation_id: '',
        role: 'assistant',
        content: errorMsg,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsSending(false);
      setStreamStage(null);
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamStage]);

  const activeDocName = selectedDocIds.length === 1
    ? allDocs.find(d => d.id === selectedDocIds[0])?.original_filename || 'Selected Document'
    : selectedDocIds.length > 1
    ? `${selectedDocIds.length} Documents Selected`
    : 'All Knowledge Base';

  return (
    <div className="h-screen flex bg-[#0b0e19] text-gray-100 overflow-hidden font-sans">
      {/* 1st Column: Chat Sidebar */}
      <div className="hidden md:block shrink-0">
        <ChatSidebar
          conversations={conversations}
          activeId={activeConv?.id}
          onSelect={selectConversation}
          onNewChat={handleNewChat}
          onDelete={async (id) => {
            await chatApi.deleteConversation(id);
            fetchConversations();
            if (activeConv?.id === id) handleNewChat();
          }}
          onRename={async (id, title) => {
            await chatApi.updateTitle(id, title);
            fetchConversations();
          }}
        />
      </div>

      {/* 2nd Column: Center Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="h-16 px-6 border-b border-[#212b45] bg-[#161c30]/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 truncate">
            {/* Home Navigation Button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Back to Home Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Home</span>
            </button>

            <span className="text-[#212b45]">|</span>

            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="font-bold text-sm text-white truncate" title={activeDocName}>{activeDocName}</h2>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ● Ready
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedDocIds.length === 1 && (
              <>
                <button
                  onClick={() => setIsTeachMeOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Interactive Document Roadmap & Topic Lessons"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>✨ Teach Me This</span>
                </button>

                <button
                  onClick={() => setIsStudyHubOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 fill-white" />
                  Study Assistant
                </button>
              </>
            )}

            {sources.length > 0 && (
              <button
                onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5',
                  isSourcesOpen
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                )}
              >
                <span>Sources ({sources.length})</span>
              </button>
            )}

            {selectedDocIds.length === 1 && (
              <button
                onClick={() => {
                  const doc = allDocs.find(d => d.id === selectedDocIds[0]);
                  if (doc) navigate(`/documents/${doc.id}`);
                }}
                className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-dark-card text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hidden sm:flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                View PDF
              </button>
            )}
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-12">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-brand-500/20">
                <Sparkles className="w-8 h-8 fill-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Ask DocuMind AI anything</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your Multilingual AI Teacher is ready. Ask questions about your PDF or upload textbook images.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="w-full space-y-2 pt-2">
                {[
                  "Explain the main findings of this document.",
                  "Summarize key methodology and datasets used.",
                  "What are the primary conclusions reached?"
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(sample)}
                    className="w-full p-3 rounded-xl bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-brand-400 dark:hover:border-brand-500 text-left transition-all shadow-xs"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onViewSources={(srcs) => {
                  setSources(srcs);
                  setIsSourcesOpen(true);
                }}
                onOpenSourcePage={(docId, page) => {
                  const doc = allDocs.find(d => d.id === docId);
                  setViewerModal({
                    isOpen: true,
                    docId: docId,
                    filename: doc?.original_filename || 'PDF Document',
                    page: page
                  });
                }}
              />
            ))
          )}

          {/* Loading Stream Indicator */}
          {streamStage && (
            <div className="flex items-center gap-3 max-w-3xl mx-auto py-2 text-xs text-brand-600 dark:text-brand-400 font-semibold animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>{streamStage}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#121729]/95 backdrop-blur-md border-t border-[#212b45] shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Learning Context Indicator Badge */}
            <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
              {pageContextNumber ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 font-medium">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="truncate max-w-[200px]">{activeDocName}</span>
                  <span className="text-indigo-400">•</span>
                  <span>Page {pageContextNumber}</span>
                  <span className="px-1.5 py-0.2 bg-indigo-800/80 text-[10px] font-bold rounded-md">🧠 Page Context</span>
                  <button
                    onClick={() => setPageContextNumber(null)}
                    className="ml-1 text-gray-400 hover:text-white cursor-pointer"
                    title="Clear page focus context"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : selectedDocIds.length > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 font-medium">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span className="truncate max-w-[220px]">{activeDocName}</span>
                  <span className="px-1.5 py-0.2 bg-purple-800/60 text-[10px] font-bold rounded-md">Document Context</span>
                </div>
              ) : null}

              {attachedImage && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-200 font-medium">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>🖼 Image Context Attached</span>
                </div>
              )}
            </div>

            {attachedImage && (
              <div className="relative inline-block border border-indigo-500/40 rounded-xl overflow-hidden bg-gray-900/50 p-1">
                <img src={attachedImage} alt="Attachment preview" className="h-16 w-auto object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700 cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 p-1.5 text-gray-400 hover:text-purple-400 rounded-lg transition-colors cursor-pointer"
                title="Attach image (textbook, diagram, flowchart, chart, note)"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                type="text"
                placeholder={attachedImage ? "Ask AI teacher about this image..." : "Send a message... (You can upload an image too)"}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSending}
                className="w-full pl-10 pr-64 py-3 bg-[#161c30] border border-[#212b45] rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 shadow-xl"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {/* Answer Style Dropdown */}
                <select
                  value={answerStyle}
                  onChange={(e) => setAnswerStyle(e.target.value as any)}
                  className="px-2 py-1 bg-[#0f1423] border border-[#212b45] text-[11px] rounded-xl font-bold text-indigo-300 focus:outline-none cursor-pointer"
                  title="Answer Format / Depth"
                >
                  <option value="auto">🎯 Style: Auto</option>
                  <option value="quick">⚡ Quick</option>
                  <option value="2_marks">📝 2 Marks</option>
                  <option value="5_marks">📄 5 Marks</option>
                  <option value="10_marks">📚 10 Marks</option>
                  <option value="detailed">🧠 Detailed</option>
                </select>

                {/* Language Selector */}
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-2 py-1 bg-[#0f1423] border border-[#212b45] text-[11px] rounded-xl font-bold text-gray-300 focus:outline-none cursor-pointer"
                  title="Response Language"
                >
                  <option value="auto">🌐 Auto</option>
                  <option value="english">English</option>
                  <option value="tamil">Tamil (தமிழ்)</option>
                  <option value="tanglish">Tanglish</option>
                  <option value="hindi">Hindi (हिंदी)</option>
                  <option value="telugu">Telugu (తెలుగు)</option>
                  <option value="malayalam">Malayalam (മലയാളം)</option>
                  <option value="kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                </select>
                <button
                  type="submit"
                  disabled={(!inputMessage.trim() && !attachedImage) || isSending}
                  className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white disabled:opacity-40 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Explain This Selection Tooltip */}
      <ExplainThisTooltip
        documentId={selectedDocIds[0]}
        onAskAI={(prompt) => setInputMessage(prompt)}
      />

      {/* 3rd Column: Right Sources Drawer */}
      <SourcePanel
        sources={sources}
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
        onOpenSource={(docId, page) => {
          const doc = allDocs.find(d => d.id === docId);
          setViewerModal({
            isOpen: true,
            docId: docId,
            filename: doc?.original_filename || 'PDF Document',
            page: page
          });
        }}
      />

      {/* Teach Me This Learning Path Modal */}
      {selectedDocIds.length === 1 && (
        <TeachMeThisModal
          isOpen={isTeachMeOpen}
          onClose={() => setIsTeachMeOpen(false)}
          documentId={selectedDocIds[0]}
          documentTitle={activeDocName}
          onSelectTopicForChat={(topicTitle, explanation) => {
            setInputMessage(`Teach me this topic step-by-step: "${topicTitle}". Explanation: ${explanation}`);
          }}
        />
      )}

      {/* PDF Page Viewer Modal */}
      {viewerModal.isOpen && (
        <PDFViewerModal
          isOpen={viewerModal.isOpen}
          onClose={() => setViewerModal(prev => ({ ...prev, isOpen: false }))}
          documentId={viewerModal.docId}
          filename={viewerModal.filename}
          initialPage={viewerModal.page}
        />
      )}

      {/* AI Study Hub Modal */}
      {selectedDocIds.length === 1 && (
        <StudyHubModal
          isOpen={isStudyHubOpen}
          onClose={() => setIsStudyHubOpen(false)}
          documentId={selectedDocIds[0]}
          filename={activeDocName}
          onOpenSourcePage={(docId, page) => {
            const doc = allDocs.find(d => d.id === docId);
            setViewerModal({
              isOpen: true,
              docId: docId,
              filename: doc?.original_filename || 'PDF Document',
              page: page
            });
          }}
        />
      )}
    </div>
  );
};
