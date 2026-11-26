import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatDateTime } from '../utils/dateTime';
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
  ChevronRight,
  Edit3,
  Wrench,
  Timer,
  RotateCcw,
  Tag,
  Camera,
  ImageIcon,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { useDisplayMode } from '../context/DisplayModeContext';
import {
  Complaint,
  StatusHistory,
  DuplicateCandidate,
  CATEGORIES,
  DEPARTMENTS,
  STATUS_LIST,
  WorkVerificationResult
} from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

const LIFECYCLE_STAGES = [
  { step: 1, name: 'Submitted', desc: 'Lodged by Student' },
  { step: 2, name: 'Under Review', desc: 'Triage & Verification' },
  { step: 3, name: 'Assigned', desc: 'Division & Crew Dispatched' },
  { step: 4, name: 'In Progress', desc: 'Active On-Site Repair' },
  { step: 5, name: 'Resolved', desc: 'Maintenance Certified' }
];

// Helper to extract the latest administrative reviews and notes from history
function extractLatestNotesFromHistory(history: StatusHistory[]) {
  let dispatchNote = '';
  let priorityJustification = '';
  let categoryReason = '';
  let progressNote = '';
  let resolutionNote = '';

  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const h of sorted) {
    const text = h.note || '';

    if (!priorityJustification) {
      const match = text.match(/Justification:\s*(.+)$/i);
      if (match) priorityJustification = match[1].trim();
      else if (text.toLowerCase().includes('priority confirmed') || text.toLowerCase().includes('priority review')) {
        priorityJustification = text;
      }
    }

    if (!categoryReason) {
      const match = text.match(/Reason:\s*(.+)$/i);
      if (match && !text.includes('Rejection Reason:')) categoryReason = match[1].trim();
    }

    if (!dispatchNote) {
      const match = text.match(/Assigned to department .+?\.\s*(?:Note:\s*(.+))?$/i);
      if (match && match[1]) dispatchNote = match[1].trim();
      else if (text.startsWith('Work order') || text.startsWith('Dispatch:')) dispatchNote = text;
    }

    if (!progressNote && h.new_status === 'In Progress') {
      progressNote = text;
    }

    if (!resolutionNote && h.new_status === 'Resolved') {
      resolutionNote = text;
    }
  }

  return { dispatchNote, priorityJustification, categoryReason, progressNote, resolutionNote };
}

