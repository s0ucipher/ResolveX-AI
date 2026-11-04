import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  History,
  FileText,
  User,
  ShieldCheck,
  Share2,
  Copy,
  CheckCheck,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { useDisplayMode } from '../context/DisplayModeContext';
import { Complaint, StatusHistory } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

const LIFECYCLE_STEPS = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved'
];

export const TrackComplaintPage: React.FC = () => {
  const { isMobileMode } = useDisplayMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [trackingId, setTrackingId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialId.trim()) {
      fetchComplaint(initialId.trim());
    }
  }, [initialId]);

  const fetchComplaint = async (id: string) => {
    if (!id.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.getComplaint(id.trim());
      setComplaint(data);
      const hist = await api.getComplaintHistory(id.trim());
      setHistory(hist);
    } catch (err: any) {
      setError(err.message || 'Complaint not found with this tracking ID');
      setComplaint(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    setSearchParams({ id: trackingId.trim().toUpperCase() });
    fetchComplaint(trackingId.trim());
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepStatus = (stepName: string) => {
    if (!complaint) return 'upcoming';
    if (complaint.status === 'Rejected') return stepName === 'Submitted' ? 'completed' : 'rejected';

    const currentIdx = LIFECYCLE_STEPS.indexOf(complaint.status);
    const stepIdx = LIFECYCLE_STEPS.indexOf(stepName);

    if (currentIdx === -1) {
      return stepIdx <= 2 ? 'completed' : 'current';
    }

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className={`${isMobileMode ? 'w-full px-3.5 py-4 space-y-5' : 'max-w-5xl mx-auto px-4 py-12 space-y-10'}`}>
      {/* Search Bar Header */}
      <div className={`text-center max-w-xl mx-auto ${isMobileMode ? 'space-y-2' : 'space-y-3'}`}>
        <div className="inline-flex items-center gap-2 text-xs font-mono text-brightBlue dark:text-darkCyan font-bold mb-1 px-3.5 py-1 rounded-full bg-blue-100 dark:bg-cyan-950/60 border border-blue-200 dark:border-cyan-800/40">
          <Search className="w-3.5 h-3.5 text-brightBlue dark:text-darkCyan" />
          <span>INSTANT PUBLIC LOOKUP</span>
        </div>
        <h1 className={`font-black text-[#172033] dark:text-[#F8FAFC] ${isMobileMode ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
          Track Complaint Progress
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Enter your unique public tracking ID (e.g. <span className="font-mono text-primaryViolet dark:text-darkPurple font-bold">RX-2026-ELE001</span>) to view real-time maintenance updates.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
              placeholder="e.g. RX-2026-XXXXXX"
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-[#151D38] border border-slate-200/90 dark:border-white/10 focus:outline-none focus:border-brightBlue dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-cyan-500/20 text-sm text-[#172033] dark:text-[#F8FAFC] font-mono uppercase placeholder:normal-case placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-card-light dark:shadow-card-dark font-bold"
            />
            <Search className="w-4 h-4 text-brightBlue dark:text-darkCyan absolute left-3.5 top-3.5" />
          </div>
          <button
            type="submit"
            disabled={loading || !trackingId.trim()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primaryViolet to-brightBlue text-white font-bold text-xs sm:text-sm shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all hover:scale-102"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {/* Demo Try Chips */}
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 flex-wrap pt-2">
          <span>Try demo IDs:</span>
          {['RX-2026-ELE001', 'RX-2026-WAT002', 'RX-2026-CLS005'].map((demoId) => (
            <button
              key={demoId}
              onClick={() => {
                setTrackingId(demoId);
                setSearchParams({ id: demoId });
                fetchComplaint(demoId);
              }}
              className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-[#151D38] hover:bg-slate-50 dark:hover:bg-[#171F3B] text-primaryViolet dark:text-darkCyan font-bold border border-slate-200/90 dark:border-white/10 shadow-2xs transition-colors"
            >
              {demoId}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs max-w-xl mx-auto flex items-center gap-3 font-semibold shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Complaint Detailed View */}
      {complaint && (
        <div className="bg-white/95 dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark overflow-hidden backdrop-blur-2xl animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="p-6 sm:p-8 bg-[#EEF5FF] dark:bg-[#0F1530] border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-primaryViolet dark:text-darkCyan font-black text-xl tracking-wider">{complaint.public_id}</span>
                <StatusBadge status={complaint.status} size="sm" />
                <PriorityBadge priority={complaint.final_priority} size="sm" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#172033] dark:text-[#F8FAFC] leading-tight">{complaint.title}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-1 font-medium">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-brightBlue dark:text-darkCyan" />
                  {complaint.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  Lodged: {new Date(complaint.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#151D38] hover:bg-slate-100 dark:hover:bg-[#171F3B] text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/90 dark:border-white/10 shadow-xs transition-colors shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-brightBlue dark:text-darkCyan" />
              <span>{copied ? 'Link Copied!' : 'Share Public Link'}</span>
            </button>
          </div>

          {/* 5-Stage Lifecycle Stepper */}
          <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-[#171F3B] space-y-4">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Resolution Progress Pipeline</h3>

            {complaint.status === 'Rejected' ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs space-y-1 font-medium">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Complaint Rejected</span>
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400">Reason: {complaint.rejection_reason || 'Out of campus jurisdiction.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {LIFECYCLE_STEPS.map((step, idx) => {
                  const state = getStepStatus(step);
                  return (
                    <div
                      key={step}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        state === 'completed'
                          ? 'bg-emerald-50 dark:bg-mintGreen/15 border-emerald-200 dark:border-mintGreen/40 text-emerald-800 dark:text-mintGreen font-bold'
                          : state === 'current'
                          ? 'bg-gradient-to-r from-primaryViolet to-brightBlue border-transparent text-white font-black shadow-glossy-light dark:shadow-neon-violet/30'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 font-medium'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-80">
                        Stage {idx + 1}
                      </div>
                      <div className="text-xs">{step}</div>
                      <div className="mt-2 flex justify-center">
                        {state === 'completed' && <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-mintGreen" />}
                        {state === 'current' && <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">Reported Problem Description</h4>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans shadow-2xs">
                {complaint.description}
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="p-6 rounded-2xl bg-[#F0E9FF] dark:bg-[#151D38] border border-violet-200/80 dark:border-violet-500/30 space-y-4">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-extrabold text-sm">
                <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>AI Recommendation Breakdown</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white dark:bg-[#171F3B] border border-slate-200 dark:border-white/10 shadow-2xs space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Classified Category</span>
                  <span className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm block">{complaint.category}</span>
                  {complaint.classification_confidence && (
                    <span className="text-[11px] text-primaryViolet dark:text-darkCyan font-mono font-bold block">
                      Confidence: {(complaint.classification_confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#171F3B] border border-slate-200 dark:border-white/10 shadow-2xs space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Evaluated Urgency</span>
                  <div className="mt-1 flex items-center gap-2">
                    <PriorityBadge priority={complaint.final_priority} size="sm" />
                    <span className="font-mono text-[#172033] dark:text-[#F8FAFC] font-bold">({complaint.priority_score}/100)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#171F3B] border border-slate-200 dark:border-white/10 shadow-2xs space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Assigned Division</span>
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC] text-xs block mt-1">
                    {complaint.assigned_department || 'Triage in progress'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#171F3B] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic shadow-2xs">
                <span className="font-bold text-[#172033] dark:text-[#F8FAFC] not-italic">Priority Reason: </span>
                {complaint.priority_explanation}
              </div>
            </div>

            {/* Resolution Note if resolved */}
            {complaint.resolution_notes && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-mintGreen/15 border border-emerald-200 dark:border-mintGreen/40 text-emerald-800 dark:text-mintGreen space-y-1.5 shadow-2xs">
                <div className="font-bold text-sm flex items-center gap-2 text-emerald-900 dark:text-mintGreen">
                  <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-mintGreen" />
                  <span>Administrative Resolution Summary</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{complaint.resolution_notes}</p>
                {complaint.resolved_at && (
                  <div className="text-[10px] text-emerald-700 dark:text-darkMint pt-1 font-mono font-bold">
                    Signed off: {new Date(complaint.resolved_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Audit History Timeline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-extrabold text-sm">
                <History className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
                <span>Audited Lifecycle Timeline ({history.length} events recorded)</span>
              </div>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                {history.map((h) => (
                  <div key={h.id} className="relative pl-8 text-xs space-y-1">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#171F3B] border-2 border-primaryViolet dark:border-cyan-400 shadow-xs" />
                    <div className="flex items-center gap-2 flex-wrap font-medium">
                      <span className="font-black text-[#172033] dark:text-[#F8FAFC]">{h.new_status}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{new Date(h.created_at).toLocaleString()}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-primaryViolet dark:text-darkCyan font-bold text-[11px]">Actor: {h.changed_by}</span>
                    </div>
                    {h.note && (
                      <div className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0F1530] p-3 rounded-xl border border-slate-200 dark:border-white/5 text-[11px] leading-relaxed shadow-2xs">
                        {h.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
