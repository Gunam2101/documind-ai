import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable = false, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-sm transition-all duration-200',
        hoverable && 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
