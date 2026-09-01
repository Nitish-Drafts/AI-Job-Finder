import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, Search } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // If loading auth state, show a loading block
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-soft-pulse"></div>
            <div className="h-7 w-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Verifying sessions...</p>
        </div>
      </div>
    );
  }

  // Paths that do not require layout sidebar
  const noSidebarPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
  const showSidebar = !noSidebarPaths.includes(location.pathname);

  // Protected route check
  if (showSidebar && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#f7f7fb] dark:bg-slate-950 transition-colors duration-200">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 flex flex-col ${showSidebar ? 'pl-64' : ''}`}>
        {showSidebar && (
          <header className="h-20 px-6 md:px-10 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/80 bg-[#f7f7fb]/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5 w-72 shadow-sm">
              <Search size={16} className="text-slate-400" />
              <span className="text-xs text-slate-400">Search roles, companies…</span>
              <kbd className="ml-auto text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">⌘ K</kbd>
            </div>
            <div className="md:hidden text-sm font-semibold text-slate-700 dark:text-slate-200">Career space</div>
            <button className="relative h-10 w-10 grid place-items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-indigo-600 transition-colors shadow-sm" aria-label="Notifications">
              <Bell size={17} />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-fuchsia-500 ring-2 ring-white dark:ring-slate-900"></span>
            </button>
          </header>
        )}
        <div className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
