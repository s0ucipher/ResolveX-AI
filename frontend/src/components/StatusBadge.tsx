import React from 'react';
import { Send, Eye, UserCheck, Play, CheckCheck, XCircle, RefreshCw } from 'lucide-react';

interface Props {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-3 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-4 py-1.5 gap-2 font-black',
  }[size];

  switch (status) {
    case 'Submitted':
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${sizeClasses}`}>
          <Send className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Submitted</span>
        </span>
      );
    case 'Under Review':
      return (
        <span className={`inline-flex items-center rounded-full bg-violet-100/70 dark:bg-violet-500/20 text-primaryViolet dark:text-violet-300 border border-violet-200 dark:border-violet-500/40 shadow-xs ${sizeClasses}`}>
          <Eye className="w-3.5 h-3.5 text-primaryViolet dark:text-violet-400" />
          <span>Under Review</span>
        </span>
      );
    case 'Assigned':
      return (
        <span className={`inline-flex items-center rounded-full bg-purple-100/70 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 ${sizeClasses}`}>
          <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Assigned</span>
        </span>
      );
    case 'In Progress':
      return (
        <span className={`inline-flex items-center rounded-full bg-cyan-100/70 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 shadow-xs dark:shadow-neon-cyan/20 ${sizeClasses}`}>
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span>In Progress</span>
        </span>
      );
    case 'Resolved':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-100/70 dark:bg-mintGreen/20 text-emerald-800 dark:text-mintGreen border border-emerald-200 dark:border-mintGreen/40 shadow-xs dark:shadow-neon-mint/20 ${sizeClasses}`}>
          <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-mintGreen" />
          <span>Resolved</span>
        </span>
      );
    case 'Rejected':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-100/70 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
          <span>Rejected</span>
        </span>
      );
    case 'Reopened':
      return (
        <span className={`inline-flex items-center rounded-full bg-orange-100/70 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-500/40 ${sizeClasses}`}>
          <RefreshCw className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
          <span>Reopened</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${sizeClasses}`}>
          <span>{status}</span>
        </span>
      );
  }
};
