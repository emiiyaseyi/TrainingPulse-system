import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';

const TYPES = [
  { key: 'pre', label: 'Pre-Training', color: '#06b6d4', statusField: 'Pre Status' },
  { key: 'post', label: 'Post-Training', color: '#3b82f6', statusField: 'Post Status' },
  { key: 'manager', label: 'Manager Feedback', color: '#8b5cf6', statusField: 'Manager Status' },
];

export default function HistoryPage() {
  const [activeType, setActiveType] = useState('post');
  const [logs, setLogs] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  const currentType = TYPES.find(t => t.key === activeType);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, partRes] = await Promise.all([
        fetch(`/api/admin/participants?action=logs&type=${activeType}`),
        fetch('/api/admin/participants?limit=1000'),
      ]);
      const logsData = await logsRes.json();
      const partData = await partRes.json();
      setLogs(Array.isArray(logsData) ? logsData : []);
      setParticipants(partData.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Get unique participants who have received this type of email
  const sentEmails = new Set(logs.map(l => `${l.to}|${l.trainingName}`));
  const sentParticipants = participants.filter(p => {
    const email = activeType === 'manager' ? p['Manager Email'] : p.Email;
    return sentEmails.has(`${email}|${p['Training Name']}`);
  });

  const filtered = search
    ? sentParticipants.filter(p =>
        p.Name?.toLowerCase().includes(search.toLowerCase()) ||
        p.Email?.toLowerCase().includes(search.toLowerCase()) ||
        p['Training Name']?.toLowerCase().includes(search.toLowerCase())
      )
    : sentParticipants;

  async function markComplete(participant, completed) {
    const key = `${participant.Email}|${participant['Training Name']}`;
    setUpdating(key);
    setMsg('');
    try {
      const res = await fetch('/api/admin/participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: participant.Email,
          trainingName: participant['Training Name'],
          updates: { [currentType.statusField]: completed ? 'Yes' : '' },
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setMsg(`${participant.Name} marked as ${completed ? 'completed ✓' : 'pending'}`);
      setTimeout(() => setMsg(''), 3000);
      fetchData();
    } catch (e) {
      setMsg('Error: ' + e.message);
    } finally {
      setUpdating(null);
    }
  }

  // Count of last send per participant
  function getLastSendInfo(participant) {
    const email = activeType === 'manager' ? participant['Manager Email'] : participant.Email;
    const myLogs = logs.filter(l => l.to === email && l.trainingName === participant['Training Name']);
    const lastLog = myLogs[0];
    const count = activeType === 'pre' ? participant['Pre Count']
      : activeType === 'post' ? participant['Post Count']
      : participant['Manager Count'];
    return { count: count || myLogs.length, lastSent: lastLog?.timestamp };
  }

  function isComplete(participant) {
    return (participant[currentType.statusField] || '').toLowerCase() === 'yes';
  }

  const completedCount = filtered.filter(isComplete).length;
  const pendingCount = filtered.filter(p => !isComplete(p)).length;

  return (
    <Layout title="Send History">
      <div style={{ maxWidth: 1000 }}>
        {msg && <div className="alert alert-success">{msg}</div>}

        {/* Type tabs */}
        <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
          {TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              style={{
                padding:'10px 20px', borderRadius:'var(--radius)', border:'1px solid',
                borderColor: activeType === t.key ? t.color : 'var(--border)',
                background: activeType === t.key ? `${t.color}18` : 'var(--surface)',
                color: activeType === t.key ? t.color : 'var(--text-2)',
                cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, fontSize:'0.88rem',
                transition:'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Summary bar */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:24 }}>
          <div className="stat-card blue" style={{ padding:'14px 16px' }}>
            <div className="stat-value" style={{ fontSize:'1.5rem' }}>{loading ? '…' : filtered.length}</div>
            <div className="stat-label">Total Emailed</div>
          </div>
          <div className="stat-card green" style={{ padding:'14px 16px' }}>
            <div className="stat-value" style={{ fontSize:'1.5rem', color:'var(--success)' }}>{loading ? '…' : completedCount}</div>
            <div className="stat-label">Completed</div>
            <div className="stat-sub">Excluded from next send</div>
          </div>
          <div className="stat-card yellow" style={{ padding:'14px 16px' }}>
            <div className="stat-value" style={{ fontSize:'1.5rem' }}>{loading ? '…' : pendingCount}</div>
            <div className="stat-label">Still Pending</div>
            <div className="stat-sub">Will receive next reminder</div>
          </div>
        </div>

        {/* Search + info */}
        <div style={{ display:'flex', gap:12, marginBottom:16, alignItems:'center' }}>
          <input
            placeholder={`Search ${currentType.label} recipients…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth:320 }}
          />
          <div style={{ marginLeft:'auto', fontSize:'0.8rem', color:'var(--text-3)', display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--success)' }} />
            Completed = excluded from future sends
          </div>
        </div>

        <div className="card" style={{ padding:0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Training</th>
                  <th>Date</th>
                  <th>Reminders Sent</th>
                  <th>Last Sent</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:40 }}><span className="spinner" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>
                      No {currentType.label} emails sent yet. Upload participants and run reminders to see history here.
                    </td>
                  </tr>
                ) : filtered.map((p, i) => {
                  const info = getLastSendInfo(p);
                  const done = isComplete(p);
                  const key = `${p.Email}|${p['Training Name']}`;
                  return (
                    <tr key={i} style={{ opacity: done ? 0.65 : 1 }}>
                      <td style={{ fontWeight:500 }}>
                        {done && <span style={{ color:'var(--success)', marginRight:6 }}>✓</span>}
                        {p.Name}
                      </td>
                      <td style={{ fontFamily:'var(--mono)', fontSize:'0.77rem' }}>{p.Email}</td>
                      <td style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'0.82rem' }}>
                        {p['Training Name']}
                      </td>
                      <td style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>{p['Training Date'] || '—'}</td>
                      <td style={{ textAlign:'center' }}>
                        <span style={{
                          display:'inline-block', minWidth:28, padding:'2px 8px',
                          background:'var(--surface-3)', borderRadius:20,
                          fontSize:'0.78rem', fontWeight:600, fontFamily:'var(--mono)',
                        }}>{info.count}</span>
                      </td>
                      <td style={{ fontSize:'0.78rem', color:'var(--text-3)', whiteSpace:'nowrap' }}>
                        {info.lastSent ? new Date(info.lastSent).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                      </td>
                      <td>
                        {done
                          ? <span className="badge badge-success">Completed</span>
                          : <span className="badge badge-warning">Pending</span>
                        }
                      </td>
                      <td>
                        {updating === key ? (
                          <span className="spinner" />
                        ) : done ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => markComplete(p, false)}
                            title="Mark as pending again"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => markComplete(p, true)}
                            title="Mark as completed — exclude from future sends"
                          >
                            ✓ Mark Done
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ fontSize:'0.78rem', color:'var(--text-3)', marginTop:12, textAlign:'center' }}>
          Marking someone as Done sets their {currentType.statusField} to &quot;Yes&quot; — they will be excluded from all future {currentType.label} reminders.
        </p>
      </div>
    </Layout>
  );
}
