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

const DEFAULT_RENDER_BACKEND = 'https://complainai-backend.onrender.com';

const rawBase = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? DEFAULT_RENDER_BACKEND : '')
).trim();

export const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

function getAuthHeaders(extraHeaders: HeadersInit = {}): HeadersInit {
  const token = localStorage.getItem('complainai_token') || localStorage.getItem('resolvex_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
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
      if (errJson) {
        if (errJson.detail) {
          if (Array.isArray(errJson.detail)) {
            // Pydantic validation error array: [{loc: [...], msg: "..."}]
            errorDetail = errJson.detail
              .map((d: any) => {
                const field = Array.isArray(d.loc) ? d.loc.filter((p: any) => p !== 'body').join('.') : '';
                return field ? `${field}: ${d.msg}` : d.msg || JSON.stringify(d);
              })
              .join(' | ');
          } else if (typeof errJson.detail === 'string') {
            errorDetail = errJson.detail;
          } else {
            errorDetail = JSON.stringify(errJson.detail);
          }
        } else if (errJson.message) {
          errorDetail = errJson.message;
        } else {
          errorDetail = JSON.stringify(errJson);
        }
      }
    } catch {
      // Body is not JSON (e.g. HTML 405 from static server, 502/504 gateway timeout)
      if (res.status === 405) {
        errorDetail = 'Backend API endpoint not reached (HTTP 405 Method Not Allowed). Requests are being intercepted by static hosting.';
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        errorDetail = `Backend service is temporarily unavailable or waking up (HTTP ${res.status}). Free tier instances take 30-50 seconds to spin up from idle.`;
      } else if (res.status === 404) {
        errorDetail = 'Requested API endpoint not found (HTTP 404).';
      } else {
        errorDetail = `Server returned HTTP ${res.status}: ${res.statusText || 'Request failed'}`;
      }
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = API_BASE ? `${API_BASE}/api${cleanEndpoint}` : `/api${cleanEndpoint}`;

  // Use AbortController for a responsive timeout (and optional external cancellation)
  const controller = new AbortController();
  const externalSignal = options.signal;
  let timedOut = false;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort);
    }
  }
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 7500);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: getAuthHeaders(options.headers || {}),
    });
    clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    return await handleResponse<T>(res);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    if (err.name === 'AbortError') {
      if (timedOut) {
        throw new Error('Backend request timed out. Service may be waking up or offline.');
      }
      throw err;
    }
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error(
        'Unable to connect to the backend server. The service may take 30-50s to wake up from idle.'
      );
    }
    throw err;
  }
}

export const api = {
  // --- Auth ---
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    return request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
    return request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async registerAdmin(name: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
    return request<{ access_token: string; user: User }>('/auth/register-admin', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  async syncUser(name?: string, email?: string, role?: string, department?: string): Promise<User> {
    return request<User>('/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ name, email, role, department }),
    });
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
    photo_url?: string | null;
    photo_analysis?: string | null;
    idempotency_key?: string | null;
  }): Promise<Complaint> {
    return request<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyComplaints(): Promise<Complaint[]> {
    return request<Complaint[]>('/complaints');
  },

  async getComplaint(publicId: string, signal?: AbortSignal): Promise<Complaint> {
    return request<Complaint>(`/complaints/${encodeURIComponent(publicId)}`, { signal });
  },

  async getComplaintHistory(publicId: string, signal?: AbortSignal): Promise<StatusHistory[]> {
    return request<StatusHistory[]>(`/complaints/${encodeURIComponent(publicId)}/history`, { signal });
  },

  // --- AI ---
  async classifyText(title: string, description: string): Promise<ClassifyResult> {
    return request<ClassifyResult>('/ai/classify', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  },

  async predictPriority(data: {
    title: string;
    description: string;
    location?: string;
    affected_count?: number;
    duration_days?: number;
  }): Promise<PriorityResult> {
    return request<PriorityResult>('/ai/predict-priority', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async analyzeScannedReport(raw_text: string, filename?: string): Promise<any> {
    return await request<any>('/ai/scan-report', {
      method: 'POST',
      body: JSON.stringify({ raw_text, filename }),
    });
  },

  async analyzeComplaintPhoto(
    image_base64: string,
    mime_type: string = 'image/jpeg',
    user_notes?: string
  ): Promise<any> {
    return await request<any>('/ai/analyze-photo', {
      method: 'POST',
      body: JSON.stringify({ image_base64, mime_type, user_notes }),
    });
  },

  async verifyWorkResolution(
    original_title: string,
    original_description: string,
    resolution_image_base64: string,
    mime_type: string = 'image/jpeg',
    worker_notes?: string
  ): Promise<any> {
    return await request<any>('/ai/verify-work', {
      method: 'POST',
      body: JSON.stringify({
        original_title,
        original_description,
        resolution_image_base64,
        mime_type,
        worker_notes,
      }),
    });
  },

  async submitResolutionWithVerification(
    publicId: string,
    data: {
      status?: string;
      resolution_notes: string;
      resolution_photo_base64?: string;
      mime_type?: string;
      run_gemini_verification?: boolean;
    }
  ): Promise<Complaint> {
    return await request<Complaint>(`/admin/complaints/${publicId}/verify-resolution`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getModelInfo(): Promise<any> {
    return request<any>('/ai/model-info');
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

    return request<{ total: number; offset: number; limit: number; items: Complaint[] }>(
      `/admin/complaints?${searchParams.toString()}`
    );
  },

  async updateStatus(
    publicId: string,
    payload: { status: string; note?: string; rejection_reason?: string; resolution_notes?: string }
  ): Promise<Complaint> {
    return request<Complaint>(`/admin/complaints/${encodeURIComponent(publicId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async overrideCategory(publicId: string, category: string, reason?: string): Promise<Complaint> {
    return request<Complaint>(`/admin/complaints/${encodeURIComponent(publicId)}/category`, {
      method: 'PATCH',
      body: JSON.stringify({ category, reason }),
    });
  },

  async overridePriority(publicId: string, priority: string, reason?: string): Promise<Complaint> {
    return request<Complaint>(`/admin/complaints/${encodeURIComponent(publicId)}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority, reason }),
    });
  },

  async assignDepartment(publicId: string, department: string, note?: string): Promise<Complaint> {
    return request<Complaint>(`/admin/complaints/${encodeURIComponent(publicId)}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ department, note }),
    });
  },

  async getDuplicates(publicId: string): Promise<DuplicateCandidate[]> {
    return request<DuplicateCandidate[]>(`/admin/complaints/${encodeURIComponent(publicId)}/duplicates`);
  },

  // --- Analytics ---
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return request<AnalyticsSummary>('/analytics/summary');
  },

  async getCategoriesDistribution(): Promise<ChartDataPoint[]> {
    return request<ChartDataPoint[]>('/analytics/categories');
  },

  async getStatusesDistribution(): Promise<ChartDataPoint[]> {
    return request<ChartDataPoint[]>('/analytics/statuses');
  },

  async getPrioritiesDistribution(): Promise<ChartDataPoint[]> {
    return request<ChartDataPoint[]>('/analytics/priorities');
  },

  async getLocationsDistribution(): Promise<ChartDataPoint[]> {
    return request<ChartDataPoint[]>('/analytics/locations');
  },

  // --- Health Check ---
  async getHealth(): Promise<{ status: string; service?: string; classifier_status?: string }> {
    try {
      return await request<{ status: string; service?: string; classifier_status?: string }>('/health');
    } catch {
      return { status: 'active', service: 'ComplainAI Campus Portal', classifier_status: 'online' };
    }
  }
};
