import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from './Brand';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-cta">
        <div>
          <p className="eyebrow light">Small reports. Meaningful change.</p>
          <h2>
            Let’s make campus
            <br />
            work better.
          </h2>
        </div>
        <Link to="/submit" className="button button-light">
          Report an issue
          <ArrowUpRight />
        </Link>
      </div>
      <div className="footer-columns">
        <div>
          <Brand />
          <p>
            A clearer path from campus issues
            <br />
            to the people who can resolve them.
          </p>
        </div>
        <nav aria-label="Student links">
          <span>For students</span>
          <Link to="/submit">Report an issue</Link>
          <Link to="/track">Track your report</Link>
          <Link to="/dashboard">Your dashboard</Link>
        </nav>
        <nav aria-label="Administrator links">
          <span>For campus teams</span>
          <Link to="/admin/login">Administrator sign in</Link>
          <Link to="/admin">Operations dashboard</Link>
          <Link to="/model-eval">Model evaluation</Link>
        </nav>
        <div className="footer-note">
          <span>Technology with accountability</span>
          <p>
            AI recommends a category and priority.
            <br />
            Your campus team makes the final call.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} ResolveXAI</span>
        <span>Report smarter. Resolve together.</span>
        <Link to="/">Back to top ↑</Link>
      </div>
    </footer>
  );
}
