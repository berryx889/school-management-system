import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Modal, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconEdit, IconFileText } from '../../components/Icon.jsx';

export default function MarksEntry() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const toast = useToast();
  const qc = useQueryClient();

  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);
  const [termId, setTermId] = useState('');
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);

  const { data: classSubjects } = useQuery({
    queryKey: ['class-subjects', 'mine', user.id, isAdmin],
    queryFn: () => api.get('/class-subjects', { params: isAdmin ? {} : { teacher_id: user.id } }).then((r) => r.data),
  });
  const [classSubjectId, setClassSubjectId] = useState('');

  const { data: assessments, isLoading: loadingAssessments } = useQuery({
    queryKey: ['assessments', classSubjectId, termId],
    queryFn: () => api.get('/assessments', { params: { class_subject_id: classSubjectId, term_id: termId } }).then((r) => r.data),
    enabled: Boolean(classSubjectId && termId),
  });
  const [assessmentId, setAssessmentId] = useState('');
  const assessment = assessments?.find((a) => a.id === Number(assessmentId));

  const [newAssessment, setNewAssessment] = useState({ type: 'class_score', title: '', max_score: 20, weight: 20 });
  const [modalOpen, setModalOpen] = useState(false);

  const createAssessment = useMutation({
    mutationFn: (payload) => api.post('/assessments', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      setAssessmentId(String(res.data.id));
      setModalOpen(false);
      toast('Assessment created.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const { data: roster, isLoading: loadingRoster } = useQuery({
    queryKey: ['class-subject-roster', classSubjectId],
    queryFn: async () => {
      const cs = classSubjects.find((c) => c.id === Number(classSubjectId));
      return api.get('/students', { params: { class_id: cs.class_id, limit: 200 } }).then((r) => r.data.data);
    },
    enabled: Boolean(classSubjectId && classSubjects),
  });

  const { data: marks } = useQuery({
    queryKey: ['marks', assessmentId],
    queryFn: () => api.get('/marks', { params: { assessment_id: assessmentId } }).then((r) => r.data),
    enabled: Boolean(assessmentId),
  });

  const [scores, setScores] = useState({});
  useEffect(() => {
    if (!marks) return;
    const map = {};
    for (const m of marks) map[m.student_id] = m.score;
    setScores(map);
  }, [marks]);

  const saveScores = useMutation({
    mutationFn: () =>
      api.put('/marks/bulk', {
        assessment_id: assessmentId,
        entries: Object.entries(scores).map(([student_id, score]) => ({ student_id: Number(student_id), score })),
      }),
    onSuccess: () => {
      toast('Scores saved.', 'success');
      qc.invalidateQueries({ queryKey: ['marks', assessmentId] });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader title="Marks entry" description="Pick a class-subject, term and assessment, then enter scores" />

      <div className="card p-5 mb-5 grid sm:grid-cols-3 gap-3">
        <select className="input" value={classSubjectId} onChange={(e) => { setClassSubjectId(e.target.value); setAssessmentId(''); }}>
          <option value="">Class-subject…</option>
          {classSubjects?.map((cs) => (
            <option key={cs.id} value={cs.id}>{cs.class_name} · {cs.subject_name}</option>
          ))}
        </select>
        <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
          {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
        </select>
        <select className="input" value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} disabled={!classSubjectId}>
          <option value="">Assessment…</option>
          {assessments?.map((a) => <option key={a.id} value={a.id}>{a.title} ({a.type === 'class_score' ? 'Class score' : 'Exam'})</option>)}
        </select>
      </div>

      {classSubjectId && termId && (
        <button className="btn-secondary mb-5" onClick={() => setModalOpen(true)}>+ New assessment</button>
      )}

      {!classSubjectId ? (
        <div className="card"><EmptyState icon={IconEdit} title="Choose a class-subject" /></div>
      ) : loadingAssessments ? (
        <div className="card p-5 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : !assessmentId ? (
        <div className="card"><EmptyState icon={IconFileText} title="Choose or create an assessment" /></div>
      ) : loadingRoster ? (
        <div className="card p-5 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card table-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-slate-800">{assessment?.title}</p>
              <p className="text-xs text-slate-500">Max score {assessment?.max_score} · Weight {assessment?.weight}</p>
            </div>
            {assessment?.locked && <Badge tone="amber">Locked</Badge>}
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="w-32">Score</th>
                </tr>
              </thead>
              <tbody>
                {roster?.map((s, idx) => (
                  <tr key={s.id}>
                    <td>{s.full_name}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={assessment?.max_score}
                        disabled={assessment?.locked}
                        className="input py-1.5"
                        value={scores[s.id] ?? ''}
                        onChange={(e) => setScores((sc) => ({ ...sc, [s.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const next = document.querySelectorAll('input[type=number]')[idx + 1];
                            next?.focus();
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!assessment?.locked && (
            <div className="p-4 border-t border-slate-100">
              <button className="btn-primary" onClick={() => saveScores.mutate()} disabled={saveScores.isPending}>
                {saveScores.isPending ? 'Saving…' : 'Save scores'}
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New assessment">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createAssessment.mutate({ class_subject_id: classSubjectId, term_id: termId, ...newAssessment });
          }}
        >
          <div>
            <label className="label">Type</label>
            <select className="input" value={newAssessment.type} onChange={(e) => setNewAssessment({ ...newAssessment, type: e.target.value })}>
              <option value="class_score">Class score</option>
              <option value="exam">Exam</option>
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" required placeholder="e.g. Mid-term test" value={newAssessment.title} onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Max score</label>
              <input type="number" className="input" required value={newAssessment.max_score} onChange={(e) => setNewAssessment({ ...newAssessment, max_score: e.target.value })} />
            </div>
            <div>
              <label className="label">Weight (out of 100)</label>
              <input type="number" className="input" required value={newAssessment.weight} onChange={(e) => setNewAssessment({ ...newAssessment, weight: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary w-full" disabled={createAssessment.isPending}>{createAssessment.isPending ? 'Creating…' : 'Create assessment'}</button>
        </form>
      </Modal>
    </div>
  );
}
