import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import {
  AnalyticsSummary,
  CATEGORIES,
  ChartDataPoint,
  Complaint,
  STATUS_LIST,
} from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  Metric,
  ComplaintTable,
  Pagination,
} from '../components/DashboardParts';

const PAGE_SIZE = 8;

function Distribution({
  data,
  priority = false,
}: {
  data: ChartDataPoint[];
  priority?: boolean;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!data.length || total === 0)
    return <div className="chart-empty">No reports recorded yet</div>;

  return (
    <div className="dist-list">
      {data.map((item) => {
        const tone = priority ? `priority-${item.name.toLowerCase()}` : '';
        return (
          <div className="dist-row" key={item.name}>
            <div className="dist-label">
              <span>{item.name}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="dist-track">
              <div
                className={`dist-fill ${tone}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminDashboardPage() {
  const { theme } = useTheme();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categories, setCategories] = useState<ChartDataPoint[]>([]);
  const [statuses, setStatuses] = useState<ChartDataPoint[]>([]);
  const [priorities, setPriorities] = useState<ChartDataPoint[]>([]);
  const [locations, setLocations] = useState<ChartDataPoint[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'all' | 'critical' | 'analytics'>('all');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);

  // Live debounced search so admins can type without needing an extra Search click
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(draft.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    let current = true;
    Promise.all([
      api.getAnalyticsSummary(),
      api.getCategoriesDistribution(),
      api.getStatusesDistribution(),
      api.getPrioritiesDistribution(),
      api.getLocationsDistribution(),
    ])
      .then(([sum, cats, stats, prios, locs]) => {
        if (current) {
          setSummary(sum);
          setCategories(cats);
          setStatuses(stats);
          setPriorities(prios);
          setLocations(locs);
        }
      })
      .catch(() => {
        if (current)
          setError('Analytics could not be refreshed. Please try again.');
      });
    return () => {
      current = false;
    };
  }, [revision]);

  useEffect(() => {
    setPage(1);
  }, [query, category, priority, status, tab]);

  useEffect(() => {
    if (tab === 'analytics') return;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    api
      .listAdminComplaints({
        query: query || undefined,
        category: category || undefined,
        priority: tab === 'critical' ? 'Critical' : priority || undefined,
        status: status || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      .then((result) => {
        if (id === requestId.current) {
          setComplaints(result.items);
          setTotal(result.total);
        }
      })
      .catch((err) => {
        if (id === requestId.current) {
          setComplaints([]);
          setTotal(0);
          setError(
            err instanceof Error ? err.message : 'Reports could not be loaded.'
          );
        }
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    return () => {
      requestId.current++;
    };
  }, [query, category, priority, status, tab, page, revision]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const clearFilters = () => {
    setDraft('');
    setQuery('');
    setCategory('');
    setPriority('');
    setStatus('');
    setPage(1);
  };

  const hasFilters = Boolean(
    query || category || priority || status || tab === 'critical'
  );
  const tick = theme === 'dark' ? '#a5afbd' : '#667181';

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Triage & overview</h1>
          <p>Review incoming campus reports, assign teams, and track resolution.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button button-outline button-small"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <Link to="/model-eval" className="button button-primary button-small">
            Model evaluation
            <ArrowUpRight />
          </Link>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setRevision((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}

      <div className="metrics-grid">
        <Metric
          label="Total reports"
          value={summary?.total_complaints ?? '—'}
          note="All campus tickets"
          icon={ClipboardList}
        />
        <Metric
          label="Awaiting action"
          value={summary?.open_complaints ?? '—'}
          note="Open or reopened"
          icon={Clock3}
        />
        <Metric
          label="In progress"
          value={summary?.in_progress_complaints ?? '—'}
          note="Active work orders"
          icon={Wrench}
        />
        <Metric
          label="Resolved"
          value={summary?.resolved_complaints ?? '—'}
          note="Closed tickets"
          icon={CheckCircle2}
          tone="resolved"
        />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{tab === 'analytics' ? 'Campus analytics' : 'Report queue'}</h2>
            <p>
              {tab === 'analytics'
                ? 'Category, priority, lifecycle, and location breakdown'
                : 'Open a ticket to assign a department, update status, or resolve'}
            </p>
          </div>
          {tab !== 'analytics' && <span>{total} matching</span>}
        </div>

        <div className="table-tabs" aria-label="Operations view">
          <button
            aria-pressed={tab === 'all'}
            className={tab === 'all' ? 'active' : ''}
            onClick={() => {
              setTab('all');
              setPage(1);
            }}
          >
            All reports
          </button>
          <button
            aria-pressed={tab === 'critical'}
            className={tab === 'critical' ? 'active' : ''}
            onClick={() => {
              setTab('critical');
              setPage(1);
            }}
          >
            Critical
            <span className="tab-count">
              {summary?.critical_complaints ?? '—'}
            </span>
          </button>
          <button
            aria-pressed={tab === 'analytics'}
            className={tab === 'analytics' ? 'active' : ''}
            onClick={() => setTab('analytics')}
          >
            Analytics
          </button>
        </div>

        {tab !== 'analytics' ? (
          <>
            <form
              className="table-toolbar admin-toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(draft.trim());
                setPage(1);
              }}
            >
              <label className="search-field">
                <Search />
                <span className="sr-only">Search campus reports</span>
                <input
                  type="search"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Search title, tracking ID, location..."
                />
              </label>
              <div className="filter-group">
                <select
                  className="filter-control"
                  aria-label="Category"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                {tab !== 'critical' && (
                  <select
                    className="filter-control"
                    aria-label="Priority"
                    value={priority}
                    onChange={(event) => {
                      setPriority(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All priorities</option>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                )}
                <select
                  className="filter-control"
                  aria-label="Status"
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
                {hasFilters && (
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => {
                      clearFilters();
                      setTab('all');
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            <ComplaintTable
              items={complaints}
              loading={loading}
              filtered={hasFilters}
              admin
            />

            <Pagination
              page={currentPage}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        ) : (
          <div className="panel-body">
            <div className="analytics-grid secondary">
              <section className="analytics-card">
                <h3 className="subchart-title">Top categories</h3>
                {categories.length ? (
                  <div
                    className="chart-wrap"
                    role="img"
                    aria-label={categories
                      .map((item) => `${item.name}: ${item.value}`)
                      .join(', ')}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...categories]
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 6)}
                        margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke={theme === 'dark' ? '#303844' : '#e3e7ec'}
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: tick, fontSize: 10 }}
                          tickFormatter={(value) =>
                            value === 'Other'
                              ? value
                              : String(value).split(' ').slice(0, 2).join(' ')
                          }
                          interval={0}
                          height={44}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: tick, fontSize: 10 }}
                        />
                        <Tooltip
                          cursor={{
                            fill: theme === 'dark' ? '#222a35' : '#f2f4f7',
                          }}
                          contentStyle={{
                            border: '1px solid var(--line)',
                            borderRadius: 8,
                            background: 'var(--surface)',
                            fontSize: 12,
                            color: 'var(--text-primary)',
                          }}
                        />
                        <Bar
                          dataKey="value"
                          name="Reports"
                          fill="#3679d5"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={36}
                          isAnimationActive={
                            !window.matchMedia('(prefers-reduced-motion: reduce)')
                              .matches
                          }
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="chart-empty">No category data yet</div>
                )}
              </section>

              <section className="analytics-card">
                <h3 className="subchart-title">Priority breakdown</h3>
                <Distribution
                  data={['Critical', 'High', 'Medium', 'Low'].map((name) => ({
                    name,
                    value:
                      priorities.find((item) => item.name === name)?.value || 0,
                  }))}
                  priority
                />
              </section>

              <section className="analytics-card">
                <h3 className="subchart-title">Report lifecycle</h3>
                <Distribution data={statuses} />
              </section>

              <section className="analytics-card">
                <h3 className="subchart-title">Location hotspots</h3>
                <Distribution
                  data={[...locations]
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 6)}
                />
              </section>
            </div>
            <p className="operations-note">
              {summary?.avg_resolution_hours != null
                ? `Average resolution time: ${summary.avg_resolution_hours.toFixed(1)} hours.`
                : 'Average resolution time appears once reports are marked resolved.'}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
