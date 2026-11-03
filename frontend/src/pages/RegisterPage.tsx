import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primaryViolet via-brightBlue to-cyanAccent text-white flex items-center justify-center mx-auto shadow-glossy-light dark:shadow-neon-violet/30">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC]">Create an Account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Join the ComplainAI complaint intelligence network</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-4 backdrop-blur-xl">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              <User className="w-4 h-4 text-brightBlue dark:text-darkCyan absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Campus Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@college.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              <Mail className="w-4 h-4 text-brightBlue dark:text-darkCyan absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              <Lock className="w-4 h-4 text-brightBlue dark:text-darkCyan absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              <Lock className="w-4 h-4 text-brightBlue dark:text-darkCyan absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primaryViolet via-indigo-600 to-brightBlue text-white font-black text-xs shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2 hover:opacity-95 hover:scale-101"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Register as Student'}</span>
          </button>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-primaryViolet dark:text-darkCyan hover:underline font-bold">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
