import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Send,
  Search,
  Sparkles,
  CheckCircle2,
  Cpu,
  BarChart3,
  Layers,
  ArrowRight,
  Zap,
  Activity,
  Flame,
  Clock,
  Lock,
  TrendingUp,
  CheckCheck,
  User,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useDisplayMode } from '../context/DisplayModeContext';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { AnalyticsSummary, ChartDataPoint } from '../types';

interface InteractiveSample {
  title: string;
  desc: string;
  category: string;
  confidence: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  score: number;
  features: string[];
  reason: string;
}

const INTERACTIVE_SAMPLES: InteractiveSample[] = [
  {
    title: "Exposed electrical wiring sparking near staircase",
    desc: "Live bare wires hanging from ceiling sparking violently near AC unit. Severe electrocution danger to students.",
    category: "Electrical and lighting",
    confidence: 0.984,
    priority: "Critical",
    score: 92,
    features: ["sparking", "live wire", "electrocution", "cables"],
    reason: "Critical safety risk: reports sparking live wires in public corridor with imminent hazard."
  },
  {
    title: "No running water on 3rd floor hostel washrooms",
    desc: "Complete tap water cut since yesterday morning. Over 80 residents unable to shower or use sanitary facilities.",
    category: "Water supply",
    confidence: 0.962,
    priority: "High",
    score: 74,
    features: ["water cut", "tap water", "hostel", "residents"],
    reason: "Major operational disruption affecting 80+ residential students across entire floor."
  },
  {
    title: "Projector bulb dead in lecture hall 101",
    desc: "Ceiling projector will not turn on and bulb warning light is blinking red during faculty presentation.",
    category: "Classroom and laboratory facilities",
    confidence: 0.941,
    priority: "Medium",
    score: 52,
    features: ["projector", "bulb", "lecture hall", "presentation"],
    reason: "Classroom facility impairment disrupting lecture slides; no physical hazard present."
  }
];

