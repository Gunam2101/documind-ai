import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap,
  Search, BookOpen, MessageSquare, Target, Award, Brain, Globe, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsDemo, isAuthenticated } = useAuth();

  const handleDemoClick = async () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      await loginAsDemo();
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e19] text-gray-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* ================= TOP NAVIGATION ================= */}
      <header className="h-20 border-b border-[#212b45] bg-[#121729]/90 backdrop-blur-md sticky top-0 z-50 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              DocuMind AI
              <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400 animate-pulse" />
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-300">
          <a href="#features" className="hover:text-purple-400 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-purple-400 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-purple-400 transition-colors">Pricing</a>
          <a href="#contact" className="hover:text-purple-400 transition-colors">Contact</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-purple-500/25 transition-all transform hover:scale-105"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="py-16 lg:py-24 px-6 lg:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Hero Copy */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Learn anything <br />
            from <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">your documents</span> <br />
            with AI
          </h1>

          <p className="text-base sm:text-lg text-gray-300 max-w-xl font-medium leading-relaxed">
            Your Multilingual AI Teacher for PDFs, Images and More.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2.5">
            {[
              { icon: FileText, label: 'PDF Understanding' },
              { icon: Eye, label: 'Image Explanation' },
              { icon: Globe, label: 'Multilingual Support' },
              { icon: Brain, label: 'Study & Quiz' }
            ].map((pill, idx) => (
              <span
                key={idx}
                className="px-3.5 py-1.5 rounded-full bg-[#161c30] border border-[#212b45] text-xs font-bold text-gray-200 flex items-center gap-1.5 shadow-sm"
              >
                <pill.icon className="w-3.5 h-3.5 text-purple-400" />
                {pill.label}
              </span>
            ))}
          </div>

          {/* CTA Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/register"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-purple-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
            >
              Start Learning
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleDemoClick}
              className="px-8 py-4 rounded-2xl bg-[#161c30] hover:bg-[#1f2845] border border-[#212b45] text-gray-200 font-extrabold text-sm transition-all cursor-pointer"
            >
              Explore Demo
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Instant access • No credit card required • Grounded AI sources</span>
          </div>
        </div>

        {/* Right Column: Hero Visual Graphic */}
        <div className="lg:col-span-5 relative flex justify-center">
          <div className="w-full max-w-md p-6 rounded-3xl bg-gradient-to-b from-[#161c30] to-[#0f1423] border border-[#212b45] shadow-2xl relative space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-black uppercase tracking-widest text-purple-400">DocuMind AI Teacher</span>
              <p className="text-sm font-bold text-white">"Same Documents, Better Understanding ✨"</p>
            </div>

            {/* Educational Learning Stack Visual */}
            <div className="space-y-2.5">
              {[
                { label: 'Upload', color: 'from-blue-600 to-indigo-600' },
                { label: 'Ask', color: 'from-indigo-600 to-purple-600' },
                { label: 'Understand', color: 'from-purple-600 to-pink-600' },
                { label: 'Learn', color: 'from-emerald-600 to-teal-600' },
                { label: 'Succeed', color: 'from-amber-500 to-orange-500' }
              ].map((stack, sIdx) => (
                <div
                  key={sIdx}
                  className={`p-3 rounded-xl bg-gradient-to-r ${stack.color} text-white font-extrabold text-xs text-center shadow-md transform transition-all hover:scale-[1.02]`}
                >
                  {stack.label}
                </div>
              ))}
            </div>

            {/* Testimonial Quote Card */}
            <div className="p-4 rounded-2xl bg-[#0b0e19] border border-[#212b45] text-xs text-gray-300 space-y-1">
              <p className="italic font-medium">"It explains like a real teacher! Super helpful for my studies."</p>
              <p className="text-[10px] text-purple-400 font-bold text-right">— A Happy Learner</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section id="features" className="py-20 bg-[#121729] border-y border-[#212b45] px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-white">Built for True Learning</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-xs font-medium">Everything you need to extract concepts, master textbook images, and excel in exams.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FileText, title: 'PDF Knowledge Base', desc: 'Extracts Unicode text and math equations from complex academic PDFs.' },
              { icon: Eye, title: 'Diagram & Image AI', desc: 'Analyzes textbook figures, flowcharts, tables, and handwritten notes.' },
              { icon: Globe, title: 'Multilingual Teacher', desc: 'Responds in English, Tamil, Tanglish, Hindi, Telugu, Malayalam, Kannada & more.' },
              { icon: Award, title: 'Exam Generator & Quiz', desc: 'Generates practice quizzes with negative marking and real time tracking.' }
            ].map((f, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#161c30] border border-[#212b45] space-y-3 hover:border-purple-500/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-sm">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="mt-auto py-8 border-t border-[#212b45] text-center text-xs text-gray-400 font-medium">
        <p>© 2026 DocuMind AI — Your Multilingual AI Teacher. All rights reserved.</p>
      </footer>
    </div>
  );
};
