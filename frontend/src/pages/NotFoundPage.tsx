import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-sm">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">404 — Page Not Found</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link to="/dashboard" className="inline-block">
          <Button leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
