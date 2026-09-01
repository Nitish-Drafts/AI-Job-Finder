import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Trello,
  LineChart,
  HelpCircle,
  Settings,
  Shield,
  LogOut,
  Sun,
  Moon,
  BriefcaseIcon
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Job Search', path: '/jobs', icon: Briefcase },
    { name: 'Resume Optimizer', path: '/resume', icon: FileText },
    { name: 'Applications Board', path: '/applications', icon: Trello },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'Interview Prep', path: '/interview-prep', icon: HelpCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Admin access
  if (user?.role === 'admin') {
    menuItems.push({ name: 'Admin Crawler', path: '/admin', icon: Shield });
  }

  return (
    <aside className="w-64 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 transition-colors duration-200 z-20">
      <div className="p-6">
          <div className="flex items-center space-x-2 mb-9">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/25">
            <BriefcaseIcon size={20} />
          </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              jobflow<span className="text-indigo-500">.ai</span>
          </span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
        {/* User Card info */}
        <div className="flex items-center space-x-3">
          <img
            src={
              user?.profile_photo_path
                ? `/api/v1/auth/me/photo?t=${new Date().getTime()}` // Force bypass cache on photo updates
                : `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || user?.email}`
            }
            alt="avatar"
            className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 object-cover"
          />
          <div className="truncate w-32">
            <h4 className="text-sm font-semibold text-slate-950 dark:text-white truncate">
              {user?.full_name || 'Candidate'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Theme and logout controls */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
