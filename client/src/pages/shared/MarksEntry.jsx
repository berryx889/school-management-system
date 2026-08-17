import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Modal, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconEdit, IconFileText, IconDownload, IconUpload } from '../../components/Icon.jsx';
import { ASSESSMENT_MODES } from '../../config/assessmentModes.js';

function modeLabel(a) {
  if (a?.mode) return a.mode;
  return a?.type === 'class_score' ? 'Class score' : 'Exam';
}

export default function MarksEntry() {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'admin'].includes(user.role);
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef(null);

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

  const [newAssessment, setNewAssessment] = useState({ mode: ASSESSMENT_MODES[0].value, title: '', max_score: 20, weight: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', max_score: '' });
  const [submitOpen, setSubmitOpen] = useState(false);
  const [bulkScore, setBulkScore] = useState('');

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

  const editAssessment = useMutation({
    mutationFn: (payload) => api.put(`/assessments/${assessmentId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments', classSubjectId, termId] });
      setEditOpen(false);
      toast('Assessment updated.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const lockAssessment = useMutation({
    mutationFn: (locked) => api.put(`/assessments/${assessmentId}/lock`, { locked }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['assessments', classSubjectId, termId] });
      setSubmitOpen(false);
      toast(res.data.locked ? 'Submitted — assessment locked.' : 'Reopened for editing.', 'success');
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

  async function downloadTemplate() {
    try {
      const res = await api.get('/marks/template', { params: { assessment_id: assessmentId }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scores_${assessment?.title || 'assessment'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('assessment_id', assessmentId);
    try {
      const { data } = await api.post('/marks/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast(`Uploaded ${data.updated} score(s)${data.errors.length ? `, ${data.errors.length} skipped` : ''}.`, data.errors.length ? 'warning' : 'success');
      qc.invalidateQueries({ queryKey: ['marks', assessmentId] });
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      e.target.value = '';
    }
  }

  // WAEC "change over-all score": stamp one value across every student in the roster.
  function applyBulkScore() {
    if (bulkScore === '') return;
    const max = Number(assessment?.max_score);
    const v = Number(bulkScore);
    if (Number.isNaN(v) || v < 0 || (max && v > max)) {
      toast(`Score must be between 0 and ${assessment?.max_score}.`, 'error');
      return;
    }
    setScores(Object.fromEntries((roster ?? []).map((s) => [s.id, bulkScore])));
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ['marks', assessmentId] });
    qc.invalidateQueries({ queryKey: ['class-subject-roster', classSubjectId] });
  }

  const enteredCount = roster?.filter((s) => scores[s.id] != null && scores[s.id] !== '').length ?? 0;
  const locked = assessment?.locked;

  return (
    <div>
      <SectionHeader title="Marks entry" description="Pick a class-subject, term and assessment, then enter or upload scores" />

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
          {assessments?.map((a) => <option key={a.id} value={a.id}>{a.title} — {modeLabel(a)}</option>)}
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
          <div className="p-4 border-b border-slate-100 flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                {assessment?.title}
                <Badge tone="slate">{modeLabel(assessment)}</Badge>
                {locked && <Badge tone="amber">Submitted · Locked</Badge>}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Max score {assessment?.max_score} · Weight {assessment?.weight} ·
                {' '}{enteredCount}/{roster?.length ?? 0} students scored
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!locked && (
                <button className="btn-ghost text-sm" onClick={() => { setEditForm({ title: assessment.title, max_score: assessment.max_score }); setEditOpen(true); }}>
                  Edit max score
                </button>
              )}
              <button className="btn-secondary text-sm" onClick={downloadTemplate}>
                <IconDownload className="h-4 w-4" /> Download template
              </button>
              {!locked && (
                <>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
                  <button className="btn-secondary text-sm" onClick={() => fileRef.current?.click()}>
                    <IconUpload className="h-4 w-4" /> Upload scores
                  </button>
                </>
              )}
            </div>
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
                        disabled={locked}
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
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            {!locked ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={assessment?.max_score}
                    className="input py-1.5 w-40"
                    placeholder="Change over-all score"
                    value={bulkScore}
                    onChange={(e) => setBulkScore(e.target.value)}
                  />
                  <button className="btn-ghost text-sm" onClick={applyBulkScore} type="button">Set all</button>
                </div>
                <button className="btn-secondary text-sm" onClick={refresh} type="button">Refresh</button>
                <button className="btn-primary ml-auto" onClick={() => saveScores.mutate()} disabled={saveScores.isPending}>
                  {saveScores.isPending ? 'Saving…' : 'Save scores'}
                </button>
                <button
                  className="btn-danger"
                  onClick={() => setSubmitOpen(true)}
                  disabled={lockAssessment.isPending}
                >
                  {lockAssessment.isPending ? 'Submitting…' : 'Submit Complete'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-600">This assessment has been submitted and is locked.</p>
                {isAdmin && (
                  <button className="btn-secondary ml-auto" onClick={() => lockAssessment.mutate(false)} disabled={lockAssessment.isPending}>
                    Reopen for editing
                  </button>
                )}
              </>
            )}
          </div>
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
            <label className="label">Mode of assessment</label>
            <select className="input" value={newAssessment.mode} onChange={(e) => setNewAssessment({ ...newAssessment, mode: e.target.value })}>
              {ASSESSMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.value}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">{ASSESSMENT_MODES.find((m) => m.value === newAssessment.mode)?.hint}</p>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" required placeholder="e.g. Quiz 1, Mid-term test" value={newAssessment.title} onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })} />
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

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit assessment">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); editAssessment.mutate(editForm); }}>
          <div>
            <label className="label">Title</label>
            <input className="input" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Max score (over-all score)</label>
            <input type="number" className="input" required value={editForm.max_score} onChange={(e) => setEditForm({ ...editForm, max_score: e.target.value })} />
            <p className="text-xs text-slate-400 mt-1">Existing scores above the new max will be rejected on next save.</p>
          </div>
          <button className="btn-primary w-full" disabled={editAssessment.isPending}>{editAssessment.isPending ? 'Saving…' : 'Save changes'}</button>
        </form>
      </Modal>

      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit Complete">
        <p className="text-sm text-slate-600">
          Submit and lock <b>{assessment?.title}</b>? Make sure you’ve saved any scores you typed
          — once submitted it can’t be edited, and only an admin can reopen it.
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setSubmitOpen(false)}>Cancel</button>
          <button className="btn-danger" disabled={lockAssessment.isPending} onClick={() => lockAssessment.mutate(true)}>
            {lockAssessment.isPending ? 'Submitting…' : 'Submit Complete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
