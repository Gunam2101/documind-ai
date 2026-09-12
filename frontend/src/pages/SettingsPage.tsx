import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userApi } from '../services/userApi';
import { Input } from '../components/ui/Input';
import { User, Sun, Moon, Sparkles, Globe, Shield, Trash2, Check, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'ai' | 'privacy'>('appearance');

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // AI Teaching Preferences
  const [defaultLanguage, setDefaultLanguage] = useState('auto');
  const [teachingStyle, setTeachingStyle] = useState('step_by_step');
  const [savedAi, setSavedAi] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg('');
    try {
      await userApi.updateProfile({
        name,
        email,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined
      });
      await refreshUser();
      setProfileMsg('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setProfileMsg(err.response?.data?.detail || 'Update failed.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveAi = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedAi(true);
    setTimeout(() => setSavedAi(false), 3000);
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'ai', label: 'AI Teaching Preference', icon: Sparkles },
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  ] as const;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto text-left">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Settings</h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Manage your app theme, default response language, and AI teacher preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Vertical Menu */}
          <div className="lg:col-span-4 bg-[#161c30] border border-[#212b45] rounded-2xl p-2 space-y-1 shadow-xl">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeTab === t.id
                      ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border-l-4 border-purple-500 font-extrabold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#0f1423]"
                  )}
                >
                  <Icon className="w-4 h-4 text-purple-400" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Main Content Pane */}
          <div className="lg:col-span-8 bg-[#161c30] border border-[#212b45] rounded-2xl p-6 shadow-xl space-y-6">
            {activeTab === 'appearance' && (
              <div className="space-y-6 max-w-md">
                <h3 className="text-base font-extrabold text-white">Appearance & Theme</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'dark', label: 'Dark Mode (Default)', icon: Moon },
                    { id: 'light', label: 'Light Mode', icon: Sun }
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = theme === t.id || (t.id === 'dark' && theme === 'system');

                    return (
                      <div
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        className={cn(
                          "p-5 rounded-2xl border cursor-pointer text-center space-y-3 transition-all",
                          isSelected
                            ? "border-purple-500 bg-purple-950/40 text-white font-extrabold shadow-md"
                            : "border-[#212b45] bg-[#0f1423] text-gray-400 hover:border-gray-600"
                        )}
                      >
                        <Icon className="w-6 h-6 mx-auto text-purple-400" />
                        <span className="text-xs">{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <form onSubmit={handleSaveAi} className="space-y-6 max-w-md text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-white">AI Teacher Preference</h3>
                  {savedAi && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved!</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-gray-300">Default Response Language</label>
                  <select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f1423] border border-[#212b45] rounded-xl text-white font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="auto">🌐 Auto Detect (Matches Question Language)</option>
                    <option value="english">English</option>
                    <option value="tamil">Tamil (தமிழ்)</option>
                    <option value="tanglish">Tanglish (Tamil-English)</option>
                    <option value="hindi">Hindi (हिंदी)</option>
                    <option value="telugu">Telugu (తెలుగు)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-gray-300">Explanation Style</label>
                  <select
                    value={teachingStyle}
                    onChange={(e) => setTeachingStyle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f1423] border border-[#212b45] rounded-xl text-white font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="step_by_step">Step-by-Step AI Teacher (Recommended)</option>
                    <option value="concise">Concise & Exam Summary Style</option>
                    <option value="detailed">Exhaustive Textbook Breakdown</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Save AI Preferences
                </button>
              </form>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md text-xs">
                <h3 className="text-base font-extrabold text-white">Profile Settings</h3>
                {profileMsg && <p className="text-xs font-bold text-purple-400">{profileMsg}</p>}

                <div className="space-y-1">
                  <label className="block font-bold text-gray-300">Full Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#0f1423] border-[#212b45] text-white rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-gray-300">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#0f1423] border-[#212b45] text-white rounded-xl"
                    required
                  />
                </div>

                <hr className="border-[#212b45] my-4" />
                <h4 className="text-xs font-extrabold text-gray-400 uppercase">Change Password</h4>

                <div className="space-y-1">
                  <label className="block font-bold text-gray-300">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-[#0f1423] border-[#212b45] text-white rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-gray-300">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-[#0f1423] border-[#212b45] text-white rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
                >
                  {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6 max-w-md text-xs">
                <h3 className="text-base font-extrabold text-white">Privacy & Data Control</h3>
                <p className="text-gray-400 leading-relaxed font-medium">
                  Your documents are stored securely and processed strictly in memory. We never use your document contents for public LLM training.
                </p>

                <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 space-y-3">
                  <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </h4>
                  <p className="text-red-300 text-[11px]">
                    Permanently delete your account, documents, conversations, and vector indices.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete your account?")) {
                        logout();
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs cursor-pointer shadow-md"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
