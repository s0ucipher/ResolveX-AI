import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Send, Search, Sparkles, User, LayoutDashboard, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDisplayMode } from '../context/DisplayModeContext';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { isMobileMode } = useDisplayMode();

  // Only render when in Smartphone Mode
  if (!isMobileMode) return null;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isCurrentlyInAdmin = location.pathname.startsWith('/admin');

  const navItems = [
    { label: 'Home', path: '/', icon: Home, highlight: false },
    { label: 'Submit', path: '/submit', icon: Send, highlight: true },
    { label: 'Track', path: '/track', icon: Search, highlight: false },
    { label: 'ML Eval', path: '/model-eval', icon: Sparkles, highlight: false },
    {
      label: user ? (isCurrentlyInAdmin ? 'Admin' : 'Dashboard') : 'Sign In',
      path: user ? (isCurrentlyInAdmin ? '/admin' : '/dashboard') : '/login',
      icon: user ? (isCurrentlyInAdmin ? BarChart3 : LayoutDashboard) : User,
      highlight: false
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
      {/* Constrain width if inside simulated desktop frame */}
      <div className="max-w-[430px] mx-auto px-3 pb-safe">
        <div className="mb-2 px-2 py-1.5 rounded-2xl bg-white/92 dark:bg-[#0F1530]/95 backdrop-blur-2xl border border-violet-100/90 dark:border-white/10 shadow-[0_-4px_25px_-5px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_25px_-5px_rgba(0,0,0,0.5)] flex items-center justify-around">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            if (item.highlight) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center group relative -mt-4 cursor-pointer"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-200 active:scale-95 ${
                      active
                        ? 'bg-gradient-to-tr from-primaryViolet via-electricPurple to-brightBlue ring-3 ring-white dark:ring-[#0F1530] shadow-neon-violet/40 scale-105'
                        : 'bg-gradient-to-tr from-primaryViolet to-indigo-600 shadow-glossy-light hover:scale-105'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[9.5px] font-extrabold mt-0.5 tracking-tight ${
                      active
                        ? 'text-primaryViolet dark:text-cyanAccent'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center py-1 px-1.5 rounded-xl transition-all duration-200 active:scale-95 text-center min-w-[50px] cursor-pointer"
              >
                <div
                  className={`relative p-1 rounded-xl transition-all duration-200 ${
                    active
                      ? 'text-primaryViolet dark:text-cyanAccent bg-violet-100/80 dark:bg-white/10'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {active && (
                    <span className="absolute -top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyanAccent animate-pulse" />
                  )}
                </div>
                <span
                  className={`text-[9.5px] tracking-tight mt-0.5 ${
                    active
                      ? 'font-extrabold text-primaryViolet dark:text-cyanAccent'
                      : 'font-medium text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

