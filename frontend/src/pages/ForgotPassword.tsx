import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import api from '../services/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      // Local preview has no mail service, so safely take the user to the reset form.
      if (response.data.reset_token) navigate(`/reset-password?token=${encodeURIComponent(response.data.reset_token)}`);
    } catch (err: any) { setError(err.response?.data?.detail || 'Unable to start the password reset.'); }
    finally { setLoading(false); }
  };
  return <div className="min-h-screen grid place-items-center bg-slate-50 px-4 dark:bg-slate-950"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15"><KeyRound size={22} /></div><h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">Reset your password</h1><p className="mt-2 text-sm text-slate-500">Enter your email and we’ll help you get back into your account.</p>{message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</p>}{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label><button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60">{loading ? 'Preparing reset…' : 'Continue'}</button></form><Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} />Back to sign in</Link></div></div>;
};
export default ForgotPassword;
