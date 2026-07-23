import { Fragment, useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const CheckSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
);

const StarSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
);

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
);

const STATS = [
  { count: 240, label: 'Schools onboarded' },
  { count: 85000, label: 'Students managed' },
  { count: 1200000, label: 'Attendance records' },
  { count: 4500000, label: 'Fees processed', prefix: 'GHS ' },
];

const FAQS = [
  { q: 'How long does setup take?', a: 'Most schools are fully set up within three to five business days. We handle importing your student records, configuring fee structures, and training your staff.' },
  { q: 'Can I import my existing student data?', a: 'Yes. We accept CSV and Excel files. Just export your roster from whatever tool you use today and our team will map the columns and import everything.' },
  { q: 'Do parents need to install an app?', a: 'No. The parent portal works in any web browser on any phone — no app store download required. Parents also receive SMS notifications without needing the portal.' },
  { q: 'What happens if there’s no internet?', a: 'Attendance can be marked offline and synced when connectivity returns. The platform is built to work on low-bandwidth connections common across West Africa.' },
  { q: 'Is our data secure?', a: 'Your data is encrypted at rest and in transit. We use role-based access control. Daily backups ensure nothing is lost. Each school’s data is fully isolated.' },
  { q: 'Can I try before I buy?', a: 'Every plan comes with a 14-day free trial — no credit card required. Book a demo and we’ll walk you through it live.' },
];

const PRICING = [
  {
    name: 'Starter', label: 'For small schools just getting started',
    monthly: 150, yearly: 120, period: 'Up to 200 students',
    features: ['Student management', 'Attendance tracking', 'Fee collection', 'Report cards', 'Parent portal'],
    btnClass: 'btn btn-s price-btn', btnText: 'Get started',
  },
  {
    name: 'Growth', label: 'For growing schools that need more power',
    monthly: 350, yearly: 280, period: 'Up to 500 students', featured: true,
    features: ['Everything in Starter', 'SMS notifications', 'QR gate scanner', 'Analytics dashboard', 'Role-based permissions', 'Priority support'],
    btnClass: 'btn btn-w price-btn', btnText: 'Get started',
  },
  {
    name: 'Enterprise', label: 'For large schools and school groups',
    monthly: 650, yearly: 520, period: 'Unlimited students',
    features: ['Everything in Growth', 'Multi-campus support', 'Custom branding', 'API access', 'Dedicated account manager'],
    btnClass: 'btn btn-s price-btn', btnText: 'Contact sales',
  },
];

