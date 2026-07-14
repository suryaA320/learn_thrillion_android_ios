/** Helpers for optional exam mark splits (same rules as web marks entry). */

export function subjectUsesSplit(subject) {
  return Array.isArray(subject?.mark_components) && subject.mark_components.length > 0;
}

export function getComponentScoreValue(componentScores, componentId) {
  const raw = componentScores?.[String(componentId)];
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object') {
    return raw.marks_obtained ?? '';
  }
  return raw;
}

export function sumComponentMarks(studentMarks, subjectId, components) {
  if (!components?.length) return 0;
  const bucket = studentMarks?.[subjectId]?.component_scores || {};
  return components.reduce((sum, comp) => {
    const raw = getComponentScoreValue(bucket, comp.id);
    const n = raw === '' || raw == null ? 0 : parseFloat(raw);
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);
}

export function getDisplayMarks(studentMarks, subjectId, components) {
  if (subjectUsesSplit({ mark_components: components })) {
    return sumComponentMarks(studentMarks, subjectId, components);
  }
  const raw = studentMarks?.[subjectId]?.marks_obtained;
  if (raw === '' || raw == null) return 0;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function studentDisplayName(student) {
  const name = [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim();
  return name || student?.email || 'Student';
}
