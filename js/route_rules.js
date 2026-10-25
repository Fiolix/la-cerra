// A question mark means an established but not yet graded route. Only genuine
// projects without an ascent are excluded from ticklists.
const PROJECT_GRADES = new Set(['', '-', 'project', 'projekt', 'n/a']);
const UNNAMED_ROUTE_NAMES = new Set(['nn', 'n.n', 'n.n.', 'unnamed', 'unnamed route']);
const PROJECT_ROUTE_NAMES = new Set(['project', '(project)', 'projekt', '(projekt)']);

export function isProjectGrade(value) {
  return PROJECT_GRADES.has(String(value ?? '').trim().toLowerCase());
}

export function formatRouteName(routeOrName, grade = null) {
  if (routeOrName == null) return 'Unknown route';
  const route = routeOrName && typeof routeOrName === 'object' ? routeOrName : null;
  const name = String(route ? route.name : routeOrName ?? '').trim();
  const routeGrade = route ? route.grad : grade;
  const normalizedName = name.toLowerCase();
  const project = isProjectGrade(routeGrade);

  if (!name || UNNAMED_ROUTE_NAMES.has(normalizedName) || PROJECT_ROUTE_NAMES.has(normalizedName)) {
    return project ? 'Open project' : 'N.N.';
  }

  return name;
}

export function routeNameTableClass(routeOrName, grade = null) {
  const name = formatRouteName(routeOrName, grade);
  return /\s/.test(name) ? 'route-name-text' : 'route-name-text is-single-word';
}

export function formatRouteGrade(value, { projectLabel = 'Project', fallback = '?' } = {}) {
  const grade = String(value ?? '').trim();
  if (isProjectGrade(grade)) return projectLabel;
  return grade ? grade.toUpperCase() : fallback;
}
