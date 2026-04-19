import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/dashboard/participants', label: 'Participants', icon: 'users' },
  { href: '/dashboard/upload', label: 'Upload & Send', icon: 'upload' },
  { href: '/dashboard/history', label: 'Send History', icon: 'history' },
  { href: '/dashboard/reminders', label: 'Run Reminders', icon: 'bell' },
  { href: '/dashboard/templates', label: 'Email Templates', icon: 'mail' },
  { href: '/dashboard/logs', label: 'Activity Logs', icon: 'list' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
];

function Icon({ name }) {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    upload: <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
    history: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.62"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></>,
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

export default function Layout({ children, title = 'Dashboard' }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <>
      <Head><title>{title} – TrainingPulse</title></Head>
      <div style={{ display:'flex', minHeight:'100vh' }}>
        {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:99 }} />}

        <aside style={{ width:232, flexShrink:0, background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', position:'fixed', top:0, bottom:0, left:0, zIndex:100 }}>
          <div style={{ padding:'16px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:'0.87rem', fontWeight:700, letterSpacing:'-0.01em' }}>TrainingPulse</div>
              <div style={{ fontSize:'0.67rem', color:'var(--text-3)', marginTop:1 }}>L&D Admin</div>
            </div>
          </div>

          <nav style={{ flex:1, padding:'8px 7px', overflowY:'auto' }}>
            {NAV.map(item => {
              const active = router.pathname === item.href;
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration:'none' }} onClick={() => setMobileOpen(false)}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:7, marginBottom:1,
                    background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-2)',
                    cursor:'pointer', transition:'all 0.12s',
                  }}>
                    <span style={{ opacity: active ? 1 : 0.65, flexShrink:0 }}><Icon name={item.icon} /></span>
                    <span style={{ fontSize:'0.83rem', fontWeight:500 }}>{item.label}</span>
                    {active && <div style={{ marginLeft:'auto', width:5, height:5, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div style={{ padding:'8px 7px', borderTop:'1px solid var(--border)' }}>
            <button onClick={handleLogout} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:7,
              background:'transparent', border:'none', cursor:'pointer',
              color:'var(--text-3)', fontSize:'0.83rem', fontWeight:500, fontFamily:'var(--font)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        <main style={{ flex:1, marginLeft:232, display:'flex', flexDirection:'column', minHeight:'100vh' }}>
          <header style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 28px', borderBottom:'1px solid var(--border)', background:'var(--surface)', position:'sticky', top:0, zIndex:50 }}>
            <h1 style={{ flex:1, fontSize:'0.95rem', fontWeight:600 }}>{title}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:20, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.18)', color:'var(--accent)', fontSize:'0.73rem', fontWeight:500 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)' }} />
              Admin
            </div>
          </header>
          <div style={{ padding:'24px 28px', flex:1 }}>{children}</div>
        </main>
      </div>
    </>
  );
}