function formatCount(val, target) {
  if (target >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (target >= 10000) return (val / 1000).toFixed(target >= 100000 ? 0 : 1) + 'k';
  return val.toLocaleString();
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [yearly, setYearly] = useState(false);
  const [statValues, setStatValues] = useState(STATS.map(() => 0));
  const statAnimated = useRef(new Set());
  const revealed = useRef(new Set());
  const [, forceReveal] = useState(0);
  const pageRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = pageRef.current?.querySelectorAll('.reveal');
    if (!els?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        let hadFaq = false;
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('vis');
            obs.unobserve(e.target);
            if (e.target.classList.contains('faq-item')) {
              revealed.current.add(e.target.dataset.faqIdx);
              hadFaq = true;
            }
          }
        });
        if (hadFaq) forceReveal((n) => n + 1);
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const els = pageRef.current?.querySelectorAll('.stat-num');
    if (!els?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const idx = Number(e.target.dataset.idx);
          if (statAnimated.current.has(idx)) return;
          statAnimated.current.add(idx);
          obs.unobserve(e.target);
          const target = STATS[idx].count;
          const dur = 1800;
          const start = performance.now();
          function step(now) {
            const t = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            const val = Math.floor(ease * target);
            setStatValues((prev) => { const next = [...prev]; next[idx] = val; return next; });
            if (t < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.5 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const toggleFaq = useCallback((i) => {
    setOpenFaq((prev) => (prev === i ? null : i));
  }, []);

  return (
    <div className="landing-page" ref={pageRef}>
      {/* Navigation */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <span className="logo-mark">BF</span>
            <span className="logo-text">Bright Future</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#showcase">Solutions</a>
            <a href="#testimonials">Schools</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">Resources</a>
            <a href="#footer">About</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-login">Login</Link>
            <Link to="/signup" className="btn-nav btn-nav-s">Book Demo</Link>
            <Link to="/signup" className="btn-nav btn-nav-p">Get Started</Link>
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
        <a href="#features" onClick={closeMobile}>Features</a>
        <a href="#showcase" onClick={closeMobile}>Solutions</a>
        <a href="#testimonials" onClick={closeMobile}>Schools</a>
        <a href="#pricing" onClick={closeMobile}>Pricing</a>
        <a href="#faq" onClick={closeMobile}>Resources</a>
        <a href="#footer" onClick={closeMobile}>About</a>
        <Link to="/login" className="mm-login" onClick={closeMobile}>Log in</Link>
        <div className="mm-actions">
          <Link to="/signup" className="btn btn-s" onClick={closeMobile}>Book Demo</Link>
          <Link to="/signup" className="btn btn-a" onClick={closeMobile}>Get Started</Link>
        </div>
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
          <div className="shape" style={{ bottom: '25%', left: '48%', opacity: 0.08 }}>
            <svg width="36" height="36" viewBox="0 0 48 48" fill="var(--accent)"><path d="M24 0 L28 18 L48 14 L32 24 L48 34 L28 30 L24 48 L20 30 L0 34 L16 24 L0 14 L20 18Z" /></svg>
          </div>
        </div>
        <div className="wrap hero-grid">
          <div className="hero-content">
            <span className="badge badge-a hero-badge reveal">Built for African schools</span>
            <h1 className="reveal reveal-d1"><span className="em-accent">The school</span> platform <span className="em-primary">Africa deserves.</span></h1>
            <p className="hero-sub reveal reveal-d2">One beautiful system for administrators, teachers, and parents to manage attendance, fees, exams, and communication &mdash; so your school can focus on what matters.</p>
            <div className="hero-actions reveal reveal-d3">
              <Link to="/signup" className="btn btn-a">Start free trial</Link>
              <Link to="/signup" className="btn btn-s">Book a demo</Link>
            </div>
            <div className="hero-trust reveal reveal-d4">
              <span className="hero-trust-label">Trusted by schools across West Africa</span>
              <div className="hero-logos">
                <span className="hero-logo-pill">Sunrise Academy</span>
                <span className="hero-logo-pill">Victory Christian</span>
                <span className="hero-logo-pill">Al-Huda International</span>
                <span className="hero-logo-pill">Greenfield Prep</span>
              </div>
            </div>
          </div>
          <div className="hero-visual reveal reveal-d2">
            <div className="hero-visual-bg" />
            {/* Attendance card */}
            <div className="mock-card mc-attend">
              <div className="mc-label">Today's Attendance</div>
              <div className="mc-donut-wrap">
                <svg viewBox="0 0 36 36" width="56" height="56">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--success)" strokeWidth="3.5" strokeDasharray="81 88" strokeDashoffset="22" strokeLinecap="round" />
                  <text x="18" y="19.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--text)" fontFamily="var(--font-d)">92%</text>
                </svg>
                <div className="mc-donut-legend">
                  <span className="mc-dot mc-dot-g">184 Present</span>
                  <span className="mc-dot mc-dot-a">12 Late</span>
                  <span className="mc-dot mc-dot-r">4 Absent</span>
                </div>
              </div>
            </div>
            {/* Revenue card */}
            <div className="mock-card mc-revenue">
              <div className="mc-label">Term Revenue</div>
              <div className="mc-val">GHS 45,200</div>
              <div className="mc-sub" style={{ color: 'var(--success)' }}>+18% from last term</div>
              <div className="mc-bars">
                <div className="mc-bar mc-bar-fill" style={{ height: '45%' }} />
                <div className="mc-bar mc-bar-fill" style={{ height: '60%' }} />
                <div className="mc-bar mc-bar-fill" style={{ height: '35%' }} />
                <div className="mc-bar mc-bar-fill" style={{ height: '72%' }} />
                <div className="mc-bar mc-bar-active" style={{ height: '90%' }} />
                <div className="mc-bar mc-bar-fill" style={{ height: '55%' }} />
                <div className="mc-bar mc-bar-fill" style={{ height: '40%' }} />
              </div>
            </div>
            {/* Students card */}
            <div className="mock-card mc-students">
              <div className="mc-label">Total Students</div>
              <div className="mc-val mc-val-sm">1,247</div>
              <div className="mc-sub" style={{ color: 'var(--success)' }}>+12% this term</div>
            </div>
            {/* Notifications card */}
            <div className="mock-card mc-notif">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="mc-label" style={{ margin: 0 }}>Alerts</div>
                <div className="mc-notif-badge">3</div>
              </div>
              <div className="mc-notif-items">
                <div className="mc-notif-item"><span className="mc-notif-dot" />Fee payment received</div>
                <div className="mc-notif-item"><span className="mc-notif-dot" />New student enrolled</div>
              </div>
            </div>
            {/* Payments card */}
            <div className="mock-card mc-payments">
              <div className="mc-label">Recent Payments</div>
              <div className="mc-pay-item"><span className="mc-pay-name">Ama Darko</span><span className="mc-pay-amt">GHS 850</span></div>
              <div className="mc-pay-item"><span className="mc-pay-name">Kofi Mensah</span><span className="mc-pay-amt">GHS 1,200</span></div>
              <div className="mc-pay-item"><span className="mc-pay-name">Fatima Bello</span><span className="mc-pay-amt">GHS 650</span></div>
            </div>
            {/* Chart card */}
            <div className="mock-card mc-chart">
              <div className="mc-label">Weekly Trend</div>
              <svg viewBox="0 0 220 60" width="220" height="60" fill="none">
                <path d="M0 50 Q30 45 55 38 T110 22 T165 30 T220 10" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M0 50 Q30 45 55 38 T110 22 T165 30 T220 10 V60 H0Z" fill="var(--primary)" opacity="0.08" />
                <circle cx="220" cy="10" r="4" fill="var(--primary)" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats">
        <div className="wrap">
          <div className="stats-grid">
            {STATS.map((s, i) => (
              <div className={`stat-card reveal${i > 0 ? ` reveal-d${i}` : ''}`} key={s.label}>
                <div className="stat-num" data-idx={i}>
                  {(s.prefix || '') + formatCount(statValues[i], s.count) + '+'}
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Schools Love */}
      <section className="why" id="why">
        <div className="shape shape-circle why-deco-1" />
        <div className="shape shape-circle why-deco-2" />
        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-head">
            <span className="badge badge-p reveal">Why Bright Future</span>
            <h2 className="reveal reveal-d1">Everything your school needs, <span className="em-accent">beautifully organized.</span></h2>
            <p className="reveal reveal-d2">Schools across Africa are switching from paper registers and scattered spreadsheets to one platform that handles it all.</p>
          </div>
          <div className="why-grid">
            <div className="why-card reveal">
              <div className="why-icon why-icon-1">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
              </div>
              <h3>Run your entire school from one place</h3>
              <p>Student records, attendance, fees, exams, report cards, timetables, and parent communication. No more juggling five different tools or stacks of paper.</p>
            </div>
            <div className="why-card reveal reveal-d1">
              <div className="why-icon why-icon-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <h3>Save fifteen hours every week</h3>
              <p>Automated report cards, bulk SMS to parents, smart fee tracking, and instant analytics replace the manual spreadsheets and paper registers your staff dreads.</p>
            </div>
            <div className="why-card reveal reveal-d2">
              <div className="why-icon why-icon-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <h3>Parents stay in the loop</h3>
              <p>A dedicated parent portal shows attendance, exam results, fee balances, and school announcements in real time. No more chasing paper slips or unanswered phone calls.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="showcase" id="showcase">
        <div className="wrap">
          {/* Student Management */}
          <div className="show-block">
            <div className="show-text">
              <span className="badge badge-p reveal">Student Management</span>
              <h2 className="reveal reveal-d1">Every student profile, <span className="em-accent">one click away.</span></h2>
              <p className="reveal reveal-d2">Enrollment, class assignment, guardian details, medical records, and academic history &mdash; all in a clean, searchable directory. Import your existing roster in minutes.</p>
              <ul className="reveal reveal-d3">
                <li><CheckSvg />Bulk CSV import and export</li>
                <li><CheckSvg />QR-coded student ID cards</li>
                <li><CheckSvg />Automatic class promotion</li>
              </ul>
              <a href="#" className="btn btn-s reveal reveal-d4">Learn more</a>
            </div>
            <div className="show-visual reveal reveal-d2">
              <div className="show-mockup">
                <div className="show-mockup-bar"><span className="show-mockup-dot" style={{ background: '#FF5F57' }} /><span className="show-mockup-dot" style={{ background: '#FFBD2E' }} /><span className="show-mockup-dot" style={{ background: '#27C93F' }} /></div>
                <div className="show-mockup-body">
                  <div style={{ display: 'flex', gap: 10 }}><div style={{ flex: 1, height: 36, background: 'var(--primary-soft)', borderRadius: 12 }} /><div style={{ height: 36, width: 120, background: 'var(--border-lt)', borderRadius: 12 }} /></div>
                  {[{ bg: '--primary-soft', w1: '60%', w2: '40%' }, { bg: '--accent-soft', w1: '55%', w2: '35%' }, { bg: '--secondary-soft', w1: '65%', w2: '45%' }].map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border-lt)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `var(${r.bg})`, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}><div style={{ height: 10, width: r.w1, background: 'var(--border)', borderRadius: 4, marginBottom: 6 }} /><div style={{ height: 8, width: r.w2, background: 'var(--border-lt)', borderRadius: 4 }} /></div>
                      <div style={{ height: 26, width: 56, borderRadius: 8, background: 'var(--primary-soft)' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Attendance */}
          <div className="show-block">
            <div className="show-text">
              <span className="badge badge-a reveal">Smart Attendance</span>
              <h2 className="reveal reveal-d1"><span className="em-primary">QR scan in,</span> reports out.</h2>
              <p className="reveal reveal-d2">Students scan their QR cards at the gate. Teachers mark class attendance on their phones. Parents get an instant SMS when their child arrives. Attendance data feeds directly into report cards and analytics.</p>
              <ul className="reveal reveal-d3">
                <li><CheckSvg />QR gate scanning</li>
                <li><CheckSvg />Real-time parent SMS alerts</li>
                <li><CheckSvg />Monthly attendance calendar view</li>
              </ul>
              <a href="#" className="btn btn-s reveal reveal-d4">Learn more</a>
            </div>
            <div className="show-visual reveal reveal-d2">
              <div className="show-mockup">
                <div className="show-mockup-bar"><span className="show-mockup-dot" style={{ background: '#FF5F57' }} /><span className="show-mockup-dot" style={{ background: '#FFBD2E' }} /><span className="show-mockup-dot" style={{ background: '#27C93F' }} /></div>
                <div className="show-mockup-body" style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ width: 100, height: 100, borderRadius: 24, border: '3px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="8" height="8" rx="1" /></svg>
                  </div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 15 }}>Scan student QR code</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Point camera at student ID card</div></div>
                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <div style={{ flex: 1, padding: 12, background: 'var(--primary-soft)', borderRadius: 14, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>Present: 184</div>
                    <div style={{ flex: 1, padding: 12, background: 'var(--accent-soft)', borderRadius: 14, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--warning)' }}>Late: 12</div>
                    <div style={{ flex: 1, padding: 12, background: '#FEE2E2', borderRadius: 14, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>Absent: 4</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Fee Management */}
          <div className="show-block">
            <div className="show-text">
              <span className="badge badge-p reveal">Fee Management</span>
              <h2 className="reveal reveal-d1">Transparent fees, <span className="em-accent">fewer disputes.</span></h2>
              <p className="reveal reveal-d2">Set up fee structures by class and term. Track who has paid and who owes. Accept mobile money payments through Paystack. Print receipts with one click. Parents see their balance in their own portal.</p>
              <ul className="reveal reveal-d3">
                <li><CheckSvg />Mobile money and card payments</li>
                <li><CheckSvg />Automated debtor tracking</li>
                <li><CheckSvg />Printable payment receipts</li>
              </ul>
              <a href="#" className="btn btn-s reveal reveal-d4">Learn more</a>
            </div>
            <div className="show-visual reveal reveal-d2">
              <div className="show-mockup">
                <div className="show-mockup-bar"><span className="show-mockup-dot" style={{ background: '#FF5F57' }} /><span className="show-mockup-dot" style={{ background: '#FFBD2E' }} /><span className="show-mockup-dot" style={{ background: '#27C93F' }} /></div>
                <div className="show-mockup-body">
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1, padding: 16, background: 'var(--primary-soft)', borderRadius: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Collected</div><div style={{ fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: 20, color: 'var(--success)', marginTop: 4 }}>GHS 45,200</div></div>
                    <div style={{ flex: 1, padding: 16, background: 'var(--accent-soft)', borderRadius: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outstanding</div><div style={{ fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: 20, color: 'var(--warning)', marginTop: 4 }}>GHS 12,800</div></div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { name: 'Ama Darko — JHS 2', amt: 'GHS 850', color: 'var(--success)' },
                      { name: 'Kofi Mensah — JHS 1', amt: 'GHS 1,200', color: 'var(--success)' },
                      { name: 'Fatima Bello — Primary 6', amt: 'Owes GHS 400', color: 'var(--danger)' },
                    ].map((p) => (
                      <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--surface)', borderRadius: 10, fontSize: 13, alignItems: 'center', border: '1px solid var(--border-lt)' }}>
                        <span style={{ color: 'var(--text-2)' }}>{p.name}</span>
                        <span style={{ fontWeight: 700, color: p.color, fontFamily: 'var(--font-d)' }}>{p.amt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Exams & Report Cards */}
          <div className="show-block">
            <div className="show-text">
              <span className="badge badge-a reveal">Exams &amp; Report Cards</span>
              <h2 className="reveal reveal-d1">From marks entry to <span className="em-primary">printed reports</span> in minutes.</h2>
              <p className="reveal reveal-d2">Teachers enter marks by subject. The system calculates positions, grade bands, and class averages. Admins review and release results. Parents view them instantly. Print beautiful, professional report cards with your school's branding.</p>
              <ul className="reveal reveal-d3">
                <li><CheckSvg />Automatic position ranking</li>
                <li><CheckSvg />Configurable grade bands</li>
                <li><CheckSvg />Branded PDF report cards</li>
              </ul>
              <a href="#" className="btn btn-s reveal reveal-d4">Learn more</a>
            </div>
            <div className="show-visual reveal reveal-d2">
              <div className="show-mockup">
                <div className="show-mockup-bar"><span className="show-mockup-dot" style={{ background: '#FF5F57' }} /><span className="show-mockup-dot" style={{ background: '#FFBD2E' }} /><span className="show-mockup-dot" style={{ background: '#27C93F' }} /></div>
                <div className="show-mockup-body" style={{ gap: 10 }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 14, textAlign: 'center', padding: '8px 0', borderBottom: '1.5px solid var(--border-lt)' }}>Term 1 Report Card &mdash; JHS 2</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 0, fontSize: 11, overflow: 'auto' }}>
                    {['Subject', 'Score', 'Grade', 'Pos.'].map((h) => (
                      <div key={h} style={{ padding: 8, fontWeight: 700, color: 'var(--text-3)', borderBottom: '1.5px solid var(--border-lt)', textAlign: h !== 'Subject' ? 'center' : undefined }}>{h}</div>
                    ))}
                    {[
                      { sub: 'Mathematics', score: '87', grade: 'A', gColor: 'var(--success)', pos: '3rd' },
                      { sub: 'English', score: '92', grade: 'A+', gColor: 'var(--success)', pos: '1st' },
                      { sub: 'Science', score: '78', grade: 'B+', gColor: 'var(--primary)', pos: '5th' },
                    ].map((r) => (
                      <Fragment key={r.sub}>
                        <div style={{ padding: 8 }}>{r.sub}</div>
                        <div style={{ padding: 8, textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.score}</div>
                        <div style={{ padding: 8, textAlign: 'center', fontWeight: 700, color: r.gColor }}>{r.grade}</div>
                        <div style={{ padding: 8, textAlign: 'center', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{r.pos}</div>
                      </Fragment>
                    ))}
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1, padding: 10, background: 'var(--primary-soft)', borderRadius: 12, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>Avg: 85.7</div>
                    <div style={{ flex: 1, padding: 10, background: 'var(--accent-soft)', borderRadius: 12, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>Position: 3rd / 42</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="dash-section" id="dashboard">
        <div className="wrap-lg">
          <div className="section-head" style={{ position: 'relative', zIndex: 1 }}>
            <span className="badge badge-p reveal">Live Dashboard</span>
            <h2 className="reveal reveal-d1">Your school <span className="em-accent">at a glance.</span></h2>
            <p className="reveal reveal-d2">Real-time analytics, attendance tracking, fee collection, and student performance &mdash; all on one screen.</p>
          </div>
          <div className="dash-frame reveal reveal-d3">
            <div className="dash-header">
              <div className="dash-header-left">
                <div className="dash-header-dots"><span style={{ background: '#FF5F57' }} /><span style={{ background: '#FFBD2E' }} /><span style={{ background: '#27C93F' }} /></div>
                <div style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 15 }}>Bright Future Admin</div>
              </div>
              <div className="dash-header-search">Search students, classes...</div>
            </div>
            <div className="dash-body">
              <div className="dash-sidebar">
                {[
                  { label: 'Dashboard', active: true, d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
                  { label: 'Students', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-0.01' },
                  { label: 'Attendance', d: 'M20 6L9 17l-5-5' },
                  { label: 'Fees', d: 'M2 4h20v16H2zM2 10h20' },
                  { label: 'Reports', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6' },
                  { label: 'Notices', d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
                ].map((item) => (
                  <div key={item.label} className={`dash-nav-item${item.active ? ' active' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.d} /></svg>
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="dash-main">
                <div className="dash-stats-row">
                  {[
                    { label: 'Students', val: '1,247', change: '+12%' },
                    { label: 'Present', val: '184', change: '92%' },
                    { label: 'Revenue', val: 'GHS 45.2k', change: '+18%' },
                    { label: 'SMS Sent', val: '2,340', change: 'This term' },
                  ].map((s) => (
                    <div key={s.label} className="dash-stat">
                      <div className="dash-stat-label">{s.label}</div>
                      <div className="dash-stat-val">{s.val}</div>
                      <div className="dash-stat-change">{s.change}</div>
                    </div>
                  ))}
                </div>
                <div className="dash-charts">
                  <div className="dash-chart-card">
                    <div className="dash-chart-title">Attendance &mdash; Last 14 Days</div>
                    <svg viewBox="0 0 500 120" width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
                      <defs><linearGradient id="lpAreaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.12" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
                      <path d="M0 80 L36 70 L72 65 L108 58 L144 60 L180 45 L216 50 L252 35 L288 38 L324 30 L360 32 L396 25 L432 20 L468 22 L500 15" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M0 80 L36 70 L72 65 L108 58 L144 60 L180 45 L216 50 L252 35 L288 38 L324 30 L360 32 L396 25 L432 20 L468 22 L500 15 V120 H0 Z" fill="url(#lpAreaG)" />
                      <circle cx="500" cy="15" r="4" fill="var(--primary)" />
                    </svg>
                  </div>
                  <div className="dash-chart-card">
                    <div className="dash-chart-title">Recent Activity</div>
                    <div className="dash-activity">
                      {[
                        { color: 'var(--success)', text: 'Ama Darko paid GHS 850' },
                        { color: 'var(--primary)', text: 'JHS 2 attendance marked' },
                        { color: 'var(--accent)', text: 'Term 1 results released' },
                        { color: 'var(--secondary)', text: 'New student enrolled' },
                        { color: 'var(--warning)', text: 'Fee reminder SMS sent' },
                      ].map((a) => (
                        <div key={a.text} className="dash-act-item"><span className="dash-act-dot" style={{ background: a.color }} />{a.text}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features" id="features">
        <div className="wrap">
          <div className="section-head">
            <span className="badge badge-a reveal">Features</span>
            <h2 className="reveal reveal-d1">Everything a <span className="em-primary">modern school</span> needs.</h2>
            <p className="reveal reveal-d2">Twelve tightly integrated modules. No add-ons, no hidden costs, no missing pieces.</p>
          </div>
          <div className="feat-grid">
            {[
              { fi: 'fi-1', title: 'QR Attendance', desc: 'Students scan at the gate. Instant records, instant parent alerts.', d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14v7M14 17.5h7' },
              { fi: 'fi-2', title: 'Fee Collection', desc: 'Accept mobile money. Track who paid, who owes, who needs a reminder.', d: 'M2 4h20v16H2zM2 10h20' },
              { fi: 'fi-3', title: 'SMS Notifications', desc: 'Bulk SMS to parents. Attendance alerts, fee reminders, announcements.', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
              { fi: 'fi-4', title: 'Report Cards', desc: 'Professional, branded PDF reports generated in seconds.', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8' },
              { fi: 'fi-5', title: 'Results Management', desc: 'Marks entry, auto-calculated positions, grade bands, broadsheets.', d: 'M22 12L18 12 15 21 9 3 6 12 2 12' },
              { fi: 'fi-6', title: 'Parent Portal', desc: 'Parents check attendance, results, fees, and notices from their phone.', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-.01M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
              { fi: 'fi-7', title: 'Teacher Portal', desc: 'Teachers enter marks, take attendance, and view their timetable.', d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
              { fi: 'fi-8', title: 'Kitchen Report', desc: 'Daily meal counts by class. Know exactly how many students to feed.', d: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3' },
              { fi: 'fi-9', title: 'Analytics', desc: 'Enrollment trends, attendance patterns, revenue dashboards.', d: 'M18 20V10M12 20V4M6 20v-6' },
              { fi: 'fi-10', title: 'Timetable', desc: 'Visual weekly timetable builder. Assign teachers to periods instantly.', d: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
              { fi: 'fi-11', title: 'Role Permissions', desc: 'Control who can enter marks, view results, or manage fees.', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
              { fi: 'fi-12', title: 'Bulk Promotions', desc: 'Promote an entire class to the next level in a single click.', d: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3' },
            ].map((f, i) => (
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

      {/* How It Works */}
      <section className="how" id="how">
        <div className="wrap">
          <div className="section-head">
            <span className="badge badge-a reveal">Getting Started</span>
            <h2 className="reveal reveal-d1">Three steps to a <span className="em-primary">smarter school.</span></h2>
            <p className="reveal reveal-d2">We handle the setup so your team can focus on teaching.</p>
          </div>
          <div className="how-steps">
            <div className="how-step reveal"><div className="how-num">1</div><h3>Book a demo</h3><p>See the platform in action with your own school's data. We'll walk you through every feature.</p></div>
            <div className="how-step reveal reveal-d2"><div className="how-num">2</div><h3>We set everything up</h3><p>Our team imports your student records, configures fee structures, and trains your staff.</p></div>
            <div className="how-step reveal reveal-d4"><div className="how-num">3</div><h3>Your school goes digital</h3><p>Start taking attendance, collecting fees, and generating report cards from day one.</p></div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testi" id="testimonials">
        <div className="wrap">
          <div className="section-head">
            <span className="badge badge-a reveal">Schools Love Us</span>
            <h2 className="reveal reveal-d1">Hear from schools already using <span className="em-primary">Bright Future.</span></h2>
          </div>
          <div className="testi-grid">
            {[
              { initials: 'AM', bg: 'var(--primary)', name: 'Mrs. Abena Mensah', role: 'Head Teacher, Sunrise Academy — Kumasi', text: 'We used to spend entire weekends preparing report cards. Now it takes minutes. The parents love checking results on their own phones instead of calling the school office.' },
              { initials: 'KA', bg: 'var(--secondary)', name: 'Mr. Kwame Asante', role: 'Proprietor, Victory Christian School — Accra', text: 'The fee tracking alone has saved us from so many disputes. Everything is transparent — parents see exactly what they owe and what they’ve paid. Our collections improved by 40% in the first term.' },
              { initials: 'FI', bg: 'var(--accent)', name: 'Mrs. Fatima Ibrahim', role: 'Administrator, Al-Huda International — Tamale', text: 'Before Bright Future, our teachers were still using exercise books to take attendance. Now they scan QR codes at the gate and parents get a text message the moment their child arrives. It changed everything.' },
            ].map((t, i) => (
              <div key={t.name} className={`testi-card reveal${i > 0 ? ` reveal-d${i}` : ''}`}>
                <span className="testi-quote-mark">&ldquo;</span>
                <div className="testi-stars"><StarSvg /><StarSvg /><StarSvg /><StarSvg /><StarSvg /></div>
                <p className="testi-text">{t.text}</p>
                <div className="testi-author">
                  <div className="testi-avatar" style={{ background: t.bg }}>{t.initials}</div>
                  <div className="testi-info"><span className="testi-name">{t.name}</span><span className="testi-role">{t.role}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing" id="pricing">
        <div className="wrap">
          <div className="section-head">
            <span className="badge badge-p reveal">Pricing</span>
            <h2 className="reveal reveal-d1">Simple, <span className="em-accent">transparent</span> pricing.</h2>
            <p className="reveal reveal-d2">No hidden fees. No per-user charges. Pick the plan that fits your school.</p>
          </div>
          <div className="pricing-toggle reveal reveal-d3">
            <span className={yearly ? '' : 'active'}>Monthly</span>
            <div className={`toggle-track${yearly ? ' active' : ''}`} onClick={() => setYearly((y) => !y)}>
              <div className="toggle-thumb" />
            </div>
            <span className={yearly ? 'active' : ''}>Yearly <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>Save 20%</span></span>
          </div>
          <div className="pricing-grid">
            {PRICING.map((plan, i) => (
              <div key={plan.name} className={`price-card${plan.featured ? ' featured' : ''} reveal${i > 0 ? ` reveal-d${i}` : ''}`}>
                {plan.featured && <div className="price-pop">Most Popular</div>}
                <div className="price-name">{plan.name}</div>
                <div className="price-label">{plan.label}</div>
                <div className="price-val">GHS {yearly ? plan.yearly : plan.monthly} <span>/ mo</span></div>
                <div className="price-period">{plan.period}</div>
                <div className="price-feats">
                  {plan.features.map((f) => (
                    <div key={f} className="price-feat">
                      <svg className="price-feat-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                      {f}
                    </div>
                  ))}
                </div>
                <Link to="/signup" className={plan.btnClass}>{plan.btnText}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="wrap">
          <div className="section-head">
            <span className="badge badge-p reveal">FAQ</span>
            <h2 className="reveal reveal-d1">Common <span className="em-accent">questions.</span></h2>
          </div>
          <div className="faq-list">
            {FAQS.map((f, i) => (
              <div key={i} data-faq-idx={String(i)} className={`faq-item${openFaq === i ? ' open' : ''}${revealed.current.has(String(i)) ? ' reveal vis' : ' reveal'}${i > 0 ? ` reveal-d${i}` : ''}`}>
                <div
                  className="faq-q"
                  tabIndex={0}
                  role="button"
                  aria-expanded={openFaq === i}
                  onClick={() => toggleFaq(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFaq(i); } }}
                >
                  {f.q}
                  <span className="faq-chevron"><ChevronDown /></span>
                </div>
                <div className="faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="wrap">
          <div className="cta-inner">
            <h2 className="reveal">Ready to modernize your school?</h2>
            <p className="reveal reveal-d1">Join hundreds of schools across West Africa already using Bright Future to save time, reduce paperwork, and keep parents informed.</p>
            <div className="cta-actions reveal reveal-d2">
              <Link to="/signup" className="btn btn-w">Book a demo</Link>
              <Link to="/signup" className="btn" style={{ padding: '16px 38px', color: 'rgba(255,255,255,0.9)', border: '2px solid rgba(255,255,255,0.3)' }}>Start free trial</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer" id="footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="nav-logo"><span className="logo-mark">BF</span><span className="logo-text">Bright Future</span></a>
              <p>The school management platform Africa deserves. Built in Accra. Used across West Africa.</p>
              <div className="footer-newsletter">
                <div className="footer-newsletter-row">
                  <input type="email" className="footer-input" placeholder="Enter your email" />
                  <button className="btn btn-a" style={{ padding: '13px 24px', fontSize: 14 }}>Subscribe</button>
                </div>
              </div>
            </div>
            <div className="footer-col"><h4>Product</h4><a href="#">Features</a><a href="#">Pricing</a><a href="#">Integrations</a><a href="#">Changelog</a><a href="#">Roadmap</a></div>
            <div className="footer-col"><h4>Resources</h4><a href="#">Documentation</a><a href="#">Help Center</a><a href="#">Blog</a><a href="#">Webinars</a><a href="#">Case Studies</a></div>
            <div className="footer-col"><h4>Company</h4><a href="#">About Us</a><a href="#">Careers</a><a href="#">Contact</a><a href="#">Privacy Policy</a><a href="#">Terms of Service</a></div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">&copy; 2026 Bright Future. All rights reserved.</span>
            <div className="footer-socials">
              <a href="#" className="footer-social" aria-label="Twitter"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
              <a href="#" className="footer-social" aria-label="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>
              <a href="#" className="footer-social" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
