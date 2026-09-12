import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsDemoLoading(true);
    try {
      await loginAsDemo();
      navigate('/dashboard');
    } catch (err: any) {
      setError('Unable to start demo mode.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-xs font-bold text-gray-300">Email address</label>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4 text-gray-400" />}
          className="bg-[#0f1423] border-[#212b45] text-white placeholder-gray-500 rounded-xl"
          required
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-gray-300">Password</label>
          <Link to="/forgot-password" className="text-[11px] text-purple-400 font-semibold hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4 text-gray-400" />}
          className="bg-[#0f1423] border-[#212b45] text-white placeholder-gray-500 rounded-xl"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || isDemoLoading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/25 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
      >
        {isLoading ? 'Signing In...' : 'Sign In'}
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#212b45]" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase">
          <span className="bg-[#161c30] px-3 text-gray-400 font-bold">or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => alert("Google OAuth is configured via environment variables.")}
        className="w-full py-2.5 rounded-xl bg-[#0f1423] hover:bg-[#1b233c] border border-[#212b45] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Continue with Google</span>
      </button>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={isLoading || isDemoLoading}
        className="w-full py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>{isDemoLoading ? 'Entering Demo...' : 'Continue as Demo'}</span>
      </button>

      <p className="text-center text-[11px] text-gray-400 pt-2 font-medium">
        Don't have an account?{' '}
        <Link to="/register" className="font-bold text-purple-400 hover:underline">
          Create account
        </Link>
      </p>
    </form>
  );
};
