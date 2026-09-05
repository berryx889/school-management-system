import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePublicBranding } from '../hooks/usePublicBranding.js';
import './Landing.css';

// What members of the school community can do in the portal — framed for THIS school, not a
// product being sold.
const FEATURES = [
  { fi: 'fi-1', title: 'Attendance', desc: 'Daily attendance and QR gate scanning, with instant alerts to parents.', d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14v7M14 17.5h7' },
  { fi: 'fi-4', title: 'Results & report cards', desc: 'Termly results, positions and grades, released to students and parents online.', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8' },
  { fi: 'fi-2', title: 'Fees & receipts', desc: 'See fee balances, pay online, and get an instant receipt for every payment.', d: 'M2 4h20v16H2zM2 10h20' },
  { fi: 'fi-6', title: 'Parent & student portal', desc: 'Check attendance, results, fees and notices from any phone — no app to install.', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-.01M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { fi: 'fi-3', title: 'Announcements', desc: 'School-wide notices and SMS reach every parent and teacher in seconds.', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { fi: 'fi-10', title: 'Timetable', desc: 'The weekly class timetable, always up to date and easy to check.', d: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageRef = useRef(null);
  const { data: branding } = usePublicBranding();

  const name = branding?.name || 'OUR WORLD MODEL SCHOOL';
  const motto = branding?.motto || '';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'S';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = pageRef.current?.querySelectorAll('.reveal');
    if (!els?.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const Logo = () => (
    <span className="nav-logo" style={{ cursor: 'default' }}>
      {branding?.logo_url
        ? <img src={branding.logo_url} alt={`${branding.name || 'School'} logo`} className="logo-mark" style={{ objectFit: 'contain', background: 'transparent', padding: 0 }} />
        : <span className="logo-mark">{initials}</span>}
      <span className="logo-text">{name}</span>
    </span>
  );

  return (
    <div className="landing-page" ref={pageRef}>
      {/* Navigation */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <Logo />
          <div className="nav-links">
            <a href="#portals">Sign in</a>
            <a href="#features">What you can do</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="btn-nav btn-nav-p">Sign in</Link>
          </div>
          <button className="nav-burger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="5" x2="17" y2="5" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="15" x2="17" y2="15" /></svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu${mobileOpen ? ' open' : ''}`}>
        <button className="mm-close" onClick={closeMobile} aria-label="Close menu">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="3" x2="15" y2="15" /><line x1="15" y1="3" x2="3" y2="15" /></svg>
        </button>
        <a href="#portals" onClick={closeMobile}>Sign in</a>
        <a href="#features" onClick={closeMobile}>What you can do</a>
        <Link to="/login" className="mm-login" onClick={closeMobile}>Sign in</Link>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="shape shape-circle" style={{ width: 300, height: 300, background: 'var(--primary)', opacity: 0.04, top: -80, right: '10%' }} />
          <div className="shape shape-circle" style={{ width: 200, height: 200, background: 'var(--accent)', opacity: 0.05, bottom: '10%', left: '5%' }} />
          <div className="shape shape-blob" style={{ width: 400, height: 400, background: 'var(--primary)', opacity: 0.03, top: '30%', left: '40%' }} />
          <div className="shape" style={{ top: '18%', right: '48%', opacity: 0.12 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="var(--primary)"><path d="M24 0 L28 18 L48 14 L32 24 L48 34 L28 30 L24 48 L20 30 L0 34 L16 24 L0 14 L20 18Z" /></svg>
          </div>
        </div>
        <div className="wrap hero-grid">
          <div className="hero-content">
            <span className="badge badge-a hero-badge reveal">Welcome</span>
            <h1 className="reveal reveal-d1">{name}</h1>
            <p className="hero-sub reveal reveal-d2">
              {motto ? <em style={{ color: 'var(--primary)', fontStyle: 'normal', fontWeight: 700 }}>{motto}. </em> : null}
              Your online school portal — attendance, results, fees and communication, all in one place for staff, students and parents.
            </p>
            <div className="hero-actions reveal reveal-d3">
              <Link to="/login" className="btn btn-a">Sign in</Link>
              <a href="#features" className="btn btn-s">See what you can do</a>
            </div>
          </div>
          <div className="hero-visual reveal reveal-d2">
            <div className="hero-visual-bg" />
            <div className="mock-card mc-attend">
              <div className="mc-label">Today's Attendance</div>
              <div className="mc-donut-wrap">
                <svg viewBox="0 0 36 36" width="56" height="56">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--success)" strokeWidth="3.5" strokeDasharray="81 88" strokeDashoffset="22" strokeLinecap="round" />
                  <text x="18" y="19.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--text)" fontFamily="var(--font-d)">96%</text>
                </svg>
                <div className="mc-donut-legend">
                  <span className="mc-dot mc-dot-g">Present</span>
                  <span className="mc-dot mc-dot-a">Late</span>
                  <span className="mc-dot mc-dot-r">Absent</span>
                </div>
              </div>
            </div>
            <div className="mock-card mc-students">
              <div className="mc-label">My results</div>
              <div className="mc-val mc-val-sm">Term 1</div>
              <div className="mc-sub" style={{ color: 'var(--success)' }}>Released</div>
            </div>
            <div className="mock-card mc-notif">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="mc-label" style={{ margin: 0 }}>Notices</div>
                <div className="mc-notif-badge">2</div>
              </div>
              <div className="mc-notif-items">
                <div className="mc-notif-item"><span className="mc-notif-dot" />PTA meeting on Friday</div>
                <div className="mc-notif-item"><span className="mc-notif-dot" />Fees receipt available</div>
              </div>
            </div>
            <div className="mock-card mc-chart">
              <div className="mc-label">Attendance trend</div>
              <svg viewBox="0 0 220 60" width="220" height="60" fill="none">
                <path d="M0 50 Q30 45 55 38 T110 22 T165 30 T220 10" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M0 50 Q30 45 55 38 T110 22 T165 30 T220 10 V60 H0Z" fill="var(--primary)" opacity="0.08" />
                <circle cx="220" cy="10" r="4" fill="var(--primary)" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Portals */}
      <section className="why" id="portals">
        <div className="shape shape-circle why-deco-1" />
        <div className="shape shape-circle why-deco-2" />
        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-head">
            <span className="badge badge-p reveal">Sign in</span>
            <h2 className="reveal reveal-d1">Choose your <span className="em-accent">portal.</span></h2>
            <p className="reveal reveal-d2">One sign-in for everyone at {name}.</p>
          </div>
          <div className="why-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', maxWidth: 760, margin: '0 auto' }}>
            <Link to="/login" className="why-card reveal" style={{ textDecoration: 'none' }}>
              <div className="why-icon why-icon-1">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <h3>Staff</h3>
              <p>Admins, teachers and kitchen staff — manage students, marks, fees and attendance.</p>
            </Link>
            <Link to="/login" className="why-card reveal reveal-d1" style={{ textDecoration: 'none' }}>
              <div className="why-icon why-icon-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <h3>Students &amp; parents</h3>
              <p>Check attendance, exam results, fee balances and school notices from any phone.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="wrap">
          <div className="section-head">
            <span className="badge badge-a reveal">The portal</span>
            <h2 className="reveal reveal-d1">Everything the school <span className="em-primary">community needs.</span></h2>
            <p className="reveal reveal-d2">One place for the day-to-day running of {name}.</p>
          </div>
          <div className="feat-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feat-card reveal${i > 0 ? ` reveal-d${i}` : ''}`}>
                <div className={`feat-icon ${f.fi}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={f.d} /></svg>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="wrap">
          <div className="cta-inner">
            <h2 className="reveal">Sign in to {name}</h2>
            <p className="reveal reveal-d1">Staff, students and parents — access attendance, results, fees and notices in one place.</p>
            <div className="cta-actions reveal reveal-d2">
              <Link to="/login" className="btn btn-w">Sign in</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer" id="footer">
        <div className="wrap">
          <div className="footer-bottom" style={{ borderTop: 'none', paddingTop: 0, flexWrap: 'wrap', gap: 16 }}>
            <div className="footer-brand" style={{ maxWidth: 'none' }}>
              <Logo />
              {motto ? <p style={{ marginTop: 10 }}>{motto}</p> : null}
              {(branding?.address || branding?.phone) && (
                <p style={{ marginTop: 6, color: 'var(--text-3)' }}>
                  {[branding.address, branding.phone].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <span className="footer-copy">&copy; {new Date().getFullYear()} {name}. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
