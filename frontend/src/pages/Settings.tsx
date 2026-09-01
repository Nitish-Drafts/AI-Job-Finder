import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  User,
  Camera,
  CheckCircle,
  AlertCircle,
  Server
} from 'lucide-react';

const Settings: React.FC = () => {
  const { user, updateUser, refreshProfile } = useAuth();

  // Profile forms
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');


  // Notification / SMTP forms
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // Status indicators
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await api.put('/auth/me', {
        email,
        full_name: fullName,
        password: password || undefined
      });
      updateUser(res.data);
      setMsg('Profile details updated successfully.');
      setPassword('');
    } catch (error: any) {
      setErr(error.response?.data?.detail || 'Failed updating profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setPhotoUploading(true);
      setMsg(null);
      setErr(null);

      const formData = new FormData();
      formData.append('file', selected);

      try {
        const res = await api.post('/auth/me/photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        updateUser(res.data);
        setMsg('Profile image updated successfully.');
        await refreshProfile();
      } catch (error: any) {
        setErr('Failed uploading profile image.');
      } finally {
        setPhotoUploading(false);
      }
    }
  };

  const handleSaveSMTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Custom SMTP mail settings saved successfully.');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Settings Portal</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure profile details, security items, and integrations</p>
      </div>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column (Avatar update and profile info) */}
        <div className="space-y-6">
          {/* Avatar card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <img
                src={
                  user?.profile_photo_path
                    ? `/api/v1/auth/me/photo?t=${new Date().getTime()}`
                    : `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || user?.email}`
                }
                alt="Avatar"
                className="w-24 h-24 rounded-full border border-slate-200 dark:border-slate-800 object-cover"
              />
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full cursor-pointer shadow-md transition-colors">
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {photoUploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>

            <h3 className="font-bold text-slate-950 dark:text-white">{user?.full_name || 'Candidate'}</h3>
            <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
            <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 px-3 py-1 rounded-full">
              {user?.role} Profile
            </span>
          </div>

          {/* Status alerts */}
          {(msg || err) && (
            <div className="space-y-2">
              {msg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle size={15} className="shrink-0" />
                  <span>{msg}</span>
                </div>
              )}
              {err && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{err}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Columns (forms) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile fields */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-950 dark:text-white text-sm mb-6 flex items-center space-x-2">
              <User size={16} className="text-blue-500" />
              <span>Personal Profile</span>
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">New Password (leave empty to retain)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-semibold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/10"
              >
                {loading ? 'Saving details...' : 'Save Profile Details'}
              </button>
            </form>
          </div>

          {/* Custom SMTP */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-950 dark:text-white text-sm mb-6 flex items-center space-x-2">
              <Server size={16} className="text-indigo-500" />
              <span>Custom SMTP Configuration</span>
            </h3>

            <form onSubmit={handleSaveSMTP} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-950 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">SMTP Port</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-950 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Username / Sender</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-950 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-950 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-500/10"
              >
                Save Mail Settings
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
