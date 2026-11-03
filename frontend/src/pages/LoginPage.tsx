import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      if (loggedInUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role: 'admin' | 'student') => {
    if (role === 'admin') {
      setEmail('admin@resolvex.ai');
      setPassword('Admin@ResolveX2026!');
    } else {
      setEmail('student@resolvex.ai');
      setPassword('Student@ResolveX2026!');
    }
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primaryViolet via-brightBlue to-cyanAccent text-white flex items-center justify-center mx-auto shadow-glossy-light dark:shadow-neon-violet/30">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC]">Sign In to ResolveX AI</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Access your complaint management portal & live tracking</p>
        </div>

        {/* Demo Fast Fill Buttons */}
        <div className="bg-[#F0E9FF] dark:bg-[#151D38] p-4 rounded-2xl border border-violet-200/80 dark:border-white/10 text-xs space-y-2.5 shadow-xs">
          <div className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primaryViolet dark:text-darkPurple" />
            <span>Viva Demonstration Quick Accounts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin')}
              className="py-2 px-3 rounded-xl bg-white dark:bg-[#171F3B] hover:bg-violet-100/60 dark:hover:bg-white/10 border border-violet-200 dark:border-white/10 text-primaryViolet dark:text-darkPurple font-black text-[11px] transition-all shadow-2xs hover:scale-102"
            >
              Fill Admin Account
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('student')}
              className="py-2 px-3 rounded-xl bg-white dark:bg-[#171F3B] hover:bg-blue-100/60 dark:hover:bg-white/10 border border-blue-200 dark:border-white/10 text-brightBlue dark:text-darkCyan font-black text-[11px] transition-all shadow-2xs hover:scale-102"
            >
              Fill Student Account
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-5 backdrop-blur-xl">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Campus Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              <Mail className="w-4 h-4 text-brightBlue dark:text-darkCyan absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              <Lock className="w-4 h-4 text-brightBlue dark:text-darkCyan absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue text-white font-black text-xs shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:opacity-95 hover:scale-101"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium pt-2">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-primaryViolet dark:text-darkCyan hover:underline font-bold">
              Register now
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
