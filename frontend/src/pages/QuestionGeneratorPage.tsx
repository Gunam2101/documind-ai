import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Target, FileText, Sparkles, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { documentApi } from '../services/documentApi';
import { chatApi } from '../services/chatApi';
import { Document, IntelligenceResponse, CustomQuestion } from '../types';
import { cn } from '../lib/utils';

export const QuestionGeneratorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const docIdParam = searchParams.get('doc');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(docIdParam || '');
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Configuration State
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [questionType, setQuestionType] = useState<string>('mixed');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [marks, setMarks] = useState<string>('mixed');
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

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

  const generateQuestions = async () => {
    if (!selectedDocId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await chatApi.getIntelligence({
        document_id: selectedDocId,
        mode: 'custom_questions',
        num_questions: numQuestions,
        difficulty,
        marks
      });
      if (res.custom_questions && Array.isArray(res.custom_questions)) {
        setQuestions(res.custom_questions);
      } else {
        setError('No questions returned. Please retry.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to generate questions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      generateQuestions();
    }
  }, [selectedDocId]);

  const currentDoc = documents.find(d => d.id === selectedDocId);

  const toggleAnswer = (idx: number) => {
    setShowAnswers(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Context Top Bar */}
        <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="bg-[#0f1423] border border-[#212b45] text-sm font-bold text-white rounded-xl px-3 py-1 focus:outline-none cursor-pointer max-w-xs truncate"
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>{d.original_filename}</option>
                  ))}
                </select>
                <span className="text-xs font-semibold text-gray-400">
                  {currentDoc?.page_count || 1} pages
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ● Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Generator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Configuration Panel */}
          <div className="lg:col-span-4 bg-[#161c30] border border-[#212b45] rounded-2xl p-5 space-y-5 shadow-xl">
            <h2 className="text-base font-extrabold text-white">Configure Questions</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Number of Questions</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full bg-[#0f1423] border border-[#212b45] text-white rounded-xl p-2.5 font-medium focus:outline-none cursor-pointer"
                >
                  {[5, 10, 15, 20, 25].map(n => <option key={n} value={n}>{n} Questions</option>)}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full bg-[#0f1423] border border-[#212b45] text-white rounded-xl p-2.5 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="mixed">Mixed (MCQ + Short + Long)</option>
                  <option value="mcq">Multiple Choice Only</option>
                  <option value="short">Short Answer Only</option>
                  <option value="long">Long Answer Only</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-[#0f1423] border border-[#212b45] text-white rounded-xl p-2.5 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Marks</label>
                <select
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  className="w-full bg-[#0f1423] border border-[#212b45] text-white rounded-xl p-2.5 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="mixed">Mixed (2, 5, 10 marks)</option>
                  <option value="2">2 Marks Each</option>
                  <option value="5">5 Marks Each</option>
                  <option value="10">10 Marks Each</option>
                </select>
              </div>
            </div>

            <button
              onClick={generateQuestions}
              disabled={isLoading || !selectedDocId}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span>{isLoading ? 'Generating...' : 'Generate Questions'}</span>
            </button>
          </div>

          {/* Right Generated Questions Display */}
          <div className="lg:col-span-8 bg-[#161c30] border border-[#212b45] rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#212b45] pb-4">
              <h2 className="text-lg font-extrabold text-white">Generated Questions</h2>
              <span className="text-xs font-semibold text-gray-400">{questions.length} Questions Ready</span>
            </div>

            {isLoading ? (
              <div className="space-y-4 animate-pulse py-8">
                <div className="h-16 bg-[#212b45] rounded-xl w-full" />
                <div className="h-16 bg-[#212b45] rounded-xl w-full" />
                <div className="h-16 bg-[#212b45] rounded-xl w-full" />
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-2xl bg-[#0f1423] border border-[#212b45] space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-xs font-bold text-white leading-relaxed">
                        {qIdx + 1}. {q.question}
                      </p>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] font-extrabold shrink-0">
                        ({q.marks || 2} marks)
                      </span>
                    </div>

                    {showAnswers[qIdx] && (
                      <div className="p-3 rounded-xl bg-[#161c30] border border-[#212b45] text-xs text-gray-300 space-y-1">
                        <p className="font-extrabold text-indigo-400">Answer Key / Explanation:</p>
                        <p className="leading-relaxed font-medium">{q.explanation || q.model_answer || q.correct_answer || 'Refer to document context.'}</p>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => toggleAnswer(qIdx)}
                        className="px-3 py-1 rounded-lg bg-[#161c30] hover:bg-[#212b45] border border-[#212b45] text-[11px] font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {showAnswers[qIdx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-purple-400" />}
                        <span>{showAnswers[qIdx] ? 'Hide Answer' : 'Show Answer'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-gray-400">
                Click "Generate Questions" to create exam-friendly questions.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
