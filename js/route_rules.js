// A question mark means an established but not yet graded route. Only genuine
// projects without an ascent are excluded from ticklists.
const PROJECT_GRADES = new Set(['', '-', 'project', 'projekt', 'n/a']);

export function isProjectGrade(value) {
  return PROJECT_GRADES.has(String(value ?? '').trim().toLowerCase());
}
