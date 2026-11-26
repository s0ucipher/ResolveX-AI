import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { api } from '../services/api';
import {
  AnalyticsSummary,
  ChartDataPoint,
  Complaint,
  CATEGORIES,
  STATUS_LIST,
} from '../types';
import {
  Metric,
  ComplaintTable,
  Pagination,
} from '../components/DashboardParts';
import { useTheme } from '../context/ThemeContext';
const PAGE_SIZE = 8;
function Distribution({
  data,
  priority = false,
}: {
  data: ChartDataPoint[];
  priority?: boolean;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (!data.length)
    return <div className="chart-empty">No report data to display yet</div>;
  const colors: Record<string, string> = {
    Critical: '#bd555b',
    High: '#b58a40',
    Medium: '#3679d5',
    Low: '#9ca8b7',
  };
  return (
    <div className="chart-bars">
      {data.map((item) => (
        <div key={item.name}>
          <div className="distribution-label">
            <span>{item.name}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="distribution-track">
            <div
              className="distribution-fill"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: priority ? colors[item.name] : undefined,
              }}
            />
          </div>
        </div>
      ))}
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
          <p className="eyebrow">Campus operations</p>
          <h1>A clearer picture. Better decisions.</h1>
          <p>
            Review what needs attention, get the right teams involved, and
            follow the work through.
          </p>
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
          label="Campus reports"
          value={summary?.total_complaints ?? '—'}
          note="All recorded reports"
          icon={ClipboardList}
        />
        <Metric
          label="Awaiting action"
          value={summary?.open_complaints ?? '—'}
          note="Open reports requiring attention"
          icon={Clock3}
        />
        <Metric
          label="In progress"
          value={summary?.in_progress_complaints ?? '—'}
          note="Work currently underway"
          icon={Wrench}
        />
        <Metric
          label="Resolved"
          value={summary?.resolved_complaints ?? '—'}
          note="Completed and recorded"
          icon={CheckCircle2}
          tone="resolved"
        />
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Reports by category</h2>
              <p>Where campus needs attention</p>
            </div>
            <span>All time</span>
          </div>
          {categories.length ? (
            <>
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
                      height={48}
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
                      maxBarSize={40}
                      isAnimationActive={!window.matchMedia('(prefers-reduced-motion: reduce)').matches} animationDuration={1000} animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-caption">
                The six most reported categories ·{' '}
                {categories.reduce((sum, item) => sum + item.value, 0)} total
                reports
              </p>
            </>
          ) : (
            <div className="chart-empty">
              {summary
                ? 'Category trends appear when reports are submitted'
                : 'Loading category data…'}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Priority overview</h2>
              <p>Urgency, with a reason behind it</p>
            </div>
            <ShieldAlert size={18} />
          </div>
          <Distribution
            data={['Critical', 'High', 'Medium', 'Low'].map((name) => ({
              name,
              value: priorities.find((item) => item.name === name)?.value || 0,
            }))}
            priority
          />
          <div className="chart-caption">
            {summary?.high_critical_complaints ?? '—'} high or critical reports
            · {summary?.critical_complaints ?? '—'} critical
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Report queue</h2>
            <p>Review recommendations and move reports toward resolution</p>
          </div>
          <span>{total} matching reports</span>
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
            Critical queue
            <span className="tab-count">
              {summary?.critical_complaints ?? '—'}
            </span>
          </button>
          <button
            aria-pressed={tab === 'analytics'}
            className={tab === 'analytics' ? 'active' : ''}
            onClick={() => setTab('analytics')}
          >
            More analytics
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
                  placeholder="Search reports or tracking IDs..."
                />
              </label>
              <button
                className="button button-outline button-small"
                type="submit"
              >
                Search
              </button>
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
                    {['Critical', 'High', 'Medium', 'Low'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
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
              </div>
            </form>
            {hasFilters && (
              <div className="active-filter-note">
                <span>
                  {tab === 'critical'
                    ? 'Showing critical reports'
                    : 'Filters applied'}
                </span>
                <button
                  onClick={() => {
                    clearFilters();
                    setTab('all');
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
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
              <section>
                <h3 className="subchart-title">Report lifecycle</h3>
                <Distribution data={statuses} />
              </section>
              <section>
                <h3 className="subchart-title">Location hotspots</h3>
                <Distribution
                  data={[...locations]
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 6)}
                />
              </section>
            </div>
            <p className="operations-note">
              <Clock3 />
              Average resolution time:{' '}
              {summary?.avg_resolution_hours != null
                ? `${summary.avg_resolution_hours.toFixed(1)} hours`
                : 'Available after the first resolution'}
            </p>
          </div>
        )}
      </section>
      <p className="operations-note">
        <ShieldCheck />
        AI recommendations support your decisions. Every administrative change
        is recorded in the report timeline.
      </p>
    </>
  );
}
