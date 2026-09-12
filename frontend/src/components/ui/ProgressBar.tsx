import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export interface ProgressBarProps {
  progress?: number; // 0 - 100
  stage?: string;
  isError?: boolean;
  errorMessage?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress = 0,
  stage = 'Processing...',
  isError = false,
  errorMessage
}) => {
  const stages = [
    { name: 'Uploading', pct: 20 },
    { name: 'Extracting Text', pct: 40 },
    { name: 'Creating Chunks', pct: 60 },
    { name: 'Generating Embeddings', pct: 80 },
    { name: 'Indexing', pct: 95 },
    { name: 'Ready', pct: 100 }
  ];

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className={cn('text-gray-700 dark:text-gray-300', isError && 'text-red-500 font-semibold')}>
          {isError ? (errorMessage || 'Processing failed') : stage}
        </span>
        <span className="text-gray-500 font-semibold">{Math.min(100, Math.max(0, progress))}%</span>
      </div>

      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300 rounded-full',
            isError ? 'bg-red-500' : 'bg-brand-600'
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="grid grid-cols-6 gap-1 pt-1">
        {stages.map((s, idx) => {
          const isDone = progress >= s.pct;
          return (
            <div key={idx} className="flex flex-col items-center text-center">
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 mb-1" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-700 mb-1" />
              )}
              <span className={cn('text-[10px] hidden sm:block truncate w-full', isDone ? 'text-gray-900 dark:text-gray-200 font-medium' : 'text-gray-400 dark:text-gray-600')}>
                {s.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
