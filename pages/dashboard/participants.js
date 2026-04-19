import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';

function StatusBadge({ value }) {
  return (value||'').toLowerCase()==='yes'
    ? <span className="badge badge-success">✓ Done</span>
    : <span className="badge badge-warning">Pending</span>;
}

const EMPTY = { Name:'', Email:'', 'Manager Email':'', 'Training Name':'', 'Training Date':'', 'Pre Link':'', 'Post Link':'', 'Manager Link':'', Notes:'' };

export default function ParticipantsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendModal, setSendModal] = useState(null);
  const [sending, setSending] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY);
  const [addLoading, setAddLoading] = useState(false);
  const [sendType, setSendType] = useState('post');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const LIMIT = 25;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit:LIMIT, search, status });
      const res = await fetch(`/api/admin/participants?${params}`);
      const json = await res.json();
      setData(json.data || []); setTotal(json.total || 0);
    } finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function flash(m, isError) {
    if (isError) setError(m); else setMsg(m);
    setTimeout(() => { setMsg(''); setError(''); }, 4000);
  }

  async function sendReminder(record, type) {
    setSending(true); setError('');
    try {
      const res = await fetch('/api/reminders/trigger', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'send-one', email:record.Email, trainingName:record['Training Name'], type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      flash(json.message);
      setSendModal(null);
      fetchData();
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  async function addParticipant(e) {
    e.preventDefault();
    setAddLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/participants', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      flash('Participant added successfully.');
      setAddModal(false); setAddForm(EMPTY);
      fetchData();
    } catch (err) { setError(err.message); }
    finally { setAddLoading(false); }
  }

  async function deleteRecord(email, trainingName) {
    if (!confirm('Delete this participant?')) return;
    await fetch('/api/admin/participants', {
      method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, trainingName }),
    });
    fetchData();
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <Layout title="Participants">
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
        <input placeholder="Search name, email, training…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{ width:250, flex:'none' }} />
        <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} style={{ width:180, flex:'none' }}>
          <option value="">All Participants</option>
          <option value="pre-pending">Pre Pending</option>
          <option value="post-pending">Post Pending</option>
          <option value="manager-pending">Manager Pending</option>
          <option value="completed">All Complete</option>
        </select>
        <span style={{ color:'var(--text-3)', fontSize:'0.82rem', marginLeft:'auto' }}>{total} records</span>
        <button className="btn btn-primary btn-sm" onClick={() => { setAddForm(EMPTY); setAddModal(true); }}>
          + Add Participant
        </button>
        <a href="/api/admin/participants?action=export" className="btn btn-secondary btn-sm" download="participants.json">Export JSON</a>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Training</th><th>Date</th><th>Pre</th><th>Post</th><th>Manager</th><th>Sent</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:40 }}><span className="spinner"/></td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>No participants found</td></tr>
              ) : data.map((r,i) => (
                <tr key={i}>
                  <td style={{ fontWeight:500 }}>{r.Name}</td>
                  <td style={{ fontFamily:'var(--mono)', fontSize:'0.77rem' }}>{r.Email}</td>
                  <td style={{ maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'0.82rem' }}>{r['Training Name']}</td>
                  <td style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>{r['Training Date']||'—'}</td>
                  <td><StatusBadge value={r['Pre Status']}/></td>
                  <td><StatusBadge value={r['Post Status']}/></td>
                  <td><StatusBadge value={r['Manager Status']}/></td>
                  <td style={{ fontSize:'0.77rem', color:'var(--text-3)' }}>
                    {(r['Post Count']||0) > 0 ? `${r['Post Count']}x` : '—'}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setSendModal(r); setSendType('post'); }}>
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
          <div style={{ display:'flex', gap:8, padding:'12px 16px', borderTop:'1px solid var(--border)', justifyContent:'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
            <span style={{ padding:'5px 12px', fontSize:'0.82rem', color:'var(--text-2)' }}>Page {page} of {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page===pages} onClick={() => setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Send reminder modal */}
      {sendModal && (
        <div className="modal-overlay" onClick={() => setSendModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Send Reminder</strong>
              <button onClick={() => setSendModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-2)', fontSize:'1.2rem' }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom:16, fontSize:'0.88rem' }}>
                <strong>{sendModal.Name}</strong> <span style={{ color:'var(--text-3)' }}>·</span> {sendModal['Training Name']}
              </p>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Reminder Type</label>
                <select value={sendType} onChange={e=>setSendType(e.target.value)}>
                  <option value="pre">Pre-Training Survey → {sendModal.Email}</option>
                  <option value="post">Post-Training Survey → {sendModal.Email}</option>
                  <option value="manager">Manager Feedback → {sendModal['Manager Email']||'(no manager email set)'}</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}
                onClick={() => sendReminder(sendModal, sendType)} disabled={sending||(!sendModal['Manager Email']&&sendType==='manager')}>
                {sending ? <><span className="spinner"/>&nbsp;Sending…</> : `Send ${sendType} reminder now`}
              </button>
              {sendType==='manager'&&!sendModal['Manager Email'] && (
                <p style={{ fontSize:'0.8rem', color:'var(--danger)', marginTop:8 }}>⚠️ No manager email address on this record.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSendModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add participant modal */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" style={{ maxWidth:620 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Add Single Participant</strong>
              <button onClick={() => setAddModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-2)', fontSize:'1.2rem' }}>×</button>
            </div>
            <form onSubmit={addParticipant}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Full Name *</label><input value={addForm.Name} onChange={e=>setAddForm({...addForm,Name:e.target.value})} required placeholder="Jane Smith" /></div>
                  <div className="form-group"><label className="form-label">Email Address *</label><input type="email" value={addForm.Email} onChange={e=>setAddForm({...addForm,Email:e.target.value})} required placeholder="jane@company.com" /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Manager Email</label><input type="email" value={addForm['Manager Email']} onChange={e=>setAddForm({...addForm,'Manager Email':e.target.value})} placeholder="manager@company.com" /></div>
                  <div className="form-group"><label className="form-label">Training Name *</label><input value={addForm['Training Name']} onChange={e=>setAddForm({...addForm,'Training Name':e.target.value})} required placeholder="Leadership Essentials" /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Training Date</label><input type="date" value={addForm['Training Date']} onChange={e=>setAddForm({...addForm,'Training Date':e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Notes</label><input value={addForm.Notes} onChange={e=>setAddForm({...addForm,Notes:e.target.value})} placeholder="Optional notes" /></div>
                </div>
                <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 14px' }}/>
                <p style={{ fontSize:'0.78rem', color:'var(--text-3)', marginBottom:10, fontWeight:500 }}>Survey Links (Microsoft Forms URLs)</p>
                <div className="form-group"><label className="form-label">Pre-Training Link</label><input value={addForm['Pre Link']} onChange={e=>setAddForm({...addForm,'Pre Link':e.target.value})} placeholder="https://forms.office.com/…" /></div>
                <div className="form-group"><label className="form-label">Post-Training Link</label><input value={addForm['Post Link']} onChange={e=>setAddForm({...addForm,'Post Link':e.target.value})} placeholder="https://forms.office.com/…" /></div>
                <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Manager Feedback Link</label><input value={addForm['Manager Link']} onChange={e=>setAddForm({...addForm,'Manager Link':e.target.value})} placeholder="https://forms.office.com/…" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? <><span className="spinner"/>&nbsp;Adding…</> : 'Add Participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
