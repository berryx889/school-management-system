import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconEdit, IconZap } from '../../components/Icon.jsx';

export default function RemarkSheet() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);
  const [termId, setTermId] = useState('');
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const [classId, setClassId] = useState('');

  const { data: roster, isLoading: loadingRoster } = useQuery({
    queryKey: ['students', 'class', classId],
    queryFn: () => api.get('/students', { params: { class_id: classId, limit: 200 } }).then((r) => r.data.data),
    enabled: Boolean(classId),
  });

  const { data: existingRemarks } = useQuery({
    queryKey: ['results', 'remarks', classId, termId],
    queryFn: () => api.get('/results/remarks', { params: { class_id: classId, term_id: termId } }).then((r) => r.data),
    enabled: Boolean(classId && termId),
  });

  const { data: templates } = useQuery({
    queryKey: ['remark-templates', classId],
    queryFn: () => api.get('/remark-templates', { params: { class_id: classId } }).then((r) => r.data),
    enabled: Boolean(classId),
  });

  const [remarks, setRemarks] = useState({});
  const [suggestions, setSuggestions] = useState({});
  useEffect(() => {
    if (!existingRemarks) return;
    const map = {};
    for (const r of existingRemarks) map[r.student_id] = r.class_teacher_remark || '';
    setRemarks(map);
  }, [existingRemarks]);

  const save = useMutation({
    mutationFn: () =>
      api.put('/results/remarks/bulk', {
        class_id: classId,
        term_id: termId,
        entries: Object.entries(remarks).map(([student_id, class_teacher_remark]) => ({ student_id: Number(student_id), class_teacher_remark })),
      }),
    onSuccess: () => {
      toast('Remarks saved.', 'success');
      qc.invalidateQueries({ queryKey: ['results', 'remarks', classId, termId] });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const generateSuggestions = useMutation({
    mutationFn: () => api.get('/results/remarks/suggestions', { params: { class_id: classId, term_id: termId } }).then((r) => r.data),
    onSuccess: (rows) => {
      const map = Object.fromEntries(rows.map((row) => [row.student_id, row]));
      setSuggestions(map);
      setRemarks((current) => {
        const next = { ...current };
        for (const row of rows) if (!(next[row.student_id] || '').trim()) next[row.student_id] = row.suggestion;
        return next;
      });
      toast('Smart drafts generated. Review and edit them before saving.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  // WAEC-style bulk: stamp one template remark onto every student in the roster.
  function applyTemplateToAll(text) {
    if (!text) return;
    setRemarks(Object.fromEntries((roster ?? []).map((s) => [s.id, text])));
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ['results', 'remarks', classId, termId] });
    qc.invalidateQueries({ queryKey: ['students', 'class', classId] });
  }

  const remarkedCount = roster?.filter((s) => (remarks[s.id] ?? '').trim() !== '').length ?? 0;

  return (
    <div>
      <SectionHeader title="Remark sheet" description="Pick a term and class, then enter each student's class teacher remark" />

      <div className="card p-5 mb-5 grid sm:grid-cols-2 gap-3">
        <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Choose a class…</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
          {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
        </select>
      </div>

      {!classId ? (
        <div className="card"><EmptyState icon={IconEdit} title="Choose a class" description="Select a class above to load its roster." /></div>
      ) : loadingRoster ? (
        <div className="card p-5 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">
              {remarkedCount}/{roster?.length ?? 0} students remarked
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-secondary text-sm" type="button" disabled={generateSuggestions.isPending || !termId} onClick={() => generateSuggestions.mutate()}><IconZap className="h-4 w-4" /> {generateSuggestions.isPending ? 'Generating…' : 'Generate smart remarks'}</button>
              {templates?.length > 0 && (
                <select
                  className="input !py-1.5 !w-auto text-sm"
                  value=""
                  onChange={(e) => { applyTemplateToAll(e.target.value); e.target.value = ''; }}
                >
                  <option value="">Apply template to all…</option>
                  {templates.map((t) => <option key={t.id} value={t.remark_text}>{t.remark_type}: {t.remark_text}</option>)}
                </select>
              )}
              <button className="btn-secondary text-sm" type="button" onClick={refresh}>Refresh</button>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {roster?.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div><span className="font-medium text-slate-800">{s.full_name}</span>{suggestions[s.id] && <p className="text-xs text-slate-400 mt-0.5">Average {suggestions[s.id].average}% · Position {suggestions[s.id].class_position} · Attendance {suggestions[s.id].attendance_rate == null ? 'not recorded' : `${suggestions[s.id].attendance_rate}%`}</p>}</div>
                  {templates?.length > 0 && (
                    <select
                      className="input !py-1 !w-auto text-xs"
                      value=""
                      onChange={(e) => {
                        const text = e.target.value;
                        if (!text) return;
                        setRemarks((r) => ({ ...r, [s.id]: `${r[s.id] ? r[s.id] + ' ' : ''}${text}` }));
                      }}
                    >
                      <option value="">Insert template…</option>
                      {templates.map((t) => <option key={t.id} value={t.remark_text}>{t.remark_type}: {t.remark_text}</option>)}
                    </select>
                  )}
                </div>
                <textarea
                  className="input"
                  rows={2}
                  value={remarks[s.id] ?? ''}
                  onChange={(e) => setRemarks((r) => ({ ...r, [s.id]: e.target.value }))}
                />
                {suggestions[s.id] && remarks[s.id] !== suggestions[s.id].suggestion && <button type="button" className="text-xs text-primary-600 font-medium mt-1" onClick={() => setRemarks((r) => ({ ...r, [s.id]: suggestions[s.id].suggestion }))}>Use smart draft</button>}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            {Object.keys(suggestions).length > 0 && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">Smart remarks are drafts based on recorded marks and attendance. A teacher must review them for accuracy and tone before saving.</p>}
            <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save remarks'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
