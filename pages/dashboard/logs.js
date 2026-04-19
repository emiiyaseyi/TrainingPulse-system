import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/admin/participants?action=logs')
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const filtered = filter ? logs.filter(l => l.type === filter || l.status === filter) : logs;

  return (
    <Layout title="Activity Logs">
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All Activity</option>
          <option value="pre">Pre-Training</option>
          <option value="post">Post-Training</option>
          <option value="manager">Manager</option>
          <option value="sent">Sent Only</option>
          <option value="failed">Failed Only</option>
        </select>
        <span style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginLeft: 'auto' }}>{filtered.length} entries</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Type</th><th>Recipient</th><th>Participant</th><th>Training</th><th>Status</th><th>Error</th><th>Timestamp</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No logs yet</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id}>
                  <td><span className={`badge badge-${log.type === 'manager' ? 'info' : log.type === 'post' ? 'warning' : 'success'}`}>{log.type}</span></td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.77rem' }}>{log.to}</td>
                  <td>{log.participant}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{log.trainingName}</td>
                  <td><span className={`badge badge-${log.status === 'sent' ? 'success' : 'danger'}`}>{log.status}</span></td>
                  <td style={{ color: 'var(--danger)', fontSize: '0.77rem' }}>{log.error || '—'}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.77rem', whiteSpace: 'nowrap' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
