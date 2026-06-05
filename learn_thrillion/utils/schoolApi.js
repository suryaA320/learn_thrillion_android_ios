import api, { API_ORIGIN } from './api_endpoints/api';

/** Django routes live on API origin root (not under `/api/`). */
export function apiOriginPath(path) {
  const base = String(API_ORIGIN || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export function fetchSchoolClasses({ forAttendance = false } = {}) {
  const params = forAttendance ? { for_attendance: 'true' } : {};
  return api.get(apiOriginPath('/view-all-classes-by-school-id/'), { params }).then((r) => r.data);
}

export function fetchSectionsByClass(classId, { forAttendance = false } = {}) {
  if (!classId) return Promise.resolve([]);
  const params = { class_id: classId };
  if (forAttendance) params.for_attendance = 'true';
  return api.get(apiOriginPath('/filter-sections/'), { params }).then((r) => r.data);
}

export function fetchStudentsByClassSection(classId, sectionId) {
  const params = { section_id: sectionId };
  if (classId) params.class_id = classId;
  return api.get(apiOriginPath('/fetch-myschool-students/'), { params }).then((r) => r.data);
}

/** Same payload as web `AddAttendance.js` → `POST /create-attendance/`. */
export function submitAttendanceSession(payload) {
  return api.post(apiOriginPath('/create-attendance/'), payload).then((r) => r.data);
}

/** GET /view-attendance/ — pass `only_mine: 'true'` to list sessions marked by the current user. */
export function fetchAttendanceSessions(params = {}) {
  return api.get(apiOriginPath('/view-attendance/'), { params }).then((r) => r.data);
}

/**
 * Academic years (`GET /academic-years/`). Default: Active only.
 * Use `{ allYears: true }` only when every year is required (not used on mobile today).
 */
export function fetchAcademicYearsSchool({ allYears = false } = {}) {
  const params = allYears ? { all: 'true' } : {};
  return api.get(apiOriginPath('/academic-years/'), { params }).then((r) => {
    const d = r.data;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d)) return d;
    return [];
  });
}

export function fetchFacultyComplaintContext() {
  return api.get(apiOriginPath('/faculty/complaint-context/')).then((r) => r.data);
}

export function searchComplaintStudents(classId, sectionId, q = '') {
  return api
    .get(apiOriginPath('/faculty/complaint-student-search/'), {
      params: { class_id: classId, section_id: sectionId, q },
    })
    .then((r) => r.data);
}

export function submitComplaint(body) {
  return api.post(apiOriginPath('/add-complaint/'), body).then((r) => r.data);
}

/** Paginated list from `GET /faculty/complaints/mine/`. */
export function fetchMyComplaints(params = {}) {
  return api.get(apiOriginPath('/faculty/complaints/mine/'), { params }).then((r) => r.data);
}

/** Paginated list `GET /faculty/action-plans/` (same query params as web AddPlan view tab). */
export function fetchFacultyActionPlans(params = {}) {
  return api.get(apiOriginPath('/faculty/action-plans/'), { params }).then((r) => r.data);
}

export function createFacultyActionPlan(body) {
  return api.post(apiOriginPath('/faculty/action-plans/'), body).then((r) => r.data);
}

export function updateFacultyActionPlan(planId, body) {
  const id = encodeURIComponent(String(planId || '').trim());
  return api.put(apiOriginPath(`/faculty/action-plans/${id}/`), body).then((r) => r.data);
}

/** GET `/subjects/view/` — subjects for the logged-in user's school. */
export function fetchSchoolSubjects({ assignedOnly = false } = {}) {
  const params = assignedOnly ? { assigned_to_me: 'true' } : {};
  return api.get(apiOriginPath('/subjects/view/'), { params }).then((r) => r.data);
}

export function fetchFacultyHomework(params = {}) {
  return api.get(apiOriginPath('/faculty/homework/'), { params }).then((r) => r.data);
}

export function createFacultyHomework(body) {
  return api.post(apiOriginPath('/faculty/homework/'), body).then((r) => r.data);
}

export function updateFacultyHomework(homeworkId, body) {
  const id = encodeURIComponent(String(homeworkId || '').trim());
  return api.put(apiOriginPath(`/faculty/homework/${id}/`), body).then((r) => r.data);
}

export function deleteFacultyHomework(homeworkId) {
  const id = encodeURIComponent(String(homeworkId || '').trim());
  return api.delete(apiOriginPath(`/faculty/homework/${id}/`)).then((r) => r.data);
}

export function fetchStudyMaterial(params = {}) {
  return api.get(apiOriginPath('/school/study-material/'), { params }).then((r) => r.data);
}

