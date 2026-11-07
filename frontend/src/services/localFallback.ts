import {
  User,
  Complaint,
  StatusHistory,
  ClassifyResult,
  PriorityResult,
  AnalyticsSummary,
  ChartDataPoint
} from '../types';

// ==============================================================================
// 1. LOCAL AUTHENTICATION REPOSITORY
// ==============================================================================
const LOCAL_USERS_KEY = 'complainai_local_registered_users';
const LOCAL_CACHED_USER_KEY = 'complainai_cached_user';

interface StoredUserRecord {
  user: User;
  passwordHash: string;
}

export function getLocalUsers(): StoredUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUser(user: User, rawPassword: string): void {
  try {
    const users = getLocalUsers();
    const cleanEmail = user.email.trim().toLowerCase();
    const idx = users.findIndex(u => u.user.email.toLowerCase() === cleanEmail);
    const record: StoredUserRecord = {
      user: {
        ...user,
        email: cleanEmail,
        is_active: true
      },
      passwordHash: btoa(rawPassword)
    };
    if (idx >= 0) {
      users[idx] = record;
    } else {
      users.push(record);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    localStorage.setItem(LOCAL_CACHED_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Could not persist local user record:', err);
  }
}

export function findLocalUser(email: string, rawPassword?: string): User | null {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const users = getLocalUsers();
    const found = users.find(u => u.user.email.toLowerCase() === cleanEmail);
    if (!found) return null;
    if (rawPassword !== undefined) {
      if (found.passwordHash !== btoa(rawPassword)) {
        return null;
      }
    }
    return found.user;
  } catch {
    return null;
  }
}

export function createLocalSessionToken(user: User): string {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    time: Date.now()
  };
  return 'local_jwt_' + btoa(JSON.stringify(payload));
}

export function decodeLocalSessionToken(token: string): User | null {
  if (!token.startsWith('local_jwt_')) return null;
  try {
    const payload = JSON.parse(atob(token.replace('local_jwt_', '')));
    return {
      id: payload.id || 1,
      name: payload.name || payload.email?.split('@')[0] || 'Campus User',
      email: payload.email || '',
      role: (payload.role === 'admin' ? 'admin' : 'user'),
      is_active: true,
      created_at: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(LOCAL_CACHED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_CACHED_USER_KEY);
    }
  } catch {}
}

// ==============================================================================
// 2. CLIENT-SIDE HEURISTIC NLP CLASSIFIER
// ==============================================================================
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Electrical and lighting": [
    "spark", "sparking", "wire", "wires", "wiring", "short circuit", "shock", "electrocution",
    "light", "lights", "lighting", "bulb", "bulbs", "lamp", "tube", "tubelight", "fan",
    "switch", "socket", "power", "blackout", "outage", "electricity", "fuse", "breaker",
    "voltage", "generator", "ac", "air conditioner", "inverter", "cable"
  ],
  "Water supply": [
    "water", "drinking water", "tap", "taps", "pipeline", "pipe", "borewell", "pump",
    "water cut", "zero water", "no water", "overhead tank", "water cooler", "filter", "supply"
  ],
  "Plumbing and sanitation": [
    "leak", "leaking", "choked", "clogged", "toilet", "toilets", "restroom", "washroom",
    "commode", "flush", "sewer", "sewage", "drain", "drainage", "sink", "basin", "foul smell",
    "overflow", "gutter", "blockage", "plumber", "sanitation"
  ],
  "Roads and infrastructure": [
    "pothole", "potholes", "road", "roads", "path", "pavement", "footpath", "sidewalk",
    "gravel", "streetlight", "barrier", "railing", "crack", "wall", "ceiling", "stairs",
    "staircase", "step", "steps", "speed breaker", "gate", "parking"
  ],
  "Classroom and laboratory facilities": [
    "classroom", "projector", "screen", "bench", "desk", "chair", "podium", "blackboard",
    "whiteboard", "marker", "audio", "speaker", "mic", "microphone", "lab", "laboratory",
    "equipment", "microscope", "chemicals", "apparatus", "benchtop"
  ],
  "Internet and IT services": [
    "wifi", "wi-fi", "internet", "ethernet", "lan", "network", "captive portal", "portal",
    "broadband", "router", "speed", "slow internet", "server", "dns", "login page", "computer",
    "desktop", "monitor", "lan wire"
  ],
  "Hostel and accommodation": [
    "hostel", "hostels", "room", "rooms", "warden", "mess", "food", "bed", "mattress",
    "cupboard", "almirah", "door", "window", "lock", "key", "curtain", "corridor", "balcony",
    "resident", "residential"
  ],
  "Cleanliness and waste management": [
    "garbage", "dustbin", "trash", "waste", "litter", "dirty", "clean", "swept", "sweeping",
    "debris", "overflowing dustbins", "unhygienic", "pest", "rodent", "insect", "housekeeping"
  ],
  "Safety and security": [
    "guard", "security", "theft", "stolen", "ragging", "harassment", "stranger", "trespass",
    "trespasser", "cctv", "camera", "fight", "fighting", "violence", "emergency", "fire",
    "smoke", "hazard", "danger", "dangerous", "unlit", "dark corridor"
  ]
};

