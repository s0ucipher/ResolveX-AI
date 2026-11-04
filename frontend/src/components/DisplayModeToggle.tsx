import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { useDisplayMode } from '../context/DisplayModeContext';

interface Props {
  className?: string;
  showLabel?: boolean;
}

export const DisplayModeToggle: React.FC<Props> = ({ className = '', showLabel = false }) => {
  const { displayMode, toggleDisplayMode, isMobileMode } = useDisplayMode();

  return (
    <button
      type="button"
      onClick={toggleDisplayMode}
      aria-label={isMobileMode ? 'Switch to Desktop Mode' : 'Switch to Mobile Mode'}
      title={isMobileMode ? 'Switch to Desktop Mode' : 'Switch to Mobile Mode'}
      className={`group relative flex items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300 focus:outline-none cursor-pointer ${
        isMobileMode
          ? 'bg-cyan-50/90 dark:bg-cyan-950/40 hover:bg-cyan-100/90 dark:hover:bg-cyan-950/60 border-cyan-300/80 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 shadow-xs'
          : 'bg-white hover:bg-violet-50/80 dark:bg-[#151D38]/90 dark:hover:bg-[#171F3B] border-violet-200/90 dark:border-white/15 text-primaryViolet dark:text-violet-300 shadow-glossy-light dark:shadow-neon-violet/20'
      } ${className}`}
    >
      {/* Pill Toggle Body */}
      <div className="relative flex items-center justify-between w-14 h-7 p-0.5 rounded-full bg-slate-200/80 dark:bg-[#080B18] border border-slate-300/80 dark:border-white/10 transition-colors">
        {/* Animated Thumb */}
        <div
          className={`absolute top-0.5 bottom-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ease-out shadow-md ${
            isMobileMode
              ? 'left-[calc(100%-1.65rem)] bg-gradient-to-tr from-cyan-500 to-brightBlue text-white'
              : 'left-0.5 bg-gradient-to-tr from-primaryViolet to-indigo-600 text-white'
          }`}
        >
          {isMobileMode ? (
            <Smartphone className="w-3.5 h-3.5 animate-in zoom-in-75 duration-300" />
          ) : (
            <Monitor className="w-3.5 h-3.5 animate-in zoom-in-75 duration-300" />
          )}
        </div>

        {/* Inactive background icon hints */}
        <div className="flex items-center justify-between w-full px-1 text-[10px]">
          <Monitor className={`w-3 h-3 transition-opacity ${isMobileMode ? 'opacity-40 text-slate-400' : 'opacity-0'}`} />
          <Smartphone className={`w-3 h-3 transition-opacity ${isMobileMode ? 'opacity-0' : 'opacity-40 text-slate-400'}`} />
        </div>
      </div>

      {showLabel && (
        <span className="text-xs font-bold tracking-wide select-none pr-1">
          {isMobileMode ? 'Mobile View' : 'Desktop View'}
        </span>
      )}
    </button>
  );
};

