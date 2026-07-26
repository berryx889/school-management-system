import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Badge, Modal } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconBuilding } from '../../components/Icon.jsx';

function AddSchoolModal({ open, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', code: '', subdomain: '', admin_full_name: '', admin_password: '' });
  const [created, setCreated] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const reset = () => { setForm({ name: '', code: '', subdomain: '', admin_full_name: '', admin_password: '' }); setCreated(null); };

  const create = useMutation({
    mutationFn: () => api.post('/schools', form).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['schools'] });
      setCreated(data);
      toast('School created.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const close = () => { reset(); onClose(); };

  return (
    <Modal open={open} onClose={close} title={created ? 'School created' : 'Add a school'}>
      {created ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{created.name}</span> is ready. Share these
            sign-in details with the school — they'll be asked to change the password on first login.
          </p>
          <dl className="rounded-2xl bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">School code</dt><dd className="font-semibold text-slate-800 tabular-nums">{created.code}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Login URL</dt><dd className="text-slate-800">{created.subdomain}.…</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Admin username</dt><dd className="font-semibold text-slate-800">{created.admin_username}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Temp password</dt><dd className="font-mono font-semibold text-slate-800">{created.admin_temp_password}</dd></div>
          </dl>
          <p className="text-xs text-slate-400">On localhost, the admin enters this school code via “Signing in to a different school?”. In production they'll use the school's subdomain.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={reset}>Add another</button>
            <button className="btn-primary" onClick={close}>Done</button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <div>
            <label className="label" htmlFor="s-name">School name</label>
            <input id="s-name" className="input" value={form.name} onChange={set('name')} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="s-code">School code</label>
              <input id="s-code" className="input" placeholder="e.g. SUNRISE" value={form.code} onChange={set('code')} required />
            </div>
            <div>
              <label className="label" htmlFor="s-sub">Subdomain <span className="text-slate-400 font-normal">(optional)</span></label>
              <input id="s-sub" className="input" placeholder="from code" value={form.subdomain} onChange={set('subdomain')} />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">First admin account</p>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="s-admin">Admin full name <span className="text-slate-400 font-normal">(optional)</span></label>
                <input id="s-admin" className="input" placeholder="School Administrator" value={form.admin_full_name} onChange={set('admin_full_name')} />
              </div>
              <div>
                <label className="label" htmlFor="s-pass">Temp password <span className="text-slate-400 font-normal">(optional — auto-generated if blank)</span></label>
                <input id="s-pass" className="input" value={form.admin_password} onChange={set('admin_password')} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create school'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800 text-right">{value}</dd>
    </div>
  );
}

function SchoolDetailModal({ id, onClose }) {
  const toast = useToast();
  const [resetResult, setResetResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['school', id],
    queryFn: () => api.get(`/schools/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const resetPw = useMutation({
    mutationFn: (user_id) => api.post(`/schools/${id}/reset-admin-password`, { user_id }).then((r) => r.data),
    onSuccess: (d) => { setResetResult(d); toast('Password reset — share the new one.', 'success'); },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const close = () => { setResetResult(null); onClose(); };

  return (
    <Modal open={!!id} onClose={close} title={data?.name || 'School'}>
      {isLoading || !data ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
      ) : (
        <div className="space-y-5">
          <dl className="rounded-2xl bg-slate-50 p-4 text-sm">
            <DetailRow label="School code" value={<span className="font-mono">{data.code}</span>} />
            <DetailRow label="Subdomain" value={data.subdomain} />
            <DetailRow label="Status" value={<Badge tone={data.is_active ? 'green' : 'slate'}>{data.is_active ? 'Active' : 'Suspended'}</Badge>} />
            <DetailRow label="Created" value={format(new Date(data.created_at), 'd MMM yyyy')} />
          </dl>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[['Users', data.user_count], ['Teachers', data.teacher_count], ['Students', data.student_count]].map(([label, n]) => (
              <div key={label} className="rounded-2xl border border-slate-100 py-3">
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{n}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Admin accounts</p>
            <div className="space-y-2">
              {data.admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{a.full_name}</p>
                    <p className="text-xs text-slate-500">@{a.username}{a.must_change_password && ' · must change password'}</p>
                  </div>
                  <button className="text-primary-600 font-medium text-sm shrink-0" disabled={resetPw.isPending} onClick={() => resetPw.mutate(a.id)}>
                    Reset password
                  </button>
                </div>
              ))}
            </div>
          </div>

          {resetResult && (
            <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-4 text-sm">
              <p className="text-slate-600 mb-2">New temporary password for <span className="font-semibold">@{resetResult.username}</span> — shown once:</p>
              <p className="font-mono font-bold text-lg text-slate-900">{resetResult.temp_password}</p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button className="btn-primary" onClick={close}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Schools() {
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get('/schools').then((r) => r.data),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/schools/${id}`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schools'] });
      toast('School updated.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader
        title="Schools"
        description="Every school on the platform. Provision a new one or suspend access."
        action={<button className="btn-primary" onClick={() => setAddOpen(true)}>Add school</button>}
      />

      <div className="card table-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : !data.length ? (
          <EmptyState icon={IconBuilding} title="No schools yet" />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Code</th>
                  <th className="hidden sm:table-cell">Users</th>
                  <th className="hidden sm:table-cell">Students</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => setDetailId(s.id)}>
                    <td>
                      <span className="font-medium text-slate-800">{s.name}</span>
                      <span className="text-xs text-slate-400 block">{s.subdomain} · {format(new Date(s.created_at), 'd MMM yyyy')}</span>
                    </td>
                    <td className="font-mono text-slate-600">{s.code}</td>
                    <td className="hidden sm:table-cell text-slate-500 tabular-nums">{s.user_count}</td>
                    <td className="hidden sm:table-cell text-slate-500 tabular-nums">{s.student_count}</td>
                    <td><Badge tone={s.is_active ? 'green' : 'slate'}>{s.is_active ? 'Active' : 'Suspended'}</Badge></td>
                    <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {s.id === 1 ? (
                        <span className="text-xs text-slate-400">Founding school</span>
                      ) : s.is_active ? (
                        <button className="text-red-600 font-medium" onClick={() => toggleActive.mutate({ id: s.id, is_active: false })}>Suspend</button>
                      ) : (
                        <button className="text-primary-600 font-medium" onClick={() => toggleActive.mutate({ id: s.id, is_active: true })}>Reactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddSchoolModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SchoolDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
