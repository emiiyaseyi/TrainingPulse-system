import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';

const TEMPLATE_KEYS = [
  { key: 'postTraining', label: 'Post-Training Survey', desc: 'Sent to employees after grace period' },
  { key: 'preTraining', label: 'Pre-Training Survey', desc: 'Sent before employees attend training' },
  { key: 'managerFeedback', label: 'Manager Feedback', desc: 'Sent to managers 30+ days after training' },
];

const PLACEHOLDERS = [
  { tag: '{{name}}', desc: 'Employee name' },
  { tag: '{{training_name}}', desc: 'Training title' },
  { tag: '{{training_date}}', desc: 'Formatted training date' },
  { tag: '{{link}}', desc: 'Survey/form link (button)' },
];

export default function TemplatesPage() {
  const [settings, setSettings] = useState(null);
  const [active, setActive] = useState('postTraining');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageRef = useRef();

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(setSettings).catch(() => setError('Failed to load'));
  }, []);

  function updateTemplate(field, value) {
    setSettings(s => ({ ...s, templates: { ...s.templates, [active]: { ...s.templates[active], [field]: value } } }));
  }

  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const newVal = current.substring(0, start) + text + current.substring(end);
    updateTemplate('body', newVal);
    setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start + text.length; textarea.focus(); }, 0);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      // Convert to base64 data URL and insert as <img> tag
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const imgTag = `<img src="${dataUrl}" alt="${file.name}" style="max-width:100%;height:auto;display:block;margin:12px 0;" />`;
        const textarea = document.getElementById('template-body');
        if (textarea) {
          insertAtCursor(textarea, imgTag);
        } else {
          updateTemplate('body', (settings?.templates?.[active]?.body || '') + imgTag);
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Image upload failed: ' + err.message);
      setUploadingImage(false);
    }
  }

  function insertTag(tag) {
    const textarea = document.getElementById('template-body');
    if (textarea) insertAtCursor(textarea, tag);
    else updateTemplate('body', (settings?.templates?.[active]?.body || '') + tag);
  }

  async function save() {
    setSaving(true); setMsg(''); setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: settings.templates }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg('Template saved.'); setTimeout(() => setMsg(''), 3000);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  const tpl = settings?.templates?.[active];
  const font = settings?.emailStyle?.fontFamily || 'Tahoma, Arial, sans-serif';
  const fontSize = settings?.emailStyle?.fontSize || '12pt';
  const headerColor = settings?.emailStyle?.headerColor || '#0078d4';
  const buttonColor = settings?.emailStyle?.buttonColor || '#0078d4';
  const fromName = settings?.smtp?.fromName || 'Learning & Development';

  function renderPreview(text) {
    return (text || '')
      .replace(/{{name}}/g, '<strong>John Doe</strong>')
      .replace(/{{training_name}}/g, '<strong>Leadership Essentials</strong>')
      .replace(/{{training_date}}/g, 'January 15, 2025')
      .replace(/{{link}}/g, `<a href="#" style="background:${buttonColor};color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:bold;display:inline-block;">Click Here</a>`);
  }

  return (
    <Layout title="Email Templates">
      <div style={{ maxWidth: 960 }}>
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Template selector */}
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          {TEMPLATE_KEYS.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)} style={{
              padding:'10px 16px', borderRadius:'var(--radius)', border:'1px solid',
              borderColor: active===t.key ? 'var(--accent)' : 'var(--border)',
              background: active===t.key ? 'rgba(59,130,246,0.1)' : 'var(--surface)',
              color: active===t.key ? 'var(--accent)' : 'var(--text-2)',
              cursor:'pointer', fontFamily:'var(--font)', textAlign:'left',
            }}>
              <div style={{ fontSize:'0.85rem', fontWeight:600 }}>{t.label}</div>
              <div style={{ fontSize:'0.72rem', marginTop:2, opacity:0.7 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {!settings ? (
          <div style={{ textAlign:'center', padding:48 }}><span className="spinner" style={{ width:28, height:28, borderWidth:3 }} /></div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns: preview ? '1fr 1fr' : '1fr', gap:20 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">{TEMPLATE_KEYS.find(t=>t.key===active)?.label}</span>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPreview(!preview)}>
                    {preview ? 'Hide Preview' : '👁 Preview'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                    {saving ? <><span className="spinner"/>&nbsp;Saving…</> : 'Save'}
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input value={tpl?.subject||''} onChange={e=>updateTemplate('subject',e.target.value)} placeholder="Email subject…" />
              </div>

              {/* Toolbar */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8, padding:'8px 10px', background:'var(--surface-2)', borderRadius:'var(--radius)', alignItems:'center' }}>
                <span style={{ fontSize:'0.72rem', color:'var(--text-3)', fontWeight:600, marginRight:4 }}>INSERT:</span>
                {PLACEHOLDERS.map(p => (
                  <button key={p.tag} onClick={() => insertTag(p.tag)} title={p.desc} style={{
                    padding:'3px 9px', borderRadius:5, border:'1px solid var(--border)',
                    background:'var(--surface-3)', color:'var(--accent)', fontSize:'0.72rem',
                    fontFamily:'var(--mono)', cursor:'pointer',
                  }}>{p.tag}</button>
                ))}
                <div style={{ width:1, height:20, background:'var(--border)', margin:'0 4px' }} />
                {/* Image upload */}
                <button
                  onClick={() => imageRef.current?.click()}
                  disabled={uploadingImage}
                  style={{ padding:'3px 10px', borderRadius:5, border:'1px solid var(--border)', background:'var(--surface-3)', color:'var(--text-2)', fontSize:'0.75rem', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}
                >
                  {uploadingImage ? <><span className="spinner" style={{ width:10, height:10 }} />Uploading…</> : '🖼 Insert Image'}
                </button>
                <input ref={imageRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display:'none' }} />
                <span style={{ fontSize:'0.7rem', color:'var(--text-3)', marginLeft:4 }}>Images are embedded as base64</span>
              </div>

              {/* Body editor */}
              <div className="form-group">
                <label className="form-label">Email Body (HTML)</label>
                <textarea
                  id="template-body"
                  value={tpl?.body||''}
                  onChange={e=>updateTemplate('body',e.target.value)}
                  style={{ minHeight:320, fontFamily:'var(--mono)', fontSize:'0.77rem', lineHeight:1.7 }}
                />
                <p className="form-hint">Full HTML supported — paste rich content, add tables, images, signatures, etc.</p>
              </div>

              {/* Formatting tips */}
              <details style={{ marginTop:4 }}>
                <summary style={{ fontSize:'0.78rem', color:'var(--text-3)', cursor:'pointer' }}>HTML formatting tips</summary>
                <div style={{ marginTop:10, padding:12, background:'var(--surface-2)', borderRadius:'var(--radius)', fontSize:'0.78rem', color:'var(--text-2)', lineHeight:2 }}>
                  <code style={{ fontFamily:'var(--mono)' }}>&lt;strong&gt;bold&lt;/strong&gt;</code> · <code style={{ fontFamily:'var(--mono)' }}>&lt;em&gt;italic&lt;/em&gt;</code> · <code style={{ fontFamily:'var(--mono)' }}>&lt;br&gt;</code> line break · <code style={{ fontFamily:'var(--mono)' }}>&lt;p&gt;…&lt;/p&gt;</code> paragraph · <code style={{ fontFamily:'var(--mono)' }}>&lt;a href="…"&gt;link&lt;/a&gt;</code>
                </div>
              </details>
            </div>

            {/* Preview panel */}
            {preview && (
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'0.88rem', fontWeight:600 }}>Email Preview</span>
                  <span style={{ fontSize:'0.74rem', color:'var(--text-3)' }}>Font: {font.split(',')[0]}, {fontSize}</span>
                </div>
                <div style={{ background:'#f4f4f4', padding:16 }}>
                  <div style={{ background:'#fff', borderRadius:6, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
                    <div style={{ background: headerColor, padding:'14px 20px' }}>
                      <span style={{ color:'#fff', fontFamily: font, fontSize:'13pt', fontWeight:'bold' }}>{fromName}</span>
                    </div>
                    <div style={{ padding:20 }}>
                      <p style={{ fontSize:'0.78rem', color:'#888', marginBottom:12, fontFamily:'monospace' }}>
                        Subject: {(tpl?.subject||'').replace(/{{name}}/g,'John Doe').replace(/{{training_name}}/g,'Leadership Essentials').replace(/{{training_date}}/g,'January 15, 2025')}
                      </p>
                      <div
                        style={{ fontFamily: font, fontSize: fontSize, color:'#1a1a1a', lineHeight:1.7 }}
                        dangerouslySetInnerHTML={{ __html: renderPreview(tpl?.body) + (settings?.emailStyle?.signature ? `<div style="margin-top:16px">${settings.emailStyle.signature}</div>` : '') }}
                      />
                    </div>
                    <div style={{ padding:'12px 20px', background:'#f8f8f8', borderTop:'1px solid #eee' }}>
                      <p style={{ margin:0, fontFamily: font, fontSize:'10pt', color:'#888' }}>This email was sent by {fromName}.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
