import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Award,
  Layers,
  CheckCircle
} from 'lucide-react';

interface SummaryData {
  total_applications: number;
  interviews_count: number;
  offers_count: number;
  bookmarks_count: number;
  interview_rate: number;
  offer_rate: number;
  avg_ats_score: number;
}

interface MonthlyTrend {
  month: string;
  applications: number;
}

interface MissingSkill {
  skill: string;
  count: number;
}

interface CompanyMetric {
  name: string;
  jobs_count: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#eab308', '#ef4444', '#10b981', '#6366f1'];

const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [missingSkills, setMissingSkills] = useState<MissingSkill[]>([]);
  const [companies, setCompanies] = useState<CompanyMetric[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics');
      setSummary(res.data.summary);
      setMonthlyTrend(res.data.monthly_trend);
      setMissingSkills(res.data.missing_skills);
      setCompanies(res.data.top_hiring_companies);
      setStatusDist(res.data.status_distribution.filter((s: any) => s.count > 0));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Analytics could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-slate-900">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Analytics needs a moment</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button onClick={() => { setLoading(true); setError(null); fetchAnalytics(); }} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Performance Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Aggregated statistics monitoring your application success rates</p>
      </div>

      {/* KPI Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Average ATS Rank</span>
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2 block">{summary?.avg_ats_score}%</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0">
            <Award size={24} />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Interview Invite Rate</span>
            <span className="text-3xl font-extrabold text-yellow-500 mt-2 block">{summary?.interview_rate}%</span>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3.5 rounded-2xl text-yellow-500 shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Offer Success Rate</span>
            <span className="text-3xl font-extrabold text-emerald-500 mt-2 block">{summary?.offer_rate}%</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3.5 rounded-2xl text-emerald-500 shrink-0">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Main Charts split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Line Chart (Monthly Pipeline) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Monthly Application Volume</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415522" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                <Line type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart (Missing Skills freq) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Core Tech Skill Gaps</h3>
          {missingSkills.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missingSkills}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415522" />
                  <XAxis dataKey="skill" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex flex-col justify-center items-center text-slate-400 text-center">
              <CheckCircle size={28} className="text-emerald-500 mb-2" />
              <p className="text-xs">No missing skills detected! Upload your resume and match jobs to review gaps.</p>
            </div>
          )}
        </div>

        {/* Pie Chart (Pipeline Dist) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Pipeline Distribution</h3>
          {statusDist.length > 0 ? (
            <div className="flex flex-col sm:flex-row justify-around items-center h-64">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="status"
                    >
                      {statusDist.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {statusDist.map((item, idx) => (
                  <div key={item.status} className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.count}</span>
                    <span>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-slate-400 text-center">
              <Layers size={28} className="text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs">Pipeline empty. Start tracking applications to see distribution.</p>
            </div>
          )}
        </div>

        {/* List of top hiring companies */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Top Connected Employers</h3>
          <div className="space-y-4">
            {companies.map((comp, idx) => (
              <div key={comp.name} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-none">{comp.name}</span>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                  {comp.jobs_count} roles
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
