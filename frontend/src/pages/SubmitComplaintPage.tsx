import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Loader2,
  RefreshCw,
  FileText,
  ScanLine,
  UploadCloud,
  Camera,
  ImageIcon,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import {
  getLegacyLocalDrafts,
  dismissLegacyLocalDraft,
  LegacyLocalDraft
} from '../services/localFallback';
import { useAuth } from '../context/AuthContext';
import { useComplaints } from '../context/ComplaintsContext';
import { useDisplayMode } from '../context/DisplayModeContext';
import { CATEGORIES, DEPARTMENTS, Complaint, ScannedReportResult, PhotoAnalysisResult } from '../types';
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

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDraftStorageKey(email?: string | null): string {
  const clean = (email || '').trim().toLowerCase();
  return clean ? `complainai_unsent_draft_${clean}` : 'complainai_unsent_draft_guest';
}

export const SubmitComplaintPage: React.FC = () => {
  const { user } = useAuth();
  const { addSubmittedComplaint } = useComplaints();
  const isMobileMode = false;
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
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());
  const [hasUnsentDraft, setHasUnsentDraft] = useState(false);
  const [legacyDrafts, setLegacyDrafts] = useState<LegacyLocalDraft[]>(() => getLegacyLocalDrafts(user?.email));

  // Restore any saved unsent draft for the current user
  useEffect(() => {
    setLegacyDrafts(getLegacyLocalDrafts(user?.email));
    try {
      const raw = localStorage.getItem(getDraftStorageKey(user?.email));
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && (draft.title || draft.description || draft.location)) {
          setTitle(draft.title || '');
          setDescription(draft.description || '');
          setLocation(draft.location || '');
          setCategory(draft.category || '');
          setDepartment(draft.department || '');
          setAffectedCount(draft.affectedCount || '');
          setDurationDays(draft.durationDays || '');
          setIdempotencyKey(draft.idempotencyKey || generateIdempotencyKey());
          setHasUnsentDraft(true);
        }
      }
    } catch {
      // Ignore invalid draft JSON
    }
  }, [user?.email]);

  // Automatic Category Prediction State
  const [autoPredictedCategory, setAutoPredictedCategory] = useState<string | null>(null);
  const [autoConfidence, setAutoConfidence] = useState<number | null>(null);
  const [autoFeatures, setAutoFeatures] = useState<string[]>([]);
  const [autoIsUncertain, setAutoIsUncertain] = useState<boolean>(false);
  const [autoUncertaintyNote, setAutoUncertaintyNote] = useState<string | null>(null);
  const [isAutoPredicting, setIsAutoPredicting] = useState<boolean>(false);
  const [autoPredictError, setAutoPredictError] = useState<string | null>(null);
  const [lastPredictedText, setLastPredictedText] = useState<string>('');

  // Track if text has changed since last prediction
  const currentTextKey = `${title.trim()}|||${description.trim()}`;
  const isPredictionStale = Boolean(
    autoPredictedCategory && lastPredictedText && lastPredictedText !== currentTextKey
  );

  // Live preview state (sidebar)
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

  // Scanned Report & Critical Ranking state
  const [showScanDrawer, setShowScanDrawer] = useState(false);
  const [scannedText, setScannedText] = useState('');
  const [analyzingScan, setAnalyzingScan] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedReportResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleAnalyzeScan = async (textToScan?: string) => {
    const raw = (textToScan || scannedText).trim();
    if (!raw || raw.length < 10) {
      setScanError('Please enter at least 10 characters of scanned report text or select a preset.');
      return;
    }
    setScanError(null);
    setAnalyzingScan(true);
    try {
      const res = await api.analyzeScannedReport(raw);
      setScanResult(res);
    } catch (err: any) {
      setScanError(err.message || 'Failed to analyze scanned report.');
    } finally {
      setAnalyzingScan(false);
    }
  };

  const handleApplyScanToForm = () => {
    if (!scanResult) return;
    setTitle(scanResult.extracted_title);
    setDescription(scanResult.extracted_description);
    if (scanResult.extracted_location && scanResult.extracted_location.trim()) {
      setLocation(scanResult.extracted_location.trim());
    } else {
      setLocation('');
      setError('Location was not found in the pasted text. Please enter the campus location manually.');
    }
    if (scanResult.extracted_affected_count) {
      setAffectedCount(String(scanResult.extracted_affected_count));
    }
    if (scanResult.predicted_category) {
      setCategory(scanResult.predicted_category);
    }
    setShowScanDrawer(false);
  };

  // Photo Upload & Gemini Vision Analysis State
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisResult | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Image size exceeds 8MB. Please upload a smaller image.');
      return;
    }
    setPhotoError(null);
    setPhotoMime(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setPhotoBase64(b64);
      // Auto-trigger Gemini analysis when image is attached
      runGeminiPhotoAnalysis(b64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const runGeminiPhotoAnalysis = async (imgB64?: string, mime?: string) => {
    const targetImg = imgB64 || photoBase64;
    if (!targetImg) return;
    setAnalyzingPhoto(true);
    setPhotoError(null);
    try {
      const res = await api.analyzeComplaintPhoto(
        targetImg,
        mime || photoMime,
        description || title || undefined
      );
      setPhotoAnalysis(res);
    } catch (err: any) {
      console.warn('Gemini photo analysis failed:', err);
      setPhotoError(err.message || 'Gemini Vision could not process the image.');
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handleApplyPhotoAnalysis = () => {
    if (!photoAnalysis || photoAnalysis.analysis_status !== 'completed') return;
    if ((!title || title.trim().length < 5) && photoAnalysis.suggested_title) {
      setTitle(photoAnalysis.suggested_title);
    }
    if (photoAnalysis.simple_report) {
      if (!description || description.trim().length < 15) {
        setDescription(photoAnalysis.simple_report);
      } else {
        setDescription(prev => `${prev}\n\n[Visual Report]: ${photoAnalysis.simple_report}`);
      }
    }
    if (photoAnalysis.suggested_department && CATEGORIES.includes(photoAnalysis.suggested_department)) {
      setCategory(photoAnalysis.suggested_department);
    }
  };

  const reportError = (msg: string) => {
    setError(msg);
    setTimeout(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  // Run AI Category Classifier on Complaint Text
  const runCategoryPrediction = useCallback(async (force: boolean = false) => {
    const t = title.trim();
    const d = description.trim();
    const textKey = `${t}|||${d}`;

    if (t.length < 5 || d.length < 15) {
      return;
    }

    if (!force && lastPredictedText === textKey && autoPredictedCategory) {
      return;
    }

    setIsAutoPredicting(true);
    setAutoPredictError(null);
    try {
      const res = await api.classifyText(t, d);
      setAutoPredictedCategory(res.predicted_category);
      setAutoConfidence(res.confidence);
      setAutoFeatures(res.influential_features || []);
      setAutoIsUncertain(res.is_uncertain || false);
      setAutoUncertaintyNote(res.uncertainty_note || null);
      setLastPredictedText(textKey);

      // Keep livePrediction state in sync
      setLivePrediction(prev => ({
        ...(prev || {}),
        category: res.predicted_category,
        confidence: res.confidence,
        influential_features: res.influential_features,
        is_uncertain: res.is_uncertain,
        uncertainty_note: res.uncertainty_note,
      }));
    } catch (err: any) {
      setAutoPredictError(err.message || 'Unable to classify text automatically.');
    } finally {
      setIsAutoPredicting(false);
    }
  }, [title, description, lastPredictedText, autoPredictedCategory]);

  // Debounced auto-prediction when category is set to auto ("")
  useEffect(() => {
    if (category === '' && title.trim().length >= 5 && description.trim().length >= 15) {
      const timer = setTimeout(() => {
        runCategoryPrediction(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [title, description, category, runCategoryPrediction]);

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

      setAutoPredictedCategory(catRes.predicted_category);
      setAutoConfidence(catRes.confidence);
      setAutoFeatures(catRes.influential_features || []);
      setAutoIsUncertain(catRes.is_uncertain || false);
      setAutoUncertaintyNote(catRes.uncertainty_note || null);
      setLastPredictedText(`${title.trim()}|||${description.trim()}`);
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
      // Determine effective category
      let effectiveCategory: string | null = category.trim() || null;

      // If category was left in auto mode, use auto-predicted category or resolve it now
      if (!effectiveCategory) {
        if (autoPredictedCategory && !isPredictionStale) {
          effectiveCategory = autoPredictedCategory;
        } else if (trimmedTitle.length >= 5 && trimmedDescription.length >= 15) {
          try {
            const freshClassify = await api.classifyText(trimmedTitle, trimmedDescription);
            effectiveCategory = freshClassify.predicted_category;
            setAutoPredictedCategory(freshClassify.predicted_category);
            setAutoConfidence(freshClassify.confidence);
          } catch (e) {
            console.warn('Pre-submit classification skipped, allowing backend classifier to process:', e);
          }
        }
      }

      const created = await api.submitComplaint({
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
        category: effectiveCategory,
        assigned_department: department.trim() ? department.trim() : null,
        affected_count: parsedAffected,
        duration_days: parsedDuration,
        user_email: effectiveEmail || null,
        photo_url: photoBase64 || null,
        photo_analysis:
          photoAnalysis && photoAnalysis.analysis_status === 'completed'
            ? JSON.stringify(photoAnalysis)
            : null,
        idempotency_key: idempotencyKey
      });

      // Clear unsent draft only after server confirms persistence
      try {
        localStorage.removeItem(getDraftStorageKey(user?.email));
      } catch {
        // Ignore storage errors
      }
      setHasUnsentDraft(false);
      setIdempotencyKey(generateIdempotencyKey());

      // Synchronously update shared complaints cache and state
      addSubmittedComplaint(created);
      setSubmittedComplaint(created);
    } catch (err: any) {
      // Preserve form text as an unsent draft with the same idempotencyKey for safe retry
      try {
        localStorage.setItem(
          getDraftStorageKey(user?.email),
          JSON.stringify({
            title,
            description,
            location,
            category,
            department,
            affectedCount,
            durationDays,
            idempotencyKey,
            savedAt: new Date().toISOString(),
          })
        );
        setHasUnsentDraft(true);
      } catch {
        // Ignore storage errors
      }
      reportError(
        err.message || 'Complaint was NOT submitted. Your text is saved as an unsent draft — please retry.'
      );
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
    setAutoPredictedCategory(null);
    setAutoConfidence(null);
    setAutoFeatures([]);
    setAutoIsUncertain(false);
    setAutoUncertaintyNote(null);
    setIsAutoPredicting(false);
    setAutoPredictError(null);
    setLastPredictedText('');
    setLivePrediction(null);
    setSubmittedComplaint(null);
    setError(null);
    setHasUnsentDraft(false);
    setIdempotencyKey(generateIdempotencyKey());
    try {
      localStorage.removeItem(getDraftStorageKey(user?.email));
    } catch {
      // Ignore storage errors
    }
  };

  // SUCCESS SCREEN
  if (submittedComplaint) {
    return (
      <div className={`${isMobileMode ? 'w-full px-3.5 py-4' : 'max-w-3xl mx-auto px-4 py-14'}`}>
        <div className={`bg-white/95 dark:bg-[#1A2029] rounded-2xl border border-slate-200/90 dark:border-white/10   animate-in fade-in zoom-in-95 duration-300 ${
          isMobileMode ? 'p-4 space-y-4' : 'p-6 sm:p-10 space-y-8'
        }`}>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primaryViolet text-white flex items-center justify-center mx-auto  ">
              <CheckCheck className="w-9 h-9" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#172337] dark:text-[#F8FAFC]">Your report is on its way</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Keep your tracking ID to follow progress and updates.
            </p>
          </div>

          {/* Tracking ID Glow Box */}
          <div className="bg-primaryViolet rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4   text-white">
            <div>
              <div className="text-xs uppercase font-mono text-blue-700 font-medium tracking-wider">Your tracking ID</div>
              <div className="text-3xl font-mono font-medium text-white tracking-wider mt-1">
                {submittedComplaint.public_id}
              </div>
              <div className="text-xs text-blue-700 mt-1 font-medium">Share or search this ID anytime to verify maintenance updates.</div>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-primaryViolet text-xs font-medium shadow-md  transition-colors whitespace-nowrap cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied' : 'Copy Tracking ID'}</span>
            </button>
          </div>

          {/* AI Prediction Result Card */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-[#F7F8FA] dark:bg-[#222A35] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>AI Categorization & Priority Recommendation</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-primaryViolet dark:text-darkCyan font-medium border border-slate-200 dark:border-white/10">
                Inference Complete
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1A2029] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Classified Category</div>
                <div className="text-sm font-medium text-[#172337] dark:text-[#F8FAFC]">{submittedComplaint.category}</div>
                {submittedComplaint.classification_confidence !== null && submittedComplaint.classification_confidence !== undefined && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-100 dark:bg-slate-800 h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, submittedComplaint.classification_confidence * 100))}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-medium text-primaryViolet dark:text-darkCyan">
                      {(submittedComplaint.classification_confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1A2029] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned Urgency</div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={submittedComplaint.final_priority} size="md" />
                  <span className="text-xs font-mono font-medium text-[#172337] dark:text-[#F8FAFC]">Score: {submittedComplaint.priority_score}/100</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Deterministic Hazard Rubric</div>
              </div>
            </div>

            {submittedComplaint.priority_explanation && (
              <div className="bg-white dark:bg-[#1A2029] p-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1 shadow-2xs">
                <div className="font-medium text-primaryViolet dark:text-darkPurple text-[11px] uppercase tracking-wider">Why this prediction?</div>
                <p>{submittedComplaint.priority_explanation}</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-darkCyan shrink-0" />
              <span className="font-medium">AI predictions are recommendations and may require human review.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={`/track?id=${submittedComplaint.public_id}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primaryViolet text-white font-medium text-xs sm:text-sm   hover:opacity-95 transition-colors"
            >
              <span>Track Live Progress</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-violet-200 dark:bg-white/10 dark:hover:bg-white/15 text-primaryViolet dark:text-darkCyan font-medium text-xs sm:text-sm border border-slate-200 dark:border-white/10 transition-colors"
            >
              <span>View in My Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-medium text-xs sm:text-sm border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Lodge Another</span>
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
        <div className="inline-flex items-center gap-2 text-xs font-mono text-primaryViolet dark:text-darkPurple font-medium mb-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple" />
          <span>Campus issue reporting</span>
        </div>
        <h1 className={`font-medium text-[#172337] dark:text-[#F8FAFC] mt-1 ${isMobileMode ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
          Report a campus issue
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
          Describe the problem in plain conversational language. ComplainAI automatically determines the category, evaluates priority, and flags duplicates.
        </p>

        {/* Scanned Report Intake & Critical Ranking Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-[#1E2538] dark:to-[#171D2D] border border-violet-200 dark:border-violet-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primaryViolet text-white flex items-center justify-center shrink-0 shadow-xs">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Parse Pasted Report Text
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Extract text from scanned slips or maintenance inspection logs to instantly rank Critical Priority.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowScanDrawer(!showScanDrawer)}
            className="px-3.5 py-2 rounded-xl bg-primaryViolet hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showScanDrawer ? 'Hide Scanner' : 'Open Report Scanner'}</span>
          </button>
        </div>

        {/* Scanned Report Analysis Drawer */}
        {showScanDrawer && (
          <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-[#1A2029] border border-violet-200 dark:border-white/10 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-primaryViolet dark:text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Scanned Document & Incident Slip Text
                </h4>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Supports OCR text, printed incident sheets, and facility logs
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Test Presets:
              </span>
              <button
                type="button"
                onClick={() => {
                  const sample = `INCIDENT REPORT: Science Block B, Lab 104\nLocation: Science Block B - Lab 104\nIssue: Live wire sparking from distribution box with thick black smoke near emergency exit.\nStudents affected: 45\nUrgency: Immediate hazard observed during afternoon laboratory session.`;
                  setScannedText(sample);
                  handleAnalyzeScan(sample);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 text-[11px] font-medium hover:bg-rose-100 transition-colors cursor-pointer"
              >
                ⚡ Live Wire & Smoke (Critical)
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = `CAMPUS HEALTH LOG: Boys Hostel 1\nLocation: Boys Hostel 1 - Wing A\nIssue: Zero water supply and murky brown contaminated water in washroom commodes. Foul sewage smell spreading.\nStudents affected: 120\nDuration: Unresolved for 3 days.`;
                  setScannedText(sample);
                  handleAnalyzeScan(sample);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 text-[11px] font-medium hover:bg-amber-100 transition-colors cursor-pointer"
              >
                🚰 Water Contamination (High)
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = `FACILITY MEMO: Central Library\nLocation: Central Library - Reading Hall\nIssue: Projector screen loose bracket in discussion cubicle. Slight creaking noise when pulled down.\nStudents affected: 2\nUrgency: Routine maintenance request.`;
                  setScannedText(sample);
                  handleAnalyzeScan(sample);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 text-[11px] font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                🔧 Minor Bracket Creak (Low)
              </button>
            </div>

            <textarea
              rows={4}
              value={scannedText}
              onChange={(e) => setScannedText(e.target.value)}
              placeholder="Paste raw OCR extracted text or type the contents of the scanned inspection form..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#151B26] border border-slate-200 dark:border-white/10 text-xs font-mono text-[#172337] dark:text-[#F8FAFC] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 focus:ring-2 focus:ring-violet-200/50"
            />

            {scanError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {scanError}
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                disabled={analyzingScan || !scannedText.trim()}
                onClick={() => handleAnalyzeScan()}
                className="px-4 py-2 rounded-xl bg-primaryViolet hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {analyzingScan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{analyzingScan ? 'Extracting & Ranking...' : 'Analyze & Rank Criticality'}</span>
              </button>
            </div>

            {/* Scan Critical Ranking Result Card */}
            {scanResult && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                scanResult.critical_rank === 'Critical'
                  ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/40'
                  : scanResult.critical_rank === 'High'
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/40'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/40'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      AI Critical Ranking:
                    </span>
                    <PriorityBadge priority={scanResult.critical_rank} />
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      Score: {scanResult.critical_score}/100
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Category: <strong className="text-primaryViolet dark:text-cyan-300">{scanResult.predicted_category}</strong> ({(scanResult.confidence * 100).toFixed(1)}%)
                  </span>
                </div>

                <div className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-black/20 p-2.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                  <div className="font-semibold text-rose-700 dark:text-rose-300 mb-0.5">
                    {scanResult.dispatch_recommendation}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    {scanResult.reasoning}
                  </div>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
                    <strong>Extracted Location:</strong>{' '}
                    {scanResult.extracted_location ? (
                      <span>{scanResult.extracted_location}</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">Not detected — please enter manually in the form</span>
                    )}
                  </div>
                </div>

                {scanResult.detected_hazards && scanResult.detected_hazards.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Detected Hazard Flags:
                    </span>
                    {scanResult.detected_hazards.map((h, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/30 text-rose-800 dark:text-rose-200 font-mono text-[10px] font-semibold">
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleApplyScanToForm}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Apply Extracted Data to Form</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-12 items-start ${isMobileMode ? 'gap-4' : 'gap-8'}`}>
        {/* Main Form (7 cols) */}
        <form onSubmit={handleSubmit} className={`lg:col-span-7 bg-white dark:bg-[#1A2029] rounded-2xl border border-slate-200 dark:border-white/10    ${
          isMobileMode ? 'p-4 space-y-4' : 'p-6 sm:p-8 space-y-6'
        }`}>
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <div className="font-medium text-rose-800 dark:text-rose-200">Submission Notice</div>
                <div className="leading-relaxed">{error}</div>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Complaint Summary Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              aria-label="Report title" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Exposed electrical cables sparking near staircase"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 focus:ring-2 focus:ring-violet-200/50 dark:focus:ring-cyan-500/20 text-sm text-[#172337] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors font-medium"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">A short title helps the campus team understand the issue.</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              aria-label="Detailed description" value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain where it is, what is leaking/sparking/broken, whether it poses physical injury, how many students are affected..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 focus:ring-2 focus:ring-violet-200/50 dark:focus:ring-cyan-500/20 text-sm text-[#172337] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors leading-relaxed font-medium"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Mention any immediate danger, disruption, or people affected.</span>
              <span className="font-mono">{description.length} chars</span>
            </div>
          </div>

          {/* Photo Upload & Gemini AI Vision Analysis */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primaryViolet dark:text-cyan-400" />
                <span>Upload Issue Photo (Gemini AI Vision Analysis)</span>
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Powered by Gemini 3.5 & NLP
              </span>
            </div>

            {!photoBase64 ? (
              <label className="border-2 border-dashed border-slate-300 dark:border-white/15 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primaryViolet dark:hover:border-cyan-400 transition-colors bg-white/50 dark:bg-black/20 text-center">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 text-primaryViolet dark:text-cyan-400 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Click to upload photo</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400"> or drag and drop</span>
                </div>
                <p className="text-[10px] text-slate-400">PNG, JPG, WebP up to 8MB. Gemini will scan and generate a simple report.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-56 flex items-center justify-center bg-black/5 dark:bg-black/40">
                  <img
                    src={photoBase64}
                    alt="Issue preview"
                    className="object-contain max-h-56 w-full rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoBase64(null);
                      setPhotoAnalysis(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Gemini Scanning Indicator / Actions */}
                {analyzingPhoto && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-500/30 text-xs text-primaryViolet dark:text-cyan-300">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Gemini AI is scanning your photo and generating a simple language report...</span>
                  </div>
                )}

                {photoError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
                    {photoError}
                  </div>
                )}

                {photoAnalysis && !analyzingPhoto && photoAnalysis.analysis_status !== 'completed' && (
                  <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        {photoAnalysis.analysis_status === 'malformed'
                          ? 'AI Photo Analysis Returned Incomplete Output'
                          : 'AI Photo Analysis Unavailable'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-200/90">
                      {photoAnalysis.error_message ||
                        'Automated vision analysis is currently unavailable. Your photo remains attached for manual administrator inspection.'}
                    </p>
                  </div>
                )}

                {photoAnalysis && !analyzingPhoto && photoAnalysis.analysis_status === 'completed' && (
                  <div className="p-3.5 rounded-xl bg-violet-50/80 dark:bg-[#1E2538] border border-violet-200 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primaryViolet dark:text-cyan-400" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Gemini Vision Inspection Report
                        </span>
                      </div>
                      {photoAnalysis.model_used && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-violet-200/70 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200">
                          {photoAnalysis.model_used}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-white/70 dark:bg-black/30 p-2.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                      {photoAnalysis.simple_report}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      {photoAnalysis.suggested_department && (
                        <span className="text-slate-600 dark:text-slate-400">Department: <strong className="text-primaryViolet dark:text-cyan-300">{photoAnalysis.suggested_department}</strong></span>
                      )}
                      {photoAnalysis.suggested_department && photoAnalysis.suggested_priority && (
                        <span className="text-slate-400">·</span>
                      )}
                      {photoAnalysis.suggested_priority && (
                        <span className="text-slate-600 dark:text-slate-400">Severity: <strong className="text-rose-600 dark:text-rose-400">{photoAnalysis.suggested_priority}</strong></span>
                      )}
                      {photoAnalysis.is_safety_hazard && (
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                          Hazard Detected
                        </span>
                      )}
                    </div>

                    {photoAnalysis.detected_hazards?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {photoAnalysis.detected_hazards.map((h, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-medium">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleApplyPhotoAnalysis}
                        className="px-3.5 py-1.5 rounded-xl bg-primaryViolet hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Apply AI Report to Form</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Campus Location <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                aria-label="Campus location" value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Academic Block - 2nd Floor, or Boys Hostel 2"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#222A35] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 focus:ring-2 focus:ring-violet-200/50 dark:focus:ring-cyan-500/20 text-sm text-[#172337] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors font-medium"
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
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-[#F2F4F7] dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-primaryViolet dark:text-darkCyan border border-slate-200 dark:border-white/10 transition-colors font-semibold cursor-pointer"
                >
                  {loc.split('-')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Department (2 Cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/10">
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Category</span>
                <span className="text-[10px] text-primaryViolet dark:text-darkCyan font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Auto-Predict
                </span>
              </label>
              <select
                aria-label="Category" value={category}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  if (val === '' && title.trim().length >= 5 && description.trim().length >= 15) {
                    runCategoryPrediction(true);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="">Choose category automatically</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-[#1A2029]">{cat}</option>
                ))}
              </select>

              {/* Automatic Prediction Feedback */}
              {category === '' ? (
                <>
                  {isAutoPredicting && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-primaryViolet dark:text-darkCyan ">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span className="font-semibold text-[11px]">Analyzing text with ComplainAI ML model...</span>
                    </div>
                  )}

                  {!isAutoPredicting && autoPredictedCategory && (
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-primaryViolet dark:text-darkCyan" />
                          <span>AI Predicted Category:</span>
                        </div>
                        {isPredictionStale ? (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Modified
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-medium text-primaryViolet dark:text-darkCyan bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                            {autoConfidence !== null ? `${(autoConfidence * 100).toFixed(1)}% confidence` : 'Classified'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-primaryViolet dark:text-[#F8FAFC]">
                          {autoPredictedCategory}
                        </div>
                        <button
                          type="button"
                          onClick={() => runCategoryPrediction(true)}
                          disabled={isAutoPredicting}
                          className="text-[10px] font-medium text-slate-600 hover:text-primaryViolet dark:text-slate-400 dark:hover:text-darkCyan underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${isAutoPredicting ? 'animate-spin' : ''}`} />
                          <span>{isPredictionStale ? 'Re-evaluate' : 'Re-check'}</span>
                        </button>
                      </div>

                      {autoFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium self-center">Triggers:</span>
                          {autoFeatures.map(f => (
                            <span key={f} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                              +{f}
                            </span>
                          ))}
                        </div>
                      )}

                      {autoIsUncertain && autoUncertaintyNote && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                          {autoUncertaintyNote}
                        </div>
                      )}
                    </div>
                  )}

                  {!isAutoPredicting && autoPredictError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                      <span className="text-[11px]">{autoPredictError}</span>
                      <button
                        type="button"
                        onClick={() => runCategoryPrediction(true)}
                        className="text-[11px] font-medium underline cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {!isAutoPredicting && !autoPredictedCategory && !autoPredictError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple shrink-0" />
                      <span>ComplainAI will auto-classify once title (≥5 chars) & description (≥15 chars) are entered.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/10">
                  <span>Manual selection: <strong className="text-slate-800 dark:text-slate-200">{category}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('');
                      runCategoryPrediction(true);
                    }}
                    className="text-primaryViolet dark:text-darkCyan font-medium hover:underline cursor-pointer"
                  >
                    Reset to Auto
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Department <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                aria-label="Department" value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="">Select if known (or leave blank)</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-white dark:bg-[#1A2029]">{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* People Affected & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brightBlue dark:text-darkCyan" />
                <span>Est. People Affected</span>
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                aria-label="People affected" value={affectedCount}
                onChange={(e) => setAffectedCount(e.target.value)}
                placeholder="e.g. 50 students"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-darkAmber" />
                <span>Issue Duration (Days)</span>
              </label>
              <input
                type="number"
                min="0"
                max="365"
                aria-label="Issue duration in days" value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="e.g. 2 days"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium"
              />
            </div>
          </div>

          {!user && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contact Email <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional, for notification updates)</span>
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="student@college.edu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/10 text-xs text-[#172337] dark:text-[#F8FAFC] font-medium"
              />
            </div>
          )}

          {/* Legacy Browser-Only Drafts Recovery */}
          {legacyDrafts.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Unfiled Browser-Only Drafts Detected (Not Submitted to Server)</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                These older drafts were stored only in your browser and were never assigned a server tracking ID. Recover your text into the form below to submit them properly.
              </p>
              <div className="space-y-1.5">
                {legacyDrafts.map((d) => (
                  <div key={d.public_id} className="flex items-center justify-between gap-2 bg-white/70 dark:bg-black/20 p-2 rounded-lg border border-amber-200/70 dark:border-amber-500/20">
                    <div className="truncate">
                      <span className="font-mono text-[10px] mr-2 opacity-75">[{d.public_id} — local draft]</span>
                      <span className="font-medium">{d.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTitle(d.title);
                          setDescription(d.description);
                          setLocation(d.location);
                          if (d.category) setCategory(d.category);
                          setIdempotencyKey(generateIdempotencyKey());
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium cursor-pointer"
                      >
                        Recover Text
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          dismissLegacyLocalDraft(d.public_id);
                          setLegacyDrafts(getLegacyLocalDrafts(user?.email));
                        }}
                        className="px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-500/40 text-[11px] cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unsent Draft Notice */}
          {hasUnsentDraft && !error && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
              <div>
                <strong>Unsent Draft Restored:</strong> Your previous complaint text was preserved locally and has not been submitted yet.
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-500/40 text-[11px] font-medium shrink-0 cursor-pointer"
              >
                Discard Draft
              </button>
            </div>
          )}

          {/* Action Row Error Display */}
          {error && (
            <div
              ref={errorRef}
              className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3 font-medium animate-in fade-in duration-200"
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="font-medium text-rose-800 dark:text-rose-200">
                  {hasUnsentDraft ? 'Not Submitted — Saved as Unsent Draft' : 'Submission Notice'}
                </div>
                <div className="leading-relaxed">{error}</div>
                {hasUnsentDraft && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Submission</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-500/40 text-[11px] font-medium cursor-pointer"
                    >
                      Discard Draft
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={handleLivePreview}
              disabled={analyzing || submitting || !title.trim() || !description.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-violet-200 dark:hover:bg-violet-900/60 text-primaryViolet dark:text-darkPurple border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primaryViolet dark:text-darkPurple" />
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                  <span>Preview AI Analysis</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primaryViolet text-white font-medium text-xs sm:text-sm   hover:opacity-95 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
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
            <div className="bg-white/95 dark:bg-[#1A2029] rounded-2xl border border-slate-200 dark:border-slate-700   p-6 space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                  <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                  <span>Real-Time Model Analysis</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-primaryViolet dark:text-darkCyan font-medium border border-slate-200 dark:border-white/10">
                  Predicted
                </span>
              </div>

              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Predicted Category</span>
                <div className="text-base font-medium text-[#172337] dark:text-[#F8FAFC] mt-0.5">{livePrediction.category}</div>
                <div className="flex items-center gap-2 pt-1.5">
                  <div className="flex-1 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-100 dark:bg-slate-800 h-full rounded-full transition-colors duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, (livePrediction.confidence || 0) * 100))}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-medium text-primaryViolet dark:text-darkCyan">
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
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Urgency Assessment</span>
                <div className="mt-1 flex items-center gap-2">
                  <PriorityBadge priority={livePrediction.priority || 'Medium'} />
                  <span className="text-xs text-[#172337] dark:text-[#F8FAFC] font-mono font-medium">Score: {livePrediction.score}/100</span>
                </div>
              </div>

              {livePrediction.influential_features && livePrediction.influential_features.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Attributed Feature Tokens
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {livePrediction.influential_features.map((feat) => (
                      <span key={feat} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#E7F4FF] dark:bg-white/5 border border-blue-200 dark:border-cyan-500/30 text-brightBlue dark:text-darkCyan font-medium">
                        +{feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A2029] border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{livePrediction.priorityReason}"
              </div>
            </div>
          ) : (
            <div className="bg-white/95 dark:bg-[#1A2029] rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4  ">
              <div className="flex items-center gap-2 text-[#172337] dark:text-[#F8FAFC] font-medium text-sm">
                <Cpu className="w-4 h-4 text-primaryViolet dark:text-darkPurple" />
                <span>Report analysis</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Click <span className="font-medium text-primaryViolet dark:text-darkPurple">"Preview AI Analysis"</span> to see the suggested category, priority, and reasons before sending your report.
              </p>
              <div className="p-4 rounded-2xl bg-[#F2F4F7] dark:bg-[#1A2029] border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="font-medium text-slate-800 dark:text-slate-200">Evaluated Factors:</div>
                <div>• Suggested category and confidence</div>
                <div>• Safety risks and service disruption</div>
                <div>• People affected and how long the issue has lasted</div>
              </div>
            </div>
          )}

          {/* Human Review Policy */}
          <div className="p-5 rounded-2xl bg-white/95 dark:bg-[#1A2029] border border-slate-200/90 dark:border-white/10   text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-mintGreen dark:text-darkMint" />
              <span>People make the final call</span>
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
