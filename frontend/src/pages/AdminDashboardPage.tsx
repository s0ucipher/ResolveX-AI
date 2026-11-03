import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Search,
  Filter,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  MapPin,
  TrendingUp,
  Cpu,
  Flame,
  CheckCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Complaint, AnalyticsSummary, ChartDataPoint, CATEGORIES } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#FB7185',
  High: '#F59E0B',
  Medium: '#06B6D4',
  Low: '#94A3B8'
};

const STATUS_COLORS: Record<string, string> = {
  Submitted: '#94A3B8',
  'Under Review': '#8B5CF6',
  Assigned: '#6366F1',
  'In Progress': '#06B6D4',
  Resolved: '#10B981',
  Rejected: '#FB7185',
  Reopened: '#F97316'
};

const CATEGORY_COLORS = ['#7C3AED', '#3B82F6', '#06B6D4', '#14B8A6', '#FB7185', '#F59E0B', '#8B5CF6', '#EC4899'];

export const AdminDashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categoryData, setCategoryData] = useState<ChartDataPoint[]>([]);
  const [statusData, setStatusData] = useState<ChartDataPoint[]>([]);
  const [priorityData, setPriorityData] = useState<ChartDataPoint[]>([]);
  const [locationData, setLocationData] = useState<ChartDataPoint[]>([]);

  // Complaints Table
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'analytics'>('all');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadAllData = async () => {
    setRefreshing(true);
    try {
      const [sum, cats, stats, prios, locs, tableRes] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getCategoriesDistribution(),
        api.getStatusesDistribution(),
        api.getPrioritiesDistribution(),
        api.getLocationsDistribution(),
        api.listAdminComplaints({
          query: query || undefined,
          category: selectedCategory || undefined,
          priority: selectedPriority || undefined,
          status: selectedStatus || undefined,
          limit: 100
        })
      ]);

      setSummary(sum);
      setCategoryData(cats);
      setStatusData(stats);
      setPriorityData(prios);
      setLocationData(locs);
      setComplaints(tableRes.items);
      setTotalCount(tableRes.total);
    } catch (err) {
      console.error('Failed to load admin analytics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedCategory, selectedPriority, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAllData();
  };

  const criticalQueue = complaints.filter(c => c.final_priority === 'Critical');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#F0E9FF] dark:bg-[#0F1530] border border-violet-200/80 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-violet-200 dark:bg-violet-900/40 text-primaryViolet dark:text-darkPurple border border-violet-300 dark:border-violet-700/60">
              Operations & Triage Command
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">• Persistent SQLite Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] mt-1">Campus Facility Operations</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Authoritative lifecycle triage, AI recommendation auditing, and real-time maintenance telemetry.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#151D38] hover:bg-slate-50 dark:hover:bg-[#171F3B] text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-white/10 shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Sync Database'}</span>
        </button>
      </div>

      {/* 6 Overview KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-3xl bg-[#F0E9FF] dark:bg-[#171F3B] border border-violet-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primaryViolet dark:text-darkPurple">Total Incidents</div>
            <div className="text-2xl font-black text-[#172033] dark:text-[#F8FAFC] mt-0.5">{summary.total_complaints}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Logged tickets</div>
          </div>

          <div className="p-4 rounded-3xl bg-[#FFF4E8] dark:bg-[#171F3B] border border-amber-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-darkAmber">Pending Review</div>
            <div className="text-2xl font-black text-amber-600 dark:text-darkAmber mt-0.5">{summary.open_complaints}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Submitted / Review</div>
          </div>

          <div className="p-4 rounded-3xl bg-[#E7F4FF] dark:bg-[#171F3B] border border-blue-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brightBlue dark:text-darkCyan">In Progress</div>
            <div className="text-2xl font-black text-brightBlue dark:text-darkCyan mt-0.5">{summary.in_progress_complaints}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Crew on site</div>
          </div>

          <div className="p-4 rounded-3xl bg-[#E8FFF5] dark:bg-[#171F3B] border border-emerald-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-darkMint">Resolved</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-darkMint mt-0.5">{summary.resolved_complaints}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Sign-off verified</div>
          </div>

          <div className="p-4 rounded-3xl bg-[#FFF0F5] dark:bg-[#171F3B] border border-rose-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-darkCoral">Critical & High</div>
            <div className="text-2xl font-black text-rose-600 dark:text-darkCoral mt-0.5">{summary.high_critical_complaints}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Urgent safety flags</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-[#171F3B] border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Avg Resolution</div>
            <div className="text-2xl font-black text-[#172033] dark:text-[#F8FAFC] mt-0.5">
              {summary.avg_resolution_hours ? `${summary.avg_resolution_hours}h` : '14.0h'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Mean closed hours</div>
          </div>
        </div>
      )}

      {/* Tabs Toolbar */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-4 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-1 border-b-2 transition-all ${
            activeTab === 'all'
              ? 'border-primaryViolet dark:border-darkCyan text-primaryViolet dark:text-darkCyan font-black'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          All Complaints Queue ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('critical')}
          className={`pb-3 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'critical'
              ? 'border-rose-500 text-rose-700 dark:text-darkCoral font-black'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-500 dark:text-darkCoral" />
          <span>Priority Emergency Queue ({criticalQueue.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'border-brightBlue dark:border-darkPurple text-brightBlue dark:text-darkPurple font-black'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-brightBlue dark:text-darkPurple" />
          <span>Visual Analytics</span>
        </button>
      </div>

      {/* TAB 1: ALL COMPLAINTS QUEUE */}
      {activeTab === 'all' && (
        <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark overflow-hidden backdrop-blur-xl space-y-4">
          {/* Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#0F1530]/50 space-y-3">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="font-black text-[#172033] dark:text-[#F8FAFC] text-sm">Active Incident Triage</div>
              <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ID, title, keyword or area..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#151D38] border border-slate-200 dark:border-white/10 focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151D38] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151D38] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151D38] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs font-mono">Querying complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">No complaints match filter criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0F1530] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Tracking ID</th>
                    <th className="py-3 px-4">Title & Campus Area</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Dept</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {complaints.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primaryViolet dark:text-darkCyan whitespace-nowrap">
                        {item.public_id}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-[#172033] dark:text-[#F8FAFC] truncate">{item.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.location}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="font-medium">{item.category}</div>
                        {item.classification_confidence && (
                          <div className="text-[10px] text-primaryViolet dark:text-darkCyan font-mono font-bold">
                            AI: {(item.classification_confidence * 100).toFixed(0)}% conf
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={item.final_priority} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.assigned_department ? (
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{item.assigned_department}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/complaints/${item.public_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-100/70 dark:bg-cyan-500/10 hover:bg-violet-200 dark:hover:bg-cyan-500/20 text-primaryViolet dark:text-darkCyan font-bold text-xs border border-violet-200 dark:border-cyan-500/30 transition-all"
                        >
                          <span>Triage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRIORITY EMERGENCY QUEUE */}
      {activeTab === 'critical' && (
        <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-rose-200 dark:border-rose-500/30 shadow-card-light dark:shadow-neon-coral/20 p-6 space-y-4">
          <div className="flex items-center gap-2 text-rose-700 dark:text-darkCoral font-black text-base">
            <Flame className="w-5 h-5 text-rose-500 dark:text-darkCoral" />
            <span>High Hazard & Critical Safety Triage Queue</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            These complaints scored &ge; 80 points or triggered emergency acute hazard policies (exposed wiring, gas leaks, structural collapse).
          </p>

          <div className="space-y-3 pt-2">
            {criticalQueue.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-[#FFF0F5] dark:bg-[#151D38] border border-rose-200 dark:border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-rose-700 dark:text-darkCoral font-bold text-xs">{item.public_id}</span>
                    <PriorityBadge priority={item.final_priority} size="sm" />
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] text-sm">{item.title}</h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.location} • {item.category}</div>
                </div>

                <Link
                  to={`/admin/complaints/${item.public_id}`}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors whitespace-nowrap"
                >
                  Manage Emergency &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VISUAL ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Category Distribution */}
          <div className="bg-white dark:bg-[#171F3B] p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#172033] dark:text-[#F8FAFC] text-sm">Complaint Volume by Category</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aggregated from live SQLite database records</p>
              </div>
              <span className="text-[10px] font-mono text-primaryViolet dark:text-darkPurple bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 rounded-md border border-violet-200 dark:border-violet-700/60 font-bold">SQL</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 500 }} />
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
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Urgency Distribution */}
          <div className="bg-white dark:bg-[#171F3B] p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#172033] dark:text-[#F8FAFC] text-sm">Urgency & Priority Levels</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Computed by ComplainAI Priority Rubric</p>
              </div>
              <span className="text-[10px] font-mono text-amber-800 dark:text-darkAmber bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/60 font-bold">Risk Score</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} />
                  <YAxis allowDecimals={false} tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }} />
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
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry) => (
                      <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#7C3AED'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Status Breakdown */}
          <div className="bg-white dark:bg-[#171F3B] p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#172033] dark:text-[#F8FAFC] text-sm">Workflow Status Breakdown</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Proportion of complaints across state machine milestones</p>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 dark:text-darkMint bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-700/60 font-bold">Pipeline</span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Pie>
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
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Hotspots */}
          <div className="bg-white dark:bg-[#171F3B] p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#172033] dark:text-[#F8FAFC] text-sm">Campus Hotspot Locations</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Most frequently reported facility zones</p>
              </div>
              <span className="text-[10px] font-mono text-brightBlue dark:text-darkCyan bg-blue-100 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-cyan-700/60 font-bold">Zones</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 500 }} />
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
                  <Bar dataKey="value" fill="#06B6D4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
