import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/router';

function StatCard({ value, label, sub, color, icon }) {
  return (
    <div
      className={`stat-card ${color}`}
      style={{ transition: 'transform 0.15s', cursor: 'default' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="stat-value">{value !== undefined && value !== null ? value : <span className="spinner" />}</div>
        <div style={{ opacity: 0.35, marginTop: 4 }}>{icon}</div>
      </div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [jobResult, setJobResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/participants?action=stats');
      if (res.status === 401) { router.push('/'); return; }
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch('/api/admin/participants?action=logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (e) {
      console.error(e);
    }
  }

  async function runJob() {
    setRunning(true);
    setJobResult(null);
    setError('');
    try {
      const res = await fetch('/api/reminders/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-job' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJobResult(data.log);
      fetchStats();
      fetchLogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  const completionRate =
    stats && stats.total > 0
      ? Math.round((stats.postCompleted / stats.total) * 100)
      : 0;

  const progressBars = [
    { key: 'pre', label: 'Pre-Training Survey', color: '#06b6d4' },
    { key: 'post', label: 'Post-Training Survey', color: '#3b82f6' },
    { key: 'manager', label: 'Manager Feedback', color: '#8b5cf6' },
  ];

  return (
    <Layout title="Dashboard">
      <div style={{ maxWidth: 1100 }}>

        {/* Stat cards */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <StatCard
            value={stats ? stats.total : null}
            label="Total Participants"
            color="blue"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
          />
          <StatCard
            value={stats ? completionRate + '%' : null}
            label="Post-Training Complete"
            sub={stats ? `${stats.postCompleted} of ${stats.total}` : ''}
            color="green"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            }
          />
          <StatCard
            value={stats ? stats.postPending : null}
            label="Post Reminders Pending"
            sub="Awaiting submission"
            color="yellow"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            }
          />
          <StatCard
            value={stats ? stats.managerPending : null}
            label="Manager Feedback Due"
            sub="Awaiting response"
            color="red"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            }
          />
        </div>

        {/* Progress + Run Job */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Survey Completion Overview</span>
            </div>
            {progressBars.map(({ key, label, color }) => {
              const completed = stats ? (stats[key + 'Completed'] || 0) : 0;
              const total = stats ? stats.total || 1 : 1;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {pct}%{' '}
                      <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                        ({completed}/{stats ? stats.total : 0})
                      </span>
                    </span>
                  </div>
                  <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', borderRadius: 4, background: color, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Run Reminders Now</span></div>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-2)', marginBottom: 16 }}>
              Manually trigger the reminder job to process and send all due reminders immediately.
            </p>
            {jobResult && (
              <div className="alert alert-success" style={{ marginBottom: 12 }}>
                Sent: {jobResult.pre} pre &middot; {jobResult.post} post &middot; {jobResult.manager} manager
                {jobResult.errors && jobResult.errors.length > 0 && ` · ${jobResult.errors.length} errors`}
              </div>
            )}
            {error && <div className="alert alert-error">{error}</div>}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={runJob}
              disabled={running}
            >
              {running ? (
                <><span className="spinner" />&nbsp;Running&hellip;</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Run Reminder Job
                </>
              )}
            </button>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 10, textAlign: 'center' }}>
              Also runs automatically daily at 09:00 via cron
            </p>
          </div>
        </div>

        {/* Recent logs */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
            <a href="/dashboard/logs" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>
              View all &rarr;
            </a>
          </div>
          {logs.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>
              No activity yet. Run the reminder job or wait for the daily cron.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Recipient</th>
                    <th>Participant</th>
                    <th>Training</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <span className={'badge badge-' + (log.type === 'manager' ? 'info' : log.type === 'post' ? 'warning' : 'success')}>
                          {log.type}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{log.to}</td>
                      <td>{log.participant}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.trainingName}
                      </td>
                      <td>
                        <span className={'badge badge-' + (log.status === 'sent' ? 'success' : 'danger')}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