export function createStudyMaterialWritten(body) {
  return api
    .post(apiOriginPath('/school/study-material/'), { content_type: 'written', ...body })
    .then((r) => r.data);
}

export function createStudyMaterialUpload(formData) {
  return api
    .post(apiOriginPath('/school/study-material/'), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}

export function updateStudyMaterialWritten(id, body) {
  const pk = encodeURIComponent(String(id || '').trim());
  return api.put(apiOriginPath(`/school/study-material/${pk}/`), body).then((r) => r.data);
}

export function updateStudyMaterialUpload(id, formData) {
  const pk = encodeURIComponent(String(id || '').trim());
  return api
    .put(apiOriginPath(`/school/study-material/${pk}/`), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}

export function deleteStudyMaterial(id) {
  const pk = encodeURIComponent(String(id || '').trim());
  return api.delete(apiOriginPath(`/school/study-material/${pk}/`)).then((r) => r.data);
}

export function fetchStudentStudyMaterial(params = {}) {
  return api.get(apiOriginPath('/student/study-material/'), { params }).then((r) => r.data);
}

/** Student portal (`role=6`) — school-scoped via matched `AddStudent` email + school. */
export function fetchStudentPortalContext() {
  return api.get(apiOriginPath('/student/me/')).then((r) => r.data);
}

/** Optional `class_id` / `section_id` should match `GET /student/me/`; server validates against the logged-in student. */
export function fetchStudentHomework(params = {}) {
  return api.get(apiOriginPath('/student/homework/'), { params }).then((r) => r.data);
}

export function fetchStudentDiary(params = {}) {
  return api.get(apiOriginPath('/student/diary/'), { params }).then((r) => r.data);
}

/** Student portal: optional `student_id` must match `GET /student/me/` (server validates). */
export function fetchStudentComplaints(params = {}) {
  return api.get(apiOriginPath('/student/complaints/'), { params }).then((r) => r.data);
}

export function fetchStudentExams() {
  return api.get(apiOriginPath('/student/exams/')).then((r) => r.data);
}

export function fetchStudentProgress(examId) {
  return api
    .get(apiOriginPath('/student/progress/'), { params: { exam_id: String(examId) } })
    .then((r) => r.data);
}

/** List students linked to the logged-in parent (`GET /parent/my-children/`). */
export function fetchParentMyChildren() {
  return api.get(apiOriginPath('/parent/my-children/')).then((r) => r.data);
}

export function fetchParentStudentContext(studentId) {
  return api
    .get(apiOriginPath('/parent/student-context/'), {
      params: { student_id: String(studentId) },
    })
    .then((r) => r.data);
}

export function fetchParentHomework(studentId, params = {}) {
  return api
    .get(apiOriginPath('/parent/homework/'), {
      params: { student_id: String(studentId), ...params },
    })
    .then((r) => r.data);
}

export function fetchParentComplaints(studentId) {
  return api
    .get(apiOriginPath('/parent/complaints/'), {
      params: { student_id: String(studentId) },
    })
    .then((r) => r.data);
}

export function fetchParentExams(studentId) {
  return api
    .get(apiOriginPath('/parent/exams/'), {
      params: { student_id: String(studentId) },
    })
    .then((r) => r.data);
}

export function fetchParentProgress(studentId, examId) {
  return api
    .get(apiOriginPath('/parent/progress/'), {
      params: { student_id: String(studentId), exam_id: String(examId) },
    })
    .then((r) => r.data);
}

export function fetchParentFees(studentId) {
  return api
    .get(apiOriginPath('/parent/fees/'), {
      params: { student_id: String(studentId) },
    })
    .then((r) => r.data);
}

/** Faculty leave balance for active academic year (`GET /faculty/leave-requests/summary/`). School-scoped via faculty profile. */
export function fetchFacultyLeaveSummary() {
  return api.get(apiOriginPath('/faculty/leave-requests/summary/')).then((r) => r.data);
}

/** All leave requests for logged-in faculty (`GET /faculty/leave-requests/`). */
export function fetchFacultyLeaveRequests() {
  return api.get(apiOriginPath('/faculty/leave-requests/')).then((r) => {
    const d = r.data;
    return Array.isArray(d) ? d : [];
  });
}

export function createFacultyLeaveRequest(body) {
  return api.post(apiOriginPath('/faculty/leave-requests/'), body).then((r) => r.data);
}

export function updateFacultyLeaveRequest(requestId, body) {
  const id = encodeURIComponent(String(requestId || '').trim());
  return api.patch(apiOriginPath(`/faculty/leave-requests/${id}/`), body).then((r) => r.data);
}
