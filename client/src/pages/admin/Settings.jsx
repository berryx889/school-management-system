import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconX } from '../../components/Icon.jsx';

const PRESETS = {
  ges6: {
    label: 'GES 1–6 scale',
    bands: [
      { min_score: 80, max_score: 100, grade: '1', remark: 'Excellent' },
      { min_score: 70, max_score: 79, grade: '2', remark: 'Very good' },
      { min_score: 60, max_score: 69, grade: '3', remark: 'Good' },
      { min_score: 55, max_score: 59, grade: '4', remark: 'Credit' },
      { min_score: 50, max_score: 54, grade: '5', remark: 'Pass' },
      { min_score: 0, max_score: 49, grade: '6', remark: 'Fail' },
    ],
  },
  wassce9: {
    label: 'WASSCE/BECE A1–F9 scale',
    bands: [
      { min_score: 80, max_score: 100, grade: 'A1', remark: 'Excellent' },
      { min_score: 70, max_score: 79, grade: 'B2', remark: 'Very good' },
      { min_score: 60, max_score: 69, grade: 'B3', remark: 'Good' },
      { min_score: 55, max_score: 59, grade: 'C4', remark: 'Credit' },
      { min_score: 50, max_score: 54, grade: 'C5', remark: 'Credit' },
      { min_score: 45, max_score: 49, grade: 'C6', remark: 'Credit' },
      { min_score: 40, max_score: 44, grade: 'D7', remark: 'Pass' },
      { min_score: 35, max_score: 39, grade: 'E8', remark: 'Pass' },
      { min_score: 0, max_score: 34, grade: 'F9', remark: 'Fail' },
    ],
  },
};

function GradeBandsEditor({ initialBands }) {
  const [bands, setBands] = useState(initialBands);
  const toast = useToast();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: (payload) => api.put('/settings/grade-bands', { bands: payload }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setBands(res.data);
      toast('Grade bands saved.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function updateRow(index, field, value) {
    setBands((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setBands((rows) => [...rows, { min_score: 0, max_score: 0, grade: '', remark: '' }]);
  }

  function removeRow(index) {
    setBands((rows) => rows.filter((_, i) => i !== index));
  }

  return (
    <div className="border-t border-slate-100 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="font-semibold text-slate-800">Grade bands</p>
        <div className="flex gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              className="btn-secondary text-xs !py-1.5"
              onClick={() => setBands(preset.bands)}
            >
              Use {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 text-xs font-medium text-slate-500 px-1">
          <span>Min score</span>
          <span>Max score</span>
          <span>Grade</span>
          <span>Remark</span>
          <span />
        </div>
        {bands.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 items-center">
            <input type="number" min="0" max="100" className="input !py-1.5" value={b.min_score}
              onChange={(e) => updateRow(i, 'min_score', e.target.value)} />
            <input type="number" min="0" max="100" className="input !py-1.5" value={b.max_score}
              onChange={(e) => updateRow(i, 'max_score', e.target.value)} />
            <input className="input !py-1.5" value={b.grade}
              onChange={(e) => updateRow(i, 'grade', e.target.value)} />
            <input className="input !py-1.5" value={b.remark}
              onChange={(e) => updateRow(i, 'remark', e.target.value)} />
            <button type="button" className="text-slate-400 hover:text-red-600 p-1.5" onClick={() => removeRow(i)} aria-label="Remove band">
              <IconX className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="btn-secondary text-sm" onClick={addRow}>+ Add band</button>
        <button type="button" className="btn-primary text-sm" disabled={save.isPending} onClick={() => save.mutate(bands)}>
          {save.isPending ? 'Saving…' : 'Save grade bands'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Used to compute grades and remarks on report cards and results. Ranges must be 0–100 and must not overlap.
      </p>
    </div>
  );
}

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

        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</button>
      </form>

      <div className="card p-6 max-w-2xl mt-6">
        <GradeBandsEditor initialBands={data.grade_bands} />
      </div>
    </div>
  );
}
