import { useEffect, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { IconPrinter, IconReceipt } from '../../components/Icon.jsx';

function ReportCardPage({ result, settings }) {
  return (
    <div className="report-card relative bg-white p-8 w-[210mm] min-h-[297mm] mx-auto mb-6 print:mb-0 print:break-after-page border border-slate-100 print:border-none">
      {settings?.report_card_watermark_url && (
        <img src={settings.report_card_watermark_url} alt="" className="absolute inset-0 m-auto max-h-[60%] opacity-10 pointer-events-none" />
      )}
      <div className="text-center border-b-2 pb-4 mb-4" style={{ borderColor: settings?.primary_color || '#059669' }}>
        {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-14 mx-auto mb-2" />}
        <h1 className="text-xl font-bold text-slate-900">{settings?.name}</h1>
        <p className="text-xs text-slate-500">{settings?.address} · {settings?.phone}</p>
        {settings?.motto && <p className="text-xs italic text-slate-400 mt-1">"{settings.motto}"</p>}
        <p className="font-semibold text-sm mt-2">TERMINAL REPORT</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <p><span className="text-slate-500">Name:</span> <strong>{result.student.full_name}</strong></p>
        <p><span className="text-slate-500">Class:</span> {result.student.class_name}</p>
        <p><span className="text-slate-500">Attendance:</span> {result.attendance.present}/{result.attendance.total} days</p>
        <p><span className="text-slate-500">Class position:</span> {result.class_position} of {result.class_size}</p>
      </div>

      <table className="w-full text-xs border-collapse mb-4">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-200 p-1.5 text-left">Subject</th>
            <th className="border border-slate-200 p-1.5">Class score</th>
            <th className="border border-slate-200 p-1.5">Exam score</th>
            <th className="border border-slate-200 p-1.5">Total</th>
            <th className="border border-slate-200 p-1.5">Grade</th>
            <th className="border border-slate-200 p-1.5">Position</th>
            <th className="border border-slate-200 p-1.5">Remark</th>
          </tr>
        </thead>
        <tbody>
          {result.subjects.map((s) => (
            <tr key={s.class_subject_id}>
              <td className="border border-slate-200 p-1.5">{s.subject_name}</td>
              <td className="border border-slate-200 p-1.5 text-center">{s.class_score}</td>
              <td className="border border-slate-200 p-1.5 text-center">{s.exam_score}</td>
              <td className="border border-slate-200 p-1.5 text-center font-semibold">{s.total}</td>
              <td className="border border-slate-200 p-1.5 text-center">{s.grade}</td>
              <td className="border border-slate-200 p-1.5 text-center">{s.position}</td>
              <td className="border border-slate-200 p-1.5">{s.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <p><span className="text-slate-500">Overall total:</span> <strong>{result.total.toFixed(1)}</strong></p>
        <p><span className="text-slate-500">Average:</span> <strong>{result.average.toFixed(1)}</strong></p>
      </div>

      <div className="space-y-3 text-sm">
        <p><span className="text-slate-500">Class teacher's remark:</span> {result.remarks?.class_teacher_remark || '—'}</p>
        <p><span className="text-slate-500">Head teacher's remark:</span> {result.remarks?.head_teacher_remark || (result.average >= 70 ? 'Excellent performance, keep it up.' : result.average >= 50 ? 'Good effort, room to improve.' : 'Needs significant improvement — please see class teacher.')}</p>
      </div>

      <div className="flex justify-between items-end mt-10 text-xs text-slate-500">
        <p>Class teacher's signature: __________________</p>
        {settings?.school_seal_url && <img src={settings.school_seal_url} alt="School seal" className="h-12" />}
        <p>Next term begins: __________________</p>
      </div>
    </div>
  );
}

export default function ReportCards() {
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);

  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);

  const { data: broadsheet } = useQuery({
    queryKey: ['broadsheet', classId, termId],
    queryFn: () => api.get('/results/broadsheet', { params: { class_id: classId, term_id: termId } }).then((r) => r.data),
    enabled: Boolean(classId && termId),
  });

  const results = useQueries({
    queries: (broadsheet?.students || []).map((s) => ({
      queryKey: ['result', s.student_id, termId],
      queryFn: () => api.get(`/results/student/${s.student_id}`, { params: { term_id: termId } }).then((r) => r.data),
      enabled: Boolean(termId),
    })),
  });

  const loaded = results.every((r) => r.isSuccess);

  return (
    <div>
      <SectionHeader
        title="Report cards"
        description="Batch print — one page per student"
        action={
          <div className="flex gap-2 no-print">
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Choose class…</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
            </select>
            {loaded && Boolean(results.length) && (
              <button className="btn-primary" onClick={() => window.print()}><IconPrinter className="h-4 w-4" /> Print all</button>
            )}
          </div>
        }
      />

      {!classId ? (
        <div className="card no-print"><EmptyState icon={IconReceipt} title="Choose a class and term" /></div>
      ) : !loaded ? (
        <div className="card p-8 max-w-[210mm] mx-auto space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : !results.length ? (
        <div className="card no-print"><EmptyState icon={IconReceipt} title="No students in this class" /></div>
      ) : (
        <div>
          {results.map((r) => (
            <ReportCardPage key={r.data.student.id} result={r.data} settings={settings} />
          ))}
        </div>
      )}
    </div>
  );
}
