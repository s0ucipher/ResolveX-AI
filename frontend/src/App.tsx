import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { UserDashboardPage } from './pages/UserDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminComplaintDetailPage } from './pages/AdminComplaintDetailPage';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';

// Protected Route wrapper for regular authenticated users
const ProtectedUserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-slate-500 font-mono text-xs">Authenticating...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Protected Route wrapper for administrators
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="p-12 text-center text-slate-500 font-mono text-xs">Checking permissions...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
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
            <Route path="/" element={<HomePage />} />
            <Route path="/submit" element={<SubmitComplaintPage />} />
            <Route path="/track" element={<TrackComplaintPage />} />
            <Route path="/model-eval" element={<ModelEvaluationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

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
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </AuthProvider>
      </DisplayModeProvider>
    </ThemeProvider>
  );
};

export default App;
