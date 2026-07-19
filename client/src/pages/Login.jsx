import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, apiErrorMessage } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import {
  IconShield, IconGraduationCap, IconArrowLeft, IconArrowRight, IconSparkle,
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

const FEATURE_BADGES = [
  { icon: IconCalendar, label: 'Attendance, live', className: 'top-2 -left-4 sm:-left-10', delay: '0s' },
  { icon: IconBarChart, label: 'Results & report cards', className: 'top-16 -right-6 sm:-right-16', delay: '1.2s' },
  { icon: IconCreditCard, label: 'Fees & payments', className: 'bottom-24 -left-8 sm:-left-20', delay: '2.1s' },
  { icon: IconMessageCircle, label: 'Parent-teacher chat', className: 'bottom-4 -right-4 sm:-right-12', delay: '0.6s' },
];

function readLastUser() {
  try {
    return JSON.parse(localStorage.getItem('sms_last_user') || 'null');
  } catch {
    return null;
  }
}

function Splash({ onStart }) {
  const lastUser = readLastUser();

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {FEATURE_BADGES.map((f) => (
          <div
            key={f.label}
            className={`absolute ${f.className} animate-float`}
            style={{ animationDelay: f.delay }}
          >
            <div className="flex items-center gap-2 rounded-2xl bg-white shadow-card border border-slate-100 px-3.5 py-2.5 whitespace-nowrap">
              <span className="h-7 w-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <f.icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold text-slate-700">{f.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="relative text-center animate-fade-in-up">
        <div className="h-16 w-16 rounded-2xl bg-primary-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-primary-500/30">
          B
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 text-primary-700 px-3.5 py-1.5 text-xs font-semibold mb-5">
          <IconSparkle className="h-3.5 w-3.5" />
          School management, simplified
        </div>

        {lastUser ? (
          <h1 className="text-3xl font-bold text-slate-900 mb-3 text-balance">
            Welcome back, {lastUser.name}
          </h1>
        ) : (
          <h1 className="text-3xl font-bold text-slate-900 mb-3 text-balance">
            Welcome to Bright Future Basic School
          </h1>
        )}

        <p className="text-slate-500 mb-8 max-w-xs mx-auto">
          Attendance, results, fees and announcements — one place for admins, teachers, students and parents.
        </p>

        <button onClick={onStart} className="btn-primary px-6 py-3 text-base">
          Get started <IconArrowRight className="h-4 w-4" />
        </button>
      </div>
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
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary-300/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-primary-100/50 blur-3xl" />
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
                  <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
