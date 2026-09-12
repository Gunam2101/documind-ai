import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { authApi } from '../../services/authApi';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Check your inbox</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          We sent a reset link to <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>. Click the link to reset your password.
        </p>
        <Link to="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<Mail className="w-4 h-4" />}
        required
      />

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
        Send Reset Link
      </Button>

      <div className="text-center pt-2">
        <Link to="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
          <ArrowLeft className="w-3.5 h-3.5" /> Remember your password? Log In
        </Link>
      </div>
    </form>
  );
};
