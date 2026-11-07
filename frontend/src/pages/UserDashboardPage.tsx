import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  PlusCircle,
  Inbox,
  RefreshCw,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDisplayMode } from '../context/DisplayModeContext';
import { useComplaints } from '../context/ComplaintsContext';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isMobileMode } = useDisplayMode();
  const { complaints, loading, error, stats, refreshComplaints } = useComplaints();

  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshComplaints();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = complaints.filter(c => {
    const matchesSearch = !searchTerm ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.public_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`${isMobileMode ? 'w-full px-3.5 py-4 space-y-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8'}`}>
      {/* Welcome Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-[#F0E9FF] dark:bg-[#0F1530] border border-violet-200/80 dark:border-white/10 shadow-card-light dark:shadow-card-dark ${
        isMobileMode ? 'p-4' : 'p-6 sm:p-8'
      }`}>
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-primaryViolet dark:text-darkPurple font-bold mb-1">
            <span className="w-2 h-2 rounded-full bg-primaryViolet dark:bg-darkPurple" />
            <span>STUDENT PERSONAL PORTAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC]">
            Welcome, {user?.name || 'Student'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Monitor all your lodged campus maintenance requests, track progress updates, and inspect AI triage results.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            title="Refresh latest database records"
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-[#171F3B] hover:bg-slate-50 dark:hover:bg-[#1E294B] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-primaryViolet dark:text-darkCyan ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Records'}</span>
          </button>

          <Link
            to="/submit"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primaryViolet to-brightBlue text-white font-bold text-xs sm:text-sm shadow-glossy-light dark:shadow-neon-violet/30 hover:scale-102 transition-transform"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lodge New Complaint</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Grid - Immediately calculated from verified records */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#F0E9FF] dark:bg-[#171F3B] border border-violet-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primaryViolet dark:text-darkPurple mb-1">Total Lodged</div>
          <div className="text-3xl font-black text-[#172033] dark:text-[#F8FAFC]">{stats.total}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">All time campus submissions</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#FFF4E8] dark:bg-[#171F3B] border border-amber-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-darkAmber mb-1">In Triage</div>
          <div className="text-3xl font-black text-amber-600 dark:text-darkAmber">{stats.openCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Submitted / Under Review</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#E7F4FF] dark:bg-[#171F3B] border border-blue-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
          <div className="text-[11px] font-bold uppercase tracking-wider text-brightBlue dark:text-darkCyan mb-1">In Progress</div>
          <div className="text-3xl font-black text-brightBlue dark:text-darkCyan">{stats.inProgressCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Crew actively working on-site</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#E8FFF5] dark:bg-[#171F3B] border border-emerald-200 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-darkMint mb-1">Resolved</div>
          <div className="text-3xl font-black text-emerald-600 dark:text-darkMint">{stats.resolvedCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Maintenance confirmed done</div>
        </div>
      </div>

      {/* Complaints Table Section */}
      <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark overflow-hidden backdrop-blur-xl">
        {/* Table Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0F1530]/50">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, tracking ID or category..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#151D38] border border-slate-200 dark:border-white/10 focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {loading && complaints.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-primaryViolet dark:text-cyan-400 text-[10px] font-bold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Syncing live updates...</span>
              </span>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#151D38] border border-slate-200 dark:border-white/10 focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-slate-700 dark:text-slate-300 w-full sm:w-auto font-medium"
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

        {/* Complaints Table / States */}
        {loading && complaints.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primaryViolet to-brightBlue text-white flex items-center justify-center mx-auto shadow-glossy-light animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm">Querying database records...</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
              Connecting to campus database and retrieving verified tickets for your account.
            </p>
          </div>
        ) : error && complaints.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="font-extrabold text-rose-800 dark:text-rose-200 text-sm">Unable to connect to database</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {error}
            </p>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primaryViolet text-white text-xs font-bold shadow-xs hover:bg-violet-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto border border-slate-200 dark:border-white/10">
              <Inbox className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm">No complaints found</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
              {searchTerm || statusFilter
                ? 'Try adjusting your search query or status filter.'
                : 'You have not lodged any campus tickets yet.'}
            </p>
            {!searchTerm && !statusFilter && (
              <Link
                to="/submit"
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primaryViolet text-white text-xs font-bold shadow-xs hover:bg-violet-700 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Your First Complaint</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0F1530] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Tracking ID</th>
                  <th className="py-3.5 px-4">Title & Location</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Urgency</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Lodged Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-primaryViolet dark:text-darkCyan whitespace-nowrap">
                      {item.public_id}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-[#172033] dark:text-[#F8FAFC] truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.location}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={item.final_priority} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/track?id=${item.public_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-100/70 dark:bg-cyan-500/10 hover:bg-violet-200 dark:hover:bg-cyan-500/20 text-primaryViolet dark:text-darkCyan border border-violet-200 dark:border-cyan-500/30 font-bold text-xs transition-colors"
                      >
                        <span>Inspect</span>
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
    </div>
  );
};
