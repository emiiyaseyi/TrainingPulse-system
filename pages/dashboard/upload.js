import { useState, useRef } from 'react';
import Layout from '../../components/Layout';

const EMAIL_TYPES = [
  { value: '', label: 'No — just import data' },
  { value: 'pre', label: 'Pre-Training Survey reminders' },
  { value: 'post', label: 'Post-Training Survey reminders' },
  { value: 'manager', label: 'Manager Feedback reminders' },
];

export default function UploadPage() {
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge');
  const [sendImmediately, setSendImmediately] = useState(false);
  const [emailType, setEmailType] = useState('post');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const fileRef = useRef();

  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'var(--border-2)';
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setResult(null); setError(''); }
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true); setResult(null); setError('');
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const res = await fetch(`/api/admin/upload?action=${mode === 'replace' ? 'replace' : 'upload'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          fileName: file.name,
          sendImmediately,
          emailType: sendImmediately ? emailType : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function syncOneDrive() {
    setSyncLoading(true); setSyncResult(''); setError('');
    try {
      const res = await fetch('/api/admin/upload?action=sync-onedrive', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResult(data.message);
    } catch (err) { setError(err.message); }
    finally { setSyncLoading(false); }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const sample = [{ Name:'John Doe', Email:'john@company.com', 'Manager Email':'manager@company.com', 'Training Name':'Leadership Essentials', 'Training Date':'2025-01-15', 'Pre Link':'https://forms.office.com/...', 'Post Link':'https://forms.office.com/...', 'Manager Link':'https://forms.office.com/...' }];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    XLSX.writeFile(wb, 'trainingpulse-template.xlsx');
  }

  return (
    <Layout title="Upload Data">
      <div style={{ maxWidth: 680 }}>
        <div className="tabs">
          {[['upload','📂 Upload File'],['onedrive','☁️ OneDrive Sync'],['template','📋 Template']].map(([k,v]) => (
            <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={() => setTab(k)}>{v}</button>
          ))}
        </div>

        {tab === 'upload' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Upload Participants File</span></div>

            {result && (
              <div className="alert alert-success">
                <strong>Upload complete!</strong> {result.message}
                {result.emailResult && (
                  <div style={{ marginTop:6, fontSize:'0.8rem' }}>
                    Emails sent: {result.emailResult.sent} ✓
                    {result.emailResult.failed > 0 && ` · ${result.emailResult.failed} failed`}
                  </div>
                )}
              </div>
            )}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--accent)'; }}
              onDragLeave={e => e.currentTarget.style.borderColor='var(--border-2)'}
              onDrop={handleDrop}
              style={{
                border:'2px dashed var(--border-2)', borderRadius:'var(--radius)',
                padding:'36px 20px', textAlign:'center', cursor:'pointer',
                marginBottom:20, transition:'border-color 0.15s',
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" style={{ marginBottom:10 }}>
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <p style={{ fontWeight:500, marginBottom:4 }}>{file ? `✓ ${file.name}` : 'Drop file here or click to browse'}</p>
              <p style={{ fontSize:'0.77rem', color:'var(--text-3)' }}>Accepts .xlsx, .xls, .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => { const f=e.target.files?.[0]; if(f){setFile(f);setResult(null);setError('');} }} style={{ display:'none' }} />
            </div>

            {/* Upload mode */}
            <div className="form-group">
              <label className="form-label">Upload Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="merge">Merge — Add new records, update existing (recommended)</option>
                <option value="replace">Replace — Delete all existing data and start fresh</option>
              </select>
              {mode === 'replace' && <p className="form-hint" style={{ color:'var(--danger)' }}>⚠️ This will permanently delete all existing participant data.</p>}
            </div>

            {/* Send immediately */}
            <div style={{ background:'var(--surface-2)', borderRadius:'var(--radius)', padding:16, marginBottom:20 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom: sendImmediately ? 14 : 0 }}>
                <input type="checkbox" checked={sendImmediately} onChange={e => setSendImmediately(e.target.checked)} style={{ width:'auto', accentColor:'var(--accent)' }} />
                <div>
                  <div style={{ fontSize:'0.85rem', fontWeight:600 }}>Send emails immediately after upload</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:2 }}>Triggers email send to all uploaded participants right away</div>
                </div>
              </label>
              {sendImmediately && (
                <div className="form-group" style={{ marginBottom:0, marginTop:4 }}>
                  <label className="form-label">Email Type to Send</label>
                  <select value={emailType} onChange={e => setEmailType(e.target.value)}>
                    <option value="pre">Pre-Training Survey reminder</option>
                    <option value="post">Post-Training Survey reminder</option>
                    <option value="manager">Manager Feedback reminder</option>
                  </select>
                  <p className="form-hint">Uses the template configured in Email Templates</p>
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading} style={{ width:'100%', justifyContent:'center' }}>
              {loading
                ? <><span className="spinner" />&nbsp;{sendImmediately ? 'Uploading & sending emails…' : 'Uploading…'}</>
                : <>{sendImmediately ? `📤 Upload & Send ${emailType} Reminders` : '📂 Upload File'}</>
              }
            </button>

            {result && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:20 }}>
                {[['Total Records', result.total, 'blue'], ['New Added', result.new, 'green'], ['Updated', result.updated, 'yellow']].map(([l,v,c]) => (
                  <div key={l} className={`stat-card ${c}`} style={{ padding:'14px 16px' }}>
                    <div className="stat-value" style={{ fontSize:'1.5rem' }}>{v}</div>
                    <div className="stat-label">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'onedrive' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Sync from OneDrive</span></div>
            <p style={{ fontSize:'0.85rem', color:'var(--text-2)', marginBottom:20 }}>
              Automatically pull participant data from your Excel file stored in OneDrive. Configure Microsoft Graph credentials in Settings first.
            </p>
            {syncResult && <div className="alert alert-success">{syncResult}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ background:'var(--surface-2)', borderRadius:'var(--radius)', padding:14, marginBottom:20 }}>
              <strong style={{ fontSize:'0.82rem', display:'block', marginBottom:8 }}>Setup required:</strong>
              <ol style={{ fontSize:'0.8rem', color:'var(--text-2)', paddingLeft:20, lineHeight:2.2 }}>
                <li>Register an app at <strong>portal.azure.com</strong></li>
                <li>Grant <strong>Files.Read</strong> permission under Microsoft Graph</li>
                <li>Add Tenant ID, Client ID, Client Secret in Settings → OneDrive Sync</li>
                <li>Set the file path to your Excel file</li>
              </ol>
            </div>
            <button className="btn btn-primary" onClick={syncOneDrive} disabled={syncLoading} style={{ width:'100%', justifyContent:'center' }}>
              {syncLoading ? <><span className="spinner" />&nbsp;Syncing…</> : '🔄 Sync from OneDrive Now'}
            </button>
          </div>
        )}

        {tab === 'template' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Download Data Template</span></div>
            <p style={{ fontSize:'0.85rem', color:'var(--text-2)', marginBottom:20 }}>
              Download a pre-formatted Excel template with all required columns. Fill it in and upload it above.
            </p>
            <div style={{ background:'var(--surface-2)', borderRadius:'var(--radius)', padding:16, marginBottom:20 }}>
              <strong style={{ fontSize:'0.82rem', display:'block', marginBottom:10 }}>Required columns:</strong>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {['Name','Email','Manager Email','Training Name','Training Date','Pre Link','Post Link','Manager Link'].map(col => (
                  <code key={col} style={{ background:'var(--surface-3)', padding:'3px 8px', borderRadius:4, fontSize:'0.74rem', fontFamily:'var(--mono)' }}>{col}</code>
                ))}
              </div>
              <p style={{ marginTop:10, fontSize:'0.78rem', color:'var(--text-3)' }}>
                Minimum required: <strong>Name</strong>, <strong>Email</strong>, <strong>Training Name</strong>. Everything else is optional but recommended.
              </p>
            </div>
            <button className="btn btn-success" onClick={downloadTemplate} style={{ display:'inline-flex', gap:8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Template (.xlsx)
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
