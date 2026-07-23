import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconLink } from '../../components/Icon.jsx';

export default function ClassSubjects() {
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const toast = useToast();
  const qc = useQueryClient();

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/subjects').then((r) => r.data) });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: () => api.get('/teachers').then((r) => r.data.data) });
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: () => api.get('/class-subjects', { params: { class_id: classId || undefined } }).then((r) => r.data),
  });

  const assign = useMutation({
    mutationFn: (payload) => api.post('/class-subjects', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-subjects'] });
      toast('Assigned.', 'success');
      setSubjectId('');
      setTeacherId('');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/class-subjects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-subjects'] }),
  });

  return (
    <div>
      <SectionHeader title="Class-subject-teacher mapping" description="Assign which teacher handles each subject for a class" />

      <div className="card p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-3">
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Choose class…</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Choose subject…</option>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Choose teacher…</option>
            {teachers?.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>
        <button
          className="btn-primary mt-3"
          disabled={!classId || !subjectId || assign.isPending}
          onClick={() => assign.mutate({ class_id: classId, subject_id: subjectId, teacher_id: teacherId || null })}
        >
          Assign
        </button>
      </div>

      <div className="card table-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        ) : !mappings?.length ? (
          <EmptyState icon={IconLink} title="No assignments yet" description="Choose a class above and assign subjects to teachers." />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id}>
                    <td>{m.class_name}</td>
                    <td>{m.subject_name} <span className="text-slate-400">({m.subject_code})</span></td>
                    <td>{m.teacher_name || <span className="text-amber-600">Unassigned</span>}</td>
                    <td className="text-right">
                      <button className="text-red-600 font-medium" onClick={() => remove.mutate(m.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
