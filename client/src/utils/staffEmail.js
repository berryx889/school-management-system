// Display-only "school identity" email, not a real mailbox — no email infrastructure
// exists in this app. Purely computed at render time, never persisted.
export function generateStaffEmail(fullName, shortName) {
  if (!fullName?.trim()) return '';
  // Strip punctuation per part (e.g. the period in "Mrs.") so it doesn't leak into the
  // address as a stray double dot.
  const parts = fullName.trim().toLowerCase().split(/\s+/).map((p) => p.replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : null;
  const slug = (shortName || 'school').toLowerCase().replace(/[^a-z0-9]/g, '') || 'school';
  return last ? `${first}.${last}@${slug}.edu.gh` : `${first}@${slug}.edu.gh`;
}
