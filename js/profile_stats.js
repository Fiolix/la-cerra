const GRADES = [
  '2a', '2b', '2c',
  '3a', '3b', '3c',
  '4a', '4b', '4c',
  '5a', '5b', '5c',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a'
];

const gradeValue = new Map(GRADES.map((grade, index) => [grade, index]));

function highestGrade(ticks) {
  let highest = null;

  for (const tick of ticks) {
    const grade = tick.route?.grad;
    if (!gradeValue.has(grade)) continue;
    if (highest === null || gradeValue.get(grade) > gradeValue.get(highest)) {
      highest = grade;
    }
  }

  return highest || '-';
}

export function summarizeTicks(ticks = []) {
  const validTicks = Array.isArray(ticks) ? ticks : [];

  return {
    routeCount: validTicks.length,
    highestGrade: highestGrade(validTicks),
    highestFlash: highestGrade(validTicks.filter(tick => tick.flash))
  };
}
