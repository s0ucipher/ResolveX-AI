import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  Building,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mapFirebaseError } from '../services/firebase';

export const AdminLoginPage: React.FC = () => {
  const { login, loginDemo, logout, isFirebaseActive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/admin';
  const redirectMessage = (location.state as any)?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your administrator email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);

      // Verify Administrative Role
      if (loggedInUser.role !== 'admin') {
        // Immediately revoke session for unauthorized role
        logout();
        setError(
          `Access Denied: Account '${loggedInUser.email}' is registered as a student. The Facility Admin Portal is strictly restricted to authorized administrative personnel.`
        );
        return;
      }

      navigate(from && from !== '/login' && from !== '/admin/login' ? from : '/admin', { replace: true });
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = async () => {
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await loginDemo('admin');
      if (loggedInUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        setError('Pre-seeded administrator credentials could not be verified.');
      }
    } catch (err: any) {
      setError(err.message || 'Demo admin sign-in failed. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-14 selection:bg-indigo-600 selection:text-white">
      <div className="w-full max-w-md space-y-5">
        {/* Clearance Notice from Route Redirection */}
        {redirectMessage && (
          <div className="p-4 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-extrabold text-[12px] tracking-tight">Administrative Clearance Required</div>
              <div className="text-[11.5px] leading-relaxed font-medium">
                {redirectMessage}
              </div>
            </div>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-700 via-primaryViolet to-brightBlue text-white shadow-glossy-light dark:shadow-neon-violet/40 hover:scale-105 transition-transform duration-300">
            <Building className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/40 text-[11px] font-mono font-bold text-primaryViolet dark:text-darkPurple">
            <ShieldCheck className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple" />
            <span>FACILITY ADMINISTRATION PORTAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight">
            Administrator Sign-In
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
            Restricted to authorized campus facility administrators, department heads, and maintenance supervisors.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Main Admin Sign-In Card */}
        <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-5 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Administrator Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@complainai.ai"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-indigo-600 dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <Mail className="w-4 h-4 text-indigo-600 dark:text-cyanAccent absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Administrator Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-indigo-600 dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <Lock className="w-4 h-4 text-indigo-600 dark:text-cyanAccent absolute left-3.5 top-3.5" />
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
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-700 via-primaryViolet to-brightBlue text-white font-black text-xs sm:text-sm shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:opacity-95 hover:scale-101 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Administrator Clearance...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Enter Facility Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Provisioning Notice */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            <span className="font-bold text-slate-700 dark:text-slate-300">Policy:</span> Self-registration as an administrator is prohibited. Privilege assignment is performed by campus IT via backend provisioning.
          </div>

          {/* Switch to Student Portal */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-white/10">
            Are you a student lodging or tracking a campus issue?{' '}
            <Link to="/login" className="text-indigo-600 dark:text-cyanAccent hover:underline font-bold inline-flex items-center gap-1">
              Go to Student Portal <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 1-Click Fast Demonstration Admin Access for Viva */}
        <div className="bg-[#F0E9FF] dark:bg-[#151D38] p-4 rounded-2xl border border-violet-200/80 dark:border-white/10 text-xs space-y-2.5 shadow-xs">
          <div className="text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primaryViolet dark:text-cyanAccent" />
              <span>Viva Demonstration 1-Click Access:</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-primaryViolet dark:text-cyanAccent">Dean Account</span>
          </div>
          <button
            type="button"
            onClick={handleDemoAdmin}
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-[#171F3B] hover:bg-violet-100/60 dark:hover:bg-white/10 border border-violet-200 dark:border-white/10 text-primaryViolet dark:text-cyanAccent font-black text-xs transition-all shadow-2xs hover:scale-101 cursor-pointer text-center flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-cyanAccent" />
            <span>1-Click Dean of Facilities Admin Sign-In (Prof. Arvind Kumar)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
