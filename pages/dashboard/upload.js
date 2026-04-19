import { useState, useRef } from 'react';
import Layout from '../../components/Layout';

export default function UploadPage() {
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const fileRef = useRef();

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(''); }
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true); setResult(null); setError('');
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const action = mode === 'replace' ? 'replace' : 'upload';
      const res = await fetch(`/api/admin/upload?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, fileName: file.name }),
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
      const res = await fetch('/api/admin/upload?action=sync-onedrive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResult(data.message);
    } catch (err) { setError(err.message); }
    finally { setSyncLoading(false); }
  }

  return (
    <Layout title="Upload Data">
      <div style={{ maxWidth: 700 }}>
        <div className="tabs">
          {[['upload', 'Manual Upload'], ['onedrive', 'OneDrive Sync'], ['template', 'Download Template']].map(([k, v]) => (
            <button key={k} className={`tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{v}</button>
          ))}
        </div>

        {tab === 'upload' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Upload Excel or CSV File</span></div>
            {result && <div className="alert alert-success">{result.message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed var(--border-2)', borderRadius: 'var(--radius)',
                padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                marginBottom: 20, transition: 'border-color 0.15s',
              }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; }}
              onDrop={e => {
                e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border-2)';
                const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setResult(null); setError(''); }
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <p style={{ fontWeight: 500, marginBottom: 4 }}>{file ? file.name : 'Drop file here or click to browse'}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Supports .xlsx, .xls, .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Upload Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="merge">Merge – Add new records, update existing ones (recommended)</option>
                <option value="replace">Replace – Delete all existing data and replace with this file</option>
              </select>
              <p className="form-hint">{mode === 'replace' ? '⚠️ Replace mode will delete all existing participant data.' : 'Merge matches records by Email + Training Name.'}</p>
            </div>

            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><span className="spinner" />&nbsp;Uploading…</> : 'Upload File'}
            </button>

            {result && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
                {[['Total', result.total, 'blue'], ['New Added', result.new, 'green'], ['Updated', result.updated, 'yellow']].map(([l, v, c]) => (
                  <div key={l} className={`stat-card ${c}`} style={{ padding: '14px 16px' }}>
                    <div className="stat-value" style={{ fontSize: '1.5rem' }}>{v}</div>
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
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 20 }}>
              Sync participant data directly from your Microsoft Excel file on OneDrive using the Graph API. Configure your credentials in Settings first.
            </p>
            {syncResult && <div className="alert alert-success">{syncResult}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 20, fontSize: '0.83rem' }}>
              <strong style={{ display: 'block', marginBottom: 8, color: 'var(--text)' }}>Prerequisites:</strong>
              <ul style={{ color: 'var(--text-2)', paddingLeft: 20, lineHeight: 2 }}>
                <li>Azure App Registration with Files.Read permission</li>
                <li>Tenant ID, Client ID, Client Secret configured in Settings</li>
                <li>OneDrive file path (e.g. <code style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>/Training/master.xlsx</code>)</li>
              </ul>
            </div>
            <button className="btn btn-primary" onClick={syncOneDrive} disabled={syncLoading} style={{ width: '100%', justifyContent: 'center' }}>
              {syncLoading ? <><span className="spinner" />&nbsp;Syncing…</> : '🔄 Sync from OneDrive Now'}
            </button>
          </div>
        )}

        {tab === 'template' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Excel Template</span></div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 20 }}>
              Download the template with all required columns pre-filled. Use this as your master data format.
            </p>
            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
              <strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: 10 }}>Required Columns:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Name','Email','Manager Email','Training Name','Training Date','Pre Status','Post Status','Manager Status','Pre Link','Post Link','Manager Link'].map(col => (
                  <span key={col} style={{ background: 'var(--surface-3)', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{col}</span>
                ))}
              </div>
              <p style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-3)' }}>Status fields use <strong>Yes</strong> / blank. Dates use YYYY-MM-DD format.</p>
            </div>
            <a href="/api/admin/participants?action=template" className="btn btn-success" style={{ display: 'inline-flex' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Template (.xlsx)
            </a>
          </div>
        )}
      </div>
    </Layout>
  );
}
