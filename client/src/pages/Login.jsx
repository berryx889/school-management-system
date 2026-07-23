import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GrainGradient } from '@paper-design/shaders-react';
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
  { icon: IconCalendar, text: 'Attendance tracked live' },
  { icon: IconBarChart, text: 'Results & report cards' },
  { icon: IconCreditCard, text: 'Fee tracking & receipts' },
  { icon: IconMessageCircle, text: 'Parent-teacher chat' },
];

function readLastUser() {
  try {
    return JSON.parse(localStorage.getItem('sms_last_user') || 'null');
  } catch {
    return null;
  }
}

function BrandPanel({ branding }) {
  const name = branding?.name || 'Bright Future Basic School';

  return (
    <div className="relative hidden lg:flex min-h-0 flex-col justify-between overflow-hidden rounded-2xl p-10 xl:p-14 text-white"
      style={{ background: '#0B7A55' }}
    >
      <GrainGradient
        speed={0.8}
        scale={1}
        rotation={0}
        offsetX={0}
        offsetY={0}
        softness={0.5}
        intensity={0.45}
        noise={0.2}
        shape="corners"
        frame={2854.5}
        colors={['#FFFFFF', '#D4860A', '#0B7A55', '#FFFFFF']}
        colorBack="#00000000"
        className="absolute inset-0"
        style={{ background: '#0B7A55' }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-16">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain bg-white/20 backdrop-blur-sm" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-sm font-bold">
                {name[0]}
              </div>
            )}
            <span className="font-semibold text-white/90 text-lg">{name}</span>
          </div>

          <h2 className="max-w-[480px] text-4xl xl:text-5xl font-bold tracking-tight leading-[1.08] text-white">
            Everything your school needs,{' '}
            <span style={{ color: '#FCD34D' }}>beautifully organized.</span>
          </h2>

          <p className="mt-6 max-w-[400px] text-base text-white/70 leading-relaxed">
            One system for attendance, fees, exams, and communication — so your school can focus on what matters.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.text} className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
              <span className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <f.icon className="h-4 w-4 text-white/80" />
              </span>
              <span className="text-sm text-white/80 leading-snug">{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PortalPicker({ onChoose, branding }) {
  const name = branding?.name || 'Bright Future Basic School';
  const lastUser = readLastUser();
  const firstName = lastUser?.name?.split(' ')[0];

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-2.5 mb-10 lg:hidden">
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt="" className="h-8 w-8 rounded-lg object-contain bg-white" />
        ) : (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ background: '#0B7A55' }}>
            {name[0]}
          </div>
        )}
        <span className="font-semibold text-slate-800 text-sm">{name}</span>
      </div>

      <p className="text-sm font-medium mb-2" style={{ color: '#0B7A55' }}>
        {firstName ? `Welcome back, ${firstName}` : 'Welcome'}
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
        Sign in to your school
      </h1>
      <p className="text-slate-500 text-sm mb-8">Choose your portal to continue.</p>

      <div className="space-y-3">
        {Object.entries(PORTALS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => onChoose(key)}
            className="w-full flex items-center gap-4 rounded-2xl p-5 text-left transition group"
            style={{ border: '1.5px solid #EBE5DC', background: 'white' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0B7A55'; e.currentTarget.style.background = '#F0F9F4'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#EBE5DC'; e.currentTarget.style.background = 'white'; }}
          >
            <span className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#E3F5ED', color: '#0B7A55' }}
            >
              <p.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-800">{p.label}</span>
              <span className="block text-sm text-slate-500 truncate">{p.description}</span>
            </span>
            <IconArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8 lg:hidden">
        Represent a school? <Link to="/signup" className="font-medium" style={{ color: '#0B7A55' }}>Request access</Link>
      </p>
    </div>
  );
}

function LoginForm({ portal, portalKey, onBack, onForgot, loading, setLoading, toast, login, loginWithOtp, navigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

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
    <div className="animate-fade-in-up">
      <button onClick={onBack} className="text-sm font-medium mb-6 flex items-center gap-1" style={{ color: '#0B7A55' }}>
        <IconArrowLeft className="h-4 w-4" /> Change portal
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: '#E3F5ED', color: '#0B7A55' }}
        >
          <portal.icon className="h-5 w-5" />
        </span>
        <div>
          <span className="block font-bold text-slate-900 text-lg">{portal.label} login</span>
          <span className="block text-xs text-slate-500">{portal.description}</span>
        </div>
      </div>

      {portalKey === 'family' && otpMode ? (
        <form onSubmit={otpSent ? verifyOtp : requestOtp} className="space-y-5">
          <div>
            <label className="auth-label" htmlFor="phone">Parent phone number</label>
            <input id="phone" className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="0244000000" disabled={otpSent} required />
          </div>
          {otpSent && (
            <div>
              <label className="auth-label" htmlFor="otp">Enter the code sent to your phone</label>
              <input id="otp" className="auth-input" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
            </div>
          )}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : otpSent ? 'Verify code' : 'Send code'}
          </button>
          <button type="button" className="text-sm text-slate-500 w-full text-center hover:text-slate-700 transition-colors" onClick={() => { setOtpMode(false); setOtpSent(false); }}>
            Use password instead
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="auth-label" htmlFor="username">{portal.identifierLabel}</label>
            <input id="username" className="auth-input" placeholder={portal.identifierPlaceholder} value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="auth-label" htmlFor="password">Password</label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="auth-input" />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" className="text-sm text-slate-500 hover:text-slate-700 w-full text-center transition-colors" onClick={onForgot}>
            Forgot password?
          </button>
          {portalKey === 'family' && (
            <button type="button" className="text-sm w-full text-center font-medium transition-colors" style={{ color: '#0B7A55' }} onClick={() => setOtpMode(true)}>
              Parent? Sign in with SMS code instead
            </button>
          )}
        </form>
      )}
    </div>
  );
}

