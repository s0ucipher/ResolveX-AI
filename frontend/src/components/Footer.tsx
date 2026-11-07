import React from 'react';
import { ShieldCheck, Code2, BookOpen, Sparkles, Terminal, Activity, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-[#EEF5FF] dark:bg-[#0F1530] border-t border-violet-100 dark:border-white/10 text-slate-600 dark:text-slate-400 py-16 overflow-hidden transition-colors duration-300">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primaryViolet/5 dark:bg-primaryViolet/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyanAccent/5 dark:bg-cyanAccent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-extrabold text-xl tracking-tight">
              <span>Complain<span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryViolet to-cyanAccent">AI</span></span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Next-generation complaint intelligence system combining Scikit-learn NLP classification, deterministic priority scoring, and complete audited lifecycle tracking.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100/70 dark:bg-white/5 text-primaryViolet dark:text-darkPurple text-[11px] font-semibold border border-violet-200 dark:border-violet-500/20">
                <Code2 className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple" />
                <span>TF-IDF + Logistic Reg</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/70 dark:bg-white/5 text-emerald-700 dark:text-darkMint text-[11px] font-semibold border border-emerald-200 dark:border-mintGreen/20">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-darkMint" />
                <span>Deterministic Rubric</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-[#172033] dark:text-[#F8FAFC] text-xs font-bold uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><Link to="/submit" className="text-slate-600 dark:text-slate-400 hover:text-primaryViolet dark:hover:text-cyanAccent transition-colors">Submit New Complaint</Link></li>
              <li><Link to="/track" className="text-slate-600 dark:text-slate-400 hover:text-primaryViolet dark:hover:text-cyanAccent transition-colors">Track with Public ID</Link></li>
              <li><Link to="/model-eval" className="text-slate-600 dark:text-slate-400 hover:text-primaryViolet dark:hover:text-cyanAccent transition-colors">ML Confusion Matrix & Metrics</Link></li>
              <li><Link to="/admin/login" className="text-slate-600 dark:text-slate-400 hover:text-primaryViolet dark:hover:text-cyanAccent transition-colors">Facility Admin Portal</Link></li>
            </ul>
          </div>

          {/* AI Transparency */}
          <div className="space-y-3">
            <h4 className="text-[#172033] dark:text-[#F8FAFC] text-xs font-bold uppercase tracking-wider">AI Transparency Notice</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Category probabilities and urgency recommendations are decision-support outputs. Real facility administrators hold final sign-off authority.
            </p>
            <div className="p-3 rounded-xl bg-violet-100/60 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-500/20 text-[11px] text-primaryViolet dark:text-darkPurple flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple shrink-0 mt-0.5" />
              <span className="font-medium">Critical safety flags automatically trigger human emergency floor review.</span>
            </div>
          </div>

          {/* Academic Viva Verification */}
          <div className="space-y-3">
            <h4 className="text-[#172033] dark:text-[#F8FAFC] text-xs font-bold uppercase tracking-wider">Academic Assessment</h4>
            <div className="p-4 rounded-xl bg-white dark:bg-[#151D38] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <BookOpen className="w-4 h-4 text-brightBlue dark:text-darkBlue" />
                <span>College Engineering CAA Project</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Demonstrating real full-stack persistence, state machine state transitions, and reproducible scikit-learn model evaluation.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
          <div>
            © {new Date().getFullYear()} ComplainAI. Tagline: <span className="text-slate-700 dark:text-slate-300 font-semibold italic">Report Smarter. Prioritise Better. Resolve Faster.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-mintGreen dark:bg-darkMint animate-pulse" />
              SQLite Persistent Storage
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-brightBlue dark:bg-cyanAccent" />
              FastAPI + React 18
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
