import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';
import { SectionHeader, EmptyState, Badge } from '../../components/ui.jsx';
import { IconBell, IconMegaphone } from '../../components/Icon.jsx';

export default function Notifications() {
  const toast = useToast();
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', 'all'],
    queryFn: () => api.get('/staff?limit=500').then((r) => r.data.data),
  });

  const send = useMutation({
    mutationFn: (body) => api.post('/notifications', body),
    onSuccess: (res) => {
      toast(`Notification sent to ${res.data.sent} staff member${res.data.sent === 1 ? '' : 's'}.`, 'success');
      setTitle('');
      setMessage('');
      setUserId('');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const body = { title, message };
    if (userId) body.user_id = Number(userId);
    send.mutate(body);
  }

  return (
    <div>
      <SectionHeader
        title="Push notifications"
        description="Send in-app alerts to staff members"
      />

      <div className="card p-6 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="notif-recipient" className="label">Recipient</label>
            <select id="notif-recipient" className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">All staff</option>
              {staff.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notif-title" className="label">Title</label>
            <input id="notif-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="notif-message" className="label">Message</label>
            <textarea id="notif-message" className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={send.isPending}>
            {send.isPending ? 'Sending…' : 'Send notification'}
          </button>
        </form>
      </div>
    </div>
  );
}
