import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function Settings() {
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then((r) => r.data) });
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);

  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  const save = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast('Settings saved.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  if (isLoading || !form) return <PageLoader />;

  return (
    <div>
      <SectionHeader title="School settings" description="Branding, grading and attendance configuration" />

      <form
        className="card p-6 space-y-5 max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            name: form.name, short_name: form.short_name, address: form.address, phone: form.phone, motto: form.motto,
            current_academic_year: form.current_academic_year, current_term: form.current_term,
            class_score_weight: Number(form.class_score_weight), exam_score_weight: Number(form.exam_score_weight),
            late_threshold: form.late_threshold, attendance_edit_cutoff: form.attendance_edit_cutoff,
            announcement_requires_approval: form.announcement_requires_approval,
          });
        }}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">School name</label>
            <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Short name</label>
            <input className="input" value={form.short_name || ''} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Motto</label>
            <input className="input" value={form.motto || ''} onChange={(e) => setForm({ ...form, motto: e.target.value })} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Class score weight (of 100)</label>
            <input type="number" className="input" value={form.class_score_weight} onChange={(e) => setForm({ ...form, class_score_weight: e.target.value })} />
          </div>
          <div>
            <label className="label">Exam score weight (of 100)</label>
            <input type="number" className="input" value={form.exam_score_weight} onChange={(e) => setForm({ ...form, exam_score_weight: e.target.value })} />
          </div>
          <div>
            <label className="label">Late arrival threshold</label>
            <input type="time" className="input" value={form.late_threshold?.slice(0, 5) || ''} onChange={(e) => setForm({ ...form, late_threshold: e.target.value })} />
          </div>
          <div>
            <label className="label">Attendance edit cutoff (teachers)</label>
            <input type="time" className="input" value={form.attendance_edit_cutoff?.slice(0, 5) || ''} onChange={(e) => setForm({ ...form, attendance_edit_cutoff: e.target.value })} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.announcement_requires_approval}
              onChange={(e) => setForm({ ...form, announcement_requires_approval: e.target.checked })}
            />
            Teacher announcements require admin approval before SMS is sent
          </label>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="font-semibold text-slate-800 mb-2">Grade bands</p>
          <table className="w-full text-sm">
            <tbody>
              {data.grade_bands.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-1.5 text-slate-500">{b.min_score}–{b.max_score}</td>
                  <td className="py-1.5 font-semibold">{b.grade}</td>
                  <td className="py-1.5 text-slate-500">{b.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</button>
      </form>
    </div>
  );
}
