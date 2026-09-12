import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-16 lg:pb-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
