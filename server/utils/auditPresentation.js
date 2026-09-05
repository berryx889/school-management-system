const ACTION_LABELS = {
  'demo.students_created': 'Demo student accounts added',
  'learning.publish': 'Learning activity published or updated',
  'account.2fa_disabled': 'Two-step verification turned off',
  'account.2fa_enabled': 'Two-step verification turned on',
  'auth.login': 'Successful sign-in',
  'auth.login_failed': 'Blocked sign-in attempt',
  'expense.create': 'Expense recorded',
  'expense.delete': 'Expense removed',
  'expense.update': 'Expense updated',
  'house.assign': 'Student house changed',
  'house.points_award': 'House points changed',
  'marks.import': 'Marks imported',
  'marks.update': 'Marks updated',
  'payment.record': 'Fee payment recorded',
  'permission.grant': 'Staff permission granted',
  'permission.revoke': 'Staff permission removed',
  'results.release': 'Result publication changed',
  'record.restore': 'Record restored',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin', admin: 'Administrator', teacher: 'Teacher',
  accountant: 'Accountant', kitchen: 'Kitchen staff', parent: 'Parent', student: 'Student',
};

export function actionLabel(action = '') {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'System activity';
}

function actorDisplay(actorLabel) {
  if (!actorLabel) return 'System or unknown visitor';
  return actorLabel.replace(/\(([^)]+)\)$/, (_match, role) => `— ${ROLE_LABELS[role] || role.replaceAll('_', ' ')}`);
}

function descriptionFor(entry) {
  const summary = entry.summary || actionLabel(entry.action);
  if (entry.action === 'auth.login') return `${entry.actor_label?.split(' (')[0] || 'A user'} signed in successfully.`;
  if (entry.action === 'auth.login_failed') {
    const account = summary.match(/"([^"]+)"/)?.[1];
    if (summary.includes('bad 2FA')) return `A sign-in${account ? ` for ${account}` : ''} was blocked because the verification code was invalid.`;
    if (summary.includes('wrong password')) return `A sign-in${account ? ` for ${account}` : ''} was blocked because the password was incorrect.`;
    if (summary.includes('no such account')) return `A sign-in was attempted for an account that does not exist${account ? ` (${account})` : ''}.`;
    return `A sign-in attempt${account ? ` for ${account}` : ''} was blocked.`;
  }
  if (entry.action === 'house.assign') return 'An administrator changed a student’s house assignment.';
  if (entry.action === 'permission.grant') return 'An administrator gave a staff member additional access.';
  if (entry.action === 'permission.revoke') return 'An administrator removed additional access from a staff member.';
  if (entry.action === 'record.restore') return 'An administrator restored a previously removed record.';
  return /[.!?]$/.test(summary) ? summary : `${summary}.`;
}

export function presentAuditEntry(entry) {
  return {
    ...entry,
    action_label: actionLabel(entry.action),
    actor_display: actorDisplay(entry.actor_label),
    description: descriptionFor(entry),
  };
}
