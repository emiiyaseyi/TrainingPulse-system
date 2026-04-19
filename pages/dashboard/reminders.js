import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function RemindersPage() {
  const [stats, setStats] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/participants?action=stats').then(r => r.json()).then(setStats);
  }, []);

  async function runJob() {
    setRunning(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/reminders/trigger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-job' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.log);
      const s = await fetch('/api/admin/participants?action=stats').then(r => r.json());
      setStats(s);
    } catch (err) { setError(err.message); }
    finally { setRunning(false); }
  }

  return (
    <Layout title="Reminders">
      <div style={{ maxWidth: 700 }}>
        {result && (
          <div className="alert alert-success">
            Job complete — Pre: {result.pre} · Post: {result.post} · Manager: {result.manager} emails sent.
            {result.errors?.length > 0 && ` ${result.errors.length} failed.`}
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="grid-2" style={{ marginBottom: 24 }}>
          {[
            { label: 'Post Reminders Queued', value: stats?.pendingPostReminders, color: 'yellow', desc: 'Will send on next job run' },
            { label: 'Manager Reminders Queued', value: stats?.pendingManagerReminders, color: 'red', desc: 'Will send on next job run' },
            { label: 'Post Surveys Pending', value: stats?.postPending, color: 'blue', desc: 'Employees who haven\'t submitted' },
            { label: 'Manager Feedback Pending', value: stats?.managerPending, color: 'blue', desc: 'Managers who haven\'t responded' },
          ].map(c => (
            <div key={c.label} className={`stat-card ${c.color}`}>
              <div className="stat-value">{c.value ?? <span className="spinner" />}</div>
              <div className="stat-label">{c.label}</div>
              <div className="stat-sub">{c.desc}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Manual Job Trigger</span></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 20 }}>
            The cron job runs daily at 09:00. Use this to trigger it manually for testing or immediate sends.
          </p>
          <button className="btn btn-primary btn-lg" onClick={runJob} disabled={running} style={{ width: '100%', justifyContent: 'center' }}>
            {running ? <><span className="spinner" />&nbsp;Processing all due reminders…</> : '▶ Run Reminder Job Now'}
          </button>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
            <strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: 10 }}>How the job works:</strong>
            <ul style={{ fontSize: '0.82rem', color: 'var(--text-2)', paddingLeft: 20, lineHeight: 2 }}>
              <li>Reads all participants from master Excel file</li>
              <li>Sends <strong>pre-training</strong> reminders to employees with no Pre Status</li>
              <li>Sends <strong>post-training</strong> reminders after the grace period (default: 2 days)</li>
              <li>Sends <strong>manager feedback</strong> reminders after 30 days</li>
              <li>Skips anyone who has already completed (Status = Yes)</li>
              <li>Respects max reminder count and frequency settings</li>
              <li>Updates Last Sent date and Count in Excel file</li>
              <li>3-second delay between each email to avoid spam flags</li>
            </ul>
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><span className="card-title">Cron Setup (Vercel)</span></div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-2)', marginBottom: 14 }}>
            Add this to your <code style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>vercel.json</code> to schedule the daily job:
          </p>
          <pre style={{
            background: 'var(--surface-2)', padding: 16, borderRadius: 8,
            fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--accent-2)',
            overflow: 'auto', lineHeight: 1.7
          }}>{`{
  "crons": [{
    "path": "/api/reminders/cron",
    "schedule": "0 9 * * *"
  }]
}`}</pre>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 10 }}>
            Set <code style={{ fontFamily: 'var(--mono)' }}>CRON_SECRET</code> in your env vars and pass it as a header for security.
          </p>
        </div>
      </div>
    </Layout>
  );
}
