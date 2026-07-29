// WAEC-style assessment modes shown in the marks-entry form. Mirror of the server copy in
// server/config/assessmentModes.js — keep the two in sync. `type` is the grading category the
// mode maps onto (drives report-card computation).
export const ASSESSMENT_MODES = [
  { value: 'Individual Class Assessments', type: 'class_score', hint: 'Classwork, quizzes, homework' },
  { value: 'Mid-Semester', type: 'class_score', hint: 'Mid-semester test' },
  { value: 'Practical / Portfolio / Performance', type: 'class_score', hint: 'Individual practical or portfolio' },
  { value: 'Group Projects / Research', type: 'class_score', hint: 'Projects, case studies, presentations' },
  { value: 'Supervised Individual Termly', type: 'class_score', hint: 'Supervised termly assessment' },
  { value: 'End of Semester Exam', type: 'exam', hint: 'Final semester examination' },
];
