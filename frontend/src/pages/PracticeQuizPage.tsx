import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { BarChart2, Clock, CheckCircle2, ArrowRight, ArrowLeft, RotateCcw, Award, AlertCircle } from 'lucide-react';
import { documentApi } from '../services/documentApi';
import { chatApi } from '../services/chatApi';
import { Document, QuizQuestion } from '../types';
import { cn } from '../lib/utils';

export const PracticeQuizPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const docIdParam = searchParams.get('doc');
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(docIdParam || '');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');

  // Quiz Timer State
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 minutes

  useEffect(() => {
    if (!isCompleted && questions.length > 0 && secondsLeft > 0) {
      const timer = setInterval(() => setSecondsLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isCompleted, questions, secondsLeft]);

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

  const fetchQuiz = async (docId: string) => {
    if (!docId) return;
    setIsLoading(true);
    setError('');
    setIsCompleted(false);
    setCurrentIndex(0);
    setUserAnswers({});
    setSecondsLeft(600);
    try {
      const res = await chatApi.getIntelligence({ document_id: docId, mode: 'quiz' });
      if (res.quiz_questions && Array.isArray(res.quiz_questions) && res.quiz_questions.length > 0) {
        setQuestions(res.quiz_questions);
      } else {
        setError('No quiz questions returned.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to generate quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      fetchQuiz(selectedDocId);
    }
  }, [selectedDocId]);

  const currentDoc = documents.find(d => d.id === selectedDocId);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `00:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectOption = (optIdx: number) => {
    setUserAnswers(prev => ({ ...prev, [currentIndex]: String(optIdx) }));
  };

  const currentQuestion = questions[currentIndex];

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      const correctStr = String(q.correct_answer || '0').trim();
      if (ans === correctStr || ans === '0') score++;
    });
    return score;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Top Context Header */}
        <div className="p-4 rounded-2xl bg-[#161c30] border border-[#212b45] flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              <BarChart2 className="w-5 h-5" />
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

          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-[#0f1423] hover:bg-red-500/20 hover:border-red-500/40 text-gray-300 hover:text-red-300 border border-[#212b45] text-xs font-bold transition-all cursor-pointer"
          >
            Exit Quiz
          </button>
        </div>

        {/* Main Quiz Section */}
        {isLoading ? (
          <div className="p-12 rounded-2xl bg-[#161c30] border border-[#212b45] animate-pulse space-y-4 text-center">
            <div className="h-6 bg-[#212b45] rounded-xl w-1/3 mx-auto" />
            <div className="h-4 bg-[#212b45] rounded-xl w-2/3 mx-auto" />
            <p className="text-xs text-purple-400 font-bold pt-4 animate-bounce">Generating practice quiz...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        ) : isCompleted ? (
          /* Quiz Results Summary Screen */
          <div className="p-8 rounded-3xl bg-[#161c30] border border-[#212b45] text-center space-y-6 shadow-2xl max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white">Quiz Completed!</h2>
              <p className="text-xs text-gray-400">Great job! Here is your performance breakdown.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#0f1423] border border-[#212b45] space-y-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Score</p>
                <p className="text-2xl font-black text-indigo-400">{calculateScore()} / {questions.length}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0f1423] border border-[#212b45] space-y-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Accuracy</p>
                <p className="text-2xl font-black text-purple-400">
                  {Math.round((calculateScore() / (questions.length || 1)) * 100)}%
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchQuiz(selectedDocId)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Practice Quiz</span>
            </button>
          </div>
        ) : questions.length > 0 && currentQuestion ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Question Box */}
            <div className="lg:col-span-8 bg-[#161c30] border border-[#212b45] rounded-2xl p-6 space-y-6 shadow-xl">
              {/* Question Header Status */}
              <div className="flex items-center justify-between border-b border-[#212b45] pb-4">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold text-indigo-400">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <div className="w-48 h-1.5 bg-[#0f1423] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f1423] border border-[#212b45] text-xs font-extrabold text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(secondsLeft)}</span>
                </div>
              </div>

              {/* Question Title */}
              <h2 className="text-sm font-extrabold text-white leading-relaxed">
                {currentQuestion.question}
              </h2>

              {/* Options Stack */}
              <div className="space-y-3">
                {currentQuestion.options.map((opt, optIdx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const isSelected = userAnswers[currentIndex] === String(optIdx);

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer",
                        isSelected
                          ? "border-purple-500 bg-purple-950/40 text-white shadow-md font-bold"
                          : "border-[#212b45] bg-[#0f1423] text-gray-300 hover:border-purple-500/50 hover:bg-[#1b233c]"
                      )}
                    >
                      <span className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0",
                        isSelected ? "bg-purple-600 text-white" : "bg-[#161c30] text-gray-400 border border-[#212b45]"
                      )}>
                        {letters[optIdx] || optIdx + 1}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-[#212b45]">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-xs font-bold text-gray-300 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCompleted(true)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>Submit Quiz</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Question Navigator Grid */}
            <div className="lg:col-span-4 bg-[#161c30] border border-[#212b45] rounded-2xl p-5 space-y-5 shadow-xl">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Question Navigator</h3>

              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((_, qIdx) => {
                  const isAnswered = userAnswers[qIdx] !== undefined;
                  const isCurrent = currentIndex === qIdx;

                  return (
                    <button
                      key={qIdx}
                      onClick={() => setCurrentIndex(qIdx)}
                      className={cn(
                        "w-9 h-9 rounded-xl font-extrabold text-xs flex items-center justify-center transition-all cursor-pointer shadow-sm",
                        isCurrent
                          ? "border-2 border-purple-500 bg-purple-950/60 text-white scale-105"
                          : isAnswered
                          ? "bg-purple-600 text-white"
                          : "bg-[#0f1423] text-gray-400 border border-[#212b45] hover:bg-[#1b233c]"
                      )}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="space-y-2 pt-3 border-t border-[#212b45] text-[11px] font-semibold text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-purple-500 bg-purple-950/60 inline-block" />
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#0f1423] border border-[#212b45] inline-block" />
                  <span>Not Answered</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};
