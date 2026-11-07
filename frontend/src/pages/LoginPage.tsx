import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Loader2,
  KeyRound,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mapFirebaseError } from '../services/firebase';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, resetPassword, loginDemo, isFirebaseActive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination from protected route or default to dashboard
  const from = (location.state as any)?.from || '/dashboard';
  const redirectMessage = (location.state as any)?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password sub-view state
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      // When logging in from Student Portal, always remain in the Student section
      if (from && from !== '/' && from !== '/login' && from !== '/register' && !from.startsWith('/admin')) {
        navigate(from, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
      // When logging in from Student Portal, always remain in the Student section
      if (from && from !== '/' && from !== '/login' && from !== '/register' && !from.startsWith('/admin')) {
        navigate(from, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError('Please enter your email address to receive password reset instructions.');
      return;
    }

    setError(null);
    setResetLoading(true);

    try {
      await resetPassword(resetEmail.trim());
      setSuccessMsg(`Password reset instructions have been dispatched to ${resetEmail.trim()}. Please inspect your inbox and spam folder.`);
      setShowForgot(false);
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setResetLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'student') => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await loginDemo(role);
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Demo authentication failed. Please ensure backend is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-14 selection:bg-primaryViolet selection:text-white">
      <div className="w-full max-w-md space-y-5">
        {/* Mandatory Login Warning Banner if redirected */}
        {redirectMessage && (
          <div className="p-4 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-extrabold text-[12px] tracking-tight">Authentication Required</div>
              <div className="text-[11.5px] leading-relaxed font-medium">
                {redirectMessage}
              </div>
            </div>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-primaryViolet via-brightBlue to-cyanAccent text-white shadow-glossy-light dark:shadow-neon-violet/40 hover:scale-105 transition-transform duration-300">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight">
            Sign In to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryViolet via-brightBlue to-cyanAccent">ComplainAI</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Access your secure complaint intelligence console & tracking portal
          </p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Forgot Password Modal / View */}
        {showForgot ? (
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-4 backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sm font-black text-[#172033] dark:text-[#F8FAFC]">
                <KeyRound className="w-4 h-4 text-primaryViolet dark:text-cyanAccent" />
                <span>Reset Account Password</span>
              </div>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setError(null); }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Enter your registered campus email address. We will dispatch an automated Firebase password reset link to your inbox.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Registered Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium"
                  />
                  <Mail className="w-4 h-4 text-primaryViolet dark:text-cyanAccent absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primaryViolet via-brightBlue to-cyanAccent text-white font-extrabold text-xs shadow-glossy-light dark:shadow-neon-violet/30 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting Reset Link...</span>
                  </>
                ) : (
                  <span>Dispatch Password Reset Link</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Main Login Card */
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-5 backdrop-blur-xl">
            {/* Google Authentication Button */}
            {isFirebaseActive && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-[#151D38] hover:bg-slate-50 dark:hover:bg-[#1C2546] border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primaryViolet" />
                      <span>Authenticating with Google...</span>
                    </>
                  ) : (
                    <>
                      {/* Google Multi-Color SVG Logo */}
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                {/* Or Divider */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-slate-200 dark:border-white/10 w-full" />
                  <span className="bg-white dark:bg-[#171F3B] px-3 text-[10.5px] uppercase font-bold text-slate-400 font-mono tracking-wider shrink-0">
                    Or sign in with email
                  </span>
                  <div className="border-t border-slate-200 dark:border-white/10 w-full" />
                </div>
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Campus Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu or admin@complainai.ai"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                  />
                  <Mail className="w-4 h-4 text-brightBlue dark:text-cyanAccent absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  {isFirebaseActive && (
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setError(null); setResetEmail(email); }}
                      className="text-[11px] font-bold text-primaryViolet dark:text-cyanAccent hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                  />
                  <Lock className="w-4 h-4 text-brightBlue dark:text-cyanAccent absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue text-white font-black text-xs sm:text-sm shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:opacity-95 hover:scale-101 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Console</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Link to Registration & Admin Portal */}
            <div className="space-y-2 text-center text-xs text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-white/10">
              <div>
                Don't have an account yet?{' '}
                <Link to="/register" className="text-primaryViolet dark:text-cyanAccent hover:underline font-bold">
                  Create Account now
                </Link>
              </div>
              <div className="text-[11.5px] pt-1 text-slate-500 dark:text-slate-400">
                Campus Facility Staff?{' '}
                <Link to="/admin/login" className="text-primaryViolet dark:text-cyanAccent hover:underline font-bold">
                  Sign in to Facility Admin Portal →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Examiner Demonstration Accounts Box */}
        <div className="bg-[#F0E9FF] dark:bg-[#151D38] p-4 rounded-2xl border border-violet-200/80 dark:border-white/10 text-xs space-y-2.5 shadow-xs">
          <div className="text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primaryViolet dark:text-cyanAccent" />
              <span>Viva Demonstration 1-Click Access:</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-primaryViolet dark:text-cyanAccent">Pre-Seeded</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-white dark:bg-[#171F3B] hover:bg-violet-100/60 dark:hover:bg-white/10 border border-violet-200 dark:border-white/10 text-primaryViolet dark:text-cyanAccent font-black text-[11px] transition-all shadow-2xs hover:scale-102 cursor-pointer text-center"
            >
              1-Click Admin Sign In
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('student')}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-white dark:bg-[#171F3B] hover:bg-blue-100/60 dark:hover:bg-white/10 border border-blue-200 dark:border-white/10 text-brightBlue dark:text-cyanAccent font-black text-[11px] transition-all shadow-2xs hover:scale-102 cursor-pointer text-center"
            >
              1-Click Student Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
