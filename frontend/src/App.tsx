import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ComplaintsProvider } from './context/ComplaintsContext';
import { ThemeProvider } from './context/ThemeContext';
import { DisplayModeProvider, useDisplayMode } from './context/DisplayModeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomePage } from './pages/HomePage';
import { SubmitComplaintPage } from './pages/SubmitComplaintPage';
import { TrackComplaintPage } from './pages/TrackComplaintPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminComplaintDetailPage } from './pages/AdminComplaintDetailPage';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';

// Protected Route wrapper for regular authenticated users (Mandatory Login Enforcement)
const ProtectedUserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primaryViolet to-brightBlue flex items-center justify-center text-white mb-3 shadow-glossy-light animate-pulse">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
          Verifying ComplainAI authentication...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname + location.search,
          message: 'Please sign in or create an account to access ComplainAI features.'
        }}
        replace
      />
    );
  }

  return <>{children}</>;
};

// Protected Route wrapper for administrators
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primaryViolet to-brightBlue flex items-center justify-center text-white mb-3 shadow-glossy-light animate-pulse">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
          Checking administrative clearance...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        state={{
          from: location.pathname + location.search,
          message: 'Please sign in with authorized administrator credentials to access the Facility Admin Portal.'
        }}
        replace
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#171F3B] border border-rose-200 dark:border-rose-500/30 shadow-card-light dark:shadow-card-dark text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-500/40">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#172033] dark:text-[#F8FAFC]">Administrative Clearance Required</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your account (<strong className="text-slate-800 dark:text-slate-200">{user.email}</strong>) is currently signed in as a student and is not authorized to access the Facility Admin Console.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-primaryViolet text-white text-xs font-bold shadow-xs hover:bg-violet-700 transition-colors"
            >
              Go to Student Dashboard
            </Link>
            <Link
              to="/admin/login"
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
              Switch to Admin Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Inner Application Layout that responds to DisplayMode
const AppLayout: React.FC = () => {
  const { isMobileMode, toggleDisplayMode } = useDisplayMode();

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isMobileMode
          ? 'mobile-mode-active py-0 sm:py-6 bg-slate-300/60 dark:bg-[#04060E]'
          : 'bg-[#F4F2FF] dark:bg-[#080B18]'
      }`}
    >
      {/* Mobile Mode Preview Bar (Visible on desktop/laptop screens when simulating mobile view) */}
      {isMobileMode && (
        <div className="hidden sm:flex items-center justify-between max-w-[430px] mx-auto mb-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#0F1530]/90 backdrop-blur-md border border-cyan-400/40 text-[11px] font-bold text-cyan-800 dark:text-cyan-300 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            <span>Smartphone Layout Active (430px)</span>
          </div>
          <button
            type="button"
            onClick={toggleDisplayMode}
            className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 hover:bg-cyan-200 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-700/40 transition-colors cursor-pointer"
          >
            Switch to Desktop
          </button>
        </div>
      )}

      {/* Main Presentation Container */}
      <div
        className={`flex-1 flex flex-col w-full text-[#172033] dark:text-[#F8FAFC] transition-all duration-300 ${
          isMobileMode
            ? 'max-w-[430px] mx-auto bg-[#F4F2FF] dark:bg-[#080B18] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] rounded-none sm:rounded-3xl border-x sm:border border-slate-300/80 dark:border-white/10 overflow-hidden'
            : ''
        }`}
      >
        <Navbar />
        <main className={`flex-1 ${isMobileMode ? 'pb-24' : ''}`}>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />

            {/* Mandatory Protected Application Pages */}
            <Route
              path="/submit"
              element={
                <ProtectedUserRoute>
                  <SubmitComplaintPage />
                </ProtectedUserRoute>
              }
            />
            <Route
              path="/track"
              element={
                <ProtectedUserRoute>
                  <TrackComplaintPage />
                </ProtectedUserRoute>
              }
            />
            <Route
              path="/model-eval"
              element={
                <ProtectedUserRoute>
                  <ModelEvaluationPage />
                </ProtectedUserRoute>
              }
            />

            {/* User Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedUserRoute>
                  <UserDashboardPage />
                </ProtectedUserRoute>
              }
            />

            {/* Admin Portal */}
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboardPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/complaints/:publicId"
              element={
                <ProtectedAdminRoute>
                  <AdminComplaintDetailPage />
                </ProtectedAdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DisplayModeProvider>
        <AuthProvider>
          <ComplaintsProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </ComplaintsProvider>
        </AuthProvider>
      </DisplayModeProvider>
    </ThemeProvider>
  );
};

export default App;
