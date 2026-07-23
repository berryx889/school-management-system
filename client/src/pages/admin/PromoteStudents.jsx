import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Avatar, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconGraduationCap } from '../../components/Icon.jsx';

export default function PromoteStudents() {
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [selected, setSelected] = useState(new Set());
  const toast = useToast();
  const qc = useQueryClient();

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);

  const { data: roster, isLoading } = useQuery({
    queryKey: ['students', 'class', classId],
    queryFn: () => api.get('/students', { params: { class_id: classId, limit: 200 } }).then((r) => r.data.data),
    enabled: Boolean(classId),
  });

  const { data: eligibility } = useQuery({
    queryKey: ['promotion-eligibility', classId, termId],
    queryFn: () => api.get('/results/promotion-eligibility', { params: { class_id: classId, term_id: termId } }).then((r) => r.data),
    enabled: Boolean(classId && termId),
  });

  const eligibilityByStudent = useMemo(() => {
    const map = new Map();
    eligibility?.students.forEach((e) => map.set(e.student_id, e));
    return map;
  }, [eligibility]);

  const overrideAllowed = eligibility?.policy.promotion_manual_override_allowed !== false;
  const useEligibleDefault = eligibility?.policy && (eligibility.policy.promotion_automatic || !overrideAllowed);

  useEffect(() => {
    if (!roster) return;
    if (useEligibleDefault) {
      setSelected(new Set(roster.filter((s) => eligibilityByStudent.get(s.id)?.eligible).map((s) => s.id)));
    } else {
      setSelected(new Set(roster.map((s) => s.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, eligibility]);

  const promote = useMutation({
    mutationFn: () => api.post('/students/promote', {
      student_ids: [...selected], class_id: targetClassId || null, from_class_id: classId, term_id: termId,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast(`Moved ${res.data.updated} student${res.data.updated === 1 ? '' : 's'}.`, 'success');
      setClassId('');
      setTargetClassId('');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function toggle(id) {
    if (!overrideAllowed) return;
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const targetClassName = classes?.find((c) => String(c.id) === String(targetClassId))?.name;

  return (
    <div>
      <SectionHeader
        title="Promote / repeat students"
        description="Move selected students from one class to another at year-end. Unchecked students stay behind (repeat)."
      />

      <div className="card p-5 mb-6 grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">From class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Choose a class…</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Term (for results)</label>
          <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
            <option value="">Choose a term…</option>
            {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
          </select>
        </div>
        <div>
          <label className="label">To class</label>
          <select className="input" value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)}>
            <option value="">Choose target class…</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {!overrideAllowed && classId && termId && (
        <div className="card p-3 mb-5 bg-amber-50 border-amber-100 text-sm text-amber-700">
          Promotion policy disallows manual override — the selection below is locked to the computed eligible students.
        </div>
      )}

      {!classId ? (
        <div className="card"><EmptyState icon={IconGraduationCap} title="Choose a class" description="Select a source class above to see its roster." /></div>
      ) : isLoading ? (
        <div className="card p-5 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      ) : !roster?.length ? (
        <div className="card"><EmptyState icon={IconGraduationCap} title="No students in this class" /></div>
      ) : (
        <>
          <div className="card divide-y divide-slate-50 mb-5">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-slate-50">
              <label className="flex items-center gap-2 font-medium text-slate-600">
                <input
                  type="checkbox"
                  disabled={!overrideAllowed}
                  checked={selected.size === roster.length}
                  onChange={(e) => overrideAllowed && setSelected(e.target.checked ? new Set(roster.map((s) => s.id)) : new Set())}
                />
                Select all
              </label>
              <span className="text-slate-400">{selected.size} of {roster.length} selected</span>
            </div>
            {roster.map((s) => {
              const e = eligibilityByStudent.get(s.id);
              return (
                <label key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${overrideAllowed ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
                  <input type="checkbox" disabled={!overrideAllowed} checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  <Avatar name={s.full_name} photoUrl={s.photo_url} size={32} />
                  <span className="font-medium text-slate-800">{s.full_name}</span>
                  <span className="text-slate-400 text-sm">{s.student_code}</span>
                  {e && (
                    <span className="ml-auto" title={e.reasons.join('; ')}>
                      {e.eligible
                        ? <Badge tone="green">{e.distinction ? 'Distinction' : 'Eligible'}</Badge>
                        : <Badge tone="red">{e.reasons[0]}</Badge>}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <button
            className="btn-primary"
            disabled={!selected.size || !targetClassId || promote.isPending}
            onClick={() => promote.mutate()}
          >
            {promote.isPending
              ? 'Moving…'
              : `Move ${selected.size} student${selected.size === 1 ? '' : 's'} to ${targetClassName || '…'}`}
          </button>
          <p className="text-xs text-slate-400 mt-2">
            {roster.length - selected.size} student{roster.length - selected.size === 1 ? '' : 's'} left unchecked will stay in {classes?.find((c) => String(c.id) === String(classId))?.name} (repeating).
          </p>
        </>
      )}
    </div>
  );
}
