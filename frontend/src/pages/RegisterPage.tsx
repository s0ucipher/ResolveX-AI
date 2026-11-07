import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mapFirebaseError } from '../services/firebase';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle, isFirebaseActive } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      setRegistrationSuccess(true);
      // Give the user a brief moment to see success or redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(mapFirebaseError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-14 selection:bg-primaryViolet selection:text-white">
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-primaryViolet via-brightBlue to-cyanAccent text-white shadow-glossy-light dark:shadow-neon-violet/40 hover:scale-105 transition-transform duration-300">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight">
            Create an Account on <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryViolet via-brightBlue to-cyanAccent">ComplainAI</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Join the campus intelligence network to lodge and track facility requests
          </p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {registrationSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-3 shadow-sm animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-extrabold text-[12px]">Account Created Successfully!</div>
              <p className="leading-relaxed">
                Your profile has been created and synchronized with ComplainAI. Redirecting you to your personal portal...
              </p>
            </div>
          </div>
        )}

        {/* Registration Card */}
        <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-4 backdrop-blur-xl">
          {/* Google Sign-Up Option */}
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
                    <span>Signing up with Google...</span>
                  </>
                ) : (
                  <>
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
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 dark:border-white/10 w-full" />
                <span className="bg-white dark:bg-[#171F3B] px-3 text-[10.5px] uppercase font-bold text-slate-400 font-mono tracking-wider shrink-0">
                  Or register with email
                </span>
                <div className="border-t border-slate-200 dark:border-white/10 w-full" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <User className="w-4 h-4 text-brightBlue dark:text-cyanAccent absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Campus Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rohan@college.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <Mail className="w-4 h-4 text-brightBlue dark:text-cyanAccent absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <Lock className="w-4 h-4 text-brightBlue dark:text-cyanAccent absolute left-3.5 top-3" />
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

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <Lock className="w-4 h-4 text-brightBlue dark:text-cyanAccent absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-violet-50/70 dark:bg-white/5 border border-violet-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primaryViolet dark:text-cyanAccent shrink-0" />
              <span>Public accounts default to Student status. Admin roles are assigned by campus facilities.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue text-white font-black text-xs sm:text-sm shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-1 hover:opacity-95 hover:scale-101 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Profile...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Link to Login & Facility Admin */}
          <div className="space-y-1.5 text-center text-xs text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-white/10">
            <div>
              Already registered?{' '}
              <Link to="/login" className="text-primaryViolet dark:text-cyanAccent hover:underline font-bold">
                Sign In to Console
              </Link>
            </div>
            <div className="text-[11.5px] text-slate-500 dark:text-slate-400 pt-0.5">
              Campus Facility Staff?{' '}
              <Link to="/admin/login" className="text-primaryViolet dark:text-cyanAccent hover:underline font-bold">
                Facility Admin Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