export function fallbackClassifyText(title: string, description: string): ClassifyResult {
  const combined = `${title} ${description}`.toLowerCase();
  let bestCategory = "Other";
  let maxScore = 0;
  let influentialFeatures: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matched = keywords.filter(kw => combined.includes(kw));
    const score = matched.length;
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
      influentialFeatures = matched.slice(0, 5);
    }
  }

  const confidence = maxScore > 0 ? Math.min(0.96, 0.68 + maxScore * 0.08) : 0.50;
  const is_uncertain = confidence < 0.70;

  const categoryProbabilities: Record<string, number> = {};
  for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
    categoryProbabilities[cat] = cat === bestCategory ? confidence : Math.max(0.01, Math.round(((1 - confidence) / 9) * 100) / 100);
  }

  return {
    predicted_category: bestCategory,
    confidence: Math.round(confidence * 100) / 100,
    influential_features: influentialFeatures.length > 0 ? influentialFeatures : ["general description"],
    category_probabilities: categoryProbabilities,
    is_uncertain,
    uncertainty_note: is_uncertain ? "Low keyword match density; administrator review recommended." : null
  };
}

// ==============================================================================
// 3. CLIENT-SIDE PRIORITY CALCULATION ENGINE
// ==============================================================================
const CRITICAL_SAFETY_KEYWORDS = [
  "sparking", "live wire", "bare wire", "electrocution", "electric shock",
  "fire hazard", "smoke", "gas leak", "chemical spill", "toxic", "ceiling collapse",
  "ceiling falling", "explosion", "biohazard", "padlocked emergency exit",
  "locked fire exit", "structural collapse", "sewage backup"
];

const MODERATE_SAFETY_KEYWORDS = [
  "broken glass", "deep pothole", "skidding", "slipping", "tripping hazard",
  "loose railing", "dark corridor", "unlit", "open drain", "choked commode",
  "murky water", "contaminated water", "trespasser", "theft", "corroded grill"
];

const HIGH_DISRUPTION_KEYWORDS = [
  "entire floor", "entire block", "entire hostel", "campus-wide", "outage",
  "water cut", "zero water", "portal down", "blackout", "exam hall",
  "midterm", "halting lab", "cannot shower", "overflowing", "flooding", "smoke near exit"
];

const MODERATE_DISRUPTION_KEYWORDS = [
  "slow internet", "flickering", "leaking tap", "air conditioner", "projector",
  "fan wobbling", "washing machine", "dustbins overflowing", "litter"
];

