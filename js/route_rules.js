const PROJECT_GRADES = new Set(['', '-', '?', 'project', 'projekt', 'n/a']);

export function isProjectGrade(value) {
  return PROJECT_GRADES.has(String(value ?? '').trim().toLowerCase());
}
