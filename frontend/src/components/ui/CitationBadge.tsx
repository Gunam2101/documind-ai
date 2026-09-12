import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CitationBadgeProps {
  page: number | string;
  documentId?: string;
  filename?: string;
  variant?: 'brand' | 'indigo' | 'blue' | 'emerald' | 'amber' | 'purple';
  onClick?: (docId: string, page: number) => void;
  className?: string;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  page,
  documentId = '',
  filename,
  variant = 'brand',
  onClick,
  className
}) => {
  const pageNum = typeof page === 'string' ? parseInt(page.replace(/\D/g, ''), 10) || 1 : page;
  const label = typeof page === 'string' && (page.includes('–') || page.includes('-')) ? `Pages ${page}` : `Page ${pageNum}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick && pageNum) {
      onClick(documentId, pageNum);
    }
  };

  const variantStyles = {
    brand: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
    blue: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-600 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    amber: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-600 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
    purple: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/80 text-purple-600 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60'
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 my-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none shadow-2xs',
        variantStyles[variant] || variantStyles.brand,
        className
      )}
      title={filename ? `Open page ${pageNum} in ${filename}` : `Open page ${pageNum}`}
    >
      <span>{label}</span>
      <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
    </button>
  );
};
