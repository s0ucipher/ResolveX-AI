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
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { Complaint, DuplicateCandidate, CATEGORIES, DEPARTMENTS, STATUS_LIST } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

export const AdminComplaintDetailPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const data = await api.getComplaint(publicId);
      setComplaint(data);
      setNewStatus(data.status);
      setSelectedCategory(data.category);
      setSelectedPriority(data.final_priority);
      setAssignedDept(data.assigned_department || '');

      try {
        const dups = await api.getDuplicates(publicId);
        setDuplicates(dups);
      } catch (e) {
        console.warn('Could not load duplicates', e);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
  }, [publicId]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    if (newStatus === 'Rejected' && !rejectionReason.trim()) {
      setError('Please provide a rejection reason when rejecting a complaint.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.updateStatus(complaint.public_id, {
        status: newStatus,
        note: statusNote.trim() || undefined,
        rejection_reason: rejectionReason.trim() || undefined,
        resolution_notes: resolutionNotes.trim() || undefined
      });
      setComplaint(updated);
      setStatusNote('');
      setSuccessMsg(`Status successfully transitioned to '${newStatus}'.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Status transition rejected by server state machine.');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryOverride = async () => {
    if (!complaint || selectedCategory === complaint.category) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.overrideCategory(complaint.public_id, selectedCategory, categoryReason);
      setComplaint(updated);
      setCategoryReason('');
      setSuccessMsg(`Category updated to '${selectedCategory}'.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityOverride = async () => {
    if (!complaint || selectedPriority === complaint.final_priority) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.overridePriority(complaint.public_id, selectedPriority, priorityReason);
      setComplaint(updated);
      setPriorityReason('');
      setSuccessMsg(`Priority overridden to '${selectedPriority}'.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to update priority');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDepartment = async () => {
    if (!complaint || !assignedDept) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.assignDepartment(complaint.public_id, assignedDept, deptNote);
      setComplaint(updated);
      setDeptNote('');
      setSuccessMsg(`Assigned to department '${assignedDept}'.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to assign department');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-slate-500 dark:text-slate-400 text-xs font-mono">Loading complaint details...</div>;
  }

  if (!complaint) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="text-rose-600 dark:text-darkCoral font-extrabold text-lg">Complaint Not Found</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">The requested public ID does not exist in the database.</p>
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-bold text-primaryViolet dark:text-darkCyan">
          <ArrowLeft className="w-4 h-4" /> Return to Triage Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primaryViolet dark:hover:text-darkCyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-primaryViolet dark:text-darkCyan" />
          <span>Back to Triage Queue</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black text-primaryViolet dark:text-darkCyan bg-violet-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-violet-200 dark:border-white/10">
            {complaint.public_id}
          </span>
          <StatusBadge status={complaint.status} size="sm" />
          <PriorityBadge priority={complaint.final_priority} size="sm" />
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-mintGreen/20 border border-emerald-200 dark:border-mintGreen/40 text-emerald-800 dark:text-mintGreen text-xs flex items-center gap-2 animate-in fade-in font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-mintGreen shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Details (8 cols) vs Triage Action Controls (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Details & AI Evidence */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Info */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-5 backdrop-blur-xl">
            <h1 className="text-xl sm:text-2xl font-black text-[#172033] dark:text-[#F8FAFC] leading-snug">{complaint.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-white/10 font-medium">
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
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Description</h3>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans shadow-2xs">
                {complaint.description}
              </div>
            </div>
          </div>

          {/* AI Machine Learning Classification Evidence Card */}
          <div className="bg-[#F0E9FF] dark:bg-[#151D38] rounded-3xl border border-violet-200/80 dark:border-violet-500/30 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-violet-200/60 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm">
                <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>AI Categorization & Priority Audit</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-violet-200/70 dark:bg-white/10 text-primaryViolet dark:text-darkCyan font-bold border border-violet-300 dark:border-white/10">
                Logistic Regression
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white dark:bg-[#171F3B] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">Model Predicted Category</span>
                <div className="text-sm font-black text-[#172033] dark:text-[#F8FAFC]">{complaint.predicted_category}</div>
                <div className="text-slate-600 dark:text-slate-400 pt-1 font-medium">
                  Confidence Score:{' '}
                  <span className="font-black text-primaryViolet dark:text-darkCyan font-mono">
                    {complaint.classification_confidence ? `${(complaint.classification_confidence * 100).toFixed(1)}%` : 'Calibrated'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#171F3B] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">Priority Engine Output</span>
                <div className="mt-1 flex items-center gap-2">
                  <PriorityBadge priority={complaint.predicted_priority} size="sm" />
                  <span className="text-[#172033] dark:text-[#F8FAFC] font-mono font-black">({complaint.priority_score}/100)</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Current Assigned Priority: <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{complaint.final_priority}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171F3B] p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic shadow-2xs">
              <span className="font-bold text-[#172033] dark:text-[#F8FAFC] not-italic">Scoring Engine Reasoning: </span>
              {complaint.priority_explanation}
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
                  <div key={dup.complaint_id} className="p-4 rounded-2xl bg-white dark:bg-[#171F3B] border border-amber-200/80 dark:border-white/10 text-xs space-y-1.5 shadow-2xs">
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
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm">
              <History className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
              <span>Immutable Audit Trail & Status History</span>
            </div>

            <div className="space-y-3.5 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
              {complaint.history?.map((h) => (
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

        {/* Right Column (4 cols): Administrative Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Update Form */}
          <form onSubmit={handleStatusUpdate} className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm border-b border-slate-100 dark:border-white/10 pb-3">
              <CheckCircle2 className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
              <span>Transition Workflow Status</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Target Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-bold focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              >
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s} className="bg-white dark:bg-[#171F3B]">{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Audit Progress Note
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
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-darkCoral">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this complaint was rejected..."
                  className="w-full px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-800 dark:text-rose-200 font-medium"
                />
              </div>
            )}

            {newStatus === 'Resolved' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-darkMint">
                  Resolution Notes
                </label>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Details of fix applied, parts replaced, technician sign-off..."
                  className="w-full px-3 py-2 rounded-xl bg-emerald-50 dark:bg-mintGreen/20 border border-emerald-200 dark:border-mintGreen/40 text-xs text-emerald-800 dark:text-mintGreen font-medium"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primaryViolet to-brightBlue text-white font-bold text-xs shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 hover:opacity-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Committing...' : 'Commit Status Update'}</span>
            </button>
          </form>

          {/* Department Assignment */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm border-b border-slate-100 dark:border-white/10 pb-3">
              <Building className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
              <span>Assign Responsible Division</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Department
              </label>
              <select
                value={assignedDept}
                onChange={(e) => setAssignedDept(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-white dark:bg-[#171F3B]">{dept}</option>
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
                placeholder="e.g. Work order #204"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              />
            </div>

            <button
              type="button"
              onClick={handleAssignDepartment}
              disabled={saving || !assignedDept}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-white/10 disabled:opacity-50 transition-colors"
            >
              Assign & Update
            </button>
          </div>

          {/* Override Priority */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm border-b border-slate-100 dark:border-white/10 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-darkAmber" />
              <span>Human Priority Override</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Priority Level
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-bold focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              >
                <option value="Critical" className="bg-white dark:bg-[#171F3B]">Critical</option>
                <option value="High" className="bg-white dark:bg-[#171F3B]">High</option>
                <option value="Medium" className="bg-white dark:bg-[#171F3B]">Medium</option>
                <option value="Low" className="bg-white dark:bg-[#171F3B]">Low</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Justification Reason
              </label>
              <input
                type="text"
                value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
                placeholder="e.g. Exam ongoing in this room"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              />
            </div>

            <button
              type="button"
              onClick={handlePriorityOverride}
              disabled={saving || selectedPriority === complaint.final_priority}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs disabled:opacity-50 transition-colors shadow-xs"
            >
              Commit Priority Override
            </button>
          </div>

          {/* Correct AI Category */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-sm border-b border-slate-100 dark:border-white/10 pb-3">
              <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
              <span>Correct AI Category</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-[#171F3B]">{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Correction Reason
              </label>
              <input
                type="text"
                value={categoryReason}
                onChange={(e) => setCategoryReason(e.target.value)}
                placeholder="e.g. Water leak from AC, not pipes"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet"
              />
            </div>

            <button
              type="button"
              onClick={handleCategoryOverride}
              disabled={saving || selectedCategory === complaint.category}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs disabled:opacity-50 transition-colors shadow-glossy-light dark:shadow-neon-violet/30"
            >
              Correct Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
