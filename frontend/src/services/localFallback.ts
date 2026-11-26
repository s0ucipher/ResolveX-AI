import { Complaint, User } from '../types';

const OBSOLETE_CREDENTIAL_KEYS = [
  'complainai_local_registered_users',
  'resolvex_local_registered_users',
];
const LOCAL_CACHED_USER_KEY = 'complainai_cached_user';
const LEGACY_LOCAL_COMPLAINTS_KEY = 'complainai_local_complaints';

/**
 * Removes obsolete credential-cache keys (which previously stored reversible
 * base64 password representations) and legacy local_jwt_ tokens without
 * deleting unrelated user preferences or unsent drafts.
 */
export function retireObsoleteCredentialKeys(): void {
  try {
    for (const key of OBSOLETE_CREDENTIAL_KEYS) {
      localStorage.removeItem(key);
    }
    for (const tokenKey of ['complainai_token', 'resolvex_token']) {
      const val = localStorage.getItem(tokenKey);
      if (val && val.startsWith('local_jwt_')) {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(LOCAL_CACHED_USER_KEY);
      }
    }
  } catch {
    // Ignore storage access errors
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
    if (!user) {
      localStorage.removeItem(LOCAL_CACHED_USER_KEY);
    } else {
      localStorage.setItem(LOCAL_CACHED_USER_KEY, JSON.stringify(user));
    }
  } catch {
    // Ignore storage access errors
  }
}

export interface LegacyLocalDraft {
  public_id: string;
  title: string;
  description: string;
  location: string;
  category?: string;
  created_at?: string;
}

/**
 * Reads any legacy browser-only records (e.g., CMP-2026-*) saved by older
 * builds so students can recover their text without mistaking them for
 * server-filed complaints.
 */
export function getLegacyLocalDrafts(userEmail?: string | null): LegacyLocalDraft[] {
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_COMPLAINTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleanEmail = userEmail?.trim().toLowerCase();
    return parsed
      .filter((c: Partial<Complaint>) => {
        if (!c || !c.public_id || !c.public_id.startsWith('CMP-')) return false;
        if (cleanEmail && c.user_email && c.user_email.toLowerCase() !== cleanEmail) return false;
        return true;
      })
      .map((c: Partial<Complaint>) => ({
        public_id: c.public_id || '',
        title: c.title || '',
        description: c.description || '',
        location: c.location || '',
        category: c.category,
        created_at: c.created_at,
      }));
  } catch {
    return [];
  }
}

export function dismissLegacyLocalDraft(publicId: string): void {
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_COMPLAINTS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const remaining = parsed.filter((c: Partial<Complaint>) => c?.public_id !== publicId);
    if (remaining.length === 0) {
      localStorage.removeItem(LEGACY_LOCAL_COMPLAINTS_KEY);
    } else {
      localStorage.setItem(LEGACY_LOCAL_COMPLAINTS_KEY, JSON.stringify(remaining));
    }
  } catch {
    // Ignore storage access errors
  }
}
