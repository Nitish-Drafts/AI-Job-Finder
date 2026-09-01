import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Trello,
  Trash2,
  Edit,
  ArrowRight,
  ArrowLeft,
  X

} from 'lucide-react';

interface Application {
  id: number;
  status: string;
  notes: string | null;
  applied_date: string;
  job: {
    id: number;
    title: string;
    company: {
      name: string;
    };
  };
}

const COLUMNS = [
  { id: 'wishlist', title: 'Wishlist', color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  { id: 'applied', title: 'Applied', color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50' },
  { id: 'assessment', title: 'Assessment', color: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50' },
  { id: 'interview', title: 'Interview', color: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/50' },
  { id: 'rejected', title: 'Rejected', color: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50' },
  { id: 'offer', title: 'Offer', color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' },
];

const Applications: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Editor states
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [statusVal, setStatusVal] = useState('');

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      setApps(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdateStatus = async (appId: number, nextStatus: string) => {
    try {
      await api.put(`/applications/${appId}`, { status: nextStatus });
      setApps((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: nextStatus } : app))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotes = async () => {
    if (!editingApp) return;
    try {
      await api.put(`/applications/${editingApp.id}`, {
        notes: noteContent,
        status: statusVal
      });
      setApps((prev) =>
        prev.map((app) =>
          app.id === editingApp.id
            ? { ...app, notes: noteContent, status: statusVal }
            : app
        )
      );
      setEditingApp(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteApp = async (appId: number) => {
    if (!confirm('Are you sure you want to stop tracking this application?')) return;
    try {
      await api.delete(`/applications/${appId}`);
      setApps((prev) => prev.filter((app) => app.id !== appId));
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (app: Application) => {
    setEditingApp(app);
    setNoteContent(app.notes || '');
    setStatusVal(app.status);
  };

  // Helper to step status
  const moveStatus = (appId: number, currentStatus: string, direction: 'forward' | 'backward') => {
    const ids = COLUMNS.map((c) => c.id);
    const currIdx = ids.indexOf(currentStatus);
    let nextIdx = direction === 'forward' ? currIdx + 1 : currIdx - 1;
    if (nextIdx >= 0 && nextIdx < COLUMNS.length) {
      handleUpdateStatus(appId, ids[nextIdx]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Application Board</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage active interview funnels and process tracking stages</p>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colApps = apps.filter((app) => app.status === col.id);

          return (
            <div key={col.id} className="flex flex-col min-w-[200px] bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 min-h-[500px]">
              {/* Col Header */}
              <div className="flex justify-between items-center mb-4">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg border ${col.color}`}>
                  {col.title}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {colApps.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {loading ? (
                  <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                ) : colApps.length > 0 ? (
                  colApps.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4.5 rounded-xl shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">{app.job.title}</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{app.job.company.name}</p>

                        {app.notes && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 leading-normal border-t border-slate-50 dark:border-slate-800 pt-2 line-clamp-2">
                            {app.notes}
                          </p>
                        )}
                      </div>

                      {/* Movement & control bars */}
                      <div className="flex justify-between items-center mt-4 border-t border-slate-50 dark:border-slate-850 pt-3">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => moveStatus(app.id, app.status, 'backward')}
                            disabled={app.status === 'wishlist'}
                            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 disabled:opacity-30"
                          >
                            <ArrowLeft size={10} />
                          </button>
                          <button
                            onClick={() => moveStatus(app.id, app.status, 'forward')}
                            disabled={app.status === 'offer'}
                            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 disabled:opacity-30"
                          >
                            <ArrowRight size={10} />
                          </button>
                        </div>

                        <div className="flex space-x-1">
                          <button
                            onClick={() => openEditModal(app)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg"
                            title="Edit notes"
                          >
                            <Edit size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteApp(app.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-300 dark:text-slate-700 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Trello size={20} className="mx-auto mb-1.5 opacity-60" />
                    <span className="text-[10px] font-semibold">Column empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Notes Dialog modal */}
      {editingApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-950 dark:text-white text-sm">Application Tracking Details</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{editingApp.job.title} | {editingApp.job.company.name}</p>
              </div>
              <button
                onClick={() => setEditingApp(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Select status */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Pipeline Stage</label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/85 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Diary Notes & Logs</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write specific contacts, interview notes, or details..."
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/85 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSaveNotes}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/15"
            >
              Save tracking changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