export function fallbackPredictPriority(data: {
  title: string;
  description: string;
  location?: string;
  affected_count?: number;
  duration_days?: number;
}): PriorityResult {
  const combined = `${data.title} ${data.description} ${data.location || ''}`.toLowerCase();

  // 1. Safety Risk (0-40)
  let safetyScore = 0;
  let safetyReason = "No acute physical or biological safety hazard detected.";
  let isEmergency = false;

  for (const kw of CRITICAL_SAFETY_KEYWORDS) {
    if (combined.includes(kw)) {
      safetyScore = 40;
      safetyReason = `Critical safety risk identified: reports '${kw}' requiring immediate emergency intervention.`;
      isEmergency = true;
      break;
    }
  }

  if (!isEmergency) {
    for (const kw of MODERATE_SAFETY_KEYWORDS) {
      if (combined.includes(kw)) {
        safetyScore = 25;
        safetyReason = `Moderate safety concern: mentions '${kw}' with potential injury or sanitation risk.`;
        break;
      }
    }
  }

  if (safetyScore === 0 && ["broken", "cracked", "stuck", "smell", "loose"].some(w => combined.includes(w))) {
    safetyScore = 10;
    safetyReason = "Minor safety or structural risk indicated.";
  }

  // 2. Disruption Severity (0-25)
  let disruptionScore = 8;
  let disruptionReason = "Localized issue affecting individual apparatus or isolated setting.";

  for (const kw of HIGH_DISRUPTION_KEYWORDS) {
    if (combined.includes(kw)) {
      disruptionScore = 24;
      disruptionReason = `Major operational impact: '${kw}' severely interrupts academic or residential activities.`;
      break;
    }
  }

  if (disruptionScore === 8) {
    for (const kw of MODERATE_DISRUPTION_KEYWORDS) {
      if (combined.includes(kw)) {
        disruptionScore = 15;
        disruptionReason = `Noticeable service impairment: '${kw}' causes daily inconvenience.`;
        break;
      }
    }
  }

  // 3. People Affected (0-20)
  const count = data.affected_count || 1;
  let peopleScore = 5;
  let peopleReason = `Localized impact affecting approximately ${count} user(s).`;

  if (count >= 100) {
    peopleScore = 20;
    peopleReason = `Large community impact: explicitly affects ${count}+ individuals.`;
  } else if (count >= 30) {
    peopleScore = 15;
    peopleReason = `Substantial group impact: affects ${count} people.`;
  } else if (count >= 5) {
    peopleScore = 10;
    peopleReason = `Multiple individuals affected (${count} people).`;
  }

  // 4. Duration (0-15)
  const days = data.duration_days || 0;
  let durationScore = 0;
  let durationReason = "Fresh issue reported within the initial 24 hours.";

  if (days >= 7) {
    durationScore = 15;
    durationReason = `Prolonged unresolved issue: persisting for ${days} days (>1 week escalation).`;
  } else if (days >= 3) {
    durationScore = 10;
    durationReason = `Persistent issue unresolved for ${days} consecutive days.`;
  } else if (days >= 1) {
    durationScore = 5;
    durationReason = `Ongoing issue spanning ${days} day(s).`;
  }

  const totalScore = safetyScore + disruptionScore + peopleScore + durationScore;

  let recommendedPriority: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';

  if (isEmergency || totalScore >= 70) {
    recommendedPriority = 'Critical';
  } else if (totalScore >= 50) {
    recommendedPriority = 'High';
  } else if (totalScore >= 30) {
    recommendedPriority = 'Medium';
  }

  const reasoning = [safetyReason, disruptionReason, peopleReason, durationReason].join(' ');

  return {
    recommended_priority: recommendedPriority,
    score: totalScore,
    reasoning,
    requires_immediate_review: isEmergency || recommendedPriority === 'Critical',
    factors: [
      { factor: "Safety Risk", points: safetyScore, max_points: 40, reason: safetyReason },
      { factor: "Disruption Severity", points: disruptionScore, max_points: 25, reason: disruptionReason },
      { factor: "Affected Population", points: peopleScore, max_points: 20, reason: peopleReason },
      { factor: "Duration Persistence", points: durationScore, max_points: 15, reason: durationReason }
    ]
  };
}

// ==============================================================================
// 4. LOCAL COMPLAINTS REPOSITORY (WITH DEFAULT SEED TICKETS)
// ==============================================================================
const LOCAL_COMPLAINTS_KEY = 'complainai_local_complaints';
const LOCAL_HISTORY_KEY = 'complainai_local_history';

const INITIAL_DEMO_COMPLAINTS: Complaint[] = [
  {
    id: 1,
    public_id: "RX-2026-ELE001",
    user_id: 2,
    user_email: "student@complainai.ai",
    title: "Exposed electrical wiring sparking near staircase",
    description: "Exposed live wires hanging from the ceiling near the staircase, sparking intermittently when the AC turns on. Severe electrocution danger.",
    location: "Main Academic Block - 2nd Floor",
    category: "Electrical and lighting",
    predicted_category: "Electrical and lighting",
    classification_confidence: 0.94,
    priority_score: 85,
    predicted_priority: "Critical",
    final_priority: "Critical",
    priority_explanation: "Critical safety hazard identified: exposed live wires with sparking.",
    assigned_department: "Electrical Maintenance Division",
    status: "In Progress",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    public_id: "RX-2026-WAT002",
    user_id: 2,
    user_email: "student@complainai.ai",
    title: "No running water in hostel floor washrooms",
    description: "There has been zero tap water supply on the 3rd floor of hostel 2 since yesterday morning. Students cannot shower or use sanitation facilities.",
    location: "Boys Hostel 2 - 3rd Floor",
    category: "Water supply",
    predicted_category: "Water supply",
    classification_confidence: 0.91,
    priority_score: 64,
    predicted_priority: "High",
    final_priority: "High",
    priority_explanation: "Large student hostel disruption with zero tap water supply.",
    assigned_department: "Water Supply & Plumbing Works",
    status: "Assigned",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 3,
    public_id: "RX-2026-CLS005",
    user_id: 2,
    user_email: "student@complainai.ai",
    title: "Classroom ceiling projector HDMI audio intermittent distortion",
    description: "The ceiling mounted projector in Room 301 frequently drops HDMI audio sync during lectures and emits high pitched whining noise.",
    location: "Science Block B - Room 301",
    category: "Classroom and laboratory facilities",
    predicted_category: "Classroom and laboratory facilities",
    classification_confidence: 0.88,
    priority_score: 38,
    predicted_priority: "Medium",
    final_priority: "Medium",
    priority_explanation: "Noticeable lecture apparatus impairment affecting academic delivery.",
    assigned_department: "Audio-Visual & Classroom Support",
    status: "Resolved",
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export function getLocalComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMPLAINTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(INITIAL_DEMO_COMPLAINTS));
      return INITIAL_DEMO_COMPLAINTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_COMPLAINTS;
  }
}

