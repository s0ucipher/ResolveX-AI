import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  MapPin,
  SearchX,
} from 'lucide-react';
import { Complaint } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/dateTime';
import { AnimatedNumber } from './AnimatedNumber';
import type { LucideIcon } from 'lucide-react';

export function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone = '',
}: {
  label: string;
  value: number | string;
  note: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <Icon />
      </div>
      <strong className="metric-value"><AnimatedNumber value={value} /></strong>
      <span className="metric-note">{note}</span>
    </div>
  );
}
export function ComplaintTable({
  items,
  loading,
  filtered,
  admin = false,
}: {
  items: Complaint[];
  loading: boolean;
  filtered: boolean;
  admin?: boolean;
}) {
  if (loading && !items.length)
    return (
      <div className="state-block" role="status">
        <Loader2 className="spin" />
        <h3>Loading reports</h3>
        <p>Fetching the latest updates for your workspace.</p>
      </div>
    );
  if (!items.length)
    return (
      <div className="state-block">
        {filtered ? <SearchX /> : <Inbox />}
        <h3>{filtered ? 'No matching reports' : 'A clean slate'}</h3>
        <p>
          {filtered
            ? 'Try a different search or clear your filters.'
            : admin
              ? 'Incoming campus reports will appear here for review.'
              : 'Your reports and progress updates will live here. Start with an issue you’ve noticed on campus.'}
        </p>
        {!filtered && !admin && (
          <Link to="/submit" className="button button-primary button-small">
            Create your first report
            <ArrowUpRight />
          </Link>
        )}
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="complaint-table">
        <caption className="sr-only">
          {admin ? 'Campus reports' : 'Your campus reports'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Report & location</th>
            <th scope="col">Tracking ID</th>
            <th scope="col">Category</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
            <th scope="col">Reported</th>
            <th scope="col">
              <span className="sr-only">Open report</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.public_id}>
              <td>
                <Link
                  className="ticket-title"
                  to={
                    admin
                      ? `/admin/complaints/${encodeURIComponent(item.public_id)}`
                      : `/track?id=${encodeURIComponent(item.public_id)}`
                  }
                >
                  {item.title}
                </Link>
                <span className="ticket-subtitle">
                  <MapPin />
                  {item.location}
                </span>
              </td>
              <td>
                <span className="ticket-id">{item.public_id}</span>
              </td>
              <td>
                <span className="ticket-category">{item.category}</span>
              </td>
              <td>
                <PriorityBadge priority={item.final_priority} />
              </td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td className="whitespace-nowrap">
                {formatDate(item.created_at)}
              </td>
              <td>
                <Link
                  className="row-action"
                  aria-label={`View report ${item.public_id}`}
                  to={
                    admin
                      ? `/admin/complaints/${encodeURIComponent(item.public_id)}`
                      : `/track?id=${encodeURIComponent(item.public_id)}`
                  }
                >
                  <ArrowUpRight />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="table-foot">
      <span>
        {total
          ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} reports`
          : '0 reports'}
      </span>
      <div className="pagination">
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
