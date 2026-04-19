import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState('smtp');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    const res = await fetch('/api/admin/settings');
    setSettings(await res.json());
  }

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
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg('Settings saved.'); setTimeout(() => setMsg(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function testConnection(action) {
    setTesting(true); setMsg(''); setError('');
    try {
      await save();
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message);
    } catch (err) { setError(err.message); }
    finally { setTesting(false); }
  }

  if (!settings) return <Layout title="Settings"><div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div></Layout>;

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 680 }}>
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="tabs">
          {[['smtp','SMTP Email'],['reminders','Reminder Rules'],['graph','Microsoft Graph'],['security','Security']].map(([k,v]) => (
            <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={() => setTab(k)}>{v}</button>
          ))}
        </div>

        {tab === 'smtp' && (
          <div className="card">
            <div className="card-header"><span className="card-title">SMTP Configuration</span>
              <button className="btn btn-ghost btn-sm" onClick={() => testConnection('test-smtp')} disabled={testing}>
                {testing ? <><span className="spinner" />&nbsp;Testing…</> : 'Test Connection'}
              </button>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">SMTP Host</label>
                <input value={settings.smtp.host} onChange={e => set('smtp.host', e.target.value)} placeholder="smtp.office365.com" />
              </div>
              <div className="form-group"><label className="form-label">Port</label>
                <input type="number" value={settings.smtp.port} onChange={e => set('smtp.port', parseInt(e.target.value))} placeholder="587" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Username / Email</label>
                <input type="email" value={settings.smtp.user} onChange={e => set('smtp.user', e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="form-group"><label className="form-label">Password</label>
                <input type="password" value={settings.smtp.pass} onChange={e => set('smtp.pass', e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">From Name</label>
                <input value={settings.smtp.fromName} onChange={e => set('smtp.fromName', e.target.value)} placeholder="Learning & Development" />
              </div>
              <div className="form-group"><label className="form-label">From Email</label>
                <input type="email" value={settings.smtp.fromEmail} onChange={e => set('smtp.fromEmail', e.target.value)} placeholder="ld@company.com" />
              </div>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.smtp.secure} onChange={e => set('smtp.secure', e.target.checked)} style={{ width: 'auto' }} />
                <span className="form-label" style={{ margin: 0 }}>Use SSL/TLS (port 465)</span>
              </label>
            </div>
          </div>
        )}

        {tab === 'reminders' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Reminder Rules</span></div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 14, color: 'var(--text-2)' }}>POST-TRAINING SURVEY</h4>
            <div className="grid-3">
              <div className="form-group"><label className="form-label">Grace Period (days)</label>
                <input type="number" min={0} value={settings.reminders.postTrainingGraceDays} onChange={e => set('reminders.postTrainingGraceDays', parseInt(e.target.value))} />
                <p className="form-hint">Days after training before first reminder</p>
              </div>
              <div className="form-group"><label className="form-label">Send Every (days)</label>
                <input type="number" min={1} value={settings.reminders.postTrainingFrequencyDays} onChange={e => set('reminders.postTrainingFrequencyDays', parseInt(e.target.value))} />
                <p className="form-hint">Frequency between reminders</p>
              </div>
              <div className="form-group"><label className="form-label">Max Reminders</label>
                <input type="number" min={1} value={settings.reminders.postTrainingMaxReminders} onChange={e => set('reminders.postTrainingMaxReminders', parseInt(e.target.value))} />
                <p className="form-hint">Stop after this many sends</p>
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 14, color: 'var(--text-2)' }}>MANAGER FEEDBACK</h4>
            <div className="grid-3">
              <div className="form-group"><label className="form-label">Grace Period (days)</label>
                <input type="number" min={0} value={settings.reminders.managerGraceDays} onChange={e => set('reminders.managerGraceDays', parseInt(e.target.value))} />
                <p className="form-hint">Days after training (default: 30)</p>
              </div>
              <div className="form-group"><label className="form-label">Send Every (days)</label>
                <input type="number" min={1} value={settings.reminders.managerFrequencyDays} onChange={e => set('reminders.managerFrequencyDays', parseInt(e.target.value))} />
              </div>
              <div className="form-group"><label className="form-label">Max Reminders</label>
                <input type="number" min={1} value={settings.reminders.managerMaxReminders} onChange={e => set('reminders.managerMaxReminders', parseInt(e.target.value))} />
              </div>
            </div>
          </div>
        )}

        {tab === 'graph' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Microsoft Graph API (OneDrive)</span>
              <button className="btn btn-ghost btn-sm" onClick={() => testConnection('test-graph')} disabled={testing}>
                {testing ? <><span className="spinner" />&nbsp;Testing…</> : 'Test Connection'}
              </button>
            </div>
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              Register an app at <strong>portal.azure.com</strong> with <strong>Files.Read</strong> permission under Microsoft Graph. Use Client Credentials flow.
            </div>
            <div className="form-group"><label className="form-label">Tenant ID</label>
              <input value={settings.graph.tenantId} onChange={e => set('graph.tenantId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ fontFamily: 'var(--mono)' }} />
            </div>
            <div className="form-group"><label className="form-label">Client ID</label>
              <input value={settings.graph.clientId} onChange={e => set('graph.clientId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ fontFamily: 'var(--mono)' }} />
            </div>
            <div className="form-group"><label className="form-label">Client Secret</label>
              <input type="password" value={settings.graph.clientSecret} onChange={e => set('graph.clientSecret', e.target.value)} placeholder="••••••••" />
            </div>
            <div className="form-group"><label className="form-label">OneDrive File Path</label>
              <input value={settings.graph.filePath} onChange={e => set('graph.filePath', e.target.value)} placeholder="/Training/master.xlsx" style={{ fontFamily: 'var(--mono)' }} />
              <p className="form-hint">Path from root of OneDrive, or the item ID of the file</p>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Security</span></div>
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              Admin credentials are configured via environment variables. Update <code style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>.env.local</code> to change them.
            </div>
            <div className="form-group"><label className="form-label">ADMIN_USERNAME</label>
              <input value="(set in .env.local)" disabled style={{ opacity: 0.5 }} />
            </div>
            <div className="form-group"><label className="form-label">ADMIN_PASSWORD</label>
              <input type="password" value="••••••••" disabled style={{ opacity: 0.5 }} />
            </div>
            <div className="form-group"><label className="form-label">Cron Secret (for /api/reminders/cron)</label>
              <input value="(set CRON_SECRET in .env.local)" disabled style={{ opacity: 0.5, fontFamily: 'var(--mono)', fontSize: '0.8rem' }} />
              <p className="form-hint">Protects the cron endpoint when called by Vercel or external schedulers</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner" />&nbsp;Saving…</> : 'Save Settings'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