export const AdminComplaintDetailPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const isMobileMode = false;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [duplicatesError, setDuplicatesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active / Editable administrative notes
  const [assignedDept, setAssignedDept] = useState<string>('');
  const [deptNote, setDeptNote] = useState<string>('');

  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [priorityReason, setPriorityReason] = useState<string>('');

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryReason, setCategoryReason] = useState<string>('');

  // Step-by-step lifecycle transition inputs
  const [triageInspectionNote, setTriageInspectionNote] = useState<string>('');
  const [progressCrew, setProgressCrew] = useState<string>('');
  const [progressDuration, setProgressDuration] = useState<string>('2 hours');
  const [progressNote, setProgressNote] = useState<string>('');
  const [resolutionSummary, setResolutionSummary] = useState<string>('');
  const [resolutionParts, setResolutionParts] = useState<string>('');
  const [resolutionSignOff, setResolutionSignOff] = useState<string>('');
  const [reopenReason, setReopenReason] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [restoreNote, setRestoreNote] = useState<string>('');

  // Gemini Work Verification & Resolution Photo State
  const [resolutionPhotoBase64, setResolutionPhotoBase64] = useState<string | null>(null);
  const [resolutionPhotoMime, setResolutionPhotoMime] = useState<string>('image/jpeg');
  const [verifyingWork, setVerifyingWork] = useState(false);
  const [workVerificationResult, setWorkVerificationResult] = useState<WorkVerificationResult | null>(null);
  const [workVerificationError, setWorkVerificationError] = useState<string | null>(null);

  const handleResolutionPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setWorkVerificationError('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }
    setWorkVerificationError(null);
    setResolutionPhotoMime(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setResolutionPhotoBase64(b64);
      setWorkVerificationResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunGeminiVerification = async (imgB64?: string, mime?: string) => {
    const targetImg = imgB64 || resolutionPhotoBase64;
    if (!targetImg || !complaint) return;
    setVerifyingWork(true);
    setWorkVerificationError(null);
    try {
      const res = await api.verifyWorkResolution(
        complaint.title,
        complaint.description,
        targetImg,
        mime || resolutionPhotoMime,
        resolutionSummary || undefined
      );
      setWorkVerificationResult(res);
    } catch (err: any) {
      console.warn('Gemini work verification error:', err);
      setWorkVerificationError(err.message || 'Gemini QA inspection could not be completed.');
    } finally {
      setVerifyingWork(false);
    }
  };

  // In-place editing toggles
  const [editingResolution, setEditingResolution] = useState(false);

  const loadComplaint = async () => {
    if (!publicId) return;
    setLoading(true);
    setError(null);
    try {
      setDuplicatesError(null);
      const [data, histList, dupRes] = await Promise.all([
        api.getComplaint(publicId),
        api.getComplaintHistory(publicId).catch(() => []),
        api.getDuplicates(publicId).then(
          (list) => ({ ok: true as const, list }),
          (err: any) => ({ ok: false as const, error: err?.message || 'Could not check for duplicate complaints.' })
        )
      ]);
      setComplaint(data);
      setAssignedDept(data.assigned_department || '');
      setSelectedCategory(data.category);
      setSelectedPriority(data.final_priority);
      if (dupRes.ok) {
        setDuplicates(dupRes.list || []);
      } else {
        setDuplicates([]);
        setDuplicatesError(dupRes.error);
      }

      const mergedHistory = histList && histList.length > 0 ? histList : (data.history || []);
      setHistory(mergedHistory);

      // Extract latest notes to pre-fill inputs so user work is NEVER lost
      const extracted = extractLatestNotesFromHistory(mergedHistory);
      if (extracted.dispatchNote) setDeptNote(extracted.dispatchNote);
      if (extracted.priorityJustification) setPriorityReason(extracted.priorityJustification);
      if (extracted.categoryReason) setCategoryReason(extracted.categoryReason);
      if (data.resolution_notes) {
        setResolutionSummary(data.resolution_notes);
      } else if (extracted.resolutionNote) {
        setResolutionSummary(extracted.resolutionNote);
      }
      if (extracted.progressNote) setProgressNote(extracted.progressNote);
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

  // Helper to re-query fresh history after any update
  const syncAfterUpdate = async (updated: Complaint, msg: string) => {
    setComplaint(updated);
    const freshHistory = await api.getComplaintHistory(updated.public_id).catch(() => []);
    if (freshHistory.length > 0) {
      setHistory(freshHistory);
    } else if (updated.history && updated.history.length > 0) {
      setHistory(updated.history);
    }
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  // -------------------------------------------------------------
  // STEP 1: Submitted -> Under Review
  // -------------------------------------------------------------
  const handleAdvanceToUnderReview = async () => {
    if (!complaint) return;
    setActionLoading('step-under-review');
    setError(null);
    try {
      const note = triageInspectionNote.trim()
        ? `Triage Review: ${triageInspectionNote.trim()}`
        : 'Complaint accepted for facility triage & review by Administrator.';
      const updated = await api.updateStatus(complaint.public_id, {
        status: 'Under Review',
        note
      });
      await syncAfterUpdate(updated, "Advanced to Stage 2: 'Under Review' (Triage active).");
      setTriageInspectionNote('');
    } catch (err: any) {
      setError(err.message || 'Failed to transition to Under Review');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // STEP 2: Under Review -> Assigned (Division & Crew Dispatch)
  // -------------------------------------------------------------
  const handleAssignDepartment = async () => {
    if (!complaint) return;
    if (!assignedDept) {
      setError('Please select a facility division / department to assign.');
      return;
    }
    if (!deptNote.trim()) {
      setError('Dispatch Note / Assigned Technician is mandatory. Please enter technician, work order, or dispatch details.');
      return;
    }

    setActionLoading('assign');
    setError(null);
    try {
      const updated = await api.assignDepartment(
        complaint.public_id,
        assignedDept,
        deptNote.trim()
      );
      await syncAfterUpdate(
        updated,
        `Division assigned: '${assignedDept}' with mandatory dispatch note saved.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to assign department');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // STEP 3: Assigned -> In Progress (Commence On-Site Work)
  // -------------------------------------------------------------
  const handleAdvanceToInProgress = async () => {
    if (!complaint) return;
    if (!progressCrew.trim()) {
      setError('Lead Technician / Crew on Site is mandatory before commencing on-site work.');
      return;
    }

    setActionLoading('step-in-progress');
    setError(null);
    try {
      const parts: string[] = [`Crew on site: ${progressCrew.trim()}`];
      if (progressDuration.trim()) parts.push(`Estimated duration: ${progressDuration.trim()}`);
      if (progressNote.trim()) parts.push(progressNote.trim());
      const fullNote = parts.join(' | ');

      const updated = await api.updateStatus(complaint.public_id, {
        status: 'In Progress',
        note: fullNote
      });
      await syncAfterUpdate(updated, "Advanced to Stage 4: 'In Progress' (Crew actively working on site).");
    } catch (err: any) {
      setError(err.message || 'Failed to transition to In Progress');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // STEP 4: In Progress -> Resolved (Complete Maintenance)
  // -------------------------------------------------------------
  const handleAdvanceToResolved = async () => {
    if (!complaint) return;
    if (!resolutionSummary.trim()) {
      setError('Please provide a resolution summary describing the fix applied and parts verified.');
      return;
    }

    setActionLoading('step-resolved');
    setError(null);
    try {
      const noteDetails: string[] = [resolutionSummary.trim()];
      if (resolutionParts.trim()) noteDetails.push(`Parts: ${resolutionParts.trim()}`);
      if (resolutionSignOff.trim()) noteDetails.push(`Sign-off: ${resolutionSignOff.trim()}`);
      const fullResolutionText = noteDetails.join(' | ');

      let updated: Complaint;
      if (resolutionPhotoBase64) {
        updated = await api.submitResolutionWithVerification(complaint.public_id, {
          status: 'Resolved',
          resolution_notes: fullResolutionText,
          resolution_photo_base64: resolutionPhotoBase64,
          mime_type: resolutionPhotoMime,
          run_gemini_verification: !workVerificationResult
        });
      } else {
        updated = await api.updateStatus(complaint.public_id, {
          status: 'Resolved',
          resolution_notes: fullResolutionText,
          note: `Maintenance completed & resolved: ${fullResolutionText}`
        });
      }
      await syncAfterUpdate(updated, "Stage 5 Finalized: Complaint successfully marked as 'Resolved'.");
      setEditingResolution(false);
    } catch (err: any) {
      setError(err.message || 'Failed to mark as Resolved');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // Update Resolution Note In-Place (when already Resolved)
  // -------------------------------------------------------------
  const handleUpdateResolutionNote = async () => {
    if (!complaint) return;
    if (!resolutionSummary.trim()) {
      setError('Resolution notes cannot be empty.');
      return;
    }
    setActionLoading('edit-resolution');
    setError(null);
    try {
      const updated = await api.updateStatus(complaint.public_id, {
        status: 'Resolved',
        resolution_notes: resolutionSummary.trim(),
        note: `Resolution summary updated: ${resolutionSummary.trim()}`
      });
      await syncAfterUpdate(updated, 'Resolution summary successfully updated.');
      setEditingResolution(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update resolution summary');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // Reopen Ticket
  // -------------------------------------------------------------
  const handleReopenComplaint = async () => {
    if (!complaint) return;
    if (!reopenReason.trim()) {
      setError('Please specify why this complaint is being reopened.');
      return;
    }
    setActionLoading('reopen');
    setError(null);
    try {
      const updated = await api.updateStatus(complaint.public_id, {
        status: 'Reopened',
        note: `Ticket reopened by Administrator. Reason: ${reopenReason.trim()}`
      });
      await syncAfterUpdate(updated, "Complaint reopened for inspection.");
      setReopenReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to reopen complaint');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // Reject Complaint
  // -------------------------------------------------------------
  const handleRejectComplaint = async () => {
    if (!complaint) return;
    if (!rejectionReason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }
    setActionLoading('reject');
    setError(null);
    try {
      const updated = await api.updateStatus(complaint.public_id, {
        status: 'Rejected',
        rejection_reason: rejectionReason.trim(),
        note: `Complaint rejected: ${rejectionReason.trim()}`
      });
      await syncAfterUpdate(updated, "Complaint marked as 'Rejected'.");
    } catch (err: any) {
      setError(err.message || 'Failed to reject complaint');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // Restore Complaint from Rejected to Under Review (Stage 2)
  // -------------------------------------------------------------
  const handleRestoreComplaint = async () => {
    if (!complaint) return;
    setActionLoading('restore');
    setError(null);
    try {
      const note = restoreNote.trim()
        ? `Ticket restored from Rejected by Administrator. Reason: ${restoreNote.trim()}`
        : 'Ticket restored to Stage 2 (Under Review) by Administrator for reconsidered triage.';
      const updated = await api.updateStatus(complaint.public_id, {
        status: 'Under Review',
        note
      });
      await syncAfterUpdate(updated, "Complaint restored to Stage 2: 'Under Review'.");
      setRestoreNote('');
    } catch (err: any) {
      setError(err.message || 'Failed to restore complaint');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // Human Priority Override / Update Note
  // -------------------------------------------------------------
  const handlePriorityOverride = async () => {
    if (!complaint) return;
    if (!priorityReason.trim()) {
      setError('Justification / review reason is mandatory. Please enter an explanation before committing priority.');
      return;
    }

    setActionLoading('priority');
    setError(null);
    try {
      const isSame = selectedPriority === complaint.final_priority;
      const updated = await api.overridePriority(
        complaint.public_id,
        selectedPriority,
        priorityReason.trim()
      );
      await syncAfterUpdate(
        updated,
        isSame
          ? 'Priority review justification note successfully committed to the audit trail.'
          : `Priority overridden from '${complaint.final_priority}' to '${selectedPriority}' with justification saved.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update priority');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // Correct AI Category / Update Note
  // -------------------------------------------------------------
  const handleCategoryOverride = async () => {
    if (!complaint) return;
    if (!categoryReason.trim()) {
      setError('Correction / verification reason is mandatory. Please explain the category assignment.');
      return;
    }

    setActionLoading('category');
    setError(null);
    try {
      const isSame = selectedCategory === complaint.category;
      const updated = await api.overrideCategory(
        complaint.public_id,
        selectedCategory,
        categoryReason.trim()
      );
      await syncAfterUpdate(
        updated,
        isSame
          ? 'Category verification note successfully committed to the audit trail.'
          : `Category reclassified from '${complaint.category}' to '${selectedCategory}' with reason saved.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
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
        <div className="text-rose-600 dark:text-darkCoral font-medium text-lg">Complaint Not Found</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested public ID does not exist in the database or you do not have permission to inspect it.
        </p>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primaryViolet dark:text-darkCyan hover:underline"
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
      new_status: complaint.status || 'Submitted',
      note: `Complaint lodged via student interface. AI classified as '${complaint.predicted_category}', priority calculated as '${complaint.final_priority}'.`,
      changed_by: complaint.user_email || 'Student Author',
      created_at: complaint.created_at
    }
  ];

  const isSaving = Boolean(actionLoading);
  const isPriorityUnchanged = selectedPriority === complaint.final_priority;
  const isCategoryUnchanged = selectedCategory === complaint.category;

  // Determine current lifecycle step index (1-based)
  const currentStepIndex = (() => {
    switch (complaint.status) {
      case 'Submitted':
        return 1;
      case 'Under Review':
        return 2;
      case 'Assigned':
        return 3;
      case 'In Progress':
        return 4;
      case 'Resolved':
        return 5;
      case 'Reopened':
        return 4;
      case 'Rejected':
        return 0;
      default:
        return 1;
    }
  })();

  return (
    <div className={isMobileMode ? 'w-full px-3.5 py-4 space-y-5' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'}>
      {/* Top Breadcrumb & Status Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-primaryViolet dark:hover:text-darkCyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-primaryViolet dark:text-darkCyan" />
          <span>Back to Triage Queue</span>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-medium text-primaryViolet dark:text-darkCyan bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 shadow-2xs">
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
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 text-xs font-medium shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-mintGreen/20 border border-emerald-200 dark:border-mintGreen/40 text-emerald-800 dark:text-mintGreen text-xs flex items-start justify-between gap-3 animate-in fade-in font-medium shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-mintGreen shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-200 text-xs font-medium shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* STEP-BY-STEP PROGRESSION STEPPER BANNER */}
      <div className="bg-white dark:bg-[#1A2029] rounded-2xl border border-slate-200/90 dark:border-white/10   p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 dark:bg-darkCyan " />
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Audited 5-Stage Maintenance Lifecycle
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Strict Step-by-Step Resolution Process Enforced
          </span>
        </div>

        {/* ALWAYS RENDER THE 5 STAGES */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 pt-1">
          {LIFECYCLE_STAGES.map((st) => {
            const isRejected = complaint.status === 'Rejected';
            const isPast = !isRejected && currentStepIndex > st.step;
            const isCurrent = !isRejected && currentStepIndex === st.step;
            const isStageRejected = isRejected && st.step === 2;
            const isStageCompletedUnderRejected = isRejected && st.step === 1;

            return (
              <div
                key={st.step}
                className={`p-3 rounded-2xl border text-center transition-colors ${
                  isStageCompletedUnderRejected || isPast
                    ? 'bg-emerald-50 dark:bg-mintGreen/15 border-emerald-200 dark:border-mintGreen/40 text-emerald-800 dark:text-mintGreen'
                    : isStageRejected
                    ? 'bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 font-medium'
                    : isCurrent
                    ? 'bg-primaryViolet border-transparent text-white font-medium  '
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 font-medium'
                }`}
              >
                <div className="text-[10px] uppercase font-medium tracking-wider mb-0.5 opacity-80">
                  Stage {st.step}
                </div>
                <div className="text-xs font-medium truncate">
                  {isStageRejected ? 'Rejected at Triage' : st.name}
                </div>
                <div className="mt-1 flex justify-center">
                  {(isStageCompletedUnderRejected || isPast) && (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-mintGreen" />
                  )}
                  {isStageRejected && (
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-white " />}
                </div>
              </div>
            );
          })}
        </div>

        {complaint.status === 'Rejected' && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3 font-medium animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                Complaint currently <strong>Rejected at Stage 2 Triage</strong>. Reason: {complaint.rejection_reason || 'Issue is Invalid / Out of campus maintenance scope.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Details (8 cols) vs Admin Action Controls (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Details & AI Evidence & First Section Active Summary */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Info Card with Prominent First Section Active Summary */}
          <div className="bg-white dark:bg-[#1A2029] rounded-2xl border border-slate-200/90 dark:border-white/10   p-6 sm:p-7 space-y-5 ">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl sm:text-2xl font-medium text-[#172337] dark:text-[#F8FAFC] leading-snug">
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
                Lodged: {formatDateTime(complaint.created_at)}
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
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Full Problem Description
              </h3>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200/80 dark:border-white/5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans shadow-2xs">
                {complaint.description}
              </div>
            </div>

            {/* Visual Evidence (Student Issue Photo) */}
            {complaint.photo_url && (
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Camera className="w-4 h-4 text-primaryViolet dark:text-cyan-400" />
                    <span>Reporter Attached Issue Photo</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Visual Evidence</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-64 flex items-center justify-center bg-black/5 dark:bg-black/40">
                  <img src={complaint.photo_url} alt="Reported defect" className="object-contain max-h-64 w-full" />
                </div>
                {complaint.photo_analysis && (() => {
                  try {
                    const parsed = JSON.parse(complaint.photo_analysis);
                    return (
                      <div className="p-3 rounded-xl bg-violet-50/80 dark:bg-[#1E2538] border border-violet-200 dark:border-white/10 text-xs space-y-1">
                        <div className="font-semibold text-primaryViolet dark:text-cyan-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Gemini Vision Report:</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                          {parsed.simple_report || parsed.suggested_title}
                        </p>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
              </div>
            )}

            {/* Verified Work Resolution Photo (if already resolved) */}
            {complaint.resolution_photo_url && (
              <div className="space-y-2 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-mintGreen">
                    <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-mintGreen" />
                    <span>Technician Work Completion Photo</span>
                  </div>
                  {complaint.resolution_quality_status && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      complaint.resolution_quality_status === 'PROPERLY_DONE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}>
                      {complaint.resolution_quality_status === 'PROPERLY_DONE' ? '✓ Properly Done' : '✕ Badly Done'}
                    </span>
                  )}
                </div>
                <div className="rounded-xl overflow-hidden border border-emerald-200 dark:border-white/10 max-h-64 flex items-center justify-center bg-black/5 dark:bg-black/40">
                  <img src={complaint.resolution_photo_url} alt="Work resolution" className="object-contain max-h-64 w-full" />
                </div>
                {complaint.resolution_quality_report && (
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1A2029] border border-emerald-200/80 dark:border-white/10 text-xs space-y-1">
                    <div className="font-semibold text-emerald-800 dark:text-mintGreen flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gemini QA Audit Report:</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                      {complaint.resolution_quality_report}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FIRST SECTION ACTIVE ADMINISTRATIVE TRIAGE & EXECUTION RECORD */}
            <div className="p-5 rounded-2xl bg-[#F2F4F7] dark:bg-[#1A2029] border border-blue-200/80 dark:border-white/10 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-white/10 pb-2.5">
                <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
                  <span>Active Administrative Triage & Execution Record</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-white/10 text-brightBlue dark:text-darkCyan font-medium">
                  Authoritative Record
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Division & Dispatch */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Assigned Division & Dispatch
                    </span>
                    <Building className="w-3 h-3 text-brightBlue dark:text-darkCyan" />
                  </div>
                  <div className="font-medium text-[#172337] dark:text-[#F8FAFC]">
                    {complaint.assigned_department || 'Triage in progress / Unassigned'}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                    {deptNote ? `Note: "${deptNote}"` : 'No dispatch note recorded yet.'}
                  </div>
                </div>

                {/* 2. Priority & Justification */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Assigned Priority Level
                    </span>
                    <PriorityBadge priority={complaint.final_priority} size="sm" />
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 italic pt-1">
                    {priorityReason ? `Justification: "${priorityReason}"` : 'AI model rubric default.'}
                  </div>
                </div>

                {/* 3. Category & Correction Reason */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Active Category
                    </span>
                    <Tag className="w-3 h-3 text-primaryViolet dark:text-darkCyan" />
                  </div>
                  <div className="font-medium text-[#172337] dark:text-[#F8FAFC]">
                    {complaint.category}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                    {categoryReason ? `Reason: "${categoryReason}"` : 'Initial NLP classification accepted.'}
                  </div>
                </div>

                {/* 4. Current Resolution Summary */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Resolution Status
                    </span>
                    <StatusBadge status={complaint.status} size="sm" />
                  </div>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    {complaint.resolution_notes ? (
                      <span className="text-emerald-700 dark:text-mintGreen font-semibold">
                        Summary: {complaint.resolution_notes}
                      </span>
                    ) : complaint.status === 'Resolved' ? (
                      'Resolved and certified.'
                    ) : (
                      `Stage ${currentStepIndex} of 5: Active maintenance triage.`
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Machine Learning Classification Evidence Card */}
          <div className="bg-[#F2F4F7] dark:bg-[#222A35] rounded-2xl border border-slate-200 dark:border-slate-700   p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>AI Categorization & Priority Audit</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-violet-200/70 dark:bg-white/10 text-primaryViolet dark:text-darkCyan font-medium border border-slate-200 dark:border-white/10">
                Logistic Regression + TF-IDF
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white dark:bg-[#1A2029] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                  Model Predicted Category
                </span>
                <div className="text-sm font-medium text-[#172337] dark:text-[#F8FAFC]">
                  {complaint.predicted_category}
                </div>
                <div className="text-slate-600 dark:text-slate-400 pt-1 font-medium flex items-center gap-1.5">
                  <span>Confidence Score:</span>
                  <span className="font-medium text-primaryViolet dark:text-darkCyan font-mono">
                    {complaint.classification_confidence ? `${(complaint.classification_confidence * 100).toFixed(1)}%` : 'Calibrated'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Current Assigned: <span className="font-medium text-primaryViolet dark:text-darkCyan">{complaint.category}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1A2029] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                  Priority Engine Output
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <PriorityBadge priority={complaint.predicted_priority} size="sm" />
                  <span className="text-[#172337] dark:text-[#F8FAFC] font-mono font-medium">
                    ({complaint.priority_score}/100)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Current Assigned Priority:{' '}
                  <span className="font-medium text-[#172337] dark:text-[#F8FAFC]">{complaint.final_priority}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1A2029] p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed shadow-2xs">
              <span className="font-medium text-[#172337] dark:text-[#F8FAFC]">Scoring Engine Reasoning: </span>
              <span className="italic">{complaint.priority_explanation}</span>
            </div>
          </div>

          {/* Potential Duplicate Suggestions */}
          {duplicatesError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-500/40 p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-medium text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Duplicate Check Unavailable</span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Could not check for similar complaints: {duplicatesError}
              </p>
            </div>
          )}

          {!duplicatesError && duplicates.length > 0 && (
            <div className="bg-[#FFF4E8] dark:bg-[#222A35] rounded-2xl border border-amber-200 dark:border-amber-500/30   p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-darkAmber font-medium text-sm">
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
                    className="p-4 rounded-2xl bg-white dark:bg-[#1A2029] border border-amber-200/80 dark:border-white/10 text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-medium text-primaryViolet dark:text-darkCyan">{dup.public_id}</span>
                      <span className="font-mono text-amber-800 dark:text-darkAmber font-medium">
                        {(dup.similarity_score * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <div className="font-medium text-[#172337] dark:text-[#F8FAFC]">{dup.title}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">{dup.explanation}</div>
                    <div className="pt-1 flex items-center gap-3">
                      <StatusBadge status={dup.status} size="sm" />
                      <Link
                        to={`/admin/complaints/${dup.public_id}`}
                        className="text-[11px] text-primaryViolet dark:text-darkCyan hover:underline font-medium"
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
          <div className="bg-white dark:bg-[#1A2029] rounded-2xl border border-slate-200/90 dark:border-white/10   p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                <History className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
                <span>Immutable Audit Trail & Status History</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  {displayHistory.length} {displayHistory.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              <button
                type="button"
                onClick={refreshHistory}
                disabled={refreshingHistory}
                title="Refresh audit trail from database"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primaryViolet dark:text-darkCyan hover:opacity-80 transition-opacity"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh Log</span>
              </button>
            </div>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10 pt-1">
              {displayHistory.map((h, idx) => (
                <div key={h.id || idx} className="relative pl-8 text-xs space-y-1.5 animate-in fade-in">
                  <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1A2029] border-2 border-primaryViolet dark:border-cyan-400 shadow-xs" />
                  <div className="flex items-center gap-2 flex-wrap font-medium">
                    <span className="font-medium text-[#172337] dark:text-[#F8FAFC] bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-[11px]">
                      {h.new_status}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {formatDateTime(h.created_at)}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-primaryViolet dark:text-darkCyan font-medium text-[11px]">
                      Actor: {h.changed_by}
                    </span>
                  </div>
                  {h.note && (
                    <div className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#1A2029] p-3 rounded-xl border border-slate-200 dark:border-white/5 text-[11px] leading-relaxed shadow-2xs">
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
          {/* 1. STEP-BY-STEP LIFECYCLE PROGRESSION CONTROLLER */}
          <div className="bg-white dark:bg-[#1A2029] rounded-2xl border border-slate-200/90 dark:border-white/10   p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                <CheckCircle2 className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>Lifecycle Progression</span>
              </div>
              <StatusBadge status={complaint.status} size="sm" />
            </div>

            {/* TICKET REJECTED CONTROLLER */}
            {complaint.status === 'Rejected' && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
                  <div className="font-medium flex items-center gap-1.5 text-sm">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Ticket Currently Rejected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This complaint was rejected at Stage 2 Triage (Reason: <strong>{complaint.rejection_reason || 'Issue is Invalid'}</strong>).
                    To process this ticket through the 5-stage lifecycle, restore it to Stage 2: Under Review.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Restoration Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    aria-label="Restoration note" value={restoreNote}
                    onChange={(e) => setRestoreNote(e.target.value)}
                    placeholder="e.g. Student clarified safety concern; restoring for active dispatch."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRestoreComplaint}
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl bg-primaryViolet hover:opacity-95 text-white font-medium text-xs   disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{actionLoading === 'restore' ? 'Restoring...' : 'Restore to Stage 2: Under Review →'}</span>
                </button>
              </div>
            )}

            {/* STAGE 1: SUBMITTED */}
            {complaint.status === 'Submitted' && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-medium text-primaryViolet dark:text-darkCyan flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Stage 1 of 5: Complaint Lodged</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Student has submitted this complaint. You cannot jump directly to Resolved. First accept the complaint for triage and review.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Triage Inspection Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    aria-label="Inspection note" value={triageInspectionNote}
                    onChange={(e) => setTriageInspectionNote(e.target.value)}
                    placeholder="e.g. Physical inspection conducted; verified critical electrical danger."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] focus:outline-none focus:border-primaryViolet font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdvanceToUnderReview}
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl bg-primaryViolet hover:opacity-95 text-white font-medium text-xs   disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>
                    {actionLoading === 'step-under-review' ? 'Advancing...' : 'Advance to Stage 2: Begin Triage & Review →'}
                  </span>
                </button>
              </div>
            )}

            {/* STAGE 2: UNDER REVIEW */}
            {complaint.status === 'Under Review' && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-medium text-primaryViolet dark:text-darkCyan flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Stage 2 of 5: Triage Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Review priority & category below. To advance to Stage 3, select a division and enter a mandatory dispatch note.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAssignDepartment}
                  disabled={isSaving || !assignedDept || !deptNote.trim()}
                  className="w-full py-2.5 rounded-xl bg-primaryViolet hover:opacity-95 text-white font-medium text-xs   disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>
                    {actionLoading === 'assign'
                      ? 'Dispatching...'
                      : !assignedDept
                      ? 'Select Division Below to Advance to Stage 3'
                      : !deptNote.trim()
                      ? 'Enter Mandatory Dispatch Note Below to Advance'
                      : `Advance to Stage 3: Assign to ${assignedDept} →`}
                  </span>
                </button>
              </div>
            )}

            {/* STAGE 3: ASSIGNED */}
            {complaint.status === 'Assigned' && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-medium text-brightBlue dark:text-darkCyan flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    <span>Stage 3 of 5: Assigned to {complaint.assigned_department}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Maintenance division is dispatched. Once technicians arrive on site, log crew details (mandatory) and advance to In Progress.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Lead Technician / Crew on Site <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-rose-500 uppercase tracking-wider">Mandatory</span>
                  </div>
                  <input
                    type="text"
                    required
                    aria-label="Assigned crew" value={progressCrew}
                    onChange={(e) => setProgressCrew(e.target.value)}
                    placeholder="e.g. Lead Electrician Ramesh & assistant (mandatory)"
                    className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border ${!progressCrew.trim() ? 'border-amber-300/80 dark:border-amber-500/40' : 'border-slate-200 dark:border-white/10'} text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:outline-none focus:border-brightBlue`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Estimated Duration of Work
                  </label>
                  <input
                    type="text"
                    aria-label="Expected duration" value={progressDuration}
                    onChange={(e) => setProgressDuration(e.target.value)}
                    placeholder="e.g. 2 hours, 1 day, 45 minutes"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:outline-none focus:border-brightBlue"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    On-Site Work Start Note
                  </label>
                  <textarea
                    rows={2}
                    aria-label="Progress note" value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="e.g. Power isolated at breaker switch #4; crew has begun replacing damaged cables."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:outline-none focus:border-brightBlue"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdvanceToInProgress}
                  disabled={isSaving || !progressCrew.trim()}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-xs shadow-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>
                    {actionLoading === 'step-in-progress'
                      ? 'Advancing...'
                      : !progressCrew.trim()
                      ? 'Enter Mandatory Crew on Site Above'
                      : 'Advance to Stage 4: Mark Work In Progress →'}
                  </span>
                </button>
              </div>
            )}

            {/* STAGE 4: IN PROGRESS */}
            {complaint.status === 'In Progress' && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-medium text-cyan-700 dark:text-darkCyan flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Stage 4 of 5: Active Repair in Progress</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Repair work is ongoing. Once technicians finish, parts are verified, and safety is certified, fill in resolution details to complete.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-emerald-700 dark:text-darkMint">
                    Resolution Summary <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    aria-label="Resolution summary" value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    placeholder="e.g. Motherboard changed and fixed. Live wiring reinsulated, breaker tested."
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-mintGreen/15 border border-emerald-200 dark:border-mintGreen/40 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Parts Replaced / Work Specifics (Optional)
                  </label>
                  <input
                    type="text"
                    aria-label="Parts used" value={resolutionParts}
                    onChange={(e) => setResolutionParts(e.target.value)}
                    placeholder="e.g. Main motherboard replaced, 4mm heat-resistant cable installed"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Technician Sign-Off / Verifier (Optional)
                  </label>
                  <input
                    type="text"
                    aria-label="Sign-off" value={resolutionSignOff}
                    onChange={(e) => setResolutionSignOff(e.target.value)}
                    placeholder="e.g. Certified by Senior Electrical Supervisor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Worker Completion Photo & Gemini QA Inspection */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-primaryViolet dark:text-cyan-400" />
                      <span>Work Completion Photo (Gemini QA Audit)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Gemini Vision</span>
                  </label>

                  {!resolutionPhotoBase64 ? (
                    <label className="border-2 border-dashed border-slate-300 dark:border-white/15 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-emerald-500 dark:hover:border-cyan-400 transition-colors bg-white/50 dark:bg-black/20 text-center">
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Upload Work Photo</span>
                      <p className="text-[10px] text-slate-400">Gemini will scan and verify if work is PROPERLY or BADLY done.</p>
                      <input type="file" accept="image/*" onChange={handleResolutionPhotoChange} className="hidden" />
                    </label>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-48 flex items-center justify-center bg-black/5 dark:bg-black/40">
                        <img src={resolutionPhotoBase64} alt="Resolution proof" className="object-contain max-h-48 w-full" />
                        <button
                          type="button"
                          onClick={() => { setResolutionPhotoBase64(null); setWorkVerificationResult(null); }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {verifyingWork && (
                        <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 text-xs text-primaryViolet dark:text-cyan-300 flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span>Gemini AI is auditing completion photo against original defect...</span>
                        </div>
                      )}

                      {workVerificationError && (
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px]">
                          {workVerificationError}
                        </div>
                      )}

                      {workVerificationResult && !verifyingWork && workVerificationResult.verification_status !== 'completed' && (
                        <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/25 text-xs space-y-1.5">
                          <div className="font-semibold text-amber-800 dark:text-amber-200">
                            {workVerificationResult.verification_status === 'malformed'
                              ? 'Automated QA Returned Incomplete Output'
                              : 'Automated QA Unavailable'}
                          </div>
                          <p className="text-[11px] text-amber-700 dark:text-amber-300">
                            {workVerificationResult.error_message ||
                              'Automated quality verification is unavailable. Photo remains attached for explicit manual administrator sign-off.'}
                          </p>
                        </div>
                      )}

                      {workVerificationResult && !verifyingWork && workVerificationResult.verification_status === 'completed' && (
                        <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                          workVerificationResult.verdict === 'PROPERLY_DONE'
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-500/40'
                            : 'bg-rose-50/80 dark:bg-rose-950/25 border-rose-200 dark:border-rose-500/40'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                              workVerificationResult.verdict === 'PROPERLY_DONE'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}>
                              {workVerificationResult.verdict === 'PROPERLY_DONE' ? '✓ Properly Done' : '✕ Badly Done / Incomplete'}
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                              QA Score: {workVerificationResult.quality_score}/100
                            </span>
                          </div>

                          <div className="font-semibold text-slate-800 dark:text-slate-100 text-[11px]">
                            {workVerificationResult.verdict_headline}
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            {workVerificationResult.detailed_report}
                          </p>

                          {/* Checklist items */}
                          {workVerificationResult.checklist && (
                            <div className="space-y-1 pt-1">
                              {workVerificationResult.checklist.map((c, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                  <span className={c.passed ? "text-emerald-600 dark:text-mintGreen font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                                    {c.passed ? "✓" : "✗"}
                                  </span>
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{c.item}:</span>
                                  <span className="text-slate-500 dark:text-slate-400">{c.note}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className={`p-2 rounded-lg text-[10px] font-semibold ${
                            workVerificationResult.requires_rework
                              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200'
                              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                          }`}>
                            Recommendation: {workVerificationResult.manager_recommendation}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAdvanceToResolved}
                  disabled={isSaving || !resolutionSummary.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {actionLoading === 'step-resolved' ? 'Resolving...' : 'Complete Stage 5: Mark Resolved ✓'}
                  </span>
                </button>
              </div>
            )}

            {/* STAGE 5: RESOLVED */}
            {complaint.status === 'Resolved' && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-mintGreen/15 border border-emerald-200 dark:border-mintGreen/40 text-emerald-800 dark:text-mintGreen text-xs space-y-1.5">
                  <div className="font-medium flex items-center gap-1.5 text-sm">
                    <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-mintGreen" />
                    <span>Stage 5 Certified: Complaint Resolved</span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    This ticket has completed all 5 stages of the resolution pipeline. Student has been notified in their tracking portal.
                  </p>
                  {complaint.resolved_at && (
                    <div className="text-[10px] text-emerald-700 dark:text-darkMint font-mono font-medium">
                      Completed: {formatDateTime(complaint.resolved_at)}
                    </div>
                  )}
                </div>

                {/* EDIT RESOLUTION SUMMARY */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Recorded Resolution Summary
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditingResolution(!editingResolution)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primaryViolet dark:text-darkCyan hover:underline"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{editingResolution ? 'Cancel Edit' : 'Edit Resolution Note'}</span>
                    </button>
                  </div>

                  {editingResolution ? (
                    <div className="space-y-2 animate-in fade-in">
                      <textarea
                        rows={3}
                        aria-label="Resolution summary" value={resolutionSummary}
                        onChange={(e) => setResolutionSummary(e.target.value)}
                        placeholder="Update resolution summary..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1A2029] border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleUpdateResolutionNote}
                        disabled={isSaving || !resolutionSummary.trim()}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{actionLoading === 'edit-resolution' ? 'Saving...' : 'Save Updated Resolution Note'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 font-medium">
                      {resolutionSummary || complaint.resolution_notes || 'Motherboard Changed and Fixed'}
                    </div>
                  )}
                </div>

                {/* OPTIONAL REOPEN */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Need to Reopen Ticket? (If problem recurred)
                  </div>
                  <input
                    type="text"
                    aria-label="Reason for reopening" value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="Reason for reopening (e.g. Sparks recurred after 2 days)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleReopenComplaint}
                    disabled={isSaving || !reopenReason.trim()}
                    className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{actionLoading === 'reopen' ? 'Reopening...' : 'Reopen Complaint'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* REJECTION OPTION (only available when not resolved) */}
            {complaint.status !== 'Resolved' && complaint.status !== 'Rejected' && (
              <details className="text-xs pt-1 border-t border-slate-100 dark:border-white/10 group">
                <summary className="font-medium text-rose-600 dark:text-darkCoral cursor-pointer hover:underline py-1">
                  Need to Reject this complaint?
                </summary>
                <div className="space-y-2 pt-2 animate-in fade-in">
                  <textarea
                    rows={2}
                    aria-label="Reason for rejection" value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection (e.g. Duplicate ticket, off-campus issue)..."
                    className="w-full px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-800 dark:text-rose-200 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleRejectComplaint}
                    disabled={isSaving || !rejectionReason.trim()}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{actionLoading === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}</span>
                  </button>
                </div>
              </details>
            )}
          </div>

          {/* 2. ASSIGN RESPONSIBLE DIVISION & EDIT DISPATCH NOTE */}
          <div className="bg-white dark:bg-[#1A2029] rounded-2xl border border-slate-200/90 dark:border-white/10   p-6 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                <Building className="w-4 h-4 text-brightBlue dark:text-darkCyan" />
                <span>Assign Division</span>
              </div>
              <span className="font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                {complaint.assigned_department ? 'Assigned' : 'Unassigned'}
              </span>
            </div>

            {/* Current Recorded Value Display */}
            {deptNote && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300">
                <span className="font-medium text-[#172337] dark:text-[#F8FAFC]">Current Dispatch Note: </span>
                <span className="italic">"{deptNote}"</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Facility Department
              </label>
              <select
                aria-label="Assigned department" value={assignedDept}
                onChange={(e) => setAssignedDept(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 font-medium focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-primaryViolet"
              >
                <option value="">Select Division</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-white dark:bg-[#1A2029]">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Dispatch Note / Work Order / Assigned Technician <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-medium text-rose-500 uppercase tracking-wider">Mandatory</span>
              </div>
              <input
                type="text"
                required
                aria-label="Department assignment note" value={deptNote}
                onChange={(e) => setDeptNote(e.target.value)}
                placeholder="e.g. Work order #204, assigned to technician Ravi (mandatory)"
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border ${!deptNote.trim() ? 'border-amber-300/90 dark:border-amber-500/50' : 'border-slate-200 dark:border-white/10'} text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-brightBlue`}
              />
              {!deptNote.trim() && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  * Mandatory: Enter work order ID, assigned technician, or dispatch note.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleAssignDepartment}
              disabled={isSaving || !assignedDept || !deptNote.trim()}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-medium text-xs border border-slate-200 dark:border-white/10 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Building className="w-3.5 h-3.5" />
              <span>
                {actionLoading === 'assign'
                  ? 'Updating Division...'
                  : !assignedDept
                  ? 'Select Division Above'
                  : !deptNote.trim()
                  ? 'Enter Mandatory Dispatch Note Above'
                  : complaint.assigned_department
                  ? 'Update Division & Dispatch Note'
                  : 'Assign & Update Division'}
              </span>
            </button>
          </div>

          {/* 3. HUMAN PRIORITY OVERRIDE & EDIT JUSTIFICATION NOTE */}
          <div className="bg-white dark:bg-[#1A2029] rounded-2xl border border-slate-200/90 dark:border-white/10   p-6 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-darkAmber" />
                <span>Human Priority Override</span>
              </div>
              <PriorityBadge priority={complaint.final_priority} size="sm" />
            </div>

            {/* Current Recorded Value Display */}
            {priorityReason && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-[11px] text-slate-700 dark:text-slate-300">
                <span className="font-medium text-amber-800 dark:text-amber-400">Current Justification Note: </span>
                <span className="italic">"{priorityReason}"</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Priority Level
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Current: {complaint.final_priority}
                </span>
              </div>
              <select
                aria-label="Priority" value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-amber-500"
              >
                <option value="Critical" className="bg-white dark:bg-[#1A2029]">Critical</option>
                <option value="High" className="bg-white dark:bg-[#1A2029]">High</option>
                <option value="Medium" className="bg-white dark:bg-[#1A2029]">Medium</option>
                <option value="Low" className="bg-white dark:bg-[#1A2029]">Low</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Justification / Review Reason <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-medium text-rose-500 uppercase tracking-wider">Mandatory</span>
              </div>
              <input
                type="text"
                required
                aria-label="Reason for priority change" value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
                placeholder="e.g. Verified safety danger on-site, priority confirmed (mandatory)"
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border ${!priorityReason.trim() ? 'border-amber-300/90 dark:border-amber-500/50' : 'border-slate-200 dark:border-white/10'} text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-amber-500`}
              />
              {!priorityReason.trim() && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  * Mandatory: Enter a justification reason before committing priority override.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handlePriorityOverride}
              disabled={isSaving || !priorityReason.trim()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs disabled:opacity-50 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {actionLoading === 'priority'
                  ? 'Committing...'
                  : !priorityReason.trim()
                  ? 'Enter Mandatory Justification Above'
                  : !isPriorityUnchanged
                  ? `Commit Priority Override (${complaint.final_priority} → ${selectedPriority})`
                  : 'Commit Priority Review Note'}
              </span>
            </button>
          </div>

          {/* 4. CORRECT AI CATEGORY & EDIT VERIFICATION REASON */}
          <div className="bg-white dark:bg-[#1A2029] rounded-2xl border border-slate-200/90 dark:border-white/10   p-6 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>Correct AI Category</span>
              </div>
              <span className="font-medium text-[10px] bg-slate-100 dark:bg-white/10 text-primaryViolet dark:text-darkPurple px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 truncate max-w-[130px]">
                {complaint.category}
              </span>
            </div>

            {/* Current Recorded Value Display */}
            {categoryReason && (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                <span className="font-medium text-primaryViolet dark:text-darkCyan">Current Category Reason: </span>
                <span className="italic">"{categoryReason}"</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Current: {complaint.category}
                </span>
              </div>
              <select
                aria-label="Category" value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-primaryViolet"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-[#1A2029]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Correction / Verification Reason <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-medium text-rose-500 uppercase tracking-wider">Mandatory</span>
              </div>
              <input
                type="text"
                required
                aria-label="Reason for category change" value={categoryReason}
                onChange={(e) => setCategoryReason(e.target.value)}
                placeholder="e.g. Water leak from AC drain line, reclassified to Water Supply (mandatory)"
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2029] border ${!categoryReason.trim() ? 'border-amber-300/90 dark:border-amber-500/50' : 'border-slate-200 dark:border-white/10'} text-xs text-[#172337] dark:text-[#F8FAFC] font-medium focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-primaryViolet`}
              />
              {!categoryReason.trim() && (
                <p className="text-[10px] text-blue-700 dark:text-blue-700 font-medium">
                  * Mandatory: Enter a verification or correction reason before committing category.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleCategoryOverride}
              disabled={isSaving || !categoryReason.trim()}
              className="w-full py-2.5 rounded-xl bg-primaryViolet hover:from-violet-700 hover:to-indigo-700 text-white font-medium text-xs disabled:opacity-50 transition-colors   cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {actionLoading === 'category'
                  ? 'Committing...'
                  : !categoryReason.trim()
                  ? 'Enter Mandatory Reason Above'
                  : !isCategoryUnchanged
                  ? 'Commit Category Correction'
                  : 'Commit Category Verification Note'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
