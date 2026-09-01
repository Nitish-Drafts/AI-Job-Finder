import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Search,
  MapPin,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Send,
  FileText,
  Sparkles,
  Trello,
  Plus
} from 'lucide-react';

interface Job {
  id: number;
  title: string;
  location: string | null;
  salary_range: string | null;
  experience_level: string | null;
  remote_status: string;
  description: string;
  apply_url: string;
  posting_date: string;
  source: string | null;
  skills: string[] | null;
  employment_type: string | null;
  salary: { display: string } | null;
  company: {
    id: number;
    name: string;
    logo_url: string | null;
    website_url: string | null;
  };
}

const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState('');
  const [remote, setRemote] = useState('');

  // Bookmarks
  const [savedJobIds, setSavedJobIds] = useState<number[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Fetch bookmarks
  const fetchBookmarks = async () => {
    try {
      const res = await api.get('/jobs/saved');
      setSavedJobIds(res.data.map((b: any) => b.job_id));
    } catch (err) {
      console.error(err);
    }
  };

  // Query jobs
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/jobs', {
        params: {
          q: query || undefined,
          location: location || undefined,
          experience: experience || undefined,
          remote_status: remote || undefined
        }
      });
      setJobs(res.data);
      if (res.data.length > 0 && !selectedJob) {
        setSelectedJob(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [query, location, experience, remote]);

  const handleToggleSave = async (jobId: number) => {
    const isSaved = savedJobIds.includes(jobId);
    try {
      if (isSaved) {
        await api.delete(`/jobs/${jobId}/unsave`);
        setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
      } else {
        await api.post(`/jobs/${jobId}/save`, null, {
          params: { tags: newTag ? [newTag] : undefined }
        });
        setSavedJobIds((prev) => [...prev, jobId]);
        setNewTag('');
        setShowTagInput(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrackApplication = async (jobId: number) => {
    try {
      await api.post('/applications', { job_id: jobId, status: 'wishlist' });
      navigate('/applications');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Already tracking this job application.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Engineering Jobs</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Automated crawling from connected company boards</p>
      </div>

      {/* Filter Bars */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Role title, tech stack..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Location */}
        <div className="relative">
          <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, State, Remote..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Experience Selector */}
        <select
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Experience Levels</option>
          <option value="0 Years">0 Years (Entry)</option>
          <option value="1 Year">1 Year</option>
          <option value="2 Years">2 Years</option>
          <option value="3+ Years">3+ Years (Senior)</option>
        </select>

        {/* Remote status */}
        <select
          value={remote}
          onChange={(e) => setRemote(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Work Modes</option>
          <option value="remote">Remote Only</option>
          <option value="hybrid">Hybrid Mode</option>
          <option value="onsite">Onsite Location</option>
        </select>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Listings column */}
        <div className="lg:col-span-2 space-y-4 max-h-[700px] overflow-y-auto pr-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
            ))
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`border rounded-xl p-4 cursor-pointer hover:border-blue-500 transition-all ${selectedJob?.id === job.id
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 dark:border-blue-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Company logo with initials fallback */}
                    <img
                      src={job.company.logo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(job.company.name)}&backgroundColor=3b82f6&textColor=ffffff`}
                      alt={job.company.name}
                      className="w-9 h-9 rounded-lg object-contain border border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-800"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(job.company.name)}&backgroundColor=3b82f6&textColor=ffffff`;
                      }}
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug truncate">{job.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{job.company.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSave(job.id);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-500 transition-colors shrink-0"
                  >
                    {savedJobIds.includes(job.id) ? (
                      <BookmarkCheck className="text-blue-500" size={16} />
                    ) : (
                      <Bookmark size={16} />
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 text-[10px] font-semibold">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md">{job.location || 'Remote'}</span>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md capitalize">{job.remote_status}</span>
                  {job.experience_level && (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md">{job.experience_level}</span>
                  )}
                  {job.salary?.display && job.salary.display !== 'Salary not disclosed' && (
                    <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-md">{job.salary.display}</span>
                  )}
                  {job.source && (
                    <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md ml-auto">{job.source}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Briefcase size={36} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No postings found.</p>
              <p className="text-xs text-slate-400 mt-1">Adjust filters or search details.</p>
            </div>
          )}
        </div>

        {/* Detailed Column */}
        <div className="lg:col-span-3">
          {selectedJob ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-6 max-h-[700px] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-5 mb-5">
                  <div className="flex items-start space-x-4">
                    <img
                      src={selectedJob.company.logo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedJob.company.name)}&backgroundColor=3b82f6&textColor=ffffff`}
                      alt={selectedJob.company.name}
                      className="w-12 h-12 rounded-xl object-contain border border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-800"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedJob.company.name)}&backgroundColor=3b82f6&textColor=ffffff`;
                      }}
                    />
                    <div>
                      <h2 className="text-lg font-bold text-slate-950 dark:text-white leading-tight">{selectedJob.title}</h2>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">{selectedJob.company.name}</p>
                    </div>
                  </div>

                  {/* Save with tag triggers */}
                  <div className="flex items-center space-x-2">
                    {showTagInput ? (
                      <div className="flex items-center space-x-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="tag..."
                          className="bg-transparent text-xs outline-none px-1 text-slate-800 dark:text-white w-16"
                        />
                        <button
                          onClick={() => handleToggleSave(selectedJob.id)}
                          className="bg-blue-600 p-1 rounded text-white hover:bg-blue-500"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTagInput(true)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center space-x-0.5 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 px-2 py-1 rounded-lg transition-all"
                      >
                        <span>Add Tag</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleSave(selectedJob.id)}
                      className={`p-2 rounded-xl border transition-colors ${savedJobIds.includes(selectedJob.id)
                        ? 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Bookmark size={15} />
                    </button>
                  </div>
                </div>

                {/* Details Grid info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-xs border-b border-slate-100 dark:border-slate-800/80 pb-5">
                  <div>
                    <span className="text-slate-400 block mb-1">Salary</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedJob.salary?.display || selectedJob.salary_range || 'Salary not disclosed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Experience</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedJob.experience_level || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Work Mode</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{selectedJob.remote_status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Location</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedJob.location || 'Remote'}</span>
                  </div>
                </div>

                {/* Skills + Source badges */}
                {(selectedJob.skills?.length || selectedJob.source || selectedJob.employment_type) && (
                  <div className="flex flex-wrap gap-1.5 mb-5 text-[10px] font-semibold">
                    {selectedJob.employment_type && (
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">{selectedJob.employment_type}</span>
                    )}
                    {selectedJob.skills?.slice(0, 6).map((skill) => (
                      <span key={skill} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md">{skill}</span>
                    ))}
                    {selectedJob.source && (
                      <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md ml-auto">via {selectedJob.source}</span>
                    )}
                  </div>
                )}

                {/* Description content */}
                <div className="overflow-y-auto max-h-[300px] pr-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-4 mb-6">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Role Description</h3>
                  <div className="whitespace-pre-line">{selectedJob.description}</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <a
                  href={selectedJob.apply_url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-center font-semibold py-3 px-2 rounded-xl text-xs flex items-center justify-center space-x-1 shadow-md shadow-blue-500/10 hover:shadow-lg transition-all"
                >
                  <Send size={13} />
                  <span>Apply Link</span>
                </a>

                <button
                  onClick={() => handleTrackApplication(selectedJob.id)}
                  className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-800 dark:border-slate-700/80 text-white text-center font-semibold py-3 px-2 rounded-xl text-xs flex items-center justify-center space-x-1 transition-colors"
                >
                  <Trello size={13} className="text-blue-500" />
                  <span>Track App</span>
                </button>

                <button
                  onClick={() => navigate('/resume', { state: { targetJobId: selectedJob.id } })}
                  className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-center font-semibold py-3 px-2 rounded-xl text-xs flex items-center justify-center space-x-1 transition-colors"
                >
                  <FileText size={13} className="text-purple-500" />
                  <span>Optimize Resume</span>
                </button>

                <button
                  onClick={() => navigate('/resume', { state: { targetJobId: selectedJob.id, tab: 'cover' } })}
                  className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-center font-semibold py-3 px-2 rounded-xl text-xs flex items-center justify-center space-x-1 transition-colors"
                >
                  <Sparkles size={13} className="text-pink-500" />
                  <span>Cover Letter</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400">
              <p className="text-sm">Select a job from the listing panel to view description details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
