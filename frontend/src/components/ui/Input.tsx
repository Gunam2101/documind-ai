import React, { forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  type = 'text',
  className,
  leftIcon,
  rightIcon,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          type={inputType}
          className={cn(
            'w-full px-3.5 py-2.5 bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 text-sm rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-150',
            leftIcon && 'pl-10',
            (rightIcon || isPassword) && 'pr-10',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        ) : (
          rightIcon && <div className="absolute right-3 text-gray-400">{rightIcon}</div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
