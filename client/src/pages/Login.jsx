import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, apiErrorMessage } from '../api/client.js';
import { usePublicBranding } from '../hooks/usePublicBranding.js';
import { applyBrandColor } from '../utils/brandColor.js';
import { useToast } from '../components/Toast.jsx';
import { PasswordInput } from '../components/ui.jsx';
import {
  IconShield, IconGraduationCap, IconArrowLeft, IconArrowRight,
  IconCalendar, IconBarChart, IconCreditCard, IconMessageCircle,
} from '../components/Icon.jsx';

const PORTALS = {
  staff: {
    label: 'Staff',
    description: 'Admins, teachers & kitchen staff',
    icon: IconShield,
    identifierLabel: 'Username',
    identifierPlaceholder: 'e.g. admin, teacher1',
  },
  family: {
    label: 'Student & Parent',
    description: 'Students and parents / guardians',
    icon: IconGraduationCap,
    identifierLabel: 'Student ID or parent phone',
    identifierPlaceholder: 'e.g. STU0001 or 0244000000',
  },
};

const FEATURES = [
  { icon: IconCalendar, text: 'Attendance tracked live, every morning' },
  { icon: IconBarChart, text: 'Results and report cards, generated instantly' },
  { icon: IconCreditCard, text: 'Fees tracked, paid and receipted online' },
  { icon: IconMessageCircle, text: 'Parents and teachers, one message away' },
];

function readLastUser() {
  try {
    return JSON.parse(localStorage.getItem('sms_last_user') || 'null');
  } catch {
    return null;
  }
}

function FeatureTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % FEATURES.length), 2800);
    return () => clearInterval(id);
  }, []);

  const feature = FEATURES[index];

  return (
    <div className="h-10 flex items-center justify-center mb-8">
      <div key={index} className="animate-fade-in flex items-center gap-2.5">
        <span className="h-7 w-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
          <feature.icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-medium text-slate-600">{feature.text}</span>
      </div>
    </div>
  );
}

function Reveal({ delay = 0, className = '', children }) {
  return (
    <div className={`animate-fade-in-up ${className}`} style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      {children}
    </div>
  );
}

function Splash({ onStart }) {
  const lastUser = readLastUser();

  return (
    <div className="relative text-center">
      <Reveal delay={0}>
        <div className="h-16 w-16 rounded-2xl bg-primary-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-primary-500/30">
          B
        </div>
      </Reveal>

      <Reveal delay={80}>
        <p className="text-xs font-bold tracking-[0.2em] text-primary-600 uppercase mb-3">
          Bright Future Basic School
        </p>
      </Reveal>

      <Reveal delay={160}>
        <h1 className="text-3xl font-bold text-slate-900 mb-3 text-balance">
          {lastUser ? `Welcome back, ${lastUser.name}` : 'Welcome'}
        </h1>
      </Reveal>

      <Reveal delay={240}>
        <p className="text-slate-500 mb-2 max-w-xs mx-auto">
          Sign in to manage attendance, results, fees and announcements.
        </p>
      </Reveal>

      <Reveal delay={320}>
        <FeatureTicker />
      </Reveal>

      <Reveal delay={400}>
        <button onClick={onStart} className="btn-primary px-6 py-3 text-base">
          Get started <IconArrowRight className="h-4 w-4" />
        </button>
      </Reveal>
    </div>
  );
}

function PortalPicker({ onChoose, onBack }) {
  return (
    <div className="animate-fade-in-up">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600 font-medium mb-6 flex items-center gap-1">
        <IconArrowLeft className="h-4 w-4" /> Back
      </button>

      <h2 className="text-xl font-bold text-slate-900 mb-1">How are you signing in?</h2>
      <p className="text-slate-500 text-sm mb-6">Choose your portal to continue.</p>

      <div className="space-y-3">
        {Object.entries(PORTALS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => onChoose(key)}
            className="w-full flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-primary-300 hover:bg-primary-50 transition group"
          >
            <span className="h-12 w-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 group-hover:bg-white">
              <p.icon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-800">{p.label}</span>
              <span className="block text-sm text-slate-500 truncate">{p.description}</span>
            </span>
            <IconArrowRight className="h-4 w-4 text-slate-300 ml-auto shrink-0 group-hover:text-primary-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const [stage, setStage] = useState('splash'); // splash | portal | form
  const [portalKey, setPortalKey] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: branding } = usePublicBranding();

  useEffect(() => {
    if (branding?.primary_color) applyBrandColor(branding.primary_color);
  }, [branding?.primary_color]);

  const portal = portalKey ? PORTALS[portalKey] : null;

  function choosePortal(key) {
    setPortalKey(key);
    setStage('form');
    setUsername('');
    setPassword('');
    setOtpMode(false);
    setOtpSent(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({ username, password, portal: portalKey });
      localStorage.setItem('sms_last_user', JSON.stringify({ name: user.full_name }));
      navigate(`/${user.role}`);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/otp/request', { phone: username });
      setOtpSent(true);
      toast('A login code was sent by SMS.', 'success');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { phone: username, code: otpCode });
      await loginWithOtp(data.user, data.token);
      localStorage.setItem('sms_last_user', JSON.stringify({ name: data.user.full_name }));
      navigate(`/${data.user.role}`);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="animate-drift absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary-300/30 blur-3xl" style={{ animationDelay: '-5s', animationDuration: '18s' }} />
        <div className="animate-drift absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-primary-100/50 blur-3xl" style={{ animationDelay: '-10s', animationDuration: '16s' }} />
      </div>

      <div className={`relative w-full ${stage === 'splash' ? 'max-w-sm' : 'max-w-md'}`}>
        {stage === 'splash' && <Splash onStart={() => setStage('portal')} />}

        {stage === 'portal' && (
          <div className="card p-6">
            <PortalPicker onChoose={choosePortal} onBack={() => setStage('splash')} />
          </div>
        )}

        {stage === 'form' && portal && (
          <div className="card p-6 animate-fade-in-up">
            <button
              onClick={() => setStage('portal')}
              className="text-sm text-primary-600 font-medium mb-4 flex items-center gap-1"
            >
              <IconArrowLeft className="h-4 w-4" /> Change portal
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <span className="h-9 w-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                <portal.icon className="h-4 w-4" />
              </span>
              <span className="font-bold text-slate-900">{portal.label} login</span>
            </div>

            {portalKey === 'family' && otpMode ? (
              <form onSubmit={otpSent ? verifyOtp : requestOtp} className="space-y-4">
                <div>
                  <label className="label" htmlFor="phone">Parent phone number</label>
                  <input id="phone" className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="0244000000" disabled={otpSent} required />
                </div>
                {otpSent && (
                  <div>
                    <label className="label" htmlFor="otp">Enter the code sent to your phone</label>
                    <input id="otp" className="input" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
                  </div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Please wait…' : otpSent ? 'Verify code' : 'Send code'}
                </button>
                <button type="button" className="text-sm text-slate-500 w-full text-center" onClick={() => { setOtpMode(false); setOtpSent(false); }}>
                  Use password instead
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="username">{portal.identifierLabel}</label>
                  <input id="username" className="input" placeholder={portal.identifierPlaceholder} value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="label" htmlFor="password">Password</label>
                  <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
                {portalKey === 'family' && (
                  <button type="button" className="text-sm text-primary-600 w-full text-center font-medium" onClick={() => setOtpMode(true)}>
                    Parent? Sign in with SMS code instead
                  </button>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
