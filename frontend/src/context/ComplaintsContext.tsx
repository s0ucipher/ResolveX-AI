import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Complaint } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface ComplaintStats {
  total: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
}

interface ComplaintsContextType {
  complaints: Complaint[];
  loading: boolean;
  error: string | null;
  stats: ComplaintStats;
  refreshComplaints: () => Promise<Complaint[]>;
  addSubmittedComplaint: (complaint: Complaint) => void;
  updateComplaintInState: (updated: Complaint) => void;
}

const ComplaintsContext = createContext<ComplaintsContextType | undefined>(undefined);

function getCacheKey(userEmail?: string | null): string {
  const clean = (userEmail || '').trim().toLowerCase();
  return clean ? `complainai_complaints_cache_${clean}` : 'complainai_complaints_cache_guest';
}

function loadCachedComplaints(userEmail?: string | null): Complaint[] {
  try {
    const raw = localStorage.getItem(getCacheKey(userEmail));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedComplaints(complaints: Complaint[], userEmail?: string | null): void {
  try {
    localStorage.setItem(getCacheKey(userEmail), JSON.stringify(complaints));
  } catch (err) {
    console.warn('Could not cache complaints in localStorage:', err);
  }
}

function computeStats(list: Complaint[]): ComplaintStats {
  return {
    total: list.length,
    openCount: list.filter(c => ['Submitted', 'Under Review', 'Assigned'].includes(c.status)).length,
    inProgressCount: list.filter(c => c.status === 'In Progress').length,
    resolvedCount: list.filter(c => c.status === 'Resolved').length,
  };
}

export const ComplaintsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>(() => loadCachedComplaints(user?.email));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When user changes, immediately load their cached complaints so dashboard displays without lag
  useEffect(() => {
    const cached = loadCachedComplaints(user?.email);
    setComplaints(cached);
  }, [user?.email]);

  const refreshComplaints = useCallback(async (): Promise<Complaint[]> => {
    setLoading(true);
    setError(null);
    try {
      const serverComplaints = await api.getMyComplaints();
      
      // Filter for current user if regular user
      let relevant = serverComplaints;
      if (user && user.role !== 'admin') {
        const cleanEmail = user.email.trim().toLowerCase();
        relevant = serverComplaints.filter(c => 
          (c.user_email && c.user_email.trim().toLowerCase() === cleanEmail) ||
          (user.id && c.user_id === user.id)
        );
      }

      setComplaints(relevant);
      saveCachedComplaints(relevant, user?.email);
      return relevant;
    } catch (err: any) {
      console.warn('Failed to refresh complaints from server:', err);
      const msg = err.message || 'Unable to load latest complaints from database.';
      setError(msg);
      // Keep existing cached complaints so the user still sees their data
      const cached = loadCachedComplaints(user?.email);
      if (cached.length > 0) {
        setComplaints(cached);
      }
      return cached;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load when user mounts
  useEffect(() => {
    refreshComplaints();
  }, [refreshComplaints]);

  // Immediately inject newly submitted complaint into state and cache
  const addSubmittedComplaint = useCallback((newComplaint: Complaint) => {
    setComplaints(prev => {
      // Avoid duplicate insertion
      const exists = prev.some(c => c.public_id === newComplaint.public_id || c.id === newComplaint.id);
      if (exists) {
        return prev.map(c => (c.public_id === newComplaint.public_id ? newComplaint : c));
      }
      const updated = [newComplaint, ...prev];
      saveCachedComplaints(updated, user?.email);
      return updated;
    });
  }, [user?.email]);

  // Update existing complaint (e.g. status transition)
  const updateComplaintInState = useCallback((updated: Complaint) => {
    setComplaints(prev => {
      const next = prev.map(c => (c.public_id === updated.public_id ? updated : c));
      saveCachedComplaints(next, user?.email);
      return next;
    });
  }, [user?.email]);

  const stats = computeStats(complaints);

  return (
    <ComplaintsContext.Provider
      value={{
        complaints,
        loading,
        error,
        stats,
        refreshComplaints,
        addSubmittedComplaint,
        updateComplaintInState
      }}
    >
      {children}
    </ComplaintsContext.Provider>
  );
};

export const useComplaints = () => {
  const context = useContext(ComplaintsContext);
  if (!context) {
    throw new Error('useComplaints must be used within a ComplaintsProvider');
  }
  return context;
};

