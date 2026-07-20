import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconX } from '../../components/Icon.jsx';

const MAX_IMAGE_BYTES = 500 * 1024;

function ImageUpload({ label, value, onChange, helpText }) {
  const toast = useToast();

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file.', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast(`${label} must be under 500KB.`, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-lg border border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
          {value ? <img src={value} alt={label} className="h-full w-full object-contain" /> : <span className="text-xs text-slate-400">None</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="btn-secondary text-sm cursor-pointer w-fit">
            {value ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
          {value && (
            <button type="button" className="text-xs text-slate-400 hover:text-red-600 text-left" onClick={() => onChange('')}>
              Remove {label.toLowerCase()}
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-1.5">{helpText} PNG or JPG, under 500KB.</p>
    </div>
  );
}

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

const PROMOTION_FIELDS = [
  'promotion_pass_mark', 'promotion_min_average', 'promotion_max_failed_subjects',
  'promotion_distinction_threshold', 'promotion_core_subjects_must_pass',
  'promotion_carry_over_allowed', 'promotion_automatic', 'promotion_manual_override_allowed',
];

function PromotionPolicyEditor({ initial }) {
  const [policy, setPolicy] = useState(initial);
  const toast = useToast();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: () => api.put('/settings', policy),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setPolicy(Object.fromEntries(PROMOTION_FIELDS.map((f) => [f, res.data[f]])));
      toast('Promotion policy saved.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function set(field, value) {
    setPolicy((p) => ({ ...p, [field]: value }));
  }

  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="font-semibold text-slate-800 mb-3">Promotion policy</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Pass mark (%)</label>
          <input type="number" className="input" value={policy.promotion_pass_mark} onChange={(e) => set('promotion_pass_mark', e.target.value)} />
          <p className="text-xs text-slate-400 mt-1.5">A subject score below this counts as a fail.</p>
        </div>
        <div>
          <label className="label">Minimum overall average (%)</label>
          <input type="number" className="input" value={policy.promotion_min_average} onChange={(e) => set('promotion_min_average', e.target.value)} />
        </div>
        <div>
          <label className="label">Max failed subjects allowed</label>
          <input type="number" className="input" value={policy.promotion_max_failed_subjects} onChange={(e) => set('promotion_max_failed_subjects', e.target.value)} />
          <p className="text-xs text-slate-400 mt-1.5">Only applies if carry-over is allowed.</p>
        </div>
        <div>
          <label className="label">Distinction threshold (%)</label>
          <input type="number" className="input" value={policy.promotion_distinction_threshold} onChange={(e) => set('promotion_distinction_threshold', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={policy.promotion_core_subjects_must_pass} onChange={(e) => set('promotion_core_subjects_must_pass', e.target.checked)} />
          Core subjects must pass, regardless of average
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={policy.promotion_carry_over_allowed} onChange={(e) => set('promotion_carry_over_allowed', e.target.checked)} />
          Carry-over allowed (a student may fail up to the max above; off means any fail blocks promotion)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={policy.promotion_automatic} onChange={(e) => set('promotion_automatic', e.target.checked)} />
          Default Promote Students' selection to the computed eligible set
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={policy.promotion_manual_override_allowed} onChange={(e) => set('promotion_manual_override_allowed', e.target.checked)} />
          Admin may manually override the computed selection
        </label>
      </div>

      <button type="button" className="btn-primary text-sm mt-4" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? 'Saving…' : 'Save promotion policy'}
      </button>
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
            logo_url: form.logo_url, primary_color: form.primary_color,
            favicon_url: form.favicon_url, school_seal_url: form.school_seal_url,
            report_card_watermark_url: form.report_card_watermark_url,
            secondary_color: form.secondary_color, theme: form.theme, font_family: form.font_family,
            current_academic_year: form.current_academic_year, current_term: form.current_term,
            class_score_weight: Number(form.class_score_weight), exam_score_weight: Number(form.exam_score_weight),
            late_threshold: form.late_threshold, attendance_edit_cutoff: form.attendance_edit_cutoff,
            announcement_requires_approval: form.announcement_requires_approval,
            tax_rate: Number(form.tax_rate), late_fee_grace_days: Number(form.late_fee_grace_days),
            late_fee_percent: Number(form.late_fee_percent),
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

        <div className="border-t border-slate-100 pt-5 grid sm:grid-cols-2 gap-4 items-start">
          <ImageUpload label="Logo" value={form.logo_url} onChange={(logo_url) => setForm({ ...form, logo_url })}
            helpText="Shown on report cards and ID cards." />
          <div>
            <label className="label">Brand color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-12 rounded border border-slate-200 p-1 cursor-pointer"
                value={form.primary_color || '#5B4FE9'}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
              />
              <input
                className="input flex-1"
                value={form.primary_color || ''}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                placeholder="#5B4FE9"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Used as the accent color across the app and on printable documents.</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 grid sm:grid-cols-2 gap-4 items-start">
          <ImageUpload label="Favicon" value={form.favicon_url} onChange={(favicon_url) => setForm({ ...form, favicon_url })}
            helpText="Shown in the browser tab." />
          <ImageUpload label="School seal" value={form.school_seal_url} onChange={(school_seal_url) => setForm({ ...form, school_seal_url })}
            helpText="Shown on certificates." />
          <ImageUpload label="Report card watermark" value={form.report_card_watermark_url} onChange={(report_card_watermark_url) => setForm({ ...form, report_card_watermark_url })}
            helpText="Faint background image on report cards." />
          <div>
            <label className="label">Secondary color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-12 rounded border border-slate-200 p-1 cursor-pointer"
                value={form.secondary_color || '#000000'}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
              />
              <input
                className="input flex-1"
                value={form.secondary_color || ''}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </div>
          <div>
            <label className="label">Theme</label>
            <select className="input" value={form.theme || 'light'} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label className="label">Font</label>
            <input className="input" value={form.font_family || ''} onChange={(e) => setForm({ ...form, font_family: e.target.value })} placeholder="e.g. Poppins" />
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

        <div className="border-t border-slate-100 pt-5 grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Tax rate (%)</label>
            <input type="number" className="input" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
            <p className="text-xs text-slate-400 mt-1.5">Applied when invoices are generated.</p>
          </div>
          <div>
            <label className="label">Late fee grace period (days)</label>
            <input type="number" className="input" value={form.late_fee_grace_days} onChange={(e) => setForm({ ...form, late_fee_grace_days: e.target.value })} />
          </div>
          <div>
            <label className="label">Late fee (%)</label>
            <input type="number" className="input" value={form.late_fee_percent} onChange={(e) => setForm({ ...form, late_fee_percent: e.target.value })} />
            <p className="text-xs text-slate-400 mt-1.5">Of the outstanding balance, once overdue.</p>
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

      <div className="card p-6 max-w-2xl mt-6">
        <PromotionPolicyEditor initial={Object.fromEntries(PROMOTION_FIELDS.map((f) => [f, data[f]]))} />
      </div>
    </div>
  );
}
