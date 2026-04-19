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
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Login – TrainingPulse</title></Head>
      <div style={styles.page}>
        <div style={styles.bg} />
        <div style={styles.card}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <div style={styles.logoTitle}>TrainingPulse</div>
              <div style={styles.logoSub}>L&D Reminder System</div>
            </div>
          </div>

          <h1 style={styles.heading}>Welcome back</h1>
          <p style={styles.subheading}>Sign in to your admin dashboard</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                placeholder="admin"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" />&nbsp;Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p style={styles.hint}>
            Credentials are configured in <code style={styles.code}>.env.local</code>
          </p>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    position: 'relative',
  },
  bg: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.13), transparent)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: 400,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '36px 32px',
    boxShadow: 'var(--shadow-lg)', position: 'relative', zIndex: 1,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoIcon: {
    width: 46, height: 46, background: 'var(--surface-2)',
    border: '1px solid var(--border)', borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoTitle: { fontSize: '1rem', fontWeight: 700 },
  logoSub: { fontSize: '0.73rem', color: 'var(--text-3)', marginTop: 2 },
  heading: { fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 },
  subheading: { fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 24 },
  hint: { fontSize: '0.74rem', color: 'var(--text-3)', marginTop: 20, textAlign: 'center' },
  code: {
    background: 'var(--surface-2)', padding: '1px 5px',
    borderRadius: 4, fontFamily: 'var(--mono)', fontSize: '0.72rem',
  },
};
