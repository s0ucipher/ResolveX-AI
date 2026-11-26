import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ClipboardList,
  FilePlus2,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Brand } from './Brand';
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  const adminArea = isAdmin;
  return (
    <div className="workspace">
      <div className="workspace-mobile-header">
        <Brand />
        <button
          className="icon-button"
          aria-label={
            open ? 'Close workspace navigation' : 'Open workspace navigation'
          }
          aria-expanded={open}
          aria-controls="workspace-sidebar"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="workspace-sidebar"
        className={`workspace-sidebar ${open ? 'is-open' : ''}`}
      >
        <Brand />
        <span className="sidebar-caption">
          {adminArea ? 'Campus operations console' : 'Student workspace'}
        </span>
        <nav aria-label="Workspace navigation">
          {adminArea ? (
            <>
              <NavLink to="/admin" end>
                <LayoutDashboard />
                Triage & overview
              </NavLink>
              <NavLink to="/model-eval">
                <ChartNoAxesCombined />
                Model evaluation
              </NavLink>
              <NavLink to="/">
                <House />
                Back to website
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" end>
                <LayoutDashboard />
                My complaints
              </NavLink>
              <NavLink to="/submit">
                <FilePlus2 />
                New report
              </NavLink>
              <NavLink to="/track">
                <Search />
                Track a report
              </NavLink>
              <NavLink to="/model-eval">
                <ChartNoAxesCombined />
                Model evaluation
              </NavLink>
              <NavLink to="/">
                <House />
                Back to website
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-help">
          <ClipboardList />
          <h3>Every report matters</h3>
          <p>
            Keep your tracking ID handy. You can follow every step toward
            resolution.
          </p>
          <Link to="/track">
            Track a report
            <ArrowUpRight />
          </Link>
        </div>
        <div className="sidebar-account">
          <span className="avatar">
            {user?.name?.slice(0, 1).toUpperCase() || 'U'}
          </span>
          <div>
            <strong>{user?.name}</strong>
            <span>{adminArea ? 'Administrator' : 'Student account'}</span>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut />
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <span>
            Workspace <span className="breadcrumb-divider">/</span>{' '}
            <strong>
              {adminArea
                ? 'Operations'
                : pathname === '/dashboard'
                  ? 'Overview'
                  : pathname === '/submit'
                    ? 'New report'
                    : pathname === '/track'
                      ? 'Tracking'
                      : 'Model evaluation'}
            </strong>
          </span>
          <div>
            <span className="campus-label">Campus services</span>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
          </div>
        </header>
        <main
          id="main-content"
          className={`workspace-content ${pathname === '/dashboard' || pathname === '/admin' ? '' : 'legacy-page'}`}
        >
          {children}
        </main>
        <div className="workspace-bottom">
          <span>ComplainAI · Campus care, connected</span>
          <span>AI assisted. Human reviewed.</span>
        </div>
      </div>
    </div>
  );
}
