import { Link } from 'react-router-dom';
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="ResolveXAI home">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M24 7H11a6 6 0 0 0-6 6v11l6-5h10a6 6 0 0 0 6-6V7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="m12 12 4 4L28 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        ResolveX<span className="brand-ai">AI</span>
      </span>
    </Link>
  );
}
