import React from 'react';
import { AlertTriangle, Flame, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';

interface Props {
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<Props> = ({ priority, showIcon = true, size = 'md' }) => {
  const p = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-3 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-4 py-1.5 gap-2 font-black',
  }[size];

  switch (p) {
    case 'Critical':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 shadow-xs dark:shadow-neon-coral/30 ${sizeClasses}`}>
          {showIcon && <Flame className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 animate-pulse" />}
          <span>CRITICAL</span>
        </span>
      );
    case 'High':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 shadow-xs dark:shadow-neon-amber/30 ${sizeClasses}`}>
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
          <span>HIGH PRIORITY</span>
        </span>
      );
    case 'Medium':
      return (
        <span className={`inline-flex items-center rounded-full bg-sky-50 dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 border border-sky-200 dark:border-cyan-500/40 shadow-xs dark:shadow-neon-cyan/30 ${sizeClasses}`}>
          {showIcon && <Zap className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />}
          <span>MEDIUM</span>
        </span>
      );
    case 'Low':
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${sizeClasses}`}>
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
          <span>LOW</span>
        </span>
      );
  }
};
