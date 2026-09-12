import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText, Sparkles, CheckCircle2, HelpCircle, BookOpen,
  GraduationCap, BarChart2, Copy, Check, RefreshCw, AlertCircle,
  Award, RotateCcw, XCircle, ArrowRight, Layers, Target, Lightbulb,
  X, ExternalLink, Info, File, Layers3, ChevronDown, ChevronUp, Maximize2,
  PanelLeft, MessageSquare, Send, Bot, ShieldCheck, User, Printer, Download, Settings,
  Image as ImageIcon
} from 'lucide-react';
import { chatApi } from '../../services/chatApi';
import {
  IntelligenceMode, IntelligenceResponse, QuizQuestion, Flashcard, CustomQuestion,
  ImportantQuestion, ExamSection, InsightsData, Message, SourceCitation
} from '../../types';
import { CitationBadge } from '../ui/CitationBadge';
import { exportQuestionsToPDF } from '../../utils/pdfExport';
import { cn } from '../../lib/utils';

export type WorkspaceMode = IntelligenceMode | 'chat';

export interface StudyHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  filename: string;
  onOpenSourcePage?: (docId: string, page: number) => void;
}

export const StudyHubModal: React.FC<StudyHubModalProps> = ({
  isOpen,
  onClose,
  documentId,
  filename,
  onOpenSourcePage
}) => {
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('summary');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dataMap, setDataMap] = useState<Partial<Record<WorkspaceMode, IntelligenceResponse>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // --- Embedded Chat State ---
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'welcome',
      conversation_id: 'local',
      role: 'assistant',
      content: `Hello! I am DocuMind AI. I have indexed **${filename}**. Ask me any question about this document!`,
      created_at: new Date().toISOString()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachedImage, setChatAttachedImage] = useState<string | null>(null);
  const [chatLanguage, setChatLanguage] = useState<string>('auto');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // --- Quiz Runner State ---
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizParseError, setQuizParseError] = useState(false);
  const [quizNumQuestions, setQuizNumQuestions] = useState<number>(10);
  const [quizDifficulty, setQuizDifficulty] = useState<string>('mixed');

  // --- Real Exam State (40 Questions) ---
  const [examStarted, setExamStarted] = useState(false);
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);
  const [currentExamIndex, setCurrentExamIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examTerminated, setExamTerminated] = useState(false);
  const [examTerminatedReason, setExamTerminatedReason] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // --- Flashcards State ---
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // --- Custom Questions & PDF Question Generator State ---
  const [customNumQuestions, setCustomNumQuestions] = useState<number>(10);
  const [customDifficulty, setCustomDifficulty] = useState<string>('medium');
  const [customMarks, setCustomMarks] = useState<string>('mixed');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [includeAnswerKeyPdf, setIncludeAnswerKeyPdf] = useState<boolean>(true);
  const [showPrefPanel, setShowPrefPanel] = useState<boolean>(true);

  const handleDownloadPDF = (questionsToExport: any[]) => {
    const totalMarks = questionsToExport.reduce((acc, q) => acc + (q.marks || 5), 0);
    exportQuestionsToPDF({
      filename,
      numQuestions: questionsToExport.length,
      totalMarks,
      difficulty: customDifficulty,
      questionType: 'Mixed',
      includeAnswerKey: includeAnswerKeyPdf,
      questions: questionsToExport
    });
  };

  // --- Explain Simply State ---
  const [explainLevel, setExplainLevel] = useState<string>('college');
  const [explainLanguage, setExplainLanguage] = useState<string>('english');
  const [explainConcept, setExplainConcept] = useState<string>('');

  // --- Expandable Cards State ---
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  const toggleAnswer = (key: string) => {
    setExpandedAnswers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Listen for Fullscreen Exit during Real Exam
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (examStarted && !examSubmitted && !document.fullscreenElement) {
        setExamTerminated(true);
        setExamTerminatedReason('Fullscreen mode was exited during the exam.');
        setExamSubmitted(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [examStarted, examSubmitted]);

  const startRealExamFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
    setExamStarted(true);
    setExamSubmitted(false);
    setExamTerminated(false);
    setExamTerminatedReason('');
    setCurrentExamIndex(0);
    setExamAnswers({});
  };

  const fetchIntelligenceMode = async (mode: IntelligenceMode, options?: any) => {
    setIsLoading(true);
    setError('');

    try {
      const payload: any = { document_id: documentId, mode, ...options };
      const res = await chatApi.getIntelligence(payload);
      setDataMap(prev => ({ ...prev, [mode]: res }));

      if (mode === 'quiz') initializeQuizState(res);
      else if (mode === 'real_exam') initializeRealExamState(res);
      else if (mode === 'flashcards') initializeFlashcardsState(res);
      else if (mode === 'custom_questions') initializeCustomQuestionsState(res);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || `Unable to load ${mode.replace('_', ' ')}.`;
      setError(errMsg);
      if (mode === 'quiz' || mode === 'real_exam') setQuizParseError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeQuizState = (res: IntelligenceResponse) => {
    let questions: QuizQuestion[] = [];
    if (res.quiz_questions && Array.isArray(res.quiz_questions) && res.quiz_questions.length > 0) {
      questions = res.quiz_questions;
    }
    if (questions.length > 0) {
      setQuizQuestions(questions);
      setCurrentQuizIndex(0);
      setSelectedOption(null);
      setHasSubmitted(false);
      setUserAnswers({});
      setQuizCompleted(false);
      setQuizParseError(false);
    } else {
      setQuizParseError(true);
    }
  };

  const initializeRealExamState = (res: IntelligenceResponse) => {
    let questions: QuizQuestion[] = [];
    if (res.quiz_questions && Array.isArray(res.quiz_questions) && res.quiz_questions.length > 0) {
      questions = res.quiz_questions;
    }
    if (questions.length > 0) {
      setExamQuestions(questions);
      setExamStarted(false);
      setExamSubmitted(false);
      setExamTerminated(false);
      setCurrentExamIndex(0);
      setExamAnswers({});
    }
  };

  const initializeFlashcardsState = (res: IntelligenceResponse) => {
    let cards: Flashcard[] = [];
    if (res.flashcards && Array.isArray(res.flashcards) && res.flashcards.length > 0) {
      cards = res.flashcards;
    }
    if (cards.length > 0) {
      setFlashcards(cards);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    }
  };

  const initializeCustomQuestionsState = (res: IntelligenceResponse) => {
    if (res.custom_questions && Array.isArray(res.custom_questions) && res.custom_questions.length > 0) {
      setCustomQuestions(res.custom_questions);
    }
  };

  useEffect(() => {
    if (isOpen && documentId && activeMode !== 'chat') {
      if (!dataMap[activeMode as IntelligenceMode]) {
        fetchIntelligenceMode(activeMode as IntelligenceMode);
      }
    }
  }, [isOpen, documentId, activeMode]);

  useEffect(() => {
    if (activeMode === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeMode]);

  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setChatAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !chatAttachedImage) || isChatSending) return;

    const userMsgText = chatInput.trim() || (chatAttachedImage ? "Explain this image in detail." : "");
    const currentAttached = chatAttachedImage;
    setChatInput('');
    setChatAttachedImage(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      conversation_id: 'local',
      role: 'user',
      content: userMsgText,
      image_url: currentAttached,
      created_at: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsChatSending(true);

    try {
      const res = await chatApi.sendMessage({
        message: userMsgText,
        document_ids: [documentId],
        image_url: currentAttached || undefined,
        language: chatLanguage
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        conversation_id: res.conversation_id || 'local',
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        created_at: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          conversation_id: 'local',
          role: 'assistant',
          content: 'Something went wrong while fetching the answer. Please try again.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  if (!isOpen) return null;

  const currentResponse = dataMap[activeMode as IntelligenceMode];

  const categoryOverview: { id: IntelligenceMode; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'Summary', icon: <FileText className="w-4 h-4" /> },
    { id: 'key_points', label: 'Key Points', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'important_questions', label: 'Important Qs', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'exam_questions', label: 'Exam Questions', icon: <GraduationCap className="w-4 h-4" /> }
  ];

  const categoryStudy: { id: IntelligenceMode; label: string; icon: React.ReactNode }[] = [
    { id: 'study_notes', label: 'Study Notes', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'quiz', label: 'Practice Quiz', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'real_exam', label: 'Real Exam (40 Qs)', icon: <Award className="w-4 h-4 text-amber-400" /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" /> }
  ];

  const categoryTools: { id: IntelligenceMode; label: string; icon: React.ReactNode }[] = [
    { id: 'custom_questions', label: 'Custom Questions', icon: <Target className="w-4 h-4" /> },
    { id: 'explain_simply', label: 'Explain Simply', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights', icon: <Sparkles className="w-4 h-4" /> }
  ];

  const handleCopy = () => {
    if (currentResponse?.content) {
      navigator.clipboard.writeText(currentResponse.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCleanedMarkdown = (rawStr: string) => {
    if (!rawStr) return '';
    let text = rawStr.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/gi, '').trim();
    text = text.replace(/\[Source: Page (\d+)\]/gi, '[Page $1]');
    text = text.replace(/\[Page (\d+)\]/g, (match, p1) => ` **[Page ${p1}]** `);
    return text;
  };

  const calculateExamResults = () => {
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    examQuestions.forEach((q, idx) => {
      const userAns = examAnswers[idx];
      if (userAns === undefined || userAns === null) {
        unansweredCount++;
      } else {
        const letters = ['A', 'B', 'C', 'D'];
        let correctIdxStr = String(q.correct_answer || '0').trim();
        if (['A', 'B', 'C', 'D'].includes(correctIdxStr.toUpperCase())) {
          correctIdxStr = String(correctIdxStr.toUpperCase().charCodeAt(0) - 65);
        }
        if (userAns === correctIdxStr || (letters[Number(userAns)] && letters[Number(userAns)] === q.correct_answer)) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    const negativeMarks = wrongCount * 0.25;
    const finalScore = Math.max(0, correctCount - negativeMarks);
    const percentage = ((finalScore / 40) * 100).toFixed(1);
    const passed = finalScore >= 24;

    return { correctCount, wrongCount, unansweredCount, negativeMarks, finalScore, percentage, passed };
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0e19] text-gray-100 font-sans w-screen h-screen overflow-hidden animate-in fade-in duration-150">
      
      {/* ================= TOP APPLICATION HEADER ================= */}
      <div className="h-14 bg-[#161c30] border-b border-[#212b45] px-4 flex items-center justify-between shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Toggle Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="font-extrabold text-sm text-white tracking-wide hidden sm:inline">DocuMind Learning Workspace</span>
          </div>

          <span className="text-[#212b45] hidden sm:inline">|</span>

          <div className="flex items-center gap-2 text-xs text-gray-300 bg-[#0f1423] px-3 py-1 rounded-xl border border-[#212b45] max-w-xs truncate">
            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate font-medium">{filename}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI Grounded</span>
          </div>

          <button
            onClick={() => onOpenSourcePage?.(documentId, 1)}
            className="px-3 py-1.5 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">View PDF</span>
          </button>

          {activeMode !== 'chat' && (
            <button
              onClick={handleCopy}
              disabled={isLoading || !currentResponse}
              className="p-2 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-gray-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              title="Copy Content"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0f1423] hover:bg-red-500/20 hover:border-red-500/40 text-gray-400 hover:text-red-300 border border-[#212b45] transition-all cursor-pointer"
            title="Exit Workspace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= WORKSPACE MAIN BODY ================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= LEFT SIDEBAR NAVIGATION ================= */}
        <div
          className={cn(
            "bg-[#121729] border-r border-[#212b45] flex flex-col transition-all duration-200 shrink-0 select-none z-10",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
            <div>
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">Learning Tools</p>
              )}
              <div className="space-y-1">
                {[
                  { id: 'chat', label: 'Ask AI', icon: <MessageSquare className="w-4 h-4 text-indigo-400" /> },
                  { id: 'summary', label: 'Summary', icon: <FileText className="w-4 h-4 text-emerald-400" /> },
                  { id: 'study_notes', label: 'Study Notes', icon: <BookOpen className="w-4 h-4 text-blue-400" /> },
                  { id: 'custom_questions', label: 'Question Generator', icon: <Target className="w-4 h-4 text-purple-400" /> },
                  { id: 'quiz', label: 'Practice Quiz', icon: <BarChart2 className="w-4 h-4 text-amber-400" /> }
                ].map(item => {
                  const isActive = activeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMode(item.id as WorkspaceMode)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                        isActive
                          ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white font-bold border-l-4 border-purple-500 shadow-sm"
                          : "text-gray-400 hover:text-gray-200 hover:bg-[#161c30]"
                      )}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <span className={cn(isActive ? "text-purple-400" : "text-gray-400")}>{item.icon}</span>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTENT VIEWPORT ================= */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0e19]">
          
          {/* Main Area Wrapper */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            
            {/* Left Content Column */}
            <div className="lg:col-span-8 p-6 overflow-y-auto space-y-6 scrollbar-thin">
              
              {/* Skeleton Loading State */}
              {isLoading && (
                <div className="space-y-4 animate-pulse p-6 rounded-2xl bg-[#161c30] border border-[#212b45]">
                  <div className="h-6 bg-[#212b45] rounded-xl w-1/3" />
                  <div className="h-4 bg-[#212b45] rounded-xl w-2/3" />
                  <div className="space-y-2 pt-4">
                    <div className="h-4 bg-[#212b45] rounded-xl w-full" />
                    <div className="h-4 bg-[#212b45] rounded-xl w-5/6" />
                    <div className="h-4 bg-[#212b45] rounded-xl w-4/6" />
                  </div>
                  <p className="text-xs text-purple-400 font-semibold pt-2 animate-bounce">
                    Analyzing document and generating {String(activeMode).replace('_', ' ')}...
                  </p>
                </div>
              )}

              {/* Error Indicator */}
              {error && !isLoading && activeMode !== 'chat' && (
                <div className="p-4 rounded-2xl bg-red-900/20 border border-red-500/30 flex items-start gap-3 text-red-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-red-200">Unable to generate section</p>
                    <p className="mt-1 opacity-90">{error}</p>
                    <button
                      onClick={() => fetchIntelligenceMode(activeMode as IntelligenceMode)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-semibold cursor-pointer"
                    >
                      Retry Generation
                    </button>
                  </div>
                </div>
              )}

              {/* ================= EMBEDDED ASK AI CHAT ================= */}
              {activeMode === 'chat' && (
                <div className="h-full flex flex-col justify-between space-y-4">
                  <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin pr-2">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={cn("flex gap-3 max-w-3xl", msg.role === 'user' ? "ml-auto justify-end" : "mr-auto")}>
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div className="space-y-1.5 max-w-[85%]">
                          <div className="text-[10px] text-gray-500 font-bold px-1">
                            {msg.role === 'user' ? 'You' : 'DocuMind AI'}
                          </div>
                          <div className={cn(
                            "p-4 rounded-2xl text-xs leading-relaxed border space-y-2",
                            msg.role === 'user'
                              ? "bg-indigo-600 text-white border-indigo-500 text-right font-medium"
                              : "bg-[#161c30] text-gray-200 border-[#212b45]"
                          )}>
                            {msg.image_url && (
                              <div className={cn("overflow-hidden rounded-xl border border-indigo-400/30 max-w-xs", msg.role === 'user' && "ml-auto")}>
                                <img src={msg.image_url} alt="Attachment" className="w-full h-auto object-cover max-h-48 rounded-lg" />
                              </div>
                            )}
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="text-[10px] text-gray-500 font-bold">Sources:</span>
                              {msg.sources.map((src, sIdx) => (
                                <CitationBadge key={sIdx} page={src.page} documentId={src.document_id} onClick={onOpenSourcePage} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Sticky Chat Input Bar */}
                  <div className="sticky bottom-0 pt-2 bg-[#0b0e19] space-y-2">
                    {chatAttachedImage && (
                      <div className="relative inline-block border border-indigo-500/40 rounded-xl overflow-hidden bg-gray-900/50 p-1">
                        <img src={chatAttachedImage} alt="Attachment preview" className="h-16 w-auto object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setChatAttachedImage(null)}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700 cursor-pointer"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSendChatMessage} className="relative flex items-center">
                      <input
                        type="file"
                        ref={chatFileInputRef}
                        accept="image/*"
                        onChange={handleChatImageSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => chatFileInputRef.current?.click()}
                        className="absolute left-3 p-1.5 text-gray-400 hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                        title="Attach image (textbook, diagram, flowchart, chart, note)"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={chatAttachedImage ? "Ask AI teacher about this image..." : `Ask AI teacher anything about ${filename}...`}
                        className="w-full bg-[#161c30] border border-[#212b45] rounded-2xl pl-10 pr-36 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 shadow-xl"
                      />
                      <div className="absolute right-2 flex items-center gap-1.5">
                        <select
                          value={chatLanguage}
                          onChange={(e) => setChatLanguage(e.target.value)}
                          className="px-2 py-1 bg-[#0f1423] border border-[#212b45] text-[11px] rounded-xl font-semibold text-gray-300 focus:outline-none cursor-pointer"
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
                          disabled={(!chatInput.trim() && !chatAttachedImage) || isChatSending}
                          className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-40 cursor-pointer shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ================= PRACTICE QUIZ TAB ================= */}
              {activeMode === 'quiz' && !isLoading && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Questions Count</label>
                        <select
                          value={quizNumQuestions}
                          onChange={(e) => setQuizNumQuestions(Number(e.target.value))}
                          className="bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                        >
                          {[5, 10, 15, 20, 25, 30, 40].map(n => <option key={n} value={n}>{n} Questions</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Difficulty</label>
                        <select
                          value={quizDifficulty}
                          onChange={(e) => setQuizDifficulty(e.target.value)}
                          className="bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="mixed">Mixed</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => fetchIntelligenceMode('quiz', { num_questions: quizNumQuestions, difficulty: quizDifficulty })}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate Practice Quiz</span>
                    </button>
                  </div>

                  {quizQuestions.length > 0 && !quizCompleted && (
                    <div className="p-6 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-6 shadow-xl">
                      <div className="flex items-center justify-between border-b border-[#212b45] pb-4">
                        <span className="text-xs font-bold text-indigo-400">Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                        <CitationBadge page={quizQuestions[currentQuizIndex].page} documentId={documentId} onClick={onOpenSourcePage} />
                      </div>

                      <h3 className="text-base font-semibold text-white leading-relaxed">
                        {quizQuestions[currentQuizIndex].question}
                      </h3>

                      <div className="space-y-3">
                        {quizQuestions[currentQuizIndex].options.map((opt, optIdx) => {
                          const optKey = String(optIdx);
                          const isSelected = selectedOption === optKey;
                          const correctStr = String(quizQuestions[currentQuizIndex].correct_answer || '0').trim();

                          let buttonStyle = "border-[#212b45] bg-[#0f1423] hover:border-indigo-500/50 text-gray-200";
                          if (hasSubmitted) {
                            if (optKey === correctStr || opt.startsWith(['A', 'B', 'C', 'D'][Number(correctStr)] || 'X')) {
                              buttonStyle = "border-emerald-500 bg-emerald-950/40 text-emerald-200 font-bold";
                            } else if (isSelected) {
                              buttonStyle = "border-red-500 bg-red-950/40 text-red-200 font-bold";
                            }
                          } else if (isSelected) {
                            buttonStyle = "border-indigo-500 bg-indigo-950/40 text-indigo-200 font-bold";
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={hasSubmitted}
                              onClick={() => setSelectedOption(optKey)}
                              className={cn(
                                "w-full text-left p-4 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer",
                                buttonStyle
                              )}
                            >
                              <span>{opt}</span>
                              {hasSubmitted && (optKey === correctStr || opt.startsWith(['A', 'B', 'C', 'D'][Number(correctStr)] || 'X')) && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                              {hasSubmitted && isSelected && !(optKey === correctStr || opt.startsWith(['A', 'B', 'C', 'D'][Number(correctStr)] || 'X')) && (
                                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {hasSubmitted && (
                        <div className="p-4 rounded-xl bg-[#0f1423] border border-[#212b45] space-y-2">
                          <p className="text-xs font-bold text-indigo-300">Explanation:</p>
                          <p className="text-xs text-gray-300 leading-relaxed">{quizQuestions[currentQuizIndex].explanation}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-[#212b45]">
                        {!hasSubmitted ? (
                          <button
                            disabled={selectedOption === null}
                            onClick={() => {
                              if (selectedOption !== null) {
                                setHasSubmitted(true);
                                setUserAnswers(prev => ({ ...prev, [currentQuizIndex]: selectedOption }));
                              }
                            }}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                          >
                            Submit Answer
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (currentQuizIndex < quizQuestions.length - 1) {
                                setCurrentQuizIndex(prev => prev + 1);
                                setSelectedOption(null);
                                setHasSubmitted(false);
                              } else {
                                setQuizCompleted(true);
                              }
                            }}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                          >
                            <span>{currentQuizIndex < quizQuestions.length - 1 ? 'Next Question' : 'View Quiz Summary'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {quizCompleted && (
                    <div className="p-8 rounded-2xl bg-[#161c30] border border-[#212b45] text-center space-y-6 shadow-xl">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                        <Award className="w-8 h-8" />
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-white">Practice Quiz Completed!</h3>
                        <p className="text-xs text-gray-400 mt-1">Here is your performance summary for this session.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                        <div className="p-4 rounded-xl bg-[#0f1423] border border-[#212b45]">
                          <p className="text-[11px] font-bold text-gray-400">Score</p>
                          <p className="text-xl font-black text-indigo-400">
                            {Object.entries(userAnswers).filter(([idx, ans]) => {
                              const q = quizQuestions[Number(idx)];
                              return q && (ans === String(q.correct_answer) || ans === '0');
                            }).length} / {quizQuestions.length}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0f1423] border border-[#212b45]">
                          <p className="text-[11px] font-bold text-gray-400">Accuracy</p>
                          <p className="text-xl font-black text-purple-400">
                            {Math.round((Object.entries(userAnswers).filter(([idx, ans]) => {
                              const q = quizQuestions[Number(idx)];
                              return q && (ans === String(q.correct_answer) || ans === '0');
                            }).length / quizQuestions.length) * 100)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-4">
                        <button
                          onClick={() => {
                            setCurrentQuizIndex(0);
                            setSelectedOption(null);
                            setHasSubmitted(false);
                            setUserAnswers({});
                            setQuizCompleted(false);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#212b45] hover:bg-[#2c395c] text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Retry Quiz</span>
                        </button>

                        <button
                          onClick={() => fetchIntelligenceMode('quiz', { num_questions: quizNumQuestions, difficulty: quizDifficulty })}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Regenerate Quiz</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= REAL EXAM TAB (40 QUESTIONS) ================= */}
              {activeMode === 'real_exam' && !isLoading && (
                <div className="space-y-6">
                  {!examStarted && !examSubmitted && (
                    <div className="p-8 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-6 shadow-xl">
                      <div className="flex items-center gap-3 border-b border-[#212b45] pb-4">
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">Official Real Exam Mode (40 Questions)</h3>
                          <p className="text-xs text-gray-400">Distraction-free formal test environment grounded in your document.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Questions</p>
                          <p className="text-lg font-black text-white">40 MCQs</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Marks</p>
                          <p className="text-lg font-black text-indigo-400">+1 / -0.25</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Pass Mark</p>
                          <p className="text-lg font-black text-emerald-400">24 / 40 (60%)</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Mode</p>
                          <p className="text-lg font-black text-purple-400">Fullscreen</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>Exam Rules & Fullscreen Notice:</span>
                        </p>
                        <ul className="list-disc ml-5 space-y-1 opacity-90">
                          <li>The Real Exam runs in Fullscreen mode.</li>
                          <li>Exiting fullscreen during the exam will automatically terminate the exam and evaluate submitted answers.</li>
                          <li>Incorrect answers deduct 0.25 marks. Unanswered questions award 0 marks.</li>
                        </ul>
                      </div>

                      <button
                        onClick={startRealExamFullscreen}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Maximize2 className="w-4 h-4" />
                        <span>Start Real Exam (Fullscreen)</span>
                      </button>
                    </div>
                  )}

                  {examStarted && !examSubmitted && examQuestions.length > 0 && (
                    <div className="space-y-5">
                      <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-[#212b45] pb-3">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                            <Award className="w-4 h-4" /> Question {currentExamIndex + 1} of 40
                          </span>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="text-emerald-400 font-semibold">+1 Correct</span>
                            <span>|</span>
                            <span className="text-red-400 font-semibold">-0.25 Wrong</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold text-gray-400 mb-2">Question Navigation Palette:</p>
                          <div className="grid grid-cols-10 gap-1.5">
                            {examQuestions.map((_, idx) => {
                              const isCurrent = currentExamIndex === idx;
                              const isAnswered = examAnswers[idx] !== undefined;

                              return (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentExamIndex(idx)}
                                  className={cn(
                                    "h-7 rounded-lg text-[11px] font-bold transition-all border cursor-pointer flex items-center justify-center",
                                    isCurrent
                                      ? "bg-purple-600 text-white border-purple-400 ring-2 ring-purple-500/50"
                                      : isAnswered
                                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                                        : "bg-[#0f1423] text-gray-400 border-[#212b45] hover:bg-[#1b233c]"
                                  )}
                                >
                                  {idx + 1}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-6 shadow-xl">
                        <h3 className="text-base font-semibold text-white leading-relaxed">
                          {examQuestions[currentExamIndex].question}
                        </h3>

                        <div className="space-y-3">
                          {examQuestions[currentExamIndex].options.map((opt, optIdx) => {
                            const optKey = String(optIdx);
                            const isSelected = examAnswers[currentExamIndex] === optKey;

                            return (
                              <button
                                key={optIdx}
                                onClick={() => {
                                  setExamAnswers(prev => ({ ...prev, [currentExamIndex]: optKey }));
                                }}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer",
                                  isSelected
                                    ? "border-amber-500 bg-amber-950/30 text-amber-200 font-bold"
                                    : "border-[#212b45] bg-[#0f1423] hover:border-indigo-500/50 text-gray-200"
                                )}
                              >
                                <span>{opt}</span>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[#212b45]">
                          <button
                            disabled={currentExamIndex === 0}
                            onClick={() => setCurrentExamIndex(prev => prev - 1)}
                            className="px-4 py-2 rounded-xl bg-[#0f1423] border border-[#212b45] text-xs font-bold text-gray-300 disabled:opacity-40 cursor-pointer"
                          >
                            ← Previous
                          </button>

                          <button
                            onClick={() => setShowSubmitModal(true)}
                            className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold cursor-pointer"
                          >
                            Submit Exam
                          </button>

                          <button
                            disabled={currentExamIndex === examQuestions.length - 1}
                            onClick={() => setCurrentExamIndex(prev => prev + 1)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showSubmitModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                      <div className="w-full max-w-md p-6 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-5 text-center shadow-2xl">
                        <h4 className="text-base font-bold text-white">Confirm Exam Submission</h4>
                        <p className="text-xs text-gray-300">Are you sure you want to submit your Real Exam answers?</p>

                        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                          <div className="p-3 rounded-xl bg-[#0f1423] border border-[#212b45]">
                            <p className="text-[10px] font-bold text-gray-400">Answered</p>
                            <p className="text-lg font-black text-emerald-400">{Object.keys(examAnswers).length} / 40</p>
                          </div>
                          <div className="p-3 rounded-xl bg-[#0f1423] border border-[#212b45]">
                            <p className="text-[10px] font-bold text-gray-400">Unanswered</p>
                            <p className="text-lg font-black text-amber-400">{40 - Object.keys(examAnswers).length}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-2">
                          <button
                            onClick={() => setShowSubmitModal(false)}
                            className="px-4 py-2 rounded-xl bg-[#212b45] text-gray-300 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setShowSubmitModal(false);
                              setExamSubmitted(true);
                              if (document.fullscreenElement && document.exitFullscreen) {
                                document.exitFullscreen().catch(() => {});
                              }
                            }}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 text-white text-xs font-bold cursor-pointer"
                          >
                            Submit Exam Now
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {examSubmitted && (
                    <div className="p-6 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-6 shadow-xl">
                      {examTerminated && (
                        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs space-y-1">
                          <p className="font-bold text-red-200 flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-400" /> EXAM TERMINATED
                          </p>
                          <p className="opacity-90">{examTerminatedReason}</p>
                        </div>
                      )}

                      {(() => {
                        const res = calculateExamResults();
                        return (
                          <div className="space-y-6">
                            <div className="text-center space-y-2">
                              <div className={cn(
                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider",
                                res.passed ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-red-500/10 border-red-500/40 text-red-400"
                              )}>
                                {res.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                <span>{res.passed ? 'PASSED ✓' : 'FAILED ✗'}</span>
                              </div>

                              <h3 className="text-3xl font-black text-white">{res.finalScore.toFixed(2)} / 40</h3>
                              <p className="text-xs text-gray-400">Percentage: <span className="text-indigo-300 font-bold">{res.percentage}%</span> (Pass Mark: 24 / 40)</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Correct (+1)</p>
                                <p className="text-lg font-black text-emerald-400">{res.correctCount}</p>
                              </div>
                              <div className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Wrong (-0.25)</p>
                                <p className="text-lg font-black text-red-400">{res.wrongCount}</p>
                              </div>
                              <div className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Unanswered</p>
                                <p className="text-lg font-black text-amber-400">{res.unansweredCount}</p>
                              </div>
                              <div className="p-3.5 rounded-xl bg-[#0f1423] border border-[#212b45]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Negative Marks</p>
                                <p className="text-lg font-black text-purple-400">-{res.negativeMarks.toFixed(2)}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => fetchIntelligenceMode('real_exam')}
                              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Retake Real Exam (Fresh 40 Questions)</span>
                            </button>

                            <div className="space-y-4 pt-4 border-t border-[#212b45]">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Question Review & Explanations:</h4>
                              <div className="space-y-3">
                                {examQuestions.map((q, idx) => {
                                  const userAns = examAnswers[idx];
                                  const letters = ['A', 'B', 'C', 'D'];
                                  let correctIdxStr = String(q.correct_answer || '0').trim();
                                  if (['A', 'B', 'C', 'D'].includes(correctIdxStr.toUpperCase())) {
                                    correctIdxStr = String(correctIdxStr.toUpperCase().charCodeAt(0) - 65);
                                  }
                                  const isCorrect = userAns === correctIdxStr || (letters[Number(userAns)] && letters[Number(userAns)] === q.correct_answer);
                                  const isUnanswered = userAns === undefined;

                                  return (
                                    <div key={idx} className="p-4 rounded-xl bg-[#0f1423] border border-[#212b45] space-y-2 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-300">Q{idx + 1}. {q.question}</span>
                                        <CitationBadge page={q.page} documentId={documentId} onClick={onOpenSourcePage} />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isUnanswered ? (
                                          <span className="text-amber-400 font-bold">Not Attempted</span>
                                        ) : isCorrect ? (
                                          <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Correct</span>
                                        ) : (
                                          <span className="text-red-400 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Incorrect</span>
                                        )}
                                      </div>
                                      <p className="text-gray-400 leading-relaxed"><strong className="text-indigo-300">Explanation:</strong> {q.explanation}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ================= IMPORTANT QUESTIONS TAB ================= */}
              {activeMode === 'important_questions' && !isLoading && (
                <div className="space-y-4">
                  {currentResponse?.important_questions && currentResponse.important_questions.length > 0 ? (
                    currentResponse.important_questions.map((item: ImportantQuestion, idx: number) => {
                      const key = `imp_${item.id || idx}`;
                      const isExpanded = expandedAnswers[key];
                      return (
                        <div key={idx} className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-3 shadow-lg">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#212b45] pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase">
                                {item.importance || 'HIGH IMPORTANCE'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                                {item.marks || 5} MARKS
                              </span>
                              <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                                {item.difficulty || 'Medium'}
                              </span>
                            </div>
                            <CitationBadge page={item.page} documentId={documentId} onClick={onOpenSourcePage} />
                          </div>

                          <h3 className="text-sm font-semibold text-white leading-relaxed">
                            {item.question}
                          </h3>

                          {item.expected_depth && (
                            <p className="text-[11px] text-gray-400 italic">
                              Expected Depth: <span className="text-gray-300">{item.expected_depth}</span>
                            </p>
                          )}

                          {item.model_answer && (
                            <div className="pt-2">
                              <button
                                onClick={() => toggleAnswer(key)}
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Model Answer' : 'View Model Answer'}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-3 p-4 rounded-xl bg-[#0f1423] border border-[#212b45] text-xs text-gray-200 leading-relaxed animate-in fade-in duration-150">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.model_answer}</ReactMarkdown>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] text-sm text-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{getCleanedMarkdown(currentResponse?.content || '')}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* ================= EXAM QUESTIONS TAB ================= */}
              {activeMode === 'exam_questions' && !isLoading && (
                <div className="space-y-6">
                  {currentResponse?.exam_sections && currentResponse.exam_sections.length > 0 ? (
                    currentResponse.exam_sections.map((section: ExamSection, secIdx: number) => (
                      <div key={secIdx} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-[#212b45]">
                          <GraduationCap className="w-5 h-5 text-indigo-400" />
                          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                            {section.marks} MARK QUESTIONS
                          </h3>
                        </div>

                        <div className="space-y-4">
                          {section.questions.map((item, qIdx) => {
                            const key = `exam_${secIdx}_${qIdx}`;
                            const isExpanded = expandedAnswers[key];
                            return (
                              <div key={qIdx} className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-3 shadow-lg">
                                <div className="flex items-center justify-between border-b border-[#212b45] pb-2">
                                  <span className="text-xs font-bold text-indigo-400">Q{qIdx + 1}. ({section.marks} Marks)</span>
                                  <CitationBadge page={item.page} documentId={documentId} onClick={onOpenSourcePage} />
                                </div>

                                <h4 className="text-sm font-semibold text-white leading-relaxed">{item.question}</h4>

                                {item.model_answer && (
                                  <div className="pt-2">
                                    <button
                                      onClick={() => toggleAnswer(key)}
                                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <span>{isExpanded ? 'Hide Model Answer' : 'View Model Answer'}</span>
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>

                                    {isExpanded && (
                                      <div className="mt-3 p-4 rounded-xl bg-[#0f1423] border border-[#212b45] text-xs text-gray-200 leading-relaxed animate-in fade-in duration-150">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.model_answer}</ReactMarkdown>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] text-sm text-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{getCleanedMarkdown(currentResponse?.content || '')}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* ================= FLASHCARDS TAB ================= */}
              {activeMode === 'flashcards' && !isLoading && (
                <div className="space-y-6">
                  {flashcards.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                        <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                        <CitationBadge page={flashcards[currentCardIndex].page} documentId={documentId} onClick={onOpenSourcePage} />
                      </div>

                      <div
                        onClick={() => setShowAnswer(!showAnswer)}
                        className="min-h-[240px] p-8 rounded-3xl bg-gradient-to-br from-[#161c30] to-[#121729] border border-[#2d3a5d] shadow-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-purple-500/50 group"
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 mb-3">
                          {showAnswer ? 'Back (Answer)' : 'Front (Question / Term)'}
                        </span>

                        <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                          {showAnswer ? flashcards[currentCardIndex].answer : flashcards[currentCardIndex].question}
                        </p>

                        <p className="text-[11px] text-gray-500 mt-6 group-hover:text-purple-300 transition-colors">
                          Click card to flip 🔄
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          disabled={currentCardIndex === 0}
                          onClick={() => {
                            setCurrentCardIndex(prev => prev - 1);
                            setShowAnswer(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#161c30] border border-[#212b45] text-xs font-bold text-gray-300 disabled:opacity-40 cursor-pointer"
                        >
                          ← Previous
                        </button>

                        <button
                          onClick={() => setShowAnswer(!showAnswer)}
                          className="px-4 py-2 rounded-xl bg-[#212b45] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Flip Card
                        </button>

                        <button
                          disabled={currentCardIndex === flashcards.length - 1}
                          onClick={() => {
                            setCurrentCardIndex(prev => prev + 1);
                            setShowAnswer(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] text-sm text-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{getCleanedMarkdown(currentResponse?.content || '')}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* ================= CUSTOM QUESTIONS / PDF QUESTION GENERATOR ================= */}
              {activeMode === 'custom_questions' && !isLoading && (
                <div className="space-y-6">
                  {/* Preferences Panel */}
                  <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-[#212b45] pb-2.5">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">PDF Question Generator Settings</h4>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeAnswerKeyPdf}
                          onChange={(e) => setIncludeAnswerKeyPdf(e.target.checked)}
                          className="rounded border-[#212b45] text-indigo-600 focus:ring-indigo-500 bg-[#0f1423]"
                        />
                        <span>Include Answer Key in PDF</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Question Count</label>
                        <select
                          value={customNumQuestions}
                          onChange={(e) => setCustomNumQuestions(Number(e.target.value))}
                          className="w-full bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                        >
                          {[5, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n} Questions</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Difficulty</label>
                        <select
                          value={customDifficulty}
                          onChange={(e) => setCustomDifficulty(e.target.value)}
                          className="w-full bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="mixed">Mixed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Marks per Question</label>
                        <select
                          value={customMarks}
                          onChange={(e) => setCustomMarks(e.target.value)}
                          className="w-full bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                        >
                          <option value="2">2 Marks</option>
                          <option value="5">5 Marks</option>
                          <option value="10">10 Marks</option>
                          <option value="mixed">Mixed Marks</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Optional Focus Topic (e.g. Rational Agents)"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        className="flex-1 bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => fetchIntelligenceMode('custom_questions', {
                          num_questions: customNumQuestions,
                          difficulty: customDifficulty,
                          marks: customMarks,
                          topic: customTopic
                        })}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Generate Questions</span>
                      </button>
                    </div>
                  </div>

                  {/* Generated Questions List & Action Bar */}
                  {customQuestions.length > 0 ? (
                    <div className="space-y-4">
                      {/* Printable Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#161c30] border border-[#212b45]">
                        <div className="text-xs text-gray-300 font-semibold">
                          Generated <span className="text-indigo-400 font-bold">{customQuestions.length} Questions</span> ({customQuestions.reduce((acc, q) => acc + (q.marks || 5), 0)} Total Marks)
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleDownloadPDF(customQuestions)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Printable PDF</span>
                          </button>

                          <button
                            onClick={() => {
                              const qText = customQuestions.map((q, i) => `Q${i + 1}. ${q.question} (${q.marks || 5} Marks)\nModel Answer: ${q.model_answer || 'N/A'}\n`).join('\n');
                              navigator.clipboard.writeText(qText);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? 'Copied!' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => fetchIntelligenceMode('custom_questions', {
                              num_questions: customNumQuestions,
                              difficulty: customDifficulty,
                              marks: customMarks,
                              topic: customTopic
                            })}
                            className="px-3 py-1.5 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Cards */}
                      {customQuestions.map((q, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-[#212b45] pb-2">
                            <span className="text-xs font-bold text-indigo-400">Q{idx + 1}. ({q.marks || 5} Marks)</span>
                            <CitationBadge page={q.page} documentId={documentId} onClick={onOpenSourcePage} />
                          </div>
                          <h4 className="text-sm font-semibold text-white leading-relaxed">{q.question}</h4>
                          {q.model_answer && (
                            <div className="p-3 rounded-xl bg-[#0f1423] text-xs text-gray-300 leading-relaxed border border-[#212b45]">
                              <strong className="text-indigo-300">Model Answer:</strong> {q.model_answer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] text-sm text-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{getCleanedMarkdown(currentResponse?.content || '')}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* ================= EXPLAIN SIMPLY TAB ================= */}
              {activeMode === 'explain_simply' && !isLoading && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Target Audience</label>
                        <select
                          value={explainLevel}
                          onChange={(e) => setExplainLevel(e.target.value)}
                          className="w-full bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                        >
                          <option value="school">School Student</option>
                          <option value="college">College Student</option>
                          <option value="beginner">Beginner</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Language</label>
                        <select
                          value={explainLanguage}
                          onChange={(e) => setExplainLanguage(e.target.value)}
                          className="w-full bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                        >
                          <option value="english">English</option>
                          <option value="tamil">Tamil (தமிழ்)</option>
                          <option value="tanglish">Tanglish (Tamil in English Script)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Concept to explain (e.g. Rational Agent)"
                        value={explainConcept}
                        onChange={(e) => setExplainConcept(e.target.value)}
                        className="flex-1 bg-[#0f1423] border border-[#212b45] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => fetchIntelligenceMode('explain_simply', {
                          target_level: explainLevel,
                          target_language: explainLanguage,
                          concept_query: explainConcept
                        })}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold cursor-pointer shrink-0"
                      >
                        Explain
                      </button>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] text-sm leading-relaxed text-gray-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{getCleanedMarkdown(currentResponse?.content || '')}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* ================= INSIGHTS TAB ================= */}
              {activeMode === 'insights' && !isLoading && (
                <div className="space-y-6">
                  {currentResponse?.insights ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-[#161c30] border border-[#212b45]">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Document Type</p>
                          <p className="text-sm font-bold text-indigo-300 mt-1">{currentResponse.insights.document_type}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#161c30] border border-[#212b45]">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Main Subject</p>
                          <p className="text-sm font-bold text-purple-300 mt-1">{currentResponse.insights.main_subject}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#161c30] border border-[#212b45]">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Difficulty</p>
                          <p className="text-sm font-bold text-amber-300 mt-1">{currentResponse.insights.difficulty}</p>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-3">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Core Topics Covered:</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentResponse.insights.core_topics.map((t, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs font-semibold">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-3">
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Key Takeaways:</h4>
                        <ul className="space-y-2 text-xs text-gray-300">
                          {currentResponse.insights.key_takeaways.map((kt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{kt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] text-sm text-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{getCleanedMarkdown(currentResponse?.content || '')}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* ================= STANDARD MARKDOWN (SUMMARY / NOTES) ================= */}
              {['summary', 'key_points', 'study_notes'].includes(activeMode as string) && !isLoading && (
                <div className="p-5 rounded-2xl bg-[#161c30] border border-[#212b45] text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none text-gray-200">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-xs sm:text-sm text-gray-300">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold text-indigo-300">{children}</strong>,
                      h1: ({ children }) => <h1 className="text-base font-bold my-3 text-white border-b border-[#212b45] pb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold my-3 text-indigo-400 border-b border-[#212b45] pb-1">{children}</h2>,
                      ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1.5">{children}</ul>,
                      ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1.5">{children}</ol>,
                      li: ({ children }) => <li className="pl-1 text-xs sm:text-sm text-gray-300 leading-relaxed">{children}</li>
                    }}
                  >
                    {getCleanedMarkdown(currentResponse?.content || '')}
                  </ReactMarkdown>
                </div>
              )}

            </div>

            {/* ================= RIGHT INFORMATION PANEL ================= */}
            <div className="lg:col-span-4 p-6 bg-[#0f1423] border-l border-[#212b45] overflow-y-auto space-y-5 scrollbar-thin hidden lg:block">
              
              {/* Quick Facts Card */}
              <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-3 shadow-lg">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Workspace Info</span>
                </h4>
                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex items-center justify-between py-1 border-b border-[#212b45]/60">
                    <span className="flex items-center gap-2 text-gray-400">
                      <File className="w-3.5 h-3.5 text-gray-400" /> Active Document
                    </span>
                    <span className="font-bold text-white truncate max-w-[130px]">{filename}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#212b45]/60">
                    <span className="flex items-center gap-2 text-gray-400">
                      <Target className="w-3.5 h-3.5 text-indigo-400" /> Active Mode
                    </span>
                    <span className="font-bold text-indigo-300 capitalize">{String(activeMode).replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Document Pages & Sources Card */}
              <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>Pages & Sources</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {[
                    { page: 1, text: 'An intelligent agent is an autonomous entity that perceives...' },
                    { page: 2, text: 'Rationality is measured by the performance measure that...' },
                    { page: 3, text: 'Space exploration uses AI agents for navigation...' }
                  ].map((srcItem, idx) => (
                    <div
                      key={idx}
                      onClick={() => onOpenSourcePage?.(documentId, srcItem.page)}
                      className="p-2.5 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <CitationBadge page={srcItem.page} documentId={documentId} onClick={onOpenSourcePage} variant={idx % 2 === 0 ? 'indigo' : 'purple'} />
                        <span className="text-[11px] text-gray-300 truncate group-hover:text-white transition-colors">
                          {srcItem.text}
                        </span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
