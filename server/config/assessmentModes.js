// WAEC-style assessment modes. Each mode is a descriptive category the teacher picks; it maps
// onto the app's grading `type` (class_score vs exam) so report-card computation is unchanged.
// Keep this list in sync with the client copy in client/src/config/assessmentModes.js.
export const ASSESSMENT_MODES = [
  { value: 'Individual Class Assessments', type: 'class_score', hint: 'Classwork, quizzes, homework' },
  { value: 'Mid-Semester', type: 'class_score', hint: 'Mid-semester test' },
  { value: 'Practical / Portfolio / Performance', type: 'class_score', hint: 'Individual practical or portfolio' },
  { value: 'Group Projects / Research', type: 'class_score', hint: 'Projects, case studies, presentations' },
  { value: 'Supervised Individual Termly', type: 'class_score', hint: 'Supervised termly assessment' },
  { value: 'End of Semester Exam', type: 'exam', hint: 'Final semester examination' },
];

// mode label -> grading type. Falls back to null so callers can validate.
export function typeForMode(mode) {
  return ASSESSMENT_MODES.find((m) => m.value === mode)?.type ?? null;
}
