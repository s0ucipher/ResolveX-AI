import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Send,
  Search,
  LayoutDashboard,
  BarChart3,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDisplayMode } from '../context/DisplayModeContext';
import { ThemeToggle } from './ThemeToggle';
import { DisplayModeToggle } from './DisplayModeToggle';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isMobileMode } = useDisplayMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0F1530]/85 backdrop-blur-xl border-b border-violet-100 dark:border-white/10 shadow-xs transition-colors duration-300">
      <div className={`${isMobileMode ? 'max-w-[430px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300`}>
        <div className="flex items-center justify-between h-18">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primaryViolet via-electricPurple to-brightBlue flex items-center justify-center shadow-glossy-light dark:shadow-neon-violet/30 group-hover:scale-105 transition-transform duration-300">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyanAccent ring-2 ring-white dark:ring-[#0F1530] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-[#172033] dark:text-[#F8FAFC]">
                  Complain<span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryViolet via-brightBlue to-cyanAccent">AI</span>
                </span>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 text-primaryViolet dark:text-darkPurple border border-violet-200 dark:border-violet-800/60 shadow-2xs">
                  CAA LIVE
                </span>
              </div>
              <p className={`text-[11px] text-slate-500 dark:text-slate-400 font-medium ${isMobileMode ? 'hidden' : 'hidden sm:block'}`}>
                Intelligent Complaint Triage & Priority Engine
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className={`${isMobileMode ? 'hidden' : 'hidden md:flex'} items-center space-x-1 lg:space-x-1.5`}>
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive('/')
                  ? 'bg-violet-100/70 dark:bg-white/10 text-primaryViolet dark:text-cyanAccent shadow-xs border border-violet-200/80 dark:border-white/10 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
              }`}
            >
              Home
            </Link>

            <Link
              to="/submit"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive('/submit')
                  ? 'bg-violet-100/70 dark:bg-violet-500/20 text-primaryViolet dark:text-violet-300 shadow-xs border border-violet-200/80 dark:border-violet-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple" />
              <span>Submit Issue</span>
            </Link>

            <Link
              to="/track"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive('/track')
                  ? 'bg-blue-100/70 dark:bg-cyan-500/20 text-brightBlue dark:text-cyanAccent shadow-xs border border-blue-200/80 dark:border-cyan-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-brightBlue dark:text-cyanAccent" />
              <span>Track Status</span>
            </Link>

            <Link
              to="/model-eval"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive('/model-eval')
                  ? 'bg-amber-100/70 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 shadow-xs border border-amber-200 dark:border-amber-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>ML Evaluation</span>
            </Link>

            {user && (
              <Link
                to={isAdmin ? '/admin' : '/dashboard'}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  location.pathname.startsWith('/admin') || location.pathname === '/dashboard'
                    ? 'bg-gradient-to-r from-primaryViolet to-brightBlue text-white shadow-neon-violet/30'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {isAdmin ? <BarChart3 className="w-3.5 h-3.5" /> : <LayoutDashboard className="w-3.5 h-3.5" />}
                <span>{isAdmin ? 'Admin Console' : 'My Dashboard'}</span>
              </Link>
            )}
          </div>

          {/* Desktop Right: Display Mode Toggle, Theme Toggle & User Auth */}
          <div className={`${isMobileMode ? 'hidden' : 'hidden md:flex'} items-center space-x-2.5`}>
            {/* Display Mode Toggle (Desktop Mode / Mobile Mode) */}
            <DisplayModeToggle />

            {/* Theme Toggle (Light Mode / Dark Mode) */}
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-3 bg-white/70 dark:bg-[#151D38]/80 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="text-right">
                  <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] leading-tight">{user.name}</div>
                  <div className="text-[10px] text-primaryViolet dark:text-cyanAccent font-semibold capitalize">{user.role} Account</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Exit</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/10 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-primaryViolet via-brightBlue to-cyanAccent hover:opacity-95 text-white shadow-glossy-light dark:shadow-neon-violet/40 transition-all hover:scale-102"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Header Controls: Display Mode Toggle, Theme Toggle & Hamburger */}
          <div className={`flex items-center gap-1.5 ${isMobileMode ? 'flex' : 'md:hidden'}`}>
            <DisplayModeToggle />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className={`bg-white/95 dark:bg-[#0F1530]/95 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 px-4 pt-2 pb-5 space-y-2 shadow-lg ${
          isMobileMode ? 'max-w-[430px] mx-auto' : 'md:hidden'
        }`}>
          {/* Display Mode Indicator inside mobile dropdown */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Display Layout</span>
            <DisplayModeToggle showLabel />
          </div>

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            Home
          </Link>
          <Link
            to="/submit"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            Submit Issue
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            Track Status
          </Link>
          <Link
            to="/model-eval"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            ML Evaluation Matrix
          </Link>

          {user && (
            <Link
              to={isAdmin ? '/admin' : '/dashboard'}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-primaryViolet to-brightBlue text-white"
            >
              {isAdmin ? 'Admin Console' : 'My Dashboard'}
            </Link>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-white/10">
            {user ? (
              <div className="space-y-2">
                <div className="px-3 text-xs text-slate-500 dark:text-slate-400">
                  Signed in as <span className="font-bold text-slate-900 dark:text-white">{user.name}</span> ({user.role})
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white font-semibold text-xs border border-slate-200 dark:border-white/10"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-primaryViolet via-brightBlue to-cyanAccent text-white font-bold text-xs shadow-glossy-light dark:shadow-neon-violet/40"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
