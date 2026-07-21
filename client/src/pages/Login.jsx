import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, apiErrorMessage } from '../api/client.js';
import { usePublicBranding } from '../hooks/usePublicBranding.js';
import { applyBrandColor, applyFavicon } from '../utils/brandColor.js';
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

function Reveal({ delay = 0, className = '', children }) {
  return (
    <div className={`animate-fade-in-up ${className}`} style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      {children}
    </div>
  );
}

function Splash({ onStart, branding }) {
  const lastUser = readLastUser();
  const name = branding?.name || 'Bright Future Basic School';
  const firstName = lastUser?.name?.split(' ')[0];

  return (
    <div className="relative min-h-screen flex flex-col">
      <header className="px-6 sm:px-10 py-6">
        <Reveal delay={0} className="inline-flex items-center gap-2.5">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="" className="h-8 w-8 rounded-lg object-contain bg-white" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
              {name[0]}
            </div>
          )}
          <span className="font-semibold text-slate-800 text-sm">{name}</span>
        </Reveal>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 -mt-12">
        <div className="max-w-xl">
          <Reveal delay={100}>
            <p className="text-sm font-medium text-primary-600 mb-4">
              {firstName ? `Welcome back, ${firstName}` : 'Welcome'}
            </p>
          </Reveal>

          <Reveal delay={180}>
            <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 tracking-tight leading-[1.05] mb-6 text-balance">
              Sign in to your school
            </h1>
          </Reveal>

          <Reveal delay={260}>
            <p className="text-lg text-slate-500 max-w-md mx-auto mb-10 text-balance">
              Attendance, results, fees and announcements — sign in to get started.
            </p>
          </Reveal>

          <Reveal delay={340}>
            <button onClick={onStart} className="btn-primary px-8 py-3.5 text-base">
              Get started <IconArrowRight className="h-4 w-4" />
            </button>
          </Reveal>
        </div>
      </main>

      <Reveal delay={420}>
        <footer className="border-t border-slate-100 px-6 sm:px-10 py-8">
          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex flex-col items-center text-center gap-2.5">
                <span className="h-9 w-9 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-xs text-slate-500 leading-snug">{f.text}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-8">
            Represent a school? <Link to="/signup" className="text-primary-600 font-medium">Request access</Link>
          </p>
        </footer>
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
  const [stage, setStage] = useState('splash'); // splash | portal | form | forgot
  const [portalKey, setPortalKey] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState('username'); // username | code
  const [forgotUser, setForgotUser] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: branding } = usePublicBranding();

  useEffect(() => {
    if (branding?.primary_color) applyBrandColor(branding.primary_color);
  }, [branding?.primary_color]);

  useEffect(() => {
    applyFavicon(branding?.favicon_url);
  }, [branding?.favicon_url]);

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

  function openForgot() {
    setStage('forgot');
    setForgotStep('username');
    setForgotUser('');
    setMaskedPhone('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleForgotRequest(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { username: forgotUser });
      setMaskedPhone(data.masked_phone);
      setForgotStep('code');
      toast(`A reset code was sent to ${data.masked_phone}.`, 'success');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { username: forgotUser, code: resetCode, new_password: newPassword });
      toast('Password reset successfully. You can now sign in.', 'success');
      setStage('form');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'splash') {
    return (
      <div className="bg-surface relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-drift absolute top-0 left-1/2 -translate-x-1/2 h-[32rem] w-[32rem] rounded-full bg-primary-100/60 blur-3xl" style={{ animationDuration: '22s' }} />
        </div>
        <Splash onStart={() => setStage('portal')} branding={branding} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift absolute top-0 left-1/2 -translate-x-1/2 h-[32rem] w-[32rem] rounded-full bg-primary-100/60 blur-3xl" style={{ animationDuration: '22s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {stage === 'portal' && (
          <div className="card p-6">
            <PortalPicker onChoose={choosePortal} onBack={() => setStage('splash')} />
          </div>
        )}

        {stage === 'forgot' && (
          <div className="card p-6 animate-fade-in-up">
            <button
              onClick={() => setStage('form')}
              className="text-sm text-primary-600 font-medium mb-4 flex items-center gap-1"
            >
              <IconArrowLeft className="h-4 w-4" /> Back to sign in
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">Reset password</h2>
            <p className="text-sm text-slate-500 mb-5">
              {forgotStep === 'username'
                ? 'Enter your username and we\'ll send a reset code to your registered phone number.'
                : `Enter the code sent to ${maskedPhone} and choose a new password.`}
            </p>

            {forgotStep === 'username' ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <label className="label" htmlFor="forgot-username">Username</label>
                  <input id="forgot-username" className="input" value={forgotUser} onChange={(e) => setForgotUser(e.target.value)} required autoFocus />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="label" htmlFor="reset-code">Reset code</label>
                  <input id="reset-code" className="input" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="label" htmlFor="new-password">New password</label>
                  <PasswordInput id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="confirm-password">Confirm password</label>
                  <PasswordInput id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
                <button type="button" className="text-sm text-slate-500 w-full text-center" onClick={() => setForgotStep('username')}>
                  Didn't get a code? Try again
                </button>
              </form>
            )}
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
                <button type="button" className="text-sm text-slate-500 hover:text-primary-600 w-full text-center" onClick={openForgot}>
                  Forgot password?
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
