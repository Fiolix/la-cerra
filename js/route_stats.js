const GRADE_SCALE = [
  '2a', '2b', '2c',
  '3a', '3b', '3c',
  '4a', '4b', '4c',
  '5a', '5b', '5c',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a'
];

const GRADE_INDEX = new Map(GRADE_SCALE.map((grade, index) => [grade, index]));

export function summarizePublicRouteStats(entries = []) {
  const working = new Map();

  for (const entry of entries) {
    const routeId = String(entry?.route_id || '');
    if (!routeId) continue;
    if (!working.has(routeId)) {
      working.set(routeId, {
        ratingTotal: 0,
        ratingCount: 0,
        gradeTotal: 0,
        gradeCount: 0
      });
    }

    const summary = working.get(routeId);
    const rating = Number(entry.rating);
    if (Number.isFinite(rating) && rating > 0) {
      summary.ratingTotal += rating;
      summary.ratingCount += 1;
    }

    const grade = String(entry.grade_suggestion || '').trim().toLowerCase();
    const gradeIndex = GRADE_INDEX.get(grade);
    if (gradeIndex != null) {
      summary.gradeTotal += gradeIndex;
      summary.gradeCount += 1;
    }
  }

  return new Map(Array.from(working, ([routeId, summary]) => {
    const ratingAverage = summary.ratingCount
      ? summary.ratingTotal / summary.ratingCount
      : null;
    const userGradeIndex = summary.gradeCount
      ? Math.round(summary.gradeTotal / summary.gradeCount)
      : null;
    return [routeId, {
      ratingAverage,
      ratingCount: summary.ratingCount,
      userGrade: userGradeIndex == null ? null : GRADE_SCALE[userGradeIndex].toUpperCase(),
      userGradeIndex,
      userGradeCount: summary.gradeCount
    }];
  }));
}

export function getRouteStats(stats, routeId) {
  return stats?.get(String(routeId)) || {
    ratingAverage: null,
    ratingCount: 0,
    userGrade: null,
    userGradeIndex: null,
    userGradeCount: 0
  };
}

export function formatRating(value) {
  return value == null ? '—' : Number(value).toFixed(1);
}

export function compareRouteStats(left, right, key, direction = 'asc') {
  const leftValue = key === 'rating' ? left.ratingAverage : left.userGradeIndex;
  const rightValue = key === 'rating' ? right.ratingAverage : right.userGradeIndex;
  const leftMissing = leftValue == null;
  const rightMissing = rightValue == null;

  if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
  if (leftMissing) return 0;
  const result = leftValue - rightValue;
  return direction === 'asc' ? result : -result;
}
