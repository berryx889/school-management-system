import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Modal, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconCalendar } from '../../components/Icon.jsx';

// Default the year label to the current academic year, e.g. "2025/2026".
function defaultYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; // school year starts ~Sept
  return `${startYear}/${startYear + 1}`;
}

const EMPTY_TERM = { year: defaultYear(), term: '', start_date: '', end_date: '', is_current: false };

function fmt(d) {
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

export default function AcademicTerms() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: terms, isLoading } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });

  const [genOpen, setGenOpen] = useState(false);
  const [gen, setGen] = useState({ year: defaultYear(), system: '3-term', start_date: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_TERM);
  const [editingId, setEditingId] = useState(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['terms'] });

  const generate = useMutation({
    mutationFn: (payload) => api.post('/terms/generate', payload),
    onSuccess: (res) => { invalidate(); setGenOpen(false); toast(`Set up ${res.data.length} periods for ${gen.year}.`, 'success'); },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const save = useMutation({
    mutationFn: (payload) => (editingId ? api.put(`/terms/${editingId}`, payload) : api.post('/terms', payload)),
    onSuccess: () => { invalidate(); setFormOpen(false); toast(editingId ? 'Term updated.' : 'Term added.', 'success'); },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const setCurrent = useMutation({
    mutationFn: (id) => api.put(`/terms/${id}/set-current`),
    onSuccess: () => { invalidate(); toast('Current term updated.', 'success'); },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/terms/${id}`),
    onSuccess: () => { invalidate(); toast('Term deleted.', 'success'); },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function openAdd() { setEditingId(null); setForm(EMPTY_TERM); setFormOpen(true); }
  function openEdit(t) {
    setEditingId(t.id);
    setForm({ year: t.year, term: t.term, start_date: t.start_date?.slice(0, 10) || '', end_date: t.end_date?.slice(0, 10) || '', is_current: t.is_current });
    setFormOpen(true);
  }

  return (
    <div>
      <SectionHeader
        title="Academic terms"
        description="Set up the terms or semesters for each academic year. Everything else — fees, exams, report cards — hangs off the current term."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={openAdd}>+ Add term</button>
            <button className="btn-primary" onClick={() => setGenOpen(true)}>Set up academic year</button>
          </div>
        }
      />

      {isLoading ? (
        <div className="card p-5 space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-5 w-1/2" />)}
        </div>
      ) : !terms?.length ? (
        <div className="card">
          <EmptyState
            icon={IconCalendar}
            title="No terms yet"
            description="Use “Set up academic year” to generate a whole year of terms in one click."
            action={<button className="btn-primary" onClick={() => setGenOpen(true)}>Set up academic year</button>}
          />
        </div>
      ) : (
        <div className="card table-card overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Term</th>
                  <th className="hidden sm:table-cell">Starts</th>
                  <th className="hidden sm:table-cell">Ends</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t.id}>
                    <td className="font-medium text-slate-800">{t.year}</td>
                    <td>{t.term}</td>
                    <td className="hidden sm:table-cell text-slate-500">{fmt(t.start_date)}</td>
                    <td className="hidden sm:table-cell text-slate-500">{fmt(t.end_date)}</td>
                    <td>
                      {t.is_current ? (
                        <Badge tone="green">Current</Badge>
                      ) : (
                        <button className="text-primary-600 font-medium text-sm" onClick={() => setCurrent.mutate(t.id)}>
                          Set current
                        </button>
                      )}
                    </td>
                    <td className="text-right space-x-3 whitespace-nowrap">
                      <button className="text-slate-500 font-medium" onClick={() => openEdit(t)}>Edit</button>
                      {!t.is_current && (
                        <button className="text-red-500 font-medium" onClick={() => remove.mutate(t.id)} disabled={remove.isPending}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* One-click year generator */}
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Set up academic year">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); generate.mutate(gen); }}>
          <p className="text-sm text-slate-500">
            Pick the structure and when the year starts — we’ll create every term with sensible dates you can fine-tune afterward.
          </p>
          <div>
            <label className="label">Academic year</label>
            <input className="input" required placeholder="2025/2026" value={gen.year} onChange={(e) => setGen({ ...gen, year: e.target.value })} />
          </div>
          <div>
            <label className="label">Structure</label>
            <select className="input" value={gen.system} onChange={(e) => setGen({ ...gen, system: e.target.value })}>
              <option value="3-term">3 terms (Term 1, 2, 3)</option>
              <option value="2-semester">2 semesters (Semester 1, 2)</option>
            </select>
          </div>
          <div>
            <label className="label">First term starts</label>
            <input type="date" className="input" required value={gen.start_date} onChange={(e) => setGen({ ...gen, start_date: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={generate.isPending}>{generate.isPending ? 'Generating…' : 'Generate terms'}</button>
        </form>
      </Modal>

      {/* Manual add / edit */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit term' : 'Add term'}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Academic year</label>
              <input className="input" required placeholder="2025/2026" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div>
              <label className="label">Term name</label>
              <input className="input" required placeholder="Term 1" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Starts</label>
              <input type="date" className="input" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Ends</label>
              <input type="date" className="input" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          {!editingId && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} />
              Make this the current term
            </label>
          )}
          <button className="btn-primary w-full" disabled={save.isPending}>{save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add term'}</button>
        </form>
      </Modal>
    </div>
  );
}
