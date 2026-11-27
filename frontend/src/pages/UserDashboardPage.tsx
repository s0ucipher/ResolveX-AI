import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  FilePlus2,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react';
import { useComplaints } from '../context/ComplaintsContext';
import {
  Metric,
  ComplaintTable,
  Pagination,
} from '../components/DashboardParts';
import { STATUS_LIST } from '../types';

const PAGE_SIZE = 8;

export function UserDashboardPage() {
  const { complaints, loading, error, stats, refreshComplaints } =
    useComplaints();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'all' | 'active' | 'resolved'>('all');
  const [page, setPage] = useState(1);

  const active = complaints.filter(
    (item) => !['Resolved', 'Rejected'].includes(item.status)
  ).length;

  const filtered = complaints
    .filter((item) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        [item.title, item.public_id, item.category, item.location].some(
          (value) => value.toLowerCase().includes(q)
        );
      return (
        matchesQuery &&
        (!status || item.status === status) &&
        (tab === 'all' ||
          (tab === 'resolved'
            ? item.status === 'Resolved'
            : !['Resolved', 'Rejected'].includes(item.status)))
      );
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>My complaints</h1>
          <p>Track the status and resolution history of your campus reports.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button button-outline button-small"
            onClick={() => void refreshComplaints()}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <Link to="/submit" className="button button-primary button-small">
            <FilePlus2 />
            New report
          </Link>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error} Your available records are shown below.</span>
          <button onClick={() => void refreshComplaints()}>Retry</button>
        </div>
      )}

      <div className="metrics-grid">
        <Metric
          label="Total reports"
          value={loading && !complaints.length ? '—' : stats.total}
          note="Submitted by you"
          icon={ClipboardList}
        />
        <Metric
          label="Awaiting action"
          value={stats.openCount}
          note="Open or reopened"
          icon={Clock3}
        />
        <Metric
          label="In progress"
          value={stats.inProgressCount}
          note="Being worked on"
          icon={Wrench}
        />
        <Metric
          label="Resolved"
          value={stats.resolvedCount}
          note="Completed"
          icon={CheckCircle2}
          tone="resolved"
        />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Report history</h2>
            <p>Click any report to view its timeline and resolution notes</p>
          </div>
          {loading && (
            <RefreshCw size={15} className="spin" aria-label="Refreshing" />
          )}
        </div>

        <div className="table-tabs" aria-label="Filter reports">
          <button
            aria-pressed={tab === 'all'}
            className={tab === 'all' ? 'active' : ''}
            onClick={() => {
              setTab('all');
              setPage(1);
            }}
          >
            All<span className="tab-count">{stats.total}</span>
          </button>
          <button
            aria-pressed={tab === 'active'}
            className={tab === 'active' ? 'active' : ''}
            onClick={() => {
              setTab('active');
              setPage(1);
            }}
          >
            Active<span className="tab-count">{active}</span>
          </button>
          <button
            aria-pressed={tab === 'resolved'}
            className={tab === 'resolved' ? 'active' : ''}
            onClick={() => {
              setTab('resolved');
              setPage(1);
            }}
          >
            Resolved<span className="tab-count">{stats.resolvedCount}</span>
          </button>
        </div>

        <div className="table-toolbar">
          <label className="search-field">
            <Search />
            <span className="sr-only">Search your reports</span>
            <input
              type="search"
              placeholder="Search title, tracking ID, location..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Filter by status"
            className="filter-control"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUS_LIST.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          {(query || status || tab !== 'all') && (
            <button
              className="button button-outline button-small"
              onClick={() => {
                setQuery('');
                setStatus('');
                setTab('all');
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>

        <ComplaintTable
          items={filtered.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE
          )}
          loading={loading}
          filtered={Boolean(query || status || tab !== 'all')}
        />

        <Pagination
          page={currentPage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </section>
    </>
  );
}
