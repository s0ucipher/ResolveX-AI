import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ArrowRight,
  Building,
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  RotateCcw,
  Cpu,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDisplayMode } from '../context/DisplayModeContext';
import { CATEGORIES, DEPARTMENTS, Complaint } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';

const CAMPUS_LOCATIONS = [
  "Main Academic Block - 2nd Floor",
  "Science Block B - Lab 104",
  "Boys Hostel 1 - Wing A",
  "Boys Hostel 2 - 3rd Floor",
  "Girls Hostel 1 - Ground Floor",
  "Girls Hostel 2 - Block C",
  "Central Library - Reading Hall",
  "Computer Science Building - Lab 3",
  "Mechanical Workshop - Section B",
  "Campus Cafeteria & Food Court",
  "Main Gate and Security Post",
  "Sports Complex and Gymnasium",
  "Auditorium & Seminar Hall"
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SubmitComplaintPage: React.FC = () => {
  const { user } = useAuth();
  const { isMobileMode } = useDisplayMode();
  const navigate = useNavigate();
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [affectedCount, setAffectedCount] = useState<string>('');
  const [durationDays, setDurationDays] = useState<string>('');
  const [userEmail, setUserEmail] = useState(user?.email || '');

  // Live preview state
  const [analyzing, setAnalyzing] = useState(false);
  const [livePrediction, setLivePrediction] = useState<{
    category?: string;
    confidence?: number;
    influential_features?: string[];
    is_uncertain?: boolean;
    uncertainty_note?: string | null;
    priority?: string;
    score?: number;
    priorityReason?: string;
  } | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [copied, setCopied] = useState(false);

  const reportError = (msg: string) => {
    setError(msg);
    setTimeout(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  // Live AI Preview Handler
  const handleLivePreview = async () => {
    if (!title.trim() || title.trim().length < 5) {
      reportError('Please enter a complaint title with at least 5 characters before previewing AI analysis.');
      return;
    }
    if (!description.trim() || description.trim().length < 15) {
      reportError('Please enter a detailed description with at least 15 characters before previewing AI analysis.');
      return;
    }

    setError(null);
    setAnalyzing(true);
    try {
      const [catRes, prioRes] = await Promise.all([
        api.classifyText(title.trim(), description.trim()),
        api.predictPriority({
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || undefined,
          affected_count: affectedCount ? parseInt(affectedCount, 10) : undefined,
          duration_days: durationDays ? parseInt(durationDays, 10) : undefined,
        })
      ]);

      setLivePrediction({
        category: catRes.predicted_category,
        confidence: catRes.confidence,
        influential_features: catRes.influential_features,
        is_uncertain: catRes.is_uncertain,
        uncertainty_note: catRes.uncertainty_note,
        priority: prioRes.recommended_priority,
        score: prioRes.score,
        priorityReason: prioRes.reasoning
      });

      // Auto-fill category if not already explicitly selected by user
      if (!category && catRes.predicted_category) {
        setCategory(catRes.predicted_category);
      }
    } catch (err: any) {
      reportError(err.message || 'Failed to generate live preview. Please check backend connection.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Field-level validations
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 5) {
      reportError('Complaint summary title must be at least 5 characters long.');
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription || trimmedDescription.length < 15) {
      reportError('Detailed description must be at least 15 characters long so our AI model can evaluate the issue.');
      return;
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation || trimmedLocation.length < 3) {
      reportError('Please specify the campus location (at least 3 characters).');
      return;
    }

    const effectiveEmail = user?.email || userEmail.trim();
    if (effectiveEmail && !EMAIL_REGEX.test(effectiveEmail)) {
      reportError('Please provide a valid contact email address (e.g. student@college.edu) or leave it blank.');
      return;
    }

    let parsedAffected: number | null = null;
    if (affectedCount.trim()) {
      parsedAffected = parseInt(affectedCount.trim(), 10);
      if (isNaN(parsedAffected) || parsedAffected < 1 || parsedAffected > 10000) {
        reportError('Estimated people affected must be a valid number between 1 and 10,000.');
        return;
      }
    }

    let parsedDuration: number | null = null;
    if (durationDays.trim()) {
      parsedDuration = parseInt(durationDays.trim(), 10);
      if (isNaN(parsedDuration) || parsedDuration < 0 || parsedDuration > 365) {
        reportError('Issue duration must be a valid number of days between 0 and 365.');
        return;
      }
    }

    setError(null);
    setSubmitting(true);

    try {
      const created = await api.submitComplaint({
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
        category: category.trim() ? category.trim() : null,
        assigned_department: department.trim() ? department.trim() : null,
        affected_count: parsedAffected,
        duration_days: parsedDuration,
        user_email: effectiveEmail || null
      });

      setSubmittedComplaint(created);
    } catch (err: any) {
      reportError(err.message || 'Failed to submit complaint. Please check server connectivity and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (submittedComplaint?.public_id) {
      navigator.clipboard.writeText(submittedComplaint.public_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setCategory('');
    setDepartment('');
    setAffectedCount('');
    setDurationDays('');
    setLivePrediction(null);
    setSubmittedComplaint(null);
    setError(null);
  };

  // SUCCESS SCREEN
  if (submittedComplaint) {
    return (
      <div className={`${isMobileMode ? 'w-full px-3.5 py-4' : 'max-w-3xl mx-auto px-4 py-14'}`}>
        <div className={`bg-white/95 dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 ${
          isMobileMode ? 'p-4 space-y-4' : 'p-6 sm:p-10 space-y-8'
        }`}>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-mintGreen to-emerald-600 text-white flex items-center justify-center mx-auto shadow-glossy-light dark:shadow-neon-mint/30">
              <CheckCheck className="w-9 h-9" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC]">Complaint Lodged Successfully!</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Your record is stored in the persistent database and evaluated by ComplainAI.
            </p>
          </div>

          {/* Tracking ID Glow Box */}
          <div className="bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glossy-light dark:shadow-neon-violet/40 text-white">
            <div>
              <div className="text-xs uppercase font-mono text-purple-200 font-bold tracking-wider">Your Public Tracking ID</div>
              <div className="text-3xl font-mono font-black text-white tracking-wider mt-1">
                {submittedComplaint.public_id}
              </div>
              <div className="text-xs text-purple-100 mt-1 font-medium">Share or search this ID anytime to verify maintenance updates.</div>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-primaryViolet text-xs font-black shadow-md hover:scale-102 transition-all whitespace-nowrap cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Tracking ID'}</span>
            </button>
          </div>

          {/* AI Prediction Result Card */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-[#F4F2FF] dark:bg-[#151D38] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-extrabold text-sm">
                <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>AI Categorization & Priority Recommendation</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-violet-100 dark:bg-white/10 text-primaryViolet dark:text-darkCyan font-bold border border-violet-200 dark:border-white/10">
                Inference Complete
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#171F3B] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Classified Category</div>
                <div className="text-sm font-extrabold text-[#172033] dark:text-[#F8FAFC]">{submittedComplaint.category}</div>
                {submittedComplaint.classification_confidence !== null && submittedComplaint.classification_confidence !== undefined && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primaryViolet to-brightBlue h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, submittedComplaint.classification_confidence * 100))}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-primaryViolet dark:text-darkCyan">
                      {(submittedComplaint.classification_confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#171F3B] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned Urgency</div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={submittedComplaint.final_priority} size="md" />
                  <span className="text-xs font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">Score: {submittedComplaint.priority_score}/100</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Deterministic Hazard Rubric</div>
              </div>
            </div>

            {submittedComplaint.priority_explanation && (
              <div className="bg-white dark:bg-[#171F3B] p-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1 shadow-2xs">
                <div className="font-extrabold text-primaryViolet dark:text-darkPurple text-[11px] uppercase tracking-wider">Why this prediction?</div>
                <p>{submittedComplaint.priority_explanation}</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-violet-100/60 dark:bg-white/5 border border-violet-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-darkCyan shrink-0" />
              <span className="font-medium">AI predictions are recommendations and may require human review.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to={`/track?id=${submittedComplaint.public_id}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue text-white font-bold text-xs sm:text-sm shadow-glossy-light dark:shadow-neon-violet/30 hover:opacity-95 transition-all"
            >
              <span>Track Live Progress</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Lodge Another Complaint</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FORM VIEW
  return (
    <div className={`${isMobileMode ? 'w-full px-3.5 py-4 space-y-4' : 'max-w-6xl mx-auto px-4 py-12 space-y-8'}`}>
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-mono text-primaryViolet dark:text-darkPurple font-bold mb-1 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/40">
          <Sparkles className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple" />
          <span>NATURAL LANGUAGE TRIAGE</span>
        </div>
        <h1 className={`font-black text-[#172033] dark:text-[#F8FAFC] mt-1 ${isMobileMode ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
          Submit a Campus Complaint
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
          Describe the problem in plain conversational language. ComplainAI automatically determines the category, evaluates priority, and flags duplicates.
        </p>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-12 items-start ${isMobileMode ? 'gap-4' : 'gap-8'}`}>
        {/* Main Form (7 cols) */}
        <form onSubmit={handleSubmit} className={`lg:col-span-7 bg-white dark:bg-[#171F3B] rounded-3xl border border-violet-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark backdrop-blur-xl ${
          isMobileMode ? 'p-4 space-y-4' : 'p-6 sm:p-8 space-y-6'
        }`}>
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <div className="font-bold text-rose-800 dark:text-rose-200">Submission Notice</div>
                <div className="leading-relaxed">{error}</div>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Complaint Summary Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Exposed electrical cables sparking near staircase"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 focus:ring-2 focus:ring-violet-200/50 dark:focus:ring-cyan-500/20 text-sm text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Concise headline describing the core symptom.</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain where it is, what is leaking/sparking/broken, whether it poses physical injury, how many students are affected..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 focus:ring-2 focus:ring-violet-200/50 dark:focus:ring-cyan-500/20 text-sm text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all leading-relaxed font-medium"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Include any hazard markers for automatic emergency floor scoring.</span>
              <span className="font-mono">{description.length} chars</span>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Campus Location <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Academic Block - 2nd Floor, or Boys Hostel 2"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 focus:ring-2 focus:ring-violet-200/50 dark:focus:ring-cyan-500/20 text-sm text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
              />
              <MapPin className="w-4 h-4 text-brightBlue dark:text-darkCyan absolute left-3.5 top-3.5" />
            </div>

            {/* Suggestions Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 self-center font-medium">Suggestions:</span>
              {CAMPUS_LOCATIONS.slice(0, 4).map((loc) => (
                <button
                  type="button"
                  key={loc}
                  onClick={() => setLocation(loc)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-[#F0E9FF] dark:bg-white/5 hover:bg-violet-100 dark:hover:bg-white/10 text-primaryViolet dark:text-darkCyan border border-violet-200 dark:border-white/10 transition-colors font-semibold cursor-pointer"
                >
                  {loc.split('-')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Department (2 Cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/10">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Category</span>
                <span className="text-[10px] text-primaryViolet dark:text-darkCyan font-bold">✨ Auto-Predict</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="">✨ Let ComplainAI Predict Automatically</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-[#171F3B]">{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Department <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="">Select if known (or leave blank)</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-white dark:bg-[#171F3B]">{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* People Affected & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brightBlue dark:text-darkCyan" />
                <span>Est. People Affected</span>
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={affectedCount}
                onChange={(e) => setAffectedCount(e.target.value)}
                placeholder="e.g. 50 students"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-darkAmber" />
                <span>Issue Duration (Days)</span>
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="e.g. 2 days"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium"
              />
            </div>
          </div>

          {!user && (
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contact Email <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional, for notification updates)</span>
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="student@college.edu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium"
              />
            </div>
          )}

          {/* Action Row Error Display */}
          {error && (
            <div
              ref={errorRef}
              className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3 font-medium animate-in fade-in duration-200"
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <div className="font-bold text-rose-800 dark:text-rose-200">Submission Notice</div>
                <div className="leading-relaxed">{error}</div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={handleLivePreview}
              disabled={analyzing || submitting || !title.trim() || !description.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-100/80 dark:bg-violet-900/40 hover:bg-violet-200 dark:hover:bg-violet-900/60 text-primaryViolet dark:text-darkPurple border border-violet-200 dark:border-violet-700/60 text-xs font-extrabold disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primaryViolet dark:text-darkPurple" />
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                  <span>Preview AI Analysis</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue text-white font-extrabold text-xs sm:text-sm shadow-glossy-light dark:shadow-neon-violet/30 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Complaint...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Complaint</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Insight Sidebar (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {livePrediction ? (
            <div className="bg-white/95 dark:bg-[#171F3B] rounded-3xl border border-violet-200 dark:border-violet-500/30 shadow-card-light dark:shadow-card-dark p-6 space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-extrabold text-sm">
                  <Sparkles className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                  <span>Real-Time Model Analysis</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-violet-100 dark:bg-white/10 text-primaryViolet dark:text-darkCyan font-bold border border-violet-200 dark:border-white/10">
                  Predicted
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Predicted Category</span>
                <div className="text-base font-black text-[#172033] dark:text-[#F8FAFC] mt-0.5">{livePrediction.category}</div>
                <div className="flex items-center gap-2 pt-1.5">
                  <div className="flex-1 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primaryViolet to-brightBlue h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, (livePrediction.confidence || 0) * 100))}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-primaryViolet dark:text-darkCyan">
                    {((livePrediction.confidence || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {livePrediction.is_uncertain && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
                  {livePrediction.uncertainty_note}
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Urgency Assessment</span>
                <div className="mt-1 flex items-center gap-2">
                  <PriorityBadge priority={livePrediction.priority || 'Medium'} />
                  <span className="text-xs text-[#172033] dark:text-[#F8FAFC] font-mono font-bold">Score: {livePrediction.score}/100</span>
                </div>
              </div>

              {livePrediction.influential_features && livePrediction.influential_features.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Attributed Feature Tokens
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {livePrediction.influential_features.map((feat) => (
                      <span key={feat} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#E7F4FF] dark:bg-white/5 border border-blue-200 dark:border-cyan-500/30 text-brightBlue dark:text-darkCyan font-bold">
                        +{feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{livePrediction.priorityReason}"
              </div>
            </div>
          ) : (
            <div className="bg-white/95 dark:bg-[#171F3B] rounded-3xl border border-violet-100 dark:border-white/10 p-6 space-y-4 shadow-card-light dark:shadow-card-dark">
              <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-extrabold text-sm">
                <Cpu className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>AI Prediction Assistant</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Click <span className="font-bold text-primaryViolet dark:text-darkPurple">"Preview AI Analysis"</span> at any point to inspect model probabilities, influential n-grams, and urgency scoring prior to submitting.
              </p>
              <div className="p-4 rounded-2xl bg-[#F0E9FF] dark:bg-[#0F1530] border border-violet-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200">Evaluated Factors:</div>
                <div>• Scikit-learn TF-IDF + Logistic Regression category probabilities</div>
                <div>• Emergency safety indicators & disruption points</div>
                <div>• Affected population & duration persistence</div>
              </div>
            </div>
          )}

          {/* Human Review Policy */}
          <div className="p-5 rounded-2xl bg-white/95 dark:bg-[#171F3B] border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-mintGreen dark:text-darkMint" />
              <span>Human-in-the-Loop Safeguard</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              ComplainAI outputs are advisory recommendations. Authorized campus administrators review and triage each ticket before technician dispatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
