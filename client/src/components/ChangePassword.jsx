import { useState } from 'react';
import { api, apiErrorMessage } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from './Toast.jsx';
import { PasswordInput } from './ui.jsx';

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
