export function emptySubtopic(keySuffix = '') {
  return {
    key: `st-new-${Date.now()}-${keySuffix}`,
    name: '',
    status: 'pending',
    isExisting: false,
  };
}

export function emptyChapter(chapterNumber) {
  return {
    key: `ch-new-${Date.now()}-${chapterNumber}`,
    chapter_number: chapterNumber,
    name: '',
    isExisting: false,
    subtopics: [emptySubtopic('0')],
  };
}

export function nextChapterNumber(chapters) {
  const max = (chapters || []).reduce(
    (acc, ch) => Math.max(acc, Number(ch.chapter_number) || 0),
    0
  );
  return max + 1;
}

export function planToFormState(plan) {
  if (!plan) {
    return {
      planId: null,
      title: '',
      chapters: [emptyChapter(1)],
    };
  }

  const chapters = (plan.chapters || []).length
    ? plan.chapters.map((ch) => ({
        key: ch.id || `ch-${ch.chapter_number}`,
        id: ch.id,
        chapter_number: ch.chapter_number,
        name: ch.name || '',
        isExisting: true,
        subtopics: (ch.subtopics || []).length
          ? ch.subtopics.map((st, idx) => ({
              key: st.id || `st-${ch.chapter_number}-${idx}`,
              id: st.id,
              name: st.name || '',
              status: st.status || 'pending',
              isExisting: true,
            }))
          : [],
      }))
    : [];

  return {
    planId: plan.id,
    title: plan.title || '',
    chapters: chapters.length ? chapters : [emptyChapter(1)],
  };
}

export function formStateToPayload({ title, chapters, yearId, classId, sectionId, subjectId }) {
  return {
    academic_year_id: yearId,
    class_id: classId,
    section_id: sectionId,
    subject_id: subjectId,
    title: (title || '').trim(),
    chapters: (chapters || []).map((ch, chIdx) => ({
      chapter_number: ch.chapter_number || chIdx + 1,
      name: (ch.name || '').trim(),
      subtopics: (ch.subtopics || [])
        .filter((st) => (st.name || '').trim())
        .map((st, stIdx) => ({
          name: st.name.trim(),
          status: st.status || 'pending',
          sort_order: stIdx,
        })),
    })),
  };
}

export function hasDuplicateChapterNumbers(chapters) {
  const nums = (chapters || []).map((ch) => Number(ch.chapter_number));
  return new Set(nums).size !== nums.length;
}
