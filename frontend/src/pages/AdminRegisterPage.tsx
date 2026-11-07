import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Building,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mapFirebaseError } from '../services/firebase';
import { DEPARTMENTS } from '../types';

export const AdminRegisterPage: React.FC = () => {
  const { registerAdmin, loginDemo } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please provide your full name or staff title.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide a valid administrator email address.');
      return;
    }
    if (password.length < 6) {
      setError('Administrator password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const displayName = department.trim() ? `${name.trim()} (${department.trim()})` : name.trim();
      await registerAdmin(displayName, email.trim().toLowerCase(), password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/admin', { replace: true });
      }, 1200);
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
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-700 via-primaryViolet to-brightBlue text-white shadow-glossy-light dark:shadow-neon-violet/40 hover:scale-105 transition-transform duration-300">
            <Building className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 text-[11px] font-mono font-bold text-indigo-700 dark:text-cyanAccent">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>FACILITY ADMINISTRATION PORTAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight">
            Register Administrator
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
            Create an authorized campus administrator profile with access to the complaint triage and dispatch console.
          </p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1">
              <div className="font-bold">Administrator Profile Created Successfully!</div>
              <div>Granting administrative clearance and opening command center...</div>
            </div>
          </div>
        )}

        {/* Main Admin Registration Card */}
        <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-4 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Staff Full Name / Title <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sougata Poddar or Dr. A. Sharma"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-indigo-600 dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <User className="w-4 h-4 text-indigo-600 dark:text-cyanAccent absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Official Administrator Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@college.edu or sougatapoddar41@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-indigo-600 dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <Mail className="w-4 h-4 text-indigo-600 dark:text-cyanAccent absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-cyanAccent shrink-0" />
                <span>Department / Facility Division <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional)</span></span>
              </label>
              <div>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-indigo-600 dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] font-medium transition-all cursor-pointer"
                >
                  <option value="">Select Division (or General Facilities Dean)</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className="bg-white dark:bg-[#171F3B]">{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Administrator Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-indigo-600 dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <Lock className="w-4 h-4 text-indigo-600 dark:text-cyanAccent absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-indigo-600 dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <Lock className="w-4 h-4 text-indigo-600 dark:text-cyanAccent absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Clearance Notice */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-white/5 border border-indigo-200/80 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-cyanAccent shrink-0" />
              <span>Grants Administrator role with permissions to review, assign, and transition all campus complaints.</span>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-700 via-primaryViolet to-brightBlue text-white font-black text-xs sm:text-sm shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:opacity-95 hover:scale-101 cursor-pointer mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Provisioning Administrator Account...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Redirecting to Console...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register as Facility Administrator</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Links to Sign In & Student Portal */}
          <div className="space-y-1.5 text-center text-xs text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-white/10">
            <div>
              Already have an Administrator Account?{' '}
              <Link to="/admin/login" className="text-indigo-600 dark:text-cyanAccent hover:underline font-bold">
                Sign In to Admin Console
              </Link>
            </div>
            <div className="text-[11.5px] pt-0.5">
              Are you a student lodging an issue?{' '}
              <Link to="/login" className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyanAccent font-bold underline">
                Go to Student Portal →
              </Link>
            </div>
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
