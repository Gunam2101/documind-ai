import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, BookOpen, ShieldCheck } from 'lucide-react';
import { Message, SourceCitation } from '../../types';
import { CitationBadge } from '../ui/CitationBadge';
import { cn } from '../../lib/utils';

export interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onViewSources?: (sources: SourceCitation[]) => void;
  onOpenSourcePage?: (docId: string, page: number) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  onViewSources,
  onOpenSourcePage
}) => {
  const isUser = message.role === 'user';
  const rawSources = message.sources || [];

  // Deduplicate sources by page
  const uniqueSources = useMemo(() => {
    const map = new Map<number, SourceCitation>();
    rawSources.forEach(src => {
      if (!map.has(src.page)) {
        map.set(src.page, src);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.page - b.page);
  }, [rawSources]);

  // Clean raw markdown and sanitize literal HTML tags
  const getCleanedContent = (rawText: string) => {
    if (!rawText) return '';
    let cleaned = rawText.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/?(p|strong|em|b|i|ul|ol|li|div|span)[^>]*>/gi, '');
    cleaned = cleaned.replace(/\n\n\[(?:Source:\s*)?Page[^\]]*\]$/gi, '');
    cleaned = cleaned.replace(/\n\[(?:Source:\s*)?Page[^\]]*\]$/gi, '');
    cleaned = cleaned.replace(/\[Source:\s*Page\s*(\d+)\]/gi, '[Page $1]');
    return cleaned;
  };

  const processedContent = getCleanedContent(message.content);

  return (
    <div className={cn('flex gap-3 sm:gap-4 max-w-3xl mx-auto py-3 group', isUser && 'justify-end')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20 mt-1">
          <Sparkles className="w-4 h-4 fill-white" />
        </div>
      )}

      <div className={cn('space-y-2 max-w-[88%] sm:max-w-[90%]', isUser ? 'text-right' : 'text-left')}>
        {/* Author Header Label */}
        <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 px-1 flex items-center gap-2 justify-start">
          <span>{isUser ? 'You' : 'DocuMind AI'}</span>
          {!isUser && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              Document-grounded
            </span>
          )}
        </div>

        {/* Message Container */}
        <div
          className={cn(
            'p-4 sm:p-5 rounded-2xl text-sm shadow-sm transition-all',
            isUser
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-tr-xs leading-relaxed text-right'
              : 'bg-[#161c30] border border-[#212b45] text-gray-100 rounded-tl-xs'
          )}
        >
          {message.image_url && (
            <div className={cn("mb-3 overflow-hidden rounded-xl border border-indigo-400/30 max-w-sm", isUser && "ml-auto")}>
              <img src={message.image_url} alt="Uploaded attachment" className="w-full h-auto object-cover max-h-60 rounded-xl" />
            </div>
          )}
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-200">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0 leading-relaxed text-sm text-gray-200 font-normal">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-indigo-300">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-300">{children}</em>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-base font-bold text-white mt-4 mb-2 first:mt-0 pb-1 border-b border-[#212b45]">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-bold text-indigo-300 mt-3.5 mb-1.5 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-purple-300 mt-3 mb-1.5 first:mt-0">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-2.5 ml-4 space-y-1.5 list-disc text-sm text-gray-200">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2.5 ml-4 space-y-1.5 list-decimal text-sm text-gray-200">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed pl-1">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-purple-500 pl-3.5 py-1 my-3 bg-purple-950/20 rounded-r-xl text-xs italic text-purple-200">
                      {children}
                    </blockquote>
                  ),
                  code: ({ inline, className, children, ...props }: any) => {
                    return !inline ? (
                      <div className="my-3.5 rounded-xl bg-[#0f1423] text-gray-100 p-3.5 border border-[#212b45] overflow-x-auto text-xs font-mono shadow-inner">
                        <code>{children}</code>
                      </div>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded-md bg-[#0f1423] text-purple-300 border border-[#212b45] font-mono text-[12px]">
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className="my-3.5 overflow-x-auto rounded-xl border border-[#212b45]">
                      <table className="min-w-full divide-y divide-[#212b45] text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-[#0f1423] px-3.5 py-2.5 text-left font-semibold text-white">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3.5 py-2 border-t border-[#212b45] text-gray-200">{children}</td>
                  )
                }}
              >
                {processedContent}
              </ReactMarkdown>

              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-purple-400 rounded-full animate-pulse align-middle" />
              )}
            </div>
          )}

          {/* AI Response Quick Action Toolbar */}
          {!isUser && !isStreaming && (
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#212b45]/60 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigator.clipboard.writeText(message.content)}
                  className="px-2 py-1 rounded-lg bg-[#0f1423] hover:bg-[#1b233c] hover:text-white border border-[#212b45] flex items-center gap-1 transition-all cursor-pointer"
                  title="Copy AI response"
                >
                  <span>📋 Copy</span>
                </button>
              </div>

              {/* Translate Shortcuts */}
              <div className="flex items-center gap-1 bg-[#0f1423] p-0.5 rounded-lg border border-[#212b45]">
                <span className="px-1 text-[10px] text-gray-500 font-semibold">🌐 Translate:</span>
                {(['Tamil', 'Tanglish', 'English', 'Hindi'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      if (onViewSources) {
                        // Triggers translation in Ask AI prompt
                        const prompt = `Translate this response into ${lang}: "${message.content.substring(0, 150)}..."`;
                        window.dispatchEvent(new CustomEvent('documind:ask-ai-prompt', { detail: prompt }));
                      }
                    }}
                    className="px-1.5 py-0.5 rounded-md hover:bg-purple-600/30 hover:text-purple-300 font-medium text-[10px] transition-all cursor-pointer"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Compact Source Citation Badges */}
        {!isUser && uniqueSources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 px-1">
            <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-purple-400" /> Sources:
            </span>
            {uniqueSources.map((src, idx) => (
              <CitationBadge
                key={idx}
                page={src.page}
                documentId={src.document_id}
                filename={src.filename}
                onClick={(docId, page) => {
                  if (onOpenSourcePage) onOpenSourcePage(docId, page);
                  if (onViewSources) onViewSources(uniqueSources);
                }}
              />
            ))}

            <button
              onClick={() => onViewSources && onViewSources(uniqueSources)}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold hover:underline ml-1 cursor-pointer"
            >
              View all ({uniqueSources.length})
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-1 shadow-xs">
          U
        </div>
      )}
    </div>
  );
};
