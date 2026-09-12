import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Loader2, X, Globe2 } from 'lucide-react';
import { chatApi } from '../../services/chatApi';
import { Button } from './Button';

interface ExplainThisTooltipProps {
  documentId?: string;
  onAskAI?: (prompt: string) => void;
}

export const ExplainThisTooltip: React.FC<ExplainThisTooltipProps> = ({ documentId, onAskAI }) => {
  const [selectedText, setSelectedText] = useState('');
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [language, setLanguage] = useState<'english' | 'tamil' | 'tanglish'>('english');

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isOpen) return; // don't move tooltip if modal open
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setTooltipPos(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 2 && text.length < 300) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSelectedText(text);
          setTooltipPos({
            x: Math.max(10, rect.left + rect.width / 2 - 60),
            y: Math.max(10, rect.top - 42 + window.scrollY)
          });
        }
      } else {
        setTooltipPos(null);
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
    };
  }, [isOpen]);

  const handleFetchExplanation = async (targetLang: 'english' | 'tamil' | 'tanglish' = language) => {
    if (!selectedText || !documentId) return;
    setIsOpen(true);
    setLoading(true);
    setExplanation(null);
    setLanguage(targetLang);

    try {
      const res = await chatApi.getIntelligence({
        document_id: documentId,
        mode: 'explain_simply',
        concept_query: selectedText,
        target_language: targetLang
      });
      setExplanation(res.content || 'No explanation available.');
    } catch (err) {
      setExplanation(`Failed to explain: ${err instanceof Error ? err.message : 'Error fetching explanation'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTooltipPos(null);
    setExplanation(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <>
      {/* Floating Selection Tooltip Badge */}
      {tooltipPos && !isOpen && (
        <div
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          className="fixed z-50 animate-in fade-in zoom-in-90 duration-150"
        >
          <button
            onClick={() => handleFetchExplanation(language)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-full shadow-lg border border-brand-500 hover:scale-105 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>✨ Explain This</span>
          </button>
        </div>
      )}

      {/* Explanation Modal / Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 dark:bg-brand-950/50 rounded-xl text-brand-600 dark:text-brand-400">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Teacher Explanation</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[280px]">"{selectedText}"</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Language Switcher Tabs */}
            <div className="flex items-center justify-between mt-3 mb-4 px-1">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5" /> Language:
              </span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-lg text-xs">
                {(['english', 'tamil', 'tanglish'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleFetchExplanation(lang)}
                    className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                      language === lang
                        ? 'bg-white dark:bg-brand-600 text-brand-600 dark:text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Content */}
            <div className="min-h-[140px] max-h-[300px] overflow-y-auto text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50/50 dark:bg-dark-bg/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800/80">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                  <p className="text-xs font-medium">DocuMind AI Teacher is crafting your explanation...</p>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{explanation}</div>
              )}
            </div>

            {/* Footer Action */}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close
              </Button>
              {onAskAI && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleClose();
                    onAskAI(`Tell me more about "${selectedText}"`);
                  }}
                  className="gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  Ask AI About This
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
