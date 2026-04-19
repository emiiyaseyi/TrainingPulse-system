import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

const TEMPLATE_KEYS = [
  { key: 'postTraining', label: 'Post-Training Survey', color: 'blue', desc: 'Sent to employees after training grace period' },
  { key: 'preTraining', label: 'Pre-Training Survey', color: 'green', desc: 'Sent before employees attend training' },
  { key: 'managerFeedback', label: 'Manager Feedback', color: 'yellow', desc: 'Sent to managers 30+ days after training' },
];

const PLACEHOLDERS = ['{{name}}', '{{training_name}}', '{{training_date}}', '{{link}}'];

export default function TemplatesPage() {
  const [settings, setSettings] = useState(null);
  const [active, setActive] = useState('postTraining');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    setSettings(data);
  }

  function updateTemplate(field, value) {
    setSettings(s => ({
      ...s,
      templates: { ...s.templates, [active]: { ...s.templates[active], [field]: value } }
    }));
  }

  async function save() {
    setSaving(true); setMsg(''); setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: settings.templates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('Template saved successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const tpl = settings?.templates?.[active];

  return (
    <Layout title="Email Templates">
      <div style={{ maxWidth: 900 }}>
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {TEMPLATE_KEYS.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)}
              style={{
                padding: '10px 16px', borderRadius: 'var(--radius)', border: '1px solid',
                borderColor: active === t.key ? 'var(--accent)' : 'var(--border)',
                background: active === t.key ? 'rgba(59,130,246,0.1)' : 'var(--surface)',
                color: active === t.key ? 'var(--accent)' : 'var(--text-2)',
                cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
              }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.label}</div>
              <div style={{ fontSize: '0.73rem', marginTop: 2, opacity: 0.7 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {!settings ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 1fr' : '1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">{TEMPLATE_KEYS.find(t => t.key === active)?.label}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPreview(!preview)}>
                    {preview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                    {saving ? <><span className="spinner" />&nbsp;Saving…</> : 'Save'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input value={tpl?.subject || ''} onChange={e => updateTemplate('subject', e.target.value)} placeholder="Email subject…" />
              </div>

              <div className="form-group">
                <label className="form-label">Email Body (HTML supported)</label>
                <textarea
                  value={tpl?.body || ''}
                  onChange={e => updateTemplate('body', e.target.value)}
                  style={{ minHeight: 340, fontFamily: 'var(--mono)', fontSize: '0.78rem', lineHeight: 1.7 }}
                />
              </div>

              <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 12 }}>
                <p style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginBottom: 8, fontWeight: 500 }}>Available Placeholders:</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PLACEHOLDERS.map(p => (
                    <code key={p} onClick={() => navigator.clipboard?.writeText(p)}
                      style={{ background: 'var(--surface-3)', padding: '2px 8px', borderRadius: 4, fontSize: '0.74rem', fontFamily: 'var(--mono)', cursor: 'pointer' }}
                      title="Click to copy">{p}</code>
                  ))}
                </div>
              </div>
            </div>

            {preview && (
              <div className="card">
                <div className="card-header"><span className="card-title">Preview</span></div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 12 }}>
                  <strong>Subject:</strong> {(tpl?.subject || '').replace(/{{name}}/g,'John Doe').replace(/{{training_name}}/g,'Leadership Essentials').replace(/{{training_date}}/g,'January 15, 2025').replace(/{{link}}/g,'#')}
                </div>
                <div style={{
                  background: '#fff', borderRadius: 8, padding: 20,
                  color: '#1a1a1a', fontSize: '13px', lineHeight: 1.7,
                  border: '1px solid var(--border)',
                }}
                  dangerouslySetInnerHTML={{
                    __html: (tpl?.body || '')
                      .replace(/{{name}}/g,'John Doe')
                      .replace(/{{training_name}}/g,'Leadership Essentials')
                      .replace(/{{training_date}}/g,'January 15, 2025')
                      .replace(/{{link}}/g,'#')
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
