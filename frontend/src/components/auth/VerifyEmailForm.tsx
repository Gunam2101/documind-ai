import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Mail, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const VerifyEmailForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  };

  return (
    <div className="text-center space-y-6 py-4">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-sm">
        <Mail className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Verify your email</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
          We have sent a verification link to{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-200">{user?.email || 'your email'}</span>.
          Please check your inbox and click the link to verify your email address.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          onClick={() => navigate('/dashboard')}
          className="w-full"
          size="lg"
        >
          Continue to Dashboard
        </Button>

        <Button
          variant="outline"
          onClick={handleResend}
          disabled={resent}
          className="w-full text-xs"
        >
          {resent ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" />
              Verification Email Resent!
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              Resend Email
            </>
          )}
        </Button>
      </div>

      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        Didn't receive the email? Check your spam folder or click resend above.
      </p>
    </div>
  );
};
