import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react';

export const RegisterForm: React.FC = () => {
  const { register, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!terms) {
      setError('You must agree to the Terms of Service.');
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed.');
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
    <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-xs font-bold text-gray-300">Full name</label>
        <Input
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserIcon className="w-4 h-4 text-gray-400" />}
          className="bg-[#0f1423] border-[#212b45] text-white placeholder-gray-500 rounded-xl"
          required
        />
      </div>

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
        <label className="block text-xs font-bold text-gray-300">Password</label>
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

      <div className="space-y-1">
        <label className="block text-xs font-bold text-gray-300">Confirm password</label>
        <Input
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4 text-gray-400" />}
          className="bg-[#0f1423] border-[#212b45] text-white placeholder-gray-500 rounded-xl"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || isDemoLoading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/25 transition-all disabled:opacity-40 cursor-pointer"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
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
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-purple-400 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
};