function ForgotPassword({ onBack, loading, setLoading, toast }) {
  const [forgotStep, setForgotStep] = useState('username');
  const [forgotUser, setForgotUser] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      onBack();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <button onClick={onBack} className="text-sm font-medium mb-6 flex items-center gap-1" style={{ color: '#0B7A55' }}>
        <IconArrowLeft className="h-4 w-4" /> Back to sign in
      </button>

      <h2 className="text-xl font-bold text-slate-900 mb-1">Reset password</h2>
      <p className="text-sm text-slate-500 mb-6">
        {forgotStep === 'username'
          ? 'Enter your username and we\'ll send a reset code to your registered phone number.'
          : `Enter the code sent to ${maskedPhone} and choose a new password.`}
      </p>

      {forgotStep === 'username' ? (
        <form onSubmit={handleForgotRequest} className="space-y-5">
          <div>
            <label className="auth-label" htmlFor="forgot-username">Username</label>
            <input id="forgot-username" className="auth-input" value={forgotUser} onChange={(e) => setForgotUser(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label className="auth-label" htmlFor="reset-code">Reset code</label>
            <input id="reset-code" className="auth-input" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="auth-label" htmlFor="new-password">New password</label>
            <PasswordInput id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="auth-input" />
          </div>
          <div>
            <label className="auth-label" htmlFor="confirm-password">Confirm password</label>
            <PasswordInput id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="auth-input" />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
          <button type="button" className="text-sm text-slate-500 w-full text-center" onClick={() => setForgotStep('username')}>
            Didn't get a code? Try again
          </button>
        </form>
      )}
    </div>
  );
}

export default function Login() {
  const [stage, setStage] = useState('portal');
  const [portalKey, setPortalKey] = useState(null);
  const [loading, setLoading] = useState(false);
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
  }

  return (
    <section className="min-h-screen p-3 antialiased" style={{ background: '#FBF6EF' }}>
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: Form panel */}
        <div className="flex min-h-[600px] items-center rounded-2xl bg-white px-6 py-10 sm:px-10 lg:min-h-0 lg:px-14 lg:py-20 xl:px-20"
          style={{ border: '1.5px solid #EBE5DC' }}
        >
          <div className="mx-auto w-full max-w-[440px]">
            {stage === 'portal' && (
              <PortalPicker onChoose={choosePortal} branding={branding} />
            )}

            {stage === 'form' && portal && (
              <LoginForm
                portal={portal}
                portalKey={portalKey}
                onBack={() => { setStage('portal'); setPortalKey(null); }}
                onForgot={() => setStage('forgot')}
                loading={loading}
                setLoading={setLoading}
                toast={toast}
                login={login}
                loginWithOtp={loginWithOtp}
                navigate={navigate}
              />
            )}

            {stage === 'forgot' && (
              <ForgotPassword
                onBack={() => setStage('form')}
                loading={loading}
                setLoading={setLoading}
                toast={toast}
              />
            )}
          </div>
        </div>

        {/* Right: Brand panel with shader gradient */}
        <BrandPanel branding={branding} />

        {/* Mobile footer — only shown when not on portal picker (which has its own) */}
        {stage !== 'portal' && (
          <div className="lg:hidden pb-4">
            <p className="text-center text-xs text-slate-400">
              Represent a school? <Link to="/signup" className="font-medium" style={{ color: '#0B7A55' }}>Request access</Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
