import React, { useEffect, useState } from 'react';
import { Sparkles, BookOpen, Loader2, X, ChevronRight, Lightbulb, CheckCircle2 } from 'lucide-react';
import { chatApi } from '../../services/chatApi';
import { LearningPathStructured } from '../../types';
import { Button } from '../ui/Button';

interface TeachMeThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle?: string;
  onSelectTopicForChat?: (topicTitle: string, concept: string) => void;
}

export const TeachMeThisModal: React.FC<TeachMeThisModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  onSelectTopicForChat
}) => {
  const [loading, setLoading] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPathStructured | null>(null);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchLearningPath();
    }
  }, [isOpen, documentId]);

  const fetchLearningPath = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chatApi.getIntelligence({
        document_id: documentId,
        mode: 'learning_path'
      });
      if (res.learning_path_structured) {
        setLearningPath(res.learning_path_structured);
      } else {
        setError('Could not extract learning path for this document.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate learning path.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentTopic = learningPath?.topics[activeTopicIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-brand-50/50 via-white to-purple-50/30 dark:from-dark-surface dark:to-dark-surface">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/20">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-950/80 rounded-full border border-brand-200 dark:border-brand-800">
                  ✨ Interactive Learning Path
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                Teach Me This: {documentTitle || learningPath?.document_title || 'Document Guide'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-3">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                DocuMind AI Teacher is analyzing your document...
              </p>
              <p className="text-xs text-gray-500 max-w-md">
                Structuring core topics, key concepts, examples, and study takeaways in sequential order.
              </p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-3 text-red-500">
              <p className="text-sm font-semibold">{error}</p>
              <Button size="sm" onClick={fetchLearningPath}>
                Retry Generation
              </Button>
            </div>
          ) : (
            <>
              {/* Sidebar Navigation */}
              <div className="w-full md:w-72 bg-gray-50/80 dark:bg-dark-bg/60 border-r border-gray-100 dark:border-gray-800 p-4 overflow-y-auto max-h-[250px] md:max-h-none">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                  Learning Roadmap ({learningPath?.topics.length || 0} Modules)
                </p>
                <div className="space-y-1.5">
                  {learningPath?.topics.map((t, idx) => {
                    const isActive = idx === activeTopicIndex;
                    return (
                      <button
                        key={t.id || idx}
                        onClick={() => setActiveTopicIndex(idx)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-2.5 group cursor-pointer ${
                          isActive
                            ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                            : 'bg-white dark:bg-dark-surface/80 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800/80'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate leading-snug">{t.title}</p>
                          <p
                            className={`text-[11px] truncate mt-0.5 ${
                              isActive ? 'text-brand-100' : 'text-gray-400'
                            }`}
                          >
                            {t.key_concept}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Topic Detail Content */}
              {currentTopic && (
                <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between space-y-6">
                  <div className="space-y-5">
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 rounded-md border border-brand-200 dark:border-brand-800/50">
                          Module {activeTopicIndex + 1} of {learningPath?.topics.length}
                        </span>
                        <span className="text-xs text-gray-400">• Key Concept: {currentTopic.key_concept}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{currentTopic.title}</h3>
                    </div>

                    {/* Explanation */}
                    <div className="p-4 bg-gray-50 dark:bg-dark-bg/40 rounded-xl border border-gray-100 dark:border-gray-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-brand-500" /> Topic Explanation
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {currentTopic.explanation}
                      </p>
                    </div>

                    {/* Example Box */}
                    {currentTopic.example && (
                      <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-amber-500" /> Real-World Example
                        </h4>
                        <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                          {currentTopic.example}
                        </p>
                      </div>
                    )}

                    {/* Key Takeaway Points */}
                    {currentTopic.important_points && currentTopic.important_points.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Key Learning Points
                        </h4>
                        <ul className="space-y-2">
                          {currentTopic.important_points.map((pt, i) => (
                            <li
                              key={i}
                              className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-white dark:bg-dark-surface p-2.5 rounded-lg border border-gray-100 dark:border-gray-800"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeTopicIndex === 0}
                        onClick={() => setActiveTopicIndex((prev) => Math.max(0, prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeTopicIndex === (learningPath?.topics.length || 1) - 1}
                        onClick={() =>
                          setActiveTopicIndex((prev) =>
                            Math.min((learningPath?.topics.length || 1) - 1, prev + 1)
                          )
                        }
                      >
                        Next Topic
                      </Button>
                    </div>

                    {onSelectTopicForChat && (
                      <Button
                        size="sm"
                        onClick={() => {
                          onClose();
                          onSelectTopicForChat(currentTopic.title, currentTopic.explanation);
                        }}
                        className="gap-2 shadow-md shadow-brand-500/20"
                      >
                        <span>💬 Teach Me This Topic in Ask AI</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
