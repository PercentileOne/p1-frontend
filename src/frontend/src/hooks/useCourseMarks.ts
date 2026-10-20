import { useCallback, useEffect, useState } from 'react';
import { fetchCourseMarks, setCourseSaved } from '../api/feedCoursesApi';
import type { FeedCourse } from '../api/feedCoursesApi';
import { logEvent } from '../api/flowLogger';

// A person's private saved courses for the courses strip. Optimistic: the bookmark changes at once and goes back with a short message if the save fails.
export function useCourseMarks() {
  const [saved, setSaved] = useState<string[]>([]);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let alive = true;
    void fetchCourseMarks().then(m => { if (alive) setSaved(m.saved); });
    return () => { alive = false; };
  }, []);

  const toggle = useCallback(async (c: FeedCourse) => {
    let was = false;
    setProblem('');
    setSaved(s => { was = s.includes(c.id); return was ? s.filter(id => id !== c.id) : [c.id, ...s]; });
    if (!was) logEvent('feed_course_save', { metadata: { id: c.id, theme: c.theme, provider: c.provider } });
    try { setSaved((await setCourseSaved(c.id, !was)).saved); }
    catch (e) {
      setSaved(s => was ? [c.id, ...s.filter(id => id !== c.id)] : s.filter(id => id !== c.id));
      setProblem((e as Error).message);
    }
  }, []);

  return { saved, problem, toggle };
}
