import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  FileText,
  UploadCloud,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Edit,
  Download,
  AlertCircle
} from 'lucide-react';

interface ParsedResume {
  skills: string[];
  education: any[];
  experience: any[];
  projects: any[];
  certificates: string[];
}

interface Job {
  id: number;
  title: string;
  company: {
    name: string;
  };
}

const Resume: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'optimize' | 'cover'>(
    location.state?.tab || 'profile'
  );

  // Resume upload states
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optimizations
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | string>(
    location.state?.targetJobId || ''
  );
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedData, setOptimizedData] = useState<any>(null);

  // Cover Letter
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [editingCoverLetter, setEditingCoverLetter] = useState(false);
  const [clId, setClId] = useState<number | null>(null);
  const [generatingCL, setGeneratingCL] = useState(false);

  const fetchProfile = async () => {
    try {
      await api.get('/auth/me');
      await api.get('/jobs/matched');
    } catch (err) {
      // Resume missing will fail /jobs/matched, catch is safe
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data);
      if (res.data.length > 0 && !selectedJobId) {
        setSelectedJobId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchJobs();
  }, []);

  useEffect(() => {
    if (location.state?.targetJobId) {
      setSelectedJobId(location.state.targetJobId);
      setActiveTab(location.state.tab || 'optimize');
    }
  }, [location.state]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/auth/me/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(res.data.message);
      setParsedData(res.data.parsed_data);
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed uploading resume. File type must be PDF or DOCX.');
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerOptimize = async () => {
    if (!selectedJobId) return;
    setOptimizing(true);
    setOptimizedData(null);
    try {
      const res = await api.post(`/optimization/resume?job_id=${selectedJobId}`);
      setOptimizedData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed generating optimization. Verify your resume is uploaded.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedJobId) return;
    setGeneratingCL(true);
    setCoverLetter('');
    try {
      const res = await api.post(`/optimization/cover-letter?job_id=${selectedJobId}`);
      setCoverLetter(res.data.content);
      setClId(res.data.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed generating cover letter. Verify your resume is uploaded.');
    } finally {
      setGeneratingCL(false);
    }
  };

  const handleSaveCoverLetterEdits = async () => {
    if (!clId) return;
    try {
      await api.put(`/optimization/cover-letters/${clId}?content=${encodeURIComponent(coverLetter)}`);
      setEditingCoverLetter(false);
      alert('Cover letter changes saved successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = (format: 'pdf' | 'docx') => {
    if (!clId) return;
    window.open(`/api/v1/optimization/cover-letters/${clId}/download/${format}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Resume Studio</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Extract profile nodes and generate ATS career alignment packages</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'profile'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          Resume Parser Profile
        </button>
        <button
          onClick={() => setActiveTab('optimize')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'optimize'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          ATS Keyword Optimizer
        </button>
        <button
          onClick={() => setActiveTab('cover')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'cover'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          AI Cover Letter
        </button>
      </div>

      {/* Tab contents */}
      <div className="pt-4">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Zone */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-fit">
              <h3 className="font-bold text-slate-950 dark:text-white text-sm mb-4">Upload PDF Resume</h3>
              <form onSubmit={handleUploadResume} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center hover:border-blue-500 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    required
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <UploadCloud size={32} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {file ? file.name : 'Drag & drop or click to browse'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, TXT (Max 5MB)</p>
                </div>

                {error && (
                  <div className="text-red-500 text-xs flex items-center space-x-1.5 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-950/50">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {message && (
                  <div className="text-emerald-500 text-xs flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-950/50">
                    <CheckCircle size={14} className="shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  {uploading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      <span>Process Resume</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Parsed Nodes */}
            <div className="lg:col-span-2 space-y-6">
              {parsedData ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Skills Grid */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Detected Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills.map((skill) => (
                        <span key={skill} className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80 px-3 py-1 rounded-lg">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Experience Grid */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3 border-t border-slate-100 dark:border-slate-850 pt-5">Work History</h4>
                    <div className="space-y-4">
                      {parsedData.experience.map((exp, idx) => (
                        <div key={idx} className="border-l-2 border-blue-500 pl-4 py-0.5">
                          <h5 className="font-bold text-slate-900 dark:text-white text-sm">{exp.title}</h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{exp.company} {exp.dates && `| ${exp.dates}`}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Education Grid */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3 border-t border-slate-100 dark:border-slate-850 pt-5">Academic Degrees</h4>
                    <div className="space-y-2">
                      {parsedData.education.map((edu, idx) => (
                        <div key={idx}>
                          <h5 className="font-bold text-slate-900 dark:text-white text-sm">{edu.degree}</h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{edu.school} {edu.dates && `| ${edu.dates}`}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm flex flex-col justify-center items-center h-full">
                  <FileText size={36} className="text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-semibold">Parsed Resume Grid is Empty</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Upload your PDF profile on the left column to extract skills and compile matching dashboards.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATS Keyword Optimizer */}
        {activeTab === 'optimize' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Control Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-fit space-y-4">
              <h3 className="font-bold text-slate-950 dark:text-white text-sm">Target Selection</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Select a connected job posting to align your resume text and extract keywords optimization guides.
              </p>

              <div className="space-y-3">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a Job listing</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} | {job.company.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleTriggerOptimize}
                  disabled={optimizing || !selectedJobId}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-medium py-3 rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  {optimizing ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Generate ATS Guidelines</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2">
              {optimizedData ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Summary */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Optimized Executive Summary</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-4.5 rounded-xl border border-slate-100 dark:border-slate-800/50 leading-relaxed whitespace-pre-line">
                      {optimizedData.optimized_summary}
                    </p>
                  </div>

                  {/* Skills Grid to add */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Target Keywords Checklist</h4>
                    <div className="flex flex-wrap gap-2">
                      {optimizedData.optimized_skills.map((skill: string) => (
                        <span key={skill} className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/50 px-3 py-1 rounded-lg">
                          + {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Improved Projects descriptions */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Metric-Aligned Accomplishments</h4>
                    <div className="space-y-4">
                      {optimizedData.improved_projects.map((proj: any, idx: number) => (
                        <div key={idx} className="border border-slate-100 dark:border-slate-800 p-4.5 rounded-xl">
                          <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">{proj.original_title}</h5>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed italic bg-blue-50/20 dark:bg-slate-800/20 p-3 rounded-lg border-l-2 border-purple-500">
                            {proj.improved_description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm flex flex-col justify-center items-center h-full">
                  <Sparkles size={36} className="text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-semibold font-sans">Guidelines not generated yet.</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Pick a target job listing and press the generate button on the left column.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cover Letter Section */}
        {activeTab === 'cover' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Control Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-fit space-y-4">
              <h3 className="font-bold text-slate-950 dark:text-white text-sm">Cover Letter Generator</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automatically draft a customizable cover letter tailored specifically to the selected job description.
              </p>

              <div className="space-y-3">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a Job listing</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} | {job.company.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={generatingCL || !selectedJobId}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-medium py-3 rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  {generatingCL ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Draft Cover Letter</span>
                    </>
                  )}
                </button>

                {/* Export downloads */}
                {clId && (
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-850">
                    <button
                      onClick={() => handleDownload('pdf')}
                      className="bg-red-600 hover:bg-red-500 text-white text-center font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1 transition-all"
                    >
                      <Download size={13} />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleDownload('docx')}
                      className="bg-blue-700 hover:bg-blue-600 text-white text-center font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1 transition-all"
                    >
                      <Download size={13} />
                      <span>Word</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Letter Text Area Panel */}
            <div className="lg:col-span-2">
              {coverLetter ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[520px]">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-850 pb-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Custom Cover Letter Draft</h3>

                    {editingCoverLetter ? (
                      <button
                        onClick={handleSaveCoverLetterEdits}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Save changes
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingCoverLetter(true)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center space-x-1 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Edit size={12} />
                        <span>Edit Draft</span>
                      </button>
                    )}
                  </div>

                  {editingCoverLetter ? (
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="flex-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  ) : (
                    <div className="flex-1 overflow-y-auto whitespace-pre-line text-xs leading-relaxed text-slate-600 dark:text-slate-350 bg-slate-50/20 dark:bg-slate-850/10 p-5 rounded-xl border border-slate-100 dark:border-slate-850/50 font-serif">
                      {coverLetter}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm flex flex-col justify-center items-center h-full">
                  <FileText size={36} className="text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-semibold font-sans">Draft not compiled yet.</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Pick a target job listing and press the draft button on the left column.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Resume;
