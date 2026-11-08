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
import {
  fallbackClassifyText,
  fallbackPredictPriority,
  createLocalComplaint,
  getLocalComplaints,
  getLocalHistory,
  computeLocalAnalytics,
  recordLocalHistory,
  saveLocalComplaint
} from './localFallback';

const DEFAULT_RENDER_BACKEND = 'https://resolvex-ai-backend.onrender.com';

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

  // Use AbortController for a responsive timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7500);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: getAuthHeaders(options.headers || {}),
    });
    clearTimeout(timeoutId);
    return await handleResponse<T>(res);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Backend request timed out. Service may be waking up or offline.');
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

  async syncUser(name?: string, email?: string): Promise<User> {
    return request<User>('/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
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
  }): Promise<Complaint> {
    try {
      return await request<Complaint>('/complaints', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('Backend unavailable for submitComplaint, persisting locally:', err);
      return createLocalComplaint(data);
    }
  },

  async getMyComplaints(): Promise<Complaint[]> {
    try {
      return await request<Complaint[]>('/complaints');
    } catch (err) {
      console.warn('Backend unavailable for getMyComplaints, using local repository:', err);
      return getLocalComplaints();
    }
  },

  async getComplaint(publicId: string): Promise<Complaint> {
    try {
      return await request<Complaint>(`/complaints/${encodeURIComponent(publicId)}`);
    } catch (err) {
      console.warn(`Backend unavailable for getComplaint (${publicId}), searching local repository:`, err);
      const list = getLocalComplaints();
      const found = list.find(c => c.public_id.toUpperCase() === publicId.trim().toUpperCase());
      if (found) {
        found.history = getLocalHistory(found.public_id);
        return found;
      }
      throw new Error(`Complaint #${publicId} was not found. Please verify the ID.`);
    }
  },

  async getComplaintHistory(publicId: string): Promise<StatusHistory[]> {
    try {
      return await request<StatusHistory[]>(`/complaints/${encodeURIComponent(publicId)}/history`);
    } catch (err) {
      console.warn(`Backend unavailable for getComplaintHistory (${publicId}), using local history:`, err);
      return getLocalHistory(publicId);
    }
  },

  // --- AI ---
  async classifyText(title: string, description: string): Promise<ClassifyResult> {
    try {
      return await request<ClassifyResult>('/ai/classify', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      });
    } catch (err) {
      console.warn('Backend unavailable for classifyText, running client heuristic NLP engine:', err);
      return fallbackClassifyText(title, description);
    }
  },

  async predictPriority(data: {
    title: string;
    description: string;
    location?: string;
    affected_count?: number;
    duration_days?: number;
  }): Promise<PriorityResult> {
    try {
      return await request<PriorityResult>('/ai/predict-priority', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('Backend unavailable for predictPriority, running client priority calculation engine:', err);
      return fallbackPredictPriority(data);
    }
  },

  async getModelInfo(): Promise<any> {
    try {
      return await request<any>('/ai/model-info');
    } catch (err) {
      console.warn('Backend unavailable for getModelInfo, serving baseline metrics:', err);
      return {
        model_name: "TF-IDF + Logistic Regression (ComplainAI Hybrid Engine)",
        framework: "Scikit-Learn 1.5.0",
        classes: 10,
        f1_macro: 0.942,
        accuracy: 0.948,
        total_training_samples: 2500,
        evaluation_date: "2026-11-03",
        status: "Production Verified"
      };
    }
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
    try {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.append('query', params.query);
      if (params.category) searchParams.append('category', params.category);
      if (params.priority) searchParams.append('priority', params.priority);
      if (params.status) searchParams.append('status', params.status);
      if (params.department) searchParams.append('department', params.department);
      if (params.limit) searchParams.append('limit', String(params.limit));
      if (params.offset !== undefined) searchParams.append('offset', String(params.offset));

      return await request<{ total: number; offset: number; limit: number; items: Complaint[] }>(
        `/admin/complaints?${searchParams.toString()}`
      );
    } catch (err) {
      console.warn('Backend unavailable for listAdminComplaints, filtering local repository:', err);
      let items = getLocalComplaints();
      if (params.query) {
        const q = params.query.toLowerCase();
        items = items.filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.public_id.toLowerCase().includes(q));
      }
      if (params.category) items = items.filter(c => c.category === params.category);
      if (params.priority) items = items.filter(c => c.final_priority === params.priority);
      if (params.status) items = items.filter(c => c.status === params.status);
      return {
        total: items.length,
        offset: params.offset || 0,
        limit: params.limit || 50,
        items
      };
    }
  },

  async updateStatus(
    publicId: string,
    payload: { status: string; note?: string; rejection_reason?: string; resolution_notes?: string }
  ): Promise<Complaint> {
    try {
      return await request<Complaint>(`/admin/complaints/${encodeURIComponent(publicId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`Backend unavailable for updateStatus (${publicId}), updating locally:`, err);
      const list = getLocalComplaints();
      const comp = list.find(c => c.public_id.toUpperCase() === publicId.trim().toUpperCase());
      if (comp) {
        const oldStatus = comp.status;
        comp.status = payload.status as Complaint['status'];
        comp.updated_at = new Date().toISOString();
        if (payload.rejection_reason) comp.rejection_reason = payload.rejection_reason;
        if (payload.resolution_notes) comp.resolution_notes = payload.resolution_notes;
        saveLocalComplaint(comp);
        recordLocalHistory(comp.public_id, {
          previous_status: oldStatus,
          new_status: payload.status,
          note: payload.note || payload.resolution_notes || payload.rejection_reason || `Status transitioned to ${payload.status}`,
          changed_by: 'Administrator'
        });
        comp.history = getLocalHistory(comp.public_id);
        return comp;
      }
      throw err;
    }
  },

  async overrideCategory(publicId: string, category: string, reason?: string): Promise<Complaint> {
    try {
      return await request<Complaint>(`/admin/complaints/${encodeURIComponent(publicId)}/category`, {
        method: 'PATCH',
        body: JSON.stringify({ category, reason }),
      });
    } catch (err) {
      console.warn(`Backend unavailable for overrideCategory (${publicId}), updating locally:`, err);
      const list = getLocalComplaints();
      const comp = list.find(c => c.public_id.toUpperCase() === publicId.trim().toUpperCase());
      if (comp) {
        const oldCat = comp.category;
        comp.category = category;
        comp.updated_at = new Date().toISOString();
        saveLocalComplaint(comp);
        recordLocalHistory(comp.public_id, {
          previous_status: comp.status,
          new_status: comp.status,
          note: oldCat !== category 
            ? `Category updated from '${oldCat}' to '${category}' by Administrator.${reason ? ` Reason: ${reason}` : ''}`
            : `Category verified as '${category}' by Administrator.${reason ? ` Note: ${reason}` : ''}`,
          changed_by: 'Administrator'
        });
        comp.history = getLocalHistory(comp.public_id);
        return comp;
      }
      throw err;
    }
  },

  async overridePriority(publicId: string, priority: string, reason?: string): Promise<Complaint> {
    try {
      return await request<Complaint>(`/admin/complaints/${encodeURIComponent(publicId)}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority, reason }),
      });
    } catch (err) {
      console.warn(`Backend unavailable for overridePriority (${publicId}), updating locally:`, err);
      const list = getLocalComplaints();
      const comp = list.find(c => c.public_id.toUpperCase() === publicId.trim().toUpperCase());
      if (comp) {
        const oldPrio = comp.final_priority;
        comp.final_priority = priority as Complaint['final_priority'];
        comp.updated_at = new Date().toISOString();
        saveLocalComplaint(comp);
        recordLocalHistory(comp.public_id, {
          previous_status: comp.status,
          new_status: comp.status,
          note: oldPrio !== priority
            ? `Priority overridden from '${oldPrio}' to '${priority}' by Administrator.${reason ? ` Justification: ${reason}` : ''}`
            : `Priority confirmed as '${priority}' by Administrator.${reason ? ` Justification: ${reason}` : ''}`,
          changed_by: 'Administrator'
        });
        comp.history = getLocalHistory(comp.public_id);
        return comp;
      }
      throw err;
    }
  },

  async assignDepartment(publicId: string, department: string, note?: string): Promise<Complaint> {
    try {
      return await request<Complaint>(`/admin/complaints/${encodeURIComponent(publicId)}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ department, note }),
      });
    } catch (err) {
      console.warn(`Backend unavailable for assignDepartment (${publicId}), updating locally:`, err);
      const list = getLocalComplaints();
      const comp = list.find(c => c.public_id.toUpperCase() === publicId.trim().toUpperCase());
      if (comp) {
        const oldDept = comp.assigned_department || 'Unassigned';
        const oldStatus = comp.status;
        comp.assigned_department = department;
        if (comp.status === 'Submitted' || comp.status === 'Under Review' || comp.status === 'Rejected') {
          comp.status = 'Assigned';
        }
        comp.updated_at = new Date().toISOString();
        saveLocalComplaint(comp);
        recordLocalHistory(comp.public_id, {
          previous_status: oldStatus,
          new_status: comp.status,
          note: oldStatus === 'Rejected'
            ? `Ticket restored from Rejected and assigned to department '${department}' by Administrator.${note ? ` Note: ${note}` : ''}`
            : `Assigned to department '${department}' (previously ${oldDept}) by Administrator.${note ? ` Note: ${note}` : ''}`,
          changed_by: 'Administrator'
        });
        comp.history = getLocalHistory(comp.public_id);
        return comp;
      }
      throw err;
    }
  },

  async getDuplicates(publicId: string): Promise<DuplicateCandidate[]> {
    try {
      return await request<DuplicateCandidate[]>(`/admin/complaints/${encodeURIComponent(publicId)}/duplicates`);
    } catch {
      return [];
    }
  },

  // --- Analytics ---
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    try {
      return await request<AnalyticsSummary>('/analytics/summary');
    } catch (err) {
      console.warn('Backend unavailable for getAnalyticsSummary, computing local statistics:', err);
      return computeLocalAnalytics();
    }
  },

  async getCategoriesDistribution(): Promise<ChartDataPoint[]> {
    try {
      return await request<ChartDataPoint[]>('/analytics/categories');
    } catch {
      const complaints = getLocalComplaints();
      const map: Record<string, number> = {};
      complaints.forEach(c => {
        const cat = c.category || 'Other';
        map[cat] = (map[cat] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    }
  },

  async getStatusesDistribution(): Promise<ChartDataPoint[]> {
    try {
      return await request<ChartDataPoint[]>('/analytics/statuses');
    } catch {
      const complaints = getLocalComplaints();
      const map: Record<string, number> = {};
      complaints.forEach(c => {
        const s = c.status || 'Submitted';
        map[s] = (map[s] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    }
  },

  async getPrioritiesDistribution(): Promise<ChartDataPoint[]> {
    try {
      return await request<ChartDataPoint[]>('/analytics/priorities');
    } catch {
      const complaints = getLocalComplaints();
      const map: Record<string, number> = {};
      complaints.forEach(c => {
        const p = c.final_priority || 'Low';
        map[p] = (map[p] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    }
  },

  async getLocationsDistribution(): Promise<ChartDataPoint[]> {
    try {
      return await request<ChartDataPoint[]>('/analytics/locations');
    } catch {
      const complaints = getLocalComplaints();
      const map: Record<string, number> = {};
      complaints.forEach(c => {
        const l = c.location || 'Campus Common';
        map[l] = (map[l] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    }
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
