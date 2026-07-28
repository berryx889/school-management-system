import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from './Toast.jsx';
import { PasswordInput } from './ui.jsx';

// Two-factor (TOTP) setup/disable — rendered under the password form in the account modal.
export function TwoFactorSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useQuery({ queryKey: ['account', 'me'], queryFn: () => api.get('/account/me').then((r) => r.data) });
  const [setup, setSetup] = useState(null); // { secret, qr, uri }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { toast(apiErrorMessage(e), 'error'); } finally { setBusy(false); } };
  const begin = () => run(async () => { const { data } = await api.post('/account/2fa/setup'); setSetup(data); });
  const enable = () => run(async () => {
    await api.post('/account/2fa/enable', { code });
    toast('Two-factor authentication is on.', 'success');
    setSetup(null); setCode(''); qc.invalidateQueries({ queryKey: ['account', 'me'] });
  });
  const disable = () => run(async () => {
    await api.post('/account/2fa/disable', { code });
    toast('Two-factor authentication turned off.', 'success');
    setCode(''); qc.invalidateQueries({ queryKey: ['account', 'me'] });
  });

  const codeInput = (
    <input className="input tracking-[0.3em] text-center" value={code} onChange={(e) => setCode(e.target.value)}
      placeholder="000000" inputMode="numeric" maxLength={6} />
  );

  if (me?.totp_enabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Two-factor authentication is <span className="font-semibold text-primary-700">on</span>. You'll enter a code from your authenticator app each time you sign in.</p>
        <label className="label">Enter a current code to turn it off</label>
        {codeInput}
        <button className="btn-danger w-full" disabled={busy || code.length < 6} onClick={disable}>Turn off two-factor</button>
      </div>
    );
  }

  if (setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Scan this with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code to confirm.</p>
        <img src={setup.qr} alt="2FA QR code" className="mx-auto h-44 w-44 rounded-xl border border-slate-100" />
        <p className="text-center text-xs text-slate-400 break-all">Or enter this key manually: <span className="font-mono text-slate-600">{setup.secret}</span></p>
        <label className="label">6-digit code</label>
        {codeInput}
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={() => setSetup(null)}>Cancel</button>
          <button className="btn-primary flex-1" disabled={busy || code.length < 6} onClick={enable}>Confirm &amp; enable</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Add an extra layer of security — a one-time code from your phone is required to sign in.</p>
      <button className="btn-secondary w-full" disabled={busy} onClick={begin}>Set up two-factor authentication</button>
    </div>
  );
}

function ChangePasswordForm({ forced, onDone }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/account/change-password', {
        current_password: forced ? undefined : currentPassword,
        new_password: newPassword,
      });
      updateUser({ must_change_password: false });
      toast('Password updated.', 'success');
      onDone?.();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!forced && (
        <div>
          <label className="label" htmlFor="current_password">Current password</label>
          <PasswordInput id="current_password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="new_password">New password</label>
        <PasswordInput id="new_password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm_password">Confirm new password</label>
        <PasswordInput id="confirm_password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
      </div>
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}

// Full-screen gate rendered in place of the app when the account has a temporary
// password (must_change_password) — cannot be dismissed until a real one is set.
export function ForcedPasswordGate() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm card p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Set your password</h1>
        <p className="text-slate-500 text-sm mb-5">
          You're signed in with a temporary password. Choose a new one to continue.
        </p>
        <ChangePasswordForm forced />
      </div>
    </div>
  );
}

export default ChangePasswordForm;
