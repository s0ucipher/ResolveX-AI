import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  User,
  History,
  Copy,
  Layers,
  Save,
  CheckCheck,
  XCircle,
  FileText,
  Cpu,
  Flame,
  Zap,
  RefreshCw,
  Send,
  HelpCircle,
  Check,
  Info,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { useDisplayMode } from '../context/DisplayModeContext';
import {
  Complaint,
  StatusHistory,
  DuplicateCandidate,
  CATEGORIES,
  DEPARTMENTS,
  STATUS_LIST
} from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

export const AdminComplaintDetailPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { isMobileMode } = useDisplayMode();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Administrative Action Inputs
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryReason, setCategoryReason] = useState<string>('');

  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [priorityReason, setPriorityReason] = useState<string>('');

  const [assignedDept, setAssignedDept] = useState<string>('');
  const [deptNote, setDeptNote] = useState<string>('');

  const loadComplaint = async () => {
    if (!publicId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, histList, dupList] = await Promise.all([
        api.getComplaint(publicId),
        api.getComplaintHistory(publicId).catch(() => []),
        api.getDuplicates(publicId).catch(() => [])
      ]);
      setComplaint(data);
      setNewStatus(data.status);
      setSelectedCategory(data.category);
      setSelectedPriority(data.final_priority);
      setAssignedDept(data.assigned_department || '');
      setDuplicates(dupList || []);
      const mergedHistory = histList && histList.length > 0 ? histList : (data.history || []);
      setHistory(mergedHistory);
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
  }, [publicId]);

  const refreshHistory = async () => {
    if (!publicId) return;
    setRefreshingHistory(true);
    try {
      const fresh = await api.getComplaintHistory(publicId);
      if (fresh && fresh.length > 0) {
        setHistory(fresh);
      }
    } catch (e) {
      console.warn('Could not refresh history:', e);
    } finally {
      setRefreshingHistory(false);
    }
  };

  const handleStatusUpdate = async (e?: React.FormEvent, customStatus?: string) => {
    if (e) e.preventDefault();
    if (!complaint) return;
    const targetStatus = customStatus || newStatus;
    if (targetStatus === 'Rejected' && !rejectionReason.trim()) {
      setError('Please provide a rejection reason when rejecting a complaint.');
      return;
    }

    setActionLoading('status');
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.updateStatus(complaint.public_id, {
        status: targetStatus,
        note: statusNote.trim() || undefined,
        rejection_reason: rejectionReason.trim() || undefined,
        resolution_notes: resolutionNotes.trim() || undefined
      });
      setComplaint(updated);
      setNewStatus(updated.status);
      setStatusNote('');
      setRejectionReason('');
      setResolutionNotes('');

      const freshHistory = await api.getComplaintHistory(complaint.public_id).catch(() => []);
      if (freshHistory.length > 0) {
        setHistory(freshHistory);
      } else if (updated.history && updated.history.length > 0) {
        setHistory(updated.history);
      }

      setSuccessMsg(`Status successfully transitioned to '${targetStatus}'.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Status transition rejected by server state machine.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCategoryOverride = async () => {
    if (!complaint) return;
    const isSameCategory = selectedCategory === complaint.category;
    if (isSameCategory && !categoryReason.trim()) {
      setError(`Current category is already '${complaint.category}'. To reclassify, select a different category from the dropdown, or enter an audit note to record category verification.`);
      return;
    }

    setActionLoading('category');
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.overrideCategory(complaint.public_id, selectedCategory, categoryReason.trim() || undefined);
      setComplaint(updated);
      setSelectedCategory(updated.category);
      setCategoryReason('');

      const freshHistory = await api.getComplaintHistory(complaint.public_id).catch(() => []);
      if (freshHistory.length > 0) {
        setHistory(freshHistory);
      } else if (updated.history && updated.history.length > 0) {
        setHistory(updated.history);
      }

      setSuccessMsg(
        isSameCategory
          ? `Category verification note successfully committed to the immutable audit trail.`
          : `Category successfully updated from '${complaint.category}' to '${selectedCategory}'.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePriorityOverride = async () => {
    if (!complaint) return;
    const isSamePriority = selectedPriority === complaint.final_priority;
    if (isSamePriority && !priorityReason.trim()) {
      setError(`Current priority is already '${complaint.final_priority}'. To override, select a different priority level or enter a justification note to record an administrative review note.`);
      return;
    }

    setActionLoading('priority');
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.overridePriority(complaint.public_id, selectedPriority, priorityReason.trim() || undefined);
      setComplaint(updated);
      setSelectedPriority(updated.final_priority);
      setPriorityReason('');

      const freshHistory = await api.getComplaintHistory(complaint.public_id).catch(() => []);
      if (freshHistory.length > 0) {
        setHistory(freshHistory);
      } else if (updated.history && updated.history.length > 0) {
        setHistory(updated.history);
      }

      setSuccessMsg(
        isSamePriority
          ? `Priority review note successfully committed to the immutable audit trail.`
          : `Priority successfully overridden from '${complaint.final_priority}' to '${selectedPriority}'.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update priority');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignDepartment = async () => {
    if (!complaint) return;
    if (!assignedDept) {
      setError('Please choose a department / division from the dropdown to assign.');
      return;
    }

    setActionLoading('assign');
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.assignDepartment(complaint.public_id, assignedDept, deptNote.trim() || undefined);
      setComplaint(updated);
      setAssignedDept(updated.assigned_department || assignedDept);
      setNewStatus(updated.status);
      setDeptNote('');

      const freshHistory = await api.getComplaintHistory(complaint.public_id).catch(() => []);
      if (freshHistory.length > 0) {
        setHistory(freshHistory);
      } else if (updated.history && updated.history.length > 0) {
        setHistory(updated.history);
      }

      setSuccessMsg(`Complaint assigned to department '${assignedDept}'.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to assign department');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-3">
        <div className="w-8 h-8 mx-auto border-3 border-primaryViolet border-t-transparent rounded-full animate-spin" />
        <div className="text-slate-500 dark:text-slate-400 text-xs font-mono font-medium">
          Querying authoritative complaint database record...
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4 px-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <XCircle className="w-6 h-6" />
        </div>
        <div className="text-rose-600 dark:text-darkCoral font-extrabold text-lg">Complaint Not Found</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested public ID does not exist in the database or you do not have permission to inspect it.
        </p>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primaryViolet dark:text-darkCyan hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Triage Queue
        </Link>
      </div>
    );
  }

  // Guaranteed non-empty history for timeline
  const displayHistory: StatusHistory[] = history.length > 0 ? history : [
    {
      id: 1,
      complaint_id: complaint.id,
      previous_status: null,
      new_status: 'Submitted',
      note: `Complaint lodged via student interface. AI classified as '${complaint.predicted_category}', priority calculated as '${complaint.final_priority}'.`,
      changed_by: complaint.user_email || 'Student Author',
      created_at: complaint.created_at
    }
  ];

  const isSaving = Boolean(actionLoading);
  const isPriorityUnchanged = selectedPriority === complaint.final_priority;
  const isCategoryUnchanged = selectedCategory === complaint.category;

  // Next recommended quick status transitions
  const getQuickTransitions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'Submitted':
        return ['Under Review', 'Assigned', 'Rejected'];
      case 'Under Review':
        return ['Assigned', 'In Progress', 'Resolved', 'Rejected'];
      case 'Assigned':
        return ['In Progress', 'Resolved', 'Rejected'];
      case 'In Progress':
        return ['Resolved', 'Under Review', 'Rejected'];
      case 'Resolved':
        return ['Reopened'];
      case 'Rejected':
        return ['Under Review'];
      default:
        return ['Under Review', 'Resolved'];
    }
  };

  const quickTransitions = getQuickTransitions(complaint.status);

  return (
    <div className={isMobileMode ? 'w-full px-3.5 py-4 space-y-5' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'}>
      {/* Top Breadcrumb & Status Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primaryViolet dark:hover:text-darkCyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-primaryViolet dark:text-darkCyan" />
          <span>Back to Triage Queue</span>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-black text-primaryViolet dark:text-darkCyan bg-violet-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-violet-200 dark:border-white/10 shadow-2xs">
            {complaint.public_id}
          </span>
          <StatusBadge status={complaint.status} size="sm" />
          <PriorityBadge priority={complaint.final_priority} size="sm" />
        </div>
      </div>

      {/* Dismissible Feedback Banners */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start justify-between gap-3 animate-in fade-in font-medium shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-mintGreen/20 border border-emerald-200 dark:border-mintGreen/40 text-emerald-800 dark:text-mintGreen text-xs flex items-start justify-between gap-3 animate-in fade-in font-bold shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-mintGreen shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-200 text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Details & AI Evidence (8 cols) vs Admin Action Cards (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Details & AI Evidence */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-7 space-y-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl sm:text-2xl font-black text-[#172033] dark:text-[#F8FAFC] leading-snug">
                {complaint.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-white/10 font-medium">
              <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-brightBlue dark:text-darkCyan" />
                {complaint.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                Lodged: {new Date(complaint.created_at).toLocaleString()}
              </span>
              {complaint.user_email && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5" />
                    {complaint.user_email}
                  </span>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Full Problem Description
              </h3>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200/80 dark:border-white/5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans shadow-2xs">
                {complaint.description}
              </div>
            </div>
          </div>

          {/* AI Machine Learning Classification Evidence Card */}
          <div className="bg-[#F0E9FF] dark:bg-[#151D38] rounded-3xl border border-violet-200/80 dark:border-violet-500/30 shadow-card-light dark:shadow-card-dark p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-violet-200/60 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm">
                <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>AI Categorization & Priority Audit</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-violet-200/70 dark:bg-white/10 text-primaryViolet dark:text-darkCyan font-bold border border-violet-300 dark:border-white/10">
                Logistic Regression + TF-IDF
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white dark:bg-[#171F3B] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  Model Predicted Category
                </span>
                <div className="text-sm font-black text-[#172033] dark:text-[#F8FAFC]">
                  {complaint.predicted_category}
                </div>
                <div className="text-slate-600 dark:text-slate-400 pt-1 font-medium flex items-center gap-1.5">
                  <span>Confidence Score:</span>
                  <span className="font-black text-primaryViolet dark:text-darkCyan font-mono">
                    {complaint.classification_confidence ? `${(complaint.classification_confidence * 100).toFixed(1)}%` : 'Calibrated'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Current Assigned: <span className="font-bold text-primaryViolet dark:text-darkCyan">{complaint.category}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#171F3B] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  Priority Engine Output
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <PriorityBadge priority={complaint.predicted_priority} size="sm" />
                  <span className="text-[#172033] dark:text-[#F8FAFC] font-mono font-black">
                    ({complaint.priority_score}/100)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Current Assigned Priority:{' '}
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{complaint.final_priority}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171F3B] p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed shadow-2xs">
              <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">Scoring Engine Reasoning: </span>
              <span className="italic">{complaint.priority_explanation}</span>
            </div>
          </div>

          {/* Potential Duplicate Suggestions */}
          {duplicates.length > 0 && (
            <div className="bg-[#FFF4E8] dark:bg-[#151D38] rounded-3xl border border-amber-200 dark:border-amber-500/30 shadow-card-light dark:shadow-card-dark p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-darkAmber font-black text-sm">
                <Layers className="w-4 h-4 text-amber-600 dark:text-darkAmber" />
                <span>TF-IDF Cosine Similarity Matches ({duplicates.length})</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Similar active tickets detected in the database. Review before dispatching duplicate crews:
              </p>

              <div className="space-y-3">
                {duplicates.map((dup) => (
                  <div
                    key={dup.complaint_id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#171F3B] border border-amber-200/80 dark:border-white/10 text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-primaryViolet dark:text-darkCyan">{dup.public_id}</span>
                      <span className="font-mono text-amber-800 dark:text-darkAmber font-black">
                        {(dup.similarity_score * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <div className="font-bold text-[#172033] dark:text-[#F8FAFC]">{dup.title}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">{dup.explanation}</div>
                    <div className="pt-1 flex items-center gap-3">
                      <StatusBadge status={dup.status} size="sm" />
                      <Link
                        to={`/admin/complaints/${dup.public_id}`}
                        className="text-[11px] text-primaryViolet dark:text-darkCyan hover:underline font-bold"
                      >
                        Inspect Candidate &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complete Status History Timeline */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm">
                <History className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
                <span>Immutable Audit Trail & Status History</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  {displayHistory.length} {displayHistory.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              <button
                type="button"
                onClick={refreshHistory}
                disabled={refreshingHistory}
                title="Refresh audit trail from database"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primaryViolet dark:text-darkCyan hover:opacity-80 transition-opacity"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh Log</span>
              </button>
            </div>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10 pt-1">
              {displayHistory.map((h, idx) => (
                <div key={h.id || idx} className="relative pl-8 text-xs space-y-1.5 animate-in fade-in">
                  <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#171F3B] border-2 border-primaryViolet dark:border-cyan-400 shadow-xs" />
                  <div className="flex items-center gap-2 flex-wrap font-medium">
                    <span className="font-black text-[#172033] dark:text-[#F8FAFC] bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-[11px]">
                      {h.new_status}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-primaryViolet dark:text-darkCyan font-bold text-[11px]">
                      Actor: {h.changed_by}
                    </span>
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

        {/* Right Column (4 cols): Administrative Actions */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick Stage Transitions & Status Form */}
          <form
            onSubmit={(e) => handleStatusUpdate(e)}
            className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm">
                <CheckCircle2 className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>Transition Status</span>
              </div>
              <StatusBadge status={complaint.status} size="sm" />
            </div>

            {/* Quick action buttons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Action Shortcuts
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickTransitions.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setNewStatus(st);
                      if (st !== 'Rejected') {
                        handleStatusUpdate(undefined, st);
                      }
                    }}
                    disabled={isSaving}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                      newStatus === st
                        ? 'bg-primaryViolet text-white border-primaryViolet shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0F1530] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    → {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom target status */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Target Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-bold focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              >
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s} className="bg-white dark:bg-[#171F3B]">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Audit Progress Note (Optional)
              </label>
              <textarea
                rows={2}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Electrician team on-site inspecting the breaker box..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              />
            </div>

            {newStatus === 'Rejected' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-darkCoral">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this complaint was rejected..."
                  className="w-full px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-800 dark:text-rose-200 font-medium focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {newStatus === 'Resolved' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-darkMint">
                  Resolution Notes
                </label>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Details of fix applied, parts replaced, technician sign-off..."
                  className="w-full px-3 py-2 rounded-xl bg-emerald-50 dark:bg-mintGreen/20 border border-emerald-200 dark:border-mintGreen/40 text-xs text-emerald-800 dark:text-mintGreen font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primaryViolet to-brightBlue text-white font-bold text-xs shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{actionLoading === 'status' ? 'Committing...' : 'Commit Status Update'}</span>
            </button>
          </form>

          {/* Department Assignment */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm">
                <Building className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
                <span>Assign Division</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                {complaint.assigned_department ? 'Assigned' : 'Unassigned'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Facility Department
              </label>
              <select
                value={assignedDept}
                onChange={(e) => setAssignedDept(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 font-bold focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              >
                <option value="">Select Division</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-white dark:bg-[#171F3B]">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Dispatch Note (Optional)
              </label>
              <input
                type="text"
                value={deptNote}
                onChange={(e) => setDeptNote(e.target.value)}
                placeholder="e.g. Work order #204, assigned to technician Ravi"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              />
            </div>

            <button
              type="button"
              onClick={handleAssignDepartment}
              disabled={isSaving || !assignedDept}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-white/10 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Building className="w-3.5 h-3.5" />
              <span>
                {actionLoading === 'assign'
                  ? 'Assigning Division...'
                  : assignedDept
                  ? `Assign & Update Division`
                  : 'Select Department to Assign'}
              </span>
            </button>
          </div>

          {/* Override Priority */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-darkAmber" />
                <span>Human Priority Override</span>
              </div>
              <PriorityBadge priority={complaint.final_priority} size="sm" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Priority Level
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Current: {complaint.final_priority}
                </span>
              </div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-bold focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-amber-500"
              >
                <option value="Critical" className="bg-white dark:bg-[#171F3B]">Critical</option>
                <option value="High" className="bg-white dark:bg-[#171F3B]">High</option>
                <option value="Medium" className="bg-white dark:bg-[#171F3B]">Medium</option>
                <option value="Low" className="bg-white dark:bg-[#171F3B]">Low</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Justification Reason {isPriorityUnchanged && <span className="text-amber-500">(Required to log review note)</span>}
              </label>
              <input
                type="text"
                value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
                placeholder={isPriorityUnchanged ? "e.g. Done work, verified priority level" : "e.g. Exam ongoing in this room"}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Helper status text */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {!isPriorityUnchanged ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  Overriding from '{complaint.final_priority}' → '{selectedPriority}'
                </span>
              ) : priorityReason.trim() ? (
                <span className="text-slate-600 dark:text-slate-300">
                  Will record priority confirmation remark into the audit trail.
                </span>
              ) : (
                <span>
                  Select another priority level or type a reason to commit an audit note.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handlePriorityOverride}
              disabled={isSaving || (isPriorityUnchanged && !priorityReason.trim())}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {actionLoading === 'priority'
                  ? 'Committing Priority...'
                  : !isPriorityUnchanged
                  ? `Commit Priority Override (${complaint.final_priority} → ${selectedPriority})`
                  : priorityReason.trim()
                  ? 'Log Priority Review Note'
                  : 'Commit Priority Override'}
              </span>
            </button>
          </div>

          {/* Correct AI Category */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm">
                <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>Correct AI Category</span>
              </div>
              <span className="font-bold text-[10px] bg-violet-100 dark:bg-white/10 text-primaryViolet dark:text-darkPurple px-2 py-0.5 rounded border border-violet-200 dark:border-white/10 truncate max-w-[130px]">
                {complaint.category}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Current: {complaint.category}
                </span>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-bold focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-[#171F3B]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Correction Reason {isCategoryUnchanged && <span className="text-primaryViolet dark:text-darkPurple">(Required to log verification)</span>}
              </label>
              <input
                type="text"
                value={categoryReason}
                onChange={(e) => setCategoryReason(e.target.value)}
                placeholder={isCategoryUnchanged ? "e.g. Verified correct category" : "e.g. Water leak from AC unit, not external pipe"}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              />
            </div>

            {/* Helper status text */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {!isCategoryUnchanged ? (
                <span className="text-primaryViolet dark:text-darkPurple font-bold">
                  Reclassifying from '{complaint.category}' → '{selectedCategory}'
                </span>
              ) : categoryReason.trim() ? (
                <span className="text-slate-600 dark:text-slate-300">
                  Will record category verification note into the audit trail.
                </span>
              ) : (
                <span>
                  Select another category or type a reason to commit an audit note.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCategoryOverride}
              disabled={isSaving || (isCategoryUnchanged && !categoryReason.trim())}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs disabled:opacity-50 transition-all shadow-glossy-light dark:shadow-neon-violet/30 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {actionLoading === 'category'
                  ? 'Committing Category...'
                  : !isCategoryUnchanged
                  ? `Commit Category Correction`
                  : categoryReason.trim()
                  ? 'Log Category Verification Note'
                  : 'Correct Category'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
