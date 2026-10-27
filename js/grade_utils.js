import { isProjectGrade } from './route_rules.js?v=20261027-sushi-free-gps-35';

export function normalizeGrade(value) {
  return String(value ?? '').trim().toLowerCase().replaceAll(' ', '');
}

export function gradeValue(value) {
  const grade = normalizeGrade(value);
  if (isProjectGrade(grade)) return null;

  const match = grade.match(/^(\d)([abc])?(\+)?$/);
  if (!match) return null;

  const number = Number(match[1]);
  const letterOffset = { a: 10, b: 20, c: 30 }[match[2]] || 0;
  return number * 100 + letterOffset + (match[3] ? 5 : 0);
}

export function compareGrades(left, right) {
  const leftValue = gradeValue(left);
  const rightValue = gradeValue(right);
  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;
  return leftValue - rightValue;
}

export function getSortedGrades(routes) {
  return Array.from(new Set(
    (routes || [])
      .map(route => String(route.grad ?? '').trim())
      .filter(grade => grade && !isProjectGrade(grade) && gradeValue(grade) != null)
  )).sort(compareGrades);
}
