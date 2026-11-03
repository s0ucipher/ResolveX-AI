import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<Props> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      className={`group relative flex items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300 focus:outline-none ${
        isDark
          ? 'bg-[#151D38]/90 hover:bg-[#171F3B] border-white/15 text-yellow-300 shadow-neon-amber/20'
          : 'bg-white hover:bg-violet-50/80 border-violet-200/90 text-primaryViolet shadow-glossy-light'
      } ${className}`}
    >
      {/* Pill Toggle Body */}
      <div className="relative flex items-center justify-between w-14 h-7 p-0.5 rounded-full bg-slate-200/80 dark:bg-[#080B18] border border-slate-300/80 dark:border-white/10 transition-colors">
        {/* Animated Thumb */}
        <div
          className={`absolute top-0.5 bottom-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ease-out shadow-md ${
            isDark
              ? 'left-[calc(100%-1.65rem)] bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 text-white'
              : 'left-0.5 bg-gradient-to-tr from-amber-400 to-yellow-500 text-white'
          }`}
        >
          {isDark ? (
            <Moon className="w-3.5 h-3.5 animate-in spin-in-90 duration-300" />
          ) : (
            <Sun className="w-3.5 h-3.5 animate-in spin-in-90 duration-300" />
          )}
        </div>

        {/* Inactive background icon hints */}
        <div className="flex items-center justify-between w-full px-1 text-[10px]">
          <Sun className={`w-3 h-3 transition-opacity ${isDark ? 'opacity-40 text-slate-400' : 'opacity-0'}`} />
          <Moon className={`w-3 h-3 transition-opacity ${isDark ? 'opacity-0' : 'opacity-40 text-slate-400'}`} />
        </div>
      </div>

      {showLabel && (
        <span className="text-xs font-bold tracking-wide select-none pr-1">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};

