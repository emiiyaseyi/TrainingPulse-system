import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState('smtp');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => setSettings(data))
      .catch(() => setError('Failed to load settings'));
  }, []);

  function set(path, value) {
    const keys = path.split('.');
    setSettings(s => {
      const copy = JSON.parse(JSON.stringify(s));
      let ref = copy;
      for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = value;
      return copy;
    });
  }

  async function save() {
    setSaving(true); setMsg(''); setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('Settings saved successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function testSmtp() {
    setTesting(true); setMsg(''); setError('');
    try {
      await save();
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-smtp' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message);
    } catch (err) { setError(err.message); }
    finally { setTesting(false); }
  }

  const tabs = [
    { key: 'smtp', label: '📧 Email (SMTP)' },
    { key: 'reminders', label: '⏰ Reminder Rules' },
    { key: 'graph', label: '☁️ OneDrive Sync' },
    { key: 'security', label: '🔒 Security' },
  ];

  if (!settings) return (
    <Layout title="Settings">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <span className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
      </div>
    </Layout>
  );

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 700 }}>
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="tabs">
          {tabs.map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ── SMTP ── */}
        {tab === 'smtp' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">SMTP Email Configuration</span>
              <button className="btn btn-ghost btn-sm" onClick={testSmtp} disabled={testing}>
                {testing ? <><span className="spinner" />&nbsp;Testing…</> : '🔌 Test Connection'}
              </button>
            </div>
            <p style={{ fontSize:'0.82rem', color:'var(--text-2)', marginBottom:18 }}>
              Configure any SMTP provider — Office 365, Gmail, SendGrid, Mailgun, etc.
            </p>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">SMTP Host</label>
                <input value={settings.smtp.host} onChange={e => set('smtp.host', e.target.value)} placeholder="smtp.office365.com" />
                <p className="form-hint">Office 365: smtp.office365.com · Gmail: smtp.gmail.com</p>
              </div>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input type="number" value={settings.smtp.port} onChange={e => set('smtp.port', parseInt(e.target.value))} placeholder="587" />
                <p className="form-hint">587 (TLS) or 465 (SSL)</p>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Username / Login Email</label>
                <input type="email" value={settings.smtp.user} onChange={e => set('smtp.user', e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password / App Password</label>
                <input type="password" value={settings.smtp.pass} onChange={e => set('smtp.pass', e.target.value)} placeholder="••••••••" />
                <p className="form-hint">For Gmail, use an App Password, not your account password</p>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">From Name</label>
                <input value={settings.smtp.fromName} onChange={e => set('smtp.fromName', e.target.value)} placeholder="Learning & Development" />
                <p className="form-hint">Displayed as sender name in emails</p>
              </div>
              <div className="form-group">
                <label className="form-label">From Email</label>
                <input type="email" value={settings.smtp.fromEmail} onChange={e => set('smtp.fromEmail', e.target.value)} placeholder="ld@company.com" />
                <p className="form-hint">Can differ from login email (if provider allows)</p>
              </div>
            </div>
            <div className="form-group">
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={!!settings.smtp.secure} onChange={e => set('smtp.secure', e.target.checked)} style={{ width:'auto' }} />
                <span style={{ fontSize:'0.83rem', fontWeight:500 }}>Use SSL/TLS (enable for port 465)</span>
              </label>
            </div>
          </div>
        )}

        {/* ── REMINDERS ── */}
        {tab === 'reminders' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Reminder Rules</span></div>
            <p style={{ fontSize:'0.82rem', color:'var(--text-2)', marginBottom:18 }}>
              Control how often reminders are sent and when they stop. Changes take effect on the next job run.
            </p>

            {[
              { prefix: 'pre', label: 'PRE-TRAINING SURVEY', graceName: 'preTrainingGraceDays', freqName: 'preTrainingFrequencyDays', maxName: 'preTrainingMaxReminders', graceDesc: 'Days before training date to start sending', noGrace: true },
              { prefix: 'post', label: 'POST-TRAINING SURVEY', graceName: 'postTrainingGraceDays', freqName: 'postTrainingFrequencyDays', maxName: 'postTrainingMaxReminders', graceDesc: 'Days after training before first reminder' },
              { prefix: 'manager', label: 'MANAGER FEEDBACK', graceName: 'managerGraceDays', freqName: 'managerFrequencyDays', maxName: 'managerMaxReminders', graceDesc: 'Days after training (default 30 = 1 month)' },
            ].map(({ prefix, label, graceName, freqName, maxName, graceDesc, noGrace }) => (
              <div key={prefix}>
                <h4 style={{ fontSize:'0.78rem', fontWeight:600, letterSpacing:'0.06em', color:'var(--text-3)', marginBottom:14 }}>{label}</h4>
                <div className="grid-3">
                  {!noGrace && (
                    <div className="form-group">
                      <label className="form-label">Grace Period (days)</label>
                      <input type="number" min={0} value={settings.reminders[graceName] || 0} onChange={e => set(`reminders.${graceName}`, parseInt(e.target.value))} />
                      <p className="form-hint">{graceDesc}</p>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Frequency (days)</label>
                    <input type="number" min={1} value={settings.reminders[freqName] || 1} onChange={e => set(`reminders.${freqName}`, parseInt(e.target.value))} />
                    <p className="form-hint">Send every N days until complete</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Reminders</label>
                    <input type="number" min={1} value={settings.reminders[maxName] || 5} onChange={e => set(`reminders.${maxName}`, parseInt(e.target.value))} />
                    <p className="form-hint">Stop after this many sends</p>
                  </div>
                </div>
                <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'16px 0' }} />
              </div>
            ))}
          </div>
        )}

        {/* ── GRAPH ── */}
        {tab === 'graph' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Microsoft Graph / OneDrive Sync</span></div>
            <div className="alert alert-info" style={{ marginBottom:20 }}>
              Optional. Register an Azure App at <strong>portal.azure.com</strong> with <code style={{ fontFamily:'var(--mono)', fontSize:'0.78rem' }}>Files.Read</code> permission to enable live OneDrive sync.
            </div>
            <div className="form-group">
              <label className="form-label">Tenant ID</label>
              <input value={settings.graph.tenantId} onChange={e => set('graph.tenantId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ fontFamily:'var(--mono)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Client ID</label>
              <input value={settings.graph.clientId} onChange={e => set('graph.clientId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ fontFamily:'var(--mono)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Client Secret</label>
              <input type="password" value={settings.graph.clientSecret} onChange={e => set('graph.clientSecret', e.target.value)} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">OneDrive File Path</label>
              <input value={settings.graph.filePath} onChange={e => set('graph.filePath', e.target.value)} placeholder="/Training/master.xlsx" style={{ fontFamily:'var(--mono)' }} />
              <p className="form-hint">Path from OneDrive root, e.g. /HR/Training/participants.xlsx</p>
            </div>
          </div>
        )}

        {/* ── SECURITY ── */}
        {tab === 'security' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Security & Access</span></div>
            <div className="alert alert-info" style={{ marginBottom:20 }}>
              Admin credentials and secrets are managed via <strong>environment variables</strong> in your Vercel dashboard for security. They cannot be changed here.
            </div>
            {[
              { label: 'ADMIN_USERNAME', hint: 'Your admin login username', value: 'Set in Vercel → Settings → Environment Variables' },
              { label: 'ADMIN_PASSWORD', hint: 'Your admin login password', value: 'Set in Vercel → Settings → Environment Variables' },
              { label: 'JWT_SECRET', hint: 'Secret key for session tokens — use a long random string', value: 'Set in Vercel → Settings → Environment Variables' },
              { label: 'CRON_SECRET', hint: 'Protects the /api/reminders/cron endpoint from unauthorized calls', value: 'Set in Vercel → Settings → Environment Variables' },
            ].map(({ label, hint, value }) => (
              <div className="form-group" key={label}>
                <label className="form-label">{label}</label>
                <input value={value} disabled style={{ opacity:0.5, fontFamily:'var(--mono)', fontSize:'0.78rem' }} />
                <p className="form-hint">{hint}</p>
              </div>
            ))}
            <div style={{ background:'var(--surface-2)', borderRadius:'var(--radius)', padding:14, marginTop:8 }}>
              <p style={{ fontSize:'0.82rem', fontWeight:600, marginBottom:8 }}>How to update on Vercel:</p>
              <ol style={{ fontSize:'0.8rem', color:'var(--text-2)', paddingLeft:20, lineHeight:2.2 }}>
                <li>Go to your project on vercel.com</li>
                <li>Click <strong>Settings</strong> → <strong>Environment Variables</strong></li>
                <li>Add or update the variable</li>
                <li>Redeploy for changes to take effect</li>
              </ol>
            </div>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
          <button className="btn btn-primary btn-lg" onClick={save} disabled={saving || tab === 'security'}>
            {saving ? <><span className="spinner" />&nbsp;Saving…</> : 'Save Settings'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
