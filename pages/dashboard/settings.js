import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState('smtp');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Security tab state
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Admin accounts state
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', username: '' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(setSettings).catch(() => setError('Failed to load settings'));
    fetch('/api/auth/admins').then(r => r.json()).then(data => setAdmins(Array.isArray(data) ? data : []));
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
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg('Settings saved.'); setTimeout(() => setMsg(''), 3000);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
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
    } catch (err) { setError(err.message); } finally { setTesting(false); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.newPw.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    setPwLoading(true); setPwMsg(''); setPwError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMsg('Password changed successfully.'); setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) { setPwError(err.message); } finally { setPwLoading(false); }
  }

  async function inviteAdmin(e) {
    e.preventDefault();
    setAdminLoading(true); setAdminMsg(''); setAdminError('');
    try {
      const res = await fetch('/api/auth/admins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdminMsg(data.message || data.warning || 'Admin created.');
      if (data.tempPassword) setAdminMsg(`Admin created. Temp password: ${data.tempPassword} (email failed, share manually)`);
      setNewAdmin({ name: '', email: '', username: '' });
      fetch('/api/auth/admins').then(r => r.json()).then(d => setAdmins(Array.isArray(d) ? d : []));
    } catch (err) { setAdminError(err.message); } finally { setAdminLoading(false); }
  }

  async function removeAdmin(username) {
    if (!confirm(`Remove admin account "${username}"?`)) return;
    await fetch('/api/auth/admins', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    setAdmins(a => a.filter(x => x.username !== username));
  }

  const tabs = [
    { key: 'smtp', label: '📧 Email (SMTP)' },
    { key: 'style', label: '🎨 Email Style' },
    { key: 'reminders', label: '⏰ Reminder Rules' },
    { key: 'graph', label: '☁️ OneDrive' },
    { key: 'security', label: '🔒 Security' },
  ];

  if (!settings) return (
    <Layout title="Settings">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <span className="spinner" style={{ width:28, height:28, borderWidth:3 }} />
      </div>
    </Layout>
  );

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 700 }}>
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="tabs">
          {tabs.map(t => <button key={t.key} className={`tab-btn ${tab===t.key?'active':''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
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
            <p style={{ fontSize:'0.82rem', color:'var(--text-2)', marginBottom:18 }}>Works with Office 365, Gmail, SendGrid, Mailgun, or any SMTP provider.</p>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">SMTP Host</label>
                <input value={settings.smtp?.host||''} onChange={e=>set('smtp.host',e.target.value)} placeholder="smtp.office365.com" />
                <p className="form-hint">Office 365: smtp.office365.com · Gmail: smtp.gmail.com</p>
              </div>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input type="number" value={settings.smtp?.port||587} onChange={e=>set('smtp.port',parseInt(e.target.value))} />
                <p className="form-hint">587 (TLS/STARTTLS) or 465 (SSL)</p>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="email" value={settings.smtp?.user||''} onChange={e=>set('smtp.user',e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password / App Password</label>
                <input type="password" value={settings.smtp?.pass||''} onChange={e=>set('smtp.pass',e.target.value)} placeholder="••••••••" />
                <p className="form-hint">Gmail: use an App Password (not your main password)</p>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">From Name</label>
                <input value={settings.smtp?.fromName||''} onChange={e=>set('smtp.fromName',e.target.value)} placeholder="Learning & Development" />
              </div>
              <div className="form-group">
                <label className="form-label">From Email</label>
                <input type="email" value={settings.smtp?.fromEmail||''} onChange={e=>set('smtp.fromEmail',e.target.value)} placeholder="ld@company.com" />
              </div>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={!!settings.smtp?.secure} onChange={e=>set('smtp.secure',e.target.checked)} style={{ width:'auto', accentColor:'var(--accent)' }} />
              <span style={{ fontSize:'0.83rem' }}>Use SSL/TLS (enable for port 465)</span>
            </label>
          </div>
        )}

        {/* ── EMAIL STYLE ── */}
        {tab === 'style' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Email Font & Style</span></div>
            <p style={{ fontSize:'0.82rem', color:'var(--text-2)', marginBottom:18 }}>These settings apply to all outgoing emails system-wide.</p>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Font Family</label>
                <select value={settings.emailStyle?.fontFamily||'Tahoma, Arial, sans-serif'} onChange={e=>set('emailStyle.fontFamily',e.target.value)}>
                  <option value="Tahoma, Arial, sans-serif">Tahoma (default)</option>
                  <option value="Calibri, Arial, sans-serif">Calibri</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Verdana, sans-serif">Verdana</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Font Size</label>
                <select value={settings.emailStyle?.fontSize||'12pt'} onChange={e=>set('emailStyle.fontSize',e.target.value)}>
                  {['10pt','11pt','12pt','13pt','14pt'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Header Background Color</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="color" value={settings.emailStyle?.headerColor||'#0078d4'} onChange={e=>set('emailStyle.headerColor',e.target.value)} style={{ width:48, height:38, padding:2, cursor:'pointer' }} />
                  <input value={settings.emailStyle?.headerColor||'#0078d4'} onChange={e=>set('emailStyle.headerColor',e.target.value)} placeholder="#0078d4" style={{ flex:1 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Button Color</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="color" value={settings.emailStyle?.buttonColor||'#0078d4'} onChange={e=>set('emailStyle.buttonColor',e.target.value)} style={{ width:48, height:38, padding:2, cursor:'pointer' }} />
                  <input value={settings.emailStyle?.buttonColor||'#0078d4'} onChange={e=>set('emailStyle.buttonColor',e.target.value)} placeholder="#0078d4" style={{ flex:1 }} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Signature (appended to all emails)</label>
              <textarea
                value={settings.emailStyle?.signature||''}
                onChange={e=>set('emailStyle.signature',e.target.value)}
                placeholder="<p>Warm regards,<br><strong>Learning & Development Team</strong><br>your.email@company.com</p>"
                style={{ minHeight:100, fontFamily:'var(--mono)', fontSize:'0.78rem' }}
              />
              <p className="form-hint">HTML supported. Appended at the bottom of every email body.</p>
            </div>
            {/* Preview */}
            <div style={{ marginTop:8 }}>
              <p style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-2)', marginBottom:8 }}>Live Preview:</p>
              <div style={{ background:'#fff', borderRadius:6, border:'1px solid var(--border)', overflow:'hidden', fontSize:'0' }}>
                <div style={{ background: settings.emailStyle?.headerColor||'#0078d4', padding:'12px 20px' }}>
                  <span style={{ color:'#fff', fontFamily: settings.emailStyle?.fontFamily||'Tahoma', fontSize:'13pt', fontWeight:'bold' }}>{settings.smtp?.fromName||'Learning & Development'}</span>
                </div>
                <div style={{ padding:'20px', fontFamily: settings.emailStyle?.fontFamily||'Tahoma', fontSize: settings.emailStyle?.fontSize||'12pt', color:'#1a1a1a', lineHeight:1.7 }}>
                  <p style={{ margin:'0 0 12px' }}>Dear <strong>John Doe</strong>,</p>
                  <p style={{ margin:'0 0 16px' }}>Your training reminder message will appear here.</p>
                  <a href="#" style={{ background: settings.emailStyle?.buttonColor||'#0078d4', color:'#fff', padding:'10px 24px', borderRadius:4, textDecoration:'none', fontWeight:'bold', display:'inline-block' }}>Click Here</a>
                  {settings.emailStyle?.signature && <div style={{ marginTop:16 }} dangerouslySetInnerHTML={{ __html: settings.emailStyle.signature }} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REMINDERS ── */}
        {tab === 'reminders' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Reminder Frequency Rules</span></div>
            <p style={{ fontSize:'0.82rem', color:'var(--text-2)', marginBottom:18 }}>Configure how often reminders are sent and when they stop.</p>
            {[
              { label:'PRE-TRAINING SURVEY', g:'preTrainingGraceDays', f:'preTrainingFrequencyDays', m:'preTrainingMaxReminders', gLabel:'Days before training date to start', showGrace:false },
              { label:'POST-TRAINING SURVEY', g:'postTrainingGraceDays', f:'postTrainingFrequencyDays', m:'postTrainingMaxReminders', gLabel:'Days after training before first reminder', showGrace:true },
              { label:'MANAGER FEEDBACK', g:'managerGraceDays', f:'managerFrequencyDays', m:'managerMaxReminders', gLabel:'Days after training (30 = 1 month)', showGrace:true },
            ].map(({ label, g, f, m, gLabel, showGrace }) => (
              <div key={label}>
                <h4 style={{ fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.06em', color:'var(--text-3)', marginBottom:12 }}>{label}</h4>
                <div className={showGrace ? 'grid-3' : 'grid-2'}>
                  {showGrace && (
                    <div className="form-group">
                      <label className="form-label">Grace Period (days)</label>
                      <input type="number" min={0} value={settings.reminders?.[g]??0} onChange={e=>set(`reminders.${g}`,parseInt(e.target.value))} />
                      <p className="form-hint">{gLabel}</p>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Send Every (days)</label>
                    <input type="number" min={1} value={settings.reminders?.[f]??1} onChange={e=>set(`reminders.${f}`,parseInt(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Reminders</label>
                    <input type="number" min={1} value={settings.reminders?.[m]??5} onChange={e=>set(`reminders.${m}`,parseInt(e.target.value))} />
                    <p className="form-hint">Stop after this count</p>
                  </div>
                </div>
                <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'12px 0 16px' }} />
              </div>
            ))}
          </div>
        )}

        {/* ── GRAPH ── */}
        {tab === 'graph' && (
          <div className="card">
            <div className="card-header"><span className="card-title">OneDrive / Microsoft Graph</span></div>
            <div className="alert alert-info" style={{ marginBottom:18 }}>
              Optional. Register an app at <strong>portal.azure.com</strong> with <code style={{ fontFamily:'var(--mono)', fontSize:'0.78rem' }}>Files.Read</code> permission.
            </div>
            {[
              { label:'Tenant ID', key:'graph.tenantId', ph:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
              { label:'Client ID', key:'graph.clientId', ph:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
              { label:'Client Secret', key:'graph.clientSecret', ph:'••••••••', type:'password' },
              { label:'OneDrive File Path', key:'graph.filePath', ph:'/Training/master.xlsx' },
            ].map(({ label, key, ph, type }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input type={type||'text'} value={key.split('.').reduce((o,k)=>o?.[k], settings)||''} onChange={e=>set(key,e.target.value)} placeholder={ph} style={{ fontFamily:'var(--mono)' }} />
              </div>
            ))}
          </div>
        )}

        {/* ── SECURITY ── */}
        {tab === 'security' && (
          <div>
            {/* Change password */}
            <div className="card" style={{ marginBottom:20 }}>
              <div className="card-header"><span className="card-title">Change Your Password</span></div>
              {pwMsg && <div className="alert alert-success">{pwMsg}</div>}
              {pwError && <div className="alert alert-error">{pwError}</div>}
              <form onSubmit={changePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" value={pwForm.current} onChange={e=>setPwForm({...pwForm, current:e.target.value})} required placeholder="••••••••" />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input type="password" value={pwForm.newPw} onChange={e=>setPwForm({...pwForm, newPw:e.target.value})} required placeholder="Min. 6 characters" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" value={pwForm.confirm} onChange={e=>setPwForm({...pwForm, confirm:e.target.value})} required placeholder="Repeat new password" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                  {pwLoading ? <><span className="spinner"/>&nbsp;Updating…</> : '🔑 Update Password'}
                </button>
              </form>
            </div>

            {/* Admin accounts */}
            <div className="card">
              <div className="card-header"><span className="card-title">Admin Accounts</span></div>
              {adminMsg && <div className="alert alert-success">{adminMsg}</div>}
              {adminError && <div className="alert alert-error">{adminError}</div>}

              {admins.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <p style={{ fontSize:'0.8rem', color:'var(--text-2)', marginBottom:10, fontWeight:500 }}>Existing Admin Accounts:</p>
                  {admins.map(a => (
                    <div key={a.username} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--surface-2)', borderRadius:'var(--radius)', marginBottom:6 }}>
                      <div>
                        <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{a.name || a.username}</span>
                        <span style={{ color:'var(--text-3)', fontSize:'0.78rem', marginLeft:10, fontFamily:'var(--mono)' }}>@{a.username}</span>
                        <span style={{ color:'var(--text-3)', fontSize:'0.78rem', marginLeft:10 }}>{a.email}</span>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => removeAdmin(a.username)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ fontSize:'0.82rem', fontWeight:600, marginBottom:12, color:'var(--text)' }}>Invite New Admin</p>
              <p style={{ fontSize:'0.8rem', color:'var(--text-2)', marginBottom:14 }}>A temporary password will be generated and emailed to them automatically.</p>
              <form onSubmit={inviteAdmin}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input value={newAdmin.name} onChange={e=>setNewAdmin({...newAdmin, name:e.target.value})} placeholder="Jane Smith" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input value={newAdmin.username} onChange={e=>setNewAdmin({...newAdmin, username:e.target.value})} placeholder="janesmith" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" value={newAdmin.email} onChange={e=>setNewAdmin({...newAdmin, email:e.target.value})} placeholder="jane@company.com" required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={adminLoading}>
                  {adminLoading ? <><span className="spinner"/>&nbsp;Sending invite…</> : '✉️ Create Account & Send Invite'}
                </button>
              </form>
            </div>
          </div>
        )}

        {tab !== 'security' && (
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
              {saving ? <><span className="spinner"/>&nbsp;Saving…</> : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