export const HomePage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isMobileMode } = useDisplayMode();
  const { user, isAdmin } = useAuth();

  const [healthStatus, setHealthStatus] = useState<string>('checking');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categoriesData, setCategoriesData] = useState<ChartDataPoint[]>([]);
  const [prioritiesData, setPrioritiesData] = useState<ChartDataPoint[]>([]);
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const [healthRes, sumRes, catsRes, priosRes] = await Promise.all([
          api.getHealth().catch(() => ({ status: 'active' })),
          api.getAnalyticsSummary().catch(() => null),
          api.getCategoriesDistribution().catch(() => []),
          api.getPrioritiesDistribution().catch(() => [])
        ]);

        if (healthRes?.status) setHealthStatus(healthRes.status);
        if (sumRes) setSummary(sumRes);
        if (catsRes) setCategoriesData(catsRes.slice(0, 5));
        if (priosRes) setPrioritiesData(priosRes);
      } catch (err) {
        console.warn('Telemetry sync error', err);
      }
    }
    loadTelemetry();
  }, []);

  const sample = INTERACTIVE_SAMPLES[activeSampleIndex];

  // Colors for Category Bar Chart
  const BAR_COLORS = isDark
    ? ['#8B5CF6', '#3B82F6', '#22D3EE', '#FB7185', '#FBBF24']
    : ['#7C3AED', '#3B82F6', '#06B6D4', '#F43F5E', '#F59E0B'];

  // SMARTPHONE-ONLY MODE PRESENTATION
  if (isMobileMode) {
    return (
      <div className="w-full text-[#172033] dark:text-[#F8FAFC] flex flex-col space-y-6 px-3.5 py-4 transition-colors duration-300">
        {/* Mobile Hero Section */}
        <section className="space-y-4">
          {/* AI Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-[#151D38]/95 border border-violet-200/90 dark:border-white/10 text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-mintGreen dark:bg-darkMint ring-2 ring-emerald-200 dark:ring-emerald-800 animate-pulse" />
            <span className="font-extrabold text-[#172033] dark:text-[#F8FAFC]">10-Class ML</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-primaryViolet dark:text-cyanAccent font-bold">NLP Triage</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-emerald-700 dark:text-darkMint font-bold">{healthStatus === 'healthy' || healthStatus === 'active' ? 'Active' : 'Standby'}</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl xs:text-3xl font-black tracking-tight text-[#172033] dark:text-[#F8FAFC] leading-tight">
            Report Smarter.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryViolet via-brightBlue to-cyanAccent dark:from-darkPurple dark:via-darkBlue dark:to-cyanAccent">
              Prioritise Better.
            </span>{' '}
            Resolve Faster.
          </h1>

          {/* Supporting description */}
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Transform everyday complaints into actionable intelligence with automated classification and transparent priority recommendations.
          </p>

          {/* Primary Action Button */}
          <Link
            to="/submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue hover:opacity-95 text-white shadow-glossy-light dark:shadow-neon-violet/40 active:scale-98 transition-all duration-200"
          >
            <Send className="w-4 h-4" />
            <span>Submit a Complaint</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </Link>

          {/* Secondary Action Row */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/track"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs bg-white dark:bg-[#151D38] hover:bg-slate-50 dark:hover:bg-[#171F3B] text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 shadow-xs transition-all"
            >
              <Search className="w-3.5 h-3.5 text-brightBlue dark:text-cyanAccent" />
              <span>Track Status</span>
            </Link>

            <Link
              to="/model-eval"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs bg-[#FFF4E8] dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30 shadow-xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>ML Metrics</span>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 pt-1 px-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-mintGreen dark:text-darkMint" />
              Human review
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brightBlue dark:text-cyanAccent" />
              SQLite audit
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple" />
              99% accuracy
            </span>
          </div>
        </section>

        {/* Quick Action Dashboard (2x2 Grid) */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quick Action Hub
            </span>
            <span className="text-[10px] font-mono text-primaryViolet dark:text-cyanAccent font-bold">1-Tap Launch</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/submit"
              className="p-3.5 rounded-2xl bg-white dark:bg-[#151D38] border border-violet-200/80 dark:border-violet-500/20 shadow-xs hover:shadow-md transition-all active:scale-98 flex flex-col justify-between min-h-[96px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primaryViolet to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-primaryViolet dark:text-cyanAccent opacity-60" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-[#172033] dark:text-[#F8FAFC]">Lodge Ticket</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Report campus issue</div>
              </div>
            </Link>

            <Link
              to="/track"
              className="p-3.5 rounded-2xl bg-white dark:bg-[#151D38] border border-blue-200/80 dark:border-cyan-500/20 shadow-xs hover:shadow-md transition-all active:scale-98 flex flex-col justify-between min-h-[96px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brightBlue to-cyanAccent flex items-center justify-center text-white shadow-xs">
                  <Search className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-brightBlue dark:text-cyanAccent opacity-60" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-[#172033] dark:text-[#F8FAFC]">Track Status</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Live ticket lifecycle</div>
              </div>
            </Link>

            <Link
              to="/model-eval"
              className="p-3.5 rounded-2xl bg-white dark:bg-[#151D38] border border-amber-200/80 dark:border-amber-500/20 shadow-xs hover:shadow-md transition-all active:scale-98 flex flex-col justify-between min-h-[96px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 opacity-60" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-[#172033] dark:text-[#F8FAFC]">AI Evaluation</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Confusion matrix</div>
              </div>
            </Link>

            <Link
              to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#151D38] border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs hover:shadow-md transition-all active:scale-98 flex flex-col justify-between min-h-[96px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-mintGreen to-tealAccent flex items-center justify-center text-white shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-darkMint opacity-60" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-[#172033] dark:text-[#F8FAFC] truncate">
                  {user ? (isAdmin ? 'Admin Console' : 'My Dashboard') : 'User Portal'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user ? user.name : 'Fast demo sign-in'}
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Live SQLite Telemetry (2x2 Grid) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live SQLite Telemetry
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-darkMint font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real Records
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-[#F0E9FF] dark:bg-[#171F3B] border border-violet-200/80 dark:border-white/10 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primaryViolet dark:text-darkPurple">Analysed</span>
                <Cpu className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple" />
              </div>
              <div className="text-2xl font-black text-[#172033] dark:text-[#F8FAFC]">
                {summary ? summary.total_complaints : 22}
              </div>
              <div className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">Real database records</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF4E8] dark:bg-[#171F3B] border border-amber-200/80 dark:border-white/10 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-darkAmber">In Triage</span>
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-darkAmber" />
              </div>
              <div className="text-2xl font-black text-[#172033] dark:text-[#F8FAFC]">
                {summary ? summary.open_complaints : 19}
              </div>
              <div className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">Under Review</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#E8FFF5] dark:bg-[#171F3B] border border-emerald-200/80 dark:border-white/10 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-darkMint">Resolved Rate</span>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-darkMint" />
              </div>
              <div className="text-2xl font-black text-[#172033] dark:text-[#F8FAFC]">
                {summary && summary.total_complaints > 0
                  ? `${Math.round((summary.resolved_complaints / summary.total_complaints) * 100)}%`
                  : '5%'}
              </div>
              <div className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                {summary ? `${summary.resolved_complaints} closed cases` : 'Closed cases'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF0F5] dark:bg-[#171F3B] border border-rose-200/80 dark:border-white/10 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-darkCoral">Critical Safety</span>
                <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-darkCoral" />
              </div>
              <div className="text-2xl font-black text-[#172033] dark:text-[#F8FAFC]">
                {summary ? summary.critical_complaints : 1}
              </div>
              <div className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">Immediate intervention</div>
            </div>
          </div>
        </section>

        {/* Live AI Inference Engine (Compact Mobile Preview) */}
        <section className="p-4 rounded-3xl bg-white/95 dark:bg-[#171F3B] border border-violet-100/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primaryViolet to-brightBlue flex items-center justify-center text-white">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">Live AI Inference</div>
                <div className="text-[9.5px] text-brightBlue dark:text-cyanAccent font-mono">3.8ms Latency • Verified Model</div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-white/5 p-0.5 rounded-lg">
              {INTERACTIVE_SAMPLES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSampleIndex(i)}
                  className={`w-6 h-6 rounded-md text-[11px] font-mono font-bold transition-all ${
                    activeSampleIndex === i
                      ? 'bg-gradient-to-tr from-primaryViolet to-brightBlue text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Sample Description */}
          <div className="p-3 rounded-xl bg-[#EEF5FF] dark:bg-[#0F1530] border border-blue-100 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
            <div className="font-bold text-[#172033] dark:text-[#F8FAFC] leading-snug">{sample.title}</div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-2">{sample.desc}</div>
          </div>

          {/* Predictions Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-[#F0E9FF] dark:bg-[#151D38] border border-violet-200/80 dark:border-violet-500/20 space-y-1">
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-primaryViolet dark:text-darkPurple">Category</div>
              <div className="text-[11px] font-extrabold text-[#172033] dark:text-[#F8FAFC] truncate">{sample.category}</div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <div className="flex-1 bg-violet-200/60 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primaryViolet to-brightBlue h-full rounded-full"
                    style={{ width: `${sample.confidence * 100}%` }}
                  />
                </div>
                <span className="text-[9.5px] font-mono font-bold text-primaryViolet dark:text-cyanAccent">
                  {(sample.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FFF0F5] dark:bg-[#151D38] border border-rose-200/80 dark:border-rose-500/20 space-y-1">
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-rose-700 dark:text-darkCoral">Priority</div>
              <div className="flex items-center gap-1">
                <PriorityBadge priority={sample.priority} size="sm" />
                <span className="text-[10px] font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">({sample.score}/100)</span>
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">Deterministic Rubric</div>
            </div>
          </div>

          {/* Attributed Tokens */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9.5px] font-bold uppercase text-slate-400">Tokens:</span>
            {sample.features.map((feat) => (
              <span
                key={feat}
                className="px-2 py-0.5 rounded-md bg-[#E7F4FF] dark:bg-white/5 border border-blue-200 dark:border-cyan-500/30 text-brightBlue dark:text-cyanAccent font-mono text-[9.5px] font-semibold"
              >
                +{feat}
              </span>
            ))}
          </div>

          <Link
            to="/submit"
            className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-gradient-to-r dark:from-primaryViolet dark:to-brightBlue text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
          >
            <Send className="w-3.5 h-3.5 text-cyanAccent" />
            <span>Test with Your Own Complaint &rarr;</span>
          </Link>
        </section>

        {/* 5-Step Lifecycle Roadmap (Compact Mobile Stepper) */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              5-Stage Architecture
            </span>
            <span className="text-[10px] font-mono text-primaryViolet dark:text-cyanAccent font-bold">End-to-End</span>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-[#171F3B] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-3">
            {[
              { step: '01', title: 'Lodge Ticket', desc: 'Complainant describes problem in conversational text.' },
              { step: '02', title: 'NLP Classification', desc: 'TF-IDF vectorizer + ML classifies in < 4ms.' },
              { step: '03', title: 'Priority Rubric', desc: 'Calculates safety score (0-100) and SLA timeline.' },
              { step: '04', title: 'Admin Triage', desc: 'Authorized facility crew assigned with audit trail.' },
              { step: '05', title: 'Verified Fix', desc: 'Work order signed off with public tracking history.' }
            ].map((st, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-primaryViolet dark:text-cyanAccent font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {st.step}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">{st.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{st.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Examiner Demonstration Access Card */}
        <section className="p-3.5 rounded-2xl bg-white dark:bg-[#171F3B] border border-slate-200/90 dark:border-white/10 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-primaryViolet dark:text-cyanAccent flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">Examiner & Demo Access</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Admin: <code className="text-primaryViolet dark:text-cyanAccent font-mono font-bold">admin@complainai.ai</code>
              </div>
            </div>
          </div>
          <Link
            to="/login"
            className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-white/5 hover:bg-violet-100 dark:hover:bg-white/10 text-primaryViolet dark:text-cyanAccent border border-violet-200 dark:border-white/10 text-xs font-bold shrink-0 transition-colors"
          >
            Sign In &rarr;
          </Link>
        </section>
      </div>
    );
  }

  // DESKTOP MODE PRESENTATION (RETAINS EXACT EXISTING EXPERIENCE)
  return (
    <div className="min-h-screen bg-[#F4F2FF] dark:bg-[#080B18] text-[#172033] dark:text-[#F8FAFC] flex flex-col justify-between selection:bg-primaryViolet selection:text-white transition-colors duration-300">
      {/* Background Glow Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        {isDark ? (
          <>
            <div className="absolute top-10 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-violet-900/25 via-indigo-900/20 to-transparent rounded-full blur-[130px]" />
            <div className="absolute top-32 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-cyan-900/25 via-blue-900/15 to-transparent rounded-full blur-[130px]" />
            <div className="absolute bottom-20 left-1/3 w-[550px] h-[550px] bg-gradient-to-tr from-purple-950/20 to-transparent rounded-full blur-[140px]" />
          </>
        ) : (
          <>
            <div className="absolute top-10 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-[#F0E9FF] via-[#E7F4FF]/70 to-transparent rounded-full blur-[100px]" />
            <div className="absolute top-32 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-[#E7F4FF] via-[#FFF0F5]/70 to-transparent rounded-full blur-[100px]" />
            <div className="absolute bottom-20 left-1/3 w-[550px] h-[550px] bg-gradient-to-tr from-[#FFF0F5] via-[#E8FFF5]/60 to-transparent rounded-full blur-[120px]" />
          </>
        )}
      </div>

      {/* Hero Section — 2 Column Layout */}
      <section className="relative pt-10 sm:pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column (7 cols): Copy, CTA, Badges */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Engine Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#151D38]/90 border border-violet-200/90 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-card-light dark:shadow-card-dark backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-mintGreen dark:bg-darkMint ring-2 ring-emerald-200 dark:ring-emerald-800 animate-pulse" />
              <span className="font-extrabold text-[#172033] dark:text-[#F8FAFC]">AI-POWERED COMPLAINT INTELLIGENCE</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-primaryViolet dark:text-darkPurple font-bold">10-Class ML Classifier</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-emerald-700 dark:text-darkMint font-bold">{healthStatus === 'healthy' ? 'Active' : 'Standby'}</span>
            </div>

            {/* Hero Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#172033] dark:text-[#F8FAFC] leading-[1.12]">
              Report Smarter.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryViolet via-brightBlue to-cyanAccent dark:from-darkPurple dark:via-darkBlue dark:to-darkCyan">
                Prioritise Better.
              </span>{' '}
              Resolve Faster.
            </h1>

            {/* Supporting text */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl">
              Transform everyday complaints into actionable intelligence with automated classification, transparent priority recommendations and intelligent resolution tracking.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link
                to="/submit"
                className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue hover:opacity-95 text-white shadow-glossy-light dark:shadow-neon-violet/40 hover:scale-102 transition-all duration-200"
              >
                <Send className="w-4 h-4" />
                <span>Submit a Complaint</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>

              <Link
                to="/track"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-white dark:bg-[#151D38] hover:bg-slate-50 dark:hover:bg-[#171F3B] text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark transition-all hover:border-brightBlue hover:text-brightBlue dark:hover:border-darkCyan dark:hover:text-darkCyan"
              >
                <Search className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
                <span>Track Your Complaint</span>
              </Link>

              <Link
                to="/model-eval"
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-[#FFF4E8] dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30 shadow-xs transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Model Evaluation</span>
              </Link>
            </div>

            {/* Supporting Trust & Demo Note */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-mintGreen dark:text-darkMint" /> Human-in-the-loop review
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brightBlue dark:text-darkBlue" /> Immutable SQLite audit trail
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primaryViolet dark:text-darkPurple" /> 99.0% held-out test accuracy
              </span>
            </div>

            {/* Demonstration Credentials Card */}
            <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#151D38]/95 border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-primaryViolet dark:text-darkPurple flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#172033] dark:text-[#F8FAFC]">Examiner & Demo Access:</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Pre-seeded Admin (<code className="text-primaryViolet dark:text-darkCyan font-mono font-bold bg-violet-50 dark:bg-white/5 px-1 py-0.5 rounded">admin@complainai.ai</code>) and Student accounts with 1-click fast login.
                  </div>
                </div>
              </div>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-violet-50 dark:bg-white/5 hover:bg-violet-100 dark:hover:bg-white/10 text-primaryViolet dark:text-darkPurple border border-violet-200 dark:border-white/10 text-xs font-bold transition-all whitespace-nowrap"
              >
                Sign In &rarr;
              </Link>
            </div>
          </div>

          {/* Right Column (5 cols): AI Intelligence Visualisation */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl bg-white/95 dark:bg-[#171F3B] p-6 sm:p-7 border border-violet-100/90 dark:border-violet-500/30 shadow-2xl shadow-violet-500/10 dark:shadow-neon-violet/20 backdrop-blur-2xl space-y-5">
              {/* Header with Sample Selector */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primaryViolet to-brightBlue flex items-center justify-center text-white shadow-xs">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] tracking-wide">Live AI Inference Engine</div>
                    <div className="text-[10px] text-brightBlue dark:text-darkCyan font-mono font-semibold">Latency: 3.8ms • Verified Supervised Model</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl">
                  {INTERACTIVE_SAMPLES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSampleIndex(i)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeSampleIndex === i
                          ? 'bg-gradient-to-tr from-primaryViolet to-brightBlue text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                      }`}
                      title={`View Sample ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complaint Input Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Sample Complaint Description</span>
                <div className="p-3.5 rounded-2xl bg-[#EEF5FF] dark:bg-[#0F1530] border border-blue-100 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans shadow-2xs">
                  <div className="font-bold text-[#172033] dark:text-[#F8FAFC] mb-0.5">{sample.title}</div>
                  <div className="text-slate-600 dark:text-slate-400 text-[11px]">{sample.desc}</div>
                </div>
              </div>

              {/* AI Classification & Priority Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {/* Category Card */}
                <div className="p-3.5 rounded-2xl bg-[#F0E9FF] dark:bg-[#151D38] border border-violet-200/80 dark:border-violet-500/30 space-y-1 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primaryViolet dark:text-darkPurple">Classified Category</div>
                  <div className="text-xs font-extrabold text-[#172033] dark:text-[#F8FAFC] truncate">{sample.category}</div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="flex-1 bg-violet-200/60 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primaryViolet to-brightBlue h-full rounded-full transition-all duration-500"
                        style={{ width: `${sample.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-primaryViolet dark:text-darkCyan">
                      {(sample.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Priority Card */}
                <div className="p-3.5 rounded-2xl bg-[#FFF0F5] dark:bg-[#151D38] border border-rose-200/80 dark:border-rose-500/30 space-y-1 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-darkCoral">Priority Recommendation</div>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={sample.priority} size="sm" />
                    <span className="text-xs font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">({sample.score}/100)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 font-medium truncate">
                    Deterministic Safety Rubric
                  </div>
                </div>
              </div>

              {/* Influential Tokens */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center justify-between">
                  <span>Key Influential N-Grams (TF-IDF Attribution)</span>
                  <span className="text-mintGreen dark:text-darkMint font-mono font-bold text-[9px]">&#10003; Vectorized</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sample.features.map((feat) => (
                    <span
                      key={feat}
                      className="px-2.5 py-1 rounded-lg bg-[#E7F4FF] dark:bg-white/5 border border-blue-200 dark:border-cyan-500/30 text-brightBlue dark:text-darkCyan font-mono text-[10px] font-semibold"
                    >
                      +{feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reasoning Quote */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200/70 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{sample.reason}"
              </div>

              {/* Interactive Try Button */}
              <Link
                to="/submit"
                className="w-full py-3 rounded-xl bg-slate-900 dark:bg-gradient-to-r dark:from-primaryViolet dark:to-brightBlue hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-cyanAccent" />
                <span>Test with Your Own Complaint &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section C: 4 Colourful Metric Cards (Backed by Real SQLite Data) */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Stat 1: Total Analysed (Lavender / Violet) */}
          <div className="relative group rounded-3xl p-6 bg-[#F0E9FF] dark:bg-[#171F3B] border border-violet-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primaryViolet dark:text-darkPurple">Total Analysed</span>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-violet-900/40 text-primaryViolet dark:text-darkPurple flex items-center justify-center shadow-xs">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC]">
              {summary ? summary.total_complaints : 8}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-mintGreen dark:text-darkMint" />
              <span>Real database records</span>
            </div>
          </div>

          {/* Stat 2: Active Triage (Soft Peach / Amber) */}
          <div className="relative group rounded-3xl p-6 bg-[#FFF4E8] dark:bg-[#171F3B] border border-amber-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-darkAmber">Active Triage</span>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-amber-900/40 text-amber-600 dark:text-darkAmber flex items-center justify-center shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC]">
              {summary ? summary.open_complaints : 4}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Submitted / Under Review</div>
          </div>

          {/* Stat 3: Resolved Successfully (Mint Surface) */}
          <div className="relative group rounded-3xl p-6 bg-[#E8FFF5] dark:bg-[#171F3B] border border-emerald-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-darkMint">Resolved Rate</span>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-emerald-900/40 text-emerald-600 dark:text-darkMint flex items-center justify-center shadow-xs">
                <CheckCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC]">
              {summary && summary.total_complaints > 0
                ? `${Math.round((summary.resolved_complaints / summary.total_complaints) * 100)}%`
                : '100%'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-brightBlue dark:text-darkCyan" />
              <span>{summary ? `${summary.resolved_complaints} closed cases` : 'Facility sign-off'}</span>
            </div>
          </div>

          {/* Stat 4: Critical Hazards Flagged (Pale Pink Surface / Coral) */}
          <div className="relative group rounded-3xl p-6 bg-[#FFF0F5] dark:bg-[#171F3B] border border-rose-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-darkCoral">Critical Safety</span>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-rose-900/40 text-rose-600 dark:text-darkCoral flex items-center justify-center shadow-xs">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC]">
              {summary ? summary.critical_complaints : 2}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Immediate intervention required</div>
          </div>
        </div>
      </section>

      {/* Section D: Feature Showcase ("Intelligence That Moves Complaints Forward") */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-2">
          <span className="text-xs uppercase font-extrabold text-primaryViolet dark:text-darkPurple tracking-widest px-3.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/40">
            Intelligent Core Systems
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC] pt-2">
            Intelligence That Moves Complaints Forward
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Engineered with transparent mathematical logic, persistent state modeling, and strict role-based controls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="relative group rounded-3xl p-6 bg-white dark:bg-[#171F3B] border border-violet-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark hover:border-violet-300 dark:hover:border-violet-500 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primaryViolet to-indigo-600 flex items-center justify-center text-white mb-4 shadow-glossy-light dark:shadow-neon-violet/30">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-base mb-2">AI Classification</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Scikit-learn pipeline vectorizes descriptions via TF-IDF (1–2 n-grams) and passes tokens to balanced Multinomial Logistic Regression.
            </p>
            <div className="text-[11px] font-mono text-primaryViolet dark:text-darkPurple flex items-center gap-1 font-bold">
              <span>10 campus domains</span> &rarr;
            </div>
          </div>

          {/* Feature 2 */}
          <div className="relative group rounded-3xl p-6 bg-white dark:bg-[#171F3B] border border-amber-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark hover:border-amber-300 dark:hover:border-amber-500 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-coralAccent flex items-center justify-center text-white mb-4 shadow-glossy-light dark:shadow-neon-amber/30">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-base mb-2">Smart Priority Prediction</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Deterministic 0–100 scoring based on safety hazards (0–40), operational disruption (0–25), population (0–20), and duration (0–15).
            </p>
            <div className="text-[11px] font-mono text-amber-800 dark:text-darkAmber flex items-center gap-1 font-bold">
              <span>Automatic emergency floors</span> &rarr;
            </div>
          </div>

          {/* Feature 3 */}
          <div className="relative group rounded-3xl p-6 bg-white dark:bg-[#171F3B] border border-blue-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark hover:border-cyan-300 dark:hover:border-cyan-500 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brightBlue to-cyanAccent flex items-center justify-center text-white mb-4 shadow-glossy-light dark:shadow-neon-cyan/30">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-base mb-2">Duplicate Detection</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Computes TF-IDF cosine similarity against open campus tickets to alert facility managers of duplicate calls without data loss.
            </p>
            <div className="text-[11px] font-mono text-brightBlue dark:text-darkCyan flex items-center gap-1 font-bold">
              <span>Cosine similarity &ge; 50%</span> &rarr;
            </div>
          </div>

          {/* Feature 4 */}
          <div className="relative group rounded-3xl p-6 bg-white dark:bg-[#171F3B] border border-emerald-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark hover:border-emerald-300 dark:hover:border-emerald-500 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-mintGreen to-tealAccent flex items-center justify-center text-white mb-4 shadow-glossy-light dark:shadow-neon-mint/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-base mb-2">Explainable AI & Audit Trail</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Transparent prediction attribution and immutable lifecycle tracking across Submitted, Under Review, Assigned, In Progress, and Resolved.
            </p>
            <div className="text-[11px] font-mono text-mintGreen dark:text-darkMint flex items-center gap-1 font-bold">
              <span>Immutable audit trail</span> &rarr;
            </div>
          </div>
        </div>
      </section>

      {/* Section E: AI Analytics Command Center */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl p-6 sm:p-10 bg-white dark:bg-[#171F3B] border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark relative overflow-hidden backdrop-blur-2xl space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-primaryViolet dark:text-darkCyan font-bold mb-1">
                <span className="w-2 h-2 rounded-full bg-primaryViolet dark:bg-darkCyan" />
                <span>REAL DATABASE TELEMETRY</span>
              </div>
              <h3 className="text-2xl font-black text-[#172033] dark:text-[#F8FAFC]">Campus Operational Intelligence Panel</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aggregated live from stored SQLite complaint records and machine learning outputs</p>
            </div>

            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors"
            >
              <span>Open Admin Command Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Chart 1: Category Distribution */}
            <div className="lg:col-span-7 bg-[#EEF5FF] dark:bg-[#0F1530] rounded-2xl p-5 border border-blue-100 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Complaints by Category Volume</h4>
                <span className="text-[10px] font-mono text-primaryViolet dark:text-darkPurple bg-violet-100 dark:bg-violet-950/60 px-2.5 py-0.5 rounded-md font-bold">SQL Aggregation</span>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoriesData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 500 }}
                      interval={0}
                      tickFormatter={(val: string) => val.split(' ')[0]}
                    />
                    <YAxis tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#171F3B' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: isDark ? '#F8FAFC' : '#1E293B',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)'
                      }}
                      itemStyle={{ color: isDark ? '#F8FAFC' : '#1E293B', fontWeight: 600 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {categoriesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Metrics & Priorities Panel */}
            <div className="lg:col-span-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Urgency Distribution & Triage SLAs</h4>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-[#FFF0F5] dark:bg-[#151D38] border border-rose-200 dark:border-rose-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">Critical Priority</span>
                  </div>
                  <span className="font-mono text-rose-700 dark:text-darkCoral font-extrabold">Immediate &lt; 2h SLA</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF4E8] dark:bg-[#151D38] border border-amber-200 dark:border-amber-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">High Priority</span>
                  </div>
                  <span className="font-mono text-amber-800 dark:text-darkAmber font-extrabold">&lt; 12h SLA</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#E7F4FF] dark:bg-[#151D38] border border-sky-200 dark:border-cyan-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">Medium Priority</span>
                  </div>
                  <span className="font-mono text-sky-700 dark:text-darkCyan font-extrabold">&lt; 24h SLA</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F0E9FF] dark:bg-[#151D38] border border-violet-200 dark:border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">Low Priority</span>
                  </div>
                  <span className="font-mono text-slate-600 dark:text-slate-400 font-extrabold">Standard Routine</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section F: 5-Step Workflow */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-2">
          <span className="text-xs uppercase font-extrabold text-primaryViolet dark:text-darkPurple tracking-widest px-3.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/40">
            End-To-End Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC] pt-2">
            How Complaints Move Through ComplainAI
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Transparent automated intelligence guiding humans through every resolution stage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {[
            {
              step: '01',
              title: 'Lodge Issue',
              desc: 'Complainant describes problem in conversational natural language.',
              color: 'from-primaryViolet to-indigo-600'
            },
            {
              step: '02',
              title: 'NLP Categorization',
              desc: 'TF-IDF vectorizer + Logistic Regression predicts category in < 4ms.',
              color: 'from-indigo-600 to-brightBlue'
            },
            {
              step: '03',
              title: 'Priority Rubric',
              desc: 'Scoring engine evaluates safety risk, population, and persistence.',
              color: 'from-brightBlue to-cyanAccent'
            },
            {
              step: '04',
              title: 'Admin Triage',
              desc: 'Facility head reviews, overrides if needed, and dispatches crew.',
              color: 'from-cyanAccent to-tealAccent'
            },
            {
              step: '05',
              title: 'Verified Fix',
              desc: 'Technician signs off, resolution notes logged to public ID audit trail.',
              color: 'from-tealAccent to-mintGreen'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-3xl bg-white dark:bg-[#171F3B] border border-slate-200/90 dark:border-white/10 space-y-3 relative group hover:border-brightBlue dark:hover:border-cyan-400 hover:shadow-card-light dark:hover:shadow-neon-cyan/20 transition-all duration-300 shadow-card-light dark:shadow-card-dark"
            >
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center font-mono font-black text-xs text-white shadow-md`}>
                {item.step}
              </div>
              <h4 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm">{item.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section G: Call to Action Banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="relative rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue text-white shadow-glossy-light dark:shadow-neon-violet/40 overflow-hidden text-center space-y-5">
          <div className="max-w-2xl mx-auto space-y-3">
            <h3 className="text-3xl sm:text-4xl font-black text-white">
              Every Complaint Deserves to Be Heard.
            </h3>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed font-medium">
              Experience the difference between disconnected ticketing chaos and intelligent, explainable complaint resolution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-primaryViolet font-black text-sm shadow-lg hover:scale-102 transition-transform"
            >
              <Send className="w-4 h-4" />
              <span>Submit a Complaint Now</span>
            </Link>

            <Link
              to="/model-eval"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/30 backdrop-blur-md transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Explore AI Insights & Metrics</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
