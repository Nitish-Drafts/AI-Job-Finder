import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Sparkles,
  Search,
  CheckCircle2,
  Cpu,
  Trello,
  HelpCircle,
  FileText,
  Clock
} from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden selection:bg-blue-600/30 selection:text-blue-200">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Briefcase size={20} />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              AI Job Finder
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative">
        <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-full px-4.5 py-1.5 mb-8">
          <Sparkles size={14} className="text-blue-400" />
          <span className="text-xs text-slate-300 font-semibold tracking-wide">Automate Your Application Success</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-6">
          Find Software Engineering Jobs<br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Optimized by AI
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
          AI Job Finder automatically aggregates listings from multiple job boards, parses your resume, calculates detailed ATS match scores, generates tailored cover letters, and optimizes summaries to land your interview.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            to="/signup"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-4 rounded-xl text-base transition-all shadow-xl shadow-blue-500/25 hover:translate-y-[-1px]"
          >
            Start Scraping & Matching
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-8 py-4 rounded-xl text-base transition-all"
          >
            How it Works
          </a>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="border-y border-slate-900/80 bg-slate-950/50 py-12 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <h3 className="text-4xl font-extrabold text-white mb-2">10,000+</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Jobs Synced Daily</p>
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-white mb-2">92%</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">ATS Success Rate</p>
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-white mb-2">3.5x</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">More Interview Invites</p>
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-white mb-2">&lt; 10s</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Resume Optimization</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 relative">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Everything You Need to Scale Your Job Search
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900">
            <div className="bg-blue-600/10 text-blue-400 p-3 rounded-xl inline-block mb-6">
              <Search size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Multi-Board Scraper</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Automatically harvests backend engineering and frontend postings from Greenhouse, Lever, Ashby, and company career portals.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900">
            <div className="bg-purple-600/10 text-purple-400 p-3 rounded-xl inline-block mb-6">
              <Cpu size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">ATS Vector Matcher</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Extracts tech stacks from your resume, translates them into dense embeddings, and checks alignments using cosine similarities.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900">
            <div className="bg-emerald-600/10 text-emerald-400 p-3 rounded-xl inline-block mb-6">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Resume Optimizer</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generates customized executive summaries and metrics-oriented accomplishments to target exact keywords expected in target descriptions.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900">
            <div className="bg-pink-600/10 text-pink-400 p-3 rounded-xl inline-block mb-6">
              <Trello size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Application Tracker</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Organizes jobs in a Kanban pipeline (Wishlist, Applied, Interview, Offer) to keep a clear view of your active schedules.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900">
            <div className="bg-yellow-600/10 text-yellow-400 p-3 rounded-xl inline-block mb-6">
              <HelpCircle size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Interview Preparer</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Automatically creates tailored Coding, SQL, Python, ML, System Design, and behavioral question prep cards for connected roles.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900">
            <div className="bg-indigo-600/10 text-indigo-400 p-3 rounded-xl inline-block mb-6">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Background Scheduler</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Runs crawlers at 8:00 AM, recalculates ATS fit, and sends match digests to your email so you are always first to apply.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-slate-950 border-t border-slate-900/80 py-24 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-400 mb-16 max-w-xl mx-auto">
            Choose the plan that matches your current application scaling strategy.
          </p>

          <div className="grid md:grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
            {/* Free */}
            <div className="bg-slate-900 border border-slate-850 p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-300">Basic</h4>
                <div className="flex items-baseline my-4">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="text-slate-500 ml-2">/ month</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-slate-400">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span>Upload 1 Resume (PDF)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span>Scrape up to 50 daily jobs</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span>Basic ATS Keyword match</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/signup"
                className="w-full bg-slate-800 hover:bg-slate-750 text-white text-center font-medium py-3 rounded-xl text-sm transition-all"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-blue-950/20 to-slate-900 border-2 border-blue-600 p-8 rounded-2xl relative flex flex-col justify-between shadow-2xl shadow-blue-500/10">
              <div className="absolute top-0 right-6 translate-y-[-50%] bg-blue-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                Popular
              </div>
              <div>
                <h4 className="text-lg font-semibold text-blue-400">Pro Developer</h4>
                <div className="flex items-baseline my-4">
                  <span className="text-4xl font-extrabold">$19</span>
                  <span className="text-slate-500 ml-2">/ month</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-slate-300">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span>Unlimited Resume Profiles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span>Advanced Vector Matching</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span>Unlimited Cover Letters & exports</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span>Auto-scrapers & email digests</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/signup"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-medium py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-center text-sm text-slate-600">
        <p>© 2026 AI Job Finder. Built for engineers seeking automated scaling. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
