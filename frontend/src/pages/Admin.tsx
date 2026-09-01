import React, { useState } from 'react';
import api from '../services/api';
import {
  RefreshCw,
  Server,
  Play,
  CheckCircle2,
  Terminal,
  Activity
} from 'lucide-react';

interface ScraperLog {
  time: string;
  source: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const Admin: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);

  // Custom mock console logs for crawlers to simulate background monitoring
  const [logs, setLogs] = useState<ScraperLog[]>([
    { time: '08:00:03', source: 'Greenhouse', level: 'info', message: 'Harvest request dispatched for target site "Vercel".' },
    { time: '08:00:06', source: 'Greenhouse', level: 'info', message: 'Saved 3 new software engineering postings.' },
    { time: '08:00:10', source: 'Lever', level: 'info', message: 'Scrape started for site target token "Stripe".' },
    { time: '08:00:12', source: 'Lever', level: 'info', message: 'No new postings discovered. Skip.' },
    { time: '08:00:15', source: 'AI Embedding', level: 'info', message: 'Checking missing job embedding vectors...' },
    { time: '08:00:18', source: 'AI Embedding', level: 'info', message: 'Successfully calculated 3 missing job vectors.' },
  ]);

  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.post('/jobs/scrape-sync');
      setSyncResult(res.data);

      // Prepend a new success console log
      const timeStr = new Date().toLocaleTimeString();
      setLogs((prev) => [
        { time: timeStr, source: 'Manual Trigger', level: 'info', message: `Scraper cycle forced manually. Added ${res.data.scraped_records} postings, seeded ${res.data.seeded_records} backups.` },
        ...prev
      ]);
    } catch (err: any) {
      alert('Manual scraper sync call encountered errors. Details: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const scrapers = [
    { name: 'Greenhouse parser', url: 'boards-api.greenhouse.io', status: 'active', speed: 'fast' },
    { name: 'Lever parser', url: 'api.lever.co', status: 'active', speed: 'fast' },
    { name: 'Ashby parser', url: 'api.ashbyhq.com', status: 'active', speed: 'medium' },
    { name: 'Workday HTML fallbacks', url: 'workday.com/careers', status: 'standby', speed: 'slow' },
    { name: 'Wellfound/AngelList', url: 'wellfound.com/jobs', status: 'restricted', speed: 'slow' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Admin Crawler Panel</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor crawlers, execution schedulers, and force manual dataset syncs</p>
      </div>

      {/* Sync trigger card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 flex-1">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center space-x-2">
            <Activity size={16} className="text-blue-500 animate-pulse" />
            <span>Force Scraper Execution</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Immediately trigger the Greenhouse, Lever, and Ashby parsers to sync new job listings and calculate their vector coordinate profiles.
          </p>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={syncing}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/10 hover:shadow-lg transition-all"
        >
          {syncing ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <>
              <Play size={14} />
              <span>Trigger Scrape Sync</span>
            </>
          )}
        </button>
      </div>

      {/* Results banner */}
      {syncResult && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-5 flex items-start space-x-3">
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-800 dark:text-emerald-500 text-sm">Sync Cycle Complete</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              Manual trigger success: Added {syncResult.scraped_records} listings and seeded {syncResult.seeded_records} fallback positions. Vector coordinates calculated.
            </p>
          </div>
        </div>
      )}

      {/* Split details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Scrapers connected list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center space-x-2">
            <Server size={15} className="text-indigo-500" />
            <span>Configured Scraper Interfaces</span>
          </h3>

          <div className="space-y-4">
            {scrapers.map((sc) => (
              <div key={sc.name} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3.5">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-none">{sc.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono mt-2 block">{sc.url}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">{sc.speed}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${sc.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                      : sc.status === 'standby'
                        ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/50'
                        : 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900/50'
                    }`}>
                    {sc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Console Log Panel */}
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-900 shadow-sm flex flex-col h-[350px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
            <Terminal size={14} className="text-blue-500" />
            <span>Crawler Console Logs</span>
          </h3>

          <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-350 space-y-2.5 pr-2">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2.5 leading-normal">
                <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                <span className="text-blue-400 shrink-0 select-none font-bold">[{log.source}]</span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Admin;
