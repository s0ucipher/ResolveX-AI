export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  firebase_uid?: string | null;
}

export interface StatusHistory {
  id: number;
  complaint_id: number;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  changed_by: string;
  created_at: string;
}

export interface Complaint {
  id: number;
  public_id: string;
  user_id: number | null;
  user_email: string | null;
  title: string;
  description: string;
  location: string;
  category: string;
  predicted_category: string;
  classification_confidence: number | null;
  priority_score: number;
  predicted_priority: 'Critical' | 'High' | 'Medium' | 'Low';
  final_priority: 'Critical' | 'High' | 'Medium' | 'Low';
  priority_explanation: string;
  assigned_department: string | null;
  status: 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected' | 'Reopened';
  rejection_reason?: string | null;
  resolution_notes?: string | null;
  photo_url?: string | null;
  photo_analysis?: string | null;
  resolution_photo_url?: string | null;
  resolution_quality_status?: 'PROPERLY_DONE' | 'BADLY_DONE' | string | null;
  resolution_quality_report?: string | null;
  resolution_quality_score?: number | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  history?: StatusHistory[];
}

export interface PriorityFactorItem {
  factor: string;
  points: number;
  max_points: number;
  reason: string;
}

export interface PriorityResult {
  recommended_priority: 'Critical' | 'High' | 'Medium' | 'Low';
  score: number;
  factors: PriorityFactorItem[];
  reasoning: string;
  requires_immediate_review: boolean;
}

export interface ClassifyResult {
  predicted_category: string;
  confidence: number;
  is_uncertain: boolean;
  uncertainty_note: string | null;
  influential_features: string[];
  category_probabilities: Record<string, number>;
}

export interface DuplicateCandidate {
  complaint_id: number;
  public_id: string;
  title: string;
  category: string;
  location: string;
  status: string;
  similarity_score: number;
  explanation: string;
}

export interface ScannedReportResult {
  extracted_title: string;
  extracted_description: string;
  extracted_location?: string;
  extracted_affected_count?: number;
  predicted_category: string;
  confidence: number;
  critical_rank: 'Critical' | 'High' | 'Medium' | 'Low';
  critical_score: number;
  is_acute_emergency: boolean;
  detected_hazards: string[];
  dispatch_recommendation: string;
  factors: PriorityFactorItem[];
  reasoning: string;
}

export interface AnalyticsSummary {
  total_complaints: number;
  open_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
  high_critical_complaints: number;
  critical_complaints: number;
  avg_resolution_hours: number | null;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  percentage?: number;
}

export const CATEGORIES = [
  "Electrical and lighting",
  "Water supply",
  "Plumbing and sanitation",
  "Roads and infrastructure",
  "Classroom and laboratory facilities",
  "Internet and IT services",
  "Hostel and accommodation",
  "Cleanliness and waste management",
  "Safety and security",
  "Other"
];

export const DEPARTMENTS = [
  "Electrical Maintenance Division",
  "Water Supply & Plumbing Works",
  "Civil Infrastructure & Roads",
  "Campus Sanitation & Housekeeping",
  "IT Infrastructure & Network Cell",
  "Audio-Visual & Classroom Support",
  "Hostel Affairs & Maintenance",
  "Campus Security & Safety Office",
  "General Administration & Logistics",
  "Others"
];

export const STATUS_LIST = [
  "Submitted",
  "Under Review",
  "Assigned",
  "In Progress",
  "Resolved",
  "Rejected",
  "Reopened"
];

export interface PhotoAnalysisResult {
  analysis_status: 'completed' | 'unavailable' | 'malformed' | string;
  error_message?: string | null;
  suggested_title?: string | null;
  simple_report?: string | null;
  suggested_department?: string | null;
  suggested_priority?: 'Critical' | 'High' | 'Medium' | 'Low' | null;
  is_safety_hazard?: boolean | null;
  detected_hazards: string[];
  recommended_action?: string | null;
  model_used?: string | null;
}

export interface WorkVerificationChecklistItem {
  item: string;
  passed: boolean;
  note: string;
}

export interface WorkVerificationResult {
  verification_status: 'completed' | 'unavailable' | 'malformed' | string;
  error_message?: string | null;
  verdict?: 'PROPERLY_DONE' | 'BADLY_DONE' | null;
  quality_score?: number | null;
  verdict_headline?: string | null;
  detailed_report?: string | null;
  checklist: WorkVerificationChecklistItem[];
  requires_rework?: boolean | null;
  manager_recommendation?: string | null;
  model_used?: string | null;
}

