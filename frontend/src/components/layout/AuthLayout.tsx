import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Sparkles, BookOpen, Coffee, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  taglineHeading?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen flex w-full bg-[#0b0e19] text-gray-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* Left Hero Panel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0b0e19] via-[#121729] to-[#1a1c38] p-12 flex-col justify-between relative overflow-hidden border-r border-[#212b45]">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              DocuMind AI
              <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400 animate-pulse" />
            </span>
          </div>
        </div>

        {/* Hero Content Area */}
        <div className="max-w-md space-y-8 relative z-10 my-auto text-center mx-auto">
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Your Personal AI Teacher
            </h1>
            <p className="text-sm font-semibold text-purple-400">
              Any Document. Any Language.
            </p>
          </div>

          {/* Coffee Mug Graphic Illustration */}
          <div className="p-6 rounded-3xl bg-[#161c30] border border-[#212b45] shadow-2xl relative space-y-4 max-w-xs mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-600/20">
              <Coffee className="w-8 h-8" />
            </div>
            <p className="text-xs font-extrabold text-amber-200 uppercase tracking-wider">
              "Good Students Build Great Futures"
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
              "Learn • Understand • Grow • Together"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-gray-500 flex items-center justify-between pt-6 border-t border-[#212b45]">
          <span>© 2026 DocuMind AI</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-gray-300 cursor-pointer">Privacy</span>
            <span className="hover:text-gray-300 cursor-pointer">Terms</span>
          </div>
        </div>
      </div>

      {/* Right Auth Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Welcome back
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Continue your learning journey
            </p>
          </div>

          {/* Login / Register Toggle Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#161c30] border border-[#212b45]">
            <Link
              to="/login"
              className={`py-2 text-xs font-bold rounded-xl text-center transition-all ${
                isLogin
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={`py-2 text-xs font-bold rounded-xl text-center transition-all ${
                !isLogin
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </Link>
          </div>

          {/* Form Content */}
          <div className="p-6 rounded-3xl bg-[#161c30] border border-[#212b45] shadow-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
