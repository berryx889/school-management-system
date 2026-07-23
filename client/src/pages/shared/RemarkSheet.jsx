import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconEdit } from '../../components/Icon.jsx';

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
          <div className="divide-y divide-slate-50">
            {roster?.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-medium text-slate-800">{s.full_name}</span>
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
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save remarks'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
