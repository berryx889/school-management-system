import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Avatar } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconGraduationCap } from '../../components/Icon.jsx';

export default function PromoteStudents() {
  const [classId, setClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [selected, setSelected] = useState(new Set());
  const toast = useToast();
  const qc = useQueryClient();

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: roster, isLoading } = useQuery({
    queryKey: ['students', 'class', classId],
    queryFn: () => api.get('/students', { params: { class_id: classId, limit: 200 } }).then((r) => r.data.data),
    enabled: Boolean(classId),
  });

  useEffect(() => {
    setSelected(new Set(roster?.map((s) => s.id)));
  }, [roster]);

  const promote = useMutation({
    mutationFn: () => api.post('/students/promote', { student_ids: [...selected], class_id: targetClassId || null }),
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

      <div className="card p-5 mb-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">From class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Choose a class…</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {!classId ? (
        <div className="card"><EmptyState icon={IconGraduationCap} title="Choose a class" description="Select a source class above to see its roster." /></div>
      ) : isLoading ? (
        <PageLoader />
      ) : !roster?.length ? (
        <div className="card"><EmptyState icon={IconGraduationCap} title="No students in this class" /></div>
      ) : (
        <>
          <div className="card divide-y divide-slate-50 mb-5">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-slate-50/70">
              <label className="flex items-center gap-2 font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={selected.size === roster.length}
                  onChange={(e) => setSelected(e.target.checked ? new Set(roster.map((s) => s.id)) : new Set())}
                />
                Select all
              </label>
              <span className="text-slate-400">{selected.size} of {roster.length} selected</span>
            </div>
            {roster.map((s) => (
              <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50/60">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <Avatar name={s.full_name} photoUrl={s.photo_url} size={32} />
                <span className="font-medium text-slate-800">{s.full_name}</span>
                <span className="text-slate-400 text-sm ml-auto">{s.student_code}</span>
              </label>
            ))}
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
