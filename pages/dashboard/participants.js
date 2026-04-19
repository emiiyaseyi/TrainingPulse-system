import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';

const STATUS_TYPES = ['', 'pre-pending', 'post-pending', 'manager-pending', 'completed'];
const STATUS_LABELS = { '': 'All', 'pre-pending': 'Pre Pending', 'post-pending': 'Post Pending', 'manager-pending': 'Manager Pending', 'completed': 'All Complete' };

function StatusBadge({ value }) {
  if (value?.toLowerCase() === 'yes') return <span className="badge badge-success">✓ Done</span>;
  return <span className="badge badge-warning">Pending</span>;
}

export default function ParticipantsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sendModal, setSendModal] = useState(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const LIMIT = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, search, status });
      const res = await fetch(`/api/admin/participants?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function sendReminder(email, trainingName, type) {
    setSending(true); setMsg(''); setError('');
    try {
      const res = await fetch('/api/reminders/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-one', email, trainingName, type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg(json.message);
      setSendModal(null);
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  async function deleteRecord(email, trainingName) {
    if (!confirm('Delete this participant record?')) return;
    await fetch('/api/admin/participants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, trainingName }),
    });
    fetchData();
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <Layout title="Participants">
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search name, email, training…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 260, flex: 'none' }}
        />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ width: 180, flex: 'none' }}>
          {STATUS_TYPES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <span style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginLeft: 'auto' }}>{total} records</span>
        <a href="/api/admin/participants?action=download" className="btn btn-secondary btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Excel
        </a>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Training</th><th>Date</th>
                <th>Pre</th><th>Post</th><th>Manager</th>
                <th>Post Sent</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No records found</td></tr>
              ) : data.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.Name}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{r.Email}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r['Training Name']}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{r['Training Date']}</td>
                  <td><StatusBadge value={r['Pre Status']} /></td>
                  <td><StatusBadge value={r['Post Status']} /></td>
                  <td><StatusBadge value={r['Manager Status']} /></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    {r['Post Count'] > 0 ? `${r['Post Count']}x sent` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSendModal(r)} title="Send reminder">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteRecord(r.Email, r['Training Name'])}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '14px 16px', borderTop: '1px solid var(--border)', justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ padding: '5px 12px', fontSize: '0.82rem', color: 'var(--text-2)' }}>Page {page} of {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {sendModal && (
        <div className="modal-overlay" onClick={() => setSendModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Send Reminder</strong>
              <button onClick={() => setSendModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, fontSize: '0.88rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text)' }}>{sendModal.Name}</strong> · {sendModal['Training Name']}
              </p>
              {error && <div className="alert alert-error">{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => sendReminder(sendModal.Email, sendModal['Training Name'], 'pre')} disabled={sending}>
                  Send Pre-Training Reminder → {sendModal.Email}
                </button>
                <button className="btn btn-secondary" onClick={() => sendReminder(sendModal.Email, sendModal['Training Name'], 'post')} disabled={sending}>
                  Send Post-Training Reminder → {sendModal.Email}
                </button>
                <button className="btn btn-secondary" onClick={() => sendReminder(sendModal['Manager Email'] || sendModal.Email, sendModal['Training Name'], 'manager')} disabled={sending} title={sendModal['Manager Email'] || 'No manager email'}>
                  Send Manager Reminder → {sendModal['Manager Email'] || '(no manager email)'}
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSendModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
