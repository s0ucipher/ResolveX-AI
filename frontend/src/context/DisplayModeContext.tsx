import React, { createContext, useContext, useEffect, useState } from 'react';

export type DisplayMode = 'desktop' | 'mobile';

interface DisplayModeContextType {
  displayMode: DisplayMode;
  toggleDisplayMode: () => void;
  setDisplayMode: (mode: DisplayMode) => void;
  isMobileMode: boolean;
}

const DisplayModeContext = createContext<DisplayModeContextType | undefined>(undefined);

const DISPLAY_MODE_STORAGE_KEY = 'complainai_display_mode';
const LEGACY_STORAGE_KEY = 'resolvex_display_mode';

export const DisplayModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
    try {
      const saved = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved === 'desktop' || saved === 'mobile') {
        return saved;
      }
    } catch (_) {}
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'mobile';
    }
    return 'desktop';
  });

  useEffect(() => {
    try {
      localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, displayMode);
    } catch (_) {}

    const root = document.documentElement;
    if (displayMode === 'mobile') {
      root.classList.add('display-mode-mobile');
      root.classList.remove('display-mode-desktop');
    } else {
      root.classList.add('display-mode-desktop');
      root.classList.remove('display-mode-mobile');
    }
  }, [displayMode]);

  const toggleDisplayMode = () => {
    setDisplayModeState((prev) => (prev === 'desktop' ? 'mobile' : 'desktop'));
  };

  const setDisplayMode = (mode: DisplayMode) => {
    setDisplayModeState(mode);
  };

  return (
    <DisplayModeContext.Provider
      value={{
        displayMode,
        toggleDisplayMode,
        setDisplayMode,
        isMobileMode: displayMode === 'mobile',
      }}
    >
      {children}
    </DisplayModeContext.Provider>
  );
};

export const useDisplayMode = (): DisplayModeContextType => {
  const context = useContext(DisplayModeContext);
  if (!context) {
    throw new Error('useDisplayMode must be used within a DisplayModeProvider');
  }
  return context;
};