export function saveLocalComplaint(complaint: Complaint): void {
  try {
    const list = getLocalComplaints();
    const idx = list.findIndex(c => c.public_id === complaint.public_id);
    if (idx >= 0) {
      list[idx] = complaint;
    } else {
      list.unshift(complaint);
    }
    localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save local complaint:', err);
  }
}

export function createLocalComplaint(data: {
  title: string;
  description: string;
  location: string;
  category?: string | null;
  assigned_department?: string | null;
  affected_count?: number | null;
  duration_days?: number | null;
  user_email?: string | null;
}): Complaint {
  const classification = fallbackClassifyText(data.title, data.description);
  const priority = fallbackPredictPriority({
    title: data.title,
    description: data.description,
    location: data.location,
    affected_count: data.affected_count || 1,
    duration_days: data.duration_days || 0
  });

  const catCode = (data.category || classification.predicted_category || "GEN").slice(0, 3).toUpperCase();
  const randNum = Math.floor(100 + Math.random() * 900);
  const publicId = `CMP-2026-${catCode}${randNum}`;

  const complaint: Complaint = {
    id: Date.now(),
    public_id: publicId,
    user_id: 1,
    user_email: data.user_email || "student@complainai.ai",
    title: data.title,
    description: data.description,
    location: data.location,
    category: data.category || classification.predicted_category,
    predicted_category: classification.predicted_category,
    classification_confidence: classification.confidence,
    priority_score: priority.score,
    predicted_priority: priority.recommended_priority,
    final_priority: priority.recommended_priority,
    priority_explanation: priority.reasoning,
    assigned_department: data.assigned_department || "General Administration & Logistics",
    status: "Submitted",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  saveLocalComplaint(complaint);

  // Add initial history
  recordLocalHistory(publicId, {
    previous_status: null,
    new_status: "Submitted",
    note: "Complaint submitted successfully via ComplainAI portal.",
    changed_by: data.user_email || "Student Author"
  });

  return complaint;
}

export function recordLocalHistory(
  publicId: string,
  history: {
    previous_status: string | null;
    new_status: string;
    note?: string | null;
    changed_by?: string;
  }
): void {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const store: Record<string, StatusHistory[]> = raw ? JSON.parse(raw) : {};
    if (!store[publicId]) store[publicId] = [];

    store[publicId].push({
      id: Date.now(),
      complaint_id: 1,
      previous_status: history.previous_status,
      new_status: history.new_status,
      note: history.note || `Status transitioned to ${history.new_status}`,
      changed_by: history.changed_by || 'System Operator',
      created_at: new Date().toISOString()
    });

    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Failed to record local status history:', err);
  }
}

export function getLocalHistory(publicId: string): StatusHistory[] {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const store: Record<string, StatusHistory[]> = raw ? JSON.parse(raw) : {};
    if (store[publicId] && store[publicId].length > 0) {
      return store[publicId];
    }
  } catch {}

  // Fallback demo history for known tickets
  return [
    {
      id: 1,
      complaint_id: 1,
      previous_status: null,
      new_status: "Submitted",
      note: "Complaint lodged via student interface.",
      changed_by: "Student Reporter",
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 2,
      complaint_id: 1,
      previous_status: "Submitted",
      new_status: "Under Review",
      note: "ComplainAI AI triage flagged priority score and safety indicators.",
      changed_by: "Campus Facility System",
      created_at: new Date(Date.now() - 43200000).toISOString()
    }
  ];
}

export function computeLocalAnalytics(): AnalyticsSummary {
  const complaints = getLocalComplaints();
  const total = complaints.length;
  const open = complaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress' || c.status === 'Assigned').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;
  const critical = complaints.filter(c => c.final_priority === 'Critical').length;
  const high = complaints.filter(c => c.final_priority === 'High' || c.final_priority === 'Critical').length;

  return {
    total_complaints: total,
    open_complaints: open,
    in_progress_complaints: inProgress,
    resolved_complaints: resolved,
    high_critical_complaints: high,
    critical_complaints: critical,
    avg_resolution_hours: 18.4
  };
}
