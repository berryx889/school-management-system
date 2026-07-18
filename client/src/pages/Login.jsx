import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, apiErrorMessage } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';

const ROLES = [
  { id: 'admin', label: 'Admin', icon: '🛡️', hint: 'Username' },
  { id: 'teacher', label: 'Teacher', icon: '🍎', hint: 'Username' },
  { id: 'student', label: 'Student', icon: '🎓', hint: 'Student ID' },
  { id: 'parent', label: 'Parent', icon: '👪', hint: 'Phone number' },
];

export default function Login() {
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({ username, password, role: role.id });
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
      navigate(`/${data.user.role}`);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Bright Future Basic School</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your portal</p>
        </div>

        <div className="card p-6">
          {!role ? (
            <>
              <p className="label mb-3">Login as…</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 p-5 hover:border-primary-300 hover:bg-primary-50 transition"
                  >
                    <span className="text-3xl">{r.icon}</span>
                    <span className="text-sm font-semibold text-slate-700">{r.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setRole(null); setOtpMode(false); setOtpSent(false); }}
                className="text-sm text-primary-600 font-medium mb-4 flex items-center gap-1"
              >
                ← Change role
              </button>

              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">{role.icon}</span>
                <span className="font-bold text-slate-900">{role.label} login</span>
              </div>

              {role.id === 'parent' && otpMode ? (
                <form onSubmit={otpSent ? verifyOtp : requestOtp} className="space-y-4">
                  <div>
                    <label className="label" htmlFor="phone">Phone number</label>
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
                    <label className="label" htmlFor="username">{role.hint}</label>
                    <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
                  </div>
                  <div>
                    <label className="label" htmlFor="password">Password</label>
                    <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                  {role.id === 'parent' && (
                    <button type="button" className="text-sm text-primary-600 w-full text-center font-medium" onClick={() => setOtpMode(true)}>
                      Sign in with SMS code instead
                    </button>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
