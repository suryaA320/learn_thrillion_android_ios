/** Mirrors backend `user_model.models.User` role ints. */
export const ROLES = {
  FACULTY: 3,
  CLASS_TEACHER: 4,
  PARENTS: 5,
  STUDENTS: 6,
};

/** Mirrors `user_model.models.User` role ints (same as Django). */
const ROLE_LABELS = {
  1: 'School head',
  2: 'School admin',
  3: 'Faculty',
  4: 'Class teacher',
  5: 'Parent',
  6: 'Student',
  7: 'Thrillionite customer support',
  8: 'Super admin',
  9: 'Clerk',
  10: 'Unknown',
  11: 'Luxehara admin',
  12: 'Luxehara marketing',
  13: 'Thrillionite customer support lead',
  14: 'Thrillionite customer support manager',
};

/** Human-readable role — never returns the numeric code. */
export function getRoleLabel(role) {
  const n = Number(role);
  if (Number.isNaN(n)) return '—';
  return ROLE_LABELS[n] ?? 'Unknown role';
}

export function isFacultyLikeRole(role) {
  const n = Number(role);
  return n === ROLES.FACULTY || n === ROLES.CLASS_TEACHER;
}

export function isParentRole(role) {
  return Number(role) === ROLES.PARENTS;
}

export function isStudentRole(role) {
  return Number(role) === ROLES.STUDENTS;
}
