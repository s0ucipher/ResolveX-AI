/**
 * Parses an ISO-8601 timestamp string from the backend.
 * If the string has no explicit timezone offset (naive UTC), appends 'Z'
 * so the browser interprets it as UTC before formatting to local time (e.g. Asia/Kolkata).
 */
export function parseUtcTimestamp(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(trimmed);
  const normalized = hasZone ? trimmed : `${trimmed}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(value?: string | null): string {
  const d = parseUtcTimestamp(value);
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value?: string | null): string {
  const d = parseUtcTimestamp(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
