import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.push('/dashboard');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Head><title>Sign In – TrainingPulse</title></Head>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative' }}>
        <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.13), transparent)', pointerEvents:'none' }} />
        <div style={{ width:'100%', maxWidth:400, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'36px 32px', boxShadow:'var(--shadow-lg)', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
            <div style={{ width:46, height:46, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:'0.92rem', fontWeight:700 }}>TrainingPulse</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:2 }}>L&D Reminder System</div>
            </div>
          </div>
          <h1 style={{ fontSize:'1.4rem', fontWeight:700, marginBottom:6 }}>Welcome back</h1>
          <p style={{ fontSize:'0.85rem', color:'var(--text-2)', marginBottom:24 }}>Sign in to your admin dashboard</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" placeholder="admin" value={form.username} onChange={e => setForm({...form, username:e.target.value})} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password:e.target.value})} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center', marginTop:8 }} disabled={loading}>
              {loading ? <><span className="spinner" />&nbsp;Signing in…</> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
