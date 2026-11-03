import {
  User,
  Complaint,
  StatusHistory,
  ClassifyResult,
  PriorityResult,
  DuplicateCandidate,
  AnalyticsSummary,
  ChartDataPoint
} from '../types';

const rawBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('complainai_token') || localStorage.getItem('resolvex_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // --- Auth ---
  async login(email: string, password: string):Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async register(name: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // --- Complaints ---
  async submitComplaint(data: {
    title: string;
    description: string;
    location: string;
    category?: string | null;
    assigned_department?: string | null;
    affected_count?: number | null;
    duration_days?: number | null;
    user_email?: string | null;
  }): Promise<Complaint> {
    const res = await fetch(`${API_BASE}/api/complaints`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getMyComplaints(): Promise<Complaint[]> {
    const res = await fetch(`${API_BASE}/api/complaints`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getComplaint(publicId: string): Promise<Complaint> {
    const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(publicId)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getComplaintHistory(publicId: string): Promise<StatusHistory[]> {
    const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(publicId)}/history`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // --- AI ---
  async classifyText(title: string, description: string): Promise<ClassifyResult> {
    const res = await fetch(`${API_BASE}/api/ai/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    return handleResponse(res);
  },

  async predictPriority(data: {
    title: string;
    description: string;
    location?: string;
    affected_count?: number;
    duration_days?: number;
  }): Promise<PriorityResult> {
    const res = await fetch(`${API_BASE}/api/ai/predict-priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getModelInfo(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/ai/model-info`);
    return handleResponse(res);
  },

  // --- Admin ---
  async listAdminComplaints(params: {
    query?: string;
    category?: string;
    priority?: string;
    status?: string;
    department?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; offset: number; limit: number; items: Complaint[] }> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.append('query', params.query);
    if (params.category) searchParams.append('category', params.category);
    if (params.priority) searchParams.append('priority', params.priority);
    if (params.status) searchParams.append('status', params.status);
    if (params.department) searchParams.append('department', params.department);
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.offset !== undefined) searchParams.append('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/api/admin/complaints?${searchParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateStatus(
    publicId: string,
    payload: { status: string; note?: string; rejection_reason?: string; resolution_notes?: string }
  ): Promise<Complaint> {
    const res = await fetch(`${API_BASE}/api/admin/complaints/${encodeURIComponent(publicId)}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async overrideCategory(publicId: string, category: string, reason?: string): Promise<Complaint> {
    const res = await fetch(`${API_BASE}/api/admin/complaints/${encodeURIComponent(publicId)}/category`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ category, reason }),
    });
    return handleResponse(res);
  },

  async overridePriority(publicId: string, priority: string, reason?: string): Promise<Complaint> {
    const res = await fetch(`${API_BASE}/api/admin/complaints/${encodeURIComponent(publicId)}/priority`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ priority, reason }),
    });
    return handleResponse(res);
  },

  async assignDepartment(publicId: string, department: string, note?: string): Promise<Complaint> {
    const res = await fetch(`${API_BASE}/api/admin/complaints/${encodeURIComponent(publicId)}/assign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ department, note }),
    });
    return handleResponse(res);
  },

  async getDuplicates(publicId: string): Promise<DuplicateCandidate[]> {
    const res = await fetch(`${API_BASE}/api/admin/complaints/${encodeURIComponent(publicId)}/duplicates`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // --- Analytics ---
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const res = await fetch(`${API_BASE}/api/analytics/summary`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getCategoriesDistribution(): Promise<ChartDataPoint[]> {
    const res = await fetch(`${API_BASE}/api/analytics/categories`);
    return handleResponse(res);
  },

  async getStatusesDistribution(): Promise<ChartDataPoint[]> {
    const res = await fetch(`${API_BASE}/api/analytics/statuses`);
    return handleResponse(res);
  },

  async getPrioritiesDistribution(): Promise<ChartDataPoint[]> {
    const res = await fetch(`${API_BASE}/api/analytics/priorities`);
    return handleResponse(res);
  },

  async getLocationsDistribution(): Promise<ChartDataPoint[]> {
    const res = await fetch(`${API_BASE}/api/analytics/locations`);
    return handleResponse(res);
  },

  // --- Health Check ---
  async getHealth(): Promise<{ status: string; service?: string; classifier_status?: string }> {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse(res);
  }
};

