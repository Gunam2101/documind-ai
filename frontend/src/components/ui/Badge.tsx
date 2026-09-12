import React from 'react';
import { cn } from '../../lib/utils';
import { DocumentStatus } from '../../types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: DocumentStatus | 'default' | 'success' | 'warning' | 'error' | 'info';
  variant?: 'solid' | 'subtle';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  status = 'default',
  variant = 'subtle',
  className,
  ...props
}) => {
  const getStyles = () => {
    switch (status) {
      case 'READY':
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40';
      case 'PROCESSING':
      case 'UPLOADING':
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40';
      case 'FAILED':
      case 'error':
        return 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40';
      case 'info':
        return 'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/40';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors',
        getStyles(),
        className
      )}
      {...props}
    >
      {children || status}
    </span>
  );
};
