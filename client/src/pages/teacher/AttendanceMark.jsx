import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, Avatar, EmptyState } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconGraduationCap } from '../../components/Icon.jsx';

const STATUSES = [
  { id: 'present', label: 'Present', tone: 'bg-emerald-500 text-white' },
  { id: 'late', label: 'Late', tone: 'bg-amber-500 text-white' },
  { id: 'absent', label: 'Absent', tone: 'bg-red-500 text-white' },
];

export default function AttendanceMark() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const toast = useToast();
  const qc = useQueryClient();

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const myClass = classes?.find((c) => c.class_teacher_name === user.full_name) || classes?.[0];
  const [classId, setClassId] = useState('');

  useEffect(() => {
    if (myClass && !classId) setClassId(String(myClass.id));
  }, [myClass, classId]);

  const { data: roster, isLoading } = useQuery({
    queryKey: ['attendance', classId, today],
    queryFn: () => api.get('/attendance', { params: { class_id: classId, date: today } }).then((r) => r.data),
    enabled: Boolean(classId),
  });

  const [statusOverrides, setStatusOverrides] = useState({});

  const submit = useMutation({
    mutationFn: (records) => api.post('/attendance/manual', { class_id: classId, date: today, records }),
    onSuccess: () => {
      toast('Attendance saved.', 'success');
      qc.invalidateQueries({ queryKey: ['attendance', classId, today] });
      setStatusOverrides({});
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function statusFor(student) {
    if (statusOverrides[student.student_id]) return statusOverrides[student.student_id];
    return student.status || 'present';
  }

  function handleSubmit() {
    const records = roster.map((s) => ({ student_id: s.student_id, status: statusFor(s) }));
    submit.mutate(records);
  }

  return (
    <div>
      <SectionHeader
        title="Morning attendance"
        description={new Date().toDateString()}
        action={
          <select className="input max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : !roster?.length ? (
        <div className="card"><EmptyState icon={IconGraduationCap} title="No students in this class" /></div>
      ) : (
        <div className="card divide-y divide-slate-50">
          {roster.map((s) => {
            const isQr = s.method === 'qr';
            const current = statusFor(s);
            return (
              <div key={s.student_id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={s.full_name} photoUrl={s.photo_url} size={36} />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{s.full_name}</p>
                    {isQr && <p className="text-xs text-primary-600">Checked in by QR — locked</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {STATUSES.map((st) => (
                    <button
                      key={st.id}
                      disabled={isQr}
                      onClick={() => setStatusOverrides((o) => ({ ...o, [s.student_id]: st.id }))}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-40
                        ${current === st.id ? st.tone : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {Boolean(roster?.length) && (
        <button className="btn-primary mt-5 w-full sm:w-auto" onClick={handleSubmit} disabled={submit.isPending}>
          {submit.isPending ? 'Saving…' : 'Submit attendance'}
        </button>
      )}
    </div>
  );
}
