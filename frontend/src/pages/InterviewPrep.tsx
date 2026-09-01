import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Award,
  Terminal,
  Database,
  Cpu
} from 'lucide-react';

interface Job {
  id: number;
  title: string;
  company: {
    name: string;
  };
}

interface Question {
  id: number;
  question_type: string;
  question: string;
  expected_answer: string | null;
  difficulty: string;
}

const InterviewPrep: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data);
      if (res.data.length > 0) {
        setSelectedJobId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedQuestions = async () => {
    try {
      const res = await api.get('/optimization/interview-questions');
      setQuestions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchSavedQuestions();
  }, []);

  const handleGenerateQuestions = async () => {
    if (!selectedJobId) return;
    setGenerating(true);
    setExpandedId(null);
    try {
      const res = await api.post(`/optimization/interview-prep?job_id=${selectedJobId}`);
      setQuestions(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed generating prep questions. Verify jobs database.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sql':
        return <Database size={16} className="text-blue-500" />;
      case 'python':
      case 'coding':
        return <Terminal size={16} className="text-emerald-500" />;
      case 'ml':
      case 'llm':
        return <Cpu size={16} className="text-purple-500" />;
      default:
        return <HelpCircle size={16} className="text-slate-400" />;
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950';
      case 'hard':
        return 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-950';
      default:
        return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-100 dark:border-yellow-950';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4 animate-pulse"></div>
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Interview Practice</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Generates customized Q&A prep sheets targeted for active roles</p>
      </div>

      {/* Selector Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Position</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select a connected job...</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} | {job.company.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerateQuestions}
          disabled={generating || !selectedJobId}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/10 hover:shadow-lg transition-all"
        >
          {generating ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <>
              <Sparkles size={14} />
              <span>Compile Interview Prep</span>
            </>
          )}
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {questions.length > 0 ? (
          questions.map((q) => {
            const isExpanded = expandedId === q.id;
            
            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Header click */}
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="p-5 cursor-pointer flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 mr-4">
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800/80 p-2 rounded-xl shrink-0">
                      {getIcon(q.question_type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{q.question_type}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-1 leading-snug">{q.question}</h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getDifficultyColor(q.difficulty)}`}>
                      {q.difficulty}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded answer */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-50 dark:border-slate-850 text-xs text-slate-600 dark:text-slate-350 bg-slate-50/20 dark:bg-slate-900/10 leading-relaxed">
                    <div className="flex items-start space-x-2 bg-blue-50/20 dark:bg-slate-800/20 p-4 rounded-xl border-l-2 border-blue-500">
                      <Award size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-1">AI Career Advisor Answer Key</h5>
                        <div className="whitespace-pre-line text-xs font-sans">{q.expected_answer}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <HelpCircle size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Prep sheets list empty.</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Choose a target role from the dropdown menu and generate questions to populate dashboard cards.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPrep;
